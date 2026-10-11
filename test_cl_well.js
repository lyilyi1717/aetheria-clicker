// CL-8: the Well (js/systems/coreloop/Well.js) against the sim's wellStep, tierRate, wellMult,
// buyAll, maybeFlare and unlockGenerators (sim/redesign/model.mjs), and past the double range
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { P } from './js/systems/coreloop/params.js';
import { createCoreLoopState, serializeCoreLoop, deserializeCoreLoop } from './js/systems/coreloop/state.js';
import { PRESENCE, FRAC, HIT, makeContext } from './js/systems/coreloop/shared.js';
import * as Well from './js/systems/coreloop/Well.js';
import {
  newState as simState, wellStep, tierRate, wellMult, buyAll, maybeFlare, unlockGenerators,
  resetRun as simResetRun, crudePerSec
} from './sim/redesign/model.mjs';
import { PROFILES } from './sim/redesign/profiles.mjs';

const TOL = 1e-9;
const log10 = (b) => Math.log10(b.m) + b.e;
// Relative difference of a BigNum and the sim's double
function rel(big, num) {
  if (num === 0) return big.m === 0 ? 0 : Infinity;
  if (big.m === 0) return Infinity;
  return Math.abs(Math.pow(10, log10(big) - Math.log10(num)) - 1);
}
const close = (big, num, what, tol = TOL) => assert.ok(rel(big, num) <= tol, `${what}: game ${big.toString()} vs sim ${num} (rel ${rel(big, num)})`);

// The sim's Well state as a game state (the names differ: README.md "Game vs sim")
function toGame(s) {
  const g = createCoreLoopState();
  g.t = s.t;
  const w = g.well;
  w.crude = new BigNum(s.crude); w.runCrude = new BigNum(s.runCrude); w.runStart = s.runStart;
  w.bought = [...s.b]; w.amount = s.a.map(x => new BigNum(x));
  w.pressure = s.pressure; w.pressureBest = s.pressureBest; w.flare = s.flare; w.generators = s.gens;
  w.bestEver = new BigNum(s.bestEver); w.bestRunChron = new BigNum(s.bestRunChron);
  Object.assign(g.prestige, { reserves: s.resLife, shares: s.shares, pages: s.pages });
  g.refinery.frac.forEach((f, i) => { f.level = s.frac[i].level; f.bubble = s.frac[i].bub; f.vial = s.frac[i].vial; f.compound = s.frac[i].extra; });
  g.presence.heatSeconds = s.heatT;
  return g;
}

// A sim player far into the year: enough layers that a run climbs past 1e200
function lateSim(shares = 45) {
  const s = simState(PROFILES.casual, 1);
  s.resLife = 400; s.shares = shares; s.pages = 60; s.gens = 27;
  s.frac[FRAC.NAPHTHA].level = 400; s.frac[FRAC.NAPHTHA].bub = 3.5; s.frac[FRAC.NAPHTHA].vial = 1.25;
  return s;
}
const STATES = [['watch', PRESENCE.WATCH, 30], ['hands', PRESENCE.HANDS, 5], ['away', PRESENCE.AWAY, 300]];

console.log('--- rates and multipliers match the sim ---');
{
  const s = lateSim();
  s.b = [0, 57, 43, 30, 22, 11, 10, 3, 0]; s.a = s.b.map(x => x * 1e3); s.pressure = 37; s.flare = 12.5; s.heatT = 42;
  const g = toGame(s);
  assert.equal(Well.topSlot(g), 7);
  for (const [st, presence] of STATES) {
    const wm = wellMult(s, st);
    close(Well.wellMultiplier(g, presence), wm, `wellMultiplier ${st}`);
    for (let k = 1; k <= 7; k++) {
      const game = k === 1 ? Well.slotRate(g, k).mul(Well.wellMultiplier(g, presence)) : Well.slotRate(g, k);
      close(game, tierRate(s, k, 7, wm), `rate of slot ${k} ${st}`);
    }
    close(Well.crudePerSecond(g, presence), crudePerSec(s, st), `crudePerSecond ${st}`);
  }
  // generator n upgrades slot ((n - 9) % 8) + 1; 27 generators = two upgrades on slots 1-3, one on 4-8
  assert.deepEqual([9, 16, 17, 24, 25, 30].map(Well.generatorSlot), [1, 8, 1, 8, 1, 6]);
  assert.deepEqual([1, 2, 3, 4, 8].map(k => Well.slotLevel(g, k)), [3, 3, 3, 2, 2]);
  g.well.generators = P.slots;
  assert.deepEqual([1, 8].map(k => Well.slotLevel(g, k)), [0, 0]);
  assert.equal(Well.crudePerSecond(createCoreLoopState()).m, 0, 'an empty Well makes nothing');
}

