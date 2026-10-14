// Test for Issue ARGON-20: Month 7: The Bioluminescent Deep (proto/features/flora/)
// Run: node test_proto_flora.js

import * as G from './digger-argon/game.js';
import {
  SPORE_POD,
  GLOW_MOSS,
  spreadSpore,
  plantGlowMoss,
  isInfested,
  hasMossAt,
} from './digger-argon/features/flora/rules.js';
import strings from './digger-argon/features/flora/strings.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

console.log('Testing ARGON-20: The Bioluminescent Deep...');

// 1. Verify bilingual strings parity
{
  const required = [
    'flora_title', 'flora_sub',
    'block_spore_pod', 'block_spore_pod_d',
    'tool_glow_moss', 'tool_glow_moss_d',
    'spore_burst', 'moss_planted',
  ];
  for (const k of required) {
    ok(typeof strings.en[k] === 'string' && strings.en[k].length > 0, `EN string for ${k} exists`);
    ok(typeof strings.ar[k] === 'string' && strings.ar[k].length > 0, `AR string for ${k} exists`);
  }
}

// 2. Spore pods: when broken, spreads mycelium to adjacent 8 cells, softening HP by 0.10 (100 HP -> 10 HP)
{
  const s = G.newState();
  s.top = 0;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];

  // Create a 3x3 grid around (1, 1) with 100 HP stone blocks
  for (let r = 0; r <= 2; r++) {
    for (let c = 0; c <= 2; c++) {
      s.rows[r][c] = { t: 'dirt', hp: 100, max: 100 };
    }
  }

  // Put spore pod at center (1, 1)
  s.rows[1][1] = { t: SPORE_POD, hp: 1, max: 1 };

  const events = [];
  const ev = (k, d) => events.push({ k, d });

  // Spread spores from (1, 1)
  const infected = spreadSpore(s, 1, 1, ev);
  ok(infected.length === 8, `Spore spread to all 8 adjacent cells: got ${infected.length}`);

  // Check each neighbor has been softened to 10 HP (0.10 * 100) and marked sporeInfested
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const cell = s.rows[1 + dr][1 + dc];
      ok(cell.sporeInfested === true, `Cell (${1 + dr}, ${1 + dc}) marked sporeInfested`);
      ok(cell.hp === 10, `Cell (${1 + dr}, ${1 + dc}) HP softened from 100 to 10: got ${cell.hp}`);
      ok(cell.max === 10, `Cell (${1 + dr}, ${1 + dc}) max HP updated to 10`);
      ok(isInfested(s, 1 + dr, 1 + dc), `isInfested returns true for (${1 + dr}, ${1 + dc})`);
    }
  }
  ok(events.some(e => e.k === 'sporeSpread' && e.d.r === 1 && e.d.c === 1), 'sporeSpread event emitted');

  // Verify softened block breaks in 1 hit with standard pick power
  // Give player 10 pick power
  // Give player high pick power >= 10
  s.up.pick = 20;
  const power = G.pickPower(s);
  ok(power >= 10, `Pick power is ${power} (>= 10)`);

  const hitResult = G.swing(s, 0, 1);
  ok(s.rows[0][1] === null, 'Infested stone block broke in 1 hit');
}

// 3. Glow-moss seed tool: sets cell light level to permanent 1.0 and illuminates visibleMask
{
  const s = G.newState();
  s.top = 0;
  for (let i = 0; i < G.KEEP_ROWS; i++) {
    s.rows[i] = [];
    for (let c = 0; c < G.COLS; c++) s.rows[i][c] = { t: 'dirt', hp: 50, max: 50 };
  }

  ok(!hasMossAt(s, 5, 3), 'Cell (5, 3) initially has no moss');

  const events = [];
  const ev = (k, d) => events.push({ k, d });

  const planted = plantGlowMoss(s, 5, 3, ev);
  ok(planted === true, 'plantGlowMoss succeeded');
  ok(hasMossAt(s, 5, 3), 'hasMossAt returns true for (5, 3)');
  ok(s.flora.moss['5,3'] === 1.0, 's.flora.moss records 1.0 light level');
  ok(s.rows[5][3].light === 1.0, 'Cell (5, 3) light property is 1.0');
  ok(events.some(e => e.k === 'mossPlanted' && e.d.r === 5 && e.d.c === 3 && e.d.light === 1.0), 'mossPlanted event emitted');

  // Test visibleMask includes moss cell even in dark depth
  const mask = G.visibleMask(s);
  ok(mask[5][3] === true, 'visibleMask illuminates cell (5, 3) due to glow moss');

  // Test tool via useTool
  ok(G.toolOpen(s, 'glowMoss'), 'glowMoss tool is open');
  ok(G.canUseTool(s, 'glowMoss', 7, 2), 'glowMoss tool can be used at (7, 2)');
  G.useTool(s, 'glowMoss', 7, 2);
  ok(hasMossAt(s, 7, 2), 'glowMoss tool successfully planted moss at (7, 2)');
}

// 4. Breaking sporePod in excavation grid triggers spreadSpore automatically
{
  const s = G.newState();
  s.top = 0;
  for (let i = 0; i < G.KEEP_ROWS; i++) {
    s.rows[i] = [];
    for (let c = 0; c < G.COLS; c++) s.rows[i][c] = { t: 'dirt', hp: 100, max: 100 };
  }
  s.rows[1][2] = { t: SPORE_POD, hp: 1, max: 1 };

  G.breakCell(s, 1, 2, 'you', () => {});
  ok(s.rows[1][2] === null, 'Spore pod broke');
  ok(s.rows[1][1].sporeInfested === true && s.rows[1][1].hp === 10, 'Adjacent cell was automatically softened upon breaking spore pod');
}

if (failed) {
  console.error(`${failed} assertion(s) failed in test_proto_flora.js`);
  process.exit(1);
}
console.log('test_proto_flora: ok');
