// R12: offline Aether bands (100% for 8 h, 50% to 24 h, 0 after). Run: node test_r12_offline.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { BuildingSystem } from './js/systems/BuildingSystem.js';
import { SaveManager, computeOfflineBands } from './js/engine/SaveManager.js';
import { buildBreakdownRows, formatDuration } from './js/ui/offlineModal.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
const H = 3600;

function setup() {
  const gs = new GameState();
  gs.aether = new BigNum(1e6);
  gs.buildingSystem = new BuildingSystem(gs);
  gs.buildingSystem.buyBuilding('tapper');
  gs.aether = BigNum.zero();
  gs.totalAetherEarned = BigNum.zero();
  const rate = gs.getNetAetherPerSecond();
  assert.ok(rate.gt(BigNum.zero()), 'test needs a positive production rate');
  return { gs, rate, sm: new SaveManager(gs) };
}
// Seconds of production the player was credited, relative to the per-second rate
const credited = (res, rate) => res.gainedAether.div(rate).toNumber();
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1, `${msg}: ${a} vs ${b}`);

console.log('--- R12: computeOfflineBands (pure) ---');
{
  const b5 = computeOfflineBands(300);
  assert.equal(b5.fullSecs, 300); assert.equal(b5.halfSecs, 0); assert.equal(b5.paidSecs, 300);
  const b8 = computeOfflineBands(8 * H);
  assert.equal(b8.fullSecs, 8 * H); assert.equal(b8.halfSecs, 0); assert.ok(!b8.capped);
  const b20 = computeOfflineBands(20 * H);
  assert.equal(b20.fullSecs, 8 * H); assert.equal(b20.halfSecs, 12 * H); assert.equal(b20.paidSecs, 14 * H);
  const b3d = computeOfflineBands(72 * H);
  assert.equal(b3d.paidSecs, 16 * H); assert.equal(b3d.unpaidSecs, 48 * H); assert.ok(b3d.capped);
  for (const bad of [-5 * H, NaN, Infinity, undefined]) {
    const b = computeOfflineBands(bad);
    assert.equal(b.paidSecs, 0, `bad elapsed ${bad} pays nothing`);
    assert.ok(b.elapsedSeconds >= 0);
  }
  // Chrono Reservoir: +4 h of full-rate time and +4 h of cap per rank
  const r2 = computeOfflineBands(72 * H, 2);
  assert.equal(r2.fullEnd, 16 * H); assert.equal(r2.capEnd, 32 * H);
  assert.equal(r2.paidSecs, 16 * H + 16 * H * 0.5);
  assert.equal(computeOfflineBands(16 * H, 2).paidSecs, 16 * H, 'rank 2 pays 16 h in full');
  assert.equal(computeOfflineBands(16 * H, 0).paidSecs, 8 * H + 4 * H, 'rank 0 pays 8 h + 8 h x 50%');
}

console.log('--- R12: processOfflineTime payout ---');
{
  const { gs, rate, sm } = setup();
  const run = secs => { gs.aether = BigNum.zero(); return sm.processOfflineTime(Date.now() - secs * 1000); };
  near(credited(run(300), rate), 300, '5 min');
  near(credited(run(8 * H), rate), 8 * H, '8 h');
  near(credited(run(20 * H), rate), 14 * H, '20 h = 8 + 12 x 0.5');
  const d3 = run(72 * H);
  near(credited(d3, rate), 16 * H, '3 days');
  assert.ok(d3.capped);
  assert.equal(Math.round(d3.bands.unpaidSecs), 48 * H);
  // Clock moved backwards (savedAt in the future): nothing, never negative
  gs.aether = BigNum.zero();
  const back = sm.processOfflineTime(Date.now() + 5 * H * 1000);
  assert.equal(back, null, 'clock moved backwards returns no offline result');
  assert.ok(gs.aether.eq(BigNum.zero()), 'aether unchanged');
  assert.equal(sm.processOfflineTime(0), null);
  // Efficiency multiplies the banded total (talent 1.25 here)
  gs.stats.offlineEfficiency = 1.25;
  near(credited(run(20 * H), rate), 14 * H * 1.25, '20 h with efficiency 1.25');
  gs.stats.offlineEfficiency = 1.0;
  // Chrono Reservoir rank 1 extends the full band to 12 h
  gs.ascensionPerks = { chrono_vault: { rank: 1 } };
  near(credited(run(12 * H), rate), 12 * H, '12 h at rank 1 all full-rate');
  near(credited(run(72 * H), rate), 12 * H + 16 * H * 0.5, '3 days at rank 1');
}

console.log('--- R12: modal breakdown rows ---');
{
  const { sm } = setup();
  const res = sm.processOfflineTime(Date.now() - 20 * H * 1000);
  assert.deepEqual(buildBreakdownRows(res), [['First 8 h', '8 h', '100%'], ['Next 16 h', '12 h', '50%']]);
  const long = buildBreakdownRows(sm.processOfflineTime(Date.now() - 72 * H * 1000));
  assert.deepEqual(long[2], ['After 24 h', '2 d', '0%']);
  assert.equal(buildBreakdownRows(sm.processOfflineTime(Date.now() - 600 * 1000)).length, 1);
  assert.equal(formatDuration(90), '1 min');
  assert.equal(formatDuration(5 * H + 30 * 60), '5 h 30 min');
}

console.log('R12 offline band tests passed');
