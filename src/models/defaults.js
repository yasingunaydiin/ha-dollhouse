// Default procedural models: simple, cozy, low-poly stand-ins.
// Replace any of them later by pointing an object at a .glb file instead.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { registerModel } from './registry.js';

const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });

// box sitting on y, centred on x/z
function box(w, h, d, color, x = 0, y = 0, z = 0, radius = 0) {
  const geo = radius
    ? new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, w / 2, h / 2, d / 2))
    : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(x, y + h / 2, z);
  return m;
}

function cyl(rTop, rBottom, h, color, x = 0, y = 0, z = 0, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), mat(color));
  m.position.set(x, y + h / 2, z);
  return m;
}

function group(...children) {
  const g = new THREE.Group();
  if (children.length) g.add(...children);
  return g;
}

function legs(w, d, h, color, r = 0.025) {
  const out = [];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) out.push(cyl(r, r, h, color, (sx * w) / 2, 0, (sz * d) / 2, 8));
  return out;
}

function anchor(x, y, z) {
  const a = new THREE.Object3D();
  a.name = 'light_anchor';
  a.position.set(x, y, z);
  return a;
}

function glow(mesh) {
  mesh.name = 'glow';
  mesh.material = mat('#fff4dc', { emissive: '#ffc878', emissiveIntensity: 0 });
  return mesh;
}

const WOOD = '#c69c6d';
const WOOD_DARK = '#8a6240';
const WHITE = '#f4f1ea';
const METAL = '#3c3a38';

registerModel('sofa', ({ color = '#e6ddd0', accent = '#e0a35c' } = {}) =>
  group(
    box(2.0, 0.28, 0.9, color, 0, 0.08, 0, 0.06),
    box(2.0, 0.5, 0.22, color, 0, 0.3, -0.34, 0.08),
    box(0.2, 0.42, 0.9, color, -0.9, 0.2, 0, 0.08),
    box(0.2, 0.42, 0.9, color, 0.9, 0.2, 0, 0.08),
    box(0.78, 0.14, 0.62, color, -0.4, 0.34, 0.1, 0.06),
    box(0.78, 0.14, 0.62, color, 0.4, 0.34, 0.1, 0.06),
    box(0.36, 0.34, 0.12, accent, -0.55, 0.46, -0.16, 0.05),
    box(0.36, 0.34, 0.12, '#8fb0b8', 0.55, 0.46, -0.16, 0.05),
    ...legs(1.8, 0.7, 0.08, WOOD_DARK)
  )
);

registerModel('coffee_table', () =>
  group(
    box(1.0, 0.05, 0.55, WOOD, 0, 0.36, 0, 0.02),
    box(0.9, 0.03, 0.45, WOOD, 0, 0.14, 0),
    ...legs(0.88, 0.43, 0.36, WOOD_DARK),
    box(0.22, 0.03, 0.16, '#c9574b', -0.2, 0.41, 0.05),
    cyl(0.05, 0.04, 0.09, WHITE, 0.25, 0.41, -0.05)
  )
);

registerModel('tv_stand', () => {
  const screen = box(1.25, 0.72, 0.04, '#15171a', 0, 0.62, 0);
  screen.name = 'screen';
  return group(
    box(1.8, 0.42, 0.4, WHITE, 0, 0.06, 0, 0.02),
    box(1.8, 0.03, 0.42, WOOD, 0, 0.48, 0),
    ...legs(1.6, 0.3, 0.06, WOOD_DARK),
    box(0.3, 0.1, 0.16, METAL, 0, 0.51, 0),
    screen
  );
});

registerModel('rug', ({ size = [2, 1.4], color = '#b9c4b4' } = {}) => {
  const g = group(box(size[0], 0.02, size[1], color, 0, 0, 0));
  g.add(box(size[0] - 0.3, 0.022, size[1] - 0.3, new THREE.Color(color).offsetHSL(0, 0, 0.05)));
  g.children.forEach((c) => (c.userData.noShadow = true));
  return g;
});

