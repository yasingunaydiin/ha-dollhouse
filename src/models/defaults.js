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
// the garage lives in decor.js (brick walls, window strip, open doorway, corrugated roof)

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

// Folding wooden stool: a slatted top on two scissor frames. Real size about
// 32 x 28 cm and 40 cm high; params: width, depth, height, wood (colour).
registerModel('folding_stool', ({ width = 0.32, depth = 0.28, height = 0.4, wood = '#e2b887' } = {}) => {
  const dark = '#d4a46d';
  const g = group();
  const slat = 0.014, slats = 5, gap = 0.007;
  const slatD = (depth - gap * (slats - 1)) / slats;
  // slatted top, the slats running across the width
  for (let k = 0; k < slats; k++) {
    g.add(box(width, slat, slatD, wood, 0, height - slat, -depth / 2 + slatD / 2 + k * (slatD + gap), 0.003));
  }
  // two cleats under the slats hold them together
  for (const sx of [-1, 1]) g.add(box(0.022, 0.014, depth - 0.02, dark, sx * (width / 2 - 0.045), height - slat - 0.014, 0, 0.002));
  // scissor frames at both ends: two legs that cross, pinned together with a dowel
  const top = height - slat - 0.014, footZ = depth / 2 - 0.01, topZ = depth / 2 - 0.045;
  const leg = (x, z0, z1) => {
    const dy = top, dz = z1 - z0, len = Math.hypot(dy, dz);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.022, len, 0.03), mat(wood));
    m.position.set(x, top / 2, (z0 + z1) / 2);
    m.rotation.x = Math.atan2(dz, dy); // along the line from the top end to the foot
    return m;
  };
  for (const sx of [-1, 1]) {
    const x = sx * (width / 2 - 0.045);
    g.add(leg(x - sx * 0.0125, -topZ, footZ), leg(x + sx * 0.0125, topZ, -footZ));
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 10), mat(dark));
    pin.rotation.z = Math.PI / 2;
    pin.position.set(x, top / 2, 0);
    g.add(pin);
  }
  // rails between the feet at the bottom, front and back
  for (const sz of [-1, 1]) g.add(box(width - 0.07, 0.02, 0.02, dark, 0, 0.012, sz * footZ, 0.003));
  return g;
});

// gologi glass convector heater, 2000 W: a white glass panel on two angled feet
// with a dot-matrix temperature display top right. Stands on the floor, or hangs
// on a wall with the "Placement height" field. params: width, height (panel).
registerModel('gologi_heater', ({ width = 0.77, height = 0.43 } = {}) => {
  const depth = 0.07, footH = 0.055, bottom = footH;
  const glass = (color) => mat(color, { roughness: 0.12, metalness: 0.05 });
  const g = group();
  // body: the glass panel with softly rounded corners, and a slimmer white frame behind it
  const panel = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 4, 0.022), glass('#f4f5f6'));
  panel.position.y = bottom + height / 2;
  const back = box(width - 0.03, height - 0.03, 0.012, '#e6e7e9', 0, bottom + 0.015, -depth / 2 + 0.002, 0.01);
  g.add(back, panel);
  // feet
  for (const sx of [-1, 1]) {
    g.add(box(0.07, footH, 0.2, '#e8e9eb', sx * (width / 2 - 0.075), 0, 0, 0.012));
    g.add(box(0.07, 0.012, 0.21, '#d4d6d9', sx * (width / 2 - 0.075), footH - 0.004, 0, 0.004));
  }
  // dot-matrix display "20°", lit up while heating
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#000';
  x.fillRect(0, 0, 256, 128);
  x.fillStyle = '#fff';
  x.font = '700 92px ui-monospace, Menlo, monospace';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('20°', 128, 70);
  const lit = new THREE.CanvasTexture(c);
  lit.colorSpace = THREE.SRGBColorSpace;
  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(0.1, 0.05),
    new THREE.MeshStandardMaterial({ color: '#d9dce0', roughness: 0.3, emissive: '#ffffff', emissiveMap: lit, emissiveIntensity: 0 })
  );
  display.name = 'glow_display';
  display.position.set(width / 2 - 0.085, bottom + height - 0.06, depth / 2 + 0.0006);
  g.add(display);
  // small touch icons under the display
  for (let k = 0; k < 4; k++) g.add(cyl(0.0042, 0.0042, 0.001, '#b9bcc1', width / 2 - 0.125 + k * 0.0125, bottom + height - 0.108, depth / 2, 14).rotateX(Math.PI / 2));
  // logo
  const l = document.createElement('canvas');
  l.width = 256;
  l.height = 64;
  const lc = l.getContext('2d');
  lc.fillStyle = '#4a4d52';
  lc.font = '700 40px system-ui, sans-serif';
  lc.textAlign = 'center';
  lc.textBaseline = 'middle';
  lc.fillText('gologi', 128, 34);
  const logoTex = new THREE.CanvasTexture(l);
  logoTex.colorSpace = THREE.SRGBColorSpace;
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.015), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true }));
  logo.position.set(0, bottom + 0.035, depth / 2 + 0.0006);
  g.add(logo);
  g.add(anchor(0, bottom + height * 0.5, depth / 2 + 0.1));
  return g;
});

// ───────────────────────── modelled on photos of the actual house
const LEATHER = '#7a4a2e';
const COPPER = '#c98562';
const BEECH = '#d9b87a';
const PINE = '#d8b98a';
const CHROME = '#b9bcc0';
const BLACK = '#1d1d20';
const WALNUT = '#4a3324';

// upper half of a sphere, open underneath (lamp shades)
function dome(r, color, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    mat(color, { side: THREE.DoubleSide, roughness: 0.45 })
  );
  m.position.set(x, y, z);
  return m;
}

// box that keeps its centre where box() would put it, tilted around x
function tilted(mesh, rx) {
  mesh.rotation.x = rx;
  return mesh;
}

// five-spoke swivel base
function starBase(radius, color, y = 0.03) {
  const out = [];
  for (let i = 0; i < 5; i++) {
    const spoke = box(0.05, 0.035, radius, color, 0, y, 0);
    const a = (i / 5) * Math.PI * 2;
    spoke.position.set((Math.sin(a) * radius) / 2, y + 0.0175, (Math.cos(a) * radius) / 2);
    spoke.rotation.y = a;
    out.push(spoke);
  }
  return out;
}

// low dark-wood TV bench with rounded ends and a 55" TV on its foot
registerModel('tv_console', ({ length = 1.9 } = {}) => {
  const screen = box(1.23, 0.71, 0.03, '#15171a', 0, 0.52, 0);
  screen.name = 'screen';
  return group(
    box(length - 0.4, 0.34, 0.4, WALNUT, 0, 0.1, 0, 0.02),
    cyl(0.2, 0.2, 0.34, WALNUT, -(length / 2 - 0.2), 0.1, 0),
    cyl(0.2, 0.2, 0.34, WALNUT, length / 2 - 0.2, 0.1, 0),
    box(length - 0.7, 0.16, 0.02, '#2a1c13', 0, 0.2, 0.195),
    ...legs(length - 0.5, 0.26, 0.1, WALNUT, 0.02),
    box(0.5, 0.03, 0.22, METAL, 0, 0.44, 0),
    box(0.08, 0.06, 0.04, METAL, 0, 0.47, 0),
    screen
  );
});

registerModel('drum_table', ({ radius = 0.24, height = 0.5 } = {}) =>
  group(
    cyl(radius * 0.92, radius * 0.92, height - 0.1, WALNUT, 0, 0.07, 0, 28),
    cyl(radius, radius, 0.03, WALNUT, 0, height - 0.03, 0, 28),
    ...legs(radius, radius, 0.07, '#2a1c13', 0.02)
  )
);

// table lamp: white dome shade hanging in a brass half ring
registerModel('dome_lamp', () => {
  const BRASS = '#b99a5b';
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.008, 8, 24, Math.PI), mat(BRASS));
  arc.position.y = 0.03;
  arc.scale.y = 1.25;
  return group(
    cyl(0.1, 0.11, 0.025, BRASS),
    arc,
    glow(dome(0.13, WHITE, 0, 0.1, 0)),
    anchor(0, 0.16, 0)
  );
});

