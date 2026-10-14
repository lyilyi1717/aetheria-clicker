// Fixes from the 14 October code review: telemetry batches, the Gate-memory flag, Buy all's cached plan, Gate-only gateMul. Run: node test_proto_reviewfixes.js
import * as G from './proto/game.js';
import { FEATURES } from './proto/core/registry.js';
import { createTelemetry, TEL_LIMITS } from './proto/features/telemetry/queue.js';
import { buyAllPlan } from './proto/features/shop/buyall.js';

let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.error('FAIL: ' + m); } };
const NO = () => {};
const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };

(async () => { // telemetry: per-table batches fit the server's limits, one send per table per minute, the rest stays queued
  let now = 1e12; const calls = []; const st = mem(); st.setItem('DIG_TELEMETRY', 'on');
  const tel = createTelemetry({ store: st, ver: '1', url: 'https://x.test', key: 'k', now: () => now, rand: Math.random, allowed: true,
    fetch: async (url, init) => { calls.push({ url, n: JSON.parse(init.body).length }); return { ok: true, status: 201 }; } });
  for (let i = 0; i < 100; i++) { tel.add('tries', { a: i }); tel.add('choices', { a: i }); tel.add('pace', { a: i }); tel.add('sessions', { a: i }); }
  await tel.flush();
  const n = t => calls.filter(c => c.url.endsWith('dig_' + t)).reduce((x, c) => x + c.n, 0);
  ok(n('tries') === 12 && n('choices') === 60 && n('pace') === 12 && n('sessions') === 6, 'one flush sends 12 / 60 / 12 / 6 rows');
  ok(tel.queued('tries') === 88 && tel.queued('choices') === 100 - 60 + 0 && tel.queued('sessions') === 94, 'the rest stays queued');
  await tel.flush(); ok(calls.length === 4, 'a second flush inside a minute sends nothing');
  now += 61000; await tel.flush(); ok(n('tries') === 24 && n('choices') === 100, 'a minute later the next batch goes');
  ok(TEL_LIMITS.batch.tries === 12 && TEL_LIMITS.batch.choices === 60, 'limits match dig_guard');
  for (let i = 0; i < 500; i++) tel.add('pace', { a: i });
  ok(tel.queued('pace') <= TEL_LIMITS.perTable, 'the queue is capped');

  { // the Gate-memory flag: one flag for the save, and old per-bank keys are pruned on load
    const s = G.newState(); s.seen['gate:dunes:50:340'] = true; s.seen['gate:boom:100:120'] = true; s.seen.gatemem = true; s.seen.legacyBoard = true;
    FEATURES.boss.migrate(s);
    ok(!('gate:dunes:50:340' in s.seen) && !('gate:boom:100:120' in s.seen), 'old gate:<key>:<bank> flags are dropped');
    ok(s.seen.gatemem && s.seen.legacyBoard, 'other flags stay');
    const old = JSON.parse(JSON.stringify(G.newState())); old.fv = { boss: 1 }; old.seen['gate:dunes:50:7'] = true;
    ok(FEATURES.boss.version >= 2, 'the boss feature has a version for this step');
  }

  { // Buy all: the cached plan holds for any purse between spent and need
    const s = G.newState(); s.coins = 5000;
    const p = buyAllPlan(s, 'coin');
    ok(p.need > p.spent && p.need < Infinity, 'the plan says when it would grow');
    for (const w of [p.spent, (p.spent + p.need) / 2, p.need - 0.5, p.need, p.need * 1.5, p.spent - 1, 300, 8000]) {
      const z = G.newState(); z.coins = w;
      const q = buyAllPlan(z, 'coin'), inRange = w >= p.spent && w < p.need;
      if (inRange) ok(q.count === p.count, 'same plan at purse ' + w + ' (' + q.count + ' vs ' + p.count + ')');
    }
    ok(s.coins === 5000, 'planning does not touch the state');
  }
  if (bad) { console.error(bad + ' failed'); process.exit(1); }
  console.log('reviewfixes: ok');
})();
