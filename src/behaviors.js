// Behaviours ("profiles"): how each kind of object reflects an entity's state,
// and what a click on it does. Add a new kind here to support covers, TVs, etc.
import * as THREE from 'three';
import { POWER_MODELS, portsOf } from './models/power.js';

// line icons drawn around (0, 0), about 40 px across
function glyph(c, name, on, glow) {
  c.strokeStyle = c.fillStyle = on ? glow : '#6f7a99';
  c.lineWidth = 3.5;
  c.lineCap = c.lineJoin = 'round';
  if (name === 'monitor') {
    c.beginPath(); c.roundRect(-17, -16, 34, 24, 4); c.stroke();
    c.beginPath(); c.moveTo(-7, 15); c.lineTo(7, 15); c.moveTo(0, 8); c.lineTo(0, 15); c.stroke();
    c.beginPath(); c.moveTo(-4, -10); c.lineTo(6, -4); c.lineTo(-4, 2); c.closePath(); c.fill();
  } else if (name === 'bulb') {
    c.beginPath(); c.arc(0, -6, 13, Math.PI * 0.78, Math.PI * 0.22); c.lineTo(6, 13); c.lineTo(-6, 13); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(-6, 19); c.lineTo(6, 19); c.stroke();
    if (on) { c.beginPath(); c.arc(0, -6, 6, 0, Math.PI * 2); c.globalAlpha = 0.5; c.fill(); }
  } else if (name === 'washer') {
    c.beginPath(); c.roundRect(-15, -18, 30, 36, 4); c.stroke();
    c.beginPath(); c.moveTo(-15, -9); c.lineTo(15, -9); c.stroke();
    c.beginPath(); c.arc(-8, -13.5, 1.6, 0, Math.PI * 2); c.arc(-2, -13.5, 1.6, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(0, 5, 9, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(0, 5, 5, Math.PI * 0.1, Math.PI * 0.9); c.stroke();
  } else if (name === 'coffee') {
    c.beginPath(); c.moveTo(-13, -3); c.lineTo(9, -3); c.lineTo(9, 5); c.quadraticCurveTo(9, 14, 0, 14); c.quadraticCurveTo(-13, 14, -13, 5); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(9, 0); c.quadraticCurveTo(18, 0, 17, 6); c.quadraticCurveTo(16, 10, 8, 10); c.stroke();
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(-8, -8); c.quadraticCurveTo(-5, -12, -8, -16); c.moveTo(-1, -8); c.quadraticCurveTo(2, -12, -1, -16); c.stroke();
  } else if (name === 'radiator') {
    c.beginPath(); c.roundRect(-17, -14, 34, 28, 4); c.stroke();
    c.lineWidth = 3;
    c.beginPath(); for (const x of [-8.5, 0, 8.5]) { c.moveTo(x, -8); c.lineTo(x, 8); } c.stroke();
  } else if (name === 'fan') {
    c.beginPath(); c.arc(0, 0, 3, 0, Math.PI * 2); c.fill();
    for (let k = 0; k < 3; k++) {
      c.save(); c.rotate((k * Math.PI * 2) / 3);
      c.beginPath(); c.ellipse(0, -9.5, 5, 8.5, 0, 0, Math.PI * 2); c.stroke();
      c.restore();
    }
  } else if (name === 'camera') {
    c.beginPath(); c.roundRect(-18, -11, 25, 22, 4); c.stroke();
    c.beginPath(); c.moveTo(9, -3); c.lineTo(18, -9); c.lineTo(18, 9); c.lineTo(9, 3); c.closePath(); c.stroke();
  } else {
    c.beginPath(); c.roundRect(-10, -3, 20, 16, 5); c.stroke();
    c.beginPath(); c.moveTo(-5, -3); c.lineTo(-5, -14); c.moveTo(5, -3); c.lineTo(5, -14); c.moveTo(0, 13); c.lineTo(0, 19); c.stroke();
  }
}

// small floating text bubble (always drawn on top)
function makeLabel() {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 96;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
  sprite.scale.set(0.6, 0.3, 1);
  sprite.renderOrder = 10;
  // `allowed` is the floor filter: with a floor open only that floor's bubbles show
  let has = true, allowed = true;
  return {
    sprite,
    allow(on) {
      allowed = on;
      sprite.visible = has && allowed;
    },
    // a round badge with a line icon instead of words (light, monitor, camera, plug)
    icon(name, on, glow = '#8fc4ff') {
      const c = canvas.getContext('2d');
      c.clearRect(0, 0, 192, 96);
      has = true;
      sprite.visible = allowed;
      c.save();
      c.translate(96, 48);
      c.beginPath();
      c.arc(0, 0, 44, 0, Math.PI * 2);
      c.strokeStyle = on ? glow : 'rgba(120, 135, 175, 0.35)';
      c.globalAlpha = on ? 0.35 : 0.5;
      c.lineWidth = 3;
      c.stroke();
      c.globalAlpha = 1;
      c.beginPath();
      c.arc(0, 0, 37, 0, Math.PI * 2);
      c.fillStyle = '#10182c';
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = on ? glow : 'rgba(120, 135, 175, 0.55)';
      c.stroke();
      glyph(c, name, on, glow);
      c.restore();
      texture.needsUpdate = true;
    },
    // a pill with a line icon and a short text next to it (e.g. a socket: plug icon, "2/4")
    iconText(name, text, on, glow = '#ffc98a') {
      const c = canvas.getContext('2d');
      c.clearRect(0, 0, 192, 96);
      has = true;
      sprite.visible = allowed;
      c.save();
      c.beginPath();
      c.roundRect(6, 14, 180, 68, 34);
      c.fillStyle = '#10182c';
      c.fill();
      c.lineWidth = 2.5;
      c.strokeStyle = on ? glow : 'rgba(120, 135, 175, 0.5)';
      c.stroke();
      c.save();
      c.translate(50, 48);
      c.scale(0.8, 0.8);
      glyph(c, name, on, glow);
      c.restore();
      let px = 40;
      for (; px > 18; px -= 2) {
        c.font = `700 ${px}px ui-rounded, system-ui, sans-serif`;
        if (c.measureText(text).width <= 96) break;
      }
      c.fillStyle = on ? '#ffffff' : '#8794b5';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(text, 128, 50);
      c.restore();
      texture.needsUpdate = true;
    },
    set(text, warm) {
      const c = canvas.getContext('2d');
      c.clearRect(0, 0, 192, 96);
      has = !!text;
      sprite.visible = has && allowed;
      if (!text) return;
      c.fillStyle = warm ? '#ff8a3c' : 'rgba(255, 252, 245, 0.95)';
      c.beginPath();
      c.roundRect(8, 12, 176, 72, 36);
      c.fill();
      c.fillStyle = warm ? '#fff' : '#3a332b';
      let px = 44;
      for (; px > 18; px -= 2) {
        c.font = `700 ${px}px ui-rounded, system-ui, sans-serif`;
        if (c.measureText(text).width <= 150) break;
      }
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(text, 96, 50);
      texture.needsUpdate = true;
    },
  };
}

// Lamp pool. Every PointLight in the scene is evaluated for every pixel of every
// material, even at intensity 0, so one light per lamp (24+ in a house) is slow.
// Objects own a cheap "virtual lamp" instead, and a small fixed set of real lights
// is lent each frame to the brightest lamps nearest to where the camera looks.
// The count of real lights never changes, so shaders are never recompiled.
const POOL_SIZE = 6;
const virtualLamps = [];
function makeLamp(color, distance, decay, anchor) {
  const lamp = { color: new THREE.Color(color), intensity: 0, distance, decay, anchor, slot: -1 };
  virtualLamps.push(lamp);
  return lamp;
}
const pool = [];
const lampPos = new THREE.Vector3();
function updateLampPool(scene, focus) {
  if (!scene) return;
  while (pool.length < POOL_SIZE) {
    const l = new THREE.PointLight('#ffffff', 0, 7, 1.6);
    scene.add(l);
    pool.push(l);
  }
  const lit = [];
  for (const v of virtualLamps) {
    let top = v.anchor;
    while (top.parent) top = top.parent;
    if (v.intensity <= 0.01 || top !== scene) { v.slot = -1; continue; } // off, or its object was removed
    v.anchor.getWorldPosition(lampPos);
    const d2 = lampPos.distanceToSquared(focus);
    v.score = (v.intensity / (1 + d2 / 40)) * (v.slot >= 0 ? 1.4 : 1); // keep current ones: no flicker
    v.pos = (v.pos ?? new THREE.Vector3()).copy(lampPos);
    lit.push(v);
  }
  lit.sort((a, b) => b.score - a.score);
  lit.forEach((v, i) => { v.slot = i < POOL_SIZE ? i : -1; });
  pool.forEach((light, i) => {
    const v = lit.find((x) => x.slot === i);
    if (!v) { light.intensity = 0; return; }
    light.position.copy(v.pos);
    light.color.copy(v.color);
    light.intensity = v.intensity;
    light.distance = v.distance;
    light.decay = v.decay;
  });
}

const kinds = {
  light: {
    setup(entry) {
      const glows = [];
      let anchor = null;
      entry.object3d.traverse((o) => {
        if (o.isMesh && o.name.startsWith('glow')) glows.push(o);
        if (o.name === 'light_anchor') anchor = o;
      });
      const lamp = makeLamp('#ffc98a', 7, 1.6, anchor ?? entry.object3d);
      // coloured lamps (LED strips) light the room in their own colour
      if (glows[0]?.material.emissive) lamp.color.copy(glows[0].material.emissive);
      entry.light = { glows, lamp, level: 0, target: 0 };
    },
    apply(entry, state) {
      // a lamp with no entity behind it (not in Home Assistant yet) stays lit
      const on = state ? state.state === 'on' : true;
      const brightness = (state?.attributes?.brightness ?? 255) / 255;
      entry.light.target = on ? brightness : 0;
    },
    update(entry, dt) {
      const l = entry.light;
      if (Math.abs(l.level - l.target) < 1e-3) return;
      l.level = THREE.MathUtils.damp(l.level, l.target, 10, dt);
      // a glow part can ask for more (userData.boost), e.g. LED strips
      const boost = l.glows[0]?.userData.boost ?? 1;
      l.lamp.intensity = l.level * 9 * boost;
      for (const g of l.glows) g.material.emissiveIntensity = l.level * 2.2 * (g.userData.boost ?? 1);
    },
    click(entry, source) {
      return source.callService('light', 'toggle', { entity_id: entry.entityId });
    },
  },
  // Heaters / thermostats: glow while heating, with the room temperature above
  climate: {
    setup(entry) {
      const glows = [];
      let anchor = null;
      entry.object3d.traverse((o) => {
        if (o.isMesh && o.name.startsWith('glow')) glows.push(o);
        if (o.name === 'light_anchor') anchor = o;
      });
      const lamp = makeLamp('#ff8a3c', 3.5, 1.8, anchor ?? entry.object3d);
      const label = makeLabel();
      const size = new THREE.Box3().setFromObject(entry.object3d).getSize(new THREE.Vector3());
      label.sprite.position.y = size.y / entry.object3d.scale.y + 0.3;
      label.sprite.scale.set(0.6 / entry.object3d.scale.x, 0.3 / entry.object3d.scale.y, 1);
      if (entry.def.bubble !== false) entry.object3d.add(label.sprite);
      entry.climate = { glows, lamp, label, level: 0, target: 0 };
    },
    apply(entry, state) {
      const a = state?.attributes ?? {};
      const heating = ['heat', 'auto'].includes(state?.state) && !['idle', 'off'].includes(a.hvac_action);
      entry.climate.target = heating ? 1 : 0;
      const t = a.current_temperature;
      // the radiator icon with the room temperature next to it
      const glow = '#ff8a3c';
      if (t == null) entry.climate.label.icon('radiator', heating, glow);
      else entry.climate.label.iconText('radiator', `${Math.round(t * 10) / 10}°`, heating, glow);
    },
    update(entry, dt) {
      const c = entry.climate;
      if (Math.abs(c.level - c.target) < 1e-3) return;
      c.level = THREE.MathUtils.damp(c.level, c.target, 4, dt);
      c.lamp.intensity = c.level * 2.5;
      for (const g of c.glows) g.material.emissiveIntensity = c.level * 2.4;
    },
    dialog: 'climate', // a click opens the control window (src/dialogs/climate.js)
  },
  // TVs and speakers: the screen lights up while the device is on
  media_player: {
    setup(entry) {
      const screens = [];
      entry.object3d.traverse((o) => {
        if (o.isMesh && o.name.startsWith('screen')) {
          o.material = o.material.clone();
          o.material.emissive = new THREE.Color('#6fa8ff');
          o.material.emissiveIntensity = 0;
          screens.push(o);
        }
      });
      entry.screen = { screens, level: 0, target: 0 };
    },
    apply(entry, state) {
      entry.screen.target = ['on', 'playing', 'paused', 'idle'].includes(state?.state) ? 1 : 0;
    },
    update(entry, dt) {
      const s = entry.screen;
      if (Math.abs(s.level - s.target) < 1e-3) return;
      s.level = THREE.MathUtils.damp(s.level, s.target, 8, dt);
      for (const m of s.screens) m.material.emissiveIntensity = s.level * 1.4;
    },
    click(entry, source) {
      return source.callService('media_player', 'toggle', { entity_id: entry.entityId });
    },
  },
};

// Cameras and doorbells: the status light is on while the camera is reachable
kinds.camera = {
  setup(entry) {
    const glows = [];
    entry.object3d.traverse((o) => o.isMesh && o.name.startsWith('glow') && glows.push(o));
    entry.camera = { glows };
  },
  apply(entry, state) {
    const online = !!state && !['unavailable', 'unknown'].includes(state.state);
    for (const g of entry.camera.glows) g.material.emissiveIntensity = online ? 2.5 : 0;
  },
  dialog: 'camera', // a click opens the live picture (src/dialogs/camera.js)
};

// ───────────────────────── pets: wander around their floor on their own
// A pet has no entity. It walks to a random spot it can reach, sits or loafs
// there for a while, then picks another. It keeps to the indoor rooms of its
// floor, walks through open inside doors and around walls and furniture.
const CELL = 0.1; // navigation grid, metres
let world = null; // { house, built }, set by attachBehaviors

function buildNav(entry) {
  const { house, built } = world;
  const def = house.floors.find((f) => f.id === entry.floorId);
  const rec = built.floors.find((f) => f.id === entry.floorId);
  let rooms = (def.rooms ?? []).filter((r) => !r.outdoor).map((r) => r.rect);
  if (!rooms.length) rooms = (def.rooms ?? []).map((r) => r.rect); // no house yet: roam the lot
  if (!rooms.length) rooms = [[0, 0, 1, 1]];
  const x0 = Math.min(...rooms.map((r) => r[0])), z0 = Math.min(...rooms.map((r) => r[1]));
  const W = Math.ceil((Math.max(...rooms.map((r) => r[0] + r[2])) - x0) / CELL);
  const H = Math.ceil((Math.max(...rooms.map((r) => r[1] + r[3])) - z0) / CELL);
  const cfg = { ...house.walls, ...def.walls };
  const walls = (def.wallList ?? []).map((w) => {
    const dx = w.to[0] - w.from[0], dz = w.to[1] - w.from[1], len = Math.hypot(dx, dz) || 1;
    // gaps a pet can walk through: inside doors that stand open
    const gaps = w.exterior ? [] : (w.openings ?? []).filter((o) => o.type === 'door' && o.open !== 0).map((o) => [o.at + 0.12, o.at + o.width - 0.12]);
    return { ax: w.from[0], az: w.from[1], ux: dx / len, uz: dz / len, len, gaps, reach: (w.thickness ?? (w.exterior ? cfg.exteriorThickness : cfg.interiorThickness)) / 2 + 0.12 };
  });
  // Furniture: every mesh part that stands between ankle and cat height
  // blocks the cells under it. Each part is tested in its own frame, so an
  // L-shaped sofa or a turned table blocks only the floor it really covers.
  built.root.updateMatrixWorld(true);
  const blocked = new Uint8Array(W * H);
  const MARGIN = 0.1, HEIGHTS = [0.06, 0.2, 0.34, 0.44];
  const inv = new THREE.Matrix4(), q = new THREE.Vector3(), corner = new THREE.Vector3(), span = new THREE.Box3();
  for (const other of built.objects.values()) {
    if (other === entry || other.floorId !== entry.floorId) continue;
    other.object3d.traverse((m) => {
      if (!m.isMesh || m.geometry.type === 'TorusGeometry') return;
      m.geometry.boundingBox ?? m.geometry.computeBoundingBox();
      const bb = m.geometry.boundingBox;
      // where this part sits on the floor plan
      span.makeEmpty();
      for (let c = 0; c < 8; c++) {
        corner.set(c & 1 ? bb.max.x : bb.min.x, c & 2 ? bb.max.y : bb.min.y, c & 4 ? bb.max.z : bb.min.z);
        span.expandByPoint(rec.group.worldToLocal(corner.applyMatrix4(m.matrixWorld)));
      }
      if (span.max.y < 0.05 || span.min.y > 0.45) return; // flat on the floor, or out of reach overhead
      inv.copy(m.matrixWorld).invert();
      const i0 = Math.max(0, Math.floor((span.min.x - MARGIN - x0) / CELL)), i1 = Math.min(W - 1, Math.floor((span.max.x + MARGIN - x0) / CELL));
      const j0 = Math.max(0, Math.floor((span.min.z - MARGIN - z0) / CELL)), j1 = Math.min(H - 1, Math.floor((span.max.z + MARGIN - z0) / CELL));
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) {
          if (blocked[j * W + i]) continue;
          for (const y of HEIGHTS) {
            rec.group.localToWorld(q.set(x0 + (i + 0.5) * CELL, y, z0 + (j + 0.5) * CELL)).applyMatrix4(inv);
            if (q.x > bb.min.x - MARGIN && q.x < bb.max.x + MARGIN && q.y > bb.min.y - 0.02 && q.y < bb.max.y + 0.02 && q.z > bb.min.z - MARGIN && q.z < bb.max.z + MARGIN) {
              blocked[j * W + i] = 1;
              break;
            }
          }
        }
    });
  }
  const open = new Uint8Array(W * H);
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const x = x0 + (i + 0.5) * CELL, z = z0 + (j + 0.5) * CELL;
      if (!rooms.some(([rx, rz, w, d]) => x >= rx && x <= rx + w && z >= rz && z <= rz + d)) continue;
      if (blocked[j * W + i]) continue;
      const hitsWall = walls.some((w) => {
        const t = (x - w.ax) * w.ux + (z - w.az) * w.uz;
        const tc = Math.max(0, Math.min(w.len, t));
        if (Math.hypot(x - (w.ax + w.ux * tc), z - (w.az + w.uz * tc)) > w.reach) return false;
        return !w.gaps.some(([g0, g1]) => t > g0 && t < g1);
      });
      if (!hitsWall) open[j * W + i] = 1;
    }
  const nav = { x0, z0, W, H, open, cells: [] };
  nav.cell = (x, z) => [Math.floor((x - x0) / CELL), Math.floor((z - z0) / CELL)];
  nav.isOpen = (i, j) => i >= 0 && j >= 0 && i < W && j < H && open[j * W + i] === 1;
  nav.point = (k) => [x0 + ((k % W) + 0.5) * CELL, z0 + (Math.floor(k / W) + 0.5) * CELL];
  return nav;
}

