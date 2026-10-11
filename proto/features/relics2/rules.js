// Dig feature (rules): twelve more relics, built as six pairs. Each one changes the hit itself or
// what blocks do to each other, and each names its partner (`pair`).
//
//   hop    Jumping Pick   <->  twin    Twin Stone      your hit jumps to the same kind / you make more of that kind
//   fling  Flying Rocks   <->  magnet  Magnet          broken blocks fly and smash / flying rocks land on ore
//   fire   Hot Pick       <->  fuse    Fire Barrels    fire that spreads / TNT throws fire and fire sets off TNT
//   rang   Boomerang      <->  fall    Landslide       cut along a row (and swing slower) / what hangs, falls
//   borrow Borrowed Pick  <->  fazaa   Faz'a           Rafeeqs swing your pick / Rafeeqs come to your block
//   garden Ore Garden     <->  melt    Melting Pot     ore grows / touching ore melts into better ore
//
// The draft. A relic is offered once the player has got far enough (`when`), or at once when its
// partner is held. On top of that the `draftPool` mod below puts the missing partner of a held relic
// on the card with chance `pairChance`; it works for any relic that names a `pair`, not only these.
//
// State: one slice, `relics2` (counters and the last swing). It starts over with the relics at a New Site.
// Marks on a cell: `f` heat and `ft` ticks of fire left, `ch` charred (it has burned once), `fd` rows fallen.
// Fire damage has src 'fire' (it is nobody's hand, so no combo and no hit numbers).
// The Borrowed Pick counts Rafeeq hits inside its `damage` mod: that mod returns the value unchanged
// and only orders a delayed swing. There is no hook for "a Rafeeq hit"; see the PR.
// Events for the page: relics2Hop, relics2Twin, relics2Fling, relics2Thud, relics2Pull, relics2Rang,
// relics2Borrow, relics2Grow, relics2Melt, relics2Gift, relics2Fire.
//
// For `fusion`: the pairs that should fuse best are the ones that already feed each other in a loop.
//   fire + fuse      -> one relic: TNT that rains fire which makes TNT (the twist: the fire never chars)
//   garden + melt    -> an ore that grows and ripens by itself up to a gem
//   fling + magnet   -> rocks that orbit the pick and land where it points
//   rang + fall      -> a boomerang that cuts a row and brings the roof down in one move
//   hop + twin       -> a hit that turns each block it jumps to into the kind it started from
// Across pairs: twin + melt (twins feed the pot), fall + fuse (falling barrels), borrow + rang
// (every Rafeeq throws one). borrow + fazaa is the weakest fusion: both only move Rafeeqs about.
import { use, BLOCKS, RELICS, PARAMS, emit, fold } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { COLS, VIEW_ROWS, cellAt, setCell, makeCell, reachable, siteOf, siteMult, layerAt } from '../../core/grid.js';
import { damage, breakCell, later, rel, swing, pickPower } from '../../core/rules.js';
import { t } from '../../core/strings.js';
import { ORES } from '../ores/rules.js';
import { crewPower } from '../diggers/rules.js';
import strings from './strings.js';

const p = {
  pairChance: 0.4,              // a chest shows the missing partner of a relic you hold
  // when each pair may first be offered: relics and relic levels found so far, in all sites
  openHop: 1, openFling: 3, openFire: 4, openCrew: 5, openGarden: 8,

  hopRange: 3, hopDmg: 0.6, hopGap: 0.08, hopJumps: [0, 1, 2, 2], hopMax: 8,
  twinEvery: 5, twinCount: [0, 1, 2, 2], twinNot: ['chest'],
  flingFrac: 0.5,               // a flying block hits for this share of its own strength
  flingSide: 3, flingUp: 1, flingDown: 2, flingTime: 0.35, flingBounce: [0, 0, 1, 3],
  magEvery: 4, magRange: 6, magCount: [0, 1, 1, 6],
  fireHeat: [0, 2, 3, 3],       // how many steps a fire can spread
  fireTick: 0.25, fireTicks: 6, fireDmg: 0.5, fireCreep: 0.12,
  fuseHeat: [0, 2, 3, 3], fuseRing: 2, fuseAsh: 0.06,
  rangReach: 4, rangDmg: 1, rangTime: 0.28,
  fallTick: 0.07, fallFrac: 0.35, fallMaxRows: 3, fallSide: 0.5,
  borrowEvery: [0, 6, 4, 4], borrowGap: 0.06,
  fazaaN: [0, 2, 99, 99], fazaaHold: 1.2, fazaaBeat: 2,
  growEvery: 14, growN: [0, 1, 2, 2], growBetter: 0.25,
  meltTick: 0.35, meltNeed: [0, 3, 3, 2], meltTop: 'chest',
};

