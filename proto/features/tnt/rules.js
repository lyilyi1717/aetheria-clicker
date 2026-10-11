// Dig feature: TNT and blasts. A blast is a delayed effect any feature can order with blastAt()
// (the Boom Pick does). It chains to blocks marked `chain`, and never reaches past a `wall` row.
import { use, BLOCKS, emit } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { cellAt, dirtHp, siteMult } from '../../core/grid.js';
import { damage, later, rel } from '../../core/rules.js';
import strings from './strings.js';

const p = {
  power: 7,                 // TNT damage, in dirt blocks of its row
  chance: 0.2, chanceCap: 0.9, second: 0.35,   // TNT in a row; a second barrel in the same row
  bangStep: 0.5,            // Big Bang: this much more TNT per level
  fuse: 0.12,               // seconds from break to blast
};

// order a blast: opts { rad, dmg, src, delay, centre } (centre: the middle block is hit too)
export function blastAt(s, r, c, opts) {
  later(s, opts.delay === undefined ? p.fuse : opts.delay, 'blast', { r, c, rad: opts.rad, dmg: opts.dmg, src: opts.src, centre: opts.centre });
}

const isWall = (s, r) => { const x = cellAt(s, r, 0); return !!x && BLOCKS[x.t].wall === true; };
function behindWall(s, from, to) {
  for (let r = Math.min(from, to); r <= Math.max(from, to); r++) {
    if (r !== to && r !== from && isWall(s, r)) return true;
    if (r === from && r !== to && isWall(s, r)) return true;
  }
  return false;
}

function blast(s, q, ev) {
  if (q.centre) damage(s, q.r, q.c, q.dmg, q.src, ev, { chain: 1 });
  emit(s, ev, 'blast', { r: q.r, c: q.c, rad: q.rad });
  let hitWall = false;
  for (let dr = -q.rad; dr <= q.rad; dr++) {
    for (let dc = -q.rad; dc <= q.rad; dc++) {
      if (!dr && !dc) continue;
      const cell = cellAt(s, q.r + dr, q.c + dc);
      if (!cell) continue;
      if (behindWall(s, q.r, q.r + dr)) continue;   // a blast never reaches past a Big Rock
      const B = BLOCKS[cell.t];
      if (B.wall) { if (hitWall) continue; hitWall = true; }   // and counts once against it
      if (B.chain) {           // chains, a beat later
        if (!cell.q) { cell.q = true; later(s, 0.14 + 0.05 * (Math.abs(dr) + Math.abs(dc)), 'pop', { r: q.r + dr, c: q.c + dc, src: q.src, chain: 1 }); }
        continue;
      }
      damage(s, q.r + dr, q.c + dc, q.dmg, q.src, ev, { chain: 1 });
    }
  }
}

export const tnt = use({
  id: 'tnt',
  params: p,
  legacy: { tntPower: 'power' },
  strings,
  blocks: {
    tnt: { at: 90, hp: 1, val: 0, chain: true, notice: true, broke(s, b) {
      blastAt(s, b.r, b.c, { rad: 1 + rel(s, 'bang'), dmg: dirtHp(b.r) * p.power, src: b.src });
    } },
  },
  queue: { blast },
  gen: { row: [{ at: 30, fn(c) {
    const s = c.s, r = c.r;
    const bang = (1 + p.bangStep * rel(s, 'bang')) * siteMult(c.site, 'tnt');
    if (r === 8 && !s.seen.tnt) {      // two barrels side by side: the first blast is a chain
      const k = 2 + Math.floor(rnd() * 5);
      c.set(k, 'tnt'); c.set(k + 1, 'tnt'); c.set(k + 2, 'copper');
      s.seen.tnt = true;
    }
    else if (r > 8 && rnd() < Math.min(p.chanceCap, p.chance * bang)) { c.put('tnt'); if (rnd() < p.second) c.put('tnt'); }
  } }] },
  relics: {
    bang: { at: 70, max: 2, when: s => !!s.seen.tnt },   // bigger TNT, more of it
  },
});
