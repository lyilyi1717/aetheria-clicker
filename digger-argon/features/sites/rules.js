// Dig feature: sites, the road and the deal. A site is where you dig; each one bends the rules of the ground.
//
// EVERY SITE HAS A BOTTOM. A dig has a `floor` (a depth that is a Big Rock row: 50, 75, 100 ...); the Big Rock at that
// depth is the site's Gate. Breaking it FINISHES the site: the version is stamped for ever and pays Stars. You may then
// dig on below (the endless dig) or move on ("Next site"). Moving on before the Gate is allowed after the second Big
// Rock and pays a little.
//
// Three medals per version (a version is site + floor + twist; its key is `dunes:50` or `gold:75:dim`):
//   Finished  the Gate broke.
//   Fast      the Gate broke under the par time. The stopwatch counts attended seconds up while you dig that site: it
//             never counts down and nothing expires; you can try again for the medal any time.
//   Hard      the site's hard rule was won. The hard rule is a contract (`hardOf`); a card that carries it starts the dig
//             under that contract, and the contracts feature calls `siteMedal(s, 'hard', ev)` when it is won.
// A medal pays a few Stars, once per version.
//
// THE ROAD (docs/dig-design.md, section 2; chapter two in 2.4: levels 21 to 40, `ch: 2`, keys `c2:site:floor`, ground x ch2Hp,
// Stars x ch2Stars). Chapter one is twenty levels in a fixed order (ROAD1): the four lessons, then every depth from
// 100 m to 275 m is met twice (learn it at a kind place, prove it at a harder one), in five lands. "Next site" deals ONE card, the next level, until that
// level is finished. A level tried twice and not finished brings side cards beside it (a medal still to win, a twist
// on a finished floor): Stars to come back stronger with. The road is never made softer and no level is skipped
// (the first four pass after two tries: they are lessons, and old saves visited them). When the last level is
// finished the game deals three cards (`dealCards`) and the player picks one: a stretch (the next floor), a new place
// (a site never finished; the Museum's two once their sets are done), a medal still to win, a twist.
//
// STARS are small: `starsAt(depth)` (core/grid.js) is what a floor is worth (3 at 50 m, x4.5 for each 25 m deeper).
// A first finish pays it, a Fast or Hard medal `medalShare` of it, a replay `replayShare`, leaving before the Gate
// `leaveShare` of what the depth reached is worth (at least 1), digging past the Gate `deepShare` of the extra worth.
//
// STATE. `run` (this dig: floor, twist, hard rule, stopwatch, medals, what was found) is per site. `road` (the stamps,
// the dealt cards, the deepest floor finished) survives New Site and Land. An old save: the dig in progress gets a run
// whose floor is the next Big Rock; the sites it had visited become stamps with no medals; Stars held stay.
//
// Events: siteFinished { key, site, floor, twist, time, par, first, stars, fast, medals, found, stamps },
// siteMedal { key, medal, stars }, newSite { gain, stars, key }, legDone { idx, left, saved, n } (a Big Rock closed a leg of the countdown).
import { use, SITES, CONTRACTS, BLOCKS, emit, run } from '../../core/registry.js';
import { reset } from '../../core/state.js';
import { grantFree } from '../../core/rules.js';
import { starsAt, LAYER, COLS, VIEW_ROWS } from '../../core/grid.js';
import { rnd, pickOne } from '../../core/rng.js';
import { newRafeeq } from '../diggers/rules.js';
import strings from './strings.js';

