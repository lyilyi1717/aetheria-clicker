import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { particles } from '../engine/ParticleEngine.js';

export const COMMODITIES = [
  { id: 'ore', name: 'Aether Ore', icon: '🪨', basePrice: 50, minPrice: 15, maxPrice: 120 },
  { id: 'silk', name: 'Mana Silk', icon: '🧵', basePrice: 200, minPrice: 70, maxPrice: 500 },
  { id: 'amber', name: 'Solar Amber', icon: '🏺', basePrice: 1000, minPrice: 350, maxPrice: 2800 },
  { id: 'shard', name: 'Void Crystal', icon: '🔮', basePrice: 5000, minPrice: 1500, maxPrice: 15000 }
];

export class MarketSystem {
  constructor(gameState) {
    this.gameState = gameState;
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
          expectedProfit: 1.5
        }
      };
    } else if (this.gameState.market.goldenSynergy === undefined) {
      this.gameState.market.goldenSynergy = 0;
    }
  }

  getEnchanterCost() {
    const level = this.gameState.market.goldenSynergy;
    return new BigNum(1000000).mul(Math.pow(2.5, level));
  }

  buyEnchanter() {
    const cost = this.getEnchanterCost();
    if (this.gameState.gold.gte(cost)) {
      this.gameState.gold = this.gameState.gold.sub(cost);
      this.gameState.market.goldenSynergy++;
      sound.playAscension();
      particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `GOLDEN SYNERGY LEVEL UP!`, '#fbbf24', true);
      return true;
    }
    return false;
  }

  buyCommodity(id, amount = 1) {
    const item = this.gameState.market.items[id];
    if (!item) return false;

    const totalCost = new BigNum(item.price * amount);
    if (this.gameState.gold.gte(totalCost)) {
      this.gameState.gold = this.gameState.gold.sub(totalCost);
      item.owned += amount;
      sound.playBuy();
      particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `BOUGHT ${amount}x ${id.toUpperCase()}`, '#38bdf8', false);
      return true;
    }
    return false;
  }

  sellCommodity(id, amount = 1) {
    const item = this.gameState.market.items[id];
    if (!item || item.owned < amount) return false;

    const payout = new BigNum(item.price * amount);
    item.owned -= amount;
    this.gameState.gold = this.gameState.gold.add(payout);
    sound.playGem();
    particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `+${payout.format('standard', 0)} GOLD!`, '#eab308', true);
    return true;
  }

  sellAll(id) {
    const item = this.gameState.market.items[id];
    if (!item || item.owned <= 0) return false;
    return this.sellCommodity(id, item.owned);
  }

  dispatchCaravan(goldAmount, minutes = 2) {
    const caravan = this.gameState.market.caravan;
    if (caravan.active) return false;

    const cost = new BigNum(goldAmount);
    if (this.gameState.gold.lt(cost) || cost.lte(0)) return false;

    this.gameState.gold = this.gameState.gold.sub(cost);
    caravan.active = true;
    caravan.duration = minutes * 60;
    caravan.maxDuration = minutes * 60;
    caravan.investment = cost;
    caravan.expectedProfit = 1.3 + (minutes * 0.15); // e.g. 1.6x return

    sound.playSpell();
    particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, 'CARAVAN EXPEDITION DISPATCHED!', '#fbbf24', true);
    return true;
  }

  update(dt) {
    // Market Price Fluctuations
    this.tickTimer -= dt;
    if (this.tickTimer <= 0) {
      this.tickTimer = 6.0 + Math.random() * 4.0;
      this.updatePrices();
    }

    // Caravan Progress
    const caravan = this.gameState.market.caravan;
    if (caravan.active) {
      caravan.duration -= dt;
      if (caravan.duration <= 0) {
        caravan.active = false;
        const returnPayout = caravan.investment.mul(caravan.expectedProfit);
        this.gameState.gold = this.gameState.gold.add(returnPayout);
        sound.playAchievement();
        particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `CARAVAN RETURNED! +${returnPayout.format('standard', 0)} GOLD`, '#4ade80', true);
      }
    }
  }

  updatePrices() {
    for (const c of COMMODITIES) {
      const item = this.gameState.market.items[c.id];
      const deltaPercent = (Math.random() - 0.48) * 0.35; // Slight bias
      let newPrice = Math.round(item.price * (1 + deltaPercent));
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
