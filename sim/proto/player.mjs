// Dig prototype: the scripted player both sims share (dig-timeline.mjs, dig-month.mjs).
// It plays the real rules (proto/game.js) at a human pace: it swings, goes for what it sees, looks at
// the shop every few seconds, picks relic cards, uses every feature's own `bot` step, and moves to a
// New Site when the dig has stalled and the move pays (the policy is `wantsMove` below).
import * as G from '../../proto/game.js';

export const mulberry = G.mulberry;
export const reseed = n => G.setRng(mulberry(n));   // the rules and the player draw from the same stream
const rnd = G.rnd;

// ---------- content ----------
export const UNITS = G.unlocks().list;   // { id, cat: 'core' | 'grind', group }
export const N_ALL = UNITS.length, N_CORE = UNITS.filter(u => u.cat === 'core').length;
export const ALL_IDS = UNITS.map(u => u.id), CORE_IDS = UNITS.filter(u => u.cat === 'core').map(u => u.id);

// ---------- human profiles ----------
// hps: sustained hits per second (the game caps a held mouse at 6.7/s; hit-stop and slides cost the rest).
//      That is the pace of one pick at the first tempo; more picks and a faster beat scale it (`pace` below).
// lag: seconds lost per deliberate move to another block; notice: chance to spot and go for ore/chest/TNT after a break
// buyEvery: seconds between looks at the shop; react: seconds per purchase; relicT: seconds to read and pick a relic card
// weak: chance per swing to slide to the Big Rock's crack; clear: chance to clear the row above a Big Rock so the crack is reachable
// stall: attended seconds with no new metre before this player thinks about moving (see wantsMove)
export const PROFILES = {
  casual: { hps: 2.5, lag: 0.8, notice: 0.3, buyEvery: 15, react: 2.0, relicT: 6, weak: 0.04, clear: 0.1, stall: 75 },
  slow: { hps: 3.8, lag: 0.6, notice: 0.45, buyEvery: 10, react: 1.5, relicT: 4.5, weak: 0.08, clear: 0.2, stall: 60 },
  mid:  { hps: 5.0, lag: 0.35, notice: 0.6, buyEvery: 6, react: 1.0, relicT: 3.5, weak: 0.15, clear: 0.5, stall: 45 },
  fast: { hps: 6.2, lag: 0.2, notice: 0.8, buyEvery: 4, react: 0.7, relicT: 2.5, weak: 0.3, clear: 0.8, stall: 35 },
};
// The hand follows the picks' bar: its swings a second from the number of picks and the tempo,
// as a share of the old held mouse (1 with one pick at the first tempo). See proto/features/picks.
const pace = s => (G.picksPace ? G.picksPace(s) : 1);
const VAL = new Set(Object.keys(G.BLOCKS).filter(t => G.BLOCKS[t].notice));   // what a player goes for when he sees it
const PRIO = ['boom', 'vein', 'deep', 'wide', 'lucky', 'heavy', 'shiny', 'streak', 'echo', 'karak', 'nose', 'bang', 'lamp'];
export const DEPTHS = [10, 25, 30, 50, 60, 75, 100, 125, 150, 175, 200, 225, 250];

// ---------- the move policy (stated in docs/dig-pacing.md) ----------
// A site has a bottom (the Gate, proto/features/sites). The scripted player:
//   1. finishes the site if it can: it digs on until the Gate breaks;
//   2. moves on at once when the site is finished ("Next site");
//   3. otherwise leaves when the move is allowed (the second Big Rock is down), no contract is running, and the dig
//      has stalled: no new metre for `stall` attended seconds (45 s for the mid player), no Big Rock in view is about to
//      break (at the pace of the last look it needs more than rockWait s), the next pick or training level is far
//      (more than `far` seconds of income) and the attended time on the site is past `budget` times its par time;
//      a dig stalled for `giveUp` seconds leaves whatever the budget says (or, in a session, closes the page).
// The card: from the fixed road it takes the only card; from a deal it takes the one it can do (its floor is at most one
// Big Rock beyond the deepest floor finished, or 75 m), preferring a stretch, then a new place, then a twist; a medal card
// when it wants a Fast medal (`fastTry`) or a Hard one (`hardTry`).
export const MOVE = { far: 90, rockWait: 150, giveUp: 240, budget: 4, retry: 1.5, fastTry: 0.35, hardTry: 0.25 };

