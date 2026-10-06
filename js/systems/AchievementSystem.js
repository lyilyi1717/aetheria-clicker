import { BigNum } from '../engine/BigNum.js';
import { rewards } from '../ui/rewards.js';

const LEGACY_ACHIEVEMENTS = [
  // Clicks
  { id: 'click_1', name: 'First Sparks', desc: 'Click the Monolith 1 time.', icon: '👆', check: gs => gs.totalClicks >= 1 },
  { id: 'click_100', name: 'Rhythmic Pulse', desc: 'Click the Monolith 100 times.', icon: '⚡', check: gs => gs.totalClicks >= 100 },
  { id: 'click_1000', name: 'Kinetic Dynamo', desc: 'Click the Monolith 1,000 times.', icon: '🔥', check: gs => gs.totalClicks >= 1000 },
  { id: 'click_10000', name: 'Finger of the Gods', desc: 'Click the Monolith 10,000 times.', icon: '👑', check: gs => gs.totalClicks >= 10000 },

  // Aether milestones
  { id: 'aether_1m', name: 'Aether Reservoir', desc: 'Amass 1,000,000 total Aether.', icon: '💎', check: gs => gs.totalAetherEarned.gte(new BigNum(1000000)) },
  { id: 'aether_1b', name: 'Billionaire Mage', desc: 'Amass 1,000,000,000 total Aether.', icon: '🔮', check: gs => gs.totalAetherEarned.gte(new BigNum(1000000000)) },
  { id: 'aether_1t', name: 'Trillionaire Sorcerer', desc: 'Amass 1 Trillion total Aether.', icon: '🌌', check: gs => gs.totalAetherEarned.gte(new BigNum(1000000000000)) },
  { id: 'aether_1qa', name: 'Galactic Overlord', desc: 'Amass 1 Quadrillion total Aether.', icon: '🌀', check: gs => gs.totalAetherEarned.gte(new BigNum(1000000000000000)) },

  // Combat
  { id: 'combat_floor10', name: 'Dungeon Delver', desc: 'Conquer Floor 10 in the Void Tower.', icon: '🗡️', check: gs => gs.hero?.floor >= 10 },
  { id: 'combat_floor50', name: 'Cavern Champion', desc: 'Conquer Floor 50 in the Void Tower.', icon: '🛡️', check: gs => gs.hero?.floor >= 50 },
  { id: 'combat_floor100', name: 'Catacomb Vanquisher', desc: 'Conquer Floor 100 in the Void Tower.', icon: '⚔️', check: gs => gs.hero?.floor >= 100 },
  { id: 'slay_50', name: 'Monster Hunter', desc: 'Slay 50 dungeon fiends.', icon: '💀', check: gs => gs.stats.totalMonstersSlain >= 50 },
  { id: 'slay_10_bosses', name: 'Bane of Titans', desc: 'Defeat 10 dungeon bosses.', icon: '👹', check: gs => gs.stats.totalBossesSlain >= 10 },

  // Mining
  { id: 'mine_depth5', name: 'Bedrock Pioneer', desc: 'Reach Mining Depth 5.', icon: '⛏️', check: gs => gs.miningGrid?.depth >= 5 },
  { id: 'mine_depth20', name: 'Deep Mantle', desc: 'Reach Mining Depth 20.', icon: '🌋', check: gs => gs.miningGrid?.depth >= 20 },
  { id: 'mine_100_blocks', name: 'Quarry Master', desc: 'Excavate 100 underground blocks.', icon: '🧱', check: gs => gs.stats.totalBlocksMined >= 100 },
  { id: 'gem_hoarder', name: 'Gem Hoarder', desc: 'Possess at least 1 Ruby, Sapphire, and Emerald.', icon: '💍', check: gs => (gs.inventory.rubies > 0 && gs.inventory.sapphires > 0 && gs.inventory.emeralds > 0) },

  // Garden
  { id: 'harvest_10', name: 'Green Thumb', desc: 'Harvest 10 botanical plants.', icon: '🌱', check: gs => gs.stats.totalPlantsHarvested >= 10 },
  { id: 'harvest_50', name: 'Master Herbalist', desc: 'Harvest 50 botanical plants.', icon: '🌺', check: gs => gs.stats.totalPlantsHarvested >= 50 },

  // Alchemy & Spells
  { id: 'brew_5', name: 'Novice Alchemist', desc: 'Brew 5 potions or catalysts.', icon: '🧪', check: gs => gs.stats.totalPotionsBrewed >= 5 },
  { id: 'spells_10', name: 'Spellweaver', desc: 'Cast 10 active spells.', icon: '✨', check: gs => gs.stats.totalSpellsCast >= 10 },

  // Prestige & Time
  { id: 'ascend_1', name: 'Cosmic Rebirth', desc: 'Ascend to the stars for the first time.', icon: '🚀', check: gs => gs.ascensionCount >= 1 },
  { id: 'time_warp', name: 'Time Bender', desc: 'Possess at least 300 Chrono Sand.', icon: '⏳', check: gs => gs.chronoSand >= 300 },
  { id: 'bounties_10', name: 'Guild Veteran', desc: 'Complete 10 guild contracts.', icon: '📜', check: gs => gs.stats.totalBountiesCompleted >= 10 }
];


