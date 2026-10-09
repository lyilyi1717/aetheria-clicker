// Click yield, combo and Frenzy (R28, R52; docs/redesign-proposal.md §5.2, §6.1).
// R52 (passive first): a click is CLICK_CPS_SECONDS of current production (at least 1 Oil), and
// at most CLICK_MAX_PER_SEC clicks a second count toward yield (faster taps still animate). The
// combo and Frenzy stay as feel with small multipliers, so attentive play earns about x2 idle
// (sim/active-income.mjs, test_active_income.js).
// The combo multiplier is full at 20 clicks. Every 20th click of an unbroken combo
// (20, 40, 60, ...) starts Frenzy, or adds to a running one up to FRENZY_MAX_TIMER. Frenzy
// ending no longer resets the combo; only a pause in clicking drains it.
export const COMBO_FULL = 20;         // clicks to reach the full combo multiplier
export const COMBO_MAX_MULT = 1;    // was x5 (R52)
export const FRENZY_EVERY = 20;       // a Frenzy every this many combo clicks
export const FRENZY_DURATION = 4;     // seconds per milestone (was 15 s every 100 clicks)
export const FRENZY_MULT = 1.25;       // was x3 (R52), x5 before R28
export const FRENZY_AUTO_CLICKS = 0;   // auto-clicks per second during Frenzy (was 6)
export const FRENZY_MAX_TIMER = 30;   // a milestone during Frenzy adds time up to this

export const CLICK_CPS_SECONDS = 0.5;  // a click yields this many seconds of production
export const CLICK_MAX_PER_SEC = 5;     // clicks per second that count toward yield
export const AUTO_TAP_PER_SEC = 1;      // Auto-tap (dust shop): plain clicks per second while idle
export const AUTO_TAP_IDLE_AFTER = 2;   // seconds without a tap before Auto-tap takes over

// x1 at 0 clicks, x COMBO_MAX_MULT at COMBO_FULL
export function comboMultiplier(count) {
  return 1 + Math.min(COMBO_FULL, Math.max(0, count)) / COMBO_FULL * (COMBO_MAX_MULT - 1);
}

// Clicks left until the next Frenzy milestone, given the last milestone that fired
export function clicksToNextFrenzy(count, lastFrenzyAt = 0) {
  const next = (Math.floor(Math.max(count, lastFrenzyAt) / FRENZY_EVERY) + 1) * FRENZY_EVERY;
  return next - count;
}

// --- R44: the climb toward Frenzy (docs/game-feel-opportunities.md §3 item 4) ---
export const COMBO_STEP_AT = [5, 10, 15, 20];   // a ring pulses and the orb glow steps up at each
export const WINDUP_FROM = 18;                  // clicks 18-19 of every 20 wind up the Frenzy
export const FRENZY_HOLD_SECONDS = 0.4;         // the bar holds full this long when Frenzy starts
export const PITCH_STEP_CLICKS = 4;             // the click pitch rises one scale step per 4 clicks
export const PITCH_STEP_MAX = 5;
// Frequency ratios of the climb: a major-pentatonic run up one octave
export const PITCH_RATIOS = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2];

// Orb glow step (0..4) for a combo count: how many of COMBO_STEP_AT it has reached (capped)
export function comboStep(count) {
  let step = 0;
  for (const at of COMBO_STEP_AT) if (count >= at) step++;
  return step;
}

// Pitch step (0..PITCH_STEP_MAX): one per 4 combo clicks, capped. It falls as the combo drains.
export function pitchStep(count) {
  return Math.min(PITCH_STEP_MAX, Math.floor(Math.max(0, count) / PITCH_STEP_CLICKS));
}

export function comboPitch(count) {
  return PITCH_RATIOS[pitchStep(count)];
}

// True on clicks 18 and 19 of each 20 (the next tap or two starts Frenzy)
export function isWindup(count) {
  return count > 0 && count % FRENZY_EVERY >= WINDUP_FROM;
}
