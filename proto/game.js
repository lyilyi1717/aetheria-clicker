// Dig prototype: the rules. Pure logic over one state object; no DOM, no audio.
// Everything that should be seen or heard is reported through ev(kind, data).
// Rows are absolute: row 0 is the first row of ground, row r is r metres down.

export const COLS = 10;
export const VIEW_ROWS = 9;      // rows on screen
export const KEEP_ROWS = 13;     // rows held in the state (the rest is generated on scroll)
export const LAYER = 25;         // a Big Rock guards every 25th row
export const SAVE_VERSION = 1;

export const ORES = ['copper', 'silver', 'gold', 'gem'];

// hp and coin multipliers by block type (times the depth curves below)
export const TYPES = {
  dirt:   { hp: 1,   val: 1 },
  stone:  { hp: 3,   val: 1.6 },
  hard:   { hp: 8,   val: 4 },
  copper: { hp: 2,   val: 6 },
  silver: { hp: 3,   val: 16 },
  gold:   { hp: 4,   val: 45 },
  gem:    { hp: 5,   val: 160 },
  chest:  { hp: 4,   val: 0 },
  tnt:    { hp: 1,   val: 0 },
  fossil: { hp: 3,   val: 0 },
  oil:    { hp: 2,   val: 0 },
  boss:   { hp: 1,   val: 0 },
};

export const P = {
  powGrow: 1.25,                  // each pick or training level: hits x1.25
  // hp of dirt at row r = hp0 * hpGrow^r for the first layer, then hpGrow2 per row below it
  hp0: 5, hpGrow: 1.12, hpGrow2: 1.12,
  val0: 1, valGrow: 1.10, valGrow2: 1.10,   // coins of dirt, the same way
  critChance: 0.08, critMult: 5,
  comboWindow: 2.6, comboStep: 0.04, comboCap: 50,
  crewRate: 4,                    // digger hits per second
  bossHp: 20,                     // Big Rock hp, in dirt blocks of its row
  bossPay: 120,
  weakMult: 3, weakSeconds: 1.7,  // the Big Rock's crack: hits on it count 3 times, and it moves                   // Big Rock coins, in dirt blocks of its row
  oilPay: 30, rushSeconds: 8, rushMult: 3,
  tntPower: 7,                    // TNT damage, in dirt blocks of its row
  setBonus: 0.25,
  starCoin: 0.2, starPick: 0.1,
  offlineCapHours: 12,
};

export const UPGRADES = {
  pick:    { base: 10,  grow: 1.5 },
  crew:    { base: 30,  grow: 4.2, max: 8 },
  crewPow: { base: 12,  grow: 1.5 },
  luck:    { base: 120, grow: 1.7, max: 20 },
};

export const RELICS = {
  boom:   { max: 3 },   // every Nth hit explodes
  vein:   { max: 3 },   // ore pops its neighbours of the same kind
  lucky:  { max: 3 },   // more big hits
  heavy:  { max: 3 },   // bigger big hits
  deep:   { max: 3 },   // hits go through to the block below
  wide:   { max: 3 },   // hits spill left and right
  bang:   { max: 2 },   // bigger TNT, more of it
  karak:  { max: 3 },   // faster diggers
  shiny:  { max: 3 },   // ore pays more
  streak: { max: 3 },   // combo builds faster
  nose:   { max: 2 },   // more chests
  echo:   { max: 3 },   // chance to strike twice
  lamp:   { max: 2 },   // see further into the ground
};

// A site is where you dig. Each one bends the rules of the ground.
export const SITES = {
  dunes: { tnt: 1, ore: 1, bone: 1, chest: 1, hp: 1 },
  boom:  { tnt: 3.2, ore: 1, bone: 1, chest: 1, hp: 1.25 },     // Powder Valley
  gold:  { tnt: 1, ore: 2.2, bone: 1, chest: 0.8, hp: 1.35 },   // Golden Wadi
  bones: { tnt: 1, ore: 1, bone: 4, chest: 1.6, hp: 1.2 },      // Valley of Beasts
};

export const SETS = {
  camel: { pieces: 4, fromLayer: 0 },
  whale: { pieces: 5, fromLayer: 1 },
  djinn: { pieces: 6, fromLayer: 2 },
};

