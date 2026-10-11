// Dig feature (page side): the Big Rock. It draws its whole row (a face that watches the pick, a crack
// that moves), owns the goal bar, and has its own hit and break moments.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, CELL, W, rr, seeded, centre, yOf, onFx, debris, spark, text, shake, ring, coinBurst, screenFlash } from '../../ui/render.js';
import { sfx, gap, tone, noise, wob } from '../../ui/audio.js';

const { t, fmt } = G;

let bossShake = 0;
onFx(dt => { bossShake = Math.max(0, bossShake - dt * 6); });

function drawBoss(g, s, r, y) {
  const b = s.boss && s.boss.row === r ? s.boss : null;
  const frac = b ? Math.max(0, b.hp / b.max) : 1;
  const sh = bossShake * 5;
  const ox = (Math.random() - 0.5) * sh, oy = (Math.random() - 0.5) * sh;
  g.save(); g.translate(ox, y + oy);
  rr(g, 3, 2, W - 6, CELL - 4, 16);
  const grad = g.createLinearGradient(0, 0, 0, CELL);
  grad.addColorStop(0, '#6a6384'); grad.addColorStop(1, '#3a3450');
  g.fillStyle = grad; g.fill(); g.strokeStyle = '#1c1830'; g.lineWidth = 4; g.stroke();
  // cracks grow as it weakens
  g.strokeStyle = 'rgba(10,6,25,0.8)'; g.lineWidth = 3; g.lineCap = 'round';
  const rnd = seeded(r);
  const n = Math.floor((1 - frac) * 14);
  for (let i = 0; i < n; i++) { let x = rnd() * W, yy = rnd() * CELL; g.beginPath(); g.moveTo(x, yy); for (let j = 0; j < 3; j++) { x += (rnd() - 0.5) * 50; yy += (rnd() - 0.5) * 30; g.lineTo(x, Math.max(4, Math.min(CELL - 4, yy))); } g.stroke(); }
  // the crack to aim for
  if (b && b.hp > 0 && b.weak !== undefined) {
    const wx = b.weak * CELL + CELL / 2, pulse = 0.6 + Math.sin(fx.t * 10) * 0.4;
    g.fillStyle = `rgba(255,190,60,${0.25 + pulse * 0.25})`; g.beginPath(); g.arc(wx, CELL / 2, 26 + pulse * 4, 0, 7); g.fill();
    g.strokeStyle = '#fff3a8'; g.lineWidth = 5; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(wx - 8, 6); g.lineTo(wx + 6, 22); g.lineTo(wx - 6, 34); g.lineTo(wx + 9, CELL - 6); g.stroke();
    g.strokeStyle = '#ff9d2e'; g.lineWidth = 2; g.stroke();
  }
  // the face: it watches the pick
  const cx = W / 2, cy = CELL / 2;
  const hurt = bossShake > 0.2;
  for (const dx of [-46, 46]) {
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx + dx, cy - 2, 17, hurt ? 6 : 15, 0, 0, 7); g.fill();
    g.strokeStyle = '#1c1830'; g.lineWidth = 2.5; g.stroke();
    if (!hurt) {
      const ax = fx.mouse.x - (cx + dx), ay = fx.mouse.y - (y + cy), d = Math.hypot(ax, ay) || 1;
      g.fillStyle = '#1c1830'; g.beginPath(); g.arc(cx + dx + ax / d * 7, cy - 2 + ay / d * 6, 7, 0, 7); g.fill();
    }
    g.strokeStyle = '#1c1830'; g.lineWidth = 6; g.beginPath();
    g.moveTo(cx + dx - Math.sign(dx) * 22, cy - 26 + (frac < 0.4 ? 8 : 0)); g.lineTo(cx + dx + Math.sign(dx) * 16, cy - 18 - (frac < 0.4 ? 6 : 0)); g.stroke();
  }
  g.strokeStyle = '#1c1830'; g.lineWidth = 5; g.beginPath();
  if (frac < 0.4) { g.moveTo(cx - 14, cy + 20); g.quadraticCurveTo(cx, cy + 8, cx + 14, cy + 20); }
  else { g.moveTo(cx - 16, cy + 18); g.lineTo(cx + 16, cy + 18); }
  g.stroke();
  g.restore();
}

ui({
  id: 'boss',
  sfx: {
    bossHit() {
      if (!gap('bossHit', 0.04)) return;
      tone(90 * wob(), { type: 'sine', d: 0.12, vol: 0.45, slide: 45 });
      noise({ d: 0.07, vol: 0.2, from: 1500, to: 300 });
    },
    bossDown() {
      if (!gap('bossDown', 0.5)) return;
      noise({ d: 1.5, vol: 0.6, from: 3000, to: 50 });
      tone(70, { type: 'sawtooth', d: 1.2, vol: 0.35, slide: 25 });
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, { type: 'triangle', d: i === 5 ? 0.9 : 0.2, vol: 0.22, at: 0.7 + i * 0.09 }));
    },
  },
  art: {
    boss: {
      colour: '#4b4460',
      row: drawBoss,
      hitSfx: () => sfx.bossHit(),
      // a hit on the crack has its own feedback; returning true tells the page core not to add its own
      hit(d, x, y, col) {
        bossShake = 1;
        if (d.src !== 'you' || d.crit || !d.weak) return false;
        debris(d.r, d.c, col, 4, 0.7);
        text(x, y - 12, fmt(d.dmg), '#ffb347', 24, 0.7); spark(x, y, '#ffb347', 8); shake(0.14); sfx.bossHit(); sfx.comboUp(0);
        return true;
      },
    },
  },
  on: {
    bossDown(d, app) {
      sfx.bossDown(); shake(1); screenFlash('#fff', 0.6); app.hitStop(0.12);
      for (let c = 0; c < G.COLS; c++) { debris(d.r, c, '#6a6384', 16, 1.6); coinBurst(d.r, c, 8); }
      const y = yOf(d.r) + CELL / 2;
      ring(W / 2, y, W * 0.7, '#fff'); ring(W / 2, y, W * 0.45, '#ffd23f');
      app.banner(t('boss_down'), t('boss_down_sub', { n: fmt(d.coins) }));
    },
  },
  // the goal bar: the Big Rock's hp while it is in view, else the way to the next one
  goal: { at: 10, fn(s) {
    const b = G.bossInView(s);
    if (b && b.hp > 0) return { text: t('goal_boss'), frac: b.hp / b.max, cls: 'boss' };
    const next = (G.layerOf(s.best) + 1) * G.LAYER;
    return { text: t('goal_rock', { n: next }), frac: (s.best % G.LAYER) / G.LAYER };
  } },
  tick(s, app) {
    const b = G.bossInView(s);
    if (b && b.hp > 0 && !s.seen.bossToast && b.row - s.top <= 6) { s.seen.bossToast = true; app.toast(t('t_boss'), 'gold'); }
  },
});
