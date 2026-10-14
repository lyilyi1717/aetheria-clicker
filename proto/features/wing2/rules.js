// Dig feature: THE Museum (the folder keeps its old name). Thirteen sets: the first three (Old Camel, Sand Whale,
// Lamp of the Djinn) were the old Museum, ten more came with the Wing. No set pays a coin bonus: every set opens
// a thing (a camel that brings chests, a pearl block, a wish, a lizard, a hall, a relic in the chests, hats, the
// dark, a jar of spare bones, or a new site). Pieces fall out of bones (the bone block lives in proto/features/museum,
// which hands each bone to wingFind), Dusty Bundles, ore, chests, oil and Big Rocks (see sets.js).
// Old saves: the old `fossils` and `sets` slices are copied into wingGot and wingDone once (museum's migrate).
// Events sent: wingPiece, wingSet, wingShow, wingCamel, wingWish, wingWishTaken, wingJar, wingSlide, wingMirror, wingSeed, wingPulse;
// and the old `set` event (once per finished old set) so the sims' first-set marks still work.
import { use, emit, BLOCKS } from '../../core/registry.js';
import { rnd, pickOne } from '../../core/rng.js';
import { COLS, cellAt, setCell, makeCell, reachable, dirtVal, layerOf, siteMult } from '../../core/grid.js';
import { addCoins, coinMult, damage, later, pickPower } from '../../core/rules.js';
import { WING, wingKeys, wingPiece, wingMatches } from './sets.js';
import strings from './strings.js';

export { WING, wingKeys, wingPiece, wingMatches } from './sets.js';

const p = {
  focus: 0.8,           // chance a find goes to the earliest unfinished set it fits (sets finish one by one)
  missing: 0.75,        // chance a find is a piece you lack (bad luck never blocks a set for long)
  dupPay: 25,           // a piece you already have sells for this many dirt blocks of its row
  lost: 0.1,            // a Dusty Bundle in a row (times the site's `lost`)
  lostFirst: 28,        // the row where the first bundle is placed for you
  lostHp: 2,
  ore: { copper: 0.02, silver: 0.035, gold: 0.07, gem: 0.12 },   // chance an ore block drops a wing piece
  chest: 0.3, gusher: 0.5,
  awayRow: 0.1,         // while you are away, the crew brings back a bundle or a bone from this share of rows
  jar: 8,               // spare bones that fill the Bone Jar into a free chest
  hatHit: 2,            // Rafeeqs with hats hit bones and bundles this many times as hard
  slide: 0.45,          // Shark Dunes: a soft block above a broken one falls into the hole
  mirror: 0.5,          // Mirage Dunes: your hit also lands on the other side, this strong
  seedChance: [0, 0.6, 1],                       // Lucky Dinar: an ore breaks and one next to it turns to ore
  seedKind: { silver: 'copper', gold: 'silver', gem: 'gold' },
  camelEvery: 150,      // Old Camel: the camel brings a free chest after this many blocks broken
  pearl: 0.03,          // Whale Pearl: a pearl in a row (once the Sand Whale is done), from pearlFrom
  pearlFrom: 26, pearlHp: 2, pearlVal: 8, pearlPop: 1,   // the pearl pays 8 blocks' worth and pops its 4 neighbours
  lizardRow: 4,         // Dhab Lizard: a bone block waits in this row of every new site
  showRow: 3,           // where a ceremony puts the thing it opened (rows below the top)
  wishBlocks: 40,       // Lamp wish: Strong Arm and Hot Tea last this many blocks you or the crew break
  wishCoins: 40,        // Lamp wish: a sack of this many dirt blocks of your deepest row
  wishStrong: 2, wishCrew: 3,     // Strong Arm: your hit x2; Hot Tea: Rafeeq hit x3
  wishRows: 2,          // Sand Wind: the top rows that break
  derrickEvery: [0, 7, 5], derrickDepth: [0, 3, 5], derrickMult: 1.5,   // Derrick: every Nth hand break drills down
};

