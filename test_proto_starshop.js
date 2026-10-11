// The Star shop (proto/features/starshop). Run: node test_proto_starshop.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const give = (s, id, lv = 1) => { s.starUp[id] = lv; };
// a state that has beaten two Big Rocks and may move
function ready(bossesDown = 2) { G.seedRng(7); const s = G.newState(); s.bossesDown = bossesDown; s.best = 60; s.starBoss = bossesDown; return s; }
const move = s => { ok(G.newSite(s, 'dunes', () => {}), 'moved to a new site'); };

{ // the shop and its prices
  const s = G.newState();
  ok(Object.keys(G.STARSHOP_PERKS).length >= 10 && Object.keys(G.STARSHOP_PERKS).every(id => G.ITEMS[id] && G.ITEMS[id].shop === 'star'), 'ten or more perks in the star shop');
  ok(!G.itemOpen(s, 'sp_head'), 'the shop is shut until you have a Star');
  s.stars = 1;
  ok(G.itemOpen(s, 'sp_head') && G.buy(s, 'sp_head') && s.stars === 0 && s.starUp.sp_head === 1, 'a perk costs Stars');
  ok(!G.buy(s, 'sp_head'), 'cannot pay with no Stars');
  s.stars = 2; ok(G.upgradeCost(s, 'sp_head') === 2 && G.buy(s, 'sp_head') && s.starUp.sp_head === 2, 'level 2 costs 2');
  s.stars = 9; give(s, 'sp_head', 3); ok(!G.canBuy(s, 'sp_head'), 'a full perk cannot be bought');
}

{ // spending never lowers the Star bonus
  const s = G.newState(); s.stars = 3;
  const coin = G.coinMult(s), hit = G.pickPower(s), crew = G.crewPower(s);
  G.buy(s, 'sp_keep'); G.buy(s, 'sp_map');
  ok(s.stars === 0 && s.starSpent === 3, 'the purse went down, the spent count went up');
  ok(Math.abs(G.coinMult(s) - coin) < 1e-9 && Math.abs(G.pickPower(s) - hit) < 1e-9 && Math.abs(G.crewPower(s) - crew) < 1e-9, 'coins, hits and Rafeeq hits are the same after spending');
}

{ // Rafeeqs waiting, pick at half, a chest in the pocket, a relic kept
  const s = ready();
  s.up.pick = 20; s.relics.boom = 3; s.relics.lamp = 1;
  give(s, 'sp_head', 2); give(s, 'sp_warm', 1); give(s, 'sp_gift', 1); give(s, 'sp_keep', 2);
  G.starshopSetKeep(s, 'boom');
  move(s);
  ok(s.diggers.length === 2 && s.up.crew === 2, 'two Rafeeqs wait at the new site');
  ok(s.up.pick === 10, 'the pick starts at half the best level');
  ok(s.chests === 1, 'a chest in the pocket');
  ok(s.relics.boom === 2 && !s.relics.lamp, 'the chosen relic crossed, up to level 2; the other did not');
  ok(G.pickPower(s) > 1, 'the warm pick hits harder at once');
  // a second move: the best level is remembered even though this site's pick is lower
  s.bossesDown = 2; s.best = 60; s.up.pick = 4; move(s);
  ok(s.up.pick === 10, 'the best level counts, not the last site');
}

{ // keep with no choice: the best relic; with no relic: nothing; without the perk: nothing
  const s = ready(); s.relics.lamp = 1; s.relics.vein = 2; give(s, 'sp_keep', 1);
  ok(G.starshopKeepNow(s).id === 'vein' && G.starshopKeepNow(s).level === 1, 'with no choice, the best relic goes, at the perk level');
  G.starshopSetKeep(s, 'lamp'); ok(G.starshopKeepNow(s).id === 'lamp', 'a choice is respected');
  ok(!G.starshopSetKeep(s, 'echo'), 'only a relic you hold can be chosen');
  s.starUp.sp_keep = 0; move(s); ok(Object.keys(s.relics).length === 0, 'without the perk nothing crosses');
}

