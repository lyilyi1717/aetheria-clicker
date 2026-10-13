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
// THE ROAD (docs/dig-design.md, section 2). Twenty levels in a fixed order (ROAD): the four lessons, then every depth from
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
import { use, SITES, CONTRACTS, BLOCKS, emit } from '../../core/registry.js';
import { reset } from '../../core/state.js';
import { grantFree } from '../../core/rules.js';
import { starsAt, LAYER, COLS } from '../../core/grid.js';
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
  gateMul: [0.44, 8.87, 0.371, 7.49, 0.278, 7.99, 0.201, 6.23, 0.257, 9.43, 0.234, 9.45, 0.126, 6.37, 0.0645, 4.34],
  sideAfter: 2,                   // a level of the road tried this often and not finished: side cards are dealt beside it
  // the bottom
  baseFloor: 50,                  // where a Gate is when no card says (old saves, the contracts board)
  maxFloor: 300,                  // no Gate deeper than this is dealt
  // the stopwatch: par = parBase seconds at 50 m, x parGrow for every 25 m deeper, x parTwist with a twist
  parBase: 300, parGrow: 1.45, parTwist: 1.15,
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
export const ZONES = ['arabia', 'africa', 'eastasia', 'americas', 'europe'];
// Four levels in each land after home: two depths, each met to learn it and then to prove it (`prove`: harder).
const LAND = (zone, d) => [
  { site: 'dunes', floor: d, zone }, { site: 'boom', floor: d, zone, prove: true },
  { site: 'bones', floor: d + LAYER, zone }, { site: 'gold', floor: d + LAYER, zone, prove: true },
];
export const ROAD = [
  ...FIXED.map(f => ({ ...f, zone: 'arabia' })),
  ...LAND('africa', 100), ...LAND('eastasia', 150), ...LAND('americas', 200), ...LAND('europe', 250),
];
// the road level of the dig in play (index into ROAD), or -1 for a side level / after the road
export const roadIndex = s => { const r = s.run; return r && !r.twist ? ROAD.findIndex(f => f.site === r.site && f.floor === r.floor) : -1; };
// the zone of the dig in play: its road level's, else the zone of the deepest road level at or above its floor
export function roadZone(s) {
  const i = roadIndex(s);
  if (i >= 0) return ROAD[i].zone;
  const fl = (s.run && s.run.floor) || 0;
  let z = 'arabia';
  for (const f of ROAD) if (f.floor <= fl) z = f.zone;
  return z;
}
// this dig is the "prove it" level of its depth (no twist on it)
export const roadProve = s => { const r = s.run; return !!(r && !r.twist && ROAD.some(f => f.prove && f.site === r.site && f.floor === r.floor)); };
// stacked on a known floor for a harder version
export const TWISTS = ['heavy', 'dim', 'barrels'];
// the hard rule of a site: contracts in order, a deeper floor uses the next one
const HARD = { dunes: ['bare', 'rising', 'glass', 'blindAlone'], boom: ['tntOnly'], gold: ['dark', 'richLazy', 'feedRock'], bones: ['oneRelic', 'dry'] };

// a contract won at this site also lets you move on at once (the contracts feature sets `contractFree`)
export const canNewSite = s => s.bossesDown >= p.needBosses || !!s.contractFree;
export const siteOpen = (s, site) => !!SITES[site] && (!SITES[site].open || !!SITES[site].open(s));
export const siteList = s => Object.keys(SITES).filter(id => siteOpen(s, id));

// ---------- versions, keys, par, worth ----------
export const siteKey = (site, floor, twist) => site + ':' + floor + (twist ? ':' + twist : '');
export const sitePar = (floor, twist) => Math.round(p.parBase * Math.pow(p.parGrow, (floor - p.baseFloor) / LAYER) * (twist ? p.parTwist : 1));
export function hardOf(site, floor) {
  const l = HARD[site];
  if (!l || !CONTRACTS[l[0]]) return null;
  return l[Math.max(0, Math.min(l.length - 1, Math.round((floor - p.baseFloor) / LAYER)))];
}
// the road level at (site, floor) with no twist: 'learn', 'prove' or '' (not on the road)
const roadKind = (site, floor, twist) => { if (twist) return ''; const f = ROAD.find(x => x.site === site && x.floor === floor); return f ? (f.prove ? 'prove' : f.floor > FIXED[FIXED.length - 1].floor ? 'learn' : '') : ''; };
export const firstPay = (floor, kind = '') => Math.max(1, Math.round(starsAt(floor) * (kind === 'prove' ? p.provePay : kind === 'learn' ? p.learnPay : 1)));
export const medalPay = floor => Math.max(1, Math.round(p.medalShare * starsAt(floor)));
export const replayPay = floor => Math.max(1, Math.ceil(p.replayShare * starsAt(floor)));

