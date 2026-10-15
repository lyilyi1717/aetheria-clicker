// Dig feature "borehole": Global Subterranean Borehole Tracker
// Collaborative community mega-shaft drilled to the Earth's Core.
// Local contribution accumulator with offline buffering, sync engine, and universal milestone rewards.

import { use, emit } from '../../core/registry.js';
import strings from './strings.js';

export const BOREHOLE_EPOCH = 1760000000000; // Fixed epoch timestamp (ms)
export const BOREHOLE_BASE_DEPTH = 950000;    // Base depth (m) near 1M milestone
export const BOREHOLE_SIM_RATE = 3.5;         // Global drilling rate (m/s)

export const MILESTONES = [
  {
    id: 'm1m',
    metres: 1000000,
    reward: 'lantern_deep',
    titleKey: 'borehole_m1m_title',
    descKey: 'borehole_m1m_desc',
  },
  {
    id: 'm10m',
    metres: 10000000,
    reward: 'golden_sieve_festival',
    titleKey: 'borehole_m10m_title',
    descKey: 'borehole_m10m_desc',
  },
  {
    id: 'm100m',
    metres: 100000000,
    reward: 'lost_scroll_core',
    titleKey: 'borehole_m100m_title',
    descKey: 'borehole_m100m_desc',
  },
];

export const MOCK_CONTRIBUTORS = [
  { name: 'Fatima', origin: 'Muscat', metres: 140 },
  { name: 'Tariq', origin: 'Riyadh', metres: 215 },
  { name: 'Zayd', origin: 'Dubai', metres: 85 },
  { name: 'Layla', origin: 'Cairo', metres: 310 },
  { name: 'Kareem', origin: 'Doha', metres: 175 },
  { name: 'Samira', origin: 'Amman', metres: 95 },
];

/**
 * Calculates simulated community depth progression.
 */
export function getCommunityDepth(now) {
  const t = (now !== undefined && now >= BOREHOLE_EPOCH) ? now : BOREHOLE_EPOCH;
  const elapsedSecs = Math.max(0, (t - BOREHOLE_EPOCH) / 1000);
  return Math.floor(BOREHOLE_BASE_DEPTH + elapsedSecs * BOREHOLE_SIM_RATE);
}

/**
 * Calculates full global depth including local player contribution.
 */
export function getGlobalDepth(s, now) {
  const comm = getCommunityDepth(now);
  const local = s && s.borehole ? (s.borehole.totalContributed + s.borehole.pendingMetres) : 0;
  return comm + local;
}

/**
 * Returns the next upcoming milestone object or null if all are reached.
 */
export function getNextMilestone(currentDepth) {
  for (const m of MILESTONES) {
    if (currentDepth < m.metres) {
      const prevMetres = m.id === 'm1m' ? 0 : m.id === 'm10m' ? 1000000 : 10000000;
      const progress = Math.min(1, Math.max(0, (currentDepth - prevMetres) / (m.metres - prevMetres)));
      return {
        ...m,
        progress,
        pct: Math.floor(progress * 100),
      };
    }
  }
  return null;
}

/**
 * Checks if a milestone is unlocked in state.
 */
export function isMilestoneUnlocked(s, milestoneId) {
  return !!(s && s.borehole && s.borehole.unlockedMilestones && s.borehole.unlockedMilestones[milestoneId]);
}

/**
 * Checks if The Golden Sieve Festival is currently active.
 */
export function isFestivalActive(s) {
  return !!(s && s.borehole && s.borehole.festivalActive && s.borehole.festivalTimer > 0);
}

/**
 * Manually accumulate local contribution metres.
 */
export function contributeMetres(s, metres, ev) {
  if (!s.borehole) return;
  s.borehole.pendingMetres += Math.max(0, Math.floor(metres));
  if (ev) emit(s, ev, 'boreholePending', { pending: s.borehole.pendingMetres });
}

/**
 * Syncs pending buffered metres to the global mega-shaft and checks milestones.
 */
