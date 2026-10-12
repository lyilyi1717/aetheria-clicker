// Dig: the twelve paired relics (proto/features/relics2). Run: node test_proto_relics2.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const P = G.PARAMS.relics2;
const IDS = ['hop', 'twin', 'fling', 'magnet', 'fire', 'fuse', 'rang', 'fall', 'borrow', 'fazaa', 'garden', 'melt'];

const cell = (t, hp = 10) => ({ t, hp, max: hp, s: 0 });
// a dig whose ground is all dirt of one strength, with the given relics held
function field(relics = {}, hp = 10) {
  G.seedRng(7);
  const s = G.newState();
  for (let i = 0; i < s.rows.length; i++) for (let c = 0; c < G.COLS; c++) s.rows[i][c] = cell('dirt', hp);
  s.relics = { ...relics };
  for (const id of ['fuse', 'garden']) if (relics[id]) s.relics2.gift[id] = relics[id];   // no presents unless a test asks
  return s;
}
const log = () => { const L = []; const ev = (k, d) => L.push([k, d]); ev.of = k => L.filter(x => x[0] === k).map(x => x[1]); return ev; };
const run = (s, secs, ev) => { for (let i = 0; i < Math.round(secs / 0.05); i++) G.step(s, 0.05, ev); };
const count = (s, t) => s.rows.flat().filter(x => x && x.t === t).length;
const noCrit = () => G.setParam('crits.chance', 0);

{ // what ships
  const u = G.unlocks();
  for (const id of IDS) {
    const r = G.RELICS[id];
    ok(r && r.owner === 'relics2' && r.max === 3, `${id} is registered with three levels`);
    ok(r.pair && G.RELICS[r.pair].pair === id, `${id} and ${r && r.pair} name each other`);
    ok(u.byId['relic:' + id] && u.byId[`relic:${id}:3`], `${id} is counted as content`);
    for (let lv = 1; lv <= 3; lv++) {
      const d = G.t('r_' + id + '_d', r.vars(lv));
      ok(G.hasString(`r_${id}_d${lv}`) && d.length > 15 && !d.includes('{') && !d.startsWith('r_'), `${id} level ${lv} has a whole sentence (${d})`);
    }
  }
  ok(Object.keys(G.RELICS).filter(id => G.RELICS[id].owner === 'relics2').length === 12, 'twelve relics');
}

{ // the pool grows with progress, and a held relic brings its partner
  const s = field();
  const pool = () => Object.keys(G.RELICS).filter(id => IDS.includes(id) && G.RELICS[id].when(s));
  ok(pool().length === 0, 'the first chest offers none of the twelve');
  const find = n => { for (let i = 0; i < n; i++) s.unlocked['relic:x' + i] = 1; };
  find(P.openHop - 1); ok(pool().length === 0, 'nor the second');
  find(P.openHop);
  ok(pool().join() === 'hop,twin', 'after two relics: the first pair');
  find(P.openFire); ok(pool().join() === 'hop,twin,fling,magnet,fire', 'Fire Barrels wait for the first TNT');
  s.unlocked['type:tnt'] = 1;
  ok(pool().join() === 'hop,twin,fling,magnet,fire,fuse', 'after six: three pairs');
  find(P.openCrew); ok(!pool().includes('borrow'), 'no Rafeeqs yet');
  s.up.crew = 2;
  ok(pool().includes('borrow') && pool().includes('fazaa') && !pool().includes('rang'), 'the Rafeeq pair needs Rafeeqs; the deep pairs wait');
  s.unlocked.layer2 = 1;
  ok(pool().includes('rang') && pool().includes('fall') && !pool().includes('melt'), 'past the first Big Rock: Boomerang and Landslide');
  const t = field();
  t.relics.melt = 1;
  ok(G.RELICS.garden.when(t) && !G.RELICS.melt.when(t), 'holding one half opens the other half at once');
  t.relics = { fazaa: 1 }; t.up.crew = 0;
  ok(!G.RELICS.borrow.when(t), 'but never a Rafeeq relic with no Rafeeqs');

  // the draft: the partner shows up about pairChance of the time more than by luck
  const d = field({ hop: 1 });
  for (const k of ['relic:a', 'relic:b', 'relic:c', 'relic:d', 'relic:e', 'relic:f', 'relic:g', 'relic:h']) d.unlocked[k] = 1;
  d.unlocked.layer2 = 1; d.unlocked['type:tnt'] = 1; d.up.crew = 2; d.chestsOpened = 1;
  let hits = 0, dup = 0, short = 0;
  const N = 2000;
  for (let i = 0; i < N; i++) { const o = G.rollDraft(d); if (o.includes('twin')) hits++; if (new Set(o).size !== o.length) dup++; if (o.length !== 3) short++; }
  const n = Object.keys(G.RELICS).filter(id => G.rel(d, id) < G.RELICS[id].max && (!G.RELICS[id].when || G.RELICS[id].when(d))).length;
  const luck = 3 / n, want = P.pairChance + (1 - P.pairChance) * luck;
  ok(Math.abs(hits / N - want) < 0.04, `the partner is on ${Math.round(hits / N * 100)}% of cards (by luck ${Math.round(luck * 100)}%, wanted ${Math.round(want * 100)}%)`);
  ok(dup === 0 && short === 0, 'a card never shows a relic twice and still has three');
  const undo = G.setParam('relics2.pairChance', 0);
  hits = 0; for (let i = 0; i < N; i++) if (G.rollDraft(d).includes('twin')) hits++;
  ok(Math.abs(hits / N - luck) < 0.04, 'with pairChance 0 the draft is the plain one');
  undo();
}

