// Dig aquifers feature (UI): Pressure Wells, Silt erosion, Waterwheel sieve, Hydro-Pick visuals.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, AT, CELL, yOf, baseBlock, shade, rr, centre, ring, spark, shake, debris, coinBurst, text } from '../../ui/render.js';
import { sfx, gap } from '../../ui/audio.js';

const { t } = G;
const AQUA = '#38bdf8', DEEP_BLUE = '#0284c7', SILT_COL = '#a38b6d';

function pressureWellBlock(g, p, v) {
  baseBlock(g, '#475569', v, 4);
  // Circular iron well rim
  g.fillStyle = '#1e293b';
  g.beginPath();
  g.arc(32, 32, 22, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#94a3b8';
  g.lineWidth = 3;
  g.stroke();

  // Swirling pressurized water core
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 20);
  gr.addColorStop(0, '#e0f2fe');
  gr.addColorStop(0.5, AQUA);
  gr.addColorStop(1, DEEP_BLUE);
  g.fillStyle = gr;
  g.beginPath();
  g.arc(32, 32, 18, 0, Math.PI * 2);
  g.fill();

  // Pressure gauge needle / brass ring
  g.strokeStyle = '#f59e0b';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(32, 32, 10, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.moveTo(32, 32);
  const ang = (fx.t * 6) % (Math.PI * 2);
  g.lineTo(32 + Math.cos(ang) * 8, 32 + Math.sin(ang) * 8);
  g.stroke();
}

function siltBlock(g, p, v) {
  baseBlock(g, SILT_COL, v, 2);
  // Fine granular sedimentary ripple lines
  g.strokeStyle = '#856e54';
  g.lineWidth = 2;
  for (let y = 14; y <= 50; y += 10) {
    g.beginPath();
    g.moveTo(10, y);
    g.quadraticCurveTo(32, y + (y % 4 ? 3 : -3), 54, y);
    g.stroke();
  }
}

ui({
  blocks: {
    pressureWell: {
      draw: pressureWellBlock,
      sound: 'stone',
    },
    silt: {
      draw: siltBlock,
      sound: 'sand',
    },
  },
  on: {
    wellBurst(d) {
      const [x, y] = centre(d.r, d.c);
      ring(x, y, CELL * 2.2, AQUA);
      ring(x, y, CELL * 1.2, '#ffffff');
      spark(x, y, AQUA, 32);
      spark(x, y, '#e0f2fe', 16);
      shake(0.35);
      if (sfx.waterBurst) sfx.waterBurst();
    },
    siltErode(d) {
      const [x, y] = centre(d.r, d.c);
      debris(d.r, d.c, SILT_COL, 6, 0.4);
      spark(x, y, AQUA, 8);
    },
    hydroPick(d) {
      const [x, y] = centre(d.r, d.c);
      // Vertical jet blast fx
      ring(x, y, CELL * 1.5, AQUA);
      spark(x, y, '#38bdf8', 24);
      spark(x, y + CELL * 2, '#e0f2fe', 20);
      shake(0.2);
    },
    waterwheelSieve(d) {
      const [x, y] = centre(d.r, d.c);
      ring(x, y, CELL * 1.4, '#ffd23f');
      ring(x, y, CELL * 0.9, AQUA);
      coinBurst(d.r, d.c, 12);
      text(x, y - 20, t('t_waterwheel'), '#ffd23f', 18, 1.2);
    },
  },
});
