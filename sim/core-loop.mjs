// Proof sim (docs/core-loop-plan.md CL-10): the year of sim/redesign played on the real systems in
// js/systems/coreloop/. Same profiles, same player policy, same target checks; only the model is
// swapped for the game's own code, so a pass here says the port is faithful.
//   node sim/core-loop.mjs                    # report for every profile, seed 1
//   node sim/core-loop.mjs --assert           # targets T1-T12 on seeds 1,2,3; exit 1 on a miss
//   node sim/core-loop.mjs --only=casual      # one profile
//   node sim/core-loop.mjs --seeds=4,5,6      # other seeds
//   node sim/core-loop.mjs --compare          # the same year in sim/redesign beside it
//   node sim/core-loop.mjs --days=30          # a shorter run (no target checks)
import { P } from '../js/systems/coreloop/params.js';
import { createCoreLoopState, serializeCoreLoop, deserializeCoreLoop } from '../js/systems/coreloop/state.js';
import { PRESENCE, FIELD, rand, makeContext, fracValue } from '../js/systems/coreloop/shared.js';
import * as Presence from '../js/systems/coreloop/Presence.js';
import * as Well from '../js/systems/coreloop/Well.js';
import * as Fields from '../js/systems/coreloop/Fields.js';
import * as Rigs from '../js/systems/coreloop/Rigs.js';
import * as Refinery from '../js/systems/coreloop/Refinery.js';
import * as Collection from '../js/systems/coreloop/Collection.js';
import * as Cauldrons from '../js/systems/coreloop/Cauldrons.js';
import * as Seals from '../js/systems/coreloop/Seals.js';
import * as Prestige from '../js/systems/coreloop/Prestige.js';
import { PROFILES, presenceAt } from './redesign/profiles.mjs';
import { simulate as simulateModel, checkTargets } from './redesign/run.mjs';

const DAY = 86400;
const YEAR = 365 * DAY * P.years;
const NF = P.fields.length;
const log10Big = (b) => (b.m > 0 ? Math.log10(b.m) + b.e : -Infinity);
// The sim's names for the events its targets count
const KIND = { generator: 'tier', newField: 'field' };

// One simulated player: the game state plus what the sim measures (never part of a save)
function newRun(profile, seed) {
  const run = {
    g: createCoreLoopState(seed), profile, probe: false,
    events: [], monthBest: [], recordMarkLog: -Infinity, recordTimes: [],
    orders: { posted: 0, filledIn24h: 0 }, crudeMade: null, gusherSeen: -1
  };
  run.ctx = makeContext((e) => {
    if (e.kind === 'order' && e.age <= DAY) run.orders.filledIn24h++;
    if (!run.probe) run.events.push({ t: run.g.t, k: KIND[e.kind] || e.kind, lvl: e.level });
  });
  // The sim gives a profile its Charter from the first second; in the game it is picked at the
  // first New Field. Set here so both play the same year.
  run.g.prestige.charter = profile.charter;
  return run;
}

// --- the player's policy (the sim's refineryActions, chooseField) --------------------------------
function postOrders(run) { run.orders.posted += Refinery.postOrders(run.g); }

function vialsPolicy(run) {
  const { g, ctx } = run;
  for (let i = 0; i < NF; i++) {
    for (let grade = 0; grade <= g.fields[i].bestGrade; grade++) {
      if (Collection.canOfferVial(g, i, grade)) Collection.offerVial(g, i, grade, ctx);
    }
  }
  // tier-ups with what open Orders don't need
  for (const key of Object.keys(g.collection.vials)) {
    const cost = Collection.vialUpgradeCost(g, key);
    if (cost !== null && Refinery.surplus(g, FIELD.OASIS) >= cost) Collection.upgradeVial(g, key, ctx);
  }
}

