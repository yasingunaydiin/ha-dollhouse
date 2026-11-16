// Pieces from the living room photos: two framed posters, the big monstera in its
// white bag, the round wooden side table and the IKEA Barometer floor lamp.
// Metres, origin on the floor (posters: bottom centre, z = 0 is the wall), front +z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { registerModel } from './registry.js';
import { drawn, textured, rng } from './shelf.js';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
function box(w, h, d, color, x = 0, y = 0, z = 0, radius = 0, extra = {}) {
  const geo = radius ? new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat(color, extra));
  m.position.set(x, y + h / 2, z);
  return m;
}
function cyl(rTop, rBottom, h, color, x = 0, y = 0, z = 0, extra = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, 28), mat(color, extra));
  m.position.set(x, y + h / 2, z);
  return m;
}
const group = (...c) => { const g = new THREE.Group(); if (c.length) g.add(...c); return g; };

export const DECOR_MODELS = ['antwerp_map_poster', 'orchestra_poster', 'monstera_large', 'round_wood_side_table', 'barometer_floor_lamp', 'maul_study_lamp', 'led_strip', 'vecklarfly_blinds', 'vecklarfly_blinds_dark', 'wavy_black_mirror', 'glass_globe_floor_lamp', 'arch_mirror_led', 'dark_oak_shelf', 'sheer_curtains', 'wood_slat_fence', 'wood_slat_gate', 'bamboo_pendant_lamp', 'flat_white_door', 'ivy_hedge_led', 'wood_trellis', 'gravel_patch', 'grass_patch', 'soil_patch', 'bark_mulch_patch', 'sand_patch', 'paving_patch', 'street_lamp', 'oak_tree', 'clothes_rail', 'tarnaby_table_lamp', 'runnen_decking', 'jute_runner', 'anthracite_floor_tiles', 'peacock_wall_tapestry', 'pugg_wall_clock', 'oak_laminate_floor'];

// picture frame with the print behind glass
function framed({ width, height, map, fallback, frame, rim }) {
  const d = 0.016;
  const g = group(box(width, height, 0.004, '#eeeae0', 0, 0, 0.002));
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(width - 2 * rim, height - 2 * rim), textured(map, fallback));
  paper.position.set(0, height / 2, 0.0065);
  g.add(paper);
  g.add(box(width, rim, d, frame, 0, 0, d / 2), box(width, rim, d, frame, 0, height - rim, d / 2));
  g.add(box(rim, height, d, frame, -width / 2 + rim / 2, 0, d / 2), box(rim, height, d, frame, width / 2 - rim / 2, 0, d / 2));
  return g;
}

// Antwerp street map collage in a thin dark frame, 50 x 70
registerModel('antwerp_map_poster', ({ width = 0.5, height = 0.7 } = {}) => {
  const map = drawn(500, 700, (c, w, h) => {
    const r = rng(11);
    c.fillStyle = '#c9ad75'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#eceae3'; c.fillRect(0, 40, w, 460);
    c.strokeStyle = '#b9b9b4'; c.lineWidth = 1.2;
    for (let i = 0; i < 170; i++) { c.beginPath(); c.moveTo(r() * w, 40 + r() * 460); c.lineTo(r() * w, 40 + r() * 460); c.stroke(); }
    c.fillStyle = '#8aa05a';
    for (const [x, y, rx, ry] of [[80, 120, 60, 50], [130, 230, 40, 70], [300, 180, 30, 24], [420, 330, 28, 20], [210, 330, 24, 30]]) { c.beginPath(); c.ellipse(x, y, rx, ry, 0.5, 0, 7); c.fill(); }
    c.strokeStyle = '#4f7fa8'; c.lineWidth = 26; c.beginPath(); c.moveTo(270, 40); c.quadraticCurveTo(380, 90, 500, 130); c.stroke();
    c.fillStyle = '#dcd9d0'; c.fillRect(0, 280, 120, 230);
    c.fillStyle = '#bcc8b0'; c.fillRect(0, 360, 300, 340);
    c.fillStyle = '#9fb48f';
    for (let i = 0; i < 40; i++) c.fillRect(r() * 300, 380 + r() * 300, 30 + r() * 50, 20 + r() * 40);
    c.fillStyle = '#7ea0d0'; c.fillRect(120, 470, 100, 120);
    c.fillStyle = '#d7b9a6'; c.fillRect(335, 345, 160, 230);
    c.fillStyle = '#e6e2c8'; c.fillRect(380, 450, 120, 120);
    c.fillStyle = '#c9ad75'; c.fillRect(300, 585, 200, 115);
    c.fillStyle = '#e8e6df'; c.fillRect(300, 520, 70, 65);
    c.fillStyle = '#f4f3ee'; c.font = 'italic 14px sans-serif'; c.fillText('Schelde', 380, 100);
  });
  return framed({ width, height, map, fallback: '#cfd3c4', frame: '#3b2a24', rim: 0.01 });
});

// "Instruments of the Symphony Orchestra" print in a gold frame, 50 x 75
registerModel('orchestra_poster', ({ width = 0.5, height = 0.75 } = {}) => {
  const map = drawn(500, 750, (c, w, h) => {
    c.fillStyle = '#f0eee6'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#c0392b'; c.lineWidth = 1.5; c.strokeRect(14, 14, w - 28, h - 28);
    c.fillStyle = '#2a2420'; c.textAlign = 'center';
    c.font = 'bold 22px Georgia, serif'; c.fillText('INSTRUMENTS OF THE SYMPHONY ORCHESTRA', w / 2, 52);
    c.fillStyle = '#c0392b'; c.fillRect(40, 60, w - 80, 2);
    c.fillStyle = '#2a2420'; c.font = '12px Georgia, serif'; c.fillText("INSTRUMENTS D'ORCHESTRE SYMPHONIQUE", w / 2, 80);
    const wood = '#7a2f1a', brass = '#c9a43a', dark = '#1b1613';
    for (const [x, y, rx, ry, k] of [[70, 230, 18, 30, 0.9], [112, 232, 18, 32, 0.9], [150, 250, 34, 54, 1.4], [220, 270, 48, 74, 2]]) {
      c.fillStyle = wood; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill();
      c.fillStyle = dark; c.fillRect(x - 2, y - ry - 40 * k, 4, 40 * k);
    }
    c.strokeStyle = brass; c.lineWidth = 7; c.beginPath(); c.arc(300, 205, 38, 0, 7); c.stroke();
    c.lineWidth = 4; c.beginPath(); c.moveTo(250, 168); c.lineTo(250, 300); c.stroke();
    for (let i = 0; i < 6; i++) { c.fillStyle = '#1d1a19'; c.fillRect(350 + i * 22, 240 + (i % 2) * 8, 5, 100 - i * 6); }
    c.strokeStyle = '#a37a2c'; c.lineWidth = 6; c.beginPath(); c.moveTo(80, 330); c.quadraticCurveTo(70, 420, 120, 460); c.lineTo(150, 380); c.closePath(); c.stroke();
    c.fillStyle = brass; c.beginPath(); c.arc(212, 378, 20, 0, 7); c.arc(240, 382, 20, 0, 7); c.fill();
    c.fillStyle = '#e4c14b'; c.fillRect(280, 400, 40, 28);
    c.fillStyle = dark; c.beginPath(); c.moveTo(60, 480); c.lineTo(190, 450); c.lineTo(230, 510); c.lineTo(90, 560); c.fill();
    c.fillStyle = '#8a6a3a'; c.fillRect(335, 395, 140, 30);
    c.fillStyle = '#b34a2a'; c.beginPath(); c.ellipse(400, 560, 60, 24, 0, 0, 7); c.fill();
  });
  return framed({ width, height, map, fallback: '#efece2', frame: '#b8973f', rim: 0.011 });
});

// monstera leaf: a heart-shaped blade with narrow slits cut in from the edge
function leafGeometry() {
  const slits = [-0.95, -0.4, 0.2, 0.75, Math.PI - 0.75, Math.PI - 0.2, Math.PI + 0.4, Math.PI + 0.95].map((a) => (a + Math.PI * 2) % (Math.PI * 2));
  const radius = (phi) => {
    let r = 1;
    const fromBottom = Math.abs(Math.atan2(Math.sin(phi + Math.PI / 2), Math.cos(phi + Math.PI / 2)));
    if (fromBottom < 0.4) r *= 0.4 + (fromBottom / 0.4) * 0.6; // notch where the stem joins
    return r;
  };
  const at = (phi, k = 1) => new THREE.Vector2(Math.cos(phi) * 0.5 * radius(phi) * k, Math.sin(phi) * 0.45 * radius(phi) * k);
  const N = 96, pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, b = ((i + 1) / N) * Math.PI * 2;
    pts.push(at(a));
    for (const s of slits) {
      if (s >= a && s < b) {
        const tip = at(s, 0.35), side = new THREE.Vector2(-Math.sin(s), Math.cos(s)).multiplyScalar(0.018);
        pts.push(at(s).sub(side), tip, at(s).add(side));
      }
    }
  }
  return new THREE.ShapeGeometry(new THREE.Shape(pts));
}

// big monstera in a white woven IKEA bag, about 1.6 m
registerModel('monstera_large', ({ seed = 5, leaves = 13, height = 1.6 } = {}) => {
  const r = rng(seed), g = group();
  g.add(box(0.34, 0.36, 0.26, '#efefec', 0, 0, 0, 0.04, { roughness: 0.9 }));
  for (let i = 0; i < 12; i++) g.add(box(0.04 + r() * 0.05, 0.04, 0.003, ['#3d86c9', '#2a3a55', '#74b0dc'][i % 3], (r() - 0.5) * 0.25, 0.06 + r() * 0.25, 0.131));
  g.add(box(0.3, 0.02, 0.22, '#2d2119', 0, 0.35, 0));
  const leafGeo = leafGeometry();
  const leafMats = ['#1f4a2b', '#1b4025', '#2a5a30', '#17381f'].map((c) => mat(c, { side: THREE.DoubleSide, roughness: 0.45 }));
  const stemMat = mat('#3d6b34');
  for (let i = 0; i < leaves; i++) {
    const t = i / (leaves - 1);
    const ang = r() * Math.PI * 2, reach = 0.12 + r() * 0.35 + t * 0.1;
    const top = 0.55 + t * (height - 0.75) + r() * 0.15;
    const base = new THREE.Vector3((r() - 0.5) * 0.08, 0.36, (r() - 0.5) * 0.08);
    const tip = new THREE.Vector3(Math.cos(ang) * reach, top, Math.sin(ang) * reach);
    const mid = new THREE.Vector3(((base.x + tip.x) / 2) * 0.5, (base.y + tip.y) / 2 + 0.1, ((base.z + tip.z) / 2) * 0.5);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([base, mid, tip]), 12, 0.009, 5), stemMat));
    const leaf = new THREE.Mesh(leafGeo, leafMats[i % leafMats.length]);
    leaf.scale.setScalar(0.75 + r() * 0.4);
    leaf.position.copy(tip);
    leaf.rotation.order = 'YXZ';
    leaf.rotation.y = -ang + Math.PI / 2 + (r() - 0.5) * 0.6;
    leaf.rotation.x = -Math.PI / 2 + 0.25 + r() * 0.5;
    leaf.castShadow = true;
    g.add(leaf);
  }
  return g;
});

// round side table with four splayed solid-wood legs, 50 across and 45 high
registerModel('round_wood_side_table', ({ radius = 0.25, height = 0.45, wood = '#d9a45a', legs = '#c98c3e' } = {}) => {
  const g = group(cyl(radius, radius, 0.02, wood, 0, height - 0.02), cyl(radius * 0.97, radius * 0.97, 0.012, '#b98a4a', 0, height - 0.032));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const top = new THREE.Vector3(Math.cos(a) * radius * 0.5, height - 0.03, Math.sin(a) * radius * 0.5);
    const bot = new THREE.Vector3(Math.cos(a) * radius * 0.92, 0, Math.sin(a) * radius * 0.92);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.016, top.distanceTo(bot), 12), mat(legs));
    leg.position.copy(top).add(bot).multiplyScalar(0.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bot).normalize());
    g.add(leg);
  }
  return g;
});

