// CL-2: Fields and Rigs (js/systems/coreloop/Fields.js, Rigs.js) against the sim's fieldPower,
// fieldsStep, rigRate, rigGrade, handRateBase, fieldHour, addInv, takeAtLeast and invAtLeast
import assert from 'node:assert/strict';
import { P } from './js/systems/coreloop/params.js';
import { createCoreLoopState, serializeCoreLoop, deserializeCoreLoop } from './js/systems/coreloop/state.js';
import { PRESENCE, HIT, FRAC, makeContext } from './js/systems/coreloop/shared.js';
import * as Fields from './js/systems/coreloop/Fields.js';
import * as Rigs from './js/systems/coreloop/Rigs.js';
import * as sim from './sim/redesign/model.mjs';
import { PROFILES } from './sim/redesign/profiles.mjs';

const TOL = 1e-12;
const near = (a, b, what) => {
  const d = Math.abs(a - b);
  assert.ok(d <= TOL * Math.max(1, Math.abs(a), Math.abs(b)), `${what}: game ${a} vs sim ${b}`);
};
const NF = P.fields.length;
const STATES = [['hands', PRESENCE.HANDS, 5], ['watch', PRESENCE.WATCH, 30], ['away', PRESENCE.AWAY, 300]];

// The sim's state as a game state (README.md "Game vs sim")
function toGame(s) {
  const g = createCoreLoopState();
  g.t = s.t;
  s.fields.forEach((f, i) => {
    Object.assign(g.fields[i], { frontier: f.F, bestGrade: f.bestGrade, inventory: [...f.inv], rig: f.rig, rigBestGrade: f.rigBest });
    g.mastery[i].hours = [...f.hours]; g.mastery[i].ranks = [...f.ranks];
  });
  g.presence.heatSeconds = s.heatT; g.presence.handField = s.handField;
  g.well.pressureBest = s.pressureBest;
  g.prestige.charter = s.charter;
  g.refinery.frac.forEach((f, i) => { f.level = s.frac[i].level; f.bubble = s.frac[i].bub; f.vial = s.frac[i].vial; f.compound = s.frac[i].extra; });
  return g;
}

function midSim(charter = 'none') {
  const s = sim.newState(PROFILES.casual, 3);
  s.charter = charter; s.pressureBest = 20;
  s.fields[0].rig = 3; s.fields[1].rig = 1; s.fields[2].rig = 12;
  s.fields[0].F = 9.95; s.fields[1].F = 9.99; s.fields[2].F = 19.9;
  s.fields.forEach(f => { f.bestGrade = sim.gradeOf(f.F); });
  s.fields[2].ranks = [1, 2, 0, 5]; s.fields[2].hours = [0.3, 2, 0, 90];
  s.frac[FRAC.KEROSENE].level = 12; s.frac[FRAC.BITUMEN].level = 30; s.frac[FRAC.BITUMEN].bub = 0.4; s.frac[FRAC.GAS].level = 5;
  return s;
}

console.log('--- grades, power, rates against the sim ---');
{
  for (const charter of ['none', 'wildcatter', 'operator', 'baron']) {
    const s = midSim(charter);
    s.heatT = 37;
    const g = toGame(s);
    for (const F of [0, 9.99, 10, 55.5, 1234]) assert.equal(Fields.gradeOf(F), sim.gradeOf(F));
    for (let i = 0; i < NF; i++) {
      for (const [st, presence] of STATES) {
        near(Fields.fieldPower(g, i, presence), sim.fieldPower(s, i, st), `fieldPower ${i} ${st}`);
        near(Rigs.rigRate(g, i, presence), sim.rigRate(s, i, st), `rigRate ${i} ${st} ${charter}`);
      }
      assert.equal(Rigs.rigGrade(g, i), sim.rigGrade(s.fields[i]));
      near(Rigs.fieldHour(g, i), sim.fieldHour(s, i), 'fieldHour');
    }
    near(Rigs.fieldSpeed(g), sim.fieldSpeed(s), 'fieldSpeed');
    near(Rigs.handRate(g), sim.handRateBase(s), `handRate ${charter}`);
  }
  // Rig reach: 0.6 at level 1, +0.04 a level, never above 0.9
  const g = createCoreLoopState();
  g.fields[0].rig = 1; near(Rigs.rigReach(g, 0), 0.6, 'reach 1');
  g.fields[0].rig = 6; near(Rigs.rigReach(g, 0), 0.8, 'reach 6');
  g.fields[0].rig = 50; near(Rigs.rigReach(g, 0), 0.9, 'reach cap');
  assert.equal(Rigs.rigRate(createCoreLoopState(), 0, PRESENCE.WATCH), 0, 'no Rig, no rate');
}

