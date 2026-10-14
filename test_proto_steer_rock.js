// Dig: the game tells you to hit the Rock (decision 19). Run: node test_proto_steer_rock.js
import fs from 'node:fs';
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const NO = () => {};
const P = G.PARAMS.boss;

// a dig at road level `idx` (0-based) with a block of hp `hp` one row above the Rock, in column 2
function at(idx, hp = 3000, tries = 1) {
  G.seedRng(5);
  const s = G.newState();
  for (const f of G.ROAD.slice(0, G.FIXED.length)) s.road.stamps[G.roadKey(f)] = { site: f.site, floor: f.floor, ch: f.ch, twist: '', fin: 1, fast: 0, hard: 0, best: 90, n: 1 };
  const lv = G.ROAD[idx]; s.site = lv.site;
  s.top = lv.floor - 5; s.best = lv.floor;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = G.genRow(s, s.top + i);
  for (let i = 0; i < 5; i++) s.rows[i] = s.rows[i].map(() => null);
  s.run = null; const r = G.siteRun(s); r.floor = lv.floor; r.site = lv.site; r.key = G.siteKey(s.site, lv.floor, ''); r.par = G.sitePar(lv.floor, '');
  s.road.stamps[r.key] = { site: s.site, floor: lv.floor, twist: '', fin: 0, fast: 0, hard: 0, best: 0, n: tries };
  s.road.deal = null;
  const rr = lv.floor - 1;
  s.rows[rr - s.top][2] = { t: 'dirt', hp, max: hp, s: 1 };
  return { s, rr, lv };
}
const swingAt = (s, r, c, n = 1) => { for (let i = 0; i < n; i++) { G.swing(s, r, c, NO); G.step(s, 0.2, NO); } };
const L7 = 6;     // road level 7

