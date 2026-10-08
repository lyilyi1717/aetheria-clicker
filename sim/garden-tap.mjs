// Active-tapping profile for the Garden (R59). Plays the plant -> tap -> harvest loop on the
// real GardenSystem and ClickerSystem at a fixed generator output and reports the Oil earned
// divided by what generators alone earn. Garden taps share the click cap (5 paid taps/s), so the
// ratio must stay inside the designed active-play envelope (x2.89, sim/active-income.mjs).
//
// Kept apart from sim/core-pacing.mjs, which models the Oil economy as a whole; this profile only
// asks "can a fast tapper beat the designed envelope through the Garden?".
// Run: node sim/garden-tap.mjs   (--assert exits 1 when a rate exceeds the envelope)
import { BigNum } from '../js/engine/BigNum.js';
import { GameState } from '../js/systems/GameState.js';
import { GardenSystem } from '../js/systems/GardenSystem.js';
import { ClickerSystem } from '../js/systems/ClickerSystem.js';
import { particles } from '../js/engine/ParticleEngine.js';

globalThis.window = globalThis.window || { innerWidth: 1000, innerHeight: 800 };
particles.suppressed = true;

export const DESIGNED_ENVELOPE = 2.89;   // R52 active play over generators alone

export function measureGardenTapping({ tapsPerSec = 5, seconds = 3600, baseCps = 1e9, dt = 0.05, seed = 'spore' } = {}) {
  const gs = new GameState();
  const base = new BigNum(baseCps);
  gs.buildingSystem = { getTotalProduction: () => base, getTotalBuildingsCount: () => 0 };
  const garden = new GardenSystem(gs);
  garden.rng = () => 0.5;   // no golden / hybrid / seed-mutation rolls: measure the base loop
  const clicker = new ClickerSystem(gs, () => 0.5);
  gs.gardenSystem = garden;
  gs.clickerSystem = clicker;
  gs.garden.inventory[seed] = 1e6;
  garden.plantAll(seed);
  let tapAcc = 0, next = 0;
  const n = gs.garden.plots.length;
  for (let t = 0; t < seconds; t += dt) {
    gs.aether = gs.aether.add(base.mul(dt));
    garden.update(dt);
    clicker.update(dt, dt);
    for (let i = 0; i < n; i++) if (gs.garden.plots[i].stage === 'mature') { garden.harvestPlot(i, undefined, undefined, true); }
    garden.plantAll(seed);
    tapAcc += tapsPerSec * dt;
    while (tapAcc >= 1) {
      tapAcc -= 1;
      for (let k = 0; k < n; k++) {   // next growing plot, round-robin
        const idx = (next + k) % n;
        const p = gs.garden.plots[idx];
        if (p.seed && p.stage !== 'mature') { garden.tapPlot(idx); next = idx + 1; break; }
      }
    }
  }
  return gs.aether.toNumber() / (baseCps * seconds);
}

if (process.argv[1]?.endsWith("garden-tap.mjs")) {
  // The untouched Garden (plant, wait, harvest by hand with Nectar Surge) is R60's business; the
  // tap uplift is what the taps add on top of it, and it must fit the designed active envelope.
  const idle = measureGardenTapping({ tapsPerSec: 0 });
  console.log(`Garden without taps: x${idle.toFixed(2)} of generators (Nectar Surge on hand harvests)`);
  console.log(`Tap uplift over that (designed active-play envelope x${DESIGNED_ENVELOPE}):`);
  let bad = false;
  for (const tapsPerSec of [5, 20]) {
    const up = measureGardenTapping({ tapsPerSec }) - idle;
    if (up > DESIGNED_ENVELOPE) bad = true;
    console.log(`  ${String(tapsPerSec).padStart(2)} taps/s: +x${up.toFixed(2)}${up > DESIGNED_ENVELOPE ? '  OVER' : ''}`);
  }
  if (process.argv.includes('--assert') && bad) process.exit(1);
}
