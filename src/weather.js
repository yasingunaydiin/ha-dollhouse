// Real-time weather over the plot: rain, snow, cloud cover (dims the sun),
// wind (slants the fall) and lightning.
//
// Where the weather comes from, in order:
//   1. a Home Assistant weather entity (links.yaml: `_weather: weather.home`,
//      or the first weather.* entity found)
//   2. Open-Meteo (free, no key) for the house's coordinates: `location:
//      {latitude, longitude}` in house.yaml, or Home Assistant's zone.home
//   3. in simulated mode, the weather picker in the top bar
import * as THREE from 'three';

// what each condition looks like: cloud 0..1, rain / snow 0..1, wind 0..1, storm
const LOOKS = {
  clear: { cloud: 0 },
  mostlyClear: { cloud: 0.15 },
  partly: { cloud: 0.45 },
  cloudy: { cloud: 0.85 },
  fog: { cloud: 0.75 },
  drizzle: { cloud: 0.8, rain: 0.25 },
  rain: { cloud: 0.9, rain: 0.6 },
  pouring: { cloud: 1, rain: 1, wind: 0.3 },
  sleet: { cloud: 0.9, rain: 0.5, snow: 0.4 },
  snow: { cloud: 0.85, snow: 0.7 },
  windy: { cloud: 0.4, wind: 1 },
  storm: { cloud: 1, rain: 1, wind: 0.6, storm: true },
};
export const CONDITIONS = Object.keys(LOOKS);

const HA_CONDITIONS = {
  'clear-night': 'clear', sunny: 'clear', partlycloudy: 'partly', cloudy: 'cloudy', fog: 'fog',
  rainy: 'rain', pouring: 'pouring', snowy: 'snow', 'snowy-rainy': 'sleet', hail: 'sleet',
  lightning: 'storm', 'lightning-rainy': 'storm', windy: 'windy', 'windy-variant': 'windy', exceptional: 'cloudy',
};

