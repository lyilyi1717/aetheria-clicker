// Correctness regressions: save/load hardening, BigNum edge cases, overflow-safe curves,
// Max-buy rounding, cooldowns that must survive a reload. Run: node test_correctness.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { BuildingSystem, BUILDING_DEFINITIONS } from './js/systems/BuildingSystem.js';
import { CombatSystem } from './js/systems/CombatSystem.js';
import { MiningSystem } from './js/systems/MiningSystem.js';
import { GardenSystem, WATER_COOLDOWN } from './js/systems/GardenSystem.js';
import { ClickerSystem } from './js/systems/ClickerSystem.js';
import { BountySystem, QUARTERMASTER_UPGRADES } from './js/systems/BountySystem.js';
import { PrestigeSystem } from './js/systems/PrestigeSystem.js';
import { SaveManager, OFFLINE_AETHER_CAP } from './js/engine/SaveManager.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };

console.log('--- BigNum: corrupted JSON never yields a non-finite or non-numeric exponent ---');
{
  // JSON.parse('1e999') is Infinity; an edited or truncated save can carry it
  const inf = BigNum.fromJSON(JSON.parse('{"m":1,"e":1e999}'));
  assert.ok(Number.isFinite(inf.e) && Number.isFinite(inf.m), 'exponent must stay finite');
  assert.equal(inf.toString(), '0e0');
  const strE = BigNum.fromJSON({ m: 5, e: '3' });
  assert.equal(typeof strE.e, 'number', 'exponent must be a number, not a string');
  assert.equal(strE.toNumber(), 5000);
  assert.equal(BigNum.fromJSON({ m: 'abc', e: 2 }).toString(), '0e0');
  assert.equal(BigNum.fromJSON({ m: 2, e: NaN }).toString(), '0e0');
  assert.equal(new BigNum(3, Infinity).toString(), '0e0');
  assert.equal(new BigNum('1e').toNumber(), 1, 'a bare "1e" parses as 1, not NaN exponent');
  // A finite round trip is still exact
  const rt = BigNum.fromJSON(JSON.parse(JSON.stringify(new BigNum('2.5e40'))));
  assert.equal(rt.toString(), '2.5e40');
}

console.log('--- GameState: a corrupted sub-slice does not abort the rest of the load ---');
{
  const src = new GameState();
  new PrestigeSystem(src);
  src.dustShop.ranks.chrono_vault = 7;
  src.achievements = { click_1: { unlockedAt: 1 } };
  src.settings.notation = 'suffix';
  const data = JSON.parse(JSON.stringify(src.serialize()));
  data.bounties = { not: 'an array' };
  const gs = new GameState();
  gs.deserialize(data);
  assert.deepEqual(gs.bounties, []);
  assert.equal(gs.dustShop.ranks.chrono_vault, 7, 'dust shop after the bad slice must still load');
  assert.equal(Object.keys(gs.achievements).length, 1);
  assert.equal(gs.settings.notation, 'suffix');

  // A bounty without rewards is dropped instead of crashing claim later
  const data2 = JSON.parse(JSON.stringify(src.serialize()));
  data2.bounties = [{ id: 'x', type: 'click', current: 0, required: 1 }];
  const gs2 = new GameState();
  gs2.deserialize(data2);
  assert.equal(gs2.bounties.length, 0);
}

console.log('--- Quartermaster: a save missing a charter key can still buy it ---');
{
  const gs = new GameState();
  gs.quartermaster = { aether_treaty: { rank: 2 } }; // older slice without the other charters
  const bou = new BountySystem(gs);
  for (const u of QUARTERMASTER_UPGRADES) assert.ok(gs.quartermaster[u.id], `missing ${u.id}`);
  assert.equal(gs.quartermaster.aether_treaty.rank, 2, 'existing ranks are kept');
  gs.guildSeals = 100;
  assert.equal(bou.buyQuartermasterUpgrade('chronos_contract'), true);
  assert.equal(gs.quartermaster.chronos_contract.rank, 1);
}

