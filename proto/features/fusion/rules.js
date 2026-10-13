// Dig feature (rules): relic fusion. Two relics that go together light a Fuse button; fusing
// melts them into ONE new relic with a twist neither had.
//
// How it is built (composition, not copies):
//  - The two halves stay held at level 3 in `s.relics`, so every real hook and mod they own keeps
//    running through the registry. Nothing of theirs is re-implemented here.
//  - The fused relic (`fz_<recipe>`, one level) adds only the twist, reacting to what the halves do,
//    written with the halves' own exports (`relics2Ignite`, `boomEvery`) and core queue kinds
//    (`pop`, `dmg`, `blast`). Its hooks do nothing unless both halves are still held.
//  - The halves are "melted" (slice `fusion.melted`): the page folds them into the new card, they are
//    set to their top level so they leave the draft for this site, and a half can be melted only once.
//    They still count as held for pair marks (the draft shows a missing partner as before).
//  - Fused relics are never offered in a chest (`when` is false; the `draftPool` mod also drops them).
//
// Recipes (17): all six relics2 pairs plus eleven across the old relics, relics2 and wing2.
//   The very first fuse needs only level 1 + 1 (`firstNeed`), so a new player fuses in the first minutes. After that a
//   new recipe needs 2 + 2 (`fullNeed`) and a recipe fused once needs 1 + 1 (`masterNeed`). Fusing lifts both halves to
//   their top level, so the first fuse is a real jump in power.
// The guide (`draftPool` mod, only until the first fuse): the first chest offers relics that have a partner, and once you
//   hold one, a later chest offers its partner among the cards. You still choose; the match is just on the table.
// The Recipe Book (`fusionBook`, survives New Site and the second reset):
//   seen    both halves have been held at once (shows the two halves, the result still "?")
//   stamped it has been fused once
// Hints from a Museum set or a contract prize are not built: they would need a hook into those folders.
// Events: fusionSeen { id }, fusionDone { id, a, b }, and for the page: fusionCopy, fusionRipe,
// fusionDrop, fusionBurst, fusionBring.
import { use, BLOCKS, RELICS, emit, fold } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { COLS, VIEW_ROWS, cellAt, setCell, makeCell, siteOf, siteMult } from '../../core/grid.js';
import { later, rel } from '../../core/rules.js';
import { hitOf } from '../tnt/rules.js';
import { relics2Ignite } from '../relics2/rules.js';
import { boomEvery } from '../relics/rules.js';
import { ORES } from '../ores/rules.js';
import strings from './strings.js';

const p = {
  firstNeed: 1, fullNeed: 2, masterNeed: 1,
  bloomEvery: 8,
  quakeReach: 4, quakeDmg: 0.7, quakeDelay: 0.3,
  buddyDmg: 0.5,
  popRange: 6,
  dropUp: 3,
  flameHeat: 2, flameReach: 4, torchHeat: 2,
  barrels: 2,
  drillDepth: [2, 4], drillMult: 3,
  bombHits: 4,   // a bomb of the fusions, to each block around it, in your hits
  sweepDmg: 0.5,
  bringDepth: 5,
  pity: 2,                 // chests opened before an offered partner is forced onto the card
  guide: ['hop', 'twin'],   // offered from the first chest until the first fuse
};