export function syncBorehole(s, ev, now) {
  if (!s.borehole) return null;
  const b = s.borehole;
  const flushed = b.pendingMetres;

  b.totalContributed += flushed;
  b.pendingMetres = 0;
  b.lastSyncedAt = now !== undefined ? now : (s.t ? Math.floor(s.t) : 0);

  const currentDepth = getGlobalDepth(s, b.lastSyncedAt);
  b.lastSyncedDepth = currentDepth;

  // Check Universal Milestones
  for (const m of MILESTONES) {
    if (currentDepth >= m.metres && !b.unlockedMilestones[m.id]) {
      b.unlockedMilestones[m.id] = true;

      // Apply Milestone Rewards
      if (m.id === 'm1m') {
        // Unlock The Lantern of the Deep pick skin
        b.skinUnlocked = true;
        if (!s.contractLook) s.contractLook = { skin: '', hat: '' };
        s.contractLook.skin = 'lantern_deep';
      } else if (m.id === 'm10m') {
        // Unlock The Golden Sieve Festival at Alqahwa (+20% coins)
        b.festivalActive = true;
        b.festivalTimer = 3600; // 1 hour festival
      } else if (m.id === 'm100m') {
        // Unlock The Lost Scroll of the Core chronicle
        b.chronicleUnlocked = true;
      }

      if (ev) {
        emit(s, ev, 'boreholeMilestone', {
          id: m.id,
          metres: m.metres,
          reward: m.reward,
        });
      }
    }
  }

  // Update contributor list with local player entry
  const recent = [...MOCK_CONTRIBUTORS];
  if (flushed > 0) {
    recent.unshift({ name: 'You', origin: 'Alqahwa', metres: flushed });
  }
  b.contributors = recent.slice(0, 6);

  if (ev) {
    emit(s, ev, 'boreholeSync', {
      flushed,
      totalContributed: b.totalContributed,
      globalDepth: currentDepth,
    });
  }

  return {
    flushed,
    totalContributed: b.totalContributed,
    globalDepth: currentDepth,
  };
}

export const borehole = use({
  id: 'borehole',
  strings,
  state: {
    borehole: {
      init: () => ({
        pendingMetres: 0,
        totalContributed: 0,
        lastSyncedAt: 0,
        lastSyncedDepth: BOREHOLE_BASE_DEPTH,
        unlockedMilestones: {
          m1m: false,
          m10m: false,
          m100m: false,
        },
        skinUnlocked: false,
        festivalActive: false,
        festivalTimer: 0,
        chronicleUnlocked: false,
        contributors: [...MOCK_CONTRIBUTORS],
        autoSyncTimer: 0,
      }),
      survives: ['site', 'land'],
    },
  },
  mods: {
    // During The Golden Sieve Festival, coin drops are boosted by +20%
    coinMult(v, s) {
      return isFestivalActive(s) ? v * 1.2 : v;
    },
  },
  hooks: {
    broke(s, d) {
      if (s.borehole) {
        // Breaking blocks adds to pending borehole metres
        const added = (d && d.rich) ? 3 : (d && d.coins > 0) ? 2 : 1;
        s.borehole.pendingMetres += added;
      }
    },
    step(s, dt, ev) {
      if (!s.borehole) return;
      const b = s.borehole;

      // Countdown festival timer
      if (b.festivalActive && b.festivalTimer > 0) {
        b.festivalTimer -= dt;
        if (b.festivalTimer <= 0) {
          b.festivalActive = false;
          b.festivalTimer = 0;
          if (ev) emit(s, ev, 'boreholeFestivalEnd', {});
        }
      }

      // Auto-sync every 30s or when pendingMetres exceeds 100
      b.autoSyncTimer = (b.autoSyncTimer || 0) + dt;
      if (b.autoSyncTimer >= 30 || b.pendingMetres >= 100) {
        b.autoSyncTimer = 0;
        syncBorehole(s, ev);
      }
    },
  },
});
