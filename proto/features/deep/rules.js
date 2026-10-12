// Dig feature: the Deep. Four layers below 100 m (rows 100 to 199, 25 rows each; the last goes on for ever),
// each with ONE law that changes how you dig, a block table of its own, one new ore, and a twist for the Big Rock
// that closes it. The laws are the layer registry's `law` (hooks and mods in force while the dig is in that layer).
//
//   The Black       (rows 100-124)  always dark. You see what the pick, the Rafeeqs, a glow mushroom or a lantern lights.
//                                   Cells a Lantern relic revealed stay shown. New: mushroom, lantern, moonstone.
//                                   Big Rock: takes only `rockDark` of every hit unless a light is on (a lantern sits above it).
//   The Living Rock (rows 125-149)  every `every` blocks you break, empty space that touches rock grows a moss block back,
//                                   unless a torch (from a torch crate) lights it. New: torch_crate, amber, moss.
//                                   Big Rock: grows back `rockGrow` of its hp for every `rockChunk` you take, unless a torch is near.
//   The Angry Layer (rows 150-174)  grumps hit back when hit: shove the row, throw a stone at a Rafeeq (dizzy), or steal coins
//                                   into a thief block you break to win them back. A grump that breaks flies into the nearest
//                                   TNT, oil or pocket. New: grump, thief, ruby.
//                                   Big Rock: for every `rockChunk` you take it throws a stone and keeps some of your coins,
//                                   paid back (with interest) when it breaks.
//   The Hot Layer   (rows 175-...)  a lava pocket flows like water, burns soft ground, makes ore one step richer, sets off
//                                   TNT, oil, crystals and pockets. Water turns lava into glass that cracks in lines.
//                                   New: lava, glass, ember. Big Rock: hot, takes `hotMult` of a hit, but `coolMult` while water
//                                   stands near it; a water pocket is placed `waterRow` rows above every Rock from here down.
//
// A Big Rock is fought under the law of the layer ABOVE it (the dig's deepest row is still there), so each twist belongs to the
// layer whose last row the Rock sits under.
// State: slice `deep` (per site, saved, starts over on a New Site). Counted by BREAKS, never by the clock: `bc` is the number of
// blocks broken in this site; a light lasts so many, regrowth comes every so many, lava cools after so many.
// Events (all new): deepEnter, deepGlow, deepTorch, deepRegrow, deepShove, deepStone, deepSteal, deepThrow, deepThief,
// deepLavaBurst, deepLava, deepBurn, deepBoom, deepGlass, deepRock, deepBack.
// Reuses: moodsPoke (moods), the crystalRay queue kind and crystalLine event (crystal) for glass, `pop` (core) for everything set off.
import { use, emit, BLOCKS, layersOf } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { COLS, LAYER, cellAt, setCell, makeCell, frontLayer, dirtVal } from '../../core/grid.js';
import { later, addCoins, coinMult, rel } from '../../core/rules.js';
import { moodsPoke } from '../moods/rules.js';
import '../crystal/rules.js';
import '../water/rules.js';
import '../tnt/rules.js';
import '../oil/rules.js';
import '../ores/rules.js';
import '../boss/rules.js';
import strings from './strings.js';