const rnd = () => Math.random();
const pickOne = a => a[Math.floor(rnd() * a.length)];

export function newState() {
  const s = {
    v: SAVE_VERSION,
    coins: 0, total: 0,
    top: 0,                  // absolute row of rows[0]
    best: 0,                 // deepest row ever opened
    rows: [],
    up: { pick: 0, crew: 0, crewPow: 0, luck: 0 },
    relics: {},
    chests: 0,               // found, not opened yet
    chestsOpened: 0,
    fossils: {},             // 'camel.2': count
    sets: {},                // completed sets
    stars: 0, sites: 0, site: 'dunes',
    combo: 0, comboT: 0, bestCombo: 0,
    hits: 0,
    rush: 0,                 // seconds of oil rush left
    boss: null,              // { row, hp, max }
    bossesDown: 0,
    diggers: [],             // { c, r, tc, tr, cd, swing }
    queue: [],               // delayed effects: { at, kind, r, c, ... }
    t: 0,
    crewCps: 0,
    seen: {},                // first-time flags (tutorial events are placed, not left to luck)
    savedAt: 0,
  };
  for (let i = 0; i < KEEP_ROWS; i++) s.rows.push(genRow(s, i));
  return s;
}

export const layerOf = r => Math.floor(r / LAYER);
const curve = (r, a, g1, g2) => a * Math.pow(g1, Math.min(r, LAYER)) * Math.pow(g2, Math.max(0, r - LAYER));
// the first three rows are soft, so the very first block breaks in two hits
export const dirtHp = r => r < 3 ? 2 + r : curve(r, P.hp0, P.hpGrow, P.hpGrow2);
export const dirtVal = r => curve(r, P.val0, P.valGrow, P.valGrow2);
export const isBossRow = r => r > 0 && r % LAYER === 0;
export const rel = (s, id) => s.relics[id] || 0;

export function coinMult(s) {
  return (1 + 0.1 * s.up.luck) * (1 + P.starCoin * s.stars) * (1 + P.setBonus * Object.keys(s.sets).length);
}
export const pickPower = s => Math.pow(P.powGrow, s.up.pick) * (1 + P.starPick * s.stars);
export const crewPower = s => Math.pow(P.powGrow, s.up.crewPow) * (1 + P.starPick * s.stars);
export const crewRate = s => P.crewRate * (1 + 0.5 * rel(s, 'karak'));
export const critChance = s => P.critChance + 0.07 * rel(s, 'lucky');
export const critMult = s => P.critMult + 3 * rel(s, 'heavy');
export const comboMult = s => 1 + Math.min(s.combo, P.comboCap) * P.comboStep;
export const boomEvery = s => [0, 12, 9, 6][rel(s, 'boom')];

export function upgradeCost(s, id) {
  const u = UPGRADES[id];
  return Math.ceil(u.base * Math.pow(u.grow, s.up[id]));
}
export function canBuy(s, id) {
  const u = UPGRADES[id];
  return (u.max === undefined || s.up[id] < u.max) && s.coins >= upgradeCost(s, id);
}
export function buy(s, id, ev = () => {}) {
  if (!canBuy(s, id)) return false;
  s.coins -= upgradeCost(s, id);
  s.up[id]++;
  if (id === 'crew') s.diggers.push({ c: Math.floor(rnd() * COLS), r: s.top, tc: -1, tr: -1, cd: 0.3, swing: 0 });
  ev('buy', { id, level: s.up[id] });
  return true;
}

// ---------- the ground ----------

function makeCellAt(r, t, k = 1) {
  const hp = Math.max(1, Math.round(dirtHp(r) * TYPES[t].hp * k));
  return { t, hp, max: hp, s: Math.floor(rnd() * 1000) };
}

function oreFor(r) {
  const L = layerOf(r), x = rnd();
  // each layer shifts the table one step richer
  const table = [
    [0.86, 0.99, 1.0, 1.0],
    [0.55, 0.88, 0.985, 1.0],
    [0.3, 0.7, 0.94, 1.0],
    [0.15, 0.5, 0.86, 1.0],
  ][Math.min(L, 3)];
  return ORES[table.findIndex(p => x < p)];
}