const p = {
  starCoin: 0, starPick: 0,       // a Star gives nothing by itself now: the tracks (starshop) turn Stars into strength
  needBosses: 2,                  // Big Rocks to break before you may move
  // the start kit: every site after the first starts where the player is (docs/dig-design.md 2.2)
  kitPick: 0,                     // the kit gives no free pick levels (they made every level 5 times faster, see the PR); Warm Pick still does
  kitCrew: 1,                     // Rafeeqs waiting (Rafeeq Waiting raises it)
  proveHp: 6,                     // the second level of a depth ("prove it") has ground this much harder (was 4: one try, now 1 to 3)
  // The Gate of each road level after the lessons, as a multiple of the ground's formula (docs/dig-design.md 2.3c): sized so that
  // "the Gate in your hits" (the bar's number) at the pick you bring grows gently from level to level instead of jumping.
  // Prove entries cut 14 Oct 2026 (the Gate is yours, decision 13): a prove Gate is now always fought, so it is sized at about 1.5
  // times its learn level's Gate in swings at arrival, smoothed so no prove Gate is 3x its neighbour; levels 16, 17 and 20 a
  // little smaller again after the first measurement (3 to 6 tries). docs/pacing-targets.md, "The Gate is yours".
  gateMul: [0.44, 3.0, 0.371, 1.4, 0.278, 1.9, 0.201, 2.7, 0.257, 3.5, 0.234, 2.4, 0.09, 1.9, 0.0645, 1.4],
  // Chapter Two (levels 21 to 40, docs/dig-design.md 2.4): the same 16 depth slots again at night, then the Empty Quarter
  // (300 and 325 m). Since 14 Oct 2026 (the Gate is yours, decision 13) a chapter-two level is its chapter-one slot made
  // ch2Hp x ch2Hard[level] harder in everything: ground, Big Rocks and the Gate. Its Gate size is the slot's (gateMulCh2 21 to 36
  // copy gateMul); the Empty Quarter has its own (a learn and a prove size like levels 19 and 20).
  gateMulCh2: [0.44, 3.0, 0.371, 1.4, 0.278, 1.9,               // 21-26: 100 to 150 m, as levels 5 to 10
    0.201, 2.7, 0.257, 3.5, 0.234, 2.4, 0.09, 1.9, 0.0645, 1.4,      // 27-36: 175 to 275 m, as levels 11 to 20
    0.06, 2.0, 0.06, 2.0],                                          // 37-40: the Empty Quarter, 300 learn, 300 prove, 325 learn, 325 prove
  ch2Hp: 3e12,                     // chapter two: every block, Big Rock and Gate is this much harder (the player arrives far stronger) ...
  // ... times this, per level 21 to 40. The player's hit over the hit at its chapter-one slot falls from about 1e12 at level 21 to
  // about 1e10 at level 25 and on (Warm Pick and Stars count for less as the slots deepen: hit grows about x10 per 25 m in chapter
  // two against x50 in chapter one). While Rock Friend walked past chapter-two Gates and time away dug its ground at plain-ground
  // cost, one ch2Hp worked; once both stopped (decision 13), levels 25 and on were a wall. Each entry puts the level at about
  // 3 to 5 times easier than its slot, against the hit the player brings. A side card (a twist) of a level uses the level's entry.
  ch2Hard: [0.5, 0.3, 0.03, 0.015, 1e-3, 5e-4, 1e-4, 3.3e-5, 7e-6, 2e-6, 8e-7, 2.5e-7, 2.5e-7, 6e-8, 5e-8, 1.5e-8, 6e-9, 2e-9, 8e-10, 3e-10],
  ch2Stars: 5e3,                  // chapter two: every Star it pays (finish, medal, replay, chili, leaving) is this much bigger
  sideAfter: 2,                   // a level of the road tried this often and not finished: side cards are dealt beside it
  // the bottom
  baseFloor: 50,                  // where a Gate is when no card says (old saves, the contracts board)
  maxFloor: 325,                  // no Gate deeper than this is dealt (was 300; the Empty Quarter's last Gates are at 325 m)
  // the stopwatch: par = parBase seconds at 50 m, x parGrow for every 25 m deeper, x parTwist with a twist;
  // below parTop only x parTopGrow per 25 m (275 m is already 8,500 s: no 3-hour par at 325 m)
  parBase: 300, parGrow: 1.45, parTwist: 1.15, parTop: 275, parTopGrow: 1.1,
  // Stars (a floor is worth starsAt(floor))
  medalShare: 0.5,                // Fast and Hard: this share of the floor's worth, once each
  replayShare: 0.25,              // finishing a version again
  leaveShare: 0.34,               // leaving before the Gate: this share of the worth of the depth you reached (at least 1)
  leaveCap: 0.5,                  // ... but never more than this share of what finishing it again would pay
  learnPay: 0.35, provePay: 1.65, // a road depth pays most of its Stars when it is proved, not when it is learned
  deepShare: 0.5,                 // after the Gate: this share of the extra worth of the depth you reached, when you move
  deepFrom: 10,                   // metres below the Gate before that counts
  // twists
  twistHp: 1.3,                   // 'heavy': the ground is this much harder
  twistSight: 1,                  // 'dim': blocks you see around open space
  twistBarrel: 4,                 // 'barrels': a TNT in every 4th row
  // Chili levels: a finished level can be dug again with 1 to 5 chili pips. Pip n puts the first n rules of the chili rule list
  // (contracts feature) on, makes the ground chiliGround^n and every Big Rock (the Gate too) chiliRock^n harder, and pays.
  chiliPips: 5,
  chiliHoldMs: 1500,              // the finish card waits this long after a pip is cleared, so the banner is seen
  chiliGround: 1.3, chiliRock: 1.7,
  chiliStars: [0.5, 0.75, 1, 1.5, 2],             // Stars for the first clear of a pip, x what the level's floor is worth (starsAt)
  chiliHitAt: { 3: 0.03, 5: 0.05 },               // clearing this pip adds this to your hit for ever (per level; they add up)
  chiliHitCap: 1.6,                               // the most the chilies ever add (+160%)
};

// The first four sites, in order. Why this order: the Dunes teach the hit, the ore and the Big Rock. Powder Valley teaches
// that the ground blows up in chains. The Valley of Beasts is the kindest ground at the first deep floor (bones and chests
// everywhere, so relics to meet the 75 m wall) and opens the Museum. Golden Wadi has the hardest ground (1.35) and the ore
// the Forge turns into tools, so it comes last, when you can use both.
export const FIXED = [
  { site: 'dunes', floor: 50 }, { site: 'boom', floor: 50 }, { site: 'bones', floor: 75 }, { site: 'gold', floor: 75 },
];
// The whole road: the four lessons, then each deeper floor twice (learn it at the first place, prove it at the second).
// The road is cut into ZONES (continents): home first, then four lands, each with its own look and its own beat for the
// pick. Inside a zone the levels go from learn to prove (`prove`: harder ground and a harder Gate).
export const MAX_SITE_DEPTH = 350;
export const MAX_LEGS = 10;
export const MIN_PAR = 300;
export const MAX_PAR = 720;

// Chapter two walks home at night: the four lands in reverse (n_ = the land at night), then the Empty Quarter.
export const ZONES = ['arabia', 'africa', 'eastasia', 'americas', 'europe', 'n_europe', 'n_americas', 'n_eastasia', 'n_africa', 'emptyquarter'];

// Four levels in each land after home: two depths, each met to learn it and then to prove it (`prove`: harder).
// `ch` is the chapter (1 to 12); a level of chapter two has its own stamp key (`c2:dunes:100`, see siteKey).
const LAND = (zone, d, ch = 1) => [
  { site: 'dunes', floor: d, zone, ch }, { site: 'boom', floor: d, zone, prove: true, ch },
  { site: 'bones', floor: Math.min(MAX_SITE_DEPTH, d + LAYER), zone, ch }, { site: 'gold', floor: Math.min(MAX_SITE_DEPTH, d + LAYER), zone, prove: true, ch },
];
export const CHAPTER_LEN = 20;            // levels in a chapter: the screen says "Level N of 20", then "Chapter 2, level N of 20"
export const ROAD1 = [
  ...FIXED.map(f => ({ ...f, zone: 'arabia', ch: 1 })),
  ...LAND('africa', 100), ...LAND('eastasia', 150), ...LAND('americas', 200), ...LAND('europe', 250),
];
// Chapter two, the road home (levels 21 to 40): the depth slots of levels 5 to 20 again, in the same order, at night, with the
// lands in reverse; then the Empty Quarter at 300 and 325 m, where the caravan is found.
export const ROAD2 = [
  ...LAND('n_europe', 100, 2), ...LAND('n_americas', 150, 2), ...LAND('n_eastasia', 200, 2), ...LAND('n_africa', 250, 2),
  ...LAND('emptyquarter', 300, 2),
];

