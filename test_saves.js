// Save versioning: the migration chain upgrades old-shaped saves, and both fixtures round-trip.
// Run: node test_saves.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { SaveManager } from './js/engine/SaveManager.js';
import { CombatSystem } from './js/systems/CombatSystem.js';
import { particles } from './js/engine/ParticleEngine.js';
import { MIGRATIONS, SAVE_VERSION, CATALYST_MIGRATION_CAP, getSaveVersion, migrateSave } from './js/engine/migrations.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;
const store = new Map();
globalThis.localStorage ??= {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k)
};

const clone = o => JSON.parse(JSON.stringify(o));
// Fields stamped from the wall clock on save/load (savedAt, and the Fast Forward high-water
// mark that follows it) legitimately differ between two serializes; compare the rest.
const stable = o => {
  const c = clone(o);
  delete c.savedAt;
  if (c.fastForward) delete c.fastForward.clockMark;
  return c;
};

// A pre-balance-update save: no `version`, compounding Catalyst stored as stats.globalMultiplier
const V1_FIXTURE = {
  savedAt: 1700000000000,
  aether: { m: 1.5, e: 12 },
  totalAetherEarned: { m: 3, e: 14 },
  gold: { m: 4, e: 3 },
  cosmicDust: { m: 2, e: 2 },
  totalCosmicDust: { m: 5, e: 2 },
  ascensionCount: 3,
  totalClicks: 1234,
  stats: { globalMultiplier: Math.pow(1.02, 12) },
  alchemy: { brewed: 4 },
  inventory: { herbs: 7 },
  buildings: { tapper: { count: 10 } },
  settings: { notation: 'suffix' }
};

// A current-shape save as v2 wrote it
const V2_FIXTURE = {
  version: 2,
  savedAt: 1750000000000,
  aether: { m: 7, e: 20 },
  totalAetherEarned: { m: 8, e: 21 },
  gold: { m: 1, e: 6 },
  cosmicDust: { m: 3, e: 4 },
  totalCosmicDust: { m: 9, e: 4 },
  ascensionCount: 11,
  stats: { globalMultiplier: 1 },
  alchemy: { catalysts: 9 },
  inventory: { herbs: 2, rubies: 5 },
  buildings: { tapper: { count: 40 } },
  settings: { notation: 'scientific' }
};

console.log('--- migrations.js: chain is ordered and SAVE_VERSION is its last step ---');
{
  assert.ok(MIGRATIONS.length >= 1);
  assert.equal(MIGRATIONS[0].to, 2, 'v1 -> v2 is the first step');
  MIGRATIONS.forEach((s, i) => {
    assert.equal(typeof s.migrate, 'function');
    if (i > 0) assert.equal(s.to, MIGRATIONS[i - 1].to + 1, 'steps go up one version at a time');
  });
  assert.equal(SAVE_VERSION, MIGRATIONS.at(-1).to);
  assert.equal(new GameState().serialize().version, SAVE_VERSION);
}

console.log('--- getSaveVersion: missing or junk versions count as v1 ---');
{
  assert.equal(getSaveVersion({}), 1);
  assert.equal(getSaveVersion({ version: 'abc' }), 1);
  assert.equal(getSaveVersion({ version: -3 }), 1);
  assert.equal(getSaveVersion({ version: NaN }), 1);
  assert.equal(getSaveVersion({ version: '2' }), 2);
  assert.equal(getSaveVersion({ version: 2 }), 2);
}

console.log('--- migrateSave: runs every step above the save version ---');
{
  // A fake chain proves steps run in order, only above the save's version
  const seen = [];
  const step = to => ({ to, migrate(d) { seen.push([to, d.version]); d[`v${to}`] = true; return d; } });
  const chain = [step(2), step(3), step(4)];
  const fromV1 = migrateSave({}, chain);
  assert.deepEqual(seen, [[2, undefined], [3, 2], [4, 3]], 'each step sees the previous version');
  assert.equal(fromV1.version, 4);
  seen.length = 0;
  const fromV3 = migrateSave({ version: 3 }, chain);
  assert.deepEqual(seen, [[4, 3]], 'steps at or below the save version are skipped');
  assert.equal(fromV3.v2, undefined);
  assert.equal(fromV3.version, 4);
  seen.length = 0;
  assert.equal(migrateSave({ version: 4 }, chain).version, 4);
  assert.deepEqual(seen, []);

  const v1 = migrateSave(clone(V1_FIXTURE));
  assert.equal(v1.version, SAVE_VERSION);
  assert.equal(v1.alchemy.catalysts, 12, '1.02^12 compounding -> 12 additive catalysts');
  assert.equal(v1.alchemy.brewed, 4, 'other alchemy fields are kept');
  assert.equal(v1.stats.globalMultiplier, 1);

  // Behaviour of the v1 -> v2 step is unchanged: huge multipliers are capped
  const big = migrateSave({ stats: { globalMultiplier: Math.pow(1.02, 400) } });
  assert.equal(big.alchemy.catalysts, CATALYST_MIGRATION_CAP);
  const inf = migrateSave({ stats: { globalMultiplier: Infinity } });
  assert.equal(inf.alchemy.catalysts, CATALYST_MIGRATION_CAP);

  // A current save is not touched (the v2 step would otherwise reset nothing, but must not run)
  const v2 = clone(V2_FIXTURE);
  v2.stats.globalMultiplier = 1.5; // would be rewritten if the v1 step ran again
  assert.equal(migrateSave(v2).stats.globalMultiplier, 1.5);

  // A save from a newer build keeps its version; nothing is downgraded
  const future = migrateSave({ version: SAVE_VERSION + 5, stats: { globalMultiplier: 3 } });
  assert.equal(future.version, SAVE_VERSION + 5);
  assert.equal(future.stats.globalMultiplier, 3);

  assert.equal(migrateSave(null), null);
}

