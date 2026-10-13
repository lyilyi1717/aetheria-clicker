// The road map (proto/features/worldmap). Run: node test_proto_worldmap.js
import * as G from './proto/game.js';
import { readFileSync } from 'node:fs';
import strings from './proto/features/worldmap/strings.js';
import { buildMap, pathPoints, PW } from './proto/features/worldmap/layout.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const fresh = () => { G.seedRng(11); return G.newState(); };
const stamp = (s, i, v) => { const f = G.ROAD[i]; s.road.stamps[G.siteKey(f.site, f.floor)] = { site: f.site, floor: f.floor, twist: '', fin: 0, fast: 0, hard: 0, best: 0, n: 1, ...v }; };
const keys = map => map.nodes.filter(n => n.card).map(n => n.card.key).sort().join();
const dealKeys = s => G.dealCards(s).map(c => c.key).sort().join();

{ // a fresh save: 20 road nodes in 5 lands, level 1 is the go node, the rest are locked
  const s = fresh(), map = buildMap(s);
  const road = map.nodes.filter(n => n.type === 'road');
  ok(road.length === 20 && G.ROAD.length === 20, 'twenty road nodes');
  ok(new Set(road.map(n => n.zone)).size === 5 && G.ZONES.length === 5, 'five lands');
  ok(map.panels.length === 6 && map.panels[5].zone === 'beyond', 'five lands and Beyond');
  ok(road.every((n, i) => n.level === i + 1 && n.x >= map.panels[G.ZONES.indexOf(n.zone)].x && n.x < map.panels[G.ZONES.indexOf(n.zone)].x + PW), 'each node sits in its own land');
  ok(map.go && map.go.i === 0 && map.go.state === 'next', 'level 1 glows on a save with no stamps');
  ok(road.filter(n => n.state === 'locked').length === 19, 'the rest are locked');
  ok(keys(map) === dealKeys(s), 'the clickable nodes are exactly the dealt cards');
  ok(road.every(n => n.stamp === null), 'no stamps, no medals');
}
{ // levels 1 to 9 finished with mixed medals
  const s = fresh();
  for (let i = 0; i < 9; i++) stamp(s, i, { fin: 1, fast: i % 2, hard: i % 3 === 0 ? 1 : 0, best: 100 + i });
  const map = buildMap(s), road = map.nodes.filter(n => n.type === 'road');
  ok(map.go.i === 9 && map.go.level === 10, 'level 10 is the one to go to');
  ok(road.slice(0, 9).every(n => n.state === 'done') && road[9].state === 'next' && road[10].state === 'locked', 'done, next, locked');
  ok(road[3].stamp.fin === 1 && road[3].stamp.hard === 1 && road[3].stamp.fast === 1, 'the medals come from the stamps');
  ok(keys(map) === dealKeys(s), 'only the dealt card is clickable');
  const e = map.edges.filter(x => x.kind === 'road');
  ok(e.slice(0, 9).every(x => x.open) && e.slice(9).every(x => !x.open), 'paths are open up to the next stone');
}
{ // stuck at a level (two tries): side cards hang off it
  const s = fresh();
  for (let i = 0; i < 6; i++) stamp(s, i, { fin: 1, fast: 0, hard: 0, best: 200 });
  stamp(s, 6, { fin: 0, n: 2 });
  const map = buildMap(s), side = map.nodes.filter(n => n.type === 'side' || (n.type === 'island' && n.card));
  ok(G.dealCards(s).length >= 2 && side.length === G.dealCards(s).length - 1, 'every side card has a branch');
  ok(side.every(n => map.edges.some(e => e.kind === 'side' && e.to === n && e.from === map.go) || n.type === 'island'), 'branches hang off the stuck level');
  ok(keys(map) === dealKeys(s), 'clickable set equals the deal');
  ok(map.go.card.kind === 'fixed' && map.go.level === 7, 'the road level is still the go node');
  ok(side.every(n => n.y >= 225 && n.y <= 420), 'branches stay on the ground');
}
{ // a Museum place appears only when it is open
  const s = fresh(), before = buildMap(s).nodes.filter(n => n.type === 'island').length;
  const museumIds = Object.keys(G.SITES).filter(id => !G.FIXED.some(f => f.site === id));
  ok(before === museumIds.filter(id => G.siteOpen(s, id)).length, 'islands match the places that are open');
  ok(buildMap(s).nodes.filter(n => n.type === 'island').every(n => G.siteOpen(s, n.site)), 'no island for a closed place');
}
{ // all 20 finished: Beyond with one path per card
  const s = fresh();
  for (let i = 0; i < 20; i++) stamp(s, i, { fin: 1, fast: i % 2, hard: 0, best: 300 });
  s.road.reach = 300;
  const map = buildMap(s), cards = G.dealCards(s), beyond = map.nodes.filter(n => n.type === 'beyond');
  ok(cards.length >= 1 && beyond.length === cards.length, 'one path per card');
  ok(map.hub.state === 'done' && map.nodes.filter(n => n.type === 'road').every(n => n.state === 'done'), 'the whole road is done');
  ok(beyond.every(n => n.x >= map.panels[5].x && map.edges.some(e => e.to === n && e.from === map.hub)), 'the paths fan out of the crossroads in Beyond');
  ok(keys(map) === dealKeys(s) && !map.go.card.kind.includes('fixed'), 'clickable set equals the deal; none is a road level');
}
{ // an old save: stamps with no medals and extra fields draw
  const s = fresh();
  s.road.stamps['dunes:50'] = { site: 'dunes', floor: 50, twist: '', fin: 0, fast: 0, hard: 0, best: 0, n: 2 };
  s.road.stamps['weird:999'] = { site: 'weird', floor: 999 };
  let threw = false, map;
  try { map = buildMap(s); } catch (e) { threw = true; console.error(e); }
  ok(!threw && map.nodes.length >= 21, 'old stamps build a map');
}
{ // path points run from one stone to the other
  const s = fresh(), map = buildMap(s), e = map.edges[0], p = pathPoints(e);
  ok(Math.hypot(p[0].x - e.from.x, p[0].y - e.from.y) < 1 && Math.hypot(p[p.length - 1].x - e.to.x, p[p.length - 1].y - e.to.y) < 1, 'a path joins its two stones');
  ok(buildMap(s) !== map && JSON.stringify(s.road.stamps) === '{}', 'building the map does not write stamps');
}
{ // every word the map asks for exists, and no emoji
  const en = strings.en;
  for (const f of ['ui.js', 'draw.js']) {
    const src = readFileSync('proto/features/worldmap/' + f, 'utf8');
    for (const m of src.matchAll(/t\('(wm_\w+)'/g)) ok(en[m[1]], `${f}: string ${m[1]} exists`);
  }
  ok(Object.values(en).every(v => !/\p{Extended_Pictographic}/u.test(v)), 'no emoji in the words');
  ok(readFileSync('proto/features/sites/ui.js', 'utf8').includes('wm_map_btn') && en.wm_map_btn, 'the panel button has its words');
}

if (failed) { console.error(`${failed} check(s) failed`); process.exit(1); }
console.log('Dig world map OK');