// ---------- tracker ----------
export class Trk {
  constructor() {
    this.real = 0; this.act = 0; this.units = new Map(); this.marks = new Map(); this.win = {}; this.lastDec = 0; this.gaps = [];
    this.bestEver = 0; this.lastTotal = 0; this.lastUnit = 0; this.visited = new Set(['dunes']); this.chestN = 0; this.ugaps = []; this.lastU2 = 0; this.firstDig = null;
    this.resets = []; this.left = 0; this.sessions = 0; this.curBest = 0; this.src = { hand: 0, crew: 0, tools: 0, away: 0 }; this.blk = { hand: 0, crew: 0 }; this.starShim = 0; this.finishes = []; this.medals = []; this.curFin = false; this.goal = 0; this.goalGaps = []; this.days = [];
  }
  unit(id) { if (this.units.has(id)) return false; this.units.set(id, { r: this.real, a: this.act }); this.dec(); this.found(); const ug = this.act - this.lastU2; if (ug >= 300) this.ugaps.push({ start: this.lastU2, len: ug }); this.lastU2 = this.act; this.lastUnit = this.act; return true; }
  mark(id) { if (!this.marks.has(id)) this.marks.set(id, { r: this.real, a: this.act }); }
  dec() { const g = this.act - this.lastDec; if (g >= 90) this.gaps.push({ start: this.lastDec, len: g }); this.lastDec = this.act; this.found(); }
  // a "nearer goal" was reached: something bought, found or beaten (dead zones are the gaps between these)
  found() { const g = this.act - this.goal; if (g >= 60) this.goalGaps.push({ start: this.goal, len: g }); this.goal = this.act; }
  w() { const m = this.real / 60; const k = m < 5 ? 0 : m < 10 ? 1 : m < 20 ? 2 : m < 40 ? 3 : m < 60 ? 4 : m < 120 ? 5 : 6;
    return this.win[k] || (this.win[k] = { hb: 0, cb: 0, hc: 0, cc: 0, ac: 0, tot: 0, hits: 0, secs: 0, am: 0, dig: 0, crewPow: 0, pick: 0, am2: 0 }); }
  depth(be) {
    if (be <= this.bestEver) return;
    this.bestEver = be;
    for (const m of DEPTHS) if (be >= m) this.mark('depth ' + m);
  }
}
export const WINS = ['0-5', '5-10', '10-20', '20-40', '40-60', '60-120', '120+'];

// where coins come from: the rules call the `earned` hook for every payment
let probe = null;
G.use({ id: 'simProbe', hooks: { earned(s, n, src) { if (probe) probe.src[src === 'crew' ? 'crew' : s._tool ? 'tools' : 'hand'] += n; } } });

