// Earned automation. Run: node test_proto_autos.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (c, m) => { if (!c) { failed++; console.error('FAIL: ' + m); } };
const NO = () => {};
const run = (s, secs, ev = NO) => { for (let i = 0; i < secs * 20; i++) G.step(s, 0.05, ev); };
const fresh = () => { G.seedRng(5); return G.newState(); };
const put = (s, r, c, t) => { s.rows[r - s.top][c] = { t, hp: 1, max: 1, s: 1 }; };
const own = (s, ...ids) => { for (const id of ids) { s.autoOwn[id] = 1; s.autoOn[id] = true; } };

{ // earned by counts of what you do by hand; machines buying for you do not count
  const s = fresh();
  s.coins = Infinity;
  const seen = [];
  for (let i = 0; i < 99; i++) G.buy(s, 'pick', (k, d) => seen.push(k));
  G.step(s, 0.05, (k, d) => seen.push(k + (d && d.id ? ':' + d.id : '')));
  ok(s.autoStat.pick === 99 && !s.autoOwn.buyPick, '99 buys by hand: not yet');
  G.buy(s, 'pick'); G.step(s, 0.05, (k, d) => seen.push(k + (d && d.id ? ':' + d.id : '')));
  ok(s.autoOwn.buyPick && seen.includes('autoWon:buyPick') && s.unlocked['auto:buyPick'], 'the 100th wins it, with an event, counted as content');
  ok(G.autoProgress(s, 'buyPick').now === 100 && G.autoProgress(s, 'sorter').now === 0, 'progress is readable');
  const n = s.autoStat.pick; own(s, 'buyPick');
  s.up.pick = 0; s.coins = 1e6; run(s, 0.2);
  ok(s.up.pick > 0 && s.autoStat.pick === n, 'the machine buys, and its buys are not counted');
}

{ // auto-buy: cheapest ticked item, keeps N coins, only what is ticked and owned
  const s = fresh();
  s.coins = 100; own(s, 'buyPick');
  s.autoSet.keep = 100;
  run(s, 0.5);
  ok(s.up.pick === 0 && s.coins === 100, 'keep 100 with 100 coins: buys nothing');
  s.autoSet.keep = 25; run(s, 0.5);
  ok(s.up.pick > 0 && s.coins >= 25, 'keep 25: buys down to 25');
  const t = fresh(); t.coins = 1e6; t.total = 1e6; t.autoOn.buyPick = true;
  run(t, 0.5);
  ok(t.up.pick === 0, 'a machine you have not earned does nothing even if the switch is on');
  own(t, 'buyCrew'); t.autoOn.buyPick = false; run(t, 1);
  ok(t.up.crew > 0 && t.up.pick === 0, 'only the ticked item is bought');
  ok(!G.autoKeep(t, 7) && G.autoKeep(t, 500) && t.autoSet.keep === 500, 'keep takes only the listed steps');
}

{ // the chest sorter: takes a wished relic, leaves a chest that offers none, never re-rolls it
  const s = fresh(); own(s, 'sorter');
  s.chests = 1;
  ok(G.autoWishAdd(s, 'boom') && G.autoWishAdd(s, 'deep') && !G.autoWishAdd(s, 'boom') && !G.autoWishAdd(s, 'nope'), 'a wish list, no doubles, only real relics');
  ok(G.autoWishMove(s, 'deep', -1) && s.autoSet.wish[0] === 'deep' && G.autoWishDrop(s, 'boom') && s.autoSet.wish.length === 1, 'reorder and remove');
  const ev = []; run(s, 0.3, k => ev.push(k));
  const took = ev.includes('autoPick');
  ok(took ? (s.chests === 0 && s.relics.deep === 1) : (s.chests === 1 && ev.includes('autoHold')), 'either takes the wished relic or leaves the chest');
  // force a miss: the list holds a relic that cannot be offered
  const m = fresh(); own(m, 'sorter'); G.autoWishAdd(m, 'echo');
  m.relics.echo = G.RELICS.echo.max;   // maxed: never offered
  m.chests = 2; let holds = 0, rolls = 0;
  run(m, 1, k => { if (k === 'autoHold') holds++; });
  ok(m.chests === 2 && m.autoWait === 2 && holds === 1, 'a chest with nothing wished waits (judged once, then left alone)');
  const before = m.chestsOpened; m.chests--; m.chestsOpened++; run(m, 0.5);
  ok(m.autoStat.hand === 1 && m.chestsOpened === before + 1, 'opening it by hand counts for the sorter');
  const e = fresh(); own(e, 'sorter'); e.chests = 3;
  run(e, 0.5);
  ok(e.chests === 3 && e.autoWait === 3, 'an empty list takes nothing');
  ok(e.autoStat.hand === 0, 'sorter picks are not hand picks');
}

