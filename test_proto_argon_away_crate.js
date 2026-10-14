// Unit test for ARGON-11: Crated Discovery on Idle Return
// Run: node test_proto_away_crate.js
import * as G from './digger-argon/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

const crewState = () => {
  const s = G.newState();
  s.coins = 1e9; s.total = 1e9; G.buy(s, 'crew'); for (let i = 0; i < 30; i++) G.buy(s, 'pick');
  s.coins = 0; s.total = 0;
  return s;
};

console.log('Testing ARGON-11: Crated Discovery on Idle Return...');

// 1. BLOCKS.crate and BLOCKS.CRATE registration
ok(G.BLOCKS.crate, 'BLOCKS.crate registered');
ok(G.BLOCKS.CRATE === G.BLOCKS.crate, 'BLOCKS.CRATE alias exists');
ok(G.BLOCKS.crate.hp === 3, 'crate block default hp is 3');

// 2. Absence < 10 minutes (e.g. 5 minutes = 300s): no crate
{
  G.seedRng(1);
  const s = crewState();
  const o = G.settleAway(s, 300);
  ok(!o.hasCrate, 'absence < 10m does not set hasCrate');
  ok(!s.away || !s.away.pendingSpoils, 'no pendingSpoils for short absence');
  let foundCrate = false;
  for (const row of s.rows) {
    if (row && row.some(c => c && c.t === 'crate')) foundCrate = true;
  }
  ok(!foundCrate, 'no crate block on grid for absence < 10m');
}

// 3. Absence >= 10 minutes (e.g. 15 minutes = 900s): places crate at deepest cleared row
{
  G.seedRng(42);
  const s = crewState();
  const beforeCoins = s.coins;
  const o = G.settleAway(s, 900, null, { deferSpoils: true });

  ok(o.hasCrate, 'hasCrate is true for absence >= 10m');
  ok(s.away && s.away.pendingSpoils, 'pendingSpoils is recorded in state');
  ok(s.away.pendingSpoils.coins === o.coins, 'pendingSpoils contains full offline coin spoils');
  ok(s.coins === beforeCoins, 'offline coins deferred into crate (not yet added to wallet)');

  const cratePos = s.away.crate;
  ok(cratePos && typeof cratePos.r === 'number' && typeof cratePos.c === 'number', 'crate coordinates recorded');
  const cell = G.cellAt(s, cratePos.r, cratePos.c);
  ok(cell && cell.t === 'crate', 'crate block placed at excavation floor');
  ok(cell.hp === 3, 'crate cell has 3 hp');

  // 4. Fixed 3-hit health independent of pick damage
  s.up.pick = 50; // give enormous pick power
  const pPower = G.pickPower(s);
  ok(pPower > 100, 'pick power is very high: ' + pPower);

  // Hit 1: deals 1 damage to crate, doesn't break
  G.swing(s, cratePos.r, cratePos.c);
  ok(G.cellAt(s, cratePos.r, cratePos.c) !== null, 'hit 1 does not break crate');
  ok(cell.hp === 2, 'crate HP is 2 after 1st hit');
  ok(s.coins === beforeCoins, 'coins still not awarded after hit 1');

  // Hit 2: deals 1 damage to crate, doesn't break
  G.swing(s, cratePos.r, cratePos.c);
  ok(G.cellAt(s, cratePos.r, cratePos.c) !== null, 'hit 2 does not break crate');
  ok(cell.hp === 1, 'crate HP is 1 after 2nd hit');
  ok(s.coins === beforeCoins, 'coins still not awarded after hit 2');

  // Hit 3: breaks crate, awards all offline earnings in physical burst
  let eventDispatched = false;
  let eventSpoils = null;
  const evHandler = (kind, d) => {
    if (kind === 'unpackSpoils') {
      eventDispatched = true;
      eventSpoils = d;
    }
  };

  G.swing(s, cratePos.r, cratePos.c, evHandler);
  ok(G.cellAt(s, cratePos.r, cratePos.c) === null, 'hit 3 breaks crate and clears cell');
  ok(eventDispatched, 'unpackSpoils event emitted on 3rd hit');
  ok(eventSpoils && eventSpoils.coins === o.coins, 'event carries full offline spoils');
  ok(s.coins === beforeCoins + o.coins, 'all offline earnings awarded upon opening crate');
}

if (failed) {
  console.error(`FAIL: ${failed} check(s) failed in test_proto_away_crate.js`);
  process.exit(1);
}
console.log('test_proto_away_crate: ok');
