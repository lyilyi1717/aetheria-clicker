// Dig feature (rules): the Rafeeqs' wardrobe. LOOKS ONLY: a head, a body, a cloth colour and a cloth pattern for the Rafeeqs, for all of
// them at once or one at a time. Nothing here changes a number: no mod, no hook but the one that notices a look was earned.
// Seat `i` is the i-th Rafeeq (his index in s.diggers, 0 to 7). The seat's clothes survive New Site and Land.
//
// State: wardrobe { mode: 'all' | 'one', all: { head, body, colour, pattern }, one: [null | partial look x 8], seen: { 'slot:id': 1 }, undo, t }
//   an empty slot in `all` falls back: the head to the contract hat the player had on (s.contractLook.hat, so an old save looks as it did),
//   then the Museum's tea hat, then the fez; the others to Work Shirt, Blue, Plain.
//   `one[i]` holds only the slots that Rafeeq was dressed on his own; the rest follows `all`.
//   `seen` remembers a look once it was earned, so a New Site or a Land never takes one away.
// Exports (prefix wardrobe): wardrobeWear(s, i), wardrobeItems(slot), wardrobeOwns(s, slot, id), wardrobeWhy(s, slot, id) -> string key | '',
//   wardrobeWhyN(slot, id) -> the number in that line, wardrobeSet(s, who, slot, id), wardrobeStep(s, who, slot, dir, from),
//   wardrobeRandom(s, who), wardrobeUndo(s), wardrobeLook(s, who, slot) -> the id shown for 'all' or a seat.
import { use, emit } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { layerOf } from '../../core/grid.js';
import { ownsCosmetic, contractList } from '../contracts/rules.js';
import { roadStamps } from '../sites/rules.js';
import strings from './strings.js';

const p = {
  seats: 8,
  levelsStraw: 6, levelsRice: 10, levelsWide: 14, levelsFlat: 17,   // levels finished
  hardBisht: 5,        // Hard medals
  medalsGold: 10,      // medals of any kind: the gold thread
  contractsZig: 3,     // contracts won: the Sadu weave
  levelsStars: 20,     // levels finished: the star cloth
  deepLayer: 3,        // the layer (0 to 3) that is "the Deep"
  check: 0.5,          // seconds between looks at what was earned
};

export const WARDROBE_SLOTS = ['head', 'body', 'colour', 'pattern'];
const FREE = { head: ['fez', 'ghutra', 'hard', 'bare'], body: ['shirt', 'thobe', 'vest'],
  colour: ['blue', 'sand', 'green', 'red', 'white', 'teal', 'purple', 'orange'], pattern: ['plain', 'stripes', 'check', 'dots'] };
// the ones that are earned by play: how, in the order they show
const done = (s, k) => !!(s.wingDone && s.wingDone[k]);
const EARN = {
  head: {
    cap: s => ownsCosmetic(s, 'cap'), crown: s => ownsCosmetic(s, 'crown'),
    cosy: s => done(s, 'teapot'), pilot: s => done(s, 'pilot'), pearlband: s => done(s, 'pearls'),
    straw: (s, c) => c.fin >= p.levelsStraw, rice: (s, c) => c.fin >= p.levelsRice, wide: (s, c) => c.fin >= p.levelsWide, flat: (s, c) => c.fin >= p.levelsFlat,
    goldfez: (s, c) => c.all3,
  },
  body: { bisht: (s, c) => c.hard >= p.hardBisht, diver: s => done(s, 'shark'), overalls: s => done(s, 'oilrig') },
  colour: { gold: (s, c) => c.fin + c.fast + c.hard >= p.medalsGold, night: s => layerOf(Math.max(0, s.best - 1)) >= p.deepLayer },
  pattern: { zigzag: (s, c) => contractList().filter(k => s.contractsWon[k.id]).length >= p.contractsZig, stars: (s, c) => c.fin >= p.levelsStars },
};
const NEED = { straw: p.levelsStraw, rice: p.levelsRice, wide: p.levelsWide, flat: p.levelsFlat, bisht: p.hardBisht, gold: p.medalsGold, zigzag: p.contractsZig, stars: p.levelsStars };
const ORDER = {};
for (const sl of WARDROBE_SLOTS) ORDER[sl] = [...FREE[sl], ...Object.keys(EARN[sl])];

export const wardrobeItems = slot => (ORDER[slot] || []).map(id => ({ id, free: FREE[slot].includes(id) }));
export const wardrobeWhyN = (slot, id) => NEED[id] || 0;

// the counts the earned looks read, worked out once per look at them
function counts(s) {
  const c = { fin: 0, fast: 0, hard: 0, all3: false };
  for (const st of roadStamps(s)) { c.fin += st.fin ? 1 : 0; c.fast += st.fast ? 1 : 0; c.hard += st.hard ? 1 : 0; if (st.fin && st.fast && st.hard) c.all3 = true; }
  return c;
}
const earnedNow = (s, slot, id, c) => { const f = EARN[slot] && EARN[slot][id]; return !!f && !!f(s, c || counts(s)); };
export function wardrobeOwns(s, slot, id) {
  if (!ORDER[slot] || !ORDER[slot].includes(id)) return false;
  return FREE[slot].includes(id) || !!s.wardrobe.seen[slot + ':' + id] || earnedNow(s, slot, id);
}
export const wardrobeWhy = (s, slot, id) => (!ORDER[slot] || !ORDER[slot].includes(id) || wardrobeOwns(s, slot, id) ? '' : 'wd_why_' + id);

