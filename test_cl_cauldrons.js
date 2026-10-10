// CL-6: Cauldrons and Bubbles (js/systems/coreloop/Cauldrons.js) against the sim's cauldronFill,
// brew, bubbleCost, bubbleEffect, recomputeBubbles and bubbleLevels
import assert from 'node:assert/strict';
import { P } from './js/systems/coreloop/params.js';
import { createCoreLoopState, serializeCoreLoop, deserializeCoreLoop } from './js/systems/coreloop/state.js';
import { PRESENCE, HIT, FIELD, FRACTIONS, makeContext } from './js/systems/coreloop/shared.js';
import * as Fields from './js/systems/coreloop/Fields.js';
import * as Rigs from './js/systems/coreloop/Rigs.js';
import * as C from './js/systems/coreloop/Cauldrons.js';
import * as sim from './sim/redesign/model.mjs';
import { PROFILES } from './sim/redesign/profiles.mjs';

const TOL = 1e-9;
const near = (a, b, what) => {
  const d = Math.abs(a - b);
  assert.ok(d <= TOL * Math.max(1, Math.abs(a), Math.abs(b)), `${what}: game ${a} vs sim ${b}`);
};
const STATES = [['hands', PRESENCE.HANDS, 5], ['watch', PRESENCE.WATCH, 30], ['away', PRESENCE.AWAY, 300]];
const count = (ctx, k) => ctx.events.filter(e => e.kind === k).length;

function midSim() {
  const s = sim.newState(PROFILES.casual, 3);
  s.pressureBest = 20;
  s.fields[0].rig = 3; s.fields[1].rig = 1; s.fields[2].rig = 12;
  s.fields[0].F = 9.95; s.fields[1].F = 9.99; s.fields[2].F = 19.9;
  s.fields.forEach(f => { f.bestGrade = sim.gradeOf(f.F); });
  return s;
}
function toGame(s) {
  const g = createCoreLoopState();
  s.fields.forEach((f, i) => {
    Object.assign(g.fields[i], { frontier: f.F, bestGrade: f.bestGrade, inventory: [...f.inv], rig: f.rig, rigBestGrade: f.rigBest });
  });
  g.well.pressureBest = s.pressureBest;
  return g;
}

console.log('--- fill is in seconds, not Material units ---');
{
  const fillOf = (pressure, rig) => {
    const g = createCoreLoopState();
    g.well.pressureBest = pressure;
    g.fields[FIELD.OASIS].rig = rig; g.fields[FIELD.MINE].rig = rig;
    for (const [, presence, dt] of STATES) C.step(g, dt, presence);
    return g.cauldrons.vats.map(v => v.fill);
  };
  const base = fillOf(0, 1);
  assert.deepEqual(fillOf(200, 1), base, 'Pressure is not a factor');
  assert.deepEqual(fillOf(0, 9), base, 'Rig level is not a factor');
  assert.deepEqual(fillOf(200, 9), base);
  // 5 s Hands-on, 30 s Watching, 300 s Away; Sands adds 0.25 s per working Rig (two Rigs) per second
  assert.equal(base[C.VAT.hand], 5); assert.equal(base[C.VAT.oil], 30); assert.equal(base[C.VAT.time], 300);
  near(base[C.VAT.sands], 5 + 2 * P.sandsPerRig * (5 + 30 + 300), 'Sands');
  // no Rig, not Hands-on: Sands stays empty
  const g = createCoreLoopState();
  C.step(g, 100, PRESENCE.WATCH); C.step(g, 100, PRESENCE.AWAY);
  assert.equal(g.cauldrons.vats[C.VAT.sands].fill, 0);
}

