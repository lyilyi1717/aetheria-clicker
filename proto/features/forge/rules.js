// Dig feature: The Forge and three tools. Breaking ore adds to a count of each metal and to one pile
// of metal; the Forge (it opens with the first gold) is a shop that spends that metal on a Drill, a
// stick of Dynamite and a Magnet. A tool has charges. A charge comes from play: every block broken
// (ore counts for more) fills a tool's bar, never the clock. Each tool has 3 levels that add behaviour:
//   Drill     L1 a column 5 deep   L2 at the bottom it bores sideways   L3 it ends with a bang
//   Dynamite  L1 placed on a block, blasts after a fuse   L2 sticks to the Big Rock's crack (never misses it)
//             L3 thrown up to 2 blocks deeper down the column
//   Magnet    L1 pops the ore you can see near the pointer   L2 also ore hiding in the dark   L3 chests too
// Tools are strong against the Big Rock if aimed: dynamite on the crack hits three times as hard.
import { use, emit, fold, BLOCKS, PARAMS } from '../../core/registry.js';
import { COLS, cellAt, reachable, visibleMask } from '../../core/grid.js';
import { later, damage, breakCell, itemLevel, itemOpen, canBuy, upgradeCost, buy, useTool, pickPower } from '../../core/rules.js';
import strings from './strings.js';

export const FORGE_TOOLS = ['drill', 'dynamite', 'magnet'];

const p = {
  metalVal: { copper: 1, silver: 3, gold: 8, gem: 25 },   // metal for one ore block
  fuel: 1, oreFuel: 3,          // bar filled by a block you break; by an ore block you break
  crewFuel: 0.3,                // by a block a Rafeeq breaks (it is your play that counts most)
  swingFuel: 0.12,              // by every swing, so a hard wall still fills the bar
  need: { drill: 90, dynamite: 120, magnet: 105 },   // bar to fill for one charge
  cap: 3,                       // charges a tool can hold
  cost: { drill: 4, dynamite: 18, magnet: 28 },    // metal for level 1 (the Drill is nearly free)
  grow: 5,                      // each level costs this much more
  drillDepth: 5, drillGap: 0.07, drillSide: 2, drillBang: 1,
  drillBoss: 6,                 // a Drill on the Big Rock: this many pick hits
  dynFuse: 1.1, dynRad: 2, dynPower: 14, dynThrow: 2,   // dynPower: what the blast does to each block, in your hits
  drillPower: 6,                // the Drill, to each block in its column, in your hits
  openSites: 1,                 // the Forge opens with the first gold once you have moved to a New Site this many times
  dynBoss: 14,                  // dynamite on the Big Rock: this many pick hits (three times that on the crack)
  magRad: 4.5, magGap: 0.06, magLead: 0.25,
};

const lvl = (s, id) => itemLevel(s, id);
const isWall = (s, r, c) => { const x = cellAt(s, r, c); return !!x && BLOCKS[x.t].wall === true; };
const hits = s => fold('swingDmg', s, pickPower(s));

// run work as a tool: what breaks and pays is counted for the Forge's own books
function asTool(s, id, f) { s._tool = id; try { return f(); } finally { s._tool = null; } }

function addFuel(s, w, ev) {
  for (const id of FORGE_TOOLS) {
    if (!lvl(s, id)) continue;
    if (s.toolCh[id] >= p.cap) { s.toolFuel[id] = 0; continue; }
    s.toolFuel[id] += w;
    while (s.toolFuel[id] >= p.need[id] && s.toolCh[id] < p.cap) {
      s.toolFuel[id] -= p.need[id]; s.toolCh[id]++;
      emit(s, ev, 'forgeCharge', { id, n: s.toolCh[id] });
    }
    if (s.toolCh[id] >= p.cap) s.toolFuel[id] = 0;
  }
}
const spend = (s, id) => { s.toolCh[id]--; s.forgeStat.uses[id]++; };
// buying a tool (or a level of it) hands you a charge at once, so you can try it
const grant = (s, id) => { s.toolCh[id] = Math.min(p.cap, s.toolCh[id] + 1); };

// ---------- the three tools ----------

