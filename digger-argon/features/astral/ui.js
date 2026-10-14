// Dig astral feature (UI): Gravity inversion visual indicators and magnetic pull fx.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, CELL, centre, ring, spark, text } from '../../ui/render.js';

const { t } = G;
const INDIGO = '#6366f1', PURPLE = '#818cf8', GOLD = '#ffd23f';

ui({
  on: {
    gravityInverted() {
      ring(320, 240, 220, INDIGO);
      spark(320, 240, PURPLE, 20);
      text(320, 180, t('gravity_inverted'), PURPLE, 24, 1.2);
    },
    magneticPull(d) {
      spark(320, 240, GOLD, 25);
      ring(320, 240, 140, GOLD);
      text(320, 160, t('magnet_pull'), GOLD, 20, 1.0);
    },
  },
});
