// CL-1: Presence, Heat, Gushers (js/systems/coreloop/Presence.js)
import assert from 'node:assert/strict';
import { P } from './js/systems/coreloop/params.js';
import { createCoreLoopState, serializeCoreLoop, deserializeCoreLoop } from './js/systems/coreloop/state.js';
import { PRESENCE, HIT, makeContext } from './js/systems/coreloop/shared.js';
import { presenceOf, noteInput, heat, step, gusherUp, gusherLeft, canCatchGusher, catchGusher, gusherInterval } from './js/systems/coreloop/Presence.js';
import { newState as simState, advance as simAdvance } from './sim/redesign/model.mjs';

const fresh = (charter = 'none') => { const s = createCoreLoopState(); s.prestige.charter = charter; return s; };
// the driver's job: step at the start of the interval, then advance the clock
const tick = (s, dt, pr, ctx) => { step(s, dt, pr, ctx); s.t += dt; };

console.log('--- state from input age (30 s) ---');
{
  const s = fresh();
  assert.equal(P.handsWindow, 30);
  assert.equal(presenceOf(s), PRESENCE.WATCH, 'lastInputAt is -Infinity on a fresh state');
  s.t = 1000; noteInput(s);
  assert.equal(presenceOf(s), PRESENCE.HANDS);
  s.t = 1030; assert.equal(presenceOf(s), PRESENCE.HANDS, 'exactly 30 s is still hands-on');
  s.t = 1030.01; assert.equal(presenceOf(s), PRESENCE.WATCH);
  noteInput(s); assert.equal(presenceOf(s), PRESENCE.HANDS);
  const l = deserializeCoreLoop(JSON.parse(JSON.stringify(serializeCoreLoop(s))));
  assert.equal(presenceOf(l), PRESENCE.WATCH, 'a loaded game starts Watching, not hands-on');
}

console.log('--- Heat ramps 1 to 2 over 60 s and resets ---');
{
  const s = fresh();
  assert.equal(heat(s), 1);
  for (let i = 0; i < 30; i++) tick(s, 1, PRESENCE.HANDS);
  assert.equal(heat(s), 1.5);
  for (let i = 0; i < 30; i++) tick(s, 1, PRESENCE.HANDS);
  assert.equal(heat(s), 2);
  for (let i = 0; i < 100; i++) tick(s, 1, PRESENCE.HANDS);
  assert.equal(heat(s), 2, 'capped at 2');
  tick(s, 1, PRESENCE.WATCH);
  assert.equal(heat(s), 1, 'leaving hands-on resets Heat');
  tick(s, 10, PRESENCE.HANDS); tick(s, 5, PRESENCE.AWAY);
  assert.equal(s.presence.heatSeconds, 0);
  assert.equal(s.presence.state, PRESENCE.AWAY);
}

console.log('--- Heat matches the sim on the same inputs ---');
{
  const sim = simState({ charter: 'none', gusherCatch: 0 });
  const g = fresh();
  for (const [dt, st] of [[5, 'hands'], [5, 'hands'], [20, 'hands'], [30, 'watch'], [5, 'hands'], [40, 'hands'], [30, 'hands']]) {
    simAdvance(sim, dt, st);
    tick(g, dt, st);
    assert.equal(g.presence.heatSeconds, sim.heatT);
    assert.equal(heat(g), 1 + Math.min(1, sim.heatT / P.heatRamp));
  }
}

console.log('--- Gusher schedule is deterministic from the clock and RNG ---');
{
  const run = (seed) => {
    const s = fresh(); s.rng = seed;
    const ups = [];
    for (let i = 0; i < 3000; i++) { tick(s, 1, PRESENCE.WATCH); if (gusherUp(s) && !ups.includes(s.presence.nextGusherAt)) ups.push(s.presence.nextGusherAt); }
    return ups;
  };
  assert.deepEqual(run(7), run(7));
  assert.notDeepEqual(run(7), run(8));
  const a = fresh(); tick(a, 1, PRESENCE.WATCH);
  const b = JSON.parse(JSON.stringify({ t: a.t, rng: a.rng, p: a.presence }));
  assert.ok(a.presence.nextGusherAt > a.t, 'scheduled on the first step');
  assert.ok(Math.abs(b.p.nextGusherAt - b.t - P.gusherEvery) <= P.gusherEvery / 2 + 1e-9, 'within 0.5x..1.5x of the interval');
}

console.log('--- the wait counts Watching time only ---');
{
  const s = fresh(); tick(s, 1, PRESENCE.WATCH);
  const at = s.presence.nextGusherAt;
  for (let i = 0; i < 20; i++) tick(s, 300, PRESENCE.AWAY);
  assert.equal(s.presence.nextGusherAt, at + 6000, 'Away time pushes the Gusher back by the time spent');
  assert.ok(!gusherUp(s));
  assert.ok(!canCatchGusher(s));
}

console.log('--- catching a Gusher ---');
{
  const s = fresh(); tick(s, 1, PRESENCE.WATCH);
  while (!gusherUp(s)) tick(s, 1, PRESENCE.WATCH);
  assert.ok(gusherLeft(s) > 0 && gusherLeft(s) <= P.gusherWindow);
  assert.ok(canCatchGusher(s));
  const ctx = makeContext();
  const r = catchGusher(s, ctx);
  assert.ok(r); assert.equal(r.seconds, P.gusherSeconds); assert.equal(r.presence, PRESENCE.WATCH);
  assert.deepEqual(ctx.events, [{ kind: 'gusher', level: HIT.MINOR }]);
  assert.ok(!gusherUp(s), 'a catch clears it and schedules the next');
  assert.equal(catchGusher(s, ctx), false);
  assert.equal(ctx.events.length, 1);
  // a missed one expires after the window and the next is scheduled
  while (!gusherUp(s)) tick(s, 1, PRESENCE.WATCH);
  for (let i = 0; i < P.gusherWindow + 2; i++) tick(s, 1, PRESENCE.WATCH);
  assert.ok(!gusherUp(s)); assert.equal(catchGusher(s), false);
  assert.ok(s.presence.nextGusherAt > s.t);
  // Presence.js writes nothing outside state.presence
  const before = JSON.stringify(serializeCoreLoop({ ...s, presence: null }));
  tick(s, 1, PRESENCE.HANDS); noteInput(s);
  assert.equal(JSON.stringify(serializeCoreLoop({ ...s, presence: null })).replace(/"t":[^,]*,/, ''), before.replace(/"t":[^,]*,/, ''));
}

console.log('--- Gusher rate matches the sim, Operator doubles it ---');
{
  for (const charter of ['none', 'operator']) {
    const sim = simState({ charter, gusherCatch: 1 }, 3); sim.log = true; sim.events = [];
    let simN = 0;
    const g = fresh(charter); g.rng = 3;
    let gameN = 0;
    const T = 400 * 3600;
    for (let t = 0; t < T; t += 10) {
      const before = sim.events?.length ?? 0;
      simAdvance(sim, 10, 'watch');
      simN += (sim.events || []).slice(before).filter(e => e.k === 'gusher').length;
      tick(g, 10, PRESENCE.WATCH);
      if (canCatchGusher(g)) { catchGusher(g); gameN++; }
    }
    const expected = T / gusherInterval(g);
    assert.equal(gusherInterval(g), P.gusherEvery / (charter === 'operator' ? 2 : 1));
    assert.ok(Math.abs(gameN - expected) / expected < 0.08, `${charter}: game ${gameN} vs ${expected}`);
    assert.ok(simN > 0 && Math.abs(simN - expected) / expected < 0.2, `${charter}: sim ${simN}`);
  }
}
console.log('OK');
