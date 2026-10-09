// R68: Auto-Drill and Steam Jackhammer hits roll Shatter, Cleave, Chain and crits like a tap;
// Excavation Frenzy stays manual.
// Run: node test_r68_drill_abilities.js
import assert from 'node:assert/strict';
import { GameState } from './js/systems/GameState.js';
import { MiningSystem, SHATTER_DAMAGE_MULT } from './js/systems/MiningSystem.js';
import { particles } from './js/engine/ParticleEngine.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;

function setup() {
  const gs = new GameState();
  const ms = new MiningSystem(gs);
  ms.generateNewGrid();
  ms.descending = false;
  gs.mana = 0; // no Leyline Overflow
  for (const b of gs.miningGrid.blocks) { b.content = 'stone'; b.revealed = false; b.hp = 1e12; b.maxHp = 1e12; }
  return { gs, ms, blocks: gs.miningGrid.blocks };
}
const damage = (b) => b.maxHp - b.hp;
const only = (ms, skill) => {
  ms.getShatterChance = () => (skill === 'shatter' ? 1 : 0);
  ms.getCleaveChance = () => (skill === 'cleave' ? 1 : 0);
  ms.getChainChance = () => (skill === 'chain' ? 1 : 0);
};

console.log('--- a drill hit can Shatter ---');
{
  const { ms, blocks } = setup();
  only(ms, 'shatter');
  ms.random = () => 0.5; // no crit
  const power = ms.getPickaxePower();
  ms.mineBlock(10);
  assert.equal(damage(blocks[10]), power * SHATTER_DAMAGE_MULT);
}

console.log('--- a drill hit can Cleave ---');
{
  const { ms, blocks } = setup();
  only(ms, 'cleave');
  ms.random = () => 0.5;
  ms.mineBlock(10);
  assert.ok(damage(blocks[9]) > 0 && damage(blocks[11]) > 0, 'both side tiles take cleave damage');
}

console.log('--- a drill hit can Chain ---');
{
  const { ms, blocks } = setup();
  only(ms, 'chain');
  ms.random = () => 0.5;
  ms.mineBlock(10);
  const others = blocks.filter(b => b.id !== 10 && damage(b) > 0).length;
  assert.ok(others >= 2 && others <= 4, `chain hits 2-4 other tiles, got ${others}`);
}

console.log('--- a drill hit can crit ---');
{
  const { ms, blocks } = setup();
  only(ms, 'none');
  ms.random = () => 0.5;
  const power = ms.getPickaxePower();
  ms.mineBlock(10);
  assert.equal(damage(blocks[10]), power, 'no crit at roll 0.5');
  ms.random = () => 0.01; // under the 10% mining crit and the Super-Crit share: a Super-Crit
  ms.mineBlock(11);
  assert.ok(damage(blocks[11]) >= Math.floor(power * 2.5), 'drill crit hits x2.5');
}

console.log('--- the drills in update() roll the techniques ---');
{
  const { gs, ms, blocks } = setup();
  only(ms, 'shatter');
  ms.random = () => 0.5;
  gs.miningGrid.autoDrills = 2; // 1 hit/s
  ms.autoDrillTimer = 0;
  ms.update(1);
  const total = blocks.reduce((s, b) => s + damage(b), 0);
  assert.equal(total, ms.getPickaxePower() * SHATTER_DAMAGE_MULT);
}

console.log('--- Frenzy stays manual: drills neither build the streak nor get x2 ---');
{
  const { ms, blocks } = setup();
  only(ms, 'none');
  ms.random = () => 0.5;
  for (let i = 0; i < 20; i++) ms.mineBlock(10);
  assert.equal(ms.isFrenzyActive(), false);
  assert.equal(ms.digStreak || 0, 0);
  ms.frenzyTimer = 5;
  const power = ms.getPickaxePower();
  ms.mineBlock(12);
  assert.equal(damage(blocks[12]), power, 'a drill hit gets no Frenzy x2');
  ms.mineBlock(13, 100, 100);
  assert.equal(damage(blocks[13]), power * 2, 'a tap in Frenzy still does x2');
}
console.log('R68 OK');
setTimeout(() => process.exit(0), 0);
