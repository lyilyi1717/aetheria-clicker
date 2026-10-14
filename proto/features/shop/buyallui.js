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
  let sig = '', n = 0, from = 0, to = 0;
  b.addEventListener('click', () => {
    app.unlockAudio();
    // the lot is one batch: every 'buy' event still goes out (toasts, sounds) marked batch, and one 'buyBatch' per upgrade follows (telemetry)
    const r = buyAll(app.state, opts.shop, (k, d) => app.ev(k, k === 'buy' ? { ...d, batch: true } : d));
    for (const [id, k] of Object.entries(r.bought)) app.ev('buyBatch', { id, level: G.itemLevel(app.state, id), count: k, shop: opts.shop });
    if (!r.count) { app.sfx.deny(); return; }
    const parts = Object.entries(r.bought).map(([id, k]) => k > 1 ? t('buyall_item', { name: opts.nameOf(id), k }) : opts.nameOf(id));
    app.toast(t('buyall_done', { n: r.count, list: G.listOf(parts) }), 'gold');
    app.bump(b); app.refresh(true); app.dirty && app.dirty(opts.shop);
  });
  return {
    el: b,
    update(s) {
      const w = G.SHOPS[opts.shop].wallet;
      // the plan clones the whole state: redo it only when the levels or locks change or the purse leaves the range the plan holds for
      const key = JSON.stringify(s[G.SHOPS[opts.shop].levels]) + '|' + s.bossesDown, v = s[w];
      if (key !== sig || !(v >= from && v < to)) { sig = key; const r = buyAllPlan(s, opts.shop); n = r.count; from = r.spent; to = r.need; }
      b.hidden = n < BUY_ALL_MIN;
      if (!b.hidden) b.textContent = t('buyall', { n });
    },
  };
}
