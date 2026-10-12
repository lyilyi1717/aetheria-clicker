// Dig prototype: content timeline for human-paced players (measure only; imports the real rules).
// Usage:
//   node sim/proto/dig-timeline.mjs [--seeds 7] [--only all|active|mixed|idle|diggers|away] [--set '{"UPGRADES.crew.base":20}'] [--ab '{"UPGRADES.crew.base":12}'] [--quick]
// --set overrides numbers for the whole run. A key is a path G.setParam understands: "tnt.power" (feature.key),
//   "ITEMS.crew.base" or "crew.base", "BLOCKS.gold.val", "SITES.boom.tnt", "RELICS.boom.max", "SETS.camel.pieces",
//   and the old names ("P.tntPower", "tntPower", "UPGRADES.crew.base", "TYPES.gold.val").
// --ab runs the baseline and then the same suite with the override and prints both side by side (diggers + milestones).
// Content definition: G.unlocks(), the list every feature adds to. The rules send ev('unlock') the first time each is reached,
// so a new feature is counted here without an edit. A feature may also bring a bot (use({ bot: { shop(s, api) } })) so the scripted player uses it.
import * as G from '../../proto/game.js';

// ---------- args ----------
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const SEEDS = Number(arg('seeds', 7));
const ONLY = arg('only', 'all');
const QUICK = !!arg('quick', false);
const SET = JSON.parse(arg('set', '{}'));
const AB = arg('ab', null) ? JSON.parse(arg('ab')) : null;

// ---------- overrides ----------
let saved = [];
function restore() { for (const undo of saved.reverse()) undo(); saved = []; }
function applyOv(ov) {
  restore();
  for (const [key, val] of Object.entries(ov)) saved.push(G.setParam(key, val));
}

import { PROFILES, Trk, play, awayFor, newRun, endRun, sample, reseed, UNITS, N_ALL, N_CORE, ALL_IDS, CORE_IDS, WINS, sortN, med, fmtT, fmtN } from './player.mjs';

// ---------- scenarios ----------
const SNAPS = { '3m': 180, '5m': 300, '10m': 600, '20m': 1200, '40m': 2400, '60m': 3600 };

function runActive(profile, seed, capH = 8, snap = false, noCrew = false) {
  const R = newRun(profile, seed, noCrew); const { s, ctx, trk } = R;
  R.snaps = {}; let prevHits = 0, prevT = 0, bossSnapAt = null;
  const cap = capH * 3600;
  const take = (label) => {
    const dtw = Math.max(1, trk.act - prevT), dh = s.hits - prevHits;
    const handHps = dh >= 0 ? dh / dtw : ctx.p.hps;
    R.snaps[label] = { s: structuredClone(s), ctx: structuredClone(ctx), visited: [...trk.visited], handHps, handDps: handHps * G.pickPower(s) * (1 + G.critChance(s) * (G.critMult(s) - 1)), crewDps: s.diggers.length * G.crewRate(s) * G.crewPower(s) };
    prevHits = s.hits; prevT = trk.act;
  };
  while (trk.act < cap) {
    const done = play(s, ctx, 5, trk, { stopAtAll: true });
    if (snap) {
      for (const [label, at] of Object.entries(SNAPS)) if (!R.snaps[label] && trk.act >= at) take(label);
      if (trk.units.has('boss:L1') && bossSnapAt === null) bossSnapAt = trk.act + 60;
      if (bossSnapAt !== null && !R.snaps['BR1+1m'] && trk.act >= bossSnapAt) take('BR1+1m');
    }
    if (done) break;
  }
  return endRun(R);
}

