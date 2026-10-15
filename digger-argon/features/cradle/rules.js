// Dig cradle feature (rules): The Celestial Cradle & The Grand Engine (Chapter 13 / Month 12).
// Assembling the 12 Era Keystones activates the Celestial Engine at the Earth's Core,
// awarding the Master Architect Token and unlocking the Eternal Horizon procedural endgame mode.
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

// 12 dispersed components of the Celestial Astrolabe Engine
export const ASTROLABE_COMPONENTS = [
  'mater_plate',          // Month 1: The Brass Mater
  'rete_bracket',         // Month 2: Sluice Rete Bracket
  'gnomon_pointer',       // Month 3: Thermal Gnomon Pointer
  'alidade_rule',         // Month 4: Antiquity Alidade Rule
  'horizon_ring',         // Month 5: Guild Horizon Ring
  'zenith_pin',           // Month 6: Clockwork Zenith Pin
  'altitude_tympan',      // Month 7: Flora Altitude Tympan
  'azimuth_gear',         // Month 8: Acoustic Azimuth Gear
  'equator_prism',        // Month 9: Prismatic Equator Ring
  'ecliptic_armillary',   // Month 10: Astral Ecliptic Armillary
  'meridian_chord',       // Month 11: Chrono Meridian Chord
  'celestial_cradle_crown'// Month 12: Earth's Core Celestial Crown
];

export const NARRATIVE_MILESTONES = {
  LEVEL_20_BELL: 'grandpa_brass_camel_bell',
  LEVEL_40_OUTPOST: 'abandoned_outpost',
  LEVEL_240_CORE: 'earths_core_cradle',
};

const p = {
  keystoneCount: 12,
  eternalStarMultiplier: 5,
};

export function checkNarrativeMilestones(s, level, ev) {
  if (!s.cradle) s.cradle = { keystones: [], components: [], milestones: {}, engineActive: false, eternalHorizonUnlocked: false };
  if (!s.cradle.milestones) s.cradle.milestones = {};

  const lvl = level !== undefined ? level : ((s.road && s.road.reach) || s.best || 0);

  // Level 20: Grandpa's Brass Camel Bell
  if (lvl >= 20 && !s.cradle.milestones.grandpaBell) {
    s.cradle.milestones.grandpaBell = true;
    s.cradle.milestones[NARRATIVE_MILESTONES.LEVEL_20_BELL] = true;
    if (ev) {
      emit(s, ev, 'grandpaBellFound', { level: lvl, id: NARRATIVE_MILESTONES.LEVEL_20_BELL });
      emit(s, ev, 'milestoneDiscovered', { level: lvl, id: NARRATIVE_MILESTONES.LEVEL_20_BELL });
    }
  }

  // Level 40: Abandoned Outpost
  if (lvl >= 40 && !s.cradle.milestones.abandonedOutpost) {
    s.cradle.milestones.abandonedOutpost = true;
    s.cradle.milestones[NARRATIVE_MILESTONES.LEVEL_40_OUTPOST] = true;
    if (ev) {
      emit(s, ev, 'abandonedOutpostFound', { level: lvl, id: NARRATIVE_MILESTONES.LEVEL_40_OUTPOST });
      emit(s, ev, 'milestoneDiscovered', { level: lvl, id: NARRATIVE_MILESTONES.LEVEL_40_OUTPOST });
    }
  }

  return s.cradle.milestones;
}

export function findAstrolabeComponent(s, compId, ev) {
  if (!s.cradle) s.cradle = { keystones: [], components: [], milestones: {}, engineActive: false, eternalHorizonUnlocked: false };
  if (!s.cradle.components) s.cradle.components = [];
  if (!s.cradle.components.includes(compId)) {
    s.cradle.components.push(compId);
    if (ev) emit(s, ev, 'astrolabeComponentFound', { componentId: compId, total: s.cradle.components.length });
  }
  return s.cradle.components.length;
}

