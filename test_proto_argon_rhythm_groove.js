// Unit tests for Workstream A: Kinetic Juice & Rhythmic Mastery (Layer 1 Floor)
// Issues:
//   A1 (M1): One-Thumb Rhythmic Drag-Hold Groove
//   A2 (M2): Gate Ghost Memory & 60% Banked Damage Visuals
//   A3 (M5): "Yalla!" Fever Mode
//
// Run: node test_proto_argon_rhythm_groove.js
import * as G from './digger-argon/game.js';
import { sfx, rubblePitch } from './digger-argon/ui/audio.js';
import { HAPTIC_PATTERNS, triggerHaptic, getStepIndex, isStepAccent, isFeverActive } from './digger-argon/features/picks/rules.js';
import { gateGhostX, recordGateFail, bossConsolation, retreatGate, gateSwingsLeft } from './digger-argon/features/boss/rules.js';
import { sandBurst } from './digger-argon/core/rules.js';

let failed = 0;
const ok = (cond, msg) => {
  if (!cond) {
    failed++;
    console.error('FAIL: ' + msg);
  }
};
const NO = () => {};

console.log('Testing Workstream A: Kinetic Juice & Rhythmic Mastery (Argon Layer 1)...');

// =========================================================================
// ISSUE A1 (M1): One-Thumb Rhythmic Drag-Hold Groove
// =========================================================================
console.log('\n--- Issue A1 (M1): One-Thumb Rhythmic Drag-Hold Groove ---');

// A1.1: 16-Step Sequencer step calculation and accented beat detection
{
  // 100 BPM: stepSec = 15 / 100 = 0.15s, barSec = 2.40s
  ok(getStepIndex(0.00, 100) === 0, 't = 0.00s is step 0');
  ok(getStepIndex(0.15, 100) === 1, 't = 0.15s is step 1');
  ok(getStepIndex(0.60, 100) === 4, 't = 0.60s is step 4');
  ok(getStepIndex(1.20, 100) === 8, 't = 1.20s is step 8');
  ok(getStepIndex(1.80, 100) === 12, 't = 1.80s is step 12');

  // Accented steps for 1 pick ('X.x.X.x.X.x.X.x.'): steps 0, 4, 8, 12
  ok(isStepAccent(0, 1) === true, 'Step 0 is an accent beat');
  ok(isStepAccent(4, 1) === true, 'Step 4 is an accent beat');
  ok(isStepAccent(8, 1) === true, 'Step 8 is an accent beat');
  ok(isStepAccent(12, 1) === true, 'Step 12 is an accent beat');
  ok(isStepAccent(2, 1) === false, 'Step 2 is a plain beat (not accent)');
  ok(isStepAccent(1, 1) === false, 'Step 1 is a rest (not accent)');
}

// A1.2: Accented beats ('X') trigger Good Hits with damage multiplier
{
  const undo = G.setParam('crits.chance', 0);
  G.seedRng(10);
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;

  s.rows[1] = [G.makeCell(1, 'stone')];
  s.rows[1][0].hp = 50000;
  s.rows[1][0].max = 50000;

  const basePower = G.pickPower(s);
  const events = [];
  const ev = (k, d) => events.push({ k, d });

  // Passive swing (vel = 'x'): normal 1.0x damage
  const hp0 = s.rows[1][0].hp;
  G.picksStrike(s, 1, () => [1, 0], ev, null, 'x');
  const dmgPlain = hp0 - s.rows[1][0].hp;
  ok(Math.abs(dmgPlain - basePower * G.PARAMS.picks.heft) < 1e-6,
    'Plain beat vel="x" deals standard 1.0x damage: ' + dmgPlain);
  ok(s.goodHitStreak === 0, 'Plain strike does not increment goodHitStreak');

  // Accented swing (vel = 'X'): triggers Good Hit with 2.5x multiplier
  const hp1 = s.rows[1][0].hp;
  G.picksStrike(s, 1, () => [1, 0], ev, null, 'X');
  const dmgAccent = hp1 - s.rows[1][0].hp;
  const expectedAccent = basePower * G.PARAMS.picks.heft * 2.5;
  ok(Math.abs(dmgAccent - expectedAccent) < 1e-6,
    'Accented beat vel="X" triggers Good Hit with 2.5x damage: ' + dmgAccent + ' vs ' + expectedAccent);
  ok(s.goodHitStreak === 2, 'Accented strike incremented goodHitStreak (2 heft swings)');
  const ghEvents = events.filter(e => e.k === 'goodHit');
  ok(ghEvents.length === 2, 'goodHit event emitted for accented swings');
  ok(ghEvents[0].d.mult === 2.5, 'goodHit reports mult 2.5');

  undo();
}

