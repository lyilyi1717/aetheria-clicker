import { BigNum } from '../engine/BigNum.js';

export class GameState {
  constructor() {
    this.resetToDefaults();
  }

  resetToDefaults() {
    // Primary Resources
    this.aether = new BigNum(0);
    this.totalAetherEarned = new BigNum(0);
    this.gold = new BigNum(0);
    this.mana = 100;
    this.maxMana = 100;
    this.manaRegen = 2.0; // per second
    this.chronoSand = 60; // Start with 1 minute of fast-forward

    // Prestige Resources
    this.cosmicDust = new BigNum(0);
    this.totalCosmicDust = new BigNum(0);
    this.ascensionCount = 0;

    this.fractureShards = new BigNum(0);
    this.transcendenceCount = 0;

    // Active Clicker Stats
    this.clickPower = new BigNum(1);
    this.critChance = 0.05; // 5%
    this.critMultiplier = 3.0; // 3x
    this.comboCount = 0;
    this.comboTimer = 0;
    this.frenzyActive = false;
    this.frenzyTimer = 0;
    this.totalClicks = 0;

    // Materials / Inventory
    this.inventory = {
      stone: 0,
      limestone: 0,
      granite: 0,
      obsidian: 0,
      voidstone: 0,
      rubies: 0,
      sapphires: 0,
      emeralds: 0,
      diamonds: 0,
      voidAmethyst: 0,
      monsterBones: 0,
      voidCores: 0,
      bossTokens: 0
    };

    // General Statistics
    this.stats = {
      startTime: Date.now(),
      totalPlayTimeSeconds: 0,
      totalMonstersSlain: 0,
      totalBossesSlain: 0,
      totalBlocksMined: 0,
      totalPlantsHarvested: 0,
      totalPotionsBrewed: 0,
      totalSpellsCast: 0,
      totalBountiesCompleted: 0,
      offlineEfficiency: 1.0,
      globalMultiplier: 1.0
    };

    // Active buffs from potions and spells: array of { id, name, duration, multiplierType, value }
    this.activeBuffs = [];

    // Guild Seals / Talent Points
    this.guildSeals = 0;
    this.talentPoints = 0;
    this.spentTalentPoints = 0;

    // System sub-states (initialized by their respective systems)
    this.buildings = {};
    this.hero = null;
    this.miningGrid = null;
    this.garden = null;
    this.alchemy = null;
    this.spells = {};
    this.talents = {};
    this.bounties = [];
    this.market = null;
    this.ascensionPerks = {};
    this.achievements = {};
  }

  // Calculate global aether production per second from all buildings + buffs
  getNetAetherPerSecond() {
    let base = BigNum.zero();
    if (this.buildingSystem) {
      base = this.buildingSystem.getTotalProduction();
    }

    // Multiply by global multiplier
    let mult = this.stats.globalMultiplier;

    // Multiply by achievements bonus (each achievement gives +1%)
    if (this.achievementSystem) {
      const achBonus = 1 + (this.achievementSystem.getUnlockedCount() * 0.015);
      mult *= achBonus;
    }

    // Multiply by Ascension Perks (Eternal Resonance = +50% per rank)
    if (this.ascensionPerks && this.ascensionPerks['eternal_resonance']) {
      const perkRank = this.ascensionPerks['eternal_resonance'].rank || 0;
      mult *= (1 + perkRank * 0.50);
    }

    // Universal Mastery: Building Mastery (+1.5% Global Aether per 100 total buildings)
    if (this.buildingSystem) {
      const totalBldgs = this.buildingSystem.getTotalBuildingsCount();
      const bldgMasteryRank = Math.floor(totalBldgs / 100);
      mult *= (1 + bldgMasteryRank * 0.015);
    }
    
    // Universal Mastery: Dungeon Mastery (+1.0% Global Aether per 10 bosses slain)
    if (this.stats && this.stats.totalBossesSlain > 0) {
      const dungeonMasteryRank = Math.floor(this.stats.totalBossesSlain / 10);
      mult *= (1 + dungeonMasteryRank * 0.01);
    }
    
    // Universal Mastery: Excavation Mastery (+1.0% Global Aether per 5 max depth reached)
    if (this.miningGrid && this.miningGrid.maxDepth > 1) {
      const depthMasteryRank = Math.floor(this.miningGrid.maxDepth / 5);
      mult *= (1 + depthMasteryRank * 0.01);
    }
    
    // High Enchanter (Golden Synergy)
    if (this.market && this.market.goldenSynergy) {
      mult *= (1 + this.market.goldenSynergy * 0.05);
    }

    // Multiply by Cosmic Dust bonus (each cosmic dust gives +2% production)
    if (this.cosmicDust.gt(0)) {
      const dustMult = 1 + this.cosmicDust.toNumber() * 0.02;
      mult *= Math.max(1, dustMult);
    }

    // Multiply by Active Buffs
    for (const buff of this.activeBuffs) {
      if (buff.type === 'aether_mult') {
        mult *= buff.value;
      }
    }

    // Multiply by Quartermaster Aetheric Treaty
    if (this.quartermaster && this.quartermaster['aether_treaty']) {
      mult *= (1 + this.quartermaster['aether_treaty'].rank * 0.25);
    }

    return base.mul(mult);
  }