{ // hop: the hit jumps to the same kind
  const undo = noCrit();
  const s = field({ hop: 1 });
  s.rows[0][4] = cell('copper', 1); s.rows[1][5] = cell('copper', 50); s.rows[0][5] = cell('stone', 50);
  const ev = log();
  G.swing(s, 0, 4, ev); run(s, 0.3, ev);
  const j = ev.of('relics2Hop');
  ok(j.length === 1 && j[0].r === 1 && j[0].c === 5, 'it jumps to the copper, not to the nearer stone');
  ok(Math.abs((50 - s.rows[1][5].hp) - G.pickPower(s) * P.hopDmg) < 1e-9, 'and hits it for the hop share of the swing');
  const s2 = field({ hop: 2 });
  s2.rows[0][4] = cell('dirt', 1);
  const ev2 = log(); G.swing(s2, 0, 4, ev2); run(s2, 0.5, ev2);
  ok(ev2.of('relics2Hop').length === 2, 'level 2 jumps twice');
  const s3 = field({ hop: 3 }, 0.5);
  const ev3 = log(); G.swing(s3, 0, 4, ev3); run(s3, 2, ev3);
  ok(ev3.of('relics2Hop').length === P.hopMax, `level 3 keeps jumping while it breaks (${ev3.of('relics2Hop').length}), up to the cap`);
  undo();
}

{ // twin: a charged pick copies what it breaks
  const undo = noCrit();
  const s = field({ twin: 1 }, 1);
  const ev = log();
  for (let c = 0; c < P.twinEvery; c++) { ok(!G.relics2TwinReady(s), 'not charged yet'); G.swing(s, 0, c, ev); }
  ok(G.relics2TwinReady(s) && ev.of('relics2Twin').length === 0, 'five blocks charge the pick; plain dirt gets no twin');
  G.swing(s, 0, 5, ev);
  ok(G.relics2TwinReady(s), 'the charge waits');
  s.rows[0][7] = cell('gold', 1);
  G.swing(s, 0, 7, ev);
  ok(count(s, 'gold') === 1 && ev.of('relics2Twin').length === 1 && !G.relics2TwinReady(s), 'the next ore broken gets a twin, and the charge is spent');
  const tw = ev.of('relics2Twin')[0];
  ok(Math.abs(tw.r - 0) + Math.abs(tw.c - 7) === 1 && s.rows[tw.r][tw.c].hp > 1, 'the twin is next door and is a whole new block');
  const s2 = field({ twin: 2 }, 1); s2.relics2.n = 9; s2.rows[0][4] = cell('tnt', 1);
  G.swing(s2, 0, 4); ok(count(s2, 'tnt') === 2, 'level 2: two twins, and TNT counts');
  const s3 = field({ twin: 3 }, 1); s3.relics2.n = 9; s3.rows[0][4] = cell('chest', 1);
  G.swing(s3, 0, 4); ok(count(s3, 'chest') === 0 && G.relics2TwinReady(s3), 'a chest never gets a twin');
  s3.rows[0][6] = cell('oil', 1); G.swing(s3, 0, 6); ok(count(s3, 'oil') === 2, 'level 3: oil does');
  undo();
}

