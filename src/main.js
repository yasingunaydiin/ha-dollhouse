import * as THREE from 'three';
import { parse } from 'yaml';
import './style.css';
import './models/defaults.js';
import { createScene } from './scene.js';
import { buildHouse } from './house/builder.js';
import { Store } from './state/store.js';
import { SimSource } from './state/sim.js';
import { HaSource } from './state/ha.js';
import { attachBehaviors } from './behaviors.js';
import { createEditor } from './editor.js';
import { createClimateDialog } from './dialogs/climate.js';
import { createCameraDialog } from './dialogs/camera.js';
import { createPlanner } from './planner.js';

const loadYaml = async (path) => parse(await (await fetch(path)).text());

const [house, links] = await Promise.all([
  loadYaml('/house/house.yaml'),
  loadYaml('/house/links.yaml'),
]);
const linked = new Set(Object.values(links));
const query = new URLSearchParams(location.search);

const world = createScene(document.getElementById('app'), house.view, house.frontBearing);
const built = await buildHouse(house);
world.scene.add(built.root);

const store = new Store();
const behaviors = attachBehaviors(built.objects, links, store, { house, built });

// --- UI
const toast = document.getElementById('toast');
const modeButton = document.getElementById('mode');
const dayNight = document.getElementById('daynight');
let toastTimer;
function say(text) {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}
store.subscribe((id, s) => {
  if (!store.bulk && linked.has(id) && id !== links._sun) say(`${s?.attributes?.friendly_name ?? id} → ${s?.state ?? 'gone'}`);
});
document.getElementById('title').textContent = house.name;

// --- edit mode: move, rotate, remove and add objects
const editor = createEditor({ world, built, house, container: document.getElementById('app'), say });
const editButton = document.getElementById('edit');
editButton.addEventListener('click', () => {
  editor.setEnabled(!editor.enabled);
  editButton.classList.toggle('active', editor.enabled);
});

// --- floor-plan editor: walls, doors, windows and furniture in 2D
const planner = createPlanner({ house, say });
document.getElementById('plan').addEventListener('click', () => {
  editor.setEnabled(false);
  editButton.classList.remove('active');
  planner.open(built.view === 'outside' ? lastFloor : built.view);
});

// --- views: outside, or one floor cut open
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const canvas = world.renderer.domElement;
const viewBar = document.getElementById('views');
// Zooming drives the view too: zoom in on the closed house and it opens the
// floor under the pointer; zoom all the way out and the whole house comes back.
const ZOOM_OUTSIDE = 0.85; // below this: whole house
const ZOOM_FLOOR = 1.15;   // above this: one floor
const realFloors = built.floors.filter((f) => !f.outsideOnly);
let lastFloor = realFloors[0].id;
let prevZoom = 1;
let lastPointer = null;

function showView(id, { fromZoom = false } = {}) {
  world.lookAtHeight(built.setView(id));
  if (built.view !== 'outside') lastFloor = built.view;
  if (!fromZoom) {
    // keep the zoom level consistent with a view picked from the bar
    const zoom = world.camera.zoom;
    world.zoomTo(built.view === 'outside' ? Math.min(zoom, 0.8) : Math.max(zoom, 1.2));
  }
  for (const b of viewBar.querySelectorAll('[data-view]')) b.classList.toggle('active', b.dataset.view === built.view);
  localStorage.setItem('twin.view', built.view);
}

function floorUnderPointer() {
  if (!lastPointer) return lastFloor;
  raycaster.setFromCamera(lastPointer, world.camera);
  const hit = raycaster.intersectObject(built.root, true).find((h) => {
    for (let p = h.object; p; p = p.parent) if (!p.visible) return false;
    return true;
  });
  if (!hit) return lastFloor;
  const level = Math.floor((hit.point.y + 0.35) / house.floorHeight);
  return realFloors[Math.max(0, Math.min(realFloors.length - 1, level))].id;
}

function updateZoomView() {
  const zoom = world.camera.zoom;
  if (zoom < ZOOM_OUTSIDE && prevZoom >= ZOOM_OUTSIDE && built.view !== 'outside') {
    showView('outside', { fromZoom: true });
  } else if (zoom > ZOOM_FLOOR && prevZoom <= ZOOM_FLOOR && built.view === 'outside') {
    showView(floorUnderPointer(), { fromZoom: true });
  }
  prevZoom = zoom;
}
// floor picker: "All floors" plus one card per floor (top floor first), each
// with a small render of that floor
const allButton = document.createElement('button');
allButton.className = 'all';
allButton.dataset.view = 'outside';
allButton.innerHTML =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 11l8-7 8 7v9H4z"/></svg><span>All floors</span>';
viewBar.appendChild(allButton);
for (const f of [...realFloors].reverse()) {
  const b = document.createElement('button');
  b.className = 'card';
  b.dataset.view = f.id;
  const img = document.createElement('img');
  img.alt = '';
  img.src = world.snapshot(320, 220, 13, () => {
    const y = built.setView(f.id);
    built.settle(world.cameraDir);
    return y;
  });
  const label = document.createElement('span');
  label.textContent = f.name;
  b.append(img, label);
  viewBar.appendChild(b);
}
viewBar.addEventListener('click', (e) => {
  const b = e.target.closest('[data-view]');
  if (b) showView(b.dataset.view);
});
const panel = document.getElementById('floors');
const collapse = document.getElementById('collapse');
function setCollapsed(c) {
  panel.classList.toggle('collapsed', c);
  collapse.textContent = c ? '▸' : '◂';
  localStorage.setItem('twin.floorsCollapsed', c ? '1' : '');
}
collapse.addEventListener('click', () => setCollapsed(!panel.classList.contains('collapsed')));
setCollapsed(!!localStorage.getItem('twin.floorsCollapsed'));

