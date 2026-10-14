// Dig: the volume maths and what is kept, with no DOM and no audio (so a test can run it).
// Three sliders, each 0 to 100: Master, Music (the tune: the notes of the beat), Effects (hits, crew, buys).
// The defaults are chosen so the game is exactly as loud as before the sliders existed:
// Master 80 gives the old master gain 0.5; Music 70 and Effects 90 give their buses a gain of 1.
export const KEY = 'DIGGER_ARGON_VOLUME';
export const DEFAULTS = { master: 80, music: 70, fx: 90 };
export const OLD_MASTER_GAIN = 0.5;

export const clampLevel = (v, def = 0) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : def;
};
// the master gain node: 0 at 0, the old 0.5 at 80, 0.625 at 100
export const masterGain = m => OLD_MASTER_GAIN * clampLevel(m) / DEFAULTS.master;
// a bus gain: 1 at its default, 0 at 0
export const busGain = (v, def) => clampLevel(v) / def;
// the loudness a sound ends up with, for one of the two kinds (muted = nothing)
export const effective = (l, kind, muted = false) => (muted ? 0 : masterGain(l.master) * busGain(l[kind], DEFAULTS[kind]));

export function normalise(o) {
  const r = {};
  for (const k of Object.keys(DEFAULTS)) r[k] = clampLevel(o && o[k] !== undefined ? o[k] : DEFAULTS[k], DEFAULTS[k]);
  return r;
}
export function load(store) {
  try { const raw = store.getItem(KEY); return normalise(raw ? JSON.parse(raw) : null); } catch { return normalise(null); }
}
export function save(store, l) {
  try { store.setItem(KEY, JSON.stringify(normalise(l))); return true; } catch { return false; }
}