export function mkEv(s, trk) {
  return (k, d) => {
    if (k === 'unlock') trk.unit(d.id);     // a first time, as the rules report it
    else if (k === 'break') {
      const w = trk.w();
      trk.blk[d.src === 'you' ? 'hand' : 'crew']++;
      if (d.src === 'you') { w.hb++; w.hc += d.coins; } else { w.cb++; w.cc += d.coins; }
      if (d.t === 'chest') trk.mark('first chest found');
      if (d.t === 'chest') { trk.chestN++; trk.found(); }
      if (G.ORES.includes(d.t)) trk.mark('first ore');
    } else if (k === 'relic') {
      trk.mark('first relic'); trk.dec();
    } else if (k === 'buy') {
      if (d.id === 'crew' && d.level === 1) trk.mark('first digger bought');
      if (d.shop === 'star') trk.mark('first Star perk');
      if (d.shop === 'forge') (trk.fbuys || (trk.fbuys = [])).push({ a: trk.act, id: d.id, level: d.level, best: trk.curBest });
      trk.dec();
    } else if (k === 'hit' && d.t === 'boss' && d.src === 'you' && s.run && s.boss && s.boss.gate && !s.boss.logged) {
      // the Gate fight starts: how many of your hits it is, at the pick you brought (for the rocks table)
      s.boss.logged = true;
      (trk.gates || (trk.gates = [])).push({ key: s.run.key, a: trk.act, r: trk.real, max: s.boss.max, bank: s.boss.bank0 || 0, pick: G.pickPower(s), crew: G.crewPower(s) * G.crewRate(s), coinPick: s.up.pick });
    } else if (k === 'bossDown') {
      trk.chestN++; trk.mark('boss down ' + d.layer); trk.found();
    } else if (k === 'fossil') {
      if (d.isNew) { trk.mark('first bone'); trk.found(); } else trk.mark('first duplicate bone');
    } else if (k === 'set') trk.mark('first set');
    else if (k === 'gusher') trk.mark('first oil gusher');
    else if (k === 'wingPiece') { if (d.isNew) trk.found(); }
    else if (k === 'siteFinished') {
      trk.curFin = true;
      trk.finishes.push({ r: trk.real, a: trk.act, key: d.key, floor: d.floor, time: d.time, par: d.par, stars: d.stars, fast: d.fast, first: d.first });
      trk.mark('finish #' + trk.finishes.length); trk.dec();
    } else if (k === 'siteMedal') {
      trk.medals.push({ r: trk.real, medal: d.medal, key: d.key, stars: d.stars }); trk.found();
    } else if (k === 'newSite') {
      trk.visited.add(s.site);
      trk.resets.push({ r: trk.real, a: trk.act, best: trk.curBest, gain: d.gain, had: s.stars + (s.starSpent || 0) - d.gain, need: G.starsToStand(Math.max(0, trk.curBest - 1)), stars: s.stars + (s.starSpent || 0), contract: trk.curContract || null, fin: trk.curFin, key: d.key });
      trk.mark('new site #' + (trk.resets.length + 1)); trk.dec();
      trk.curBest = 0; trk.curContract = s.contract || null; trk.curFin = false;
    }
  };
}

// ---------- the human ----------
export function mkCtx(profile) { return { p: { ...PROFILES[profile] }, clock: 0, next: 0, busy: 0, buyT: 3, tg: null, col: 4, lagNext: 0, clearRow: -1, clear: false, bestAt: 0, bestSeen: 0, inc: 0, incT: 0, incTot: 0, rock: null }; }

const COIN_ITEMS = Object.keys(G.ITEMS).filter(id => G.ITEMS[id].shop === 'coin');
function shopCheck(s, ev, noCrew = false) {
  let n = 0;
  for (let guard = 0; guard < 50; guard++) {
    const ids = COIN_ITEMS.filter(id => G.itemOpen(s, id) && G.canBuy(s, id) && !(noCrew && id === 'crew'));
    if (!ids.length) break;
    let id;
    if (s.up.crew === 0 && ids.includes('crew')) id = 'crew';     // the new thing first
    else { ids.sort((a, b) => G.upgradeCost(s, a) - G.upgradeCost(s, b)); id = ids[0]; }
    G.buy(s, id, ev); n++;
  }
  return n;
}
function draft(s, trk, ev) {
  const offer = G.rollDraft(s);
  offer.sort((a, b) => ((G.rel(s, a) > 0) - (G.rel(s, b) > 0)) || (PRIO.indexOf(a) - PRIO.indexOf(b)));
  G.takeRelic(s, offer[0] || null, ev);
}