function drillUse(s, r, c, ev) {
  spend(s, 'drill');
  const L = lvl(s, 'drill'), last = s.top + s.rows.length - 1;
  let n = 0, rl = r, k = 0;
  for (let rr = r; rr <= last && n < p.drillDepth; rr++) {
    if (!cellAt(s, rr, c)) continue;
    later(s, p.drillGap * k++, 'forgePop', { r: rr, c, tool: 'drill' }); n++; rl = rr;
    if (isWall(s, rr, c)) break;
  }
  let end = p.drillGap * k;
  if (L >= 2 && !isWall(s, rl, c)) {
    for (let d = 1; d <= p.drillSide; d++) for (const dc of [-d, d]) if (cellAt(s, rl, c + dc)) later(s, end + p.drillGap * d, 'forgePop', { r: rl, c: c + dc, tool: 'drill' });
    end += p.drillGap * p.drillSide;
  }
  if (L >= 3 && !isWall(s, rl, c)) later(s, end + p.drillGap, 'forgeBang', { r: rl, c, rad: p.drillBang, tool: 'drill' });
  emit(s, ev, 'forgeDrill', { r, c, r1: rl, lv: L, gap: p.drillGap, side: L >= 2 ? p.drillSide : 0 });
}

function dynUse(s, r, c, ev) {
  spend(s, 'dynamite');
  const L = lvl(s, 'dynamite');
  let land = r;
  if (L >= 3 && !isWall(s, r, c)) for (let k = 1; k <= p.dynThrow; k++) {
    if (!cellAt(s, r + k, c)) break;
    land = r + k;
    if (isWall(s, land, c)) break;
  }
  const b = s.boss;
  const weak = !!(L >= 2 && b && b.row === land && b.weak === c);   // it sticks to the crack it was put on
  later(s, p.dynFuse, 'forgeDyn', { r: land, c, weak });
  emit(s, ev, 'forgeDynPlace', { r: land, c, from: r, fuse: p.dynFuse, lv: L });
}

function magUse(s, r, c, ev) {
  spend(s, 'magnet');
  const L = lvl(s, 'magnet'), mask = L >= 2 ? null : visibleMask(s), cells = [];
  for (let i = 0; i < s.rows.length; i++) for (let cc = 0; cc < COLS; cc++) {
    const cell = s.rows[i][cc];
    if (!cell) continue;
    const rr = s.top + i, dist = Math.hypot(rr - r, cc - c);
    if (dist > p.magRad) continue;
    if (!(BLOCKS[cell.t].ore || (L >= 3 && cell.t === 'chest'))) continue;
    if (mask && !mask[i][cc]) continue;
    let walled = false;                                   // a pull never reaches past a Big Rock
    for (let x = Math.min(r, rr); x <= Math.max(r, rr); x++) if (x !== rr && isWall(s, x, 0)) walled = true;
    if (!walled) cells.push({ r: rr, c: cc, t: cell.t, dist });
  }
  cells.sort((a, b) => a.dist - b.dist);
  cells.forEach((x, i) => later(s, p.magLead + p.magGap * i, 'forgePop', { r: x.r, c: x.c, tool: 'magnet' }));
  emit(s, ev, 'forgePull', { r, c, cells: cells.map(x => ({ r: x.r, c: x.c, t: x.t })), lead: p.magLead, gap: p.magGap, lv: L });
}

// `can` is also asked with no place (the tool bar): then it only needs a charge
const reach = (s, r, c) => r === undefined || (!!cellAt(s, r, c) && reachable(s, r, c));
const tool = (id, key, use) => ({ key, open: s => lvl(s, id) > 0, can: (s, r, c) => s.toolCh[id] > 0 && reach(s, r, c), use });

// ---------- delayed work ----------