// the recipes: the result is the relic fz_<id>, named r_fz_<id>
export const FUSIONS = [
  { id: 'mirror', a: 'hop', b: 'twin' },
  { id: 'rockpop', a: 'fling', b: 'magnet' },
  { id: 'fireshower', a: 'fire', b: 'fuse' },
  { id: 'quake', a: 'rang', b: 'fall' },
  { id: 'buddy', a: 'borrow', b: 'fazaa' },
  { id: 'bloom', a: 'garden', b: 'melt' },
  { id: 'flameang', a: 'fire', b: 'rang' },
  { id: 'barreldrop', a: 'fall', b: 'fuse' },
  { id: 'barrelboom', a: 'boom', b: 'bang' },
  { id: 'treasuredrill', a: 'deep', b: 'magnet' },
  { id: 'torch', a: 'wide', b: 'fire' },
  { id: 'echoseed', a: 'echo', b: 'twin' },
  { id: 'goldendinar', a: 'dinar', b: 'melt' },
  { id: 'bombhop', a: 'hop', b: 'boom' },
  { id: 'rockbomb', a: 'fling', b: 'boom' },
  { id: 'drillboom', a: 'derrick', b: 'boom' },
  { id: 'raffsweep', a: 'borrow', b: 'rang' },
];
const BY = Object.fromEntries(FUSIONS.map(f => [f.id, f]));
export const fusionRelic = id => 'fz_' + id;
const NEAR = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const inView = (s, r) => r >= s.top && r - s.top < VIEW_ROWS;
const pickOne = a => a[Math.floor(rnd() * a.length)];
const turn = (s, r, c, kind) => setCell(s, r, c, makeCell(r, kind, siteMult(siteOf(s), 'hp')));
const softNear = (s, r, c) => NEAR.map(([dr, dc]) => [r + dr, c + dc]).filter(([a, b]) => {
  const o = cellAt(s, a, b);
  return o && BLOCKS[o.t].soft && !o.q && inView(s, a);
});
const nextOre = kind => { const k = ORES.indexOf(kind); return k >= 0 && k < ORES.length - 1 ? ORES[k + 1] : null; };

// ---------- the rules of fusing ----------

export const fusionHeld = (s, id) => !!s.relics[fusionRelic(id)];
const live = (s, id) => { const f = BY[id]; return !!(s.relics[fusionRelic(id)] && rel(s, f.a) && rel(s, f.b)); };
export const fusionFused = s => Object.keys(s.fusionBook.stamped).length;     // recipes fused so far, ever
export const fusionNeed = (s, id) => (s.fusionBook.stamped[id] ? p.masterNeed : fusionFused(s) ? p.fullNeed : p.firstNeed);
// a half that tops out below that (Bigger Bang, the Dinar, the Derrick: two levels) is ready at its top level
export const fusionHalfNeed = (s, id, half) => Math.min(fusionNeed(s, id), (RELICS[half] && RELICS[half].max) || Infinity);
export function fusionCan(s, id) {
  const f = BY[id];
  return !!f && !fusionHeld(s, id) && !s.fusion.melted[f.a] && !s.fusion.melted[f.b]
    && rel(s, f.a) >= fusionHalfNeed(s, id, f.a) && rel(s, f.b) >= fusionHalfNeed(s, id, f.b);
}
export const fusionReady = s => FUSIONS.filter(f => fusionCan(s, f.id)).map(f => f.id);
export function fusionDo(s, id, ev = () => {}) {
  if (!fusionCan(s, id)) return false;
  const f = BY[id];
  for (const h of [f.a, f.b]) { s.relics[h] = RELICS[h].max; s.fusion.melted[h] = id; }
  s.relics[fusionRelic(id)] = 1;
  s.fusionBook.seen[id] = 1; s.fusionBook.stamped[id] = 1;
  emit(s, ev, 'fusionDone', { id, a: f.a, b: f.b });
  emit(s, ev, 'relic', { id: fusionRelic(id), level: 1 });
  return true;
}
// for the book: 0 unknown, 1 seen (both halves met), 2 stamped (fused once)
export const fusionState = (s, id) => (s.fusionBook.stamped[id] ? 2 : s.fusionBook.seen[id] ? 1 : 0);

