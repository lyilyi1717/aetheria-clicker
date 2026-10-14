// Dig cradle feature (UI): Grand Engine cinematic ceremony fx and celestial horizon skybox.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, CELL, centre, ring, spark, shake, text } from '../../ui/render.js';

const { t } = G;
const GOLD = '#fbbf24', COSMIC = '#a855f7', STAR_WHITE = '#ffffff';

ui({
  on: {
    celestialEngineActivated() {
      shake(0.6);
      ring(320, 240, 300, GOLD);
      ring(320, 240, 200, COSMIC);
      spark(320, 240, STAR_WHITE, 50);
      spark(320, 240, GOLD, 30);
      text(320, 180, t('engine_active'), GOLD, 26, 1.5);
    },
    eternalHorizonUnlocked() {
      ring(320, 240, 260, COSMIC);
      text(320, 220, t('eternal_horizon'), COSMIC, 22, 1.2);
    },
  },
});
