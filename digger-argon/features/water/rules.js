// Dig feature (rules): Water, the block of the third layer (and deeper). One line for the player:
// "Water runs down and washes loose things out."
//
// Block flags (the README's conventions; deep and crystal may rely on these):
//   water  { hp 1, val 0, notice }          a pocket. Breaking it lets water out at its cell (queue 'waterFlow').
//                                           Water that touches a pocket pops it too, so pockets chain.
//   pearl  { hp 6, val 90, ore, washout }   `ore` so ore relics and bonuses count it; `washout` = water frees it.
//                                           A pick or a Rafeeq only chips it (mod 'damage' x pearlGrip); water
//                                           pops it whole. No `notice`: the sim bot does not go for it.
//   `soft` (dirt, stone) is what water washes away. `ore` and `washout` blocks next to water come loose
//   (paid x oreBonus). Any other block next to water gets `cell.wet = <second it dries>`.
//   A wet `tnt` is a dud: its blast is cancelled and it pays a few coins ("plop").
// Open space that water stands in is the slice `pools` ("r,c" -> second it dries); it is not saved.
// A `wall` (the Big Rock) stops water. Water runs down first, then sideways through open space.
// Events: burst (pocket opened), wash (a soft block washed away), washed (ore or pearl freed),
// wet (a barrel got wet), fizzle (a wet barrel plopped), splash (water came to rest).
import { use, BLOCKS, emit } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { COLS, LAYER, cellAt, dirtVal } from '../../core/grid.js';
import { breakCell, later, addCoins, coinMult } from '../../core/rules.js';
import strings from './strings.js';

const p = {
  fromLayer: 2,                  // water appears from this layer down (0 = sand): the third layer
  share: 0.035, deepShare: 0.02, // chance of a pocket in a cell: first water layer, deeper ones
  pearlShare: 0.005,             // a pearl in a cell, from the same layer
  pocket: 14,                    // how far one pocket runs: 1 for a step in open space, 2 for a block washed
  openCost: 1, washCost: 2,
  flowGap: 0.16,                 // seconds from one step of the water to the next
  freeGap: 0.22,                 // seconds from touching ore to the ore coming loose
  oreBonus: 2,                   // washed ore and pearls pay this much more
  dry: 25,                       // seconds a puddle and a wet block stay wet
  dudPay: 4,                     // a wet barrel pays this many dirt blocks when it plops
  pearlGrip: 0.12,               // a pick or Rafeeq does this much to a pearl
  firstRow: 3,                   // the placed pocket sits this many rows under the layer's Big Rock
  maxPools: 160,
};

const pk = (r, c) => r + ',' + c;
const pooled = (s, r, c) => (s.pools[pk(r, c)] || 0) > s.t;
const washable = B => !!B.soft && !B.wall;

// water touches the four neighbours of a wet cell
function soak(s, r, c, ev) {
  for (const [dr, dc] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) {
    const cell = cellAt(s, r + dr, c + dc);
    if (!cell) continue;
    const B = BLOCKS[cell.t];
    if (B.wall) continue;
    if (B.ore || B.washout || cell.t === 'water') {
      if (cell.q) continue;
      cell.q = true;
      later(s, cell.t === 'water' ? p.flowGap * 2 : p.freeGap, 'waterFree', { r: r + dr, c: c + dc });
    } else {
      const was = cell.wet > s.t;
      cell.wet = s.t + p.dry;
      if (!was && B.chain) emit(s, ev, 'wet', { r: r + dr, c: c + dc, t: cell.t });
    }
  }
}

function waterFree(s, q, ev) {
  const cell = cellAt(s, q.r, q.c);
  if (!cell) return;
  const t = cell.t;
  breakCell(s, q.r, q.c, 'water', ev, { chain: 1 });
  if (t !== 'water') emit(s, ev, 'washed', { r: q.r, c: q.c, t });
}

const next = (s, r, c, vol) => later(s, p.flowGap, 'waterFlow', { r, c, vol });