{ // 50 chests by hand wins the sorter; a New Site starting the count again does not lose the total
  const s = fresh();
  s.chestsOpened = 30; G.step(s, 0.05, NO);
  s.chestsOpened = 0; G.step(s, 0.05, NO);   // New Site
  s.chestsOpened = 20; G.step(s, 0.05, NO);
  ok(s.autoStat.hand === 50 && s.autoOwn.sorter, 'counts across sites, then wins');
}

{ // the tool timer: only a FULL tool, only when the rule is true
  const s = fresh(); s.forgeOn = true; s.metal = 1e4; G.buy(s, 'drill'); G.buy(s, 'dynamite'); G.buy(s, 'magnet');
  own(s, 'timer');
  for (let i = 0; i < G.VIEW_ROWS; i++) for (let c = 0; c < G.COLS; c++) s.rows[i][c] = { t: 'dirt', hp: 5, max: 5, s: 1 };
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;
  put(s, 1, 4, 'copper'); put(s, 2, 4, 'silver'); put(s, 3, 4, 'copper');
  ok(G.autoTimerSet(s, 'drill', 'column') && !G.autoTimerSet(s, 'drill', 'nope') && !G.autoTimerSet(s, 'magnet', 'crack'), 'rules are checked');
  s.toolCh.drill = 2; s.toolCh.dynamite = 0; s.toolCh.magnet = 0;
  const ev = []; run(s, 1, k => ev.push(k));
  ok(!ev.includes('autoTool') && s.toolCh.drill === 2, 'not full: the machine leaves it to you');
  s.toolCh.drill = G.PARAMS.forge.cap; run(s, 1, k => ev.push(k));
  ok(ev.includes('autoTool') && s.toolCh.drill === G.PARAMS.forge.cap - 1, 'full and ore in the column: it fires once, two charges stay');
  s.toolCh.drill = G.PARAMS.forge.cap; for (let i = 0; i < 5; i++) for (let c = 0; c < G.COLS; c++) if (s.rows[i][c] && s.rows[i][c].t !== 'dirt') s.rows[i][c] = { t: 'dirt', hp: 5, max: 5, s: 1 };
  const n = ev.length; run(s, 1, k => ev.push(k));
  ok(ev.length === n || !ev.slice(n).includes('autoTool') || s.toolCh.drill < G.PARAMS.forge.cap, 'ore gone: the rule is false');
  // the Big Rock crack
  const b = fresh(); b.forgeOn = true; b.metal = 1e4; G.buy(b, 'drill'); G.buy(b, 'dynamite'); own(b, 'timer');
  b.top = 20; b.rows = []; for (let i = 0; i < G.KEEP_ROWS; i++) b.rows.push(G.genRow(b, 20 + i));
  for (let i = 0; i < 5; i++) for (let c = 0; c < G.COLS; c++) b.rows[i][c] = null;
  G.autoTimerSet(b, 'dynamite', 'crack');
  b.toolCh.dynamite = 2;
  const evb = []; run(b, 1, k => evb.push(k));
  ok(!evb.includes('autoTool'), 'dynamite not full: waits');
  b.toolCh.dynamite = G.PARAMS.forge.cap; run(b, 1, k => evb.push(k));
  ok(evb.includes('autoTool') && b.toolCh.dynamite === G.PARAMS.forge.cap - 1, 'full and the Big Rock crack in reach: dynamite goes on the crack');
  ok(G.autoSpot(b, 'dynamite', 'crack')[1] === b.boss.weak, 'the spot is the crack');
}

{ // the habit: switches the job by a rule, not on every flicker, and a hand order stays until the rule flips
  const s = fresh(); s.foremanHere = true; own(s, 'habit');
  for (let i = 0; i < G.VIEW_ROWS; i++) for (let c = 0; c < G.COLS; c++) s.rows[i][c] = { t: 'dirt', hp: 5, max: 5, s: 1 };
  ok(G.autoHabitSet(s, 'cond', 'ore') && G.autoHabitSet(s, 'a', 'ore') && G.autoHabitSet(s, 'b', 'down') && !G.autoHabitSet(s, 'a', 'fly'), 'rule set, jobs checked');
  const jobs0 = s.autoStat.jobs;
  run(s, 2);
  ok(s.crewJob === 'down' && s.autoStat.jobs === jobs0, 'no ore in sight: Dig down, and it is not counted as a hand change');
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;
  put(s, 1, 3, 'gold'); s.rows[0][3] = { t: 'gold', hp: 1, max: 1, s: 1 };
  run(s, 2);
  ok(s.crewJob === 'ore', 'ore appears: Go for ore');
  G.foremanSet(s, 'follow', NO); G.step(s, 0.05, NO);
  ok(s.autoStat.jobs === jobs0 + 1, 'a hand order counts');
  run(s, 2);
  ok(s.crewJob === 'follow', 'a hand order stays until the rule flips');
}