// IKEA Barometer floor lamp: stacked chrome base, pole, tilting arm with a counterweight and a
// cone shade on the -x side. About 155 high, arm 1 m.
registerModel('barometer_floor_lamp', ({ poleHeight = 1.24, tilt = 32 } = {}) => {
  const chrome = { color: '#c4c7cb', metalness: 0.75, roughness: 0.28 };
  const m = () => new THREE.MeshStandardMaterial(chrome);
  const g = group();
  const disc = (r0, r1, h, y) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, 36), m()); c.position.y = y + h / 2; g.add(c); };
  disc(0.16, 0.15, 0.02, 0); disc(0.14, 0.11, 0.03, 0.02); disc(0.095, 0.075, 0.03, 0.05); disc(0.05, 0.03, 0.03, 0.08);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, poleHeight, 12), m());
  pole.position.y = poleHeight / 2;
  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 20), m());
  pivot.rotation.x = Math.PI / 2; pivot.position.y = poleHeight;
  g.add(pole, pivot);

  const rad = THREE.MathUtils.degToRad(tilt);
  const shadeLen = 0.58, weightLen = 0.43;
  const arm = group();
  arm.position.y = poleHeight;
  arm.rotation.z = rad; // positive tilt raises the -x (shade) end
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, shadeLen + weightLen, 10), m());
  rod.rotation.z = Math.PI / 2; rod.position.x = (weightLen - shadeLen) / 2;
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.045, 14), m());
  knob.rotation.z = Math.PI / 2; knob.position.x = weightLen + 0.02;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 14), m());
  cap.rotation.z = Math.PI / 2; cap.position.x = weightLen - 0.04;
  arm.add(rod, knob, cap);
  g.add(arm);

  const end = new THREE.Vector3(-shadeLen, 0, 0).applyEuler(new THREE.Euler(0, 0, rad));
  const shade = group();
  shade.position.set(end.x, poleHeight + end.y, 0);
  const joint = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 20), m());
  joint.rotation.x = Math.PI / 2;
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.095, 0.16, 32, 1, true), new THREE.MeshStandardMaterial({ ...chrome, side: THREE.DoubleSide, roughness: 0.35 }));
  cone.position.y = -0.1;
  const topCap = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), m());
  topCap.position.y = -0.02;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshStandardMaterial({ color: '#ffb060', emissive: '#ff8912', emissiveIntensity: 0 })); // 2000 K
  bulb.name = 'glow'; bulb.position.y = -0.11;
  const anchor = new THREE.Object3D();
  anchor.name = 'light_anchor'; anchor.position.set(0, -0.14, 0);
  shade.add(joint, cone, topCap, bulb, anchor);
  shade.rotation.z = THREE.MathUtils.degToRad(28); // shade tilts toward the wall
  g.add(shade);
  return g;
});

// MAUL Study desk lamp: clamp, spring-balanced two-part arm, domed shade. White, clamps to
// the desk edge at the back (origin on the desk top) and reaches toward +z, ~65 cm.
registerModel('maul_study_lamp', ({ color = '#f1f1ee', lower = 0.42, upper = 0.46, angle = 60 } = {}) => {
  const body = () => new THREE.MeshStandardMaterial({ color, roughness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: '#25262a', roughness: 0.5 });
  const steel = new THREE.MeshStandardMaterial({ color: '#b8bcc0', metalness: 0.7, roughness: 0.35 });
  const g = group();
  const between = (a, b, r, material) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 10), material);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return m;
  };
  const joint = (p) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 14), body());
    m.rotation.z = Math.PI / 2;
    m.position.copy(p);
    return m;
  };
  // C-clamp: block on the desk, bar down the back edge, jaw underneath, screw with a T handle
  g.add(
    box(0.05, 0.03, 0.06, color, 0, 0, 0, 0.004),
    box(0.02, 0.1, 0.03, color, 0, -0.07, -0.04),
    box(0.05, 0.012, 0.07, color, 0, -0.07, -0.01),
    cyl(0.006, 0.006, 0.04, '#9a9da0', 0, -0.06, -0.01, { metalness: 0.7 })
  );
  const t = cyl(0.005, 0.005, 0.07, '#9a9da0', 0, -0.075, -0.01, { metalness: 0.7 });
  t.rotation.z = Math.PI / 2;
  g.add(t);
  g.add(cyl(0.014, 0.014, 0.07, color, 0, 0.03, -0.02));

  const a = THREE.MathUtils.degToRad(angle), b = THREE.MathUtils.degToRad(8);
  const P0 = new THREE.Vector3(0, 0.105, -0.02);
  const E = P0.clone().add(new THREE.Vector3(0, Math.sin(a), Math.cos(a)).multiplyScalar(lower));
  const T = E.clone().add(new THREE.Vector3(0, Math.sin(b), Math.cos(b)).multiplyScalar(upper));
  for (const p of [P0, E, T]) g.add(joint(p));
  for (const sx of [-1, 1]) {
    const o = new THREE.Vector3(sx * 0.016, 0, 0);
    g.add(between(P0.clone().add(o), E.clone().add(o), 0.006, body()), between(E.clone().add(o), T.clone().add(o), 0.006, body()));
  }
  // springs along both arms, offset toward the back/top of the arm
  const spring = (p, q) => {
    const d = q.clone().sub(p).normalize(), n = new THREE.Vector3(0, d.z, -d.y).multiplyScalar(0.022);
    g.add(between(p.clone().lerp(q, 0.15).add(n), p.clone().lerp(q, 0.85).add(n), 0.007, dark));
    g.add(between(p.clone().lerp(q, 0.15).add(n), p.clone().lerp(q, 0.85).add(n), 0.0035, steel));
  };
  spring(P0, E); spring(E, T);

  // dome shade hanging from the tip, tilted forward-down
  const shade = group();
  shade.position.copy(T);
  shade.rotation.x = THREE.MathUtils.degToRad(35);
  const dome = new THREE.Mesh(
    new THREE.LatheGeometry([[0.03, 0.0], [0.05, -0.012], [0.085, -0.06], [0.11, -0.115], [0.108, -0.118], [0.082, -0.066], [0.048, -0.02], [0.028, -0.004]].map(([r, y]) => new THREE.Vector2(r, y)), 32),
    new THREE.MeshStandardMaterial({ color, roughness: 0.35, side: THREE.DoubleSide })
  );
  const socket = cyl(0.034, 0.034, 0.05, color, 0, -0.005, 0);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#ffc878', emissiveIntensity: 0 }));
  bulb.name = 'glow'; bulb.position.y = -0.085;
  const anchor = new THREE.Object3D();
  anchor.name = 'light_anchor'; anchor.position.y = -0.12;
  shade.add(dome, socket, bulb, anchor);
  for (let i = 0; i < 7; i++) shade.add(box(0.005, 0.03, 0.004, '#8a8d91', -0.034 + i * 0.0113, 0.02, 0.034));
  g.add(shade);
  return g;
});

// LED strip in a slim white channel, 200 x 4 cm by default; the LEDs face +z, so with the
// default turn it sits flat on a wall. Use Placement height and Rotation (or turn it with
// R) to run it under a shelf, along a ceiling edge or behind the TV.
registerModel('led_strip', ({ length = 2, color = '#ff8912', channel = '#f2f2ef' } = {}) => {
  const g = group(box(length, 0.04, 0.008, channel, 0, 0, 0, 0.002));
  const leds = new THREE.Mesh(new THREE.BoxGeometry(length - 0.01, 0.012, 0.003), new THREE.MeshStandardMaterial({ color: '#ffa850', emissive: color, emissiveIntensity: 0 }));
  leds.name = 'glow';
  leds.userData.boost = 2; // glows and lights the room twice as strongly as a normal lamp
  leds.position.set(0, 0.02, 0.0085);
  g.add(leds);
  const a = new THREE.Object3D();
  a.name = 'light_anchor';
  a.position.set(0, 0.02, 0.06);
  g.add(a);
  return g;
});

// IKEA VECKLARFLY wooden venetian blinds: headrail, 50 mm slats on ladder cords, bottom rail.
// The headrail is `height` above the origin and the blind hangs down from there; the front (+z)
// faces the room. Set "Placement height" to the window top minus `height`, then stretch it to the
// window width.
// drop: how far it is pulled down (1 = fully lowered, 0.5 = half); tilt: slat angle in radians.
function blinds({ width = 1.2, height = 1.4, drop = 1, tilt = 0.5, color = '#c9a06a', rail } = {}) {
  const g = group(), slatMat = mat(color, { roughness: 0.65 }), railMat = mat(rail ?? color, { roughness: 0.6 });
  const W = width - 0.012, L = Math.max(0.1, height * drop), pitch = 0.05;
  const head = new THREE.Mesh(new THREE.BoxGeometry(width, 0.045, 0.055), railMat);
  head.position.set(0, height - 0.0225, 0.03);
  g.add(head);
  const n = Math.max(1, Math.floor((L - 0.05) / pitch));
  for (let i = 0; i < n; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(W, 0.004, 0.05), slatMat);
    slat.position.set(0, height - 0.05 - i * pitch, 0.03);
    slat.rotation.x = tilt;
    g.add(slat);
  }
  const bottom = height - 0.05 - n * pitch;
  g.add(
    new THREE.Mesh(new THREE.BoxGeometry(W, 0.016, 0.05), railMat).translateX(0).translateY(bottom).translateZ(0.03)
  );
  // ladder cords at both ends and a pull cord with a small weight
  const cord = mat('#e8e2d4', { roughness: 0.9 });
  for (const sx of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.003, height - 0.05 - bottom + 0.02, 0.003), cord);
    c.position.set(sx * (W / 2 - 0.05), (height - 0.05 + bottom) / 2, 0.056);
    g.add(c);
  }
  const pull = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.5, 0.003), cord);
  pull.position.set(W / 2 - 0.02, height - 0.25 - 0.03, 0.062);
  g.add(pull, box(0.012, 0.03, 0.012, '#d8d2c4', W / 2 - 0.02, height - 0.5 - 0.06, 0.062));
  return g;
}
registerModel('vecklarfly_blinds', (p = {}) => blinds({ color: '#c9a06a', ...p }));
registerModel('vecklarfly_blinds_dark', (p = {}) => blinds({ color: '#4a2f22', rail: '#3b2419', ...p }));

// Sculptural wall mirror in a glossy black, wave-shaped resin frame (~1.4 x 1.15 m).
// Origin: bottom centre on the wall (z = 0); use Placement height to hang it.
registerModel('wavy_black_mirror', ({ scale = 1 } = {}) => {
  const k = 0.002 * scale;
  const pt = ([x, y]) => new THREE.Vector2((x - 430) * k, (870 - y) * k);
  const outer = [[95, 330], [140, 298], [250, 335], [330, 345], [410, 328], [445, 345], [500, 405], [560, 355], [640, 335], [715, 332], [750, 370], [725, 450], [705, 560], [740, 640], [775, 705], [735, 735], [670, 705], [620, 690], [560, 740], [490, 705], [440, 735], [370, 770], [320, 790], [290, 840], [225, 872], [180, 835], [192, 740], [235, 650], [205, 560], [150, 430]].map(pt);
  const hole = [[232, 418], [330, 440], [430, 428], [520, 430], [690, 422], [695, 560], [692, 668], [610, 668], [525, 690], [470, 700], [400, 722], [255, 735], [240, 640], [248, 520]].map(pt);
  const shape = new THREE.Shape(new THREE.SplineCurve(outer.concat([outer[0]])).getPoints(240));
  shape.holes.push(new THREE.Path(new THREE.SplineCurve(hole.concat([hole[0]])).getPoints(120)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.05 * scale, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.015, bevelSegments: 4, curveSegments: 8 });
  const frame = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#0c0c0e', roughness: 0.2, metalness: 0.3 }));
  const mirror = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(new THREE.SplineCurve(hole.concat([hole[0]])).getPoints(120))), new THREE.MeshStandardMaterial({ color: '#c9d3d8', roughness: 0.08, metalness: 0.35 }));
  mirror.position.z = 0.02;
  const g = group(frame, mirror);
  const box3 = new THREE.Box3().setFromObject(g);
  g.children.forEach((c) => c.position.set(c.position.x - (box3.min.x + box3.max.x) / 2, c.position.y - box3.min.y, c.position.z + 0.016));
  return g;
});

