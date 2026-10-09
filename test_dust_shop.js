// R6: Dust shop of features (design doc 6.2). Item table, tiers by Ascension count, prices,
// buying, effects (Genesis, Resonant Start, Blueprint Memory I/II, Finger of Wasta, Dust Amplifier,
// Chrono Reservoir, Titan's Legacy, Astral Crucible, Golem Covenant, Hourglass, Auto-Buy), the
// Transcend reset, save/load, and the v5 migration of the old Ascension perks.
// Run: node test_dust_shop.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { BuildingSystem, BUILDING_DEFINITIONS } from './js/systems/BuildingSystem.js';
import { PrestigeSystem } from './js/systems/PrestigeSystem.js';
import { UpgradeSystem, getKeptOnAscend } from './js/systems/UpgradeSystem.js';
import { FastForwardSystem, FF_LONG_WARPS } from './js/systems/FastForwardSystem.js';
import { GardenSystem } from './js/systems/GardenSystem.js';
import { CombatSystem } from './js/systems/CombatSystem.js';
import { computeOfflineBands } from './js/engine/SaveManager.js';
import { migrateSave, SAVE_VERSION, MIGRATIONS } from './js/engine/migrations.js';
import { particles } from './js/engine/ParticleEngine.js';
import {
  DUST_SHOP_ITEMS, DUST_SHOP_TIERS, getShopItemCost, getNextShopCost, canBuyShopItem, buyShopItem,
  getShopRank, hasShopItem, isShopItemOpen, getNextShopTier, resetDustShop, getDustAmplifierMult,
  getFingerOfWastaMult, sanitizeDustShopState, blueprintMemoryKeeps, pickAutoBuyTarget, runAutoBuy,
  GENESIS_STALLS, DUST_AMPLIFIER_STEP
} from './js/systems/DustShopSystem.js';
import { getVisibleShopItems, getShopCardState } from './js/ui/dustShop.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
{
  const store = new Map();
  globalThis.localStorage ??= {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  };
}
particles.suppressed = true;
const clone = (o) => JSON.parse(JSON.stringify(o));
const near = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));

const make = (ascensions = 0, dust = 0) => {
  const gs = new GameState();
  const bs = new BuildingSystem(gs);
  const ps = new PrestigeSystem(gs);
  const us = new UpgradeSystem(gs);
  gs.buildingSystem = bs;
  gs.upgradeSystem = us;
  gs.ascensionCount = ascensions;
  gs.cosmicDust = new BigNum(dust);
  gs.totalCosmicDust = new BigNum(dust);
  return { gs, bs, ps, us };
};

console.log('--- Table matches design doc 6.2 (R31 prices, R52 Auto-tap) ---');
{
  const want = {
    genesis: [1, 5], auto_tap: [1, 5], blueprint_memory: [1, 10], chrono_vault: [1, 10], auto_buy: [3, 30], drill_mastery: [3, 35],
    titan_legacy: [3, 10], finger_of_wasta: [3, 50], astral_alchemist: [5, 15],
    golem_covenant: [5, 30], hourglass: [5, 40], al_wakeel: [5, 40], auto_leylines: [10, 60],
    blueprint_memory_2: [10, 50], resonant_start: [20, 250], dust_amplifier: [0, 50]
  };
  assert.deepEqual(DUST_SHOP_ITEMS.map(d => d.id).sort(), Object.keys(want).sort());
  for (const d of DUST_SHOP_ITEMS) {
    assert.deepEqual([d.tier, d.cost], want[d.id], d.id);
    assert.ok(d.name && d.desc && d.icon && d.see, `${d.id} has text`);
  }
  assert.deepEqual(DUST_SHOP_TIERS, [1, 3, 5, 10, 20]);
  // Eternal Resonance and Singularity Tap are gone (the dust multiplier is the number)
  assert.ok(!DUST_SHOP_ITEMS.some(d => d.id === 'eternal_resonance' || d.id === 'hyper_click'));
}