// mixed: 10 min active, then S5 / A30m / S5 / A2h / S5 / A2h / S5 / A8h cycles
function runMixed(seed, days = 14, profile = 'mid') {
  const R = newRun(profile, seed); const { s, ctx, trk } = R;
  let done = play(s, ctx, 600, trk, { stopAtAll: true });
  const cyc = [['s', 300], ['a', 1800], ['s', 300], ['a', 7200], ['s', 300], ['a', 7200], ['s', 300], ['a', 28800]];
  outer: while (!done && trk.real < days * 86400) {
    for (const [k, secs] of cyc) {
      if (k === 's') { done = play(s, ctx, secs, trk, { stopAtAll: true }); } else awayFor(s, ctx, secs, trk);
      if (done || trk.real >= days * 86400) break outer;
    }
  }
  return endRun(R);
}

// idle-only: 10 min active, then the page is closed; every `every` hours a `look`-second visit with no hand.
function runIdle(seed, days = 14, every = 4 * 3600, look = 120, profile = 'mid') {
  const R = newRun(profile, seed); const { s, ctx, trk } = R;
  let done = play(s, ctx, 600, trk, { stopAtAll: true });
  while (!done && trk.real < days * 86400) {
    awayFor(s, ctx, every, trk);
    done = play(s, ctx, look, trk, { hand: false, stopAtAll: true });
  }
  return endRun(R);
}

// ---------- stats helpers ----------
function cell(vals, n) {   // median [min-max] (k/n)
  if (!vals.length) return `never (0/${n})`;
  const b = sortN(vals);
  return `${fmtT(med(vals))} [${fmtT(b[0])}-${fmtT(b[b.length - 1])}]` + (vals.length < n ? ` (${vals.length}/${n})` : '');
}
const pct = (a, b) => b > 0 ? (100 * a / b).toFixed(0) + '%' : '-';
function kth(trk, k, ids, key) {   // time of the k-th earliest unit among ids
  const ts = []; for (const id of ids) { const u = trk.units.get(id); if (u) ts.push(u[key]); }
  ts.sort((x, y) => x - y); return ts.length >= k ? ts[k - 1] : NaN;
}