const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
// breadth-first search from cell k; returns each reachable cell's predecessor
function flood(nav, k) {
  const from = new Int32Array(nav.W * nav.H).fill(-1);
  const queue = [k];
  from[k] = k;
  for (let q = 0; q < queue.length; q++) {
    const c = queue[q], i = c % nav.W, j = Math.floor(c / nav.W);
    for (const [di, dj] of STEPS) {
      if (!nav.isOpen(i + di, j + dj)) continue;
      if (di && dj && !(nav.isOpen(i + di, j) && nav.isOpen(i, j + dj))) continue; // no cutting corners
      const n = (j + dj) * nav.W + i + di;
      if (from[n] !== -1) continue;
      from[n] = c;
      queue.push(n);
    }
  }
  return { from, reached: queue };
}
function nearestOpen(nav, x, z) {
  let best = -1, bestD = Infinity;
  for (let k = 0; k < nav.open.length; k++) {
    if (!nav.open[k]) continue;
    const [px, pz] = nav.point(k), d = (px - x) ** 2 + (pz - z) ** 2;
    if (d < bestD) { bestD = d; best = k; }
  }
  return best;
}
function clearLine(nav, a, b) {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.04);
  for (let s = 0; s <= n; s++) {
    const t = n ? s / n : 0;
    if (!nav.isOpen(...nav.cell(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))) return false;
  }
  return true;
}
// a walkable path from (x, z) to a random reachable spot, as a list of [x, z] corners
function randomRoute(nav, x, z) {
  const start = nearestOpen(nav, x, z);
  if (start < 0) return null;
  const { from, reached } = flood(nav, start);
  if (reached.length < 2) return null;
  let k = reached[1 + Math.floor(Math.random() * (reached.length - 1))];
  const cells = [];
  for (; k !== start; k = from[k]) cells.push(nav.point(k));
  cells.push(nav.point(start));
  cells.reverse();
  // straighten: skip ahead to the furthest corner that can be walked to in a straight line
  const path = [];
  for (let i = 0; i < cells.length - 1; ) {
    let j = cells.length - 1;
    while (j > i + 1 && !clearLine(nav, cells[i], cells[j])) j--;
    path.push(cells[j]);
    i = j;
  }
  return path;
}

