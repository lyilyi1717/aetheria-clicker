// The Star tracks (proto/features/starshop). Run: node test_proto_starshop.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const give = (s, tr, n) => { s.starUp['tr_' + tr] = n; };
function ready(bossesDown = 2) { G.seedRng(7); const s = G.newState(); s.bossesDown = bossesDown; s.best = 60; s.starBoss = bossesDown; return s; }
const move = s => { ok(G.newSite(s, 'dunes', () => {}), 'moved to a new site'); };

{ // costs, order, and Stars doing nothing until spent
  const s = G.newState();
  ok([0, 1, 2, 3, 4, 5, 6, 7].map(G.starshopStepCost).join() === '2,3,5,7,10,15,23,34', 'costs 2, 3, 5, 7, 10, 15, 23, 34');
  ok(!G.itemOpen(s, 'tr_pick'), 'shut until you have a Star');
  s.stars = 100;
  ok(G.pickPower(s) === 1 && G.coinMult(s) === 1 && Math.abs(G.crewPower(s) - 0.6) < 1e-9, 'unspent Stars give nothing');
  ok(G.buy(s, 'tr_pick') && s.stars === 98 && s.starSpent === 2 && Math.abs(G.pickPower(s) - 1.5) < 1e-9, 'Stone Pick: 2 Stars, hit x1.5');
  ok(G.buy(s, 'tr_pick') && s.stars === 95 && Math.abs(G.pickPower(s) - 2.25) < 1e-9, 'step 2 costs 3, hit x2.25');
  ok(G.buy(s, 'tr_camp') && Math.abs(G.crewShare(s) - 0.6) < 1e-9 && Math.abs(G.crewPower(s) - G.crewShare(s) * G.pickPower(s)) < 1e-9, 'Camp: no x1.5 on the Rafeeq hit (it stays a share of yours; step 1 is a perk, the plain steps add campShare)');
  ok(G.buy(s, 'tr_bag') && Math.abs(G.coinMult(s) - 1.5) < 1e-9, 'Bag: coins x1.5');
  s.stars = 1; ok(!G.buy(s, 'tr_pick'), 'cannot pay with too few Stars');
}

{ // materials
  const m = n => G.starshopPickAt(n);
  ok(m(0).mat === 'wood' && m(1).mat === 'stone' && m(1).n === 1 && m(4).mat === 'stone' && m(4).n === 4 && m(5).mat === 'copper' && m(5).n === 1, 'a new material every 4 steps');
  ok(m(37).mat === 'star' && m(40).n === 4 && m(43).plus === 3, 'the Star Pick goes on');
  ok(G.starshopPickName(m(2)) === 'Stone II' && G.starshopPickName(m(0)) === 'Wooden', 'names');
  ok(G.STARSHOP_MATERIALS.length === 10, 'ten materials');
}

{ // 29 named steps hold every old perk with every level
  const n = G.STARSHOP_TRACKS.reduce((a, tr) => a + Object.keys(G.STARSHOP_STEPS[tr]).length, 0);
  ok(n === 29, '29 named steps');
  const s = G.newState();
  give(s, 'bag', 11); give(s, 'camp', 5); give(s, 'pick', 13);
  ok(G.starshopLevel(s, 'sp_keep') === 3 && G.starshopLevel(s, 'sp_gift') === 2 && G.starshopLevel(s, 'sp_cards') === 1 && G.starshopLevel(s, 'sp_eyes') === 1, 'bag steps give the old perks');
  ok(G.starshopLevel(s, 'sp_head') === 3 && G.starshopLevel(s, 'sp_wake') === 1 && G.starshopLevel(s, 'sp_warm') === 2, 'camp and pick steps give the old perks');
  give(s, 'camp', 12); ok(G.starshopLevel(s, 'sp_head') === 8, 'the whole camp waits');
  give(s, 'pick', 0); ok(G.starshopPunch(s) === 0, 'no punch-through at step 0');
  give(s, 'pick', 1); ok(G.starshopPunch(s) === 1, 'punch-through reach 1');
  give(s, 'pick', 29); ok(G.starshopPunch(s) === Infinity, 'no end');
}

