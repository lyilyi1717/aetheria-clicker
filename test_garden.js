// Garden slice checks: grow times, golems, offline credit, save migration. Run: node test_garden.js
import { GameState } from './js/systems/GameState.js';
import { GardenSystem, SEED_TYPES, getGolemCost } from './js/systems/GardenSystem.js';

let failed = 0;
const check = (cond, msg) => { if (!cond) { failed++; console.error('FAIL:', msg); } };

// Grow times ×15
check(SEED_TYPES.spore.growTime === 300 && SEED_TYPES.star_lotus.growTime === 7200, 'grow times ×15');

// Golem costs
const c = [0, 1, 2, 3].map(getGolemCost);
check(c.map(x => x.stone).join() === '150,1200,9600,76800', 'golem stone costs');
check(c.map(x => x.manaSap).join() === '10,30,90,270', 'golem mana sap costs');

// Fresh garden defaults
const gs = new GameState();
const gar = new GardenSystem(gs);
check(gs.garden.golems === 0 && gs.garden.rowSeed.length === 4 && gs.garden.rowSeed.every(v => v === null), 'fresh golem defaults');

// Buying golems
gs.inventory.stone = 100;
gs.garden.essences.manaSap = 50;
check(!gar.buyGolem(), 'cannot buy without stone');
gs.inventory.stone = 1500;
check(gar.buyGolem() && gs.garden.golems === 1 && gs.inventory.stone === 1350 && gs.garden.essences.manaSap === 40, 'buy golem 1');
check(gar.buyGolem() && gs.garden.golems === 2 && gs.inventory.stone === 150, 'buy golem 2');

// Live golem tick: row 0 starter spores 5 s from ready -> harvested & replanted
gar.update(6);
const row0 = gs.garden.plots.slice(0, 4);
check(row0.every(p => p.seed === 'spore' && p.progress < 10), 'row 0 auto-harvested and replanted spore');
check(gs.stats.totalPlantsHarvested === 4, `4 harvests, got ${gs.stats.totalPlantsHarvested}`);
// Row 1 was empty: golem plants fallback (highest tier owned)
check(gs.garden.plots.slice(4, 8).every(p => p.seed), 'row 1 empty plots planted by golem');
// Row 2 (no golem) untouched
check(gs.garden.plots.slice(8, 12).every(p => !p.seed), 'row 2 manual');

// Offline: 12 h cap at 50% => 6 h effective => spore (300 s) ~72 cycles per plot
gs.garden.plots[8].seed = 'solar_fern'; gs.garden.plots[8].maxTime = 1125; gs.garden.plots[8].progress = 0;
const before = gs.stats.totalPlantsHarvested;
const res = gar.applyOfflineTime(48 * 3600);
check(res.seconds === 12 * 3600, 'offline capped at 12 h');
check(res.harvests === gs.stats.totalPlantsHarvested - before, 'offline harvest count matches stats');
check(res.harvests >= 4 * 70, `row 0 cycles ~72 each, total ${res.harvests}`);
check(gs.garden.plots[8].stage === 'mature' && gs.garden.plots[8].seed === 'solar_fern', 'manual plot finishes growing, waits');

// Migration: old save keeps stored maxTime, gets golem defaults
const old = new GameState();
old.garden = {
  plots: Array.from({ length: 16 }, (_, i) => ({ id: i, seed: i === 0 ? 'star_lotus' : null, progress: 100, maxTime: i === 0 ? 480 : 0, stage: 'seed', fertilized: false })),
  inventory: { spore: 1 }, essences: { manaSap: 3 }
};
new GardenSystem(old);
check(old.garden.golems === 0 && old.garden.rowSeed.length === 4 && old.garden.rowSeed.every(v => v === null), 'migration defaults');
check(old.garden.plots[0].maxTime === 480, 'in-ground plant keeps old maxTime');

if (failed) { console.error(`${failed} garden check(s) failed`); process.exit(1); }
console.log('Garden checks passed.');
