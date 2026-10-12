// Dig feature: Earned automation. Things the game does for the player, each WON by doing something
// (a count, a contract), never bought with coins and never given by waiting. Each is a small machine
// with a rule the player sets, so it is a choice and not just "on".
//   Auto-buy (four, each earned alone)  buyPick / buyCrew / buyTrain / buySieve. Buys the cheapest enabled item
//                                       you can afford while keeping N coins back.
//   Chest sorter                        an ordered wish list of relics. Takes the first wished relic a chest
//                                       offers; a chest that offers none of them is left for you (never re-rolled).
//   Tool timer                          per Forge tool: a rule. Fires by itself when the tool's charges are FULL
//                                       (the bar would be wasted) and the rule is true. The last charges stay yours.
//   Foreman's habit                     switches the crew's job by a rule: "while <condition> do A, else B".
// Earned by: pick bought 100 times / Rafeeq 12 / training 60 / chests opened by hand 50 / jobs changed by hand 30
// (all counted across New Sites), and two contracts we add to the board: Hands off (tool timer), Shop shut (sieve).
// Present vs away: every machine runs from the `step` hook, so it runs only while the player is here
// (a short background catch-up included). The away settlement never calls them: nothing buys, no chest is
// opened, so the return moment keeps its chests. Auto-buy skips the Rafeeq items while Rafeeq work is switched off.
// Enforced through: buy, takeRelic/rollDraft, useTool, foremanSet (their public functions; no core change).
// Events: autoWon {id}, autoPick {id, level}, autoHold {}, autoBought {id}, autoTool {id, r, c}, autoJob {id}, autoRefund {id}.
// State (all survive New Site and Land): autoOwn, autoOn, autoSet, autoStat; autoWait (the chests left for you) starts over.
import { use, emit, fold, RELICS, BLOCKS, PARAMS } from '../../core/registry.js';
import { COLS, VIEW_ROWS, cellAt, reachable, visibleMask } from '../../core/grid.js';
import { buy, canBuy, upgradeCost, itemOpen, itemLevel, useTool, canUseTool } from '../../core/rules.js';
import { rollDraft, takeRelic } from '../chest/rules.js';
import { foremanSet, foremanJobs } from '../foreman/rules.js';
import { bossInView } from '../boss/rules.js';
import { FORGE_TOOLS } from '../forge/rules.js';
import strings from './strings.js';

const p = {
  need: { buyPick: 100, buyCrew: 12, buyTrain: 60, sorter: 50, habit: 30 },   // what earns each, counted by hand
  keepSteps: [0, 25, 100, 500, 2500, 10000, 50000],   // the choices for "keep N coins"
  wishMax: 6,           // relics on the sorter's list
  look: 0.4,            // seconds between two looks of the tool timer and the habit (a polling rate, not a gate)
  habitHold: 3,         // looks the condition must stay the same before the habit changes the job
  clusterN: 3,          // dynamite 'cluster': treasure (ore, TNT, chests) in the blast
  clusterRad: 2,
  columnOre: 2,         // drill 'column': ore in the column the drill would bore
  magOre: 3,            // magnet 'ore3'
  handMult: 0.25,       // Hands off: what the pick does
  shopDepth: 25, handDepth: 25,
  botContracts: true,   // the sim player also tries the two contracts of this feature
};

export const AUTOS = [
  { id: 'buyPick', item: 'pick', stat: 'pick' },
  { id: 'buyCrew', item: 'crew', stat: 'crew' },
  { id: 'buyTrain', item: 'crewPow', stat: 'crewPow' },
  { id: 'buySieve', item: 'luck', contract: 'shopShut' },
  { id: 'sorter', stat: 'hand' },
  { id: 'timer', contract: 'handsOff' },
  { id: 'habit', stat: 'jobs' },
];
const BUYS = AUTOS.filter(a => a.item);
export const autoBuyItems = () => BUYS.map(a => a.item);
// rules a player can choose
export const AUTO_TIMER = { drill: ['column', 'rock'], dynamite: ['crack', 'cluster'], magnet: ['ore3', 'gold'] };
export const AUTO_CONDS = ['ore', 'rock', 'chest'];

