// Dig feature: The Clockwork Spire (UI side)
// Renders pneumatic wall pistons, steam whistle effects, and Clockwork Orrery animations.

import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, CELL, centre, ring, spark, shake, baseBlock, text } from '../../ui/render.js';
import { sfx } from '../../ui/audio.js';

const { t } = G;
const BRASS = '#d97706', STEEL = '#475569', STEAM = '#e2e8f0';

function pistonBlock(g, p, v) {
  baseBlock(g, '#1e293b', v, 4);

  // Outer industrial brass frame
  g.strokeStyle = BRASS;
  g.lineWidth = 3;
  g.strokeRect(6, 6, 52, 52);

  // Pneumatic piston cylinder
  g.fillStyle = STEEL;
  g.fillRect(16, 10, 32, 28);
  g.strokeStyle = '#94a3b8';
  g.lineWidth = 2;
  g.strokeRect(16, 10, 32, 28);

  // Center pressure piston rod
  g.fillStyle = '#cbd5e1';
  g.fillRect(26, 36, 12, 16);

  // Heavy steel strike head
  g.fillStyle = '#64748b';
  g.fillRect(18, 50, 28, 8);
  g.strokeStyle = '#0f172a';
  g.lineWidth = 1.5;
  g.strokeRect(18, 50, 28, 8);

  // Gear rivets in corners
  g.fillStyle = '#f59e0b';
  for (const [x, y] of [[10, 10], [54, 10], [10, 54], [54, 54]]) {
    g.beginPath();
    g.arc(x, y, 2.5, 0, Math.PI * 2);
    g.fill();
  }
}

ui({
  blocks: {
    piston: {
      draw: pistonBlock,
      sound: 'stone',
    },
  },
  on: {
    pistonFire(d) {
      const [x, y] = centre(d.r, d.c);
      ring(x, y + CELL, CELL * 1.6, BRASS);
      spark(x, y + CELL, '#fbbf24', 20);
      spark(x, y + CELL, STEAM, 12);
      shake(0.3);
      text(x, y + CELL - 20, t('piston_fire'), BRASS, 18, 1.2);
    },
    steamWhistleActivated(d) {
      const topRow = (window.dig && window.dig.state && window.dig.state.top) || 0;
      const [x, y] = centre(topRow, 3);
      spark(x, y, STEAM, 36);
      spark(x, y, '#38bdf8', 16);
      shake(0.2);
      text(x, y - 30, t('steam_whistle_active'), '#38bdf8', 22, 1.5);
    },
    clockworkOrreryUnlocked(d) {
      if (sfx.win) sfx.win();
      shake(0.4);
    },
  },
});
