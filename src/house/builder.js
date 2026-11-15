// Builds the house (floors, walls, objects) from house.yaml data.
import * as THREE from 'three';
import { createModel } from '../models/registry.js';

const STUB_HEIGHT = 0.1;
const FLY = 16; // how far the other floors fly away when one floor is opened (m)
const FRAME = 0.05; // window / door frame bar width

const materials = new Map();
function colored(color, extra) {
  const key = color + JSON.stringify(extra ?? '');
  if (!materials.has(key))
    materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.95, ...extra }));
  return materials.get(key);
}
const glassMat = colored('#bfe0ee', { roughness: 0.1, transparent: true, opacity: 0.35 });

function buildSlabs(floor, cfg, group) {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const room of floor.rooms) {
    const [x, z, w, d] = room.rect;
    // outdoor areas (terrace, garden) sit a little lower and don't count as the house footprint
    const top = room.outdoor ? -0.12 : 0;
    const thick = room.outdoor ? 0.2 : 0.06;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, thick, d), colored(room.floor ?? '#d9cdb8'));
    slab.position.set(x + w / 2, top - thick / 2, z + d / 2);
    slab.receiveShadow = true;
    slab.userData.roomId = room.id;
    group.add(slab);
    if (room.outdoor) continue;
    minX = Math.min(minX, x); minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x + w); maxZ = Math.max(maxZ, z + d);
  }
  if (minX === Infinity) {
    // no indoor rooms (an empty lot): centre on whatever ground there is, no house base
    const b = { minX: 0, minZ: 0, maxX: 0, maxZ: 0 };
    for (const { rect: [x, z, w, d] } of floor.rooms) {
      b.minX = Math.min(b.minX, x); b.minZ = Math.min(b.minZ, z);
      b.maxX = Math.max(b.maxX, x + w); b.maxZ = Math.max(b.maxZ, z + d);
    }
    return b;
  }
  const t = cfg.exteriorThickness;
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(maxX - minX + t, 0.28, maxZ - minZ + t),
    colored(floor.slabColor ?? '#d8cbb8')
  );
  base.position.set((minX + maxX) / 2, -0.2, (minZ + maxZ) / 2);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  return { minX, minZ, maxX, maxZ };
}

