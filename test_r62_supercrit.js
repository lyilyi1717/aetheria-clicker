// R62: Super-Crits (Refinery click, 5x) and the mining shockwave (Super-Crit hit) really trigger.
// Run: node test_r62_supercrit.js
import assert from 'node:assert/strict';
import { GameState } from './js/systems/GameState.js';
import { MiningSystem, SUPER_CRIT_SHARE as MINE_SHARE } from './js/systems/MiningSystem.js';
import { ClickerSystem, SUPER_CRIT_SHARE as CLICK_SHARE } from './js/systems/ClickerSystem.js';
import { BigNum } from './js/engine/BigNum.js';
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
const lcg = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

console.log('--- mining shockwave fires on Super-Crits only, a share of crits ---');
{
  const gs = new GameState();
  const ms = new MiningSystem(gs);
  ms.generateNewGrid();
  ms.descending = false;
  ms.getShatterChance = () => 0; ms.getCleaveChance = () => 0; ms.getChainChance = () => 0;
  ms.random = lcg(12345);
  const size = ms.gridSize;
  const center = Math.floor(size / 2) * size + Math.floor(size / 2);
  const nb = [center - 1, center + 1, center - size, center + size];
  let shocks = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) {
    for (const idx of [center, ...nb]) {
      const b = gs.miningGrid.blocks[idx];
      b.content = 'stone'; b.revealed = false; b.hp = 1e12; b.maxHp = 1e12;
    }
    ms.mineBlock(center, 100, 100);
    const hit = nb.filter(i2 => gs.miningGrid.blocks[i2].hp < 1e12).length;
    if (hit > 0) { assert.equal(hit, 4, 'shockwave hits all four neighbours'); shocks++; }
  }
  // crit chance 0.10 + 0.05*0.5 = 0.125; a share MINE_SHARE of those are Super-Crits
  const expected = N * 0.125 * MINE_SHARE;
  assert.ok(shocks > expected * 0.6 && shocks < expected * 1.4, `shockwaves ${shocks}, expected ~${expected}`);

  // R68: drill hits (no tap position) crit and shockwave too
  for (const idx of [center, ...nb]) { const b = gs.miningGrid.blocks[idx]; b.revealed = false; b.hp = 1e12; b.maxHp = 1e12; }
  for (let i = 0; i < 500; i++) ms.mineBlock(center);
  assert.ok(nb.every(i2 => gs.miningGrid.blocks[i2].hp < 1e12), 'drill hits shockwave too');
}

console.log('--- Refinery Super-Crits pay 5x (base 3x), and the rate matches the share ---');
{
  const gs = new GameState();
  const base = new BigNum(1000);
  gs.buildingSystem = { getTotalProduction: () => base, getTotalBuildingsCount: () => 0 };
  gs.critChance = 1; // every click is a crit
  const cs = new ClickerSystem(gs, lcg(777));
  const gains = [];
  for (let i = 0; i < 400; i++) {
    cs.clickTokens = 5;
    const before = gs.aether;
    const unit = gs.getClickBase().toNumber();
    cs.handleClick(10, 10);
    gains.push(gs.aether.sub(before).toNumber() / unit);
  }
  // 3x crits vs 5x Super-Crits (any combo bonus is small next to the 1.67x gap)
  const lo = Math.min(...gains);
  const supers = gains.filter(g => g > lo * 1.4).length;
  assert.ok(supers > 0 && supers < gains.length, 'both 3x and 5x crits occur');
  const share = supers / gains.length;
  assert.ok(Math.abs(share - CLICK_SHARE) < 0.08, `super share ${share}`);
  assert.ok(Math.min(...gains.filter(g => g > lo * 1.4)) > 4.9, 'a Super-Crit pays at least 5x');
}
console.log('R62 OK');