{ // Rafeeqs waiting, warm pick (and its price), pocket chests, relics kept (two with Second Pocket)
  const s = ready();
  s.up.pick = 20; s.relics.boom = 3; s.relics.lamp = 1; s.relics.vein = 2;
  give(s, 'camp', 2); give(s, 'pick', 5); give(s, 'bag', 14);
  G.starshopSetKeep(s, 'boom');
  move(s);
  ok(s.diggers.length === 2 && s.up.crew === 2, 'two Rafeeqs wait');
  ok(s.up.pick === 10 && s.starWarm === 10 && s.free.crew === 2, 'the pick starts at half the best level; two free Rafeeq seats');
  ok(s.chests === 2, 'two pocket chests');
  ok(s.relics.boom === 3 && s.relics.vein === 2 && !s.relics.lamp, 'two relics crossed with Second Pocket');
  ok(G.upgradeCost(s, 'pick') === 15, 'Warm Pick does not lock the Pick button: the next level costs 15');
  s.up.pick = 11; ok(G.upgradeCost(s, 'pick') < 15 * Math.pow(1.5, 11) / 5, 'the price ramps back');
  s.up.pick = 30; ok(G.upgradeCost(s, 'pick') === Math.ceil(15 * Math.pow(1.5, 30)), 'and joins the old curve');
  ok(s.starLine.cur.steps === 5 && s.starLine.cur.hit > 7, 'the first hit of the site is remembered');
}

{ // cards: Wide Hands + Pearl Eye never show more than the cap; the text says one more
  const s = G.newState(); G.seedRng(3);
  const before = G.rollDraft(s).length;
  give(s, 'bag', 8);
  ok(G.rollDraft(s).length === before + 1, 'Wide Hands: one more card');
  ok(G.fold('draftCards', s, 99) === 5, 'never more than 5 cards');
  ok(/one more/.test(G.t('rule_cards_d')), 'the text is true');
  give(s, 'bag', 5); ok(G.starshopRerollsLeft(s) === 0, 'no re-roll before step 6');
  give(s, 'bag', 6);
  ok(G.starshopRerollsLeft(s) === 1 && G.starshopReroll(s) && !G.starshopReroll(s), 'one re-roll');
}

{ // close chest, bone and oil
  const s = ready(); give(s, 'bag', 3);
  move(s);
  const has = (r, t) => s.rows[r - s.top].some(c => c && c.t === t);
  ok(has(3, 'chest') && has(5, 'fossil') && has(7, 'oil'), 'a chest, a bone and an oil well are close');
}

{ // heavy hand
  const s = ready(); give(s, 'pick', 25);
  for (const c of [2, 3, 4]) s.rows[0][c] = { t: 'dirt', hp: 5, max: 5, s: 1 };
  G.run('swung', s, { r: 0, c: 3, dmg: 2, crit: true }, () => {});
  ok(s.rows[0][2].hp === 3 && s.rows[0][4].hp === 3, 'a big hit strikes left and right');
  G.run('swung', s, { r: 0, c: 3, dmg: 2, crit: false }, () => {});
  ok(s.rows[0][2].hp === 3, 'a plain hit does not');
}

{ // away: past a Big Rock you have beaten
  const run = (perk, beaten) => {
    G.seedRng(5);
    const s = G.newState(); s.starBoss = beaten; if (perk) give(s, 'camp', 5);
    for (let i = 0; i < 6; i++) s.diggers.push({ c: 0, r: 0, tc: -1, tr: -1, cd: 0, swing: 0 });
    s.up.pick = 40; s.up.crew = 6;
    return { s, out: G.settleAway(s, 12 * 3600) };
  };
  const a = run(false, 2), c = run(true, 1);
  ok(a.out.atBoss && a.s.top === 25, 'without the step the crew waits at the first Big Rock');
  ok(c.s.top > 25 && c.out.passed > 0 && c.s.top > a.s.top, 'with it, past the first (and deeper than without)');
}

{ // the pacing function and the flat bonus
  ok(G.PARAMS.sites.starPick === 0 && G.PARAMS.sites.starCoin === 0, 'the flat Star bonus is gone');
  ok(Math.abs(G.starLift(153) - Math.pow(1 + 153 / 12, 1.55)) < 1e-6 && G.starLift(0) === 1, 'starLift is the lift of an even spend');
}

{ // the line on the New Site card
  const s = ready(); give(s, 'pick', 1);
  ok(/Wooden -> Stone I\. Your first hit: 1 -> 1\.5\./.test(G.starshopLineText(s)), 'the line: ' + G.starshopLineText(s));
  move(s);
  ok(/Stone I/.test(G.starshopMovedText(s)), 'after the move too');
}

