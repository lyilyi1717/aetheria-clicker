// Dig: the core rules. Damage and breaking, the player's swing, the step, shops and tools.
// Pure logic over one state object; no DOM, no audio. Everything that should be seen or heard is
// reported with emit(s, ev, kind, data). What each kind of block, relic, site or layer does lives in
// proto/features/ and plugs in through the hooks named here (the full list is in proto/README.md).
import { use, BLOCKS, ITEMS, SHOPS, TOOLS, QUEUE, layersOf, run, fold, emit, pollUnlocks } from './registry.js';
import { layerOf, cellAt, setCell, reachable, dirtVal, scroll } from './grid.js';
import { getTuning } from './tuning.js';

const NOEV = () => {};
const NONE = Object.freeze({});

// where the core's own work sits among the `step` hooks
export const STEP_QUEUE = 500, STEP_SCROLL = 900;
export const MAX_SITE_DEPTH = 350;
export const MAX_LEGS = 10;

use({
  id: 'core',
  params: {
    powGrow: 1.25,                  // each pick or training level: hits x1.25
    maxDepth: MAX_SITE_DEPTH,
    maxLegs: MAX_LEGS,
    // The depth curves (core/grid.js): layer 1 and layer 2 here, the layers below in `grow`.
    hp0: 5, hpGrow: 1.12, hpGrow2: 1.12,
    val0: 1, valGrow: 1.10, valGrow2: 1.10,
    // layers 3 and 4, the Deep's four, then everything below (the last entry goes on for ever)
    grow: [
      { hp: 1.14, val: 1.10, step: 1.3 },  // 50 m: water
      { hp: 1.17, val: 1.10, step: 3 },    // 75 m: crystal
      { hp: 1.20, val: 1.10, step: 3 },   // 100 m: The Black
      { hp: 1.19, val: 1.10, step: 1.3 }, // 125 m: The Living Rock (was 1.20 / 2: a smaller cliff at the door, the same wall in all)
      { hp: 1.21, val: 1.10, step: 1.3 }, // 150 m: The Angry Layer (was 1.20 / 2: the same, spread over the rows)
      { hp: 1.16, val: 1.10, step: 1.2 }, // 175 m: The Hot Layer (was 1.15 / 1.5)
      { hp: 1.175, val: 1.10, step: 1.8 }, // 200 m (was 1.18 / 3 for all below: the level was 5 tries and 40 other digs, day 11)
      { hp: 1.175, val: 1.10, step: 2 },  // 225 m
      { hp: 1.175, val: 1.10, step: 3 },  // 250 m and below: the road ends about day 20 (was never reached in a month)
    ],
    buyPow: 0.55,                   // coins -> hits: log(powGrow) / log(1.5), the price growth of a pick level
    // Stars (starsAt in core/grid.js): what a floor is worth, small whole numbers; the sites feature pays shares of it
    starBase: 3, starGrow: 4.5,      // 3 Stars at starFrom metres, x4.5 for every 25 m deeper
    starFrom: 50, starWall: 20,     // a dig with no Stars reaches a wall this many times the wall at 50 m
    sight: 2,                       // how many blocks from open space you can see
  },
  legacy: { powGrow: 'powGrow', hp0: 'hp0', hpGrow: 'hpGrow', hpGrow2: 'hpGrow2', val0: 'val0', valGrow: 'valGrow', valGrow2: 'valGrow2' },
  state: {
    coins:     { init: () => 0 },
    total:     { init: () => 0 },
    top:       { init: () => 0, perSite: true },            // absolute row of rows[0]
    best:      { init: () => 0, perSite: true },            // deepest row ever opened
    rows:      { init: () => [], perSite: true },
    hits:      { init: () => 0 },
    relics:    { init: () => ({}) },                          // id -> level
    keystones: { init: () => ({ aquifer: 0, magma: 0, cog: 0, spore: 0, astral: 0 }), survives: ['site', 'land'] },
    queue:     { init: () => [], perSite: true, transient: true },   // delayed effects: { at, kind, r, c, ... }
    t:         { init: () => 0, perSite: true },
    seen:      { init: () => ({}), survives: ['site', 'land'] },     // first-time flags of the page and the tutorial
    unlocked:  { init: () => ({}), survives: ['site', 'land'] },     // content found so far (see unlocks())
    land:      { init: () => 'desert', survives: ['site'] },
    contract:  { init: () => null, perSite: true },         // id of the contract this site is dug under
    free:      { init: () => ({}), perSite: true },         // item id -> levels handed out free at the start of this site (see grantFree)
    savedAt:   { init: () => 0 },
    _pb:       { init: () => -1, transient: true },         // the depth the layer unlocks were last checked at
  },
  queue: {
    pop(s, q, ev) { if (cellAt(s, q.r, q.c)) breakCell(s, q.r, q.c, q.src, ev, { chain: q.chain, veinLeft: q.veinLeft }); },
    dmg(s, q, ev) { damage(s, q.r, q.c, q.dmg, q.src, ev, { chain: 1 }); },
  },
  hooks: {
    step: [{ at: STEP_QUEUE, fn: runQueue }, { at: STEP_SCROLL, fn: runScroll }],
  },
  firsts: {
    break: d => 'type:' + d.t,
    relic: d => ['relic:' + d.id, d.level >= 2 && `relic:${d.id}:${d.level}`],
    buy: d => ['shop:' + d.id, d.level >= 2 && `${d.id}:${d.level}`],
    newSite: (d, s) => 'site:' + s.site,
    tool: d => 'tool:' + d.id,
    contractDone: d => 'contract:' + d.id,
  },
  polls: [s => {
    if (s.best === s._pb) return null;
    s._pb = s.best;
    const L = Math.min(layerOf(s.best - 1), layersOf(s.land).length - 1), out = [];
    for (let i = 1; i <= L; i++) out.push('layer' + (i + 1));
    return out;
  }],
});