// Chapters 3 through 12: The 365-day monthly roadmap across 4 Geological Eras
const CH_DEPTHS = [100, 150, 200, 250, 300];
export const ROAD3 = CH_DEPTHS.flatMap(d => LAND('aquifers', d, 3));
export const ROAD4 = CH_DEPTHS.flatMap(d => LAND('geothermal', d, 4));
export const ROAD5 = CH_DEPTHS.flatMap(d => LAND('necropolis', d, 5));
export const ROAD6 = CH_DEPTHS.flatMap(d => LAND('guilds', d, 6));
export const ROAD7 = CH_DEPTHS.flatMap(d => LAND('clockwork', d, 7));
export const ROAD8 = CH_DEPTHS.flatMap(d => LAND('biolum', d, 8));
export const ROAD9 = CH_DEPTHS.flatMap(d => LAND('chasm', d, 9));
export const ROAD10 = CH_DEPTHS.flatMap(d => LAND('prisms', d, 10));
export const ROAD11 = CH_DEPTHS.flatMap(d => LAND('meteor', d, 11));
export const ROAD12 = CH_DEPTHS.flatMap(d => LAND('celestial', d, 12));

export const ROAD = [
  ...ROAD1, ...ROAD2, ...ROAD3, ...ROAD4, ...ROAD5, ...ROAD6,
  ...ROAD7, ...ROAD8, ...ROAD9, ...ROAD10, ...ROAD11, ...ROAD12,
];

export const CHAPTER_BIOMES = {
  1: { id: 'terrestrial', name: 'Terrestrial & Night Caravan', era: 1 },
  2: { id: 'night_caravan', name: 'Night Caravan', era: 1 },
  3: { id: 'aquifers', name: 'Sunken Aquifers', era: 1 },
  4: { id: 'geothermal', name: 'Geothermal Kiln', era: 1 },
  5: { id: 'necropolis', name: 'Necropolis of Bones', era: 2 },
  6: { id: 'guilds', name: 'Guilds of Alqahwa', era: 2 },
  7: { id: 'clockwork', name: 'Clockwork Spire', era: 2 },
  8: { id: 'flora', name: 'Bioluminescent Deep', era: 3 },
  9: { id: 'acoustics', name: 'Resonant Chasm', era: 3 },
  10: { id: 'prisms', name: 'Prismatic Vaults', era: 3 },
  11: { id: 'astral', name: 'Meteor Strata', era: 4 },
  12: { id: 'cradle', name: 'Celestial Core', era: 4 },
};
export const chapterBiome = ch => CHAPTER_BIOMES[ch] || CHAPTER_BIOMES[1];
export const eraOf = ch => (CHAPTER_BIOMES[ch] && CHAPTER_BIOMES[ch].era) || 1;
export const chapterOf = level => Math.floor((level - 1) / CHAPTER_LEN) + 1;

// the chapter of a run, card or stamp (1 when it has none: every save from before chapter two)
export const chOf = x => (x && x.ch >= 2 ? x.ch : 1);
// a road level's stamp key
export const roadKey = f => siteKey(f.site, f.floor, '', f.ch);
// the new thing a level brings, as a key into strings: by the level's place and the layer it is dug through (the last one it
// crosses, the 25 m above its Gate), not the one below the Gate. Level 5 (Gate at 100 m) is dug through the crystal layer.
const DEPTH_NEW = { 75: 'crystal', 100: 'black', 125: 'living', 150: 'angry', 175: 'hot' };
export function newThingKey(f, idx) {
  if (f.prove) return 'new_prove';
  if (f.ch === 2) return idx === CHAPTER_LEN ? 'new_ch2' : f.zone === 'emptyquarter' ? 'new_eq' : 'new_night';
  if (f.ch > 2) return 'new_ch' + f.ch;
  if (idx < 4) return 'new_site_' + f.site;
  return 'new_layer_' + (DEPTH_NEW[f.floor - LAYER] || 'more');
}
// what the screen calls a road level (1 to 240): { ch, n, of } = "Level n of 20" or "Chapter 2, level n of 20"
export const levelOf = level => ({ ch: chapterOf(level), n: ((level - 1) % CHAPTER_LEN) + 1, of: CHAPTER_LEN });
// the road level of the dig in play (index into ROAD), or -1 for a side level / after the road
export const roadIndex = s => { const r = s.run; return r && !r.twist ? ROAD.findIndex(f => f.site === r.site && f.floor === r.floor && f.ch === chOf(r)) : -1; };
// the zone of the dig in play: its road level's, else the zone of the deepest chapter-one level at or above its floor
export function roadZone(s) {
  const i = roadIndex(s);
  if (i >= 0) return ROAD[i].zone;
  const fl = (s.run && s.run.floor) || 0;
  let z = 'arabia';
  for (const f of ROAD1) if (f.floor <= fl) z = f.zone;      // a side level is in chapter one's lands
  return z;
}
// this dig is the "prove it" level of its depth (no twist on it)
export const roadProve = s => { const i = roadIndex(s); return i >= 0 && !!ROAD[i].prove; };
// stacked on a known floor for a harder version
export const TWISTS = ['heavy', 'dim', 'barrels'];
// the hard rule of a site: contracts in order, a deeper floor uses the next one
const HARD = { dunes: ['bare', 'rising', 'glass', 'blindAlone'], boom: ['tntOnly'], gold: ['dark', 'richLazy', 'feedRock'], bones: ['oneRelic', 'dry'] };

