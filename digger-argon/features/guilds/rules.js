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

import { COLS } from '../../core/grid.js';

export function assignCalling(s, seatIndex, callingId, ev = () => {}) {
  ensureGuilds(s);
  if (seatIndex < 0 || seatIndex >= MAX_SEATS) return false;
  if (callingId !== null && !CALLINGS[callingId]) return false;

  s.guilds.callings[seatIndex] = callingId;
  if (s.rafeeqs && s.rafeeqs.roster && s.rafeeqs.roster[seatIndex]) {
    s.rafeeqs.roster[seatIndex].calling = callingId;
  }
  if (s.rafeeqSeats && s.rafeeqSeats[seatIndex]) {
    s.rafeeqSeats[seatIndex].calling = callingId;
  }
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
  if (synergyId === 'deep_dredge') {
    return hasCalling(s, 'ghawwas') && hasCalling(s, 'muhandis');
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
  if (hasCalling(s, 'ghawwas') && (type === 'fossil' || type === 'ore' || type === 'bone' || type === 'gem')) {
    return 1.5;
  }
  return 1.0;
}

// Coordinated Blast: 500 damage or 10% Gate pre-damage upon Gate arrival
export function triggerCoordinatedBlast(s, ev = () => {}, options = {}) {
  if (!s.boss || s.boss.hp <= 0) return 0;
  if (s.boss.coordinatedBlastDone) return 0;

  let dmg = 500;
  if (options.usePercent || options.percent || (s.boss.max && s.boss.max >= 5000)) {
    dmg = Math.round((s.boss.max || 5000) * 0.10);
  }
  const dealt = Math.min(s.boss.hp, dmg);
  s.boss.hp = Math.max(0, s.boss.hp - dealt);
  s.boss.you = (s.boss.you || 0) + dealt;
  s.boss.coordinatedBlastDone = true;

  emit(s, ev, 'coordinatedBlast', { dmg: dealt, gateHp: s.boss.hp, pct: 10 });
  return dealt;
}

// Deep Dredge: Ghawwas + Muhandis reveals unexcavated fossils within 4 blocks of any lantern
export function triggerDeepDredge(s, ev = () => {}) {
  if (!hasGuildSynergy(s, 'deep_dredge')) return [];
  const revealed = [];
  if (!s.deep || !Array.isArray(s.deep.glows) || !s.rows) return revealed;

  for (const glow of s.deep.glows) {
    const centerR = glow.r;
    const centerC = glow.c !== undefined ? glow.c : 3;
    const rad = 4;
    const maxR = s.top + s.rows.length;
    for (let r = Math.max(s.top, centerR - rad); r <= Math.min(maxR - 1, centerR + rad); r++) {
      const rowIdx = r - s.top;
      if (!s.rows[rowIdx]) continue;
      for (let c = Math.max(0, centerC - rad); c <= Math.min(COLS - 1, centerC + rad); c++) {
        const cell = s.rows[rowIdx][c];
        if (cell && (cell.t === 'fossil' || cell.t === 'lost')) {
          cell.revealed = true;
          cell.glint = true;
          revealed.push({ r, c });
        }
      }
    }
  }
  if (revealed.length > 0) {
    emit(s, ev, 'deepDredge', { count: revealed.length, revealed });
  }
  return revealed;
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
