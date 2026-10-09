// Core-loop redesign sim (docs/core-loop-redesign.md; spec and targets in the redesign reference).
//   node sim/redesign/run.mjs                 # report for every profile
//   node sim/redesign/run.mjs --assert        # exit 1 if any target fails
//   node sim/redesign/run.mjs --only=casual   # one profile
//   node sim/redesign/run.mjs --timeline      # first-week event timeline per profile
//   node sim/redesign/run.mjs --seed=7        # another RNG seed
import { P } from './params.mjs';
import { PROFILES, presenceAt } from './profiles.mjs';
import { newState, advance, refineryActions, chooseField, trials, materialValue, openTiers, fracVal } from './model.mjs';

const DAY = 86400;
const YEAR = 365 * DAY * P.years;
const lg = (x) => (x > 0 ? Math.log10(x) : -Infinity);

function probe(s, st) {
  const ev = s.events; s.events = [];
  const c = structuredClone(s);
  s.events = ev;
  c.log = false; c.probe = true; c.heatT = 0; c.charter = 'none';   // probes measure the base design, no Charter
  if (st === 'hands') { c.handField = chooseField(c); }
  const v0 = materialValue(c);
  c.probeCrude = 0;   // counted from zero: a lifetime total would swallow a fresh run's hour
  for (let t = 0; t < P.probeSeconds; t += P.dt[st]) advance(c, P.dt[st], st);
  return { mat: materialValue(c) - v0, crude: c.probeCrude };
}

export function simulate(name, seed = 1, { probes = true, days = 365 * P.years } = {}) {
  const prof = PROFILES[name];
  const s = newState(prof, seed);
  const END = Math.min(YEAR, days * DAY);
  const sessions = [];
  let cur = null, prev = 'away', lastRefine = -Infinity;
  let handsClock = 0, lastHitClock = 0, maxHandsGap = 0, evIdx = 0;
  const probeOut = [];
  let pi = 0;
  const months = [];
  while (s.t < END) {
    const pr = presenceAt(prof, s.t);
    const st = pr.state;
    if (st !== prev) {
      // The player checks the Refinery once more on the way out of a hands-on stretch
      if (prev === 'hands') refineryActions(s, { resets: false });
      if (st !== 'away' && prev === 'away') { cur = { start: s.t, end: s.t }; sessions.push(cur); }
      if (st === 'away') cur = null;
      if (st === 'hands') {
        trials(s, pr.until - s.t);
        refineryActions(s);
        s.handField = chooseField(s);
        lastRefine = s.t;
      }
      prev = st;
    }
    if (st === 'hands' && s.t - lastRefine >= P.refineEvery) {
      refineryActions(s); s.handField = chooseField(s); lastRefine = s.t;
    }
    const dt = Math.min(P.dt[st], pr.until - s.t, END - s.t);
    advance(s, dt, st);
    if (cur) cur.end = s.t;
    for (; evIdx < s.events.length; evIdx++) if (s.events[evIdx].lvl >= 2) lastHitClock = handsClock;
    if (st === 'hands') { handsClock += dt; maxHandsGap = Math.max(maxHandsGap, handsClock - lastHitClock); }
    if (probes && pi < P.probeDays.length && s.t >= P.probeDays[pi] * DAY) {
      probeOut.push({ day: P.probeDays[pi], allRigs: s.fields.every(f => f.rig > 0), hands: probe(s, 'hands'), watch: probe(s, 'watch'), away: probe(s, 'away') });
      pi++;
    }
    const m = Math.floor(s.t / (30 * DAY));
    if (m > months.length - 1 && m >= 1 && months.length < m) {
      months.push({
        month: months.length + 1, best: s.monthBest[months.length], tiers: openTiers(s),
        grades: s.fields.map(f => f.bestGrade), frac: s.frac.map((_, i) => fracVal(s, i)),
        bubbles: s.bubbles.length, vials: Object.values(s.vials).filter(v => v.tier > 0).length,
        compounds: s.recipes.filter(r => r.found).length, seals: s.seals.tier.reduce((x, y) => x + y, 0),
        fields: s.totalFields, chronicles: s.chronicles, pages: s.pages, crew: s.crew,
        rigs: s.fields.map(f => f.rig), ranks: s.fields.map(f => f.ranks.reduce((x, y) => x + y, 0))
      });
    }
  }
  return { name, s, sessions, maxHandsGap, probeOut, months };
}

