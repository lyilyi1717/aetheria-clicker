// The Rock bar's unit: a swing of yours. Pure functions, no state, no DOM.
// "N swings left" = the Rock's hp left / the damage your whole team does per swing of yours
// (pick, Rafeeqs, Forge, TNT, effects), measured on this fight; an estimate until enough swings were seen.

export const SWING = {
  keep: 12,        // the rolling window: this many of your latest swings
  need: 5,         // measured only once the window holds this many swings
  stale: 4,        // seconds without a swing and the window is dropped (you stopped; the team alone is not a swing rate)
  guessRate: 3,    // swings a second, until measured
};

// Before enough swings were seen: your hit, plus each Rafeeq that hits (not sieves) for a share of it.
export const swingEstimate = (pick, share, working) => Math.max(1e-9, pick * (1 + share * Math.max(0, working)));

// Rafeeqs that hit the Rock: every `sieveEvery`th one sieves instead.
export const crewWorking = (n, sieveEvery) => Math.max(0, n - (sieveEvery > 0 ? Math.floor(n / sieveEvery) : 0));

// The window is a list of { t: seconds on the fight's clock, d: total damage dealt by then }, one per swing of yours.
// Returns { dmg: damage per swing, rate: swings a second } or null while there are too few.
export function swingMeasure(log, need = SWING.need) {
  if (!log || log.length < need) return null;
  const a = log[0], z = log[log.length - 1], n = log.length - 1, dt = z.t - a.t;
  const dmg = (z.d - a.d) / n;
  if (!(dmg > 0) || !(dt > 0)) return null;
  return { dmg, rate: n / dt };
}

// Round to a number a person can hold: exact under 20, steps of 5 to 100, two figures after that.
export function friendly(n) {
  if (!(n > 0)) return 0;
  if (n < 20) return Math.max(1, Math.round(n));
  if (n < 100) return Math.round(n / 5) * 5;
  const step = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / step) * step;
}
// Seconds: { n, unit: 's' | 'min' | 'h' }, whole friendly numbers
export function friendlyTime(sec) {
  if (!(sec > 0)) return { n: 1, unit: 's' };
  if (sec < 10) return { n: Math.max(1, Math.round(sec)), unit: 's' };
  if (sec < 90) return { n: Math.round(sec / 5) * 5, unit: 's' };
  const m = sec / 60;
  if (m < 90) return { n: m < 10 ? Math.round(m) : Math.round(m / 5) * 5, unit: 'min' };
  return { n: Math.round(m / 60), unit: 'h' };
}

// hpLeft; log: the window; est: the estimated damage per swing. -> { raw, n, time, measured }
export function swingsLeft(hpLeft, log, est, guessRate = SWING.guessRate) {
  const m = swingMeasure(log);
  const per = m ? m.dmg : est, rate = m ? m.rate : guessRate;
  const raw = Math.max(1, hpLeft / per);
  return { raw, n: friendly(raw), time: friendlyTime(raw / rate), measured: !!m };
}