function pop(s, q, ev) {
  const cell = cellAt(s, q.r, q.c);
  if (!cell) return;
  asTool(s, q.tool, () => {
    if (BLOCKS[cell.t].wall) damage(s, q.r, q.c, hits(s) * p.drillBoss, 'you', ev, { chain: 1, tool: 1 });
    else if (q.tool === 'drill') damage(s, q.r, q.c, hits(s) * p.drillPower, 'you', ev, { chain: 1, tool: 1 });
    else breakCell(s, q.r, q.c, 'you', ev, { chain: 1 });
  });
}
// A blast of the Forge's own. Like TNT it chains to blocks marked `chain` and stops at a Big Rock,
// but it never chips the rock itself: only an aimed stick (below) or the drill hurts it.
function boom(s, r, c, rad, dmg, centre, ev) {
  emit(s, ev, 'blast', { r, c, rad });
  for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
    if (!dr && !dc && !centre) continue;
    const cell = cellAt(s, r + dr, c + dc);
    if (!cell) continue;
    const B = BLOCKS[cell.t];
    if (B.wall) continue;
    let behind = false;
    for (let x = Math.min(r, r + dr); x <= Math.max(r, r + dr); x++) if (x !== r + dr && isWall(s, x, 0)) behind = true;
    if (behind) continue;
    if (B.chain) {
      if (!cell.q) { cell.q = true; later(s, 0.14 + 0.05 * (Math.abs(dr) + Math.abs(dc)), 'pop', { r: r + dr, c: c + dc, src: 'you', chain: 1 }); }
      continue;
    }
    damage(s, r + dr, c + dc, dmg, 'you', ev, { chain: 1 });
  }
}
function bang(s, q, ev) {
  asTool(s, q.tool, () => boom(s, q.r, q.c, q.rad, hits(s) * p.dynPower, false, ev));
}
function dyn(s, q, ev) {
  const wall = isWall(s, q.r, q.c);
  asTool(s, 'dynamite', () => {
    boom(s, q.r, q.c, p.dynRad, hits(s) * p.dynPower, !wall, ev);
    if (wall) {
      let dmg = hits(s) * p.dynBoss;
      // a stuck stick remembers the crack: three times, wherever the crack has moved to since
      if (q.weak && s.boss && s.boss.weak !== q.c) dmg *= PARAMS.boss.weakMult;
      damage(s, q.r, q.c, dmg, 'you', ev, { chain: 1, tool: 1 });
    }
  });
  emit(s, ev, 'forgeBoom', { r: q.r, c: q.c, rad: p.dynRad, wall });
}

export const forge = use({
  id: 'forge',
  params: p,
  strings,
  state: {
    ore:       { init: () => ({ copper: 0, silver: 0, gold: 0, gem: 0 }), survives: ['site', 'land'] },
    metal:     { init: () => 0, survives: ['site', 'land'] },
    forgeOn:   { init: () => false, survives: ['site', 'land'] },
    toolCh:    { init: () => ({ drill: 0, dynamite: 0, magnet: 0 }), survives: ['site', 'land'] },
    toolFuel:  { init: () => ({ drill: 0, dynamite: 0, magnet: 0 }), survives: ['site', 'land'] },
    forgeStat: { init: () => ({ blocks: 0, coins: 0, all: 0, allCoins: 0, uses: { drill: 0, dynamite: 0, magnet: 0 } }), survives: ['site', 'land'] },
    _tool:     { init: () => null, transient: true },
  },
  shops: { forge: { at: 90, wallet: 'metal', levels: 'forgeUp', survives: ['site', 'land'] } },
  items: {
    drill:    { at: 10, shop: 'forge', base: p.cost.drill, grow: p.grow, max: 3, levels: 'core', open: s => s.forgeOn, bought: s => grant(s, 'drill') },
    dynamite: { at: 20, shop: 'forge', base: p.cost.dynamite, grow: p.grow, max: 3, levels: 'core', open: s => s.forgeOn && lvl(s, 'drill') > 0, bought: s => grant(s, 'dynamite') },
    magnet:   { at: 30, shop: 'forge', base: p.cost.magnet, grow: p.grow, max: 3, levels: 'core', open: s => s.forgeOn && lvl(s, 'dynamite') > 0, bought: s => grant(s, 'magnet') },
  },
  tools: { drill: tool('drill', '1', drillUse), dynamite: tool('dynamite', '2', dynUse), magnet: tool('magnet', '3', magUse) },
  queue: { forgePop: pop, forgeBang: bang, forgeDyn: dyn },
  firsts: { forgeOpen: () => 'forge:open' },
  unlocks: [{ id: 'forge:open', cat: 'core', group: 'the forge' }],
  hooks: {
    broke(s, b, ev) {
      const st = s.forgeStat;
      st.all++;
      if (s._tool) st.blocks++;
      if (b.B.ore && p.metalVal[b.t]) {
        s.ore[b.t]++; s.metal += p.metalVal[b.t];
        if (b.t === 'gold' && !s.forgeOn && s.sites >= p.openSites) { s.forgeOn = true; emit(s, ev, 'forgeOpen', { r: b.r, c: b.c }); }
      }
      if (!s._tool) addFuel(s, (b.B.ore ? p.oreFuel : p.fuel) * (b.src === 'crew' ? p.crewFuel : 1), ev);
    },
    swung(s, sw, ev) { addFuel(s, p.swingFuel, ev); },
    earned(s, n) { s.forgeStat.allCoins += n; if (s._tool) s.forgeStat.coins += n; },
  },
  bot: { shop: botShop },
});

