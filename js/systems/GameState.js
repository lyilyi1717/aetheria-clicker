import { BigNum } from '../engine/BigNum.js';
import { defaultFastForwardState, sanitizeFastForwardState } from './FastForwardSystem.js';
import { migrateSave, SAVE_VERSION } from '../engine/migrations.js';
import { defaultRecords, sanitizeRecords, serializeRecords, seedRecords } from './TalentSources.js';
import { defaultShardTreeState, sanitizeShardTreeState } from './ShardTreeSystem.js';
import { defaultCalendarState, sanitizeCalendarState } from './CalendarSystem.js';
import { getTierUpgradeMult, getClickUpgradeMult, sanitizeUpgrades, serializeUpgrades } from './UpgradeSystem.js';

// Fracture Shard effects (design doc 6.1). Kept here, not in PrestigeSystem, because
// PrestigeSystem imports audio/particles and GameState must stay loadable on its own.
export const SHARD_AETHER_MULT = 1.5;
export const SHARD_DUST_MULT = 1.5;

// Timed buffs can be extended to at most 10 minutes (x perk/talent duration multipliers)
export const BUFF_DURATION_CAP = 600;
// Chrono Sand bank cap (minutes) before Chrono Reservoir ranks
export const CHRONO_SAND_BASE_CAP = 1440;

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
    // Fast Forward price escalation (uses this cycle, timestamps, unfinished warp); see FastForwardSystem
    this.fastForward = defaultFastForwardState();

    // Prestige Resources
    this.cosmicDust = new BigNum(0);
    this.totalCosmicDust = new BigNum(0);
    this.ascensionCount = 0;
    // Wall-clock ms when the current run began (Ascend minimum run, see PrestigeSystem.getMinRunRemaining)
    this.runStartedAt = Date.now();

    // Fracture Shards: fractureShards is the spendable balance (shard tree, R13);
    // totalFractureShards is every shard ever earned and is what the x1.5 multipliers read,
    // so spending shards never lowers production (same rule as lifetime dust)
    this.fractureShards = new BigNum(0);
    this.totalFractureShards = new BigNum(0);
    this.transcendenceCount = 0;
    // Set once by the R4 save migration for saves that Transcended under the old rules
    this.legacyTranscendRefund = null;
    // Shard tree (R13): permanent nodes bought with fractureShards; Transcend never resets it
    this.shardTree = defaultShardTreeState();

    // Daily Dallah, Weekly Ledger, Seals (R15, CalendarSystem.js); nothing in it is ever taken away
    this.calendar = defaultCalendarState();

    // Active Clicker Stats
    this.clickPower = new BigNum(1);
    this.critChance = 0.05; // 5%
    this.critMultiplier = 3.0; // 3x
    this.comboCount = 0;
    this.comboTimer = 0;
    this.frenzyActive = false;
    this.frenzyTimer = 0;
    this.totalClicks = 0;

    // Upgrade shop (R5, UpgradeSystem.js): { [id]: true } for upgrades bought this run
    this.upgrades = {};

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
    // Lifetime records that pay talent points (R9, TalentSources.js); Ascend/Transcend never reset it
    this.records = defaultRecords();

    // System sub-states (initialized by their respective systems)
    this.buildings = {};
    this.hero = null;
    this.miningGrid = null;
    this.garden = null;
    this.alchemy = { catalysts: 0 };
    this.spells = {};
    this.talents = {};
    this.bounties = [];     // the contract board
    this.contracts = null;  // board timer { nextAt, lastClickAt }, set up by BountySystem
    this.market = null;
    this.ascensionPerks = {};
    this.achievements = {};
    this.codex = {}; // Generator Codex high-water marks and announced entries (CollectionSystem)
    // guidesSeen: tabs whose "How It Works" banner was shown expanded once (R23, js/ui/shell.js)
    // reduceMotion: 'auto' follows the device, 'on' / 'off' override it (R24, js/ui/motion.js)
    this.settings = { notation: 'scientific', guidesSeen: {}, reduceMotion: 'auto' };
  }

  // Calculate global aether production per second from all buildings + buffs
  getNetAetherPerSecond() {
    let base = BigNum.zero();
    if (this.buildingSystem) {
      base = this.buildingSystem.getTotalProduction();
    }

    // Legacy compounding Catalyst multiplier; migrated to alchemy.catalysts and kept at 1
    let mult = this.stats.globalMultiplier || 1;

    // Philosopher's Catalyst: +2% Aether per brew, additive within its own category
    mult *= this.getCatalystMult();

    // Achievement ladder (+1.5% per original achievement, +0.5% per rung) and completed
    // Codex sets (+1% each), one additive category (R14)
    if (this.achievementSystem) {
      mult *= this.achievementSystem.getBonusMultiplier();
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
    
    // Depth Resonance: +2% Aether per max depth reached
    mult *= this.getDepthResonanceMult();
    
    // High Enchanter (Golden Synergy)
    if (this.market && this.market.goldenSynergy) {
      mult *= (1 + this.market.goldenSynergy * 0.05);
    }

    // Active Aether buffs add together within one category (Celestial +300% & Philter +200% = x6)
    mult *= this.getAetherBuffMult();

    // Multiply by Quartermaster Aetheric Treaty
    if (this.quartermaster && this.quartermaster['aether_treaty']) {
      mult *= (1 + this.quartermaster['aether_treaty'].rank * 0.25);
    }

    // Cosmic Dust bonus (+2% per lifetime dust this layer) and Fracture Shards (x1.5 each) are
    // BigNum: both grow without bound across a year and must not overflow a double
    return base.mul(mult).mul(this.getDustMultiplierBig()).mul(this.getShardAetherMult());
  }

  // Upgrade shop: output multiplier for one generator tier (BuildingSystem.getBuildingProduction)
  getTierUpgradeMult(buildingId) {
    return getTierUpgradeMult(this, buildingId);
  }

  // Base click before the CPS share: clickPower x 2^(click upgrades bought) (design doc 6.1)
  getClickBase() {
    return this.clickPower.mul(getClickUpgradeMult(this));
  }

  // Calculate current click damage/yield
  getClickYield() {
    let base = this.getClickBase();

    // Add % of passive CPS to click
    const cps = this.getNetAetherPerSecond();
    if (cps.gt(0)) {
      let clickPercentOfCps = 0.03; // Base 3%
      if (this.talents && this.talents['click_synergy']) {
        clickPercentOfCps += this.talents['click_synergy'].rank * 0.02;
      }
      base = base.add(cps.mul(clickPercentOfCps));
    }

    // Aetherial Strike talent: +25% click yield per rank
    if (this.talents?.click_power?.rank > 0) {
      base = base.mul(1 + this.talents.click_power.rank * 0.25);
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

  getMaxDepth() {
    return this.miningGrid?.maxDepth || 0;
  }

  // Production multiplier from Cosmic Dust: 1 + 0.02 per lifetime dust (spending never lowers it)
  getDustMultiplier(total = this.totalCosmicDust) {
    return Math.max(1, 1 + total.toNumber() * 0.02);
  }

  // Same as getDustMultiplier, without the double overflow past 1e308 dust
  getDustMultiplierBig(total = this.totalCosmicDust) {
    return BigNum.one().add(total.mul(0.02)).max(1);
  }

  // Lifetime Fracture Shards as a plain count (shards are small integers; 0 if unset)
  getShardCount(total = this.totalFractureShards) {
    const n = total?.toNumber?.() ?? 0;
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  // Fracture Shards: x1.5 Aether production per lifetime shard
  getShardAetherMult(shards = this.getShardCount()) {
    return new BigNum(SHARD_AETHER_MULT).pow(shards);
  }

  // Fracture Shards: x1.5 Cosmic Dust gain per lifetime shard
  getShardDustMult(shards = this.getShardCount()) {
    return new BigNum(SHARD_DUST_MULT).pow(shards);
  }

  // Depth Resonance (Excavation -> Aether): x(1 + 0.02 * maxDepth)
  getDepthResonanceMult() {
    return 1 + 0.02 * this.getMaxDepth();
  }

  // Excavation -> Max Mana, Mana Regen and hero Max HP: x(1 + min(1, 0.01 * maxDepth)), capped at x2
  getDepthVitalityMult() {
    return 1 + Math.min(1.0, 0.01 * this.getMaxDepth());
  }

  // Philosopher's Catalyst: x(1 + 0.02 * n), n = catalysts brewed
  getCatalystMult() {
    return 1 + 0.02 * (this.alchemy?.catalysts || 0);
  }

  // Sum of all aether_mult buffs inside one additive category: 1 + sum(value - 1)
  getAetherBuffMult() {
    let bonus = 0;
    for (const buff of this.activeBuffs) {
      if (buff.type === 'aether_mult') bonus += buff.value - 1;
    }
    return 1 + bonus;
  }

  // Astral Crucible perk (x2) and Brewmaster Secret talent (+25%/rank) stretch buff durations
  getBuffDurationMult() {
    let mult = this.ascensionPerks?.astral_alchemist?.rank > 0 ? 2 : 1;
    mult *= 1 + (this.talents?.catalyst_potency?.rank || 0) * 0.25;
    return mult;
  }

  // Longest a timed buff can run, in seconds
  getBuffDurationCap() {
    return BUFF_DURATION_CAP * this.getBuffDurationMult();
  }

  // Leyline Overflow: while mana is full, Garden grows x1.5 and Auto-Drills run x1.25.
  // Garden/Mining multiply their dt by these; they return 1 when mana isn't full.
  isManaFull() {
    return this.maxMana > 0 && this.mana >= this.maxMana;
  }

  getLeylineGardenMult() {
    return this.isManaFull() ? 1.5 : 1;
  }

  getLeylineDrillMult() {
    return this.isManaFull() ? 1.25 : 1;
  }

  // Market Index M = 1.12^(indexFloor - 1); delegates to MarketSystem when linked
  getMarketIndex() {
    if (this.marketSystem) return this.marketSystem.getMarketIndex();
    const f = Number(this.hero?.indexFloor ?? this.hero?.maxFloor);
    return new BigNum(1.12).pow(Number.isFinite(f) && f > 1 ? Math.floor(f) - 1 : 0);
  }

  // Chrono Sand bank cap: 1,440 x (1 + 0.5 x Chrono Reservoir rank). Offline Aether bands are
  // separate (SaveManager computeOfflineBands: Reservoir adds 4 h of full-rate time per rank).
  getChronoSandCap() {
    return CHRONO_SAND_BASE_CAP * (1 + 0.5 * (this.ascensionPerks?.chrono_vault?.rank || 0));
  }

  // Midas Elixir (gold_mult buffs) multiplies all earned gold
  getGoldMultiplier() {
    let mult = 1;
    for (const buff of this.activeBuffs) {
      if (buff.type === 'gold_mult') mult *= buff.value;
    }
    return mult;
  }

  // Temporal Siphon talent: +50% Chrono Sand per rank
  getChronoSandGainMult() {
    // Hourglass Week (Souq Rotation, R15) multiplies it
    return (1 + (this.talents?.chrono_mastery?.rank || 0) * 0.5) * (this.calendarSystem?.getSandGainMult?.() || 1);
  }

  // Adds sand up to the bank cap; returns what was actually banked
  addChronoSand(amount) {
    const current = this.chronoSand || 0;
    const room = Math.max(0, this.getChronoSandCap() - current);
    const gained = Math.min(room, Math.floor(amount * this.getChronoSandGainMult()));
    this.chronoSand = current + gained;
    return gained;
  }

  serialize() {
    return {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      aether: this.aether.toJSON(),
      totalAetherEarned: this.totalAetherEarned.toJSON(),
      gold: this.gold.toJSON(),
      mana: this.mana,
      maxMana: this.maxMana,
      chronoSand: this.chronoSand,
      fastForward: { ...this.fastForward },
      cosmicDust: this.cosmicDust.toJSON(),
      totalCosmicDust: this.totalCosmicDust.toJSON(),
      ascensionCount: this.ascensionCount,
      runStartedAt: this.runStartedAt,
      fractureShards: this.fractureShards.toJSON(),
      totalFractureShards: this.totalFractureShards.toJSON(),
      transcendenceCount: this.transcendenceCount,
      legacyTranscendRefund: this.legacyTranscendRefund,
      shardTree: this.shardTree,
      calendar: this.calendar,
      clickPower: this.clickPower.toJSON(),
      critChance: this.critChance,
      critMultiplier: this.critMultiplier,
      totalClicks: this.totalClicks,
      upgrades: serializeUpgrades(this.upgrades),
      inventory: { ...this.inventory },
      stats: { ...this.stats },
      guildSeals: this.guildSeals,
      talentPoints: this.talentPoints,
      spentTalentPoints: this.spentTalentPoints,
      records: serializeRecords(this.records),
      buildings: this.buildings,
      hero: this.hero,
      mining: this.miningGrid,
      garden: this.garden,
      alchemy: this.alchemy,
      spells: this.spells,
      talents: this.talents,
      bounties: this.bounties,
      contracts: this.contracts ? { ...this.contracts } : null,
      quartermaster: this.quartermaster,
      market: this.market,
      ascensionPerks: this.ascensionPerks,
      achievements: this.achievements,
      codex: this.codex,
      // Chrono Warp is excluded: the loop's timeScale isn't saved, so it would come back inert
      activeBuffs: this.activeBuffs.filter(b => b.type !== 'time_speed'),
      settings: this.settings
    };
  }

  deserialize(data) {
    if (!data) return;
    // Upgrade older saves step by step (js/engine/migrations.js) before any field is read
    data = migrateSave(data);
    try {
      this.aether = BigNum.fromJSON(data.aether);
      this.totalAetherEarned = BigNum.fromJSON(data.totalAetherEarned);
      this.gold = BigNum.fromJSON(data.gold);
      this.mana = data.mana ?? 100;
      this.maxMana = data.maxMana ?? 100;
      this.chronoSand = data.chronoSand ?? 60;
      this.fastForward = sanitizeFastForwardState(data.fastForward, data.savedAt);
      this.cosmicDust = BigNum.fromJSON(data.cosmicDust);
      this.totalCosmicDust = BigNum.fromJSON(data.totalCosmicDust);
      this.ascensionCount = data.ascensionCount ?? 0;
      // Saves from before R2 have no run clock: their run is old enough, so no wait
      this.runStartedAt = Number.isFinite(data.runStartedAt) ? data.runStartedAt : 0;
      this.fractureShards = BigNum.fromJSON(data.fractureShards);
      // Not clamped to the balance: Seal shards (R15) are spendable only, so the balance can pass
      // the lifetime count (which is what the multipliers read)
      // A save missing the field entirely (hand-edited / partial) falls back to the balance so it
      // keeps its bonus; saves from the v4 migration on always carry it
      this.totalFractureShards = data.totalFractureShards == null
        ? this.fractureShards
        : BigNum.fromJSON(data.totalFractureShards);
      const tc = Math.floor(Number(data.transcendenceCount));
      this.transcendenceCount = Number.isFinite(tc) && tc > 0 ? tc : 0;
      this.legacyTranscendRefund = data.legacyTranscendRefund && typeof data.legacyTranscendRefund === 'object'
        ? data.legacyTranscendRefund : null;
      // Saves from before R13 have no tree: empty, except Wardens stay free if they had them
      this.shardTree = sanitizeShardTreeState(data.shardTree, { transcendenceCount: this.transcendenceCount });
      // Saves from before R15 have no calendar: it starts empty and fills on the first visit
      this.calendar = sanitizeCalendarState(data.calendar);
      this.clickPower = BigNum.fromJSON(data.clickPower);
      this.critChance = data.critChance ?? 0.05;
      this.critMultiplier = data.critMultiplier ?? 3.0;
      this.totalClicks = data.totalClicks ?? 0;
      // Saves before R5 have no upgrades: nothing bought
      this.upgrades = sanitizeUpgrades(data.upgrades);
      this.inventory = { ...this.inventory, ...(data.inventory || {}) };
      // Mining used to store rubies under 'rubys'; fold them into the real key
      if (this.inventory.rubys) {
        this.inventory.rubies = (this.inventory.rubies || 0) + this.inventory.rubys;
        delete this.inventory.rubys;
      }
      this.stats = { ...this.stats, ...(data.stats || {}) };
      this.guildSeals = data.guildSeals ?? 0;
      this.talentPoints = data.talentPoints ?? 0;
      this.spentTalentPoints = data.spentTalentPoints ?? 0;
      this.buildings = data.buildings || {};
      this.hero = data.hero || null;
      this.miningGrid = data.mining || null;
      this.garden = data.garden || null;
      this.alchemy = { catalysts: 0, ...(data.alchemy || {}) };
      this.spells = data.spells || {};
      this.talents = data.talents || {};
      // A non-array or reward-less bounty (corrupted/edited save) would either throw here,
      // leaving every later slice at defaults, or throw on claim; drop just those entries.
      this.bounties = (Array.isArray(data.bounties) ? data.bounties : []).filter(b => b && b.rewards);
      // JSON turns BigNums into plain {m, e} objects; rehydrate the ones nested in sub-states
      for (const b of this.bounties) {
        b.rewards.gold = BigNum.fromJSON(b.rewards.gold);
      }
      // Saves from before R10 have no board timer: BountySystem starts one (and keeps their contracts)
      this.contracts = data.contracts && typeof data.contracts === 'object' ? { ...data.contracts } : null;
      this.quartermaster = data.quartermaster || null;
      this.market = data.market || null;
      if (this.market?.caravan) {
        this.market.caravan.investment = BigNum.fromJSON(this.market.caravan.investment);
        if (this.market.caravan.payout) this.market.caravan.payout = BigNum.fromJSON(this.market.caravan.payout);
      }
      this.ascensionPerks = data.ascensionPerks || {};
      this.achievements = data.achievements || {};
      this.codex = data.codex && typeof data.codex === 'object' ? data.codex : {};
      this.activeBuffs = Array.isArray(data.activeBuffs) ? data.activeBuffs : [];
      this.settings = { ...this.settings, ...(data.settings || {}) };
      // Saves from before R9 have no records: seed them from what the save shows (no grants)
      this.records = data.records ? sanitizeRecords(data.records) : seedRecords(this);
      // Saves from before R23 have played past the first visits: start every guide collapsed
      if (!data.settings || typeof data.settings.guidesSeen !== 'object' || !data.settings.guidesSeen) {
        this.settings.guidesSeen = { all: true };
      }
      // Saves from before R24 (or with an unknown value) follow the device setting
      if (!['auto', 'on', 'off'].includes(this.settings.reduceMotion)) this.settings.reduceMotion = 'auto';
      this.clampLoadedTimers();
    } catch (e) {
      console.error('Error during deserialize:', e);
    }
  }

  // Every load: buffs fit the duration cap and carry maxDuration; Chrono Sand fits the bank cap
  clampLoadedTimers() {
    const cap = this.getBuffDurationCap();
    for (const b of this.activeBuffs) {
      if (b.fixed) continue; // Dallah coffee: fixed 1 h, outside the 10-min cap
      b.duration = Math.min(cap, Number(b.duration) || 0);
      b.maxDuration = Math.min(cap, Math.max(b.duration, Number(b.maxDuration) || 0));
    }
    this.activeBuffs = this.activeBuffs.filter(b => b.duration > 0);
    const sand = Number(this.chronoSand);
    this.chronoSand = Math.max(0, Math.min(this.getChronoSandCap(), Number.isNaN(sand) ? 0 : sand));
  }
}
