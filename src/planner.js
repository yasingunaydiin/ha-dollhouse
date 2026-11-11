// 2D floor-plan editor: move furniture, drag walls and their corners, draw new
// walls, add doors and windows, edit exact numbers. Every change is saved to
// house.yaml; the 3D view is rebuilt when the planner closes.
import * as THREE from 'three';
import { createModel, listModels } from './models/registry.js';

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
      </span>
      <span class="add"><select class="model"></select><button class="add-object">Add furniture</button></span>
      <button class="undo" title="Undo (Ctrl+Z)">Undo</button>
      <span class="spacer"></span>
      <button class="done">Done</button>
    </div>
    <svg></svg>
    <aside class="props"></aside>
    <div class="hint"></div>`;
  const $ = (q) => el.querySelector(q);
  const svg = $('svg');
  const props = $('.props');
  const HINTS = {
    select: 'Click to select · drag furniture, walls, corners and openings · arrow keys nudge · R rotates · Del deletes · Ctrl+Z undo · scroll to zoom',
    wall: 'Drag to draw a wall · it snaps to the grid, to existing corners and to straight lines · Esc to stop',
    door: 'Click a wall to put a door in it',
    window: 'Click a wall to put a window in it',
  };

  let floor = null;
  let tool = 'select';
  let sel = null; // { kind: 'wall' | 'opening' | 'object', i, j }
  let view = { x: 0, y: 0, w: 10, h: 10 };
  let drag = null;
  let draft = null; // wall being drawn
  let dirty = false;
  const undo = [];
  const sizes = new Map(); // model footprint cache

  for (const m of listModels().sort()) $('.model').add(new Option(m.replaceAll('_', ' '), m));
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
      sizes.set(key, b.isEmpty() ? { x0: -0.25, x1: 0.25, z0: -0.25, z1: 0.25 } : { x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z });
    }
    return sizes.get(key);
  }
  const sizeOf = (def) => sizes.get(def.model + JSON.stringify(def.params ?? {})) ?? { x0: -0.25, x1: 0.25, z0: -0.25, z1: 0.25 };

  // ── saving and undo
  function pushUndo() {
    undo.push({ floor: floor.id, wallList: clone(walls()), objects: clone(objects()) });
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
    } catch (err) {
      say(`Not saved: ${err.message}`);
    }
  }
  function change(fn) {
    pushUndo();
    fn();
    save();
    render();
  }
  function undoLast() {
    const last = undo.pop();
    if (!last) return;
    const f = house.floors.find((x) => x.id === last.floor);
    f.wallList = last.wallList;
    f.objects = last.objects;
    if (f !== floor) return openFloor(f.id).then(save);
    sel = null;
    save();
    render();
  }

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
      h += `<rect class="room${r.outdoor ? ' outdoor' : ''}" x="${x}" y="${z}" width="${w}" height="${d}"/>
        <text class="room-name" x="${x + w / 2}" y="${z + d / 2}" font-size="${13 * s}">${esc(r.name ?? r.id)}
          <tspan x="${x + w / 2}" dy="${15 * s}" class="area" font-size="${11 * s}">${(w * d).toFixed(1)} m²</tspan></text>`;
    }

    objects().forEach((o, i) => {
      const b = sizeOf(o), [x, z] = xz(o);
      const on = sel?.kind === 'object' && sel.i === i;
      h += `<g class="obj${on ? ' sel' : ''}" data-kind="object" data-i="${i}" transform="translate(${x} ${z}) rotate(${-(o.rot ?? 0)})">
        <rect x="${b.x0}" y="${b.z0}" width="${b.x1 - b.x0}" height="${b.z1 - b.z0}" rx="${3 * s}"/>
        <path d="M${(b.x0 + b.x1) / 2 - 5 * s} ${b.z1 - 3 * s}h${10 * s}" class="front"/></g>`;
      if (on) h += `<text class="obj-name" x="${x}" y="${z - (b.z1 - b.z0) / 2 - 8 * s}" font-size="${11 * s}">${esc(o.id)}</text>`;
    });

    walls().forEach((w, i) => {
      const t = thickness(w);
      const on = sel?.kind === 'wall' && sel.i === i;
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

    if (draft) h += `<line class="wall draft" x1="${draft.a[0]}" y1="${draft.a[1]}" x2="${draft.b[0]}" y2="${draft.b[1]}" stroke-width="${Math.max(0.1, 4 * s)}"/>
      <text class="len" x="${(draft.a[0] + draft.b[0]) / 2}" y="${(draft.a[1] + draft.b[1]) / 2 - 8 * s}" font-size="${11 * s}">${Math.hypot(draft.b[0] - draft.a[0], draft.b[1] - draft.a[1]).toFixed(2)} m</text>`;
    svg.innerHTML = h;
    svg.dataset.tool = tool;
    for (const b of el.querySelectorAll('[data-tool]')) b.classList.toggle('active', b.dataset.tool === tool);
    $('.hint').textContent = HINTS[tool];
    $('.undo').disabled = !undo.length;
    if (!props.contains(document.activeElement)) renderProps();
  }

  // ── properties panel
  const field = (label, prop, value, attrs = 'type="number" step="0.05"') =>
    `<label><small>${label}</small><input data-prop="${prop}" ${attrs} value="${value ?? ''}"/></label>`;

  function renderProps() {
    if (!sel) {
      props.innerHTML = `<h3>${esc(floor.name)}</h3><p>${walls().length} walls · ${objects().length} objects</p>
        <p>Select something to see and change its exact measurements.</p>`;
      return;
    }
    if (sel.kind === 'object') {
      const o = objects()[sel.i], [x, z] = xz(o);
      props.innerHTML = `<h3>${esc(o.id)}</h3><p>${esc(o.model)}</p>
        ${field('X (m)', 'x', x)}${field('Z (m)', 'z', z)}${field('Rotation (°)', 'rot', o.rot ?? 0, 'type="number" step="15"')}
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
  props.addEventListener('click', (e) => e.target.matches('.delete') && remove());

  // ── actions
  function remove() {
    if (!sel) return;
    change(() => {
      if (sel.kind === 'object') objects().splice(sel.i, 1);
      else if (sel.kind === 'wall') walls().splice(sel.i, 1);
      else walls()[sel.i].openings.splice(sel.j, 1);
      sel = null;
    });
  }

  function addOpening(i, p) {
    const w = walls()[i];
    const l = wallLen(w);
    const o = { ...DEFAULTS[tool] };
    o.width = Math.min(o.width, round(l - 0.1));
    const d = ((p[0] - w.from[0]) * (w.to[0] - w.from[0]) + (p[1] - w.from[1]) * (w.to[1] - w.from[1])) / l;
    o.at = Math.max(0, Math.min(snap(d - o.width / 2), round(l - o.width)));
    change(() => {
      (w.openings ??= []).push(o);
      sel = { kind: 'opening', i, j: w.openings.length - 1 };
      tool = 'select';
    });
  }

  async function addObject() {
    const model = $('.model').value;
    const ids = new Set(house.floors.flatMap((f) => (f.objects ?? []).map((o) => o.id)));
    let n = 1;
    while (ids.has(`${model}_${n}`)) n++;
    const def = { id: `${model}_${n}`, model, at: [snap(view.x + view.w / 2), snap(view.y + view.h / 2)] };
    await measure(def);
    change(() => {
      objects().push(def);
      sel = { kind: 'object', i: objects().length - 1 };
      tool = 'select';
    });
  }

  // ── pointer
  svg.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    svg.setPointerCapture(e.pointerId);
    const t = e.target.closest('[data-kind]');
    const p = point(e);
    const kind = t?.dataset.kind, i = +t?.dataset.i, j = +t?.dataset.j;
    if (tool === 'wall') {
      const a = snapPoint(p);
      draft = { a, b: a };
    } else if (tool === 'door' || tool === 'window') {
      if (kind === 'wall' || kind === 'opening') addOpening(i, p);
      else say('Click on a wall');
      return;
    } else if (!t) {
      sel = null;
      drag = { kind: 'pan', cx: e.clientX, cy: e.clientY, vx: view.x, vy: view.y, s: px() };
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
    if (!drag.moved) {
      if (drag.p && Math.hypot(p[0] - drag.p[0], p[1] - drag.p[1]) < 3 * px()) return;
      pushUndo();
      drag.moved = true;
    }
    if (drag.kind === 'object') {
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
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') undoLast();
    else if (e.key === 'Escape') { tool = 'select'; draft = null; sel = null; render(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') remove();
    else if (step && sel?.kind === 'object') change(() => { const o = objects()[sel.i], [x, z] = xz(o); setXZ(o, x + step[0], z + step[1]); });
    else if (step && sel?.kind === 'wall') change(() => { const w = walls()[sel.i]; for (const en of ['from', 'to']) w[en] = [round(w[en][0] + step[0]), round(w[en][1] + step[1])]; });
    else if (e.key.toLowerCase() === 'r' && sel?.kind === 'object') change(() => { const o = objects()[sel.i]; o.rot = (((o.rot ?? 0) + (e.shiftKey ? -45 : 45) + 180) % 360 + 360) % 360 - 180; if (!o.rot) delete o.rot; });
    else return;
    e.preventDefault();
  });

  el.querySelector('.tools').addEventListener('click', (e) => {
    if (!e.target.dataset.tool) return;
    tool = e.target.dataset.tool;
    if (tool !== 'select') sel = null;
    render();
  });
  $('.add-object').addEventListener('click', addObject);
  $('.undo').addEventListener('click', undoLast);
  $('.floor').addEventListener('change', (e) => openFloor(e.target.value));
  $('.done').addEventListener('click', () => {
    if (dirty) location.reload(); // rebuild the 3D house from the saved plan
    else el.hidden = true;
  });

  async function openFloor(id) {
    floor = house.floors.find((f) => f.id === id) ?? house.floors[0];
    $('.floor').value = floor.id;
    sel = null;
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