const p = {
  // shares of a layer's cells
  mushroom: 0.045, lantern: 0.008, moonstone: 0.012, black_crystal: 0.025,
  torch_crate: 0.02, amber: 0.012, living_crystal: 0.02,
  grump: 0.04, ruby: 0.012, angry_crystal: 0.02,
  lava: 0.025, ember: 0.004, hot_crystal: 0.02,
  // the Black
  darkSight: 0,          // blocks you see around open space (none: only light shows anything)
  pickRad: 2,            // the pick lights this far around the last block you hit
  crewRad: 1,            // and each Rafeeq this far around himself
  mushRad: 2, mushLife: 25,   // a glow mushroom lights this far for this many broken blocks
  lampRad: 3, lampLife: 60,   // a lantern, the same
  glowCap: 12,           // lights kept at once
  rockDark: 0.4,         // the Black's Big Rock takes this much of a hit in the dark
  // the Living Rock
  every: 5,              // blocks broken between two growths
  batch: 1,              // blocks that grow back each time
  torchRad: 2,           // a torch keeps this far around it clear
  torchCap: 10,
  torchRock: 3,          // a torch this many rows from the Rock stops it growing
  rockChunk: 0.15,       // share of a Big Rock's hp taken between two of its twists
  rockGrow: 0.06,        // what the Living Rock gives back each time, share of its hp
  // the Angry Layer
  act: 0.55,             // chance a grump that was hit but not broken does something
  shove: 0.4, stone: 0.35,   // of those: shove, stone; the rest steal
  steal: 30,             // coins a theft takes, in dirt blocks of its row
  loot: 1.25,            // the thief block pays back this much of it
  dizzy: 1.5,            // seconds a stone makes a Rafeeq lose
  throwR: 4,             // a flying grump finds a target this far away
  rockSteal: 120, rockBack: 1.5,   // the Angry Rock keeps this many dirt blocks per throw; pays back this much of it
  // the Hot Layer
  pocket: 10,            // how far a lava pocket runs
  flowGap: 0.3,          // seconds from one step of lava to the next
  burnCost: 3,           // lava burns through soft ground for this much of its run
  fuse: 0.15,            // seconds from lava touching a barrel to the bang
  crust: 40,             // blocks broken before standing lava cools
  maxLava: 100,
  hotMult: 0.6, coolMult: 2.5, coolRows: 4,
  waterRow: 3,           // rows above a Hot Rock where a water pocket is placed
  // placed lessons, in rows into the layer
  first: 1,
};

const LAWS = ['black', 'living', 'angry', 'hot'];
const BURN = { copper: 'silver', silver: 'gold', gold: 'gem', gem: 'ember' };   // lava makes ore one step richer
const TARGETS = ['tnt', 'oil', 'water', 'lava'];                                // what a flying grump goes for

const key = (r, c) => r + ',' + c;
const lit = s => s.deep.glows.some(g => g.until > s.deep.bc);

// ---------- the Black ----------

function addGlow(s, r, c, rad, life, ev, t) {
  const d = s.deep;
  d.glows = d.glows.filter(g => g.until > d.bc && g.r >= s.top);
  d.glows.push({ r, c, rad, until: d.bc + life });
  if (d.glows.length > p.glowCap) d.glows.shift();
  emit(s, ev, 'deepGlow', { r, c, rad, t });
}

function lightAt(s, m, r, c, rad) {
  const i0 = r - s.top;
  for (let di = -rad; di <= rad; di++) {
    const row = m[i0 + di];
    if (!row) continue;
    for (let dc = -rad; dc <= rad; dc++) if (c + dc >= 0 && c + dc < COLS) row[c + dc] = true;
  }
}

// what is shown in the dark: lights, the pick, the crew, glowing blocks, and what the Lantern relic revealed (for good)
function blackMask(s, m) {
  const d = s.deep, n = s.rows.length;
  for (const g of d.glows) if (g.until > d.bc) lightAt(s, m, g.r, g.c, g.rad);
  if (d.pick) lightAt(s, m, d.pick[0], d.pick[1], p.pickRad);
  for (const x of s.diggers) lightAt(s, m, Math.round(x.r), Math.round(x.c), p.crewRad);
  const perk = rel(s, 'lamp');
  for (let i = 0; i < n; i++) for (let c = 0; c < COLS; c++) {
    const cell = s.rows[i][c];
    if (cell) { if (cell.shown || BLOCKS[cell.t].glows) m[i][c] = true; continue; }
    if (perk > 0) for (let di = -perk; di <= perk; di++) for (let dc = -perk; dc <= perk; dc++) {
      const o = s.rows[i + di] && s.rows[i + di][c + dc];
      if (o) { o.shown = 1; m[i + di][c + dc] = true; }
    }
  }
}

