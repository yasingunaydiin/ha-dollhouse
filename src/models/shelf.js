// The oak shelf above the desk with everything standing on it, and the framed
// Karin Székessy poster next to it — each piece on its own, plus `display_shelf`
// with all of them arranged as in the photo. Metres, origin on the floor/shelf, front +z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { registerModel } from './registry.js';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
function box(w, h, d, color, x = 0, y = 0, z = 0, radius = 0, extra = {}) {
  const geo = radius ? new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat(color, extra));
  m.position.set(x, y + h / 2, z);
  return m;
}
// cylinder with its axis along z (a lens barrel)
function lens(r, len, color, x, y, z, extra = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 24), mat(color, extra));
  m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  return m;
}
function ball(r, color, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat(color, { roughness: 0.9 }));
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  return m;
}
const group = (...c) => { const g = new THREE.Group(); if (c.length) g.add(...c); return g; };
export const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// a texture drawn on a canvas; null outside the browser so models still build in tests
export function drawn(w, h, draw) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
export const textured = (map, fallback, extra = {}) => new THREE.MeshStandardMaterial({ color: map ? '#ffffff' : fallback, map, roughness: 0.6, ...extra });

export const SHELF_MODELS = [
  'display_shelf', 'oak_wall_shelf', 'szekessy_poster', 'minolta_dslr', 'sony_compact_camera', 'canon_compact_camera',
  'nintendo_wii', 'nintendo_gamecube', 'dragonair_plush', 'super_mario_star_lamp', 'japanese_tea_box', 'souvenir_cups',
  'framed_map', 'hanging_rhipsalis', 'spheal_figure',
];

const parts = {};
const make = (name, fn) => { parts[name] = fn; registerModel(name, fn); };

make('oak_wall_shelf', ({ length = 1.3, depth = 0.25, color = '#cdb892' } = {}) =>
  group(box(length, 0.03, depth, color, 0, 0, 0, 0.003), box(length - 0.004, 0.004, depth - 0.004, '#b9a47c', 0, 0, 0)));

// framed poster, 50 x 72 cm, thin gold frame; hang it with "Placement height"
make('szekessy_poster', ({ width = 0.5, height = 0.72 } = {}) => {
  const map = drawn(500, 720, (c, w, h) => {
    c.fillStyle = '#f6f3ea'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#16120f'; c.fillRect(40, 118, w - 80, 400);
    // the pale figure in the dark
    const g = c.createRadialGradient(240, 330, 5, 240, 340, 130);
    g.addColorStop(0, 'rgba(235,225,205,0.95)'); g.addColorStop(1, 'rgba(235,225,205,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(235, 345, 95, 80, -0.3, 0, 7); c.fill();
    c.fillStyle = 'rgba(230,222,205,0.9)';
    c.beginPath(); c.moveTo(150, 360); c.quadraticCurveTo(230, 300, 300, 345); c.lineTo(330, 400); c.quadraticCurveTo(230, 430, 140, 395); c.fill();
    c.fillStyle = '#e8d9c4'; c.beginPath(); c.arc(238, 285, 14, 0, 7); c.fill();
    c.fillStyle = '#1d1a17'; c.font = 'italic 30px Georgia, serif'; c.fillText('Madame Recamier, 1974', 42, 92);
    c.font = '38px Georgia, serif'; c.fillText('KARIN', 42, 580);
    c.font = '82px Georgia, serif'; c.fillText('SZÉKESSY', 34, 665);
    c.fillRect(40, 684, w - 80, 3);
  });
  const g = group(), f = 0.014, d = 0.018, gold = '#b9995a';
  g.add(box(width, height, 0.004, '#eae6da', 0, 0, -0.007));
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(width - 2 * f, height - 2 * f), textured(map, '#f0ece0'));
  paper.position.set(0, height / 2, -0.004);
  g.add(paper);
  g.add(box(width, f, d, gold, 0, 0, -0.009), box(width, f, d, gold, 0, height - f, -0.009));
  g.add(box(f, height, d, gold, -width / 2 + f / 2, 0, -0.009), box(f, height, d, gold, width / 2 - f / 2, 0, -0.009));
  g.position.z = 0.01; // so z = 0 is the wall
  return group(g);
});

make('minolta_dslr', () => group(
  box(0.14, 0.095, 0.07, '#1a1a1c', 0, 0, 0, 0.008),
  box(0.045, 0.03, 0.05, '#1a1a1c', 0, 0.095, -0.005, 0.005),
  box(0.035, 0.09, 0.04, '#111113', 0.045, 0, 0.03, 0.01),
  lens(0.036, 0.07, '#0e0e10', -0.005, 0.045, 0.07), lens(0.027, 0.012, '#050507', -0.005, 0.045, 0.108, { roughness: 0.1 }),
  box(0.03, 0.006, 0.002, '#c9c9c9', -0.04, 0.075, 0.036)));

make('sony_compact_camera', () => group(
  box(0.1, 0.058, 0.02, '#9fc4da', 0, 0, 0, 0.004, { metalness: 0.5, roughness: 0.35 }),
  lens(0.017, 0.012, '#d7dde0', -0.025, 0.03, 0.014, { metalness: 0.8, roughness: 0.2 }),
  lens(0.01, 0.004, '#101216', -0.025, 0.03, 0.021, { roughness: 0.1 })));

