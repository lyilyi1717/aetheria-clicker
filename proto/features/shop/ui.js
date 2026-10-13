// Dig feature (page side): the coin shop's panel and the words of its two items.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { shopPanel, n1 } from '../../ui/shop.js';
import { S, badge, pickShape } from '../../ui/icons.js';

const { t } = G;

let app0 = null;     // the page, for the block under the pointer
// the block to count hits on: the one under the pointer, else the commonest kind in view (its usual toughness)
function hitsBlock(s) {
  const tg = app0 && app0.target && app0.target();
  const c = tg && G.cellAt(s, tg[0], tg[1]);
  if (c && !G.TYPES[c.t].wall) return { kind: c.t, max: c.max };
  const n = {}, hp = {};
  for (let i = 0; i < G.VIEW_ROWS - 1; i++) for (let k = 0; k < G.COLS; k++) {
    const x = s.rows[i] && s.rows[i][k];
    if (!x || G.TYPES[x.t].wall) continue;
    n[x.t] = (n[x.t] || 0) + 1; hp[x.t] = (hp[x.t] || 0) + x.max;
  }
  const top = Object.keys(n).sort((a, b) => n[b] - n[a])[0];
  return top ? { kind: top, max: hp[top] / n[top] } : null;
}
const hitsOf = (max, power) => Math.max(1, Math.ceil(max / power - 1e-9));


ui({
  id: 'shop',
  icons: {
    up_pick: badge('#3b6ea8', pickShape()),
    up_luck: badge('#8a5bc4', `<circle cx="11.5" cy="11.5" r="5" fill="#59d37a" ${S}/><circle cx="20.5" cy="11.5" r="5" fill="#59d37a" ${S}/><circle cx="11.5" cy="20.5" r="5" fill="#59d37a" ${S}/><circle cx="20.5" cy="20.5" r="5" fill="#59d37a" ${S}/>`),
  },
  items: {
    pick: { desc(s) {
      const a = G.pickPower(s); s.up.pick++; const b = G.pickPower(s); s.up.pick--;
      // when the next level saves a hit on the block you point at (or the usual block here), say that
      const blk = hitsBlock(s);
      if (blk) {
        const h1 = hitsOf(blk.max, a), h2 = hitsOf(blk.max, b);
        if (h2 < h1) return t('up_pick_hits', { kind: t(G.hasString('blk_' + blk.kind) ? 'blk_' + blk.kind : 'blk_other'), a: h1, b: h2 });
      }
      return t('up_pick_d', { a: n1(a), b: n1(b) });
    } },
    luck: { desc: (s, lv) => t('up_luck_d', { a: lv * 10 }) },
  },
  tick(st, app) { app0 = app; },
  panels: [shopPanel({
    id: 'shop', shop: 'coin', title: 'shop', side: 'right', at: 10,
    locked: (s, hidden) => (hidden ? (G.ITEMS.crew && !G.itemOpen(s, 'crew') ? t('locked_crew') : t('locked_more')) : ''),
  })],
});
