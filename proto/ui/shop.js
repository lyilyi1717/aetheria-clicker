// Dig: a shop panel for any registered shop. The coin shop uses it; a Star shop or a Forge is
//   ui({ id: 'starshop', panels: [shopPanel({ id: 'starshop', shop: 'star', title: 'starshop', coin: 'star' })] })
// It lists the shop's items in order, hides the ones whose `open(s)` is false, and buys on click.
// An item's line of text comes from ui({ items: { <id>: { desc(s, lv), noLevel } } }); its name is
// the string `up_<id>` and its icon is `up_<id>`.
import * as G from '../game.js';
import { ITEM_TEXT } from './app.js';
import { icon } from './icons.js';

const { t, fmt } = G;

// a number for a description: one decimal while it is small
export const n1 = x => (x < 10 ? (Math.round(x * 10) / 10).toString() : fmt(x));

// opts: { id, shop, title, side, at, coin (icon id of the currency), when(s), locked(s, hidden) -> text under the list }
export function shopPanel(opts) {
  const shop = opts.shop;
  const ids = () => Object.keys(G.ITEMS).filter(id => G.ITEMS[id].shop === shop);
  let list, lock;
  return {
    id: opts.id, elId: opts.elId, side: opts.side || 'right', at: opts.at, title: opts.title, when: opts.when, live: true,
    build(el, app) {
      list = document.createElement('div'); list.className = 'shop-list';
      lock = document.createElement('p'); lock.className = 'muted';
      el.append(list, lock);
      for (const id of ids()) {
        const b = document.createElement('button');
        b.className = 'shop-item'; b.dataset.id = id;
        b.innerHTML = `<span class="ic">${icon('up_' + id, 40)}</span><span class="tx"><b></b><span class="d"></span></span><span class="cost">${icon(opts.coin || 'coin', 16)}<i></i></span><span class="fill"></span>`;
        b.addEventListener('click', () => { app.unlockAudio(); if (G.buy(app.state, id, app.ev)) { app.bump(b); app.refresh(true); } else app.sfx.deny(); });
        list.appendChild(b);
      }
    },
    update(el, s) {
      const sh = G.SHOPS[shop];
      let hidden = 0;
      for (const b of list.children) {
        const id = b.dataset.id;
        const open = G.itemOpen(s, id);
        b.hidden = !open;
        if (!open) { hidden++; continue; }
        if (!b.dataset.seen) { b.dataset.seen = '1'; b.classList.add('arrive'); }
        const lv = G.itemLevel(s, id), max = G.ITEMS[id].max;
        const full = max !== undefined && lv >= max;
        const cost = G.upgradeCost(s, id);
        const tx = ITEM_TEXT[id] || {};
        b.querySelector('b').textContent = t('up_' + id) + (tx.noLevel ? '' : `  ·  ${t('lv', { n: lv })}`);
        b.querySelector('.d').textContent = tx.desc ? tx.desc(s, lv) : '';
        b.querySelector('.cost i').textContent = full ? t('maxed') : fmt(cost);
        const have = s[sh.wallet];
        const can = !full && have >= cost;
        b.classList.toggle('can', can);
        b.classList.toggle('full', full);
        b.querySelector('.fill').style.width = full ? '0%' : Math.min(100, have / cost * 100) + '%';
      }
      lock.textContent = opts.locked ? opts.locked(s, hidden) : '';
    },
  };
}