// arc floor lamp: marble foot, long arc, copper dome. The arc reaches along +x.
registerModel('arc_lamp', ({ reach = 1.5, height = 1.75 } = {}) => {
  const a = reach / 1.2;
  const arc = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.012, 8, 40, Math.PI / 2 + 0.2),
    mat(COPPER, { side: THREE.DoubleSide, roughness: 0.4 })
  );
  arc.scale.set(-a, height, a);
  arc.position.x = a;
  const y = height * 0.98 - 0.22;
  return group(
    box(0.32, 0.06, 0.32, '#e8e4dc', 0, 0, 0, 0.01),
    arc,
    dome(0.2, COPPER, reach, y, 0),
    glow(cyl(0.17, 0.17, 0.015, WHITE, reach, y, 0)),
    anchor(reach, y - 0.1, 0)
  );
});

// brown leather swivel recliner with the footrest out
registerModel('recliner', ({ color = LEATHER } = {}) =>
  group(
    ...starBase(0.34, WALNUT),
    cyl(0.035, 0.035, 0.28, WALNUT, 0, 0.03, 0, 10),
    box(0.62, 0.16, 0.6, color, 0, 0.3, 0.02, 0.06),
    tilted(box(0.6, 0.72, 0.15, color, 0, 0.4, -0.38, 0.06), -0.42),
    tilted(box(0.4, 0.2, 0.14, color, 0, 1.0, -0.6, 0.06), -0.42),
    box(0.08, 0.22, 0.52, color, -0.33, 0.36, 0, 0.03),
    box(0.08, 0.22, 0.52, color, 0.33, 0.36, 0, 0.03),
    tilted(box(0.5, 0.1, 0.42, color, 0, 0.3, 0.6, 0.04), 0.15)
  )
);

registerModel('leaning_frame', ({ size = [0.75, 1.0] } = {}) => {
  const g = group(
    box(size[0], size[1], 0.03, BLACK, 0, 0, 0),
    box(size[0] - 0.06, size[1] - 0.06, 0.032, '#ece8df', 0, 0.03, 0),
    box(size[0] * 0.3, size[1] * 0.25, 0.034, '#b5533c', -size[0] * 0.2, size[1] * 0.6, 0),
    box(size[0] * 0.35, size[1] * 0.3, 0.034, '#3b3b40', size[0] * 0.18, size[1] * 0.15, 0)
  );
  g.rotation.x = -0.14;
  return group(g);
});

function cantileverChair() {
  const tube = (w, h, d, x, y, z) => box(w, h, d, CHROME, x, y, z);
  const g = group(
    box(0.46, 0.06, 0.44, BLACK, 0, 0.42, 0, 0.02),
    box(0.46, 0.36, 0.05, BLACK, 0, 0.58, -0.22, 0.02),
    tube(0.46, 0.02, 0.02, 0, 0, -0.24)
  );
  for (const x of [-0.24, 0.24])
    g.add(tube(0.02, 0.02, 0.5, x, 0, 0), tube(0.02, 0.44, 0.02, x, 0, 0.24), tube(0.02, 0.5, 0.02, x, 0.44, -0.24));
  return g;
}

// rectangular table with a pale top on white legs and four cantilever chairs
registerModel('dining_cantilever', ({ length = 1.6, width = 0.8 } = {}) => {
  const g = group(box(length, 0.035, width, BEECH, 0, 0.72, 0, 0.01));
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      g.add(cyl(0.03, 0.018, 0.72, WHITE, sx * (length / 2 - 0.08), 0, sz * (width / 2 - 0.08), 10));
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const c = cantileverChair();
      c.position.set(sx * length * 0.24, 0, sz * (width / 2 + 0.14));
      c.rotation.y = sz === 1 ? Math.PI : 0;
      g.add(c);
    }
  return g;
});

// ceiling bar with a row of wire-cage pendants
registerModel('pendant_bar', ({ height = 2.5, length = 1.1, drop = 1.0, count = 5 } = {}) => {
  const g = group(box(length, 0.03, 0.08, BLACK, 0, height - 0.03, 0));
  const wire = new THREE.MeshStandardMaterial({ color: BLACK, wireframe: true });
  for (let i = 0; i < count; i++) {
    const x = -length / 2 + 0.08 + (i * (length - 0.16)) / (count - 1);
    const y = height - 0.03 - drop;
    const cage = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 6), wire);
    cage.position.set(x, y - 0.1, 0);
    cage.scale.y = 1.25;
    cage.userData.noShadow = true;
    const bulb = glow(new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8)));
    bulb.position.set(x, y - 0.1, 0);
    g.add(cyl(0.004, 0.004, drop, BLACK, x, y, 0, 5), cage, bulb);
  }
  g.add(anchor(0, height - drop - 0.2, 0));
  return g;
});

// crystal ball pendant
registerModel('globe_pendant', ({ height = 2.5, drop = 0.45, radius = 0.17 } = {}) => {
  const y = height - drop - radius;
  const ball = glow(new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 2)));
  ball.material.flatShading = true;
  ball.position.y = y;
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius + 0.004, 2),
    new THREE.MeshStandardMaterial({ color: CHROME, wireframe: true })
  );
  shell.position.y = y;
  shell.userData.noShadow = true;
  return group(cyl(0.006, 0.006, drop, CHROME, 0, height - drop, 0, 6), ball, shell, anchor(0, y - radius, 0));
});

// Winder treads: `count` wedges fanning out of the corner `pivot` across a
// W x W square, from direction `from` (radians) through a quarter turn.
function winderShapes(W, count, [px, pz], from) {
  const edge = (a) => {
    const c = Math.cos(from + a), s = Math.sin(from + a);
    const t = W / Math.max(Math.abs(c), Math.abs(s));
    return [px + t * c, pz + t * s];
  };
  return Array.from({ length: count }, (_, i) => {
    const shape = new THREE.Shape();
    shape.moveTo(px, pz);
    shape.lineTo(...edge((i * Math.PI) / 2 / count));
    shape.lineTo(...edge(((i + 1) * Math.PI) / 2 / count));
    shape.closePath();
    return shape;
  });
}
function tread(shape, thickness, top, material) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geo.rotateX(Math.PI / 2); // shape (x, y) becomes floor (x, z); the thickness hangs below
  const m = new THREE.Mesh(geo, material);
  m.position.y = top;
  return m;
}

// Carpeted stairs with a quarter turn at both ends: you step on from +x, the
// winders turn you, the straight flight climbs towards -z and the top winders
// turn you back so you step off towards +x.
registerModel('winder_stairs', ({ width = 0.95, rise = 2.9, straight = 7, going = 0.19, topWinders = 4, color = '#1c1c20' } = {}) => {
  const W = width, winders = 4;
  const r = rise / (winders + straight + topWinders + 1);
  const g = group();
  const m = mat(color, { side: THREE.DoubleSide });
  winderShapes(W, winders, [W / 2, -W / 2], Math.PI / 2).forEach((s, i) => g.add(tread(s, r, (i + 1) * r, m)));
  const nose = new THREE.Color(color).multiplyScalar(1.7).getStyle();
  for (let i = 0; i < straight; i++) {
    const top = (winders + i + 1) * r, zc = -W / 2 - (i + 0.5) * going;
    g.add(box(W, r, going, color, 0, (winders + i) * r, zc, 0.008));
    // rounded stair nosing along the front lip, a slightly lighter strip of carpet
    g.add(box(W, 0.016, 0.03, nose, 0, top - 0.012, zc + going / 2 - 0.012, 0.006));
    // white side skirts closing the flight on both sides
    for (const sx of [-1, 1]) g.add(box(0.025, top, going, '#ecebe5', sx * (W / 2 + 0.0125), 0, zc));
  }
  const end = -W / 2 - straight * going;
  winderShapes(W, topWinders, [W / 2, end], Math.PI).forEach((s, i) => g.add(tread(s, r, (winders + straight + i + 1) * r, m)));
  // handrail on the open (+x) side: wooden rail on slim posts with white balusters, like the railing upstairs
  const rx = W / 2 + 0.03, railH = 0.9;
  const p0 = new THREE.Vector3(rx, (winders + 1) * r + railH, -W / 2 - 0.5 * going);
  const p1 = new THREE.Vector3(rx, (winders + straight) * r + railH, -W / 2 - (straight - 0.5) * going);
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, p0.distanceTo(p1), 14), mat('#c9a06a', { roughness: 0.5 }));
  rail.position.copy(p0).add(p1).multiplyScalar(0.5);
  rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
  g.add(rail);
  for (let i = 0; i < straight; i++) {
    const top = (winders + i + 1) * r, zc = -W / 2 - (i + 0.5) * going;
    const post = i === 0 || i === straight - 1;
    g.add(box(post ? 0.05 : 0.018, railH - 0.02, post ? 0.05 : 0.018, post ? '#c9a06a' : '#f2f1ec', rx, top, zc));
  }
  return g;
});

