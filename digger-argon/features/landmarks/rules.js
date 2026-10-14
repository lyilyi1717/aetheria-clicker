// Dig feature: Buried Environmental Wonders (Authored Landmarks).
// Embeds authored wonders at fixed depths across road levels:
//   Level 2: 15m continuous powder fuse running straight down
//   Level 3: Sleeping Dhab lizard carving an 8-row tunnel when excavated
//   Level 7: Subterranean lighthouse generator permanently illuminating dark caverns
//   Level 13: Aqueduct quenching lava pockets into obsidian crystal lines
import { use, emit, BLOCKS } from '../../core/registry.js';
import { cellAt, setCell, makeCell } from '../../core/grid.js';
import { damage, breakCell } from '../../core/rules.js';
import { roadIndex } from '../sites/rules.js';
import strings from './strings.js';

export const LANDMARKS = {
  fuse15: {
    id: 'fuse15',
    level: 2,
    atRow: 10,
    col: 4,
    w: 1,
    h: 15,
    type: 'fuse',
  },
  dhabCave: {
    id: 'dhabCave',
    level: 3,
    atRow: 12,
    col: 4,
    w: 2,
    h: 2,
    type: 'dhab',
  },
  lighthouse: {
    id: 'lighthouse',
    level: 7,
    atRow: 16,
    col: 4,
    w: 2,
    h: 2,
    type: 'lighthouse',
  },
  aqueduct: {
    id: 'aqueduct',
    level: 13,
    atRow: 20,
    col: 2,
    w: 6,
    h: 1,
    type: 'aqueduct',
  },
};

export function currentLevel(s) {
  if (s && s.level !== undefined) return s.level;
  if (s && s.run && s.run.level !== undefined) return s.run.level;
  if (s && s.run) {
    if (s.run.site === 'boom' && s.run.floor === 50) return 2;
    if (s.run.site === 'bones' && s.run.floor === 75) return 3;
    if (s.run.site === 'bones' && s.run.floor === 125) return 7;
    if (s.run.site === 'dunes' && s.run.floor === 150) return 13;
  }
  const idx = roadIndex(s);
  return idx >= 0 ? idx + 1 : 1;
}

export function injectLandmarkRow(s, ctx) {
  const lvl = currentLevel(s);
  const r = ctx.r;

  // Level 2: 15m continuous powder fuse (rows 10..24 at col 4)
  if (lvl === 2) {
    if (r >= 10 && r < 25) {
      ctx.set(4, 'fuse');
    }
  }

  // Level 3: Sleeping Dhab lizard (rows 12..13 at cols 4..5)
  if (lvl === 3) {
    if (r >= 12 && r < 14) {
      ctx.set(4, 'dhab');
      ctx.set(5, 'dhab');
    }
  }

  // Level 7: Subterranean lighthouse generator (rows 16..17 at cols 4..5)
  if (lvl === 7) {
    if (r >= 16 && r < 18) {
      ctx.set(4, 'lighthouse');
      ctx.set(5, 'lighthouse');
    }
  }

  // Level 13: Aqueduct (row 20 at cols 2..7) + lava pockets below (rows 21..24)
  if (lvl === 13) {
    if (r === 20) {
      for (let c = 2; c < 8; c++) ctx.set(c, 'aqueduct');
    } else if (r >= 21 && r <= 24) {
      for (let c = 2; c < 8; c++) ctx.set(c, 'lava');
    }
  }
}

export const landmarks = use({
  id: 'landmarks',
  strings,
  state: {
    landmarks: { init: () => ({ illuminated: false, lighthouseLit: false, discovered: {} }), survives: ['site'] },
  },
  mods: {
    sight: (v, s) => (s.landmarks && (s.landmarks.illuminated || s.landmarks.lighthouseLit) ? 99 : v),
  },
  blocks: {
    fuse: {
      at: 85,
      hp: 1,
      val: 5,
      chain: true,
      damage(s, r, c, cell, dmg, src, ev, info) {
        breakCell(s, r, c, src, ev, info);
        return true;
      },
      broke(s, b, ev) {
        emit(s, ev, 'fuseDetonate', { r: b.r, c: b.c });
        // Chain downwards into adjacent fuse block
        const nextRow = b.r + 1;
        const cell = cellAt(s, nextRow, b.c);
        if (cell && (cell.t === 'fuse' || cell.t === 'tnt')) {
          damage(s, nextRow, b.c, 9999, 'fuse', ev, { chain: (b.chain || 0) + 1 });
        }
      },
    },
    dhab: {
      at: 86,
      hp: 1,
      val: 50,
      special: true,
      broke(s, b, ev) {
        emit(s, ev, 'dhabAwake', { r: b.r, c: b.c });
        const rowsCleared = [];
        for (let dr = 1; dr <= 8; dr++) {
          const tr = b.r + dr;
          for (let dc = 0; dc <= 1; dc++) {
            const tc = b.c + dc;
            if (cellAt(s, tr, tc)) {
              breakCell(s, tr, tc, 'dhab', ev);
            }
          }
          rowsCleared.push(tr);
        }
        emit(s, ev, 'dhabTunnel', { r: b.r, c: b.c, rows: rowsCleared });
      },
    },
    lighthouse: {
      at: 87,
      hp: 1,
      val: 100,
      special: true,
      broke(s, b, ev) {
        if (!s.landmarks) s.landmarks = {};
        s.landmarks.lighthouseLit = true;
        s.landmarks.illuminated = true;
        emit(s, ev, 'lighthouseLit', { r: b.r, c: b.c });
      },
    },
    aqueduct: {
      at: 88,
      hp: 1,
      val: 100,
      special: true,
      broke(s, b, ev) {
        emit(s, ev, 'aqueductQuench', { r: b.r, c: b.c });
        const quenched = [];
        for (let dr = 0; dr <= 4; dr++) {
          for (let dc = -2; dc <= 7; dc++) {
            const tr = b.r + dr;
            const tc = b.c + dc;
            const cell = cellAt(s, tr, tc);
            if (cell && (cell.t === 'lava' || cell.t === 'stone' || cell.t === 'dirt' || cell.t === 'clay')) {
              setCell(s, tr, tc, makeCell(tr, 'obsidian', 1));
              quenched.push({ r: tr, c: tc });
            }
          }
        }
        emit(s, ev, 'obsidianFormed', { count: quenched.length, cells: quenched });
      },
    },
    obsidian: {
      at: 90,
      hp: 1,
      val: 80,
    },
  },
  hooks: {
    row(s, ctx) {
      injectLandmarkRow(s, ctx);
    },
  },
});
