import { sound } from '../engine/AudioEngine.js';
import { particles } from '../engine/ParticleEngine.js';

export const SEED_TYPES = {
  spore: { id: 'spore', name: 'Spore Blossom', icon: '🍄', growTime: 20, desc: 'Yields Spore Powder' },
  mana_lily: { id: 'mana_lily', name: 'Mana Lily', icon: '🪷', growTime: 45, desc: 'Restores Mana & yields Mana Sap' },
  solar_fern: { id: 'solar_fern', name: 'Solar Fern', icon: '🌿', growTime: 75, desc: 'Yields Solar Dew' },
  frost_petal: { id: 'frost_petal', name: 'Frost Petal', icon: '❄️', growTime: 120, desc: 'Yields Cryo Essence' },
  void_orchid: { id: 'void_orchid', name: 'Void Orchid', icon: '🌺', growTime: 240, desc: 'Yields Void Pollen' },
  star_lotus: { id: 'star_lotus', name: 'Star Lotus', icon: '🌟', growTime: 480, desc: 'Yields Celestial Nectar' }
};

export class GardenSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.selectedSeed = 'spore';
    this.waterCooldown = 0;
    this.initGarden();
  }

  initGarden() {
    if (!this.gameState.garden) {
      const plots = [];
      for (let i = 0; i < 16; i++) {
        plots.push({
          id: i,
          seed: i < 4 ? 'spore' : null,
          progress: i < 4 ? 15 : 0,
          maxTime: i < 4 ? 20 : 0,
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
        }
      };
    }
  }

  plantSeed(plotIndex, seedType = this.selectedSeed) {
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

    sound.playBuy();
    return true;
  }

  waterAll() {
    if (this.waterCooldown > 0) return false;
    this.waterCooldown = 15; // 15s cooldown
    sound.playSpell();

    for (const plot of this.gameState.garden.plots) {
      if (plot.seed && plot.stage !== 'mature') {
        plot.progress += 25; // boost 25s
      }
    }
    particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, '💧 GARDEN WATERED (+25s Growth)', '#38bdf8', true);
    return true;
  }

  harvestPlot(plotIndex, clientX, clientY) {
    const plot = this.gameState.garden.plots[plotIndex];
    if (!plot || plot.stage !== 'mature') return false;

    sound.playGem();
    this.gameState.stats.totalPlantsHarvested++;

    const seedId = plot.seed;
    const isFertilized = plot.fertilized;
    const mult = isFertilized ? 2 : 1;

    // Yield Essences
    const essMap = {
      spore: 'sporePowder',
      mana_lily: 'manaSap',
      solar_fern: 'solarDew',
      frost_petal: 'cryoEssence',
      void_orchid: 'voidPollen',
      star_lotus: 'starNectar'
    };

    const essKey = essMap[seedId];
    if (essKey) {
      const amount = (1 + Math.floor(Math.random() * 2)) * mult;
      this.gameState.garden.essences[essKey] = (this.gameState.garden.essences[essKey] || 0) + amount;
      if (clientX && clientY) {
        particles.spawnFloatingText(clientX, clientY, `+${amount} ${SEED_TYPES[seedId].name}`, '#4ade80', true);
      }
    }

    // Seed drop back + chance of higher seed mutation!
    this.gameState.garden.inventory[seedId] = (this.gameState.garden.inventory[seedId] || 0) + 1;
    if (Math.random() < 0.25) {
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
      
      if (commodity && Math.random() < 0.5) { // 50% chance to drop commodity
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

  update(dt) {
    if (this.waterCooldown > 0) {
      this.waterCooldown = Math.max(0, this.waterCooldown - dt);
    }

    for (const plot of this.gameState.garden.plots) {
      if (!plot.seed) continue;

      if (plot.progress < plot.maxTime) {
        plot.progress += dt;
        const ratio = plot.progress / plot.maxTime;
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
    }
  }
}
