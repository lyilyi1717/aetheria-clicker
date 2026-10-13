// Dig feature (page side): the wardrobe page, the first panel of the Rafeeqs tab. The Rafeeq drawn large, a hat row, a clothes row,
// a colour row and a cloth row, each with arrows; a switch between "All Rafeeqs" and "This Rafeeq"; back and next Rafeeq.
// Looks only. The dig keeps running while this is open.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { gap, tone } from '../../ui/audio.js';
import { drawRafeeqAt, drawWardrobePart } from '../diggers/art.js';

const { t } = G;
const SLOTS = G.WARDROBE_SLOTS;
const CHEV = '<svg viewBox="0 0 12 20" width="12" height="20" aria-hidden="true"><path d="M9 2 L3 10 L9 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const rtl = () => document.documentElement.dir === 'rtl';

const V = { seat: 0, browse: {}, wave: 0 };      // page memory: which Rafeeq, the item shown in a row, the wave after a change
const nameOf = (s, i) => (G.rafeeqName ? G.rafeeqName(s, i) : t('crew_name', { n: i + 1 }));
const whoOf = s => (s.wardrobe.mode === 'one' ? V.seat : 'all');
function worn(s, who) {
  const w = G.wardrobeWear(s, who === 'all' ? 0 : who);
  if (who === 'all') for (const sl of SLOTS) w[sl] = G.wardrobeLook(s, 'all', sl);
  return w;
}
const label = (slot, id) => t('wd_' + slot + '_' + id);

