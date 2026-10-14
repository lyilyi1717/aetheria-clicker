// Test for Issue ARGON-21: Month 8: Harmonic Resonant Chasm (proto/features/acoustics/)
// Run: node test_proto_acoustics.js

import * as G from './digger-argon/game.js';
import {
  getResonance,
  addResonance,
  recordStrike,
  triggerAcousticShockwave,
  setAcousticTempo,
  isDownbeat,
  ACOUSTIC_TEMPOS,
} from './digger-argon/features/acoustics/rules.js';
import { isAccentWindow } from './digger-argon/features/picks/beat.js';
import strings from './digger-argon/features/acoustics/strings.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

console.log('Testing ARGON-21: Harmonic Resonant Chasm...');

// 1. Verify bilingual strings parity
{
  const required = [
    'acoustics_title', 'acoustics_sub',
    'resonance_meter', 'shockwave_triggered',
    'tempo_mode_180', 'tempo_mode_200',
    'acoustic_ready',
  ];
  for (const k of required) {
    ok(typeof strings.en[k] === 'string' && strings.en[k].length > 0, `EN string for ${k} exists`);
    ok(typeof strings.ar[k] === 'string' && strings.ar[k].length > 0, `AR string for ${k} exists`);
  }
}

// 2. Beat timing and resonance meter building
{
  const s = G.newState();
  ok(getResonance(s) === 0, 'Resonance is initially 0');

  const events = [];
  const ev = (k, d) => events.push({ k, d });

  // On-beat strike adds +10 resonance
  recordStrike(s, true, ev);
  ok(getResonance(s) === 10, 'On-beat strike added +10 resonance');

  // Off-beat strike subtracts 5 resonance
  recordStrike(s, false, ev);
  ok(getResonance(s) === 5, 'Off-beat strike subtracted 5 resonance');

  // Off-beat strike does not go below 0
  recordStrike(s, false, ev);
  recordStrike(s, false, ev);
  ok(getResonance(s) === 0, 'Resonance floored at 0');

  // 10 perfect strikes charge resonance to 100
  for (let i = 0; i < 9; i++) {
    recordStrike(s, true, ev);
  }
  ok(getResonance(s) === 90, `Resonance reached 90 after 9 strikes: got ${getResonance(s)}`);
}

// 3. Acoustic shockwave: triggers at 100 resonance, clears on-screen stone, leaves Big Rocks intact
{
  const s = G.newState();
  s.top = 0;
  for (let i = 0; i < G.KEEP_ROWS; i++) {
    s.rows[i] = [];
    for (let c = 0; c < G.COLS; c++) {
      s.rows[i][c] = { t: 'dirt', hp: 200, max: 200 };
    }
  }

  // Place a Big Rock / boss wall at (2, 2)
  s.rows[2][2] = { t: 'rock', hp: 10000, max: 10000, boss: true };
  // Place another boss block at (2, 3)
  s.rows[2][3] = { t: 'boss', hp: 5000, max: 5000, boss: true };

  const events = [];
  const ev = (k, d) => events.push({ k, d });

  // Charge to 90
  addResonance(s, 90, ev);
  ok(getResonance(s) === 90, 'Resonance at 90');

  // 10th strike brings resonance to 100 -> triggers shockwave
  addResonance(s, 10, ev);

  // Resonance should reset to 0 after shockwave
  ok(getResonance(s) === 0, 'Resonance reset to 0 after shockwave');
  ok(s.acoustics.shockwaves === 1, 'Shockwave counter incremented to 1');
  ok(events.some(e => e.k === 'acousticShockwave'), 'acousticShockwave event emitted');

  // Check that regular dirt blocks were cleared (null)
  ok(s.rows[0][0] === null, 'Standard stone block at (0, 0) was cleanly cleared');
  ok(s.rows[1][4] === null, 'Standard stone block at (1, 4) was cleanly cleared');

  // Check that Big Rock and boss blocks remain completely intact!
  ok(s.rows[2][2] !== null && s.rows[2][2].t === 'rock', 'Big Rock at (2, 2) was unaffected by shockwave');
  ok(s.rows[2][3] !== null && s.rows[2][3].t === 'boss', 'Boss block at (2, 3) was unaffected by shockwave');
}

// 4. Support 180 and 200 BPM high-speed music modes
{
  ok(ACOUSTIC_TEMPOS.includes(180) && ACOUSTIC_TEMPOS.includes(200), 'ACOUSTIC_TEMPOS contains 180 and 200');

  // isAccentWindow supports 180 and 200 BPM
  ok(isAccentWindow(0, 180) === true, '180 BPM supported at step 0 in isAccentWindow');
  ok(isAccentWindow(0, 200) === true, '200 BPM supported at step 0 in isAccentWindow');

  // Downbeat helper at 180 and 200 BPM
  // At 180 BPM: quarter beat = 60 / 180 = 0.3333s
  ok(isDownbeat(0, 180) === true, 'Time 0 is downbeat at 180 BPM');
  ok(isDownbeat(0.3333, 180) === true, 'Time 0.333s is downbeat at 180 BPM');
  ok(isDownbeat(0.1666, 180) === false, 'Time 0.166s is offbeat at 180 BPM');

  // At 200 BPM: quarter beat = 60 / 200 = 0.3000s
  ok(isDownbeat(0, 200) === true, 'Time 0 is downbeat at 200 BPM');
  ok(isDownbeat(0.3000, 200) === true, 'Time 0.3s is downbeat at 200 BPM');
  ok(isDownbeat(0.1500, 200) === false, 'Time 0.15s is offbeat at 200 BPM');

  // Setting tempo in game state mod
  const s = G.newState();
  ok(G.fold('bpm', s, 100) === 100, 'Default folded BPM is 100');

  setAcousticTempo(s, 180);
  ok(G.fold('bpm', s, 100) === 180, 'Folded BPM reflects 180 BPM mode');

  setAcousticTempo(s, 200);
  ok(G.fold('bpm', s, 100) === 200, 'Folded BPM reflects 200 BPM mode');
}

if (failed) {
  console.error(`${failed} assertion(s) failed in test_proto_acoustics.js`);
  process.exit(1);
}
console.log('test_proto_acoustics: ok');
