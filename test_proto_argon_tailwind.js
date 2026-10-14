// Unit test for ARGON-12: Grandpa's Tailwind (Zero-FOMO 48h Absence Catch-Up)
// Run: node test_proto_tailwind.js
import * as G from './digger-argon/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

console.log("Testing ARGON-12: Grandpa's Tailwind...");

// 1. Initial state
const s = G.newState();
ok(s.tailwind && s.tailwind.charges === 0, 'tailwind initialized with 0 charges');
ok(G.tailwindCharges(s) === 0, 'tailwindCharges helper returns 0');

// Default mods
ok(G.fold('crewSpeed', s, 1) === 1, 'default crewSpeed multiplier is 1x');
ok(G.fold('gateBankShare', s, 0.6) === 0.6, 'default gateBankShare is 0.60');

// 2. Absence < 48 hours (e.g. 24h = 86400s) does not trigger Tailwind
let awarded = false;
const evHandler = (kind, d) => { if (kind === 'tailwindAwarded') awarded = true; };
G.checkTailwind(s, 24 * 3600, evHandler);
ok(!awarded, '24 hours absence does not trigger Tailwind');
ok(G.tailwindCharges(s) === 0, 'charges remain 0 after 24h');

G.checkTailwind(s, 47.9 * 3600, evHandler);
ok(!awarded, '47.9 hours absence does not trigger Tailwind');
ok(G.tailwindCharges(s) === 0, 'charges remain 0 after 47.9h');

// 3. Absence >= 48 hours (e.g. 48h = 172800s) awards exactly 3 charges
G.checkTailwind(s, 48 * 3600, evHandler);
ok(awarded, '48 hours absence triggers tailwindAwarded event');
ok(s.tailwind.charges === 3, 'awards exactly 3 charges');
ok(G.tailwindCharges(s) === 3, 'tailwindCharges returns 3');

// Re-check: does not re-award if charges already > 0
awarded = false;
G.checkTailwind(s, 72 * 3600, evHandler);
ok(!awarded, 'does not overwrite existing charges');
ok(s.tailwind.charges === 3, 'charges remain 3');

// 4. While charges > 0: Rafeeq speed is 2x and Gate damage banking is 80%
ok(G.fold('crewSpeed', s, 1) === 2, 'crewSpeed mod is 2.0x during Tailwind');
ok(G.fold('gateBankShare', s, 0.6) === 0.8, 'gateBankShare mod is 0.80 during Tailwind');

// Test crewRate and crewWalk doubling
const baseRate = G.PARAMS.diggers ? G.PARAMS.diggers.rate : 4;
const baseWalk = G.PARAMS.diggers ? G.PARAMS.diggers.walk : 6;
ok(G.crewRate(s) === baseRate * 2, 'crewRate is doubled');
ok(G.crewWalk(s) === baseWalk * 2, 'crewWalk is doubled');

// 5. Charges decrement cleanly upon site completion
// Site 1 completion
G.consumeTailwindCharge(s);
ok(s.tailwind.charges === 2, 'charges decrement to 2 after 1st site');
ok(G.fold('crewSpeed', s, 1) === 2, 'buffs remain active at 2 charges');
ok(G.fold('gateBankShare', s, 0.6) === 0.8, 'gate banking remains 0.80 at 2 charges');

// Site 2 completion (via hook)
G.run('siteFinished', s);
ok(s.tailwind.charges === 1, 'charges decrement to 1 after 2nd site via siteFinished hook');
ok(G.fold('crewSpeed', s, 1) === 2, 'buffs remain active at 1 charge');

// Site 3 completion
G.run('siteFinished', s);
ok(s.tailwind.charges === 0, 'charges decrement to 0 after 3rd site');

// 6. When charges reach 0, buffs expire cleanly
ok(G.fold('crewSpeed', s, 1) === 1, 'crewSpeed returns to 1.0x when charges depleted');
ok(G.fold('gateBankShare', s, 0.6) === 0.6, 'gateBankShare returns to 0.60 when charges depleted');
ok(G.crewRate(s) === baseRate, 'crewRate returns to base rate');
ok(G.crewWalk(s) === baseWalk, 'crewWalk returns to base walk');

// Extra site finished does not drop below 0
G.consumeTailwindCharge(s);
ok(s.tailwind.charges === 0, 'charges do not drop below 0');

// 7. Test integration with settleAway(s, seconds)
{
  const s2 = G.newState();
  s2.coins = 1e9; s2.total = 1e9; G.buy(s2, 'crew');
  s2.coins = 0;
  G.settleAway(s2, 50 * 3600);
  ok(s2.tailwind && s2.tailwind.charges === 3, 'settleAway with 50h absence awards Tailwind in full flow');
}

if (failed) {
  console.error(`FAIL: ${failed} check(s) failed in test_proto_tailwind.js`);
  process.exit(1);
}
console.log('test_proto_tailwind: ok');
