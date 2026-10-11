// Dig feature (page side): the bone block, the Museum panel, the "new bone" and "set complete" moments.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { CELL, baseBlock, shade, rr, centre, ring, spark, screenFlash } from '../../ui/render.js';
import { sfx, gap, tone } from '../../ui/audio.js';
import { icon } from '../../ui/icons.js';

const { t, fmt } = G;

ui({
  id: 'museum',
  sfx: {
    fossil() {
      if (!gap('fossil', 0.2)) return;
      [392, 494, 587, 784].forEach((f, i) => tone(f, { type: 'sine', d: 0.3, vol: 0.2, at: i * 0.09 }));
    },
  },
  art: {
    fossil: { sprite(g, p, v) {
      baseBlock(g, shade(p.dirt, -0.22), v, 2);
      g.save(); g.translate(32, 33); g.rotate(-0.6);
      g.fillStyle = '#f6efdc'; g.strokeStyle = '#6b5a3a'; g.lineWidth = 1.5;
      rr(g, -17, -4, 34, 8, 4); g.fill(); g.stroke();
      for (const [x, y] of [[-17, -5], [-17, 5], [17, -5], [17, 5]]) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.stroke(); }
      g.fillRect(-15, -3, 30, 6);
      g.restore();
    } },
  },
  on: {
    fossil(d, app) {
      sfx.fossil();
      const [x, y] = centre(d.r, d.c); ring(x, y, CELL * 1.4, '#f6efdc'); spark(x, y, '#f6efdc', 20);
      app.toast(d.isNew ? t('t_fossil_new', { set: t('set_' + d.set) }) : t('t_fossil_dup', { n: fmt(d.coins) }), 'fossil');
      app.dirty('museum');
    },
    set(d, app) { app.banner(t('t_set', { set: t('set_' + d.set) }), ''); sfx.star(); screenFlash('#f6efdc', 0.3); app.dirty('museum'); },
  },
  panels: [{
    id: 'museum', elId: 'museum', side: 'left', at: 20, title: 'museum',
    when: s => Object.keys(s.fossils).length > 0,
    build(el) { el.insertAdjacentHTML('beforeend', `<div id="museum-list"></div>`); },
    update(el, s) {
      const list = el.querySelector('#museum-list'); list.innerHTML = '';
      const L = G.layerOf(Math.max(0, s.best - 1));
      for (const set of Object.keys(G.SETS)) {
        const info = G.SETS[set];
        const row = document.createElement('div');
        const locked = info.fromLayer > L && !Object.keys(s.fossils).some(k => k.startsWith(set));
        row.className = 'set' + (s.sets[set] ? ' done' : '') + (locked ? ' locked' : '');
        let bones = '';
        for (let i = 0; i < info.pieces; i++) bones += `<span class="bone${s.fossils[`${set}.${i}`] ? ' on' : ''}">${icon('bone', 22)}</span>`;
        row.innerHTML = `<b></b><div class="bones">${bones}</div><span class="d"></span>`;
        row.querySelector('b').textContent = locked ? '???' : t('set_' + set);
        row.querySelector('.d').textContent = locked ? t('set_locked') : s.sets[set] ? t('set_done') : t('set_bonus');
        list.appendChild(row);
      }
    },
  }],
});
