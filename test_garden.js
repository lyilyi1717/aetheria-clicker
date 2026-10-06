// Garden slice checks: grow times, golems, offline credit, save migration. Run: node test_garden.js
import { GameState } from './js/systems/GameState.js';
import { GardenSystem, SEED_TYPES, getGolemCost, HYBRIDS, GOLDEN_CHANCE, getHybridForPair } from './js/systems/GardenSystem.js';
import { AlchemySystem, HYBRID_RECIPES, RECIPES } from './js/systems/AlchemySystem.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };

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
check(!gar.buyGolem() && gs.garden.golems === 0, 'cannot buy without Golem Covenant (dust shop)');
gs.dustShop.ranks.golem_covenant = 1;
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

// ---------------------------------------------------------------- R17: breeding / golden / recipes
// Seeded generator (mulberry32) so statistical checks are reproducible.
const seeded = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const ready = (plot, seed) => { plot.seed = seed; plot.maxTime = SEED_TYPES[seed].growTime; plot.progress = plot.maxTime; plot.stage = 'mature'; plot.fertilized = false; };
const fresh = () => { const g = new GameState(); const s = new GardenSystem(g); const a = new AlchemySystem(g); return { g, s, a }; };

check(Object.keys(HYBRIDS).length === 6 && HYBRID_RECIPES.length === 6 && RECIPES.length === 7, '6 hybrids, 6 hybrid recipes, 7 base recipes');
check(getHybridForPair('mana_lily', 'spore')?.id === 'limonana' && getHybridForPair('spore', 'spore') === null && getHybridForPair('spore', 'void_orchid') === null, 'pair lookup is order-independent; non-pairs have none');

{
  const { g, s } = fresh();
  check(g.garden.herbarium.golden && g.garden.essences.limonana === 0 && g.garden.breedingUnlocked === false, 'fresh R17 defaults');
  check(s.arePlotsAdjacent(0, 1) && s.arePlotsAdjacent(0, 4) && !s.arePlotsAdjacent(3, 4) && !s.arePlotsAdjacent(0, 5) && !s.arePlotsAdjacent(2, 2), 'adjacency: same row/column neighbours only, no row wrap');

  ready(g.garden.plots[8], 'spore'); ready(g.garden.plots[9], 'mana_lily'); ready(g.garden.plots[10], 'spore');
  check(!s.isBreedingUnlocked() && !s.breedPlots(8, 9).ok, 'locked before first Transcend');
  g.transcendenceCount = 1;
  check(s.isBreedingUnlocked(), 'first Transcend unlocks breeding');
  check(!s.breedPlots(8, 10).ok && !s.breedPlots(8, 8).ok, 'non-adjacent / same plot rejected');
  g.garden.plots[9].progress = 10;
  check(!s.breedPlots(8, 9).ok && g.garden.plots[8].seed === 'spore', 'immature plot rejected, nothing consumed');
  ready(g.garden.plots[9], 'mana_lily');

  // Miss: both plants are harvested as normal, no hybrid
  s.rng = () => 0.99;
  const h0 = g.stats.totalPlantsHarvested;
  let r = s.breedPlots(8, 9);
  check(r.ok && r.amount === 0 && r.hybrid === 'limonana' && g.garden.essences.limonana === 0, 'missed cross gives no hybrid');
  check(!g.garden.plots[8].seed && !g.garden.plots[9].seed && g.stats.totalPlantsHarvested === h0 + 2, 'cross harvests both parents');

  // Hit: rng 0 -> hybrid, 1 unit (second roll 0)
  ready(g.garden.plots[8], 'spore'); ready(g.garden.plots[9], 'mana_lily');
  s.rng = () => 0;
  r = s.breedPlots(8, 9);
  check(r.ok && r.amount === 1 && g.garden.essences.limonana === 1 && g.garden.herbarium.hybrids.limonana === 1, 'successful cross gives hybrid essence and logs it');

  // Seeded odds: ~30% for adjacent tiers, ~15% for the long cross
  const odds = (a, b, n) => {
    const t = fresh(); t.g.transcendenceCount = 1; t.s.rng = seeded(7);
    let hits = 0;
    for (let i = 0; i < n; i++) {
      ready(t.g.garden.plots[8], a); ready(t.g.garden.plots[9], b);
      if (t.s.breedPlots(8, 9).amount > 0) hits++;
    }
    return hits / n;
  };
  const o30 = odds('frost_petal', 'void_orchid', 4000), o15 = odds('spore', 'star_lotus', 4000);
  check(Math.abs(o30 - 0.30) < 0.03, `adjacent-tier cross ~30%, got ${o30}`);
  check(Math.abs(o15 - 0.15) < 0.03, `long cross ~15%, got ${o15}`);
}

