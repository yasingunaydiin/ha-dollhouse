// 20 of IKEA's best-known pieces as procedural models, at their real catalogue
// sizes (metres). Origin on the floor, front facing +z, like every other model.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { registerModel } from './registry.js';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
function box(w, h, d, color, x = 0, y = 0, z = 0, radius = 0) {
  const geo = radius ? new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(x, y + h / 2, z);
  return m;
}
function cyl(rTop, rBottom, h, color, x = 0, y = 0, z = 0, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), mat(color));
  m.position.set(x, y + h / 2, z);
  return m;
}
const group = (...c) => { const g = new THREE.Group(); if (c.length) g.add(...c); return g; };
const anchor = (x, y, z) => { const a = new THREE.Object3D(); a.name = 'light_anchor'; a.position.set(x, y, z); return a; };
const glow = (m) => { m.name = 'glow'; m.material = mat('#fff4dc', { emissive: '#ffc878', emissiveIntensity: 0 }); return m; };
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const WHITE = '#f2f1ec', BLACKBROWN = '#2b2522', BIRCH = '#d9b88a', PINE = '#dcb97c', STEEL = '#b9bdc0', BLACK = '#1f1f22';

// IKEA names that get an "IKEA" filter in the furniture sidebar
export const IKEA_MODELS = [
  'billy_bookcase', 'kallax_shelf', 'malm_dresser', 'malm_bed', 'lack_side_table', 'ektorp_sofa', 'strandmon_chair',
  'pax_wardrobe', 'besta_tv_bench', 'alex_desk', 'linnmon_table', 'rast_nightstand', 'adde_chair', 'lisabo_table',
  'ivar_shelving', 'hektar_floor_lamp', 'trofast_storage', 'bekant_desk', 'klippan_loveseat', 'vittsjo_shelf', 'elvarli_shelf', 'elvarli_unit', 'poang_armchair', 'poang_footstool', 'vecklarfly_blinds', 'vecklarfly_blinds_dark', 'tarnaby_table_lamp', 'runnen_decking',
];

// BILLY bookcase 80 x 28 x 202, with a few books
registerModel('billy_bookcase', ({ width = 0.8, height = 2.02, color = WHITE, books = true } = {}) => {
  const d = 0.28, t = 0.02, g = group();
  g.add(box(t, height, d, color, -width / 2 + t / 2), box(t, height, d, color, width / 2 - t / 2));
  g.add(box(width, t, d, color, 0, height - t), box(width, t, d, color, 0, 0.03), box(width - 0.02, height, 0.006, '#e4e2da', 0, 0, -d / 2 + 0.003));
  const ys = [0.43, 0.83, 1.23, 1.63];
  for (const y of ys) g.add(box(width - 2 * t, t, d - 0.02, color, 0, y, 0.005));
  if (books) {
    const r = rng(7), palette = ['#c0504d', '#3f6fa8', '#e0b64a', '#4d7d5a', '#2f2f35', '#a77ac2'];
    for (const y of [0.05, 0.45, 1.25]) {
      let x = -width / 2 + 0.04;
      const fill = 0.3 + r() * 0.4;
      while (x < -width / 2 + 0.04 + (width - 0.08) * fill) {
        const bw = 0.02 + r() * 0.03, bh = 0.22 + r() * 0.1;
        g.add(box(bw, bh, 0.2, palette[Math.floor(r() * palette.length)], x + bw / 2, y + 0.02, 0));
        x += bw + 0.002;
      }
    }
  }
  return g;
});

// KALLAX cube shelf, 77 x 39 x 147 for 2 x 4
registerModel('kallax_shelf', ({ cols = 2, rows = 4, color = WHITE } = {}) => {
  const t = 0.038, w = cols * 0.368 + t, h = rows * 0.358 + t, d = 0.39, g = group();
  g.add(box(w, h, 0.01, '#e4e2da', 0, 0, -d / 2 + 0.005));
  for (let i = 0; i <= cols; i++) g.add(box(t, h, d, color, -w / 2 + t / 2 + i * 0.368, 0, 0));
  for (let j = 0; j <= rows; j++) g.add(box(w, t, d, color, 0, j * 0.358, 0));
  return g;
});

