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
      // Astral Crucible perk doubles durations; Brewmaster Secret adds +25% per rank
      let dur = r.duration * (this.gameState.ascensionPerks?.astral_alchemist?.rank > 0 ? 2 : 1);
      dur *= 1 + (this.gameState.talents?.catalyst_potency?.rank || 0) * 0.25;
      if (existing) {
        existing.duration += dur;
        existing.maxDuration = (existing.maxDuration || 0) + dur;
      } else {
        this.gameState.activeBuffs.push({
          id: r.id,
          name: r.name,
          type: r.buffType,
          value: r.buffValue,
          duration: dur,
          maxDuration: dur
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

  // How many 1,000-gold batches the player can afford right now
  getMaxChronoBatches() {
    const n = this.gameState.gold.div(new BigNum(1000)).floor().toNumber();
    return Number.isFinite(n) ? Math.max(0, n) : 1e300;
  }

  // Convert gold to Chrono Sand at 1,000 gold -> 30 sand per batch.
  // batches: a count, or 'max' to convert all gold.
  transmuteGoldToChrono(batches = 1) {
    const maxBatches = this.getMaxChronoBatches();
    const n = batches === 'max' ? maxBatches : batches;
    if (n < 1 || n > maxBatches) return false;
    this.gameState.gold = this.gameState.gold.sub(new BigNum(1000).mul(new BigNum(n)));
    const gained = this.gameState.addChronoSand(30 * n);
    sound.playSpell();
    particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `+${new BigNum(gained).format('standard', 2)} Chrono Sand`, '#38bdf8', true);
    return true;
  }

  update(dt, realDt = dt) {
    // Buff durations run on real time so Chrono Warp doesn't burn them (or itself) 5x faster
    for (let i = this.gameState.activeBuffs.length - 1; i >= 0; i--) {
      const buff = this.gameState.activeBuffs[i];
      buff.duration -= realDt;
      if (buff.duration <= 0) {
        this.gameState.activeBuffs.splice(i, 1);
      }
    }
  }
}
