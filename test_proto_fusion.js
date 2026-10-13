// Dig: relic fusion (proto/features/fusion). Run: node test_proto_fusion.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const cell = (t, hp = 10) => ({ t, hp, max: hp, s: 0 });
const log = () => { const L = []; const ev = (k, d) => L.push([k, d]); ev.of = k => L.filter(x => x[0] === k).map(x => x[1]); return ev; };
function field(relics = {}, hp = 10) {
  G.seedRng(7);
  const s = G.newState();
  for (let i = 0; i < s.rows.length; i++) for (let c = 0; c < G.COLS; c++) s.rows[i][c] = cell('dirt', hp);
  s.relics = { ...relics };
  s.relics2.gift = { fuse: 3, garden: 3 };
  return s;
}
const run = (s, secs, ev) => { for (let i = 0; i < Math.round(secs / 0.05); i++) G.step(s, 0.05, ev); };
const count = (s, t) => s.rows.flat().filter(x => x && x.t === t).length;

{ // what ships
  const u = G.unlocks();
  ok(G.FUSIONS.length >= 16 && G.FUSIONS.length <= 20, `16 to 20 recipes (${G.FUSIONS.length})`);
  const six = [['hop', 'twin'], ['fling', 'magnet'], ['fire', 'fuse'], ['rang', 'fall'], ['borrow', 'fazaa'], ['garden', 'melt']];
  for (const [a, b] of six) ok(G.FUSIONS.some(f => f.a === a && f.b === b), `${a}+${b} fuses`);
  const names = new Set();
  for (const f of G.FUSIONS) {
    const id = G.fusionRelic(f.id);
    ok(G.RELICS[id] && G.RELICS[id].max === 1 && G.RELICS[f.a] && G.RELICS[f.b], `${f.id}: relic and halves exist`);
    ok(G.RELICS[id].when(G.newState()) === false, `${f.id}: never offered`);
    ok(u.byId['relic:' + id] && u.byId['fusion:' + f.id], `${f.id}: counted as content`);
    ok(G.t('r_' + id) !== 'r_' + id && G.t('r_' + id + '_d') !== 'r_' + id + '_d', `${f.id}: has a name and a line`);
    ok(!names.has(f.a + f.b), 'no duplicate recipe'); names.add(f.a + f.b);
  }
}

{ // the book: two halves held reveal a recipe; fusing stamps it
  const s = field({ hop: 1, twin: 1 });
  const ev = log();
  G.step(s, 0.05, ev);
  ok(G.fusionState(s, 'mirror') === 1 && ev.of('fusionSeen').length === 1, 'holding both halves reveals the recipe');
  ok(G.fusionCan(s, 'mirror'), 'the very first fuse needs only level 1 + 1');
  G.step(s, 0.05, ev);
  ok(ev.of('fusionSeen').length === 1, 'it is revealed once');
  ok(G.fusionReady(s).includes('mirror'), 'level 1 + 1 lights the button');
  ok(G.fusionDo(s, 'mirror', ev), 'it fuses');
  ok(s.relics.fz_mirror === 1 && G.fusionState(s, 'mirror') === 2, 'new relic held, recipe stamped');
  ok(s.relics.hop === 3 && s.relics.twin === 3 && s.fusion.melted.hop, 'halves stay held (their effects run) and are melted');
  ok(!G.fusionCan(s, 'mirror') && !G.fusionDo(s, 'mirror'), 'cannot fuse twice');
  ok(ev.of('fusionDone').length === 1 && ev.of('relic').some(r => r.id === 'fz_mirror'), 'ceremony event and relic event');
  ok(!G.rollDraft(s).some(id => id.startsWith('fz_') || id === 'hop' || id === 'twin'), 'draft offers neither fused relic nor melted halves');
}

{ // a half is melted once; mastery allows 2 + 2 on a later site
  const s = field({ fire: 3, fuse: 3, rang: 3, wide: 3 });
  G.fusionDo(s, 'fireshower');
  ok(!G.fusionCan(s, 'flameang') && !G.fusionCan(s, 'torch'), 'a melted half cannot be used again');
  const t = field({ hop: 1, twin: 1 });
  t.fusionBook.stamped.mirror = 1;
  ok(G.fusionCan(t, 'mirror'), 'a known recipe fuses at 1 + 1');
  G.fusionDo(t, 'mirror');
  ok(t.relics.hop === 3 && t.relics.twin === 3, 'and the halves count as top level');
  const u = field({ hop: 1, twin: 1 });
  u.fusionBook.stamped.torch = 1;
  ok(!G.fusionCan(u, 'mirror'), 'after the first fuse a new recipe needs 2 + 2');
  u.relics.hop = 2; u.relics.twin = 2;
  ok(G.fusionCan(u, 'mirror'), 'and 2 + 2 is enough');
}

