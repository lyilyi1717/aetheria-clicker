// R4/R31: Transcend (design doc 6.1). Gate, shard payout and multipliers, the 20-tier ladder,
// what Transcend resets and keeps, and the preview numbers.
// Run: node test_r4_transcend.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { SaveManager } from './js/engine/SaveManager.js';
import { GardenSystem } from './js/systems/GardenSystem.js';
import {
  BuildingSystem, BUILDING_DEFINITIONS, BASE_TIER_COUNT, MAX_TIER_COUNT, RETIRED_BUILDING_IDS,
  TIER1_COST, TIER1_CPS, TIER_COST_RATIO, TIER_CPS_RATIO, getUnlockedTierCount
} from './js/systems/BuildingSystem.js';
import {
  PrestigeSystem, TRANSCEND_BASE_GATE, TRANSCEND_SHARDS, TRANSCEND_SLOW_FROM
} from './js/systems/PrestigeSystem.js';
import { particles } from './js/engine/ParticleEngine.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;
const close = (a, b, eps = 1e-9) => Math.abs(a / b - 1) < eps;
const log10 = (x) => Math.log10(x.m) + x.e;

const make = () => {
  const gs = new GameState();
  const bs = new BuildingSystem(gs);
  const ps = new PrestigeSystem(gs);
  gs.buildingSystem = bs;
  return { gs, bs, ps };
};

console.log('--- Ladder (R31): 20 tiers, x10 cost, x4 output, fixed ids, tiers 21-30 retired ---');
{
  assert.equal(BASE_TIER_COUNT, 8);
  assert.equal(MAX_TIER_COUNT, 20);
  assert.equal(BUILDING_DEFINITIONS.length, 20);
  const ids = BUILDING_DEFINITIONS.map(d => d.id);
  assert.equal(new Set(ids).size, 20, 'ids are unique');
  // Ids never change (saves key buildings by id)
  assert.equal(ids[0], 'tapper');
  assert.equal(ids[13], 'matrix');
  assert.deepEqual(ids.slice(14, 17), ['falcon_club', 'camel_derby', 'date_vault']);
  assert.equal(ids[19], 'dune_array');
  for (const id of RETIRED_BUILDING_IDS) assert.ok(!ids.includes(id), `${id} is retired`);
  assert.equal(RETIRED_BUILDING_IDS.length, 10);
  BUILDING_DEFINITIONS.forEach((d, i) => {
    assert.equal(d.tier, i + 1);
    assert.equal(d.costMult, 1.15);
    assert.ok(d.name && d.icon && d.desc, `tier ${i + 1} has text`);
    assert.ok(close(d.baseCost.toNumber(), TIER1_COST * TIER_COST_RATIO ** i), `tier ${i + 1} cost`);
    assert.ok(close(d.baseCps.toNumber(), TIER1_CPS * TIER_CPS_RATIO ** i), `tier ${i + 1} output`);
  });
  assert.equal(BUILDING_DEFINITIONS[0].baseCost.toNumber(), 10);
  assert.equal(BUILDING_DEFINITIONS[19].baseCost.toNumber(), 1e20);
}

console.log('--- Tier unlocks: 8 + one per Transcend, capped at 20 ---');
{
  for (const [t, n] of [[0, 8], [1, 9], [5, 13], [12, 20], [40, 20], [-3, 8], [NaN, 8]]) {
    assert.equal(getUnlockedTierCount({ transcendenceCount: t }), n, `${t} Transcends -> ${n} tiers`);
  }
  const { gs, bs } = make();
  gs.aether = new BigNum('1e60');
  bs.buyAmount = 1;
  assert.equal(bs.isTierUnlocked('observatory'), true);
  assert.equal(bs.isTierUnlocked('gateway'), false);
  assert.equal(bs.buyBuilding('gateway'), false, 'a locked tier cannot be bought');
  assert.equal(bs.getMaxBuyable('gateway').count, 0);
  gs.transcendenceCount = 1;
  assert.equal(bs.buyBuilding('gateway'), true);
  assert.equal(gs.buildings.gateway.count, 1);
  assert.equal(bs.buyBuilding('foundry'), false);

  // MAX buy, milestones and production
  bs.buyAmount = 'max';
  gs.aether = bs.getBuildingCost('gateway', 24);
  assert.equal(bs.getMaxBuyable('gateway').count, 24);
  assert.equal(bs.buyBuilding('gateway'), true);
  assert.equal(gs.buildings.gateway.count, 25);
  const def = BUILDING_DEFINITIONS[8];
  assert.ok(close(bs.getBuildingProduction('gateway').toNumber(), def.baseCps.toNumber() * 25 * 4), 'milestones x2 x2 at 10 and 25');
  // Milestones: x2 at 10/25/50/100/150/200/250/300, nothing past 300
  assert.equal(bs.getMilestoneMultiplier(9), 1);
  assert.equal(bs.getMilestoneMultiplier(300), 256);
  assert.equal(bs.getMilestoneMultiplier(5000), 256);
}

