import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { rewards } from '../ui/rewards.js';
import { MONSTER_FLOOR_BASE, getIndexFloor } from './CombatSystem.js';

const fmtGold = (g) => new BigNum(g).format('standard', 0);

export const COMMODITIES = [
  { id: 'ore', name: 'Oil Shale', icon: '🪨', basePrice: 50, minPrice: 15, maxPrice: 120 },
  { id: 'silk', name: 'Mana Silk', icon: '🧵', basePrice: 200, minPrice: 70, maxPrice: 500 },
  { id: 'amber', name: 'Solar Amber', icon: '🏺', basePrice: 1000, minPrice: 350, maxPrice: 2800 },
  { id: 'shard', name: 'Void Crystal', icon: '🔮', basePrice: 5000, minPrice: 1500, maxPrice: 15000 }
];

// --- R16 tuning (see docs/redesign-proposal.md section 2.7) ---
// Prices follow an Ornstein-Uhlenbeck-style walk in log space: each tick the log price moves
// REVERSION of the way back to ln(basePrice) plus a uniform shock of +-SHOCK. Stationary spread
// is about +-15%, so a price 20% under the mean is a real, learnable buy signal.
export const PRICE_REVERSION = 0.2;
export const PRICE_SHOCK = 0.12;
// Round trip costs 10%: buy at 1.05x the quoted price, sell at 0.95x.
export const BUY_MARKUP = 1.05;
export const SELL_MARKDOWN = 0.95;
// Speculative stock limit: you may hold at most floor(STOCK_CAP_VALUE / basePrice) units
// bought from the market (Void Crystal and Solar Amber are Garden-supplied only). Without a
// cap, trading volume scales with the gold hoard and out-earns core income.
export const STOCK_CAP_VALUE = 300;
// Caravan cargo: units are valued at the MEAN price x the tier multiplier (fixed at dispatch)
// and a caravan carries at most CARGO_CAPACITY x its investment's worth (at mean prices).
export const CARGO_CAPACITY = 2.5;
export const CARGO_MULT = { small: 1.15, large: 1.3 };

export function getStockCap(id) {
  const c = COMMODITIES.find(x => x.id === id);
  return c ? Math.floor(STOCK_CAP_VALUE / c.basePrice) : 0;
}

export class MarketSystem {
  // rng: injectable () => [0,1) so tests can seed price ticks (defaults to Math.random)
  constructor(gameState, rng = Math.random) {
    this.gameState = gameState;
    this.rng = rng;
    this.tickTimer = 8.0; // price shift every 8s
    this.initMarket();
  }

  initMarket() {
    if (!this.gameState.market) {
      const items = {};
      for (const c of COMMODITIES) {
        items[c.id] = {
          price: c.basePrice,
          trend: 'stable', // 'rising', 'falling', 'stable', 'surge', 'crash'
          owned: 0,
          history: [c.basePrice, c.basePrice, c.basePrice]
        };
      }
      this.gameState.market = {
        items,
        goldenSynergy: 0,
        caravan: {
          active: false,
          duration: 0,
          maxDuration: 0,
          investment: BigNum.zero(),
          expectedProfit: 1.5,
          cargo: null
        }
      };
    } else if (this.gameState.market.goldenSynergy === undefined) {
      this.gameState.market.goldenSynergy = 0;
    }
  }

  // Market Index: every Bazaar price is "N kills' worth" at the player's best Tower floor.
  // Reads indexFloor (= maxFloor on new saves; the rebased floor on legacy saves, whose
  // maxFloor is only a record). It never decreases, so retreating can't lower prices.
  getMarketIndex() {
    return new BigNum(MONSTER_FLOOR_BASE).pow(getIndexFloor(this.gameState.hero) - 1);
  }

  getCommodityPrice(id) {
    const item = this.gameState.market.items[id];
    return this.getMarketIndex().mul(new BigNum(item.price));
  }

  getBuyPrice(id) { return this.getCommodityPrice(id).mul(new BigNum(BUY_MARKUP)); }
  getSellPrice(id) { return this.getCommodityPrice(id).mul(new BigNum(SELL_MARKDOWN)); }

