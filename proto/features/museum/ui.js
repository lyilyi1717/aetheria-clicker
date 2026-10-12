// Dig feature (page side): the bone block. The Museum panel and its moments are in wing2/ui.js.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { CELL, baseBlock, shade, rr, centre, ring, spark } from '../../ui/render.js';
import { sfx, gap, tone } from '../../ui/audio.js';

const { t, fmt } = G;

ui({
  id: 'museum',
  sfx: {
    fossil() {
      if (!gap('fossil', 0.2)) return;
      [392, 494, 587, 784].forEach((f, i) => tone(f, { type: 'sine', d: 0.3, vol: 0.2, at: i * 0.09 }));
    },
  },
  art: {
    fossil: { sprite(g, p, v) {
      baseBlock(g, shade(p.dirt, -0.22), v, 2);
      g.save(); g.translate(32, 33); g.rotate(-0.6);
      g.fillStyle = '#f6efdc'; g.strokeStyle = '#6b5a3a'; g.lineWidth = 1.5;
      rr(g, -17, -4, 34, 8, 4); g.fill(); g.stroke();
      for (const [x, y] of [[-17, -5], [-17, 5], [17, -5], [17, 5]]) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.stroke(); }
      g.fillRect(-15, -3, 30, 6);
      g.restore();
    } },
  },
  on: {
    // the Museum panel and the "new bone" moments live in proto/features/wing2/ui.js; here only a bone no set wanted
    fossil(d, app) {
      if (d.set) return;
      sfx.fossil();
      const [x, y] = centre(d.r, d.c); ring(x, y, CELL * 1.4, '#f6efdc'); spark(x, y, '#f6efdc', 20);
      app.toast(t('t_fossil_none', { n: fmt(d.coins) }), 'fossil');
    },
  },
});
