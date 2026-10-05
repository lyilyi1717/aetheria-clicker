import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { MiningSystem, compressDepth, getPickaxeName, MINING_SCHEMA } from './js/systems/MiningSystem.js';

console.log('--- Testing Excavation curves (§5.1) ---');
const gs = new GameState();
const ms = new MiningSystem(gs);
assert.equal(gs.miningGrid.schema, MINING_SCHEMA);
assert.equal(ms.getTileHp(1), 4);
assert.equal(ms.getTileHp(10), 15);
assert.equal(ms.getTileHp(25), 115);
assert.equal(ms.getStoneYield(1), 1);
assert.equal(ms.getStoneYield(25), 6); // ceil(5.07); doc table rounds to 5
assert.equal(ms.getStoneYield(50), 28);
assert.equal(ms.getStoneYield(100), 811); // doc table says ~805
assert.equal(Math.round(ms.getGoldCacheValue(25).toNumber()), 543);
// B3: gold cache stays finite and non-zero far past the old 1e308 wall
const deep = ms.getGoldCacheValue(20000);
assert.ok(deep.e > 500 && deep.m > 0, `deep cache should be huge, got ${deep}`);
assert.ok(Number.isFinite(ms.getTileHp(1e6)));
assert.equal(ms.getPickaxeCost(1), 125);
assert.equal(ms.getAutoDrillCost(), 30);
assert.equal(getPickaxeName(0), 'Rusty Pickaxe');
assert.equal(getPickaxeName(7), 'Celestial Void Pick +2');
assert.equal(ms.getCurrentStrata().name, 'Limestone');
gs.miningGrid.depth = 26;
assert.equal(ms.getCurrentStrata().name, 'Granite');
gs.miningGrid.depth = 1000;
assert.equal(ms.getCurrentStrata().name, 'Abyssal Heart');
gs.miningGrid.depth = 1;

console.log('--- Testing pickaxe power + boss cap ---');
gs.miningGrid.pickaxeTier = 3;
assert.equal(ms.getPickaxePower(), 8);
gs.stats.totalBossesSlain = 10000; // would be +2000% uncapped
assert.equal(ms.getPickaxePower(), 16);
gs.stats.totalBossesSlain = 0;
gs.miningGrid.pickaxeTier = 0;

console.log('--- Testing stone shop ---');
gs.inventory.stone = 200;
assert.equal(ms.buyAutoDrill(), true);
assert.equal(gs.inventory.stone, 170);
assert.equal(ms.getAutoDrillCost(), 48);
assert.equal(ms.upgradePickaxe(), true);
assert.equal(gs.miningGrid.pickaxeTier, 1);
assert.equal(gs.inventory.stone, 45);
assert.equal(ms.upgradePickaxe(), false);

console.log('--- Testing drill timer carry-over (B2) ---');
gs.miningGrid.autoDrills = 10; // 5 hits/s
gs.miningGrid.pickaxeTier = 0;
ms.generateNewGrid();
const hpBefore = gs.miningGrid.blocks.reduce((s, b) => s + b.hp, 0);
ms.autoDrillTimer = 0;
ms.update(1.0); // one big tick: 5 hits, not 1
const hpAfter = gs.miningGrid.blocks.reduce((s, b) => s + b.hp, 0);
const spent = hpBefore - hpAfter;
// 5 hits of power 1; a tile breaking mid-tick can only reduce the remaining HP pool
assert.ok(spent >= 4 && spent <= 5, `expected ~5 hits in one tick, got ${spent}`);
ms.autoDrillTimer = 0;
ms.descending = false;
ms.generateNewGrid();
ms.update(0.1); // 0.5 hits -> carried
assert.ok(Math.abs(ms.autoDrillTimer - 0.5) < 1e-9, `timer should carry 0.5, got ${ms.autoDrillTimer}`);
ms.update(0.1);
assert.ok(Math.abs(ms.autoDrillTimer) < 1e-9, 'second tick should consume the carried hit');

console.log('--- Testing v1 save migration (§9) ---');
assert.equal(compressDepth(60), 60);
assert.equal(compressDepth(500), 91);
assert.equal(compressDepth(3752), 120);
assert.equal(compressDepth(47000), 156);
const old = new GameState();
old.miningGrid = {
  depth: 3752, maxDepth: 47000, pickaxeTier: 5, autoDrills: 1733,
  blocks: [{ id: 0, content: 'stone', revealed: false, hp: 25, maxHp: 25 }]
};
const saved = JSON.parse(JSON.stringify(old.serialize()));
const loaded = new GameState();
loaded.deserialize(saved);
const ms2 = new MiningSystem(loaded);
const g = loaded.miningGrid;
assert.equal(g.schema, MINING_SCHEMA);
assert.equal(g.depth, 120);
assert.equal(g.maxDepth, 156);
assert.equal(g.pickaxeTier, 5);
assert.equal(g.autoDrills, 12);
assert.equal(g.blocks.length, 36);
assert.equal(g.blocks[0].maxHp, ms2.getTileHp(120));
// idempotent
ms2.initMiningGrid();
assert.equal(g.depth, 120);
// runtime import path: update() migrates a replaced grid
loaded.miningGrid = { depth: 500, maxDepth: 500, pickaxeTier: 2, autoDrills: 3, blocks: [] };
ms2.update(0.05);
assert.equal(loaded.miningGrid.depth, 91);
assert.equal(loaded.miningGrid.schema, MINING_SCHEMA);

console.log('✅ MINING TESTS PASSED');
setTimeout(() => process.exit(0), 0);