console.log('--- sim comparison over mixed steps ---');
{
  const s = midSim();
  const g = toGame(s);
  const ctx = makeContext();
  // the player's policy, as the sim plays it with no Orders open: level the lowest Bubble while affordable
  // The sim refreshes frac.bub only when it brews, so inside a burst of level-ups its Oasis price
  // (Bitumen powers the Oasis Rig) stays at the pre-burst Bitumen. The game refreshes at once, which
  // is right for the player; the test puts the old totals back between levels to compare like with like.
  const playerLevels = () => {
    const stale = g.refinery.frac.map(f => f.bubble);
    for (let guard = 0; guard < 200; guard++) {
      const i = C.lowestBubble(g);
      if (i < 0 || !C.canLevelBubble(g, i)) break;
      assert.ok(C.levelBubble(g, i, ctx));
      g.refinery.frac.forEach((f, k) => { f.bubble = stale[k]; });
    }
    C.recompute(g);
  };
  let levelled = 0, bubbles = 0;
  for (let n = 0; n < 4000; n++) {
    const [st, presence, dt] = STATES[(n * 7 + (n >> 3)) % 3];
    const out = sim.fieldsStep(s, dt, st);
    assert.equal(C.workingRigs(g, presence), out.rigs, 'working Rigs');
    if (n % 200 === 0) s.fields[FIELD.OASIS].inv[0] += 5000 * (n / 200);   // some Essence to spend
    // the Material and Mastery the Rigs make are the Fields' business: give the game the sim's
    s.fields.forEach((f, i) => { g.fields[i].inventory = [...f.inv]; g.mastery[i].hours = [...f.hours]; g.mastery[i].ranks = [...f.ranks]; });
    sim.cauldronFill(s, dt, st, out.rigs);
    C.step(g, dt, presence, ctx);
    sim.brew(s);
    C.brewAll(g, ctx);
    sim.bubbleLevels(s);
    playerLevels();
    if (n % 50 === 0 || n === 3999) {
      s.caul.forEach((c, i) => {
        const v = g.cauldrons.vats[i];
        near(v.fill, c.fill, `fill ${i} @${n}`); assert.equal(v.brewed, c.n); assert.equal(v.bars, c.bars); near(v.speed, c.speed, 'speed');
      });
      assert.deepEqual(g.cauldrons.bubbles, s.bubbles.map(b => ({ frac: b.f, level: b.level })), `bubbles @${n}`);
      // the sim's frac.bub is refreshed only at the next brew; the game's is current
      const bub = s.frac.map(() => 0);
      s.bubbles.forEach(b => { bub[b.f] += sim.bubbleEffect(b.level); });
      s.frac.forEach((f, i) => near(g.refinery.frac[i].bubble, bub[i], `bub ${i}`));
      s.fields[FIELD.OASIS].inv.forEach((x, k) => near(g.fields[FIELD.OASIS].inventory[k], x, `inventory ${k}`));
    }
    bubbles = s.bubbles.length;
    levelled = s.bubbles.reduce((a, b) => a + b.level - 1, 0);
  }
  const simCount = (k) => s.events.filter(e => e.k === k).length;
  assert.equal(count(ctx, 'bubble'), simCount('bubble'));
  assert.equal(count(ctx, 'bubbleFamily'), simCount('bubbleFamily'));
  assert.ok(bubbles >= P.bubbleFamily && levelled > 10, `the run should exercise Bubbles and levels (${bubbles}/${levelled})`);
  assert.ok(g.cauldrons.vats.some(v => v.speed > 1), 'and a speed upgrade');
}

console.log('--- formulas against the sim ---');
{
  for (const L of [1, 2, 10, 50, 1000]) near(C.bubbleEffect(L), sim.bubbleEffect(L), `effect ${L}`);
  assert.ok(C.bubbleEffect(1e9) < P.bubbleA, 'saturates below bubbleA');
  const s = midSim(); const g = toGame(s);
  for (const [n, vat] of [[0, 0], [3, 1], [20, 2], [99, 3]]) {
    s.caul[vat].n = n; g.cauldrons.vats[vat].brewed = n;
    near(C.barCost(g, vat), sim.bubbleCost(s.caul[vat], vat), `barCost ${vat}`);
  }
  s.bubbles = [{ f: 0, level: 1 }, { f: 1, level: 7 }, { f: 0, level: 30 }];
  g.cauldrons.bubbles = [{ frac: 0, level: 1 }, { frac: 1, level: 7 }, { frac: 0, level: 30 }];
  sim.recomputeBubbles(s); C.recompute(g);
  s.frac.forEach((f, i) => near(g.refinery.frac[i].bubble, f.bub, 'recompute'));
  assert.equal(C.bubbleCount(g, 0), 2);
  near(C.fractionBubbles(g, 0), C.bubbleEffect(1) + C.bubbleEffect(30), 'fraction total');
  g.cauldrons.bubbles = []; C.recompute(g);
  assert.ok(g.refinery.frac.every(f => f.bubble === 0), 'recompute drops stale totals');
}

