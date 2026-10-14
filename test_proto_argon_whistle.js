// Test for Issue ARGON-10: Rafeeq Tactical Agency: Whistle & Focus Command
// Run: node test_proto_whistle.js
import * as G from './digger-argon/game.js';
import { sfx } from './digger-argon/ui/audio.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

console.log('Testing ARGON-10: Tactical Whistle & Rafeeq Focus Command...');

// 1. Export and audio verification
{
  ok(typeof G.whistle === 'function', 'G.whistle is exported');
  ok(typeof sfx.whistle === 'function', 'sfx.whistle is defined in audio.js');
}

// 2. Tactical Whistle invocation and focus state setting
{
  const s = G.newState();
  s.top = 0;
  // Hire 3 Rafeeqs starting at columns 0, 1, 2
  s.diggers = [
    G.newRafeeq(s, 0),
    G.newRafeeq(s, 1),
    G.newRafeeq(s, 2),
  ];

  const events = [];
  const ev = (k, d) => events.push({ k, d });

  // Blow whistle targeting column 7, row 1 for 5 seconds
  const focus = G.whistle(s, 7, 1, 5, ev);
  ok(focus !== null, 'whistle returned focus object');
  ok(focus.c === 7 && focus.r === 1 && focus.ttl === 5, 'focus target has correct coordinates and ttl');
  ok(s.diggers.focus && s.diggers.focus.c === 7, 's.diggers.focus is set');
  ok(s.crewFocus && s.crewFocus.c === 7, 's.crewFocus is set');

  const wEv = events.find(e => e.k === 'whistle');
  ok(wEv !== undefined, 'whistle event emitted');
  ok(wEv.d.c === 7 && wEv.d.r === 1 && wEv.d.duration === 5, 'whistle event has correct payload');
}

// 3. Rafeeq pathing convergence on whistle target within 1.5 seconds
{
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null; // row 0 is open

  // Place solid dirt in rows 1 and 2
  for (let c = 0; c < G.COLS; c++) {
    s.rows[1][c] = G.makeCell(1, 'dirt');
    s.rows[1][c].hp = 1000;
  }

  // Rafeeqs start far on the left (col 0, 1, 2)
  s.diggers = [
    G.newRafeeq(s, 0),
    G.newRafeeq(s, 1),
    G.newRafeeq(s, 2),
  ];

  // Blow whistle at column 7, row 1
  G.whistle(s, 7, 1, 5);

  // All 3 Rafeeqs should have their target column set to 7 (or adjacent)
  ok(s.diggers.every(d => d.tr === 1), 'All Rafeeqs targeted row 1');
  ok(s.diggers.some(d => d.tc === 7), 'At least one Rafeeq targeted col 7 directly');

  // Step 1.5 seconds of simulation (at crewWalk = 6 blocks/sec, distance 7 takes ~1.17s)
  for (let step = 0; step < 15; step++) {
    G.step(s, 0.1);
  }

  // Within 1.5 seconds, all Rafeeqs must have converged towards column 7
  for (const d of s.diggers) {
    const distToCol7 = Math.abs(d.c - 7);
    ok(distToCol7 <= 1.5, `Rafeeq ${d.id} converged to col ${d.c.toFixed(2)} (within 1.5 blocks of target col 7)`);
  }
}

// 4. Focus target priority (soft sand, special items like bones and TNT)
{
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;

  // Place standard stone in row 1
  for (let c = 0; c < G.COLS; c++) {
    s.rows[1][c] = G.makeCell(1, 'stone');
    s.rows[1][c].hp = 500;
  }
  // Place fossil at col 5, row 1
  s.rows[1][5] = G.makeCell(1, 'fossil');
  s.rows[1][5].hp = 10;

  // Whistle in vicinity (col 4, row 1)
  s.diggers = [G.newRafeeq(s, 2)];
  G.whistle(s, 4, 1, 5);

  // Rafeeq should prioritize the fossil at col 5 because special items get bonus score
  ok(s.diggers[0].tc === 5, 'Rafeeq prioritized special fossil cell at col 5 over stone at col 4');
}

// 5. Clean expiration after 5 seconds with zero lingering state bugs
{
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) {
    s.rows[0][c] = null;
    s.rows[1][c] = G.makeCell(1, 'dirt');
  }

  s.diggers = [G.newRafeeq(s, 0)];
  G.whistle(s, 8, 1, 5);
  ok(s.diggers.focus !== null, 'Focus is active');

  // Step 4.0 seconds: focus should still be active
  G.step(s, 4.0);
  ok(s.diggers.focus !== null, 'Focus is still active at 4s');
  ok(Math.abs(s.diggers.focus.ttl - 1.0) < 1e-6, 'Focus ttl is ~1.0s remaining');

  // Step 1.1 more seconds (5.1s total): focus expires
  G.step(s, 1.1);
  ok(s.diggers.focus === null, 'Focus expired cleanly to null after 5s');
  ok(s.crewFocus === null, 's.crewFocus reset cleanly to null');
}

// 6. Discovery callout: Rafeeq breaking bone or chest emits chatter
{
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;

  s.rows[1] = [G.makeCell(1, 'fossil')];
  s.rows[1][0].hp = 0.5;
  s.rows[1][0].max = 0.5;

  s.diggers = [G.newRafeeq(s, 0)];
  s.diggers[0].r = 1; s.diggers[0].c = 0;
  s.diggers[0].tr = 1; s.diggers[0].tc = 0;
  s.diggers[0].cd = 0; // ready to strike

  const events = [];
  const ev = (k, d) => events.push({ k, d });

  // Step so Rafeeq strikes and breaks the bone block
  G.step(s, 0.1, ev);

  const chatterEvs = events.filter(e => e.k === 'chatter');
  ok(chatterEvs.length >= 1, 'Chatter event emitted on rare discovery');
  ok(chatterEvs.some(e => e.d.moment === 'bones'), 'Chatter event moment is "bones" for rare bone find');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('test_proto_whistle: ok');
