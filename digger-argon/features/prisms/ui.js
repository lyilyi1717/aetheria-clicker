// Dig prisms feature (UI): Prism block rendering, laser refraction beams.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, CELL, centre, ring, spark, shake, text } from '../../ui/render.js';

const { t } = G;
const CYAN = '#06b6d4', SKY = '#38bdf8', WHITE = '#ffffff';

function prismBlock(g, p, v) {
  // Calcite crystal geometric body
  g.fillStyle = '#0e7490';
  g.fillRect(0, 0, CELL, CELL);

  // Triangular prism facet
  g.fillStyle = 'rgba(255, 255, 255, 0.4)';
  g.beginPath();
  g.moveTo(CELL / 2, 6);
  g.lineTo(CELL - 6, CELL - 8);
  g.lineTo(6, CELL - 8);
  g.closePath();
  g.fill();

  // Prism refractive edges
  g.strokeStyle = SKY;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(CELL / 2, 6);
  g.lineTo(CELL / 2, CELL - 8);
  g.stroke();

  // Rainbow spectral sheen
  g.strokeStyle = 'rgba(244, 114, 182, 0.6)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(8, CELL - 14);
  g.lineTo(CELL - 8, 14);
  g.stroke();
}

ui({
  blocks: {
    prism: {
      draw: prismBlock,
      sound: 'crystal',
    },
  },
  on: {
    laserRefracted(d) {
      shake(0.35);
      const [x, y] = centre(d.r, d.c);
      ring(x, y, CELL * 2.5, CYAN);
      spark(x, y, WHITE, 32);
      text(x, y - 22, t('laser_refracted'), SKY, 22, 1.2);
    },
    crystalSpireUnlocked() {
      spark(480, 100, SKY, 40);
    },
  },
});
