// Dig feature: Crystal, the block of the fourth layer (rows 75 to 99). It breaks in a line.
//
// Block flags (all of them, so the next layer can copy the pattern):
//   crystal_row / crystal_col / crystal_slash / crystal_back
//     hp 2, val 3, notice (a player goes for it), chain (a blast or a line pops it a beat later).
//     Each is drawn as a long bar with an arrow at both ends, and breaks in that line: row = left and
//     right, col = up and down, slash = '/', back = '\'. Only crystal_row is counted as content
//     (unlock: false on the other three), so the list does not fill with the same idea four times.
//   crystal_prism   the rare one: hp 3, val 14, notice, chain, and it cracks all four lines at once.
//     It is counted as content ("type:crystal_prism").
// A line is a travelling crack (queue kind 'crystalRay', one step every `gap` seconds) that:
//   - sets off any block marked `chain` or `ore` at once (another crystal, TNT, copper to gem),
//   - hurts anything else for `power` dirt blocks of its row (soft ground goes, hard rock cracks),
//   - flies over holes, and stops at a `wall` (the Big Rock) and at the edge of the held rows.
// The crystal layer is the ground feature's fourth layer ('deep'); this file gives it its look, its
// ore edges, its block table and its name (see `claim` below).
// Events: crystalLine { r, c, t, depth, src } when a crystal breaks; crystalCrack { r, c, dr, dc, k, depth, t }
// for every cell a line passes. Neither changes a field of an existing event.
import { use, emit, BLOCKS, LAYERS } from '../../core/registry.js';
import { cellAt, dirtHp, LAYER } from '../../core/grid.js';
import { later } from '../../core/rules.js';
import { breakCell, damage } from '../../core/rules.js';
import { rnd } from '../../core/rng.js';
import '../ground/rules.js';          // the layer is registered there; load it first
import strings from './strings.js';

const p = {
  row: 0.045, col: 0.045, slash: 0.02, back: 0.02, prism: 0.006,   // shares of the layer's cells
  power: 4,          // what a line does to plain ground, in dirt blocks of its row
  gap: 0.05,         // seconds for the crack to cross one cell
  start: 0.04,       // seconds from the break to the first cell
  reach: 12,         // cells a line can run
  maxDepth: 24,      // crystals setting off crystals, at most this many deep
  tutRow: 2,         // the first teaching rows sit this far under the Big Rock
  prismRow: 13,      // a prism is always placed this far under the Big Rock
};

// the lines each kind cracks: [dr, dc] (both ways along it)
export const crystalLines = {
  crystal_row: [[0, 1]], crystal_col: [[1, 0]], crystal_slash: [[1, -1]], crystal_back: [[1, 1]],
  crystal_prism: [[0, 1], [1, 0], [1, -1], [1, 1]],
};

function ray(s, r, c, dr, dc, k, depth, src) {
  later(s, k === 1 ? p.start : p.gap, 'crystalRay', { r, c, dr, dc, k, depth, src });
}

function crystalRay(s, q, ev) {
  const cell = cellAt(s, q.r, q.c);
  if (cell === undefined) return;                       // off the held rows or the side: the line ends
  const B = cell && BLOCKS[cell.t];
  if (B && B.wall) return;                              // the Big Rock stops it
  emit(s, ev, 'crystalCrack', { r: q.r, c: q.c, dr: q.dr, dc: q.dc, k: q.k, depth: q.depth, t: cell ? cell.t : null, src: q.src });
  if (cell) {
    if (B.chain || B.ore) breakCell(s, q.r, q.c, q.src, ev, { chain: 1, cry: q.depth });
    else damage(s, q.r, q.c, dirtHp(q.r) * p.power, q.src, ev, { chain: 1 });
  }
  if (q.k < p.reach) ray(s, q.r + q.dr, q.c + q.dc, q.dr, q.dc, q.k + 1, q.depth, q.src);
}

const crystal = (hp, val, extra) => ({ hp, val, chain: true, notice: true, ...extra,
  broke(s, b, ev) {
    const depth = (b.info.cry || 0) + 1;
    emit(s, ev, 'crystalLine', { r: b.r, c: b.c, t: b.t, depth, src: b.src });
    if (depth > p.maxDepth) return;
    for (const [dr, dc] of crystalLines[b.t]) for (const m of [1, -1]) ray(s, b.r + dr * m, b.c + dc * m, dr * m, dc * m, 1, depth, b.src);
  } });

export const crystalFeature = use({
  id: 'crystal',
  params: p,
  strings,
  blocks: {
    crystal_row:   crystal(2, 3, { at: 100 }),
    crystal_col:   crystal(2, 3, { at: 101, unlock: false }),
    crystal_slash: crystal(2, 3, { at: 102, unlock: false }),
    crystal_back:  crystal(2, 3, { at: 103, unlock: false }),
    crystal_prism: crystal(3, 14, { at: 104 }),
  },
  queue: { crystalRay },
  gen: { row: [{ at: 40, fn(c) {
    if (!c.layer.crystal) return;
    const top = c.layer.start === undefined ? 0 : c.layer.start;
    const d = c.r - top;
    // the lesson, placed (never left to luck): a row crystal whose line reaches a column crystal,
    // whose line runs down into TNT and a gem
    const sx = c.s.seen;
    if (d === p.tutRow) {
      const a = 1 + Math.floor(rnd() * 4), b = a + 4;
      c.set(a, 'crystal_row'); c.set(b, 'crystal_col');
      sx.crystalCol = b;
    } else if (d === p.tutRow + 1 && sx.crystalCol !== undefined) { c.set(sx.crystalCol, 'tnt'); }
    else if (d === p.tutRow + 2 && sx.crystalCol !== undefined) { c.set(sx.crystalCol, 'gem'); }
    if (d === p.prismRow) c.put('crystal_prism');
  } }] },
  unlocks: [
    { id: 'crystal:line', group: 'Crystal' }, { id: 'crystal:chain', group: 'Crystal' },
    { id: 'crystal:tnt', group: 'Crystal' }, { id: 'crystal:ore', group: 'Crystal' },
  ],
  firsts: {
    crystalCrack: d => {
      const out = ['crystal:line'];
      if (d.depth >= 2) out.push('crystal:chain');
      if (d.t === 'tnt') out.push('crystal:tnt');
      if (d.t && BLOCKS[d.t].ore) out.push('crystal:ore');
      return out;
    },
  },
});

// Give the ground feature's fourth layer its crystal look, ore edges and block table.
// The shares are getters, so G.setParam('crystal.row', x) still bends the ground.
{
  const L = LAYERS.find(l => l.id === 'deep');
  if (L) {
    L.name = 'layer_crystal';
    L.crystal = true;
    L.start = LAYER * 3;
    L.look = { dirt: '#3b4f7c', stone: '#5a6a93', hard: '#222b4a', back: '#101830' };
    L.ores = [0.12, 0.42, 0.8, 1.0];
    const blocks = {};
    for (const k of ['row', 'col', 'slash', 'back', 'prism']) Object.defineProperty(blocks, 'crystal_' + k, { get: () => p[k], enumerable: true });
    L.blocks = blocks;
  }
}