// Frosted white glass globe lamp, squashed like a river stone, standing on the floor (~36 cm).
registerModel('glass_globe_floor_lamp', ({ width = 0.38, height = 0.31 } = {}) => {
  const globeMat = new THREE.MeshStandardMaterial({ color: '#fffaf0', emissive: '#ffe2b0', emissiveIntensity: 0, roughness: 0.35 });
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 28), globeMat);
  globe.name = 'glow';
  globe.scale.set(width, height, width * 0.92);
  globe.position.y = height / 2 + 0.015;
  const foot = new THREE.Mesh(new THREE.TorusGeometry(width * 0.2, 0.006, 8, 24), mat('#d8d8d4', { metalness: 0.5 }));
  foot.rotation.x = Math.PI / 2; foot.position.y = 0.006;
  const cable = box(0.004, 0.004, 0.5, '#f1f1ee', 0, 0.002, -width * 0.9);
  const a = new THREE.Object3D();
  a.name = 'light_anchor'; a.position.set(0, height * 0.55, 0);
  return group(globe, foot, cable, a);
});

// Tall arched mirror (50 x 150) with a warm-white LED strip running round its edge.
// Origin: bottom centre on the wall (z = 0).
registerModel('arch_mirror_led', ({ width = 0.5, height = 1.5, color = '#ffe3b3' } = {}) => {
  const r = width / 2;
  const sh = new THREE.Shape();
  sh.moveTo(-r, 0); sh.lineTo(r, 0); sh.lineTo(r, height - r); sh.absarc(0, height - r, r, 0, Math.PI, false); sh.lineTo(-r, 0);
  const g = group();
  const back = new THREE.Mesh(new THREE.ShapeGeometry(sh), mat('#f4f1ea'));
  back.position.z = 0.004; back.scale.set(1.1, 1.03, 1); back.position.y = -0.01;
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ color: '#c9d3d8', roughness: 0.08, metalness: 0.35 }));
  glass.position.z = 0.012;
  const path = sh.getSpacedPoints(160).slice(0, -1).map((p) => new THREE.Vector3(p.x * 1.012, p.y, 0.016));
  const led = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path, true), 200, 0.006, 6, true), new THREE.MeshStandardMaterial({ color: '#fff0d0', emissive: color, emissiveIntensity: 0 }));
  led.name = 'glow'; led.userData.boost = 1.5;
  const a = new THREE.Object3D();
  a.name = 'light_anchor'; a.position.set(0, height * 0.6, 0.15);
  g.add(back, glass, led, a);
  return g;
});

// Dark brown oak wall shelf: a solid plank with visible grain. Origin: back edge, underside
// (z = 0 is the wall, the plank extends to +z); set Placement height to hang it, and stretch
// to change the length. Pass `brackets: true` for two black steel L-brackets under it.
registerModel('dark_oak_shelf', ({ length = 1.2, depth = 0.25, thickness = 0.035, color = '#3b2518', brackets = false } = {}) => {
  const map = drawn(512, 128, (c, w, h) => {
    const r = rng(5);
    c.fillStyle = color; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const y = r() * h, a = r() * 0.22;
      c.strokeStyle = r() > 0.5 ? `rgba(15,8,4,${a})` : `rgba(110,70,40,${a * 0.8})`;
      c.lineWidth = 0.6 + r() * 1.8;
      c.beginPath(); c.moveTo(0, y);
      c.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 8, w * 0.65, y + (r() - 0.5) * 8, w, y + (r() - 0.5) * 6);
      c.stroke();
    }
  });
  const wood = textured(map, color, { roughness: 0.55 });
  const plank = new THREE.Mesh(new THREE.BoxGeometry(length, thickness, depth), wood);
  plank.position.set(0, thickness / 2, depth / 2);
  const g = group(plank);
  if (brackets) {
    for (const x of [-length * 0.35, length * 0.35]) {
      g.add(box(0.015, 0.012, depth * 0.85, '#1c1c1e', x, -0.012, depth * 0.45), box(0.015, 0.16, 0.012, '#1c1c1e', x, -0.16, 0.006));
    }
  }
  return g;
});

