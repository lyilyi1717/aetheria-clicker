// Dig feature (page side): the "Buy all (N)" button for a shop panel. It shows when more than 5 purchases are affordable
// at once, buys cheapest first (buyall.js), plays one sound (the buy sound is throttled) and says what was bought in one toast.
import * as G from '../../game.js';
import { buyAll, buyAllPlan, BUY_ALL_MIN } from './buyall.js';

const { t } = G;
G.addStrings({ en: {
  buyall: 'Buy all ({n})',
  buyall_tip: 'Buy everything you can afford now, cheapest first',
  buyall_done: 'Bought {n}: {list}',
  buyall_item: '{name} x{k}',
} }, 'buyall');

// opts: { shop, nameOf(id) -> text }. Returns { el, update(s), }
export function buyAllButton(app, opts) {
  const b = document.createElement('button');
  b.className = 'primary gold buyall'; b.hidden = true; b.title = t('buyall_tip');
  let sig = '', n = 0;
  b.addEventListener('click', () => {
    app.unlockAudio();
    const r = buyAll(app.state, opts.shop, app.ev);
    if (!r.count) { app.sfx.deny(); return; }
    const parts = Object.entries(r.bought).map(([id, k]) => k > 1 ? t('buyall_item', { name: opts.nameOf(id), k }) : opts.nameOf(id));
    app.toast(t('buyall_done', { n: r.count, list: G.listOf(parts) }), 'gold');
    app.bump(b); app.refresh(true); app.dirty && app.dirty(opts.shop);
  });
  return {
    el: b,
    update(s) {
      const w = G.SHOPS[opts.shop].wallet;
      const key = Math.floor(s[w]) + '|' + JSON.stringify(s[G.SHOPS[opts.shop].levels]) + '|' + s.bossesDown;
      if (key !== sig) { sig = key; n = buyAllPlan(s, opts.shop).count; }
      b.hidden = n < BUY_ALL_MIN;
      if (!b.hidden) b.textContent = t('buyall', { n });
    },
  };
}