// MALM chest of 6 drawers, 160 x 48 x 78
registerModel('malm_dresser', ({ width = 1.6, color = WHITE } = {}) => {
  const g = group(box(width, 0.74, 0.48, color, 0, 0.04, 0), box(width - 0.06, 0.04, 0.42, '#3a3a3a', 0, 0, 0));
  g.add(box(width + 0.02, 0.02, 0.5, color, 0, 0.78 - 0.02, 0));
  const cols = 2, rows = 3, cw = (width - 0.04) / cols, rh = 0.68 / rows;
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++) {
      const x = -width / 2 + 0.02 + cw * (c + 0.5), y = 0.06 + rh * r;
      g.add(box(cw - 0.012, rh - 0.01, 0.012, '#ecebe5', x, y, 0.242));
      g.add(box(cw * 0.45, 0.012, 0.01, '#2a2a2a', x, y + rh - 0.04, 0.25));
    }
  return g;
});

// MALM bed frame for a 160 x 200 mattress, head at -z
registerModel('malm_bed', ({ width = 1.69, length = 2.09, color = '#3a2c25', bedding = '#e8e3d8' } = {}) => {
  const g = group();
  g.add(box(width, 0.22, length, color, 0, 0.1, 0));
  g.add(box(width, 0.9, 0.05, color, 0, 0.1, -length / 2 + 0.025, 0.01));
  g.add(box(width - 0.12, 0.2, length - 0.2, bedding, 0, 0.32, 0.04, 0.05));
  g.add(box(width - 0.12, 0.02, 0.7, '#c9c2b4', 0, 0.51, 0.62));
  g.add(box(0.6, 0.14, 0.4, '#f4f2ec', -0.35, 0.5, -0.8, 0.05), box(0.6, 0.14, 0.4, '#f4f2ec', 0.35, 0.5, -0.8, 0.05));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.05, 0.1, 0.05, color, sx * (width / 2 - 0.05), 0, sz * (length / 2 - 0.05)));
  return g;
});

// LACK side table 55 x 55 x 45
registerModel('lack_side_table', ({ color = BLACK } = {}) =>
  group(box(0.55, 0.05, 0.55, color, 0, 0.4), box(0.45, 0.01, 0.45, '#4a4a4e', 0, 0.2),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => box(0.05, 0.4, 0.05, color, x * 0.25, 0, z * 0.25))));

// EKTORP three-seat sofa 218 x 88 x 88
registerModel('ektorp_sofa', ({ color = '#e4ddd0', accent = '#c9a24a' } = {}) => {
  const g = group();
  g.add(box(2.18, 0.14, 0.88, '#3a3430', 0, 0.06, 0), box(2.18, 0.34, 0.88, color, 0, 0.14, 0, 0.05));
  g.add(box(2.18, 0.5, 0.24, color, 0, 0.4, -0.32, 0.07));
  for (const sx of [-1, 1]) g.add(box(0.2, 0.3, 0.88, color, sx * 1.0, 0.4, 0, 0.07));
  for (const x of [-0.6, 0, 0.6]) g.add(box(0.58, 0.16, 0.64, color, x, 0.45, 0.1, 0.06));
  for (const x of [-0.6, 0, 0.6]) g.add(box(0.56, 0.4, 0.14, color, x, 0.6, -0.16, 0.06));
  g.add(box(0.4, 0.36, 0.12, accent, 0.8, 0.6, -0.04, 0.05));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(0.025, 0.02, 0.1, '#2b2522', sx * 1.02, 0, sz * 0.38, 8));
  return g;
});

