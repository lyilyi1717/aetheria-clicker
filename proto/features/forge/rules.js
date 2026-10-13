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
import { COLS, VIEW_ROWS, cellAt, reachable, visibleMask } from '../../core/grid.js';
import { later, damage, breakCell, itemLevel, itemOpen, canBuy, upgradeCost, buy, useTool, pickPower } from '../../core/rules.js';
import strings from './strings.js';

export const FORGE_TOOLS = ['drill', 'dynamite', 'magnet'];

const p = {
  metalVal: { copper: 1, silver: 3, gold: 8, gem: 25 },   // metal for one ore block
  fuel: 1, oreFuel: 3,          // bar filled by a block you break; by an ore block you break
  crewFuel: 0.3,                // by a block a Rafeeq breaks (it is your play that counts most)
  swingFuel: 0.12,              // by every swing, so a hard wall still fills the bar
  need: { drill: 40, dynamite: 70, magnet: 50 },   // bar to fill for one charge (about this many blocks broken)
  needCut: 0.07,                // each level above the first makes a charge this much cheaper to fill
  cap0: 2,                      // charges a tool can hold: this plus its level
  cost: { drill: 4, dynamite: 18, magnet: 28 },    // metal for level 1 (the Drill is nearly free)
  grow: 3,                      // each level costs this much more
  max: 5,
  // by level (1 to 5)
  drillDepth: [6, 8, 10, 12, 14], drillGap: 0.06, drillSide: [0, 2, 2, 3, 3], drillBangFrom: 3, drillBang: 1,
  drillPower: [24, 28, 32, 36, 40],     // the Drill, to each block in its column, in your hits
  dynRad: [2.5, 2.5, 3, 3.5, 4],        // the blast is round: every block this close (in blocks) is hit
  dynPower: [30, 34, 38, 42, 46],       // what the blast does to each block, in your hits (TNT: 8)
  dynFuse: 1.1, dynThrow: 2,
  magRad: [7, 9, 99, 99, 99],           // how far the pull reaches; 99 is the whole screen
  magDark: 2, magChest: 3,              // the level that finds ore in the dark; that pulls chests
  drillBoss: 8,                 // a Drill on the Big Rock: this many pick hits
  dynBoss: 16,                  // dynamite on the Big Rock: this many pick hits (three times that on the crack)
  bossShare: 0.1,               // but one tool never takes more than this share of a Big Rock's health
  openSites: 1,                 // the Forge opens with the first gold once you have moved to a New Site this many times
  magGap: 0.05, magLead: 0.3,
};
const at = (arr, L) => arr[Math.max(0, Math.min(arr.length, L) - 1)];
export const forgeCap = (s, id) => p.cap0 + Math.max(1, itemLevel(s, id));
export const forgeNeed = (s, id) => p.need[id] * (1 - p.needCut * Math.max(0, itemLevel(s, id) - 1));

const lvl = (s, id) => itemLevel(s, id);
const isWall = (s, r, c) => { const x = cellAt(s, r, c); return !!x && BLOCKS[x.t].wall === true; };
const hits = s => fold('swingDmg', s, pickPower(s));

// run work as a tool: what breaks and pays is counted for the Forge's own books
function asTool(s, id, f) { s._tool = id; try { return f(); } finally { s._tool = null; } }

function addFuel(s, w, ev) {
  for (const id of FORGE_TOOLS) {
    if (!lvl(s, id)) continue;
    const cap = forgeCap(s, id), need = forgeNeed(s, id);
    if (s.toolCh[id] >= cap) { s.toolFuel[id] = 0; continue; }
    s.toolFuel[id] += w;
    while (s.toolFuel[id] >= need && s.toolCh[id] < cap) {
      s.toolFuel[id] -= need; s.toolCh[id]++;
      emit(s, ev, 'forgeCharge', { id, n: s.toolCh[id] });
    }
    if (s.toolCh[id] >= cap) s.toolFuel[id] = 0;
  }
}
const spend = (s, id) => { s.toolCh[id]--; s.forgeStat.uses[id]++; };
// buying a tool (or a level of it) hands you a charge at once, so you can try it
const grant = (s, id) => { s.toolCh[id] = Math.min(forgeCap(s, id), s.toolCh[id] + 1); };