// ---------- numbers every feature can bend ----------

export const rel = (s, id) => s.relics[id] || 0;
export const coinMult = s => fold('coinMult', s, 1) * getTuning('coinDropMult', s, 1.0);
export const pickPower = s => fold('pickPower', s, getTuning('pickBase', s, 1)) * getTuning('pickMult', s, 1.0);
export const awardKeystone = (s, type, count = 1) => {
  if (s && s.keystones && s.keystones[type] !== undefined) {
    const rate = getTuning('keystoneDropRate', s, 1.0);
    const added = Math.max(1, Math.round(count * rate));
    s.keystones[type] += added;
  }
};
export const hasKeystone = (s, type) => !!(s && s.keystones && s.keystones[type]);
export const totalKeystones = s => (s && s.keystones ? Object.values(s.keystones).reduce((a, b) => a + b, 0) : 0);

export function addCoins(s, n, src) {
  s.coins += n; s.total += n;
  run('earned', s, n, src);
}
// later(s, delay, kind, q): a delayed effect; QUEUE[kind](s, q, ev) runs it when its time comes
export function later(s, delay, kind, q) { q.at = s.t + delay; q.kind = kind; s.queue.push(q); }

// ---------- hitting ----------

// Nothing reaches below a Big Rock that still stands: no blast, fire, thrown rock, line or pulse. The
// Rock is the wall of the pacing curve; a way round it is a way round the whole curve.
export function sealed(s, r) {
  for (let w = s.top; w < r; w++) { const x = cellAt(s, w, 0); if (x && BLOCKS[x.t].wall) return true; }
  return false;
}

// damage one block; returns true if it broke
export function damage(s, r, c, dmg, src, ev, info = NONE) {
  const cell = cellAt(s, r, c);
  if (!cell || sealed(s, r)) return false;
  const B = BLOCKS[cell.t];
  dmg = fold('damage', s, dmg, cell, src, info, r);
  if (B.damage) return B.damage(s, r, c, cell, dmg, src, ev, info);
  const hp0 = cell.hp;
  cell.hp -= dmg;
  if (cell.hp > 0) {
    emit(s, ev, 'hit', { r, c, t: cell.t, dmg, src, crit: info.crit, frac: cell.hp / cell.max });
    if (B.hit) B.hit(s, r, c, cell, dmg, src, ev, info);
    return false;
  }
  const shatter = info.shatter !== undefined ? info.shatter : (src === 'you' && dmg >= hp0);
  breakCell(s, r, c, src, ev, { ...info, shatter });
  return true;
}

export function breakCell(s, r, c, src, ev, info = NONE) {
  const cell = cellAt(s, r, c);
  if (!cell || sealed(s, r)) return;
  setCell(s, r, c, null);
  if (r + 1 > s.best) s.best = r + 1;
  const B = BLOCKS[cell.t];
  const b = { r, c, cell, t: cell.t, B, src, byHand: src === 'you', info, chain: info.chain || 0, coins: 0, data: null };
  run('breaking', s, b);
  if (B.val > 0) {
    let coins = dirtVal(r) * B.val * coinMult(s) * fold('blockPay', s, 1, b);
    coins = fold('breakCoins', s, coins, b);
    b.coins = coins = Math.max(1, Math.round(coins));
    addCoins(s, coins, src);
  }
  const d = { r, c, t: cell.t, coins: b.coins, src, chain: b.chain, seed: cell.s, shatter: !!info.shatter };
  if (b.data) Object.assign(d, b.data);
  emit(s, ev, 'break', d);
  if (B.broke) B.broke(s, b, ev);
  run('broke', s, b, ev);
}

// The player's swing at one block. Returns false if nothing could be hit there.
export function swing(s, r, c, ev = NOEV) {
  if (!reachable(s, r, c)) return false;
  if (!fold('canSwing', s, true, r, c)) return false;
  s.hits++;
  const sw = { r, c, B: BLOCKS[cellAt(s, r, c).t], dmg: fold('swingDmg', s, pickPower(s)), crit: false, twice: false };
  run('swing', s, sw);
  emit(s, ev, 'swing', { r, c, crit: sw.crit, twice: sw.twice });
  const hp0 = cellAt(s, r, c).hp;
  const power = pickPower(s);
  const isOverkill = power >= hp0;
  const broke = damage(s, r, c, sw.dmg, 'you', ev, { crit: sw.crit, shatter: isOverkill });
  const reach = fold('punch', s, 0);
  const okRatio = getTuning('overkillRatio', s, 0.5);
  if (reach > 0 && broke && !sw.B.wall && sw.dmg > hp0) {
    const carry = Math.min(sw.dmg - hp0, Math.max(1, power * okRatio));
    punch(s, r, c, reach, carry, ev);
  } else if (broke && !sw.B.wall && isOverkill && s.up && s.up.pick > 0) {
    const overkill = Math.min(power - hp0, Math.max(1, power * okRatio));
    if (overkill > 0) punch(s, r, c, 1, overkill, ev);
  }
  run('swung', s, sw, ev);
  return true;
}

