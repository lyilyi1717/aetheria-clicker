// CL-4: Refinery (js/systems/coreloop/Refinery.js) against the sim's postOrders, fillOrders,
// weeklyOrder, reserved, surplus and orderField
import assert from 'node:assert/strict';
import { P } from './js/systems/coreloop/params.js';
import { createCoreLoopState, serializeCoreLoop, deserializeCoreLoop } from './js/systems/coreloop/state.js';
import { PRESENCE, HIT, FRAC, FRACTIONS, makeContext, fracValue } from './js/systems/coreloop/shared.js';
import * as Fields from './js/systems/coreloop/Fields.js';
import * as Rigs from './js/systems/coreloop/Rigs.js';
import * as R from './js/systems/coreloop/Refinery.js';
import * as sim from './sim/redesign/model.mjs';
import { PROFILES } from './sim/redesign/profiles.mjs';

const TOL = 1e-12;
const near = (a, b, what) => {
  const d = Math.abs(a - b);
  assert.ok(d <= TOL * Math.max(1, Math.abs(a), Math.abs(b)), `${what}: game ${a} vs sim ${b}`);
};
const NF = P.fields.length;
const WEEK = 7 * 86400;

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

function midSim(rigs = [3, 1, 12], charter = 'none') {
  const s = sim.newState(PROFILES.casual, 3);
  s.charter = charter; s.pressureBest = 20;
  rigs.forEach((r, i) => { s.fields[i].rig = r; });
  s.fields[0].F = 59.5; s.fields[1].F = 39.9; s.fields[2].F = 99.9;
  s.fields.forEach(f => { f.bestGrade = sim.gradeOf(f.F); });
  s.frac[FRAC.KEROSENE].level = 12; s.frac[FRAC.BITUMEN].level = 30; s.frac[FRAC.GAS].level = 5;
  return s;
}

const addBoth = (s, g, i, grade, units) => { sim.addInv(s.fields[i], grade, units); Fields.addMaterial(g, i, grade, units); };

function sameOrders(g, s, what) {
  s.orders.forEach((so, i) => {
    const go = g.refinery.orders[i];
    assert.equal(go.empty, so.empty, `${what} slot ${i} empty`);
    if (so.empty) { assert.equal(go.refillAt, so.refillAt, `${what} slot ${i} refillAt`); return; }
    for (const k of ['frac', 'field', 'grade', 'posted']) assert.equal(go[k], so[k], `${what} slot ${i} ${k}`);
    near(go.qty, so.qty, `${what} slot ${i} qty`);
  });
  g.refinery.frac.forEach((f, i) => assert.equal(f.level, s.frac[i].level, `${what} level ${i}`));
  for (let i = 0; i < NF; i++) {
    const n = Math.max(g.fields[i].inventory.length, s.fields[i].inv.length);
    for (let k = 0; k < n; k++) near(g.fields[i].inventory[k] || 0, s.fields[i].inv[k] || 0, `${what} inv ${i}:${k}`);
    near(R.reserved(g, i), sim.reserved(s, i), `${what} reserved ${i}`);
    near(R.surplus(g, i), sim.surplus(s, i), `${what} surplus ${i}`);
  }
  const w = s.weekly;
  assert.equal(g.refinery.weekly.week, w.week, `${what} week`);
  assert.equal(!!g.refinery.weekly.need, !!w.need, `${what} weekly open`);
  if (w.need) w.need.forEach((n, i) => {
    assert.equal(g.refinery.weekly.need[i].grade, n.grade, `${what} need grade`);
    near(g.refinery.weekly.need[i].qty, n.qty, `${what} need qty`);
  });
}

