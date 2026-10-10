// CL-3: Mastery (js/systems/coreloop/Mastery.js)
import assert from 'node:assert/strict';
import { P } from './js/systems/coreloop/params.js';
import { createCoreLoopState } from './js/systems/coreloop/state.js';
import { HIT, makeContext } from './js/systems/coreloop/shared.js';
import {
  rankThreshold, addMastery, addActionMastery, rankSum, rigEfficiency, schoolPower, rankInfo, isTitleRank, actionProgress, RANK_IDS
} from './js/systems/coreloop/Mastery.js';
import * as sim from './sim/redesign/model.mjs';
import { PROFILES } from './sim/redesign/profiles.mjs';

console.log('--- thresholds: 0.25/1.5/6/20/60 h, then +25 h each ---');
{
  assert.deepEqual([0, 1, 2, 3, 4].map(rankThreshold), [0.25, 1.5, 6, 20, 60]);
  assert.deepEqual([5, 6, 7, 8].map(rankThreshold), [85, 110, 135, 160]);
  assert.equal(RANK_IDS.length, P.rankHours.length + 1);
}

console.log('--- Legend, Legend V and X are level 4 ---');
{
  // rank 5 = Legend, rank 9 = Legend V, rank 14 = Legend X
  const titles = [];
  for (let r = 1; r <= 30; r++) if (isTitleRank(r)) titles.push(r);
  assert.deepEqual(titles, [5, 10, 15, 20, 25, 30]);
  assert.deepEqual(rankInfo(5), { id: 'legend', level: 1, title: true });
  assert.deepEqual(rankInfo(0), { id: 'unranked', level: 0, title: false });
  assert.equal(rankInfo(9).level, 5);
  assert.equal(rankInfo(14).level, 10);
}

console.log('--- hours split over actions and ranks emit events ---');
{
  const s = createCoreLoopState();
  const c = makeContext();
  addMastery(s, 0, 1, c);   // 1 h: actions get 0.4 and 0.3 (rank 1), 0.2 and 0.1 (none)
  assert.deepEqual(s.mastery[0].ranks, [1, 1, 0, 0]);
  assert.ok(Math.abs(s.mastery[0].hours[0] - 0.4) < 1e-12);
  assert.deepEqual(s.mastery[1].ranks, [0, 0, 0, 0], 'other Fields untouched');
  assert.deepEqual(c.events[0], { kind: 'rank', level: HIT.BIG, field: 0, action: 0, rank: 1 });
  assert.equal(c.events.length, 2);
  // a big jump passes several ranks at once, one event each; Legend is L4
  const c2 = makeContext();
  addActionMastery(s, 1, 0, 70, c2);
  assert.equal(s.mastery[1].ranks[0], 5);
  assert.deepEqual(c2.events.map(e => e.level), [2, 2, 2, 2, 4]);
  assert.deepEqual(c2.events.map(e => e.rank), [1, 2, 3, 4, 5]);
  // past Legend: 70 h -> 300 h; Legend V (rank 9) is not the next title, rank 10 is
  const c3 = makeContext();
  addActionMastery(s, 1, 0, 230, c3);
  assert.equal(s.mastery[1].ranks[0], 5 + Math.floor((300 - 60) / 25));
  assert.deepEqual(c3.events.filter(e => e.level === HIT.MAJOR).map(e => e.rank), [10]);
  addMastery(createCoreLoopState(), 0, 5);   // no ctx is fine
}

console.log('--- rank sum, Rig efficiency, school power ---');
{
  const s = createCoreLoopState();
  assert.equal(rankSum(s, 0), 0);
  assert.equal(rigEfficiency(s, 0), P.rigEffBase);
  assert.equal(schoolPower(s, 0), 1);
  s.mastery[0].ranks = [9, 5, 5, 5];               // capped at 5 each
  assert.equal(rankSum(s, 0), 20);
  assert.ok(Math.abs(rigEfficiency(s, 0) - 1) < 1e-12, 'all Legend = 0.4 + 0.6');
  assert.ok(Math.abs(schoolPower(s, 0) - (1 + P.schoolPower * 5)) < 1e-12);
  const p = actionProgress(s, 0, 0);
  assert.equal(p.rank, 9);
  assert.equal(p.from, rankThreshold(8));
  assert.equal(p.to, rankThreshold(9));
  assert.equal(actionProgress(createCoreLoopState(), 0, 0).fraction, 0);
}

console.log('--- same inputs as the sim ---');
{
  for (let r = 0; r < 30; r++) assert.equal(rankThreshold(r), sim.rankThreshold(r));
  const g = createCoreLoopState();
  const m = sim.newState(Object.values(PROFILES)[0]);
  const feed = [0.01, 0.2, 1.7, 5, 40, 0.3, 90, 200];
  feed.forEach((h, i) => {
    const field = i % P.fields.length;
    const c = makeContext();
    const before = m.events.length;
    addMastery(g, field, h, c);
    sim.addMastery(m, field, h);
    for (let f = 0; f < P.fields.length; f++) {
      assert.deepEqual(g.mastery[f].ranks, m.fields[f].ranks);
      for (let a = 0; a < P.actionsPerField; a++) assert.ok(Math.abs(g.mastery[f].hours[a] - m.fields[f].hours[a]) < 1e-9);
      assert.equal(rankSum(g, f), sim.rankSum(m.fields[f]));
      assert.equal(rigEfficiency(g, f), sim.rigEff(m.fields[f]));
      assert.equal(schoolPower(g, f), 1 + P.schoolPower * sim.rankSum(m.fields[f]) / P.actionsPerField);
    }
    const simEv = m.events.slice(before).filter(e => e.k === 'rank');
    const key = (a) => a.map(e => e.join()).sort();
    assert.deepEqual(key(c.events.map(e => [e.level, e.field, e.rank])), key(simEv.map(e => [e.lvl, e.field, e.rank])));
  });
}
console.log('OK');
