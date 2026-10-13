// Dig: the Rock bar counts swings of the whole team. Run: node test_proto_swings.js
import * as G from './proto/game.js';
import { swingEstimate, crewWorking, swingMeasure, friendly, friendlyTime, swingsLeft } from './proto/features/boss/swings.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

ok(swingEstimate(10, 0.6, 0) === 10, 'no Rafeeqs: the estimate is your hit');
ok(Math.abs(swingEstimate(10, 0.6, 5) - 40) < 1e-9, 'five hitting Rafeeqs: 10 x (1 + 3)');
ok(crewWorking(4, 2) === 2 && crewWorking(1, 2) === 1 && crewWorking(0, 2) === 0, 'every second Rafeeq sieves');

const log = (n, dmg, dt) => Array.from({ length: n }, (_, i) => ({ t: i * dt, d: i * dmg }));
ok(swingMeasure(log(4, 5, 0.25)) === null, 'too few swings: not measured');
const m = swingMeasure(log(12, 50, 0.25));
ok(Math.abs(m.dmg - 50) < 1e-9 && Math.abs(m.rate - 4) < 1e-9, 'rolling average: 50 a swing, 4 swings a second');
ok(swingMeasure([{ t: 1, d: 5 }, { t: 1, d: 5 }, { t: 1, d: 5 }, { t: 1, d: 5 }, { t: 1, d: 5 }]) === null, 'no damage, no time: not measured');

ok(friendly(0) === 0 && friendly(0.2) === 1, 'nothing stays nothing, a sliver is one swing');
ok(friendly(1) === 1 && friendly(7.4) === 7 && friendly(19.6) === 20, 'small numbers stay exact');
ok(friendly(43) === 45 && friendly(97) === 95, 'to 100: steps of 5');
ok(friendly(342) === 340 && friendly(1234) === 1200 && friendly(98765) === 99000, 'above: two figures');
ok(friendlyTime(3.2).n === 3 && friendlyTime(27).n === 25 && friendlyTime(27).unit === 's', 'seconds');
ok(friendlyTime(150).unit === 'min' && friendlyTime(150).n === 3, 'minutes');
ok(friendlyTime(7200).unit === 'h', 'hours');

{ const r = swingsLeft(2000, log(12, 50, 0.25), 10);
  ok(r.measured && r.n === 40 && r.time.n === 10 && r.time.unit === 's', 'measured: 2000 left / 50 = 40 swings, 10 s'); }
{ const r = swingsLeft(2000, [], 20);
  ok(!r.measured && r.n === 100 && r.time.n === 35, 'estimated: 100 swings at 3 a second'); }

{ // in the game: swings are logged, only your own direct ones, and the number is small
  const s = G.newState();
  for (let n = 0; n < G.LAYER - 3; n++) { for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null; G.step(s, 0.01); }
  for (let n = 0; n < 200; n++) { for (let i = 0; i < s.rows.length; i++) if (!G.isBossRow(s.top + i)) for (let c = 0; c < G.COLS; c++) s.rows[i][c] = null; G.step(s, 0.01); }
  const b = G.bossInView(s), i = s.rows.findIndex(r => r.some(x => x && x.t === 'boss'));
  ok(!!b && i >= 0, 'a Rock is in view');
  const est = G.bossSwings(s, b);
  ok(!est.measured && est.n >= 1, 'no swings yet: an estimate');
  for (let k = 0; k < 8; k++) { G.swing(s, s.top + i, 2); G.step(s, 0.3); }
  ok(b.sw && b.sw.length === 8, 'eight swings are in the window');
  ok(G.bossSwings(s, b).measured, 'now it is measured');
  G.step(s, 5);
  ok(b.sw.length === 0, 'stop swinging and the window is dropped');
  const a = G.bossAdvice(s);
  ok(a.hits >= a.after && a.after >= 1, 'advice counts swings, and a Pick step needs fewer');
  const s2 = JSON.parse(JSON.stringify(s)); delete s2.boss.sw;
  ok(G.bossSwings(s2, s2.boss).n >= 1, 'an old save without a window still reads');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('test_proto_swings: ok');