export const wingDone = (s, set) => !!s.wingDone[set];
export const wingHave = (s, set, i) => (s.wingGot[wingPiece(set, i)] || 0) > 0;
export const wingCount = (s, set) => WING[set].pieces.filter((_, i) => wingHave(s, set, i)).length;
// the pieces of a set you lack, as indexes
export const wingMissing = (s, set) => WING[set].pieces.map((pc, i) => i).filter(i => !wingHave(s, set, i));
const TREASURE = { fossil: 1, lost: 1 };

// query helper: is there an uncollected fossil/bone at (r, c)?
export function isMissingFossil(s, r, c) {
  const cell = cellAt(s, r, c);
  if (!cell) return false;
  if (cell.t !== 'fossil' && cell.t !== 'lost') return false;
  if (cell.boneId) {
    let collected = false;
    if (s.museum && s.museum.collected) {
      if (typeof s.museum.collected.has === 'function') collected = s.museum.collected.has(cell.boneId);
      else if (Array.isArray(s.museum.collected)) collected = s.museum.collected.includes(cell.boneId);
    }
    if (s.wingGot && s.wingGot[cell.boneId]) collected = true;
    return !collected;
  }
  if (cell.piece) {
    const [set, idx] = cell.piece.split('.');
    return !wingHave(s, set, Number(idx));
  }
  const trig = { tags: [cell.t === 'fossil' ? 'bone' : 'lost'], layer: layerOf(r) };
  const cands = candidates(trig, r);
  if (!cands.length) return false;
  return cands.some(([set, i]) => !wingHave(s, set, i));
}

// uncollected bones 1-3 rows below viewport (for off-screen indicators)
export function hasMissingFossilBelow(s) {
  const VIEW_ROWS = 9;
  const COLS = 7;
  const out = [];
  for (let r = s.top + VIEW_ROWS; r <= s.top + VIEW_ROWS + 2; r++) {
    for (let c = 0; c < COLS; c++) {
      if (isMissingFossil(s, r, c)) out.push({ r, c, rowsBelow: r - (s.top + VIEW_ROWS) + 1 });
    }
  }
  return out;
}

// every piece (all sets) that answers to a trigger at row r
function candidates(trig, r) {
  if (typeof trig === 'string') trig = { tags: [trig], layer: layerOf(r) };
  if (!trig || !Array.isArray(trig.tags)) return [];
  const out = [];
  for (const set of wingKeys()) {
    const W = WING[set];
    if (!W || !Array.isArray(W.pieces)) continue;
    W.pieces.forEach((pc, i) => {
      if (!wingMatches(pc, trig)) return;
      if (!pc.how.startsWith('rock:') && r < W.from) return;
      out.push([set, i]);
    });
  }
  return out;
}

// spare bones go in the jar (once the Giant Scarab is done)
function spare(s, n, ev) {
  if (!s.wingDone.scarab || n <= 0) return;
  s.wingJar += n;
  while (s.wingJar >= p.jar) {
    s.wingJar -= p.jar; s.chests++;
    emit(s, ev, 'wingJar', { full: true, n: s.wingJar });
  }
  emit(s, ev, 'wingJar', { full: false, n: s.wingJar });
}

// find one piece. Returns true if something was found (new or spare).
export function wingFind(s, trig, ev, at = {}) {
  const r = at.r === undefined ? s.best : at.r;
  const cands = candidates(trig, r);
  if (!cands.length) return false;
  let lack = cands.filter(([set, i]) => !wingHave(s, set, i));
  if (lack.length && rnd() < p.focus) lack = lack.filter(([set]) => set === lack[0][0]);   // candidates run in set order
  const [set, i] = lack.length && rnd() < p.missing ? pickOne(lack) : pickOne(cands);
  const key = wingPiece(set, i);
  const isNew = !s.wingGot[key];
  s.wingGot[key] = (s.wingGot[key] || 0) + 1;
  let coins = 0;
  if (!isNew) {
    coins = Math.round(dirtVal(r) * p.dupPay * coinMult(s));
    addCoins(s, coins, at.src);
    spare(s, 1, ev);
  }
  const have = wingCount(s, set);
  emit(s, ev, 'wingPiece', { set, i, isNew, coins, have, of: WING[set].pieces.length, r: at.r, c: at.c, rare: !!WING[set].pieces[i].rare });
  if (isNew && have === WING[set].pieces.length && !s.wingDone[set]) {
    s.wingDone[set] = true;
    emit(s, ev, 'wingSet', { set, reward: WING[set].reward });
    if (WING[set].legacy) emit(s, ev, 'set', { set });
    openReward(s, set, ev);
  }
  return { set, i, isNew, coins };
}

