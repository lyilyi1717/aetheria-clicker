// Dig feature (page side): the twelve paired relics. Their icons, what each one looks and sounds
// like when it acts, the fire on the ground, the glow of a charged Twin Stone, and the small
// "goes with" mark on a chest card whose partner you hold.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, AT, CELL, centre, yOf, ring, spark, debris, shake, flash, onFx, blockColour, rr } from '../../ui/render.js';
import { gap, tone, noise } from '../../ui/audio.js';
import { S, badge, star, gem, pickShape, helmet, icon } from '../../ui/icons.js';

const { t } = G;
const P = G.PARAMS.relics2;

// ---------- short-lived drawings of our own (bolts, flying rocks, the boomerang) ----------

const FX = [];
const add = e => { if (FX.length > 80) FX.shift(); e.t = 0; FX.push(e); };
onFx(dt => { for (const e of FX) e.t += dt; for (let i = FX.length - 1; i >= 0; i--) if (FX[i].t >= FX[i].dur) FX.splice(i, 1); });

function bolt(g, e) {
  const [x1, y1] = centre(e.fr, e.fc), [x2, y2] = centre(e.r, e.c), k = 1 - e.t / e.dur;
  g.save();
  g.globalAlpha = k; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [w, col] of [[7, e.col], [2.5, '#fff']]) {
    g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1);
    for (let i = 1; i < 4; i++) { const u = i / 4, j = (((e.seed * (i + 3)) % 17) - 8) * 1.6; g.lineTo(x1 + (x2 - x1) * u - (y2 - y1) / 40 * j, y1 + (y2 - y1) * u + (x2 - x1) / 40 * j); }
    g.lineTo(x2, y2); g.stroke();
  }
  g.restore();
}
function rock(g, e) {
  const [x1, y1] = centre(e.fr, e.fc), [x2, y2] = centre(e.r, e.c), u = e.t / e.dur;
  const x = x1 + (x2 - x1) * u, y = y1 + (y2 - y1) * u - Math.sin(u * Math.PI) * (CELL * 1.1 + Math.abs(x2 - x1) * 0.25);
  g.save(); g.translate(x, y); g.rotate(u * 9);
  rr(g, -11, -11, 22, 22, 6); g.fillStyle = e.col; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 2.5; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-7, -8, 9, 4);
  g.restore();
}
function rang(g, e) {
  const u = e.t / e.dur, far = e.c + e.dir * e.n;
  const col = u < 0.5 ? e.c + (far - e.c) * (u * 2) : far + (e.c - far) * ((u - 0.5) * 2);
  const [x, y] = centre(u < 0.5 ? e.r : e.back, col);
  g.save(); g.translate(x, y); g.rotate(e.t * 38);
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [w, c] of [[11, '#111'], [6, '#dfe7ee']]) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(-17, 10); g.lineTo(0, -10); g.lineTo(17, 10); g.stroke(); }
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - e.dir * (u < 0.5 ? 34 : -34), y); g.lineTo(x, y); g.stroke();
}
const KINDS = { bolt, rock, rang };

