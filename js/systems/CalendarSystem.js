// Daily and weekly structure (R15, docs/redesign-proposal.md §4.1, §8; roadmap §5.4).
// Daily Dallah, Weekly Ledger, Souq Rotation and the Seals of Transcendence. Nothing here ever
// takes progress away: a missed day banks (up to 3), a missed week just rotates, lit Seals never
// go dark, and there is no streak counter.

const DAY_MS = 86400000;

// Local calendar day number (days since 1970-01-01 in the player's own time zone)
export function dayIndexOf(ms) {
  const d = new Date(ms);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}

// Weeks run Monday to Sunday. Day 4 (1970-01-05) was a Monday, so weeks tick over when
// (day + 3) is a multiple of 7.
export function weekIndexOfDay(day) {
  return Math.floor((day + 3) / 7);
}

export function weekIndexOf(ms) {
  return weekIndexOfDay(dayIndexOf(ms));
}

// Local-time ms of the next Monday 00:00 after `ms`
export function nextMondayMs(ms) {
  const d = new Date(ms);
  const day = dayIndexOf(ms);
  const toMonday = ((8 - ((day + 4) % 7 || 7)) % 7) || 7; // days until Monday (1..7)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + toMonday).getTime();
}
