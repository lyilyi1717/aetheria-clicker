// Bazaar: mean-reverting prices, spread + stock cap, caravan cargo. Seeded rng only.
// Run: node test_market.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { particles } from './js/engine/ParticleEngine.js';
import {
  MarketSystem, COMMODITIES, getStockCap, STOCK_CAP_VALUE, BUY_MARKUP, SELL_MARKDOWN, CARGO_MULT
} from './js/systems/MarketSystem.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ORE = COMMODITIES[0];
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(b));
const make = (seed = 1, gold = 1e12) => {
  const gs = new GameState();
  gs.gold = new BigNum(gold);
  const ms = new MarketSystem(gs, mulberry32(seed));
  gs.marketSystem = ms;
  return { gs, ms };
};

console.log('--- price ticks revert toward the mean ---');
{
  // rng()=0.5 means zero shock: price must walk monotonically toward basePrice from either side
  for (const c of COMMODITIES) {
    for (const start of [c.minPrice, c.maxPrice]) {
      const { gs, ms } = make();
      ms.rng = () => 0.5;
      const item = gs.market.items[c.id];
      item.price = start;
      let prev = Math.abs(start - c.basePrice);
      for (let i = 0; i < 30; i++) {
        ms.updatePrices();
        const d = Math.abs(item.price - c.basePrice);
        assert.ok(d <= prev, `${c.id} from ${start} moves toward the mean`);
        prev = d;
      }
      assert.ok(prev < 0.1 * c.basePrice, `${c.id} from ${start} is near the mean after 30 ticks`);
    }
  }
  const { gs, ms } = make(7);
  const xs = [];
  for (let i = 0; i < 20000; i++) { ms.updatePrices(); xs.push(gs.market.items.ore.price); }
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
  assert.ok(Math.min(...xs) >= ORE.minPrice && Math.max(...xs) <= ORE.maxPrice, 'clamped to band');
  assert.ok(Math.abs(mean / ORE.basePrice - 1) < 0.05, `mean ${mean} near base`);
  assert.ok(sd / ORE.basePrice < 0.2, `spread ${sd / mean} is narrow`);
  let up = 0, n = 0;
  for (let i = 0; i < xs.length - 1; i++) if (xs[i] < 0.85 * ORE.basePrice) { n++; if (xs[i + 1] > xs[i]) up++; }
  assert.ok(n > 50 && up / n > 0.6, `after a dip price rises ${up}/${n}`);
  assert.equal(gs.market.items.ore.history.length, 10, 'history capped');
}

console.log('--- spread and stock cap ---');
{
  const { gs, ms } = make();
  const g0 = gs.gold;
  assert.ok(ms.buyCommodity('ore', 1));
  assert.ok(ms.sellCommodity('ore', 1));
  const loss = g0.sub(gs.gold);
  const expected = ms.getCommodityPrice('ore').mul(new BigNum(BUY_MARKUP - SELL_MARKDOWN));
  assert.ok(near(loss.toNumber(), expected.toNumber(), 1e-6), 'round trip at a flat price costs the spread');
  const cap = getStockCap('ore');
  assert.equal(cap, Math.floor(STOCK_CAP_VALUE / ORE.basePrice));
  assert.ok(ms.buyCommodity('ore', 1000), 'oversized buy fills up to the cap');
  assert.equal(gs.market.items.ore.owned, cap);
  assert.equal(ms.buyCommodity('ore', 1), false, 'no more once at the cap');
  assert.equal(getStockCap('shard'), 0, 'Void Crystal is Garden-supplied only');
  assert.equal(ms.buyCommodity('shard', 1), false);
  assert.equal(gs.market.items.shard.owned, 0);
  gs.market.items.shard.owned = 3;
  assert.ok(ms.sellAll('shard'));
}

