// Dig: the registries. A feature is one use({...}) call; everything it adds lands in a table here.
// No rules in this file and no DOM: only tables, hooks, numbers and the list of content.
// Every table is kept sorted by (at, id), so the order features are imported in never changes the game.
// The contract is proto/README.md.
import { addStrings } from './strings.js';

export const FEATURES = {};   // id -> the def passed to use()
export const BLOCKS = {};     // block kinds: id -> { hp, val, soft, ore, wall, chain, damage(), broke(), ... }
export const LAYERS = [];     // ground layers, top first: { id, land, look, ores, blocks, law }
export const RELICS = {};     // id -> { max, when(s), pair, vars(lv) }
export const SHOPS = {};      // id -> { wallet, levels }  (state keys)
export const ITEMS = {};      // shop items of every shop: id -> { shop, base, grow, max, open(s), bought() }
export const SITES = {};      // id -> { hp, ore, tnt, bone, chest, blocks, hooks, mods }
export const CONTRACTS = {};  // id -> { open(s), goal(s), prize(s, ev), hooks, mods }
export const POLICIES = {};   // digger target choice: id -> (s, digger) => [r, c] | null
export const TOOLS = {};      // active tools: id -> { key, open(s), can(s, r, c), use(s, r, c, ev) }
export const QUEUE = {};      // delayed effects: kind -> (s, q, ev) => void
export const PARAMS = {};     // numbers: feature id -> its params object
export const SLICES = {};     // state: key -> { init, perSite, survives, transient, owner }
export const ROOTS = {};      // named tables a sim may reach into by path ("SETS.camel.pieces")
export const GEN = { whole: [], claim: [], base: [], row: [] };   // how a row of ground is made
export const BOTS = [];       // what a scripted player does with a feature (sims only)

const HOOKS = {}, MODS = {}, FIRSTS = {}, POLLS = [], UNLOCK_SRC = [], ALIAS = {};
let scopedInUse = false;      // true once a site, contract or layer law carries hooks
const SCOPES = [];            // (s) => def | undefined   (the site, the contract, the layer law in force)
let unlockCache = null;

