// Test Month 3: The Geothermal Kiln (ARGON-16). Run: node test_proto_geothermal.js
import * as G from './digger-argon/game.js';
import {
  quenchLavaWater,
  quenchLavaCell,
  shatterObsidianRow,
  addHeat,
  triggerMagmaBurst,
  hasGreatSiphon,
  unlockGreatSiphon,
  greatSiphonRate,
} from './digger-argon/features/geothermal/rules.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const A = (s, r, c) => G.cellAt(s, r, c);
const D = (t, hp = 2) => ({ t, hp, max: hp, s: 0 });

console.log('Testing ARGON-16: Month 3: The Geothermal Kiln...');

function ground() {
  G.seedRng(77);
  const s = G.newState();
  s.top = 50; s.best = 60;
  s.rows = [];
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows.push(Array.from({ length: G.COLS }, () => D('dirt', 20)));
  s.rows[5] = s.rows[5].map(() => D('hard', 999));
  s.queue = []; s.pools = {};
  return s;
}

const run = (s, secs, ev) => { for (let i = 0; i < secs / 0.05; i++) G.step(s, 0.05, ev); };
const collect = () => { const log = []; const ev = (k, d) => log.push([k, d]); ev.log = log; return ev; };
const has = (ev, k) => ev.log.some(x => x[0] === k);

{ // 1. Registration & Content
  ok(G.BLOCKS.basalt, 'basalt block registered in BLOCKS');
  ok(G.BLOCKS.obsidian, 'obsidian block registered in BLOCKS');
  ok(G.BLOCKS.OBSIDIAN, 'OBSIDIAN getter works in BLOCKS');
  ok(typeof hasGreatSiphon === 'function', 'hasGreatSiphon exported');
  ok(typeof greatSiphonRate === 'function', 'greatSiphonRate exported');
  const u = G.unlocks();
  ok(u.byId['geo:obsidian'] && u.byId['geo:magma'] && u.byId['geo:siphon'], 'geothermal unlocks present');
}

{ // 2. Lava + Water reaction: transforms immediately into obsidian blocks
  const s = ground(), ev = collect();
  // Place lava at (50, 4)
  s.rows[0][4] = D('lava', 1);
  // Place standing water at adjacent cell (50, 5)
  s.pools['50,5'] = s.t + 10;

  ok(A(s, 50, 4).t === 'lava', 'lava is present before quench');
  const quenched = quenchLavaWater(s, ev);
  ok(quenched >= 1, `lava quenched into obsidian: count = ${quenched}`);
  ok(A(s, 50, 4).t === 'obsidian', 'lava block immediately transformed into obsidian');
  ok(has(ev, 'obsidianFormed') || has(ev, 'lavaQuenched'), 'obsidianFormed or lavaQuenched event emitted');
}

{ // 3. Obsidian break rule: shatters all blocks in that horizontal row
  const s = ground(), ev = collect();
  // Fill row 50 with varied blocks
  for (let c = 0; c < G.COLS; c++) {
    s.rows[0][c] = D('dirt', 100);
  }
  // Place obsidian at (50, 3)
  s.rows[0][3] = D('obsidian', 1);

  // Break obsidian block
  G.damage(s, 50, 3, 10, 'you', ev);
  ok(A(s, 50, 3) === null, 'obsidian block broken');
  ok(has(ev, 'obsidianShatter'), 'obsidianShatter event emitted');

  // Verify entire row 50 was shattered
  let remainingInRow = 0;
  for (let c = 0; c < G.COLS; c++) {
    if (A(s, 50, c) !== null) remainingInRow++;
  }
  ok(remainingInRow === 0, `all blocks in row 50 shattered: ${remainingInRow} remaining`);
}

