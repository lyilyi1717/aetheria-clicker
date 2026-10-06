// R13: shard tree (design doc §6.3). Node costs and prerequisites, spending from the balance only
// (multipliers read lifetime shards), effects (Foundry divisor, offline bonus, 6 h warp, Wardens,
// Second Wind, Auto-Ascend rules and the 10-min minimum), Transcend keeps the tree, save/load,
// and old saves load with an empty tree (Wardens kept free for saves that already Transcended).
// Run: node test_shard_tree.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { BuildingSystem, getUnlockedTierCount } from './js/systems/BuildingSystem.js';
import { PrestigeSystem, MIN_RUN_SECONDS } from './js/systems/PrestigeSystem.js';
import { CombatSystem } from './js/systems/CombatSystem.js';
import { computeOfflineBands } from './js/engine/SaveManager.js';
import {
  ShardTreeSystem, SHARD_TREE_NODES, SHARD_TREE_BRANCHES, getNode, getOpenTierCount,
  getDeepBlueprintDivisor, getOfflineBonusSeconds, getSpentShards, getShardBalance,
  sanitizeShardTreeState, defaultShardTreeState, autoAscendRuleMet, buyNode,
  DEEP_BLUEPRINT_DIVISOR, OFFLINE_SHARD_BONUS, LONG_WARP_SECONDS, LONG_WARP_COOLDOWN_MS
} from './js/systems/ShardTreeSystem.js';
import { particles } from './js/engine/ParticleEngine.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;
const clone = (o) => JSON.parse(JSON.stringify(o));

const make = (shards = 0) => {
  const gs = new GameState();
  const bs = new BuildingSystem(gs);
  const ps = new PrestigeSystem(gs);
  gs.buildingSystem = bs;
  gs.fractureShards = new BigNum(shards);
  gs.totalFractureShards = new BigNum(shards);
  const st = new ShardTreeSystem(gs, ps);
  return { gs, bs, ps, st };
};

console.log('--- Node table: three branches, doc costs ---');
{
  assert.deepEqual(SHARD_TREE_BRANCHES.map(b => b.id), ['foundry', 'chronos', 'tower']);
  const foundry = SHARD_TREE_NODES.filter(n => n.branch === 'foundry');
  assert.equal(foundry.length, 16, '16 Deep Blueprints');
  assert.deepEqual(foundry.map(n => n.tier), Array.from({ length: 16 }, (_, i) => 15 + i));
  assert.ok(foundry.every(n => n.cost === 1));
  assert.equal(getNode('chronos_auto_ascend').cost, 2, 'auto-Ascend is 2 shards (§6.3)');
  assert.equal(new Set(SHARD_TREE_NODES.map(n => n.id)).size, SHARD_TREE_NODES.length, 'unique ids');
  for (const n of SHARD_TREE_NODES) for (const r of n.requires) assert.ok(getNode(r), `${n.id} requires a real node`);
  // Local tier ladder matches BuildingSystem's
  for (let t = 0; t <= 20; t++) assert.equal(getOpenTierCount({ transcendenceCount: t }), getUnlockedTierCount({ transcendenceCount: t }));
}

console.log('--- Spending: balance only, multipliers never drop ---');
{
  const { gs, st } = make(5);
  const aBefore = gs.getShardAetherMult();
  const dBefore = gs.getShardDustMult();
  assert.equal(st.buy('chronos_auto_ascend'), true);
  assert.equal(getShardBalance(gs), 3);
  assert.equal(gs.getShardCount(), 5, 'lifetime shards untouched');
  assert.ok(gs.getShardAetherMult().eq(aBefore) && gs.getShardDustMult().eq(dBefore), 'x1.5 multipliers unchanged');
  assert.equal(getSpentShards(gs), 2);
  assert.equal(st.buy('chronos_auto_ascend'), false, 'cannot buy twice');
  assert.equal(st.buy('chronos_offline'), true);
  assert.equal(getShardBalance(gs), 1);
  assert.equal(st.buy('chronos_long_warp'), false, 'cannot afford 3 with 1');
  assert.equal(st.getBlockReason('chronos_long_warp'), 'needs 3 shards');
  assert.equal(st.buy('tower_wardens'), true);
  assert.equal(getShardBalance(gs), 0);
  assert.equal(gs.getShardCount(), 5);
  assert.equal(st.buy('nope'), false);
}

