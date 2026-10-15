// Dig feature: Live Tuning, Real-Time Debug Dashboard & Shortcuts.
// Rules side: registers persistent slice `debugOverrides` and provides game-state manipulation shortcuts.
import { use, emit, BLOCKS } from '../../core/registry.js';
import { addCoins, pickPower, breakCell } from '../../core/rules.js';
import { VIEW_ROWS, COLS, cellAt, LAYER } from '../../core/grid.js';
import { getTuning, setTuning, resetTuning, clearTuning, getActiveOverrides, exportTuningJson, importTuningJson, TUNING_CONFIG } from '../../core/tuning.js';
import strings from './strings.js';

export { getTuning, setTuning, resetTuning, clearTuning, getActiveOverrides, exportTuningJson, importTuningJson, TUNING_CONFIG };

// Shortcut: Add coins
export function addCoinsShortcut(s, n = 1000, ev = () => {}) {
  if (!s) return 0;
  addCoins(s, n, 'debug');
  emit(s, ev, 'debugAddCoins', { amount: n, total: s.coins });
  return s.coins;
}

// Shortcut: Add stars
export function addStarsShortcut(s, n = 1000, ev = () => {}) {
  if (!s) return 0;
  s.stars = (s.stars || 0) + n;
  s.totalStars = (s.totalStars || 0) + n;
  emit(s, ev, 'debugAddStars', { amount: n, total: s.stars });
  return s.stars;
}

// Shortcut: Break all breakable blocks in current view
export function breakViewShortcut(s, ev = () => {}) {
  if (!s || !s.rows) return 0;
  let broken = 0;
  const maxR = Math.min(s.top + s.rows.length, s.top + VIEW_ROWS);
  for (let r = s.top; r < maxR; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cellAt(s, r, c);
      if (!cell) continue;
      const B = BLOCKS[cell.t];
      if (B && (B.wall || B.boss)) continue;
      breakCell(s, r, c, 'debug', ev, { chain: 1, shatter: true });
      broken++;
    }
  }
  emit(s, ev, 'debugBreakView', { broken });
  return broken;
}

// Shortcut: Spawn Gate / Big Rock immediately at next row
export function spawnGateShortcut(s, ev = () => {}) {
  if (!s || !s.rows) return false;
  const targetRow = s.top + 1;
  if (!s.boss) {
    s.boss = {
      row: targetRow,
      hp: 1000,
      max: 1000,
      weak: 3,
      wt: 2.0,
      rub: 0,
      you: 0,
      crew: 0,
      gate: 1,
      dealt: 0,
    };
  } else {
    s.boss.row = targetRow;
    s.boss.hp = s.boss.max;
  }
  // Make row targetRow boss blocks
  const rowIdx = targetRow - s.top;
  if (s.rows[rowIdx]) {
    for (let c = 0; c < COLS; c++) {
      s.rows[rowIdx][c] = { t: 'boss', hp: 1, max: 1, s: 0, boss: true };
    }
  }
  emit(s, ev, 'debugSpawnGate', { row: targetRow });
  return true;
}

// Shortcut: Jump to level/floor
export function jumpLevelShortcut(s, floor, ev = () => {}) {
  if (!s) return false;
  const targetFloor = Math.max(1, Math.min(2000, Math.round(floor || 25)));
  if (s.run) {
    s.run.floor = targetFloor;
    s.run.ch = Math.min(12, Math.max(1, Math.ceil(targetFloor / (LAYER * 4))));
  }
  s.best = Math.max(s.best, targetFloor);
  emit(s, ev, 'debugJumpLevel', { floor: targetFloor });
  return targetFloor;
}

export const debug = use({
  id: 'debug',
  strings,
  state: {
    // Persistent tuning overrides surviving site transitions and land changes
    debugOverrides: { init: () => ({}), survives: ['site', 'land'] },
  },
});
