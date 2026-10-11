// Dig: the state. One plain object (JSON-safe, structuredClone-safe) built from the slices
// that features declare. Fresh states, resets, parking a site, saving and loading all work
// from those declarations, so nothing here names a feature.
import { SLICES, FEATURES, run } from './registry.js';
import { KEEP_ROWS, genRow } from './grid.js';

// Bump with a step in MIGRATIONS (append-only; never edit a shipped step). Only the coordinator
// adds steps here. A feature that changes the meaning of its own slice uses `version` + `migrate`
// in its def instead (see the README), so two features never fight over this number.
export const SAVE_VERSION = 2;
export const MIGRATIONS = [
  // v2: the list of things found so far (`unlocked`) starts from what the save already shows
  { to: 2, migrate(o) {
    const u = o.unlocked || (o.unlocked = {});
    for (const [id, lv] of Object.entries(o.relics || {})) { u['relic:' + id] = 1; for (let l = 2; l <= lv; l++) u[`relic:${id}:${l}`] = 1; }
    for (const [id, lv] of Object.entries(o.up || {})) { if (lv > 0) u['shop:' + id] = 1; for (let l = 2; l <= lv; l++) u[`${id}:${l}`] = 1; }
    for (const k of Object.keys(o.fossils || {})) u['bone:' + k] = 1;
    for (const k of Object.keys(o.sets || {})) u['set:' + k] = 1;
    if (o.site && o.sites > 0) u['site:' + o.site] = 1;
  } },
];

function blank() {
  const s = { v: SAVE_VERSION };
  for (const sl of Object.values(SLICES)) s[sl.key] = sl.init();
  return s;
}
function dig(s) {
  s.rows = [];
  for (let i = 0; i < KEEP_ROWS; i++) s.rows.push(genRow(s, i));
}

export function newState() {
  const s = blank();
  dig(s);
  return s;
}

// reset(s, name): everything goes back to its default except the slices that declare
// `survives: [name]`. Then the `reset` hooks run and the ground is dug fresh.
// (The throwaway fresh state is built first so a reset draws the same chance as a fresh start does.)
export function reset(s, name) {
  const f = newState();
  for (const k of Object.keys(s)) if (!SLICES[k] && k !== 'v') delete s[k];
  for (const sl of Object.values(SLICES)) if (!sl.survives.includes(name)) s[sl.key] = f[sl.key];
  run('reset', s, name);
  dig(s);
}

// ---------- several sites ----------
// The site being played lives flat on the state. A site that is not on screen is a "bag":
// a plain object holding just the perSite slices. parkSite / loadSite swap the two.

export function parkSite(s) {
  const bag = {};
  for (const sl of Object.values(SLICES)) if (sl.perSite) bag[sl.key] = s[sl.key];
  return bag;
}
export function loadSite(s, bag) {
  for (const sl of Object.values(SLICES)) if (sl.perSite) s[sl.key] = sl.key in bag ? bag[sl.key] : sl.init();
}
// a bag for a site nobody has dug yet
export function freshSite(s, site) {
  const mine = parkSite(s);
  for (const sl of Object.values(SLICES)) if (sl.perSite) s[sl.key] = sl.init();
  if (site !== undefined) s.site = site;
  dig(s);
  const bag = parkSite(s);
  loadSite(s, mine);
  return bag;
}
// withSite(s, bag, fn): run rules on a parked site (fn sees it as the site in play), then put things back.
// The bag is updated in place.
export function withSite(s, bag, fn) {
  const mine = parkSite(s);
  loadSite(s, bag);
  try { return fn(s); } finally { Object.assign(bag, parkSite(s)); loadSite(s, mine); }
}

// ---------- save ----------

export function serialize(s) {
  const o = { ...s, savedAt: Date.now() };
  for (const sl of Object.values(SLICES)) if (sl.transient) o[sl.key] = sl.init();
  o.fv = {};
  for (const f of Object.values(FEATURES)) if (f.version) o.fv[f.id] = f.version;
  return JSON.stringify(o);
}

export function deserialize(text) {
  try {
    const o = JSON.parse(text);
    if (!o || typeof o.v !== 'number' || o.v < 1 || o.v > SAVE_VERSION) return null;
    if (!Array.isArray(o.rows) || o.rows.length !== KEEP_ROWS) return null;
    for (const m of MIGRATIONS) if (o.v < m.to) { m.migrate(o); o.v = m.to; }
    const s = Object.assign(blank(), o);
    for (const sl of Object.values(SLICES)) {
      if (sl.transient) { s[sl.key] = sl.init(); continue; }
      // a keyed slice (shop levels and the like) gets the keys that were added since the save
      const d = sl.init(), v = s[sl.key];
      if (d && typeof d === 'object' && !Array.isArray(d) && v && typeof v === 'object') for (const k of Object.keys(d)) if (!(k in v)) v[k] = d[k];
    }
    for (const row of s.rows) for (const cell of row) if (cell) delete cell.q;
    const fv = s.fv || {};
    for (const f of Object.values(FEATURES)) {
      if (f.version && f.migrate && (fv[f.id] || 1) < f.version) f.migrate(s, fv[f.id] || 1);
    }
    return s;
  } catch { return null; }
}