  // Max units of `id` a caravan of this tier can carry.
  getCargoCapacity(id, tier = 'small') {
    const c = COMMODITIES.find(x => x.id === id);
    if (!c) return 0;
    const invest = tier === 'large' ? 2000 : 200;
    return Math.floor((invest * CARGO_CAPACITY) / c.basePrice);
  }

  // Cargo value paid on return: units x mean price x tier multiplier x Market Index.
  getCargoPayout(id, units, tier = 'small') {
    const c = COMMODITIES.find(x => x.id === id);
    if (!c || units <= 0) return BigNum.zero();
    return this.getMarketIndex().mul(new BigNum(c.basePrice * units * (CARGO_MULT[tier] || 1)));
  }

  // Default cargo: the held commodity whose loadable units are worth the most.
  pickCargo(tier = 'small') {
    let best = null;
    for (const c of COMMODITIES) {
      const owned = this.gameState.market.items[c.id]?.owned || 0;
      const units = Math.min(owned, this.getCargoCapacity(c.id, tier));
      if (units > 0 && (!best || units * c.basePrice > best.units * best.base)) best = { id: c.id, units, base: c.basePrice };
    }
    return best ? { id: best.id, units: best.units } : null;
  }

  getCaravanTier(tier) {
    const M = this.getMarketIndex();
    return tier === 'large'
      ? { invest: M.mul(new BigNum(2000)), minutes: 60, profit: 1.5 }
      : { invest: M.mul(new BigNum(200)), minutes: 10, profit: 1.25 };
  }

  getEnchanterCost(level = this.gameState.market.goldenSynergy) {
    return new BigNum(1000000).mul(new BigNum(2.5).pow(level));
  }

  getEnchanterTotalCost(amount = 1) {
    if (amount === 'max') return this.getEnchanterCost(); // UI shows next cost if max
    let total = new BigNum(0, 0);
    for (let i = 0; i < amount; i++) {
      total = total.add(this.getEnchanterCost(this.gameState.market.goldenSynergy + i));
    }
    return total;
  }

  buyEnchanter(amount = 1) {
    let levelsToBuy = 0;
    if (amount === 'max') {
      while (true) {
        const cost = this.getEnchanterCost(this.gameState.market.goldenSynergy + levelsToBuy);
        if (this.gameState.gold.gte(cost)) {
          this.gameState.gold = this.gameState.gold.sub(cost);
          levelsToBuy++;
          if (levelsToBuy > 2000) break; // safety cap
        } else {
          break;
        }
      }
    } else {
      for (let i = 0; i < amount; i++) {
        const cost = this.getEnchanterCost(this.gameState.market.goldenSynergy + levelsToBuy);
        if (this.gameState.gold.gte(cost)) {
          this.gameState.gold = this.gameState.gold.sub(cost);
          levelsToBuy++;
        } else {
          break;
        }
      }
    }

    if (levelsToBuy > 0) {
      this.gameState.market.goldenSynergy += levelsToBuy;
      rewards.notify({
        tier: 'medium', kind: 'golden-synergy', icon: '✨', color: '#fbbf24',
        title: 'Golden Synergy', amount: levelsToBuy, fmt: (n) => String(n), unit: levelsToBuy === 1 ? 'level' : 'levels'
      });
      return true;
    }
    return false;
  }

  buyCommodity(id, amount = 1) {
    const item = this.gameState.market.items[id];
    if (!item) return false;

    // Stock limit: buy what fits (a Buy 10 near the cap buys the remainder)
    amount = Math.min(amount, getStockCap(id) - item.owned);
    if (amount <= 0) return false;

    const totalCost = this.getBuyPrice(id).mul(new BigNum(amount));
    if (this.gameState.gold.gte(totalCost)) {
      this.gameState.gold = this.gameState.gold.sub(totalCost);
      item.owned += amount;
      sound.playBuy();
      rewards.notify({
        tier: 'small', kind: `market-buy-${id}`, icon: COMMODITIES.find(c => c.id === id)?.icon || '🛒', color: '#38bdf8',
        title: `Bought ${COMMODITIES.find(c => c.id === id)?.name || id}`, amount, fmt: (n) => String(n), unit: 'units'
      });
      return true;
    }
    return false;
  }

