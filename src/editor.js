// Edit mode: select, drag, rotate, delete and add objects. Every change is
// saved straight into house.yaml through the dev server.
import * as THREE from 'three';
import { listModels } from './models/registry.js';

const SNAP = 0.05; // metres
const ROT_STEP = 45; // degrees

export function createEditor({ world, built, house, container, say }) {
  const canvas = world.renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane();
  const hitPoint = new THREE.Vector3();
  const panel = document.getElementById('editor');
  const nameEl = panel.querySelector('.name');
  const modelSelect = panel.querySelector('select');
  const selection = new THREE.BoxHelper(new THREE.Object3D(), '#1f9fd0');
  selection.visible = false;
  world.scene.add(selection);

  let enabled = false;
  let selected = null; // entry from built.objects
  let drag = null;

  for (const m of listModels().sort()) modelSelect.add(new Option(m.replaceAll('_', ' '), m));

  async function save(edit) {
    try {
      const res = await fetch('/api/house/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edit),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } catch (err) {
      say(`Not saved: ${err.message}`);
    }
  }

  const ndc = (e) => {
    const r = canvas.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };

  function pick(e) {
    raycaster.setFromCamera(ndc(e), world.camera);
    for (const hit of raycaster.intersectObject(built.root, true)) {
      let o = hit.object, shown = true;
      for (let p = o; p; p = p.parent) shown &&= p.visible;
      if (!shown) continue;
      while (o && !o.userData.objectId) o = o.parent;
      if (o) return built.objects.get(o.userData.objectId);
    }
    return null;
  }

  // where the pointer hits the floor the object stands on, in house coordinates
  function floorPoint(e, entry) {
    const floor = built.floors.find((f) => f.id === entry.floorId);
    plane.set(new THREE.Vector3(0, 1, 0), -(floor.group.position.y + entry.object3d.position.y));
    raycaster.setFromCamera(ndc(e), world.camera);
    if (!raycaster.ray.intersectPlane(plane, hitPoint)) return null;
    return hitPoint.clone().sub(built.root.position);
  }

  function select(entry) {
    selected = entry;
    selection.visible = !!entry;
    if (entry) selection.setFromObject(entry.object3d);
    nameEl.textContent = entry ? entry.def.id : 'Click an object to select it';
    panel.classList.toggle('has-selection', !!entry);
  }

  function saveMove(entry) {
    const p = entry.object3d.position;
    const r = (n) => Math.round(n * 100) / 100;
    entry.def.at = entry.def.at.length === 3 ? [r(p.x), r(p.y), r(p.z)] : [r(p.x), r(p.z)];
    save({ op: 'move', floor: entry.floorId, id: entry.def.id, at: entry.def.at, rot: entry.def.rot ?? 0 });
  }

  function rotate(dir) {
    if (!selected) return;
    selected.def.rot = (((selected.def.rot ?? 0) + dir * ROT_STEP + 180) % 360 + 360) % 360 - 180;
    selected.object3d.rotation.y = THREE.MathUtils.degToRad(selected.def.rot);
    saveMove(selected);
  }

  function remove() {
    if (!selected) return;
    const entry = selected;
    select(null);
    built.removeObject(entry.def.id);
    const list = house.floors.find((f) => f.id === entry.floorId)?.objects ?? [];
    if (list.includes(entry.def)) list.splice(list.indexOf(entry.def), 1);
    save({ op: 'remove', floor: entry.floorId, id: entry.def.id });
    say(`Removed ${entry.def.id}`);
  }

  async function add() {
    const model = modelSelect.value;
    const floor = built.floors.find((f) => f.id === built.view) ?? built.floors[0];
    let n = 1;
    while (built.objects.has(`${model}_${n}`)) n++;
    // drop it where the camera is looking
    const p = world.controls.target.clone().sub(built.root.position);
    const snap = (v) => Math.round(v / SNAP) * SNAP;
    const def = { id: `${model}_${n}`, model, at: [+snap(p.x).toFixed(2), +snap(p.z).toFixed(2)] };
    (house.floors.find((f) => f.id === floor.id).objects ??= []).push(def);
    select(await built.addObject(floor.id, def));
    save({ op: 'add', floor: floor.id, id: def.id, def });
    say(`Added ${def.id} — drag it into place`);
  }

  // Listen on the container in the capture phase so we can stop the camera
  // from orbiting before OrbitControls sees the event.
  container.addEventListener('pointerdown', (e) => {
    if (!enabled || e.button !== 0 || e.target !== canvas) return;
    const entry = pick(e);
    if (!entry) return;
    select(entry);
    const p = floorPoint(e, entry);
    if (!p) return;
    world.controls.enabled = false;
    drag = { entry, dx: entry.object3d.position.x - p.x, dz: entry.object3d.position.z - p.z, x: e.clientX, y: e.clientY, moved: false };
  }, true);

  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 4) return;
    drag.moved = true;
    const p = floorPoint(e, drag.entry);
    if (!p) return;
    const snap = (v) => Math.round(v / SNAP) * SNAP;
    drag.entry.object3d.position.x = snap(p.x + drag.dx);
    drag.entry.object3d.position.z = snap(p.z + drag.dz);
  });

  window.addEventListener('pointerup', () => {
    if (!drag) return;
    world.controls.enabled = true;
    if (drag.moved) saveMove(drag.entry);
    drag = null;
  });

  window.addEventListener('keydown', (e) => {
    if (!document.getElementById('planner').hidden) return;
    if (!enabled || e.target.matches('input, select, textarea')) return;
    if (e.key === 'r' || e.key === 'R') rotate(e.shiftKey ? -1 : 1);
    else if (e.key === 'Delete' || e.key === 'Backspace') remove();
    else if (e.key === 'Escape') select(null);
    else return;
    e.preventDefault();
  });

  panel.querySelector('.rot-left').addEventListener('click', () => rotate(1));
  panel.querySelector('.rot-right').addEventListener('click', () => rotate(-1));
  panel.querySelector('.delete').addEventListener('click', remove);
  panel.querySelector('.add').addEventListener('click', add);

  return {
    get enabled() { return enabled; },
    setEnabled(on) {
      enabled = on;
      panel.hidden = !on;
      if (!on) select(null);
      else select(null);
      canvas.style.cursor = on ? 'default' : 'grab';
    },
    update() {
      if (selected) selection.update();
    },
  };
}
