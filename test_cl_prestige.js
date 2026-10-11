// CL-9: Prestige (js/systems/coreloop/Prestige.js) against the reference §3.3 and the sim's
// pendingReserves, maybeNewWell, maybeNewField, maybeChronicle and trials (sim/redesign/model.mjs)
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { P } from './js/systems/coreloop/params.js';
import { createCoreLoopState, serializeCoreLoop, deserializeCoreLoop } from './js/systems/coreloop/state.js';
import { HIT, makeContext, rand } from './js/systems/coreloop/shared.js';
import * as Prestige from './js/systems/coreloop/Prestige.js';
import {
  newState as simState, pendingReserves, maybeNewWell, maybeNewField, maybeChronicle, fieldGateLog, trials as simTrials
} from './sim/redesign/model.mjs';
import { PROFILES } from './sim/redesign/profiles.mjs';

const DAY = 86400;

// The sim's prestige state as a game state (README.md "Game vs sim")
function toGame(s) {
  const g = createCoreLoopState();
  g.t = s.t;
  const w = g.well;
  w.crude = new BigNum(s.crude); w.runCrude = new BigNum(s.runCrude); w.runStart = s.runStart;
  w.bought = [...s.b]; w.amount = s.a.map(x => new BigNum(x));
  w.pressure = s.pressure; w.pressureBest = s.pressureBest; w.flare = s.flare; w.generators = s.gens;
  w.bestRunChron = new BigNum(s.bestRunChron); w.recordAtChron = new BigNum(s.recordAtChron); w.bestEver = new BigNum(s.bestEver);
  Object.assign(g.prestige, {
    wells: s.wells, reserves: s.resLife, newFields: s.newFields, totalFields: s.totalFields, shares: s.shares,
    chronicles: s.chronicles, pages: s.pages, lastResetAt: s.lastResetAt, crew: s.crew, charter: s.charter
  });
  for (const [id] of P.trials) g.prestige.trials[id] = { unlockedAt: s.trials[id].unlocked, won: s.trials[id].won };
  s.fields.forEach((f, i) => { Object.assign(g.fields[i], { frontier: f.F, bestGrade: f.bestGrade, rig: f.rig, rigBestGrade: f.rigBest }); });
  return g;
}
const closeNum = (big, num) => (num === 0 ? big.m === 0 : Math.abs(Math.log10(big.m) + big.e - Math.log10(num)) < 1e-9);
// Everything a prestige action may touch, the same on both sides
function assertSame(g, s, what) {
  const p = g.prestige;
  assert.deepEqual(
    [p.wells, p.reserves, p.newFields, p.totalFields, p.shares, p.chronicles, p.pages, p.lastResetAt, p.crew],
    [s.wells, s.resLife, s.newFields, s.totalFields, s.shares, s.chronicles, s.pages, s.lastResetAt, s.crew], what);
  for (const [id] of P.trials) assert.deepEqual(p.trials[id], { unlockedAt: s.trials[id].unlocked, won: s.trials[id].won }, `${what}: trial ${id}`);
  assert.deepEqual(g.fields.map(f => f.rig), s.fields.map(f => f.rig), `${what}: Rig levels`);
  assert.deepEqual(g.well.bought, s.b, `${what}: slots`);
  assert.deepEqual([g.well.pressure, g.well.flare, g.well.runStart, g.well.pressureBest, g.well.generators], [s.pressure, s.flare, s.runStart, s.pressureBest, s.gens], what);
  for (const [big, num, name] of [[g.well.crude, s.crude, 'crude'], [g.well.runCrude, s.runCrude, 'runCrude'],
    [g.well.bestRunChron, s.bestRunChron, 'bestRunChron'], [g.well.recordAtChron, s.recordAtChron, 'recordAtChron']]) {
    assert.ok(closeNum(big, num), `${what}: ${name} ${big.toString()} vs ${num}`);
  }
}

