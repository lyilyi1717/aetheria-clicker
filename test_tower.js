// Void Tower rebalance (R8): gear at 1.11, bosses x400 / 45 s, indexFloor, legacy floor rebase.
// Run: node test_tower.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { MarketSystem } from './js/systems/MarketSystem.js';
import {
  CombatSystem, combatFloorScale, gearFloorScale, getIndexFloor,
  BOSS_HP_MULT, BOSS_TIMER_SECONDS, GEAR_FLOOR_BASE, MONSTER_FLOOR_BASE, COMBAT_SCALE_MAX_EXP,
  WARDEN_INTERVAL, WARDEN_HP_MULT, WARDEN_TIMER_SECONDS, WARDEN_TROPHY_GOLD, WARDEN_NAMES,
  getWardenName, isWardenFloorNumber
} from './js/systems/CombatSystem.js';
import { migrateSave, SAVE_VERSION } from './js/engine/migrations.js';
import { particles } from './js/engine/ParticleEngine.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;

const clone = o => JSON.parse(JSON.stringify(o));
const close = (a, b, rel = 1e-9) => assert.ok(Math.abs(a - b) <= rel * Math.abs(b), `${a} != ${b}`);

// Runs `fn` with Math.random returning the given values in turn (then the last one for ever)
function withRandom(values, fn) {
  const orig = Math.random;
  let i = 0;
  Math.random = () => values[Math.min(i++, values.length - 1)];
  try { return fn(); } finally { Math.random = orig; }
}

console.log('--- Scaling: gear rolls at 1.11, monsters stay at 1.12 ---');
{
  assert.equal(MONSTER_FLOOR_BASE, 1.12);
  assert.equal(GEAR_FLOOR_BASE, 1.11);
  assert.equal(gearFloorScale(1), 1);
  close(gearFloorScale(101), Math.pow(1.11, 100));
  close(combatFloorScale(101), Math.pow(1.12, 100));
  // Gear lags monsters by (1.11/1.12)^(f-1): ~0.41 at floor 100, ~0.011 at floor 500
  close(gearFloorScale(500) / combatFloorScale(500), Math.pow(1.11 / 1.12, 499));
  // Both stay finite at absurd floors (cap at exponent 6000)
  for (const f of [6001, 700000, 1e12]) {
    assert.ok(Number.isFinite(gearFloorScale(f)) && Number.isFinite(combatFloorScale(f) * BOSS_HP_MULT));
  }
  assert.equal(gearFloorScale(700000), Math.pow(1.11, COMBAT_SCALE_MAX_EXP));
}

console.log('--- Bosses: x400 HP, 45 s timer ---');
{
  assert.equal(BOSS_HP_MULT, 400);
  assert.equal(BOSS_TIMER_SECONDS, 45);
  const gs = new GameState();
  const cs = new CombatSystem(gs);
  gs.hero.floor = 10;
  cs.initMonster();
  assert.ok(cs.monster.isBoss);
  assert.equal(cs.monster.maxHp, Math.floor(400 * Math.pow(1.12, 9)));
  assert.equal(cs.monster.attack, Math.floor(15 * Math.pow(1.12, 9)));
  assert.equal(cs.monster.timer, 45);
  assert.equal(cs.monster.maxTimer, 45);
  gs.hero.floor = 11;
  cs.initMonster();
  assert.ok(!cs.monster.isBoss);
  assert.equal(cs.monster.maxHp, Math.floor(60 * Math.pow(1.12, 10)));
  assert.equal(cs.monster.timer, 0);

  // Timer runs out at 45 s, not 30: the boss is still up after 44 s and gone after 46 s
  gs.hero.floor = 10;
  cs.initMonster();
  cs.getTotalAttack = () => 1; // can't kill it
  gs.hero.hp = 1e12; gs.hero.maxHp = 1e12; // can't die either
  for (let t = 0; t < 44; t += 0.25) cs.update(0.25);
  assert.ok(cs.monster.isBoss && gs.hero.floor === 10, 'boss still up at 44 s');
  for (let t = 0; t < 2; t += 0.25) cs.update(0.25);
  assert.equal(gs.hero.floor, 9, 'timeout retreats one floor');
}

