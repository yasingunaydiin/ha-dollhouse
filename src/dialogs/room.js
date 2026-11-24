// Room panel: click a room's name balloon and get every entity in that room,
// grouped (lights, media, climate, ...) with the quick controls that make sense:
// a switch for lights, previous / play / next for media. Climate and cameras
// open their own window. Rows update live while the panel is open.
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const nice = (t) => String(t).replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());

const GROUPS = [
  ['light', 'Lights'],
  ['media_player', 'Media'],
  ['climate', 'Climate'],
  ['camera', 'Cameras'],
  ['switch', 'Switches'],
  ['input_boolean', 'Switches'],
  ['sensor', 'Sensors'],
  ['binary_sensor', 'Sensors'],
];
const ICON = {
  light: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  media_player: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M10 8l5 2-5 2z"/>',
  climate: '<path d="M12 3c3 4 5 6.5 5 9.5a5 5 0 0 1-10 0C7 9.500 9 7 12 3z"/>',
  camera: '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3z"/>',
  other: '<circle cx="12" cy="12" r="4"/>',
};
const icon = (domain) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[domain] ?? ICON.other}</svg>`;

export function createRoomPanel({ store, getSource, say, openEntry }) {
  const el = document.createElement('div');
  el.id = 'roompanel';
  el.hidden = true;
  document.body.append(el);
  let room = null; // { name, floorId, items: [{ id, entityId, entry }] }

  const call = (domain, service, entityId) =>
    getSource().callService(domain, service, { entity_id: entityId }).catch((err) => say(err.message));

  function row({ id, entityId, entry }) {
    const s = store.get(entityId);
    const domain = entityId.split('.')[0];
    const a = s?.attributes ?? {};
    const name = a.friendly_name ?? nice(id);
    const gone = !s || ['unavailable', 'unknown'].includes(s.state);
    const on = !gone && ['on', 'playing', 'paused', 'idle', 'heat', 'home', 'open'].includes(s.state);
    let state = gone ? 'Unavailable' : nice(s.state) + (a.unit_of_measurement ? ` ${a.unit_of_measurement}` : '');
    if (domain === 'climate' && a.current_temperature != null) state = `${a.current_temperature}°${a.temperature != null ? ` → ${a.temperature}°` : ''}`;
    if (domain === 'light' && on && a.brightness != null) state = `${Math.round((a.brightness / 255) * 100)}%`;
    let controls = '';
    if (domain === 'media_player' && !gone) {
      controls = `<div class="ctl">
        <button data-act="media_previous_track" aria-label="Previous">⏮</button>
        <button data-act="media_play_pause" aria-label="Play or pause">${s.state === 'playing' ? '⏸' : '▶'}</button>
        <button data-act="media_next_track" aria-label="Next">⏭</button></div>`;
    }
    const toggle = ['light', 'switch', 'input_boolean'].includes(domain) && !gone ? `<button class="sw${on ? ' on' : ''}" data-act="toggle" aria-label="Toggle"><i></i></button>` : '';
    const opens = entry?.kind?.dialog ? ' data-open' : '';
    return `<li class="${on ? 'on' : ''}" data-entity="${esc(entityId)}" data-id="${esc(id)}"${opens}>
      <div class="line"><span class="ic">${icon(domain)}</span><b>${esc(name)}</b><em>${esc(state)}</em>${toggle}</div>${controls}</li>`;
  }

  function render() {
    if (!room) return;
    const sections = new Map();
    for (const item of room.items) {
      const domain = item.entityId.split('.')[0];
      const title = GROUPS.find(([d]) => d === domain)?.[1] ?? 'Other';
      sections.set(title, [...(sections.get(title) ?? []), item]);
    }
    const order = [...new Set([...GROUPS.map(([, t]) => t), 'Other'])].filter((t) => sections.has(t));
    el.innerHTML = `<header><strong>${esc(room.name)}</strong><button class="close" aria-label="Close">✕</button></header>
      <div class="body">${order.length
        ? order.map((t) => `<h5>${t}</h5><ul>${sections.get(t).map(row).join('')}</ul>`).join('')
        : '<p class="none">No entities in this room</p>'}</div>`;
  }

  el.addEventListener('click', (e) => {
    if (e.target.closest('.close')) return close();
    const li = e.target.closest('li[data-entity]');
    if (!li) return;
    const entityId = li.dataset.entity, domain = entityId.split('.')[0];
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'toggle') return call(domain, 'toggle', entityId);
    if (act) return call('media_player', act, entityId);
    if (li.hasAttribute('data-open')) openEntry(room.items.find((i) => i.entityId === entityId)?.entry);
  });
  store.subscribe((entityId) => {
    if (!el.hidden && room?.items.some((i) => i.entityId === entityId)) render();
  });

  function open(next) {
    room = next;
    el.hidden = false;
    render();
  }
  function close() {
    room = null;
    el.hidden = true;
  }
  return { open, close, get floorId() { return room?.floorId; }, get name() { return room?.name; } };
}
