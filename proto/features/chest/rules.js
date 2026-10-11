// Dig feature: chests. A chest in the ground, the pick-1-of-3 draft, and taking a relic.
import { use, RELICS, emit, fold } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { siteMult } from '../../core/grid.js';
import { rel } from '../../core/rules.js';
import strings from './strings.js';

const p = {
  chance: 0.085,       // a chest in a row (times the site's `chest` and the Treasure Nose)
  noseStep: 0.6,
  cards: 3,            // relics offered by one chest
  awayMax: 6,          // chests the crew can bring back from one time away
};

const noseOf = s => fold('chestChance', s, 1);

// The draft pool: relics below their top level whose own `when(s)` allows them.
// `draftPool` and `draftCards` mods can bend it (a perk for 4 cards, a set that adds a family).
export function rollDraft(s) {
  let pool = Object.keys(RELICS).filter(id => rel(s, id) < RELICS[id].max)
    .filter(id => !RELICS[id].when || RELICS[id].when(s));
  pool = fold('draftPool', s, pool);
  const n = fold('draftCards', s, p.cards);
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}
export function takeRelic(s, id, ev = () => {}) {
  if (s.chests <= 0) return false;
  s.chests--; s.chestsOpened++;
  if (id) { s.relics[id] = rel(s, id) + 1; emit(s, ev, 'relic', { id, level: s.relics[id] }); }
  return true;
}

export const chest = use({
  id: 'chest',
  params: p,
  strings,
  state: {
    chests:       { init: () => 0 },    // found, not opened yet
    chestsOpened: { init: () => 0 },
  },
  blocks: {
    chest: { at: 80, hp: 4, val: 0, notice: true, broke(s, b, ev) { s.chests++; emit(s, ev, 'chest', { r: b.r, c: b.c, src: b.src }); } },
  },
  gen: { row: [{ at: 20, fn(c) {
    const s = c.s;
    const nose = noseOf(s) * siteMult(c.site, 'chest');
    if (c.r === 6 && !s.seen.chest) { c.put('chest'); s.seen.chest = true; }
    else if (c.r > 6 && rnd() < p.chance * nose) c.put('chest');
  } }] },
  relics: {
    nose: { at: 110, max: 2, mods: { chestChance: (v, s) => v * (1 + p.noseStep * s.relics.nose) } },   // more chests
  },
  hooks: {
    bossDown(s) { s.chests += 1; },
    awayRow(s, r, out) { if (rnd() < p.chance * noseOf(s)) out.chests++; },
    awayEnd: { at: 10, fn(s, out) { out.chests = Math.min(out.chests, p.awayMax); s.chests += out.chests; } },
  },
});