// WMO weather codes as Open-Meteo reports them
function fromWmo(code) {
  if (code === 0) return 'clear';
  if (code === 1) return 'mostlyClear';
  if (code === 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 55) return 'drizzle';
  if (code === 56 || code === 57 || code === 66 || code === 67) return 'sleet';
  if (code === 61 || code === 80) return 'rain';
  if (code === 63 || code === 65 || code === 81 || code === 82) return 'pouring';
  if (code >= 71 && code <= 77 || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'cloudy';
}

const VERT = `
  uniform float uTime, uSpeed, uHeight, uLen, uWind, uSway, uSize;
  uniform vec4 uHouse; // xz bounds of the house: minX, minZ, maxX, maxZ
  uniform float uRoof;
  attribute vec3 aSeed;
  attribute float aEnd; // 0 = head of a streak, 1 = tail
  varying float vFade;
  void main() {
    float fall = mod(aSeed.y - uTime * uSpeed * (0.8 + 0.4 * fract(aSeed.x * 7.3)), uHeight);
    vec3 p = vec3(aSeed.x, fall, aSeed.z);
    p.x += (uHeight - fall) * uWind + sin(uTime * 0.9 + aSeed.z * 3.1) * uSway;
    p.z += sin(uTime * 0.7 + aSeed.x * 2.3) * uSway;
    p.x += aEnd * uLen * uWind * 3.0;
    p.y += aEnd * uLen;
    p.y -= 0.3;
    vFade = 1.0 - aEnd * 0.8;
    // nothing falls through the roof
    float inside = step(uHouse.x, p.x) * step(p.x, uHouse.z) * step(uHouse.y, p.z) * step(p.z, uHouse.w) * step(p.y, uRoof);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    if (inside > 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = uSize;
  }`;
const FRAG_RAIN = `
  uniform float uAlpha; uniform vec3 uColor; varying float vFade;
  void main() { gl_FragColor = vec4(uColor, uAlpha * vFade); }`;
const FRAG_SNOW = `
  uniform float uAlpha; uniform vec3 uColor; varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(uColor, uAlpha * smoothstep(0.5, 0.2, d));
  }`;

// houseBounds: THREE.Box3 around the building in scene coordinates
export function createWeather({ scene, world, houseBounds }) {
  const W = 32, H = 12; // the box of sky above the plot, centred on the house
  const roof = houseBounds.max.y + 0.2;
  const uniforms = (extra) => ({
    uTime: { value: 0 }, uHeight: { value: H }, uWind: { value: 0 }, uAlpha: { value: 0.5 },
    uHouse: { value: new THREE.Vector4(houseBounds.min.x, houseBounds.min.z, houseBounds.max.x, houseBounds.max.z) },
    uRoof: { value: roof }, uLen: { value: 0 }, uSway: { value: 0 }, uSize: { value: 1 }, ...extra,
  });
  const rand = (n) => (Math.random() - 0.5) * n;

  function make(count, perParticle, material, Kind) {
    const seed = new Float32Array(count * perParticle * 3);
    const end = new Float32Array(count * perParticle);
    for (let i = 0; i < count; i++) {
      const x = rand(W), y = Math.random() * H, z = rand(W);
      for (let k = 0; k < perParticle; k++) {
        seed.set([x, y, z], (i * perParticle + k) * 3);
        end[i * perParticle + k] = perParticle === 1 ? 0 : k;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * perParticle * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    const obj = new Kind(g, material);
    obj.frustumCulled = false;
    obj.visible = false;
    obj.renderOrder = 10;
    scene.add(obj);
    return obj;
  }
  const mat = (frag, u) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms: u, transparent: true, depthWrite: false });

  const RAIN = 1200, SNOW = 800;
  const rainU = uniforms({ uSpeed: { value: 11 }, uColor: { value: new THREE.Color('#bcd2ee') }, uLen: { value: 0.6 } });
  const snowU = uniforms({ uSpeed: { value: 1.3 }, uColor: { value: new THREE.Color('#ffffff') }, uSway: { value: 0.35 }, uAlpha: { value: 0.9 }, uSize: { value: 4 * Math.min(window.devicePixelRatio, 1.5) } });
  const rain = make(RAIN, 2, mat(FRAG_RAIN, rainU), THREE.LineSegments);
  const snow = make(SNOW, 1, mat(FRAG_SNOW, snowU), THREE.Points);

  // eased current look, eased towards the target
  const now = { cloud: 0, rain: 0, snow: 0, wind: 0 };
  let target = { cloud: 0, rain: 0, snow: 0, wind: 0, storm: false };
  let condition = 'clear';
  let nextBolt = 0, bolt = 0;

  function set(name) {
    if (!LOOKS[name]) name = 'clear';
    condition = name;
    target = { cloud: 0, rain: 0, snow: 0, wind: 0, storm: false, ...LOOKS[name] };
  }

  return {
    get condition() { return condition; },
    set,
    fromHa(state) { set(HA_CONDITIONS[state] ?? 'clear'); },
    fromWmo(code) { const name = fromWmo(code); set(name); return name; },
    update(dt, time) {
      const k = 1 - Math.exp(-0.8 * dt);
      for (const key of Object.keys(now)) now[key] += (target[key] - now[key]) * k;
      world.setCloud(now.cloud);
      for (const u of [rainU, snowU]) { u.uTime.value = time; u.uWind.value = now.wind * 0.25; }
      rain.visible = now.rain > 0.01;
      snow.visible = now.snow > 0.01;
      rain.geometry.setDrawRange(0, Math.floor(RAIN * Math.min(1, now.rain)) * 2);
      snow.geometry.setDrawRange(0, Math.floor(SNOW * Math.min(1, now.snow)));
      rainU.uAlpha.value = 0.3 + 0.35 * now.rain; // fewer streaks, so each one is a bit more visible
      // thunderstorm: an occasional flash
      if (target.storm) {
        nextBolt -= dt;
        if (nextBolt <= 0) { bolt = 1; nextBolt = 4 + Math.random() * 9; }
      }
      bolt = Math.max(0, bolt - dt * 4);
      world.setFlash(bolt > 0.5 ? bolt : bolt * bolt);
    },
  };
}

// Current conditions at a place, from Open-Meteo. Returns { code, wind } or null.
// Where the sun stands at a moment and place: elevation above the horizon and
// azimuth clockwise from north, in degrees (good to a fraction of a degree).
export function sunPosition(date, latitude, longitude) {
  const rad = Math.PI / 180;
  const d = date / 86400000 + 2440587.5 - 2451545; // days since J2000
  const g = (357.529 + 0.98560028 * d) * rad;
  const lambda = (280.459 + 0.98564736 * d + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const tilt = (23.439 - 0.00000036 * d) * rad;
  const ra = Math.atan2(Math.cos(tilt) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(tilt) * Math.sin(lambda));
  const hour = ((18.697374558 + 24.06570982441908 * d) * 15 + longitude) * rad - ra;
  const lat = latitude * rad;
  const elevation = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(hour));
  const azimuth = Math.atan2(-Math.sin(hour), Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(hour));
  return { elevation: elevation / rad, azimuth: ((azimuth / rad) % 360 + 360) % 360 };
}

export async function fetchOpenMeteo(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weather_code,wind_speed_10m`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const { current } = await res.json();
    return { code: current.weather_code, wind: current.wind_speed_10m };
  } catch {
    return null;
  }
}
