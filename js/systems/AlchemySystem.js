import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { particles } from '../engine/ParticleEngine.js';

export const RECIPES = [
  // Timed Elixirs
  {
    id: 'swiftness',
    name: 'Elixir of Swiftness',
    type: 'buff',
    buffType: 'click_mult',
    buffValue: 2.0,
    duration: 60,
    desc: '+100% Click Yield for 60s',
    cost: { sporePowder: 2, rubies: 1 }
  },
  {
    id: 'titans_draught',
    name: "Titan's Draught",
    type: 'buff',
    buffType: 'hero_atk',
    buffValue: 2.5,
    duration: 90,
    desc: '+150% Combat Attack Power for 90s',
    cost: { monsterBones: 2, sapphires: 1 }
  },
  {
    id: 'aether_surge',
    name: 'Aetherial Philter',
    type: 'buff',
    buffType: 'aether_mult',
    buffValue: 3.0,
    duration: 60,
    desc: '+200% Global Aether Production for 60s',
    cost: { manaSap: 2, emeralds: 1 }
  },
  {
    id: 'midas_elixir',
    name: 'Midas Elixir',
    type: 'buff',
    buffType: 'gold_mult',
    buffValue: 4.0,
    duration: 60,
    desc: '+300% Gold Generation for 60s',
    cost: { solarDew: 2, diamonds: 1 }
  },
  // Permanent Enhancements
  {
    id: 'perm_might',
    name: 'Nectar of Eternal Might',
    type: 'permanent',
    desc: '+15 Permanent Hero Attack',
    cost: { voidCores: 2, cryoEssence: 2 }
  },
  {
    id: 'perm_vitality',
    name: 'Elixir of Immortal Life',
    type: 'permanent',
    desc: '+60 Permanent Hero Max HP',
    cost: { bossTokens: 1, voidPollen: 2 }
  },
  {
    id: 'philosophers_catalyst',
    name: "Philosopher's Catalyst",
    type: 'permanent',
    desc: '+2% Permanent Global Multiplier',
    cost: { voidAmethyst: 1, starNectar: 1 }
  }
];

export class AlchemySystem {
  constructor(gameState) {
    this.gameState = gameState;
  }

  canBrew(recipeId) {
    const r = RECIPES.find(item => item.id === recipeId);
    if (!r) return false;

    const inv = this.gameState.inventory;
    const ess = this.gameState.garden?.essences || {};

    for (const [mat, amount] of Object.entries(r.cost)) {
      const available = inv[mat] ?? ess[mat] ?? 0;
      if (available < amount) return false;
    }
    return true;
  }

  brew(recipeId) {
    if (!this.canBrew(recipeId)) return false;

    const r = RECIPES.find(item => item.id === recipeId);
    const inv = this.gameState.inventory;
    const ess = this.gameState.garden?.essences || {};

    // Deduct costs
    for (const [mat, amount] of Object.entries(r.cost)) {
      if (inv[mat] !== undefined) inv[mat] -= amount;
      else if (ess[mat] !== undefined) ess[mat] -= amount;
    }

    sound.playSpell();
    this.gameState.stats.totalPotionsBrewed++;

    if (r.type === 'buff') {
      // Add or extend active buff
      const existing = this.gameState.activeBuffs.find(b => b.id === r.id);
      if (existing) {
        existing.duration += r.duration;
      } else {
        this.gameState.activeBuffs.push({
          id: r.id,
          name: r.name,
          type: r.buffType,
          value: r.buffValue,
          duration: r.duration,
          maxDuration: r.duration
        });
      }
      particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `BREWED: ${r.name}!`, '#a855f7', true);
    } else if (r.type === 'permanent') {
      if (r.id === 'perm_might') {
        this.gameState.hero.baseAttack += 15;
      } else if (r.id === 'perm_vitality') {
        this.gameState.hero.maxHp += 60;
        this.gameState.hero.hp += 60;
      } else if (r.id === 'philosophers_catalyst') {
        this.gameState.stats.globalMultiplier *= 1.02;
      }
      sound.playAchievement();
      particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `PERMANENT BOOST: ${r.name}!`, '#fbbf24', true);
    }

    if (this.gameState.bountySystem) {
      this.gameState.bountySystem.checkProgress('brew_potion', 1);
    }
    return true;
  }

  transmuteStoneToGold() {
    if ((this.gameState.inventory.stone || 0) < 50) return false;
    this.gameState.inventory.stone -= 50;
    const goldGained = new BigNum(500 * Math.pow(1.15, this.gameState.miningGrid?.depth || 1));
    this.gameState.gold = this.gameState.gold.add(goldGained);
    sound.playBuy();
    particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `+${goldGained.format('standard', 0)} GOLD`, '#eab308', true);
    return true;
  }

  transmuteGoldToChrono() {
    const cost = new BigNum(1000);
    if (this.gameState.gold.lt(cost)) return false;
    this.gameState.gold = this.gameState.gold.sub(cost);
    this.gameState.chronoSand = (this.gameState.chronoSand || 0) + 30;
    sound.playSpell();
    particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, '+30 Chrono Sand', '#38bdf8', true);
    return true;
  }

  update(dt) {
    // Process active buffs duration
    for (let i = this.gameState.activeBuffs.length - 1; i >= 0; i--) {
      const buff = this.gameState.activeBuffs[i];
      buff.duration -= dt;
      if (buff.duration <= 0) {
        this.gameState.activeBuffs.splice(i, 1);
      }
    }
  }
}