console.log('--- Loot: weapon and armor roll on the 1.11 curve ---');
{
  const gs = new GameState();
  const cs = new CombatSystem(gs);
  // drop roll, slot (0 -> weapon), rarity (0 -> Common), material roll
  withRandom([0, 0, 0, 0.99], () => cs.rollLoot(101, false));
  assert.equal(gs.hero.gear.weapon.attack, Math.floor(10 * Math.pow(1.11, 100)));
  // slot 0.3 -> armor; rarity 99.5 -> Cosmic (x18)
  withRandom([0, 0.3, 0.995, 0.99], () => cs.rollLoot(201, false));
  assert.equal(gs.hero.gear.armor.rarity, 'Cosmic');
  assert.equal(gs.hero.gear.armor.hp, Math.floor(40 * 18 * Math.pow(1.11, 200)));
}

console.log('--- indexFloor follows the climb; the Market Index reads it ---');
{
  const gs = new GameState();
  const cs = new CombatSystem(gs);
  const ms = new MarketSystem(gs);
  gs.marketSystem = ms;
  assert.equal(gs.hero.indexFloor, 1, 'new heroes start with indexFloor 1');
  for (let i = 0; i < 5; i++) withRandom([0.99], () => cs.onMonsterDefeated());
  assert.equal(gs.hero.floor, 6);
  assert.equal(gs.hero.maxFloor, 6);
  assert.equal(gs.hero.indexFloor, 6);
  assert.equal(ms.getMarketIndex().toString(), new BigNum(1.12).pow(5).toString());
  // Retreating never lowers it
  gs.hero.floor = 3;
  cs.initMonster();
  assert.equal(gs.hero.indexFloor, 6);
  // A legacy record above indexFloor does not price the Bazaar
  gs.hero.maxFloor = 700000;
  assert.equal(ms.getMarketIndex().toString(), new BigNum(1.12).pow(5).toString());
  // Same through GameState's own fallback (no MarketSystem linked)
  const gs2 = new GameState();
  gs2.hero = { maxFloor: 700000, indexFloor: 6 };
  assert.equal(gs2.getMarketIndex().toString(), new BigNum(1.12).pow(5).toString());
  // A hero without indexFloor (should not exist after migration) falls back to maxFloor
  assert.equal(getIndexFloor({ maxFloor: 40 }), 40);
  assert.equal(getIndexFloor({ indexFloor: NaN, maxFloor: NaN }), 1);
  assert.equal(getIndexFloor(null), 1);
}

// A v2 (pre-rebalance) hero with gear rolled on the old 1.12 curve
function legacyHero({ floor, maxFloor = floor, gearFloor = floor, rarity = 'Cosmic', forge = 0 }) {
  const mult = { Common: 1, Rare: 2, Epic: 4, Legendary: 8, Cosmic: 18 }[rarity];
  const scale = Math.pow(1.12, Math.min(6000, gearFloor - 1));
  return {
    level: 60, xp: 0, xpNeeded: 1e12, floor, maxFloor, hp: 1e300, maxHp: 100, hpRegen: 3,
    baseAttack: 15, attackCooldown: 0, attackSpeed: 1, shield: 0, aetherForgeLevel: forge,
    gear: {
      weapon: { name: `${rarity} WEAPON`, attack: Math.floor(10 * mult * scale), rarity },
      armor: { name: `${rarity} ARMOR`, hp: Math.floor(40 * mult * scale), rarity },
      amulet: { name: 'Cosmic AMULET', crit: 0.5, rarity: 'Cosmic' },
      relic: { name: 'Cosmic RELIC', lifesteal: 0.3, rarity: 'Cosmic' }
    },
    skills: {
      strike: { name: 'Heavy Strike', cd: 0, maxCd: 4, dmgMult: 2.5 },
      shield: { name: 'Iron Wall', cd: 0, maxCd: 8, shieldAmount: 50 },
      leech: { name: 'Soul Siphon', cd: 0, maxCd: 10, healPercent: 0.25 },
      supernova: { name: 'Supernova', cd: 0, maxCd: 15, dmgMult: 5.0 }
    }
  };
}
const v2Save = hero => ({ version: 2, savedAt: 1750000000000, aether: { m: 1, e: 30 }, gold: { m: 1, e: 46 }, hero });

