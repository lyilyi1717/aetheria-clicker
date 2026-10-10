// The core loop's saved state (docs/core-loop-plan.md CL-0): one plain object, every field with a
// default, so a save that lacks a field (older or partial) still loads (AGENTS.md rule 2).
// README.md in this folder says which system writes which part. Saves are untrusted input:
// deserializeCoreLoop never trusts a type and never throws.
import { BigNum } from '../../engine/BigNum.js';
import { P } from './params.js';
import { FIELDS, FRACTIONS } from './shared.js';
import { newTree, nodeOf, RINGS } from './treeMath.js';

// Bumped when the meaning of a saved field changes; the step that converts old data goes in
// migrateCoreLoop below (never edit a shipped step).
export const CORE_LOOP_VERSION = 1;

const zeros = (n) => new Array(n).fill(0);
const bigs = (n) => Array.from({ length: n }, () => BigNum.zero());

// Mixer recipes are content, not state: recipe i of batch `from` is defined by Collection.js.
// The state only keeps what the player did with each (found, made, tier).

export function createCoreLoopState(seed = 1) {
  return {
    version: CORE_LOOP_VERSION,
    t: 0,                       // seconds of loop time played or settled so far
    rng: seed | 0,              // mulberry32 state (shared.rand)

    // --- Well (Well.js). Index 0 of `bought` / `amount` is unused: slot k is index k (1..slots).
    well: {
      crude: new BigNum(P.startCrude), // spendable
      runCrude: BigNum.zero(),         // earned this run (since the last New Well)
      runStart: 0,                     // loop time the run began
      taps: 0,                         // taps on the Well ever (the guide's first lesson)
      bought: zeros(P.slots + 1),      // units bought per slot (sets price and the x2-per-10)
      amount: bigs(P.slots + 1),       // units owned per slot (bought + produced by the slot above)
      pressure: 0,                     // Pressure levels this run
      pressureBest: 0,                 // highest ever (Rig speed uses this; never reset)
      flare: 1,                        // top slot's Flare multiplier this run
      generators: P.slots,             // generators unlocked (8..P.generators), never reset
      bestRunChron: BigNum.zero(),     // best run Crude this Chronicle (New Field gates)
      bestEver: BigNum.zero(),         // best run Crude ever (generator unlocks)
      recordAtChron: BigNum.zero()     // best before the last Chronicle (the record gate)
    },

    // --- Prestige (Prestige.js)
    prestige: {
      wells: 0,                 // New Wells ever
      reserves: 0,              // lifetime Reserves this New Field layer
      newFields: 0,             // New Fields this Chronicle
      totalFields: 0,           // New Fields ever
      shares: 0,                // Field Shares this Chronicle
      chronicles: 0,
      pages: 0,                 // lifetime Pages
      lastResetAt: 0,           // loop time of the last New Field or Chronicle
      charter: 'none',          // 'wildcatter' | 'operator' | 'baron' | 'none'
      crew: 0,                  // Crew hired (Seals.js reads it)
      trials: Object.fromEntries(P.trials.map(([id]) => [id, { unlockedAt: null, won: false }]))
    },

    // --- Fields (Fields.js, Rigs.js). One entry per Field, in shared.FIELDS order.
    fields: FIELDS.map(() => ({
      frontier: 0,              // levels pushed by hand; grade = floor(frontier / P.gradeSpan)
      bestGrade: 0,
      inventory: [0],           // Material units by grade
      rig: 0,                   // Rig level, 0 = no Rig yet
      rigBestGrade: 0           // highest grade the Rig has hauled
    })),

    // --- Mastery (Mastery.js). Per Field, per action.
    mastery: FIELDS.map(() => ({ hours: zeros(P.actionsPerField), ranks: zeros(P.actionsPerField) })),

    // --- Refinery (Refinery.js owns level, orders, weekly; the other fields have one writer each)
    refinery: {
      frac: FRACTIONS.map(() => ({ level: 0, bubble: 0, vial: 0, compound: 0, seal: 0 })),
      orders: Array.from({ length: P.orderSlots }, () => ({ empty: true, refillAt: 0 })),
      weekly: { week: -1, need: null }
    },

    // --- Cauldrons (Cauldrons.js), in P.cauldrons order
    cauldrons: {
      vats: P.cauldrons.map(() => ({ fill: 0, brewed: 0, bars: 0, speed: 1 })),
      bubbles: []               // { frac, level }
    },

    // --- Collection (Collection.js)
    collection: {
      vials: {},                // '<field>:<grade>' -> { tier, pity }
      vialOffers: 0,
      vialDay: -1,
      batchFrom: [],            // best grade at each Chronicle, one number per Chronicle batch of recipes
      recipes: []               // { found, made, tier } by recipe index
    },

    // --- the one tree (Tree.js): what each ring's bank holds and the rank of each node bought
    tree: newTree(),

    // --- the guide (Guide.js): steps passed, features opened (sticky), tabs not looked at yet
    guide: { step: 0, open: {}, fresh: {}, intro: false },

    // --- Seals (Seals.js)
    seals: { hours: zeros(P.seals), tier: zeros(P.seals) },

    // --- Presence (Presence.js)
    presence: {
      state: 'away',
      lastInputAt: -Infinity,   // loop time of the last input (not saved: -Infinity on load)
      heatSeconds: 0,           // seconds into the current hands-on stretch
      handField: 0,             // the Field the player is working
      nextGusherAt: 0,
      caught: 0                 // Gushers caught ever
    }
  };
}