console.log('--- step matches wellStep to 1e-9 on recorded states up to 1e200 ---');
{
  // The sim plays a Well-only run (step, buy, flare); at every step the game takes the same
  // state and must produce the same slot amounts and Crude.
  const s = lateSim(150);
  let checked = 0, peak = 0, flares = 0;
  for (let i = 0; i < 6000 && peak < 1e200; i++) {
    const [st, presence, dt] = STATES[i % 3];
    s.heatT = st === 'hands' ? (i * 7) % 90 : 0;
    const g = toGame(s);
    const made = wellStep(s, dt, st);
    const gameMade = Well.step(g, dt, presence);
    if (made > 0) {
      close(gameMade, made, `Crude made at step ${i} (${st})`);
      for (let k = 1; k <= P.slots; k++) if (s.a[k] > 0) close(g.well.amount[k], s.a[k], `slot ${k} amount at step ${i}`);
      close(g.well.crude, s.crude + made, `Crude banked at step ${i}`);
      checked++;
    }
    s.crude += made; s.runCrude += made; s.t += dt;
    if (s.runCrude > s.bestEver) s.bestEver = s.runCrude;
    buyAll(s);
    const before = s.flare;
    maybeFlare(s, false);
    if (s.flare !== before) flares++;
    peak = Math.max(peak, s.crude);
  }
  assert.ok(peak >= 1e200, `the fixture run reaches 1e200 (peak ${peak})`);
  assert.ok(checked > 200, `enough states compared (${checked})`);
  assert.ok(flares > 0, 'the run includes Flares');
}

console.log('--- buyMax, Pressure and Flare match the sim on the same states ---');
{
  const s = lateSim();
  let buys = 0, flares = 0;
  for (let i = 0; i < 1500; i++) {
    const [st, , dt] = STATES[i % 3];
    const made = wellStep(s, dt, st);
    s.crude += made; s.runCrude += made; s.t += dt;
    const g = toGame(s);
    const had = s.crude, b0 = s.b.join(), p0 = s.pressure;
    buyAll(s);
    const bought = Well.buyMax(g);
    assert.deepEqual(g.well.bought, s.b, `units bought at step ${i}`);
    assert.equal(g.well.pressure, s.pressure, `Pressure at step ${i}`);
    assert.equal(g.well.pressureBest, s.pressureBest);
    assert.equal(bought, b0 !== s.b.join() || p0 !== s.pressure, 'buyMax says whether it bought');
    // what is left after spending, to 1e-9 of what was there (the difference of two close numbers)
    const left = g.well.crude.toNumber();
    assert.ok(left >= 0 && Math.abs(left - Math.max(0, s.crude)) <= 1e-9 * had, `Crude left at step ${i}: ${left} vs ${s.crude}`);
    for (let k = 1; k <= P.slots; k++) if (s.a[k] > 0) close(g.well.amount[k], s.a[k], `slot ${k} after buying at step ${i}`);
    if (b0 !== s.b.join()) buys++;
    if (s.crude < 0) s.crude = 0;

    const g2 = toGame(s), before = s.flare;
    maybeFlare(s, false);
    const ctx = makeContext();
    assert.equal(Well.flare(g2, false, ctx), s.flare !== before, `Flare decision at step ${i}`);
    assert.equal(ctx.events.length, 0, 'Auto-Flare is not a moment');
    assert.ok(Math.abs(g2.well.flare - s.flare) <= 1e-9 * s.flare, `Flare multiplier at step ${i}`);
    for (let k = 1; k <= P.slots; k++) if (s.a[k] > 0) close(g2.well.amount[k], s.a[k], `slot ${k} after a Flare at step ${i}`);
    if (s.flare !== before) flares++;
  }
  assert.ok(buys > 100 && flares > 0, `buys ${buys}, flares ${flares}`);
}

