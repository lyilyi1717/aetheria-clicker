// Dig feature: contracts. A contract is a New Site dug under a hard rule, for a prize.
// The rule is enforced by hooks and mods that are in force only while `s.contract` is set, so the
// player cannot cheat it by being careful. The prize is kept for ever (a small bend of the rules,
// a cosmetic, Stars). A won contract is stamped on the board; leaving one is free and loses nothing
// but the attempt (the rule just lifts, the dig goes on).
//
// HOW THE ROAD USES CONTRACTS (proto/features/sites). Every site version has a Hard medal and its hard rule is one of these
// contracts (`hardOf` in the sites feature: one per site, a deeper floor takes the next). A card of the road's deal that
// carries a hard rule starts the dig under that contract; winning it is the third medal (`siteMedal`) and pays its medal Stars.
// So the board is no longer the only place a contract is found. The board stays for old saves and for later (it opens after
// `openFinished` finished site versions (or 99 New Sites, or an old save that had it open) and keeps its tiers); a contract taken from it is a site at its base floor with the Hard medal on it.
// A contract's own Stars (`tierStars`) are now 1, 1, 2 (they were 2, 3, 5): the medal pays the rest.
//
// ADDING A CONTRACT FROM ANOTHER FEATURE (the `autos` package does this for its prizes). In your own
// rules.js, in your use({...}):
//
//   contracts: { autoBuyer: {
//     tier: 2,                       // 1..3 (the board opens tier 2 after 2 wins in tier 1, tier 3 after 3 in tier 2)
//     site: 'gold',                  // where it is dug (falls back to an open site if that one is closed)
//     goal: s => ({ now: Math.min(s.best, 40), of: 40 }),   // done when now >= of. Add `kind: 'depth' | 'rocks'` for the stock wording
//     goalText: (s, g) => t('my_goal', { now: g.now, of: g.of }),   // optional, replaces the stock wording
//     mods: { ... }, hooks: { step(s, dt, ev) {...} },      // the rule: in force only during this contract (plain functions)
//     start(s) {},  end(s) {},       // optional: when the dig starts / when the contract ends (won or left)
//     stars: 3,                      // optional, Stars for the first win (else params.stars[id] or params.tierStars[tier])
//     cosmetic: 'gold', slot: 'skin',// optional, a pick skin ('skin') or a Rafeeq hat ('hat'); the page draws it
//     prize(s, ev) { s.autoBuy = true; },   // optional, runs once on the first win
//   } },
//   strings: c_autoBuyer (name), c_autoBuyer_d (the rule, one plain line), c_autoBuyer_p (the prize, one line)
//   icon (page side): addIcons({ c_autoBuyer: badge(...) })  (a plain medal is drawn if you give none)
//
// The board lists every contract in CONTRACTS that has a `tier`, in (tier, at) order.
// State: contractsWon { id: 1 } and contractLook { skin, hat } survive New Site and Land.
// Events: contractsOpen, contractTier {tier}, contractStart {id}, contractDone {id, stars, tier, cosmetic},
// contractLeft {id}, contractNote {id, key}, sandFill, glassBreak, feed {r, c, to, col, w}.
import { use, CONTRACTS, SITES, emit } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { COLS, KEEP_ROWS, genRow, cellAt } from '../../core/grid.js';
import { damage, upgradeCost, pickPower } from '../../core/rules.js';
import { newSite, canNewSite, siteOpen, siteMedal, roadFinished } from '../sites/rules.js';
import { bossInView } from '../boss/rules.js';
import strings from './strings.js';

