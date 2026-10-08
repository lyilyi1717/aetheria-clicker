// R52: passive-first clicking. A click is 0.5 s of production (at least 1 Oil), at most 5 clicks a
// second pay, Auto-tap (dust shop) taps 1/s while the player isn't tapping and offline, and save
// step v9 refunds the removed click upgrades.
// Run: node test_r52_clicks.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { ClickerSystem } from './js/systems/ClickerSystem.js';
import { SaveManager } from './js/engine/SaveManager.js';
import { MIGRATIONS, SAVE_VERSION, migrateSave } from './js/engine/migrations.js';
import { DUST_SHOP_ITEMS, buyShopItem } from './js/systems/DustShopSystem.js';
import { CLICK_CPS_SECONDS, CLICK_MAX_PER_SEC, AUTO_TAP_PER_SEC, AUTO_TAP_IDLE_AFTER } from './js/systems/combo.js';
import { particles } from './js/engine/ParticleEngine.js';

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
const close = (a, b, eps = 1e-9) => Math.abs(a / b - 1) < eps;
const clone = (o) => JSON.parse(JSON.stringify(o));

// A GameState with a fixed generator output and no crits
const make = (cps = 1000) => {
  const gs = new GameState();
  const base = new BigNum(cps);
  gs.buildingSystem = { getTotalProduction: () => base, getTotalBuildingsCount: () => 0 };
  gs.critChance = 0;
  return gs;
};

console.log('--- a click is 0.5 s of production, at least 1 Oil ---');
{
  assert.equal(CLICK_CPS_SECONDS, 0.5);
  assert.equal(CLICK_MAX_PER_SEC, 5);
  assert.equal(AUTO_TAP_PER_SEC, 1);
  const gs = make(1000);
  assert.equal(gs.getClickBase().toNumber(), 500);
  assert.equal(gs.getClickYield().toNumber(), 500);
  gs.comboCount = 80;
  assert.equal(gs.getClickYield().toNumber(), 500, 'the combo is feel only');
  // Current production, buffs included
  gs.activeBuffs.push({ id: 'x', type: 'aether_mult', value: 2, duration: 10, maxDuration: 10 });
  assert.equal(gs.getClickBase().toNumber(), 1000);
  // Fresh run: the floor
  assert.equal(make(0).getClickYield().toNumber(), 1);
  assert.equal(make(1).getClickYield().toNumber(), 1);
  // Resonant Flow talent: +0.02 s per rank
  const g2 = make(1000);
  g2.talents = { click_synergy: { rank: 5 } };
  assert.ok(close(g2.getClickBase().toNumber(), 600));
  // Big numbers stay BigNum
  assert.ok(make(1e300).getClickYield().gt(new BigNum(1, 299)));
}

console.log('--- at most 5 clicks a second pay; extra taps animate but pay nothing ---');
{
  const gs = make(1000);
  const c = new ClickerSystem(gs);
  for (let i = 0; i < 12; i++) c.handleClick(0, 0);
  assert.equal(gs.aether.toNumber(), 5 * 500, '5 of 12 instant taps pay');
  assert.equal(gs.totalClicks, 5, 'unpaid taps are not counted');
  assert.equal(gs.comboCount, 5);
  // The bucket refills on real time, 5 per second, never above 5
  c.update(0, 0.4);
  for (let i = 0; i < 5; i++) c.handleClick(0, 0);
  assert.equal(gs.totalClicks, 7);
  c.update(0, 10);
  for (let i = 0; i < 8; i++) c.handleClick(0, 0);
  assert.equal(gs.totalClicks, 12);
  // A steady 5/s pays every tap; Chrono Warp's game speed doesn't raise the limit
  const g2 = make(1000);
  const c2 = new ClickerSystem(g2);
  c2.clickTokens = 0;
  for (let i = 0; i < 50; i++) { c2.update(5 / CLICK_MAX_PER_SEC, 1 / CLICK_MAX_PER_SEC); c2.handleClick(0, 0); }
  assert.equal(g2.totalClicks, 50);
  const g3 = make(1000);
  const c3 = new ClickerSystem(g3);
  c3.clickTokens = 0;
  for (let i = 0; i < 50; i++) { c3.update(0.5, 0.1); c3.handleClick(0, 0); }
  assert.equal(g3.totalClicks, 25, '10 taps/s under Chrono Warp: 5/s pay');
}

