// R53: everything outside the core repriced for the R31 numbers.
// Run: node test_r53_reprice.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { BuildingSystem } from './js/systems/BuildingSystem.js';
import { AchievementSystem, ACHIEVEMENTS } from './js/systems/AchievementSystem.js';
import { CombatSystem, FORGE_BASE_COST, FORGE_COST_GROWTH } from './js/systems/CombatSystem.js';
import { PrestigeSystem, getDustLinkMult, getGeodeAttunementMult, getNectarOfferingMult } from './js/systems/PrestigeSystem.js';
import { getWorldLinkMult, getWorldLinkSum, WORLD_LINK_CAP } from './js/systems/WorldLinks.js';
import { getMasteries, getAetherMasteryTooltip } from './js/tabBonuses.js';
import { rewards } from './js/ui/rewards.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
rewards.notify = () => {};

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`ok - ${name}`); };
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

function makeGame() {
  const gs = new GameState();
  gs.buildingSystem = new BuildingSystem(gs);
  gs.achievementSystem = new AchievementSystem(gs);
  return gs;
}

test('Oil achievements: one goal per decade from 1e5 to 1e16, all within the R31 curve', () => {
  const oil = ACHIEVEMENTS.filter(a => a.group === 'aether');
  assert.equal(oil.length, 12);
  const gs = makeGame();
  const reached = [];
  for (let e = 4; e <= 16; e++) {
    gs.totalAetherEarned = new BigNum(10).pow(e);
    gs.achievements = {};
    gs.achievementSystem.checkAchievements();
    reached.push(oil.filter(a => gs.achievements[a.id]).length);
  }
  // 1e4: none; then exactly one more per decade up to 1e16 (casual layer peaks reach 1e15-1e17)
  assert.deepEqual(reached, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test('earned Oil achievements stay earned (an old save with the 1e72 rung keeps it and its bonus)', () => {
  const gs = makeGame();
  const old = gs.serialize();
  old.achievements = { aether_1qa: { unlockedAt: 1 }, aether_r8: { unlockedAt: 2 } };
  old.totalAetherEarned = { m: 0, e: 0 };
  const gs2 = makeGame();
  gs2.deserialize(JSON.parse(JSON.stringify(old)));
  gs2.achievementSystem.checkAchievements();
  assert.ok(gs2.achievements.aether_r8 && gs2.achievements.aether_1qa);
  near(gs2.achievementSystem.getAchievementBonus(), 0.015 + 0.005, 'bonus');
});

test('Oil Forge: 100 x 1.5^level, paid from Oil', () => {
  const gs = new GameState();
  const cs = new CombatSystem(gs);
  assert.equal(FORGE_BASE_COST, 100);
  assert.equal(FORGE_COST_GROWTH, 1.5);
  near(cs.getAetherForgeCost().toNumber(), 100, 'level 0');
  gs.hero.aetherForgeLevel = 19;
  near(cs.getAetherForgeCost().toNumber() / (100 * Math.pow(1.5, 19)), 1, 'level 19');
  gs.hero.aetherForgeLevel = 0;
  gs.aether = new BigNum(150);
  assert.ok(cs.upgradeAetherForge());
  assert.equal(gs.hero.aetherForgeLevel, 1);
  near(gs.aether.toNumber(), 50, 'Oil left');
});

test('subgame -> Oil links add into one category, capped at +150%', () => {
  const gs = makeGame();
  near(getWorldLinkMult(gs), 1, 'nothing yet');
  gs.miningGrid = { ...(gs.miningGrid || {}), maxDepth: 100 };       // +20%
  gs.quartermaster = { aether_treaty: { rank: 10 } };                 // +20%
  gs.market = { ...(gs.market || {}), goldenSynergy: 50 };            // +20%
  gs.alchemy = { ...(gs.alchemy || {}), catalysts: 50 };              // +10%
  gs.stats.totalBossesSlain = 100;                                    // +10%
  near(getWorldLinkSum(gs), 0.8, 'sum');
  near(getWorldLinkMult(gs), 1.8, 'added, not multiplied');
  gs.quartermaster.aether_treaty.rank = 50;                           // +100%
  gs.miningGrid.maxDepth = 400;                                       // +80%
  near(getWorldLinkMult(gs), 1 + WORLD_LINK_CAP, 'capped');
  assert.equal(WORLD_LINK_CAP, 1.5);
});

test('production applies the links once, as one multiplier', () => {
  const gs = makeGame();
  gs.buildings.tapper.count = 10;
  const base = gs.getNetAetherPerSecond().toNumber();
  assert.ok(base > 0);
  gs.miningGrid = { ...(gs.miningGrid || {}), maxDepth: 100 };
  gs.quartermaster = { aether_treaty: { rank: 10 } };
  near(gs.getNetAetherPerSecond().toNumber() / base, 1.4, 'x(1 + 0.2 + 0.2)');
});

test('dust links: Geode +2% per 10 depth, Nectar up to +20%, added together', () => {
  const gs = makeGame();
  gs.miningGrid = { ...(gs.miningGrid || {}), maxDepth: 105 };
  near(getGeodeAttunementMult(gs), 1.2, 'geode');
  gs.garden = { essences: { starNectar: 2500 } };
  near(getNectarOfferingMult(gs), 1.2, 'nectar at its cap');
  gs.garden.essences.starNectar = 1e6;
  near(getNectarOfferingMult(gs), 1.2, 'nectar stays capped');
  near(getDustLinkMult(gs), 1.4, 'added');
  const ps = new PrestigeSystem(gs);
  gs.totalAetherEarned = new BigNum(1e9);                             // base dust 10 x 1e5^(1/5) = 100
  assert.equal(ps.getBaseCosmicDust().toNumber(), 100);
  assert.equal(ps.getPendingCosmicDust().toNumber(), 140);
});

test('mastery readout shows the links as +N% and the capped total', () => {
  const gs = makeGame();
  gs.miningGrid = { ...(gs.miningGrid || {}), maxDepth: 100 };
  gs.quartermaster = { aether_treaty: { rank: 10 } };
  const oil = getMasteries(gs).filter(m => m.oil);
  assert.ok(oil.some(m => m.id === 'treaty'), 'the Treaty is listed with the other Oil links');
  assert.ok(oil.every(m => m.add));
  const tip = getAetherMasteryTooltip(gs);
  assert.match(tip, /×1\.40/);
  assert.match(tip, /×2\.50/);
  assert.match(tip, /\+20% /);
});

console.log(`\nR53 reprice: ${passed} tests passed.`);