// A random mid-game sim state (seeded: the same states every run)
const dice = { rng: 20261010 };
const u = (a, b) => a + (b - a) * rand(dice);
const n = (a, b) => Math.floor(u(a, b + 1));
function randomSim() {
  const s = simState(PROFILES.casual, 1);
  s.t = u(1, 300) * DAY;
  s.runStart = s.t - (rand(dice) < 0.2 ? u(0, 900) : u(600, 3 * DAY));
  s.lastResetAt = s.t - u(0, 9) * DAY;
  s.runCrude = Math.pow(10, u(0, 250)); s.crude = s.runCrude * u(0.01, 1);
  s.chronicles = rand(dice) < 0.3 ? 0 : n(1, 12);
  s.newFields = n(0, 10); s.totalFields = s.newFields + s.chronicles * 8 + n(0, 2);
  s.wells = rand(dice) < 0.2 ? n(0, 4) : n(0, 400); s.resLife = rand(dice) < 0.3 ? 0 : n(1, 3000);
  s.shares = n(0, 60); s.pages = s.chronicles * n(3, 4);
  // around the gates, so both sides of each are hit
  const gate = fieldGateLog(s);
  s.bestRunChron = Math.pow(10, gate + u(-6, 6));
  s.recordAtChron = s.chronicles ? s.bestRunChron * Math.pow(10, u(-4, 2)) : 0;
  s.bestEver = Math.max(s.bestRunChron, s.recordAtChron, s.runCrude);
  s.fields.forEach(f => { f.rig = rand(dice) < 0.25 ? 0 : n(1, 9); f.bestGrade = n(0, 40); f.F = f.bestGrade * P.gradeSpan + u(0, 9); });
  s.crew = n(0, P.crewBase + s.chronicles);
  s.b = s.b.map((_, k) => (k ? n(0, 80) : 0)); s.a = s.b.map(x => x * u(1, 1e6));
  s.pressure = n(0, 60); s.pressureBest = s.pressure + n(0, 40); s.flare = u(1, 30); s.gens = n(8, 30);
  // a Trial is unlocked exactly when its New Well / New Field count has been reached
  for (const [id, kind, count] of P.trials) {
    if ((kind === 'well' ? s.wells : s.totalFields) >= count) { s.trials[id].unlocked = u(0, s.t); s.trials[id].won = rand(dice) < 0.3; }
  }
  return s;
}

console.log('--- Reserves and the New Well gate (reference §3.3) ---');
{
  const g = createCoreLoopState();
  assert.equal(Prestige.pendingReserves(g), 0);
  // floor(2 · log10(run / 1e6)^1.5)
  for (const [e, want] of [[5, 0], [6, 0], [7, 2], [8, 5], [10, 16], [30, 235], [106, 2000], [400, 15641]]) {
    g.well.runCrude = new BigNum(1, e);
    assert.equal(Prestige.pendingReserves(g), want, `1e${e}`);
    assert.equal(want, Math.floor(P.resBase * Math.pow(Math.max(0, e - 6), P.resPow)));
  }
  // at least P.wellMinReserves, at least 25% of what this layer has; never the clock
  assert.ok(!('wellMinRunSec' in P), 'no reset waits on the clock');
  g.well.runCrude = new BigNum(1, 9);            // pays 10: under the least a New Well must pay
  assert.equal(Prestige.newWellNeed(g), P.wellMinReserves);
  assert.ok(Prestige.pendingReserves(g) < P.wellMinReserves);
  assert.equal(Prestige.canNewWell(g), false);
  assert.equal(Prestige.newWell(g), false);
  g.well.runCrude = new BigNum(1, 10);           // pays 16
  assert.equal(Prestige.canNewWell(g), true, 'enough Reserves is all it takes, one second into the run');
  g.prestige.reserves = 80;
  assert.equal(Prestige.newWellNeed(g), 20);
  assert.equal(Prestige.canNewWell(g), false, '16 pending is under 25% of 80');
  g.prestige.reserves = 20; g.t = 600;
  const ctx = makeContext();
  g.well.bought[1] = 30; g.well.amount[1] = new BigNum(1e5); g.well.pressure = 4; g.well.pressureBest = 4; g.well.flare = 3;
  g.well.bestRunChron = new BigNum(1, 10); g.well.bestEver = new BigNum(1, 10);
  assert.equal(Prestige.newWell(g, ctx), true);
  assert.deepEqual(ctx.events, [{ kind: 'newWell', level: HIT.MINOR, reserves: 16, first: true, seconds: 600 }], 'carries the run length; the first New Well');
  assert.equal(g.prestige.reserves, 36);
  assert.equal(g.prestige.wells, 1);
  assert.equal(g.well.crude.toNumber(), P.startCrude);
  assert.equal(g.well.runCrude.m, 0);
  assert.equal(g.well.runStart, 600);
  assert.deepEqual([g.well.bought[1], g.well.pressure, g.well.flare, g.well.pressureBest], [0, 0, 1, 4]);
  assert.equal(g.well.bestRunChron.e, 10, 'the Chronicle best survives a New Well');
  assert.equal(Prestige.canNewWell(g), false);
  // past the double range the Reserves stay a plain, finite number
  g.well.runCrude = new BigNum(3, 5000);
  assert.ok(Number.isSafeInteger(Prestige.pendingReserves(g)));
}

