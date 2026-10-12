// Dig feature (page side): the Museum panel (what your sets do, the Hall, sets as silhouettes that fill in, with hints),
// the finishing ceremony that ends by pointing at the thing the set opened, the camel at the top of the site, the
// Lamp's wish card, the Dusty Bundle and the pearl, Rafeeq hats and goggles, and the sites' feedback.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { CELL, AT, W as SCREEN_W, SKY, fx, baseBlock, shade, rr, centre, ring, spark, debris, screenFlash } from '../../ui/render.js';
import { gap, tone as rawTone } from '../../ui/audio.js';
import { S, badge, star, icon, pickShape } from '../../ui/icons.js';
import { setSvg } from './art.js';

const { t } = G;
const tone = (f, o) => { try { rawTone(f, o); } catch { /* audio is not unlocked yet */ } };
let ceremonies = [];      // sets finished (with what they opened), waiting for the card to be free
const cam = { enter: -1, hop: 0 };      // the camel: enter 0..1 is a walk in from the right; -1 = already standing

// the little picture of what each set opens (the rewards that are sites and relics reuse their own icons)
const REW_ICON = { camel: 'wr_camel', whalepearl: 'wr_pearl', wish: 'wr_lamp', lizard: 'wr_lizard', dinar: 'dinar', hats: 'wr_hats', goggles: 'wr_goggles',
  jar: 'wr_jar', sharks: 'site_sharks', pearl: 'pearl', derrick: 'derrick', mirage: 'site_mirage', parade: 'wr_parade' };
const rewardText = k => t('wr_' + k, { n: G.PARAMS.wing2.camelEvery });
const rewardIcon = (k, n = 26) => icon(REW_ICON[k] || 'coin', n);
const pending = set => ceremonies.some(c => c.set === set);

function drawCamel(g, s, dt) {
  if (!s.wingDone.camel || pending('camel')) return;
  if (cam.enter >= 0 && cam.enter < 1) cam.enter = Math.min(1, cam.enter + dt * 0.45);
  cam.hop = Math.max(0, cam.hop - dt * 1.8);
  const e = cam.enter < 0 ? 1 : cam.enter, walking = e < 1;
  const x = SCREEN_W - 96 + (1 - e) * 220, y = SKY - 6 - Math.sin(cam.hop * Math.PI) * 20;
  const step = walking ? Math.sin(fx.t * 12) * 4 : 0;
  g.save(); g.translate(x, y); g.scale(-1, 1); g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = '#8a6a34'; g.lineWidth = 5;
  for (const [lx, ph] of [[-20, 0], [-11, 1], [11, 0], [20, 1]]) { g.beginPath(); g.moveTo(lx, -20); g.lineTo(lx + (ph ? step : -step), 0); g.stroke(); }
  g.strokeStyle = '#1b1410'; g.lineWidth = 2; g.fillStyle = '#e1bd78';
  g.beginPath(); g.ellipse(0, -28, 28, 12, 0, 0, 7); g.fill(); g.stroke();                                  // body
  g.beginPath(); g.arc(-8, -38, 8, Math.PI, 0); g.arc(8, -38, 7, Math.PI, 0); g.fill(); g.stroke();       // two humps
  g.beginPath(); g.moveTo(22, -32); g.quadraticCurveTo(34, -40, 34, -54); g.lineTo(40, -54); g.lineTo(40, -48); g.quadraticCurveTo(38, -34, 28, -22); g.closePath(); g.fill(); g.stroke();   // neck
  g.beginPath(); g.ellipse(40, -56, 8, 5, -0.15, 0, 7); g.fill(); g.stroke();                              // head
  g.fillStyle = '#1b1410'; g.beginPath(); g.arc(38, -58, 1.3, 0, 7); g.fill();
  g.strokeStyle = '#8a6a34'; g.lineWidth = 3; g.beginPath(); g.moveTo(-27, -30); g.quadraticCurveTo(-34, -24, -31, -14); g.stroke();   // tail
  const frac = Math.min(1, s.wingLoad / G.PARAMS.wing2.camelEvery);
  for (const bx of [-10, 3]) {                                                                              // two bags: they fill up with every block
    g.fillStyle = '#6b4a2c'; g.strokeStyle = '#1b1410'; g.lineWidth = 1.6; rr(g, bx, -26, 11, 16, 3); g.fill(); g.stroke();
    g.fillStyle = '#ffd23f'; const h = 12 * frac; g.fillRect(bx + 1.5, -12 - h, 8, h);
  }
  g.restore();
}

