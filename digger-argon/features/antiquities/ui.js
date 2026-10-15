// Dig feature: Antiquity Restoration Lab (UI side)
// Renders sockets, floating feedback, and listens to antiquity events.

import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, CELL, centre, ring, spark, shake, text } from '../../ui/render.js';
import { sfx } from '../../ui/audio.js';

const { t } = G;
const GOLD = '#ffd23f', PURPLE = '#c084fc';

// ---------- Interactive Tactile Brush Minigame & Restoration Lab Modal (Issue B1 / M6) ----------
export function openRestorationLab(s, specimenId, app) {
  const specs = (s.museum && s.museum.specimens) || s.specimens || {};
  let spec = specs[specimenId];
  if (!spec) {
    spec = { id: specimenId, grade: 7, clean: false, restored: false, brushStrokes: 0, excavatedAt: Date.now() };
    specs[specimenId] = spec;
  }

  const m = app.modal.open('restoration-lab', `<div class="restoration-lab-modal">
    <div class="restoration-head">
      <h2>${t('restoration_lab_title')}</h2>
      <button class="ghost res-close">${t('rq_close') || 'Close'}</button>
    </div>
    <p class="res-sub">${t('restoration_sub')}</p>
    <div class="res-body">
      <div class="res-canvas-container">
        <canvas class="res-canvas" width="100" height="100"></canvas>
        <div class="res-overlay-debris"></div>
      </div>
      <div class="res-controls">
        <div class="res-progress-wrap">
          <div class="res-progress-bar" style="width: ${(spec.brushStrokes || 0) * 20}%"></div>
        </div>
        <div class="res-status">${t('restoration_cleared', { n: (spec.brushStrokes || 0) * 20 })}</div>
        <button class="primary res-brush-btn" ${spec.restored ? 'disabled' : ''}>
          ${spec.restored ? t('restoration_done') : t('restoration_brush_btn', { n: (spec.brushStrokes || 0) + 1 })}
        </button>
      </div>
    </div>
  </div>`);

  if (!m) return;
  const canvas = m.querySelector('.res-canvas');
  const btn = m.querySelector('.res-brush-btn');
  const statusEl = m.querySelector('.res-status');
  const barEl = m.querySelector('.res-progress-bar');
  const ctx = canvas.getContext('2d');

  function drawCanvas() {
    ctx.clearRect(0, 0, 100, 100);
    // Draw background antique slab
    ctx.fillStyle = '#2a1a24';
    ctx.fillRect(0, 0, 100, 100);

    // Draw specimen outline
    ctx.fillStyle = spec.restored ? '#ffd700' : '#d2b48c';
    ctx.beginPath();
    ctx.arc(50, 50, 30, 0, Math.PI * 2);
    ctx.fill();

    // Draw remaining encrusted debris
    const remaining = Math.max(0, 100 - (spec.brushStrokes || 0) * 20);
    if (remaining > 0) {
      ctx.fillStyle = `rgba(100, 75, 55, ${remaining / 100 * 0.9})`;
      for (let i = 0; i < remaining / 5; i++) {
        const x = (i * 17) % 90 + 5;
        const y = (i * 23) % 90 + 5;
        ctx.fillRect(x, y, 12, 12);
      }
    }
  }

  drawCanvas();

  m.querySelector('.res-close').addEventListener('click', () => {
    app.modal.close();
  });

  btn.addEventListener('click', () => {
    if (spec.restored) return;
    const res = G.brushMinigameStroke(s, specimenId, app.emit);
    drawCanvas();
    barEl.style.width = `${res.clearedPercent}%`;
    statusEl.textContent = t('restoration_cleared', { n: res.clearedPercent });

    // Crisp brushing audio feedback & screen sparks
    if (sfx.brush) sfx.brush();
    else if (sfx.click) sfx.click();

    if (res.restored) {
      btn.disabled = true;
      btn.textContent = t('restoration_done');
      if (sfx.win) sfx.win();
      shake(0.3);
      app.toast(t('restoration_done'), 'antiquity');
    } else {
      btn.textContent = t('restoration_brush_btn', { n: res.stroke + 1 });
    }
  });
}

ui({
  sfx: {
    brush() {
      // Crisp brushing SFX
      [600, 750, 900].forEach((f, i) => tone(f, { type: 'triangle', d: 0.05, vol: 0.15, at: i * 0.03 }));
    },
  },
  on: {
    antiquityRestored(d) {
      if (sfx.win) sfx.win();
      shake(0.2);
    },
    antiquityEquipped(d) {
      if (sfx.click) sfx.click();
    },
    labBrushStroke(d) {
      if (sfx.brush) sfx.brush();
    },
    labRestorationComplete(d) {
      if (sfx.win) sfx.win();
      shake(0.3);
    },
    siphonDamage(d) {
      const topRow = (window.dig && window.dig.state && window.dig.state.top) || 0;
      const [x, y] = centre(topRow, 3);
      ring(x, y, CELL * 2, PURPLE);
      spark(x, y, '#a855f7', 16);
      spark(x, y, '#ffd23f', 8);
      text(x, y - 28, t('siphon_damage', { n: d.dmg }), PURPLE, 20, 1.4);
    },
    mortarBoost(d) {
      const topRow = (window.dig && window.dig.state && window.dig.state.top) || 0;
      const [x, y] = centre(topRow, 3);
      ring(x, y, CELL * 2.5, GOLD);
      spark(x, y, '#fbbf24', 24);
      shake(0.25);
      text(x, y - 30, t('mortar_boost'), GOLD, 22, 1.5);
    },
  },
});