// ---------- the guide: put a match on the table until the first fuse ----------
// Returns the pool the draft draws from (relic ids). Pure; the draw itself stays random. `p.guide` is a pair that is
// offered from the first chest (the pacing gate of the relics2 pairs would hold them back for a while), so a new player
// meets a pair at once. The recipe of the pair is the first one to make.
export function fusionGuide(s, pool, cards) {
  if (fusionFused(s) || cards < 2) return pool;
  // a partner the pacing gate holds back is always let in; one that is already on offer is put on the card after `pity` chests
  const open = id => RELICS[id] && !s.fusion.melted[id] && rel(s, id) < RELICS[id].max && (pool.includes(id) || p.guide.includes(id));
  const held = id => rel(s, id) > 0;
  const gated = id => !!RELICS[id].when && !RELICS[id].when(s);
  const sure = id => gated(id) || s.chestsOpened >= p.pity;
  // a half you hold whose partner can be offered: that partner goes on the table, with other cards
  const partners = [];
  for (const f of FUSIONS) {
    if (held(f.a) && !held(f.b) && open(f.b) && sure(f.b)) partners.push(f.b);
    if (held(f.b) && !held(f.a) && open(f.a) && sure(f.a)) partners.push(f.a);
  }
  const fill = (out, from) => {
    const take = list => { while (out.length < cards && list.length) out.push(list.splice(Math.floor(rnd() * list.length), 1)[0]); };
    take(from.filter(id => !out.includes(id) && !partners.includes(id)));
    take(from.filter(id => !out.includes(id)));      // too few other cards: another partner will do
    return out;
  };
  if (partners.length) return fill([pickOne(partners)], pool);
  // a half is held but its partner cannot be offered yet: leave the draft alone
  if (FUSIONS.some(f => held(f.a) || held(f.b))) return pool;
  // nothing held: the guide pair, and the other cards as they come
  return fill(p.guide.filter(open), pool);
}

// ---------- the twists ----------

// a twist runs only while the relic is held and both halves still are
const live3 = (id, fn) => (s, a, b, c) => (live(s, id) ? fn(s, a, b, c) : undefined);
const justThrew = s => s.relics2.busy - s.t > 0.2;       // the boomerang left the hand in this swing

