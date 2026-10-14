// Dig void feature (UI): Chrono echo block drawing and temporal replay ripple animations.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, CELL, centre, ring, spark, text } from '../../ui/render.js';

const { t } = G;
const VIOLET = '#8b5cf6', FUCHSIA = '#d946ef';

function chronoBlock(g, p, v) {
  // Chrono temporal block body
  g.fillStyle = '#2e1065';
  g.fillRect(0, 0, CELL, CELL);

  // Hourglass icon
  g.strokeStyle = FUCHSIA;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(12, 12);
  g.lineTo(CELL - 12, 12);
  g.lineTo(12, CELL - 12);
  g.lineTo(CELL - 12, CELL - 12);
  g.closePath();
  g.stroke();

  // Temporal particle inside
  g.fillStyle = '#c084fc';
  g.beginPath();
  g.arc(CELL / 2, CELL / 2, 3, 0, Math.PI * 2);
  g.fill();
}

ui({
  blocks: {
    chrono: {
      draw: chronoBlock,
      sound: 'crystal',
    },
  },
  on: {
    chronoReplayed(d) {
      ring(d.col * CELL + CELL / 2, 200, CELL * 1.5, VIOLET);
      spark(d.col * CELL + CELL / 2, 200, FUCHSIA, 12);
      text(d.col * CELL + CELL / 2, 180, t('chrono_replay'), FUCHSIA, 18, 0.8);
    },
  },
});
