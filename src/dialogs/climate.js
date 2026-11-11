// Control window for a climate entity (heater, thermostat): current
// temperature, a dial for the target temperature, and mode / preset / swing.
// Nothing changes on screen until Home Assistant confirms the new state.
const CX = 150, CY = 150, R = 118, START = 135, SWEEP = 270;
const title = (s) => String(s ?? '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const point = (f) => {
  const a = ((START + SWEEP * f) * Math.PI) / 180;
  return [CX + R * Math.cos(a), CY + R * Math.sin(a)];
};
const arc = (f) => {
  const [x0, y0] = point(0), [x1, y1] = point(Math.max(f, 0.001));
  return `M${x0} ${y0} A${R} ${R} 0 ${SWEEP * f > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};

export function createClimateDialog({ store, getSource, say, roomOf }) {
  const el = document.getElementById('climate');
  el.innerHTML = `
    <div class="card" role="dialog" aria-modal="true">
      <header>
        <button class="close" aria-label="Close">✕</button>
        <div><small class="room"></small><strong class="title"></strong></div>
      </header>
      <div class="current"><small>Current temperature</small><span></span></div>
      <div class="dial">
        <svg viewBox="0 0 300 300">
          <path class="track" d="${arc(1)}"/>
          <path class="fill"/>
          <circle class="thumb" r="13"/>
        </svg>
        <div class="center"><small class="action"></small><span class="target"></span></div>
        <div class="steps"><button class="minus" aria-label="Lower">−</button><button class="plus" aria-label="Raise">+</button></div>
      </div>
      <div class="options">
        <label><small>Mode</small><select data-option="hvac"></select></label>
        <label><small>Preset</small><select data-option="preset"></select></label>
        <label><small>Swing mode</small><select data-option="swing"></select></label>
      </div>
    </div>`;
  const $ = (q) => el.querySelector(q);
  const svg = $('svg');
  let entry = null;
  let dragTemp = null; // temperature being dragged, not yet sent

  const state = () => store.get(entry.entityId);
  const call = (service, data) =>
    getSource().callService('climate', service, { entity_id: entry.entityId, ...data }).catch((err) => say(err.message));

  function range(a) {
    const min = a.min_temp ?? 5, max = a.max_temp ?? 30, step = a.target_temp_step ?? 0.5;
    return { min, max, step };
  }

  function render() {
    if (!entry) return;
    const s = state();
    const a = s?.attributes ?? {};
    const { min, max } = range(a);
    const heating = a.hvac_action ? a.hvac_action === 'heating' : ['heat', 'auto'].includes(s?.state);
    const target = dragTemp ?? a.temperature;
    el.classList.toggle('heating', heating);
    el.classList.toggle('off', !s || s.state === 'off' || s.state === 'unavailable');
    $('.room').textContent = roomOf(entry) ?? '';
    $('.title').textContent = a.friendly_name ?? entry.entityId;
    $('.current span').textContent = a.current_temperature == null ? '–' : `${a.current_temperature} °C`;
    $('.action').textContent = title(a.hvac_action ?? (heating ? 'heating' : s?.state ?? 'unavailable'));
    $('.target').textContent = target == null ? title(s?.state) : `${target} °C`;

    const hasTarget = target != null;
    const f = hasTarget ? Math.min(1, Math.max(0, (target - min) / (max - min))) : 1;
    $('.fill').setAttribute('d', arc(f));
    const [tx, ty] = point(f);
    const thumb = $('.thumb');
    thumb.setAttribute('cx', tx);
    thumb.setAttribute('cy', ty);
    thumb.style.display = hasTarget ? '' : 'none';
    $('.steps').style.display = hasTarget ? '' : 'none';

    const fill = (key, options, current) => {
      const select = el.querySelector(`[data-option=${key}]`);
      select.closest('label').hidden = !options?.length;
      if (document.activeElement === select) return;
      select.replaceChildren(...(options ?? []).map((o) => new Option(title(o), o)));
      select.value = current ?? '';
    };
    fill('hvac', a.hvac_modes, s?.state);
    fill('preset', a.preset_modes, a.preset_mode);
    fill('swing', a.swing_modes, a.swing_mode);
  }

  function setTemperature(t) {
    const { min, max, step } = range(state()?.attributes ?? {});
    const temperature = Math.min(max, Math.max(min, Math.round(t / step) * step));
    return call('set_temperature', { temperature: +temperature.toFixed(2) });
  }

  // drag around the dial
  function tempAt(e) {
    const r = svg.getBoundingClientRect();
    const deg = (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
    let a = (deg - START + 360) % 360;
    if (a > SWEEP) a = a > SWEEP + (360 - SWEEP) / 2 ? 0 : SWEEP;
    const { min, max, step } = range(state()?.attributes ?? {});
    return Math.round((min + (a / SWEEP) * (max - min)) / step) * step;
  }
  svg.addEventListener('pointerdown', (e) => {
    if (state()?.attributes?.temperature == null) return;
    svg.setPointerCapture(e.pointerId);
    dragTemp = tempAt(e);
    render();
  });
  svg.addEventListener('pointermove', (e) => {
    if (dragTemp === null) return;
    dragTemp = tempAt(e);
    render();
  });
  svg.addEventListener('pointerup', () => {
    if (dragTemp === null) return;
    const t = dragTemp;
    dragTemp = null;
    if (t !== state()?.attributes?.temperature) setTemperature(t);
    render();
  });

  const nudge = (dir) => {
    const a = state()?.attributes ?? {};
    if (a.temperature != null) setTemperature(a.temperature + dir * range(a).step);
  };
  $('.minus').addEventListener('click', () => nudge(-1));
  $('.plus').addEventListener('click', () => nudge(1));
  el.addEventListener('change', (e) => {
    const key = e.target.dataset.option;
    const value = e.target.value;
    e.target.blur();
    if (key === 'hvac') call('set_hvac_mode', { hvac_mode: value });
    if (key === 'preset') call('set_preset_mode', { preset_mode: value });
    if (key === 'swing') call('set_swing_mode', { swing_mode: value });
    render(); // back to the confirmed value until Home Assistant reports the change
  });

  function close() {
    entry = null;
    el.hidden = true;
  }
  $('.close').addEventListener('click', close);
  el.addEventListener('pointerdown', (e) => e.target === el && close());
  window.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  store.subscribe((id) => entry && id === entry.entityId && render());

  return {
    open(target) {
      entry = target;
      dragTemp = null;
      el.hidden = false;
      render();
    },
  };
}
