// Dig aquifers feature (rules): The Sunken Aquifers (Chapter 3 / Month 2).
// Introduces fluid hydraulic mechanics, pressure wells, silt erosion, waterwheel rubble sieving, and Hydro-Pick.
import { use, BLOCKS, emit, fold, PARAMS } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { COLS, cellAt, setCell, dirtVal } from '../../core/grid.js';
import { breakCell, damage, later, pickPower, coinMult, addCoins } from '../../core/rules.js';
import { getTuning } from '../../core/tuning.js';
import strings from './strings.js';


export const SILT = 'silt';
export const PRESSURE_WELL = 'pressureWell';

const p = {
  flowGap: 0.08,
  dry: 25,
  wellVol: 20,
  hydroPower: 5,
  hydroDepth: 5,
  rubbleMult: 3,
  siltShare: 0.12,
  wellShare: 0.04,
};

const pk = (r, c) => r + ',' + c;

export function hasWaterAt(s, r, c) {
  if (!s) return false;
  if (c !== undefined && c !== null && c >= 0) {
    if (s.pools) {
      if (s.pools[pk(r, c)] > s.t) return true;
      const maxR = s.top + (s.rows ? s.rows.length : 20);
      for (let rr = r; rr < maxR; rr++) {
        if (s.pools[pk(rr, c)] > s.t) return true;
      }
    }
    if (s.aquifer && s.aquifer.streams && s.aquifer.streams[c] > s.t) return true;
    if (s.rows) {
      const maxR = s.top + s.rows.length;
      for (let rr = r; rr < maxR; rr++) {
        const cell = cellAt(s, rr, c);
        if (cell && (cell.t === 'water' || cell.wet > s.t)) return true;
      }
    }
    return false;
  }
  if (s.pools && Object.keys(s.pools).some(k => s.pools[k] > s.t)) return true;
  if (s.rows) {
    for (const row of s.rows) {
      if (row.some(cell => cell && (cell.t === 'water' || cell.wet > s.t))) return true;
    }
  }
  return false;
}

export const rubbleInWater = (s, r, c) => hasWaterAt(s, r, c);

// Instant erosion of silt when contacted by water
export function erodeSiltAt(s, r, c, ev) {
  const cell = cellAt(s, r, c);
  if (!cell || cell.t !== 'silt') return false;
  breakCell(s, r, c, 'water', ev, { chain: 1, eroded: true });
  emit(s, ev, 'siltErode', { r, c });
  return true;
}

export function flowAquifer(s, q, ev) {
  const { r, c, vol } = q;
  if (vol <= 0) return;

  const current = cellAt(s, r, c);
  if (current && current.t === 'silt') {
    erodeSiltAt(s, r, c, ev);
  } else if (current !== null) {
    return;
  }

  if (!s.pools) s.pools = {};
  s.pools[pk(r, c)] = s.t + p.dry;
  if (!s.aquifer) s.aquifer = { streams: {}, activeWells: 0 };
  if (!s.aquifer.streams) s.aquifer.streams = {};
  s.aquifer.streams[c] = s.t + p.dry;
  emit(s, ev, 'aquiferFlow', { r, c, vol });

  // Erode silt on all 4 neighbors instantly upon contact, and quench any adjacent lava
  for (const [dr, dc] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) {
    const nr = r + dr, nc = c + dc;
    if (nc < 0 || nc >= COLS) continue;
    erodeSiltAt(s, nr, nc, ev);

    const ncell = cellAt(s, nr, nc);
    if (ncell && (ncell.t === 'lava' || ncell.t === 'molten_basalt')) {
      setCell(s, nr, nc, { t: 'obsidian', hp: 1, max: 1, s: ncell.s || 0 });
      emit(s, ev, 'lavaQuenched', { r: nr, c: nc });
      emit(s, ev, 'obsidianFormed', { r: nr, c: nc });
    }
  }

  // Cellular automaton: move down if empty; move horizontally if blocked
  const below = cellAt(s, r + 1, c);
  if (below === null) {
    later(s, p.flowGap, 'aquiferFlow', { r: r + 1, c, vol: vol - 1 });
  } else if (below && below.t === 'silt') {
    erodeSiltAt(s, r + 1, c, ev);
    later(s, p.flowGap, 'aquiferFlow', { r: r + 1, c, vol: vol - 1 });
  } else {
    // Blocked below: move horizontally (sideways) into open spaces
    const sides = [];
    for (const dc of [-1, 1]) {
      const nc = c + dc;
      if (nc < 0 || nc >= COLS) continue;
      const sideCell = cellAt(s, r, nc);
      if (sideCell === null) {
        sides.push(nc);
      } else if (sideCell && sideCell.t === 'silt') {
        erodeSiltAt(s, r, nc, ev);
        sides.push(nc);
      }
    }
    if (sides.length > 0 && vol > 1) {
      const share = Math.max(1, Math.floor((vol - 1) / sides.length));
      for (const sc of sides) {
        later(s, p.flowGap, 'aquiferFlow', { r, c: sc, vol: share });
      }
    } else {
      emit(s, ev, 'aquiferSplash', { r, c });
    }
  }
}

