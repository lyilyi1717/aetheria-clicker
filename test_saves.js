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
// Runs the migration chain only up to version v (to test one older step on its own)
const upTo = (data, v) => migrateSave(data, MIGRATIONS.filter(st => st.to <= v));
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
  // v8 (R31): the run is refunded as Oil on the new scale (3e14 run Oil -> 10^(4 + 5.48 x 0.2))
  assert.ok(Math.abs(Math.log10(gs.aether.toNumber()) - (4 + (Math.log10(3e14) - 9) * 0.2)) < 1e-9);
  assert.equal(gs.ascensionCount, 3);
  assert.equal(gs.totalClicks, 1234);
  assert.equal(gs.alchemy.catalysts, 12);
  assert.equal(gs.stats.globalMultiplier, 1);
  assert.equal(gs.inventory.herbs, 7);
  assert.equal(gs.buildings.tapper.count, 0, 'v8 refunds the run');
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
  assert.equal(gs.settings.notation, 'letters', 'the old default notation moves to letters (v7)');

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
  // Step v4 on its own (later steps rescale the economy, R31): raw data after the chain up to v7
  const big = (v) => BigNum.fromJSON(v);
  const shardMultV7 = (d) => Math.pow(1.5, big(d.totalFractureShards).toNumber()); // the rules v4-v7 shipped with
  const d = upTo(clone(V3_TRANSCENDED), 7);
  // 2 shards per old Transcend (6: x11.4) beats matching the old x3.3 (3 shards)
  assert.equal(big(d.fractureShards).toNumber(), 6);
  assert.equal(big(d.totalFractureShards).toNumber(), 6);
  assert.equal(d.transcendenceCount, 3, 'old Transcends count');
  // Dust the old Transcends took (23 x 1e4) comes back, lifetime and spendable
  assert.ok(near(big(d.totalCosmicDust).toNumber(), 5000 + 230000));
  assert.ok(near(big(d.cosmicDust).toNumber(), 1000 + 230000));
  assert.deepEqual(d.legacyTranscendRefund, { transcends: 3, oldShards: { m: 2.3, e: 1 }, shards: 6, dust: { m: 2.3, e: 5 } });
  assert.equal(d.buildings.tapper.count, 40);
  // Never weaker: the new shard multiplier beats the old one
  assert.ok(shardMultV7(d) >= 1 + 0.1 * 23);

  // One Transcend at a very large pile: 1e4 shards (old x1,001). 2 shards would be x2.25, so the
  // refund pays the fewest shards that match x1,001: ceil(log 1001 / log 1.5) = 18
  const dBig = upTo({ ...clone(V3_TRANSCENDED), transcendenceCount: 1, fractureShards: { m: 1, e: 4 } }, 7);
  assert.equal(big(dBig.totalFractureShards).toNumber(), 18);
  assert.ok(shardMultV7(dBig) >= 1001);
  assert.ok(near(big(dBig.totalCosmicDust).toNumber(), 5000 + 1e8));

  // Past 1e308 shards (an edited or runaway save): finite and still never weaker
  const dHuge = upTo({ ...clone(V3_TRANSCENDED), fractureShards: { m: 1, e: 400 } }, 7);
  assert.equal(big(dHuge.totalFractureShards).toNumber(), Math.ceil(399 / Math.log10(1.5)));
  assert.equal(big(dHuge.totalCosmicDust).toString(), new BigNum(1, 404).add(5000).toString());

  // Saves that never Transcended are unchanged apart from the new lifetime-shard field
  const plain = upTo(clone(V2_FIXTURE), 7);
  assert.equal(plain.legacyTranscendRefund, undefined);
  assert.deepEqual(plain.totalCosmicDust, V2_FIXTURE.totalCosmicDust);
  const gsPlain = new GameState();
  gsPlain.deserialize(clone(V2_FIXTURE));
  assert.equal(gsPlain.totalFractureShards.toNumber(), 0);
  assert.equal(gsPlain.legacyTranscendRefund, null);

  // The fully migrated save round-trips, and is not refunded twice
  const gs = new GameState();
  gs.deserialize(clone(V3_TRANSCENDED));
  assert.equal(gs.totalFractureShards.toNumber(), 6);
  const out = clone(gs.serialize());
  assert.equal(out.version, SAVE_VERSION);
  const gs2 = new GameState();
  gs2.deserialize(clone(out));
  assert.deepEqual(stable(gs2.serialize()), stable(out), 'a refunded save round-trips unchanged');
  assert.ok(gs2.totalCosmicDust.eq(gs.totalCosmicDust), 'not refunded twice');
}