{ // 30 jobs by hand win the habit
  const s = fresh(); s.foremanHere = true;
  for (let i = 0; i < 30; i++) { G.foremanSet(s, i % 2 ? 'down' : 'ore', NO); G.step(s, 0.05, NO); }
  ok(s.autoOwn.habit, 'thirty changes by hand');
}

{ // contracts: Shop shut hands a buy back and wins the sieve buyer; Hands off needs the Forge and wins the timer
  const s = fresh(); s.bossesDown = 2; s.best = 52; s.sites = G.PARAMS.contracts.openSites;
  ok(G.contractList().some(c => c.id === 'shopShut' && c.tier === 1) && G.contractList().some(c => c.id === 'handsOff' && c.tier === 2), 'both are on the board');
  ok(G.contractState(s, 'shopShut') === 'open', 'tier 1 is open');
  ok(G.startContract(s, 'shopShut', NO) && s.contract === 'shopShut', 'taken');
  s.coins = 500; const ev = []; G.buy(s, 'pick'); run(s, 0.2, k => ev.push(k));
  ok(s.up.pick === 0 && s.coins === 500 && ev.includes('autoRefund'), 'a buy is handed back');
  own(s, 'buyPick'); run(s, 0.3);
  ok(s.up.pick === 0, 'and the buyer machine is shut out too');
  s.best = 25; run(s, 0.1);
  ok(s.contractsWon.shopShut && s.autoOwn.buySieve, 'won: the sieve buyer is yours');
  const h = fresh(); h.bossesDown = 2; h.best = 52; h.sites = 3;
  for (const id of ['bare', 'dark']) h.contractsWon[id] = 1;
  ok(G.contractState(h, 'handsOff') === 'locked', 'Hands off needs the Forge');
  h.forgeOn = true; h.metal = 100; G.buy(h, 'drill');
  ok(G.contractState(h, 'handsOff') === 'open', 'then it opens');
  ok(G.startContract(h, 'handsOff', NO), 'taken');
  ok(h.toolCh.drill === G.PARAMS.forge.cap, 'begins with the tool full');
  const hit = G.fold('pickPower', h, 1);
  h.contract = null; const full = G.fold('pickPower', h, 1);
  ok(hit < full, 'the pick does less while the rule is on');
  h.contract = 'handsOff'; h.best = 25; run(h, 0.1);
  ok(h.autoOwn.timer, 'won: the tool timer is yours');
}

{ // away: nothing runs (auto-buy, the sorter), so the return keeps its chests
  const s = fresh(); s.coins = 0; own(s, 'buyPick', 'sorter'); G.autoWishAdd(s, 'boom');
  s.up.crew = 3; for (let i = 0; i < 3; i++) s.diggers.push({ c: i, r: 0, tc: -1, tr: -1, cd: 0, swing: 0 });
  const out = G.settleAway(s, 3600, NO);
  ok(s.up.pick === 0 && s.chests === out.chests && s.chestsOpened === 0, 'the settlement buys nothing and opens nothing');
}

{ // the save: round trip, and an old save without the slices
  const s = fresh(); own(s, 'sorter'); G.autoWishAdd(s, 'boom'); G.autoKeep(s, 100); s.autoStat.hand = 7;
  const b = G.deserialize(G.serialize(s));
  ok(b && b.autoOwn.sorter === 1 && b.autoSet.wish[0] === 'boom' && b.autoSet.keep === 100 && b.autoStat.hand === 7, 'round trip');
  const o = JSON.parse(G.serialize(s));
  for (const k of ['autoOwn', 'autoOn', 'autoSet', 'autoStat', 'autoWait', 'autoBase']) delete o[k];
  const old = G.deserialize(JSON.stringify(o));
  ok(old && !Object.keys(old.autoOwn).length && old.autoSet.timer.drill === 'off' && old.autoStat.pick === 0, 'an old save loads with defaults');
  G.step(old, 0.05, NO);
  ok(old.autoStat.pick === 0, 'and plays');
  const t = fresh(); own(t, 'buyPick'); t.autoStat.pick = 12;
  G.reset(t, 'site');
  ok(t.autoOwn.buyPick === 1 && t.autoOn.buyPick && t.autoStat.pick === 12, 'machines and counts survive a New Site');
}

{ // the content is counted
  const u = G.unlocks().list.map(x => x.id);
  ok(['buyPick', 'buyCrew', 'buyTrain', 'buySieve', 'sorter', 'timer', 'habit'].every(id => u.includes('auto:' + id)) && u.includes('contract:handsOff'), 'machines and contracts are content');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('Autos OK');
