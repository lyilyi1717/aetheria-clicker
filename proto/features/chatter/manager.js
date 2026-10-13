// Dig feature (page side): almodeer, the manager. A drawn figure at the top of the stage, between the coins pill and the depth pill with a clipboard, a whistle and a
// glass of tea, and a text box. NOT a Rafeeq: he is never in s.diggers, has no seat, does nothing to the dig. The rules are
// `chatterBossStep` in ./rules.js; this file feeds it (is the player digging? is a card open?) and draws him.
import * as G from '../../game.js';
import { fx, rr } from '../../ui/render.js';
import { moodsMem, moodsSay } from '../moods/ui.js';

const INK = '#1b1410';
export const bossView = G.chatterBossMem();                // the page's own memory (never saved); shots and tests read it
const mem = bossView;
const live = { held: false, hitAt: -99, clock: 0, auto: false, autoCheck: -9, emote: null, mounted: false, shownT: 0 };
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function managerMount(app) {
  if (live.mounted) return;
  live.mounted = true;
  app.el.stage.addEventListener('pointerdown', e => { if (e.button === 0) live.held = true; });
  window.addEventListener('pointerup', () => { live.held = false; });
}
export const managerHit = d => { if (d.src !== 'crew') live.hitAt = live.clock; };
export const managerAway = s => { if (G.chatterBossShown(s)) mem.welcome = true; };
export const managerOnOrder = fn => { live.emote = fn; };

function digging() {
  // digging is always automatic: the player is digging while the pick lands (or the button is held)
  return live.held || live.clock - live.hitAt < 0.5;
}