{ // four cards; a free re-roll once per site
  const s = G.newState(); G.seedRng(3);
  const before = G.rollDraft(s).length;
  give(s, 'sp_cards', 1);
  ok(G.rollDraft(s).length === before + 1, 'a chest offers one more card');
  ok(G.starshopRerollsLeft(s) === 0 && !G.starshopReroll(s), 'no re-roll without the perk');
  give(s, 'sp_reroll', 1);
  ok(G.starshopRerollsLeft(s) === 1 && G.starshopReroll(s) && !G.starshopReroll(s), 'one re-roll, then none');
  s.bossesDown = 2; s.best = 60; move(s);
  ok(G.starshopRerollsLeft(s) === 1, 'a new site brings it back');
}

{ // close chest, bone and oil
  const s = ready(); give(s, 'sp_map', 1); give(s, 'sp_bone', 1); give(s, 'sp_oil', 1);
  move(s);
  const at = t => s.rows.findIndex(r => r.some(c => c && c.t === t));
  ok(at('chest') === 3, 'a chest is close to the top');
  ok(at('fossil') === 5 && at('oil') === 7, 'a bone and an oil well are close too');
}

{ // away: past a Big Rock you have beaten, only with the perk, only for beaten depths
  const run = (perk, beaten) => {
    G.seedRng(5);
    const s = G.newState(); s.starBoss = beaten; if (perk) give(s, 'sp_wake', 1);
    for (let i = 0; i < 6; i++) s.diggers.push({ c: 0, r: 0, tc: -1, tr: -1, cd: 0, swing: 0 });
    s.up.crewPow = 40; s.up.crew = 6;
    const out = G.settleAway(s, 12 * 3600);
    return { s, out };
  };
  const a = run(false, 2), b = run(true, 0), c = run(true, 1), d = run(true, 3);
  ok(a.out.atBoss && a.s.top < 25, 'without the perk the crew waits at the first Big Rock');
  ok(b.out.atBoss && b.s.top < 25, 'with the perk but no Big Rock beaten, it still waits');
  ok(c.s.top > 25 && c.s.top < 50 && c.out.atBoss, 'one Big Rock beaten: it passes the first and waits at the second');
  ok(d.s.top > c.s.top && d.out.metres > c.out.metres, 'more beaten, further');
  ok(c.out.passed > 0 && c.out.coins > a.out.coins && c.s.best > a.s.best, 'the extra rows paid and counted');
  ok(Math.abs(c.s.coins - c.out.coins) < 1 && c.s.total === c.s.coins, 'the coins were paid once');
}

{ // the deepest Big Rock is remembered over the move
  const s = G.newState(); G.seedRng(1);
  G.run('bossDown', s, 50); ok(s.starBoss === 2, 'a broken Big Rock is remembered');
  s.bossesDown = 2; s.best = 60; G.newSite(s, 'dunes'); ok(s.starBoss === 2 && s.bossesDown === 0, 'it lives through the move');
}

{ // the bot buys; save round-trip; an old save has no slice
  const s = ready(); s.stars = 6;
  const api = { ev: () => {} };
  let n = 0; for (const b of G.BOTS) if (b.shop) n += b.shop(s, api) || 0;
  ok(n >= 1 && s.starSpent > 0, 'the sim bot buys a perk');
  s.starKeep = 'boom'; s.relics.boom = 1;
  const t = G.deserialize(G.serialize(s));
  ok(t && t.starUp.sp_head === s.starUp.sp_head && t.starSpent === s.starSpent && t.starKeep === 'boom' && t.starBoss === s.starBoss, 'a save round-trips');
  const o = JSON.parse(G.serialize(s));
  for (const k of ['starSpent', 'starKeep', 'starBestPick', 'starBoss', 'starRerolls', 'starUp']) delete o[k];
  const old = G.deserialize(JSON.stringify(o));
  ok(old && old.starSpent === 0 && old.starKeep === null && old.starUp.sp_head === 0 && old.starRerolls === 0, 'an old save without the slices loads with defaults');
  const u = G.unlocks();
  ok(u.byId['shop:sp_head'] && u.byId['sp_head:3'] && u.byId['sp_warm:2'], 'the perks are counted as content');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('starshop: ok');
