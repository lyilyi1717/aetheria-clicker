// Save migrations: an ordered chain of steps that upgrade a raw save object, one version at a time.
//
// To change the meaning of a saved field: append a step { to: n + 1, migrate(data) } below.
// Each step receives the raw parsed save (plain JSON, before GameState reads it), mutates it
// into the shape of version `to`, and returns it. Never edit or reorder a shipped step: players
// may hold saves at any older version. Add a test that loads an old-shaped save.

import { BigNum } from './BigNum.js';

// Old saves with more compounding Catalyst brews than this are trimmed on migration
export const CATALYST_MIGRATION_CAP = 50;

export const MIGRATIONS = [
  {
    // v1 -> v2 (balance update): Catalyst compounding -> additive count. Mining migrates its own
    // fields (MiningSystem.migrateMiningGrid).
    to: 2,
    migrate(data) {
      // Philosopher's Catalyst: globalMultiplier = 1.02^n becomes alchemy.catalysts = n (max 50)
      const gm = data.stats?.globalMultiplier;
      data.alchemy = { ...(data.alchemy || {}) };
      if (typeof gm === 'number' && gm > 1) {
        const n = Math.round(Math.log(gm) / Math.log(1.02));
        data.alchemy.catalysts = Math.min(Number.isFinite(n) ? n : CATALYST_MIGRATION_CAP, CATALYST_MIGRATION_CAP);
      }
      if (data.stats) data.stats.globalMultiplier = 1;
      return data;
    }
  },
  {
    // v2 -> v3 (Tower rebalance, docs/gamification-roadmap.md §8): gear now rolls at
    // 1.11^(f-1) instead of 1.12^(f-1). Rescale the equipped weapon/armor to the roll it would
    // have had on the new curve, set indexFloor (the floor the Market Index reads; maxFloor
    // stays the record), and flag the hero so CombatSystem.rebaseLegacyFloor steps the floor
    // down to what the rescaled kit clears (that needs live combat stats). Constants are inlined
    // on purpose: this step must keep doing the same thing if the live curves change later.
    to: 3,
    migrate(data) {
      const h = data.hero;
      if (!h || typeof h !== 'object') return data;
      const rarityMult = { Common: 1, Rare: 2, Epic: 4, Legendary: 8, Cosmic: 18 };
      const rescale = (item, stat, base) => {
        if (!item || typeof item !== 'object') return;
        const v = Number(item[stat]);
        if (!(v > 0)) return;
        const mult = rarityMult[item.rarity] || 1;
        // Item floor f inferred from v = base * mult * 1.12^(f-1); rolls capped at exponent 6000
        const exp = Math.min(6000, Math.log(v / (base * mult)) / Math.log(1.12));
        if (!(exp > 0)) return; // starter kit or below the floor-1 roll: nothing to rescale
        item[stat] = Math.max(1, Math.floor(Math.min(v, 1e300) * Math.pow(1.11 / 1.12, exp)));
      };
      rescale(h.gear?.weapon, 'attack', 10);
      rescale(h.gear?.armor, 'hp', 40);
      const floor = Number(h.floor), maxFloor = Number(h.maxFloor);
      const f = Number.isFinite(floor) && floor >= 1 ? Math.floor(floor) : 1;
      h.indexFloor = Number.isFinite(maxFloor) && maxFloor >= 1 ? Math.min(Math.floor(maxFloor), f) : f;
      h.pendingFloorRebase = true;
      return data;
    }
  },
  {
    // v3 -> v4 (Transcend rework, roadmap R4, design doc 6.1). Old rules: gate 50k lifetime dust,
    // floor(lifetime dust / 1e4) shards at +10% Aether each, and all dust lost. New rules: 2 shards
    // per Transcend at x1.5 Aether and x1.5 dust gain each, plus one generator tier per Transcend.
    // Refund for saves that already Transcended:
    //   - every old Transcend is re-scored as a new one (keeps transcendenceCount, so the tiers
    //     and the next gate match a new-rules player at the same count);
    //   - shards = max(2 x Transcends, the fewest shards whose x1.5^n matches the old 1 + 0.1 x S),
    //     so no save's shard multiplier goes down;
    //   - the dust the old Transcends took is given back: the old payout was floor(dust / 1e4),
    //     so S old shards stand for at least S x 1e4 dust, added to lifetime and spendable dust.
    // Constants are inlined on purpose (see step 3).
    to: 4,
    migrate(data) {
      const count = Math.floor(Number(data.transcendenceCount));
      const T = Number.isFinite(count) && count > 0 ? count : 0;
      const oldShards = BigNum.fromJSON(data.fractureShards).max(0).floor();
      if (T === 0 && oldShards.lte(0)) {
        data.totalFractureShards = data.fractureShards ?? { m: 0, e: 0 };
        return data;
      }
      // log10(1 + 0.1 S): direct while S fits a double, else log10(S) - 1
      const log10S = oldShards.m > 0 ? Math.log10(oldShards.m) + oldShards.e : -Infinity;
      const log10Old = log10S > 15 ? log10S - 1 : Math.log10(1 + 0.1 * oldShards.toNumber());
      const matchOld = Math.ceil(log10Old / Math.log10(1.5) - 1e-9);
      const shards = Math.max(2 * T, Number.isFinite(matchOld) ? matchOld : 0);
      const dust = oldShards.mul(1e4);
      data.fractureShards = new BigNum(shards).toJSON();
      data.totalFractureShards = new BigNum(shards).toJSON();
      data.cosmicDust = BigNum.fromJSON(data.cosmicDust).add(dust).toJSON();
      data.totalCosmicDust = BigNum.fromJSON(data.totalCosmicDust).add(dust).toJSON();
      data.legacyTranscendRefund = { transcends: T, oldShards: oldShards.toJSON(), shards, dust: dust.toJSON() };
      return data;
    }
  }
];

// The version GameState.serialize() writes: the target of the last step
export const SAVE_VERSION = MIGRATIONS[MIGRATIONS.length - 1].to;

// Saves written before versioning existed have no `version`; treat them (and junk values) as v1
export function getSaveVersion(data) {
  const v = Number(data?.version);
  return Number.isFinite(v) && v >= 1 ? Math.floor(v) : 1;
}

// Runs every step above the save's version, in order, and stamps each step's version.
// Mutates and returns `data`. A save from a newer build than this one is left as is.
// `steps` is only overridden by tests.
export function migrateSave(data, steps = MIGRATIONS) {
  if (!data || typeof data !== 'object') return data;
  const from = getSaveVersion(data);
  for (const step of steps) {
    if (step.to > from) {
      data = step.migrate(data) || data;
      data.version = step.to;
    }
  }
  return data;
}