// The same stairs seen from the floor they arrive on: the top winders (you
// step down from +x) and the first steps of the flight going down towards +z.
registerModel('stairwell_top', ({ width = 0.95, going = 0.19, steps = 4, winders = 4 } = {}) => {
  const W = width;
  const g = group();
  const shade = (i) => mat(new THREE.Color('#34343a').multiplyScalar(1 - i / (winders + steps + 1)), { side: THREE.DoubleSide });
  winderShapes(W, winders, [W / 2, W / 2], Math.PI)
    .reverse()
    .forEach((s, i) => g.add(tread(s, 0.02, 0.022 - i * 0.002, shade(i))));
  for (let i = 0; i < steps; i++) {
    const strip = box(W, 0.012 - i * 0.002, going, '#000', 0, 0, W / 2 + (i + 0.5) * going);
    strip.material = shade(winders + i);
    g.add(strip);
  }
  const total = winders + steps + 1;
  const nose = (i) => new THREE.Color('#34343a').multiplyScalar((1 - i / total) * 1.9).getStyle();
  // nosing on the downhill (+z) edge of every straight tread, and the shadowed riser under it
  for (let i = 0; i < steps; i++) {
    const zf = W / 2 + (i + 1) * going;
    const fade = 1 - (i + 1) / total;
    g.add(box(W, 0.004, 0.028, nose(winders + i), 0, 0.012 - i * 0.002, zf - 0.03, 0.002));
    g.add(box(W, 0.004, 0.035, new THREE.Color('#0b0b0d').multiplyScalar(0.6 + fade * 0.4).getStyle(), 0, 0.008 - i * 0.002, zf + 0.0175));
  }
  // winder treads: a lighter edge line round each wedge so the fan reads as separate steps
  const edge = new THREE.LineBasicMaterial({ color: '#5a5a62' });
  winderShapes(W, winders, [W / 2, W / 2], Math.PI).reverse().forEach((sh, i) => {
    const pts = sh.getPoints().map((p) => new THREE.Vector3(p.x, 0.026 - i * 0.002, p.y));
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), edge));
  });
  // white trim framing the opening along the open (+x) side and the far end
  const run = steps * going;
  g.add(box(0.035, 0.03, run + W / 2, '#f1efe9', W / 2 + 0.0175, 0, (W / 2 + run) / 2 + W / 4 - W / 4 + 0));
  g.children[g.children.length - 1].position.z = (W / 2 + W / 2 + run) / 2;
  g.add(box(W + 0.07, 0.03, 0.035, '#f1efe9', 0, 0, W / 2 + run + 0.0175));
  g.children.forEach((c) => (c.userData.noShadow = true));
  return g;
});

// white panel radiator, front facing +z
registerModel('radiator', ({ length = 1.2, height = 0.6 } = {}) => {
  const g = group(
    box(length, height, 0.07, WHITE, 0, 0.12, 0, 0.01),
    cyl(0.012, 0.012, 0.12, CHROME, -length / 2 + 0.08, 0, 0, 6),
    cyl(0.012, 0.012, 0.12, CHROME, length / 2 - 0.08, 0, 0, 6)
  );
  const n = Math.round(length / 0.08);
  for (let i = 1; i < n; i++) g.add(box(0.006, height - 0.06, 0.01, '#dcd8cf', -length / 2 + (i * length) / n, 0.15, 0.036));
  return g;
});

registerModel('hand_basin', () =>
  group(
    box(0.36, 0.12, 0.26, WHITE, 0, 0.72, 0, 0.04),
    box(0.24, 0.01, 0.16, '#cfd8d6', 0, 0.835, 0.01),
    cyl(0.012, 0.012, 0.1, CHROME, 0, 0.84, -0.09, 8),
    cyl(0.016, 0.016, 0.72, CHROME, 0, 0, -0.08, 8)
  )
);

// meter cupboard: fuse box, meter, gas pipe and expansion vessel
registerModel('meter_cabinet', () =>
  group(
    box(0.5, 1.8, 0.03, '#dedad0', 0, 0, -0.06),
    box(0.3, 0.42, 0.1, '#f1efe9', -0.05, 1.25, 0),
    box(0.2, 0.36, 0.12, '#1c1c1e', -0.05, 0.8, 0),
    box(0.12, 0.16, 0.125, '#e6e6e6', -0.05, 0.92, 0),
    cyl(0.035, 0.035, 1.8, '#f0c419', 0.2, 0, 0.02, 10),
    cyl(0.12, 0.12, 0.3, '#a8321f', 0.08, 0, 0.1, 16)
  )
);

// simple pine double bed, headboard at -z
registerModel('pine_bed', ({ width = 1.4, length = 2.05, color = BLACK } = {}) => {
  const g = group(
    box(width + 0.06, 0.1, length, PINE, 0, 0.22, 0),
    box(width, 0.18, length - 0.06, color, 0, 0.32, 0, 0.05),
    box(width + 0.02, 0.07, length * 0.5, '#2c2c33', 0, 0.48, length * 0.2, 0.03),
    box(0.55, 0.11, 0.36, '#c9cdd3', -width * 0.24, 0.5, -length / 2 + 0.26, 0.05),
    box(0.55, 0.11, 0.36, '#e4dccd', width * 0.24, 0.5, -length / 2 + 0.26, 0.05),
    box(width + 0.06, 0.06, 0.03, PINE, 0, 0.78, -length / 2),
    box(width + 0.06, 0.06, 0.03, PINE, 0, 0.6, -length / 2)
  );
  for (const sx of [-1, 1]) {
    g.add(box(0.06, 0.86, 0.06, PINE, (sx * width) / 2, 0, -length / 2));
    g.add(box(0.06, 0.32, 0.06, PINE, (sx * width) / 2, 0, length / 2 - 0.03));
  }
  return g;
});

registerModel('stool', ({ height = 0.45, radius = 0.16 } = {}) => {
  const g = group(cyl(radius, radius, 0.03, PINE, 0, height - 0.03, 0, 24));
  for (let i = 0; i < 3; i++) {
    const a = (i * 2 * Math.PI) / 3;
    g.add(cyl(0.014, 0.018, height - 0.03, PINE, Math.sin(a) * radius * 0.8, 0, Math.cos(a) * radius * 0.8, 6));
  }
  return g;
});

registerModel('globe_lamp', ({ radius = 0.11 } = {}) => {
  const ball = glow(new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14)));
  ball.position.y = 0.03 + radius;
  return group(cyl(0.06, 0.07, 0.04, WHITE), ball, anchor(0, 0.03 + radius, 0));
});

// IKEA Galant corner desk (160 x 120) with the half-round end piece: the wall
// corner is at the origin. The long arm runs along +x (`a` long including the
// round end, `depth` deep, monitors facing +z); the short return runs along +z
// (`b` long, `returnDepth` deep). The inside corner is a sweeping curve.
registerModel('corner_desk', ({ a = 1.8, b = 1.2, depth = 0.8, returnDepth = 0.6 } = {}) => {
  const d = depth, rd = returnDepth, R = Math.min(0.35, b - d);
  const top = new THREE.Shape();
  top.moveTo(0, 0);
  top.lineTo(a - d / 2, 0);
  top.absarc(a - d / 2, d / 2, d / 2, -Math.PI / 2, Math.PI / 2, false);
  top.lineTo(rd + R, d);
  top.absarc(rd + R, d + R, R, -Math.PI / 2, -Math.PI, true);
  top.lineTo(rd, b);
  top.lineTo(0, b);
  top.closePath();
  const g = group(
    tread(top, 0.03, 0.75, mat(BEECH, { side: THREE.DoubleSide })),
    box(0.4, 0.55, 0.45, WHITE, rd / 2, 0, b - 0.5)
  );
  // silver legs, splayed outwards like Galant A-legs
  const leg = (x, z, lx, lz) => {
    const m = cyl(0.028, 0.018, 0.73, CHROME, x, 0, z, 10);
    m.rotation.set(lz * 0.12, 0, -lx * 0.12);
    return m;
  };
  g.add(
    leg(a - 0.45, 0.14, 0, -1), leg(a - 0.45, d - 0.14, 0, 1),
    leg(0.14, 0.14, -1, -1), leg(1.0, d - 0.12, 0, 1),
    leg(0.12, b - 0.12, -1, 0), leg(rd - 0.12, b - 0.12, 1, 0)
  );
  // the monitors are separate objects (msi_mag342, samsung_c24rg50)
  return g;
});

