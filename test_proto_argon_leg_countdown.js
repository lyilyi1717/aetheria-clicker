// Test for Dynamic Leg Par & Bonus Time System (Argon Model). Run: node test_proto_argon_leg_countdown.js
import * as G from './digger-argon/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } else { console.log('ok - ' + msg); } };
const NO = () => {};
const freshState = (floor = 50, twist = '') => {
  G.seedRng(1);
  const s = G.newState();
  s.site = 'dunes';
  const r = G.siteRun(s);
  r.floor = floor;
  r.twist = twist;
  r.dynamicLegs = true;
  const legs = G.siteLegs(r);
  r.par = legs.reduce((acc, l) => acc + l.len, 0);
  r.started = true;
  return s;
};
const runTicks = (s, secs, ev = NO) => {
  const steps = Math.round(secs * 20);
  for (let i = 0; i < steps; i++) G.step(s, 0.05, ev);
};

console.log('Testing Argon Dynamic Leg Countdown & Bonus Time System...');

// 1. Constants & Blueprint Alignment
{
  ok(G.LEG_INIT_SECS === 60, 'LEG_INIT_SECS is 60 (initial brisk countdown)');
  ok(G.BOSS_BONUS_SECS === 30, 'BOSS_BONUS_SECS is 30 (interstitial Big Rock bonus time)');
  ok(G.GATE_BONUS_SECS === 45, 'GATE_BONUS_SECS is 45 (Gate boss bonus time)');
}

// 2. Initial site countdown & Dynamic Leg Par structure
{
  // 50m floor: 2 legs (25m Big Rock, 50m Gate)
  const s50 = freshState(50);
  const r50 = s50.run;
  const legs50 = G.siteLegs(r50);
  ok(legs50.length === 2, '50m site has exactly 2 legs');
  ok(legs50[0].len === 60, 'Leg 0 starts with initial 60s countdown: got ' + legs50[0].len);
  ok(legs50[1].len === 45, 'Leg 1 (Gate) awards 45s bonus time: got ' + legs50[1].len);
  ok(r50.par === 105, '50m site total par is 105s (1.75 min sprint, was 300s): got ' + r50.par);

  const c0 = G.legLeft(r50, 0);
  ok(c0.idx === 0 && c0.left === 60 && !c0.over, 'First leg starts with exactly 60s, not overtime');

  // 75m floor: 3 legs (25m Big Rock, 50m Big Rock, 75m Gate)
  const s75 = freshState(75);
  const legs75 = G.siteLegs(s75.run);
  ok(legs75.length === 3, '75m site has 3 legs');
  ok(legs75[0].len === 60, 'Leg 0 is 60s');
  ok(legs75[1].len === 30, 'Leg 1 (Big Rock) is 30s');
  ok(legs75[2].len === 45, 'Leg 2 (Gate) is 45s');
  ok(s75.run.par === 135, '75m site total par is 135s (2.25 min): got ' + s75.run.par);

  // 100m floor: 4 legs
  const s100 = freshState(100);
  const legs100 = G.siteLegs(s100.run);
  ok(legs100.length === 4, '100m site has 4 legs');
  ok(legs100[0].len === 60 && legs100[1].len === 30 && legs100[2].len === 30 && legs100[3].len === 45, '100m site legs: [60, 30, 30, 45]');
  ok(s100.run.par === 165, '100m site total par is 165s (2.75 min): got ' + s100.run.par);

  // Twist scaling: 'heavy' adds twist factor
  const sTwist = freshState(50, 'heavy');
  const legsTwist = G.siteLegs(sTwist.run);
  ok(legsTwist[0].len === Math.round(60 * 1.15), 'Twist increases leg lengths proportionally (got ' + legsTwist[0].len + ')');
}

// 3. Shattering Big Rock awards Bonus Time (+30s) + Banked Surplus
{
  const s = freshState(75);
  const events = [];
  const ev = (name, d) => events.push({ name, d });

  // Spend 20 seconds digging Leg 0 (60s allotted)
  runTicks(s, 20, ev);
  const cBefore = G.legLeft(s.run, 0);
  ok(Math.abs(cBefore.left - 40) < 0.1, 'After 20s, 40s remains on Leg 0 (actual: ' + cBefore.left + ')');

  // Shatter Big Rock at 25m
  s.bossesDown = 1;
  G.step(s, 0.05, ev);

  const doneEv = events.find(e => e.name === 'legDone');
  ok(doneEv !== undefined, 'legDone event emitted upon breaking Big Rock');
  ok(doneEv.d.idx === 0, 'legDone idx is 0');
  ok(Math.abs(doneEv.d.saved - 40) < 0.1, 'legDone banked surplus is 40s');
  ok(doneEv.d.bonus === 30, 'legDone bonus awarded is 30s');

  // Next leg (Leg 1) should now have: 30s bonus + 40s banked surplus = 70s!
  const cNext = G.legLeft(s.run, 1);
  ok(cNext.idx === 1, 'Current leg transitioned to index 1');
  ok(Math.abs(cNext.left - 70) < 0.1, 'Leg 1 starts with bonus time + banked surplus: 70s (actual: ' + cNext.left + ')');
  ok(!cNext.over, 'Leg 1 is not overtime');
}

