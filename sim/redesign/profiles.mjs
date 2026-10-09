// Player profiles for the redesign sim: a daily presence schedule (Hands-on / Watching / Away),
// the Charter they pick and how often they catch a Gusher while Watching. Asleep 00:00-08:00.
const H = 3600, M = 60;

const hourly = (from, to, step, len) => {
  const out = [];
  for (let h = from; h < to; h += step) out.push([h * H, h * H + len, 'hands']);
  return out;
};

export const PROFILES = {
  // Two real sessions a day plus an afternoon with the game open
  active: {
    charter: 'wildcatter', gusherCatch: 0.3,
    day: [[9 * H, 9 * H + 45 * M, 'hands'], [13 * H, 17 * H, 'watch'], [20 * H, 20 * H + 45 * M, 'hands']]
  },
  // Ten minutes at the start of every waking hour
  casual: { charter: 'baron', gusherCatch: 0.3, day: hourly(8, 24, 1, 10 * M) },
  // Two minutes every two waking hours (collect, fill Orders, brew)
  idle: { charter: 'baron', gusherCatch: 0.3, day: hourly(8, 24, 2, 2 * M) },
  // Game left open all day on a second screen, two short hands-on visits
  open: {
    charter: 'operator', gusherCatch: 0.5,
    day: [[10 * H, 10 * H + 5 * M, 'hands'], [10 * H + 5 * M, 21 * H, 'watch'],
      [21 * H, 21 * H + 5 * M, 'hands'], [21 * H + 5 * M, 22 * H, 'watch']]
  }
};

// Presence at time t and the time it next changes
export function presenceAt(profile, t) {
  const day = Math.floor(t / 86400), s = t - day * 86400;
  for (const [a, b, st] of profile.day) {
    if (s >= a && s < b) return { state: st, until: day * 86400 + b };
  }
  // Away until the next interval starts (today or tomorrow)
  let next = Infinity;
  for (const [a] of profile.day) if (a > s) next = Math.min(next, a);
  const until = next === Infinity ? (day + 1) * 86400 + profile.day[0][0] : day * 86400 + next;
  return { state: 'away', until };
}
