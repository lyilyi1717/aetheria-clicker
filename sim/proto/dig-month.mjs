// Dig prototype: the first month, for three players, against the pacing curve (docs/dig-pacing.md).
// It plays the real rules with the scripted player of player.mjs; time away is settled by the rules.
// Usage:
//   node sim/proto/dig-month.mjs                         3 seeds x 3 players x 30 days (about 2 min on 8 cores)
//   node sim/proto/dig-month.mjs --assert                exit 1 if a headline target is missed (see TARGETS, LIMITS, TOL)
//   node sim/proto/dig-month.mjs --seeds 5 --days 30 --only mixed
//   node sim/proto/dig-month.mjs --set '{"core.starExp":0.55}'          override numbers for the run
//   node sim/proto/dig-month.mjs --ab '{"core.grow.0.step":4}'          baseline and variant, ladders side by side
//   node sim/proto/dig-month.mjs --without relics2                       the same month with one feature's relics never offered
//   node sim/proto/dig-month.mjs --dt 0.1                coarser attended step: twice as fast; early times move by up to ~10%
//   node sim/proto/dig-month.mjs --jobs 4                worker processes (default: cores - 1)
// A key of --set / --ab is any path G.setParam understands ("core.grow.1.hp", "boss.layerHp", "contracts.openSites").
import { fork } from 'node:child_process';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import * as G from '../../proto/game.js';
import { play, awayFor, newRun, endRun, med, sortN, fmtT, fmtN, N_CORE, CORE_IDS, MOVE, PROFILES } from './player.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const SEEDS = Number(arg('seeds', 3)), DAYS = Number(arg('days', 30)), ONLY = arg('only', 'all');
const SET = JSON.parse(arg('set', '{}')), AB = arg('ab', null) ? JSON.parse(arg('ab')) : null;
const ASSERT = !!arg('assert', false), DT = Number(arg('dt', 0.05));
// --without relics2: the relics a feature owns are never offered (to see what a package does to the curve)
for (const f of String(arg('without', '')).split(',').filter(Boolean)) for (const r of Object.values(G.RELICS)) if (r.owner === f) SET[`RELICS.${r.id}.max`] = 0;
const JOBS = Math.max(1, Number(arg('jobs', Math.max(1, os.cpus().length - 1))));
const H = 3600, D = 86400;

// ---------- the three players ----------
// at: hours of the day a session starts (the clock starts at the first one); len: minutes of each;
// first: minutes of the very first session. Away gaps longer than the rules' cap simply stop paying.
export const PLAYERS = {
  active: { profile: 'mid',  at: [19],            len: 90, first: 90, note: 'one long session a day (90 min)' },
  mixed:  { profile: 'mid',  at: [8, 13, 18, 22], len: 12,  first: 15,  note: 'four 12 minute sessions a day (the main target)' },
  idle:   { profile: 'slow', at: [8, 20],         len: 4,   first: 10,  note: 'two 4 minute visits a day' },
};

