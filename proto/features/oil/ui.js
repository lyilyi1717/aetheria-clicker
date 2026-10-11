// Dig feature (page side): the oil pocket, the gusher, and the gold glow of a rush.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, W, H, AT, baseBlock, centre, gush, shake, coinBurst, text } from '../../ui/render.js';
import { sfx, gap, tone, noise } from '../../ui/audio.js';

const { t, fmt } = G;

ui({
  id: 'oil',
  sfx: {
    gusher() {
      if (!gap('gusher', 0.3)) return;
      noise({ d: 1.4, vol: 0.35, from: 300, to: 4000 });
      tone(80, { type: 'sawtooth', a: 0.2, d: 1.0, vol: 0.2, slide: 240 });
    },
  },
  art: {
    oil: { colour: '#111', sprite(g, p, v) {
      baseBlock(g, '#2a2622', v, 2);
      g.fillStyle = '#0c0b0a';
      for (const [x, y, s] of [[22, 26, 10], [42, 38, 12], [38, 18, 6]]) { g.beginPath(); g.moveTo(x, y - s); g.quadraticCurveTo(x + s, y + s * 0.2, x, y + s); g.quadraticCurveTo(x - s, y + s * 0.2, x, y - s); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,0.5)';
      for (const [x, y] of [[19, 27], [39, 39]]) { g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); }
    } },
  },
  draw: [
    // a rush turns the pick and the target outline gold
    { at: 10, fn(g, s) { fx.hot = s.rush > 0; } },
    // and frames the screen (after the shake)
    { at: AT.flash + 50, fn(g, s) { if (s.rush > 0) { g.strokeStyle = `rgba(255,210,63,${0.5 + Math.sin(fx.t * 12) * 0.3})`; g.lineWidth = 8; g.strokeRect(0, 0, W, H); } } },
  ],
  on: {
    gusher(d, app) {
      const [x, y] = centre(d.r, d.c);
      gush(d.c, d.r); sfx.gusher(); shake(0.5);
      coinBurst(d.r, d.c, 40); text(x, y - 30, '+' + fmt(d.coins), '#ffe14a', 34, 1.6);
      app.toast(t('t_gusher', { n: fmt(d.coins) }), 'gold');
    },
  },
  status: { at: 10, fn: s => (s.rush > 0 ? { text: t('rush'), cls: 'rush' } : null) },
});
