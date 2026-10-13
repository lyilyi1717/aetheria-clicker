// Dig feature (page side): the Stars chip, the site panel (Gate, stopwatch, medals, the road so far), the finish ceremony
// and the card(s) you pick the next site from.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { AT, H, SKY, yOf, CELL, screenFlash, shake } from '../../ui/render.js';
import { sfx } from '../../ui/audio.js';
import { icon, S, badge, star } from '../../ui/icons.js';

const { t } = G;

// m:ss for a number of seconds
const clock = sec => { const n = Math.max(0, Math.floor(sec)); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); };
const siteName = (site, twist) => t('site_' + site) + (twist ? ', ' + t('twist_' + twist) : '');
const ruleLine = id => (id && G.hasString('c_' + id + '_d') ? t('c_' + id + '_d') : '');

const MEDALS = ['fin', 'fast', 'hard'];
const medalChip = (kind, on) => `<span class="mchip ${kind}${on ? ' on' : ''}" title="${t('medal_' + kind + '_d')}">${icon('medal_' + kind, 18)}<i>${t('medal_' + kind)}</i></span>`;
const medalsHtml = m => MEDALS.map(k => medalChip(k, m && m[k])).join('');

// ---------- the next site: one card on the fixed road, three on the deal ----------
function openNext(app) {
  const s = app.state;
  if (!G.canNewSite(s) || app.modal.id) return;
  const cards = G.dealCards(s), lvl = cards[0].kind === 'fixed' ? cards[0] : null, fixed = !!lvl && cards.length === 1, run = G.siteRun(s);
  const m = app.modal.open('sites', `<div class="card draft nextsite"><h2></h2><p class="more sub"></p><p class="more line"></p><div class="cards"></div><p class="more leave"></p><p class="more"><button class="ghost"></button></p></div>`);
  if (!m) return;
  m.querySelector('h2').textContent = lvl ? t(fixed ? 'next_title_fixed' : 'next_title_stuck', { n: lvl.level, of: lvl.of }) : t('next_title');
  m.querySelector('.sub').textContent = t(fixed ? 'next_sub_fixed' : lvl ? 'next_sub_stuck' : 'next_sub');
  m.querySelector('.line').textContent = G.starshopLineText(s);
  const gain = G.starsFor(s);
  m.querySelector('.leave').textContent = run.done ? (gain > 0 ? t('next_reward', { n: G.fmt(gain) }) : t('next_leave_done')) : t('next_leave', { n: G.fmt(gain) });
  const back = m.querySelector('.ghost'); back.textContent = t('next_stay'); back.addEventListener('click', () => app.modal.close());
  const wrap = m.querySelector('.cards');
  cards.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'relic-card sitecard' + (c.hard ? ' hardcard' : ''); b.style.animationDelay = `${i * 0.08}s`;
    b.innerHTML = `<span class="tag ${c.kind === 'stretch' || c.kind === 'twist' ? 'up' : 'new'}"></span><span class="ic">${icon('site_' + c.site, 56)}</span><b></b><span class="d"></span>`
      + `<span class="d rule"></span><span class="d hr"></span><span class="gate">${icon('gate', 18)}<i></i></span><span class="par">${icon('watch', 18)}<i></i></span>`
      + `<span class="mrow">${medalsHtml(c.medals)}</span><span class="pay"></span>`;
    b.querySelector('.tag').textContent = t('tag_' + c.kind);
    b.querySelector('b').textContent = siteName(c.site, c.twist);
    b.querySelector('.d').textContent = t('site_' + c.site + '_d');
    b.querySelector('.rule').textContent = c.twist ? t('twist_' + c.twist + '_d') : '';
    b.querySelector('.hr').textContent = c.hard ? t('next_hard', { rule: ruleLine(c.hard) }) : '';
    b.querySelector('.gate i').textContent = t('next_gate', { n: c.floor });
    b.querySelector('.par i').textContent = t('next_par', { t: clock(c.par) });
    b.querySelector('.pay').textContent = t(c.medals.fin ? 'next_reward_again' : 'next_reward', { n: c.stars }) + '  ' + t('next_medal_each', { n: c.medalStars });
    b.addEventListener('click', () => { app.modal.close(); if (G.pickCard(s, c, app.ev)) { app.save(); app.refresh(true); } });
    wrap.appendChild(b);
  });
}