// Sheer white voile curtains (tule gordijnen): two pleated panels on a slim rail. The rail is
// `height` above the origin and the fabric hangs down to the floor; front (+z) faces the room.
// Set Placement height to the rail height minus `height`, stretch to the window width.
// open: 0 = drawn shut, 1 = pulled right back to the sides.
registerModel('sheer_curtains', ({ width = 2, height = 2.5, open = 0.7, color = '#f6f4ee', opacity = 0.55, rail = '#d9d6cf' } = {}) => {
  const g = group();
  const stripes = drawn(256, 8, (c, w, h) => {
    const r = rng(9);
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(190,185,175,${0.1 + r() * 0.25})`; c.fillRect(r() * w, 0, 1 + r() * 2.5, h); }
  });
  if (stripes) stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping;
  const fabric = new THREE.MeshStandardMaterial({ color, map: stripes, transparent: true, opacity, side: THREE.DoubleSide, roughness: 0.9, depthWrite: false });
  const rail3 = new THREE.Mesh(new THREE.BoxGeometry(width, 0.025, 0.04), mat(rail, { roughness: 0.5 }));
  rail3.position.set(0, height - 0.0125, 0.03);
  g.add(rail3);
  const panelW = width / 2 + 0.05;
  const cover = panelW * (1 - 0.65 * open); // visible width once the panel is gathered
  const folds = Math.max(4, Math.round(panelW / 0.12));
  for (const side of [-1, 1]) {
    const seg = 60;
    const geo = new THREE.PlaneGeometry(cover, height - 0.03, seg, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) / cover + 0.5; // 0..1 across the panel
      const y = pos.getY(i);
      const wave = Math.sin(u * Math.PI * 2 * folds * (cover / panelW + 0.4)) * 0.028 * (0.6 + 0.4 * (1 - (y + height / 2) / height));
      pos.setZ(i, wave);
    }
    geo.computeVertexNormals();
    const panel = new THREE.Mesh(geo, fabric);
    panel.position.set(side * (width / 2 - cover / 2), (height - 0.03) / 2 + 0.005, 0.03);
    panel.renderOrder = 2;
    g.add(panel);
  }
  return g;
});

// Garden fencing (hekwerk): vertical timber boards in a black steel frame with square steel
// posts. Runs along x, centred, origin on the ground; the boards face +z and -z alike.
const BLACKSTEEL = '#1d2023';
function slatBoards(g, width, height, seed, x0 = 0, y0 = 0) {
  const r = rng(seed);
  const cols = ['#b98a4e', '#c19558', '#ad7f45', '#c79c60', '#b48650'];
  let x = -width / 2;
  while (x < width / 2 - 0.02) {
    const bw = Math.min(0.1 + r() * 0.04, width / 2 - x);
    const shade = cols[Math.floor(r() * cols.length)];
    g.add(box(bw - 0.006, height, 0.022, shade, x0 + x + bw / 2, y0, 0, 0.002));
    x += bw;
  }
}
function post(h, x) { return box(0.08, h + 0.05, 0.08, BLACKSTEEL, x, 0, 0); }

registerModel('wood_slat_fence', ({ length = 3.6, height = 1.8, panel = 1.8 } = {}) => {
  const g = group();
  const n = Math.max(1, Math.round(length / panel));
  const pw = length / n;
  for (let i = 0; i <= n; i++) g.add(post(height, -length / 2 + i * pw));
  for (let i = 0; i < n; i++) {
    const cx = -length / 2 + (i + 0.5) * pw, w = pw - 0.08;
    slatBoards(g, w, height - 0.08, 30 + i, cx, 0.04);
    g.add(box(w, 0.03, 0.045, BLACKSTEEL, cx, height - 0.04, 0), box(w, 0.03, 0.045, BLACKSTEEL, cx, 0.03, 0));
  }
  return g;
});

// single-leaf garden gate in the same style, with hinges and a latch (hinges on the -x side)
registerModel('wood_slat_gate', ({ width = 1, height = 1.8, open = 0 } = {}) => {
  const g = group(post(height, -width / 2), post(height, width / 2));
  const leaf = group();
  const w = width - 0.1;
  slatBoards(leaf, w, height - 0.125, 77, 0, 0.07);
  leaf.add(box(w, 0.035, 0.05, BLACKSTEEL, 0, height - 0.09, 0), box(w, 0.035, 0.05, BLACKSTEEL, 0, 0.07, 0));
  leaf.add(box(0.03, height - 0.12, 0.05, BLACKSTEEL, -w / 2 + 0.015, 0.05, 0), box(0.03, height - 0.12, 0.05, BLACKSTEEL, w / 2 - 0.015, 0.05, 0));
  leaf.add(box(0.1, 0.02, 0.02, '#2d3033', w / 2 - 0.08, 0.95, 0.03));
  leaf.position.set(-width / 2 + 0.04 + w / 2, 0, 0);
  // swing about the hinge side
  const hinge = group(leaf);
  leaf.position.x = w / 2;
  hinge.position.set(-width / 2 + 0.04, 0, 0);
  hinge.rotation.y = -THREE.MathUtils.degToRad(open);
  g.add(hinge);
  return g;
});

// Woven bamboo pendant: a squashed dome of crossed strips on a black cable, ~40 cm wide.
// Origin on the floor under the lamp; `height` is the ceiling, `drop` the cable length.
registerModel('bamboo_pendant_lamp', ({ height = 2.6, drop = 0.75, size = 0.4 } = {}) => {
  const weave = drawn(512, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = '#dcb877'; c.lineWidth = 5; c.lineCap = 'butt';
    for (let i = -h; i < w + h; i += 32) {
      c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke();
      c.beginPath(); c.moveTo(i, h); c.lineTo(i + h, 0); c.stroke();
    }
    c.strokeStyle = '#f0dcae'; c.lineWidth = 1.5;
    for (let i = -h; i < w + h; i += 32) {
      c.beginPath(); c.moveTo(i + 1, 0); c.lineTo(i + h + 1, h); c.stroke();
      c.beginPath(); c.moveTo(i + 1, h); c.lineTo(i + h + 1, 0); c.stroke();
    }
  });
  if (weave) weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
  const R = size / 2, H = size * 0.95;
  const prof = [];
  for (let a = 0.55; a <= 2.59; a += 0.06) prof.push(new THREE.Vector2(R * Math.sin(a), (H / 2) * Math.cos(a)));
  const shadeGeo = new THREE.LatheGeometry(prof, 48);
  const shade = new THREE.Mesh(shadeGeo, new THREE.MeshStandardMaterial({ color: weave ? '#ffffff' : '#dcb877', map: weave, alphaTest: 0.5, transparent: false, side: THREE.DoubleSide, roughness: 0.8 }));
  if (weave) weave.repeat.set(3, 2);
  const cy = height - drop - 0.06;
  shade.position.y = cy;
  const topY = cy + (H / 2) * Math.cos(0.55);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.55, R * 0.55, 0.025, 32), mat('#ead6aa', { roughness: 0.6 }));
  collar.position.y = topY;
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, height - topY, 8), mat('#141414'));
  cable.position.y = (topY + height) / 2;
  const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.1, 14), mat('#141414'));
  socket.position.y = topY - 0.05;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#ffd9a0', emissiveIntensity: 0 }));
  bulb.name = 'glow'; bulb.position.y = cy - 0.02;
  const a = new THREE.Object3D();
  a.name = 'light_anchor'; a.position.y = cy - 0.04;
  return group(shade, collar, cable, socket, bulb, a);
});

// Flush white door leaf (stijldeur): a plain slab with a grey lever handle on the right, 93 x 231.5.
// Origin: bottom centre; the handle side faces +z.
registerModel('flat_white_door', ({ width = 0.93, height = 2.315, color = '#f3f0e8', handle = '#8c9094' } = {}) => {
  const g = group(box(width, height, 0.04, color, 0, 0, 0, 0.002));
  const hx = width / 2 - 0.07;
  for (const sz of [1, -1]) {
    g.add(cyl(0.025, 0.025, 0.01, handle, hx, 0.99, sz * 0.025, { metalness: 0.7, roughness: 0.3 }));
    const rose = g.children[g.children.length - 1];
    rose.rotation.x = Math.PI / 2;
    const lever = box(0.12, 0.018, 0.018, handle, hx - 0.05, 0.98, sz * 0.045, 0.006, { metalness: 0.7, roughness: 0.3 });
    const stem = box(0.018, 0.018, 0.03, handle, hx, 0.98, sz * 0.035, 0.004, { metalness: 0.7, roughness: 0.3 });
    g.add(lever, stem);
  }
  return g;
});

// Ready-made ivy hedge panel in a brick planter, with warm LED fairy lights woven through the
// leaves (they light up with the light entity). Origin: bottom centre; front faces +z.
registerModel('ivy_hedge_led', ({ width = 0.9, height = 1.65, leds = 34, color = '#ffe0a8' } = {}) => {
  const g = group();
  const baseH = 0.2, depth = 0.22;
  g.add(box(width + 0.1, baseH, depth, '#a8744c', 0, 0, 0, 0.005));
  g.add(box(width + 0.12, 0.02, depth + 0.02, '#8c5d3b', 0, baseH, 0, 0.004));
  for (let i = 1; i < 7; i++) g.add(box(0.004, baseH - 0.03, 0.002, '#6f4a30', -width / 2 - 0.05 + (i * (width + 0.1)) / 7, 0.015, depth / 2 + 0.001));
  g.add(box(width, height - baseH, 0.07, '#2f4d2c', 0, baseH, 0)); // dense core so there are no see-through gaps
  const r = rng(17);
  const leafGeo = new THREE.CircleGeometry(0.03, 7);
  const n = Math.round(width * (height - baseH) * 900);
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, side: THREE.DoubleSide }), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), c = new THREE.Color();
  const greens = ['#2e5a2a', '#3d7236', '#4f8a3f', '#25492a', '#5b9446'];
  for (let i = 0; i < n; i++) {
    e.set((r() - 0.5) * 1.2, (r() - 0.5) * 1.2, r() * 6.28);
    q.setFromEuler(e);
    const k = 0.7 + r() * 0.9;
    sc.set(k, k * (0.8 + r() * 0.3), 1);
    m.compose(new THREE.Vector3((r() - 0.5) * width, baseH + 0.02 + r() * (height - baseH - 0.02), (r() - 0.5) * 0.12 + 0.045), q, sc);
    leaves.setMatrixAt(i, m);
    leaves.setColorAt(i, c.set(greens[Math.floor(r() * greens.length)]));
  }
  g.add(leaves);
  // fairy lights: a thin wire zig-zagging up the panel with small glowing bulbs
  const pts = [];
  const rows = 9;
  for (let i = 0; i <= rows; i++) {
    const y = baseH + 0.08 + (i / rows) * (height - baseH - 0.16);
    pts.push(new THREE.Vector3((i % 2 ? 1 : -1) * width * 0.44, y, 0.1));
  }
  const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.002, 4, false), mat('#243a22'));
  g.add(wire);
  const curve = new THREE.CatmullRomCurve3(pts);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.011, 8, 6), new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: color, emissiveIntensity: 0 }), leds);
  bulbs.name = 'glow';
  bulbs.userData.boost = 1.4;
  for (let i = 0; i < leds; i++) {
    const p = curve.getPoint((i + 0.5) / leds);
    m.makeTranslation(p.x, p.y, p.z + 0.01 + r() * 0.02);
    bulbs.setMatrixAt(i, m);
  }
  g.add(bulbs);
  const a = new THREE.Object3D();
  a.name = 'light_anchor'; a.position.set(0, height * 0.55, 0.4);
  g.add(a);
  return g;
});

// Wooden diamond trellis (houten klimrek) for climbing plants, 90 x 180 cm. Origin: bottom
// centre, z = 0 is the back; stand it against a wall or fence, or stretch it to fit.
registerModel('wood_trellis', ({ width = 0.9, height = 1.8, pitch = 0.11, angle = 56, color = '#c98d45', slat = 0.016 } = {}) => {
  const g = group();
  const a = THREE.MathUtils.degToRad(angle);
  const hw = width / 2;
  const wood = mat(color, { roughness: 0.75 });
  // clip an infinite line (point p, direction d) to the panel rectangle
  const clip = (px, py, dx, dy) => {
    let t0 = -1e9, t1 = 1e9;
    for (const [p, d, lo, hi] of [[px, dx, -hw, hw], [py, dy, 0, height]]) {
      if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return null; continue; }
      const u = (lo - p) / d, v = (hi - p) / d;
      t0 = Math.max(t0, Math.min(u, v)); t1 = Math.min(t1, Math.max(u, v));
    }
    return t0 < t1 ? [t0, t1] : null;
  };
  for (const sign of [1, -1]) {
    const dx = Math.cos(a) * sign, dy = Math.sin(a);
    const nx = -dy, ny = dx; // normal, to space the strips
    const span = Math.hypot(width, height);
    for (let k = -span / pitch; k <= span / pitch; k++) {
      const px = nx * k * pitch + (sign > 0 ? -hw : hw) * 0, py = ny * k * pitch + height / 2;
      const hit = clip(px, py, dx, dy);
      if (!hit || hit[1] - hit[0] < 0.03) continue;
      const len = hit[1] - hit[0], mid = (hit[0] + hit[1]) / 2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, slat, 0.008), wood);
      m.position.set(px + dx * mid, py + dy * mid, sign > 0 ? 0.004 : 0.012);
      m.rotation.z = Math.atan2(dy, dx);
      g.add(m);
    }
  }
  return g;
});

// Brick garage / shed: hollow running-bond brick walls, a white-framed window strip and an open
// doorway on the front (+z), a flat corrugated roof with a wide pale fascia. Origin: centre of
// the footprint on the ground. Stretch or set width / depth / height / door to fit.
registerModel('garage', ({ width = 6.22, depth = 3, height = 2.5, door = 1.8, doorHeight = 2.15, doorX = 1.7, windowWidth = 1.9, windowX = -0.9, sill = 1.5, windowTop = 1.95, brick = '#9c5a45', backDoor = 0.9, backDoorX = 1.6, backDoorHeight = 2.05, backDoorColor = '#6b2f45' } = {}) => {
  const t = 0.2;
  const tile = drawn(256, 256, (c, w, h) => {
    const r = rng(41);
    c.fillStyle = '#cfc8bb'; c.fillRect(0, 0, w, h);
    const base = new THREE.Color(brick);
    for (let row = 0; row < 8; row++) {
      const off = row % 2 ? 32 : 0;
      for (let i = -1; i < 5; i++) {
        const col = base.clone().offsetHSL((r() - 0.5) * 0.02, (r() - 0.5) * 0.08, (r() - 0.5) * 0.09);
        c.fillStyle = `#${col.getHexString()}`;
        c.fillRect(i * 64 + off + 2, row * 32 + 2, 60, 28);
      }
    }
  });
  const brickMat = (w, h) => {
    if (!tile) return mat(brick);
    const tx = tile.clone();
    tx.needsUpdate = true;
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    tx.repeat.set(w / 0.84, h / 0.52);
    return new THREE.MeshStandardMaterial({ map: tx, color: '#ffffff', roughness: 0.9 });
  };
  const inside = mat('#4a3d38', { roughness: 0.95 });
  const top = mat('#bdb6aa');
  const g = group();
  // wall block; `out` lists the faces that are outside (brick) — the rest are the dark interior
  const wall = (x0, x1, y0, y1, z0, z1, out) => {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    if (w < 0.005 || h < 0.005 || d < 0.005) return;
    const mats = [
      out.includes('px') ? brickMat(d, h) : inside, out.includes('nx') ? brickMat(d, h) : inside,
      top, top,
      out.includes('pz') ? brickMat(w, h) : inside, out.includes('nz') ? brickMat(w, h) : inside,
    ];
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    g.add(m);
  };
  const W = width / 2, D = depth / 2;
  // back wall (onto the footpath), with a plum-painted door in it
  if (backDoor > 0) {
    const b0 = backDoorX - backDoor / 2, b1 = backDoorX + backDoor / 2;
    wall(-W, b0, 0, height, -D, -D + t, ['nz', 'nx']);
    wall(b0, b1, backDoorHeight, height, -D, -D + t, ['nz']);
    wall(b1, W, 0, height, -D, -D + t, ['nz', 'px']);
    const leaf = group();
    leaf.add(box(backDoor - 0.02, backDoorHeight - 0.02, 0.045, backDoorColor, 0, 0, 0, 0.004, { roughness: 0.6 }));
    for (let i = 1; i < 5; i++) leaf.add(box(0.012, backDoorHeight - 0.06, 0.05, '#4d2033', -backDoor / 2 + (i * backDoor) / 5, 0.02, 0)); // plank grooves
    leaf.add(box(0.03, 0.12, 0.06, '#c9c9c4', backDoor / 2 - 0.12, 1.0, -0.01)); // handle plate
    leaf.add(box(0.1, 0.02, 0.06, '#c9c9c4', backDoor / 2 - 0.18, 1.0, -0.02));
    leaf.position.set(backDoorX, 0, -D + 0.04);
    g.add(leaf);
  } else wall(-W, W, 0, height, -D, -D + t, ['nz']);
  wall(-W, -W + t, 0, height, -D + t, D - t, ['nx']); // left
  wall(W - t, W, 0, height, -D + t, D - t, ['px']); // right
  // front wall with the window strip and the doorway cut out
  const d0 = doorX - door / 2, d1 = doorX + door / 2, w0 = windowX - windowWidth / 2, w1 = windowX + windowWidth / 2;
  const fz0 = D - t, fz1 = D, o = ['pz'];
  wall(-W, w0, 0, height, fz0, fz1, [...o, 'nx']);
  wall(w0, w1, 0, sill, fz0, fz1, o);
  wall(w0, w1, windowTop, height, fz0, fz1, o);
  wall(w1, d0, 0, height, fz0, fz1, o);
  wall(d0, d1, doorHeight, height, fz0, fz1, o);
  wall(d1, W, 0, height, fz0, fz1, [...o, 'px']);
  // floor
  g.add(box(width - 2 * t, 0.03, depth - 2 * t, '#5d5a57', 0, 0, 0));
  // window: white frame, dark glass, a mullion
  const wh = windowTop - sill, wz = D - t / 2;
  const frame = '#efede7';
  const fr = (w, h, x, y) => { const m = box(w, h, t + 0.04, frame, x, y, 0); m.position.z = wz + 0.02; g.add(m); };
  fr(windowWidth + 0.06, 0.05, windowX, sill - 0.04);
  fr(windowWidth + 0.06, 0.05, windowX, windowTop - 0.01);
  fr(0.05, wh + 0.1, w0 - 0.01, sill - 0.04);
  fr(0.05, wh + 0.1, w1 + 0.01, sill - 0.04);
  fr(0.04, wh, windowX + 0.2, sill);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(windowWidth, wh, 0.01), new THREE.MeshStandardMaterial({ color: '#1a2026', roughness: 0.1, metalness: 0.4 }));
  glass.position.set(windowX, sill + wh / 2, wz);
  g.add(glass);
  // roof: corrugated sheets with a wide pale fascia along the front
  const roofY = height;
  g.add(box(width + 0.4, 0.04, depth + 0.5, '#4b4a49', 0, roofY, 0.1));
  const ribs = Math.round((width + 0.4) / 0.09);
  for (let i = 0; i < ribs; i++) g.add(box(0.045, 0.035, depth + 0.5, '#5a5957', -(width + 0.4) / 2 + 0.02 + (i + 0.5) * ((width + 0.4) / ribs), roofY + 0.04, 0.1));
  g.add(box(width + 0.4, 0.3, 0.05, '#cfcdc7', 0, roofY - 0.26, D + 0.33));
  g.add(box(width + 0.4, 0.08, 0.3, '#b9b7b1', 0, roofY - 0.04, D + 0.2));
  return g;
});

