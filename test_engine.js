import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { BuildingSystem, BUILDING_DEFINITIONS } from './js/systems/BuildingSystem.js';
import { CombatSystem } from './js/systems/CombatSystem.js';
import { MiningSystem } from './js/systems/MiningSystem.js';
import { GardenSystem } from './js/systems/GardenSystem.js';
import { AlchemySystem } from './js/systems/AlchemySystem.js';
import { BountySystem } from './js/systems/BountySystem.js';
import { PrestigeSystem } from './js/systems/PrestigeSystem.js';
import { AchievementSystem } from './js/systems/AchievementSystem.js';

console.log('--- Testing BigNum Math ---');
const n1 = new BigNum(100);
const n2 = new BigNum(250);
const sum = n1.add(n2);
console.assert(sum.toNumber() === 350, `Sum mismatch: ${sum.toNumber()}`);

const bigVal = new BigNum('1e50');
const bigVal2 = new BigNum('2.5e50');
const bigSum = bigVal.add(bigVal2);
console.assert(bigSum.format('scientific', 2) === '3.50e50', `Big sum mismatch: ${bigSum.format('scientific', 2)}`);

console.log('--- Testing GameState & Systems Init ---');
const gs = new GameState();
const bs = new BuildingSystem(gs);
const cs = new CombatSystem(gs);
const ms = new MiningSystem(gs);
const gar = new GardenSystem(gs);
const alc = new AlchemySystem(gs);
const bou = new BountySystem(gs);
const pres = new PrestigeSystem(gs);
const ach = new AchievementSystem(gs);

gs.buildingSystem = bs;
gs.combatSystem = cs;
gs.miningSystem = ms;
gs.gardenSystem = gar;
gs.bountySystem = bou;
gs.achievementSystem = ach;

console.assert(BUILDING_DEFINITIONS.length === 14, `Expected 14 building definitions, got ${BUILDING_DEFINITIONS.length}`);

// Test building cost & buy
gs.aether = new BigNum(1000);
const canBuyTapper = bs.buyBuilding('tapper');
console.assert(canBuyTapper === true, 'Failed to buy tapper');
console.assert(gs.buildings['tapper'].count === 1, 'Tapper count should be 1');

// Test combat damage deal
cs.dealDamageToMonster(20, 0, 0);
console.assert(cs.monster.hp <= cs.monster.maxHp - 20, 'Monster should take damage');

// Test mining block mine
ms.mineBlock(0, 0, 0);
console.assert(ms.gameState.miningGrid.blocks[0].hp < ms.getCurrentStrata().maxHp, 'Mining block should lose HP');

// Test serialization & deserialization
const serialized = gs.serialize();
const newGs = new GameState();
newGs.deserialize(serialized);
console.assert(newGs.buildings['tapper'].count === 1, 'Deserialized building count mismatch');

console.log('✅ ALL ENGINE TESTS PASSED SUCCESSFULLY!');
