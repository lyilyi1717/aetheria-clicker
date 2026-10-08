import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { MiningSystem, compressDepth, getPickaxeName, MINING_SCHEMA, EXPLOSIVE_HITS, SHATTER_DAMAGE_MULT,
  STRATA_RELICS, RELIC_CHANCE, RELIC_PITY, AETHER_ORE_CHANCE } from './js/systems/MiningSystem.js';
import { MarketSystem } from './js/systems/MarketSystem.js';
import { AlchemySystem, GEM_LADDER, POLISH_RATIO } from './js/systems/AlchemySystem.js';

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
assert.equal(ms.getPickaxeCost(1), 160);
assert.equal(ms.getPickaxeCost(10), 10996);
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
assert.equal(gs.inventory.stone, 10);
assert.equal(ms.upgradePickaxe(), false);

console.log('--- Testing drill timer carry-over (B2) ---');
gs.miningGrid.autoDrills = 10; // 5 hits/s
gs.miningGrid.pickaxeTier = 0;
ms.generateNewGrid();
const hpBefore = gs.miningGrid.blocks.reduce((s, b) => s + b.hp, 0);
ms.autoDrillTimer = 0;
gs.mana = 0; // keep Leyline Overflow (x1.25 at full mana) out of this check
ms.update(1.0); // one big tick: 5 hits, not 1
const hpAfter = gs.miningGrid.blocks.reduce((s, b) => s + b.hp, 0);
const spent = hpBefore - hpAfter;
// 5 hits of power 1; a tile breaking mid-tick can only reduce the remaining HP pool
assert.ok(spent >= 4 && spent <= 5, `expected ~5 hits in one tick, got ${spent}`);
ms.autoDrillTimer = 0;
gs.mana = 0; // keep Leyline Overflow (x1.25 at full mana) out of this check
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
// compressed to 120 (HP 6.7e7: ~4 days per tile for L5 + 12 drills), then rebased (schema 3)
// to the deepest depth that kit digs in <= 1 h per tile. The record stays.
assert.equal(g.depth, 87);
assert.ok(ms2.getTileSeconds(87) <= 3600 && ms2.getTileSeconds(88) > 3600);
assert.equal(g.maxDepth, 156);
assert.equal(g.pickaxeTier, 5);
assert.equal(g.autoDrills, 12);
assert.equal(g.blocks.length, 36);
assert.equal(g.blocks[0].maxHp, ms2.getTileHp(87));
// idempotent
ms2.initMiningGrid();
assert.equal(g.depth, 87);
// runtime import path: update() migrates a replaced grid
loaded.miningGrid = { depth: 500, maxDepth: 500, pickaxeTier: 2, autoDrills: 3, blocks: [] };
ms2.update(0.05);
const imp = loaded.miningGrid;
assert.equal(imp.schema, MINING_SCHEMA);
assert.equal(imp.maxDepth, 91);
assert.ok(imp.depth < 91 && ms2.getTileSeconds(imp.depth) <= 3600 && ms2.getTileSeconds(imp.depth + 1) > 3600);
assert.equal(imp.blocks.length, 36);

