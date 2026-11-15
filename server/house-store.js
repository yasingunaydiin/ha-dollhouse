// The house on disk. Your house (house.yaml) and its entity links (links.yaml)
// live in a data folder outside the repo; a fresh copy of the app starts from
// the empty lot in templates/.
//   GET  /api/house/house.yaml, /api/house/links.yaml   the current files
//   POST /api/house/edit    { op: 'move' | 'remove' | 'add', floor, id, at, rot, def }
//                           { op: 'setFloor', floor, wallList, objects }  (floor-plan editor)
//   GET  /api/house/export  the whole house as one downloadable file
//   POST /api/house/import  such a file; replaces the house (the old one is kept in data/backups)
// Edits use the YAML document API so comments and layout in the file survive.
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse, parseDocument } from 'yaml';

const FILES = ['house.yaml', 'links.yaml'];
const FORMAT = 'house-twin';

export function createHouseStore({ dir = 'data', templates = 'templates' } = {}) {
  const path = (name) => join(dir, name);
  let queue = Promise.resolve(); // one read or write at a time
  const inTurn = (fn) => (queue = queue.then(fn, fn));

  // first start: begin with the empty lot
  async function ready() {
    await mkdir(dir, { recursive: true });
    for (const name of FILES) if (!existsSync(path(name))) await copyFile(join(templates, name), path(name));
  }
  const read = async (name) => (await ready(), readFile(path(name), 'utf8'));

  async function edit(change) {
    const file = path('house.yaml');
    const doc = parseDocument(await read('house.yaml'));
    const floor = doc.get('floors').items.find((f) => f.get('id') === change.floor);
    if (!floor) throw new Error(`No floor "${change.floor}"`);
    if (change.op === 'setFloor') {
      // the plan editor replaces a floor's walls and objects wholesale
      for (const key of ['wallList', 'objects']) {
        if (!Array.isArray(change[key])) continue;
        const node = doc.createNode(change[key]);
        for (const item of node.items) item.flow = true;
        floor.set(key, node);
      }
      return writeFile(file, doc.toString({ lineWidth: 0, flowCollectionPadding: false }));
    }
    if (!floor.has('objects') || !floor.get('objects')?.items) floor.set('objects', doc.createNode([]));
    const objects = floor.get('objects');
    const index = objects.items.findIndex((o) => o.get('id') === change.id);
    const flow = (value) => Object.assign(doc.createNode(value), { flow: true });

    if (change.op === 'add') {
      if (index >= 0) throw new Error(`"${change.id}" already exists`);
      objects.flow = false;
      objects.add(flow(change.def));
    } else if (index < 0) {
      throw new Error(`No object "${change.id}" on floor "${change.floor}"`);
    } else if (change.op === 'remove') {
      objects.delete(index);
    } else if (change.op === 'move') {
      const item = objects.items[index];
      item.set('at', flow(change.at));
      if (change.rot) item.set('rot', change.rot);
      else item.delete('rot');
    } else throw new Error(`Unknown edit "${change.op}"`);

    await writeFile(file, doc.toString({ lineWidth: 0, flowCollectionPadding: false }));
  }

  // The export keeps both files as text, so comments survive a round trip.
  async function exportHouse() {
    const [house, links] = await Promise.all(FILES.map(read));
    return { format: FORMAT, version: 1, exported: new Date().toISOString(), name: parse(house)?.name ?? 'Home', house, links };
  }

  async function importHouse(data) {
    if (data?.format !== FORMAT || typeof data.house !== 'string' || typeof data.links !== 'string')
      throw new Error('This is not a House Twin export file');
    const house = parse(data.house), links = parse(data.links) ?? {};
    if (!Array.isArray(house?.floors) || !house.floors.length || house.floors.some((f) => !f?.id || !Array.isArray(f.rooms)))
      throw new Error('The house in this file has no usable floors');
    if (typeof links !== 'object' || Array.isArray(links)) throw new Error('The links in this file are not a list of object: entity pairs');
    await ready();
    const backup = join(dir, 'backups', new Date().toISOString().replace(/[:.]/g, '-'));
    await mkdir(backup, { recursive: true });
    for (const name of FILES) await copyFile(path(name), join(backup, name));
    await writeFile(path('house.yaml'), data.house);
    await writeFile(path('links.yaml'), data.links);
  }

  return async function middleware(req, res, next) {
    const url = req.url.split('?')[0];
    if (!url.startsWith('/api/house/')) return next();
    const name = url.slice('/api/house/'.length);
    const json = (code, payload) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    };
    const body = async () => {
      let text = '';
      for await (const chunk of req) text += chunk;
      return JSON.parse(text);
    };
    try {
      if (req.method === 'GET' && FILES.includes(name)) {
        const text = await inTurn(() => read(name));
        res.writeHead(200, { 'Content-Type': 'text/yaml; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(text);
      } else if (req.method === 'GET' && name === 'export') {
        const data = await inTurn(exportHouse);
        const file = `house-twin-${data.exported.slice(0, 10)}.json`;
        res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${file}"`, 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(data, null, 2));
      } else if (req.method === 'POST' && name === 'edit') {
        const change = await body();
        await inTurn(() => edit(change));
        json(200, { ok: true });
      } else if (req.method === 'POST' && name === 'import') {
        const data = await body();
        await inTurn(() => importHouse(data));
        json(200, { ok: true });
      } else next();
    } catch (err) {
      json(400, { error: err.message });
    }
  };
}