// ---------- the finish ceremony ----------
let pending = null;
function showFinish(app, d) {
  const s = app.state;
  const m = app.modal.open('finish', `<div class="card finish"><div class="seal"><span class="sealic"></span><b class="word"></b></div><h2></h2><p class="more gate"></p>`
    + `<p class="time"></p><p class="more fast"></p><p class="found"></p><div class="mrow"></div><p class="earn"></p><div class="btns"><button class="primary gold"></button><button class="ghost"></button></div></div>`);
  if (!m) return false;
  m.querySelector('.sealic').innerHTML = icon('site_' + d.site, 44);
  m.querySelector('.word').textContent = t('fin_stamp');
  m.querySelector('h2').textContent = t('fin_title', { name: siteName(d.site, d.twist) });
  m.querySelector('.gate').textContent = t('fin_gate', { n: d.floor });
  m.querySelector('.time').innerHTML = `${icon('watch', 26)}<b>${clock(d.time)}</b>`;
  const st = s.road.stamps[d.key];
  m.querySelector('.fast').textContent = d.fast ? t('fin_fast', { t: clock(d.par) }) : t('fin_slow', { t: clock(d.par) }) + (st && st.best ? '  ' + t('fin_best', { t: clock(st.best) }) : '');
  m.querySelector('.fast').classList.toggle('yes', !!d.fast);
  const f = d.found, bits = [];
  if (f.chest) bits.push(t('fin_chests', { n: f.chest }));
  if (f.ore) bits.push(t('fin_ore', { n: f.ore }));
  if (f.bone) bits.push(t('fin_bones', { n: f.bone }));
  m.querySelector('.found').textContent = t('fin_found') + ': ' + (bits.length ? bits.join(', ') : t('fin_nothing'));
  m.querySelector('.mrow').innerHTML = medalsHtml(d.medals);
  const earn = m.querySelector('.earn'); earn.textContent = t('fin_stars', { n: 0 });
  const go = m.querySelector('.gold'), stay = m.querySelector('.ghost');
  go.textContent = t('fin_next'); stay.textContent = t('fin_stay');
  stay.addEventListener('click', () => { app.modal.close(); app.dirty('site'); });
  go.addEventListener('click', () => { app.modal.close(); openNext(app); });
  // the Stars count up
  let n = 0;
  const inc = Math.max(1, Math.ceil(d.stars / 8));       // eight ticks at most: a big prize is not a long wait
  const step = () => { n = Math.min(d.stars, n + inc); earn.textContent = t('fin_stars', { n }); if (n < d.stars && m.isConnected) setTimeout(step, 150); };
  setTimeout(step, 700);
  sfx.star(); screenFlash('#fff', 0.6); shake(0.6);
  return true;
}

// ---------- the Gate on the ground ----------
function drawGate(g, s) {
  const r = s.run;
  if (!r || r.done) return;
  const y = yOf(r.floor) + CELL / 2;
  if (y < SKY - CELL || y > H) return;
  g.save();
  g.font = '800 13px system-ui, sans-serif'; g.textBaseline = 'middle';
  const label = t('gate_flag', { n: r.floor }), w = g.measureText(label).width + 40;
  g.fillStyle = 'rgba(20,12,6,.86)'; g.strokeStyle = '#ffd23f'; g.lineWidth = 2;
  g.beginPath(); g.roundRect(8, y - 12, w, 24, 8); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; g.fillText(label, 36, y);
  g.beginPath(); g.moveTo(16, y + 7); g.lineTo(16, y - 7); g.lineTo(21, y - 7); g.lineTo(21, y - 1); g.lineTo(27, y - 1); g.lineTo(27, y + 7); g.closePath(); g.fill();
  g.restore();
}