const p = {
  openSites: 99,                         // the board opens after this many New Sites (the road opens it long before: openFinished)
  openFinished: 8,                       // or after this many versions of sites are finished (the road); an old save that had 14 New Sites keeps it open
  tierNeed: [0, 0, 2, 3],                // wins in the tier below that open tier 2 and tier 3
  tierStars: [0, 1, 1, 2],               // Stars for a first win, by tier
  stars: {},                             // or one contract's own number
  // the goals
  bareDepth: 40, darkDepth: 30, riseDepth: 20, tntDepth: 24, glassDepth: 30, oneDepth: 40,
  lazyDepth: 30, feedRocks: 1, dryRocks: 2, blindDepth: 50,
  // the rules
  darkSight: 1,                          // blocks you see around open space in the dark
  riseBreaks: 100,                       // blocks you may break before the sand refills the hole
  tntGap: 2, tntStart: 4,                // a TNT every 2nd row, the next one a column left, right or the same
  glassEvery: 30,                        // every 30th hit the pick falls back to level 1
  lazyCoins: 400,                        // what the rich Rafeeq-owner starts with
  feedUnit: 6,                           // in the contract: your hits that one copper thrown at the Big Rock takes (silver 2x, gold 4x, gem 8x)
  feedRows: 8,                           // the rows above a Big Rock that are sure to hold one silver, so the contract can always be won
  oreWeight: { copper: 1, silver: 2, gold: 4, gem: 8 },
  // the prizes
  headRows: 2,                           // rising: every site starts this many rows already dug
  feedBend: 2,                           // feedRock prize: your hits that one copper takes off a Big Rock in view (silver 2x, gold 4x, gem 8x)
  firstDraftExtra: 1,                    // oneRelic: the first chest of a site shows this many more cards
  rockChests: 1,                         // dry: extra chests from every Big Rock
  // the sim's scripted player
  botGiveUp: 900,                        // attended seconds on one attempt before it leaves
  botWill: ['bare', 'dark', 'rising', 'tntOnly', 'oneRelic', 'richLazy', 'feedRock', 'dry', 'blindAlone', 'glass'],
};

// ---------- the board ----------

export const contractList = () => Object.values(CONTRACTS).filter(c => c.tier).sort((a, b) => (a.tier - b.tier) || (a.at - b.at) || (a.id < b.id ? -1 : 1));
export const contractTiers = () => Math.max(1, ...contractList().map(c => c.tier));
export const contractsOpen = s => s.sites >= p.openSites || roadFinished(s) >= p.openFinished || !!s.seen.legacyBoard || Object.keys(s.contractsWon).length > 0;
export const contractWins = (s, tier) => contractList().filter(c => c.tier === tier && s.contractsWon[c.id]).length;
export const tierNeed = tier => (p.tierNeed[tier] === undefined ? 2 : p.tierNeed[tier]);
export function tierOpen(s, tier) {
  if (!contractsOpen(s)) return false;
  return tier <= 1 || contractWins(s, tier - 1) >= tierNeed(tier);
}
// 'won' | 'open' | 'locked'
export function contractState(s, id) {
  const C = CONTRACTS[id];
  if (!C) return 'locked';
  if (s.contractsWon[id]) return 'won';
  return tierOpen(s, C.tier) && (!C.open || C.open(s)) ? 'open' : 'locked';
}
export const contractSite = (s, C) => (SITES[C.site] && siteOpen(s, C.site) ? C.site : Object.keys(SITES).find(id => siteOpen(s, id)));
export const canTake = (s, id) => contractState(s, id) === 'open' && canNewSite(s);
export const contractStars = C => (p.stars[C.id] !== undefined ? p.stars[C.id] : C.stars !== undefined ? C.stars : p.tierStars[C.tier] || 0);

// the contract in force: { id, now, of, kind, done } or null
export function contractGoal(s) {
  const C = s.contract && CONTRACTS[s.contract];
  if (!C || !C.goal) return null;
  const g = C.goal(s);
  return { kind: C.kind || 'count', ...g, id: C.id, done: g.now >= g.of };
}

export function startContract(s, id, ev = () => {}) {
  const C = CONTRACTS[id];
  if (!C || !canTake(s, id)) return false;
  if (!newSite(s, contractSite(s, C), ev, { contract: id })) return false;
  emit(s, ev, 'contractStart', { id });
  return true;
}

function end(s) { const C = CONTRACTS[s.contract]; if (C && C.end) C.end(s); s.contract = null; }
export function leaveContract(s, ev = () => {}) {
  if (!s.contract) return false;
  const id = s.contract;
  end(s);
  emit(s, ev, 'contractLeft', { id });
  return true;
}

// ---------- cosmetics ----------

export const cosmetics = () => { const o = {}; for (const c of contractList()) if (c.cosmetic) o[c.cosmetic] = { id: c.cosmetic, slot: c.slot || 'skin', from: c.id }; return o; };
export const ownsCosmetic = (s, id) => { const k = cosmetics()[id]; return !!k && !!s.contractsWon[k.from]; };
export function equip(s, slot, id) {
  if (id && !(ownsCosmetic(s, id) && cosmetics()[id].slot === slot)) return false;
  s.contractLook[slot] = id || '';
  return true;
}

