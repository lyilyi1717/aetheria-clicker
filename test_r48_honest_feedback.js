// R48: Bazaar sales celebrate only real gains; failed breeding and failed buys answer neutrally.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { particles } from './js/engine/ParticleEngine.js';
import { sound } from './js/engine/AudioEngine.js';
import { rewards } from './js/ui/rewards.js';
import { MarketSystem, COMMODITIES } from './js/systems/MarketSystem.js';
import { chipSize, afterBuy } from './js/ui/buyFx.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;

const calls = [];
sound.playCoins = () => calls.push('coins');
sound.playClick = () => calls.push('click');
const events = [];
rewards.notify = (ev) => events.push(ev);

const gs = new GameState();
const ms = new MarketSystem(gs, () => 0.5);
gs.marketSystem = ms;
const ORE = COMMODITIES[0];
const sell = (price) => {
  calls.length = 0; events.length = 0;
  gs.market.items.ore.price = price; gs.market.items.ore.owned = 5;
  assert.ok(ms.sellCommodity('ore', 1));
  return { sound: calls.join(), ev: events[0] };
};

// at the mean price the 5% markdown makes it a loss: neutral
let r = sell(ORE.basePrice);
assert.equal(r.sound, 'click');
assert.equal(r.ev.kind, 'market-sell-plain');
assert.ok(!r.ev.amount && !r.ev.detail, 'plain toast has no +amount');
// 5% above the mean is still not a gain after the markdown
assert.equal(sell(ORE.basePrice * 1.05).sound, 'click');
assert.equal(sell(ORE.minPrice).sound, 'click');
// a real gain: coins, green, percentage
r = sell(ORE.basePrice * 1.4);
assert.equal(r.sound, 'coins');
assert.equal(r.ev.kind, 'market-sell-gain');
assert.equal(r.ev.color, 'var(--ok)');
assert.ok(r.ev.detail.includes('33'), r.ev.detail);   // 1.4 * 0.95 = 1.33
// Sell all follows the same rule
calls.length = 0; gs.market.items.ore.price = ORE.minPrice; gs.market.items.ore.owned = 3;
ms.sellAll('ore');
assert.deepEqual(calls, ['click']);
// no save change: market state keeps its shape
assert.deepEqual(Object.keys(gs.market.items.ore).sort(), ['history', 'owned', 'price', 'trend']);

// chip sizes: 3, capped
assert.deepEqual([1, 9, 10, 99, 100, 5000].map(chipSize), [1, 1, 2, 2, 3, 3]);
afterBuy(null, 0); afterBuy(null, 5);   // no DOM: no-ops, no throw

// source checks
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const garden = read('./js/ui/garden.js');
assert.ok(garden.includes('sound.playPluck()') && garden.includes("'breed-none'") && garden.includes('var(--text-dim)'));
assert.ok(/"breed.none"/.test(read('./js/i18n/en.js')) && /"breed.none"/.test(read('./js/i18n/ar.js')));
assert.ok(read('./js/main.js').includes('afterBuy('), 'main.js buys call the helper');
console.log('R48 honest feedback OK');
