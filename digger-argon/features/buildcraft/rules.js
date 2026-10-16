// Dig feature: Survivor-Excavator Buildcraft Engine (HoloCure x Vampire Survivors).
// Loadout matrix: Signature Pick (3 Rune Stamp Sockets), 3 Rig Tools (compressed via Collab fusion),
// 4 Deep Strata Relics (consumed via Rig Ascension), and Vampire Survivors-style Gilded Vaults.

import { use, emit, fold, BLOCKS } from '../../core/registry.js';
import { cellAt, COLS } from '../../core/grid.js';
import { damage, pickPower } from '../../core/rules.js';
import strings from './strings.js';

export const MAX_TOOL_LEVEL = 7;
export const MAX_RELIC_LEVEL = 5;
export const BASE_TOOL_SLOTS = 3;
export const BASE_RELIC_SLOTS = 4;
export const MAX_STAMP_SOCKETS = 3;

export const RIG_TOOLS = {
  chisel:   { id: 'chisel',   name: 'tool_chisel',   desc: 'tool_chisel_d',   mult: 1.3 },
  mortar:   { id: 'mortar',   name: 'tool_mortar',   desc: 'tool_mortar_d',   mult: 1.4 },
  hydrojet: { id: 'hydrojet', name: 'tool_hydrojet', desc: 'tool_hydrojet_d', mult: 1.3 },
  augur:    { id: 'augur',    name: 'tool_augur',    desc: 'tool_augur_d',    mult: 1.25 },
  resonator:{ id: 'resonator',name: 'tool_resonator',desc: 'tool_resonator_d',mult: 1.35 },
  sonar:    { id: 'sonar',    name: 'tool_sonar',    desc: 'tool_sonar_d',    mult: 1.2 },
  beacon:   { id: 'beacon',   name: 'tool_beacon',   desc: 'tool_beacon_d',   mult: 1.3 },
  sprayer:  { id: 'sprayer',  name: 'tool_sprayer',  desc: 'tool_sprayer_d',  mult: 1.4 },
};

export const COLLAB_RECIPES = {
  collab_jackhammer: {
    id: 'collab_jackhammer',
    name: 'collab_jackhammer',
    desc: 'collab_jackhammer_d',
    components: ['chisel', 'mortar'],
    collabMult: 2.5,
  },
  collab_slurry: {
    id: 'collab_slurry',
    name: 'collab_slurry',
    desc: 'collab_slurry_d',
    components: ['hydrojet', 'augur'],
    collabMult: 2.4,
  },
  collab_seismic: {
    id: 'collab_seismic',
    name: 'collab_seismic',
    desc: 'collab_seismic_d',
    components: ['resonator', 'sonar'],
    collabMult: 2.6,
  },
  collab_swarm: {
    id: 'collab_swarm',
    name: 'collab_swarm',
    desc: 'collab_swarm_d',
    components: ['beacon', 'sprayer'],
    collabMult: 2.5,
  },
};

export const RUNE_STAMPS = {
  darbuka_cadence: {
    id: 'darbuka_cadence',
    name: 'stamp_darbuka_cadence',
    desc: 'stamp_darbuka_cadence_d',
    timingTolerance: 50,
  },
  shrapnel_gouge: {
    id: 'shrapnel_gouge',
    name: 'stamp_shrapnel_gouge',
    desc: 'stamp_shrapnel_gouge_d',
    gougeRadius: 2,
  },
  glint_magnetism: {
    id: 'glint_magnetism',
    name: 'stamp_glint_magnetism',
    desc: 'stamp_glint_magnetism_d',
    magnetRadius: 3,
  },
  thermal_fracturing: {
    id: 'thermal_fracturing',
    name: 'stamp_thermal_fracturing',
    desc: 'stamp_thermal_fracturing_d',
    hardRockBonus: 1.0, // +100% damage vs hard rock
  },
};

export function ensureBuildcraft(s) {
  if (!s.buildcraft) {
    s.buildcraft = {
      signaturePick: { sockets: [null, null, null] },
      toolSlots: BASE_TOOL_SLOTS,
      tools: {},
      relicSlots: BASE_RELIC_SLOTS,
      relics: {},
      stamps: [],
      vaultsOpened: 0,
    };
  }
  return s.buildcraft;
}

export function activeToolCount(s) {
  const b = ensureBuildcraft(s);
  return Object.keys(b.tools).length;
}

export function canDraftTool(s) {
  const b = ensureBuildcraft(s);
  return activeToolCount(s) < b.toolSlots;
}

export function addTool(s, id) {
  const b = ensureBuildcraft(s);
  if (!RIG_TOOLS[id] && !COLLAB_RECIPES[id]) return false;
  if (b.tools[id]) return false;
  if (!canDraftTool(s)) return false;
  b.tools[id] = { level: 1, collab: false, ascended: false };
  return true;
}