// a contract won at this site also lets you move on at once (the contracts feature sets `contractFree`)
export const canNewSite = s => s.bossesDown >= p.needBosses || !!s.contractFree;
export const siteOpen = (s, site) => !!SITES[site] && (!SITES[site].open || !!SITES[site].open(s));
export const siteList = s => Object.keys(SITES).filter(id => siteOpen(s, id));

// ---------- versions, keys, par, worth ----------
export const siteKey = (site, floor, twist, ch) => (ch > 1 ? 'c' + ch + ':' : '') + site + ':' + floor + (twist ? ':' + twist : '');
export function sitePar(floor, twist, bounded = false) {
  const top = Math.min(floor, p.parTop), below = Math.max(0, floor - p.parTop) / LAYER;
  const raw = Math.round(p.parBase * Math.pow(p.parGrow, (top - p.baseFloor) / LAYER) * Math.pow(p.parTopGrow, below) * (twist ? p.parTwist : 1));
  return bounded ? Math.min(MAX_PAR, Math.max(MIN_PAR, raw)) : raw;
}
export function boundedPar(floor, twist) {
  return Math.min(MAX_PAR, Math.max(MIN_PAR, sitePar(floor, twist)));
}
export function hardOf(site, floor) {
  const l = HARD[site];
  if (!l || !CONTRACTS[l[0]]) return null;
  return l[Math.max(0, Math.min(l.length - 1, Math.round((floor - p.baseFloor) / LAYER)))];
}
// the road level at (site, floor) with no twist: 'learn', 'prove' or '' (not on the road)
const roadKind = (site, floor, twist, ch = 1) => { if (twist) return ''; const f = ROAD.find(x => x.site === site && x.floor === floor && x.ch === ch); return f ? (f.prove ? 'prove' : f.floor > FIXED[FIXED.length - 1].floor ? 'learn' : '') : ''; };
// what a floor is worth in Stars in a chapter: chapter two pays sites.ch2Stars times more
export const worthAt = (floor, ch = 1) => starsAt(floor) * (ch >= 2 ? p.ch2Stars : 1);
export const firstPay = (floor, kind = '', ch = 1) => Math.max(1, Math.round(worthAt(floor, ch) * (kind === 'prove' ? p.provePay : kind === 'learn' ? p.learnPay : 1)));
export const medalPay = (floor, ch = 1) => Math.max(1, Math.round(p.medalShare * worthAt(floor, ch)));
export const replayPay = (floor, ch = 1) => Math.max(1, Math.ceil(p.replayShare * worthAt(floor, ch)));

// ---------- the countdown: legs ----------
// A leg runs from the start (or the last Big Rock) to the next Big Rock; the last one ends at the Gate. The par is split
// across the legs in proportion to their rows, in whole seconds that add up to the par exactly. Nothing expires: at 0 the
// clock only turns red and counts the seconds over, and the Fast medal rule (time <= par) is unchanged.
export function siteLegs(run, bounded = false) {
  const maxFloor = bounded ? MAX_SITE_DEPTH : Infinity;
  const maxN = bounded ? MAX_LEGS : Infinity;
  const floor = Math.max(1, Math.min(maxFloor, run.floor));
  const n = Math.min(maxN, Math.max(1, Math.ceil(floor / LAYER)));
  const legs = [];
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const rows = Math.min(floor, (i + 1) * LAYER), end = i === n - 1 ? run.par : Math.round(run.par * rows / floor);
    legs.push({ rows: rows - i * LAYER, len: end - prev, end }); prev = end;
  }
  return legs;
}
export const boundedSiteLegs = run => siteLegs(run, true);
// a run from before the legs (or just begun) gets its leg from its clock: the first leg from the start, a later one fresh
// with the seconds the clock is ahead of the par line banked
function legInit(r, down) {
  if (r.legIdx !== undefined) return;
  const legs = siteLegs(r), i = Math.min(down | 0, legs.length - 1);
  r.legIdx = i; r.legAt = i ? r.clock : 0; r.legBank = i ? Math.max(0, legs[i - 1].end - r.clock) : 0; r.legLast = null;
}
// the countdown now: { idx, n, len, left (negative when over), over, last }
export function legLeft(run, down = 0) {
  legInit(run, down);
  const legs = siteLegs(run), i = Math.min(run.legIdx, legs.length - 1);
  if (run.done && run.legLast) return { idx: i, n: legs.length, len: legs[i].len, left: run.legLast.left, over: run.legLast.left < 0, last: true };
  const left = legs[i].len + run.legBank - (run.clock - run.legAt);
  return { idx: i, n: legs.length, len: legs[i].len, left, over: left < 0, last: i === legs.length - 1 };
}
// almodeer may give extra seconds when a leg has run out: once per leg, only at 0 or under, and it counts toward the Fast
// medal (the par of this try is par + extra). Returns the seconds granted (0 when not allowed).
export function legExtend(s, secs, ev = () => {}) {
  const r = siteRun(s);
  if (r.done || !(secs > 0)) return 0;
  const c = legLeft(r, s.bossesDown);
  if (c.left > 0 || r.legExt === c.idx) return 0;
  r.legExt = c.idx; r.legBank += secs; r.extra = (r.extra || 0) + secs;
  emit(s, ev, 'legExtended', { idx: c.idx, secs });
  return secs;
}
export const runPar = r => Math.min(MAX_PAR, Math.max(MIN_PAR, r.par + (r.extra || 0)));
// a Big Rock (or the Gate) broke: close the leg; what was saved is banked into the next one
function legSync(s, ev) {
  const r = s.run, down = s.bossesDown | 0;
  legInit(r, down);
  const n = siteLegs(r).length;
  while (r.legIdx < n && down > r.legIdx) {
    const left = legLeft(r, down).left, saved = Math.max(0, left);
    r.legLast = { idx: r.legIdx, left, saved };
    emit(s, ev, 'legDone', { idx: r.legIdx, left, saved, n });
    r.legIdx++; r.legAt = r.clock; r.legBank = saved;
  }
  if (r.legIdx >= n) r.legIdx = n - 1;
}

