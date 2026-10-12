// Dig feature (page side): the Museum Wing panel (sets as silhouettes that fill in, with hints), the Hall where
// finished sets stand, the finishing ceremony, the Dusty Bundle, Rafeeq hats and goggles, and the sites' feedback.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { CELL, AT, fx, baseBlock, shade, rr, centre, ring, spark, debris, screenFlash } from '../../ui/render.js';
import { gap, tone as rawTone } from '../../ui/audio.js';
import { S, badge, star } from '../../ui/icons.js';
import { setSvg } from './art.js';

const { t } = G;
const tone = (f, o) => { try { rawTone(f, o); } catch { /* audio is not unlocked yet */ } };
let ceremonies = [];      // sets finished, waiting for the card to be free

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

function openCeremony(app, set) {
  const W = G.WING[set];
  const m = app.modal.open('wing', `<div class="card wing-card"><h2></h2>${setSvg(set, () => true, W.col, 'assemble')}<p class="wrew"></p><button class="primary"></button></div>`);
  if (!m) return false;
  m.querySelector('h2').textContent = t('wing_set_title', { set: t('wset_' + set) });
  m.querySelector('.wrew').textContent = t('wr_' + W.reward);
  const b = m.querySelector('button'); b.textContent = t('wing_ok');
  b.addEventListener('click', () => { app.modal.close(); app.save(); app.dirty('wing2'); });
  W.pieces.forEach((_, i) => setTimeout(() => tone(523 * Math.pow(1.122, i * 2), { type: 'triangle', d: 0.25, vol: 0.18 }), 120 + i * 220));
  setTimeout(() => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, { type: 'triangle', d: 0.5, vol: 0.2, at: i * 0.08 })), 200 + W.pieces.length * 220);
  return true;
}

ui({
  id: 'wing2',
  css: new URL('./wing2.css', import.meta.url).href,
  icons: {
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
    lost: { twinkle: true, colour: '#d9a15a', firstSight: { flag: 'lostToast', text: 't_wing_seen', kind: 'gold' }, sprite(g, p, v) {
      baseBlock(g, shade(p.dirt, -0.22), v, 2);
      g.fillStyle = '#b5894f'; g.strokeStyle = '#4d3416'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(32, 14); g.bezierCurveTo(52, 24, 58, 50, 46, 55); g.lineTo(18, 55); g.bezierCurveTo(6, 50, 12, 24, 32, 14); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#8a6334'; rr(g, 24, 11, 16, 7, 3); g.fill(); g.stroke();
      g.fillStyle = '#4d3416'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.fillText('?', 32, 46);
    } },
  },
  draw: [{ at: AT.actors + 5, fn: (g, s) => drawHats(g, s) }],
  on: {
    wingPiece(d, app) {
      app.sfx.wingPiece(d.rare);
      if (d.r !== undefined && d.c !== undefined) { const [x, y] = centre(d.r, d.c); const col = d.isNew ? '#f6efdc' : '#ffd23f'; ring(x, y, CELL * 1.3, col); spark(x, y, col, d.isNew ? 18 : 8); }
      const name = pieceName(d.set, d.i);
      app.toast(d.isNew ? t(d.rare ? 't_wing_rare' : 't_wing_new', { piece: name, a: d.have, b: d.of }) : t('t_wing_dup', { piece: name, n: G.fmt(d.coins) }), d.isNew ? 'fossil' : '');
      app.dirty('wing2');
    },
    wingSet(d, app) {
      app.banner(t('wing_set_title', { set: t('wset_' + d.set) }), t('wr_' + d.reward));
      screenFlash('#f6efdc', 0.35);
      ceremonies.push(d.set);
      app.dirty('wing2');
    },
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
    if (ceremonies.length && !app.modal.id) { if (openCeremony(app, ceremonies[0])) ceremonies.shift(); }
  },
  panels: [{
    id: 'wing2', elId: 'wing2', side: 'left', at: 25, title: 'wing_title',
    when: s => s.wingDeep >= 12 || Object.keys(s.wingGot).length > 0,
    build(el, app) {
      el.insertAdjacentHTML('beforeend', '<div id="wing-hall"></div><div id="wing-list"></div><p class="wjar" id="wing-jar"></p>');
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
      const hall = el.querySelector('#wing-hall');
      const showHall = !!s.wingDone.dhab;
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
        card.querySelector('.wr').textContent = locked ? t('wing_locked', { m: W.from }) : t('wing_reward', { text: t('wr_' + W.reward) });
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
