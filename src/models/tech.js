// Desk gadgets at their real sizes (metres). Origin on the surface they stand on,
// front facing +z. Put them on a desk with the "Placement height" field.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { registerModel } from './registry.js';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
function box(w, h, d, color, x = 0, y = 0, z = 0, radius = 0, extra = {}) {
  const geo = radius ? new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat(color, extra));
  m.position.set(x, y + h / 2, z);
  return m;
}
function cyl(r, h, color, x = 0, y = 0, z = 0, extra = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), mat(color, extra));
  m.position.set(x, y + h / 2, z);
  return m;
}
const group = (...c) => { const g = new THREE.Group(); if (c.length) g.add(...c); return g; };

export const TECH_MODELS = ['nintendo_switch', 'logitech_mx_keys_mini', 'logitech_mx_master_mouse', 'macbook_air_space_black', 'macbook_air_space_gray', 'samsung_xpress_printer', 'xbox_one_s'];

// Nintendo Switch, 239 x 102 x 14 with neon Joy-Cons. docked: stands upright in its dock.
registerModel('nintendo_switch', ({ docked = false } = {}) => {
  const c = group();
  c.add(box(0.173, 0.0139, 0.102, '#1d1e21', 0, 0, 0, 0.004));
  c.add(box(0.162, 0.001, 0.092, '#06070a', 0, 0.0139, 0, 0.002, { roughness: 0.15, emissive: '#10244a', emissiveIntensity: 0.7 }));
  for (const [sx, col] of [[-1, '#13b5e6'], [1, '#ff4655']]) {
    c.add(box(0.033, 0.0139, 0.102, col, sx * 0.1065, 0, 0, 0.007));
    c.add(cyl(0.0095, 0.004, '#17181a', sx * 0.1065, 0.0139, sx * -0.02));
    c.add(cyl(0.0035, 0.004, '#17181a', sx * 0.1065 + (sx > 0 ? -0.001 : 0.001), 0.0139, sx * 0.022));
  }
  if (!docked) return c;
  // dock: wide black block, console upright in it
  c.rotation.x = Math.PI / 2;
  c.position.set(0, 0.07, 0.012);
  return group(
    box(0.26, 0.075, 0.06, '#202124', 0, 0, 0, 0.006),
    box(0.262, 0.074, 0.01, '#f2f2f0', 0, 0.001, -0.03, 0.004),
    box(0.19, 0.006, 0.05, '#0e0f10', 0, 0.075, 0),
    c
  );
});

// MX Keys Mini, 296 x 132 x 21
registerModel('logitech_mx_keys_mini', ({ variant = 'graphite' } = {}) => {
  const pale = variant === 'pale';
  const body = pale ? '#c9cacd' : '#3a3c40', key = pale ? '#e6e7e9' : '#1c1d20';
  const g = group(box(0.2958, 0.016, 0.1318, body, 0, 0, 0, 0.006));
  const pitch = 0.0195, cols = 14, rows = 5;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const h = r === 0 ? 0.0105 : 0.0125;
      g.add(box(0.0166, 0.0026, 0.0166 * (r === 0 ? 0.8 : 1), key, (c - (cols - 1) / 2) * pitch, 0.016, (r - (rows - 1) / 2) * pitch - 0.004, 0.003));
    }
  return g;
});

// MX Master 3S mouse, 125 x 84 x 51, ergonomic with thumb rest and scroll wheel
registerModel('logitech_mx_master_mouse', ({ color = '#33353a' } = {}) => {
  const g = group();
  const hump = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(color, { roughness: 0.6 }));
  hump.scale.set(0.0405, 0.043, 0.0625);
  hump.position.set(0.002, 0.008, -0.004);
  g.add(hump);
  g.add(box(0.082, 0.014, 0.12, color, 0, 0, 0, 0.007));
  const thumb = box(0.024, 0.026, 0.06, '#4a4d53', -0.043, 0.004, 0.006, 0.01);
  thumb.rotation.z = 0.35;
  g.add(thumb);
  const wheel = cyl(0.0105, 0.008, '#b9bdc1', 0.0, 0.0, 0, { metalness: 0.7, roughness: 0.3 });
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(0, 0.0475, 0.026);
  g.add(wheel);
  g.add(box(0.0012, 0.003, 0.04, '#17181a', 0, 0.0505, 0.036));
  return g;
});

