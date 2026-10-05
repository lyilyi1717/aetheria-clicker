import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';

export const BUILDING_DEFINITIONS = [
  {
    id: 'tapper',
    name: 'Aether Tapper',
    desc: 'Extracts vaporous aether directly from the ambient etheric field.',
    icon: '🔮',
    baseCost: new BigNum(15),
    baseCps: new BigNum(1),
    costMult: 1.15
  },
  {
    id: 'resonator',
    name: 'Arcane Resonator',
    desc: 'Harmonizes crystal frequencies to catalyze latent energy waves.',
    icon: '💎',
    baseCost: new BigNum(100),
    baseCps: new BigNum(8),
    costMult: 1.15
  },
  {
    id: 'siphon',
    name: 'Mana Siphon',
    desc: 'Channels subterranean leylines into glowing reservoirs.',
    icon: '💧',
    baseCost: new BigNum(1100),
    baseCps: new BigNum(48),
    costMult: 1.15
  },
  {
    id: 'workshop',
    name: 'Golem Workshop',
    desc: 'Autonomous clockwork automata continuously chisel pure aetherium.',
    icon: '⚙️',
    baseCost: new BigNum(12000),
    baseCps: new BigNum(260),
    costMult: 1.15
  },
  {
    id: 'crucible',
    name: 'Alchemical Crucible',
    desc: 'Transmutes raw earthly matter into incandescent aether streams.',
    icon: '🧪',
    baseCost: new BigNum(130000),
    baseCps: new BigNum(1400),
    costMult: 1.15
  },
  {
    id: 'obelisk',
    name: 'Chrono Obelisk',
    desc: 'Bends local spacetime forward to harvest future yields.',
    icon: '⏳',
    baseCost: new BigNum(1400000),
    baseCps: new BigNum(7800),
    costMult: 1.15
  },
  {
    id: 'harvester',
    name: 'Void Harvester',
    desc: 'Opens miniature tears into the dark realm to extract anti-aether.',
    icon: '🌌',
    baseCost: new BigNum(20000000),
    baseCps: new BigNum(44000),
    costMult: 1.15
  },
  {
    id: 'observatory',
    name: 'Celestial Observatory',
    desc: 'Captures solar flare photons and stellar radiation pulses.',
    icon: '🔭',
    baseCost: new BigNum(330000000),
    baseCps: new BigNum(260000),
    costMult: 1.15
  },
  {
    id: 'gateway',
    name: 'Astral Gateway',
    desc: 'Interstellar conduit importing matter from distant radiant nebulas.',
    icon: '🚪',
    baseCost: new BigNum(5100000000),
    baseCps: new BigNum(1600000),
    costMult: 1.15
  },
  {
    id: 'foundry',
    name: 'Stellar Foundry',
    desc: 'Smelts supernova remnants into ultra-dense tachyon energy.',
    icon: '☀️',
    baseCost: new BigNum(75000000000),
    baseCps: new BigNum(10000000),
    costMult: 1.15
  },
  {
    id: 'anchor',
    name: 'Dimensional Anchor',
    desc: 'Pins parallel universes in place to draw infinite ambient power.',
    icon: '⚓',
    baseCost: new BigNum(1200000000000),
    baseCps: new BigNum(65000000),
    costMult: 1.15
  },
  {
    id: 'dynamo',
    name: 'Singularity Dynamo',
    desc: 'Orbits a miniature artificial black hole, capturing Hawking radiation.',
    icon: '🌀',
    baseCost: new BigNum(20000000000000),
    baseCps: new BigNum(430000000),
    costMult: 1.15
  },
  {
    id: 'loom',
    name: 'Cosmic Loom',
    desc: 'Weaves the fabric of string theory into concentrated reality.',
    icon: '🕸️',
    baseCost: new BigNum(350000000000000),
    baseCps: new BigNum(2900000000),
    costMult: 1.15
  },
  {
    id: 'matrix',
    name: 'Infinity Matrix',
    desc: 'A transcendent hyper-computational lattice that calculates infinity.',
    icon: '💠',
    baseCost: new BigNum(6200000000000000),
    baseCps: new BigNum(21000000000),
    costMult: 1.15
  }
];

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

  getTotalBuildingsCount() {
    let count = 0;
    for (const bId in this.gameState.buildings) {
      count += this.gameState.buildings[bId].count || 0;
    }
    return count;
  }

  getBuildingCost(id, countToAdd = 1) {
    const def = BUILDING_DEFINITIONS.find(b => b.id === id);
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
    const def = BUILDING_DEFINITIONS.find(b => b.id === id);
    if (!def) return { count: 0, cost: BigNum.zero() };

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

    const totalCost = this.getBuildingCost(id, n);
    return { count: n, cost: totalCost };
  }

  buyBuilding(id) {
    const def = BUILDING_DEFINITIONS.find(b => b.id === id);
    if (!def) return false;

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
    const def = BUILDING_DEFINITIONS.find(b => b.id === id);
    if (!def) return BigNum.zero();
    const count = this.gameState.buildings[id].count;
    if (count <= 0) return BigNum.zero();

    let prod = def.baseCps.mul(count);
    const milestoneMult = this.getMilestoneMultiplier(count);
    prod = prod.mul(milestoneMult);

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
