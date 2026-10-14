import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { CELL, baseBlock, shade, rr, centre, debris, spark, ring, shake, screenFlash } from '../../ui/render.js';
import { sfx } from '../../ui/audio.js';

const { t } = G;

ui({
  id: 'landmarks',
  art: {
    fuse: {
      colour: '#2a2421',
      twinkle: true,
      glow: '255,140,0',
      sprite(g, p, v) {
        baseBlock(g, '#24201e', v, 1);
        g.strokeStyle = '#c86428';
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(CELL / 2, 0);
        g.lineTo(CELL / 2, CELL);
        g.stroke();
        g.strokeStyle = '#ffaa33';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(CELL / 2, 0);
        g.lineTo(CELL / 2, CELL);
        g.stroke();
        // Spark in center
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(CELL / 2, CELL / 2, 3, 0, Math.PI * 2);
        g.fill();
      },
    },
    dhab: {
      colour: '#b38235',
      twinkle: false,
      glow: '212,175,55',
      sprite(g, p, v) {
        baseBlock(g, '#8c6527', v, 1);
        // Curled sleepy lizard body
        g.fillStyle = '#bfa15f';
        g.beginPath();
        g.arc(CELL / 2, CELL / 2, 18, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#594017';
        g.lineWidth = 2;
        g.stroke();
        // Tail spines
        g.fillStyle = '#e5c158';
        for (let a = 0; a < Math.PI * 2; a += 0.8) {
          const sx = CELL / 2 + Math.cos(a) * 19;
          const sy = CELL / 2 + Math.sin(a) * 19;
          g.fillRect(sx - 2, sy - 2, 4, 4);
        }
        // Closed sleepy eye
        g.strokeStyle = '#2b1d0b';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(CELL / 2 + 5, CELL / 2 - 4, 4, 0, Math.PI);
        g.stroke();
      },
    },
    lighthouse: {
      colour: '#1b3a4b',
      twinkle: true,
      glow: '255,255,200',
      sprite(g, p, v) {
        baseBlock(g, '#1a2b3c', v, 1);
        // Generator core
        rr(g, 12, 12, CELL - 24, CELL - 24, 6);
        g.fillStyle = '#0f4c5c';
        g.fill();
        g.strokeStyle = '#e36414';
        g.lineWidth = 2;
        g.stroke();
        // Lantern glowing bulb
        g.fillStyle = '#ffffba';
        g.beginPath();
        g.arc(CELL / 2, CELL / 2, 10, 0, Math.PI * 2);
        g.fill();
      },
    },
    aqueduct: {
      colour: '#4682b4',
      twinkle: true,
      glow: '100,200,255',
      sprite(g, p, v) {
        baseBlock(g, '#5c677d', v, 2);
        // Water channel
        g.fillStyle = '#48cae4';
        g.fillRect(4, 16, CELL - 8, 14);
        g.strokeStyle = '#0077b6';
        g.lineWidth = 1.5;
        g.strokeRect(4, 16, CELL - 8, 14);
        // Stone arches
        g.fillStyle = '#33415c';
        g.beginPath();
        g.arc(CELL / 2, CELL, 14, Math.PI, 0);
        g.fill();
      },
    },
    obsidian: {
      colour: '#240046',
      twinkle: true,
      glow: '157,78,221',
      sprite(g, p, v) {
        baseBlock(g, '#10002b', v, 0);
        g.fillStyle = '#3c096c';
        g.beginPath();
        g.moveTo(CELL / 2, 6);
        g.lineTo(CELL - 8, CELL / 2);
        g.lineTo(CELL / 2, CELL - 6);
        g.lineTo(8, CELL / 2);
        g.closePath();
        g.fill();
        g.strokeStyle = '#c77dff';
        g.lineWidth = 1.5;
        g.stroke();
      },
    },
  },
  on: {
    dhabAwake(d) {
      const [x, y] = centre(d.r, d.c);
      spark(x, y, '#ffd700', 30);
      ring(x, y, CELL * 2, '#d4af37');
      shake(0.25);
      ui.app.toast(t('t_dhab_awake'), 'gold');
    },
    lighthouseLit(d) {
      const [x, y] = centre(d.r, d.c);
      screenFlash('#ffffff', 0.4);
      ring(x, y, CELL * 4, '#ffffff');
      shake(0.2);
      ui.app.toast(t('t_lighthouse_on'), 'gold');
    },
    aqueductQuench(d) {
      const [x, y] = centre(d.r, d.c);
      spark(x, y, '#48cae4', 35);
      spark(x, y, '#c77dff', 25);
      debris(d.r, d.c, '#3c096c', 20);
      shake(0.2);
      ui.app.toast(t('t_aqueduct_quench'), 'gold');
    },
  },
});
