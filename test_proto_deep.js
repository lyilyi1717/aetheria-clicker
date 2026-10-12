// Dig: the Deep (proto/features/deep). Run: node test_proto_deep.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const D = (t, hp = 1) => ({ t, hp, max: hp, s: 0 });
const collect = () => { const log = []; const ev = (k, d) => log.push([k, d]); ev.log = log; return ev; };
const has = (ev, k) => ev.log.some(x => x[0] === k);
const run = (s, secs, ev) => { for (let i = 0; i < secs / 0.05; i++) G.step(s, 0.05, ev); };

// a field of one-hit dirt at row `top`, with a hard floor so nothing scrolls; best set so the law of layer `L` is in force
function field(top, best) {
  G.seedRng(1);
  const s = G.newState();
  s.top = top; s.best = best;
  s.rows = [];
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows.push(Array.from({ length: G.COLS }, () => D('dirt')));
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;
  s.rows[0][9] = D('hard', 1e12);
  s.rows[12] = s.rows[12].map(() => D('hard', 1e12));
  s.queue = []; s.pools = {};
  return s;
}
const A = (s, r, c) => G.cellAt(s, r, c);

{ // layers, laws, content
  const L = G.layersOf('desert');
  ok(L.slice(4).map(l => l.id).join() === 'black,living,angry,hot', 'four layers below the crystal cave');
  ok(L.slice(4).every(l => l.law && G.t(l.name) !== l.name), 'each has a law and a name');
  const u = G.unlocks().byId;
  for (const t of ['mushroom', 'lantern', 'moonstone', 'torch_crate', 'amber', 'moss', 'grump', 'thief', 'ruby', 'lava', 'lavaglass', 'ember']) ok(u['type:' + t], t + ' is counted');
  ok(u.layer8 && u['deep:lava'] && u['boss:L7'], 'layers, firsts and Big Rocks are counted');
}
{ // placed lessons
  G.seedRng(5);
  const s = G.newState();
  for (let r = s.rows.length; r < 215; r++) s.rows.push(G.genRow(s, r));
  const row = r => s.rows[r].map(c => c.t);
  ok(row(101).includes('mushroom') && row(102).includes('moonstone') && row(124).includes('lantern'), 'dark: mushroom, moonstone, a lantern above the Rock');
  ok(row(126).includes('torch_crate') && row(149).includes('torch_crate'), 'living: torch crates, one above the Rock');
  ok(row(151).includes('grump') && row(151).includes('tnt'), 'angry: a grump beside TNT');
  ok(row(177).includes('lava') && row(197).includes('water'), 'hot: lava, and water above the Rock');
}
{ // THE BLACK: only light shows anything
  const s = field(100, 101), ev = collect();
  G.step(s, 0.05, ev);
  ok(G.frontLayer(s).id === 'black' && has(ev, 'deepEnter'), 'arrival is announced');
  let m = G.visibleMask(s);
  ok(m.every(r => r.every(x => !x)) || !m[5][4], 'a deep cell is dark');
  s.rows[1][4] = D('mushroom');
  m = G.visibleMask(s);
  ok(m[1][4], 'a mushroom shines by itself');
  ok(!m[3][4], 'but lights nothing until broken');
  s.deep.pick = null;
  ok(G.swing(s, 101, 4, ev), 'hit the mushroom');
  s.deep.pick = null;
  m = G.visibleMask(s);
  ok(has(ev, 'deepGlow') && m[2][4] && m[3][5], 'breaking it lights the area');
  ok(!m[8][1], 'far cells stay dark');
  s.deep.bc += G.PARAMS.deep.mushLife + 1;
  m = G.visibleMask(s);
  ok(!m[3][5] && !m[2][4], 'the light fades after enough blocks ');
  // the Lantern relic reveals for good
  s.relics.lamp = 1; s.rows[6][3] = D('dirt'); s.rows[6][4] = null; s.deep.pick = null;
  m = G.visibleMask(s);
  ok(m[6][3] && s.rows[6][3].shown, 'a perk reveal is kept');
  s.relics.lamp = 0; m = G.visibleMask(s);
  ok(m[6][3], 'and stays shown');
}
{ // the Black Rock needs a light
  const s = field(124, 125);
  s.rows[1] = s.rows[1].map(() => ({ t: 'boss', hp: 1, max: 1, s: 0 }));
  s.top = 124;
  const dark = G.PARAMS.deep.rockDark;
  const dmg0 = G.fold('damage', s, 10, s.rows[1][0], 'you', {}, 125);
  ok(Math.abs(dmg0 - 10 * dark) < 1e-9, 'in the dark the Rock takes ' + dark);
  s.deep.glows.push({ r: 124, c: 1, rad: 3, until: s.deep.bc + 50 });
  ok(G.fold('damage', s, 10, s.rows[1][0], 'you', {}, 125) === 10, 'with a light it takes the full hit');
}
{ // THE LIVING ROCK: grows back from the edges, not near a torch, counted in blocks
  const s = field(130, 131), ev = collect();
  const P = G.PARAMS.deep;
  for (let k = 0; k < P.every; k++) { s.rows[1][k] = D('dirt'); G.swing(s, 130, k, ev); }
  // swing at row 130 (open) is not possible; break row 131 cells instead
  const s2 = field(130, 131), ev2 = collect();
  for (let k = 0; k < P.every; k++) G.swing(s2, 131, k, ev2);
  ok(has(ev2, 'deepRegrow'), 'after ' + P.every + ' breaks something grew back');
  const mossAt = [];
  for (let i = 0; i < s2.rows.length; i++) s2.rows[i].forEach((c, j) => { if (c && c.t === 'moss') mossAt.push([s2.top + i, j]); });
  ok(mossAt.length === P.batch, 'moss is in the grid');
  // a torch keeps it clear
  const s3 = field(130, 131), ev3 = collect();
  s3.deep.torches.push({ r: 131, c: 4 });
  for (let c = 0; c < G.COLS; c++) for (const i of [1, 2]) s3.rows[i][c] = null;
  s3.rows[3] = s3.rows[3].map(() => D('dirt'));
  s3.deep.grow = P.every - 1;
  s3.rows[4][0] = D('dirt');
  G.swing(s3, 133, 0, ev3);
  const near = [];
  for (let i = 0; i < s3.rows.length; i++) s3.rows[i].forEach((c, j) => { if (c && c.t === 'moss') near.push([s3.top + i, j]); });
  ok(near.every(([r, c]) => !(Math.abs(r - 131) <= P.torchRad && Math.abs(c - 4) <= P.torchRad)), 'nothing grows next to a torch');
  // torch crate
  const s4 = field(130, 131), ev4 = collect();
  s4.rows[1][3] = D('torch_crate');
  G.swing(s4, 131, 3, ev4);
  ok(has(ev4, 'deepTorch') && s4.deep.torches.length === 1, 'a torch crate leaves a torch');
}
{ // the Living Rock grows back unless a torch is near
  const s = field(149, 150), ev = collect();
  s.rows[1] = s.rows[1].map(() => ({ t: 'boss', hp: 1, max: 1, s: 0 }));
  s.rows[0] = s.rows[0].map(() => null);
  s.boss = { row: 150, hp: 1000, max: 1000, weak: 0, wt: 9 };
  G.step(s, 0.05, ev);
  s.boss.hp = 800; G.step(s, 0.05, ev);
  ok(s.boss.hp > 800 && has(ev, 'deepRock'), 'the Rock grew some hp back');
  const s2 = field(149, 150), ev2 = collect();
  s2.rows[1] = s2.rows[1].map(() => ({ t: 'boss', hp: 1, max: 1, s: 0 }));
  s2.boss = { row: 150, hp: 1000, max: 1000, weak: 0, wt: 9 };
  s2.deep.torches.push({ r: 149, c: 2 });
  G.step(s2, 0.05, ev2); s2.boss.hp = 800; G.step(s2, 0.05, ev2);
  ok(s2.boss.hp === 800, 'a torch near the Rock stops it');
}
{ // THE ANGRY LAYER
  const P = G.PARAMS.deep;
  const grumpy = (seedWant) => { // find a seed whose first hit does the wanted thing
    for (let sd = 1; sd < 400; sd++) {
      const s = field(160, 161), ev = collect();
      G.seedRng(sd);
      s.coins = 1e6; s.diggers.push({ c: 5, r: 161, tc: -1, tr: -1, cd: 0, swing: 0 });
      s.rows[1][4] = D('grump', 1000);
      G.swing(s, 161, 4, ev);
      if (has(ev, seedWant)) return { s, ev };
    }
    return null;
  };
  const sh = grumpy('deepShove');
  ok(sh && sh.s.rows[1].filter(c => c && c.t === 'grump').length === 1, 'a hit grump can shove the row');
  const st = grumpy('deepStone');
  ok(st && st.s.diggers[0].cd >= P.dizzy && st.ev.log.some(x => x[0] === 'mood' && x[1].mood === 'dizzy'), 'or throw a stone that makes a Rafeeq dizzy');
  const sl = grumpy('deepSteal');
  ok(sl && sl.s.coins < 1e6, 'or steal coins');
  if (sl) {
    let th = null;
    sl.s.rows.forEach((row, i) => row.forEach((c, j) => { if (c && c.t === 'thief') th = [sl.s.top + i, j]; }));
    ok(th, 'into a thief block');
    const before = sl.s.coins;
    sl.s.rows[th[0] - sl.s.top][th[1]].hp = 1; sl.s.rows[th[0] - sl.s.top - 1][th[1]] = null;
    G.swing(sl.s, th[0], th[1], sl.ev);
    ok(sl.s.coins - before >= (1e6 - before) * 1.2, 'breaking it pays the coins back with interest');
  }
  // a grump that breaks flies into TNT
  const s = field(160, 161), ev = collect();
  s.rows[1][4] = D('grump'); s.rows[1][6] = D('tnt'); s.rows[2][6] = D('copper');
  G.swing(s, 161, 4, ev);
  run(s, 1, ev);
  ok(has(ev, 'deepThrow') && has(ev, 'blast'), 'a broken grump is thrown into the TNT');
  // the Rock keeps coins and pays them back
  const b = field(174, 175), evb = collect();
  b.rows[1] = b.rows[1].map(() => ({ t: 'boss', hp: 1, max: 1, s: 0 }));
  b.coins = 1e6; b.boss = { row: 175, hp: 1000, max: 1000, weak: 0, wt: 9 };
  G.step(b, 0.05, evb); b.boss.hp = 800; G.step(b, 0.05, evb);
  ok(b.coins < 1e6 && b.deep.owed > 0 && has(evb, 'deepRock'), 'the Angry Rock keeps coins');
  const kept = b.deep.owed;
  G.run('bossDown', b, 175);
  ok(b.coins >= 1e6 - kept + kept * P.rockBack - 1, 'and pays them back when it breaks');
}
{ // THE HOT LAYER
  const s = field(180, 181), ev = collect();
  s.rows[1][4] = D('lava'); s.rows[1][3] = D('copper'); s.rows[1][5] = D('tnt');
  s.rows[2][4] = D('dirt'); s.rows[2][3] = D('gold');
  G.swing(s, 181, 4, ev);
  run(s, 4, ev);
  ok(has(ev, 'deepLava') && Object.keys(s.deep.lava).length > 0, 'lava flows');
  ok(A(s, 181, 3) && A(s, 181, 3).t === 'silver', 'copper beside it became silver');
  ok(has(ev, 'deepBoom') && has(ev, 'blast'), 'the barrel went off');
  ok(A(s, 182, 3) === null || A(s, 182, 3).t !== 'gold', 'gold was burnt up or broken by the blast');
  // water meets lava: glass
  const w = field(180, 181), evw = collect();
  w.deep.lava['181,2'] = w.deep.bc + 99; w.rows[1][2] = null;
  w.pools['181,2'] = w.t + 20;
  G.step(w, 0.05, evw);
  ok(A(w, 181, 2) && A(w, 181, 2).t === 'lavaglass' && has(evw, 'deepGlass'), 'water turns lava to glass');
  // glass cracks in lines
  for (let i = 2; i < 12; i++) w.rows[i][2] = D('hard', 1e12); w.rows[1][2].hp = 1; w.rows[1][5] = D('dirt'); w.rows[1][8] = D('dirt');
  G.swing(w, 181, 2, evw);
  run(w, 2, evw);
  const gone = (r, c) => evw.log.some(x => x[0] === 'break' && x[1].r === r && x[1].c === c);
  ok(gone(181, 5) && gone(181, 8), 'glass cracks along its row');
  // lava cools after so many blocks
  const c = field(180, 181);
  c.deep.lava['181,1'] = c.deep.bc + G.PARAMS.deep.crust;
  c.deep.bc += G.PARAMS.deep.crust;
  G.step(c, 0.05);
  ok(Object.keys(c.deep.lava).length === 0, 'standing lava cools after enough blocks');
  // the hot Rock
  const r = field(199, 200);
  r.rows[1] = r.rows[1].map(() => ({ t: 'boss', hp: 1, max: 1, s: 0 }));
  const cell = r.rows[1][0];
  ok(Math.abs(G.fold('damage', r, 10, cell, 'you', {}, 200) - 10 * G.PARAMS.deep.hotMult) < 1e-9, 'a dry hot Rock takes little');
  r.pools['198,3'] = r.t + 10;
  ok(G.fold('damage', r, 10, cell, 'you', {}, 200) === 10 * G.PARAMS.deep.coolMult, 'a wet one takes a lot');
}
{ // saves: round trip and an old save without the slice
  const s = field(100, 101);
  s.deep.glows.push({ r: 102, c: 2, rad: 2, until: 30 }); s.deep.lava['105,1'] = 9;
  const back = G.deserialize(G.serialize(s));
  ok(back.deep.glows.length === 1 && back.deep.lava['105,1'] === 9, 'the slice round-trips');
  const o = JSON.parse(G.serialize(s)); delete o.deep;
  const old = G.deserialize(JSON.stringify(o));
  ok(old && old.deep && old.deep.glows.length === 0 && old.deep.bc === 0, 'an old save gets the default slice');
  const n = G.newState(); n.deep.bc = 5;
  G.reset(n, 'site');
  ok(n.deep.bc === 0, 'a New Site starts the Deep over');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('deep: ok');
