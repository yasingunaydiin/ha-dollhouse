// Behaviours ("profiles"): how each kind of object reflects an entity's state,
// and what a click on it does. Add a new kind here to support covers, TVs, etc.
import * as THREE from 'three';

// small floating text bubble (always drawn on top)
function makeLabel() {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 96;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
  sprite.scale.set(0.6, 0.3, 1);
  sprite.renderOrder = 10;
  return {
    sprite,
    set(text, warm) {
      const c = canvas.getContext('2d');
      c.clearRect(0, 0, 192, 96);
      sprite.visible = !!text;
      if (!text) return;
      c.fillStyle = warm ? '#ff8a3c' : 'rgba(255, 252, 245, 0.95)';
      c.beginPath();
      c.roundRect(8, 12, 176, 72, 36);
      c.fill();
      c.fillStyle = warm ? '#fff' : '#3a332b';
      c.font = '700 44px ui-rounded, system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(text, 96, 50);
      texture.needsUpdate = true;
    },
  };
}

const kinds = {
  light: {
    setup(entry) {
      const glows = [];
      let anchor = null;
      entry.object3d.traverse((o) => {
        if (o.isMesh && o.name.startsWith('glow')) glows.push(o);
        if (o.name === 'light_anchor') anchor = o;
      });
      const lamp = new THREE.PointLight('#ffc98a', 0, 7, 1.6);
      (anchor ?? entry.object3d).add(lamp);
      entry.light = { glows, lamp, level: 0, target: 0 };
    },
    apply(entry, state) {
      const on = state?.state === 'on';
      const brightness = (state?.attributes?.brightness ?? 255) / 255;
      entry.light.target = on ? brightness : 0;
    },
    update(entry, dt) {
      const l = entry.light;
      if (Math.abs(l.level - l.target) < 1e-3) return;
      l.level = THREE.MathUtils.damp(l.level, l.target, 10, dt);
      l.lamp.intensity = l.level * 9;
      for (const g of l.glows) g.material.emissiveIntensity = l.level * 2.2;
    },
    click(entry, source) {
      return source.callService('light', 'toggle', { entity_id: entry.entityId });
    },
  },
  // Heaters / thermostats: glow while heating, with the room temperature above
  climate: {
    setup(entry) {
      const glows = [];
      let anchor = null;
      entry.object3d.traverse((o) => {
        if (o.isMesh && o.name.startsWith('glow')) glows.push(o);
        if (o.name === 'light_anchor') anchor = o;
      });
      const lamp = new THREE.PointLight('#ff8a3c', 0, 3.5, 1.8);
      (anchor ?? entry.object3d).add(lamp);
      const label = makeLabel();
      const size = new THREE.Box3().setFromObject(entry.object3d).getSize(new THREE.Vector3());
      label.sprite.position.y = size.y / entry.object3d.scale.y + 0.3;
      entry.object3d.add(label.sprite);
      entry.climate = { glows, lamp, label, level: 0, target: 0 };
    },
    apply(entry, state) {
      const a = state?.attributes ?? {};
      const heating = ['heat', 'auto'].includes(state?.state) && !['idle', 'off'].includes(a.hvac_action);
      entry.climate.target = heating ? 1 : 0;
      const t = a.current_temperature;
      entry.climate.label.set(t == null ? '' : `${Math.round(t * 10) / 10}°`, heating);
    },
    update(entry, dt) {
      const c = entry.climate;
      if (Math.abs(c.level - c.target) < 1e-3) return;
      c.level = THREE.MathUtils.damp(c.level, c.target, 4, dt);
      c.lamp.intensity = c.level * 2.5;
      for (const g of c.glows) g.material.emissiveIntensity = c.level * 2.4;
    },
    dialog: 'climate', // a click opens the control window (src/dialogs/climate.js)
  },
  // TVs and speakers: the screen lights up while the device is on
  media_player: {
    setup(entry) {
      const screens = [];
      entry.object3d.traverse((o) => {
        if (o.isMesh && o.name.startsWith('screen')) {
          o.material = o.material.clone();
          o.material.emissive = new THREE.Color('#6fa8ff');
          o.material.emissiveIntensity = 0;
          screens.push(o);
        }
      });
      entry.screen = { screens, level: 0, target: 0 };
    },
    apply(entry, state) {
      entry.screen.target = ['on', 'playing', 'paused', 'idle'].includes(state?.state) ? 1 : 0;
    },
    update(entry, dt) {
      const s = entry.screen;
      if (Math.abs(s.level - s.target) < 1e-3) return;
      s.level = THREE.MathUtils.damp(s.level, s.target, 8, dt);
      for (const m of s.screens) m.material.emissiveIntensity = s.level * 1.4;
    },
    click(entry, source) {
      return source.callService('media_player', 'toggle', { entity_id: entry.entityId });
    },
  },
};

export function attachBehaviors(objects, links, store) {
  const active = [];
  const byEntity = new Map();
  for (const [id, entry] of objects) {
    const kind = kinds[entry.def.kind];
    if (!kind) continue;
    entry.kind = kind;
    entry.entityId = links[id];
    kind.setup(entry);
    active.push(entry);
    if (entry.entityId) {
      byEntity.set(entry.entityId, entry);
      kind.apply(entry, store.get(entry.entityId));
    }
  }
  store.subscribe((entityId, state) => {
    const entry = byEntity.get(entityId);
    if (entry) entry.kind.apply(entry, state);
  });
  return {
    update(dt) {
      for (const e of active) e.kind.update?.(e, dt);
    },
  };
}
