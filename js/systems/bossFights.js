// Boss fights (R65, docs/gear-and-boss-design.md §5): the tiers (boss, Sheikh, Zone Guardian,
// Warden), the telegraphed attacks and their numbers. Pure data and functions, no imports from
// other systems, so CombatSystem, the UI, the sim and the tests can all read them.
//
// Tiers by floor (a boss is every 10th floor):
//   boss      x400 HP (BOSS_HP_MULT), 45 s, one telegraph type, phase 2 at 50% HP
//   sheikh    every 50th that is not a Guardian or Warden: x1.5 HP, 60 s, two types, phase 2
//   guardian  zone ends (50 / 150 / 300 / 500 / 750 / 1000): x3 HP, 60 s, three phases
//   warden    the R18 Warden (every 250th once unlocked): x3 HP, 60 s, three phases. Where a
//             Guardian floor is also a Warden floor it is ONE fight (x3 once, both reward sets).

export const TELE_TYPES = ['smash', 'feast', 'ward'];
export const TELE_INTERVAL = 8;        // seconds between telegraphs
export const TELE_INTERVAL_P2 = 6;     // ... in phase 2 and later
export const TELE_FIRST = 5;           // first telegraph of a fight
export const TELE_WINDUP = 1.5;        // seconds the player has to answer
export const WARD_TAPS = 5;            // taps on the weak point that break a WARD
export const PRACTICE_MAX_FLOOR = 150; // up to here a miss costs nothing (it teaches the counters)

// What an answered telegraph and a missed one do. Success: the boss is Exposed. Miss: SMASH hits
// the hero for a share of his max HP (Shield absorbs it), FEAST heals the boss, WARD cuts the
// damage the boss takes for a few seconds. Tuned so an open, untouched tab keeps its pace.
export const TELE_FX = {
  exposedBonus: 0.5, exposedSeconds: 3,
  smashHp: 0.25, feastHeal: 0.08, wardCut: 0.75, wardSeconds: 4
};
export const PHASE_ATTACK_MULT = 1.5;   // the boss hits harder from phase 2

export const SHEIKH_INTERVAL = 50;
export const SHEIKH_HP_MULT = 1.5;
export const SHEIKH_TIMER_SECONDS = 60;
export const GUARDIAN_HP_MULT = 3;
export const GUARDIAN_TIMER_SECONDS = 60;
export const GUARDIAN_FLOORS = [50, 150, 300, 500, 750, 1000];
export const GUARDIAN_NAMES = [
  'The Great Dhabb of Thumama', 'Hilux Prime, Lord of the Drift', 'The Haggler Supreme',
  'The Rub\' al Khali Sandstorm', 'Al-Modir Al-Aam, the General Manager', 'The Boulevard Showrunner'
];

export const isGuardianFloor = (floor) => GUARDIAN_FLOORS.includes(floor);
export const isSheikhFloor = (floor) => Number.isInteger(floor) && floor >= SHEIKH_INTERVAL && floor % SHEIKH_INTERVAL === 0;

// 'mob' | 'boss' | 'sheikh' | 'guardian' | 'warden'. `wardenFloor`: R18 Warden on this floor.
export function bossTier(floor, wardenFloor = false) {
  if (!Number.isInteger(floor) || floor < 1 || floor % 10 !== 0) return 'mob';
  if (wardenFloor) return 'warden';
  if (isGuardianFloor(floor)) return 'guardian';
  if (isSheikhFloor(floor)) return 'sheikh';
  return 'boss';
}

export const isBigTier = (tier) => tier === 'guardian' || tier === 'warden';

// HP multiplier on top of the boss's, and the timer, by tier. `base` = the plain boss values.
export function tierHpMult(tier) {
  return tier === 'sheikh' ? SHEIKH_HP_MULT : isBigTier(tier) ? GUARDIAN_HP_MULT : 1;
}
export function tierTimer(tier, base) {
  return tier === 'boss' ? base : Math.max(base, tier === 'sheikh' ? SHEIKH_TIMER_SECONDS : GUARDIAN_TIMER_SECONDS);
}

// The telegraph types a boss uses by tier. `nameIdx` = index of the boss's name (a stable seed).
export function teleMech(tier, nameIdx) {
  const a = TELE_TYPES[((nameIdx % 3) + 3) % 3];
  const b = TELE_TYPES[(((nameIdx + 1) % 3) + 3) % 3];
  if (tier === 'boss') return [a];
  if (tier === 'sheikh') return [a, b];
  return [a, b, TELE_TYPES[(((nameIdx + 2) % 3) + 3) % 3]];
}

// Phase from the HP share. Bosses and Sheikhs: phase 2 at 50%. Guardians and Wardens: 2 at 66%, 3 at 33%.
export function phaseFor(tier, hpShare) {
  if (isBigTier(tier)) return hpShare <= 1 / 3 ? 3 : hpShare <= 2 / 3 ? 2 : 1;
  return hpShare <= 0.5 ? 2 : 1;
}

// The types in play in a phase. Big fights: first type, then the second, then all three.
export function phaseTypes(tier, mech, phase) {
  if (!isBigTier(tier)) return mech;
  return phase === 1 ? [mech[0]] : phase === 2 ? [mech[1]] : mech;
}

export const teleInterval = (phase) => (phase >= 2 ? TELE_INTERVAL_P2 : TELE_INTERVAL);

// Which telegraph a hero skill answers (Iron Wall: SMASH; Heavy Strike / Supernova: FEAST)
export const SKILL_COUNTERS = { shield: 'smash', strike: 'feast', supernova: 'feast' };
