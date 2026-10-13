// Dig feature: the crew (the player reads "Rafeeq"; the code says digger and crew). Hired in the
// coin shop, each one walks to a block and hits it. Which block is a policy, so a Foreman can
// register more policies and set `s.crewJob` (or one digger's `job`) to switch.
import { use, emit, POLICIES, fold } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { COLS, VIEW_ROWS, cellAt, reachable, dirtHp, dirtVal } from '../../core/grid.js';
import { damage, addCoins, coinMult, pickPower } from '../../core/rules.js';
import { bossInView } from '../boss/rules.js';
import strings from './strings.js';

const p = {
  rate: 4,          // digger hits per second
  walk: 6,          // blocks per second
  karakStep: 0.5,   // Karak Tea: faster per level
  // the default job, "beside me and below": the last block the player hit and the rows under it
  above: 3,         // a row above the pick costs this many columns of walking (up there is the cheap, finished ground)
  below: 1.6,       // a row below it costs this many (so they sweep along the row before they go down)
  mate: 6,          // a block a mate is already on costs this much more
  // at a Big Rock: every `sieveEvery`th Rafeeq (the 2nd, 4th, ...) sieves the rubble beside it instead of hitting it
  sieveEvery: 2,
  sieveMult: 3,     // coins per sieve hit, in times a dirt hit at that depth (hit damage / hp x value): rubble is rich
  sievePay: 0.5,    // seconds between the sievers' payouts (and their gold number)
  window: 2,        // seconds the "coins a second" line is measured over
  // one Stronger Pick: a Rafeeq hits for a share of YOUR hit (the pick level, The Pick track, Strong Arm ...; not the
  // blasts, the crack x3, or the big hits). The Camp adds to it (starshop `campShare`).
  rafeeqShare: 0.6,
  // a sieve hit pays at most this many blocks' worth of dirt at that depth (without it the sieve grew with the hit, unbounded)
  sieveCap: 0.5,
};

let cur = null;      // the Rafeeq whose hit is being settled right now (for his tally); never saved

export const crewShare = s => fold('crewShare', s, p.rafeeqShare);     // a Rafeeq's hit, in times yours
export const crewPower = s => fold('crewPower', s, crewShare(s) * pickPower(s));
export const crewRate = s => fold('crewRate', s, p.rate);
export const crewWalk = s => fold('crewWalk', s, p.walk);

// "beside me, and below": the row the player last hit and the ones under it, nearest his column.
// The rows above are the cheap ground that scrolled away from him; the valuable ground is where he digs.
function nearest(s, d) {
  const a = s.crewAim || [s.top + 1, COLS >> 1];      // nobody has swung yet: the top of the view
  const ar = Math.max(a[0], s.top);
  let bs = 1e9, out = null;
  for (let i = 0; i < VIEW_ROWS; i++) {
    const r = s.top + i;
    for (let c = 0; c < COLS; c++) {
      if (!s.rows[i][c] || !reachable(s, r, c)) continue;
      const dr = r - ar;
      const v = (dr < 0 ? -dr * p.above : dr * p.below) + Math.abs(c - a[1]) + Math.abs(c - d.c) * 0.01 + (s.diggers.some(o => o !== d && o.tr === r && o.tc === c) ? p.mate : 0);
      if (v < bs) { bs = v; out = [r, c]; }
    }
  }
  return out;
}