// Gravel (grind) ground cover: a flat bed of small pebbles in mixed greys and beiges. Origin: centre,
// on the ground; stretch it or set width / depth. `color` picks the tone: light, warm or dark.
registerModel('gravel_patch', ({ width = 2, depth = 2, tone = 'light', stone = 0.022, thickness = 0.03 } = {}) => {
  const palettes = {
    light: ['#cfc7b6', '#bdb6a6', '#d9d2c2', '#a9a395', '#e0d9ca'],
    warm: ['#c9b08a', '#b89a74', '#d6c09b', '#a88a66', '#ddc9a8'],
    dark: ['#6e6c6a', '#5a5856', '#807d79', '#494846', '#8f8b85'],
  };
  const cols = palettes[tone] ?? palettes.light;
  const g = group(box(width, thickness * 0.6, depth, cols[3], 0, 0, 0));
  const n = Math.min(6000, Math.round(width * depth * 1600));
  const geo = new THREE.IcosahedronGeometry(stone, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true }), n);
  const r = rng(Math.round(width * 10 + depth * 100 + 3));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    e.set(r() * 6.28, r() * 6.28, r() * 6.28);
    q.setFromEuler(e);
    const k = 0.6 + r() * 0.9;
    m.compose(new THREE.Vector3((r() - 0.5) * (width - 0.02), thickness * 0.5 + r() * thickness * 0.35, (r() - 0.5) * (depth - 0.02)), q, new THREE.Vector3(k, k * (0.5 + r() * 0.3), k * (0.8 + r() * 0.4)));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.set(cols[Math.floor(r() * cols.length)]));
  }
  mesh.userData.noShadow = true;
  g.add(mesh);
  return g;
});

// ── more ground patches. All lie flat on the ground, origin at the centre; stretch them or set
// width / depth. The textured ones repeat every `tile` metres so stretching doesn't smear them.
function flatPatch({ width, depth, thickness, side, draw, tile = 1, px = 256, rough = 0.95 }) {
  const map = drawn(px, px, draw);
  const topMat = map
    ? (() => { map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(width / tile, depth / tile); return new THREE.MeshStandardMaterial({ color: '#ffffff', map, roughness: rough }); })()
    : mat(side);
  const sideMat = mat(side, { roughness: 0.95 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, depth), [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
  m.position.y = thickness / 2;
  m.userData.noShadow = true;
  return m;
}
const speckle = (c, w, h, base, shades, n, size, seed) => {
  const r = rng(seed);
  c.fillStyle = base; c.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { c.fillStyle = shades[Math.floor(r() * shades.length)]; c.fillRect(r() * w, r() * h, size * (0.5 + r()), size * (0.5 + r())); }
};
// scatter instanced bits (blades, clods, bark chips …) over the patch
function scatter(g, { width, depth, count, geo, colors, y, scaleFn, seed, material }) {
  const r = rng(seed);
  const mesh = new THREE.InstancedMesh(geo, material ?? new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true }), count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    e.set(0, r() * 6.28, 0);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3((r() - 0.5) * (width - 0.03), y, (r() - 0.5) * (depth - 0.03)), q, scaleFn(r));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.set(colors[Math.floor(r() * colors.length)]));
  }
  mesh.userData.noShadow = true;
  g.add(mesh);
}

// lawn: textured turf with short blades standing on top
registerModel('grass_patch', ({ width = 2, depth = 2, color = '#6fa44e' } = {}) => {
  const base = new THREE.Color(color);
  const shades = [0.9, 1.0, 1.1, 1.2].map((k) => `#${base.clone().multiplyScalar(k).getHexString()}`);
  const g = group(flatPatch({ width, depth, thickness: 0.04, side: '#4a3a28', tile: 1, draw: (c, w, h) => speckle(c, w, h, color, shades, 2600, 3, 8) }));
  const n = Math.min(7000, Math.round(width * depth * 1300));
  scatter(g, { width, depth, count: n, geo: new THREE.ConeGeometry(0.008, 0.07, 3), colors: shades, y: 0.075, seed: 4, scaleFn: (r) => new THREE.Vector3(1, 0.7 + r() * 0.8, 1) });
  return g;
});

// bare garden soil with a few clods
registerModel('soil_patch', ({ width = 2, depth = 2, color = '#4f3a28' } = {}) => {
  const base = new THREE.Color(color);
  const shades = [0.75, 0.9, 1, 1.15, 1.3].map((k) => `#${base.clone().multiplyScalar(k).getHexString()}`);
  const g = group(flatPatch({ width, depth, thickness: 0.05, side: color, tile: 1, draw: (c, w, h) => speckle(c, w, h, color, shades, 3200, 3, 12) }));
  scatter(g, { width, depth, count: Math.min(1500, Math.round(width * depth * 260)), geo: new THREE.IcosahedronGeometry(0.025, 0), colors: shades, y: 0.05, seed: 6, scaleFn: (r) => new THREE.Vector3(0.6 + r(), 0.4 + r() * 0.4, 0.6 + r()) });
  return g;
});

// bark mulch for borders and under shrubs
registerModel('bark_mulch_patch', ({ width = 2, depth = 2 } = {}) => {
  const cols = ['#6b3f26', '#7d4a2c', '#5a3320', '#8a5733', '#4d2c1b'];
  const g = group(flatPatch({ width, depth, thickness: 0.05, side: '#4d2c1b', tile: 1, draw: (c, w, h) => speckle(c, w, h, '#5c3522', cols, 1800, 5, 3) }));
  scatter(g, { width, depth, count: Math.min(4500, Math.round(width * depth * 1100)), geo: new THREE.BoxGeometry(0.06, 0.012, 0.025), colors: cols, y: 0.058, seed: 9, scaleFn: (r) => new THREE.Vector3(0.6 + r() * 0.9, 1, 0.7 + r() * 0.7) });
  return g;
});

// fine sand (sandpit, beach corner)
registerModel('sand_patch', ({ width = 2, depth = 2, color = '#e0cb98' } = {}) => {
  const base = new THREE.Color(color);
  const shades = [0.93, 1, 1.05, 1.1].map((k) => `#${base.clone().multiplyScalar(k).getHexString()}`);
  return group(flatPatch({ width, depth, thickness: 0.04, side: '#b9a577', tile: 1, rough: 1, draw: (c, w, h) => speckle(c, w, h, color, shades, 5000, 2, 15) }));
});

// paving: klinker bricks in a stretcher-bond pattern. tone: brick | grey | sand
registerModel('paving_patch', ({ width = 2, depth = 2, tone = 'brick' } = {}) => {
  const pal = { brick: ['#9a5a45', '#8c4f3c', '#a86a52', '#7e4636'], grey: ['#8c8c8a', '#7d7d7b', '#9a9a97', '#6f6f6d'], sand: ['#cdb98f', '#bfa97c', '#d8c6a0', '#b39d72'] }[tone] ?? [];
  const cols = pal.length ? pal : ['#9a5a45'];
  return group(flatPatch({
    width, depth, thickness: 0.05, side: cols[3], tile: 0.84, px: 256, rough: 0.9,
    draw: (c, w, h) => {
      const r = rng(29);
      c.fillStyle = '#6c6860'; c.fillRect(0, 0, w, h);
      for (let row = 0; row < 8; row++) {
        const off = row % 2 ? 32 : 0;
        for (let i = -1; i < 5; i++) { c.fillStyle = cols[Math.floor(r() * cols.length)]; c.fillRect(i * 64 + off + 1.5, row * 32 + 1.5, 61, 29); }
      }
    },
  }));
});

// Dutch street lamp: dark tapered pole with a yellow band, a curved arm and a
// flat luminaire. The arm reaches out towards +z (the road); the lamp stays off
// unless the object is linked to a light entity (kind: light).
registerModel('street_lamp', ({ height = 7, reach = 1.9, color = '#2a2f36' } = {}) => {
  const g = group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.1, height, 20), mat(color, { roughness: 0.5, metalness: 0.4 }));
  pole.position.y = height / 2;
  g.add(pole);
  g.add(cyl(0.11, 0.115, 0.1, '#e0b422', 0, 1.3));
  g.add(cyl(0.125, 0.14, 0.25, color, 0, 0, 0, { roughness: 0.5, metalness: 0.4 }));
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, height - 0.15, 0),
    new THREE.Vector3(0, height + 0.15, 0.1),
    new THREE.Vector3(0, height + 0.3, reach * 0.45),
    new THREE.Vector3(0, height + 0.22, reach),
  ]);
  const arm = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.045, 10), mat(color, { roughness: 0.5, metalness: 0.4 }));
  g.add(arm);
  const head = box(0.9, 0.1, 0.3, color, 0, height + 0.12, reach - 0.05, 0.04, { roughness: 0.5, metalness: 0.4 });
  g.add(head);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.2), new THREE.MeshStandardMaterial({ color: '#d8d8d0', emissive: '#ffd9a0', emissiveIntensity: 0 }));
  glow.name = 'glow_lamp';
  glow.rotation.x = Math.PI / 2;
  glow.position.set(0, height + 0.115, reach - 0.05);
  glow.userData.noShadow = true;
  g.add(glow);
  const anchor = new THREE.Object3D();
  anchor.name = 'light_anchor';
  anchor.position.set(0, height + 0.02, reach - 0.05);
  g.add(anchor);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
});

