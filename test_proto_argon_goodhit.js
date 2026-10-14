// Test for Issue ARGON-08: Rhythmic Mastery: Active "Good Hit" & Timing Window
// Run: node test_proto_goodhit.js
import * as G from './digger-argon/game.js';
import { sfx } from './digger-argon/ui/audio.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

console.log('Testing ARGON-08: Active Good Hit & Accent Timing Window...');

// 1. Audio and export verification
{
  ok(typeof G.isAccentWindow === 'function', 'isAccentWindow is exported');
  ok(typeof G.inAccentWindow === 'function', 'inAccentWindow is exported');
  ok(typeof G.picksInAccentWindow === 'function', 'picksInAccentWindow is exported');
  ok(typeof G.goodHit === 'function', 'goodHit is exported');
  ok(typeof G.rhythmicSwing === 'function', 'rhythmicSwing is exported');
  ok(typeof sfx.goodHit === 'function', 'sfx.goodHit is defined in audio.js');
}

// 2. Timing window calculations in beat.js
{
  // Default bar 1 at 100 BPM: stepSec = 0.15s, barSec = 2.40s.
  // Accents 'X' fall on step 0 (0.00s), step 4 (0.60s), step 8 (1.20s), step 12 (1.80s).
  // Step 2 (0.30s) and step 6 (0.90s) are plain 'x'.
  // Odd steps are rests '.'.

  // Exactly on accent beats
  ok(G.isAccentWindow(0.00, 100) === true, 't = 0.00s is on step 0 accent');
  ok(G.isAccentWindow(0.60, 100) === true, 't = 0.60s is on step 4 accent');
  ok(G.isAccentWindow(1.20, 100) === true, 't = 1.20s is on step 8 accent');
  ok(G.isAccentWindow(1.80, 100) === true, 't = 1.80s is on step 12 accent');

  // Within +/- 100ms tolerance
  ok(G.isAccentWindow(0.05, 100) === true, 't = 0.05s (+50ms) is inside 100ms accent window');
  ok(G.isAccentWindow(0.09, 100) === true, 't = 0.09s (+90ms) is inside 100ms accent window');
  ok(G.isAccentWindow(0.55, 100) === true, 't = 0.55s (-50ms from step 4) is inside accent window');
  ok(G.isAccentWindow(0.68, 100) === true, 't = 0.68s (+80ms from step 4) is inside accent window');

  // Bar wrap-around at step 0 / step 16 boundary (barSec = 2.40s)
  ok(G.isAccentWindow(2.35, 100) === true, 't = 2.35s (-50ms before step 0) wraps around correctly');
  ok(G.isAccentWindow(2.38, 100) === true, 't = 2.38s (-20ms before step 0) wraps around correctly');
  ok(G.isAccentWindow(-0.04, 100) === true, 'Negative clock -0.04s (-40ms) handles wrap-around');

  // Outside 100ms tolerance on accents
  ok(G.isAccentWindow(0.12, 100) === false, 't = 0.12s (+120ms from step 0) is outside window');
  ok(G.isAccentWindow(0.48, 100) === false, 't = 0.48s (-120ms from step 4) is outside window');

  // Off-beat steps ('x' and '.')
  ok(G.isAccentWindow(0.30, 100) === false, 't = 0.30s (step 2 plain x) is not an accent window');
  ok(G.isAccentWindow(0.90, 100) === false, 't = 0.90s (step 6 plain x) is not an accent window');
  ok(G.isAccentWindow(0.15, 100) === false, 't = 0.15s (step 1 rest) is not an accent window');
}

// 3. Passive clicking/holding functions at 1.0x normal damage
{
  const undo = G.setParam('crits.chance', 0);
  G.seedRng(1);
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;

  s.rows[1] = [G.makeCell(1, 'stone')];
  s.rows[1][0].hp = 1000;
  s.rows[1][0].max = 1000;

  const basePower = G.pickPower(s);
  const hpBefore = s.rows[1][0].hp;

  const okSwing = G.swing(s, 1, 0);
  ok(okSwing, 'Passive swing executed');
  const dmgDealt = hpBefore - s.rows[1][0].hp;
  ok(Math.abs(dmgDealt - basePower) < 1e-6, 'Passive swing deals 1.0x base pick damage: ' + dmgDealt);
  ok(s.goodHitStreak === 0, 'Passive swing does not increment goodHitStreak');
  undo();
}

// 4. Good Hit deals 2.5x damage and increments goodHitStreak
{
  const undo = G.setParam('crits.chance', 0);
  G.seedRng(2);
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;

  s.rows[1] = [G.makeCell(1, 'stone')];
  s.rows[1][0].hp = 1000;
  s.rows[1][0].max = 1000;

  const basePower = G.pickPower(s);
  const events = [];
  const ev = (k, d) => events.push({ k, d });

  // Good Hit at t = 0.00s (on accent)
  const hpBefore = s.rows[1][0].hp;
  const okHit = G.rhythmicSwing(s, 1, 0, 0.00, ev);
  ok(okHit, 'Rhythmic swing executed');

  const dmgDealt = hpBefore - s.rows[1][0].hp;
  ok(Math.abs(dmgDealt - basePower * 2.5) < 1e-6, 'Good Hit deals exactly 2.5x damage: ' + dmgDealt);
  ok(s.goodHitStreak === 1, 'goodHitStreak incremented to 1');

  const goodHitEvs = events.filter(e => e.k === 'goodHit');
  ok(goodHitEvs.length === 1, 'goodHit event emitted');
  ok(goodHitEvs[0].d.mult === 2.5, 'goodHit event reports mult 2.5');
  ok(goodHitEvs[0].d.streak === 1, 'goodHit event reports streak 1');

  // Second Good Hit at t = 0.60s (step 4 accent)
  const hpBefore2 = s.rows[1][0].hp;
  G.rhythmicSwing(s, 1, 0, 0.60, ev);
  const dmgDealt2 = hpBefore2 - s.rows[1][0].hp;
  ok(Math.abs(dmgDealt2 - basePower * 2.5) < 1e-6, 'Second Good Hit deals 2.5x damage');
  ok(s.goodHitStreak === 2, 'Consecutive Good Hit increments goodHitStreak to 2');
  undo();
}

// 5. Off-beat active swing deals normal 1.0x damage and resets streak
{
  const undo = G.setParam('crits.chance', 0);
  G.seedRng(3);
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;

  s.rows[1] = [G.makeCell(1, 'stone')];
  s.rows[1][0].hp = 1000;
  s.rows[1][0].max = 1000;

  s.goodHitStreak = 5; // Established streak
  const basePower = G.pickPower(s);

  // Active swing at t = 0.30s (step 2 plain x: off-beat)
  const hpBefore = s.rows[1][0].hp;
  G.rhythmicSwing(s, 1, 0, 0.30);

  const dmgDealt = hpBefore - s.rows[1][0].hp;
  ok(Math.abs(dmgDealt - basePower) < 1e-6, 'Off-beat hit deals normal 1.0x damage without penalty: ' + dmgDealt);
  ok(s.goodHitStreak === 0, 'Off-beat hit resets goodHitStreak to 0');
  undo();
}


if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('test_proto_goodhit: ok');
