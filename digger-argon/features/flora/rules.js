// Dig flora feature (rules): The Bioluminescent Deep (Chapter 8 / Month 7).
// Introduces biological cultivation: Spore pods softening adjacent rock by 0.10 (breaks in 1 hit),
// and Glow-Moss seeds permanently illuminating dark chambers to 1.0 light level.
import { use, BLOCKS, emit, fold, PARAMS } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { COLS, cellAt, setCell } from '../../core/grid.js';
import { breakCell, pickPower } from '../../core/rules.js';
import strings from './strings.js';

export const SPORE_POD = 'sporePod';
export const GLOW_MOSS = 'glowMoss';

const p = {
  softenRatio: 0.10,   // Scales HP by 0.10 (e.g. 100 HP -> 10 HP)
  sporeShare: 0.05,
};

const pk = (r, c) => r + ',' + c;

export function isInfested(s, r, c) {
  const cell = cellAt(s, r, c);
  return !!(cell && cell.sporeInfested);
}

export function hasMossAt(s, r, c) {
  if (!s) return false;
  if (s.flora && s.flora.moss && s.flora.moss[pk(r, c)] !== undefined) return true;
  const cell = cellAt(s, r, c);
  return !!(cell && (cell.moss || cell.light >= 1.0));
}

export function spreadSpore(s, r, c, ev) {
  const infected = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const tr = r + dr, tc = c + dc;
      const cell = cellAt(s, tr, tc);
      if (!cell) continue;
      if (BLOCKS[cell.t] && (BLOCKS[cell.t].wall || BLOCKS[cell.t].boss)) continue;
      cell.sporeInfested = true;
      const oldHp = cell.hp;
      cell.hp = Math.max(1, Math.round(cell.hp * p.softenRatio));
      cell.max = Math.max(1, Math.round(cell.max * p.softenRatio));
      infected.push({ r: tr, c: tc, oldHp, newHp: cell.hp });
    }
  }
  if (ev) emit(s, ev, 'sporeSpread', { r, c, infected });
  return infected;
}

export function plantGlowMoss(s, r, c, ev) {
  if (!s.flora) s.flora = { moss: {} };
  if (!s.flora.moss) s.flora.moss = {};
  s.flora.moss[pk(r, c)] = 1.0;
  const cell = cellAt(s, r, c);
  if (cell) {
    cell.moss = true;
    cell.light = 1.0;
  }
  if (ev) emit(s, ev, 'mossPlanted', { r, c, light: 1.0 });
  return true;
}

export function glowMossUse(s, r, c, ev) {
  return plantGlowMoss(s, r, c, ev);
}

export const flora = use({
  id: 'flora',
  params: p,
  strings,
  state: {
    flora: { init: () => ({ moss: {} }), perSite: true },
  },
  blocks: {
    sporePod: {
      at: 150,
      hp: 1,
      val: 5,
      notice: true,
      broke(s, b, ev) {
        spreadSpore(s, b.r, b.c, ev);
      },
    },
  },
  tools: {
    glowMoss: {
      key: '5',
      open: () => true,
      can: (s, r, c) => r !== undefined,
      use: glowMossUse,
    },
  },
  hooks: {
    mask(s, m) {
      if (s.flora && s.flora.moss) {
        for (const key of Object.keys(s.flora.moss)) {
          const [kr, kc] = key.split(',').map(Number);
          const rowIdx = kr - s.top;
          if (rowIdx >= 0 && rowIdx < m.length && kc >= 0 && kc < COLS) {
            m[rowIdx][kc] = true;
          }
        }
      }
    },
    row(s, ctx) {
      if (s.run && s.run.ch === 8) {
        if (ctx.r > s.top + 2) {
          for (let c = 0; c < COLS; c++) {
            if (ctx.get(c) === 'dirt' && rnd() < p.sporeShare) {
              ctx.set(c, 'sporePod');
            }
          }
        }
      }
    },
  },
  firsts: {
    sporeSpread: () => 'flora:spore',
    mossPlanted: () => 'flora:moss',
  },
  unlocks: [
    { id: 'flora:spore', cat: 'core', group: 'flora' },
    { id: 'flora:moss', cat: 'core', group: 'flora' },
  ],
});