console.log('--- Regression: stuck Excavation (v2.1.0 playtest) ---');
{
  // The descend pause must run on sim time, never a wall-clock timer.
  const realSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = () => { throw new Error('MiningSystem must not use setTimeout'); };
  try {
    const s = new GameState();
    const m = new MiningSystem(s);
    s.mana = 0;
    const stairs = s.miningGrid.blocks.find(b => b.content === 'stairs');
    stairs.hp = 1;
    m.mineBlock(stairs.id);
    assert.equal(s.miningGrid.depth, 2);
    assert.equal(m.descending, true);
    const oldBlocks = s.miningGrid.blocks;
    const other = oldBlocks.find(b => !b.revealed);
    m.mineBlock(other.id); // the spent grid ignores clicks while descending
    assert.equal(other.hp, other.maxHp);

    // A: page saved inside the descend window, then reloaded. Before the fix the grid kept
    // its revealed stairs and never regenerated: drills dug out the rest and then nothing
    // (clicks, drills, dynamite) could progress, forever.
    const reloaded = new GameState();
    reloaded.deserialize(JSON.parse(JSON.stringify(s.serialize())));
    const m2 = new MiningSystem(reloaded);
    const rg = reloaded.miningGrid;
    assert.equal(rg.depth, 2);
    assert.ok(!rg.blocks.some(b => b.revealed), 'reloaded grid must be a fresh one');
    assert.equal(rg.blocks[0].maxHp, m2.getTileHp(2));
    // and the runtime guard heals a dug-out grid (e.g. an imported save) on the next tick
    for (const b of rg.blocks) { b.revealed = true; b.hp = 0; }
    m2.update(0.05);
    assert.equal(rg.blocks.filter(b => !b.revealed).length, 36);

    // the pause itself: 0.4 sim seconds, then exactly one new grid at the new depth
    m.update(0.2);
    assert.equal(s.miningGrid.blocks, oldBlocks);
    m.update(0.25);
    assert.notEqual(s.miningGrid.blocks, oldBlocks);
    assert.equal(m.descending, false);
    assert.equal(s.miningGrid.depth, 2);
    assert.equal(s.miningGrid.blocks[0].maxHp, m.getTileHp(2));
    const fresh = s.miningGrid.blocks;
    m.update(1);
    assert.equal(s.miningGrid.blocks, fresh, 'grid must not regenerate twice');

    // B: explosives deal EXPLOSIVE_HITS pickaxe hits instead of revealing outright. Before
    // the fix Dynamite found the stairs every ~60-100 s at any HP: 6 h of it reached
    // depth ~245 (HP 2.6e15 vs power 1.3e5) and drills/clicks could never break a tile.
    s.miningGrid.depth = 60;
    m.generateNewGrid();
    const power = m.getPickaxePower();
    assert.ok(m.getTileHp() > power * EXPLOSIVE_HITS);
    assert.equal(m.useDynamite(), true);
    assert.equal(s.miningGrid.depth, 60, 'dynamite must not descend past the pickaxe');
    const hit = s.miningGrid.blocks.filter(b => b.hp < b.maxHp);
    assert.ok(hit.length >= 4 && hit.length <= 9);
    for (const b of hit) assert.equal(b.maxHp - b.hp, power * EXPLOSIVE_HITS);
    assert.equal(m.useDynamite(), false); // cooldown
    // shallow tiles still shatter
    s.miningGrid.depth = 1;
    m.generateNewGrid();
    m.dynamiteCooldown = 0;
    m.useDynamite();
    assert.ok(s.miningGrid.blocks.filter(b => b.revealed).length >= 1);

    // C: schema 2 -> 3 rebase. A stranded save moves up; a healthy one is untouched.
    const stranded = new GameState();
    stranded.miningGrid = { schema: 2, depth: 245, maxDepth: 245, pickaxeTier: 17, autoDrills: 35,
      blocks: [{ id: 0, content: 'stone', revealed: false, hp: 1, maxHp: 1 }] };
    const m3 = new MiningSystem(stranded);
    assert.equal(stranded.miningGrid.schema, MINING_SCHEMA);
    assert.equal(stranded.miningGrid.maxDepth, 245);
    assert.ok(stranded.miningGrid.depth < 245 && m3.getTileSeconds() <= 3600);
    assert.equal(stranded.miningGrid.blocks.length, 36);
    const healthy = new GameState();
    const hm = new MiningSystem(healthy);
    healthy.miningGrid.schema = 2;
    healthy.miningGrid.depth = 61;
    healthy.miningGrid.maxDepth = 61;
    healthy.miningGrid.pickaxeTier = 4;
    healthy.miningGrid.autoDrills = 9;
    const keep = healthy.miningGrid.blocks;
    hm.update(0.05);
    assert.equal(healthy.miningGrid.schema, MINING_SCHEMA);
    assert.equal(healthy.miningGrid.depth, 61);
    assert.equal(healthy.miningGrid.blocks, keep, 'a playable schema-2 grid keeps its progress');
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }
}

