import { BigNum } from '../engine/BigNum.js';
import { rewards } from '../ui/rewards.js';
import { recordAscensionDust, checkMilestones } from './TalentSources.js';
import { BUILDING_DEFINITIONS, getUnlockedTierCount } from './BuildingSystem.js';
import { isChallengeActive } from './ChronicleSystem.js';
import { resetUpgradesOnAscend, resetAllUpgrades } from './UpgradeSystem.js';
import { applyRunStart, getDustAmplifierMult, resetDustShop, DUST_SHOP_TIERS, DUST_SHOP_ITEMS } from './DustShopSystem.js';

// The 7 Ascension perks are now the dust shop (R6, DustShopSystem.js; save step v5 converts them)

// Dust gain = 150 * (runAether / 1e9)^DUST_EXPONENT (design doc 6.1: cube root, was 0.25)
export const DUST_EXPONENT = 1 / 3;
// Shortest run that may Ascend (design doc 2.1 / 6.1)
export const MIN_RUN_SECONDS = 600;

// Transcend (layer 2, design doc 6.1 / roadmap R4)
// Gate for the next Transcend, in lifetime dust of the current layer: 1e9 x 10^k, k = Transcends
// so far. The two-regime knob from issue #23 (default 2: x30 per step from Transcend X onward)
// is kept but off: re-simulated in R4, any x30 regime stalls layer 2 weeks to months earlier
// (design doc 10, risk 3). Set TRANSCEND_SLOW_FROM to n to make Transcend n the first x30 step.
export const TRANSCEND_BASE_GATE = 1e9;
export const TRANSCEND_GATE_GROWTH = 10;
export const TRANSCEND_GATE_GROWTH_LATE = 30;
export const TRANSCEND_SLOW_FROM = Infinity;
export const TRANSCEND_SHARDS = 2;        // shards paid per Transcend
export { SHARD_AETHER_MULT, SHARD_DUST_MULT } from './GameState.js'; // x1.5 each per lifetime shard

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
  }

  // Breakdown of the dust-gain multipliers shown on the Ascend button
  getDustMultipliers() {
    const shards = this.gameState.getShardCount();
    return {
      depth: this.gameState.miningGrid?.maxDepth || 0,
      geode: getGeodeAttunementMult(this.gameState),
      nectar: getNectarHeld(this.gameState),
      nectarMult: getNectarOfferingMult(this.gameState),
      shards,
      shardMult: this.gameState.getShardDustMult(shards),
      amplifier: getDustAmplifierMult(this.gameState)   // dust shop Dust Amplifier
    };
  }

  // Calculate pending Cosmic Dust upon Ascension
  // (base x Geode Attunement x Nectar Offering x Dust Amplifier x shards)
  getPendingCosmicDust() {
    const base = this.getBaseCosmicDust();
    if (base.lte(0)) return base;
    const m = this.getDustMultipliers();
    // tiny epsilon so float noise (e.g. 150 x 1.2 = 179.999...) never floors a whole dust away
    return base.mul(new BigNum(m.geode * m.nectarMult * m.amplifier * (1 + 1e-12))).mul(m.shardMult).floor();
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
    // A Chronicle challenge (R20) is a side run: no Ascending until it ends
    return !isChallengeActive(this.gameState) && this.getPendingCosmicDust().gt(0) && this.getMinRunRemaining(now) <= 0;
  }

  // quiet: skip the ceremony; auto-Ascend (shard tree, R13) announces its own batched toast
  ascend(force = false, { quiet = false } = {}) {
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
    // Upgrade shop resets too, except what a Blueprint Memory keep rule holds (R5/R6)
    resetUpgradesOnAscend(this.gameState);

    // Dust shop: Cosmic Genesis, Resonant Start; Finger of Wasta's click count starts again
    applyRunStart(this.gameState);

    // Talent points (R9): no flat grant. S2 pays Record Ascension stars, S1 the first Ascension and
    // (via transcend(), which calls this with force) the Transcend ladder.
    recordAscensionDust(this.gameState, pending);
    checkMilestones(this.gameState);

    // Big tier ceremony (§5.1). Transcend calls ascend(true) and shows its own epic one instead.
    if (!force && !quiet) rewards.notify({ tier: 'big', kind: 'ascension', icon: '✨', color: '#06b6d4', title: 'New Well drilled!', batchTitle: '{n} New Wells', amount: pending, fmt: (d) => d.format('standard', 0), unit: 'Crude Reserves' });
    // A new dust shop tier just opened (Ascension 1 / 3 / 5 / 10 / 20)
    const opened = DUST_SHOP_TIERS.includes(this.gameState.ascensionCount) ? this.gameState.ascensionCount : 0;
    if (opened) {
      const n = DUST_SHOP_ITEMS.filter(d => d.tier === opened).length;
      rewards.notify({ tier: 'medium', kind: 'dust-shop-tier', icon: '🛒', color: '#c084fc', title: `Reserve Shop: ${n} new feature${n === 1 ? '' : 's'}`, detail: `New Well ${opened} opened a new shop tier` });
    }
    return true;
  }

  // Multiverse Transcendence (Prestige Tier 2, design doc 6.1)
  // Lifetime dust (this layer) needed for Transcend number k + 1, k = Transcends so far
  getTranscendGate(k = this.gameState.transcendenceCount || 0) {
    const fast = Math.min(k, TRANSCEND_SLOW_FROM - 2);
    const slow = Math.max(0, k - (TRANSCEND_SLOW_FROM - 2));
    return new BigNum(TRANSCEND_BASE_GATE)
      .mul(new BigNum(TRANSCEND_GATE_GROWTH).pow(fast))
      .mul(new BigNum(TRANSCEND_GATE_GROWTH_LATE).pow(slow));
  }

  canTranscend() {
    // Not during a Chronicle challenge (R20)
    return !isChallengeActive(this.gameState) && this.gameState.totalCosmicDust.gte(this.getTranscendGate());
  }

  // Shards the next Transcend pays (R15, §6.1). `base` (2) raises both counters, so it is in the
  // x1.5 multipliers. `seals` (+1 per lit Seal of Transcendence, up to +3) is spendable only: it
  // goes to fractureShards (the shard tree) and never to totalFractureShards, because every
  // multiplier shard compounds and any extra one per Transcend runs the layer away (doc §6.1).
  getTranscendShards() {
    this.gameState.calendarSystem?.updateSeals?.();
    return { base: TRANSCEND_SHARDS, seals: this.gameState.calendarSystem?.getSealShardBonus?.() || 0 };
  }

  // What Transcend trades, for the confirm dialog and the panel. Lifetime dust of this layer (and
  // so the dust multiplier) goes back to 0; the run, dust and the dust shop reset. In return: +2 shards
  // (x1.5 Aether and x1.5 dust gain each, permanent) and the next generator tier.
  // before/after compare the dust x shard Aether multipliers right before and right after.
  getTranscendPreview() {
    const gs = this.gameState;
    const { base: payout, seals: sealShards } = this.getTranscendShards();
    const shardsBefore = gs.getShardCount();
    const shardsAfter = shardsBefore + payout;
    const dustBefore = gs.getDustMultiplierBig();
    const dustAfter = BigNum.one();
    const shardBefore = gs.getShardAetherMult(shardsBefore);
    const shardAfter = gs.getShardAetherMult(shardsAfter);
    const tiersBefore = getUnlockedTierCount(gs);
    const tiersAfter = getUnlockedTierCount({ transcendenceCount: (gs.transcendenceCount || 0) + 1 });
    return {
      gate: this.getTranscendGate(),
      nextGate: this.getTranscendGate((gs.transcendenceCount || 0) + 1),
      shardsGained: payout,
      sealShards,   // spendable only: not in shardsAfter or any multiplier
      shardsBefore, shardsAfter,
      dustBefore, dustAfter,
      shardBefore, shardAfter,
      dustGainBefore: gs.getShardDustMult(shardsBefore),
      dustGainAfter: gs.getShardDustMult(shardsAfter),
      tiersBefore, tiersAfter,
      newTier: tiersAfter > tiersBefore ? BUILDING_DEFINITIONS[tiersAfter - 1] : null,
      before: dustBefore.mul(shardBefore),
      after: dustAfter.mul(shardAfter)
    };
  }

  transcend() {
    if (!this.canTranscend()) return false;

    const { base: payout, seals: sealShards } = this.getTranscendShards();
    const shardsGained = new BigNum(payout);
    // The base shards count for the multipliers (lifetime) and the shard tree (spendable)
    this.gameState.fractureShards = this.gameState.fractureShards.add(shardsGained).add(sealShards);
    this.gameState.totalFractureShards = this.gameState.totalFractureShards.add(shardsGained);
    this.gameState.transcendenceCount++;

    // Reset Tier 1
    this.ascend(true);
    this.gameState.cosmicDust = BigNum.zero();
    this.gameState.totalCosmicDust = BigNum.zero();
    resetAllUpgrades(this.gameState); // Blueprint Memory is a dust-shop feature: gone with the dust
    resetDustShop(this.gameState);
    // Shop-raised caps just dropped. Re-fit now rather than on the next page load:
    // Chrono Sand to the base bank (Chrono Reservoir), buffs to the base duration cap
    // (Astral Crucible), hero HP to the max without Titan's Legacy.
    this.gameState.clampLoadedTimers();
    const hero = this.gameState.hero;
    if (hero && this.gameState.combatSystem) {
      hero.hp = Math.min(hero.hp, this.gameState.combatSystem.getTotalMaxHp());
    }

    rewards.notify({ tier: 'epic', kind: 'transcend', icon: '🌌', color: '#ec4899', title: 'New Oil Field opened!', batchTitle: '{n} New Fields', amount: payout, fmt: (n) => String(n), unit: 'Field Shares', detail: sealShards > 0 ? `+${sealShards} more to spend (Seals)` : undefined });
    return true;
  }
}