const TWIST = {
  // each jump of the hit leaves a twin of the ore or TNT behind
  mirror: { broke: live3('mirror', (s, b, ev) => {
    if (!b.info.hop || !(b.B.ore || b.B.chain)) return;
    const spots = softNear(s, b.r, b.c);
    if (!spots.length) return;
    const [r, c] = pickOne(spots);
    turn(s, r, c, b.t);
    emit(s, ev, 'fusionCopy', { fr: b.r, fc: b.c, r, c, t: b.t });
  }) },
  // a rock that smashes ore sets the nearest other ore off
  rockpop: { broke: live3('rockpop', (s, b, ev) => {
    if (!b.info.fling || !b.B.ore) return;
    let best = null, bd = 1e9;
    for (let i = 0; i < Math.min(VIEW_ROWS, s.rows.length); i++) for (let c = 0; c < COLS; c++) {
      const o = s.rows[i][c];
      if (!o || o.q || !BLOCKS[o.t].ore) continue;
      const d = Math.abs(s.top + i - b.r) + Math.abs(c - b.c);
      if (d > 0 && d <= p.popRange && d < bd) { bd = d; best = [s.top + i, c, o]; }
    }
    if (!best) return;
    best[2].q = true;
    later(s, 0.15, 'pop', { r: best[0], c: best[1], src: 'you', chain: 1 });
    emit(s, ev, 'fusionBurst', { fr: b.r, fc: b.c, r: best[0], c: best[1] });
  }) },
  // fire never chars: a block can burn again and again
  fireshower: { step: live3('fireshower', s => {
    for (let i = 0; i < Math.min(VIEW_ROWS, s.rows.length); i++) for (let c = 0; c < COLS; c++) { const o = s.rows[i][c]; if (o && o.ch) delete o.ch; }
  }) },
  // the thrown row cracks the row under it, so what hangs above falls
  quake: { swung: { at: 36, fn: live3('quake', (s, sw, ev) => {
    if (!justThrew(s) || sw.B.wall) return;
    for (let k = -p.quakeReach; k <= p.quakeReach; k++) {
      const c = sw.c + k, under = cellAt(s, sw.r + 1, c);
      if (c < 0 || c >= COLS || !under || BLOCKS[under.t].wall) continue;
      later(s, p.quakeDelay, 'dmg', { r: sw.r + 1, c, dmg: sw.dmg * p.quakeDmg, src: 'you' });
    }
    emit(s, ev, 'fusionBurst', { fr: sw.r, fc: sw.c, r: sw.r + 1, c: sw.c, row: 1 });
  }) } },
  // each Rafeeq hits its own block with your swing too
  buddy: { swung: { at: 70, fn: live3('buddy', (s, sw) => {
    for (const d of s.diggers) if (d.tr >= 0 && cellAt(s, d.tr, d.tc) && !(d.tr === sw.r && d.tc === sw.c)) later(s, 0.05, 'dmg', { r: d.tr, c: d.tc, dmg: sw.dmg * p.buddyDmg, src: 'crew' });
  }) } },
  // ore ripens one grade by itself
  bloom: { broke: live3('bloom', (s, b, ev) => {
    if (!b.byHand || b.chain) return;
    const st = s.fusion;
    if (++st.n < p.bloomEvery) return;
    const ripe = [];
    for (let i = 0; i < Math.min(VIEW_ROWS, s.rows.length); i++) for (let c = 0; c < COLS; c++) { const o = s.rows[i][c]; if (o && !o.q && nextOre(o.t)) ripe.push([s.top + i, c, o]); }
    if (!ripe.length) return;
    const [r, c, o] = pickOne(ripe), kind = nextOre(o.t);
    turn(s, r, c, kind);
    st.n = 0;
    emit(s, ev, 'fusionRipe', { r, c, t: kind });
  }) },
  // the thrown row catches fire
  flameang: { swung: { at: 37, fn: live3('flameang', (s, sw, ev) => {
    if (!justThrew(s) || sw.B.wall) return;
    let n = 0;
    for (let k = -p.flameReach; k <= p.flameReach; k++) if (k && relics2Ignite(s, sw.r, sw.c + k, p.flameHeat)) n++;
    if (n) emit(s, ev, 'relics2Fire', { r: sw.r, c: sw.c, n });
  }) } },
  // breaking TNT puts a barrel above the hole, and it falls in and goes off
  barreldrop: { broke: live3('barreldrop', (s, b, ev) => {
    if (!b.byHand || b.chain || !b.B.chain || b.info.fall) return;
    for (let k = 1; k <= p.dropUp; k++) {
      const o = cellAt(s, b.r - k, b.c);
      if (!o || !inView(s, b.r - k) || !BLOCKS[o.t].soft || o.q) continue;
      turn(s, b.r - k, b.c, 'tnt');
      emit(s, ev, 'fusionDrop', { r: b.r - k, c: b.c });
      return;
    }
  }) },
  // a boom plants barrels beside the hit, and the blast sets them off
  barrelboom: { swung: { at: 41, fn: live3('barrelboom', (s, sw, ev) => {
    const every = boomEvery(s);
    if (!every || s.hits % every || sw.B.wall || !BLOCKS.tnt) return;
    const spots = softNear(s, sw.r, sw.c);
    for (let k = 0; k < p.barrels && spots.length; k++) {
      const [r, c] = spots.splice(Math.floor(rnd() * spots.length), 1)[0];
      turn(s, r, c, 'tnt');
      emit(s, ev, 'fusionDrop', { r, c, plant: 1 });
    }
  }) } },
  // the hit fetches ore up from below, then goes through it
  treasuredrill: { swung: { at: 19, fn: live3('treasuredrill', (s, sw, ev) => {
    if (sw.B.wall) return;
    const here = cellAt(s, sw.r + 1, sw.c);
    if (!here || !BLOCKS[here.t].soft || here.q) return;
    for (let k = 2; k <= p.bringDepth; k++) {
      const o = cellAt(s, sw.r + k, sw.c);
      if (o && BLOCKS[o.t].wall) return;
      if (!o || o.q || !BLOCKS[o.t].ore) continue;
      setCell(s, sw.r + 1, sw.c, o); setCell(s, sw.r + k, sw.c, here);
      emit(s, ev, 'fusionBring', { fr: sw.r + k, r: sw.r + 1, c: sw.c, t: o.t });
      return;
    }
  }) } },
  // the swing lights the blocks beside and under it
  torch: { swung: { at: 46, fn: live3('torch', (s, sw, ev) => {
    let n = 0;
    for (const [dr, dc] of [[0, -1], [0, 1], [1, 0]]) if (relics2Ignite(s, sw.r + dr, sw.c + dc, p.torchHeat)) n++;
    if (n) emit(s, ev, 'relics2Fire', { r: sw.r, c: sw.c, n });
  }) } },
  // the second strike on ore plants more ore
  echoseed: { swung: { at: 12, fn: live3('echoseed', (s, sw, ev) => {
    if (!sw.twice || !sw.B.ore) return;
    const spots = softNear(s, sw.r, sw.c);
    if (!spots.length) return;
    const [r, c] = pickOne(spots);
    turn(s, r, c, sw.B.id);
    emit(s, ev, 'fusionCopy', { fr: sw.r, fc: sw.c, r, c, t: sw.B.id });
  }) } },
  // ore the Dinar seeded comes up a grade better
  goldendinar: { broke: { at: 1100, fn: live3('goldendinar', (s, b, ev) => {
    if (!b.byHand) return;
    for (const [dr, dc] of NEAR) {
      const o = cellAt(s, b.r + dr, b.c + dc), kind = o && o.seeded && nextOre(o.t);
      if (!kind) continue;
      turn(s, b.r + dr, b.c + dc, kind);
      cellAt(s, b.r + dr, b.c + dc).seeded = true;
      emit(s, ev, 'fusionRipe', { r: b.r + dr, c: b.c + dc, t: kind });
    }
  }) } },
  // every jump ends in a small blast
  bombhop: { broke: live3('bombhop', (s, b) => {
    if (!b.info.hop) return;
    later(s, 0.05, 'blast', { r: b.r, c: b.c, rad: 1, dmg: hitOf(s, 'you') * p.bombHits, src: 'you' });
  }) },
  // a flying rock goes off where it lands
  rockbomb: { broke: live3('rockbomb', (s, b) => {
    if (!b.info.fling) return;
    later(s, 0.05, 'blast', { r: b.r, c: b.c, rad: 1, dmg: hitOf(s, 'you') * p.bombHits, src: 'you' });
  }) },
  // the boom goes down the column as well
  drillboom: { swung: { at: 42, fn: live3('drillboom', (s, sw) => {
    const every = boomEvery(s);
    if (!every || s.hits % every || sw.B.wall) return;
    p.drillDepth.forEach((k, i) => later(s, 0.12 + 0.1 * i, 'blast', { r: sw.r + k, c: sw.c, rad: 1, dmg: sw.dmg * p.drillMult, src: 'you', centre: true }));
  }) } },
  // every Rafeeq also hits the blocks beside its own
  raffsweep: { swung: { at: 71, fn: live3('raffsweep', (s, sw) => {
    for (const d of s.diggers) {
      if (d.tr < 0 || !cellAt(s, d.tr, d.tc)) continue;
      for (const dc of [-1, 1]) later(s, 0.1, 'dmg', { r: d.tr, c: d.tc + dc, dmg: sw.dmg * p.sweepDmg, src: 'crew' });
    }
  }) } },
};