function pickTarget(s, ctx) {
  const p = ctx.p, col = ctx.col;
  // a Big Rock close below: maybe clear the row above it so the crack can be reached
  for (let i = 1; i < G.VIEW_ROWS; i++) if (G.isBossRow(s.top + i)) {
    if (ctx.clearRow !== s.top + i) { ctx.clearRow = s.top + i; ctx.clear = rnd() < p.clear; }
    if (ctx.clear) {
      let best = null, bd = 99;
      for (let c = 0; c < G.COLS; c++) { const cell = s.rows[i - 1][c]; if (cell && G.reachable(s, s.top + i - 1, c) && Math.abs(c - col) < bd) { bd = Math.abs(c - col); best = [s.top + i - 1, c]; } }
      if (best) { ctx.lagNext = bd ? p.lag * 0.4 : 0; ctx.col = best[1]; return best; }
    }
    break;
  }
  if (rnd() < p.notice) {
    const vis = G.visibleMask(s);
    let best = null, bd = 1e9;
    for (let i = 0; i < Math.min(G.VIEW_ROWS, 7); i++) for (let c = 0; c < G.COLS; c++) {
      const cell = s.rows[i][c];
      if (!cell || !VAL.has(cell.t) || !vis[i][c] || !G.reachable(s, s.top + i, c) || Math.abs(c - col) > 5) continue;
      const d = Math.abs(c - col) + 0.7 * i;
      if (d < bd) { bd = d; best = [s.top + i, c]; }
    }
    if (best) { const dc = Math.abs(best[1] - col); ctx.lagNext = dc ? p.lag * (0.5 + Math.min(dc, 5) / 5) : 0; ctx.col = best[1]; return best; }
  }
  // dig down the held column; sometimes drift one column to keep the hole wide
  if (rnd() < 0.2) ctx.col = Math.max(0, Math.min(G.COLS - 1, col + (rnd() < 0.5 ? -1 : 1)));
  for (let i = 0; i < G.VIEW_ROWS; i++) {
    if (s.rows[i][ctx.col]) { if (G.reachable(s, s.top + i, ctx.col)) return [s.top + i, ctx.col]; break; }
  }
  let best = null, bs = 1e9;
  for (let i = 0; i < G.VIEW_ROWS; i++) for (let c = 0; c < G.COLS; c++) {
    if (!s.rows[i][c] || !G.reachable(s, s.top + i, c)) continue;
    const sc = i * 3 + Math.abs(c - ctx.col) * 2; if (sc < bs) { bs = sc; best = [s.top + i, c]; }
  }
  if (best) { ctx.lagNext = ctx.p.lag * 0.5; ctx.col = best[1]; }
  return best;
}

function handSwing(s, ctx, ev, trk) {
  const p = ctx.p;
  let tg = ctx.tg;
  if (!tg || !G.cellAt(s, tg[0], tg[1]) || !G.reachable(s, tg[0], tg[1])) {
    tg = pickTarget(s, ctx); ctx.tg = tg;
    if (ctx.lagNext) { ctx.next = ctx.clock + ctx.lagNext * (0.7 + 0.6 * rnd()); ctx.lagNext = 0; return; }
  }
  if (!tg) { ctx.next = ctx.clock + 0.3; return; }
  if (G.isBossRow(tg[0]) && s.boss && s.boss.row === tg[0] && tg[1] !== s.boss.weak && rnd() < p.weak && G.reachable(s, tg[0], s.boss.weak)) {
    ctx.tg = [tg[0], s.boss.weak]; ctx.col = s.boss.weak; ctx.next = ctx.clock + p.lag * 0.4; return;
  }
  G.swing(s, tg[0], tg[1], ev);
  trk.w().hits++;
  // swings that come faster than the step are counted from when the last one was due, so none is lost
  const iv = (1 / (p.hps * pace(s))) * (0.8 + 0.4 * rnd()), dt = ctx.dt || 0.05;
  ctx.next = (iv < dt ? Math.max(ctx.next, ctx.clock - dt) : ctx.clock) + iv;
}

