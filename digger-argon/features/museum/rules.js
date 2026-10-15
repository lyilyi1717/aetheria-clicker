// Dig feature: the bone block of the Museum. The Museum is one collection now (thirteen sets, see proto/features/wing2):
// a bone block that breaks hands one bone to the Museum, and the Museum decides which piece it is. There is no coin
// bonus for a set any more; each set opens a thing.
// Old saves: `fossils` (bones found) and `sets` (finished sets) are copied into the Museum once (migrate below) and
// are not written to again. SETS stays as a small table of the first three sets' sizes (the sims reach it by path).
// Events sent: fossil (every bone block that breaks; `set` and `piece` say what it was), and from the Museum: set.
import { use, emit } from '../../core/registry.js';
import { layerOf, dirtVal, siteMult, LAYER } from '../../core/grid.js';
import { rnd } from '../../core/rng.js';
import { addCoins, coinMult } from '../../core/rules.js';
import { WING } from '../wing2/sets.js';
import { wingFind, wingHave, wingDone } from '../wing2/rules.js';
import { wingKeys } from '../wing2/sets.js';
import strings from './strings.js';

export const SETS = {};
for (const [k, W] of Object.entries(WING)) if (W.legacy) SETS[k] = { pieces: W.pieces.length, fromLayer: layerOf(W.from) };

const p = {
  chance: 0.075,     // a bone in a row (times the site's `bone`)
  dupPay: 25,        // a bone no set can use sells for this many dirt blocks of its row
  firstRow: 13,      // the first row with bones: a bone placed above it (a prize, a Star step) counts as one from here
};

// ---------- what a level still holds (pure; the dig strip, the glint and the world map read it) ----------
// A piece can be found at a level (site + floor) when its row is above the floor (a bone, a bundle, ore, a chest, oil), when
// the Big Rock it needs is above the floor (rock:n is row n * 25), or when it belongs to that very site (site:<id>).
export function museumPieceHere(set, pc, site, floor) {
  const W = WING[set];
  if (pc.how.startsWith('site:')) return pc.how.slice(5) === site;
  if (pc.how.startsWith('rock:')) return floor >= Number(pc.how.slice(5)) * LAYER;
  return floor > W.from;
}
export const museumView = (s, set) => {
  const W = WING[set], pieces = W.pieces.map((pc, i) => ({ i, how: pc.how, rare: !!pc.rare, have: wingHave(s, set, i) }));
  return { set, col: W.col, reward: W.reward, pieces, have: pieces.filter(x => x.have).length, of: pieces.length, done: wingDone(s, set) };
};
// every set that a level can still give a piece of, in the order the Museum fills them
export function museumHolds(s, site, floor) {
  const out = [];
  for (const set of wingKeys()) {
    if (wingDone(s, set)) continue;
    if (WING[set].pieces.some((pc, i) => !wingHave(s, set, i) && museumPieceHere(set, pc, site, floor))) out.push(museumView(s, set));
  }
  return out;
}
// the one set a level shows: the first it can still finish; else the last finished set it could give (so the map shows it done)
export function museumLevel(s, site, floor) {
  const h = museumHolds(s, site, floor);
  if (h.length) return h[0];
  let last = null;
  for (const set of wingKeys()) if (wingDone(s, set) && WING[set].pieces.some(pc => museumPieceHere(set, pc, site, floor))) last = set;
  return last ? museumView(s, last) : null;
}
// the dig in play (a save from before has no run yet: nothing to show)
export const museumHere = s => (s.run ? museumLevel(s, s.site, s.run.floor) : null);
// should this block glint: does it still give a piece this level holds?
export function museumWants(s, kind) {
  if (!s.run) return false;
  const tags = kind === 'fossil' ? ['bone'] : kind === 'lost' ? ['lost', 'blast'] : [];
  return museumHolds(s, s.site, s.run.floor).some(h => h.pieces.some(x => !x.have && (tags.includes(x.how) || (kind === 'lost' && x.how.startsWith('site:')))));
}

