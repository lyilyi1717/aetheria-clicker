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
// The player moves to a New Site when ALL of these hold:
//   1. the move is allowed (the rules' canNewSite) and no contract is running;
//   2. the dig has stalled: no new metre for `stall` attended seconds (45 s for the mid player), and a
//      Big Rock in view is not about to break (at the pace of the last look it needs more than rockWait s);
//   3. the next pick or training level is far: more than `far` seconds of the income of the last minute;
//   4. the move pays: the Stars on offer are at least `share` of every Star earned so far.
// A dig that has been stalled for `giveUp` seconds: the player moves if the offer is at least `low` of
// his Stars; if not he closes the page and lets the Rafeeqs work (a session cut short), or, in a sim
// with no sessions, moves anyway. When it moves it takes an open contract first if a feature's bot
// offers one, else a site it has not seen, else any other open site.
export const MOVE = { far: 90, share: 0.2, rockWait: 150, giveUp: 240, low: 0.05 };

// ---------- tracker ----------
export class Trk {
  constructor() {
    this.real = 0; this.act = 0; this.units = new Map(); this.marks = new Map(); this.win = {}; this.lastDec = 0; this.gaps = [];
    this.bestEver = 0; this.lastTotal = 0; this.lastUnit = 0; this.visited = new Set(['dunes']); this.chestN = 0; this.ugaps = []; this.lastU2 = 0; this.firstDig = null;
    this.resets = []; this.left = 0; this.sessions = 0; this.curBest = 0; this.src = { hand: 0, crew: 0, tools: 0, away: 0 }; this.starShim = 0; this.goal = 0; this.goalGaps = []; this.days = [];
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
      if (d.src === 'you') { w.hb++; w.hc += d.coins; } else { w.cb++; w.cc += d.coins; }
      if (d.t === 'chest') trk.mark('first chest found');
      if (d.t === 'chest') { trk.chestN++; trk.found(); }
      if (G.ORES.includes(d.t)) trk.mark('first ore');
    } else if (k === 'relic') {
      trk.mark('first relic'); trk.dec();
    } else if (k === 'buy') {
      if (d.id === 'crew' && d.level === 1) trk.mark('first digger bought');
      if (d.shop === 'star') trk.mark('first Star perk');
      trk.dec();
    } else if (k === 'bossDown') {
      trk.chestN++; trk.mark('boss down ' + d.layer); trk.found();
    } else if (k === 'fossil') {
      if (d.isNew) { trk.mark('first bone'); trk.found(); } else trk.mark('first duplicate bone');
    } else if (k === 'set') trk.mark('first set');
    else if (k === 'gusher') trk.mark('first oil gusher');
    else if (k === 'wingPiece') { if (d.isNew) trk.found(); }
    else if (k === 'newSite') {
      // The Star curve lives in the core (G.starsAt). Until the sites feature pays by it, the sim pays the
      // difference here so the model can be checked; once it is wired this is a no-op (see docs/dig-pacing.md).
      const want = G.starsAt(trk.curBest, s.land, d.stars - d.gain + (s.starSpent || 0));
      if (d.gain !== want) { s.stars += want - d.gain; trk.starShim++; }
      trk.visited.add(s.site);
      trk.resets.push({ r: trk.real, a: trk.act, best: trk.curBest, gain: want, had: s.stars + (s.starSpent || 0) - want, need: G.starsToStand(Math.max(0, trk.curBest - 1)), stars: s.stars + (s.starSpent || 0), contract: trk.curContract || null });
      trk.mark('new site #' + (trk.resets.length + 1)); trk.dec();
      trk.curBest = 0; trk.curContract = s.contract || null;
    }
  };
}

// ---------- the human ----------
export function mkCtx(profile) { return { p: { ...PROFILES[profile] }, clock: 0, next: 0, busy: 0, buyT: 3, tg: null, col: 4, lagNext: 0, clearRow: -1, clear: false, bestAt: 0, bestSeen: 0, inc: 0, incT: 0, incTot: 0, rock: null }; }

const COIN_ITEMS = Object.keys(G.ITEMS).filter(id => G.ITEMS[id].shop === 'coin');
function shopCheck(s, ev, noCrew = false) {
  let n = 0;
  for (let guard = 0; guard < 50; guard++) {
    const ids = COIN_ITEMS.filter(id => G.itemOpen(s, id) && G.canBuy(s, id) && !(noCrew && (id === 'crew' || id === 'crewPow')));
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
const lifeStars = s => s.stars + (s.starSpent || 0);
// 'move', 'leave' (nothing left to do here today) or null
function wantsMove(s, ctx, trk) {
  const stalled = trk.act - ctx.bestAt;
  if (stalled < ctx.p.stall) return null;
  // a Big Rock that is going down is worth the wait
  const b = s.boss;
  if (b && b.hp > 0 && ctx.rock && ctx.rock.row === b.row && ctx.rock.hp > b.hp) {
    const rate = (ctx.rock.hp - b.hp) / Math.max(1, trk.act - ctx.rock.t);
    if (b.hp / rate < MOVE.rockWait) return null;
  }
  let cheap = Infinity;
  for (const id of ['pick', 'crewPow']) if (G.itemOpen(s, id)) cheap = Math.min(cheap, G.upgradeCost(s, id));
  if (cheap - s.coins < ctx.inc * MOVE.far) return null;
  const can = G.canNewSite(s) && !s.contract, gain = can ? G.starsAt(s.best, s.land, lifeStars(s)) : 0;
  if (can && gain >= Math.max(1, MOVE.share * lifeStars(s))) return 'move';
  if (stalled < MOVE.giveUp) return null;
  if (can && gain >= Math.max(1, MOVE.low * lifeStars(s))) return 'move';
  return s.contract ? null : 'leave';
}
function move(s, ctx, trk, ev) {
  // a contract first, if a feature's bot takes one (it moves by itself)
  for (const b of G.BOTS) if (b.id === 'contracts' && b.shop && b.shop(s, { ev, ctx, trk, rnd })) return afterMove(s, ctx, trk);
  const open = Object.keys(G.SITES).filter(id => G.siteOpen(s, id) && id !== s.site);
  const fresh = open.filter(id => !trk.visited.has(id));
  const pool = fresh.length ? fresh : open;
  if (!pool.length || !G.newSite(s, pool[Math.floor(rnd() * pool.length)], ev)) return false;
  return afterMove(s, ctx, trk);
}
function afterMove(s, ctx, trk) {
  trk.lastTotal = s.total; ctx.tg = null; ctx.busy = 4; ctx.col = 4; ctx.bestAt = trk.act; ctx.bestSeen = 0; ctx.rock = null; ctx.incTot = s.total; ctx.incT = trk.act; ctx.inc = 0;
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

export function sample(s, trk) { const w = trk.w(); w.dig = s.diggers.length; w.crewPow = s.up.crewPow; w.pick = s.up.pick; }
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

export function newRun(profile, seed, noCrew = false) {
  G.setRng(mulberry(seed * 7919 + 13));
  const s = G.newState(); const ctx = mkCtx(profile); ctx.noCrew = noCrew; const trk = new Trk();
  return { s, ctx, trk };
}
export function endRun(R) {
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
