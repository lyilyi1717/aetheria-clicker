// R41: feedback-tier helper and effect budget (docs/game-feel-opportunities.md §4). Checks the
// pure budgets (tiers, phone, reduced motion), chains and sound cooldowns, the particle and text
// caps and "+n" merging in ParticleEngine, the helper's routing (T3 goes to rewards.ceremony,
// no-op without a DOM) and that the click/crit/spark call sites go through it.
// Run: node test_feedback.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  budgetFor, clampTier, createFeedbackState, chainStep, soundReady, shouldMerge, overCap,
  particleCap, isPhoneWidth, addAmounts,
  MAX_PARTICLES, MAX_PARTICLES_PHONE, MAX_TEXTS, CHAIN_WINDOW_MS, CHAIN_CAP, MERGE_MS, MERGE_PX,
  MERGE_SIZE_MAX, MERGE_MAX_AGE_MS, FAST_DECAY, HARD_CAP_FACTOR
} from './js/ui/feedbackBudget.js';
import { ParticleEngine } from './js/engine/ParticleEngine.js';
import { Feedback } from './js/ui/feedback.js';
import { sound, SOUND_IDS } from './js/engine/AudioEngine.js';
import { BigNum } from './js/engine/BigNum.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

console.log('--- budgets: tiers, phone x0.6, reduced motion ---');
{
  assert.equal(clampTier(-1), 0);
  assert.equal(clampTier(7), 3);
  assert.equal(clampTier('x'), 0);
  const t0 = budgetFor(0);
  const t2 = budgetFor(2);
  assert.ok(t0.sparks >= 6 && t0.sparks <= 10, 'T0 6-10 sparks');
  assert.ok(budgetFor(1).sparks >= 16 && budgetFor(1).sparks <= 24, 'T1 16-24 sparks');
  assert.ok(t2.sparks >= 30 && t2.sparks <= 40, 'T2 30-40 sparks');
  assert.equal(budgetFor(3).sparks, 60);
  assert.equal(t0.shake, false, 'only T2 shakes');
  assert.equal(t2.shake, true);
  assert.equal(t2.hitStop, true);
  assert.equal(budgetFor(0, { sparks: 10 }).sparks, 10, 'call site count wins');
  assert.equal(budgetFor(0, { sparks: 10, phone: true }).sparks, 6, 'phone x0.6');
  assert.equal(budgetFor(0, { sparks: 1, phone: true }).sparks, 1, 'phone keeps at least one');
  assert.equal(budgetFor(0, { sparks: 0, phone: true }).sparks, 0);
  const rm = budgetFor(2, { reduced: true, sparks: 35 });
  assert.equal(rm.sparks, 0, 'reduced motion: no sparks');
  assert.equal(rm.shake, false, 'reduced motion: no shake');
  assert.equal(rm.hitStop, false, 'reduced motion: no hit-stop');
  assert.deepEqual([0, 1, 2].map(t => budgetFor(t).cooldownMs), [0, 250, 1000]);
  assert.equal(particleCap(false), 250);
  assert.equal(particleCap(true), 150);
  assert.equal(isPhoneWidth(375), true);
  assert.equal(isPhoneWidth(480), true);
  assert.equal(isPhoneWidth(1024), false);
  assert.equal(isPhoneWidth(0), false, 'no window is not a phone');
}

console.log('--- chains rise, cap and fall gently ---');
{
  const s = createFeedbackState();
  assert.equal(chainStep(s, 'combo', 0), 0);
  assert.equal(chainStep(s, 'combo', 100), 1);
  assert.equal(chainStep(s, 'combo', 200), 2);
  for (let i = 0; i < 10; i++) chainStep(s, 'combo', 300 + i * 10);
  assert.equal(chainStep(s, 'combo', 400), CHAIN_CAP, 'capped');
  // Two windows of silence: two steps down, then +1 for this event
  assert.equal(chainStep(s, 'combo', 400 + 2 * CHAIN_WINDOW_MS + 1), CHAIN_CAP - 1);
  assert.equal(chainStep(s, 'other', 400), 0, 'chains are per kind');
  assert.equal(chainStep(s, 'combo', 1e9), 0, 'long silence resets to 0');
}