registerModel('office_chair', () =>
  group(
    ...starBase(0.3, BLACK),
    cyl(0.03, 0.03, 0.36, METAL, 0, 0.05, 0, 10),
    box(0.48, 0.08, 0.46, BLACK, 0, 0.42, 0, 0.03),
    tilted(box(0.44, 0.62, 0.05, '#2a2b30', 0, 0.58, -0.25, 0.03), -0.1),
    box(0.05, 0.03, 0.26, BLACK, -0.28, 0.64, 0, 0.01),
    box(0.05, 0.03, 0.26, BLACK, 0.28, 0.64, 0, 0.01),
    box(0.03, 0.18, 0.03, BLACK, -0.28, 0.46, 0),
    box(0.03, 0.18, 0.03, BLACK, 0.28, 0.46, 0)
  )
);

// bentwood cantilever armchair with a black cushion
registerModel('poang_chair', ({ frame = '#2b211c' } = {}) => {
  const g = group(
    tilted(box(0.56, 0.1, 0.52, BLACK, 0, 0.32, 0.04, 0.04), -0.12),
    tilted(box(0.54, 0.62, 0.1, BLACK, 0, 0.4, -0.3, 0.04), -0.38),
    tilted(box(0.4, 0.16, 0.1, '#26262a', 0, 0.9, -0.5, 0.04), -0.38)
  );
  for (const x of [-0.31, 0.31])
    g.add(
      box(0.05, 0.03, 0.72, frame, x, 0, -0.02),
      tilted(box(0.05, 0.03, 0.6, frame, x, 0.5, 0.0), -0.08),
      tilted(box(0.05, 0.52, 0.03, frame, x, 0, 0.3), 0.12)
    );
  return g;
});

registerModel('monstera', ({ seed = 6 } = {}) => {
  const g = group(cyl(0.17, 0.14, 0.26, '#e9e6de'));
  const r = rng(seed);
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2, d = 0.15 + r() * 0.35, h = 0.45 + r() * 0.75;
    const stem = cyl(0.008, 0.01, h, '#4f7d48', (Math.cos(a) * d) / 2, 0.2, (Math.sin(a) * d) / 2, 5);
    stem.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
    const leaf = cyl(0.17 + r() * 0.06, 0.17, 0.008, i % 2 ? '#2f6b3a' : '#3b7a45', Math.cos(a) * d, 0.2 + h, Math.sin(a) * d, 9);
    leaf.scale.z = 0.8;
    leaf.rotation.set(Math.sin(a) * 0.6, a, -Math.cos(a) * 0.6);
    g.add(stem, leaf);
  }
  return g;
});

// reading lamp on a pole, the shade leans out along +x
registerModel('reading_lamp', () => {
  const arm = box(0.5, 0.015, 0.015, METAL, 0.2, 1.3, 0);
  arm.rotation.z = -0.35;
  const shade = glow(cyl(0.05, 0.1, 0.14, WHITE, 0.45, 1.14, 0, 16));
  shade.rotation.z = -0.5;
  return group(cyl(0.13, 0.14, 0.025, METAL), cyl(0.012, 0.012, 1.35, METAL, 0, 0.025, 0, 8), arm, shade, anchor(0.5, 1.1, 0));
});

// white baluster railing running along x
registerModel('railing', ({ length = 1.05, height = 0.95 } = {}) => {
  const g = group(
    box(length, 0.05, 0.05, WHITE, 0, height - 0.05, 0),
    box(length, 0.04, 0.04, WHITE, 0, 0.06, 0),
    box(0.07, height + 0.05, 0.07, WHITE, -length / 2, 0, 0),
    box(0.07, height + 0.05, 0.07, WHITE, length / 2, 0, 0)
  );
  const n = Math.round(length / 0.11);
  for (let i = 1; i < n; i++) g.add(box(0.025, height - 0.14, 0.025, WHITE, -length / 2 + (i * length) / n, 0.08, 0));
  return g;
});

// wall-hung boiler above its boxed-in pipes, flue through the roof
registerModel('boiler', () =>
  group(
    box(0.3, 1.1, 0.2, WHITE, 0, 0, 0),
    box(0.42, 0.68, 0.3, '#fbfaf6', 0, 1.18, 0.04, 0.02),
    box(0.1, 0.14, 0.01, '#3f7fbf', -0.1, 1.62, 0.195),
    cyl(0.05, 0.05, 0.62, '#e6e6e6', 0, 1.86, 0.02, 12),
    blob(0.1, LEAF[0], 0.16, 1.9, 0.08),
    blob(0.07, LEAF[1], 0.2, 1.74, 0.1)
  )
);

// ───────────────────────── upstairs: guest room, server cupboard, bathroom
// white metal single bed with ball finials, headboard at -z
registerModel('metal_bed', ({ width = 0.95, length = 2.0, color = '#3f73c9' } = {}) => {
  const g = group(
    box(width, 0.04, length, '#c9b08a', 0, 0.3, 0),
    box(width - 0.04, 0.18, length - 0.06, '#efe2a0', 0, 0.34, 0, 0.04),
    box(width + 0.02, 0.07, length * 0.72, WHITE, 0, 0.5, length * 0.12, 0.03),
    box(0.5, 0.11, 0.36, '#e8a23c', 0, 0.52, -length / 2 + 0.26, 0.05)
  );
  for (let i = 0; i < 5; i++) g.add(box(width + 0.024, 0.072, length * 0.07, color, 0, 0.5, -length * 0.2 + i * length * 0.145, 0.02));
  for (const [z, h] of [[-length / 2, 1.05], [length / 2, 0.8]]) {
    for (const sx of [-1, 1]) {
      g.add(cyl(0.02, 0.02, h, WHITE, (sx * width) / 2, 0, z, 10));
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), mat(WHITE));
      ball.position.set((sx * width) / 2, h + 0.03, z);
      g.add(ball);
    }
    g.add(box(width, 0.025, 0.025, WHITE, 0, h - 0.1, z), box(width, 0.025, 0.025, WHITE, 0, 0.36, z));
    for (let i = 1; i < 6; i++) g.add(cyl(0.008, 0.008, h - 0.46, WHITE, -width / 2 + (i * width) / 6, 0.36, z, 6));
  }
  for (const sx of [-1, 1]) g.add(box(0.025, 0.05, length, WHITE, (sx * width) / 2, 0.28, 0));
  return g;
});

// white country-style bedside table: drawer on top, shelf below
registerModel('white_nightstand', () =>
  group(
    box(0.62, 0.04, 0.45, WHITE, 0, 0.6, 0, 0.01),
    box(0.56, 0.18, 0.4, WHITE, 0, 0.42, 0),
    box(0.44, 0.12, 0.012, '#e6e1d6', 0, 0.45, 0.2),
    box(0.05, 0.025, 0.02, METAL, 0, 0.5, 0.21),
    box(0.56, 0.03, 0.4, WHITE, 0, 0.14, 0),
    ...legs(0.5, 0.34, 0.42, WHITE, 0.025)
  )
);

// tall scratching post tower with sisal posts and dark plush platforms
registerModel('tall_cat_tree', () => {
  const SISAL = '#b9925a', PLUSH = '#4a4340';
  const g = group(box(0.55, 0.05, 0.55, PLUSH, 0, 0, 0, 0.02));
  const levels = [[0.4, 0.14, 0.1], [0.75, -0.12, -0.08], [1.1, 0.12, -0.1], [1.45, -0.08, 0.08], [1.8, 0.02, 0]];
  let y = 0.05;
  for (const [top, x, z] of levels) {
    g.add(cyl(0.045, 0.045, top - y, SISAL, x, y, z, 12));
    g.add(box(0.34, 0.05, 0.34, PLUSH, x, top, z, 0.02));
    y = top + 0.05;
  }
  g.add(cyl(0.045, 0.045, 0.7, SISAL, -0.15, 0.05, 0.15, 12), cyl(0.16, 0.15, 0.08, PLUSH, 0.02, 1.85, 0, 16));
  return g;
});

