// CL-24: the one tree (js/systems/coreloop/Tree.js, treeMath.js): every node of the old shops and
// trees has a home, buying and resets, each effect in the real systems, and the model
// (sim/redesign) agreeing on what a tree gives.
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { P } from './js/systems/coreloop/params.js';
import { createCoreLoopState, serializeCoreLoop, deserializeCoreLoop } from './js/systems/coreloop/state.js';
import { PRESENCE, FIELD } from './js/systems/coreloop/shared.js';
import * as Tree from './js/systems/coreloop/Tree.js';
import * as M from './js/systems/coreloop/treeMath.js';
import * as Well from './js/systems/coreloop/Well.js';
import * as Fields from './js/systems/coreloop/Fields.js';
import * as Rigs from './js/systems/coreloop/Rigs.js';
import * as Presence from './js/systems/coreloop/Presence.js';
import * as Prestige from './js/systems/coreloop/Prestige.js';
import * as Loop from './js/systems/coreloop/Loop.js';
import {
  newState as simState, wellMult, fieldPower as simFieldPower, rigRate as simRigRate, handRateBase,
  pendingReserves as simPending, maybeNewWell, maybeNewField, maybeChronicle
} from './sim/redesign/model.mjs';
import { PROFILES } from './sim/redesign/profiles.mjs';
import { DUST_SHOP_ITEMS } from './js/systems/DustShopSystem.js';
import { SHARD_TREE_NODES } from './js/systems/ShardTreeSystem.js';
import { TALENT_DEFINITIONS } from './js/systems/TalentTreeSystem.js';
import { PAGE_UPGRADES } from './js/systems/ChronicleSystem.js';
import { QUARTERMASTER_UPGRADES } from './js/systems/BountySystem.js';

const near = (a, b, what) => assert.ok(Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b)), `${what}: ${a} vs ${b}`);
const fill = (state, ring, n = 1e6) => { state.tree.bank[ring] = n; };
// A state with every ring's bank full and everything bought
function maxed() {
  const s = createCoreLoopState();
  for (const ring of Tree.RINGS) fill(s, ring, 1e9);
  Tree.buyAll(s);
  return s;
}

console.log('--- every node of the old shops and trees has a home ---');
{
  const old = [...DUST_SHOP_ITEMS, ...SHARD_TREE_NODES, ...TALENT_DEFINITIONS, ...PAGE_UPGRADES, ...QUARTERMASTER_UPGRADES].map(x => x.id);
  assert.equal(old.length, 59);
  const homes = new Map();
  for (const n of P.tree) for (const id of n.from) { assert.ok(!homes.has(id), `${id} is claimed twice`); homes.set(id, n.id); }
  for (const id of Object.keys(P.treeElsewhere)) { assert.ok(!homes.has(id), `${id} has a node and an elsewhere`); homes.set(id, P.treeElsewhere[id]); }
  assert.deepEqual(old.filter(id => !homes.has(id)), [], 'old nodes with no home in the tree');
  assert.deepEqual([...homes.keys()].filter(id => !old.includes(id)), [], 'the tree names an old node that does not exist');
  // well-formed nodes
  const ids = new Set();
  for (const n of P.tree) {
    assert.ok(!ids.has(n.id), n.id); ids.add(n.id);
    assert.ok(Tree.RINGS.includes(n.ring) && n.cost >= 1 && n.growth >= 1 && n.max >= 1 && n.value > 0 && n.from.length >= 1, n.id);
    if (n.kind === 'flag') assert.ok(/^CL-\d+$/.test(n.pending), `${n.id}: a flag says which item gives it its effect`);
    else assert.equal(n.pending, undefined, `${n.id}: only flags wait for another item`);
    if (n.field !== undefined) assert.ok(['fieldPower', 'rig'].includes(n.kind) && n.field >= 0 && n.field <= 2);
  }
  assert.deepEqual(Tree.RINGS, ['reserves', 'shares', 'pages']);
}

