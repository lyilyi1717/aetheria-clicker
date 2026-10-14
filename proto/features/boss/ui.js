// Dig feature (page side): the Big Rock. It draws its whole row (a face that watches the pick, a crack
// that moves, its health bar and the hits left), and has its own hit and break moments.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, AT, CELL, W, H, SKY, rr, seeded, centre, yOf, onFx, debris, spark, text, shake, ring, coinBurst, screenFlash } from '../../ui/render.js';
import { nextMap } from '../sites/ui.js';
import { sfx, gap, tone, noise, wob } from '../../ui/audio.js';
import { textDir } from '../../core/lang.js';

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
  drawGateCracks(g, b, r);
  // the crack to aim for
  if (b && b.hp > 0 && b.weak !== undefined) {
    const wx = b.weak * CELL + CELL / 2, pulse = 0.6 + Math.sin(fx.t * 10) * 0.4;
    g.fillStyle = `rgba(255,190,60,${0.25 + pulse * 0.25})`; g.beginPath(); g.arc(wx, CELL / 2, 26 + pulse * 4, 0, 7); g.fill();
    g.strokeStyle = '#fff3a8'; g.lineWidth = 5; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(wx - 8, 6); g.lineTo(wx + 6, 22); g.lineTo(wx - 6, 34); g.lineTo(wx + 9, CELL - 6); g.stroke();
    g.strokeStyle = '#ff9d2e'; g.lineWidth = 2; g.stroke();
  }
  // the face: it watches the pick (a little smaller and higher, so the bar fits under it)
  const hurt = bossShake > 0.2, FY = 23;
  g.save(); g.translate(W / 2, FY); g.scale(0.8, 0.8);
  for (const dx of [-46, 46]) {
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(dx, -2, 17, hurt ? 6 : 15, 0, 0, 7); g.fill();
    g.strokeStyle = '#1c1830'; g.lineWidth = 2.5; g.stroke();
    if (!hurt) {
      const ax = fx.mouse.x - (W / 2 + dx), ay = fx.mouse.y - (y + FY), d = Math.hypot(ax, ay) || 1;
      g.fillStyle = '#1c1830'; g.beginPath(); g.arc(dx + ax / d * 7, -2 + ay / d * 6, 7, 0, 7); g.fill();
    }
    g.strokeStyle = '#1c1830'; g.lineWidth = 6; g.beginPath();
    g.moveTo(dx - Math.sign(dx) * 22, -26 + (frac < 0.4 ? 8 : 0)); g.lineTo(dx + Math.sign(dx) * 16, -18 - (frac < 0.4 ? 6 : 0)); g.stroke();
  }
  g.strokeStyle = '#1c1830'; g.lineWidth = 5; g.beginPath();
  if (frac < 0.4) { g.moveTo(-14, 20); g.quadraticCurveTo(0, 8, 14, 20); }
  else { g.moveTo(-16, 18); g.lineTo(16, 18); }
  g.stroke();
  g.restore();
  if (b && b.hp > 0) drawBar(g, s, b);
  g.restore();
}

// The Gate remembers: the damage kept from the last try is cracked into the stone from the start, in proportion
// (the more banked, the more long cracks; they are dark with a faint blue edge, so they differ from this try's cracks).
function drawGateCracks(g, b, r) {
  const bank = G.bossGateBank(b);
  if (!(bank > 0)) return;
  const rk = seeded(r * 13 + 5), n = Math.max(2, Math.round(bank * 18));
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    let x = (i + rk()) / n * W, yy = 3;
    g.beginPath(); g.moveTo(x, yy);
    while (yy < CELL - 5) { x += (rk() - 0.5) * 30; yy += 9 + rk() * 9; g.lineTo(x, Math.min(CELL - 4, yy)); }
    g.strokeStyle = 'rgba(8,4,20,0.85)'; g.lineWidth = 3.5; g.stroke();
    g.strokeStyle = 'rgba(120,200,255,0.5)'; g.lineWidth = 1; g.stroke();
  }
  g.restore();
}