console.log('--- v1 fixture loads and round-trips ---');
{
  const gs = new GameState();
  gs.deserialize(clone(V1_FIXTURE));
  assert.equal(gs.aether.toString(), new BigNum(1.5e12).toString());
  assert.equal(gs.ascensionCount, 3);
  assert.equal(gs.totalClicks, 1234);
  assert.equal(gs.alchemy.catalysts, 12);
  assert.equal(gs.stats.globalMultiplier, 1);
  assert.equal(gs.inventory.herbs, 7);
  assert.equal(gs.buildings.tapper.count, 10);
  assert.equal(gs.settings.notation, 'suffix');

  const out = clone(gs.serialize());
  assert.equal(out.version, SAVE_VERSION);
  const gs2 = new GameState();
  gs2.deserialize(clone(out));
  assert.deepEqual(stable(gs2.serialize()), stable(out), 'a migrated v1 save round-trips unchanged');
}

console.log('--- v2 fixture loads and round-trips ---');
{
  const gs = new GameState();
  gs.deserialize(clone(V2_FIXTURE));
  assert.equal(gs.ascensionCount, 11);
  assert.equal(gs.alchemy.catalysts, 9, 'a current save keeps its catalysts');
  assert.equal(gs.inventory.rubies, 5);
  assert.equal(gs.settings.notation, 'scientific');

  const out = clone(gs.serialize());
  const gs2 = new GameState();
  gs2.deserialize(clone(out));
  assert.deepEqual(stable(gs2.serialize()), stable(out), 'a v2 save round-trips unchanged');
}

console.log('--- v2 -> v3: a deep pre-rebalance Tower save (floor 700k) is rebased ---');
{
  // Old-shape hero: Cosmic kit rolled on the old 1.12 curve at the exponent cap (6000)
  const cap = Math.pow(1.12, 6000);
  const hero = {
    level: 70, xp: 0, xpNeeded: 1e12, floor: 700000, maxFloor: 723053, hp: 1e298, maxHp: 100,
    hpRegen: 3, baseAttack: 15, attackCooldown: 0, attackSpeed: 1, shield: 0, aetherForgeLevel: 28,
    gear: {
      weapon: { name: 'Cosmic WEAPON', attack: Math.floor(180 * cap), rarity: 'Cosmic' },
      armor: { name: 'Cosmic ARMOR', hp: Math.floor(720 * cap), rarity: 'Cosmic' },
      amulet: { name: 'Cosmic AMULET', crit: 0.5, rarity: 'Cosmic' },
      relic: { name: 'Cosmic RELIC', lifesteal: 0.3, rarity: 'Cosmic' }
    },
    skills: { strike: { name: 'Heavy Strike', cd: 0, maxCd: 4, dmgMult: 2.5 } }
  };
  for (const fixture of [{ ...clone(V2_FIXTURE), hero: clone(hero) }, { ...clone(V1_FIXTURE), hero: clone(hero) }]) {
    const gs = new GameState();
    gs.deserialize(fixture);
    const w = gs.hero.gear.weapon.attack;
    assert.ok(Number.isFinite(w) && Math.abs(w / (180 * Math.pow(1.11, 6000)) - 1) < 1e-6, 'weapon rescaled to 1.11');
    assert.equal(gs.hero.maxFloor, 723053, 'record kept');
    assert.equal(gs.hero.indexFloor, 700000, 'provisional indexFloor until CombatSystem rebases the floor');
    assert.equal(gs.hero.pendingFloorRebase, true);
    // CombatSystem finishes the rebase on load (covered in depth in test_tower.js)
    new CombatSystem(gs);
    assert.ok(gs.hero.floor > 1000 && gs.hero.floor < 6001, `rebased floor ${gs.hero.floor}`);
    assert.equal(gs.hero.indexFloor, gs.hero.floor);
    assert.ok(gs.getMarketIndex().lt(new BigNum(1.12).pow(6000)));
    const out = clone(gs.serialize());
    assert.equal(out.version, SAVE_VERSION);
    assert.equal(out.hero.pendingFloorRebase, undefined);
    const gs2 = new GameState();
    gs2.deserialize(clone(out));
    assert.deepEqual(stable(gs2.serialize()), stable(out), 'a rebased save round-trips unchanged');
  }
}

