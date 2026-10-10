// Seals and Crew (docs/core-loop-reference.md 3.5, core-loop-redesign.md 6.1). Pure functions over the
// core-loop state. Writes only state.seals.* and refinery.frac[i].seal; reads prestige.crew
// (Prestige.js hires Crew). Port of sealsStep in sim/redesign/model.mjs.
//
// Seal i opens on day i x P.sealEveryDays. With any Crew every open Seal gains
// (1 + P.sealCrewBonus x Crew) Seal-hours per hour, in every presence state. Reaching tier T adds
// P.sealBonusPerTier x T to Fraction (i % 5). With Crew 0 nothing advances.
import { P } from './params.js';
import { FRACTIONS, HIT, NO_CONTEXT } from './shared.js';

export const SEAL_TIERS = Object.freeze(['unlocked', 'gilded', 'blessed', 'radiant', 'eternal']);
const MAX_TIER = P.sealHours.length;
const DAY = 86400;

export const sealFraction = (i) => i % FRACTIONS.length;
export const sealOpensAt = (i) => i * P.sealEveryDays * DAY;
export const isSealOpen = (state, i) => state.t >= sealOpensAt(i);
export const openSeals = (state) => Array.from({ length: P.seals }, (_, i) => i).filter(i => isSealOpen(state, i));

// Seal-hours gained per hour of time for this much Crew (0 with no Crew)
export const sealHoursPerHour = (crew) => (crew > 0 ? 1 + P.sealCrewBonus * crew : 0);
export const crewRate = (state) => sealHoursPerHour(state.prestige.crew);

// Seconds until Seal i opens (0 when open)
export const secondsToOpen = (state, i) => Math.max(0, sealOpensAt(i) - state.t);
// Seconds until the next closed Seal opens, or null when all are open
export function nextSealOpensIn(state) {
  for (let i = 0; i < P.seals; i++) if (!isSealOpen(state, i)) return secondsToOpen(state, i);
  return null;
}

// Tier id of Seal i (0..MAX_TIER); SEAL_TIERS[tier - 1] names it, tier 0 = not yet reached ('locked')
export const sealTier = (state, i) => state.seals.tier[i];
export const sealTierId = (state, i) => (state.seals.tier[i] > 0 ? SEAL_TIERS[state.seals.tier[i] - 1] : 'locked');
export const sealMaxed = (state, i) => state.seals.tier[i] >= MAX_TIER;

// Seal-hours still needed for Seal i's next tier (null at the top)
export const sealHoursToNext = (state, i) => (sealMaxed(state, i) ? null : Math.max(0, P.sealHours[state.seals.tier[i]] - state.seals.hours[i]));
// Real hours until Seal i's next tier at the current Crew, counting from when it opens; null when
// maxed or Crew is 0
export function hoursToNextTier(state, i) {
  const rate = crewRate(state);
  const need = sealHoursToNext(state, i);
  if (need === null || rate <= 0) return null;
  return secondsToOpen(state, i) / 3600 + need / rate;
}

// Fraction bonus a Seal gives at a tier: P.sealBonusPerTier x (1 + 2 + ... + tier)
export const sealBonusAt = (tier) => (P.sealBonusPerTier * tier * (tier + 1)) / 2;

// Rebuilds refinery.frac[i].seal from seals.tier (to check or repair a loaded save)
export function recompute(state) {
  const sum = FRACTIONS.map(() => 0);
  state.seals.tier.forEach((t, i) => { sum[sealFraction(i)] += sealBonusAt(t); });
  state.refinery.frac.forEach((f, i) => { f.seal = sum[i]; });
}

// Advances every open Seal by dt seconds. Presence does not matter (Seals run Away and offline too).
// A Seal that opens inside the step is credited only for the part of dt after it opened; for steps
// that start on or after the opening time (the sim's) this is the whole of dt, as in the sim.
// One step may cross several tiers; each emits its own `seal` event.
export function step(state, dt, presence, ctx = NO_CONTEXT) {
  const crew = state.prestige.crew;
  if (crew <= 0 || !(dt > 0)) return;
  const { hours, tier } = state.seals;
  const rate = sealHoursPerHour(crew);
  for (let i = 0; i < P.seals; i++) {
    if (tier[i] >= MAX_TIER) continue;
    const live = Math.min(dt, state.t + dt - sealOpensAt(i));
    if (live <= 0) continue;
    hours[i] += (rate * live) / 3600;
    while (tier[i] < MAX_TIER && hours[i] >= P.sealHours[tier[i]]) {
      tier[i]++;
      state.refinery.frac[sealFraction(i)].seal += P.sealBonusPerTier * tier[i];
      ctx.emit('seal', tier[i] >= P.sealBigTier ? HIT.MAJOR : HIT.NOVELTY, { seal: i, tier: tier[i] });
    }
  }
}