function milestoneTable(title, runs, ids, N) {
  console.log(`\n${title}  (N=${N} units; median [min-max] over ${Object.values(runs)[0].length} seeds; real clock / attended clock)`);
  console.log('| player | 10% | 30% | 50% | 75% | 100% | final % |');
  console.log('|---|---|---|---|---|---|---|');
  for (const [name, rs] of runs.entries ? runs.entries() : Object.entries(runs)) {
    const row = [name];
    for (const X of [10, 30, 50, 75, 100]) {
      const k = Math.ceil(X * N / 100);
      const rr = rs.map(r => kth(r.trk, k, ids, 'r')).filter(isFinite), aa = rs.map(r => kth(r.trk, k, ids, 'a')).filter(isFinite);
      row.push(rr.length ? `${cell(rr, rs.length)} / ${fmtT(med(aa))}` : `never`);
    }
    const fin = rs.map(r => ids.filter(id => r.trk.units.has(id)).length / N * 100);
    row.push(`${med(fin).toFixed(0)}% [${Math.min(...fin).toFixed(0)}-${Math.max(...fin).toFixed(0)}]`);
    console.log('| ' + row.join(' | ') + ' |');
  }
}
function depthTable(runs) {
  console.log('\nDepth (deepest row ever, metres; 100 m = end of the last ground layer with anything new). Real clock, median [min-max]');
  console.log('| player | 10 m | 30 m | 50 m | 75 m | 100 m | best at end |');
  console.log('|---|---|---|---|---|---|---|');
  for (const [name, rs] of Object.entries(runs)) {
    const row = [name];
    for (const m of [10, 30, 50, 75, 100]) row.push(cell(rs.map(r => r.trk.marks.get('depth ' + m)?.r).filter(x => x !== undefined), rs.length));
    row.push(med(rs.map(r => r.trk.bestEver)).toFixed(0));
    console.log('| ' + row.join(' | ') + ' |');
  }
}
const MARKS = [
  ['first break (any)', r => r.trk.units.get('type:dirt')], ['first ore broken', r => r.trk.marks.get('first ore')], ['first chest found', r => r.trk.marks.get('first chest found')],
  ['first relic', r => r.trk.marks.get('first relic')], ['pick affordable', r => r.trk.marks.get('affordable:pick')], ['digger affordable (30)', r => r.trk.marks.get('affordable:crew')],
  ['first digger bought', r => r.trk.marks.get('first digger bought')], ['crewPow affordable', r => r.trk.marks.get('affordable:crewPow')], ['first TNT broken', r => r.trk.units.get('type:tnt')],
  ['first bone', r => r.trk.marks.get('first bone')], ['first set done', r => r.trk.marks.get('first set')], ['depth 25 (Big Rock 1 reached)', r => r.trk.marks.get('depth 25')],
  ['Big Rock 1 down', r => r.trk.units.get('boss:L1')], ['luck affordable', r => r.trk.marks.get('affordable:luck')], ['layer 2 entered (26 m)', r => r.trk.units.get('layer2')],
  ['first oil gusher', r => r.trk.marks.get('first oil gusher')], ['Big Rock 2 down', r => r.trk.units.get('boss:L2')], ['first New Site', r => r.trk.marks.get('new site #2')],
  ['2nd New Site', r => r.trk.marks.get('new site #3')], ['3rd New Site', r => r.trk.marks.get('new site #4')], ['first gem broken', r => r.trk.units.get('type:gem')],
  ['whale set done', r => r.trk.units.get('set:whale')], ['djinn set done', r => r.trk.units.get('set:djinn')], ['all 13 relics seen', r => { const t = kth(r.trk, 13, Object.keys(G.RELICS).map(x => 'relic:' + x), 'r'); return isFinite(t) ? { r: t } : undefined; }],
  ['all 8 diggers', r => r.trk.units.get('crew:8')], ['Big Rock 3 down', r => r.trk.units.get('boss:L3')], ['layer 4 entered (76 m)', r => r.trk.units.get('layer4')],
  ['last CORE unit', r => { const t = Math.max(...CORE_IDS.map(i => r.trk.units.get(i)?.r ?? -1)); return CORE_IDS.every(i => r.trk.units.has(i)) ? { r: t } : undefined; }],
  ['last unit of any kind (grind incl.)', r => { const v = [...r.trk.units.values()].map(u => u.r); return { r: Math.max(...v) }; }],
];
function timelineTable(runs) {
  console.log('\nTimeline of first-time events, real clock, median [min-max] (k/n = seeds that got there)');
  const names = Object.keys(runs);
  console.log('| event | ' + names.join(' | ') + ' |');
  console.log('|---|' + names.map(() => '---').join('|') + '|');
  for (const [label, f] of MARKS) {
    const row = names.map(n => { const rs = runs[n]; return cell(rs.map(r => f(r)?.r).filter(x => x !== undefined), rs.length); });
    console.log(`| ${label} | ${row.join(' | ')} |`);
  }
}
function diggerWindows(label, rs) {
  console.log(`\nDiggers vs hand by window (${label}; real minutes; medians over ${rs.length} seeds)`);
  console.log('| window | blocks hand | blocks crew | coins earned | coins from crew (+away) | diggers at end | crewPow | pick lvl | hand hits/s |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  WINS.forEach((nm, k) => {
    const ws = rs.map(r => r.trk.win[k]).filter(w => w && w.secs > 10);
    if (!ws.length) return;
    const bs = ws.map(w => w.cb / Math.max(1, w.hb + w.cb) * 100), cs = ws.map(w => (w.cc + w.ac) / Math.max(1, w.tot) * 100);
    const hits = ws.map(w => w.hits / Math.max(1, w.secs));
    console.log(`| ${nm} | ${med(ws.map(w => w.hb)).toFixed(0)} | ${med(ws.map(w => w.cb)).toFixed(0)} (${med(bs).toFixed(0)}%) | ${fmtN(med(ws.map(w => w.tot)))} | ${med(cs).toFixed(0)}% | ${med(ws.map(w => w.dig)).toFixed(1)} | ${med(ws.map(w => w.crewPow)).toFixed(1)} | ${med(ws.map(w => w.pick)).toFixed(1)} | ${med(hits).toFixed(1)} |`);
  });
}
function deadZones(label, rs) {
  console.log(`\nDead zones, ${label}. A gap = >= 90 s attended time with no new thing, no purchase, no relic (this player buys the instant anything is affordable). "New-thing gap" = >= 5 min with no new first-time unit at all.`);
  const f = (g, a, b) => g.filter(x => x.start >= a && x.start < b);
  for (const [a, b, nm] of [[0, 600, '0-10 min'], [600, 1800, '10-30 min'], [1800, 3600, '30-60 min'], [3600, 7200, '60-120 min'], [7200, 1e9, '2 h +']]) {
    const gs = rs.map(r => f(r.trk.gaps, a, b)), us = rs.map(r => f(r.trk.ugaps, a, b));
    console.log(`  ${nm}: purchase gaps >=90s: median ${med(gs.map(g => g.length))} per run, time inside ${fmtT(med(gs.map(g => g.reduce((x, y) => x + y.len, 0))))}, longest ${fmtT(med(gs.map(g => Math.max(0, ...g.map(x => x.len)))))}; new-thing gaps >=5min: ${med(us.map(g => g.length))} per run, longest ${fmtT(med(us.map(g => Math.max(0, ...g.map(x => x.len)))))}`);
  }
  const mid = rs.slice().sort((a, b) => a.trk.ugaps.length - b.trk.ugaps.length)[rs.length >> 1];
  console.log('  median seed, new-thing gaps >=5 min (start -> length): ' + mid.trk.ugaps.slice(0, 14).map(g => `${fmtT(g.start)} -> ${fmtT(g.len)}`).join('; '));
}

