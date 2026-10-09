import { BigNum } from '../engine/BigNum.js';
import { getActiveRules } from './ChronicleSystem.js';
import { sound } from '../engine/AudioEngine.js';
import { localize } from '../i18n/index.js';
import { lockAttunement } from './AttunementSystem.js';

export const BUILDING_DEFINITIONS = [
  {
    id: 'tapper',
    name: 'Shawarma Stall',
    desc: 'Extracts delicious rotisserie vapor directly from the ether.',
    icon: '🌯'
  },
  {
    id: 'resonator',
    name: 'Bakhour Burner',
    desc: 'Harmonizes incense frequencies to catalyze good vibes.',
    icon: '🪵'
  },
  {
    id: 'siphon',
    name: 'Foul & Tamees Shop',
    desc: 'Channels subterranean bean energy into glowing reservoirs.',
    icon: '🫘'
  },
  {
    id: 'workshop',
    name: 'Mandi Restaurant',
    desc: 'Autonomous chefs continuously cook pure underground rice.',
    icon: '🍚'
  },
  {
    id: 'crucible',
    name: 'Kaboos Workshop',
    desc: 'Transmutes raw earthly matter into intense drifting horsepower.',
    icon: '🏎️'
  },
  {
    id: 'obelisk',
    name: 'Giant Dallah',
    desc: 'Bends spacetime with pure caffeine to harvest future yields.',
    icon: '🫖'
  },
  {
    id: 'harvester',
    name: 'Boulevard World Kiosk',
    desc: 'Extracts riyals and Oil from wandering tourists.',
    icon: '🎡'
  },
  {
    id: 'observatory',
    name: 'Riyadh Season Ticket',
    desc: 'Captures solar flare photons and massive crowd energy.',
    icon: '🎟️'
  },
  {
    id: 'gateway',
    name: 'King Fahd Causeway',
    desc: 'Interstellar conduit importing matter from distant radiant islands.',
    icon: '🌉'
  },
  {
    id: 'foundry',
    name: 'Ghawar Oil Rig',
    desc: 'Smelts deep ancient fossils into ultra-dense black gold.',
    icon: '🛢️'
  },
  {
    id: 'anchor',
    name: 'SABIC Factory',
    desc: 'Pins parallel universes in place to draw infinite petrochemical power.',
    icon: '🏭'
  },
  {
    id: 'dynamo',
    name: 'Aramco Headquarters',
    desc: 'Orbits a miniature artificial black hole of infinite wealth.',
    icon: '🏢'
  },
  {
    id: 'loom',
    name: 'NEOM The Line',
    desc: 'Weaves the fabric of string theory into a perfectly straight city.',
    icon: '🏙️'
  },
  {
    id: 'matrix',
    name: 'Vision 2030',
    desc: 'A transcendent hyper-computational lattice that calculates the future.',
    icon: '🇸🇦'
  }
];

// Generator ladder (design doc 6.1, roadmaps R4 and R31). Tier k costs TIER1_COST x 10^(k-1) and
// yields TIER1_CPS x 4^(k-1) per second, so each tier takes 2.5x as long to pay for itself as the
// one below (sim-tuned: x5 output per tier made every Transcend too big a jump, see doc 6.1). BASE_TIER_COUNT tiers are open at the start, one more per Transcend, up to
// MAX_TIER_COUNT. Saves key buildings by id, so ids here must never change or be reordered.
// Tiers 21-30 of the old 30-tier ladder are retired (RETIRED_BUILDING_IDS): their ids stay
// reserved, the save step v8 clears them, and they are never offered again.
export const BASE_TIER_COUNT = 8;
export const MAX_TIER_COUNT = 20;
export const TIER1_COST = 10;
export const TIER1_CPS = 0.005;
export const TIER_COST_RATIO = 10;
export const TIER_CPS_RATIO = 4;
export const BUILDING_COST_GROWTH = 1.15;

const GENERATED_TIERS = [
  ['falcon_club', 'Falcon Racing Club', '🦅', 'Trains hyperspace falcons to fetch Oil from passing comets.'],
  ['camel_derby', 'Robot Camel Derby', '🐪', 'Jockey drones race at relativistic speed; the wagers fuel the void.'],
  ['date_vault', 'Date Palm Vault', '🌴', 'Ages sukkari dates until they collapse into sugar stars.'],
  ['kabsa_reactor', 'Kabsa Fusion Reactor', '🍲', 'Fuses rice and saffron at the core of a captive sun.'],
  ['oud_engine', 'Oud Resonance Engine', '🎶', 'Every strummed note splits into a thousand paying echoes.'],
  ['dune_array', 'Dune Solar Array', '☀️', 'Turns the whole Rub al Khali into one shimmering collector.']
];
export const RETIRED_BUILDING_IDS = [
  'mirage_forge', 'qahwa_nebula', 'sadu_loom', 'oasis_gate', 'cosmic_majlis', 'thobe_singularity',
  'hejaz_hyperrail', 'empty_quarter_engine', 'pearl_dyson', 'eternal_dallah'
];