registerModel('litter_box', () =>
  group(
    box(0.42, 0.14, 0.54, '#8d8580', 0, 0, 0, 0.04),
    box(0.42, 0.26, 0.54, '#f1efe9', 0, 0.13, 0, 0.08),
    box(0.26, 0.2, 0.02, '#6d6763', 0, 0.12, 0.265, 0.02),
    box(0.2, 0.012, 0.14, '#8d8580', 0, 0.39, -0.05)
  )
);

// open-frame network rack on wheels with a monitor and keyboard on top
registerModel('open_rack', () => {
  const g = group(box(0.52, 0.02, 0.5, '#26282c', 0, 0.86, 0));
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) g.add(box(0.03, 0.82, 0.03, '#17181b', sx * 0.25, 0.06, sz * 0.24), cyl(0.03, 0.03, 0.06, '#17181b', sx * 0.25, 0, sz * 0.24, 8));
  const gear = [[0.1, 0.16, '#1b1c1f'], [0.3, 0.05, '#2f3338'], [0.42, 0.05, '#c9ccd1'], [0.56, 0.1, '#8f9399'], [0.76, 0.09, '#2a2c31']];
  gear.forEach(([y, h, color], i) => {
    g.add(box(0.46, h, 0.44, color, 0, y, 0));
    const led = box(0.02, 0.02, 0.01, '#5cf08a', -0.16 + (i % 3) * 0.05, y + h / 2 - 0.01, 0.222);
    led.material.emissive = new THREE.Color('#5cf08a');
    led.material.emissiveIntensity = 1.5;
    g.add(led);
  });
  g.add(
    box(0.4, 0.015, 0.13, '#17181b', 0, 0.88, 0.14),
    box(0.2, 0.015, 0.14, '#17181b', 0, 0.88, -0.12),
    box(0.04, 0.1, 0.03, '#17181b', 0, 0.89, -0.13),
    box(0.5, 0.3, 0.03, '#0f1012', 0, 0.97, -0.11)
  );
  return g;
});

registerModel('printer', () =>
  group(
    box(0.42, 0.34, 0.4, '#1d1d20', 0, 0.03, 0, 0.02),
    box(0.42, 0.04, 0.16, '#d8d8d8', 0, 0.37, 0.12),
    box(0.3, 0.02, 0.2, '#1d1d20', 0, 0.37, -0.08),
    box(0.3, 0.03, 0.18, '#2a2b2e', 0, 0.08, 0.28),
    ...legs(0.36, 0.34, 0.03, '#1d1d20', 0.015)
  )
);

// slim tower fan / tower heater on a round foot
registerModel('tower_fan', ({ height = 1.0, color = '#1b1b1e' } = {}) =>
  group(
    cyl(0.15, 0.16, 0.03, color, 0, 0, 0, 24),
    box(0.13, height - 0.03, 0.13, color, 0, 0.03, 0, 0.05),
    box(0.09, height * 0.62, 0.01, '#3a3b40', 0, height * 0.28, 0.066)
  )
);

// front loader, door facing +z
registerModel('washing_machine', () => {
  const door = cyl(0.17, 0.17, 0.03, '#22242a', 0, 0, 0, 28);
  door.rotation.x = Math.PI / 2;
  door.position.set(0, 0.45, 0.3);
  const glass = cyl(0.12, 0.12, 0.035, '#6f8fa8', 0, 0, 0, 28);
  glass.rotation.x = Math.PI / 2;
  glass.position.set(0, 0.45, 0.3);
  return group(
    box(0.6, 0.82, 0.58, '#f6f5f1', 0, 0.03, 0, 0.02),
    ...legs(0.5, 0.48, 0.03, METAL, 0.02),
    box(0.56, 0.1, 0.01, '#e2e0da', 0, 0.74, 0.292),
    box(0.14, 0.05, 0.012, '#22242a', 0.17, 0.765, 0.293),
    door,
    glass
  );
});

// bamboo shelf tower with bottles and a trailing pothos on top
registerModel('bamboo_shelf', ({ height = 1.45 } = {}) => {
  const B = '#cfa262';
  const g = group(...legs(0.32, 0.26, height, B, 0.014));
  const bottles = ['#e9e6de', '#7c5ab8', '#3f73c9', '#e0a35c', '#d86f8f', '#3c3a38'];
  const r = rng(12);
  for (let i = 0; i < 4; i++) {
    const y = 0.12 + (i * (height - 0.16)) / 3;
    g.add(box(0.36, 0.02, 0.3, B, 0, y, 0));
    if (i === 3) break;
    for (let j = 0; j < 4; j++) g.add(cyl(0.025, 0.03, 0.1 + r() * 0.1, bottles[Math.floor(r() * bottles.length)], -0.11 + j * 0.075, y + 0.02, (r() - 0.5) * 0.12, 8));
  }
  g.add(cyl(0.08, 0.06, 0.12, '#d9c94a', 0, height, 0, 14));
  for (let i = 0; i < 9; i++) g.add(blob(0.06 + r() * 0.03, LEAF[i % 3], (r() - 0.5) * 0.3, height + 0.2 - i * 0.12 * r(), 0.05 + r() * 0.14));
  return g;
});

// wall-hung washbasin with its drain running down to the floor
registerModel('wall_sink', () =>
  group(
    box(0.52, 0.14, 0.4, WHITE, 0, 0.72, 0, 0.06),
    box(0.36, 0.01, 0.24, '#cfd8d6', 0, 0.856, 0.02),
    cyl(0.014, 0.014, 0.11, CHROME, 0, 0.86, -0.13, 8),
    box(0.02, 0.02, 0.1, CHROME, 0, 0.95, -0.09),
    cyl(0.02, 0.02, 0.72, '#e6e6e6', 0, 0, -0.1, 8)
  )
);

// open rain shower: riser rail against the wall (at -z) with a round head
registerModel('rain_shower', ({ height = 2.1 } = {}) =>
  group(
    cyl(0.011, 0.011, height - 0.95, CHROME, 0, 0.95, 0, 8),
    box(0.26, 0.03, 0.05, CHROME, 0, 1.0, 0.02),
    box(0.02, 0.02, 0.36, CHROME, 0, height - 0.02, 0.17),
    cyl(0.11, 0.11, 0.015, CHROME, 0, height - 0.05, 0.34, 20),
    cyl(0.009, 0.009, 0.95, CHROME, 0, 0, 0, 6)
  )
);

// built-in cupboards (kasten): beige doors in a white frame with top boxes, front facing +z
registerModel('builtin_cupboard', ({ width = 1.2, depth = 0.6, height = 2.5, doors = 2, color = '#d9cfb8' } = {}) => {
  const g = group(box(width, height, depth, '#f4f1ea'));
  const w = (width - 0.06) / doors;
  for (let i = 0; i < doors; i++) {
    const x = -width / 2 + 0.03 + (i + 0.5) * w;
    g.add(
      box(w - 0.02, height - 0.5, 0.02, color, x, 0.04, depth / 2 + 0.005),
      box(w - 0.02, 0.38, 0.02, '#ece7dc', x, height - 0.43, depth / 2 + 0.005),
      box(0.015, 0.1, 0.02, METAL, x + (i < doors / 2 ? 1 : -1) * (w / 2 - 0.05), 1.0, depth / 2 + 0.02)
    );
  }
  return g;
});

// ───────────────────────── electronics modelled on the actual devices
// thin rod between two points
function rod(a, b, r, color) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), 8), mat(color));
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}
// small status light; named "glow…" so a behaviour can switch it on
function led(color, x, y, z, r = 0.006) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat('#20242a', { emissive: color, emissiveIntensity: 0 }));
  m.name = 'glow_led';
  m.position.set(x, y, z);
  m.userData.noShadow = true;
  return m;
}