const NEAR = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const kindOf = o => BLOCKS[o.t];
const pick = a => a[Math.floor(rnd() * a.length)];
const inView = (s, r) => r >= s.top && r - s.top < VIEW_ROWS;
// change a block into another kind, at the strength of its own row
function turn(s, r, c, kind) { setCell(s, r, c, makeCell(r, kind, siteMult(siteOf(s), 'hp'))); }
// the soft blocks beside a place (a special may replace them)
function softNear(s, r, c, not) {
  const out = [];
  for (const [dr, dc] of NEAR) {
    const o = cellAt(s, r + dr, c + dc);
    if (o && kindOf(o).soft && !o.q && o.t !== not && inView(s, r + dr)) out.push([r + dr, c + dc]);
  }
  return out;
}
// every block on screen that passes the test and is `from`..`range` steps from (r, c), nearest first
function nearest(s, r, c, test, range, from = 1) {
  const out = [];
  for (let i = 0; i < Math.min(VIEW_ROWS, s.rows.length); i++) for (let cc = 0; cc < COLS; cc++) {
    const o = s.rows[i][cc];
    if (!o || o.q) continue;
    const d = Math.abs(s.top + i - r) + Math.abs(cc - c);
    if (d < from || d > range || !test(o)) continue;
    out.push({ r: s.top + i, c: cc, d: d + rnd() * 0.5 });
  }
  return out.sort((a, b) => a.d - b.d);
}
// a present when a relic is taken: the soft block nearest to the pick becomes `kind`
function gift(s, kind, ev) {
  const st = s.relics2;
  const r = st.lt === null ? s.top : Math.max(st.lr, s.top), c = st.lt === null ? COLS >> 1 : st.lc;
  const spot = nearest(s, r, c, o => !!kindOf(o).soft, COLS + VIEW_ROWS)[0];
  if (!spot || !BLOCKS[kind]) return false;
  turn(s, spot.r, spot.c, kind);
  emit(s, ev, 'relics2Gift', { r: spot.r, c: spot.c, t: kind });
  return true;
}
// one present per level of a relic (the levels already paid for are kept in the slice)
const gifts = (id, kind) => ({ at: 505, fn(s, dt, ev) {
  const st = s.relics2;
  if ((st.gift[id] || 0) < rel(s, id) && gift(s, kind(), ev)) st.gift[id] = (st.gift[id] || 0) + 1;
} });

// ---------- hop: the hit jumps to the next block of the same kind ----------

function hopFrom(s, r, c, kind, dmg, left, n) {
  const to = nearest(s, r, c, o => o.t === kind, p.hopRange)[0];
  if (to) later(s, p.hopGap, 'relics2Hop', { fr: r, fc: c, r: to.r, c: to.c, t: kind, dmg, left, n });
}
function hopLand(s, q, ev) {
  const o = cellAt(s, q.r, q.c);
  if (!o || o.t !== q.t) return;
  emit(s, ev, 'relics2Hop', { fr: q.fr, fc: q.fc, r: q.r, c: q.c });
  const broke = damage(s, q.r, q.c, q.dmg, 'you', ev, { chain: 1, hop: 1 });
  const left = broke && rel(s, 'hop') >= 3 ? q.left : q.left - 1;   // at level 3 a jump that breaks is free
  if (left > 0 && q.n < p.hopMax) hopFrom(s, q.r, q.c, q.t, q.dmg, left, q.n + 1);
}

// ---------- twin: a charged pick copies the ore or TNT it breaks ----------

export const relics2TwinReady = s => rel(s, 'twin') > 0 && s.relics2.n >= p.twinEvery;
function twinable(B, lv) {
  if (B.wall || p.twinNot.includes(B.id)) return false;
  return !!(B.ore || B.chain || (lv >= 3 && B.notice));
}

