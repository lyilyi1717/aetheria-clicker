import { BigNum } from '../engine/BigNum.js';
import { getActiveRules } from './ChronicleSystem.js';
import { sound } from '../engine/AudioEngine.js';

export const BUILDING_DEFINITIONS = [
  {
    id: 'tapper',
    name: 'Shawarma Stall',
    desc: 'Extracts delicious rotisserie vapor directly from the ether.',
    icon: '🌯',
    baseCost: new BigNum(15),
    baseCps: new BigNum(1),
    costMult: 1.15
  },
  {
    id: 'resonator',
    name: 'Bakhour Burner',
    desc: 'Harmonizes incense frequencies to catalyze good vibes.',
    icon: '🪵',
    baseCost: new BigNum(100),
    baseCps: new BigNum(8),
    costMult: 1.15
  },
  {
    id: 'siphon',
    name: 'Foul & Tamees Shop',
    desc: 'Channels subterranean bean energy into glowing reservoirs.',
    icon: '🫘',
    baseCost: new BigNum(1100),
    baseCps: new BigNum(48),
    costMult: 1.15
  },
  {
    id: 'workshop',
    name: 'Mandi Restaurant',
    desc: 'Autonomous chefs continuously cook pure underground rice.',
    icon: '🍚',
    baseCost: new BigNum(12000),
    baseCps: new BigNum(260),
    costMult: 1.15
  },
  {
    id: 'crucible',
    name: 'Kaboos Workshop',
    desc: 'Transmutes raw earthly matter into intense drifting horsepower.',
    icon: '🏎️',
    baseCost: new BigNum(130000),
    baseCps: new BigNum(1400),
    costMult: 1.15
  },
  {
    id: 'obelisk',
    name: 'Giant Dallah',
    desc: 'Bends spacetime with pure caffeine to harvest future yields.',
    icon: '🫖',
    baseCost: new BigNum(1400000),
    baseCps: new BigNum(7800),
    costMult: 1.15
  },
  {
    id: 'harvester',
    name: 'Boulevard World Kiosk',
    desc: 'Extracts riyals and aether from wandering tourists.',
    icon: '🎡',
    baseCost: new BigNum(20000000),
    baseCps: new BigNum(44000),
    costMult: 1.15
  },
  {
    id: 'observatory',
    name: 'Riyadh Season Ticket',
    desc: 'Captures solar flare photons and massive crowd energy.',
    icon: '🎟️',
    baseCost: new BigNum(330000000),
    baseCps: new BigNum(260000),
    costMult: 1.15
  },
  {
    id: 'gateway',
    name: 'King Fahd Causeway',
    desc: 'Interstellar conduit importing matter from distant radiant islands.',
    icon: '🌉',
    baseCost: new BigNum(5100000000),
    baseCps: new BigNum(1600000),
    costMult: 1.15
  },
  {
    id: 'foundry',
    name: 'Ghawar Oil Rig',
    desc: 'Smelts deep ancient fossils into ultra-dense black gold.',
    icon: '🛢️',
    baseCost: new BigNum(75000000000),
    baseCps: new BigNum(10000000),
    costMult: 1.15
  },
  {
    id: 'anchor',
    name: 'SABIC Factory',
    desc: 'Pins parallel universes in place to draw infinite petrochemical power.',
    icon: '🏭',
    baseCost: new BigNum(1200000000000),
    baseCps: new BigNum(65000000),
    costMult: 1.15
  },
  {
    id: 'dynamo',
    name: 'Aramco Headquarters',
    desc: 'Orbits a miniature artificial black hole of infinite wealth.',
    icon: '🏢',
    baseCost: new BigNum(20000000000000),
    baseCps: new BigNum(430000000),
    costMult: 1.15
  },
  {
    id: 'loom',
    name: 'NEOM The Line',
    desc: 'Weaves the fabric of string theory into a perfectly straight city.',
    icon: '🏙️',
    baseCost: new BigNum(350000000000000),
    baseCps: new BigNum(2900000000),
    costMult: 1.15
  },
  {
    id: 'matrix',
    name: 'Vision 2030',
    desc: 'A transcendent hyper-computational lattice that calculates the future.',
    icon: '🇸🇦',
    baseCost: new BigNum(6200000000000000),
    baseCps: new BigNum(21000000000),
    costMult: 1.15
  }
];

// Generator ladder (design doc 6.1, roadmap R4): the 14 hand-written tiers above, then one new
// tier per Transcend up to 30. Tier n costs x18 and yields x7 over tier n-1 (the hand-written
// ladder's own average ratios). Generated from fixed data so every build makes the same ids,
// costs and yields: saves key buildings by id, so ids here must never change or be reordered.
export const BASE_TIER_COUNT = 14;
export const MAX_TIER_COUNT = 30;
export const TIER_COST_RATIO = 18;
export const TIER_CPS_RATIO = 7;