// A1.3: Smooth directional drag targeting without resetting beat clock
{
  const undo = G.setParam('crits.chance', 0);
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;

  s.rows[1] = [
    G.makeCell(1, 'stone'),
    G.makeCell(1, 'stone'),
    G.makeCell(1, 'stone'),
  ];
  for (let c = 0; c < 3; c++) {
    s.rows[1][c].hp = 1000;
    s.rows[1][c].max = 1000;
  }

  const seq = G.picksSeq(G.PARAMS.picks);
  let targetCol = 0;
  const aim = () => [1, targetCol];

  // Swing at col 0
  seq.advance(0.00, true, G.picksBar(s), 0.15);
  G.picksStrike(s, 1, aim, NO, null, 'x');
  ok(s.rows[1][0].hp < 1000, 'Column 0 took damage');

  // Drag thumb to col 2: sequencer advances continuously without phase reset
  targetCol = 2;
  const notes = seq.advance(0.15, true, G.picksBar(s), 0.15);
  ok(seq.on === true, 'Sequencer stayed on during multi-column drag');
  G.picksStrike(s, 1, aim, NO, null, 'x');
  ok(s.rows[1][2].hp < 1000, 'Column 2 took damage after dragging thumb');
  ok(s.rows[1][1].hp === 1000, 'Column 1 was untouched');

  undo();
}

// A1.4: Multitier haptic hierarchy
{
  ok(HAPTIC_PATTERNS.T0 === 10, 'T0 Soft Dirt haptic is 10ms tick');
  ok(HAPTIC_PATTERNS.T1 === 25, 'T1 Hard Rock/Ore haptic is 25ms impact');
  ok(Array.isArray(HAPTIC_PATTERNS.T2) && HAPTIC_PATTERNS.T2.length === 3, 'T2 Crack/Crit haptic is double pulse: ' + JSON.stringify(HAPTIC_PATTERNS.T2));
  ok(HAPTIC_PATTERNS.T3 === 350, 'T3 Gate Shatter haptic is 350ms rumble');

  // Mock navigator.vibrate safely
  let lastVibrate = null;
  const hasNav = typeof globalThis.navigator !== 'undefined';
  const navObj = hasNav ? globalThis.navigator : {};
  if (!hasNav) globalThis.navigator = navObj;
  const origVibrate = Object.getOwnPropertyDescriptor(navObj, 'vibrate');
  Object.defineProperty(navObj, 'vibrate', {
    value: (pattern) => { lastVibrate = pattern; return true; },
    configurable: true,
    writable: true,
  });

  triggerHaptic('T0');
  ok(lastVibrate === 10, 'triggerHaptic(T0) vibrates 10ms');
  triggerHaptic('T1');
  ok(lastVibrate === 25, 'triggerHaptic(T1) vibrates 25ms');
  triggerHaptic('T2');
  ok(Array.isArray(lastVibrate) && lastVibrate.length === 3, 'triggerHaptic(T2) triggers double pulse');
  triggerHaptic('T3');
  ok(lastVibrate === 350, 'triggerHaptic(T3) vibrates 350ms');

  if (origVibrate) Object.defineProperty(navObj, 'vibrate', origVibrate);
  else delete navObj.vibrate;
}

