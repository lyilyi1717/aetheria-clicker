// Dig feature (page side): the Deep. The look of twelve blocks, the dark and its lights, torches, lava, and what
// happens on screen for each law: a banner and a first-sight toast on arrival, then feedback for every event.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, AT, CELL, W, yOf, baseBlock, shade, rr, centre, ring, spark, shake, debris, coinBurst, text, screenFlash } from '../../ui/render.js';
import { sfx, gap, tone, noise } from '../../ui/audio.js';
import { oreBacking } from '../look/palette.js';

const { t } = G;
const GLOW = '#9dffd0', FLAME = '#ffb347', LAVA = '#ff7a1a';

// ---------- sprites (64 x 64) ----------
const cap = (g, col, rim, x, y, w, h) => {   // a mushroom cap
  g.fillStyle = col; g.strokeStyle = rim; g.lineWidth = 2.4;
  g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x, y - h * 1.7, x + w, y); g.closePath(); g.fill(); g.stroke();
};
const mushroom = (g, p, v) => {
  baseBlock(g, p.dirt, v, 4);
  g.fillStyle = '#e8f5e8'; g.strokeStyle = '#2a4a3a'; g.lineWidth = 2; rr(g, 28, 34, 9, 18, 3); g.fill(); g.stroke();
  const gr = g.createRadialGradient(32, 30, 2, 32, 32, 22); gr.addColorStop(0, '#d8fff0'); gr.addColorStop(1, '#38c98f');
  cap(g, gr, '#1d6b50', 32, 36, 19, 15);
  g.fillStyle = 'rgba(255,255,255,0.9)'; for (const [x, y] of [[26, 28], [36, 25], [32, 32]]) { g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); }
};
const lantern = (g, p, v) => {
  baseBlock(g, p.stone, v, 3);
  g.strokeStyle = '#2b1d10'; g.lineWidth = 3; g.beginPath(); g.moveTo(32, 6); g.lineTo(32, 14); g.stroke();
  const gr = g.createRadialGradient(32, 34, 3, 32, 34, 20); gr.addColorStop(0, '#fffbd0'); gr.addColorStop(1, '#f0a020');
  g.fillStyle = gr; g.strokeStyle = '#2b1d10'; g.lineWidth = 2.6; rr(g, 19, 15, 26, 32, 8); g.fill(); g.stroke();
  g.fillStyle = '#3d2a1a'; rr(g, 17, 12, 30, 6, 2); g.fill(); rr(g, 17, 45, 30, 6, 2); g.fill();
  g.strokeStyle = '#7a4a10'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 18); g.lineTo(32, 45); g.stroke();
};
const gemOn = (base, col, rim, hi) => (g, p, v) => {
  baseBlock(g, p[base], v, 4);
  g.fillStyle = oreBacking(p[base], col, -0.35); g.beginPath(); g.ellipse(32, 36, 22, 18, 0, 0, 7); g.fill();
  g.fillStyle = col; g.strokeStyle = rim; g.lineWidth = 2.4;
  g.beginPath(); g.moveTo(32, 14); g.lineTo(47, 28); g.lineTo(40, 50); g.lineTo(24, 50); g.lineTo(17, 28); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = hi; g.beginPath(); g.moveTo(32, 14); g.lineTo(38, 28); g.lineTo(32, 46); g.lineTo(26, 28); g.closePath(); g.fill();
};
const torchCrate = (g, p, v) => {
  baseBlock(g, p.dirt, v, 3);
  g.fillStyle = '#9b6a35'; g.strokeStyle = '#3d2410'; g.lineWidth = 2.4; rr(g, 9, 14, 46, 38, 4); g.fill(); g.stroke();
  g.strokeStyle = '#5a3a18'; g.beginPath(); g.moveTo(9, 28); g.lineTo(55, 28); g.moveTo(9, 40); g.lineTo(55, 40); g.stroke();
  g.fillStyle = '#4a2c12'; g.fillRect(29, 20, 6, 24);
  g.fillStyle = FLAME; g.beginPath(); g.moveTo(32, 6); g.quadraticCurveTo(42, 14, 36, 22); g.lineTo(28, 22); g.quadraticCurveTo(22, 14, 32, 6); g.fill();
};
const moss = (g, p, v) => {
  baseBlock(g, p.dirt, v, 3);
  g.fillStyle = '#4fae52';
  for (const [x, y, r] of [[14, 20, 9], [30, 14, 11], [48, 22, 9], [20, 44, 10], [42, 46, 11], [32, 32, 8]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  g.fillStyle = '#8fe08a'; for (const [x, y] of [[12, 17], [28, 11], [46, 19], [18, 41], [40, 43]]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
};
const grump = (g, p, v) => {
  baseBlock(g, shade(p.dirt, -0.15), v, 3);
  g.strokeStyle = '#1b0b08'; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(12, 20); g.lineTo(27, 27); g.moveTo(52, 20); g.lineTo(37, 27); g.stroke();   // angry brows
  g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(23, 33, 6, 0, 7); g.arc(41, 33, 6, 0, 7); g.fill();
  g.fillStyle = '#1b0b08'; g.beginPath(); g.arc(25, 35, 3, 0, 7); g.arc(39, 35, 3, 0, 7); g.fill();
  g.beginPath(); g.moveTo(20, 52); g.quadraticCurveTo(32, 40, 44, 52); g.stroke();                    // a frown
  g.fillStyle = 'rgba(255,60,40,0.35)'; g.beginPath(); g.arc(14, 42, 5, 0, 7); g.arc(50, 42, 5, 0, 7); g.fill();
};
const thief = (g, p, v) => {
  baseBlock(g, p.dirt, v, 4);
  g.fillStyle = '#8a6a30'; g.strokeStyle = '#2b1d10'; g.lineWidth = 2.4;
  g.beginPath(); g.moveTo(24, 20); g.quadraticCurveTo(10, 36, 16, 50); g.lineTo(48, 50); g.quadraticCurveTo(54, 36, 40, 20); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(32, 38, 9, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#1b1410'; rr(g, 18, 25, 28, 7, 3); g.fill();                                        // a bandit mask
  g.fillStyle = '#fff'; g.beginPath(); g.arc(25, 28.5, 1.8, 0, 7); g.arc(39, 28.5, 1.8, 0, 7); g.fill();
};
const lavaBlock = (g, p, v) => {
  baseBlock(g, shade(p.dirt, -0.25), v, 3);
  const gr = g.createRadialGradient(28, 26, 3, 32, 34, 24); gr.addColorStop(0, '#fff3a0'); gr.addColorStop(0.5, LAVA); gr.addColorStop(1, '#b3200c');
  g.fillStyle = gr; g.strokeStyle = '#4a0c04'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(32, 9); g.quadraticCurveTo(52, 30, 46, 43); g.quadraticCurveTo(40, 55, 32, 55); g.quadraticCurveTo(24, 55, 18, 43); g.quadraticCurveTo(12, 30, 32, 9); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,200,0.7)'; g.beginPath(); g.ellipse(25, 33, 3.5, 7, 0.4, 0, 7); g.fill();
};
const glass = g => {
  rr(g, 1, 1, 62, 62, 9); g.fillStyle = 'rgba(190,235,245,0.55)'; g.fill();
  g.strokeStyle = '#5a9bb0'; g.lineWidth = 2.4; g.stroke();
  g.save(); rr(g, 1, 1, 62, 62, 9); g.clip();
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.moveTo(8, 4); g.lineTo(22, 4); g.lineTo(4, 30); g.lineTo(4, 16); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(40, 60); g.lineTo(60, 36); g.lineTo(60, 50); g.lineTo(50, 60); g.closePath(); g.fill();
  g.restore();
  g.strokeStyle = 'rgba(70,130,150,0.8)'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(32, 6); g.lineTo(26, 24); g.lineTo(38, 34); g.lineTo(30, 58); g.stroke();
};

// ---------- the dark, torches, lava ----------
const front = s => G.frontLayer(s).id;

function drawDark(g, s) {
  if (front(s) !== 'black') return;
  const d = s.deep;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const l of d.glows) {
    if (l.until <= d.bc) continue;
    const [x, y] = centre(l.r, l.c), rad = (l.rad + 0.6) * CELL;
    const left = Math.min(1, (l.until - d.bc) / 6), k = 0.55 + Math.sin(fx.t * 3 + l.c) * 0.08;
    const gr = g.createRadialGradient(x, y, 4, x, y, rad);
    gr.addColorStop(0, `rgba(120,255,200,${0.28 * left * k})`); gr.addColorStop(1, 'rgba(120,255,200,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  if (fx.mouse.inside) {
    const rad = 2.6 * CELL, gr = g.createRadialGradient(fx.mouse.x, fx.mouse.y, 4, fx.mouse.x, fx.mouse.y, rad);
    gr.addColorStop(0, 'rgba(255,214,140,0.16)'); gr.addColorStop(1, 'rgba(255,214,140,0)');
    g.fillStyle = gr; g.fillRect(fx.mouse.x - rad, fx.mouse.y - rad, rad * 2, rad * 2);
  }
  g.restore();
}

function drawTorches(g, s) {
  for (const o of s.deep.torches) {
    const [x, y] = centre(o.r, o.c);
    if (y < -CELL || y > 10 * CELL + 100) continue;
    g.save(); g.globalCompositeOperation = 'lighter';
    const rad = (G.PARAMS.deep.torchRad + 0.5) * CELL, gr = g.createRadialGradient(x, y, 4, x, y, rad), fl = 0.8 + Math.sin(fx.t * 9 + o.c) * 0.2;
    gr.addColorStop(0, `rgba(255,170,70,${0.3 * fl})`); gr.addColorStop(1, 'rgba(255,170,70,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    g.restore();
    g.fillStyle = '#5a3a18'; g.fillRect(x - 3, y - 4, 6, 26);
    const h = 16 + Math.sin(fx.t * 11 + o.r) * 3;
    g.fillStyle = FLAME; g.beginPath(); g.moveTo(x, y - 4 - h); g.quadraticCurveTo(x + 11, y - 8, x + 5, y - 1); g.lineTo(x - 5, y - 1); g.quadraticCurveTo(x - 11, y - 8, x, y - 4 - h); g.fill();
    g.fillStyle = '#fff1a8'; g.beginPath(); g.ellipse(x, y - 6, 3.5, h * 0.35, 0, 0, 7); g.fill();
  }
}

function drawLava(g, s) {
  for (const k of Object.keys(s.deep.lava)) {
    const [r, c] = k.split(',').map(Number), y = yOf(r), x = c * CELL;
    if (y < -CELL || y > 10 * CELL + 100) continue;
    const open = !s.deep.lava[(r - 1) + ',' + c], dy = open ? CELL * 0.3 : 0, w = Math.sin(fx.t * 3 + c + r) * 0.5 + 0.5;
    const gr = g.createLinearGradient(0, y + dy, 0, y + CELL);
    gr.addColorStop(0, `rgba(255,${190 + w * 40},60,0.95)`); gr.addColorStop(1, 'rgba(210,50,10,0.92)');
    g.fillStyle = gr; g.fillRect(x, y + dy, CELL, CELL - dy);
    if (open) {
      g.strokeStyle = '#fff0a0'; g.lineWidth = 3; g.beginPath();
      for (let i = 0; i <= 8; i++) { const xx = x + i * CELL / 8, yy = y + dy + Math.sin(fx.t * 4 + (c * 8 + i) * 0.8) * 2.5; if (i) g.lineTo(xx, yy); else g.moveTo(xx, yy); }
      g.stroke();
    }
    g.save(); g.globalCompositeOperation = 'lighter';
    const rad = CELL * 1.5, gg = g.createRadialGradient(x + CELL / 2, y + CELL / 2, 4, x + CELL / 2, y + CELL / 2, rad);
    gg.addColorStop(0, 'rgba(255,120,30,0.2)'); gg.addColorStop(1, 'rgba(255,120,30,0)');
    g.fillStyle = gg; g.fillRect(x + CELL / 2 - rad, y + CELL / 2 - rad, rad * 2, rad * 2);
    g.restore();
    if (Math.sin(fx.t * 1.3 + r * 5 + c * 3) > 0.93) { g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(x + 12 + (r * 7 + c * 11) % 40, y + CELL - 14, 3, 0, 7); g.fill(); }
  }
}

// things that fly: a thrown grump, a stone at a Rafeeq
const flights = [];
function drawFlights(g, s, dt) {
  for (let i = flights.length - 1; i >= 0; i--) {
    const f = flights[i]; f.life -= dt;
    if (f.life <= 0) { flights.splice(i, 1); continue; }
    const k = 1 - f.life / f.max, x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * 40;
    g.fillStyle = f.col; g.strokeStyle = '#1b0b08'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(x, y, f.rad, 0, 7); g.fill(); g.stroke();
    if (f.face) { g.fillStyle = '#fff'; g.fillRect(x - 6, y - 3, 4, 4); g.fillRect(x + 2, y - 3, 4, 4); }
  }
}
const fly = (r, c, tr, tc, col, rad, face, life = 0.25) => {
  const [x0, y0] = centre(r, c), [x1, y1] = centre(tr, tc);
  flights.push({ x0, y0, x1, y1, col, rad, face, life, max: life });
};

const toast = (flag, key) => ({ flag, text: key, kind: 'gold' });
const mk = (sprite, o = {}) => ({ sprite, rich: true, ...o });

ui({
  id: 'deep',
  sfx: {
    deepGlow() { if (gap('dglow', 0.1)) { tone(880, { type: 'sine', d: 0.4, vol: 0.14 }); tone(1320, { type: 'sine', d: 0.5, vol: 0.08, at: 0.08 }); } },
    deepTorch() { if (gap('dtorch', 0.1)) noise({ d: 0.35, vol: 0.2, from: 500, to: 2500 }); },
    deepRegrow() { if (gap('dregrow', 0.15)) { tone(150, { type: 'sawtooth', d: 0.3, vol: 0.1, slide: 60 }); tone(110, { type: 'sine', d: 0.35, vol: 0.12 }); } },
    deepShove() { tone(90, { type: 'square', d: 0.25, vol: 0.2, slide: -30 }); noise({ d: 0.2, vol: 0.2, from: 900, to: 150 }); },
    deepBonk() { tone(240, { type: 'triangle', d: 0.15, vol: 0.25, slide: -140 }); tone(480, { type: 'sine', d: 0.2, vol: 0.12, at: 0.05, slide: -200 }); },
    deepSteal() { tone(700, { type: 'triangle', d: 0.4, vol: 0.2, slide: -500 }); tone(440, { type: 'triangle', d: 0.3, vol: 0.14, at: 0.1, slide: -260 }); },
    deepBack() { for (let i = 0; i < 4; i++) tone(660 * Math.pow(1.26, i), { type: 'sine', d: 0.2, vol: 0.14, at: i * 0.07 }); },
    deepLava() { if (gap('dlava', 0.12)) noise({ d: 0.4, vol: 0.14, from: 500, to: 120 }); },
    deepLavaBurst() { noise({ d: 0.8, vol: 0.3, from: 400, to: 2800 }); tone(120, { type: 'sawtooth', d: 0.5, vol: 0.18, slide: 200 }); },
    deepBurn() { if (gap('dburn', 0.08)) { noise({ d: 0.2, vol: 0.14, from: 4000, to: 800 }); tone(520, { type: 'sine', d: 0.3, vol: 0.14, slide: 520 }); } },
    deepGlass() { if (gap('dglass', 0.06)) { tone(2400, { type: 'sine', d: 0.2, vol: 0.12 }); tone(3100, { type: 'sine', d: 0.15, vol: 0.07, at: 0.04 }); noise({ d: 0.3, vol: 0.12, from: 6000, to: 2000 }); } },
  },
  art: {
    mushroom: mk(mushroom, { colour: GLOW, glow: '120,255,200', firstSight: toast('mushroomToast', 't_mushroom') }),
    lantern: mk(lantern, { colour: '#ffd36a', glow: '255,200,90', firstSight: toast('lanternToast', 't_lantern') }),
    moonstone: mk(gemOn('stone', '#cfe0ff', '#38456e', 'rgba(255,255,255,0.7)'), { colour: '#cfe0ff', twinkle: true, glow: '190,210,255', firstSight: toast('moonToast', 't_moonstone') }),
    torch_crate: mk(torchCrate, { colour: '#b07a3c', firstSight: toast('torchToast', 't_torch_crate') }),
    amber: mk(gemOn('stone', '#ffb52e', '#6a3d00', 'rgba(255,240,170,0.7)'), { colour: '#ffb52e', twinkle: true, firstSight: toast('amberToast', 't_amber') }),
    moss: { sprite: moss, colour: '#4fae52', firstSight: toast('mossToast', 't_moss') },
    grump: mk(grump, { colour: '#c9473a', glow: '255,70,50', firstSight: toast('grumpToast', 't_grump') }),
    thief: mk(thief, { colour: '#ffd23f', glow: '255,210,60', firstSight: toast('thiefToast', 't_thief') }),
    ruby: mk(gemOn('stone', '#e0234a', '#4a0618', 'rgba(255,190,200,0.6)'), { colour: '#e0234a', twinkle: true, firstSight: toast('rubyToast', 't_ruby') }),
    lava: mk(lavaBlock, { colour: LAVA, glow: '255,120,30', firstSight: toast('lavaToast', 't_lava') }),
    lavaglass: { sprite: glass, colour: '#bfeaf5', rich: true, twinkle: true, firstSight: toast('glassToast', 't_glass') },
    ember: mk(gemOn('stone', '#ff8a1a', '#5a1a00', 'rgba(255,240,150,0.8)'), { colour: '#ff9a2a', twinkle: true, glow: '255,150,40', firstSight: toast('emberToast', 't_ember') }),
  },
  draw: [
    { at: AT.blocks + 30, fn: drawDark },
    { at: AT.blocks + 12, fn: drawTorches },
    { at: AT.blocks + 22, fn: drawLava },
    { at: AT.fx + 6, fn: drawFlights },
  ],
  on: {
    // arrival: the layer's name and its one rule (after the Big Rock's own banner)
    deepEnter(d, app) {
      setTimeout(() => app.banner(t('layer_' + d.id), t('deep_law_' + d.id)), 3000);
    },
    deepGlow(d) {
      const [x, y] = centre(d.r, d.c);
      ring(x, y, CELL * (d.rad + 0.8), GLOW); spark(x, y, GLOW, 14); spark(x, y, '#fff', 5);
      screenFlash('#9dffd0', 0.08); sfx.deepGlow();
    },
    deepTorch(d) {
      const [x, y] = centre(d.r, d.c);
      ring(x, y, CELL * 2.4, FLAME); spark(x, y, FLAME, 16);
      text(x, y - 24, t('d_torch'), FLAME, 20, 0.9); sfx.deepTorch();
    },
    deepRegrow(d) {
      const [x, y] = centre(d.r, d.c);
      spark(x, y, '#8fe08a', 10); debris(d.r, d.c, '#4fae52', 6, 0.5);
      text(x, y - 10, t('d_grow'), '#8fe08a', 14, 0.8); sfx.deepRegrow();
    },
    deepShove(d) {
      const [x, y] = centre(d.r, d.c);
      shake(0.45); ring(x, y, CELL * 1.4, '#ff6a4a');
      text(x, y - 24, t('d_shove'), '#ff9a7a', 28, 0.9); sfx.deepShove();
    },
    deepStone(d) {
      fly(d.r, d.c, Math.round(d.tr), Math.round(d.tc), '#9a948c', 9, false);
      const [x, y] = centre(d.tr, d.tc);
      setTimeout(() => { text(x, y - 24, t('d_bonk'), '#ffe14a', 26, 0.9); spark(x, y, '#ffe14a', 10); sfx.deepBonk(); }, 220);
    },
    deepSteal(d) {
      const [x, y] = centre(d.tr, d.tc);
      text(60, 70, '-' + G.fmt(d.coins), '#ff6a4a', 26, 1.2); text(x, y - 24, t('d_stolen'), '#ff6a4a', 22, 1.1);
      ring(x, y, CELL * 1.3, '#ffd23f'); sfx.deepSteal();
    },
    deepThief(d) {
      const [x, y] = centre(d.r, d.c);
      text(x, y - 24, t('d_back'), '#9dffd0', 26, 1.1); coinBurst(d.r, d.c, 14); sfx.deepBack();
    },
    deepThrow(d) {
      fly(d.r, d.c, d.tr, d.tc, '#c9473a', 14, true, 0.22);
      const [x, y] = centre(d.r, d.c);
      text(x, y - 20, t('d_fly'), '#ff9a7a', 22, 0.8);
    },
    deepRock(d) {
      text(W / 2, 90, t(d.id === 'living' ? 'd_rock_living' : 'd_rock_angry'), d.id === 'living' ? '#8fe08a' : '#ff6a4a', 32, 1.4);
      shake(0.4); if (d.id === 'angry') sfx.deepBonk(); else sfx.deepRegrow();
    },
    deepBack(d, app) {
      text(W / 2, 90, t('d_rock_back'), '#9dffd0', 30, 1.5); sfx.deepBack();
      app.toast('+' + G.fmt(d.coins), 'gold');
    },
    deepLavaBurst(d) {
      const [x, y] = centre(d.r, d.c);
      ring(x, y, CELL * 1.8, LAVA); ring(x, y, CELL, '#fff3a0'); spark(x, y, LAVA, 26); spark(x, y, '#ffe9a0', 12);
      shake(0.3); screenFlash('#ff7a1a', 0.12); sfx.deepLavaBurst();
    },
    deepLava() { sfx.deepLava(); },
    deepBurn(d) {
      const [x, y] = centre(d.r, d.c);
      ring(x, y, CELL * 1.2, '#ffe14a'); spark(x, y, '#ffb347', 14);
      text(x, y - 24, t('d_burn'), '#ffe14a', 22, 0.9); sfx.deepBurn();
    },
    deepBoom(d) { const [x, y] = centre(d.r, d.c); spark(x, y, LAVA, 8); },
    deepGlass(d) {
      const [x, y] = centre(d.r, d.c);
      ring(x, y, CELL * 1.2, '#bfeaf5'); spark(x, y, '#e6fbff', 14);
      text(x, y - 22, t('d_glass'), '#bfeaf5', 22, 0.9); sfx.deepGlass();
    },
  },
});