{ // fling and magnet
  const undo = noCrit();
  const s = field({ fling: 1 }, 20); s.up.pick = 20;   // a pick strong enough that the cap (throwCap) does not bind
  s.rows[0][4] = cell('dirt', 1); s.rows[0][4].max = 20;
  const ev = log();
  G.swing(s, 0, 4, ev);
  const f = ev.of('relics2Fling');
  ok(f.length === 1 && Math.abs(f[0].c - 4) <= P.flingSide && f[0].r <= P.flingDown, 'a broken block flies to a block nearby');
  ok(ev.of('relics2Thud').length === 0, 'it is in the air first');
  run(s, 0.5, ev);
  ok(ev.of('relics2Thud').length === 1 && s.rows[f[0].r][f[0].c].hp === 20 - 20 * P.flingFrac, 'and lands for a share of its own strength');
  const m = field({ fling: 1, magnet: 1 }, 20);
  m.rows[0][4] = cell('dirt', 1); m.rows[3][7] = cell('silver', 99);
  const evm = log(); m.hits = 1; G.swing(m, 0, 4, evm);
  ok(evm.of('relics2Fling')[0].r === 3 && evm.of('relics2Fling')[0].c === 7, 'with the Magnet it lands on ore');
  const b = field({ fling: 2 }, 1); b.rows[0][4].max = 20;
  const evb = log(); G.swing(b, 0, 4, evb); run(b, 2, evb);
  ok(evb.of('relics2Fling').length === 2, 'level 2: a heavy rock breaks what it lands on, and that flies too (one bounce)');
  const b1 = field({ fling: 2 }, 1); const evb1 = log(); G.swing(b1, 0, 4, evb1); run(b1, 2, evb1);
  ok(evb1.of('relics2Fling').length === 1, 'a rock that breaks nothing does not bounce');
  const b3 = field({ fling: 3 }, 1); for (const x of b3.rows.flat()) x.max = 10;   // cracked ground
  const ev3 = log(); G.swing(b3, 0, 4, ev3); run(b3, 3, ev3);
  ok(ev3.of('relics2Fling').length === 4, 'level 3: three bounces');

  const g = field({ magnet: 1 });
  g.rows[0][1] = cell('gold'); g.rows[4][6] = cell('gem'); g.rows[2][3] = cell('chest');
  g.hits = P.magEvery - 1;
  const evg = log(); G.swing(g, 0, 6, evg);
  const pl = evg.of('relics2Pull');
  ok(pl.length === 1 && pl[0].t === 'gem' && g.rows[3][6].t === 'gem' && g.rows[4][6].t === 'dirt', 'every 4th hit the nearest ore moves one step toward the pick');
  G.swing(g, 0, 6, evg); ok(evg.of('relics2Pull').length === 1, 'not on the other hits');
  g.relics.magnet = 3; g.hits = P.magEvery - 1; G.swing(g, 0, 6, evg);
  ok(evg.of('relics2Pull').length === 4 && g.rows[2][3].t !== 'chest', 'level 3 pulls every treasure, the chest too');
  ok(count(g, 'gold') + count(g, 'gem') + count(g, 'chest') === 3 && s.rows.flat().every(x => x !== undefined), 'nothing is lost or made by pulling');
  undo();
}