export function genRow(s, r) {
  const row = [];
  if (isBossRow(r)) {
    for (let c = 0; c < COLS; c++) row.push({ t: 'boss', hp: 1, max: 1, s: c });
    return row;
  }
  const L = layerOf(r);
  const prev = s.rows.length ? s.rows[s.rows.length - 1] : null;
  const site = SITES[s.site] || SITES.dunes;
  const nose = (1 + 0.6 * rel(s, 'nose')) * site.chest;
  const bang = (1 + 0.5 * rel(s, 'bang')) * site.tnt;
  const makeCell = (rr, t) => makeCellAt(rr, t, site.hp);
  for (let c = 0; c < COLS; c++) {
    let t = 'dirt';
    const x = rnd();
    const up = prev && prev[c] ? prev[c].t : null;
    const left = c > 0 ? row[c - 1].t : null;
    const near = ORES.includes(up) ? up : ORES.includes(left) ? left : null;
    if (near && rnd() < 0.3) t = near;                        // veins run on
    else if (x < 0.045 * site.ore) t = oreFor(r);
    else if (x < 0.055 + 0.16 + 0.03 * L) t = 'stone';
    else if (r >= 10 && x < 0.25 + 0.03 * L + 0.035 + 0.01 * L) t = 'hard';
    row.push(makeCell(r, t));
  }
  // specials: at most one of each kind in a row, never on top of each other
  const free = () => { let c; let n = 0; do { c = Math.floor(rnd() * COLS); } while (!['dirt', 'stone'].includes(row[c].t) && ++n < 20); return c; };
  const put = t => { row[free()] = makeCell(r, t); };
  // placed for the first session (owner rule: tutorial events are summoned, not left to luck)
  if (r === 1) { const c = 3 + Math.floor(rnd() * 3); row[c] = makeCell(r, 'copper'); row[c + 1] = makeCell(r, 'copper'); }
  if (r === 2) { const c = 3 + Math.floor(rnd() * 3); row[c] = makeCell(r, 'copper'); }
  if (r === 6 && !s.seen.chest) { put('chest'); s.seen.chest = true; }
  else if (r > 6 && rnd() < 0.085 * nose) put('chest');
  if (r === 8 && !s.seen.tnt) {      // two barrels side by side: the first blast is a chain
    const c = 2 + Math.floor(rnd() * 5);
    row[c] = makeCell(r, 'tnt'); row[c + 1] = makeCell(r, 'tnt'); row[c + 2] = makeCell(r, 'copper');
    s.seen.tnt = true;
  }
  else if (r > 8 && rnd() < Math.min(0.9, 0.2 * bang)) { put('tnt'); if (rnd() < 0.35) put('tnt'); }
  if (r === 13 && !s.seen.fossil) { put('fossil'); s.seen.fossil = true; }
  else if (r > 13 && rnd() < 0.075 * site.bone) put('fossil');
  if (r === LAYER + 4 && !s.seen.oil) { put('oil'); s.seen.oil = true; }
  else if (r > LAYER + 4 && rnd() < 0.07) put('oil');
  if (r === 7 || r === 17) { const c = 1 + Math.floor(rnd() * 7); row[c] = makeCell(r, 'silver'); }
  if (r === 21) { row[free()] = makeCell(r, 'gold'); }
  return row;
}

export const cellAt = (s, r, c) => {
  const i = r - s.top;
  if (i < 0 || i >= s.rows.length || c < 0 || c >= COLS) return undefined;
  return s.rows[i][c];
};
const setCell = (s, r, c, v) => { s.rows[r - s.top][c] = v; };

// A block can be hit when it touches open space. The row at the top of the view always does.
export function reachable(s, r, c) {
  const cell = cellAt(s, r, c);
  if (!cell) return false;
  if (r === s.top) return true;
  return cellAt(s, r - 1, c) === null || cellAt(s, r + 1, c) === null ||
    cellAt(s, r, c - 1) === null || cellAt(s, r, c + 1) === null;
}