kinds.pet = {
  setup(entry) {
    const part = (name) => entry.object3d.getObjectByName(name);
    entry.pet = {
      legs: [0, 1, 2, 3].map((i) => part(`leg${i}`)).filter(Boolean),
      tail: part('tail'), body: part('body'),
      state: 'idle', wait: 1 + Math.random() * 2, path: [], phase: 0, time: Math.random() * 10, loaf: 0, loafTarget: 0, nav: null, last: null,
    };
  },
  apply() {},
  update(entry, dt) {
    const p = entry.pet, o = entry.object3d;
    if (!world) return;
    p.nav ??= buildNav(entry);
    p.time += dt;
    // picked up and put somewhere else (edit mode): start again from there
    if (p.last && Math.hypot(o.position.x - p.last[0], o.position.z - p.last[1]) > 0.3) Object.assign(p, { state: 'idle', wait: 1.5, path: [] });
    if (p.state === 'idle') {
      p.wait -= dt;
      if (p.wait <= 0) {
        const path = randomRoute(p.nav, o.position.x, o.position.z);
        if (path?.length) Object.assign(p, { path, state: 'walk', loafTarget: 0 });
        else p.wait = 2;
      }
    } else if (p.loaf < 0.05) {
      const [tx, tz] = p.path[0];
      const dx = tx - o.position.x, dz = tz - o.position.z, dist = Math.hypot(dx, dz);
      const step = (entry.def.params?.speed ?? 0.55) * dt;
      if (dist <= step) {
        o.position.x = tx;
        o.position.z = tz;
        p.path.shift();
        if (!p.path.length) Object.assign(p, { state: 'idle', wait: 3 + Math.random() * 9, loafTarget: Math.random() < 0.6 ? 1 : 0 });
      } else {
        o.position.x += (dx / dist) * step;
        o.position.z += (dz / dist) * step;
        let turn = Math.atan2(dx, dz) - o.rotation.y;
        turn = ((turn + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        o.rotation.y += turn * Math.min(1, dt * 8);
      }
      p.phase += dt * 11;
    }
    p.last = [o.position.x, o.position.z];
    // pose: legs trot in diagonal pairs while walking; loafing tucks them under
    p.loaf = THREE.MathUtils.damp(p.loaf, p.loafTarget, 5, dt);
    const swing = p.state === 'walk' ? 0.55 : 0;
    p.legs.forEach((leg, i) => {
      leg.rotation.x = Math.sin(p.phase + (i === 0 || i === 3 ? 0 : Math.PI)) * swing;
      leg.scale.y = 1 - 0.8 * p.loaf;
    });
    if (p.body) p.body.position.y = -0.105 * p.loaf + (p.state === 'walk' ? Math.abs(Math.sin(p.phase)) * 0.006 : 0);
    p.legs.forEach((leg) => (leg.position.y = 0.155 - 0.105 * p.loaf));
    if (p.tail) {
      p.tail.rotation.z = Math.sin(p.time * (p.state === 'walk' ? 3 : 1.3)) * 0.35;
      p.tail.rotation.x = -0.7 - 0.5 * p.loaf;
    }
  },
};

// Street lamps: no entity of their own, they come on when the sun is down.
kinds.streetlight = {
  ...kinds.light,
  setup(entry) {
    kinds.light.setup(entry);
    const { lamp, glows } = entry.light;
    lamp.distance = 18; // reach the road and pavement from up high
    lamp.decay = 1.2;
    glows.forEach((g) => (g.userData.boost = 3));
  },
  apply() {},
  click() {},
};

// ───────────────────────── floating bubbles: the state of every linked object
// and, over every socket and power strip, how many plugs are in use and the
// power drawn by what is plugged in. Climate objects draw their own bubble.
const UNITLESS = new Set(['on', 'off']);
function stateText(s) {
  if (!s) return '';
  if (['unavailable', 'unknown'].includes(s.state)) return 'n/a';
  const a = s.attributes ?? {};
  if (s.state === 'on' && a.brightness != null) return `${Math.round((a.brightness / 255) * 100)}%`;
  const unit = !UNITLESS.has(s.state) && a.unit_of_measurement ? ` ${a.unit_of_measurement}` : '';
  return `${s.state}${unit}`;
}
const WARM = new Set(['on', 'playing', 'heat', 'open', 'home']);
// domains that show a round icon badge instead of words
const ICONS = {
  light: { name: 'bulb', glow: '#ffc98a', active: (st) => st === 'on' },
  media_player: { name: 'monitor', glow: '#8fc4ff', active: (st) => ['on', 'playing', 'paused', 'idle', 'buffering'].includes(st) },
  camera: { name: 'camera', glow: '#8fc4ff', active: (st) => st !== 'off' },
  fan: { name: 'fan', glow: '#8fc4ff', active: (st) => st === 'on' },
  switch: { name: 'plug', glow: '#ffc98a', active: (st) => st === 'on' },
  input_boolean: { name: 'plug', glow: '#ffc98a', active: (st) => st === 'on' },
};
const wattsOf = (s) => Number(s?.attributes?.current_power_w ?? s?.attributes?.power) || 0;

// Which electronic devices get an icon bubble even before an entity is linked to them,
// so there is something to point at when you set the entity in the plan editor.
// Whole words only (a "woven" rug is not an oven), brand names as the start of a word.
const DEVICE_ICON = [
  [/(^|_)(lamp|light|pendant|globe|chandelier|led)(_|$)/, 'bulb'],
  [/(^|_)(tv|monitor|speaker|laptop)(_|$)|^(samsung_c|msi_|nintendo|macbook)/, 'monitor'],
  [/(^|_)(camera|doorbell)(_|$)/, 'camera'],
  [/(^|_)(heater|radiator)(_|$)/, 'radiator'],
  [/(^|_)fan(_|$)/, 'fan'],
  [/(^|_)coffee(_|$)/, 'coffee'],
  [/(^|_)(washing_machine|washer|dryer)(_|$)/, 'washer'],
  [/(^|_)(printer|server|fridge|freezer|dishwasher|oven|microwave|kettle|vacuum|router|charger|inverter|purifier|humidifier)(_|$)|samsung_xpress/, 'plug'],
];
// furniture that merely holds a device (a TV bench) is not one
const HOLDS_DEVICES = /(^|_)(bench|stand|cabinet|shelf|unit|table)(_|$)/;
function deviceIcon(entry, entityId) {
  const { kind, model } = entry.def;
  if (kind === 'pet' || kind === 'streetlight' || /(^|_)street(_|$)/.test(model)) return null;
  const domain = entityId?.split('.')[0];
  if (ICONS[domain]) return ICONS[domain].name;
  if (kind === 'light') return 'bulb';
  if (kind === 'media_player') return 'monitor';
  if (kind === 'camera') return 'camera';
  if (kind === 'climate') return 'radiator';
  // an object named like a heater or radiator is one, whatever its model (a tower fan used as the bedroom heater)
  if (/(^|_)(heater|radiator)(_|\d|$)/.test(entry.def.id ?? '')) return 'radiator';
  const found = DEVICE_ICON.find(([re]) => re.test(model));
  if (!found || (HOLDS_DEVICES.test(model) && found[1] !== 'bulb')) return null;
  return found[1];
}

// does this object get an icon bubble without being told to? (the plan editor's checkbox starts from this)
export const hasBubbleByDefault = (def, entityId) => POWER_MODELS.includes(def.model) || !!deviceIcon({ def }, entityId);

function attachBubbles(objects, links, store) {
  const bubbles = [];
  // socket id -> entries plugged into it (read fresh: the plan editor changes it)
  const plugged = { get: (id) => [...objects.values()].filter((e) => e.def.plug === id) };
  const draw = (b) => {
    if (b.power) {
      const watts = (function sum(id) {
        return (plugged.get(id) ?? []).reduce((t, e) => t + wattsOf(links[e.def.id] && store.get(links[e.def.id])) + (POWER_MODELS.includes(e.def.model) ? sum(e.def.id) : 0), 0);
      })(b.entry.def.id);
      const used = (plugged.get(b.entry.def.id) ?? []).length;
      b.label.iconText('plug', watts ? `${Math.round(watts)} W` : `${used}/${portsOf(b.entry.def)}`, used > 0 || watts > 0);
    } else {
      const s = b.entityId && store.get(b.entityId);
      if (!b.entityId) return b.label.icon(b.glyph, false); // no entity yet: a dim icon to click through to
      const icon = ICONS[b.entityId.split('.')[0]];
      const gone = !s || ['unavailable', 'unknown'].includes(s.state);
      if (icon && s) b.label.icon(icon.name, !gone && icon.active(s.state), icon.glow);
      else b.label.set(stateText(s), WARM.has(s?.state));
    }
  };
  // make one object's bubble (if it should have one); the plan editor and the edit panel switch it on and off
  const byEntry = new Map();
  let shownView = 'outside';
  function make(entry) {
    const id = entry.def.id;
    const power = POWER_MODELS.includes(entry.def.model);
    if (entry.def.bubble === false || byEntry.has(entry)) return; // switched off by the user
    // bubble: true puts one on an object that is not a known device
    const glyph = power ? 'plug' : deviceIcon(entry, links[id]) ?? (entry.def.bubble ? 'plug' : null);
    // linked climate objects draw their own temperature bubble
    if (!power && ((entry.def.kind === 'climate' && links[id]) || (!links[id] && !glyph))) return;
    const label = makeLabel();
    const size = new THREE.Box3().setFromObject(entry.object3d).getSize(new THREE.Vector3());
    const small = power ? 0.6 : 1; // sockets and strips are tiny, so their bubble is too
    const sc = entry.object3d.scale;
    label.sprite.scale.set((0.6 * small) / sc.x, (0.3 * small) / sc.y, 1); // undo a stretched object's scale, or the badge squashes
    label.sprite.position.y = size.y / entry.object3d.scale.y + 0.3 * small;
    entry.object3d.add(label.sprite);
    const b = { entry, label, power, glyph, entityId: links[id] };
    label.allow(shownView === 'outside' || entry.floorId === shownView);
    bubbles.push(b);
    byEntry.set(entry, b);
    draw(b);
  }
  for (const entry of objects.values()) make(entry);
  store.subscribe((entityId) => {
    for (const b of bubbles) if (b.power || b.entityId === entityId) draw(b);
  });
  return {
    // with a floor open, only that floor's bubbles show; in the whole-house view all of them do
    showFloor(view) {
      shownView = view;
      for (const b of bubbles) b.label.allow(view === 'outside' || b.entry.floorId === view);
      for (const e of objects.values()) e.climate?.label.allow(view === 'outside' || e.floorId === view);
    },
    // does the object have a bubble right now? (a linked heater's own temperature bubble counts)
    has: (entry) => byEntry.has(entry) || !!entry.climate?.label.sprite.parent,
    // would it have one if the user had not touched it?
    byDefault(entry) {
      const kept = entry.def.bubble;
      delete entry.def.bubble;
      const power = POWER_MODELS.includes(entry.def.model), id = entry.def.id;
      const yes = power || !!deviceIcon(entry, links[id]);
      if (kept !== undefined) entry.def.bubble = kept;
      return yes;
    },
    set(entry, on) {
      const b = byEntry.get(entry);
      if (!on) {
        if (b) {
          b.label.sprite.removeFromParent();
          bubbles.splice(bubbles.indexOf(b), 1);
          byEntry.delete(entry);
        }
        entry.climate?.label.sprite.removeFromParent();
      } else if (entry.climate && links[entry.def.id]) entry.object3d.add(entry.climate.label.sprite);
      else make(entry);
    },
  };
}

export function attachBehaviors(objects, links, store, context = null) {
  world = context;
  const active = [];
  const byEntity = new Map();
  for (const [id, entry] of objects) {
    const kind = kinds[entry.def.kind];
    if (!kind) continue;
    entry.kind = kind;
    entry.entityId = links[id];
    kind.setup(entry);
    active.push(entry);
    if (entry.entityId) byEntity.set(entry.entityId, entry);
    kind.apply(entry, entry.entityId ? store.get(entry.entityId) : undefined);
  }
  const bubbles = attachBubbles(objects, links, store);
  store.subscribe((entityId, state) => {
    const entry = byEntity.get(entityId);
    if (entry) entry.kind.apply(entry, state);
  });
  const streetlights = active.filter((e) => e.kind === kinds.streetlight);
  const dusk = (sun) => {
    const dark = sun?.state === 'below_horizon' || (sun?.attributes?.elevation ?? 90) < 3;
    for (const e of streetlights) e.light.target = dark ? 1 : 0;
  };
  dusk(store.get(links._sun));
  store.subscribe((id, state) => id === links._sun && dusk(state));
  return {
    bubbles,
    update(dt) {
      for (const e of active) e.kind.update?.(e, dt);
      updateLampPool(context?.scene, context?.focus);
    },
  };
}
