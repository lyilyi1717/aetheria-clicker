// Collections and the Generator Codex (R14, redesign 5.3).
//
// Nothing here is awarded on a timer: every entry is *derived* from state the game already saves
// (Warden trophies, Strata relics, Herbarium, recipe discovery, generator counts), so an old save
// opens with its collections already filled. The only new saved state is `gameState.codex`:
//   genBest  { generatorId: best count ever owned }  generators reset on Ascension; this doesn't
//   seen     { entryId: true }                       generator milestones already announced
//   done     { setId: true }                         sets already announced as complete
//   primed   bool                                    false until the first evaluation, which
//                                                    fills seen/done silently (no toast burst)
// Reward: +1% Aether (additive, in the achievement category) per completed set, 8% at most.
import { rewards } from '../ui/rewards.js';
import { BUILDING_DEFINITIONS, getUnlockedTierCount } from './BuildingSystem.js';
import { WARDEN_NAMES, WARDEN_INTERVAL } from './CombatSystem.js';
import { STRATA_RELICS } from './MiningSystem.js';
import { SEED_TYPES, HYBRIDS } from './GardenSystem.js';
import { HYBRID_RECIPES } from './AlchemySystem.js';
import { ACHIEVEMENTS } from './AchievementSystem.js';

export const SET_BONUS = 0.01;
export const GENERATOR_MILESTONES = [100, 500, 1000];

const FLAVOUR_LOCKED = 'Own 100 to read its entry.';

function flag(obj, key) {
  return !!obj && typeof obj === 'object' && !!obj[key];
}

// Collections built from saved state. entries(gs) -> [{ id, name, icon, have, hint }]
export const COLLECTIONS = [
  {
    id: 'wardens', name: 'Warden Trophies', icon: '🏆', where: 'Void Tower',
    blurb: 'Defeat each Tower Warden (every 250 floors).',
    entries: gs => WARDEN_NAMES.map((name, i) => ({
      id: `warden_${i + 1}`, name, icon: '🏆', hint: `Floor ${(i + 1) * WARDEN_INTERVAL}`,
      have: flag(gs.hero?.wardens?.defeated, (i + 1) * WARDEN_INTERVAL)
    }))
  },
  {
    id: 'relics', name: 'Strata Relics', icon: '🏺', where: 'Excavation',
    blurb: 'One relic hides in each stratum of the dig.',
    entries: gs => STRATA_RELICS.map((r, i) => ({
      id: `relic_${r.id}`, name: r.name, icon: r.icon, hint: `Stratum ${i + 1}`,
      have: flag(gs.miningGrid?.relics, r.id)
    }))
  },
  {
    id: 'golden', name: 'Golden Herbarium', icon: '🌼', where: 'Garden',
    blurb: 'A golden mutation of every seed (1% of harvests).',
    entries: gs => Object.values(SEED_TYPES).map(s => ({
      id: `golden_${s.id}`, name: `Golden ${s.name}`, icon: s.icon, hint: 'Harvest it golden',
      have: (Number(gs.garden?.herbarium?.golden?.[s.id]) || 0) > 0
    }))
  },
  {
    id: 'hybrids', name: 'Hybrid Herbarium', icon: '🧬', where: 'Garden',
    blurb: 'Cross-breed every hybrid essence.',
    entries: gs => Object.values(HYBRIDS).map(h => ({
      id: `hybrid_${h.id}`, name: h.name, icon: h.icon, hint: 'Cross two adjacent plants',
      have: (Number(gs.garden?.herbarium?.hybrids?.[h.id]) || 0) > 0
    }))
  },
  {
    id: 'recipes', name: 'Hybrid Recipes', icon: '📖', where: 'Alchemy',
    blurb: 'Discover every hybrid recipe in the Grimoire.',
    entries: gs => HYBRID_RECIPES.map(r => ({
      id: `recipe_${r.id}`, name: r.name, icon: '🧪', hint: 'Hold its ingredients once',
      have: flag(gs.alchemy?.discovered, r.id)
    }))
  },
  ...GENERATOR_MILESTONES.map(n => ({
    id: `generators_${n}`, name: `Generators x${n}`, icon: '🏭', where: 'Generator Codex',
    blurb: `Own ${n.toLocaleString('en-US')} of every generator tier at once (best, kept through resets).`,
    entries: gs => BUILDING_DEFINITIONS.map(d => ({
      id: `gen_${d.id}_${n}`, name: d.name, icon: d.icon, hint: `Tier ${d.tier}`,
      have: (Number(gs.codex?.genBest?.[d.id]) || 0) >= n, generator: d.id, milestone: n
    }))
  }))
];

