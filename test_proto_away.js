// Dig feature: the return (time away). Run: node test_proto_away.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

const crewState = () => {
  const s = G.newState();
  s.coins = 1e9; s.total = 1e9; G.buy(s, 'crew'); for (let i = 0; i < 30; i++) G.buy(s, 'crewPow');
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
