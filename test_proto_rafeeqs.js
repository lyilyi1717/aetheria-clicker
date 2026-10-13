// Rafeeq seats: names, traits, records. Run: node test_proto_rafeeqs.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const crew = n => { G.seedRng(3); const s = G.newState(); for (let i = 0; i < n; i++) s.diggers.push({ c: i, r: s.top, tr: -1, tc: -1, cd: 0, swing: 0, broke: 0, coins: 0 }); return s; };
const hook = (s, b) => G.FEATURES.rafeeqs.hooks.broke(s, b);
const tick = s => G.step(s, 0.05, () => {});

{ // seats fill by themselves, also for Rafeeqs without an id (Star perk, start kit)
  const s = crew(8); tick(s);
  ok(s.rafeeqSeats.length === 8, 'eight Rafeeqs, eight seats');
  const names = s.rafeeqSeats.map(x => x.name);
  ok(new Set(names).size === 8 && names.every(n => G.RAFEEQ_NAMES.includes(n)), 'names are unique and from the list');
  ok(new Set(s.rafeeqSeats.slice(0, 6).map(x => x.trait)).size === 6, 'the first six seats have six different traits');
  ok(s.rafeeqSeats.every(x => G.RAFEEQ_TRAITS.includes(x.trait)), 'every trait is known');
  ok(G.rafeeqName(s, 0) === names[0] && G.rafeeqTrait(s, 2) === s.rafeeqSeats[2].trait, 'name and trait read back');
  ok(G.rafeeqPair(s, 1).friend === 0 && G.rafeeqPair(s, 0).friend === 1, 'friends are the seats hired side by side');
  s.rafeeqSeats.forEach((x, i) => { if (x.rival >= 0) ok(s.rafeeqSeats[x.rival].rival === i && x.rival !== i, 'a rivalry goes both ways'); });
  const before = names.slice();
  tick(s); tick(s);
  ok(s.rafeeqSeats.map(x => x.name).join() === before.join(), 'names are stable');
}
{ // before a seat exists the readers fall back
  const s = crew(2);
  ok(G.rafeeqName(s, 1) === 'Rafeeq 2' && G.RAFEEQ_TRAITS.includes(G.rafeeqTrait(s, 1)), 'fallback name and trait');
  ok(G.rafeeqPair(s, 0).friend === -1 && G.rafeeqBest(s) === -1, 'fallback pair, nobody best');
}
{ // rename trims, caps, falls back when empty
  const s = crew(2); tick(s);
  const given = s.rafeeqSeats[0].given;
  ok(G.rafeeqRename(s, 0, '  Abu   Saif  ') === 'Abu Saif', 'trimmed');
  ok(Array.from(G.rafeeqRename(s, 0, 'abcdefghijklmnopqrst')).length === 12, 'at most 12 letters');
  ok(G.rafeeqRename(s, 0, '   ') === given && G.rafeeqName(s, 0) === given, 'empty goes back to the given name');
  ok(G.rafeeqRename(s, 0, '<b>x') === 'b x'.replace(' ', '') || !G.rafeeqName(s, 0).includes('<'), 'no angle brackets');
  ok(G.rafeeqRename(s, 0, 'سيف') === 'سيف', 'any script');
  ok(G.rafeeqRename(s, 5, 'Nobody') === 'Rafeeq 6', 'a missing seat is left alone');
}
{ // life totals bank on New Site and the seats survive
  const s = crew(3); tick(s);
  s.diggers[0].broke = 40; s.diggers[0].coins = 1200; s.diggers[0].bestFind = { kind: 'gold', coins: 500 };
  s.diggers[1].broke = 10; s.diggers[1].coins = 3000;
  ok(G.rafeeqBest(s) === 1, 'the richest brings the most');
  s.diggers[2].coins = 3000;
  ok(G.rafeeqBest(s) === 1, 'a tie goes to the lower seat');
  let st = G.rafeeqStats(s, 0);
  ok(st.level.broke === 40 && st.life.broke === 40 && st.life.best.coins === 500, 'life includes this level');
  const names = s.rafeeqSeats.map(x => x.name);
  s.run = { ...(s.run || {}), done: true };
  G.reset(s, 'site');
  ok(s.rafeeqSeats.length === 3 && s.rafeeqSeats.map(x => x.name).join() === names.join(), 'seats survive New Site');
  ok(s.rafeeqSeats[0].life.broke === 40 && s.rafeeqSeats[0].life.coins === 1200 && s.rafeeqSeats[0].life.levels === 1, 'totals banked, level counted');
  ok(s.rafeeqSeats[0].life.best.kind === 'gold', 'best find banked');
  s.diggers[0].broke = 5; s.diggers[0].coins = 100;      // the start kit has already hired some
  st = G.rafeeqStats(s, 0);
  ok(st.life.broke === 45 && st.level.broke === 5, 'the next level adds on top');
  G.reset(s, 'land');
  ok(s.rafeeqSeats.length === 3, 'seats survive Land');
}
{ // the best find comes from the broke hook
  const s = crew(2); tick(s);
  s.diggers[1].tr = 4; s.diggers[1].tc = 3;
  hook(s, { src: 'crew', r: 4, c: 3, t: 'gold', coins: 80 }, () => {});
  hook(s, { src: 'crew', r: 4, c: 3, t: 'dirt', coins: 5 }, () => {});
  hook(s, { src: 'hand', r: 4, c: 3, t: 'gold', coins: 999 }, () => {});
  ok(s.diggers[1].bestFind.kind === 'gold' && s.diggers[1].bestFind.coins === 80, 'the richest block he broke is kept; others do not count');
}
{ // save round trip and an old save without the slice
  const s = crew(2); tick(s); G.rafeeqRename(s, 1, 'Zed');
  const back = G.deserialize(G.serialize(s));
  ok(back.rafeeqSeats.length === 2 && G.rafeeqName(back, 1) === 'Zed', 'seats round-trip');
  const old = JSON.parse(G.serialize(s)); delete old.rafeeqSeats;
  const o = G.deserialize(JSON.stringify(old));
  ok(Array.isArray(o.rafeeqSeats) && o.rafeeqSeats.length === 0, 'an old save loads with no seats');
  tick(o);
  ok(o.rafeeqSeats.length === o.diggers.length, 'and gets them when the dig runs');
}
{ // named lines in the away card
  const s = crew(3);
  const a = G.rafeeqAway(s, { metres: 12, sieveSeconds: 600, chests: 2, joke: 5 });
  ok(a.lines.length === 3 && a.lines.every(l => !l.includes('{') && G.RAFEEQ_NAMES.some(n => l.includes(n))), 'three named lines');
  ok(a.lines[0].includes('12 m'), 'the metres are real');
  const none = G.rafeeqAway(s, { metres: 0, sieveSeconds: 0, chests: 0, joke: 1 });
  ok(none.lines.length === 0 && none.joke === '', 'nothing happened, nothing said');
  ok(G.rafeeqAway(G.newState(), { metres: 5, joke: 0 }).lines.length === 0, 'no Rafeeqs, no lines');
  const j = G.rafeeqAway(s, { metres: 0, joke: 5 });
  const sl = s.rafeeqSeats.findIndex(x => x.trait === 'sleepy');
  ok(sl < 0 || j.joke.includes(G.rafeeqName(s, sl)), 'the nap joke goes to the sleepy one');
}
{ // looks only: no number in the game reads a seat
  const a = crew(4), b = crew(4);
  tick(a);
  for (let i = 0; i < 20; i++) { tick(a); tick(b); }
  ok(a.coins === b.coins && a.total === b.total, 'seats change nothing the dig pays');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('rafeeqs ok');