console.log('--- Offline gains include the top tier ---');
{
  const { gs } = make();
  gs.transcendenceCount = 12;
  gs.buildings.dune_array.count = 1;
  const store = new Map();
  globalThis.localStorage ??= { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) };
  const sm = new SaveManager(gs);
  const cps = gs.getNetAetherPerSecond();
  assert.ok(cps.gte(BUILDING_DEFINITIONS[19].baseCps));
  const res = sm.processOfflineTime(Date.now() - 3600 * 1000);
  assert.ok(res, 'an hour away pays');
  assert.ok(gs.aether.gte(cps.mul(3000)), 'an hour of tier-20 output was paid');
}

console.log('--- Gate: 400 x 1.6^k lifetime dust of the layer, x3 per step from the 9th ---');
{
  const { gs, ps } = make();
  assert.equal(TRANSCEND_BASE_GATE, 400);
  assert.equal(TRANSCEND_SLOW_FROM, 9);
  for (let k = 0; k <= 7; k++) {
    assert.ok(close(ps.getTranscendGate(k).toNumber(), 400 * 1.6 ** k), `gate ${k}`);
  }
  for (let k = 8; k < 30; k += 3) {
    assert.ok(close(ps.getTranscendGate(k).toNumber(), 400 * 1.6 ** 7 * 3 ** (k - 7)), `late gate ${k}`);
  }
  assert.equal(ps.getTranscendGate().toNumber(), 400);
  gs.totalCosmicDust = new BigNum(399);
  assert.equal(ps.canTranscend(), false);
  assert.equal(ps.transcend(), false);
  gs.totalCosmicDust = new BigNum(400);
  assert.equal(ps.canTranscend(), true);
  gs.transcendenceCount = 2;
  assert.equal(ps.canTranscend(), false, 'third Transcend needs 1,024');
  gs.totalCosmicDust = new BigNum(1024);
  assert.equal(ps.canTranscend(), true);
}

console.log('--- Shards: 2 per Transcend, +25% Aether each, additive; no dust-gain bonus ---');
{
  const { gs, ps } = make();
  gs.buildings.tapper.count = 1;
  const base = gs.getNetAetherPerSecond().toNumber();
  gs.totalFractureShards = new BigNum(2);
  assert.ok(close(gs.getNetAetherPerSecond().toNumber(), base * 1.5), '+50% Aether');
  gs.totalFractureShards = new BigNum(10);
  assert.ok(close(gs.getNetAetherPerSecond().toNumber(), base * 3.5));
  // Spendable shards do not drive the multiplier: spending must never lower production
  gs.fractureShards = BigNum.zero();
  assert.ok(close(gs.getNetAetherPerSecond().toNumber(), base * 3.5));

  gs.totalFractureShards = BigNum.zero();
  gs.totalAetherEarned = new BigNum(32e4);
  assert.equal(ps.getPendingCosmicDust().toNumber(), 20);
  gs.totalFractureShards = new BigNum(20);
  assert.equal(ps.getPendingCosmicDust().toNumber(), 20, 'shards no longer raise dust gain');
  // Huge shard counts stay finite
  gs.totalFractureShards = new BigNum(5000);
  assert.equal(gs.getShardAetherMult().toNumber(), 1 + 0.25 * 5000);
  assert.ok(gs.getNetAetherPerSecond().gt(0));
}