registerModel('floor_lamp', () =>
  group(
    cyl(0.16, 0.18, 0.03, METAL),
    cyl(0.015, 0.015, 1.45, METAL, 0, 0.03, 0, 8),
    glow(cyl(0.16, 0.24, 0.3, WHITE, 0, 1.4, 0)),
    anchor(0, 1.45, 0)
  )
);

registerModel('table_lamp', () =>
  group(
    cyl(0.06, 0.08, 0.16, '#c98f6b'),
    glow(cyl(0.09, 0.14, 0.18, WHITE, 0, 0.16, 0)),
    anchor(0, 0.28, 0)
  )
);

registerModel('ceiling_light', ({ height = 2.5, drop = 0.55 } = {}) =>
  group(
    cyl(0.006, 0.006, drop, METAL, 0, height - drop, 0, 6),
    glow(cyl(0.08, 0.24, 0.18, WHITE, 0, height - drop - 0.18, 0)),
    anchor(0, height - drop - 0.25, 0)
  )
);

registerModel('chair', ({ color = WOOD } = {}) =>
  group(
    box(0.42, 0.04, 0.42, color, 0, 0.44, 0, 0.015),
    box(0.42, 0.42, 0.04, color, 0, 0.5, -0.19, 0.015),
    ...legs(0.36, 0.36, 0.44, WOOD_DARK, 0.02)
  )
);

registerModel('dining_set', () => {
  const g = group(
    box(1.5, 0.05, 0.85, WOOD, 0, 0.72, 0, 0.02),
    ...legs(1.36, 0.7, 0.72, WOOD_DARK, 0.03),
    cyl(0.12, 0.08, 0.06, '#7fa58a', 0, 0.77, 0)
  );
  const chair = (x, z, rot) => {
    const c = group(
      box(0.42, 0.04, 0.42, WHITE, 0, 0.44, 0, 0.015),
      box(0.42, 0.42, 0.04, WHITE, 0, 0.5, -0.19, 0.015),
      ...legs(0.36, 0.36, 0.44, WOOD_DARK, 0.02)
    );
    c.position.set(x, 0, z);
    c.rotation.y = rot;
    return c;
  };
  g.add(
    chair(-0.38, -0.62, 0),
    chair(0.38, -0.62, 0),
    chair(-0.38, 0.62, Math.PI),
    chair(0.38, 0.62, Math.PI)
  );
  return g;
});

registerModel('kitchen_counter', ({ length = 3, plain = false } = {}) => {
  const g = group(
    box(length, 0.82, 0.6, WHITE, 0, 0.08, 0),
    box(length - 0.04, 0.08, 0.54, METAL, 0, 0, -0.02),
    box(length + 0.02, 0.04, 0.64, WOOD, 0, 0.9, 0)
  );
  const n = Math.round(length / 0.6);
  for (let i = 1; i < n; i++)
    g.add(box(0.008, 0.78, 0.01, '#d8d2c6', -length / 2 + (i * length) / n, 0.1, 0.3));
  if (plain) return g;
  // sink + hob
  g.add(box(0.5, 0.01, 0.36, '#aeb6b8', -length / 4, 0.94, 0));
  g.add(cyl(0.012, 0.012, 0.22, '#9aa2a4', -length / 4, 0.94, -0.22, 8));
  g.add(box(0.56, 0.012, 0.44, '#1c1c1e', length / 4, 0.94, 0));
  g.add(cyl(0.11, 0.12, 0.12, '#c9574b', length / 4 - 0.12, 0.952, 0.05));
  return g;
});

registerModel('fridge', () =>
  group(
    box(0.7, 1.85, 0.68, '#dfe3e4', 0, 0, 0, 0.03),
    box(0.66, 0.008, 0.01, '#aab0b2', 0, 1.2, 0.34),
    box(0.02, 0.5, 0.03, '#8f9698', -0.27, 1.3, 0.35),
    box(0.02, 0.4, 0.03, '#8f9698', -0.27, 0.7, 0.35)
  )
);