console.log('--- New Field gate, choices and Charter ---');
{
  const g = createCoreLoopState();
  assert.equal(Prestige.fieldGateLog(g), 50);
  g.prestige.newFields = 3; g.prestige.chronicles = 2;
  assert.equal(Prestige.fieldGateLog(g), 50 + 3 * 3 + 8 * 2, '10^(50 + 3k + 8·Chronicles)');
  g.prestige.newFields = 0; g.prestige.chronicles = 0;
  g.well.bestRunChron = new BigNum(9.99, 49);
  assert.equal(Prestige.canNewField(g), false);
  assert.equal(Prestige.newField(g, { kind: 'rig', field: 0 }), false);
  g.well.bestRunChron = new BigNum(1, 50);
  assert.equal(Prestige.canNewField(g), true);

  // the first New Field builds a Rig: nothing else is offered
  assert.deepEqual(Prestige.fieldChoices(g), [{ kind: 'rig', field: 0 }, { kind: 'rig', field: 1 }, { kind: 'rig', field: 2 }]);
  assert.deepEqual(Prestige.suggestedChoice(g), { kind: 'rig', field: 0 });
  assert.equal(Prestige.newField(g, { kind: 'crew' }), false);
  assert.equal(Prestige.newField(g, { kind: 'level', field: 0 }), false);
  assert.equal(Prestige.newField(g, undefined), false);
  assert.equal(Prestige.newField(g, { kind: 'rig', field: 1 }, 'pirate'), false, 'not a Charter');
  assert.equal(g.prestige.newFields, 0, 'a refused New Field changes nothing');

  g.prestige.reserves = 300; g.well.runCrude = new BigNum(1, 50); g.well.bought[2] = 5; g.t = 5000;
  const ctx = makeContext();
  assert.equal(Prestige.newField(g, { kind: 'rig', field: 1 }, 'operator', ctx), true);
  assert.deepEqual(ctx.events, [{ kind: 'newField', level: HIT.NOVELTY, n: 1 }]);
  assert.deepEqual(g.fields.map(f => f.rig), [0, 1, 0]);
  assert.deepEqual([g.prestige.newFields, g.prestige.totalFields, g.prestige.shares, g.prestige.reserves, g.prestige.lastResetAt], [1, 1, P.sharesPerField, 0, 5000]);
  assert.equal(g.prestige.charter, 'operator');
  assert.equal(g.well.runCrude.m, 0);
  assert.equal(g.well.bought[2], 0);
  assert.equal(g.well.bestRunChron.e, 50, 'the best run this Chronicle stays: the next gate is higher');
  assert.equal(Prestige.canNewField(g), false, 'the next one needs 1e53');
  assert.equal(g.prestige.trials.autoWell.unlockedAt, 5000, 'Auto-Well unlocks at New Field 1');

  // later: the other Rigs, Crew while a slot is free, levels on built Rigs
  g.well.bestRunChron = new BigNum(1, 53);
  assert.deepEqual(Prestige.fieldChoices(g), [{ kind: 'rig', field: 0 }, { kind: 'rig', field: 2 }, { kind: 'crew' }, { kind: 'level', field: 1 }]);
  assert.equal(Prestige.crewSlots(g), 1);
  assert.equal(Prestige.newField(g, { kind: 'crew' }), true);
  assert.equal(g.prestige.crew, 1);
  assert.equal(g.prestige.charter, 'operator', 'no Charter given: it stays');
  assert.equal(g.prestige.trials.autoFlare.unlockedAt, 5000, 'Auto-Flare unlocks at New Field 2');
  g.well.bestRunChron = new BigNum(1, 56);
  assert.ok(!Prestige.fieldChoices(g).some(c => c.kind === 'crew'), 'the one Crew slot is taken');
  assert.equal(Prestige.newField(g, { kind: 'crew' }), false);
  assert.equal(Prestige.newField(g, { kind: 'level', field: 0 }), false, 'no Rig to level in the Tower');
  assert.equal(Prestige.newField(g, { kind: 'level', field: 1 }, 'baron'), true);
  assert.equal(g.fields[1].rig, 2);
  assert.equal(g.prestige.charter, 'baron');
  assert.deepEqual(Prestige.CHARTERS, ['wildcatter', 'operator', 'baron']);
}

