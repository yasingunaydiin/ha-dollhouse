// Renderer, isometric camera, sun and backdrop.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const SUN = { intensity: 2.6, high: new THREE.Color('#fff1dc'), low: new THREE.Color('#ffa55c') };
const MOON = { intensity: 0.75, color: new THREE.Color('#8fa4ff') };
const smooth = THREE.MathUtils.smoothstep;
const DAY = {
  bg: new THREE.Color('#ece6da'),
  sky: 1.0, skyColor: new THREE.Color('#ffffff'), groundColor: new THREE.Color('#d9c9b0'),
};
const NIGHT = {
  bg: new THREE.Color('#1b1f33'),
  sky: 0.7, skyColor: new THREE.Color('#7a8cd8'), groundColor: new THREE.Color('#1a1c2a'),
};

// frontBearing: compass direction (degrees) the front of the house (+z) faces
export function createScene(container, view = {}, frontBearing = 180) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = DAY.bg.clone();

  const size = view.size ?? 13;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  const az = THREE.MathUtils.degToRad(view.azimuth ?? 45);
  const el = THREE.MathUtils.degToRad(view.elevation ?? 38);
  camera.position.set(
    Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)
  ).multiplyScalar(60);
  const target = new THREE.Vector3(0, 0.6, 0);
  camera.position.add(target);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2.15;
  controls.minZoom = 0.7;
  controls.maxZoom = 6;
  controls.update();

  const sky = new THREE.HemisphereLight(DAY.skyColor, DAY.groundColor, DAY.sky);
  scene.add(sky);

  // one shadow-casting light: the sun by day, the moon by night
  const sun = new THREE.DirectionalLight(SUN.high.clone(), SUN.intensity);
  sun.position.set(-7, 20, 11);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 4;
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.ShadowMaterial({ opacity: 0.22 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.34;
  ground.receiveShadow = true;
  scene.add(ground);

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    const aspect = w / h;
    camera.left = (-size * aspect) / 2;
    camera.right = (size * aspect) / 2;
    camera.top = size / 2;
    camera.bottom = -size / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', resize);
  resize();

  let night = 0, nightTarget = 0;
  let heightGoal = null, zoomGoal = null;
  const shiftHeight = (dy) => {
    controls.target.y += dy;
    camera.position.y += dy;
  };
  renderer.domElement.addEventListener('wheel', () => (zoomGoal = null), { passive: true });
  const cameraDir = new THREE.Vector3();

  // where the light should be: unit direction, strength and colour
  const sky_ = { dir: sun.position.clone().normalize(), intensity: SUN.intensity, color: SUN.high.clone(), settled: false };
  function aim(azimuth, elevation) {
    const a = THREE.MathUtils.degToRad(azimuth - frontBearing);
    const e = THREE.MathUtils.degToRad(elevation);
    sky_.dir.set(-Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
  }

  return {
    renderer, scene, camera, controls,
    // Sun position as Home Assistant reports it (degrees). Below the horizon
    // the moon takes over; HA doesn't report where the moon is, so it is
    // simply placed opposite the sun.
    setSun({ elevation, azimuth }) {
      nightTarget = 1 - smooth(elevation, -6, 6);
      if (elevation > 0) {
        aim(azimuth, Math.max(elevation, 15)); // keep shadows from stretching forever at sunrise / sunset
        sky_.intensity = SUN.intensity * smooth(elevation, 0, 12);
        sky_.color.lerpColors(SUN.low, SUN.high, smooth(elevation, 0, 25));
      } else {
        aim(azimuth + 180, THREE.MathUtils.clamp(-elevation, 22, 60));
        sky_.intensity = MOON.intensity * smooth(-elevation, 0, 8);
        sky_.color.copy(MOON.color);
      }
      sky_.settled = false;
    },
    // Render a small transparent picture from the current camera angle.
    // prepare() sets the scene up and returns the height to look at.
    snapshot(width, height, viewSize, prepare) {
      const cam = camera.clone();
      const aspect = width / height;
      Object.assign(cam, { left: (-viewSize * aspect) / 2, right: (viewSize * aspect) / 2, top: viewSize / 2, bottom: -viewSize / 2, zoom: 1 });
      cam.position.y += prepare() - controls.target.y;
      cam.updateProjectionMatrix();
      const background = scene.background;
      scene.background = null;
      renderer.setClearColor(0x000000, 0);
      renderer.setSize(width, height, false);
      renderer.render(scene, cam);
      const url = renderer.domElement.toDataURL('image/png');
      scene.background = background;
      resize();
      return url;
    },
    // move the point the camera looks at up or down, keeping the viewing angle
    lookAtHeight(y, instant = false) {
      heightGoal = y;
      if (instant) shiftHeight(y - controls.target.y);
    },
    // glide to a zoom level (a scroll by the user cancels it)
    zoomTo(z) { zoomGoal = z; },
    get cameraDir() {
      return cameraDir.subVectors(camera.position, controls.target).setY(0).normalize();
    },
    update(dt) {
      if (heightGoal !== null) {
        const y = controls.target.y;
        const next = Math.abs(heightGoal - y) < 0.005 ? heightGoal : THREE.MathUtils.damp(y, heightGoal, 5, dt);
        shiftHeight(next - y);
        if (next === heightGoal) heightGoal = null;
      }
      if (zoomGoal !== null) {
        camera.zoom = Math.abs(zoomGoal - camera.zoom) < 0.003 ? zoomGoal : THREE.MathUtils.damp(camera.zoom, zoomGoal, 5, dt);
        camera.updateProjectionMatrix();
        if (camera.zoom === zoomGoal) zoomGoal = null;
      }
      controls.update();
      if (Math.abs(night - nightTarget) > 1e-3) {
        night = THREE.MathUtils.damp(night, nightTarget, 3, dt);
        scene.background.lerpColors(DAY.bg, NIGHT.bg, night);
        sky.intensity = THREE.MathUtils.lerp(DAY.sky, NIGHT.sky, night);
        sky.color.lerpColors(DAY.skyColor, NIGHT.skyColor, night);
        sky.groundColor.lerpColors(DAY.groundColor, NIGHT.groundColor, night);
        document.body.classList.toggle('night', night > 0.5);
      }
      if (!sky_.settled) {
        const k = 1 - Math.exp(-3 * dt);
        sun.position.normalize().lerp(sky_.dir, k).normalize().multiplyScalar(45);
        sun.intensity += (sky_.intensity - sun.intensity) * k;
        sun.color.lerp(sky_.color, k);
        sky_.settled = sun.position.distanceTo(sky_.dir.clone().multiplyScalar(45)) < 0.02 && Math.abs(sun.intensity - sky_.intensity) < 0.005;
      }
      renderer.render(scene, camera);
    },
  };
}