registerModel('bed', ({ color = '#8fb0c4' } = {}) =>
  group(
    box(1.7, 0.25, 2.1, WOOD, 0, 0.08, 0, 0.03),
    box(1.7, 0.95, 0.08, WOOD, 0, 0, -1.05, 0.03),
    box(1.6, 0.2, 2.0, WHITE, 0, 0.3, 0, 0.06),
    box(1.64, 0.1, 1.3, color, 0, 0.44, 0.36, 0.05),
    box(1.64, 0.1, 0.25, '#e9c46a', 0, 0.445, -0.2, 0.05),
    box(0.62, 0.12, 0.4, WHITE, -0.4, 0.5, -0.72, 0.05),
    box(0.62, 0.12, 0.4, WHITE, 0.4, 0.5, -0.72, 0.05),
    ...legs(1.5, 1.9, 0.08, WOOD_DARK, 0.03)
  )
);

registerModel('nightstand', () =>
  group(
    box(0.45, 0.42, 0.4, WOOD, 0, 0.08, 0, 0.02),
    box(0.38, 0.14, 0.01, WOOD_DARK, 0, 0.3, 0.2),
    ...legs(0.36, 0.3, 0.08, WOOD_DARK, 0.02)
  )
);

registerModel('wardrobe', () =>
  group(
    box(1.4, 2.0, 0.6, WOOD, 0, 0.04, 0, 0.02),
    box(0.008, 1.9, 0.01, WOOD_DARK, 0, 0.09, 0.3),
    box(0.02, 0.3, 0.03, METAL, -0.06, 0.95, 0.31),
    box(0.02, 0.3, 0.03, METAL, 0.06, 0.95, 0.31)
  )
);

registerModel('plant', () => {
  const g = group(cyl(0.16, 0.12, 0.28, '#c98f6b'), cyl(0.02, 0.02, 0.4, '#6b4f36', 0, 0.28, 0, 6));
  const leaves = [
    [0, 0.85, 0, 0.3],
    [0.16, 0.68, 0.08, 0.2],
    [-0.15, 0.72, -0.06, 0.22],
    [0.02, 0.62, -0.17, 0.17],
  ];
  for (const [x, y, z, r] of leaves) {
    const m = new THREE.Mesh(
      new THREE.IcosahedronGeometry(r, 1),
      mat('#6f9b63', { flatShading: true })
    );
    m.position.set(x, y, z);
    g.add(m);
  }
  return g;
});

registerModel('bathtub', () =>
  group(
    box(1.7, 0.55, 0.75, WHITE, 0, 0, 0, 0.1),
    box(1.5, 0.02, 0.55, '#bfe0e6', 0, 0.54, 0, 0.01),
    cyl(0.015, 0.015, 0.2, '#9aa2a4', -0.75, 0.55, 0, 8)
  )
);

registerModel('toilet', () =>
  group(
    box(0.38, 0.4, 0.2, WHITE, 0, 0.4, -0.15, 0.03),
    box(0.36, 0.4, 0.5, WHITE, 0, 0, 0.12, 0.1),
    box(0.38, 0.03, 0.46, '#e2ded5', 0, 0.4, 0.14, 0.01)
  )
);

registerModel('vanity', () =>
  group(
    box(0.8, 0.7, 0.45, WOOD, 0, 0.12, 0, 0.02),
    box(0.84, 0.05, 0.48, WHITE, 0, 0.82, 0, 0.02),
    box(0.4, 0.01, 0.28, '#cfd8d6', 0, 0.872, 0.02),
    cyl(0.012, 0.012, 0.16, '#9aa2a4', 0, 0.87, -0.16, 8),
    box(0.6, 0.7, 0.02, '#cfe3ea', 0, 1.15, -0.2)
  )
);

