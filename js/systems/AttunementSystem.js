// Ascension attunements (R55, docs/redesign-proposal.md §6.1 R55 block). After the first New Well
// the player picks 1 of 3 attunements for each run. The pick can be changed until the first
// generator is bought in a run; it carries over to the next run (Auto-Ascend keeps it). After the
// first purchase a new pick waits for the next run (`next`), so Auto-Buy, which buys within seconds
// of a New Well, never takes the choice away. All three
// are one additive production bonus each and modest: the best is at most +40%, so it stays a
// choice rather than a must.
//   idle   : +30% production while the player hasn't tapped for 60 s. Auto-tap is not a tap: it
//            only runs while the player isn't tapping, so it never breaks the bonus.
//   steady : tier upgrades +30% stronger (each x1.26 instead of x1.2; a tier with all 6 bought
//            is +34%, about +22% for a typical run's 4 a tier).
//   focus  : +15% production per subgame milestone hit this run (Excavation blocks, Tower bosses,
//            Garden harvests; two each), at most +40%.
// State: gameState.attunement = { id, next, locked, runStart: { blocks, bosses, harvests } }.
// Pure functions of gameState (no imports from other systems), so GameState, UpgradeSystem, the
// sim and the tests read them without any system linked.

export const ATTUNEMENT_IDS = ['idle', 'steady', 'focus'];
export const DEFAULT_ATTUNEMENT = 'idle';

export const IDLE_BONUS = 0.3;            // +30% production ...
export const IDLE_AFTER_SECONDS = 60;     // ... once the last tap is this old
export const STEADY_UPGRADE_BOOST = 0.3;  // tier upgrades' +20% each becomes +26%
export const FOCUS_PER_MILESTONE = 0.15;  // +15% per milestone this run ...
export const FOCUS_CAP = 0.4;             // ... at most +40%

// Subgame milestones for Focus, counted from the run's start: [stat, thresholds]
export const FOCUS_MILESTONES = [
  { id: 'blocks', stat: 'totalBlocksMined', steps: [25, 100] },
  { id: 'bosses', stat: 'totalBossesSlain', steps: [1, 5] },
  { id: 'harvests', stat: 'totalPlantsHarvested', steps: [3, 10] }
];

const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);

function statSnapshot(gs) {
  const s = gs?.stats || {};
  const out = {};
  for (const m of FOCUS_MILESTONES) out[m.id] = num(s[m.stat]);
  return out;
}

export function defaultAttunementState(gs) {
  return { id: DEFAULT_ATTUNEMENT, next: null, locked: false, runStart: statSnapshot(gs) };
}

// Saves from before R55 (or with a junk value) get Idle, unlocked, with milestones counted from now
export function sanitizeAttunementState(data, gs) {
  const fresh = defaultAttunementState(gs);
  if (!data || typeof data !== 'object') return fresh;
  const id = ATTUNEMENT_IDS.includes(data.id) ? data.id : DEFAULT_ATTUNEMENT;
  const runStart = { ...fresh.runStart };
  if (data.runStart && typeof data.runStart === 'object') {
    for (const m of FOCUS_MILESTONES) {
      const v = Number(data.runStart[m.id]);
      // never above the current stat, so a bad value can't hide milestones for the whole run
      if (data.runStart[m.id] != null && Number.isFinite(v)) runStart[m.id] = Math.min(Math.max(0, v), runStart[m.id]);
    }
  }
  const next = ATTUNEMENT_IDS.includes(data.next) && data.next !== id ? data.next : null;
  return { id, next, locked: data.locked === true, runStart };
}

function state(gs) {
  if (!gs.attunement || typeof gs.attunement !== 'object') gs.attunement = defaultAttunementState(gs);
  return gs.attunement;
}

// Attunements open with the first New Well
export function isAttunementOpen(gs) {
  return (gs?.ascensionCount || 0) >= 1;
}

// The attunement in effect this run (null before the first New Well)
export function getAttunement(gs) {
  if (!isAttunementOpen(gs)) return null;
  const id = gs.attunement?.id;
  return ATTUNEMENT_IDS.includes(id) ? id : DEFAULT_ATTUNEMENT;
}

// The pick can change until the first generator is bought this run
export function canChangeAttunement(gs) {
  return isAttunementOpen(gs) && !state(gs).locked;
}

// Picks an attunement: for this run while it is still open, else for the next run.
// Returns 'now', 'next' or false.
export function setAttunement(gs, id) {
  if (!ATTUNEMENT_IDS.includes(id) || !isAttunementOpen(gs)) return false;
  const s = state(gs);
  if (!s.locked) {
    s.id = id;
    s.next = null;
    return 'now';
  }
  s.next = id === s.id ? null : id;
  return 'next';
}

// The attunement the next run starts with
export function getNextAttunement(gs) {
  const s = state(gs);
  return ATTUNEMENT_IDS.includes(s.next) ? s.next : (ATTUNEMENT_IDS.includes(s.id) ? s.id : DEFAULT_ATTUNEMENT);
}

// Called when a generator is bought (BuildingSystem.buyBuilding)
export function lockAttunement(gs) {
  if (isAttunementOpen(gs)) state(gs).locked = true;
}

// Called on every Ascension (PrestigeSystem.ascend): the pick (or the one waiting for this run)
// carries over, unlocked again, and Focus counts milestones from here
export function startAttunementRun(gs) {
  const s = state(gs);
  s.id = getNextAttunement(gs);
  s.next = null;
  s.locked = false;
  s.runStart = statSnapshot(gs);
}

// Focus: milestones hit this run, as [{ id, done, next }] and the total
export function getFocusMilestones(gs) {
  const s = state(gs);
  let total = 0;
  const list = FOCUS_MILESTONES.map(m => {
    const since = Math.max(0, num(gs.stats?.[m.stat]) - num(s.runStart?.[m.id]));
    const done = m.steps.filter(x => since >= x).length;
    total += done;
    return { id: m.id, since, done, next: m.steps[done] ?? null };
  });
  return { list, total };
}

// Idle is on when the last manual tap is at least IDLE_AFTER_SECONDS old. gs.secondsSinceTap is
// runtime only (ClickerSystem): a fresh page load starts at Infinity, i.e. idle.
export function isIdleBonusOn(gs) {
  const s = gs.secondsSinceTap;
  return !(Number.isFinite(s) && s < IDLE_AFTER_SECONDS);
}

// The production bonus (0.3 = +30%) the attunement adds right now. Steady works through the tier
// upgrades instead (getSteadyUpgradeMult), so it is 0 here.
export function getAttunementBonus(gs) {
  const id = getAttunement(gs);
  if (id === 'idle') return isIdleBonusOn(gs) ? IDLE_BONUS : 0;
  if (id === 'focus') return Math.min(FOCUS_CAP, FOCUS_PER_MILESTONE * getFocusMilestones(gs).total);
  return 0;
}

export function getAttunementMult(gs) {
  return 1 + getAttunementBonus(gs);
}

// One tier upgrade's multiplier: x1.2, or x1.26 under Steady
export function getTierUpgradeStep(gs, base) {
  return getAttunement(gs) === 'steady' ? 1 + (base - 1) * (1 + STEADY_UPGRADE_BOOST) : base;
}
