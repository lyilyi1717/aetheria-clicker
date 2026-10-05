import assert from 'node:assert/strict';
import { GameState } from './js/systems/GameState.js';
import {
  FastForwardSystem, getFastForwardCost, FF_WARP_SECONDS, FF_RESET_MS, FF_SIM_STEP, FF_CLOCK_REBASE_MS
} from './js/systems/FastForwardSystem.js';

const MIN = 60 * 1000;
const T0 = Date.UTC(2026, 9, 6, 12, 0, 0);

function setup(rank = 0) {
  let now = T0;
  const gs = new GameState();
  gs.ascensionPerks.chrono_vault = { ...(gs.ascensionPerks.chrono_vault || {}), rank };
  const ff = new FastForwardSystem(gs, () => now);
  return { gs, ff, setNow: (t) => { now = t; }, getNow: () => now };
}
// Runs a booked warp to completion; returns the sim steps taken
function finishWarp(ff) {
  const steps = [];
  let guard = 0;
  while (ff.isWarping() && guard++ < 1000) ff.consume(0.05, (dt) => steps.push(dt));
  return steps;
}

console.log('--- Fast Forward: price curve ---');
assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(getFastForwardCost), [30, 90, 270, 810, 2430, 7290, 21870]);
{
  const { gs, ff } = setup();
  gs.chronoSand = 1440;
  const paid = [];
  for (let i = 0; i < 4; i++) {
    const before = gs.chronoSand;
    assert.equal(ff.use(), true, `use #${i + 1} should be affordable from a full base bank`);
    paid.push(before - gs.chronoSand);
    finishWarp(ff);
  }
  assert.deepEqual(paid, [30, 90, 270, 810]);
  assert.equal(gs.chronoSand, 1440 - 1200);
  assert.equal(ff.getUses(), 4);
  // 5th use costs 2,430: more than a base bank (1,440) can ever hold
  gs.chronoSand = gs.getChronoSandCap();
  assert.equal(ff.getCost(), 2430);
  assert.equal(ff.canUse(), false);
  assert.equal(ff.use(), false);
  assert.equal(gs.chronoSand, 1440, 'a refused use spends nothing');
}
{
  // Chrono Reservoir rank 2 (bank 2,880) affords the 5th use; rank 10 (8,640) never the 7th
  const { gs, ff } = setup(2);
  gs.fastForward.uses = 4; gs.fastForward.lastUseAt = T0; gs.fastForward.clockMark = T0;
  gs.chronoSand = gs.getChronoSandCap();
  assert.equal(ff.use(), true);
  const max = setup(10);
  max.gs.fastForward.uses = 6; max.gs.fastForward.lastUseAt = T0; max.gs.fastForward.clockMark = T0;
  max.gs.chronoSand = max.gs.getChronoSandCap();
  assert.equal(max.gs.chronoSand, 8640);
  assert.equal(max.ff.canUse(), false, '21,870 sand never fits the max bank');
}

console.log('--- Fast Forward: price reset after the cooldown ---');
{
  const { gs, ff, setNow } = setup();
  gs.chronoSand = 1440;
  ff.use(); finishWarp(ff);
  setNow(T0 + 10 * MIN);
  ff.use(); finishWarp(ff);                      // second use restarts the cooldown
  assert.equal(ff.getUses(), 2);
  setNow(T0 + 39 * MIN);
  assert.equal(ff.getUses(), 2, 'still inside 30 min of the last use');
  assert.equal(Math.round(ff.getResetIn()), 60);
  setNow(T0 + 40 * MIN);
  assert.equal(ff.getUses(), 0, 'price resets 30 min after the last use');
  assert.equal(ff.getCost(), 30);
  assert.equal(ff.getResetIn(), 0);
}