// MacBook Air 13" (304 x 215 x 11.3). open = lid angle in degrees (0 = closed).
function macbookAir({ color, keys = '#0d0d0f', open = 105 }) {
  const W = 0.304, D = 0.215, H = 0.0113;
  const g = group(box(W, H, D, color, 0, 0, 0, 0.004, { metalness: 0.7, roughness: 0.35 }));
  g.add(box(0.29, 0.0004, 0.09, keys, 0, H, -0.045, 0.001));
  const pitch = 0.0185;
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 14; c++)
      g.add(box(0.0165, 0.0012, r === 0 ? 0.01 : 0.0165, keys, (c - 6.5) * pitch, H, -0.088 + r * 0.0165 + (r ? 0.0045 : 0), 0.002));
  g.add(box(0.12, 0.0004, 0.078, color, 0, H, 0.062, 0.002, { metalness: 0.6, roughness: 0.2 }));
  const lid = group(
    box(W, D, 0.0056, color, 0, 0, -0.0056, 0.004, { metalness: 0.7, roughness: 0.35 }),
    box(W - 0.012, D - 0.012, 0.0004, '#06070b', 0, 0.006, 0.0001, 0.002, { roughness: 0.1, emissive: '#16264a', emissiveIntensity: 0.8 })
  );
  lid.position.set(0, H, -D / 2 + 0.003);
  lid.rotation.x = THREE.MathUtils.degToRad(90 - open);
  g.add(lid);
  return g;
}
registerModel('macbook_air_space_black', ({ open = 105 } = {}) => macbookAir({ color: '#2c2d31', open }));
registerModel('macbook_air_space_gray', ({ open = 105 } = {}) => macbookAir({ color: '#7e7f83', open }));

// Samsung Xpress M2022W laser printer, 331 x 215 x 178: pale grey body under a
// dark top with the paper output well in the middle.
function label(text, w, h, color) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = Math.round((512 * h) / w);
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.round(c.height * 0.8)}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2, c.width);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6 }));
}
registerModel('samsung_xpress_printer', ({ body = '#d8dadd', top = '#3b3533' } = {}) => {
  const W = 0.331, D = 0.215, H = 0.178, LOW = 0.118; // LOW: where the grey body ends
  const WELL = 0.2, side = (W - WELL) / 2, back = 0.07; // output well in the dark top
  const g = group(box(W, LOW, D, body, 0, 0, 0, 0.008));

  // dark top: a low floor with raised blocks left, right and behind the well
  g.add(box(W - 0.004, 0.03, D - 0.004, '#2a2523', 0, LOW - 0.002, 0));
  for (const sx of [-1, 1]) g.add(box(side + 0.004, H - LOW, D, top, sx * (W - side - 0.004) / 2, LOW, 0, 0.007));
  g.add(box(WELL + 0.004, H - LOW, back, top, 0, LOW, -D / 2 + back / 2));
  g.add(box(WELL, 0.004, 0.012, top, 0, LOW + 0.028, D / 2 - 0.006)); // front lip of the well
  // paper exit slot and the two fold-out paper stops
  g.add(box(WELL - 0.016, 0.014, 0.002, '#0b0a0a', 0, LOW + 0.034, -D / 2 + back));
  for (const sx of [-1, 1]) g.add(box(0.03, 0.003, 0.04, '#4a4441', sx * 0.07, LOW + 0.028, 0.03, 0.001));

  // front: paper tray door with its seams and grip, and the logo
  const front = D / 2 + 0.0004;
  for (const sx of [-1, 1]) g.add(box(0.0012, LOW - 0.02, 0.001, '#aeb1b5', sx * 0.105, 0.008, front - 0.0005));
  g.add(box(0.21, 0.0012, 0.001, '#aeb1b5', 0, 0.008, front - 0.0005));
  g.add(box(0.06, 0.006, 0.003, '#b4b7bb', 0, LOW - 0.012, front - 0.001, 0.001));
  const logo = label('SAMSUNG', 0.062, 0.011, '#23262b');
  logo.position.set(0, 0.062, front + 0.0006);
  g.add(logo);

  // top right: control strip with power and WPS buttons and a status light
  const cx = W / 2 - side / 2;
  g.add(box(0.022, 0.0008, 0.07, '#231f1d', cx, H, 0.045, 0.0004, { roughness: 0.3 }));
  g.add(cyl(0.0075, 0.002, '#2b6fd8', cx, H, 0.062, { emissive: '#1b4fb0', emissiveIntensity: 0.6, roughness: 0.3 }));
  g.add(cyl(0.004, 0.0018, '#c9ccd0', cx, H, 0.04));
  g.add(cyl(0.0016, 0.0012, '#59e07a', cx, H, 0.022, { emissive: '#3bd464', emissiveIntensity: 1 }));
  // top left: NFC tag
  g.add(box(0.024, 0.0006, 0.03, '#2f86c9', -cx, H, 0.055, 0.0003, { roughness: 0.35 }));

  // right side: cooling vents
  for (let i = 0; i < 7; i++) g.add(box(0.001, 0.003, 0.05, '#aeb1b5', W / 2, 0.04 + i * 0.008, -0.035));
  return g;
});