// =========================================================================
// ISSUE A2 (M2): Gate Ghost Memory & 60% Banked Damage Visuals
// =========================================================================
console.log('\n--- Issue A2 (M2): Gate Ghost Memory & 60% Banked Damage Visuals ---');

function setupGate(idx = G.FIXED.length, bank = 0, tries = 1, gateBestPct = 0) {
  G.seedRng(7);
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

// A2.1: Retreating from Gate at 50% damage banks exactly 30% HP (60% of 50%)
{
  const s = setupGate();
  const b = G.bossInView(s);
  ok(b && b.gate === 1, 'Gate boss is initialized');
  ok(G.PARAMS.boss.gateShare === 0.6, 'gateShare is 0.6 (60%)');

  // Deal 50% damage
  G.damage(s, b.row, (b.weak + 1) % G.COLS, b.max * 0.50, 'you', NO);
  const stamp = s.road.stamps[s.run.key];
  ok(Math.abs(stamp.bank - 0.30) < 1e-4, '50% damage banks exactly 30% HP (60% of 50%): ' + stamp.bank);

  // Retreat from Gate: record best pct and verify banked damage
  const res = retreatGate(s);
  ok(res.bankedShare === 0.6, 'retreatGate reports 60% banked share');
  ok(Math.abs(res.bank - 0.30) < 1e-4, 'retreatGate confirms 30% banked HP');
  ok(stamp.gateBestPct === 50, 'stamp recorded gateBestPct = 50%');

  // Next entry at the same Gate: spawns pre-fractured at 70% HP (100% - 30%)
  const s2 = setupGate(G.FIXED.length, stamp.bank, 2, stamp.gateBestPct);
  const b2 = G.bossInView(s2);
  ok(Math.abs(b2.hp / b2.max - 0.70) < 0.01, 'Gate spawns pre-fractured with remaining 70% HP: ' + (b2.hp / b2.max));
  ok(s2.run.gateBestPct === 50, 's2.run.gateBestPct preserved personal best 50%');

  // Ghost Tick marker math
  const barWidth = 300;
  ok(gateGhostX(barWidth, s2.run.gateBestPct) === 150, 'Ghost Tick line position at 50% of 300px is 150px');

  // gateSwingsLeft accurately considers banked damage
  const fullEst = gateSwingsLeft(b.max, 0, null, 10);
  const bankedEst = gateSwingsLeft(b.max, 0.30, null, 10);
  ok(bankedEst.raw < fullEst.raw, 'gateSwingsLeft reflects reduced swings needed due to banked damage');
  ok(Math.abs(bankedEst.raw / fullEst.raw - 0.70) < 0.02, 'swings left scaled proportionally to remaining 70% HP');
}

// A2.2: Stepped rubble shedding pitch scaling monotonically every 10%
{
  ok(Math.abs(rubblePitch(1) - 1.08) < 1e-4, 'Tier 1 rubble pitch is 1.08 (10% tier)');
  ok(Math.abs(rubblePitch(9) - 1.72) < 1e-4, 'Tier 9 rubble pitch is 1.72 (90% tier)');
  for (let tier = 2; tier <= 9; tier++) {
    const prev = rubblePitch(tier - 1);
    const curr = rubblePitch(tier);
    ok(curr > prev, `Rubble pitch increases monotonically: tier ${tier} (${curr.toFixed(3)}) > tier ${tier - 1} (${prev.toFixed(3)})`);
  }
}

// A2.3: Hakawati consolation lore dialogue on repeated retreats (tries >= 2)
{
  // Try 1: no consolation yet
  const s1 = setupGate(G.FIXED.length, 0, 1);
  const b1 = G.bossInView(s1);
  G.damage(s1, b1.row, 0, b1.max * 0.2, 'you', NO);
  ok(bossConsolation(s1) === null, 'No consolation dialogue on try 1');

  // Try 2 (second retreat): consolation dialogue triggers
  const s2 = setupGate(G.FIXED.length, 0.12, 2);
  const b2 = G.bossInView(s2);
  const events2 = [];
  recordGateFail(s2, (k, d) => events2.push({ k, d }));
  const cons = bossConsolation(s2);
  ok(typeof cons === 'string' && cons.length > 0, 'Consolation dialogue returned on 2nd retreat');
  ok(cons.includes('Grandpa failed that very basalt gate twice'), 'Consolation text contains Grandpa lore quote');
  ok(cons.includes('mountain is not running away'), 'Consolation text contains tea & mountain proverb');

  const consEv = events2.find(e => e.k === 'gateConsolation');
  ok(consEv !== undefined, 'gateConsolation event emitted');
  ok(consEv.d.tries === 2, 'gateConsolation event reports 2 tries');
}

// =========================================================================
// ISSUE A3 (M5): "Yalla!" Fever Mode
// =========================================================================
console.log('\n--- Issue A3 (M5): "Yalla!" Fever Mode ---');

// A3.1: 20 consecutive on-beat Good Hits fills Fever Gauge and ignites Fever
{
  const undo = G.setParam('crits.chance', 0);
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;

  s.rows[1] = [G.makeCell(1, 'stone')];
  s.rows[1][0].hp = 500000;
  s.rows[1][0].max = 500000;

  // Set fever goal to 20 for Issue A3
  s.feverGoal = 20;
  s.feverDuration = 8.0;

  const events = [];
  const ev = (k, d) => events.push({ k, d });

  // 19 Good Hits: streak accumulates, fever not active
  for (let i = 1; i <= 19; i++) {
    G.goodHit(s, 1, 0, ev);
    ok(s.fever.streak === i, `Streak is ${i}`);
    ok(s.picks.feverStreak === i, `s.picks.feverStreak in sync: ${i}`);
    ok(isFeverActive(s) === false, 'Fever not yet ignited at 19');
  }

  // 20th Good Hit ignites Fever
  G.goodHit(s, 1, 0, ev);
  ok(isFeverActive(s) === true, '20th Good Hit cleanly ignites Fever mode ("Yalla!")');
  ok(s.fever.active === true, 's.fever.active is true');
  ok(s.picks.feverActive === true, 's.picks.feverActive is true');
  ok(s.fever.timer === 8.0, 'Fever timer initialized to exactly 8.0s');
  ok(s.fever.streak === 0, 'Fever streak resets to 0');

  const startEv = events.find(e => e.k === 'feverStart');
  ok(startEv !== undefined, 'feverStart event emitted');
  ok(startEv.d.duration === 8.0, 'feverStart reports 8.0s duration');

  undo();
}

// A3.2: 2.0x pick swing speed and 100% crit chance lock during Fever
{
  const s = G.newState();
  s.up = { tempo: 0 }; // 100 BPM base tempo
  ok(G.picksBpm(s) === 100, 'Base tempo is 100 BPM');
  const baseStep = G.picksStep(s);

  // Trigger Fever
  G.triggerFever(s, NO, 8.0);
  ok(isFeverActive(s) === true, 'Fever is active');

  // Tempo doubles: 100 BPM -> 200 BPM
  ok(G.picksBpm(s) === 200, 'Pick tempo multiplied by 2.0x during Fever: ' + G.picksBpm(s));
  ok(Math.abs(G.picksStep(s) - baseStep / 2) < 1e-6, 'Step duration halved during Fever (2.0x swing rate)');

  // Crit chance locked at 100%
  const critCh = G.critChance(s);
  ok(critCh === 1.0, 'Critical hit chance is locked at 100% during Fever: ' + critCh);
}

// A3.3: Overkill Sand-Burst: residual shockwaves deal 50% damage to all 4 orthogonal neighbors
{
  const undo = G.setParam('crits.chance', 0);
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];

  // Center at (2, 2). Orthogonal neighbors: (1, 2), (3, 2), (2, 1), (2, 3)
  for (let r = 0; r < 5; r++) {
    s.rows[r] = [];
    for (let c = 0; c < G.COLS; c++) {
      s.rows[r][c] = G.makeCell(r, 'dirt');
      s.rows[r][c].hp = 50;
      s.rows[r][c].max = 50;
    }
  }

  // Target cell at (2, 2) with 20 HP
  s.rows[2][2].hp = 20;
  s.rows[2][2].max = 20;

  // Direct test of sandBurst with 100 residual damage
  const burstEvs = [];
  const ev = (k, d) => burstEvs.push({ k, d });
  const hitCells = sandBurst(s, 2, 2, 100, ev);

  ok(hitCells.length === 4, 'sandBurst targeted all 4 adjacent orthogonal cells');
  ok(hitCells.every(hc => hc.dmg === 50), 'Each neighbor received exactly 50% residual damage (50 HP)');

  // All 4 neighbors had 50 HP, so 50 damage vaporizes them
  ok(s.rows[1][2] === null, 'Top neighbor (1, 2) was vaporized');
  ok(s.rows[3][2] === null, 'Bottom neighbor (3, 2) was vaporized');
  ok(s.rows[2][1] === null, 'Left neighbor (2, 1) was vaporized');
  ok(s.rows[2][3] === null, 'Right neighbor (2, 3) was vaporized');

  const sbEv = burstEvs.find(e => e.k === 'sandBurst');
  ok(sbEv !== undefined, 'sandBurst event emitted');
  ok(sbEv.d.dmg === 50, 'sandBurst event reports 50 damage');

  undo();
}