// ---------- the ladder: when each thing should arrive ----------
// One row: [id, label, how to read it from a run, { player: [lo, hi] }, clock, headline]
// clock 'a' = attended minutes, 'd' = real days. A headline row is checked by --assert.
// --assert fails when the median over seeds is below lo x (1 - TOL) or above hi x (1 + TOL), or when
// fewer than half the seeds get there at all.
export const TOL = 0.25;
const unit = id => R => R.units[id], mark = id => R => R.marks[id];
const rock = n => R => R.marks['boss down ' + n];
export const TARGETS = [
  ['rock1',   'Big Rock 1 down (25 m)',            rock(1),               { active: [2.5, 4.5], mixed: [2.5, 4.5], idle: [3, 6] },        'a', true],
  ['rock2',   'Big Rock 2 down (50 m), water',     rock(2),               { active: [6, 12], mixed: [6, 12], idle: [7, 15] },            'a', true],
  ['site1',   'first New Site, Star Shop',         mark('new site #2'),   { active: [9, 20], mixed: [9, 20], idle: [10, 30] },           'a', true],
  ['foreman', 'Foreman',                           unit('foreman'),       { active: [12, 45], mixed: [12, 45], idle: [12, 60] },         'a', true],
  ['forge',   'Forge opens',                       unit('forge:open'),    { active: [12, 45], mixed: [12, 45], idle: [12, 60] },         'a', false],
  ['site3',   '3rd New Site',                      mark('new site #4'),   { active: [30, 90], mixed: [30, 90], idle: [30, 120] },        'a', false],
  ['rock3',   'Big Rock 3 down (75 m), crystal',   rock(3),               { active: [0.02, 1.2], mixed: [0.4, 2.5], idle: [2, 7] },       'd', true],
  ['contracts', 'Contracts open',                  unit('contracts:open'), { active: [0.8, 2.5], mixed: [1.5, 3.5], idle: [6, 16] },     'd', true],
  ['rock4',   'Big Rock 4 down (100 m), the Deep', rock(4),               { active: [1.5, 4], mixed: [3, 5.5], idle: [8, 18] },          'd', true],
  ['rock5',   'Big Rock 5 down (125 m)',           rock(5),               { active: [4, 8], mixed: [7, 11], idle: null },            'd', true],
  ['rock6',   'Big Rock 6 down (150 m)',           rock(6),               { active: [7, 13], mixed: [11, 17], idle: null },              'd', true],
  ['rock7',   'Big Rock 7 down (175 m)',           rock(7),               { active: [11, 18], mixed: [16, 23], idle: null },             'd', true],
  ['rock8',   'Big Rock 8 down (200 m)',           rock(8),               { active: [15, 24], mixed: [21, 30], idle: null },             'd', true],
];
// other things --assert checks (the numbers are in docs/dig-pacing.md)
export const LIMITS = {
  earlyGap: 150,      // s: longest attended stretch with nothing bought, found or beaten, first 30 attended minutes
  lateGap: 300,       // s: the same, afterwards (the 95th percentile of gaps; one long Rock fight is allowed)
  movesPerDay: { mixed: [1.5, 6], active: [2, 9], idle: [0.4, 2.5] },   // New Sites a day, days 2 to 30
};

// ---------- one run ----------
function runOne(player, seed, days, ov) {
  for (const [k, v] of Object.entries(ov || {})) G.setParam(k, v);
  const P = PLAYERS[player];
  const R = newRun(P.profile, seed * 31 + Object.keys(PLAYERS).indexOf(player)); const { s, ctx, trk } = R;
  const end = days * D, opts = { dt: DT, canLeave: true };
  const series = [];
  const snap = day => series.push({ day, best: trk.bestEver, moves: trk.resets.length, stars: s.stars + (s.starSpent || 0), act: trk.act, units: CORE_IDS.filter(id => trk.units.has(id)).length });
  let day = 0, first = true, nextSnap = D;
  const t0 = P.at[0] * H;                              // the clock starts at the first session
  outer: for (;; day++) {
    for (const h of P.at) {
      const start = day * D + h * H - t0;
      if (start >= end) break outer;
      if (start > trk.real + 1) awayFor(s, ctx, start - trk.real, trk);
      while (trk.real >= nextSnap) { snap(nextSnap / D); nextSnap += D; }
      trk.sessions++;
      play(s, ctx, (first ? P.first : P.len) * 60, trk, opts);
      first = false;
    }
  }
  while (nextSnap <= end) { snap(nextSnap / D); nextSnap += D; }
  endRun(R);
  const obj = m => Object.fromEntries([...m].map(([k, v]) => [k, { r: +v.r.toFixed(1), a: +v.a.toFixed(1) }]));
  return {
    player, seed, units: obj(trk.units), marks: obj(trk.marks), resets: trk.resets, series, src: trk.src, shim: trk.starShim,
    goalGaps: trk.goalGaps, act: trk.act, best: trk.bestEver, stars: s.stars + (s.starSpent || 0),
    core: CORE_IDS.filter(id => trk.units.has(id)).length, lastCore: Math.max(0, ...CORE_IDS.map(id => trk.units.get(id)?.r ?? 0)),
    dmg: R.dmg, won: Object.keys(s.contractsWon || {}).length, left: trk.left, sessions: trk.sessions,
  };
}

// ---------- many runs, in worker processes ----------
if (arg('one', null)) {
  const [player, seed] = String(arg('one')).split(':');
  const out = runOne(player, Number(seed), DAYS, JSON.parse(arg('ov', '{}')));
  process.send ? process.send(out) : console.log(JSON.stringify(out));
} else main();

