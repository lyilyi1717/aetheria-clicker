// Feedback budgets (R41, docs/game-feel-opportunities.md §4, game-feel guide §4 P2 and §5).
// Pure: no DOM, no audio. js/ui/feedback.js asks these how loud a moment may be; the particle
// engine reads the caps and the "+n" merge rule. Tested by test_feedback.js.

// T0 tap, T1 good, T2 great, T3 peak (game-feel guide §4 P2)
export const TIERS = [0, 1, 2, 3];

// Global caps (opportunities §4): over the cap the oldest fade faster, the newest still answer
export const MAX_PARTICLES = 250;
export const MAX_PARTICLES_PHONE = 150;
export const MAX_TEXTS = 40;
export const MAX_ORB_TEXTS = 12;   // live "+n" texts near the orb (R44)
export const PHONE_MAX_WIDTH = 480;
export const PHONE_SPARK_SCALE = 0.6;
// Hard ceiling: past this many live items the oldest are dropped outright (a burst of spawns
// faster than the fast fade can clear them)
export const HARD_CAP_FACTOR = 2;
// Per-frame alpha decay given to items over the cap (~12 frames to gone)
export const FAST_DECAY = 0.08;

// "+n" texts merge into the last one within this time and distance (opportunities §3 item 4)
export const MERGE_MS = 150;
export const MERGE_PX = 40;
export const MERGE_SIZE_STEP = 1;
export const MERGE_SIZE_MAX = 22;
// A merged text stops taking more after this long, so a steady tap stream still floats away
export const MERGE_MAX_AGE_MS = 600;

// Sound cooldown per kind, by tier (T0: none, the click itself must always answer)
export const SOUND_COOLDOWN_MS = [0, 250, 1000, 0];

// Chains (P5): +1 per event inside the window, -1 per window of silence, capped
export const CHAIN_WINDOW_MS = 600;
export const CHAIN_CAP = 5;

const BUDGETS = [
  { sparks: 8,  textSize: 16, motionMs: 120 },   // T0: squash, "+n" that merges
  { sparks: 20, textSize: 20, motionMs: 160 },   // T1: own sound, label + n
  { sparks: 35, textSize: 28, motionMs: 240 },   // T2: hit-stop, shake, callout
  { sparks: 60, textSize: 28, motionMs: 4000 }   // T3: ceremony (rewards.ceremony)
];

export function clampTier(tier) {
  const n = Math.round(Number(tier));
  return Number.isFinite(n) ? Math.max(0, Math.min(3, n)) : 0;
}

export function isPhoneWidth(width) {
  return Number.isFinite(width) && width > 0 && width <= PHONE_MAX_WIDTH;
}

export function particleCap(phone) {
  return phone ? MAX_PARTICLES_PHONE : MAX_PARTICLES;
}

/**
 * What a tier may spend: { tier, sparks, textSize, motionMs, shake, hitStop, cooldownMs }.
 * `sparks` overrides the tier default (existing call sites keep their counts); phone width
 * scales it by 0.6 and reduced motion zeroes it, as does shake and hit-stop.
 */
export function budgetFor(tier, { reduced = false, phone = false, sparks } = {}) {
  const t = clampTier(tier);
  const base = BUDGETS[t];
  let n = Number.isFinite(sparks) ? Math.max(0, sparks) : base.sparks;
  if (phone) n = Math.max(n > 0 ? 1 : 0, Math.round(n * PHONE_SPARK_SCALE));
  if (reduced) n = 0;
  return {
    tier: t,
    sparks: n,
    textSize: base.textSize,
    motionMs: reduced ? 0 : base.motionMs,
    shake: !reduced && t >= 2,
    hitStop: !reduced && t >= 2,
    cooldownMs: SOUND_COOLDOWN_MS[t]
  };
}

/** Per-kind bookkeeping for chains and sound cooldowns (one per feedback instance). */
export function createFeedbackState() {
  return { chains: new Map(), sounds: new Map() };
}

/**
 * Chain step for `kind` at `now` (ms): rises one per event within CHAIN_WINDOW_MS of the last,
 * falls one per full window of silence (a gentle reset), and is capped at `cap`.
 */
export function chainStep(state, kind, now, cap = CHAIN_CAP) {
  const prev = state.chains.get(kind);
  let step = 0;
  if (prev) {
    const gap = now - prev.at;
    if (gap <= CHAIN_WINDOW_MS) step = prev.step + 1;
    else step = prev.step - Math.floor(gap / CHAIN_WINDOW_MS) + 1;
  }
  step = Math.max(0, Math.min(cap, step));
  state.chains.set(kind, { step, at: now });
  return step;
}

/** True (and records the play) when `kind`'s sound may play now under `tier`'s cooldown. */
export function soundReady(state, kind, tier, now) {
  const cd = SOUND_COOLDOWN_MS[clampTier(tier)];
  const last = state.sounds.get(kind);
  if (cd > 0 && last !== undefined && now - last < cd) return false;
  state.sounds.set(kind, now);
  return true;
}

/**
 * True when a new "+n" text at (x, y, now) should merge into `prev`: same key, within MERGE_PX
 * of where it was spawned, within MERGE_MS of its last update and younger than MERGE_MAX_AGE_MS.
 */
export function shouldMerge(prev, key, x, y, now) {
  if (!prev || !key || prev.mergeKey !== key || prev.alpha <= 0) return false;
  if (now - prev.updatedAt > MERGE_MS || now - prev.bornAt > MERGE_MAX_AGE_MS) return false;
  return Math.hypot(x - prev.originX, y - prev.originY) <= MERGE_PX;
}

/** Sum two "+n" amounts: BigNum (has .add) or plain numbers. */
export function addAmounts(a, b) {
  if (a && typeof a.add === 'function') return a.add(b);
  return Number(a) + Number(b);
}

/**
 * How many of the oldest items to speed up (`fade`) or drop (`drop`) so `count` live items fit
 * `cap`. Dropping only happens past HARD_CAP_FACTOR x cap.
 */
export function overCap(count, cap) {
  const fade = Math.max(0, count - cap);
  const drop = Math.max(0, count - cap * HARD_CAP_FACTOR);
  return { fade, drop };
}
