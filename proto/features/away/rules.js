// Dig feature: time away. Whatever works while the page is closed (the `awayDps` mod: the crew)
// is spent row by row on the ground below. Never a loss: the cap only stops the gain.
//   awayStop(s, r, out)  -> a hook returns true to end it early (the crew waits at a Big Rock)
//   awayRow(s, r, out)   -> what a passed row adds to `out` (chests)
//   awayEnd(s, out, ev)  -> settle what was found; `out` is what the welcome-back card shows
import { use, run, fold, pollUnlocks } from '../../core/registry.js';
import { COLS, dirtHp, dirtVal, shiftRow } from '../../core/grid.js';
import { coinMult } from '../../core/rules.js';
import strings from './strings.js';

const p = {
  capHours: 12,
  minSeconds: 30,
  maxRows: 400,
  rowCost: 1.9,     // a row costs this many times its dirt hp per block
  rowPay: 2.2,      // and pays this many times its dirt coins per block
};

export function settleAway(s, seconds, ev = () => {}) {
  const secs = Math.min(seconds, p.capHours * 3600);
  const out = { seconds: secs, coins: 0, metres: 0, chests: 0, atBoss: false };
  const dps = fold('awayDps', s, 0);
  if (!(dps > 0) || secs < p.minSeconds) return out;
  let budget = dps * secs;
  let r = s.top;
  let rows = 0;
  while (rows < p.maxRows) {
    if (run('awayStop', s, r, out)) break;
    const cost = dirtHp(r) * COLS * p.rowCost;
    if (budget < cost) break;
    budget -= cost;
    out.coins += dirtVal(r) * COLS * p.rowPay * coinMult(s);
    run('awayRow', s, r, out);
    shiftRow(s);
    r++; rows++;
  }
  out.coins = Math.round(out.coins);
  out.metres = rows;
  s.coins += out.coins; s.total += out.coins;
  if (s.top + 1 > s.best) s.best = s.top + 1;
  run('awayEnd', s, out, ev);
  pollUnlocks(s, ev);
  return out;
}

export const away = use({
  id: 'away',
  params: p,
  legacy: { offlineCapHours: 'capHours' },
  strings,
});