console.log('--- Transcend: what resets and what stays ---');
{
  const { gs, ps } = make();
  gs.transcendenceCount = 0;
  gs.ascensionCount = 20;
  gs.cosmicDust = new BigNum(100);
  gs.totalCosmicDust = new BigNum(500);
  gs.aether = new BigNum(1e30);
  gs.totalAetherEarned = new BigNum(1e30);
  gs.buildings.matrix.count = 50;
  gs.dustShop.ranks = { dust_amplifier: 7, blueprint_memory: 1 };
  gs.dustShop.autoBuy = false;
  gs.achievements = { first: true };
  gs.talents = { click_power: { rank: 2 } };
  gs.hero = null;
  assert.equal(new GardenSystem(gs).isBreedingUnlocked(), false);

  const tp = ps.getTranscendPreview();
  assert.equal(ps.transcend(), true);
  assert.equal(gs.transcendenceCount, 1);
  assert.equal(gs.fractureShards.toNumber(), TRANSCEND_SHARDS);
  assert.equal(gs.totalFractureShards.toNumber(), TRANSCEND_SHARDS);
  assert.ok(gs.cosmicDust.eq(0) && gs.totalCosmicDust.eq(0), 'dust and lifetime dust of the layer reset');
  assert.ok(gs.aether.eq(0) && gs.totalAetherEarned.eq(0), 'run resets');
  assert.equal(gs.buildings.matrix.count, 0);
  assert.deepEqual(gs.dustShop.ranks, {}, 'dust shop resets');
  assert.equal(gs.dustShop.autoBuy, false, 'the Auto-Buy switch is a preference and stays');
  assert.deepEqual(gs.achievements, { first: true }, 'Codex kept');
  assert.equal(gs.talents.click_power.rank, 2, 'talents kept');
  assert.equal(gs.ascensionCount, 21, 'lifetime Ascension count kept (+1 for the reset)');
  assert.equal(new BuildingSystem(gs).getUnlockedTierCount(), 9, 'new tier unlocked');
  assert.equal(new GardenSystem(gs).isBreedingUnlocked(), true, 'R17 stand-in still opens at the first Transcend');
  assert.ok(close(gs.getDustMultiplier(), 1));
  assert.ok(close(gs.getShardAetherMult().toNumber(), tp.shardAfter.toNumber()), 'preview matches the result');
  assert.ok(close(ps.getTranscendGate().toNumber(), 640), 'next gate x1.6');

  // State survives a save round-trip
  const gs2 = new GameState();
  gs2.deserialize(JSON.parse(JSON.stringify(gs.serialize())));
  assert.equal(gs2.transcendenceCount, 1);
  assert.equal(gs2.totalFractureShards.toNumber(), 2);
  assert.equal(gs2.fractureShards.toNumber(), 2);
}

console.log('--- Preview numbers ---');
{
  const { gs, ps } = make();
  gs.transcendenceCount = 3;
  gs.totalFractureShards = new BigNum(6);
  gs.fractureShards = new BigNum(6);
  gs.totalCosmicDust = new BigNum(2000);
  const tp = ps.getTranscendPreview();
  assert.ok(close(tp.gate.toNumber(), 400 * 1.6 ** 3));
  assert.ok(close(tp.nextGate.toNumber(), 400 * 1.6 ** 4));
  assert.equal(tp.shardsGained, 2);
  assert.equal(tp.shardsBefore, 6);
  assert.equal(tp.shardsAfter, 8);
  assert.ok(close(tp.shardBefore.toNumber(), 2.5));
  assert.ok(close(tp.shardAfter.toNumber(), 3));
  assert.ok(close(tp.dustBefore.toNumber(), 1 + 0.01 * 2000));
  assert.equal(tp.dustAfter.toNumber(), 1);
  assert.equal(tp.tiersBefore, 11);
  assert.equal(tp.tiersAfter, 12);
  assert.equal(tp.newTier.id, BUILDING_DEFINITIONS[11].id);
  assert.ok(close(tp.before.toNumber(), 21 * 2.5));
  assert.ok(close(tp.after.toNumber(), 3));
  // At the ladder cap there is no new tier to promise
  gs.transcendenceCount = 12;
  assert.equal(ps.getTranscendPreview().newTier, null);
}

console.log('R4 TRANSCEND TESTS PASSED');
