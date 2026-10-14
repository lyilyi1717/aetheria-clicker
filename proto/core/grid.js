// Dig: the ground. The grid, the depth curves, how a row is generated, what can be reached and seen.
// Rows are absolute: row 0 is the first row of ground, row r is r metres down.
import { BLOCKS, SITES, CONTRACTS, GEN, PARAMS, layersOf, fold, run, has, scope } from './registry.js';
import { rnd } from './rng.js';

export const COLS = 10;
export const VIEW_ROWS = 9;      // rows on screen
export const KEEP_ROWS = 13;     // rows held in the state (the rest is generated on scroll)
export const LAYER = 25;         // rows in a layer

export const layerOf = r => Math.floor(r / LAYER);
// the layer def a row belongs to (the last layer of a land goes on for ever)
export function layerAt(s, r) {
  const L = layersOf(s.land);
  return L[Math.min(Math.max(0, layerOf(r)), L.length - 1)];
}
// the layer the dig has reached: its law is the one in force
export const frontLayer = s => layerAt(s, Math.max(0, s.best - 1));
export const siteOf = s => SITES[s.site] || Object.values(SITES)[0];
// a site's multiplier for something (1 when the site says nothing about it)
export const siteMult = (site, key) => (site[key] === undefined ? 1 : site[key]);

scope(siteOf);
scope(s => s.contract && CONTRACTS[s.contract]);
scope(s => { const l = frontLayer(s); return l && l.law; });