// ---------- moving ----------
// 'move', 'leave' (nothing left to do here today) or null
function wantsMove(s, ctx, trk) {
  const r = G.siteRun(s), stalled = trk.act - ctx.bestAt;
  if (!G.canNewSite(s)) return !s.contract && stalled >= MOVE.giveUp ? 'leave' : null;
  if (r.done && !s.contract) return 'move';                      // finished: Next site
  if (stalled < ctx.p.stall) return null;
  // a Big Rock that is going down is worth the wait
  const b = s.boss;
  if (b && b.hp > 0 && ctx.rock && ctx.rock.row === b.row && ctx.rock.hp > b.hp) {
    const rate = (ctx.rock.hp - b.hp) / Math.max(1, trk.act - ctx.rock.t);
    if (b.hp / rate < MOVE.rockWait) return null;
  }
  if (s.contract) return null;
  if (stalled >= MOVE.giveUp) return 'move';
  let cheap = Infinity;
  for (const id of ['pick']) if (G.itemOpen(s, id)) cheap = Math.min(cheap, G.upgradeCost(s, id));
  if (cheap - s.coins < ctx.inc * MOVE.far) return null;
  return r.clock >= MOVE.budget * r.par ? 'move' : null;
}
// the card the player takes
const lifeStars = s => s.stars + (s.starSpent || 0);
function chooseCard(s, cards, ctx) {
  if (cards.length === 1) return cards[0];
  const reach = s.road.reach, fails = ctx.fails || (ctx.fails = {});
  // doable: a floor already finished, or the next one, unless it failed lately and the Stars have not grown by half since
  const doable = c => c.floor <= reach || (c.floor <= Math.max(reach + 25, 75) && !(fails[c.floor] && lifeStars(s) < fails[c.floor] * MOVE.retry));
  const score = c => {
    let v = { stretch: 3, new: 2, twist: 1, medal: 0, fixed: 5 }[c.kind] + rnd() * 0.5;
    if (c.kind === 'medal' && !c.medals.fast && rnd() < MOVE.fastTry) v += 4;
    if (c.hard) v += rnd() < MOVE.hardTry ? 4 : -6;
    return v - (doable(c) ? 0 : 100);
  };
  return cards.map(c => [score(c), c]).sort((a, b) => b[0] - a[0])[0][1];
}
function move(s, ctx, trk, ev) {
  const r = G.siteRun(s);
  if (r.done) delete (ctx.fails || {})[r.floor];
  else { (ctx.fails || (ctx.fails = {}))[r.floor] = lifeStars(s); }          // it gave this floor up: not again until the Stars have grown
  const c = chooseCard(s, G.dealCards(s), ctx);
  if (!G.pickCard(s, c, ev)) return false;
  if (s.contract) { ctx.cBuyEvery = ctx.cBuyEvery || ctx.p.buyEvery; ctx.cTried = ctx.cTried || {}; ctx.cTried[s.contract] = 1; ctx.cWas = true; ctx.cStart = trk.act; ctx.cLogged = ctx.cLogged || {}; }
  return afterMove(s, ctx, trk);
}
function afterMove(s, ctx, trk) {
  trk.lastTotal = s.total; ctx.tg = null; ctx.busy = 4; ctx.col = 4; ctx.bestAt = trk.act; ctx.bestSeen = 0; ctx.rock = null; ctx.siteAt = trk.act; ctx.incTot = s.total; ctx.incT = trk.act; ctx.inc = 0;
  return true;
}

