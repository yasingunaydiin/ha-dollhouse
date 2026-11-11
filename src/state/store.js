// Entity state store. The 3D scene only ever reads from here; a "source"
// (simulated or Home Assistant) writes into it and executes commands.
//
// Source interface:
//   mode: 'simulated' | 'real'
//   start(): Promise<void>      stop(): void
//   callService(domain, service, data): Promise<void>
export class Store {
  states = new Map();
  listeners = new Set();
  bulk = false; // true while a whole snapshot is being loaded

  get(entityId) {
    return this.states.get(entityId);
  }

  set(entityId, state, attributes = {}) {
    const next = { entity_id: entityId, state, attributes };
    this.states.set(entityId, next);
    for (const fn of this.listeners) fn(entityId, next);
  }

  remove(entityId) {
    this.states.delete(entityId);
    for (const fn of this.listeners) fn(entityId, undefined);
  }

  replaceAll(states) {
    this.bulk = true;
    const keep = new Set(states.map((s) => s.entity_id));
    for (const id of [...this.states.keys()]) if (!keep.has(id)) this.remove(id);
    for (const s of states) this.set(s.entity_id, s.state, s.attributes);
    this.bulk = false;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
