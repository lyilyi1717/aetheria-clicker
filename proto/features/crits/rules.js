// Dig feature: big hits. Some of your swings count several times; two relics raise the odds and the size.
import { use, fold } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import strings from './strings.js';

const p = { chance: 0.08, mult: 5, luckyStep: 0.07, heavyStep: 3 };

export const critChance = s => fold('critChance', s, p.chance);
export const critMult = s => fold('critMult', s, p.mult);

export const crits = use({
  id: 'crits',
  params: p,
  legacy: { critChance: 'chance', critMult: 'mult' },
  strings,
  hooks: {
    swing: { at: 10, fn(s, sw) { sw.crit = rnd() < critChance(s); if (sw.crit) sw.dmg *= critMult(s); } },
  },
  relics: {
    // more big hits
    lucky: { at: 30, max: 3, mods: { critChance: (v, s) => v + p.luckyStep * s.relics.lucky } },
    // bigger big hits (offered once you have opened a chest)
    heavy: { at: 40, max: 3, when: s => s.chestsOpened > 0, mods: { critMult: (v, s) => v + p.heavyStep * s.relics.heavy } },
  },
});