make('canon_compact_camera', () => group(
  box(0.108, 0.068, 0.045, '#1a1b1e', 0, 0, 0, 0.005),
  lens(0.02, 0.02, '#0c0c0e', 0.02, 0.038, 0.03)));

make('nintendo_wii', ({ remote = true } = {}) => {
  const g = group(
    box(0.215, 0.044, 0.155, '#f3f3f0', 0, 0, 0, 0.006),
    box(0.15, 0.002, 0.004, '#1a1a1c', 0, 0.044, 0.05),
    box(0.02, 0.002, 0.012, '#6fb8e8', 0.085, 0.044, 0.0));
  if (remote) {
    const r = group(box(0.15, 0.03, 0.038, '#f3f3f0', 0, 0, 0, 0.008), box(0.012, 0.004, 0.012, '#bbb', 0.03, 0.03, 0));
    r.position.set(-0.01, 0.044, -0.03);
    r.rotation.y = 0.06;
    g.add(r);
  }
  return g;
});

make('nintendo_gamecube', () => {
  const body = '#4a4978';
  const g = group(
    box(0.15, 0.11, 0.16, body, 0, 0, 0, 0.012, { roughness: 0.35 }),
    box(0.118, 0.012, 0.11, '#5b5a8a', 0, 0.11, -0.01, 0.006, { roughness: 0.3 }),
    box(0.15, 0.012, 0.01, '#8f93a2', 0, 0.024, 0.0795, 0));
  for (let i = 0; i < 4; i++) g.add(lens(0.0115, 0.006, '#1b1b26', -0.045 + i * 0.03, 0.062, 0.0795));
  g.add(box(0.04, 0.012, 0.004, '#17171f', -0.035, 0.016, 0.081), box(0.04, 0.012, 0.004, '#17171f', 0.035, 0.016, 0.081));
  return g;
});

make('dragonair_plush', () => {
  const blue = '#4aa9d9', white = '#f3f3f5';
  const g = group(
    ball(0.045, white, 0, 0.04, 0, 1, 0.9, 1), ball(0.03, blue, 0.006, 0.1, 0, 1, 1.2, 1),
    ball(0.024, blue, 0.012, 0.15, 0.004, 1, 1.1, 1), ball(0.03, blue, 0.012, 0.19, 0.012),
    ball(0.012, '#2a58c9', -0.02, 0.145, 0.026), ball(0.012, '#2a58c9', 0.034, 0.145, 0.026),
    ball(0.006, '#111', 0.0, 0.2, 0.038), ball(0.006, '#111', 0.03, 0.2, 0.034));
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.04, 8), mat(white));
  horn.position.set(0.012, 0.235, 0.012);
  g.add(horn);
  for (const sx of [-1, 1]) { const ear = ball(0.012, white, 0.012 + sx * 0.03, 0.215, 0, 0.5, 1.5, 0.5); ear.rotation.z = -sx * 0.5; g.add(ear); }
  return g;
});

make('super_mario_star_lamp', ({ size = 0.2 } = {}) => {
  const R = size / 2, r = R * 0.5, depth = size * 0.3;
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? r : R;
    i ? shape.lineTo(Math.cos(a) * rad, Math.sin(a) * rad) : shape.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  const bevel = size * 0.07;
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 5 });
  geo.translate(0, 0, -depth / 2);
  geo.computeBoundingBox();
  const star = new THREE.Mesh(geo, mat('#f5cf1f', { roughness: 0.3, emissive: '#ffc400', emissiveIntensity: 0 }));
  star.name = 'glow';
  const g = group(star);
  const z = depth / 2 + bevel + 0.001;
  for (const sx of [-1, 1]) {
    g.add(ball(size * 0.05, '#0c0c0c', sx * size * 0.13, size * 0.03, z, 0.55, 1.45, 0.3));
    g.add(ball(size * 0.018, '#fff', sx * size * 0.13, size * 0.07, z + 0.004, 1, 1, 0.5));
  }
  g.position.y = -geo.boundingBox.min.y + bevel * 0.4;
  const out = group(g);
  const a = new THREE.Object3D(); a.name = 'light_anchor'; a.position.set(0, size * 0.5, 0.05); out.add(a);
  return out;
});

make('japanese_tea_box', () => {
  const map = drawn(256, 400, (c, w, h) => {
    c.fillStyle = '#cfa46d'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#17120e'; c.font = 'bold 74px serif'; c.textAlign = 'center';
    c.fillText('円熟', w / 2, 120); c.font = 'bold 190px serif'; c.fillText('あ', w / 2, 330);
  });
  const wood = mat('#c9a06a', { roughness: 0.85 });
  const g = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.17, 0.1), [wood, wood, wood, wood, textured(map, '#c9a06a', { roughness: 0.85 }), wood]);
  g.position.y = 0.085;
  const tape = box(0.05, 0.002, 0.03, '#1c1b1a', 0.03, 0.17, 0.0);
  tape.rotation.y = 0.7;
  return group(g, tape);
});

