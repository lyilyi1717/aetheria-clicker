// Dig: Rock Friend and Falling Star dig right up to the Gate too (docs/dig-design.md decisions 13 and 20). Run: node test_proto_wake_gate.js
//   Rock Friend (sp_wake) walks past beaten Rocks and stops with the row right above the next standing, un-beaten Rock dug and the
//   Rock whole (as the plain walk does); never the Gate of the level in play. Falling Star (the 'falling' Pick step) drops the dig
//   to the row right above the first Rock. Old saves load.
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const NO = () => {};
const L = G.LAYER;

const crew = (s, pick) => {
  for (let i = s.diggers.length; i < 6; i++) s.diggers.push({ c: i, r: s.top, tc: -1, tr: -1, cd: 0, swing: 0 });
  s.up.pick = pick; s.up.crew = 6;
};
const rockStands = s => s.rows[0].every(c => c && c.t === 'boss');
function dig(card) {
  G.seedRng(11);
  const s = G.newState();
  s.bossesDown = 2;
  ok(G.newSite(s, card.site, NO, undefined, card), 'opened ' + card.floor);
  return s;
}
const card = floor => ({ site: 'dunes', floor, twist: '', hard: '', ch: 1 });

// 1. Rock Friend: the stop is the row above the next un-beaten Rock, for several beaten depths
for (const beaten of [1, 3, 5]) {
  const s = dig(card(300)); s.starUp.tr_camp = 5; s.starBoss = beaten; crew(s, 1000);
  ok(G.starshopLevel(s, 'sp_wake') === 1, 'Rock Friend bought');
  const out = G.settleAway(s, 12 * 3600);
  const stop = (beaten + 1) * L;
  ok(s.top === stop, `beaten ${beaten}: the crew is right above the next Rock (top ${s.top}, Rock ${stop})`);
  ok(rockStands(s) && out.atBoss && out.passed > 0, `beaten ${beaten}: the Rock is whole, the crew waits, beaten Rocks were passed`);
  ok(out.sieveSeconds > 0, `beaten ${beaten}: with time left they sieve there`);
}
{ // with little time it ends where the time ran out, and never past a Rock
  const s = dig(card(300)); s.starUp.tr_camp = 5; s.starBoss = 5; crew(s, 3);
  G.settleAway(s, 600);
  ok(s.top < 6 * L, 'a short absence stops short of the Rock (top ' + s.top + ')');
}
{ // the Gate of the level in play is the stop, however many Rocks you have beaten
  const s = dig(card(100)); s.starUp.tr_camp = 5; s.starBoss = 11; crew(s, 1000);
  const out = G.settleAway(s, 12 * 3600);
  ok(s.top === 100 && rockStands(s) && out.atGate === true, 'Gate at 100: the crew waits right above it (top ' + s.top + ')');
  ok(s.bossesDown * L < 100 && !s.run.done, 'and the Gate is not counted as down');
}
{ // no perk: the same stop as with it, only without walking past beaten Rocks
  const s = dig(card(300)); s.starBoss = 5; crew(s, 1000);
  G.settleAway(s, 12 * 3600);
  ok(s.top === L && rockStands(s), 'without Rock Friend the first Rock is the stop');
}

// 2. Falling Star: the first swing falls to the row above the first Rock; it is whole; the Gate of a short level is never dug
{
  const f = dig(card(300)); f.best = 0; f.bossesDown = 0; f.starUp.tr_pick = 37;
  ok(G.starshopFalling(f), 'Falling Star bought');
  const coins = f.coins; let seen = null;
  G.run('swung', f, { r: f.top, c: 3, dmg: 1 }, (k, d) => { if (k === 'starFell') seen = d; });
  ok(f.top === L && rockStands(f), 'the dig falls to the row right above the first Rock (top ' + f.top + ')');
  ok(seen && seen.rows === L && f.coins > coins, 'the ground it passes pays');
  const at = f.top; G.run('swung', f, { r: f.top, c: 3, dmg: 1 }, NO);
  ok(f.top === at, 'only the first swing');
}
{
  const f = dig(card(25)); f.best = 0; f.bossesDown = 0; f.starUp.tr_pick = 37; f.starUp.tr_camp = 5; f.starBoss = 11;
  G.run('swung', f, { r: f.top, c: 3, dmg: 1 }, NO);
  ok(f.top === 25 && rockStands(f) && !f.run.done, 'a Gate at the first Rock is not dug by the fall');
}

// 3. old saves
{
  const s = dig(card(300)); s.starUp.tr_camp = 5; s.starBoss = 3; crew(s, 1000);
  const old = JSON.parse(G.serialize(s)); delete old.savedAt;
  const back = G.deserialize(JSON.stringify(old));
  ok(back && back.top === s.top, 'a save in play loads');
  G.settleAway(back, 12 * 3600);
  ok(back.top === 4 * L, 'its crew digs to the row above the next Rock (top ' + back.top + ')');
}
if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('Dig Rock Friend and Falling Star to the Gate OK');