console.log('--- R18: Strata Relics ---');
{
  const g = new GameState();
  const m = new MiningSystem(g);
  assert.equal(STRATA_RELICS.length, 7);
  assert.deepEqual(g.miningGrid.relics, {});
  assert.equal(g.miningGrid.relicPity, 0);
  assert.equal(RELIC_CHANCE, 1 / 200);
  assert.equal(RELIC_PITY, 400);

  // A lucky roll (< 1/200) finds the current stratum's relic and resets the pity counter
  m.random = () => 0.001;
  const found = m.rollRelic();
  assert.equal(found.id, STRATA_RELICS[0].id);
  assert.ok(m.hasRelic(0));
  assert.equal(g.miningGrid.relicPity, 0);
  assert.equal(m.getRelicCount(), 1);

  // Stratum 0 done and nothing missing above it: no roll, pity doesn't grow
  assert.equal(m.getRelicTarget(), -1);
  m.random = () => 0;
  assert.equal(m.rollRelic(), null);
  assert.equal(g.miningGrid.relicPity, 0);

  // Pity: 399 unlucky tiles find nothing, the 400th always does
  g.miningGrid.depth = 30; // Granite
  m.random = () => 0.999;
  for (let i = 0; i < RELIC_PITY - 1; i++) assert.equal(m.rollRelic(), null);
  assert.equal(g.miningGrid.relicPity, RELIC_PITY - 1);
  assert.equal(m.rollRelic().id, STRATA_RELICS[1].id);
  assert.equal(g.miningGrid.relicPity, 0);

  // Deep save: the current stratum's relic first, then the shallowest missing one above it
  g.miningGrid.depth = 110; // Aetherite (index 4)
  assert.equal(m.getRelicTarget(), 4);
  m.random = () => 0;
  m.rollRelic();
  assert.ok(m.hasRelic(4));
  assert.equal(m.getRelicTarget(), 2);
  m.rollRelic();
  m.rollRelic();
  assert.ok(m.hasRelic(2) && m.hasRelic(3));
  assert.equal(m.getRelicTarget(), -1, 'deeper relics (Starcore, Abyssal) need you there');
  assert.ok(!m.hasRelic(5) && !m.hasRelic(6));

  // Every broken tile rolls (through revealReward), stairs included
  g.miningGrid.depth = 130; // Starcore (index 5)
  m.random = () => 0;
  m.revealReward({ content: 'stairs' });
  assert.ok(m.hasRelic(5), 'stairs tile rolled for the Starcore relic');
  m.descending = false;

  // +5% pickaxe per relic (6 found here)
  assert.equal(m.getRelicCount(), 6);
  g.miningGrid.pickaxeTier = 10; // 1024
  g.stats.totalBossesSlain = 0;
  assert.equal(m.getPickaxePower(), Math.floor(1024 * 1.30));
  g.miningGrid.pickaxeTier = 0;

  // Relic state is saved with the mining slice and survives a reload; a pre-R18 grid
  // (no relic fields) gets defaults
  const s2 = new GameState();
  s2.deserialize(JSON.parse(JSON.stringify(g.serialize())));
  const m2 = new MiningSystem(s2);
  assert.equal(m2.getRelicCount(), 6);
  const old = new GameState();
  old.miningGrid = { schema: MINING_SCHEMA, depth: 40, maxDepth: 40, pickaxeTier: 3, autoDrills: 2, dynamiteCooldown: 0,
    blocks: Array.from({ length: 36 }, (_, i) => ({ id: i, content: i === 5 ? 'stairs' : 'stone', revealed: false, hp: 10, maxHp: 10 })) };
  const mo = new MiningSystem(old);
  assert.deepEqual(old.miningGrid.relics, {});
  assert.equal(old.miningGrid.relicPity, 0);
  assert.equal(mo.getRelicCount(), 0);
  // A corrupted relic slice is reset rather than crashing
  old.miningGrid.relics = 'garbage';
  old.miningGrid.relicPity = NaN;
  assert.equal(mo.getRelicCount(), 0);
  assert.equal(old.miningGrid.relicPity, 0);
}

