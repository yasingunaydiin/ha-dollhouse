// Saves edits made in the browser's edit mode back into public/house/house.yaml.
// Uses the YAML document API so comments and layout in the file survive.
//   POST /api/house/edit  { op: 'move' | 'remove' | 'add', floor, id, at, rot, def }
//                         { op: 'setFloor', floor, wallList, objects }  (floor-plan editor)
import { readFile, writeFile } from 'node:fs/promises';
import { parseDocument } from 'yaml';

export function createHouseEditor(file) {
  let queue = Promise.resolve(); // one edit at a time

  async function apply(edit) {
    const doc = parseDocument(await readFile(file, 'utf8'));
    const floor = doc.get('floors').items.find((f) => f.get('id') === edit.floor);
    if (!floor) throw new Error(`No floor "${edit.floor}"`);
    if (edit.op === 'setFloor') {
      // the plan editor replaces a floor's walls and objects wholesale
      for (const key of ['wallList', 'objects']) {
        if (!Array.isArray(edit[key])) continue;
        const node = doc.createNode(edit[key]);
        for (const item of node.items) item.flow = true;
        floor.set(key, node);
      }
      return writeFile(file, doc.toString({ lineWidth: 0, flowCollectionPadding: false }));
    }
    if (!floor.has('objects')) floor.set('objects', doc.createNode([]));
    const objects = floor.get('objects');
    const index = objects.items.findIndex((o) => o.get('id') === edit.id);
    const flow = (value) => Object.assign(doc.createNode(value), { flow: true });

    if (edit.op === 'add') {
      if (index >= 0) throw new Error(`"${edit.id}" already exists`);
      objects.add(flow(edit.def));
    } else if (index < 0) {
      throw new Error(`No object "${edit.id}" on floor "${edit.floor}"`);
    } else if (edit.op === 'remove') {
      objects.delete(index);
    } else if (edit.op === 'move') {
      const item = objects.items[index];
      item.set('at', flow(edit.at));
      if (edit.rot) item.set('rot', edit.rot);
      else item.delete('rot');
    } else throw new Error(`Unknown edit "${edit.op}"`);

    await writeFile(file, doc.toString({ lineWidth: 0, flowCollectionPadding: false }));
  }

  return async function middleware(req, res, next) {
    if (req.url.split('?')[0] !== '/api/house/edit' || req.method !== 'POST') return next();
    let body = '';
    for await (const chunk of req) body += chunk;
    const done = (code, payload) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    };
    queue = queue.then(
      () => apply(JSON.parse(body)).then(() => done(200, { ok: true }), (err) => done(400, { error: err.message }))
    );
  };
}