  // Calculate current click damage/yield
  getClickYield() {
    let base = this.clickPower;

    // Add % of passive CPS to click
    const cps = this.getNetAetherPerSecond();
    if (cps.gt(0)) {
      let clickPercentOfCps = 0.03; // Base 3%
      if (this.talents && this.talents['click_synergy']) {
        clickPercentOfCps += this.talents['click_synergy'].rank * 0.02;
      }
      base = base.add(cps.mul(clickPercentOfCps));
    }

    // Combo multiplier (up to 5x base)
    const comboMult = 1 + Math.min(50, this.comboCount) * 0.08;
    base = base.mul(comboMult);

    // Ascension Perk: Singularity Tap (+100% per rank)
    if (this.ascensionPerks && this.ascensionPerks['hyper_click']) {
      const perkRank = this.ascensionPerks['hyper_click'].rank || 0;
      const clickMult = 1 + perkRank * 1.0;
      base = base.mul(clickMult);
    }

    // Frenzy multiplier
    if (this.frenzyActive) {
      base = base.mul(5.0);
    }

    // Active buffs
    for (const buff of this.activeBuffs) {
      if (buff.type === 'click_mult') {
        base = base.mul(buff.value);
      }
    }

    return base;
  }

  serialize() {
    return {
      version: 1,
      savedAt: Date.now(),
      aether: this.aether.toJSON(),
      totalAetherEarned: this.totalAetherEarned.toJSON(),
      gold: this.gold.toJSON(),
      mana: this.mana,
      maxMana: this.maxMana,
      chronoSand: this.chronoSand,
      cosmicDust: this.cosmicDust.toJSON(),
      totalCosmicDust: this.totalCosmicDust.toJSON(),
      ascensionCount: this.ascensionCount,
      fractureShards: this.fractureShards.toJSON(),
      transcendenceCount: this.transcendenceCount,
      clickPower: this.clickPower.toJSON(),
      critChance: this.critChance,
      critMultiplier: this.critMultiplier,
      totalClicks: this.totalClicks,
      inventory: { ...this.inventory },
      stats: { ...this.stats },
      guildSeals: this.guildSeals,
      talentPoints: this.talentPoints,
      spentTalentPoints: this.spentTalentPoints,
      buildings: this.buildings,
      hero: this.hero,
      mining: this.miningGrid,
      garden: this.garden,
      alchemy: this.alchemy,
      spells: this.spells,
      talents: this.talents,
      bounties: this.bounties,
      quartermaster: this.quartermaster,
      market: this.market,
      ascensionPerks: this.ascensionPerks,
      achievements: this.achievements
    };
  }

  deserialize(data) {
    if (!data) return;
    try {
      this.aether = BigNum.fromJSON(data.aether);
      this.totalAetherEarned = BigNum.fromJSON(data.totalAetherEarned);
      this.gold = BigNum.fromJSON(data.gold);
      this.mana = data.mana ?? 100;
      this.maxMana = data.maxMana ?? 100;
      this.chronoSand = data.chronoSand ?? 60;
      this.cosmicDust = BigNum.fromJSON(data.cosmicDust);
      this.totalCosmicDust = BigNum.fromJSON(data.totalCosmicDust);
      this.ascensionCount = data.ascensionCount ?? 0;
      this.fractureShards = BigNum.fromJSON(data.fractureShards);
      this.transcendenceCount = data.transcendenceCount ?? 0;
      this.clickPower = BigNum.fromJSON(data.clickPower);
      this.critChance = data.critChance ?? 0.05;
      this.critMultiplier = data.critMultiplier ?? 3.0;
      this.totalClicks = data.totalClicks ?? 0;
      this.inventory = { ...this.inventory, ...(data.inventory || {}) };
      this.stats = { ...this.stats, ...(data.stats || {}) };
      this.guildSeals = data.guildSeals ?? 0;
      this.talentPoints = data.talentPoints ?? 0;
      this.spentTalentPoints = data.spentTalentPoints ?? 0;
      this.buildings = data.buildings || {};
      this.hero = data.hero || null;
      this.miningGrid = data.mining || null;
      this.garden = data.garden || null;
      this.alchemy = data.alchemy || null;
      this.spells = data.spells || {};
      this.talents = data.talents || {};
      this.bounties = data.bounties || [];
      // JSON turns BigNums into plain {m, e} objects; rehydrate the ones nested in sub-states
      for (const b of this.bounties) {
        if (b.rewards) b.rewards.gold = BigNum.fromJSON(b.rewards.gold);
      }
      this.quartermaster = data.quartermaster || null;
      this.market = data.market || null;
      if (this.market?.caravan) {
        this.market.caravan.investment = BigNum.fromJSON(this.market.caravan.investment);
      }
      this.ascensionPerks = data.ascensionPerks || {};
      this.achievements = data.achievements || {};
    } catch (e) {
      console.error('Error during deserialize:', e);
    }
  }
}