// L-shaped sofa: long part along x with its back at -z, chaise at the -x end
registerModel('corner_sofa', ({ length = 2.9, color = '#8b93a8', accent = '#e0a35c' } = {}) => {
  const L = length;
  const g = group(
    box(L, 0.28, 0.9, color, 0, 0.08, 0, 0.06),
    box(L, 0.5, 0.22, color, 0, 0.3, -0.34, 0.08),
    box(0.2, 0.42, 0.9, color, L / 2 - 0.1, 0.2, 0, 0.08),
    box(0.9, 0.28, 0.95, color, -L / 2 + 0.45, 0.08, 0.92, 0.06),
    box(0.2, 0.5, 1.85, color, -L / 2 + 0.1, 0.3, 0.47, 0.08),
    box(0.36, 0.34, 0.12, accent, L / 2 - 0.5, 0.46, -0.16, 0.05),
    box(0.36, 0.34, 0.12, '#dfe3ea', -L / 2 + 0.6, 0.46, -0.16, 0.05)
  );
  const n = 3;
  for (let i = 0; i < n; i++)
    g.add(box((L - 0.3) / n - 0.04, 0.14, 0.62, color, -L / 2 + 0.2 + ((i + 0.5) * (L - 0.3)) / n, 0.34, 0.1, 0.06));
  return g;
});

registerModel('round_dining', ({ radius = 0.6 } = {}) => {
  const g = group(
    cyl(radius, radius, 0.05, WOOD, 0, 0.72, 0, 40),
    cyl(0.06, 0.08, 0.7, WOOD_DARK, 0, 0.02, 0, 12),
    cyl(0.3, 0.32, 0.03, WOOD_DARK, 0, 0, 0, 24),
    cyl(0.12, 0.08, 0.06, '#7fa58a', 0, 0.77, 0)
  );
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const c = group(
      box(0.42, 0.04, 0.42, WHITE, 0, 0.44, 0, 0.015),
      box(0.42, 0.42, 0.04, WHITE, 0, 0.5, -0.19, 0.015),
      ...legs(0.36, 0.36, 0.44, WOOD_DARK, 0.02)
    );
    c.position.set(Math.sin(a) * (radius + 0.25), 0, Math.cos(a) * (radius + 0.25));
    c.rotation.y = a + Math.PI;
    g.add(c);
  }
  return g;
});

// straight flight climbing towards +z
registerModel('stairs', ({ width = 0.9, run = 1.5, rise = 2.9, steps = 13 } = {}) => {
  const g = group();
  const d = run / steps, h = rise / steps;
  for (let i = 0; i < steps; i++)
    g.add(box(width, h * (i + 1), d, i % 2 ? WOOD : '#d2ab7e', 0, 0, -run / 2 + (i + 0.5) * d));
  return g;
});

registerModel('solar_panel', ({ tilt = 12 } = {}) => {
  const panel = group(
    box(1.08, 0.04, 1.78, '#c9ccd1', 0, 0, 0),
    box(1.02, 0.045, 1.72, '#16264d', 0, 0, 0)
  );
  panel.children[1].name = 'cells';
  panel.rotation.x = THREE.MathUtils.degToRad(tilt);
  panel.position.y = 0.28;
  return group(panel, box(1.0, 0.08, 0.1, '#55585e', 0, 0, 0.8), box(1.0, 0.44, 0.06, '#55585e', 0, 0, -0.82));
});

registerModel('desk', () => {
  const screen = box(0.62, 0.36, 0.03, '#15171a', 0, 0.86, -0.18);
  screen.name = 'screen';
  return group(
    box(1.6, 0.04, 0.7, WOOD, 0, 0.72, 0, 0.015),
    ...legs(1.5, 0.6, 0.72, METAL, 0.02),
    box(0.2, 0.02, 0.14, METAL, 0, 0.76, -0.18),
    box(0.04, 0.1, 0.03, METAL, 0, 0.77, -0.19),
    screen,
    box(0.42, 0.015, 0.14, '#e6e6e6', 0, 0.76, 0.12)
  );
});

