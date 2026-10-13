// Dig feature: the coin shop and its two plain items, Stronger Pick and Lucky Sieve.
// Other features add their own items to it (`shop: 'coin'`), or bring a shop of their own.
import { use, PARAMS } from '../../core/registry.js';
import strings from './strings.js';

const p = { luckStep: 0.1 };   // Lucky Sieve: coins per level

export const coinShop = use({
  id: 'shop',
  params: p,
  strings,
  // wallet and levels are state keys: what you pay with, and where the levels are kept
  shops: { coin: { at: 10, wallet: 'coins', levels: 'up' } },
  items: {
    pick: { at: 10, shop: 'coin', base: 15, grow: 1.5 },
    luck: { at: 40, shop: 'coin', base: 120, grow: 1.7, max: 20, levels: 'grind', open: s => s.bossesDown >= 1 || s.up.luck > 0 },
  },
  mods: {
    pickPower: { at: 10, fn: (v, s) => v * Math.pow(PARAMS.core.powGrow, s.up.pick) },
    coinMult: { at: 10, fn: (v, s) => v * (1 + p.luckStep * s.up.luck) },
  },
});
