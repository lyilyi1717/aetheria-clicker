// Dig feature: the bone block of the Museum. The Museum is one collection now (thirteen sets, see proto/features/wing2):
// a bone block that breaks hands one bone to the Museum, and the Museum decides which piece it is. There is no coin
// bonus for a set any more; each set opens a thing.
// Old saves: `fossils` (bones found) and `sets` (finished sets) are copied into the Museum once (migrate below) and
// are not written to again. SETS stays as a small table of the first three sets' sizes (the sims reach it by path).
// Events sent: fossil (every bone block that breaks; `set` and `piece` say what it was), and from the Museum: set.
import { use, emit } from '../../core/registry.js';
import { layerOf, dirtVal, siteMult } from '../../core/grid.js';
import { rnd } from '../../core/rng.js';
import { addCoins, coinMult } from '../../core/rules.js';
import { WING } from '../wing2/sets.js';
import { wingFind } from '../wing2/rules.js';
import strings from './strings.js';

export const SETS = {};
for (const [k, W] of Object.entries(WING)) if (W.legacy) SETS[k] = { pieces: W.pieces.length, fromLayer: layerOf(W.from) };

const p = {
  chance: 0.075,     // a bone in a row (times the site's `bone`)
  dupPay: 25,        // a bone no set can use sells for this many dirt blocks of its row
  firstRow: 13,      // the first row with bones: a bone placed above it (a prize, a Star step) counts as one from here
};

function foundFossil(s, b, ev) {
  const { r, c, src } = b;
  const fr = Math.max(r, p.firstRow);
  const got = wingFind(s, { tags: ['bone'], layer: layerOf(fr) }, ev, { r: fr, c, src });
  let coins = 0;
  if (!got) { coins = Math.round(dirtVal(r) * p.dupPay * coinMult(s)); addCoins(s, coins, src); }
  const key = got ? `${got.set}.${got.i}` : 'none';
  s.fossils[key] = (s.fossils[key] || 0) + 1;     // a tally of bone blocks broken, by the piece they gave
  emit(s, ev, 'fossil', { r, c, set: got ? got.set : '', piece: got ? got.i : -1, isNew: !!(got && got.isNew), coins: got ? got.coins : coins });
}

export const museum = use({
  id: 'museum',
  params: p,
  tables: { SETS },
  strings,
  version: 2,
  state: {
    fossils: { init: () => ({}), survives: ['site', 'land'] },   // 'camel.2': bone blocks that gave that piece (the old Museum's list; migrate copies it once)
    sets:    { init: () => ({}), survives: ['site', 'land'] },   // old: completed sets
  },
  // v2: the two museums became one. Copy what the player had; say once that the coin bonus is gone.
  migrate(s) {
    for (const [k, n] of Object.entries(s.fossils || {})) {
      const set = k.split('.')[0];
      if (WING[set] && WING[set].legacy && !(s.wingGot[k] > 0)) s.wingGot[k] = n;
    }
    let any = false;
    for (const k of Object.keys(s.sets || {})) if (s.sets[k] && WING[k] && WING[k].legacy) { s.wingDone[k] = true; any = true; }
    if (any) s.wingNote = true;
  },
  blocks: {
    fossil: { at: 100, hp: 3, val: 0, notice: true, broke: foundFossil },
  },
  gen: { row: [{ at: 40, fn(c) {
    const s = c.s;
    if (c.r === p.firstRow && !s.seen.fossil) { c.put('fossil'); s.seen.fossil = true; }
    else if (c.r > p.firstRow && rnd() < p.chance * siteMult(c.site, 'bone')) c.put('fossil');
  } }] },
  unlocks: () => {
    const out = [];
    for (const [k, v] of Object.entries(SETS)) {
      for (let i = 0; i < v.pieces; i++) out.push({ id: `bone:${k}.${i}`, group: 'bones' });
      out.push({ id: 'set:' + k, group: 'Museum sets' });
    }
    return out;
  },
  firsts: {
    set: d => 'set:' + d.set,
  },
});
