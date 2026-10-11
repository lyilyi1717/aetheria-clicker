// Dig feature: Museum wing 2. Ten more sets (skeletons, old coins, lost things). A finished set does not
// pay a coin bonus: it opens a hall, a relic in the chests, hats, the dark, a jar of spare bones, or a new site.
// The Museum's own sets are untouched (proto/features/museum). This wing keeps its own state and its own
// block, the Dusty Bundle; pieces also fall out of bones, ore, chests, oil and Big Rocks (see sets.js).
// Why not the Museum's addSets: its bone block picks any open set and its panel prints the coin bonus for it.
// Events sent: wingPiece, wingSet, wingJar, wingSlide, wingMirror, wingSeed, wingPulse.
import { use, emit, BLOCKS } from '../../core/registry.js';
import { rnd, pickOne } from '../../core/rng.js';
import { COLS, cellAt, setCell, makeCell, reachable, dirtVal, dirtHp, layerOf, siteMult } from '../../core/grid.js';
import { addCoins, coinMult, damage, later, pickPower } from '../../core/rules.js';
import { WING, wingKeys, wingPiece, wingMatches } from './sets.js';
import strings from './strings.js';

export { WING } from './sets.js';

const p = {
  focus: 0.8,           // chance a find goes to the earliest unfinished set it fits (sets finish one by one)
  missing: 0.75,        // chance a find is a piece you lack (the Museum's rule: bad luck never blocks a set for long)
  dupPay: 25,           // a piece you already have sells for this many dirt blocks of its row
  lost: 0.1,            // a Dusty Bundle in a row (times the site's `lost`)
  lostFirst: 28,        // the row where the first bundle is placed for you
  lostHp: 2,
  boneShare: 0.7,       // a bone block also holds a wing bone this often
  ore: { copper: 0.02, silver: 0.035, gold: 0.07, gem: 0.12 },   // chance an ore block drops a wing piece
  chest: 0.3, gusher: 0.5,
  awayRow: 0.1,         // while you are away, the crew brings back a bundle or a bone from this share of rows
  jar: 8,               // spare bones that fill the Bone Jar into a free chest
  hatHit: 2,            // Rafeeqs with hats hit bones and bundles this many times as hard
  slide: 0.45,          // Shark Dunes: a soft block above a broken one falls into the hole
  mirror: 0.5,          // Mirage Dunes: your hit also lands on the other side, this strong
  seedChance: [0, 0.6, 1],                       // Lucky Dinar: an ore breaks and one next to it turns to ore
  seedKind: { silver: 'copper', gold: 'silver', gem: 'gold' },
  derrickEvery: [0, 7, 5], derrickDepth: [0, 3, 5], derrickMult: 1.5,   // Derrick: every Nth hand break drills down
};

export const wingDone = (s, set) => !!s.wingDone[set];
export const wingHave = (s, set, i) => (s.wingGot[wingPiece(set, i)] || 0) > 0;
export const wingCount = (s, set) => WING[set].pieces.filter((_, i) => wingHave(s, set, i)).length;
// the pieces of a set you lack, as indexes
export const wingMissing = (s, set) => WING[set].pieces.map((pc, i) => i).filter(i => !wingHave(s, set, i));
const TREASURE = { fossil: 1, lost: 1 };

// every piece (all sets) that answers to a trigger at row r
function candidates(trig, r) {
  const out = [];
  for (const set of wingKeys()) {
    const W = WING[set];
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
  }
  return true;
}

function dupBones(s) {
  let sum = 0, n = 0;
  for (const v of Object.values(s.fossils)) { sum += v; n++; }
  return sum - n;
}

function onBroke(s, b, ev) {
  const t = b.t;
  const at = { r: b.r, c: b.c, src: b.src };
  const layer = layerOf(b.r);
  if (t === 'fossil') {
    const dups = dupBones(s), d = dups - s.wingDupSeen;
    s.wingDupSeen = dups;
    if (d > 0) spare(s, d, ev);
    if (rnd() < p.boneShare) wingFind(s, { tags: ['bone'], layer }, ev, at);
  } else if (t === 'lost') {
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
    wingN:       { init: () => 0 },                                   // hand breaks since the Derrick pulsed
    wingPend:    { init: () => [], transient: true },                 // Big Rocks broken this step
  },
  blocks: {
    // a sack from long ago; it holds a lost thing
    lost: { at: 105, hp: p.lostHp, val: 0, notice: true },
  },
  gen: { row: [{ at: 45, fn(c) {
    const s = c.s;
    if (c.r === p.lostFirst && !s.seen.lost) { c.put('lost'); s.seen.lost = true; }
    else if (c.r > p.lostFirst && rnd() < p.lost * siteMult(c.site, 'lost')) c.put('lost');
  } }] },
  hooks: {
    broke: { at: 400, fn: onBroke },
    awayRow(s, r, out) { if (rnd() < p.awayRow) (out.wing || (out.wing = [])).push(r); },
    awayEnd: { at: 30, fn(s, out, ev) { for (const r of out.wing || []) wingFind(s, { tags: ['lost', 'bone'], layer: layerOf(r) }, ev, { r }); } },
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
      for (let k = 1; k <= p.derrickDepth[lv]; k++) if (cellAt(s, b.r + k, b.c)) later(s, 0.07 * k, 'dmg', { r: b.r + k, c: b.c, dmg: Math.max(dmg, dirtHp(b.r + k) * 0.2), src: 'you' });
      emit(s, ev, 'wingPulse', { r: b.r, c: b.c, n: p.derrickDepth[lv] });
    } } },
  },
  unlocks: () => {
    const out = [];
    for (const [k, W] of Object.entries(WING)) {
      W.pieces.forEach((_, i) => out.push({ id: 'wing:' + wingPiece(k, i), cat: 'grind', group: 'Wing pieces' }));
      out.push({ id: 'wingset:' + k, cat: 'core', group: 'Wing sets' });
    }
    return out;
  },
  firsts: {
    wingPiece: d => (d.isNew ? 'wing:' + wingPiece(d.set, d.i) : null),
    wingSet: d => 'wingset:' + d.set,
  },
});