registerModel('server_rack', () => {
  const g = group(box(0.6, 1.3, 0.85, '#2a2d33', 0, 0, 0, 0.02));
  for (let i = 0; i < 5; i++) {
    g.add(box(0.5, 0.012, 0.01, '#4a4f58', 0, 0.25 + i * 0.2, 0.43));
    const led = box(0.03, 0.03, 0.012, '#5cf08a', 0.2, 0.3 + i * 0.2, 0.43);
    led.material.emissive = new THREE.Color('#5cf08a');
    led.material.emissiveIntensity = 1.5;
    g.add(led);
  }
  return g;
});

registerModel('christmas_tree', () => {
  const g = group(cyl(0.03, 0.03, 0.08, WOOD_DARK));
  [[0.2, 0.22, 0.06], [0.15, 0.2, 0.2], [0.1, 0.18, 0.33]].forEach(([r, h, y]) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), mat('#4f8a55', { flatShading: true }));
    m.position.y = y + h / 2;
    g.add(m);
  });
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), mat('#f4c542', { emissive: '#f4c542', emissiveIntensity: 0.8 }));
  star.position.y = 0.54;
  g.add(star);
  return g;
});

registerModel('cat_tree', () =>
  group(
    box(0.6, 0.06, 0.6, '#d9c7a8', 0, 0, 0, 0.02),
    cyl(0.05, 0.05, 1.3, '#c9a77a', -0.15, 0.06, -0.15, 12),
    cyl(0.05, 0.05, 0.7, '#c9a77a', 0.17, 0.06, 0.15, 12),
    box(0.4, 0.05, 0.4, '#d9c7a8', 0.15, 0.76, 0.12, 0.02),
    cyl(0.22, 0.2, 0.1, '#e8dcc6', -0.15, 1.36, -0.15, 20),
    box(0.34, 0.3, 0.34, '#d9c7a8', -0.12, 0.06, 0.1, 0.04)
  )
);

registerModel('shower', () => {
  const glass = mat('#bfe0ee', { transparent: true, opacity: 0.3, roughness: 0.1 });
  const a = box(0.02, 1.9, 0.9, '#fff', 0.45, 0.06, 0);
  const b = box(0.9, 1.9, 0.02, '#fff', 0, 0.06, -0.45);
  a.material = b.material = glass;
  return group(box(0.9, 0.06, 0.9, WHITE, 0, 0, 0, 0.02), a, b, cyl(0.01, 0.01, 1.9, '#9aa2a4', -0.4, 0.06, 0.38, 8), cyl(0.07, 0.07, 0.02, '#9aa2a4', -0.3, 1.94, 0.3, 16));
});

registerModel('heater', () => {
  const front = box(0.5, 0.42, 0.02, '#3a3d44', 0, 0.12, 0.09);
  front.name = 'glow_grille';
  return group(box(0.6, 0.55, 0.18, WHITE, 0, 0.06, 0, 0.04), front, box(0.5, 0.06, 0.22, METAL, 0, 0, 0));
});

// generic block for facade details (piers, fascias, fences...)
registerModel('box', ({ size = [1, 1, 1], color = '#cccccc' } = {}) =>
  group(box(size[0], size[1], size[2], color))
);

// ───────────────────────── garden
// deterministic pseudo-random so the garden looks the same on every load
function rng(seed) {
  let a = seed >>> 0;
  return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function blob(r, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(color, { flatShading: true }));
  m.position.set(x, y, z);
  return m;
}
const LEAF = ['#5f8f52', '#6f9b63', '#4f7d48'];

