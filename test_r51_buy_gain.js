// R51: generator buy gain and Best value pick. Run: node test_r51_buy_gain.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { BuildingSystem, BUILDING_DEFINITIONS } from './js/systems/BuildingSystem.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
const mk = () => { const gs = new GameState(); const bs = new BuildingSystem(gs); return { gs, bs }; };
const close = (a, b) => assert.ok(Math.abs(a.toNumber() - b.toNumber()) <= 1e-9 * Math.max(1, Math.abs(b.toNumber())), `${a.format()} vs ${b.format()}`);

{ // gain = production(after) - production(before), via the real buy
  const { gs, bs } = mk();
  const id = BUILDING_DEFINITIONS[0].id;
  gs.aether = new BigNum(1e12);
  bs.buyAmount = 10;
  const before = bs.getBuildingProduction(id);
  const gain = bs.getBuyGain(id, 10);
  bs.buyBuilding(id);
  close(bs.getBuildingProduction(id).sub(before), gain);
}
{ // crossing a milestone shows the jump
  const { gs, bs } = mk();
  const id = BUILDING_DEFINITIONS[0].id;
  gs.buildings[id].count = 9;
  const jump = bs.getBuyGain(id, 1);
  const plain = bs.getBuyGain(id, 1);
  assert.ok(jump.gt(BUILDING_DEFINITIONS[0].baseCps.mul(1.5)), 'milestone jump bigger than one unit');
  gs.buildings[id].count = 20;
  assert.ok(bs.getBuyGain(id, 1).lt(jump));
  assert.ok(plain.gt(0));
}
{ // best value: none when unaffordable, ignores locked tiers, ties to lower tier
  const { gs, bs } = mk();
  bs.buyAmount = 1;
  gs.aether = BigNum.zero();
  assert.equal(bs.getBestValueId(), null);
  gs.aether = new BigNum(1e30);
  const best = bs.getBestValueId();
  assert.ok(best && bs.isTierUnlocked(best));
  const { cost } = bs.getBuyPlan(best);
  assert.ok(gs.aether.gte(cost));
  const ratio = (id) => { const p = bs.getBuyPlan(id); return bs.getBuyGain(id, p.count).div(p.cost).toNumber(); };
  for (const d of BUILDING_DEFINITIONS) {
    if (!bs.isTierUnlocked(d.id) || gs.aether.lt(bs.getBuyPlan(d.id).cost)) continue;
    assert.ok(ratio(best) >= ratio(d.id));
  }
  // MAX with nothing affordable falls back to one and still gives a gain
  bs.buyAmount = 'max';
  gs.aether = BigNum.zero();
  assert.equal(bs.getBuyPlan(BUILDING_DEFINITIONS[0].id).count, 1);
  assert.equal(bs.getBestValueId(), null);
}
console.log('r51 buy gain: ok');
