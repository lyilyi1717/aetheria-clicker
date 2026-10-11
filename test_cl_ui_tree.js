// CL-24 view: the upgrade tree (js/ui/coreloop/tree.js). No DOM: the strings (every key has Arabic)
// and the pure helpers each card is built from.
import assert from 'node:assert/strict';
import { P } from './js/systems/coreloop/params.js';
import { createCoreLoopState } from './js/systems/coreloop/state.js';
import * as Tree from './js/systems/coreloop/Tree.js';
import * as V from './js/ui/coreloop/tree.js';
import TEN from './js/i18n/coreloop/tree.en.js';
import TAR from './js/i18n/coreloop/tree.ar.js';
import EN from './js/i18n/en.js';
import AR from './js/i18n/ar.js';
import { t } from './js/i18n/index.js';
import { registerStrings } from './js/i18n/coreloop/index.js';
import SEN from './js/i18n/coreloop/shell.en.js';
import SAR from './js/i18n/coreloop/shell.ar.js';
try { registerStrings(SEN, SAR); } catch { /* the shell registered them */ }

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const ph = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');

console.log('--- strings ---');
eq(Object.keys(TEN).sort(), Object.keys(TAR).sort(), 'keys match in both languages');
for (const k of Object.keys(TEN)) {
  ok(k.startsWith('cl.tree.'), `${k} is under cl.tree.`);
  ok(EN[k] === TEN[k] && AR[k] === TAR[k], `${k} is registered`);
  eq(ph(TAR[k]), ph(TEN[k]), `${k} keeps its placeholders`);
  ok(!/[A-Za-z]{2,}/.test(TAR[k].replace(/\{\w+\}/g, '')), `${k} has no Latin words in Arabic`);
  ok(!/aether/i.test(TEN[k]), `${k} does not use the banned word`);
}
ok(P.tree.length === 38, '38 nodes');
for (const n of P.tree) {
  ok(typeof TEN[`cl.tree.node.${n.id}`] === 'string', `${n.id} has a name`);
  ok(typeof TEN[`cl.tree.fx.${n.kind}`] === 'string', `${n.kind} has an effect line`);
  const line = V.effectLine(t, n);
  ok(line && !/\{|undefined|NaN/.test(line), `${n.id} effect line reads: ${line}`);
}
eq(V.effectLine(t, P.tree.find(n => n.id === 'amplifier')), '+10% Reserves from every New Well, each rank', 'amplifier line');
ok(/Mine/.test(V.effectLine(t, P.tree.find(n => n.id === 'miner'))), 'a Field node names its Field');
ok(/hours longer/.test(V.effectLine(t, P.tree.find(n => n.id === 'vault'))), 'vault line');

console.log('--- which rings show ---');
const fresh = () => createCoreLoopState();
let s = fresh();
eq(V.ringsShown(s), { shown: [], next: 'reserves' }, 'a fresh save shows no ring');
s.prestige.wells = 1; s.tree.bank.reserves = 5;
eq(V.ringsShown(s), { shown: ['reserves'], next: 'shares' }, 'first New Well: one ring, Shares coming');
s.tree.bank.reserves = 0; s.prestige.reserves = 5;
eq(V.ringsShown(s).shown, ['reserves'], 'an empty bank that once held Reserves still shows');
s.prestige.totalFields = 1;
eq(V.ringsShown(s), { shown: ['reserves', 'shares'], next: 'pages' }, 'after a New Field: two rings');
s.prestige.chronicles = 1;
eq(V.ringsShown(s), { shown: ['reserves', 'shares', 'pages'], next: null }, 'late: all three');
s = fresh(); s.tree.ranks = { treaty: 1 };
ok(V.ringsShown(s).shown.includes('pages'), 'a rank alone shows its ring');

console.log('--- node order and flags ---');
s = fresh(); s.prestige.wells = 1; s.tree.bank.reserves = 12;
let views = V.sortNodes(Tree.nodes(s, 'reserves').map(n => V.nodeView(s, n)));
const cheapFirst = views.filter(v => v.can);
ok(cheapFirst.length >= 3, 'with 12 Reserves several nodes can be bought');
ok(views.slice(0, cheapFirst.length).every(v => v.can), 'buyable nodes come first');
ok(cheapFirst.every((v, i) => i === 0 || cheapFirst[i - 1].cost <= v.cost), 'cheapest first');
const flags = views.filter(v => v.flag);
eq(views.slice(-flags.length).map(v => v.id).sort(), flags.map(v => v.id).sort(), 'flags are last');
ok(flags.length === 3 && flags.every(v => !v.can && V.sectionOf(v) === 'later'), 'flags are never buyable and wait under arriving later');
s.tree.bank.reserves = 1000;
ok(V.nodeView(s, Tree.nodes(s, 'reserves').find(n => n.id === 'alchemist')).can === false, 'a flag stays unbuyable with a full bank');
const soon = V.sortNodes(Tree.nodes(fresh(), 'reserves').map(n => V.nodeView(fresh(), n))).filter(v => V.sectionOf(v) === 'soon');
ok(soon.every((v, i) => i === 0 || soon[i - 1].cost <= v.cost), 'saving-up nodes by price');
ok(soon[0].missing === soon[0].cost && soon[0].frac === 0, 'missing and progress of a node with an empty bank');

console.log('--- complete nodes, buying ---');
s = fresh(); s.tree.bank.reserves = 100; s.tree.ranks = { idle_hands: 1 };
const idle = V.nodeView(s, Tree.nodes(s, 'reserves').find(n => n.id === 'idle_hands'));
ok(idle.complete && !idle.can && V.sectionOf(idle) === 'done', 'a node at its top rank is complete');
s = fresh(); s.tree.bank.reserves = 5;
const before = V.sortNodes(Tree.nodes(s, 'reserves').map(n => V.nodeView(s, n))).filter(v => v.can).map(v => v.id);
eq(before, ['kit', 'idle_hands'], '5 Reserves buy the Kit or Idle Hands, nothing else');
ok(!V.buyAllWorthIt(s, 'reserves'), 'buy all is not offered when the bank pays for one node');
const got = V.buyRing(s, 'reserves');
eq(got, ['kit'], 'buy all takes the cheapest first and stops when the bank is empty');
eq(s.tree.bank.reserves, 0, 'the bank counted down');
s = fresh(); s.tree.bank.reserves = 1000;
ok(V.buyAllWorthIt(s, 'reserves'), 'buy all is offered with a full bank');
V.buyRing(s, 'reserves');
ok(!Tree.has(s, 'alchemist') && !Tree.has(s, 'wakeel') && !Tree.has(s, 'leylines'), 'buy all never buys a flag');

console.log('--- nodes that name things not yet met wait under arriving later ---');
{
  const closed = () => false;
  s = fresh(); s.prestige.wells = 1; s.tree.bank.reserves = 1000;
  const view = (id, isOpen) => V.nodeView(s, Tree.nodes(s, 'reserves').find(n => n.id === id), isOpen);
  for (const id of ['covenant', 'drill', 'hourglass']) {
    const v = view(id, closed);
    ok(v.later && !v.can && V.sectionOf(v) === 'later' && v.missing === 0, `${id} waits while its part of the game is closed`);
    const o = view(id, () => true);
    ok(!o.later && o.can && V.sectionOf(o) === 'now', `${id} is buyable once its part is open`);
  }
  eq(V.needsFeature(P.tree.find(n => n.id === 'covenant')), 'fields.rig', 'the Falaj node needs the Rigs');
  eq(V.needsFeature(P.tree.find(n => n.id === 'hourglass')), 'shell.presence', 'Gusher nodes need Gushers');
  ok(view('kit', closed).can && view('idle_hands', closed).can, 'the Kit and Idle Hands name nothing unmet');
  const ids = V.buyRing(s, 'reserves', closed);
  ok(!ids.includes('covenant') && !ids.includes('drill') && !ids.includes('hourglass'), 'buy all skips what has not arrived');
  for (const k of Object.keys(TEN).filter(k => k.startsWith('cl.tree.arrives.'))) ok(TEN[k] && TAR[k], k);
  s = fresh(); s.prestige.reserves = 12;
  eq(V.reserveMult(s), +(1 + P.resPer * 12).toFixed(2), 'the multiplier the keep line names');
  s.tree.bank.reserves = 12;
  const mult = V.reserveMult(s);
  Tree.buy(s, 'kit'); Tree.buy(s, 'idle_hands');
  eq(V.reserveMult(s), mult, 'spending the bank does not change the multiplier it names');
}

console.log('--- the Head Start Kit applies at once to an empty run ---');
{
  s = fresh(); s.tree.bank.reserves = 100;
  const v0 = V.nodeView(s, Tree.nodes(s, 'reserves').find(n => n.id === 'kit'));
  eq(V.kitNote(s, v0), 'now', 'no Buckets: it says it gives them at once');
  ok(Tree.buy(s, 'kit'), 'bought');
  eq(s.well.amount[1].toNumber ? s.well.amount[1].toNumber() : Number(s.well.amount[1]), P.tree.find(n => n.id === 'kit').value, 'the Buckets are in the run now');
  const v1 = V.nodeView(s, Tree.nodes(s, 'reserves').find(n => n.id === 'kit'));
  eq(V.kitNote(s, v1), 'next', 'a run with Buckets says it starts at the next New Well');
}

console.log(`cl-ui-tree: ${checks} checks passed`);
