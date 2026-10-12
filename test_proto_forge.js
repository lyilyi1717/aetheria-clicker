// The Forge and its three tools. Run: node test_proto_forge.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (c, m) => { if (!c) { failed++; console.error('FAIL: ' + m); } };
const run = (s, secs, ev) => { for (let i = 0; i < secs * 20; i++) G.step(s, 0.05, ev); };
const fresh = () => { G.seedRng(7); const s = G.newState(); s.forgeOn = true; s.metal = 5000; return s; };
const put = (s, r, c, t) => { s.rows[r - s.top][c] = { t, hp: 1, max: 1, s: 1 }; };
const clear = (s, r) => { for (let c = 0; c < G.COLS; c++) s.rows[r - s.top][c] = null; };
const at = (s, r, c) => G.cellAt(s, r, c);
const fill = (s, n) => { for (let r = 0; r < n; r++) for (let c = 0; c < G.COLS; c++) put(s, r, c, 'dirt'); };
const buyN = (s, id, n) => { for (let i = 0; i < n; i++) G.buy(s, id); };

// ore counts, metal, the Forge opens with the first gold
{
  const s = G.newState(); G.seedRng(3); const evs = [];
  const ev = k => evs.push(k);
  ok(!s.forgeOn && !G.toolOpen(s, 'drill'), 'closed at the start');
  put(s, 0, 2, 'copper'); put(s, 0, 3, 'gold');
  G.breakCell(s, 0, 2, 'you', ev);
  ok(s.ore.copper === 1 && s.metal === 1 && !s.forgeOn, 'copper counts');
  G.breakCell(s, 0, 3, 'you', ev);
  ok(s.ore.gold === 1 && s.metal === 9 && !s.forgeOn, 'gold before the first New Site does not open it yet');
  s.sites = 1; put(s, 0, 4, 'gold');
  G.breakCell(s, 0, 4, 'you', ev);
  ok(s.ore.gold === 2 && s.metal === 17 && s.forgeOn && evs.includes('forgeOpen') && evs.includes('unlock'), 'first gold opens the Forge');
  ok(G.itemOpen(s, 'drill') && !G.itemOpen(s, 'dynamite'), 'drill first, the rest staged');
  ok(G.buy(s, 'drill') && s.toolCh.drill === 1 && G.canUseTool(s, 'drill'), 'the first tool is nearly free and has a charge to try at once');
  ok(G.itemOpen(s, 'dynamite'), 'dynamite opens after the drill');
}

// the drill: a column, sideways at L2, a bang at L3; charges refill from play only
{
  const s = fresh(); buyN(s, 'drill', 1);
  fill(s, 8); clear(s, 0);
  ok(G.useTool(s, 'drill', 1, 4) && s.toolCh.drill === 0, 'drill used, charge spent');
  ok(!G.useTool(s, 'drill', 1, 4), 'no charge, no use');
  run(s, 1);
  ok([1, 2, 3, 4, 5].every(r => at(s, r, 4) === null) && at(s, 6, 4) && at(s, 1, 3) && at(s, 5, 3), 'a column 5 deep, nothing sideways at L1');
  ok(s.forgeStat.blocks === 5 && s.forgeStat.uses.drill === 1, 'tool blocks counted');

  const t = fresh(); buyN(t, 'drill', 2);
  fill(t, 9); clear(t, 0); t.toolCh.drill = 1;
  G.useTool(t, 'drill', 1, 5); run(t, 2);
  ok(at(t, 5, 3) === null && at(t, 5, 7) === null && at(t, 5, 8) && at(t, 6, 5), 'L2 bores sideways at the end');
  const u = fresh(); buyN(u, 'drill', 3);
  fill(u, 9); clear(u, 0); u.toolCh.drill = 1;
  G.useTool(u, 'drill', 1, 5); run(u, 2);
  ok(at(u, 6, 5) === null && at(u, 6, 4) === null && at(u, 6, 6) === null && at(u, 7, 5), 'L3 ends with a bang around the bottom');

  const f = fresh(); buyN(f, 'drill', 1); f.toolCh.drill = 0;
  run(f, 600);
  ok(f.toolCh.drill === 0, 'time alone gives no charge');
  for (let i = 0; i < 2000 && f.toolCh.drill === 0; i++) { put(f, 0, 3, 'dirt'); G.swing(f, 0, 3); }
  ok(f.toolCh.drill >= 1, 'play fills a charge');
  for (let i = 0; i < 5000; i++) { put(f, 0, 3, 'dirt'); G.swing(f, 0, 3); }
  ok(f.toolCh.drill === G.PARAMS.forge.cap, 'charges stop at the cap');
}

// dynamite: placed, blasts after a fuse, chains TNT
{
  const s = fresh(); buyN(s, 'drill', 1); buyN(s, 'dynamite', 1);
  fill(s, 8); put(s, 3, 6, 'tnt'); put(s, 3, 7, 'gold'); clear(s, 0);
  ok(G.useTool(s, 'dynamite', 1, 4), 'placed');
  ok(at(s, 2, 4) && s.queue.some(q => q.kind === 'forgeDyn'), 'nothing breaks before the fuse');
  run(s, 0.5); ok(at(s, 1, 4) !== null, 'still fused');
  run(s, 3);
  ok(at(s, 1, 4) === null && at(s, 2, 4) === null && at(s, 3, 4) === null, 'blast clears its radius');
  ok(at(s, 3, 7) === null && s.ore.gold === 1, 'TNT in reach chains on to the gold');
}