// --- save / load ---------------------------------------------------------------------------------
const WELL_BIG = ['crude', 'runCrude', 'bestRunChron', 'bestEver', 'recordAtChron'];

export function serializeCoreLoop(state) {
  const well = { ...state.well, amount: state.well.amount.map(b => b.toJSON()) };
  for (const k of WELL_BIG) well[k] = state.well[k].toJSON();
  // lastInputAt is session-only: -Infinity is not JSON, and a loaded game starts Away
  const presence = { ...state.presence, state: 'away', lastInputAt: null, heatSeconds: 0 };
  return JSON.parse(JSON.stringify({ ...state, well, presence }));
}

const num = (v, d = 0) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : d);
const int = (v, d = 0) => Math.max(0, Math.floor(num(v, d)));
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const numArr = (v, n, d = 0) => Array.from({ length: n }, (_, i) => num(Array.isArray(v) ? v[i] : undefined, d));

// Converts older core-loop saves in place, one version at a time. Empty until a shipped field
// changes meaning: { to: n + 1, migrate(data) } and a test with an old-shaped save.
const CORE_LOOP_MIGRATIONS = [];
export function migrateCoreLoop(data) {
  let v = int(data.version, 1);
  for (const step of CORE_LOOP_MIGRATIONS) if (step.to === v + 1) { step.migrate(data); v = step.to; }
  data.version = v;
  return data;
}

