// Dig: Alqahwa, the coffee house town, and the after-dig choice (the pure parts).
import * as G from './proto/game.js';
import { finishChoices, autoEnterCard, qahwaGuests, qahwaSpots, qahwaNextAct, QAHWA_ACTS } from './proto/features/worldmap/flow.js';
import { buildMap } from './proto/features/worldmap/layout.js';
import { TABS, PANEL_TAB } from './proto/ui/drawerlogic.js';

let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.error('FAIL: ' + m); } };

{ // the choices after a dig
  const s = G.newState();
  s.bossesDown = 0;
  ok(finishChoices(s).join() === 'alqahwa', 'before the second Big Rock only the coffee house');
  s.bossesDown = 9;
  ok(finishChoices(s).join() === 'alqahwa,next', 'both choices once you can move on');
}
{ // auto-enter: only one card, only after a walk
  const a = { key: 'a' }, b = { key: 'b' };
  ok(autoEnterCard([a], true) === a, 'one road card: go in by itself');
  ok(autoEnterCard([a, b], true) === null && autoEnterCard([a, b, { key: 'c' }], true) === null, 'a deal or side cards: the player chooses');
  ok(autoEnterCard([a], false) === null && autoEnterCard([], true) === null, 'no walk or no card: nothing');
}
{ // the guests
  const s = G.newState();
  ok(qahwaGuests(s).rafeeqs.length === 0 && qahwaGuests(s).manager === null, 'an empty camp: an empty coffee house');
  G.chatterBossFem(s);
  const sp = qahwaSpots(8);
  ok(sp.length === 8 && sp.every(x => x > 0 && x < 1), 'a spot for every Rafeeq');
  const seen = new Set();
  for (let i = 0; i < 100; i++) seen.add(qahwaNextAct(QAHWA_ACTS[i % 4], i / 100));
  ok([...seen].every(a => QAHWA_ACTS.includes(a)) && seen.size === 4, 'every act comes up');
  ok(qahwaNextAct('walk', 0.99) !== 'walk' && qahwaNextAct('sit', 0.5) !== 'sit', 'a guest does not repeat the same act');
}
{ // the town is on the map, on no road, and an old save builds it
  const s = G.newState();
  const map = buildMap(s), town = map.nodes.filter(n => n.type === 'town');
  ok(town.length === 1 && town[0].state === 'town' && !town[0].card, 'one Alqahwa node, no card');
  ok(!map.edges.some(e => e.from === town[0] || e.to === town[0]), 'on no road');
  ok(map.nodes.filter(n => n.card).length === G.dealCards(s).length, 'the town does not change which nodes are cards');
}
{ // the Stars tab is gone; Star tracks are not in the drawer
  ok(!TABS.some(x => x.id === 'stars'), 'no Stars tab');
  ok(!Object.values(PANEL_TAB).includes('stars'), 'no panel points at the Stars tab');
}
if (bad) { console.error(bad + ' failed'); process.exit(1); }
console.log('Dig Alqahwa OK');