// Big old oak like the ones across the street: a thick tapered trunk (ivy-dark at the
// base), a few heavy limbs and a broad crown made of lumpy leaf clusters in several greens.
// Origin on the ground at the trunk.
registerModel('oak_tree', ({ height = 12, crown = 5.5, seed = 3, tone = '#3e6a35' } = {}) => {
  const r = rng(seed * 977 + 11), g = group();
  const bark = mat('#4a4036', { roughness: 1 });
  const trunkH = height * 0.42;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.62, trunkH, 10), bark);
  trunk.position.y = trunkH / 2;
  g.add(trunk);
  const base = new THREE.Color(tone);
  const leaf = (rad, x, y, z) => {
    const c = base.clone().offsetHSL((r() - 0.5) * 0.04, (r() - 0.5) * 0.1, (r() - 0.5) * 0.1);
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(rad, 1), new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true }));
    m.position.set(x, y, z);
    m.scale.y = 0.8;
    g.add(m);
  };
  // limbs reaching out from the top of the trunk, a leaf cluster on each
  const limbs = 5;
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * Math.PI * 2 + r();
    const reach = crown * (0.35 + 0.25 * r());
    const top = trunkH + height * (0.2 + 0.18 * r());
    const dir = new THREE.Vector3(Math.cos(a) * reach, top - trunkH * 0.9, Math.sin(a) * reach);
    const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, dir.length(), 6), bark);
    limb.position.set(dir.x / 2, trunkH * 0.9 + dir.y / 2, dir.z / 2);
    limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    g.add(limb);
    leaf(crown * (0.42 + 0.14 * r()), dir.x, trunkH * 0.9 + dir.y, dir.z);
    leaf(crown * 0.3, dir.x * 0.6 + (r() - 0.5), trunkH * 0.9 + dir.y * 0.8 + 0.8, dir.z * 0.6 + (r() - 0.5));
  }
  leaf(crown * 0.6, 0, trunkH + height * 0.3, 0);
  leaf(crown * 0.45, (r() - 0.5) * 2, height - crown * 0.2, (r() - 0.5) * 2);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
});

// Wall-mounted clothes rail (kledingrek): a chrome bar on two wall brackets with
// shirts, jackets and knits on hangers. z = 0 is the wall, the rail is `height` up.
registerModel('clothes_rail', ({ length = 1.2, height = 1.7, depth = 0.3, items = 10, seed = 4, rail = '#c9ccd1', clothes = true } = {}) => {
  const rand = rng(seed), g = group(), R = 0.012;
  const metal = { metalness: 0.85, roughness: 0.25 };
  const bar = cyl(R, R, length, rail, 0, 0, 0, metal);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, height, depth);
  g.add(bar);
  for (const sx of [-1, 1]) {
    const x = sx * (length / 2 - 0.06);
    const arm = cyl(0.008, 0.008, depth, rail, 0, 0, 0, metal);
    arm.rotation.x = Math.PI / 2;
    arm.position.set(x, height, depth / 2);
    g.add(arm, box(0.03, 0.09, 0.006, rail, x, height - 0.045, 0.003, 0.002, metal));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.25, 16, 12), mat(rail, metal)).translateX(sx * length / 2).translateY(height).translateZ(depth));
  }
  if (!clothes || items < 1) return g;

  // one garment: its outline (shoulders, hanging sleeves, hem) given some thickness
  const COLORS = ['#f4f3ef', '#7fa3c9', '#f1efe9', '#d9c7ad', '#cdb497', '#efe6d6', '#8a5a3c', '#e9dcc4', '#c9793f', '#c79b6e', '#5d6b7a', '#e8e4dc'];
  function garment(color, len, half, thick, knit) {
    const sleeve = len * (0.62 + rand() * 0.14), s = new THREE.Shape();
    const pts = [[0.055, 0], [half, -0.05], [half + 0.012, -sleeve], [half - 0.075, -sleeve], [half - 0.08, -len], [-(half - 0.08), -len], [-(half - 0.075), -sleeve], [-(half + 0.012), -sleeve], [-half, -0.05], [-0.055, 0]];
    s.moveTo(...pts[0]);
    for (const p of pts.slice(1)) s.lineTo(...p);
    s.closePath();
    const bevel = Math.min(0.012, thick / 2.5);
    const geo = new THREE.ExtrudeGeometry(s, { depth: thick - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2 });
    geo.translate(0, 0, -(thick - 2 * bevel) / 2);
    const m = new THREE.Mesh(geo, mat(color, { roughness: knit ? 1 : 0.85 }));
    m.rotation.y = Math.PI / 2; // hang side-on to the rail
    return m;
  }
  const usable = length - 0.2, step = usable / items;
  for (let i = 0; i < items; i++) {
    const knit = rand() < 0.35;
    const thick = knit ? 0.05 + rand() * 0.025 : 0.022 + rand() * 0.02;
    const item = group(garment(COLORS[Math.floor(rand() * COLORS.length)], 0.62 + rand() * 0.33, 0.2 + rand() * 0.035, Math.min(thick, step * 1.1), knit));
    // hanger: hook over the rail and a short stem down to the collar
    const hook = new THREE.Mesh(new THREE.TorusGeometry(R + 0.004, 0.0025, 8, 20), mat('#b9bcc1', metal));
    hook.rotation.y = Math.PI / 2;
    hook.position.y = 0.075;
    item.add(hook, cyl(0.0025, 0.0025, 0.06, '#b9bcc1', 0, 0, 0, metal));
    item.position.set(-usable / 2 + step * (i + 0.5) + (rand() - 0.5) * step * 0.25, height - 0.075, depth);
    item.rotation.y = (rand() - 0.5) * 0.22;
    g.add(item);
  }
  return g;
});

// IKEA TÄRNABY table lamp, 25 cm tall on a 15 cm base: anthracite oil-lamp body,
// brass dimmer knob, clear glass chimney over an amber candle bulb.
registerModel('tarnaby_table_lamp', ({ color = '#27282b', brass = '#c9a252' } = {}) => {
  const lathe = (pts, material) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 40), material);
  const gold = { metalness: 0.8, roughness: 0.3 };
  const g = group();
  g.add(lathe([[0, 0], [0.072, 0], [0.075, 0.006], [0.075, 0.034], [0.069, 0.049], [0.047, 0.083], [0.041, 0.091], [0.041, 0.104], [0.037, 0.108], [0, 0.108]], mat(color, { roughness: 0.45, metalness: 0.2 })));
  g.add(cyl(0.035, 0.035, 0.004, brass, 0, 0.106, 0, gold), cyl(0.011, 0.012, 0.014, brass, 0, 0.108, 0, gold));
  const knob = cyl(0.0075, 0.0075, 0.014, brass, 0, 0, 0, gold);
  knob.rotation.z = Math.PI / 2;
  knob.position.set(0.049, 0.09, 0.012);
  g.add(knob);

  const bulb = lathe([[0, 0.12], [0.009, 0.12], [0.012, 0.128], [0.019, 0.15], [0.017, 0.17], [0.008, 0.188], [0, 0.196]],
    new THREE.MeshStandardMaterial({ color: '#d99a45', emissive: '#ffb25c', emissiveIntensity: 0, roughness: 0.25, transparent: true, opacity: 0.9 }));
  bulb.name = 'glow';
  g.add(bulb);
  g.add(lathe([[0.033, 0.108], [0.035, 0.12], [0.052, 0.14], [0.056, 0.168], [0.056, 0.205], [0.049, 0.228], [0.033, 0.24], [0.03, 0.25]],
    new THREE.MeshStandardMaterial({ color: '#eef4f5', roughness: 0.05, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false })));

  g.add(box(0.005, 0.005, 0.3, '#1b1b1d', 0, 0.002, -0.22)); // fabric cord out the back
  const a = new THREE.Object3D();
  a.name = 'light_anchor'; a.position.set(0, 0.16, 0);
  g.add(a);
  return g;
});

// IKEA RUNNEN decking (vlonders): 30 x 30 x 2 cm click tiles, each four blocks of
// three acacia slats in a basket-weave on a black plastic grid. Origin: centre, on
// the ground. width / depth are rounded to whole tiles; the default is one pack of 9.
registerModel('runnen_decking', ({ width = 0.9, depth = 0.9, tone = '#a9753f' } = {}) => {
  const TILE = 0.3, Q = TILE / 2, GAP = 0.004, BASE = 0.007, H = 0.02;
  const nx = Math.min(60, Math.max(1, Math.round(width / TILE))), nz = Math.min(60, Math.max(1, Math.round(depth / TILE)));
  const W = nx * TILE, D = nz * TILE;
  const base = box(W - 0.004, BASE, D - 0.004, '#1b1b1c', 0, 0, 0);
  base.userData.noShadow = true;
  const slatW = (Q - GAP) / 3 - GAP, slatL = Q - 2 * GAP;
  const mesh = new THREE.InstancedMesh(new RoundedBoxGeometry(slatW, H - BASE, slatL, 1, 0.002), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75 }), nx * nz * 12);
  const r = rng(nx * 31 + nz * 7 + 5), wood = new THREE.Color(tone), c = new THREE.Color();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), quarter = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), one = new THREE.Vector3(1, 1, 1);
  let i = 0;
  for (let bx = 0; bx < nx * 2; bx++)
    for (let bz = 0; bz < nz * 2; bz++) {
      const cx = -W / 2 + (bx + 0.5) * Q, cz = -D / 2 + (bz + 0.5) * Q, turned = (bx + bz) % 2 === 1;
      for (let k = -1; k <= 1; k++) {
        const off = k * (slatW + GAP);
        m.compose(new THREE.Vector3(cx + (turned ? 0 : off), BASE + (H - BASE) / 2, cz + (turned ? off : 0)), turned ? quarter : q, one);
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i++, c.copy(wood).multiplyScalar(0.82 + r() * 0.36));
      }
    }
  mesh.userData.noShadow = true;
  return group(base, mesh);
});

// Braided jute runner: natural fibre braids sewn round and round in rectangular
// rings, each ring leaning the other way (herringbone), with darker flecks.
// size: [width, length] in metres, like the plain rug. Origin: centre, on the floor.
registerModel('jute_runner', ({ size = [0.75, 2.8], color = '#cfa76a', braid = 0.035 } = {}) => {
  const [W, L] = size, T = 0.012;
  const k = Math.min(420, 1024 / Math.max(W, L)); // pixels per metre
  const base = new THREE.Color(color);
  const shade = (f) => `#${base.clone().multiplyScalar(f).getHexString()}`;
  const map = drawn(Math.max(8, Math.round(W * k)), Math.max(8, Math.round(L * k)), (c, w, h) => {
    const r = rng(Math.round(W * 100 + L * 1000 + 11)), bw = braid * k;
    c.fillStyle = shade(0.72);
    c.fillRect(0, 0, w, h);
    c.lineCap = 'round';
    const rings = Math.ceil(Math.min(w, h) / 2 / bw);
    for (let ring = 0; ring < rings; ring++) {
      const d = (ring + 0.5) * bw, x0 = d, x1 = w - d, y0 = d, y1 = h - d;
      if (x1 < x0 || y1 < y0) break;
      const lean = ring % 2 ? 1 : -1;
      // walk round the ring, laying one strand of the braid every few pixels
      const sides = [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]];
      for (const [ax, ay, bx, by] of sides) {
        const len = Math.hypot(bx - ax, by - ay), ux = len ? (bx - ax) / len : 1, uy = len ? (by - ay) / len : 0;
        const step = bw * 0.34;
        for (let t = 0; t <= len; t += step) {
          const px = ax + ux * t, py = ay + uy * t;
          // a strand crosses the braid at a slant
          const sx = (ux * 0.55 + -uy * lean * 0.5) * bw, sy = (uy * 0.55 + ux * lean * 0.5) * bw;
          c.strokeStyle = r() < 0.035 ? shade(0.5 + r() * 0.15) : shade(0.86 + r() * 0.3);
          c.lineWidth = bw * (0.2 + r() * 0.08);
          c.beginPath();
          c.moveTo(px - sx, py - sy);
          c.lineTo(px + sx, py + sy);
          c.stroke();
        }
      }
      // the seam between two braids
      c.strokeStyle = 'rgba(70, 45, 15, 0.22)';
      c.lineWidth = Math.max(1, bw * 0.07);
      c.strokeRect(x0 - bw / 2, y0 - bw / 2, x1 - x0 + bw, y1 - y0 + bw);
    }
  });
  const top = map ? new THREE.MeshStandardMaterial({ color: '#ffffff', map, bumpMap: map, bumpScale: 0.45, roughness: 1 }) : mat(color, { roughness: 1 });
  const edge = mat(shade(0.8), { roughness: 1 });
  const rug = new THREE.Mesh(new RoundedBoxGeometry(W, T, L, 2, T / 2), [edge, edge, top, edge, edge, edge]);
  rug.position.y = T / 2;
  rug.userData.noShadow = true;
  return group(rug);
});

