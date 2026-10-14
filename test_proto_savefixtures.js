// Frozen old saves (test_fixtures/*.json). Each one is loaded, played 200 steps, saved again, and checked: no throw, no NaN,
// Stars and the road not lost. Run: node test_proto_savefixtures.js
// ADD ONE FIXTURE PER RELEASE THAT CHANGES A SAVED FIELD; NEVER EDIT AN OLD ONE. Fixtures hold no player data.
import { readFileSync, readdirSync } from 'node:fs';
import * as G from './proto/game.js';

let failed = 0;
const ok = (c, m) => { if (!c) { failed++; console.error('FAIL: ' + m); } };
const noNaN = (v, path, bad) => {
  if (typeof v === 'number') { if (!Number.isFinite(v)) bad.push(path); }
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) noNaN(x, path + '.' + k, bad);
};
const dir = 'test_fixtures/';
const names = readdirSync(dir).filter(f => f.endsWith('.json')).sort();
ok(names.length >= 7, 'the fixture folder holds the saves (' + names.length + ')');
for (const name of ['v2-fresh', 'v2-mid-road', 'v2-hard-medal', 'old-no-fv', 'old-no-legs', 'old-pre-chili-halfrun', 'old-pre-ch2-past-20'])
  ok(names.includes(name + '.json'), 'fixture present: ' + name);

for (const f of names) {
  const text = readFileSync(dir + f, 'utf8'), raw = JSON.parse(text);
  G.seedRng(5);
  let s = null, threw = null;
  try { s = G.deserialize(text); } catch (e) { threw = e; }
  ok(s && !threw, `${f}: loads`);
  if (!s) continue;
  const stars = s.stars, stamps = Object.keys(s.road.stamps).length, coins = s.coins;
  try {
    for (let i = 0; i < 200; i++) { if (i % 5 === 0) for (let c = 0; c < G.COLS; c++) if (G.swing(s, s.top, c)) break; G.step(s, 0.05); }
  } catch (e) { ok(false, `${f}: 200 steps threw ${e.message}`); continue; }
  const bad = []; noNaN(s, 's', bad);
  ok(!bad.length, `${f}: no NaN or Infinity (${bad.slice(0, 3)})`);
  ok(s.stars >= stars && Object.keys(s.road.stamps).length >= stamps, `${f}: Stars and road stamps kept`);
  ok(s.coins >= 0 && s.t > 0, `${f}: it plays`);
  const back = G.deserialize(G.serialize(s));
  ok(back && back.v === G.SAVE_VERSION && back.stars === s.stars, `${f}: saves again and loads again`);
  ok(raw.stars === undefined || stars === raw.stars, `${f}: Stars as stored`);
  ok(back && Object.keys(back.fv || {}).includes('sites'), `${f}: re-saved with feature versions`);
}

{ // a missing fv runs the feature's migration from 0 once, a current one does not
  const noFv = JSON.parse(readFileSync(dir + 'old-no-fv.json', 'utf8'));
  ok(noFv.fv === undefined, 'the no-fv fixture has no fv');
  const s = G.deserialize(JSON.stringify(noFv));
  ok(s.road.deal === null && Object.values(s.road.stamps).every(st => st.ch === 1), 'sites migration ran: stamps are chapter one');
  const again = G.deserialize(G.serialize(s));
  ok(again.fv.sites === G.FEATURES.sites.version, 'and the version is recorded so it will not run twice');
}
{ // a run without leg state gets its leg from its clock
  const s = G.deserialize(readFileSync(dir + 'old-no-legs.json', 'utf8'));
  ok(s.run && s.run.legIdx === undefined, 'no leg state in the loaded run');
  const l = G.legLeft(s.run, 0);
  ok(Number.isFinite(l.left) && s.run.legIdx === 0, 'legLeft fills it in from the clock');
}
{ // pre-chili: half a run in contractRun gets the newer fields
  const s = G.deserialize(readFileSync(dir + 'old-pre-chili-halfrun.json', 'utf8'));
  ok(s.contractRun.n === 3 && s.contractRun.refill === false && s.contractRun.board === false, 'half-run kept, new fields defaulted');
  ok(!(s.road.chiliHit > 0), 'no chili bonus invented');
}
{ // pre chapter two, past level 20: the road is dealt level 21 next
  const s = G.deserialize(readFileSync(dir + 'old-pre-ch2-past-20.json', 'utf8'));
  ok(G.roadLevel(s).level === 21, 'dealt level 21, got ' + G.roadLevel(s).level);
}

if (failed) { console.error(`${failed} check(s) failed`); process.exit(1); }
console.log('Dig old-save fixtures OK (' + names.length + ')');
