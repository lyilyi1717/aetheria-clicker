// Dig feature (page side): the bone block, and everything that makes Museum pieces something to chase:
//  - ground: bone blocks and bundles that still give a piece glint and sparkle; an arrow at the bottom edge points at one
//    that is just below the view
//  - background: the skeleton (or treasure) of the set you are collecting is drawn faintly behind the ground; every piece
//    you find fills in with a shine, and a finished set glows
//  - strip: a small chip in the sky with the set's silhouettes and how many are found
// The Museum panel and its finishing ceremony live in wing2/ui.js. The world map reads museum/rules.js and art.js.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { CELL, AT, W, H, SKY, fx, yOf, baseBlock, shade, rr, centre, ring, spark, screenFlash } from '../../ui/render.js';
import { sfx, gap, tone } from '../../ui/audio.js';
import { setSvg } from '../wing2/art.js';
import { museumImage, maskOf } from './art.js';

const { t, fmt } = G;
const KINDS = ['fossil', 'lost'];
const BG_W = W - 64;                                                   // the picture is this wide, in the middle of the dig
const BG_H = Math.round(BG_W * 78 / 128);
const BG_Y = SKY + 40;

// ---------- what is on show ----------
let lv = null, lvSig = '', wantSig = '', wants = { fossil: false, lost: false };
let doneSet = '', shine = 0, strip = null, bg = null, bgSig = '', glow = null;

function refresh(s) {
  const l = doneSet ? G.museumView(s, doneSet) : G.museumHere(s);      // a finished set stays on show until the next piece
  const sig = l ? `${l.set}|${maskOf(l)}|${l.done ? 1 : 0}` : '';
  if (sig !== lvSig) { lvSig = sig; lv = l; paintStrip(); }
  const w = `${s.run ? s.run.floor : 0}|${sig}`;
  if (w !== wantSig) { wantSig = w; wants = { fossil: G.museumWants(s, 'fossil'), lost: G.museumWants(s, 'lost') }; }
}

function paintStrip() {
  if (!strip) return;
  if (!lv) { strip.hidden = true; return; }
  strip.hidden = false;
  strip.classList.toggle('done', lv.done);
  strip.style.setProperty('--c', lv.col);
  strip.innerHTML = `${setSvg(lv.set, i => lv.pieces[i].have, lv.col)}<span class="ms-t"><b></b><span class="ms-n"></span></span><span class="ms-k"></span>`;
  const name = t('mus_strip', { set: t('wset_' + lv.set) }), count = lv.done ? t('mus_done') : t('mus_count', { a: lv.have, b: lv.of });
  strip.querySelector('b').textContent = name;
  strip.querySelector('.ms-n').textContent = count;
  strip.querySelector('.ms-k').textContent = `${lv.have}/${lv.of}`;     // the short count, for the side spot
  strip.setAttribute('aria-label', name + ' ' + count);
}
// The layout map (docs/art-and-sound.md): the top centre of the dig is the manager's from 3 Rafeeqs on (his countdown pill
// and his text box), so the chip moves to its side spot under the depth pill and shows only the pieces and "a/b".
function placeStrip(s) {
  if (!strip) return;
  const side = !!G.chatterBossShown(s);
  if (side !== strip.classList.contains('side')) strip.classList.toggle('side', side);
}

// ---------- the skeleton in the background (an offscreen canvas, redrawn only when something changes) ----------
let builtSig = '';
function buildBg() {
  if (!lv) { bg = glow = null; return; }
  const im = museumImage(lv.set, maskOf(lv), lv.col, BG_W, false, () => { builtSig = ''; });
  if (!im.ready) return;
  const c = document.createElement('canvas'); c.width = BG_W; c.height = BG_H;
  c.getContext('2d').drawImage(im, 0, 0, BG_W, BG_H);
  const gl = document.createElement('canvas'); gl.width = BG_W; gl.height = BG_H;
  const g = gl.getContext('2d');
  g.filter = 'blur(9px) brightness(1.7)'; g.drawImage(im, 0, 0, BG_W, BG_H); g.filter = 'none';
  g.globalCompositeOperation = 'source-in'; g.fillStyle = lv.col; g.globalAlpha = 0.7; g.fillRect(0, 0, BG_W, BG_H);
  bg = c; glow = gl; builtSig = lvSig;
}
function drawBg(g, s, dt) {
  if (!lv) return;
  if (builtSig !== lvSig) buildBg();
  if (!bg) return;
  shine = Math.max(0, shine - dt);
  const x = (W - BG_W) / 2, y = BG_Y;
  g.save();
  g.drawImage(bg, x, y);
  const pulse = lv.done || doneSet === lv.set ? 0.45 + 0.35 * Math.sin(fx.t * 2.2) : 0;
  const a = Math.max(pulse, Math.min(1, shine * 1.2) * 0.9);
  if (a > 0.01) { g.globalAlpha = a; g.globalCompositeOperation = 'lighter'; g.drawImage(glow, x, y); }
  g.restore();
}

