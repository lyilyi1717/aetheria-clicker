// Active vs idle income on the real SpellSystem / ClickerSystem (R3, docs/redesign-proposal.md
// §5.2, §6.1). Plays `seconds` of attentive play at a fixed generator output and returns the
// Aether earned divided by what the same time earns idle (generators only).
//
// The attentive player: clicks 2/s (combo x5 after 20 clicks, Frenzy every 20), casts Celestial
// Alignment, Chrono Warp and Aether Burst whenever ready and affordable (in that order, so a
// Burst lands inside Celestial when it can), and clicks every Golden Anomaly as it appears.
// Midas, Void Cataclysm and Astral Renewal don't make Aether and are left out. Chrono Warp's x5
// game speed counts (it runs generators 5x faster for 15 s), as it does in the real loop.
//
// Used by sim/core-pacing.mjs (the casual profile's multiplier while present) and by
// test_active_income.js. Random rolls (crits, anomaly types, spawn times) come from `rng`.
import { BigNum } from '../js/engine/BigNum.js';
import { GameState } from '../js/systems/GameState.js';
import { SpellSystem } from '../js/systems/SpellSystem.js';
import { ClickerSystem } from '../js/systems/ClickerSystem.js';
import { particles } from '../js/engine/ParticleEngine.js';

globalThis.window = globalThis.window || { innerWidth: 1000, innerHeight: 800 };
particles.suppressed = true;

// Small seeded PRNG (mulberry32): () => [0, 1)
export function seededRng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROTATION = ['celestial_alignment', 'chrono_warp', 'aether_burst'];

// Returns { ratio, parts } where parts splits the Aether earned by source (in idle-seconds).
// play: which parts the player does ({ clicks, spells, warp, anomalies }, all true by default;
// the switches are for breaking the ratio down; warp: false leaves Chrono Warp out of the rotation).
export function measureActiveIncome({
  seconds = 3600 * 6, rng = seededRng(7), baseCps = 1e9, dt = 0.1, play = {}
} = {}) {
  const { clicks = true, spells: cast = true, warp = true, anomalies = true } = play;
  const rotation = warp ? ROTATION : ROTATION.filter(id => id !== 'chrono_warp');
  const realRandom = Math.random;
  Math.random = rng; // crits and Frenzy auto-click rolls inside ClickerSystem.handleClick
  try {
    const gs = new GameState();
    const base = new BigNum(baseCps);
    gs.buildingSystem = { getTotalProduction: () => base, getTotalBuildingsCount: () => 0 };
    const loop = { timeScale: 1 };
    const spells = new SpellSystem(gs, loop);
    const clicker = new ClickerSystem(gs, rng);
    gs.mana = 0;

    let clickAcc = 0;
    let prod = 0;
    const steps = Math.round(seconds / dt);
    for (let i = 0; i < steps; i++) {
      const gameDt = dt * loop.timeScale;
      // Generators (the game loop adds CPS x game dt)
      const cps = gs.getNetAetherPerSecond().toNumber();
      prod += cps * gameDt;
      gs.aether = gs.aether.add(cps * gameDt);

      // The attentive player
      if (clicks) {
        clickAcc += 2 * dt;
        while (clickAcc >= 1) { clicker.handleClick(0, 0, false); clickAcc -= 1; }
      }
      if (cast) for (const id of rotation) if (spells.canCast(id)) spells.castSpell(id);
      if (anomalies && clicker.anomalyActive) clicker.clickAnomaly(0, 0);

      clicker.update(gameDt);
      spells.update(gameDt, dt);
      // Buffs run on real time (AlchemySystem.update)
      for (let k = gs.activeBuffs.length - 1; k >= 0; k--) {
        gs.activeBuffs[k].duration -= dt;
        if (gs.activeBuffs[k].duration <= 0) gs.activeBuffs.splice(k, 1);
      }
    }
    const idle = baseCps * seconds;
    const total = gs.aether.toNumber();
    return { ratio: total / idle, generators: prod / idle, other: (total - prod) / idle };
  } finally {
    Math.random = realRandom;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = measureActiveIncome();
  for (const [name, play] of [['clicks only', { spells: false, anomalies: false }], ['spells only', { clicks: false, anomalies: false }], ['anomalies only', { clicks: false, spells: false }]]) {
    console.log(`${name}: x${measureActiveIncome({ play }).ratio.toFixed(2)}`);
  }
  console.log(`active / idle: x${r.ratio.toFixed(2)} (generators incl. buffs and Chrono Warp x${r.generators.toFixed(2)}, spells/clicks/anomalies +${r.other.toFixed(2)})`);
}
