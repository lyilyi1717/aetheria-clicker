// Dig: sound, made in code with Web Audio. No files. The core sounds are in `sfx` below;
// a feature adds its own with addSfx({ name() { if (!gap('name', 0.1)) return; tone(...); noise(...); } }).

let ctx = null, master = null, noiseBuf = null;
let muted = false;
const last = {};     // last play time per sound class (keeps fast repeats from stacking)

export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; }
export const isMuted = () => muted;

// Browsers only allow sound after a click or key press; call this from one.
export function unlock() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp); comp.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const a = noiseBuf.getChannelData(0);
  for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
}

export function gap(name, seconds) {
  if (!ctx || muted) return false;
  const now = ctx.currentTime;
  if (last[name] && now - last[name] < seconds) return false;
  last[name] = now;
  return true;
}

export function tone(freq, { type = 'triangle', a = 0.004, d = 0.15, vol = 0.25, slide = 0, at = 0 } = {}) {
  const t0 = ctx.currentTime + at;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + a + d);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + a + d + 0.05);
}

export function noise({ d = 0.15, vol = 0.3, from = 3000, to = 300, at = 0, type = 'lowpass' } = {}) {
  const t0 = ctx.currentTime + at;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type;
  f.frequency.setValueAtTime(from, t0);
  f.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + d);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  s.connect(f); f.connect(g); g.connect(master);
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

export function addSfx(map) {
  for (const [k, f] of Object.entries(map || {})) { if (sfx[k]) throw new Error(`Dig: sound "${k}" twice`); sfx[k] = f; }
}
