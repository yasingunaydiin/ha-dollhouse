// Furniture catalog sidebar: every model as a card with a small 3D picture,
// search, room chips, favourites and "recently used".
import * as THREE from 'three';
import { createModel, listModels } from './models/registry.js';
import { IKEA_MODELS } from './models/ikea.js';

const ROOMS = ['Living', 'Dining', 'Kitchen', 'Bedroom', 'Bathroom', 'Office', 'Hall', 'Utility', 'Garden'];
// first matching pattern wins; each model belongs to one room category
const CATEGORY = [
  ['Living', /nintendo/],
  ['Office', /macbook|logitech/],
  ['Hall', /arch_mirror/],
  ['Living', /wavy_black_mirror|glass_globe|curtain|blinds|bamboo_pendant/],
  ['Hall', /flat_white_door/],
  ['Hall', /^pax_/],
  ['Dining', /lisabo|adde_/],
  ['Office', /alex_|bekant|linnmon/],
  ['Bedroom', /malm_|rast_|elvarli/],
  ['Kitchen', /kitchen|fridge|dishwasher|trash|coffee_machine|stove/],
  ['Bathroom', /bathtub|toilet|vanity|shower|basin|wall_sink/],
  ['Bedroom', /^bed$|pine_bed|metal_bed|nightstand|wardrobe|builtin_cupboard|clothes_rail/],
  ['Office', /desk|office_chair|markus|server|printer|msi_|samsung_c24|clamp_lamp/],
  ['Dining', /dining|pendant_bar|^chair$|^stool$/],
  ['Utility', /washing|boiler|meter|solar|litter|radiator|heater|tower_fan/],
  ['Hall', /stairs|stairwell|railing|doorbell|globe_pendant|round_mirror/],
  ['Garden', /pergola|acapulco|hanging_chair|rain_barrel|fire_pit|ivy|flower_bed|stepping|garage|bush|fence|_patch|gravel|slat_gate|trellis|ivy_hedge|hedge|planter|tapo_camera/],
  ['Living', /sofa|recliner|poang|coffee_table|tv_|samsung_tv|rug|lamp|ceiling_light|track_light|table|plant|monstera|pothos|christmas|cat|shelf|rack|frame|leaning/],
];
const categoryOf = (name) => CATEGORY.find(([, re]) => re.test(name))?.[0] ?? 'Living';
const pretty = (n) => (IKEA_MODELS.includes(n) ? n.replace(/^[a-z]+/, (w) => w.toUpperCase()).replace('POANG', 'POÄNG').replace('VITTSJO', 'VITTSJÖ').replace('BESTA', 'BESTÅ').replace('TARNABY', 'TÄRNABY') : n.replace(/^./, (c) => c.toUpperCase())).replaceAll('_', ' ');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
};

// ── thumbnails: one shared offscreen renderer, drawn one at a time
let renderer, scene, camera;
const THUMB_W = 240, THUMB_H = 160;
const thumbs = new Map();
let queue = Promise.resolve();

function ensureRenderer() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(THUMB_W, THUMB_H, false);
  renderer.setPixelRatio(1);
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#6b7394', 1.6));
  const sun = new THREE.DirectionalLight('#ffffff', 2.2);
  sun.position.set(-2, 4, 3);
  scene.add(sun);
  camera = new THREE.PerspectiveCamera(32, THUMB_W / THUMB_H, 0.05, 200);
}

async function snapshot(name) {
  ensureRenderer();
  const obj = await createModel(name, {});
  // lights and glow parts show as "on" so lamps read as lamps
  obj.traverse((o) => {
    if (o.isMesh && o.name.startsWith('glow') && o.material?.emissive) o.material.emissiveIntensity = 1;
  });
  scene.add(obj);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const radius = Math.max(size.length() / 2, 0.05);
  const dist = (radius / Math.sin((camera.fov * Math.PI) / 360)) * 0.98;
  camera.position.copy(centre).add(new THREE.Vector3(0.75, 0.62, 1).normalize().multiplyScalar(dist));
  camera.near = dist / 50;
  camera.far = dist * 10;
  camera.updateProjectionMatrix();
  camera.lookAt(centre);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(obj);
  const lit = (() => { let found = false; obj.traverse((o) => { if (o.name === 'light_anchor') found = true; }); return found; })();
  return { url, lit, w: size.x, d: size.z, h: size.y };
}

function thumbnail(name) {
  if (!thumbs.has(name)) {
    thumbs.set(name, new Promise((resolve) => {
      queue = queue.then(() => snapshot(name)).then(resolve, () => resolve(null));
    }));
  }
  return thumbs.get(name);
}