// Xbox One S, 295 x 229 x 63 mm: white console lying flat, smooth left half and a
// perforated right half, disc slot and eject button on the front, black foot with a USB port.
registerModel('xbox_one_s', ({ color = '#f3f4f2' } = {}) => {
  const W = 0.295, D = 0.229, H = 0.063, FOOT = 0.012;
  const g = group(box(W, H - FOOT, D, color, 0, FOOT, 0, 0.006));
  g.add(box(W - 0.012, FOOT, D - 0.012, '#141416', 0, 0, 0, 0.003)); // black foot
  // perforated right half of the top: a grid of tiny dark dots
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = color; x.fillRect(0, 0, 256, 512);
  x.fillStyle = '#7d807d';
  for (let j = 0; j < 64; j++) for (let i = 0; i < 32; i++) { x.beginPath(); x.arc(4 + i * 8 + (j % 2) * 4, 4 + j * 8, 2.2, 0, 7); x.fill(); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const top = new THREE.Mesh(new THREE.PlaneGeometry(W / 2 - 0.004, D - 0.008), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  top.rotation.x = -Math.PI / 2;
  top.position.set(W / 4, H + 0.001, 0);
  g.add(top);
  const front = D / 2 + 0.0004, mid = FOOT + (H - FOOT) / 2;
  g.add(box(W * 0.43, 0.004, 0.002, '#0c0c0e', -W * 0.2, mid - 0.002, front - 0.0008)); // disc slot
  const eject = cyl(0.0042, 0.002, '#e6e7e5', 0.005, 0, front - 0.001);
  eject.rotation.x = Math.PI / 2; eject.position.y = mid;
  g.add(eject);
  // power button with the Xbox sphere, right of the front
  const power = cyl(0.0095, 0.003, '#f7f8f6', W / 2 - 0.028, 0, front - 0.001, { roughness: 0.3 });
  power.rotation.x = Math.PI / 2; power.position.y = mid + 0.0005;
  g.add(power);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0062, 0.0007, 8, 24), mat('#111214'));
  ring.position.set(W / 2 - 0.028, mid + 0.0005, front + 0.0006);
  g.add(ring);
  // USB port and the two small buttons on the black foot
  g.add(box(0.012, 0.0055, 0.002, '#3a3b3f', -W / 2 + 0.022, FOOT / 2 - 0.0028, D / 2 - 0.006 + 0.0004));
  g.add(box(0.008, 0.005, 0.002, '#26272a', W / 2 - 0.045, FOOT / 2 - 0.0025, D / 2 - 0.006 + 0.0004, 0.002));
  g.add(box(0.018, 0.006, 0.002, '#1d1e21', W / 2 - 0.03, FOOT / 2 - 0.003, D / 2 - 0.006 + 0.0004, 0.003));
  return g;
});
