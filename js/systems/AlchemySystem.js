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
    desc: '+2% Aether per Catalyst brewed (additive). Cost rises 8% per brew.',
    cost: { voidAmethyst: 1, starNectar: 1 }
  }
];

export class AlchemySystem {
  constructor(gameState) {
    this.gameState = gameState;
  }

  getCatalystCount() {
    return this.gameState.alchemy?.catalysts || 0;
  }

  // Current cost of a recipe. The Catalyst costs ceil(1.08^n) Nectar and Void Amethyst.
  getRecipeCost(recipeOrId) {
    const r = typeof recipeOrId === 'string' ? RECIPES.find(item => item.id === recipeOrId) : recipeOrId;
    if (!r) return {};
    if (r.id === 'philosophers_catalyst') {
      const c = Math.ceil(Math.pow(1.08, this.getCatalystCount()));
      return { voidAmethyst: c, starNectar: c };
    }
    return r.cost;
  }

  canBrew(recipeId) {
    const r = RECIPES.find(item => item.id === recipeId);
    if (!r) return false;

    const inv = this.gameState.inventory;
    const ess = this.gameState.garden?.essences || {};

    for (const [mat, amount] of Object.entries(this.getRecipeCost(r))) {
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
    for (const [mat, amount] of Object.entries(this.getRecipeCost(r))) {
      if (inv[mat] !== undefined) inv[mat] -= amount;
      else if (ess[mat] !== undefined) ess[mat] -= amount;
    }

    sound.playSpell();
    this.gameState.stats.totalPotionsBrewed++;

    if (r.type === 'buff') {
      // Add or extend active buff
      const existing = this.gameState.activeBuffs.find(b => b.id === r.id);
      // Astral Crucible perk doubles durations; Brewmaster Secret adds +25% per rank
      const dur = r.duration * this.gameState.getBuffDurationMult();
      // Extending stops at 10 min x the same duration multipliers
      const cap = this.gameState.getBuffDurationCap();
      if (existing) {
        existing.duration = Math.min(cap, existing.duration + dur);
        existing.maxDuration = Math.min(cap, Math.max(existing.duration, (existing.maxDuration || 0) + dur));
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
        if (!this.gameState.alchemy) this.gameState.alchemy = { catalysts: 0 };
        this.gameState.alchemy.catalysts = this.getCatalystCount() + 1;
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
    // 200 * 1.07^depth as a BigNum pow (Math.pow overflowed to Infinity -> 0 gold at deep depths)
    const goldGained = new BigNum(1.07).pow(this.gameState.miningGrid?.depth || 1).mul(new BigNum(200)).floor();
    this.gameState.gold = this.gameState.gold.add(goldGained);
    sound.playBuy();
    particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `+${goldGained.format('standard', 0)} GOLD`, '#eab308', true);
    return true;
  }

  // Gold per 30 s batch of Chrono Sand: 1,000 x Market Index (~100 kills at your best floor)
  getChronoBatchCost() {
    return this.gameState.getMarketIndex().mul(new BigNum(1000));
  }

  // Batches that still fit in the sand bank; the last one may be partly clipped by the cap
  getChronoBatchRoom() {
    const room = this.gameState.getChronoSandCap() - (this.gameState.chronoSand || 0);
    if (room <= 0) return 0;
    return Math.ceil(room / (30 * this.gameState.getChronoSandGainMult()));
  }

  // How many batches the player can afford right now, limited by the bank cap
  getMaxChronoBatches() {
    const n = this.gameState.gold.div(this.getChronoBatchCost()).floor().toNumber();
    const affordable = Number.isFinite(n) ? Math.max(0, n) : 1e300;
    return Math.min(affordable, this.getChronoBatchRoom());
  }

  // Convert gold to Chrono Sand at 1,000 x M gold -> 30 sand per batch, up to the bank cap.
  // batches: a count, or 'max' to fill the bank.
  transmuteGoldToChrono(batches = 1) {
    const maxBatches = this.getMaxChronoBatches();
    const n = batches === 'max' ? maxBatches : batches;
    if (n < 1 || n > maxBatches) return false;
    this.gameState.gold = this.gameState.gold.sub(this.getChronoBatchCost().mul(new BigNum(n)));
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
