// Dig flora feature (UI): Spore pod rendering, bioluminescent glow, mycelium particles.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, CELL, centre, ring, spark, text } from '../../ui/render.js';

const { t } = G;
const BIO_GREEN = '#22c55e', MOSS_CYAN = '#34d399', SPORE_LIME = '#a3e635';

function sporePodBlock(g, p, v) {
  // Bioluminescent organic pod base
  g.fillStyle = '#064e3b';
  g.fillRect(0, 0, CELL, CELL);

  // Fungal bulb
  g.fillStyle = BIO_GREEN;
  g.beginPath();
  g.arc(CELL / 2, CELL / 2, CELL * 0.35, 0, Math.PI * 2);
  g.fill();

  // Spore pores
  g.fillStyle = SPORE_LIME;
  for (const [ox, oy] of [[-6, -6], [6, -6], [0, 6], [-8, 4], [7, 5]]) {
    g.beginPath();
    g.arc(CELL / 2 + ox, CELL / 2 + oy, 2.5, 0, Math.PI * 2);
    g.fill();
  }

  // Soft radiant halo
  g.strokeStyle = MOSS_CYAN;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(CELL / 2, CELL / 2, CELL * 0.42, 0, Math.PI * 2);
  g.stroke();
}

ui({
  blocks: {
    sporePod: {
      draw: sporePodBlock,
      sound: 'pop',
    },
  },
  on: {
    sporeSpread(d) {
      const [x, y] = centre(d.r, d.c);
      ring(x, y, CELL * 2.2, BIO_GREEN);
      spark(x, y, SPORE_LIME, 24);
      text(x, y - 20, t('spore_burst'), BIO_GREEN, 20, 1.0);
    },
    mossPlanted(d) {
      const [x, y] = centre(d.r, d.c);
      ring(x, y, CELL * 1.5, MOSS_CYAN);
      spark(x, y, MOSS_CYAN, 16);
      text(x, y - 16, t('moss_planted'), MOSS_CYAN, 18, 0.8);
    },
  },
});
