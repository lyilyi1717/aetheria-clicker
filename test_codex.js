// Codex 2.0 (R14): achievement ladder, collections, Generator Codex, old saves, percentage.
// Run: node test_codex.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { BuildingSystem, BUILDING_DEFINITIONS } from './js/systems/BuildingSystem.js';
import { AchievementSystem, ACHIEVEMENTS, LEGACY_BONUS, LADDER_BONUS } from './js/systems/AchievementSystem.js';
import { CollectionSystem, COLLECTIONS, SET_BONUS } from './js/systems/CollectionSystem.js';
import { STRATA_RELICS } from './js/systems/MiningSystem.js';
import { SEED_TYPES, HYBRIDS } from './js/systems/GardenSystem.js';
import { HYBRID_RECIPES } from './js/systems/AlchemySystem.js';
import { WARDEN_NAMES } from './js/systems/CombatSystem.js';
import { rewards } from './js/ui/rewards.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`ok - ${name}`); };
const clone = o => JSON.parse(JSON.stringify(o));

function makeGame() {
  const gs = new GameState();
  gs.buildingSystem = new BuildingSystem(gs);
  gs.achievementSystem = new AchievementSystem(gs);
  gs.collectionSystem = new CollectionSystem(gs);
  return gs;
}

function captureNotices() {
  const log = [];
  const orig = rewards.notify;
  rewards.notify = ev => { log.push(ev); };
  return { log, restore: () => { rewards.notify = orig; } };
}

const LEGACY_IDS = [
  'click_1', 'click_100', 'click_1000', 'click_10000', 'aether_1m', 'aether_1b', 'aether_1t', 'aether_1qa',
  'combat_floor10', 'combat_floor50', 'combat_floor100', 'slay_50', 'slay_10_bosses', 'mine_depth5', 'mine_depth20',
  'mine_100_blocks', 'gem_hoarder', 'harvest_10', 'harvest_50', 'brew_5', 'spells_10', 'ascend_1', 'time_warp', 'bounties_10'
];

test('the 24 original achievements keep their ids and the ladder adds about 64 rungs', () => {
  const ids = ACHIEVEMENTS.map(a => a.id);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  for (const id of LEGACY_IDS) assert.ok(ids.includes(id), id);
  assert.ok(ids.length >= 85 && ids.length <= 95, `ladder size ${ids.length}`);
  for (const a of ACHIEVEMENTS) assert.ok(a.group && a.name && a.desc && a.icon, a.id);
});

test('unlock rules: rungs unlock on their threshold and only then', () => {
  const gs = makeGame();
  gs.totalClicks = 99999;
  gs.achievementSystem.checkAchievements();
  assert.ok(gs.achievements.click_10000);
  assert.ok(!gs.achievements.clicks_r1);
  gs.totalClicks = 100000;
  gs.achievementSystem.checkAchievements();
  assert.ok(gs.achievements.clicks_r1);
  gs.totalAetherEarned = new BigNum(5e10);   // R53 rungs: r4 = 1e10, r5 = 1e11
  gs.transcendenceCount = 5;
  gs.stats.totalBossesSlain = 100;
  gs.hero = { floor: 300, maxFloor: 1200 };
  gs.achievementSystem.checkAchievements();
  assert.ok(gs.achievements.aether_r4 && !gs.achievements.aether_r5);
  assert.ok(gs.achievements.transcend_r3 && !gs.achievements.transcend_r4);
  assert.ok(gs.achievements.bosses_r1 && !gs.achievements.bosses_r2);
  assert.ok(gs.achievements.floor_r3 && !gs.achievements.floor_r4);
});

test('bonus: original achievements 1.5% each, new rungs 0.5% each, sets 1% each', () => {
  const gs = makeGame();
  gs.achievements = { click_1: { unlockedAt: 1 }, clicks_r1: { unlockedAt: 1 }, not_a_real_id: {} };
  assert.equal(gs.achievementSystem.getUnlockedCount(), 2, 'unknown ids are ignored');
  assert.ok(Math.abs(gs.achievementSystem.getAchievementBonus() - (LEGACY_BONUS + LADDER_BONUS)) < 1e-12);
  assert.ok(Math.abs(gs.achievementSystem.getBonusMultiplier() - 1.02) < 1e-12);
  gs.codex.genBest = Object.fromEntries(BUILDING_DEFINITIONS.map(d => [d.id, 100]));
  assert.ok(Math.abs(gs.achievementSystem.getBonusMultiplier() - 1.03) < 1e-12);
});

