// Dig feature (page side): the Star Shop panel, the "which relic crosses" picker, the free re-roll
// button on a chest's card, the TNT outline, and the pointer that shows up with a New Site.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { shopPanel } from '../../ui/shop.js';
import { S, badge, star, icon, pickShape, helmet, chest as chestShape } from '../../ui/icons.js';
import { AT, CELL, yOf, fx } from '../../ui/render.js';
import { openDraft } from '../chest/ui.js';

const { t } = G;

// a perk's line: what the NEXT level does (or the last one, when full), from the per-level strings
const perkText = id => (s, lv) => t(`up_${id}_d${Math.min(lv + 1, G.STARSHOP_PERKS[id].costs.length)}`);
const items = {};
for (const id of Object.keys(G.STARSHOP_PERKS)) items[id] = { desc: perkText(id) };

const affordable = s => Object.keys(G.STARSHOP_PERKS).some(id => G.itemOpen(s, id) && G.canBuy(s, id));

// the panel is the plain shop panel plus a note and the picker for Lucky Pocket
function panel() {
  const base = shopPanel({ id: 'starshop', shop: 'star', title: 'starshop', side: 'right', at: 5, coin: 'star' });
  base.when = s => s.stars > 0 || s.starSpent > 0;
  const build = base.build, update = base.update;
  let note, pick, sig = '';
  base.build = function (el, app) {
    build(el, app);
    note = document.createElement('p'); note.className = 'muted star-note';
    pick = document.createElement('div'); pick.className = 'star-pick'; pick.hidden = true;
    el.insertBefore(note, el.firstChild.nextSibling);
    el.appendChild(pick);
  };
  base.update = function (el, s, app) {
    update(el, s, app);
    note.textContent = t('star_note') + ' ' + t('star_next');
    el.classList.toggle('ready', affordable(s));
    pick.hidden = !G.starshopLevel(s, 'sp_keep');
    if (pick.hidden) return;
    const held = G.starshopKeepOptions(s), now = G.starshopKeepNow(s);
    const key = held.join() + '|' + (now ? now.id + now.level : '') + '|' + s.starKeep;
    if (key === sig) return;
    sig = key;
    pick.innerHTML = '';
    const h = document.createElement('p'); h.className = 'muted';
    h.textContent = held.length ? t('keep_title') + (s.starKeep ? '' : '  ·  ' + t('keep_auto')) : t('keep_none');
    pick.appendChild(h);
    const row = document.createElement('div'); row.className = 'star-pick-row';
    for (const id of held) {
      const b = document.createElement('button');
      b.className = 'ghost' + (now && now.id === id ? ' on' : '');
      b.title = t('r_' + id);
      b.innerHTML = icon(id, 28);
      b.addEventListener('click', () => { app.unlockAudio(); G.starshopSetKeep(s, id); app.refresh(true); });
      row.appendChild(b);
    }
    pick.appendChild(row);
    if (now) { const k = document.createElement('p'); k.className = 'muted'; k.textContent = t('r_' + now.id) + ': ' + t('keep_level', { n: now.level }); pick.appendChild(k); }
  };
  return base;
}