// ---------- what a Rafeeq wears ----------
const seatOf = i => ((i % p.seats) + p.seats) % p.seats;
function legacyHead(s) {
  const h = s.contractLook && s.contractLook.hat;
  if (h && wardrobeOwns(s, 'head', h)) return h;
  return done(s, 'teapot') ? 'cosy' : 'fez';
}
const DEFAULT = { body: 'shirt', colour: 'blue', pattern: 'plain' };
function pick(s, slot, own, base) {
  for (const id of [own && own[slot], s.wardrobe.all[slot]]) if (id && wardrobeOwns(s, slot, id)) return id;
  return base;
}
export function wardrobeLook(s, who, slot) {
  const own = who === 'all' ? null : s.wardrobe.one[seatOf(who)];
  return pick(s, slot, own, slot === 'head' ? legacyHead(s) : DEFAULT[slot]);
}
export function wardrobeWear(s, i) {
  const own = s.wardrobe.one[seatOf(i)];
  return { head: pick(s, 'head', own, legacyHead(s)), body: pick(s, 'body', own, DEFAULT.body), colour: pick(s, 'colour', own, DEFAULT.colour), pattern: pick(s, 'pattern', own, DEFAULT.pattern), seat: seatOf(i) };
}

// ---------- choosing ----------
const snap = s => ({ all: { ...s.wardrobe.all }, one: s.wardrobe.one.map(o => (o ? { ...o } : null)) });
export function wardrobeSet(s, who, slot, id) {
  if (!ORDER[slot] || !wardrobeOwns(s, slot, id)) return false;
  const w = s.wardrobe;
  if (who === 'all') {
    if (w.one.some(o => o && o[slot])) w.undo = snap(s);
    w.all[slot] = id;
    w.one = w.one.map(o => { if (!o) return null; const q = { ...o }; delete q[slot]; return Object.keys(q).length ? q : null; });
  } else {
    const k = seatOf(who);
    w.one[k] = { ...(w.one[k] || {}), [slot]: id };
  }
  return true;
}
export function wardrobeUndo(s) {
  const u = s.wardrobe.undo;
  if (!u) return false;
  s.wardrobe.all = { ...u.all }; s.wardrobe.one = u.one.map(o => (o ? { ...o } : null)); s.wardrobe.undo = null;
  return true;
}
// the arrows: from `from` (or what is worn) one step along the slot's list, wrapping; it is worn only when owned
export function wardrobeStep(s, who, slot, dir, from) {
  const list = ORDER[slot], at = list.indexOf(from || wardrobeLook(s, who, slot));
  const id = list[(at + (dir < 0 ? -1 : 1) + list.length * 2) % list.length];
  const owned = wardrobeSet(s, who, slot, id);
  return { id, owned };
}
// a surprise: every owned slot at random; for all the Rafeeqs, each gets his own and the colours differ
export function wardrobeRandom(s, who) {
  const owned = slot => ORDER[slot].filter(id => wardrobeOwns(s, slot, id));
  const take = (list, ban) => { const l = list.filter(id => !ban.includes(id)); const a = l.length ? l : list; return a[Math.floor(rnd() * a.length)]; };
  const w = s.wardrobe;
  if (who === 'all') {
    w.undo = snap(s);
    const used = [];
    for (let k = 0; k < p.seats; k++) {
      const look = {};
      for (const sl of WARDROBE_SLOTS) look[sl] = take(owned(sl), sl === 'colour' ? used : []);
      used.push(look.colour); if (used.length >= owned('colour').length) used.length = 0;
      w.one[k] = look;
    }
  } else {
    const k = seatOf(who), look = {};
    for (const sl of WARDROBE_SLOTS) look[sl] = take(owned(sl), []);
    w.one[k] = look;
  }
  return true;
}

export const wardrobe = use({
  id: 'wardrobe', params: p, strings,
  state: {
    wardrobe: { init: () => ({ mode: 'all', all: { head: '', body: '', colour: '', pattern: '' }, one: Array.from({ length: 8 }, () => null), seen: {}, undo: null, t: 0, ready: false }), survives: ['site', 'land'] },
  },
  hooks: {
    // a look that was earned is remembered for good, and said once
    step: { at: 700, fn(s, dt, ev) {
      const w = s.wardrobe;
      w.t = (w.t || 0) + dt;
      if (w.t < p.check) return;
      w.t = 0;
      let c = null;
      for (const slot of WARDROBE_SLOTS) for (const id of Object.keys(EARN[slot])) {
        const key = slot + ':' + id;
        if (w.seen[key]) continue;
        if (earnedNow(s, slot, id, c || (c = counts(s)))) { w.seen[key] = 1; if (w.ready) emit(s, ev, 'wardrobeNew', { slot, id }); }
      }
      w.ready = true;        // the first look (a loaded save) is banked without a fanfare
    } },
  },
});