console.log('--- Migration step 3: gear rescaled to the 1.11 curve ---');
{
  assert.ok(SAVE_VERSION >= 3);
  const data = migrateSave(v2Save(legacyHero({ floor: 300, rarity: 'Legendary' })));
  const w = data.hero.gear.weapon, a = data.hero.gear.armor;
  close(w.attack, 10 * 8 * Math.pow(1.11, 299), 1e-6);
  close(a.hp, 40 * 8 * Math.pow(1.11, 299), 1e-6);
  assert.equal(data.hero.gear.amulet.crit, 0.5, 'amulet and relic are not floor-scaled');
  assert.equal(data.hero.indexFloor, 300);
  assert.equal(data.hero.pendingFloorRebase, true);

  // Starter kit is left alone
  const fresh = legacyHero({ floor: 1 });
  fresh.gear.weapon = { name: 'Rusty Shortsword', attack: 5, rarity: 'Common' };
  fresh.gear.armor = { name: 'Tattered Tunic', hp: 20, rarity: 'Common' };
  const f = migrateSave(v2Save(fresh));
  assert.equal(f.hero.gear.weapon.attack, 5);
  assert.equal(f.hero.gear.armor.hp, 20);

  // No hero, junk gear: nothing throws
  assert.equal(migrateSave({ version: 2 }).hero, undefined);
  const junk = migrateSave({ version: 2, hero: { floor: 'x', gear: { weapon: { attack: NaN }, armor: null } } });
  assert.equal(junk.hero.indexFloor, 1);

  // A v3 save is not migrated again
  const v3 = migrateSave({ version: 3, hero: legacyHero({ floor: 300 }) });
  assert.equal(v3.hero.pendingFloorRebase, undefined);
  assert.equal(v3.hero.gear.weapon.attack, Math.floor(10 * 18 * Math.pow(1.12, 299)));
}

console.log('--- Floor ~700k legacy save: loads, rebases, keeps the record, still plays ---');
{
  const t0 = Date.now();
  const gs = new GameState();
  gs.deserialize(clone(v2Save(legacyHero({ floor: 700000, maxFloor: 723053, forge: 30 }))));
  const cs = new CombatSystem(gs);
  const ms = new MarketSystem(gs);
  gs.combatSystem = cs; gs.marketSystem = ms;
  const h = gs.hero;

  assert.equal(h.maxFloor, 723053, 'the record is kept');
  assert.equal(h.pendingFloorRebase, undefined, 'the flag is consumed');
  assert.ok(Number.isInteger(h.floor) && h.floor >= 1 && h.floor < 700000, `rebased floor ${h.floor}`);
  assert.ok(h.floor < 6001, 'below the monster cap, so the climb has a wall again');
  assert.equal(h.indexFloor, h.floor);
  assert.ok(cs.canClearBossFloor(h.floor), 'the kit clears the rebased floor');
  assert.ok(!cs.canClearBossFloor(h.floor + 1), 'and not the floor above (by the estimate)');
  const M = ms.getMarketIndex();
  assert.ok(M.gt(1) && Number.isFinite(M.e) && Number.isFinite(M.m));
  assert.ok(M.lt(new BigNum(1.12).pow(6000)), `Market Index ${M.toString()} is priced at the rebased floor`);
  assert.ok(Number.isFinite(cs.getTotalAttack()) && Number.isFinite(cs.getTotalMaxHp()));
  assert.equal(h.hp, cs.getTotalMaxHp());

  // Play 30 simulated minutes: no NaN/Infinity, monsters die, the hero is not soft-locked
  const slainBefore = gs.stats.totalMonstersSlain;
  const startFloor = h.floor;
  for (let t = 0; t < 1800; t += 0.25) cs.update(0.25);
  assert.ok(gs.stats.totalMonstersSlain > slainBefore + 100, 'the hero keeps killing monsters');
  for (const v of [h.hp, h.floor, h.indexFloor, cs.monster.hp, cs.monster.maxHp, cs.monster.attack]) {
    assert.ok(Number.isFinite(v), `finite: ${v}`);
  }
  assert.ok(Math.abs(h.floor - startFloor) < 100, 'no runaway climb and no collapse');
  assert.ok(gs.gold.gt(new BigNum(1, 46)) && Number.isFinite(gs.gold.e), 'gold kept and still finite');
  assert.equal(h.maxFloor, 723053);

  // Round trip: the rebase does not run again on the next load
  const out = clone(gs.serialize());
  assert.equal(out.version, SAVE_VERSION);
  const gs2 = new GameState();
  gs2.deserialize(out);
  const cs2 = new CombatSystem(gs2);
  assert.equal(gs2.hero.floor, h.floor);
  assert.equal(gs2.hero.indexFloor, h.indexFloor);
  assert.equal(gs2.hero.gear.weapon.attack, h.gear.weapon.attack);
  assert.ok(cs2.monster);
  assert.ok(Date.now() - t0 < 5000, 'load + 30 min of play is quick');
}