// What the lamp shows: blocks within a few steps of open space. The rest is dark until you dig near it.
export const sight = s => 2 + rel(s, 'lamp');
export function visibleMask(s) {
  const R = sight(s), n = s.rows.length;
  const m = [];
  for (let i = 0; i < n; i++) m.push(new Array(COLS).fill(i < R));
  for (let i = 0; i < n; i++) for (let c = 0; c < COLS; c++) {
    if (s.rows[i][c] !== null) continue;
    for (let di = -R; di <= R; di++) for (let dc = -R; dc <= R; dc++) {
      const a = i + di, b = c + dc;
      if (a >= 0 && a < n && b >= 0 && b < COLS) m[a][b] = true;
    }
  }
  return m;
}

function ensureBoss(s, r) {
  if (!s.boss || s.boss.row !== r) {
    const hp = Math.round(dirtHp(r) * P.bossHp * (1 + 0.25 * layerOf(r - 1)));
    s.boss = { row: r, hp, max: hp, weak: Math.floor(rnd() * COLS), wt: P.weakSeconds };
  }
  return s.boss;
}
export function bossInView(s) {
  for (let i = 0; i < VIEW_ROWS; i++) if (isBossRow(s.top + i) && s.rows[i].some(x => x)) return ensureBoss(s, s.top + i);
  return null;
}

// ---------- hitting ----------

function addCoins(s, n, src) {
  s.coins += n; s.total += n;
  if (src === 'crew') s._crewEarn = (s._crewEarn || 0) + n;
}

// damage one block; returns true if it broke
function damage(s, r, c, dmg, src, ev, info = {}) {
  const cell = cellAt(s, r, c);
  if (!cell) return false;
  if (cell.t === 'boss') {
    const b = ensureBoss(s, r);
    if (b.hp <= 0) return false;
    const weak = src === 'you' && c === b.weak;       // the glowing crack: aim for it
    if (weak) dmg *= P.weakMult;
    b.hp -= dmg;
    ev('hit', { r, c, t: 'boss', dmg, src, crit: info.crit, weak, frac: Math.max(0, b.hp / b.max) });
    if (b.hp <= 0) bossDown(s, r, src, ev);
    return b.hp <= 0;
  }
  cell.hp -= dmg;
  if (cell.hp > 0) {
    ev('hit', { r, c, t: cell.t, dmg, src, crit: info.crit, frac: cell.hp / cell.max });
    return false;
  }
  breakCell(s, r, c, src, ev, info);
  return true;
}

function breakCell(s, r, c, src, ev, info = {}) {
  const cell = cellAt(s, r, c);
  if (!cell) return;
  setCell(s, r, c, null);
  if (r + 1 > s.best) s.best = r + 1;
  const T = TYPES[cell.t];
  let coins = 0;
  const byHand = src === 'you';
  if (byHand && !info.chain) {
    s.combo += 1 + rel(s, 'streak');
    s.comboT = P.comboWindow;
    if (s.combo > s.bestCombo) s.bestCombo = s.combo;
  }
  if (T.val > 0) {
    const ore = ORES.includes(cell.t);
    coins = dirtVal(r) * T.val * coinMult(s) * (ore ? 1 + 0.4 * rel(s, 'shiny') : 1);
    if (byHand) coins *= comboMult(s);
    coins = Math.max(1, Math.round(coins));
    addCoins(s, coins, src);
  }
  ev('break', { r, c, t: cell.t, coins, src, combo: s.combo, chain: info.chain || 0, seed: cell.s });

  if (cell.t === 'chest') { s.chests++; ev('chest', { r, c, src }); }
  if (cell.t === 'tnt') s.queue.push({ at: s.t + 0.12, kind: 'blast', r, c, rad: 1 + rel(s, 'bang'), dmg: dirtHp(r) * P.tntPower, src });
  if (cell.t === 'fossil') foundFossil(s, r, c, src, ev);
  if (cell.t === 'oil') {
    const pay = Math.round(dirtVal(r) * P.oilPay * coinMult(s));
    addCoins(s, pay, src);
    s.rush = P.rushSeconds;
    ev('gusher', { r, c, coins: pay, src });
  }
  // Vein Popper: the same ore next door pops too, one after another
  if (ORES.includes(cell.t) && rel(s, 'vein') && byHand) {
    const left = info.veinLeft === undefined ? [0, 3, 7, 99][rel(s, 'vein')] : info.veinLeft;
    if (left > 0) {
      let n = 0;
      for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const o = cellAt(s, r + dr, c + dc);
        if (o && o.t === cell.t && !o.q) {
          o.q = true; n++;
          s.queue.push({ at: s.t + 0.07 * n, kind: 'pop', r: r + dr, c: c + dc, src, chain: (info.chain || 0) + 1, veinLeft: left - 1 });
        }
      }
    }
  }
}

