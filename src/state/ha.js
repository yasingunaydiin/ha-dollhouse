// Real Home Assistant, through the local gateway (server/gateway.js).
export class HaSource {
  mode = 'real';
  status = {};

  constructor(store, onStatus = () => {}) {
    this.store = store;
    this.onStatus = onStatus;
  }

  start() {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(this.status.error ?? 'Home Assistant did not answer')), 8000);
      this.es = new EventSource('/api/ha/events');
      const on = (name, fn) => this.es.addEventListener(name, (e) => fn(JSON.parse(e.data)));
      on('status', (s) => {
        this.status = s;
        this.onStatus(s);
        if (!s.configured) { clearTimeout(timer); reject(new Error(s.error)); }
      });
      on('snapshot', (states) => {
        this.store.replaceAll(states);
        clearTimeout(timer);
        resolve();
      });
      on('state', (s) => (s.state === null ? this.store.remove(s.entity_id) : this.store.set(s.entity_id, s.state, s.attributes)));
    });
  }

  stop() {
    this.es?.close();
  }

  async callService(domain, service, data = {}) {
    const res = await fetch('/api/ha/service', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, service, data }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? 'Command failed');
  }
}