// The Big Rock in front of the crew: in view, alive, and with a block of it that can be hit
let rock = null;
function rockNow(s) {
  const b = bossInView(s);
  if (!b || b.hp <= 0) return null;
  for (let c = 0; c < COLS; c++) if (cellAt(s, b.row, c) && reachable(s, b.row, c)) return b;
  return null;
}
const sieves = (s, d) => p.sieveEvery > 0 && (s.diggers.indexOf(d) + 1) % p.sieveEvery === 0;
function rockTarget(s, d) {
  let bs = 1e9, out = null;
  for (let c = 0; c < COLS; c++) {
    if (!cellAt(s, rock.row, c) || !reachable(s, rock.row, c)) continue;
    const v = Math.abs(c - d.c) + (s.diggers.some(o => o !== d && o.tr === rock.row && o.tc === c) ? p.mate : 0);
    if (v < bs) { bs = v; out = [rock.row, c]; }
  }
  return out;
}
function chooseTarget(s, d) {
  if (rock) { const t = rockTarget(s, d); if (t) { d.tr = t[0]; d.tc = t[1]; return; } }
  const policy = POLICIES[d.job || s.crewJob] || nearest;
  const best = policy(s, d);
  if (best) { d.tr = best[0]; d.tc = best[1]; } else { d.tr = -1; d.tc = -1; }
}

// sieve the rubble beside a Big Rock: walk to the foot of it; every sievePay seconds a handful of coins
function sieve(s, d, dt, ev) {
  const sr = rock.row - 1, sc = (s.diggers.indexOf(d) * 3 + 1) % COLS;
  const dc = sc - d.c, drr = sr - d.r;
  d.c += Math.sign(dc) * Math.min(Math.abs(dc), dt * crewWalk(s));
  d.r += Math.sign(drr) * Math.min(Math.abs(drr), dt * crewWalk(s));
  if (Math.abs(dc) > 0.05 || Math.abs(drr) > 0.05) return;
  d.cd -= dt;
  if (d.cd <= 0) {
    d.cd += 1 / crewRate(s); if (d.cd < 0) d.cd = 0;
    d.swing = 1;
    d.pot = (d.pot || 0) + Math.min(crewPower(s) / dirtHp(rock.row), p.sieveCap) * dirtVal(rock.row) * p.sieveMult * coinMult(s);
  }
  d.sp = (d.sp || 0) + dt;
  if (d.sp >= p.sievePay && d.pot >= 1) {
    d.sp = 0;
    const n = Math.floor(d.pot); d.pot -= n;
    cur = d; addCoins(s, n, 'crew'); cur = null;
    emit(s, ev, 'crewGain', { r: sr, c: Math.round(d.c), id: d.id, who: s.diggers.indexOf(d), coins: n, sieve: 1 });
  }
}

// one Rafeeq, with his tally; every creator (the shop, the Camp perks, the start kit) uses this. `c`: the column he starts in (random if left out)
export const newRafeeq = (s, c) => ({ id: s.diggers.reduce((m, d) => Math.max(m, d.id || 0), 0) + 1, broke: 0, coins: 0, c: c === undefined ? Math.floor(rnd() * COLS) : c, r: s.top, tc: -1, tr: -1, cd: 0.3, swing: 0 });

