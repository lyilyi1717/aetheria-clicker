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
  },
  {
    // v4 -> v5 (Dust shop, roadmap R6, design doc 6.2): the 7 Ascension perks become the dust shop.
    //   - Perks that are shop items now (Cosmic Genesis, Automated Leylines, Chrono Reservoir,
    //     Titan's Legacy, Astral Crucible) keep their rank as owned shop items, free, even where
    //     the shop now asks more Ascensions or more dust for them.
    //   - Removed perks (Eternal Resonance, Singularity Tap) are refunded: every rank's price
    //     (cost x 1.5^r) goes back to spendable dust. Lifetime dust is untouched (it never
    //     dropped when the dust was spent).
    //   - A save that already owns Garden Golems gets Golem Covenant (the gate on buying them).
    // Constants are inlined on purpose (see step 3).
    to: 5,
    migrate(data) {
      const OLD = {
        genesis: [5, 1], eternal_resonance: [10, 50], hyper_click: [15, 50], auto_leylines: [50, 1],
        chrono_vault: [25, 10], titan_legacy: [30, 10], astral_alchemist: [40, 1]
      };
      const KEPT = ['genesis', 'auto_leylines', 'chrono_vault', 'titan_legacy', 'astral_alchemist'];
      const perks = data.ascensionPerks && typeof data.ascensionPerks === 'object' ? data.ascensionPerks : {};
      const ranks = {};
      const refunded = {};
      let dust = BigNum.zero();
      for (const [id, [cost, maxRank]] of Object.entries(OLD)) {
        const raw = Math.floor(Number(perks[id]?.rank));
        const rank = Number.isFinite(raw) ? Math.max(0, Math.min(maxRank, raw)) : 0;
        if (rank <= 0) continue;
        if (KEPT.includes(id)) { ranks[id] = rank; continue; }
        for (let r = 0; r < rank; r++) dust = dust.add(new BigNum(cost * Math.pow(1.5, r)));
        refunded[id] = rank;
      }
      const golems = Math.floor(Number(data.garden?.golems));
      if (Number.isFinite(golems) && golems > 0) ranks.golem_covenant = 1;
      const prev = data.dustShop && typeof data.dustShop === 'object' ? data.dustShop : {};
      data.dustShop = { ...prev, ranks: { ...(prev.ranks || {}), ...ranks } };
      if (dust.gt(0)) data.cosmicDust = BigNum.fromJSON(data.cosmicDust).add(dust).toJSON();
      if (Object.keys(perks).some(id => (Number(perks[id]?.rank) || 0) > 0)) {
        data.legacyPerkRefund = { kept: { ...ranks }, refunded, dust: dust.toJSON() };
      }
      delete data.ascensionPerks;
      return data;
    }
  },
  {
    // v5 -> v6 (progressive tab unlocking, roadmap R7, docs/gamification-roadmap.md §2): new
    // saves start with only the Monolith. Saves from before it keep every tab they have used or
    // already earned, marked as seen (no NEW tags, no reveal toasts, no starter gifts):
    //   - any Ascension, Transcend or Chronicle: every tab;
    //   - otherwise each tab whose trigger is met or whose system shows use.
    // Triggers the save can't show (Alchemy "can brew", pending dust) are caught live on load.
    // Tab ids and thresholds are inlined on purpose (see step 3).
    to: 6,
    migrate(data) {
      const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
      const stats = data.stats && typeof data.stats === 'object' ? data.stats : {};
      const floor = num(data.hero?.maxFloor);
      const depth = num(data.mining?.maxDepth);
      const plots = Array.isArray(data.garden?.plots) ? data.garden.plots : [];
      const items = data.market?.items && typeof data.market.items === 'object' ? Object.values(data.market.items) : [];
      const prestiged = num(data.ascensionCount) >= 1 || num(data.transcendenceCount) >= 1 ||
        num(data.chronicle?.count) >= 1;
      const used = {
        codex: Object.keys(data.achievements || {}).length > 0,
        combat: num(data.buildings?.tapper?.count) >= 10 || floor > 1 || num(stats.totalMonstersSlain) > 0,
        mining: floor > 20 || depth > 0 || num(stats.totalBlocksMined) > 0,
        spells: floor > 40 || num(stats.totalSpellsCast) > 0,
        bounties: depth >= 10 || num(stats.totalBountiesCompleted) > 0 || num(data.records?.guildRank) > 0,
        garden: depth >= 15 || num(stats.totalPlantsHarvested) > 0 || num(data.garden?.golems) > 0 ||
          plots.some((p, i) => i >= 4 && p && p.seed),
        alchemy: num(stats.totalPotionsBrewed) > 0 || num(data.alchemy?.catalysts) > 0,
        prestige: prestiged,
        talents: prestiged,
        leaderboard: prestiged,
        calendar: prestiged,
        market: (num(data.ascensionCount) >= 2 && floor >= 150) ||
          items.some(it => num(it?.owned) > 0) || !!data.market?.caravan?.active || num(data.market?.goldenSynergy) > 0,
        chronicle: num(data.transcendenceCount) >= 1 || num(data.chronicle?.count) >= 1
      };
      const at = num(data.savedAt) > 0 ? num(data.savedAt) : 1;
      const unlocks = data.unlocks && typeof data.unlocks === 'object' ? { ...data.unlocks } : {};
      const seen = data.unlockSeen && typeof data.unlockSeen === 'object' ? { ...data.unlockSeen } : {};
      for (const [tab, ok] of Object.entries(used)) {
        if (!(ok || prestiged)) continue;
        if (!unlocks[tab]) unlocks[tab] = at;
        seen[tab] = true;
      }
      data.unlocks = unlocks;
      data.unlockSeen = seen;
      return data;
    }
  },
  {
    // v6 -> v7 (letter notation, roadmap R30): 'letters' (K, M, B, T, aa, ab...) is the new
    // default notation. Saves on the old default ('scientific', or no setting at all) switch to
    // it; a save can't tell a deliberate Scientific pick from the default, and Settings switches
    // back in one tap. Saves that picked Standard or Engineering keep their choice.
    to: 7,
    migrate(data) {
      const settings = data.settings && typeof data.settings === 'object' ? { ...data.settings } : {};
      if (settings.notation === undefined || settings.notation === 'scientific') settings.notation = 'letters';
      data.settings = settings;
      return data;
    }
  },
  {
    // v7 -> v8 (economy redesign, roadmap R31): numbers grow slowly and prestige bonuses add up.
    // Each save moves to the matching point on the new curve; counts (New Wells, New Fields,
    // shares, Pages, Chronicles) are kept as they are. All constants inlined (see step 3).
    //   - The run is refunded: generators and shop upgrades go back to 0, and the run's Oil comes
    //     back as Oil on the new scale (log scale: the old 1e9 New Well gate is the new 1e4, each
    //     old decade above it is 0.2 of a new one). Tiers 21-30 are gone (retired).
    //   - Reserves of this layer keep their place on the way to the next New Field (log scale:
    //     the old first New Well's 150 is the new 10, the old gate 1e9 x 10^k is the new
    //     400 x 1.6^k). The best single New Well (talent stars) moves the same way.
    //   - Reserve Shop: features and Chrono/Titan ranks are kept; their new prices come out of
    //     the converted Reserves, and what is left is spendable. Reserve Amplifier ranks are
    //     refunded (rebuy them at the new price).
    //   - Deep Blueprints for the retired tiers 21-30 are refunded as shares.
    //   - Auto-Well on the old default rule (x2) moves to the new default (x1.25).
    to: 8,
    migrate(data) {
      const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
      const isBig = (v) => v && typeof v === 'object' && Number.isFinite(Number(v.m)) && Number.isFinite(Number(v.e));
      const lg = (v) => {
        if (isBig(v)) return Number(v.m) > 0 ? Number(v.e) + Math.log10(Number(v.m)) : -Infinity;
        const n = num(v);
        return n > 0 ? Math.log10(n) : -Infinity;
      };
      const fromLog = (l, floor = false) => {
        if (!Number.isFinite(l)) return { m: 0, e: 0 };
        if (floor && l < 15) {
          const n = Math.floor(Math.pow(10, l) + 1e-9);
          if (n <= 0) return { m: 0, e: 0 };
          const e = Math.floor(Math.log10(n));
          return { m: n / Math.pow(10, e), e };
        }
        const e = Math.floor(l);
        return { m: Math.pow(10, l - e), e };
      };
      // Oil: old log 9 -> new log 4, 0.2 new decades per old decade above it
      const mapOil = (v) => {
        const l = lg(v);
        if (!Number.isFinite(l)) return { m: 0, e: 0 };
        return fromLog(l <= 9 ? l * 4 / 9 : 4 + (l - 9) * 0.2);
      };
      // Reserves: piecewise log map, old 150 -> new 10, old gate 1e9 x 10^k -> new 400 x 1.6^k
      // (k capped at 8: the new gates grow x3 per step from the 9th New Field on)
      const k = Math.max(0, Math.floor(num(data.transcendenceCount)));
      const oldGate = 9 + k;
      const newGate = Math.log10(400) + Math.min(k, 8) * Math.log10(1.6);
      const oldFirst = Math.log10(150);
      const mapDustLog = (l) => {
        if (!Number.isFinite(l)) return -Infinity;
        if (l <= oldFirst) return l - oldFirst + 1;
        return Math.min(newGate, 1 + (l - oldFirst) * (newGate - 1) / (oldGate - oldFirst));
      };
      const mapDust = (v) => fromLog(mapDustLog(lg(v)), true);

      // The run: refund generators and upgrades, Oil on the new scale
      const retired = ['mirage_forge', 'qahwa_nebula', 'sadu_loom', 'oasis_gate', 'cosmic_majlis', 'thobe_singularity',
        'hejaz_hyperrail', 'empty_quarter_engine', 'pearl_dyson', 'eternal_dallah'];
      const resetBuildings = (b, countOnly) => {
        const out = {};
        for (const [id, v] of Object.entries(b && typeof b === 'object' ? b : {})) {
          if (retired.includes(id)) continue;
          out[id] = countOnly ? 0 : { ...(v && typeof v === 'object' ? v : {}), count: 0 };
        }
        return out;
      };
      const runOil = mapOil(data.totalAetherEarned);
      data.aether = runOil;
      data.totalAetherEarned = { ...runOil };
      data.buildings = resetBuildings(data.buildings, false);
      data.upgrades = [];
      const active = data.chronicle?.active;
      if (active?.stash && typeof active.stash === 'object') {
        const s = active.stash;
        const stashOil = mapOil(s.totalAetherEarned);
        active.stash = { ...s, aether: stashOil, totalAetherEarned: { ...stashOil }, buildings: resetBuildings(s.buildings, true), upgrades: [] };
      }

      // Reserves of this layer, then the shop
      const lifeOld = lg(data.totalCosmicDust);
      const life = mapDust(data.totalCosmicDust);
      data.totalCosmicDust = life;
      const shop = data.dustShop && typeof data.dustShop === 'object' ? { ...data.dustShop } : null;
      const ranks = shop?.ranks && typeof shop.ranks === 'object' ? { ...shop.ranks } : {};
      const PRICES = { genesis: [5], blueprint_memory: [10], chrono_vault: [10, 1.5], auto_buy: [30], titan_legacy: [10, 1.5],
        finger_of_wasta: [50], astral_alchemist: [15], golem_covenant: [30], hourglass: [40], auto_leylines: [60],
        blueprint_memory_2: [50], resonant_start: [250] };
      let kept = 0;
      for (const [id, [cost, growth]] of Object.entries(PRICES)) {
        const r = Math.max(0, Math.floor(num(ranks[id])));
        for (let i = 0; i < r; i++) kept += growth ? Math.ceil(cost * Math.pow(growth, i)) : cost;
      }
      delete ranks.dust_amplifier;
      if (shop) { shop.ranks = ranks; data.dustShop = shop; }
      const lifeNew = isBig(life) ? Number(life.m) * Math.pow(10, Number(life.e)) : 0;
      data.cosmicDust = fromLog(Number.isFinite(lifeOld) ? Math.log10(Math.max(0, lifeNew - kept)) : -Infinity, true);

      // Talent stars from the best single New Well: same Reserve map, one star per doubling from 16
      const rec = data.records && typeof data.records === 'object' ? { ...data.records } : null;
      if (rec) {
        const best = mapDust(rec.bestRunDust);
        rec.bestRunDust = best;
        const bl = lg(best);
        rec.magnitudeStars = Number.isFinite(bl) ? Math.max(0, Math.floor(bl / Math.log10(2) + 1e-9) - 3) : 0;
        data.records = rec;
      }

      // Shard tree: refund Deep Blueprints of retired tiers, move the old default Auto-Well rule
      const tree = data.shardTree && typeof data.shardTree === 'object' ? { ...data.shardTree } : null;
      if (tree) {
        const owned = { ...(tree.owned || {}) };
        const granted = { ...(tree.granted || {}) };
        let refund = 0;
        for (let tier = 21; tier <= 30; tier++) {
          const id = `foundry_t${tier}`;
          if (owned[id] === true && !granted[id]) refund++;
          delete owned[id];
          delete granted[id];
        }
        tree.owned = owned;
        tree.granted = granted;
        if (tree.autoAscend && typeof tree.autoAscend === 'object' && tree.autoAscend.rule === 'x2') {
          tree.autoAscend = { ...tree.autoAscend, rule: 'x1.25' };
        }
        data.shardTree = tree;
        if (refund > 0) {
          const bal = data.fractureShards;
          const l = lg(bal);
          const have = Number.isFinite(l) ? Math.pow(10, l) : 0;
          data.fractureShards = fromLog(Math.log10(have + refund), true);
        }
      }
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
