// Dig prisms feature (rules): Prismatic Vaults & Laser Shafts (Chapter 10 / Month 9).
// Introduces downward surface light beams, Calcite Prisms refracting into row-cleaving horizontal lasers,
// and the Crystal Resonance Spire Wonder at Alqahwa (3x crystal chain payouts).
import { use, BLOCKS, emit, fold, PARAMS } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { COLS, cellAt } from '../../core/grid.js';
import { breakCell } from '../../core/rules.js';
import { ROAD, roadKey } from '../sites/rules.js';
import strings from './strings.js';

export const PRISM = 'prism';

const p = {
  prismShare: 0.04,
  spirePayoutMultiplier: 3,
};

export function refractPrism(s, r, c, ev) {
  const vaporized = [];
  for (let col = 0; col < COLS; col++) {
    if (col === c) continue;
    const cell = cellAt(s, r, col);
    if (!cell) continue;
    const B = BLOCKS[cell.t];
    if (cell.boss || (B && (B.wall || B.boss)) || cell.t === 'boss' || cell.t === 'rock') continue;
    breakCell(s, r, col, 'laser', ev, { laser: true, chain: 1 });
    vaporized.push({ r, c: col });
  }
  if (ev) emit(s, ev, 'laserRefracted', { r, c, vaporized });
  return vaporized;
}

export function fireSurfaceBeam(s, col, ev) {
  if (!s || !s.rows) return null;
  const maxR = s.top + s.rows.length;
  for (let r = s.top; r < maxR; r++) {
    const cell = cellAt(s, r, col);
    if (!cell) continue;
    if (cell.t === PRISM || (BLOCKS[cell.t] && BLOCKS[cell.t].prism)) {
      const vaporized = refractPrism(s, r, col, ev);
      return { struck: true, r, c: col, vaporized };
    }
    // Blocked by solid obstacle before reaching prism
    break;
  }
  return { struck: false };
}

export function hasCrystalSpire(s) {
  if (!s) return false;
  if (s.crystalSpire) return true;
  if (s.road && s.road.stamps) {
    const f200 = ROAD[199];
    if (f200 && s.road.stamps[roadKey(f200)]?.fin) return true;
  }
  return false;
}

export function unlockCrystalSpire(s, ev) {
  s.crystalSpire = true;
  if (ev) emit(s, ev, 'crystalSpireUnlocked', {});
}

export function crystalSpireMultiplier(s) {
  return hasCrystalSpire(s) ? p.spirePayoutMultiplier : 1;
}

export const prisms = use({
  id: 'prisms',
  params: p,
  strings,
  blocks: {
    prism: {
      at: 160,
      hp: 1,
      val: 20,
      prism: true,
      notice: true,
      broke(s, b, ev) {
        refractPrism(s, b.r, b.c, ev);
      },
    },
  },
  mods: {
    crystalMult(v, s) {
      return v * crystalSpireMultiplier(s);
    },
    coinMult(v, s, ev) {
      if (ev && ev.crystalChain && hasCrystalSpire(s)) {
        return v * p.spirePayoutMultiplier;
      }
      return v;
    },
  },
  hooks: {
    siteFinished(s, fin, ev) {
      if (hasCrystalSpire(s) && !s.crystalSpire) {
        unlockCrystalSpire(s, ev);
      }
    },
    row(s, ctx) {
      if (s.run && s.run.ch === 10) {
        if (ctx.r > s.top + 2) {
          for (let c = 0; c < COLS; c++) {
            if (ctx.get(c) === 'dirt' && rnd() < p.prismShare) {
              ctx.set(c, PRISM);
            }
          }
        }
      }
    },
  },
  firsts: {
    laserRefracted: () => 'prism:refract',
    crystalSpireUnlocked: () => 'prism:spire',
  },
  unlocks: [
    { id: 'prism:refract', cat: 'core', group: 'prisms' },
    { id: 'prism:spire', cat: 'core', group: 'prisms' },
  ],
});