function flow(s, q, ev) {
  const { r, c, vol } = q;
  if (cellAt(s, r, c) !== null) return;                // off the view, or filled in
  if (Object.keys(s.pools).length > p.maxPools) return;
  s.pools[pk(r, c)] = s.t + p.dry;
  soak(s, r, c, ev);
  const below = cellAt(s, r + 1, c);
  if (below === undefined) return;                     // runs out of sight
  if (vol > 0) {
    if (below === null && !pooled(s, r + 1, c)) { next(s, r + 1, c, vol - p.openCost); return; }
    if (below && washable(BLOCKS[below.t]) && vol >= p.washCost) {
      breakCell(s, r + 1, c, 'water', ev, { chain: 1 });
      emit(s, ev, 'wash', { r: r + 1, c, t: below.t });
      next(s, r + 1, c, vol - p.washCost);
      return;
    }
    // blocked below: spread sideways through open space, sharing what is left
    const sides = [-1, 1].filter(d => cellAt(s, r, c + d) === null && !pooled(s, r, c + d));
    if (sides.length && vol >= p.openCost) {
      if (sides.length === 2 && rnd() < 0.5) sides.reverse();
      const share = Math.floor((vol - p.openCost) / sides.length);
      for (const d of sides) next(s, r, c + d, share);
      return;
    }
  }
  emit(s, ev, 'splash', { r, c });                     // it has come to rest
}

export const water = use({
  id: 'water',
  params: p,
  strings,
  state: {
    pools: { init: () => ({}), perSite: true, transient: true },   // "r,c" -> second it dries
    wcol: { init: () => -1, perSite: true },                       // column of the placed pocket and its pearl
  },
  blocks: {
    water: { at: 130, hp: 1, val: 0, notice: true,
      base: { at: 60, w: c => (c.L < p.fromLayer ? 0 : c.L === p.fromLayer ? p.share : p.deepShare) },
      broke(s, b, ev) {
        emit(s, ev, 'burst', { r: b.r, c: b.c, src: b.src });
        later(s, p.flowGap, 'waterFlow', { r: b.r, c: b.c, vol: p.pocket });
      } },
    pearl: { at: 135, hp: 6, val: 90, ore: true, washout: true,
      base: { at: 62, w: c => (c.L < p.fromLayer ? 0 : p.pearlShare) } },
  },
  queue: { waterFlow: flow, waterFree },
  gen: { row: [{ at: 40, fn(c) {
    if (c.L !== p.fromLayer) return;
    const s = c.s, d = c.r - c.L * LAYER - p.firstRow;
    // the placed pocket, two plain blocks with ore beside them, and the pearl under them
    if (d === 0) { s.wcol = 2 + Math.floor(rnd() * (COLS - 4)); c.set(s.wcol, 'water'); }
    else if (s.wcol >= 0 && d > 0 && d <= 3) {
      const k = s.wcol;
      if (d === 3) c.set(k, 'pearl');
      else { c.set(k, 'dirt'); c.set(k > 4 ? k - 1 : k + 1, d === 1 ? 'silver' : 'gold'); }
    }
  } }] },
  hooks: {
    step: { at: 120, fn(s) {
      for (const k of Object.keys(s.pools)) if (s.pools[k] <= s.t || +k.split(',')[0] < s.top) delete s.pools[k];
    } },
    // a wet barrel is a dud
    broke(s, b, ev) {
      if (b.t !== 'tnt' || !(b.cell.wet > s.t)) return;
      s.queue = s.queue.filter(q => !(q.kind === 'blast' && q.r === b.r && q.c === b.c));
      addCoins(s, Math.max(1, Math.round(dirtVal(b.r) * p.dudPay * coinMult(s))), 'water');
      emit(s, ev, 'fizzle', { r: b.r, c: b.c });
    },
  },
  mods: {
    breakCoins: (v, s, b) => (b.src === 'water' && (b.B.ore || b.B.washout) ? v * p.oreBonus : v),
    damage: (v, s, cell, src) => (cell.t === 'pearl' && src !== 'water' ? v * p.pearlGrip : v),
  },
  firsts: {
    wash: () => 'water:wash',
    washed: () => 'water:ore',
    fizzle: () => 'water:dud',
    splash: () => 'water:pool',
  },
  unlocks: [
    { id: 'water:wash', group: 'water' }, { id: 'water:ore', group: 'water' },
    { id: 'water:dud', group: 'water' }, { id: 'water:pool', group: 'water' },
  ],
});
