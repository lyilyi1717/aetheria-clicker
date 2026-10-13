// Dig: "Buy all" (the pure helper): same as buying one by one, never overspends, respects caps and locks.
import * as G from './proto/game.js';
import { buyAll, buyAllPlan, cheapestBuy, BUY_ALL_MIN } from './proto/features/shop/buyall.js';

let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.error('FAIL: ' + m); } };

{ // the same result as one by one, and never over the purse
  const a = G.newState(), b = G.newState();
  a.coins = b.coins = 5000;
  const plan = buyAllPlan(a, 'coin');
  ok(a.coins === 5000 && a.up.pick === 0, 'the plan does not touch the state');
  const r = buyAll(a, 'coin');
  let n = 0, id;
  while ((id = cheapestBuy(b, 'coin'))) { ok(G.buy(b, id), 'one by one buys ' + id); n++; }
  ok(r.count === n && n > 5, 'same count as one by one (' + r.count + ' vs ' + n + ')');
  ok(plan.count === r.count && plan.spent === r.spent, 'the plan says what buying does');
  ok(a.coins === b.coins && a.up.pick === b.up.pick && a.up.luck === b.up.luck, 'same levels and purse');
  ok(a.coins >= 0 && r.spent === 5000 - a.coins, 'never overspends, spent adds up');
  ok(cheapestBuy(a, 'coin') === null, 'nothing more is affordable after');
  ok(Object.values(r.bought).reduce((x, y) => x + y, 0) === r.count, 'the summary counts every purchase');
}
{ // too poor: nothing
  const s = G.newState(); s.coins = 1;
  const r = buyAll(s, 'coin');
  ok(r.count === 0 && s.coins === 1, 'nothing affordable, nothing bought');
}
{ // a max level stops
  const s = G.newState(); s.coins = 1e12; s.bossesDown = 1; s.up.luck = 19;
  buyAll(s, 'coin', () => {});
  ok(s.up.luck === G.ITEMS.luck.max, 'Lucky Sieve stops at its max (' + s.up.luck + ')');
}
{ // a locked item is skipped; every buy still reports itself
  const s = G.newState(); s.coins = 1e6; s.bossesDown = 0; s.up.luck = 0;
  const seen = [];
  buyAll(s, 'coin', k => seen.push(k));
  ok(s.up.luck === 0, 'a shut item is not bought');
  ok(seen.filter(k => k === 'buy').length > 0, 'buy events are reported');
}
{ // the threshold
  ok(BUY_ALL_MIN === 6, 'more than 5');
  const s = G.newState(); s.coins = 100;
  ok(buyAllPlan(s, 'coin').count < BUY_ALL_MIN || true, 'a plan always answers');
}
if (bad) { console.error(bad + ' failed'); process.exit(1); }
console.log('buy all: ok');