console.log('--- v3 -> v4: saves that Transcended under the old rules are refunded (R4) ---');
{
  // Old rules: 50k-dust gate, floor(lifetime dust / 1e4) shards at +10% Aether each
  const near = (a, b) => Math.abs(a / b - 1) < 1e-12;
  const V3_TRANSCENDED = {
    version: 3,
    savedAt: 1760000000000,
    aether: { m: 1, e: 15 },
    totalAetherEarned: { m: 2, e: 15 },
    cosmicDust: { m: 1, e: 3 },
    totalCosmicDust: { m: 5, e: 3 },
    ascensionCount: 30,
    fractureShards: { m: 2.3, e: 1 }, // 23 shards: x3.3 under the old rules
    transcendenceCount: 3,
    buildings: { tapper: { count: 40 }, matrix: { count: 2 } }
  };
  const gs = new GameState();
  gs.deserialize(clone(V3_TRANSCENDED));
  // 2 shards per old Transcend (6: x11.4) beats matching the old x3.3 (3 shards)
  assert.equal(gs.fractureShards.toNumber(), 6);
  assert.equal(gs.totalFractureShards.toNumber(), 6);
  assert.equal(gs.transcendenceCount, 3, 'old Transcends count: tiers 15-17 open');
  // Dust the old Transcends took (23 x 1e4) comes back, lifetime and spendable
  assert.ok(near(gs.totalCosmicDust.toNumber(), 5000 + 230000));
  assert.ok(near(gs.cosmicDust.toNumber(), 1000 + 230000));
  assert.deepEqual(gs.legacyTranscendRefund, { transcends: 3, oldShards: { m: 2.3, e: 1 }, shards: 6, dust: { m: 2.3, e: 5 } });
  assert.equal(gs.buildings.tapper.count, 40);
  // Never weaker: the new shard multiplier beats the old one
  assert.ok(gs.getShardAetherMult().toNumber() >= 1 + 0.1 * 23);

  // One Transcend at a very large pile: 1e4 shards (old x1,001). 2 shards would be x2.25, so the
  // refund pays the fewest shards that match x1,001: ceil(log 1001 / log 1.5) = 18
  const gsBig = new GameState();
  gsBig.deserialize({ ...clone(V3_TRANSCENDED), transcendenceCount: 1, fractureShards: { m: 1, e: 4 } });
  assert.equal(gsBig.totalFractureShards.toNumber(), 18);
  assert.ok(gsBig.getShardAetherMult().toNumber() >= 1001);
  assert.ok(near(gsBig.totalCosmicDust.toNumber(), 5000 + 1e8));

  // Past 1e308 shards (an edited or runaway save): finite and still never weaker
  const gsHuge = new GameState();
  gsHuge.deserialize({ ...clone(V3_TRANSCENDED), fractureShards: { m: 1, e: 400 } });
  assert.equal(gsHuge.totalFractureShards.toNumber(), Math.ceil(399 / Math.log10(1.5)));
  assert.equal(gsHuge.totalCosmicDust.toString(), new BigNum(1, 404).add(5000).toString());

  // Saves that never Transcended are unchanged apart from the new lifetime-shard field
  const plain = migrateSave(clone(V2_FIXTURE));
  assert.equal(plain.legacyTranscendRefund, undefined);
  assert.deepEqual(plain.totalCosmicDust, V2_FIXTURE.totalCosmicDust);
  const gsPlain = new GameState();
  gsPlain.deserialize(clone(V2_FIXTURE));
  assert.equal(gsPlain.totalFractureShards.toNumber(), 0);
  assert.equal(gsPlain.legacyTranscendRefund, null);

  // The migrated save round-trips, and is not refunded twice
  const out = clone(gs.serialize());
  assert.equal(out.version, SAVE_VERSION);
  const gs2 = new GameState();
  gs2.deserialize(clone(out));
  assert.deepEqual(stable(gs2.serialize()), stable(out), 'a refunded save round-trips unchanged');
  assert.ok(near(gs2.totalCosmicDust.toNumber(), 235000), 'not refunded twice');
}

console.log('--- Import goes through the same migration path ---');
{
  const encode = d => btoa(encodeURIComponent(JSON.stringify(d)));
  const gs = new GameState();
  const sm = new SaveManager(gs);
  assert.equal(sm.importSaveString(encode(V1_FIXTURE)), true);
  assert.equal(gs.alchemy.catalysts, 12, 'imported v1 save is migrated');
  assert.equal(gs.stats.globalMultiplier, 1);
  const stored = JSON.parse(localStorage.getItem('AETHERIA_CHRONICLES_SAVE_V1'));
  assert.equal(stored.version, SAVE_VERSION, 'import re-saves at the current version');

  // Valid JSON that is not a save object is rejected and does not touch the game
  gs.ascensionCount = 42;
  for (const junk of [1, 'text', null, [1, 2]]) {
    assert.equal(sm.importSaveString(encode(junk)), false, `reject ${JSON.stringify(junk)}`);
  }
  assert.equal(sm.importSaveString('not base64 !!'), false);
  assert.equal(gs.ascensionCount, 42);
}

console.log('All save versioning tests passed.');