// STRANDMON wing chair 82 x 96 x 101
registerModel('strandmon_chair', ({ color = '#4f6b5a' } = {}) => {
  const g = group();
  g.add(box(0.82, 0.3, 0.8, color, 0, 0.26, 0.06, 0.05), box(0.82, 0.7, 0.2, color, 0, 0.36, -0.36, 0.08));
  g.add(box(0.2, 0.52, 0.55, color, -0.31, 0.5, -0.1, 0.07), box(0.2, 0.52, 0.55, color, 0.31, 0.5, -0.1, 0.07));
  g.add(box(0.44, 0.14, 0.46, color, 0, 0.46, 0.14, 0.05));
  g.add(box(0.5, 0.5, 0.1, color, 0, 0.62, -0.28, 0.08));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(0.022, 0.016, 0.28, '#6a4a30', sx * 0.34, 0, sz * 0.4, 8));
  return g;
});

// PAX wardrobe 100 x 58 x 201
registerModel('pax_wardrobe', ({ width = 1.0, height = 2.01, doors = 2, color = WHITE } = {}) => {
  const g = group(box(width, height - 0.08, 0.58, color, 0, 0.08), box(width - 0.06, 0.08, 0.5, '#3a3a3a', 0, 0, -0.02));
  const dw = width / doors;
  for (let i = 0; i < doors; i++) {
    const x = -width / 2 + dw * (i + 0.5);
    g.add(box(dw - 0.008, height - 0.12, 0.018, '#ecebe5', x, 0.1, 0.29));
    g.add(box(0.015, 0.4, 0.02, STEEL, x + (i % 2 ? -1 : 1) * (dw / 2 - 0.05), height * 0.45, 0.305));
  }
  return g;
});

// BESTÅ TV bench 180 x 42 x 39 on legs
registerModel('besta_tv_bench', ({ length = 1.8, color = '#2f2f33' } = {}) => {
  const g = group(box(length, 0.27, 0.42, color, 0, 0.1, 0, 0.01), box(length + 0.01, 0.02, 0.43, '#38383c', 0, 0.37));
  for (const sx of [-1, 1]) g.add(cyl(0.02, 0.016, 0.1, '#1a1a1c', sx * (length / 2 - 0.1), 0, 0, 8));
  const n = 4, dw = (length - 0.02) / n;
  for (let i = 0; i < n; i++) g.add(box(dw - 0.008, 0.23, 0.014, '#3b3b40', -length / 2 + 0.01 + dw * (i + 0.5), 0.12, 0.214));
  return g;
});

// ALEX desk 131 x 60 x 76 with a drawer unit on the right
registerModel('alex_desk', ({ color = WHITE } = {}) => {
  const g = group(box(1.31, 0.03, 0.6, color, 0, 0.73));
  g.add(box(0.03, 0.73, 0.55, color, -0.64, 0, 0));
  g.add(box(0.42, 0.66, 0.55, color, 0.45, 0.07, 0));
  g.add(box(0.42, 0.07, 0.5, '#3a3a3a', 0.45, 0, 0));
  for (const y of [0.1, 0.27, 0.44, 0.58]) {
    g.add(box(0.4, 0.015, 0.01, '#d8d6ce', 0.45, y, 0.277));
    g.add(box(0.14, 0.012, 0.015, STEEL, 0.45, y + 0.06, 0.285));
  }
  g.add(box(1.0, 0.45, 0.012, '#e6e4dc', -0.13, 0.28, -0.26));
  return g;
});

// LINNMON table top on four legs, 150 x 75 x 74
registerModel('linnmon_table', ({ length = 1.5, width = 0.75, color = WHITE } = {}) =>
  group(box(length, 0.035, width, color, 0, 0.705),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => cyl(0.025, 0.02, 0.705, '#cfcdc6', x * (length / 2 - 0.06), 0, z * (width / 2 - 0.06), 10))));

// RAST nightstand, 3 drawers, 44 x 28 x 62
registerModel('rast_nightstand', ({ color = PINE } = {}) => {
  const g = group(box(0.44, 0.62, 0.28, color, 0, 0));
  for (const y of [0.03, 0.23, 0.43]) {
    g.add(box(0.4, 0.17, 0.012, '#e5c993', 0, y + 0.01, 0.14));
    g.add(box(0.05, 0.05, 0.02, '#8a6a3f', 0, y + 0.07, 0.155));
  }
  return g;
});

