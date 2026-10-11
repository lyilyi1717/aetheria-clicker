// Dig feature (page side): the coin shop's panel and the words of its two items.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { shopPanel, n1 } from '../../ui/shop.js';
import { S, badge, pickShape } from '../../ui/icons.js';

const { t } = G;

ui({
  id: 'shop',
  icons: {
    up_pick: badge('#3b6ea8', pickShape()),
    up_luck: badge('#8a5bc4', `<circle cx="11.5" cy="11.5" r="5" fill="#59d37a" ${S}/><circle cx="20.5" cy="11.5" r="5" fill="#59d37a" ${S}/><circle cx="11.5" cy="20.5" r="5" fill="#59d37a" ${S}/><circle cx="20.5" cy="20.5" r="5" fill="#59d37a" ${S}/>`),
  },
  items: {
    pick: { desc(s) { const a = G.pickPower(s); s.up.pick++; const b = G.pickPower(s); s.up.pick--; return t('up_pick_d', { a: n1(a), b: n1(b) }); } },
    luck: { desc: (s, lv) => t('up_luck_d', { a: lv * 10 }) },
  },
  panels: [shopPanel({
    id: 'shop', shop: 'coin', title: 'shop', side: 'right', at: 10,
    locked: (s, hidden) => (hidden ? (G.ITEMS.crew && !G.itemOpen(s, 'crew') ? t('locked_crew') : t('locked_more')) : ''),
  })],
});
