// Dig: the Gate is yours (docs/dig-design.md decision 13, section 6 item 1). Run: node test_proto_gateyours.js
//   1. While away, nothing walks past the Gate of the level in play (Rock Friend still walks past the Big Rocks above it),
//      on every kind of run; the level is never finished away; the card says the crew waits at the Gate.
//   2. A row dug away costs what the same row costs while you watch (prove, chili, the heavy twist, chapter two, the site).
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const NO = () => {};

// a test-only knob on the crew's away damage (scaled per case below)
let BOOST = 1;
G.use({ id: 'test_gateyours', mods: { awayDps: { at: 99999, fn: v => v * BOOST } } });

const crew = (s, pick) => {
  for (let i = s.diggers.length; i < 6; i++) s.diggers.push({ c: i, r: s.top, tc: -1, tr: -1, cd: 0, swing: 0 });
  s.up.pick = pick; s.up.crew = 6;
};
// a fresh dig of `card` (a road level, a replay, a chili, a twist, a contract ...)
function dig(card, patch) {
  G.seedRng(11);
  const s = G.newState();
  s.bossesDown = 2;
  ok(G.newSite(s, card.site, NO, patch, card), 'opened ' + JSON.stringify(card));
  return s;
}
const roadCard = (i, extra = {}) => { const f = G.ROAD[i]; return { site: f.site, floor: f.floor, twist: '', hard: '', ch: f.ch, ...extra }; };

// ---------- 1. the Gate is never walked past while away ----------
function gateCase(name, card, patch, beaten = 11) {
  const s = dig(card, patch);
  s.starUp.tr_camp = 5;                      // Rock Friend (sp_wake)
  s.starBoss = beaten;
  ok(G.starshopLevel(s, 'sp_wake') === 1, name + ': Rock Friend bought');
  crew(s, 1000);                             // strong enough to reach any depth in 12 h
  const floor = s.run.floor;
  const out = G.settleAway(s, 12 * 3600);
  ok(out.atBoss, name + ': they wait at a Rock');
  ok(s.top < floor && s.top >= floor - G.VIEW_ROWS, name + `: they stop in view of the Gate (top ${s.top}, Gate ${floor})`);
  if (floor > G.LAYER) ok(out.passed > 0 && s.top > floor - G.LAYER, name + ': the Big Rocks above the Gate are walked past');
  ok(s.bossesDown * G.LAYER < floor, name + ': the Gate is not counted as down');
  G.run('step', s, 0.016, NO);
  ok(!s.run.done, name + ': the level is not finished on return');
  ok(out.atGate === true, name + ': the card says they wait at the Gate');
  ok(out.sieveSeconds > 0, name + ': with time left they sieve at the Gate');
  return s;
}
gateCase('chapter two, level 30 (prove)', roadCard(29));
gateCase('chapter one, level 14 (prove)', roadCard(13));
gateCase('chapter one, level 13 (learn)', roadCard(12));
{ // a replay and a chili of a finished level
  const f = G.ROAD[13], key = G.roadKey(f);
  const fin = s => { s.road.stamps[key] = { site: f.site, floor: f.floor, ch: f.ch, twist: '', fin: 1, fast: 0, hard: 0, best: 500, n: 1 }; };
  const s0 = G.newState(); fin(s0);
  const rep = G.replayCard(s0, key, false), chili = G.replayCard(s0, key, true);
  ok(rep && chili && chili.hard === 'chili1', 'replay and chili cards exist');
  gateCase('a replay', rep);
  gateCase('a chili (pip 1)', chili);
}
gateCase('a side level with the heavy twist', { site: 'dunes', floor: 175, twist: 'heavy', hard: '', ch: 1 });
gateCase('a contract', { site: 'dunes', floor: 150, twist: '', hard: '', ch: 1 }, { contract: 'noDiggers' });
gateCase('the deal (a new card)', { site: 'dunes', floor: 125, twist: '', hard: '', ch: 1 });
{ // Falling Star stops at the Gate too
  const s = dig({ site: 'dunes', floor: 50, twist: '', hard: '', ch: 1 });
  s.starUp.tr_camp = 5; s.starUp.tr_pick = 37; s.starBoss = 11;
  ok(G.starshopFalling(s), 'Falling Star bought');
  G.run('swung', s, { r: 0, c: 0, dmg: 1, crit: false }, NO);
  ok(s.starFell && s.top < 50 && s.top + G.VIEW_ROWS >= 25, 'Falling Star drops to the first Rock and never past the Gate (top ' + s.top + ')');
}
{ // a Gate already broken (the endless dig below it) is passed as any beaten Rock
  const s = dig({ site: 'dunes', floor: 50, twist: '', hard: '', ch: 1 });
  s.run.done = true; s.starUp.tr_camp = 5; s.starBoss = 11; crew(s, 1000);
  G.settleAway(s, 12 * 3600);
  ok(s.top > 50, 'after the Gate broke, the crew walks on below it (top ' + s.top + ')');
}
{ // a save with no run yet: its next Big Rock is the Gate (as siteRun)
  G.seedRng(3);
  const s = G.newState(); s.run = null; s.starUp.tr_camp = 5; s.starBoss = 11; crew(s, 1000);
  G.settleAway(s, 12 * 3600);
  ok(s.top < 50 && s.top >= 50 - G.VIEW_ROWS, 'no run: the crew stops at the 50 m Gate (top ' + s.top + ')');
}
{ // the new line has English and Arabic
  ok(G.t('away_gate') === 'Your Rafeeqs dug to the Gate. It is waiting for you.', 'the away card line');
}