// ---------- the depth curves ----------
// How hard the ground is and what it pays is a table with one entry per layer (25 rows):
//   { hp, val, step, pay }
//   hp, val   growth per row inside the layer (1.12 = each metre is 12% harder)
//   step      the ground of this layer starts this many times harder than the last row above it:
//             the wall behind a Big Rock. pay: the same for coins (default 1).
// Where an entry comes from, first hit wins:
//   1. the layer's own def:  layers: [{ id, at, ..., grow: { hp, val, step, pay } }]   (the Deep's layers bring theirs)
//   2. PARAMS.core.grow[i]   by layer index; the last entry goes on for ever
//   layers 0 and 1 read the old knobs hpGrow / valGrow and hpGrow2 / valGrow2 unless (1) says otherwise.
// A missing key falls through to the next source. The curves are for the desert unless a land is given.
// docs/dig-pacing.md says how the numbers were chosen.
function growOf(i, L, p) {
  const own = i < L.length ? L[i].grow : undefined;
  const tab = i === 0 ? { hp: p.hpGrow, val: p.valGrow } : i === 1 ? { hp: p.hpGrow2, val: p.valGrow2 } : p.grow[Math.min(i - 2, p.grow.length - 1)];
  return own ? { ...tab, ...own } : tab;
}
function curve(r, a, key, stepKey, land) {
  const p = PARAMS.core, L = layersOf(land), n = Math.floor(r / LAYER);
  let v = a;
  for (let i = 0; i <= n; i++) {
    const g = growOf(i, L, p);
    if (i > 0 && g[stepKey] !== undefined) v *= g[stepKey];
    v *= Math.pow(g[key], i < n ? LAYER : r - n * LAYER);
  }
  return v;
}
// the first three rows are soft, so the very first block breaks in two hits
export const dirtHp = (r, land = 'desert') => (r < 3 ? 2 + r : curve(r, PARAMS.core.hp0, 'hp', 'step', land));
export const dirtVal = (r, land = 'desert') => curve(r, PARAMS.core.val0, 'val', 'pay', land);
// How hard plain ground at row r is in THIS dig, per block: the depth curve times every multiplier the `row` hooks put on a
// row as it is made, through the `groundHp` mod (sites: prove, chili, the heavy twist, chapter two). Time away prices its
// rows and its sieve with this, so a row away costs what it costs live. The site's own hardness (genRow, 1 to 1.35) stays
// out, as it always was: the same for every level of a site, and `away.rowCost` was set without it.
export const groundHp = (s, r) => dirtHp(r) * fold('groundHp', s, 1);
// How strong a dig has to be to stand at row r: hardness over what the coins of that depth can buy.
// (A pick level is x powGrow for x 1.5 the price, so coins turn into hits with the power log(powGrow)/log(1.5).)
export const wallAt = (r, land = 'desert') => dirtHp(Math.max(r, 3), land) / Math.pow(dirtVal(Math.max(r, 3), land), PARAMS.core.buyPow);
// ---------- Stars for a move ----------
// What Stars are worth: they are spent on tracks (the starshop feature): a step costs cost0 x costGrow^k
// and makes the hit (or the coins) x step. The price of k steps is cost0 (g^k - 1) / (g - 1), so C Stars in
// one track give (1 + C (g - 1) / cost0)^(ln step / ln g) (with step = g: 1 + C / 4). A player who spends
// evenly puts a third in the Pick and a third in the Bag (coins turn into hits with the power buyPow):
// S Stars carry a dig to a wall this many times higher:  x^e (x^(e buyPow)),  x = 1 + S (g - 1) / (3 cost0).
export function starLift(S) {
  const p = PARAMS.core, t = PARAMS.starshop || {};
  const step = t.step || 1.5, c0 = t.cost0 || 2, g = t.costGrow || 1.5;
  const x = 1 + S * (g - 1) / (3 * c0), e = Math.log(step) / Math.log(g);
  return Math.pow(x, e * (1 + p.buyPow));
}
// the Stars it takes to stand at row r: the lift that turns the wall a dig with no Stars reaches
// (starWall, in walls of row starFrom) into the wall at r
export function starsToStand(r, land = 'desert') {
  const p = PARAMS.core;
  const want = wallAt(r % LAYER === 0 ? r - 1 : r, land) / (p.starWall * wallAt(p.starFrom - 1, land));   // a Big Rock's row counts as the layer above it
  if (!(want > 1)) return 0;
  let lo = -3, hi = 300;                         // log10 of S
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (starLift(Math.pow(10, m)) < want) lo = m; else hi = m; }
  return Math.pow(10, hi);
}
// What a floor is worth in Stars (the sites feature pays by it): starBase at starFrom metres, starGrow times more for every
// 25 m deeper. A site that is finished pays this; a medal, a replay, leaving early and digging past the Gate pay shares of it
// (proto/features/sites/rules.js). Small whole numbers: 3 at 50 m, 14 at 75 m, 61 at 100 m, 273 at 125 m. `land` is for a second land's own curve.
// (The old curve paid a share of the Stars it takes to stand where a dig stopped: hundreds of millions in a month.
// starsToStand is still the model the sim prints next to it.)
export function starsAt(best, land = 'desert') {
  const p = PARAMS.core;
  return Math.max(1, Math.round(p.starBase * Math.pow(p.starGrow, (best - p.starFrom) / LAYER)));
}

// a block of kind t at row r (k: the site's hardness)
export function makeCell(r, t, k = 1) {
  const hp = Math.max(1, Math.round(dirtHp(r) * BLOCKS[t].hp * k));
  return { t, hp, max: hp, s: Math.floor(rnd() * 1000) };
}