test('legacy achievement saves still count in full', () => {
  const gs = makeGame();
  gs.achievements = Object.fromEntries(LEGACY_IDS.map(id => [id, { unlockedAt: 1 }]));
  assert.equal(gs.achievementSystem.getUnlockedCount(), 24);
  assert.ok(Math.abs(gs.achievementSystem.getAchievementBonus() - 24 * LEGACY_BONUS) < 1e-12);
});

test('collections derive from existing saved state', () => {
  const gs = makeGame();
  const find = id => gs.collectionSystem.getCollections().find(c => c.id === id);
  assert.equal(find('wardens').have, 0);
  gs.hero = { wardens: { defeated: { 250: true, 500: true, 750: false } } };
  assert.equal(find('wardens').have, 2);
  assert.equal(find('wardens').total, WARDEN_NAMES.length);
  gs.miningGrid = { relics: { [STRATA_RELICS[0].id]: true, [STRATA_RELICS[3].id]: true } };
  assert.equal(find('relics').have, 2);
  gs.garden = { herbarium: { golden: { spore: 2, star_lotus: 1 }, hybrids: { limonana: 3, mintHoney: 0 } } };
  assert.equal(find('golden').have, 2);
  assert.equal(find('golden').total, Object.keys(SEED_TYPES).length);
  assert.equal(find('hybrids').have, 1);
  assert.equal(find('hybrids').total, Object.keys(HYBRIDS).length);
  gs.alchemy = { catalysts: 0, discovered: { [HYBRID_RECIPES[1].id]: true } };
  assert.equal(find('recipes').have, 1);
  assert.equal(find('recipes').total, HYBRID_RECIPES.length);
});

test('set bonus counts completed collections only', () => {
  const gs = makeGame();
  assert.equal(gs.collectionSystem.getSetBonus(), 0);
  gs.miningGrid = { relics: Object.fromEntries(STRATA_RELICS.map(r => [r.id, true])) };
  assert.equal(gs.collectionSystem.getCompletedSetCount(), 1);
  assert.ok(Math.abs(gs.collectionSystem.getSetBonus() - SET_BONUS) < 1e-12);
  assert.ok(COLLECTIONS.length * SET_BONUS <= 0.1, 'whole Codex bonus stays small');
});

test('Generator Codex: best count survives a reset, locked tiers are silhouettes', () => {
  const gs = makeGame();
  assert.equal(gs.collectionSystem.getGeneratorCodex().length, 20);
  gs.buildings.tapper.count = 120;
  gs.collectionSystem.update(0.1);
  gs.buildings.tapper.count = 0; // an Ascension
  gs.collectionSystem.update(0.1);
  const rows = gs.collectionSystem.getGeneratorCodex();
  const tapper = rows.find(r => r.id === 'tapper');
  assert.equal(tapper.best, 120);
  assert.equal(tapper.stars, 1);
  assert.ok(tapper.flavourUnlocked && !tapper.silhouette);
  const last = rows[19];
  assert.ok(last.silhouette && last.tierLocked);
  assert.equal(gs.collectionSystem.getGeneratorCodex().filter(r => !r.silhouette).length, 1);
  gs.buildings.tapper.count = 1000;
  assert.equal(gs.collectionSystem.getGeneratorCodex().find(r => r.id === 'tapper').stars, 3);
});

test('percentage: derived from ladder rungs plus collection entries', () => {
  const gs = makeGame();
  const total = ACHIEVEMENTS.length + COLLECTIONS.reduce((n, c) => n + c.entries(gs).length, 0);
  let p = gs.collectionSystem.getCodexProgress();
  assert.equal(p.total, total);
  assert.equal(p.percent, 0);
  gs.achievements = { click_1: {}, click_100: {} };
  gs.miningGrid = { relics: { [STRATA_RELICS[0].id]: true } };
  p = gs.collectionSystem.getCodexProgress();
  assert.equal(p.have, 3);
  assert.ok(Math.abs(gs.collectionSystem.getCodexPercent() - (3 / total) * 100) < 1e-9);
});