// The Rock's health, on the Rock: three layers (blue over yellow over red over a dark empty bar), nine ticks (dark once their
// rubble has fallen), a thin strip of who did the damage (gold yours, blue the Rafeeqs'), and the hits left written on it.
const BAR = { x: 16, y: 45, h: 14 };
function drawBar(g, s, b) {
  const bx = BAR.x, bw = W - BAR.x * 2, by = BAR.y, bh = BAR.h;
  const f = Math.max(0, Math.min(1, b.hp / b.max)), n = Math.min(2, Math.floor(f * 3 - 1e-9)), part = Math.min(1, f * 3 - n);
  const under = ['#0e0a07', '#e5533d', '#ffd23f'][n], top = ['#e5533d', '#ffd23f', '#4aa8ff'][n];
  g.save();
  rr(g, bx, by, bw, bh, 7); g.clip();
  g.fillStyle = under; g.fillRect(bx, by, bw, bh);
  g.fillStyle = top; g.fillRect(bx, by, bw * part, bh);
  // who did the damage: a strip along the foot, from the right end (where the damage starts) inwards
  const done = Math.max(0, 1 - b.hp / b.max), tot = (b.you || 0) + (b.crew || 0) || 1;
  if (done > 0) {
    const wd = bw * done, x0 = bx + bw - wd, wy = wd * (b.you || 0) / tot;
    g.fillStyle = '#ffd23f'; g.fillRect(x0, by + bh - 4, wy, 4);
    g.fillStyle = '#4aa8ff'; g.fillRect(x0 + wy, by + bh - 4, wd - wy, 4);
  }
  for (let i = 1; i < 10; i++) { g.fillStyle = i <= (b.rub || 0) ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.35)'; g.fillRect(bx + bw * (1 - i / 10) - 1, by, 2, bh); }
  g.restore();
  rr(g, bx, by, bw, bh, 7); g.strokeStyle = '#1c1830'; g.lineWidth = 2; g.stroke();
  const sw = G.bossSwings(s, b), gate = s.run && !s.run.done && s.run.floor === b.row;
  const label = t((gate ? 'rock_gate_' : 'rock_') + (sw.n === 1 ? 'swing' : 'swings'), { n: fmt(sw.n), time: t('time_' + sw.time.unit, { n: sw.time.n }) });
  g.save(); g.font = '800 13px system-ui, Cairo, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = 3.5; g.strokeStyle = 'rgba(14,10,7,.95)'; g.fillStyle = '#fff';
  g.direction = textDir(label); g.strokeText(label, W / 2, by + bh / 2 + 0.5); g.fillText(label, W / 2, by + bh / 2 + 0.5);
  g.restore();
  // the law of this layer, said while it is in force: one short line above the bar
  const tell = G.bossTell(s, b);
  if (tell) {
    const nolamp = tell.r === undefined, base = 'rock_tell_' + tell.kind;
    const txt = t(nolamp && tell.kind !== 'lit' ? base + (tell.kind === 'dark' ? '_nolamp' : tell.kind === 'grow' ? '_notorch' : '_nowater') : base, { n: tell.pct });
    g.save(); g.font = '800 13px system-ui, Cairo, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = 3.5; g.strokeStyle = 'rgba(14,10,7,.95)'; g.fillStyle = tell.kind === 'lit' ? '#9dffcf' : '#ffd36a';
    const pw = g.measureText(txt).width + 16;
    g.fillStyle = 'rgba(14,10,7,.6)'; rr(g, W / 2 - pw / 2, by - 19, pw, 20, 10); g.fill();
    g.fillStyle = tell.kind === 'lit' ? '#9dffcf' : '#ffd36a';
    g.direction = textDir(txt); g.strokeText(txt, W / 2, by - 9); g.fillText(txt, W / 2, by - 9);
    g.restore();
  }
}

