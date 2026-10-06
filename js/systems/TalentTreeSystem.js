import { sound } from '../engine/AudioEngine.js';
import { rewards } from '../ui/rewards.js';

export const TALENT_DEFINITIONS = [
  // Way of the Clicker
  { id: 'click_power', name: 'Aetherial Strike', branch: 'click', maxRank: 10, desc: '+25% Manual Click Yield per rank' },
  { id: 'crit_mastery', name: 'Precision Focus', branch: 'click', maxRank: 5, desc: '+3% Crit Chance & +0.5x Crit Mult per rank' },
  { id: 'click_synergy', name: 'Resonant Flow', branch: 'click', maxRank: 5, desc: '+2% of passive CPS added to Click Power per rank' },

  // Way of the Architect
  { id: 'building_efficiency', name: 'Master Masonry', branch: 'building', maxRank: 10, desc: '+10% All Generator Output per rank' },
  { id: 'cost_reduction', name: 'Architect Blueprint', branch: 'building', maxRank: 5, desc: '-4% Building Purchase Costs per rank' },
  { id: 'synergy_resonance', name: 'Harmonic Array', branch: 'building', maxRank: 5, desc: '+15% Milestone Multipliers per rank' },

  // Way of the Warlord
  { id: 'warlord_might', name: 'Gladiator Vigour', branch: 'combat', maxRank: 10, desc: '+20% Combat Damage per rank' },
  { id: 'dungeon_wealth', name: 'Plunderer Greed', branch: 'combat', maxRank: 5, desc: '+25% Gold from Monsters per rank' },
  { id: 'loot_fortune', name: 'Fortune Favor', branch: 'combat', maxRank: 5, desc: '+15% Rare Gear Drop Chance per rank' },

  // Way of the Artisan
  { id: 'mining_power', name: 'Seismic Impact', branch: 'artisan', maxRank: 10, desc: '+25% Pickaxe Digging Power per rank' },
  { id: 'botanical_haste', name: 'Verdant Surge', branch: 'artisan', maxRank: 5, desc: '+20% Garden Growth Speed per rank' },
  { id: 'catalyst_potency', name: 'Brewmaster Secret', branch: 'artisan', maxRank: 5, desc: '+25% Potion Duration per rank' },

  // Way of the Chronomancer
  { id: 'mana_flow', name: 'Leyline Conduit', branch: 'chrono', maxRank: 5, desc: '+20 Max Mana & +1.0 Mana Regen per rank' },
  { id: 'offline_transcendence', name: 'Timeless Presence', branch: 'chrono', maxRank: 5, desc: '+25% Offline Efficiency per rank' },
  { id: 'chrono_mastery', name: 'Temporal Siphon', branch: 'chrono', maxRank: 5, desc: '+50% Chrono Sand generation per rank' }
];

export class TalentTreeSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.initTalents();
  }

  initTalents() {
    if (!this.gameState.talents) {
      this.gameState.talents = {};
    }
    for (const def of TALENT_DEFINITIONS) {
      if (!this.gameState.talents[def.id]) {
        this.gameState.talents[def.id] = { rank: 0 };
      }
    }
  }

  upgradeTalent(talentId) {
    const def = TALENT_DEFINITIONS.find(t => t.id === talentId);
    if (!def) return false;

    const currentRank = this.gameState.talents[talentId].rank;
    if (currentRank >= def.maxRank) return false;
    if (this.gameState.talentPoints <= 0) return false;

    this.gameState.talentPoints--;
    this.gameState.spentTalentPoints++;
    this.gameState.talents[talentId].rank++;

    this.applyTalentEffects(talentId);
    rewards.notify({
      tier: 'medium', kind: `talent-${def.id}`, icon: '🌟', color: '#fbbf24',
      title: `${def.name}: rank ${this.gameState.talents[talentId].rank}`,
      batchTitle: `${def.name}: rank ${this.gameState.talents[talentId].rank}`
    });
    return true;
  }

  applyTalentEffects(talentId) {
    const rank = this.gameState.talents[talentId].rank;
    if (talentId === 'crit_mastery') {
      this.gameState.critChance = 0.05 + rank * 0.03;
      this.gameState.critMultiplier = 3.0 + rank * 0.5;
    } else if (talentId === 'mana_flow') {
      this.gameState.maxMana = 100 + rank * 20;
      this.gameState.manaRegen = 2.0 + rank * 1.0;
    } else if (talentId === 'offline_transcendence') {
      this.gameState.stats.offlineEfficiency = 1.0 + rank * 0.25;
    }
  }

  respecTalents() {
    if (this.gameState.spentTalentPoints <= 0) return false;
    this.gameState.talentPoints += this.gameState.spentTalentPoints;
    this.gameState.spentTalentPoints = 0;

    for (const def of TALENT_DEFINITIONS) {
      this.gameState.talents[def.id].rank = 0;
      this.applyTalentEffects(def.id);
    }

    sound.playSpell();
    rewards.notify({ tier: 'small', kind: 'talent-respec', icon: '🔄', color: '#38bdf8', title: 'Talents refunded' });
    return true;
  }
}