const pieceName = (set, i) => t(`wp_${set}_${i}`);
function hintFor(set, i) {
  const W = G.WING[set], how = W.pieces[i].how;
  if (how.startsWith('rock:')) return t('whint_rock', { n: how.slice(5) });
  if (how.startsWith('ore:')) return t('whint_ore_' + how.slice(4));
  if (how.startsWith('site:')) return t('whint_site_' + how.slice(5));
  return t('whint_' + how, { m: W.from });
}

function hatDraw(g, kind, i) {
  const k = kind % 5;
  g.lineWidth = 1.6; g.strokeStyle = '#1b1410';
  if (k === 0) {                      // fez
    g.fillStyle = '#c0392b'; g.beginPath(); g.moveTo(-8, -23); g.lineTo(-6, -35); g.lineTo(6, -35); g.lineTo(8, -23); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = '#ffd23f'; g.beginPath(); g.moveTo(5, -35); g.lineTo(11, -28); g.stroke();
  } else if (k === 1) {               // party cone
    g.fillStyle = '#a855f7'; g.beginPath(); g.moveTo(-8, -23); g.lineTo(8, -23); g.lineTo(0, -44); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, -44, 2.5, 0, 7); g.fill();
  } else if (k === 2) {               // top hat
    g.fillStyle = '#222'; g.fillRect(-6, -40, 12, 17); g.strokeRect(-6, -40, 12, 17);
    g.fillRect(-11, -26, 22, 4); g.strokeRect(-11, -26, 22, 4);
    g.fillStyle = '#ffd23f'; g.fillRect(-6, -31, 12, 3);
  } else if (k === 3) {               // propeller beanie
    g.fillStyle = '#3b82f6'; g.beginPath(); g.arc(0, -23, 8, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
    g.save(); g.translate(0, -32); g.rotate(fx.t * 14 + i);
    g.fillStyle = '#ef4444'; g.fillRect(-9, -1.5, 18, 3); g.restore();
  } else {                            // crown
    g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(-8, -23); g.lineTo(-9, -34); g.lineTo(-4, -29); g.lineTo(0, -36); g.lineTo(4, -29); g.lineTo(9, -34); g.lineTo(8, -23); g.closePath(); g.fill(); g.stroke();
  }
}
function drawHats(g, s) {
  const hats = !!s.wingDone.teapot, goggles = !!s.wingDone.pilot;
  if (!hats && !goggles) return;
  s.diggers.forEach((d, i) => {
    const [x, y] = centre(d.r, d.c);
    const bob = Math.sin(fx.t * 9 + i * 2) * 2;
    g.save(); g.translate(x, y - 14 + bob);
    if (hats) hatDraw(g, i, i);
    if (goggles) {
      g.strokeStyle = '#d9a15a'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-10, -11); g.lineTo(10, -11); g.stroke();
      g.fillStyle = 'rgba(150,220,255,.8)'; g.strokeStyle = '#6b4a1c';
      for (const sx of [-4.5, 4.5]) { g.beginPath(); g.arc(sx, -9, 3.6, 0, 7); g.fill(); g.stroke(); }
    }
    g.restore();
  });
}