// one frame: the rules, the answer of the Rafeeq he called, then the picture
export function drawManager(g, s, dt) {
  dt = Math.min(dt || 0.016, 0.1); live.clock += dt;
  const shown = G.chatterBossShown(s);
  const ev = G.chatterBossStep(s, mem, dt, { muted: moodsMem.mute, digging: digging(), rnd: Math.random });
  if (ev === 'order' && mem.lineTo >= 0 && live.emote) live.emote(s.diggers[mem.lineTo]);
  if (mem.answerIn === -2) {
    mem.answerIn = -1;
    const d = s.diggers[mem.answerTo];
    if (d && !s.chatterQuiet) {
      const own = G.chatterNickLines(s, mem.answerTo);
      const pool = own.length && Math.random() < 0.6 ? own : G.chatterLines(G.chatterTrait(s, mem.answerTo), 'patted');
      moodsSay(d, G.chatterPick(moodsMem, mem.answerTo, pool, Math.random()));
    }
  }
  live.shownT = Math.max(0, Math.min(1, live.shownT + (shown ? dt * 3 : -dt * 3)));
  if (live.shownT <= 0) return;
  const k = live.shownT, T = live.clock;
  const jump = mem.jump > 0 ? Math.sin(Math.min(1, (0.5 - mem.jump) / 0.5) * Math.PI) * 12 : 0;
  const x0 = 250, y0 = 92 - (1 - k) * 90;   // to the right of the combo banner and the coins pill, under the top line
  const sleep = mem.asleep, nod = sleep && !reduced ? Math.sin(T * 1.6) * 1.2 : 0;
  g.save(); g.translate(x0, y0 - jump);
  g.lineJoin = 'round'; g.lineCap = 'round';
  // body (a white thobe) and the whistle on its string
  g.beginPath(); g.moveTo(-14, 0); g.lineTo(-11, -36); g.quadraticCurveTo(0, -42, 11, -36); g.lineTo(14, 0); g.closePath();
  g.fillStyle = '#f5efe1'; g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
  g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-3, -38); g.lineTo(4, -29); g.stroke();
  g.fillStyle = '#c9d0d8'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(5, -28, 3.6, 2.4, 0.3, 0, 7); g.fill(); g.stroke();
  // head and ghutra
  const hy = -50 + (sleep ? 5 : 0) + nod, hx = sleep ? 2 : 0;
  g.lineWidth = 2;
  g.fillStyle = '#c58b5b'; g.beginPath(); g.arc(hx, hy, 9, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(hx - 11, hy + 6); g.quadraticCurveTo(hx - 12, hy - 14, hx, hy - 13); g.quadraticCurveTo(hx + 12, hy - 14, hx + 11, hy + 6);
  g.lineTo(hx + 8, hy - 2); g.quadraticCurveTo(hx, hy - 7, hx - 8, hy - 2); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = INK; g.lineWidth = 2.4; g.beginPath(); g.arc(hx, hy - 6, 9.5, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  g.fillStyle = INK; g.lineWidth = 1.6;
  if (sleep) { g.beginPath(); g.moveTo(hx - 5, hy + 1); g.lineTo(hx - 2, hy + 2); g.moveTo(hx + 2, hy + 2); g.lineTo(hx + 5, hy + 1); g.stroke(); }
  else { const r = mem.jump > 0 ? 2.5 : 1.6; g.beginPath(); g.arc(hx - 3.5, hy + 1, r, 0, 7); g.moveTo(hx + 3.5 + r, hy + 1); g.arc(hx + 3.5, hy + 1, r, 0, 7); g.fill(); }
  g.beginPath(); g.moveTo(hx - 3, hy + 6); g.quadraticCurveTo(hx, hy + (mem.sipLeft > 0 ? 5 : 7.5), hx + 3, hy + 6); g.stroke();
  // the clipboard hand (it waves for a welcome)
  const wv = mem.wave > 0 && !reduced ? Math.sin(T * 12) * 4 : 0;
  if (mem.wave > 0) {
    g.strokeStyle = INK; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-11, -32); g.quadraticCurveTo(-20, -40, -18 + wv, -56); g.stroke();
    g.fillStyle = '#c58b5b'; g.beginPath(); g.arc(-18 + wv, -57, 3, 0, 7); g.fill();
  } else {
    g.fillStyle = '#8a5a2b'; rr(g, -26, -34, 15, 20, 2); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke();
    g.fillStyle = '#fffdf2'; g.fillRect(-24, -31, 11, 15);
    g.strokeStyle = '#8a8a8a'; g.lineWidth = 1; g.beginPath(); for (let n = 0; n < 4; n++) { g.moveTo(-23, -28 + n * 3.4); g.lineTo(-15, -28 + n * 3.4); } g.stroke();
    g.fillStyle = '#c9d0d8'; g.fillRect(-21, -36, 5, 3);
  }
  // the glass of tea (istikana: waisted, gold rim); a sip lifts it to his mouth
  const sipLen = mem.wave > 0 ? 2 : 1.5;
  const up = mem.sipLeft > 0 ? Math.sin(Math.min(1, 1 - mem.sipLeft / sipLen) * Math.PI) : 0;
  const gx = 17 - up * 11, gy = -24 - up * 17 + (sleep ? 6 : 0);
  g.strokeStyle = INK; g.lineWidth = 2.4; g.beginPath(); g.moveTo(11, -32); g.quadraticCurveTo(14 - up * 4, -26 - up * 8, gx - 1, gy + 3); g.stroke();
  g.save(); g.translate(gx, gy); g.rotate(sleep ? 0.7 : 0);
  g.beginPath(); g.moveTo(-4.5, -7); g.lineTo(4.5, -7); g.quadraticCurveTo(2, -1, 3.5, 7); g.lineTo(-3.5, 7); g.quadraticCurveTo(-2, -1, -4.5, -7); g.closePath();
  g.fillStyle = '#a8431a'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.4; g.stroke();
  g.strokeStyle = '#e8b830'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-4.8, -7); g.lineTo(4.8, -7); g.stroke();
  g.restore();
  if (!sleep) {
    const w = reduced ? 0 : Math.sin(T * 3) * 1.6;
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.5; g.beginPath();
    g.moveTo(gx - 1, gy - 9); g.quadraticCurveTo(gx - 3 + w, gy - 14, gx - 1, gy - 18); g.moveTo(gx + 2, gy - 9); g.quadraticCurveTo(gx + 4 - w, gy - 13, gx + 2, gy - 17); g.stroke();
  }
  if (mem.spill > 0) { const f = (1.4 - mem.spill) / 1.4; g.fillStyle = '#a8431a'; g.beginPath(); g.ellipse(gx + 6, gy + 6 + f * 22, 2, 3, 0, 0, 7); g.fill(); }
  if (sleep) {
    for (let n = 0; n < 2; n++) {
      const ph = (T * 0.5 + n * 0.5) % 1;
      g.globalAlpha = 1 - ph; g.font = `bold ${11 + n * 4}px system-ui, sans-serif`; g.textAlign = 'start'; g.strokeStyle = INK; g.lineWidth = 3; g.fillStyle = '#e8f1ff';
      g.strokeText('z', 12 + ph * 8, -60 - ph * 16 - n * 6); g.fillText('z', 12 + ph * 8, -60 - ph * 16 - n * 6);
    }
    g.globalAlpha = 1;
  }
  if (mem.jump > 0) {
    g.font = 'bold 22px system-ui, sans-serif'; g.textAlign = 'center'; g.strokeStyle = INK; g.lineWidth = 4; g.fillStyle = '#ffd23f';
    g.strokeText('!', 18, -72); g.fillText('!', 18, -72);
  }
  g.restore();
  // the name plate
  g.save(); g.globalAlpha = k; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 11px system-ui, sans-serif';
  const nm = G.t('boss_name') + '  ' + G.t('boss_name_ar'), pw = g.measureText(nm).width + 12;
  rr(g, x0 - pw / 2, y0 + 3, pw, 14, 5); g.fillStyle = '#2b2118'; g.fill(); g.fillStyle = '#ffd23f'; g.fillText(nm, x0, y0 + 10.5);
  g.restore();
  // the text box
  if (mem.line && !s.chatterQuiet) {
    g.save(); g.globalAlpha = Math.min(1, mem.lineLeft * 3) * k; g.font = 'bold 14px system-ui, sans-serif'; g.textAlign = 'start'; g.textBaseline = 'middle';
    const rows = [''];
    for (const w of mem.line.split(' ')) { const cur = rows[rows.length - 1], tryRow = cur ? cur + ' ' + w : w; if (g.measureText(tryRow).width > 190 && cur) rows.push(w); else rows[rows.length - 1] = tryRow; }
    const w = Math.max(...rows.map(r => g.measureText(r).width)) + 20, h = rows.length * 17 + 10, bx = x0 + 36, by = 24;
    rr(g, bx, by, w, h, 8); g.fillStyle = '#fffdf2'; g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.moveTo(bx + 1, by + 14); g.lineTo(bx - 9, by + 22); g.lineTo(bx + 1, by + 26); g.fillStyle = '#fffdf2'; g.fill(); g.stroke();
    g.fillStyle = INK; rows.forEach((r, n) => g.fillText(r, bx + 10, by + 14 + n * 17));
    g.restore();
  }
}
