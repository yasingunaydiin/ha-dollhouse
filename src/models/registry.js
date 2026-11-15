// Model registry. A model is either:
//   - a procedural builder registered by name:  registerModel('sofa', (params) => Object3D)
//   - a glTF file: any `model:` value in house.yaml ending in .glb / .gltf,
//     resolved relative to public/house/ (e.g. models/sofa.glb)
//
// Conventions every model follows, procedural or glTF, so behaviours work on both:
//   - origin on the floor, front facing +Z, metres
//   - a node named "light_anchor" marks where a lamp emits light from
//   - meshes whose name starts with "glow" light up when the object is on
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const builders = new Map();
const gltfCache = new Map();
const loader = new GLTFLoader();

export function registerModel(name, builder) {
  builders.set(name, builder);
}

export function listModels() {
  return [...builders.keys()];
}

const isFile = (name) => /\.(glb|gltf)$/i.test(name);

async function loadGltf(path) {
  if (!gltfCache.has(path)) {
    gltfCache.set(path, loader.loadAsync(`${import.meta.env.BASE_URL}house/${path}`).then((g) => g.scene));
  }
  const scene = (await gltfCache.get(path)).clone(true);
  // clone materials so one lamp glowing doesn't light up its twins
  scene.traverse((o) => {
    if (o.isMesh) o.material = o.material.clone();
  });
  return scene;
}

function placeholder(name) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: '#e0559a' })
  );
  m.position.y = 0.25;
  const g = new THREE.Group();
  g.add(m);
  console.warn(`[models] unknown model "${name}", showing a placeholder`);
  return g;
}

export async function createModel(name, params = {}) {
  let obj;
  try {
    if (isFile(name)) obj = await loadGltf(name);
    else if (builders.has(name)) obj = builders.get(name)(params);
    else obj = placeholder(name);
  } catch (err) {
    console.error(`[models] failed to load "${name}"`, err);
    obj = placeholder(name);
  }
  if (params.scale) obj.scale.multiplyScalar(params.scale);
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return obj;
}