export function hasAstrolabeComponent(s, compId) {
  return !!(s && s.cradle && s.cradle.components && s.cradle.components.includes(compId));
}

export function addKeystone(s, keystoneId, ev) {
  if (!s.cradle) s.cradle = { keystones: [], components: [], milestones: {}, engineActive: false, eternalHorizonUnlocked: false };
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
  if (!s.cradle) s.cradle = { keystones: [], components: [], milestones: {}, engineActive: false, eternalHorizonUnlocked: false };
  if (!hasAllKeystones(s)) return false;

  s.cradle.engineActive = true;
  s.cradle.eternalHorizonUnlocked = true;
  s.eternalHorizon = true;

  // Issue numbered Master Architect Token
  if (!s.cradle.architectToken) {
    const tokenNumber = s.cradle.tokenNumber || 42;
    const formattedId = '#' + String(tokenNumber).padStart(4, '0');
    s.cradle.architectToken = {
      id: formattedId,
      number: tokenNumber,
      awardedAt: s.t ? Math.floor(s.t) : Date.now(),
      title: 'Master Astrolabe Architect',
      titleAr: 'كبير مهندسي الإسطرلاب',
    };
  }

  if (ev) {
    emit(s, ev, 'engineAwakened', { token: s.cradle.architectToken });
    emit(s, ev, 'celestialEngineActivated', { token: s.cradle.architectToken });
    emit(s, ev, 'masterArchitectAwarded', { token: s.cradle.architectToken });
    emit(s, ev, 'eternalHorizonUnlocked', {});
  }
  return true;
}

export function getMasterArchitectToken(s) {
  return s?.cradle?.architectToken || null;
}

export function generateEndlessContract(s, seed = 1) {
  const depth = 250 + (seed % 100) * 10;
  const hpMult = 1.0 + (seed % 50) * 0.05;
  const starsPayout = Math.floor(500 * (1 + seed * 0.1));
  const modifierPool = [
    'zero_gravity',
    'starlight_vault',
    'double_time_groove',
    'magma_surge',
    'chrono_echo',
    'obsidian_strata',
  ];
  const modIndex = seed % modifierPool.length;
  const modifiers = [modifierPool[modIndex]];
  if (seed % 2 === 0) {
    modifiers.push(modifierPool[(modIndex + 2) % modifierPool.length]);
  }

  return {
    id: 'endless_' + seed,
    name: 'contract_endless',
    seed,
    depth,
    hpMult,
    starsPayout,
    eternal: true,
    starlightVault: true,
    modifiers,
  };
}

export const cradle = use({
  id: 'cradle',
  params: p,
  strings,
  state: {
    cradle: { init: () => ({ keystones: [], components: [], milestones: {}, engineActive: false, eternalHorizonUnlocked: false, architectToken: null }), survives: ['site'] },
  },
  hooks: {
    siteFinished(s, fin, ev) {
      const reach = (s.road && s.road.reach) || s.best || (fin && fin.depth) || 0;
      checkNarrativeMilestones(s, reach, ev);
    },
    step: {
      at: 140,
      fn(s, dt, ev) {
        const reach = (s.road && s.road.reach) || s.best || 0;
        checkNarrativeMilestones(s, reach, ev);
      },
    },
  },
  firsts: {
    grandpaBellFound: () => 'cradle:grandpabell',
    abandonedOutpostFound: () => 'cradle:outpost',
    engineAwakened: () => 'cradle:engine',
    celestialEngineActivated: () => 'cradle:engine',
    eternalHorizonUnlocked: () => 'cradle:horizon',
    masterArchitectAwarded: () => 'cradle:architect',
  },
  unlocks: [
    { id: 'cradle:grandpabell', cat: 'core', group: 'cradle' },
    { id: 'cradle:outpost', cat: 'core', group: 'cradle' },
    { id: 'cradle:engine', cat: 'core', group: 'cradle' },
    { id: 'cradle:horizon', cat: 'core', group: 'cradle' },
    { id: 'cradle:architect', cat: 'core', group: 'cradle' },
  ],
});
