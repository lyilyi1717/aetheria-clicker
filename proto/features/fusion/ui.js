// Dig feature (page side): relic fusion. The drawn icons of the seventeen fused relics, the Fuse
// button, the chooser, the ceremony (both halves fly together, a flash, the new card), the Recipe Book
// and small bursts for what the twists do on the ground.
import * as G from '../../game.js';
import { ui, app } from '../../ui/app.js';
import { centre, ring, spark, shake, screenFlash } from '../../ui/render.js';
import { gap, tone, noise } from '../../ui/audio.js';
import { S, badge, icon } from '../../ui/icons.js';

const { t } = G;

// ---------- icons: a coloured badge and one drawn mark that says what the twist does ----------

const flame = (x, y, k = 1) => `<path d="M${x} ${y + 8 * k} C${x - 7 * k} ${y + 6 * k} ${x - 6 * k} ${y - 2 * k} ${x} ${y - 9 * k} C${x + 1 * k} ${y - 3 * k} ${x + 7 * k} ${y} ${x + 6 * k} ${y + 4 * k} C${x + 5 * k} ${y + 7 * k} ${x + 2 * k} ${y + 8 * k} ${x} ${y + 8 * k} Z" fill="#ff8a1f" ${S}/><path d="M${x} ${y + 8 * k} C${x - 3 * k} ${y + 6 * k} ${x - 2 * k} ${y + 2 * k} ${x} ${y} C${x + 3 * k} ${y + 3 * k} ${x + 3 * k} ${y + 6 * k} ${x} ${y + 8 * k} Z" fill="#ffe27a"/>`;
const barrel = (x, y) => `<rect x="${x - 5}" y="${y - 6}" width="10" height="12" rx="2" fill="#c0392b" ${S}/><path d="M${x - 5} ${y - 2} H${x + 5} M${x - 5} ${y + 2} H${x + 5}" stroke="#1b1410" stroke-width="1.2"/>`;
const rock = (x, y, c = '#cdbba0') => `<path d="M${x - 6} ${y + 4} L${x - 4} ${y - 5} L${x + 3} ${y - 6} L${x + 7} ${y} L${x + 4} ${y + 6} Z" fill="${c}" ${S}/>`;
const ore = (x, y, c) => `<path d="M${x} ${y - 6} L${x + 5} ${y - 1} L${x} ${y + 6} L${x - 5} ${y - 1} Z" fill="${c}" ${S}/>`;
const blast = (x, y, r) => `<path d="M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z" fill="#ffd23f" ${S}/>`;
const arrowDown = `<path d="M16 5 V22 M9 16 L16 24 L23 16" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
const rangShape = (x, y) => `<path d="M${x - 8} ${y + 5} L${x} ${y - 5} L${x + 8} ${y + 5}" fill="none" stroke="#dfe7ee" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`;
const hat = (x, y) => `<circle cx="${x}" cy="${y + 2}" r="4.5" fill="#f8d9b0" ${S}/><path d="M${x - 6} ${y + 1} A6 6 0 0 1 ${x + 6} ${y + 1} Z" fill="#ffd23f" ${S}/>`;
const hop = `<path d="M6 22 Q10 6 15 20 Q20 6 26 22" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`;
const sprout = (x, y) => `<path d="M${x} ${y + 7} V${y - 1} M${x} ${y + 1} Q${x - 7} ${y - 1} ${x - 6} ${y - 7} Q${x} ${y - 6} ${x} ${y + 1} M${x} ${y - 1} Q${x + 7} ${y - 3} ${x + 6} ${y - 9} Q${x} ${y - 8} ${x} ${y - 1}" fill="#7ad151" ${S}/>`;

const ART = {
  mirror: ['#2c5d8a', `${ore(11, 16, '#e6853c')}${ore(22, 16, '#e6853c')}<path d="M16 6 V26" stroke="#fff" stroke-width="1.6" stroke-dasharray="2 2"/>`],
  rockpop: ['#6b4a2a', `${rock(11, 20)}${ore(21, 12, '#ffd23f')}<path d="M18 7 L21 3 M24 8 L28 6 M25 14 L29 14" stroke="#ffd23f" stroke-width="2" stroke-linecap="round"/>`],
  fireshower: ['#8a2c1c', `${flame(10, 12, 0.8)}${flame(21, 14, 0.8)}${barrel(16, 23)}`],
  quake: ['#5a4a3a', `${rangShape(16, 12)}<path d="M5 22 L11 19 L15 24 L20 19 L27 23" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`],
  buddy: ['#2f6b4a', `${hat(10, 13)}${hat(22, 13)}<path d="M6 25 L26 25" stroke="#dfe7ee" stroke-width="3" stroke-linecap="round"/>`],
  bloom: ['#3b6b2c', `${sprout(11, 16)}${ore(22, 15, '#59d0ff')}`],
  flameang: ['#8a3a1c', `${rangShape(16, 12)}${flame(16, 21, 0.9)}`],
  barreldrop: ['#6a2a22', `${barrel(16, 10)}<path d="M16 17 V22 M13 20 L16 24 L19 20" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>${blast(16, 26, 4)}`],
  barrelboom: ['#7a3a1c', `${barrel(9, 18)}${barrel(23, 18)}${blast(16, 12, 7)}`],
  treasuredrill: ['#3a4a6a', `${arrowDown}${ore(16, 25, '#ffd23f')}`],
  torch: ['#8a4a1c', `<path d="M16 28 V14" stroke="#7a4a1c" stroke-width="4" stroke-linecap="round"/>${flame(16, 9, 1)}`],
  echoseed: ['#5a3a7a', `${ore(11, 15, '#59d0ff')}${ore(22, 15, '#59d0ff')}<path d="M15 14 Q16 10 17 14" stroke="#fff" stroke-width="1.6" fill="none"/>${sprout(16, 25)}`],
  goldendinar: ['#7a5a1a', `<circle cx="16" cy="16" r="9" fill="#ffd23f" ${S}/><circle cx="16" cy="16" r="5" fill="none" stroke="#b98a00" stroke-width="1.6"/>${ore(25, 7, '#fff3a0')}`],
  bombhop: ['#4a3a6a', `${hop}${blast(16, 21, 6)}`],
  rockbomb: ['#5a4a3a', `${rock(16, 11)}${blast(16, 23, 6)}`],
  drillboom: ['#3a3a5a', `${arrowDown}${blast(16, 24, 5)}`],
  raffsweep: ['#2f5b6b', `${hat(16, 11)}<path d="M5 22 H27 M8 19 L5 22 L8 25 M24 19 L27 22 L24 25" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`],
};
const icons = { fz_q: badge('#2a2f3a', `<text x="16" y="23" text-anchor="middle" font-size="20" font-weight="900" fill="#b97bff" font-family="sans-serif">?</text>`) };
for (const [id, [col, inner]] of Object.entries(ART)) icons['fz_' + id] = badge(col, inner);

// ---------- the Fuse button, the chooser and the ceremony ----------

const halfRow = (a, b, size = 40) => `<span class="fz-row">${icon(a, size)}<span class="fz-plus">+</span>${icon(b, size)}</span>`;
const resultOf = (s, f) => (G.fusionState(s, f.id) === 2 ? t('r_fz_' + f.id) : '?');

function ceremony(f, first) {
  const m = app.modal.open('fusion', `<div class="card fz-card"><h2></h2><div class="fz-stage">
    <span class="half l">${icon(f.a, 56)}</span><span class="half r">${icon(f.b, 56)}</span><span class="flash"></span>
    <span class="born">${icon('fz_' + f.id, 96)}</span></div>
    <b class="fz-name"></b><p class="d fz-name"></p><p class="d fz-name fz-grew" hidden></p><div class="fz-actions"><button class="relic-card" style="min-height:0;width:auto;padding:8px 22px"></button></div></div>`);
  if (!m) return;
  m.querySelector('h2').textContent = t('fz_done');
  m.querySelector('b.fz-name').textContent = t('r_fz_' + f.id);
  m.querySelector('p.fz-name').textContent = t('r_fz_' + f.id + '_d');
  const grew = m.querySelector('.fz-grew');
  if (first) { grew.hidden = false; grew.textContent = t('fz_grew'); }
  const btn = m.querySelector('button');
  btn.textContent = t('fz_close');
  btn.addEventListener('click', () => {
    app.modal.close(); app.save();
    if (first) {
      app.lesson('fz_watch', t('fz_lesson_watch'), 'gold');
      for (let k = 0; k < 3; k++) setTimeout(() => { const [x, y] = centre(app.state.top + 2 + k, 4 + (k % 2)); ring(x, y, 80, '#e8d0ff'); spark(x, y, '#e8d0ff', 14); }, 150 * k);
    }
  });
  fanfare();
  setTimeout(() => { shake(0.5); screenFlash('#e8d0ff', 0.5); }, 850);
}

function choose() {
  const s = app.state;
  const ready = G.fusionReady(s);
  if (!ready.length || app.modal.id) return;
  const first = !G.fusionFused(s);
  if (ready.length === 1 && !first) { go(ready[0]); return; }
  const m = app.modal.open('fusion', `<div class="card fz-card"><h2></h2><div class="cards"></div><p class="d"></p><button class="relic-card" style="min-height:0;width:auto;padding:6px 18px"></button></div>`);
  if (!m) return;
  m.querySelector('h2').textContent = t('fz_pick');
  if (first) m.querySelector('p.d').textContent = t('fz_teach');
  const wrap = m.querySelector('.cards');
  ready.forEach((id, i) => {
    const f = G.FUSIONS.find(x => x.id === id);
    const b = document.createElement('button');
    b.className = 'fz-opt'; b.style.animationDelay = `${i * 0.08}s`;
    b.innerHTML = `${halfRow(f.a, f.b)}<b></b><span class="d"></span>`;
    b.querySelector('b').textContent = resultOf(s, f);
    b.querySelector('.d').textContent = G.fusionState(s, id) === 2 ? t('r_fz_' + id + '_d') : t('fz_seen');
    b.addEventListener('click', () => go(id));
    wrap.appendChild(b);
  });
  const close = m.querySelector('.relic-card');
  if (!first) m.querySelector('p.d').remove();
  close.textContent = t('fz_later');
  close.addEventListener('click', () => app.modal.close());
}

function go(id) {
  const f = G.FUSIONS.find(x => x.id === id);
  if (app.modal.id) app.modal.close();
  const first = !G.fusionFused(app.state);
  if (!G.fusionDo(app.state, id, app.ev)) return;
  app.dirty('relics'); app.dirty('fzbook');
  ceremony(f, first);
}

function fanfare() {
  noise({ d: 0.5, vol: 0.12, from: 300, to: 3000, type: 'bandpass' });
  [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, { type: 'triangle', d: i === 4 ? 0.7 : 0.18, vol: 0.18, at: 0.85 + i * 0.09 }));
}

// ---------- on the ground ----------

const pop = (r, c, col, n = 12) => { const [x, y] = centre(r, c); ring(x, y, 70, col); spark(x, y, col, n); };
const link = (d, col) => { if (d.fr !== undefined) { const [x, y] = centre(d.fr, d.fc); ring(x, y, 40, col); } pop(d.r, d.c, col); };

ui({
  id: 'fusion',
  css: new URL('./fusion.css', import.meta.url).href,
  icons,
  sfx: {
    fzPing() { if (gap('fzping', 0.1)) [880, 1319].forEach((f, i) => tone(f, { type: 'triangle', d: 0.14, vol: 0.12, at: i * 0.05 })); },
    fzThump() { if (gap('fzthump', 0.1)) tone(120, { type: 'sine', d: 0.2, vol: 0.2, slide: -50 }); },
  },
  on: {
    fusionSeen(d) {
      // the first match is taught: the line says what to press; later ones are a small note
      if (!app.state.seen.fz_ready && !G.fusionFused(app.state)) app.lesson('fz_ready', t('fz_lesson_ready'), 'gold');
      else app.toast(t('fz_toast_seen'), 'gold');
      app.sfx.fzPing(); app.dirty('fzbook');
    },
    fusionCopy(d) { link(d, '#9fd8ff'); app.sfx.fzPing(); },
    fusionRipe(d) { pop(d.r, d.c, '#ffd23f', 16); app.sfx.fzPing(); },
    fusionDrop(d) { pop(d.r, d.c, '#ff7a5a'); app.sfx.fzThump(); },
    fusionBurst(d) { link(d, '#ffb347'); app.sfx.fzThump(); },
    fusionBring(d) { link({ fr: d.fr, fc: d.c, r: d.r, c: d.c }, '#b97bff'); app.sfx.fzPing(); },
    relic(d) {
      app.dirty('fzbook');
      // the first relic that has a partner: say so, once
      const s = app.state;
      if (!d.id.startsWith('fz_') && !G.fusionFused(s) && !s.seen.fz_half && G.FUSIONS.some(f => f.a === d.id || f.b === d.id)) app.lesson('fz_half', t('fz_lesson_half'), 'gold');
    },
  },
  mount() {
    const b = document.createElement('button');
    b.id = 'fuse-btn'; b.hidden = true;
    b.innerHTML = `${icon('fz_q', 30)}<span></span><b>1</b>`;
    b.querySelector('span').textContent = t('fz_btn');
    b.addEventListener('click', () => { app.unlockAudio(); choose(); });
    app.el.stage.appendChild(b);
  },
  tick(s) {
    const n = G.fusionReady(s).length, b = document.getElementById('fuse-btn');
    if (b) { b.hidden = n === 0 || !!app.modal.id; b.querySelector('b').textContent = n; }
    // melted halves are folded into the new card: hide their rows in the Relics panel
    const gone = new Set(Object.keys(s.fusion.melted).map(id => t('r_' + id)));
    if (!gone.size) return;
    for (const row of document.querySelectorAll('#relic-list .relic')) row.hidden = gone.has(row.querySelector('b').textContent);
  },
  panels: [{
    id: 'fzbook', side: 'left', at: 20, fold: true, title: 'fz_title',
    when: s => Object.keys(s.relics).length > 1,
    build(el) { el.insertAdjacentHTML('beforeend', '<p class="muted" id="fz-count"></p><div class="fz-book" id="fz-list"></div>'); },
    update(el, s) {
      const known = G.FUSIONS.filter(f => G.fusionState(s, f.id) > 0).length;
      el.querySelector('#fz-count').textContent = t('fz_found', { n: known, m: G.FUSIONS.length });
      const list = el.querySelector('#fz-list');
      list.innerHTML = '';
      // the ones you have met first, then the rest as question marks
      const order = G.FUSIONS.slice().sort((a, b) => G.fusionState(s, b.id) - G.fusionState(s, a.id));
      for (const f of order) {
        const st = G.fusionState(s, f.id);
        const row = document.createElement('div');
        row.className = 'fz-rec s' + st;
        const q = icon('fz_q', 28);
        row.innerHTML = `<span class="row">${st ? icon(f.a, 28) : q}<span class="fz-plus">+</span>${st ? icon(f.b, 28) : q}</span><b></b><span class="d"></span>`;
        row.querySelector('b').textContent = st === 2 ? t('r_fz_' + f.id) : st === 1 ? '?' : t('fz_unknown');
        row.querySelector('.d').textContent = st === 2 ? t('r_fz_' + f.id + '_d') : st === 1 ? G.fusionCan(s, f.id) ? t('fz_seen') : t('fz_need', { n: G.fusionNeed(s, f.id) }) : '';
        list.appendChild(row);
      }
    },
  }],
});

void app;