// three little cups in a row: dark glazed tea bowl, white cup with black print, cream souvenir mug
make('souvenir_cups', () => {
  const cup = (r, h, color, x, z) => {
    const pts = [[0, 0], [r * 0.6, 0], [r, h], [r * 0.93, h], [r * 0.55, 0.005], [0, 0.005]].map(([a, b]) => new THREE.Vector2(a, b));
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), mat(color, { side: THREE.DoubleSide, roughness: 0.3 }));
    m.position.set(x, 0, z);
    return m;
  };
  const g = group(cup(0.032, 0.042, '#f1efe8', -0.08, 0), cup(0.034, 0.048, '#ece9df', -0.01, 0), cup(0.036, 0.062, '#f3e9c9', 0.07, 0));
  g.add(box(0.05, 0.016, 0.003, '#222', -0.08, 0.02, 0.031), box(0.045, 0.02, 0.003, '#222', -0.01, 0.02, 0.034));
  g.add(box(0.06, 0.02, 0.003, '#36a7b3', 0.07, 0.025, 0.036), box(0.06, 0.012, 0.003, '#e0864b', 0.07, 0.04, 0.036));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 8, 16), mat('#f3e9c9'));
  handle.position.set(0.107, 0.035, 0);
  g.add(handle);
  return g;
});

make('framed_map', ({ width = 0.22, height = 0.28 } = {}) => {
  const map = drawn(220, 280, (c, w, h) => {
    c.fillStyle = '#2f78b9'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e6d4a6'; c.beginPath(); c.moveTo(0, 190); c.quadraticCurveTo(110, 150, 220, 200); c.lineTo(220, 280); c.lineTo(0, 280); c.fill();
    c.fillStyle = '#f4ecd6'; c.fillRect(0, 0, w, 44);
    c.fillStyle = '#c4452f'; c.font = 'bold 26px sans-serif'; c.fillText('BAHRAIN', 14, 32);
  });
  const g = group(box(width, height, 0.018, '#111113', 0, 0, 0));
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.03, height - 0.03), textured(map, '#2f78b9'));
  pic.position.set(0, height / 2, 0.0095);
  g.add(pic);
  g.rotation.x = -0.14; // leans back against the wall
  return group(g);
});

make('hanging_rhipsalis', ({ seed = 3 } = {}) => {
  const r = rng(seed), g = group();
  const pot = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.065, 0], [0.09, 0.12], [0.082, 0.12], [0.06, 0.01], [0, 0.01]].map(([a, b]) => new THREE.Vector2(a, b)), 28), mat('#f1efe9', { side: THREE.DoubleSide, roughness: 0.4 }));
  g.add(pot, box(0.15, 0.01, 0.15, '#3a2c22', 0, 0.1, 0));
  const green = mat('#5f8f3d', { roughness: 0.8 });
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, rad = r() * 0.07, len = 0.18 + r() * 0.35, out = 0.06 + r() * 0.12;
    const x = Math.cos(a) * rad, z = Math.sin(a) * rad, dx = Math.cos(a), dz = Math.sin(a);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0.11, z), new THREE.Vector3(x + dx * out * 0.5, 0.17 + r() * 0.04, z + dz * out * 0.5),
      new THREE.Vector3(x + dx * out, 0.12, z + dz * out), new THREE.Vector3(x + dx * (out + 0.04), 0.1 - len * 0.5, z + dz * (out + 0.04)),
      new THREE.Vector3(x + dx * (out + 0.05), 0.1 - len, z + dz * (out + 0.05)),
    ]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.0028, 4), green));
  }
  return g;
});

make('spheal_figure', () => group(
  ball(0.026, '#4a8fd1', 0, 0.026, 0), ball(0.017, '#f1e3a6', 0, 0.02, 0.016, 1, 0.9, 0.6),
  ball(0.004, '#111', -0.009, 0.036, 0.024), ball(0.004, '#111', 0.009, 0.036, 0.024)));

// everything arranged like the photo: 1.3 m oak shelf, items left to right
make('display_shelf', () => {
  const g = group(parts.oak_wall_shelf());
  const top = 0.03;
  const put = (name, x, z, rotY = 0, y = top, params) => {
    const o = parts[name](params);
    o.position.set(x, y, z);
    o.rotation.y = rotY;
    g.add(o);
    return o;
  };
  put('framed_map', -0.6, -0.02, 0.05);
  put('hanging_rhipsalis', -0.46, -0.03);
  put('souvenir_cups', -0.42, 0.06);
  put('japanese_tea_box', -0.31, -0.04, 0.05);
  put('minolta_dslr', -0.22, 0.04, -0.15);
  put('canon_compact_camera', -0.08, -0.06, 0.05);
  put('sony_compact_camera', -0.11, 0.04, -0.1);
  put('nintendo_wii', 0.07, 0.01);
  put('spheal_figure', 0.2, 0.07);
  put('nintendo_gamecube', 0.27, -0.02);
  put('dragonair_plush', 0.27, -0.02, 0, top + 0.122);
  put('super_mario_star_lamp', 0.49, 0.04, -0.08);
  return g;
});
