// Dig: the Big Rock stays at the foot of the stage while it stands (a view rule), and its bar is drawn on it.
// Run: node test_proto_rockbar.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const clearRow = (s, i) => { for (let c = 0; c < G.COLS; c++) s.rows[i][c] = null; };
const bossIdx = s => { for (let i = 0; i < s.rows.length; i++) if (G.isBossRow(s.top + i) && s.rows[i].some(x => x)) return i; return -1; };
const HOLD = G.VIEW_ROWS - 3;

{ // the view follows the dig until the Rock is in the bottom rows, then stops
  const s = G.newState();
  for (let n = 0; n < 200; n++) {
    for (let i = 0; i < s.rows.length; i++) if (!G.isBossRow(s.top + i)) clearRow(s, i);   // the whole dig above is open
    G.step(s, 0.01);
  }
  const b = bossIdx(s);
  ok(b === HOLD, 'the Rock settles in the third row from the bottom (index ' + b + ')');
  ok(G.VIEW_ROWS - 1 - b >= 2, 'two rows under the Rock stay clear for the tool buttons and the hint');
  const top = s.top;
  for (let n = 0; n < 50; n++) G.step(s, 0.05);
  ok(s.top === top, 'the view does not move while the Rock stands');
  ok(s.rows[HOLD - 1].every(x => x === null) && G.reachable(s, s.top + HOLD, 3), 'the Rock can still be hit from the open row above it');
  // the same hits, the same pay: the Rock is hit and breaks as before
  const boss = G.bossInView(s), hp0 = boss.hp;
  G.swing(s, s.top + HOLD, 3);
  ok(boss.hp < hp0, 'a swing at the Rock hurts it');
  s.up.pick = 80;
  let guard = 0;
  while (boss.hp > 0 && guard++ < 2000) G.swing(s, s.top + HOLD, 0);
  ok(boss.hp <= 0, 'the Rock breaks');
  for (let n = 0; n < 30; n++) G.step(s, 0.05);
  ok(s.top > top, 'the view follows the dig again once the Rock is gone');
}
{ // the Rock hold does not change time away: the crew still stops at the Rock
  const s = G.newState();
  s.coins = 1e9; s.total = 1e9; G.buy(s, 'crew'); for (let i = 0; i < 30; i++) G.buy(s, 'pick');
  const out = G.settleAway(s, 8 * 3600);
  ok(out.atBoss && s.top === G.LAYER, 'the crew stops at the Big Rock');
}
{ // the Rock is not held while it is far below, nor when no Rock is near
  const s = G.newState();
  clearRow(s, 0); G.step(s, 0.01);
  ok(s.top >= 1, 'ordinary digging still scrolls');
}
if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('rockbar: ok');