ui({
  id: 'starshop',
  css: new URL('./starshop.css', import.meta.url).href,
  icons: {
    up_sp_head: badge('#2f8f5b', helmet),
    up_sp_keep: badge('#6b4aa0', `<path d="M8 12 H24 V26 H8 Z" fill="#e8d7b0" ${S}/><path d="M8 12 Q16 20 24 12" fill="none" ${S}/>${star(16, 8, 5, 2.2, 5, '#ffd23f')}`),
    up_sp_cards: badge('#8a5bc4', `<rect x="5" y="10" width="9" height="14" rx="2" fill="#fff" ${S}/><rect x="11.5" y="8" width="9" height="14" rx="2" fill="#ffe9a8" ${S}/><rect x="18" y="10" width="9" height="14" rx="2" fill="#fff" ${S}/>`),
    up_sp_reroll: badge('#3b6ea8', `<path d="M9 14 A8 8 0 0 1 23 12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M23 18 A8 8 0 0 1 9 20" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M24 6 V13 H17 Z M8 26 V19 H15 Z" fill="#fff"/>`),
    up_sp_map: badge('#a8672c', `<path d="M5 9 L12 7 L20 9 L27 7 V23 L20 25 L12 23 L5 25 Z" fill="#f1dfae" ${S}/><path d="M11 15 L15 19 M15 15 L11 19" stroke="#d7332b" stroke-width="2.4" stroke-linecap="round"/>`),
    up_sp_eyes: badge('#7a2a1f', `<path d="M3 16 Q16 5 29 16 Q16 27 3 16 Z" fill="#fff" ${S}/><circle cx="16" cy="16" r="5" fill="#d7332b" ${S}/><circle cx="16" cy="16" r="1.8" fill="#1b1410"/>`),
    up_sp_wake: badge('#555b66', `<path d="M4 26 L8 12 L14 8 L22 10 L28 18 L26 26 Z" fill="#9aa3ad" ${S}/><path d="M10 20 H22 M18 16 L22 20 L18 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`),
    up_sp_warm: badge('#b5532a', pickShape('#ffd9a0')),
    up_sp_bone: badge('#4b4460', `<g transform="rotate(-35 16 16)" fill="#f6efdc" ${S}><rect x="7" y="13.5" width="18" height="5" rx="2.5"/><circle cx="7" cy="12.5" r="3.6"/><circle cx="7" cy="19.5" r="3.6"/><circle cx="25" cy="12.5" r="3.6"/><circle cx="25" cy="19.5" r="3.6"/></g>`),
    up_sp_oil: badge('#2a2622', `<path d="M16 5 Q25 15 21 22 Q16 28 11 22 Q7 15 16 5 Z" fill="#111" stroke="#6b6560" stroke-width="1.6"/><circle cx="13" cy="19" r="2" fill="rgba(255,255,255,.5)"/>`),
    up_sp_gift: badge('#3d2a1a', chestShape + star(25, 7, 4, 1.8, 5, '#ffd23f')),
  },
  items,
  panels: [panel()],
  // the pointer: shown while you can buy something and have bought nothing yet
  goal: { at: 5, fn: s => (s.stars > 0 && s.starSpent === 0 && affordable(s) ? { text: t('star_pointer'), frac: 1, cls: 'gold' } : null) },
  // TNT outlined through the dark
  draw: [{ at: AT.fog + 20, fn(g, s) {
    if (!G.starshopLevel(s, 'sp_eyes')) return;
    const pulse = 0.55 + Math.sin(fx.t * 5) * 0.25;
    g.lineWidth = 3;
    for (let i = 0; i < s.rows.length; i++) {
      const y = yOf(s.top + i);
      if (y > 2000 || y < -CELL) continue;
      for (let c = 0; c < G.COLS; c++) {
        const cell = s.rows[i][c];
        if (!cell || cell.t !== 'tnt') continue;
        g.fillStyle = `rgba(255,60,40,${0.12 * pulse})`; g.fillRect(c * CELL + 2, y + 2, CELL - 4, CELL - 4);
        g.strokeStyle = `rgba(255,90,60,${pulse})`; g.strokeRect(c * CELL + 3, y + 3, CELL - 6, CELL - 6);
      }
    }
  } }],
  tick(s, app) {
    // the free re-roll: a button on a chest's card, while it is open
    if (app.modal.id !== 'draft' || !G.starshopRerollsLeft(s)) return;
    const card = document.querySelector('#modal .card.draft');
    if (!card || card.querySelector('.star-reroll')) return;
    const b = document.createElement('button');
    b.className = 'ghost star-reroll'; b.innerHTML = icon('up_sp_reroll', 22) + '<span></span>';
    b.querySelector('span').textContent = t('reroll_btn');
    b.addEventListener('click', () => {
      if (!G.starshopReroll(s)) return;
      app.modal.close(); app.toast(t('reroll_done'), 'gold');
      setTimeout(openDraft, 0);
    });
    card.insertBefore(b, card.querySelector('.more'));
  },
  on: {
    newSite(d, app) { if (d.stars > 0) setTimeout(() => app.toast(t('star_pointer'), 'gold'), 1800); app.dirty('starshop'); },
    awayDone(out, app) { if (out && out.passed) app.toast(t('t_wake', { n: out.passed }), 'gold'); },
  },
});