// ---------- what a finished set opens, shown working at once ----------
// put one block in a loose cell a few rows below the top, so the ceremony can point at it
function putNear(s, kind) {
  const r = s.top + p.showRow, spots = [];
  for (let c = 0; c < COLS; c++) { const x = cellAt(s, r, c); if (x && BLOCKS[x.t].soft) spots.push(c); }
  if (!spots.length) return null;
  const c = pickOne(spots);
  setCell(s, r, c, makeCell(r, kind));
  return [r, c];
}
function openReward(s, set, ev) {
  const reward = WING[set].reward, d = { set, reward };
  if (reward === 'lizard') { const at = putNear(s, 'fossil'); if (at) [d.r, d.c] = at; }
  else if (reward === 'whalepearl') { const at = putNear(s, 'whalepearl'); if (at) [d.r, d.c] = at; }
  else if (reward === 'camel') s.wingLoad = Math.max(s.wingLoad, p.camelEvery - 1);   // the very next block you break fills its bags: the first chest comes at once
  else if (reward === 'wish') offerWish(s, ev);
  emit(s, ev, 'wingShow', d);
}

// ---------- Lamp of the Djinn: one wish for each site, at the first chest ----------
export const WISHES = ['coins', 'chest', 'strong', 'crew', 'wind'];
function offerWish(s, ev) {
  const w = s.wingWish;
  if (w.st || !done(s, 'djinn')) return;
  const pool = WISHES.slice(), opts = [];
  while (opts.length < 3) opts.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  w.st = 1; w.opts = opts;
  emit(s, ev, 'wingWish', { opts });
}
export function wingWishPick(s, kind, ev) {
  const w = s.wingWish;
  if (w.st !== 1 || !w.opts.includes(kind)) return false;
  w.st = 2; w.opts = [];
  if (kind === 'coins') addCoins(s, Math.round(dirtVal(Math.max(1, s.best)) * p.wishCoins * coinMult(s)), 'you');
  else if (kind === 'chest') s.chests++;
  else if (kind === 'strong' || kind === 'crew') s.wingBoon = { kind, left: p.wishBlocks };
  else if (kind === 'wind') for (let k = 0; k < p.wishRows; k++) for (let c = 0; c < COLS; c++) if (cellAt(s, s.top + k, c)) later(s, 0.04 * (k * COLS + c), 'pop', { r: s.top + k, c, src: 'you', chain: 1 });
  emit(s, ev, 'wingWishTaken', { kind });
  return true;
}
export function wingNoteSeen(s) { s.wingNote = false; }

// what the camel, the wish and the pearl do while you dig
function perks(s, b, ev) {
  if (done(s, 'camel') && ++s.wingLoad >= p.camelEvery) { s.wingLoad = 0; s.chests++; emit(s, ev, 'wingCamel', { first: false }); }
  const bo = s.wingBoon;
  if (bo.left > 0 && (bo.kind === 'strong' ? b.byHand : b.src === 'crew')) { bo.left--; if (!bo.left) emit(s, ev, 'wingBoonEnd', { kind: bo.kind }); }
  if (b.t === 'chest') offerWish(s, ev);
}

function onBroke(s, b, ev) {
  const t = b.t;
  const at = { r: b.r, c: b.c, src: b.src };
  const layer = layerOf(b.r);
  if (t === 'lost') {
    const tags = ['lost', 'site:' + s.site];
    if (b.chain > 0) tags.push('blast');
    if (!wingFind(s, { tags, layer }, ev, at)) addCoins(s, Math.round(dirtVal(b.r) * p.dupPay * coinMult(s)), b.src);
  } else if (b.B.ore && p.ore[t] && rnd() < p.ore[t]) wingFind(s, { tags: ['ore:' + t], layer }, ev, at);
  else if (t === 'chest' && rnd() < p.chest) wingFind(s, { tags: ['chest'], layer }, ev, at);
  else if (t === 'oil' && rnd() < p.gusher) wingFind(s, { tags: ['gusher'], layer }, ev, at);
}