// ---------- the glint and the arrow ----------
function drawGlint(g, s) {
  if (!wants.fossil && !wants.lost) return;
  let seen = null;
  for (let i = 0; i < s.rows.length; i++) {
    const row = s.rows[i];
    for (let c = 0; c < G.COLS; c++) {
      const cell = row[c];
      if (!cell || !KINDS.includes(cell.t) || !wants[cell.t]) continue;
      if (!seen) seen = G.visibleMask(s);
      if (!seen[i][c]) continue;
      const r = s.top + i, y = yOf(r), x = c * CELL;
      if (y > H) {                                         // just below the view: an arrow at the edge
        if (y < H + CELL * 3) arrow(g, x + CELL / 2);
        continue;
      }
      if (y < -CELL) continue;
      const col = cell.t === 'fossil' ? '#f6efdc' : '#ffd98a', k = 0.5 + 0.5 * Math.sin(fx.t * 4 + c);
      g.save();
      g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(x + CELL / 2, y + CELL / 2, 4, x + CELL / 2, y + CELL / 2, CELL * 0.85);
      gr.addColorStop(0, `rgba(255,244,200,${0.35 + 0.25 * k})`); gr.addColorStop(1, 'rgba(255,244,200,0)');
      g.fillStyle = gr; g.fillRect(x - CELL * 0.3, y - CELL * 0.3, CELL * 1.6, CELL * 1.6);
      g.globalCompositeOperation = 'source-over';
      g.strokeStyle = col; g.globalAlpha = 0.55 + 0.45 * k; g.lineWidth = 3; rr(g, x + 2, y + 2, CELL - 4, CELL - 4, 9); g.stroke();
      g.globalAlpha = 1;
      for (let n = 0; n < 3; n++) {                        // sparkles that come and go around the block
        const ph = (fx.t * 1.3 + n * 0.37 + c * 0.11) % 1, ang = n * 2.1 + c;
        const px = x + CELL / 2 + Math.cos(ang) * (CELL * 0.42), py = y + CELL / 2 + Math.sin(ang * 1.3) * (CELL * 0.42), z = Math.sin(ph * Math.PI) * 7;
        g.fillStyle = '#fff'; g.beginPath(); g.moveTo(px, py - z); g.lineTo(px + z * 0.25, py - z * 0.25); g.lineTo(px + z, py); g.lineTo(px + z * 0.25, py + z * 0.25);
        g.lineTo(px, py + z); g.lineTo(px - z * 0.25, py + z * 0.25); g.lineTo(px - z, py); g.lineTo(px - z * 0.25, py - z * 0.25); g.closePath(); g.fill();
      }
      g.restore();
    }
  }
}
function arrow(g, x) {
  const b = Math.sin(fx.t * 5) * 3, y = H - 22 + b;
  g.save();
  g.fillStyle = '#ffe9a8'; g.strokeStyle = '#3a2410'; g.lineWidth = 2.5; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(x - 12, y - 10); g.lineTo(x + 12, y - 10); g.lineTo(x, y + 8); g.closePath(); g.fill(); g.stroke();
  g.restore();
}

ui({
  id: 'museum',
  css: new URL('./museum.css', import.meta.url).href,
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
  draw: [
    { at: AT.sky + 5, fn: drawBg },
    { at: AT.blocks + 6, fn: drawGlint },
  ],
  mount(app) {
    strip = document.createElement('div');
    strip.id = 'mus-strip'; strip.hidden = true;
    app.el.stage.appendChild(strip);
  },
  tick(s) { refresh(s); placeStrip(s); },
  on: {
    // the Museum panel and the "new bone" moments live in proto/features/wing2/ui.js; here only a bone no set wanted
    fossil(d, app) {
      if (d.set) return;
      sfx.fossil();
      const [x, y] = centre(d.r, d.c); ring(x, y, CELL * 1.4, '#f6efdc'); spark(x, y, '#f6efdc', 20);
      app.toast(t('t_fossil_none', { n: fmt(d.coins) }), 'fossil');
    },
    // a new piece: the skeleton in the background fills in there with a shine
    wingPiece(d) {
      if (!d.isNew) return;
      if (doneSet && d.set !== doneSet) { doneSet = ''; lvSig = ''; return; }
      if (!lv || d.set !== lv.set) return;
      shine = 1.4;
      if (strip) { strip.classList.remove('pop'); void strip.offsetWidth; strip.classList.add('pop'); }
      for (let n = 0; n < 6; n++) spark(32 + BG_W * (0.15 + 0.7 * Math.random()), BG_Y + BG_H * (0.2 + 0.6 * Math.random()), lv.col, 5);
    },
    // a finished set: the whole picture lights up
    wingSet(d) {
      doneSet = d.set; shine = 2.2;
      screenFlash('#fff6c8', 0.3);
      for (let n = 0; n < 14; n++) setTimeout(() => spark(32 + BG_W * (0.1 + 0.8 * Math.random()), BG_Y + BG_H * (0.1 + 0.8 * Math.random()), '#fff6c8', 8), n * 70);
    },
    newSite() { doneSet = ''; lvSig = ''; wantSig = ''; },
  },
});