// Walnut TV bench with rounded ends (170 x 39.5 x 38 cm): ribbed sliding doors on both
// sides, a rattan drawer in the middle, six round legs. leftOpen / rightOpen slide a door
// out to the end so the open shelf shows; closed, it covers the shelf.
const BENCH_RIB = '#3d2819';
function stadium(L, D, inset = 0) {
  const r = D / 2 - inset, x = L / 2 - D / 2;
  const sh = new THREE.Shape();
  sh.moveTo(-x, -r);
  sh.lineTo(x, -r);
  sh.absarc(x, 0, r, -Math.PI / 2, Math.PI / 2, false);
  sh.lineTo(-x, r);
  sh.absarc(-x, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  return sh;
}
function slab(L, D, h, color, y, inset = 0) {
  const geo = new THREE.ExtrudeGeometry(stadium(L, D, inset), { depth: h, bevelEnabled: false, curveSegments: 20 });
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat(color));
  m.position.y = y;
  return m;
}
function rattanTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#d9c39a'; x.fillRect(0, 0, 256, 128);
  x.fillStyle = '#4a3324';
  for (let j = 0; j < 16; j++) for (let i = 0; i < 32; i++) { x.beginPath(); x.arc(4 + i * 8 + (j % 2) * 4, 4 + j * 8, 2, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const knob = (x, y, z) => {
  const k = new THREE.Mesh(new THREE.SphereGeometry(0.014, 14, 10), mat('#b48a3c', { metalness: 0.8, roughness: 0.35 }));
  k.position.set(x, y, z);
  return k;
};
registerModel('tv_bench', ({ length = 1.7, depth = 0.395, leftOpen = true, rightOpen = false } = {}) => {
  const L = length, D = depth, LEG = 0.15, TOP = 0.38, SLAB = 0.02;
  const bodyY = LEG + SLAB, bodyH = TOP - SLAB - bodyY, front = D / 2;
  const g = group(
    slab(L, D, SLAB, WALNUT, TOP - SLAB), // top
    slab(L, D - 0.01, SLAB, WALNUT, LEG), // base plate
    slab(L - 0.03, D - 0.03, bodyH, '#2a1b11', bodyY), // carcass
  );
  g.children.forEach((m) => (m.castShadow = true));
  // six round legs
  for (const x of [-0.72, 0, 0.72]) for (const z of [-0.12, 0.12]) g.add(cyl(0.025, 0.022, LEG, WALNUT, x * (L / 1.7), 0, z, 12));
  // ribbed curved ends: thin vertical slats round each half circle
  const r = D / 2 - 0.012, cx = L / 2 - D / 2;
  for (const sx of [-1, 1]) for (let i = 1; i < 14; i++) {
    const a = -Math.PI / 2 + (i / 14) * Math.PI;
    const slat = box(0.012, bodyH - 0.01, 0.02, BENCH_RIB, sx * (cx + Math.cos(a) * r), bodyY + 0.005, Math.sin(a) * r);
    slat.rotation.y = -sx * a;
    g.add(slat);
  }
  // centre drawer: frame, rattan panel and a brass knob
  const dz = front - 0.004;
  g.add(box(0.5, bodyH - 0.01, 0.012, '#4a3324', 0, bodyY + 0.005, dz, 0.003));
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.1), new THREE.MeshStandardMaterial({ map: rattanTexture(), roughness: 0.8 }));
  pane.position.set(0, bodyY + bodyH * 0.4, dz + 0.0065);
  g.add(pane);
  g.add(box(0.44, 0.012, 0.004, '#3a2617', 0, bodyY + bodyH - 0.045, dz + 0.006));
  g.add(knob(0, bodyY + bodyH - 0.03, dz + 0.02));
  // the two shelves (dark) with an arch on the inner side, and the sliding doors
  const dw = 0.3, dh = bodyH - 0.012;
  for (const [sx, open] of [[-1, leftOpen], [1, rightOpen]]) {
    const sc = (L / 2 - 0.25) / 0.6; // keeps the proportions if the length is changed
    const mid = sx * (0.25 + 0.15 * sc);
    g.add(box(0.33 * sc, bodyH - 0.01, 0.006, '#1a110b', sx * (0.25 + 0.165 * sc), bodyY + 0.005, front - 0.02));
    const arch = new THREE.Mesh(new THREE.CircleGeometry(bodyH / 2 - 0.006, 20, sx < 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI), mat(WALNUT));
    arch.position.set(sx * (0.25 + 0.002), bodyY + bodyH / 2, front - 0.016);
    arch.scale.x = 1.3;
    g.add(arch);
    const dx = open ? sx * (L / 2 - D / 2 - dw / 2 + 0.1) : mid;
    const door = group(box(dw, dh, 0.012, BENCH_RIB, 0, 0, 0, 0.002));
    for (let i = -17; i <= 17; i++) door.add(box(0.006, dh - 0.004, 0.003, '#4d3322', i * 0.0105, 0.002, 0.0075));
    door.add(knob(-sx * 0.1, dh * 0.5, 0.02));
    door.position.set(dx, bodyY + 0.006, front - 0.003);
    g.add(door);
  }
  return g;
});

// Samsung CU7172 55": 1.23 m wide, thin bezel, two V-shaped feet near the ends
registerModel('samsung_tv', ({ width = 1.231, height = 0.708 } = {}) => {
  const screen = box(width - 0.016, height - 0.02, 0.006, '#101114', 0, 0.062, 0.012);
  screen.name = 'screen';
  const g = group(box(width, height, 0.026, '#18191c', 0, 0.05, 0, 0.004), screen, box(0.07, 0.008, 0.004, '#3a3c40', 0, 0.052, 0.014));
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) g.add(rod([sx * (width / 2 - 0.2), 0.06, 0], [sx * (width / 2 - 0.2), 0, sz * 0.11], 0.007, '#111214'));
  return g;
});

// Tapo D210 video doorbell: its back is against the wall at z = 0, the origin is its lower edge
registerModel('tapo_doorbell', () => {
  const lens = cyl(0.014, 0.014, 0.008, '#0c0d10', 0, 0, 0, 20);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0.125, 0.03);
  const ring = cyl(0.014, 0.014, 0.005, '#f7f7f5', 0, 0, 0, 24);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 0.072, 0.028);
  return group(
    box(0.052, 0.155, 0.026, '#f1f1ee', 0, 0, 0.013, 0.004),
    box(0.05, 0.052, 0.004, '#1a1b1e', 0, 0.1, 0.027),
    lens,
    ring,
    box(0.044, 0.042, 0.004, '#141518', 0, 0.006, 0.027),
    led('#5cc8ff', 0, 0.095, 0.03, 0.004)
  );
});

// Tapo C200 pan / tilt camera: round white base, ball head with a black face towards +z
registerModel('tapo_camera', () => {
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.043, 24, 16), mat('#f4f4f2', { roughness: 0.5 }));
  head.position.y = 0.075;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.0435, 24, 16, 0, Math.PI * 2, 0, 0.95), mat('#101114', { roughness: 0.3 }));
  face.position.y = 0.075;
  face.rotation.x = Math.PI / 2 - 0.15;
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 10), mat('#2a2f3a', { roughness: 0.2 }));
  lens.position.set(0, 0.08, 0.037);
  return group(cyl(0.036, 0.043, 0.04, '#f4f4f2', 0, 0, 0, 28), cyl(0.03, 0.036, 0.02, '#e9e9e6', 0, 0.04, 0, 28), head, face, lens, led('#5cf08a', 0, 0.098, 0.036, 0.003));
});

// curved monitor on its stand, screen facing +z and bending towards the viewer
function curvedMonitor({ width, height, radius, lift, foot, glowColor = '#6f8fc8' }) {
  const a = width / radius;
  const shell = (r, h, angle, material) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24, 1, true, Math.PI - angle / 2, angle), material);
    m.position.set(0, lift + height / 2, radius);
    return m;
  };
  const dark = mat('#141518', { side: THREE.DoubleSide, roughness: 0.5 });
  const lit = mat('#15171a', { side: THREE.DoubleSide, emissive: glowColor, emissiveIntensity: 0.55, roughness: 0.4 });
  const g = group(
    shell(radius + 0.012, height, a, dark),
    shell(radius - 0.001, height - 0.03, a * 0.975, lit),
    box(0.05, lift + height * 0.6, 0.03, '#141518', 0, 0, -0.07),
    box(0.1, 0.1, 0.06, '#141518', 0, lift + height * 0.4, -0.045)
  );
  for (const sx of [-1, 1]) g.add(rod([0, 0.008, -0.07], [sx * foot, 0.008, 0.14], 0.009, '#141518'));
  if (foot > 0.25) g.add(rod([0, 0.008, -0.07], [0, 0.008, -0.2], 0.009, '#141518'));
  return g;
}
// MSI MAG 342CQR E2: 34" ultrawide, 1500R
registerModel('msi_mag342', () => curvedMonitor({ width: 0.81, height: 0.365, radius: 1.5, lift: 0.13, foot: 0.3, glowColor: '#8fb04a' }));
// Samsung C24RG50: 24", 1800R, V-shaped foot
registerModel('samsung_c24rg50', () => curvedMonitor({ width: 0.545, height: 0.325, radius: 1.8, lift: 0.1, foot: 0.22 }));

