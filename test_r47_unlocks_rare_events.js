// R47: first-time unlocks and rare events look and sound different.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AudioEngine, SOUND_IDS } from './js/engine/AudioEngine.js';
import { STATIC_CUES } from './js/ui/feedback.js';
import { rewards } from './js/ui/rewards.js';
import { UnlocksUI, UNLOCK_CEREMONY_MS } from './js/ui/unlocks.js';
import * as rare from './js/ui/rareEvents.js';
import { UNLOCKS } from './js/systems/UnlockSystem.js';
import { GameState } from './js/systems/GameState.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

function fakeEngine() {
  const e = new AudioEngine();
  const log = { osc: [], noise: 0 };
  const param = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, value: 0 });
  e.initialized = true;
  e.ensureContext = () => {};
  e.masterGain = {};
  e.ctx = {
    currentTime: 0, sampleRate: 8000, state: 'running',
    createOscillator() { const o = { type: '', frequency: param(), detune: param(), connect() {}, start() {}, stop() {} }; log.osc.push(o); return o; },
    createGain() { return { gain: param(), connect() {} }; },
    createBuffer(c, len) { return { getChannelData: () => new Float32Array(len) }; },
    createBufferSource() { log.noise++; return { connect() {}, start() {} }; },
    createBiquadFilter() { return { frequency: param(), Q: param(), connect() {} }; }
  };
  return { e, log };
}

// New sounds: ids resolve, they make voices, and mute / Fast Forward silence them
for (const id of ['mirage', 'caravan', 'brass-short', 'legendary']) {
  assert.ok(SOUND_IDS[id], id);
  const a = fakeEngine(); assert.ok(a.e.play(id)); assert.ok(a.log.osc.length >= 2, `${id} makes sound`);
  const b = fakeEngine(); b.e.muted = true; b.e.play(id); assert.equal(b.log.osc.length, 0, `${id} muted`);
  const c = fakeEngine(); c.e.quiet = true; c.e.play(id); assert.equal(c.log.osc.length, 0, `${id} quiet`);
}
// each is its own voice: distinct from the bell run and the brass fanfare (voice counts differ)
const count = (id) => { const f = fakeEngine(); f.e.play(id); return f.log.osc.length; };
assert.notEqual(count('brass-short'), count('brass'));
assert.ok(count('mirage') >= 3);

// A big toast plays brass, not the bell
{
  const played = [];
  const orig = AudioEngine.prototype.playTier;
  const { sound } = await import('./js/engine/AudioEngine.js');
  const saved = sound.playTier;
  sound.playTier = (t) => played.push(t);
  rewards.lastSoundAt = -Infinity;
  rewards.toastSound({ tier: 'big' }, {});
  rewards.lastSoundAt = -Infinity;
  rewards.toastSound({ tier: 'medium' }, {});
  rewards.lastSoundAt = -Infinity;
  rewards.toastSound({ tier: 'small' }, { sound: true });
  rewards.lastSoundAt = -Infinity;
  rewards.toastSound({ tier: 'medium' }, { sound: false });
  sound.playTier = saved;
  assert.deepEqual(played, ['big', 'medium', 'small']);
  assert.equal(typeof orig, 'function');
}

// Reduced-motion fallbacks exist and have CSS
const css = read('./css/rewards.css') + read('./css/style.css');
for (const k of ['anomaly-shimmer', 'unlock-pulse']) {
  assert.ok(STATIC_CUES[k], `STATIC_CUES.${k}`);
  assert.ok(css.includes(`.${STATIC_CUES[k].cls}`), `${STATIC_CUES[k].cls} styled`);
}
assert.equal(STATIC_CUES['unlock-pulse'].ms, 3 * 800, 'three 0.8 s pulses');
assert.match(css, /\.unlock-pulse\s*\{\s*animation:[^;]*\s3;/, 'unlock pulse loops exactly 3 times');
assert.ok(css.includes('.mirage-haze'));
assert.ok(css.includes('.caravan-camel'));
assert.ok(css.includes('.look-legendary'));
assert.ok(rare.CARAVAN_CROSS_MS === 1200 && rare.SHIMMER_MS === 600);

// No DOM: every call is a no-op
assert.equal(rare.anomalyAppear(), false);
assert.equal(rare.mirageHaze(60), false);
assert.equal(rare.caravanCrossing(), false);
assert.equal(rare.supernovaCount(1, 2), false);
assert.equal(rare.isCountingUp(null), false);

// Unlock reveal: one ceremony for several tabs, epic, 2 s, forced
{
  const calls = [];
  const saved = rewards.ceremony;
  rewards.ceremony = (ev) => calls.push(ev);
  const gs = new GameState();
  const app = { gameState: gs, onUnlock() {} };
  const ui = new UnlocksUI(app);
  ui.reveal([UNLOCKS[0]]);
  ui.reveal(UNLOCKS.slice(0, 2));
  rewards.ceremony = saved;
  assert.equal(calls.length, 2);
  assert.equal(calls[0].tier, 'epic');
  assert.equal(calls[0].durationMs, UNLOCK_CEREMONY_MS);
  assert.equal(UNLOCK_CEREMONY_MS, 2000);
  assert.ok(calls[0].force);
  assert.ok(calls[0].title.includes(UNLOCKS[0].name));
  assert.match(calls[1].title, /2/);
  assert.deepEqual(ui.pulseTabs.slice(0, 1), [UNLOCKS[0].tab]);
}

// Call sites
const has = (f, s) => assert.ok(read(f).includes(s), `${f} should contain ${s}`);
has('./js/systems/ClickerSystem.js', 'anomalyAppear()');
has('./js/systems/ClickerSystem.js', 'mirageHaze(MIRAGE_DURATION)');
has('./js/systems/ClickerSystem.js', 'caravanCrossing()');
has('./js/systems/ClickerSystem.js', 'supernovaCount(before');
has('./js/systems/GardenSystem.js', "sound.play('brass-short')");
has('./js/systems/GardenSystem.js', 'spawnRingBurst(clientX, clientY, 30');
has('./js/systems/GardenSystem.js', "sound.playGem('rare')");
has('./js/systems/MiningSystem.js', "sound.playGem('rare')");
has('./js/systems/GearSystem.js', "look: 'legendary'");
has('./js/main.js', 'isCountingUp(oilEl)');

console.log('R47 unlocks and rare events: ok');
