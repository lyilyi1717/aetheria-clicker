// Fast Forward: spend Chrono Sand to warp the simulation ahead by FF_WARP_SECONDS.
//
// Price: FF_BASE_COST x FF_COST_GROWTH^k sand, where k = uses since the last reset.
// k returns to 0 once FF_RESET_MINUTES pass with no use. With x3 steps the price runs
// 30 / 90 / 270 / 810 / 2,430 / 7,290 / 21,870. The bank cap is 1,440 s x (1 + 0.5 x Chrono
// Reservoir rank), so a base bank affords 4 uses per cycle (1,200 sand, 2 min of warp),
// rank 2+ unlocks the 5th, rank 9+ the 6th, and the 7th never fits (max bank 8,640).
//
// The warp is not run in one go: use() only books FF_WARP_SECONDS of pending sim time,
// and consume() pays it out from the game loop at FF_WARP_RATE sim-seconds per real second
// in steps of at most FF_SIM_STEP, so a warp takes ~0.3 s and never blocks a frame.
// A new warp cannot be bought while one is still pending.
//
// Escalation state lives in gameState.fastForward and is saved. Time is read from the wall
// clock through a high-water mark (clockMark): the cooldown only ever advances, so setting
// the clock back (or back and forth again) can't reset the price.

export const FF_WARP_SECONDS = 30;          // sim time per use
export const FF_BASE_COST = 30;             // sand for the first use of a cycle
export const FF_COST_GROWTH = 3;            // price multiplier per use within a cycle
export const FF_RESET_MINUTES = 30;         // idle time that resets the price
export const FF_RESET_MS = FF_RESET_MINUTES * 60 * 1000;
export const FF_SIM_STEP = 0.25;            // max sim step (combat timers stay accurate)
export const FF_WARP_RATE = 100;            // sim seconds per real second while warping
export const FF_MAX_USES = 20;              // sanity clamp for saves; far past anything affordable
// A clock mark this far ahead of the real clock is treated as a fixed wrong clock, not a
// rollback: the mark rebases to now and the cooldown restarts in full (never shortens).
export const FF_CLOCK_REBASE_MS = 7 * 24 * 3600 * 1000;

export function defaultFastForwardState() {
  return { uses: 0, lastUseAt: 0, clockMark: 0, pending: 0 };
}

export function getFastForwardCost(uses) {
  return FF_BASE_COST * Math.pow(FF_COST_GROWTH, Math.max(0, uses));
}

// Cleans a loaded (possibly old, edited or missing) save slice.
export function sanitizeFastForwardState(raw, savedAt) {
  const s = defaultFastForwardState();
  if (!raw || typeof raw !== 'object') return s;
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  s.uses = Math.max(0, Math.min(FF_MAX_USES, Math.floor(num(raw.uses))));
  s.lastUseAt = Math.max(0, num(raw.lastUseAt));
  s.clockMark = Math.max(0, num(raw.clockMark), s.lastUseAt, num(savedAt));
  s.pending = Math.max(0, Math.min(FF_WARP_SECONDS, num(raw.pending)));
  return s;
}

export class FastForwardSystem {
  constructor(gameState, now = () => Date.now()) {
    this.gameState = gameState;
    this.now = now;
  }

  get state() {
    if (!this.gameState.fastForward) this.gameState.fastForward = defaultFastForwardState();
    return this.gameState.fastForward;
  }

  // Advances the cooldown with the wall clock. Never moves backwards.
  syncClock() {
    const s = this.state;
    const now = this.now();
    if (now > s.clockMark) {
      s.clockMark = now;
    } else if (s.clockMark - now > FF_CLOCK_REBASE_MS) {
      // Clock was far in the future (wrong clock, since fixed): restart the full cooldown
      if (s.uses > 0) s.lastUseAt = now;
      s.clockMark = now;
    }
    if (s.lastUseAt > s.clockMark) s.lastUseAt = s.clockMark;
    if (s.uses > 0 && s.clockMark - s.lastUseAt >= FF_RESET_MS) s.uses = 0;
    return s;
  }

  getCost() {
    return getFastForwardCost(this.syncClock().uses);
  }

  getUses() {
    return this.syncClock().uses;
  }

  // Seconds until the price falls back to FF_BASE_COST (0 when it already is)
  getResetIn() {
    const s = this.syncClock();
    if (s.uses === 0) return 0;
    return Math.max(0, (s.lastUseAt + FF_RESET_MS - s.clockMark) / 1000);
  }

  isWarping() {
    return this.state.pending > 0;
  }

  canUse() {
    return !this.isWarping() && (this.gameState.chronoSand || 0) >= this.getCost();
  }

  // Books one warp. Returns false if it can't be afforded or a warp is still running.
  use() {
    if (!this.canUse()) return false;
    const s = this.state;
    this.gameState.chronoSand -= getFastForwardCost(s.uses);
    s.uses += 1;
    s.lastUseAt = s.clockMark;
    s.pending = FF_WARP_SECONDS;
    return true;
  }

  // Pays out pending warp time worth `realDt` real seconds through `simTick(step)`.
  // Returns the sim seconds simulated this call.
  consume(realDt, simTick) {
    const s = this.state;
    if (!(s.pending > 0)) return 0;
    let budget = Math.min(s.pending, Math.max(0, realDt) * FF_WARP_RATE);
    let done = 0;
    while (budget > 1e-9) {
      const step = Math.min(FF_SIM_STEP, budget);
      simTick(step);
      budget -= step;
      done += step;
    }
    s.pending = Math.max(0, s.pending - done);
    if (s.pending < 1e-9) s.pending = 0;
    return done;
  }
}
