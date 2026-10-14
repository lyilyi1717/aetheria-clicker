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
  ok(a.kind === 'spend' && a.hits >= 1 && a.after < a.hits && Math.abs(a.hits / a.after - 1.5) < 0.1, 'advice carries hits now and after a step: ' + a.hits + ' -> ' + a.after);
}
{ // the Gate table is smooth: no level more than 3x its neighbour of the same kind, and ordered
  const m = G.PARAMS.sites.gateMul;
  ok(m.length === G.ROAD1.length - G.FIXED.length, 'one Gate size per road level of chapter one');
  ok(G.ROAD.every((f, i) => (i < G.FIXED.length) === (G.gateMulOf(i) === undefined)), 'every road level after the lessons has a Gate size, chapter two too');
  ok(G.ROAD2.slice(0, 16).every((f, k) => f.floor === G.ROAD1[G.FIXED.length + k].floor && !!f.prove === !!G.ROAD1[G.FIXED.length + k].prove), 'levels 21 to 36 repeat the slots of levels 5 to 20: depth and kind');
  const m2 = G.PARAMS.sites.gateMulCh2;
  ok(m2.length === G.ROAD2.length && G.ROAD2.every((f, k) => G.gateMulOf(G.CHAPTER_LEN + k) === m2[k] && m2[k] > 0), 'one Gate size per chapter-two level, 21 to 40');
  ok(m.every((v, k) => m2[k] === v), 'levels 21 to 36 keep the Gate size of their chapter-one slot');
  const h = G.PARAMS.sites.ch2Hard;
  ok(h.length === G.ROAD2.length && h.every((v, k) => v > 0 && v <= 1 && (k === 0 || v <= h[k - 1])), 'chapter two is made easier per level (ch2Hard), never harder from one level to the next (the hit falls behind the chapter-two ground)');
  for (let i = 2; i < m.length; i++) ok(m[i] / m[i - 2] < 3 && m[i - 2] / m[i] < 3, 'level ' + (i + 5) + ' is within 3x of the one before of its kind');
}
if (failed) process.exit(1); console.log('rocks ok');