console.log('--- Prerequisites ---');
{
  const { gs, st } = make(10);
  assert.match(st.getBlockReason('chronos_offline'), /needs Auto-Ascend/);
  assert.match(st.getBlockReason('chronos_long_warp'), /needs Long Sleep/);
  assert.match(st.getBlockReason('tower_second_wind'), /needs Wardens/);
  assert.equal(st.buy('tower_second_wind'), false);
  assert.equal(getShardBalance(gs), 10, 'a refused buy spends nothing');
  st.buy('tower_wardens');
  assert.equal(st.buy('tower_second_wind'), true);
  // Foundry: the tier must be open and the upgrade shop linked
  assert.match(st.getBlockReason('foundry_t15'), /Tier 15/);
  gs.transcendenceCount = 1;
  assert.equal(st.getBlockReason('foundry_t15'), 'opens with the upgrade shop');
  gs.upgradeSystem = {};
  assert.equal(st.getBlockReason('foundry_t15'), null);
  assert.match(st.getBlockReason('foundry_t16'), /Tier 16/);
  assert.equal(getDeepBlueprintDivisor(gs, 15), 1);
  assert.equal(st.buy('foundry_t15'), true);
  assert.equal(getDeepBlueprintDivisor(gs, 15), DEEP_BLUEPRINT_DIVISOR);
  assert.equal(getDeepBlueprintDivisor(gs, 16), 1);
  assert.equal(getDeepBlueprintDivisor(gs, 3), 1);
}

console.log('--- Chronos: offline +8 h ---');
{
  const { gs, st } = make(5);
  assert.equal(getOfflineBonusSeconds(gs), 0);
  st.buy('chronos_auto_ascend'); st.buy('chronos_offline');
  assert.equal(getOfflineBonusSeconds(gs), OFFLINE_SHARD_BONUS);
  const b = computeOfflineBands(40 * 3600, 0, getOfflineBonusSeconds(gs));
  assert.equal(b.fullEnd, 16 * 3600);
  assert.equal(b.capEnd, 32 * 3600);
  assert.equal(b.paidSecs, 16 * 3600 + 16 * 3600 * 0.5);
  // Without the node, unchanged from R12
  assert.equal(computeOfflineBands(40 * 3600).fullEnd, 8 * 3600);
}

console.log('--- Chronos: 6 h Fast Forward once a day ---');
{
  const { gs, st, bs } = make(7);
  bs.buyBuilding('tapper');
  gs.buildings.tapper.count = 10;
  const now = 1e12;
  assert.equal(st.canLongWarp(now), false, 'needs the node');
  st.buy('chronos_auto_ascend'); st.buy('chronos_offline'); st.buy('chronos_long_warp');
  assert.equal(st.canLongWarp(now), true);
  const cps = gs.getNetAetherPerSecond();
  const a0 = gs.aether;
  const res = st.useLongWarp(now);
  assert.ok(res && res.aether.eq(cps.mul(LONG_WARP_SECONDS)));
  assert.ok(gs.aether.sub(a0).eq(res.aether));
  assert.equal(st.useLongWarp(now + 1000), null, 'cooldown');
  assert.equal(Math.round(st.getLongWarpReadyIn(now + 3600e3)), LONG_WARP_COOLDOWN_MS / 1000 - 3600);
  assert.ok(st.getLongWarpReadyIn(now - 365 * 86400e3) <= LONG_WARP_COOLDOWN_MS / 1000, 'clock set back: at most one cooldown');
  assert.equal(st.canLongWarp(now + LONG_WARP_COOLDOWN_MS), true);
}