export function levelUpTool(s, id) {
  const b = ensureBuildcraft(s);
  if (!b.tools[id]) return false;
  if (b.tools[id].level >= MAX_TOOL_LEVEL) return false;
  b.tools[id].level += 1;
  return true;
}

export function activeRelicCount(s) {
  const b = ensureBuildcraft(s);
  return Object.keys(b.relics).length;
}

export function addRelic(s, id) {
  const b = ensureBuildcraft(s);
  if (b.relics[id]) return false;
  if (activeRelicCount(s) >= b.relicSlots) return false;
  b.relics[id] = 1;
  return true;
}

export function levelUpRelic(s, id) {
  const b = ensureBuildcraft(s);
  if (!b.relics[id]) return false;
  if (b.relics[id] >= MAX_RELIC_LEVEL) return false;
  b.relics[id] += 1;
  return true;
}

// Tier 2 Rig Collabs: Tool + Tool Fusion
export function canFuseCollab(s, collabId) {
  const b = ensureBuildcraft(s);
  const recipe = COLLAB_RECIPES[collabId];
  if (!recipe) return false;
  const [tA, tB] = recipe.components;
  const toolA = b.tools[tA];
  const toolB = b.tools[tB];
  return !!(toolA && toolA.level >= MAX_TOOL_LEVEL && toolB && toolB.level >= MAX_TOOL_LEVEL);
}

export function fuseCollab(s, collabId, ev = () => {}) {
  if (!canFuseCollab(s, collabId)) return false;
  const b = ensureBuildcraft(s);
  const recipe = COLLAB_RECIPES[collabId];
  const [tA, tB] = recipe.components;

  // Crucial Slot Dynamic: Two maxed tools are removed, and 1 Collab tool is added
  // This compresses 2 slots into 1 slot, freeing up an empty tool slot!
  delete b.tools[tA];
  delete b.tools[tB];

  b.tools[collabId] = {
    level: MAX_TOOL_LEVEL,
    collab: true,
    ascended: false,
    components: [tA, tB],
  };

  emit(s, ev, 'collabFused', { collabId, components: [tA, tB] });
  return true;
}

// Tier 3 Ascended Rigs: Collab + Relic Fusion
export function canAscendRig(s, collabId, relicId) {
  const b = ensureBuildcraft(s);
  const tool = b.tools[collabId];
  if (!tool || !tool.collab || tool.ascended) return false;
  const relicLv = b.relics[relicId];
  return relicLv !== undefined && relicLv >= MAX_RELIC_LEVEL;
}

export function ascendRig(s, collabId, relicId, ev = () => {}) {
  if (!canAscendRig(s, collabId, relicId)) return false;
  const b = ensureBuildcraft(s);
  const tool = b.tools[collabId];

  // Consumes the Level 5 Relic (freeing 1 Relic slot!)
  delete b.relics[relicId];

  // Ascends the Collab into Mythic Excavation Overdrive
  tool.ascended = true;
  tool.ascendedRelic = relicId;
  tool.overdrive = true;

  emit(s, ev, 'rigAscended', { collabId, relicId, overdrive: true });
  return true;
}

// Rune Stamp Socketing
export function socketRuneStamp(s, socketIndex, stampId, ev = () => {}) {
  if (socketIndex < 0 || socketIndex >= MAX_STAMP_SOCKETS) return false;
  if (!RUNE_STAMPS[stampId]) return false;
  const b = ensureBuildcraft(s);

  // If stamp was in inventory, remove it
  const invIdx = b.stamps.indexOf(stampId);
  if (invIdx >= 0) b.stamps.splice(invIdx, 1);

  // If socket had an existing stamp, return it to inventory
  if (b.signaturePick.sockets[socketIndex]) {
    b.stamps.push(b.signaturePick.sockets[socketIndex]);
  }

  b.signaturePick.sockets[socketIndex] = stampId;
  emit(s, ev, 'runeSocketed', { socketIndex, stampId });
  return true;
}

export function unsocketRuneStamp(s, socketIndex, ev = () => {}) {
  if (socketIndex < 0 || socketIndex >= MAX_STAMP_SOCKETS) return false;
  const b = ensureBuildcraft(s);
  const stamp = b.signaturePick.sockets[socketIndex];
  if (!stamp) return false;
  b.signaturePick.sockets[socketIndex] = null;
  b.stamps.push(stamp);
  emit(s, ev, 'runeUnsocketed', { socketIndex, stampId: stamp });
  return true;
}

export function hasRuneStamp(s, stampId) {
  const b = ensureBuildcraft(s);
  return b.signaturePick.sockets.includes(stampId);
}

