// Dig acoustics feature (UI): Resonance HUD bar, full-screen acoustic shockwave fx.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, CELL, centre, ring, spark, shake, text } from '../../ui/render.js';

const { t } = G;
const PURPLE = '#a855f7', MAGENTA = '#e879f9', ROSE = '#f43f5e';

ui({
  on: {
    acousticShockwave(d) {
      shake(0.5);
      ring(320, 240, 260, PURPLE);
      ring(320, 240, 180, MAGENTA);
      spark(320, 240, ROSE, 40);
      text(320, 200, t('shockwave_triggered'), MAGENTA, 26, 1.4);
    },
    resonanceChange(d) {
      if (d.resonance >= 90) {
        spark(320, 40, MAGENTA, 4);
      }
    },
  },
});
