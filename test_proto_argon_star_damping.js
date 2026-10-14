// Test Star Damping & Keystones Wallet (ARGON-06). Run: node test_proto_star_damping.js
import * as G from './digger-argon/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

console.log('Testing ARGON-06: Three-Tier Economy Normalization & Star Damping...');

{ // 1. Three-tier starStepCost curve evaluation
  // Base step
  ok(G.starStepCost(0) === 2, `starStepCost(0) === 2: got ${G.starStepCost(0)}`);
  
  // Tier 1 (n <= 20)
  const cost20 = G.starStepCost(20);
  ok(cost20 === Math.round(2 * Math.pow(1.5, 20)), `starStepCost(20) is 2 * 1.5^20 (${cost20})`);
  ok(cost20 === 6651, `starStepCost(20) is 6651: got ${cost20}`);

  // Tier 2 (20 < n <= 50)
  const cost21 = G.starStepCost(21);
  ok(cost21 === Math.round(cost20 * 1.25), `starStepCost(21) uses 1.25 multiplier: got ${cost21}`);
  const cost50 = G.starStepCost(50);
  ok(cost50 > cost20, `starStepCost(50) > starStepCost(20): ${cost50} > ${cost20}`);

  // Tier 3 (n > 50)
  const cost51 = G.starStepCost(51);
  ok(cost51 > cost50, `starStepCost(51) > starStepCost(50): ${cost51} > ${cost50}`);
  const cost100 = G.starStepCost(100);
  ok(cost100 <= 1e14, `starStepCost(100) is bounded <= 1e14: got ${cost100}`);
  ok(cost100 >= 1e8, `starStepCost(100) provides meaningful late-game sink: got ${cost100}`);

  // Strict monotonicity across 0 to 100
  let prev = 0;
  for (let n = 0; n <= 100; n++) {
    const c = G.starStepCost(n);
    ok(c > prev, `starStepCost is strictly monotonic at step ${n}: ${c} > ${prev}`);
    prev = c;
  }
}

{ // 2. Keystones discrete wallet
  const s = G.newState();
  ok(s.keystones !== undefined, 's.keystones is defined in state');
  const expectedTypes = ['aquifer', 'magma', 'cog', 'spore', 'astral'];
  for (const t of expectedTypes) {
    ok(s.keystones[t] === 0, `keystone ${t} initialized to 0`);
    ok(G.hasKeystone(s, t) === false, `hasKeystone(${t}) is false initially`);
  }
  ok(G.totalKeystones(s) === 0, 'totalKeystones is initially 0');

  // Award keystones
  G.awardKeystone(s, 'aquifer');
  G.awardKeystone(s, 'magma', 3);
  ok(s.keystones.aquifer === 1, 'aquifer keystone count is 1');
  ok(s.keystones.magma === 3, 'magma keystone count is 3');
  ok(G.hasKeystone(s, 'aquifer') === true, 'hasKeystone(aquifer) is true');
  ok(G.hasKeystone(s, 'magma') === true, 'hasKeystone(magma) is true');
  ok(G.totalKeystones(s) === 4, 'totalKeystones is 4');

  // Test reset survival
  G.reset(s, 'site');
  ok(s.keystones.aquifer === 1 && s.keystones.magma === 3, 'keystones survive site reset');
  G.reset(s, 'land');
  ok(s.keystones.aquifer === 1 && s.keystones.magma === 3, 'keystones survive land reset');
}

if (failed) {
  console.error(`${failed} check(s) failed in test_proto_star_damping.js`);
  process.exit(1);
}
console.log('test_proto_star_damping: ok');
