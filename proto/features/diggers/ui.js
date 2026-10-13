// Dig feature (page side): the little men on the canvas, and the words of their two shop items.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, AT, rr, centre, text } from '../../ui/render.js';
import { gap } from '../../ui/audio.js';
import { S, badge, helmet } from '../../ui/icons.js';
import { drawRafeeq, BLUES } from './art.js';

const { t, fmt } = G;
const SHIRTS = BLUES;      // the blue of each Rafeeq (the dot in the crew panel matches)

function drawDigger(g, s, d, i, dt, rock) {
  // at a standing Big Rock he stands on the open ground in the row above it and swings down at it (a drawing rule only)
  const r0 = d.r, tr0 = d.tr, up = rock ? rock.row - 1 : -1;
  if (rock) { if (d.r > up) d.r = up; if (d.tr >= rock.row) d.tr = up; }
  const [x, y] = centre(d.r, d.c);
  const bob = Math.sin(fx.t * 9 + i * 2) * 2;       // the same bob the hats and goggles of other features use
  g.save(); g.translate(x, y - 14 + bob);
  drawRafeeq(g, s, d, i, bob, dt);
  g.restore();
  d.r = r0; d.tr = tr0;
}

ui({
  id: 'diggers',
  icons: {
    up_crew: badge('#2f8f5b', helmet),
    karak: badge('#a8672c', `<path d="M8 12 H22 L20 26 H10 Z" fill="#fff" ${S}/><path d="M22 14 Q28 15 22 21" fill="none" ${S}/><path d="M12 9 Q11 6 13 4 M17 9 Q16 6 18 4" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`),
  },
  items: {
    crew: { noLevel: true, desc: (s, lv) => t('up_crew_d', { a: lv, p: Math.round(100 * G.crewShare(s)) }) },
  },
  draw: [{ at: AT.actors, fn(g, s, dt) { const rock = G.bossInView(s); s.diggers.forEach((d, i) => drawDigger(g, s, d, i, dt, rock)); } }],
  css: new URL('./diggers.css', import.meta.url).href,
  panels: [{
    id: 'crew', elId: 'crew', side: 'left', at: 14, title: 'crew_title', live: true,
    when: s => s.diggers.length > 0,
    build(el) { el.insertAdjacentHTML('beforeend', '<div class="crew-line"></div><div class="crew-share"></div><div class="crew-rows"></div>'); },
    update(el, s, app) {
      const pct = s.allCps > 0 ? Math.min(100, Math.round(100 * s.crewCps / s.allCps)) : 0;
      el.querySelector('.crew-line').textContent = t('crew_line', { n: fmt(Math.round(s.crewCps || 0)), p: pct });
      el.querySelector('.crew-share').textContent = t('crew_share', { p: Math.round(100 * G.crewShare(s)) });
      const box = el.querySelector('.crew-rows');
      while (box.children.length > s.diggers.length) box.lastChild.remove();
      while (box.children.length < s.diggers.length) {
        const row = document.createElement('div');
        row.className = 'crew-row';
        row.innerHTML = '<i></i><b></b><span></span>';
        row.addEventListener('click', () => app.fire('rafeeqCard', { i: [...box.children].indexOf(row) }));
        box.appendChild(row);
      }
      s.diggers.forEach((d, i) => {
        const row = box.children[i];
        row.firstChild.style.background = SHIRTS[i % 8];
        row.children[1].textContent = G.rafeeqName(s, i);
        row.classList.toggle('rq-lead', !!(s.run && s.run.done) && G.rafeeqBest(s) === i);
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
