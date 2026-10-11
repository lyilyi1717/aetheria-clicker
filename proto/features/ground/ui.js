// Dig feature (page side): how dirt, stone and hard rock look, the Lantern's icon, the "new ground" toast.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { baseBlock, shade, seeded } from '../../ui/render.js';
import { S, badge } from '../../ui/icons.js';

ui({
  id: 'ground',
  icons: {
    lamp: badge('#b98a00', `<path d="M11 12 H21 L23 24 H9 Z" fill="#fff3a8" ${S}/><rect x="12" y="8" width="8" height="4" rx="1" fill="#3d2a1a" ${S}/><path d="M12 8 Q16 2 20 8" fill="none" ${S}/><rect x="9" y="24" width="14" height="3" rx="1" fill="#3d2a1a" ${S}/>`),
  },
  art: {
    dirt: { sprite: (g, p, v) => baseBlock(g, p.dirt, v, 7) },
    stone: { hard: true, sprite(g, p, v) {
      baseBlock(g, p.stone, v, 3);
      g.strokeStyle = shade(p.stone, -0.3); g.lineWidth = 2;
      g.beginPath(); g.moveTo(10, 24 + v * 4); g.lineTo(30, 30 + v * 3); g.lineTo(52, 22 + v * 5); g.stroke();
    } },
    hard: { hard: true, sprite(g, p, v) {
      const rnd = seeded(v + 7);
      baseBlock(g, p.hard, v, 2);
      g.fillStyle = shade(p.hard, 0.22);
      for (let i = 0; i < 4; i++) { const x = 12 + rnd() * 36, y = 12 + rnd() * 36; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 7, y); g.lineTo(x, y + 6); g.lineTo(x - 7, y); g.closePath(); g.fill(); }
    } },
  },
  on: {
    // a Big Rock broke: name the ground below, once the banner has had its moment
    bossDown(d, app) {
      setTimeout(() => {
        const L = G.layersOf(app.state.land);
        app.toast(G.t('t_layer', { name: G.t(L[Math.min(d.layer, L.length - 1)].name) }));
      }, 2400);
    },
  },
});