// ---------- 2. a row away costs what it costs live ----------
const hpMul = s => G.groundHp(s, 60) / G.dirtHp(60);
{ // one row: the hardness away is the hardness of the blocks made for that row
  const cases = [['prove ch1', roadCard(13)], ['learn ch1', roadCard(12)], ['ch2 prove', roadCard(29)], ['heavy', { site: 'gold', floor: 150, twist: 'heavy', hard: '', ch: 1 }]];
  const f = G.ROAD[13], key = G.roadKey(f);
  const s0 = G.newState(); s0.road.stamps[key] = { site: f.site, floor: f.floor, ch: f.ch, twist: '', fin: 1, fast: 0, hard: 0, best: 500, n: 1, chili: 2 };
  cases.push(['chili pip 3', G.replayCard(s0, key, true)]);
  for (const [name, card] of cases) {
    const s = dig(card);
    const r = 60, row = G.genRow(s, r);
    let worst = 0;
    for (const c of row) {
      if (!c || c.t === 'boss' || !G.BLOCKS[c.t] || !(G.BLOCKS[c.t].hp > 0)) continue;
      const live = c.hp / G.BLOCKS[c.t].hp / G.siteMult(G.siteOf(s), 'hp'), away = G.groundHp(s, r);   // the site's own hardness is not a row hook
      worst = Math.max(worst, Math.abs(live - away) / away);
    }
    ok(worst < 1e-3, `${name}: a block dug live and the same block priced away have the same hardness (off by ${worst})`);
  }
  const P = G.PARAMS.sites;
  const learn = dig(roadCard(12)), prove = dig(roadCard(13)), ch2 = dig(roadCard(29));
  ok(Math.abs(hpMul(prove) / hpMul(learn) - P.proveHp) < 1e-9, 'a prove level is proveHp harder than its learn level, away too');
  const k2 = P.ch2Hp * P.ch2Hard[29 - G.CHAPTER_LEN];
  ok(Math.abs(hpMul(ch2) / hpMul(prove) - k2) / k2 < 1e-9, 'chapter two is ch2Hp x ch2Hard harder than its chapter-one slot, away too');
}
{ // the same crew, the same time away: metres differ by the hardness, so with damage x the hardness ratio they match
  const walk = (card, boost) => {
    const s = dig(card); crew(s, 0); BOOST = boost;
    const o = G.settleAway(s, 120); BOOST = 1;
    return { m: o.metres, s, o };
  };
  const learn = walk(roadCard(12), 1);
  ok(learn.m >= 3 && !learn.o.atBoss, 'the learn level walks some metres without reaching a Rock (' + learn.m + ')');
  const proveSame = walk(roadCard(13), 1);
  ok(proveSame.m < learn.m, `a prove level walks fewer metres away (${proveSame.m} < ${learn.m})`);
  const k = hpMul(dig(roadCard(13))) / hpMul(dig(roadCard(12)));
  const prove = walk(roadCard(13), k);
  ok(Math.abs(prove.m - learn.m) <= 1, `prove with damage x${k}: the same metres as learn (${prove.m} vs ${learn.m})`);
  const ch2Same = walk(roadCard(29), 1);
  ok(ch2Same.m === 0, 'chapter two at chapter-one damage: not a row (' + ch2Same.m + ')');
  const K2 = G.PARAMS.sites.ch2Hp * G.PARAMS.sites.ch2Hard[29 - G.CHAPTER_LEN];
  const ch2 = walk(roadCard(29), K2);
  ok(Math.abs(ch2.m - proveSame.m) <= 1, `chapter two with damage x ch2Hp: the same metres as its chapter-one slot (${ch2.m} vs ${proveSame.m})`);
  // the sieve: coins per damage at the Rock follow the hardness too
  const sieve = (card, boost) => { const s = dig(card); crew(s, 60); BOOST = boost; const o = G.settleAway(s, 12 * 3600); BOOST = 1; return o; };
  const a = sieve(roadCard(13), 1), b = sieve(roadCard(29), K2);
  ok(a.sieveSeconds > 0 && b.sieveSeconds > 0 && Math.abs(a.sieveCoins - b.sieveCoins) <= Math.max(2, a.sieveCoins * 0.02), `the sieve pays per hardness: ch1 ${a.sieveCoins} vs ch2 at x ch2Hp damage ${b.sieveCoins}`);
}

// ---------- old saves ----------
{ // a save from before (no new field anywhere) loads and goes away as before
  const s = dig(roadCard(29)); s.starUp.tr_camp = 5; s.starBoss = 11; crew(s, 1000);
  const back = G.deserialize(G.serialize(s));
  ok(back && back.run && back.run.ch === 2 && back.run.floor === 200, 'a chapter-two save in play loads');
  const out = G.settleAway(back, 12 * 3600);
  ok(back.top < 200 && out.atGate, 'and its crew waits at the Gate');
}

if (failed) { console.error(`test_proto_gateyours: ${failed} failed`); process.exit(1); }
console.log('test_proto_gateyours: ok');