// ---------- the Living Rock ----------

const torchNear = (s, r, c, rad) => s.deep.torches.some(t => Math.abs(t.r - r) <= rad && (c === undefined || Math.abs(t.c - c) <= rad));

function regrow(s, ev) {
  const n = s.rows.length, cand = [];
  for (let i = 1; i < n - 1; i++) for (let c = 0; c < COLS; c++) {
    if (s.rows[i][c] !== null) continue;
    const r = s.top + i;
    const solid = [[i - 1, c], [i + 1, c], [i, c - 1], [i, c + 1]].some(([a, b]) => { const o = s.rows[a] && s.rows[a][b]; return !!o && !BLOCKS[o.t].wall; });
    if (!solid || torchNear(s, r, c, p.torchRad)) continue;
    if (s.diggers.some(x => Math.abs(x.r - r) < 1.2 && Math.abs(x.c - c) < 1.2)) continue;
    if (s.deep.pick && s.deep.pick[0] === r && s.deep.pick[1] === c) continue;
    cand.push([r, c]);
  }
  for (let k = 0; k < p.batch && cand.length; k++) {
    const [r, c] = cand.splice(Math.floor(rnd() * cand.length), 1)[0];
    setCell(s, r, c, makeCell(r, 'moss'));
    emit(s, ev, 'deepRegrow', { r, c });
  }
}

// ---------- the Big Rock twists: they count what you took off it ----------

function rockDealt(s) {
  const b = s.boss, d = s.deep;
  if (!b || b.hp <= 0) { d.brow = -1; return 0; }
  if (d.brow !== b.row) { d.brow = b.row; d.bhp = b.hp; d.bdealt = 0; return 0; }
  const x = Math.max(0, d.bhp - b.hp);
  d.bhp = b.hp;
  return x;
}
function rockTwist(s, fn) {
  const got = rockDealt(s);
  if (!got) return;
  const b = s.boss, d = s.deep;
  d.bdealt += got;
  if (d.bdealt < b.max * p.rockChunk) return;
  d.bdealt = 0;
  fn(b, d);
}

// ---------- the Angry Layer ----------

function nearestDigger(s, r, c) {
  let best = -1, bd = 1e9;
  s.diggers.forEach((x, i) => { const dd = Math.abs(x.r - r) + Math.abs(x.c - c); if (dd < bd) { bd = dd; best = i; } });
  return best;
}

function dizzy(s, who, ev) {
  const x = s.diggers[who];
  x.cd = (x.cd || 0) + p.dizzy;
  moodsPoke(s, ev, 'dizzy', { who });
}

function grumble(s, r, c, ev) {
  if (rnd() >= p.act) return;
  const x = rnd();
  if (x < p.shove) {
    const row = s.rows[r - s.top];
    if (!row || row.some(o => o && BLOCKS[o.t].wall)) return;
    const dir = rnd() < 0.5 ? -1 : 1;
    if (dir > 0) row.unshift(row.pop()); else row.push(row.shift());
    emit(s, ev, 'deepShove', { r, c, dir });
  } else if (x < p.shove + p.stone && s.diggers.length) {
    const who = nearestDigger(s, r, c);
    dizzy(s, who, ev);
    emit(s, ev, 'deepStone', { r, c, who, tr: s.diggers[who].r, tc: s.diggers[who].c });
  } else {
    const amt = Math.min(Math.floor(s.coins), Math.round(dirtVal(r) * p.steal * coinMult(s)));
    if (amt < 1) return;
    const spots = [];
    for (let dr = -3; dr <= 3; dr++) for (let dc = -3; dc <= 3; dc++) {
      if (Math.abs(dr) + Math.abs(dc) > 3 || (!dr && !dc)) continue;
      const o = cellAt(s, r + dr, c + dc);
      if (o && BLOCKS[o.t].soft && !BLOCKS[o.t].wall) spots.push([r + dr, c + dc]);
    }
    if (!spots.length) return;
    const [tr, tc] = spots[Math.floor(rnd() * spots.length)];
    s.coins -= amt;
    const th = makeCell(tr, 'thief');
    th.loot = amt;
    setCell(s, tr, tc, th);
    emit(s, ev, 'deepSteal', { r, c, tr, tc, coins: amt });
  }
}