export function triggerAquiferFlow(s, r, c, vol = 20, ev) {
  flowAquifer(s, { r, c, vol }, ev);
}

export function hydroPickUse(s, r, c, ev) {
  const pwr = pickPower(s) * p.hydroPower;
  const depth = getTuning('hydroDepth', s, p.hydroDepth);
  const struck = [];
  for (let k = 0; k < depth; k++) {
    const tr = r + k;
    const cell = cellAt(s, tr, c);
    if (!cell) continue;
    struck.push({ r: tr, c });
    damage(s, tr, c, pwr, 'tool', ev, { chain: 1, tool: 1, hydro: true });
  }
  emit(s, ev, 'hydroPick', { r, c, struck, pwr });
  return struck;
}


export const aquifers = use({
  id: 'aquifers',
  params: p,
  strings,
  state: {
    aquifer: { init: () => ({ streams: {}, activeWells: 0 }), perSite: true, transient: true },
  },
  blocks: {
    pressureWell: {
      at: 132,
      hp: 1,
      val: 0,
      notice: true,
      broke(s, b, ev) {
        emit(s, ev, 'wellBurst', { r: b.r, c: b.c, src: b.src });
        emit(s, ev, 'burst', { r: b.r, c: b.c, src: b.src });
        triggerAquiferFlow(s, b.r, b.c, p.wellVol, ev);
      },
    },
    silt: {
      at: 134,
      hp: 2,
      val: 10,
      soft: true,
      notice: true,
      damage(s, r, c, cell, dmg, src, ev, info) {
        if (src === 'water' || (info && info.eroded)) {
          breakCell(s, r, c, 'water', ev, { chain: 1, eroded: true });
          emit(s, ev, 'siltErode', { r, c });
          return true;
        }
        cell.hp -= dmg;
        if (cell.hp <= 0) {
          breakCell(s, r, c, src, ev, info);
          return true;
        }
        return false;
      },
      broke(s, b, ev) {
        if (b.src === 'water') {
          emit(s, ev, 'siltErode', { r: b.r, c: b.c });
        }
      },
    },
  },
  tools: {
    hydroPick: {
      key: '4',
      open: () => true,
      can: (s, r, c) => r !== undefined && !!cellAt(s, r, c),
      use: hydroPickUse,
    },
  },
  queue: {
    aquiferFlow: flowAquifer,
  },
  mods: {
    rubbleMult: (v, s, r, c) => (hasWaterAt(s, r, c) ? v * p.rubbleMult : v),
  },
  hooks: {
    step: {
      at: 125,
      fn(s) {
        if (s.aquifer && s.aquifer.streams) {
          for (const c of Object.keys(s.aquifer.streams)) {
            if (s.aquifer.streams[c] <= s.t) delete s.aquifer.streams[c];
          }
        }
      },
    },
    row(s, ctx) {
      if (s.run && s.run.ch === 3) {
        // Natural aquifer generation in Chapter 3
        if (ctx.r > s.top + 2) {
          for (let c = 0; c < COLS; c++) {
            if (ctx.get(c) === 'dirt') {
              const roll = rnd();
              if (roll < p.wellShare) ctx.set(c, 'pressureWell');
              else if (roll < p.wellShare + p.siltShare) ctx.set(c, 'silt');
            }
          }
        }
      }
    },
  },
  firsts: {
    wellBurst: () => 'aquifer:well',
    siltErode: () => 'aquifer:silt',
    hydroPick: () => 'aquifer:hydropick',
  },
  unlocks: [
    { id: 'aquifer:well', cat: 'core', group: 'aquifers' },
    { id: 'aquifer:silt', cat: 'core', group: 'aquifers' },
    { id: 'aquifer:hydropick', cat: 'core', group: 'aquifers' },
  ],
});

// Ensure aliases are in place
if (BLOCKS.pressureWell && !BLOCKS.well) {
  BLOCKS.well = BLOCKS.pressureWell;
}