console.log('--- Orders and the weekly Order against the sim, many rounds ---');
for (const [rigs, charter] of [[[3, 1, 12], 'none'], [[0, 0, 0], 'none'], [[2, 0, 5], 'operator'], [[6, 6, 6], 'wildcatter']]) {
  const s = midSim(rigs, charter);
  const g = toGame(s);
  let seed = 12345;
  const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed / 4294967296; };
  let fills = 0, weeklies = 0;
  for (let round = 0; round < 400; round++) {
    // time moves on (up to ~1 h a round, so 400 rounds cross several weeks)
    const dt = 300 + Math.floor(rnd() * 3300);
    s.t += dt; g.t += dt;
    // Materials arrive in both, at the Rig grade and a grade or two under it
    for (let i = 0; i < NF; i++) {
      const rg = sim.rigGrade(s.fields[i]);
      for (const gr of [rg, Math.max(0, rg - 1), 0]) addBoth(s, g, i, gr, rnd() * 150);
    }
    // the Fields move up and Rigs level, now and then
    if (round % 40 === 39) {
      const i = Math.floor(rnd() * NF);
      s.fields[i].F += 6; g.fields[i].frontier += 6;
      if (s.fields[i].rig > 0 || round > 200) { s.fields[i].rig++; g.fields[i].rig++; }
    }
    const lvlBefore = g.refinery.frac.reduce((a, f) => a + f.level, 0);
    sim.postOrders(s); R.postOrders(g);
    sameOrders(g, s, `r${round} posted`);
    sim.fillOrders(s); R.fillAll(g);
    sameOrders(g, s, `r${round} filled`);
    sim.weeklyOrder(s); R.postWeekly(g); if (R.fillWeekly(g)) weeklies++;
    sameOrders(g, s, `r${round} weekly`);
    fills += g.refinery.frac.reduce((a, f) => a + f.level, 0) - lvlBefore;
  }
  assert.ok(fills > 0 || rigs[0] === 0, `Orders got filled (${rigs} ${charter})`);
  if (rigs.join() === "3,1,12") assert.ok(weeklies > 0, `the weekly Order was filled (${rigs})`);
  console.log(`  rigs ${rigs} ${charter}: ${fills} levels gained, ${g.refinery.frac.map(f => f.level)}`);
}

console.log('--- orderField, reserved and surplus ---');
{
  const s = midSim(); const g = toGame(s);
  addBoth(s, g, 1, 0, 50); addBoth(s, g, 2, 3, 80);
  for (const src of ['tower', 'mine', 'oasis', 'any']) assert.equal(R.orderField(g, src), sim.orderField(s, src), src);
  assert.equal(R.orderField(g, 'any'), 2, 'any = the largest stock');
  assert.equal(R.orderField(createCoreLoopState(), 'any'), 0, 'a tie goes to the first Field');
  sim.postOrders(s); R.postOrders(g);
  for (let i = 0; i < NF; i++) { near(R.reserved(g, i), sim.reserved(s, i), 'reserved'); near(R.surplus(g, i), sim.surplus(s, i), 'surplus'); }
  const total = [0, 1, 2].reduce((a, i) => a + R.reserved(g, i), 0);
  near(total, g.refinery.orders.reduce((a, o) => a + o.qty, 0), 'every open Order reserves its Field');
  assert.equal(R.surplus(createCoreLoopState(), 0), 0);
}