console.log('--- v4 -> v5: Ascension perks become the Dust shop (R6) ---');
{
  const V4_WITH_PERKS = {
    version: 4,
    savedAt: 1760000000000,
    cosmicDust: { m: 5, e: 1 },
    totalCosmicDust: { m: 1, e: 4 },
    ascensionCount: 6,
    ascensionPerks: {
      genesis: { rank: 1 }, eternal_resonance: { rank: 2 }, hyper_click: { rank: 0 },
      auto_leylines: { rank: 1 }, chrono_vault: { rank: 3 }, titan_legacy: { rank: 0 },
      astral_alchemist: { rank: 0 }
    },
    buildings: { tapper: { count: 12 } }
  };
  // Step v5 on its own (v8 rescales dust, R31)
  const d = upTo(clone(V4_WITH_PERKS), 7);
  assert.deepEqual(d.dustShop.ranks, { genesis: 1, auto_leylines: 1, chrono_vault: 3 });
  // Eternal Resonance x2 refunded at its old prices: 10 + 15 dust
  assert.ok(Math.abs(BigNum.fromJSON(d.cosmicDust).toNumber() - (50 + 25)) < 1e-9);
  assert.equal(BigNum.fromJSON(d.totalCosmicDust).toNumber(), 1e4, 'lifetime dust untouched');
  assert.equal(d.buildings.tapper.count, 12);
  const gs = new GameState();
  gs.deserialize(clone(V4_WITH_PERKS));
  assert.deepEqual(gs.dustShop.ranks, { genesis: 1, auto_leylines: 1, chrono_vault: 3 });
  assert.equal(gs.getChronoSandCap(), 1440 * 2.5, 'Chrono Reservoir III still raises the sand bank');
  const out = clone(gs.serialize());
  assert.equal(out.version, SAVE_VERSION);
  assert.equal(out.ascensionPerks, undefined, 'the old perk field is gone');
  const gs2 = new GameState();
  gs2.deserialize(clone(out));
  assert.deepEqual(stable(gs2.serialize()), stable(out), 'a converted save round-trips unchanged');
}

