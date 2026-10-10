// CL-7: Seals and Crew (js/systems/coreloop/Seals.js)
import assert from 'node:assert/strict';
import { P } from './js/systems/coreloop/params.js';
import { createCoreLoopState, serializeCoreLoop, deserializeCoreLoop } from './js/systems/coreloop/state.js';
import { PRESENCE, HIT, makeContext } from './js/systems/coreloop/shared.js';
import * as Seals from './js/systems/coreloop/Seals.js';
import { newState as simState, sealsStep as simSealsStep } from './sim/redesign/model.mjs';
import { PROFILES } from './sim/redesign/profiles.mjs';

const H = 3600, DAY = 86400;
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);
// Run the loop the way the driver does: step, then advance t
const run = (s, seconds, dt = 300, ctx) => {
  for (let done = 0; done < seconds; done += dt) { Seals.step(s, dt, PRESENCE.AWAY, ctx); s.t += dt; }
};
// Fresh state at a time with everything open, so only the Crew rate matters
const open = (crew) => { const s = createCoreLoopState(); s.prestige.crew = crew; s.t = P.seals * P.sealEveryDays * DAY; return s; };

console.log('--- tier times match reference 3.5 for Crew 1 and Crew 5 ---');
{
  for (const crew of [1, 5]) {
    const rate = 1 + 0.25 * crew;
    assert.equal(Seals.sealHoursPerHour(crew), rate);
    const s = open(crew);
    const reached = [];
    for (let sec = 0; sec < 2600 * H / rate + H; sec += 60) {
      const before = s.seals.tier[0];
      Seals.step(s, 60, PRESENCE.AWAY); s.t += 60;
      if (s.seals.tier[0] > before) reached.push(sec + 60);
    }
    assert.equal(reached.length, 5);
    P.sealHours.forEach((h, k) => {
      const expect = (h / rate) * H;
      assert.ok(reached[k] >= expect - 1e-6 && reached[k] <= expect + 60 + 1e-6, `crew ${crew} tier ${k + 1}: ${reached[k]} vs ${expect}`);
    });
  }
  // hours to the first tier: 24 / 1.25 = 19.2 h at Crew 1; 24 / 2.25 = 10.67 h at Crew 5
  near(Seals.hoursToNextTier(open(1), 0), 19.2);
  near(Seals.hoursToNextTier(open(5), 0), 24 / 2.25);
}

console.log('--- Seal i opens on day i x 30 ---');
{
  const s = createCoreLoopState(); s.prestige.crew = 2;
  assert.deepEqual(Seals.openSeals(s), [0]);
  assert.equal(Seals.nextSealOpensIn(s), 30 * DAY);
  s.t = 30 * DAY - 1;
  assert.deepEqual(Seals.openSeals(s), [0]);
  s.t = 30 * DAY;
  assert.deepEqual(Seals.openSeals(s), [0, 1]);
  s.t = 59 * 86400; run(s, 2 * DAY, 3600);
  assert.ok(s.seals.hours[2] > 0 && s.seals.hours[2] < 2 * 24 * 2, 'Seal 2 only collects after day 60');
  near(s.seals.hours[2], (1.5 * (s.t - 60 * DAY)) / H);
  s.t = P.seals * 30 * DAY; assert.equal(Seals.nextSealOpensIn(s), null);
  // a closed Seal gets nothing
  const c = createCoreLoopState(); c.prestige.crew = 3; run(c, 10 * DAY);
  assert.ok(c.seals.hours[0] > 0 && c.seals.hours[1] === 0);
}

console.log('--- nothing advances with Crew 0 ---');
{
  const s = open(0);
  run(s, 100 * H, 3600);
  assert.ok(s.seals.hours.every(h => h === 0) && s.seals.tier.every(t => t === 0));
  assert.ok(s.refinery.frac.every(f => f.seal === 0));
  assert.equal(Seals.hoursToNextTier(s, 0), null);
}