console.log('--- A mid-game legacy save steps down only as far as needed ---');
{
  // Floor 300 on Legendary kit from floor 300: the 1.11 kit is ~15x weaker, so it rebases lower
  const gs = new GameState();
  gs.deserialize(clone(v2Save(legacyHero({ floor: 300, rarity: 'Legendary', forge: 10 }))));
  const cs = new CombatSystem(gs);
  assert.ok(gs.hero.floor >= 1 && gs.hero.floor <= 300);
  assert.equal(gs.hero.maxFloor, 300);
  assert.equal(gs.hero.indexFloor, gs.hero.floor);
  // A save whose kit still clears its floor is not moved
  const gs3 = new GameState();
  gs3.deserialize(clone(v2Save(legacyHero({ floor: 40, gearFloor: 120, forge: 10 }))));
  new CombatSystem(gs3);
  assert.equal(gs3.hero.floor, 40);
  assert.equal(gs3.hero.indexFloor, 40);
}

console.log('--- R18: Wardens every 250 floors (60 s, x3 boss HP) ---');
{
  assert.equal(WARDEN_INTERVAL, 250);
  assert.equal(WARDEN_HP_MULT, 3);
  assert.equal(WARDEN_TIMER_SECONDS, 60);
  assert.ok(isWardenFloorNumber(250) && isWardenFloorNumber(500) && !isWardenFloorNumber(240) && !isWardenFloorNumber(0));
  assert.equal(getWardenName(250), WARDEN_NAMES[0]);
  assert.equal(getWardenName(500), WARDEN_NAMES[1]);
  assert.equal(getWardenName(250 * (WARDEN_NAMES.length + 1)), `${WARDEN_NAMES[0]} II`);

  // Locked (no Transcend yet): floor 250 is an ordinary boss
  const gs = new GameState();
  const cs = new CombatSystem(gs);
  assert.deepEqual(gs.hero.wardens, { defeated: {} });
  assert.equal(cs.isWardensUnlocked(), false);
  gs.hero.floor = 250;
  cs.initMonster();
  assert.ok(cs.monster.isBoss && !cs.monster.isWarden);
  assert.equal(cs.monster.timer, BOSS_TIMER_SECONDS);

  // Stand-in unlock: first Transcend (or the hero.wardensUnlocked hook for the shard tree)
  gs.transcendenceCount = 1;
  assert.equal(cs.isWardensUnlocked(), true);
  gs.transcendenceCount = 0;
  gs.hero.wardensUnlocked = true;
  assert.equal(cs.isWardensUnlocked(), true);
  cs.initMonster();
  assert.ok(cs.monster.isBoss && cs.monster.isWarden);
  assert.equal(cs.monster.name, `🛡️ WARDEN: ${WARDEN_NAMES[0]}`);
  assert.equal(cs.monster.maxHp, Math.floor(400 * 3 * Math.pow(1.12, 249)));
  assert.equal(cs.monster.attack, Math.floor(15 * Math.pow(1.12, 249)));
  assert.equal(cs.monster.timer, 60);
  // Other boss floors stay ordinary bosses
  gs.hero.floor = 260;
  cs.initMonster();
  assert.ok(cs.monster.isBoss && !cs.monster.isWarden && cs.monster.maxHp === Math.floor(400 * Math.pow(1.12, 259)));

  // The 60 s timer: still up at 59 s, a timeout retreats one floor like a boss
  gs.hero.floor = 250;
  cs.initMonster();
  const realAtk = cs.getTotalAttack;
  cs.getTotalAttack = () => 1;
  gs.hero.hp = 1e300; gs.hero.maxHp = 1e300;
  for (let t = 0; t < 59; t += 0.25) cs.update(0.25);
  assert.ok(cs.monster.isWarden && gs.hero.floor === 250, 'Warden still up at 59 s');
  for (let t = 0; t < 2; t += 0.25) cs.update(0.25);
  assert.equal(gs.hero.floor, 249);
  cs.getTotalAttack = realAtk;

  // Kill: trophy, +2% Tower gold, x3 boss gold, 3 cores + 3 tokens, climb continues
  gs.hero.floor = 250;
  cs.initMonster();
  gs.gold = new BigNum(0);
  gs.inventory.voidCores = 0;
  gs.inventory.bossTokens = 0;
  withRandom([0.99], () => cs.dealDamageToMonster(cs.monster.maxHp + 1)); // 0.99: no loot
  assert.ok(cs.isWardenDefeated(250));
  assert.equal(cs.getWardenTrophyCount(), 1);
  close(cs.getWardenGoldMult(), 1 + WARDEN_TROPHY_GOLD);
  assert.equal(gs.hero.floor, 251);
  assert.equal(gs.inventory.voidCores, 2); // loot roll missed, so only the Warden's own +2
  assert.equal(gs.inventory.bossTokens, 2);
  close(gs.gold.toNumber(), Math.floor(Math.pow(1.12, 249) * 50 * 3), 1e-6);

  // The trophy multiplies later Tower gold by 1.02 (an ordinary monster here)
  gs.hero.floor = 251;
  cs.initMonster();
  gs.gold = new BigNum(0);
  withRandom([0.99], () => cs.dealDamageToMonster(cs.monster.maxHp + 1));
  close(gs.gold.toNumber(), Math.floor(Math.pow(1.12, 250) * 10 * 1.02), 1e-6);

  // A second kill of the same Warden gives spoils but no second trophy
  gs.hero.floor = 250;
  cs.initMonster();
  withRandom([0.99], () => cs.dealDamageToMonster(cs.monster.maxHp + 1));
  assert.equal(cs.getWardenTrophyCount(), 1);

  // Trophies persist through a save/load round trip
  const gs2 = new GameState();
  gs2.deserialize(clone(gs.serialize()));
  const cs2 = new CombatSystem(gs2);
  assert.ok(cs2.isWardenDefeated(250));

  // A pre-R18 save (no hero.wardens, no unlock flag) loads with no trophies and no Wardens
  const old = clone(gs.serialize());
  delete old.hero.wardens;
  delete old.hero.wardensUnlocked;
  const gs3 = new GameState();
  gs3.deserialize(old);
  const cs3 = new CombatSystem(gs3);
  assert.deepEqual(gs3.hero.wardens, { defeated: {} });
  assert.equal(cs3.isWardensUnlocked(), false);
  assert.equal(cs3.getWardenGoldMult(), 1);
}

