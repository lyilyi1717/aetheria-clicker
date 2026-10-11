// CL-10: the proof sim (sim/core-loop.mjs) plays the sim/redesign year on the real core-loop
// systems. Short horizon here; the full-year targets run with `npm run sim:coreloop -- --assert`.
import assert from 'node:assert/strict';
import { simulate, targets } from './sim/core-loop.mjs';
import { simulate as simulateModel } from './sim/redesign/run.mjs';
import { PROFILES } from './sim/redesign/profiles.mjs';
import { serializeCoreLoop, createCoreLoopState } from './js/systems/coreloop/state.js';
import * as Presence from './js/systems/coreloop/Presence.js';
import * as Refinery from './js/systems/coreloop/Refinery.js';
import * as Fields from './js/systems/coreloop/Fields.js';

const DAYS = 14;
const fingerprint = (r) => JSON.stringify([serializeCoreLoop(r.g), r.run.events.length, r.run.recordTimes]);

console.log('--- same seed, same year (T11) ---');
{
  const a = simulate('casual', 7, { days: DAYS, probes: false }), b = simulate('casual', 7, { days: DAYS, probes: false });
  assert.equal(fingerprint(a), fingerprint(b));
  const c = simulate('casual', 8, { days: DAYS, probes: false });
  assert.notEqual(fingerprint(a), fingerprint(c), 'a different seed changes the rolls');
}

for (const name of Object.keys(PROFILES)) {
  console.log(`--- ${name}: invariants over ${DAYS} days, beside the model ---`);
  const r = simulate(name, 1, { days: DAYS });
  const g = r.g, ev = r.run.events;
  assert.ok(g.t >= DAYS * 86400 - 1, 'the run reaches the horizon');
  // Rule 8: Away always earns Crude, and Materials too once a Rig exists
  assert.ok(r.probeOut.length >= 2);
  for (const p of r.probeOut) {
    assert.ok(p.away.crude > 0, `day ${p.day}: Away earns Crude`);
    if (p.watch.mat > 0) {
      assert.ok(p.away.mat > 0, `day ${p.day}: Away earns Materials once Rigs exist`);
      assert.ok(p.hands.mat > p.watch.mat && p.watch.mat > p.away.mat, `day ${p.day}: Hands-on > Watching > Away`);
    }
  }
  for (let i = 1; i < ev.length; i++) assert.ok(ev[i].t >= ev[i - 1].t, 'events in time order');
  assert.ok(ev.every(e => [1, 2, 3, 4].includes(e.lvl)));
  assert.ok(g.prestige.totalFields >= 1 && g.fields.every(f => f.bestGrade >= 1), 'progress happens');
  assert.ok(ev.some(e => e.k === 'order') && ev.some(e => e.k === 'bubble'));
  // the target checks run on the game's year and the numbers are finite (T10)
  const t = targets(r);
  assert.ok(t.length >= 10 && t.every(x => typeof x.ok === 'boolean' && x.text));
  assert.equal(t.find(x => x.id === 'T10').ok, true);

  // The same fortnight in the model: the real systems land close to it
  const m = simulateModel(name, 1, { days: DAYS, probes: false }).s;
  const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${name}: ${what}: game ${a}, model ${b}`);
  near(Math.log10(g.well.bestEver.m) + g.well.bestEver.e, Math.log10(m.bestEver), 8, 'best run (decades)');
  // New Fields are compared within the same number of Chronicles: a Chronicle that lands a few
  // hours either side of the fortnight's end moves the count by a third on its own
  near(g.prestige.chronicles, m.chronicles, 1, 'Chronicles');
  if (g.prestige.chronicles === m.chronicles) near(g.prestige.totalFields, m.totalFields, Math.max(2, 0.25 * m.totalFields), 'New Fields');
  near(g.cauldrons.bubbles.length, m.bubbles.length, Math.max(3, 0.1 * m.bubbles.length), 'Bubbles');
  near(ev.filter(e => e.k === 'order').length, m.events.filter(e => e.k === 'order').length, Math.max(5, 0.1 * ev.length), 'Orders filled');
  g.fields.forEach((f, i) => near(f.bestGrade, m.fields[i].bestGrade, 1, `frontier grade of Field ${i}`));
}

console.log('--- wiring added with the sim ---');
{
  const g = createCoreLoopState();
  assert.equal(Presence.setHandField(g, 2), true);
  assert.equal(g.presence.handField, 2);
  assert.equal(Presence.setHandField(g, 3), false);
  assert.equal(Presence.setHandField(g, -1), false);
  assert.equal(g.presence.handField, 2);
  // a filled Order brings a Vial offer
  Refinery.postOrders(g);
  const o = g.refinery.orders[0];
  Fields.addMaterial(g, o.field, o.grade, o.qty);
  assert.equal(g.collection.vialOffers, 0);
  assert.equal(Refinery.fillOrder(g, 0), true);
  assert.equal(g.collection.vialOffers, 1);
}

console.log('core-loop proof sim tests passed');