// ---------- generating a row ----------
// 1. GEN.whole: a feature may make the whole row (the Big Rock does).
// 2. Each cell: one roll x. GEN.claim entries may take the cell (ore veins run on). Otherwise the
//    first GEN.base entry whose edge is above x wins; then the layer's own `blocks` table; else the fill.
//    An entry gives `upTo(ctx)` (an absolute edge) or `w(ctx)` (a width added after the widest edge so far).
// 3. GEN.row passes place the specials (chest, TNT, ...) with ctx.put / ctx.set.
// 4. the `row` hooks may change the finished row (sites, contracts, layer laws).
export function genRow(s, r) {
  for (let i = 0; i < GEN.whole.length; i++) { const made = GEN.whole[i].fn(s, r); if (made) return made; }
  const site = siteOf(s), layer = layerAt(s, r);
  const k = site.hp === undefined ? 1 : site.hp;
  const row = [];
  const ctx = {
    s, r, L: layerOf(r), layer, site, row, c: 0, x: 0, up: null, left: null,
    prev: s.rows.length ? s.rows[s.rows.length - 1] : null,
    make: t => makeCell(r, t, k),
    set: (c, t) => { row[c] = makeCell(r, t, k); },
    // a column that holds plain ground, so a special never lands on another special
    free: () => { let c; let n = 0; do { c = Math.floor(rnd() * COLS); } while (!BLOCKS[row[c].t].soft && ++n < 20); return c; },
    put: t => { row[ctx.free()] = makeCell(r, t, k); },
  };
  const fill = layer.fill || 'dirt';
  for (let c = 0; c < COLS; c++) {
    const x = rnd();
    ctx.c = c; ctx.x = x;
    ctx.up = ctx.prev && ctx.prev[c] ? ctx.prev[c].t : null;
    ctx.left = c > 0 ? row[c - 1].t : null;
    let t = null;
    for (let i = 0; i < GEN.claim.length && !t; i++) t = GEN.claim[i].fn(ctx);
    if (!t) {
      let hi = 0;
      for (let i = 0; i < GEN.base.length && !t; i++) {
        const b = GEN.base[i];
        const edge = b.upTo ? b.upTo(ctx) : hi + b.w(ctx);
        if (x < edge) t = b.pick ? b.pick(ctx) : b.id;
        else if (edge > hi) hi = edge;
      }
      if (!t && layer.blocks) for (const id of Object.keys(layer.blocks)) {
        hi += layer.blocks[id] * (site.blocks && site.blocks[id] !== undefined ? site.blocks[id] : 1);
        if (x < hi) { t = id; break; }
      }
    }
    row.push(makeCell(r, t || fill, k));
  }
  for (let i = 0; i < GEN.row.length; i++) GEN.row[i].fn(ctx);
  if (has('row')) run('row', s, ctx);
  return row;
}

export const cellAt = (s, r, c) => {
  const i = r - s.top;
  if (i < 0 || i >= s.rows.length || c < 0 || c >= COLS) return undefined;
  return s.rows[i][c];
};
export const setCell = (s, r, c, v) => { s.rows[r - s.top][c] = v; };

// A block can be hit when it touches open space. The row at the top of the view always does.
export function reachable(s, r, c) {
  const cell = cellAt(s, r, c);
  if (!cell) return false;
  if (r === s.top) return true;
  return cellAt(s, r - 1, c) === null || cellAt(s, r + 1, c) === null ||
    cellAt(s, r, c - 1) === null || cellAt(s, r, c + 1) === null;
}

// What the lamp shows: blocks within a few steps of open space. The rest is dark until you dig near it.
export const sight = s => fold('sight', s, PARAMS.core.sight);
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
  if (has('mask')) run('mask', s, m);
  return m;
}

function deepestOpen(s) {
  for (let i = s.rows.length - 1; i >= 0; i--) if (s.rows[i].some(x => x === null)) return i;
  return -1;
}
// one row leaves the top and a new one is generated at the bottom
export function shiftRow(s) {
  s.rows.shift();
  s.top++;
  s.rows.push(genRow(s, s.top + s.rows.length));
}
// the view follows the dig: returns how many rows it moved. A hook `holdView(s)` may return true to keep the
// view where it is (the Big Rock stays at the foot of the stage while it stands). This moves the picture only:
// which blocks can be hit and what the crew can reach do not depend on it.
export function scroll(s) {
  let n = 0;
  while (n < 4) {
    const topEmpty = s.rows[0].every(x => x === null);
    if (!topEmpty && deepestOpen(s) < 5) break;
    if (has('holdView') && run('holdView', s)) break;
    shiftRow(s);
    n++;
  }
  return n;
}