console.log('--- buying: cost, ranks, the bank ---');
{
  const s = createCoreLoopState();
  assert.equal(Tree.canBuy(s, 'kit'), false, 'an empty bank buys nothing');
  assert.equal(Tree.buy(s, 'kit'), false);
  assert.deepEqual(Tree.buyAll(s), []);
  fill(s, 'reserves', 20);
  assert.equal(Tree.cost(s, 'kit'), 5);
  assert.equal(Tree.buy(s, 'kit'), true);
  assert.equal(Tree.rank(s, 'kit'), 1);
  assert.equal(Tree.bank(s, 'reserves'), 15);
  assert.equal(Tree.cost(s, 'kit'), 15, 'rank 2 costs cost x growth');
  assert.equal(Tree.buy(s, 'kit'), true);
  assert.equal(Tree.bank(s, 'reserves'), 0);
  assert.equal(Tree.cost(s, 'kit'), 45);
  assert.equal(Tree.buy(s, 'kit'), false);
  fill(s, 'reserves', 45); Tree.buy(s, 'kit');
  assert.equal(Tree.rank(s, 'kit'), 3);
  assert.equal(Tree.cost(s, 'kit'), Infinity, 'the top rank');
  assert.equal(Tree.canBuy(s, 'kit'), false);
  assert.equal(Tree.buy(s, 'no_such_node'), false);
  assert.equal(Tree.cost(s, 'no_such_node'), Infinity);
  // a ring's bank only pays for its own ring
  fill(s, 'reserves', 0); fill(s, 'pages', 100);
  assert.equal(Tree.canBuy(s, 'idle_hands'), false);
  assert.equal(Tree.canBuy(s, 'treaty'), true);
  // the UI's list
  const inner = Tree.nodes(s, 'reserves');
  assert.equal(inner.length, P.tree.filter(n => n.ring === 'reserves').length);
  assert.deepEqual(inner.find(n => n.id === 'kit'), { id: 'kit', ring: 'reserves', kind: 'startKit', field: undefined, value: 10, max: 3, rank: 3, cost: Infinity, canBuy: false, pending: null, from: ['genesis', 'resonant_start'] });
  assert.equal(inner.find(n => n.id === 'wakeel').pending, 'CL-21');
  // buyAll takes the cheapest first and stops when nothing is affordable
  const t = createCoreLoopState(); fill(t, 'shares', 4);
  assert.equal(Tree.buyAll(t).length, 4);
  assert.equal(Tree.bank(t, 'shares'), 0);
  const all = maxed();
  for (const n of P.tree) assert.equal(Tree.rank(all, n.id), n.max, `${n.id} maxed`);
}

console.log('--- each effect, in the system that reads it ---');
{
  const base = createCoreLoopState(), s = maxed();
  for (const st of [base, s]) {
    st.fields.forEach((f, i) => { Rigs.build(st, i); f.frontier = 30; });
    st.well.bought[1] = 1; st.well.amount[1] = new BigNum(1);
  }
  const sum = (kind, field) => P.tree.filter(n => n.kind === kind && (n.field === undefined || n.field === field)).reduce((x, n) => x + n.value * n.max, 0);
  assert.equal(Tree.bonus(base, 'crude'), 1);
  assert.equal(Tree.bonus(base, 'offlineHours'), 0);
  near(Tree.bonus(s, 'crude'), 1 + sum('crude'), 'crude');
  // Well
  near(Well.crudePerSecond(s, PRESENCE.WATCH).toNumber() / Well.crudePerSecond(base, PRESENCE.WATCH).toNumber(), 1 + sum('crude'), 'Crude while Watching');
  near(Well.crudePerSecond(s, PRESENCE.AWAY).toNumber() / Well.crudePerSecond(s, PRESENCE.WATCH).toNumber(), Math.min(1, P.awayWell * (1 + sum('awayWell'))), 'the Away Well rate, never above Watching');
  s.presence.heatSeconds = 1e9; base.presence.heatSeconds = 1e9;
  near(Well.crudePerSecond(s, PRESENCE.HANDS).toNumber() / Well.crudePerSecond(s, PRESENCE.WATCH).toNumber(), 1 + P.handsWell + sum('handsWell'), 'the Hands-on Well bonus at full Heat');
  // Heat ramps faster
  s.presence.heatSeconds = 20; base.presence.heatSeconds = 20;
  near(Presence.heat(base), 1 + 20 / P.heatRamp, 'Heat without the tree');
  near(Presence.heat(s), 1 + Math.min(1, 20 * (1 + sum('heat')) / P.heatRamp), 'Heat with it');
  // Gushers: more often, up for longer
  near(Presence.gusherInterval(s), P.gusherEvery / (1 + sum('gusherRate')), 'Gusher interval');
  assert.equal(Presence.gusherWindow(base), P.gusherWindow);
  assert.equal(Presence.gusherWindow(s), P.gusherWindow + sum('gusherWindow'));
  // Fields and Rigs, per Field
  for (const i of [FIELD.TOWER, FIELD.MINE, FIELD.OASIS]) {
    near(Fields.fieldPower(s, i, PRESENCE.WATCH) / Fields.fieldPower(base, i, PRESENCE.WATCH), 1 + sum('fieldPower', i), `Field power ${i}`);
    near(Rigs.rigRate(s, i, PRESENCE.WATCH) / Rigs.rigRate(base, i, PRESENCE.WATCH), 1 + sum('rig', i), `Rig rate ${i}`);
    near(Rigs.rigRate(s, i, PRESENCE.AWAY) / Rigs.rigRate(s, i, PRESENCE.WATCH), P.away, 'Away stays the same share of Watching');
  }
  assert.ok(1 + sum('fieldPower', 0) > 1 + sum('fieldPower', 1), 'the Tower has the most power nodes');
  // Reserves
  for (const st of [base, s]) st.well.runCrude = new BigNum(1, 30);
  assert.equal(Prestige.pendingReserves(s), Math.floor(Prestige.pendingReserves(base) * (1 + sum('reserves')) + 1e-9));
  // time away
  assert.equal(Loop.settleAway(base, 1e9).seconds, P.offlineMaxHours * 3600);
  const away = Loop.settleAway(s, 1e9);
  assert.equal(away.capHours, P.offlineMaxHours + sum('offlineHours'));
  assert.equal(away.seconds, away.capHours * 3600);
  // flags
  assert.equal(Tree.has(base, 'wakeel'), false);
  assert.equal(Tree.has(s, 'wakeel'), true);
}

