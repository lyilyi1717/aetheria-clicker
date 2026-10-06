import assert from 'assert';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { PrestigeSystem, MIN_RUN_SECONDS } from './js/systems/PrestigeSystem.js';
globalThis.window ??= { innerWidth: 800, innerHeight: 600 };

console.log('--- R2: dust exponent is 1/3 ---');
{
  const gs = new GameState();
  const ps = new PrestigeSystem(gs);
  const dust = (a) => { gs.totalAetherEarned = new BigNum(a); return ps.getPendingCosmicDust().toNumber(); };
  assert.equal(dust(999999999), 0);
  assert.equal(dust(1e9), 150);
  assert.equal(dust(8e9), 300);      // x8 Aether doubles dust (was x16)
  assert.equal(dust(27e9), 450);
  assert.equal(dust(64e9), 600);
  assert.equal(dust(1e12), 1500);
  // Past a double: 1e330 run Aether -> 150 * 10^(321/3)
  gs.totalAetherEarned = new BigNum('1e330');
  const d = ps.getPendingCosmicDust();
  assert.ok(Math.abs((d.e + Math.log10(d.m)) - (Math.log10(150) + 107)) < 1e-6, `dust ${d}`);
}

console.log('--- R2: minimum run on Ascend ---');
{
  const gs = new GameState();
  const ps = new PrestigeSystem(gs);
  gs.totalAetherEarned = new BigNum(1e12);
  const t0 = 1_000_000_000_000;
  gs.runStartedAt = t0;
  assert.equal(ps.getMinRunRemaining(t0), MIN_RUN_SECONDS);
  assert.equal(ps.getMinRunRemaining(t0 + 540_000), 60);
  assert.equal(ps.canAscend(t0 + 599_000), false);
  assert.equal(ps.canAscend(t0 + 600_000), true);
  assert.equal(ps.getMinRunRemaining(t0 - 5_000_000), MIN_RUN_SECONDS, 'clock set back is clamped');
  // fresh run: ascend refuses; an old run ascends and restarts the clock
  gs.runStartedAt = Date.now();
  assert.equal(ps.ascend(), false);
  gs.runStartedAt = 0;
  gs.totalAetherEarned = new BigNum(1e12);
  assert.equal(ps.ascend(), true);
  assert.ok(Date.now() - gs.runStartedAt < 5000);
  assert.equal(ps.canAscend(), false);
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
