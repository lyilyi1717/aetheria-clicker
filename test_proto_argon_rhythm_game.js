// Test for Lead Audio & Rhythm Systems Architect (Argon):
// Game Audio & Rhythm Guidelines, Boom Pick / Boomerang Tuning, and Pre-Gate "Gate Rhythm Climax" Mini-Game.
// Run: node test_proto_argon_rhythm_game.js

import * as G from './digger-argon/game.js';
import {
  RHYTHM_DURATION_SEC,
  MAX_BOSS_RHYTHM_MULT,
  rhythmDifficulty,
  rhythmGenerateSchedule,
  rhythmCanPlay,
  rhythmCalcMult,
  rhythmFinish,
  rhythmMult,
} from './digger-argon/features/rhythmgame/rules.js';

let failed = 0;
const ok = (cond, msg) => {
  if (!cond) {
    failed++;
    console.error('FAIL: ' + msg);
  }
};

console.log('Testing Lead Audio & Rhythm Systems Architect (Argon)...');

// 1. Audio Grid Quantization Verification (Boom Pick, Boomerang, Rhythm)
{
  const back = G.PARAMS.picks.back;
  ok(Array.isArray(back), 'Picks back array is defined');
  ok(back.includes('blast'), 'Picks back array includes "blast" for grid quantization');
  ok(back.includes('boom'), 'Picks back array includes "boom"');
  ok(back.includes('relics2Whoosh'), 'Picks back array includes "relics2Whoosh"');
  ok(back.includes('rhythmHit'), 'Picks back array includes "rhythmHit"');
}

// 2. Rhythm Climax Difficulty & BPM Scaling Across Chapters and Gates
{
  // Chapter 1 (Floors 25 - 75)
  const d25 = rhythmDifficulty({ run: { ch: 1 } }, 25);
  ok(d25.bpm === 100, 'Floor 25 runs at 100 BPM');
  ok(d25.pattern.includes('1'), 'Floor 25 has valid beat pattern');

  const d50 = rhythmDifficulty({ run: { ch: 1 } }, 50);
  ok(d50.bpm === 105, 'Floor 50 runs at 105 BPM');

  const d75 = rhythmDifficulty({ run: { ch: 1 } }, 75);
  ok(d75.bpm === 110, 'Floor 75 runs at 110 BPM');

  // Chapter 2 (Floors 100 - 150): 120 - 140 BPM
  const d100 = rhythmDifficulty({ run: { ch: 2 } }, 100);
  ok(d100.bpm >= 120 && d100.bpm <= 130, 'Floor 100 scales into mid-tempo (120-130 BPM): ' + d100.bpm);
  ok(d100.pattern === '1.11.1.11.11.1.1', 'Mid chapters use syncopated 8th-note grooves');

  const d150 = rhythmDifficulty({ run: { ch: 2 } }, 150);
  ok(d150.bpm === 140, 'Floor 150 peaks at 140 BPM');

  // Chapter 3+ (Floors 175+): 150 - 180 BPM
  const d200 = rhythmDifficulty({ run: { ch: 3 } }, 200);
  ok(d200.bpm >= 150 && d200.bpm <= 180, 'Deep chapters scale into high-energy polyrhythm (150-180 BPM): ' + d200.bpm);
  ok(d200.pattern === '11.1.11.11.1.11.', 'Deep chapters use Darbuka polyrhythmic pattern');
}

// 3. Rhythm Beat Schedule Generation (10 Seconds Duration)
{
  const beats = rhythmGenerateSchedule(120, '1.1.1.1.', RHYTHM_DURATION_SEC);
  ok(beats.length > 0, 'Generated rhythm beats array');
  ok(beats[0].time >= 0.5, 'First beat allows player lead-in time: ' + beats[0].time);
  ok(beats[beats.length - 1].time <= RHYTHM_DURATION_SEC, 'Last beat falls within 10s window: ' + beats[beats.length - 1].time);

  // Monotonic time progression
  let monotonic = true;
  for (let i = 1; i < beats.length; i++) {
    if (beats[i].time <= beats[i - 1].time) monotonic = false;
  }
  ok(monotonic, 'Beats schedule is strictly increasing in time');
}