console.log('--- Prices: ranked items x1.5 per rank, Dust Amplifier x2 ---');
{
  assert.equal(getShopItemCost('chrono_vault', 0).toNumber(), 10);
  assert.equal(getShopItemCost('chrono_vault', 2).toNumber(), Math.floor(10 * 1.5 ** 2));
  assert.equal(getShopItemCost('titan_legacy', 3).toNumber(), Math.floor(10 * 1.5 ** 3));
  assert.equal(getShopItemCost('dust_amplifier', 5).toNumber(), 50 * 2 ** 5);
  // Huge ranks stay finite (BigNum)
  assert.ok(Number.isFinite(getShopItemCost('dust_amplifier', 2000).e));
}

console.log('--- Tiers open by lifetime Ascension count ---');
{
  const { gs } = make(0, 1e6);
  assert.ok(isShopItemOpen(gs, 'dust_amplifier'), '"any" items are open from the start');
  assert.ok(!isShopItemOpen(gs, 'genesis'));
  assert.equal(getNextShopTier(gs), 1);
  assert.equal(buyShopItem(gs, 'genesis'), 0, 'locked items cannot be bought');
  gs.ascensionCount = 3;
  assert.ok(isShopItemOpen(gs, 'auto_buy') && !isShopItemOpen(gs, 'hourglass'));
  assert.equal(getNextShopTier(gs), 5);
  gs.ascensionCount = 20;
  assert.equal(getNextShopTier(gs), null);
  assert.ok(DUST_SHOP_ITEMS.every(d => isShopItemOpen(gs, d.id)));
}

console.log('--- Buying spends dust, never lifetime dust or the multiplier; max ranks hold ---');
{
  const { gs } = make(1, 1000);
  const multBefore = gs.getDustMultiplier();
  assert.equal(buyShopItem(gs, 'genesis'), 1);
  assert.ok(near(gs.cosmicDust.toNumber(), 995));
  assert.equal(gs.totalCosmicDust.toNumber(), 1000);
  assert.equal(gs.getDustMultiplier(), multBefore, 'spending never lowers production');
  assert.equal(buyShopItem(gs, 'genesis'), 0, 'one-time items stop at rank 1');
  gs.cosmicDust = new BigNum(1e5);
  for (let r = 0; r < 12; r++) buyShopItem(gs, 'chrono_vault');
  assert.equal(getShopRank(gs, 'chrono_vault'), 10, 'Chrono Reservoir stops at X');
  const poor = make(1, 4).gs;
  assert.ok(!canBuyShopItem(poor, 'genesis'));
  assert.equal(buyShopItem(poor, 'genesis'), 0);
  assert.equal(poor.cosmicDust.toNumber(), 4);
}

console.log('--- UI helpers: next tier visible (locked), later tiers hidden ---');
{
  const { gs } = make(1, 30);
  const ids = getVisibleShopItems(gs).map(d => d.id);
  assert.ok(ids.includes('genesis') && ids.includes('auto_buy') && ids.includes('dust_amplifier'));
  assert.ok(!ids.includes('hourglass'), 'Asc 5 stays hidden until Asc 3 opens');
  assert.equal(getShopCardState(gs, 'genesis'), 'aff');
  assert.equal(getShopCardState(gs, 'dust_amplifier'), 'open');
  assert.equal(getShopCardState(gs, 'auto_buy'), 'lock');
  buyShopItem(gs, 'genesis');
  assert.equal(getShopCardState(gs, 'genesis'), 'own');
}