// ---------- the three tools ----------

function drillUse(s, r, c, ev) {
  spend(s, 'drill');
  const L = lvl(s, 'drill'), last = s.top + s.rows.length - 1;
  let n = 0, rl = r, k = 0;
  const depth = at(p.drillDepth, L), side = at(p.drillSide, L);
  for (let rr = r; rr <= last && n < depth; rr++) {
    if (!cellAt(s, rr, c)) continue;
    later(s, p.drillGap * k++, 'forgePop', { r: rr, c, tool: 'drill' }); n++; rl = rr;
    if (isWall(s, rr, c)) break;
  }
  let end = p.drillGap * k;
  if (side && !isWall(s, rl, c)) {
    for (let d = 1; d <= side; d++) for (const dc of [-d, d]) if (cellAt(s, rl, c + dc)) later(s, end + p.drillGap * d, 'forgePop', { r: rl, c: c + dc, tool: 'drill' });
    end += p.drillGap * side;
  }
  if (L >= p.drillBangFrom && !isWall(s, rl, c)) later(s, end + p.drillGap, 'forgeBang', { r: rl, c, rad: p.drillBang, tool: 'drill' });
  emit(s, ev, 'forgeDrill', { r, c, r1: rl, lv: L, gap: p.drillGap, side });
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
  later(s, p.dynFuse, 'forgeDyn', { r: land, c, weak, lv: L });
  emit(s, ev, 'forgeDynPlace', { r: land, c, from: r, fuse: p.dynFuse, lv: L });
}

