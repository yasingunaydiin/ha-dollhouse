// Applying one edit to the house file. Shared by the server (which writes
// data/house.yaml) and the browser (which, on a static site with no server,
// keeps the edited house in localStorage).
//   { op: 'move' | 'remove' | 'add', floor, id, at, rot, stretch, def }
//   { op: 'setFloor', floor, wallList, objects }  (floor-plan editor)
// Edits use the YAML document API so comments and layout in the file survive.
import { parseDocument } from 'yaml';

export function applyEdit(text, change) {
  const doc = parseDocument(text);
  const floor = doc.get('floors').items.find((f) => f.get('id') === change.floor);
  if (!floor) throw new Error(`No floor "${change.floor}"`);
  const done = () => doc.toString({ lineWidth: 0, flowCollectionPadding: false });

  if (change.op === 'setFloor') {
    // the plan editor replaces a floor's walls and objects wholesale
    for (const key of ['wallList', 'objects']) {
      if (!Array.isArray(change[key])) continue;
      const node = doc.createNode(change[key]);
      for (const item of node.items) item.flow = true;
      floor.set(key, node);
    }
    return done();
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
    // stretch is only touched when the edit mentions it (null = back to original size)
    if (change.stretch) item.set('stretch', flow(change.stretch));
    else if ('stretch' in change) item.delete('stretch');
  } else throw new Error(`Unknown edit "${change.op}"`);

  return done();
}
