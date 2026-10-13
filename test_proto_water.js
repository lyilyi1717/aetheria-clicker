// Dig: water (proto/features/water). Run: node test_proto_water.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const A = (s, r, c) => G.cellAt(s, r, c);
const D = (t, hp = 1) => ({ t, hp, max: hp, s: 0 });

// a hand-made 13 row block of ground at row 50: all dirt, with a few things put in
function ground() {
  G.seedRng(1);
  const s = G.newState();
  s.top = 50; s.best = 60;
  s.rows = [];
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows.push(Array.from({ length: G.COLS }, () => D('dirt')));
  s.rows[5] = s.rows[5].map(() => D('hard', 999));   // a floor, so the view does not scroll
  s.queue = []; s.pools = {};
  return s;
}
const run = (s, secs, ev) => { for (let i = 0; i < secs / 0.05; i++) G.step(s, 0.05, ev); };
const collect = () => { const log = []; const ev = (k, d) => log.push([k, d]); ev.log = log; return ev; };
const has = (ev, k) => ev.log.some(x => x[0] === k);

{ // the content is registered
  const u = G.unlocks();
  ok(u.byId['type:water'] && u.byId['type:pearl'] && u.byId['water:wash'] && u.byId['water:ore'] && u.byId['water:dud'] && u.byId['water:pool'], 'water content is counted');
  ok(G.BLOCKS.water.notice && !G.BLOCKS.pearl.notice && G.BLOCKS.pearl.ore, 'block flags');
}
{ // the placed pocket: water in the third layer, plain dirt and ore beside it, a pearl under it
  G.seedRng(3);
  const s = G.newState();
  for (let i = 0; i < 6; i++) { s.rows[0] = s.rows[0].map(() => null); G.scroll(s); }
  s.top = 0;
  const s2 = G.newState();
  for (let r = s2.rows.length; r < 60; r++) { s2.rows.push(G.genRow(s2, r)); }
  const at = (r, c) => s2.rows[r][c];
  const k = s2.wcol;
  ok(k >= 2 && at(53, k).t === 'water', 'a pocket is placed 3 rows into the layer');
  ok(at(54, k).t === 'dirt' && at(55, k).t === 'dirt' && at(56, k).t === 'pearl', 'dirt, dirt, then the pearl under the pocket');
  ok(at(54, k > 4 ? k - 1 : k + 1).t === 'silver' && at(55, k > 4 ? k - 1 : k + 1).t === 'gold', 'ore beside the way down');
  ok(at(30, 0).t !== 'water', 'no water in the layers above');
}
{ // a pocket runs down through soft ground and washes it away
  const s = ground(), ev = collect();
  s.rows[0][4] = D('water');
  const before = s.total;
  ok(G.swing(s, 50, 4, ev), 'hit the pocket');
  ok(A(s, 50, 4) === null && has(ev, 'burst'), 'the pocket opens');
  run(s, 3, ev);
  ok(A(s, 51, 4) === null && A(s, 52, 4) === null, 'the water washed the dirt below it');
  ok(has(ev, 'wash') && s.total > before, 'and it paid');
  ok(Object.keys(s.pools).length > 0, 'water stands in the open space');
  ok(A(s, 51, 3) !== null && A(s, 51, 3).wet > s.t, 'blocks beside the water are wet');
}
{ // ore the water touches comes loose; a pearl only water frees
  const s = ground(), ev = collect();
  s.rows[0][4] = D('water'); s.rows[1][3] = D('gold', 50); s.rows[3][4] = D('pearl', 50);
  const plain = Math.round(G.dirtVal(51) * G.BLOCKS.gold.val * G.coinMult(s));
  G.swing(s, 50, 4, ev);
  run(s, 3, ev);
  ok(A(s, 51, 3) === null && has(ev, 'washed'), 'the gold next to the water came loose');
  const gold = ev.log.find(x => x[0] === 'break' && x[1].t === 'gold');
  ok(gold && gold[1].coins >= plain * G.PARAMS.water.oreBonus * 0.9, 'washed ore pays more');
  ok(A(s, 53, 4) === null && ev.log.some(x => x[0] === 'washed' && x[1].t === 'pearl'), 'the pearl was washed out');
}
{ // a pick barely scratches a pearl
  const s = ground();
  s.rows[0][2] = D('pearl', 6);
  const before = A(s, 50, 2).hp;
  G.swing(s, 50, 2);
  ok(A(s, 50, 2) && A(s, 50, 2).hp > before - G.pickPower(s) + 1e-9, 'a pick only chips a pearl');
}
{ // a hard block stops the water, which spreads sideways in open space
  const s = ground(), ev = collect();
  s.rows[0][4] = D('water'); for (const c of [3, 4, 5, 6]) s.rows[1][c] = D('hard', 99); s.rows[0][3] = null; s.rows[0][5] = null; s.rows[0][6] = null;
  G.swing(s, 50, 4, ev);
  run(s, 2, ev);
  ok(A(s, 51, 4) && A(s, 51, 4).t === 'hard', 'hard rock is not washed');
  ok(s.pools['50,3'] !== undefined && s.pools['50,5'] !== undefined && s.pools['50,6'] !== undefined, 'water ran sideways through the open row');
  ok(has(ev, 'splash'), 'it came to rest with a splash');
}
{ // wet TNT is a dud, dry TNT is not
  const s = ground(), ev = collect();
  s.rows[0][4] = D('water'); s.rows[1][5] = D('tnt');
  G.swing(s, 50, 4, ev);
  run(s, 1.5, ev);
  ok(A(s, 51, 5) && A(s, 51, 5).wet > s.t, 'the barrel got wet');
  const total = s.total;
  G.damage(s, 51, 5, 99, 'you', ev);
  run(s, 1, ev);
  ok(A(s, 51, 5) === null && has(ev, 'fizzle') && !has(ev, 'blast') && s.total > total, 'it plopped: no blast, a few coins');
  const t = ground(), e2 = collect();
  t.rows[0][5] = D('tnt'); t.rows[0][3] = D('dirt', 99);
  G.damage(t, 50, 5, 99, 'you', e2);
  run(t, 1, e2);
  ok(has(e2, 'blast'), 'a dry barrel still blows');
}
{ // the Big Rock stops water
  const s = ground(), ev = collect();
  s.rows[0][4] = D('water');
  for (let c = 0; c < G.COLS; c++) s.rows[2][c] = D('boss', 99);
  G.swing(s, 50, 4, ev);
  run(s, 3, ev);
  ok(A(s, 52, 4) && A(s, 52, 4).t === 'boss', 'water does not wash a Big Rock');
}
{ // pockets chain
  const s = ground(), ev = collect();
  s.rows[0][4] = D('water'); s.rows[1][5] = D('water');
  G.swing(s, 50, 4, ev);
  run(s, 3, ev);
  ok(A(s, 51, 5) === null, 'a pocket the water touches opens too');
}
{ // saves: round trip, an old save without the slices, pools are not saved
  const s = ground(); s.rows[0][4] = D('water');
  G.swing(s, 50, 4); run(s, 1);
  s.rows[5][1].wet = s.t + 5;
  const back = G.deserialize(G.serialize(s));
  ok(back && Object.keys(back.pools).length === 0 && back.queue.length === 0, 'puddles and flowing water are not saved');
  ok(back.rows[5][1].wet === s.rows[5][1].wet, 'a wet block is');
  const o = JSON.parse(G.serialize(G.newState())); delete o.wcol; delete o.pools;
  const old = G.deserialize(JSON.stringify(o));
  ok(old && old.wcol === -1 && typeof old.pools === 'object', 'an old save without the slices loads');
  const n = G.newState(); n.wcol = 4;
  G.reset(n, 'site');
  ok(n.wcol === -1, 'a New Site starts over');
}
{ // the dig still plays through the layer with water around
  G.seedRng(5);
  const s = G.newState();
  s.coins = 1e9; s.total = 1e9; for (let i = 0; i < 6; i++) G.buy(s, 'crew');
  s.up.pick = 40;
  for (let i = 0; i < 4000 && s.best < 70; i++) {
    for (let c = 0; c < G.COLS; c++) if (G.swing(s, s.top + 3, c)) break;
    G.step(s, 0.05);
  }
  ok(s.best >= 60, `digs through the water layer without a crash (reached ${s.best})`);
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('water: ok');