console.log('--- the rings: what a New Well, a New Field and a Chronicle do ---');
{
  const s = createCoreLoopState();
  // a New Well banks its Reserves; the kit and kept Pressure apply from the next one
  s.t = 700; s.well.runCrude = new BigNum(1, 12); s.well.pressure = 9; s.well.pressureBest = 9;
  const gained = Prestige.pendingReserves(s);
  assert.equal(Prestige.newWell(s), true);
  assert.equal(Tree.bank(s, 'reserves'), gained);
  assert.equal(s.prestige.reserves, gained, 'the multiplier counts what was earned, spent or not');
  assert.equal(s.well.pressure, 0);
  fill(s, 'reserves', 1000);
  Tree.buy(s, 'kit'); Tree.buy(s, 'memory'); Tree.buy(s, 'titan');
  assert.equal(s.prestige.reserves, gained, 'buying does not lower the multiplier');
  s.t = 2000; s.well.runCrude = new BigNum(1, 20); s.well.pressure = 9; s.well.bought[1] = 20; s.well.amount[1] = new BigNum(5000);
  assert.equal(Prestige.newWell(s), true);
  assert.equal(s.well.pressure, 4, 'half the Pressure kept (rounded down)');
  assert.equal(s.well.amount[1].toNumber(), 10, 'a kit of 10 slot 1 units');
  assert.equal(s.well.bought[1], 0, 'owned, not bought: the price starts over');
  assert.equal(Well.topSlot(s), 0);
  // a New Field banks Shares and empties the inner ring
  Tree.buy(s, 'memory');
  s.well.bestRunChron = new BigNum(1, 50);
  assert.equal(Prestige.newField(s, { kind: 'rig', field: 0 }), true);
  assert.equal(Tree.bank(s, 'shares'), P.sharesPerField);
  assert.equal(Tree.bank(s, 'reserves'), 0);
  for (const id of ['kit', 'memory', 'titan']) assert.equal(Tree.rank(s, id), 0, `${id} reset by the New Field`);
  assert.equal(s.well.amount[1].m, 0, 'no kit after a New Field');
  // a Chronicle banks Pages, empties the middle ring, keeps the outer
  Tree.buy(s, 'foundry'); Tree.buy(s, 'grip');
  fill(s, 'pages', 30); Tree.buy(s, 'ink'); Tree.buy(s, 'gilded'); Tree.buy(s, 'treaty');
  const pagesBank = Tree.bank(s, 'pages');
  s.prestige.newFields = 8; s.well.bestRunChron = new BigNum(1, 90);
  const pages = Prestige.pendingPages(s);
  assert.equal(Prestige.chronicle(s), true);
  assert.equal(s.prestige.pages, pages, 'the extra Page is for the tree, not the multiplier');
  assert.equal(Tree.bank(s, 'pages'), pagesBank + pages + 1);
  assert.equal(s.prestige.shares, Math.floor(pages * P.startSharesPerPage) + 1, 're-blaze plus the tree\'s starting Share');
  assert.equal(Tree.bank(s, 'shares'), 0, 're-blaze Shares are not for spending');
  assert.equal(Tree.rank(s, 'foundry'), 0);
  assert.equal(Tree.rank(s, 'grip'), 0);
  assert.deepEqual([Tree.rank(s, 'ink'), Tree.rank(s, 'gilded'), Tree.rank(s, 'treaty')], [1, 1, 1], 'the outer ring is never reset');
}

