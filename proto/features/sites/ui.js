// Dig feature (page side): the Stars chip, the New Site panel and the card where you choose a site.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { screenFlash } from '../../ui/render.js';
import { sfx } from '../../ui/audio.js';
import { icon, S, badge, star } from '../../ui/icons.js';

const { t } = G;

function openSites(app) {
  const state = app.state;
  if (!G.canNewSite(state) || app.modal.id) return;
  const m = app.modal.open('sites', `<div class="card draft"><h2></h2><p class="more"></p><div class="cards"></div><p class="more"><button class="ghost"></button></p></div>`);
  m.querySelector('h2').textContent = t('site_pick');
  m.querySelector('.more').textContent = t('site_get', { n: G.starsFor(state) });
  const back = m.querySelector('.ghost'); back.textContent = t('site_stay'); back.addEventListener('click', () => app.modal.close());
  const wrap = m.querySelector('.cards');
  Object.keys(G.SITES).filter(id => G.siteOpen(state, id)).forEach((id, i) => {
    const b = document.createElement('button');
    b.className = 'relic-card'; b.style.animationDelay = `${i * 0.08}s`;
    b.innerHTML = `<span class="ic">${icon('site_' + id, 56)}</span><b></b><span class="d"></span>`;
    b.querySelector('b').textContent = t('site_' + id);
    b.querySelector('.d').textContent = t('site_' + id + '_d');
    b.addEventListener('click', () => { app.modal.close(); if (G.newSite(state, id, app.ev)) { app.save(); app.refresh(true); } });
    wrap.appendChild(b);
  });
}

ui({
  id: 'sites',
  icons: {
    site_dunes: badge('#2b6cb0', `<path d="M1 24 Q9 14 16 21 Q23 12 31 22 V31 H1 Z" fill="#e0b467" ${S}/><circle cx="23" cy="9" r="4" fill="#fff3c4"/>`),
    site_boom: badge('#7a2a1f', `<rect x="6" y="12" width="9" height="14" rx="2" fill="#d7332b" ${S}/><rect x="17" y="12" width="9" height="14" rx="2" fill="#d7332b" ${S}/>${star(16, 8, 5, 2.2, 7, '#ffe14a')}`),
    site_gold: badge('#3d2a1a', `<path d="M5 24 L10 14 L16 20 L22 10 L27 24 Z" fill="#ffd23f" ${S}/><path d="M10 14 L16 20 L13 24 L7 24 Z" fill="#fff3a8"/>`),
    site_bones: badge('#4b4460', `<g transform="rotate(-35 16 16)" fill="#f6efdc" ${S}><rect x="7" y="13.5" width="18" height="5" rx="2.5"/><circle cx="7" cy="12.5" r="3.6"/><circle cx="7" cy="19.5" r="3.6"/><circle cx="25" cy="12.5" r="3.6"/><circle cx="25" cy="19.5" r="3.6"/></g>`),
  },
  mount(app) {
    const chip = document.createElement('span');
    chip.id = 'stars'; chip.className = 'stars'; chip.hidden = true;
    chip.innerHTML = `<svg width="20" height="20" viewBox="0 0 32 32"><path d="M16 3 L20 12 L30 13 L22.5 19.5 L25 29 L16 24 L7 29 L9.5 19.5 L2 13 L12 12 Z" fill="#ffd23f" stroke="#7a5a00" stroke-width="2"/></svg><b id="stars-n">0</b>`;
    app.el.top.appendChild(chip);
  },
  tick(s, app) {
    document.getElementById('stars').hidden = s.stars <= 0;
    document.getElementById('stars-n').textContent = s.stars;
    if (G.canNewSite(s) && !s.seen.siteToast) { s.seen.siteToast = true; setTimeout(() => app.toast(t('goal_site'), 'gold'), 4200); }
  },
  on: {
    newSite(d, app) { sfx.star(); screenFlash('#fff', 0.7); app.banner(t('site_done', { n: d.stars }), ''); },
  },
  panels: [{
    id: 'site', elId: 'site', side: 'left', at: 30, title: 'site_title', live: true,
    when: s => s.bossesDown >= 1 || s.stars > 0,
    build(el, app) {
      el.insertAdjacentHTML('beforeend', `<p id="site-now"></p><p class="muted" id="site-d"></p><p id="site-get"></p><p class="muted" id="site-keep"></p><button id="site-btn" class="primary" hidden></button>`);
      el.querySelector('#site-btn').addEventListener('click', () => { app.unlockAudio(); openSites(app); });
    },
    update(el, s) {
      const can = G.canNewSite(s);
      el.classList.toggle('ready', can);
      el.querySelector('#site-d').textContent = can ? t('site_d') : t('site_wait');
      el.querySelector('#site-get').textContent = can ? t('site_get', { n: G.starsFor(s) }) : '';
      el.querySelector('#site-keep').textContent = can ? t('site_keep') : '';
      const b = el.querySelector('#site-btn');
      b.hidden = !can; b.textContent = t('site_btn', { n: G.starsFor(s) });
      el.querySelector('#site-now').textContent = s.sites > 0 ? t('site_now', { name: t('site_' + s.site) }) : '';
    },
  }],
});
