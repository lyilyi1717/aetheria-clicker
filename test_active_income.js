// R3: active income retune (design doc 5.2, 6.1). Spell and anomaly values, the anomaly
// weights, Mirage and Caravan Star, and the active:idle ratio measured on the real
// SpellSystem / ClickerSystem with a seeded random source (sim/active-income.mjs).
// Run: node test_active_income.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { MarketSystem } from './js/systems/MarketSystem.js';
import {
  SpellSystem, SPELLS, BURST_CPS_SECONDS, BURST_COOLDOWN, CELESTIAL_MULT, CELESTIAL_DURATION
} from './js/systems/SpellSystem.js';
import {
  ClickerSystem, ANOMALY_WEIGHTS, pickAnomalyType, SUPERNOVA_CPS_SECONDS, MIRAGE_MULT, MIRAGE_DURATION
} from './js/systems/ClickerSystem.js';
import { particles } from './js/engine/ParticleEngine.js';
import { measureActiveIncome, seededRng } from './sim/active-income.mjs';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;
const close = (a, b, eps = 1e-9) => Math.abs(a / b - 1) < eps;

// A GameState with a fixed generator output (no buildings needed)
const make = (cps = 1000) => {
  const gs = new GameState();
  const base = new BigNum(cps);
  gs.buildingSystem = { getTotalProduction: () => base, getTotalBuildingsCount: () => 0 };
  return gs;
};

// --- spell values ---
{
  assert.equal(BURST_CPS_SECONDS, 45);
  assert.equal(BURST_COOLDOWN, 45);
  assert.equal(CELESTIAL_MULT, 2.5);
  assert.equal(CELESTIAL_DURATION, 30);
  assert.equal(SPELLS.find(s => s.id === 'aether_burst').cooldown, 45);
  assert.match(SPELLS.find(s => s.id === 'celestial_alignment').desc, /\+150%/);

  const gs = make(1000);
  const spells = new SpellSystem(gs, { timeScale: 1 });
  gs.mana = 1000;
  assert.ok(spells.castSpell('aether_burst'));
  assert.ok(close(gs.aether.toNumber(), 1000 * 45), 'Burst pays 45 s of CPS');
  assert.equal(gs.spells.aether_burst.cd, 45);

  assert.ok(spells.castSpell('celestial_alignment'));
  assert.ok(close(gs.getNetAetherPerSecond().toNumber(), 2500), 'Celestial is x2.5');
}

// --- anomaly weights: Mirage 1 in 12, Caravan Star 1 in 20 ---
{
  const total = Object.values(ANOMALY_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(close(ANOMALY_WEIGHTS.mirage / total, 1 / 12));
  assert.ok(close(ANOMALY_WEIGHTS.caravan_star / total, 1 / 20));
  assert.equal(SUPERNOVA_CPS_SECONDS, 180);

  const counts = {};
  for (let i = 0; i < 6000; i++) {
    const t = pickAnomalyType(i / 6000);
    counts[t] = (counts[t] || 0) + 1;
  }
  assert.equal(counts.mirage, 500);
  assert.equal(counts.caravan_star, 300);
  assert.equal(pickAnomalyType(0.999999), 'caravan_star');

  // Seeded spawns are reproducible
  const roll = (seed) => {
    const c = new ClickerSystem(make(), seededRng(seed));
    const out = [];
    for (let i = 0; i < 20; i++) { c.spawnAnomaly(); out.push(c.anomalyType); }
    return out.join();
  };
  assert.equal(roll(3), roll(3));
}

// A clicker whose next anomaly roll lands on `type`
const forceAnomaly = (gs, type) => {
  const c = new ClickerSystem(gs, () => 0.5);
  c.anomalyActive = true;
  c.anomalyType = type;
  return c;
};

// --- Supernova: 180 s of CPS ---
{
  const gs = make(1e6);
  forceAnomaly(gs, 'supernova').clickAnomaly(0, 0);
  assert.ok(close(gs.aether.toNumber(), 1e6 * 180));
}

// --- Mirage: x2 Aether and x2 gold for 60 s, refreshes instead of stacking ---
{
  const gs = make(1000);
  const c = forceAnomaly(gs, 'mirage');
  c.clickAnomaly(0, 0);
  assert.equal(MIRAGE_MULT, 2);
  assert.equal(MIRAGE_DURATION, 60);
  assert.ok(close(gs.getNetAetherPerSecond().toNumber(), 2000));
  assert.equal(gs.getGoldMultiplier(), 2);
  gs.activeBuffs.forEach(b => { b.duration = 5; });
  c.anomalyActive = true;
  c.clickAnomaly(0, 0);
  assert.equal(gs.activeBuffs.length, 2, 'a second Mirage refreshes, not stacks');
  assert.ok(gs.activeBuffs.every(b => b.duration === 60));
  assert.ok(close(gs.getNetAetherPerSecond().toNumber(), 2000));
}

// --- Caravan Star: a free large caravan, or its payout at once when the road is busy ---
{
  const gs = make();
  const market = new MarketSystem(gs);
  gs.marketSystem = market;
  const { invest } = market.getCaravanTier('large');
  const gold = gs.gold;
  forceAnomaly(gs, 'caravan_star').clickAnomaly(0, 0);
  const car = gs.market.caravan;
  assert.equal(car.active, true);
  assert.equal(car.maxDuration, 3600);
  assert.ok(gs.gold.eq(gold), 'the caravan is free');
  assert.ok(close(new BigNum(car.payout).toNumber(), invest.toNumber() * 1.5));

  // Road busy: paid now, the running caravan is untouched
  const before = gs.gold.toNumber();
  forceAnomaly(gs, 'caravan_star').clickAnomaly(0, 0);
  assert.ok(close(gs.gold.toNumber() - before, invest.toNumber() * 1.5));
  assert.equal(car.maxDuration, 3600);

  // It returns through the normal Bazaar path
  market.update(3601);
  assert.equal(car.active, false);
  assert.ok(close(gs.gold.toNumber() - before, invest.toNumber() * 3));
}

// --- active:idle ratio (seeded; see sim/active-income.mjs for the player model) ---
{
  const seconds = 3600 * 2;
  const ratio = (play) => measureActiveIncome({ seconds, rng: seededRng(7), play }).ratio;
  const full = ratio({});
  const noClicks = ratio({ clicks: false });
  const burstCelestialAnomalies = ratio({ clicks: false, warp: false });
  const anomalies = ratio({ clicks: false, spells: false });
  console.log(`active/idle x${full.toFixed(2)}; no clicks x${noClicks.toFixed(2)}; ` +
    `Burst+Celestial+anomalies x${burstCelestialAnomalies.toFixed(2)}; anomalies x${anomalies.toFixed(2)}`);
  // Before the retune the same model measured x20.7 (spells alone x12.0)
  assert.ok(full > 5 && full < 9, `attentive play x${full}`);
  assert.ok(burstCelestialAnomalies > 3 && burstCelestialAnomalies < 4.5);
  assert.ok(anomalies > 1.2 && anomalies < 1.8, `anomalies x${anomalies} (was x2.8)`);
  // Same seed, same result
  assert.equal(ratio({ clicks: false }), noClicks);
}

console.log('test_active_income.js: all assertions passed');