// Wall options (house.yaml): exterior, color (both faces), outerColor (outside
// face only, exterior walls), paint ({pos, neg}: one colour per face), height, thickness (e.g. for garden fences), openings[].
// Opening options: type window|door, at, width, sill, top, panes (window
// mullions), leaf (door colour), transom (glass above a door); inside doors:
// open (degrees it stands open, default 55), hinge ('end'), flip (other side).
function buildWall(w, cfg, center) {
  const [ax, az] = w.from;
  const [bx, bz] = w.to;
  const dx = bx - ax, dz = bz - az;
  const len = Math.hypot(dx, dz);
  const t = w.thickness ?? (w.exterior ? cfg.exteriorThickness : cfg.interiorThickness);
  const h = w.height ?? (w.exterior ? cfg.height : Math.min(cfg.interiorHeight ?? cfg.height, cfg.height));
  const wallMat = colored(w.color ?? cfg.color);
  const frameMat = colored(cfg.frameColor ?? '#f6f4ef');

  const g = new THREE.Group();
  g.position.set(ax, 0, az);
  const angle = -Math.atan2(dz, dx);
  g.rotation.y = angle;
  const full = new THREE.Group();
  g.add(full);

  // which way is "outside" (exterior walls only)
  const normal = new THREE.Vector3(-dz, 0, dx).normalize();
  const mid = new THREE.Vector3((ax + bx) / 2 - center.x, 0, (az + bz) / 2 - center.z);
  if (normal.dot(mid) < 0) normal.negate();
  const outSign = normal.dot(new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle))) > 0 ? 1 : -1;
  const outer = w.exterior && (w.outerColor ?? cfg.outerColor);
  // skins: a thin coat of colour on one face. paint.pos is the face toward
  // (-dz, dx) of the wall direction, paint.neg the other one; paint beats outerColor.
  const skinMat = outer ? colored(outer) : null; // also used for the slab-edge plinth
  const skins = [];
  const painted = (side) => w.paint?.[side];
  if (outer && !painted(outSign > 0 ? 'pos' : 'neg')) skins.push({ mat: skinMat, sign: outSign });
  for (const [side, sign] of [['pos', 1], ['neg', -1]]) if (painted(side)) skins.push({ mat: colored(painted(side)), sign });

  const seg = (x0, x1, y0, y1, material = wallMat, depth = t, parent = full) => {
    if (x1 - x0 < 1e-3 || y1 - y0 < 1e-3) return;
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, depth), material);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
    m.castShadow = material !== glassMat;
    m.receiveShadow = true;
    parent.add(m);
    if (material === wallMat && parent === full) {
      for (const { mat, sign } of skins) {
        const skin = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.02), mat);
        skin.position.set((x0 + x1) / 2, (y0 + y1) / 2, sign * (t / 2 + 0.01));
        skin.receiveShadow = true;
        parent.add(skin);
      }
    }
  };
  const bar = (x0, x1, y0, y1) => seg(x0, x1, y0, y1, frameMat, t + 0.04);

  const openings = [...(w.openings ?? [])].sort((a, b) => a.at - b.at);
  // The solid wall is cut into columns at every opening edge, so openings may
  // overlap sideways and sit on top of each other (a transom window above a window).
  const voidOf = (o) => {
    const door = o.type === 'door', top = Math.min(o.top ?? 2.1, h);
    const glassTop = door && o.transom && h - top > 0.4 ? h - 0.2 : top;
    return { x0: o.at, x1: o.at + o.width, y0: door ? 0 : Math.min(o.sill ?? 0.9, top), y1: glassTop };
  };
  const voids = openings.map(voidOf);
  const xs = [...new Set([-t / 2, len + t / 2, ...voids.flatMap((v) => [v.x0, v.x1])].map((x) => Math.min(len + t / 2, Math.max(-t / 2, x))))].sort((a, b) => a - b);
  for (let k = 0; k + 1 < xs.length; k++) {
    const a = xs[k], b = xs[k + 1];
    if (b - a < 1e-3) continue;
    let y = 0;
    for (const v of voids.filter((v) => v.x0 <= a + 1e-6 && v.x1 >= b - 1e-6).sort((p, q) => p.y0 - q.y0)) {
      if (v.y0 > y) seg(a, b, y, v.y0);
      y = Math.max(y, v.y1);
    }
    if (y < h) seg(a, b, y, h);
  }
  for (const o of openings) {
    const x0 = o.at, x1 = o.at + o.width;
    const door = o.type === 'door';
    const sill = door ? 0 : o.sill ?? 0.9;
    const top = Math.min(o.top ?? 2.1, h);
    if (door && o.transom && h - top > 0.4) {
      seg(x0, x1, top, h - 0.2, glassMat, 0.03);
      bar(x0, x1, h - 0.2 - FRAME, h - 0.2);
    }

    if (top > sill && w.exterior) {
      // frame
      bar(x0, x0 + FRAME, sill, top);
      bar(x1 - FRAME, x1, sill, top);
      bar(x0, x1, top - FRAME, top);
      if (!door) bar(x0, x1, sill, sill + FRAME);
    }
    if (!door && top > sill) {
      seg(x0, x1, sill, top, glassMat, 0.03);
      const panes = o.panes ?? 1;
      for (let i = 1; i < panes; i++) {
        const x = x0 + (i * o.width) / panes;
        bar(x - FRAME / 2, x + FRAME / 2, sill, top);
      }
    }
    if (door && o.leaf && w.exterior) seg(x0 + FRAME, x1 - FRAME, 0, top - FRAME, colored(o.leaf), 0.05);
    else if (door && !w.exterior) {
      // Inside doors stand half open, hinged at the start of the opening and
      // swinging to the side the plan editor draws. `open` (degrees) and
      // `leaf` (colour) can be set per door; open: 0 closes it.
      const leafH = Math.min(top, h);
      const leaf = new THREE.Mesh(
        new THREE.BoxGeometry(o.width - 0.04, leafH, 0.04),
        colored(o.leaf ?? cfg.doorColor ?? DOOR_WHITE)
      );
      addLever(leaf, o.width, leafH, o.hinge === 'end' ? -1 : 1);
      // hinge: 'end' hangs it on the far side of the opening; flip: true makes
      // it swing to the other side of the wall
      const dir = o.hinge === 'end' ? -1 : 1;
      leaf.position.set(dir * ((o.width - 0.04) / 2 + 0.02), leafH / 2, 0);
      leaf.castShadow = leaf.receiveShadow = true;
      const hinge = new THREE.Group();
      hinge.position.set(dir === 1 ? x0 : x1, 0, 0);
      hinge.rotation.y = -dir * (o.flip ? -1 : 1) * THREE.MathUtils.degToRad(o.open ?? 55);
      hinge.add(leaf);
      full.add(hinge);
    }
  }

  if (skinMat) {
    // The outside finish also covers the edge of the floor slab underneath.
    // It's separate from the wall so it stays put when the wall sinks.
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(len + t, 0.34 + STUB_HEIGHT, 0.02), skinMat);
    plinth.position.set(len / 2, (STUB_HEIGHT - 0.34) / 2, outSign * (t / 2 + 0.01));
    g.add(plinth);
  }

  if (w.exterior) {
    // Exterior walls facing the camera drop to a low stub so you can see inside.
    // (animated: the wall sinks rather than popping)
    g.userData.cutaway = { full, normal, min: STUB_HEIGHT / h, level: 1, target: 1 };
  }
  return g;
}

