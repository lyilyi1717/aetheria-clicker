import { BigNum } from '../engine/BigNum.js';
import { rewards } from '../ui/rewards.js';
import { recordAscensionDust, checkMilestones } from './TalentSources.js';
import { BUILDING_DEFINITIONS, getUnlockedTierCount } from './BuildingSystem.js';
import { isChallengeActive } from './ChronicleSystem.js';
import { resetUpgradesOnAscend, resetAllUpgrades } from './UpgradeSystem.js';
import { applyRunStart, getDustAmplifierMult, resetDustShop, DUST_SHOP_TIERS, DUST_SHOP_ITEMS } from './DustShopSystem.js';
import { startAttunementRun } from './AttunementSystem.js';
import { t } from '../i18n/index.js';

// The 7 Ascension perks are now the dust shop (R6, DustShopSystem.js; save step v5 converts them)

// Dust gain = DUST_BASE * (runAether / DUST_REF)^DUST_EXPONENT (design doc 6.1, R31). Ascension
// pays once run Aether reaches DUST_MIN_AETHER: R52 lowered that from DUST_REF (10 dust) to 500
// (5 dust, the price of Auto-tap) so an idle player's first New Well comes within the first hour.
// The curve itself is R31's, so mid- and late-game pacing is unchanged.
export const DUST_BASE = 10;
export const DUST_REF = 1e4;
export const DUST_EXPONENT = 1 / 5;
export const DUST_MIN_AETHER = 500;
// Shortest run that may Ascend (design doc 2.1 / 6.1)
export const MIN_RUN_SECONDS = 600;

// Transcend (layer 2, design doc 6.1 / roadmap R4)
// Gate for the next Transcend, in lifetime dust of the current layer: 400 x 1.6^k, k = Transcends
// so far, and x3 per step from Transcend TRANSCEND_SLOW_FROM on (R31, the two-regime knob from
// issue #23). The late steps make Transcends past the Chronicle gate slow down, so a Chronicle is
// the better move there and numbers stay in the low quadrillions through year one.
export const TRANSCEND_BASE_GATE = 400;
export const TRANSCEND_GATE_GROWTH = 1.6;
export const TRANSCEND_GATE_GROWTH_LATE = 3;
export const TRANSCEND_SLOW_FROM = 9;
export const TRANSCEND_SHARDS = 2;        // shards paid per Transcend
export { SHARD_AETHER_PER_SHARD } from './GameState.js'; // +25% production per lifetime shard

// Dust-gain links (design doc §5.3). Geode Attunement and Nectar Offering add into one category
// (R53: dust is a fifth root of run Oil, so x2 dust is worth x32 run Oil; compounding them with
// each other made Transcends come in storms, `npm run sim -- --links`).
// Geode Attunement (Excavation -> Dust): +2% per 10 max depth (R53; was +10%)
export const GEODE_PER_10_DEPTH = 0.02;
export function getGeodeAttunementMult(gameState) {
  const depth = gameState.miningGrid?.maxDepth || 0;
  return 1 + GEODE_PER_10_DEPTH * Math.floor(depth / 10);
}

// Celestial Nectar currently held (all of it is consumed on Ascend)
export function getNectarHeld(gameState) {
  return Math.max(0, Math.floor(gameState.garden?.essences?.starNectar || 0));
}

// Nectar Offering (Garden -> Dust): +0.4% x sqrt(nectar), at most +20% (R53; was +2%, max x2).
// Same 2,500 Nectar to reach the cap as before.
export const NECTAR_PER_SQRT = 0.004;
export const NECTAR_MAX_BONUS = 0.2;
export function getNectarOfferingMult(gameState) {
  return 1 + Math.min(NECTAR_MAX_BONUS, NECTAR_PER_SQRT * Math.sqrt(getNectarHeld(gameState)));
}

// Geode Attunement + Nectar Offering together: 1 + both bonuses (R53)
export function getDustLinkMult(gameState) {
  return getGeodeAttunementMult(gameState) + getNectarOfferingMult(gameState) - 1;
}

export class PrestigeSystem {
  constructor(gameState) {
    this.gameState = gameState;
  }