function mixerPolicy(run) {
  const { g, ctx } = run;
  let remade = false;
  for (let i = 0, n = Collection.recipeCount(g); i < n; i++) {
    if (!Collection.recipeFound(g, i)) {
      // curiosity: a recipe whose Materials are in stock is tried P.mixerChance of the visits
      if (Collection.canDiscover(g, i) && rand(g) < P.mixerChance) Collection.discover(g, i, ctx);
      continue;
    }
    if (remade || !Collection.canRemake(g, i)) continue;
    const r = Collection.recipeAt(g, i), cost = Collection.remakeCost(g, i);
    if (Refinery.surplus(g, r.fa) < cost.a || Refinery.surplus(g, r.fb) < cost.b) continue;
    remade = Collection.remake(g, i, ctx);     // one re-make a visit
  }
}

function bubbleLevelsPolicy(run) {
  const g = run.g;
  for (let guard = 0; guard < 200; guard++) {
    const i = Cauldrons.lowestBubble(g);
    if (i < 0 || Refinery.surplus(g, FIELD.OASIS) < Cauldrons.levelCost(g, i)) return;
    if (!Cauldrons.levelBubble(g, i, run.ctx)) return;
  }
}

// Everything the player does with a tap while there: brew, Orders, Vials, Mixer, levels, resets
function refineryActions(run, { resets = true } = {}) {
  const { g, ctx } = run;
  Cauldrons.brewAll(g, ctx);
  postOrders(run);
  Refinery.fillAll(g, ctx);
  Refinery.postWeekly(g);
  Refinery.fillWeekly(g, ctx);
  vialsPolicy(run);
  mixerPolicy(run);
  bubbleLevelsPolicy(run);
  if (!resets) return;
  if (Prestige.suggestChronicle(g)) Prestige.chronicle(g, ctx);
  else if (Prestige.canNewField(g)) Prestige.newField(g, Prestige.suggestedChoice(g), undefined, ctx);
}

// Which Field to work by hand: the one an open Order is shortest on, else the lowest frontier
function chooseField(g) {
  let best = -1, need = 0;
  for (let i = 0; i < NF; i++) {
    let d = 0;
    for (const o of g.refinery.orders) if (!o.empty && o.field === i) d += Math.max(0, o.qty - Fields.countAtLeast(g, i, o.grade));
    if (d > need) { need = d; best = i; }
  }
  if (best >= 0) return best;
  let lo = 0;
  g.fields.forEach((f, i) => { if (f.frontier < g.fields[lo].frontier) lo = i; });
  return lo;
}

// --- one step (the sim's advance) ----------------------------------------------------------------
function advance(run, dt, st) {
  const { g, ctx } = run;
  const here = st === PRESENCE.HANDS;
  const auto = (id) => Prestige.hasAutomation(g, id);
  Presence.step(g, dt, st, ctx);
  let made = Well.step(g, dt, st, ctx);
  // A Gusher that is up is tapped with the profile's chance, once; a catch pays P.gusherSeconds of
  // Watching Crude and Rig output and, as a tap, a look at the Refinery
  if (st === PRESENCE.WATCH && Presence.canCatchGusher(g) && run.gusherSeen !== g.presence.nextGusherAt) {
    run.gusherSeen = g.presence.nextGusherAt;
    if (rand(g) < run.profile.gusherCatch) {
      const pay = Presence.catchGusher(g, ctx);
      const crude = Well.crudePerSecond(g, pay.presence).mul(pay.seconds);
      Well.addCrude(g, crude, ctx);
      made = made.add(crude);
      Rigs.haul(g, pay.seconds, ctx);
      if (!run.probe) refineryActions(run, { resets: false });
    }
  }
  if (run.crudeMade) run.crudeMade = run.crudeMade.add(made);
  Rigs.step(g, dt, st, ctx);
  Cauldrons.step(g, dt, st, ctx);
  Seals.step(g, dt, st, ctx);
  Collection.step(g, dt, st, ctx);
  postOrders(run);
  if (here || (auto('autoWell') && auto('autoBuy'))) Prestige.newWell(g, ctx);
  if (here || auto('autoBuy')) Well.buyMax(g);
  if (here || auto('autoFlare')) Well.flare(g, here && !auto('autoFlare'), ctx);
  if (!run.probe) {
    // a new all-time best run by x10 over the last marked record (the ceiling target, T12)
    const runLog = log10Big(g.well.runCrude);
    if (g.well.runCrude.gte(g.well.bestEver) && runLog > run.recordMarkLog + 1) { run.recordMarkLog = runLog; run.recordTimes.push(g.t); }
    const m = Math.floor(g.t / (30 * DAY));
    if (!(run.monthBest[m] >= runLog)) run.monthBest[m] = runLog;
  }
  g.t += dt;
}