console.log('--- tiers add 0.03 x tier to Fraction (seal % 5), events at the right level ---');
{
  const s = open(5); const ctx = makeContext();
  Seals.step(s, 40 * H, PRESENCE.WATCH, ctx);   // one big step: 90 Seal-hours, crosses tier 1 only
  assert.deepEqual(s.seals.tier.slice(0, 3), [1, 1, 1]);
  near(s.refinery.frac[0].seal, 0.03 * 3, 1e-12); // Seals 0, 5, 10 at tier 1
  Seals.step(s, 4000 * H, PRESENCE.AWAY, ctx);    // all tiers in one step
  assert.ok(s.seals.tier.every(t => t === 5));
  const ev = ctx.events.filter(e => e.seal === 0);
  assert.deepEqual(ev.map(e => [e.tier, e.level]), [[1, 3], [2, 3], [3, 3], [4, 4], [5, 4]]);
  assert.ok(ev.every(e => e.kind === 'seal'));
  assert.equal(HIT.MAJOR, 4);
  // Seals 0,5,10 -> Gas; 1,6,11 -> Naphtha; 2,7 -> Kerosene
  near(s.refinery.frac[0].seal, 3 * Seals.sealBonusAt(5));
  near(s.refinery.frac[2].seal, 2 * Seals.sealBonusAt(5));
  near(Seals.sealBonusAt(5), 0.03 * 15);
  const before = s.refinery.frac.map(f => f.seal);
  Seals.step(s, H, PRESENCE.AWAY); assert.deepEqual(s.refinery.frac.map(f => f.seal), before, 'maxed Seals stop');
}

console.log('--- ids and recompute ---');
{
  const s = open(5);
  assert.equal(Seals.sealTierId(s, 0), 'locked');
  run(s, 30 * H, 3600);
  assert.equal(Seals.sealTierId(s, 0), 'unlocked');
  assert.equal(Seals.sealHoursToNext(s, 0), P.sealHours[1] - s.seals.hours[0]);
  const live = s.refinery.frac.map(f => f.seal);
  s.refinery.frac.forEach(f => { f.seal = 99; });
  Seals.recompute(s);
  s.refinery.frac.forEach((f, i) => near(f.seal, live[i], 1e-12));
  const back = deserializeCoreLoop(JSON.parse(JSON.stringify(serializeCoreLoop(s))));
  assert.deepEqual(back.seals, s.seals);
  Seals.recompute(back);
  back.refinery.frac.forEach((f, i) => near(f.seal, live[i], 1e-12));
}

console.log('--- same inputs as the sim ---');
{
  for (const crew of [1, 3, 6]) {
    const sim = simState(PROFILES.casual, 1); sim.crew = crew;
    const s = createCoreLoopState(); s.prestige.crew = crew;
    const ctx = makeContext(); sim.log = true; sim.events = [];
    for (let k = 0; k < 400 * DAY / 3600; k++) {   // 400 days in 1 h steps
      simSealsStep(sim, 3600); sim.t += 3600;
      Seals.step(s, 3600, PRESENCE.AWAY, ctx); s.t += 3600;
    }
    assert.deepEqual(s.seals.tier, sim.seals.tier);
    s.seals.hours.forEach((h, i) => near(h, sim.seals.hours[i], 1e-9));
    s.refinery.frac.forEach((f, i) => near(f.seal, sim.frac[i].extra, 1e-12));
    const simSeal = sim.events.filter(e => e.k === 'seal');
    assert.equal(ctx.events.length, simSeal.length);
    simSeal.forEach((e, n) => { assert.equal(ctx.events[n].level, e.lvl); assert.equal(ctx.events[n].tier, e.tier); });
  }
}

console.log('--- a Seal opening mid-step is credited only for the time after it opened ---');
{
  const s = createCoreLoopState(); s.prestige.crew = 1; s.t = 30 * DAY - 3600;
  Seals.step(s, 2 * H, PRESENCE.AWAY);
  near(s.seals.hours[1], 1.25);          // 1 h after opening, not 2
  near(s.seals.hours[0], 2.5);
}

console.log('CL-7 seals tests passed');