export const autoOwned = (s, id) => !!s.autoOwn[id];
export function autoProgress(s, id) {
  const A = AUTOS.find(a => a.id === id);
  if (A.contract) return { contract: A.contract, now: s.contractsWon[A.contract] ? 1 : 0, of: 1 };
  return { stat: A.stat, now: Math.min(s.autoStat[A.stat], p.need[id]), of: p.need[id] };
}
const isOn = (s, id) => !!(s.autoOwn[id] && s.autoOn[id]);

// ---------- setters (the page calls these) ----------
export function autoToggle(s, id, on) {
  if (!autoOwned(s, id)) return false;
  s.autoOn[id] = on === undefined ? !s.autoOn[id] : !!on;
  return true;
}
export function autoKeep(s, n) { if (!p.keepSteps.includes(n)) return false; s.autoSet.keep = n; return true; }
export function autoWishAdd(s, id) {
  const w = s.autoSet.wish;
  if (!RELICS[id] || w.includes(id) || w.length >= p.wishMax) return false;
  w.push(id); return true;
}
export function autoWishMove(s, id, d) {
  const w = s.autoSet.wish, i = w.indexOf(id), j = i + d;
  if (i < 0 || j < 0 || j >= w.length) return false;
  [w[i], w[j]] = [w[j], w[i]]; return true;
}
export function autoWishDrop(s, id) { const w = s.autoSet.wish, i = w.indexOf(id); if (i < 0) return false; w.splice(i, 1); return true; }
export function autoTimerSet(s, tool, rule) {
  if (!AUTO_TIMER[tool] || !(rule === 'off' || AUTO_TIMER[tool].includes(rule))) return false;
  s.autoSet.timer[tool] = rule; return true;
}
export function autoHabitSet(s, key, v) {
  const okCond = key === 'cond' && AUTO_CONDS.includes(v);
  const okJob = (key === 'a' || key === 'b') && foremanJobs.includes(v);
  if (!okCond && !okJob) return false;
  s.autoSet.habit[key] = v; s.autoRun.applied = '';
  return true;
}

// ---------- counting what the player does by hand ----------
function count(s, key) { if (!s._autoDo && s.autoStat[key] !== undefined) s.autoStat[key]++; }
function countJob(s, id) {
  if (!s._autoDo && s.autoStat.pickJob !== id) s.autoStat.jobs++;
  s.autoStat.pickJob = id;
}
function countHand(s) {
  const st = s.autoStat;
  if (st.seen > s.chestsOpened) st.seen = s.chestsOpened;          // a New Site starts that count again
  if (s.chestsOpened > st.seen) { st.hand += s.chestsOpened - st.seen; st.seen = s.chestsOpened; }
  if (s.autoWait > s.chests) s.autoWait = s.chests;
}

// ---------- auto-buy ----------
function autoBuying(s, ev) {
  const keep = s.autoSet.keep;
  let best = null, bc = Infinity;
  for (const A of BUYS) {
    if (!isOn(s, A.id) || !itemOpen(s, A.item) || !canBuy(s, A.item)) continue;
    if ((A.item === 'crew' || A.item === 'crewPow') && fold('crewPower', s, 1) <= 0) continue;
    const c = upgradeCost(s, A.item);
    if (s.coins - c < keep || c >= bc) continue;
    best = A; bc = c;
  }
  if (!best) return;
  s._autoDo = true;
  try { if (buy(s, best.item, ev)) emit(s, ev, 'autoBought', { id: best.item }); } finally { s._autoDo = false; }
}

// ---------- the chest sorter ----------
function sorting(s, ev) {
  if (s.chests <= s.autoWait) return;               // what is left is yours
  const wish = s.autoSet.wish;
  if (!wish.length) { s.autoWait = s.chests; return; }
  const offer = rollDraft(s);
  const got = wish.find(id => offer.includes(id));
  if (got) {
    s._autoDo = true;
    try { takeRelic(s, got, ev); } finally { s._autoDo = false; }
    s.autoStat.seen = s.chestsOpened;
    emit(s, ev, 'autoPick', { id: got, level: s.relics[got] });
  } else {
    s.autoWait = s.chests;                          // judged once; the player opens it and sees their own cards
    emit(s, ev, 'autoHold', {});
  }
}