// Anthracite bathroom floor tiles: large matt concrete-look porcelain with thin light
// grout lines. Origin: centre, on the floor. width / depth set the tiled area, `tile`
// the size of one tile (0.6 = 60 x 60 cm). The pattern repeats, so stretching is fine.
registerModel('anthracite_floor_tiles', ({ width = 1.8, depth = 1.8, tile = 0.6, color = '#4b4e52', grout = '#9a9c9d' } = {}) => {
  const base = new THREE.Color(color);
  const shade = (f, a = 1) => `#${base.clone().multiplyScalar(f).getHexString()}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
  const N = 2, PX = 512, T = PX / N; // the texture holds 2 x 2 tiles, so neighbours differ
  return group(flatPatch({
    width, depth, thickness: 0.01, side: color, tile: tile * N, px: PX, rough: 0.62,
    draw: (c, w, h) => {
      const r = rng(47), line = Math.max(2, Math.round(T * 0.003 / tile));
      c.fillStyle = grout; c.fillRect(0, 0, w, h);
      for (let tx = 0; tx < N; tx++)
        for (let tz = 0; tz < N; tz++) {
          const x = tx * T + line / 2, y = tz * T + line / 2, s = T - line;
          c.save();
          c.beginPath(); c.rect(x, y, s, s); c.clip();
          c.fillStyle = shade(0.94 + r() * 0.12); c.fillRect(x, y, s, s);
          // soft clouds, like poured concrete
          for (let i = 0; i < 26; i++) {
            const cx = x + r() * s, cy = y + r() * s, rad = s * (0.12 + r() * 0.3);
            const g = c.createRadialGradient(cx, cy, 0, cx, cy, rad);
            g.addColorStop(0, shade(r() < 0.5 ? 0.6 : 1.45, 0.3));
            g.addColorStop(1, shade(1, 0));
            c.fillStyle = g; c.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
          }
          // fine grain
          for (let i = 0; i < 1500; i++) { c.fillStyle = shade(r() < 0.5 ? 0.6 : 1.6, 0.22); c.fillRect(x + r() * s, y + r() * s, 1 + r() * 1.5, 1 + r() * 1.5); }
          c.restore();
        }
    },
  }));
});

// a colour scaled by f, as a canvas fill style with alpha
const tint = (color) => { const base = new THREE.Color(color); return (f, a = 1) => `#${base.clone().multiplyScalar(f).getHexString()}${Math.round(a * 255).toString(16).padStart(2, '0')}`; };

// Woven wall tapestry: two peacocks on a balustrade before a mosque and a red sky,
// in an oval on a dark flowered field, red fringe down both short sides, hung from
// wooden pegs. Origin: bottom centre, back against the wall, front +z.
registerModel('peacock_wall_tapestry', ({ width = 1.5, height = 1.0 } = {}) => {
  const map = drawn(900, 600, (c, w, h) => {
    const r = rng(61);
    const blob = (x, y, rx, ry, col, rot = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 7); c.fill(); };
    c.fillStyle = '#1d1c20'; c.fillRect(0, 0, w, h);
    // field: a lattice with red blossoms above and pale ones below
    for (let x = 60; x < w - 45; x += 30)
      for (let y = 60; y < h - 45; y += 30) {
        c.strokeStyle = '#565a62'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(x, y - 13); c.lineTo(x + 13, y); c.lineTo(x, y + 13); c.lineTo(x - 13, y); c.closePath(); c.stroke();
        const col = y < h * 0.45 ? '#c2283a' : ['#d9c8ae', '#c9a3a0', '#e0b34a'][Math.floor(r() * 2.2)];
        for (let k = 0; k < 4; k++) blob(x + Math.cos(k * 1.57 + 0.8) * 4, y + Math.sin(k * 1.57 + 0.8) * 4, 4, 2.6, col, k * 1.57 + 0.8);
      }
    // outer border: scrolling leaves and flowers
    const cols = ['#9fb3a4', '#d9c9b0', '#c98f8f', '#7f9a86', '#b9c9c9'];
    const motif = (x, y) => { for (let k = 0; k < 5; k++) blob(x + (r() - 0.5) * 22, y + (r() - 0.5) * 16, 4 + r() * 6, 2.5 + r() * 3, cols[Math.floor(r() * cols.length)], r() * 3.14); };
    c.fillStyle = '#19181b';
    c.fillRect(0, 0, w, 40); c.fillRect(0, h - 40, w, 40); c.fillRect(0, 0, 40, h); c.fillRect(w - 40, 0, 40, h);
    for (let x = 20; x < w; x += 26) { motif(x, 20); motif(x, h - 20); }
    for (let y = 46; y < h - 40; y += 26) { motif(20, y); motif(w - 20, y); }
    c.strokeStyle = '#e9e4d6'; c.lineWidth = 2.5; c.strokeRect(43, 43, w - 86, h - 86);
    c.strokeStyle = '#2a2a2e'; c.lineWidth = 2; c.strokeRect(5, 5, w - 10, h - 10);

    // the oval scene
    const CX = w / 2, CY = h / 2, RX = 335, RY = 238;
    c.save();
    c.beginPath(); c.ellipse(CX, CY, RX, RY, 0, 0, 7); c.clip();
    c.fillStyle = '#b3202f'; c.fillRect(0, 0, w, h); // red sky
    for (let i = 0; i < 500; i++) blob(r() * w, 60 + r() * 170, 6 + r() * 14, 2 + r() * 3, r() < 0.5 ? '#9c1a2a55' : '#cf3a4555');
    c.fillStyle = '#e6c88f'; // glowing horizon with a ragged upper edge
    c.beginPath(); c.moveTo(0, 300);
    for (let x = 0; x <= w; x += 9) c.lineTo(x, 222 - r() * 26 - (r() < 0.12 ? 22 : 0));
    c.lineTo(w, 300); c.fill();
    for (let x = 100; x < w - 100; x += 7) blob(x, 268 + r() * 14, 7 + r() * 6, 8 + r() * 12, ['#a65a2c', '#8d4a26', '#c0763a'][Math.floor(r() * 3)]); // far trees
    c.fillStyle = '#a9c7cf'; c.fillRect(0, 290, w, 100); // water
    for (let i = 0; i < 60; i++) blob(r() * w, 296 + r() * 88, 14 + r() * 26, 1.2, '#dfeef0aa');
    // mosque across the water
    const mx = 300, my = 292, stone = '#ecd9c4', shadeC = '#b98a72';
    for (const [dx, hh] of [[-62, 150], [-34, 118], [34, 118], [62, 150]]) {
      c.fillStyle = stone; c.fillRect(mx + dx - 3, my - hh, 6, hh);
      c.beginPath(); c.moveTo(mx + dx - 4, my - hh); c.lineTo(mx + dx, my - hh - 22); c.lineTo(mx + dx + 4, my - hh); c.fill();
      c.fillStyle = shadeC; c.fillRect(mx + dx - 5, my - hh * 0.62, 10, 3); c.fillRect(mx + dx - 5, my - hh * 0.82, 10, 3);
    }
    c.fillStyle = stone; c.fillRect(mx - 46, my - 44, 92, 44);
    blob(mx, my - 46, 30, 30, stone); blob(mx - 34, my - 44, 13, 12, stone); blob(mx + 34, my - 44, 13, 12, stone);
    blob(mx, my - 52, 22, 20, '#b0705a');
    c.fillStyle = shadeC; for (let k = -3; k <= 3; k++) { c.beginPath(); c.arc(mx + k * 12, my - 14, 4, Math.PI, 0); c.rect(mx + k * 12 - 4, my - 14, 8, 12); c.fill(); }
    c.fillStyle = stone; c.fillRect(mx - 1, my - 96, 2, 20);
    // blossom trees left and right
    for (const [tx, dir] of [[185, 1], [715, -1]]) {
      c.strokeStyle = '#3a211a'; c.lineCap = 'round';
      for (let k = 0; k < 7; k++) {
        c.lineWidth = 5 - k * 0.5;
        const ex = tx + dir * (k - 2) * 20 + (r() - 0.5) * 20, ey = 120 + r() * 80;
        c.beginPath(); c.moveTo(tx - dir * 20, 400); c.quadraticCurveTo(tx, 280, ex, ey); c.stroke();
        for (let j = 0; j < 4; j++) { const fx = ex + (r() - 0.5) * 36, fy = ey + (r() - 0.5) * 36; for (let p = 0; p < 5; p++) blob(fx + Math.cos(p * 1.26) * 5, fy + Math.sin(p * 1.26) * 5, 4.5, 3, r() < 0.6 ? '#efe6d6' : '#d98a96', p * 1.26); }
      }
    }
    // garden: dark ground, shrubs, the white balustrade
    c.fillStyle = '#17181a'; c.fillRect(0, 385, w, h);
    for (let i = 0; i < 260; i++) { const x = 110 + r() * 680, y = 330 + r() * 80; if (Math.abs(x - CX) < 150 && y < 380) continue; blob(x, y, 3 + r() * 4, 9 + r() * 12, ['#3f5a3a', '#55734a', '#2f4630', '#8f8fb4'][Math.floor(r() * 4)], (r() - 0.5) * 1.2); }
    c.fillStyle = '#efeadd'; c.fillRect(120, 392, 660, 16); c.fillRect(120, 452, 660, 12);
    for (let x = 150; x < 770; x += 42) { blob(x, 430, 9, 20, '#efeadd'); blob(x, 430, 4, 15, '#c9c2b2'); }
    // flower bed in front
    for (let i = 0; i < 520; i++) {
      const x = 130 + r() * 640, y = 455 + r() * 90;
      blob(x, y, 3 + r() * 5, 5 + r() * 9, ['#3f5a3a', '#55734a', '#c44a55', '#d9a13a', '#e7d9c2', '#9a86b8', '#b8696f'][Math.floor(r() * 7)], (r() - 0.5) * 2);
    }
    for (let k = 0; k < 5; k++) { const x = CX - 26 + k * 13; c.strokeStyle = '#55734a'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, 470); c.lineTo(x, 380 - (k % 2) * 16); c.stroke(); for (let j = 0; j < 7; j++) blob(x + (j % 2 ? 4 : -4), 372 - (k % 2) * 16 + j * 9, 5, 4, j % 3 ? '#e2b53c' : '#f0d77a'); }
    // the two peacocks, facing each other
    const peacock = (px, dir) => {
      c.save(); c.translate(px, 292); c.scale(dir * 0.94, 0.94);
      c.strokeStyle = '#c9a23a'; c.lineWidth = 3; c.beginPath(); c.moveTo(6, 0); c.lineTo(8, 100); c.moveTo(20, -4); c.lineTo(24, 100); c.stroke();
      c.beginPath(); c.moveTo(-10, -30); c.bezierCurveTo(-95, 10, -155, 150, -98, 238); c.bezierCurveTo(-62, 262, -12, 242, 4, 200); c.bezierCurveTo(40, 120, 40, 40, 18, -12); c.closePath();
      c.fillStyle = '#b6c39b'; c.fill(); c.strokeStyle = '#3d4a36'; c.lineWidth = 2.5; c.stroke();
      c.save(); c.clip();
      for (let i = 0; i < 260; i++) { const y = -20 + r() * 270, x = -150 + r() * 190; c.strokeStyle = r() < 0.5 ? '#6f8560' : '#dfe6c8'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 5, y + 12); c.stroke(); }
      for (let i = 0; i < 9; i++) {
        const t = i / 8, cy = 14 + t * 208, cx = -10 - t * 50, half = 16 + 44 * Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.8), n = 2 + Math.round(half / 15);
        for (let k = 0; k < n; k++) {
          const x = cx + (n > 1 ? (k / (n - 1) - 0.5) * 2 * half : 0) + (i % 2 ? 6 : -6);
          blob(x, cy, 8, 11, '#eef0dc'); blob(x, cy + 1, 5.5, 8, '#4d6a58'); blob(x, cy + 2, 3.6, 5.5, (i + k) % 2 ? '#d83a3a' : '#e8b73a');
        }
      }
      c.restore();
      blob(4, -22, 40, 25, '#8793a8', -0.5);
      for (let i = 0; i < 26; i++) { const a = r() * 6.28, q = r(); c.strokeStyle = '#2f3644'; c.lineWidth = 1.5; c.beginPath(); c.arc(4 + Math.cos(a) * 30 * q, -22 + Math.sin(a) * 17 * q, 5, 0.3, 2.6); c.stroke(); }
      c.strokeStyle = '#7f9cb0'; c.lineWidth = 13; c.lineCap = 'round'; c.beginPath(); c.moveTo(28, -36); c.quadraticCurveTo(46, -72, 32, -104); c.stroke();
      c.strokeStyle = '#3b5568'; c.lineWidth = 1.5; for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(36, -48 - k * 9, 6, 0.4, 2.7); c.stroke(); }
      blob(33, -108, 9, 8, '#6f8ea6'); blob(36, -110, 1.8, 1.8, '#111');
      c.fillStyle = '#d9b24a'; c.beginPath(); c.moveTo(41, -111); c.lineTo(53, -106); c.lineTo(41, -104); c.fill();
      c.strokeStyle = '#3b5568'; c.lineWidth = 1.5; for (const a of [-0.5, -0.15, 0.2]) { c.beginPath(); c.moveTo(31, -115); c.lineTo(31 + Math.sin(a) * 16, -115 - Math.cos(a) * 16); c.stroke(); blob(31 + Math.sin(a) * 16, -115 - Math.cos(a) * 16, 2.4, 2.4, '#d98a96'); }
      c.restore();
    };
    peacock(400, 1); peacock(520, -1);
    c.restore();
    // the scalloped rim of the oval
    for (let i = 0; i < 96; i++) { const a = i / 96 * 6.283; blob(CX + Math.cos(a) * (RX - 5), CY + Math.sin(a) * (RY - 5), 9, 5, i % 2 ? '#a9bca9' : '#d9c0b4', a + 1.57); }
    c.strokeStyle = '#ece7da'; c.lineWidth = 3; c.beginPath(); c.ellipse(CX, CY, RX + 3, RY + 3, 0, 0, 7); c.stroke();
    // the weave
    for (let y = 0; y < h; y += 3) { c.fillStyle = '#00000018'; c.fillRect(0, y, w, 1); }
    for (let i = 0; i < 14000; i++) { c.fillStyle = r() < 0.5 ? '#00000022' : '#ffffff18'; c.fillRect(r() * w, r() * h, 2, 1); }
  });
  const Z = 0.014, T = 0.006;
  const front = map ? new THREE.MeshStandardMaterial({ color: '#ffffff', map, bumpMap: map, bumpScale: 0.25, roughness: 1 }) : mat('#7a2a30', { roughness: 1 });
  const back = mat('#2a2326', { roughness: 1 });
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(width, height, T), [back, back, back, back, front, back]);
  cloth.position.set(0, height / 2, Z);
  const g = group(cloth);
  // red fringe down both short sides
  const n = Math.round(height / 0.007), r = rng(5);
  const fringe = new THREE.InstancedMesh(new THREE.BoxGeometry(0.045, 0.004, 0.003), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), n * 2);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color(), one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < n * 2; i++) {
    const side = i < n ? -1 : 1, y = ((i % n) + 0.5) / n * height, droop = 0.5 + r() * 0.6, len = 0.0225;
    e.set(0, 0, -side * droop); q.setFromEuler(e);
    m.compose(new THREE.Vector3(side * (width / 2 + Math.cos(droop) * len - 0.004), y - Math.sin(droop) * len, Z + (r() - 0.5) * 0.004), q, one);
    fringe.setMatrixAt(i, m);
    fringe.setColorAt(i, col.set('#a81c2c').multiplyScalar(0.75 + r() * 0.5));
  }
  g.add(fringe);
  // four wooden pegs along the top
  for (let i = 0; i < 4; i++) {
    const x = -width / 2 + 0.03 + i * (width - 0.06) / 3;
    g.add(box(0.028, 0.07, 0.012, '#9a6238', x, height - 0.02, 0.006, 0.004));
    const peg = cyl(0.007, 0.007, 0.03, '#8a5530', 0, 0, 0);
    peg.rotation.x = Math.PI / 2; peg.position.set(x, height + 0.012, 0.022);
    g.add(peg);
  }
  return g;
});