function foundFossil(s, r, c, src, ev) {
  const L = layerOf(r);
  const open = Object.keys(SETS).filter(k => SETS[k].fromLayer <= L && !s.sets[k]);
  const all = Object.keys(SETS).filter(k => SETS[k].fromLayer <= L);
  const set = open.length ? pickOne(open) : pickOne(all);
  const missing = [];
  for (let i = 0; i < SETS[set].pieces; i++) if (!s.fossils[`${set}.${i}`]) missing.push(i);
  // a missing piece 3 times in 4: a set is never blocked by bad luck for long
  const piece = missing.length && rnd() < 0.75 ? pickOne(missing) : Math.floor(rnd() * SETS[set].pieces);
  const key = `${set}.${piece}`;
  const isNew = !s.fossils[key];
  s.fossils[key] = (s.fossils[key] || 0) + 1;
  let coins = 0;
  if (!isNew) { coins = Math.round(dirtVal(r) * 25 * coinMult(s)); addCoins(s, coins, src); }
  ev('fossil', { r, c, set, piece, isNew, coins });
  if (isNew && missing.length === 1 && !s.sets[set]) {
    s.sets[set] = true;
    ev('set', { set });
  }
}

function behindBoss(s, from, to) {
  for (let r = Math.min(from, to); r <= Math.max(from, to); r++) {
    if (r !== to && r !== from && isBossRow(r) && cellAt(s, r, 0)) return true;
    if (r === from && r !== to && isBossRow(r) && cellAt(s, r, 0)) return true;
  }
  return false;
}

function blast(s, q, ev) {
  ev('blast', { r: q.r, c: q.c, rad: q.rad });
  let hitBoss = false;
  for (let dr = -q.rad; dr <= q.rad; dr++) {
    for (let dc = -q.rad; dc <= q.rad; dc++) {
      if (!dr && !dc) continue;
      const cell = cellAt(s, q.r + dr, q.c + dc);
      if (!cell) continue;
      if (behindBoss(s, q.r, q.r + dr)) continue;   // a blast never reaches past a Big Rock
      if (cell.t === 'boss') { if (hitBoss) continue; hitBoss = true; }   // and counts once against it
      if (cell.t === 'tnt') {           // chains, a beat later
        if (!cell.q) { cell.q = true; s.queue.push({ at: s.t + 0.14 + 0.05 * (Math.abs(dr) + Math.abs(dc)), kind: 'pop', r: q.r + dr, c: q.c + dc, src: q.src, chain: 1 }); }
        continue;
      }
      damage(s, q.r + dr, q.c + dc, q.dmg, q.src, ev, { chain: 1 });
    }
  }
}

function bossDown(s, r, src, ev) {
  const pay = Math.round(dirtVal(r) * P.bossPay * coinMult(s));
  addCoins(s, pay, src);
  s.bossesDown = Math.max(s.bossesDown, layerOf(r));
  s.chests += 1;
  for (let c = 0; c < COLS; c++) setCell(s, r, c, null);
  if (r + 1 > s.best) s.best = r + 1;
  ev('bossDown', { r, coins: pay, layer: layerOf(r) });
}

// The player's swing at one block. Returns false if nothing could be hit there.
export function swing(s, r, c, ev = () => {}) {
  if (!reachable(s, r, c)) return false;
  s.hits++;
  let dmg = pickPower(s) * (s.rush > 0 ? P.rushMult : 1);
  const crit = rnd() < critChance(s);
  if (crit) dmg *= critMult(s);
  const twice = rel(s, 'echo') && rnd() < 0.15 * rel(s, 'echo');
  const info = { crit };
  ev('swing', { r, c, crit, twice });
  damage(s, r, c, dmg, 'you', ev, info);
  if (twice) s.queue.push({ at: s.t + 0.09, kind: 'dmg', r, c, dmg, src: 'you' });
  const onBoss = isBossRow(r);
  const deep = onBoss ? 0 : rel(s, 'deep'), wide = onBoss ? 0 : rel(s, 'wide');
  if (deep) damage(s, r + 1, c, dmg * [0, 0.5, 0.75, 1][deep], 'you', ev, { chain: 1 });
  if (wide) {
    damage(s, r, c - 1, dmg * [0, 0.3, 0.5, 0.7][wide], 'you', ev, { chain: 1 });
    damage(s, r, c + 1, dmg * [0, 0.3, 0.5, 0.7][wide], 'you', ev, { chain: 1 });
  }
  const every = boomEvery(s);
  if (every && s.hits % every === 0) s.queue.push({ at: s.t + 0.05, kind: 'blast', r, c, rad: 1, dmg: dmg * 3, src: 'you', centre: true });
  return true;
}