// a grump that breaks is thrown into the nearest barrel, oil or pocket
function fly(s, b, ev) {
  let best = null, bd = 1e9;
  for (let dr = -p.throwR; dr <= p.throwR; dr++) for (let dc = -p.throwR; dc <= p.throwR; dc++) {
    const o = cellAt(s, b.r + dr, b.c + dc);
    if (!o || o.q || !TARGETS.includes(o.t)) continue;
    const dd = Math.abs(dr) + Math.abs(dc);
    if (dd < bd) { bd = dd; best = [b.r + dr, b.c + dc, o]; }
  }
  if (!best) return;
  best[2].q = true;
  later(s, 0.15, 'pop', { r: best[0], c: best[1], src: b.src, chain: 1 });
  emit(s, ev, 'deepThrow', { r: b.r, c: b.c, tr: best[0], tc: best[1], t: best[2].t });
}

// ---------- the Hot Layer ----------

const steamed = (s, r, c) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => (s.pools[key(r + a, c + b)] || 0) > s.t);

function glassify(s, r, c, ev) {
  delete s.deep.lava[key(r, c)];
  setCell(s, r, c, makeCell(r, 'lavaglass'));
  emit(s, ev, 'deepGlass', { r, c });
}

// lava touches its four neighbours: ore gets richer, barrels and pockets go off
function burn(s, r, c, ev) {
  for (const [dr, dc] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) {
    const rr = r + dr, cc = c + dc, cell = cellAt(s, rr, cc);
    if (!cell) continue;
    const B = BLOCKS[cell.t];
    if (B.wall) continue;
    if (BURN[cell.t]) {
      if (cell.burnt) continue;
      const to = makeCell(rr, BURN[cell.t]);
      to.burnt = 1;
      setCell(s, rr, cc, to);
      emit(s, ev, 'deepBurn', { r: rr, c: cc, from: cell.t, to: to.t });
    } else if (!cell.q && cell.t !== 'lavaglass' && (B.chain || cell.t === 'water' || cell.t === 'oil')) {
      cell.q = true;
      later(s, p.fuse, 'pop', { r: rr, c: cc, src: 'lava', chain: 1 });
      emit(s, ev, 'deepBoom', { r: rr, c: cc, t: cell.t });
    }
  }
}

const nextLava = (s, r, c, vol) => later(s, p.flowGap, 'deepLava', { r, c, vol });

function lavaFlow(s, q, ev) {
  const { r, c, vol } = q, d = s.deep, k = key(r, c);
  if (cellAt(s, r, c) !== null || d.lava[k]) return;
  if (Object.keys(d.lava).length >= p.maxLava) return;
  if (steamed(s, r, c)) { glassify(s, r, c, ev); return; }
  d.lava[k] = d.bc + p.crust;
  const who = s.diggers.findIndex(x => Math.round(x.r) === r && Math.round(x.c) === c);
  if (who >= 0) moodsPoke(s, ev, 'scared', { who });
  burn(s, r, c, ev);
  emit(s, ev, 'deepLava', { r, c });
  const below = cellAt(s, r + 1, c);
  if (below === undefined) return;
  if (vol > 0) {
    if (below === null && !d.lava[key(r + 1, c)]) { nextLava(s, r + 1, c, vol - 1); return; }
    if (below && BLOCKS[below.t].soft && !BLOCKS[below.t].wall && vol >= p.burnCost) {
      later(s, 0.02, 'pop', { r: r + 1, c, src: 'lava', chain: 1 });
      nextLava(s, r + 1, c, vol - p.burnCost);
      return;
    }
    const sides = [-1, 1].filter(x => cellAt(s, r, c + x) === null && !d.lava[key(r, c + x)]);
    if (sides.length && vol >= 1) {
      const share = Math.floor((vol - 1) / sides.length);
      for (const x of sides) nextLava(s, r, c + x, share);
    }
  }
}