console.log('--- Hands-on : Watching : Away ratios; Away never above 45% of Watching ---');
{
  const g = createCoreLoopState();
  for (const f of g.fields) f.rig = 4;
  const watch = Rigs.rigRate(g, 0, PRESENCE.WATCH);
  near(Rigs.rigRate(g, 0, PRESENCE.AWAY) / watch, P.away / P.watch, 'Away : Watching');
  near(Rigs.rigRate(g, 0, PRESENCE.HANDS) / watch, P.hands / P.watch, 'Hands-on Rig : Watching');
  // hand work is handMult x the Rig rate (average), x Heat 1..2
  near(Rigs.handRate(g) / watch, P.handMult, 'hand work : Watching');
  g.presence.heatSeconds = P.heatRamp;
  near(Rigs.handRate(g) * 2 / watch, 2 * P.handMult, 'hand work at full Heat');
  // the same as the sim's
  const s = sim.newState(PROFILES.casual, 1);
  s.charter = 'none'; s.fields.forEach(f => { f.rig = 4; });
  near(sim.rigRate(s, 0, 'away') / sim.rigRate(s, 0, 'watch'), P.away / P.watch, 'sim Away : Watching');
  near(sim.handRateBase(s) / sim.rigRate(s, 0, 'watch'), P.handMult, 'sim hand : Watching');
  // a large Bitumen value and the Baron's charter: the cap holds
  g.prestige.charter = 'baron';
  g.refinery.frac[FRAC.BITUMEN].level = 2000; g.refinery.frac[FRAC.BITUMEN].bubble = 50;
  for (const ch of ['baron', 'operator', 'wildcatter', 'none']) {
    g.prestige.charter = ch;
    const watchMult = P.charter[ch] ? (P.charter[ch].watch || 1) : 1;
    for (let i = 0; i < NF; i++) {
      const w = Rigs.rigRate(g, i, PRESENCE.WATCH) / watchMult, a = Rigs.rigRate(g, i, PRESENCE.AWAY);
      assert.ok(a <= P.awayCap * w * (1 + 1e-12), `Away ${a} vs plain Watching ${w} (${ch})`);
      near(a / w, P.awayCap, `${ch} + big Bitumen sits at the cap`);
    }
  }
}

console.log('--- inventory: add, count, take (lowest grade first), all or nothing ---');
{
  const g = createCoreLoopState();
  Fields.addMaterial(g, 1, 3, 5);
  Fields.addMaterial(g, 1, 0, 2);
  Fields.addMaterial(g, 1, 3, 1);
  assert.deepEqual(g.fields[1].inventory, [2, 0, 0, 6]);
  assert.equal(Fields.countAtLeast(g, 1, 0), 8);
  assert.equal(Fields.countAtLeast(g, 1, 1), 6);
  assert.equal(Fields.countAtLeast(g, 1, 9), 0);
  Fields.addMaterial(g, 1, 2, 3);
  assert.equal(Fields.takeMaterial(g, 1, 2, 4), true);
  assert.deepEqual(g.fields[1].inventory, [2, 0, 0, 5]);   // 3 from grade 2 first, then 1 from grade 3
  const before = JSON.stringify(g.fields[1].inventory);
  assert.equal(Fields.takeMaterial(g, 1, 2, 5.5), false);
  assert.equal(JSON.stringify(g.fields[1].inventory), before, 'a failed take takes nothing');
  assert.equal(Fields.takeMaterial(g, 1, 0, 7), true);
  assert.equal(Fields.countAtLeast(g, 1, 0), 0);
  for (const bad of [0, -3, NaN, Infinity, undefined]) {
    assert.equal(Fields.takeMaterial(g, 0, 0, bad), false);
    Fields.addMaterial(g, 0, 4, bad);
  }
  assert.deepEqual(g.fields[0].inventory, [0], 'bad amounts change nothing');
  // against the sim's helpers when the take is possible
  const s = sim.newState(PROFILES.casual, 1);
  const g2 = createCoreLoopState();
  for (const [grade, u] of [[0, 4.5], [2, 3], [5, 1.25], [2, 0.5]]) { sim.addInv(s.fields[0], grade, u); Fields.addMaterial(g2, 0, grade, u); }
  sim.takeAtLeast(s.fields[0], 1, 3.2); assert.ok(Fields.takeMaterial(g2, 0, 1, 3.2));
  assert.deepEqual(g2.fields[0].inventory, s.fields[0].inv);
  near(Fields.countAtLeast(g2, 0, 2), sim.invAtLeast(s.fields[0], 2), 'count');
}