// --- targets -------------------------------------------------------------------------------------
function maxGap(times, from, to) {
  let g = 0, prev = from;
  for (const t of times) { if (t < from) continue; if (t > to) break; g = Math.max(g, t - prev); prev = t; }
  return Math.max(g, to - prev);
}

export function checkTargets(r) {
  const { s, sessions, name } = r;
  const ev = s.events;
  const big = ev.filter(e => e.lvl >= 2).map(e => e.t);
  const out = [];
  const add = (id, ok, text) => out.push({ id, ok, text });

  // T1 sessions after day 1 with a big hit since the previous session ended
  let withHit = 0, n = 0, bi = 0, prevEnd = 0;
  for (const se of sessions) {
    if (se.start >= DAY) {
      n++;
      while (bi < big.length && big[bi] <= prevEnd) bi++;
      if (bi < big.length && big[bi] <= se.end) withHit++;
    }
    prevEnd = se.end;
  }
  const t1 = n ? withHit / n : 0;
  // Diagnostic (not a target): the same with Orders left out, since one Order is a small x1.015 step
  const bigNoOrder = ev.filter(e => e.lvl >= 2 && e.k !== 'order').map(e => e.t);
  let w2 = 0, b2 = 0, pe2 = 0;
  for (const se of sessions) {
    if (se.start >= DAY) { while (b2 < bigNoOrder.length && bigNoOrder[b2] <= pe2) b2++; if (b2 < bigNoOrder.length && bigNoOrder[b2] <= se.end) w2++; }
    pe2 = se.end;
  }
  add('(info)', true, `sessions with a big hit other than an Order: ${(100 * (n ? w2 / n : 0)).toFixed(1)}%`);
  add('T1', t1 >= 0.95, `sessions with a big hit: ${(100 * t1).toFixed(1)}% of ${n}`);

  // T2 hands-on stretch without a big hit
  const t2 = r.maxHandsGap / 60;
  add('T2', !['active', 'casual'].includes(name) || t2 <= 60, `longest hands-on time without a big hit: ${t2.toFixed(0)} min`);

  // T3 / T4 novelty gaps
  const nov3 = ev.filter(e => e.lvl >= 3).map(e => e.t);
  const nov4 = ev.filter(e => e.lvl >= 4).map(e => e.t);
  const g3 = maxGap(nov3, DAY, YEAR) / DAY, g4 = maxGap(nov4, 7 * DAY, YEAR) / DAY;
  add('T3', g3 <= 3, `longest gap between L3 novelties: ${g3.toFixed(1)} d`);
  add('T4', g4 <= 14, `longest gap between L4 moments: ${g4.toFixed(1)} d`);

  // T5 presence value ratios (Material value per hour), from day 7
  // The ratio target is for the designed balance with automation in place: checked once every Field has a Rig
  const ratios = r.probeOut.map(p => ({ day: p.day, allRigs: p.allRigs, hw: p.hands.mat / p.watch.mat, wa: p.watch.mat / p.away.mat, away: p.away.mat, awayCrude: p.away.crude }));
  const okR = ratios.every(x => (x.day < 7 || !x.allRigs || (x.hw >= 2 && x.hw <= 4.5 && x.wa >= 2 && x.wa <= 4.5 && x.away > 0)) && x.awayCrude > 0);
  add('T5', okR, 'hands/watch, watch/away: ' + ratios.map(x => (x.away > 0 ? `d${x.day} ${x.hw.toFixed(1)}/${x.wa.toFixed(1)}${x.allRigs ? '' : ' (not all Fields have Rigs)'}` : `d${x.day} no Rigs yet`)).join(', '));

  // T6 best run Crude rises every month
  const mb = s.monthBest.slice(0, 12);
  let ups = 0;
  for (let i = 1; i < mb.length; i++) if (mb[i] > mb[i - 1]) ups++;
  add('T6', ups === mb.length - 1, `months above the previous: ${ups} of ${mb.length - 1}; peaks ${mb.map(x => lg(x).toFixed(0)).join(' ')}`);

  // T12 the ceiling keeps rising: a new all-time best run x10 over the last record at least every 30 days
  const g12 = maxGap(s.recordTimes, DAY, YEAR) / DAY;
  add('T12', g12 <= 30, `longest wait for a new x10 record: ${g12.toFixed(1)} d`);

  // T7 Orders filled within 24 h
  const t7 = s.orderStats.filledIn24h / Math.max(1, s.orderStats.posted - P.orderSlots);
  add('T7', t7 >= 0.9, `Orders filled within 24 h: ${(100 * t7).toFixed(0)}% of ${s.orderStats.posted}`);

  // T8 Bubbles
  const bub = ev.filter(e => e.k === 'bubble').map(e => e.t);
  const day0 = bub.filter(t => t < DAY).length;
  const gb = maxGap(bub, DAY, 180 * DAY) / DAY;
  add('T8', (!['active', 'casual'].includes(name) || day0 >= 8) && gb <= 3, `Bubbles on day 0: ${day0}; longest gap days 1-180: ${gb.toFixed(1)} d`);

  // T9 Chronicles and reset gaps
  const resets = ev.filter(e => e.k === 'field' || e.k === 'chronicle').map(e => e.t);
  const gr = maxGap(resets, 0, 270 * DAY) / DAY;
  // 6-24 a year: fewer is a stalled top layer, more than ~2 a month is reset spam
  add('T9', s.chronicles >= 6 && s.chronicles <= 24 && gr <= 14, `Chronicles ${s.chronicles}; longest gap between New Fields/Chronicles to day 270: ${gr.toFixed(1)} d`);

  // T10 numbers stay finite
  add('T10', !s.flags.overflow, s.flags.overflow ? 'overflow or NaN' : 'finite');
  return out;
}

