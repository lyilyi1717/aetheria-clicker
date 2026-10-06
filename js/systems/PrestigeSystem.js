import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { particles } from '../engine/ParticleEngine.js';

export const ASCENSION_PERKS = [
  { id: 'genesis', name: 'Cosmic Genesis', desc: 'Start with 15 Tappers & 1,000 Gold on reset.', cost: 5, maxRank: 1 },
  { id: 'eternal_resonance', name: 'Eternal Resonance', desc: '+50% All Aether Production per rank.', cost: 10, maxRank: 50 },
  { id: 'hyper_click', name: 'Singularity Tap', desc: '+100% Click Yield per rank.', cost: 15, maxRank: 50 },
  { id: 'auto_leylines', name: 'Automated Leylines', desc: 'Auto-casts spells when mana is full.', cost: 50, maxRank: 1 },
  { id: 'chrono_vault', name: 'Chrono Reservoir', desc: 'Offline Sand bank cap increased by +720m.', cost: 25, maxRank: 10 },
  { id: 'titan_legacy', name: "Titan's Legacy", desc: 'Hero starts with +100 HP and +25 Attack.', cost: 30, maxRank: 10 },
  { id: 'astral_alchemist', name: 'Astral Crucible', desc: 'All potion durations doubled.', cost: 40, maxRank: 1 }
];

// Dust gain = 150 * (runAether / 1e9)^DUST_EXPONENT (design doc 6.1: cube root, was 0.25)
export const DUST_EXPONENT = 1 / 3;
// Shortest run that may Ascend (design doc 2.1 / 6.1)
export const MIN_RUN_SECONDS = 600;

// Dust-gain links (design doc §5.3). Each is its own multiplicative category on pending dust.
// Geode Attunement (Excavation -> Dust): x(1 + 0.10 * floor(maxDepth / 10))
export function getGeodeAttunementMult(gameState) {
  const depth = gameState.miningGrid?.maxDepth || 0;
  return 1 + 0.10 * Math.floor(depth / 10);
}

// Celestial Nectar currently held (all of it is consumed on Ascend)
export function getNectarHeld(gameState) {
  return Math.max(0, Math.floor(gameState.garden?.essences?.starNectar || 0));
}

// Nectar Offering (Garden -> Dust): x min(2, 1 + 0.02 * sqrt(nectar))
export function getNectarOfferingMult(gameState) {
  return Math.min(2, 1 + 0.02 * Math.sqrt(getNectarHeld(gameState)));
}

