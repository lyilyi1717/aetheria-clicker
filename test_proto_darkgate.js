// Dig: the Rock's law is told (dark Gate, growing Rock, hot Rock), the hint checks the cure first, the sim bot breaks the lantern;
// and a session is a visit (N1, N2). Run: node test_proto_darkgate.js
import assert from 'node:assert/strict';
import * as G from './proto/game.js';
import { mkCtx, pickTarget } from './sim/proto/player.mjs';

const D = (t, hp = 1) => ({ t, hp, max: hp, s: 0 });
function field(top, best) {
  G.seedRng(1);
  const s = G.newState();
  s.top = top; s.best = best; s.rows = [];
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows.push(Array.from({ length: G.COLS }, () => D('dirt')));
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;
  s.queue = []; s.pools = {};
  return s;
}
// a Rock at row `row`, `top` = row - 1, with the layer above it in force
function rockAt(row, cure) {
  const s = field(row - 1, row);
  s.rows[1] = s.rows[1].map(() => ({ t: 'boss', hp: 1, max: 1, s: 0 }));
  s.boss = { row, hp: 1000, max: 1000, weak: 0, wt: 9, you: 1, crew: 0, rub: 0 };
  if (cure) s.rows[0][3] = D(cure);
  return s;
}

{ // the Black: dark, lantern known; lit once a light is on
  const s = rockAt(125, 'lantern');
  const t = G.bossTell(s);
  assert.equal(t.kind, 'dark'); assert.equal(t.pct, 40); assert.deepEqual([t.r, t.c], [124, 3]);
  s.deep.glows.push({ r: 124, c: 1, rad: 3, until: s.deep.bc + 50 });
  assert.equal(G.bossTell(s).kind, 'lit', 'with a light: lit, full hits');
}
{ // no lantern left: still told, no place to point at
  const s = rockAt(125, null);
  const t = G.bossTell(s);
  assert.equal(t.kind, 'dark'); assert.equal(t.r, undefined);
}
{ // a broken Rock, or none, tells nothing
  const s = rockAt(125, 'lantern'); s.boss.hp = 0;
  assert.equal(G.bossTell(s), null);
  assert.equal(G.bossTell(G.newState()), null);
}
{ // the stuck hint picks the light before money, even with Stars for the Pick
  const s = rockAt(125, 'lantern');
  s.stars = 1e9;
  const a = G.bossAdvice(s);
  assert.equal(a.kind, 'dark'); assert.deepEqual(a.cure, [124, 3]);
  s.deep.glows.push({ r: 124, c: 1, rad: 3, until: s.deep.bc + 50 });
  assert.equal(G.bossAdvice(s).kind, 'spend', 'lit: the money advice comes back');
  const s2 = rockAt(125, null); s2.stars = 1e9;
  assert.equal(G.bossAdvice(s2).kind, 'spend', 'dark with no lantern to point at: the old advice');
}
{ // the Living Rock: torch crate above; a torch near stops the tell
  const s = rockAt(150, 'torch_crate');
  const t = G.bossTell(s); assert.equal(t.kind, 'grow'); assert.deepEqual([t.r, t.c], [149, 3]);
  s.deep.torches.push({ r: 148, c: 3 });
  assert.equal(G.bossTell(s), null);
}
{ // the Hot Rock: water above; the Angry Rock changes no hit, so says nothing
  const s = rockAt(200, 'water');
  const t = G.bossTell(s); assert.equal(t.kind, 'hot'); assert.equal(t.pct, 60);
  assert.equal(G.bossAdvice(s).kind, 'hot');
  assert.equal(G.bossTell(rockAt(175, 'x')), null, 'the Angry Rock changes no hit, so tells nothing');
}
{ // every tell string exists
  for (const k of ['rock_tell_dark', 'rock_tell_dark_nolamp', 'rock_tell_lit', 'rock_tell_grow', 'rock_tell_grow_notorch', 'rock_tell_hot', 'rock_tell_hot_nowater', 'stuck_dark', 'stuck_grow', 'stuck_hot'])
    assert.notEqual(G.t(k, { n: 40 }), k, k + ' has words');
}
{ // the sim bot breaks the lantern first when it fights a dark Gate; not when it is lit
  const s = rockAt(125, 'lantern');
  const ctx = mkCtx('mid'); ctx.col = 5;
  assert.deepEqual(pickTarget(s, ctx), [124, 3], 'the bot goes for the lantern');
  s.deep.glows.push({ r: 124, c: 1, rad: 3, until: s.deep.bc + 50 });
  const c2 = mkCtx('mid'); c2.p.notice = 0; c2.col = 5;
  assert.notDeepEqual(pickTarget(s, c2), [124, 3], 'lit: it just digs');
}

// ---- N2: a session is a visit ----
{
  const T = 1e6, S = 1000, p = G.VISIT;
  assert.equal(p.gapS, 300);
  let v = G.visitNew(T);
  v = G.visitAtt(v, 40);
  // an alt-tab of 20 s: same visit, no row
  let r = G.visitStep(v, 'hide', T + 60 * S); v = r.v; assert.equal(r.row, null);
  r = G.visitStep(v, 'show', T + 80 * S); v = r.v; assert.equal(r.ended, false); assert.equal(r.row, null);
  // another of 299 s: still the same
  r = G.visitStep(v, 'hide', T + 100 * S); v = r.v;
  r = G.visitStep(v, 'show', T + 399 * S); v = r.v; assert.equal(r.ended, false);
  // hidden for 5 minutes: the visit ended at the hide; length stops there, attended time is kept
  v = G.visitAtt(v, 10);
  r = G.visitStep(v, 'hide', T + 500 * S); v = r.v;
  r = G.visitStep(v, 'tick', T + 700 * S); assert.equal(r.ended, false, 'only 200 s hidden');
  r = G.visitStep(v, 'tick', T + 800 * S);
  assert.equal(r.ended, true); assert.deepEqual(r.row, { len_s: 500, att_s: 50 });
  // the same on coming back after a long hide (no timer ran)
  r = G.visitStep(v, 'show', T + 9000 * S); assert.equal(r.ended, true); assert.equal(r.row.len_s, 500);
  // leaving the page ends it: at the hide if hidden, now if not
  r = G.visitStep(v, 'end', T + 520 * S); assert.equal(r.row.len_s, 500);
  r = G.visitStep(G.visitNew(T), 'end', T + 90 * S); assert.equal(r.row.len_s, 90);
  // too short to count
  assert.equal(G.visitStep(G.visitNew(T), 'end', T + 3 * S).row, null);
  // the threshold is a parameter
  const q = { gapS: 30, minS: 5 };
  let w = G.visitStep(G.visitNew(T), 'hide', T + 60 * S).v;
  assert.equal(G.visitStep(w, 'show', T + 100 * S, q).ended, true, 'a 40 s hide ends it with a 30 s gap');
  assert.equal(G.visitStep(w, 'show', T + 100 * S).ended, false, 'but not with the default 300 s');
}
console.log('darkgate: ok');