console.log('--- Buildings: MAX buys exactly what the budget affords ---');
{
  const gs = new GameState();
  gs.transcendenceCount = 16; // every generated tier (15-30) unlocked, so MAX is checked on them too
  const bs = new BuildingSystem(gs);
  gs.buildingSystem = bs;
  let mismatches = 0;
  for (const def of BUILDING_DEFINITIONS) {
    for (let cur = 0; cur < 120; cur += 7) {
      for (let n = 1; n < 60; n += 3) {
        gs.buildings[def.id].count = cur;
        gs.aether = bs.getBuildingCost(def.id, n);
        const mb = bs.getMaxBuyable(def.id);
        if (mb.count !== n || !gs.aether.gte(mb.cost)) mismatches++;
      }
    }
  }
  assert.equal(mismatches, 0, `MAX under/over-bought in ${mismatches} cases`);
  // ...and buying MAX with exactly the budget for 4 tappers buys 4
  gs.buildings.tapper.count = 0;
  gs.aether = bs.getBuildingCost('tapper', 4);
  bs.buyAmount = 'max';
  assert.equal(bs.buyBuilding('tapper'), true);
  assert.equal(gs.buildings.tapper.count, 4);
  // Budget just under n never over-buys
  gs.buildings.tapper.count = 0;
  gs.aether = bs.getBuildingCost('tapper', 10).sub(1);
  assert.equal(bs.getMaxBuyable('tapper').count, 9);
}

console.log('--- Prestige: dust and shards stay finite past 1e308 ---');
{
  const gs = new GameState();
  const pres = new PrestigeSystem(gs);
  gs.totalAetherEarned = new BigNum('1e320');
  gs.runStartedAt = 0; // minimum run met
  const dust = pres.getPendingCosmicDust();
  assert.ok(dust.gt(0), 'ascension must be possible at 1e320 run Aether');
  assert.equal(pres.canAscend(), true);
  // 150 * (1e311)^(1/3) = 150 * 10^(311/3)
  assert.ok(Math.abs((dust.e + Math.log10(dust.m)) - (Math.log10(150) + 311 / 3)) < 1e-6, `dust ${dust}`);
  // The small end: 1e9 -> 150, 8e9 -> 300 (cube root)
  gs.totalAetherEarned = new BigNum(1e9);
  assert.equal(pres.getPendingCosmicDust().toNumber(), 150);
  gs.totalAetherEarned = new BigNum(8e9);
  assert.equal(pres.getPendingCosmicDust().toNumber(), 300);
  gs.totalAetherEarned = new BigNum(999999999);
  assert.equal(pres.getPendingCosmicDust().toNumber(), 0);

  // Past 1e308 lifetime dust the dust multiplier stays a finite BigNum and Transcend still works
  gs.totalCosmicDust = new BigNum('1e310');
  gs.totalAetherEarned = BigNum.zero();
  const dm = gs.getDustMultiplierBig();
  assert.ok(Math.abs(dm.e + Math.log10(dm.m) - (310 + Math.log10(0.02))) < 1e-9, `dust mult ${dm}`);
  gs.buildingSystem = new BuildingSystem(gs);
  gs.buildings.tapper.count = 1;
  assert.ok(gs.getNetAetherPerSecond().gt(new BigNum('1e300')), 'production uses the BigNum dust multiplier');
  assert.equal(pres.transcend(), true);
  assert.equal(gs.fractureShards.toNumber(), 2, 'R4: 2 shards per Transcend, whatever the dust');
}

console.log('--- Combat: Aether Forge cost never overflows to free ---');
{
  const gs = new GameState();
  const cs = new CombatSystem(gs);
  gs.hero.aetherForgeLevel = 441; // 5^441 overflows a double
  const c441 = cs.getAetherForgeCost();
  assert.ok(c441.gt(0), 'cost must be positive');
  gs.hero.aetherForgeLevel = 440;
  assert.ok(c441.gt(cs.getAetherForgeCost()), 'cost keeps rising');
  gs.hero.aetherForgeLevel = 2;
  assert.ok(Math.abs(cs.getAetherForgeCost().toNumber() - 2500000) < 1e-3);
  gs.aether = BigNum.zero();
  gs.hero.aetherForgeLevel = 441;
  assert.equal(cs.upgradeAetherForge(), false, 'no free upgrade with zero Aether');
}