console.log('--- brewing: every 5th bar, families, the loop guard ---');
{
  const g = createCoreLoopState();
  const ctx = makeContext();
  const hand = C.VAT.hand;
  assert.equal(C.brew(g, hand, ctx), false, 'empty vat');
  g.cauldrons.vats[hand].fill = 1e9;
  const kinds = [];
  for (let i = 0; i < P.upgradeEvery * 2; i++) {
    assert.equal(C.nextIsUpgrade(g, hand), (i + 1) % P.upgradeEvery === 0);
    kinds.push(C.brew(g, hand, ctx));
  }
  assert.deepEqual(kinds, ['bubble', 'bubble', 'bubble', 'bubble', 'upgrade', 'bubble', 'bubble', 'bubble', 'bubble', 'upgrade']);
  const v = g.cauldrons.vats[hand];
  assert.equal(v.bars, 10); assert.equal(v.brewed, 8); near(v.speed, 1 + 2 * P.cauldronSpeed, 'speed');
  assert.deepEqual(g.cauldrons.bubbles.map(b => b.frac), [0, 1, 2, 3, 4, 0, 1, 2]);
  assert.equal(count(ctx, 'bubble'), 8);
  assert.ok(ctx.events.filter(e => e.kind === 'bubble').every(e => e.level === HIT.BIG && e.cauldron === hand));
  assert.equal(count(ctx, 'bubbleFamily'), Math.floor(8 / P.bubbleFamily), 'a family every P.bubbleFamily Bubbles');
  near(g.refinery.frac[0].bubble, 2 * C.bubbleEffect(1), 'frac[i].bubble is current after a brew');
  while (g.cauldrons.bubbles.length < 3 * P.bubbleFamily) C.brew(g, hand, ctx);
  assert.equal(count(ctx, 'bubbleFamily'), 3);
  assert.deepEqual(ctx.events.find(e => e.kind === 'bubbleFamily'), { kind: 'bubbleFamily', level: HIT.NOVELTY, n: 1 });
  // brewAll stops at 50 bars a vat and leaves the rest
  const h = createCoreLoopState();
  h.cauldrons.vats[0].fill = 1e12;
  assert.equal(C.brewAll(h), 50);
  assert.equal(h.cauldrons.vats[0].bars, 50);
  assert.ok(h.cauldrons.vats[0].fill > 0);
}

console.log('--- UI helpers ---');
{
  const g = createCoreLoopState();
  const oil = C.VAT.oil;
  assert.equal(C.fillFraction(g, oil), 0);
  g.cauldrons.vats[oil].fill = C.barCost(g, oil) / 4;
  near(C.fillFraction(g, oil), 0.25, 'fraction');
  near(C.secondsToBar(g, oil, PRESENCE.WATCH), C.barCost(g, oil) * 0.75, 'seconds to bar');
  assert.equal(C.secondsToBar(g, oil, PRESENCE.AWAY), Infinity);
  g.cauldrons.vats[oil].speed = 2;
  near(C.secondsToBar(g, oil, PRESENCE.WATCH), C.barCost(g, oil) * 0.375, 'speed shortens it');
  g.cauldrons.vats[oil].fill = 1e9;
  assert.equal(C.secondsToBar(g, oil, PRESENCE.AWAY), 0);
  assert.equal(C.fillFraction(g, oil), 1);
}

console.log('--- levelling a Bubble ---');
{
  const g = createCoreLoopState();
  g.fields[FIELD.OASIS].rig = 3;
  g.cauldrons.bubbles = [{ frac: 0, level: 3 }, { frac: 1, level: 2 }, { frac: 2, level: 2 }]; C.recompute(g);
  assert.equal(C.lowestBubble(g), 1, 'first of the lowest');
  assert.equal(C.lowestBubble(createCoreLoopState()), -1);
  const cost = C.levelCost(g, 1);
  near(cost, P.bubbleLevelHours * P.bubbleCostGrowth * Rigs.fieldHour(g, FIELD.OASIS), 'cost');
  assert.equal(C.canLevelBubble(g, 1), false);
  assert.equal(C.levelBubble(g, 1), false);
  Fields.addMaterial(g, FIELD.OASIS, 0, cost / 2); Fields.addMaterial(g, FIELD.OASIS, 2, cost / 2 + 7);
  const ctx = makeContext();
  assert.equal(C.levelBubble(g, 1, ctx), true);
  assert.equal(g.cauldrons.bubbles[1].level, 3);
  near(Fields.countAtLeast(g, FIELD.OASIS, 0), 7, 'paid from any grade');
  assert.equal(ctx.events.length, 0, 'no event');
  near(g.refinery.frac[1].bubble, C.bubbleEffect(3), 'frac updated');
  assert.equal(C.canLevelBubble(g, 99), false);
}

console.log('--- save round trip ---');
{
  const g = createCoreLoopState();
  g.cauldrons.vats[1] = { fill: 123.5, brewed: 7, bars: 9, speed: 1.1 };
  g.cauldrons.bubbles = [{ frac: 3, level: 4 }, { frac: 0, level: 1 }];
  C.recompute(g);
  const back = deserializeCoreLoop(JSON.parse(JSON.stringify(serializeCoreLoop(g))));
  assert.deepEqual(back.cauldrons, g.cauldrons);
  C.recompute(back);
  back.refinery.frac.forEach((f, i) => near(f.bubble, g.refinery.frac[i].bubble, 'recomputed after load'));
  assert.equal(FRACTIONS.length, 5);
}
console.log('cauldrons: ok');
