// Dig feature: the Museum. Bones in the ground, sets of bones, and a coin bonus for ever per full set.
import { use, emit } from '../../core/registry.js';
import { rnd, pickOne } from '../../core/rng.js';
import { layerOf, dirtVal, siteMult } from '../../core/grid.js';
import { addCoins, coinMult } from '../../core/rules.js';
import strings from './strings.js';

export const SETS = {
  camel: { pieces: 4, fromLayer: 0 },
  whale: { pieces: 5, fromLayer: 1 },
  djinn: { pieces: 6, fromLayer: 2 },
};

// another feature adds sets with addSets({ id: { pieces, fromLayer, coin: false } }) (coin: false = no +25%;
// what such a set unlocks is that feature's business: a site's open(s), a relic's when(s))
export function addSets(sets) {
  for (const [k, v] of Object.entries(sets)) { if (SETS[k]) throw new Error(`Dig: Museum set "${k}" twice`); SETS[k] = v; }
}
const coinSets = s => { let n = 0; for (const k of Object.keys(s.sets)) if (!SETS[k] || SETS[k].coin !== false) n++; return n; };

const p = {
  chance: 0.075,     // a bone in a row (times the site's `bone`)
  setBonus: 0.25,    // coins per full set
  dupPay: 25,        // a bone you already have sells for this many dirt blocks of its row
  missing: 0.75,     // chance the bone is one you lack: a set is never blocked by bad luck for long
};

function foundFossil(s, b, ev) {
  const { r, c, src } = b;
  const L = layerOf(r);
  const open = Object.keys(SETS).filter(k => SETS[k].fromLayer <= L && !s.sets[k]);
  const all = Object.keys(SETS).filter(k => SETS[k].fromLayer <= L);
  const set = open.length ? pickOne(open) : pickOne(all);
  const missing = [];
  for (let i = 0; i < SETS[set].pieces; i++) if (!s.fossils[`${set}.${i}`]) missing.push(i);
  const piece = missing.length && rnd() < p.missing ? pickOne(missing) : Math.floor(rnd() * SETS[set].pieces);
  const key = `${set}.${piece}`;
  const isNew = !s.fossils[key];
  s.fossils[key] = (s.fossils[key] || 0) + 1;
  let coins = 0;
  if (!isNew) { coins = Math.round(dirtVal(r) * p.dupPay * coinMult(s)); addCoins(s, coins, src); }
  emit(s, ev, 'fossil', { r, c, set, piece, isNew, coins });
  if (isNew && missing.length === 1 && !s.sets[set]) {
    s.sets[set] = true;
    emit(s, ev, 'set', { set });
  }
}

export const museum = use({
  id: 'museum',
  params: p,
  legacy: { setBonus: 'setBonus' },
  tables: { SETS },
  strings,
  state: {
    fossils: { init: () => ({}), survives: ['site', 'land'] },   // 'camel.2': count
    sets:    { init: () => ({}), survives: ['site', 'land'] },   // completed sets
  },
  blocks: {
    fossil: { at: 100, hp: 3, val: 0, notice: true, broke: foundFossil },
  },
  gen: { row: [{ at: 40, fn(c) {
    const s = c.s;
    if (c.r === 13 && !s.seen.fossil) { c.put('fossil'); s.seen.fossil = true; }
    else if (c.r > 13 && rnd() < p.chance * siteMult(c.site, 'bone')) c.put('fossil');
  } }] },
  mods: { coinMult: { at: 30, fn: (v, s) => v * (1 + p.setBonus * coinSets(s)) } },
  unlocks: () => {
    const out = [];
    for (const [k, v] of Object.entries(SETS)) {
      for (let i = 0; i < v.pieces; i++) out.push({ id: `bone:${k}.${i}`, group: 'bones' });
      out.push({ id: 'set:' + k, group: 'Museum sets' });
    }
    return out;
  },
  firsts: {
    fossil: d => (d.isNew ? `bone:${d.set}.${d.piece}` : null),
    set: d => 'set:' + d.set,
  },
});