// what the two sites do; the names are in strings.js
function slide(s, b, ev) {
  if (b.r - 1 < s.top) return;
  const above = cellAt(s, b.r - 1, b.c);
  if (!above || !BLOCKS[above.t].soft || cellAt(s, b.r, b.c) || rnd() >= p.slide) return;
  setCell(s, b.r, b.c, above); setCell(s, b.r - 1, b.c, null);
  emit(s, ev, 'wingSlide', { r: b.r, c: b.c });
}
function mirror(s, sw, ev) {
  if (sw.B.wall) return;
  const c = COLS - 1 - sw.c;
  if (c === sw.c) return;
  const o = cellAt(s, sw.r, c);
  if (!o || BLOCKS[o.t].wall || !reachable(s, sw.r, c)) return;
  damage(s, sw.r, c, sw.dmg * p.mirror, 'you', ev, { chain: 1 });
  emit(s, ev, 'wingMirror', { r: sw.r, c: sw.c, to: c });
}

const done = (s, k) => !!s.wingDone[k];

export const wing2 = use({
  id: 'wing2',
  params: p,
  tables: { WING },
  strings,
  state: {
    wingGot:     { init: () => ({}), survives: ['site', 'land'] },    // 'dhab.2': how many found
    wingDone:    { init: () => ({}), survives: ['site', 'land'] },    // finished sets
    wingJar:     { init: () => 0, survives: ['site', 'land'] },       // spare bones in the jar
    wingDupSeen: { init: () => 0, survives: ['site', 'land'] },       // spare Museum bones already counted
    wingDeep:    { init: () => 0, survives: ['site', 'land'] },       // the deepest row ever dug (the panel shows sets by it)
    wingLoad:    { init: () => 0, survives: ['site', 'land'] },       // Old Camel: blocks broken since the last chest it brought
    wingWish:    { init: () => ({ st: 0, opts: [] }) },               // Lamp wish for this site: st 0 not yet, 1 waiting to be picked, 2 used
    wingBoon:    { init: () => ({ kind: '', left: 0 }) },             // the wish that is working now
    wingNote:    { init: () => false, survives: ['site', 'land'] },   // an old save: say once that the +25% coins are gone
    wingN:       { init: () => 0 },                                   // hand breaks since the Derrick pulsed
    wingPend:    { init: () => [], transient: true },                 // Big Rocks broken this step
  },
  blocks: {
    // a sack from long ago; it holds a lost thing
    lost: { at: 105, hp: p.lostHp, val: 0, notice: true },
    // Sand Whale prize: a pearl that pays well and pops the four blocks around it
    whalepearl: { at: 106, hp: p.pearlHp, val: p.pearlVal, notice: true, broke(s, b, ev) {
      for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const x = cellAt(s, b.r + dr, b.c + dc);
        if (x && !BLOCKS[x.t].wall) later(s, 0.07 * p.pearlPop, 'pop', { r: b.r + dr, c: b.c + dc, src: b.src, chain: 1 });
      }
      emit(s, ev, 'wingBubble', { r: b.r, c: b.c });
    } },
  },
  gen: { row: [{ at: 45, fn(c) {
    const s = c.s;
    if (c.r === p.lostFirst && !s.seen.lost) { c.put('lost'); s.seen.lost = true; }
    else if (c.r > p.lostFirst && rnd() < p.lost * siteMult(c.site, 'lost')) c.put('lost');
    if (done(s, 'whale') && c.r >= p.pearlFrom && rnd() < p.pearl) c.put('whalepearl');
    if (done(s, 'dhab') && c.r === p.lizardRow) c.put('fossil');
  } }] },
  hooks: {
    broke: { at: 400, fn(s, b, ev) { onBroke(s, b, ev); perks(s, b, ev); } },
    awayRow(s, r, out) { if (rnd() < p.awayRow) (out.wing || (out.wing = [])).push(r); },
    awayEnd: { at: 30, fn(s, out, ev) {
      const coins = s.coins;
      for (const r of out.wing || []) wingFind(s, { tags: ['lost', 'bone'], layer: layerOf(r) }, ev, { r });
      out.coins += s.coins - coins;     // spare pieces sold on the way home are part of what the crew earned
    } },
    bossDown(s, r) { s.wingPend.push({ layer: layerOf(r), r }); },
    step: { at: 650, fn(s, dt, ev) {
      if (s.best > s.wingDeep) s.wingDeep = s.best;
      if (!s.wingPend.length) return;
      const list = s.wingPend; s.wingPend = [];
      for (const q of list) wingFind(s, { tags: ['rock'], layer: q.layer }, ev, { r: q.r });
    } },
    // goggles: bones and bundles show through the dark
    mask(s, m) {
      if (!done(s, 'pilot')) return;
      for (let i = 0; i < s.rows.length; i++) for (let c = 0; c < COLS; c++) {
        const x = s.rows[i][c];
        if (x && TREASURE[x.t]) m[i][c] = true;
      }
    },
  },
  mods: {
    pickPower: (v, s) => (s.wingBoon.left > 0 && s.wingBoon.kind === 'strong' ? v * p.wishStrong : v),
    crewPower: (v, s) => (s.wingBoon.left > 0 && s.wingBoon.kind === 'crew' ? v * p.wishCrew : v),
    // hats: Rafeeqs clear bones and bundles faster
    damage: (v, s, cell, src) => (src === 'crew' && done(s, 'teapot') && TREASURE[cell.t] ? v * p.hatHit : v),
  },
  // the sites the sets open. Each bends how you dig, not only what you find.
  sites: {
    sharks: { at: 50, hp: 1.3, ore: 1, tnt: 1, bone: 2.5, chest: 1, lost: 2,
      open: s => done(s, 'shark'), hooks: { broke: slide } },
    mirage: { at: 60, hp: 1.4, ore: 1.3, tnt: 1, bone: 1.5, chest: 1, lost: 2,
      open: s => done(s, 'flycamel'), hooks: { swung: mirror } },
  },
  // the relics three sets put in the chests
  relics: {
    dinar: { at: 140, max: 2, when: s => done(s, 'coins'), hooks: { broke(s, b, ev) {
      if (!b.byHand || !b.B.ore || b.cell.seeded) return;
      const kind = p.seedKind[b.t];
      if (!kind || rnd() >= p.seedChance[s.relics.dinar]) return;
      const near = [[0, 1], [1, 0], [0, -1], [-1, 0]].map(([dr, dc]) => [b.r + dr, b.c + dc]).filter(([r, c]) => { const x = cellAt(s, r, c); return x && BLOCKS[x.t].soft; });
      if (!near.length) return;
      const [r, c] = pickOne(near);
      const cell = makeCell(r, kind); cell.seeded = true;
      setCell(s, r, c, cell);
      emit(s, ev, 'wingSeed', { r, c, t: kind });
    } } },
    pearl: { at: 150, max: 1, when: s => done(s, 'pearls'), mods: { draftCards: v => v + 1 } },
    derrick: { at: 160, max: 2, when: s => done(s, 'oilrig'), hooks: { broke(s, b, ev) {
      if (!b.byHand || b.chain) return;
      const lv = s.relics.derrick;
      if (++s.wingN % p.derrickEvery[lv]) return;
      const dmg = pickPower(s) * p.derrickMult;
      for (let k = 1; k <= p.derrickDepth[lv]; k++) if (cellAt(s, b.r + k, b.c)) later(s, 0.07 * k, 'dmg', { r: b.r + k, c: b.c, dmg, src: 'you' });
      emit(s, ev, 'wingPulse', { r: b.r, c: b.c, n: p.derrickDepth[lv] });
    } } },
  },
  unlocks: () => {
    const out = [];
    for (const [k, W] of Object.entries(WING)) {
      if (W.legacy) continue;     // the museum feature lists the old three (bone:camel.0, set:camel)
      W.pieces.forEach((_, i) => out.push({ id: 'wing:' + wingPiece(k, i), cat: 'grind', group: 'Wing pieces' }));
      out.push({ id: 'wingset:' + k, cat: 'core', group: 'Wing sets' });
    }
    return out;
  },
  firsts: {
    wingPiece: d => (!d.isNew ? null : WING[d.set].legacy ? `bone:${d.set}.${d.i}` : 'wing:' + wingPiece(d.set, d.i)),
    wingSet: d => (WING[d.set].legacy ? null : 'wingset:' + d.set),
  },
});