{ // fire and Fire Barrels
  const undo = noCrit();
  const s = field({ fire: 1 }, 1000);
  s.rows[0][4] = cell('dirt', 1);
  s.rows[0][5] = cell('hard', 1000);
  const ev = log();
  G.swing(s, 0, 4, ev);
  ok(s.rows[1][4].f === P.fireHeat[1] && s.rows[0][3].f > 0 && !s.rows[0][5].f, 'a break lights the soft ground around it, not hard rock');
  const coins = s.coins;
  run(s, P.fireTick * (P.fireTicks + 2), ev);
  const burned = 1000 - s.rows[1][4].hp;
  ok(Math.abs(burned - G.pickPower(s) * P.fireDmg * P.fireTicks) < 1e-6 && s.rows[1][4].ch === 1 && !s.rows[1][4].f, 'it burns for six ticks, then is charred');
  ok(!G.relics2Ignite(s, s.top + 1, 4, 3), 'a charred block does not burn again');
  ok(s.coins === coins, 'a fire that breaks nothing pays nothing');
  const w = field({ fire: 1 }, 1);
  G.swing(w, 0, 4); run(w, 3);
  const gone = w.rows.flat().filter(x => x === null).length;
  ok(gone >= 6 && gone <= 13, `in weak ground the fire spreads two steps and stops (${gone} blocks gone)`);
  const h = field({ fire: 2 }, 1); h.rows[0][5] = cell('hard', 1000);
  G.swing(h, 0, 4); ok(h.rows[0][5].f === P.fireHeat[2], 'level 2 burns hard rock');

  const z = field({ fuse: 1 }, 1000);
  z.rows[2][4] = cell('tnt', 1); z.rows[0][4] = cell('dirt', 1); z.rows[1][4] = null;
  const evz = log();
  G.breakCell(z, 2, 4, 'you', evz); run(z, 0.4, evz);
  ok(evz.of('blast').length === 1 && evz.of('relics2Fire').length === 1 && z.rows.flat().filter(x => x && x.f > 0).length >= 8, 'TNT leaves a ring of fire');
  const y = field({ fuse: 1 }, 1000);
  y.rows[0][5] = cell('tnt', 1);
  ok(G.relics2Ignite(y, 0, 4, 2), 'a block is lit');
  const evy = log(); run(y, 0.8, evy);
  ok(evy.of('blast').length === 1 && y.rows[0][5] === null, 'and its fire sets off the TNT beside it');
  const x = field({ fire: 1 }, 1000); x.rows[0][5] = cell('tnt', 1);
  G.relics2Ignite(x, 0, 4, 2); run(x, 0.8);
  ok(x.rows[0][5] && x.rows[0][5].t === 'tnt', 'without Fire Barrels the TNT sits there');
  const q = field({ fuse: 0 }, 1); q.relics = { fuse: 1 };
  const evq = log(); G.step(q, 0.05, evq);
  ok(count(q, 'tnt') === 1 && evq.of('relics2Gift').length === 1, 'taking Fire Barrels gives one barrel');
  G.step(q, 0.05, evq); ok(count(q, 'tnt') === 1, 'once');
  q.relics.fuse = 2; G.step(q, 0.05, evq); ok(evq.of('relics2Gift').length === 2, 'and one more at level 2');
  undo();
}