  sellCommodity(id, amount = 1) {
    const item = this.gameState.market.items[id];
    if (!item || item.owned < amount) return false;

    const payout = this.getSellPrice(id).mul(new BigNum(amount));
    item.owned -= amount;
    this.gameState.gold = this.gameState.gold.add(payout);
    sound.playGem();
    rewards.notify({
      tier: 'small', kind: 'market-sell', icon: '🪙', color: '#eab308',
      title: 'Sold at the Bazaar', amount: payout, fmt: fmtGold, unit: 'gold'
    });
    return true;
  }

  sellAll(id) {
    const item = this.gameState.market.items[id];
    if (!item || item.owned <= 0) return false;
    return this.sellCommodity(id, item.owned);
  }

  // tier: 'small' (200*M gold, 10 min, 1.25x) or 'large' (2,000*M gold, 60 min, 1.5x).
  // The payout is locked in at dispatch. cargo: { id, units } taken from holdings, 'none' for
  // an empty caravan, or omitted to auto-load the most valuable holding (capped by capacity).
  // Cargo returns units x mean price x CARGO_MULT[tier], so ship goods you bought low.
  dispatchCaravan(tier = 'small', cargo) {
    const caravan = this.gameState.market.caravan;
    if (caravan.active) return false;

    const { invest: cost, minutes, profit } = this.getCaravanTier(tier);
    if (this.gameState.gold.lt(cost) || cost.lte(0)) return false;

    if (cargo === undefined) cargo = this.pickCargo(tier);
    let load = null;
    if (cargo && cargo !== 'none') {
      const held = this.gameState.market.items[cargo.id]?.owned || 0;
      const units = Math.floor(Math.min(cargo.units, held, this.getCargoCapacity(cargo.id, tier)));
      if (units > 0) load = { id: cargo.id, units };
    }

    this.gameState.gold = this.gameState.gold.sub(cost);
    caravan.active = true;
    caravan.duration = minutes * 60;
    caravan.maxDuration = minutes * 60;
    caravan.investment = cost;
    caravan.expectedProfit = profit;
    caravan.payout = cost.mul(new BigNum(profit));
    caravan.cargo = null;
    if (load) {
      this.gameState.market.items[load.id].owned -= load.units;
      caravan.cargo = load;
      caravan.payout = caravan.payout.add(this.getCargoPayout(load.id, load.units, tier));
    }

    sound.playSpell();
    rewards.notify({ tier: 'small', kind: 'caravan-out', icon: '🐪', color: '#fbbf24', title: 'Caravan dispatched' });
    return true;
  }

  update(dt) {
    // Market Price Fluctuations
    this.tickTimer -= dt;
    if (this.tickTimer <= 0) {
      this.tickTimer = 6.0 + this.rng() * 4.0;
      this.updatePrices();
    }

    // Caravan Progress
    const caravan = this.gameState.market.caravan;
    if (caravan.active) {
      caravan.duration -= dt;
      if (caravan.duration <= 0) {
        caravan.active = false;
        const returnPayout = caravan.payout ? new BigNum(caravan.payout) : caravan.investment.mul(caravan.expectedProfit);
        this.gameState.gold = this.gameState.gold.add(returnPayout);
        rewards.notify({
          tier: 'medium', kind: 'caravan-back', icon: '🐪', color: '#4ade80',
          title: 'Caravan returned', batchTitle: '{n} caravans returned', amount: returnPayout, fmt: fmtGold, unit: 'gold'
        });
      }
    }
  }

  updatePrices() {
    for (const c of COMMODITIES) {
      const item = this.gameState.market.items[c.id];
      const logGap = Math.log(c.basePrice) - Math.log(item.price);
      const shock = (this.rng() * 2 - 1) * PRICE_SHOCK;
      let newPrice = Math.round(item.price * Math.exp(PRICE_REVERSION * logGap + shock) * 100) / 100;
      newPrice = Math.max(c.minPrice, Math.min(c.maxPrice, newPrice));

      if (newPrice > item.price * 1.12) item.trend = 'surge';
      else if (newPrice > item.price) item.trend = 'rising';
      else if (newPrice < item.price * 0.88) item.trend = 'crash';
      else if (newPrice < item.price) item.trend = 'falling';
      else item.trend = 'stable';

      item.price = newPrice;
      item.history.push(newPrice);
      if (item.history.length > 10) item.history.shift();
    }
  }
}