const SNAP_LABELS = ['3m', '5m', '10m', '20m', '40m', '60m', 'BR1+1m'];
function cmpSnapshots(runs) {
  console.log('\nHand vs one more digger (mid-pace active; state at the snapshot; nominal damage per second, medians; a snapshot after a New Site shows the fresh run)');
  console.log('| at | diggers | crewPow | next digger cost | pick levels for same coins | hand dmg/s | +hand dmg/s if picks | crew dmg/s total | +dmg/s if digger | digger adds (% of hand) |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const lab of SNAP_LABELS) {
    const ss = runs.map(r => r.snaps[lab]).filter(Boolean); if (!ss.length) continue;
    const rows = ss.map(x => {
      const s = x.s, up = G.UPGRADES;
      const cost = s.up.crew >= up.crew.max ? NaN : G.upgradeCost(s, 'crew');
      let k = 0, sum = 0; while (isFinite(cost) && sum + Math.ceil(up.pick.base * Math.pow(up.pick.grow, s.up.pick + k)) <= cost) { sum += Math.ceil(up.pick.base * Math.pow(up.pick.grow, s.up.pick + k)); k++; }
      return { n: s.diggers.length, cp: s.up.crewPow, cost, k, hand: x.handDps, gainHand: x.handDps * (Math.pow(G.P.powGrow, k) - 1), crew: x.crewDps, add: G.crewRate(s) * G.crewPower(s) };
    });
    const m = f => med(rows.map(f).filter(isFinite));
    console.log('| ' + lab + ' | ' + [m(r => r.n).toFixed(1), m(r => r.cp).toFixed(1), fmtN(m(r => r.cost)), m(r => r.k).toFixed(1), fmtN(m(r => r.hand)), '+' + fmtN(m(r => r.gainHand)), fmtN(m(r => r.crew)), '+' + m(r => r.add).toFixed(2), (100 * m(r => r.add / r.hand)).toFixed(1) + '%'].join(' | ') + ' |');
  }
  const fd = runs.map(r => r.trk.firstDig).filter(Boolean);
  if (fd.length) {
    const m = f => med(fd.map(f));
    console.log(`\nFirst digger at the moment it is first affordable (median of ${fd.length}): t=${fmtT(m(x => x.t))}, price ${m(x => x.cost)}, pick level ${m(x => x.pick)}; the same coins buy ${m(x => x.k)} pick levels = +${m(x => x.gainHand).toFixed(1)} hand dmg/s; the digger adds ${m(x => x.digger).toFixed(2)} dmg/s (hand is ${m(x => x.hand).toFixed(1)} dmg/s)`);
  }
}
function awayCompare(runs) {
  console.log('\nAway vs 5 min of active play from the same state (mid-pace; medians over seeds; coins / metres / chests). BR = seeds where the crew stopped at a Big Rock.');
  console.log('| state at | 5 min active | away 30 min | away 2 h | away 8 h | away 12 h (cap) |');
  console.log('|---|---|---|---|---|---|');
  for (const lab of SNAP_LABELS) {
    const ss = runs.map(r => r.snaps[lab]).filter(Boolean); if (!ss.length) continue;
    const act = ss.map((x, j) => {
      const s = structuredClone(x.s), c = structuredClone(x.ctx); const tr = new Trk(); tr.lastTotal = s.total; tr.bestEver = s.best; tr.visited = new Set(x.visited);
      reseed(99 + j); const b0 = s.best; play(s, c, 300, tr);
      const coins = Object.values(tr.win).reduce((a, w) => a + w.tot, 0);
      return { c: coins, m: tr.bestEver - b0, h: tr.chestN };
    });
    const cols = [act];
    for (const secs of [1800, 7200, 28800, 43200]) cols.push(ss.map((x, j) => { const s = structuredClone(x.s); reseed(500 + j); const o = G.settleAway(s, secs); return { c: o.coins, m: o.metres, h: o.chests, b: o.atBoss }; }));
    const f = a => `${fmtN(med(a.map(x => x.c)))} / ${med(a.map(x => x.m)).toFixed(0)} m / ${med(a.map(x => x.h)).toFixed(0)}` + (a[0].b !== undefined ? ` (BR ${a.filter(x => x.b).length}/${a.length})` : '');
    console.log(`| ${lab} (${med(ss.map(x => x.s.diggers.length)).toFixed(0)} diggers, pick ${med(ss.map(x => x.s.up.pick)).toFixed(0)}) | ${cols.map(f).join(' | ')} |`);
  }
}