// ---------- fling: broken blocks fly ----------

function fling(s, r, c, kind, max, left, ev) {
  let to = null;
  if (rel(s, 'magnet')) to = nearest(s, r, c, o => !!kindOf(o).ore, p.magRange)[0];   // the pair: rocks land on ore
  if (!to) {
    const spots = [];
    for (let dr = -p.flingUp; dr <= p.flingDown; dr++) for (let dc = -p.flingSide; dc <= p.flingSide; dc++) {
      if ((dr || dc) && cellAt(s, r + dr, c + dc)) spots.push({ r: r + dr, c: c + dc });
    }
    if (!spots.length) return;
    to = pick(spots);
  }
  emit(s, ev, 'relics2Fling', { fr: r, fc: c, r: to.r, c: to.c, t: kind, dur: p.flingTime });
  later(s, p.flingTime, 'relics2Land', { r: to.r, c: to.c, dmg: max * p.flingFrac, left });
}
function flingLand(s, q, ev) {
  let r = q.r;
  while (cellAt(s, r, q.c) === null) r++;            // its block is gone: it drops on what is below
  const o = cellAt(s, r, q.c);
  if (!o) return;
  const kind = o.t, max = o.max, wall = kindOf(o).wall;
  emit(s, ev, 'relics2Thud', { r, c: q.c });
  const broke = damage(s, r, q.c, q.dmg, 'you', ev, { chain: 1, fling: 1 });
  if (broke && !wall && q.left > 0) fling(s, r, q.c, kind, max, q.left - 1, ev);
}

// ---------- magnet: treasure comes to the pick ----------

function pullable(B, lv) {
  if (B.wall || B.chain) return false;
  return !!(B.ore || (lv >= 2 && B.notice));
}
function pull(s, r, c, ev) {
  const lv = rel(s, 'magnet');
  let n = p.magCount[lv];
  for (const o of nearest(s, r, c, x => pullable(kindOf(x), lv), p.magRange, 2)) {
    if (n <= 0) break;
    const dr = Math.sign(r - o.r), dc = Math.sign(c - o.c);
    const steps = Math.abs(r - o.r) >= Math.abs(c - o.c) ? [[dr, 0], [0, dc]] : [[0, dc], [dr, 0]];
    for (const [a, b] of steps) {
      if (!a && !b) continue;
      const x = cellAt(s, o.r + a, o.c + b);
      if (!x || !kindOf(x).soft || x.q || !inView(s, o.r + a)) continue;   // it only swaps places with plain ground
      const me = cellAt(s, o.r, o.c);
      setCell(s, o.r + a, o.c + b, me); setCell(s, o.r, o.c, x);
      emit(s, ev, 'relics2Pull', { fr: o.r, fc: o.c, r: o.r + a, c: o.c + b, t: me.t });
      n--;
      break;
    }
  }
}

// ---------- fire ----------