// A3.4: Overkill Sand-Burst triggers automatically during Fever on swing overkill
{
  const undo = G.setParam('crits.chance', 0);
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;

  // Row 1
  s.rows[1] = [];
  for (let c = 0; c < G.COLS; c++) {
    s.rows[1][c] = G.makeCell(1, 'dirt');
    s.rows[1][c].hp = 30;
    s.rows[1][c].max = 30;
  }
  // Row 2
  s.rows[2] = [];
  for (let c = 0; c < G.COLS; c++) {
    s.rows[2][c] = G.makeCell(2, 'dirt');
    s.rows[2][c].hp = 30;
    s.rows[2][c].max = 30;
  }

  // Activate Fever
  G.triggerFever(s, NO, 8.0);
  ok(isFeverActive(s) === true, 'Fever active');

  // Cell (1, 1) has 1 HP. Pick power during fever deals 1.5x damage = overkill
  s.rows[1][1].hp = 1;
  s.rows[1][1].max = 1;

  const events = [];
  const ev = (k, d) => events.push({ k, d });

  G.swing(s, 1, 1, ev);
  ok(s.rows[1][1] === null, 'Target block broke');
  const sbEvent = events.find(e => e.k === 'sandBurst');
  ok(sbEvent !== undefined, 'Overkill swing during Fever triggered sandBurst automatically');

  undo();
}

