import * as THREE from 'three';
import { parse } from 'yaml';
import './style.css';
import './models/defaults.js';
import './models/ikea.js';
import './models/tech.js';
import { POWER_MODELS, portsOf } from './models/power.js';
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
import { createRoomPanel } from './dialogs/room.js';
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
const editor = createEditor({ world, built, house, container: document.getElementById('app'), say, bubbles: behaviors.bubbles });
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
const planner = createPlanner({ house, say, links, entities: () => [...store.states.keys()].sort() });
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
    if (e.data.rooms && !same(f.rooms ?? [], e.data.rooms)) {
      // rooms (the floors themselves) changed: rebuild just this floor's slabs
      built.rebuildRooms(id, e.data.rooms);
      f.rooms = e.data.rooms;
    }
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
      if (def.plug === undefined) delete entry.def.plug;
      else entry.def.plug = def.plug;
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

// --- floor balloons: in the closed-up house every floor floats a label with its
// room count and lights on. Click one (or the floor) and that floor opens; the
// balloons go away while a floor is open.
const balloons = realFloors.map((f) => {
  const el = document.createElement('button');
  el.className = 'balloon';
  el.dataset.floor = f.id;
  el.addEventListener('click', () => showView(f.id));
  document.body.append(el);
  // the footprint of the building itself (not the garden), to hang the balloon on its edge
  const rooms = f.def.rooms ?? [];
  const rects = (rooms.some((r) => !r.outdoor) ? rooms.filter((r) => !r.outdoor) : rooms).map((r) => r.rect);
  const x0 = Math.min(...rects.map((r) => r[0])), x1 = Math.max(...rects.map((r) => r[0] + r[2]));
  const z0 = Math.min(...rects.map((r) => r[1])), z1 = Math.max(...rects.map((r) => r[1] + r[3]));
  return { f, el, text: '', corners: [0, 1, 2, 3].map(() => new THREE.Vector3()), pick: null, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, hx: (x1 - x0) / 2, hz: (z1 - z0) / 2, y: f.level * house.floorHeight + 1.2 };
});
const escHtml = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const CORNERS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const corner = new THREE.Vector3(), projected = new THREE.Vector3();
function updateBalloons(dt) {
  const show = built.view === 'outside' && !editor.enabled;
  const r = canvas.getBoundingClientRect();
  for (const b of balloons) {
    b.el.classList.toggle('show', show);
    if (!show) { b.anchor = null; b.pick = null; continue; }
    const rooms = (b.f.def.rooms ?? []).filter((x) => !x.outdoor).length;
    let lights = 0;
    for (const e of built.objects.values()) {
      if (e.floorId === b.f.id && e.def.kind === 'light' && links[e.def.id] && store.get(links[e.def.id])?.state === 'on') lights++;
    }
    const text = `<b>${escHtml(b.f.name ?? b.f.id)}</b><span>${plural(rooms, 'room')}${lights ? ` · ${plural(lights, 'light')} on` : ''}</span>`;
    if (text !== b.text) b.el.innerHTML = b.text = text;
    // The balloon is tied to a point on the wall: the corner of the floor's outline that is
    // furthest left on screen. The point is fixed in the world, so it turns with the house;
    // when another corner becomes the outermost it slides along the wall to it.
    const xs = CORNERS.map(([sx, sz], k) => {
      corner.set(b.cx + sx * b.hx, b.y, b.cz + sz * b.hz);
      built.root.localToWorld(corner);
      b.corners[k].copy(corner);
      return projected.copy(corner).project(world.camera).x;
    });
    // keep the current corner until another is clearly further left, so it doesn't flicker
    const lowest = xs.indexOf(Math.min(...xs));
    if (b.pick == null || xs[lowest] < xs[b.pick] - 0.06) b.pick = lowest;
    const best = b.corners[b.pick];
    if (!b.anchor) b.anchor = best.clone();
    b.anchor.lerp(best, 1 - Math.exp(-dt * 9));
    projected.copy(b.anchor).project(world.camera);
    const ax = r.left + ((projected.x + 1) / 2) * r.width, ay = r.top + ((1 - projected.y) / 2) * r.height;
    b.el.style.transform = `translate(${ax - 26}px, ${ay}px) translate(-100%, -50%)`;
  }
}