console.log('--- a whole run played by the game tracks the sim ---');
{
  const s = lateSim(), g = toGame(s);
  for (let i = 0; i < 3000; i++) {
    const [st, presence, dt] = STATES[i % 3];
    const made = wellStep(s, dt, st);
    s.crude += made; s.runCrude += made; s.t += dt;
    if (s.runCrude > s.bestEver) { s.bestEver = s.runCrude; unlockGenerators(s); }
    buyAll(s); maybeFlare(s, false);
    Well.step(g, dt, presence); g.t += dt;
    Well.buyMax(g); Well.flare(g, false);
  }
  assert.deepEqual(g.well.bought, s.b);
  assert.equal(g.well.pressure, s.pressure);
  assert.equal(g.well.generators, s.gens);
  close(g.well.runCrude, s.runCrude, 'run Crude after 3000 steps', 1e-6);
  close(g.well.bestEver, s.bestEver, 'best run', 1e-6);
  assert.ok(s.runCrude > 1e100);
}

console.log('--- player actions ---');
{
  const g = createCoreLoopState();
  assert.equal(Well.topSlot(g), 0);
  assert.equal(Well.step(g, 60, PRESENCE.WATCH).m, 0, 'nothing bought, nothing made');
  // slot 1 costs 10^1.65 = 44.67; 50 Crude buys one
  assert.ok(Math.abs(Well.slotCost(g, 1).toNumber() - Math.pow(10, P.costA + P.costB)) < 1e-9);
  assert.equal(Well.affordable(g, 1), 1);
  assert.equal(Well.canBuy(g, 1), true);
  assert.equal(Well.canBuy(g, 1, 2), false);
  assert.equal(Well.canBuy(g, 2), false);
  assert.equal(Well.buy(g, 2), false, 'cannot afford slot 2');
  assert.equal(Well.buy(g, 0), false);
  assert.equal(Well.buy(g, P.slots + 1), false);
  assert.equal(Well.buy(g, 1), true);
  assert.equal(g.well.bought[1], 1);
  assert.equal(g.well.amount[1].toNumber(), 1);
  assert.ok(Math.abs(g.well.crude.toNumber() - (P.startCrude - Math.pow(10, 1.65))) < 1e-9);
  assert.equal(Well.buy(g, 1), false, 'the rest does not pay for another');
  assert.equal(Well.canBuyPressure(g), false);
  assert.equal(Well.buyPressure(g), false);
  assert.equal(Well.buyMax(g), false);

  // one unit of slot 1 at rate 1 makes 1 Crude a second; Away halves it; Heat adds up to +50%
  const made = Well.step(g, 10, PRESENCE.WATCH);
  assert.ok(Math.abs(made.toNumber() - 10) < 1e-9);
  assert.ok(Math.abs(Well.crudePerSecond(g, PRESENCE.AWAY).toNumber() - P.awayWell) < 1e-12);
  g.presence.heatSeconds = P.heatRamp;
  assert.ok(Math.abs(Well.crudePerSecond(g, PRESENCE.HANDS).toNumber() - (1 + P.handsWell)) < 1e-12);
  g.presence.heatSeconds = 0;
  assert.ok(Math.abs(Well.crudePerSecond(g, PRESENCE.HANDS).toNumber() - 1) < 1e-12);

  // a pack: the 10th unit doubles the slot and raises the price by 10^(stepA + stepB·k)
  g.well.crude = new BigNum(1e6);
  assert.equal(Well.packLeft(g, 1), 9);
  assert.equal(Well.affordable(g, 1), 9, 'never past the end of the pack');
  assert.equal(Well.buy(g, 1, 100), true);
  assert.equal(g.well.bought[1], 10);
  assert.ok(Math.abs(Well.slotRate(g, 1).toNumber() - P.buyTenMult) < 1e-12);
  assert.ok(Math.abs(Well.slotCostLog(g, 1) - (P.costA + P.costB + P.stepA + P.stepB)) < 1e-12);

  // Pressure: level L costs 10^(pA + pB·L) and multiplies Crude by pMult
  g.well.crude = new BigNum(1500);
  const rate = Well.crudePerSecond(g).toNumber();
  assert.equal(Well.buyPressure(g), true);
  assert.equal(g.well.pressure, 1);
  assert.equal(g.well.pressureBest, 1);
  assert.ok(Math.abs(g.well.crude.toNumber() - 500) < 1e-9);
  assert.ok(Math.abs(Well.crudePerSecond(g).toNumber() / rate - P.pMult) < 1e-12);
  assert.equal(Well.pressureCostLog(g), P.pA + P.pB);

  // Flare: needs two slots in use and at least x flareMinGain
  assert.equal(Well.flareMultiplier(g), 0, 'one slot: nothing to burn');
  assert.equal(Well.canFlare(g), false);
  g.well.bought[3] = 2; g.well.amount[3] = new BigNum(2);
  g.well.amount[2] = new BigNum(7, 20); g.well.bought[2] = 5;
  g.well.amount[1] = new BigNum(1, 14);
  assert.ok(Math.abs(Well.flareMultiplier(g) - 1.96) < 1e-12);
  assert.equal(Well.canFlare(g), false, 'x1.96 is under the x2 a Flare needs');
  assert.equal(Well.flare(g), false);
  g.well.amount[1] = new BigNum(1, 30);
  assert.equal(Well.canFlare(g), true);
  const ctx = makeContext();
  assert.equal(Well.flare(g, true, ctx), true);
  assert.deepEqual(ctx.events, [{ kind: 'flare', level: HIT.BIG }]);
  assert.equal(g.well.flare, 9);
  assert.equal(g.well.amount[1].toNumber(), 10, 'slots below the top keep only what was bought');
  assert.equal(g.well.amount[2].toNumber(), 5);
  assert.equal(g.well.amount[3].toNumber(), 2, 'the top slot is untouched');
  assert.ok(Math.abs(Well.slotRate(g, 3).toNumber() - 9) < 1e-9, 'the Flare multiplies the top slot');
  assert.ok(Math.abs(Well.slotRate(g, 2).toNumber() - 1) < 1e-12);
  assert.equal(Well.canFlare(g), false);
}

