// R44: combo climb (pitch steps, glow steps, wind-up), Frenzy moment hooks, text cap, crit label.
// Run: node test_r44_combo_frenzy.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { ClickerSystem } from './js/systems/ClickerSystem.js';
import {
  CLICK_MAX_PER_SEC, PITCH_RATIOS, FRENZY_HOLD_SECONDS, comboStep, pitchStep, comboPitch, isWindup
} from './js/systems/combo.js';
import { comboView, renderCombo } from './js/ui/comboBar.js';
import { ParticleEngine } from './js/engine/ParticleEngine.js';
import { MAX_ORB_TEXTS } from './js/ui/feedbackBudget.js';
import { SOUND_IDS, AudioEngine } from './js/engine/AudioEngine.js';
import { particles } from './js/engine/ParticleEngine.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const make = () => {
  const gs = new GameState();
  gs.buildingSystem = { getTotalProduction: () => new BigNum(0), getTotalBuildingsCount: () => 0 };
  gs.critChance = 0;
  return gs;
};
const click = (c, n) => { for (let i = 0; i < n; i++) { c.update(0, 1 / CLICK_MAX_PER_SEC); c.handleClick(0, 0, false); } };

// pitch: one scale step per 4 clicks, capped at 5, back down as the count falls
assert.equal(pitchStep(0), 0);
assert.equal(pitchStep(3), 0);
assert.equal(pitchStep(4), 1);
assert.equal(pitchStep(19), 4);
assert.equal(pitchStep(20), 5);
assert.equal(pitchStep(400), 5, 'capped');
assert.equal(comboPitch(20), 2);
assert.equal(comboPitch(0), 1);
assert.ok(PITCH_RATIOS.every((r, i, a) => i === 0 || r > a[i - 1]), 'ratios climb');
assert.ok(pitchStep(12) > pitchStep(7), 'falls as the count drains');

// glow steps and wind-up
assert.deepEqual([0, 4, 5, 9, 10, 15, 20, 55].map(comboStep), [0, 0, 1, 1, 2, 3, 4, 4]);
assert.deepEqual([17, 18, 19, 20, 38, 39, 40].map(isWindup), [false, true, true, false, true, true, false]);
assert.equal(isWindup(0), false);

// clicker events: steps at 5/10/15/20, one Frenzy event at 20, bar holds, pitch from the combo
{
  const gs = make();
  const c = new ClickerSystem(gs);
  const events = [];
  c.onComboFx = (e) => events.push(e);
  click(c, 19);
  assert.deepEqual(events.filter((e) => e.type === 'step').map((e) => e.step), [1, 2, 3]);
  assert.equal(events.some((e) => e.type === 'frenzy'), false);
  assert.equal(c.clickPitch(), comboPitch(19));
  click(c, 1);
  const fr = events.filter((e) => e.type === 'frenzy');
  assert.equal(fr.length, 1);
  assert.equal(fr[0].extended, false);
  assert.equal(events.filter((e) => e.type === 'step').length, 4);
  assert.equal(c.frenzyHold, FRENZY_HOLD_SECONDS);
  // bar holds full while frenzyHold lasts, then shows progress to the next Frenzy
  const bar = { style: {}, parentElement: { classList: { _s: new Set(), contains(x) { return this._s.has(x); }, toggle(x, on) { on ? this._s.add(x) : this._s.delete(x); } } } };
  const text = { textContent: '' };
  renderCombo(bar, text, gs, c);
  assert.equal(bar.style.width, '100%');
  assert.equal(bar.parentElement.classList.contains('is-hold'), true);
  c.update(0.5);
  renderCombo(bar, text, gs, c);
  assert.equal(c.frenzyHold, 0);
  assert.equal(bar.style.width, '0%');
  assert.equal(comboView(20, 20).fill, 0);
  // a second milestone during Frenzy is reported as an extension
  click(c, 20);
  assert.equal(events.filter((e) => e.type === 'frenzy').at(-1).extended, true);
}

// the hook is optional (no UI)
{
  const gs = make(); const c = new ClickerSystem(gs);
  click(c, 20);
  assert.equal(gs.frenzyActive, true);
}

// live orb texts are capped
{
  const pe = new ParticleEngine();
  for (let i = 0; i < MAX_ORB_TEXTS + 5; i++) pe.spawnFloatingText(10 + i * 200, 10, '+1', '#fff', false, null, 'orb');
  const live = pe.texts.filter((x) => x.group === 'orb');
  assert.equal(live.length, MAX_ORB_TEXTS + 5);
  assert.equal(live.filter((x) => x.decay >= 0.08).length, 5, 'oldest beyond the cap fade fast');
  for (let i = 0; i < 40; i++) pe.spawnFloatingText(10 + i * 200, 10, '+1', '#fff', false, null, 'orb');
  assert.ok(pe.texts.filter((x) => x.group === 'orb').length <= MAX_ORB_TEXTS * 2, 'hard ceiling');
}

// Frenzy has its own sound id and voice
assert.equal(SOUND_IDS.frenzy, 'playFrenzy');
assert.equal(typeof AudioEngine.prototype.playFrenzy, 'function');

// wiring
const fx = read('./js/ui/comboFx.js');
assert.match(fx, /removeAttribute\('title'\)/);
assert.match(fx, /spawnRingBurst/);
assert.match(read('./js/systems/ClickerSystem.js'), /label: critTier === 1 \? t\('fx\.crit'\)/);
assert.match(read('./js/main.js'), /initComboFx\(this\.clickerSystem, monolith\)/);

console.log('test_r44_combo_frenzy.js: all assertions passed');
