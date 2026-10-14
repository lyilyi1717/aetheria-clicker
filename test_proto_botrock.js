// Dig sim player: beside a Big Rock it hits the Rock rather than a block that takes more than boss.hardHits of its hits, and digs
// towards a Rock it cannot reach by the softest block; not on the four lessons (MOVE.hardFrom). docs/pacing-targets.md, level 7 pass.
// Run: node test_proto_botrock.js
import assert from 'node:assert/strict';
import * as G from './proto/game.js';
import { mkCtx, pickTarget, MOVE } from './sim/proto/player.mjs';

const D = (t, hp = 1) => ({ t, hp, max: hp, s: 0 });
function field(top, best) {
  G.seedRng(1);
  const s = G.newState();
  s.top = top; s.best = best; s.rows = [];
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows.push(Array.from({ length: G.COLS }, () => D('dirt')));
  s.queue = []; s.pools = {};
  return s;
}
// a lit Rock at row 125 right under the open top row, with a chest of `hp` beside the player
function chestByRock(hp) {
  const s = field(124, 125);
  s.rows[0] = s.rows[0].map(() => null);
  s.rows[1] = s.rows[1].map(() => ({ t: 'boss', hp: 1, max: 1, s: 0 }));
  s.boss = { row: 125, hp: 1000, max: 1000, weak: 2, wt: 9, you: 1, crew: 0, rub: 0 };
  s.deep.glows.push({ r: 124, c: 1, rad: 3, until: s.deep.bc + 50 });
  s.rows[0][5] = D('chest', hp);
  return s;
}
const ctxAt = col => { const c = mkCtx('mid'); c.p.notice = 1; c.p.clear = 0; c.col = col; return c; };
const hit = G.pickPower(G.newState());

assert.equal(G.PARAMS.boss.hardHits, 25); assert.equal(MOVE.hardFrom, 5);
{ // a chest that breaks in a few hits: the bot goes for it
  const s = chestByRock(Math.ceil(3 * hit));
  assert.deepEqual(pickTarget(s, ctxAt(5)), [124, 5]);
}
{ // a chest of thousands of hits beside a Rock it can hit: the Rock, at its crack
  const s = chestByRock(Math.ceil(5000 * hit));
  assert.deepEqual(pickTarget(s, ctxAt(5)), [125, 2]);
}
{ // the same on a lesson (level 1): a new player still hits what is in front of him
  const s = chestByRock(Math.ceil(5000 * hit));
  s.run = { key: 'dunes:50', site: 'dunes', floor: 50, twist: '', ch: 1, done: false };
  assert.deepEqual(pickTarget(s, ctxAt(5)), [124, 5]);
}
{ // the Rock cannot be hit yet (the row above it is whole): dig towards it by the softest block of that row
  const s = field(123, 124);
  s.rows[0] = s.rows[0].map(() => null);
  s.rows[1] = s.rows[1].map(() => D('dirt', Math.ceil(5000 * hit)));
  s.rows[1][7] = D('dirt', Math.ceil(2 * hit));
  s.rows[2] = s.rows[2].map(() => ({ t: 'boss', hp: 1, max: 1, s: 0 }));
  s.boss = { row: 125, hp: 1000, max: 1000, weak: 2, wt: 9, you: 0, crew: 0, rub: 0 };
  const c = ctxAt(5); c.p.notice = 0;
  assert.deepEqual(pickTarget(s, c), [124, 7]);
}
console.log('botrock: ok');