// --- Achievement ladder (R14, redesign 5.3) ---
// The 24 achievements above keep their ids and their +1.5% Aether each (every shipped save
// counts them as before). The ladder adds one rung per x10 (or so) on every lifetime stat, 64 in
// all, at +0.5% Aether each. All are derived from saved state, so a save made before R14 earns
// the rungs it already qualifies for the first time the game checks.
export const LEGACY_BONUS = 0.015;
export const LADDER_BONUS = 0.005;

const big = (n) => new BigNum(n);
const f = (n) => (n >= 1e12 ? n.toExponential().replace('e+', 'e') : n.toLocaleString('en-US'));

// stat: id prefix; get(gs) -> number; unit: sentence tail; rungs: [threshold, name, icon]
const LADDER_STATS = [
  { stat: 'clicks', get: gs => gs.totalClicks || 0, desc: n => `Click the Monolith ${f(n)} times.`, rungs: [
    [1e5, 'Tireless Tapper', '👆'], [1e6, 'Million-Touch Monk', '🖐️'], [1e7, 'Hand of Creation', '🤲'], [1e8, 'The Unblinking Finger', '☝️']] },
  { stat: 'aether', big: true, get: gs => gs.totalAetherEarned, desc: n => `Amass ${f(n)} total Aether.`, rungs: [
    [1e18, 'Quintillion Quill', '📈'], [1e21, 'Sextillion Seer', '🔭'], [1e24, 'Septillion Sage', '🪐'], [1e30, 'Nonillion Nomad', '🌠'],
    [1e36, 'Undecillion Usher', '☄️'], [1e48, 'Quindecillion Keeper', '🌑'], [1e60, 'Vigintillion Vizier', '🌗'], [1e72, 'Beyond Counting', '♾️']] },
  { stat: 'floor', get: gs => Math.max(gs.hero?.maxFloor || 0, gs.hero?.floor || 0), desc: n => `Reach Floor ${f(n)} in the Void Tower.`, rungs: [
    [250, 'Warden Walker', '🚪'], [500, 'Halfway Hero', '🏹'], [1000, 'Thousand-Step Titan', '🏔️'], [2500, 'Spire Strider', '🗼'],
    [5000, 'Skybreaker', '🌩️'], [10000, 'Tower Eternal', '🏛️']] },
  { stat: 'slain', get: gs => gs.stats?.totalMonstersSlain || 0, desc: n => `Slay ${f(n)} dungeon fiends.`, rungs: [
    [500, 'Fiend Bane', '🗡️'], [5000, 'Horde Breaker', '🪓'], [50000, 'Plague of Blades', '⚔️'], [500000, 'Extinction Event', '☠️']] },
  { stat: 'bosses', get: gs => gs.stats?.totalBossesSlain || 0, desc: n => `Defeat ${f(n)} dungeon bosses.`, rungs: [
    [100, 'Titan Toppler', '👺'], [1000, 'Crown Collector', '👑'], [10000, 'Throne Breaker', '🐉']] },
  { stat: 'depth', get: gs => gs.miningGrid?.depth || 0, desc: n => `Reach Mining Depth ${f(n)}.`, rungs: [
    [50, 'Strata Scout', '🪨'], [100, 'Core Crawler', '🕳️'], [150, 'Abyss Walker', '🌌'], [200, 'Heart of the World', '💠']] },
  { stat: 'blocks', get: gs => gs.stats?.totalBlocksMined || 0, desc: n => `Excavate ${f(n)} underground blocks.`, rungs: [
    [1000, 'Rubble Maker', '⛏️'], [10000, 'Mountain Mover', '🏗️'], [100000, 'Earthshaper', '🌍'], [1e6, 'Bedrock Breaker', '💥']] },
  { stat: 'harvest', get: gs => gs.stats?.totalPlantsHarvested || 0, desc: n => `Harvest ${f(n)} botanical plants.`, rungs: [
    [250, 'Oasis Keeper', '🌾'], [1000, 'Orchard Lord', '🍃'], [5000, 'Garden Sovereign', '🌳'], [25000, 'The Evergreen', '🍀']] },
  { stat: 'brew', get: gs => gs.stats?.totalPotionsBrewed || 0, desc: n => `Brew ${f(n)} potions or catalysts.`, rungs: [
    [25, 'Apothecary', '⚗️'], [100, 'Elixir Artisan', '🍶'], [500, 'Grand Alchemist', '🫗'], [2500, 'Philosopher Prime', '🧿']] },
  { stat: 'spells', get: gs => gs.stats?.totalSpellsCast || 0, desc: n => `Cast ${f(n)} active spells.`, rungs: [
    [100, 'Incantor', '📖'], [1000, 'Archmage', '🪄'], [10000, 'Weaver of Worlds', '🔯']] },
  { stat: 'ascend', get: gs => gs.ascensionCount || 0, desc: n => `Ascend ${f(n)} times.`, rungs: [
    [5, 'Star Climber', '🌟'], [10, 'Constellation Maker', '⭐'], [25, 'Dust Magnate', '🌌'], [50, 'Cycle Master', '🔄'], [100, 'Hundredfold Rebirth', '🎆']] },
  { stat: 'transcend', get: gs => gs.transcendenceCount || 0, desc: n => `Transcend ${f(n)} ${n === 1 ? 'time' : 'times'}.`, rungs: [
    [1, 'Beyond the Veil', '🪽'], [2, 'Twice Risen', '🕊️'], [5, 'Fifth Ladder', '🪜'], [10, 'Tenfold Ascendant', '🔱'],
    [20, 'Cosmic Cartographer', '🧭'], [32, 'Eternity Walker', '🏺']] },
  { stat: 'bounties', get: gs => gs.stats?.totalBountiesCompleted || 0, desc: n => `Complete ${f(n)} guild contracts.`, rungs: [
    [50, 'Guild Regular', '📋'], [250, 'Contract Captain', '🖋️'], [1000, 'Guildmaster', '🏅'], [5000, 'Voice of the Souq', '📣']] },
  { stat: 'generators', get: lifetimeGenerators, desc: n => `Own ${f(n)} generators in total (best count, across resets).`, rungs: [
    [100, 'Foreman', '🏭'], [500, 'Industrialist', '⚙️'], [1000, 'Machine Baron', '🛠️'], [5000, 'Empire of Engines', '🏙️'], [10000, 'The Whole Desert Hums', '🌐']] },
  { stat: 'playtime', get: gs => (gs.stats?.totalPlayTimeSeconds || 0) / 3600, desc: n => `Play for ${f(n)} ${n === 1 ? 'hour' : 'hours'}.`, rungs: [
    [1, 'First Hour', '🕐'], [10, 'Settled In', '🕙'], [100, 'Long Haul', '📅'], [1000, 'Year Round', '🗓️']] }
];