// 4. Once-Per-Gate Rule and Triggering
{
  const s = G.newState();
  s.run = { key: 'dunes:25', site: 'dunes', floor: 25, ch: 1 };
  s.boss = { row: 25, hp: 1000, max: 1000, gate: 1 };

  ok(rhythmCanPlay(s, 25) === true, 'Rhythm mini-game can be played when approaching Gate 25');

  // Simulate completion of mini-game
  const result = rhythmFinish(s, 25, 2000, 20, 20, { perfects: 20, greats: 0, goods: 0, misses: 0 });
  ok(result.mult === 10, 'Flawless 100% performance awards full 10x Boss Damage Multiplier');
  ok(result.rank === 'S', 'Flawless performance earns S-Rank');
  ok(s.bossRhythmMult === 10, 'State bossRhythmMult is set to 10');
  ok(rhythmMult(s) === 10, 'rhythmMult(s) helper returns 10');

  // Once-per-gate rule:
  ok(rhythmCanPlay(s, 25) === false, 'Cannot replay rhythm mini-game on the same Gate (once-per-gate rule)');

  // Another gate in a different floor can be played
  s.boss = { row: 50, hp: 2000, max: 2000, gate: 1 };
  ok(rhythmCanPlay(s, 50) === true, 'Next Gate (Floor 50) can be played independently');
}

// 5. Score and Multiplier Scaling Tiers
{
  const total = 20;
  // S-Rank (>= 82% score or >= 75% combo) -> 10.0x
  const rS = rhythmCalcMult(1700, 16, total); // 1700/2000 = 85%
  ok(rS.rank === 'S' && rS.mult === 10, 'S-Rank awards 10.0x multiplier');

  // A-Rank (>= 62%) -> 7.5x
  const rA = rhythmCalcMult(1400, 10, total); // 1400/2000 = 70%
  ok(rA.rank === 'A' && rA.mult === 7.5, 'A-Rank awards 7.5x multiplier');

  // B-Rank (>= 42%) -> 5.0x
  const rB = rhythmCalcMult(1000, 6, total); // 1000/2000 = 50%
  ok(rB.rank === 'B' && rB.mult === 5.0, 'B-Rank awards 5.0x multiplier');

  // C-Rank (>= 20%) -> 3.0x
  const rC = rhythmCalcMult(600, 3, total); // 600/2000 = 30%
  ok(rC.rank === 'C' && rC.mult === 3.0, 'C-Rank awards 3.0x multiplier');

  // Below 20% -> 2.0x floor
  const rLow = rhythmCalcMult(200, 1, total);
  ok(rLow.mult === 2.0, 'Low score still awards 2.0x tactical boost floor');
}

// 6. Combat Integration: 10x Boss Damage Application and Reset
{
  const s = G.newState();
  s.top = 20;
  s.best = 24;
  s.run = { key: 'dunes:25', site: 'dunes', floor: 25, ch: 1 };

  // Setup boss row at 25
  const rowIdx = 25 - s.top; // 5
  s.rows = [];
  for (let i = 0; i < 10; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) {
    s.rows[rowIdx][c] = { t: 'boss', hp: 1, max: 1, s: c };
  }

  s.boss = { row: 25, hp: 50000, max: 50000, gate: 1, weak: 2 };
  s.bossRhythmMult = 10; // 10x surge active

  const hpBefore = s.boss.hp;
  const baseHit = 50; // you hit boss with 50 damage

  // Execute damage on boss cell
  G.damage(s, 25, 0, baseHit, 'you', () => {});

  const dmgDealt = hpBefore - s.boss.hp;
  // With 10x multiplier: 50 * 10 = 500
  ok(dmgDealt === baseHit * 10, '10x Boss Damage Multiplier applied to boss hit: ' + dmgDealt + ' vs expected ' + (baseHit * 10));

  // Now defeat the boss and check reset
  G.damage(s, 25, 0, 1e9, 'you', () => {});
  ok(s.boss.hp <= 0, 'Boss defeated');
  ok(s.bossRhythmMult === 1, 'bossRhythmMult automatically resets to 1 after boss is defeated');
}

if (failed === 0) {
  console.log('test_proto_argon_rhythm_game: ok');
} else {
  console.error(`test_proto_argon_rhythm_game: ${failed} failure(s)`);
  process.exit(1);
}