  // Breakdown of the dust-gain multipliers shown on the Ascend button. Shards no longer raise
  // dust gain (R31).
  getDustMultipliers() {
    return {
      depth: this.gameState.miningGrid?.maxDepth || 0,
      geode: getGeodeAttunementMult(this.gameState),
      nectar: getNectarHeld(this.gameState),
      nectarMult: getNectarOfferingMult(this.gameState),
      amplifier: getDustAmplifierMult(this.gameState)   // dust shop Dust Amplifier
    };
  }

  // Calculate pending Cosmic Dust upon Ascension
  // (base x (Geode Attunement + Nectar Offering, one additive category) x Dust Amplifier)
  getPendingCosmicDust() {
    const base = this.getBaseCosmicDust();
    if (base.lte(0)) return base;
    const m = this.getDustMultipliers();
    // tiny epsilon so float noise (e.g. 150 x 1.2 = 179.999...) never floors a whole dust away
    return base.mul(new BigNum(getDustLinkMult(this.gameState) * m.amplifier * (1 + 1e-12))).floor();
  }

  // Base dust from run Aether only, before the dust-gain links
  getBaseCosmicDust() {
    const totalAether = this.gameState.totalAetherEarned;
    if (totalAether.lt(DUST_MIN_AETHER)) return BigNum.zero();

    // DUST_BASE * (Aether / DUST_REF)^DUST_EXPONENT, in BigNum so a huge run can't overflow a
    // double (same float epsilon as getPendingCosmicDust: 16e6 must give exactly 20, not 19)
    return totalAether.div(DUST_REF).pow(DUST_EXPONENT).mul(DUST_BASE * (1 + 1e-12)).floor();
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

    // Attunement (R55): the pick carries over and can be changed until the first purchase.
    // Before applyRunStart, so the generators Cosmic Genesis / Resonant Start grant don't lock it.
    startAttunementRun(this.gameState);
    // Dust shop: Cosmic Genesis, Resonant Start; Finger of Wasta's click count starts again
    applyRunStart(this.gameState);

    // Talent points (R9): no flat grant. S2 pays Record Ascension stars, S1 the first Ascension and
    // (via transcend(), which calls this with force) the Transcend ladder.
    recordAscensionDust(this.gameState, pending);
    checkMilestones(this.gameState);

    // Big tier ceremony (§5.1). Transcend calls ascend(true) and shows its own epic one instead.
    if (!force && !quiet) rewards.notify({ tier: 'big', kind: 'ascension', icon: '✨', color: '#06b6d4', title: t('prestige.toast'), batchTitle: t('prestige.toast_batch'), amount: pending, fmt: (d) => d.format('standard', 0), unit: t('prestige.unit') });
    // A new dust shop tier just opened (Ascension 1 / 3 / 5 / 10 / 20)
    const opened = DUST_SHOP_TIERS.includes(this.gameState.ascensionCount) ? this.gameState.ascensionCount : 0;
    if (opened) {
      const n = DUST_SHOP_ITEMS.filter(d => d.tier === opened).length;
      rewards.notify({ tier: 'medium', kind: 'dust-shop-tier', icon: '🛒', color: '#c084fc', title: t(n === 1 ? 'prestige.shop_tier1' : 'prestige.shop_tier', { n }), detail: t('prestige.shop_tier_detail', { n: opened }) });
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
  // +25% production bonus. `seals` (+1 per lit Seal of Transcendence, up to +3) is spendable only:
  // it goes to fractureShards (the shard tree) and never to totalFractureShards, so the
  // production bonus per Transcend stays the same for every player (doc §6.1).
  getTranscendShards() {
    this.gameState.calendarSystem?.updateSeals?.();
    return { base: TRANSCEND_SHARDS, seals: this.gameState.calendarSystem?.getSealShardBonus?.() || 0 };
  }

  // What Transcend trades, for the confirm dialog and the panel. Lifetime dust of this layer (and
  // so the dust multiplier) goes back to 0; the run, dust and the dust shop reset. In return: +2 shards
  // (+25% production each, permanent) and the next generator tier.
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

    rewards.notify({ tier: 'epic', kind: 'transcend', icon: '🌌', color: '#ec4899', title: t('transcend.toast'), batchTitle: t('transcend.toast_batch'), amount: payout, fmt: (n) => String(n), unit: t('transcend.unit'), detail: sealShards > 0 ? t('transcend.seals', { n: sealShards }) : undefined });
    return true;
  }
}