// the ceremony ends by pointing at the thing the set opened
function showReward(app, d) {
  if (d.reward === 'camel') { cam.enter = 0; cam.hop = 1; }
  if (d.r !== undefined && d.c !== undefined) {
    [0, 1, 2, 3].forEach(n => setTimeout(() => { const [x, y] = centre(d.r, d.c); ring(x, y, CELL * (1.6 - n * 0.2), '#fff6c8'); spark(x, y, '#fff6c8', 10); tone(880 + n * 110, { type: 'sine', d: 0.2, vol: 0.14 }); }, 150 + n * 380));
  }
  app.toast(rewardText(d.reward), 'gold');
}
function openCeremony(app, c) {
  const set = c.set, W = G.WING[set];
  const m = app.modal.open('wing', `<div class="card wing-card"><h2></h2>${setSvg(set, () => true, W.col, 'assemble')}<p class="wrew"><span class="wico">${rewardIcon(W.reward, 34)}</span><span class="wtx"></span></p><button class="primary"></button></div>`);
  if (!m) return false;
  m.querySelector('h2').textContent = t('wing_set_title', { set: t('wset_' + set) });
  m.querySelector('.wtx').textContent = rewardText(W.reward);
  const b = m.querySelector('button'); b.textContent = t('wing_show');
  b.addEventListener('click', () => { app.modal.close(); ceremonies = ceremonies.filter(x => x !== c); showReward(app, c); app.save(); app.dirty('wing2'); });
  W.pieces.forEach((_, i) => setTimeout(() => tone(523 * Math.pow(1.122, i * 2), { type: 'triangle', d: 0.25, vol: 0.18 }), 120 + i * 220));
  setTimeout(() => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, { type: 'triangle', d: 0.5, vol: 0.2, at: i * 0.08 })), 200 + W.pieces.length * 220);
  return true;
}

const WISH_ICON = { coins: 'coin', chest: 'chest', strong: 'wish_strong', crew: 'wish_crew', wind: 'wish_wind' };
function openWish(app) {
  const s = app.state;
  const m = app.modal.open('wish', `<div class="card wish-card"><h2></h2><p class="wsub"></p><div class="wishes"></div></div>`);
  if (!m) return false;
  m.querySelector('h2').textContent = t('wish_title');
  m.querySelector('.wsub').textContent = t('wish_sub');
  const box = m.querySelector('.wishes');
  for (const k of s.wingWish.opts) {
    const b = document.createElement('button'); b.className = 'wishbtn';
    b.innerHTML = `${icon(WISH_ICON[k], 44)}<b></b><span></span>`;
    b.querySelector('b').textContent = t('wish_' + k); b.querySelector('span').textContent = t('wish_' + k + '_d');
    b.addEventListener('click', () => { G.wingWishPick(s, k, app.ev); app.modal.close(); app.save(); app.dirty('wing2'); });
    box.appendChild(b);
  }
  [523, 659, 880].forEach((f, i) => setTimeout(() => tone(f, { type: 'sine', d: 0.4, vol: 0.16 }), i * 120));
  return true;
}

