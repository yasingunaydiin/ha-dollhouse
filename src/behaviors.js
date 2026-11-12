// Behaviours ("profiles"): how each kind of object reflects an entity's state,
// and what a click on it does. Add a new kind here to support covers, TVs, etc.
import * as THREE from 'three';

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
  return {
    sprite,
    set(text, warm) {
      const c = canvas.getContext('2d');
      c.clearRect(0, 0, 192, 96);
      sprite.visible = !!text;
      if (!text) return;
      c.fillStyle = warm ? '#ff8a3c' : 'rgba(255, 252, 245, 0.95)';
      c.beginPath();
      c.roundRect(8, 12, 176, 72, 36);
      c.fill();
      c.fillStyle = warm ? '#fff' : '#3a332b';
      c.font = '700 44px ui-rounded, system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(text, 96, 50);
      texture.needsUpdate = true;
    },
  };
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
      const lamp = new THREE.PointLight('#ffc98a', 0, 7, 1.6);
      (anchor ?? entry.object3d).add(lamp);
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
      l.lamp.intensity = l.level * 9;
      for (const g of l.glows) g.material.emissiveIntensity = l.level * 2.2;
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
      const lamp = new THREE.PointLight('#ff8a3c', 0, 3.5, 1.8);
      (anchor ?? entry.object3d).add(lamp);
      const label = makeLabel();
      const size = new THREE.Box3().setFromObject(entry.object3d).getSize(new THREE.Vector3());
      label.sprite.position.y = size.y / entry.object3d.scale.y + 0.3;
      entry.object3d.add(label.sprite);
      entry.climate = { glows, lamp, label, level: 0, target: 0 };
    },
    apply(entry, state) {
      const a = state?.attributes ?? {};
      const heating = ['heat', 'auto'].includes(state?.state) && !['idle', 'off'].includes(a.hvac_action);
      entry.climate.target = heating ? 1 : 0;
      const t = a.current_temperature;
      entry.climate.label.set(t == null ? '' : `${Math.round(t * 10) / 10}°`, heating);
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
  const rooms = (def.rooms ?? []).filter((r) => !r.outdoor).map((r) => r.rect);
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
  store.subscribe((entityId, state) => {
    const entry = byEntity.get(entityId);
    if (entry) entry.kind.apply(entry, state);
  });
  return {
    update(dt) {
      for (const e of active) e.kind.update?.(e, dt);
    },
  };
}
