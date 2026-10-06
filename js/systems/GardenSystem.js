import { recordHarvest } from './TalentSources.js';
import { sound } from '../engine/AudioEngine.js';
import { particles } from '../engine/ParticleEngine.js';

// Grow times are ×15 the v1.x values (§5.2): 5 min / 11 min / 19 min / 30 min / 1 h / 2 h.
export const SEED_TYPES = {
  spore: { id: 'spore', name: 'Mint Leaf', icon: '🌿', growTime: 300, desc: 'Yields Fresh Mint' },
  mana_lily: { id: 'mana_lily', name: 'Hasawi Lemon', icon: '🍋', growTime: 675, desc: 'Restores Mana & yields Lemon Drops' },
  solar_fern: { id: 'solar_fern', name: 'Desert Truffle (Fagga)', icon: '🥔', growTime: 1125, desc: 'Yields Truffle Oil' },
  frost_petal: { id: 'frost_petal', name: 'Rose of Taif', icon: '🌹', growTime: 1800, desc: 'Yields Taif Rosewater' },
  void_orchid: { id: 'void_orchid', name: 'Date Palm', icon: '🌴', growTime: 3600, desc: 'Yields Golden Dates' },
  star_lotus: { id: 'star_lotus', name: 'Sidr Tree', icon: '🌳', growTime: 7200, desc: 'Yields Sidr Honey' }
};

// Water All (§5.2): +30 s growth on a 60 s cooldown
export const WATER_BOOST = 30;
export const WATER_COOLDOWN = 60;

// Garden Golems (§5.6): golem k automates row k (plots 4k..4k+3)
export const MAX_GOLEMS = 4;
export const PLOTS_PER_ROW = 4;
export const GOLEM_OFFLINE_EFFICIENCY = 0.5;
export const GOLEM_OFFLINE_CAP = 12 * 3600; // seconds

export function getGolemCost(k) {
  return { stone: 150 * Math.pow(8, k), manaSap: 10 * Math.pow(3, k) };
}

const ESSENCE_BY_SEED = {
  spore: 'sporePowder',
  mana_lily: 'manaSap',
  solar_fern: 'solarDew',
  frost_petal: 'cryoEssence',
  void_orchid: 'voidPollen',
  star_lotus: 'starNectar'
};

export const ESSENCE_NAMES = {
  sporePowder: 'Fresh Mint',
  manaSap: 'Lemon Drops',
  solarDew: 'Truffle Oil',
  cryoEssence: 'Taif Rosewater',
  voidPollen: 'Golden Dates',
  starNectar: 'Sidr Honey'
};

// --- Breeding, golden mutation, hybrids (R17, §2.4) ---
// Golden mutation: 1% of harvests; that harvest yields x3 essence and is logged in the Herbarium.
export const GOLDEN_CHANCE = 0.01;
export const GOLDEN_ESSENCE_MULT = 3;

// Cross-breeding two adjacent mature plants of the right pair may yield a hybrid essence.
// Neighbouring tiers cross at 30%; the Mint x Sidr long cross is rarer at 15%. A cross harvests
// both plants exactly as a normal harvest would, so a miss costs nothing.
export const HYBRIDS = {
  limonana: { id: 'limonana', name: 'Limonana', icon: '🍹', parents: ['spore', 'mana_lily'], chance: 0.30 },
  truffleZest: { id: 'truffleZest', name: 'Lemon Truffle Zest', icon: '🍋', parents: ['mana_lily', 'solar_fern'], chance: 0.30 },
  roseTruffle: { id: 'roseTruffle', name: 'Rose Truffle Jam', icon: '🥘', parents: ['solar_fern', 'frost_petal'], chance: 0.30 },
  roseDate: { id: 'roseDate', name: 'Rose Date Syrup', icon: '🍯', parents: ['frost_petal', 'void_orchid'], chance: 0.30 },
  honeyDate: { id: 'honeyDate', name: 'Honeyed Dates', icon: '🌴', parents: ['void_orchid', 'star_lotus'], chance: 0.30 },
  mintHoney: { id: 'mintHoney', name: 'Mint Honey Tea', icon: '🍵', parents: ['spore', 'star_lotus'], chance: 0.15 }
};

