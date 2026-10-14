// Dig feature: the Settings menu and Zeigarnik Anchor Hook (ARGON-14).
// Calculates and formats achievable goals when terminating a play session:
//   "Almost there: X bones to complete [set] • Y Stars to [Pick/Upgrade] • Level Z Gate waiting."
import { use } from '../../core/registry.js';
import { wingKeys, wingDone, wingMissing, WING } from '../wing2/rules.js';
import { STARSHOP_TRACKS, starshopSteps, starStepCost, starshopPickAt } from '../starshop/rules.js';
import { roadLevel, gateRow } from '../sites/rules.js';
import { t } from '../../core/strings.js';
import strings from './strings.js';

export function getZeigarnikAnchor(s) {
  // 1. Closest Museum Set
  let closestSet = null;
  let minMissing = 1e9;
  for (const set of wingKeys()) {
    if (wingDone(s, set)) continue;
    const missing = wingMissing(s, set).length;
    if (missing > 0 && missing < minMissing) {
      minMissing = missing;
      closestSet = set;
    }
  }
  const rawName = closestSet && WING[closestSet] ? (WING[closestSet].name || closestSet) : null;
  const setName = rawName ? (rawName.charAt(0).toUpperCase() + rawName.slice(1)) : null;

  // 2. Nearest / Cheapest Affordable Star Step
  let bestTrack = 'pick';
  let minCost = 1e9;
  let minNeeded = 1e9;
  let targetName = 'Pick';
  for (const track of STARSHOP_TRACKS) {
    const steps = starshopSteps(s, track);
    const cost = starStepCost(steps);
    const needed = Math.max(0, cost - (s.stars || 0));
    if (needed < minNeeded || (needed === minNeeded && cost < minCost)) {
      minNeeded = needed;
      minCost = cost;
      bestTrack = track;
      if (track === 'pick') {
        const nextPick = starshopPickAt(steps + 1);
        targetName = nextPick.mat ? (nextPick.mat.charAt(0).toUpperCase() + nextPick.mat.slice(1) + ' Pick') : 'Pick';
      } else if (track === 'camp') {
        targetName = 'Camp';
      } else {
        targetName = 'Bag';
      }
    }
  }

  // 3. Depth remaining to current site Gate
  const rLevel = roadLevel(s);
  const lvl = (s.run && s.run.level !== undefined) ? s.run.level : (rLevel ? rLevel.level : 1);
  const gRow = gateRow(s);
  const currentDepth = Math.max(s.best || 0, s.top || 0);
  const depthRemaining = Math.max(0, gRow - currentDepth);

  return {
    museum: closestSet ? {
      set: closestSet,
      name: setName,
      missing: minMissing,
    } : null,
    star: {
      track: bestTrack,
      target: targetName,
      cost: minCost,
      needed: minNeeded,
    },
    gate: {
      level: lvl,
      depthRemaining,
      gateRow: gRow,
    },
  };
}

export function formatZeigarnikAnchor(s) {
  const data = getZeigarnikAnchor(s);
  const parts = [];

  // Museum part
  if (data.museum) {
    const key = data.museum.missing === 1 ? 'zg_bone_1' : 'zg_bone_n';
    parts.push(t(key, { n: data.museum.missing, set: data.museum.name || data.museum.set }));
  } else {
    parts.push(t('zg_museum_done'));
  }

  // Star part
  parts.push(t('zg_stars', { n: data.star.needed, target: data.star.target }));

  // Gate part
  parts.push(t('zg_gate', { lvl: data.gate.level, dist: data.gate.depthRemaining }));

  return `${t('zg_almost_there')} ${parts.join(' • ')}`;
}

export const settings = use({ id: 'settings', strings });
