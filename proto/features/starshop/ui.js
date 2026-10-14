// Dig feature (page side): the three Star tracks panel, the "Your hit" chip with the drawn pick, the
// "which relic crosses" picker, the free re-roll button on a chest's card, the TNT outline, and the pointer
// that shows up with a New Site.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { S, badge, star, icon, pickShape, helmet, chest as chestShape, gem } from '../../ui/icons.js';
import { AT, CELL, yOf, fx } from '../../ui/render.js';
import { buyAllButton } from '../shop/buyallui.js';
import { openDraft } from '../chest/ui.js';

const { t } = G;

// ---------- the pick, drawn ----------
// Four shapes (stone, curved, flat, gem); the materials that share a shape differ in colour and shine.
const HANDLE = '<path d="M9 25 L21 11" stroke="#1b1410" stroke-width="5" stroke-linecap="round"/><path d="M9 25 L21 11" stroke="#a8672c" stroke-width="2.6" stroke-linecap="round"/>';
const MATS = {
  wood:    { shape: 'curved', c: '#b98a52', hi: '#e2c08c' },
  stone:   { shape: 'stone',  c: '#9aa0a6', hi: '#d5d9dc' },
  copper:  { shape: 'curved', c: '#d9824a', hi: '#ffd0a8' },
  bronze:  { shape: 'curved', c: '#a9753a', hi: '#e9c58a' },
  iron:    { shape: 'flat',   c: '#7b858f', hi: '#c3ccd4' },
  steel:   { shape: 'flat',   c: '#b3c2d1', hi: '#f2f8ff' },
  silver:  { shape: 'curved', c: '#dfe7ee', hi: '#ffffff' },
  gold:    { shape: 'curved', c: '#ffd23f', hi: '#fff3a8' },
  crystal: { shape: 'gem',    c: '#7fe3ff', hi: '#e8fbff' },
  skyiron: { shape: 'gem',    c: '#3a3f5c', hi: '#7ff0ff' },
  star:    { shape: 'gem',    c: '#ffd23f', hi: '#fff3a8', star: true },
};
// n-1 bands on the handle: the steps between two materials
const bands = n => {
  let o = '';
  for (let i = 0; i < n - 1; i++) {
    const f = 0.28 + i * 0.17, x = 9 + 12 * f, y = 25 - 14 * f;
    o += `<path d="M${(x - 1.7).toFixed(1)} ${(y - 1.5).toFixed(1)} L${(x + 1.7).toFixed(1)} ${(y + 1.5).toFixed(1)}" stroke="#3b2412" stroke-width="1.6" stroke-linecap="round"/>`;
  }
  return o;
};
function head(m) {
  const k = MATS[m];
  if (k.shape === 'stone') return `<path d="M9 11 L16 5 L25 8 L28 15 L24 17 L18 12 L12 15 Z" fill="${k.c}" ${S}/><path d="M16 5.5 L22 8.5 M13 13 L17 10" stroke="${k.hi}" stroke-width="1.3" stroke-linecap="round"/>`;
  if (k.shape === 'flat') return `<path d="M5 13 L13 7 L27 15 L25 18.5 L13 11.5 L8 16 Z" fill="${k.c}" ${S}/><path d="M13 8.4 L24 15" stroke="${k.hi}" stroke-width="1.3" stroke-linecap="round"/>`;
  const base = `<path d="M12 7 Q22 6 26 16" fill="none" stroke="#1b1410" stroke-width="5.4" stroke-linecap="round"/><path d="M12 7 Q22 6 26 16" fill="none" stroke="${k.c}" stroke-width="3" stroke-linecap="round"/><path d="M13 7.2 Q20 6.6 24.4 11.5" fill="none" stroke="${k.hi}" stroke-width="1" stroke-linecap="round" opacity=".85"/>`;
  if (k.shape === 'gem') return base + (k.star ? star(25.5, 7, 4.2, 1.9, 5, '#fff3a8') : gem(25, 8, 4, k.hi));
  return base;
}
export const pickArt = (mat, n = 0) => HANDLE + bands(n) + head(mat);
const pickSvg = (mat, n, size) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">${pickArt(mat, n)}</svg>`;
const matIcons = Object.fromEntries(Object.keys(MATS).map(m => ['pick_' + m, pickArt(m, 0)]));

