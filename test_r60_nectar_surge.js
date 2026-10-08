// R60: Nectar Surge pays on hand harvests only; Golem and offline harvests pay none.
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { GardenSystem } from './js/systems/GardenSystem.js';
import { measureGolems, measureOffline, AUTOMATED_MAX_RATIO } from './sim/garden-tap.mjs';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };

function make(cps) {
  const gs = new GameState();
  gs.buildingSystem = { getTotalProduction: () => new BigNum(cps), getTotalBuildingsCount: () => 0 };
  const garden = new GardenSystem(gs);
  garden.rng = () => 0.5;
  gs.gardenSystem = garden;
  gs.garden.inventory.spore = 100;
  garden.plantAll('spore');
  return { gs, garden };
}
const ready = (gs, i) => { const p = gs.garden.plots[i]; p.progress = p.maxTime; p.stage = 'mature'; };

console.log('--- a hand harvest pays 15 s of CPS ---');
{
  const { gs, garden } = make(1000);
  ready(gs, 0);
  const before = gs.aether.toNumber();
  assert.ok(garden.harvestPlot(0, undefined, undefined, true));
  assert.equal(gs.aether.toNumber() - before, 15000);
}

console.log('--- a golem harvest pays nothing ---');
{
  const { gs, garden } = make(1000);
  ready(gs, 0);
  const before = gs.aether.toNumber();
  assert.ok(garden.golemTend(0));
  assert.equal(gs.aether.toNumber(), before);
  assert.equal(gs.stats.totalPlantsHarvested, 1);
}

console.log('--- golem rows and offline harvests stay at generator output ---');
{
  const g = measureGolems();
  assert.ok(g.harvests >= 50 && g.ratio <= AUTOMATED_MAX_RATIO, `golems x${g.ratio}`);
  const o = measureOffline();
  assert.ok(o.harvests >= 50 && o.oil === 0, `offline ${o.oil} Oil`);
}

console.log('R60 checks passed');