console.log('--- Auto-tap: dust shop item, 1 plain tap a second while idle ---');
{
  const item = DUST_SHOP_ITEMS.find(d => d.id === 'auto_tap');
  assert.deepEqual([item.tier, item.cost, item.maxRank], [1, 5, 1]);

  const gs = make(1000);
  const c = new ClickerSystem(gs);
  c.update(10, 10);
  assert.equal(gs.aether.toNumber(), 0, 'not owned: nothing');
  assert.ok(gs.getAutoTapPerSecond().eq(0));

  gs.ascensionCount = 1;
  gs.attunement.id = 'steady';   // R55: Idle's +30% would apply after a New Well; Steady leaves flat output alone
  gs.cosmicDust = new BigNum(5);
  assert.ok(buyShopItem(gs, 'auto_tap'));
  assert.equal(gs.getAutoTapPerSecond().toNumber(), 500);
  let taps = 0;
  c.onAutoTap = () => { taps++; };
  for (let i = 0; i < 10; i++) c.update(1, 1);
  assert.equal(taps, 10);
  assert.equal(gs.aether.toNumber(), 10 * 500);
  assert.equal(gs.totalAetherEarned.toNumber(), 10 * 500);
  assert.equal(gs.totalClicks, 0, 'auto-taps are not manual clicks (Finger of Wasta, contracts)');
  gs.comboCount = 40; gs.frenzyActive = true;
  c.update(1, 1);
  assert.equal(gs.aether.toNumber(), 11 * 500, 'no combo or Frenzy on auto-taps');
  gs.comboCount = 0; gs.frenzyActive = false;

  // A manual tap pauses it for AUTO_TAP_IDLE_AFTER seconds
  c.handleClick(0, 0);
  assert.equal(c.isAutoTapping(), false);
  taps = 0;
  c.update(AUTO_TAP_IDLE_AFTER - 0.5, AUTO_TAP_IDLE_AFTER - 0.5);
  assert.equal(taps, 0);
  c.update(0.5, 0.5);
  assert.equal(c.isAutoTapping(), true);
  // Real time, not game time: Chrono Warp doesn't speed it up
  taps = 0;
  for (let i = 0; i < 10; i++) c.update(0.5, 0.1);
  assert.equal(taps, 1);
  // Fresh run: each auto-tap pays the 1-Oil floor
  const g0 = make(0);
  g0.dustShop.ranks.auto_tap = 1;
  assert.equal(g0.getAutoTapPerSecond().toNumber(), 1);
}

console.log('--- Auto-tap keeps tapping offline ---');
{
  const H = 3600;
  const gs = make(1000);
  const sm = new SaveManager(gs);
  const res = sm.processOfflineTime(Date.now() - 2 * H * 1000);
  assert.ok(close(res.gainedAether.toNumber(), 1000 * 2 * H, 1e-4), 'without Auto-tap: production only');
  gs.aether = BigNum.zero();
  gs.dustShop.ranks.auto_tap = 1;
  const res2 = sm.processOfflineTime(Date.now() - 2 * H * 1000);
  assert.ok(close(res2.gainedAether.toNumber(), 1500 * 2 * H, 1e-4), 'with Auto-tap: x1.5');
}

console.log('--- save step v9: bought click upgrades are refunded as Oil ---');
{
  assert.equal(SAVE_VERSION, 9);
  assert.equal(MIGRATIONS.at(-1).to, 9);
  const V8 = {
    version: 8,
    aether: { m: 5, e: 2 },                       // 500 Oil
    totalAetherEarned: { m: 1, e: 6 },
    upgrades: ['tapper_u1', 'click_1', 'click_2', 'click_3', 'resonator_u2'],
    chronicle: { count: 1, pages: 0, totalPages: 0, upgrades: {}, challenges: {},
      active: { id: 'sand_lights_out', startedAt: 1, stash: { aether: { m: 0, e: 0 }, totalAetherEarned: { m: 1, e: 3 },
        clickPower: { m: 1, e: 0 }, buildings: {}, upgrades: ['click_1', 'tapper_u1'], comboCount: 0, runStartedAt: 1 } } }
  };
  const d = migrateSave(clone(V8));
  assert.equal(d.version, 9);
  assert.deepEqual(d.upgrades, ['tapper_u1', 'resonator_u2']);
  // click_1..3 cost 10 x baseCost of tiers 1..3 = 100 + 1,000 + 10,000
  assert.ok(close(BigNum.fromJSON(d.aether).toNumber(), 500 + 11100));
  assert.deepEqual(d.totalAetherEarned, V8.totalAetherEarned, 'run Oil (dust) unchanged');
  assert.deepEqual(d.chronicle.active.stash.upgrades, ['tapper_u1']);
  assert.ok(close(BigNum.fromJSON(d.chronicle.active.stash.aether).toNumber(), 100));
  // All 15 (the last costs 10 x 1e15)
  const all = migrateSave({ version: 8, aether: { m: 0, e: 0 }, upgrades: Array.from({ length: 15 }, (_, i) => `click_${i + 1}`) });
  assert.deepEqual(all.upgrades, []);
  let sum = 0;
  for (let i = 1; i <= 15; i++) sum += Math.pow(10, i + 1);
  assert.ok(close(BigNum.fromJSON(all.aether).toNumber(), sum));
  // Nothing to refund, or no upgrades field: unchanged; huge Oil stays as it was
  assert.deepEqual(migrateSave({ version: 8, aether: { m: 3, e: 4 }, upgrades: ['tapper_u1'] }).aether, { m: 3, e: 4 });
  assert.equal(migrateSave({ version: 8 }).upgrades, undefined);
  assert.deepEqual(migrateSave({ version: 8, aether: { m: 2, e: 400 }, upgrades: ['click_1'] }).aether, { m: 2, e: 400 });
  // It loads, and round-trips at v9
  const gs = new GameState();
  gs.deserialize(clone(V8));
  assert.deepEqual(Object.keys(gs.upgrades).sort(), ['resonator_u2', 'tapper_u1']);
  assert.ok(close(gs.aether.toNumber(), 11600));
  const out = clone(gs.serialize());
  assert.equal(out.version, 9);
  const gs2 = new GameState();
  gs2.deserialize(clone(out));
  assert.ok(gs2.aether.eq(gs.aether), 'a v9 save is not refunded twice');
}

console.log('test_r52_clicks.js: all assertions passed');
