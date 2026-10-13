// Contracts. Run: node test_proto_contracts.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const NO = () => {};
const clear = s => { for (const row of s.rows) for (let c = 0; c < G.COLS; c++) row[c] = null; };
// a state that may move: two Big Rocks down, `sites` moves done
const NEED = G.PARAMS.contracts.tierNeed.slice();
let free = false;
const OPEN = G.PARAMS.contracts.openSites;   // the board opens after this many New Sites (a pacing number)
function ready(sites = OPEN, seed = 1) {
  G.PARAMS.contracts.tierNeed = free ? [0, 0, 0, 0] : NEED;
  G.seedRng(seed);
  const s = G.newState();
  s.bossesDown = 2; s.best = 52; s.sites = sites;
  return s;
}
const take = (s, id) => G.startContract(s, id, NO);
const run = (s, secs, ev = NO) => { for (let i = 0; i < secs * 20; i++) G.step(s, 0.05, ev); };

{ // the board opens at the third New Site, and is told once
  const s = ready(OPEN - 1);
  ok(!G.contractsOpen(s) && G.contractState(s, 'bare') === 'locked' && !take(s, 'bare'), 'closed before the third New Site');
  s.sites = OPEN;
  const seen = [];
  G.step(s, 0.05, k => seen.push(k)); G.step(s, 0.05, k => seen.push(k));
  ok(seen.filter(k => k === 'contractsOpen').length === 1 && s.unlocked['contracts:open'], 'told once, and counted as content');
  ok(G.contractState(s, 'bare') === 'open' && G.contractState(s, 'tntOnly') === 'locked' && G.contractState(s, 'feedRock') === 'locked', 'tier 1 open, the rest locked');
}
free = true;
{ // taking one: a New Site with the rule on; needs the second Big Rock
  const s = ready();
  s.bossesDown = 1;
  ok(!take(s, 'bare'), 'cannot take one before the second Big Rock');
  s.bossesDown = 2;
  const stars = s.stars;
  ok(take(s, 'bare') && s.contract === 'bare' && s.site === 'dunes' && s.stars > stars && s.best === 0, 'taking is a New Site that pays Stars');
  ok(G.contractGoal(s).of === 40 && !G.contractGoal(s).done, 'the goal is known');
}
{ // bare hands: Rafeeqs are sent home and paid back
  const s = ready(); take(s, 'bare');
  s.coins = 1000; s.total = 1000;
  G.buy(s, 'crew'); const paid = s.coins;
  const notes = [];
  run(s, 0.2, k => notes.push(k));
  ok(s.diggers.length === 0 && s.up.crew === 0 && s.coins === 1000 && paid < 1000 && notes.includes('contractNote'), 'a hired Rafeeq goes home and the coins come back');
  ok(G.fold('crewPower', s, 1) === 0, 'and Rafeeq work is nothing');
}
{ // winning: stamp, Stars, cosmetic, rule lifts, survives a New Site
  const s = ready(); take(s, 'bare');
  s.best = 40;
  const seen = [];
  const stars = s.stars;
  G.step(s, 0.05, (k, d) => seen.push([k, d]));
  ok(s.contractsWon.bare === 1 && s.contract === null && s.stars === stars + 1 + G.medalPay(50), 'won: stamped, 1 Star and the Hard medal, the rule lifts');
  ok(seen.some(([k, d]) => k === 'contractDone' && d.id === 'bare') && s.unlocked['contract:bare'], 'told and counted');
  s.bossesDown = 0;
  ok(G.canNewSite(s) && G.canTake(s, 'dark') !== undefined, 'a won contract lets you move on at once, Rocks or not');
  G.newSite(s, 'dunes', NO); ok(!s.contractFree && (s.bossesDown > 0 || !G.canNewSite(s)), 'the next site needs its Rocks again');
  ok(s.contractLook.hat === 'cap' && G.ownsCosmetic(s, 'cap') && !G.ownsCosmetic(s, 'crown'), 'the cap is yours');
  ok(G.fold('crewPower', s, 1) > 0, 'rule gone after the win');
  s.bossesDown = 2;
  G.newSite(s, 'boom', NO);
  ok(s.contractsWon.bare === 1 && s.contractLook.hat === 'cap', 'stamps and looks survive a New Site');
  ok(G.contractState(s, 'bare') === 'won' && !take(s, 'bare'), 'a won contract is not taken again');
}
{ // tiers open by winning
  free = false;
  const s = ready();
  s.contractsWon.bare = 1;
  ok(G.contractState(s, 'tntOnly') === 'locked', 'one win is not enough');
  s.contractsWon.dark = 1;
  const seen = [];
  G.step(s, 0.05, (k, d) => seen.push(k === 'contractTier' ? d.tier : k));
  ok(G.contractState(s, 'tntOnly') === 'open' && seen.includes(2) && s.unlocked['contracts:tier2'], 'two wins open tier 2, told once');
  s.contractsWon.tntOnly = 1; s.contractsWon.glass = 1; s.contractsWon.oneRelic = 1;
  ok(G.contractState(s, 'feedRock') === 'open', 'three wins in tier 2 open tier 3');
}
free = true;
{ // leaving is free
  const s = ready(); take(s, 'richLazy');
  ok(s.crewJob === 'aimed' && s.coins >= 400, 'rich and lazy: money and the aimed job');
  s.best = 9; const coins = s.coins;
  ok(G.leaveContract(s, NO) && s.contract === null && s.best === 9 && s.coins === coins && s.crewJob === 'nearest', 'leaving loses nothing, the dig goes on');
  ok(!s.contractsWon.richLazy, 'and is not a win');
  ok(!G.leaveContract(s, NO), 'nothing to leave');
}
{ // in the dark
  const s = ready(); take(s, 'dark');
  ok(G.sight(s) === 1, 'dark: one block');
  s.contractsWon.dark = 1; s.contract = null;
  ok(G.sight(s) === 2, 'no rule, normal sight');
  // the prize: TNT shows through the dark
  for (const row of s.rows) row.fill({ t: 'dirt', hp: 5, max: 5, s: 0 });
  s.rows[8][5] = { t: 'tnt', hp: 1, max: 1, s: 0 };
  ok(G.visibleMask(s)[8][5] === true && G.visibleMask(s)[8][6] === false, 'TNT shows through the dark');
  s.contractsWon.dark = 0;
  ok(G.visibleMask(s)[8][5] === false, 'but only for the winner');
}
{ // rising sand: counted in blocks, then the hole refills
  const s = ready(); take(s, 'rising');
  s.coins = 5;
  for (let i = 0; i < 99; i++) { s.rows[0][i % 10] = null; G.damage(s, 0, i % 10, 0, 'you', NO); }
  G.seedRng(3);
  // break 100 real blocks
  const s2 = ready(); take(s2, 'rising');
  let n = 0;
  for (let r = 0; r < 12 && n < 99; r++) for (let c = 0; c < 10 && n < 99; c++) { if (s2.rows[r][c]) { G.breakCell(s2, s2.top + r, c, 'you', NO); n++; } }
  ok(s2.contractRun.n === 99 && !s2.contractRun.refill, '99 blocks: still fine');
  s2.best = 15;
  for (let r = 0; r < 12; r++) for (let c = 0; c < 10; c++) if (s2.rows[r][c]) { G.breakCell(s2, s2.top + r, c, 'you', NO); break; }
  let fill = 0; G.step(s2, 0.05, k => { if (k === 'sandFill') fill++; });
  ok(fill === 1 && s2.best === 0 && s2.top === 0 && s2.contractRun.n === 0 && s2.rows.every(r => r.some(x => x)), 'the 100th block: the sand refills the hole');
  ok(s2.contract === 'rising', 'still in the contract');
}
{ // TNT only: the pick does nothing to rock, a trail of TNT leads down, blasts open it
  const s = ready(OPEN); take(s, 'tntOnly');
  const tnt = [];
  for (let i = 0; i < s.rows.length; i++) { const c = s.rows[i].findIndex(x => x && x.t === 'tnt'); if (i % 2 === 0 && i <= 12) tnt.push([i, c]); }
  ok(tnt.every(([i, c]) => c >= 0), 'a TNT in every second row');
  let follows = true;
  for (let k = 1; k < tnt.length; k++) if (Math.abs(tnt[k][1] - tnt[k - 1][1]) > 1) follows = false;
  ok(follows, 'each one within a column of the one above');
  const hp = s.rows[1][0].hp;
  ok(G.swing(s, 0, 0, NO) === true && s.rows[0][0] && s.rows[0][0].hp === s.rows[0][0].max, 'the pick does nothing to dirt');
  s.coins = 100000; for (let i = 0; i < 6; i++) G.buy(s, 'pick');
  const [r0, c0] = tnt[0];
  for (let i = 0; i < 20 && s.rows[0][c0]; i++) G.swing(s, 0, c0, NO);
  ok(!s.rows[0][c0], 'but a TNT breaks');
  run(s, 2);
  ok(s.rows[1].filter(x => x === null).length >= 1 && s.best >= 2, 'and its blast opens the ground');
  ok(hp > 0, 'sanity');
}
{ // glass pick
  const s = ready(); take(s, 'glass');
  s.up.pick = 5;
  const seen = [];
  for (let i = 0; i < 29; i++) { s.rows[0][i % 10] = { t: 'dirt', hp: 99999, max: 99999, s: 0 }; G.swing(s, 0, i % 10, k => seen.push(k)); }
  ok(s.up.pick === 5, 'hit 29: the pick holds');
  G.swing(s, 0, 0, k => seen.push(k));
  ok(s.up.pick === 0 && seen.includes('glassBreak'), 'hit 30: level 1 again');
}
{ // one relic only
  const s = ready(); take(s, 'oneRelic');
  const first = G.rollDraft(s);
  ok(first.length >= 3, 'the first chest offers a choice');
  s.chests = 3; G.takeRelic(s, first[0]);
  const held = first[0];
  const next = G.rollDraft(s);
  ok(next.every(id => id === held) && next.length <= 1, 'after that, a chest only makes it stronger');
  s.relics[held] = G.RELICS[held].max;
  ok(G.rollDraft(s).length === 0, 'and nothing when it is full');
  s.contract = null; s.contractsWon.oneRelic = 1; s.chestsOpened = 0; s.relics = {};
  ok(G.rollDraft(s).length === 4, 'prize: the first chest of a site has 4 cards');
  s.chestsOpened = 1;
  ok(G.rollDraft(s).length === 3, 'the next ones have 3');
}
{ // rich and lazy: no pick, Rafeeqs do the work where you aim
  const s = ready(); take(s, 'richLazy');
  ok(!G.swing(s, 0, 3, NO), 'the pick cannot swing');
  G.buy(s, 'crew'); G.buy(s, 'crew');
  ok(s.diggers.length === 3, 'two Rafeeqs bought with the gift, beside the one of the start kit');
  s.contractAim = [0, 8];
  run(s, 4);
  ok(s.total > 400 && s.rows[0][8] === null, 'they dug, near the aim');
}
{ // feed the rock: only ore hurts it
  const s = ready(OPEN); take(s, 'feedRock'); s.diggers.length = 0;   // no Rafeeq of the start kit near the Rock
  s.top = 0; clear(s);
  s.rows = []; for (let i = 0; i < G.KEEP_ROWS; i++) s.rows.push(G.genRow(s, 20 + i));
  s.top = 20;
  const bi = 5; ok(s.rows[bi][0].t === 'boss', 'a Big Rock at 25');
  const b = G.bossInView(s); const full = b.hp;
  s.rows[bi - 1][4] = null;
  G.damage(s, 25, 4, 1e9, 'you', NO);
  ok(b.hp === full, 'a huge hit does nothing');
  G.blastAt && G.blastAt(s, 24, 4, { rad: 1, dmg: 1e9, src: 'you', delay: 0, centre: true }); run(s, 1);
  ok(G.bossInView(s).hp === full, 'a blast does nothing');
  s.rows[bi - 1][2] = { t: 'copper', hp: 1, max: 1, s: 0 };
  s.rows[bi - 2][2] = null;
  const seen = [];
  G.breakCell(s, 24, 2, 'you', k => seen.push(k));
  ok(G.bossInView(s).hp < full && seen.includes('feed'), 'a broken ore is thrown at it');
  const after = G.bossInView(s).hp;
  s.rows[bi - 1][3] = { t: 'gem', hp: 1, max: 1, s: 0 };
  G.breakCell(s, 24, 3, 'you', NO);
  ok(after - G.bossInView(s).hp > full - after, 'a gem hurts more than copper');
  s.contract = null; s.contractsWon.feedRock = 1;
  const a2 = G.bossInView(s).hp;
  s.rows[bi - 1][1] = { t: 'copper', hp: 1, max: 1, s: 0 };
  G.breakCell(s, 24, 1, 'you', NO);
  const d2 = a2 - G.bossInView(s).hp;
  ok(d2 > 0 && d2 < full - after, 'prize: ore chips Big Rocks a little, for ever');
  G.damage(s, 25, 4, 1e9, 'you', NO);
  ok(!G.bossInView(s) || G.bossInView(s).hp < a2 - d2, 'and with no contract the pick works again');
}
{ // dry sand: no random chests, Big Rocks give them
  const s = ready(); take(s, 'dry');
  ok(G.fold('chestChance', s, 1) === 0, 'no chests in the sand');
  s.contract = null; s.contractsWon.dry = 1;
  const c = s.chests;
  G.run('bossDown', s, 25);
  ok(s.chests === c + 2, 'prize: a Big Rock gives one more chest');
}
{ // blind and alone: both rules
  const s = ready(); take(s, 'blindAlone');
  ok(G.sight(s) === 1 && G.fold('crewPower', s, 1) === 0, 'both rules at once');
}
{ // every contract: a tier, a site, a goal, strings
  const list = G.contractList();
  ok(list.length === 10 && [1, 2, 3].every(t => list.some(c => c.tier === t)), 'ten contracts in three tiers');
  for (const c of list) {
    ok(G.SITES[c.site], c.id + ': a real site');
    ok(G.hasString('c_' + c.id) && G.hasString('c_' + c.id + '_d') && G.hasString('c_' + c.id + '_p'), c.id + ': name, rule, prize');
    ok(typeof c.goal(G.newState()).of === 'number', c.id + ': a goal');
  }
  ok(Object.keys(G.cosmetics()).sort().join() === 'cap,crown,glass,gold', 'four looks');
  const s = ready();
  ok(G.equip(s, 'hat', '') && !G.equip(s, 'hat', 'cap') && (s.contractsWon.bare = 1) && G.equip(s, 'hat', 'cap') && s.contractLook.hat === 'cap' && !G.equip(s, 'skin', 'cap'), 'looks: only what you own, in its own slot');
}
{ // goals fit the level: a player who has finished deep levels is asked for a real depth, and starts with none of it done
  for (const id of G.contractList().map(c => c.id)) {
    const C = G.CONTRACTS[id];
    for (const reach of [0, 125, 200, 275]) {
      const s = ready(); s.road.reach = reach; s.best = 0; s.bossesDown = 2; s.sites = 99;
      const ask = G.contractAsk(s, id);
      ok(ask.floor >= 50 && ask.floor % G.LAYER === 0, id + ': the dig has a Gate on a Big Rock row');
      if (!take(s, id)) { ok(false, id + ' could not be taken at reach ' + reach); continue; }
      const g = G.contractGoal(s);
      ok(!g.done && g.now === 0, id + ': nothing is done the moment it is taken (reach ' + reach + ')');
      if (ask.depth) ok(g.of === ask.depth && s.run.floor >= ask.depth, id + ': the goal is above the Gate floor');
      if (reach >= 125 && ask.depth) ok(ask.depth >= Math.round(0.3 * reach), id + ': at reach ' + reach + ' the goal is a real share of it (' + ask.depth + ')');
    }
  }
  const lo = ready(); lo.road.reach = 125; const hi = ready(); hi.road.reach = 275;
  ok(G.contractAsk(hi, 'bare').depth > G.contractAsk(lo, 'bare').depth && G.contractAsk(lo, 'bare').depth > G.PARAMS.contracts.bareDepth, 'a deeper road asks for more');
  // an old run (no goal number kept) still uses the old plain goal
  const o = ready(); take(o, 'bare'); delete o.run.goalDepth; ok(G.contractGoal(o).of === G.PARAMS.contracts.bareDepth, 'an old run keeps the old goal');
}
{ // chili rules: pip n has the first n rules; the Gate is the goal and the contract never "wins" by itself
  const s = ready(); s.road.reach = 50;
  for (let n = 1; n <= 5; n++) ok(G.CONTRACTS['chili' + n] && !G.CONTRACTS['chili' + n].tier && G.hasString('c_chili' + n) && G.hasString('c_chili' + n + '_d'), 'chili ' + n + ' is registered and named');
  const rules = id => { const x = ready(); x.contract = id; x.up.crew = 0; return x; };
  const c1 = rules('chili1'), c2 = rules('chili2'), c3 = rules('chili3'), c5 = rules('chili5');
  ok(G.fold('crewPower', c1, 1) === G.PARAMS.contracts.teaPace && G.fold('sight', c1, 9) === 9, 'pip 1: the crew works slowly, you still see');
  ok(G.fold('sight', c2, 9) === G.PARAMS.contracts.darkSight && G.fold('crewPower', c2, 1) === G.PARAMS.contracts.teaPace, 'pip 2 adds the dark');
  c3.relics.deep = 1; ok(G.fold('draftPool', c3, ['deep', 'wide', 'hop'], c3).join() === 'deep' && G.fold('draftPool', c2, ['deep', 'wide'], c2).length === 2, 'pip 3 adds one relic only');
  ok(G.fold('crewPower', c5, 1) === 0, 'pip 5: no Rafeeqs at all');
  const g = G.contractGoal(c5); ok(g && g.noWin && g.kind === 'gate', 'the goal is the Gate');
  const w = ready(); G.siteRun(w); w.contract = 'chili2'; w.best = 9999; G.step(w, 0.05, NO); ok(w.contract === 'chili2' && !w.contractsWon.chili2, 'a chili contract is not won by depth');
  // glass: every 60th hit the pick loses half
  const gl = rules('chili4'); gl.up.pick = 10; gl.hits = G.PARAMS.contracts.chiliGlassEvery;
  G.run('swung', gl, { r: 0, c: 0 }, NO); ok(gl.up.pick === 5, 'pip 4: the glass pick loses half its levels');
  // saves: a run in the middle of a chili survives a save
  const m = ready(); m.road.stamps['dunes:50'] = { site: 'dunes', floor: 50, twist: '', fin: 1, fast: 0, hard: 0, best: 9, n: 1 }; m.bossesDown = 2;
  G.pickCard(m, G.replayCard(m, 'dunes:50', true), NO);
  const back = G.deserialize(G.serialize(m)); ok(back.contract === 'chili1' && back.run.chili === 1, 'a chili level in play survives a save');
  // an old save with a Hard medal and no chili count: pip 1 won, the next card is pip 2
  const o = ready(); o.road.stamps['dunes:50'] = { site: 'dunes', floor: 50, twist: '', fin: 1, fast: 0, hard: 1, best: 9, n: 1 };
  const oldBack = G.deserialize(G.serialize(o)); ok(G.replayCard(oldBack, 'dunes:50', true).chili === 2, 'an old Hard medal is pip 1 won');
  // the bot's pick
  const f = ready(); f.road.stamps['dunes:50'] = { site: 'dunes', floor: 50, twist: '', fin: 1, fast: 0, hard: 0, best: 9, n: 1 }; f.run = { ...G.siteRun(f), key: 'dunes:50', site: 'dunes', floor: 50, done: true, time: 1, par: 300 };
  ok(G.chiliBotPick(f, {}, () => 0)?.chili === 1 && G.chiliBotPick(f, {}, () => 0.99) === null, 'the bot sometimes takes the next chili after a quick finish');
}
{ // save round trip and an old save
  const s = ready(); take(s, 'tntOnly'); s.contractsWon.bare = 1; s.contractLook.hat = 'cap';
  const back = G.deserialize(G.serialize(s));
  ok(back && back.contract === 'tntOnly' && back.contractsWon.bare === 1 && back.contractLook.hat === 'cap' && back.contractRun.col === s.contractRun.col, 'save round trip');
  const o = JSON.parse(G.serialize(G.newState()));
  for (const k of ['contractsWon', 'contractLook', 'contractRun']) delete o[k];
  const old = G.deserialize(JSON.stringify(o));
  ok(old && Object.keys(old.contractsWon).length === 0 && old.contractLook.skin === '' && old.contractRun.n === 0 && old.contract === null, 'an old save without the slices loads');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('contracts: ok');