function drawFire(g, s) {
  for (let i = 0; i < s.rows.length; i++) {
    const y = yOf(s.top + i);
    if (y > CELL * 12 || y < -CELL) continue;
    for (let c = 0; c < G.COLS; c++) {
      const o = s.rows[i][c];
      if (!o) continue;
      const x = c * CELL;
      if (o.ch) { g.fillStyle = 'rgba(20,12,8,0.42)'; rr(g, x + 1, y + 1, CELL - 2, CELL - 2, 9); g.fill(); }
      if (!(o.f > 0)) continue;
      g.fillStyle = 'rgba(255,120,20,0.28)'; rr(g, x + 1, y + 1, CELL - 2, CELL - 2, 9); g.fill();
      for (let k = 0; k < 4; k++) {
        const px = x + 10 + k * 14.5, h = 18 + Math.sin(fx.t * 13 + k * 2.1 + o.s) * 9 + (k % 2) * 6, w = 8;
        g.fillStyle = '#ff7a1a'; g.beginPath(); g.moveTo(px - w, y + CELL - 6); g.quadraticCurveTo(px - w * 0.3, y + CELL - 6 - h * 0.6, px + Math.sin(fx.t * 9 + k) * 3, y + CELL - 6 - h); g.quadraticCurveTo(px + w * 0.6, y + CELL - 6 - h * 0.5, px + w, y + CELL - 6); g.closePath(); g.fill();
        g.fillStyle = '#ffe14a'; g.beginPath(); g.moveTo(px - w * 0.5, y + CELL - 6); g.quadraticCurveTo(px, y + CELL - 6 - h * 0.6, px + w * 0.5, y + CELL - 6); g.closePath(); g.fill();
      }
      if (Math.random() < 0.06) spark(x + 10 + Math.random() * 44, y + 20, '#ffb347', 1);
    }
  }
}

// the Twin Stone: dots by the pick fill up; when it is charged the target shines gold
function drawTwin(g, s) {
  if (!G.rel(s, 'twin') || !fx.mouse.inside) return;
  const n = Math.min(s.relics2.n, P.twinEvery), ready = G.relics2TwinReady(s);
  const x0 = fx.mouse.x - 30, y0 = fx.mouse.y + 26;
  for (let i = 0; i < P.twinEvery; i++) {
    g.beginPath(); g.arc(x0 + i * 9, y0, 3.2, 0, 7);
    g.fillStyle = i < n ? '#ffd23f' : 'rgba(0,0,0,0.45)'; g.fill();
    g.strokeStyle = '#111'; g.lineWidth = 1.2; g.stroke();
  }
  if (ready && fx.target) {
    const [x, y] = centre(fx.target[0], fx.target[1]), k = Math.sin(fx.t * 8) * 0.5 + 0.5;
    g.strokeStyle = `rgba(255,210,63,${0.5 + k * 0.5})`; g.lineWidth = 3 + k * 2;
    rr(g, x - CELL / 2 + 5, y - CELL / 2 + 5, CELL - 10, CELL - 10, 8); g.stroke();
  }
}

// ---------- the "goes with" mark on a chest card ----------
// The card (chest/ui.js) does not say which relic it is, so it is found by its name. See the PR.
let names = null;
function markCards(s, app) {
  if (app.modal.id !== 'draft') return;
  if (!names) { names = {}; for (const id of Object.keys(G.RELICS)) names[t('r_' + id)] = id; }
  for (const card of document.querySelectorAll('#modal .relic-card:not([data-r2])')) {
    card.dataset.r2 = '1';
    const b = card.querySelector('b'), id = b && names[b.textContent], pair = id && G.RELICS[id].pair;
    if (!pair || !G.RELICS[pair]) continue;
    const have = G.rel(s, pair) > 0;
    const el = document.createElement('span');
    el.className = 'r2-pair' + (have ? ' have' : '');
    el.innerHTML = `${icon(pair, 22)}<span></span>`;
    el.lastChild.textContent = t(have ? 'r2_goes' : 'r2_pair', { name: t('r_' + pair) });
    card.appendChild(el);
    if (have) card.classList.add('r2-match');
  }
}

const flame = `<path d="M16 4 Q24 12 22 19 Q21 27 16 28 Q9 27 9 20 Q9 15 13 13 Q13 17 16 17 Q18 12 16 4 Z" fill="#ff7a1a" ${S}/><path d="M16 16 Q20 20 18 24 Q16 27 14 24 Q12 21 16 16 Z" fill="#ffe14a"/>`;
const small = (inner, x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})">${inner}</g>`;

