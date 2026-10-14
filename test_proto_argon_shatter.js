// Test for Issue ARGON-02: Overkill Sand-Burst & Shatter Carry
// Run: node test_proto_shatter.js
import * as G from './digger-argon/game.js';
import { sfx } from './digger-argon/ui/audio.js';
import { shatterBurst } from './digger-argon/ui/render.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

// 1. Verify shatterBurst and sfx.shatter exports exist and run without errors
{
  ok(typeof shatterBurst === 'function', 'shatterBurst is exported from render.js');
  ok(typeof sfx.shatter === 'function', 'sfx.shatter is defined in audio.js');
}

// 2. Overkill shatter on normal block breaking in 1 swing and residual carry
{
  G.seedRng(7);
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;

  // Row 1: Dirt block with 5 HP
  s.rows[1] = [G.makeCell(1, 'dirt')];
  s.rows[1][0].hp = 5;
  s.rows[1][0].max = 5;

  // Row 2: Block underneath with 10 HP
  s.rows[2] = [G.makeCell(2, 'dirt')];
  s.rows[2][0].hp = 10;
  s.rows[2][0].max = 10;

  // Pick power set to 12 (> 5 HP)
  s.up.pick = 11; // pickPower will fold higher than 5

  const breaks = [];
  const punches = [];
  const ev = (k, d) => {
    if (k === 'break') breaks.push(d);
    if (k === 'punch') punches.push(d);
  };

  const swung = G.swing(s, 1, 0, ev);
  ok(swung, 'Swing was reachable and executed');
  ok(breaks.length >= 1, 'Block broke in 1 swing');
  ok(breaks[0].shatter === true, 'Break event has shatter: true on overkill');
  ok(s.rows[1][0] === null, 'Row 1 cell is cleared');

  // Residual damage carry: Pick power was > 5, so leftover damage damaged row 2
  ok(punches.length >= 1, 'Punch event emitted for downwards carry');
  ok(s.rows[2][0] !== null, 'Row 2 cell is still present');
  ok(s.rows[2][0].hp < 10, 'Residual overkill damage carried to row 2 underneath: ' + s.rows[2][0].hp);
}

// 3. Exact damage (no overkill): breaks in 1 swing, shatter is true, 0 residual damage carried
{
  G.seedRng(9);
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;

  const power = G.pickPower(s);
  s.rows[1] = [G.makeCell(1, 'dirt')];
  s.rows[1][0].hp = power;
  s.rows[1][0].max = power;

  s.rows[2] = [G.makeCell(2, 'dirt')];
  s.rows[2][0].hp = 10;
  s.rows[2][0].max = 10;

  const breaks = [];
  const ev = (k, d) => { if (k === 'break') breaks.push(d); };
  G.swing(s, 1, 0, ev);

  ok(breaks.length === 1 && breaks[0].shatter === true, 'Damage equal to HP shatters the block');
  ok(s.rows[2][0].hp === 10, 'No residual damage carried to row 2 when overkill is 0');
}

// 4. Non-lethal hit (damage < HP): no shatter, no break, no punch carry
{
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;

  s.rows[1] = [G.makeCell(1, 'stone')];
  s.rows[1][0].hp = 1000;
  s.rows[1][0].max = 1000;

  const breaks = [];
  const hits = [];
  const ev = (k, d) => {
    if (k === 'break') breaks.push(d);
    if (k === 'hit') hits.push(d);
  };
  G.swing(s, 1, 0, ev);

  ok(breaks.length === 0, 'No break on non-lethal hit');
  ok(hits.length === 1, 'Hit event emitted');
  ok(s.rows[1][0].hp > 0, 'Block still stands');
}

// 5. Big Rocks and Gates are immune to punch-through carry
{
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;

  // Row 1: weak dirt block
  s.rows[1] = [G.makeCell(1, 'dirt')];
  s.rows[1][0].hp = 1;
  s.rows[1][0].max = 1;

  // Row 2: Boss / Big Rock (wall: true)
  s.rows[2] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[2][c] = G.makeCell(2, 'boss');

  s.up.pick = 20; // massive pick power
  const bossHp0 = s.rows[2][0].hp;

  const breaks = [];
  const ev = (k, d) => { if (k === 'break') breaks.push(d); };
  G.swing(s, 1, 0, ev);

  ok(breaks.length === 1, 'Top block broken');
  ok(breaks[0].shatter === true, 'Top block shattered');
  ok(s.rows[2][0].hp === bossHp0, 'Boss / Big Rock underneath is immune to punch-through carry');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('test_proto_shatter: ok');