// ---------- time ----------

function deepestOpen(s) {
  for (let i = s.rows.length - 1; i >= 0; i--) if (s.rows[i].some(x => x === null)) return i;
  return -1;
}

function scroll(s, ev) {
  let n = 0;
  while (n < 4) {
    const topEmpty = s.rows[0].every(x => x === null);
    if (!topEmpty && deepestOpen(s) < 5) break;
    s.rows.shift();
    s.top++;
    s.rows.push(genRow(s, s.top + s.rows.length));
    n++;
  }
  if (n) {
    for (const d of s.diggers) if (d.tr < s.top) { d.tr = -1; d.tc = -1; }
    ev('scroll', { n });
  }
}

function chooseTarget(s, d) {
  let best = null, bestScore = 1e9;
  for (let i = 0; i < VIEW_ROWS; i++) {
    for (let c = 0; c < COLS; c++) {
      const r = s.top + i;
      const cell = s.rows[i][c];
      if (!cell || !reachable(s, r, c)) continue;
      let score = i * 12 + Math.abs(c - d.c);
      if (s.diggers.some(o => o !== d && o.tr === r && o.tc === c)) score += 30;
      if (score < bestScore) { bestScore = score; best = [r, c]; }
    }
  }
  if (best) { d.tr = best[0]; d.tc = best[1]; } else { d.tr = -1; d.tc = -1; }
}

export function step(s, dt, ev = () => {}) {
  s.t += dt;
  if (s.rush > 0) { s.rush = Math.max(0, s.rush - dt); if (s.rush === 0) ev('rushEnd', {}); }
  if (s.combo > 0) {
    s.comboT -= dt;
    if (s.comboT <= 0) { ev('comboEnd', { combo: s.combo }); s.combo = 0; }
  }
  const boss = bossInView(s);
  if (boss && boss.hp > 0) {
    boss.wt = (boss.wt === undefined ? P.weakSeconds : boss.wt) - dt;
    if (boss.wt <= 0) {
      boss.wt = P.weakSeconds;
      let c; do { c = Math.floor(rnd() * COLS); } while (c === boss.weak);
      boss.weak = c;
    }
  }
  // delayed effects
  if (s.queue.length) {
    const due = s.queue.filter(q => q.at <= s.t);
    if (due.length) {
      s.queue = s.queue.filter(q => q.at > s.t);
      for (const q of due) {
        if (q.kind === 'blast') { if (q.centre) damage(s, q.r, q.c, q.dmg, q.src, ev, { chain: 1 }); blast(s, q, ev); }
        else if (q.kind === 'pop') { if (cellAt(s, q.r, q.c)) breakCell(s, q.r, q.c, q.src, ev, { chain: q.chain, veinLeft: q.veinLeft }); }
        else if (q.kind === 'dmg') damage(s, q.r, q.c, q.dmg, q.src, ev, { chain: 1 });
      }
    }
  }
  // the crew
  const rate = crewRate(s);
  for (const d of s.diggers) {
    if (d.tr < 0 || !cellAt(s, d.tr, d.tc)) chooseTarget(s, d);
    if (d.tr < 0) continue;
    const dc = d.tc - d.c, drr = d.tr - d.r;
    const moving = Math.abs(dc) > 0.05 || Math.abs(drr) > 0.05;
    d.c += Math.sign(dc) * Math.min(Math.abs(dc), dt * 6);
    d.r += Math.sign(drr) * Math.min(Math.abs(drr), dt * 6);
    if (moving) continue;
    d.cd -= dt;
    if (d.cd <= 0) {
      d.cd += 1 / rate;
      if (d.cd < 0) d.cd = 0;
      d.swing = 1;
      damage(s, d.tr, d.tc, crewPower(s), 'crew', ev);
    }
  }
  scroll(s, ev);
  // what the crew earns by itself, for the time-away estimate
  s._acc = (s._acc || 0) + dt;
  if (s._acc >= 5) {
    const cps = (s._crewEarn || 0) / s._acc;
    s.crewCps = s.crewCps ? s.crewCps * 0.7 + cps * 0.3 : cps;
    s._acc = 0; s._crewEarn = 0;
  }
}