// Flat white door leaves get a grey lever handle on both faces, on the free edge.
const DOOR_WHITE = '#f3f0e8';
const LEVER = new THREE.MeshStandardMaterial({ color: '#8c9094', metalness: 0.7, roughness: 0.3 });
function addLever(leaf, width, leafH, dir) {
  const free = dir * ((width - 0.04) / 2 - 0.07), y = 1.0 - leafH / 2;
  for (const side of [1, -1]) {
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.008, 16), LEVER);
    rose.rotation.x = Math.PI / 2;
    rose.position.set(free, y, side * 0.024);
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.03), LEVER);
    stem.position.set(free, y, side * 0.035);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.018, 0.018), LEVER);
    bar.position.set(free - dir * 0.05, y, side * 0.048);
    leaf.add(rose, stem, bar);
  }
}

async function buildFloor(floor, level, house, objects) {
  const cfg = { ...house.walls, ...floor.walls };
  const group = new THREE.Group();
  group.name = floor.id;
  group.position.y = level * house.floorHeight;

  const bounds = buildSlabs(floor, cfg, group);
  const center = new THREE.Vector3((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2);
  const cutaways = [];
  for (const w of floor.wallList ?? []) {
    const wall = buildWall(w, cfg, center);
    wall.userData.isWall = true;
    if (wall.userData.cutaway) cutaways.push(wall.userData.cutaway);
    group.add(wall);
  }

  const rec = { id: floor.id, name: floor.name, outsideOnly: !!floor.outsideOnly, level, group, cutaways, center, cfg, facade: [] };
  await Promise.all((floor.objects ?? []).map((def) => placeObject(rec, def, objects)));
  return rec;
}

// Create one object from its house.yaml definition and put it on a floor.
// rec.facade collects details that would be in the way when a floor is cut open.
async function placeObject(rec, def, objects) {
  const obj = await createModel(def.model, def.params);
  const [x, y, z] = def.at.length === 3 ? def.at : [def.at[0], 0, def.at[1]];
  obj.position.set(x, y, z);
  obj.rotation.y = THREE.MathUtils.degToRad(def.rot ?? 0);
  // stretch: [width, height, depth] factors set by resizing in the plan editor
  if (def.stretch) obj.scale.multiply(new THREE.Vector3(...def.stretch));
  obj.name = def.id;
  obj.userData.objectId = def.id;
  obj.traverse((o) => {
    if (o.userData.noShadow) o.castShadow = false;
  });
  rec.group.add(obj);
  if (def.outsideOnly) rec.facade.push(obj);
  const entry = { def, object3d: obj, floorId: rec.id };
  objects.set(def.id, entry);
  return entry;
}

export async function buildHouse(house) {
  const root = new THREE.Group();
  root.name = 'house';

  const objects = new Map(); // id -> { def, object3d, floorId }
  const floors = await Promise.all(
    house.floors.map((f, level) => buildFloor(f, level, house, objects))
  );
  for (const f of floors) root.add(f.group);

  // centre the house on the origin
  const c = floors[0].center;
  root.position.set(-c.x, 0, -c.z);

  let view = null;
  let started = false;
  floors.forEach((f) => Object.assign(f, { offset: 0, offsetTarget: 0 }));

  function place(f) {
    f.group.position.y = f.level * house.floorHeight + f.offset;
    f.group.visible = Math.abs(f.offset) < FLY * 0.97;
  }
  // view: a floor id (that floor alone, cut open) or 'outside' (everything, closed up).
  // Returns the height the camera should look at.
  function setView(id) {
    view = floors.some((f) => f.id === id && !f.outsideOnly) ? id : 'outside';
    const shown = floors.find((f) => f.id === view);
    for (const f of floors) {
      // floors above the opened one lift away; the ones below stay, closed up
      f.offsetTarget = shown && f.level > shown.level ? FLY : 0;
      f.open = f === shown;
      for (const o of f.facade) o.visible = !shown || f.level < shown.level;
    }
    if (!started) settle();
    started = true;
    return shown ? shown.level * house.floorHeight + 0.6 : (floors.length * house.floorHeight) / 2 - 1;
  }

  // called every frame: eases floors and walls towards where they should be
  function update(cameraDir, dt) {
    for (const f of floors) {
      if (f.offset !== f.offsetTarget) {
        f.offset = THREE.MathUtils.damp(f.offset, f.offsetTarget, 5, dt);
        if (Math.abs(f.offset - f.offsetTarget) < 0.01) f.offset = f.offsetTarget;
        place(f);
      }
      for (const cut of f.cutaways) {
        cut.target = f.open && cut.normal.dot(cameraDir) > 0.05 ? cut.min : 1;
        if (cut.level === cut.target) continue;
        cut.level = THREE.MathUtils.damp(cut.level, cut.target, 9, dt);
        if (Math.abs(cut.level - cut.target) < 0.002) cut.level = cut.target;
        cut.full.scale.y = cut.level;
      }
    }
  }

  // jump straight to the end of any running animation
  function settle(cameraDir) {
    for (const f of floors) {
      f.offset = f.offsetTarget;
      place(f);
    }
    if (cameraDir) update(cameraDir, 1000);
  }

  async function addObject(floorId, def) {
    const floor = floors.find((f) => f.id === floorId);
    const entry = { ...(await placeObject(floor, def, objects)), level: floor.level };
    if (def.outsideOnly) {
      const shown = floors.find((f) => f.id === view);
      entry.object3d.visible = !shown || entry.level < shown.level;
    }
    return entry;
  }

  function removeObject(id) {
    const entry = objects.get(id);
    if (!entry) return;
    entry.object3d.removeFromParent();
    for (const f of floors) f.facade = f.facade.filter((o) => o !== entry.object3d);
    objects.delete(id);
  }

  // replace all walls of one floor (the plan editor's "3D beside" pane uses this
  // when you move a wall, door or window), keeping the camera and everything else
  function rebuildWalls(floorId, wallList) {
    const f = floors.find((x) => x.id === floorId);
    if (!f) return;
    for (const child of [...f.group.children]) if (child.userData.isWall) child.removeFromParent();
    f.cutaways.length = 0;
    for (const w of wallList ?? []) {
      const wall = buildWall(w, f.cfg, f.center);
      wall.userData.isWall = true;
      if (wall.userData.cutaway) f.cutaways.push(wall.userData.cutaway);
      f.group.add(wall);
    }
  }

  return { root, objects, floors, setView, update, settle, addObject, removeObject, rebuildWalls, get view() { return view; } };
}
