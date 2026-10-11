// Dig feature: oil. A pocket pays a burst of coins and makes your hits count more for a few seconds.
import { use, emit } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { LAYER, dirtVal } from '../../core/grid.js';
import { addCoins, coinMult } from '../../core/rules.js';
import strings from './strings.js';

const p = {
  pay: 30,                       // coins, in dirt blocks of its row
  rushSeconds: 8, rushMult: 3,
  chance: 0.07, fromRow: LAYER + 4,
};

export const oil = use({
  id: 'oil',
  params: p,
  legacy: { oilPay: 'pay', rushSeconds: 'rushSeconds', rushMult: 'rushMult' },
  strings,
  state: { rush: { init: () => 0, perSite: true } },   // seconds of oil rush left
  blocks: {
    oil: { at: 110, hp: 2, val: 0, broke(s, b, ev) {
      const pay = Math.round(dirtVal(b.r) * p.pay * coinMult(s));
      addCoins(s, pay, b.src);
      s.rush = p.rushSeconds;
      emit(s, ev, 'gusher', { r: b.r, c: b.c, coins: pay, src: b.src });
    } },
  },
  gen: { row: [{ at: 50, fn(c) {
    const s = c.s;
    if (c.r === p.fromRow && !s.seen.oil) { c.put('oil'); s.seen.oil = true; }
    else if (c.r > p.fromRow && rnd() < p.chance) c.put('oil');
  } }] },
  hooks: {
    step: { at: 100, fn(s, dt, ev) {
      if (s.rush > 0) { s.rush = Math.max(0, s.rush - dt); if (s.rush === 0) emit(s, ev, 'rushEnd', {}); }
    } },
  },
  mods: { swingDmg: (v, s) => (s.rush > 0 ? v * p.rushMult : v) },
});
