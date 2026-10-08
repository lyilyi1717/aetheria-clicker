// R5: upgrade shop (design doc 6.1). Table shape, costs, unlock thresholds, effects on
// production and click yield, synergies, reset on Ascend/Transcend with the Blueprint Memory
// keep hook, save/load, and BigNum safety at tier 30.
// Run: node test_upgrades.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { SaveManager } from './js/engine/SaveManager.js';
import { BuildingSystem, BUILDING_DEFINITIONS, MAX_TIER_COUNT } from './js/systems/BuildingSystem.js';
import { PrestigeSystem } from './js/systems/PrestigeSystem.js';
import {
  UpgradeSystem, UPGRADE_DEFINITIONS, TIER_UPGRADE_THRESHOLDS, TIER_UPGRADE_MULT, CLICK_UPGRADE_COUNT,
  CLICK_UPGRADE_MULT, SYNERGY_PER_UNIT, SYNERGY_MIN_TARGET, SYNERGY_MIN_SOURCE,
  getUpgradeDefinition, getTierUpgradeMult, getClickUpgradeMult, sanitizeUpgrades,
  addAscendKeepRule, getKeptOnAscend, ASCEND_KEEP_RULES
} from './js/systems/UpgradeSystem.js';
import { particles } from './js/engine/ParticleEngine.js';
import { buyNode, isFoundryOpen } from './js/systems/ShardTreeSystem.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
{
  const store = new Map();
  globalThis.localStorage ??= {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  };
}
particles.suppressed = true;
const close = (a, b, eps = 1e-9) => Math.abs(a / b - 1) < eps;

const make = () => {
  const gs = new GameState();
  const bs = new BuildingSystem(gs);
  const ps = new PrestigeSystem(gs);
  const us = new UpgradeSystem(gs);
  gs.buildingSystem = bs;
  gs.upgradeSystem = us;
  return { gs, bs, ps, us };
};
const rich = (gs) => { gs.aether = new BigNum(1, 300); };

console.log('--- Table: 5 per tier for all 20 tiers, 15 click, 8 synergy, unique ids ---');
{
  const byKind = (k) => UPGRADE_DEFINITIONS.filter(u => u.kind === k);
  assert.equal(byKind('tier').length, 5 * MAX_TIER_COUNT);
  assert.equal(byKind('click').length, CLICK_UPGRADE_COUNT);
  assert.equal(CLICK_UPGRADE_COUNT, 15);
  assert.equal(byKind('synergy').length, 8);
  assert.equal(new Set(UPGRADE_DEFINITIONS.map(u => u.id)).size, UPGRADE_DEFINITIONS.length);
  assert.deepEqual(TIER_UPGRADE_THRESHOLDS, [1, 5, 15, 30, 60]);
  // Every synergy pairs two different base tiers (visible without a Transcend)
  for (const u of byKind('synergy')) {
    assert.notEqual(u.building, u.source);
    assert.ok(u.tier <= 14, u.id);
  }
  console.log(`  ${UPGRADE_DEFINITIONS.length} upgrades`);
}

console.log('--- Cost: tier upgrade k = baseCost x 4^(k+1); click i = 10 x baseCost(tier i) ---');
{
  for (const def of [BUILDING_DEFINITIONS[0], BUILDING_DEFINITIONS[13], BUILDING_DEFINITIONS[19]]) {
    for (let k = 0; k < 5; k++) {
      const u = getUpgradeDefinition(`${def.id}_u${k + 1}`);
      assert.ok(close(u.cost.div(def.baseCost).toNumber(), Math.pow(4, k + 1)), u.id);
    }
  }
  assert.equal(getUpgradeDefinition('tapper_u1').cost.toNumber(), 40);
  assert.equal(getUpgradeDefinition('click_1').cost.toNumber(), 100);
  assert.ok(close(getUpgradeDefinition('click_15').cost.toNumber(), BUILDING_DEFINITIONS[14].baseCost.toNumber() * 10));
}

