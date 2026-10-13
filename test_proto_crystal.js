// Crystal (proto/features/crystal): a block that breaks in a line. Run: node test_proto_crystal.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const cellOf = (r, t, hp = 1) => ({ t, hp, max: hp, s: 1 });
const TOP = 76;

// a held area at the crystal layer made of one-hit dirt; the top row is open sky
function field() {
  const s = G.newState();
  s.top = TOP;
  s.rows = Array.from({ length: G.KEEP_ROWS }, (_, i) => Array.from({ length: G.COLS }, () => cellOf(TOP + i, 'dirt')));
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;
  s.rows[0][9] = cellOf(TOP, 'hard', 1e12);   // keeps the view from scrolling away under the test
  return s;
}
const put = (s, r, c, t, hp = 1) => { s.rows[r - TOP][c] = cellOf(r, t, hp); };
const open = (s, r, c) => { s.rows[r - TOP][c] = null; };
const at = (s, r, c) => (r < s.top ? undefined : s.rows[r - s.top][c]);
// what broke, by event (the view scrolls under a test, so rows can leave the held area)
const log = new WeakMap();
const rec = s => { if (!log.has(s)) log.set(s, { broke: new Set(), hits: new Set(), cracks: [], kinds: [] }); return log.get(s); };
const ev = s => (k, d) => { const L = rec(s); if (k === 'break') L.broke.add(d.r + ',' + d.c); if (k === 'hit') L.hits.add(d.r + ',' + d.c); if (k === 'crystalCrack') L.cracks.push(d); L.kinds.push(k); };
const run = (s, secs = 3) => { const e = ev(s); for (let i = 0; i < secs / 0.05; i++) G.step(s, 0.05, e); };
const hit = (s, r, c) => G.swing(s, r, c, ev(s));
const gone = (s, r, c) => rec(s).broke.has(r + ',' + c);

