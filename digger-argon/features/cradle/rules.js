// Dig cradle feature (rules): The Celestial Cradle & The Grand Engine (Chapter 13 / Month 12).
// Assembling the 12 Era Keystones activates the Celestial Engine at the Earth's Core,
// unlocking the Eternal Horizon procedural endgame mode.
import { use, BLOCKS, emit, fold, PARAMS } from '../../core/registry.js';
import strings from './strings.js';

export const ERA_KEYSTONES = [
  'keystone_sand',
  'keystone_aquifer',
  'keystone_geothermal',
  'keystone_antiquity',
  'keystone_guild',
  'keystone_clockwork',
  'keystone_flora',
  'keystone_acoustics',
  'keystone_prisms',
  'keystone_astral',
  'keystone_void',
  'keystone_cradle',
];

const p = {
  keystoneCount: 12,
  eternalStarMultiplier: 5,
};

export function addKeystone(s, keystoneId, ev) {
  if (!s.cradle) s.cradle = { keystones: [], engineActive: false, eternalHorizonUnlocked: false };
  if (!s.cradle.keystones.includes(keystoneId)) {
    s.cradle.keystones.push(keystoneId);
  }
  if (Array.isArray(s.keystones)) {
    if (!s.keystones.includes(keystoneId)) s.keystones.push(keystoneId);
  } else if (s.keystones && typeof s.keystones === 'object') {
    s.keystones[keystoneId] = (s.keystones[keystoneId] || 0) + 1;
  }
  if (ev) emit(s, ev, 'keystoneAcquired', { keystoneId, total: s.cradle.keystones.length });
  return s.cradle.keystones.length;
}

export function hasAllKeystones(s) {
  if (!s) return false;
  if (s.cradle && s.cradle.keystones && s.cradle.keystones.length >= p.keystoneCount) return true;
  if (Array.isArray(s.keystones) && s.keystones.length >= p.keystoneCount) return true;
  if (s.keystones && typeof s.keystones === 'object') {
    const active = Object.values(s.keystones).filter(v => v > 0).length;
    if (active >= p.keystoneCount) return true;
  }
  return false;
}

export function assembleCelestialEngine(s, ev) {
  if (!s.cradle) s.cradle = { keystones: [], engineActive: false, eternalHorizonUnlocked: false };
  if (!hasAllKeystones(s)) return false;

  s.cradle.engineActive = true;
  s.cradle.eternalHorizonUnlocked = true;
  s.eternalHorizon = true;

  if (ev) {
    emit(s, ev, 'celestialEngineActivated', {});
    emit(s, ev, 'eternalHorizonUnlocked', {});
  }
  return true;
}

export function generateEndlessContract(s, seed = 1) {
  const depth = 250 + (seed % 100) * 10;
  const hpMult = 1.0 + (seed % 50) * 0.05;
  const starsPayout = Math.floor(500 * (1 + seed * 0.1));
  return {
    id: 'endless_' + seed,
    name: 'contract_endless',
    seed,
    depth,
    hpMult,
    starsPayout,
    eternal: true,
  };
}

export const cradle = use({
  id: 'cradle',
  params: p,
  strings,
  state: {
    cradle: { init: () => ({ keystones: [], engineActive: false, eternalHorizonUnlocked: false }), survives: ['site'] },
  },
  firsts: {
    celestialEngineActivated: () => 'cradle:engine',
    eternalHorizonUnlocked: () => 'cradle:horizon',
  },
  unlocks: [
    { id: 'cradle:engine', cat: 'core', group: 'cradle' },
    { id: 'cradle:horizon', cat: 'core', group: 'cradle' },
  ],
});