console.log('--- Unlock thresholds and buying ---');
{
  const { gs, us } = make();
  assert.equal(us.isAvailable('tapper_u1'), false, 'needs 1 owned');
  gs.buildings.tapper.count = 1;
  assert.equal(us.isAvailable('tapper_u1'), true);
  assert.equal(us.isAvailable('tapper_u2'), false, 'needs 5 owned');
  gs.buildings.tapper.count = 4;
  assert.equal(us.isAvailable('tapper_u2'), false);
  gs.buildings.tapper.count = 5;
  assert.equal(us.isAvailable('tapper_u2'), true);
  gs.buildings.tapper.count = 200;
  for (let k = 1; k <= 5; k++) assert.equal(us.isAvailable(`tapper_u${k}`), true);

  // Cost is paid, can't buy twice, can't buy without the Aether
  gs.aether = new BigNum(39);
  assert.equal(us.buy('tapper_u1'), false);
  gs.aether = new BigNum(100);
  assert.equal(us.buy('tapper_u1'), true);
  assert.ok(close(gs.aether.toNumber(), 60));
  assert.equal(us.isBought('tapper_u1'), true);
  assert.equal(us.isAvailable('tapper_u1'), false);
  assert.equal(us.buy('tapper_u1'), false);

  // Click chain is sequential
  assert.equal(us.isAvailable('click_1'), true);
  assert.equal(us.isAvailable('click_2'), false);
  rich(gs);
  us.buy('click_1');
  assert.equal(us.isAvailable('click_2'), true);

  // Synergy needs 25 of the target and 50 of the source
  const syn = UPGRADE_DEFINITIONS.find(u => u.kind === 'synergy');
  assert.equal(us.isAvailable(syn.id), false);
  gs.buildings[syn.building].count = SYNERGY_MIN_TARGET;
  gs.buildings[syn.source].count = SYNERGY_MIN_SOURCE - 1;
  assert.equal(us.isAvailable(syn.id), false);
  gs.buildings[syn.source].count = SYNERGY_MIN_SOURCE;
  assert.equal(us.isAvailable(syn.id), true);

  // getAvailable is sorted by cost; buyAllAffordable buys them cheapest first
  const avail = us.getAvailable();
  for (let i = 1; i < avail.length; i++) assert.ok(avail[i - 1].cost.lte(avail[i].cost));
  const n = us.buyAllAffordable();
  assert.equal(n, avail.length);
  assert.equal(us.getAvailable().filter(u => u.kind !== 'click').length, 0);
}

console.log('--- Locked tiers: upgrades for tiers 9-20 stay hidden until the tier opens ---');
{
  const { gs, us } = make();
  const t15 = BUILDING_DEFINITIONS[8];
  gs.buildings[t15.id].count = 300;
  rich(gs);
  assert.equal(us.isAvailable(`${t15.id}_u1`), false);
  assert.equal(us.buy(`${t15.id}_u1`), false);
  assert.ok(!us.getUpcoming(500).some(u => u.tier > 8));
  gs.transcendenceCount = 1;
  assert.equal(us.isAvailable(`${t15.id}_u1`), true);
}

console.log('--- Effect: xTIER_UPGRADE_MULT per tier upgrade on that tier only; synergy per source owned ---');
{
  const { gs, bs, us } = make();
  gs.buildings.tapper.count = 200;
  gs.buildings.resonator.count = 10;
  const tap0 = bs.getBuildingProduction('tapper').toNumber();
  const res0 = bs.getBuildingProduction('resonator').toNumber();
  rich(gs);
  us.buy('tapper_u1');
  us.buy('tapper_u2');
  assert.ok(close(bs.getBuildingProduction('tapper').toNumber(), tap0 * TIER_UPGRADE_MULT ** 2));
  assert.ok(close(bs.getBuildingProduction('resonator').toNumber(), res0), 'other tiers unchanged');
  assert.ok(close(getTierUpgradeMult(gs, 'tapper'), TIER_UPGRADE_MULT ** 2));

  // Synergy: Giant Dallah +1% per Shawarma Stall owned
  gs.buildings.obelisk.count = 30;
  const dal0 = bs.getBuildingProduction('obelisk').toNumber();
  assert.equal(us.buy('syn_obelisk_tapper'), true);
  assert.ok(close(bs.getBuildingProduction('obelisk').toNumber(), dal0 * (1 + SYNERGY_PER_UNIT * 200)));
  gs.buildings.tapper.count = 300; // grows with the source count
  assert.ok(close(getTierUpgradeMult(gs, 'obelisk'), 1 + SYNERGY_PER_UNIT * 300));

  // getProductionGain predicts the next tier upgrade's gain
  const gain = us.getProductionGain('tapper_u3').toNumber();
  const before = bs.getBuildingProduction('tapper').toNumber();
  us.buy('tapper_u3');
  assert.ok(close(bs.getBuildingProduction('tapper').toNumber() - before, gain));
}