const GENERATED_TIERS = [
  ['falcon_club', 'Falcon Racing Club', '🦅', 'Trains hyperspace falcons to fetch aether from passing comets.'],
  ['camel_derby', 'Robot Camel Derby', '🐪', 'Jockey drones race at relativistic speed; the wagers fuel the void.'],
  ['date_vault', 'Date Palm Vault', '🌴', 'Ages sukkari dates until they collapse into sugar stars.'],
  ['kabsa_reactor', 'Kabsa Fusion Reactor', '🍲', 'Fuses rice and saffron at the core of a captive sun.'],
  ['oud_engine', 'Oud Resonance Engine', '🎶', 'Every strummed note splits into a thousand paying echoes.'],
  ['dune_array', 'Dune Solar Array', '☀️', 'Turns the whole Rub al Khali into one shimmering collector.'],
  ['mirage_forge', 'Mirage Forge', '🏜️', 'Hammers heat-shimmer mirages into solid, sellable reality.'],
  ['qahwa_nebula', 'Qahwa Nebula', '☕', 'A cardamom cloud where new galaxies are brewed and poured.'],
  ['sadu_loom', 'Sadu Star Loom', '🧶', 'Weaves constellations into rugs that pay rent across dimensions.'],
  ['oasis_gate', 'Oasis Wormhole', '🌀', 'Every spring in the desert opens onto a richer universe.'],
  ['cosmic_majlis', 'Cosmic Majlis', '🛋️', 'Elder gods drop by for coffee and leave tips the size of planets.'],
  ['thobe_singularity', 'Thobe Singularity', '👘', 'A perfectly ironed thobe so crisp it bends spacetime.'],
  ['hejaz_hyperrail', 'Hejaz Hyperrail', '🚄', 'The old railway, rebuilt to run between parallel timelines.'],
  ['empty_quarter_engine', 'Empty Quarter Engine', '🌌', 'Harvests the nothing between grains of sand. There is a lot of it.'],
  ['pearl_dyson', 'Pearl-Diver Dyson Sphere', '🦪', 'Divers wrap a star in nacre and harvest its glow.'],
  ['eternal_dallah', 'The Eternal Dallah', '🏺', 'Pours a coffee that never ends, and so neither does the Aether.']
];

{
  const top = BUILDING_DEFINITIONS[BASE_TIER_COUNT - 1];
  GENERATED_TIERS.forEach(([id, name, icon, desc], i) => {
    const step = i + 1;
    BUILDING_DEFINITIONS.push({
      id, name, desc, icon,
      baseCost: top.baseCost.mul(new BigNum(TIER_COST_RATIO).pow(step)),
      baseCps: top.baseCps.mul(new BigNum(TIER_CPS_RATIO).pow(step)),
      costMult: 1.15
    });
  });
  BUILDING_DEFINITIONS.forEach((def, i) => { def.tier = i + 1; });
}

// Tiers open to the player: the 14 base tiers plus one per Transcend, capped at 30
export function getUnlockedTierCount(gameState) {
  const t = Math.max(0, Math.floor(Number(gameState?.transcendenceCount) || 0));
  // A Chronicle challenge may close the upper tiers (Small Souq, R20)
  return Math.min(MAX_TIER_COUNT, BASE_TIER_COUNT + t, getActiveRules(gameState).maxTiers);
}

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

  buyBuilding(id) {
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
      sound.playBuy();

      // Check bounties
      if (this.gameState.bountySystem) {
        this.gameState.bountySystem.checkProgress('buy_building', toBuy);
      }
      return true;
    }

    return false;
  }

  getMilestoneMultiplier(count) {
    let mult = 1;
    const milestones = [10, 25, 50, 100, 150, 200, 250, 500, 1000];
    const boosts = [2, 2, 2, 2, 3, 3, 4, 5, 10];
    for (let i = 0; i < milestones.length; i++) {
      if (count >= milestones[i]) {
        mult *= boosts[i];
      }
    }
    // Harmonic Array talent: +15% milestone multipliers per rank
    if (mult > 1) mult *= 1 + (this.gameState.talents?.synergy_resonance?.rank || 0) * 0.15;
    return mult;
  }

  // Architect Blueprint talent: -4% building costs per rank
  getCostMultiplier() {
    return 1 - (this.gameState.talents?.cost_reduction?.rank || 0) * 0.04;
  }

  getBuildingProduction(id) {
    const def = BUILDING_BY_ID.get(id);
    if (!def) return BigNum.zero();
    const count = this.gameState.buildings[id].count;
    if (count <= 0) return BigNum.zero();

    let prod = def.baseCps.mul(count);
    const milestoneMult = this.getMilestoneMultiplier(count);
    prod = prod.mul(milestoneMult);

    // Upgrade shop (R5): x1.25 per tier upgrade bought, synergies (UpgradeSystem.getTierUpgradeMult)
    const upgradeMult = this.gameState.getTierUpgradeMult?.(id) ?? 1;
    if (upgradeMult !== 1) prod = prod.mul(upgradeMult);

    // Apply talent perks
    if (this.gameState.talents && this.gameState.talents['building_efficiency']) {
      prod = prod.mul(1 + this.gameState.talents['building_efficiency'].rank * 0.1);
    }

    return prod;
  }

  getTotalProduction() {
    let total = BigNum.zero();
    for (const def of BUILDING_DEFINITIONS) {
      total = total.add(this.getBuildingProduction(def.id));
    }
    return total;
  }
}