export class CollectionSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.tickClock = 0;
    this.ensureState();
    this.recordGenerators();
  }

  // Also called lazily: a save import replaces gameState.codex at runtime
  ensureState() {
    const gs = this.gameState;
    const c = gs.codex;
    if (!c || typeof c !== 'object' || Array.isArray(c)) gs.codex = {};
    for (const key of ['genBest', 'seen', 'done']) {
      const v = gs.codex[key];
      if (!v || typeof v !== 'object' || Array.isArray(v)) gs.codex[key] = {};
    }
    gs.codex.primed = gs.codex.primed === true;
    return gs.codex;
  }

  // Keep the best count ever owned per generator (counts reset on Ascension)
  recordGenerators() {
    const codex = this.ensureState();
    const owned = this.gameState.buildings || {};
    for (const id in owned) {
      const n = Math.floor(Number(owned[id]?.count)) || 0;
      if (n > (Number(codex.genBest[id]) || 0)) codex.genBest[id] = n;
    }
  }

  getBest(id) {
    return Number(this.ensureState().genBest[id]) || 0;
  }

  getCollections() {
    this.recordGenerators();
    const gs = this.gameState;
    return COLLECTIONS.map(c => {
      const entries = c.entries(gs);
      const have = entries.filter(e => e.have).length;
      return { id: c.id, name: c.name, icon: c.icon, where: c.where, blurb: c.blurb, entries, have, total: entries.length, complete: have === entries.length };
    });
  }

  getCompletedSetCount() {
    return this.getCollections().filter(c => c.complete).length;
  }

  // Additive Aether bonus from completed sets (read by AchievementSystem.getBonusMultiplier)
  getSetBonus() {
    return this.getCompletedSetCount() * SET_BONUS;
  }

  // One row per generator tier for the Generator Codex. Tiers never owned are silhouettes.
  getGeneratorCodex() {
    this.recordGenerators();
    const open = getUnlockedTierCount(this.gameState);
    return BUILDING_DEFINITIONS.map(d => {
      const best = this.getBest(d.id);
      const reached = GENERATOR_MILESTONES.filter(n => best >= n);
      return {
        id: d.id, tier: d.tier, name: d.name, icon: d.icon, best,
        silhouette: best <= 0, tierLocked: d.tier > open,
        milestones: GENERATOR_MILESTONES.map(n => ({ n, done: best >= n })),
        flavour: best >= GENERATOR_MILESTONES[0] ? d.desc : FLAVOUR_LOCKED,
        flavourUnlocked: best >= GENERATOR_MILESTONES[0],
        stars: reached.length
      };
    });
  }

  // Codex progress: ladder rungs + every collection entry, as { have, total, percent, ... }
  getCodexProgress() {
    const ach = this.gameState.achievementSystem;
    const ladderHave = ach ? ach.getUnlockedCount() : 0;
    let have = ladderHave;
    let total = ACHIEVEMENTS.length;
    const cols = this.getCollections();
    for (const c of cols) { have += c.have; total += c.total; }
    return {
      have, total, percent: total ? (have / total) * 100 : 0,
      ladderHave, ladderTotal: ACHIEVEMENTS.length,
      setsDone: cols.filter(c => c.complete).length, setsTotal: cols.length
    };
  }

  // 0-100. R19 can add this as a leaderboard column.
  getCodexPercent() {
    return this.getCodexProgress().percent;
  }

  // Evaluate every ~1 s from the sim tick; announces what is new since the last evaluation
  update(dt) {
    this.recordGenerators();
    this.tickClock += dt;
    if (this.tickClock < 1) return;
    this.tickClock = 0;
    this.evaluate();
  }

  evaluate() {
    const codex = this.ensureState();
    const prime = !codex.primed;
    const announce = [];
    const sets = [];
    for (const c of this.getCollections()) {
      for (const e of c.entries) {
        if (!e.have || !e.generator || codex.seen[e.id]) continue;
        codex.seen[e.id] = true;
        if (!prime) announce.push(e);
      }
      if (c.complete && !codex.done[c.id]) {
        codex.done[c.id] = true;
        if (!prime) sets.push(c);
      }
    }
    codex.primed = true;
    for (const e of announce) {
      rewards.notify({
        tier: 'small', kind: 'codex-generator', icon: e.icon, color: '#a78bfa',
        title: `Codex: ${e.name} x${e.milestone}`, batchTitle: '{n} Generator Codex entries'
      });
    }
    for (const c of sets) {
      rewards.notify({
        tier: 'big', kind: 'codex-set', icon: c.icon, color: '#fbbf24',
        title: `Collection complete: ${c.name}`, batchTitle: '{n} collections complete',
        detail: `+${SET_BONUS * 100}% Aether`
      });
    }
  }
}
