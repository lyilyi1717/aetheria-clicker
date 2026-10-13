// Real players against the sims. Reads the aggregates the telemetry functions return (supabase/dig_telemetry.sql) with the
// public key and prints short tables per road level.
//   node sim/proto/player-stats.mjs                      overview + per level: players, tries, attended minutes, days, quit share
//   node sim/proto/player-stats.mjs --choices            what was bought and picked
//   node sim/proto/player-stats.mjs --pace               how fast people dig
//   node sim/proto/player-stats.mjs --vs dump.json       sim columns beside the real ones (dump: dig-month.mjs --dump dump.json)
// Only reads. Needs the SQL applied; says so when it is not.
import fs from 'node:fs';

const URL_ = 'https://hutjfgbjjagqdjjeszqj.supabase.co';
const KEY = 'sb_publishable_mxWGt9Ul4V2q4Wb0DEmV9Q_UhBH6T-f';
const argv = process.argv.slice(2);
const flag = n => argv.includes('--' + n);
const arg = n => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };

async function rpc(name) {
  const res = await fetch(`${URL_}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: '{}' });
  if (!res.ok) { const t = await res.text(); throw new Error(`${name}: ${res.status} ${t.slice(0, 160)}${res.status === 404 ? ' (is supabase/dig_telemetry.sql applied?)' : ''}`); }
  return res.json();
}

const med = a => { const v = a.filter(Number.isFinite).sort((x, y) => x - y); return v.length ? (v[(v.length - 1) >> 1] + v[v.length >> 1]) / 2 : NaN; };
const q75 = a => { const v = a.filter(Number.isFinite).sort((x, y) => x - y); return v.length ? v[Math.min(v.length - 1, Math.floor(0.75 * v.length))] : NaN; };
const f = (x, d = 1) => (x === null || x === undefined || !Number.isFinite(Number(x)) ? '-' : Number(x).toFixed(d));
const table = (head, rows) => {
  const all = [head, ...rows].map(r => head.map((_, i) => String(r[i] ?? '')));
  const w = head.map((_, i) => Math.max(...all.map(r => r[i].length)));
  for (const r of all) console.log(r.map((c, i) => c.padStart(w[i])).join('  '));
};

// the sim's numbers per road level, from a dig-month dump (same logic as the one-off levels script)
const ROAD = ['dunes:50', 'boom:50', 'bones:75', 'gold:75'].concat(...[100, 150, 200, 250].map(d => ['dunes:' + d, 'boom:' + d, 'bones:' + (d + 25), 'gold:' + (d + 25)]));
function simLevels(dump) {
  const out = ROAD.map(() => ({ tries: [], att: [], days: [], n: 0 }));
  for (const d of dump) {
    let prev = 0;
    ROAD.forEach((k, i) => {
      const fin = d.fin.find(x => x.key === k && x.first);
      if (!fin) return;
      const tries = d.resets.filter(x => x.key === k && x.r <= fin.r).length + (i === 0 ? 1 : 0);
      out[i].tries.push(tries); out[i].att.push(fin.a / 60); out[i].days.push(fin.r / 86400); out[i].n++;
      prev = fin.r;
    });
  }
  return out;
}

const vs = arg('vs') ? simLevels(JSON.parse(fs.readFileSync(arg('vs'), 'utf8'))) : null;

try {
  const ov = (await rpc('dig_overview'))[0] || {};
  console.log(`players ${ov.players ?? 0}, sessions ${ov.sessions ?? 0}, tries ${ov.tries ?? 0}, choices ${ov.choices ?? 0}, pace rows ${ov.pace_rows ?? 0}; ` +
    `median session ${f(ov.session_min_median)} min (${f(ov.att_min_median)} attended), median time away ${f(ov.away_h_median)} h; ${String(ov.first_seen || '-').slice(0, 10)} to ${String(ov.last_seen || '-').slice(0, 10)}`);

  if (flag('choices')) {
    const rows = await rpc('dig_choice_stats');
    const by = {};
    for (const r of rows) (by[r.level] = by[r.level] || []).push(r);
    const lines = [];
    for (const lv of Object.keys(by).sort((a, b) => a - b)) {
      const buys = by[lv].filter(r => r.kind === 'buy' || r.kind === 'kit').sort((a, b) => b.picked - a.picked).slice(0, 3)
        .map(r => `${r.item} x${r.picked}${r.median_lv_at_finish != null ? ` (lv ${f(r.median_lv_at_finish, 0)})` : ''}`).join(', ');
      const offers = by[lv].filter(r => r.kind === 'relic' || r.kind === 'card').filter(r => r.offered >= 3).sort((a, b) => b.pick_rate - a.pick_rate);
      const top = offers.slice(0, 2).map(r => `${r.item} ${Math.round(100 * r.pick_rate)}%`).join(', '), low = offers.slice(-1).filter(r => !offers.slice(0, 2).includes(r)).map(r => `${r.item} ${Math.round(100 * r.pick_rate)}%`).join('');
      lines.push([lv, buys || '-', top ? top + (low ? ` | least: ${low}` : '') : '-']);
    }
    console.log('\nChoices per road level (top buys with the median level at finish; best and worst pick rates when offered)');
    table(['L', 'most bought', 'picked when offered'], lines.length ? lines : [['-', 'no data yet', '']]);
  } else if (flag('pace')) {
    const rows = await rpc('dig_pace_stats');
    console.log('\nPace per road level (medians over about one-minute samples)');
    table(['L', 'players', 'samples', 'm/min', 'coins/s', 'blocks/s', 'hits/s', 'idle'],
      rows.map(r => [r.level, r.players, r.samples, f(r.depth_per_min_median), f(r.coins_s_median, 2), f(r.blocks_s_median, 2), f(r.hits_s_median, 2), r.idle_share_median == null ? '-' : Math.round(100 * r.idle_share_median) + '%']));
    if (vs) console.log('(the sim dump has no per-level pace samples: nothing to put beside these)');
  } else {
    const rows = await rpc('dig_level_stats');
    const head = ['L', 'players', 'done', 'tries med/p75', 'att min med/p75', 'day med', 'quit'];
    if (vs) head.push('| sim n', 'tries med/p75', 'att min med/p75', 'day med');
    console.log('\nPer road level, real players' + (vs ? ' | sim' : ''));
    const lines = rows.map(r => {
      const base = [r.level, r.players, r.finished, `${f(r.tries_median)}/${f(r.tries_p75)}`, `${f(r.att_min_median, 0)}/${f(r.att_min_p75, 0)}`, f(r.days_median), r.quit_share == null ? '-' : Math.round(100 * r.quit_share) + '%'];
      if (vs) { const m = vs[r.level - 1]; base.push('|', m ? m.n : '-', m && m.n ? `${f(med(m.tries))}/${f(q75(m.tries))}` : '-', m && m.n ? `${f(med(m.att), 0)}/${f(q75(m.att), 0)}` : '-', m && m.n ? f(med(m.days)) : '-'); }
      return base;
    });
    if (vs) head.splice(7, 1, '|', 'sim n');
    table(head, lines.length ? lines : [['-', 'no data yet']]);
  }
} catch (e) {
  console.error(String(e.message || e));
  process.exit(1);
}
