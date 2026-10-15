// Dig acoustics feature (rules): Harmonic Resonant Chasm (Chapter 9 / Month 8).
// Introduces high-tempo polyrhythms, Acoustic Resonance Meter, Acoustic Shockwave screen-clearing,
// and 180 / 200 BPM modes.
import { use, BLOCKS, emit, fold, PARAMS } from '../../core/registry.js';
import { COLS, cellAt, VIEW_ROWS } from '../../core/grid.js';
import { breakCell } from '../../core/rules.js';
import { isAccentWindow, ACOUSTIC_TEMPOS } from '../picks/beat.js';
import { picksBpm, picksCount } from '../picks/rules.js';
import { getTuning } from '../../core/tuning.js';
import strings from './strings.js';


export { ACOUSTIC_TEMPOS };

const p = {
  onBeatGain: 10,
  offBeatLoss: 5,
  maxResonance: 100,
  downbeatToleranceMs: 100,
  shockwaveRows: 3,
};

export function getResonance(s) {
  return (s && s.acoustics && s.acoustics.resonance) || 0;
}

export function isDownbeat(clock, bpm = 100, tolMs = p.downbeatToleranceMs) {
  const quarterSec = 60 / bpm;
  const modT = ((clock % quarterSec) + quarterSec) % quarterSec;
  const delta = Math.min(modT, quarterSec - modT);
  return delta * 1000 <= tolMs + 1e-6;
}

export function isAcousticActive(s) {
  if (!s) return false;
  if (s.acoustics && s.acoustics.active !== undefined) return s.acoustics.active;
  const ch = (s.run && s.run.ch) || s.ch || 1;
  if (ch >= 9) return true;
  if (s.zone === 'chasm' || (s.run && s.run.zone === 'chasm')) return true;
  if (s.unlocked && (s.unlocked['acoustic:shockwave'] || s.unlocked['acoustics'])) return true;
  if (s.acoustics && s.acoustics.resonance > 0) return true;
  return false;
}

export function triggerAcousticShockwave(s, ev = () => {}, opts = {}) {
  if (!s || !s.rows) return 0;

  let cleared = 0;
  const numRows = (opts && opts.rows) || getTuning('shockwaveRows', s, p.shockwaveRows) || 3;
  const maxR = Math.min(s.top + s.rows.length, s.top + numRows);
  for (let r = s.top; r < maxR; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cellAt(s, r, c);
      if (!cell) continue;
      const B = BLOCKS[cell.t];
      // Do not destroy Big Rocks or boss walls
      if (cell.boss || (B && (B.wall || B.boss)) || cell.t === 'boss' || cell.t === 'rock') {
        continue;
      }
      breakCell(s, r, c, 'shockwave', ev, { shockwave: true, chain: 1 });
      cleared++;
    }
  }
  if (!s.acoustics) s.acoustics = { resonance: 0, shockwaves: 0, highBpmMode: 0 };
  s.acoustics.resonance = 0;
  s.acoustics.shockwaves = (s.acoustics.shockwaves || 0) + 1;
  if (ev) emit(s, ev, 'acousticShockwave', { cleared, rows: maxR - s.top });
  return cleared;
}

export function addResonance(s, amount, ev) {
  if (!s.acoustics) s.acoustics = { resonance: 0, shockwaves: 0, highBpmMode: 0 };
  const prev = s.acoustics.resonance;
  s.acoustics.resonance = Math.max(0, Math.min(p.maxResonance, s.acoustics.resonance + amount));
  if (ev) emit(s, ev, 'resonanceChange', { resonance: s.acoustics.resonance, delta: amount });
  if (s.acoustics.resonance >= p.maxResonance) {
    triggerAcousticShockwave(s, ev);
  }
  return s.acoustics.resonance;
}

export function recordStrike(s, onBeat, ev) {
  const onGain = getTuning('resonanceGain', s, p.onBeatGain);
  const delta = onBeat ? onGain : -p.offBeatLoss;
  return addResonance(s, delta, ev);
}


export function setAcousticTempo(s, bpm, ev) {
  if (!s.acoustics) s.acoustics = { resonance: 0, shockwaves: 0, highBpmMode: 0 };
  s.acoustics.highBpmMode = bpm;
  if (ev) emit(s, ev, 'acousticTempoSet', { bpm });
  return bpm;
}

export const acoustics = use({
  id: 'acoustics',
  params: p,
  strings,
  state: {
    acoustics: { init: () => ({ resonance: 0, shockwaves: 0, highBpmMode: 0 }), perSite: true },
  },
  mods: {
    bpm(v, s) {
      if (s && s.acoustics && s.acoustics.highBpmMode) {
        return s.acoustics.highBpmMode;
      }
      return v;
    },
  },
  hooks: {
    swung(s, sw, ev) {
      if (!isAcousticActive(s)) return;
      if (s.acoustics && s.acoustics._lastSwingT !== undefined && Math.abs(s.t - s.acoustics._lastSwingT) < 1e-4) return;
      if (!s.acoustics) s.acoustics = { resonance: 0, shockwaves: 0, highBpmMode: 0 };
      s.acoustics._lastSwingT = s.t;

      const bpm = picksBpm(s);
      const onBeat = isDownbeat(s.t, bpm) || isAccentWindow(s.t, bpm, picksCount(s));
      recordStrike(s, onBeat, ev);
    },
  },
  firsts: {
    acousticShockwave: () => 'acoustic:shockwave',
  },
  unlocks: [
    { id: 'acoustic:shockwave', cat: 'core', group: 'acoustics' },
  ],
});