console.log('--- v4 save from before the Chronicle (R20): additive, no migration step ---');
{
  // R20 adds the chronicle slice with defaults. transcendenceCount now counts this Chronicle's
  // Transcends, which equals the lifetime count for every save made before the Chronicle shipped.
  const old = clone(new GameState().serialize());
  delete old.chronicle;
  old.version = 4;
  old.transcendenceCount = 17;
  const gs = new GameState();
  gs.deserialize(clone(old));
  assert.equal(gs.transcendenceCount, 17);
  assert.equal(gs.chronicle.count, 0);
  assert.equal(gs.chronicle.pastTranscends, 0);
  assert.equal(gs.chronicle.active, null);
  assert.equal(gs.serialize().version, SAVE_VERSION);
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

console.log('--- v5 -> v6: saves from before progressive unlocking keep the tabs they used (R7) ---');
{
  const load = (data) => { const gs = new GameState(); gs.deserialize(clone(data)); return gs; };
  const base = { version: 5, savedAt: 1760000000000, aether: { m: 1, e: 3 }, totalAetherEarned: { m: 1, e: 4 } };
  const open = (gs) => ['codex', 'combat', 'mining', 'spells', 'bounties', 'garden', 'alchemy', 'prestige',
    'talents', 'leaderboard', 'calendar', 'market', 'chronicle'].filter(t => gs.isTabUnlocked(t));

  // Any Ascension: every tab, all seen (no NEW tags, no reveal)
  const asc = load({ ...base, ascensionCount: 1 });
  assert.equal(open(asc).length, 13, 'an Ascended save keeps every tab');
  assert.equal(asc.unlocks.market, base.savedAt, 'stamped with the save time');
  assert.equal(asc.unlockSeen.chronicle, true);
  assert.equal(load({ ...base, transcendenceCount: 2 }).isTabUnlocked('market'), true);
  assert.equal(load({ ...base, chronicle: { count: 1 } }).isTabUnlocked('calendar'), true);

  // A day-1 save: tabs it has used or earned, nothing else
  const day1 = load({
    ...base,
    achievements: { click_1: { unlockedAt: 1 } },
    buildings: { tapper: { count: 12 } },
    hero: { floor: 33, maxFloor: 33 },
    mining: { maxDepth: 4 },
    stats: { totalSpellsCast: 0, totalPlantsHarvested: 3 }
  });
  assert.deepEqual(open(day1), ['codex', 'combat', 'mining', 'garden']);
  assert.equal(day1.unlockSeen.mining, true);
  assert.equal(day1.unlockSeen.spells, undefined);

  // Each system's own evidence opens its tab
  assert.equal(load({ ...base, mining: { maxDepth: 10 } }).isTabUnlocked('bounties'), true, 'depth 10');
  assert.equal(load({ ...base, stats: { totalBountiesCompleted: 1 } }).isTabUnlocked('bounties'), true);
  assert.equal(load({ ...base, mining: { maxDepth: 15 } }).isTabUnlocked('garden'), true, 'depth 15');
  assert.equal(load({ ...base, garden: { plots: [{}, {}, {}, {}, { seed: 'mana_lily' }] } }).isTabUnlocked('garden'), true,
    'something planted past the 4 starter plots');
  assert.equal(load({ ...base, garden: { plots: [{ seed: 'spore' }] } }).isTabUnlocked('garden'), false,
    'the starter plots alone are not use');
  assert.equal(load({ ...base, stats: { totalPotionsBrewed: 2 } }).isTabUnlocked('alchemy'), true);
  assert.equal(load({ ...base, alchemy: { catalysts: 1 } }).isTabUnlocked('alchemy'), true);
  assert.equal(load({ ...base, stats: { totalSpellsCast: 4 } }).isTabUnlocked('spells'), true);
  assert.equal(load({ ...base, hero: { floor: 41, maxFloor: 41 } }).isTabUnlocked('spells'), true);
  assert.equal(load({ ...base, market: { items: { dates: { owned: 3 } } } }).isTabUnlocked('market'), true, 'Bazaar holdings');
  assert.equal(load({ ...base, market: { items: {}, caravan: { active: true } } }).isTabUnlocked('market'), true);
  assert.equal(load({ ...base, stats: { totalMonstersSlain: 5 } }).isTabUnlocked('combat'), true);

  // A fresh pre-R7 save (nothing done yet) starts like a new game: Monolith only
  assert.deepEqual(open(load(base)), []);
  assert.deepEqual(open(load({ ...base, version: undefined })), [], 'a v1 save runs every step');

  // Unlocks a v6 save already has are kept, and the step doesn't run again
  const v6 = load({ ...base, version: 6, unlocks: { combat: 9 }, unlockSeen: {} });
  assert.deepEqual(v6.unlocks, { combat: 9 });
  assert.equal(v6.unlockSeen.combat, undefined);
}

console.log('--- v7 -> v8: the economy redesign moves saves to the same point on the new curve (R31) ---');
{
  const lg = (b) => Math.log10(b.m) + b.e;
  // Mid-year under the old economy: 10 New Fields, a deep layer, a long run, the old ladder
  const V7_MIDYEAR = {
    version: 7,
    savedAt: 1760000000000,
    runStartedAt: 1759990000000,
    aether: { m: 3, e: 39 },
    totalAetherEarned: { m: 1, e: 40 },
    cosmicDust: { m: 2, e: 16 },
    totalCosmicDust: { m: 1, e: 17 },     // old gate for the 11th New Field: 1e19
    ascensionCount: 400,
    transcendenceCount: 10,
    fractureShards: { m: 3, e: 0 },
    totalFractureShards: { m: 2, e: 1 },
    talentPoints: 55,
    buildings: { tapper: { count: 900, unlocked: true }, matrix: { count: 120 }, dune_array: { count: 4 }, mirage_forge: { count: 3 } },
    upgrades: ['tapper_u1', 'tapper_u2', 'click_1'],
    dustShop: { ranks: { genesis: 1, blueprint_memory: 1, chrono_vault: 2, dust_amplifier: 120 }, autoBuy: true, runClickBase: 0 },
    shardTree: { owned: { chronos_auto_ascend: true, foundry_t16: true, foundry_t25: true, foundry_t30: true }, granted: { foundry_t30: true },
      autoAscend: { enabled: true, rule: 'x2', timerMin: 30 } },
    records: { bestRunDust: { m: 1, e: 16 }, magnitudeStars: 13, stars: {}, harvested: {}, transcendPaid: 10, contractsClaimed: 0, guildRank: 0 },
    chronicle: { count: 0, pages: 0, totalPages: 0, upgrades: {}, challenges: {},
      active: { id: 'sand_dry_well', startedAt: 1759990000000, stash: { aether: { m: 1, e: 30 }, totalAetherEarned: { m: 5, e: 31 },
        clickPower: { m: 1, e: 0 }, buildings: { tapper: 500, eternal_dallah: 2 }, upgrades: ['tapper_u1'], comboCount: 0, runStartedAt: 1759980000000 } } }
  };
  const d = migrateSave(clone(V7_MIDYEAR));
  assert.equal(d.version, 8);
  // The run is refunded: generators and upgrades back to 0, run Oil 1e40 -> 10^(4 + 31 x 0.2)
  assert.ok(Math.abs(lg(d.totalAetherEarned) - 10.2) < 1e-9);
  assert.deepEqual(d.aether, d.totalAetherEarned, 'the whole run comes back as Oil to spend');
  assert.deepEqual(Object.keys(d.buildings).sort(), ['dune_array', 'matrix', 'tapper'], 'retired tier 21 is gone');
  assert.ok(Object.values(d.buildings).every(b => b.count === 0));
  assert.equal(d.buildings.tapper.unlocked, true, 'other building fields are kept');
  assert.deepEqual(d.upgrades, []);
  // Reserves keep their place on the way to the next New Field (log 17 of 19 -> the new gate,
  // capped at the last x1.6 step: 400 x 1.6^7)
  const newGate = Math.log10(400) + 7 * Math.log10(1.6);
  const want = 1 + (17 - Math.log10(150)) * (newGate - 1) / (19 - Math.log10(150));
  assert.ok(Math.abs(lg(d.totalCosmicDust) - want) < 1e-3, `lifetime Reserves ${lg(d.totalCosmicDust)} vs ${want}`);
  assert.ok(lg(d.totalCosmicDust) < newGate);
  // Shop: features and ranks kept and paid at the new prices, Amplifier refunded
  assert.deepEqual(d.dustShop.ranks, { genesis: 1, blueprint_memory: 1, chrono_vault: 2 });
  const life = BigNum.fromJSON(d.totalCosmicDust).toNumber();
  assert.equal(BigNum.fromJSON(d.cosmicDust).toNumber(), Math.floor(life - (5 + 10 + 10 + 15) + 1e-9));
  // Shares unchanged; the bought Deep Blueprint of tier 25 is refunded, the granted one dropped
  assert.equal(BigNum.fromJSON(d.totalFractureShards).toNumber(), 20);
  assert.equal(BigNum.fromJSON(d.fractureShards).toNumber(), 4);
  assert.deepEqual(Object.keys(d.shardTree.owned).sort(), ['chronos_auto_ascend', 'foundry_t16']);
  assert.deepEqual(d.shardTree.granted, {});
  assert.equal(d.shardTree.autoAscend.rule, 'x1.25', 'the old default rule moves to the new default');
  // Talent stars: the record moves with the Reserves, points already paid stay
  assert.ok(lg(d.records.bestRunDust) <= lg(d.totalCosmicDust));
  assert.equal(d.records.magnitudeStars, Math.max(0, Math.floor(lg(d.records.bestRunDust) / Math.log10(2) + 1e-9) - 3));
  assert.equal(d.talentPoints, 55);
  // A run set aside by a challenge is refunded the same way
  const st = d.chronicle.active.stash;
  assert.ok(Math.abs(lg(st.totalAetherEarned) - (4 + (31 + Math.log10(5) - 9) * 0.2)) < 1e-9);
  assert.deepEqual(st.buildings, { tapper: 0 });
  assert.deepEqual(st.upgrades, []);

  // It loads into the new game: small finite numbers, all 18 tiers this save has open
  const gs = new GameState();
  gs.deserialize(clone(V7_MIDYEAR));
  assert.equal(gs.transcendenceCount, 10);
  assert.equal(gs.getShardAetherMult().toNumber(), 1 + 0.25 * 20);
  assert.ok(gs.getDustMultiplier() > 1 && gs.getDustMultiplier() < 200, `dust multiplier ${gs.getDustMultiplier()}`);
  assert.equal(gs.shardTree.autoAscend.rule, 'x1.25');
  const out = clone(gs.serialize());
  assert.equal(out.version, SAVE_VERSION);
  const gs2 = new GameState();
  gs2.deserialize(clone(out));
  assert.deepEqual(stable(gs2.serialize()), stable(out), 'a v8 save round-trips unchanged');

  // A new player's save: one New Well (150 Reserves) -> 10, the new first New Well; no Field yet
  const early = migrateSave({ version: 7, aether: { m: 5, e: 8 }, totalAetherEarned: { m: 2, e: 9 },
    cosmicDust: { m: 1.5, e: 2 }, totalCosmicDust: { m: 1.5, e: 2 }, ascensionCount: 1, buildings: { tapper: { count: 30 } },
    shardTree: { owned: {}, granted: {}, autoAscend: { enabled: true, rule: 'x1.5', timerMin: 30 } } });
  assert.equal(BigNum.fromJSON(early.totalCosmicDust).toNumber(), 10);
  assert.equal(BigNum.fromJSON(early.cosmicDust).toNumber(), 10);
  assert.equal(early.shardTree.autoAscend.rule, 'x1.5', 'a rule the player picked stays');
  assert.ok(Math.abs(lg(early.totalAetherEarned) - (4 + Math.log10(2) * 0.2)) < 1e-9, 'just past the old gate -> just past the new one');
  // A save with nothing to convert is still valid
  const empty = migrateSave({ version: 7 });
  assert.deepEqual(empty.aether, { m: 0, e: 0 });
  assert.deepEqual(empty.cosmicDust, { m: 0, e: 0 });
}

console.log('All save versioning tests passed.');
