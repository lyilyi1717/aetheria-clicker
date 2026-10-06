// Click combo and Frenzy (R28, docs/redesign-proposal.md §5.2).
// The combo multiplier is full (x5) at 20 clicks. Every 20th click of an unbroken combo
// (20, 40, 60, ...) starts Frenzy, or adds to a running one up to FRENZY_MAX_TIMER. Frenzy
// ending no longer resets the combo; only a pause in clicking drains it.
export const COMBO_FULL = 20;         // clicks to reach the full combo multiplier
export const COMBO_MAX_MULT = 5;
export const FRENZY_EVERY = 20;       // a Frenzy every this many combo clicks
export const FRENZY_DURATION = 4;     // seconds per milestone (was 15 s every 100 clicks)
export const FRENZY_MULT = 3;         // was x5
export const FRENZY_AUTO_CLICKS = 0;   // auto-clicks per second during Frenzy (was 6)
export const FRENZY_MAX_TIMER = 30;   // a milestone during Frenzy adds time up to this

// x1 at 0 clicks, x5 at 20
export function comboMultiplier(count) {
  return 1 + Math.min(COMBO_FULL, Math.max(0, count)) / COMBO_FULL * (COMBO_MAX_MULT - 1);
}

// Clicks left until the next Frenzy milestone, given the last milestone that fired
export function clicksToNextFrenzy(count, lastFrenzyAt = 0) {
  const next = (Math.floor(Math.max(count, lastFrenzyAt) / FRENZY_EVERY) + 1) * FRENZY_EVERY;
  return next - count;
}