console.log('--- generators unlock with the best run ever ---');
{
  const g = createCoreLoopState();
  assert.deepEqual(Well.nextGenerator(g), { n: 9, slot: 1, goalLog: P.genLog0 });
  const ctx = makeContext();
  Well.addCrude(g, new BigNum(9.9, 59), ctx);
  assert.equal(g.well.generators, 8);
  Well.addCrude(g, new BigNum(1, 59), ctx);
  assert.equal(g.well.generators, 9, 'the 9th at a best run of 1e60');
  assert.deepEqual(ctx.events, [{ kind: 'generator', level: HIT.NOVELTY, n: 9 }]);
  assert.equal(Well.slotLevel(g, 1), 1);
  // several at once, same count as the sim
  Well.addCrude(g, new BigNum(1, 100), ctx);
  const s = simState(PROFILES.casual, 1); s.bestEver = 1e100; unlockGenerators(s);
  assert.equal(g.well.generators, s.gens);
  assert.equal(g.well.generators, 14, '1e100: generators 9-14 (60, 67, …, 95)');
  assert.equal(ctx.events.length, 6);
  Well.addCrude(g, new BigNum(1, 400), ctx);
  assert.equal(g.well.generators, P.generators, 'never more than 30');
  assert.equal(Well.nextGenerator(g), null);
  assert.equal(Well.generatorGoalLog(P.generators), 60 + 7 * 21);
  assert.equal(ctx.events.at(-1).n, P.generators);
  // the records
  assert.ok(g.well.bestEver.eq(g.well.runCrude) && g.well.bestRunChron.eq(g.well.runCrude));
  Well.addCrude(g, 0, ctx); Well.addCrude(g, -5, ctx); Well.addCrude(g, NaN, ctx);
  assert.ok(g.well.crude.e === 400 && Number.isFinite(g.well.crude.m), 'nothing but a positive amount is banked');
}

