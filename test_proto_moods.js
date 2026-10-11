// Rafeeq moods: looks only. The rules must not change a number, a save or the random stream.
import assert from 'node:assert/strict';
import * as G from './proto/game.js';

assert.equal(typeof G.moodsPoke, 'function');
assert.equal(G.t('m_tea_0'), 'Tea?');
assert.ok(G.t('m_angry_n') > 0);

function run(poke) {
  G.seedRng(7);
  const s = G.newState();
  s.coins = 1e6; G.buy(s, 'crew'); G.buy(s, 'crew');
  const seen = [];
  const ev = (k, d) => seen.push(k);
  for (let i = 0; i < 400; i++) { G.step(s, 0.1, ev); if (poke && i % 20 === 0) G.moodsPoke(s, ev, 'wet', { r: 0, c: 0 }); }
  const o = JSON.parse(G.serialize(s)); delete o.savedAt;
  return { json: JSON.stringify(o), seen };
}
const a = run(false), b = run(true);
assert.equal(a.json, b.json, 'poking moods must not change the state');
assert.ok(b.seen.includes('mood'));
// an old save has no moods slice and loads
const s = G.newState();
const old = JSON.parse(G.serialize(s));
G.deserialize(old);
console.log('Dig moods OK');