function burnable(s, o) {
  const B = kindOf(o);
  if (B.wall || B.chain || o.ch) return false;
  return !!B.soft || (rel(s, 'fire') >= 2 && B.val > 0);
}
export function relics2Ignite(s, r, c, heat) {
  const o = cellAt(s, r, c);
  if (!o || heat <= 0 || !burnable(s, o) || (o.f || 0) >= heat) return false;
  o.f = heat; o.ft = p.fireTicks;
  return true;
}
// Burning goes on whether or not the Hot Pick is held: Fire Barrels light fires too.
function burn(s, dt, ev) {
  const st = s.relics2;
  st.fireT += dt;
  if (st.fireT < p.fireTick) return;
  st.fireT = 0;
  const lit = [];
  for (let i = 0; i < s.rows.length; i++) for (let c = 0; c < COLS; c++) { const o = s.rows[i][c]; if (o && o.f > 0) lit.push([s.top + i, c, o]); }
  if (!lit.length) return;
  const dmg = pickPower(s) * p.fireDmg, fuse = rel(s, 'fuse');
  for (const [r, c, o] of lit) {
    if (cellAt(s, r, c) !== o) continue;
    if (fuse) for (const [dr, dc] of NEAR) {          // the pair: fire sets off TNT
      const x = cellAt(s, r + dr, c + dc);
      if (x && kindOf(x).chain && !x.q) { x.q = true; later(s, 0.1, 'pop', { r: r + dr, c: c + dc, src: 'you', chain: 1 }); }
    }
    const heat = o.f;
    o.ft--;
    if (damage(s, r, c, dmg, 'fire', ev, { chain: 1, fire: 1 })) {
      for (const [dr, dc] of NEAR) relics2Ignite(s, r + dr, c + dc, heat - 1);   // it burned through: the fire moves on
      if (fuse >= 3 && BLOCKS.tnt && rnd() < p.fuseAsh) { turn(s, r, c, 'tnt'); emit(s, ev, 'relics2Gift', { r, c, t: 'tnt' }); }
    } else if (o.ft <= 0) { o.f = 0; o.ch = 1; delete o.ft; }      // burned out: charred, it will not burn again
    else if (rnd() < p.fireCreep) { const [dr, dc] = pick(NEAR); relics2Ignite(s, r + dr, c + dc, heat - 1); }
  }
}
function fireRing(s, q, ev) {
  let n = 0;
  for (let dr = -q.rad; dr <= q.rad; dr++) for (let dc = -q.rad; dc <= q.rad; dc++) if (relics2Ignite(s, q.r + dr, q.c + dc, q.heat)) n++;
  if (n) emit(s, ev, 'relics2Fire', { r: q.r, c: q.c, n });
}

// ---------- fall ----------

function land(s, r, c, o, ev) {
  const lv = rel(s, 'fall'), rows = o.fd;
  delete o.fd;
  emit(s, ev, 'relics2Thud', { r, c, fall: rows });
  if (lv >= 2 && kindOf(o).chain) { breakCell(s, r, c, 'you', ev, { chain: 1, fall: 1 }); return; }   // falling TNT goes off
  const dmg = o.max * p.fallFrac * (lv >= 2 ? Math.min(rows, p.fallMaxRows) : 1);
  const info = { chain: 1, fall: 1 };
  damage(s, r + 1, c, dmg, 'you', ev, info);
  if (lv >= 3) { damage(s, r + 1, c - 1, dmg * p.fallSide, 'you', ev, info); damage(s, r + 1, c + 1, dmg * p.fallSide, 'you', ev, info); }
  if (cellAt(s, r, c) === o) damage(s, r, c, dmg, 'you', ev, info);
}
function slide(s, dt, ev) {
  const st = s.relics2;
  st.fallT += dt;
  if (st.fallT < p.fallTick) return;
  st.fallT = 0;
  const last = s.rows.length - 1;
  for (let i = last; i >= 0; i--) for (let c = 0; c < COLS; c++) {
    const o = s.rows[i][c];
    if (!o || o.q || kindOf(o).wall) continue;
    if (i < last && s.rows[i + 1][c] === null) { s.rows[i + 1][c] = o; s.rows[i][c] = null; o.fd = (o.fd || 0) + 1; }
    else if (o.fd) land(s, s.top + i, c, o, ev);
  }
}

// ---------- melt ----------

function melt(s, dt, ev) {
  const st = s.relics2;
  st.meltT += dt;
  if (st.meltT < p.meltTick) return;
  st.meltT = 0;
  const lv = rel(s, 'melt'), rows = Math.min(VIEW_ROWS, s.rows.length), seen = new Set();
  for (let i = 0; i < rows; i++) for (let c = 0; c < COLS; c++) {
    const o = s.rows[i][c];
    if (!o || o.q || o.fd || !kindOf(o).ore || seen.has(i * COLS + c)) continue;
    const k = ORES.indexOf(o.t);
    if (k < 0) continue;
    const top = k === ORES.length - 1;
    const group = [[i, c]];
    seen.add(i * COLS + c);
    for (let g = 0; g < group.length; g++) for (const [dr, dc] of NEAR) {
      const a = group[g][0] + dr, b = group[g][1] + dc;
      if (a < 0 || a >= rows || b < 0 || b >= COLS || seen.has(a * COLS + b)) continue;
      const x = s.rows[a][b];
      if (x && x.t === o.t && !x.q) { seen.add(a * COLS + b); group.push([a, b]); }
    }
    const need = top ? p.meltNeed[1] : p.meltNeed[lv];
    const into = top ? (lv >= 2 && BLOCKS[p.meltTop] ? p.meltTop : null) : ORES[k + 1];
    if (group.length < need || !into) continue;
    const used = group.slice(0, need).map(([a, b]) => [s.top + a, b]);   // found outward from the first, so they touch
    const [r0, c0] = used[0];
    for (const [r, cc] of used.slice(1)) turn(s, r, cc, layerAt(s, r).fill || 'dirt');
    turn(s, r0, c0, into);
    emit(s, ev, 'relics2Melt', { r: r0, c: c0, t: into, from: used });
    return;                                                              // one at a time, so a run of them can be watched
  }
}