{ // twists
  const s = field({ boom: 3, bang: 2 }); G.fusionDo(field({ boom: 3, bang: 2 }), 'barrelboom');
  const a = field({ boom: 3, bang: 3 }); G.fusionDo(a, 'barrelboom');
  a.hits = 5; // the next swing is hit 6 = every 6th at level 3
  G.swing(a, 0, 3, log());
  ok(count(a, 'tnt') === 2, 'a boom plants two barrels (' + count(a, 'tnt') + ')');
  const b = field({ boom: 3, bang: 3 });
  b.hits = 5; G.swing(b, 0, 3, log());
  ok(count(b, 'tnt') === 0, 'without the fusion, no barrels');

  const d = field({ deep: 3, magnet: 3 }); G.fusionDo(d, 'treasuredrill');
  d.rows[4][3] = cell('copper', 50);
  const ev = log();
  G.swing(d, 0, 3, ev);
  ok(ev.of('fusionBring').length === 1 && d.rows[1][3].t === 'copper', 'the hit brings ore up under the pick');

  const g = field({ garden: 3, melt: 3 }); G.fusionDo(g, 'bloom');
  g.rows[4][1] = cell('copper', 1000);
  const ge = log();
  for (let i = 0; i < 20 && !ge.of('fusionRipe').length; i++) { g.rows[8][i % 6] = cell('dirt', 1); G.breakCell(g, g.top + 8, i % 6, 'you', ge); }
  ok(ge.of('fusionRipe').length === 1, 'ore ripens after enough blocks');

  const e = field({ echo: 3, twin: 3 }); G.fusionDo(e, 'echoseed');
  e.rows[3][3] = cell('copper', 10);
  const ee = log();
  const orig = G.hooks_run;
  G.setParam('crits.chance', 0);
  e.relics.echo = 3;
  let tries = 0;
  while (!ee.of('fusionCopy').length && tries++ < 200) { e.rows[0][3] = cell('copper', 1000); G.swing(e, 0, 3, ee); }
  ok(ee.of('fusionCopy').length >= 1, 'a double strike on ore plants more ore');
  void s; void orig;
}

{ // twists do nothing once a half is gone
  const s = field({ hop: 3, twin: 3 }); G.fusionDo(s, 'mirror');
  delete s.relics.twin;
  s.rows[3][3] = cell('copper', 5); s.rows[3][4] = cell('copper', 5);
  const ev = log();
  G.breakCell(s, s.top + 3, 3, 'you', ev, { hop: 1 });
  ok(!ev.of('fusionCopy').length, 'a twist needs both halves');
}

{ // saves
  const s = field({ hop: 3, twin: 3 }); G.fusionDo(s, 'mirror');
  const back = G.deserialize(G.serialize(s));
  ok(back.relics.fz_mirror === 1 && back.fusion.melted.hop === 'mirror' && back.fusionBook.stamped.mirror === 1, 'round trip keeps it');
  const old = JSON.parse(G.serialize(G.newState()));
  delete old.fusion; delete old.fusionBook;
  const o = G.deserialize(JSON.stringify(old));
  ok(o && o.fusion && o.fusionBook && Object.keys(o.fusionBook.seen).length === 0, 'an old save without the slices loads');
  const n = field({ hop: 3, twin: 3 }); G.fusionDo(n, 'mirror');
  const site = G.newState(); void site;
  G.reset(n, 'site');
  ok(n.fusionBook.stamped.mirror === 1 && !Object.keys(n.fusion.melted).length, 'a New Site keeps the book, melted halves start over');
}

{ // every recipe can be made: a half that tops out at 2 is ready at 2
  for (const f of G.FUSIONS) {
    const s = G.newState();
    s.relics[f.a] = G.RELICS[f.a].max; s.relics[f.b] = G.RELICS[f.b].max;
    ok(G.fusionCan(s, f.id), `${f.id}: both halves at their top level fuse`);
  }
}

{ // the guide: until the first fuse a match is put on the table
  G.seedRng(3);
  const fresh = () => G.newState();
  for (let i = 0; i < 20; i++) {
    const d = G.rollDraft(fresh());
    ok(d.length === 3 && d.includes('hop') && d.includes('twin'), 'the first chest offers the guide pair (Hop and Twin)');
  }
  for (let i = 0; i < 20; i++) {
    const s = fresh(); s.relics.hop = 1;
    const d = G.rollDraft(s);
    ok((d.includes('twin') || d.includes('boom')) && d.length === 3, 'holding Hop, the next chest offers a partner (Twin or Boom)');
  }
  for (let i = 0; i < 20; i++) {
    const s = fresh(); s.relics.boom = 1;
    const d = G.rollDraft(s);
    ok(d.includes('bang') || d.includes('hop'), 'holding Boom, the next chest offers a partner (Bang or Hop)');
  }
  const done = fresh(); done.relics.hop = 1; done.fusionBook.stamped.torch = 1;
  let all = 0;
  for (let i = 0; i < 40; i++) all += G.rollDraft(done).includes('twin') ? 1 : 0;
  ok(all < 40, 'after the first fuse the draft is left alone (Twin is not forced)');
  const melted = fresh(); melted.relics.hop = 1; melted.fusion.melted.twin = 'mirror';
  ok(!G.fusionGuide(melted, ['x', 'y', 'z'], 3).includes('twin'), 'a melted half is never offered again');
  // first-fuse flow: take Hop, then Twin, fuse at level 1 + 1
  const f = fresh(); f.chests = 2;
  G.takeRelic(f, 'hop'); G.takeRelic(f, 'twin');
  ok(G.fusionReady(f).includes('mirror'), 'Hop and Twin at level 1 can be fused');
  ok(G.fusionDo(f, 'mirror') && f.relics.hop === 3 && f.relics.twin === 3, 'fusing lifts both halves to their top level');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('test_proto_fusion: ok');
