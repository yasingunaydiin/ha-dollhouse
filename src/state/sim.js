// Simulated Home Assistant. It carries on from whatever is already in the
// store (so switching from real starts from the house as it is right now) and
// fakes any linked entity that doesn't exist. Like the real thing, a command
// only takes effect after a short delay.
const DELAY_MS = 250;

const INITIAL = { light: 'off', media_player: 'off', climate: 'off', sun: 'above_horizon' };
const ATTRIBUTES = {
  climate: {
    hvac_modes: ['off', 'heat'], min_temp: 5, max_temp: 30, target_temp_step: 0.5,
    temperature: 20, current_temperature: 19.5, hvac_action: 'off',
  },
};
const ON_STATES = new Set(['on', 'playing', 'paused', 'idle']);

export class SimSource {
  mode = 'simulated';

  constructor(store, links) {
    this.store = store;
    this.links = links;
  }

  async start() {
    for (const entityId of Object.values(this.links)) {
      if (this.store.get(entityId)) continue;
      const domain = entityId.split('.')[0];
      this.store.set(entityId, INITIAL[domain] ?? 'unknown', ATTRIBUTES[domain]);
    }
  }

  stop() {}

  async callService(domain, service, data = {}) {
    const id = data.entity_id;
    const current = this.store.get(id);
    if (!current) return;
    await new Promise((r) => setTimeout(r, DELAY_MS));
    if (domain === 'climate') {
      const a = { ...current.attributes };
      const mode = service === 'set_hvac_mode' ? data.hvac_mode : current.state;
      if (service === 'set_temperature') a.temperature = data.temperature;
      if (service === 'set_preset_mode') a.preset_mode = data.preset_mode;
      if (service === 'set_swing_mode') a.swing_mode = data.swing_mode;
      a.hvac_action = mode === 'off' ? 'off' : mode === 'fan_only' ? 'fan' : 'heating';
      return this.store.set(id, mode, a);
    }
    const isOn = ON_STATES.has(current.state);
    const on = service === 'turn_on' ? true : service === 'turn_off' ? false : !isOn;
    this.store.set(id, on ? 'on' : 'off', current.attributes);
  }

  // sim-only helper: set any state directly (e.g. flip the sun)
  setState(entityId, state) {
    this.store.set(entityId, state, this.store.get(entityId)?.attributes);
  }
}