test('old save (no Codex yet, already on the R31 economy): opens with collections and ladder derived, nothing re-awarded', () => {
  const old = {
    version: 8, aether: { m: 1, e: 3 }, totalAetherEarned: { m: 2, e: 25 }, totalClicks: 20000, ascensionCount: 7,
    stats: { totalBossesSlain: 12, totalMonstersSlain: 900 },
    achievements: { click_1: { unlockedAt: 5 } },
    buildings: { tapper: { count: 600 } },
    hero: { floor: 80, maxFloor: 80, wardens: { defeated: { 250: true } } },
    mining: { relics: { [STRATA_RELICS[0].id]: true } },
    garden: { herbarium: { golden: { spore: 1 }, hybrids: {} } }
  };
  const gs = makeGame();
  gs.deserialize(clone(old));
  assert.deepEqual(gs.codex, {}, 'no codex in an old save');
  const note = captureNotices();
  try {
    gs.collectionSystem.update(5); // first evaluation primes silently
    gs.achievementSystem.checkAchievements();
    const colls = gs.collectionSystem.getCollections();
    assert.equal(colls.find(c => c.id === 'wardens').have, 1);
    assert.equal(colls.find(c => c.id === 'relics').have, 1);
    assert.equal(colls.find(c => c.id === 'golden').have, 1);
    assert.equal(gs.collectionSystem.getBest('tapper'), 600);
    assert.ok(gs.achievements.click_1.unlockedAt === 5, 'saved entry untouched');
    assert.ok(gs.achievements.clicks_r1 === undefined && gs.achievements.click_10000);
    assert.ok(gs.achievements.ascend_r1 && gs.achievements.ascend_r2 === undefined, '7 Ascensions = first rung only');
    assert.ok(gs.achievements.aether_r3, 'rungs the save already qualifies for are derived (1e24)');
    assert.equal(note.log.filter(e => e.kind === 'codex-generator' || e.kind === 'codex-set').length, 0, 'no Codex toasts on load');
    // the achievement burst shares one kind so the toast queue folds it into a single toast
    const kinds = new Set(note.log.filter(e => e.kind === 'achievement').map(e => e.kind));
    assert.ok(kinds.size <= 1);
    assert.ok(note.log.every(e => e.batchTitle));
  } finally { note.restore(); }
});

test('announcements: new generator milestone toasts once, completed set is a big notice', () => {
  const gs = makeGame();
  gs.collectionSystem.update(5); // prime
  const note = captureNotices();
  try {
    gs.buildings.tapper.count = 100;
    gs.collectionSystem.update(5);
    gs.collectionSystem.update(5);
    const gen = note.log.filter(e => e.kind === 'codex-generator');
    assert.equal(gen.length, 1);
    assert.equal(gen[0].tier, 'small');
    gs.miningGrid = { relics: Object.fromEntries(STRATA_RELICS.map(r => [r.id, true])) };
    gs.collectionSystem.update(5);
    gs.collectionSystem.update(5);
    const sets = note.log.filter(e => e.kind === 'codex-set');
    assert.equal(sets.length, 1);
    assert.equal(sets[0].tier, 'big');
  } finally { note.restore(); }
});

test('save and load round-trip keeps the Codex state', () => {
  const gs = makeGame();
  gs.buildings.tapper.count = 500;
  gs.collectionSystem.update(5);
  gs.buildings.tapper.count = 0;
  gs.collectionSystem.update(5);
  const data = clone(gs.serialize());
  assert.equal(data.codex.genBest.tapper, 500);
  const gs2 = makeGame();
  gs2.deserialize(data);
  gs2.collectionSystem.update(5);
  assert.equal(gs2.collectionSystem.getBest('tapper'), 500);
  assert.equal(gs2.collectionSystem.getGeneratorCodex().find(r => r.id === 'tapper').stars, 2);
  assert.deepEqual(clone(gs2.serialize().codex), clone(gs.serialize().codex));
});

test('a corrupt codex field is repaired', () => {
  const gs = makeGame();
  gs.deserialize({ codex: { genBest: [], seen: 5, done: null, primed: 'yes' } });
  gs.collectionSystem.update(5);
  assert.equal(typeof gs.codex.genBest, 'object');
  assert.ok(!Array.isArray(gs.codex.genBest));
  assert.equal(gs.codex.primed, true);
});

console.log(`\n${passed} Codex tests passed.`);
