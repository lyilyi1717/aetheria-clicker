// Museum wing 2 (proto/features/wing2). Run: node test_proto_wing2.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const clearRow = (s, i) => { for (let c = 0; c < G.COLS; c++) s.rows[i][c] = null; };
const cellOf = (s, r, c, t) => { s.rows[r - s.top][c] = G.makeCell(r, t); };

{ // data: 10 sets, 4 to 7 pieces, every piece has words
  const keys = Object.keys(G.WING);
  ok(keys.length === 10, 'ten sets');
  for (const k of keys) {
    const W = G.WING[k], n = W.pieces.length;
    ok(n >= 4 && n <= 7, `${k} has 4 to 7 pieces`);
    ok(G.hasString('wset_' + k) && G.hasString('wr_' + W.reward), `${k} has its words`);
    W.pieces.forEach((pc, i) => ok(G.hasString(`wp_${k}_${i}`), `${k}.${i} has a name`));
  }
  ok(G.unlocks().byId['wingset:dhab'] && G.unlocks().byId['wing:beast.6'] && G.unlocks().byId['site:sharks'] && G.unlocks().byId['relic:dinar'], 'content is listed');
}
{ // a bundle breaks and gives a piece; a set completes and says so
  G.seedRng(3);
  const s = G.newState(); const seen = [];
  const ev = (k, d) => seen.push([k, d]);
  s.top = 30;
  for (let n = 0; n < 60 && !s.wingDone.coins; n++) {
    s.best = 30;
    s.rows[0] = s.rows[0].map(() => null);
    cellOf(s, s.top, 3, 'lost');
    G.breakCell(s, s.top, 3, 'you', ev);
    s.top += 0;
    // bundles at 30 m can give coin pieces only (the other sets begin deeper)
  }
  ok(seen.some(([k]) => k === 'wingPiece'), 'a piece was found');
  const sets = seen.filter(([k]) => k === 'wingSet');
  ok(!s.wingDone.coins || sets.length === 1, 'a finished set is announced once');
}
{ // rows are absolute: build the case by hand at row 40
  G.seedRng(5);
  const s = G.newState(); const seen = [];
  const ev = (k, d) => seen.push([k, d]);
  const W = G.WING.dhab;
  W.pieces.forEach((_, i) => { if (i < 3) s.wingGot['dhab.' + i] = 1; });
  // the last piece comes from a bone block: force the share and the choice
  const undo = G.setParam('wing2.boneShare', 1);
  for (let n = 0; n < 40 && !s.wingDone.dhab; n++) G.wingFind(s, { tags: ['bone'], layer: 1 }, ev, { r: 30 });
  undo();
  ok(s.wingDone.dhab, 'the lizard completes');
  ok(seen.filter(([k]) => k === 'wingSet').length === 1, 'one ceremony event');
  ok(s.unlocked['wingset:dhab'], 'the first time is counted');
}
{ // the 3-in-4 bias: with one piece missing, it comes quickly
  G.seedRng(11);
  const s = G.newState();
  for (let i = 0; i < 6; i++) s.wingGot['pearls.' + i] = 1;
  delete s.wingGot['pearls.0'];
  let tries = 0;
  while (!s.wingGot['pearls.0'] && tries < 200) { tries++; G.wingFind(s, { tags: ['lost'], layer: 2 }, () => {}, { r: 70 }); }
  ok(tries < 40, `a missing piece does not hide (${tries} finds)`);
}
{ // the rare piece only from its source
  const s = G.newState();
  G.seedRng(2);
  for (let n = 0; n < 300; n++) G.wingFind(s, { tags: ['lost'], layer: 3 }, () => {}, { r: 95 });
  ok(!s.wingGot['shark.5'] && !s.wingGot['oilrig.4'] && !s.wingGot['beast.5'], 'rare pieces never come from bundles');
  G.wingFind(s, { tags: ['ore:gem'], layer: 3 }, () => {}, { r: 95 });
  ok(Object.keys(s.wingGot).length > 0, 'gems can drop a piece');
  const s2 = G.newState();
  for (let n = 0; n < 200 && !s2.wingGot['oilrig.4']; n++) G.wingFind(s2, { tags: ['rock'], layer: 3 }, () => {}, { r: 75 });
  ok(s2.wingGot['oilrig.4'], 'the layer 3 Big Rock drops the Golden Bolt');
  const s3 = G.newState();
  for (let n = 0; n < 100; n++) G.wingFind(s3, { tags: ['lost', 'site:sharks'], layer: 3 }, () => {}, { r: 95 });
  ok(s3.wingGot['flycamel.4'], 'bundles at Shark Dunes hold the Left Wing');
}
{ // rewards: sites open, relics enter the chests, goggles show bones in the dark
  const s = G.newState();
  ok(!G.siteOpen(s, 'sharks') && !G.siteOpen(s, 'mirage'), 'sites are closed');
  ok(!G.RELICS.dinar.when(s) && !G.RELICS.pearl.when(s) && !G.RELICS.derrick.when(s), 'relics are not offered yet');
  s.wingDone.shark = s.wingDone.flycamel = s.wingDone.coins = s.wingDone.pearls = s.wingDone.oilrig = true;
  ok(G.siteOpen(s, 'sharks') && G.siteOpen(s, 'mirage'), 'sites open');
  ok(G.RELICS.dinar.when(s) && G.RELICS.pearl.when(s) && G.RELICS.derrick.when(s), 'relics are offered');
  s.relics.pearl = 1;
  ok(G.rollDraft(s).length === 4, 'Pearl Eye gives 4 cards');
  const t = G.newState();
  cellOf(t, t.top + 8, 5, 'lost');
  const dark = () => G.visibleMask(t)[8][5];
  ok(!dark(), 'a bundle in the dark is dark');
  t.wingDone.pilot = true;
  ok(dark(), 'with the goggles it shows');
}
{ // hats: Rafeeqs hit bundles twice as hard
  const s = G.newState();
  const cell = { t: 'lost', hp: 4, max: 4, s: 0 };
  const a = G.fold('damage', s, 1, cell, 'crew', {}, 40);
  s.wingDone.teapot = true;
  const b = G.fold('damage', s, 1, cell, 'crew', {}, 40);
  const c = G.fold('damage', s, 1, { t: 'dirt' }, 'crew', {}, 40);
  ok(b === 2 * a && c === 1, 'hats double the hit on bundles only');
}
{ // the Bone Jar
  const s = G.newState(); let chests = 0;
  const ev = k => { if (k === 'wingJar') chests++; };
  s.wingDone.scarab = true;
  s.fossils['camel.0'] = 1;
  for (let i = 0; i < 9; i++) {
    s.fossils['camel.0']++;
    s.best = 20; s.rows[0] = s.rows[0].map(() => null);
    cellOf(s, s.top, 2, 'fossil');
    G.breakCell(s, s.top, 2, 'you', ev);
    s.best = 20;
  }
  ok(s.chests >= 1, `spare bones fill the jar into a chest (chests ${s.chests})`);
}
{ // Shark Dunes: sand slides; Mirage Dunes: the hit is copied
  G.seedRng(1);
  const s = G.newState(); s.site = 'sharks';
  const undo = G.setParam('wing2.slide', 1.1);
  s.rows[3][4] = G.makeCell(s.top + 3, 'dirt'); s.rows[4][4] = G.makeCell(s.top + 4, 'dirt');
  G.breakCell(s, s.top + 4, 4, 'you', () => {});
  undo();
  ok(s.rows[4][4] && s.rows[3][4] === null, 'the block above fell into the hole');
  const m = G.newState(); m.site = 'mirage';
  const left = m.rows[0][2], right = m.rows[0][7];
  left.hp = left.max = 100; right.hp = right.max = 100; left.t = right.t = 'dirt';
  G.swing(m, m.top, 2, () => {});
  ok(right.hp < 100 && left.hp < 100, 'the other side was hit too');
}
{ // saves: round trip, and an old save without the slices
  const s = G.newState();
  s.wingGot['dhab.0'] = 2; s.wingDone.dhab = true; s.wingJar = 3;
  const t = G.deserialize(G.serialize(s));
  ok(t.wingGot['dhab.0'] === 2 && t.wingDone.dhab && t.wingJar === 3, 'the wing survives a save');
  const o = JSON.parse(G.serialize(s));
  for (const k of ['wingGot', 'wingDone', 'wingJar', 'wingDupSeen', 'wingDeep', 'wingN', 'wingPend']) delete o[k];
  const u = G.deserialize(JSON.stringify(o));
  ok(u && u.wingGot && Object.keys(u.wingGot).length === 0 && u.wingJar === 0, 'an old save loads with an empty wing');
  const n = G.newState(); n.wingDone.dhab = true; n.wingGot['dhab.0'] = 1; n.wingJar = 2;
  G.reset(n, 'site');
  ok(n.wingDone.dhab && n.wingGot['dhab.0'] && n.wingJar === 2, 'a New Site keeps the wing');
}
{ // the derrick and the dinar do something
  G.seedRng(4);
  const s = G.newState(); s.relics.derrick = 1; s.relics.dinar = 2;
  for (let i = 1; i < 6; i++) cellOf(s, s.top + i, 4, 'dirt');
  s.rows[0] = s.rows[0].map(() => null);
  cellOf(s, s.top + 1, 4, 'gold'); s.rows[1][3] = G.makeCell(s.top + 1, 'dirt'); s.rows[1][5] = G.makeCell(s.top + 1, 'dirt');
  const seen = [];
  G.breakCell(s, s.top + 1, 4, 'you', (k) => seen.push(k));
  ok(seen.includes('wingSeed'), 'breaking gold seeds a neighbour');
  const kinds = [s.rows[1][3], s.rows[1][5]].filter(x => x && x.seeded);
  ok(kinds.length === 1 && kinds[0].t === 'silver', 'the seed is a smaller ore');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('wing2 ok');