console.log('--- Chronos: Auto-Ascend rules and the 10-min minimum ---');
{
  const B = (n) => new BigNum(n);
  // x2: pending >= lifetime; x1.5: >= 0.5 x; x1.2: >= 0.2 x
  assert.equal(autoAscendRuleMet({ rule: 'x2' }, B(99), B(100), 1e9), false);
  assert.equal(autoAscendRuleMet({ rule: 'x2' }, B(100), B(100), 1e9), true);
  assert.equal(autoAscendRuleMet({ rule: 'x1.5' }, B(50), B(100), 1e9), true);
  assert.equal(autoAscendRuleMet({ rule: 'x1.5' }, B(49), B(100), 1e9), false);
  assert.equal(autoAscendRuleMet({ rule: 'x1.2' }, B(20), B(100), 1e9), true);
  assert.equal(autoAscendRuleMet({ rule: 'x2' }, B(0), B(0), 1e9), false, 'nothing pending: never');
  assert.equal(autoAscendRuleMet({ rule: 'x2' }, B(1), B(0), 0), true, 'first Ascension of a layer');
  assert.equal(autoAscendRuleMet({ rule: 'timer', timerMin: 30 }, B(5), B(1e6), 29 * 60), false);
  assert.equal(autoAscendRuleMet({ rule: 'timer', timerMin: 30 }, B(5), B(1e6), 30 * 60), true);

  const { gs, ps, st } = make(2);
  const now = Date.now();
  gs.totalAetherEarned = new BigNum(1e12);  // pending 1,500 dust
  gs.runStartedAt = now - 3600e3;
  assert.equal(st.tick(now), false, 'not owned');
  st.buy('chronos_auto_ascend');
  gs.runStartedAt = now - (MIN_RUN_SECONDS - 5) * 1000;
  st.lastCheckAt = 0;
  assert.equal(st.shouldAutoAscend(now), false, 'respects the 10-min minimum run');
  gs.runStartedAt = now - (MIN_RUN_SECONDS + 5) * 1000;
  st.setAutoAscendEnabled(false);
  assert.equal(st.shouldAutoAscend(now), false, 'off switch');
  st.setAutoAscendEnabled(true);
  assert.equal(st.shouldAutoAscend(now), true);
  const pending = ps.getPendingCosmicDust();
  assert.equal(st.tick(now), true);
  assert.equal(gs.ascensionCount, 1);
  assert.ok(gs.totalCosmicDust.eq(pending));
  assert.equal(st.tick(now + 2000), false, 'new run: minimum applies again');
  const batch = st.takeAutoAscendBatch();
  assert.equal(batch.count, 1);
  assert.ok(batch.dust.eq(pending));
  assert.equal(st.takeAutoAscendBatch(), null, 'batch is handed over once');
  // Two Auto-Ascensions before the UI looks: one batch with both
  for (let i = 0; i < 2; i++) {
    gs.totalAetherEarned = new BigNum(10 ** (15 + 3 * i)); // each pending >= lifetime (x2 rule)
    gs.runStartedAt = Date.now() - (MIN_RUN_SECONDS + 5) * 1000;
    st.lastCheckAt = 0;
    assert.equal(st.tick(), true);
  }
  assert.equal(st.takeAutoAscendBatch().count, 2);
  // Rule setters accept only known values
  assert.equal(st.setAutoAscendRule('x3'), false);
  assert.equal(st.setAutoAscendRule('timer'), true);
  assert.equal(st.setAutoAscendTimer(7), false);
  assert.equal(st.setAutoAscendTimer(60), true);
  assert.deepEqual(gs.shardTree.autoAscend, { enabled: true, rule: 'timer', timerMin: 60 });
}

console.log('--- Tower: Wardens node and Second Wind ---');
{
  const { gs, st } = make(3);
  const cs = new CombatSystem(gs);
  gs.combatSystem = cs;
  gs.transcendenceCount = 1;
  assert.equal(cs.isWardensUnlocked(), false, 'a Transcend alone does not unlock Wardens any more');
  st.buy('tower_wardens');
  assert.equal(cs.isWardensUnlocked(), true);
  gs.hero.floor = 250;
  cs.initMonster();
  assert.ok(cs.monster.isWarden);

  // Without Second Wind a boss timeout retreats one floor
  const fail = () => { cs.monster.timer = 0.01; cs.update(0.05); };
  gs.hero.floor = 20; cs.initMonster();
  fail();
  assert.equal(gs.hero.floor, 19);

  st.buy('tower_second_wind');
  gs.hero.floor = 20; cs.initMonster();
  cs.monster.hp = cs.monster.maxHp / 2;
  gs.hero.hp = 1;
  fail();
  assert.equal(gs.hero.floor, 20, 'Second Wind: no retreat');
  assert.ok(cs.monster.secondWindUsed && cs.monster.isBoss);
  assert.equal(cs.monster.hp, cs.monster.maxHp / 2, 'boss keeps the damage taken');
  assert.ok(cs.monster.timer > cs.monster.maxTimer - 1, 'timer refilled');
  assert.equal(gs.hero.hp, cs.getTotalMaxHp(), 'hero healed');
  fail();
  assert.equal(gs.hero.floor, 19, 'one retry per boss fight');
  // A fresh fight gets a fresh Second Wind
  gs.hero.floor = 20; cs.initMonster();
  assert.ok(!cs.monster.secondWindUsed);
  // Normal monsters never use it
  gs.hero.floor = 21; cs.initMonster();
  assert.equal(cs.trySecondWind(), false);
}

