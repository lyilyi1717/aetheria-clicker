// Dig: TNT hurts Big Rocks (a visible share of the bar, capped), and the stuck hint names a number. Run: node test_proto_rocks.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const P = G.PARAMS.boss;

function atRock() {
  G.seedRng(3);
  const s = G.newState();
  s.top = 20; s.best = 21;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = G.genRow(s, s.top + i);
  for (let i = 0; i < 5; i++) s.rows[i] = s.rows[i].map(() => null);
  return s;
}
const boom = (s, r, c, ev = () => {}) => { s.rows[r - s.top][c] = { t: 'tnt', hp: 1, max: 1, s: 0 }; G.damage(s, r, c, 1e9, 'you', ev); for (let i = 0; i < 20; i++) G.step(s, 0.05, ev); };

{ // a barrel next to the Rock takes a visible share, and says so
  const s = atRock(), b = G.bossInView(s); const hits = [];
  boom(s, 24, 5, (k, d) => { if (k === 'hit' && d.t === 'boss') hits.push(d); });
  ok(hits.length === 1 && hits[0].blast && Math.abs(hits[0].share - P.blastShare) < 1e-9, 'one blast hit on the Rock of ' + P.blastShare + ' of the bar');
  ok(Math.abs(1 - b.hp / b.max - P.blastShare) < 1e-6, 'the bar lost that share');
}
{ // one row of air between the barrel and the Rock: still felt (the Rock is big)
  const s = atRock(), b = G.bossInView(s); boom(s, 23, 5);
  ok(b.hp < b.max, 'a barrel two rows up still shakes the Rock');
}
{ // far away: nothing
  const s = atRock(), b = G.bossInView(s); boom(s, 21, 5);
  ok(b.hp === b.max, 'a barrel far above does nothing to the Rock');
}
{ // a cap: TNT alone never breaks a Rock
  const s = atRock(), b = G.bossInView(s);
  for (let i = 0; i < 60; i++) boom(s, 24, i % G.COLS);
  ok(b.hp > 0 && Math.abs(1 - b.hp / b.max - P.blastCap) < 1e-6, 'sixty blasts take only ' + P.blastCap + ' of the bar');
}
{ // the hint: one step with numbers
  const s = atRock(), b = G.bossInView(s);
  s.stars = 100; s.starSpent = 1;
  const a = G.bossAdvice(s);
  ok(a.kind === 'spend' && a.hits >= 1 && a.after < a.hits && Math.abs(a.hits / a.after - 1.5) < 0.01, 'advice carries hits now and after a step: ' + a.hits + ' -> ' + a.after);
}
{ // the Gate table is smooth: no level more than 3x its neighbour of the same kind, and ordered
  const m = G.PARAMS.sites.gateMul;
  ok(m.length === G.ROAD.length - G.FIXED.length, 'one Gate size per road level');
  for (let i = 2; i < m.length; i++) ok(m[i] / m[i - 2] < 3 && m[i - 2] / m[i] < 3, 'level ' + (i + 5) + ' is within 3x of the one before of its kind');
}
if (failed) process.exit(1); console.log('rocks ok');