// ---------- PSA-Style Condition Grading (Issue B1 / M6) ----------
export const GRADES = {
  10: { grade: 10, key: 'gem_mint', name: 'Gem Mint', slab: 'gold' },
  9:  { grade: 9,  key: 'mint',     name: 'Mint',     slab: 'silver' },
  8:  { grade: 8,  key: 'near_mint', name: 'Near Mint', slab: 'bronze' },
  7:  { grade: 7,  key: 'weathered', name: 'Weathered / Fractured', slab: 'bronze' },
};

export function evaluateFossilGrade(s, b = {}) {
  const src = b.src || (b.byHand ? 'you' : 'crew');
  const cell = b.cell || {};
  const info = b.info || {};
  const hits = (cell.hits || 0) + 1; // total hits taken to break cell

  // 1. Obliterated by collateral TNT shockwaves -> Grade 7 (Weathered / Fractured)
  if (src === 'tnt' || cell.tntDamaged || info.tnt || (info.chain && info.chain > 0)) {
    return { grade: 7, label: 'Weathered / Fractured', clean: false, slab: 'bronze' };
  }

  // 2. Chipped swings (> 2 hits) -> Grade 8 (Near Mint)
  if (hits > 2 || cell.chipped) {
    return { grade: 8, label: 'Near Mint', clean: true, slab: 'bronze' };
  }

  // 3. Broken with fine pick tip on accented beat (Good Hit) -> Grade 10 (Gem Mint)
  const isGoodHit = !!(s && (s._goodHit || (s.picks && s.picks.goodHit))) ||
                    !!info.goodHit || !!info.accent || !!info.fineTip || !!info.fine;
  if (isGoodHit) {
    return { grade: 10, label: 'Gem Mint', clean: true, slab: 'gold' };
  }

  // 4. Broken with standard pick swing -> Grade 9 (Mint)
  return { grade: 9, label: 'Mint', clean: true, slab: 'silver' };
}

export function ensureMuseumSpecimens(s) {
  if (!s.museum) s.museum = {};
  if (!s.museum.specimens) s.museum.specimens = {};
  if (!s.specimens) s.specimens = s.museum.specimens;
  return s.museum.specimens;
}

export function getSpecimen(s, id) {
  const specs = ensureMuseumSpecimens(s);
  return specs[id] || null;
}

export function allSpecimens(s) {
  return Object.values(ensureMuseumSpecimens(s));
}

export function specimenGrade(s, id) {
  const spec = getSpecimen(s, id);
  return spec ? spec.grade : null;
}

export function recordSpecimen(s, id, data = {}) {
  const specs = ensureMuseumSpecimens(s);
  const existing = specs[id];
  const grade = data.grade !== undefined ? data.grade : 9;
  const clean = data.clean !== undefined ? data.clean : (grade >= 8);
  const spec = {
    id,
    grade,
    clean,
    restored: !!data.restored,
    excavatedAt: data.excavatedAt || Date.now(),
    set: data.set || id.split('.')[0] || '',
    piece: data.piece !== undefined ? data.piece : -1,
    brushStrokes: data.brushStrokes || 0,
  };
  specs[id] = spec;
  if (s.specimens) s.specimens[id] = spec;
  return spec;
}

export function canRestoreSpecimen(s, id) {
  const spec = getSpecimen(s, id);
  if (!spec) return false;
  return (spec.grade === 7 || spec.grade === 8) && !spec.restored;
}

export function brushSpecimen(s, id, ev = () => {}) {
  const spec = getSpecimen(s, id);
  if (!spec) return null;
  spec.brushStrokes = (spec.brushStrokes || 0) + 1;
  const debrisRemaining = Math.max(0, 100 - spec.brushStrokes * 20);
  emit(s, ev, 'specimenBrushed', { id, stroke: spec.brushStrokes, debrisRemaining });

  if (spec.brushStrokes >= 5 && spec.grade < 9) {
    const prev = spec.grade;
    spec.grade = 9;
    spec.restored = true;
    spec.brushProgress = 100;
    emit(s, ev, 'specimenRestored', { id, grade: 9, prevGrade: prev });
  }
  return {
    strokes: spec.brushStrokes,
    debrisPercent: debrisRemaining,
    done: !!spec.restored,
    grade: spec.grade,
  };
}

export function restoreSpecimen(s, id, ev = () => {}) {
  const spec = getSpecimen(s, id);
  if (!spec) return false;
  const prev = spec.grade;
  spec.grade = 9;
  spec.restored = true;
  spec.brushStrokes = 5;
  spec.brushProgress = 100;
  emit(s, ev, 'specimenRestored', { id, grade: 9, prevGrade: prev });
  return true;
}