{ // the layer is the crystal cave
  const L = G.layerAt(G.newState(), 80);
  ok(L.id === 'deep' && L.name === 'layer_crystal' && G.t(L.name) === 'Crystal Cave' && L.look.back === '#101830', 'rows 75 to 99 are the crystal layer with its own look');
  ok(Object.keys(L.blocks).join() === 'crystal_row,crystal_col,crystal_slash,crystal_back,crystal_prism', 'and its own block table');
  ok(G.layerAt(G.newState(), 60).id === 'slate' && G.layerAt(G.newState(), 120).id === 'black', 'other layers untouched');
}
{ // a row crystal cracks left and right, nothing else
  const s = field();
  put(s, 77, 4, 'crystal_row');
  hit(s, 77, 4);
  run(s);
  ok([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].every(c => gone(s, 77, c)), 'the whole row went');
  ok([...rec(s).broke].every(k => k.startsWith('77,')), 'and nothing else');
  ok(rec(s).kinds.includes('crystalLine') && rec(s).cracks.length >= 9, 'events were sent');
}
{ // the crack travels: nearer cells go before farther ones
  const s = field();
  put(s, 77, 0, 'crystal_row');
  hit(s, 77, 0);
  run(s, 0.2);
  ok(gone(s, 77, 1) && !gone(s, 77, 9), 'it takes time to cross the row');
  run(s);
  ok(gone(s, 77, 9), 'and gets there');
}
{ // column and both diagonals
  let s = field(); put(s, 78, 5, 'crystal_col'); open(s, 77, 5);
  hit(s, 78, 5); run(s);
  ok(gone(s, 79, 5) && gone(s, 88, 5) && !gone(s, 78, 4) && !gone(s, 79, 6), 'a column crystal breaks its column only');
  s = field(); put(s, 79, 5, 'crystal_back'); open(s, 77, 5); open(s, 78, 5);
  hit(s, 79, 5); run(s);
  ok(gone(s, 80, 6) && gone(s, 81, 7) && gone(s, 78, 4), 'a back-slash crystal breaks down-right and up-left');
  ok(!gone(s, 80, 4) && !gone(s, 78, 6), 'but not the other diagonal');
  s = field(); put(s, 79, 5, 'crystal_slash'); open(s, 77, 5); open(s, 78, 5);
  hit(s, 79, 5); run(s);
  ok(gone(s, 80, 4) && gone(s, 81, 3) && gone(s, 78, 6) && !gone(s, 80, 6), 'a slash crystal breaks the other diagonal');
}
{ // a line sets off the next crystal, and its own line takes over
  const s = field();
  put(s, 77, 1, 'crystal_row'); put(s, 77, 6, 'crystal_col');
  hit(s, 77, 1);
  run(s);
  ok(gone(s, 80, 6) && gone(s, 85, 6), 'the second crystal cracked its column');
  const depths = rec(s).cracks.map(d => d.depth);
  ok(depths.includes(1) && depths.includes(2), 'depth counts the chain');
  ok(s.unlocked['crystal:chain'] === 1 && s.unlocked['crystal:line'] === 1, 'the chain is a first time');
}
{ // TNT in the line blows up, ore in the line is taken
  const s = field();
  put(s, 77, 1, 'crystal_row'); put(s, 77, 5, 'tnt'); put(s, 77, 8, 'gem', 99999);
  const coins = s.coins;
  hit(s, 77, 1);
  run(s, 3);
  ok(gone(s, 77, 8) && s.coins > coins, 'a gem in the line was taken and paid, however tough');
  ok(gone(s, 78, 5) && gone(s, 78, 4), 'the TNT went off and cleared around it');
  ok(s.unlocked['crystal:tnt'] === 1 && s.unlocked['crystal:ore'] === 1, 'both are first times');
}
{ // plain ground is hurt by a line, hard stuff only cracks; walls stop it
  const s = field();
  put(s, 77, 1, 'crystal_row'); put(s, 77, 4, 'stone', 3 * G.pickPower(s)); put(s, 77, 7, 'hard', 8 * G.pickPower(s) * 5);   // a line does 4 hits
  hit(s, 77, 1); run(s);
  ok(gone(s, 77, 4), 'stone breaks to a line');
  ok(!gone(s, 77, 7) && rec(s).hits.has('77,7') && at(s, 77, 7).hp < at(s, 77, 7).max, 'hard rock only cracks');
  const w = field(); put(w, 77, 1, 'crystal_col');
  for (let c = 0; c < G.COLS; c++) put(w, 80, c, 'boss', 999);
  put(w, 81, 1, 'dirt');
  hit(w, 77, 1); run(w);
  ok(gone(w, 79, 1) && !gone(w, 80, 1) && !rec(w).hits.has('80,1') && !gone(w, 81, 1), 'a wall (Big Rock) stops the line and is not hurt');
}
{ // the prism cracks all four lines
  const s = field();
  put(s, 80, 5, 'crystal_prism'); for (let r = 77; r < 80; r++) open(s, r, 5);
  hit(s, 80, 5); run(s);
  ok([[80, 0], [80, 9], [85, 5], [82, 7], [82, 3], [78, 7]].every(([r, c]) => gone(s, r, c)), 'row, column and both diagonals');
  ok(!gone(s, 81, 7) && !gone(s, 82, 6) && !gone(s, 81, 3), 'the prism is a star, not a flood');
}
{ // Rafeeqs set them off too
  const s = field();
  put(s, 77, 2, 'crystal_row'); s.rows[0][9] = null;   // nothing else for him to chew on up top
  s.coins = 1e9; s.total = 1e9; G.buy(s, 'crew'); s.up.crewPow = 40;
  let guard = 0; const e = ev(s);
  while (!gone(s, 77, 2) && guard++ < 6000) G.step(s, 0.05, e);
  run(s);
  ok(gone(s, 77, 2) && rec(s).cracks.some(d => d.src === 'crew'), 'a Rafeeq breaks it and the line follows');
}
{ // the lesson is placed, the same way every time
  for (let seed = 1; seed < 12; seed++) {
    G.seedRng(seed);
    const s = G.newState();
    const rows = {};
    for (const r of [77, 78, 79, 88]) rows[r] = G.genRow(s, r);
    const b = s.seen.crystalCol;
    ok(rows[77][b].t === 'crystal_col' && rows[77][b - 4].t === 'crystal_row' && rows[78][b].t === 'tnt' && rows[79][b].t === 'gem', `seed ${seed}: crystal, crystal, TNT, gem`);
    ok(rows[88].some(c => c.t === 'crystal_prism'), `seed ${seed}: a prism is placed`);
  }
  G.setRng(null);
}
{ // the layer holds crystals of every kind, and they are counted as content
  G.seedRng(7);
  const s = G.newState(); const n = {};
  for (let r = 80; r < 99; r++) for (const c of G.genRow(s, r)) n[c.t] = (n[c.t] || 0) + 1;
  const kinds = Object.keys(n).filter(k => k.startsWith('crystal'));
  ok(kinds.length >= 4, `at least four kinds in 19 rows (got ${kinds})`);
  const u = G.unlocks();
  ok(u.byId['type:crystal_row'] && u.byId['type:crystal_prism'] && !u.byId['type:crystal_col'] && u.byId['crystal:tnt'], 'content is listed');
  G.setRng(null);
}
{ // a number bends the ground
  const undo = G.setParam('crystal.row', 0.3);
  G.seedRng(3);
  const s = G.newState(); let k = 0;
  for (let r = 80; r < 90; r++) for (const c of G.genRow(s, r)) if (c.t === 'crystal_row') k++;
  undo(); G.setRng(null);
  ok(k > 15, `crystal.row moves the share (${k})`);
}
{ // saving: crystals in the ground survive a round trip (a line in flight is not saved, like a blast); a save from before loads
  const s = field(); put(s, 77, 1, 'crystal_row'); put(s, 77, 6, 'crystal_prism');
  const back = G.deserialize(G.serialize(s));
  ok(back.rows[1][1].t === 'crystal_row' && back.rows[1][6].t === 'crystal_prism', 'crystals are saved');
  hit(back, 77, 1); run(back, 3);
  ok(gone(back, 77, 9) && gone(back, 85, 6), 'and work after loading (the prism was set off by the row)');
  const loaded = G.deserialize(G.serialize(G.newState()));
  ok(loaded && loaded.rows.length === G.KEEP_ROWS, 'a save from before loads (the feature has no state slice of its own)');
}
if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('crystal: ok');