console.log('--- R18: Aether Ore ---');
{
  const g = new GameState();
  const m = new MiningSystem(g);
  assert.equal(AETHER_ORE_CHANCE, 0.10);
  const stoneTile = () => ({ id: 0, content: 'stone', revealed: true, hp: 0, maxHp: 1 });
  // Relic roll first (0.999: miss), then the ore roll
  let seq = [0.999, 0.05];
  m.random = () => seq.shift() ?? 0.999;
  // No Bazaar state yet: ore waits in the inventory
  m.revealReward(stoneTile());
  assert.equal(g.inventory.aetherOre, 1);
  assert.equal(g.miningGrid.oreFound, 1);
  // Bazaar exists: the waiting ore and the new one go to market.items.ore
  new MarketSystem(g);
  const before = g.market.items.ore.owned;
  seq = [0.999, 0.09];
  m.revealReward(stoneTile());
  assert.equal(g.market.items.ore.owned, before + 2);
  assert.equal(g.inventory.aetherOre, 0);
  // 0.10 and above: no ore; gems never drop ore
  seq = [0.999, 0.10];
  m.revealReward(stoneTile());
  seq = [0.999, 0];
  m.revealReward({ id: 1, content: 'ruby', revealed: true, hp: 0, maxHp: 1 });
  assert.equal(g.market.items.ore.owned, before + 2);
  assert.equal(g.miningGrid.oreFound, 2);

  // Rate: ~10% of stone tiles over many seeded tiles
  let a = 7;
  m.random = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
  const start = g.miningGrid.oreFound;
  for (let i = 0; i < 20000; i++) m.revealReward(stoneTile());
  const rate = (g.miningGrid.oreFound - start) / 20000;
  assert.ok(rate > 0.09 && rate < 0.11, `ore rate ${rate}`);
}

console.log('--- R18: Gem Polishing ---');
{
  const g = new GameState();
  const al = new AlchemySystem(g);
  assert.deepEqual(GEM_LADDER, ['rubies', 'sapphires', 'emeralds', 'diamonds', 'voidAmethyst']);
  assert.equal(POLISH_RATIO, 5);
  g.inventory.rubies = 12;
  assert.equal(al.getMaxPolish('rubies'), 2);
  assert.equal(al.polishGem('rubies'), 1);
  assert.equal(g.inventory.rubies, 7);
  assert.equal(g.inventory.sapphires, 1);
  assert.equal(al.polishGem('rubies', 2), 0, 'not enough for 2');
  assert.equal(g.inventory.rubies, 7);
  assert.equal(al.polishGem('rubies', 'max'), 1);
  assert.equal(g.inventory.rubies, 2);
  assert.equal(al.polishGem('rubies', 'max'), 0);
  // Top tier and unknown keys can't be polished
  g.inventory.voidAmethyst = 50;
  assert.equal(al.getPolishTarget('voidAmethyst'), null);
  assert.equal(al.polishGem('voidAmethyst', 'max'), 0);
  assert.equal(al.polishGem('stone', 1), 0);
  assert.equal(al.polishGem('rubies', -3), 0);
  // 625 rubies = 1 Void Amethyst, all the way up the ladder
  const h = new GameState();
  const ah = new AlchemySystem(h);
  h.inventory.rubies = 625;
  for (const k of GEM_LADDER.slice(0, -1)) ah.polishGem(k, 'max');
  assert.equal(h.inventory.voidAmethyst, 1);
  assert.equal(h.inventory.rubies + h.inventory.sapphires + h.inventory.emeralds + h.inventory.diamonds, 0);
  assert.equal(h.alchemy.gemsPolished, 125 + 25 + 5 + 1);
}

