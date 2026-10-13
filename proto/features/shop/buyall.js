// Dig: "Buy all" for a shop (pure rules, no page). Greedy, cheapest first, one level at a time through the same canBuy / buy
// the buttons use, so every cap, lock and max level is respected and the result equals clicking one by one.
import { ITEMS, SHOPS } from '../../core/registry.js';
import { canBuy, buy, upgradeCost } from '../../core/rules.js';

export const BUY_ALL_MIN = 6;          // the button shows when MORE than 5 purchases are affordable at once
const LIMIT = 200;                     // a safety stop, far above anything a purse buys

const idsOf = shop => Object.keys(ITEMS).filter(id => ITEMS[id].shop === shop);

// the cheapest purchase that is open, below its max and affordable now: an item id, or null
export function cheapestBuy(s, shop) {
  let best = null, bc = Infinity;
  for (const id of idsOf(shop)) {
    if (!canBuy(s, id)) continue;
    const c = upgradeCost(s, id);
    if (c < bc) { bc = c; best = id; }
  }
  return best;
}

// buy greedily on `s` itself. `ev` sees every event as a normal buy does (telemetry, first-time notes); the page's buy sound
// is throttled to one per 50 ms, so the lot plays as one sound.
// returns { count, spent, bought: { id: n } } with the ids in the order they were first bought
export function buyAll(s, shop, ev = () => {}) {
  const wallet = SHOPS[shop].wallet, start = s[wallet], bought = {};
  let count = 0;
  while (count < LIMIT) {
    const id = cheapestBuy(s, shop);
    if (!id || !buy(s, id, ev)) break;
    bought[id] = (bought[id] || 0) + 1;
    count++;
  }
  return { count, spent: start - s[wallet], bought };
}

// what buyAll would do, without doing it (it runs on a copy of the state)
export function buyAllPlan(s, shop) {
  return buyAll(structuredClone(s), shop);
}
