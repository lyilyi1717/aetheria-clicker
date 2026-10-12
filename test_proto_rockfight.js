// The Rock fight pays, the Rafeeqs show their work, and a record. Run: node test_proto_rockfight.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const P = G.PARAMS.boss, D = G.PARAMS.diggers;

// a state standing in front of the first Big Rock (row 25), ground above it dug out
function atRock(crew = 0) {
  G.seedRng(3);
  const s = G.newState();
  s.top = 20; s.best = 21;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = G.genRow(s, s.top + i);
  for (let i = 0; i < 5; i++) s.rows[i] = s.rows[i].map(() => null);
  for (let k = 0; k < crew; k++) { s.up.crew++; s.diggers.push({ id: k + 1, broke: 0, coins: 0, c: k, r: s.top, tc: -1, tr: -1, cd: 0.3, swing: 0 }); }
  return s;
}
const rock = s => G.bossInView(s);
const off = b => (b.weak + 1) % G.COLS;      // a column that is not the glowing crack (it counts triple)

{ // each tenth of the bar sheds rubble, once, and the last tenth is the break
  const s = atRock(); const b = rock(s);
  ok(b && b.row === 25 && b.rub === 0, 'the Rock is in view');
  const seen = []; const ev = (k, d) => { if (k === 'rubble') seen.push(d); };
  const c0 = s.coins;
  G.damage(s, 25, off(b), b.max * 0.05, 'you', ev);
  ok(seen.length === 0 && s.coins === c0, 'under a tenth: nothing falls');
  G.damage(s, 25, off(b), b.max * 0.06, 'you', ev);
  ok(seen.length === 1 && seen[0].n === 1 && s.coins > c0 && b.rub === 1, 'the first tenth pays rubble');
  const c1 = s.coins;
  G.damage(s, 25, off(b), b.max * 0.01, 'you', ev);
  ok(seen.length === 1 && s.coins === c1, 'a tenth pays once per Rock');
  G.damage(s, 25, off(b), b.max * 0.5, 'you', ev);        // 62% gone in one hit: the tenths 2 to 6 all fall
  ok(seen.length === 6 && b.rub === 6, 'a big hit lets several fall');
  const ev2 = [];
  G.damage(s, 25, off(b), b.max, 'you', (k, d) => ev2.push(k));
  ok(ev2.includes('bossDown') && !ev2.includes('rubble'), 'the break is not rubble');
}
{ // rubble in total is about the Rock\'s own break pay (the number chosen, P.rubble times it)
  const s = atRock(); const b = rock(s);
  const c0 = s.coins; let sum = 0;
  const ev = (k, d) => { if (k === 'rubble') sum += d.coins; };
  G.damage(s, 25, off(b), b.max * 0.95, 'you', ev);
  const breakPay = G.dirtVal(25) * P.pay * G.coinMult(s);
  ok(b.rub === 9 && Math.abs(sum / breakPay - P.rubble) < 0.02, 'nine tenths add up to ' + P.rubble + ' times the break pay (' + (sum / breakPay).toFixed(3) + ')');
  ok(s.coins - c0 >= sum, 'and it is paid into the purse');
}
{ // who did the damage, for the two-colour bar
  const s = atRock(); const b = rock(s);
  G.damage(s, 25, off(b), 100, 'you', () => {}); G.damage(s, 25, off(b), 300, 'crew', () => {});
  ok(b.you === 100 && b.crew === 300, 'the Rock counts your damage and the Rafeeqs\' apart');
}
{ // a Rock from an old save (no tenths, no split) still works
  const s = atRock(); const b = rock(s);
  delete b.rub; delete b.you; delete b.crew;
  G.damage(s, 25, off(b), b.max * 0.25, 'you', () => {});
  ok(b.rub === 2 && b.you > 0, 'an old Rock without the new fields is fine');
  const back = G.deserialize(G.serialize(s));
  ok(back && back.boss && back.boss.rub === 2, 'the tenths survive a save');
}
{ // the Rafeeqs: half hit the Rock, half sieve for coins
  const s = atRock(4);
  for (let i = 0; i < 200; i++) G.step(s, 0.05, () => {});
  const sv = s.diggers.filter(d => d.sv).length;
  ok(sv === 2, 'at a Rock every second Rafeeq sieves (' + sv + ' of 4)');
  ok(s.diggers.filter(d => !d.sv).every(d => d.tr === 25), 'and the others hit the Rock');
  ok(s.crewCps > 0 && s.diggers.filter(d => d.sv).every(d => d.coins > 0), 'the sievers earn, and their tally says so');
  ok(rock(s).crew > 0 && rock(s).rub >= 0, 'the hitters damage the Rock');
  const tallied = s.diggers.reduce((a, d) => a + d.coins, 0);
  ok(tallied > 0 && tallied <= s.total, 'tallies are real coins');
}
{ // beside me and below: dig where the pick is, not the top rows
  G.seedRng(5);
  const s = G.newState();
  for (let i = 0; i < G.VIEW_ROWS; i++) for (let c = 0; c < G.COLS; c++) s.rows[i][c] = { t: 'dirt', hp: 5, max: 5, s: 0 };
  s.diggers.push({ id: 1, c: 0, r: s.top, tc: -1, tr: -1, cd: 0.3, swing: 0 });
  G.swing(s, s.top, 6);
  s.rows[0][6] = null; s.rows[1][6] = null; s.crewAim = [s.top + 1, 6];
  const t = G.POLICIES.nearest(s, s.diggers[0]);
  ok(Math.abs(t[1] - 6) <= 1 && t[0] >= s.top, 'the default job goes next to the last hit and below it: ' + t);
}
{ // the record: survives a New Site, the moment fires once, and only when it was beaten
  G.seedRng(1);
  const s = G.newState();
  const seen = [];
  const ev = (k, d) => { if (k === 'record') seen.push(d); };
  s.best = 30; G.step(s, 0.05, ev);
  ok(s.bestEver === 30 && seen.length === 0, 'the first dig sets the record without a banner');
  G.reset(s, 'site');
  ok(s.bestEver === 30 && s.recMark === -1 && s.best === 0, 'the record survives New Site');
  G.step(s, 0.05, ev);
  ok(s.recMark === 30, 'the new dig has the old record to beat');
  s.best = 29; G.step(s, 0.05, ev); ok(seen.length === 0, 'not yet');
  s.best = 31; G.step(s, 0.05, ev);
  ok(seen.length === 1 && seen[0].n === 31 && seen[0].old === 30 && s.bestEver === 31, 'passing it is a moment');
  s.best = 40; G.step(s, 0.05, ev);
  ok(seen.length === 1 && s.bestEver === 40, 'once per dig');
  const back = G.deserialize(G.serialize(s));
  ok(back.bestEver === 40 && back.recPassed === true, 'the record is saved');
  // an old save without the slices
  const o = JSON.parse(G.serialize(s)); delete o.bestEver; delete o.recMark; delete o.recPassed; delete o.allCps; delete o.fv;
  const old = G.deserialize(JSON.stringify(o));
  ok(old && old.bestEver === 0 && old.recMark === -1, 'an old save loads with defaults');
  G.step(old, 0.05, ev);
  ok(old.bestEver === old.best, 'and its record starts from the dig it has');
}
{ // old Rafeeqs without a tally get one
  const s = G.newState(); s.diggers.push({ c: 1, r: 0, tc: -1, tr: -1, cd: 0, swing: 0 }, { c: 2, r: 0, tc: -1, tr: -1, cd: 0, swing: 0 });
  const o = JSON.parse(G.serialize(s)); o.fv = {};
  const back = G.deserialize(JSON.stringify(o));
  ok(back.diggers[0].id === 1 && back.diggers[1].id === 2 && back.diggers[1].coins === 0, 'old Rafeeqs get ids and a tally');
}
if (failed) { console.error(failed + ' check(s) failed'); process.exit(1); }
console.log('Rock fight OK');