{ // 4. Heat accumulation & Magma Burst (cleaving 3x3 areas for 10 swings)
  const s = ground(), ev = collect();
  ok(s.geothermal && s.geothermal.heat === 0, 'initial heat is 0');
  ok(s.geothermal.burstSwings === 0, 'initial burstSwings is 0');

  // Break 19 hot basalt blocks: +5 heat each = 95 heat
  for (let i = 0; i < 19; i++) {
    s.rows[0][0] = D('basalt', 1);
    G.damage(s, 50, 0, 10, 'you', ev);
  }
  ok(s.geothermal.heat === 95, `heat accumulated to 95: got ${s.geothermal.heat}`);
  ok(s.geothermal.burstSwings === 0, 'Magma Burst not yet active at 95 heat');

  // Break 20th hot block: reaches 100 heat -> activates Magma Burst (10 swings)
  s.rows[0][0] = D('basalt', 1);
  G.damage(s, 50, 0, 10, 'you', ev);
  ok(s.geothermal.heat === 100, `heat reached 100: got ${s.geothermal.heat}`);
  ok(s.geothermal.burstSwings === 10, `Magma Burst activated for 10 swings: got ${s.geothermal.burstSwings}`);
  ok(has(ev, 'magmaBurstReady'), 'magmaBurstReady event emitted');

  // Set up a 3x3 test grid centred at (51, 4) with solid blocks
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      s.rows[1 + dr][4 + dc] = D('dirt', 100);
    }
  }
  // Cell at (50, 4) was dirt; let's clear (50, 3) or (50, 4) so (51, 4) is reachable from above/side
  // Actually row 50 is s.top, so any block in row 50 is naturally reachable!
  // Let's centre the 3x3 at row 51, with (50, 4) open so (51, 4) touches open space
  s.rows[0][4] = null; // open space above (51, 4)
  s.rows[1][4] = D('dirt', 100); // central block

  const pwr = G.pickPower(s);
  // Swing at central block (51, 4)
  ok(G.swing(s, 51, 4, ev), 'swung successfully at (51, 4)');
  ok(s.geothermal.burstSwings === 9, `burstSwings decremented to 9: got ${s.geothermal.burstSwings}`);
  ok(has(ev, 'magmaBurst'), 'magmaBurst event emitted');

  // Verify surrounding 3x3 cells took cleave damage (3x pick power)
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const cell = A(s, 51 + dr, 4 + dc);
      if (!cell) continue; // (50, 4) was null
      ok(cell.hp === 100 - pwr * 3, `surrounding block at (${51 + dr}, ${4 + dc}) took 3x pick power cleave damage: hp = ${cell.hp}`);
    }
  }

  // Use remaining 9 swings at row 50 (s.top is always reachable)
  for (let k = 0; k < 9; k++) {
    s.rows[0][k % G.COLS] = D('dirt', 100);
    ok(G.swing(s, 50, k % G.COLS, ev), `swing ${k + 1} landed`);
  }
  ok(s.geothermal.burstSwings === 0, 'all 10 Magma Burst swings consumed');
  ok(s.geothermal.heat === 0, 'heat reset to 0 after Magma Burst finished');
  ok(has(ev, 'magmaBurstEnd'), 'magmaBurstEnd event emitted');
}

{ // 5. Great Siphon Wonder: unlocks upon completing Level 80, granting +1% passive Stars/hr
  const s = G.newState();
  ok(!hasGreatSiphon(s), 'Great Siphon is locked initially');
  ok(greatSiphonRate(s) === 0, 'passive star rate is 0 before unlocking');

  // Level 80 is ROAD[79] (the final level of Chapter 4)
  const f80 = G.ROAD[79];
  ok(f80 && f80.ch === 4, `level 80 is in Chapter 4: got ch ${f80.ch}`);
  const key80 = G.roadKey(f80);

  // Complete level 80
  s.road.stamps[key80] = { fin: 1, n: 1, best: 320 };
  s.road.reach = 350;
  ok(hasGreatSiphon(s), 'Great Siphon unlocked upon completing Level 80 (Ch 4)');

  const rate = greatSiphonRate(s);
  ok(rate > 0, `greatSiphonRate produces positive passive star rate: ${rate} stars/hr`);

  // Simulate passive accumulation over time (1 hour = 3600 seconds)
  const initialStars = s.stars || 0;
  for (let i = 0; i < 3600 / 0.05; i++) {
    G.step(s, 0.05);
  }
  const gainedStars = (s.stars || 0) - initialStars;
  ok(gainedStars >= Math.floor(rate), `awarded passive stars over 1 hour: got ${gainedStars}, expected >= ${Math.floor(rate)}`);
}

if (failed) {
  console.error(`${failed} check(s) failed in test_proto_geothermal.js`);
  process.exit(1);
}
console.log('test_proto_geothermal: ok');
