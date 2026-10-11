// Dig feature (page side): the Foreman panel (one big button per job, hotkeys 1 to 5), the arrival
// banner, flags where the Rafeeqs were sent, and tea glasses at their feet during a break.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { AT, fx, centre, ring } from '../../ui/render.js';
import { tone, gap } from '../../ui/audio.js';
import { icon, badge, S } from '../../ui/icons.js';

const { t } = G;
const JOBS = G.foremanJobs;
const KEY = id => String(JOBS.indexOf(id) + 1);
const flag = (x, y, col) => `<path d="M${x} ${y} V${y - 15}" ${S} fill="none"/><path d="M${x} ${y - 15} L${x + 11} ${y - 11} L${x} ${y - 7} Z" fill="${col}" ${S}/>`;

const ICONS = {
  job_follow: badge('#3b82f6', `<path d="M9 8 L9 22 L13 18.5 L16 25 L19 23.5 L16 17.5 L21.5 17 Z" fill="#fff" ${S}/><path d="M22 10 H27 M23 14 H27" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`),
  job_ore: badge('#7c4dff', `<path d="M16 6 L25 13 L16 26 L7 13 Z" fill="#7be0ff" ${S}/><path d="M7 13 H25 M12 13 L16 6 L20 13 L16 26 Z" fill="none" ${S}/>`),
  job_nearest: badge('#b8742a', `<path d="M5 12 H27 M5 18 H27" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M5 24 H27" stroke="#1b1410" stroke-width="2" stroke-dasharray="3 3"/><path d="M12 5 L16 9 L20 5" fill="none" stroke="#ffd23f" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`),
  job_down: badge('#c0392b', `<path d="M12 5 H20 V15 H26 L16 27 L6 15 H12 Z" fill="#ffd23f" ${S}/>`),
  job_tea: badge('#2f8f5b', `<path d="M9 13 H21 L19.5 25 H10.5 Z" fill="#f6d79a" fill-opacity=".85" ${S}/><path d="M9.8 18 H20.2" stroke="#8a4b1c" stroke-width="5.4"/><path d="M13 10 Q11.5 7.5 13.5 5 M18 10 Q16.5 7.5 18.5 5" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`),
};

let sent = 9;               // seconds since the last job order: flags show where they were sent

function glass(g, x, y, steam, t0) {
  g.fillStyle = '#f6d79a'; g.strokeStyle = '#1b1410'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(x - 5, y - 8); g.lineTo(x + 5, y - 8); g.lineTo(x + 4, y + 1); g.lineTo(x - 4, y + 1); g.closePath(); g.fill(); g.stroke();
  if (steam) {
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.6;
    for (const k of [-2, 2]) { g.beginPath(); g.moveTo(x + k, y - 10); g.quadraticCurveTo(x + k + Math.sin(t0 * 4 + k) * 3, y - 15, x + k, y - 19); g.stroke(); }
  }
}

ui({
  id: 'foreman',
  css: new URL('./foreman.css', import.meta.url).href,
  icons: ICONS,
  sfx: {
    job() { if (gap('job', 0.08)) { tone(523, { type: 'triangle', d: 0.12, vol: 0.14 }); tone(784, { type: 'triangle', d: 0.16, vol: 0.14, at: 0.07 }); } },
    arrive() { [392, 523, 659, 784].forEach((f, i) => tone(f, { type: 'triangle', d: 0.22, vol: 0.16, at: i * 0.1 })); },
  },
  draw: [{ at: AT.actors + 5, fn(g, s, dt) {
    if (!s.foremanHere) return;
    sent += dt;
    if (s.crewJob === 'tea' && s.foreTea.ph === 'break') {
      s.diggers.forEach(d => { const [x, y] = centre(d.r, d.c); glass(g, x + 19, y + 18, true, fx.t); });
    }
    if (sent < 2) {
      g.save(); g.globalAlpha = Math.min(1, (2 - sent));
      s.diggers.forEach(d => { if (d.tr >= 0) { const [x, y] = centre(d.tr, d.tc); g.save(); g.translate(x - 12, y + 14); g.lineWidth = 1; g.beginPath(); g.fillStyle = '#ff6a3d'; g.strokeStyle = '#1b1410'; g.moveTo(0, 0); g.lineTo(0, -22); g.lineTo(16, -17); g.lineTo(0, -12); g.stroke(); g.fill(); g.restore(); } });
      g.restore();
    }
  } }],
  on: {
    foremanArrives(d, app) { app.banner(t('t_foreman_title'), t('t_foreman_sub')); try { app.sfx.arrive(); } catch { /* audio not unlocked yet */ } app.dirty('foreman'); },
    job(d, app) { sent = 0; try { app.sfx.job(); } catch { /* audio not unlocked yet */ } app.dirty('foreman'); },
  },
  keys: Object.fromEntries(JOBS.map((id, i) => [String(i + 1), app => { const s = app.state; if (s.foremanHere && G.foremanSet(s, id, app.ev)) app.refresh?.(); }])),
  panels: [{
    id: 'foreman', elId: 'foreman', side: 'left', at: 15, title: 'foreman_title',
    when: s => s.foremanHere,
    build(el, app) {
      el.insertAdjacentHTML('beforeend', '<div class="jobs"></div><p class="muted say"></p>');
      const box = el.querySelector('.jobs');
      for (const id of JOBS) {
        const b = document.createElement('button');
        b.className = 'job'; b.dataset.job = id;
        b.innerHTML = `<span class="key">${KEY(id)}</span>${icon('job_' + id, 44)}<b></b>`;
        b.querySelector('b').textContent = t('job_' + id);
        b.title = t('job_' + id + '_d');
        b.addEventListener('click', () => { G.foremanSet(app.state, id, app.ev); app.dirty('foreman'); });
        box.appendChild(b);
      }
    },
    update(el, s) {
      for (const b of el.querySelectorAll('.job')) b.classList.toggle('on', b.dataset.job === s.crewJob);
      el.querySelector('.say').textContent = t('job_' + s.crewJob + '_d');
    },
  }],
});
