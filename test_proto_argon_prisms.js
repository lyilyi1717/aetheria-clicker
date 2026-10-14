// Test for Issue ARGON-22: Month 9: Prismatic Vaults & Laser Shafts (proto/features/prisms/)
// Run: node test_proto_prisms.js

import * as G from './digger-argon/game.js';
import {
  PRISM,
  refractPrism,
  fireSurfaceBeam,
  hasCrystalSpire,
  unlockCrystalSpire,
  crystalSpireMultiplier,
} from './digger-argon/features/prisms/rules.js';
import strings from './digger-argon/features/prisms/strings.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

console.log('Testing ARGON-22: Prismatic Vaults & Laser Shafts...');

// 1. Verify bilingual strings parity
{
  const required = [
    'prisms_title', 'prisms_sub',
    'block_prism', 'block_prism_d',
    'crystal_spire', 'crystal_spire_d',
    'laser_refracted',
  ];
  for (const k of required) {
    ok(typeof strings.en[k] === 'string' && strings.en[k].length > 0, `EN string for ${k} exists`);
    ok(typeof strings.ar[k] === 'string' && strings.ar[k].length > 0, `AR string for ${k} exists`);
  }
}

// 2. Surface light beam traverses downward and strikes Prism block, vaporizing row
{
  const s = G.newState();
  s.top = 0;
  for (let i = 0; i < G.KEEP_ROWS; i++) {
    s.rows[i] = [];
    for (let c = 0; c < G.COLS; c++) {
      s.rows[i][c] = { t: 'dirt', hp: 300, max: 300 };
    }
  }

  // Clear column 3 above row 4 so light beam can traverse down
  for (let r = 0; r < 4; r++) {
    s.rows[r][3] = null;
  }

  // Place prism at (4, 3)
  s.rows[4][3] = { t: PRISM, hp: 1, max: 1 };

  // Place a Big Rock in row 4 at column 6 to verify it is protected
  s.rows[4][6] = { t: 'rock', hp: 9999, max: 9999, boss: true };

  const events = [];
  const ev = (k, d) => events.push({ k, d });

  // Fire surface beam down column 3
  const result = fireSurfaceBeam(s, 3, ev);
  ok(result.struck === true, 'Surface light beam successfully struck prism block');
  ok(result.r === 4 && result.c === 3, `Prism struck at (4, 3)`);
  ok(events.some(e => e.k === 'laserRefracted' && e.d.r === 4 && e.d.c === 3), 'laserRefracted event emitted');

  // Verify all standard stone blocks in row 4 were vaporized (become null)
  for (let c = 0; c < G.COLS; c++) {
    if (c === 3) continue; // Original prism position
    if (c === 6) {
      ok(s.rows[4][6] !== null && s.rows[4][6].t === 'rock', 'Big Rock at (4, 6) was NOT vaporized by laser');
    } else {
      ok(s.rows[4][c] === null, `Standard stone block at (4, ${c}) was cleanly vaporized by laser`);
    }
  }

  // Rows above and below are unaffected
  ok(s.rows[5][0] !== null, 'Row 5 blocks unaffected by row 4 horizontal laser');
}

// 3. Breaking prism block directly in excavation grid triggers refraction
{
  const s = G.newState();
  s.top = 0;
  for (let i = 0; i < G.KEEP_ROWS; i++) {
    s.rows[i] = [];
    for (let c = 0; c < G.COLS; c++) {
      s.rows[i][c] = { t: 'dirt', hp: 150, max: 150 };
    }
  }
  s.rows[2][1] = { t: PRISM, hp: 1, max: 1 };

  G.breakCell(s, 2, 1, 'you', () => {});
  // Stone blocks in row 2 should be vaporized
  ok(s.rows[2][0] === null, 'Row 2 col 0 vaporized');
  ok(s.rows[2][2] === null, 'Row 2 col 2 vaporized');
}

// 4. Crystal Resonance Spire Wonder: unlocks and grants 3x crystal chain payouts
{
  const s = G.newState();
  ok(!hasCrystalSpire(s), 'Crystal Resonance Spire is initially locked');
  ok(crystalSpireMultiplier(s) === 1, 'Base crystal multiplier is 1x');
  ok(G.fold('crystalMult', s, 1) === 1, 'Fold crystalMult is 1');

  // Complete level 200 / unlock spire
  const events = [];
  const ev = (k, d) => events.push({ k, d });
  unlockCrystalSpire(s, ev);

  ok(hasCrystalSpire(s), 'Crystal Resonance Spire is unlocked');
  ok(crystalSpireMultiplier(s) === 3, 'Crystal Resonance Spire grants 3x multiplier');
  ok(G.fold('crystalMult', s, 1) === 3, 'Fold crystalMult is 3x');
  ok(events.some(e => e.k === 'crystalSpireUnlocked'), 'crystalSpireUnlocked event emitted');

  // Coin multiplier with crystalChain flag
  const baseCoinMult = G.coinMult(s);
  const crystalChainEvent = { crystalChain: true };
  const chainCoinMult = G.fold('coinMult', s, baseCoinMult, crystalChainEvent);
  ok(chainCoinMult === baseCoinMult * 3, `Crystal chain payouts multiplied by 3x: got ${chainCoinMult} vs ${baseCoinMult * 3}`);

  // Test level 200 stamp auto-unlock
  const s2 = G.newState();
  s2.road = { stamps: {} };
  const f200 = G.ROAD[199];
  s2.road.stamps[G.roadKey(f200)] = { fin: 1 };
  ok(hasCrystalSpire(s2), 'hasCrystalSpire detects completed Level 200 via road stamps');
  ok(crystalSpireMultiplier(s2) === 3, '3x multiplier active for Level 200 finisher');
}

if (failed) {
  console.error(`${failed} assertion(s) failed in test_proto_prisms.js`);
  process.exit(1);
}
console.log('test_proto_prisms: ok');