// A step of at most maxDt that ends where the next Gusher comes up: its window (P.gusherWindow) is
// shorter than a Watching step, so a step across it would never see it
function tick(run, maxDt, st) {
  const g = run.g;
  const next = g.presence.nextGusherAt;
  if (st === PRESENCE.WATCH && next > g.t && next - g.t < maxDt) {
    advance(run, next - g.t, st);
    g.t = next;
  } else advance(run, maxDt, st);
}

// Σ units x (grade + 1), for the presence probes
function materialValue(g) {
  let v = 0;
  for (const f of g.fields) f.inventory.forEach((u, grade) => { v += u * (grade + 1); });
  return v;
}

// An hour in one presence state on a copy of the player: no Charter, no Refinery taps
function probe(run, st) {
  const g = deserializeCoreLoop(JSON.parse(JSON.stringify(serializeCoreLoop(run.g))));
  g.prestige.charter = 'none';
  const p = { ...newRun({ ...run.profile, charter: 'none' }, 1), g, probe: true };
  p.ctx = makeContext(() => {});
  p.crudeMade = Well.crudePerSecond(g).mul(0);
  if (st === PRESENCE.HANDS) Presence.setHandField(g, chooseField(g));
  const v0 = materialValue(g), end = g.t + P.probeSeconds;
  while (g.t < end - 1e-6) tick(p, Math.min(P.dt[st], end - g.t), st);
  return { mat: materialValue(g) - v0, crude: p.crudeMade.toNumber() };
}

export function simulate(name, seed = 1, { probes = true, days = 365 * P.years } = {}) {
  const prof = PROFILES[name];
  const run = newRun(prof, seed);
  const g = run.g;
  const END = Math.min(YEAR, days * DAY);
  const sessions = [];
  let cur = null, prev = PRESENCE.AWAY, lastRefine = -Infinity;
  let handsClock = 0, lastHitClock = 0, maxHandsGap = 0, evIdx = 0;
  const probeOut = [], months = [];
  let pi = 0;
  while (g.t < END - 1e-6) {
    const pr = presenceAt(prof, g.t);
    const st = pr.state;
    if (st !== prev) {
      // The player checks the Refinery once more on the way out of a hands-on stretch
      if (prev === PRESENCE.HANDS) refineryActions(run, { resets: false });
      if (st !== PRESENCE.AWAY && prev === PRESENCE.AWAY) { cur = { start: g.t, end: g.t }; sessions.push(cur); }
      if (st === PRESENCE.AWAY) cur = null;
      if (st === PRESENCE.HANDS) {
        Prestige.trials(g, pr.until - g.t, run.ctx);
        refineryActions(run);
        Presence.setHandField(g, chooseField(g));
        lastRefine = g.t;
      }
      prev = st;
    }
    if (st === PRESENCE.HANDS && g.t - lastRefine >= P.refineEvery) {
      refineryActions(run); Presence.setHandField(g, chooseField(g)); lastRefine = g.t;
    }
    const t0 = g.t;
    tick(run, Math.min(P.dt[st], pr.until - g.t, END - g.t), st);
    const dt = g.t - t0;
    if (cur) cur.end = g.t;
    for (; evIdx < run.events.length; evIdx++) if (run.events[evIdx].lvl >= 2) lastHitClock = handsClock;
    if (st === PRESENCE.HANDS) { handsClock += dt; maxHandsGap = Math.max(maxHandsGap, handsClock - lastHitClock); }
    if (probes && pi < P.probeDays.length && g.t >= P.probeDays[pi] * DAY) {
      probeOut.push({
        day: P.probeDays[pi], allRigs: g.fields.every(f => f.rig > 0),
        hands: probe(run, PRESENCE.HANDS), watch: probe(run, PRESENCE.WATCH), away: probe(run, PRESENCE.AWAY)
      });
      pi++;
    }
    const m = Math.floor(g.t / (30 * DAY));
    if (m >= 1 && months.length < m) months.push(snapshot(run, months.length));
  }
  return { name, seed, run, g, sessions, maxHandsGap, probeOut, months };
}

