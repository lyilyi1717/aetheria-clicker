// Dig feature "rhythmgame": The Pre-Gate "Gate Rhythm Climax" Mini-Game.
//
// Trigger & Placement:
//   - When approaching each Gate Boss (the Big Rock of a Gate), an opt-in rhythmic prompt appears.
//   - Playable ONCE per Gate per run. Independent of core pacing; a tactical power surge.
//
// Multi-Bar Rhythmic Phrasing & Beat Variations:
//   - Structured into 4 progressive musical bars:
//       Bar 1: Foundational Groove (establishes theme, pulse, and primary beats)
//       Bar 2: Syncopated Off-Beat & Doublets (adds swing and double-taps)
//       Bar 3: Polyrhythmic Roll / Drop (rapid flourishes and rhythmic rolls)
//       Bar 4: Grand Climax (driving syncopated crescendo into the boss battle)
//   - Authentic Middle-Eastern & World Percussion rhythm families:
//       Malfuf: Fast syncopated 2/4 desert drive
//       Ayoub / Zar: Hypnotic accelerating pulse
//       Maqsum: Rich 4/4 syncopated classical standard
//       Sombati: Dynamic Darbuka groove with syncopated triplets
//       Darbuka Climax: High-BPM polyrhythmic rolls and syncopations
//   - Note Variations:
//       Dum ('D' or '1'): Strong bass accent (large golden orb, deep resonant sub-bass thump)
//       Tak ('T' or '2'): Snare / rim accent (crisp cyan note, snappy treble chime)
//       Doublets: Rapid pulses spaced closely for tactile finger-drumming satisfaction
//
// Musicality:
//   - Tuned in modal D-minor / Bayati harmonic resonance, quantized to the master 16-step grid.

import { use, emit } from '../../core/registry.js';
import { isBossRow } from '../boss/rules.js';
import strings from './strings.js';

export const RHYTHM_DURATION_SEC = 10;
export const MAX_BOSS_RHYTHM_MULT = 10;

// Authentic Middle-Eastern & World Percussion Rhythm Families (4-Bar Progressions)
export const RHYTHM_FAMILIES = {
  malfuf: {
    id: 'malfuf',
    titleKey: 'rhythm_family_malfuf',
    defaultTitle: 'Malfuf Desert Drive',
    bars: [
      'D...T..TD...T..T', // Bar 1: Foundational Malfuf 2/4 drive (accessible & syncopated)
      'D..TT..TD..TT.TT', // Bar 2: Syncopated doublets on Tak
      'D...T.TTD...TTTT', // Bar 3: Rapid polyrhythmic roll & drop
      'D.TTD.TTD.TTDTTT', // Bar 4: Grand Climax syncopated crescendo
    ],
  },
  ayoub: {
    id: 'ayoub',
    titleKey: 'rhythm_family_ayoub',
    defaultTitle: 'Ayoub Hypnotic Pulse',
    bars: [
      'D..TD.T.D..TD.T.', // Bar 1: Hypnotic Zar groove
      'D.TTD.T.D.TTD.TT', // Bar 2: Doublet syncopations
      'D..DT.T.D..DTTTT', // Bar 3: Accelerating pulse roll
      'DTDTD.TTDTDTDTTT', // Bar 4: Grand Climax
    ],
  },
  maqsum: {
    id: 'maqsum',
    titleKey: 'rhythm_family_maqsum',
    defaultTitle: 'Maqsum Standard',
    bars: [
      'D.T..TD..T..T...', // Bar 1: Classic 4/4 Maqsum
      'D.T..TD..TT.T.T.', // Bar 2: Off-beat accents & double-taps
      'DT.TDT.TD..TTTT.', // Bar 3: Polyrhythmic roll
      'D.TTD.TTDTDTTTT.', // Bar 4: Grand Climax
    ],
  },
  sombati: {
    id: 'sombati',
    titleKey: 'rhythm_family_sombati',
    defaultTitle: 'Sombati Darbuka Groove',
    bars: [
      'D.T..TD.D.T..T..', // Bar 1: Heavy Sombati groove
      'D.T.TTD.D.TTT.T.', // Bar 2: Syncopated Darbuka doublets
      'DTT.DTT.D.TTD.T.', // Bar 3: Triplet / roll flourishes
      'DTTDTTDTDTTTTTT.', // Bar 4: Blistering Darbuka crescendo
    ],
  },
  darbuka: {
    id: 'darbuka',
    titleKey: 'rhythm_family_darbuka',
    defaultTitle: 'Darbuka High Climax',
    bars: [
      'D.T.TT.TD.T.TT.T', // Bar 1: Syncopated high-tempo drive
      'DTT.DTT.DTTDTTT.', // Bar 2: Rapid alternating rolls
      'D.TTD.TTDTTTTTT.', // Bar 3: Deep chasm polyrhythm
      'DTDTTDTDTTTTTTTT', // Bar 4: Maximum Darbuka fury
    ],
  },
};