// Best generator count per tier across resets (codex.genBest, kept by CollectionSystem), or what
// is owned right now if that is higher (a game with no CollectionSystem, e.g. the sim)
function lifetimeGenerators(gs) {
  const best = gs.codex?.genBest || {};
  let total = 0;
  for (const id in gs.buildings || {}) total += Math.max(Number(best[id]) || 0, gs.buildings[id].count || 0);
  return total;
}

const LADDER_ACHIEVEMENTS = LADDER_STATS.flatMap(({ stat, get, desc, rungs, big: isBig }) =>
  rungs.map(([n, name, icon], i) => ({
    id: `${stat}_r${i + 1}`, name, desc: desc(n), icon, ladder: stat, rung: i + 1, bonus: LADDER_BONUS,
    check: isBig ? gs => gs.totalAetherEarned.gte(big(n)) : gs => get(gs) >= n
  })));

// Codex ladder sections, in display order; the original achievements are filed under them
export const LADDER_GROUPS = [
  ['clicks', 'Clicks'], ['aether', 'Aether'], ['playtime', 'Time played'], ['generators', 'Generators'],
  ['ascend', 'Ascensions'], ['transcend', 'Transcendence'], ['floor', 'Void Tower floors'],
  ['slain', 'Monsters slain'], ['bosses', 'Bosses defeated'], ['depth', 'Mining depth'],
  ['blocks', 'Blocks excavated'], ['harvest', 'Plants harvested'], ['brew', 'Potions brewed'],
  ['spells', 'Spells cast'], ['bounties', 'Guild contracts'], ['misc', 'Other milestones']
].map(([id, label]) => ({ id, label }));