function snapshot(run, month) {
  const g = run.g;
  return {
    month: month + 1, best: run.monthBest[month], generators: g.well.generators,
    grades: g.fields.map(f => f.bestGrade), frac: g.refinery.frac.map((_, i) => fracValue(g, i)),
    bubbles: g.cauldrons.bubbles.length, vials: Object.values(g.collection.vials).filter(v => v.tier > 0).length,
    compounds: Collection.recipesFound(g), seals: g.seals.tier.reduce((x, y) => x + y, 0),
    fields: g.prestige.totalFields, chronicles: g.prestige.chronicles, pages: g.prestige.pages, crew: g.prestige.crew,
    rigs: g.fields.map(f => f.rig), ranks: g.mastery.map(m => m.ranks.reduce((x, y) => x + y, 0))
  };
}

// --- targets: the sim's own checks on the game's year --------------------------------------------
// Every number in the state must be finite (T10; the game has no 1e300 limit to hit)
function finite(g) {
  const w = g.well;
  const bigs = [w.crude, w.runCrude, w.bestEver, w.bestRunChron, w.recordAtChron, ...w.amount];
  return bigs.every(b => Number.isFinite(b.m) && Number.isFinite(b.e))
    && g.fields.every(f => Number.isFinite(f.frontier) && f.inventory.every(Number.isFinite))
    && g.refinery.frac.every((_, i) => Number.isFinite(fracValue(g, i)))
    && g.cauldrons.vats.every(v => Number.isFinite(v.fill) && Number.isFinite(v.speed));
}

export function targets(r) {
  const { run, g } = r;
  return checkTargets({
    name: r.name, sessions: r.sessions, maxHandsGap: r.maxHandsGap, probeOut: r.probeOut,
    s: {
      events: run.events, recordTimes: run.recordTimes, chronicles: g.prestige.chronicles,
      // best run per month as the sim keeps it (a number; the year stays well inside a double)
      monthBest: Array.from(run.monthBest, x => (x === undefined ? undefined : Math.pow(10, x))),
      orderStats: { posted: run.orders.posted, filledIn24h: run.orders.filledIn24h, postedTimes: {} },
      flags: { overflow: !finite(g) }
    }
  });
}

// --- report --------------------------------------------------------------------------------------
const fx = (x) => (x < 100 ? x.toFixed(1) : x.toExponential(0));
function report(r, withTargets) {
  console.log(`\n## ${r.name}`);
  console.log('| month | best run Crude | generators | frontier grade T/M/O | rigs | ranks | Fractions G/N/K/D/B | Bubbles | Vials | Compounds | Seal tiers | New Fields | Chronicles (Pages) |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const m of r.months) {
    console.log(`| ${m.month} | 1e${(m.best ?? 0).toFixed(0)} | ${m.generators} | ${m.grades.join('/')} | ${m.rigs.join('/')} | ${m.ranks.join('/')} | ${m.frac.map(fx).join('/')} | ${m.bubbles} | ${m.vials} | ${m.compounds} | ${m.seals} | ${m.fields} | ${m.chronicles} (${m.pages}) |`);
  }
  const counts = {};
  for (const e of r.run.events) counts[e.k] = (counts[e.k] || 0) + 1;
  console.log('events in the year: ' + Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', '));
  if (!withTargets) return [];
  const res = targets(r);
  for (const t of res) console.log(`${t.ok ? 'PASS' : 'FAIL'} ${t.id} ${t.text}`);
  return res;
}