// Punch-through: the strength a hit has left after it broke a block goes into the block below, then
// the one below that, for up to `reach` blocks (a mod: 1 = native 1-block overkill carry, Infinity = no limit). It stops at an
// empty cell, at a block it does not break, and at a wall (the Big Rock).
function punch(s, r, c, reach, left, ev) {
  let n = 0;
  const power = pickPower(s);
  const okRatio = getTuning('overkillRatio', s, 0.5);
  left = Math.min(left, Math.max(1, power * okRatio));

  for (let rr = r + 1; left > 0 && n < reach; rr++, n++) {
    const cell = cellAt(s, rr, c);
    if (!cell || BLOCKS[cell.t].wall) break;
    const hp = cell.hp;
    if (!damage(s, rr, c, left, 'you', ev, { chain: 1, punch: true, shatter: left >= hp })) { n++; break; }
    left -= hp;
  }
  if (n) emit(s, ev, 'punch', { r, c, n });
}

// ---------- time ----------

function runQueue(s, dt, ev) {
  if (!s.queue.length) return;
  const due = s.queue.filter(q => q.at <= s.t);
  if (!due.length) return;
  s.queue = s.queue.filter(q => q.at > s.t);
  for (const q of due) QUEUE[q.kind](s, q, ev);
}
function runScroll(s, dt, ev) {
  const n = scroll(s);
  if (n) { run('scrolled', s, n); emit(s, ev, 'scroll', { n }); }
}

export function step(s, dt, ev = NOEV) {
  s.t += dt;
  run('step', s, dt, ev);
  pollUnlocks(s, ev);
}

// ---------- shops ----------

export const itemLevel = (s, id) => s[SHOPS[ITEMS[id].shop].levels][id] || 0;
export const itemOpen = (s, id) => { const u = ITEMS[id]; return !u.open || !!u.open(s); };
// FREE LEVELS ARE A DISCOUNT. Anything that hands out levels of an item at the start of a site (the start kit, Warm Pick,
// the Camp's waiting Rafeeqs ...) goes through grantFree: the levels count for strength, but the price counts only the
// levels the player bought at this site, so the next purchase costs what the first one costs. `free` is per site.
export const itemFree = (s, id) => (s.free && s.free[id]) || 0;
// give the item `n` free levels (the larger grant wins, as the kit and a perk may both give some); returns the levels added
export function grantFree(s, id, n) {
  const u = ITEMS[id];
  if (!u) return 0;
  if (!s.free) s.free = {};
  n = Math.min(Math.floor(n), u.max === undefined ? Infinity : u.max);
  const have = s.free[id] || 0;
  if (!(n > have)) return 0;
  const lv = SHOPS[u.shop].levels;
  s[lv][id] = (s[lv][id] || 0) + (n - have);
  s.free[id] = n;
  return n - have;
}
export function upgradeCost(s, id) {
  const u = ITEMS[id], have = itemLevel(s, id), fr = itemFree(s, id);
  if (have < fr) return 0;              // below the free mark (a contract took levels away): getting them back is free, and selling them back pays nothing
  const lv = have - fr;
  return u.cost ? u.cost(s, lv) : Math.ceil(u.base * Math.pow(u.grow, lv));
}
export function canBuy(s, id) {
  const u = ITEMS[id];
  return itemOpen(s, id) && (u.max === undefined || itemLevel(s, id) < u.max) && s[SHOPS[u.shop].wallet] >= upgradeCost(s, id);
}
export function buy(s, id, ev = NOEV) {
  if (!ITEMS[id] || !canBuy(s, id)) return false;
  const u = ITEMS[id], sh = SHOPS[u.shop];
  s[sh.wallet] -= upgradeCost(s, id);
  const level = ++s[sh.levels][id];
  if (u.bought) u.bought(s, level, ev);
  emit(s, ev, 'buy', { id, level, shop: u.shop });
  return true;
}

// ---------- tools ----------

export const toolOpen = (s, id) => { const T = TOOLS[id]; return !!T && (!T.open || !!T.open(s)); };
export const canUseTool = (s, id, r, c) => toolOpen(s, id) && (!TOOLS[id].can || !!TOOLS[id].can(s, r, c));
export function useTool(s, id, r, c, ev = NOEV) {
  if (!canUseTool(s, id, r, c)) return false;
  TOOLS[id].use(s, r, c, ev);
  emit(s, ev, 'tool', { id, r, c });
  return true;
}