const AT = 1000;              // where a thing sorts when it gives no `at`
const byAt = (a, b) => (a.at - b.at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function resort(table) {
  const all = Object.values(table).sort(byAt);
  for (const k of Object.keys(table)) delete table[k];
  for (const x of all) table[x.id] = x;
  if (table === BLOCKS) {
    if (table.crate) {
      Object.defineProperty(table, 'CRATE', {
        get() { return table.crate; },
        enumerable: false,
        configurable: true,
      });
    }
    if (table.pressureWell) {
      Object.defineProperty(table, 'well', {
        get() { return table.pressureWell; },
        enumerable: false,
        configurable: true,
      });
      Object.defineProperty(table, 'WELL', {
        get() { return table.pressureWell; },
        enumerable: false,
        configurable: true,
      });
    }
    if (table.silt) {
      Object.defineProperty(table, 'SILT', {
        get() { return table.silt; },
        enumerable: false,
        configurable: true,
      });
    }
    if (table.obsidian) {
      Object.defineProperty(table, 'OBSIDIAN', {
        get() { return table.obsidian; },
        enumerable: false,
        configurable: true,
      });
    }
  }
}
function addAll(table, defs, owner, what, shape = x => x) {
  for (const [id, d] of Object.entries(defs || {})) {
    if (table[id]) throw new Error(`Dig: ${what} "${id}" is registered twice (${table[id].owner} and ${owner})`);
    table[id] = shape({ at: AT, ...d, id, owner });
  }
  if (defs) resort(table);
}
function addList(list, items, owner) {
  for (const it of items || []) {
    const e = typeof it === 'function' ? { fn: it } : { ...it };
    list.push({ at: AT, id: owner, ...e, owner });
  }
  list.sort(byAt);
}
function addHooks(map, defs, owner, wrap = f => f) {
  for (const [name, hs] of Object.entries(defs || {})) {
    for (const h of [].concat(hs)) {
      const e = typeof h === 'function' ? { fn: h } : h;
      (map[name] || (map[name] = [])).push({ at: e.at === undefined ? AT : e.at, id: owner, fn: wrap(e.fn) });
    }
    map[name].sort(byAt);
  }
}

// ---------- use(def): register a feature ----------

export function use(def) {
  if (!def || !def.id) throw new Error('Dig: a feature needs an id');
  if (FEATURES[def.id]) throw new Error(`Dig: feature "${def.id}" is registered twice`);
  const id = def.id;
  FEATURES[id] = def;
  if (def.params) {
    PARAMS[id] = def.params;
    for (const [old, key] of Object.entries(def.legacy || {})) ALIAS[old] = [id, key];
  }
  for (const [name, obj] of Object.entries(def.tables || {})) ROOTS[name] = obj;
  if (def.strings) addStrings(def.strings, id, def.stringsAr);
  for (const [key, sl] of Object.entries(def.state || {})) slice(key, sl, id);

  addAll(BLOCKS, def.blocks, id, 'block', b => ({ hp: 1, val: 0, ...b }));
  for (const [bid, b] of Object.entries(def.blocks || {})) if (b.base) addList(GEN.base, [{ id: bid, ...b.base }], id);
  addAll(RELICS, def.relics, id, 'relic', r => ({ max: 1, ...r }));
  for (const [rid, r] of Object.entries(def.relics || {})) {
    // a relic's own hooks only run while the player holds it
    addHooks(HOOKS, r.hooks, rid, f => (s, a, b, c, d, e) => (s.relics[rid] ? f(s, a, b, c, d, e) : undefined));
    addHooks(MODS, r.mods, rid, f => (v, s, a, b, c, d) => (s.relics[rid] ? f(v, s, a, b, c, d) : v));
  }
  addAll(SHOPS, def.shops, id, 'shop');
  for (const [sid, sh] of Object.entries(def.shops || {})) {
    if (!SLICES[sh.levels]) slice(sh.levels, { init: () => levelsOf(sid), survives: sh.survives || [], perSite: !!sh.perSite }, id);
  }
  addAll(ITEMS, def.items, id, 'shop item');
  addAll(SITES, def.sites, id, 'site');
  addAll(CONTRACTS, def.contracts, id, 'contract');
  addAll(TOOLS, def.tools, id, 'tool');
  for (const [k, f] of Object.entries(def.policies || {})) { if (POLICIES[k]) throw new Error(`Dig: policy "${k}" twice`); POLICIES[k] = f; }
  for (const [k, f] of Object.entries(def.queue || {})) { if (QUEUE[k]) throw new Error(`Dig: queue kind "${k}" twice`); QUEUE[k] = f; }
  if (def.layers) {
    for (const l of def.layers) LAYERS.push({ at: AT, land: 'desert', owner: id, ...l });
    LAYERS.sort(byAt);
    landCache = {};
  }
  if (def.gen) for (const k of Object.keys(GEN)) addList(GEN[k], def.gen[k], id);
  addHooks(HOOKS, def.hooks, id);
  addHooks(MODS, def.mods, id);
  for (const [kind, f] of Object.entries(def.firsts || {})) (FIRSTS[kind] || (FIRSTS[kind] = [])).push(f);
  if (def.polls) POLLS.push(...def.polls);
  if (def.unlocks) UNLOCK_SRC.push(def.unlocks);
  if (def.bot) BOTS.push({ id, ...def.bot });
  const scoped = x => x && (x.hooks || x.mods || x.law);
  if ([def.sites, def.contracts].some(t => Object.values(t || {}).some(scoped)) || (def.layers || []).some(scoped)) scopedInUse = true;
  unlockCache = null;
  return def;
}

// ---------- state slices ----------

// slice(key, { init, perSite, survives, transient }): one piece of the saved state.
//   init()     -> the default (a fresh value each call)
//   perSite    -> belongs to one dig site (it is parked with the site when several run at once)
//   survives   -> names of the resets it lives through, e.g. ['site'] for a New Site
//   transient  -> not saved: it is written as init() and rebuilt on load
export function slice(key, sl, owner = '?') {
  if (SLICES[key]) throw new Error(`Dig: state key "${key}" is declared twice (${SLICES[key].owner} and ${owner})`);
  if (!sl || typeof sl.init !== 'function') throw new Error(`Dig: state key "${key}" needs init()`);
  SLICES[key] = { perSite: false, survives: [], transient: false, ...sl, key, owner };
}
// reslice(key, patch): change the scope of a slice someone else declared (the map does this, see the README)
export function reslice(key, patch) { Object.assign(SLICES[key], patch); }

export function levelsOf(shop) {
  const o = {};
  for (const it of Object.values(ITEMS)) if (it.shop === shop) o[it.id] = 0;
  return o;
}

// ---------- layers ----------

let landCache = {};
export function layersOf(land) {
  return landCache[land] || (landCache[land] = LAYERS.filter(l => l.land === land));
}

// ---------- hooks ----------
// run(name, s, ...): every hook of that name, in order. Returns true if one of them returned true.
// fold(name, s, v, ...): passes v through every mod of that name; each returns the new value.

export const has = name => !!HOOKS[name] || scopedInUse;
export const scope = f => { SCOPES.push(f); };

export function run(name, s, a, b, c, d, e) {
  let hit = false;
  const L = HOOKS[name];
  if (L) for (let i = 0; i < L.length; i++) if (L[i].fn(s, a, b, c, d, e) === true) hit = true;
  if (scopedInUse) for (const f of SCOPES) {
    const x = f(s), h = x && x.hooks && x.hooks[name];
    if (h && h(s, a, b, c, d, e) === true) hit = true;
  }
  return hit;
}
export function fold(name, s, v, a, b, c, d) {
  const L = MODS[name];
  if (L) for (let i = 0; i < L.length; i++) v = L[i].fn(v, s, a, b, c, d);
  if (scopedInUse) for (const f of SCOPES) {
    const x = f(s), h = x && x.mods && x.mods[name];
    if (h) v = h(v, s, a, b, c, d);
  }
  return v;
}

// ---------- numbers ----------
// Every feature owns PARAMS[id]. P is the old flat view of them (P.tntPower is PARAMS.tnt.power).

export const P = new Proxy({}, {
  get: (_, k) => { const a = ALIAS[k]; return a ? PARAMS[a[0]][a[1]] : undefined; },
  set: (_, k, v) => { const a = ALIAS[k]; if (!a) return false; PARAMS[a[0]][a[1]] = v; return true; },
  has: (_, k) => k in ALIAS,
  ownKeys: () => Object.keys(ALIAS),
  getOwnPropertyDescriptor: (_, k) => (k in ALIAS ? { enumerable: true, configurable: true, value: PARAMS[ALIAS[k][0]][ALIAS[k][1]] } : undefined),
});

// A path names one number: "tnt.power" (feature.key), "P.tntPower" or "tntPower" (old names),
// "ITEMS.crew.base" / "UPGRADES.crew.base" / "crew.base", "BLOCKS.gold.val" / "TYPES.gold.val",
// "SITES.boom.tnt", "RELICS.boom.max", "LAYERS.1.look.dirt", or any table a feature exposes ("SETS.camel.pieces").
function resolve(path) {
  const p = path.split('.');
  const named = { ITEMS, UPGRADES: ITEMS, BLOCKS, TYPES: BLOCKS, SITES, RELICS, LAYERS, PARAMS, ...ROOTS };
  let root, rest;
  if (p[0] === 'P') { const a = ALIAS[p[1]]; if (a) { root = PARAMS[a[0]]; rest = [a[1]]; } }
  else if (named[p[0]]) { root = named[p[0]]; rest = p.slice(1); }
  else if (p.length === 1 && ALIAS[p[0]]) { root = PARAMS[ALIAS[p[0]][0]]; rest = [ALIAS[p[0]][1]]; }
  else if (PARAMS[p[0]] && p.length > 1) { root = PARAMS[p[0]]; rest = p.slice(1); }
  else if (ITEMS[p[0]] && p.length > 1) { root = ITEMS; rest = p; }
  if (!root || !rest.length) throw new Error(`Dig: no number at "${path}"`);
  let o = root;
  for (const k of rest.slice(0, -1)) { o = o[k]; if (o === undefined || o === null) throw new Error(`Dig: no number at "${path}"`); }
  return [o, rest[rest.length - 1]];
}
export function getParam(path) { const [o, k] = resolve(path); return o[k]; }
// setParam returns a function that puts the old value back
export function setParam(path, value) {
  const [o, k] = resolve(path);
  const old = o[k];
  o[k] = value;
  return () => { o[k] = old; };
}

// ---------- content: what there is to find, and the first time it is found ----------
// An unlock is { id, cat: 'core' | 'grind', group }. The rules send ev('unlock', { id, cat, group })
// the first time each is reached in a save (state key `unlocked`). The page and the timeline sim read this list.

export function unlocks() {
  if (unlockCache) return unlockCache;
  const list = [];
  const add = (id, cat, group) => list.push({ id, cat, group });
  for (const b of Object.values(BLOCKS)) if (b.unlock !== false) add('type:' + b.id, 'core', 'block kinds');
  for (const r of Object.values(RELICS)) add('relic:' + r.id, 'core', 'relics');
  for (let i = 1; i < layersOf('desert').length; i++) add('layer' + (i + 1), 'core', 'deeper layers');
  for (const it of Object.values(ITEMS)) add('shop:' + it.id, 'core', 'shop items');
  for (const it of Object.values(ITEMS)) if (it.levels && it.max) for (let n = 2; n <= it.max; n++) add(`${it.id}:${n}`, it.levels, `${it.id} levels beyond the first`);
  for (const st of Object.values(SITES)) if (!st.start) add('site:' + st.id, 'core', 'new sites');
  for (const r of Object.values(RELICS)) for (let l = 2; l <= r.max; l++) add(`relic:${r.id}:${l}`, 'grind', 'relic levels beyond the first');
  for (const t of Object.values(TOOLS)) add('tool:' + t.id, 'core', 'tools');
  for (const c of Object.values(CONTRACTS)) add('contract:' + c.id, 'core', 'contracts');
  for (const src of UNLOCK_SRC) for (const u of (typeof src === 'function' ? src() : src)) add(u.id, u.cat || 'core', u.group || 'other');
  const byId = {};
  for (const u of list) { if (byId[u.id]) throw new Error(`Dig: unlock "${u.id}" is listed twice`); byId[u.id] = u; }
  return (unlockCache = { list, byId });
}

export function unlock(s, id, ev) {
  if (s.unlocked[id]) return false;
  const u = unlocks().byId[id];
  if (!u) return false;
  s.unlocked[id] = 1;
  ev('unlock', u);
  return true;
}

// emit(s, ev, kind, data): how the rules report anything. It also notices first times.
export function emit(s, ev, kind, d) {
  ev(kind, d);
  const F = FIRSTS[kind];
  if (!F) return;
  for (let i = 0; i < F.length; i++) {
    const ids = F[i](d, s);
    if (!ids) continue;
    if (typeof ids === 'string') unlock(s, ids, ev);
    else for (const id of ids) if (id) unlock(s, id, ev);
  }
}
export function pollUnlocks(s, ev) {
  for (let i = 0; i < POLLS.length; i++) {
    const ids = POLLS[i](s);
    if (ids) for (const id of ids) unlock(s, id, ev);
  }
}
