import assert from 'assert';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { PrestigeSystem, MIN_RUN_SECONDS } from './js/systems/PrestigeSystem.js';
globalThis.window ??= { innerWidth: 800, innerHeight: 600 };

console.log('--- R2/R31: dust is 10 x (run Aether / 1e4)^(1/5), paid from 500 run Aether (R52) ---');
{
  const gs = new GameState();
  const ps = new PrestigeSystem(gs);
  const dust = (a) => { gs.totalAetherEarned = new BigNum(a); return ps.getPendingCosmicDust().toNumber(); };
  assert.equal(dust(499), 0);
  assert.equal(dust(500), 5);         // the first New Well can pay for Auto-tap
  assert.equal(dust(9999), 9);
  assert.equal(dust(1e4), 10);
  assert.equal(dust(32e4), 20);      // x32 Aether doubles dust
  assert.equal(dust(243e4), 30);
  assert.equal(dust(1e9), 100);
  assert.equal(dust(1e14), 1000);
  // Past a double: 1e330 run Aether -> 10 * 10^(326/5)
  gs.totalAetherEarned = new BigNum('1e330');
  const d = ps.getPendingCosmicDust();
  assert.ok(Math.abs((d.e + Math.log10(d.m)) - (1 + 326 / 5)) < 1e-6, `dust ${d}`);
}

console.log('--- R2: no minimum run cooldown on Ascend ---');
{
  const gs = new GameState();
  const ps = new PrestigeSystem(gs);
  gs.totalAetherEarned = new BigNum(1e12);
  const t0 = 1_000_000_000_000;
  gs.runStartedAt = t0;
  // R61: a run just started is locked for MIN_RUN_SECONDS, counts down, then opens
  assert.ok(MIN_RUN_SECONDS >= 60 && MIN_RUN_SECONDS <= 120, 'minimum run is 60-120 s');
  assert.equal(ps.getMinRunRemaining(t0), MIN_RUN_SECONDS);
  assert.equal(ps.canAscend(t0), false, 'locked right after a reset');
  assert.equal(ps.getMinRunRemaining(t0 + 30_000), MIN_RUN_SECONDS - 30);
  assert.equal(ps.canAscend(t0 + MIN_RUN_SECONDS * 1000), true, 'open once the run is old enough');
  // A clock set back never locks longer than the minimum
  assert.equal(ps.getMinRunRemaining(t0 - 3_600_000), MIN_RUN_SECONDS);
  gs.runStartedAt = Date.now() - (MIN_RUN_SECONDS + 1) * 1000;
  // fresh run without dust: ascend refuses; run with dust ascends and restarts the clock
  gs.totalAetherEarned = BigNum.zero();
  assert.equal(ps.ascend(), false);
  gs.totalAetherEarned = new BigNum(1e12);
  gs.runStartedAt = Date.now() - (MIN_RUN_SECONDS + 1) * 1000;
  assert.equal(ps.ascend(), true);
  assert.ok(Date.now() - gs.runStartedAt < 5000);
  assert.equal(ps.canAscend(), false);
  gs.totalAetherEarned = new BigNum(1e12);
  assert.equal(ps.canAscend(), false, 'the new run is locked again');
  assert.equal(ps.ascend(), false);
  assert.equal(ps.ascend(true), true, 'force (Transcend, Chronicle) skips the lock');
}

console.log('--- R2: saves without runStartedAt load with no wait ---');
{
  const gs = new GameState();
  const data = gs.serialize();
  delete data.runStartedAt;
  const gs2 = new GameState();
  gs2.deserialize(data);
  assert.equal(new PrestigeSystem(gs2).getMinRunRemaining(), 0);
  const gs3 = new GameState();
  gs3.deserialize(gs.serialize());
  assert.equal(gs3.runStartedAt, gs.runStartedAt);
}
console.log('R2 dust exponent tests passed');
