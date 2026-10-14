// Test for Issue ARGON-01: Singing TNT Pentatonic Chain Reactions
// Run: node test_proto_tnt_chain.js
import * as G from './digger-argon/game.js';
import { pentPitch, PENT_CHAIN } from './digger-argon/ui/audio.js';
import tntStrings from './digger-argon/features/tnt/strings.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

// 1. Verify pentPitch calculations and clamping
{
  ok(pentPitch(1) === 1, 'Chain 1 plays root pitch (1.0)');
  const pitches = [];
  for (let c = 1; c <= 6; c++) {
    pitches.push(pentPitch(c));
  }
  // Check 6 distinct ascending pitches
  for (let i = 1; i < pitches.length; i++) {
    ok(pitches[i] > pitches[i - 1], `Pitch for chain ${i + 1} (${pitches[i].toFixed(3)}) is strictly higher than chain ${i} (${pitches[i - 1].toFixed(3)})`);
  }
  ok(Math.abs(pitches[5] - 2.0) < 1e-6, 'Chain 6 (semitone 12) is exactly 1 octave (2.0): ' + pitches[5]);

  // Clamping at 2 octaves (semitone 24 -> factor 4.0)
  ok(Math.abs(pentPitch(PENT_CHAIN.length) - 4.0) < 1e-6, 'Last defined step reaches 2 octaves (4.0)');
  ok(Math.abs(pentPitch(50) - 4.0) < 1e-6, 'High chains clamp at 2 octaves (4.0): ' + pentPitch(50));
}

// 2. Verify bilingual strings
{
  ok(typeof tntStrings.en.tnt_chain === 'string' && tntStrings.en.tnt_chain.includes('{n}'), 'EN tnt_chain has {n}');
  ok(typeof tntStrings.ar.tnt_chain === 'string' && tntStrings.ar.tnt_chain.includes('{n}'), 'AR tnt_chain has {n}');
  ok(typeof tntStrings.en.tnt_chain_mega === 'string', 'EN tnt_chain_mega exists');
  ok(typeof tntStrings.ar.tnt_chain_mega === 'string', 'AR tnt_chain_mega exists');
  ok(typeof tntStrings.en.tnt_chain_banner === 'string', 'EN tnt_chain_banner exists');
  ok(typeof tntStrings.ar.tnt_chain_banner === 'string', 'AR tnt_chain_banner exists');
}

// 3. Chain reaction rules execution: TNT row setup
{
  G.seedRng(42);
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) {
    s.rows[0][c] = null;
  }
  // Place a chain of TNT barrels at row 1 across columns 0..5
  s.rows[1] = [];
  for (let c = 0; c < 6; c++) {
    s.rows[1][c] = G.makeCell(1, 'tnt');
  }

  const pops = [];
  const blasts = [];
  const ev = (k, d) => {
    if (k === 'tntPop') pops.push(d);
    if (k === 'blast') blasts.push(d);
  };

  // Swing at first TNT barrel (1, 0)
  G.damage(s, 1, 0, 10, 'you', ev);
  ok(pops.length === 1 && pops[0].chain === 1, 'First TNT pops with chain 1');

  // Step through time to let the cascade detonate
  let elapsed = 0;
  while (elapsed < 3.0 && blasts.length < 4) {
    G.step(s, 0.05, ev);
    elapsed += 0.05;
  }

  ok(pops.length === 4, 'Barrels in row capped at chainMax 4: ' + pops.length);
  for (let i = 0; i < pops.length; i++) {
    ok(pops[i].chain === i + 1, `Pop ${i} has chain ${i + 1} (actual: ${pops[i].chain})`);
  }

  // Verify blast events also carry chain numbers
  ok(blasts.length === 4, 'Blasts fired capped at 4: ' + blasts.length);
  ok(blasts[0].chain === 1, 'First blast had chain 1');
  ok(blasts[blasts.length - 1].chain === 4, 'Final blast carried chain 4');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('test_proto_tnt_chain: ok');