const poolNear = (s, r) => Object.keys(s.pools).some(k => { const rr = +k.split(',')[0]; return rr <= r && rr >= r - p.coolRows && s.pools[k] > s.t; });

// ---------- the layers and their laws ----------

const law = {
  black: {
    mods: {
      sight: () => p.darkSight,
      damage: (v, s, cell) => (cell.t === 'boss' && !lit(s) ? v * p.rockDark : v),
    },
    hooks: {
      swung(s, sw) { s.deep.pick = [sw.r, sw.c]; },
      mask: blackMask,
    },
  },
  living: {
    hooks: {
      broke(s, b, ev) {
        if (b.t === 'moss' || b.src === 'lava') return;
        const d = s.deep;
        if (++d.grow < p.every) return;
        d.grow = 0;
        regrow(s, ev);
      },
      step(s, dt, ev) {
        if (!s.boss) return;
        rockTwist(s, (b, d) => {
          if (torchNear(s, b.row, undefined, p.torchRock)) return;
          b.hp = Math.min(b.max, b.hp + b.max * p.rockGrow);
          d.bhp = b.hp;
          emit(s, ev, 'deepRock', { id: 'living', row: b.row });
        });
      },
    },
  },
  angry: {
    hooks: {
      step(s, dt, ev) {
        if (!s.boss) return;
        rockTwist(s, (b, d) => {
          const amt = Math.min(Math.floor(s.coins), Math.round(dirtVal(b.row) * p.rockSteal * coinMult(s)));
          if (s.diggers.length) dizzy(s, Math.floor(rnd() * s.diggers.length), ev);
          if (amt > 0) { s.coins -= amt; d.owed += amt; }
          emit(s, ev, 'deepRock', { id: 'angry', row: b.row, coins: amt });
        });
      },
    },
  },
  hot: {
    mods: {
      damage: (v, s, cell, src, info, r) => (cell.t === 'boss' ? v * (poolNear(s, r) ? p.coolMult : p.hotMult) : v),
    },
  },
};

// the layer's block table; the shares are getters, so G.setParam('deep.grump', x) still bends the ground
const shares = names => {
  const o = {};
  for (const [id, k] of names) Object.defineProperty(o, id, { get: () => p[k], enumerable: true });
  return o;
};