{ // level 7, Gate hittable: the tag turns on after 3 swings, with its swings
  const { s, rr } = at(L7, 3000);
  ok(G.rockHittable(s), 'the Rock can be hit');
  ok(G.isTooHard(s, rr, 2), 'a 3,000-hit block is too hard');
  swingAt(s, rr, 2, 2);
  ok(!G.hardTag(s), 'no tag after 2 swings');
  swingAt(s, rr, 2, 1);
  const tag = G.hardTag(s);
  ok(tag && tag.r === rr && tag.c === 2 && tag.n > 100, 'tag after 3 swings: ' + JSON.stringify(tag));
  ok(s.run.swHard === 3 && !s.run.swRock, 'three tagged swings counted');
  swingAt(s, rr + 1, 0, 1);
  ok(!G.hardTag(s), 'a swing at another block drops the tag');
}
{ // a soft block is never too hard
  const { s, rr } = at(L7, 5);
  swingAt(s, rr, 2, 5);
  ok(!G.isTooHard(s, rr, 2) && !G.hardTag(s) && !s.run.swHard, 'a soft block: no tag, no count');
}
{ // lessons: off (road level 3)
  const { s, rr } = at(2, 3000);
  ok(!G.rockHittable(s) && !G.isTooHard(s, rr, 2), 'level 3 is a lesson: off');
  swingAt(s, rr, 2, 4);
  ok(!G.hardTag(s) && !s.run.swHard, 'no tag, no count on a lesson');
}
{ // a Gate no cell of which can be hit: off
  const { s, lv } = at(L7, 3000);
  const gi = lv.floor - s.top;
  for (let r = 0; r < gi; r++) s.rows[r] = s.rows[r].map(() => ({ t: 'dirt', hp: 5, max: 5, s: 1 }));
  s.rows[gi - 1][2] = { t: 'dirt', hp: 3000, max: 3000, s: 1 };
  ok(!G.rockHittable(s) && !G.isTooHard(s, gi - 1 + s.top, 2), 'sealed under dirt: off');
}
{ // the law's cure is never tagged
  const { s, rr } = at(L7, 3000);
  G.bossInView(s);
  s.rows[rr - s.top][2] = { t: 'lantern', hp: 3000, max: 3000, s: 1 };
  const tell = G.bossTell(s);
  ok(tell && tell.r === rr && tell.c === 2, 'level 7 is dark and the lantern is its cure');
  ok(!G.isTooHard(s, rr, 2), 'cure block is not too hard');
  s.run.swHard = P.hardTurn + 1; s.run.hn = 3400;
  ok(G.bossAdvice(s).kind === 'dark', 'in the dark the lantern line comes first');
}
{ // the hint: after hardTurn tagged swings the hint is the Rock line
  const { s, rr } = at(L7, 3000);
  ok(!G.bossStuck(s), 'not stuck at the start');
  swingAt(s, rr, 2, P.hardTurn - 1);
  ok(!G.steerHint(s), 'not yet at hardTurn - 1');
  swingAt(s, rr, 2, 1);
  const h = G.steerHint(s);
  ok(h && h.gate === !!G.bossInView(s).gate, 'hint live at hardTurn');
  ok(G.bossStuck(s), 'bossStuck turns on with it');
  const a = G.bossAdvice(s);
  ok(a.kind === (h && h.gate ? 'rock_gate' : 'rock') && a.n > 100, 'advice names the Rock: ' + JSON.stringify(a));
  const b = G.bossInView(s);
  swingAt(s, b.row, b.weak, P.hardTurn + 5);
  ok(s.run.swRock > s.run.swHard && !G.steerHint(s), 'hitting the Rock turns the hint off');
}
{ // without a law cure the live line is the Rock line, and with one the cure comes first
  const { s } = at(L7, 3000);
  s.run.swHard = P.hardTurn + 1; s.run.hn = 3400;
  const real = G.bossTell(s), a = G.bossAdvice(s);
  if (real && real.r !== undefined && real.kind !== 'lit') ok(a.kind === real.kind, 'the law first');
  else ok(a.kind === 'rock_gate' || a.kind === 'rock', 'without a law the Rock line: ' + a.kind);
}
{ // a try ended with swHard > swRock opens the next try with the line
  const { s, rr } = at(L7, 3000);
  swingAt(s, rr, 2, 4);
  const st = s.road.stamps[s.run.key];
  ok(st.steer > 0, 'the level remembers the try was spent on hard blocks');
  s.run = { ...s.run, swHard: 0, swRock: 0, hc: null, hn: 0, steerSaid: 0 };
  const op = G.steerOpening(s);
  ok(op && op.n === st.steer && op.gate, 'the next try opens with the line');
  s.run.steerSaid = 1;
  ok(!G.steerOpening(s), 'said once');
  s.run.steerSaid = 0;
  const b = G.bossInView(s);
  swingAt(s, b.row, b.weak, 1);
  ok(!G.steerOpening(s) && !s.road.stamps[s.run.key].steer, 'a swing at the Rock clears it');
}
{ // a try spent on the Rock leaves no line
  const { s } = at(L7, 3000);
  const b = G.bossInView(s);
  swingAt(s, b.row, b.weak, 4);
  ok(!(s.road.stamps[s.run.key].steer > 0), 'a try on the Rock leaves no line');
}
{ // a run without the counters (old save) has all of it off; the numbers are params; the sim reads the game's
  const { s } = at(L7, 3000);
  delete s.run.swHard; delete s.run.swRock; delete s.run.hc; delete s.run.hn;
  ok(!G.steerHint(s) && !G.steerOpening(s) && !G.hardTag(s), 'no counters: nothing on');
  ok(P.hardHits === 25 && P.hardTurn === 60 && P.hardShow === 3, 'numbers in params');
  const src = fs.readFileSync('./sim/proto/player.mjs', 'utf8').replace(/\/\/.*$/gm, '');
  ok(!/MOVE\.hardHits/.test(src) && /PARAMS\.boss\.hardHits/.test(src), 'the sim reads boss.hardHits');
}
{ // Arabic for every new key
  const en = G.t('hard_tag', { n: 5 });
  ok(/Too hard/.test(en), 'English tag');
  const strs = fs.readFileSync('./proto/features/boss/strings.js', 'utf8');
  const ar = strs.slice(strs.indexOf('}, ar: {'));
  for (const k of ['stuck_rock_gate', 'stuck_rock', 'hard_tag']) ok(ar.includes(k + ':'), 'ar ' + k);
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('steer rock: ok');
