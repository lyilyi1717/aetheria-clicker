// R4: Transcend rework (design doc 6.1). Gate, shard payout and multipliers, generated tiers 15-30,
// what Transcend resets and keeps, and the preview numbers.
// Run: node test_r4_transcend.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { SaveManager } from './js/engine/SaveManager.js';
import { GardenSystem } from './js/systems/GardenSystem.js';
import {
  BuildingSystem, BUILDING_DEFINITIONS, BASE_TIER_COUNT, MAX_TIER_COUNT,
  TIER_COST_RATIO, TIER_CPS_RATIO, getUnlockedTierCount
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

console.log('--- Generated tiers 15-30: deterministic ids, x18 cost, x7 CPS, finite ---');
{
  assert.equal(BASE_TIER_COUNT, 14);
  assert.equal(MAX_TIER_COUNT, 30);
  assert.equal(BUILDING_DEFINITIONS.length, 30);
  const ids = BUILDING_DEFINITIONS.map(d => d.id);
  assert.equal(new Set(ids).size, 30, 'ids are unique');
  // The hand-written tiers keep their ids (saves key buildings by id)
  assert.equal(ids[0], 'tapper');
  assert.equal(ids[13], 'matrix');
  // Generated ids are fixed data: changing or reordering them would orphan saved counts
  assert.deepEqual(ids.slice(14, 17), ['falcon_club', 'camel_derby', 'date_vault']);
  assert.equal(ids[29], 'eternal_dallah');
  BUILDING_DEFINITIONS.forEach((d, i) => {
    assert.equal(d.tier, i + 1);
    assert.equal(d.costMult, 1.15);
    assert.ok(d.name && d.icon && d.desc, `tier ${i + 1} has text`);
  });
  for (let i = BASE_TIER_COUNT; i < 30; i++) {
    const d = BUILDING_DEFINITIONS[i], prev = BUILDING_DEFINITIONS[i - 1];
    assert.ok(close(d.baseCost.div(prev.baseCost).toNumber(), TIER_COST_RATIO), `tier ${i + 1} cost x18`);
    assert.ok(close(d.baseCps.div(prev.baseCps).toNumber(), TIER_CPS_RATIO), `tier ${i + 1} CPS x7`);
  }
  const top = BUILDING_DEFINITIONS[29];
  assert.ok(Number.isFinite(top.baseCost.toNumber()) && Number.isFinite(top.baseCps.toNumber()));
  // 6.2e15 x 18^16 and 2.1e10 x 7^16
  assert.ok(Math.abs(log10(top.baseCost) - (Math.log10(6.2e15) + 16 * Math.log10(18))) < 1e-9);
  assert.ok(Math.abs(log10(top.baseCps) - (Math.log10(2.1e10) + 16 * Math.log10(7))) < 1e-9);
}

console.log('--- Tier unlocks: 14 + one per Transcend, capped at 30 ---');
{
  for (const [t, n] of [[0, 14], [1, 15], [5, 19], [16, 30], [40, 30], [-3, 14], [NaN, 14]]) {
    assert.equal(getUnlockedTierCount({ transcendenceCount: t }), n, `${t} Transcends -> ${n} tiers`);
  }
  const { gs, bs } = make();
  gs.aether = new BigNum('1e60');
  bs.buyAmount = 1;
  assert.equal(bs.isTierUnlocked('matrix'), true);
  assert.equal(bs.isTierUnlocked('falcon_club'), false);
  assert.equal(bs.buyBuilding('falcon_club'), false, 'a locked tier cannot be bought');
  assert.equal(bs.getMaxBuyable('falcon_club').count, 0);
  gs.transcendenceCount = 1;
  assert.equal(bs.buyBuilding('falcon_club'), true);
  assert.equal(gs.buildings.falcon_club.count, 1);
  assert.equal(bs.buyBuilding('camel_derby'), false);

  // MAX buy, milestones and production on a generated tier
  bs.buyAmount = 'max';
  gs.aether = bs.getBuildingCost('falcon_club', 24);
  assert.equal(bs.getMaxBuyable('falcon_club').count, 24);
  assert.equal(bs.buyBuilding('falcon_club'), true);
  assert.equal(gs.buildings.falcon_club.count, 25);
  const def = BUILDING_DEFINITIONS[14];
  assert.ok(close(bs.getBuildingProduction('falcon_club').toNumber(), def.baseCps.toNumber() * 25 * 4), 'milestones x2 x2 at 10 and 25');
  assert.ok(bs.getTotalProduction().gte(bs.getBuildingProduction('falcon_club')));
}

console.log('--- Offline gains include generated tiers ---');
{
  const { gs } = make();
  gs.transcendenceCount = 16;
  gs.buildings.eternal_dallah.count = 1;
  const store = new Map();
  globalThis.localStorage ??= { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) };
  const sm = new SaveManager(gs);
  const cps = gs.getNetAetherPerSecond();
  assert.ok(cps.gte(BUILDING_DEFINITIONS[29].baseCps));
  const res = sm.processOfflineTime(Date.now() - 3600 * 1000);
  assert.ok(res, 'an hour away pays');
  assert.ok(gs.aether.gte(cps.mul(3000)), 'an hour of tier-30 output was paid');
}