// Calculate BPM, rhythm family, and multi-bar patterns for a given floor and chapter
export function rhythmDifficulty(s, floor = 25) {
  const ch = (s && s.run && s.run.ch) || (floor <= 75 ? 1 : floor <= 150 ? 2 : 3);
  let bpm = 100;
  let family = RHYTHM_FAMILIES.malfuf;
  let title = 'malfuf_drive';

  if (ch === 1 || floor <= 75) {
    if (floor <= 25) {
      // Gate 1 (25m): 100 BPM Malfuf Desert Drive (accessible, groovy syncopation)
      bpm = 100;
      family = RHYTHM_FAMILIES.malfuf;
      title = 'malfuf_drive';
    } else if (floor <= 50) {
      // Gate 2 (50m): 105 BPM Ayoub Hypnotic Pulse
      bpm = 105;
      family = RHYTHM_FAMILIES.ayoub;
      title = 'ayoub_pulse';
    } else {
      // Gate 3 (75m): 110 BPM Maqsum Classical Standard
      bpm = 110;
      family = RHYTHM_FAMILIES.maqsum;
      title = 'maqsum_groove';
    }
  } else if (ch === 2 || floor <= 150) {
    // Mid Chapters (100-150m): 120 - 140 BPM Sombati Darbuka Groove
    const prog = Math.min(1, Math.max(0, (floor - 75) / 75));
    bpm = Math.round(120 + prog * 20);
    family = RHYTHM_FAMILIES.sombati;
    title = 'sombati_groove';
  } else {
    // Deep/Late Chapters (175m+): 150 - 180 BPM Darbuka High Climax
    const prog = Math.min(1, Math.max(0, (floor - 150) / 100));
    bpm = Math.round(150 + prog * 30);
    family = RHYTHM_FAMILIES.darbuka;
    title = 'darbuka_climax';
  }

  const bars = family.bars;
  const pattern = bars.join('|');

  return {
    bpm,
    family: family.id,
    familyTitleKey: family.titleKey,
    familyName: family.defaultTitle,
    bars,
    pattern,
    title,
    floor,
    ch,
  };
}

// Generate the timestamps (in seconds from start) and note types of beats within the 10-second duration
export function rhythmGenerateSchedule(bpm, patternOrBars = 'D.T..TD..T..T...', duration = RHYTHM_DURATION_SEC) {
  const stepTime = 15 / bpm; // 16th-note step duration in seconds
  const beats = [];
  let t = 0.6; // initial lead-in time so the player can prepare

  let bars;
  if (Array.isArray(patternOrBars)) {
    bars = patternOrBars;
  } else if (typeof patternOrBars === 'string' && patternOrBars.includes('|')) {
    bars = patternOrBars.split('|');
  } else if (typeof patternOrBars === 'string') {
    bars = [patternOrBars];
  } else {
    bars = ['D.T..TD..T..T...'];
  }

  const barNames = ['groove', 'syncopation', 'roll', 'climax'];
  let totalSteps = 0;

  while (t < duration - 0.35) {
    const barIndex = Math.floor(totalSteps / 16);
    const currentBarPattern = bars[Math.min(barIndex, bars.length - 1)];
    const stepInBar = totalSteps % currentBarPattern.length;
    const char = currentBarPattern[stepInBar];

    if (char === 'D' || char === '1' || char === 'T' || char === '2') {
      const type = (char === 'T' || char === '2') ? 'tak' : 'dum';
      const barNum = Math.min(barIndex + 1, bars.length);
      const barName = barNames[Math.min(barIndex, barNames.length - 1)] || 'climax';

      beats.push({
        id: beats.length,
        time: Math.round(t * 1000) / 1000,
        type,
        char,
        bar: barNum,
        barName,
        hit: false,
        rating: null,
      });
    }

    t += stepTime;
    totalSteps++;
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
