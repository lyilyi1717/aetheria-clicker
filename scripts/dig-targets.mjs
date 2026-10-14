// The month sim's --assert targets, read from a dump (no new sim): one line per target and player.
// Usage: node scripts/dig-targets.mjs <dump.json>   (the dump of `node sim/proto/dig-month.mjs ... --dump <file>`)
// Rows that need what a dump does not keep (units: Foreman, Contracts) say "not in the dump".
import fs from 'node:fs';
import { TARGETS, TOL, roadFails, ROAD_LIMITS } from '../sim/proto/dig-month.mjs';

const runs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const med = a => { const b = a.slice().sort((x, y) => x - y), n = b.length; return n % 2 ? b[n >> 1] : (b[n / 2 - 1] + b[n / 2]) / 2; };
const players = [...new Set(runs.map(r => r.player))];
for (const p of players) {
  const rs = runs.filter(r => r.player === p).sort((a, b) => a.seed - b.seed);
  for (const [id, label, get, want, clock, head] of TARGETS) {
    const w = want[p];
    if (!w) continue;
    let vals;
    try { vals = rs.map(r => get({ ...r, units: {} })).filter(Boolean).map(v => (clock === 'a' ? v.a / 60 : v.r / 86400)); } catch { vals = null; }
    if (!vals || (!vals.length && /unit/.test(String(get)))) { console.log(`${p} | ${label} | not in the dump`); continue; }
    const m = vals.length ? med(vals) : NaN, enough = vals.length * 2 >= rs.length;
    const v = !enough ? 'MISS' : m >= w[0] && m <= w[1] ? 'ok' : m >= w[0] * (1 - TOL) && m <= w[1] * (1 + TOL) ? 'near' : 'MISS';
    const unit = clock === 'a' ? ' min' : ' days';
    console.log(`${p} | ${label} | target ${w[0]} to ${w[1]}${unit} | ${vals.map(x => x.toFixed(1)).join(' / ')} | ${v}${head ? '' : ' (not asserted)'}`);
  }
  if (ROAD_LIMITS.players.includes(p)) {
    const { fails, worst } = roadFails(rs, p);
    console.log(`${p} | road levels over ${ROAD_LIMITS.tries} tries or ${ROAD_LIMITS.between} other digs | ${worst.join(', ') || 'none'} | ${fails.length ? 'MISS: ' + fails.length : 'ok'}`);
  }
}
