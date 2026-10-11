// CL-0: the core loop's contract (js/systems/coreloop/): saved state, shared vocabulary, params
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { P } from './js/systems/coreloop/params.js';
import { P as SIM_P } from './sim/redesign/params.mjs';
import { createCoreLoopState, serializeCoreLoop, deserializeCoreLoop, CORE_LOOP_VERSION } from './js/systems/coreloop/state.js';
import { FIELDS, FRACTIONS, FIELD_FRAC, FRAC, HIT, rand, fracValue, makeContext, NO_CONTEXT } from './js/systems/coreloop/shared.js';
import { newState as simState, rand as simRand, fracVal as simFracVal } from './sim/redesign/model.mjs';
import { PROFILES } from './sim/redesign/profiles.mjs';

const roundTrip = (s) => deserializeCoreLoop(JSON.parse(JSON.stringify(serializeCoreLoop(s))));
// Compare two states with BigNums as their JSON, and the session-only presence fields left out
const plain = (s) => { const j = serializeCoreLoop(s); return j; };

console.log('--- one set of numbers for the game and the sim ---');
{
  assert.equal(P, SIM_P, 'the sim re-exports the game params object');
  assert.deepEqual(FIELDS, P.fields);
  assert.equal(FRACTIONS.length, 5);
  assert.deepEqual(FIELD_FRAC, [FRAC.KEROSENE, FRAC.DIESEL, FRAC.BITUMEN]);
  assert.deepEqual([HIT.MINOR, HIT.BIG, HIT.NOVELTY, HIT.MAJOR], [1, 2, 3, 4]);
}

console.log('--- a fresh state has every part, sized from the params ---');
{
  const s = createCoreLoopState();
  assert.equal(s.version, CORE_LOOP_VERSION);
  assert.ok(s.well.crude instanceof BigNum && s.well.crude.toNumber() === P.startCrude);
  assert.equal(s.well.bought.length, P.slots + 1);
  assert.equal(s.well.amount.length, P.slots + 1);
  assert.ok(s.well.amount.every(a => a instanceof BigNum));
  assert.equal(s.well.generators, P.slots);
  assert.equal(s.fields.length, FIELDS.length);
  assert.equal(s.mastery.length, FIELDS.length);
  assert.equal(s.mastery[0].ranks.length, P.actionsPerField);
  assert.equal(s.refinery.frac.length, FRACTIONS.length);
  assert.equal(s.refinery.orders.length, P.orderSlots);
  assert.equal(s.cauldrons.vats.length, P.cauldrons.length);
  assert.equal(s.seals.tier.length, P.seals);
  assert.deepEqual(Object.keys(s.prestige.trials), P.trials.map(t => t[0]));
  // the sim's state has the same building blocks
  const sim = simState(PROFILES.casual, 1);
  assert.equal(sim.fields.length, s.fields.length);
  assert.equal(sim.frac.length, s.refinery.frac.length);
  assert.equal(sim.caul.length, s.cauldrons.vats.length);
  assert.equal(sim.b.length, s.well.bought.length);
}

