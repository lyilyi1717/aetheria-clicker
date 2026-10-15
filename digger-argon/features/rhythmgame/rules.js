// Dig feature "rhythmgame": The Pre-Gate "Gate Rhythm Climax" Mini-Game.
//
// Trigger & Placement:
//   - When approaching each Gate Boss (the Big Rock of a Gate), an opt-in rhythmic prompt appears.
//   - Playable ONCE per Gate per run. Independent of core pacing; a tactical power surge.
//
// Mechanics:
//   - 10 seconds of focused rhythmic gameplay on a horizontal track.
//   - Speed (BPM) and pattern complexity scale by Gate depth and Chapter:
//       Chapter 1 (25-75m): 100-110 BPM steady quarters and halves.
//       Mid Chapters (100-150m): 120-140 BPM syncopated 8th-note grooves.
//       Deep Chapters (175m+): 150-180 BPM polyrhythmic darbuka patterns.
//
// Reward:
//   - Completing the mini-game awards a massive temporary damage boost against the upcoming Gate Boss
//     (up to 10x Boss Damage).
//
// Musicality:
//   - Tuned in modal D-minor / Bayati harmonic resonance, quantized to the master 16-step grid.

import { use, emit } from '../../core/registry.js';
import { isBossRow } from '../boss/rules.js';
import strings from './strings.js';

export const RHYTHM_DURATION_SEC = 10;
export const MAX_BOSS_RHYTHM_MULT = 10;

// Calculate BPM and beat pattern for a given floor and chapter
export function rhythmDifficulty(s, floor = 25) {
  const ch = (s && s.run && s.run.ch) || (floor <= 75 ? 1 : floor <= 150 ? 2 : 3);
  let bpm = 100;
  let pattern = '1.1.1.1.'; // default quarter notes
  let title = 'steady';

  if (ch === 1 || floor <= 75) {
    // Chapter 1: 100 - 110 BPM steady quarters and 8ths
    bpm = floor <= 25 ? 100 : floor <= 50 ? 105 : 110;
    pattern = floor <= 25 ? '1...1...1...1...' : '1.1.1.1.1.1.1.1.';
    title = 'caravan_beat';
  } else if (ch === 2 || floor <= 150) {
    // Mid Chapters: 120 - 140 BPM syncopated 8th grooves
    const prog = Math.min(1, Math.max(0, (floor - 75) / 75));
    bpm = Math.round(120 + prog * 20);
    pattern = '1.11.1.11.11.1.1'; // syncopated Gulf rhythm
    title = 'sand_groove';
  } else {
    // Deep/Late Chapters: 150 - 180 BPM polyrhythmic darbuka patterns
    const prog = Math.min(1, Math.max(0, (floor - 150) / 100));
    bpm = Math.round(150 + prog * 30);
    pattern = '11.1.11.11.1.11.'; // fast polyrhythmic darbuka
    title = 'darbuka_climax';
  }

  return { bpm, pattern, title, floor, ch };
}

// Generate the timestamps (in seconds from start) of beats within the 10-second duration
export function rhythmGenerateSchedule(bpm, pattern = '1.1.1.1.', duration = RHYTHM_DURATION_SEC) {
  const stepTime = 15 / bpm; // 16th-note duration
  const beats = [];
  const patLen = pattern.length;
  let t = 0.6; // initial lead-in time so the player can prepare

  let step = 0;
  while (t < duration - 0.4) {
    const char = pattern[step % patLen];
    if (char === '1') {
      beats.push({
        id: beats.length,
        time: Math.round(t * 1000) / 1000,
        hit: false,
        rating: null,
      });
    }
    t += stepTime;
    step++;
  }

  return beats;
}

// Check if the rhythm climax can be played for this boss/gate
export function rhythmCanPlay(s, floor) {
  if (!s) return false;
  const b = s.boss;
  if (!b || b.hp <= 0) return false;
  if (floor === undefined) floor = b.row;
  if (b.row !== floor) return false;

  // Must be a gate row or boss row
  if (!isBossRow(floor)) return false;

  // Once per gate per run:
  const key = `${(s.run && s.run.key) || 'site'}:${floor}`;
  if (s.rhythmDone && s.rhythmDone[key]) return false;
  if (b.rhythmPlayed) return false;

  return true;
}

// Calculate the damage multiplier awarded based on performance (up to 10.0x)
export function rhythmCalcMult(score, maxCombo, totalBeats) {
  if (!totalBeats || totalBeats <= 0) return 2.0;
  const maxPossibleScore = totalBeats * 100;
  const scorePct = Math.min(1, Math.max(0, score / maxPossibleScore));
  const comboPct = Math.min(1, Math.max(0, maxCombo / totalBeats));

  // Balanced grading: High performance earns the full 10x multiplier
  let rank = 'C';
  let mult = 2.0;

  if (scorePct >= 0.82 || comboPct >= 0.75) {
    rank = 'S';
    mult = MAX_BOSS_RHYTHM_MULT; // 10.0x!
  } else if (scorePct >= 0.62 || comboPct >= 0.55) {
    rank = 'A';
    mult = 7.5;
  } else if (scorePct >= 0.42 || comboPct >= 0.35) {
    rank = 'B';
    mult = 5.0;
  } else if (scorePct >= 0.20) {
    rank = 'C';
    mult = 3.0;
  }

  return { mult, rank, scorePct: Math.round(scorePct * 100) };
}

// Mark the mini-game completed and set the boss damage surge
export function rhythmFinish(s, floor, score, maxCombo, totalBeats, stats = {}, ev = () => {}) {
  const key = `${(s.run && s.run.key) || 'site'}:${floor}`;
  s.rhythmDone = s.rhythmDone || {};
  s.rhythmDone[key] = true;

  if (s.boss && s.boss.row === floor) {
    s.boss.rhythmPlayed = true;
  }

  const { mult, rank, scorePct } = rhythmCalcMult(score, maxCombo, totalBeats);
  s.bossRhythmMult = mult;
  s.rhythmLastResult = {
    floor,
    score,
    maxCombo,
    totalBeats,
    mult,
    rank,
    scorePct,
    stats,
  };

  emit(s, ev, 'rhythmComplete', s.rhythmLastResult);
  return s.rhythmLastResult;
}

export const rhythmMult = s => (s && s.bossRhythmMult) || 1;

export const rhythmgame = use({
  id: 'rhythmgame',
  strings,
  state: {
    rhythmDone: { init: () => ({}), perSite: true },
    bossRhythmMult: { init: () => 1, perSite: true },
    rhythmLastResult: { init: () => null, perSite: true },
  },
  mods: {
    // Apply up to 10x Boss Damage multiplier when hitting any boss while rhythm surge is active
    damage: {
      at: 55,
      fn(dmg, s, cell, src, info, r) {
        if (cell && cell.t === 'boss' && s.bossRhythmMult && s.bossRhythmMult > 1) {
          return dmg * s.bossRhythmMult;
        }
        return dmg;
      },
    },
  },
  hooks: {
    // When the boss is defeated, clear the temporary surge multiplier
    bossDown(s, r) {
      s.bossRhythmMult = 1;
    },
  },
});
