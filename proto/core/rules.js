// Dig: the core rules. Damage and breaking, the player's swing, the step, shops and tools.
// Pure logic over one state object; no DOM, no audio. Everything that should be seen or heard is
// reported with emit(s, ev, kind, data). What each kind of block, relic, site or layer does lives in
// proto/features/ and plugs in through the hooks named here (the full list is in proto/README.md).
import { use, BLOCKS, ITEMS, SHOPS, TOOLS, QUEUE, layersOf, run, fold, emit, pollUnlocks } from './registry.js';
import { layerOf, cellAt, setCell, reachable, dirtVal, scroll } from './grid.js';

const NOEV = () => {};
const NONE = Object.freeze({});

// where the core's own work sits among the `step` hooks
export const STEP_QUEUE = 500, STEP_SCROLL = 900;

use({
  id: 'core',
  params: {
    powGrow: 1.25,                  // each pick or training level: hits x1.25
    // The depth curves (core/grid.js): layer 1 and layer 2 here, the layers below in `grow`.
    hp0: 5, hpGrow: 1.12, hpGrow2: 1.12,
    val0: 1, valGrow: 1.10, valGrow2: 1.10,
    // layers 3 and 4, the Deep's four, then everything below (the last entry goes on for ever)
    grow: [
      { hp: 1.14, val: 1.10, step: 1.3 },  // 50 m: water
      { hp: 1.17, val: 1.10, step: 3 },    // 75 m: crystal
      { hp: 1.20, val: 1.10, step: 3 },   // 100 m: The Black
      { hp: 1.20, val: 1.10, step: 2 },   // 125 m: The Living Rock
      { hp: 1.20, val: 1.10, step: 2 },  // 150 m: The Angry Layer
      { hp: 1.15, val: 1.10, step: 1.5 },  // 175 m: The Hot Layer (1.20 left the 200 m level a cliff of about 100 digs)
      { hp: 1.18, val: 1.10, step: 3 },   // 200 m and below (was 1.22 / 8: the Americas and Europe out of reach): nothing new yet
    ],
    buyPow: 0.55,                   // coins -> hits: log(powGrow) / log(1.5), the price growth of a pick level
    // Stars (starsAt in core/grid.js): what a floor is worth, small whole numbers; the sites feature pays shares of it
    starBase: 3, starGrow: 4.5,      // 3 Stars at starFrom metres, x4.5 for every 25 m deeper
    starFrom: 50, starWall: 20,     // a dig with no Stars reaches a wall this many times the wall at 50 m
    sight: 2,                       // how many blocks from open space you can see
  },
  legacy: { powGrow: 'powGrow', hp0: 'hp0', hpGrow: 'hpGrow', hpGrow2: 'hpGrow2', val0: 'val0', valGrow: 'valGrow', valGrow2: 'valGrow2' },
  state: {
    coins:    { init: () => 0 },
    total:    { init: () => 0 },
    top:      { init: () => 0, perSite: true },            // absolute row of rows[0]
    best:     { init: () => 0, perSite: true },            // deepest row ever opened
    rows:     { init: () => [], perSite: true },
    hits:     { init: () => 0 },
    relics:   { init: () => ({}) },                          // id -> level
    queue:    { init: () => [], perSite: true, transient: true },   // delayed effects: { at, kind, r, c, ... }
    t:        { init: () => 0, perSite: true },
    seen:     { init: () => ({}), survives: ['site', 'land'] },     // first-time flags of the page and the tutorial
    unlocked: { init: () => ({}), survives: ['site', 'land'] },     // content found so far (see unlocks())
    land:     { init: () => 'desert', survives: ['site'] },
    contract: { init: () => null, perSite: true },         // id of the contract this site is dug under
    savedAt:  { init: () => 0 },
    _pb:      { init: () => -1, transient: true },         // the depth the layer unlocks were last checked at
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
export const coinMult = s => fold('coinMult', s, 1);
export const pickPower = s => fold('pickPower', s, 1);

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
  cell.hp -= dmg;
  if (cell.hp > 0) {
    emit(s, ev, 'hit', { r, c, t: cell.t, dmg, src, crit: info.crit, frac: cell.hp / cell.max });
    if (B.hit) B.hit(s, r, c, cell, dmg, src, ev, info);
    return false;
  }
  breakCell(s, r, c, src, ev, info);
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
  const d = { r, c, t: cell.t, coins: b.coins, src, chain: b.chain, seed: cell.s };
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
  const broke = damage(s, r, c, sw.dmg, 'you', ev, { crit: sw.crit });
  if (broke && !sw.B.wall) punch(s, r, c, sw.dmg - hp0, ev);
  run('swung', s, sw, ev);
  return true;
}

// Punch-through: the strength a hit has left after it broke a block goes into the block below, then
// the one below that, for up to `punch` blocks (a mod: 0 = none, Infinity = no limit). It stops at an
// empty cell, at a block it does not break, and at a wall (the Big Rock).
function punch(s, r, c, left, ev) {
  const reach = fold('punch', s, 0);
  let n = 0;
  for (let rr = r + 1; left > 0 && n < reach; rr++, n++) {
    const cell = cellAt(s, rr, c);
    if (!cell || BLOCKS[cell.t].wall) break;
    const hp = cell.hp;
    if (!damage(s, rr, c, left, 'you', ev, { chain: 1, punch: true })) { n++; break; }
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
export function upgradeCost(s, id) {
  const u = ITEMS[id], lv = itemLevel(s, id);
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