// ---------- the draft ----------

// relics and relic levels found so far, in every site: how far the player has got with relics
export function relics2Found(s) {
  let n = 0;
  for (const k in s.unlocked) if (k.startsWith('relic:')) n++;
  return n;
}
const held = (s, id) => rel(s, RELICS[id].pair) > 0;
const after = (id, n, also) => s => (!also || !!also(s)) && (held(s, id) || relics2Found(s) >= n);
const deep = (id, n) => s => held(s, id) || (!!s.unlocked.layer2 && relics2Found(s) >= n);

// With chance `pairChance` the chest shows the missing partner of a relic you hold (one of them, if several).
function pairDraft(pool, s) {
  const want = pool.filter(id => RELICS[id].pair && rel(s, id) === 0 && rel(s, RELICS[id].pair) > 0);
  if (!want.length || rnd() >= p.pairChance) return pool;
  const one = pick(want), rest = pool.filter(id => id !== one), out = [one];
  const n = fold('draftCards', s, PARAMS.chest.cards);
  while (out.length < n && rest.length) out.push(rest.splice(Math.floor(rnd() * rest.length), 1)[0]);
  return out;
}

const says = (id, vars) => lv => ({ d: t(`r_${id}_d${Math.max(1, Math.min(lv || 1, RELICS[id].max))}`, vars ? vars(lv) : undefined) });

