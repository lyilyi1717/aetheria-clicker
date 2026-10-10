// Shared vocabulary of the core loop (docs/core-loop-plan.md CL-0). Every coreloop system imports
// its ids, hit levels, RNG and Fraction value from here; nothing here holds state.
import { P } from './params.js';

// Presence states (docs/core-loop-redesign.md §3.3)
export const PRESENCE = Object.freeze({ HANDS: 'hands', WATCH: 'watch', AWAY: 'away' });

// Fields, in the order of P.fields. A Field index is its position here.
export const FIELDS = Object.freeze([...P.fields]);
export const FIELD = Object.freeze({ TOWER: 0, MINE: 1, OASIS: 2 });

// Fractions: the five multipliers. A Fraction index is its position in FRACTIONS.
export const FRACTIONS = Object.freeze(['gas', 'naphtha', 'kerosene', 'diesel', 'bitumen']);
export const FRAC = Object.freeze({ GAS: 0, NAPHTHA: 1, KEROSENE: 2, DIESEL: 3, BITUMEN: 4 });
// The Fraction that powers each Field (tower, mine, oasis)
export const FIELD_FRAC = Object.freeze([FRAC.KEROSENE, FRAC.DIESEL, FRAC.BITUMEN]);

// Hit levels (docs/economy-v6-proposal.md §1.2): how big a moment is. The UI maps them to the
// game-feel tiers; the sim's cadence targets count them.
export const HIT = Object.freeze({ MINOR: 1, BIG: 2, NOVELTY: 3, MAJOR: 4 });

// Seeded RNG (mulberry32). The generator's state lives in `state.rng`, so a saved or cloned
// state replays the same rolls. Systems never call Math.random().
export function rand(state) {
  state.rng = (state.rng + 0x6D2B79F5) | 0;
  let a = state.rng;
  a = Math.imul(a ^ (a >>> 15), a | 1);
  a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}

// A Fraction's value: (1 + every additive source) x orderMult^Order level. Each source field is
// written by exactly one system (see README.md "Who writes what").
export function fracValue(state, i) {
  const f = state.refinery.frac[i];
  return (1 + f.bubble + f.vial + f.compound + f.seal) * Math.pow(P.orderMult, f.level);
}

// Events: systems report moments through ctx.emit(kind, level, data). The context a step gets:
//   ctx.emit(kind, level, data?)   optional; a no-op when the caller doesn't listen
// `makeContext` builds one that collects into an array (tests, the sim) or calls a listener (UI).
export function makeContext(onEvent) {
  const events = [];
  const emit = (kind, level, data) => {
    const e = { kind, level, ...(data || {}) };
    if (onEvent) onEvent(e); else events.push(e);
  };
  return { emit, events };
}
export const NO_CONTEXT = Object.freeze({ emit: () => {} });