// ---------- main ----------
function suite(label, ov) {
  applyOv(ov);
  const out = {};
  const want = k => ONLY === 'all' || ONLY === k || (k === 'active' && ['diggers', 'away'].includes(ONLY));
  const t0 = Date.now(); const seeds = [...Array(SEEDS).keys()].map(i => i + 1);
  const capH = QUICK ? 2 : 8, days = QUICK ? 4 : 14;
  if (want('active')) for (const prof of ['casual', 'slow', 'mid', 'fast']) {
    if (ONLY === 'diggers' && prof !== 'mid') continue;
    out['active-' + prof] = seeds.map(sd => runActive(prof, sd, capH, prof === 'mid'));
    console.error(`[${label}] active-${prof} done ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  if (want('active')) out['active-mid-nodiggers'] = seeds.map(sd => runActive('mid', sd, capH, false, true));
  if (want('mixed')) { out.mixed = seeds.map(sd => runMixed(sd, days)); console.error(`[${label}] mixed done`); }
  if (want('idle')) { out['idle-closed'] = seeds.map(sd => runIdle(sd, days)); console.error(`[${label}] idle done`); }
  restore();
  return out;
}

function report(label, out, ov) {
  console.log(`\n=================== ${label} ${JSON.stringify(ov)} ===================`);
  const groups = cat => { const m = new Map(); for (const u of UNITS) if (u.cat === cat) m.set(u.group, (m.get(u.group) || 0) + 1); return [...m].map(([g, n]) => `${n} ${g}`).join(', '); };
  console.log(`Content: ${N_ALL} units = ${N_CORE} core (${groups('core')}) + ${N_ALL - N_CORE} grind (${groups('grind')}).`);
  milestoneTable('CORE content', out, CORE_IDS, N_CORE);
  milestoneTable('FULL content (core + grind levels)', out, ALL_IDS, N_ALL);
  depthTable(out);
  timelineTable(out);
  if (out['active-mid']) { diggerWindows('active mid', out['active-mid']); }
  if (out['active-slow']) diggerWindows('active slow', out['active-slow']);
  if (out.mixed) diggerWindows('mixed', out.mixed);
  if (out['idle-closed']) diggerWindows('idle-only', out['idle-closed']);
  if (out['active-mid']) { deadZones('active mid', out['active-mid']); cmpSnapshots(out['active-mid']); }
  if (out['active-mid'] && (ONLY === 'all' || ONLY === 'away')) { awayCompare(out['active-mid']); }
  if (out['active-casual']) diggerWindows('active casual', out['active-casual']);
  if (out['active-mid'] && (ONLY === 'all' || ONLY === 'away')) { awayCompare(out['active-mid']); }
}

// compact A/B: what matters for "is the first digger worth buying early, and is the hand still needed"
function abRow(name, out) {
  const rs = out['active-mid'], res = [];
  const t = (r, id) => (r.trk.units.get(id) || r.trk.marks.get(id) || {}).r;
  const mm = f => { const v = rs.map(f).filter(x => x !== undefined && isFinite(x)); return v.length ? fmtT(med(v)) : '-'; };
  const sh = (k) => { const ws = rs.map(r => r.trk.win[k]).filter(w => w && w.secs > 10); return ws.length ? med(ws.map(w => (w.cc + w.ac) / Math.max(1, w.tot) * 100)).toFixed(0) + '%' : '-'; };
  const bs = (k) => { const ws = rs.map(r => r.trk.win[k]).filter(w => w && w.secs > 10); return ws.length ? med(ws.map(w => w.cb / Math.max(1, w.hb + w.cb) * 100)).toFixed(0) + '%' : '-'; };
  const dg = (k) => { const ws = rs.map(r => r.trk.win[k]).filter(w => w && w.secs > 10); return ws.length ? med(ws.map(w => w.dig)).toFixed(1) : '-'; };
  const nd = out['active-mid-nodiggers'];
  const core = (r) => kth(r.trk, Math.ceil(0.5 * N_CORE), CORE_IDS, 'r');
  console.log(`| ${name} | ${mm(r => t(r, 'first digger bought'))} | ${[0, 1, 2, 3].map(k => dg(k) + 'd ' + bs(k) + '/' + sh(k)).join(' | ')} | ${mm(r => t(r, 'boss:L1'))} | ${mm(r => t(r, 'boss:L2'))} | ${mm(r => r.trk.marks.get('depth 100')?.r)} | ${mm(core)} |`);
}
function abTable(rows) {
  console.log('\nA/B (active mid, medians over seeds). Cells: diggers owned at window end, crew share of blocks / crew share of coins.');
  console.log('| variant | 1st digger bought | 0-5 min | 5-10 min | 10-20 min | 20-40 min | Big Rock 1 down | Big Rock 2 down | 100 m | 50% core |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const [n, o] of rows) abRow(n, o);
  abRow('(reference: baseline hand-only, never buys diggers)', { ...rows[0][1], 'active-mid': rows[0][1]['active-mid-nodiggers'] });
}

if (AB) {
  const rows = [];
  const a = suite('base', SET); rows.push(['baseline', a]);
  if (!QUICK && ONLY === 'all') report('BASELINE', a, SET);
  const variants = Array.isArray(AB) ? AB : [AB];
  for (const v of variants) { const ov = { ...SET, ...v }; const b = suite('variant', ov); rows.push([JSON.stringify(v), b]); if (ONLY === 'all' && !QUICK) report('VARIANT', b, ov); }
  abTable(rows);
  if (arg('detail', false)) for (const [n, o] of rows) { console.log('\n--- ' + n); diggerWindows('active mid', o['active-mid']); cmpSnapshots(o['active-mid']); awayCompare(o['active-mid']); }
} else {
  const a = suite('run', SET); report('RUN', a, SET);
}
