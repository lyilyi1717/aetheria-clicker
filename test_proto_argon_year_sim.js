// Test for Issue ARGON-24: 365-Day Simulation Suite & Monte Carlo Verification
// Run: node test_proto_year_sim.js
import assert from 'node:assert/strict';
import { runMonteCarlo, simulateYear, TARGET_WINDOWS, INVARIANTS } from './digger-argon/sim/dig-year.mjs';

let failed = 0;
const ok = (cond, msg) => {
  if (!cond) {
    failed++;
    console.error('FAIL: ' + msg);
  }
};

console.log('Testing ARGON-24: 365-Day Simulation Suite & Monte Carlo Verification...');

// -------------------------------------------------------------------------------------------------
// 1. 30-Day Fast Pacing Checks (Month 1 & Early Invariants)
// -------------------------------------------------------------------------------------------------
{
  const res30 = runMonteCarlo([1, 2, 3, 4, 5], ['mixed'], { days: 30 });
  ok(res30.runs.length === 5, 'Ran 5 seeds for 30-day check');

  // Month 1 target arrival in Day 18–25
  const m1 = res30.milestones.m1;
  ok(m1 && m1.passed, `Month 1 completed within [18, 25]: median=${m1.median.toFixed(2)}`);
  ok(m1.median >= 18 && m1.median <= 25, `Month 1 median ${m1.median.toFixed(2)} is within [18, 25]`);
  ok(m1.simMin >= 18, `Month 1 min ${m1.simMin.toFixed(2)} >= 18`);
  ok(m1.simMax <= 25, `Month 1 max ${m1.simMax.toFixed(2)} <= 25`);

  // Invariants hold in early game
  ok(res30.invariants.maxSessionPar <= INVARIANTS.maxSessionPar, `30-day session par <= 720s: got ${res30.invariants.maxSessionPar}`);
  ok(res30.invariants.maxDirtHits <= INVARIANTS.maxDirtHits, `30-day dirt hits <= 4: got ${res30.invariants.maxDirtHits}`);
  ok(res30.invariants.minDirtHits >= INVARIANTS.minDirtHits, `30-day dirt hits >= 1: got ${res30.invariants.minDirtHits}`);
  ok(res30.invariants.maxGroundHp <= INVARIANTS.maxGroundHp, `30-day ground HP <= 1e15: got ${res30.invariants.maxGroundHp}`);
  ok(res30.invariants.maxStars <= INVARIANTS.maxStars, `30-day star inflation <= 1e14: got ${res30.invariants.maxStars}`);
  ok(res30.invariants.maxDeadZone <= INVARIANTS.maxDeadZone, `30-day dead stretches <= 300s: got ${res30.invariants.maxDeadZone}`);
}

// -------------------------------------------------------------------------------------------------
// 2. Full 365-Day Monte Carlo Verification (Active, Mixed, Idle across seeds 1..5)
// -------------------------------------------------------------------------------------------------
{
  const t0 = Date.now();
  const resYear = runMonteCarlo([1, 2, 3, 4, 5], ['mixed', 'active', 'idle']);
  const elapsedMs = Date.now() - t0;

  // Performance requirement: < 15 seconds
  ok(elapsedMs < 15000, `Headless simulation runs 365 days in < 15 seconds: took ${(elapsedMs / 1000).toFixed(2)}s`);

  // 15 total runs (3 archetypes x 5 seeds)
  ok(resYear.runs.length === 15, `Completed all 15 Monte Carlo runs: got ${resYear.runs.length}`);

  // Invariant 1: Session Par Time bounded <= 720s (12 minutes)
  ok(resYear.invariants.maxSessionPar <= 720,
    `Session par bounded under 12 min (<= 720s): got ${resYear.invariants.maxSessionPar}s`);

  // Invariant 2: Dirt Block Hits-to-Break clamped in [1, 4]
  ok(resYear.invariants.maxDirtHits <= 4,
    `Dirt block hits clamped in [1, 4]: max got ${resYear.invariants.maxDirtHits}`);
  ok(resYear.invariants.minDirtHits >= 1,
    `Dirt block hits clamped in [1, 4]: min got ${resYear.invariants.minDirtHits}`);

  // Invariant 3: Ground HP bounded under 1e15
  ok(resYear.invariants.maxGroundHp <= 1e15,
    `Ground HP bounded under 1e15: got ${resYear.invariants.maxGroundHp.toExponential(2)}`);

  // Invariant 4: Lifetime Stars bounded under 1e14
  ok(resYear.invariants.maxStars <= 1e14,
    `Lifetime Stars bounded under 1e14: got ${resYear.invariants.maxStars.toExponential(2)}`);

  // Invariant 5: Zero dead stretches exceeding 300s
  ok(resYear.invariants.maxDeadZone <= 300,
    `Zero dead stretches exceeding 5 min (300s): got ${resYear.invariants.maxDeadZone.toFixed(0)}s`);

  // Canonical Milestone Verification for Mixed Player:
  // Month 1: Day 18–25
  const m1 = resYear.milestones.m1;
  ok(m1.passed, `Month 1 milestone in [18, 25]: median=${m1.median.toFixed(2)}, min=${m1.simMin.toFixed(2)}, max=${m1.simMax.toFixed(2)}`);

  // Month 3: Day 75–85
  const m3 = resYear.milestones.m3;
  ok(m3.passed, `Month 3 milestone in [75, 85]: median=${m3.median.toFixed(2)}, min=${m3.simMin.toFixed(2)}, max=${m3.simMax.toFixed(2)}`);

  // Month 6: Day 165–180
  const m6 = resYear.milestones.m6;
  ok(m6.passed, `Month 6 milestone in [165, 180]: median=${m6.median.toFixed(2)}, min=${m6.simMin.toFixed(2)}, max=${m6.simMax.toFixed(2)}`);

  // Month 9: Day 255–270
  const m9 = resYear.milestones.m9;
  ok(m9.passed, `Month 9 milestone in [255, 270]: median=${m9.median.toFixed(2)}, min=${m9.simMin.toFixed(2)}, max=${m9.simMax.toFixed(2)}`);

  // Month 12: Day 350–365
  const m12 = resYear.milestones.m12;
  ok(m12.passed, `Month 12 milestone in [350, 365]: median=${m12.median.toFixed(2)}, min=${m12.simMin.toFixed(2)}, max=${m12.simMax.toFixed(2)}`);
}

// -------------------------------------------------------------------------------------------------
// 3. Archetype Progression Sanity Checks
// -------------------------------------------------------------------------------------------------
{
  const activeRuns = [1, 2, 3].map(s => simulateYear('active', s));
  const idleRuns = [1, 2, 3].map(s => simulateYear('idle', s));

  // Active player completes all 240 levels well ahead of Day 365
  ok(activeRuns.every(r => r.completedLevels === 240), 'Active player completes all 240 levels');
  ok(activeRuns.every(r => r.milestoneDays.m12 < 240), 'Active player completes campaign in under 240 days');
  ok(activeRuns.every(r => r.keystones === 12), 'Active player assembles all 12 keystones');

  // Idle player makes steady long-term progress with tailwind
  ok(idleRuns.every(r => r.completedLevels >= 120), 'Idle player reaches Era 3 (>120 levels) by year end');
}

if (failed) {
  console.error(`${failed} check(s) failed in test_proto_year_sim.js`);
  process.exit(1);
}
console.log('test_proto_year_sim: ok');
