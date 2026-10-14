// Test Depth Bounds & Dirt Hardness Normalization (ARGON-05). Run: node test_proto_depth_bounds.js
import * as G from './digger-argon/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

console.log('Testing ARGON-05: Depth Bounds & Dirt Hardness Normalization...');

{ // 1. Constants & Limits
  ok(G.MAX_SITE_DEPTH === 350, 'MAX_SITE_DEPTH is 350');
  ok(G.MAX_LEGS === 10, 'MAX_LEGS is 10');
  ok(G.MIN_PAR === 300, 'MIN_PAR is 300');
  ok(G.MAX_PAR === 720, 'MAX_PAR is 720');
}

{ // 2. Site legs clamping
  for (let floor = 25; floor <= 400; floor += 25) {
    const legsBounded = G.boundedSiteLegs({ floor, par: 600 });
    ok(legsBounded.length <= G.MAX_LEGS, `bounded legs length ${legsBounded.length} <= MAX_LEGS (10) for floor ${floor}`);
    ok(legsBounded.reduce((acc, l) => acc + l.len, 0) === 600, `bounded legs sum to par for floor ${floor}`);
  }
  const maxSite = G.boundedSiteLegs({ floor: G.MAX_SITE_DEPTH, par: 720 });
  ok(maxSite.length <= G.MAX_LEGS, 'max site legs <= 10');
  ok(maxSite.reduce((a, b) => a + b.len, 0) === 720, 'legs sum to 720');
}

{ // 3. Dirt HP Scaling & Bounded Formula
  const base10 = G.boundedDirtHp(10);
  const base100 = G.boundedDirtHp(100);
  const base350 = G.boundedDirtHp(350);
  ok(base100 > base10, 'dirt HP increases monotonically with depth');
  ok(base350 > base100, 'dirt HP at max depth is higher than mid-depth');

  // Check formula: baseHp * (1 + 0.04 * r) * biomeFactor * eraScale
  const expected350 = Math.round(5 * (1 + 0.04 * 350) * 1.5 * 2.0);
  const actual350 = G.boundedDirtHp(350, 1.5, 2.0);
  ok(actual350 === expected350, `dirtHp at row 350 matches formula: got ${actual350}, expected ${expected350}`);
}

{ // 4. Hits-to-break clamped in [1, 4] for nominal progression
  for (let r = 0; r <= G.MAX_SITE_DEPTH; r += 25) {
    const nominalP = G.nominalPickPower(r);
    const hits = G.clampHits(r, nominalP);
    ok(hits >= 1 && hits <= 4, `hits to break at row ${r} is within [1, 4]: got ${hits}`);
  }
}

{ // 5. Par time bounds in [300, 720] seconds
  for (let floor = 25; floor <= 500; floor += 25) {
    const par = G.boundedPar(floor, '');
    ok(par >= G.MIN_PAR && par <= G.MAX_PAR, `bounded par for floor ${floor} is in [300, 720]: got ${par}`);
    const heavyPar = G.boundedPar(floor, 'heavy');
    ok(heavyPar >= G.MIN_PAR && heavyPar <= G.MAX_PAR, `bounded par with twist for floor ${floor} is in [300, 720]: got ${heavyPar}`);
  }

  const runSample = { floor: 350, par: 850 };
  const p = G.runPar(runSample);
  ok(p <= G.MAX_PAR, `runPar is clamped to MAX_PAR (720): got ${p}`);
}

if (failed) {
  console.error(`${failed} check(s) failed in test_proto_depth_bounds.js`);
  process.exit(1);
}
console.log('test_proto_depth_bounds: ok');
