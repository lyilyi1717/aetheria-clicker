// Dig feature (page side): water. The pocket, the pearl, water running through open space, wet
// blocks that drip, a Rafeeq splashing in a puddle, and the sounds.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, AT, CELL, yOf, baseBlock, shade, rr, centre, ring, spark, shake, debris, coinBurst, text } from '../../ui/render.js';
import { sfx, gap, tone, noise } from '../../ui/audio.js';
import { S, badge } from '../../ui/icons.js';

const { t } = G;
const BLUE = '#5ab4ff', DEEP = '#2f7fd0';

// ---------- the sprites ----------
function waterBlock(g, p, v) {
  baseBlock(g, shade(p.dirt, -0.2), v, 3);
  // a blue bulb pushing out of the ground
  const gr = g.createRadialGradient(26, 24, 3, 32, 34, 24);
  gr.addColorStop(0, '#bfe6ff'); gr.addColorStop(1, DEEP);
  g.fillStyle = gr; g.strokeStyle = '#143f6e'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(32, 9); g.quadraticCurveTo(52, 30, 46, 43); g.quadraticCurveTo(40, 55, 32, 55);
  g.quadraticCurveTo(24, 55, 18, 43); g.quadraticCurveTo(12, 30, 32, 9); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(25, 33, 3.5, 7, 0.4, 0, 7); g.fill();
}
function pearlBlock(g, p, v) {
  baseBlock(g, p.stone, v, 4);
  g.fillStyle = shade(p.stone, -0.35); g.beginPath(); g.ellipse(32, 36, 22, 18, 0, 0, 7); g.fill();   // the hollow it sits in
  const gr = g.createRadialGradient(26, 28, 2, 32, 34, 17);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#f1e4f4'); gr.addColorStop(1, '#b9a6d4');
  g.fillStyle = gr; g.strokeStyle = '#4a3a63'; g.lineWidth = 2.2;
  g.beginPath(); g.arc(32, 34, 15, 0, 7); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(26, 28, 4, 0, 7); g.fill();
}

// ---------- water on the canvas ----------
const inView = y => y > -CELL && y < 10 * CELL + 120;

function drawPools(g, s) {
  const now = s.t;
  for (const k of Object.keys(s.pools)) {
    const left = s.pools[k] - now;
    if (left <= 0) continue;
    const [rs, cs] = k.split(',');
    const r = +rs, c = +cs, y = yOf(r), x = c * CELL;
    if (!inView(y)) continue;
    const topOpen = (s.pools[(r - 1) + ',' + c] || 0) <= now;
    const a = Math.min(0.62, left / 3 * 0.62);
    g.fillStyle = `rgba(60,150,235,${a})`;
    const dy = topOpen ? CELL * 0.35 : 0;
    g.fillRect(x, y + dy, CELL, CELL - dy);
    if (topOpen) {
      g.strokeStyle = `rgba(200,235,255,${Math.min(1, a + 0.2)})`; g.lineWidth = 3;
      g.beginPath();
      for (let i = 0; i <= 8; i++) {
        const xx = x + i * CELL / 8, yy = y + dy + Math.sin(fx.t * 5 + (c * 8 + i) * 0.9) * 2.5;
        if (i) g.lineTo(xx, yy); else g.moveTo(xx, yy);
      }
      g.stroke();
    }
    // a bubble now and then
    const b = Math.sin(fx.t * 1.7 + r * 3 + c * 5);
    if (b > 0.9) { g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(x + 14 + (r * 7 + c * 11) % 36, y + CELL - 12 - (b - 0.9) * 200, 3, 0, 7); g.fill(); }
  }
}

function drawWet(g, s) {
  const now = s.t;
  for (let i = 0; i < 10; i++) {
    const row = s.rows[i];
    if (!row) continue;
    const y = yOf(s.top + i);
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (!cell || !(cell.wet > now)) continue;
      const x = c * CELL, left = cell.wet - now;
      g.fillStyle = `rgba(40,110,200,${Math.min(0.28, left / 4 * 0.28)})`;
      rr(g, x + 1, y + 1, CELL - 2, CELL - 2, 9); g.fill();
      // a drop that slides down the face
      const ph = (fx.t * 0.9 + cell.s * 0.37) % 1;
      g.fillStyle = 'rgba(190,230,255,0.9)';
      g.beginPath(); g.ellipse(x + 14 + (cell.s % 36), y + 10 + ph * (CELL - 18), 2.6, 3.6, 0, 0, 7); g.fill();
    }
  }
}

// a Rafeeq standing in a puddle splashes about
const splashing = new WeakMap();
function drawSplash(g, s) {
  for (const d of s.diggers) {
    const wet = (s.pools[Math.round(d.r) + ',' + Math.round(d.c)] || 0) > s.t;
    if (!wet) { splashing.set(d, false); continue; }
    const [x, y] = centre(d.r, d.c);
    if (!splashing.get(d)) {
      splashing.set(d, true);
      spark(x, y + 6, '#bfe6ff', 14); ring(x, y + 14, 46, BLUE); sfx.waterSplash();
    }
    for (let k = 0; k < 2; k++) {
      const ph = (fx.t * 1.6 + k * 0.5) % 1;
      g.strokeStyle = `rgba(210,240,255,${1 - ph})`; g.lineWidth = 2.5;
      g.beginPath(); g.ellipse(x, y + 18, 10 + ph * 22, 4 + ph * 8, 0, 0, 7); g.stroke();
    }
    g.fillStyle = 'rgba(210,240,255,0.9)';
    for (let k = 0; k < 4; k++) {
      const ph = (fx.t * 2.2 + k * 0.27) % 1, a = k * 1.7 + 0.5;
      g.beginPath(); g.arc(x + Math.cos(a) * 16 * ph, y + 12 - Math.sin(ph * Math.PI) * 22, 2.2, 0, 7); g.fill();
    }
  }
}

