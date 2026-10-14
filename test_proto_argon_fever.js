// Test for Issue ARGON-09: Fever Mode ("Yalla!")
// Run: node test_proto_fever.js
import * as G from './digger-argon/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

console.log('Testing ARGON-09: Fever Mode ("Yalla!")...');

// 1. Initial State
{
  const s = G.newState();
  ok(s.fever !== undefined, 's.fever is initialized');
  ok(s.fever.streak === 0, 'Initial fever streak is 0');
  ok(s.fever.active === false, 'Fever is initially inactive');
  ok(s.fever.timer === 0, 'Initial fever timer is 0');
}

// 2. 8 Consecutive Good Hits ignite Fever mode
{
  const undo = G.setParam('crits.chance', 0);
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;

  s.rows[1] = [G.makeCell(1, 'stone')];
  s.rows[1][0].hp = 100000;
  s.rows[1][0].max = 100000;

  const events = [];
  const ev = (k, d) => events.push({ k, d });

  // 7 Good Hits
  for (let i = 1; i <= 7; i++) {
    G.goodHit(s, 1, 0, ev);
    ok(s.fever.streak === i, `Streak is ${i} after ${i} good hits`);
    ok(s.fever.active === false, `Fever not yet active at streak ${i}`);
  }

  // 8th Good Hit triggers Fever
  G.goodHit(s, 1, 0, ev);
  ok(s.fever.active === true, '8th Good Hit cleanly ignites Fever mode');
  ok(s.fever.timer === 20, 'Fever timer initialized to exactly 20 seconds');
  ok(s.fever.streak === 0, 'Fever streak resets to 0 when ignited');

  const startEv = events.find(e => e.k === 'feverStart');
  ok(startEv !== undefined, 'feverStart event emitted');
  undo();
}

// 3. Multipliers during Fever (damage 1.5x, coins 2.0x, combo locked at max, crew rate quadrupled)
{
  const undo = G.setParam('crits.chance', 0);
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;

  s.rows[1] = [G.makeCell(1, 'stone')];
  s.rows[1][0].hp = 100000;
  s.rows[1][0].max = 100000;

  // Manually trigger fever for 20s
  G.triggerFever(s);
  ok(s.fever.active === true, 'Fever is active');

  // Normal pick damage is multiplied by 1.5 during Fever
  const basePower = G.pickPower(s);
  const hpBefore = s.rows[1][0].hp;
  G.swing(s, 1, 0);
  const dmg = hpBefore - s.rows[1][0].hp;
  ok(Math.abs(dmg - basePower * 1.5) < 1e-6, 'Player damage is multiplied by 1.5x during Fever: ' + dmg);

  // Coin drops double (2x)
  ok(G.coinMult(s) === 2.0, 'coinMult is 2.0x during Fever');

  // Combo multiplier locked at max
  const comboCap = G.PARAMS.combo.cap;
  const comboStep = G.PARAMS.combo.step;
  const maxComboMult = 1 + comboCap * comboStep;
  ok(Math.abs(G.comboMult(s) - maxComboMult) < 1e-6, 'comboMult locked at max during Fever: ' + G.comboMult(s));

  // Rafeeq strike frequency quadrupled (crewRate 4 -> 16 hits/sec)
  ok(G.crewRate(s) === 16, 'Rafeeq strike rate quadrupled from 4 to 16 hits/sec during Fever: ' + G.crewRate(s));
  undo();
}

// 4. Fever timer countdown only during active digging
{
  const s = G.newState();
  G.triggerFever(s, () => {}, 20);
  ok(s.fever.timer === 20, 'Fever starts at 20s');

  // Idle / not digging: timer does NOT count down
  s.digging = false;
  s._lastSwingT = -100;
  G.step(s, 5.0);
  ok(s.fever.timer === 20, 'Fever timer does not count down while player is idle: ' + s.fever.timer);

  // Active digging: timer counts down
  s.digging = true;
  G.step(s, 5.0);
  ok(Math.abs(s.fever.timer - 15.0) < 1e-6, 'Fever timer counts down by 5s during active digging: ' + s.fever.timer);

  // Another 15s of active digging: Fever expires cleanly
  const events = [];
  const ev = (k, d) => events.push({ k, d });
  G.step(s, 15.0, ev);

  ok(s.fever.active === false, 'Fever ends cleanly when timer reaches 0');
  ok(s.fever.timer === 0, 'Fever timer clamped to 0');
  ok(events.some(e => e.k === 'feverEnd'), 'feverEnd event emitted upon expiration');
}

// 5. Missed beat while building streak resets streak without penalizing HP
{
  const undo = G.setParam('crits.chance', 0);
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;

  s.rows[1] = [G.makeCell(1, 'stone')];
  s.rows[1][0].hp = 1000;
  s.rows[1][0].max = 1000;

  // Build streak to 5
  for (let i = 0; i < 5; i++) G.goodHit(s, 1, 0);
  ok(s.fever.streak === 5, 'Streak reached 5');

  // Off-beat rhythmic swing at t = 0.30s (step 2 plain x)
  G.rhythmicSwing(s, 1, 0, 0.30);
  ok(s.fever.streak === 0, 'Missed beat resets fever streak to 0');
  ok(s.goodHitStreak === 0, 'Missed beat resets goodHitStreak to 0');
  ok(s.fever.active === false, 'Fever was not triggered');
  undo();
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('test_proto_fever: ok');
