// Dig feature: The Guilds of Alqahwa (Month 5 / Chapter 6 / ARGON-18)
// Assign 4 specialized Callings to the 8 Rafeeq seats:
//   - naqqab: +100% damage on Big Rock glowing cracks.
//   - baroodi: doubles TNT explosion radius and forces downward blast.
//   - ghawwas: +50% fossil/ore drop rate.
//   - muhandis: prevents living rock regrowth and places auto-lanterns in dark layers.
// Pair synergy: Naqqab + Baroodi triggers Coordinated Blast (500 pre-emptive damage upon Gate arrival).

import { use, emit, fold } from '../../core/registry.js';
import strings from './strings.js';

export const CALLINGS = {
  naqqab: {
    id: 'naqqab',
    role: 'boss_cracker',
    icon: 'chisel_heavy',
  },
  baroodi: {
    id: 'baroodi',
    role: 'pyrotechnician',
    icon: 'tnt_bundle',
  },
  ghawwas: {
    id: 'ghawwas',
    role: 'prospector',
    icon: 'fossil_pick',
  },
  muhandis: {
    id: 'muhandis',
    role: 'engineer',
    icon: 'lantern_gear',
  },
};

export const MAX_SEATS = 8;

export function ensureGuilds(s) {
  if (!s.guilds) {
    s.guilds = {
      callings: [null, null, null, null, null, null, null, null],
      hallUnlocked: true,
    };
  }
  if (!Array.isArray(s.guilds.callings)) {
    s.guilds.callings = [null, null, null, null, null, null, null, null];
  }
  while (s.guilds.callings.length < MAX_SEATS) {
    s.guilds.callings.push(null);
  }
  return s.guilds;
}

export function assignCalling(s, seatIndex, callingId, ev = () => {}) {
  ensureGuilds(s);
  if (seatIndex < 0 || seatIndex >= MAX_SEATS) return false;
  if (callingId !== null && !CALLINGS[callingId]) return false;

  s.guilds.callings[seatIndex] = callingId;
  emit(s, ev, 'callingAssigned', { seat: seatIndex, calling: callingId });
  return true;
}

export function getCalling(s, seatIndex) {
  ensureGuilds(s);
  if (seatIndex < 0 || seatIndex >= MAX_SEATS) return null;
  return s.guilds.callings[seatIndex];
}

// Active callings: only seats for currently hired / active diggers count!
export function activeCallings(s) {
  ensureGuilds(s);
  const activeCount = Math.min(MAX_SEATS, (s.diggers || []).length);
  const result = [];
  for (let i = 0; i < activeCount; i++) {
    const c = s.guilds.callings[i];
    if (c) result.push(c);
  }
  return result;
}

export function hasCalling(s, callingId) {
  return activeCallings(s).includes(callingId);
}

export function countCalling(s, callingId) {
  return activeCallings(s).filter(c => c === callingId).length;
}

export function hasGuildSynergy(s, synergyId) {
  if (synergyId === 'coordinated_blast') {
    return hasCalling(s, 'naqqab') && hasCalling(s, 'baroodi');
  }
  return false;
}

// Baroodi blast propagation vectors: downward and horizontal only (dr >= 0)
export function baroodiBlastVectors(rad) {
  const vectors = [];
  for (let dr = 0; dr <= rad; dr++) {
    for (let dc = -rad; dc <= rad; dc++) {
      if (dr === 0 && dc === 0) continue;
      vectors.push([dr, dc]);
    }
  }
  return vectors;
}

// Ghawwas drop rate multiplier
export function dropRateMultiplier(s, type) {
  if (hasCalling(s, 'ghawwas') && (type === 'fossil' || type === 'ore' || type === 'bone')) {
    return 1.5;
  }
  return 1.0;
}

// Coordinated Blast: 500 damage pre-emptive blast upon Gate arrival
export function triggerCoordinatedBlast(s, ev = () => {}) {
  if (!s.boss || s.boss.hp <= 0) return 0;
  if (s.boss.coordinatedBlastDone) return 0;

  const dmg = 500;
  const dealt = Math.min(s.boss.hp, dmg);
  s.boss.hp = Math.max(0, s.boss.hp - dealt);
  s.boss.you = (s.boss.you || 0) + dealt;
  s.boss.coordinatedBlastDone = true;

  emit(s, ev, 'coordinatedBlast', { dmg: dealt, gateHp: s.boss.hp });
  return dealt;
}

export const guilds = use({
  id: 'guilds',
  strings,
  state: {
    guilds: {
      init: () => ({
        callings: [null, null, null, null, null, null, null, null],
        hallUnlocked: true,
      }),
      survives: ['site'],
    },
  },
  mods: {
    // Naqqab: +100% damage on Big Rock glowing cracks
    weakCrackMult: (v, s) => (hasCalling(s, 'naqqab') ? v * 2 : v),
    // Baroodi: doubles TNT explosion radius and forces downward blast
    tntRadius: (v, s) => (hasCalling(s, 'baroodi') ? v * 2 : v),
    tntDownward: (v, s) => (hasCalling(s, 'baroodi') ? true : v),
    // Ghawwas: +50% fossil/ore drop rate
    fossilRate: (v, s) => (hasCalling(s, 'ghawwas') ? v * 1.5 : v),
    oreRate: (v, s) => (hasCalling(s, 'ghawwas') ? v * 1.5 : v),
    // Muhandis: prevents living rock regrowth
    preventRegrowth: (v, s) => (hasCalling(s, 'muhandis') ? true : v),
  },
  hooks: {
    gateOpened(s, b, ev) {
      if (hasGuildSynergy(s, 'coordinated_blast')) {
        triggerCoordinatedBlast(s, ev);
      }
    },
    step: {
      at: 450,
      fn(s, dt, ev) {
        // Muhandis auto-lantern in dark layers (The Black)
        if (hasCalling(s, 'muhandis') && s.deep && Array.isArray(s.deep.glows)) {
          const hasLantern = s.deep.glows.some(g => g.until > s.deep.bc);
          if (!hasLantern && s.top !== undefined) {
            const rad = 3;
            const life = 60;
            s.deep.glows.push({ r: s.top, c: 3, rad, until: (s.deep.bc || 0) + life });
            emit(s, ev, 'deepGlow', { r: s.top, c: 3, rad, t: 'lantern' });
          }
        }
      },
    },
  },
});
