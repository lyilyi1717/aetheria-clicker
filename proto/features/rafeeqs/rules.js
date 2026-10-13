// Dig feature: Rafeeq seats. Seat number i is the i-th Rafeeq at any site (the index in s.diggers). A seat has a name, a
// trait (flavour only, no number ever reads it), a friend, a rival and a life record. The seat outlives New Site and Land;
// the body on the ground is rebuilt each level. Nothing here changes strength, pay or the dig.
//
// FOR OTHER FEATURES (all pure, safe before the seat exists: they fall back):
//   rafeeqName(s, i) -> string        rafeeqTrait(s, i) -> 'eager' | ...      rafeeqPair(s, i) -> { friend, rival } (seats or -1)
//   rafeeqStats(s, i) -> { level: { broke, coins }, life: { broke, coins, best, levels } }   (life includes this level)
//   rafeeqBest(s) -> the seat who brought the most coins this level, or -1      rafeeqRename(s, i, text) -> the name now
import { use } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { t } from '../../core/strings.js';
import strings from './strings.js';
import { RAFEEQ_NICKS, nickById } from './names.js';
export { RAFEEQ_NICKS };
export const RAFEEQ_NAMES = RAFEEQ_NICKS.map(n => n.id);
export const RAFEEQ_TRAITS = ['eager', 'sleepy', 'joker', 'careful', 'proud', 'hungry'];
const p = { maxName: 12 };

const blankLife = () => ({ broke: 0, coins: 0, best: null, levels: 0 });
const pick = list => list[Math.floor(rnd() * list.length)];
// a seat the player renamed by hand: his name is no longer the nickname he was dealt
const handNamed = x => !!x && x.name !== x.given;

// Deals a nickname to every seat in `todo` (seat numbers), no two alike, none equal to a name already in use; prefers a
// base trait nobody has yet, so a small crew shows several traits.
function deal(seats, todo) {
  const used = new Set();
  seats.forEach((x, i) => { if (!todo.includes(i)) { used.add(String(x.name).toLowerCase()); used.add(x.given); } });
  const bases = new Set(seats.filter((x, i) => !todo.includes(i)).map(x => x.trait));
  let pool = RAFEEQ_NICKS.filter(n => !used.has(n.id));
  for (const i of todo) {
    if (!pool.length) pool = RAFEEQ_NICKS.slice();
    const fresh = pool.filter(n => !bases.has(n.base));
    const n = pick(fresh.length ? fresh : pool);
    pool = pool.filter(q => q !== n);
    bases.add(n.base);
    seats[i].given = n.id; seats[i].name = n.id; seats[i].trait = n.base;
  }
}
// rivals: a Proud one with the Joker or another Proud one (nobody else has one)
function rivalFor(seats, i) {
  const seat = seats[i], trait = seat.trait, fits = x => (x === 'proud') || x === 'joker';
  if (fits(trait) && (trait === 'proud' || seats.slice(0, i).some(x => x.trait === 'proud'))) {
    const j = seats.findIndex((x, k) => k < i && x.rival < 0 && k !== seat.friend && (trait === 'proud' ? fits(x.trait) : x.trait === 'proud'));
    if (j >= 0) { seat.rival = j; seats[j].rival = i; }
  }
}
function addSeat(s) {
  const seats = s.rafeeqSeats, i = seats.length;
  const seat = { name: '', given: '', trait: 'eager', friend: i > 0 ? i - 1 : -1, rival: -1, life: blankLife() };
  if (i > 0 && seats[i - 1].friend < 0) seats[i - 1].friend = i;
  seats.push(seat);
  deal(seats, [i]);
  rivalFor(seats, i);
}
// a new site: every seat the player did not rename gets a new nickname (old first names are replaced here too)
export function rafeeqRedeal(s) {
  const seats = s.rafeeqSeats || [];
  const todo = seats.map((x, i) => i).filter(i => !handNamed(seats[i]));
  if (!todo.length) return;
  deal(seats, todo);
  seats.forEach(x => { x.rival = -1; });
  seats.forEach((x, i) => rivalFor(seats, i));
}
// his own nickname (data) while he still carries it; null for a renamed seat or an old first name
export function rafeeqNick(s, i) { const x = seatOf(s, i); return x && !handNamed(x) ? nickById(x.given) : null; }
// the line shown for his trait: his own when he has a nickname, else that of his base trait
export function rafeeqLine(s, i) { const n = rafeeqNick(s, i); return n ? t('nk_line_' + n.id) : t('rq_line_' + rafeeqTrait(s, i)); }

export function rafeeqSeats(s) { if (!s.rafeeqSeats) s.rafeeqSeats = []; while (s.rafeeqSeats.length < s.diggers.length) addSeat(s); return s.rafeeqSeats; }
const seatOf = (s, i) => (s.rafeeqSeats || [])[i] || null;
const diggerOf = (s, i) => s.diggers[i] || null;

