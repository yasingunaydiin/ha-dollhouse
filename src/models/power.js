// Power points at their real sizes (metres): wall sockets (stopcontacten) and
// power strips (verlengdozen) with 3 to 6 sockets. Origin on the floor, front
// facing +z. Put a wall socket on the wall with the "Placement height" field.
// Plug a device into one by choosing it under "Plugged into" in the plan editor;
// hovering the socket in the 3D view then lists what is connected to it.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { registerModel } from './registry.js';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });
function box(w, h, d, color, x = 0, y = 0, z = 0, radius = 0, extra = {}) {
  const geo = radius ? new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat(color, extra));
  m.position.set(x, y + h / 2, z);
  return m;
}
// cylinder standing along y (or, with `flat`, along z so it faces the front)
function cyl(r, h, color, x, y, z, { flat = false, extra = {} } = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), mat(color, extra));
  m.position.set(x, y, z);
  if (flat) m.rotation.x = Math.PI / 2;
  return m;
}
const group = (...c) => { const g = new THREE.Group(); if (c.length) g.add(...c); return g; };

// How many plugs each model has. Used for the hover window ("2 of 4 in use").
export const POWER_PORTS = { wall_socket: 1, power_strip_3: 3, power_strip_4: 4, power_strip_5: 5, power_strip_6: 6 };
export const POWER_MODELS = Object.keys(POWER_PORTS);
export const portsOf = (def) => (def.model === 'wall_socket' ? def.params?.gangs ?? 1 : POWER_PORTS[def.model]);

// One Schuko / type F socket face. `up` lays it in the top of a strip, otherwise
// it faces the front (+z) in a wall plate. Built facing +y, then turned.
function face(x, y, z, up) {
  const g = group();
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.0255, 0.0255, 0.003, 28), mat('#1b1b1d', { roughness: 0.9 }));
  ring.position.y = 0.0005;
  g.add(ring);
  for (const sx of [-1, 1]) {
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.0033, 0.0033, 0.004, 12), mat('#050506'));
    hole.position.set(sx * 0.0095, 0.0012, 0);
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.0035, 0.011), mat('#b9bdc0', { metalness: 0.8, roughness: 0.3 }));
    clip.position.set(0, 0.0014, sx * 0.0255);
    g.add(hole, clip);
  }
  g.position.set(x, y, z);
  if (!up) g.rotation.x = Math.PI / 2;
  return g;
}

// Wall socket, 80 x 80 mm plate; params.gangs = 2 gives the double 152 x 80 mm one.
registerModel('wall_socket', ({ gangs = 1, color = '#f4f3ee' } = {}) => {
  const w = gangs > 1 ? 0.152 : 0.08;
  const g = group(box(w, 0.08, 0.011, color, 0, 0, 0, 0.006));
  for (let i = 0; i < gangs; i++) g.add(face((i - (gangs - 1) / 2) * 0.072, 0.04, 0.0112, false));
  return g;
});

// Power strip (verlengdoos) lying on the floor: sockets in the top, a rocker
// switch at one end and a cable trailing off the other, ending in a plug.
function strip(ports, { color = 'white', cable = 0.6 } = {}) {
  const dark = color === 'black';
  const body = dark ? '#26272b' : '#f1f0ea';
  const pitch = 0.07, w = ports * pitch + 0.075 + 0.04, h = 0.038, d = 0.075;
  const g = group(box(w, h, d, body, 0, 0, 0, 0.008));
  for (let i = 0; i < ports; i++) g.add(face(-w / 2 + 0.0375 + (i + 0.5) * pitch, h + 0.0005, 0, true));
  // rocker switch with a little red lamp, on the right-hand end
  g.add(box(0.026, 0.006, 0.034, dark ? '#3a3b40' : '#d9d8d1', w / 2 - 0.03, h - 0.001, 0, 0.003));
  g.add(box(0.008, 0.0035, 0.008, '#d6332b', w / 2 - 0.03, h + 0.004, 0, 0.001, { emissive: '#ff2a1c', emissiveIntensity: 0.5 }));
  // cable out of the left end, lying on the floor, and its plug
  const cableLen = cable;
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, cableLen, 10), mat('#1d1d20', { roughness: 0.7 }));
  c.rotation.z = Math.PI / 2;
  c.position.set(-w / 2 - cableLen / 2, 0.0045, 0);
  g.add(c);
  g.add(box(0.05, 0.034, 0.045, body, -w / 2 - cableLen - 0.025, 0, 0, 0.01));
  for (const sz of [-1, 1]) {
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.019, 8), mat('#b9bdc0', { metalness: 0.8, roughness: 0.3 }));
    pin.rotation.z = Math.PI / 2;
    pin.position.set(-w / 2 - cableLen - 0.0595, 0.017, sz * 0.0095);
    g.add(pin);
  }
  return g;
}
for (const n of [3, 4, 5, 6]) registerModel(`power_strip_${n}`, (params) => strip(n, params));