// ---------- the road: stamps ----------
const blankStamp = (site, floor, twist, ch) => ({ site, floor, twist: twist || '', ch: ch || 1, fin: 0, fast: 0, hard: 0, chili: 0, best: 0, n: 0, bank: 0 });
// chili pips cleared on a stamp (0 to 5). An old Hard medal counts as the first pip.
export const pipsOf = st => Math.min(p.chiliPips, Math.max(st && st.chili || 0, st && st.hard ? 1 : 0));
// the hit a pip adds when it is cleared (0 for most), and everything the chilies add now
export const chiliGain = n => p.chiliHitAt[n] || 0;
export function chiliHit(s) {
  let sum = 0;
  for (const st of Object.values(s.road.stamps)) { const n = pipsOf(st); for (let i = 1; i <= n; i++) sum += chiliGain(i); }
  return Math.min(p.chiliHitCap, sum);
}
// Stars for clearing pip n of a level for the first time
export const chiliPay = (floor, n, ch = 1) => Math.max(1, Math.round(worthAt(floor, ch) * (p.chiliStars[n - 1] || 0)));
// the chili count of a hard rule id ('chili3' -> 3), else 0
export const chiliOfRule = id => { const m = /^chili(\d)$/.exec(id || ''); return m ? +m[1] : 0; };
function stampOf(s, site, floor, twist, ch) {
  const k = siteKey(site, floor, twist, ch);
  return s.road.stamps[k] || (s.road.stamps[k] = blankStamp(site, floor, twist, ch));
}
export const roadStamps = s => Object.entries(s.road.stamps).map(([key, st]) => ({ key, ...st }));
export const siteFinished = (s, site) => Object.values(s.road.stamps).some(st => st.site === site && st.fin);
export const roadFinished = s => Object.values(s.road.stamps).filter(st => st.fin).length;

function makeRun(site, floor, twist, hard, ch) {
  ch = ch || 1;
  return { key: siteKey(site, floor, twist, ch), site, floor, twist: twist || '', ch, hard: hard || '', chili: chiliOfRule(hard), par: sitePar(floor, twist),
    clock: 0, started: false, done: false, time: 0, medals: { fin: 0, fast: 0, hard: 0 }, found: { chest: 0, ore: 0, bone: 0 }, paid: 0 };
}
// the run of the site in play (a save from before has none: the next Big Rock is its floor)
export function siteRun(s) {
  if (!s.run) {
    const floor = Math.max(p.baseFloor, (s.bossesDown + 1) * LAYER);
    s.run = makeRun(s.site, floor, '', s.contract || '');
    stampOf(s, s.site, floor, '').n++;
  }
  return s.run;
}
export const siteStamp = s => { const r = siteRun(s); return stampOf(s, r.site, r.floor, r.twist, r.ch); };

// Stars a move pays now (the label on the button)
export function starsFor(s) {
  const r = siteRun(s), best = Math.max(0, s.best), ch = chOf(r);
  if (!r.done) return Math.max(1, Math.min(Math.floor(p.leaveShare * worthAt(best, ch)), Math.floor(p.leaveCap * replayPay(r.floor, ch))));
  return best >= r.floor + p.deepFrom ? Math.floor(p.deepShare * Math.max(0, worthAt(best, ch) - worthAt(r.floor, ch))) : 0;
}

// ---------- medals and the finish ----------
function award(s, ev, st, key, medal, stars) {
  if (st[medal]) return 0;
  st[medal] = 1;
  s.stars += stars;
  siteRun(s).paid += stars;
  emit(s, ev, 'siteMedal', { key, medal, stars });
  return stars;
}
// the contracts feature calls this when the contract of this dig is won
export function siteMedal(s, medal, ev = () => {}) {
  const r = siteRun(s);
  if (medal !== 'hard' || r.medals.hard) return 0;
  r.medals.hard = 1;
  s.road.deal = s.road.free = null;                      // the dealt cards carry medals: deal them again
  return award(s, ev, stampOf(s, r.site, r.floor, r.twist, r.ch), r.key, 'hard', medalPay(r.floor, chOf(r)));
}

function finish(s, ev) {
  const r = siteRun(s);
  r.done = true; r.time = r.clock;
  s.road.deal = s.road.free = null;                      // cards dealt before this finish (a look from the leave button) show the road as it was
  const st = stampOf(s, r.site, r.floor, r.twist, r.ch), ch = chOf(r);
  const first = !st.fin, fast = r.time <= runPar(r);
  let stars = first ? firstPay(r.floor, roadKind(r.site, r.floor, r.twist, ch), ch) : replayPay(r.floor, ch);
  // a chili level: the first clear of a pip pays the pip's Stars and keeps its hit bonus for ever
  let chili = null;
  const cn = r.chili;
  if (cn) {
    if (cn > pipsOf(st) && s.contract === r.hard) {
      st.chili = cn; if (!st.hard) { st.hard = 1; r.medals.hard = 1; }      // pip 1 is the old Hard medal
      stars = chiliPay(r.floor, cn, ch);
      s.road.chiliHit = chiliHit(s);
      chili = { n: cn, stars, gain: chiliGain(cn), hit: s.road.chiliHit };
    }
    // the contract's rule ends with the Gate (s.contract is cleared). The extra hardness does not end here: it is read from the run
    // (run.chili), not from the contract, so ground and Rocks dug after the Gate stay as hard until the player leaves the site
    const C = CONTRACTS[s.contract];
    if (C && s.contract === r.hard) { if (C.end) C.end(s); s.contract = null; }
  }
  s.stars += stars; r.paid += stars;
  st.fin = 1; r.medals.fin = 1;
  st.best = st.best ? Math.min(st.best, r.time) : r.time;
  s.road.reach = Math.max(s.road.reach, r.floor);
  if (fast) { r.medals.fast = 1; stars += award(s, ev, st, r.key, 'fast', medalPay(r.floor, ch)); }
  if (chili) emit(s, ev, 'chiliWon', { key: r.key, site: r.site, floor: r.floor, ...chili, pips: pipsOf(st) });
  run('siteFinished', s);
  emit(s, ev, 'siteFinished', { key: r.key, site: r.site, floor: r.floor, twist: r.twist, ch, time: r.time, par: runPar(r), first, stars, fast,
    medals: { fin: 1, fast: st.fast, hard: st.hard }, found: { ...r.found }, stamps: roadFinished(s), chili: cn, chiliWon: !!chili });
}