export function rafeeqName(s, i) { const x = seatOf(s, i); return x && x.name ? x.name : t('crew_name', { n: i + 1 }); }
export function rafeeqTrait(s, i) { const x = seatOf(s, i); return x ? x.trait : RAFEEQ_TRAITS[i % RAFEEQ_TRAITS.length]; }
export function rafeeqPair(s, i) { const x = seatOf(s, i); return x ? { friend: x.friend, rival: x.rival } : { friend: -1, rival: -1 }; }

export function rafeeqRename(s, i, text) {
  const x = seatOf(s, i);
  if (!x) return rafeeqName(s, i);
  const clean = Array.from(String(text == null ? '' : text).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, p.maxName).join('').trim();
  x.name = clean || x.given;   // (empty brings his nickname back)
  return x.name;
}

export function rafeeqStats(s, i) {
  const x = seatOf(s, i), d = diggerOf(s, i);
  const level = { broke: d ? d.broke || 0 : 0, coins: d ? Math.round(d.coins || 0) : 0 };
  const L = x ? x.life : blankLife();
  const best = L.best && d && d.bestFind && d.bestFind.coins > L.best.coins ? d.bestFind : L.best || (d && d.bestFind) || null;
  return { level, life: { broke: L.broke + level.broke, coins: L.coins + level.coins, best, levels: L.levels } };
}

// who brought the most coins this level (a tie goes to the lower seat); -1 when nobody brought any
export function rafeeqBest(s) {
  let best = -1, top = 0;
  s.diggers.forEach((d, i) => { const c = d.coins || 0; if (c > top) { top = c; best = i; } });
  return best;
}

export const rafeeqs = use({
  id: 'rafeeqs', params: p, strings,
  state: { rafeeqSeats: { init: () => [], survives: ['site', 'land'] } },
  hooks: {
    // seats fill themselves whenever there are more Rafeeqs than seats: the shop, a Star perk or a start kit all count
    step: { at: 610, fn(s) { rafeeqSeats(s); } },
    // his best find: the richest block he broke this level (the digger whose target this block was)
    broke(s, b) {
      if (b.src !== 'crew' || !(b.coins > 0)) return;
      const d = s.diggers.find(x => x.tr === b.r && x.tc === b.c);
      if (d && (!d.bestFind || b.coins > d.bestFind.coins)) d.bestFind = { kind: b.t, coins: Math.round(b.coins) };
    },
    // before the level is wiped: bank each Rafeeq's totals into his seat
    // a new site or land: the crew is dealt new nicknames (hand-given names stay)
    reset(s, name) { if (name === 'site' || name === 'land') rafeeqRedeal(s); },
    resetting(s, name) {
      if (!s.rafeeqSeats) return;
      const finished = !!(s.run && s.run.done);
      s.diggers.forEach((d, i) => {
        const x = s.rafeeqSeats[i];
        if (!x) return;
        x.life.broke += d.broke || 0;
        x.life.coins += Math.round(d.coins || 0);
        if (d.bestFind && (!x.life.best || d.bestFind.coins > x.life.best.coins)) x.life.best = { ...d.bestFind };
        if (finished) x.life.levels++;
      });
    },
  },
});

// Named lines for the welcome-back card, from what really happened: up to three, and the joke with a real name when it fits.
// The total is split by seat order (nothing is simulated per Rafeeq). Returns { lines: [text], joke: text | '' }.
export function rafeeqAway(s, out) {
  const n = s.diggers.length, res = { lines: [], joke: '' };
  if (!n) return res;
  rafeeqSeats(s);                                   // the page may ask before the first step
  const who = k => rafeeqName(s, k % n);
  if (out.metres > 0) res.lines.push(t('rq_away_deep', { name: who(0), n: out.metres }));
  if (out.sieveSeconds >= 60) res.lines.push(t('rq_away_sieve', { name: who(res.lines.length) }));
  if (out.chests > 0) res.lines.push(out.chests === 1 ? t('rq_away_chest1', { name: who(res.lines.length) }) : t('rq_away_chests', { name: who(res.lines.length), n: out.chests }));
  res.lines = res.lines.slice(0, 3);
  const sleepy = s.diggers.findIndex((d, i) => rafeeqTrait(s, i) === 'sleepy');
  if (out.joke === 5 && sleepy >= 0) res.joke = t('rq_joke_nap', { name: rafeeqName(s, sleepy) });
  else if (out.joke === 0) res.joke = t('rq_joke_sandal', { name: who(n - 1) });
  else if (out.joke === 3) res.joke = t('rq_joke_habibi', { name: who(1) });
  return res;
}
