// Saving edits. With the dev/preview server they go to data/house.yaml; on a
// static host (GitHub Pages) there is no server, so the edited house is kept
// in this browser's localStorage instead.
import { applyEdit, applyLink } from './house-edit.js';

export const STORED = 'twin.static-house';
let local = null; // { 'house.yaml': text, 'links.yaml': text } on a static site

export function storedHouse() {
  try { return JSON.parse(localStorage.getItem(STORED)); } catch { return null; }
}
export function storeHouse(house, links) {
  localStorage.setItem(STORED, JSON.stringify({ house, links }));
}
// main.js calls this when it finds there is no server to save to
export function saveLocally(texts) { local = texts; }

// throws with a readable message when the edit could not be saved
export async function saveEdit(change) {
  if (local) {
    // the planner and its "3D beside" pane are separate pages sharing one stored house
    const text = applyEdit(storedHouse()?.house ?? local['house.yaml'], change);
    storeHouse(text, local['links.yaml']);
    local['house.yaml'] = text;
    return;
  }
  const res = await fetch('/api/house/edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(change),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `the server answered ${res.status}`);
}

// link one object to a Home Assistant entity (null removes the link)
export async function saveLink(id, entity) {
  if (local) {
    const text = applyLink(storedHouse()?.links ?? local['links.yaml'], id, entity);
    storeHouse(storedHouse()?.house ?? local['house.yaml'], text);
    local['links.yaml'] = text;
    return;
  }
  const res = await fetch('/api/house/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, entity: entity || null }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `the server answered ${res.status}`);
}
