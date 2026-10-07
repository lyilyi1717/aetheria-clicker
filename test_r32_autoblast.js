// R32: Auto-Blast (shard tree node) throws the Excavation dynamite whenever it is ready, with an
// on/off switch that is saved; and the retuned pickaxe cost.
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { MiningSystem, getBlastArea, DYNAMITE_COOLDOWN, PICKAXE_COST_BASE, PICKAXE_COST_GROWTH } from './js/systems/MiningSystem.js';
import {
  getNode, buyNode, hasAutoBlast, isAutoBlastOn, setAutoBlastEnabled,
  sanitizeShardTreeState, defaultShardTreeState
} from './js/systems/ShardTreeSystem.js';

console.log('--- R32: Auto-Blast node ---');
const node = getNode('chronos_auto_blast');
assert.ok(node, 'node exists');
assert.equal(node.branch, 'chronos');
assert.equal(node.cost, 1);
assert.deepEqual(node.requires, []);
assert.deepEqual(defaultShardTreeState().autoBlast, { enabled: true });

{
  const gs = new GameState();
  assert.equal(hasAutoBlast(gs), false);
  assert.equal(buyNode(gs, 'chronos_auto_blast'), false, 'needs a shard');
  gs.fractureShards = new BigNum(1);
  assert.equal(buyNode(gs, 'chronos_auto_blast'), true);
  assert.equal(gs.fractureShards.toNumber(), 0);
  assert.ok(hasAutoBlast(gs) && isAutoBlastOn(gs), 'on by default once bought');
  setAutoBlastEnabled(gs, false);
  assert.equal(isAutoBlastOn(gs), false);

  // Saved, and survives a round trip
  const data = JSON.parse(JSON.stringify(gs.serialize()));
  const gs2 = new GameState();
  gs2.deserialize(data);
  assert.ok(hasAutoBlast(gs2));
  assert.equal(gs2.shardTree.autoBlast.enabled, false);
}

console.log('--- R32: old saves load with the default ---');
{
  // A tree saved before R32 has no autoBlast slice
  const old = { owned: { chronos_auto_ascend: true }, granted: {}, autoAscend: { enabled: true, rule: 'x2', timerMin: 30 }, longWarpAt: 0 };
  const s = sanitizeShardTreeState(old);
  assert.deepEqual(s.autoBlast, { enabled: true });
  assert.equal(s.owned.chronos_auto_blast, undefined, 'not owned for free');
  assert.equal(sanitizeShardTreeState({ autoBlast: 'junk' }).autoBlast.enabled, true);
  assert.equal(sanitizeShardTreeState({ autoBlast: { enabled: false } }).autoBlast.enabled, false);
  // A tree without the slice (e.g. built by hand) counts as on
  const gs = new GameState();
  gs.shardTree = { owned: { chronos_auto_blast: true } };
  assert.equal(isAutoBlastOn(gs), true);
}

console.log('--- R32: Auto-Blast fires on cooldown from MiningSystem.update ---');
function freshMine(own, enabled = true) {
  const gs = new GameState();
  const ms = new MiningSystem(gs);
  // No stairs, so a blast never ends the grid; tough tiles so they survive and can be counted
  gs.miningGrid.blocks.forEach(b => { b.content = 'stone'; b.hp = b.maxHp = 1e12; });
  if (own) gs.shardTree.owned.chronos_auto_blast = true;
  gs.shardTree.autoBlast = { enabled };
  return { gs, ms };
}
const damaged = (gs) => gs.miningGrid.blocks.filter(b => b.hp < b.maxHp).map(b => b.id);

{
  const { gs, ms } = freshMine(false);
  ms.update(0.1);
  assert.equal(ms.dynamiteCooldown, 0, 'no node: nothing thrown');
  assert.deepEqual(damaged(gs), []);
}
{
  const { gs, ms } = freshMine(true, false);
  ms.update(0.1);
  assert.equal(ms.dynamiteCooldown, 0, 'switched off: nothing thrown');
}
{
  const { gs, ms } = freshMine(true);
  ms.update(0.1);
  assert.equal(ms.dynamiteCooldown, DYNAMITE_COOLDOWN, 'thrown at once');
  const hit = damaged(gs);
  assert.ok(hit.length >= 4 && hit.length <= 9);
  // The hit tiles form one clipped 3x3 (the R26 blast area of some centre)
  const fits = hit.some(c => { const area = getBlastArea(c, 6); return area.length === hit.length && hit.every(i => area.includes(i)); });
  assert.ok(fits, `blasted tiles ${hit} are one 3x3 area`);

  // One blast per cooldown: 60 s more gives the throws at 25 and 50 s
  let throws = 0, last = ms.dynamiteCooldown;
  for (let i = 0; i < 600; i++) {
    ms.update(0.1);
    if (ms.dynamiteCooldown > last) throws++;
    last = ms.dynamiteCooldown;
  }
  assert.equal(throws, 2);
}
{
  // Not while the next grid is pending (the old grid is spent)
  const { gs, ms } = freshMine(true);
  ms.descending = true;
  ms.descendTimer = 10;
  ms.update(0.1);
  assert.equal(ms.dynamiteCooldown, 0);
}
{
  // Respects a cooldown already running (e.g. a manual throw)
  const { gs, ms } = freshMine(true);
  ms.dynamiteCooldown = 10;
  ms.update(1);
  assert.equal(ms.dynamiteCooldown, 9);
  assert.deepEqual(damaged(gs), []);
}

console.log('--- R32: pickaxe cost ---');
{
  const ms = new MiningSystem(new GameState());
  assert.equal(PICKAXE_COST_BASE, 100);
  assert.equal(PICKAXE_COST_GROWTH, 1.6);
  for (let L = 1; L <= 40; L++) {
    assert.equal(ms.getPickaxeCost(L), Math.ceil(100 * 1.6 ** L));
    assert.ok(ms.getPickaxeCost(L) > ms.getPickaxeCost(L - 1));
  }
}

console.log('R32 Auto-Blast tests passed');
