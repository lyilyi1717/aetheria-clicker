// Dig feature (page side): the Big Rock. It draws its whole row (a face that watches the pick, a crack
// that moves), owns the goal bar, and has its own hit and break moments.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, AT, CELL, W, H, SKY, rr, seeded, centre, yOf, onFx, debris, spark, text, shake, ring, coinBurst, screenFlash } from '../../ui/render.js';
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
  // a deep crack for every tenth that has fallen off (the bar's ticks, on the stone)
  if (b && b.rub) {
    const rk = seeded(r * 7 + 3);
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < b.rub; i++) {
      let x = (i + 0.5) / 9 * W + (rk() - 0.5) * 30, yy = 4;
      g.beginPath(); g.moveTo(x, yy);
      while (yy < CELL - 6) { x += (rk() - 0.5) * 26; yy += 10 + rk() * 8; g.lineTo(x, Math.min(CELL - 4, yy)); }
      g.strokeStyle = 'rgba(8,4,20,0.9)'; g.lineWidth = 5; g.stroke();
      g.strokeStyle = 'rgba(255,170,60,0.55)'; g.lineWidth = 1.6; g.stroke();
    }
  }
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
    rubble(chest) {
      if (!gap('rubble', 0.15)) return;
      noise({ d: 0.35, vol: 0.4, from: 2200, to: 200 });
      tone(110 * wob(), { type: 'triangle', d: 0.25, vol: 0.3, slide: 55 });
      [659, 880, 1175].forEach((f, i) => tone(f, { type: 'triangle', d: 0.12, vol: 0.14, at: 0.1 + i * 0.07 }));
      if (chest) tone(1568, { type: 'triangle', d: 0.3, vol: 0.14, at: 0.35 });
    },
    record() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, { type: 'triangle', d: 0.25, vol: 0.18, at: i * 0.1 }));
      tone(1568, { type: 'triangle', d: 0.7, vol: 0.16, at: 0.45 });
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
    // a tenth of the Rock falls off: rubble, coins, a shake, a sound
    rubble(d, app) {
      bossShake = 1; sfx.rubble(d.chest);
      const [x, y] = [d.c * CELL + CELL / 2, yOf(d.r) + CELL / 2];
      for (let k = 0; k < 3; k++) debris(d.r, Math.min(G.COLS - 1, Math.max(0, d.c + k - 1)), '#6a6384', 9, 1.3);
      coinBurst(d.r, d.c, 6 + Math.min(10, d.n * 2));
      text(x, y - 20, '+' + fmt(d.coins), '#ffd23f', 26, 1);
      ring(x, y, 120, '#ffd23f'); shake(0.3 + d.n * 0.02);
      if (d.chest) { text(x, y - 52, t('rubble_chest'), '#7be0ff', 20, 1.4); spark(x, y, '#7be0ff', 14); }
    },
    record(d, app) {
      sfx.record(); screenFlash('#ffd23f', 0.4);
      app.banner(t('record_new', { n: d.n }), t('record_new_sub', { old: d.old }));
    },
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
    if (b && b.hp > 0) return { text: t('goal_boss_hits', { n: fmt(Math.max(1, Math.ceil(b.hp / G.pickPower(s)))) }), frac: b.hp / b.max, cls: 'boss' };
    const next = (G.layerOf(s.best) + 1) * G.LAYER;
    return { text: t('goal_rock', { n: next }), frac: (s.best % G.LAYER) / G.LAYER };
  } },
  css: new URL('./boss.css', import.meta.url).href,
  draw: [{ at: AT.fog + 1, fn(g, s) {
    // the flag: where this dig's record stood when it began
    if (!(s.recMark >= G.PARAMS.boss.recordMin)) return;
    const y = yOf(s.recMark);
    if (y < SKY - 10 || y > H) return;
    g.save();
    g.strokeStyle = 'rgba(255,210,63,0.55)'; g.lineWidth = 2; g.setLineDash([10, 8]);
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); g.setLineDash([]);
    const fxp = W - 170;
    g.strokeStyle = '#1b1410'; g.lineWidth = 3; g.beginPath(); g.moveTo(fxp, y); g.lineTo(fxp, y - 30); g.stroke();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(fxp, y - 30); g.lineTo(fxp + 20, y - 24); g.lineTo(fxp, y - 17); g.closePath(); g.fill(); g.stroke();
    g.font = '700 14px system-ui, sans-serif'; g.fillStyle = '#ffd23f'; g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 3;
    const label = t('record_flag', { n: s.recMark });
    g.strokeText(label, fxp + 26, y - 14); g.fillText(label, fxp + 26, y - 14);
    g.restore();
  } }],
  // the bar: nine ticks (lit once their rubble has fallen) and, on the empty part, what you did and what the Rafeeqs did
  mount() {
    const bar = document.querySelector('#goal .bar');
    if (!bar) return;
    const box = document.createElement('div');
    box.id = 'goal-split'; box.hidden = true;
    box.innerHTML = '<i class="you"></i><i class="crew"></i>';
    const ticks = document.createElement('div');
    ticks.id = 'goal-ticks'; ticks.hidden = true;
    for (let i = 1; i < 10; i++) { const k = document.createElement('i'); k.style.insetInlineStart = (100 - i * 10) + '%'; ticks.appendChild(k); }
    bar.append(box, ticks);
    const rec = document.createElement('div');
    rec.id = 'hud-record'; rec.hidden = true;
    document.getElementById('stage').appendChild(rec);
  },
  tick(s, app) {
    const box = document.getElementById('goal-split'), ticks = document.getElementById('goal-ticks'), rec = document.getElementById('hud-record');
    if (box) {
      const b = G.bossInView(s);
      const on = !!(b && b.hp > 0);
      box.hidden = ticks.hidden = !on;
      if (on) {
        const done = Math.max(0, 1 - b.hp / b.max), tot = (b.you || 0) + (b.crew || 0) || 1;
        box.style.width = (done * 100) + '%';
        box.firstChild.style.width = ((b.you || 0) / tot * 100) + '%';
        box.lastChild.style.width = ((b.crew || 0) / tot * 100) + '%';
        box.title = `${t('bar_you')} ${Math.round((b.you || 0) / tot * 100)}%   ${t('bar_crew')} ${Math.round((b.crew || 0) / tot * 100)}%`;
        const paid = b.rub || 0;
        [...ticks.children].forEach((k, i) => k.classList.toggle('paid', i + 1 <= paid));
      }
    }
    if (rec) {
      rec.hidden = !(s.bestEver >= 1);
      if (!rec.hidden) rec.textContent = t('record_line', { n: s.bestEver });
    }
    const b = G.bossInView(s);
    if (b && b.hp > 0 && !s.seen.bossToast && b.row - s.top <= 6) { s.seen.bossToast = true; app.toast(t('t_boss'), 'gold'); }
  },
});