// Vampire Survivors-Style Gilded Vaults (1/3/5 Item Batch Jackpots)
export function openGildedVault(s, count = 1, ev = () => {}) {
  const b = ensureBuildcraft(s);
  const batchCount = count === 5 ? 5 : (count === 3 ? 3 : 1);
  const rewards = [];
  const pool = ['tool', 'relic', 'stamp', 'gold', 'stars'];

  for (let i = 0; i < batchCount; i++) {
    const kind = pool[i % pool.length];
    if (kind === 'tool') {
      const keys = Object.keys(b.tools);
      if (keys.length > 0) {
        const k = keys[i % keys.length];
        levelUpTool(s, k);
        rewards.push({ type: 'tool', id: k, level: b.tools[k].level });
      } else {
        const tkeys = Object.keys(RIG_TOOLS);
        const tId = tkeys[i % tkeys.length];
        addTool(s, tId);
        rewards.push({ type: 'tool', id: tId, level: 1 });
      }
    } else if (kind === 'relic') {
      const rkeys = ['fossil_amber', 'obsidian_prism', 'crystal_lens', 'geode_heart'];
      const rId = rkeys[i % rkeys.length];
      if (b.relics[rId]) {
        levelUpRelic(s, rId);
      } else if (activeRelicCount(s) < b.relicSlots) {
        addRelic(s, rId);
      }
      rewards.push({ type: 'relic', id: rId, level: b.relics[rId] || 1 });
    } else if (kind === 'stamp') {
      const skeys = Object.keys(RUNE_STAMPS);
      const sId = skeys[i % skeys.length];
      b.stamps.push(sId);
      rewards.push({ type: 'stamp', id: sId });
    } else if (kind === 'gold') {
      const amt = 500 * (i + 1);
      s.coins = (s.coins || 0) + amt;
      rewards.push({ type: 'gold', amount: amt });
    } else {
      const amt = 10 * (i + 1);
      s.stars = (s.stars || 0) + amt;
      rewards.push({ type: 'stars', amount: amt });
    }
  }

  b.vaultsOpened = (b.vaultsOpened || 0) + 1;
  emit(s, ev, 'gildedVaultOpen', { count: batchCount, rewards });
  return { count: batchCount, rewards };
}

export const buildcraft = use({
  id: 'buildcraft',
  strings,
  state: {
    buildcraft: {
      init: () => ({
        signaturePick: { sockets: [null, null, null] },
        toolSlots: BASE_TOOL_SLOTS,
        tools: {},
        relicSlots: BASE_RELIC_SLOTS,
        relics: {},
        stamps: [],
        vaultsOpened: 0,
      }),
    },
  },
  relics: {
    fossil_amber:   { at: 150, max: 5 },
    obsidian_prism: { at: 151, max: 5 },
    crystal_lens:   { at: 152, max: 5 },
    geode_heart:    { at: 153, max: 5 },
  },
  hooks: {
    swingDmg(s, d) {
      if (hasRuneStamp(s, 'thermal_fracturing')) {
        const cell = cellAt(s, d.r, d.c);
        if (cell && (cell.t === 'hard' || cell.t === 'stone')) {
          d.dmg = Math.round(d.dmg * 2.0); // +100% damage vs hard rock
        }
      }
      // Check active tools and collabs
      const b = ensureBuildcraft(s);
      for (const [id, t] of Object.entries(b.tools)) {
        if (t.ascended) {
          d.dmg = Math.round(d.dmg * 1.5);
        } else if (t.collab) {
          d.dmg = Math.round(d.dmg * 1.25);
        }
      }
    },
    swung(s, sw, ev) {
      if (hasRuneStamp(s, 'glint_magnetism')) {
        // Vacuum nearby ore within 3 blocks
        const r0 = sw.r, c0 = sw.c;
        for (let dr = -3; dr <= 3; dr++) {
          for (let dc = -3; dc <= 3; dc++) {
            const nr = r0 + dr, nc = c0 + dc;
            if (nr < 0 || nc < 0 || nc >= COLS) continue;
            const c = cellAt(s, nr, nc);
            if (c && (c.t === 'gold' || c.t === 'gem' || c.t === 'silver')) {
              damage(s, nr, nc, 10, 'you', ev, { chain: 1 });
            }
          }
        }
      }
      if (hasRuneStamp(s, 'shrapnel_gouge') && sw.crit) {
        // Shrapnel gouges adjacent blocks
        const r0 = sw.r, c0 = sw.c;
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nr = r0 + dr, nc = c0 + dc;
          if (nr >= 0 && nc >= 0 && nc < COLS) {
            damage(s, nr, nc, Math.round(sw.dmg * 0.5), 'you', ev, { chain: 1, burst: true });
          }
        }
      }
    },
    bossDown(s, r, src, ev) {
      // Elite bosses drop Gilded Vaults (3-item batch roll)
      openGildedVault(s, 3, ev);
    },
  },
});
