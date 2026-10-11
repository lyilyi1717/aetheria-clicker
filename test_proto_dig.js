// The Dig prototype's rules (proto/game.js). Run: node test_proto_dig.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const clearRow = (s, i) => { for (let c = 0; c < G.COLS; c++) s.rows[i][c] = null; };

{ // a fresh dig: hitting the top row breaks a block and pays
  const s = G.newState();
  ok(s.rows.length === G.KEEP_ROWS && s.rows[0].length === G.COLS, 'grid shape');
  ok(G.reachable(s, 0, 3), 'the top row can always be hit');
  ok(!G.reachable(s, 3, 3), 'a buried block cannot be hit');
  ok(!G.swing(s, 3, 3), 'swinging at a buried block does nothing');
  s.rows[0][3] = { t: 'dirt', hp: 1, max: 1, s: 0 };
  const seen = [];
  G.swing(s, 0, 3, k => seen.push(k));
  ok(s.rows[0][3] === null, 'the block broke');
  ok(s.coins >= 1 && s.total === s.coins, 'it paid');
  ok(seen.includes('break'), 'a break event was sent');
  ok(G.reachable(s, 1, 3), 'the block under an opening can be hit');
}
{ // buying
  const s = G.newState();
  ok(!G.buy(s, 'pick'), 'cannot buy with no coins');
  s.coins = 1000;
  const before = G.pickPower(s);
  ok(G.buy(s, 'pick') && G.pickPower(s) > before, 'a pick level raises the hit');
  ok(G.buy(s, 'crew') && s.diggers.length === 1, 'hiring adds a digger');
  s.up.crewPow = 12;
  for (let i = 0; i < 400; i++) G.step(s, 0.05);
  ok(s.total > 0, 'a digger earns by itself');
  ok(s.coins >= 0, 'coins never go below zero');
}
{ // a Big Rock holds until it is broken, and a blast does not pass it
  const s = G.newState();
  for (let n = 0; n < G.LAYER - 3; n++) { clearRow(s, 0); G.step(s, 0.01); }
  const i = G.LAYER - s.top;
  ok(G.isBossRow(s.top + i) && s.rows[i][0].t === 'boss', 'the Big Rock is at 25 m');
  for (let k = 0; k < i; k++) clearRow(s, k);
  s.rows[i - 1][4] = { t: 'tnt', hp: 1, max: 1, s: 0 };
  s.relics.bang = 2;
  s.rows[i - 1][5] = null;
  G.swing(s, s.top + i - 1, 4);
  for (let n = 0; n < 40; n++) G.step(s, 0.05);
  ok(s.rows[G.LAYER - s.top][0] && s.rows[G.LAYER - s.top][0].t === 'boss', 'the Big Rock survived the blast');
  ok(s.rows[G.LAYER - s.top + 1].every(c => c && c.hp === c.max), 'nothing behind it was touched');
  const boss = G.bossInView(s);
  s.up.pick = 60;
  let guard = 0;
  while (boss.hp > 0 && guard++ < 500) G.swing(s, G.LAYER, 0);
  ok(s.bossesDown === 1 && s.chests >= 1, 'breaking it counts and leaves a chest');
}
{ // chests and relics
  const s = G.newState();
  s.chests = 1;
  const offer = G.rollDraft(s);
  ok(offer.length === 3 && new Set(offer).size === 3, 'a chest offers three different relics');
  ok(G.takeRelic(s, offer[0]) && s.relics[offer[0]] === 1 && s.chests === 0, 'taking one uses the chest');
  ok(!G.takeRelic(s, offer[1]), 'no chest, no relic');
}
{ // saving
  const s = G.newState();
  s.coins = 123; s.relics.vein = 2; s.fossils['camel.1'] = 1; s.stars = 4;
  const back = G.deserialize(G.serialize(s));
  ok(back && back.coins === 123 && back.relics.vein === 2 && back.stars === 4 && back.fossils['camel.1'] === 1, 'a save comes back whole');
  ok(G.deserialize('nonsense') === null && G.deserialize('{"v":99}') === null, 'a bad save is refused, not loaded');
  const old = JSON.parse(G.serialize(s)); delete old.site; delete old.seen;
  ok(G.deserialize(JSON.stringify(old)).site === 'dunes', 'a save without newer fields gets their defaults');
}
{ // time away: never a loss, and the crew waits at a Big Rock
  const s = G.newState();
  const none = G.settleAway(s, 3600);
  ok(none.coins === 0 && s.coins === 0, 'no diggers, nothing changes');
  s.coins = 1e9; G.buy(s, 'crew'); for (let i = 0; i < 30; i++) G.buy(s, 'crewPow');
  const coins = s.coins;
  const out = G.settleAway(s, 8 * 3600);
  ok(out.coins > 0 && s.coins === coins + out.coins, 'time away pays');
  ok(out.atBoss && s.top < G.LAYER, 'the crew stops at the Big Rock');
  ok(G.settleAway(s, 1e9).seconds <= G.P.offlineCapHours * 3600, 'time away is capped, not punished');
}
{ // a new site keeps Stars and the Museum
  const s = G.newState();
  ok(!G.newSite(s, 'boom'), 'not before the second Big Rock');
  s.bossesDown = 2; s.best = 60; s.fossils['camel.0'] = 1; s.sets.camel = true; s.relics.vein = 3; s.coins = 500;
  ok(G.newSite(s, 'boom'), 'a new site opens after the second Big Rock');
  ok(s.stars > 0 && s.site === 'boom' && s.sets.camel && s.fossils['camel.0'] === 1, 'Stars and the Museum are kept');
  ok(s.coins === 0 && !s.relics.vein && s.top === 0 && s.bossesDown === 0, 'the dig itself starts over');
}

if (failed) { console.error(`${failed} check(s) failed`); process.exit(1); }
console.log('Dig prototype rules OK');