console.log('--- Click yield = clickPower x 2^(click upgrades) + 3% CPS, combo unchanged ---');
{
  const { gs, us } = make();
  assert.equal(gs.getClickYield().toNumber(), 1);
  rich(gs);
  for (let i = 1; i <= 4; i++) assert.equal(us.buy(`click_${i}`), true);
  gs.aether = BigNum.zero();
  assert.equal(getClickUpgradeMult(gs), CLICK_UPGRADE_MULT ** 4);
  assert.equal(gs.getClickBase().toNumber(), 16);
  assert.equal(gs.getClickYield().toNumber(), 16);
  gs.buildings.tapper.count = 10; // 10 x 1 x milestone x2 = 20 CPS
  const cps = gs.getNetAetherPerSecond().toNumber();
  assert.ok(close(gs.getClickYield().toNumber(), 16 + 0.03 * cps));
  gs.comboCount = 50; // combo x5 multiplies the whole click
  assert.ok(close(gs.getClickYield().toNumber(), (16 + 0.03 * cps) * 5));
  // All 15
  rich(gs);
  for (let i = 5; i <= 15; i++) assert.equal(us.buy(`click_${i}`), true);
  assert.equal(getClickUpgradeMult(gs), 2 ** 15);
}

console.log('--- Reset on Ascend; Blueprint Memory keep rules; full reset on Transcend ---');
{
  const { gs, ps, us } = make();
  gs.buildings.tapper.count = 200;
  gs.buildings.resonator.count = 200;
  rich(gs);
  us.buyAllAffordable();
  const bought = us.getBoughtCount();
  assert.ok(bought >= 10);
  gs.totalAetherEarned = new BigNum(1, 12);
  assert.ok(ps.ascend(true));
  assert.equal(us.getBoughtCount(), 0, 'Ascend clears every upgrade');
  assert.equal(gs.getClickBase().toNumber(), 1);

  // Keep rule (what R6 Blueprint Memory registers): first 2 upgrades of each tier
  gs.dustShopTest = { blueprint: true };
  const rulesBefore = ASCEND_KEEP_RULES.length; // the dust shop registers its own Blueprint Memory rule
  const remove = addAscendKeepRule((u, s) => s.dustShopTest?.blueprint && u.kind === 'tier' && u.level <= 2);
  try {
    gs.buildings.tapper.count = 200;
    rich(gs);
    us.buyAllAffordable();
    assert.deepEqual(getKeptOnAscend(gs).sort(), ['tapper_u1', 'tapper_u2']);
    gs.totalAetherEarned = new BigNum(1, 12);
    ps.ascend(true);
    assert.deepEqual(Object.keys(gs.upgrades).sort(), ['tapper_u1', 'tapper_u2']);
    // A rule that reads state keeps nothing once the feature is off
    gs.dustShopTest.blueprint = false;
    gs.totalAetherEarned = new BigNum(1, 12);
    ps.ascend(true);
    assert.equal(us.getBoughtCount(), 0);

    // Transcend clears everything, keep rules or not
    gs.dustShopTest.blueprint = true;
    gs.buildings.tapper.count = 200;
    rich(gs);
    us.buyAllAffordable();
    gs.totalCosmicDust = ps.getTranscendGate();
    assert.ok(ps.transcend());
    assert.equal(us.getBoughtCount(), 0);
  } finally {
    remove();
  }
  assert.equal(ASCEND_KEEP_RULES.length, rulesBefore, 'remover unregisters the rule');
}

