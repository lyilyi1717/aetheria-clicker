// Dig feature: time away. Whatever works while the page is closed (the `awayDps` mod: the crew)
// is spent row by row on the ground below. Never a loss: the cap only stops the gain.
//   awayStop(s, r, out)  -> a hook returns true to end it early (the crew waits at a Big Rock)
//   awayRow(s, r, out)   -> what a passed row adds to `out` (chests)
//   awayWalk(s, out)     -> at a Big Rock with time left: spend `out.budget` (damage still unspent) walking on
//                           past Rocks the player has beaten; lower out.budget, add to out.coins/metres.
//                           Time away is spent once: walking on, then the sieve gets only what is left.
//   awayEnd(s, out, ev)  -> settle what was found; `out` is what the welcome-back card shows
//                           (sites sets out.atGate: the Rock they wait at is the Gate of the level in play)
// A row costs groundHp(s, r) (core/grid.js) per block: the same hardness the row has while you watch.
// The Gate of the level in play is never passed while away (sites, `awayPassable`): a level never finishes away.
// Timed crew boosts (the tea rush, a crew wish) count only for the seconds they have left (see awayRate).
// When the crew has reached a Big Rock and still has time, it does not stop: it sieves the rubble
// beside the Rock (coins, bones, now and then a chest). The Rock itself stays the player's fight.
// The sieve slows down gently the longer you are away (tau), up to the 12 hour cap.
import { use, run, PARAMS, fold, pollUnlocks, BLOCKS } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { COLS, groundHp, dirtVal, shiftRow } from '../../core/grid.js';
import { coinMult } from '../../core/rules.js';
import strings from './strings.js';

const p = {
  capHours: 12,
  minSeconds: 30,
  maxRows: 400,
  rowCost: 1.9,     // a row costs this many times its dirt hp per block
  rowPay: 2.2,      // and pays this many times its dirt coins per block
  // at the Big Rock: the sieve
  sieveShare: 1.2,  // coins per crew damage while sieving, in times the digging rate (rubble is rich)
  tau: 21600,       // seconds: sieve time counts in full at first, then less, towards tau (6 h)
  bonesPerHour: 1.2,
  chestsPerHour: 0.5,
  sieveChestMax: 4, // chests the sieve can turn up in one time away
  // the card
  bigSeconds: 900,  // away longer than this gets the card; less is one small line
  jokes: 8,         // how many funny lines away_joke_0.. there are
};

// time that counts for the sieve: leftover seconds, thinning out gently
export const awaySieveTime = left => p.tau * (1 - Math.exp(-left / p.tau));

// The crew's damage per second while away, and the state left behind. A boost that lasts a while
// (a crew wish: a number of blocks) counts only until it runs out; the tea job is averaged over its
// break and rush, so it is never a free rush for the whole absence.
function awayRate(s, secs) {
  const wb = s.wingBoon, wished = wb && wb.left > 0 && wb.kind === 'crew' ? wb.left : 0;
  const tea = !!(s.foremanHere && s.crewJob === 'tea');
  const F = PARAMS.foreman;
  const avg = tea && F ? F.teaRush * F.teaMult / (fold('teaBreak', s, F.teaBreak) + F.teaRush) : 1;
  const T = s.foreTea, ph = T && T.ph;
  if (tea) T.ph = 'break';                                  // read the plain rate, then scale it
  let hot = fold('awayDps', s, 0) * avg, plain = hot;
  if (wished) { wb.left = 0; plain = fold('awayDps', s, 0) * avg; wb.left = wished; }
  if (tea) { T.ph = 'break'; T.t = 0; } else if (T && ph) T.ph = ph;
  let boosted = 0;
  if (wished && hot > plain) {
    const bps = s.diggers.length * fold('crewRate', s, PARAMS.diggers.rate);   // blocks the crew hits per second
    const need = bps > 0 ? wished / bps : 0;
    boosted = Math.min(need, secs);
    wb.left = need > boosted ? Math.floor(wished * (1 - boosted / need)) : 0;   // used up while away
  }
  return plain + (hot - plain) * boosted / secs;
}
const count = x => Math.floor(x + rnd());

export function settleAway(s, seconds, ev = () => {}) {
  const secs = Math.min(seconds, p.capHours * 3600);
  const out = { seconds: secs, coins: 0, metres: 0, chests: 0, atBoss: false,
    sieveSeconds: 0, sieveCoins: 0, bones: 0, newBones: 0, boneCoins: 0, sieveChests: 0, joke: 0, capped: seconds > secs };
  if (!(fold('awayDps', s, 0) > 0) || secs < p.minSeconds) return out;
  const dps = awayRate(s, secs);
  let budget = dps * secs;
  let r = s.top;
  let rows = 0;
  while (rows < p.maxRows) {
    if (run('awayStop', s, r, out)) break;
    const cost = groundHp(s, r) * COLS * p.rowCost;           // the ground as it is in this dig (prove, chili, chapter two)
    if (budget < cost) break;
    budget -= cost;
    out.coins += dirtVal(r) * COLS * p.rowPay * coinMult(s);
    run('awayRow', s, r, out);
    shiftRow(s);
    r++; rows++;
  }
  out.metres = rows;
  // at a Big Rock with time to spare: first walk on past Rocks already beaten (a Star perk), then sieve
  if (out.atBoss && budget > 0) {
    out.budget = budget;
    run('awayWalk', s, out);
    budget = out.budget; delete out.budget;
    r = s.top;
  }
  // the Rafeeqs stand at the Big Rock with time to spare: they sieve
  if (out.atBoss && budget > 0) {
    const left = budget / dps;
    const eff = awaySieveTime(left);
    out.sieveSeconds = Math.round(left);
    out.sieveCoins = dps * eff * (dirtVal(r) * p.rowPay / (groundHp(s, r) * p.rowCost)) * p.sieveShare * coinMult(s);
    out.coins += out.sieveCoins;
    out.sieveChests = Math.min(p.sieveChestMax, count(eff / 3600 * p.chestsPerHour * fold('chestChance', s, 1)));
  }
  out.coins = Math.round(out.coins);
  out.sieveCoins = Math.round(out.sieveCoins);
  s.coins += out.coins; s.total += out.coins;
  if (s.top + 1 > s.best) s.best = s.top + 1;
  if (out.sieveSeconds && BLOCKS.fossil) {
    const nb = count(awaySieveTime(out.sieveSeconds) / 3600 * p.bonesPerHour);
    const before = s.coins;
    const seen = (kind, d) => { if (kind === 'fossil') { out.bones++; if (d.isNew) out.newBones++; } else ev(kind, d); };
    for (let i = 0; i < nb; i++) BLOCKS.fossil.broke(s, { r: s.top, c: i % COLS, cell: null, t: 'fossil', B: BLOCKS.fossil, src: 'crew', byHand: false, chain: 0, info: {}, coins: 0 }, seen);
    out.boneCoins = Math.round(s.coins - before);
    out.coins += out.boneCoins;
  }
  out.joke = Math.floor(rnd() * p.jokes);
  run('awayEnd', s, out, ev);
  if (out.sieveChests) { s.chests += out.sieveChests; out.chests += out.sieveChests; }   // after the chest feature's own cap
  pollUnlocks(s, ev);
  return out;
}

export const away = use({
  id: 'away',
  params: p,
  legacy: { offlineCapHours: 'capHours' },
  strings,
});
