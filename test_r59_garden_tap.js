// R59: Garden (Dewdrop) taps share the click cap, pay 0.25 s of production, and work at CPS 0.
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { GardenSystem, DEWDROP_CPS_SECONDS } from './js/systems/GardenSystem.js';
import { ClickerSystem } from './js/systems/ClickerSystem.js';
import { CLICK_MAX_PER_SEC } from './js/systems/combo.js';
import { measureGardenTapping, TAP_UPLIFT_CEILING } from './sim/garden-tap.mjs';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };

function make(cps) {
  const gs = new GameState();
  if (cps) gs.buildingSystem = { getTotalProduction: () => new BigNum(cps), getTotalBuildingsCount: () => 0 };
  const garden = new GardenSystem(gs);
  const clicker = new ClickerSystem(gs);
  gs.clickerSystem = clicker;
  gs.garden.inventory.spore = 100;
  garden.plantAll('spore');
  return { gs, garden, clicker };
}

console.log('--- Dewdrop tap at CPS 0 does not throw and pays the 10 Oil minimum ---');
{
  const { gs, garden } = make(0);
  assert.equal(gs.getNetAetherPerSecond().toNumber(), 0);
  assert.equal(garden.tapPlot(0), true);
  assert.equal(gs.aether.toNumber(), 10);
}

console.log('--- A Dewdrop pays 0.25 s of production ---');
{
  assert.equal(DEWDROP_CPS_SECONDS, 0.25);
  const { gs, garden } = make(4000);
  garden.tapPlot(0);
  assert.equal(gs.aether.toNumber(), 1000);
  assert.equal(gs.totalAetherEarned.toNumber(), 1000);
}

console.log('--- Taps share the click bucket: over the cap pays and grows nothing ---');
{
  const { gs, garden, clicker } = make(4000);
  const p = gs.garden.plots[0];
  p.progress = 0;   // starter plots begin almost grown
  for (let i = 0; i < 12; i++) garden.tapPlot(0);
  assert.equal(gs.aether.toNumber(), CLICK_MAX_PER_SEC * 1000, '5 of 12 instant taps pay');
  assert.equal(p.progress, CLICK_MAX_PER_SEC * 15, 'only paid taps grow the plant (5% of 300 s)');
  // Monolith clicks draw from the same bucket
  clicker.update(0, 1);
  const before = gs.totalClicks;
  for (let i = 0; i < 3; i++) garden.tapPlot(0);
  for (let i = 0; i < 4; i++) clicker.handleClick(0, 0);
  assert.equal(gs.totalClicks - before, 2, '5 tokens: 3 spent by taps, 2 clicks pay');
}

console.log('--- Sim: tapping at 5 and 20 taps/s stays inside the designed envelope ---');
{
  const idle = measureGardenTapping({ tapsPerSec: 0, seconds: 1800 });
  for (const r of [5, 20]) {
    const up = measureGardenTapping({ tapsPerSec: r, seconds: 1800 }) - idle;
    assert.ok(up <= TAP_UPLIFT_CEILING, `${r} taps/s uplift x${up.toFixed(2)}`);
  }
}
console.log('R59 garden tap tests passed');
