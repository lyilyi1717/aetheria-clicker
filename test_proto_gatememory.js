// Dig: the Gate remembers your hits between tries. Run: node test_proto_gatememory.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const NO = () => {};
const P = G.PARAMS.boss;

// a state at the Gate of road level `idx` (0-based into ROAD), `tries` tries so far, optionally with a bank on the stamp
function atGate(idx = G.FIXED.length, bank = 0, tries = 1) {
  G.seedRng(5);
  const s = G.newState();
  for (const f of G.ROAD.slice(0, G.FIXED.length)) s.road.stamps[G.roadKey(f)] = { site: f.site, floor: f.floor, ch: f.ch, twist: '', fin: 1, fast: 0, hard: 0, best: 90, n: 1 };
  const lv = G.ROAD[idx]; s.site = lv.site;
  s.top = lv.floor - 5; s.best = lv.floor - 4;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = G.genRow(s, s.top + i);
  for (let i = 0; i < 5; i++) s.rows[i] = s.rows[i].map(() => null);
  s.run = null; const r = G.siteRun(s); r.floor = lv.floor; r.key = G.siteKey(s.site, lv.floor, ''); r.par = G.sitePar(lv.floor, '');
  s.road.stamps[r.key] = { site: s.site, floor: lv.floor, twist: '', fin: 0, fast: 0, hard: 0, best: 0, n: tries, bank };
  return s;
}
const stampOf = s => s.road.stamps[s.run.key];
const hitFor = (s, frac) => { const b = G.bossInView(s); G.damage(s, b.row, (b.weak + 1) % G.COLS, b.max * frac, 'you', NO); return b; };

{ // a try banks a share of the damage dealt, and the next try starts cracked
  const s = atGate();
  const b = hitFor(s, 0.5);
  ok(Math.abs(stampOf(s).bank - 0.5 * P.gateShare) < 1e-6, 'half the health dealt banks the share of it: ' + stampOf(s).bank);
  const s2 = atGate(G.FIXED.length, stampOf(s).bank, 2);
  const b2 = G.bossInView(s2);
  ok(Math.abs(b2.hp / b2.max - (1 - P.gateShare * 0.5)) < 0.01, 'the next try starts cracked by the bank');
  ok(G.bossGateBank(b2) > 0.29 && b2.rub === G.bossTenths(b2), 'the bank is seen, and its tenths are not paid again');
  const s4 = atGate(G.FIXED.length, 0.27, 2), b4 = G.bossInView(s4), rub0 = b4.rub; hitFor(s4, 0.001);
  ok(b4.rub === rub0 && rub0 > 0, 'no burst of rubble for the part that was cracked already');
  ok(b.gate === 1, 'the Gate is flagged');
}
{ // the cap: the last hits are always yours
  const s = atGate(G.FIXED.length, 0.85, 2);
  const b = G.bossInView(s);
  ok(b.hp / b.max >= 1 - P.gateCap - 1e-6, 'at most the cap is cracked');
  hitFor(s, 0.9);
  ok(stampOf(s).bank <= P.gateCap + 1e-9, 'the bank never passes the cap: ' + stampOf(s).bank);
  const s3 = atGate(G.FIXED.length, 5, 2);
  ok(G.bossInView(s3).hp / G.bossInView(s3).max >= 1 - P.gateCap - 1e-6, 'a too large stored bank is cut to the cap');
}
{ // only road Gates: the lessons, side levels with a twist, finished levels and the deal bank nothing
  const lesson = atGate(0);
  hitFor(lesson, 0.5);
  ok(!G.bossInView(lesson).gate && !stampOf(lesson).bank, 'a lesson level banks nothing');
  const rep = atGate(); stampOf(rep).fin = 1;
  G.siteRun(rep); G.bossInView(rep); hitFor(rep, 0.5);
  ok(!rep.boss.gate && !stampOf(rep).bank, 'a replay of a finished level banks nothing');
  const tw = atGate(); tw.run.twist = 'heavy';
  tw.boss = null; hitFor(tw, 0.5);
  ok(!tw.boss.gate, 'a twisted side level banks nothing');
  const deal = atGate(); deal.run.floor = G.ROAD[G.ROAD.length - 1].floor + 25; deal.run.key = 'x';
  ok(G.bossGateKeeps(deal) === '', 'no leave line without a Gate hit');
}
{ // the bank clears when the level is finished; the leave line
  const s = atGate();
  ok(G.bossGateKeeps(s) === '', 'no leave line before a hit');
  hitFor(s, 0.5);
  ok(G.bossGateKeeps(s).includes(String(Math.round(P.gateShare * 100)) + '%'), 'the leave line names the share: ' + G.bossGateKeeps(s));
  hitFor(s, 2);
  ok(stampOf(s).bank === 0, 'the bank clears when the Gate falls');
  G.step(s, 1, NO);
  ok(stampOf(s).fin === 1, 'and the level is finished');
}
{ // by try, never by time
  const s = atGate();
  hitFor(s, 0.3); const bank = stampOf(s).bank;
  for (let i = 0; i < 50; i++) G.step(s, 5, NO);
  ok(stampOf(s).bank === bank, 'waiting does not change the bank');
}
{ // an old save: a stamp without a bank loads and plays
  const s = atGate(); delete stampOf(s).bank;
  const back = G.deserialize ? G.deserialize(G.serialize(s)) : s;
  const st = back.road.stamps[back.run.key];
  ok(!st.bank, 'no bank in an old save');
  const b = G.bossInView(back);
  ok(b && b.hp === b.max, 'the Gate starts whole');
  hitFor(back, 0.2);
  ok(st.bank > 0 || back.road.stamps[back.run.key].bank > 0, 'and starts banking');
}
if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('gatememory ok');