showView(query.get('view') ?? localStorage.getItem('twin.view') ?? house.view.default);
// no animation on first load
built.settle(world.cameraDir);
world.lookAtHeight(built.setView(built.view), true);

// --- sources: the real house (through the gateway) or a simulation of it
const sim = new SimSource(store, links);
const ha = new HaSource(store, (s) => {
  if (source === ha) modeButton.textContent = s.connected ? (!s.readOnly ? 'Real' : s.control?.length ? `Real · ${s.control.join(', ')} control` : 'Real · look-only') : 'Real · offline';
});
let source = null;

async function useSource(next) {
  source?.stop();
  source = next;
  try {
    await next.start();
  } catch (err) {
    if (next === sim) throw err;
    say(`${err.message}. Showing the simulation.`);
    return useSource(sim);
  }
  modeButton.classList.toggle('real', source === ha);
  if (source === sim) modeButton.textContent = 'Simulated';
  dayNight.hidden = source !== sim;
  localStorage.setItem('twin.mode', source.mode);
}

modeButton.addEventListener('click', () => useSource(source === ha ? sim : ha));
// simulated mode: a time-of-day slider moves a made-up sun across the sky
const sunSlider = dayNight.querySelector('input');
const sunClock = dayNight.querySelector('output');
function simulateSun(hours) {
  const elevation = 55 * Math.sin(((hours - 6) / 12) * Math.PI);
  const azimuth = (hours / 24) * 360; // south at noon
  store.set(links._sun, elevation > 0 ? 'above_horizon' : 'below_horizon', { elevation, azimuth, friendly_name: 'Sun' });
}
sunSlider.addEventListener('input', () => {
  const h = +sunSlider.value;
  sunClock.textContent = `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
  simulateSun(h);
});

// --- scene-level binding: the sun entity drives day / night
function applySun() {
  const s = store.get(links._sun);
  const below = s?.state === 'below_horizon';
  // fall back to a fixed day / night sun if the entity has no position
  world.setSun({
    elevation: s?.attributes?.elevation ?? (below ? -40 : 40),
    azimuth: s?.attributes?.azimuth ?? (house.frontBearing ?? 180) - 35,
  });
}
store.subscribe((id) => id === links._sun && applySun());

// --- loop
const clock = new THREE.Clock();
world.renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  updateZoomView();
  built.update(world.cameraDir, dt);
  behaviors.update(dt);
  editor.update();
  world.update(dt);
});

const wanted = query.get('mode') ?? localStorage.getItem('twin.mode') ?? 'real';
await useSource(wanted === 'simulated' || query.has('demo') ? sim : ha);

// ?demo=night starts the simulation at night with every light on
if (query.get('demo') === 'night') {
  for (const id of linked) {
    if (id.startsWith('light.')) sim.setState(id, 'on');
    if (id.startsWith('sun.')) simulateSun(23);
  }
}
applySun();

// --- control windows
function roomOf(entry) {
  const floor = house.floors.find((f) => f.id === entry.floorId);
  const { x, z } = entry.object3d.position;
  return floor?.rooms.find(({ rect: [rx, rz, w, d] }) => x >= rx && x <= rx + w && z >= rz && z <= rz + d)?.name;
}
const dialogs = {
  climate: createClimateDialog({ store, getSource: () => source, say, roomOf }),
  camera: createCameraDialog({ store, getSource: () => source, roomOf }),
};

// --- picking: click an object that has a behaviour

function pick(event) {
  const r = canvas.getBoundingClientRect();
  pointer.set(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, world.camera);
  for (const hit of raycaster.intersectObject(built.root, true)) {
    let o = hit.object, shown = true;
    for (let p = o; p; p = p.parent) shown &&= p.visible;
    if (!shown) continue;
    while (o && !o.userData.objectId) o = o.parent;
    const entry = o && built.objects.get(o.userData.objectId);
    return (entry?.kind?.click || entry?.kind?.dialog) && entry.entityId ? entry : null;
  }
  return null;
}

// The floor a click landed on: the floor that the clicked wall, slab or piece
// of furniture belongs to (the roof counts as the top floor). A click next to
// the house lands on nothing and gives 'outside', the whole house closed up.
function floorAt(event) {
  const r = canvas.getBoundingClientRect();
  pointer.set(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, world.camera);
  for (const hit of raycaster.intersectObject(built.root, true)) {
    let shown = true, floor = null;
    for (let p = hit.object; p; p = p.parent) {
      shown &&= p.visible;
      floor ??= built.floors.find((f) => f.group === p);
    }
    if (!shown || !floor) continue;
    return (floor.outsideOnly ? realFloors[realFloors.length - 1] : floor).id;
  }
  return 'outside';
}

let downAt = null;
canvas.addEventListener('pointerdown', (e) => (downAt = [e.clientX, e.clientY]));
canvas.addEventListener('pointerup', (e) => {
  if (editor.enabled) return;
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
  const entry = pick(e);
  if (!entry) return showView(floorAt(e));
  if (!store.get(entry.entityId)) return say(`${entry.entityId} doesn't exist in Home Assistant`);
  if (entry.kind.dialog) return dialogs[entry.kind.dialog].open(entry);
  entry.kind.click(entry, source, store.get(entry.entityId)).catch((err) => say(err.message));
});
canvas.addEventListener('pointermove', (e) => {
  const r = canvas.getBoundingClientRect();
  lastPointer = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  if (!editor.enabled) canvas.style.cursor = pick(e) ? 'pointer' : 'grab';
});

// handy for debugging from the console
window.twin = { house, links, store, sim, ha, built, world };
