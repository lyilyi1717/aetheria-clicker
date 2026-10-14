// Test for Issue ARGON-23: Months 10–12: Celestial Core, Gravity Inversion & The Grand Engine
// Run: node test_proto_celestial.js

import * as G from './digger-argon/game.js';
import {
  ASTRAL_GRAVITY_DOWN,
  ASTRAL_GRAVITY_UP,
  getGravityDir,
  setGravityDir,
  stepGravity,
  useMagneticPick,
} from './digger-argon/features/astral/rules.js';
import {
  CHRONO_BLOCK,
  recordPlayerSwing,
  replayChronoSwings,
  triggerAllChronoReplays,
} from './digger-argon/features/void/rules.js';
import {
  ERA_KEYSTONES,
  addKeystone,
  hasAllKeystones,
  assembleCelestialEngine,
  generateEndlessContract,
} from './digger-argon/features/cradle/rules.js';
import astralStrings from './digger-argon/features/astral/strings.js';
import voidStrings from './digger-argon/features/void/strings.js';
import cradleStrings from './digger-argon/features/cradle/strings.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

console.log('Testing ARGON-23: Celestial Core, Gravity Inversion & Grand Engine...');

// 1. Verify bilingual strings parity across all three features
{
  const astralKeys = ['astral_title', 'astral_sub', 'gravity_inverted', 'tool_magnetic_pick', 'magnet_pull'];
  for (const k of astralKeys) {
    ok(typeof astralStrings.en[k] === 'string' && astralStrings.en[k].length > 0, `EN astral string ${k} exists`);
    ok(typeof astralStrings.ar[k] === 'string' && astralStrings.ar[k].length > 0, `AR astral string ${k} exists`);
  }

  const voidKeys = ['void_title', 'void_sub', 'block_echo', 'block_echo_d', 'chrono_replay'];
  for (const k of voidKeys) {
    ok(typeof voidStrings.en[k] === 'string' && voidStrings.en[k].length > 0, `EN void string ${k} exists`);
    ok(typeof voidStrings.ar[k] === 'string' && voidStrings.ar[k].length > 0, `AR void string ${k} exists`);
  }

  const cradleKeys = ['cradle_title', 'cradle_sub', 'engine_active', 'eternal_horizon', 'eternal_horizon_d'];
  for (const k of cradleKeys) {
    ok(typeof cradleStrings.en[k] === 'string' && cradleStrings.en[k].length > 0, `EN cradle string ${k} exists`);
    ok(typeof cradleStrings.ar[k] === 'string' && cradleStrings.ar[k].length > 0, `AR cradle string ${k} exists`);
  }
}

// 2. Month 10: Inverted Gravity (astral)
{
  const s = G.newState();
  s.top = 0;
  for (let i = 0; i < G.KEEP_ROWS; i++) {
    s.rows[i] = [];
    for (let c = 0; c < G.COLS; c++) s.rows[i][c] = null;
  }

  ok(getGravityDir(s) === ASTRAL_GRAVITY_DOWN, 'Default gravity direction is DOWN (1)');

  const events = [];
  const ev = (k, d) => events.push({ k, d });

  // Invert gravity to UP (-1)
  setGravityDir(s, ASTRAL_GRAVITY_UP, ev);
  ok(getGravityDir(s) === ASTRAL_GRAVITY_UP, 'Gravity direction updated to UP (-1)');
  ok(events.some(e => e.k === 'gravityInverted'), 'gravityInverted event emitted');

  // Place loose rubble at row 4, col 2
  s.rows[4][2] = { t: 'dirt', hp: 50, max: 50, loose: true };
  // Space above at row 3, col 2 is empty (null)

  // Step gravity
  const floatedCount = stepGravity(s, 0.1, ev);
  ok(floatedCount === 1, 'Exactly 1 block floated upward');
  ok(s.rows[4][2] === null, 'Original cell at (4, 2) is now empty');
  ok(s.rows[3][2] !== null && s.rows[3][2].loose === true, 'Loose rubble floated up to cell (3, 2)');
  ok(events.some(e => e.k === 'rubbleFloated' && e.d.fromR === 4 && e.d.toR === 3 && e.d.c === 2), 'rubbleFloated event emitted with correct coordinates');

  // Place floating gem ore at row 3, col 5
  s.rows[3][5] = { t: 'gem', hp: 10, max: 10, floating: true, ore: true };
  ok(s.rows[3][5] !== null, 'Floating ore placed at (3, 5)');

  // Use magnetic pick tool to pull floating ores
  const collected = useMagneticPick(s, ev);
  ok(collected >= 1, `Magnetic pick collected ${collected} floating ores`);
  ok(s.rows[3][5] === null, 'Floating ore at (3, 5) was harvested by magnetic pick');
  ok(events.some(e => e.k === 'magneticPull'), 'magneticPull event emitted');
}