// ---------- what a step says ----------
const RULE_ICON = { head1: 'up_sp_head', head2: 'up_sp_head', head3: 'up_sp_head', whole: 'up_sp_head', shoes: 'up_sp_head', kettle: 'up_sp_head', wake: 'up_sp_wake', keep1: 'up_sp_keep', keep2: 'up_sp_keep', keep3: 'up_sp_keep', pocket2: 'up_sp_keep', cards: 'up_sp_cards', reroll: 'up_sp_reroll', map: 'up_sp_map', eyes: 'up_sp_eyes', bone: 'up_sp_bone', oil: 'up_sp_oil', gift1: 'up_sp_gift', gift2: 'up_sp_gift' };
// step n (1, 2, 3 ...) of a track: { title, desc, ic }; a plain Camp step names its share and the Rafeeq hit before and after
function stepInfo(track, n, s) {
  const rule = G.starshopRule(track, n);
  if (track === 'pick') {
    const pk = G.starshopPickAt(n);
    return { title: t('pick_title', { name: G.starshopPickName(pk) }), desc: rule ? t('rule_' + rule + '_d') : t('track_more_pick'), ic: 'pick_' + pk.mat };
  }
  if (rule) return { title: t('rule_' + rule), desc: t('rule_' + rule + '_d'), ic: RULE_ICON[rule] || 'up_sp_head' };
  if (track === 'camp') {
    const p = Math.round(100 * G.PARAMS.starshop.campShare), a = Math.round(100 * G.crewShare(s));
    return { title: t('track_plain_camp', { p }), desc: t('track_more_camp', { a, b: a + p }), ic: 'up_sp_head' };
  }
  return { title: t('track_plain_' + track), desc: t('track_more_' + track), ic: 'coin' };
}

const affordable = s => G.STARSHOP_TRACKS.some(tr => G.canBuy(s, 'tr_' + tr));

// ---------- the panel ----------
export function starPanel() {
  let note, back, box, pick, ba, sig = '', pickSig = '';
  return {
    id: 'starshop', side: 'right', at: 5, title: 'starshop', live: true,
    when: s => s.stars > 0 || s.starSpent > 0,
    build(el, app) {
      ba = buyAllButton(app, { shop: 'star', nameOf: id => t('up_' + id) });
      note = document.createElement('p'); note.className = 'muted star-note';
      back = document.createElement('p'); back.className = 'star-back'; back.hidden = true;
      box = document.createElement('div'); box.className = 'trk-list';
      pick = document.createElement('div'); pick.className = 'star-pick'; pick.hidden = true;
      el.append(note, back, ba.el, box, pick);
    },
    update(el, s, app) {
      note.textContent = t('star_note') + ' ' + t('star_next');
      back.hidden = !(s.starRefund > 0);
      if (!back.hidden) back.textContent = t('star_back', { n: G.fmt(s.starRefund) });
      el.classList.toggle('ready', affordable(s));
      const key = s.stars + '|' + G.STARSHOP_TRACKS.map(tr => G.starshopSteps(s, tr)).join();
      if (key !== sig) {
        sig = key;
        box.innerHTML = '';
        for (const tr of G.STARSHOP_TRACKS) box.appendChild(track(s, tr, app));
      }
      ba.update(s);
      keeper(s, app);
    },
  };
  // the last word never sits alone on its own line, so "then 72%." keeps "then" (art-and-sound decision 19): a no-break space
  // before the last word, put in by the layout, so the localizer's words stay as written
  function keepEnd(str) { return String(str).replace(/ ([^ ]{1,8})$/, '\u00a0$1'); }
  function track(s, tr, app) {
    const id = 'tr_' + tr, n = G.starshopSteps(s, tr), id1 = n + 1;
    const sec = document.createElement('section'); sec.className = 'trk trk-' + tr;
    const h = document.createElement('div'); h.className = 'trk-h';
    const pk = tr === 'pick' ? G.starshopPickAt(n) : null;
    h.innerHTML = `<span class="ic">${tr === 'pick' ? pickSvg(pk.mat, pk.n, 30) : icon(tr === 'camp' ? 'up_sp_head' : 'coin', 30)}</span><b></b><span class="trk-n"></span><span class="d"></span>`;
    h.querySelector('b').textContent = t('up_' + id);
    h.querySelector('.trk-n').textContent = t('track_step', { n });
    h.querySelector('.d').textContent = t('up_' + id + '_d');
    sec.appendChild(h);
    const info = stepInfo(tr, id1, s), cost = G.upgradeCost(s, id), can = s.stars >= cost;
    const b = document.createElement('button');
    b.className = 'shop-item trk-next' + (can ? ' can' : '');
    b.innerHTML = `<span class="ic">${info.ic.startsWith('pick_') ? icon(info.ic, 40) : icon(info.ic, 40)}</span><span class="tx"><b></b><span class="d"></span></span><span class="cost">${icon('star', 16)}<i></i></span><span class="fill"></span>`;
    b.querySelector('b').textContent = info.title;
    b.querySelector('.d').textContent = keepEnd(info.desc);
    b.querySelector('.cost i').textContent = G.fmt(cost);
    b.querySelector('.fill').style.width = Math.min(100, s.stars / cost * 100) + '%';
    b.addEventListener('click', () => { app.unlockAudio(); if (G.buy(app.state, id, app.ev)) { app.bump(b); app.refresh(true); app.dirty('starshop'); } else app.sfx.deny(); });
    sec.appendChild(b);
    const soon = document.createElement('ol'); soon.className = 'trk-soon';
    for (let k = 2; k <= 4; k++) {
      const i = stepInfo(tr, n + k, s), li = document.createElement('li');
      li.textContent = `${n + k}. ${i.title}`;
      soon.appendChild(li);
    }
    sec.appendChild(soon);
    return sec;
  }
  function keeper(s, app) {
    pick.hidden = !G.starshopLevel(s, 'sp_keep');
    if (pick.hidden) return;
    const held = G.starshopKeepOptions(s), now = G.starshopKeepList(s);
    const key = held.join() + '|' + now.map(x => x.id + x.level).join() + '|' + s.starKeep;
    if (key === pickSig) return;
    pickSig = key;
    pick.innerHTML = '';
    const h = document.createElement('p'); h.className = 'muted';
    h.textContent = held.length ? t('keep_title') + (s.starKeep ? '' : '  ·  ' + t('keep_auto')) : t('keep_none');
    pick.appendChild(h);
    const row = document.createElement('div'); row.className = 'star-pick-row';
    for (const id of held) {
      const b = document.createElement('button');
      b.className = 'ghost' + (now.some(x => x.id === id) ? ' on' : '');
      b.title = t('r_' + id);
      b.innerHTML = icon(id, 28);
      b.addEventListener('click', () => { app.unlockAudio(); G.starshopSetKeep(s, id); app.refresh(true); });
      row.appendChild(b);
    }
    pick.appendChild(row);
    for (const k of now) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = t('r_' + k.id) + ': ' + t('keep_level', { n: k.level }); pick.appendChild(p); }
  }
}