const relics = {};
FUSIONS.forEach((f, i) => {
  relics[fusionRelic(f.id)] = { at: 400 + i, max: 1, when: () => false, hooks: TWIST[f.id] };
});

export const fusion = use({
  id: 'fusion',
  params: p,
  strings,
  state: {
    fusion: { init: () => ({ melted: {}, n: 0 }) },           // this site: halves that were melted, a counter
    fusionBook: { init: () => ({ seen: {}, stamped: {} }), survives: ['site', 'land'] },
  },
  relics,
  hooks: {
    // the book notices two halves held together
    step: { at: 950, fn(s, dt, ev) {
      for (const f of FUSIONS) if (!s.fusionBook.seen[f.id] && rel(s, f.a) && rel(s, f.b)) {
        s.fusionBook.seen[f.id] = 1;
        emit(s, ev, 'fusionSeen', { id: f.id, a: f.a, b: f.b });
      }
    } },
  },
  mods: {
    // a fused relic is never offered; melted halves have left the pool for this site
    // (until the first fuse a match is put on the table, see fusionGuide)
    draftPool: { at: 950, fn: (pool, s) => fusionGuide(s, pool.filter(id => !(id.startsWith('fz_') || s.fusion.melted[id])), fold('draftCards', s, 3)) },
  },
  unlocks: () => FUSIONS.map(f => ({ id: 'fusion:' + f.id, cat: 'core', group: 'Fusions' })),
  firsts: { fusionDone: d => 'fusion:' + d.id },
  bot: { shop(s, api) {
    const ready = fusionReady(s);
    return ready.length && fusionDo(s, ready[0], api && api.ev) ? 1 : 0;
  } },
});