console.log('--- a state survives a save, field for field ---');
{
  const s = createCoreLoopState(42);
  // touch every part with non-default values
  s.t = 12345.5; s.rng = -987654321;
  s.well.crude = new BigNum(3.5, 180); s.well.runCrude = new BigNum(1.2, 179); s.well.runStart = 99;
  s.well.bought = s.well.bought.map((_, i) => i * 7); s.well.amount = s.well.amount.map((_, i) => new BigNum(1.5, i * 20));
  s.well.pressure = 40; s.well.pressureBest = 120; s.well.flare = 37.5; s.well.generators = 21;
  s.well.bestRunChron = new BigNum(9, 190); s.well.bestEver = new BigNum(9, 201); s.well.recordAtChron = new BigNum(4, 150);
  Object.assign(s.prestige, { wells: 300, reserves: 4000, newFields: 5, totalFields: 77, shares: 31, chronicles: 9, pages: 40, lastResetAt: 9000, charter: 'baron', crew: 6 });
  s.prestige.trials.autoBuy = { unlockedAt: 500, wellsAt: 3, won: true };
  s.fields[1] = { frontier: 123.4, bestGrade: 12, inventory: [0, 5.5, 0, 1e6], hauled: 2e6, rig: 3, rigBestGrade: 8 };
  s.mastery[2] = { hours: [70, 20, 6.5, 0.3], ranks: [6, 4, 3, 1] };
  s.refinery.frac[3] = { level: 55, bubble: 1.25, vial: 0.4, compound: 0.06, seal: 0.09 };
  s.refinery.orders[0] = { empty: false, frac: 2, field: 1, grade: 7, qty: 1234.5, posted: 4000 };
  s.refinery.orders[1] = { empty: true, haulFrom: 5000 };
  s.refinery.weekly = { week: 3, need: [{ grade: 2, qty: 10 }, { grade: 3, qty: 20 }, { grade: 1, qty: 30 }] };
  s.cauldrons.vats[2] = { fill: 777.7, brewed: 40, bars: 50, speed: 2.5 };
  s.cauldrons.bubbles = [{ frac: 0, level: 3 }, { frac: 4, level: 12 }];
  s.collection.vials = { '1:7': { tier: 3, pity: 0 }, '0:2': { tier: 0, pity: 2 } };
  s.collection.vialOffers = 4; s.collection.vialDay = 17; s.collection.batchFrom = [3, 11];
  s.tree.bank = { reserves: 120, shares: 3, pages: 14 }; s.tree.ranks = { kit: 2, foundry: 5, treaty: 1 };
  s.collection.recipes = [{ found: true, made: 30, tier: 2 }, { found: false, made: 0, tier: 0 }];
  s.seals.hours[4] = 612.5; s.seals.tier[4] = 3;
  s.presence.handField = 2; s.presence.nextGusherAt = 13000;
  const back = roundTrip(s);
  assert.deepEqual(plain(back), plain(s));
  assert.ok(back.well.crude instanceof BigNum && back.well.amount[8] instanceof BigNum);
  assert.equal(back.well.crude.e, 180);
  // a fresh state round-trips too
  assert.deepEqual(plain(roundTrip(createCoreLoopState(7))), plain(createCoreLoopState(7)));
}

console.log('--- a loaded game starts Away, whatever was saved ---');
{
  const s = createCoreLoopState();
  s.presence.state = 'hands'; s.presence.lastInputAt = 500; s.presence.heatSeconds = 45;
  const back = roundTrip(s);
  assert.equal(back.presence.state, 'away');
  assert.equal(back.presence.lastInputAt, -Infinity);
  assert.equal(back.presence.heatSeconds, 0);
}