console.log('--- Cosmic Genesis and Resonant Start apply at the start of each run ---');
{
  const { gs, ps } = make(20, 1e6);
  gs.transcendenceCount = 2; // 16 tiers open
  buyShopItem(gs, 'genesis');
  buyShopItem(gs, 'resonant_start');
  gs.totalAetherEarned = new BigNum(1, 12);
  assert.ok(ps.ascend(true));
  assert.equal(gs.buildings.tapper.count, GENESIS_STALLS);
  assert.equal(gs.gold.toNumber(), 1000);
  for (const def of BUILDING_DEFINITIONS.slice(1, 10)) assert.equal(gs.buildings[def.id].count, 1, def.id);
  // Only generators 1-10: higher tiers are never given, open or not
  assert.equal(gs.buildings[BUILDING_DEFINITIONS[10].id].count, 0, 'tier 11 is open but not given');
  assert.equal(gs.buildings[BUILDING_DEFINITIONS[14].id].count, 0, 'tier 15 is open but not given');
  assert.equal(gs.buildings[BUILDING_DEFINITIONS[16].id].count, 0, 'locked tiers are not given');
}

console.log('--- Blueprint Memory I keeps upgrades 1-2 of each tier; II keeps tiers 1-7 ---');
{
  const tier = (t, level) => ({ kind: 'tier', tier: t, level });
  const { gs } = make(10, 1e6);
  assert.equal(blueprintMemoryKeeps(tier(1, 1), gs), false);
  buyShopItem(gs, 'blueprint_memory');
  assert.equal(blueprintMemoryKeeps(tier(12, 2), gs), true);
  assert.equal(blueprintMemoryKeeps(tier(12, 3), gs), false);
  buyShopItem(gs, 'blueprint_memory_2');
  assert.equal(blueprintMemoryKeeps(tier(7, 5), gs), true);
  assert.equal(blueprintMemoryKeeps(tier(8, 5), gs), false);
  assert.equal(blueprintMemoryKeeps({ kind: 'synergy', tier: 6 }, gs), true);

  // Through the real Ascend reset (registered keep rule)
  const { gs: g2, ps, us } = make(1, 100);
  buyShopItem(g2, 'blueprint_memory');
  g2.buildings.tapper.count = 200;
  g2.aether = new BigNum(1, 30);
  us.buyAllAffordable();
  assert.ok(us.getBoughtCount() > 2);
  assert.deepEqual(getKeptOnAscend(g2).filter(id => id.startsWith('tapper_')).sort(), ['tapper_u1', 'tapper_u2']);
  g2.totalAetherEarned = new BigNum(1, 12);
  ps.ascend(true);
  assert.ok(us.isBought('tapper_u1') && us.isBought('tapper_u2'));
  assert.ok(!us.isBought('tapper_u3'));
}

console.log('--- Finger of Wasta: +1% per 100 clicks this run, cap +50%, restarts each run ---');
{
  const { gs, ps } = make(3, 1000);
  gs.totalClicks = 5000;
  assert.equal(getFingerOfWastaMult(gs), 1, 'not owned: no effect');
  buyShopItem(gs, 'finger_of_wasta');
  gs.dustShop.runClickBase = 4750;
  assert.equal(getFingerOfWastaMult(gs), 1.02);
  gs.buildings.tapper.count = 10;
  const base = gs.getNetAetherPerSecond().toNumber();
  gs.dustShop.runClickBase = 0;
  assert.equal(getFingerOfWastaMult(gs), 1.5, 'capped at +50%');
  assert.ok(Math.abs(gs.getNetAetherPerSecond().toNumber() / base - 1.5 / 1.02) < 1e-9, 'feeds production');
  gs.totalAetherEarned = new BigNum(1, 12);
  ps.ascend(true);
  assert.equal(getFingerOfWastaMult(gs), 1, 'Ascend starts the click count again');
  gs.totalClicks += 300;
  assert.equal(getFingerOfWastaMult(gs), 1.03);
}

console.log('--- Dust Amplifier: +10% pending dust per rank ---');
{
  const { gs, ps } = make(0, 1e6);
  gs.totalAetherEarned = new BigNum(1, 15);
  const before = ps.getPendingCosmicDust().toNumber();
  assert.ok(before > 0);
  buyShopItem(gs, 'dust_amplifier');
  buyShopItem(gs, 'dust_amplifier');
  assert.equal(getDustAmplifierMult(gs), 1 + 2 * DUST_AMPLIFIER_STEP);
  const after = ps.getPendingCosmicDust().toNumber();
  assert.ok(Math.abs(after / before - 1.2) < 0.01, `x1.2 (${before} -> ${after})`);
}

