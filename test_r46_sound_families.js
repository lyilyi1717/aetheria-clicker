// R46: sound families by meaning. Fake Web Audio context counts voices; checks the family
// methods, rarity scaling, mute, ids and call sites.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AudioEngine, SOUND_IDS, SPELL_INTERVALS } from './js/engine/AudioEngine.js';

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

const voices = (rarity) => { const { e, log } = fakeEngine(); e.playGem(rarity); return log.osc.length; };
assert.equal(voices('common'), 2);
assert.equal(voices('rare'), 3);
assert.equal(voices('epic'), 4 + 2);       // 4 notes + 2 shimmer partials
assert.equal(voices('legendary'), 4 + 1);  // 4 notes + bell partial
assert.equal(voices(undefined), 2);
assert.equal(voices('nonsense'), 2);

{ const { e, log } = fakeEngine(); e.playCoins(); assert.equal(log.osc.length, 3); }
{ const { e, log } = fakeEngine(); e.playBlast(); assert.equal(log.noise, 1); assert.equal(log.osc.length, 1); }
{ const { e, log } = fakeEngine(); e.playSpell(SPELL_INTERVALS.fifth); assert.equal(log.osc.length, 1); }

// mute and Fast Forward quiet respected
for (const m of ['playCoins', 'playBlast', 'playGem', 'playSpell']) {
  const a = fakeEngine(); a.e.muted = true; a.e[m](); assert.equal(a.log.osc.length + a.log.noise, 0, m + ' muted');
  const b = fakeEngine(); b.e.quiet = true; b.e[m](); assert.equal(b.log.osc.length + b.log.noise, 0, m + ' quiet');
}

// ids
for (const id of ['coins', 'blast', 'gem-rare', 'gem-epic', 'gem-legendary']) {
  assert.ok(SOUND_IDS[id], id);
  assert.equal(typeof AudioEngine.prototype[SOUND_IDS[id]], 'function');
}

// call sites
const has = (f, s) => assert.ok(read(f).includes(s), `${f} should contain ${s}`);
has('./js/systems/BountySystem.js', 'sound.playCoins()');
has('./js/systems/BountySystem.js', "kind: 'contract-claim'");
has('./js/ui/calendar.js', 'sound.playCoins');
has('./js/systems/CalendarSystem.js', "kind: 'dallah', icon: '☕', color: '#e7c38a', sound: false");
has('./js/systems/MiningSystem.js', 'sound.playBlast()');
has('./js/systems/MiningSystem.js', 'GEM_RARITY[block.content]');
has('./js/systems/MarketSystem.js', 'sound.playCoins()');
has('./js/systems/SpellSystem.js', 'SPELL_INTERVAL_BY_ID[spellId]');
assert.ok(!/gold_cache'\) \{\s*sound\.playBuy/.test(read('./js/systems/MiningSystem.js')), 'gold cache is not a spend');
console.log('R46 sound families OK');