console.log('--- Fast Forward: clock rollback cannot reset the price ---');
{
  const { gs, ff, setNow } = setup();
  gs.chronoSand = 1440;
  ff.use(); finishWarp(ff);
  setNow(T0 - 2 * 3600 * 1000);                  // clock set back 2 h
  assert.equal(ff.getUses(), 1);
  assert.equal(Math.round(ff.getResetIn()), 30 * 60, 'the cooldown does not move while the clock is behind');
  setNow(T0 + 29 * MIN);                          // and forward again: no free reset
  assert.equal(ff.getUses(), 1);
  setNow(T0 + 30 * MIN);
  assert.equal(ff.getUses(), 0);
  // A clock that was wildly ahead and then fixed restarts the full cooldown, never shortens it
  const w = setup();
  w.gs.chronoSand = 1440;
  w.setNow(T0 + FF_CLOCK_REBASE_MS + 3600 * 1000);
  w.ff.use(); finishWarp(w.ff);
  w.setNow(T0);
  assert.equal(w.ff.getUses(), 1);
  assert.equal(Math.round(w.ff.getResetIn()), 30 * 60);
}

console.log('--- Fast Forward: escalation survives save/reload ---');
{
  const { gs, ff, setNow } = setup();
  gs.chronoSand = 1440;
  ff.use(); finishWarp(ff);
  setNow(T0 + 5 * MIN);
  ff.use();                                       // reload mid-warp
  ff.consume(0.1, () => {});
  const data = JSON.parse(JSON.stringify(gs.serialize()));
  data.savedAt = T0 + 5 * MIN;
  const gs2 = new GameState();
  gs2.deserialize(data);
  let now2 = T0 + 6 * MIN;
  const ff2 = new FastForwardSystem(gs2, () => now2);
  assert.equal(ff2.getUses(), 2, 'reload keeps the uses count');
  assert.equal(ff2.getCost(), 270);
  assert.equal(Math.round(ff2.getResetIn()), 29 * 60);
  assert.ok(ff2.isWarping() && gs2.fastForward.pending < FF_WARP_SECONDS, 'unfinished warp resumes');
  // Reload with the clock set back: still no reset, still 2 uses
  now2 = T0 - 3600 * 1000;
  assert.equal(ff2.getUses(), 2);
  // Old saves without the field get a clean state; junk is clamped
  const gs3 = new GameState();
  gs3.deserialize({ ...data, fastForward: undefined });
  assert.deepEqual({ ...gs3.fastForward, clockMark: 0 }, { uses: 0, lastUseAt: 0, clockMark: 0, pending: 0 });
  gs3.deserialize({ ...data, fastForward: { uses: 'x', pending: 1e9, lastUseAt: NaN } });
  assert.equal(gs3.fastForward.uses, 0);
  assert.equal(gs3.fastForward.pending, FF_WARP_SECONDS);
}

console.log('--- Fast Forward: anti-spam and chunked warp ---');
{
  const { gs, ff } = setup();
  gs.chronoSand = 1440;
  assert.equal(ff.use(), true);
  // Spam-clicking while the warp runs: refused, nothing spent, no stacked warps
  for (let i = 0; i < 20; i++) assert.equal(ff.use(), false);
  assert.equal(gs.chronoSand, 1410);
  assert.equal(ff.getUses(), 1);
  // One 50 ms loop tick only simulates 5 s; the whole warp spreads over ~0.3 s of real time
  const first = [];
  ff.consume(0.05, (dt) => first.push(dt));
  assert.equal(first.reduce((a, b) => a + b, 0), 5);
  const rest = finishWarp(ff);
  const all = first.concat(rest);
  assert.equal(all.length, FF_WARP_SECONDS / FF_SIM_STEP);
  assert.ok(all.every(dt => dt > 0 && dt <= FF_SIM_STEP), 'every sim step stays <= FF_SIM_STEP (boss enrage timer)');
  assert.ok(Math.abs(all.reduce((a, b) => a + b, 0) - FF_WARP_SECONDS) < 1e-9);
  assert.equal(rest.length, (FF_WARP_SECONDS - 5) / FF_SIM_STEP);
  // A huge background-tab tick still never takes a step bigger than FF_SIM_STEP
  ff.use();
  const big = [];
  ff.consume(5, (dt) => big.push(dt));
  assert.equal(ff.isWarping(), false);
  assert.ok(big.every(dt => dt <= FF_SIM_STEP));
  // 20 rapid clicks book at most one warp per finished warp, at escalating prices
  assert.equal(ff.getUses(), 2);
  assert.equal(ff.getCost(), 270);
}

console.log('✅ ALL FAST FORWARD TESTS PASSED SUCCESSFULLY!');
