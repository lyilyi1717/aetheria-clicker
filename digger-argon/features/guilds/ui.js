// Dig feature: The Guilds of Alqahwa (UI side)
// Listens to calling assignments and coordinated blast events.

import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, CELL, centre, ring, spark, shake, text } from '../../ui/render.js';
import { sfx } from '../../ui/audio.js';

const { t } = G;
const RED = '#ef4444', GOLD = '#ffd23f', ORANGE = '#f97316';

ui({
  on: {
    callingAssigned(d) {
      if (sfx.click) sfx.click();
    },
    coordinatedBlast(d) {
      const topRow = (window.dig && window.dig.state && window.dig.state.top) || 0;
      const [x, y] = centre(topRow + 2, 3);
      ring(x, y, CELL * 3, RED);
      ring(x, y, CELL * 1.8, GOLD);
      spark(x, y, ORANGE, 30);
      spark(x, y, GOLD, 20);
      shake(0.5);
      if (sfx.boom) sfx.boom();
      text(x, y - 36, t('coordinated_blast_banner'), RED, 22, 1.6);
    },
  },
});