// ADDE chair 39 x 47 x 77
registerModel('adde_chair', ({ color = BLACK } = {}) => {
  const g = group(box(0.39, 0.03, 0.39, color, 0, 0.44, 0.02, 0.01));
  g.add(box(0.37, 0.3, 0.025, color, 0, 0.47, -0.17, 0.01));
  g.add(box(0.03, 0.44, 0.03, color, -0.17, 0, 0.17), box(0.03, 0.44, 0.03, color, 0.17, 0, 0.17));
  g.add(box(0.03, 0.77, 0.03, color, -0.17, 0, -0.18), box(0.03, 0.77, 0.03, color, 0.17, 0, -0.18));
  g.add(box(0.37, 0.025, 0.025, color, 0, 0.2, 0.17));
  return g;
});

// LISABO table 140 x 78 x 74, ash veneer
registerModel('lisabo_table', ({ length = 1.4, width = 0.78, color = '#c9a373' } = {}) => {
  const g = group(box(length, 0.03, width, color, 0, 0.71));
  for (const sx of [-1, 1]) {
    g.add(box(0.05, 0.71, 0.05, '#a98353', sx * (length / 2 - 0.1), 0, -width / 2 + 0.1));
    g.add(box(0.05, 0.71, 0.05, '#a98353', sx * (length / 2 - 0.1), 0, width / 2 - 0.1));
    g.add(box(0.03, 0.08, width - 0.18, '#a98353', sx * (length / 2 - 0.1), 0.62, 0));
  }
  return g;
});

// IVAR shelving unit 89 x 30 x 179, raw pine
registerModel('ivar_shelving', ({ width = 0.89, height = 1.79, shelves = 5 } = {}) => {
  const g = group(), d = 0.3;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.035, height, 0.035, PINE, sx * (width / 2 - 0.0175), 0, sz * (d / 2 - 0.0175)));
  for (let i = 0; i < shelves; i++) g.add(box(width, 0.02, d, '#e6c58a', 0, 0.12 + ((height - 0.2) / (shelves - 1)) * i, 0));
  for (const y of [0.4, 1.0]) g.add(box(width - 0.05, 0.012, 0.02, PINE, 0, y, d / 2 - 0.02));
  return g;
});

// HEKTAR floor lamp with 3 spotlights, dark grey: round base, slim pole, three
// conical spot shades on short arms (top left, middle right, low left), ~1.7 m.
registerModel('hektar_floor_lamp', ({ color = '#3a3c3f', height = 1.68 } = {}) => {
  const g = group();
  const metal = () => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.35 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.165, 0.035, 36), metal());
  base.position.y = 0.0175;
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.14, 0.03, 36), metal());
  dome.position.y = 0.05;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, height, 12), metal());
  pole.position.y = height / 2;
  g.add(base, dome, pole);
  let first = true;
  // y = height of the shade's rim centre on the pole, side = -1 left / +1 right
  for (const [y, side, tilt] of [[height - 0.09, -1, 38], [1.2, 1, 52], [0.88, -1, 48]]) {
    const clamp = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 16), metal());
    clamp.position.y = y;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.12, 8), metal());
    arm.rotation.z = Math.PI / 2; arm.position.set(side * 0.06, y, 0);
    const spot = group();
    spot.position.set(side * 0.14, y, 0);
    spot.rotation.z = side * THREE.MathUtils.degToRad(tilt);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.085, 0.13, 32, 1, true), new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }));
    cone.position.y = -0.0;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), metal());
    cap.position.y = 0.065;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.004, 8, 32), metal());
    rim.rotation.x = Math.PI / 2; rim.position.y = -0.065;
    const lit = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#ffd9a0', emissiveIntensity: 0 }));
    lit.name = 'glow'; lit.position.y = -0.04;
    spot.add(cone, cap, rim, lit);
    if (first) { spot.add(anchor(0, -0.12, 0)); first = false; }
    g.add(clamp, arm, spot);
  }
  return g;
});

