// Dig feature: The Clockwork Spire (Month 6 / Chapter 7 / ARGON-19)
// Industrial rhythm mechanics in Chapter 7 (Levels 121–140).
// - Pneumatic wall piston blocks (BLOCKS.piston / PISTON): fire every 4th beat, dealing 500 damage to block below.
// - Steam Whistle tool: accelerates game loop tempo by +50% for 30 seconds.
// - Clockwork Orrery: seasonal wonder at Alqahwa upon completing Level 140,
//   permanently synchronizing all Rafeeq strikes to beats 1, 5, 9, 13 of the 16-step bar.

import { use, BLOCKS, emit, fold } from '../../core/registry.js';
import { cellAt, COLS } from '../../core/grid.js';
import { damage } from '../../core/rules.js';
import { ROAD, roadKey } from '../sites/rules.js';
import strings from './strings.js';

export const PISTON = 'piston';
export const ORRERY_STEPS = [0, 4, 8, 12]; // 0-indexed sixteenth steps corresponding to beats 1, 5, 9, 13

const p = {
  pistonDamage: 500,
  whistleDuration: 30,
  whistleTempoMult: 1.5,
  pistonShare: 0.15,
};

export function ensureClockwork(s) {
  if (!s.clockwork) {
    s.clockwork = {
      whistleTtl: 0,
      orreryUnlocked: false,
      lastBeat: -1,
    };
  }
  return s.clockwork;
}

// Pneumatic wall piston: deals 500 damage to the block directly below (r + 1, c)
export function firePistonAt(s, r, c, ev = () => {}) {
  const targetR = r + 1;
  const targetC = c;
  const targetCell = cellAt(s, targetR, targetC);

  if (targetCell) {
    damage(s, targetR, targetC, p.pistonDamage, 'piston', ev);
    emit(s, ev, 'pistonFire', { r, c, targetR, targetC, dmg: p.pistonDamage });
    return true;
  }
  return false;
}

export function fireAllPistons(s, ev = () => {}) {
  if (!s || !s.rows) return 0;
  let fired = 0;
  const maxR = s.top + s.rows.length;
  for (let r = s.top; r < maxR; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cellAt(s, r, c);
      if (cell && (cell.t === 'piston' || cell.t === PISTON)) {
        if (firePistonAt(s, r, c, ev)) fired++;
      }
    }
  }
  return fired;
}

// Steam Whistle tool: +50% tempo for 30 seconds
export function useSteamWhistle(s, ev = () => {}) {
  ensureClockwork(s);
  s.clockwork.whistleTtl = p.whistleDuration;
  emit(s, ev, 'steamWhistleActivated', { duration: p.whistleDuration });
  return true;
}

export function hasSteamWhistle(s) {
  return !!(s && s.clockwork && s.clockwork.whistleTtl > 0);
}

// Clockwork Orrery: Seasonal Wonder at Alqahwa (unlocked upon completing Level 140)
export function hasClockworkOrrery(s) {
  if (!s) return false;
  if (s.clockwork && s.clockwork.orreryUnlocked) return true;
  if (s.clockworkOrrery) return true;
  if (s.road && s.road.level > 140) return true;
  if (s.road && s.road.stamps) {
    const f140 = ROAD && ROAD[139];
    if (f140 && s.road.stamps[roadKey(f140)]?.fin) return true;
    if (s.road.stamps.road_140?.fin || s.road.stamps[140]?.fin) return true;
  }
  return false;
}

export function unlockClockworkOrrery(s, ev = () => {}) {
  ensureClockwork(s);
  s.clockwork.orreryUnlocked = true;
  s.clockworkOrrery = true;
  emit(s, ev, 'clockworkOrreryUnlocked', {});
  return true;
}

// Helper: checks if a 16-step bar step matches beats 1, 5, 9, 13 (steps 0, 4, 8, 12)
export function isOrreryStep(stepIndex) {
  const norm = ((stepIndex % 16) + 16) % 16;
  return ORRERY_STEPS.includes(norm);
}

// Synchronizes all Rafeeq strikes to beats 1, 5, 9, 13 of the 16-step bar
export function syncRafeeqsToOrrery(s, bpm = 100) {
  if (!hasClockworkOrrery(s) || !s.diggers) return;
  const effectiveBpm = hasSteamWhistle(s) ? Math.round(bpm * p.whistleTempoMult) : bpm;
  const quarterSec = 60 / effectiveBpm;
  const modT = (s.t || 0) % quarterSec;
  const nextDownbeat = quarterSec - modT;

  for (const d of s.diggers) {
    if (d.cd === undefined || d.cd <= 0 || d.cd > quarterSec) {
      d.cd = nextDownbeat;
    }
  }
}

export const clockwork = use({
  id: 'clockwork',
  strings,
  state: {
    clockwork: {
      init: () => ({
        whistleTtl: 0,
        orreryUnlocked: false,
        lastBeat: -1,
      }),
      perSite: false,
      survives: ['site'],
    },
  },
  blocks: {
    piston: {
      at: 150,
      hp: 1,
      val: 0,
      piston: true,
      notice: true,
    },
  },
  tools: {
    steamWhistle: {
      key: '5',
      open: () => true,
      can: () => true,
      use: (s, r, c, ev) => useSteamWhistle(s, ev),
    },
  },
  mods: {
    bpm: (v, s) => (hasSteamWhistle(s) ? Math.round(v * p.whistleTempoMult) : v),
    tempoMult: (v, s) => (hasSteamWhistle(s) ? v * p.whistleTempoMult : v),
    crewRate: (v, s) => (hasSteamWhistle(s) ? v * p.whistleTempoMult : v),
  },
  hooks: {
    step: {
      at: 350,
      fn(s, dt, ev) {
        if (!s) return;
        ensureClockwork(s);

        // Countdown Steam Whistle TTL
        if (s.clockwork.whistleTtl > 0) {
          s.clockwork.whistleTtl = Math.max(0, s.clockwork.whistleTtl - dt);
        }

        // Beat tracking: quarter-note beat length = 60 / bpm
        const baseBpm = 100;
        const currentBpm = hasSteamWhistle(s) ? Math.round(baseBpm * p.whistleTempoMult) : baseBpm;
        const beatSec = 60 / currentBpm;
        const currentBeat = Math.floor((s.t || 0) / beatSec);

        // Every 4th beat (downbeat of bar), fire pneumatic pistons
        if (currentBeat !== s.clockwork.lastBeat) {
          s.clockwork.lastBeat = currentBeat;
          if (currentBeat % 4 === 0) {
            fireAllPistons(s, ev);
          }
        }

        // Align Rafeeqs if Clockwork Orrery is active
        if (hasClockworkOrrery(s)) {
          syncRafeeqsToOrrery(s, currentBpm);
        }
      },
    },
    row(s, ctx) {
      // Natural piston placement in Chapter 7 (levels 121–140)
      const lvl = (s.run && s.run.lvl) || (s.road && s.road.level) || 0;
      const isCh7 = (lvl >= 121 && lvl <= 140) || (s.run && s.run.ch === 7);
      if (isCh7 && ctx.r % 6 === 0 && ctx.r > s.top + 2) {
        // Place piston on outer rock wall
        ctx.set(0, 'piston');
      }
    },
  },
});