// white architect lamp clamped to a desk edge; the arm reaches along +x
registerModel('clamp_lamp', ({ reach = 0.4 } = {}) => {
  const W = '#f1f1ee';
  const elbow = [-0.14, 0.42, 0], tip = [reach, 0.66, 0];
  const shade = glow(cyl(0.035, 0.085, 0.11, W, 0, 0, 0, 20));
  shade.position.set(reach + 0.03, 0.6, 0);
  shade.rotation.z = -0.5;
  return group(
    box(0.04, 0.06, 0.04, W, 0, -0.03, 0),
    cyl(0.012, 0.012, 0.05, W, 0, 0, 0, 8),
    rod([0, 0.04, 0.012], elbow.map((v, i) => v + (i === 2 ? 0.012 : 0)), 0.006, W),
    rod([0, 0.04, -0.012], elbow.map((v, i) => v - (i === 2 ? 0.012 : 0)), 0.006, W),
    rod(elbow.map((v, i) => v + (i === 2 ? 0.012 : 0)), tip.map((v, i) => v + (i === 2 ? 0.012 : 0)), 0.006, W),
    rod(elbow.map((v, i) => v - (i === 2 ? 0.012 : 0)), tip.map((v, i) => v - (i === 2 ? 0.012 : 0)), 0.006, W),
    shade,
    anchor(reach + 0.06, 0.5, 0)
  );
});

// IKEA Markus: tall mesh back with a headrest, loop armrests, five-star base on castors
registerModel('markus_chair', () => {
  const GREY = '#3b3d42';
  const g = group(
    ...starBase(0.33, BLACK, 0.06),
    cyl(0.03, 0.03, 0.33, BLACK, 0, 0.09, 0, 10),
    box(0.5, 0.09, 0.48, GREY, 0, 0.42, 0.02, 0.04),
    tilted(box(0.46, 0.72, 0.035, '#2e3035', 0, 0.52, -0.27, 0.02), -0.12),
    tilted(box(0.44, 0.16, 0.06, GREY, 0, 0.58, -0.22, 0.03), -0.12),
    tilted(box(0.36, 0.17, 0.07, GREY, 0, 1.2, -0.33, 0.03), -0.12)
  );
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.add(cyl(0.028, 0.028, 0.04, BLACK, Math.sin(a) * 0.33, 0, Math.cos(a) * 0.33, 10));
  }
  for (const x of [-0.29, 0.29])
    g.add(box(0.045, 0.025, 0.26, BLACK, x, 0.66, 0.02, 0.01), rod([x, 0.46, 0.12], [x, 0.66, 0.14], 0.012, BLACK), rod([x, 0.46, -0.1], [x, 0.66, -0.1], 0.012, BLACK));
  return g;
});

// Corner sofa bed with tufted cushions, 291 x 183 cm: back at -z, wide rounded
// arm at the +x end, chaise at the -x end reaching forward. mirror: true swaps the ends.
registerModel('tufted_corner_sofa', ({ length = 2.91, chaise = 1.83, depth = 0.94, color = '#b4532f', mirror = false } = {}) => {
  const L = length, back = -depth / 2, arm = 0.35, low = 0.16, cw = 0.9;
  const shade = '#' + new THREE.Color(color).offsetHSL(0, 0, -0.04).getHexString();
  const g = group(
    box(L - arm, 0.3, depth, color, -arm / 2, 0.05, 0, 0.04),
    box(cw, 0.3, chaise, color, -L / 2 + cw / 2, 0.05, back + chaise / 2, 0.04),
    box(L - arm - low, 0.3, 0.2, color, (low - arm) / 2, 0.42, back + 0.1, 0.06),
    box(arm, 0.52, depth, color, L / 2 - arm / 2, 0.05, 0, 0.14),
    box(low, 0.45, depth - 0.04, color, -L / 2 + low / 2, 0.05, -0.02, 0.07)
  );
  // seat: three tufted pads on the long part, three along the chaise
  const x0 = -L / 2 + cw, w = (L - arm - cw) / 3;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 2; j++) g.add(box(w - 0.02, 0.12, 0.34, j ? color : shade, x0 + (i + 0.5) * w, 0.33, back + 0.22 + 0.17 + j * 0.35, 0.05));
  const n = 4, d = (chaise - 0.22) / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < 2; j++) g.add(box((cw - low) / 2 - 0.02, 0.12, d - 0.02, (i + j) % 2 ? color : shade, -L / 2 + low + (j + 0.5) * ((cw - low) / 2), 0.33, back + 0.22 + (i + 0.5) * d, 0.05));
  // loose back cushions and two throw pillows
  const bw = (L - arm - low) / 4;
  for (let i = 0; i < 4; i++) g.add(tilted(box(bw - 0.03, 0.42, 0.16, i % 2 ? shade : color, -L / 2 + low + (i + 0.5) * bw, 0.44, back + 0.27, 0.06), -0.14));
  g.add(tilted(box(0.4, 0.36, 0.12, shade, L / 2 - arm - 0.28, 0.45, back + 0.42, 0.05), -0.3), tilted(box(0.4, 0.36, 0.12, shade, -L / 2 + low + 0.3, 0.45, back + 0.42, 0.05), -0.3));
  for (const [x, z] of [[L / 2 - 0.12, back + 0.1], [L / 2 - 0.12, -back - 0.1], [-L / 2 + 0.12, back + 0.1], [-L / 2 + 0.12, back + chaise - 0.1], [-L / 2 + cw - 0.1, back + chaise - 0.1]])
    g.add(box(0.14, 0.05, 0.05, CHROME, x, 0, z));
  if (mirror) g.scale.x = -1;
  return group(g);
});

// round wall mirror with a thin black rim: back against the wall at z = 0, origin at its lowest point
registerModel('round_mirror', ({ radius = 0.3 } = {}) => {
  const disc = (r, depth, material, z) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, depth, 40), material);
    m.rotation.x = Math.PI / 2;
    m.position.set(0, radius, z);
    return m;
  };
  return group(
    disc(radius, 0.025, mat('#17181b'), 0.0125),
    disc(radius - 0.015, 0.006, mat('#c3ccd4', { metalness: 0.9, roughness: 0.12 }), 0.026)
  );
});

// pothos trailing along a wall: starts at the origin and wanders along +x, leaves towards +z
registerModel('pothos_vine', ({ length = 2, seed = 4 } = {}) => {
  const g = group();
  const r = rng(seed);
  const n = Math.round(length / 0.07);
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = [t * length, 0.16 * Math.sin(t * Math.PI * 2.6) + 0.1 * Math.sin(t * Math.PI * 7) - 0.12 * t, 0.03];
    if (prev) g.add(rod(prev, p, 0.004, '#5f7d3a'));
    prev = p;
    if (i % 2 && r() < 0.85) {
      const leaf = blob(0.045 + r() * 0.03, r() < 0.25 ? '#a9c46a' : LEAF[i % 3], p[0] + (r() - 0.5) * 0.05, p[1] + (r() - 0.6) * 0.12, 0.04 + r() * 0.03);
      leaf.scale.set(1, 1.25, 0.25);
      leaf.rotation.z = (r() - 0.5) * 1.2;
      g.add(leaf);
    }
  }
  return g;
});