{ // boomerang (the one with a drawback) and landslide
  const undo = noCrit();
  const s = field({ rang: 1 }, 100);
  const ev = log();
  ok(G.swing(s, 0, 0, ev), 'the throw');
  const d = G.pickPower(s) * P.rangMain, side = d * P.rangDmg, near = (a, b) => Math.abs(a - b) < 1e-9;
  ok(!G.swing(s, 0, 0, ev) && near(s.rows[0][0].hp, 100 - d), 'the thrown hit is harder, and there is no swing while the pick is in the air');
  run(s, P.rangTime + 0.05, ev);
  ok([1, 2, 3, 4].every(c => near(s.rows[0][c].hp, 100 - 2 * side)) && s.rows[0][5].hp === 100, 'it hits four blocks on the way out and again on the way back');
  ok(G.swing(s, 0, 0, ev), 'then you can swing again');
  ok(ev.of('relics2Rang').length === 2 && ev.of('relics2Rang')[0].dir === 1, 'it flies toward the blocks');
  const s2 = field({ rang: 2 }, 100); G.swing(s2, 0, 0); run(s2, 0.4);
  ok(near(s2.rows[0][9].hp, 100 - 2 * side), 'level 2 flies to the wall');
  const s3 = field({ rang: 3 }, 100); G.swing(s3, 0, 0); run(s3, 0.4);
  ok(near(s3.rows[0][9].hp, 100 - side) && near(s3.rows[1][9].hp, 100 - side), 'level 3 comes back along the row below');
  const lone = field({ rang: 1 }, 100);
  for (let c = 0; c < G.COLS; c++) if (c !== 4) lone.rows[0][c] = null;
  G.swing(lone, 0, 4); ok(G.swing(lone, 0, 4), 'with nothing beside the block it is a plain hit at full speed');

  const f = field({ fall: 1 }, 100); f.up.pick = 20;
  f.rows[1][4] = null; f.rows[2][4] = null;
  const evf = log(); run(f, 0.5, evf);
  ok(f.rows[0][4] === null && f.rows[2][4] && f.rows[2][4].t === 'dirt', 'a block with nothing under it falls to the bottom of the hole');
  const th = evf.of('relics2Thud');
  ok(th.length === 1 && th[0].fall === 2 && f.rows[2][4].hp === 100 - 100 * P.fallFrac && f.rows[3][4].hp === 100 - 100 * P.fallFrac, 'and cracks itself and what it lands on');
  ok(!f.rows[2][4].fd, 'the mark of the fall is cleared');
  const f2 = field({ fall: 2 }, 100);
  f2.rows[0][4] = cell('tnt', 1); f2.rows[1][4] = null;
  const ev2 = log(); run(f2, 0.6, ev2);
  ok(ev2.of('blast').length === 1, 'level 2: falling TNT goes off');
  { // with a weak pick the fall is capped at throwCap hits of that pick: the ground cannot dig itself
    const w = field({ fall: 1 }, 1e6);
    w.rows[1][4] = null; w.rows[2][4] = null;
    run(w, 0.5);
    ok(Math.abs(w.rows[3][4].hp - (1e6 - G.pickPower(w) * P.throwCap)) < 1e-3, 'a weak pick caps what a falling block does');
  }
  { // a block that lands on a Big Rock hurts it, but only a little
    const b = field({ fall: 1 }, 100); b.up.pick = 20;
    for (let c = 0; c < G.COLS; c++) { b.rows[2][c] = { t: 'boss', hp: 1, max: 1, s: c }; b.rows[1][c] = null; }
    b.boss = { row: 2, hp: 1000, max: 1000, weak: 9, wt: 99 };
    b.rows[0][4] = cell('dirt', 100); for (let c = 0; c < G.COLS; c++) if (c !== 4) b.rows[0][c] = null;
    run(b, 0.4);
    ok(Math.abs(b.boss.hp - (1000 - 100 * P.fallFrac * P.wallShare)) < 1e-6, 'a block that lands on a Big Rock takes a small bite of it');
  }
  const none = field({}, 100); none.rows[1][4] = null; run(none, 0.5);
  ok(none.rows[0][4] !== null, 'without the relic nothing falls');
  const boss = field({ fall: 1 }, 100);
  for (let c = 0; c < G.COLS; c++) { boss.rows[0][c] = { t: 'boss', hp: 1, max: 1, s: c }; boss.rows[1][c] = null; }
  run(boss, 0.5); ok(boss.rows[0][0] && boss.rows[0][0].t === 'boss', 'a Big Rock does not fall');
  undo();
}

