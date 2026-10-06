import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { BuildingSystem } from './js/systems/BuildingSystem.js';
import { PrestigeSystem, ASCENSION_PERKS } from './js/systems/PrestigeSystem.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };

console.log('--- R1: dust multiplier reads lifetime dust ---');
const gs = new GameState();
gs.buildingSystem = new BuildingSystem(gs);
const ps = new PrestigeSystem(gs);
gs.buildings['tapper'].count = 10;

gs.cosmicDust = new BigNum(500);
gs.totalCosmicDust = new BigNum(500);
assert.equal(gs.getDustMultiplier(), 11);
const cpsBefore = gs.getNetAetherPerSecond();

// Buy every perk we can afford: Aether/s must never drop (perks only add)
let bought = 0;
for (const p of ASCENSION_PERKS) {
  const prev = gs.getNetAetherPerSecond();
  const dustBefore = gs.cosmicDust;
  if (ps.buyPerk(p.id)) {
    bought++;
    assert.ok(gs.cosmicDust.lt(dustBefore), 'perk spent dust');
    assert.ok(gs.getNetAetherPerSecond().gte(prev), `buying ${p.id} lowered Aether/s`);
  }
}
assert.ok(bought > 0, 'at least one perk was bought');
assert.ok(gs.cosmicDust.lt(500), 'some dust was spent');
assert.equal(gs.totalCosmicDust.toNumber(), 500);
assert.equal(gs.getDustMultiplier(), 11, 'multiplier unchanged by spending');
assert.ok(gs.getNetAetherPerSecond().gte(cpsBefore));

// Spending the pile to zero keeps the multiplier
gs.cosmicDust = BigNum.zero();
assert.equal(gs.getDustMultiplier(), 11);

console.log('--- R1: Transcend preview states the real trade (R4 numbers) ---');
gs.totalCosmicDust = new BigNum(60000);
const tp = ps.getTranscendPreview();
assert.ok(Math.abs(tp.dustBefore.toNumber() - 1201) < 1e-6);
assert.equal(tp.dustAfter.toNumber(), 1, 'lifetime dust of the layer resets');
assert.equal(tp.shardsGained, 2);
assert.ok(Math.abs(tp.shardAfter.toNumber() - 2.25) < 1e-9);
assert.ok(Math.abs(tp.after.toNumber() - 2.25) < 1e-9);
assert.ok(tp.before.gt(tp.after));

console.log('R1 DUST TESTS PASSED');
