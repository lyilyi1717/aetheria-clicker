// Dig feature (page side): the coin shop's panel and the words of its two items.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { shopPanel, n1 } from '../../ui/shop.js';
import { buyAllButton } from './buyallui.js';
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


// the shop panel with a "Buy all (N)" button above the list (shown when more than 5 purchases are affordable)
function withBuyAll(panel, shop) {
  let ba;
  const build = panel.build, update = panel.update;
  panel.build = (el, app) => { build(el, app); ba = buyAllButton(app, { shop, nameOf: id => t('up_' + id) }); el.prepend(ba.el); };
  panel.update = (el, s, app) => { update(el, s, app); ba.update(s); };
  return panel;
}

ui({
  id: 'shop',
  css: new URL('./shop.css', import.meta.url).href,
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
        if (h2 < h1) return t('up_pick_hits', { kind: t(G.hasString('blk_' + blk.kind) ? 'blk_' + blk.kind : 'blk_other'), a: G.fmt(h1), b: G.fmt(h2) });
      }
      return t('up_pick_d', { a: n1(a), b: n1(b) });
    } },
    luck: { desc: (s, lv) => t('up_luck_d', { a: lv * 10 }) },
  },
  tick(st, app) { app0 = app; },
  panels: [withBuyAll(shopPanel({
    id: 'shop', shop: 'coin', title: 'shop', side: 'right', at: 10,
    locked: (s, hidden) => {
      const tempo = G.picksTempoLock ? G.picksTempoLock(s) : '';     // Faster Hands past 132: says which finish opens it
      const base = hidden ? (G.ITEMS.crew && !G.itemOpen(s, 'crew') ? t('locked_crew') : t('locked_more')) : '';
      return tempo && (s.up.tempo || 0) > 0 ? (base ? base + ' ' : '') + t('locked_tempo', { why: tempo }) : base;
    },
  }), 'coin')],
});