// Posts, beams and rafters of a terrace cover. The open side faces -z.
registerModel('pergola_frame', ({ width = 6, depth = 3, height = 2.4, vine = true } = {}) => {
  const W = '#5a4332';
  const g = group(
    box(width, 0.14, 0.08, W, 0, height, -depth / 2),
    box(width, 0.14, 0.08, W, 0, height, depth / 2 - 0.06)
  );
  for (const x of [-width / 2 + 0.05, 0, width / 2 - 0.05]) g.add(box(0.1, height, 0.1, W, x, 0, -depth / 2));
  const n = Math.round(width / 1.0);
  for (let i = 0; i <= n; i++) g.add(box(0.06, 0.1, depth, W, -width / 2 + (i * width) / n, height + 0.14, 0));
  if (vine) {
    const r = rng(7);
    for (let i = 0; i < 46; i++) {
      const along = r() < 0.5;
      g.add(blob(0.16 + r() * 0.14, LEAF[i % 3],
        along ? -width / 2 + r() * width * 0.6 : -width / 2 + r() * 1.6,
        height - 0.1 + r() * 0.25,
        along ? -depth / 2 + (r() - 0.5) * 0.4 : -depth / 2 + r() * depth));
    }
    for (let i = 0; i < 7; i++) g.add(blob(0.09, LEAF[i % 3], -width / 2 + 0.05 + (r() - 0.5) * 0.2, 0.3 + i * 0.3, -depth / 2));
  }
  return g;
});

// translucent corrugated sheets on top of the pergola
registerModel('pergola_roof', ({ width = 6, depth = 3, height = 2.4 } = {}) => {
  const sheet = box(width + 0.3, 0.03, depth + 0.3, '#e2dab2', 0, height + 0.26, 0);
  sheet.material = mat('#e2dab2', { transparent: true, opacity: 0.55, roughness: 0.4 });
  sheet.userData.noShadow = true;
  sheet.rotation.x = -0.05;
  return group(sheet);
});

registerModel('acapulco_chair', () => {
  const black = mat('#1d1d1f', { side: THREE.DoubleSide, roughness: 0.6 });
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.1, 0.42, 20, 1, true), black);
  shell.position.set(0, 0.5, 0);
  shell.rotation.x = -0.45;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.018, 6, 24), black);
  ring.rotation.x = Math.PI / 2 - 0.45;
  ring.position.set(0, 0.69, -0.09);
  const g = group(shell, ring);
  for (const [x, z] of [[-0.26, 0.24], [0.26, 0.24], [0, -0.3]]) g.add(cyl(0.012, 0.012, 0.4, '#1d1d1f', x, 0, z, 6));
  return g;
});

registerModel('side_table', ({ radius = 0.35, height = 0.42 } = {}) => {
  const g = group(cyl(radius, radius, 0.03, '#e2c08d', 0, height, 0, 32));
  for (let i = 0; i < 3; i++) {
    const a = (i * 2 * Math.PI) / 3;
    g.add(cyl(0.015, 0.015, height, '#e9c95a', Math.sin(a) * radius * 0.7, 0, Math.cos(a) * radius * 0.7, 6));
  }
  g.add(cyl(0.05, 0.04, 0.07, '#b5533c', 0.05, height + 0.03, 0), blob(0.07, LEAF[0], 0.05, height + 0.14, 0));
  return g;
});

registerModel('hanging_chair', () => {
  const B = '#222326';
  const arm = box(0.05, 0.05, 0.75, B, 0, 1.9, 0.02);
  const seat = box(0.6, 0.9, 0.08, '#2c2d31', 0, 0.45, 0.42, 0.04);
  seat.rotation.x = 0.35;
  return group(
    cyl(0.5, 0.5, 0.03, B, 0, 0, 0.1, 24),
    cyl(0.03, 0.03, 1.95, B, 0, 0, -0.35, 8),
    arm,
    cyl(0.006, 0.006, 0.5, '#888', 0, 1.4, 0.38, 6),
    seat,
    box(0.6, 0.06, 0.5, '#2c2d31', 0, 0.42, 0.55, 0.03)
  );
});