// --- room balloons: with a floor open, every room floats its name; click it for
// the list of entities in that room (src/dialogs/room.js)
let roomPanel = null; // made once the control windows exist
const area = ([, , w, d]) => w * d;
const roomName = (r) => r.name ?? r.id;
// rooms that share a name (one living room drawn as two rectangles) are one room
function roomItems(f, room) {
  return [...built.objects.values()].filter((e) => {
    if (e.floorId !== f.id || !links[e.def.id]) return false;
    const { x, z } = e.object3d.position;
    // inside nested rooms (a wardrobe in a hallway) it belongs to the smallest one
    const inside = (f.def.rooms ?? []).filter((r) => x >= r.rect[0] && x <= r.rect[0] + r.rect[2] && z >= r.rect[1] && z <= r.rect[1] + r.rect[3]);
    return inside.length && roomName(inside.reduce((a, b) => (area(b.rect) < area(a.rect) ? b : a))) === roomName(room);
  }).map((e) => ({ id: e.def.id, entityId: links[e.def.id], entry: e }));
}
// glide the camera to a room and zoom to fit it (the view angle stays as it is)
const focusPoint = new THREE.Vector3();
function focusRoom(f, room) {
  const [x, z, w, d] = room.rect;
  built.root.localToWorld(focusPoint.set(x + w / 2, f.level * house.floorHeight + 0.6, z + d / 2));
  world.panTo(focusPoint.x, focusPoint.z);
  world.lookAtHeight(focusPoint.y);
  world.zoomTo(THREE.MathUtils.clamp(17 / (Math.max(w, d) * 1.3 + 3), 1.2, 4.5));
}
const pills = [];
for (const f of realFloors) {
  for (const room of f.def.rooms ?? []) {
    // one balloon per name, on the largest rectangle with that name
    if ((f.def.rooms ?? []).some((r) => roomName(r) === roomName(room) && (area(r.rect) > area(room.rect) || (area(r.rect) === area(room.rect) && r !== room && f.def.rooms.indexOf(r) < f.def.rooms.indexOf(room))))) continue;
    const el = document.createElement('button');
    el.className = 'roompill';
    el.textContent = room.name ?? room.id;
    el.addEventListener('click', () => {
      roomPanel?.open({ name: room.name ?? room.id, floorId: f.id, items: roomItems(f, room) });
      focusRoom(f, room);
    });
    document.body.append(el);
    const [x, z, w, d] = room.rect;
    pills.push({ f, el, at: new THREE.Vector3(x + w / 2, f.level * house.floorHeight + 0.4, z + d / 2) });
  }
}
const pillPos = new THREE.Vector3();
function updateRoomPills() {
  if (roomPanel?.floorId && roomPanel.floorId !== built.view) roomPanel.close();
  const r = canvas.getBoundingClientRect();
  for (const p of pills) {
    const show = built.view === p.f.id && !editor.enabled;
    p.el.classList.toggle('show', show);
    if (!show) continue;
    pillPos.copy(p.at);
    built.root.localToWorld(pillPos).project(world.camera);
    p.el.style.transform = `translate(${r.left + ((pillPos.x + 1) / 2) * r.width}px, ${r.top + ((1 - pillPos.y) / 2) * r.height}px) translate(-50%, -50%)`;
  }
}

let bubbleView = null; // the view the icon bubbles were last filtered for
// --- loop
// Draw on demand (see scene.js). Anything that can change the picture without moving
// the camera lands here: pointer and keyboard input (editing), and device state
// changes (lights fade over a couple of seconds, labels change).
for (const type of ['pointerdown', 'pointerup', 'keydown', 'click', 'change', 'input']) window.addEventListener(type, () => world.invalidate(true, 3), true);
window.addEventListener('pointermove', () => world.invalidate(false), true);
window.addEventListener('wheel', () => world.invalidate(false), { capture: true, passive: true });
store.subscribe(() => world.invalidate(false, 3));
const clock = new THREE.Clock();
world.renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  updateZoomView();
  if (built.update(world.cameraDir, dt)) world.invalidate();
  behaviors.update(dt);
  world.setAmbient(behaviors.ambient);
  editor.update();
  weather.update(dt, clock.elapsedTime);
  if (weather.active) world.invalidate(false);
  world.update(dt);
  // overlays go last, so they use the camera as just drawn (no trailing behind the house)
  if (built.view !== bubbleView) behaviors.bubbles.showFloor((bubbleView = built.view));
  updateBalloons(dt);
  updateRoomPills();
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
roomPanel = createRoomPanel({ store, getSource: () => source, say, openEntry: (entry) => entry && dialogs[entry.kind.dialog]?.open(entry) });

// --- picking: click an object that has a behaviour