console.log('--- frontier, grade event, UI helpers ---');
{
  const g = createCoreLoopState();
  const ctx = makeContext();
  g.fields[0].frontier = 9.9999;
  const speed = Fields.frontierSpeed(g, 0);
  assert.ok(speed > 0 && speed <= P.vMax);
  near(Fields.levelsToNextGrade(g, 0), 10 - 9.9999, 'levels to next grade');
  const grade = Fields.pushFrontier(g, 0, 5, ctx);
  assert.equal(grade, 1);
  assert.equal(g.fields[0].bestGrade, 1);
  assert.deepEqual(ctx.events, [{ kind: 'grade', level: HIT.NOVELTY, field: 0, grade: 1 }]);
  Fields.pushFrontier(g, 0, 5, ctx);
  assert.equal(ctx.events.length, 1, 'no second event inside the same grade');
  // a far frontier is slow, a low one runs at vMax
  g.fields[1].frontier = 0; near(Fields.frontierSpeed(g, 1), P.vMax / (1 + Math.exp(-Math.log10(Fields.fieldPower(g, 1, PRESENCE.HANDS)) * P.sigK)), 'sigmoid');
  g.fields[1].frontier = 5000;
  assert.ok(Fields.frontierSpeed(g, 1) < 1e-9 * P.vMax);
}

console.log('--- Rigs.step matches the sim fieldsStep over mixed steps ---');
for (const charter of ['none', 'baron', 'wildcatter']) {
  const s = midSim(charter);
  s.log = true;
  const g = toGame(s);
  const ctx = makeContext();
  let simGrades = 0, rigGrades = 0, ranks = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const [st, presence, dt] = STATES[i % 3];
    s.handField = Math.floor(i / 200) % NF; g.presence.handField = s.handField;
    s.heatT = st === 'hands' ? (i * 7) % 90 : 0; g.presence.heatSeconds = s.heatT;
    const a = sim.fieldsStep(s, dt, st);
    const b = Rigs.step(g, dt, presence, ctx);
    near(b.units, a.units, `units at ${i}`);
    assert.equal(b.rigs, a.rigs, `rigs at ${i}`);
    s.t += dt; g.t += dt;
  }
  s.events.forEach(e => { if (e.k === 'grade') simGrades++; if (e.k === 'rigGrade') rigGrades++; if (e.k === 'rank') ranks++; });
  s.fields.forEach((f, i) => {
    const gf = g.fields[i];
    near(gf.frontier, f.F, `frontier ${i}`);
    assert.equal(gf.bestGrade, f.bestGrade); assert.equal(gf.rigBestGrade, f.rigBest);
    assert.equal(gf.inventory.length, f.inv.length);
    f.inv.forEach((x, k) => near(gf.inventory[k], x, `inventory ${i}/${k}`));
    assert.deepEqual(g.mastery[i].ranks, f.ranks);
    f.hours.forEach((h, a) => near(g.mastery[i].hours[a], h, `hours ${i}/${a}`));
  });
  const count = (k) => ctx.events.filter(e => e.kind === k).length;
  assert.equal(count('grade'), simGrades);
  assert.equal(count('rigGrade'), rigGrades);
  assert.equal(count('rank'), ranks);
  assert.ok(simGrades > 0 && rigGrades > 0 && ranks > 0, `the run should exercise events (${simGrades}/${rigGrades}/${ranks})`);
  console.log(`  ${charter}: ${N} steps, ${simGrades} grades, ${rigGrades} Rig grades, ${ranks} ranks`);
}