{ // the Rafeeq pair
  const undo = noCrit();
  const s = field({ borrow: 1 }, 1e6);
  s.diggers.push({ c: 3, r: s.top, tc: 3, tr: s.top, cd: 0, swing: 0 });
  s.up.crew = 1;
  const ev = log();
  const hits0 = s.hits;
  run(s, 6.05 / G.crewRate(s) + 0.2, ev);
  ok(ev.of('relics2Borrow').length === 1 && s.hits === hits0 + 1, 'every 6th Rafeeq hit is a swing of your pick');
  ok(ev.of('swing').length === 1 && s.relics2.lt === null, 'it is a real swing, but it does not count as where you are digging');
  const br = field({ borrow: 1, rang: 1 }, 1e6);
  br.diggers.push({ c: 3, r: br.top, tc: 3, tr: br.top, cd: 0, swing: 0 });
  const evb = log(); run(br, 6.05 / G.crewRate(br) + 0.1, evb);
  ok(evb.of('relics2Rang').length === 1 && G.swing(br, 0, 8), 'a borrowed swing throws the boomerang and does not make you wait');

  const z = field({ fazaa: 1 }, 1e6);
  for (const c of [0, 5, 9]) z.diggers.push({ c, r: z.top, tc: c, tr: z.top, cd: 0, swing: 0 });
  G.swing(z, 0, 6); G.step(z, 0.05);
  ok(z.diggers.filter(d => d.tc === 6 && d.tr === 0).length === 2 && z.diggers[0].tc === 0, 'two Rafeeqs (the nearest) go to your block');
  z.relics.fazaa = 2; G.step(z, 0.05);
  ok(z.diggers.every(d => d.tc === 6), 'level 2: all of them');
  const free = field({ fazaa: 2 }, 1e6); free.diggers.push({ c: 0, r: free.top, tc: 0, tr: free.top, cd: 9, swing: 0 });
  G.swing(free, 0, 6); run(free, P.fazaaHold + 0.3); free.diggers[0].tr = 0; free.diggers[0].tc = 1; G.step(free, 0.05);
  ok(free.diggers[0].tc === 1, 'once you stop, a Rafeeq keeps his own job');
  const beat = field({ fazaa: 3 }, 1e6);
  beat.diggers.push({ c: 6, r: beat.top, tc: 6, tr: beat.top, cd: 99, swing: 0 });
  G.swing(beat, 0, 6); const a = beat.rows[0][6].hp; G.swing(beat, 0, 6);
  ok(Math.abs((a - beat.rows[0][6].hp) - (G.pickPower(beat) + G.crewPower(beat))) < 1e-9, 'level 3: a Rafeeq at your block hits with you on the beat');
  undo();
}

{ // garden and melting pot
  const s = field({ garden: 1 }, 1);
  s.rows[5][5] = cell('silver', 50);
  const ev = log();
  for (let c = 0; c < G.COLS; c++) G.breakCell(s, 0, c, 'crew', ev);
  for (let c = 0; c < P.growEvery - G.COLS - 1; c++) G.breakCell(s, 1, c, 'crew', ev);
  ok(count(s, 'silver') === 1, 'not before the count is full');
  G.breakCell(s, 1, 9, 'crew', ev);
  const g = ev.of('relics2Grow');
  ok(count(s, 'silver') === 2 && g.length === 1 && Math.abs(g[0].r - 5) + Math.abs(g[0].c - 5) === 1, 'every 14 blocks an ore turns the ground beside it into the same ore');
  const none = field({ garden: 1 }, 1);
  for (let c = 0; c < G.COLS; c++) { G.breakCell(none, 0, c, 'crew', () => {}); G.breakCell(none, 1, c, 'crew', () => {}); }
  ok(none.relics2.grow >= P.growEvery, 'with no ore on screen the growth waits');
  const seed = field({}, 1); seed.relics = { garden: 1 }; G.step(seed, 0.05);
  ok(count(seed, 'copper') === 1, 'taking the Garden plants one copper seed');

  const m = field({ melt: 1 });
  m.rows[2][2] = cell('copper'); m.rows[2][3] = cell('copper');
  const evm = log(); run(m, 1, evm);
  ok(count(m, 'copper') === 2, 'two are not enough');
  m.rows[3][3] = cell('copper');
  run(m, 0.5, evm);
  ok(count(m, 'copper') === 0 && count(m, 'silver') === 1 && evm.of('relics2Melt').length === 1 && evm.of('relics2Melt')[0].from.length === 3, 'three that touch melt into one silver');
  ok(m.rows.flat().every(x => x), 'and leave plain ground, not holes');
  m.rows[6][0] = cell('gem'); m.rows[6][1] = cell('gem'); m.rows[6][2] = cell('gem');
  run(m, 1, evm); ok(count(m, 'gem') === 3, 'gems stay at level 1');
  m.relics.melt = 2; run(m, 1, evm);
  ok(count(m, 'gem') === 0 && count(m, 'chest') === 1, 'level 2: three gems melt into a chest');
  const m3 = field({ melt: 3 }); m3.rows[1][1] = cell('gold'); m3.rows[1][2] = cell('gold');
  run(m3, 1); ok(count(m3, 'gem') === 1 && count(m3, 'gold') === 0, 'level 3: two are enough');
  const far = field({ melt: 1 }); for (const c of [1, 2, 3]) far.rows[G.VIEW_ROWS][c] = cell('copper');
  run(far, 1); ok(count(far, 'copper') === 3, 'nothing melts below the screen');
  // the two halves together: a garden feeds the pot
  const both = field({ garden: 2, melt: 1 }, 1); both.rows[4][4] = cell('copper', 50);
  const evb = log();
  for (let i = 0; i < 4; i++) { both.relics2.grow = P.growEvery; G.breakCell(both, 0, i, 'crew', evb); run(both, 0.8, evb); }
  ok(evb.of('relics2Melt').length >= 1, 'grown copper melts into silver');
}