function foundFossil(s, b, ev) {
  const { r, c, src } = b;
  const fr = Math.max(r, p.firstRow);
  const got = wingFind(s, { tags: ['bone'], layer: layerOf(fr) }, ev, { r: fr, c, src });
  let coins = 0;
  if (!got) { coins = Math.round(dirtVal(r) * p.dupPay * coinMult(s)); addCoins(s, coins, src); }
  const key = got ? `${got.set}.${got.i}` : `fossil_${r}_${c}`;
  s.fossils[key] = (s.fossils[key] || 0) + 1;     // a tally of bone blocks broken, by the piece they gave

  // Evaluate excavation condition
  const evalResult = evaluateFossilGrade(s, b);
  const specs = ensureMuseumSpecimens(s);
  const existing = specs[key];

  // Store specimen if not present or if excavated at a strictly higher grade
  if (!existing || evalResult.grade > existing.grade) {
    specs[key] = {
      id: key,
      set: got ? got.set : '',
      piece: got ? got.i : -1,
      grade: evalResult.grade,
      clean: evalResult.clean,
      restored: false,
      brushStrokes: 0,
      excavatedAt: Date.now(),
    };
    if (s.specimens) s.specimens[key] = specs[key];
  }

  const specNow = specs[key];
  emit(s, ev, 'fossilGraded', {
    id: key,
    grade: evalResult.grade,
    clean: evalResult.clean,
    slab: evalResult.slab,
    specimen: specNow,
  });

  emit(s, ev, 'fossil', {
    r, c,
    set: got ? got.set : '',
    piece: got ? got.i : -1,
    isNew: !!(got && got.isNew),
    coins: got ? got.coins : coins,
    grade: evalResult.grade,
    specimen: specNow,
  });
}

export const museum = use({
  id: 'museum',
  params: p,
  tables: { SETS },
  strings,
  version: 2,
  state: {
    fossils:   { init: () => ({}), survives: ['site', 'land'] },   // 'camel.2': bone blocks that gave that piece (the old Museum's list; migrate copies it once)
    sets:      { init: () => ({}), survives: ['site', 'land'] },   // old: completed sets
    specimens: { init: () => ({}), survives: ['site', 'land'] },   // PSA-style graded physical specimens
    museum:    { init: () => ({ specimens: {} }), survives: ['site', 'land'] },
  },
  // v2: the two museums became one. Copy what the player had; say once that the coin bonus is gone.
  migrate(s) {
    for (const [k, n] of Object.entries(s.fossils || {})) {
      const set = k.split('.')[0];
      if (WING[set] && WING[set].legacy && !(s.wingGot[k] > 0)) s.wingGot[k] = n;
    }
    let any = false;
    for (const k of Object.keys(s.sets || {})) if (s.sets[k] && WING[k] && WING[k].legacy) { s.wingDone[k] = true; any = true; }
    if (any) s.wingNote = true;
    ensureMuseumSpecimens(s);
  },
  blocks: {
    fossil: {
      at: 100, hp: 3, val: 0, notice: true,
      hit(s, r, c, cell, dmg, src, ev, info = {}) {
        cell.hits = (cell.hits || 0) + 1;
        if (src === 'tnt' || info.tnt || (info.chain && info.chain > 0)) {
          cell.tntDamaged = true;
        }
      },
      broke: foundFossil,
    },
  },
  gen: { row: [{ at: 40, fn(c) {
    const s = c.s;
    if (c.r === p.firstRow && !s.seen.fossil) { c.put('fossil'); s.seen.fossil = true; }
    else if (c.r > p.firstRow && rnd() < p.chance * siteMult(c.site, 'bone')) c.put('fossil');
  } }] },
  unlocks: () => {
    const out = [];
    for (const [k, v] of Object.entries(SETS)) {
      for (let i = 0; i < v.pieces; i++) out.push({ id: `bone:${k}.${i}`, group: 'bones' });
      out.push({ id: 'set:' + k, group: 'Museum sets' });
    }
    return out;
  },
  firsts: {
    set: d => 'set:' + d.set,
  },
});