registerModel('rain_barrel', () =>
  group(cyl(0.3, 0.28, 0.9, '#2552b8', 0, 0, 0, 20), cyl(0.31, 0.31, 0.05, '#1d4196', 0, 0.86, 0, 20))
);

registerModel('fire_pit', () => {
  const B = '#1b1b1d';
  const fire = cyl(0.18, 0.22, 0.2, '#ff9a3c', 0, 0.3, 0, 6);
  fire.name = 'glow_fire';
  fire.material = mat('#ffb060', { emissive: '#ff7a1a', emissiveIntensity: 0 });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.14, 6), mat(B));
  cone.position.y = 0.87;
  const cage = cyl(0.34, 0.34, 0.55, B, 0, 0.25, 0, 6);
  cage.material = mat(B, { transparent: true, opacity: 0.55 });
  return group(cyl(0.4, 0.44, 0.25, B, 0, 0, 0, 6), fire, cage, cone, cyl(0.12, 0.16, 0.1, B, 0, 0.94, 0, 6));
});

// wall of ivy with fairy lights (the lights are "glow" meshes, so it can be a light)
registerModel('ivy_screen', ({ width = 1.8, height = 1.8 } = {}) => {
  const g = group(box(width, height, 0.06, '#3f6a3c'));
  const r = rng(3);
  for (let i = 0; i < 40; i++) g.add(blob(0.1 + r() * 0.06, LEAF[i % 3], (r() - 0.5) * width, 0.1 + r() * (height - 0.2), 0.05));
  for (let i = 0; i < 26; i++) {
    const dot = blob(0.025, '#fff4dc', (r() - 0.5) * width * 0.95, 0.1 + r() * (height - 0.2), 0.16);
    glow(dot);
    dot.userData.noShadow = true;
    g.add(dot);
  }
  g.add(anchor(0, height / 2, 0.5));
  return g;
});

registerModel('flower_bed', ({ length = 4, depth = 0.8, seed = 1 } = {}) => {
  const g = group();
  const r = rng(seed);
  const petals = ['#f3f1ea', '#b9a4e0', '#8c7bd1', '#f0d06a', '#e9b3c8'];
  const n = Math.round(length * depth * 7);
  for (let i = 0; i < n; i++) {
    const x = (r() - 0.5) * (depth - 0.15), z = (r() - 0.5) * (length - 0.2);
    const h = 0.18 + r() * 0.35;
    g.add(blob(0.14 + r() * 0.12, LEAF[i % 3], x, h * 0.6, z));
    if (r() < 0.6) g.add(blob(0.07 + r() * 0.05, petals[Math.floor(r() * petals.length)], x + (r() - 0.5) * 0.1, h + 0.14, z + (r() - 0.5) * 0.1));
  }
  return g;
});

registerModel('stepping_stones', ({ count = 8, spacing = 0.95 } = {}) => {
  const g = group();
  const r = rng(11);
  for (let i = 0; i < count; i++) {
    const s = cyl(0.3, 0.3, 0.04, '#a9a59c', (r() - 0.5) * 0.25, 0, -((count - 1) * spacing) / 2 + i * spacing, 14);
    s.scale.x = 0.85 + r() * 0.3;
    s.userData.noShadow = true;
    g.add(s);
  }
  return g;
});

// brick garage at the end of the garden; its front faces +z, door opening on the right
registerModel('garage', ({ width = 6.5, depth = 3, height = 2.5, door = 2.3 } = {}) => {
  const g = group(
    box(width, height, depth, '#9c5a45'),
    box(width + 0.3, 0.12, depth + 0.3, '#3d3a38', 0, height, 0),
    box(door, height - 0.4, 0.05, '#1f1f22', width / 2 - door / 2 - 0.2, 0, depth / 2 + 0.01),
    box(width + 0.3, 0.14, 0.06, '#f1efe9', 0, height - 0.12, depth / 2 + 0.16)
  );
  const n = 4, pw = 0.8;
  for (let i = 0; i < n; i++) g.add(box(pw, 1.5, 0.04, '#b98a5c', -width / 2 + 0.6 + i * (pw + 0.12), 0.5, depth / 2 + 0.02));
  return g;
});