console.log('--- perfect-hindsight trading cannot out-earn caravans/core income ---');
{
  const { gs, ms } = make(11);
  const hourProfit = [];
  for (let h = 0; h < 40; h++) {
    let total = 0;
    for (const c of COMMODITIES) {
      const cap = getStockCap(c.id);
      const px = [];
      for (let t = 0; t < 450; t++) { ms.updatePrices(); px.push(gs.market.items[c.id].price); }
      let best = 0;
      for (let i = 0; i < px.length; i++) for (let j = i + 1; j < px.length; j++) {
        best = Math.max(best, px[j] * SELL_MARKDOWN - px[i] * BUY_MARKUP);
      }
      total += best * cap; // in Market Index units (gold / M)
    }
    hourProfit.push(total);
  }
  const avg = hourProfit.reduce((a, b) => a + b, 0) / hourProfit.length;
  const max = Math.max(...hourProfit);
  console.log(`  perfect foresight: avg ${avg.toFixed(0)} M/hour, max ${max.toFixed(0)} M/hour (small caravan: 300 M/hour)`);
  assert.ok(avg < 300, `perfect-foresight trading averages ${avg.toFixed(0)} M/h`);
  assert.ok(max < 600, `best hour ${max.toFixed(0)} M`);
}

console.log('--- caravan cargo ---');
{
  const { gs, ms } = make(3);
  const M = ms.getMarketIndex();
  assert.ok(ms.dispatchCaravan('small'));
  let car = gs.market.caravan;
  assert.equal(car.cargo, null);
  assert.ok(near(car.payout.toNumber(), car.investment.toNumber() * 1.25));
  car.active = false;

  gs.market.items.ore.owned = 14; // above the buy cap is fine: Garden/Mining supply
  assert.equal(ms.getCargoCapacity('ore', 'small'), 10);
  assert.equal(ms.getCargoCapacity('amber', 'small'), 0);
  assert.equal(ms.getCargoCapacity('shard', 'large'), 1);
  const g0 = gs.gold;
  assert.ok(ms.dispatchCaravan('small'));
  car = gs.market.caravan;
  assert.deepEqual(car.cargo, { id: 'ore', units: 10 });
  assert.equal(gs.market.items.ore.owned, 4, 'cargo leaves holdings');
  const cargoPay = 50 * 10 * CARGO_MULT.small;
  assert.ok(near(car.payout.toNumber(), (200 * 1.25 + cargoPay) * M.toNumber()), 'payout fixed at dispatch');
assert.ok(near(g0.sub(gs.gold).toNumber(), 200 * M.toNumber(), 1e-6), 'cargo costs no extra gold');
  gs.market.items.ore.price = 120;
  const before = gs.gold;
  ms.update(10 * 60 + 1);
  assert.equal(car.active, false);
  assert.ok(near(gs.gold.sub(before).toNumber(), car.payout.toNumber(), 1e-6));

  gs.market.items.silk.owned = 5;
  assert.ok(ms.dispatchCaravan('small', { id: 'silk', units: 99 }));
  assert.deepEqual(gs.market.caravan.cargo, { id: 'silk', units: 2 }, 'clamped to capacity');
  gs.market.caravan.active = false;
  assert.ok(ms.dispatchCaravan('small', 'none'));
  assert.equal(gs.market.caravan.cargo, null);
  assert.equal(gs.market.items.silk.owned, 3);
  assert.equal(ms.dispatchCaravan('large'), false, 'one caravan at a time');
}

console.log('--- legacy market state still loads and works ---');
{
  const { gs } = make(5);
  const data = JSON.parse(JSON.stringify(gs.serialize()));
  data.market.items.ore.price = 33; // integer prices from the old walk
  data.market.caravan = {
    active: true, duration: 30, maxDuration: 120,
    investment: new BigNum(500).toJSON(), expectedProfit: 1.6
  };
  const gs2 = new GameState();
  gs2.deserialize(data);
  const ms2 = new MarketSystem(gs2, mulberry32(9));
  gs2.marketSystem = ms2;
  ms2.tickTimer = 1e9;
  const g = gs2.gold;
  ms2.update(31);
  const gained = gs2.gold.sub(g).toNumber();
  assert.ok(gained > 799 && gained < 801, 'old caravan pays investment x profit');
  ms2.rng = () => 0.5;
  ms2.updatePrices();
  assert.ok(gs2.market.items.ore.price > 33, 'old price reverts upward');
  gs2.market.items.ore.owned = 3;
  gs2.gold = new BigNum(1e9);
  assert.ok(ms2.dispatchCaravan('small'));
  const gs3 = new GameState();
  gs3.deserialize(JSON.parse(JSON.stringify(gs2.serialize())));
  assert.deepEqual(gs3.market.caravan.cargo, { id: 'ore', units: 3 });
  assert.ok(near(gs3.market.caravan.payout.toNumber(), gs2.market.caravan.payout.toNumber(), 1e-9));
}

console.log('test_market.js: all passed');
