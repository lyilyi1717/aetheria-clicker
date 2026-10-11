// Dig feature: ore. Four kinds, veins that run on, the placed ore of the first rows, and two relics.
import { use, BLOCKS } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { cellAt, siteMult } from '../../core/grid.js';
import { later } from '../../core/rules.js';
import strings from './strings.js';

export const ORES = ['copper', 'silver', 'gold', 'gem'];
const isOre = t => !!t && BLOCKS[t].ore === true;

const p = {
  chance: 0.045,            // of a cell being ore (times the site's `ore`)
  vein: 0.3,                // chance that ore runs on from the cell above or to the left
  shiny: 0.4,               // Shiny Eye: ore pays this much more per level
  veinReach: [0, 3, 7, 99], // Vein Popper: how far a pop travels, by level
  veinGap: 0.07,            // seconds between pops
};

export const ores = use({
  id: 'ores',
  params: p,
  strings,
  blocks: {
    copper: { at: 40, hp: 2, val: 6, ore: true },
    silver: { at: 50, hp: 3, val: 16, ore: true },
    gold:   { at: 60, hp: 4, val: 45, ore: true },
    gem:    { at: 70, hp: 5, val: 160, ore: true },
  },
  gen: {
    // veins run on
    claim: [{ at: 10, fn(c) { const near = isOre(c.up) ? c.up : isOre(c.left) ? c.left : null; return near && rnd() < p.vein ? near : null; } }],
    // which ore: the layer's table
    base: [{ id: 'ore', at: 10, upTo: c => p.chance * siteMult(c.site, 'ore'), pick(c) { const x = rnd(); return ORES[c.layer.ores.findIndex(e => x < e)]; } }],
    row: [
      // placed for the first session (owner rule: tutorial events are summoned, not left to luck)
      { id: 'ores.first', at: 10, fn(c) {
        if (c.r === 1) { const k = 3 + Math.floor(rnd() * 3); c.set(k, 'copper'); c.set(k + 1, 'copper'); }
        if (c.r === 2) { const k = 3 + Math.floor(rnd() * 3); c.set(k, 'copper'); }
      } },
      { id: 'ores.promise', at: 90, fn(c) {
        if (c.r === 7 || c.r === 17) { const k = 1 + Math.floor(rnd() * 7); c.set(k, 'silver'); }
        if (c.r === 21) c.put('gold');
      } },
    ],
  },
  relics: {
    // ore pops its neighbours of the same kind, one after another
    vein: { at: 20, max: 3, hooks: { broke(s, b) {
      if (!b.B.ore || !b.byHand) return;
      const left = b.info.veinLeft === undefined ? p.veinReach[s.relics.vein] : b.info.veinLeft;
      if (left <= 0) return;
      let n = 0;
      for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const o = cellAt(s, b.r + dr, b.c + dc);
        if (o && o.t === b.t && !o.q) {
          o.q = true; n++;
          later(s, p.veinGap * n, 'pop', { r: b.r + dr, c: b.c + dc, src: b.src, chain: b.chain + 1, veinLeft: left - 1 });
        }
      }
    } } },
    // ore pays more
    shiny: { at: 90, max: 3, mods: { blockPay: (v, s, b) => v * (b.B.ore ? 1 + p.shiny * s.relics.shiny : 1) } },
  },
});
