// Dig feature: Antiquity Restoration Lab (Month 4 / Chapter 5 / ARGON-17)
// Completed museum sets can be restored into active Antiquities equipped into 3 loadout slots.
// Active relic examples:
//   - Scarab Compass: highlights all hidden chests on current level.
//   - Obsidian Siphon: channels 5% of TNT damage to the Gate.
//   - Golden Mortar: doubles crew speed after Big Rocks.

import { use, emit, fold, BLOCKS } from '../../core/registry.js';
import { cellAt, COLS } from '../../core/grid.js';
import strings from './strings.js';

export const ANTIQUITIES = {
  scarab_compass: {
    id: 'scarab_compass',
    set: 'scarab',
    icon: 'compass',
  },
  obsidian_siphon: {
    id: 'obsidian_siphon',
    set: 'whale',
    icon: 'siphon',
  },
  golden_mortar: {
    id: 'golden_mortar',
    set: 'camel',
    icon: 'mortar',
  },
  dhab_chisel: {
    id: 'dhab_chisel',
    set: 'dhab',
    icon: 'chisel',
  },
  djinn_censer: {
    id: 'djinn_censer',
    set: 'djinn',
    icon: 'censer',
  },
  pearl_pendulum: {
    id: 'pearl_pendulum',
    set: 'pearls',
    icon: 'pendulum',
  },
};

export const MAX_EQUIPPED_SLOTS = 3;

// Checks whether the required museum fossil set for an antiquity is complete or restored
export function isSetCompleted(s, setId) {
  if (!s) return false;
  if (s.wingDone && s.wingDone[setId]) return true;
  if (s.sets && s.sets[setId]) return true;
  if (s.museum && s.museum.sets && s.museum.sets[setId]) return true;
  return false;
}

export function isSetRestored(s, setId) {
  if (!s) return false;
  if (isSetCompleted(s, setId)) return true;
  const specs = (s.museum && s.museum.specimens) || s.specimens || {};
  const setSpecs = Object.values(specs).filter(sp => sp.set === setId || (sp.id && sp.id.startsWith(setId + '.')));
  return setSpecs.length > 0 && setSpecs.every(sp => sp.grade >= 9 || sp.restored);
}

export function canRestoreAntiquity(s, id) {
  const ant = ANTIQUITIES[id];
  if (!ant) return false;
  if (s.antiquities && s.antiquities.unlocked && s.antiquities.unlocked.includes(id)) return false;
  return isSetCompleted(s, ant.set) || isSetRestored(s, ant.set);
}

export function restoreAntiquity(s, id, ev = () => {}) {
  const ant = ANTIQUITIES[id];
  if (!ant) return false;
  if (!s.antiquities) {
    s.antiquities = { unlocked: [], equipped: [null, null, null], mortarBoost: 0, mortarMult: 2 };
  }
  if (!s.antiquities.unlocked) s.antiquities.unlocked = [];
  if (s.antiquities.unlocked.includes(id)) return true;

  if (!canRestoreAntiquity(s, id)) return false;

  s.antiquities.unlocked.push(id);
  emit(s, ev, 'antiquityRestored', { id });
  return true;
}

export function isAntiquityEquipped(s, id) {
  return !!(s && s.antiquities && s.antiquities.equipped && s.antiquities.equipped.includes(id));
}

export function equippedAntiquities(s) {
  return (s && s.antiquities && s.antiquities.equipped) ? [...s.antiquities.equipped] : [null, null, null];
}

export function equipAntiquity(s, id, slotIndex = -1, ev = () => {}) {
  if (!s.antiquities) {
    s.antiquities = { unlocked: [], equipped: [null, null, null], mortarBoost: 0, mortarMult: 2 };
  }
  if (!s.antiquities.equipped) s.antiquities.equipped = [null, null, null];

  // Must be unlocked
  if (!s.antiquities.unlocked || !s.antiquities.unlocked.includes(id)) {
    return false;
  }

  // Remove from any previous slot if already equipped
  const prevSlot = s.antiquities.equipped.indexOf(id);
  if (prevSlot >= 0) {
    s.antiquities.equipped[prevSlot] = null;
  }

  let targetSlot = slotIndex;
  if (targetSlot < 0 || targetSlot >= MAX_EQUIPPED_SLOTS) {
    targetSlot = s.antiquities.equipped.findIndex(slot => slot === null);
    if (targetSlot < 0) targetSlot = 0; // Replace slot 0 if all full
  }

  s.antiquities.equipped[targetSlot] = id;
  emit(s, ev, 'antiquityEquipped', { id, slot: targetSlot });
  return true;
}

export function unequipAntiquity(s, slotIndex, ev = () => {}) {
  if (!s.antiquities || !s.antiquities.equipped) return false;
  if (slotIndex < 0 || slotIndex >= MAX_EQUIPPED_SLOTS) return false;
  const removed = s.antiquities.equipped[slotIndex];
  s.antiquities.equipped[slotIndex] = null;
  if (removed) {
    emit(s, ev, 'antiquityUnequipped', { id: removed, slot: slotIndex });
  }
  return true;
}