console.log('--- sound cooldowns per kind and tier ---');
{
  const s = createFeedbackState();
  assert.equal(soundReady(s, 'click', 0, 0), true);
  assert.equal(soundReady(s, 'click', 0, 1), true, 'T0 has no cooldown');
  assert.equal(soundReady(s, 'crit', 1, 0), true);
  assert.equal(soundReady(s, 'crit', 1, 249), false, 'T1 250 ms');
  assert.equal(soundReady(s, 'crit', 1, 250), true);
  assert.equal(soundReady(s, 'gem', 1, 260), true, 'cooldowns are per kind');
  assert.equal(soundReady(s, 'boss', 2, 0), true);
  assert.equal(soundReady(s, 'boss', 2, 999), false, 'T2 1 s');
  assert.equal(soundReady(s, 'boss', 2, 1000), true);
}

console.log('--- caps and merge rules ---');
{
  assert.deepEqual(overCap(100, 250), { fade: 0, drop: 0 });
  assert.deepEqual(overCap(260, 250), { fade: 10, drop: 0 });
  assert.deepEqual(overCap(510, 250), { fade: 260, drop: 10 });
  const prev = { mergeKey: 'click', alpha: 1, bornAt: 0, updatedAt: 0, originX: 100, originY: 100 };
  assert.equal(shouldMerge(prev, 'click', 110, 110, 100), true);
  assert.equal(shouldMerge(prev, 'crit', 110, 110, 100), false, 'other key');
  assert.equal(shouldMerge(prev, 'click', 100 + MERGE_PX + 1, 100, 100), false, 'too far');
  assert.equal(shouldMerge(prev, 'click', 100, 100, MERGE_MS + 1), false, 'too late');
  assert.equal(shouldMerge({ ...prev, updatedAt: MERGE_MAX_AGE_MS - 50 }, 'click', 100, 100, MERGE_MAX_AGE_MS + 1), false,
    'a long merge stops taking more');
  assert.equal(shouldMerge(null, 'click', 0, 0, 0), false);
  assert.equal(addAmounts(2, 3), 5);
  assert.equal(addAmounts(new BigNum(2), new BigNum(3)).toNumber(), 5);
}

// A fake DOM so ParticleEngine spawns (it reads data-motion) and themeColor works
const savedDoc = globalThis.document;
const hadDoc = 'document' in globalThis;
const restoreDoc = () => { if (hadDoc) globalThis.document = savedDoc; else delete globalThis.document; };

console.log('--- ParticleEngine: particle cap, oldest fade faster, hard cap drops ---');
try {
  globalThis.document = { documentElement: { dataset: { motion: 'full' } } };
  const p = new ParticleEngine();
  p.width = 1280;
  for (let i = 0; i < 25; i++) p.spawnClickSparks(10, 10, 10);
  assert.equal(p.particles.length, 250);
  assert.ok(p.particles.every(q => q.decay < FAST_DECAY), 'at the cap nothing is sped up');
  p.spawnClickSparks(10, 10, 10);
  assert.equal(p.particles.length, 260, 'new ones are never dropped');
  assert.ok(p.particles.slice(0, 10).every(q => q.decay >= FAST_DECAY), 'the 10 oldest fade fast');
  assert.ok(p.particles.slice(10).every(q => q.decay < FAST_DECAY), 'the rest are untouched');
  for (let i = 0; i < 40; i++) p.spawnClickSparks(10, 10, 10);
  assert.equal(p.particles.length, MAX_PARTICLES * HARD_CAP_FACTOR, 'hard ceiling');

  const phone = new ParticleEngine();
  phone.width = 375;
  for (let i = 0; i < 20; i++) phone.spawnClickSparks(10, 10, 10);
  const fast = phone.particles.filter(q => q.decay >= FAST_DECAY).length;
  assert.equal(fast, 200 - MAX_PARTICLES_PHONE, 'phone cap is 150');
} finally { restoreDoc(); }