// ---------- chests ----------

export function rollDraft(s) {
  const pool = Object.keys(RELICS).filter(id => rel(s, id) < RELICS[id].max)
    .filter(id => id !== 'karak' || s.up.crew > 0)
    .filter(id => id !== 'bang' || s.seen.tnt)
    .filter(id => id !== 'heavy' || s.chestsOpened > 0);
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}
export function takeRelic(s, id, ev = () => {}) {
  if (s.chests <= 0) return false;
  s.chests--; s.chestsOpened++;
  if (id) { s.relics[id] = rel(s, id) + 1; ev('relic', { id, level: s.relics[id] }); }
  return true;
}

// ---------- a new site (the first reset) ----------

export const canNewSite = s => s.bossesDown >= 2;
export const starsFor = s => Math.max(1, Math.floor(s.best / 10) - 2);
export function newSite(s, site, ev = () => {}) {
  if (!canNewSite(s) || !SITES[site]) return false;
  const gain = starsFor(s);
  const keep = { stars: s.stars + gain, sites: s.sites + 1, site, fossils: s.fossils, sets: s.sets, seen: { ...s.seen, siteToast: false, bossToast: true }, bestCombo: s.bestCombo };
  const f = newState();
  for (const k of Object.keys(s)) delete s[k];
  Object.assign(s, f, keep);
  s.rows = [];
  for (let i = 0; i < KEEP_ROWS; i++) s.rows.push(genRow(s, i));
  ev('newSite', { gain, stars: s.stars });
  return true;
}

// ---------- time away ----------

// The crew keeps digging while the page is closed. They stop at a Big Rock and wait for you.
export function settleAway(s, seconds) {
  const secs = Math.min(seconds, P.offlineCapHours * 3600);
  const out = { seconds: secs, coins: 0, metres: 0, chests: 0, atBoss: false };
  if (!s.diggers.length || secs < 30) return out;
  let budget = s.diggers.length * crewRate(s) * crewPower(s) * secs;
  let r = s.top;
  let rows = 0;
  while (rows < 400) {
    if (bossInView(s) || isBossRow(r + VIEW_ROWS - 2)) { out.atBoss = !!bossInView(s) || isBossRow(r + VIEW_ROWS - 2); break; }
    const cost = dirtHp(r) * COLS * 1.9;
    if (budget < cost) break;
    budget -= cost;
    out.coins += dirtVal(r) * COLS * 2.2 * coinMult(s);
    if (Math.random() < 0.085 * (1 + 0.6 * rel(s, 'nose'))) out.chests++;
    s.rows.shift(); s.top++; s.rows.push(genRow(s, s.top + s.rows.length));
    r++; rows++;
  }
  out.chests = Math.min(out.chests, 6);
  out.coins = Math.round(out.coins);
  out.metres = rows;
  s.coins += out.coins; s.total += out.coins; s.chests += out.chests;
  if (s.top + 1 > s.best) s.best = s.top + 1;
  for (const d of s.diggers) { d.tr = -1; d.tc = -1; d.r = s.top; }
  return out;
}

// ---------- save ----------

export function serialize(s) {
  const o = { ...s, queue: [], _acc: 0, _crewEarn: 0, savedAt: Date.now() };
  return JSON.stringify(o);
}
export function deserialize(text) {
  try {
    const o = JSON.parse(text);
    if (!o || o.v !== SAVE_VERSION || !Array.isArray(o.rows) || o.rows.length !== KEEP_ROWS) return null;
    const s = Object.assign(newState(), o);
    s.queue = [];
    for (const row of s.rows) for (const cell of row) if (cell) delete cell.q;
    return s;
  } catch { return null; }
}