{ // old save: every Star comes back, once; the bot buys; the tracks are content
  const s = ready(); s.stars = 3; s.starSpent = 9;
  const o = JSON.parse(G.serialize(s)); delete o.fv; o.starUp = { sp_head: 2, sp_map: 1 }; delete o.starRefund; delete o.starLine;
  const old = G.deserialize(JSON.stringify(o));
  ok(old && old.stars === 12 && old.starSpent === 0 && old.starRefund === 9 && old.starUp.sp_head === undefined && old.starUp.tr_pick === 0, 'an old save gets its Stars back to spend');
  const again = G.deserialize(G.serialize(old));
  ok(again.stars === 12 && again.starRefund === 9, 'only once');
  const t = ready(); t.stars = 9;
  for (let i = 0; i < 4; i++) for (const b of G.BOTS) if (b.shop) b.shop(t, { ev: () => {} });
  ok(t.starUp.tr_pick >= 1 && t.starUp.tr_bag >= 1 && t.starUp.tr_camp >= 1, 'the bot buys Pick, then Bag, then Camp');
  G.buy(t, 'tr_pick'); ok(t.starRefund === 0, 'spending clears the note');
  const u = G.unlocks();
  ok(u.byId['shop:tr_pick'] && u.byId['tr:pick:1'] && u.byId['tr:bag:14'], 'the tracks are counted as content');
}

{ // the four steps that were named and did nothing
  const s = ready(0);
  ok(G.fold('crackSeconds', s, 2) === 2 && G.fold('crewWalk', s, 6) === 6 && G.fold('teaBreak', s, 6) === 6, 'nothing without the steps');
  give(s, 'pick', 17); ok(G.fold('crackSeconds', s, 2) === 4, 'Crack Finder: the crack stays twice as long');
  give(s, 'camp', 7); ok(G.fold('crewWalk', s, 6) === 12, 'Good Shoes: Rafeeqs walk twice as fast');
  give(s, 'camp', 9); ok(G.fold('teaBreak', s, 6) === 0, 'Second Kettle: no sitting');
  // Falling Star: the first swing drops the dig to the first Big Rock, once a site
  const f = ready(0); f.best = 0; give(f, 'pick', 37);
  const top = f.top, coins = f.coins, seen = [];
  G.run('swung', f, { r: f.top, c: 3, dmg: 1 }, (k, d) => seen.push(k));
  ok(f.top > top && f.top < G.LAYER && f.coins > coins && f.starFell && seen.includes('starFell'), 'Falling Star: the dig falls and the ground pays');
  let rock = false; for (let r = f.top; r < f.top + G.VIEW_ROWS; r++) if (r === G.LAYER) rock = true;
  ok(rock, 'the first Big Rock is in sight');
  const at = f.top; G.run('swung', f, { r: f.top, c: 3, dmg: 1 }, () => {});
  ok(f.top === at, 'only the first swing');
  // a locked item cannot be bought, whatever the page shows
  const l = G.newState(); l.coins = 1e9;
  const shut = Object.keys(G.ITEMS).filter(id => !G.itemOpen(l, id));
  ok(shut.length > 0 && shut.every(id => !G.canBuy(l, id) && !G.buy(l, id)), 'a locked item cannot be bought');
}

{ // the start kit: a site after the first starts where the player is; a "prove it" level is harder
  const s = ready(); s.up.pick = 20; s.starBestPick = 20;
  move(s);
  ok(s.up.pick === 0 && s.diggers.length === 1 && s.up.crew === 1 && s.free.crew === 1 && G.upgradeCost(s, 'pick') === 15 && G.upgradeCost(s, 'crew') === 30, 'kit: no free pick levels, one free Rafeeq waiting, first prices');
  give(s, 'pick', 5); s.bossesDown = 2; move(s);
  ok(s.up.pick === 10, 'Warm Pick (50%) beats the kit');
  const a = ready(); a.bossesDown = 2;
  G.newSite(a, 'boom', () => {}, undefined, { floor: 100, twist: '' });
  const b = ready(); b.bossesDown = 2;
  G.newSite(b, 'dunes', () => {}, undefined, { floor: 100, twist: '' });
  ok(G.roadProve(a) && !G.roadProve(b), 'Powder Valley 100 m proves, the Dunes 100 m teaches');
  const gm = G.PARAMS.sites.gateMul;
  ok(G.fold('bossHp', a, 100, a.run.floor) === 100 * gm[1] && G.fold('bossHp', b, 100, b.run.floor) === 100 * gm[0] && gm[1] > 5 * gm[0], 'the Gate of a prove level is harder (its own size in gateMul)');
  ok(G.fold('bossHp', a, 100, a.run.floor - 25) === 100 * G.PARAMS.sites.proveHp && G.fold('bossHp', b, 100, b.run.floor - 25) === 100, 'a Rock before the Gate: the normal size (times the prove factor on a prove level), not gateMul');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('starshop: ok');
