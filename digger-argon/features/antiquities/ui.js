// Dig feature: Antiquity Restoration Lab (UI side)
// Renders sockets, floating feedback, and listens to antiquity events.

import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, CELL, centre, ring, spark, shake, text } from '../../ui/render.js';
import { sfx } from '../../ui/audio.js';

const { t } = G;
const GOLD = '#ffd23f', PURPLE = '#c084fc';

ui({
  on: {
    antiquityRestored(d) {
      if (sfx.win) sfx.win();
      shake(0.2);
    },
    antiquityEquipped(d) {
      if (sfx.click) sfx.click();
    },
    siphonDamage(d) {
      const topRow = (window.dig && window.dig.state && window.dig.state.top) || 0;
      const [x, y] = centre(topRow, 3);
      ring(x, y, CELL * 2, PURPLE);
      spark(x, y, '#a855f7', 16);
      spark(x, y, '#ffd23f', 8);
      text(x, y - 28, t('siphon_damage', { n: d.dmg }), PURPLE, 20, 1.4);
    },
    mortarBoost(d) {
      const topRow = (window.dig && window.dig.state && window.dig.state.top) || 0;
      const [x, y] = centre(topRow, 3);
      ring(x, y, CELL * 2.5, GOLD);
      spark(x, y, '#fbbf24', 24);
      shake(0.25);
      text(x, y - 30, t('mortar_boost'), GOLD, 22, 1.5);
    },
  },
});