// TROFAST storage frame with bins, 94 x 44 x 91
registerModel('trofast_storage', ({ frame = PINE } = {}) => {
  const g = group();
  g.add(box(0.02, 0.91, 0.44, frame, -0.46, 0), box(0.02, 0.91, 0.44, frame, 0.46, 0), box(0.94, 0.02, 0.44, frame, 0, 0.89), box(0.94, 0.02, 0.44, frame, 0, 0));
  g.add(box(0.02, 0.89, 0.44, frame, 0, 0));
  const cols = ['#e8e3d8', '#3f73c9', '#d9534f', '#4d9a5b'];
  [[-0.23, 0.02], [-0.23, 0.31], [-0.23, 0.6], [0.23, 0.02], [0.23, 0.31]].forEach(([x, y], i) => {
    g.add(box(0.4, 0.26, 0.012, cols[i % cols.length], x, y + 0.01, 0.225));
    g.add(box(0.14, 0.02, 0.016, '#f4f1ea', x, y + 0.2, 0.232));
  });
  return g;
});

// BEKANT desk 160 x 80, black T-legs
registerModel('bekant_desk', ({ length = 1.6, width = 0.8, height = 0.74, color = WHITE } = {}) => {
  const g = group(box(length, 0.025, width, color, 0, height - 0.025));
  for (const sx of [-1, 1]) {
    g.add(box(0.05, height - 0.03, 0.05, BLACK, sx * (length / 2 - 0.1), 0, 0));
    g.add(box(0.05, 0.03, width - 0.1, BLACK, sx * (length / 2 - 0.1), 0, 0));
  }
  g.add(box(length - 0.2, 0.05, 0.04, BLACK, 0, height - 0.08, -width / 2 + 0.1));
  return g;
});

// KLIPPAN two-seat sofa 180 x 88 x 66
registerModel('klippan_loveseat', ({ color = '#cfd3d6' } = {}) => {
  const g = group(box(1.8, 0.4, 0.88, color, 0, 0.16, 0, 0.04), box(1.8, 0.38, 0.14, color, 0, 0.3, -0.37, 0.05));
  for (const sx of [-1, 1]) g.add(box(0.14, 0.2, 0.88, color, sx * 0.83, 0.4, 0, 0.04));
  for (const x of [-0.36, 0.36]) g.add(box(0.7, 0.14, 0.7, color, x, 0.5, 0.06, 0.05));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.04, 0.16, 0.04, '#2b2522', sx * 0.84, 0, sz * 0.4));
  return g;
});

// VITTSJÖ shelf unit 52 x 36 x 175, black metal and glass
registerModel('vittsjo_shelf', ({ width = 0.52, height = 1.75, shelves = 4 } = {}) => {
  const g = group(), d = 0.36;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.02, height, 0.02, '#2a2420', sx * (width / 2 - 0.01), 0, sz * (d / 2 - 0.01)));
  for (let i = 0; i < shelves; i++) {
    const y = 0.15 + ((height - 0.2) / (shelves - 1)) * i;
    const pane = box(width, 0.012, d, '#cfe0e6', 0, y);
    pane.material = mat('#cfe0e6', { transparent: true, opacity: 0.45, roughness: 0.1 });
    g.add(pane);
  }
  return g;
});

const BAMBOO = '#c8964f';

// ELVARLI shelf: the bamboo plank on its own, 80 x 36 x 2.5
registerModel('elvarli_shelf', ({ width = 0.8, depth = 0.36 } = {}) =>
  group(box(width, 0.025, depth, BAMBOO, 0, 0, 0, 0.004), box(width - 0.004, 0.003, depth - 0.004, '#b3813f', 0, 0.0, 0)));

