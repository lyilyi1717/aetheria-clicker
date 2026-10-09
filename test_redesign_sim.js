// Core-loop redesign sim (sim/redesign/): determinism and invariants on a short horizon. The full-year
// targets run with `node sim/redesign/run.mjs --assert` (about 30 s for the four profiles).
import assert from 'node:assert/strict';
import { simulate, checkTargets } from './sim/redesign/run.mjs';
import { PROFILES } from './sim/redesign/profiles.mjs';

const DAYS = 30;
// Everything a run decides, as one string: same seed must give the same string (T11)
const fingerprint = (r) => JSON.stringify({
  t: r.s.t, crude: r.s.crude, gens: r.s.gens, fields: r.s.totalFields, chronicles: r.s.chronicles,
  frontier: r.s.fields.map(f => f.F), frac: r.s.frac.map(f => f.level), bubbles: r.s.bubbles.length,
  events: r.s.events.length, rng: r.s.rng
});

console.log('--- same seed, same year (T11) ---');
{
  const a = simulate('casual', 7, { days: DAYS }), b = simulate('casual', 7, { days: DAYS });
  assert.equal(fingerprint(a), fingerprint(b));
  const c = simulate('casual', 8, { days: DAYS });
  assert.notEqual(fingerprint(a), fingerprint(c), 'a different seed changes the rolls');
}

for (const name of Object.keys(PROFILES)) {
  console.log(`--- ${name}: invariants over ${DAYS} days ---`);
  const r = simulate(name, 1, { days: DAYS });
  const s = r.s;
  assert.equal(s.flags.overflow, false, 'numbers stay finite (T10)');
  assert.ok(s.t >= DAYS * 86400 - 1, 'the run reaches the horizon');
  // Rule 8: Away always earns Crude, and Material too once a Rig exists
  for (const p of r.probeOut) {
    assert.ok(p.away.crude > 0, `day ${p.day}: Away earns Crude`);
    if (p.watch.mat > 0) {
      assert.ok(p.away.mat > 0, `day ${p.day}: Away earns Materials once Rigs exist`);
      assert.ok(p.hands.mat > p.watch.mat && p.watch.mat > p.away.mat, `day ${p.day}: Hands-on > Watching > Away`);
    }
  }
  // Events are in time order and carry a hit level
  for (let i = 1; i < s.events.length; i++) assert.ok(s.events[i].t >= s.events[i - 1].t);
  assert.ok(s.events.every(e => [1, 2, 3, 4].includes(e.lvl)));
  // Progress happens: a New Field, Field grades, Orders, Bubbles
  assert.ok(s.totalFields >= 1 && s.fields.every(f => f.bestGrade >= 1));
  assert.ok(s.events.some(e => e.k === 'order') && s.events.some(e => e.k === 'bubble'));
  // The target checks run on any result
  const t = checkTargets(r);
  assert.ok(t.length >= 10 && t.every(x => typeof x.ok === 'boolean' && x.text));
}

console.log('redesign sim tests passed');