// A3.5: Clean Fever expiration after duration
{
  const s = G.newState();
  G.triggerFever(s, NO, 8.0);
  ok(isFeverActive(s) === true, 'Fever started at 8.0s');

  s.digging = true;
  // Step 4.0s
  G.step(s, 4.0);
  ok(Math.abs(s.fever.timer - 4.0) < 1e-4, 'Fever timer at 4.0s');
  ok(isFeverActive(s) === true, 'Fever still active');

  // Step 4.0s more
  const events = [];
  G.step(s, 4.0, (k, d) => events.push({ k, d }));
  ok(isFeverActive(s) === false, 'Fever ended cleanly');
  ok(s.fever.active === false, 's.fever.active is false');
  ok(s.fever.timer === 0, 's.fever.timer clamped to 0');
  ok(events.some(e => e.k === 'feverEnd'), 'feverEnd event emitted upon expiration');
}

// A3.6: Audio SFX checks for Darbuka Roll and Yalla Cheer
{
  ok(typeof sfx.darbukaRoll === 'function', 'sfx.darbukaRoll is defined');
  ok(typeof sfx.yallaCheer === 'function', 'sfx.yallaCheer is defined');
}

if (failed) {
  console.error('\n' + failed + ' test(s) failed.');
  process.exit(1);
}
console.log('\ntest_proto_argon_rhythm_groove: ok (all tests passed cleanly)');