// the chip beside the purse: the pick, its material, and your hit
let chip, chipN, chipName, chipIc, lastHit = -1, lastMat = '';
function mountChip(app) {
  chip = document.createElement('span');
  chip.id = 'hit-chip'; chip.className = 'hit-chip';
  chip.innerHTML = `<span class="hc-ic"></span><span class="hc-tx"><small></small><b></b></span><i></i>`;
  chip.querySelector('small').textContent = t('hit_label');
  chipN = chip.querySelector('b'); chipName = chip.querySelector('i'); chipIc = chip.querySelector('.hc-ic');
  app.el.top.appendChild(chip);
}

ui({
  id: 'starshop',
  css: new URL('./starshop.css', import.meta.url).href,
  icons: {
    ...matIcons,
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
    up_tr_pick: badge('#b5532a', pickShape('#ffd9a0')),
    up_tr_camp: badge('#2f8f5b', helmet),
    up_tr_bag: badge('#3d2a1a', chestShape + star(25, 7, 4, 1.8, 5, '#ffd23f')),
  },
  items: {
    tr_pick: { desc: () => t('up_tr_pick_d'), noLevel: true },
    tr_camp: { desc: () => t('up_tr_camp_d'), noLevel: true },
    tr_bag: { desc: () => t('up_tr_bag_d'), noLevel: true },
  },
  // (the Star tracks are bought at the Alqahwa, worldmap/alqahwa.js, which builds starPanel() into its menu board)
  // the pointer "Spend Stars at Alqahwa." lives in the message line only (the newSite note below); the goal
  // spot always shows the goal its chip names (#470, docs/art-and-sound.md decision 12)
  mount: mountChip,
  start(app) {
    const s = app.state;
    if (s.starRefund > 0) setTimeout(() => app.toast(t('star_back', { n: G.fmt(s.starRefund) }), 'gold'), 1500);
  },
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
    // the Your hit chip
    if (chip) {
      const hit = G.pickPower(s), pk = G.starshopPickAt(G.starshopSteps(s, 'pick'));
      const mk = pk.mat + pk.n;
      if (mk !== lastMat) { lastMat = mk; chipIc.innerHTML = pickSvg(pk.mat, pk.n, 34); chipName.textContent = G.starshopPickName(pk); }
      if (hit !== lastHit) { const first = lastHit < 0; lastHit = hit; chipN.textContent = G.starshopNum(hit); if (!first) app.bump(chip); }
    }
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
    newSite(d, app) {
      if (d.stars > 0) setTimeout(() => app.toast(t('star_pointer'), 'gold'), 1800);
      setTimeout(() => app.toast(G.starshopMovedText(app.state), 'gold'), 3200);
      app.dirty('starshop');
    },
    awayDone(out, app) { if (out && out.passed && !out.card) app.toast(t('t_wake', { n: out.passed }), 'gold'); },
  },
});