// IKEA PUGG wall clock: 32 cm, polished steel rim, white dial with bold numerals
// under a domed glass. Origin: bottom centre, back against the wall, front +z.
registerModel('pugg_wall_clock', ({ diameter = 0.32, hour = 10, minute = 10 } = {}) => {
  const R = diameter / 2, k = R / 0.16, FACE = 0.022 * k, A = R - 0.03 * k;
  const g = group();
  const steel = mat('#dfe2e6', { metalness: 0.45, roughness: 0.25 });
  const profile = [[0, 0], [R, 0], [R, 0.03 * k], [R - 0.007 * k, 0.041 * k], [R - 0.018 * k, 0.041 * k], [R - 0.026 * k, 0.034 * k]].map(([x, y]) => new THREE.Vector2(x, y));
  const rim = new THREE.Mesh(new THREE.LatheGeometry(profile, 64).rotateX(Math.PI / 2), steel);
  const inner = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(R - 0.026 * k, 0.034 * k), new THREE.Vector2(A, FACE)], 64).rotateX(Math.PI / 2), mat('#1c1c1e', { roughness: 0.5, side: THREE.DoubleSide }));
  const map = drawn(768, 768, (c, w) => {
    const C = w / 2;
    c.fillStyle = '#f2f2f0'; c.fillRect(0, 0, w, w);
    c.strokeStyle = '#1a1a1a'; c.fillStyle = '#1a1a1a';
    c.lineWidth = 2.5; for (const rad of [0.985, 0.9]) { c.beginPath(); c.arc(C, C, C * rad, 0, 7); c.stroke(); }
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * Math.PI * 2, s = Math.sin(a), co = -Math.cos(a);
      c.lineWidth = i % 5 ? 2.5 : 9;
      c.beginPath(); c.moveTo(C + s * C * 0.9, C + co * C * 0.9); c.lineTo(C + s * C * 0.985, C + co * C * 0.985); c.stroke();
    }
    c.font = `bold ${Math.round(w * 0.135)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; c.fillText(String(i), C + Math.sin(a) * C * 0.7, C - Math.cos(a) * C * 0.7 + w * 0.008); }
    c.font = `${Math.round(w * 0.03)}px Helvetica, Arial, sans-serif`; c.fillText('quartz', C, C + C * 0.36);
  });
  const face = new THREE.Mesh(new THREE.CircleGeometry(A, 64), textured(map, '#f2f2f0', { roughness: 0.5 }));
  face.position.z = FACE;
  const black = { roughness: 0.4 };
  const hand = (len, wid, tail, angle, z) => {
    const h = new THREE.Mesh(new THREE.BoxGeometry(wid, len + tail, 0.0015 * k), mat('#111112', black));
    h.position.y = (len - tail) / 2;
    const pivot = group(h);
    pivot.position.z = z; pivot.rotation.z = -angle;
    return pivot;
  };
  const hands = group(
    hand(A * 0.56, 0.011 * k, A * 0.14, ((hour % 12) + minute / 60) / 12 * Math.PI * 2, FACE + 0.004 * k),
    hand(A * 0.86, 0.008 * k, A * 0.16, minute / 60 * Math.PI * 2, FACE + 0.007 * k),
  );
  const hub = cyl(0.006 * k, 0.006 * k, 0.01 * k, '#111112', 0, 0, 0, black);
  hub.rotation.x = Math.PI / 2; hub.position.set(0, 0, FACE + 0.005 * k);
  // domed glass
  const dome = 0.016 * k, RS = (A * A + dome * dome) / (2 * dome);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(RS, 48, 8, 0, Math.PI * 2, 0, Math.asin(A / RS)).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.08, roughness: 0.05, depthWrite: false }));
  glass.position.z = FACE + 0.008 * k + dome - RS;
  glass.userData.noShadow = true;
  g.add(rim, inner, face, hands, hub, glass);
  g.children.forEach((ch) => { ch.position.y += R; });
  return g;
});

// Oak laminate floor ("eiken premium"): wide light-oak planks with soft grain, a few
// knots and staggered end joints, running along z. Origin: centre, on the floor.
// width / depth set the area, `plank` the plank width. Repeats, so stretching is fine.
registerModel('oak_laminate_floor', ({ width = 3, depth = 3, plank = 0.24, color = '#d9bf98' } = {}) => {
  const COLS = 4, LEN = 2.4, T = 0.008, shade = tint(color);
  const map = drawn(512, 1024, (c, w, h) => {
    const r = rng(83), pw = w / COLS, L = h / 2;
    c.fillStyle = color; c.fillRect(0, 0, w, h);
    for (let col = 0; col < COLS; col++) {
      const x0 = col * pw, joint = Math.round(r() * h);
      for (let p = 0; p < 2; p++) {
        const seed = 100 + col * 7 + p * 3;
        // each plank is drawn twice with the same grain so it wraps round the texture edge
        for (const y0 of [joint + p * L, joint + p * L - h]) {
          const q = rng(seed);
          c.save(); c.beginPath(); c.rect(x0, y0, pw, L); c.clip();
          c.fillStyle = shade(0.93 + q() * 0.14); c.fillRect(x0, y0, pw, L);
          for (let i = 0; i < 90; i++) {
            const x = x0 + q() * pw, dx = (q() - 0.5) * 10;
            c.strokeStyle = q() < 0.6 ? shade(0.72, 0.06 + q() * 0.12) : shade(1.2, 0.08 + q() * 0.1);
            c.lineWidth = 0.6 + q() * 2.2;
            c.beginPath(); c.moveTo(x, y0); c.bezierCurveTo(x + dx, y0 + L * 0.3, x - dx, y0 + L * 0.7, x + dx * 0.5, y0 + L); c.stroke();
          }
          for (let i = 0, n = Math.floor(q() * 2.4); i < n; i++) {
            const kx = x0 + pw * (0.2 + q() * 0.6), ky = y0 + L * (0.1 + q() * 0.8);
            c.fillStyle = shade(0.5, 0.45); c.beginPath(); c.ellipse(kx, ky, 3, 5.5, 0, 0, 7); c.fill();
            c.strokeStyle = shade(0.68, 0.22); c.lineWidth = 1.2;
            for (let k = 1; k <= 3; k++) { c.beginPath(); c.ellipse(kx, ky, 3 + k * 3, 5.5 + k * 9, 0, 0, 7); c.stroke(); }
          }
          c.restore();
          c.fillStyle = shade(0.55, 0.5); c.fillRect(x0, y0, pw, 1.5); // end joint
        }
      }
      c.fillStyle = shade(0.55, 0.5); c.fillRect(x0, 0, 1.5, h); // seam between planks
    }
  });
  if (map) { map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(width / (COLS * plank), depth / LEN); }
  const top = map ? new THREE.MeshStandardMaterial({ color: '#ffffff', map, roughness: 0.55 }) : mat(color, { roughness: 0.55 });
  const side = mat(shade(0.8), { roughness: 0.8 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(width, T, depth), [side, side, top, side, side, side]);
  floor.position.y = T / 2;
  floor.userData.noShadow = true;
  return group(floor);
});