// ELVARLI open unit: two black steel uprights on floor bars, bamboo shelves, optional clothes rail.
// 84 x 51 x 175 for one 80 cm section.
registerModel('elvarli_unit', ({ width = 0.8, height = 1.75, shelves = 4, rail = true } = {}) => {
  const g = group(), D = 0.51, shelfD = 0.36, post = 0.025;
  const steel = '#26272a';
  for (const sx of [-1, 1]) {
    const x = sx * (width / 2 + post / 2);
    g.add(box(post, height, post, steel, x, 0, -D / 2 + 0.05));
    g.add(box(post, 0.03, D, steel, x, 0, 0));
    for (let i = 0; i < shelves; i++) g.add(box(post + 0.01, 0.02, 0.06, steel, x, 0.2 + i * ((height - 0.5) / Math.max(shelves - 1, 1)) - 0.02, -D / 2 + 0.05));
  }
  for (let i = 0; i < shelves; i++) {
    const y = 0.2 + i * ((height - 0.5) / Math.max(shelves - 1, 1));
    g.add(box(width, 0.025, shelfD, BAMBOO, 0, y, -D / 2 + 0.05 + shelfD / 2 - 0.02, 0.004));
  }
  g.add(box(width, 0.025, shelfD, BAMBOO, 0, height - 0.025, -D / 2 + 0.05 + shelfD / 2 - 0.02, 0.004));
  if (rail) {
    const r = cyl(0.012, 0.012, width, '#9aa0a4', 0, 0, 0, 10);
    r.rotation.z = Math.PI / 2;
    r.position.set(0, height - 0.3, 0.04);
    g.add(r);
  }
  return g;
});

// flat bentwood ribbon along a path drawn in the side (y-z) plane, at x
function ribbon(path, x, color, width = 0.055, thick = 0.02) {
  const pts = path.map(([z, y]) => new THREE.Vector3(0, y, z));
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, thick / 2, 8), mat(color, { roughness: 0.55 }));
  m.scale.x = width / thick;
  m.position.x = x;
  return m;
}

// POÄNG armchair, 68 x 82 x 100: layer-glued bentwood frame in black with black cushions
registerModel('poang_armchair', ({ frame = '#1b1b1d', cushion = '#222226' } = {}) => {
  const g = group(), X = 0.3;
  for (const sx of [-1, 1]) {
    g.add(ribbon([[0.32, 0.012], [0.32, 0.18], [0.26, 0.45], [0.08, 0.55], [-0.18, 0.5], [-0.34, 0.3], [-0.38, 0.06], [-0.38, 0.012]], sx * X, frame));
    g.add(ribbon([[0.32, 0.012], [0.0, 0.012], [-0.38, 0.012]], sx * X, frame));
    g.add(ribbon([[-0.38, 0.012], [-0.4, 0.4], [-0.45, 0.75], [-0.52, 1.0]], sx * X, frame));
  }
  g.add(box(0.56, 0.03, 0.03, frame, 0, 0.5, 0.18), box(0.56, 0.03, 0.03, frame, 0, 0.3, -0.34));
  const seat = box(0.56, 0.12, 0.56, cushion, 0, 0, 0, 0.05);
  seat.position.set(0, 0.4, 0.0);
  seat.rotation.x = -0.1;
  const back = box(0.56, 0.66, 0.1, cushion, 0, 0, 0, 0.05);
  back.position.set(0, 0.62, -0.4);
  back.rotation.x = -0.2;
  g.add(seat, back);
  return g;
});

// POÄNG footstool, 68 x 54 x 39, same black frame
registerModel('poang_footstool', ({ frame = '#1b1b1d', cushion = '#222226' } = {}) => {
  const g = group(), X = 0.3;
  for (const sx of [-1, 1]) {
    g.add(ribbon([[0.22, 0.012], [0.25, 0.16], [0.14, 0.3], [-0.14, 0.3], [-0.25, 0.16], [-0.22, 0.012]], sx * X, frame));
    g.add(ribbon([[0.22, 0.012], [0.0, 0.012], [-0.22, 0.012]], sx * X, frame));
  }
  g.add(box(0.6, 0.03, 0.03, frame, 0, 0.0, 0.22), box(0.6, 0.03, 0.03, frame, 0, 0.0, -0.22));
  g.add(box(0.58, 0.1, 0.5, cushion, 0, 0.29, 0, 0.045));
  return g;
});