// Any input (undefined, a string, a half-written object) gives a complete, valid state.
export function deserializeCoreLoop(raw) {
  const s = createCoreLoopState();
  if (!isObj(raw)) return s;
  const data = migrateCoreLoop({ ...raw });
  s.version = CORE_LOOP_VERSION;
  s.t = Math.max(0, num(data.t));
  s.rng = num(data.rng, s.rng) | 0;

  const w = isObj(data.well) ? data.well : {};
  for (const k of WELL_BIG) if (w[k] !== undefined) s.well[k] = BigNum.fromJSON(w[k]);
  s.well.runStart = Math.max(0, num(w.runStart));
  s.well.taps = int(w.taps);
  s.well.bought = numArr(w.bought, P.slots + 1).map(x => int(x));
  s.well.amount = Array.from({ length: P.slots + 1 }, (_, i) => BigNum.fromJSON(Array.isArray(w.amount) ? w.amount[i] : null));
  s.well.pressure = int(w.pressure);
  s.well.pressureBest = Math.max(s.well.pressure, int(w.pressureBest));
  s.well.flare = Math.max(1, num(w.flare, 1));
  s.well.generators = Math.min(P.generators, Math.max(P.slots, int(w.generators, P.slots)));

  const p = isObj(data.prestige) ? data.prestige : {};
  for (const k of ['wells', 'reserves', 'newFields', 'totalFields', 'shares', 'chronicles', 'pages', 'crew']) s.prestige[k] = int(p[k]);
  s.prestige.lastResetAt = Math.max(0, num(p.lastResetAt));
  s.prestige.charter = Object.keys(P.charter).includes(p.charter) ? p.charter : 'none';
  for (const [id] of P.trials) {
    const tr = isObj(p.trials) && isObj(p.trials[id]) ? p.trials[id] : {};
    s.prestige.trials[id] = { unlockedAt: tr.unlockedAt === null || tr.unlockedAt === undefined ? null : Math.max(0, num(tr.unlockedAt)), won: tr.won === true };
  }

  const fields = Array.isArray(data.fields) ? data.fields : [];
  s.fields.forEach((f, i) => {
    const d = isObj(fields[i]) ? fields[i] : {};
    f.frontier = Math.max(0, num(d.frontier));
    f.bestGrade = Math.max(Math.floor(f.frontier / P.gradeSpan), int(d.bestGrade));
    f.inventory = Array.isArray(d.inventory) && d.inventory.length ? d.inventory.map(x => Math.max(0, num(x))) : [0];
    f.rig = int(d.rig);
    f.rigBestGrade = int(d.rigBestGrade);
  });

  const mastery = Array.isArray(data.mastery) ? data.mastery : [];
  s.mastery.forEach((m, i) => {
    const d = isObj(mastery[i]) ? mastery[i] : {};
    m.hours = numArr(d.hours, P.actionsPerField).map(x => Math.max(0, x));
    m.ranks = numArr(d.ranks, P.actionsPerField).map(x => int(x));
  });

  const r = isObj(data.refinery) ? data.refinery : {};
  s.refinery.frac.forEach((f, i) => {
    const d = Array.isArray(r.frac) && isObj(r.frac[i]) ? r.frac[i] : {};
    f.level = int(d.level);
    for (const k of ['bubble', 'vial', 'compound', 'seal']) f[k] = Math.max(0, num(d[k]));
  });
  s.refinery.orders = s.refinery.orders.map((empty, i) => {
    const o = Array.isArray(r.orders) && isObj(r.orders[i]) ? r.orders[i] : null;
    if (!o || o.empty !== false) return { empty: true, refillAt: Math.max(0, num(o?.refillAt)) };
    const frac = int(o.frac), field = int(o.field);
    if (frac >= FRACTIONS.length || field >= FIELDS.length || !(num(o.qty) > 0)) return empty;
    return { empty: false, frac, field, grade: int(o.grade), qty: num(o.qty), posted: Math.max(0, num(o.posted)) };
  });
  if (isObj(r.weekly)) {
    const need = Array.isArray(r.weekly.need) && r.weekly.need.length === FIELDS.length
      ? r.weekly.need.map(n => ({ grade: int(n?.grade), qty: Math.max(0, num(n?.qty)) })) : null;
    s.refinery.weekly = { week: Math.floor(num(r.weekly.week, -1)), need };
  }

  const c = isObj(data.cauldrons) ? data.cauldrons : {};
  s.cauldrons.vats.forEach((v, i) => {
    const d = Array.isArray(c.vats) && isObj(c.vats[i]) ? c.vats[i] : {};
    v.fill = Math.max(0, num(d.fill)); v.brewed = int(d.brewed); v.bars = int(d.bars); v.speed = Math.max(1, num(d.speed, 1));
  });
  s.cauldrons.bubbles = (Array.isArray(c.bubbles) ? c.bubbles : [])
    .filter(b => isObj(b) && int(b.frac) < FRACTIONS.length)
    .map(b => ({ frac: int(b.frac), level: Math.max(1, int(b.level, 1)) }));

  const col = isObj(data.collection) ? data.collection : {};
  if (isObj(col.vials)) {
    for (const [key, v] of Object.entries(col.vials)) {
      if (/^\d+:\d+$/.test(key) && isObj(v)) s.collection.vials[key] = { tier: Math.min(P.vialTiers, int(v.tier)), pity: int(v.pity) };
    }
  }
  s.collection.vialOffers = int(col.vialOffers);
  s.collection.vialDay = Math.floor(num(col.vialDay, -1));
  s.collection.batchFrom = (Array.isArray(col.batchFrom) ? col.batchFrom : []).map(x => int(x));
  s.collection.recipes = (Array.isArray(col.recipes) ? col.recipes : [])
    .map(x => (isObj(x) ? { found: x.found === true, made: int(x.made), tier: Math.min(P.compoundTiers.length, int(x.tier)) } : { found: false, made: 0, tier: 0 }));

  const gd = isObj(data.guide) ? data.guide : {};
  s.guide.step = int(gd.step);
  s.guide.intro = gd.intro === true;
  for (const k of ['open', 'fresh']) if (isObj(gd[k])) for (const [id, v] of Object.entries(gd[k])) if (v === true && id.length < 40) s.guide[k][id] = true;

  const tr = isObj(data.tree) ? data.tree : {};
  for (const ring of RINGS) s.tree.bank[ring] = int(isObj(tr.bank) ? tr.bank[ring] : 0);
  if (isObj(tr.ranks)) {
    const ranks = {};
    for (const [id, r] of Object.entries(tr.ranks)) if (nodeOf(id) && int(r) > 0) ranks[id] = Math.min(nodeOf(id).max, int(r));
    s.tree.ranks = ranks;
  }

  const se = isObj(data.seals) ? data.seals : {};
  s.seals.hours = numArr(se.hours, P.seals).map(x => Math.max(0, x));
  s.seals.tier = numArr(se.tier, P.seals).map(x => Math.min(P.sealHours.length, int(x)));

  const pr = isObj(data.presence) ? data.presence : {};
  s.presence.handField = Math.min(FIELDS.length - 1, int(pr.handField));
  s.presence.nextGusherAt = Math.max(0, num(pr.nextGusherAt));
  s.presence.caught = int(pr.caught);
  return s;
}