// Scarab Compass: reveals / highlights hidden chests and rare ore on the current excavation floor
export function highlightHiddenChests(s) {
  const out = [];
  if (!s || !s.rows) return out;
  const maxR = s.top + s.rows.length;
  for (let r = s.top; r < maxR; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cellAt(s, r, c);
      if (cell && (cell.t === 'chest' || cell.chest || cell.t === 'gem' || cell.t === 'gold' || cell.t === 'silver' || cell.ore)) {
        cell.shown = 1;
        cell.revealed = true;
        out.push({ r, c, t: cell.t });
      }
    }
  }
  return out;
}

// Obsidian Siphon: channels 5% of TNT explosion damage directly to the Gate
export function channelSiphonDamage(s, tntDmg, ev = () => {}) {
  if (!isAntiquityEquipped(s, 'obsidian_siphon')) return 0;
  const siphonDmg = Math.max(1, Math.round(tntDmg * 0.05));

  if (s.boss && s.boss.hp > 0) {
    const dealt = Math.min(s.boss.hp, siphonDmg);
    s.boss.hp = Math.max(0, s.boss.hp - dealt);
    s.boss.you = (s.boss.you || 0) + dealt;
    emit(s, ev, 'siphonDamage', { dmg: dealt, gateHp: s.boss.hp });
    return dealt;
  }
  return 0;
}

// Golden Mortar: activates temporary crew speed boost after Big Rock break (default 2x, supports 3x for 15s)
export function triggerGoldenMortar(s, duration = 15, ev = () => {}, mult = null) {
  if (!s.antiquities) {
    s.antiquities = { unlocked: [], equipped: [null, null, null], mortarBoost: 0, mortarMult: 2 };
  }
  s.antiquities.mortarBoost = duration;
  if (mult !== null) {
    s.antiquities.mortarMult = mult;
  }
  emit(s, ev, 'mortarBoost', { duration, mult: s.antiquities.mortarMult || 2 });
  return true;
}

export function hasMortarBoost(s) {
  return isAntiquityEquipped(s, 'golden_mortar') && !!(s.antiquities && s.antiquities.mortarBoost > 0);
}

// ---------- Alqahwa Restoration Lab: Interactive Tactile Brush Minigame ----------
export function brushMinigameStroke(s, specimenId, ev = () => {}) {
  const specs = (s.museum && s.museum.specimens) || s.specimens || {};
  let spec = specs[specimenId];
  if (!spec) {
    spec = { id: specimenId, grade: 7, clean: false, restored: false, brushStrokes: 0, excavatedAt: Date.now() };
    specs[specimenId] = spec;
  }
  spec.brushStrokes = (spec.brushStrokes || 0) + 1;
  const clearedPct = Math.min(100, spec.brushStrokes * 20);
  const debrisRemaining = Math.max(0, 100 - clearedPct);

  emit(s, ev, 'labBrushStroke', {
    specimenId,
    stroke: spec.brushStrokes,
    clearedPct,
    debrisRemaining,
  });

  if (spec.brushStrokes >= 5) {
    spec.grade = 9; // Elevated to Grade 9 Restored Mint
    spec.restored = true;
    spec.brushProgress = 100;
    emit(s, ev, 'specimenRestored', { id: specimenId, grade: 9 });
    emit(s, ev, 'labRestorationComplete', { specimenId, grade: 9 });
  }

  return {
    stroke: spec.brushStrokes,
    clearedPercent: clearedPct,
    debrisPercent: debrisRemaining,
    restored: !!spec.restored,
    grade: spec.grade,
  };
}

export const antiquities = use({
  id: 'antiquities',
  strings,
  state: {
    antiquities: {
      init: () => ({
        unlocked: [],
        equipped: [null, null, null],
        mortarBoost: 0,
        mortarMult: 2,
      }),
      survives: ['site'],
    },
  },
  mods: {
    crewRate: (v, s) => (hasMortarBoost(s) ? v * (s.antiquities.mortarMult || 2) : v),
    crewWalk: (v, s) => (hasMortarBoost(s) ? v * 1.5 : v),
    pickPower: (v, s) => (isAntiquityEquipped(s, 'dhab_chisel') ? v * 1.25 : v),
    rubbleMult: (v, s) => (isAntiquityEquipped(s, 'pearl_pendulum') ? v * 1.5 : v),
  },
  hooks: {
    bossDown(s, r, src, ev) {
      if (isAntiquityEquipped(s, 'golden_mortar')) {
        triggerGoldenMortar(s, 15, ev, 3);
      }
    },
    tntPop(s, ev, d) {
      if (isAntiquityEquipped(s, 'obsidian_siphon') && d && d.dmg) {
        channelSiphonDamage(s, d.dmg, ev);
      }
    },
    step: {
      at: 400,
      fn(s, dt) {
        if (s.antiquities && s.antiquities.mortarBoost > 0) {
          s.antiquities.mortarBoost = Math.max(0, s.antiquities.mortarBoost - dt);
        }
        if (isAntiquityEquipped(s, 'scarab_compass')) {
          highlightHiddenChests(s);
        }
      },
    },
  },
});