console.log('--- saves that lack fields, or are garbage, still load (rule 2) ---');
{
  const fresh = plain(createCoreLoopState());
  for (const raw of [undefined, null, 'x', 42, [], {}, { well: null, fields: 'no', refinery: { frac: [1, 2] } }]) {
    const s = deserializeCoreLoop(raw);
    assert.deepEqual(plain(s), fresh, `input ${JSON.stringify(raw)}`);
  }
  // a partial save keeps what it has and defaults the rest
  const s = deserializeCoreLoop({ prestige: { pages: 12 }, fields: [{ frontier: 55 }] });
  assert.equal(s.prestige.pages, 12);
  assert.equal(s.fields[0].frontier, 55);
  assert.equal(s.fields[0].bestGrade, Math.floor(55 / P.gradeSpan), 'grade follows the frontier');
  assert.equal(s.fields[1].frontier, 0);
  assert.equal(s.well.generators, P.slots);
  // hostile values never produce NaN, Infinity, negatives or out-of-range ids
  const bad = deserializeCoreLoop({
    t: -5, rng: 'abc',
    well: { crude: { m: 'x', e: 1e999 }, bought: [NaN, -3, 1e999], amount: 'no', flare: -2, generators: 999, pressure: -1 },
    prestige: { pages: -4, charter: 'hacker', crew: 1.9, trials: { autoBuy: { won: 'yes', unlockedAt: -9 } } },
    fields: [{ frontier: NaN, inventory: [-5, 'x', 3], rig: -2 }],
    refinery: { frac: [{ level: -1, bubble: -9 }], orders: [{ empty: false, frac: 99, field: 0, qty: 5 }, { empty: false, frac: 1, field: 1, qty: -1 }] },
    cauldrons: { vats: [{ speed: 0, fill: -1 }], bubbles: [{ frac: 9, level: 3 }, { frac: 1, level: 0 }, 'x'] },
    collection: { vials: { 'bad key': { tier: 3 }, '0:1': { tier: 99, pity: -1 } }, batchFrom: [4.7, -2, 'x'], recipes: ['x', { found: 'y', made: -1, tier: 9 }] },
    seals: { tier: [99], hours: [-1] }, presence: { handField: 7 }
  });
  assert.equal(bad.t, 0);
  assert.equal(bad.well.crude.toNumber(), 0);
  assert.deepEqual(bad.well.bought.slice(0, 3), [0, 0, 0]);
  assert.equal(bad.well.flare, 1);
  assert.equal(bad.well.generators, P.generators);
  assert.equal(bad.prestige.pages, 0);
  assert.equal(bad.prestige.charter, 'none');
  assert.equal(bad.prestige.crew, 1);
  assert.deepEqual(bad.prestige.trials.autoBuy, { unlockedAt: 0, wellsAt: 0, won: false });
  assert.deepEqual(bad.fields[0].inventory, [0, 0, 3]);
  assert.equal(bad.fields[0].rig, 0);
  assert.equal(bad.refinery.frac[0].level, 0);
  assert.ok(bad.refinery.orders.every(o => o.empty), 'orders with bad ids or amounts are dropped');
  assert.equal(bad.cauldrons.vats[0].speed, 1);
  assert.deepEqual(bad.cauldrons.bubbles, [{ frac: 1, level: 1 }]);
  assert.deepEqual(bad.collection.vials, { '0:1': { tier: P.vialTiers, pity: 0 } });
  assert.deepEqual(bad.collection.recipes[1], { found: false, made: 0, tier: P.compoundTiers.length });
  assert.deepEqual(bad.collection.batchFrom, [4, 0, 0]);
  assert.deepEqual(deserializeCoreLoop({}).collection.batchFrom, []);
  assert.equal(bad.seals.tier[0], P.sealHours.length);
  assert.equal(bad.presence.handField, FIELDS.length - 1);
  const flat = JSON.stringify(serializeCoreLoop(bad));
  assert.ok(!/NaN|Infinity/.test(flat));
}

console.log('--- the RNG and the Fraction value match the sim ---');
{
  const s = createCoreLoopState(123), sim = simState(PROFILES.casual, 123);
  for (let i = 0; i < 50; i++) assert.equal(rand(s), simRand(sim));
  assert.equal(s.rng, sim.rng);
  // a saved RNG continues the same sequence
  const back = roundTrip(s);
  assert.equal(rand(back), simRand(sim));
  // Fraction value: the sim's `extra` is the game's compound + seal
  s.refinery.frac[2] = { level: 40, bubble: 0.75, vial: 0.2, compound: 0.04, seal: 0.06 };
  sim.frac[2] = { level: 40, bub: 0.75, vial: 0.2, extra: 0.1 };
  assert.ok(Math.abs(fracValue(s, 2) / simFracVal(sim, 2) - 1) < 1e-12);
  assert.equal(fracValue(s, 0), 1, 'an untouched Fraction is x1');
}

console.log('--- events go to a listener or a list; NO_CONTEXT swallows them ---');
{
  const ctx = makeContext();
  ctx.emit('order', HIT.BIG, { frac: 1 });
  assert.deepEqual(ctx.events, [{ kind: 'order', level: 2, frac: 1 }]);
  const seen = [];
  makeContext(e => seen.push(e)).emit('seal', HIT.MAJOR);
  assert.deepEqual(seen, [{ kind: 'seal', level: 4 }]);
  NO_CONTEXT.emit('x', 1);
}

console.log('CL-0 contract tests passed');