// The same profile and seed in sim/redesign, side by side
function compare(r) {
  const m = simulateModel(r.name, r.seed, { probes: false });
  const s = m.s, g = r.g, last = (a) => a[a.length - 1];
  const count = (ev, k) => ev.filter(e => e.k === k).length;
  const rows = [
    ['best run, month 1 (log10)', Math.log10(s.monthBest[0]).toFixed(1), r.run.monthBest[0].toFixed(1)],
    ['best run, month 6', Math.log10(s.monthBest[5]).toFixed(1), r.run.monthBest[5].toFixed(1)],
    ['best run, month 12', Math.log10(s.monthBest[11]).toFixed(1), r.run.monthBest[11].toFixed(1)],
    ['generators', s.gens, g.well.generators],
    ['New Wells', s.wells, g.prestige.wells],
    ['New Fields', s.totalFields, g.prestige.totalFields],
    ['Chronicles (Pages)', `${s.chronicles} (${s.pages})`, `${g.prestige.chronicles} (${g.prestige.pages})`],
    ['frontier grade T/M/O', s.fields.map(f => f.bestGrade).join('/'), g.fields.map(f => f.bestGrade).join('/')],
    ['mastery ranks T/M/O', s.fields.map(f => f.ranks.reduce((x, y) => x + y, 0)).join('/'), last(r.months).ranks.join('/')],
    ['Orders filled', count(s.events, 'order'), count(r.run.events, 'order')],
    ['weekly Orders', count(s.events, 'weekly'), count(r.run.events, 'weekly')],
    ['Bubbles', s.bubbles.length, g.cauldrons.bubbles.length],
    ['Vials', Object.values(s.vials).filter(v => v.tier > 0).length, Object.values(g.collection.vials).filter(v => v.tier > 0).length],
    ['Compounds', s.recipes.filter(x => x.found).length, Collection.recipesFound(g)],
    ['Seal tiers', s.seals.tier.reduce((x, y) => x + y, 0), g.seals.tier.reduce((x, y) => x + y, 0)],
    ['Gushers caught', count(s.events, 'gusher'), count(r.run.events, 'gusher')],
    ['Trials won', count(s.events, 'trial'), count(r.run.events, 'trial')]
  ];
  console.log(`\n| ${r.name}, seed ${r.seed} | sim/redesign | real systems |\n|---|---|---|`);
  for (const [what, a, b] of rows) console.log(`| ${what} | ${a} | ${b} |`);
}

if (process.argv[1] && process.argv[1].endsWith('core-loop.mjs')) {
  const arg = (name) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const assert = process.argv.includes('--assert');
  const only = arg('only');
  const seeds = (arg('seeds') || arg('seed') || (assert ? '1,2,3' : '1')).split(',').map(Number);
  const days = Number(arg('days')) || 365 * P.years;
  const fullYear = days >= 365 * P.years;
  const names = Object.keys(PROFILES).filter(n => !only || n === only);
  let fail = 0;
  for (const n of names) {
    for (const seed of seeds) {
      const t0 = Date.now();
      const r = simulate(n, seed, { days });
      if (seeds.length > 1) console.log(`\n(seed ${seed})`);
      fail += report(r, fullYear).filter(x => !x.ok).length;
      if (process.argv.includes('--compare') && fullYear) compare(r);
      console.log(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    }
  }
  if (assert && !fullYear) { console.error('\n--assert needs the whole year'); process.exit(1); }
  if (assert && fail) { console.error(`\n${fail} target(s) failed`); process.exit(1); }
}