// 3. Month 11: Chrono-Mining (void)
{
  const s = G.newState();
  s.top = 0;
  for (let i = 0; i < G.KEEP_ROWS; i++) {
    s.rows[i] = [];
    for (let c = 0; c < G.COLS; c++) s.rows[i][c] = { t: 'dirt', hp: 500, max: 500 };
  }

  // Record 12 swings; only the last 10 should be retained
  for (let i = 1; i <= 12; i++) {
    recordPlayerSwing(s, { r: 1, c: 2, dmg: i * 10 });
  }
  ok(s.void.recordedSwings.length === 10, `Echo block retains exactly 10 swings: got ${s.void.recordedSwings.length}`);
  ok(s.void.recordedSwings[0].dmg === 30, 'Oldest swings (1, 2) were dropped; swing 3 (dmg 30) is now oldest');
  ok(s.void.recordedSwings[9].dmg === 120, 'Latest swing (dmg 120) is present at end of buffer');

  // Place chrono echo block at row 1, col 2
  s.rows[1][2] = { t: CHRONO_BLOCK, hp: 3, max: 3, chrono: true };
  // Target block below at row 2, col 2
  const initialTargetHp = s.rows[2][2].hp;

  const events = [];
  const ev = (k, d) => events.push({ k, d });

  // Replay swings in column 2
  const replayed = replayChronoSwings(s, 2, ev);
  ok(replayed === 10, 'All 10 recorded swings were replayed in column 2');
  ok(s.rows[2][2].hp < initialTargetHp, `Target block in col 2 sustained replay damage: HP went from ${initialTargetHp} to ${s.rows[2][2].hp}`);
  ok(events.some(e => e.k === 'chronoReplayed' && e.d.col === 2), 'chronoReplayed event emitted');

  // Automatic replay via game step timer (every 2.0 seconds)
  s.void.replayTimer = 0;
  G.step(s, 2.1);
  ok(s.void.replayTimer < 0.5, 'Step advanced past 2.0s and reset replayTimer cleanly');
}

// 4. Month 12: The Celestial Cradle & Grand Engine (cradle)
{
  const s = G.newState();
  ok(ERA_KEYSTONES.length === 12, '12 Era Keystones defined');
  ok(!hasAllKeystones(s), 'Player starts with 0 keystones');
  ok(!assembleCelestialEngine(s), 'Cannot activate Celestial Engine without 12 keystones');

  const events = [];
  const ev = (k, d) => events.push({ k, d });

  // Add all 12 keystones one by one
  for (let i = 0; i < 12; i++) {
    addKeystone(s, ERA_KEYSTONES[i], ev);
  }
  ok(hasAllKeystones(s), 'All 12 Keystones collected');
  ok(s.cradle.keystones.length === 12, 's.cradle.keystones has length 12');

  // Activate the Celestial Engine
  const activated = assembleCelestialEngine(s, ev);
  ok(activated === true, 'Celestial Engine successfully activated');
  ok(s.cradle.engineActive === true, 'engineActive is true');
  ok(s.cradle.eternalHorizonUnlocked === true, 'eternalHorizonUnlocked is true');
  ok(s.eternalHorizon === true, 's.eternalHorizon is true');
  ok(events.some(e => e.k === 'celestialEngineActivated'), 'celestialEngineActivated event emitted');
  ok(events.some(e => e.k === 'eternalHorizonUnlocked'), 'eternalHorizonUnlocked event emitted');

  // Generate procedural endless contract
  const contract = generateEndlessContract(s, 42);
  ok(contract.id === 'endless_42', 'Endless contract generated with id endless_42');
  ok(contract.depth >= 250, `Endless contract depth is deep: ${contract.depth}m`);
  ok(contract.eternal === true, 'Contract is marked eternal');
  ok(contract.starsPayout > 500, `Contract awards high star payout: ${contract.starsPayout}`);
}

if (failed) {
  console.error(`${failed} assertion(s) failed in test_proto_celestial.js`);
  process.exit(1);
}
console.log('test_proto_celestial: ok');