// Big Rock: aim at the crack
{
  const mk = lv => {
    const s = fresh(); buyN(s, 'drill', 1); buyN(s, 'dynamite', lv);
    s.top = 23; s.rows = []; for (let r = 23; r < 36; r++) s.rows.push(G.genRow(s, r));
    s.best = 24; s.toolCh.dynamite = 1; clear(s, 24);
    return s;
  };
  const hit = (lv, onCrack) => {
    G.seedRng(11);
    const s = mk(lv), b = G.bossInView(s);
    const c = onCrack ? b.weak : (b.weak + 3) % G.COLS, hp0 = b.hp;
    ok(G.useTool(s, 'dynamite', 25, c), 'dynamite on the rock');
    b.wt = 99; run(s, 1.5);
    return { lost: hp0 - b.hp, b };
  };
  const on = hit(1, true), off = hit(1, false);
  ok(on.lost > off.lost * 2.5, `dynamite on the crack hits about 3x harder (${on.lost} vs ${off.lost})`);
  ok(on.lost < on.b.max, 'one stick does not erase the Big Rock');
  // L2 sticks to the crack: it still hits three times as hard after the crack has moved
  const s2 = mk(2), b2 = G.bossInView(s2), hp2 = b2.hp, c2 = b2.weak;
  G.useTool(s2, 'dynamite', 25, c2);
  b2.weak = (c2 + 4) % G.COLS; b2.wt = 99; run(s2, 1.5);
  ok(hp2 - b2.hp >= on.lost * 0.9, 'L2 stays stuck to the crack');
  const s1 = mk(1), b1 = G.bossInView(s1), hp1 = b1.hp, c1 = b1.weak;
  G.useTool(s1, 'dynamite', 25, c1);
  b1.weak = (c1 + 4) % G.COLS; b1.wt = 99; run(s1, 1.5);
  ok(hp1 - b1.hp < on.lost * 0.5, 'L1 misses when the crack moves');
  // L3 is thrown onto the rock from the row above
  const t = mk(3); put(t, 24, 4, 'dirt'); G.useTool(t, 'dynamite', 24, 4);
  ok(t.queue.some(q => q.kind === 'forgeDyn' && q.r === 25), 'L3 lands on the rock below');
}

// magnet: ore in reach pops; the dark needs L2; chests need L3
{
  const mk = n => {
    const s = fresh(); buyN(s, 'drill', 1); buyN(s, 'dynamite', 1); buyN(s, 'magnet', n); s.toolCh.magnet = 1;
    fill(s, 9); clear(s, 0);
    put(s, 1, 3, 'copper'); put(s, 2, 5, 'silver'); put(s, 8, 5, 'gold'); put(s, 3, 2, 'chest'); put(s, 5, 6, 'silver');
    return s;
  };
  const s = mk(1);
  ok(G.visibleMask(s)[5][6] === false, 'row 5 is in the dark');
  ok(G.useTool(s, 'magnet', 1, 4), 'magnet used'); run(s, 2);
  ok(at(s, 1, 3) === null && at(s, 2, 5) === null && at(s, 8, 5) && at(s, 3, 2) && at(s, 5, 6), 'L1 pops visible ore near the pointer, not far ore, dark ore or chests');
  ok(s.ore.copper === 1 && s.ore.silver === 1, 'and counts it');
  const m = mk(2); G.useTool(m, 'magnet', 1, 4); run(m, 2);
  ok(at(m, 5, 6) === null && at(m, 3, 2) && at(m, 8, 5), 'L2 finds ore in the dark');
  const ch = mk(3); G.useTool(ch, 'magnet', 1, 4); run(ch, 2);
  ok(at(ch, 3, 2) === null && ch.chests === 1, 'L3 pulls chests too');
}

// save round-trip, old save, survives a New Site
{
  const s = fresh(); buyN(s, 'drill', 1); s.ore.gem = 2;
  const o = JSON.parse(G.serialize(s));
  const b = G.deserialize(JSON.stringify(o));
  ok(b.forgeOn && b.metal === s.metal && b.toolCh.drill === 1 && b.forgeUp.drill === 1 && b.ore.gem === 2, 'round trip');
  for (const k of ['ore', 'metal', 'forgeOn', 'toolCh', 'toolFuel', 'forgeStat', 'forgeUp']) delete o[k];
  const old = G.deserialize(JSON.stringify(o));
  ok(old && old.forgeOn === false && old.metal === 0 && old.toolCh.magnet === 0 && old.forgeUp.drill === 0, 'an old save without the slice loads with defaults');
  s.bossesDown = 2;
  ok(G.newSite(s, 'boom'), 'new site');
  ok(s.forgeOn && s.forgeUp.drill === 1 && s.metal > 0 && s.ore.gem === 2 && s.toolCh.drill === 1, 'the Forge, tools and metal survive a New Site');
}

// content is listed, with words
{
  const u = G.unlocks().byId;
  ok(u['tool:drill'] && u['tool:magnet'] && u['shop:dynamite'] && u['drill:3'] && u['forge:open'], 'tools and levels are content');
  for (const id of ['drill', 'dynamite', 'magnet']) ok(G.hasString('up_' + id) && G.hasString('tool_' + id) && G.hasString(`up_${id}_d4`), `${id} has its words`);
}

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log('forge: ok');
