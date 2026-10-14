// Test Month 2: The Sunken Aquifers (ARGON-15). Run: node test_proto_aquifers.js
import * as G from './digger-argon/game.js';
import { SILT, PRESSURE_WELL, hasWaterAt, hydroPickUse } from './digger-argon/features/aquifers/rules.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const A = (s, r, c) => G.cellAt(s, r, c);
const D = (t, hp = 2) => ({ t, hp, max: hp, s: 0 });

console.log('Testing ARGON-15: Month 2: The Sunken Aquifers...');

function ground() {
  G.seedRng(42);
  const s = G.newState();
  s.top = 50; s.best = 60;
  s.rows = [];
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows.push(Array.from({ length: G.COLS }, () => D('dirt', 10)));
  s.rows[5] = s.rows[5].map(() => D('hard', 999));
  s.queue = []; s.pools = {};
  return s;
}

const run = (s, secs, ev) => { for (let i = 0; i < secs / 0.05; i++) G.step(s, 0.05, ev); };
const collect = () => { const log = []; const ev = (k, d) => log.push([k, d]); ev.log = log; return ev; };
const has = (ev, k) => ev.log.some(x => x[0] === k);

{ // 1. Registration & Content
  ok(G.BLOCKS.pressureWell, 'pressureWell block registered in BLOCKS');
  ok(G.BLOCKS.well, 'well alias exists in BLOCKS');
  ok(G.BLOCKS.silt, 'silt block registered in BLOCKS');
  ok(G.BLOCKS.SILT, 'SILT uppercase getter works in BLOCKS');
  ok(G.TOOLS.hydroPick, 'hydroPick tool registered in TOOLS');
  const u = G.unlocks();
  ok(u.byId['aquifer:well'] && u.byId['aquifer:silt'] && u.byId['aquifer:hydropick'], 'aquifers unlocks present');
}

{ // 2. Breaching a Pressure Well causes cascading water flow down and sideways
  const s = ground(), ev = collect();
  // Place pressure well at (50, 4)
  s.rows[0][4] = D('pressureWell', 1);
  // Clear path below
  s.rows[1][4] = null;
  s.rows[2][4] = null;
  // Put hard floor at row 53 to block downwards flow
  s.rows[3][4] = D('hard', 999);
  // Open spaces left and right at row 52
  s.rows[2][3] = null;
  s.rows[2][5] = null;

  G.swing(s, 50, 4, ev);
  ok(A(s, 50, 4) === null, 'pressure well broke');
  ok(has(ev, 'wellBurst') || has(ev, 'burst'), 'well burst event emitted');

  // Let flow simulate
  run(s, 1.0, ev);
  ok(s.pools['50,4'] !== undefined, 'water at well origin (50, 4)');
  ok(s.pools['51,4'] !== undefined, 'water flowed downwards to (51, 4)');
  ok(s.pools['52,4'] !== undefined, 'water flowed downwards to (52, 4)');
  ok(s.pools['52,3'] !== undefined || s.pools['52,5'] !== undefined, 'water spread horizontally when blocked below');
}

{ // 3. Silt blocks dissolve automatically upon contact with flowing water
  const s = ground(), ev = collect();
  s.rows[0][4] = D('pressureWell', 1);
  // Put silt directly below the well at (51, 4) and to the right at (50, 5)
  s.rows[1][4] = D('silt', 5);
  s.rows[0][5] = D('silt', 5);

  ok(A(s, 51, 4).t === 'silt', 'silt block placed at (51, 4)');
  G.swing(s, 50, 4, ev);
  run(s, 1.0, ev);

  ok(A(s, 51, 4) === null, 'silt block at (51, 4) dissolved automatically from water flow');
  ok(A(s, 50, 5) === null, 'silt block at (50, 5) dissolved automatically from water contact');
  ok(has(ev, 'siltErode'), 'siltErode event emitted');
}

{ // 4. Waterwheel Sieve: 3x coin multiplier for rubble falling through water
  const s = ground();
  const basePay = G.rubblePay(s, 50, 2);
  ok(basePay > 0, 'base rubble pay calculated');

  // Add water to column 2
  s.pools['52,2'] = s.t + 10;
  ok(hasWaterAt(s, 50, 2), 'hasWaterAt identifies water in column 2');
  const waterPay = G.rubblePay(s, 50, 2);
  ok(waterPay === basePay * 3, `waterwheel sieve applies 3x multiplier: got ${waterPay}, expected ${basePay * 3}`);

  // Column 6 has no water
  const dryPay = G.rubblePay(s, 50, 6);
  ok(dryPay === basePay, `column without water pays normal 1x: got ${dryPay}, expected ${basePay}`);
}

{ // 5. Hydro-Pick tool strikes 5 vertical blocks in a single column
  const s = ground(), ev = collect();
  const initialPower = G.pickPower(s);
  // Place 5 solid dirt blocks at column 1 from row 50 to 54
  for (let k = 0; k < 5; k++) {
    s.rows[k][1] = D('dirt', 100);
  }
  // Row 55 has another block
  s.rows[5][1] = D('dirt', 100);

  ok(G.canUseTool(s, 'hydroPick', 50, 1), 'hydroPick is usable at (50, 1)');
  const struck = G.useTool(s, 'hydroPick', 50, 1, ev);
  ok(struck, 'hydroPick tool executed successfully');
  ok(has(ev, 'hydroPick'), 'hydroPick event emitted');

  // Verify damage applied to all 5 vertical blocks
  for (let k = 0; k < 5; k++) {
    const expectedHp = 100 - (initialPower * 5);
    ok(A(s, 50 + k, 1).hp === expectedHp, `block at row ${50 + k} took 5x pick power damage: got ${A(s, 50 + k, 1).hp}, expected ${expectedHp}`);
  }
  // Block at row 55 should be untouched
  ok(A(s, 55, 1).hp === 100, 'block at row 55 (outside 5-block reach) untouched');
}

if (failed) {
  console.error(`${failed} check(s) failed in test_proto_aquifers.js`);
  process.exit(1);
}
console.log('test_proto_aquifers: ok');
