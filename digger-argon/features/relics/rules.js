// Dig feature: the relics that change how your hit lands (Boom Pick, Long Pick, Wide Swing, Echo).
// Relics that belong to another feature live with it (Big Bang with TNT, Karak Tea with the crew, ...).
import { use } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { damage, later } from '../../core/rules.js';
import strings from './strings.js';

const p = {
  boomEvery: [0, 12, 9, 6], boomMult: 3,
  deep: [0, 0.5, 0.75, 1],
  wide: [0, 0.3, 0.5, 0.7],
  echo: 0.15,
};

export const boomEvery = s => p.boomEvery[s.relics.boom || 0];

use({
  id: 'relics',
  params: p,
  strings,
  relics: {
    // every Nth hit explodes
    boom: { at: 10, max: 3, vars: lv => ({ n: p.boomEvery[lv] }), hooks: { swung: { at: 40, fn(s, sw) {
      const every = boomEvery(s);
      if (every && s.hits % every === 0) later(s, 0.05, 'blast', { r: sw.r, c: sw.c, rad: 1, dmg: sw.dmg * p.boomMult, src: 'you', centre: true });
    } } } },
    // hits go through to the block below (not through a wall such as the Big Rock)
    deep: { at: 50, max: 3, hooks: { swung: { at: 20, fn(s, sw, ev) {
      if (!sw.B.wall) damage(s, sw.r + 1, sw.c, sw.dmg * p.deep[s.relics.deep], 'you', ev, { chain: 1 });
    } } } },
    // hits spill left and right
    wide: { at: 60, max: 3, hooks: { swung: { at: 30, fn(s, sw, ev) {
      if (sw.B.wall) return;
      const k = p.wide[s.relics.wide];
      damage(s, sw.r, sw.c - 1, sw.dmg * k, 'you', ev, { chain: 1 });
      damage(s, sw.r, sw.c + 1, sw.dmg * k, 'you', ev, { chain: 1 });
    } } } },
    // chance to strike twice
    echo: { at: 120, max: 3, hooks: {
      swing: { at: 20, fn(s, sw) { sw.twice = rnd() < p.echo * s.relics.echo; } },
      swung: { at: 10, fn(s, sw) { if (sw.twice) later(s, 0.09, 'dmg', { r: sw.r, c: sw.c, dmg: sw.dmg, src: 'you' }); } },
    } },
  },
});