console.log('--- the model agrees: the same tree gives the same numbers ---');
{
  const sim = simState(PROFILES.casual, 1), g = createCoreLoopState();
  sim.charter = 'none';
  for (const ring of Tree.RINGS) { sim.tree.bank[ring] = 1e9; fill(g, ring, 1e9); }
  assert.deepEqual(M.buyAffordable(sim.tree), Tree.buyAll(g), 'the policy buys the same nodes in the same order');
  sim.fields.forEach((f, i) => { f.rig = 2 + i; f.F = 40; g.fields[i].rig = 2 + i; g.fields[i].frontier = 40; });
  sim.b[1] = 10; sim.a[1] = 500; g.well.bought[1] = 10; g.well.amount[1] = new BigNum(500);
  sim.runCrude = 1e40; g.well.runCrude = new BigNum(1, 40);
  sim.heatT = 25; g.presence.heatSeconds = 25;
  for (const [st, pr] of [['watch', PRESENCE.WATCH], ['hands', PRESENCE.HANDS], ['away', PRESENCE.AWAY]]) {
    near(Well.wellMultiplier(g, pr).toNumber(), wellMult(sim, st), `Well multiplier ${st}`);
    for (let i = 0; i < 3; i++) {
      near(Rigs.rigRate(g, i, pr), simRigRate(sim, i, st), `Rig rate ${i} ${st}`);
      near(Fields.fieldPower(g, i, pr), simFieldPower(sim, i, st), `Field power ${i} ${st}`);
    }
  }
  near(Rigs.handRate(g), handRateBase(sim), 'hand rate');
  assert.equal(Prestige.pendingReserves(g), simPending(sim));
  // and the three resets move the banks and rings the same way
  const same = (what) => {
    assert.deepEqual(g.tree.bank, sim.tree.bank, `${what}: banks`);
    assert.deepEqual(g.tree.ranks, sim.tree.ranks, `${what}: ranks`);
    assert.deepEqual([g.well.pressure, g.well.amount[1].toNumber(), g.prestige.shares, g.prestige.pages], [sim.pressure, sim.a[1], sim.shares, sim.pages], what);
  };
  sim.t = g.t = 5000; sim.pressure = g.well.pressure = 7;
  assert.equal(maybeNewWell(sim), true); assert.equal(Prestige.newWell(g), true); same('New Well');
  sim.bestRunChron = 1e60; g.well.bestRunChron = new BigNum(1, 60);
  const choice = Prestige.suggestedChoice(g);
  assert.equal(maybeNewField(sim), true); assert.equal(Prestige.newField(g, choice), true); same('New Field');
  sim.newFields = g.prestige.newFields = 9; sim.bestRunChron = 1e99; g.well.bestRunChron = new BigNum(1, 99);
  assert.equal(maybeChronicle(sim), true); assert.equal(Prestige.chronicle(g), true); same('Chronicle');
}

console.log('--- the tree survives a save; a bad save is cleaned ---');
{
  const s = createCoreLoopState();
  fill(s, 'reserves', 500); fill(s, 'shares', 7); fill(s, 'pages', 9);
  Tree.buy(s, 'kit'); Tree.buy(s, 'foundry'); Tree.buy(s, 'foundry'); Tree.buy(s, 'treaty');
  const back = deserializeCoreLoop(JSON.parse(JSON.stringify(serializeCoreLoop(s))));
  assert.deepEqual(back.tree, s.tree);
  assert.equal(Tree.bonus(back, 'crude'), Tree.bonus(s, 'crude'));
  assert.deepEqual(deserializeCoreLoop({}).tree, { bank: { reserves: 0, shares: 0, pages: 0 }, ranks: {} }, 'a save from before the tree');
  const bad = deserializeCoreLoop({ tree: { bank: { reserves: -5, shares: 'x', pages: 2.9 }, ranks: { kit: 99, nope: 3, foundry: -1, treaty: 'two' } } });
  assert.deepEqual(bad.tree, { bank: { reserves: 0, shares: 0, pages: 2 }, ranks: { kit: 3 } });
  assert.deepEqual(deserializeCoreLoop({ tree: 'x' }).tree.ranks, {});
}

console.log('test_cl_tree.js OK');
