import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { particles } from '../engine/ParticleEngine.js';

export const ACHIEVEMENTS = [
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
    sound.playAchievement();
    particles.spawnFloatingText(window.innerWidth / 2, 80, `🏆 ACHIEVEMENT UNLOCKED: ${ach.name}!`, '#fbbf24', true);
  }

  getUnlockedCount() {
    return Object.keys(this.gameState.achievements || {}).length;
  }
}