console.log('--- Excavation Abilities, Workshop & Machinery ---');
{
  const g = new GameState();
  const m = new MiningSystem(g);

  // Skill costs and upgrades
  assert.equal(m.getShatterChance(), 0.02);
  assert.equal(m.getChainChance(), 0.05);
  assert.equal(m.getCleaveChance(), 0.10);
  assert.equal(m.getFrenzyDuration(), 6.0);

  g.inventory.stone = 50000;
  assert.equal(m.upgradeSkill('shatter'), true);
  assert.equal(g.miningGrid.skills.shatter, 1);
  assert.equal(m.getShatterChance(), 0.03);

  assert.equal(m.upgradeSkill('chain'), true);
  assert.equal(m.getChainChance(), 0.075);

  assert.equal(m.upgradeSkill('cleave'), true);
  assert.equal(m.getCleaveChance(), 0.135);

  assert.equal(m.upgradeSkill('frenzy'), true);
  assert.equal(m.getFrenzyDuration(), 7.0);

  // Steam Jackhammer purchase & targeting
  g.inventory.rubies = 10;
  assert.equal(m.buySteamDrill(), true);
  assert.equal(g.miningGrid.steamDrills, 1);
  assert.equal(g.inventory.rubies, 7);

  // Seismic Pulverizer purchase
  g.inventory.sapphires = 10;
  assert.equal(m.buySeismicRig(), true);
  assert.equal(g.miningGrid.seismicRigs, 1);
  assert.equal(g.inventory.sapphires, 6);

  // Shatter is x10 damage on tile HP, never an instant break (R58)
  m.generateNewGrid();
  m.descending = false;
  const testTile = g.miningGrid.blocks[0];
  testTile.content = 'stone';
  testTile.hp = 1e12;
  testTile.maxHp = 1e12;
  const shatterPower = m.getPickaxePower();
  m.random = () => 0.001; // passes the shatter check (chance >= 0.02)
  m.mineBlock(0, 100, 100);
  assert.equal(testTile.revealed, false, 'Shatter must not break a tile outright');
  assert.ok(testTile.maxHp - testTile.hp >= shatterPower * SHATTER_DAMAGE_MULT, 'Shatter deals x10 pickaxe damage');
  // a tile with HP below the hit still breaks, through damage
  const weakTile = g.miningGrid.blocks[2];
  weakTile.content = 'stone';
  weakTile.hp = 1;
  weakTile.maxHp = 1;
  m.mineBlock(2, 100, 100);
  assert.equal(weakTile.revealed, true);
  // the same random roll with Shatter off (level 0 chance 2%, roll 0.5) does less damage
  testTile.hp = 1e12;
  m.random = () => 0.5;
  m.mineBlock(0, 100, 100);
  assert.ok(testTile.maxHp - testTile.hp < shatterPower * SHATTER_DAMAGE_MULT);

  // Manual Dig Streak activates Frenzy
  m.frenzyTimer = 0;
  m.digStreak = 0;
  for (let i = 0; i < 7; i++) {
    m.random = () => 0.999; // no shatter, chain, or cleave
    const t = g.miningGrid.blocks[1];
    t.content = 'stone';
    t.hp = 99999;
    t.maxHp = 99999;
    m.mineBlock(1, 100, 100);
  }
  assert.ok(m.isFrenzyActive(), 'Frenzy should be active after 7 rapid manual hits');
  assert.ok(m.frenzyTimer > 0);

  // Hidden bomb detonation
  m.generateNewGrid();
  m.descending = false;
  g.miningGrid.blocks.forEach(b => { b.content = 'stone'; b.revealed = false; b.hp = 500; b.maxHp = 500; });
  const bombTile = g.miningGrid.blocks[7]; // row 1, col 1
  bombTile.content = 'bomb';
  bombTile.revealed = true;
  const nTile = g.miningGrid.blocks[8];
  m.revealReward(bombTile, 100, 100);
  // Bomb should have blasted 3x3 tiles, damaging or breaking nTile
  assert.ok(nTile.hp < 500 || nTile.revealed, 'Bomb should damage neighbor blocks');
}

console.log('✅ MINING TESTS PASSED');
setTimeout(() => process.exit(0), 0);