export function createCatalog({ container, onPick }) {
  container.innerHTML = `
    <div class="cat-head"><strong>Add furniture</strong><button class="cat-close" title="Close">×</button></div>
    <p class="cat-tip">Tip: click a room on the plan first — new items then land in its middle.</p>
    <input class="cat-search" type="search" placeholder="Search furniture …" />
    <div class="cat-chips"></div>
    <div class="cat-flags"></div>
    <div class="cat-list"></div>`;
  const $ = (q) => container.querySelector(q);
  let room = 'All rooms';
  let flag = null; // 'lit' | 'outdoors' | null
  let query = '';
  let favs = new Set(read('twin.favs', []));
  let recent = read('twin.recent', []);

  const items = listModels().sort().map((name) => ({ name, label: pretty(name), room: categoryOf(name) }));
  const info = new Map(); // name -> { lit, w, d, h } once rendered

  $('.cat-chips').innerHTML = ['All rooms', ...ROOMS].map((r) => `<button data-room="${r}">${r}</button>`).join('');
  $('.cat-flags').innerHTML = `<button data-flag="lit">💡 Lights up</button><button data-flag="outdoors">🌳 Outdoors</button><button data-flag="ikea">IKEA</button>`;

  const cm = (n) => Math.round(n * 100);
  function card(it) {
    const i = info.get(it.name);
    return `<div class="cat-card" data-model="${it.name}" title="Add ${esc(it.label)}">
      <button class="cat-star${favs.has(it.name) ? ' on' : ''}" data-fav="${it.name}" title="Favourite">${favs.has(it.name) ? '★' : '☆'}</button>
      <div class="cat-pic"><img alt="" data-thumb="${it.name}" /></div>
      <div class="cat-name">${esc(it.label)}${i?.lit ? ' 💡' : ''}</div>
      <div class="cat-dim" data-dim="${it.name}">${i ? `${cm(i.w)} × ${cm(i.d)} cm` : ''}</div>
    </div>`;
  }

  function visible(it) {
    if (room !== 'All rooms' && it.room !== room) return false;
    if (flag === 'outdoors' && it.room !== 'Garden') return false;
    if (flag === 'ikea' && !IKEA_MODELS.includes(it.name)) return false;
    if (flag === 'lit' && !info.get(it.name)?.lit) return false;
    return !query || it.label.toLowerCase().includes(query);
  }

  function section(title, list) {
    return list.length ? `<div class="cat-section"><span>${title}</span><span>${list.length}</span></div><div class="cat-grid">${list.map(card).join('')}</div>` : '';
  }

  function render() {
    const byName = new Map(items.map((i) => [i.name, i]));
    const shown = items.filter(visible);
    let h = '';
    const filtering = room !== 'All rooms' || flag || query;
    if (!filtering) {
      h += section('🕘 Recently used', recent.map((n) => byName.get(n)).filter(Boolean).slice(0, 8));
      h += section('★ Favourites', [...favs].map((n) => byName.get(n)).filter(Boolean));
    }
    if (room === 'All rooms') {
      for (const r of ROOMS) h += section(r, shown.filter((i) => i.room === r));
    } else h += section(room, shown);
    $('.cat-list').innerHTML = h || '<p class="cat-empty">Nothing matches.</p>';
    for (const b of container.querySelectorAll('[data-room]')) b.classList.toggle('active', b.dataset.room === room);
    for (const b of container.querySelectorAll('[data-flag]')) b.classList.toggle('active', b.dataset.flag === flag);
    // fill in the pictures as they get rendered
    for (const img of container.querySelectorAll('img[data-thumb]')) {
      const name = img.dataset.thumb;
      thumbnail(name).then((t) => {
        if (!t) return;
        info.set(name, t);
        img.src = t.url;
        const dim = container.querySelector(`[data-dim="${name}"]`);
        if (dim) dim.textContent = `${cm(t.w)} × ${cm(t.d)} cm`;
      });
    }
  }

  container.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('.cat-close')) return container.dispatchEvent(new CustomEvent('close'));
    const chip = t.closest('[data-room]');
    if (chip) { room = chip.dataset.room; return render(); }
    const fl = t.closest('[data-flag]');
    if (fl) { flag = flag === fl.dataset.flag ? null : fl.dataset.flag; render(); if (flag === 'lit') Promise.all(items.map((i) => thumbnail(i.name).then((x) => x && info.set(i.name, x)))).then(render); return; }
    const star = t.closest('[data-fav]');
    if (star) {
      const n = star.dataset.fav;
      favs.has(n) ? favs.delete(n) : favs.add(n);
      write('twin.favs', [...favs]);
      return render();
    }
    const c = t.closest('[data-model]');
    if (c) {
      const n = c.dataset.model;
      recent = [n, ...recent.filter((x) => x !== n)].slice(0, 12);
      write('twin.recent', recent);
      onPick(n, info.get(n));
    }
  });
  $('.cat-search').addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); render(); });

  render();
  return { refresh: render };
}