console.log('--- Chronicle: Fields needed, record gate, Pages, re-blaze ---');
{
  const g = createCoreLoopState();
  g.fields.forEach((f, i) => { f.rig = i + 1; });
  g.well.bestRunChron = new BigNum(1, 80);
  g.prestige.newFields = 7;
  assert.equal(Prestige.chronicleFieldsNeed(g), 8, 'the first needs 8 New Fields');
  assert.equal(Prestige.canChronicle(g), false);
  assert.equal(Prestige.chronicle(g), false);
  g.prestige.newFields = 8; g.prestige.shares = 16; g.prestige.reserves = 900; g.prestige.crew = 1; g.t = 40 * DAY; g.prestige.lastResetAt = 39 * DAY;
  assert.equal(Prestige.canChronicle(g), true);
  assert.equal(Prestige.suggestChronicle(g), false, 'one more New Field is close: the sim waits');
  // Pages = 3 + floor((fields - 6) / 2), counted up to 9 Fields
  for (const [fields, pages] of [[6, 3], [7, 3], [8, 4], [9, 4], [12, 4]]) {
    g.prestige.newFields = fields;
    assert.equal(Prestige.pendingPages(g), pages, `${fields} New Fields`);
  }
  g.prestige.newFields = 8;
  g.prestige.lastResetAt = 35 * DAY;
  assert.equal(Prestige.suggestChronicle(g), true, '5 days since the last reset: take it');
  const ctx = makeContext();
  assert.equal(Prestige.chronicle(g, ctx), true);
  assert.deepEqual(ctx.events, [{ kind: 'chronicle', level: HIT.MAJOR, pages: 4 }]);
  const p = g.prestige;
  assert.deepEqual([p.pages, p.chronicles, p.newFields, p.reserves, p.lastResetAt], [4, 1, 0, 0, 40 * DAY]);
  assert.equal(p.shares, Math.floor(4 * P.startSharesPerPage), 're-blaze: floor(1.35 · Pages) Shares');
  assert.equal(Prestige.reblazeShares(40), Math.floor(40 * P.startSharesPerPage));
  assert.deepEqual(g.fields.map(f => f.rig), [1, 1, 1], 'Rig levels back to 1, the Rigs stay');
  assert.equal(p.crew, 1, 'Crew stay');
  assert.equal(Prestige.crewSlots(g), 2, 'and a Chronicle adds a slot');
  assert.equal(g.well.recordAtChron.e, 80);
  assert.equal(g.well.bestRunChron.m, 0);
  assert.equal(g.well.runCrude.m, 0);
  assert.equal(Prestige.fieldGateLog(g), 58, 'the next loop starts 8 decades higher');

  // from the second on: 6 New Fields and a best run x10 the record
  assert.equal(Prestige.chronicleFieldsNeed(g), 6);
  assert.equal(Prestige.chronicleRecordLog(g), 81);
  p.newFields = 6; g.well.bestRunChron = new BigNum(9.9, 80);
  assert.equal(Prestige.canChronicle(g), false, 'under x10 the record');
  g.well.bestRunChron = new BigNum(1, 81);
  assert.equal(Prestige.canChronicle(g), true);
  p.newFields = 9;
  assert.equal(Prestige.suggestChronicle(g), true, '9 New Fields: the full Page count');
  assert.equal(Prestige.chronicle(g), true);
  assert.deepEqual([p.pages, p.chronicles, p.shares], [8, 2, 10]);
  assert.equal(g.well.recordAtChron.e, 81);
}