// ---------- the deal ----------
// A card: { key, site, floor, twist, ch, hard, kind: 'fixed' | 'stretch' | 'new' | 'medal' | 'twist', par, medals, stars, medalStars }
function card(s, site, floor, twist, kind, hard, ch) {
  ch = ch || 1;
  const key = siteKey(site, floor, twist, ch), st = s.road.stamps[key];
  return { key, site, floor, twist: twist || '', ch, hard: hard || '', kind, par: sitePar(floor, twist),
    medals: { fin: st ? st.fin : 0, fast: st ? st.fast : 0, hard: st ? st.hard : 0 },
    stars: st && st.fin ? replayPay(floor, ch) : firstPay(floor, roadKind(site, floor, twist, ch), ch), medalStars: medalPay(floor, ch), hardRule: hardOf(site, floor), pips: st ? pipsOf(st) : 0 };
}
// the next chili of a finished level, as a card: { hard: 'chili3', chili: 3, chiliStars, chiliGain } or null (all five won, or a twist level)
export function chiliCard(s, key) {
  const st = s.road.stamps[key];
  if (!st || !st.fin || st.twist || !siteOpen(s, st.site)) return null;
  const n = pipsOf(st) + 1;
  if (n > p.chiliPips || !CONTRACTS['chili' + n]) return null;
  return { ...card(s, st.site, st.floor, st.twist, 'replay', 'chili' + n, chOf(st)), chili: n, stars: chiliPay(st.floor, n, chOf(st)), chiliGain: chiliGain(n) };
}
// the next level of the road, or null when the road is done: { site, floor, ch, level (1 to 40), of (40), n and chOf (the level
// in its chapter: "Chapter 2, level n of chOf"), tries }. A level is passed when it is finished; one of the first four also when
// it was tried twice. A save that had finished all twenty levels before chapter two existed gets level 21 here on its next move.
export function fixedNext(s) {
  for (let i = 0; i < ROAD.length; i++) {
    const f = ROAD[i], st = s.road.stamps[roadKey(f)];
    if (!st || (!st.fin && (i >= FIXED.length || st.n < 2))) { const L = levelOf(i + 1); return { ...f, level: i + 1, of: ROAD.length, n: L.n, chOf: L.of, tries: st ? st.n : 0 }; }
  }
  return null;
}
// where the player is on the road: { level, of, ch, n } (level is of + 1 when the road is done)
export function roadLevel(s) { const f = fixedNext(s), level = f ? f.level : ROAD.length + 1; return { ...levelOf(Math.min(level, ROAD.length)), level, of: ROAD.length }; }

export function dealCards(s) {
  if (s.road.deal && s.road.deal.length) return s.road.deal;
  const fx = fixedNext(s);
  if (fx) {
    const cards = [], seen = new Set(), stamps = roadStamps(s);
    const add = c => { if (c && !seen.has(c.key)) { seen.add(c.key); cards.push(c); } };
    add({ ...card(s, fx.site, fx.floor, '', 'fixed', '', fx.ch), level: fx.level, of: fx.of });
    // stuck at this level: side cards beside it, on floors already finished. Beside a chapter-two level they are chapter-two cards
    // (a medal, a twist, a replay of a level finished in chapter two, so they pay chapter-two Stars) when any is finished; else as in chapter one.
    if (fx.tries >= p.sideAfter) {
      const own = fx.ch > 1 ? stamps.filter(st => chOf(st) === fx.ch && st.fin && siteOpen(s, st.site)) : [];
      const pool = own.length ? own : stamps;
      const left = pool.filter(st => st.fin && siteOpen(s, st.site) && !st.fast);
      if (left.length) { left.sort((a, b) => (b.floor - a.floor) || (a.key < b.key ? -1 : 1)); const st = left[0]; add(card(s, st.site, st.floor, st.twist, 'medal', '', chOf(st))); }
      const plain = pool.filter(st => st.fin && !st.twist && siteOpen(s, st.site)).sort((a, b) => b.floor - a.floor);
      for (let tries = 0; tries < 8 && cards.length < 3 && plain.length; tries++) { const b = plain[0]; add(card(s, b.site, b.floor, pickOne(TWISTS), 'twist', '', own.length ? fx.ch : 1)); }
      if (own.length) for (const b of plain) if (cards.length < 3) add(card(s, b.site, b.floor, '', 'replay', '', fx.ch));
    }
    return (s.road.deal = cards.slice(0, 3));
  }
  return (s.road.deal = freeCards(s));
}
// The free deal (after the road, and beside chapter two): three cards, the player picks one. While chapter two runs, the map's
// Beyond crossroads (between level 20 and level 21) offers it as a side branch: `freeDeal` (cached in road.free; never dealt by
// dealCards, so the "Next town" button still deals the road level).
export function freeDeal(s) {
  if (s.road.free && s.road.free.length) return s.road.free;
  return (s.road.free = freeCards(s));
}
function freeCards(s) {
  const open = siteList(s), reach = Math.max(p.baseFloor, s.road.reach), cards = [], seen = new Set();
  const add = c => { if (c && !seen.has(c.key)) { seen.add(c.key); cards.push(c); } };
  const done = (site, floor, twist) => (s.road.stamps[siteKey(site, floor, twist)] || {}).fin;
  const stamps = roadStamps(s);
  // 1. the stretch: the next floor
  const next = Math.min(p.maxFloor, reach + LAYER);
  const sx = open.filter(id => !done(id, next, ''));
  if (sx.length) add(card(s, pickOne(sx), next, '', 'stretch'));
  // 2. a new place: a site never finished (the Museum's two, once open), a little under your best
  const fresh = open.filter(id => !siteFinished(s, id));
  if (fresh.length) add(card(s, pickOne(fresh), Math.max(p.baseFloor, reach - LAYER), '', 'new'));
  // 3. a medal still to win on a floor you have finished; a Hard one starts the dig under the contract
  const left = stamps.filter(st => st.fin && siteOpen(s, st.site) && (!st.fast || (!st.twist && pipsOf(st) < p.chiliPips)));
  if (left.length) {
    left.sort((a, b) => (a.floor - b.floor) || (a.key < b.key ? -1 : 1));
    const st = pickOne(left.slice(0, 3)), cc = st.twist ? null : chiliCard(s, st.key);
    add(cc && (st.fast || rnd() < 0.5) ? { ...cc, kind: 'medal' } : card(s, st.site, st.floor, st.twist, 'medal', '', chOf(st)));
  }
  // 4. a twist stacked on a floor you have finished
  const plain = stamps.filter(st => st.fin && !st.twist && siteOpen(s, st.site));
  for (let tries = 0; tries < 8 && cards.length < 3 && plain.length; tries++) { const b = pickOne(plain); add(card(s, b.site, b.floor, pickOne(TWISTS), 'twist')); }
  // fill: any open site at a floor you have reached
  for (let tries = 0; tries < 12 && cards.length < 3; tries++) add(card(s, pickOne(open), p.baseFloor + LAYER * Math.floor(rnd() * ((reach - p.baseFloor) / LAYER + 1)), '', 'medal'));
  return cards.slice(0, 3);
}

