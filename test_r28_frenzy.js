// R28: Frenzy every 20 combo clicks; the combo is x5 at 20 and Frenzy ending no longer resets it.
// Run: node test_r28_frenzy.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { ClickerSystem } from './js/systems/ClickerSystem.js';
import { restoreStash } from './js/systems/ChronicleSystem.js';
import {
  COMBO_FULL, FRENZY_EVERY, FRENZY_DURATION, FRENZY_MULT, FRENZY_MAX_TIMER,
  comboMultiplier, clicksToNextFrenzy
} from './js/systems/combo.js';
import { comboView } from './js/ui/comboBar.js';
import { particles } from './js/engine/ParticleEngine.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;

const make = () => {
  const gs = new GameState();
  const base = new BigNum(0);
  gs.buildingSystem = { getTotalProduction: () => base, getTotalBuildingsCount: () => 0 };
  gs.critChance = 0;
  return gs;
};
const click = (c, n) => { for (let i = 0; i < n; i++) c.handleClick(0, 0, false); };

// --- combo multiplier: x1 at 0, x5 at 20 and beyond ---
{
  assert.equal(COMBO_FULL, 20);
  assert.equal(FRENZY_EVERY, 20);
  assert.equal(comboMultiplier(0), 1);
  assert.equal(comboMultiplier(10), 3);
  assert.equal(comboMultiplier(20), 5);
  assert.equal(comboMultiplier(87), 5);
  assert.equal(comboMultiplier(-3), 1);

  const gs = make();
  const yield0 = gs.getClickYield().toNumber();
  gs.comboCount = 20;
  assert.equal(gs.getClickYield().toNumber(), yield0 * 5);
  gs.comboCount = 500;
  assert.equal(gs.getClickYield().toNumber(), yield0 * 5);
  gs.frenzyActive = true;
  assert.equal(gs.getClickYield().toNumber(), yield0 * 5 * FRENZY_MULT);
}

// --- Frenzy at 20, 40, 60; the combo survives Frenzy ending ---
{
  const gs = make();
  const c = new ClickerSystem(gs);
  click(c, 19);
  assert.equal(gs.frenzyActive, false);
  click(c, 1);
  assert.equal(gs.frenzyActive, true, 'Frenzy at 20');
  assert.equal(gs.frenzyTimer, FRENZY_DURATION);

  // Let it end while the player keeps the combo alive (clicks every 0.5 s)
  for (let t = 0; t < FRENZY_DURATION + 1; t += 0.5) { gs.comboTimer = 2; c.update(0.5); }
  assert.equal(gs.frenzyActive, false);
  assert.equal(gs.comboCount, 20, 'combo does not drop to 0 when Frenzy ends');

  click(c, 19);
  assert.equal(gs.frenzyActive, false);
  click(c, 1);
  assert.equal(gs.comboCount, 40);
  assert.equal(gs.frenzyActive, true, 'Frenzy again at 40');

  // A milestone during Frenzy adds time, capped
  gs.frenzyTimer = 1;
  click(c, 20);
  assert.equal(gs.frenzyTimer, 1 + FRENZY_DURATION, 'Frenzy at 60 extends the running one');
  gs.frenzyTimer = FRENZY_MAX_TIMER - 1;
  click(c, 20);
  assert.equal(gs.frenzyTimer, FRENZY_MAX_TIMER, 'capped');
  // A longer Frenzy (Time Flux) is never shortened
  c.triggerFrenzy(FRENZY_DURATION);
  assert.equal(gs.frenzyTimer, FRENZY_MAX_TIMER);
}

// --- a pause drains the combo; it can't re-fire the same milestone ---
{
  const gs = make();
  const c = new ClickerSystem(gs);
  click(c, 21);
  gs.frenzyActive = false; gs.frenzyTimer = 0;
  c.update(2.01);                       // combo timer runs out
  assert.equal(gs.comboCount, 15, 'above a full bar it falls back to 20, then drains 5');
  click(c, 5);
  assert.equal(gs.comboCount, 20);
  assert.equal(gs.frenzyActive, false, 'milestone 20 already fired this combo');
  assert.equal(clicksToNextFrenzy(20, c.lastFrenzyAt), 20);

  // Fully drained: the next 20 clicks fire again
  for (let i = 0; i < 40 && gs.comboCount > 0; i++) c.update(2.01);
  assert.equal(gs.comboCount, 0);
  click(c, 20);
  assert.equal(gs.frenzyActive, true);
}

// --- Chronicle rules: no Frenzy, combo cap ---
{
  const gs = make();
  gs.chronicle = { ...gs.chronicle, active: { id: 'sand_dry_well', startedAt: 0, stash: null } };
  const c = new ClickerSystem(gs);
  click(c, 40);
  assert.equal(gs.frenzyActive, false, 'Dry Well forbids Frenzy');
  assert.equal(comboView(5, 0, { noFrenzy: true }).text.includes('Frenzy'), false);
  assert.match(comboView(5, 0, { comboCap: 2 }).text, /\(2\.0x boost\)/);
}

// --- combo bar view ---
{
  assert.equal(comboView(0).fill, 0);
  assert.equal(comboView(10).fill, 50);
  assert.match(comboView(10).text, /Frenzy in 10/);
  assert.match(comboView(20, 20).text, /\(5\.0x boost\) · Frenzy in 20/);
  assert.equal(comboView(20, 20).fill, 0);
  assert.equal(comboView(35, 20).fill, 75);
  assert.match(comboView(35, 20).text, /Frenzy in 5/);
}

// --- old state: a stashed combo above 20 (Chronicle stash from before R28) ---
{
  const gs = make();
  gs.chronicle = {
    ...gs.chronicle,
    active: { id: 'sand_dry_well', startedAt: 0, stash: {
      aether: { m: 1, e: 3 }, totalAetherEarned: { m: 1, e: 4 }, clickPower: { m: 1, e: 0 },
      buildings: {}, upgrades: [], comboCount: 87, runStartedAt: 0
    } }
  };
  restoreStash(gs);
  assert.equal(gs.comboCount, 87);
  const c = new ClickerSystem(gs);
  assert.equal(comboMultiplier(gs.comboCount), 5);
  click(c, 12);
  assert.equal(gs.frenzyActive, false);
  click(c, 1);
  assert.equal(gs.comboCount, 100);
  assert.equal(gs.frenzyActive, true, 'next milestone (100) fires');

  // A save that carries a top-level comboCount > 20 still loads
  const g2 = new GameState();
  const data = g2.serialize();
  data.comboCount = 87;
  g2.deserialize(data);
  assert.ok(Number.isFinite(g2.comboCount));
}

console.log('test_r28_frenzy.js: all assertions passed');