function magUse(s, r, c, ev) {
  spend(s, 'magnet');
  const L = lvl(s, 'magnet'), mask = L >= p.magDark ? null : visibleMask(s), cells = [], rad = at(p.magRad, L);
  for (let i = 0; i < Math.min(VIEW_ROWS, s.rows.length); i++) for (let cc = 0; cc < COLS; cc++) {
    const cell = s.rows[i][cc];
    if (!cell) continue;
    const rr = s.top + i, dist = Math.hypot(rr - r, cc - c);
    if (dist > rad) continue;
    if (!(BLOCKS[cell.t].ore || (L >= p.magChest && cell.t === 'chest'))) continue;
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
    if (BLOCKS[cell.t].wall) damage(s, q.r, q.c, rockShare(s, q.c, hits(s) * p.drillBoss, s.boss && s.boss.weak === q.c ? PARAMS.boss.weakMult : 1), 'you', ev, { chain: 1, tool: 1 });
    else if (q.tool === 'drill') damage(s, q.r, q.c, hits(s) * at(p.drillPower, lvl(s, 'drill')), 'you', ev, { chain: 1, tool: 1 });
    else breakCell(s, q.r, q.c, 'you', ev, { chain: 1 });
  });
}
// A tool never takes more than `bossShare` of a Big Rock's health (crack bonus included), so one stick
// or drill cannot break a Gate alone. `m` is the crack bonus the damage will meet.
function rockShare(s, c, dmg, m) {
  const b = s.boss;
  return b ? Math.min(dmg, p.bossShare * b.max / m) : dmg;
}
// A blast of the Forge's own. Like TNT it chains to blocks marked `chain` and stops at a Big Rock,
// but it never chips the rock itself: only an aimed stick (below) or the drill hurts it.
function boom(s, r, c, rad, dmg, centre, ev) {
  emit(s, ev, 'blast', { r, c, rad });
  const k = Math.ceil(rad);
  for (let dr = -k; dr <= k; dr++) for (let dc = -k; dc <= k; dc++) {
    if (!dr && !dc && !centre) continue;
    if (Math.hypot(dr, dc) > rad + 1e-9) continue;
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
  asTool(s, q.tool, () => boom(s, q.r, q.c, q.rad, hits(s) * at(p.dynPower, lvl(s, 'dynamite')), false, ev));
}
function dyn(s, q, ev) {
  const wall = isWall(s, q.r, q.c), L = lvl(s, 'dynamite'), rad = at(p.dynRad, L);
  asTool(s, 'dynamite', () => {
    boom(s, q.r, q.c, rad, hits(s) * at(p.dynPower, L), !wall, ev);
    if (wall) {
      const b = s.boss, crack = !!b && b.weak === q.c, stuck = !!q.weak && !!b && !crack;   // a stuck stick remembers the crack
      const m = crack || stuck ? PARAMS.boss.weakMult : 1;
      damage(s, q.r, q.c, rockShare(s, q.c, hits(s) * p.dynBoss, m) * (stuck ? m : 1), 'you', ev, { chain: 1, tool: 1 });
    }
  });
  emit(s, ev, 'forgeBoom', { r: q.r, c: q.c, rad, wall });
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
    drill:    { at: 10, shop: 'forge', base: p.cost.drill, grow: p.grow, max: p.max, levels: 'core', open: s => s.forgeOn, bought: s => grant(s, 'drill') },
    dynamite: { at: 20, shop: 'forge', base: p.cost.dynamite, grow: p.grow, max: p.max, levels: 'core', open: s => s.forgeOn && lvl(s, 'drill') > 0, bought: s => grant(s, 'dynamite') },
    magnet:   { at: 30, shop: 'forge', base: p.cost.magnet, grow: p.grow, max: p.max, levels: 'core', open: s => s.forgeOn && lvl(s, 'dynamite') > 0, bought: s => grant(s, 'magnet') },
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
    const urgent = s.toolCh[id] >= forgeCap(s, id);
    let tg = null;
    if (b && id !== 'magnet') {
      // at a Big Rock: dynamite or the drill on the crack
      if (free(s, b.row, b.weak)) tg = [b.row, b.weak];
      else if (id === 'dynamite' && lvl(s, id) >= 3 && free(s, b.row - 1, b.weak)) tg = [b.row - 1, b.weak];
    }
    if (!tg && !b) {
      if (api.rnd() > 0.95) continue;                      // a player takes a moment to decide
      const L = lvl(s, id);
      let best = null, bs = 0;
      if (id === 'magnet') {
        // ore on the screen: pull when a few are in sight (or the bar is full and one is)
        const n = count(s, s.top + 4, 4, 9, x => BLOCKS[x.t].ore || (L >= p.magChest && x.t === 'chest'));
        if (n >= 3 || (urgent && n >= 1)) best = [s.top + 3, api.ctx.col];
        if (best && !free(s, best[0], best[1])) { best = null; for (let i = 0; i < 7 && !best; i++) if (free(s, s.top + i, api.ctx.col)) best = [s.top + i, api.ctx.col]; }
      } else if (id === 'dynamite') {
        // a clump of treasure or TNT, or a thick patch of ground
        bs = urgent ? 3 : 6;
        for (let i = 0; i < 7; i++) for (let c = 0; c < COLS; c++) {
          const r = s.top + i;
          if (!free(s, r, c)) continue;
          const sc = count(s, r, c, 2, valued) * 2 + count(s, r, c, 2, () => true) * 0.4;
          if (sc > bs) { bs = sc; best = [r, c]; }
        }
      } else {
        // the drill: the column where the ground ahead is hardest (hits it would take), near where you dig
        const need = x => Math.min(60, x.hp / Math.max(1, hits(s)));
        bs = (urgent ? 1.5 : 3) * at(p.drillDepth, L);
        for (let c = Math.max(0, api.ctx.col - 2); c <= Math.min(COLS - 1, api.ctx.col + 2); c++) {
          let r0 = -1;
          for (let i = 0; i < 6; i++) if (free(s, s.top + i, c)) { r0 = s.top + i; break; }
          if (r0 < 0) continue;
          let sc = 0;
          for (let k = 0; k < at(p.drillDepth, L); k++) { const x = cellAt(s, r0 + k, c); if (x) sc += BLOCKS[x.t].ore ? need(x) * 2 : need(x); }
          if (sc > bs) { bs = sc; best = [r0, c]; }
        }
      }
      tg = best;
    }
    if (tg && useTool(s, id, tg[0], tg[1], api.ev)) { log.push({ a: Math.round(api.trk.act), id, best: s.best, lv: lvl(s, id) }); did++; }
  }
  return did;
}