// The object under the pointer (any object, not just clickable ones).
function entryAt(event) {
  const r = canvas.getBoundingClientRect();
  pointer.set(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, world.camera);
  for (const hit of raycaster.intersectObject(built.root, true)) {
    let o = hit.object, shown = true;
    for (let p = o; p; p = p.parent) shown &&= p.visible;
    if (!shown) continue;
    while (o && !o.userData.objectId) o = o.parent;
    return (o && built.objects.get(o.userData.objectId)) || null;
  }
  return null;
}
const clickable = (entry) => ((entry?.kind?.click || entry?.kind?.dialog) && entry.entityId ? entry : null);
function pick(event) {
  return clickable(entryAt(event));
}

// --- power points: hover a socket or power strip to see what is plugged into it.
// A device says which socket it uses with `plug: <socket id>` in house.yaml
// (the plan editor has a "Plugged into" field for it).
const plugTip = document.createElement('div');
plugTip.id = 'plugtip';
plugTip.hidden = true;
document.body.append(plugTip);
const nice = (t) => String(t).replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());
function deviceLine(def, depth = 0) {
  const s = links[def.id] && store.get(links[def.id]);
  const name = s?.attributes?.friendly_name ?? nice(def.id);
  const watts = s?.attributes?.current_power_w ?? s?.attributes?.power;
  const state = s && !['unknown', 'unavailable'].includes(s.state) ? s.state : null;
  const detail = [state, watts != null ? `${watts} W` : null].filter(Boolean).join(' · ');
  let html = `<li class="${state === 'on' || watts > 0 ? 'live' : ''}" style="margin-left:${depth * 12}px"><b>${escHtml(name)}</b>${detail ? `<span>${escHtml(detail)}</span>` : ''}</li>`;
  if (POWER_MODELS.includes(def.model)) for (const d of pluggedInto(def.id)) html += deviceLine(d, depth + 1);
  return html;
}
const pluggedInto = (id) => [...built.objects.values()].filter((e) => e.def.plug === id).map((e) => e.def);
// Sockets and strips are tiny, so the hover reaches 40 px around them on screen
// instead of needing a hit on the model itself.
const HOVER_RADIUS = 40;
const hoverBox = new THREE.Box3(), hoverPoint = new THREE.Vector3();
function socketNear(e) {
  const r = canvas.getBoundingClientRect();
  let best = null, bestDist = HOVER_RADIUS;
  for (const entry of built.objects.values()) {
    if (!POWER_MODELS.includes(entry.def.model)) continue;
    let shown = true;
    for (let p = entry.object3d; p; p = p.parent) shown &&= p.visible;
    if (!shown) continue;
    hoverBox.setFromObject(entry.object3d).getCenter(hoverPoint).project(world.camera);
    const dist = Math.hypot(r.left + ((hoverPoint.x + 1) / 2) * r.width - e.clientX, r.top + ((1 - hoverPoint.y) / 2) * r.height - e.clientY);
    if (dist < bestDist) [best, bestDist] = [entry, dist];
  }
  return best;
}
function showPlugTip(entry, e) {
  const list = pluggedInto(entry.def.id), ports = portsOf(entry.def);
  plugTip.innerHTML = `<h4>${escHtml(nice(entry.def.model))} <small>${list.length} of ${ports} in use</small></h4>${
    list.length ? `<ul>${list.map((d) => deviceLine(d)).join('')}</ul>` : '<p>Nothing plugged in</p>'}`;
  plugTip.hidden = false;
  const w = plugTip.offsetWidth, h = plugTip.offsetHeight;
  plugTip.style.left = `${Math.min(e.clientX + 16, innerWidth - w - 8)}px`;
  plugTip.style.top = `${Math.min(e.clientY + 16, innerHeight - h - 8)}px`;
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
canvas.addEventListener('pointerdown', (e) => ((downAt = [e.clientX, e.clientY]), (plugTip.hidden = true)));
canvas.addEventListener('pointerleave', () => (plugTip.hidden = true));
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
  if (editor.enabled || e.buttons) { plugTip.hidden = true; return; }
  const entry = entryAt(e);
  canvas.style.cursor = clickable(entry) ? 'pointer' : 'grab';
  const socket = entry && POWER_MODELS.includes(entry.def.model) ? entry : socketNear(e);
  if (socket) showPlugTip(socket, e);
  else plugTip.hidden = true;
});

// handy for debugging from the console
window.twin = { house, links, store, sim, ha, built, world };
