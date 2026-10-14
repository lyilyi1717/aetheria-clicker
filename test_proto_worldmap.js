// The road map (proto/features/worldmap). Run: node test_proto_worldmap.js
import * as G from './proto/game.js';
import { readFileSync } from 'node:fs';
import strings from './proto/features/worldmap/strings.js';
import { buildMap, pathPoints, PW, sideClear } from './proto/features/worldmap/layout.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const fresh = () => { G.seedRng(11); return G.newState(); };
const stamp = (s, i, v) => { const f = G.ROAD[i]; s.road.stamps[G.roadKey(f)] = { site: f.site, floor: f.floor, ch: f.ch, twist: '', fin: 0, fast: 0, hard: 0, best: 0, n: 1, ...v }; };
const keys = map => map.nodes.filter(n => n.card).map(n => n.card.key).sort().join();
const dealKeys = s => G.dealCards(s).map(c => c.key).sort().join();

{ // a fresh save: 40 road nodes in 10 lands (two chapters, the crossroads between), level 1 is the go node, the rest are locked
  const s = fresh(), map = buildMap(s);
  const road = map.nodes.filter(n => n.type === 'road');
  const panelOf = z => map.panels.find(p => p.zone === z);
  ok(road.length === 40 && G.ROAD.length === 40, 'forty road nodes');
  ok(new Set(road.map(n => n.zone)).size === 10 && G.ZONES.length === 10, 'ten lands');
  ok(map.panels.length === 11 && map.panels[5].zone === 'beyond' && map.panels.map(p => p.zone).join() === [...G.ZONES.slice(0, 5), 'beyond', ...G.ZONES.slice(5)].join(), 'five lands, Beyond, then the five of chapter two');
  ok(road.every((n, i) => n.level === i + 1 && n.x >= panelOf(n.zone).x && n.x < panelOf(n.zone).x + PW), 'each node sits in its own land');
  ok(map.edges.some(e => e.from === road[19] && e.to === map.hub) && map.edges.some(e => e.from === map.hub && e.to === road[20]) && !map.edges.some(e => e.from === road[39]), 'level 20 walks to the crossroads, the crossroads to level 21; level 40 ends the road');
  ok(map.go && map.go.i === 0 && map.go.state === 'next', 'level 1 glows on a save with no stamps');
  ok(road.filter(n => n.state === 'locked').length === 39, 'the rest are locked');
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
{ // chapter one finished: level 21 is the go node; the free deal hangs off the crossroads as a side branch
  const s = fresh();
  for (let i = 0; i < 20; i++) stamp(s, i, { fin: 1, fast: i % 2, hard: 0, best: 300 });
  s.road.reach = 275;
  const map = buildMap(s), beyond = map.nodes.filter(n => n.type === 'beyond'), free = G.freeDeal(s);
  ok(map.go.i === 20 && map.go.card.kind === 'fixed' && map.go.card.key === 'c2:dunes:100' && map.hub.state === 'done', 'level 21 is the one to go to');
  ok(beyond.length === free.length && free.length >= 1 && beyond.every(n => map.edges.some(e => e.to === n && e.from === map.hub)), 'the free deal is a side branch at the crossroads');
  ok(G.dealCards(s).length === 1 && keys(map) === [...G.dealCards(s), ...free].map(c => c.key).sort().join(), 'Next town still deals level 21 only; the map adds the side branch');
  s.bossesDown = 2; G.siteRun(s);
  ok(G.pickCard(s, free[0], () => {}) && s.run.key === free[0].key && G.fixedNext(s).level === 21, 'a free card can be taken; level 21 waits');
}
{ // all 40 finished: Beyond with one path per card
  const s = fresh();
  for (let i = 0; i < 40; i++) stamp(s, i, { fin: 1, fast: i % 2, hard: 0, best: 300 });
  s.road.reach = 325;
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
  ok(en.wm_map_btn && readFileSync('proto/features/track/ui.js', 'utf8').includes('openMap'), 'the Map button (top right, now the track feature) opens the map');
}

{ // a finished stone offers both buttons' cards; the road level stays the go node
  const s = fresh();
  for (let i = 0; i < 4; i++) stamp(s, i, { fin: 1, fast: 0, hard: 0, best: 120 });
  const map = buildMap(s), n = map.nodes.find(x => x.type === 'road' && x.i === 1);
  const key = G.siteKey(n.site, n.floor), a = G.replayCard(s, key, false), h = G.replayCard(s, key, true);
  ok(n.state === 'done' && a && a.kind === 'replay' && h && h.hard === 'chili1', 'a done stone has a plain and a chili replay card');
  ok(map.go.i === 4 && map.go.card.kind === 'fixed', 'the road level is still the main Dig here');
  const src = readFileSync(new URL('./proto/features/worldmap/strings.js', import.meta.url), 'utf8');
  ok(src.includes('wm_again') && src.includes('wm_hard_way'), 'the two button words exist');
}

{ // side and Beyond cards never sit on each other or on a road stone (their labels and Museum chips hang below them)
  const check = (map, what) => {
    const cards = map.nodes.filter(n => n.type === 'side' || n.type === 'beyond');
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) ok(sideClear(cards[i], cards[j]), `${what}: ${cards[i].id} and ${cards[j].id} overlap`);
      for (const r of map.nodes.filter(n => n.type === 'road' && n.zone === cards[i].zone && n.zone !== 'beyond')) ok(sideClear(cards[i], r), `${what}: ${cards[i].id} sits on level ${r.level}`);
    }
    return cards.length;
  };
  let most = 0;
  for (const lv of [3, 6, 9, 12, 15, 18]) {
    const s = fresh();
    for (let i = 0; i < lv; i++) stamp(s, i, { fin: 1, best: 200 });
    stamp(s, lv, { fin: 0, n: 3 });
    most = Math.max(most, check(buildMap(s), 'stuck at ' + (lv + 1)));
  }
  const s2 = fresh();
  for (let i = 0; i < 20; i++) stamp(s2, i, { fin: 1, fast: i % 2, best: 300 });
  s2.road.reach = 275;
  for (let k = 0; k < 3; k++) stamp(s2, 20 + k, { fin: 1, best: 300 });
  const m2 = buildMap(s2), b2 = m2.nodes.filter(n => n.type === 'beyond');
  check(m2, 'crossroads');
  ok(most >= 2 && b2.length >= 1, 'the checks saw several cards');
  const m3 = buildMap(Object.assign(fresh(), {}));
  ok(m3.nodes.every(n => n.type !== 'beyond'), 'fresh save has no Beyond cards');
  // the fan itself: three cards at the crossroads are stepped across
  const fan = [[0.41, 250], [0.63, 335], [0.85, 250]].map(([x, y]) => ({ type: 'beyond', x: x * PW, y }));
  ok(sideClear(fan[0], fan[1]) && sideClear(fan[1], fan[2]) && sideClear(fan[0], fan[2]), 'the three crossroads spots are clear of each other');
}
if (failed) { console.error(`${failed} check(s) failed`); process.exit(1); }
console.log('Dig world map OK');