// patch: state to set on the new site before its ground is generated, e.g. { contract: 'noDiggers' }
// pick: a card of the deal ({ floor, twist, hard }); without one the site opens at its base floor
export function newSite(s, site, ev = () => {}, patch, pick) {
  if (!canNewSite(s) || !siteOpen(s, site)) return false;
  const gain = starsFor(s);
  s.stars += gain; s.sites += 1; s.site = site;
  const floor = pick ? pick.floor : p.baseFloor, twist = pick ? pick.twist : '';
  const hard = (patch && patch.contract) || (pick && pick.hard) || '';
  const run = makeRun(site, floor, twist, hard, pick ? pick.ch : 1);
  s.road.deal = s.road.free = null;
  reset(s, 'site', { ...(hard ? { contract: hard } : {}), ...patch, run });
  stampOf(s, site, floor, twist, run.ch).n++;
  emit(s, ev, 'newSite', { gain, stars: s.stars, key: run.key, chili: run.chili });
  return true;
}
// a finished level dug again, from the map: plain rules (for the Fast time) or under its hard rule (for the Hard medal).
// null for a level you have not finished, one that is not open, or a hard card for a level with no hard rule or whose Hard medal is won.
export function replayCard(s, key, hard = false) {
  const st = s.road.stamps[key];
  if (!st || !st.fin || !siteOpen(s, st.site)) return null;
  if (hard) return chiliCard(s, key);
  return card(s, st.site, st.floor, st.twist, 'replay', '', chOf(st));
}
// a replay card must be for a stamp that is finished; every other card is taken as it is
export const pickCard = (s, c, ev) => (c.kind === 'replay' && !replayCard(s, c.key, !!c.hard)) ? false : newSite(s, c.site, ev, undefined, c);

const twistOf = s => (s.run && s.run.twist) || '';
const chiliMul = (s, base) => { const r = s.run; return r && r.chili ? Math.pow(base, r.chili) : 1; };
// the road level a dig is on, a side card (a twist) included: its index in ROAD, or -1
const slotIndex = s => { const r = s.run; return r ? ROAD.findIndex(f => f.site === r.site && f.floor === r.floor && f.ch === chOf(r)) : -1; };
// chapter two: the ground, the Big Rocks and the Gate are sites.ch2Hp x ch2Hard[level] harder (a run off the road: ch2Hp)
const chMul = s => {
  if (!s.run || s.run.ch < 2) return 1;
  if (s.run.ch === 2) {
    const i = slotIndex(s);
    return p.ch2Hp * (i >= CHAPTER_LEN ? p.ch2Hard[i - CHAPTER_LEN] : 1);
  }
  const era = eraOf(s.run.ch);
  return Math.pow(1.5, era - 1);
};
export const groundMul = s => (twistOf(s) === 'heavy' ? p.twistHp : 1) * (roadProve(s) ? p.proveHp : 1) * chiliMul(s, p.chiliGround) * chMul(s);
// the Gate row of the level in play (-1 once it is broken). A save with no run yet: its next Big Rock (as siteRun).
export const gateRow = s => (s.run ? (s.run.done ? -1 : s.run.floor) : Math.max(p.baseFloor, (s.bossesDown + 1) * LAYER));
// the Gate size of the road level at index i (0-based into ROAD), or undefined for a lesson or no road level (the formula)
export function gateMulOf(i) {
  if (i < FIXED.length) return undefined;
  if (i < CHAPTER_LEN) return p.gateMul[i - FIXED.length];
  if (i < CHAPTER_LEN * 2) return p.gateMulCh2[i - CHAPTER_LEN];
  const slot = (i - FIXED.length) % p.gateMul.length;
  return p.gateMul[slot];
}

function migrateV2(s) {
  if (s.sites >= 14) s.seen.legacyBoard = true;      // the contracts board was open (it used to open at 14 New Sites): it stays open
  for (const k of Object.keys(s.unlocked || {})) {
    if (!k.startsWith('site:')) continue;
    const site = k.slice(5);
    if (!SITES[site] || Object.values(s.road.stamps).some(st => st.site === site)) continue;
    const fixed = FIXED.find(f => f.site === site), floor = fixed ? fixed.floor : p.baseFloor;
    s.road.stamps[siteKey(site, floor)] = { ...blankStamp(site, floor), n: 2 };      // visited (and so past its lesson), not finished
  }
}

