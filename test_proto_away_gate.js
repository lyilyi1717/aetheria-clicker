// Dig: while away the crew digs right up to the Gate (docs/dig-design.md decision 20, work order 12). Run: node test_proto_away_gate.js
//   The away walk ends with the row right above the Rock dug and the Rock whole (a Rock not yet broken is a wall, the
//   Gate of the level in play is the last one); the Gate is never dug; with too little time it ends where the time ran
//   out; rows are priced at their real hardness (groundHp).
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const NO = () => {};

const crew = (s, pick) => {
  for (let i = s.diggers.length; i < 6; i++) s.diggers.push({ c: i, r: s.top, tc: -1, tr: -1, cd: 0, swing: 0 });
  s.up.pick = pick; s.up.crew = 6;
};
function dig(card, patch) {
  G.seedRng(11);
  const s = G.newState();
  s.bossesDown = 2;
  ok(G.newSite(s, card.site, NO, patch, card), 'opened ' + JSON.stringify(card));
  return s;
}
const roadCard = i => { const f = G.ROAD[i]; return { site: f.site, floor: f.floor, twist: '', hard: '', ch: f.ch }; };
const rockStands = s => s.rows[0].every(c => c && c.t === 'boss');
const nextRock = top => Math.ceil((top + 1) / G.LAYER) * G.LAYER;      // the first Big Rock below: not passed unbroken

// 1. enough time: the row above the Rock is dug, the crew waits, the Rock is whole. `near` rows above the Gate, the Rock is the Gate.
function reach(name, card, patch, near) {
  const s = dig(card, patch);
  const floor = s.run.floor;
  if (near) while (s.top < floor - near) G.shiftRow(s);
  crew(s, 1000);
  const top0 = s.top, stop = nextRock(top0);
  const out = G.settleAway(s, 12 * 3600);
  ok(out.atBoss, name + ': the crew waits at a Rock');
  ok(s.top === stop, name + `: the row right above the Rock is dug (top ${s.top}, Rock ${stop})`);
  ok(out.metres === stop - top0, name + `: every row down to the Rock was dug (${out.metres} of ${stop - top0})`);
  ok(rockStands(s) && !s.run.done, name + ': the Rock row is whole and the level is not finished');
  ok(out.sieveSeconds > 0, name + ': with time left they sieve at the Rock');
  if (near) {
    ok(stop === floor && out.atGate === true, name + ': that Rock is the Gate, and the card says so');
    ok(s.bossesDown * G.LAYER < floor, name + ': the Gate is not counted as down');
  }
  return s;
}
const f14 = G.ROAD[13], k14 = G.roadKey(f14);
const s0 = G.newState();
s0.road.stamps[k14] = { site: f14.site, floor: f14.floor, ch: f14.ch, twist: '', fin: 1, fast: 0, hard: 0, best: 500, n: 1 };
for (const [name, card] of [['road level 5 (learn)', roadCard(4)], ['road level 8', roadCard(7)], ['road level 14 (prove)', roadCard(13)],
  ['chapter two, level 30', roadCard(29)], ['chapter two, level 40', roadCard(39)], ['a replay', G.replayCard(s0, k14, false)], ['a chili', G.replayCard(s0, k14, true)]]) {
  ok(card, name + ': card exists');
  reach(name, card, undefined, 0);
  reach(name + ', 10 rows above the Gate', card, undefined, 10);
}
reach('a contract, 10 rows above the Gate', { site: 'dunes', floor: 150, twist: '', hard: '', ch: 1 }, { contract: 'noDiggers' }, 10);

// 2. too little time: it ends where the time ran out, further with more time; rows are priced at groundHp
{
  const run = secs => { const s = dig(roadCard(7)); crew(s, 3); const dps = G.fold('awayDps', s, 0);
    const q = dig(roadCard(7)); const o = G.settleAway(s, secs); return { s, o, dps, q }; };
  const a = run(300), b = run(3000), c = run(12 * 3600);
  ok(a.o.metres > 0 && a.s.top < 25, 'a short absence ends short of the Rock (top ' + a.s.top + ')');
  ok(!a.o.atBoss, 'and the crew is not at a Rock yet');
  ok(b.s.top > a.s.top, `more time, more rows (${a.s.top} to ${b.s.top})`);
  ok(c.s.top === 25 && c.o.atBoss, 'enough time reaches the row above the Rock');
  let cost = 0;
  for (let r = 0; r < a.s.top; r++) cost += G.groundHp(a.q, r) * G.COLS * G.PARAMS.away.rowCost;
  ok(cost <= a.dps * 300 * 1.001 && a.dps > 0, 'rows are priced at their real hardness and fit in the time away');
  ok(G.groundHp(a.q, 24) > G.groundHp(a.q, 5) * 3, 'the last row above the Rock is the hardest of the layer, and is dug at that price');
}

// 3. the crew never digs a standing Rock, even with absurd damage; a broken Rock in view is no wall
{
  const s = dig(roadCard(4)); crew(s, 1e6);
  G.settleAway(s, 12 * 3600);
  ok(s.top === 25 && rockStands(s), 'huge damage still leaves the Rock whole');
  const q = dig(roadCard(4)); crew(q, 1000);
  while (q.top < 24) G.shiftRow(q);
  q.rows[1] = q.rows[1].map(() => null);                      // the Rock at row 25 is already broken
  G.settleAway(q, 12 * 3600);
  ok(q.top === 50 && rockStands(q), 'a broken Rock is ground; the next standing Rock is the stop (top ' + q.top + ')');
}

// 4. old saves
{
  const s = dig(roadCard(7)); crew(s, 1000);
  const old = JSON.parse(G.serialize(s)); delete old.savedAt;
  const back = G.deserialize(JSON.stringify(old));
  ok(back && back.run && back.run.floor === s.run.floor, 'a save in play loads');
  G.settleAway(back, 12 * 3600);
  ok(back.top === 25, 'and its crew digs to the row above the first Rock');
  const none = G.newState(); none.run = null; crew(none, 1000);
  G.settleAway(none, 12 * 3600);
  ok(none.top === 25, 'a save with no run yet: the crew digs to the row above its first Rock (top ' + none.top + ')');
}
if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('Dig away to the Gate OK');