// --- report --------------------------------------------------------------------------------------
function report(r) {
  const { s, months } = r;
  console.log(`\n## ${r.name}`);
  console.log('| month | best run Crude | tiers | frontier grade T/M/O | rigs | ranks | Fractions G/N/K/D/B | Bubbles | Vials | Compounds | Seal tiers | New Fields | Chronicles (Pages) |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const m of months) {
    console.log(`| ${m.month} | 1e${lg(m.best).toFixed(0)} | ${m.tiers} | ${m.grades.join('/')} | ${m.rigs.join('/')} | ${m.ranks.join('/')} | ${m.frac.map(x => x < 100 ? x.toFixed(1) : x.toExponential(0)).join('/')} | ${m.bubbles} | ${m.vials} | ${m.compounds} | ${m.seals} | ${m.fields} | ${m.chronicles} (${m.pages}) |`);
  }
  const counts = {};
  for (const e of s.events) counts[e.k] = (counts[e.k] || 0) + 1;
  console.log('events in the year: ' + Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', '));
  const res = checkTargets(r);
  for (const t of res) console.log(`${t.ok ? 'PASS' : 'FAIL'} ${t.id} ${t.text}`);
  return res;
}

function timeline(r) {
  const H = 3600;
  const buckets = [];
  for (let h = 0; h < 24; h += 2) buckets.push([h * H, (h + 2) * H]);
  for (let h = 24; h < 168; h += 12) buckets.push([h * H, (h + 12) * H]);
  console.log(`\n## ${r.name}: first week`);
  for (const [a, b] of buckets) {
    const ev = r.s.events.filter(e => e.t >= a && e.t < b && e.lvl >= 2);
    if (!ev.length) { console.log(`${(a / H).toFixed(0).padStart(4)}h | -`); continue; }
    const c = {};
    for (const e of ev) c[e.k] = (c[e.k] || 0) + 1;
    const tiers = ev.filter(e => e.k === 'tier').map(e => 'T' + e.tier);
    console.log(`${(a / H).toFixed(0).padStart(4)}h | ${Object.entries(c).map(([k, v]) => `${k} ${v}`).join(', ')}${tiers.length ? ' | new ' + tiers.join(',') : ''}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('run.mjs')) {
  const only = process.argv.find(a => a.startsWith('--only='))?.slice(7);
  // --seeds=1,2,3 runs each profile on several seeds (the default for --assert): the model is chaotic
  // around its thresholds, so a target only counts as met if it holds on every seed
  const seedArg = process.argv.find(a => a.startsWith('--seeds='))?.slice(8) || process.argv.find(a => a.startsWith('--seed='))?.slice(7);
  const seeds = (seedArg || (process.argv.includes('--assert') ? '1,2,3' : '1')).split(',').map(Number);
  const names = Object.keys(PROFILES).filter(n => !only || n === only);
  let fail = 0;
  for (const n of names) {
    for (const seed of seeds) {
      const t0 = Date.now();
      const r = simulate(n, seed);
      if (seeds.length > 1) console.log(`
(seed ${seed})`);
      if (process.argv.includes('--timeline')) timeline(r);
      const res = report(r);
      fail += res.filter(x => !x.ok).length;
      console.log(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    }
  }
  if (process.argv.includes('--assert') && fail) { console.error(`\n${fail} target(s) failed`); process.exit(1); }
}