export const sites = use({
  id: 'sites',
  params: p,
  legacy: { starCoin: 'starCoin', starPick: 'starPick' },
  strings,
  version: 3,
  // v2, a save from before the road: the sites it had visited are stamps with no medals.
  // v3, chapter two: every stamp and the run in play are chapter one (`ch: 1`; their keys do not change), and a deal dealt after
  // level 20 is dropped, so a save past the road is dealt level 21 at its next "Next town".
  migrate(s, from = 1) {
    if (from < 2) migrateV2(s);
    if (s.road && s.road.stamps) for (const st of Object.values(s.road.stamps)) if (st && typeof st === 'object' && !st.ch) st.ch = 1;
    if (s.run && !s.run.ch) s.run.ch = 1;
    if (s.road) s.road.deal = null;
  },
  state: {
    stars: { init: () => 0, survives: ['site', 'land'] },
    sites: { init: () => 0, survives: ['site', 'land'] },          // how many times you have moved
    site:  { init: () => 'dunes', perSite: true, survives: ['site'] },
    run:   { init: () => null, perSite: true },                    // this dig: floor, twist, hard rule, stopwatch, medals, finds
    road:  { init: () => ({ stamps: {}, deal: null, reach: 0 }), survives: ['site', 'land'] },
  },
  // multipliers on what the ground holds (tnt, ore, bone, chest) and on its hardness (hp).
  // A site may also carry `hooks` and `mods` (its own rules) and `blocks` (multipliers on a layer's block table).
  sites: {
    dunes: { at: 10, start: true, tnt: 1, ore: 1, bone: 1, chest: 1, hp: 1 },
    boom:  { at: 20, tnt: 3.2, ore: 1, bone: 1, chest: 1, hp: 1.25 },     // Powder Valley
    gold:  { at: 30, tnt: 1, ore: 2.2, bone: 1, chest: 0.8, hp: 1.35 },   // Golden Wadi
    bones: { at: 40, tnt: 1, ore: 1, bone: 4, chest: 1.6, hp: 1.2 },      // Valley of Beasts
  },
  mods: {
    coinMult:  { at: 20, fn: (v, s) => v * (1 + p.starCoin * s.stars) },
    pickPower: [{ at: 20, fn: (v, s) => v * (1 + p.starPick * s.stars) },
      { at: 22, fn: (v, s) => v * (1 + (s.road.chiliHit || 0)) }],      // what the chilies added for ever ("Your hit")
    crewPower: { at: 20, fn: (v, s) => v * (1 + p.starPick * s.stars) },
    sight: (v, s) => (twistOf(s) === 'dim' ? Math.min(v, p.twistSight) : v),
    groundHp: (v, s) => v * groundMul(s),
    // The Gate is yours (decision 13): while away nothing walks past the Gate of the level in play, on every kind of run
    awayPassable: (v, s, R) => v && R !== gateRow(s),
    // r = the row of the Rock. The Gate (the Rock at the run's floor row) of a road level has its own size (gateMul); the Big Rocks
    // before it use the normal size (times the prove factor on a prove level); a chili level makes every Rock harder still
    bossHp: (v, s, r) => {
      // a chapter-two+ side card (a twist) takes its slot's Gate; chapter one's side cards keep the formula, as before
      const g = s.run && r === s.run.floor ? gateMulOf(s.run.ch > 1 ? slotIndex(s) : roadIndex(s)) : undefined;
      return (g !== undefined ? v * g : roadProve(s) ? v * p.proveHp : v) * chiliMul(s, p.chiliRock) * chMul(s);
    },
  },
  hooks: {
    // the start kit comes after the Star perks (starshop resets at 100): the larger of the two wins
    reset: { at: 110, fn(s, name) {
      if (name !== 'site') return;
      s.seen.siteToast = false; s.seen.bossToast = true;
      // free seats (core grantFree): they add strength, the next purchase still costs the first price
      const best = Math.max(s.starBestPick || 0, s.up.pick || 0);
      if (p.kitPick > 0) { s.up.pick = Math.max(s.up.pick || 0, Math.floor(best * p.kitPick)); s.starWarm = Math.max(s.starWarm || 0, s.up.pick); }   // priced by the Warm Pick ramp
      // a free Rafeeq: a free seat, so the next one costs the first price and a no-Rafeeq contract pays nothing back
      for (let i = s.diggers.length; i < p.kitCrew; i++) s.diggers.push(newRafeeq(s, (COLS >> 1) + i));
      grantFree(s, 'crew', s.diggers.length);       // every Rafeeq standing here at the start is a free seat
    } },
    // a twist is stacked on the ground as it is made
    row(s, ctx) {
      const tw = twistOf(s);
      const hm = groundMul(s);
      if (hm !== 1) { for (const c of ctx.row) if (c && c.t !== 'boss') { c.hp = Math.round(c.hp * hm); c.max = c.hp; } }
      if (tw === 'barrels' && BLOCKS.tnt && ctx.r > 2 && ctx.r % p.twistBarrel === 0) ctx.put('tnt');
    },
    // the welcome-back card: the Rock the crew waits at is the Gate of this level
    awayEnd(s, out) { const g = gateRow(s); out.atGate = !!out.atBoss && g >= s.top && g <= s.top + VIEW_ROWS; },
    // the first hit starts the leg clock (and so the Fast medal's clock); a swing is a hit, and so is a block that breaks any other way
    swing(s) { if (s.run && s.run.started === false) s.run.started = true; },
    broke(s, b) {
      if (s.run && s.run.started === false) s.run.started = true;
      const f = s.run && s.run.found;
      if (!f) return;
      if (b.t === 'chest') f.chest++; else if (b.t === 'fossil') f.bone++; else if (b.B && b.B.ore) f.ore++;
    },
    // the stopwatch (attended seconds only) and the Gate
    step: { at: 690, fn(s, dt, ev) {
      const r = siteRun(s);
      if (r.done) return;
      if (r.started !== false) r.clock += dt;       // a fresh dig: the clock starts at the first hit (a run saved before this has no flag and runs)
      legSync(s, ev);
      if (s.bossesDown * LAYER >= r.floor) finish(s, ev);
    } },
  },
});