ui({
  id: 'wing2',
  css: new URL('./wing2.css', import.meta.url).href,
  icons: {
    wr_camel: badge('#7a5a2c', `<ellipse cx="15" cy="19" rx="9" ry="5" fill="#e1bd78" ${S}/><path d="M10 15 Q12 8 15 14 Q18 8 20 15" fill="#e1bd78" ${S}/><path d="M22 18 Q26 14 25 8 L28 8 L28 12 Q28 16 24 22" fill="#e1bd78" ${S}/><path d="M9 22 V28 M13 23 V28 M18 23 V28 M22 22 V28" ${S}/>`),
    wr_pearl: badge('#2f4a6b', `<circle cx="16" cy="16" r="9" fill="#f6f1ff" ${S}/><circle cx="13" cy="13" r="2.6" fill="#fff"/><path d="M5 6 l1 2 2 1 -2 1 -1 2 -1 -2 -2 -1 2 -1 Z" fill="#fff6c8"/>`),
    wr_lamp: badge('#5a3b8a', `<path d="M7 20 Q8 27 16 27 Q24 27 25 20 Z" fill="#ffd23f" ${S}/><path d="M25 21 Q30 20 29 15" fill="none" ${S}/><path d="M7 20 L3 17" ${S}/><path d="M16 17 Q10 12 16 7 Q22 12 16 17" fill="#c9b6ff" ${S}/>`),
    wr_lizard: badge('#4a6b2f', `<path d="M5 22 Q10 12 18 15 Q24 17 27 9 Q27 20 18 22 Q12 24 5 22 Z" fill="#b8d98a" ${S}/><circle cx="21" cy="14" r="1.2" fill="#1b1410"/>`),
    wr_hats: badge('#7a2b2b', `<path d="M8 24 L10 10 L22 10 L24 24 Z" fill="#d7332b" ${S}/><path d="M22 10 L27 16" stroke="#ffd23f" stroke-width="2.4"/>`),
    wr_goggles: badge('#6b4a1c', `<circle cx="10" cy="16" r="6" fill="#bfe9ff" ${S}/><circle cx="22" cy="16" r="6" fill="#bfe9ff" ${S}/>`),
    wr_jar: badge('#3b6e8a', `<path d="M10 8 H22 V12 Q26 14 26 20 Q26 27 16 27 Q6 27 6 20 Q6 14 10 12 Z" fill="#e8f4ff" ${S}/><path d="M12 19 L20 17 M13 23 L19 22" stroke="#6b5a3a" stroke-width="2.4"/>`),
    wr_parade: badge('#8a4b9a', `${star(16, 16, 10, 4.5, 5, '#ffe14a')}`),
    wish_strong: badge('#7a3b1c', pickShape()),
    wish_crew: badge('#2f6b5a', `<path d="M7 12 H21 L19 25 H9 Z" fill="#f6efdc" ${S}/><path d="M21 14 Q27 14 26 19 Q25 22 20 21" fill="none" ${S}/><path d="M11 4 Q9 7 11 9 M16 4 Q14 7 16 9" fill="none" stroke="#fff" stroke-width="1.6"/>`),
    wish_wind: badge('#8a6b2f', `<path d="M5 12 H20 Q25 12 25 8 M5 18 H24 Q29 18 28 23 M5 24 H15" fill="none" ${S}/>`),
    dinar: badge('#6b4a1c', `<circle cx="16" cy="17" r="10" fill="#ffd23f" ${S}/><circle cx="16" cy="17" r="5" fill="none" ${S}/><path d="M24 4 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2 Z" fill="#fff6c8"/>`),
    pearl: badge('#3b2f6b', `<path d="M3 16 Q16 4 29 16 Q16 28 3 16 Z" fill="#f1e6ff" ${S}/><circle cx="16" cy="16" r="5.5" fill="#fff" ${S}/><circle cx="14.5" cy="14.5" r="1.6" fill="#c8d4ff"/>`),
    derrick: badge('#3d3a35', `<path d="M16 4 L24 27 H8 Z" fill="none" ${S}/><path d="M11 18 H21 M13 12 H19" ${S}/><path d="M16 27 V31" stroke="#ffd23f" stroke-width="3"/>`),
    site_sharks: badge('#1f5f7a', `<path d="M1 24 Q9 17 16 22 Q23 15 31 23 V31 H1 Z" fill="#e0b467" ${S}/><path d="M12 22 L18 8 L22 22 Z" fill="#cfe3f2" ${S}/>`),
    site_mirage: badge('#7a3b6b', `<path d="M1 24 Q9 14 16 21 Q23 12 31 22 V31 H1 Z" fill="#e0b467" ${S}/><path d="M4 8 H28" stroke="#fff3c4" stroke-width="1.6" stroke-dasharray="3 2"/>${star(16, 15, 5, 2.2, 5, '#ffe14a')}`),
  },
  sfx: {
    wingPiece(rare) {
      if (!gap('wingPiece', 0.2)) return;
      [660, 880, rare ? 1320 : 990].forEach((f, i) => tone(f, { type: 'sine', d: 0.25, vol: 0.2, at: i * 0.08 }));
    },
    wingHop() { tone(330, { type: 'square', d: 0.1, vol: 0.07, slide: 500 }); tone(660, { type: 'triangle', d: 0.2, vol: 0.1, at: 0.08 }); },
  },
  art: {
    whalepearl: { twinkle: true, rich: true, colour: '#f1e6ff', firstSight: { flag: 'pearlToast', text: 't_pearl_seen', kind: 'gold' }, sprite(g, p, v) {
      baseBlock(g, shade(p.dirt, -0.22), v, 2);
      g.fillStyle = '#cfe3f2'; g.strokeStyle = '#4a5f73'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(10, 44); g.quadraticCurveTo(32, 62, 54, 44); g.quadraticCurveTo(32, 54, 10, 44); g.fill(); g.stroke();
      const gr = g.createRadialGradient(26, 24, 3, 32, 30, 20); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#d9cdf5');
      g.fillStyle = gr; g.beginPath(); g.arc(32, 30, 17, 0, 7); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(25, 23, 4, 0, 7); g.fill();
    } },
    lost: { twinkle: true, colour: '#d9a15a', firstSight: { flag: 'lostToast', text: 't_wing_seen', kind: 'gold' }, sprite(g, p, v) {
      baseBlock(g, shade(p.dirt, -0.22), v, 2);
      g.fillStyle = '#b5894f'; g.strokeStyle = '#4d3416'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(32, 14); g.bezierCurveTo(52, 24, 58, 50, 46, 55); g.lineTo(18, 55); g.bezierCurveTo(6, 50, 12, 24, 32, 14); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#8a6334'; rr(g, 24, 11, 16, 7, 3); g.fill(); g.stroke();
      g.fillStyle = '#4d3416'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.fillText('?', 32, 46);
    } },
  },
  draw: [{ at: AT.actors + 5, fn: (g, s) => drawHats(g, s) }, { at: AT.screen + 5, fn: drawCamel }],
  status: { at: 30, fn: s => (s.wingBoon.left > 0 ? { text: t('boon_' + s.wingBoon.kind, { n: s.wingBoon.left }), k: s.wingBoon.left / G.PARAMS.wing2.wishBlocks } : null) },
  on: {
    wingPiece(d, app) {
      app.sfx.wingPiece(d.rare);
      if (d.r !== undefined && d.c !== undefined) { const [x, y] = centre(d.r, d.c); const col = d.isNew ? '#f6efdc' : '#ffd23f'; ring(x, y, CELL * 1.3, col); spark(x, y, col, d.isNew ? 18 : 8); }
      const name = pieceName(d.set, d.i);
      app.toast(d.isNew ? t(d.rare ? 't_wing_rare' : 't_wing_new', { piece: name, a: d.have, b: d.of }) : t('t_wing_dup', { piece: name, n: G.fmt(d.coins) }), d.isNew ? 'fossil' : '');
      app.dirty('wing2');
    },
    wingSet(d, app) {
      app.banner(t('wing_set_title', { set: t('wset_' + d.set) }), rewardText(d.reward));
      screenFlash('#f6efdc', 0.35);
      app.dirty('wing2');
    },
    wingShow(d) { ceremonies.push(d); },
    wingCamel(d, app) {
      cam.hop = 1;
      [660, 880, 1100].forEach((f, i) => tone(f, { type: 'triangle', d: 0.25, vol: 0.16, at: i * 0.08 }));
      ring(SCREEN_W - 96, SKY - 30, 46, '#ffd23f'); spark(SCREEN_W - 96, SKY - 30, '#ffd23f', 14);
      if (!d.first) app.toast(t('t_camel'), 'gold');
    },
    wingWish(d, app) { app.dirty('wing2'); },
    wingWishTaken(d, app) { screenFlash('#c9b6ff', 0.3); app.dirty('wing2'); },
    wingBoonEnd(d, app) { app.toast(t('t_wish_end'), ''); },
    wingBubble(d) { const [x, y] = centre(d.r, d.c); ring(x, y, CELL * 1.3, '#f1e6ff'); spark(x, y, '#f1e6ff', 16); },
    wingJar(d, app) { if (d.full) app.toast(t('t_wing_jar'), 'gold'); app.dirty('wing2'); },
    wingSlide(d) { const [x, y] = centre(d.r, d.c); debris(d.r, d.c, '#dba65a', 6, 0.6); ring(x, y - CELL * 0.5, CELL * 0.6, '#dba65a'); },
    wingMirror(d) { const [x, y] = centre(d.r, d.to); ring(x, y, CELL * 0.8, '#ff9be6'); spark(x, y, '#ff9be6', 6); },
    wingSeed(d) { const [x, y] = centre(d.r, d.c); ring(x, y, CELL * 0.9, '#ffd23f'); spark(x, y, '#ffd23f', 10); },
    wingPulse(d) { for (let k = 1; k <= d.n; k++) { const [x, y] = centre(d.r + k, d.c); setTimeout(() => ring(x, y, CELL * 0.8, '#ffb347'), 70 * k); } },
    bossDown(d, app) {
      const s = app.state;
      if (!s.wingDone.teapot || !s.diggers.length) return;
      app.toast(t('t_wing_chai'), 'gold');
      for (const g of s.diggers) { const [x, y] = centre(g.r, g.c); spark(x, y - 30, '#ffffff', 8); ring(x, y - 20, CELL * 0.5, '#ffffff'); g.swing = 1; }
    },
    newSite(d, app) { app.dirty('wing2'); },
  },
  tick(s, app) {
    if (app.modal.id) return;
    if (ceremonies.length) openCeremony(app, ceremonies[0]);
    else if (s.wingWish.st === 1) openWish(app);
  },
  start(app) {
    if (app.state.wingNote) { app.toast(t('wing_note'), 'gold'); G.wingNoteSeen(app.state); app.save(); }
  },
  panels: [{
    id: 'wing2', elId: 'wing2', side: 'left', at: 25, title: 'wing_title',
    when: s => s.wingDeep >= 12 || Object.keys(s.wingGot).length > 0,
    build(el, app) {
      el.insertAdjacentHTML('beforeend', '<div id="wing-does"></div><div id="wing-hall"></div><div id="wing-list"></div><p class="wjar" id="wing-jar"></p>');
      app.flags.wingOpen = app.flags.wingOpen || {};
      el.querySelector('#wing-list').addEventListener('click', e => {
        const card = e.target.closest('.wset');
        if (!card || card.classList.contains('locked')) return;
        app.flags.wingOpen[card.dataset.set] = !app.flags.wingOpen[card.dataset.set];
        app.dirty('wing2');
      });
    },
    update(el, s, app) {
      const keys = Object.keys(G.WING).sort((a, b) => G.WING[a].at - G.WING[b].at);
      const doneKeys = keys.filter(k => s.wingDone[k]);
      const does = el.querySelector('#wing-does');
      does.hidden = !doneKeys.length; does.className = doneKeys.length ? 'wdoes' : '';
      does.innerHTML = '';
      if (doneKeys.length) {
        const h = document.createElement('h3'); h.textContent = t('wing_does'); does.appendChild(h);
        const ul = document.createElement('ul');
        for (const k of doneKeys) {
          const li = document.createElement('li');
          li.innerHTML = `${rewardIcon(G.WING[k].reward, 26)}<span><b></b> <i></i></span>`;
          li.querySelector('b').textContent = t('wset_' + k);
          li.querySelector('i').textContent = rewardText(G.WING[k].reward);
          ul.appendChild(li);
        }
        does.appendChild(ul);
        if (s.wingDone.djinn) { const w = document.createElement('p'); w.className = 'hint'; w.textContent = s.wingWish.st === 2 ? t('wish_used') : t('wish_wait'); does.appendChild(w); }
      }
      const hall = el.querySelector('#wing-hall');
      const showHall = doneKeys.length > 0;
      hall.hidden = !showHall; hall.className = showHall ? 'whall' : '';
      if (showHall) {
        const done = keys.filter(k => s.wingDone[k]);
        hall.innerHTML = `<h3><span></span>${s.wingDone.beast ? '<button class="parade"></button>' : ''}</h3><div class="hshelf"></div><p class="hint"></p>`;
        hall.querySelector('span').textContent = t('wing_hall');
        hall.querySelector('.hint').textContent = t('wing_hall_hint');
        const shelf = hall.querySelector('.hshelf');
        done.forEach((k, n) => {
          const b = document.createElement('button');
          b.className = 'hitem ' + G.WING[k].kind; b.style.setProperty('--k', n); b.title = t('wset_' + k);
          b.innerHTML = setSvg(k, () => true, G.WING[k].col);
          b.addEventListener('click', () => { app.sfx.wingHop(); b.classList.remove('hop'); void b.offsetWidth; b.classList.add('hop'); });
          shelf.appendChild(b);
        });
        const pb = hall.querySelector('.parade');
        if (pb) {
          pb.textContent = t('wing_parade');
          pb.addEventListener('click', () => {
            hall.classList.remove('march'); void hall.offsetWidth; hall.classList.add('march');
            done.forEach((k, n) => setTimeout(() => app.sfx.wingHop(), 300 + n * 550));
            setTimeout(() => hall.classList.remove('march'), 7500);
          });
        }
      }
      const list = el.querySelector('#wing-list'); list.innerHTML = '';
      for (const k of keys) {
        const W = G.WING[k], n = G.wingCount(s, k), total = W.pieces.length;
        const finished = !!s.wingDone[k];
        const locked = !n && W.from > s.wingDeep + 12;
        const card = document.createElement('div');
        card.className = 'wset' + (finished ? ' done' : '') + (locked ? ' locked' : '');
        card.dataset.set = k;
        card.innerHTML = `<div class="wh"><b></b><span class="wn"></span></div>${setSvg(k, i => G.wingHave(s, k, i), locked ? '#2a1f15' : W.col)}<div class="wr"></div><ul></ul>`;
        card.querySelector('b').textContent = locked ? '???' : t('wset_' + k);
        card.querySelector('.wn').textContent = locked ? '' : finished ? t('wing_done') : t('wing_count', { a: n, b: total });
        const wr = card.querySelector('.wr');
        if (locked) wr.textContent = t('wing_locked', { m: W.from });
        else { wr.innerHTML = `${rewardIcon(W.reward, 22)}<span></span>`; wr.querySelector('span').textContent = t('wing_reward', { text: rewardText(W.reward) }); }
        const ul = card.querySelector('ul');
        if (!locked && !finished) {
          const open = !!app.flags.wingOpen[k];
          const miss = G.wingMissing(s, k);
          const shown = open ? W.pieces.map((_, i) => i) : miss.slice(0, 2);
          for (const i of shown) {
            const have = G.wingHave(s, k, i);
            const li = document.createElement('li'); if (have) li.className = 'got';
            li.innerHTML = '<b></b> <span></span>';
            li.querySelector('b').textContent = pieceName(k, i) + (have ? ' (' + t('wing_done') + ')' : '');
            li.querySelector('span').textContent = have ? '' : hintFor(k, i);
            if (W.pieces[i].rare && !have) { const r = document.createElement('i'); r.className = 'rare'; r.textContent = t('wing_rare'); li.querySelector('b').appendChild(r); }
            ul.appendChild(li);
          }
        }
        list.appendChild(card);
      }
      const jar = el.querySelector('#wing-jar');
      jar.hidden = !s.wingDone.scarab;
      jar.textContent = t('wing_jar', { a: s.wingJar, b: G.PARAMS.wing2.jar });
    },
  }],
});
