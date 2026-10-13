// Dig: sound, made in code with Web Audio. No files. The core sounds are in `sfx` below;
// a feature adds its own with addSfx({ name() { if (!gap('name', 0.1)) return; tone(...); noise(...); } }).
//
// The mixer: one feature may say WHEN and HOW LOUD a named sound plays, without touching the sound.
//   setMixer(name => null | false | { at, gain })
// It is asked each time a sound function (sfx.hit, sfx.break, a feature's own) is called:
//   null            play it now, as written
//   false           do not play it
//   { at, gain }    play it `at` seconds from now, every volume in it times `gain`
// While the sound function runs, tone(), noise() and gap() all read that shift, so a sound keeps its
// own shape and its own rule against stacking. audioTime() is the audio clock (null: no sound yet),
// for a feature that schedules ahead of time (the picks' bar).

import { DEFAULTS, masterGain, busGain } from './volume.js';

let ctx = null, master = null, noiseBuf = null, musicBus = null, fxBus = null;
let muted = false;
let vol3 = { ...DEFAULTS };   // the three sliders (0 to 100), see volume.js; the settings menu sets them
let volume = masterGain(vol3.master);   // the master gain node's level when not muted
let bus = 'fx';      // which bus the sound function now running plays into
// Sounds that are the tune (the pentatonic notes of the beat) go to the Music slider; the rest are Effects.
const MUSIC = new Set(['break', 'coin', 'comboUp', 'star']);
export const addMusic = names => { for (const n of names || []) MUSIC.add(n); };
const last = {};     // last play time per sound class (keeps fast repeats from stacking)
let mixer = null;    // see "The mixer" above
let shift = 0, level = 1;   // in force while a mixed sound function runs

export function setMixer(fn) { if (mixer && fn) throw new Error('Dig: two mixers'); mixer = fn; }
export const audioTime = () => (ctx && ctx.state === 'running' ? ctx.currentTime : null);
// Zone kits. A feature may give a named sound another voice for a zone (addVoices); setKit says which zone
// and how deep (0 = near the top, 1 to 4 = the four deep layers). 'arabia' has no voices: it plays the
// sounds as written. A hit or crit gets a low, quiet echo under it when the dig is deeper than 0.
let kit = 'arabia', depth = 0;
const voices = {};   // sound name -> { zone: function }
const tails = new Set(['hit', 'crit']);
export function setKit(zone, tier = 0) { kit = zone; depth = tier; }
export const kitZone = () => kit;
export const kitDepth = () => depth;
// the pitch factor of the depth (1 at the top, lower the deeper): kit voices multiply their notes by it
export const depthPitch = () => 1 - 0.05 * depth;
export function addVoices(zone, map) { for (const [k, f] of Object.entries(map || {})) (voices[k] || (voices[k] = {}))[zone] = f; }
function play(name, f, a) {
  bus = MUSIC.has(name) ? 'music' : 'fx';
  const v = voices[name], g = (v && v[kit]) || f;
  const r = g(...a);
  bus = 'fx';         // a tone played outside a named sound (a feature calling tone() itself) is an effect
  if (depth > 0 && tails.has(name) && gap('tail', 0.06)) tone(62 * depthPitch(), { type: 'sine', d: 0.1 + 0.05 * depth, vol: 0.03 + 0.012 * depth, slide: 40, at: 0.025 });
  return r;
}
function mixed(name, f) {
  return (...a) => {
    const m = mixer ? mixer(name) : null;
    if (m === false) return undefined;
    if (!m) return play(name, f, a);
    const s0 = shift, l0 = level;
    shift = Math.max(0, m.at || 0); level = m.gain === undefined ? 1 : m.gain;
    try { return play(name, f, a); } finally { shift = s0; level = l0; }
  };
}

export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : volume; }
export function setVolume(v) { volume = v; if (master && !muted) master.gain.value = v; }
// The three sliders: applied to gain nodes, so sounds already playing change level too.
export function setLevels(l) {
  vol3 = { ...vol3, ...l };
  volume = masterGain(vol3.master);
  if (master && !muted) master.gain.value = volume;
  if (musicBus) musicBus.gain.value = busGain(vol3.music, DEFAULTS.music);
  if (fxBus) fxBus.gain.value = busGain(vol3.fx, DEFAULTS.fx);
}
export const getLevels = () => ({ ...vol3 });
// a short sample so the player hears the level they just set
export function preview(kind) {
  if (!ctx || muted) return;
  if (kind === 'music') sfx.comboUp(0); else sfx.hit(false);
}
export const isMuted = () => muted;