{ // saves
  G.seedRng(3);
  const s = G.newState();
  s.relics = { fire: 2, fall: 1, twin: 1 }; s.relics2.n = 4; s.relics2.gift.fuse = 1;
  s.rows[2][2].f = 2; s.rows[2][2].ft = 3; s.rows[3][3].ch = 1;
  const back = G.deserialize(G.serialize(s));
  ok(back && back.relics2.n === 4 && back.relics2.gift.fuse === 1 && back.rows[2][2].f === 2 && back.rows[3][3].ch === 1, 'the slice and the marks on blocks survive a save');
  const old = JSON.parse(G.serialize(G.newState()));
  delete old.relics2;
  const o2 = G.deserialize(JSON.stringify(old));
  ok(o2 && o2.relics2 && o2.relics2.n === 0 && o2.relics2.lt === null && typeof o2.relics2.gift === 'object', 'an old save without the slice loads with the defaults');
  const part = JSON.parse(G.serialize(G.newState()));
  part.relics2 = { n: 2 };
  const o3 = G.deserialize(JSON.stringify(part));
  ok(o3.relics2.n === 2 && o3.relics2.busy === 0 && o3.relics2.gift, 'a slice with keys missing is filled');
  ok(G.swing(o2, 0, 0), 'and it plays');
  // a New Site starts the slice over, with the relics
  const n = G.newState(); n.relics2.n = 7; n.relics = { twin: 1 }; n.bossesDown = 9; n.best = 60;
  ok(G.newSite(n, 'boom') && n.relics2.n === 0 && !n.relics.twin, 'a New Site starts the counters over with the relics');
}

{ // the whole lot together, for a while: nothing throws, nothing is left half done
  G.seedRng(11);
  const s = G.newState();
  s.coins = 1e7; s.up.pick = 14; s.up.crewPow = 10;
  for (let i = 0; i < 4; i++) G.buy(s, 'crew');
  for (const id of IDS) s.relics[id] = 3;
  let n = 0;
  for (let i = 0; i < 4000; i++) {
    if (i % 4 === 0) for (let k = 0; k < G.COLS; k++) { const c = (k + i) % G.COLS; let done = false; for (let r = 0; r < 4 && !done; r++) if (G.swing(s, s.top + r, c)) done = true; if (done) { n++; break; } }
    G.step(s, 0.05);
    while (s.chests > 0) G.takeRelic(s, G.rollDraft(s)[0] || null);
  }
  const bad = s.rows.flat().filter(x => x && (!(x.hp > 0) || !G.BLOCKS[x.t])).length;
  ok(n > 300 && s.best > 20 && bad === 0 && s.rows.length === G.KEEP_ROWS && s.rows.every(r => r.length === G.COLS), `all twelve at level 3 dig on for 200 s (${n} swings, ${s.best} m)`);
  ok(G.deserialize(G.serialize(s)) !== null, 'and the result saves');
}

G.setRng(null);
if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log('Dig relics2 OK');