// ---------- what the timer and the habit look at ----------
const free = (s, r, c) => !!cellAt(s, r, c) && reachable(s, r, c);
function sight(s, f) {                              // is there a block we can see that satisfies f ?
  const m = visibleMask(s);
  for (let i = 0; i < VIEW_ROWS; i++) for (let c = 0; c < COLS; c++) {
    const x = s.rows[i][c];
    if (x && m[i][c] && f(BLOCKS[x.t], x)) return true;
  }
  return false;
}
const valued = B => B.ore || B.chain || B.id === 'chest';
function crackSpot(s) {
  const b = bossInView(s);
  return b && b.hp > 0 && free(s, b.row, b.weak) ? [b.row, b.weak] : null;
}
function around(s, r, c, rad, f, mask) {
  rad = Math.floor(rad);
  let n = 0;
  for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
    const i = r + dr - s.top;
    if (i < 0 || i >= VIEW_ROWS || c + dc < 0 || c + dc >= COLS) continue;
    const x = s.rows[i][c + dc];
    if (x && mask[i][c + dc] && f(BLOCKS[x.t], x)) n++;
  }
  return n;
}
// the place a tool would be used for a rule, or null
export function autoSpot(s, tool, rule) {
  if (rule === 'rock' || rule === 'crack') return crackSpot(s);
  const m = visibleMask(s);
  let best = null, bs = 0;
  const need = rule === 'cluster' ? p.clusterN : rule === 'ore3' ? p.magOre : rule === 'gold' ? 1 : p.columnOre;
  const rad = rule === 'cluster' ? p.clusterRad : PARAMS.forge.magRad;
  for (let i = 0; i < VIEW_ROWS - 1; i++) for (let c = 0; c < COLS; c++) {
    const r = s.top + i;
    if (!free(s, r, c)) continue;
    let sc = 0;
    if (rule === 'cluster') sc = around(s, r, c, rad, valued, m);
    else if (rule === 'ore3') sc = around(s, r, c, rad, B => B.ore, m);
    else if (rule === 'gold') sc = around(s, r, c, rad, (B, x) => x.t === 'gold' || x.t === 'gem', m);
    else for (let k = 0; k < PARAMS.forge.drillDepth; k++) { const y = s.rows[i + k] && s.rows[i + k][c]; if (y && m[i + k][c] && BLOCKS[y.t].ore) sc++; }
    if (sc >= need && sc > bs) { bs = sc; best = [r, c]; }
  }
  return best;
}

function timing(s, ev) {
  for (const tool of FORGE_TOOLS) {
    const rule = s.autoSet.timer[tool];
    if (!rule || rule === 'off' || s.toolCh[tool] < PARAMS.forge.cap) continue;   // only a full tool: the bar would be wasted
    const at = autoSpot(s, tool, rule);
    if (!at || !canUseTool(s, tool, at[0], at[1])) continue;
    s._autoDo = true;
    try { if (useTool(s, tool, at[0], at[1], ev)) emit(s, ev, 'autoTool', { id: tool, r: at[0], c: at[1] }); } finally { s._autoDo = false; }
  }
}

function condTrue(s, cond) {
  if (cond === 'rock') return !!bossInView(s);
  if (cond === 'chest') return sight(s, (B, x) => x.t === 'chest');
  return sight(s, B => B.notice && !B.chain);
}
function habit(s, ev) {
  const h = s.autoSet.habit, run = s.autoRun;
  const want = condTrue(s, h.cond) ? h.a : h.b;
  if (want !== run.want) { run.want = want; run.hold = 0; } else run.hold++;
  if (run.hold < p.habitHold || run.applied === want) return;
  run.applied = want;
  if (s.crewJob === want) return;
  s._autoDo = true;
  try { if (foremanSet(s, want, ev)) emit(s, ev, 'autoJob', { id: want }); } finally { s._autoDo = false; }
}

// ---------- winning a machine ----------
function earn(s, ev) {
  for (const A of AUTOS) {
    if (s.autoOwn[A.id]) continue;
    const g = autoProgress(s, A.id);
    if (g.now >= g.of) { s.autoOwn[A.id] = 1; emit(s, ev, 'autoWon', { id: A.id }); }
  }
}

