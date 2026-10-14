// Dig feature: Grandpa's Tailwind (Zero-FOMO 48h Absence Catch-Up).
// Returning players after >= 48 hours away receive 3 Tailwind charges.
// While charges > 0: Rafeeq speed is 2x and Gate damage banking is 80% (up from 60%).
// Charges decrement upon site completion.
import { use, emit } from '../../core/registry.js';
import strings from './strings.js';

export function checkTailwind(s, seconds, ev = () => {}) {
  if (!s.tailwind) s.tailwind = { charges: 0 };
  if (seconds >= 48 * 3600 && s.tailwind.charges === 0) {
    s.tailwind.charges = 3;
    emit(s, ev, 'tailwindAwarded', { charges: 3 });
    return true;
  }
  return false;
}

export const tailwindCharges = s => (s.tailwind && s.tailwind.charges) || 0;

export function consumeTailwindCharge(s) {
  if (s.tailwind && s.tailwind.charges > 0) {
    s.tailwind.charges--;
    return true;
  }
  return false;
}

export const tailwind = use({
  id: 'tailwind',
  strings,
  state: {
    tailwind: { init: () => ({ charges: 0 }), survives: ['site', 'land'] },
  },
  mods: {
    crewSpeed: (v, s) => (s.tailwind && s.tailwind.charges > 0 ? v * 2 : v),
    crewRate: (v, s) => (s.tailwind && s.tailwind.charges > 0 ? v * 2 : v),
    crewWalk: (v, s) => (s.tailwind && s.tailwind.charges > 0 ? v * 2 : v),
    gateBankShare: (v, s) => (s.tailwind && s.tailwind.charges > 0 ? 0.80 : v),
  },
  hooks: {
    awayEnd(s, out, ev) {
      const secs = (out && (out.rawSeconds !== undefined ? out.rawSeconds : out.seconds)) || 0;
      checkTailwind(s, secs, ev);
    },
    siteFinished(s) {
      consumeTailwindCharge(s);
    },
  },
});