// ---------- the sim's scripted player ----------
// Buys the cheapest forge item it can, then uses a tool when there is a good place for it (or the
// bar is full and it would be wasted). At a Big Rock it puts dynamite or the drill on the crack.

const free = (s, r, c) => !!cellAt(s, r, c) && reachable(s, r, c);
function bossInView(s) {
  const b = s.boss;
  if (!b || b.hp <= 0) return null;
  for (let i = 0; i < 9; i++) if (s.top + i === b.row && s.rows[i].some(x => x)) return b;
  return null;
}
function count(s, r, c, rad, f) {
  let n = 0;
  for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) { const x = cellAt(s, r + dr, c + dc); if (x && f(x)) n++; }
  return n;
}
const valued = x => BLOCKS[x.t].ore || BLOCKS[x.t].chain || x.t === 'chest';

function botShop(s, api) {
  let did = 0;
  for (let g = 0; g < 9; g++) {
    const ids = Object.keys(forge.items).filter(id => itemOpen(s, id) && canBuy(s, id));
    if (!ids.length) break;
    ids.sort((a, b) => upgradeCost(s, a) - upgradeCost(s, b));
    if (!buy(s, ids[0], api.ev)) break;
    did++;
  }
  if (!s.forgeOn) return did;
  const col = api.ctx.col, b = bossInView(s), log = api.trk.forgeUse || (api.trk.forgeUse = []);
  for (const id of ['dynamite', 'drill', 'magnet']) {
    if (!s.toolCh[id] || !lvl(s, id)) continue;
    const urgent = s.toolCh[id] >= p.cap;
    let tg = null;
    if (b && id !== 'magnet') {
      if (free(s, b.row, b.weak)) tg = [b.row, b.weak];
      else if (id === 'dynamite' && lvl(s, id) >= 3 && free(s, b.row - 1, b.weak)) tg = [b.row - 1, b.weak];
    }
    if (!tg && !b) {
      if (api.rnd() > (urgent ? 0.9 : api.ctx.p.notice * 0.6)) continue;   // a player waits for a good moment
      let best = null, bs = id === 'magnet' ? 1 : 0;
      for (let i = 0; i < 7; i++) for (let c = 0; c < COLS; c++) {
        const r = s.top + i;
        if (!free(s, r, c)) continue;
        let sc;
        if (id === 'magnet') sc = count(s, r, c, 4, x => BLOCKS[x.t].ore);
        else if (id === 'dynamite') sc = count(s, r, c, 2, valued) * 2 + count(s, r, c, 2, () => true) * 0.15;
        else { sc = 0.5 - Math.abs(c - col) * 0.1; for (let k = 0; k < 5; k++) { const x = cellAt(s, r + k, c); if (x) sc += BLOCKS[x.t].ore ? 3 : 1; } }
        if (sc > bs) { bs = sc; best = [r, c]; }
      }
      tg = best;
      if (!tg && urgent && id !== 'magnet') for (let i = 0; i < 6 && !tg; i++) if (free(s, s.top + i, col)) tg = [s.top + i, col];
    }
    if (tg && useTool(s, id, tg[0], tg[1], api.ev)) { log.push({ t: api.trk.act, id }); did++; }
  }
  return did;
}
