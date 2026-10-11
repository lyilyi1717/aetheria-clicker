// Dig feature (page side): the TNT barrel, the blast, the first-sight toast.
import { ui } from '../../ui/app.js';
import { CELL, baseBlock, shade, rr, centre, ring, spark, shake, screenFlash } from '../../ui/render.js';
import { sfx, gap, tone, noise } from '../../ui/audio.js';
import { S, badge, star } from '../../ui/icons.js';

ui({
  id: 'tnt',
  icons: {
    bang: badge('#7a2a1f', `<rect x="9" y="9" width="14" height="18" rx="3" fill="#d7332b" ${S}/><path d="M16 9 Q19 3 24 5" fill="none" ${S}/>${star(24, 5, 3.4, 1.4, 6, '#ffe14a')}`),
  },
  sfx: {
    blast() {
      if (!gap('blast', 0.06)) return;
      noise({ d: 0.6, vol: 0.6, from: 2200, to: 60 });
      tone(120, { type: 'sawtooth', d: 0.45, vol: 0.3, slide: 30 });
    },
  },
  art: {
    tnt: { colour: '#d7332b', firstSight: { flag: 'tntToast', text: 't_tnt' }, sprite(g, p, v) {
      baseBlock(g, shade(p.dirt, -0.25), v, 2);
      rr(g, 15, 14, 34, 40, 7); g.fillStyle = '#d7332b'; g.fill(); g.strokeStyle = '#5e0f0b'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#5e0f0b'; g.fillRect(15, 22, 34, 4); g.fillRect(15, 42, 34, 4);
      g.fillStyle = '#ffe14a';
      g.beginPath();
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, rad = i % 2 ? 4 : 8; g.lineTo(32 + Math.cos(a) * rad, 34 + Math.sin(a) * rad); }
      g.closePath(); g.fill();
      g.strokeStyle = '#3d2a1a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(32, 14); g.quadraticCurveTo(38, 6, 44, 9); g.stroke();
    } },
  },
  on: {
    blast(d, app) {
      const [x, y] = centre(d.r, d.c);
      ring(x, y, CELL * (d.rad + 1.1), '#ffb347'); ring(x, y, CELL * (d.rad + 0.5), '#fff');
      spark(x, y, '#ffb347', 30); spark(x, y, '#fff', 12);
      shake(0.65); screenFlash('#ffcf80', 0.28); app.hitStop(0.07); sfx.blast();
    },
  },
});