console.log('--- done-when: Materials only, grade, refill ---');
{
  const g = createCoreLoopState();
  g.fields.forEach((f, i) => { f.rig = 4; f.frontier = 35 + i; });
  const wellBefore = JSON.stringify(serializeCoreLoop(g).well);
  R.postOrders(g);
  assert.equal(R.orderInfo(g, 0).empty, false);
  // an Order's grade is the Field's Rig grade, so the Rig's own haul fills it
  for (const o of g.refinery.orders) {
    assert.equal(o.grade, Rigs.rigGrade(g, o.field), 'grade = Rig grade');
    assert.ok(Rigs.rigGrade(g, o.field) > 0);
  }
  // haul by Rig alone for orderSeconds at the Watching rate, and every Order is fillable
  const slot0 = g.refinery.orders[0];
  assert.equal(R.canFillOrder(g, 0), false, 'empty stock cannot fill');
  assert.equal(R.fillOrder(g, 0), false);
  assert.equal(g.refinery.frac[slot0.frac].level, 0, 'a failed fill changes nothing');
  for (const o of g.refinery.orders) {
    const rigOnly = P.orderSeconds * Rigs.rigRate(g, o.field, PRESENCE.WATCH);
    assert.ok(o.qty >= rigOnly && o.qty <= rigOnly + P.orderSeconds * P.orderHandShare * Rigs.handRate(g) + 1e-9);
  }
  Rigs.haul(g, P.orderSeconds * 3);
  assert.ok(g.refinery.orders.every((_, i) => R.canFillOrder(g, i)), 'the Rig alone fills them, given time');
  // fill one: Materials down, +1 level, refill later; the Well is untouched
  const ctx = makeContext(), events = ctx.events;
  const before = Fields.countAtLeast(g, slot0.field, slot0.grade);
  const fr = slot0.frac, qty = slot0.qty, fld = slot0.field, grd = slot0.grade;
  g.t = 100;
  assert.equal(R.fillOrder(g, 0, ctx), true);
  near(before - Fields.countAtLeast(g, fld, grd), qty, 'the Order took its quantity');
  assert.equal(g.refinery.frac[fr].level, 1);
  assert.deepEqual(g.refinery.orders[0], { empty: true, refillAt: 100 + P.orderRefill });
  assert.equal(JSON.stringify(serializeCoreLoop(g).well), wellBefore, 'nothing in state.well changed');
  assert.deepEqual(events, [{ kind: 'order', level: HIT.BIG, frac: fr, slot: 0, age: 100 }]);
  near(R.orderInfo(g, 0).refillIn, P.orderRefill, 'refillIn');
  assert.ok(qty > 0);
  // the slot stays empty until refillAt, then step posts it again
  g.t = 100 + P.orderRefill - 1;
  R.step(g, 5, PRESENCE.WATCH);
  assert.equal(g.refinery.orders[0].empty, true, 'not yet');
  g.t = 100 + P.orderRefill;
  R.step(g, 5, PRESENCE.WATCH);
  assert.equal(g.refinery.orders[0].empty, false, 'refilled after P.orderRefill');
  assert.equal(g.refinery.orders[0].posted, g.t);
  // a Fraction is on one open Order at a time
  const fracs = g.refinery.orders.map(o => o.frac);
  assert.equal(new Set(fracs).size, fracs.length);
}

console.log('--- no Rig: one grade under the frontier ---');
{
  const g = createCoreLoopState();
  g.fields.forEach(f => { f.frontier = 47; });
  R.postOrders(g);
  for (const o of g.refinery.orders) assert.equal(o.grade, Fields.gradeOf(47) - 1);
  const g2 = createCoreLoopState();
  R.postOrders(g2);
  for (const o of g2.refinery.orders) assert.equal(o.grade, 0, 'never below grade 0');
  // quantity falls back to the hand-work floor
  for (const o of g2.refinery.orders) near(o.qty, P.orderSeconds * P.orderHandShare * Rigs.handRate(g2), 'qty without a Rig');
}

console.log('--- step, fillAll, order of slots ---');
{
  const g = createCoreLoopState();
  R.step(g, 5, PRESENCE.AWAY);
  assert.equal(g.refinery.orders.filter(o => !o.empty).length, P.orderSlots, 'all slots posted at t = 0');
  assert.equal(g.refinery.weekly.need, null, 'no weekly Order without Rigs');
  assert.equal(R.fillAll(g), 0);
  g.fields.forEach((f, i) => { f.rig = 1; Fields.addMaterial(g, i, 0, 1e6); });
  const ctx = makeContext(), events = ctx.events;
  assert.equal(R.fillAll(g, ctx), P.orderSlots);
  assert.deepEqual(events.map(e => e.slot), [0, 1, 2], 'slot order');
  assert.equal(R.orderInfo(g, 9), null);
  assert.equal(R.canFillOrder(g, -1), false);
  assert.equal(R.fillOrder(g, 0), false, 'an empty slot cannot be filled');
}