console.log('--- R18: challenging a passed Warden ---');
{
  const gs = new GameState();
  const cs = new CombatSystem(gs);
  gs.hero.floor = 620; gs.hero.maxFloor = 620; gs.hero.indexFloor = 620;
  cs.initMonster();
  // Locked: no challenge
  assert.equal(cs.challengeWarden(250), false);
  gs.transcendenceCount = 1;
  assert.deepEqual(cs.getWardenFloors(), [250, 500, 750]);
  assert.equal(cs.canChallengeWarden(750), false, 'not reached yet');
  assert.equal(cs.canChallengeWarden(260), false, 'not a Warden floor');
  assert.equal(cs.challengeWarden(500), true);
  assert.equal(cs.getFightFloor(), 500);
  assert.ok(cs.monster.isWarden && cs.monster.floor === 500);
  assert.equal(cs.challengeWarden(250), false, 'one challenge at a time');

  // Losing (timeout) costs nothing: the hero stays on his climb floor
  const realAtk = cs.getTotalAttack;
  cs.getTotalAttack = () => 1;
  gs.hero.hp = 1e300; gs.hero.maxHp = 1e300;
  for (let t = 0; t < 61; t += 0.5) cs.update(0.5);
  assert.equal(cs.wardenChallenge, null);
  assert.equal(gs.hero.floor, 620);
  assert.ok(!cs.monster.isWarden && cs.monster.floor === 620);

  // Dying in a challenge doesn't retreat either
  cs.getTotalAttack = realAtk;
  assert.equal(cs.challengeWarden(500), true);
  gs.hero.hp = 1; gs.hero.maxHp = 100; gs.hero.shield = 0;
  cs.monster.attackCooldown = 0;
  cs.update(0.01);
  assert.equal(cs.wardenChallenge, null);
  assert.equal(gs.hero.floor, 620);

  // Winning: trophy, rewards at the Warden's floor, back to floor 620 (no advance)
  assert.equal(cs.challengeWarden(500), true);
  gs.gold = new BigNum(0);
  withRandom([0.99], () => cs.dealDamageToMonster(cs.monster.maxHp + 1));
  assert.ok(cs.isWardenDefeated(500));
  assert.equal(gs.hero.floor, 620);
  assert.equal(gs.hero.maxFloor, 620);
  assert.equal(cs.wardenChallenge, null);
  close(gs.gold.toNumber(), Math.floor(Math.pow(1.12, 499) * 50 * 3), 1e-6);
  assert.equal(cs.canChallengeWarden(500), false, 'trophy already won');

  // Legacy save (maxFloor record 700k, indexFloor ~5.5k): only Wardens up to indexFloor
  gs.hero.maxFloor = 700000; gs.hero.indexFloor = 5500; gs.hero.floor = 5500;
  assert.equal(cs.getWardenFloors().length, 23);
  assert.equal(cs.canChallengeWarden(10000), false);
}

console.log('--- R18: a Warden-unlocked climb still walls (rewards do not restart it) ---');
{
  // Same kit as the R8 open-profile wall (~floor 650): unlocking Wardens must not move the
  // wall up, and trophies only add gold.
  const run = (unlocked) => {
    const gs = new GameState();
    const cs = new CombatSystem(gs);
    gs.hero.wardensUnlocked = unlocked;
    gs.hero.aetherForgeLevel = 25;
    gs.talents.warlord_might = { rank: 10 };
    gs.quartermaster = { hunters_edge: { rank: 15 } };
    let seed = 99;
    const orig = Math.random;
    Math.random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    try { for (let t = 0; t < 4 * 3600; t += 0.25) cs.update(0.25); } finally { Math.random = orig; }
    return gs.hero.maxFloor;
  };
  const off = run(false);
  const on = run(true);
  console.log(`  wall after 4 h: Wardens off ${off}, on ${on}`);
  assert.ok(on <= off, `Wardens on: ${on}, off: ${off}`);
}

console.log('All Tower tests passed.');
