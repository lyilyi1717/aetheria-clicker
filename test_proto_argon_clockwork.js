// Test for Issue ARGON-19: Month 6: The Clockwork Spire (proto/features/clockwork/)
// Run: node test_proto_clockwork.js

import * as G from './digger-argon/game.js';
import {
  PISTON,
  ORRERY_STEPS,
  firePistonAt,
  fireAllPistons,
  useSteamWhistle,
  hasSteamWhistle,
  hasClockworkOrrery,
  unlockClockworkOrrery,
  isOrreryStep,
  syncRafeeqsToOrrery,
} from './digger-argon/features/clockwork/rules.js';
import strings from './digger-argon/features/clockwork/strings.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

console.log('Testing ARGON-19: The Clockwork Spire...');

// 1. Verify bilingual strings parity
{
  const required = [
    'clockwork_title', 'clockwork_sub',
    'block_piston', 'block_piston_d',
    'tool_steam_whistle', 'tool_steam_whistle_d',
    'clockwork_orrery', 'clockwork_orrery_d',
    'piston_fire', 'steam_whistle_active',
  ];
  for (const k of required) {
    ok(typeof strings.en[k] === 'string' && strings.en[k].length > 0, `EN string for ${k} exists`);
    ok(typeof strings.ar[k] === 'string' && strings.ar[k].length > 0, `AR string for ${k} exists`);
  }
}

// 2. Pneumatic wall piston blocks: deals 500 damage to block directly below
{
  const s = G.newState();
  s.top = 0;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;

  // Place piston at (1, 2)
  s.rows[1] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[1][c] = null;
  s.rows[1][2] = { t: PISTON, hp: 1, max: 1, wall: true };

  // Place stone block with 600 HP directly below at (2, 2)
  s.rows[2] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[2][c] = null;
  s.rows[2][2] = { t: 'dirt', hp: 600, max: 600 };

  const events = [];
  const ev = (k, d) => events.push({ k, d });

  // Fire piston at (1, 2)
  const fired = firePistonAt(s, 1, 2, ev);
  ok(fired === true, 'Piston fired successfully');
  ok(s.rows[2][2].hp === 100, `Target cell HP reduced from 600 to 100 (-500 damage)`);
  ok(events.some(e => e.k === 'pistonFire' && e.d.dmg === 500 && e.d.targetR === 2 && e.d.targetC === 2), 'pistonFire event emitted with correct payload');

  // Fire all pistons on excavation floor
  const totalFired = fireAllPistons(s, ev);
  ok(totalFired === 1, 'fireAllPistons fired exactly 1 piston');
  // Second hit breaks the 100 HP block (cell becomes null)
  ok(s.rows[2][2] === null, 'Target cell broke after sustaining another 500 damage');
}

// 3. Steam Whistle tool: accelerates tempo by +50% for 30 seconds
{
  const s = G.newState();
  s.clockwork = { whistleTtl: 0, orreryUnlocked: false, lastBeat: -1 };

  ok(!hasSteamWhistle(s), 'Steam Whistle is initially inactive');
  const baseBpm = G.fold('bpm', s, 100);
  const baseTempoMult = G.fold('tempoMult', s, 1.0);
  ok(baseBpm === 100, 'Base tempo BPM is 100');
  ok(baseTempoMult === 1.0, 'Base tempo multiplier is 1.0');

  // Use Steam Whistle tool
  const events = [];
  const ev = (k, d) => events.push({ k, d });
  useSteamWhistle(s, ev);

  ok(hasSteamWhistle(s), 'Steam Whistle is active');
  ok(s.clockwork.whistleTtl === 30, 'whistleTtl set to 30s');
  ok(events.some(e => e.k === 'steamWhistleActivated' && e.d.duration === 30), 'steamWhistleActivated event emitted');

  const boostedBpm = G.fold('bpm', s, 100);
  const boostedTempoMult = G.fold('tempoMult', s, 1.0);
  ok(boostedBpm === 150, `Boosted BPM is 150 (+50%): got ${boostedBpm}`);
  ok(Math.abs(boostedTempoMult - 1.5) < 1e-6, `Boosted tempo multiplier is 1.5x`);

  // Step advances whistle duration
  G.step(s, 10);
  ok(Math.abs(s.clockwork.whistleTtl - 20) < 1e-3, 'whistleTtl decreased by 10s: ' + s.clockwork.whistleTtl);

  // Expire whistle
  G.step(s, 25);
  ok(s.clockwork.whistleTtl === 0, 'whistleTtl reached 0');
  ok(!hasSteamWhistle(s), 'Steam Whistle is inactive');
  ok(G.fold('bpm', s, 100) === 100, 'BPM returned to base 100');
}

// 4. Clockwork Orrery: unlocks and synchronizes Rafeeq strikes to beats 1, 5, 9, 13
{
  const s = G.newState();
  ok(!hasClockworkOrrery(s), 'Clockwork Orrery initially locked');

  // Verify step helper for beats 1, 5, 9, 13 (steps 0, 4, 8, 12 in 0-based 16-step bar)
  ok(isOrreryStep(0), 'Step 0 is beat 1');
  ok(isOrreryStep(4), 'Step 4 is beat 5');
  ok(isOrreryStep(8), 'Step 8 is beat 9');
  ok(isOrreryStep(12), 'Step 12 is beat 13');
  ok(!isOrreryStep(1), 'Step 1 is not downbeat');
  ok(!isOrreryStep(7), 'Step 7 is not downbeat');

  // Complete level 140 / unlock Orrery
  const events = [];
  const ev = (k, d) => events.push({ k, d });
  unlockClockworkOrrery(s, ev);

  ok(hasClockworkOrrery(s), 'Clockwork Orrery is unlocked');
  ok(events.some(e => e.k === 'clockworkOrreryUnlocked'), 'clockworkOrreryUnlocked event emitted');

  // Rafeeq synchronization
  s.diggers = [
    { c: 0, r: 0, cd: 0.8 },
    { c: 1, r: 0, cd: 0.2 },
    { c: 2, r: 0, cd: 0.5 },
  ];
  s.t = 0; // At downbeat 0

  syncRafeeqsToOrrery(s, 100);
  // At 100 BPM, quarter beat = 60 / 100 = 0.60 seconds
  const quarterSec = 0.60;
  for (const d of s.diggers) {
    ok(d.cd <= quarterSec && d.cd > 0, `Rafeeq cooldown synchronized within quarter interval: ${d.cd}`);
  }
}

// 5. Automatic piston downbeat firing in game step loop
{
  const s = G.newState();
  s.top = 0;
  for (let i = 0; i < G.KEEP_ROWS; i++) {
    s.rows[i] = [];
    for (let c = 0; c < G.COLS; c++) s.rows[i][c] = { t: 'dirt', hp: 2000, max: 2000 };
  }

  // Place piston at (1, 0)
  s.rows[1][0] = { t: PISTON, hp: 1, max: 1, wall: true };
  const initialTargetHp = s.rows[2][0].hp;

  // Step by 2.4 seconds (4 quarter beats at 100 BPM = 4 * 0.6s = 2.4s)
  G.step(s, 2.45);

  ok(s.rows[2][0].hp === initialTargetHp - 500, `Target cell below piston sustained 500 damage on downbeat beat: ${s.rows[2][0].hp}`);
}

if (failed) {
  console.error(`${failed} assertion(s) failed in test_proto_clockwork.js`);
  process.exit(1);
}
console.log('test_proto_clockwork: ok');