console.log('--- weekly Order ---');
{
  const g = createCoreLoopState();
  g.fields.forEach(f => { f.rig = 3; f.frontier = 50; });
  g.t = 0;
  R.step(g, 5, PRESENCE.WATCH);
  const w = g.refinery.weekly;
  assert.equal(w.week, 0);
  assert.equal(w.need.length, NF);
  g.fields.forEach((f, i) => {
    assert.equal(w.need[i].grade, Rigs.rigGrade(g, i));
    near(w.need[i].qty, P.weeklyHours * 3600 * Rigs.rigRate(g, i, PRESENCE.WATCH), 'weekly qty');
  });
  near(R.secondsToNextWeek(g), WEEK, 'a week to go at t = 0');
  g.t = WEEK - 1; near(R.secondsToNextWeek(g), 1, 'one second to go');
  g.t = 0;
  // it also reserves what open Orders need: stock exactly the weekly need and it still waits
  g.fields.forEach((f, i) => Fields.addMaterial(g, i, w.need[i].grade, w.need[i].qty));
  assert.equal(R.canFillWeekly(g), false, 'open Orders reserve first');
  assert.equal(R.fillWeekly(g), false);
  g.fields.forEach((f, i) => Fields.addMaterial(g, i, w.need[i].grade, R.reserved(g, i)));
  assert.equal(R.canFillWeekly(g), true);
  const ctx = makeContext(), events = ctx.events;
  const lv = g.refinery.frac.map(f => f.level);
  const info = R.weeklyInfo(g);
  assert.equal(info.ready, true);
  assert.equal(R.fillWeekly(g, ctx), true);
  assert.deepEqual(g.refinery.frac.map(f => f.level), lv.map(x => x + 1), '+1 level on all five');
  assert.equal(g.refinery.weekly.need, null);
  assert.deepEqual(events, [{ kind: 'weekly', level: HIT.MAJOR }]);
  near(info.after[0] / info.before[0], P.orderMult, 'weekly value step');
  // not posted again in the same week, posted in the next
  R.step(g, 5, PRESENCE.WATCH);
  assert.equal(g.refinery.weekly.need, null);
  g.t = WEEK;
  R.step(g, 5, PRESENCE.WATCH);
  assert.equal(g.refinery.weekly.week, 1);
  assert.ok(g.refinery.weekly.need);
  // a week missed is replaced, not stacked
  g.t = 3 * WEEK + 5;
  R.step(g, 5, PRESENCE.WATCH);
  assert.equal(g.refinery.weekly.week, 3);
  // no Rig on a Field: no weekly Order
  const h = createCoreLoopState(); h.fields[0].rig = 1; h.fields[1].rig = 1;
  R.step(h, 5, PRESENCE.WATCH);
  assert.equal(h.refinery.weekly.need, null);
  assert.equal(h.refinery.weekly.week, -1);
}

console.log('--- UI info ---');
{
  const g = createCoreLoopState();
  g.fields.forEach(f => { f.rig = 2; f.frontier = 30; });
  g.refinery.frac[FRAC.KEROSENE].level = 4; g.refinery.frac[FRAC.KEROSENE].bubble = 0.5;
  R.postOrders(g);
  const o = g.refinery.orders[0];
  Fields.addMaterial(g, o.field, o.grade, o.qty / 2);
  g.t = 50;
  const info = R.orderInfo(g, 0);
  assert.deepEqual([info.frac, info.field, info.grade, info.qty], [o.frac, o.field, o.grade, o.qty]);
  near(info.have, o.qty / 2, 'have'); near(info.progress, 0.5, 'progress');
  assert.equal(info.ready, false); assert.equal(info.age, 50);
  near(info.before, fracValue(g, o.frac), 'before'); near(info.after, fracValue(g, o.frac) * P.orderMult, 'after');
  g.refinery.orders[1] = { empty: true, refillAt: 80 };
  near(R.orderInfo(g, 1).refillIn, 30, 'refillIn');
  assert.equal(R.orderInfo(g, 1).empty, true);
  assert.equal(R.weeklyInfo(g).open, false);
  assert.equal(R.weeklyInfo(g).need, null);
}

console.log('--- open Orders survive a save ---');
{
  const g = createCoreLoopState();
  g.fields.forEach(f => { f.rig = 2; f.frontier = 30; });
  g.t = 2 * WEEK + 100;
  R.step(g, 5, PRESENCE.WATCH);
  g.refinery.orders[1] = { empty: true, refillAt: g.t + 500 };
  const back = deserializeCoreLoop(JSON.parse(JSON.stringify(serializeCoreLoop(g))));
  // an open Order keeps its ask; refillAt only means something on an empty slot
  const strip = (os) => os.map(({ refillAt, ...o }) => (o.empty ? { empty: true, refillAt } : o));
  assert.deepEqual(strip(back.refinery.orders), strip(g.refinery.orders));
  assert.deepEqual(back.refinery.weekly, g.refinery.weekly);
  assert.ok(back.refinery.weekly.need && !back.refinery.orders[0].empty);
  // and the loaded state goes on from the same place
  back.t += P.orderRefill;
  R.step(back, 5, PRESENCE.WATCH);
  assert.equal(back.refinery.orders[1].empty, false);
}

console.log('Refinery tests passed');
