// Dig feature (page side): the little men on the canvas, and the words of their two shop items.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, AT, rr, centre, text } from '../../ui/render.js';
import { gap } from '../../ui/audio.js';
import { n1 } from '../../ui/shop.js';
import { S, badge, helmet } from '../../ui/icons.js';

const { t, fmt } = G;
const SHIRTS = ['#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#f97316', '#14b8a6', '#eab308', '#ec4899'];
const nameOf = (d, i) => d.name || t('crew_name', { n: d.id || i + 1 });   // a name can be given later

function drawDigger(g, d, i) {
  const [x, y] = centre(d.r, d.c);
  const bob = Math.sin(fx.t * 9 + i * 2) * 2;
  d.swing = Math.max(0, (d.swing || 0) - 0.12);
  g.save(); g.translate(x, y - 14 + bob);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(0, 20 - bob, 15, 5, 0, 0, 7); g.fill();
  const body = SHIRTS[i % 8];
  rr(g, -12, -6, 24, 24, 9); g.fillStyle = body; g.fill(); g.strokeStyle = '#111'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#f8d9b0'; g.beginPath(); g.arc(0, -10, 10, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, -13, 11, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
  g.fillRect(-13, -14, 26, 3);
  g.fillStyle = '#111'; g.beginPath(); g.arc(-4, -9, 1.6, 0, 7); g.arc(4, -9, 1.6, 0, 7); g.fill();
  g.translate(12, 2); g.rotate(-0.9 + d.swing * 1.6);
  g.strokeStyle = '#7a4a1c'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -20); g.stroke();
  g.strokeStyle = '#cfd8dc'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(-9, -17); g.quadraticCurveTo(0, -25, 9, -17); g.stroke();
  g.restore();
}

ui({
  id: 'diggers',
  icons: {
    up_crew: badge('#2f8f5b', helmet),
    up_crewPow: badge('#2f8f5b', `<path d="M16 6 L25 16 H20 V26 H12 V16 H7 Z" fill="#ffd23f" ${S}/>`),
    karak: badge('#a8672c', `<path d="M8 12 H22 L20 26 H10 Z" fill="#fff" ${S}/><path d="M22 14 Q28 15 22 21" fill="none" ${S}/><path d="M12 9 Q11 6 13 4 M17 9 Q16 6 18 4" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`),
  },
  items: {
    crew: { noLevel: true, desc: (s, lv) => t('up_crew_d', { a: lv }) },
    crewPow: { desc(s) { const a = G.crewPower(s); s.up.crewPow++; const b = G.crewPower(s); s.up.crewPow--; return t('up_crewPow_d', { a: n1(a), b: n1(b) }); } },
  },
  draw: [{ at: AT.actors, fn(g, s) { s.diggers.forEach((d, i) => drawDigger(g, d, i)); } }],
  css: new URL('./diggers.css', import.meta.url).href,
  // the line under the purse: what the Rafeeqs earn, always
  mount() {
    const el = document.createElement('div');
    el.id = 'hud-crew'; el.hidden = true;
    document.getElementById('stage').appendChild(el);
  },
  tick(s) {
    const el = document.getElementById('hud-crew');
    if (!el) return;
    el.hidden = !s.diggers.length;
    if (el.hidden) return;
    const pct = s.allCps > 0 ? Math.min(100, Math.round(100 * s.crewCps / s.allCps)) : 0;
    el.textContent = t('crew_line', { n: fmt(Math.round(s.crewCps || 0)), p: pct });
  },
  panels: [{
    id: 'crew', elId: 'crew', side: 'left', at: 14, title: 'crew_title', live: true,
    when: s => s.diggers.length > 0,
    build(el) { el.insertAdjacentHTML('beforeend', '<div class="crew-rows"></div>'); },
    update(el, s) {
      const box = el.querySelector('.crew-rows');
      while (box.children.length > s.diggers.length) box.lastChild.remove();
      while (box.children.length < s.diggers.length) {
        const row = document.createElement('div');
        row.className = 'crew-row';
        row.innerHTML = '<i></i><b></b><span></span>';
        box.appendChild(row);
      }
      s.diggers.forEach((d, i) => {
        const row = box.children[i];
        row.firstChild.style.background = SHIRTS[i % 8];
        row.children[1].textContent = nameOf(d, i);
        const txt = t('crew_row', { b: fmt(d.broke || 0), c: fmt(Math.round(d.coins || 0)) });
        row.children[2].textContent = d.sv ? t('crew_sieving') + ', ' + txt : txt;
        row.title = row.textContent;
      });
    },
  }],
  on: {
    // a Rafeeq broke something that paid, or sieved: a gold number where it happened
    crewGain(d) {
      if (!gap('crewGain', 0.06)) return;
      const [x, y] = centre(d.r, d.c);
      text(x, y - 18, '+' + fmt(d.coins), '#ffd23f', 15, 0.9);
    },
    buy(d, app) { if (d.id === 'crew') app.toast(t('t_digger')); },
  },
});