console.log('--- Chrono Reservoir: offline bands +4 h and sand bank +50% per rank ---');
{
  const { gs } = make(1, 1e6);
  const capBefore = gs.getChronoSandCap();
  buyShopItem(gs, 'chrono_vault');
  buyShopItem(gs, 'chrono_vault');
  assert.equal(gs.getChronoSandCap(), capBefore * 2);
  const b0 = computeOfflineBands(20 * 3600, 0);
  const b2 = computeOfflineBands(20 * 3600, getShopRank(gs, 'chrono_vault'));
  assert.ok(b2.paidSecs > b0.paidSecs);
}

console.log("--- Titan's Legacy, Astral Crucible ---");
{
  const { gs } = make(5, 1e6);
  const cs = new CombatSystem(gs);
  const hp = cs.getTotalMaxHp(), atk = cs.getTotalAttack();
  buyShopItem(gs, 'titan_legacy');
  assert.ok(cs.getTotalMaxHp() > hp && cs.getTotalAttack() > atk);
  assert.equal(gs.getBuffDurationMult(), 1);
  buyShopItem(gs, 'astral_alchemist');
  assert.equal(gs.getBuffDurationMult(), 2);
}

console.log('--- Golem Covenant gates buying Golems ---');
{
  const { gs } = make(5, 1e6);
  const garden = new GardenSystem(gs);
  gs.inventory = { ...(gs.inventory || {}), stone: 1e12 };
  gs.garden.essences.manaSap = 1e12;
  assert.equal(garden.isGolemPurchaseUnlocked(), false);
  assert.equal(garden.canBuyGolem(), false, 'no Covenant: cannot buy');
  buyShopItem(gs, 'golem_covenant');
  assert.equal(garden.canBuyGolem(), true);
}

console.log('--- Hourglass of Al-Ula: 5 min / 1 h warps at a flat price ---');
{
  const { gs } = make(5, 1e6);
  const ff = new FastForwardSystem(gs, () => 1e12);
  gs.chronoSand = 4000;
  assert.equal(ff.canUseLong('5m'), false, 'needs the Hourglass');
  buyShopItem(gs, 'hourglass');
  assert.ok(ff.useLong('5m'));
  assert.equal(gs.chronoSand, 3700);
  assert.equal(ff.canUseLong('1h'), false, 'one warp at a time');
  let simmed = 0;
  while (ff.isWarping()) simmed += ff.consume(1, () => {});
  assert.equal(Math.round(simmed), 300);
  assert.ok(ff.useLong('1h'));
  assert.equal(gs.chronoSand, 100);
  assert.deepEqual(FF_LONG_WARPS.map(w => [w.seconds, w.cost]), [[300, 300], [3600, 3600]]);
}

console.log('--- Auto-Buy: best value first, only when owned and switched on ---');
{
  const { gs, bs } = make(3, 1e6);
  gs.aether = new BigNum(1e6);
  assert.equal(runAutoBuy(gs, bs).bought, 0, 'not owned');
  buyShopItem(gs, 'auto_buy');
  assert.ok(pickAutoBuyTarget(gs, bs));
  gs.dustShop.autoBuy = false;
  assert.equal(runAutoBuy(gs, bs).bought, 0, 'switched off');
  gs.dustShop.autoBuy = true;
  const res = runAutoBuy(gs, bs);
  assert.ok(res.bought > 0);
  assert.ok(gs.aether.lt(new BigNum(1e6)));
  assert.equal(bs.buyAmount, 1, 'buy amount restored');
  gs.aether = BigNum.zero();
  assert.equal(pickAutoBuyTarget(gs, bs), null);
}