// Golden mutation: 1%, x3 essence, logged
{
  const { g, s } = fresh();
  s.rng = () => 0.5; // never golden
  ready(g.garden.plots[0], 'spore');
  const e0 = g.garden.essences.sporePowder;
  s.harvestPlot(0);
  const normal = g.garden.essences.sporePowder - e0;
  check(normal >= 1 && normal <= 2 && g.garden.herbarium.golden.spore === undefined, 'normal harvest: 1-2 essence, no golden entry');
  s.rng = () => 0; // always golden
  ready(g.garden.plots[0], 'spore');
  const e1 = g.garden.essences.sporePowder;
  s.harvestPlot(0);
  const gold = g.garden.essences.sporePowder - e1;
  check(gold === 3 && g.garden.herbarium.golden.spore === 1, `golden harvest yields x3 (got ${gold}) and is logged`);

  const t = fresh(); t.s.rng = seeded(42);
  const N = 20000;
  for (let i = 0; i < N; i++) { ready(t.g.garden.plots[0], 'spore'); t.s.harvestPlot(0); }
  const rate = (t.g.garden.herbarium.golden.spore || 0) / N;
  check(GOLDEN_CHANCE === 0.01 && Math.abs(rate - 0.01) < 0.004, `golden rate ~1%, got ${rate}`);
}

// Recipe discovery: hidden until both ingredients are held; persists through save/load
{
  const { g, a } = fresh();
  check(a.getVisibleHybridRecipes().length === 0 && !a.canBrew('limonana_spritz'), 'hybrid recipes start hidden and unbrewable');
  g.garden.essences.limonana = 2;
  check(a.checkDiscoveries(true).length === 0, 'one ingredient is not enough');
  g.inventory.rubies = 2;
  const found = a.checkDiscoveries(true).map(r => r.id);
  check(found.join() === 'limonana_spritz' && a.canBrew('limonana_spritz'), 'holding both ingredients discovers the recipe');
  // discovery is permanent even if the ingredients are spent
  check(a.brew('limonana_spritz') && g.garden.essences.limonana === 0 && g.inventory.rubies === 0, 'brew spends essence and gems');
  check(g.activeBuffs.some(b => b.id === 'limonana_spritz' && b.type === 'click_mult'), 'brew adds the buff');
  check(a.isDiscovered('limonana_spritz') && !a.canBrew('limonana_spritz'), 'recipe stays discovered after ingredients are spent');

  g.garden.herbarium.golden.frost_petal = 2;
  g.garden.essences.roseDate = 3;
  const blob = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = new GameState();
  g2.deserialize(blob);
  const s2 = new GardenSystem(g2); const a2 = new AlchemySystem(g2);
  check(a2.isDiscovered('limonana_spritz') && !a2.isDiscovered('truffle_tonic'), 'discovered recipes survive save/load');
  check(g2.garden.essences.roseDate === 3 && g2.garden.herbarium.golden.frost_petal === 2, 'hybrid essences and herbarium survive save/load');
  check(s2.rng === Math.random, 'rng defaults to Math.random');
}

// Old save (no discovered map, no R17 garden fields) loads with defaults
{
  const old = new GameState();
  old.alchemy = { catalysts: 4 };
  old.garden = { plots: Array.from({ length: 16 }, (_, i) => ({ id: i, seed: null, progress: 0, maxTime: 0, stage: 'empty', fertilized: false })), inventory: {}, essences: { manaSap: 3 } };
  const sOld = new GardenSystem(old); const aOld = new AlchemySystem(old);
  check(old.alchemy.catalysts === 4 && Object.keys(old.alchemy.discovered).length === 0, 'old alchemy slice gains discovered map, keeps catalysts');
  check(old.garden.essences.manaSap === 3 && old.garden.essences.mintHoney === 0 && old.garden.herbarium.golden && old.garden.herbarium.hybrids && old.garden.breedingUnlocked === false, 'old garden gains R17 defaults');
  check(aOld.getVisibleHybridRecipes().length === 0 && !sOld.isBreedingUnlocked(), 'old save starts with breeding locked, no recipes');
}

if (failed) { console.error(`${failed} garden check(s) failed`); process.exit(1); }
console.log('Garden checks passed.');