// 4. Overtime Handling & "Failure is Free" Grace
{
  const s = freshState(50);
  const events = [];
  const ev = (name, d) => events.push({ name, d });

  // Run over the 60s limit into overtime (75s total = 15s overtime)
  runTicks(s, 75, ev);
  const cOver = G.legLeft(s.run, 0);
  ok(cOver.over === true, 'Timer in overtime: c.over is true');
  ok(cOver.left < 0, 'c.left is negative in overtime: ' + cOver.left);
  ok(!s.run.done, 'Time expiry is NOT game over (Failure is Free)');

  // Now break Big Rock 1 while in overtime
  s.bossesDown = 1;
  G.step(s, 0.05, ev);

  const doneEv = events.find(e => e.name === 'legDone');
  ok(doneEv !== undefined, 'legDone emitted on overtime completion');
  ok(doneEv.d.saved === 0, 'Surplus time is zeroed in overtime (saved === 0)');

  // Next leg (Leg 1) starts with fresh Gate bonus time (+45s) with NO negative penalty
  const cNext = G.legLeft(s.run, 1);
  ok(cNext.idx === 1, 'Transitions to leg 1');
  ok(cNext.left === 45, 'Leg 1 begins fresh with 45s bonus time (no negative penalty carried over)');
  ok(!cNext.over, 'Leg 1 clock resets from red overtime back to active positive countdown');
}

// 5. Gate Defeat & Surplus Time Banking into Star Multipliers
{
  const s = freshState(50);
  const events = [];
  const ev = (name, d) => events.push({ name, d });

  // Complete entire 50m site in 45s (par is 105s, surplus is 60s)
  runTicks(s, 45, ev);
  s.bossesDown = 2; // Both 25m Big Rock and 50m Gate down
  G.step(s, 0.05, ev);

  ok(s.run.done, 'Site is finished');
  ok(Math.abs(s.run.time - 45) < 0.1, 'Recorded time is ~45s (got ' + s.run.time + ')');
  ok(s.run.medals.fast === 1, 'Fast medal awarded (finished under 105s par)');
  ok(Math.abs(s.run.surplusSecs - 60) < 0.1, 'Surplus banked seconds recorded as ~60s (got ' + s.run.surplusSecs + ')');
  ok(s.run.surplusMul > 1.0, 'Surplus multiplier applied (> 1.0): got ' + s.run.surplusMul);

  const finishEv = events.find(e => e.name === 'siteFinished');
  ok(finishEv !== undefined, 'siteFinished event emitted');
  ok(finishEv.d.fast === true, 'finish event records fast: true');
  ok(Math.abs(finishEv.d.surplusSecs - 60) < 0.1, 'finish event records surplusSecs');
  ok(finishEv.d.surplusMul > 1.0, 'finish event records surplusMul');

  // Deep excavation star bonus preserves surplus multiplier
  s.best = 70; // 20m deeper than 50m Gate
  const deepStars = G.starsFor(s);
  ok(deepStars > 0, 'Deep excavation stars rewarded and boosted by surplus multiplier: ' + deepStars);
}

// 6. Backward Compatibility & Clamping Bounds
{
  // Ensure boundedSiteLegs with explicit par still splits proportionally
  const boundedLegs = G.boundedSiteLegs({ floor: 50, par: 600 });
  ok(boundedLegs.reduce((sum, l) => sum + l.len, 0) === 600, 'boundedSiteLegs with custom par sums to 600');

  // Ensure boundedPar stays within [MIN_PAR, MAX_PAR]
  const bp = G.boundedPar(50, '');
  ok(bp >= G.MIN_PAR && bp <= G.MAX_PAR, 'boundedPar is within [300, 720]: ' + bp);

  // Dynamic runPar clamped to MAX_PAR
  const rBig = { floor: 350, dynamicLegs: true, par: 850 };
  ok(G.runPar(rBig) <= G.MAX_PAR, 'runPar clamped to MAX_PAR (720)');
}

if (failed) {
  console.error(`\n${failed} check(s) failed in test_proto_argon_leg_countdown.js`);
  process.exit(1);
}
console.log('\nAll test_proto_argon_leg_countdown tests passed successfully!');