function win(s, ev) {
  const id = s.contract, C = CONTRACTS[id];
  const first = !s.contractsWon[id];
  s.contractsWon[id] = 1;
  const stars = first ? contractStars(C) : 0;
  s.stars += stars;
  if (first && C.cosmetic) s.contractLook[C.slot || 'skin'] = C.cosmetic;
  if (first && C.prize) C.prize(s, ev);
  end(s);
  s.contractFree = true;                                           // a won contract: the next site (or contract) may start now
  if (s.run && s.run.hard === id) siteMedal(s, 'hard', ev);        // the site's third medal (sites feature)
  emit(s, ev, 'contractDone', { id, stars, tier: C.tier, cosmetic: C.cosmetic || null });
}

// the board opens, and later tiers open: told once each
let topTier = 0;                                                 // the contracts are all registered by the first step: asked once
function announce(s, ev) {
  topTier = topTier || contractTiers();
  // everything told already (this runs on every step: no list is built once it is)
  if (s.seen.contractsOpen && (topTier < 2 || s.seen['contractTier' + topTier])) return;
  if (!contractsOpen(s)) return;
  if (!s.seen.contractsOpen) { s.seen.contractsOpen = true; emit(s, ev, 'contractsOpen', {}); }
  for (let t = 2; t <= topTier; t++) {
    if (tierOpen(s, t) && !s.seen['contractTier' + t]) { s.seen['contractTier' + t] = true; emit(s, ev, 'contractTier', { tier: t }); }
  }
}

// ---------- the rules of the contracts ----------

const depthGoal = key => s => ({ kind: 'depth', now: Math.min(s.best, p[key]), of: p[key] });
const rockGoal = key => s => ({ kind: 'rocks', now: Math.min(s.bossesDown, p[key]), of: p[key] });

// no Rafeeqs: whoever is hired is sent home and paid back, and Rafeeq work counts for nothing
const noCrew = {
  mods: { crewPower: () => 0, awayDps: () => 0 },
  step(s, dt, ev) {
    if (!s.up.crew && !s.up.crewPow && !s.diggers.length) return;
    while (s.up.crew > 0) { s.up.crew--; s.coins += upgradeCost(s, 'crew'); }
    while (s.up.crewPow > 0) { s.up.crewPow--; s.coins += upgradeCost(s, 'crewPow'); }
    s.diggers.length = 0;
    emit(s, ev, 'contractNote', { id: s.contract, key: 'refund' });
  },
};
const dark = { mods: { sight: () => p.darkSight } };

// ore breaks while a Big Rock is in view: the ore is thrown at the Rock
function feed(s, b, ev, hits) {
  if (!b.B.ore) return;
  const bo = bossInView(s);
  if (!bo || bo.hp <= 0) return;
  let col = -1;
  for (let c = 0; c < COLS && col < 0; c++) if (cellAt(s, bo.row, c)) col = c;
  if (col < 0) return;
  const w = p.oreWeight[b.t] || 1;
  emit(s, ev, 'feed', { r: b.r, c: b.c, to: bo.row, col, w });
  damage(s, bo.row, col, Math.max(1, Math.round(pickPower(s) * hits * w)), 'ore', ev, { feed: 1 });
}

// the sand refills the hole: the ground is dug fresh from the top (same site, same shop, same coins)
function refill(s, ev) {
  const run = s.contractRun;
  run.n = 0; run.refill = false; run.fills++;
  s.rows = []; s.top = 0; s.best = 0; s.boss = null; s.queue = [];
  for (let i = 0; i < KEEP_ROWS; i++) s.rows.push(genRow(s, i));
  for (const d of s.diggers) { d.tr = -1; d.tc = -1; d.r = 0; }
  emit(s, ev, 'sandFill', { n: run.fills });
}

const touchesAir = (s, r, c) => r === s.top || cellAt(s, r - 1, c) === null || cellAt(s, r + 1, c) === null || cellAt(s, r, c - 1) === null || cellAt(s, r, c + 1) === null;

// Rafeeqs go where the pick points (the page keeps `contractAim`); with no aim, the nearest block from the top
function aimed(s, d) {
  const aim = s.contractAim;
  let best = null, bestScore = 1e9;
  for (let i = 0; i < s.rows.length; i++) for (let c = 0; c < COLS; c++) {
    const r = s.top + i;
    if (!s.rows[i][c] || !touchesAir(s, r, c)) continue;
    let score = aim ? Math.abs(r - aim[0]) * 2 + Math.abs(c - aim[1]) : i * 12 + Math.abs(c - d.c);
    if (s.diggers.some(o => o !== d && o.tr === r && o.tc === c)) score += 30;
    if (score < bestScore) { bestScore = score; best = [r, c]; }
  }
  return best;
}

