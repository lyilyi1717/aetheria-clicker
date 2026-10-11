// Dig feature (page side): the combo read-out under the purse and the call-outs at 10, 25 and 50.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { W, SKY, text } from '../../ui/render.js';
import { sfx } from '../../ui/audio.js';
import { S, badge } from '../../ui/icons.js';

const called = {};

ui({
  id: 'combo',
  icons: {
    streak: badge('#c2571a', `<path d="M16 4 Q24 12 22 20 Q21 27 16 27 Q10 27 10 20 Q10 16 13 14 Q13 18 16 18 Q17 11 16 4 Z" fill="#ffe14a" ${S}/>`),
  },
  on: {
    break(d, app) {
      if (d.src !== 'you') return;
      for (const m of [10, 25, 50]) if (d.combo >= m && !called[m]) {
        called[m] = true;
        text(W / 2, SKY + 60, G.t('t_combo', { n: G.comboMult(app.state).toFixed(1) }), '#ff8a3c', 34, 1.3);
        sfx.comboUp(Math.round(m / 10));   // a whole step: the scale has no note 2.5
      }
    },
    comboEnd() { called[10] = called[25] = called[50] = false; },
  },
  status: { at: 20, fn: s => (s.combo >= 3 ? { text: G.t('combo', { n: G.comboMult(s).toFixed(2) }), k: Math.max(0, s.comboT / G.PARAMS.combo.window) } : null) },
});