// ───────────────────────── frontyard
registerModel('bush', ({ size = 0.55, flower } = {}) => {
  const g = group();
  const r = rng(Math.round(size * 100) + (flower ? 9 : 2));
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2, d = r() * size * 0.55;
    g.add(blob(size * (0.45 + r() * 0.25), LEAF[i % 3], Math.cos(a) * d, size * (0.45 + r() * 0.35), Math.sin(a) * d));
  }
  if (flower) g.add(blob(size * 0.16, flower, size * 0.35, size * 0.95, size * 0.45));
  return g;
});

// low rail fence running along x
registerModel('low_fence', ({ length = 3, height = 0.42, color = '#2b2623' } = {}) => {
  const g = group(box(length, 0.1, 0.05, color, 0, height - 0.12, 0));
  const n = Math.max(1, Math.round(length / 1.4));
  for (let i = 0; i <= n; i++) g.add(box(0.09, height, 0.09, color, -length / 2 + (i * length) / n, 0, 0));
  return g;
});

// clipped hedge running along x
registerModel('hedge', ({ length = 2, height = 1.1, depth = 0.6 } = {}) => {
  const g = group();
  const r = rng(21);
  const n = Math.round(length * 9);
  for (let i = 0; i < n; i++)
    g.add(blob(0.2 + r() * 0.12, i % 4 ? LEAF[i % 3] : '#6b4a52', (r() - 0.5) * length, 0.15 + r() * (height - 0.25), (r() - 0.5) * depth * 0.6));
  return g;
});

registerModel('planter', () => {
  const g = group(cyl(0.19, 0.15, 0.28, '#3a3a3d'));
  const r = rng(4);
  for (let i = 0; i < 7; i++) {
    const blade = cyl(0.008, 0.02, 0.3 + r() * 0.15, i % 2 ? '#b9a06a' : '#8f9a5a', (r() - 0.5) * 0.2, 0.26, (r() - 0.5) * 0.2, 5);
    blade.rotation.set((r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5);
    g.add(blade);
  }
  return g;
});

// Philips 3000-series compact ceramic heater (CX3120): ribbed dark cylinder,
// silver ring, flat top and a carry handle. The core glows while heating.
registerModel('philips_heater', ({ scale: _s, radius = 0.105, height = 0.3 } = {}) => {
  const DARK = '#2a2b2e';
  const grille = height * 0.68, base = height * 0.08;
  const core = cyl(radius * 0.86, radius * 0.86, grille, '#3a2c26', 0, base, 0, 24);
  core.name = 'glow_core';
  core.material = mat('#3a2c26', { emissive: '#ff7a1a', emissiveIntensity: 0, roughness: 0.6 });
  const g = group(
    cyl(radius, radius * 0.94, base, DARK, 0, 0, 0, 32),
    core,
    cyl(radius * 1.01, radius * 1.01, height * 0.025, '#9a9c9f', 0, base + grille, 0, 32),
    cyl(radius * 0.97, radius, height * 0.2, DARK, 0, base + grille + height * 0.025, 0, 32)
  );
  const ribs = 30;
  for (let i = 0; i < ribs; i++) {
    const a = (i / ribs) * Math.PI * 2;
    const rib = box(radius * 0.11, grille, radius * 0.16, DARK, Math.sin(a) * radius * 0.94, base, Math.cos(a) * radius * 0.94);
    rib.rotation.y = a;
    g.add(rib);
  }
  const handle = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.98, radius * 0.09, 8, 24, Math.PI), mat('#8f8a82', { roughness: 0.7 }));
  handle.position.y = height * 0.9;
  handle.scale.y = 1.25;
  g.add(handle, anchor(0, height * 0.5, 0));
  return g;
});