export const contracts = use({
  id: 'contracts',
  params: p,
  strings,
  state: {
    contractsWon: { init: () => ({}), survives: ['site', 'land'] },
    contractLook: { init: () => ({ skin: '', hat: '' }), survives: ['site', 'land'] },
    contractRun:  { init: () => ({ n: 0, col: -1, fills: 0, refill: false }), perSite: true },
    contractAim:  { init: () => null, transient: true },
    contractFree: { init: () => false, perSite: true },             // a contract was won at this site: you may move on at once
  },
  policies: { aimed },
  contracts: {
    // ---- tier 1: you learn that a rule is a plan ----
    bare: { at: 10, tier: 1, site: 'dunes', cosmetic: 'cap', slot: 'hat', goal: depthGoal('bareDepth'),
      mods: noCrew.mods, hooks: { step: noCrew.step } },
    dark: { at: 20, tier: 1, site: 'gold', goal: depthGoal('darkDepth'), ...dark },
    rising: { at: 30, tier: 1, site: 'dunes', goal: depthGoal('riseDepth'),
      hooks: {
        broke(s) { const run = s.contractRun; if (++run.n >= p.riseBreaks) run.refill = true; },
        step(s, dt, ev) { if (s.contractRun.refill) refill(s, ev); },
      } },
    // ---- tier 2: the rule bites ----
    tntOnly: { at: 10, tier: 2, site: 'boom', cosmetic: 'gold', slot: 'skin', goal: depthGoal('tntDepth'),
      mods: noCrew.mods,
      hooks: {
        step: noCrew.step,
        swing(s, sw) { if (sw.B.id !== 'tnt') sw.dmg = 0; },       // spill, echo and boom all use sw.dmg, so they are nothing too
        row(s, ctx) {
          if (ctx.r % p.tntGap || ctx.r > p.tntDepth) return;
          const run = s.contractRun;
          const c = run.col < 0 ? p.tntStart : Math.max(0, Math.min(COLS - 1, run.col + Math.floor(rnd() * 3) - 1));
          ctx.set(c, 'tnt'); run.col = c;                          // a trail of TNT you can follow down
        },
      } },
    glass: { at: 20, tier: 2, site: 'dunes', cosmetic: 'glass', slot: 'skin', goal: depthGoal('glassDepth'),
      hooks: { swung(s, sw, ev) {
        if (s.hits % p.glassEvery) return;
        s.up.pick = 0;
        emit(s, ev, 'glassBreak', { r: sw.r, c: sw.c });
      } } },
    oneRelic: { at: 30, tier: 2, site: 'bones', goal: depthGoal('oneDepth'),
      mods: { draftPool: (pool, s) => { const held = Object.keys(s.relics).find(id => s.relics[id] > 0); return held ? pool.filter(id => id === held) : pool; } } },
    richLazy: { at: 40, tier: 2, site: 'gold', goal: depthGoal('lazyDepth'),
      mods: { canSwing: () => false },
      hooks: { step(s) { s.crewJob = 'aimed'; } },
      start(s) { s.coins += p.lazyCoins; s.total += p.lazyCoins; s.crewJob = 'aimed'; },
      end(s) { s.crewJob = 'nearest'; } },
    // ---- tier 3: a whole way of playing ----
    feedRock: { at: 10, tier: 3, site: 'gold', goal: rockGoal('feedRocks'),
      mods: { damage: (v, s, cell, src, info) => (cell.t === 'boss' && !(info && info.feed) ? 0 : v) },
      hooks: {
        broke(s, b, ev) { feed(s, b, ev, p.feedUnit); },
        row(s, ctx) { const m = ctx.r % 25; if (ctx.r > 0 && m >= 25 - p.feedRows && m < 25) ctx.put('silver'); },
      } },
    dry: { at: 20, tier: 3, site: 'bones', goal: rockGoal('dryRocks'),
      mods: { chestChance: () => 0 } },
    blindAlone: { at: 30, tier: 3, site: 'dunes', cosmetic: 'crown', slot: 'hat', goal: depthGoal('blindDepth'),
      mods: { ...noCrew.mods, ...dark.mods }, hooks: { step: noCrew.step } },
  },
  hooks: {
    step: { at: 700, fn(s, dt, ev) {
      announce(s, ev);
      const g = contractGoal(s);
      if (g && g.done) win(s, ev);
    } },
    // the prizes that stay: small bends of the rules
    mask(s, m) {                                                 // dark: TNT shows through the dark
      if (!s.contractsWon.dark) return;
      for (let i = 0; i < s.rows.length; i++) for (let c = 0; c < COLS; c++) { const x = s.rows[i][c]; if (x && x.t === 'tnt') m[i][c] = true; }
    },
    row(s, ctx) {                                                // rising: a head start
      if (s.contractsWon.rising && ctx.r < p.headRows) for (let c = 0; c < COLS; c++) ctx.row[c] = null;
    },
    broke(s, b, ev) { if (s.contractsWon.feedRock && s.contract !== 'feedRock') feed(s, b, ev, p.feedBend); },
    bossDown(s) { if (s.contractsWon.dry) s.chests += p.rockChests; },
    reset(s, name) {
      const C = s.contract && CONTRACTS[s.contract];
      if (name === 'site' && C && C.start) C.start(s);
    },
  },
  mods: {
    draftCards: (v, s) => (s.contractsWon.oneRelic && s.chestsOpened === 0 ? v + p.firstDraftExtra : v),
  },
  unlocks: () => {
    const out = [{ id: 'contracts:open', group: 'contracts' }];
    for (let t = 2; t <= contractTiers(); t++) out.push({ id: 'contracts:tier' + t, group: 'contracts' });
    return out;
  },
  firsts: { contractsOpen: () => 'contracts:open', contractTier: d => 'contracts:tier' + d.tier },
  // The scripted player takes a contract when one is open, plays it with a small plan, and leaves it
  // if it takes too long (leaving is free). It reports to globalThis.digContractsLog if a sim set one.
  bot: { shop(s, api) {
    const { ev, ctx, trk } = api;
    if (!ctx || !trk) return 0;   // called outside the timeline sim (a test's bare api): nothing to plan with
    const log = (what, id) => { if (globalThis.digContractsLog) globalThis.digContractsLog({ what, id, best: s.best, boss: s.boss && +(s.boss.hp / s.boss.max).toFixed(2), down: s.bossesDown, real: trk.real, act: trk.act, hps: ctx.p.hps, ctx }); };
    ctx.cTried = ctx.cTried || {}; ctx.cOpen = ctx.cOpen || {}; ctx.cLogged = ctx.cLogged || {};
    if (contractsOpen(s)) for (let t = 1; t <= contractTiers(); t++) if (!ctx.cOpen[t] && tierOpen(s, t)) { ctx.cOpen[t] = 1; log('tier open', t); }
    if (s.contract) {
      const id = s.contract;
      ctx.noCrew = ['bare', 'rising', 'blindAlone', 'tntOnly'].includes(id);
      if (id === 'tntOnly') {                                    // look often, aim at the topmost barrel you can reach
        ctx.p.buyEvery = 1.5;
        let best = null;
        for (let i = 0; i < s.rows.length && !best; i++) for (let c = 0; c < COLS; c++) {
          const x = s.rows[i][c];
          if (x && x.t === 'tnt' && touchesAir(s, s.top + i, c)) { best = [s.top + i, c]; break; }
        }
        ctx.tg = best;
        if (best) ctx.col = best[1];
      }
      if (trk.act - ctx.cStart > p.botGiveUp) { leaveContract(s, ev); ctx.noCrew = false; ctx.p.buyEvery = ctx.cBuyEvery; log('left', id); }
      return 0;
    }
    if (ctx.cWas) {                                              // it ended: won, or just left
      for (const id of Object.keys(s.contractsWon)) if (!ctx.cLogged[id]) { ctx.cLogged[id] = 1; log('won', id); }
      ctx.noCrew = false; ctx.p.buyEvery = ctx.cBuyEvery; ctx.cWas = false;
    }
    if (!contractsOpen(s) || !canNewSite(s)) return 0;
    const next = contractList().find(c => contractState(s, c.id) === 'open' && p.botWill.includes(c.id) && !ctx.cTried[c.id]);
    if (!next) return 0;
    ctx.cBuyEvery = ctx.cBuyEvery || ctx.p.buyEvery;
    if (!startContract(s, next.id, ev)) return 0;
    ctx.cTried[next.id] = 1; ctx.cWas = true; ctx.cStart = trk.act;
    ctx.tg = null; ctx.busy = 4; ctx.col = 4; trk.lastTotal = s.total;
    log('start', next.id);
    return 1;
  } },
});
