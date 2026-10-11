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

const curve = (r, a, g1, g2) => a * Math.pow(g1, Math.min(r, LAYER)) * Math.pow(g2, Math.max(0, r - LAYER));
// the first three rows are soft, so the very first block breaks in two hits
export const dirtHp = r => { const p = PARAMS.core; return r < 3 ? 2 + r : curve(r, p.hp0, p.hpGrow, p.hpGrow2); };
export const dirtVal = r => { const p = PARAMS.core; return curve(r, p.val0, p.valGrow, p.valGrow2); };

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
// the view follows the dig: returns how many rows it moved
export function scroll(s) {
  let n = 0;
  while (n < 4) {
    const topEmpty = s.rows[0].every(x => x === null);
    if (!topEmpty && deepestOpen(s) < 5) break;
    shiftRow(s);
    n++;
  }
  return n;
}
