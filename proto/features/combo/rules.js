// Dig feature: the combo. Breaking blocks quickly raises a coin bonus for your own breaks.
// When it ends nothing is taken away.
import { use, emit } from '../../core/registry.js';
import { rel } from '../../core/rules.js';
import strings from './strings.js';

const p = { window: 2.6, step: 0.04, cap: 50 };

export const comboMult = s => 1 + Math.min(s.combo, p.cap) * p.step;

export const combo = use({
  id: 'combo',
  params: p,
  legacy: { comboWindow: 'window', comboStep: 'step', comboCap: 'cap' },
  strings,
  state: {
    combo:     { init: () => 0, perSite: true },
    comboT:    { init: () => 0, perSite: true },
    bestCombo: { init: () => 0, survives: ['site', 'land'] },
  },
  relics: { streak: { at: 100, max: 3 } },   // combo builds faster
  hooks: {
    breaking(s, b) {
      if (b.byHand && !b.info.chain) {
        s.combo += 1 + rel(s, 'streak');
        s.comboT = p.window;
        if (s.combo > s.bestCombo) s.bestCombo = s.combo;
      }
      b.data = { combo: s.combo };
    },
    step: { at: 200, fn(s, dt, ev) {
      if (s.combo > 0) {
        s.comboT -= dt;
        if (s.comboT <= 0) { emit(s, ev, 'comboEnd', { combo: s.combo }); s.combo = 0; }
      }
    } },
  },
  mods: { breakCoins: (v, s, b) => (b.byHand ? v * comboMult(s) : v) },
});
