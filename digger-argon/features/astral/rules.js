// Dig astral feature (rules): Inverted Gravity & Astral Strata (Chapter 11 / Month 10).
// Introduces inverted gravity (gravityDir = -1) causing rubble and blocks to float upward,
// and the Magnetic Pick pulling floating ores directly to the player.
import { use, BLOCKS, emit, fold, PARAMS } from '../../core/registry.js';
import { COLS, cellAt, setCell, VIEW_ROWS } from '../../core/grid.js';
import { breakCell, pickPower } from '../../core/rules.js';
import strings from './strings.js';

export const ASTRAL_GRAVITY_DOWN = 1;
export const ASTRAL_GRAVITY_UP = -1;

const p = {
  floatSpeed: 0.1,
  magneticRange: 12,
};

export function getGravityDir(s) {
  return (s && s.astral && s.astral.gravityDir !== undefined) ? s.astral.gravityDir : ASTRAL_GRAVITY_DOWN;
}

export function setGravityDir(s, dir, ev) {
  if (!s.astral) s.astral = { gravityDir: ASTRAL_GRAVITY_DOWN, magneticActive: false, floatCount: 0 };
  s.astral.gravityDir = dir;
  if (ev) emit(s, ev, dir === ASTRAL_GRAVITY_UP ? 'gravityInverted' : 'gravityRestored', { dir });
  return dir;
}

export function stepGravity(s, dt, ev) {
  if (!s || !s.rows) return 0;
  const dir = getGravityDir(s);
  if (dir !== ASTRAL_GRAVITY_UP) return 0;

  let floated = 0;
  const maxR = s.top + s.rows.length;
  // In inverted gravity, check from top + 1 down to bottom so blocks move upward cleanly
  for (let r = s.top + 1; r < maxR; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cellAt(s, r, c);
      if (!cell) continue;
      // Check if block is marked loose, floating, or rubble
      const isLoose = cell.loose || cell.floating || cell.rubble || (BLOCKS[cell.t] && BLOCKS[cell.t].loose);
      if (!isLoose) continue;

      const above = cellAt(s, r - 1, c);
      if (above === null) {
        setCell(s, r - 1, c, cell);
        setCell(s, r, c, null);
        floated++;
        if (ev) emit(s, ev, 'rubbleFloated', { fromR: r, toR: r - 1, c, t: cell.t });
      }
    }
  }
  return floated;
}

export function useMagneticPick(s, ev) {
  if (!s || !s.rows) return 0;
  let collected = 0;
  const maxR = s.top + Math.min(s.rows.length, VIEW_ROWS);
  for (let r = s.top; r < maxR; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cellAt(s, r, c);
      if (!cell) continue;
      const B = BLOCKS[cell.t];
      const isFloatingOre = (cell.floating || cell.loose) && (cell.ore || (B && B.ore) || cell.t === 'gem' || cell.t === 'gold');
      if (isFloatingOre) {
        breakCell(s, r, c, 'magnet', ev, { magnet: true, chain: 1 });
        collected++;
      }
    }
  }
  if (!s.astral) s.astral = { gravityDir: ASTRAL_GRAVITY_DOWN, magneticActive: false, floatCount: 0 };
  s.astral.magneticActive = true;
  if (ev) emit(s, ev, 'magneticPull', { count: collected });
  return collected;
}

export const astral = use({
  id: 'astral',
  params: p,
  strings,
  state: {
    astral: { init: () => ({ gravityDir: ASTRAL_GRAVITY_DOWN, magneticActive: false, floatCount: 0 }), perSite: true },
  },
  tools: {
    magneticPick: {
      key: '6',
      open: () => true,
      can: (s) => true,
      use: (s, r, c, ev) => useMagneticPick(s, ev),
    },
  },
  hooks: {
    step: {
      at: 130,
      fn(s, dt, ev) {
        stepGravity(s, dt, ev);
      },
    },
  },
  firsts: {
    gravityInverted: () => 'astral:invert',
    magneticPull: () => 'astral:magnet',
  },
  unlocks: [
    { id: 'astral:invert', cat: 'core', group: 'astral' },
    { id: 'astral:magnet', cat: 'core', group: 'astral' },
  ],
});
