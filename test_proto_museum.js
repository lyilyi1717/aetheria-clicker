// Dig: Museum pieces you can see and chase (proto/features/museum). Run: node test_proto_museum.js
import * as G from './proto/game.js';
import { buildMap } from './proto/features/worldmap/layout.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

{ // which pieces a level still holds
  const s = G.newState();
  const shallow = G.museumLevel(s, 'dunes', 10);
  ok(shallow === null, 'a level shallower than every set holds nothing');
  const lv = G.museumLevel(s, 'dunes', 50);
  ok(lv && lv.set === 'camel' && lv.of === 4 && lv.have === 0, 'the first set is the one a 50 m level shows');
  ok(lv.pieces.every(p => !p.have), 'nothing is found yet');
  s.wingGot['camel.1'] = 1; s.wingGot['camel.3'] = 2;
  const lv2 = G.museumLevel(s, 'dunes', 50);
  ok(lv2.have === 2 && lv2.pieces[1].have && !lv2.pieces[0].have, 'found pieces are marked');
  for (let i = 0; i < 4; i++) s.wingGot['camel.' + i] = 1;
  s.wingDone.camel = true;
  const lv3 = G.museumLevel(s, 'dunes', 50);
  ok(lv3.set === 'whale', 'a finished set is skipped: the next one shows');
  ok(!G.museumHolds(s, 'dunes', 50).some(h => h.set === 'camel'), 'holds lists only unfinished sets');
}

{ // piece rules: rows, Big Rocks, sites
  const s = G.newState();
  const djinn = G.WING.djinn;
  ok(G.museumPieceHere('djinn', djinn.pieces[5], 'dunes', 24) === false, 'a Big Rock piece needs the floor to reach the Rock (25)');
  ok(G.museumPieceHere('djinn', djinn.pieces[5], 'dunes', 50) === true, 'and a deep enough level has it');
  const fly = G.WING.flycamel.pieces.findIndex(p => p.how === 'site:sharks');
  ok(!G.museumPieceHere('flycamel', G.WING.flycamel.pieces[fly], 'dunes', 100) && G.museumPieceHere('flycamel', G.WING.flycamel.pieces[fly], 'sharks', 100), 'a site piece is found only at that site');
  void s;
}

{ // when the whole Museum is done a level shows the last set, finished
  const s = G.newState();
  for (const k of Object.keys(G.WING)) { s.wingDone[k] = true; G.WING[k].pieces.forEach((_, i) => { s.wingGot[k + '.' + i] = 1; }); }
  const lv = G.museumLevel(s, 'dunes', 100);
  ok(lv && lv.done && lv.have === lv.of, 'with every set done the level shows a finished set');
}

{ // the glint: a bone glints only while a bone piece is still missing here
  const s = G.newState();
  s.run = { floor: 50 }; s.site = 'dunes';
  ok(G.museumWants(s, 'fossil'), 'a bone glints while the first set lacks bones');
  ok(G.museumWants(s, 'lost') === true || G.museumWants(s, 'lost') === false, 'a bundle answers too');
  ok(!G.museumWants(s, 'dirt'), 'dirt never glints');
  s.run = null;
  ok(!G.museumWants(s, 'fossil') && G.museumHere(s) === null, 'no run, nothing to show');
}

{ // the world map: every level with a floor says which Museum set it can still give
  G.seedRng(5);
  const s = G.newState();
  s.wingGot['camel.0'] = 1;
  const map = buildMap(s);
  const road = map.nodes.filter(n => n.type === 'road');
  ok(road.length > 0 && road.every(n => n.museum && n.museum.set && n.museum.pieces.length === n.museum.of), 'each road level carries its Museum set');
  ok(road[0].museum.set === 'camel' && road[0].museum.have === 1 && road[0].museum.pieces[0].have, 'found pieces show as found on the map');
  ok(road[0].museum.reward === 'camel', 'and the map knows what the set opens');
  ok(map.nodes.filter(n => n.type === 'town' || n.type === 'hub').every(n => n.museum === null), 'the town and the hub have none');
  s.wingDone.camel = true; for (let i = 0; i < 4; i++) s.wingGot['camel.' + i] = 1;
  ok(buildMap(s).nodes.find(n => n.type === 'road').museum.set === 'whale', 'a finished set moves the level on to the next one');
}

{ // old saves load
  const old = JSON.parse(G.serialize(G.newState()));
  const s = G.deserialize(JSON.stringify(old));
  ok(s && G.museumLevel(s, 'dunes', 50), 'a save loads and the level reads it');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('test_proto_museum: ok');
