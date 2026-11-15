// 2D floor-plan editor: move furniture, drag walls and their corners, draw new
// walls, add doors and windows, edit exact numbers. Every change is saved to
// house.yaml; the 3D view is rebuilt when the planner closes.
import * as THREE from 'three';
import { createModel } from './models/registry.js';
import { createCatalog } from './catalog.js';

const GRID = 0.05; // snap, metres
const round = (n) => Math.round(n * 100) / 100;
const snap = (n) => round(Math.round(n / GRID) * GRID);
const clone = (v) => JSON.parse(JSON.stringify(v));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const DEFAULTS = { door: { type: 'door', width: 0.9 }, window: { type: 'window', width: 1.2, sill: 0.9 } };

export function createPlanner({ house, say }) {
  const el = document.getElementById('planner');
  el.innerHTML = `
    <div class="bar">
      <select class="floor" title="Floor"></select>
      <span class="tools">
        <button data-tool="select">Select</button>
        <button data-tool="wall">Wall</button>
        <button data-tool="door">Door</button>
        <button data-tool="window">Window</button>
        <button data-tool="paint">Paint</button>
        <button data-tool="furniture">Furniture</button>
      </span>
      <button class="beside" title="Show the 3D house next to the plan">3D beside</button>
      <button class="undo" title="Undo (Ctrl+Z)">Undo</button>
      <span class="spacer"></span>
      <button class="done">Done</button>
    </div>
    <svg></svg>
    <aside class="props"></aside>
    <aside class="catalog" hidden></aside>
    <div class="hint"></div>
    <div class="view3d" hidden><iframe title="3D house"></iframe></div>`;
  const $ = (q) => el.querySelector(q);
  const svg = $('svg');
  const props = $('.props');
  const HINTS = {
    select: 'Click to select · drag to move · drag a corner to resize (Shift keeps proportions) · drag the round handle to turn (Shift for 1° steps) · arrow keys nudge · R rotates · Del deletes · Ctrl/Cmd+C / V copy and paste · Ctrl/Cmd+D duplicates · Shift-click adds to the selection, Shift-drag draws a selection box · Ctrl/Cmd+Z undo, +Shift redo · scroll to zoom',
    wall: 'Drag to draw a wall · it snaps to the grid, to existing corners and to straight lines · Esc to stop',
    paint: 'Pick a colour in the panel, then click a wall — the side you click gets painted · Alt-click a wall to pick up its colour',
    furniture: 'Pick furniture in the sidebar · click a room first to drop it in the middle of that room · you can still drag, resize and turn things on the plan',
    door: 'Click a wall to put a door in it',
    window: 'Click a wall to put a window in it · click an existing window to stack another one above it',
  };

  let floor = null;
  let tool = 'select';
  let sel = null; // { kind: 'wall' | 'opening' | 'object', i, j }
  let view = { x: 0, y: 0, w: 10, h: 10 };
  let drag = null;
  let draft = null; // wall being drawn
  let paintColor = (() => { try { return localStorage.getItem('twin.paint') || '#c9d8c5'; } catch { return '#c9d8c5'; } })();
  let besideOn = false;
  let multi = []; // when 2+ things are picked: [{ kind: 'object' | 'wall', i }]
  let clip = null; // copied things, kept while the planner is open (works across floors)
  const inMulti = (kind, i) => multi.some((m) => m.kind === kind && m.i === i);
  // what the next command (delete, copy, duplicate, nudge) applies to
  const picked = () => (multi.length > 1 ? multi : sel && (sel.kind === 'object' || sel.kind === 'wall') ? [{ kind: sel.kind, i: sel.i }] : []);
  function toggle(kind, i) {
    if (!multi.length && sel && (sel.kind === 'object' || sel.kind === 'wall')) multi = [{ kind: sel.kind, i: sel.i }];
    const at = multi.findIndex((m) => m.kind === kind && m.i === i);
    if (at >= 0) multi.splice(at, 1);
    else multi.push({ kind, i });
    if (multi.length <= 1) { sel = multi[0] ? { ...multi[0] } : null; multi = []; } else sel = null;
  }
  let targetRoom = null; // room new furniture lands in
  let dirty = false;
  const undo = [];
  const sizes = new Map(); // model footprint cache

  for (const f of house.floors) $('.floor').add(new Option(f.name, f.id));

  // ── data helpers
  const walls = () => (floor.wallList ??= []);
  const objects = () => (floor.objects ??= []);
  const xz = (o) => (o.at.length === 3 ? [o.at[0], o.at[2]] : [o.at[0], o.at[1]]);
  const setXZ = (o, x, z) => (o.at = o.at.length === 3 ? [round(x), o.at[1], round(z)] : [round(x), round(z)]);
  const wallLen = (w) => Math.hypot(w.to[0] - w.from[0], w.to[1] - w.from[1]);
  const along = (w, d) => {
    const l = wallLen(w) || 1;
    return [w.from[0] + ((w.to[0] - w.from[0]) / l) * d, w.from[1] + ((w.to[1] - w.from[1]) / l) * d];
  };
  const thickness = (w) => w.thickness ?? (w.exterior ? house.walls.exteriorThickness : house.walls.interiorThickness);

  async function measure(def) {
    const key = def.model + JSON.stringify(def.params ?? {});
    if (!sizes.has(key)) {
      const b = new THREE.Box3().setFromObject(await createModel(def.model, def.params));
      sizes.set(key, b.isEmpty() ? { x0: -0.25, x1: 0.25, z0: -0.25, z1: 0.25, h: 0.5 } : { x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z, h: b.max.y - b.min.y });
    }
    return sizes.get(key);
  }
  // the model's own footprint, before any resizing
  const sizeOf = (def) => sizes.get(def.model + JSON.stringify(def.params ?? {})) ?? { x0: -0.25, x1: 0.25, z0: -0.25, z1: 0.25, h: 0.5 };
  // resizing is stored as stretch: [width, height, depth] factors on the object
  const stretchOf = (def) => def.stretch ?? [1, 1, 1];
  function setStretch(def, v) {
    if (v.every((k) => Math.abs(k - 1) < 1e-3)) delete def.stretch;
    else def.stretch = v.map((k) => Math.round(k * 1e4) / 1e4);
  }
  // footprint as it stands now, in the object's own (unrotated) frame
  function boxOf(def) {
    const n = sizeOf(def), [sx, sy, sz] = stretchOf(def);
    return { x0: n.x0 * sx, x1: n.x1 * sx, z0: n.z0 * sz, z1: n.z1 * sz, h: n.h * sy };
  }
  const metres = (n) => `${+n.toFixed(2)} m`;

  // ── saving and undo
  const redo = [];
  const snapshot = () => ({ floor: floor.id, wallList: clone(walls()), objects: clone(objects()) });
  function pushUndo() {
    undo.push(snapshot());
    redo.length = 0; // a new change ends the redo history
    if (undo.length > 100) undo.shift();
  }
  async function save() {
    dirty = true;
    try {
      const res = await fetch('/api/house/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'setFloor', floor: floor.id, wallList: walls(), objects: objects() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      refresh3d();
    } catch (err) {
      say(`Not saved: ${err.message}`);
    }
  }
  // 3D beside: the app itself in an iframe, reloaded a moment after each saved change
  let reloadTimer = 0;
  function show3d() {
    const frame = $('iframe');
    frame.src = `/?embed=1&view=${encodeURIComponent(floor?.id ?? '')}&t=${Date.now()}`;
  }
  // tell the 3D pane what changed; it moves things in place and only reloads itself
  // when something structural (walls, new or removed objects) changed
  function refresh3d() {
    if (!besideOn) return;
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      $('iframe').contentWindow?.postMessage(
        { type: 'twin-sync', floor: floor.id, wallList: clone(walls()), objects: clone(objects()) },
        location.origin
      );
    }, 60);
  }

  function side(w, p) {
    const dx = w.to[0] - w.from[0], dz = w.to[1] - w.from[1];
    return (p[0] - w.from[0]) * -dz + (p[1] - w.from[1]) * dx >= 0 ? 'pos' : 'neg';
  }
  function paintWall(i, p, e) {
    const w = walls()[i], sd = side(w, p);
    if (e.altKey) {
      const c = w.paint?.[sd] ?? (sd === 'pos' || !w.exterior ? w.color : null) ?? house.walls.color;
      if (c) { paintColor = c; localStorage.setItem('twin.paint', c); renderProps(); }
      return;
    }
    change(() => {
      (w.paint ??= {})[sd] = paintColor;
    });
  }

  function change(fn) {
    pushUndo();
    fn();
    save();
    render();
  }
  // undo / redo: each step swaps a saved copy of one floor's walls and objects with the current one
  function step(from, to) {
    const last = from.pop();
    if (!last) return;
    const f = house.floors.find((x) => x.id === last.floor);
    to.push({ floor: f.id, wallList: clone(f.wallList ?? []), objects: clone(f.objects ?? []) });
    f.wallList = last.wallList;
    f.objects = last.objects;
    if (f !== floor) return openFloor(f.id).then(save);
    sel = null;
    multi = [];
    save();
    render();
  }
  const undoLast = () => step(undo, redo);
  const redoLast = () => step(redo, undo);

  // ── geometry
  function point(e) {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    return [p.x, p.y];
  }
  const px = () => Math.max(view.w / svg.clientWidth, view.h / svg.clientHeight) || 0.02;

  // snap to an existing wall corner if one is close, otherwise to the grid
  function snapPoint([x, z], skip = []) {
    let best = null, bestD = 0.2;
    walls().forEach((w, i) => {
      for (const end of ['from', 'to']) {
        if (skip.some((s) => s.i === i && s.end === end)) continue;
        const d = Math.hypot(w[end][0] - x, w[end][1] - z);
        if (d < bestD) { bestD = d; best = w[end]; }
      }
    });
    return best ? [...best] : [snap(x), snap(z)];
  }
  // pull a point onto the same horizontal / vertical line as an anchor when nearly there
  function straighten(p, anchor) {
    const out = [...p];
    if (Math.abs(p[0] - anchor[0]) < 0.12) out[0] = anchor[0];
    if (Math.abs(p[1] - anchor[1]) < 0.12) out[1] = anchor[1];
    return out;
  }

  // ── drawing
  function render() {
    const s = px();
    const f = floor;
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
    let h = `<defs><pattern id="plan-grid" width="1" height="1" patternUnits="userSpaceOnUse">
      <path d="M1 0H0V1" fill="none" stroke="rgba(110,150,255,0.16)" stroke-width="${s}"/></pattern></defs>
      <rect x="${view.x - 200}" y="${view.y - 200}" width="${view.w + 400}" height="${view.h + 400}" fill="url(#plan-grid)"/>`;

    for (const r of f.rooms ?? []) {
      const [x, z, w, d] = r.rect;
      h += `<rect class="room${r.outdoor ? ' outdoor' : ''}${r === targetRoom && tool === 'furniture' ? ' target' : ''}" x="${x}" y="${z}" width="${w}" height="${d}"/>
        <text class="room-name" x="${x + w / 2}" y="${z + d / 2}" font-size="${13 * s}">${esc(r.name ?? r.id)}
          <tspan x="${x + w / 2}" dy="${15 * s}" class="area" font-size="${11 * s}">${(w * d).toFixed(1)} m²</tspan></text>`;
    }

    objects().forEach((o, i) => {
      const b = boxOf(o), [x, z] = xz(o);
      const on = (sel?.kind === 'object' && sel.i === i) || inMulti('object', i);
      h += `<g class="obj${on ? ' sel' : ''}" data-kind="object" data-i="${i}" transform="translate(${x} ${z}) rotate(${-(o.rot ?? 0)})">
        <rect x="${b.x0}" y="${b.z0}" width="${b.x1 - b.x0}" height="${b.z1 - b.z0}" rx="${3 * s}"/>
        <path d="M${(b.x0 + b.x1) / 2 - 5 * s} ${b.z1 - 3 * s}h${10 * s}" class="front"/></g>`;
    });

    walls().forEach((w, i) => {
      const t = thickness(w);
      const on = (sel?.kind === 'wall' && sel.i === i) || inMulti('wall', i);
      if (w.paint) {
        const l = wallLen(w) || 1, nx = -(w.to[1] - w.from[1]) / l, nz = (w.to[0] - w.from[0]) / l;
        for (const sd of ['pos', 'neg']) {
          if (!w.paint[sd]) continue;
          const k = (sd === 'pos' ? 1 : -1) * (Math.max(t, 4 * s) / 2 - s * 0.6);
          h += `<line class="paint-strip" x1="${w.from[0] + nx * k}" y1="${w.from[1] + nz * k}" x2="${w.to[0] + nx * k}" y2="${w.to[1] + nz * k}" stroke="${esc(w.paint[sd])}" stroke-width="${Math.max(s * 2.4, 0.03)}"/>`;
        }
      }
      h += `<line class="wall${w.exterior ? ' exterior' : ''}${on ? ' sel' : ''}" data-kind="wall" data-i="${i}"
        x1="${w.from[0]}" y1="${w.from[1]}" x2="${w.to[0]}" y2="${w.to[1]}" stroke-width="${Math.max(t, 4 * s)}"/>`;
      (w.openings ?? []).forEach((o, j) => {
        const a = along(w, o.at), b = along(w, o.at + o.width);
        const osel = sel?.kind === 'opening' && sel.i === i && sel.j === j;
        const attrs = `data-kind="opening" data-i="${i}" data-j="${j}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"`;
        if (o.type === 'door') {
          const l = wallLen(w) || 1;
          const n = [-(w.to[1] - w.from[1]) / l, (w.to[0] - w.from[0]) / l];
          // the leaf as it stands (hinge, side and angle), plus the arc it sweeps to close
          const [H, O] = o.hinge === 'end' ? [b, a] : [a, b];
          const side = o.flip ? -1 : 1;
          const phi = ((w.exterior ? 90 : o.open ?? 55) * Math.PI) / 180;
          const u = [(O[0] - H[0]) / o.width, (O[1] - H[1]) / o.width];
          const tip = [
            H[0] + (u[0] * Math.cos(phi) + n[0] * side * Math.sin(phi)) * o.width,
            H[1] + (u[1] * Math.cos(phi) + n[1] * side * Math.sin(phi)) * o.width,
          ];
          const sweep = (tip[0] - H[0]) * (O[1] - H[1]) - (tip[1] - H[1]) * (O[0] - H[0]) > 0 ? 1 : 0;
          h += `<line class="door${osel ? ' sel' : ''}" ${attrs} stroke-width="${Math.max(t, 4 * s) + 2 * s}"/>
            <path class="swing" d="M${H[0]} ${H[1]}L${tip[0]} ${tip[1]}A${o.width} ${o.width} 0 0 ${sweep} ${O[0]} ${O[1]}" stroke-width="${1.5 * s}"/>`;
        } else {
          h += `<line class="window${osel ? ' sel' : ''}" ${attrs} stroke-width="${Math.max(t, 4 * s) * 0.55}"/>`;
        }
      });
      if (on) {
        h += `<text class="len" x="${(w.from[0] + w.to[0]) / 2}" y="${(w.from[1] + w.to[1]) / 2 - 8 * s}" font-size="${11 * s}">${wallLen(w).toFixed(2)} m</text>`;
        for (const end of ['from', 'to'])
          h += `<circle class="handle" data-kind="handle" data-i="${i}" data-end="${end}" cx="${w[end][0]}" cy="${w[end][1]}" r="${6 * s}" stroke-width="${2 * s}"/>`;
      }
    });

    // the selected object's size, corner grips and turn handle go on top of everything
    if (sel?.kind === 'object' && objects()[sel.i]) {
      const o = objects()[sel.i], b = boxOf(o), [x, z] = xz(o), i = sel.i;
      const th = (-(o.rot ?? 0) * Math.PI) / 180;
      // how far the turned footprint reaches above and below its position on screen
      const reach = [b.x0, b.x1].flatMap((lx) => [b.z0, b.z1].map((lz) => lx * Math.sin(th) + lz * Math.cos(th)));
      const g = 9 * s, arm = b.x1 + 30 * s;
      h += `<text class="obj-name" x="${x}" y="${z + Math.min(...reach) - 22 * s}" font-size="${11 * s}">${esc(o.id)}</text>
        <text class="len" x="${x}" y="${z + Math.min(...reach) - 8 * s}" font-size="${11 * s}">${metres(b.x1 - b.x0)} × ${metres(b.z1 - b.z0)}</text>
        <g transform="translate(${x} ${z}) rotate(${-(o.rot ?? 0)})">
          <line class="turn-arm" x1="${b.x1}" y1="0" x2="${arm}" y2="0"/>
          <circle class="turn" data-kind="rotate" data-i="${i}" cx="${arm}" cy="0" r="${7 * s}" stroke-width="${2 * s}"/>
          ${[0, 1, 2, 3].map((c) => `<rect class="grip" data-kind="resize" data-i="${i}" data-c="${c}" x="${(c & 1 ? b.x1 : b.x0) - g / 2}" y="${(c & 2 ? b.z1 : b.z0) - g / 2}" width="${g}" height="${g}" stroke-width="${1.5 * s}"/>`).join('')}
        </g>`;
    }

    if (draft) h += `<line class="wall draft" x1="${draft.a[0]}" y1="${draft.a[1]}" x2="${draft.b[0]}" y2="${draft.b[1]}" stroke-width="${Math.max(0.1, 4 * s)}"/>
      <text class="len" x="${(draft.a[0] + draft.b[0]) / 2}" y="${(draft.a[1] + draft.b[1]) / 2 - 8 * s}" font-size="${11 * s}">${Math.hypot(draft.b[0] - draft.a[0], draft.b[1] - draft.a[1]).toFixed(2)} m</text>`;
    if (drag?.kind === 'marquee') {
      const [a, b] = [drag.a, drag.b];
      h += `<rect class="marquee" x="${Math.min(a[0], b[0])}" y="${Math.min(a[1], b[1])}" width="${Math.abs(a[0] - b[0])}" height="${Math.abs(a[1] - b[1])}"/>`;
    }
    svg.innerHTML = h;
    svg.dataset.tool = tool;
    for (const b of el.querySelectorAll('[data-tool]')) b.classList.toggle('active', b.dataset.tool === tool);
    $('.hint').textContent = HINTS[tool];
    el.classList.toggle('catalog-open', tool === 'furniture');
    el.classList.toggle('split', besideOn);
    $('.beside').classList.toggle('active', besideOn);
    $('.view3d').hidden = !besideOn;
    $('.catalog').hidden = tool !== 'furniture';
    props.hidden = tool === 'furniture';
    $('.undo').disabled = !undo.length;
    if (!props.contains(document.activeElement)) renderProps();
  }

  // ── properties panel
  const field = (label, prop, value, attrs = 'type="number" step="0.05"') =>
    `<label><small>${label}</small><input data-prop="${prop}" ${attrs} value="${value ?? ''}"/></label>`;

  const SWATCHES = ['#ffffff', '#efe6d8', '#e4d3b8', '#d9a79a', '#c9d8c5', '#8fb8a0', '#a9c4de', '#5f7fa8', '#e6c15a', '#d98c4a', '#9c5a45', '#4a4f5c', '#2c3550', '#1c1c20'];
  function renderProps() {
    if (multi.length > 1) {
      const n = multi.filter((m) => m.kind === 'object').length, k = multi.length - n;
      props.innerHTML = `<h3>${multi.length} items selected</h3><p>${n} object${n === 1 ? '' : 's'}${k ? ` · ${k} wall${k === 1 ? '' : 's'}` : ''}</p>
        <p>Drag one to move them all · arrows nudge · Ctrl+C / Ctrl+V copy and paste · Shift-click adds or removes one · Shift-drag on empty space draws a selection box.</p>
        <button class="duplicate" title="Duplicate (Ctrl+D)">Duplicate</button>
        <button class="delete">Delete</button>`;
      return;
    }
    if (tool === 'paint') {
      props.innerHTML = `<h3>Paint walls</h3><p>Pick a colour, then click the wall side you want to paint.</p>
        <label><small>Colour</small><input data-paint="color" type="color" value="${esc(paintColor)}"/></label>
        <div class="swatches">${SWATCHES.map((c) => `<button class="swatch${c === paintColor ? ' on' : ''}" data-swatch="${c}" style="background:${c}" title="${c}"></button>`).join('')}</div>
        ${sel?.kind === 'wall' && walls()[sel.i].paint ? '<button class="unpaint">Remove paint from selected wall</button>' : ''}
        <button class="unpaint-all">Remove all paint on this floor</button>
        <p>Alt-click a wall to pick up a colour that is already there.</p>`;
      return;
    }
    if (!sel) {
      props.innerHTML = `<h3>${esc(floor.name)}</h3><p>${walls().length} walls · ${objects().length} objects</p>
        <p>Select something to see and change its exact measurements.</p>`;
      return;
    }
    if (sel.kind === 'object') {
      const o = objects()[sel.i], [x, z] = xz(o), b = boxOf(o);
      const size = (n) => +n.toFixed(2);
      props.innerHTML = `<h3>${esc(o.id)}</h3><p>${esc(o.model)}</p>
        ${field('X (m)', 'x', x)}${field('Z (m)', 'z', z)}${field('Rotation (°)', 'rot', o.rot ?? 0, 'type="number" step="15"')}
        ${field('Placement height (m above floor)', 'y', o.at.length === 3 ? o.at[1] : 0, 'type="number" step="0.05" min="0"')}
        <div class="pair">${field('Width (m)', 'w', size(b.x1 - b.x0), 'type="number" step="0.05" min="0.05"')}${field('Depth (m)', 'd', size(b.z1 - b.z0), 'type="number" step="0.05" min="0.05"')}</div>
        ${field('Height (m)', 'h', size(b.h), 'type="number" step="0.05" min="0.05"')}
        ${o.stretch ? '<button class="reset-size">Original size</button>' : ''}
        <button class="duplicate" title="Duplicate (Ctrl+D)">Duplicate</button>
        <button class="delete">Delete</button>`;
    } else if (sel.kind === 'wall') {
      const w = walls()[sel.i];
      props.innerHTML = `<h3>Wall</h3><p>${wallLen(w).toFixed(2)} m long</p>
        <div class="pair">${field('From X', 'from0', w.from[0])}${field('From Z', 'from1', w.from[1])}</div>
        <div class="pair">${field('To X', 'to0', w.to[0])}${field('To Z', 'to1', w.to[1])}</div>
        <label class="check"><input data-prop="exterior" type="checkbox" ${w.exterior ? 'checked' : ''}/> Outside wall</label>
        ${field('Height (m, empty = default)', 'height', w.height)}
        <button class="delete">Delete</button>`;
    } else {
      const w = walls()[sel.i], o = w.openings[sel.j];
      props.innerHTML = `<h3>${o.type === 'door' ? 'Door' : 'Window'}</h3>
        <label><small>Type</small><select data-prop="type"><option value="door">Door</option><option value="window">Window</option></select></label>
        ${field('Position along wall (m)', 'at', o.at)}${field('Width (m)', 'width', o.width)}
        ${o.type === 'window' ? field('Sill height (m)', 'sill', o.sill ?? 0.9) + field('Panes', 'panes', o.panes ?? 1, 'type="number" step="1" min="1"') : ''}
        ${field('Top (m, empty = 2.1)', 'top', o.top)}
        ${o.type === 'door' && !w.exterior ? `
          ${field('Stands open (°, 0 = closed)', 'open', o.open ?? 55, 'type="number" step="5" min="0" max="180"')}
          <label><small>Hinge</small><select data-prop="hinge"><option value="start">Start of opening</option><option value="end">End of opening</option></select></label>
          <label><small>Swings to</small><select data-prop="flip"><option value="no">This side</option><option value="yes">Other side</option></select></label>` : ''}
        <button class="delete">Delete</button>`;
      props.querySelector('[data-prop=type]').value = o.type;
      const hinge = props.querySelector('[data-prop=hinge]');
      if (hinge) {
        hinge.value = o.hinge === 'end' ? 'end' : 'start';
        props.querySelector('[data-prop=flip]').value = o.flip ? 'yes' : 'no';
      }
    }
  }

  props.addEventListener('change', (e) => {
    const prop = e.target.dataset.prop;
    if (!prop || !sel) return;
    const raw = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    const num = raw === '' ? undefined : Number(raw);
    change(() => {
      const set = (obj, key, value) => (value === undefined || value === false ? delete obj[key] : (obj[key] = value));
      if (sel.kind === 'object') {
        const o = objects()[sel.i], [x, z] = xz(o);
        if (prop === 'x') setXZ(o, num ?? x, z);
        if (prop === 'z') setXZ(o, x, num ?? z);
        if (prop === 'rot') set(o, 'rot', num || undefined);
        if (prop === 'y') o.at = num > 0 ? [x, round(num), z] : [x, z];
        if ('wdh'.includes(prop) && num > 0) {
          const n = sizeOf(o), v = [...stretchOf(o)];
          const k = { w: 0, h: 1, d: 2 }[prop];
          v[k] = num / ([n.x1 - n.x0, n.h, n.z1 - n.z0][k] || 1);
          setStretch(o, v);
        }
      } else if (sel.kind === 'wall') {
        const w = walls()[sel.i];
        if (/^(from|to)[01]$/.test(prop)) w[prop.slice(0, -1)][+prop.slice(-1)] = round(num ?? 0);
        if (prop === 'exterior') set(w, 'exterior', raw);
        if (prop === 'height') set(w, 'height', num);
      } else {
        const o = walls()[sel.i].openings[sel.j];
        if (prop === 'type') {
          o.type = raw;
          if (raw === 'door') { delete o.sill; delete o.panes; } else o.sill ??= 0.9;
        } else if (prop === 'hinge') set(o, 'hinge', raw === 'end' ? 'end' : undefined);
        else if (prop === 'flip') set(o, 'flip', raw === 'yes');
        else if (prop === 'open') set(o, 'open', num === 55 ? undefined : num);
        else set(o, prop, prop === 'panes' && num === 1 ? undefined : num);
      }
    });
    renderProps();
  });
  props.addEventListener('input', (e) => {
    if (e.target.dataset.paint !== 'color') return;
    paintColor = e.target.value;
    try { localStorage.setItem('twin.paint', paintColor); } catch { /* ignore */ }
    for (const b of props.querySelectorAll('.swatch')) b.classList.toggle('on', b.dataset.swatch === paintColor);
  });
  props.addEventListener('click', (e) => {
    const sw = e.target.closest('[data-swatch]');
    if (sw) {
      paintColor = sw.dataset.swatch;
      try { localStorage.setItem('twin.paint', paintColor); } catch { /* ignore */ }
      return renderProps();
    }
    if (e.target.matches('.unpaint') && sel?.kind === 'wall') return change(() => { delete walls()[sel.i].paint; });
    if (e.target.matches('.unpaint-all')) return change(() => walls().forEach((w) => delete w.paint));
    if (e.target.matches('.duplicate')) return duplicate();
    if (e.target.matches('.delete')) remove();
    else if (e.target.matches('.reset-size') && sel?.kind === 'object') {
      change(() => delete objects()[sel.i].stretch);
      renderProps();
    }
  });

  // ── actions
  function remove() {
    const items = picked();
    if (items.length) {
      change(() => {
        for (const kind of ['object', 'wall']) {
          const list = kind === 'object' ? objects() : walls();
          for (const i of items.filter((m) => m.kind === kind).map((m) => m.i).sort((x, y) => y - x)) list.splice(i, 1);
        }
        sel = null;
        multi = [];
      });
    } else if (sel?.kind === 'opening') {
      change(() => {
        walls()[sel.i].openings.splice(sel.j, 1);
        sel = null;
      });
    }
  }

  function addOpening(i, p) {
    const w = walls()[i];
    const l = wallLen(w);
    const o = { ...DEFAULTS[tool] };
    o.width = Math.min(o.width, round(l - 0.1));
    const d = ((p[0] - w.from[0]) * (w.to[0] - w.from[0]) + (p[1] - w.from[1]) * (w.to[1] - w.from[1])) / l;
    o.at = Math.max(0, Math.min(snap(d - o.width / 2), round(l - o.width)));
    // clicking on an existing window or door stacks a new window above it (a transom
    // window over a window): same position and width, starting just over its top
    const under = tool === 'window' && (w.openings ?? []).filter((x) => d >= x.at && d <= x.at + x.width).sort((a, b) => (b.top ?? 2.1) - (a.top ?? 2.1))[0];
    if (under) {
      const wallH = w.height ?? (w.exterior ? house.walls.height : Math.min(house.walls.interiorHeight ?? house.walls.height, house.walls.height));
      const sill = round((under.top ?? 2.1) + 0.05);
      if (sill > wallH - 0.15) { say('No room above this one'); return; }
      Object.assign(o, { at: under.at, width: under.width, sill, top: round(Math.min(sill + 0.5, wallH - 0.05)) });
    }
    change(() => {
      (w.openings ??= []).push(o);
      sel = { kind: 'opening', i, j: w.openings.length - 1 };
      tool = 'select';
    });
  }

  // fresh copies of the given definitions with new ids, moved by (dx, dx)
  function copies(objs, wls, dx) {
    const ids = new Set(house.floors.flatMap((f) => (f.objects ?? []).map((o) => o.id)));
    const out = objs.map((src) => {
      const base = src.id.replace(/_\d+$/, '');
      let n = 2;
      while (ids.has(`${base}_${n}`)) n++;
      const copy = { ...clone(src), id: `${base}_${n}` };
      ids.add(copy.id);
      const [x, z] = xz(src);
      setXZ(copy, x + dx, z + dx);
      return copy;
    });
    const walls2 = wls.map((w) => ({ ...clone(w), from: [round(w.from[0] + dx), round(w.from[1] + dx)], to: [round(w.to[0] + dx), round(w.to[1] + dx)] }));
    return { objs: out, wls: walls2 };
  }
  function addCopies(objs, wls) {
    change(() => {
      const o0 = objects().length, w0 = walls().length;
      objects().push(...objs);
      walls().push(...wls);
      const made = [...objs.map((_, k) => ({ kind: 'object', i: o0 + k })), ...wls.map((_, k) => ({ kind: 'wall', i: w0 + k }))];
      if (made.length === 1) { sel = made[0]; multi = []; } else { sel = null; multi = made; }
    });
  }
  const defsOf = (items) => ({ objs: items.filter((m) => m.kind === 'object').map((m) => objects()[m.i]), wls: items.filter((m) => m.kind === 'wall').map((m) => walls()[m.i]) });
  // duplicate what is selected, a little to the side; copies get their own ids (and so no entity link)
  function duplicate() {
    const items = picked();
    if (!items.length) return;
    const { objs, wls } = defsOf(items);
    const c = copies(objs, wls, 0.3);
    addCopies(c.objs, c.wls);
    say(`Duplicated ${items.length} item${items.length === 1 ? '' : 's'}`);
  }
  function copy() {
    const items = picked();
    if (!items.length) return false;
    const { objs, wls } = defsOf(items);
    clip = { objs: clone(objs), wls: clone(wls), n: 0 };
    say(`Copied ${items.length} item${items.length === 1 ? '' : 's'} · Ctrl+V to paste`);
    return true;
  }
  // paste on the open floor, nudged further each time so copies don't hide each other
  function paste() {
    if (!clip) return false;
    clip.n++;
    const c = copies(clip.objs, clip.wls, 0.3 * clip.n);
    addCopies(c.objs, c.wls);
    say(`Pasted ${c.objs.length + c.wls.length} item${c.objs.length + c.wls.length === 1 ? '' : 's'}`);
    return true;
  }

  async function addObject(model, info) {
    const ids = new Set(house.floors.flatMap((f) => (f.objects ?? []).map((o) => o.id)));
    let n = 1;
    while (ids.has(`${model}_${n}`)) n++;
    const r = targetRoom;
    const at = r ? [snap(r.rect[0] + r.rect[2] / 2), snap(r.rect[1] + r.rect[3] / 2)] : [snap(view.x + view.w / 2), snap(view.y + view.h / 2)];
    const def = { id: `${model}_${n}`, model, at };
    if (info?.lit) def.kind = 'light';
    await measure(def);
    change(() => {
      objects().push(def);
      sel = { kind: 'object', i: objects().length - 1 };
    });
    say(`Added ${model.replaceAll('_', ' ')}${r ? ` to ${r.name ?? r.id}` : ''}`);
  }

  // ── pointer
  svg.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    svg.setPointerCapture(e.pointerId);
    const t = e.target.closest('[data-kind]');
    const p = point(e);
    const kind = t?.dataset.kind, i = +t?.dataset.i, j = +t?.dataset.j;
    if (e.shiftKey && (tool === 'select' || tool === 'furniture') && (!t || kind === 'object' || kind === 'wall')) {
      // Shift-click adds or removes one thing; Shift-drag on empty space draws a selection box
      if (t) toggle(kind, i);
      else drag = { kind: 'marquee', a: p, b: p };
      render();
      return;
    }
    if (!(t && (kind === 'object' || kind === 'wall') && inMulti(kind, i))) multi = [];
    if (tool === 'wall') {
      const a = snapPoint(p);
      draft = { a, b: a };
    } else if (tool === 'paint') {
      if (kind === 'wall') paintWall(i, p, e);
      else if (t) say('Click on a wall to paint it');
      return;
    } else if (tool === 'door' || tool === 'window') {
      if (kind === 'wall' || kind === 'opening') addOpening(i, p);
      else say('Click on a wall');
      return;
    } else if (!t) {
      sel = null;
      targetRoom = (floor.rooms ?? []).find((r) => !r.outdoor && p[0] >= r.rect[0] && p[0] <= r.rect[0] + r.rect[2] && p[1] >= r.rect[1] && p[1] <= r.rect[1] + r.rect[3])
        ?? (floor.rooms ?? []).find((r) => p[0] >= r.rect[0] && p[0] <= r.rect[0] + r.rect[2] && p[1] >= r.rect[1] && p[1] <= r.rect[1] + r.rect[3]) ?? null;
      drag = { kind: 'pan', cx: e.clientX, cy: e.clientY, vx: view.x, vy: view.y, s: px() };
    } else if (multi.length > 1) {
      drag = { kind: 'group', p, item: { kind, i }, orig: multi.map((m) => (m.kind === 'object' ? xz(objects()[m.i]) : clone(walls()[m.i]))) };
    } else if (kind === 'resize' || kind === 'rotate') {
      const o = objects()[i];
      sel = { kind: 'object', i };
      drag = { kind, i, c: +t.dataset.c, p, at: xz(o), stretch: [...stretchOf(o)] };
    } else if (kind === 'handle') {
      const w = walls()[i], end = t.dataset.end, at = w[end];
      // every wall end sitting on this corner moves with it
      const group = [];
      walls().forEach((o, k) => ['from', 'to'].forEach((en) => {
        if (Math.hypot(o[en][0] - at[0], o[en][1] - at[1]) < 0.01) group.push({ i: k, end: en });
      }));
      drag = { kind, group, other: w[end === 'from' ? 'to' : 'from'] };
    } else {
      sel = kind === 'opening' ? { kind, i, j } : { kind, i };
      const orig = kind === 'object' ? xz(objects()[i]) : kind === 'wall' ? clone(walls()[i]) : walls()[i].openings[j].at;
      drag = { kind, p, orig };
    }
    render();
  });

  svg.addEventListener('pointermove', (e) => {
    const p = point(e);
    if (draft) {
      draft.b = straighten(snapPoint(p), draft.a);
      return render();
    }
    if (!drag) return;
    if (drag.kind === 'pan') {
      view.x = drag.vx - (e.clientX - drag.cx) * drag.s;
      view.y = drag.vy - (e.clientY - drag.cy) * drag.s;
      return render();
    }
    if (drag.kind === 'marquee') {
      drag.b = p;
      return render();
    }
    if (!drag.moved) {
      if (drag.p && Math.hypot(p[0] - drag.p[0], p[1] - drag.p[1]) < 3 * px()) return;
      pushUndo();
      drag.moved = true;
    }
    if (drag.kind === 'rotate') {
      // turn the object so its handle points at the pointer
      const o = objects()[drag.i], [ox, oz] = xz(o);
      const step = e.shiftKey ? 1 : 15;
      const rot = Math.round((-Math.atan2(p[1] - oz, p[0] - ox) * 180) / Math.PI / step) * step;
      o.rot = ((rot + 180) % 360 + 360) % 360 - 180;
      if (!o.rot) delete o.rot;
    } else if (drag.kind === 'resize') {
      // the dragged corner follows the pointer, the opposite corner stays put
      const o = objects()[drag.i], n = sizeOf(o);
      const th = (-(o.rot ?? 0) * Math.PI) / 180, cos = Math.cos(th), sin = Math.sin(th);
      const [ox, oz] = drag.at, [sx0, sy0, sz0] = drag.stretch;
      const dx = p[0] - ox, dz = p[1] - oz;
      const lx = dx * cos + dz * sin, lz = -dx * sin + dz * cos;
      const xs = drag.c & 1 ? 1 : -1, zs = drag.c & 2 ? 1 : -1;
      const nax = xs > 0 ? n.x0 : n.x1, naz = zs > 0 ? n.z0 : n.z1; // the fixed corner
      const ax = nax * sx0, az = naz * sz0;
      let sx = Math.max(GRID, snap(xs * (lx - ax))) / (n.x1 - n.x0 || 1);
      let sz = Math.max(GRID, snap(zs * (lz - az))) / (n.z1 - n.z0 || 1);
      let sy = sy0;
      if (e.shiftKey) {
        const k = Math.max(sx / sx0, sz / sz0);
        [sx, sy, sz] = [sx0 * k, sy0 * k, sz0 * k];
      }
      const mx = ax - nax * sx, mz = az - naz * sz;
      setXZ(o, ox + mx * cos - mz * sin, oz + mx * sin + mz * cos);
      setStretch(o, [sx, sy, sz]);
    } else if (drag.kind === 'group') {
      const dx = snap(p[0] - drag.p[0]), dz = snap(p[1] - drag.p[1]);
      multi.forEach((m, k) => {
        if (m.kind === 'object') setXZ(objects()[m.i], snap(drag.orig[k][0] + dx), snap(drag.orig[k][1] + dz));
        else {
          const o = drag.orig[k], w = walls()[m.i];
          w.from = [round(o.from[0] + dx), round(o.from[1] + dz)];
          w.to = [round(o.to[0] + dx), round(o.to[1] + dz)];
        }
      });
    } else if (drag.kind === 'object') {
      setXZ(objects()[sel.i], snap(drag.orig[0] + p[0] - drag.p[0]), snap(drag.orig[1] + p[1] - drag.p[1]));
    } else if (drag.kind === 'wall') {
      const w = walls()[sel.i], dx = snap(p[0] - drag.p[0]), dz = snap(p[1] - drag.p[1]);
      w.from = [round(drag.orig.from[0] + dx), round(drag.orig.from[1] + dz)];
      w.to = [round(drag.orig.to[0] + dx), round(drag.orig.to[1] + dz)];
    } else if (drag.kind === 'handle') {
      const target = straighten(snapPoint(p, drag.group), drag.other);
      for (const g of drag.group) walls()[g.i][g.end] = [...target];
    } else if (drag.kind === 'opening') {
      const w = walls()[sel.i], o = w.openings[sel.j], l = wallLen(w);
      const d = ((p[0] - drag.p[0]) * (w.to[0] - w.from[0]) + (p[1] - drag.p[1]) * (w.to[1] - w.from[1])) / l;
      o.at = Math.max(0, Math.min(snap(drag.orig + d), round(l - o.width)));
    }
    render();
  });

  svg.addEventListener('pointerup', () => {
    if (draft) {
      const { a, b } = draft;
      draft = null;
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) >= 0.2) {
        return change(() => {
          walls().push({ from: a, to: b });
          sel = { kind: 'wall', i: walls().length - 1 };
        });
      }
    }
    if (drag?.kind === 'marquee') {
      const [a, b] = [drag.a, drag.b];
      const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), z0 = Math.min(a[1], b[1]), z1 = Math.max(a[1], b[1]);
      const inside = ([x, z]) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
      const hit = [];
      objects().forEach((o, i) => inside(xz(o)) && hit.push({ kind: 'object', i }));
      walls().forEach((w, i) => inside(w.from) && inside(w.to) && hit.push({ kind: 'wall', i }));
      if (Math.hypot(x1 - x0, z1 - z0) >= 4 * px()) {
        const base = multi.length ? multi : sel && (sel.kind === 'object' || sel.kind === 'wall') ? [{ ...sel }] : [];
        multi = [...base, ...hit.filter((h) => !base.some((m) => m.kind === h.kind && m.i === h.i))];
        if (multi.length <= 1) { sel = multi[0] ? { ...multi[0] } : null; multi = []; } else sel = null;
      }
      drag = null;
      return render();
    }
    if (drag?.kind === 'group' && !drag.moved) { sel = { ...drag.item }; multi = []; }
    if (drag?.moved) save();
    drag = null;
    render();
  });

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const [x, y] = point(e);
    const k = Math.min(Math.max(Math.exp(e.deltaY * 0.0015), 0.5), 2);
    const w = Math.min(Math.max(view.w * k, 2), 80);
    const r = w / view.w;
    view = { x: x - (x - view.x) * r, y: y - (y - view.y) * r, w, h: view.h * r };
    render();
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (el.hidden || e.target.matches('input, select, textarea')) return;
    const step = { ArrowLeft: [-GRID, 0], ArrowRight: [GRID, 0], ArrowUp: [0, -GRID], ArrowDown: [0, GRID] }[e.key];
    const cmd = e.ctrlKey || e.metaKey; // Cmd on a Mac, Ctrl elsewhere
    const key = e.key.toLowerCase();
    if (cmd && ((key === 'z' && e.shiftKey) || key === 'y')) redoLast();
    else if (cmd && key === 'z') undoLast();
    else if (cmd && key === 'a') { // select everything on this floor
      multi = [...objects().map((_, i) => ({ kind: 'object', i })), ...walls().map((_, i) => ({ kind: 'wall', i }))];
      sel = null;
      if (multi.length <= 1) { sel = multi[0] ? { ...multi[0] } : null; multi = []; }
      render();
    }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && picked().length) duplicate();
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && picked().length) copy();
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && clip) paste();
    else if (e.key === 'Escape') { tool = 'select'; draft = null; sel = null; multi = []; render(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') remove();
    else if (step && picked().length) change(() => {
      for (const m of picked()) {
        if (m.kind === 'object') { const o = objects()[m.i], [x, z] = xz(o); setXZ(o, x + step[0], z + step[1]); }
        else { const w = walls()[m.i]; for (const en of ['from', 'to']) w[en] = [round(w[en][0] + step[0]), round(w[en][1] + step[1])]; }
      }
    });
    else if (e.key.toLowerCase() === 'r' && sel?.kind === 'object') change(() => { const o = objects()[sel.i]; o.rot = (((o.rot ?? 0) + (e.shiftKey ? -45 : 45) + 180) % 360 + 360) % 360 - 180; if (!o.rot) delete o.rot; });
    else return;
    e.preventDefault();
  });

  el.querySelector('.tools').addEventListener('click', (e) => {
    if (!e.target.dataset.tool) return;
    tool = e.target.dataset.tool;
    if (tool !== 'select') { sel = null; multi = []; }
    render();
  });
  const catalogEl = $('.catalog');
  createCatalog({ container: catalogEl, onPick: addObject });
  catalogEl.addEventListener('close', () => { tool = 'select'; render(); });
  $('.undo').addEventListener('click', undoLast);
  $('.beside').addEventListener('click', () => {
    besideOn = !besideOn;
    if (besideOn) show3d();
    else $('iframe').src = 'about:blank';
    render();
  });
  $('.floor').addEventListener('change', (e) => openFloor(e.target.value));
  $('.done').addEventListener('click', () => {
    if (dirty) location.reload(); // rebuild the 3D house from the saved plan
    else el.hidden = true;
  });

  async function openFloor(id) {
    floor = house.floors.find((f) => f.id === id) ?? house.floors[0];
    $('.floor').value = floor.id;
    sel = null;
    multi = [];
    if (besideOn) show3d();
    targetRoom = null;
    await Promise.all(objects().map(measure));
    // fit the whole floor in view
    const xs = [], zs = [];
    for (const r of floor.rooms ?? []) xs.push(r.rect[0], r.rect[0] + r.rect[2]), zs.push(r.rect[1], r.rect[1] + r.rect[3]);
    for (const w of walls()) xs.push(w.from[0], w.to[0]), zs.push(w.from[1], w.to[1]);
    const x0 = Math.min(...xs, 0), x1 = Math.max(...xs, 5), z0 = Math.min(...zs, 0), z1 = Math.max(...zs, 5);
    view = { x: x0 - 1.5, y: z0 - 1.5, w: x1 - x0 + 3, h: z1 - z0 + 3 };
    render();
  }

  return {
    async open(floorId) {
      el.hidden = false;
      await openFloor(floorId);
    },
    get isOpen() { return !el.hidden; },
  };
}