console.log('--- ParticleEngine: text cap and "+n" merging ---');
try {
  globalThis.document = { documentElement: { dataset: { motion: 'full' } } };
  const p = new ParticleEngine();
  const fmt = (n) => n.format('standard', 1);
  const a = p.spawnFloatingText(200, 200, '+5', '#fff', false, { key: 'click', amount: new BigNum(5), fmt });
  const b = p.spawnFloatingText(210, 205, '+7', '#fff', false, { key: 'click', amount: new BigNum(7), fmt });
  assert.equal(a, b, 'merged into the same text');
  assert.equal(p.texts.length, 1);
  assert.equal(a.text, '+' + new BigNum(12).format('standard', 1));
  assert.equal(a.size, 17, 'grows a step');
  for (let i = 0; i < 20; i++) p.spawnFloatingText(200, 200, '+1', '#fff', false, { key: 'click', amount: new BigNum(1), fmt });
  assert.equal(a.size, MERGE_SIZE_MAX, 'size capped');
  // Crits never merge; other keys don't merge; far away doesn't merge
  p.spawnFloatingText(200, 200, 'CRIT +9', '#fff', true, { key: 'click', amount: new BigNum(9), fmt });
  p.spawnFloatingText(200, 200, '+1', '#fff', false, { key: 'autotap', amount: new BigNum(1), fmt });
  p.spawnFloatingText(400, 400, '+1', '#fff', false, { key: 'click', amount: new BigNum(1), fmt });
  assert.equal(p.texts.length, 4);
  // A merge target that is gone does not take more
  p.texts.length = 0;
  p.spawnFloatingText(200, 200, '+1', '#fff', false, { key: 'click', amount: new BigNum(1), fmt });
  assert.equal(p.texts.length, 1);

  const q = new ParticleEngine();
  for (let i = 0; i < 45; i++) q.spawnFloatingText(i * 100, 0, 'x', '#fff');
  assert.equal(q.texts.length, 45);
  assert.equal(q.texts.filter(x => x.decay >= FAST_DECAY).length, 45 - MAX_TEXTS, 'text cap 40');

  const s = new ParticleEngine();
  s.suppressed = true;
  s.spawnFloatingText(0, 0, 'x');
  s.spawnClickSparks(0, 0, 10);
  assert.equal(s.texts.length + s.particles.length, 0, 'Fast Forward suppresses');
} finally { restoreDoc(); }

