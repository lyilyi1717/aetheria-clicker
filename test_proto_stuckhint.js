// Dig: when the Rock will not break, the game says what to do. Run: node test_proto_stuckhint.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const NO = () => {};

// a state at the Gate Rock of its run (floor 50 is the second Big Rock: make the Rock row the floor)
function atGate(tries = 1, floor = 25) {
  G.seedRng(5);
  const s = G.newState();
  s.top = floor - 5; s.best = floor - 4;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = G.genRow(s, s.top + i);
  for (let i = 0; i < 5; i++) s.rows[i] = s.rows[i].map(() => null);
  // the lessons are finished; the run is the next level of the road, tried `tries` times
  for (const f of G.ROAD.slice(0, G.FIXED.length)) s.road.stamps[G.roadKey(f)] = { site: f.site, floor: f.floor, ch: f.ch, twist: '', fin: 1, fast: 0, hard: 0, best: 90, n: 1 };
  const lv = G.ROAD[G.FIXED.length]; floor = lv.floor; s.site = lv.site;
  s.top = floor - 5; s.best = floor - 4;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = G.genRow(s, s.top + i);
  for (let i = 0; i < 5; i++) s.rows[i] = s.rows[i].map(() => null);
  s.run = null; const r = G.siteRun(s); r.floor = floor; r.key = G.siteKey(s.site, floor, ''); r.par = G.sitePar(floor, '');
  s.road.stamps[r.key] = { site: s.site, floor, twist: '', fin: 0, fast: 0, hard: 0, best: 0, n: tries };
  s.road.deal = null;
  return s;
}
const hit = s => { const b = G.bossInView(s); G.damage(s, b.row, (b.weak + 1) % G.COLS, 1, 'you', NO); return b; };
const gate = 0;

{ // not stuck: first try, not hit yet, or slow progress not yet seen
  const s = atGate(1, gate); const b = G.bossInView(s);
  ok(b && b.row === s.run.floor, 'the Rock is in view');
  ok(!G.bossStuck(s), 'not stuck before a hit');
  hit(s);
  ok(!G.bossStuck(s), 'not stuck on the first try with progress unknown');
  for (let i = 0; i < 20; i++) { hit(s); G.step(s, 1, NO); }
  ok(!G.bossStuck(s), '20 s of play is not a minute');
}
{ // second try: stuck once hit
  const s = atGate(2, gate);
  ok(!G.bossStuck(s), 'second try, but not hit yet');
  hit(s);
  ok(G.bossStuck(s), 'second try and hit: stuck');
  const r = s.run; r.done = true;
  ok(!G.bossStuck(s), 'a finished level is not stuck');
}
{ // slow: a minute of play with the pick on it, under a tenth taken
  const s = atGate(1, gate); const b = hit(s);
  for (let i = 0; i < 59; i++) { hit(s); G.step(s, 1, NO); }
  ok(!G.bossStuck(s), '59 s: not yet');
  for (let i = 0; i < 3; i++) { hit(s); G.step(s, 1, NO); }
  ok(G.bossStuck(s), 'a minute and a tenth not taken: stuck');
}
{ // fast progress: not stuck; time with the pick off the Rock does not count
  const s = atGate(1, gate); const b = hit(s);
  for (let i = 0; i < 70; i++) { G.damage(s, b.row, (b.weak + 1) % G.COLS, b.max * 0.003, 'you', NO); G.step(s, 1, NO); }
  ok(b.max - b.hp > 0.1 * b.max && !G.bossStuck(s), 'a tenth gone in the minute: not stuck');
  const s2 = atGate(1, gate); hit(s2);
  for (let i = 0; i < 300; i++) G.step(s2, 1, NO);
  ok(!G.bossStuck(s2), 'minutes of waiting with the pick away do not count');
}
{ // the four messages
  const s = atGate(2, gate); hit(s);
  const cost = G.upgradeCost(s, 'tr_pick');
  s.stars = 0;
  const real = G.dealCards(s).slice();
  s.road.deal = real.filter(c => c.kind === 'fixed');       // a road with no side cards
  let a = G.bossAdvice(s);
  ok(a.kind === 'more' && s.bossesDown < 2, 'no Stars, cannot move yet: break more Rocks first');
  s.bossesDown = 2;
  a = G.bossAdvice(s);
  ok(a.kind === 'leave' && a.n === G.starsFor(s) && a.n >= 1, 'allowed to move: leave now, with the Stars it gives');
  // a side card that pays enough (tries 2 deals side cards beside the level)
  s.road.deal = real;
  const cards = G.dealCards(s);
  const side = cards.filter(c => c.kind !== 'fixed');
  ok(side.length > 0, 'side cards exist at the second try');
  if (side.length) {
    s.stars = Math.max(0, cost - Math.max(...side.map(c => c.stars)));
    a = G.bossAdvice(s);
    ok(a.kind === 'side' && a.n === Math.max(...side.map(c => c.stars)), 'a side card would buy the step: side level');
  }
  s.stars = cost; a = G.bossAdvice(s);
  ok(a.kind === 'spend' && a.n === cost, 'Stars on hand buy a step: spend');
  const before = G.starshopSteps(s, 'pick');
  ok(G.buy(s, 'tr_pick') && G.starshopSteps(s, 'pick') === before + 1 && s.stars === 0, 'the button buys one Pick step');
}
{ // a side card that cannot pay enough is not offered
  const s = atGate(2, gate); hit(s); s.stars = 0; s.bossesDown = 0; s.road.deal = [{ kind: 'twist', stars: 1, key: 'x' }];
  ok(G.bossAdvice(s).kind === 'more', 'a card that pays too little is not offered');
  s.road.deal = [{ kind: 'twist', stars: G.upgradeCost(s, 'tr_pick') + 1, key: 'x' }];
  ok(G.bossAdvice(s).kind === 'side', 'a card that pays enough is');
}
{ // old saves load; the fight state lives on the Rock, which is per site
  const s = atGate(2, gate); hit(s);
  const d = JSON.parse(JSON.stringify(G.serialize ? G.serialize(s) : s));
  const old = JSON.parse(JSON.stringify(d)); if (old.boss) { delete old.boss.idle; delete old.boss.w0hp; delete old.boss.pt; delete old.boss.slow; }
  const s2 = G.deserialize ? G.deserialize(old) : old;
  let threw = false; try { G.bossStuck(s2); G.step(s2, 0.1, NO); } catch (e) { threw = true; console.error(e); }
  ok(!threw, 'a save without the fight fields steps and answers');
  const s3 = G.newState();
  ok(G.bossStuck(s3) === false, 'a fresh game is not stuck');
}
if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('stuckhint: ok');