// Browsers only allow sound after a click or key press; call this from one.
export function unlock() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : volume;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp); comp.connect(ctx.destination);
  musicBus = ctx.createGain(); fxBus = ctx.createGain();
  musicBus.connect(master); fxBus.connect(master);
  musicBus.gain.value = busGain(vol3.music, DEFAULTS.music);
  fxBus.gain.value = busGain(vol3.fx, DEFAULTS.fx);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const a = noiseBuf.getChannelData(0);
  for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
}

export function gap(name, seconds) {
  if (!ctx || muted) return false;
  const now = ctx.currentTime + shift;
  if (last[name] && now - last[name] < seconds) return false;
  last[name] = now;
  return true;
}

export function tone(freq, { type = 'triangle', a = 0.004, d = 0.15, vol = 0.25, slide = 0, at = 0 } = {}) {
  if (!ctx) return;   // no sound before the first click; a feature's handler must not fail on it
  const t0 = ctx.currentTime + at + shift;
  vol *= level;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + a + d);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  o.connect(g); g.connect(bus === 'music' ? musicBus : fxBus);
  o.start(t0); o.stop(t0 + a + d + 0.05);
}

export function noise({ d = 0.15, vol = 0.3, from = 3000, to = 300, at = 0, type = 'lowpass' } = {}) {
  if (!ctx) return;   // no sound before the first click; a feature's handler must not fail on it
  const t0 = ctx.currentTime + at + shift;
  vol *= level;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type;
  f.frequency.setValueAtTime(from, t0);
  f.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + d);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  s.connect(f); f.connect(g); g.connect(bus === 'music' ? musicBus : fxBus);
  s.start(t0, Math.random() * 0.5); s.stop(t0 + d + 0.05);
}

const PENT = [0, 2, 4, 7, 9];
export const pent = n => 261.63 * Math.pow(2, (PENT[n % 5] + 12 * Math.floor(n / 5)) / 12);
export const wob = () => 0.96 + Math.random() * 0.08;

export const sfx = {
  hit(hard) {
    if (!gap('hit', 0.035)) return;
    tone((hard ? 150 : 190) * wob(), { type: 'sine', d: 0.07, vol: 0.3, slide: 60 });
    noise({ d: 0.05, vol: hard ? 0.22 : 0.14, from: hard ? 5000 : 2500, to: 600 });
  },
  crit() {
    if (!gap('crit', 0.05)) return;
    tone(110, { type: 'sine', d: 0.16, vol: 0.5, slide: 40 });
    noise({ d: 0.12, vol: 0.3, from: 7000, to: 500 });
    tone(1320 * wob(), { type: 'square', d: 0.08, vol: 0.07 });
  },
  // a block breaks: crunch, plus a note that climbs with the combo
  break(combo, ore) {
    if (!gap('break', 0.03)) return;
    noise({ d: 0.11, vol: 0.2, from: 1800, to: 200 });
    const n = Math.min(combo, 14);
    tone(pent(n) * (ore ? 2 : 1), { type: 'triangle', d: ore ? 0.22 : 0.13, vol: ore ? 0.2 : 0.13 });
    if (ore) tone(pent(n) * 3, { type: 'sine', d: 0.25, vol: 0.07, at: 0.04 });
  },
  crew() {
    if (!gap('crew', 0.09)) return;
    tone(140 * wob(), { type: 'sine', d: 0.05, vol: 0.07, slide: 70 });
  },
  coin(n) {
    if (!gap('coin', 0.045)) return;
    tone(pent(5 + (n % 10)) * 2, { type: 'square', d: 0.05, vol: 0.035 });
  },
  buy() {
    if (!gap('buy', 0.05)) return;
    tone(523, { type: 'square', d: 0.06, vol: 0.09 });
    tone(784, { type: 'square', d: 0.14, vol: 0.09, at: 0.06 });
  },
  deny() { if (gap('deny', 0.15)) tone(150, { type: 'square', d: 0.1, vol: 0.06, slide: 100 }); },
  comboUp(step) {
    if (!gap('comboUp', 0.1)) return;
    tone(pent(10 + step), { type: 'square', d: 0.1, vol: 0.09 });
    tone(pent(12 + step), { type: 'square', d: 0.2, vol: 0.09, at: 0.07 });
  },
  star() {
    if (!gap('star', 0.3)) return;
    [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, { type: 'triangle', d: 0.35, vol: 0.2, at: i * 0.1 }));
  },
};

for (const k of Object.keys(sfx)) sfx[k] = mixed(k, sfx[k]);

export function addSfx(map) {
  for (const [k, f] of Object.entries(map || {})) { if (sfx[k]) throw new Error(`Dig: sound "${k}" twice`); sfx[k] = mixed(k, f); }
}