for (const [id, name, icon, desc] of GENERATED_TIERS) BUILDING_DEFINITIONS.push({ id, name, desc, icon });
BUILDING_DEFINITIONS.forEach((def, i) => {
  def.tier = i + 1;
  def.baseCost = new BigNum(TIER1_COST * TIER_COST_RATIO ** i);
  def.baseCps = new BigNum(TIER_CPS_RATIO ** i / (1 / TIER1_CPS));
  def.costMult = BUILDING_COST_GROWTH;
});
localize(BUILDING_DEFINITIONS, 'building', ['name', 'desc']);

// Tiers open to the player: the base tiers plus one per Transcend, capped at MAX_TIER_COUNT
export function getUnlockedTierCount(gameState) {
  const t = Math.max(0, Math.floor(Number(gameState?.transcendenceCount) || 0));
  // A Chronicle challenge may close the upper tiers (Small Souq, R20)
  return Math.min(MAX_TIER_COUNT, BASE_TIER_COUNT + t, getActiveRules(gameState).maxTiers);
}

export const MILESTONES = [10, 25, 50, 100, 150, 200, 250, 300];
export const MILESTONE_MULT = 2;

// id -> definition; the per-frame building UI used to linear-search this list per call
const BUILDING_BY_ID = new Map(BUILDING_DEFINITIONS.map(d => [d.id, d]));