function runAll(ov) {
  const players = Object.keys(PLAYERS).filter(p => ONLY === 'all' || ONLY === p);
  const tasks = [];
  for (const p of players) for (let sd = 1; sd <= SEEDS; sd++) tasks.push([p, sd]);
  tasks.sort((a, b) => PLAYERS[b[0]].len * PLAYERS[b[0]].at.length - PLAYERS[a[0]].len * PLAYERS[a[0]].at.length);   // the long ones first
  const res = [], self = fileURLToPath(import.meta.url);
  return new Promise((done, fail) => {
    let live = 0, next = 0;
    const pump = () => {
      while (live < JOBS && next < tasks.length) {
        const [p, sd] = tasks[next++]; live++;
        const ch = fork(self, ['--one', `${p}:${sd}`, '--days', String(DAYS), '--dt', String(DT), '--ov', JSON.stringify(ov)], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
        let got = false;
        ch.on('message', m => { got = true; res.push(m); });
        ch.on('exit', code => { live--; if (!got) return fail(new Error(`run ${p}:${sd} died (${code})`)); process.stderr.write('.'); if (next >= tasks.length && !live) { process.stderr.write('\n'); done(res); } else pump(); });
      }
    };
    pump();
  });
}

// ---------- the report ----------
const by = (res, p) => res.filter(r => r.player === p).sort((a, b) => a.seed - b.seed);
const fmtA = m => (m < 90 ? m.toFixed(1) + ' min' : (m / 60).toFixed(1) + ' h');
const fmtD = d => (d < 1 ? (d * 24).toFixed(1) + ' h' : 'day ' + d.toFixed(1));
function ladderRows(res) {
  const out = [];
  for (const [id, label, get, want, clock, head] of TARGETS) {
    const row = { id, label, clock, head, cells: {} };
    for (const p of Object.keys(PLAYERS)) {
      const rs = by(res, p); if (!rs.length) continue;
      const vals = rs.map(r => get(r)).filter(Boolean).map(v => (clock === 'a' ? v.a / 60 : v.r / D));
      const m = vals.length ? med(vals) : NaN, w = want[p];
      let ok = null;
      if (w) ok = vals.length * 2 >= rs.length && m >= w[0] * (1 - TOL) && m <= w[1] * (1 + TOL);
      const inside = w && vals.length * 2 >= rs.length && m >= w[0] && m <= w[1];
      row.cells[p] = { m, n: vals.length, of: rs.length, lo: vals.length ? Math.min(...vals) : NaN, hi: vals.length ? Math.max(...vals) : NaN, want: w, ok, inside };
    }
    out.push(row);
  }
  return out;
}
function printLadder(title, res) {
  const f = (v, clock) => (!isFinite(v) ? 'never' : clock === 'a' ? fmtA(v) : fmtD(v));
  const players = Object.keys(PLAYERS).filter(p => by(res, p).length);
  console.log(`\n${title}\nThe ladder: target, then simulated (median [min to max] over seeds). a = attended time, d = real days.`);
  console.log('Verdict: ok = inside the target; near = outside it but within the ' + TOL * 100 + '% tolerance of --assert; MISS = outside the tolerance; (blank) = no target.');
  console.log('| step | ' + players.map(p => `${p}: target | ${p}: simulated | `).join('') + '');
  console.log('|---|' + players.map(() => '---|---|').join(''));
  const rows = ladderRows(res);
  for (const row of rows) {
    const cells = players.map(p => {
      const c = row.cells[p];
      const w = c.want ? `${f(c.want[0], row.clock).replace('day ', '')} to ${f(c.want[1], row.clock)}` : 'not this month';
      const v = c.n ? `${f(c.m, row.clock)} [${f(c.lo, row.clock).replace('day ', '')} to ${f(c.hi, row.clock).replace('day ', '')}]${c.n < c.of ? ` (${c.n}/${c.of})` : ''}` : `never (0/${c.of})`;
      const verdict = c.ok === null ? '' : c.inside ? ' ok' : c.ok ? ' near' : ' MISS';
      return `${w} | ${v}${verdict}${row.head ? '' : ' (not asserted)'} | `;
    });
    console.log(`| ${row.label} | ${cells.join('')}`);
  }
  return rows;
}
function gapStats(rs) {
  const early = rs.map(r => Math.max(0, ...r.goalGaps.filter(g => g.start < 1800).map(g => g.len)));
  const late = rs.map(r => { const g = sortN(r.goalGaps.filter(x => x.start >= 1800).map(x => x.len)); return g.length ? g[Math.floor(0.95 * (g.length - 1))] : 0; });
  const lateMax = rs.map(r => Math.max(0, ...r.goalGaps.filter(g => g.start >= 1800).map(g => g.len)));
  const lateN = rs.map(r => r.goalGaps.filter(g => g.start >= 1800 && g.len > LIMITS.lateGap).length);
  const lateShare = rs.map(r => r.goalGaps.filter(g => g.start >= 1800 && g.len > LIMITS.lateGap).reduce((a, g) => a + g.len, 0) / Math.max(1, r.act - 1800));
  return { early: med(early), late: med(late), lateMax: med(lateMax), lateN: med(lateN), lateShare: med(lateShare) };
}
function moveStats(rs) {
  const perDay = rs.map(r => r.resets.filter(x => x.r >= D).length / Math.max(1, DAYS - 1));
  // how much deeper each dig got than the deepest before it
  const gains = rs.map(r => { let top = 0; const g = []; for (const x of r.resets) { if (x.contract) continue; if (top) g.push(x.best - top); top = Math.max(top, x.best); } return g; });
  const deeper = gains.map(g => g.filter(x => x > 0).length / Math.max(1, g.length));
  return { perDay: med(perDay), deeper: med(deeper), total: med(rs.map(r => r.resets.length)), mean: med(gains.map(g => g.reduce((a, b) => a + b, 0) / Math.max(1, g.length))) };
}
function report(title, res) {
  const players = Object.keys(PLAYERS).filter(p => by(res, p).length);
  const rows = printLadder(title, res);
  const shim = res.some(r => r.shim > 0);
  if (shim) console.log('\nNOTE: the sites feature does not pay Stars by the core curve yet (G.starsAt): the sim paid the difference at every New Site.\n      Until `starsFor` in proto/features/sites/rules.js reads G.starsAt(s.best), the game on the page is slower than this report after the first few moves.');

  console.log('\nDepth, New Sites and Stars over time (median over seeds): deepest metre ever / New Sites so far / Stars ever earned / core content found');
  const days = [1, 2, 3, 5, 7, 10, 14, 18, 21, 25, 30].filter(d => d <= DAYS);
  console.log('| player | ' + days.map(d => 'day ' + d).join(' | ') + ' |');
  console.log('|---|' + days.map(() => '---').join('|') + '|');
  for (const p of players) {
    const rs = by(res, p);
    console.log(`| ${p} | ` + days.map(d => { const xs = rs.map(r => r.series.find(x => x.day === d)).filter(Boolean); return xs.length ? `${med(xs.map(x => x.best))} m / ${med(xs.map(x => x.moves))} / ${fmtN(med(xs.map(x => x.stars)))} / ${(100 * med(xs.map(x => x.units)) / N_CORE).toFixed(0)}%` : '-'; }).join(' | ') + ' |');
  }

  console.log('\nNew Sites (median over seeds; "deeper" = share of moves whose dig had got deeper than every dig before it; days 2 on for the rate)');
  console.log('| player | attended in the month | New Sites | a day | deeper | mean metres gained per move | contracts won | core content at the end | last new core thing |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  const stats = {};
  for (const p of players) {
    const rs = by(res, p), m = moveStats(rs), g = gapStats(rs); stats[p] = { m, g };
    console.log(`| ${p} | ${fmtT(med(rs.map(r => r.act)))} | ${m.total} | ${m.perDay.toFixed(1)} | ${(100 * m.deeper).toFixed(0)}% | ${m.mean.toFixed(1)} | ${med(rs.map(r => r.won))} | ${(100 * med(rs.map(r => r.core)) / N_CORE).toFixed(0)}% | ${fmtD(med(rs.map(r => r.lastCore)) / D)} |`);
  }

  console.log(`\nDead zones: attended stretches with nothing bought, found or beaten (a purchase, a relic, a chest, a new bone or piece, a Big Rock, a move, any first time). Limits: ${LIMITS.earlyGap} s in the first 30 attended minutes, ${LIMITS.lateGap} s after (95th percentile).`);
  console.log('| player | longest in the first 30 min | later: 95th percentile | later: longest | later: stretches over the limit | share of attended time inside them |');
  console.log('|---|---|---|---|---|---|');
  for (const p of players) { const g = stats[p].g; console.log(`| ${p} | ${fmtT(g.early)} | ${fmtT(g.late)} | ${fmtT(g.lateMax)} | ${g.lateN} | ${(100 * g.lateShare).toFixed(1)}% |`); }

  console.log('\nWhere the coins come from (share of all coins earned in the month, median over seeds). Coins grow so fast with depth that this is the last days\' share; "tools" = Forge tools.');
  console.log('| player | hand | Rafeeqs (attended) | tools | away |');
  console.log('|---|---|---|---|---|');
  for (const p of players) {
    const rs = by(res, p), sh = k => med(rs.map(r => { const t = r.src.hand + r.src.crew + r.src.tools + r.src.away; return t ? 100 * r.src[k] / t : 0; })).toFixed(0) + '%';
    console.log(`| ${p} | ${sh('hand')} | ${sh('crew')} | ${sh('tools')} | ${sh('away')} |`);
  }

  console.log('\nWhere the damage to the ground comes from (attended play; share of the ground\'s hp taken, median over seeds). "effects" = blasts, lines, tools, relics, fire, falling blocks; a Big Rock is counted apart.');
  console.log('| player | ground: your swings | ground: effects | Big Rock: your swings | Big Rock: effects |');
  console.log('|---|---|---|---|---|');
  for (const p of players) {
    const rs = by(res, p), sh = (a, b) => med(rs.map(r => { const t = r.dmg[a] + r.dmg[b]; return t ? 100 * r.dmg[a] / t : 0; }));
    const g = sh('hand', 'fx'), b = sh('rockHand', 'rockFx');
    console.log(`| ${p} | ${g.toFixed(0)}% | ${(100 - g).toFixed(0)}% | ${b.toFixed(0)}% | ${(100 - b).toFixed(0)}% |`);
  }

  for (const p of players) {
    const rs = by(res, p), r = rs[rs.length >> 1];
    console.log(`\n${p}, seed ${r.seed}: every New Site (day: depth reached -> Stars paid; c = a contract; in brackets: Stars he had / Stars the model says it takes to stand there)`);
    console.log('  ' + r.resets.map(x => `${(x.r / D).toFixed(1)}: ${x.best} m -> ${fmtN(x.gain)}${x.contract ? ' c' : ''} (${fmtN(x.had)}/${fmtN(x.need)})`).join('; '));
  }

  // ---------- checks ----------
  const fails = [];
  for (const row of rows) if (row.head) for (const p of players) { const c = row.cells[p]; if (c.ok === false) fails.push(`${p}: ${row.label}: ${c.n ? (row.clock === 'a' ? fmtA(c.m) : fmtD(c.m)) : 'never'}, target ${c.want.join(' to ')} ${row.clock === 'a' ? 'min' : 'days'}`); }
  for (const p of players) {
    const { m, g } = stats[p], w = LIMITS.movesPerDay[p];
    if (g.early > LIMITS.earlyGap * (1 + TOL)) fails.push(`${p}: a dead stretch of ${fmtT(g.early)} in the first 30 minutes (limit ${LIMITS.earlyGap} s)`);
    if (p !== 'idle' && g.late > LIMITS.lateGap * (1 + TOL)) fails.push(`${p}: later dead stretches, 95th percentile ${fmtT(g.late)} (limit ${LIMITS.lateGap} s)`);
    if (DAYS >= 14 && (m.perDay < w[0] * (1 - TOL) || m.perDay > w[1] * (1 + TOL))) fails.push(`${p}: ${m.perDay.toFixed(1)} New Sites a day (target ${w.join(' to ')})`);
  }
  console.log(fails.length ? `\n${fails.length} target(s) missed by more than ${TOL * 100}%:\n  ` + fails.join('\n  ') : `\nAll headline targets hold within ${TOL * 100}%.`);
  return fails;
}

async function main() {
  const t0 = Date.now();
  console.log(`Dig, the first ${DAYS} days. ${SEEDS} seed(s), step ${DT} s. Players: ` + Object.entries(PLAYERS).map(([k, v]) => `${k} = ${v.note}`).join('; ') + '.');
  console.log(`Move policy (player.mjs): stalled ${PROFILES.mid.stall} s (mid), next level more than ${MOVE.far} s of income away, Stars on offer at least ${MOVE.share * 100}% of all Stars so far; or stalled ${MOVE.giveUp} s.`);
  const base = await runAll(SET);
  const fails = report(`=== ${AB ? 'BASELINE' : 'RUN'} ${JSON.stringify(SET)} ===`, base);
  if (AB) for (const v of (Array.isArray(AB) ? AB : [AB])) { const ov = { ...SET, ...v }; report(`=== VARIANT ${JSON.stringify(v)} ===`, await runAll(ov)); }
  console.error(`(${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  if (ASSERT && fails.length) process.exit(1);
}