console.log('--- a New Well and a Chronicle reset only what they should ---');
{
  const s = lateSim(); s.b = [0, 20, 10, 3, 0, 0, 0, 0, 0]; s.a = [0, 1e9, 1e5, 3, 0, 0, 0, 0, 0];
  s.pressure = 12; s.pressureBest = 30; s.flare = 4; s.crude = 1e40; s.runCrude = 3e40; s.bestEver = 1e90; s.bestRunChron = 1e70; s.t = 5000;
  const g = toGame(s);
  g.well.recordAtChron = new BigNum(1, 60);
  simResetRun(s); Well.resetRun(g);
  assert.equal(g.well.crude.toNumber(), s.crude);
  assert.equal(g.well.runCrude.m, 0);
  assert.equal(g.well.runStart, 5000);
  assert.deepEqual(g.well.bought, s.b);
  assert.ok(g.well.amount.every(a => a instanceof BigNum && a.m === 0) && g.well.amount.length === P.slots + 1);
  assert.equal(g.well.pressure, 0);
  assert.equal(g.well.flare, 1);
  assert.equal(g.well.pressureBest, 30, 'best Pressure stays (Rig speed)');
  assert.equal(g.well.generators, 27);
  assert.equal(g.well.bestEver.e, 90);
  assert.equal(g.well.bestRunChron.e, 70, 'a New Well keeps the Chronicle best');
  Well.closeChronicleRecord(g);
  assert.equal(g.well.recordAtChron.e, 70);
  assert.equal(g.well.bestRunChron.m, 0);
  Well.addCrude(g, new BigNum(1, 65));
  Well.closeChronicleRecord(g);
  assert.equal(g.well.recordAtChron.e, 70, 'the record gate never goes down');
}

console.log('--- past 1e308: the game keeps counting where the sim stops ---');
{
  const g = createCoreLoopState();
  Object.assign(g.prestige, { reserves: 5000, shares: 800, pages: 300 });   // 2.5^800 alone is 1e318
  g.well.generators = P.generators;
  g.refinery.frac[FRAC.NAPHTHA].level = 2000;
  const mult = Well.wellMultiplier(g);
  assert.ok(mult.e > 308 && Number.isFinite(mult.m), `the multiplier itself is past a double (${mult.toString()})`);
  const ctx = makeContext();
  let steps = 0;
  for (; steps < 20000 && g.well.crude.e < 600; steps++) {
    Well.buyMax(g); Well.flare(g, false);
    Well.step(g, 30, PRESENCE.WATCH, ctx); g.t += 30;
    const w = g.well;
    for (const b of [w.crude, w.runCrude, w.bestEver, ...w.amount]) {
      assert.ok(Number.isFinite(b.m) && Number.isFinite(b.e) && b.m >= 0, `finite at step ${steps}: ${b.m}e${b.e}`);
    }
    assert.ok(Number.isFinite(w.flare) && w.flare >= 1);
  }
  assert.ok(g.well.crude.e >= 600, `Crude climbs past 1e600 (reached 1e${g.well.crude.e} in ${steps} steps)`);
  assert.ok(g.well.bought.every(Number.isFinite) && g.well.bought[1] > 500);
  assert.ok(Well.slotCost(g, 1).e > 308, 'prices past a double too');
  assert.equal(Number.isFinite(g.well.crude.toNumber()), false, 'a double could not hold it');
  // and it survives a save
  const back = deserializeCoreLoop(JSON.parse(JSON.stringify(serializeCoreLoop(g))));
  assert.ok(back.well.crude.eq(g.well.crude) && back.well.amount[1].eq(g.well.amount[1]));
  assert.deepEqual(back.well.bought, g.well.bought);
  const a = Well.step(g, 30, PRESENCE.WATCH), b = Well.step(back, 30, PRESENCE.WATCH);
  assert.ok(a.eq(b), 'a loaded Well makes the same Crude');
}

{
  // a purchase that completes a pack emits `pack` (level 1); one that does not, emits nothing
  const w = createCoreLoopState();
  w.well.crude = new BigNum(1e9);
  const c = makeContext();
  assert.equal(Well.buy(w, 1, P.packSize - 1, c), true);
  assert.deepEqual(c.events, [], 'nine of ten: no pack yet');
  assert.equal(Well.buy(w, 1, 1, c), true);
  assert.deepEqual(c.events, [{ kind: 'pack', level: HIT.MINOR, slot: 1, packs: 1, bought: P.packSize }]);
  assert.equal(Well.buy(w, 1, 1, c), true);
  assert.equal(c.events.length, 1, 'the first of the next pack: nothing');
  assert.equal(Well.buy(w, 1, 1), true, 'without a context it is silent and still works');
  const m = createCoreLoopState();
  m.well.crude = new BigNum(1e12);
  const mc = makeContext();
  Well.buyMax(m, mc);
  assert.ok(mc.events.some(e => e.kind === 'pack'), 'buyMax passes the context on');
}

console.log('test_cl_well.js OK');