ui({
  id: 'sites',
  icons: {
    site_dunes: badge('#2b6cb0', `<path d="M1 24 Q9 14 16 21 Q23 12 31 22 V31 H1 Z" fill="#e0b467" ${S}/><circle cx="23" cy="9" r="4" fill="#fff3c4"/>`),
    site_boom: badge('#7a2a1f', `<rect x="6" y="12" width="9" height="14" rx="2" fill="#d7332b" ${S}/><rect x="17" y="12" width="9" height="14" rx="2" fill="#d7332b" ${S}/>${star(16, 8, 5, 2.2, 7, '#ffe14a')}`),
    site_gold: badge('#3d2a1a', `<path d="M5 24 L10 14 L16 20 L22 10 L27 24 Z" fill="#ffd23f" ${S}/><path d="M10 14 L16 20 L13 24 L7 24 Z" fill="#fff3a8"/>`),
    site_bones: badge('#4b4460', `<g transform="rotate(-35 16 16)" fill="#f6efdc" ${S}><rect x="7" y="13.5" width="18" height="5" rx="2.5"/><circle cx="7" cy="12.5" r="3.6"/><circle cx="7" cy="19.5" r="3.6"/><circle cx="25" cy="12.5" r="3.6"/><circle cx="25" cy="19.5" r="3.6"/></g>`),
    medal_fin: `<circle cx="16" cy="16" r="12" fill="#59d37a" ${S}/><path d="M9 16.5 L14 21.5 L23 11" fill="none" stroke="#06310f" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    medal_fast: `<circle cx="16" cy="17" r="11" fill="#7ee8ff" ${S}/><path d="M16 10 V17 L21 20" fill="none" stroke="#06313f" stroke-width="3" stroke-linecap="round"/><rect x="13" y="2.5" width="6" height="4" rx="1.5" fill="#7ee8ff" ${S}/>`,
    medal_hard: `<path d="M16 3 L28 9 V18 Q28 26 16 30 Q4 26 4 18 V9 Z" fill="#e5533d" ${S}/><path d="M10 14 L22 14 M10 19 L22 19" stroke="#3a0a05" stroke-width="3" stroke-linecap="round"/>`,
    watch: `<circle cx="16" cy="18" r="11" fill="#f6ead8" ${S}/><path d="M16 11 V18 L21 21" fill="none" stroke="#1b1410" stroke-width="2.6" stroke-linecap="round"/><rect x="13" y="2.5" width="6" height="4" rx="1.5" fill="#b9a58c" ${S}/>`,
    gate: `<path d="M5 29 V13 Q5 4 16 4 Q27 4 27 13 V29 Z" fill="#6a6384" ${S}/><path d="M11 29 V15 Q11 10 16 10 Q21 10 21 15 V29 Z" fill="#17110d"/>`,
  },
  mount(app) {
    const chip = document.createElement('span');
    chip.id = 'stars'; chip.className = 'stars'; chip.hidden = true;
    chip.innerHTML = `<svg width="20" height="20" viewBox="0 0 32 32"><path d="M16 3 L20 12 L30 13 L22.5 19.5 L25 29 L16 24 L7 29 L9.5 19.5 L2 13 L12 12 Z" fill="#ffd23f" stroke="#7a5a00" stroke-width="2"/></svg><b id="stars-n">0</b>`;
    app.el.top.appendChild(chip);
  },
  tick(s, app) {
    document.getElementById('stars').hidden = s.stars <= 0;
    document.getElementById('stars-n').textContent = G.fmt(s.stars);
    if (pending && !app.modal.id && showFinish(app, pending)) pending = null;
  },
  on: {
    siteFinished(d, app) { pending = d; if (!app.modal.id && showFinish(app, d)) pending = null; app.dirty('site'); },
    siteMedal(d, app) { if (d.medal === 'hard') { sfx.star(); app.toast(t('medal_got', { name: t('medal_hard'), n: d.stars }), 'gold'); } app.dirty('site'); },
    newSite(d, app) { pending = null; sfx.star(); screenFlash('#fff', 0.7); app.banner(t('site_done', { n: G.fmt(d.stars) }), ''); app.dirty('site'); },
  },
  css: new URL('./sites.css', import.meta.url).href,
  draw: [{ at: AT.fog + 2, fn: drawGate }],
  // the goal bar: the Gate while it is shut
  goal: { at: 9, fn(s) {
    const r = s.run;
    if (!r || r.done) return null;
    const b = G.bossInView(s);
    if (b && b.row === r.floor && b.hp > 0) return { text: t('goal_gate', { n: G.fmt(Math.max(1, Math.ceil(b.hp / G.pickPower(s)))) }), frac: b.hp / b.max, cls: 'boss' };
    if (b && b.hp > 0) return null;
    return { text: t('goal_gate_far', { name: t('site_' + r.site), n: r.floor }), frac: Math.min(1, Math.max(0, s.best / r.floor)) };
  } },
  panels: [{
    id: 'site', elId: 'site', side: 'left', at: 5, title: 'site_title', live: true,
    when: () => true,
    build(el, app) {
      el.insertAdjacentHTML('beforeend', `<div class="nowrow"><span class="nic"></span><div><b class="nname"></b><span class="muted nrule"></span></div></div>`
        + `<div class="gaterow"><span class="gtxt"></span><span class="gbar"><i></i></span></div>`
        + `<div class="clockrow">${icon('watch', 22)}<b class="clk">0:00</b><span class="muted par"></span></div>`
        + `<div class="mrow"></div><p class="muted pay"></p><p class="muted hardnote"></p><button class="primary nextbtn" hidden></button><p class="muted wait"></p>`
        + `<h3 class="roadh"></h3><div class="road"></div>`);
      el.querySelector('.nextbtn').addEventListener('click', () => { app.unlockAudio(); openNext(app); });
    },
    update(el, s) {
      const r = G.siteRun(s), st = G.siteStamp(s), can = G.canNewSite(s);
      el.classList.toggle('ready', r.done);
      const sig = r.key;
      if (el._sig !== sig) {
        el._sig = sig;
        el.querySelector('.nic').innerHTML = icon('site_' + r.site, 40);
        el.querySelector('.nname').textContent = siteName(r.site, r.twist);
        el.querySelector('.nrule').textContent = r.twist ? t('twist_' + r.twist + '_d') : t('site_' + r.site + '_d');
      }
      const left = Math.max(0, r.floor - s.best);
      el.querySelector('.gtxt').textContent = r.done ? t('site_gate_open') : left > 0 ? t('site_gate_left', { n: left }) : t('site_gate', { n: r.floor });
      el.querySelector('.gbar i').style.width = (r.done ? 100 : Math.min(100, 100 * s.best / r.floor)) + '%';
      el.querySelector('.clk').textContent = clock(r.done ? r.time : r.clock);
      const par = el.querySelector('.par');
      par.textContent = t('site_par', { t: clock(r.par) }) + (st.best ? '  ' + t('site_best', { t: clock(st.best) }) : '');
      par.classList.toggle('over', !r.done && r.clock > r.par);
      el.querySelector('.clockrow').classList.toggle('good', r.done && r.time <= r.par);
      const msig = `${st.fin}${st.fast}${st.hard}`;
      if (el._msig !== msig) { el._msig = msig; el.querySelector('.mrow').innerHTML = medalsHtml({ fin: st.fin, fast: st.fast, hard: st.hard }); }
      el.querySelector('.pay').textContent = r.done ? t('site_below') : t(st.fin ? 'site_stars_again' : 'site_stars_now', { n: st.fin ? G.replayPay(r.floor) : G.starsAt(r.floor) });
      el.querySelector('.hardnote').textContent = s.contract ? t('site_hard_on', { rule: ruleLine(s.contract) }) : '';
      const b = el.querySelector('.nextbtn'), gain = G.starsFor(s);
      b.hidden = !can; b.classList.toggle('gold', r.done);
      b.textContent = r.done ? t('site_btn_next') : gain > 0 ? t('site_btn_leave', { n: G.fmt(gain) }) : t('site_btn_leave_0');
      el.querySelector('.wait').textContent = can ? '' : t('site_wait');
      // the road so far: stamps in the order they were first dug
      const stamps = G.roadStamps(s), rsig = stamps.map(x => x.key + x.fin + x.fast + x.hard).join(',');
      if (el._rsig !== rsig) {
        el._rsig = rsig;
        const fin = stamps.filter(x => x.fin).length;
        el.querySelector('.roadh').textContent = t('road_title') + (fin ? '  ' + t('road_count', { n: fin }) : '');
        const road = el.querySelector('.road');
        road.textContent = '';
        // grouped by continent, with a small label over each group
        const zoneOf = x => { const f = (G.ROAD || []).find(f => f.site === x.site && f.floor === x.floor); return f ? f.zone : G.roadZone({ run: { floor: x.floor } }); };
        const order = G.ZONES || [];
        const sorted = stamps.map((x, i) => ({ x, i, z: Math.max(0, order.indexOf(zoneOf(x))) })).sort((a, b) => (a.z - b.z) || (a.i - b.i));
        let lastZ = -1;
        for (const { x, z } of sorted) {
          if (z !== lastZ) {
            lastZ = z;
            const lab = document.createElement('span'); lab.className = 'zlab'; lab.textContent = t('look_zone_' + (order[z] || 'arabia'));
            lab.style.cssText = 'flex-basis:100%;width:100%;font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-block:4px 0';
            road.appendChild(lab);
          }
          const d = document.createElement('span');
          d.className = 'stampc' + (x.fin ? ' fin' : ''); d.title = t('road_stamp', { name: siteName(x.site, x.twist), n: x.floor });
          d.innerHTML = `<span class="ic">${icon('site_' + x.site, 30)}</span><i class="fl">${x.floor}</i><span class="pips"><u class="${x.fin ? 'on' : ''}"></u><u class="${x.fast ? 'on' : ''}"></u><u class="${x.hard ? 'on' : ''}"></u></span>`;
          road.appendChild(d);
        }
        if (!stamps.length) road.textContent = t('road_empty');
      }
    },
  }],
});
