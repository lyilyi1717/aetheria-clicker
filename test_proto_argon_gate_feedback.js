// Test for Issue ARGON-04: Gate Ghost Tick Marker & Pitch-Scaled Rubble Chimes
// Run: node test_proto_gate_feedback.js
import * as G from './digger-argon/game.js';
import { rubblePitch } from './digger-argon/ui/audio.js';
import { gateGhostX, recordGateFail } from './digger-argon/features/boss/rules.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const NO = () => {};

// 1. Rubble pitch scaling monotonically from 10% (tier 1) to 90% (tier 9)
{
  ok(Math.abs(rubblePitch(1) - 1.08) < 1e-6, 'Tier 1 rubble pitch is 1.08 (10% bracket): ' + rubblePitch(1));
  ok(Math.abs(rubblePitch(9) - 1.72) < 1e-6, 'Tier 9 rubble pitch is 1.72 (90% bracket): ' + rubblePitch(9));

  for (let tier = 2; tier <= 9; tier++) {
    const prev = rubblePitch(tier - 1);
    const curr = rubblePitch(tier);
    ok(curr > prev, `Rubble pitch scales monotonically: tier ${tier} (${curr.toFixed(3)}) > tier ${tier - 1} (${prev.toFixed(3)})`);
  }
}

// 2. Ghost tick math helper
{
  ok(gateGhostX(100, 45) === 45, 'gateGhostX at width 100 is 45');
  ok(gateGhostX(300, 45) === 135, 'gateGhostX at width 300 is 135 (exactly 45%)');
  ok(gateGhostX(400, 74) === 296, 'gateGhostX at width 400 is 296 (exactly 74%)');
}

// Helper to set up Gate encounter at road level
function atGate(idx = G.FIXED.length, bank = 0, tries = 1, gateBestPct = 0) {
  G.seedRng(5);
  const s = G.newState();
  for (const f of G.ROAD.slice(0, G.FIXED.length)) {
    s.road.stamps[G.roadKey(f)] = { site: f.site, floor: f.floor, ch: f.ch, twist: '', fin: 1, fast: 0, hard: 0, best: 90, n: 1 };
  }
  const lv = G.ROAD[idx];
  s.site = lv.site;
  s.top = lv.floor - 5;
  s.best = lv.floor - 4;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = G.genRow(s, s.top + i);
  for (let i = 0; i < 5; i++) s.rows[i] = s.rows[i].map(() => null);
  s.run = null;
  const r = G.siteRun(s);
  r.floor = lv.floor;
  r.key = G.siteKey(s.site, lv.floor, '');
  r.par = G.sitePar(lv.floor, '');
  s.road.stamps[r.key] = { site: s.site, floor: lv.floor, twist: '', fin: 0, fast: 0, hard: 0, best: 0, n: tries, bank, gateBestPct };
  return s;
}

// 3. Gate encounter: failing at 45% records gateBestPct = 45, restored on subsequent attempt
{
  const s = atGate();
  const b = G.bossInView(s);
  ok(b && b.gate === 1, 'Gate boss is in view');

  // Deal 45% damage
  G.damage(s, b.row, (b.weak + 1) % G.COLS, b.max * 0.45, 'you', NO);
  ok(s.run.gateBestPct === 45, 'Failing/damaging Gate at 45% sets s.run.gateBestPct = 45 (actual: ' + s.run.gateBestPct + ')');

  // Record failure/exit
  recordGateFail(s);
  const stamp = s.road.stamps[s.run.key];
  ok(stamp.gateBestPct === 45, 'Stamp recorded gateBestPct = 45 across attempts');

  // Subsequent attempt at the same Gate level
  const s2 = atGate(G.FIXED.length, stamp.bank, 2, stamp.gateBestPct);
  const b2 = G.bossInView(s2);
  ok(b2 && b2.gate === 1, 'Second attempt at Gate');
  ok(s2.run.gateBestPct === 45, 'On subsequent attempt, s.run.gateBestPct displays ghost line at exactly 45%');
  ok(b2.gateBestPct === 45, 'On subsequent attempt, boss object keeps gateBestPct = 45');

  // Verify ghost line position matches exactly 45%
  const barWidth = 280;
  ok(gateGhostX(barWidth, s2.run.gateBestPct) === 126, 'Ghost line position at 45% of 280px is exactly 126px');
}

// 4. Multiple attempts update to higher record, never regress
{
  const s = atGate();
  const b = G.bossInView(s);

  // First try: 30%
  G.damage(s, b.row, (b.weak + 1) % G.COLS, b.max * 0.30, 'you', NO);
  ok(s.run.gateBestPct === 30, 'Run 1 recorded 30%');
  recordGateFail(s);

  // Second try: damage down to 26% HP (74% damage done)
  const s2 = atGate(G.FIXED.length, s.road.stamps[s.run.key].bank, 2, s.road.stamps[s.run.key].gateBestPct);
  const b2 = G.bossInView(s2);
  const dmgTo74 = b2.hp - Math.round(b2.max * 0.26);
  G.damage(s2, b2.row, (b2.weak + 1) % G.COLS, dmgTo74, 'you', NO);
  ok(s2.run.gateBestPct === 74, 'Run 2 improved to 74% (actual: ' + s2.run.gateBestPct + ')');
  recordGateFail(s2);
  ok(s2.road.stamps[s2.run.key].gateBestPct === 74, 'Stamp updated to best 74%');

  // Third try: starts with 74%, only small damage dealt, best remains 74%
  const s3 = atGate(G.FIXED.length, s2.road.stamps[s2.run.key].bank, 3, s2.road.stamps[s2.run.key].gateBestPct);
  const b3 = G.bossInView(s3);
  ok(s3.run.gateBestPct === 74, 'Run 3 starts with best 74%');
  G.damage(s3, b3.row, (b3.weak + 1) % G.COLS, 10, 'you', NO);
  ok(s3.run.gateBestPct === 74, 'Weaker run does not downgrade gateBestPct');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('test_proto_gate_feedback: ok');