// The stuck hint: one kind line under the Rock's bar, drawn as a small box in the row below the Rock. Once per fight.
function paintHint(s, app) {
  const h = document.getElementById('boss-hint');
  if (!h) return;
  const b = G.bossInView(s);
  const show = !!b && !b.off && G.bossStuck(s);
  if (!show) { if (!h.hidden) h.hidden = true; return; }
  const bn = document.getElementById('banner');
  if (bn && bn.classList.contains('show')) { h.hidden = true; h._sig = ''; return; }     // the layer name is on screen: wait, so the box never covers it
  const a = G.bossAdvice(s);
  const sig = a.kind + ':' + a.n + ':' + a.after;
  const law = a.kind === 'dark' || a.kind === 'grow' || a.kind === 'hot';
  if (h._sig !== sig) {
    h._sig = sig; h._advice = a;
    h.querySelector('.bh-t').textContent = t('stuck_' + a.kind, { n: fmt(a.n), hits: fmt(a.hits), after: fmt(a.after) });
    const go = h.querySelector('.bh-go');
    go.hidden = a.kind === 'more' || law;
    go.textContent = t(a.kind === 'spend' ? 'stuck_btn_spend' : 'stuck_btn_map');
    h.querySelector('.bh-x').textContent = t('stuck_close');
  }
  h.style.top = ((yOf(b.row) + CELL + 6) / H * 100) + '%';
  h.hidden = false;
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
        if (d.blast) {      // TNT on the Rock: a share of the bar, shown as one
          debris(d.r, d.c, col, 10, 1.2);
          text(x, y - 16, t('rock_blast', { n: Math.max(1, Math.round(100 * d.share)) }), '#ff9a3c', 26, 0.9); spark(x, y, '#ffb347', 10); shake(0.4);
          return true;
        }
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
  // the goal line: the way to the next Big Rock. While a Rock stands its health is drawn on the Rock itself.
  goal: { at: 10, fn(s) {
    const b = G.bossInView(s);
    if (b && b.hp > 0) return null;
    const next = (G.layerOf(s.best) + 1) * G.LAYER;
    return { text: t('goal_rock', { n: next }), frac: (s.best % G.LAYER) / G.LAYER };
  } },
  css: new URL('./boss.css', import.meta.url).href,
  draw: [{ at: AT.fog + 1, fn(g, s) {
    // the flag: where this dig's record stood when it began
    if (!(s.recMark >= G.PARAMS.boss.recordMin)) return;
    if (G.bossInView(s) || G.isBossRow(s.recMark)) return;     // never on a Rock row; while a Rock stands the record shows in the corner
    const y = yOf(s.recMark);
    if (y < SKY - 10 || y > H) return;
    g.save();
    g.strokeStyle = 'rgba(255,210,63,0.55)'; g.lineWidth = 2; g.setLineDash([10, 8]);
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); g.setLineDash([]);
    const fxp = W - 170;
    g.strokeStyle = '#1b1410'; g.lineWidth = 3; g.beginPath(); g.moveTo(fxp, y); g.lineTo(fxp, y - 30); g.stroke();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(fxp, y - 30); g.lineTo(fxp + 20, y - 24); g.lineTo(fxp, y - 17); g.closePath(); g.fill(); g.stroke();
    g.font = '700 14px system-ui, Cairo, sans-serif'; g.fillStyle = '#ffd23f'; g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 3;
    const label = t('record_flag', { n: s.recMark });
    g.textAlign = 'left'; g.direction = textDir(label); g.strokeText(label, fxp + 26, y - 14); g.fillText(label, fxp + 26, y - 14);
    g.restore();
  } }],
  mount(app) {
    const rec = document.createElement('div');
    rec.id = 'hud-record'; rec.hidden = true;
    document.getElementById('stage').appendChild(rec);
    const h = document.createElement('div');
    h.id = 'boss-hint'; h.hidden = true;
    h.innerHTML = '<span class="bh-t"></span><button class="bh-go" type="button"></button><button class="bh-x" type="button"></button>';
    h.querySelector('.bh-x').addEventListener('click', () => { const b = G.bossInView(app.state); if (b) b.off = true; h.hidden = true; });
    h.querySelector('.bh-go').addEventListener('click', () => {
      const b = G.bossInView(app.state), a = h._advice;
      if (!a || !b) return;
      if (a.kind === 'spend') { app.unlockAudio(); if (G.buy(app.state, 'tr_pick', app.ev)) { app.bump(h); app.refresh(true); app.dirty('starshop'); } else app.sfx.deny(); }
      else if (!app.modal.id && nextMap.open) { try { nextMap.open(app, { from: null }); } catch (e) { console.error(e); } }
      b.off = true; h.hidden = true;
    });
    document.getElementById('stage').appendChild(h);
  },
  tick(s, app) {
    const rec = document.getElementById('hud-record');
    if (rec) {
      rec.hidden = !(s.bestEver >= 1);
      if (!rec.hidden) rec.textContent = t('record_line', { n: s.bestEver });
    }
    paintHint(s, app);
    const b = G.bossInView(s);
    if (b && b.gate && b.bank0 > 0 && !b.said && b.row - s.top <= 8) { b.said = true; app.lesson('gatemem', t('gate_remember', { n: Math.round(b.bank0 * 100) }), 'gold'); }
    fx.keepClear = b && b.hp > 0 ? b.row : null;
    if (b && b.hp > 0 && !s.seen.bossToast && b.row - s.top <= 6) { s.seen.bossToast = true; app.toast(t('t_boss'), 'gold'); }
  },
});