ui({
  id: 'relics2',
  css: new URL('./relics2.css', import.meta.url).href,
  icons: {
    hop: badge('#5b4a8a', `<path d="M19 4 L9 17 H15 L12 28 L24 13 H17 Z" fill="#ffe14a" ${S}/>`),
    twin: badge('#b98a00', gem(10.5, 16, 8, '#fff3a8') + gem(21.5, 16, 8, '#fff3a8')),
    fling: badge('#3b6ea8', `<path d="M5 25 Q9 9 21 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-dasharray="3 3.4" stroke-linecap="round"/><rect x="17" y="5" width="10" height="10" rx="3" fill="#a79a86" ${S}/>`),
    magnet: badge('#3d2a1a', `<path d="M8 6 H13 V17 A3 3 0 0 0 19 17 V6 H24 V17 A8 8 0 0 1 8 17 Z" fill="#d7332b" ${S}/><rect x="8" y="6" width="5" height="5" fill="#fff" ${S}/><rect x="19" y="6" width="5" height="5" fill="#fff" ${S}/>`),
    fire: badge('#7a2a1f', flame),
    fuse: badge('#7a2a1f', `<rect x="6" y="12" width="12" height="15" rx="3" fill="#d7332b" ${S}/><rect x="6" y="17" width="12" height="2.4" fill="#5e0f0b"/>${small(flame, 13, 1, 0.6)}`),
    rang: badge('#2f8f5b', `<path d="M6 24 L16 7 L26 24" fill="none" stroke="#1b1410" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 24 L16 7 L26 24" fill="none" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>`),
    fall: badge('#6b5a48', `<rect x="9" y="4" width="14" height="11" rx="3" fill="#dba65a" ${S}/><path d="M16 29 L9 21 H13.5 V17 H18.5 V21 H23 Z" fill="#fff" ${S}/>`),
    borrow: badge('#2f8f5b', small(helmet, -3, 3, 0.85) + small(pickShape('#ffd23f'), 11, -3, 0.7)),
    fazaa: badge('#2f8f5b', small(helmet, -3, 6, 0.6) + small(helmet, 15, 6, 0.6) + small(helmet, 6, -3, 0.6)),
    garden: badge('#1f7a4c', `<path d="M16 28 V16" stroke="#1b1410" stroke-width="2.4" stroke-linecap="round"/><path d="M16 20 Q8 20 7 13 Q14 12 16 20 Z" fill="#7ddc6a" ${S}/><path d="M16 17 Q24 17 25 10 Q18 9 16 17 Z" fill="#7ddc6a" ${S}/>${gem(16, 8, 5, '#f08a3c')}`),
    melt: badge('#5a3d22', `<path d="M6 15 H26 Q26 27 16 27 Q6 27 6 15 Z" fill="#33414d" ${S}/><path d="M8 15 H24 Q23 18 16 18 Q9 18 8 15 Z" fill="#ff7a1a"/>${gem(11, 8, 4.5, '#f08a3c')}${gem(21, 8, 4.5, '#f08a3c')}${star(16, 10, 3.2, 1.3, 4, '#fff')}`),
  },
  sfx: {
    relics2Zap() { if (gap('r2zap', 0.05)) tone(1400, { type: 'square', d: 0.07, vol: 0.05, slide: -700 }); },
    relics2Whoosh() { if (gap('r2whoosh', 0.1)) noise({ d: 0.22, vol: 0.12, from: 500, to: 2600, type: 'bandpass' }); },
    relics2Thud() { if (gap('r2thud', 0.06)) { tone(90, { type: 'sine', d: 0.16, vol: 0.3, slide: -40 }); noise({ d: 0.08, vol: 0.14, from: 900, to: 200 }); } },
    relics2Pop() { if (gap('r2pop', 0.08)) [784, 1175].forEach((f, i) => tone(f, { type: 'triangle', d: 0.14, vol: 0.14, at: i * 0.06 })); },
    relics2Fire() { if (gap('r2fire', 0.25)) noise({ d: 0.35, vol: 0.1, from: 1800, to: 500 }); },
    relics2Melt() { if (gap('r2melt', 0.15)) [392, 523, 784].forEach((f, i) => tone(f, { type: 'sine', d: 0.3, vol: 0.16, at: i * 0.07 })); },
    relics2Pull() { if (gap('r2pull', 0.12)) tone(300, { type: 'sine', d: 0.18, vol: 0.12, slide: 500 }); },
  },
  draw: [
    { at: AT.blocks + 10, fn: drawFire },
    { at: AT.fx + 5, fn(g) { for (const e of FX) KINDS[e.kind](g, e); } },
    { at: AT.pick + 5, fn: drawTwin },
  ],
  tick: markCards,
  on: {
    relics2Hop(d, app) { add({ kind: 'bolt', dur: 0.16, col: '#b99cff', seed: 1 + ((d.r * 7 + d.c * 13) % 11), ...d }); const [x, y] = centre(d.r, d.c); spark(x, y, '#d9c8ff', 5); app.sfx.relics2Zap(); },
    relics2Twin(d, app) {
      const [x, y] = centre(d.r, d.c), col = blockColour(d.t, d.r);
      add({ kind: 'bolt', dur: 0.25, col: '#ffd23f', seed: 5, ...d });
      ring(x, y, CELL * 1.2, '#ffd23f'); ring(x, y, CELL * 0.8, col); spark(x, y, '#fff', 16); flash(d.r, d.c, 1.4); app.sfx.relics2Pop();
    },
    relics2Fling(d, app) { add({ kind: 'rock', dur: d.dur, col: blockColour(d.t, d.fr), ...d }); app.sfx.relics2Whoosh(); },
    relics2Thud(d, app) { debris(d.r, d.c, '#cdbfae', 8, 0.9); flash(d.r, d.c, 0.9); shake(d.fall ? 0.12 + 0.05 * Math.min(d.fall, 3) : 0.1); app.sfx.relics2Thud(); },
    relics2Pull(d, app) { add({ kind: 'bolt', dur: 0.22, col: '#ff5a4a', seed: 3, ...d }); flash(d.r, d.c, 1); const [x, y] = centre(d.r, d.c); spark(x, y, '#ff8a7a', 6); app.sfx.relics2Pull(); },
    relics2Rang(d, app) { add({ kind: 'rang', ...d }); app.sfx.relics2Whoosh(); },
    relics2Borrow(d) { const [x, y] = centre(d.r, d.c); ring(x, y, CELL * 0.9, '#ffd23f'); spark(x, y, '#ffd23f', 6); },
    relics2Grow(d, app) {
      const [x, y] = centre(d.r, d.c);
      add({ kind: 'bolt', dur: 0.3, col: '#7ddc6a', seed: 7, ...d });
      ring(x, y, CELL, '#7ddc6a'); spark(x, y, '#c9ffbf', 12); flash(d.r, d.c, 1.2); app.sfx.relics2Pop();
    },
    relics2Melt(d, app) {
      const [x, y] = centre(d.r, d.c);
      for (const [r, c] of d.from) if (r !== d.r || c !== d.c) add({ kind: 'bolt', dur: 0.3, col: '#ff7a1a', seed: 2 + c, fr: r, fc: c, r: d.r, c: d.c });
      ring(x, y, CELL * 1.5, '#ff7a1a'); ring(x, y, CELL, '#fff'); spark(x, y, '#ffe14a', 22); flash(d.r, d.c, 1.6); shake(0.15); app.sfx.relics2Melt();
    },
    relics2Gift(d, app) { const [x, y] = centre(d.r, d.c); ring(x, y, CELL * 1.3, '#ffd23f'); spark(x, y, '#ffd23f', 14); flash(d.r, d.c, 1.4); app.sfx.relics2Pop(); },
    relics2Fire(d, app) { const [x, y] = centre(d.r, d.c); spark(x, y, '#ff7a1a', 10); app.sfx.relics2Fire(); },
  },
});