console.log('--- Trials: unlock, the wait, the win ---');
{
  const g = createCoreLoopState();
  assert.deepEqual(P.trials, [['autoBuy', 'well', 3], ['autoWell', 'field', 1], ['autoFlare', 'field', 2]]);
  assert.equal(Prestige.trialUnlocked(g, 'autoBuy'), false);
  assert.equal(Prestige.trialReadyAt(g, 'autoBuy'), null);
  assert.equal(Prestige.winTrial(g, 'autoBuy'), false);
  for (let i = 1; i <= 3; i++) {
    g.t = i * 1000; g.well.runStart = g.t - 600; g.well.runCrude = new BigNum(1, 9 + 3 * i);
    assert.equal(Prestige.newWell(g), true);
    assert.equal(Prestige.trialUnlocked(g, 'autoBuy'), i === 3, `Auto-Buy unlocks at New Well 3 (at ${i})`);
  }
  assert.equal(Prestige.trialReadyAt(g, 'autoBuy'), 3000 + P.trialDelay);
  g.t = 3000 + P.trialDelay - 1;
  assert.equal(Prestige.trials(g, 3600), false, 'not 2 h after the unlock yet');
  g.t = 3000 + P.trialDelay;
  assert.equal(Prestige.trials(g, P.trialMinSec - 1), false, 'the stretch is too short');
  assert.equal(Prestige.hasAutomation(g, 'autoBuy'), false);
  const ctx = makeContext();
  assert.equal(Prestige.trials(g, P.trialMinSec, ctx), true);
  assert.deepEqual(ctx.events, [{ kind: 'trial', level: HIT.MAJOR, id: 'autoBuy' }]);
  assert.equal(Prestige.hasAutomation(g, 'autoBuy'), true);
  assert.equal(Prestige.trials(g, 9999, ctx), false, 'won once');
  assert.equal(Prestige.canWinTrial(g, 'autoBuy'), false);
  assert.equal(ctx.events.length, 1);
  // a 4th New Well does not move the unlock time
  g.t = 90000; g.well.runStart = 0; g.well.runCrude = new BigNum(1, 60);
  assert.equal(Prestige.newWell(g), true);
  assert.equal(g.prestige.trials.autoBuy.unlockedAt, 3000);
}

console.log('--- the same resets as the sim on 3,000 random states ---');
{
  const hit = { well: 0, field: 0, chronicle: 0, trial: 0 };
  for (let i = 0; i < 3000; i++) {
    const s = randomSim();
    s.log = false;
    const which = i % 4;
    const g = toGame(s);
    if (which === 0) {
      assert.equal(Prestige.pendingReserves(g), pendingReserves(s), `pending Reserves, state ${i}`);
      const did = maybeNewWell(s);
      assert.equal(Prestige.canNewWell(g), did, `New Well gate, state ${i}`);
      assert.equal(Prestige.newWell(g), did);
      if (did) hit.well++;
    } else if (which === 1) {
      assert.equal(Prestige.fieldGateLog(g), fieldGateLog(s));
      const choice = Prestige.suggestedChoice(g);
      const did = maybeNewField(s);
      assert.equal(Prestige.canNewField(g), did, `New Field gate, state ${i}`);
      assert.equal(Prestige.newField(g, choice), did, `New Field with the sim's pick, state ${i}`);
      if (did) hit.field++;
    } else if (which === 2) {
      const want = Prestige.suggestChronicle(g);
      const did = maybeChronicle(s);
      assert.equal(want, did, `Chronicle timing, state ${i}`);
      if (did) { assert.equal(Prestige.chronicle(g), true); hit.chronicle++; }
    } else {
      const stretch = u(0, 900);
      const before = P.trials.filter(([id]) => s.trials[id].won).length;
      simTrials(s, stretch);
      const won = P.trials.filter(([id]) => s.trials[id].won).length - before;
      assert.equal(Prestige.trials(g, stretch), won > 0, `Trials, state ${i}`);
      hit.trial += won;
    }
    assertSame(g, s, `state ${i} (${['New Well', 'New Field', 'Chronicle', 'Trials'][which]})`);
  }
  assert.ok(hit.well > 50 && hit.field > 100 && hit.chronicle > 20 && hit.trial > 50, `both sides of every gate were hit: ${JSON.stringify(hit)}`);
}

console.log('--- a prestige state survives a save ---');
{
  const g = toGame(randomSim());
  g.prestige.charter = 'wildcatter';
  const back = deserializeCoreLoop(JSON.parse(JSON.stringify(serializeCoreLoop(g))));
  assert.deepEqual(back.prestige, g.prestige);
  assert.equal(Prestige.canNewField(back), Prestige.canNewField(g));
  assert.equal(Prestige.pendingReserves(back), Prestige.pendingReserves(g));
}

{
  // the first New Well says so, with the run's length in seconds
  const f = createCoreLoopState();
  f.well.runStart = 100; f.t = 100 + 1020; f.well.runCrude = new BigNum(1, 10);
  const c1 = makeContext();
  assert.equal(Prestige.newWell(f, c1), true);
  assert.equal(c1.events[0].first, true, 'wells was 0');
  assert.equal(c1.events[0].seconds, 1020, 'the run took 17 minutes');
  f.t += 5; f.well.runCrude = new BigNum(1, 400);
  const c2 = makeContext();
  assert.equal(Prestige.newWell(f, c2), true);
  assert.equal(c2.events[0].first, false, 'the second is not the first');
  assert.equal(c2.events[0].seconds, 5);
}
console.log('test_cl_prestige.js OK');
