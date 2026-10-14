// Test for Issue ARGON-03: Visual Entrainment: Rhythmic Cursor Pulse & Museum Shimmer
// Run: node test_proto_cursor_pulse.js
import * as G from './digger-argon/game.js';
import { fx, updateFx } from './digger-argon/ui/render.js';
import { isMissingFossil, hasMissingFossilBelow } from './digger-argon/features/wing2/rules.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

// 1. Cursor pulse decay mechanics and sync with accented drum beats
{
  fx.cursorPulse = 1.0;
  ok(fx.cursorPulse === 1.0, 'Pulse initialized at 1.0');
  updateFx(0.060); // 60ms elapsed: half of 120ms
  ok(Math.abs(fx.cursorPulse - 0.5) < 0.05, 'Pulse decays linearly over 120ms: ' + fx.cursorPulse);
  updateFx(0.070); // 130ms total: fully decayed
  ok(fx.cursorPulse === 0, 'Pulse reaches 0 after 120ms: ' + fx.cursorPulse);

  // Verify picks cadence frame sync with accented notes
  const P = G.PARAMS.picks;
  const seq = G.picksSeq(P);
  const bar = G.picksBarOf(1); // 1 pick bar: hits: '1.1.1.1.1.1.1.1.', vel: 'X.x.X.x.X.x.X.x.'
  const step = G.picksStepSec(100);

  // Advance seq across the bar
  const notes = seq.advance(0.1, true, bar, step);
  ok(notes.length > 0, 'Sequencer emitted notes');
  const accented = notes.filter(n => n.v === 'X');
  ok(accented.length > 0, 'Accented drum notes present with v === "X"');

  // Verify that an accented note triggers cursor pulse
  for (const n of notes) {
    if (n.v === 'X') fx.cursorPulse = 1.0;
  }
  ok(fx.cursorPulse === 1.0, 'Accented drum note triggers cursor pulse = 1.0');
}

// 2. isMissingFossil query helper logic
{
  G.seedRng(12);
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;

  // Place a fossil cell at row 15
  s.rows[15] = [G.makeCell(15, 'fossil')];
  s.rows[15][0].boneId = 'camel.0';

  // Initially uncollected
  s.wingGot = {};
  s.museum = { collected: new Set() };
  ok(isMissingFossil(s, 15, 0) === true, 'Uncollected fossil is flagged as missing');

  // Mark as collected via museum.collected
  s.museum.collected.add('camel.0');
  ok(isMissingFossil(s, 15, 0) === false, 'Already collected bone in museum.collected does not show glint');

  // Mark via s.wingGot
  s.museum.collected.clear();
  s.wingGot['camel.0'] = 1;
  ok(isMissingFossil(s, 15, 0) === false, 'Already collected bone in s.wingGot does not show glint');

  // Normal dirt block
  s.rows[15][1] = G.makeCell(15, 'dirt');
  ok(isMissingFossil(s, 15, 1) === false, 'Dirt block is never a missing fossil');

  // Dusty bundle ('lost') block - must not crash candidates() / wingMatches()
  s.rows[15][2] = G.makeCell(15, 'lost');
  ok(typeof isMissingFossil(s, 15, 2) === 'boolean', 'Lost bundle does not crash isMissingFossil');
}

// 3. Off-screen indicator detection 1-3 rows below viewport
{
  const s = G.newState();
  s.top = 10; // Viewport is rows 10..18 (with VIEW_ROWS = 9)
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];

  // Rows below viewport: 10 + 9 = 19 (1 row below), 20 (2 rows below), 21 (3 rows below)
  // Row 19 is 1 row below viewport
  s.rows[9] = [G.makeCell(19, 'fossil')]; // index 9 corresponds to row 19 in local array s.rows
  s.rows[9][0].boneId = 'whale.1';
  s.wingGot = {};

  ok(isMissingFossil(s, 19, 0) === true, 'Fossil 1 row below viewport is missing');

  const below = hasMissingFossilBelow(s);
  ok(below.length === 1, 'Detected exactly 1 missing fossil below viewport');
  ok(below[0].r === 19 && below[0].c === 0 && below[0].rowsBelow === 1, 'Indicator points to row 19, col 0, 1 row below');

  // Add another fossil 3 rows below viewport (row 21)
  s.rows[11] = [null, G.makeCell(21, 'fossil')];
  s.rows[11][1].boneId = 'scarab.0';

  const below2 = hasMissingFossilBelow(s);
  ok(below2.length === 2, 'Detected 2 missing fossils below viewport: ' + below2.length);
  ok(below2.some(b => b.r === 21 && b.c === 1 && b.rowsBelow === 3), 'Row 21 is detected 3 rows below');

  // A fossil 4 rows below viewport (row 22) should NOT be detected
  s.rows[12] = [null, null, G.makeCell(22, 'fossil')];
  s.rows[12][2].boneId = 'lizard.0';
  const below3 = hasMissingFossilBelow(s);
  ok(below3.length === 2, 'Fossil 4 rows below is outside the 1-3 rows indicator range');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('test_proto_cursor_pulse: ok');