console.log('--- Clicker: Midas gold keeps flowing on very deep floors ---');
{
  const gs = new GameState();
  new CombatSystem(gs);
  const clicker = new ClickerSystem(gs);
  gs.activeBuffs.push({ id: 'midas_touch', type: 'click_gold', value: 1, duration: 10, maxDuration: 10 });
  gs.hero.floor = 5000;
  gs.gold = BigNum.zero();
  clicker.handleClick(0, 0, true);
  assert.ok(gs.gold.gt(0), 'Midas gold must be > 0 at floor 5000');
  assert.ok(gs.gold.e > 300, `gold ${gs.gold} should be ~5 * 1.15^4999`);
  gs.hero.floor = 3;
  gs.gold = BigNum.zero();
  gs.critChance = 0;
  clicker.handleClick(0, 0, true);
  assert.equal(gs.gold.toNumber(), Math.floor(5 * 1.15 * 1.15));
}

console.log('--- Cooldowns: Water All and Dynamite survive a save/reload ---');
{
  const gs = new GameState();
  const gar = new GardenSystem(gs);
  const ms = new MiningSystem(gs);
  assert.equal(gar.waterAll(), true);
  assert.equal(ms.useDynamite(), true);
  gar.update(10);
  ms.update(10);
  const data = JSON.parse(JSON.stringify(gs.serialize()));
  const gs2 = new GameState();
  gs2.deserialize(data);
  const gar2 = new GardenSystem(gs2);
  const ms2 = new MiningSystem(gs2);
  assert.ok(Math.abs(gar2.waterCooldown - (WATER_COOLDOWN - 10)) < 1e-9, `water cooldown ${gar2.waterCooldown}`);
  assert.ok(Math.abs(ms2.dynamiteCooldown - 15) < 1e-9, `dynamite cooldown ${ms2.dynamiteCooldown}`);
  assert.equal(gar2.waterAll(), false, 'reload must not reset the Water All cooldown');
  assert.equal(ms2.useDynamite(), false, 'reload must not reset the Dynamite cooldown');
  gar2.update(60);
  ms2.update(60);
  assert.equal(gar2.waterAll(), true);
  assert.equal(ms2.useDynamite(), true);
  // Old saves without the field load with no cooldown
  const gs3 = new GameState();
  gs3.deserialize({ version: 2 });
  assert.equal(new GardenSystem(gs3).waterCooldown, 0);
  assert.equal(new MiningSystem(gs3).dynamiteCooldown, 0);
}

console.log('--- Offline Aether is capped (clock-forward exploit) ---');
{
  const gs = new GameState();
  gs.aether = new BigNum(1e6);
  gs.buildingSystem = new BuildingSystem(gs);
  gs.buildingSystem.buyBuilding('tapper');
  gs.aether = BigNum.zero();
  gs.totalAetherEarned = BigNum.zero();
  const rate = gs.getNetAetherPerSecond();
  assert.ok(rate.gt(BigNum.zero()), 'test needs a positive production rate');
  const sm = new SaveManager(gs);
  // A year of "offline" time (or a clock moved forward a year) only credits the bands:
  // 8 h at 100% + 16 h at 50% = 16 h of production
  const res = sm.processOfflineTime(Date.now() - 365 * 24 * 3600 * 1000);
  assert.equal(OFFLINE_AETHER_CAP, 24 * 3600);
  assert.ok(res.capped, 'result reports that the cap applied');
  assert.ok(Math.abs(res.gainedAether.div(rate).toNumber() - 16 * 3600) < 1, 'credits exactly the banded cap');
  assert.ok(res.elapsedSeconds > OFFLINE_AETHER_CAP, 'real elapsed time is still reported');
  // Under the full-rate band nothing changes
  gs.aether = BigNum.zero();
  const short = sm.processOfflineTime(Date.now() - 3600 * 1000);
  assert.ok(!short.capped);
  assert.ok(Math.abs(short.gainedAether.div(rate).toNumber() - 3600) < 1);
}

console.log('✅ ALL CORRECTNESS TESTS PASSED SUCCESSFULLY!');
