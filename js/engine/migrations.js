// Save migrations: an ordered chain of steps that upgrade a raw save object, one version at a time.
//
// To change the meaning of a saved field: append a step { to: n + 1, migrate(data) } below.
// Each step receives the raw parsed save (plain JSON, before GameState reads it), mutates it
// into the shape of version `to`, and returns it. Never edit or reorder a shipped step: players
// may hold saves at any older version. Add a test that loads an old-shaped save.

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