console.log('--- Transcend resets the shop (the Auto-Buy switch stays) ---');
{
  const { gs } = make(20, 1e6);
  buyShopItem(gs, 'auto_buy');
  buyShopItem(gs, 'chrono_vault');
  gs.dustShop.autoBuy = false;
  resetDustShop(gs);
  assert.deepEqual(gs.dustShop.ranks, {});
  assert.equal(gs.dustShop.autoBuy, false);
}

console.log('--- Save/load round-trip; junk ranks are cleaned ---');
{
  const { gs } = make(10, 1e6);
  buyShopItem(gs, 'hourglass');
  buyShopItem(gs, 'titan_legacy');
  buyShopItem(gs, 'titan_legacy');
  const data = clone(gs.serialize());
  const g2 = new GameState();
  g2.deserialize(data);
  assert.deepEqual(g2.dustShop.ranks, { hourglass: 1, titan_legacy: 2 });
  const s = sanitizeDustShopState({ ranks: { genesis: 7, bogus: 3, titan_legacy: -1, chrono_vault: 'x' } });
  assert.deepEqual(s.ranks, { genesis: 1 });
  assert.deepEqual(sanitizeDustShopState(null).ranks, {});
}

console.log('--- v5 migration: kept perks become shop items, removed perks are refunded ---');
{
  const V4_PERKS = {
    version: 4,
    savedAt: 1760000000000,
    cosmicDust: { m: 1, e: 2 },        // 100 spendable
    totalCosmicDust: { m: 5, e: 4 },
    ascensionCount: 2,
    ascensionPerks: {
      genesis: { rank: 1 }, eternal_resonance: { rank: 3 }, hyper_click: { rank: 2 },
      auto_leylines: { rank: 0 }, chrono_vault: { rank: 4 }, titan_legacy: { rank: 2 },
      astral_alchemist: { rank: 1 }
    },
    garden: { golems: 2 }
  };
  const refund = 10 * (1 + 1.5 + 2.25) + 15 * (1 + 1.5); // Eternal Resonance x3 + Singularity Tap x2
  const out = migrateSave(clone(V4_PERKS));
  assert.equal(out.version, SAVE_VERSION);
  assert.equal(out.ascensionPerks, undefined);
  assert.deepEqual(out.dustShop.ranks, { genesis: 1, chrono_vault: 4, titan_legacy: 2, astral_alchemist: 1, golem_covenant: 1 });

  // Step v5 on its own (v8 rescales dust, R31)
  const v7 = migrateSave(clone(V4_PERKS), MIGRATIONS.filter(st => st.to <= 7));
  assert.ok(Math.abs(BigNum.fromJSON(v7.cosmicDust).toNumber() - (100 + refund)) < 1e-9, 'refund goes to spendable dust');
  assert.equal(BigNum.fromJSON(v7.totalCosmicDust).toNumber(), 5e4, 'lifetime dust untouched');
  const gs = new GameState();
  gs.deserialize(clone(V4_PERKS));
  // Kept even where the shop now asks more Ascensions (Titan is Asc 3, Crucible Asc 5; this save has 2)
  assert.ok(hasShopItem(gs, 'titan_legacy') && hasShopItem(gs, 'astral_alchemist'));
  assert.equal(gs.getChronoSandCap(), 1440 * 3);
  assert.deepEqual(gs.legacyPerkRefund.refunded, { eternal_resonance: 3, hyper_click: 2 });

  // Round-trips without refunding twice
  const again = clone(gs.serialize());
  const g2 = new GameState();
  g2.deserialize(again);
  assert.equal(g2.cosmicDust.toNumber(), gs.cosmicDust.toNumber());
  assert.deepEqual(g2.dustShop.ranks, gs.dustShop.ranks);

  // A save with no perks bought gets no notice
  const none = migrateSave(clone({ ...V4_PERKS, garden: {}, ascensionPerks: { genesis: { rank: 0 } } }));
  assert.equal(none.legacyPerkRefund, undefined);
  assert.deepEqual(none.dustShop.ranks, {});
}

console.log('All dust shop tests passed.');
