// Dig geothermal feature (UI): Basalt block, Obsidian shattering, Heat meter, Magma Burst fx.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, AT, CELL, yOf, baseBlock, shade, rr, centre, ring, spark, shake, debris, text } from '../../ui/render.js';
import { sfx } from '../../ui/audio.js';

const { t } = G;
const ORANGE = '#f97316', RED = '#ef4444', OBSIDIAN_COL = '#312e81';

function basaltBlock(g, p, v) {
  baseBlock(g, '#1c1917', v, 4);
  // Glowing magma fissures
  g.strokeStyle = ORANGE;
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(14, 18);
  g.lineTo(28, 30);
  g.lineTo(24, 46);
  g.moveTo(42, 14);
  g.lineTo(34, 28);
  g.lineTo(50, 48);
  g.stroke();

  // Core heat glow
  g.strokeStyle = '#fef08a';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(27, 29);
  g.lineTo(25, 38);
  g.moveTo(35, 27);
  g.lineTo(44, 40);
  g.stroke();
}

ui({
  blocks: {
    basalt: {
      draw: basaltBlock,
      sound: 'stone',
    },
  },
  on: {
    obsidianShatter(d) {
      const [x, y] = centre(d.r, d.c);
      ring(x, y, CELL * 3, OBSIDIAN_COL);
      spark(x, y, '#818cf8', 30);
      shake(0.3);
    },
    magmaBurst(d) {
      const [x, y] = centre(d.r, d.c);
      ring(x, y, CELL * 2.5, ORANGE);
      ring(x, y, CELL * 1.5, RED);
      spark(x, y, '#fbbf24', 28);
      spark(x, y, RED, 20);
      shake(0.4);
      text(x, y - 24, t('magma_burst'), ORANGE, 22, 1.2);
    },
    lavaQuenched(d) {
      const [x, y] = centre(d.r, d.c);
      spark(x, y, '#e2e8f0', 16);
      ring(x, y, CELL * 1.2, '#94a3b8');
    },
  },
});