// ---------- the countdown: legs ----------
// A leg runs from the start (or the last Big Rock) to the next Big Rock; the last one ends at the Gate. The par is split
// across the legs in proportion to their rows, in whole seconds that add up to the par exactly. Nothing expires: at 0 the
// clock only turns red and counts the seconds over, and the Fast medal rule (time <= par) is unchanged.
export function siteLegs(run) {
  const floor = Math.max(1, run.floor), n = Math.max(1, Math.ceil(floor / LAYER)), legs = [];
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const rows = Math.min(floor, (i + 1) * LAYER), end = i === n - 1 ? run.par : Math.round(run.par * rows / floor);
    legs.push({ rows: rows - i * LAYER, len: end - prev, end }); prev = end;
  }
  return legs;
}
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
export const runPar = r => r.par + (r.extra || 0);
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
const blankStamp = (site, floor, twist) => ({ site, floor, twist: twist || '', fin: 0, fast: 0, hard: 0, best: 0, n: 0, bank: 0 });
function stampOf(s, site, floor, twist) {
  const k = siteKey(site, floor, twist);
  return s.road.stamps[k] || (s.road.stamps[k] = blankStamp(site, floor, twist));
}
export const roadStamps = s => Object.entries(s.road.stamps).map(([key, st]) => ({ key, ...st }));
export const siteFinished = (s, site) => Object.values(s.road.stamps).some(st => st.site === site && st.fin);
export const roadFinished = s => Object.values(s.road.stamps).filter(st => st.fin).length;