console.log('--- Save/load: bought upgrades round-trip; old saves load with none ---');
{
  const { gs, us } = make();
  gs.buildings.tapper.count = 50;
  rich(gs);
  us.buy('tapper_u1'); us.buy('tapper_u3'); us.buy('click_1');
  const json = JSON.parse(JSON.stringify(gs.serialize()));
  assert.deepEqual([...json.upgrades].sort(), ['click_1', 'tapper_u1', 'tapper_u3']);
  const gs2 = new GameState();
  gs2.deserialize(json);
  assert.deepEqual(Object.keys(gs2.upgrades).sort(), ['click_1', 'tapper_u1', 'tapper_u3']);
  assert.equal(gs2.getClickBase().toNumber(), 2);

  // A save from before the shop (no field) and a hand-edited one
  const old = { ...json };
  delete old.upgrades;
  const gs3 = new GameState();
  gs3.deserialize(old);
  assert.deepEqual(gs3.upgrades, {});
  assert.deepEqual(sanitizeUpgrades(['tapper_u1', 'nope', 5, null]), { tapper_u1: true });
  assert.deepEqual(sanitizeUpgrades({ tapper_u2: true, click_1: false }), { tapper_u2: true });
  assert.deepEqual(sanitizeUpgrades('garbage'), {});

  // SaveManager export/import keeps them too
  const sm = new SaveManager(gs);
  const str = sm.exportSaveString?.();
  if (typeof str === 'string') {
    const gs4 = new GameState();
    const sm4 = new SaveManager(gs4);
    assert.ok(sm4.importSaveString(str));
    assert.ok(gs4.upgrades.tapper_u3);
  }
}

console.log('--- BigNum safety at the top tier: finite costs and production, no overflow ---');
{
  const { gs, bs, us } = make();
  gs.transcendenceCount = 99;
  const top = BUILDING_DEFINITIONS[MAX_TIER_COUNT - 1];
  gs.buildings[top.id].count = 5000;
  gs.aether = new BigNum(1, 5000);
  for (let k = 1; k <= 5; k++) assert.equal(us.buy(`${top.id}_u${k}`), true);
  const cost = getUpgradeDefinition(`${top.id}_u5`).cost;
  assert.ok(Number.isFinite(cost.m) && cost.e === 23, `tier 20 u5 cost ${cost.format('scientific', 2)}`);
  const prod = bs.getBuildingProduction(top.id);
  assert.ok(Number.isFinite(prod.m) && prod.m >= 1 && prod.e > 10);
  assert.ok(close(getTierUpgradeMult(gs, top.id), TIER_UPGRADE_MULT ** 5));
  // Huge dust and shard multipliers on top stay finite
  gs.totalCosmicDust = new BigNum(1, 400);
  gs.totalFractureShards = new BigNum(500);
  const net = gs.getNetAetherPerSecond();
  assert.ok(Number.isFinite(net.m) && net.e > 400);
}

console.log('--- Deep Blueprint (shard tree Foundry): that tier\'s upgrades cost /10 ---');
{
  const { gs, us } = make();
  gs.transcendenceCount = 1;                       // tier 9 open
  const t15 = BUILDING_DEFINITIONS[8];
  gs.buildings[t15.id].count = 10;
  gs.fractureShards = new BigNum(5);
  const full = us.getCost(`${t15.id}_u1`);
  assert.ok(close(full.toNumber(), t15.baseCost.toNumber() * 4));
  assert.equal(isFoundryOpen(gs), true, 'the shop being linked opens the Foundry');
  assert.equal(buyNode(gs, `foundry_t${t15.tier}`), true);
  assert.ok(close(us.getCost(`${t15.id}_u1`).toNumber(), full.toNumber() / 10));
  assert.ok(close(us.getCost('tapper_u1').toNumber(), 40), 'other tiers keep their price');
  assert.ok(close(us.getCost('click_15').toNumber(), getUpgradeDefinition('click_15').cost.toNumber()), 'click upgrades are not tier upgrades');
  gs.aether = full.div(10);
  assert.equal(us.buy(`${t15.id}_u1`), true, 'affordable at the discounted price');
  assert.equal(gs.aether.toNumber(), 0);
}

console.log('All upgrade shop tests passed.');