console.log('--- Gate: 1e9 x 10^k lifetime dust of the layer ---');
{
  const { gs, ps } = make();
  assert.equal(TRANSCEND_BASE_GATE, 1e9);
  assert.equal(TRANSCEND_SLOW_FROM, Infinity, 'x30 regime off (re-simulated in R4)');
  for (let k = 0; k < 40; k += 3) {
    const g = ps.getTranscendGate(k);
    assert.ok(Math.abs(log10(g) - (9 + k)) < 1e-9, `gate ${k} = 1e${9 + k}`);
  }
  assert.equal(ps.getTranscendGate().toNumber(), 1e9);
  gs.totalCosmicDust = new BigNum(999999999);
  assert.equal(ps.canTranscend(), false);
  assert.equal(ps.transcend(), false);
  gs.totalCosmicDust = new BigNum(1e9);
  assert.equal(ps.canTranscend(), true);
  gs.transcendenceCount = 2;
  assert.equal(ps.canTranscend(), false, 'third Transcend needs 1e11');
  gs.totalCosmicDust = new BigNum(1e11);
  assert.equal(ps.canTranscend(), true);
}

console.log('--- Shards: 2 per Transcend, x1.5 Aether and x1.5 dust gain each ---');
{
  const { gs, ps } = make();
  gs.buildings.tapper.count = 1;
  const base = gs.getNetAetherPerSecond().toNumber();
  gs.totalFractureShards = new BigNum(2);
  assert.ok(close(gs.getNetAetherPerSecond().toNumber(), base * 2.25), 'x1.5^2 Aether');
  gs.totalFractureShards = new BigNum(10);
  assert.ok(close(gs.getNetAetherPerSecond().toNumber(), base * Math.pow(1.5, 10), 1e-6));
  // Spendable shards do not drive the multiplier: spending must never lower production
  gs.fractureShards = BigNum.zero();
  assert.ok(close(gs.getNetAetherPerSecond().toNumber(), base * Math.pow(1.5, 10), 1e-6));

  gs.totalFractureShards = BigNum.zero();
  gs.totalAetherEarned = new BigNum(8e9);
  assert.equal(ps.getPendingCosmicDust().toNumber(), 300);
  gs.totalFractureShards = new BigNum(2);
  assert.equal(ps.getPendingCosmicDust().toNumber(), 675, '300 x 2.25');
  assert.ok(close(ps.getDustMultipliers().shardMult.toNumber(), 2.25));
  // Huge shard counts stay finite (BigNum, no double overflow)
  gs.totalFractureShards = new BigNum(5000);
  assert.ok(gs.getShardAetherMult().gt(new BigNum('1e800')));
  assert.ok(gs.getNetAetherPerSecond().gt(0));
}

console.log('--- Transcend: what resets and what stays ---');
{
  const { gs, ps } = make();
  gs.transcendenceCount = 0;
  gs.ascensionCount = 20;
  gs.cosmicDust = new BigNum(4e8);
  gs.totalCosmicDust = new BigNum(2e9);
  gs.aether = new BigNum(1e30);
  gs.totalAetherEarned = new BigNum(1e30);
  gs.buildings.matrix.count = 50;
  gs.ascensionPerks = { eternal_resonance: { rank: 7 }, genesis: { rank: 0 } };
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
  assert.equal(gs.ascensionPerks.eternal_resonance.rank, 0, 'perks reset');
  assert.deepEqual(gs.achievements, { first: true }, 'Codex kept');
  assert.equal(gs.talents.click_power.rank, 2, 'talents kept');
  assert.equal(gs.ascensionCount, 21, 'lifetime Ascension count kept (+1 for the reset)');
  assert.equal(new BuildingSystem(gs).getUnlockedTierCount(), 15, 'new tier unlocked');
  assert.equal(new GardenSystem(gs).isBreedingUnlocked(), true, 'R17 stand-in still opens at the first Transcend');
  assert.ok(close(gs.getDustMultiplier(), 1));
  assert.ok(close(gs.getShardAetherMult().toNumber(), tp.shardAfter.toNumber()), 'preview matches the result');
  assert.equal(ps.getTranscendGate().toNumber(), 1e10, 'next gate x10');

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
  gs.totalCosmicDust = new BigNum(1e12);
  const tp = ps.getTranscendPreview();
  assert.equal(tp.gate.toNumber(), 1e12);
  assert.equal(tp.nextGate.toNumber(), 1e13);
  assert.equal(tp.shardsGained, 2);
  assert.equal(tp.shardsBefore, 6);
  assert.equal(tp.shardsAfter, 8);
  assert.ok(close(tp.shardBefore.toNumber(), Math.pow(1.5, 6)));
  assert.ok(close(tp.shardAfter.toNumber(), Math.pow(1.5, 8)));
  assert.ok(close(tp.dustGainAfter.toNumber(), Math.pow(1.5, 8)));
  assert.ok(close(tp.dustBefore.toNumber(), 1 + 0.02 * 1e12));
  assert.equal(tp.dustAfter.toNumber(), 1);
  assert.equal(tp.tiersBefore, 17);
  assert.equal(tp.tiersAfter, 18);
  assert.equal(tp.newTier.id, BUILDING_DEFINITIONS[17].id);
  assert.ok(close(tp.before.toNumber(), (1 + 0.02 * 1e12) * Math.pow(1.5, 6)));
  assert.ok(close(tp.after.toNumber(), Math.pow(1.5, 8)));
  // At the ladder cap there is no new tier to promise
  gs.transcendenceCount = 16;
  assert.equal(ps.getTranscendPreview().newTier, null);
}

console.log('R4 TRANSCEND TESTS PASSED');
