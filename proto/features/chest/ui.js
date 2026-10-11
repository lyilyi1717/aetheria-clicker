// Dig feature (page side): the chest block, the "Open chest" button, the pick-1-of-3 card and the Relics panel.
import * as G from '../../game.js';
import { ui, app } from '../../ui/app.js';
import { CELL, baseBlock, shade, rr, centre, ring, spark } from '../../ui/render.js';
import { sfx, gap, tone, pent } from '../../ui/audio.js';
import { icon, badge, chest as chestShape } from '../../ui/icons.js';

const { t } = G;

// a relic's line of text; a relic def may give vars(level) for its numbers
export function relicDesc(id, lv) {
  const r = G.RELICS[id];
  return t('r_' + id + '_d', r.vars ? r.vars(lv) : undefined);
}

// open the next chest, if there is one and no other card is up
export function openDraft() {
  const state = app.state;
  if (app.modal.id || state.chests <= 0) return;
  const ids = G.rollDraft(state);
  if (!ids.length) { G.takeRelic(state, null); return; }
  const m = app.modal.open('draft', `<div class="card draft"><div class="chest-anim">${icon('chest', 72)}</div><h2></h2><div class="cards"></div><p class="more"></p></div>`);
  sfx.chestOpen();
  m.querySelector('h2').textContent = t('chest_title');
  m.querySelector('.more').textContent = state.chests > 1 ? t('chest_more', { n: state.chests - 1 }) : '';
  const wrap = m.querySelector('.cards');
  ids.forEach((id, i) => {
    const lv = G.rel(state, id);
    const b = document.createElement('button');
    b.className = 'relic-card'; b.style.animationDelay = `${0.45 + i * 0.12}s`;
    b.innerHTML = `<span class="tag ${lv ? 'up' : 'new'}"></span><span class="ic">${icon(id, 56)}</span><b></b><span class="d"></span>`;
    b.querySelector('.tag').textContent = lv ? t('chest_up', { n: lv + 1 }) : t('chest_new');
    b.querySelector('b').textContent = t('r_' + id);
    b.querySelector('.d').textContent = relicDesc(id, lv + 1);
    b.addEventListener('click', () => {
      G.takeRelic(state, id, app.ev);
      app.modal.close();
      app.save();
      if (state.chests > 0) setTimeout(openDraft, 300);
    });
    wrap.appendChild(b);
  });
}

ui({
  id: 'chest',
  icons: { nose: badge('#3d2a1a', chestShape) },
  sfx: {
    chestFound() {
      if (!gap('chestFound', 0.2)) return;
      [0, 2, 4].forEach((n, i) => tone(pent(5 + n), { type: 'triangle', d: 0.18, vol: 0.2, at: i * 0.07 }));
    },
    chestOpen() {
      if (!gap('chestOpen', 0.2)) return;
      tone(200, { type: 'triangle', a: 0.4, d: 0.05, vol: 0.14, slide: 900 });
      [523, 659, 784, 1047].forEach((f, i) => tone(f, { type: 'triangle', d: i === 3 ? 0.5 : 0.16, vol: 0.2, at: 0.45 + i * 0.07 }));
    },
    relic() {
      if (!gap('relic', 0.1)) return;
      [659, 988, 1319].forEach((f, i) => tone(f, { type: 'square', d: 0.2, vol: 0.08, at: i * 0.06 }));
    },
  },
  art: {
    chest: { colour: '#a65c24', twinkle: true, glow: '255,210,63', firstSight: { flag: 'chestToast', text: 't_chest_seen', kind: 'gold' }, sprite(g, p, v) {
      baseBlock(g, shade(p.dirt, -0.25), v, 2);
      rr(g, 11, 22, 42, 30, 4); g.fillStyle = '#8a4b1c'; g.fill(); g.strokeStyle = '#3d1f08'; g.lineWidth = 2; g.stroke();
      g.beginPath(); g.moveTo(11, 30); g.quadraticCurveTo(32, 6, 53, 30); g.closePath(); g.fillStyle = '#a65c24'; g.fill(); g.stroke();
      g.fillStyle = '#ffd23f'; g.fillRect(11, 29, 42, 4); g.fillRect(17, 16, 4, 36); g.fillRect(43, 16, 4, 36);
      rr(g, 27, 27, 10, 11, 2); g.fillStyle = '#fff1a0'; g.fill(); g.strokeStyle = '#7a5a00'; g.stroke();
    } },
  },
  mount() {
    const b = document.createElement('button');
    b.id = 'chest-btn'; b.hidden = true;
    b.innerHTML = `${icon('chest', 34)}<span></span><b id="chest-n">1</b>`;
    b.querySelector('span').textContent = t('chest_btn');
    b.addEventListener('click', () => { app.unlockAudio(); openDraft(); });
    app.el.stage.appendChild(b);
  },
  tick(s) {
    const cb = document.getElementById('chest-btn');
    cb.hidden = s.chests <= 0 || app.modal.id === 'draft';
    document.getElementById('chest-n').textContent = s.chests;
  },
  on: {
    chest(d) {
      sfx.chestFound();
      const [x, y] = centre(d.r, d.c); ring(x, y, CELL * 1.6, '#ffd23f'); spark(x, y, '#ffd23f', 24);
      if (d.src === 'you') setTimeout(openDraft, 550); else app.toast(t('t_chest_crew'), 'gold');
    },
    relic() { sfx.relic(); app.dirty('relics'); },
    bossDown() { setTimeout(openDraft, 2400); },     // the Big Rock's chest, after its banner
    awayDone() { if (app.state.chests > 0) setTimeout(openDraft, 300); },
  },
  panels: [{
    id: 'relics', side: 'left', at: 10, title: 'relics',
    build(el) { el.insertAdjacentHTML('beforeend', `<p class="muted" id="relic-none"></p><div id="relic-list"></div>`); el.querySelector('#relic-none').textContent = t('relics_none'); },
    update(el, s) {
      const list = el.querySelector('#relic-list');
      const ids = Object.keys(s.relics);
      el.querySelector('#relic-none').hidden = ids.length > 0;
      list.innerHTML = '';
      for (const id of ids) {
        const lv = s.relics[id];
        const row = document.createElement('div');
        row.className = 'relic';
        row.innerHTML = `<span class="ic">${icon(id, 30)}</span><span class="tx"><b></b><span class="d"></span></span><span class="pips">${'<i class="on"></i>'.repeat(lv)}${'<i></i>'.repeat(G.RELICS[id].max - lv)}</span>`;
        row.querySelector('b').textContent = t('r_' + id);
        row.querySelector('.d').textContent = relicDesc(id, lv);
        list.appendChild(row);
      }
    },
  }],
});