// play `secs` seconds of attended time. opts.hand=false: the player only buys, picks relics and sits (Rafeeqs work).
// opts.stopAtAll: return true once every unit of content has been found. opts.dt: the step (0.05 s).
export function play(s, ctx, secs, trk, opts = {}) {
  const hand = opts.hand !== false, dt = opts.dt || 0.05;
  const ev = mkEv(s, trk);
  ctx.dt = dt;
  probe = trk;
  let el = 0;
  while (el < secs - 1e-9) {
    if (s.chests > 0 && ctx.busy <= 0) {
      draft(s, trk, ev);
      const t = ctx.p.relicT; el += t; trk.real += t; trk.act += t; ctx.clock += t; trk.w().secs += t;   // the game is paused while the card is open
      ctx.bestAt += t;                                                                                   // (reading a card is not a stall)
      continue;
    }
    if (hand && ctx.busy <= 0) for (let k = 0; k < 16 && ctx.clock >= ctx.next; k++) handSwing(s, ctx, ev, trk);   // several a step when the bar is fast
    if (ctx.busy > 0) ctx.busy = Math.max(0, ctx.busy - dt);
    G.step(s, dt, ev);
    trk.real += dt; trk.act += dt; ctx.clock += dt; el += dt;
    const w = trk.w(); w.secs += dt;
    const dTot = s.total - trk.lastTotal; trk.lastTotal = s.total; if (dTot > 0) w.tot += dTot;
    if (s.best > ctx.bestSeen) { ctx.bestSeen = s.best; ctx.bestAt = trk.act; }
    trk.curBest = s.best; if (s.contract) trk.curContract = s.contract;
    ctx.buyT -= dt;
    if (ctx.buyT <= 0) {
      ctx.buyT = ctx.p.buyEvery;
      // income of the last minute or so, and how the Big Rock in view is doing
      if (trk.act - ctx.incT >= 20) { const r = Math.max(0, s.total - ctx.incTot) / (trk.act - ctx.incT); ctx.inc = ctx.inc ? ctx.inc * 0.6 + r * 0.4 : r; ctx.incT = trk.act; ctx.incTot = s.total; }
      if (ctx.busy <= 0) {
        const w = wantsMove(s, ctx, trk);
        if (w === 'leave' && opts.canLeave && s.diggers.length) { trk.left++; break; }
        if ((w === 'move' || (w === 'leave' && !opts.canLeave && G.canNewSite(s))) && move(s, ctx, trk, ev)) continue;
      }
      const b = s.boss;
      if (!b || b.hp <= 0) ctx.rock = null;
      else if (!ctx.rock || ctx.rock.row !== b.row || trk.act - ctx.rock.t >= 30) ctx.rock = { row: b.row, hp: b.hp, t: trk.act };
      let n = shopCheck(s, ev, ctx.noCrew);
      for (const bt of G.BOTS) {
        if (!bt.shop) continue;
        if (bt.id === 'contracts' && !s.contract && !ctx.cWas) continue;   // a contract is taken only when the player moves (above)
        n += bt.shop(s, { ev, ctx, trk, rnd }) || 0;                        // a feature's own shop, tools, jobs
      }
      if (n) ctx.busy += n * ctx.p.react * (hand ? 1 : 0.3);
    }
    trk.depth(s.best);
    if (COIN_ITEMS.some(id => !trk.marks.has('affordable:' + id))) {
      for (const id of COIN_ITEMS) if (G.canBuy(s, id)) trk.mark('affordable:' + id);
    }
    if (!trk.firstDig && s.up.crew === 0 && G.canBuy(s, 'crew')) {
      const up = G.UPGRADES; let k = 0, sum = 0; const cost = G.upgradeCost(s, 'crew');
      while (sum + Math.ceil(up.pick.base * Math.pow(up.pick.grow, s.up.pick + k)) <= cost) { sum += Math.ceil(up.pick.base * Math.pow(up.pick.grow, s.up.pick + k)); k++; }
      const hd = ctx.p.hps * pace(s) * G.pickPower(s) * (1 + G.critChance(s) * (G.critMult(s) - 1));
      trk.firstDig = { t: trk.act, cost, pick: s.up.pick, k, hand: hd, gainHand: hd * (Math.pow(G.P.powGrow, k) - 1), digger: G.crewRate(s) * G.crewPower(s) };
    }
    if (opts.stopAtAll && trk.units.size >= N_ALL) { sample(s, trk); probe = null; return true; }
  }
  sample(s, trk);
  probe = null;
  return false;
}

