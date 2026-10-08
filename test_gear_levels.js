// Gear levels (R34): stat math, costs, level carry-over on a better drop, save defaults.
// Run: node test_gear_levels.js
import assert from 'node:assert/strict';
import { GameState } from './js/systems/GameState.js';
import {
  CombatSystem, GEAR_LEVEL_MAX, GEAR_LEVEL_STEP, GEAR_SLOTS,
  getGearLevel, gearLevelMult, gearLevelCost, gearStat
} from './js/systems/CombatSystem.js';
import { particles } from './js/engine/ParticleEngine.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;

const fresh = () => {
  const gs = new GameState();
  const cs = new CombatSystem(gs);
  gs.combatSystem = cs;
  return { gs, cs, h: gs.hero };
};

// --- pure math ---
assert.equal(getGearLevel(undefined), 0);
assert.equal(getGearLevel({}), 0, 'no level field reads as 0');
assert.equal(getGearLevel({ level: 'junk' }), 0);
assert.equal(getGearLevel({ level: -3 }), 0);
assert.equal(getGearLevel({ level: 7.9 }), 7);
assert.equal(getGearLevel({ level: 999 }), GEAR_LEVEL_MAX);
assert.equal(gearLevelMult(0), 1);
assert.ok(Math.abs(gearLevelMult(10) - (1 + 10 * GEAR_LEVEL_STEP)) < 1e-12);
assert.equal(gearLevelMult(GEAR_LEVEL_MAX + 5), gearLevelMult(GEAR_LEVEL_MAX), 'mult capped at max level');
assert.deepEqual([0, 1, 2, 29].map(gearLevelCost), [10, 20, 30, 300]);
let total = 0;
for (let l = 0; l < GEAR_LEVEL_MAX; l++) total += gearLevelCost(l);
assert.equal(total, 4650, '+0 to +30 costs 4,650 Monster Bones per slot');

assert.equal(gearStat('weapon', { attack: 100 }), 100);
assert.ok(Math.abs(gearStat('weapon', { attack: 100, level: 5 }) - 100 * (1 + 5 * GEAR_LEVEL_STEP)) < 1e-9);
assert.ok(Math.abs(gearStat('armor', { hp: 40, level: 10 }) - 40 * (1 + 10 * GEAR_LEVEL_STEP)) < 1e-9);
assert.equal(gearStat('amulet', { crit: 0.49, level: 30 }), 0.5, 'Crit keeps its 50% cap');
assert.equal(gearStat('relic', { lifesteal: 0.29, level: 30 }), 0.3, 'Drain keeps its 30% cap');
assert.equal(gearStat('weapon', null), 0);

// --- hero stats use the level ---
{
  const { gs, cs, h } = fresh();
  const atk0 = cs.getTotalAttack();
  const hp0 = cs.getTotalMaxHp();
  h.gear.weapon = { name: 'W', attack: 1000, rarity: 'Common', level: 0 };
  h.gear.armor = { name: 'A', hp: 1000, rarity: 'Common', level: 0 };
  const atkBase = cs.getTotalAttack();
  const hpBase = cs.getTotalMaxHp();
  assert.ok(atkBase > atk0 && hpBase > hp0);
  h.gear.weapon.level = 10;
  h.gear.armor.level = 10;
  assert.equal(cs.getTotalAttack() - atkBase, Math.floor(1000 * 10 * GEAR_LEVEL_STEP), 'weapon level adds % of weapon Attack');
  assert.equal(cs.getTotalMaxHp() - hpBase, Math.floor(1000 * 10 * GEAR_LEVEL_STEP), 'armor level adds % of armor HP');
  void gs;
}

// --- buying levels ---
{
  const { gs, cs, h } = fresh();
  gs.inventory.monsterBones = 25;
  assert.equal(cs.getGearLevelInfo('weapon').blocked, null);
  assert.ok(cs.levelUpGear('weapon'));
  assert.equal(h.gear.weapon.level, 1);
  assert.equal(gs.inventory.monsterBones, 15);
  assert.equal(cs.getGearLevelInfo('weapon').blocked, 'cost', 'next level costs 20, only 15 left');
  assert.equal(cs.levelUpGear('weapon'), false);
  assert.equal(gs.inventory.monsterBones, 15, 'a failed level-up costs nothing');

  h.gear.armor.level = GEAR_LEVEL_MAX;
  gs.inventory.monsterBones = 1e6;
  assert.equal(cs.getGearLevelInfo('armor').blocked, 'max');
  assert.equal(cs.levelUpGear('armor'), false);

  h.gear.amulet = { name: 'Am', crit: 0.5, rarity: 'Cosmic', level: 0 };
  assert.equal(cs.getGearLevelInfo('amulet').blocked, 'capped', "Crit already at cap: don't sell a useless level");
  delete h.gear.relic;
  assert.equal(cs.getGearLevelInfo('relic').blocked, 'empty');
}

// --- equipping a better item keeps the slot's level (the level belongs to the slot) ---
{
  const { gs, cs, h } = fresh();
  for (const s of GEAR_SLOTS) if (h.gear[s]) h.gear[s].level = 6;
  const seq = [0, 0.99, 0]; // drop roll passes, Common rarity, slot 0 = weapon
  let i = 0;
  const realRandom = Math.random;
  Math.random = () => (i < seq.length ? seq[i++] : 0.99);
  try { cs.rollLoot(200, false); } finally { Math.random = realRandom; }
  assert.equal(h.gear.weapon.name, 'Rusty Shortsword', 'a drop waits in the bag until the player equips it');
  const drop = gs.bag.items.find(x => x.slot === 'weapon' && x.ilvl === 200);
  assert.ok(drop, 'the floor-200 weapon is in the bag');
  assert.ok(cs.gear.equip(drop.uid));
  assert.notEqual(h.gear.weapon.name, 'Rusty Shortsword', 'the floor-200 drop replaced the starter weapon');
  assert.equal(h.gear.weapon.level, 6, 'new weapon kept +6');
  assert.equal(gs.bag.items.some(x => x.name === 'Rusty Shortsword'), true, 'the old weapon went to the bag');
}

// --- save defaults: an old save with no gear levels loads at +0 ---
{
  const { gs } = fresh();
  const data = JSON.parse(JSON.stringify(gs.serialize()));
  for (const s of GEAR_SLOTS) delete data.hero.gear[s].level;
  data.hero.gear.weapon.level = 'bad';
  const gs2 = new GameState();
  gs2.deserialize(data);
  for (const s of GEAR_SLOTS) assert.equal(gs2.hero.gear[s].level, 0, `${s} loads at +0`);
  const cs2 = new CombatSystem(gs2);
  assert.equal(cs2.getGearLevelInfo('weapon').level, 0);

  // and a levelled save round-trips
  gs2.hero.gear.armor.level = 12;
  const gs3 = new GameState();
  gs3.deserialize(JSON.parse(JSON.stringify(gs2.serialize())));
  assert.equal(gs3.hero.gear.armor.level, 12);
}

console.log('test_gear_levels: OK');