function build(el, app) {
  el.insertAdjacentHTML('beforeend', `<div class="wd">
    <div class="wd-mode"><button class="ghost" data-mode="all"></button><button class="ghost" data-mode="one"></button></div>
    <div class="wd-who"><button class="wd-arrow" data-who="-1">${CHEV}</button><b class="wd-name"></b><button class="wd-arrow" data-who="1">${CHEV}</button></div>
    <p class="muted wd-note"></p>
    <canvas class="wd-stage" width="336" height="392"></canvas>
    <div class="wd-rows"></div>
    <div class="wd-acts"><button class="ghost wd-random"></button><button class="ghost wd-undo"></button></div></div>`);
  const rows = el.querySelector('.wd-rows');
  for (const slot of SLOTS) {
    const row = document.createElement('div');
    row.className = 'wd-row'; row.dataset.slot = slot; row.tabIndex = 0;
    row.innerHTML = `<button class="wd-arrow" data-dir="-1">${CHEV}</button><canvas class="wd-ic" width="64" height="64"></canvas><span class="wd-lab"><small class="wd-slot"></small><b></b><em></em></span><button class="wd-arrow" data-dir="1">${CHEV}</button>`;
    rows.appendChild(row);
  }
  const act = fn => { fn(); app.save(); V.wave = 0.9; refresh(el, app); };
  const step = (slot, dir) => {
    const s = app.state, who = whoOf(s);
    const r = G.wardrobeStep(s, who, slot, dir, V.browse[slot]);
    if (r.owned) { delete V.browse[slot]; app.save(); V.wave = 0.9; if (gap('wdTick', 0.05)) tone(700 + SLOTS.indexOf(slot) * 90, { d: 0.07, vol: 0.07, type: 'triangle' }); }
    else { V.browse[slot] = r.id; if (gap('wdTick', 0.05)) tone(300, { d: 0.07, vol: 0.05, type: 'triangle' }); }
    refresh(el, app);
  };
  rows.addEventListener('click', e => { const b = e.target.closest('[data-dir]'); if (b) { app.unlockAudio(); step(b.closest('.wd-row').dataset.slot, +b.dataset.dir * (rtl() ? -1 : 1)); } });
  rows.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const row = e.target.closest('.wd-row'); if (!row) return;
    e.preventDefault(); step(row.dataset.slot, (e.key === 'ArrowRight' ? 1 : -1) * (rtl() ? -1 : 1));
  });
  el.querySelector('.wd-mode').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]'); if (!b) return;
    app.state.wardrobe.mode = b.dataset.mode; V.browse = {}; app.save(); refresh(el, app);
  });
  el.querySelector('.wd-who').addEventListener('click', e => {
    const b = e.target.closest('[data-who]'); if (!b) return;
    const n = Math.max(1, app.state.diggers.length);
    V.seat = (V.seat + (+b.dataset.who) * (rtl() ? -1 : 1) + n * 2) % n; V.browse = {}; V.wave = 0.9; refresh(el, app);
  });
  el.querySelector('.wd-random').addEventListener('click', () => { app.unlockAudio(); V.browse = {}; act(() => G.wardrobeRandom(app.state, whoOf(app.state))); });
  el.querySelector('.wd-undo').addEventListener('click', () => { V.browse = {}; act(() => G.wardrobeUndo(app.state)); });
  // a click on a Rafeeq in the list opens this page on him
  document.addEventListener('click', e => {
    const row = e.target.closest && e.target.closest('.crew-row');
    if (!row || !row.parentNode) return;
    const i = [...row.parentNode.children].indexOf(row);
    if (i < 0 || i >= app.state.diggers.length) return;
    V.seat = i; V.browse = {}; V.wave = 0.9; app.state.wardrobe.mode = 'one'; app.save(); refresh(el, app);
    el.scrollIntoView({ block: 'nearest' });
  });
  const stage = el.querySelector('.wd-stage'), g = stage.getContext('2d');
  let last = performance.now();
  const loop = now => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (stage.offsetParent !== null && app.state.diggers.length) {
      const s = app.state, who = whoOf(s);
      g.clearRect(0, 0, stage.width, stage.height);
      g.save(); g.translate(stage.width / 2, 215);
      if (V.wave > 0) V.wave -= dt;
      drawRafeeqAt(g, worn(s, who), 4.4, V.wave > 0 ? { key: 'wd', mood: 'happy', age: 0.9 - V.wave } : { key: 'wd' });
      g.restore();
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function refresh(el, app) {
  const s = app.state, w = s.wardrobe, n = s.diggers.length;
  if (V.seat >= n) V.seat = Math.max(0, n - 1);
  const who = whoOf(s), one = w.mode === 'one';
  el.querySelectorAll('[data-mode]').forEach(b => { b.textContent = t(b.dataset.mode === 'all' ? 'wd_all' : 'wd_one'); b.classList.toggle('on', b.dataset.mode === w.mode); });
  el.querySelector('.wd-who').hidden = !one || n < 2;
  el.querySelector('.wd-name').textContent = one ? nameOf(s, V.seat) : '';
  const note = el.querySelector('.wd-note'); note.hidden = one; note.textContent = t('wd_for_all');
  const W = worn(s, who);
  el.querySelectorAll('.wd-row').forEach(row => {
    const slot = row.dataset.slot, id = V.browse[slot] || W[slot], owned = G.wardrobeOwns(s, slot, id);
    const key = [slot, id, W.colour, W.pattern, W.body, owned, who === 'all' ? 0 : V.seat].join('|');
    row.classList.toggle('locked', !owned);
    row.querySelector('.wd-slot').textContent = t('wd_slot_' + slot);
    row.querySelector('b').textContent = label(slot, id);
    row.querySelector('em').textContent = owned ? '' : t(G.wardrobeWhy(s, slot, id), { n: G.wardrobeWhyN(slot, id) });
    if (row.dataset.key !== key) {
      row.dataset.key = key;
      const c = row.querySelector('canvas'), g = c.getContext('2d');
      g.clearRect(0, 0, c.width, c.height); g.save(); g.translate(c.width / 2, c.height / 2); drawWardrobePart(g, slot, { ...W, [slot]: id }, 1.8); g.restore();
    }
  });
  el.querySelector('.wd-random').textContent = t('wd_random');
  const u = el.querySelector('.wd-undo'); u.textContent = t('wd_undo'); u.hidden = !w.undo;
}

ui({
  id: 'wardrobe',
  css: new URL('./wardrobe.css', import.meta.url).href,
  panels: [{
    id: 'wardrobe', elId: 'wardrobe', at: 13, title: 'wd_title', live: true,
    when: s => s.diggers.length > 0,
    build,
    update(el, s, app) { refresh(el, app); },
  }],
  on: {
    wardrobeNew(d, app) { app.toast(t('wd_new', { name: label(d.slot, d.id) }), 'gold'); },
  },
});