console.log('--- Transcend keeps the tree; new shards add to the balance ---');
{
  const { gs, ps, st } = make(4);
  st.buy('chronos_auto_ascend');
  st.buy('tower_wardens');
  gs.totalCosmicDust = new BigNum(2e9);
  assert.equal(ps.transcend(), true);
  assert.ok(st.has('chronos_auto_ascend') && st.has('tower_wardens'));
  assert.equal(getShardBalance(gs), 1 + 2);
  assert.equal(gs.getShardCount(), 6);
  assert.equal(getSpentShards(gs), 3);
}

console.log('--- Save/load round trip ---');
{
  const { gs, st } = make(8);
  st.buy('chronos_auto_ascend'); st.buy('chronos_offline'); st.buy('chronos_long_warp'); st.buy('tower_wardens');
  st.setAutoAscendRule('x1.5');
  gs.shardTree.longWarpAt = 123456;
  const data = clone(gs.serialize());
  const gs2 = new GameState();
  gs2.deserialize(data);
  assert.deepEqual(gs2.shardTree, gs.shardTree);
  assert.equal(getShardBalance(gs2), 0);
  assert.equal(gs2.getShardCount(), 8);
  const cs2 = new CombatSystem(gs2);
  assert.equal(cs2.isWardensUnlocked(), true);
}

console.log('--- Old saves: empty tree; Wardens kept free if they already Transcended ---');
{
  const { gs } = make(0);
  const old = clone(gs.serialize());
  delete old.shardTree;
  const g1 = new GameState();
  g1.deserialize(old);
  assert.deepEqual(g1.shardTree, defaultShardTreeState());
  assert.equal(getSpentShards(g1), 0);

  // A save that Transcended before the tree (R18 stand-in gave it Wardens)
  const old2 = clone(old);
  old2.transcendenceCount = 2;
  old2.fractureShards = new BigNum(4).toJSON();
  old2.totalFractureShards = new BigNum(4).toJSON();
  const g2 = new GameState();
  g2.deserialize(old2);
  assert.equal(g2.shardTree.owned.tower_wardens, true);
  assert.equal(g2.shardTree.granted.tower_wardens, true);
  assert.equal(getSpentShards(g2), 0, 'granted, not spent');
  assert.equal(getShardBalance(g2), 4, 'no shards taken');
  assert.equal(new CombatSystem(g2).isWardensUnlocked(), true);
  // ... and a save that already has a tree is not granted anything
  const withTree = clone(old2);
  withTree.shardTree = clone(defaultShardTreeState());
  const g3 = new GameState();
  g3.deserialize(withTree);
  assert.equal(g3.shardTree.owned.tower_wardens, undefined);

  // Garbage in the slice is cleaned
  const s = sanitizeShardTreeState({ owned: { bogus: true, tower_wardens: 'yes', chronos_offline: true }, granted: { chronos_long_warp: true }, autoAscend: { rule: 'x9', timerMin: 3, enabled: false }, longWarpAt: 'x' });
  assert.deepEqual(s.owned, { chronos_offline: true });
  assert.deepEqual(s.granted, {});
  assert.deepEqual(s.autoAscend, { enabled: false, rule: 'x2', timerMin: 30 });
  assert.equal(s.longWarpAt, 0);
  assert.deepEqual(sanitizeShardTreeState([]), defaultShardTreeState());
}

console.log('--- buyNode never touches lifetime shards, even on a hand-edited state ---');
{
  const gs = new GameState();
  gs.fractureShards = new BigNum(2);
  gs.totalFractureShards = new BigNum(9);
  gs.shardTree = null;
  assert.equal(buyNode(gs, 'chronos_auto_ascend'), true);
  assert.equal(gs.getShardCount(), 9);
  assert.equal(getShardBalance(gs), 0);
}

console.log('Shard tree tests passed.');