function makeRun(site, floor, twist, hard) {
  return { key: siteKey(site, floor, twist), site, floor, twist: twist || '', hard: hard || '', par: sitePar(floor, twist),
    clock: 0, done: false, time: 0, medals: { fin: 0, fast: 0, hard: 0 }, found: { chest: 0, ore: 0, bone: 0 }, paid: 0 };
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
export const siteStamp = s => { const r = siteRun(s); return stampOf(s, r.site, r.floor, r.twist); };

// Stars a move pays now (the label on the button)
export function starsFor(s) {
  const r = siteRun(s), best = Math.max(0, s.best);
  if (!r.done) return Math.max(1, Math.min(Math.floor(p.leaveShare * starsAt(best)), Math.floor(p.leaveCap * replayPay(r.floor))));
  return best >= r.floor + p.deepFrom ? Math.floor(p.deepShare * Math.max(0, starsAt(best) - starsAt(r.floor))) : 0;
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
  s.road.deal = null;                      // the dealt cards carry medals: deal them again
  return award(s, ev, stampOf(s, r.site, r.floor, r.twist), r.key, 'hard', medalPay(r.floor));
}

function finish(s, ev) {
  const r = siteRun(s);
  r.done = true; r.time = r.clock;
  s.road.deal = null;                      // cards dealt before this finish (a look from the leave button) show the road as it was
  const st = stampOf(s, r.site, r.floor, r.twist);
  const first = !st.fin, fast = r.time <= runPar(r);
  let stars = first ? firstPay(r.floor, roadKind(r.site, r.floor, r.twist)) : replayPay(r.floor);
  s.stars += stars; r.paid += stars;
  st.fin = 1; r.medals.fin = 1;
  st.best = st.best ? Math.min(st.best, r.time) : r.time;
  s.road.reach = Math.max(s.road.reach, r.floor);
  if (fast) { r.medals.fast = 1; stars += award(s, ev, st, r.key, 'fast', medalPay(r.floor)); }
  emit(s, ev, 'siteFinished', { key: r.key, site: r.site, floor: r.floor, twist: r.twist, time: r.time, par: runPar(r), first, stars, fast,
    medals: { fin: 1, fast: st.fast, hard: st.hard }, found: { ...r.found }, stamps: roadFinished(s) });
}

// ---------- the deal ----------
// A card: { key, site, floor, twist, hard, kind: 'fixed' | 'stretch' | 'new' | 'medal' | 'twist', par, medals, stars, medalStars }
function card(s, site, floor, twist, kind, hard) {
  const st = s.road.stamps[siteKey(site, floor, twist)];
  return { key: siteKey(site, floor, twist), site, floor, twist: twist || '', hard: hard || '', kind, par: sitePar(floor, twist),
    medals: { fin: st ? st.fin : 0, fast: st ? st.fast : 0, hard: st ? st.hard : 0 },
    stars: st && st.fin ? replayPay(floor) : firstPay(floor, roadKind(site, floor, twist)), medalStars: medalPay(floor), hardRule: hardOf(site, floor) };
}
// the next level of the road, or null when the road is done: { site, floor, level (1 ...), of, tries }.
// A level is passed when it is finished; one of the first four also when it was tried twice.
export function fixedNext(s) {
  for (let i = 0; i < ROAD.length; i++) {
    const f = ROAD[i], st = s.road.stamps[siteKey(f.site, f.floor)];
    if (!st || (!st.fin && (i >= FIXED.length || st.n < 2))) return { ...f, level: i + 1, of: ROAD.length, tries: st ? st.n : 0 };
  }
  return null;
}
// where the player is on the road: { level, of } (level is of + 1 when the road is done)
export function roadLevel(s) { const f = fixedNext(s); return { level: f ? f.level : ROAD.length + 1, of: ROAD.length }; }

export function dealCards(s) {
  if (s.road.deal && s.road.deal.length) return s.road.deal;
  const fx = fixedNext(s);
  const open = siteList(s), reach = Math.max(p.baseFloor, s.road.reach), cards = [], seen = new Set();
  const add = c => { if (c && !seen.has(c.key)) { seen.add(c.key); cards.push(c); } };
  const done = (site, floor, twist) => (s.road.stamps[siteKey(site, floor, twist)] || {}).fin;
  const stamps = roadStamps(s);
  if (fx) {
    add({ ...card(s, fx.site, fx.floor, '', 'fixed'), level: fx.level, of: fx.of });
    // stuck at this level: side cards beside it, on floors already finished
    if (fx.tries >= p.sideAfter) {
      const left = stamps.filter(st => st.fin && siteOpen(s, st.site) && !st.fast);
      if (left.length) { left.sort((a, b) => (b.floor - a.floor) || (a.key < b.key ? -1 : 1)); const st = left[0]; add(card(s, st.site, st.floor, st.twist, 'medal')); }
      const plain = stamps.filter(st => st.fin && !st.twist && siteOpen(s, st.site)).sort((a, b) => b.floor - a.floor);
      for (let tries = 0; tries < 8 && cards.length < 3 && plain.length; tries++) { const b = plain[0]; add(card(s, b.site, b.floor, pickOne(TWISTS), 'twist')); }
    }
    return (s.road.deal = cards.slice(0, 3));
  }
  // 1. the stretch: the next floor
  const next = Math.min(p.maxFloor, reach + LAYER);
  const sx = open.filter(id => !done(id, next, ''));
  if (sx.length) add(card(s, pickOne(sx), next, '', 'stretch'));
  // 2. a new place: a site never finished (the Museum's two, once open), a little under your best
  const fresh = open.filter(id => !siteFinished(s, id));
  if (fresh.length) add(card(s, pickOne(fresh), Math.max(p.baseFloor, reach - LAYER), '', 'new'));
  // 3. a medal still to win on a floor you have finished; a Hard one starts the dig under the contract
  const left = stamps.filter(st => st.fin && siteOpen(s, st.site) && (!st.fast || (!st.hard && hardOf(st.site, st.floor))));
  if (left.length) {
    left.sort((a, b) => (a.floor - b.floor) || (a.key < b.key ? -1 : 1));
    const st = pickOne(left.slice(0, 3)), hr = hardOf(st.site, st.floor);
    add(card(s, st.site, st.floor, st.twist, 'medal', !st.hard && hr && (st.fast || rnd() < 0.5) ? hr : ''));
  }
  // 4. a twist stacked on a floor you have finished
  const plain = stamps.filter(st => st.fin && !st.twist && siteOpen(s, st.site));
  for (let tries = 0; tries < 8 && cards.length < 3 && plain.length; tries++) { const b = pickOne(plain); add(card(s, b.site, b.floor, pickOne(TWISTS), 'twist')); }
  // fill: any open site at a floor you have reached
  for (let tries = 0; tries < 12 && cards.length < 3; tries++) add(card(s, pickOne(open), p.baseFloor + LAYER * Math.floor(rnd() * ((reach - p.baseFloor) / LAYER + 1)), '', 'medal'));
  return (s.road.deal = cards.slice(0, 3));
}

// patch: state to set on the new site before its ground is generated, e.g. { contract: 'noDiggers' }
// pick: a card of the deal ({ floor, twist, hard }); without one the site opens at its base floor
export function newSite(s, site, ev = () => {}, patch, pick) {
  if (!canNewSite(s) || !siteOpen(s, site)) return false;
  const gain = starsFor(s);
  s.stars += gain; s.sites += 1; s.site = site;
  const floor = pick ? pick.floor : p.baseFloor, twist = pick ? pick.twist : '';
  const hard = (patch && patch.contract) || (pick && pick.hard) || '';
  const run = makeRun(site, floor, twist, hard);
  s.road.deal = null;
  reset(s, 'site', { ...(hard ? { contract: hard } : {}), ...patch, run });
  stampOf(s, site, floor, twist).n++;
  emit(s, ev, 'newSite', { gain, stars: s.stars, key: run.key });
  return true;
}
// a finished level dug again, from the map: plain rules (for the Fast time) or under its hard rule (for the Hard medal).
// null for a level you have not finished, one that is not open, or a hard card for a level with no hard rule or whose Hard medal is won.
export function replayCard(s, key, hard = false) {
  const st = s.road.stamps[key];
  if (!st || !st.fin || !siteOpen(s, st.site)) return null;
  const hr = hard ? hardOf(st.site, st.floor) : '';
  if (hard && (!hr || st.hard)) return null;
  return card(s, st.site, st.floor, st.twist, 'replay', hr);
}
// a replay card must be for a stamp that is finished; every other card is taken as it is
export const pickCard = (s, c, ev) => (c.kind === 'replay' && !replayCard(s, c.key, !!c.hard)) ? false : newSite(s, c.site, ev, undefined, c);

const twistOf = s => (s.run && s.run.twist) || '';

export const sites = use({
  id: 'sites',
  params: p,
  legacy: { starCoin: 'starCoin', starPick: 'starPick' },
  strings,
  version: 2,
  // a save from before: the sites it had visited are stamps with no medals
  migrate(s) {
    if (s.sites >= 14) s.seen.legacyBoard = true;      // the contracts board was open (it used to open at 14 New Sites): it stays open
    for (const k of Object.keys(s.unlocked || {})) {
      if (!k.startsWith('site:')) continue;
      const site = k.slice(5);
      if (!SITES[site] || Object.values(s.road.stamps).some(st => st.site === site)) continue;
      const fixed = FIXED.find(f => f.site === site), floor = fixed ? fixed.floor : p.baseFloor;
      s.road.stamps[siteKey(site, floor)] = { ...blankStamp(site, floor), n: 2 };      // visited (and so past its lesson), not finished
    }
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
    pickPower: { at: 20, fn: (v, s) => v * (1 + p.starPick * s.stars) },
    crewPower: { at: 20, fn: (v, s) => v * (1 + p.starPick * s.stars) },
    sight: (v, s) => (twistOf(s) === 'dim' ? Math.min(v, p.twistSight) : v),
    bossHp: (v, s) => { const i = roadIndex(s) - FIXED.length; return i >= 0 && p.gateMul[i] !== undefined ? v * p.gateMul[i] : roadProve(s) ? v * p.proveHp : v; },   // the Gate of a road level has its own size (gateMul)
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
      const hm = (tw === 'heavy' ? p.twistHp : 1) * (roadProve(s) ? p.proveHp : 1);
      if (hm !== 1) { for (const c of ctx.row) if (c && c.t !== 'boss') { c.hp = Math.round(c.hp * hm); c.max = c.hp; } }
      if (tw === 'barrels' && BLOCKS.tnt && ctx.r > 2 && ctx.r % p.twistBarrel === 0) ctx.put('tnt');
    },
    broke(s, b) {
      const f = s.run && s.run.found;
      if (!f) return;
      if (b.t === 'chest') f.chest++; else if (b.t === 'fossil') f.bone++; else if (b.B && b.B.ore) f.ore++;
    },
    // the stopwatch (attended seconds only) and the Gate
    step: { at: 690, fn(s, dt, ev) {
      const r = siteRun(s);
      if (r.done) return;
      r.clock += dt;
      legSync(s, ev);
      if (s.bossesDown * LAYER >= r.floor) finish(s, ev);
    } },
  },
});