// Calico cat: white with orange and dark tabby patches, ringed tail, orange
// collar. Faces +z. The parts named leg0-3, tail and body are animated by the
// "pet" behaviour (src/behaviors.js).
registerModel('calico_cat', () => {
  const FUR = '#f3efe8', ORANGE = '#d98a3c', DARK = '#3b302b', TABBY = '#6e5a4c';
  const ball = (r, color, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(color, { roughness: 0.95 }));
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  };
  const body = group(
    ball(0.1, FUR, 0, 0.2, 0, 0.85, 0.8, 1.9),
    ball(0.1, ORANGE, 0, 0.215, 0.02, 0.8, 0.72, 0.9),
    ball(0.1, DARK, 0.01, 0.215, -0.1, 0.82, 0.74, 0.85),
    ball(0.1, ORANGE, -0.02, 0.222, -0.15, 0.6, 0.66, 0.4),
    ball(0.085, FUR, 0, 0.19, 0.13, 0.9, 0.95, 0.9),
    // head
    ball(0.07, FUR, 0, 0.29, 0.21),
    ball(0.07, DARK, -0.022, 0.305, 0.195, 0.75, 0.8, 0.85),
    ball(0.07, ORANGE, 0.024, 0.305, 0.195, 0.72, 0.8, 0.85),
    ball(0.035, FUR, 0, 0.27, 0.262, 1.1, 0.8, 0.8),
    ball(0.008, '#e79a9a', 0, 0.282, 0.292),
    ball(0.011, '#9bb04a', -0.027, 0.302, 0.268),
    ball(0.011, '#9bb04a', 0.027, 0.302, 0.268),
    ball(0.005, '#16130f', -0.027, 0.302, 0.277),
    ball(0.005, '#16130f', 0.027, 0.302, 0.277)
  );
  for (const [sx, color] of [[-1, DARK], [1, ORANGE]]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.055, 4), mat(color, { flatShading: true }));
    ear.position.set(sx * 0.04, 0.365, 0.2);
    ear.rotation.z = -sx * 0.25;
    body.add(ear);
  }
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.011, 8, 20), mat('#f07a1a'));
  collar.position.set(0, 0.25, 0.165);
  collar.rotation.x = 1.0;
  body.add(collar);
  body.name = 'body';
  // ringed tail, hinged where it leaves the body
  const tail = group();
  tail.name = 'tail';
  tail.position.set(0, 0.23, -0.18);
  for (let i = 0; i < 6; i++) {
    const seg = cyl(0.018 - i * 0.0012, 0.02 - i * 0.0012, 0.05, i % 2 ? DARK : TABBY, 0, i * 0.045, 0, 10);
    tail.add(seg);
  }
  tail.rotation.x = -0.7;
  body.add(tail);
  const g = group(body);
  [[-0.05, 0.12], [0.05, 0.12], [-0.05, -0.13], [0.05, -0.13]].forEach(([x, z], i) => {
    const leg = group(cyl(0.021, 0.019, 0.15, FUR, 0, -0.15, 0, 10), ball(0.024, FUR, 0, -0.145, 0.008, 1, 0.6, 1.3));
    leg.name = `leg${i}`;
    leg.position.set(x, 0.155, z);
    g.add(leg);
  });
  return g;
});

// ───────────── kitchen, modelled on the photos: cream gloss units, steel bar
// handles, dark marble worktop. All face +z; the worktop is a separate `box`.
const CREAM = '#efe9dc';
const STEEL = '#b9bdc0';
const bar = (w, y, x = 0, z = 0.31) => box(w, 0.012, 0.022, STEEL, x, y, z);

// base unit, 0.86 tall without the worktop. type: doors | drawers | sink | oven | corner
registerModel('kitchen_unit', ({ width = 0.6, type = 'doors', height = 0.86 } = {}) => {
  const g = group(
    box(width - 0.004, 0.08, 0.5, '#4a3f36', 0, 0, -0.03),
    box(width - 0.004, height - 0.08, 0.6, CREAM, 0, 0.08, 0)
  );
  if (type === 'drawers') {
    for (const y of [0.1, 0.35, 0.6]) g.add(box(width - 0.03, 0.005, 0.01, '#cfc8b8', 0, y + 0.22, 0.303));
    for (const y of [0.3, 0.55, 0.78]) g.add(bar(width * 0.55, y));
  } else if (type === 'oven') {
    g.add(box(width - 0.04, 0.5, 0.02, STEEL, 0, 0.12, 0.305));
    g.add(box(width - 0.14, 0.26, 0.012, '#1a1b1d', 0, 0.2, 0.318));
    g.add(bar(width - 0.12, 0.5, 0, 0.345));
    // gas hob on top, two pans
    g.add(box(0.58, 0.012, 0.5, '#2a2b2d', 0, height + 0.04, 0));
    for (const [x, z] of [[-0.14, -0.1], [0.14, -0.1], [-0.14, 0.12], [0.14, 0.12]])
      g.add(cyl(0.045, 0.05, 0.02, '#151515', x, height + 0.052, z, 14));
    g.add(cyl(0.13, 0.11, 0.045, '#2a2a2c', -0.14, height + 0.06, -0.1));
  } else {
    g.add(box(0.004, height - 0.12, 0.01, '#cfc8b8', 0, 0.1, 0.303));
    g.add(bar(width * 0.5, height - 0.1));
    if (type === 'sink') {
      g.add(cyl(0.2, 0.2, 0.012, '#aeb6b8', 0, height + 0.04, 0, 28));
      g.add(cyl(0.012, 0.012, 0.28, '#9aa2a4', 0, height + 0.04, -0.2, 8));
    }
  }
  return g;
});

registerModel('kitchen_wall_cab', ({ width = 0.6, height = 0.7, depth = 0.34, hood = false } = {}) => {
  const g = group(box(width - 0.004, height, depth, CREAM, 0, 0, 0));
  g.add(box(0.004, height - 0.1, 0.01, '#cfc8b8', 0, 0.05, depth / 2 + 0.003));
  g.add(bar(width * 0.5, 0.06, 0, depth / 2 + 0.01));
  if (hood) g.add(box(width - 0.004, 0.025, depth + 0.1, '#e4ddcf', 0, 0, 0.05));
  return g;
});

// tall column: kind fridge | pantry
registerModel('kitchen_tall', ({ width = 0.6, height = 2.3, kind = 'pantry' } = {}) => {
  const g = group(
    box(width - 0.004, 0.08, 0.5, '#4a3f36', 0, 0, -0.03),
    box(width - 0.004, height - 0.08, 0.6, CREAM, 0, 0.08, 0)
  );
  const lines = kind === 'fridge' ? [0.62, 1.55, 1.95] : [0.7, 1.45];
  for (const y of lines) g.add(box(width - 0.03, 0.005, 0.01, '#cfc8b8', 0, y, 0.303));
  const hy = kind === 'fridge' ? [0.45, 1.2, height - 0.12] : [0.9, height - 0.12];
  for (const y of hy) g.add(bar(width * 0.4, y, 0, 0.312));
  return g;
});

registerModel('dishwasher', () =>
  group(
    box(0.596, 0.84, 0.58, '#b4b9bc', 0, 0, 0, 0.01),
    box(0.5, 0.05, 0.01, '#8d9396', 0, 0.74, 0.292),
    box(0.4, 0.012, 0.02, '#6f7478', 0, 0.68, 0.3)
  )
);

registerModel('trash_can', () =>
  group(
    box(0.4, 0.62, 0.3, '#2a2b2e', 0, 0, 0, 0.07),
    box(0.4, 0.07, 0.3, '#1d1e20', 0, 0.62, 0, 0.05),
    box(0.3, 0.012, 0.02, '#4a4b4f', 0, 0.55, 0.15)
  )
);

registerModel('coffee_machine', ({ color = '#b3342c' } = {}) =>
  group(
    box(0.2, 0.26, 0.3, color, 0, 0, 0, 0.03),
    box(0.1, 0.02, 0.1, '#222', 0, 0.26, 0.06),
    box(0.14, 0.03, 0.12, '#222', 0, 0, 0.08)
  )
);

// ceiling track with three spots, lying along x; light_anchor under the middle spot
registerModel('track_light', ({ height = 2.6 } = {}) => {
  const g = group(box(1.0, 0.025, 0.04, WHITE, 0, height - 0.025, 0));
  for (const x of [-0.35, 0, 0.35]) {
    const s = cyl(0.04, 0.04, 0.16, WHITE, x, height - 0.2, 0, 14);
    s.rotation.z = x * 0.8;
    g.add(s);
  }
  g.add(glow(cyl(0.035, 0.035, 0.01, WHITE, 0, height - 0.285, 0, 14)));
  g.add(anchor(0, height - 0.3, 0));
  return g;
});