export class BuildingSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.buyAmount = 1; // 1, 10, 25, 100, or 'max'
    this.initBuildings();
  }

  initBuildings() {
    if (!this.gameState.buildings) {
      this.gameState.buildings = {};
    }
    for (const def of BUILDING_DEFINITIONS) {
      if (!this.gameState.buildings[def.id]) {
        this.gameState.buildings[def.id] = {
          count: 0,
          unlocked: false
        };
      }
    }
  }

  getUnlockedTierCount() {
    return getUnlockedTierCount(this.gameState);
  }

  isTierUnlocked(id) {
    const def = BUILDING_BY_ID.get(id);
    return !!def && def.tier <= this.getUnlockedTierCount();
  }

  getTotalBuildingsCount() {
    let count = 0;
    for (const bId in this.gameState.buildings) {
      count += this.gameState.buildings[bId].count || 0;
    }
    return count;
  }

  getBuildingCost(id, countToAdd = 1) {
    const def = BUILDING_BY_ID.get(id);
    if (!def) return BigNum.zero();
    const current = this.gameState.buildings[id].count;

    // Geometric series sum: S = a * (r^n - 1) / (r - 1)
    // where a = baseCost * 1.15^current
    const r = def.costMult;
    const a = def.baseCost.mul(new BigNum(r).pow(current)).mul(this.getCostMultiplier());

    if (countToAdd === 1) return a;

    const factor = new BigNum(r).pow(countToAdd).sub(1).div(r - 1);
    return a.mul(factor);
  }

  getMaxBuyable(id) {
    const def = BUILDING_BY_ID.get(id);
    if (!def || !this.isTierUnlocked(id)) return { count: 0, cost: BigNum.zero() };

    const current = this.gameState.buildings[id].count;
    const r = def.costMult;
    const a = def.baseCost.mul(new BigNum(r).pow(current)).mul(this.getCostMultiplier());
    const budget = this.gameState.aether;

    if (budget.lt(a)) return { count: 0, cost: BigNum.zero() };

    // S = a * (r^n - 1) / (r - 1) <= budget
    // r^n <= 1 + budget * (r - 1) / a
    // n = floor(log_r(1 + budget * (r - 1) / a))
    const ratio = budget.mul(r - 1).div(a).toNumber();
    let n = Math.floor(Math.log(1 + Math.max(0, ratio)) / Math.log(r));
    n = Math.max(0, Math.min(10000, n));

    // The log estimate is off by one either way from float noise: with exactly the Aether
    // for n buildings it often returned n - 1. Settle it against the real cost sum.
    let totalCost = this.getBuildingCost(id, n);
    while (n < 10000 && budget.gte(this.getBuildingCost(id, n + 1))) {
      n++;
      totalCost = this.getBuildingCost(id, n);
    }
    while (n > 0 && budget.lt(totalCost)) {
      n--;
      totalCost = this.getBuildingCost(id, n);
    }
    return { count: n, cost: totalCost };
  }

  // quiet: no buy sound (dust shop Auto-Buy buys in the background)
  buyBuilding(id, { quiet = false } = {}) {
    const def = BUILDING_BY_ID.get(id);
    if (!def || !this.isTierUnlocked(id)) return false;

    let toBuy = 1;
    let cost = BigNum.zero();

    if (this.buyAmount === 'max') {
      const maxInfo = this.getMaxBuyable(id);
      toBuy = maxInfo.count;
      cost = maxInfo.cost;
    } else {
      toBuy = this.buyAmount;
      cost = this.getBuildingCost(id, toBuy);
    }

    if (toBuy > 0 && this.gameState.aether.gte(cost)) {
      this.gameState.aether = this.gameState.aether.sub(cost);
      this.gameState.buildings[id].count += toBuy;
      lockAttunement(this.gameState);   // R55: the run's attunement is set from the first purchase
      if (!quiet) sound.playBuy();

      // Check bounties
      if (this.gameState.bountySystem) {
        this.gameState.bountySystem.checkProgress('buy_building', toBuy);
      }
      return true;
    }

    return false;
  }

  // x2 at each of MILESTONES owned (R31: 8 steps, x256 in all; was 9 steps up to 1,000)
  getMilestoneMultiplier(count) {
    let mult = 1;
    for (const need of MILESTONES) {
      if (count >= need) mult *= MILESTONE_MULT;
    }
    // Harmonic Array talent: +15% milestone multipliers per rank
    if (mult > 1) mult *= 1 + (this.gameState.talents?.synergy_resonance?.rank || 0) * 0.15;
    return mult;
  }

  // Architect Blueprint talent: -4% building costs per rank
  getCostMultiplier() {
    return 1 - (this.gameState.talents?.cost_reduction?.rank || 0) * 0.04;
  }

  // countOverride: production as if the tier had that many (R51 buy gain); default = owned
  getBuildingProduction(id, countOverride) {
    const def = BUILDING_BY_ID.get(id);
    if (!def) return BigNum.zero();
    const count = countOverride ?? this.gameState.buildings[id].count;
    if (count <= 0) return BigNum.zero();

    let prod = def.baseCps.mul(count);
    const milestoneMult = this.getMilestoneMultiplier(count);
    prod = prod.mul(milestoneMult);

    // Upgrade shop (R5): x1.2 per tier upgrade bought, synergies (UpgradeSystem.getTierUpgradeMult)
    const upgradeMult = this.gameState.getTierUpgradeMult?.(id) ?? 1;
    if (upgradeMult !== 1) prod = prod.mul(upgradeMult);

    // Apply talent perks
    if (this.gameState.talents && this.gameState.talents['building_efficiency']) {
      prod = prod.mul(1 + this.gameState.talents['building_efficiency'].rank * 0.1);
    }

    return prod;
  }

  // R51: what the current buy amount would be. MAX with nothing affordable shows the next one.
  getBuyPlan(id) {
    let count = this.buyAmount;
    if (count === 'max') {
      const m = this.getMaxBuyable(id);
      if (m.count > 0) return { count: m.count, cost: m.cost };
      count = 1;
    }
    return { count, cost: this.getBuildingCost(id, count) };
  }

  // R51: marginal CPS of buying `n` more (milestones, upgrades and talents included)
  getBuyGain(id, n = 1) {
    const have = this.gameState.buildings[id].count;
    return this.getBuildingProduction(id, have + n).sub(this.getBuildingProduction(id, have));
  }

  // R51: unlocked tier with the best affordable gain per cost for the current buy amount, or null.
  // Ties go to the lower tier (definitions are in tier order, strict > keeps the first).
  getBestValueId() {
    let bestId = null;
    let best = -1;
    for (const def of BUILDING_DEFINITIONS) {
      if (!this.isTierUnlocked(def.id)) continue;
      const { count, cost } = this.getBuyPlan(def.id);
      if (count <= 0 || this.gameState.aether.lt(cost)) continue;
      const ratio = this.getBuyGain(def.id, count).div(cost).toNumber();
      if (ratio > best) { best = ratio; bestId = def.id; }
    }
    return bestId;
  }

  getTotalProduction() {
    let total = BigNum.zero();
    for (const def of BUILDING_DEFINITIONS) {
      total = total.add(this.getBuildingProduction(def.id));
    }
    return total;
  }
}