console.log('--- rigGrade event, hand work and the Rig order ---');
{
  const g = createCoreLoopState();
  const ctx = makeContext();
  g.fields[0].rig = 1; g.fields[0].frontier = 50;
  Rigs.step(g, 30, PRESENCE.WATCH, ctx);
  assert.deepEqual(ctx.events, [{ kind: 'rigGrade', level: HIT.NOVELTY, field: 0, grade: 3 }]);   // floor(0.6 x 50 / 10)
  assert.equal(g.fields[0].rigBestGrade, 3);
  Rigs.step(g, 30, PRESENCE.WATCH, ctx);
  assert.equal(ctx.events.length, 1);
  assert.equal(g.fields[0].inventory.length, 4);
  // Away works the Rig too; hand work only when Hands-on and on handField
  const away = Rigs.step(g, 300, PRESENCE.AWAY);
  assert.deepEqual([away.rigs], [1]);
  const h = createCoreLoopState();
  h.presence.handField = 2;
  const r = Rigs.step(h, 5, PRESENCE.HANDS);
  near(r.units, P.handFloor * P.handMult * 1 * 5, 'hand units without Rigs at Heat 1');
  assert.equal(r.rigs, 0);
  assert.ok(Fields.countAtLeast(h, 2, 0) > 0 && Fields.countAtLeast(h, 0, 0) === 0);
  assert.ok(h.mastery[2].hours[0] > 0 && h.mastery[0].hours[0] === 0);
  assert.equal(Rigs.step(createCoreLoopState(), 30, PRESENCE.WATCH).units, 0);
}

console.log('--- haul: a Gusher pays the Watching rate at the Rig grade ---');
{
  const s = midSim('operator');
  const g = toGame(s);
  const before = g.fields.map(f => f.inventory.reduce((x, y) => x + y, 0));
  const total = Rigs.haul(g, P.gusherSeconds * 2);
  let want = 0;
  for (let i = 0; i < NF; i++) {
    const u = sim.rigRate(s, i, 'watch') * P.gusherSeconds * 2;
    want += u;
    near(Fields.countAtLeast(g, i, 0) - before[i], u, `haul ${i}`);
    near(Fields.countAtLeast(g, i, sim.rigGrade(s.fields[i])) - before[i], u, `haul grade ${i}`);
  }
  near(total, want, 'haul total');
  const empty = createCoreLoopState();
  assert.equal(Rigs.haul(empty, 60), 0);
  assert.deepEqual(empty.fields[0].inventory, [0]);
}

console.log('--- build, levelUp, resetLevels ---');
{
  const g = createCoreLoopState();
  assert.equal(Rigs.levelUp(g, 0), false, 'needs a Rig');
  assert.equal(g.fields[0].rig, 0);
  assert.equal(Rigs.build(g, 0), true);
  assert.equal(g.fields[0].rig, 1);
  assert.equal(Rigs.build(g, 0), false, 'already built');
  assert.equal(Rigs.levelUp(g, 0), true); Rigs.levelUp(g, 0);
  assert.equal(g.fields[0].rig, 3);
  Rigs.build(g, 2); g.fields[2].rig = 9;
  Rigs.resetLevels(g);
  assert.deepEqual(g.fields.map(f => f.rig), [1, 0, 1], 'Rigs back to level 1; unbuilt stay unbuilt');
}

console.log('--- a played state round-trips through save and load ---');
{
  const s = midSim('baron');
  const g = toGame(s);
  for (let i = 0; i < 300; i++) Rigs.step(g, 5, PRESENCE.HANDS);
  Rigs.step(g, 300, PRESENCE.AWAY);
  const h = deserializeCoreLoop(JSON.parse(JSON.stringify(serializeCoreLoop(g))));
  g.fields.forEach((f, i) => {
    assert.deepEqual(h.fields[i], f);
    assert.deepEqual(h.mastery[i], g.mastery[i]);
  });
}

console.log('test_cl_fields: ok');
