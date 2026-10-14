// Dig geothermal feature (rules): The Geothermal Kiln (Chapter 4 / Month 3).
// Introduces thermal mechanics: Lava + Water obsidian reaction, row-shattering Obsidian Glass,
// Heat storage, Magma Burst, and the Great Siphon wonder at Alqahwa.
import { use, BLOCKS, emit, fold, PARAMS } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { COLS, cellAt, setCell, starsAt } from '../../core/grid.js';
import { breakCell, damage, pickPower } from '../../core/rules.js';
import { ROAD, roadKey } from '../sites/rules.js';
import strings from './strings.js';

const p = {
  heatPerBlock: 5,
  heatCap: 100,
  burstSwings: 10,
  burstRadius: 1,
  burstDamageMult: 3,
  siphonRatePct: 0.01,
  basaltShare: 0.12,
  lavaShare: 0.04,
};

const pk = (r, c) => r + ',' + c;

// Re-entrancy guard for obsidian row shattering
let shattering = false;

export function shatterObsidianRow(s, r, c, ev) {
  if (shattering) return;
  shattering = true;
  try {
    for (let col = 0; col < COLS; col++) {
      if (col === c) continue;
      const cell = cellAt(s, r, col);
      if (!cell) continue;
      if (BLOCKS[cell.t] && BLOCKS[cell.t].wall) continue;
      breakCell(s, r, col, 'shatter', ev, { chain: 1, shatter: true, rowShatter: true });
    }
    emit(s, ev, 'obsidianShatter', { r, c });
  } finally {
    shattering = false;
  }
}

// Reaction: Lava + Water -> Obsidian Glass
export function quenchLavaCell(s, r, c, ev) {
  const cell = cellAt(s, r, c);
  if (!cell || cell.t !== 'lava') return false;
  setCell(s, r, c, { t: 'obsidian', hp: 1, max: 1, s: cell.s || 0 });
  emit(s, ev, 'lavaQuenched', { r, c });
  emit(s, ev, 'obsidianFormed', { r, c });
  return true;
}

export function quenchLavaWater(s, ev) {
  if (!s || !s.rows) return 0;
  let quenched = 0;
  const maxR = s.top + s.rows.length;
  for (let r = s.top; r < maxR; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cellAt(s, r, c);
      if (!cell || cell.t !== 'lava') continue;

      let touchesWater = false;
      if (s.pools && s.pools[pk(r, c)] > s.t) touchesWater = true;
      if (!touchesWater) {
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nr = r + dr, nc = c + dc;
          if (s.pools && s.pools[pk(nr, nc)] > s.t) { touchesWater = true; break; }
          const ncell = cellAt(s, nr, nc);
          if (ncell && (ncell.t === 'water' || ncell.wet > s.t)) { touchesWater = true; break; }
        }
      }

      if (touchesWater) {
        if (quenchLavaCell(s, r, c, ev)) quenched++;
      }
    }
  }
  return quenched;
}

// Heat accumulation & Magma Burst
export function addHeat(s, amount = p.heatPerBlock, ev) {
  if (!s.geothermal) s.geothermal = { heat: 0, maxHeat: p.heatCap, burstSwings: 0, siphonAcc: 0 };
  const prev = s.geothermal.heat;
  s.geothermal.heat = Math.min(p.heatCap, s.geothermal.heat + amount);
  if (s.geothermal.heat >= p.heatCap && s.geothermal.burstSwings === 0) {
    s.geothermal.burstSwings = p.burstSwings;
    emit(s, ev, 'magmaBurstReady', { swings: p.burstSwings });
  }
  emit(s, ev, 'heatGain', { heat: s.geothermal.heat, amount });
  return s.geothermal.heat;
}

export function triggerMagmaBurst(s, r, c, ev) {
  if (!s.geothermal || s.geothermal.burstSwings <= 0) return false;
  s.geothermal.burstSwings--;
  const pwr = pickPower(s) * p.burstDamageMult;
  const cleaved = [];
  for (let dr = -p.burstRadius; dr <= p.burstRadius; dr++) {
    for (let dc = -p.burstRadius; dc <= p.burstRadius; dc++) {
      if (dr === 0 && dc === 0) continue;
      const tr = r + dr, tc = c + dc;
      const cell = cellAt(s, tr, tc);
      if (!cell) continue;
      if (BLOCKS[cell.t] && BLOCKS[cell.t].wall) continue;
      cleaved.push({ r: tr, c: tc });
      damage(s, tr, tc, pwr, 'you', ev, { chain: 1, burst: true, magma: true });
    }
  }
  if (s.geothermal.burstSwings === 0) {
    s.geothermal.heat = 0;
    emit(s, ev, 'magmaBurstEnd', {});
  }
  emit(s, ev, 'magmaBurst', { r, c, cleaved, swingsLeft: s.geothermal.burstSwings });
  return true;
}

