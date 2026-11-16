import * as THREE from 'three';
import { parse } from 'yaml';
import './style.css';
import './models/defaults.js';
import './models/ikea.js';
import './models/tech.js';
import './models/shelf.js';
import './models/decor.js';
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
import { storedHouse, storeHouse, saveLocally } from './house-file.js';
import { createWeather, fetchOpenMeteo, sunPosition, CONDITIONS } from './weather.js';

// Normally the dev/preview server serves your house from data/. On a static host
// (GitHub Pages) there is no server, so fall back to the bundled empty template.
import houseTemplate from '../templates/house.yaml?raw';
import linksTemplate from '../templates/links.yaml?raw';
let staticSite = false;
const texts = {}; // the yaml as loaded, kept for exporting from the static site
async function loadYaml(name, fallback) {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/house/${name}`);
    const text = res.ok ? await res.text() : '';
    if (text && !text.trimStart().startsWith('<')) return parse(text);
  } catch {}
  staticSite = true;
  const mine = storedHouse();
  texts[name] = (name === 'house.yaml' ? mine?.house : mine?.links) ?? fallback;
  return parse(texts[name]);
}

const [house, links] = await Promise.all([
  loadYaml('house.yaml', houseTemplate),
  loadYaml('links.yaml', linksTemplate),
]);
if (staticSite) saveLocally(texts); // edits stay in this browser
const linked = new Set(Object.values(links));
const query = new URLSearchParams(location.search);
const embedded = query.has('embed'); // the planner's "3D beside" pane: just the house, no controls
if (embedded) document.body.classList.add('embed');

const world = createScene(document.getElementById('app'), house.view, house.frontBearing);
const built = await buildHouse(house);
world.scene.add(built.root);

const store = new Store();
const behaviors = attachBehaviors(built.objects, links, store, { house, built, scene: world.scene, focus: world.controls.target });

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

// --- export / import: the whole house (layout, furniture, entity links) as one file
document.getElementById('export').addEventListener('click', () => {
  const a = document.createElement('a');
  if (staticSite) {
    const data = { format: 'house-twin', version: 1, exported: new Date().toISOString(), name: house.name ?? 'Home', house: texts['house.yaml'], links: texts['links.yaml'] };
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `house-twin-${data.exported.slice(0, 10)}.json`;
  } else {
    a.href = '/api/house/export';
    a.download = '';
  }
  a.click();
});
const importFile = document.getElementById('import-file');
document.getElementById('import').addEventListener('click', () => importFile.click());
importFile.addEventListener('change', async () => {
  const file = importFile.files[0];
  importFile.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const floors = (parse(data.house ?? '')?.floors ?? []).length;
    if (!confirm(`Replace the current house with "${data.name ?? file.name}" (${floors} floors)?\n\n${staticSite ? 'It is kept in this browser only.' : 'The current house is kept as a backup on the server.'}`)) return;
    if (staticSite) {
      // no server here: keep the imported house in this browser only
      if (data?.format !== 'house-twin' || typeof data.house !== 'string' || typeof data.links !== 'string') throw new Error('this is not a House Twin export file');
      if (!Array.isArray(parse(data.house)?.floors)) throw new Error('the house in this file has no floors');
      storeHouse(data.house, data.links);
    } else {
      const res = await fetch('/api/house/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).error);
    }
    location.reload();
  } catch (err) {
    say(`Not imported: ${err instanceof SyntaxError ? 'this is not a House Twin export file' : err.message}`);
  }
});

// --- floor-plan editor: walls, doors, windows and furniture in 2D
const planner = createPlanner({ house, say });
document.getElementById('plan').addEventListener('click', () => {
  editor.setEnabled(false);
  editButton.classList.remove('active');
  planner.open(built.view === 'outside' ? lastFloor : built.view);
});

// --- "3D beside" pane: the planner sends each saved edit; moving, turning and
// resizing objects is applied in place, anything else reloads this pane
if (embedded) {
  window.addEventListener('message', async (e) => {
    if (e.origin !== location.origin || e.data?.type !== 'twin-sync') return;
    const { floor: id, wallList, objects } = e.data;
    const f = house.floors.find((x) => x.id === id);
    if (!f) return location.reload();
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    if (!same(f.wallList ?? [], wallList)) {
      // walls, doors, windows or paint changed: rebuild just this floor's walls
      built.rebuildWalls(id, wallList);
      built.settle(world.cameraDir);
      f.wallList = wallList;
    }
    const old = new Map((f.objects ?? []).map((o) => [o.id, o]));
    const now = new Map(objects.map((o) => [o.id, o]));
    // objects that are gone, or were swapped for another model / options: remove them
    for (const [oid, o] of old) {
      const n = now.get(oid);
      if (!n || n.model !== o.model || !same(n.params, o.params) || !same(n.kind, o.kind)) built.removeObject(oid);
    }
    // new objects: add them in place
    for (const [oid, n] of now) if (!built.objects.has(oid)) await built.addObject(id, structuredClone(n));
    // everything else: move, turn and resize in place
    for (const def of objects) {
      const entry = built.objects.get(def.id);
      if (!entry) continue;
      const o3 = entry.object3d;
      const [x, y, z] = def.at.length === 3 ? def.at : [def.at[0], 0, def.at[1]];
      o3.position.set(x, y, z);
      o3.rotation.y = THREE.MathUtils.degToRad(def.rot ?? 0);
      // scale = the model's own scale (params.scale) times the plan editor's stretch
      const prev = entry.def.stretch ?? [1, 1, 1], next = def.stretch ?? [1, 1, 1];
      o3.scale.set((o3.scale.x / prev[0]) * next[0], (o3.scale.y / prev[1]) * next[1], (o3.scale.z / prev[2]) * next[2]);
      Object.assign(entry.def, { at: def.at, rot: def.rot, stretch: def.stretch });
      if (def.rot === undefined) delete entry.def.rot;
      if (def.stretch === undefined) delete entry.def.stretch;
    }
    f.objects = objects;
  });
}

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
  if (!embedded) localStorage.setItem('twin.view', built.view);
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
  if (source === sim) weather.set(weatherPicker.value);
  else refreshWeather();
  followNow();
  if (!embedded) localStorage.setItem('twin.mode', source.mode);
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
function showClock(h) {
  sunSlider.value = h;
  sunClock.textContent = `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
}
sunSlider.addEventListener('input', () => {
  setLive(false); // picking a time by hand leaves "Now"
  showClock(+sunSlider.value);
  simulateSun(+sunSlider.value);
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

// --- weather over the plot
const houseBox = new THREE.Box3();
for (const f of house.floors) {
  for (const { rect: [x, z, w, d], outdoor } of f.rooms ?? []) {
    if (!outdoor) houseBox.expandByPoint(new THREE.Vector3(x, 0, z)).expandByPoint(new THREE.Vector3(x + w, 0, z + d));
  }
}
if (houseBox.isEmpty()) houseBox.set(new THREE.Vector3(), new THREE.Vector3());
houseBox.min.add(built.root.position);
houseBox.max.add(built.root.position);
houseBox.max.y = house.floors.length * house.floorHeight + 0.5;
const weather = createWeather({ scene: world.scene, world, houseBounds: houseBox });

const weatherPicker = document.getElementById('weather');
weatherPicker.innerHTML = CONDITIONS.map((c) => `<option>${c}</option>`).join('');
weatherPicker.value = 'clear';
weatherPicker.addEventListener('change', () => {
  setLive(false);
  weather.set(weatherPicker.value);
});

// "Now" in simulated mode: the real clock, the real sun and the real weather at
// the house's location (house.yaml `location`, else where this browser says it is)
const nowButton = document.getElementById('now');
let live = !embedded && localStorage.getItem('twin.live') === '1';
let liveTimer, liveWeatherAt = 0;
function liveLocation() {
  if (house.location?.latitude != null && house.location?.longitude != null) return house.location;
  try { return JSON.parse(localStorage.getItem('twin.location')); } catch { return null; }
}
const askLocation = () => new Promise((resolve) => {
  if (!navigator.geolocation) return resolve(null);
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => resolve({ latitude: +coords.latitude.toFixed(2), longitude: +coords.longitude.toFixed(2) }),
    () => resolve(null),
    { timeout: 10000, maximumAge: 3600000 }
  );
});
async function followNow() {
  clearTimeout(liveTimer);
  nowButton.classList.toggle('active', live);
  if (!live || source !== sim) return;
  const date = new Date(), loc = liveLocation();
  const hours = date.getHours() + date.getMinutes() / 60;
  showClock(hours);
  if (loc) {
    const sun = sunPosition(date, loc.latitude, loc.longitude);
    store.set(links._sun, sun.elevation > 0 ? 'above_horizon' : 'below_horizon', { ...sun, friendly_name: 'Sun' });
  } else simulateSun(hours);
  liveTimer = setTimeout(followNow, 60 * 1000);
  if (loc && Date.now() - liveWeatherAt > 10 * 60 * 1000) {
    liveWeatherAt = Date.now();
    const now = await fetchOpenMeteo(loc.latitude, loc.longitude);
    if (now && live && source === sim) weatherPicker.value = weather.fromWmo(now.code);
  }
}
function setLive(on) {
  if (live === on) return;
  live = on;
  liveWeatherAt = 0;
  if (!embedded) localStorage.setItem('twin.live', on ? '1' : '');
  followNow();
}
nowButton.addEventListener('click', async () => {
  if (live) return setLive(false);
  if (!liveLocation()) {
    const loc = await askLocation();
    if (loc) localStorage.setItem('twin.location', JSON.stringify(loc));
    else say('No location: showing the real time, but not the real sun and weather. Allow location, or set location in house.yaml.');
  }
  setLive(true);
});

// Real mode: the Home Assistant weather entity if there is one, otherwise the
// real conditions at the house's coordinates (Open-Meteo, refreshed every 10 min).
let weatherTimer;
function haWeather() {
  const id = links._weather ?? [...store.states.keys()].find((k) => k.startsWith('weather.'));
  return id && store.get(id);
}
function coordinates() {
  const a = store.get('zone.home')?.attributes;
  const loc = house.location ?? (a && { latitude: a.latitude, longitude: a.longitude });
  return loc?.latitude != null && loc?.longitude != null ? loc : null;
}
async function refreshWeather() {
  clearTimeout(weatherTimer);
  if (source !== ha) return;
  const entity = haWeather();
  if (entity) weather.fromHa(entity.state);
  else {
    const loc = coordinates();
    const now = loc && (await fetchOpenMeteo(loc.latitude, loc.longitude));
    if (now) weather.fromWmo(now.code);
  }
  weatherTimer = setTimeout(refreshWeather, 10 * 60 * 1000);
}
store.subscribe((id, s) => {
  if (source === ha && s && id === haWeather()?.entity_id) weather.fromHa(s.state);
});

// --- loop
const clock = new THREE.Clock();
world.renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  updateZoomView();
  built.update(world.cameraDir, dt);
  behaviors.update(dt);
  editor.update();
  weather.update(dt, clock.elapsedTime);
  world.update(dt);
});

const wanted = staticSite ? 'simulated' : (query.get('mode') ?? localStorage.getItem('twin.mode') ?? 'real');
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
