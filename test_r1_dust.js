import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { BuildingSystem } from './js/systems/BuildingSystem.js';
import { PrestigeSystem } from './js/systems/PrestigeSystem.js';
import { DUST_SHOP_ITEMS, buyShopItem } from './js/systems/DustShopSystem.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };

console.log('--- R1: dust multiplier reads lifetime dust ---');
const gs = new GameState();
gs.buildingSystem = new BuildingSystem(gs);
const ps = new PrestigeSystem(gs);
gs.buildings['tapper'].count = 10;

gs.cosmicDust = new BigNum(500);
gs.totalCosmicDust = new BigNum(500);
assert.equal(gs.getDustMultiplier(), 6);
const cpsBefore = gs.getNetAetherPerSecond();

// Buy every dust shop item we can afford: Aether/s must never drop (the shop only adds)
gs.ascensionCount = 20;
let bought = 0;
for (const p of DUST_SHOP_ITEMS) {
  const prev = gs.getNetAetherPerSecond();
  const dustBefore = gs.cosmicDust;
  if (buyShopItem(gs, p.id)) {
    bought++;
    assert.ok(gs.cosmicDust.lt(dustBefore), 'shop item spent dust');
    assert.ok(gs.getNetAetherPerSecond().gte(prev), `buying ${p.id} lowered Aether/s`);
  }
}
assert.ok(bought > 0, 'at least one shop item was bought');
assert.ok(gs.cosmicDust.lt(500), 'some dust was spent');
assert.equal(gs.totalCosmicDust.toNumber(), 500);
assert.equal(gs.getDustMultiplier(), 6, 'multiplier unchanged by spending');
assert.ok(gs.getNetAetherPerSecond().gte(cpsBefore));

// Spending the pile to zero keeps the multiplier
gs.cosmicDust = BigNum.zero();
assert.equal(gs.getDustMultiplier(), 6);

console.log('--- R1: Transcend preview states the real trade (R31 numbers) ---');
gs.totalCosmicDust = new BigNum(60000);
const tp = ps.getTranscendPreview();
assert.ok(Math.abs(tp.dustBefore.toNumber() - 601) < 1e-6);
assert.equal(tp.dustAfter.toNumber(), 1, 'lifetime dust of the layer resets');
assert.equal(tp.shardsGained, 2);
assert.ok(Math.abs(tp.shardAfter.toNumber() - 1.5) < 1e-9, '+25% per share, additive');
assert.ok(Math.abs(tp.after.toNumber() - 1.5) < 1e-9);
assert.ok(tp.before.gt(tp.after));

console.log('R1 DUST TESTS PASSED');
