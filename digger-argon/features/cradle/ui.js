// Dig cradle feature (UI): Grand Engine cinematic ceremony fx and celestial horizon skybox.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, CELL, centre, ring, spark, shake, text } from '../../ui/render.js';

const { t } = G;
const GOLD = '#fbbf24', COSMIC = '#a855f7', STAR_WHITE = '#ffffff', BRASS = '#d97706';

ui({
  on: {
    grandpaBellFound(d) {
      shake(0.3);
      ring(320, 240, 160, BRASS);
      spark(320, 240, '#fef08a', 24);
      text(320, 160, t('grandpa_bell'), BRASS, 20, 1.2);
    },
    abandonedOutpostFound(d) {
      shake(0.35);
      ring(320, 240, 180, '#38bdf8');
      spark(320, 240, '#bae6fd', 25);
      text(320, 160, t('abandoned_outpost'), '#38bdf8', 20, 1.2);
    },
    engineAwakened(d) {
      shake(0.7);
      ring(320, 240, 320, GOLD);
      ring(320, 240, 240, COSMIC);
      spark(320, 240, STAR_WHITE, 60);
      spark(320, 240, GOLD, 40);
      text(320, 150, t('engine_awakened'), GOLD, 28, 1.6);
    },
    celestialEngineActivated(d) {
      shake(0.6);
      ring(320, 240, 300, GOLD);
      ring(320, 240, 200, COSMIC);
      spark(320, 240, STAR_WHITE, 50);
      spark(320, 240, GOLD, 30);
      text(320, 180, t('engine_active'), GOLD, 26, 1.5);
    },
    masterArchitectAwarded(d) {
      ring(320, 240, 220, GOLD);
      const badgeText = d?.token?.id ? `${t('master_architect_token')} ${d.token.id}` : t('master_architect_token');
      text(320, 210, badgeText, GOLD, 22, 1.4);
    },
    eternalHorizonUnlocked() {
      ring(320, 240, 260, COSMIC);
      text(320, 220, t('eternal_horizon'), COSMIC, 22, 1.2);
    },
  },
});
