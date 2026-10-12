// Dig feature (page side): how dirt, stone and hard rock look, the Lantern's icon, the "new ground" toast.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { baseBlock, shade, seeded, rr } from '../../ui/render.js';
import { S, badge } from '../../ui/icons.js';

// what is only in some layers: a wet shine on Wet Slate, thin lava veins in the Hot Layer (the block is dark, its cracks bright)
function layerMark(g, p, v) {
  if (p.shine) {
    g.save(); rr(g, 1, 1, 62, 62, 9); g.clip();
    g.fillStyle = 'rgba(190,245,250,0.2)'; g.beginPath(); g.ellipse(18, 14, 20, 6, -0.4, 0, 7); g.fill();
    g.fillStyle = 'rgba(190,245,250,0.35)'; g.fillRect(10 + v * 8, 22, 2, 7);
    g.restore();
  }
  if (p.veins) {
    const rnd = seeded(v * 5 + 11);
    for (const [w, col] of [[5, 'rgba(255,122,26,0.25)'], [2, '#ff7a1a']]) {
      g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
      let x = 6 + rnd() * 14, y = 14 + rnd() * 30; g.beginPath(); g.moveTo(x, y);
      for (let i = 0; i < 4; i++) { x += 10 + rnd() * 8; y += (rnd() - 0.5) * 18; g.lineTo(x, y); }
      g.stroke();
    }
  }
}

ui({
  id: 'ground',
  icons: {
    lamp: badge('#b98a00', `<path d="M11 12 H21 L23 24 H9 Z" fill="#fff3a8" ${S}/><rect x="12" y="8" width="8" height="4" rx="1" fill="#3d2a1a" ${S}/><path d="M12 8 Q16 2 20 8" fill="none" ${S}/><rect x="9" y="24" width="14" height="3" rx="1" fill="#3d2a1a" ${S}/>`),
  },
  art: {
    dirt: { sprite: (g, p, v) => { baseBlock(g, p.dirt, v, 7); layerMark(g, p, v); } },
    stone: { hard: true, sprite(g, p, v) {
      baseBlock(g, p.stone, v, 3);
      g.strokeStyle = shade(p.stone, -0.3); g.lineWidth = 2;
      g.beginPath(); g.moveTo(10, 24 + v * 4); g.lineTo(30, 30 + v * 3); g.lineTo(52, 22 + v * 5); g.stroke();
      layerMark(g, p, v);
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