export function sample(s, trk) { const w = trk.w(); w.dig = s.diggers.length; w.crewPow = 0; w.pick = s.up.pick; }
export function awayFor(s, ctx, secs, trk) {
  trk.real += secs;                       // first times found while away are stamped at the return
  const out = G.settleAway(s, secs, mkEv(s, trk));
  ctx.tg = null; ctx.clock += secs;
  sample(s, trk); const w = trk.w(); w.ac += out.coins; w.am += out.metres; w.tot += out.coins; trk.lastTotal = s.total;
  trk.src.away += out.coins;
  ctx.incTot = s.total; ctx.incT = trk.act;          // away coins are not "income while playing"
  if (out.metres > 0) { ctx.bestSeen = s.best; ctx.bestAt = trk.act; }
  ctx.bestAt = Math.max(ctx.bestAt, trk.act - ctx.p.stall + 20);   // coming back: a look around before judging the dig
  trk.curBest = s.best;
  trk.mark('first away');
  trk.depth(s.best);
  return out;
}

// Where the damage to the ground comes from (attended play). "hand" = your swing and a Rafeeq's own swing;
// "fx" = every effect (blasts, lines, tools, relics, fire, falling blocks). A Big Rock counts apart.
export const DMG = new WeakMap();
G.use({ id: 'simprobe', mods: { damage: { at: 9999, fn(v, s, cell, src, info) {
  let t = DMG.get(s); if (!t) DMG.set(s, t = { hand: 0, fx: 0, rockHand: 0, rockFx: 0, crew: 0, crewRock: 0 });
  const direct = (src === 'you' && info.crit !== undefined) || (src === 'crew' && !info.chain);
  const rock = cell.t === 'boss', a = Math.min(v, cell.hp);
  if (a > 0 && info.tool) t.toolDmg = (t.toolDmg || 0) + a;
  if (a > 0 && !rock) { const k = src + ':' + Object.keys(info).sort().join('+'); (t.by || (t.by = {}))[k] = (t.by[k] || 0) + a; }
  if (a > 0 && src === 'crew' && !info.chain) t[rock ? 'crewRock' : 'crew'] += a;     // a Rafeeq's own swings (not the blasts he sets off)
  if (a > 0) t[(rock ? 'rock' : '') + (direct ? (rock ? 'Hand' : 'hand') : (rock ? 'Fx' : 'fx'))] += a;
  return v;
} } } });

export function newRun(profile, seed, noCrew = false) {
  G.setRng(mulberry(seed * 7919 + 13));
  const s = G.newState(); const ctx = mkCtx(profile); ctx.noCrew = noCrew; const trk = new Trk();
  return { s, ctx, trk };
}
export function endRun(R) {
  R.dmg = DMG.get(R.s) || { hand: 0, fx: 0, rockHand: 0, rockFx: 0, crew: 0, crewRock: 0 };
  const fs = R.s.forgeStat; R.dmg.forge = { uses: fs.uses, toolBlocks: fs.blocks, all: fs.all, metal: R.s.metal, buys: R.trk.fbuys || [], coins: fs.coins, allCoins: fs.allCoins, log: (R.trk.forgeUse || []).filter((x, i) => i % 6 === 0) };
  const dl = R.trk.act - R.trk.lastDec; if (dl >= 90) R.trk.gaps.push({ start: R.trk.lastDec, len: dl, open: true });
  return R;
}

// ---------- stats helpers ----------
export const sortN = a => a.slice().sort((x, y) => x - y);
export const med = a => { if (!a.length) return NaN; const b = sortN(a); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
export function fmtT(sec) {
  if (!isFinite(sec)) return '-';
  if (sec < 90) return sec.toFixed(0) + 's';
  if (sec < 5400) return (sec / 60).toFixed(1) + 'm';
  if (sec < 172800) return (sec / 3600).toFixed(1) + 'h';
  return (sec / 86400).toFixed(1) + 'd';
}
export function fmtN(x) {
  if (x === null || !isFinite(x)) return '-';
  if (x >= 1e15) return x.toExponential(1).replace('+', '');
  if (x >= 1e12) return (x / 1e12).toFixed(1) + 'T'; if (x >= 1e9) return (x / 1e9).toFixed(1) + 'B';
  if (x >= 1e6) return (x / 1e6).toFixed(1) + 'M'; if (x >= 1e3) return (x / 1e3).toFixed(1) + 'k'; return x.toFixed(0);
}