export const deep = use({
  id: 'deep',
  params: p,
  strings,
  state: {
    deep: { init: () => ({ law: '', bc: 0, glows: [], pick: null, torches: [], grow: 0, brow: -1, bhp: 0, bdealt: 0, owed: 0, back: 0, lava: {} }), perSite: true },
  },
  layers: [
    { id: 'black', at: 50, name: 'layer_black', law: law.black,
      look: { dirt: '#2b2b3d', stone: '#3b3b50', hard: '#16161f', back: '#07070c' }, ores: [0.05, 0.3, 0.7, 1.0],
      blocks: shares([['mushroom', 'mushroom'], ['lantern', 'lantern'], ['moonstone', 'moonstone'], ['crystal_row', 'black_crystal'], ['crystal_col', 'black_crystal']]) },
    { id: 'living', at: 60, name: 'layer_living', law: law.living,
      look: { dirt: '#557f3f', stone: '#6f8f54', hard: '#2c4526', back: '#16260f' }, ores: [0.03, 0.22, 0.6, 1.0],
      blocks: shares([['torch_crate', 'torch_crate'], ['amber', 'amber'], ['crystal_row', 'living_crystal'], ['crystal_slash', 'living_crystal']]) },
    { id: 'angry', at: 70, name: 'layer_angry', law: law.angry,
      look: { dirt: '#a63d2d', stone: '#8c5649', hard: '#4a1d18', back: '#2b0f0c' }, ores: [0.02, 0.15, 0.5, 1.0],
      blocks: shares([['grump', 'grump'], ['ruby', 'ruby'], ['crystal_back', 'angry_crystal'], ['crystal_col', 'angry_crystal']]) },
    { id: 'hot', at: 80, name: 'layer_hot', law: law.hot,
      look: { dirt: '#c4581e', stone: '#9d5b39', hard: '#4a2412', back: '#3a0e06' }, ores: [0.01, 0.1, 0.4, 1.0],
      blocks: shares([['lava', 'lava'], ['ember', 'ember'], ['crystal_row', 'hot_crystal'], ['crystal_col', 'hot_crystal']]) },
  ],
  blocks: {
    // the Black
    mushroom: { at: 400, hp: 1, val: 2, notice: true, glows: true, broke(s, b, ev) { addGlow(s, b.r, b.c, p.mushRad, p.mushLife, ev, b.t); } },
    lantern: { at: 401, hp: 2, val: 3, notice: true, glows: true, broke(s, b, ev) { addGlow(s, b.r, b.c, p.lampRad, p.lampLife, ev, b.t); } },
    moonstone: { at: 402, hp: 5, val: 220, ore: true, notice: true, glows: true },
    // the Living Rock
    torch_crate: { at: 410, hp: 2, val: 2, notice: true, broke(s, b, ev) {
      const d = s.deep;
      d.torches = d.torches.filter(t => t.r >= s.top);
      d.torches.push({ r: b.r, c: b.c });
      if (d.torches.length > p.torchCap) d.torches.shift();
      emit(s, ev, 'deepTorch', { r: b.r, c: b.c });
    } },
    amber: { at: 411, hp: 5, val: 260, ore: true, notice: true },
    moss: { at: 412, hp: 1, val: 0.4, soft: true },
    // the Angry Layer
    grump: { at: 420, hp: 3, val: 3, chain: true, notice: true,
      hit(s, r, c, cell, dmg, src, ev) { grumble(s, r, c, ev); },
      broke(s, b, ev) { fly(s, b, ev); } },
    thief: { at: 421, hp: 2, val: 0, notice: true, broke(s, b, ev) {
      const coins = Math.round((b.cell.loot || 0) * p.loot);
      if (coins > 0) addCoins(s, coins, 'thief');
      emit(s, ev, 'deepThief', { r: b.r, c: b.c, coins });
    } },
    ruby: { at: 422, hp: 6, val: 380, ore: true, notice: true },
    // the Hot Layer
    lava: { at: 430, hp: 1, val: 0, chain: true, notice: true, broke(s, b, ev) {
      emit(s, ev, 'deepLavaBurst', { r: b.r, c: b.c });
      later(s, p.flowGap, 'deepLava', { r: b.r, c: b.c, vol: p.pocket });
    } },
    lavaglass: { at: 431, hp: 2, val: 4, chain: true, notice: true, broke(s, b, ev) {
      const depth = (b.info.cry || 0) + 1;
      if (depth > 24) return;
      for (const [dr, dc] of [[0, 1], [1, 0]]) for (const m of [1, -1]) later(s, 0.04, 'crystalRay', { r: b.r + dr * m, c: b.c + dc * m, dr: dr * m, dc: dc * m, k: 1, depth, src: b.src });
      emit(s, ev, 'crystalLine', { r: b.r, c: b.c, t: b.t, depth, src: b.src });
    } },
    ember: { at: 432, hp: 6, val: 600, ore: true, notice: true },
  },
  queue: { deepLava: lavaFlow },
  gen: { row: [{ at: 45, fn(c) {
    if (c.L < 4) return;
    const id = LAWS[Math.min(c.L - 4, 3)], d = c.r - c.L * LAYER;
    const k = 1 + Math.floor(rnd() * (COLS - 3));
    if (id === 'black') {
      if (d === p.first) c.put('mushroom');
      else if (d === p.first + 1) c.put('moonstone');
      else if (d === LAYER - 1) c.put('lantern');          // a light above the Big Rock
    } else if (id === 'living') {
      if (d === p.first) c.put('torch_crate');
      else if (d === p.first + 2) c.put('amber');
      else if (d === LAYER - 1) c.put('torch_crate');      // a torch above the Big Rock
    } else if (id === 'angry') {
      if (d === p.first) { c.set(k, 'grump'); c.set(k + 1, 'tnt'); c.set(k + 2, 'copper'); }
      else if (d === p.first + 2) c.put('ruby');
    } else {
      const side = k > 4 ? k - 1 : k + 1;
      if (d === p.first + 1) { c.set(k, 'lava'); c.set(side, 'copper'); }          // lava, a soft shaft, ore beside it, a barrel at the bottom
      else if (d === p.first + 2) { c.set(k, 'dirt'); c.set(side, 'silver'); }
      else if (d === p.first + 3) { c.set(k, 'dirt'); c.set(side, 'gold'); }
      else if (d === p.first + 4) c.set(k, 'tnt');
      if (d === LAYER - p.waterRow) c.put('water');                                // water above the Big Rock
    }
  } }] },
  hooks: {
    // every broken block counts (a light, regrowth and lava are measured in blocks)
    broke: { at: 5, fn(s) { s.deep.bc++; } },
    step: { at: 910, fn(s, dt, ev) {
      const d = s.deep;
      if (d.glows.length) d.glows = d.glows.filter(g => g.until > d.bc && g.r >= s.top);
      if (d.torches.length) d.torches = d.torches.filter(t => t.r >= s.top);
      // the layer the dig has reached: its law, said once
      const L = frontLayer(s);
      if (LAWS.includes(L.id) && d.law !== L.id) { d.law = L.id; emit(s, ev, 'deepEnter', { id: L.id, idx: layersOf(s.land).indexOf(L) }); }
      if (d.back) { emit(s, ev, 'deepBack', { coins: d.back }); d.back = 0; }
      // lava cools after so many blocks, and turns to glass where water stands
      for (const k of Object.keys(d.lava)) {
        const [r, c] = k.split(',').map(Number);
        if (d.lava[k] <= d.bc || r < s.top) { delete d.lava[k]; continue; }
        if (steamed(s, r, c) && cellAt(s, r, c) === null) glassify(s, r, c, ev);
      }
    } },
    // the Angry Rock pays back what it kept, with interest
    bossDown(s) {
      const d = s.deep;
      if (d.owed > 0) { const back = Math.round(d.owed * p.rockBack); addCoins(s, back, 'rock'); d.back = back; d.owed = 0; }
    },
  },
  firsts: {
    deepGlow: () => 'deep:glow', deepTorch: () => 'deep:torch', deepRegrow: () => 'deep:regrow',
    deepShove: () => 'deep:shove', deepStone: () => 'deep:stone', deepSteal: () => 'deep:steal',
    deepThrow: () => 'deep:throw', deepThief: () => 'deep:thief',
    deepLava: () => 'deep:lava', deepBurn: () => 'deep:burn', deepBoom: () => 'deep:boom', deepGlass: () => 'deep:glass',
    deepRock: d => 'deep:rock_' + d.id,
  },
  unlocks: [
    'glow', 'torch', 'regrow', 'shove', 'stone', 'steal', 'throw', 'thief', 'lava', 'burn', 'boom', 'glass', 'rock_living', 'rock_angry',
  ].map(id => ({ id: 'deep:' + id, group: 'The Deep' })),
});