export class PrestigeSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.initPerks();
  }

  initPerks() {
    if (!this.gameState.ascensionPerks) {
      this.gameState.ascensionPerks = {};
    }
    for (const p of ASCENSION_PERKS) {
      if (!this.gameState.ascensionPerks[p.id]) {
        this.gameState.ascensionPerks[p.id] = { rank: 0 };
      }
    }
  }

  // Breakdown of the dust-gain multipliers shown on the Ascend button
  getDustMultipliers() {
    return {
      depth: this.gameState.miningGrid?.maxDepth || 0,
      geode: getGeodeAttunementMult(this.gameState),
      nectar: getNectarHeld(this.gameState),
      nectarMult: getNectarOfferingMult(this.gameState)
    };
  }

  // Calculate pending Cosmic Dust upon Ascension (base x Geode Attunement x Nectar Offering)
  getPendingCosmicDust() {
    const base = this.getBaseCosmicDust();
    if (base.lte(0)) return base;
    const m = this.getDustMultipliers();
    // tiny epsilon so float noise (e.g. 150 x 1.2 = 179.999...) never floors a whole dust away
    return base.mul(new BigNum(m.geode * m.nectarMult * (1 + 1e-12))).floor();
  }

  // Base dust from run Aether only, before the dust-gain links
  getBaseCosmicDust() {
    const totalAether = this.gameState.totalAetherEarned;
    const threshold = new BigNum(1000000000); // 1 Billion

    if (totalAether.lt(threshold)) return BigNum.zero();

    // 150 * (Aether / 1e9)^(1/3), in BigNum: past 1e317 run Aether the ratio no longer fits
    // a double, and Math.pow(Infinity) -> new BigNum(Infinity) -> 0 made Ascension impossible
    // (same float epsilon as getPendingCosmicDust: 16e9 must give exactly 300, not 299)
    return totalAether.div(threshold).max(1).pow(DUST_EXPONENT).mul(150 * (1 + 1e-12)).floor();
  }

  // Seconds left until the current run is long enough to Ascend (0 = met). Wall-clock, so
  // offline time counts. Clamped so a clock set backwards can't lock the button.
  getMinRunRemaining(now = Date.now()) {
    const elapsed = (now - (this.gameState.runStartedAt || 0)) / 1000;
    return Math.min(MIN_RUN_SECONDS, Math.max(0, MIN_RUN_SECONDS - elapsed));
  }

  canAscend(now = Date.now()) {
    return this.getPendingCosmicDust().gt(0) && this.getMinRunRemaining(now) <= 0;
  }

  ascend(force = false) {
    const pending = this.getPendingCosmicDust();
    if (!force && !this.canAscend()) return false;

    this.gameState.cosmicDust = this.gameState.cosmicDust.add(pending);
    this.gameState.totalCosmicDust = this.gameState.totalCosmicDust.add(pending);
    this.gameState.ascensionCount++;
    this.gameState.runStartedAt = Date.now();

    // Nectar Offering: all Celestial Nectar is consumed by the Ascension
    if (this.gameState.garden?.essences) {
      this.gameState.garden.essences.starNectar = 0;
    }

    // Reset Aether, Buildings
    this.gameState.aether = BigNum.zero();
    this.gameState.totalAetherEarned = BigNum.zero(); // Fix: Reset Run Aether so you can't ascend infinitely!
    this.gameState.clickPower = new BigNum(1);
    this.gameState.comboCount = 0;
    this.gameState.comboTimer = 0;
    this.gameState.frenzyActive = false;
    this.gameState.frenzyTimer = 0;

    // Reset buildings to 0
    for (const bId in this.gameState.buildings) {
      this.gameState.buildings[bId].count = 0;
    }

    // Apply Genesis perk if unlocked
    if (this.gameState.ascensionPerks.genesis?.rank > 0) {
      this.gameState.buildings['tapper'].count = 15;
      this.gameState.gold = this.gameState.gold.add(new BigNum(1000));
    }

    // Bonus Talent Points from Ascension
    this.gameState.talentPoints += 3;

    sound.playAscension();
    particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `ASCENDED! +${pending.format('standard', 0)} COSMIC DUST!`, '#06b6d4', true);
    return true;
  }

  buyPerk(perkId) {
    const def = ASCENSION_PERKS.find(p => p.id === perkId);
    if (!def) return false;

    const perkState = this.gameState.ascensionPerks[perkId];
    if (perkState.rank >= def.maxRank) return false;

    const cost = new BigNum(def.cost * Math.pow(1.5, perkState.rank));
    if (this.gameState.cosmicDust.lt(cost)) return false;

    this.gameState.cosmicDust = this.gameState.cosmicDust.sub(cost);
    perkState.rank++;
    sound.playBuy();
    particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `PERK UNLOCKED: ${def.name}!`, '#fbbf24', true);
    return true;
  }

  // Multiverse Transcendence (Prestige Tier 2)
  canTranscend() {
    return this.gameState.totalCosmicDust.gte(new BigNum(50000));
  }

  // What Transcend trades, for the confirm dialog: lifetime dust (and so the dust multiplier)
  // resets to 0, shards add +10% each. Reports the dust x shard Aether multiplier before and after.
  getTranscendPreview() {
    const gs = this.gameState;
    const shards = gs.totalCosmicDust.div(10000).floor();
    const shardMult = (n) => 1 + n.toNumber() * 0.1;
    const dustBefore = gs.getDustMultiplier();
    const dustAfter = gs.getDustMultiplier(BigNum.zero());
    const shardBefore = shardMult(gs.fractureShards);
    const shardAfter = shardMult(gs.fractureShards.add(shards));
    return {
      shardsGained: shards,
      dustBefore, dustAfter, shardBefore, shardAfter,
      before: dustBefore * shardBefore,
      after: dustAfter * shardAfter
    };
  }

  transcend() {
    if (!this.canTranscend()) return false;

    // BigNum division: toNumber() is Infinity past 1e308 dust, which floored to 0 shards
    const shardsGained = this.gameState.totalCosmicDust.div(10000).floor();
    this.gameState.fractureShards = this.gameState.fractureShards.add(shardsGained);
    this.gameState.transcendenceCount++;

    // Reset Tier 1
    this.ascend(true);
    this.gameState.cosmicDust = BigNum.zero();
    this.gameState.totalCosmicDust = BigNum.zero();
    for (const p in this.gameState.ascensionPerks) {
      this.gameState.ascensionPerks[p].rank = 0;
    }
    // Perk-raised caps just dropped. Re-fit now rather than on the next page load:
    // Chrono Sand to the base bank (Chrono Reservoir), buffs to the base duration cap
    // (Astral Crucible), hero HP to the max without Titan's Legacy.
    this.gameState.clampLoadedTimers();
    const hero = this.gameState.hero;
    if (hero && this.gameState.combatSystem) {
      hero.hp = Math.min(hero.hp, this.gameState.combatSystem.getTotalMaxHp());
    }

    sound.playAscension();
    particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `TRANSCENDED REALITY! +${shardsGained.format('standard', 0)} FRACTURE SHARDS!`, '#ec4899', true);
    return true;
  }
}