export const HYBRID_ESSENCE_NAMES = Object.fromEntries(Object.values(HYBRIDS).map(h => [h.id, h.name]));

export function getHybridForPair(seedA, seedB) {
  for (const h of Object.values(HYBRIDS)) {
    if ((h.parents[0] === seedA && h.parents[1] === seedB) || (h.parents[0] === seedB && h.parents[1] === seedA)) return h;
  }
  return null;
}

export class GardenSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.selectedSeed = 'spore';
    this.rng = Math.random; // injectable for tests
    this.initGarden();
  }

  // Water All cooldown lives in the saved garden slice: as a plain field on the system it
  // reset on every reload, so a reload spam gave +30 s growth to every plot each time.
  get waterCooldown() {
    return this.gameState.garden?.waterCooldown || 0;
  }

  set waterCooldown(v) {
    if (this.gameState.garden) this.gameState.garden.waterCooldown = v;
  }

  initGarden() {
    if (!this.gameState.garden) {
      const spore = SEED_TYPES.spore.growTime;
      const plots = [];
      for (let i = 0; i < 16; i++) {
        plots.push({
          id: i,
          seed: i < 4 ? 'spore' : null,
          progress: i < 4 ? spore - 5 : 0, // starter plots are 5 s from ready (first-minute feel)
          maxTime: i < 4 ? spore : 0,
          stage: i < 4 ? 'blooming' : 'empty', // empty, seed, sprout, blooming, mature
          fertilized: false
        });
      }
      this.gameState.garden = {
        plots,
        inventory: {
          spore: 5,
          mana_lily: 2,
          solar_fern: 1,
          frost_petal: 0,
          void_orchid: 0,
          star_lotus: 0
        },
        essences: {
          sporePowder: 0,
          manaSap: 0,
          solarDew: 0,
          cryoEssence: 0,
          voidPollen: 0,
          starNectar: 0
        },
        golems: 0,
        rowSeed: [null, null, null, null]
      };
    }

    // Save migration (§9): plants already in the ground keep their stored maxTime and
    // finish on old timers; only new plantings use the ×15 times. Golem fields are new.
    const garden = this.gameState.garden;
    const golems = Math.floor(Number(garden.golems));
    garden.golems = Number.isFinite(golems) ? Math.max(0, Math.min(MAX_GOLEMS, golems)) : 0;
    if (!Array.isArray(garden.rowSeed)) garden.rowSeed = [];
    for (let r = 0; r < MAX_GOLEMS; r++) {
      if (!SEED_TYPES[garden.rowSeed[r]]) garden.rowSeed[r] = null;
    }
    garden.rowSeed.length = MAX_GOLEMS;
    // R17 fields: hybrid essences, Herbarium (golden finds) and the breeding unlock all default
    // for saves that predate them.
    if (!garden.essences || typeof garden.essences !== 'object') garden.essences = {};
    for (const id in HYBRIDS) {
      const n = Number(garden.essences[id]);
      garden.essences[id] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    }
    if (!garden.herbarium || typeof garden.herbarium !== 'object') garden.herbarium = {};
    for (const key of ['golden', 'hybrids']) {
      if (!garden.herbarium[key] || typeof garden.herbarium[key] !== 'object') garden.herbarium[key] = {};
    }
    garden.breedingUnlocked = garden.breedingUnlocked === true;
    const cd = Number(garden.waterCooldown);
    garden.waterCooldown = Number.isFinite(cd) ? Math.max(0, Math.min(WATER_COOLDOWN, cd)) : 0;
  }

  // --- Breeding (R17) ---
  // Breeding is a Transcend-tier feature (shard tree "Oasis" branch, §6.3). Until the shard tree
  // ships, the first Transcend unlocks it; `garden.breedingUnlocked` lets the tree set it later.
  isBreedingUnlocked() {
    return this.gameState.garden.breedingUnlocked === true || (this.gameState.transcendenceCount || 0) >= 1;
  }

  arePlotsAdjacent(a, b) {
    if (!Number.isInteger(a) || !Number.isInteger(b) || a === b) return false;
    const dr = Math.abs(Math.floor(a / PLOTS_PER_ROW) - Math.floor(b / PLOTS_PER_ROW));
    const dc = Math.abs((a % PLOTS_PER_ROW) - (b % PLOTS_PER_ROW));
    return dr + dc === 1;
  }

  isPlotMature(plot) {
    return !!plot && !!plot.seed && plot.maxTime > 0 && plot.progress >= plot.maxTime;
  }

  // Which hybrid two plots could cross into, or null if they cannot breed right now.
  getBreedingOutcome(a, b) {
    const plots = this.gameState.garden.plots;
    if (!this.isBreedingUnlocked() || !this.arePlotsAdjacent(a, b)) return null;
    const pa = plots[a], pb = plots[b];
    if (!this.isPlotMature(pa) || !this.isPlotMature(pb)) return null;
    return getHybridForPair(pa.seed, pb.seed);
  }

  // Cross two adjacent mature plots. Both are harvested as normal; the cross then rolls for a
  // hybrid essence (1-2 units). Returns { ok, hybrid, amount, chance }.
  breedPlots(a, b, clientX, clientY) {
    const hybrid = this.getBreedingOutcome(a, b);
    if (!hybrid) return { ok: false };
    this.harvestPlot(a, clientX, clientY, true);
    this.harvestPlot(b, clientX, clientY, true);
    const garden = this.gameState.garden;
    let amount = 0;
    if (this.rng() < hybrid.chance) {
      amount = 1 + Math.floor(this.rng() * 2);
      garden.essences[hybrid.id] = (garden.essences[hybrid.id] || 0) + amount;
      garden.herbarium.hybrids[hybrid.id] = (garden.herbarium.hybrids[hybrid.id] || 0) + amount;
      if (clientX && clientY) particles.spawnFloatingText(clientX, clientY - 45, `HYBRID: +${amount} ${hybrid.name}!`, '#f472b6', true);
      sound.playAchievement();
    }
    return { ok: true, hybrid: hybrid.id, amount, chance: hybrid.chance };
  }

  // --- Garden Golems (§5.6) ---
  getRowOfPlot(plotIndex) {
    return Math.floor(plotIndex / PLOTS_PER_ROW);
  }

  isRowAutomated(row) {
    return row < (this.gameState.garden.golems || 0);
  }

  getNextGolemCost() {
    const k = this.gameState.garden.golems || 0;
    return k >= MAX_GOLEMS ? null : getGolemCost(k);
  }

  canBuyGolem() {
    const cost = this.getNextGolemCost();
    if (!cost) return false;
    return numOf(this.gameState.inventory?.stone) >= cost.stone &&
      (this.gameState.garden.essences.manaSap || 0) >= cost.manaSap;
  }

  buyGolem() {
    if (!this.canBuyGolem()) return false;
    const cost = this.getNextGolemCost();
    const inv = this.gameState.inventory;
    inv.stone = subNum(inv.stone, cost.stone);
    this.gameState.garden.essences.manaSap -= cost.manaSap;
    this.gameState.garden.golems++;
    sound.playBuy();
    return true;
  }

  setRowSeed(row, seedType) {
    if (row < 0 || row >= MAX_GOLEMS) return false;
    this.gameState.garden.rowSeed[row] = SEED_TYPES[seedType] ? seedType : null;
    return true;
  }

  // Seed a golem plants into an empty plot of this row: the seed just harvested if any is
  // left, else the row's fallback seed, else (no fallback set) the highest tier owned.
  // Returns null when the row has nothing to plant.
  getRowPlantSeed(row, preferSeed = null) {
    const inv = this.gameState.garden.inventory;
    if (preferSeed && (inv[preferSeed] || 0) > 0) return preferSeed;
    const fallback = this.gameState.garden.rowSeed[row];
    if (fallback) return (inv[fallback] || 0) > 0 ? fallback : null;
    const ids = Object.keys(SEED_TYPES);
    for (let i = ids.length - 1; i >= 0; i--) {
      if ((inv[ids[i]] || 0) > 0) return ids[i];
    }
    return null;
  }

  // Row badge state for the UI: 'locked' | 'active' | 'noseeds'
  getRowStatus(row) {
    if (!this.isRowAutomated(row)) return 'locked';
    const plots = this.gameState.garden.plots;
    for (let i = row * PLOTS_PER_ROW; i < (row + 1) * PLOTS_PER_ROW; i++) {
      if (plots[i] && !plots[i].seed && !this.getRowPlantSeed(row)) return 'noseeds';
    }
    return 'active';
  }

  // Harvest-then-replant for one golem-owned plot. Golems never water or fertilize.
  // Returns true if it harvested.
  golemTend(plotIndex) {
    const plot = this.gameState.garden.plots[plotIndex];
    if (!plot) return false;
    let harvested = false;
    let lastSeed = null;
    if (plot.seed && plot.progress >= plot.maxTime) {
      lastSeed = plot.seed;
      harvested = this.harvestPlot(plotIndex, undefined, undefined, true);
    }
    if (!plot.seed) {
      const seed = this.getRowPlantSeed(this.getRowOfPlot(plotIndex), lastSeed);
      if (seed) this.plantSeed(plotIndex, seed, true);
    }
    return harvested;
  }

  // Offline garden (§5.6). Call once at load with the real seconds away.
  // Golem rows keep harvesting and replanting at `efficiency` speed (default 50%) for up
  // to 12 h; other plots just keep growing (at most one harvest waiting).
  // Returns { harvests, seconds } for the offline modal.
  applyOfflineTime(seconds, efficiency = GOLEM_OFFLINE_EFFICIENCY) {
    const garden = this.gameState.garden;
    if (!garden || !(seconds > 0)) return { harvests: 0, seconds: 0 };
    const capped = Math.min(seconds, GOLEM_OFFLINE_CAP);
    const budgetTotal = capped * efficiency * this.getGrowthMultiplier();
    let harvests = 0;

    for (const plot of garden.plots) {
      if (!this.isRowAutomated(this.getRowOfPlot(plot.id))) {
        if (plot.seed && plot.progress < plot.maxTime) {
          plot.progress = Math.min(plot.maxTime, plot.progress + budgetTotal);
        }
        this.updateStage(plot);
        continue;
      }

      // Golem plot: harvest each time it matures, replant, repeat. Every harvest returns
      // its seed, so the same seed can always be replanted once a cycle starts. Bounded by
      // budget / growTime (≤ 72 cycles per plot at 5 min, 50%, 12 h).
      let budget = budgetTotal;
      let guard = 1000;
      while (guard-- > 0) {
        if (!plot.seed) {
          this.golemTend(plot.id);
          if (!plot.seed) break; // no seeds for this row
        }
        const need = plot.maxTime - plot.progress;
        if (need > budget) {
          plot.progress += budget;
          break;
        }
        budget -= Math.max(0, need);
        plot.progress = plot.maxTime;
        if (this.golemTend(plot.id)) harvests++;
        else break;
      }
      this.updateStage(plot);
    }
    return { harvests, seconds: capped };
  }

  // --- Planting / harvesting ---
  plantSeed(plotIndex, seedType = this.selectedSeed, silent = false) {
    const garden = this.gameState.garden;
    const plot = garden.plots[plotIndex];
    if (!plot || plot.seed !== null) return false;

    if ((garden.inventory[seedType] || 0) <= 0) return false;

    garden.inventory[seedType]--;
    const def = SEED_TYPES[seedType];
    plot.seed = seedType;
    plot.progress = 0;
    plot.maxTime = def.growTime;
    plot.stage = 'seed';
    plot.fertilized = false;

    if (!silent) sound.playBuy();
    return true;
  }

  waterAll() {
    if (this.waterCooldown > 0) return false;
    this.waterCooldown = WATER_COOLDOWN;
    sound.playSpell();

    for (const plot of this.gameState.garden.plots) {
      if (plot.seed && plot.stage !== 'mature') {
        plot.progress = Math.min(plot.maxTime, plot.progress + WATER_BOOST);
      }
    }
    particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `💧 GARDEN WATERED (+${WATER_BOOST}s Growth)`, '#38bdf8', true);
    return true;
  }

  // Fertilize (§5.2): 1 Spore Powder per growing plot; that plot's next harvest yields ×2 essence.
  fertilizeAll() {
    const garden = this.gameState.garden;
    let count = 0;
    for (const plot of garden.plots) {
      if ((garden.essences.sporePowder || 0) < 1) break;
      if (plot.seed && !plot.fertilized && plot.progress < plot.maxTime) {
        garden.essences.sporePowder--;
        plot.fertilized = true;
        count++;
      }
    }
    if (count > 0) {
      sound.playSpell();
      particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `🧪 ${count} PLOTS FERTILIZED (×2 next harvest)`, '#a3e635', true);
    }
    return count;
  }

  harvestPlot(plotIndex, clientX, clientY, silent = false) {
    const plot = this.gameState.garden.plots[plotIndex];
    if (!plot || !plot.seed || (plot.stage !== 'mature' && plot.progress < plot.maxTime)) return false;

    if (!silent) sound.playGem();
    this.gameState.stats.totalPlantsHarvested++;

    const seedId = plot.seed;
    recordHarvest(this.gameState, seedId); // R9 first-harvest stars
    const isFertilized = plot.fertilized;
    const fertMult = isFertilized ? 2 : 1;
    // Golden mutation: 1% of harvests, x3 essence, logged in the Herbarium.
    const golden = this.rng() < GOLDEN_CHANCE;
    const mult = fertMult * (golden ? GOLDEN_ESSENCE_MULT : 1);
    if (golden) {
      const hb = this.gameState.garden.herbarium?.golden;
      if (hb) hb[seedId] = (hb[seedId] || 0) + 1;
      if (clientX && clientY) particles.spawnFloatingText(clientX, clientY - 75, `✨ GOLDEN ${SEED_TYPES[seedId].name.toUpperCase()}! (x${GOLDEN_ESSENCE_MULT})`, '#facc15', true);
      if (!silent) sound.playAchievement();
    }

    // Yield Essences
    const essKey = ESSENCE_BY_SEED[seedId];
    if (essKey) {
      const amount = (1 + Math.floor(this.rng() * 2)) * mult;
      this.gameState.garden.essences[essKey] = (this.gameState.garden.essences[essKey] || 0) + amount;
      if (clientX && clientY) {
        particles.spawnFloatingText(clientX, clientY, `+${amount} ${ESSENCE_NAMES[essKey] || essKey}`, '#4ade80', true);
      }
    }

    // Mana Lily restores mana on harvest
    if (seedId === 'mana_lily') {
      const restore = 15 * fertMult;
      this.gameState.mana = Math.min(this.gameState.maxMana, (this.gameState.mana || 0) + restore);
      if (clientX && clientY) particles.spawnFloatingText(clientX, clientY - 15, `+${restore} MANA`, '#818cf8', true);
    }

    // Seed drop back + chance of higher seed mutation!
    this.gameState.garden.inventory[seedId] = (this.gameState.garden.inventory[seedId] || 0) + 1;
    if (this.rng() < 0.25) {
      const seeds = Object.keys(SEED_TYPES);
      const nextIdx = Math.min(seeds.length - 1, seeds.indexOf(seedId) + 1);
      const mutatedSeed = seeds[nextIdx];
      this.gameState.garden.inventory[mutatedSeed] = (this.gameState.garden.inventory[mutatedSeed] || 0) + 1;
      if (clientX && clientY) {
        particles.spawnFloatingText(clientX, clientY - 30, `MUTANT SEED: ${SEED_TYPES[mutatedSeed].name}!`, '#fbbf24', true);
      }
    }

    // Botanical Bazaar (Garden -> Economy)
    if (this.gameState.market) {
      let commodity = null;
      let cName = '';
      if (seedId === 'mana_lily') { commodity = 'silk'; cName = 'MANA SILK'; }
      else if (seedId === 'solar_fern') { commodity = 'amber'; cName = 'SOLAR AMBER'; }
      else if (seedId === 'void_orchid') { commodity = 'shard'; cName = 'VOID CRYSTAL'; }

      if (commodity && this.rng() < 0.5 && this.gameState.market.items?.[commodity]) { // 50% chance to drop commodity
        this.gameState.market.items[commodity].owned += 1;
        if (clientX && clientY) {
          setTimeout(() => {
            particles.spawnFloatingText(clientX, clientY - 60, `+1 ${cName} (Bazaar)`, '#a855f7', true);
          }, 300);
        }
      }
    }

    // Reset plot
    plot.seed = null;
    plot.progress = 0;
    plot.maxTime = 0;
    plot.stage = 'empty';
    plot.fertilized = false;

    if (this.gameState.bountySystem) {
      this.gameState.bountySystem.checkProgress('harvest_plant', 1);
    }
    return true;
  }

  harvestAll() {
    let harvested = 0;
    for (let i = 0; i < this.gameState.garden.plots.length; i++) {
      if (this.gameState.garden.plots[i].stage === 'mature') {
        this.harvestPlot(i, window.innerWidth / 2, window.innerHeight / 2);
        harvested++;
      }
    }
    return harvested > 0;
  }

  plantAll(seedType = this.selectedSeed) {
    let planted = 0;
    for (let i = 0; i < this.gameState.garden.plots.length; i++) {
      if (!this.gameState.garden.plots[i].seed) {
        if (this.plantSeed(i, seedType)) {
          planted++;
        }
      }
    }
    return planted;
  }

  // Growth speed from talents (Leyline Overflow is applied by SpellSystem)
  getGrowthMultiplier() {
    return 1 + (this.gameState.talents?.botanical_haste?.rank || 0) * 0.2;
  }

  updateStage(plot) {
    if (!plot.seed) {
      plot.stage = 'empty';
      return;
    }
    const ratio = plot.maxTime > 0 ? plot.progress / plot.maxTime : 1;
    if (ratio >= 1.0) {
      plot.stage = 'mature';
    } else if (ratio >= 0.6) {
      plot.stage = 'blooming';
    } else if (ratio >= 0.25) {
      plot.stage = 'sprout';
    } else {
      plot.stage = 'seed';
    }
  }

  update(dt) {
    if (this.waterCooldown > 0) {
      this.waterCooldown = Math.max(0, this.waterCooldown - dt);
    }

    // Leyline Overflow: x1.5 growth while mana is full
    const haste = this.getGrowthMultiplier() * (this.gameState.getLeylineGardenMult?.() || 1);
    const plots = this.gameState.garden.plots;
    for (const plot of plots) {
      if (plot.seed && plot.progress < plot.maxTime) {
        plot.progress = Math.min(plot.maxTime, plot.progress + dt * haste);
      }
      // Recompute stage every tick: Water All and Leyline Overflow push progress from
      // outside this loop, and skipping the 'mature' step left plots unharvestable.
      this.updateStage(plot);
    }

    // Golems: harvest the instant a plot in their row matures, then replant.
    const golemPlots = Math.min(plots.length, (this.gameState.garden.golems || 0) * PLOTS_PER_ROW);
    for (let i = 0; i < golemPlots; i++) {
      const plot = plots[i];
      if (!plot.seed || plot.progress >= plot.maxTime) this.golemTend(i);
    }
  }
}

// Stone may be a plain number or a BigNum depending on the Excavation slice.
function numOf(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v.toNumber === 'function') return v.toNumber();
  return Number(v) || 0;
}

function subNum(v, amount) {
  if (v && typeof v === 'object' && typeof v.sub === 'function') return v.sub(amount);
  return numOf(v) - amount;
}