export const relics2 = use({
  id: 'relics2',
  params: p,
  strings,
  state: {
    relics2: { init: () => ({
      n: 0,                      // blocks broken by hand since the last twin
      crew: 0, pass: false,      // Rafeeq hits since the last borrowed swing; the next one is borrowed too
      guest: false,              // a Rafeeq is swinging your pick right now
      grow: 0,                   // blocks broken since ore last grew
      beat: 0,
      dmg: 0, crit: false,       // the swing being made
      lr: 0, lc: 0, lt: null,    // where and when you last swung yourself
      busy: 0, dir: 1,           // the boomerang is in the air until this time; the side it last went
      fireT: 0, fallT: 0, meltT: 0,
      gift: {},                  // relic id -> levels it has given its present for
    }) },
  },
  queue: { relics2Hop: hopLand, relics2Land: flingLand, relics2Ring: fireRing,
    relics2Borrow(s, q, ev) {
      if (!rel(s, 'borrow') || !reachable(s, q.r, q.c)) return;
      const st = s.relics2, was = cellAt(s, q.r, q.c);
      emit(s, ev, 'relics2Borrow', { r: q.r, c: q.c });
      st.guest = true;
      const ok = swing(s, q.r, q.c, ev);
      st.guest = false;
      if (ok && rel(s, 'borrow') >= 3 && cellAt(s, q.r, q.c) !== was) st.pass = true;
    },
  },
  hooks: {
    // what the swing is, for the relics that act after it
    swing: { at: 900, fn(s, sw) {
      const st = s.relics2;
      st.dmg = sw.dmg; st.crit = sw.crit;
      if (!st.guest) { st.lr = sw.r; st.lc = sw.c; st.lt = s.t; }
    } },
    step: { at: 520, fn: burn },
  },
  mods: { draftPool: { at: 900, fn: pairDraft } },
  relics: {
    hop: { at: 200, max: 3, pair: 'twin', when: after('hop', p.openHop), vars: says('hop'), hooks: { broke(s, b) {
      if (!b.byHand || b.chain || b.B.wall) return;
      hopFrom(s, b.r, b.c, b.t, s.relics2.dmg * p.hopDmg, p.hopJumps[s.relics.hop], 1);
    } } },
    twin: { at: 210, max: 3, pair: 'hop', when: after('twin', p.openHop), vars: says('twin', () => ({ n: p.twinEvery })), hooks: { broke(s, b, ev) {
      if (!b.byHand || b.chain) return;
      const st = s.relics2, lv = s.relics.twin, ready = st.n >= p.twinEvery;
      st.n++;
      if (!ready || !twinable(b.B, lv)) return;                    // the pick glows and waits for something worth a twin
      const spots = softNear(s, b.r, b.c, b.t);
      if (!spots.length) return;
      for (let k = 0; k < p.twinCount[lv] && spots.length; k++) {
        const [r, c] = spots.splice(Math.floor(rnd() * spots.length), 1)[0];
        turn(s, r, c, b.t);
        emit(s, ev, 'relics2Twin', { fr: b.r, fc: b.c, r, c, t: b.t });
      }
      st.n = 0;
    } } },

    fling: { at: 220, max: 3, pair: 'magnet', when: after('fling', p.openFling), vars: says('fling'), hooks: { broke(s, b, ev) {
      if (b.info.fling || b.B.wall) return;
      const lv = s.relics.fling;
      if (lv < 3 && (!b.byHand || b.chain)) return;                // level 3: whatever breaks, flies
      fling(s, b.r, b.c, b.t, b.cell.max, p.flingBounce[lv], ev);
    } } },
    magnet: { at: 230, max: 3, pair: 'fling', when: after('magnet', p.openFling), vars: says('magnet', () => ({ n: p.magEvery })), hooks: { swung: { at: 50, fn(s, sw, ev) {
      if (s.hits % p.magEvery === 0) pull(s, sw.r, sw.c, ev);
    } } } },

    fire: { at: 240, max: 3, pair: 'fuse', when: after('fire', p.openFire), vars: says('fire'), hooks: { broke(s, b, ev) {
      if (!b.byHand || b.chain) return;
      const lv = s.relics.fire, heat = p.fireHeat[lv];
      let n = 0;
      if (lv >= 3 && s.relics2.crit) { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (relics2Ignite(s, b.r + dr, b.c + dc, heat + 1)) n++; }
      else for (const [dr, dc] of NEAR) if (relics2Ignite(s, b.r + dr, b.c + dc, heat)) n++;
      if (n) emit(s, ev, 'relics2Fire', { r: b.r, c: b.c, n });
    } } },
    fuse: { at: 250, max: 3, pair: 'fire', when: after('fuse', p.openFire, s => s.seen.tnt), vars: says('fuse'), hooks: {
      step: gifts('fuse', () => 'tnt'),
      broke(s, b) {
        if (b.B.chain) later(s, PARAMS.tnt.fuse + 0.03, 'relics2Ring', { r: b.r, c: b.c, rad: p.fuseRing + rel(s, 'bang'), heat: p.fuseHeat[s.relics.fuse] });
      },
    } },

    rang: { at: 260, max: 3, pair: 'fall', when: deep('rang', 0), vars: says('rang', () => ({ n: p.rangReach })),
      mods: { canSwing: (v, s) => { const st = s.relics2, left = st.busy - s.t; return v && (st.guest || !(left > 0 && left <= p.rangTime)); } },
      hooks: { swung: { at: 35, fn(s, sw, ev) {
        if (sw.B.wall) return;                                     // the Big Rock is hit the plain way, at full speed
        const st = s.relics2, lv = s.relics.rang, reach = lv >= 2 ? COLS : p.rangReach;
        const path = dir => { const out = []; for (let k = 1; k <= reach; k++) { const c = sw.c + dir * k, o = cellAt(s, sw.r, c); if (c < 0 || c >= COLS || (o && kindOf(o).wall)) break; out.push(c); } return out; };
        const blocks = cs => cs.filter(c => cellAt(s, sw.r, c)).length;
        const L = path(-1), R = path(1), nl = blocks(L), nr = blocks(R);
        if (!nl && !nr) return;                                    // nothing beside it: a plain hit
        const dir = nl === nr ? (st.dir = -st.dir) : nl > nr ? -1 : 1;
        const cs = dir < 0 ? L : R, n = cs.length, gap = p.rangTime / (2 * n + 1), dmg = sw.dmg * p.rangDmg;
        const under = cellAt(s, sw.r + 1, sw.c);
        const back = lv >= 3 && under !== undefined && !(under && kindOf(under).wall) ? sw.r + 1 : sw.r;
        cs.forEach((c, k) => {
          later(s, gap * (k + 1), 'dmg', { r: sw.r, c, dmg, src: 'you' });
          later(s, gap * (2 * n - k), 'dmg', { r: back, c, dmg, src: 'you' });
        });
        if (!st.guest) st.busy = s.t + p.rangTime;                 // the drawback: no swing while it is in the air
        emit(s, ev, 'relics2Rang', { r: sw.r, c: sw.c, dir, n, back, dur: p.rangTime });
      } } } },
    fall: { at: 270, max: 3, pair: 'rang', when: deep('fall', 0), vars: says('fall'), hooks: { step: { at: 530, fn: slide } } },

    borrow: { at: 280, max: 3, pair: 'fazaa', when: after('borrow', p.openCrew, s => s.up.crew > 0), vars: says('borrow', lv => ({ n: p.borrowEvery[lv] })),
      mods: { damage(v, s, cell, src, info, r) {
        if (src !== 'crew' || info.chain) return v;
        const st = s.relics2;
        st.crew++;
        if (st.pass || st.crew >= p.borrowEvery[s.relics.borrow]) {
          st.crew = 0; st.pass = false;
          later(s, p.borrowGap, 'relics2Borrow', { r, c: s.rows[r - s.top].indexOf(cell) });
        }
        return v;
      } } },
    fazaa: { at: 290, max: 3, pair: 'borrow', when: after('fazaa', p.openCrew, s => s.up.crew > 1), vars: says('fazaa'), hooks: {
      step: { at: 590, fn(s) {
        const st = s.relics2;
        if (st.lt === null || s.t < st.lt || s.t - st.lt > p.fazaaHold || !cellAt(s, st.lr, st.lc)) return;   // you stopped: they go back to their job
        const far = d => Math.abs(d.r - st.lr) + Math.abs(d.c - st.lc);
        const crew = s.diggers.slice().sort((a, b) => far(a) - far(b)).slice(0, p.fazaaN[s.relics.fazaa]);
        for (const d of crew) { d.tr = st.lr; d.tc = st.lc; }
      } },
      swung: { at: 60, fn(s, sw, ev) {
        const st = s.relics2;
        if (s.relics.fazaa < 3 || st.guest || ++st.beat % p.fazaaBeat) return;
        for (const d of s.diggers) if (Math.abs(d.r - sw.r) < 0.2 && Math.abs(d.c - sw.c) < 0.2 && cellAt(s, sw.r, sw.c)) {
          d.swing = 1;
          damage(s, sw.r, sw.c, crewPower(s), 'crew', ev, { chain: 1 });
        }
      } },
    } },

    garden: { at: 300, max: 3, pair: 'melt', when: deep('garden', p.openGarden), vars: says('garden', () => ({ n: p.growEvery })), hooks: {
      step: gifts('garden', () => ORES[0]),
      broke(s, b, ev) {
        const st = s.relics2, lv = s.relics.garden;
        if (++st.grow < p.growEvery) return;
        let done = 0;
        for (let k = 0; k < p.growN[lv]; k++) {
          const from = nearest(s, b.r, b.c, o => !!kindOf(o).ore, COLS + VIEW_ROWS, 0).filter(o => softNear(s, o.r, o.c).length);
          if (!from.length) break;
          const o = pick(from), [r, c] = pick(softNear(s, o.r, o.c));
          let kind = cellAt(s, o.r, o.c).t;
          const k2 = ORES.indexOf(kind);
          if (lv >= 3 && k2 >= 0 && k2 < ORES.length - 1 && rnd() < p.growBetter) kind = ORES[k2 + 1];
          turn(s, r, c, kind);
          emit(s, ev, 'relics2Grow', { fr: o.r, fc: o.c, r, c, t: kind });
          done++;
        }
        if (done) st.grow = 0;
      },
    } },
    melt: { at: 310, max: 3, pair: 'garden', when: deep('melt', p.openGarden), vars: says('melt'), hooks: { step: { at: 540, fn: melt } } },
  },
});