console.log('--- helper: routing, cooldown fallback, reduced motion, T3, no DOM ---');
{
  const calls = [];
  const fakeParticles = {
    spawnClickSparks: (x, y, n, c) => calls.push(['sparks', n, c]),
    spawnFloatingText: (x, y, text, c, crit, merge) => calls.push(['text', text, crit, merge?.key ?? null])
  };
  const played = [];
  const fakeSound = { play: (id, pitch) => played.push([id, pitch]) };
  const ceremonies = [];
  let now = 0;
  let reduced = false;
  let width = 1280;
  const fb = new Feedback({
    particles: fakeParticles, sound: fakeSound, rewards: { ceremony: (ev) => ceremonies.push(ev) },
    dom: () => true, now: () => now, reduced: () => reduced, width: () => width
  });

  const r0 = fb.fire(0, { kind: 'click', at: { x: 5, y: 5 }, sound: 'click', soundPitch: 1.1, sparks: 10, amount: 3, fmt: String, merge: true });
  assert.equal(r0.sparks, 10);
  assert.deepEqual(played, [['click', 1.1]]);
  assert.deepEqual(calls, [['sparks', 10, undefined], ['text', '+3', false, 'click']]);

  calls.length = 0; played.length = 0;
  fb.fire(1, { kind: 'crit', at: { x: 5, y: 5 }, sound: 'crit', fallbackSound: 'click', text: 'CRIT +9', isCrit: true });
  now = 100;
  const r1 = fb.fire(1, { kind: 'crit', at: { x: 5, y: 5 }, sound: 'crit', fallbackSound: 'click', text: 'CRIT +9', isCrit: true });
  assert.deepEqual(played.map(p => p[0]), ['crit', 'click'], 'crit on cooldown: the click still answers');
  assert.equal(r1.sound, 'click');
  assert.ok(calls.some(c => c[0] === 'text' && c[3] === null), 'explicit text never merges');

  calls.length = 0; played.length = 0;
  fb.fire(1, { kind: 'lbl', at: { x: 5, y: 5 }, label: 'SUPER CRIT!', sparks: 10 });
  assert.deepEqual(calls[1], ['text', 'SUPER CRIT!', true, null], 'label pops in crit style');
  calls.length = 0;
  fb.fire(0, { kind: 'lbl0', at: { x: 5, y: 5 }, label: 'nope', sparks: 0 });
  assert.equal(calls.length, 0, 'T0 has no label and 0 sparks spawn nothing');

  width = 375;
  calls.length = 0;
  fb.fire(0, { at: { x: 5, y: 5 }, sparks: 10 });
  assert.deepEqual(calls[0], ['sparks', 6, undefined], 'phone x0.6');

  reduced = true; width = 1280;
  calls.length = 0; played.length = 0;
  fb.fire(2, { kind: 'boss', at: { x: 5, y: 5 }, sparks: 35, sound: 'brass', label: 'BOSS DOWN!' });
  assert.ok(!calls.some(c => c[0] === 'sparks'), 'reduced motion: no sparks');
  assert.ok(calls.some(c => c[1] === 'BOSS DOWN!'), 'reduced motion: the callout stays');
  assert.deepEqual(played.map(p => p[0]), ['brass'], 'reduced motion: the sound stays');
  reduced = false;

  calls.length = 0; played.length = 0;
  const r = fb.fire(0, { kind: 'click', sound: 'click', sparks: 10, amount: 1 });
  assert.equal(r.sparks, 0, 'no point: sound only');
  assert.equal(calls.length, 0);
  assert.equal(played.length, 1);

  const ev = { tier: 'epic', title: 'New Well' };
  const r3 = fb.fire(3, { ceremony: ev, sound: 'choir', at: { x: 1, y: 1 } });
  assert.deepEqual(ceremonies, [ev], 'T3 goes through rewards.ceremony');
  assert.equal(r3.ceremony, true);

  now = 0;
  const c1 = fb.fire(0, { kind: 'combo', chain: true }).chain;
  now = 100;
  const c2 = fb.fire(0, { kind: 'combo', chain: true }).chain;
  assert.deepEqual([c1, c2], [0, 1], 'chain steps reach callers');

  const offline = new Feedback({ particles: fakeParticles, sound: fakeSound, dom: () => false });
  calls.length = 0; played.length = 0;
  assert.equal(offline.fire(1, { at: { x: 1, y: 1 }, sound: 'crit', sparks: 10 }), null);
  assert.equal(calls.length + played.length, 0, 'no DOM: no-op');

  const el = { textContent: '' };
  fb.reduced = () => true;
  fb.countUp(el, 0, 1234, { fmt: String });
  assert.equal(el.textContent, '1234', 'reduced motion: count-up jumps to the result');
  assert.equal(fb.hitStop({ classList: { add() { throw new Error('should not freeze'); } } }), false);
  assert.equal(fb.shake({ classList: { add() { throw new Error('should not shake'); } } }), false);
}

console.log('--- sound ids map to real voices ---');
{
  for (const [id, method] of Object.entries(SOUND_IDS)) {
    assert.equal(typeof sound[method], 'function', `${id} -> ${method}`);
  }
  assert.equal(sound.play('nope'), false);
}

console.log('--- call sites go through the helper ---');
{
  const clicker = read('./js/systems/ClickerSystem.js');
  assert.doesNotMatch(clicker, /particles\.spawn/, 'ClickerSystem spawns through feedback');
  assert.doesNotMatch(clicker, /sound\.play(Click|Crit)\(/, 'click/crit sounds go through feedback');
  assert.match(clicker, /feedback\.fire\(0, \{[\s\S]*?kind: 'click'[\s\S]*?merge: true/);
  assert.match(clicker, /feedback\.fire\(1, \{[\s\S]*?kind: 'crit'/);
  const combat = read('./js/systems/CombatSystem.js');
  assert.match(combat, /feedback\.fire\(isCrit \? 1 : 0, \{\s*kind: 'hit'/);
  const mining = read('./js/systems/MiningSystem.js');
  assert.doesNotMatch(mining, /sound\.playCrit\(/);
  assert.match(mining, /kind: 'dig-hit'/);
  assert.match(read('./js/ui/autoTap.js'), /kind: 'autotap'[\s\S]*merge: true/);
  const css = read('./css/animations.css');
  assert.match(css, /\.fx-shake\s*\{/);
  assert.match(css, /\.is-hitstop/);
}

console.log('test_feedback: all passed');
