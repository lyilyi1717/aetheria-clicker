// Dig feature: the return (time away). Run: node test_proto_away.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

const crewState = () => {
  const s = G.newState();
  s.coins = 1e9; s.total = 1e9; G.buy(s, 'crew'); for (let i = 0; i < 30; i++) G.buy(s, 'pick');
  s.coins = 0; s.total = 0;
  return s;
};

{ // no Rafeeqs, nothing; a short absence pays a little
  G.seedRng(1);
  const s = G.newState();
  const o = G.settleAway(s, 7200);
  ok(o.coins === 0 && o.chests === 0 && !o.sieveCoins, 'no Rafeeqs, no work');
}
{ // at the Big Rock the crew keeps earning, and longer pays more
  const res = {};
  for (const h of [0.5, 2, 8, 12, 40]) {
    G.seedRng(7);
    const s = crewState();
    const before = s.coins;
    const o = G.settleAway(s, h * 3600);
    ok(s.coins === before + o.coins, `coins add up at ${h} h`);
    ok(o.atBoss && s.top < G.LAYER, 'the crew stops at the Rock');
    res[h] = o;
  }
  ok(res[0.5].sieveCoins > 0, 'sieving pays after only 30 minutes');
  ok(res[2].sieveCoins > res[0.5].sieveCoins && res[8].sieveCoins > res[2].sieveCoins * 1.5, 'longer pays more');
  ok(res[8].sieveCoins < res[2].sieveCoins * 4, 'but with diminishing returns');
  ok(res[12].seconds === 12 * 3600 && res[40].seconds === 12 * 3600 && res[40].capped && !res[12].capped, 'capped at 12 hours, and says so');
  ok(res[12].sieveCoins === res[40].sieveCoins, 'past the cap nothing more');
  ok(res[8].sieveChests <= G.PARAMS.away.sieveChestMax, 'sieve chests are bounded');
  ok(typeof res[8].joke === 'number' && res[8].joke < G.PARAMS.away.jokes, 'a funny line is chosen');
}
{ // chests stack unopened; bones go to the Museum
  G.seedRng(3);
  const s = crewState();
  const o = G.settleAway(s, 12 * 3600);
  ok(s.chests === o.chests, 'chests are stacked, not opened');
  ok(Object.values(s.fossils).reduce((a, b) => a + b, 0) === o.bones, 'bones went to the Museum');
  ok(o.coins >= o.boneCoins, 'bone coins are part of the total');
}
{ // the Rock is untouched
  G.seedRng(5);
  const s = crewState();
  G.settleAway(s, 12 * 3600);
  ok(!s.boss || s.boss.hp === s.boss.max, 'the Rock is still the player\'s fight');
}
{ // a tea rush on the day you leave is not a rush for the whole absence
  const go = (job, ph) => { G.seedRng(11); const s = crewState(); s.foremanHere = true; s.crewJob = job; s.foreTea = { ph, t: 3 };
    return { s, o: G.settleAway(s, 2 * 3600) }; };
  const rush = go('tea', 'rush'), brk = go('tea', 'break'), plain = go('nearest', 'break');
  ok(rush.o.coins === brk.o.coins, 'leaving mid-rush pays the same as leaving mid-break');
  const F = G.PARAMS.foreman, avg = F.teaRush * F.teaMult / (F.teaBreak + F.teaRush);
  ok(Math.abs(rush.o.sieveCoins / plain.o.sieveCoins - avg) < 0.02, 'the tea job pays its average, not a free rush');
  ok(rush.s.foreTea.ph === 'break' && rush.s.foreTea.t === 0, 'the rush is over when you are back');
}
{ // a crew wish counts only for the blocks it had left
  const go = left => { G.seedRng(12); const s = crewState(); s.wingBoon = { kind: 'crew', left }; return { s, o: G.settleAway(s, 4 * 3600) }; };
  const none = go(0), few = go(5), huge = go(1e9);
  ok(few.o.sieveCoins >= none.o.sieveCoins && few.o.sieveCoins < none.o.sieveCoins * 1.05, 'a short wish adds almost nothing to a long absence');
  ok(few.s.wingBoon.left === 0, 'a used-up wish is gone');
  ok(huge.s.wingBoon.left > 0 && huge.o.sieveCoins > none.o.sieveCoins * 1.5, 'a wish that outlasts the absence still helps, and is not all spent');
}
{ // time away is spent once: rows walked (base and past beaten Rocks) plus sieving fit in the absence
  const mk = perk => { G.seedRng(5); const q = G.newState(); q.starBoss = 1; if (perk) q.starUp.tr_camp = 5;
    for (let i = 0; i < 6; i++) q.diggers.push({ c: 0, r: 0, tc: -1, tr: -1, cd: 0, swing: 0 });
    q.up.pick = 40; q.up.crew = 6; return q; };
  for (const perk of [false, true]) {
    const q = mk(perk), top0 = q.top, secs = 12 * 3600, dps = G.fold('awayDps', q, 0);
    const o = G.settleAway(q, secs);
    let spent = 0;
    for (let r = top0; r < top0 + o.metres; r++) spent += G.dirtHp(r) * G.COLS * G.PARAMS.away.rowCost;
    spent += o.sieveSeconds * dps;
    ok(spent <= dps * secs * 1.001, `rows plus sieve fit in the absence (perk ${perk}): ${Math.round(spent)} vs ${Math.round(dps * secs)}`);
    if (perk) ok(o.passed > 0, 'the perk walked on');
  }
}
{ // save round trip and an old save
  const s = crewState();
  G.settleAway(s, 3600);
  const back = G.deserialize(G.serialize(s));
  ok(back && back.coins === s.coins && back.chests === s.chests, 'round trip');
  const old = JSON.parse(G.serialize(s)); delete old.chests; delete old.savedAt;
  ok(G.deserialize(JSON.stringify(old)).chests === 0, 'old save loads');
}
if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('Dig away OK');