// Great Siphon Wonder
export function hasGreatSiphon(s) {
  if (!s) return false;
  if (s.greatSiphon) return true;
  if (s.road && s.road.stamps) {
    const f80 = ROAD[79];
    if (f80 && s.road.stamps[roadKey(f80)]?.fin) return true;
  }
  return false;
}

export function unlockGreatSiphon(s, ev) {
  s.greatSiphon = true;
  emit(s, ev, 'greatSiphonUnlocked', {});
}

export function greatSiphonRate(s) {
  if (!hasGreatSiphon(s)) return 0;
  const reach = (s.road && s.road.reach) || 80;
  return p.siphonRatePct * starsAt(Math.max(50, reach));
}

export const geothermal = use({
  id: 'geothermal',
  params: p,
  strings,
  state: {
    geothermal: { init: () => ({ heat: 0, maxHeat: p.heatCap, burstSwings: 0, siphonAcc: 0 }), perSite: true },
  },
  blocks: {
    basalt: {
      at: 140,
      hp: 4,
      val: 15,
      hot: true,
      notice: true,
    },
  },
  hooks: {
    broke(s, b, ev) {
      if (b.t === 'obsidian') {
        shatterObsidianRow(s, b.r, b.c, ev);
      }
      const isHot = (b.B && b.B.hot) || b.t === 'basalt' || b.t === 'lava' || b.t === 'ember' || b.t === 'obsidian' || b.t === 'hot_basalt';
      if (isHot) {
        addHeat(s, p.heatPerBlock, ev);
      }
    },
    swung(s, sw, ev) {
      if (s.geothermal && s.geothermal.burstSwings > 0) {
        triggerMagmaBurst(s, sw.r, sw.c, ev);
      }
    },
    step: {
      at: 128,
      fn(s, dt, ev) {
        quenchLavaWater(s, ev);
        if (hasGreatSiphon(s)) {
          const rate = greatSiphonRate(s);
          if (rate > 0) {
            s.geothermal.siphonAcc = (s.geothermal.siphonAcc || 0) + (rate / 3600) * dt;
            if (s.geothermal.siphonAcc >= 1) {
              const whole = Math.floor(s.geothermal.siphonAcc);
              s.stars = (s.stars || 0) + whole;
              s.geothermal.siphonAcc -= whole;
              emit(s, ev, 'siphonStar', { stars: whole });
            }
          }
        }
      },
    },
    siteFinished(s, fin, ev) {
      if (hasGreatSiphon(s) && !s.greatSiphon) {
        unlockGreatSiphon(s, ev);
      }
    },
    row(s, ctx) {
      if (s.run && s.run.ch === 4) {
        if (ctx.r > s.top + 2) {
          for (let c = 0; c < COLS; c++) {
            if (ctx.get(c) === 'dirt') {
              const roll = rnd();
              if (roll < p.lavaShare) ctx.set(c, 'lava');
              else if (roll < p.lavaShare + p.basaltShare) ctx.set(c, 'basalt');
            }
          }
        }
      }
    },
  },
  firsts: {
    obsidianFormed: () => 'geo:obsidian',
    magmaBurst: () => 'geo:magma',
    greatSiphonUnlocked: () => 'geo:siphon',
  },
  unlocks: [
    { id: 'geo:obsidian', cat: 'core', group: 'geothermal' },
    { id: 'geo:magma', cat: 'core', group: 'geothermal' },
    { id: 'geo:siphon', cat: 'core', group: 'geothermal' },
  ],
});

// Configure hot flags and aliases on existing BLOCKS
if (BLOCKS.obsidian) {
  BLOCKS.obsidian.hot = true;
  if (!BLOCKS.obsidian.broke) {
    BLOCKS.obsidian.broke = (s, b, ev) => shatterObsidianRow(s, b.r, b.c, ev);
  }
}
if (BLOCKS.lava) {
  BLOCKS.lava.hot = true;
}
