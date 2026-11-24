// Edit mode: select, drag, rotate, delete and add objects. Every change is
// saved straight into the house file (data/house.yaml) through the server, and can be undone
// (Ctrl/Cmd+Z) and redone (Ctrl/Cmd+Shift+Z or Ctrl+Y) until the page reloads.
import * as THREE from 'three';
import { listModels } from './models/registry.js';
import { saveEdit } from './house-file.js';

const SNAP = 0.05; // metres
const ROT_STEP = 45; // degrees

export function createEditor({ world, built, house, container, say, bubbles }) {
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
      await saveEdit(edit);
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
    fill();
  }

  // ── the number fields: turn, raise, and size in metres
  const fields = Object.fromEntries([...panel.querySelectorAll('.fields input')].map((i) => [i.dataset.f, i]));
  const resetSize = panel.querySelector('.reset-size');
  // ── the icon bubble: shown on electronic devices by default, and the user can hide or add it
  const bubbleBox = panel.querySelector('.bubble');
  function setBubble(entry, flag) {
    // flag: true, false, or undefined for "the default"
    if (flag === undefined) delete entry.def.bubble;
    else entry.def.bubble = flag;
    bubbles.set(entry, flag ?? bubbles.byDefault(entry));
    save({ op: 'set', floor: entry.floorId, id: entry.def.id, key: 'bubble', value: flag ?? null });
    if (entry === selected) fill();
  }
  bubbleBox.addEventListener('change', () => {
    if (!selected) return;
    const entry = selected, before = entry.def.bubble, on = bubbleBox.checked;
    const after = on === bubbles.byDefault(entry) ? undefined : on;
    setBubble(entry, after);
    record({ label: `${on ? 'show' : 'hide'} icon on ${entry.def.id}`, undo: () => setBubble(entry, before), redo: () => setBubble(entry, after) });
  });
  const stretchOf = (entry) => entry.def.stretch ?? [1, 1, 1];
  // the object's size as it stands now, measured along its own width / height / depth
  function sizeNow(entry) {
    const o = entry.object3d, turn = o.rotation.y;
    o.rotation.y = 0;
    o.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
    o.rotation.y = turn;
    o.updateMatrixWorld(true);
    return [size.x, size.y, size.z];
  }
  function fill() {
    if (!selected) return;
    const [w, h, d] = sizeNow(selected), r2 = (n) => +n.toFixed(2);
    fields.rot.value = selected.def.rot ?? 0;
    fields.y.value = r2(selected.object3d.position.y);
    fields.w.value = r2(w);
    fields.h.value = r2(h);
    fields.d.value = r2(d);
    resetSize.hidden = !selected.def.stretch;
    bubbleBox.checked = bubbles.has(selected);
  }
  function editField(key) {
    if (!selected) return;
    const value = parseFloat(fields[key].value.replace(',', '.'));
    if (!Number.isFinite(value)) return fill();
    const entry = selected, before = poseOf(entry), pose = poseOf(entry);
    if (key === 'rot') pose.rot = ((value + 180) % 360 + 360) % 360 - 180;
    else if (key === 'y') {
      const p = entry.object3d.position;
      pose.at = [p.x, Math.max(0, value), p.z];
    } else {
      const axis = { w: 0, h: 1, d: 2 }[key], now = sizeNow(entry)[axis];
      if (value <= 0 || now <= 0) return fill();
      pose.stretch = [...stretchOf(entry)];
      pose.stretch[axis] = Math.round(((pose.stretch[axis] * value) / now) * 1e4) / 1e4;
    }
    setPose(entry.def.id, pose);
    recordPose(entry, before, key === 'rot' ? 'turn' : key === 'y' ? 'raise' : 'resize');
  }
  for (const key of Object.keys(fields)) fields[key].addEventListener('change', () => editField(key));
  resetSize.addEventListener('click', () => {
    if (!selected) return;
    const entry = selected, before = poseOf(entry);
    setPose(entry.def.id, { ...before, stretch: null });
    recordPose(entry, before, 'resize');
  });

  // ── undo / redo: each step knows how to reverse itself and how to redo itself
  const history = [];
  const future = [];
  const undoButton = panel.querySelector('.undo');
  const redoButton = panel.querySelector('.redo');
  function refreshHistory() {
    undoButton.disabled = !history.length;
    redoButton.disabled = !future.length;
  }
  function record(step) {
    history.push(step);
    if (history.length > 100) history.shift();
    future.length = 0;
    refreshHistory();
  }
  let stepping = Promise.resolve(); // one step at a time, in order
  function step(from, to, run, word) {
    stepping = stepping.then(async () => {
      const s = from.pop();
      if (!s) return;
      await s[run]();
      to.push(s);
      refreshHistory();
      say(`${word}: ${s.label}`);
    });
  }
  const undo = () => step(history, future, 'undo', 'Undid');
  const redo = () => step(future, history, 'redo', 'Redid');

  const poseOf = (entry) => ({ at: [...entry.def.at], rot: entry.def.rot ?? 0, stretch: entry.def.stretch ? [...entry.def.stretch] : null });
  const samePose = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function setPose(id, pose) {
    const entry = built.objects.get(id);
    if (!entry) return;
    const [x, y, z] = pose.at.length === 3 ? pose.at : [pose.at[0], 0, pose.at[1]];
    entry.object3d.position.set(x, y, z);
    entry.def.rot = pose.rot;
    entry.object3d.rotation.y = THREE.MathUtils.degToRad(pose.rot);
    // scale = the model's own scale times the stretch; swap the old stretch for the new one
    const prev = stretchOf(entry), next = pose.stretch?.some((k) => Math.abs(k - 1) > 1e-3) ? pose.stretch : null;
    const s = entry.object3d.scale;
    s.set((s.x / prev[0]) * (next?.[0] ?? 1), (s.y / prev[1]) * (next?.[1] ?? 1), (s.z / prev[2]) * (next?.[2] ?? 1));
    if (next) entry.def.stretch = [...next];
    else delete entry.def.stretch;
    saveMove(entry);
    select(entry);
  }
  // remember a move or turn that just happened, so it can be reversed
  function recordPose(entry, before, label) {
    const id = entry.def.id, after = poseOf(entry);
    if (samePose(before, after)) return;
    record({ label: `${label} ${id}`, undo: () => setPose(id, before), redo: () => setPose(id, after) });
  }

  function takeOut(id) {
    const entry = built.objects.get(id);
    if (!entry) return;
    if (selected === entry) select(null);
    built.removeObject(id);
    const list = house.floors.find((f) => f.id === entry.floorId)?.objects ?? [];
    if (list.includes(entry.def)) list.splice(list.indexOf(entry.def), 1);
    save({ op: 'remove', floor: entry.floorId, id });
  }
  async function putBack(floorId, def) {
    if (built.objects.has(def.id)) return;
    (house.floors.find((f) => f.id === floorId).objects ??= []).push(def);
    select(await built.addObject(floorId, def));
    save({ op: 'add', floor: floorId, id: def.id, def });
  }

  function saveMove(entry) {
    const p = entry.object3d.position;
    const r = (n) => Math.round(n * 100) / 100;
    entry.def.at = r(p.y) ? [r(p.x), r(p.y), r(p.z)] : [r(p.x), r(p.z)];
    save({ op: 'move', floor: entry.floorId, id: entry.def.id, at: entry.def.at, rot: entry.def.rot ?? 0, stretch: entry.def.stretch ?? null });
    if (entry === selected) fill();
  }

  function rotate(dir) {
    if (!selected) return;
    const before = poseOf(selected);
    selected.def.rot = (((selected.def.rot ?? 0) + dir * ROT_STEP + 180) % 360 + 360) % 360 - 180;
    selected.object3d.rotation.y = THREE.MathUtils.degToRad(selected.def.rot);
    saveMove(selected);
    recordPose(selected, before, 'turn');
  }

  function remove() {
    if (!selected) return;
    const { def, floorId } = selected;
    takeOut(def.id);
    record({ label: `remove ${def.id}`, undo: () => putBack(floorId, def), redo: () => takeOut(def.id) });
    say(`Removed ${def.id}`);
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
    record({ label: `add ${def.id}`, undo: () => takeOut(def.id), redo: () => putBack(floor.id, def) });
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
    drag = { entry, dx: entry.object3d.position.x - p.x, dz: entry.object3d.position.z - p.z, x: e.clientX, y: e.clientY, moved: false, before: poseOf(entry) };
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
    if (drag.moved) {
      saveMove(drag.entry);
      recordPose(drag.entry, drag.before, 'move');
    }
    drag = null;
  });

  window.addEventListener('keydown', (e) => {
    if (!document.getElementById('planner').hidden) return;
    if (!enabled || e.target.matches('input, select, textarea')) return;
    const z = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z';
    if (z || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')) (z && !e.shiftKey ? undo : redo)();
    else if (e.ctrlKey || e.metaKey || e.altKey) return;
    else if (e.key === 'r' || e.key === 'R') rotate(e.shiftKey ? -1 : 1);
    else if (e.key === 'Delete' || e.key === 'Backspace') remove();
    else if (e.key === 'Escape') select(null);
    else return;
    e.preventDefault();
  });

  panel.querySelector('.rot-left').addEventListener('click', () => rotate(1));
  panel.querySelector('.rot-right').addEventListener('click', () => rotate(-1));
  panel.querySelector('.delete').addEventListener('click', remove);
  panel.querySelector('.add').addEventListener('click', add);
  undoButton.addEventListener('click', undo);
  redoButton.addEventListener('click', redo);
  refreshHistory();

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
