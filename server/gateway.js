// Gateway between the browser and Home Assistant.
// Holds the HA token server-side, keeps a live copy of every entity state over
// HA's WebSocket API, and exposes it to the web as:
//   GET  /api/ha/events   server-sent events: status, snapshot, state
//   POST /api/ha/service  { domain, service, data }  (refused when read-only)
export function createGateway({ url, token, readOnly = true, control = [], log = console }) {
  // control: domains that may be commanded even while read-only (e.g. ['climate'])
  const configured = Boolean(url && token);
  const states = new Map();
  const clients = new Set();
  const pending = new Map();
  let ws = null;
  let nextId = 1;
  let connected = false;
  let error = configured ? null : 'HA_URL / HA_TOKEN not set in .env.local';

  const slim = (s) => ({ entity_id: s.entity_id, state: s.state, attributes: s.attributes });
  const status = () => ({ configured, connected, readOnly, control, error });
  const send = (res, event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const broadcast = (event, data) => clients.forEach((res) => send(res, event, data));

  function command(msg) {
    const id = nextId++;
    ws.send(JSON.stringify({ id, ...msg }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }

  function connect() {
    ws = new WebSocket(url.replace(/^http/, 'ws').replace(/\/$/, '') + '/api/websocket');
    ws.onmessage = async ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.type === 'auth_required') {
        ws.send(JSON.stringify({ type: 'auth', access_token: token }));
      } else if (msg.type === 'auth_invalid') {
        error = `Home Assistant rejected the token: ${msg.message}`;
        log.error(`[gateway] ${error}`);
        ws.onclose = null;
        ws.close();
        broadcast('status', status());
      } else if (msg.type === 'auth_ok') {
        command({ type: 'subscribe_events', event_type: 'state_changed' });
        const all = await command({ type: 'get_states' });
        states.clear();
        for (const s of all) states.set(s.entity_id, slim(s));
        connected = true;
        error = null;
        log.info(`[gateway] connected to Home Assistant, ${states.size} entities, ${readOnly ? 'read-only' : 'commands enabled'}`);
        broadcast('status', status());
        broadcast('snapshot', [...states.values()]);
      } else if (msg.type === 'result') {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (p) msg.success ? p.resolve(msg.result) : p.reject(new Error(msg.error?.message ?? 'failed'));
      } else if (msg.type === 'event' && msg.event.event_type === 'state_changed') {
        const { entity_id, new_state } = msg.event.data;
        if (new_state) states.set(entity_id, slim(new_state));
        else states.delete(entity_id);
        broadcast('state', new_state ? slim(new_state) : { entity_id, state: null });
      }
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      if (connected) log.warn('[gateway] lost connection to Home Assistant, retrying');
      connected = false;
      error = 'Home Assistant unreachable';
      pending.forEach((p) => p.reject(new Error(error)));
      pending.clear();
      broadcast('status', status());
      setTimeout(connect, 5000);
    };
  }
  if (configured) connect();

  const json = (res, code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  return async function middleware(req, res, next) {
    const path = req.url.split('?')[0];
    if (path === '/api/ha/events' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      send(res, 'status', status());
      if (connected) send(res, 'snapshot', [...states.values()]);
      clients.add(res);
      req.on('close', () => clients.delete(res));
    } else if (path === '/api/ha/service' && req.method === 'POST') {
      try {
        let body = '';
        for await (const chunk of req) body += chunk;
        const { domain, service, data = {} } = JSON.parse(body);
        if (readOnly && !control.includes(domain))
          return json(res, 403, { error: 'Read-only: command not sent to the house' });
        if (!connected) return json(res, 503, { error: 'Home Assistant not connected' });
        const { entity_id, ...service_data } = data;
        await command({ type: 'call_service', domain, service, service_data, target: { entity_id } });
        json(res, 200, { ok: true });
      } catch (err) {
        json(res, 500, { error: err.message });
      }
    } else next();
  };
}
