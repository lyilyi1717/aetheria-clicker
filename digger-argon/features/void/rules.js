// Dig void feature (rules): Chrono-Mining (Chapter 12 / Month 11).
// Temporal Echo Blocks record player swings (up to 10) and automatically replay them
// every 2.0 seconds in that column.
import { use, BLOCKS, emit, fold, PARAMS } from '../../core/registry.js';
import { COLS, cellAt, VIEW_ROWS } from '../../core/grid.js';
import { breakCell, damage, pickPower } from '../../core/rules.js';
import strings from './strings.js';

export const CHRONO_BLOCK = 'chrono';

const p = {
  maxEchoSwings: 10,
  replayInterval: 2.0,
};

export function recordPlayerSwing(s, sw) {
  if (!s.void) s.void = { recordedSwings: [], replayTimer: 0 };
  const dmg = sw.dmg || (fold ? fold('swingDmg', s, pickPower(s)) : pickPower(s));
  s.void.recordedSwings.push({
    r: sw.r,
    c: sw.c,
    dmg,
    crit: !!sw.crit,
    t: s.t,
  });
  if (s.void.recordedSwings.length > p.maxEchoSwings) {
    s.void.recordedSwings.shift();
  }
  return s.void.recordedSwings.length;
}

export function replayChronoSwings(s, col, ev) {
  if (!s || !s.rows || !s.void || !s.void.recordedSwings.length) return 0;
  const swings = s.void.recordedSwings;
  let replayed = 0;

  for (const sw of swings) {
    // Find the topmost excavatable block in this column
    let targetR = -1;
    const maxR = s.top + Math.min(s.rows.length, VIEW_ROWS);
    for (let r = s.top; r < maxR; r++) {
      const cell = cellAt(s, r, col);
      if (cell && cell.t !== CHRONO_BLOCK) {
        targetR = r;
        break;
      }
    }
    if (targetR >= 0) {
      damage(s, targetR, col, sw.dmg, 'chrono', ev, { chain: 1, chrono: true });
      replayed++;
    }
  }

  if (ev) emit(s, ev, 'chronoReplayed', { col, count: replayed });
  return replayed;
}

export function triggerAllChronoReplays(s, ev) {
  if (!s || !s.rows) return 0;
  let totalReplayed = 0;
  const maxR = s.top + s.rows.length;
  const chronoCols = new Set();

  for (let r = s.top; r < maxR; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cellAt(s, r, c);
      if (cell && (cell.t === CHRONO_BLOCK || (BLOCKS[cell.t] && BLOCKS[cell.t].chrono))) {
        chronoCols.add(c);
      }
    }
  }

  for (const col of chronoCols) {
    totalReplayed += replayChronoSwings(s, col, ev);
  }
  return totalReplayed;
}

export const voidFeature = use({
  id: 'void',
  params: p,
  strings,
  state: {
    void: { init: () => ({ recordedSwings: [], replayTimer: 0 }), perSite: true },
  },
  blocks: {
    chrono: {
      at: 170,
      hp: 3,
      val: 30,
      chrono: true,
      notice: true,
    },
  },
  hooks: {
    swung(s, sw, ev) {
      recordPlayerSwing(s, sw);
    },
    step: {
      at: 132,
      fn(s, dt, ev) {
        if (!s.void) s.void = { recordedSwings: [], replayTimer: 0 };
        s.void.replayTimer = (s.void.replayTimer || 0) + dt;
        if (s.void.replayTimer >= p.replayInterval) {
          s.void.replayTimer -= p.replayInterval;
          triggerAllChronoReplays(s, ev);
        }
      },
    },
  },
  firsts: {
    chronoReplayed: () => 'void:chrono',
  },
  unlocks: [
    { id: 'void:chrono', cat: 'core', group: 'void' },
  ],
});