ui({
  id: 'water',
  icons: {
    water: badge('#2f7fd0', `<path d="M16 5 Q25 15 23 20 Q21 26 16 26 Q11 26 9 20 Q7 15 16 5 Z" fill="#bfe6ff" ${S}/>`),
  },
  sfx: {
    waterBurst() {
      if (!gap('wburst', 0.2)) return;
      noise({ d: 0.7, vol: 0.32, from: 600, to: 3600 });
      tone(300, { type: 'sine', d: 0.4, vol: 0.18, slide: 700 });
    },
    waterSplash() {
      if (!gap('wsplash', 0.08)) return;
      noise({ d: 0.18, vol: 0.18, from: 3500, to: 900 });
      tone(520 + Math.random() * 200, { type: 'sine', d: 0.1, vol: 0.12, slide: -200 });
    },
    waterPlop() {
      tone(240, { type: 'sine', d: 0.18, vol: 0.3, slide: -140 });
      noise({ d: 0.15, vol: 0.12, from: 900, to: 150 });
    },
    waterClink() {
      if (!gap('wclink', 0.08)) return;
      tone(1500, { type: 'sine', d: 0.09, vol: 0.14 });
      tone(2250, { type: 'sine', d: 0.07, vol: 0.06 });
    },
    waterFree() {
      if (!gap('wfree', 0.05)) return;
      tone(660, { type: 'sine', d: 0.12, vol: 0.18, slide: 400 });
      tone(990, { type: 'triangle', d: 0.18, vol: 0.12, at: 0.06 });
    },
  },
  art: {
    water: { colour: BLUE, rich: true, glow: '90,180,255', firstSight: { flag: 'waterToast', text: 't_water', kind: 'gold' }, sprite: waterBlock },
    pearl: { colour: '#f1e4f4', rich: true, twinkle: true, glow: '230,210,245', firstSight: { flag: 'pearlToast', text: 't_pearl', kind: 'gold' }, sprite: pearlBlock,
      // a pick cannot get a grip on it
      hit(d, x, y) {
        if (d.src === 'you') { spark(x, y, '#ffffff', 5); text(x, y - 14, t('w_clink'), '#e8d8f4', 15, 0.6); sfx.waterClink(); }
        return true;
      } },
  },
  draw: [
    { at: AT.blocks + 20, fn: drawPools },
    { at: AT.blocks + 25, fn: drawWet },
    { at: AT.actors + 5, fn: drawSplash },
  ],
  on: {
    burst(d) {
      const [x, y] = centre(d.r, d.c);
      ring(x, y, CELL * 1.6, BLUE); ring(x, y, CELL * 0.9, '#fff');
      spark(x, y, BLUE, 26); spark(x, y, '#e6f6ff', 12);
      shake(0.25); sfx.waterBurst();
    },
    wash(d) { debris(d.r, d.c, '#7cc4ff', 4, 0.6); },
    washed(d, app) {
      const [x, y] = centre(d.r, d.c);
      const pearl = d.t === 'pearl';
      ring(x, y, CELL * (pearl ? 2 : 1.2), pearl ? '#fff' : '#ffe14a');
      spark(x, y, '#bfe6ff', pearl ? 30 : 12);
      coinBurst(d.r, d.c, pearl ? 36 : 10);
      text(x, y - 26, t(pearl ? 'w_pearl' : 'w_washed'), pearl ? '#ffffff' : BLUE, pearl ? 32 : 18, pearl ? 1.5 : 0.9);
      sfx.waterFree();
      if (pearl) { shake(0.4); app.hitStop(0.06); }
    },
    wet(d, app) {
      const [x, y] = centre(d.r, d.c);
      spark(x, y, BLUE, 6);
      if (!app.state.seen.wetToast) { app.state.seen.wetToast = true; app.toast(t('t_wet')); }
    },
    fizzle(d, app) {
      const [x, y] = centre(d.r, d.c);
      text(x, y - 10, t('w_plop'), BLUE, 30, 1.1);
      spark(x, y, '#9fb3c4', 16); ring(x, y, CELL * 0.9, '#9fb3c4');
      sfx.waterPlop();
      if (!app.state.seen.dudToast) { app.state.seen.dudToast = true; app.toast(t('t_dud'), 'gold'); }
    },
    splash(d) {
      const [x, y] = centre(d.r, d.c);
      ring(x, y + 14, CELL * 0.8, BLUE); spark(x, y + 12, '#e6f6ff', 8);
      sfx.waterSplash();
    },
    hit(d, app) {
      if (d.t === 'pearl' && d.src === 'you' && !app.state.seen.slipToast) { app.state.seen.slipToast = true; app.toast(t('t_slip')); }
    },
  },
});