function legacyGroup(id) {
  if (id.startsWith('click_')) return 'clicks';
  if (id.startsWith('aether_')) return 'aether';
  if (id.startsWith('combat_floor')) return 'floor';
  if (id === 'slay_50') return 'slain';
  if (id === 'slay_10_bosses') return 'bosses';
  if (id.startsWith('mine_depth')) return 'depth';
  if (id === 'mine_100_blocks') return 'blocks';
  if (id.startsWith('harvest_')) return 'harvest';
  if (id === 'brew_5') return 'brew';
  if (id === 'spells_10') return 'spells';
  if (id === 'ascend_1') return 'ascend';
  if (id === 'bounties_10') return 'bounties';
  return 'misc';
}

export const ACHIEVEMENTS = [
  ...LEGACY_ACHIEVEMENTS.map(a => ({ ...a, bonus: LEGACY_BONUS, group: legacyGroup(a.id) })),
  ...LADDER_ACHIEVEMENTS.map(a => ({ ...a, group: a.ladder }))
];
const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map(a => [a.id, a]));

export class AchievementSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.initAchievements();
  }

  initAchievements() {
    if (!this.gameState.achievements) {
      this.gameState.achievements = {};
    }
  }

  checkAchievements() {
    for (const ach of ACHIEVEMENTS) {
      if (!this.gameState.achievements[ach.id]) {
        if (ach.check(this.gameState)) {
          this.unlock(ach);
        }
      }
    }
  }

  unlock(ach) {
    this.gameState.achievements[ach.id] = {
      unlockedAt: Date.now()
    };
    // Medium toast (bell); several at once fold into "N achievements unlocked"
    rewards.notify({
      tier: 'medium', kind: 'achievement', icon: '🏆', color: '#fbbf24',
      title: `Achievement: ${ach.name}`, batchTitle: '{n} achievements unlocked'
    });
  }

  // Saved entries for ids this build does not know (e.g. a save from a newer build) are ignored
  getUnlockedCount() {
    const saved = this.gameState.achievements || {};
    let n = 0;
    for (const id in saved) if (ACHIEVEMENT_BY_ID.has(id)) n++;
    return n;
  }

  // Additive Aether bonus from the ladder: 1.5% per original achievement, 0.5% per new rung
  getAchievementBonus() {
    const saved = this.gameState.achievements || {};
    let bonus = 0;
    for (const id in saved) bonus += ACHIEVEMENT_BY_ID.get(id)?.bonus || 0;
    return bonus;
  }

  // Multiplier used by GameState.getNetAetherPerSecond (achievements, then collection sets)
  getBonusMultiplier() {
    return 1 + this.getAchievementBonus() + (this.gameState.collectionSystem?.getSetBonus() || 0);
  }
}