export const diggers = use({
  id: 'diggers',
  params: p,
  legacy: { crewRate: 'rate' },
  strings,
  state: {
    diggers:   { init: () => [], perSite: true },        // { c, r, tc, tr, cd, swing, job? }
    crewJob:   { init: () => 'nearest' },                // the policy every digger follows (the id stays; the job is "beside me and below" now)
    crewCps:   { init: () => 0, perSite: true },         // what the crew earns a second, smoothed
    allCps:    { init: () => 0, perSite: true },         // what everything earns a second, smoothed (the Rafeeqs' share is crewCps / allCps)
    crewAim:   { init: () => null, transient: true },    // where the player's pick last hit
    _acc:      { init: () => 0, perSite: true, transient: true },
    _crewEarn: { init: () => 0, perSite: true, transient: true },
    _allEarn:  { init: () => 0, perSite: true, transient: true },
  },
  version: 3,
  // v2: every Rafeeq gets a tally. (The default job `nearest` is "beside me and below" from now on; the id is kept so old saves keep their choice.)
  // v3: Rafeeq Training is gone (a Rafeeq hits for a share of yours): the levels bought at this site are paid back in coins, once.
  migrate(s, from) {
    if (from < 3 && s.up && s.up.crewPow > 0) {
      for (let l = 0; l < s.up.crewPow; l++) s.coins += Math.ceil(12 * Math.pow(1.5, l));
    }
    if (s.up) delete s.up.crewPow;
    (s.diggers || []).forEach((d, i) => { if (d.id === undefined) { d.id = i + 1; d.broke = 0; d.coins = 0; } });
  },
  items: {
    crew: { at: 20, shop: 'coin', base: 30, grow: 4.2, max: 8, levels: 'core', open: s => s.total >= 60 || s.up.crew > 0,
      // id, broke, coins: his tally (a name can join them later) for the Rafeeq panel
      bought(s) { s.diggers.push(newRafeeq(s)); } },
  },
  policies: { nearest },
  relics: {
    karak: { at: 80, max: 3, when: s => s.up.crew > 0, mods: { crewRate: (v, s) => v * (1 + p.karakStep * s.relics.karak) } },   // faster diggers
  },
  mods: {
    awayDps: (v, s) => v + s.diggers.length * crewRate(s) * crewPower(s),
  },
  hooks: {
    step: [
      { at: 600, fn(s, dt, ev) {
        const rate = crewRate(s);
        rock = rockNow(s);
        for (const d of s.diggers) {
          if (rock && sieves(s, d)) {
            if (!d.sv) { d.sv = 1; d.tr = -1; d.tc = -1; }
            sieve(s, d, dt, ev);
            continue;
          }
          if (d.sv) { d.sv = 0; d.tr = -1; d.tc = -1; }
          if (d.tr < 0 || !cellAt(s, d.tr, d.tc)) chooseTarget(s, d);
          if (d.tr < 0) continue;
          const dc = d.tc - d.c, drr = d.tr - d.r;
          const moving = Math.abs(dc) > 0.05 || Math.abs(drr) > 0.05;
          d.c += Math.sign(dc) * Math.min(Math.abs(dc), dt * crewWalk(s));
          d.r += Math.sign(drr) * Math.min(Math.abs(drr), dt * crewWalk(s));
          if (moving) continue;
          d.cd -= dt;
          if (d.cd <= 0) {
            d.cd += 1 / rate;
            if (d.cd < 0) d.cd = 0;
            d.swing = 1;
            cur = d;
            damage(s, d.tr, d.tc, crewPower(s), 'crew', ev);
            cur = null;
          }
        }
      } },
      // what the crew earns by itself, for the time-away estimate
      { at: 950, fn(s, dt) {
        s._acc = (s._acc || 0) + dt;
        if (s._acc >= p.window) {
          const cps = (s._crewEarn || 0) / s._acc, all = (s._allEarn || 0) / s._acc;
          s.crewCps = s.crewCps ? s.crewCps * 0.7 + cps * 0.3 : cps;
          s.allCps = s.allCps ? s.allCps * 0.7 + all * 0.3 : all;
          s._acc = 0; s._crewEarn = 0; s._allEarn = 0;
        }
      } },
    ],
    earned(s, n, src) {
      s._allEarn = (s._allEarn || 0) + n;
      if (src === 'crew') { s._crewEarn = (s._crewEarn || 0) + n; if (cur) cur.coins = (cur.coins || 0) + n; }
    },
    // a Rafeeq broke something that paid: his tally, and a gold number over the block
    broke(s, b, ev) {
      if (b.src !== 'crew' || !cur) return;
      cur.broke = (cur.broke || 0) + 1;
      if (b.coins > 0) emit(s, ev, 'crewGain', { r: b.r, c: b.c, id: cur.id, who: s.diggers.indexOf(cur), coins: b.coins });
    },
    swung(s, sw) { s.crewAim = [sw.r, sw.c]; },
    scrolled(s) { for (const d of s.diggers) if (d.tr < s.top) { d.tr = -1; d.tc = -1; } },
    awayEnd: { at: 20, fn(s) { for (const d of s.diggers) { d.tr = -1; d.tc = -1; d.r = s.top; } } },
  },
});
