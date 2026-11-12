// Picture window for a camera entity: a still from Home Assistant, refreshed
// every couple of seconds while the window is open.
const REFRESH_MS = 2000;

export function createCameraDialog({ store, getSource, roomOf }) {
  const el = document.getElementById('camera');
  el.innerHTML = `
    <div class="card" role="dialog" aria-modal="true">
      <header>
        <button class="close" aria-label="Close">✕</button>
        <div><small class="room"></small><strong class="title"></strong></div>
      </header>
      <div class="picture"><img alt=""/><p></p></div>
    </div>`;
  const $ = (q) => el.querySelector(q);
  const img = $('img'), note = $('p');
  let entry = null;
  let timer = null;

  function show(text) {
    note.textContent = text;
    note.hidden = !text;
    img.hidden = !!text;
  }
  function refresh() {
    if (!entry) return;
    const state = store.get(entry.entityId);
    if (getSource().mode !== 'real') return show('No picture in simulated mode');
    if (!state || state.state === 'unavailable') return show('Camera is not reachable');
    const next = new Image();
    const id = entry.entityId;
    next.onload = () => {
      if (entry?.entityId !== id) return;
      img.src = next.src;
      show('');
    };
    next.onerror = () => entry?.entityId === id && img.hidden && show('No picture from Home Assistant');
    next.src = `/api/ha/camera/${id}?t=${Date.now()}`;
  }
  function close() {
    entry = null;
    clearInterval(timer);
    el.hidden = true;
    img.removeAttribute('src');
  }
  $('.close').addEventListener('click', close);
  el.addEventListener('pointerdown', (e) => e.target === el && close());
  window.addEventListener('keydown', (e) => e.key === 'Escape' && entry && close());

  return {
    open(target) {
      entry = target;
      $('.room').textContent = roomOf(target) ?? '';
      $('.title').textContent = store.get(target.entityId)?.attributes?.friendly_name ?? target.def.id;
      show('Loading…');
      el.hidden = false;
      refresh();
      clearInterval(timer);
      timer = setInterval(refresh, REFRESH_MS);
    },
  };
}
