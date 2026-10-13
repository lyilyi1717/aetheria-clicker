// Dig: one Stronger Pick; a Rafeeq hits for a share of YOUR hit. Run: node test_proto_pickmerge.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const near = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const P = G.PARAMS.diggers, SP = G.PARAMS.starshop;

{ // a Rafeeq's hit = the share x yours, and it follows the pick
  G.seedRng(3);
  const s = G.newState();
  ok(near(G.crewShare(s), 0.6) && near(G.crewPower(s), 0.6 * G.pickPower(s)), 'a Rafeeq hits for 60% of yours');
  s.coins = 1e9; s.total = 1e9;
  for (let i = 0; i < 12; i++) G.buy(s, 'pick');
  ok(near(G.crewPower(s), 0.6 * G.pickPower(s)) && G.pickPower(s) > 10, 'one Stronger Pick raises both');
  s.starUp.tr_pick = 3;
  ok(near(G.crewPower(s), 0.6 * G.pickPower(s)), 'The Pick track lifts the Rafeeqs with you');
  s.wingBoon = { left: 10, kind: 'strong' };
  ok(near(G.crewPower(s), 0.6 * G.pickPower(s)), 'Strong Arm lifts them too');
}
{ // Training is gone from the shop and from the scripted player
  ok(!G.ITEMS.crewPow, 'no Rafeeq Training item');
  const s = G.newState(); s.coins = 1e9; s.total = 1e9; G.buy(s, 'crew');
  ok(s.up.crewPow === undefined, 'no Training level in a new game');
  ok(!Object.keys(G.ITEMS).includes('crewPow'), 'not in the shop list');
}
{ // The Camp steps no longer multiply the Rafeeq hit; they lift the share
  const s = G.newState(); s.starUp.tr_camp = 6;
  ok(near(G.crewShare(s), 0.6 + SP.campShare * 6), 'six Camp steps: the share is 60% + 6 steps');
  ok(near(G.crewPower(s), G.crewShare(s) * G.pickPower(s)), 'and no x1.5 a step on top');
}
{ // the sieve at a Big Rock pays at most `sieveCap` blocks of dirt a hit
  const clearRow = (s, i) => { for (let c = 0; c < G.COLS; c++) s.rows[i][c] = null; };
  const earn = cap => {
    const saved = P.sieveCap; P.sieveCap = cap;
    G.seedRng(9);
    const s = G.newState(); s.coins = 1e12; s.total = 1e12;
    for (let i = 0; i < 40; i++) G.buy(s, 'pick');
    G.buy(s, 'crew'); G.buy(s, 'crew');
    for (let n = 0; n < 200; n++) {
      for (let i = 0; i < s.rows.length; i++) if (!G.isBossRow(s.top + i)) clearRow(s, i);
      G.step(s, 0.01);
    }
    const rock = G.bossInView(s); rock.hp = rock.max = 1e40;     // it stands for the whole test
    const before = s.coins;
    for (let i = 0; i < 100; i++) G.step(s, 0.05);
    P.sieveCap = saved;
    return { coins: s.coins - before, sv: s.diggers[1].sv };
  };
  const a = earn(1e9), b = earn(1);
  ok(a.sv === 1 && b.sv === 1, 'the second Rafeeq sieves at the Rock');
  ok(a.coins > 0 && b.coins > 0 && a.coins > 3 * b.coins, 'the cap pays far less than no cap with a strong pick (' + a.coins + ' vs ' + b.coins + ')');
}
{ // an old save with Rafeeq Training levels: paid back in coins once, then gone
  G.seedRng(5);
  const s = G.newState(); s.coins = 100; s.total = 100;
  const old = JSON.parse(G.serialize(s));
  old.up.crewPow = 4; old.fv.diggers = 2;
  const back = G.deserialize(JSON.stringify(old));
  const refund = 12 + 18 + 27 + Math.ceil(12 * 1.5 ** 3);
  ok(back.up.crewPow === undefined, 'the Training level is gone from the save');
  ok(back.coins === 100 + refund, 'and its coins are back (' + back.coins + ')');
  const again = G.deserialize(G.serialize(back));
  ok(again.coins === back.coins && again.up.crewPow === undefined, 'a second load pays nothing more');
  const none = JSON.parse(G.serialize(s)); delete none.fv;
  ok(G.deserialize(JSON.stringify(none)).coins === 100, 'a save with no Training pays nothing');
}
if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('pickmerge: ok');