export const autos = use({
  id: 'autos',
  params: p,
  strings,
  state: {
    autoOwn:  { init: () => ({}), survives: ['site', 'land'] },
    autoOn:   { init: () => ({}), survives: ['site', 'land'] },
    autoSet:  { init: () => ({ keep: 0, wish: [], timer: { drill: 'off', dynamite: 'off', magnet: 'off' }, habit: { cond: 'ore', a: 'ore', b: 'down' } }), survives: ['site', 'land'] },
    autoStat: { init: () => ({ pick: 0, crew: 0, crewPow: 0, luck: 0, hand: 0, seen: 0, jobs: 0, pickJob: '' }), survives: ['site', 'land'] },
    autoWait: { init: () => 0 },
    autoBase: { init: () => ({}), perSite: true },
    autoRun:  { init: () => ({ look: 0, want: '', hold: 0, applied: '' }), transient: true },
    _autoDo:  { init: () => false, transient: true },
  },
  contracts: {
    // Hands off: your pick does a quarter, you start with every tool full. Prize: the tool timer.
    handsOff: { at: 50, tier: 2, site: 'gold', goal: s => ({ kind: 'depth', now: Math.min(s.best, p.handDepth), of: p.handDepth }),
      open: s => !!s.forgeOn && itemLevel(s, 'drill') > 0,
      mods: { pickPower: v => v * p.handMult },
      start(s) { for (const id of FORGE_TOOLS) if (itemLevel(s, id) > 0) s.toolCh[id] = PARAMS.forge.cap; } },
    // Shop shut: nothing in the coin shop can be bought here (a buy is handed back). Prize: the Lucky Sieve auto-buy.
    shopShut: { at: 15, tier: 1, site: 'dunes', goal: s => ({ kind: 'depth', now: Math.min(s.best, p.shopDepth), of: p.shopDepth }),
      start(s) { s.autoBase = { ...s.up }; },
      hooks: { step(s, dt, ev) {
        for (const id of autoBuyItems()) {
          let back = false;
          while ((s.up[id] || 0) > (s.autoBase[id] || 0)) {
            s.up[id]--; s.coins += upgradeCost(s, id);
            if (id === 'crew') s.diggers.pop();
            back = true;
          }
          if (back) emit(s, ev, 'autoRefund', { id });
        }
      } } },
  },
  hooks: {
    step: { at: 800, fn(s, dt, ev) {
      countHand(s);
      earn(s, ev);
      if (s.contract !== 'shopShut' && BUYS.some(a => isOn(s, a.id))) autoBuying(s, ev);
      if (isOn(s, 'sorter')) sorting(s, ev);
      const run = s.autoRun;
      run.look += dt;
      if (run.look >= p.look) {
        run.look = 0;
        if (isOn(s, 'timer')) timing(s, ev);
        if (isOn(s, 'habit') && s.foremanHere) habit(s, ev);
      }
    } },
  },
  unlocks: AUTOS.map(a => ({ id: 'auto:' + a.id, group: 'automation' })),
  firsts: {
    autoWon: d => 'auto:' + d.id,
    buy: (d, s) => { if (d.shop === 'coin') count(s, d.id); return null; },
    job: (d, s) => { countJob(s, d.id); return null; },
  },
  // The scripted player turns on what it has earned. It is already a perfect buyer, so the sim should barely
  // move. Its sorter wishes for relics it does not hold yet; its timer uses the Big Rock rules and the magnet;
  // its habit keeps the job it already uses (ore), so it does not fight the Foreman bot.
  bot: { shop(s) {
    const W = PARAMS.contracts && PARAMS.contracts.botWill;
    if (W && p.botContracts) for (const id of ['shopShut', 'handsOff']) if (!W.includes(id)) W.push(id);
    for (const A of AUTOS) if (s.autoOwn[A.id] && s.autoOn[A.id] === undefined) s.autoOn[A.id] = true;
    if (s.autoOwn.sorter) {
      const ids = Object.keys(RELICS).sort((a, b) => ((RELICS[a].at || 0) - (RELICS[b].at || 0)) || (a < b ? -1 : 1));
      s.autoSet.wish = ids.filter(id => !(s.relics[id] > 0)).concat(ids.filter(id => s.relics[id] > 0)).slice(0, p.wishMax);
    }
    if (s.autoOwn.timer) s.autoSet.timer = { drill: 'rock', dynamite: 'crack', magnet: 'ore3' };
    if (s.autoOwn.habit) { s.autoSet.habit.a = 'ore'; s.autoSet.habit.b = 'ore'; }
    return 0;
  } },
});
