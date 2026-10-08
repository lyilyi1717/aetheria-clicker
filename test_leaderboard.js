// Leaderboard Season 2 (R19): season detection and fallback against a mocked Supabase REST API.
// Run: node test_leaderboard.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import {
  Leaderboard, SEASONS, CURRENT_SEASON, SEASON_PROBE_MS, BOARDS, isMissingTable, validateName, accountName
} from './js/leaderboard.js';
import { funnyName, FUNNY_ADJECTIVES, FUNNY_NOUNS } from './js/data/funnyNames.js';

// --- A small fake of the Supabase project ------------------------------------------------
// s2: whether supabase/leaderboard_season2.sql has been run (it creates the season table and
// freezes Season 1). down: every request fails at the network level.
function fakeSupabase() {
  const db = { s2: false, down: false, s1: new Map(), season: new Map(), log: [] };
  const json = (status, body, headers = {}) => new Response(body == null ? null : JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', ...headers }
  });
  globalThis.fetch = async (url, opts = {}) => {
    if (db.down) throw new TypeError('Failed to fetch');
    const u = new URL(url);
    const method = opts.method || 'GET';
    db.log.push(`${method} ${u.pathname.replace('/rest/v1/', '').replace('/auth/v1/', 'auth:')}${u.search}`);
    if (u.pathname.startsWith('/auth/v1/')) {
      return json(200, { access_token: 'tok', refresh_token: 'ref', expires_in: 3600, user: { id: 'me' } });
    }
    const table = u.pathname.replace('/rest/v1/', '');
    if (table === 'leaderboard_season' && !db.s2) {
      return json(404, { code: 'PGRST205', message: "Could not find the table 'public.leaderboard_season' in the schema cache" });
    }
    if (table !== 'leaderboard' && table !== 'leaderboard_season') return json(404, { code: 'PGRST205' });
    const store = table === 'leaderboard' ? db.s1 : db.season;
    if (method === 'POST') {
      if (table === 'leaderboard' && db.s2) return json(403, { code: '42501', message: 'permission denied for table leaderboard' });
      const row = JSON.parse(opts.body);
      if (table === 'leaderboard_season' && row.season !== CURRENT_SEASON) return json(403, { code: '42501' });
      row.last_seen = new Date(Date.now()).toISOString();   // the server guard sets it from its clock
      store.set(`${row.season ?? ''}:${row.user_id}`, row);
      return new Response(null, { status: 201 });
    }
    let rows = [...store.values()];
    const season = u.searchParams.get('season');
    if (season) rows = rows.filter(r => `eq.${r.season}` === season);
    const seen = u.searchParams.get('last_seen');
    if (seen) rows = rows.filter(r => r.last_seen >= seen.replace('gte.', ''));
    if (method === 'HEAD') return new Response(null, { status: 200, headers: { 'content-range': `*/${rows.length}` } });
    const order = u.searchParams.get('order');
    if (order) { const col = order.split('.')[0]; rows.sort((a, b) => b[col] - a[col]); }
    return json(200, rows.slice(0, Number(u.searchParams.get('limit') || 50)));
  };
  return db;
}

function legacyGame() {
  // An old save after the R8 rebase: record floor 723k, live and index floor ~5.5k
  return {
    gameState: {
      settings: { lbName: 'Veteran' },
      stats: {},
      totalAetherEarned: new BigNum(1.5, 40),
      hero: { floor: 5520, maxFloor: 723000, indexFloor: 5520 },
      ascensionCount: 140,
      transcendenceCount: 3,
      miningGrid: { maxDepth: 900 }
    },
    saveManager: { save() {} },
    // Signed in to an account: only accounts post to the leaderboard (guests only read)
    cloudSave: {
      signedIn: true, nickname: '', email: 'v@example.com', session: { user_id: 'me' },
      activeSession: async () => ({ access_token: 'tok', user_id: 'me', expires_at: Infinity })
    },
    version: 'test'
  };
}

const realNow = Date.now;
let clock = realNow();
Date.now = () => clock;

console.log('--- Season table missing: Season 1 keeps working ---');
const db = fakeSupabase();
const lb = new Leaderboard(legacyGame());
{
  await lb.push('t');
  assert.equal(lb.liveSeason, 1);
  const s1 = db.s1.get(':me');
  assert.ok(s1, 'submission landed on Season 1');
  assert.equal(s1.max_floor, 723000, 'Season 1 keeps its old floor record');
  assert.equal(s1.season, undefined, 'no Season 2 columns sent to the Season 1 table');
  assert.equal(s1.transcends, undefined);
  await lb.fetchBoard();
  assert.equal(lb.rows.length, 1);
  assert.equal(lb.rowsSeason, 1);
  assert.equal(lb.shownSeason, 1);
  assert.equal(lb.online, 1);

  // No probe spam: the missing table is looked for again only every SEASON_PROBE_MS
  const probes = () => db.log.filter(l => l.startsWith('GET leaderboard_season')).length;
  assert.equal(probes(), 1);
  clock += 60000; await lb.push('t');
  clock += 30000; await lb.fetchBoard();
  assert.equal(probes(), 1);
  clock += SEASON_PROBE_MS; await lb.fetchBoard();
  assert.equal(probes(), 2);
  assert.equal(lb.liveSeason, 1);
}

console.log('--- SQL applied mid-session: next push moves to Season 2, nothing lost ---');
{
  db.s2 = true;              // owner ran supabase/leaderboard_season2.sql (Season 1 now frozen)
  clock += 60000;            // still inside the probe window: client thinks Season 1
  const before = db.log.length;
  await lb.push('t');
  assert.equal(lb.liveSeason, CURRENT_SEASON);
  assert.ok(db.log.slice(before).some(l => l.startsWith('POST leaderboard?')), 'tried Season 1 first');
  const row = db.season.get('2:me');
  assert.ok(row, 'the rejected Season 1 write was resent to Season 2');
  assert.equal(row.season, 2);
  assert.equal(row.max_floor, 5520, 'Season 2 ranks the post-R8 floor, not the legacy record');
  assert.equal(row.transcends, 3);
  assert.equal(row.ascensions, 140);
  assert.equal(row.max_depth, 900);
  assert.ok(Math.abs(row.aether_log10 - Math.log10(1.5e40)) < 1e-9);
  assert.equal(db.s1.get(':me').max_floor, 723000, 'Season 1 row untouched');

  // Later pushes go straight to Season 2 without probing
  const n = db.log.length;
  clock += 60000; await lb.push('t');
  assert.deepEqual(db.log.slice(n).filter(l => !l.startsWith('auth')), ['POST leaderboard_season?on_conflict=season,user_id']);
}

console.log('--- Reading Season 2, Season 1 as history ---');
{
  db.season.set('2:other', { season: 2, user_id: 'other', display_name: 'Newcomer', max_floor: 700, aether_log10: 30, aether_text: '1e30', ascensions: 10, transcends: 0, max_depth: 60, last_seen: new Date(0).toISOString() });
  db.season.set('3:ghost', { season: 3, user_id: 'ghost', display_name: 'Future', max_floor: 9, aether_log10: 0, aether_text: '0', ascensions: 0, transcends: 0, max_depth: 1, last_seen: new Date(0).toISOString() });
  lb.board = 'transcends';
  await lb.fetchBoard();
  assert.equal(lb.rowsSeason, 2);
  assert.deepEqual(lb.rows.map(r => r.display_name), ['Veteran', 'Newcomer'], 'only Season 2 rows, ranked');
  const get = db.log.filter(l => l.startsWith('GET leaderboard_season?select=user_id,display_name')).pop();
  assert.ok(get.includes('season=eq.2') && get.includes('order=transcends.desc'));
  assert.equal(lb.online, 1, 'heartbeats counted on Season 2 (the frozen Season 1 has none)');
  assert.ok(db.log.filter(l => l.startsWith('HEAD')).pop().startsWith('HEAD leaderboard_season?select=user_id&season=eq.2&'));

  lb.viewSeason = 1;
  await lb.fetchBoard();
  assert.equal(lb.rowsSeason, 1);
  assert.equal(lb.board, 'floor', 'Season 1 has no Transcends board; falls back to floor');
  assert.equal(lb.rows[0].max_floor, 723000);
  assert.ok(db.log.filter(l => l.startsWith('GET leaderboard?')).pop().includes('order=max_floor.desc'));

  // Switching season while a load is in flight: that load must not count as fresh
  lb.viewSeason = null;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, opts) => { lb.viewSeason = 1; return realFetch(url, opts); };  // click lands mid-load
  try { await lb.fetchBoard(); } finally { globalThis.fetch = realFetch; }
  assert.equal(lb.rowsSeason, 2);
  assert.equal(lb.lastFetch, 0, 'next tick loads the season now on screen');

  // Writing never goes to the viewed (frozen) season
  clock += 60000; await lb.push('t');
  assert.ok(db.log.at(-1).startsWith('POST leaderboard_season'));
}

console.log('--- Fresh client after the SQL: straight to Season 2 ---');
{
  const lb2 = new Leaderboard(legacyGame());
  lb2.gs.settings.lbName = '';
  await lb2.fetchBoard();
  assert.equal(lb2.liveSeason, 2);
  assert.equal(lb2.shownSeason, 2);
  // A new save (no indexFloor field yet) falls back to maxFloor
  lb2.gs.hero = { floor: 300, maxFloor: 320 };
  assert.equal(lb2.currentStats(2).max_floor, 320);
  assert.equal(lb2.currentStats(1).max_floor, 320);
}

console.log('--- Season table removed again: falls back instead of failing ---');
{
  db.s2 = false;
  const lb3 = new Leaderboard(legacyGame());
  lb3.liveSeason = 2;
  clock += 60000; await lb3.push('t');   // S2 404 -> Season 1 (writable again in this fake)
  assert.equal(lb3.liveSeason, 1);
  assert.ok(db.log.at(-1).startsWith('POST leaderboard?'));
  lb3.liveSeason = 2;
  await lb3.fetchBoard();
  assert.equal(lb3.rowsSeason, 1);
}

console.log('--- Network down: errors surface (tick shows "offline"), state unchanged ---');
{
  db.down = true;
  const lb4 = new Leaderboard(legacyGame());
  await assert.rejects(lb4.fetchBoard(), /Failed to fetch/);
  assert.equal(lb4.liveSeason, null);
  db.down = false;
}

console.log('--- Registered players only; names ---');
{
  const before = db.log.length;
  const g = legacyGame();
  g.cloudSave = { signedIn: false, activeSession: async () => null };
  const guest = new Leaderboard(g);
  assert.equal(guest.name, '', 'a guest has no leaderboard name');
  await guest.push('t');
  assert.equal(db.log.length, before, 'a guest never signs in anonymously or posts');

  // Name: nickname, else the old guest-board name, else a funny default (never the email)
  const acct = { signedIn: true, nickname: 'Oil Baron', email: 'x@example.com', session: { user_id: 'u1' } };
  assert.equal(accountName(acct, 'Veteran'), 'Oil Baron');
  assert.equal(accountName({ ...acct, nickname: '' }, 'Veteran'), 'Veteran');
  const d1 = accountName({ ...acct, nickname: '' }, '');
  assert.equal(d1, funnyName('u1'), 'stable per account');
  assert.ok(!d1.includes('@') && !d1.includes('example'));
  assert.equal(accountName({ signedIn: false }, 'Veteran'), '');
  // Every funny name passes the leaderboard name rules
  for (const a of FUNNY_ADJECTIVES) for (const n of FUNNY_NOUNS) assert.equal(validateName(`${a} ${n} 99`), null, `${a} ${n}`);
  for (let i = 0; i < 200; i++) assert.equal(validateName(funnyName(`id-${i}`)), null);
}

console.log('--- Helpers ---');
{
  assert.equal(await isMissingTable(new Response('{}', { status: 404 })), true);
  assert.equal(await isMissingTable(new Response(JSON.stringify({ code: '42P01' }), { status: 400 })), true);
  assert.equal(await isMissingTable(new Response(JSON.stringify({ code: '42501' }), { status: 403 })), false);
  assert.equal(await isMissingTable(new Response('nope', { status: 500 })), false);
  assert.equal(await isMissingTable(new Response('[]', { status: 200 })), false);
  assert.equal(BOARDS, SEASONS[CURRENT_SEASON].boards);
  assert.deepEqual(SEASONS[1].boards.map(b => b.id), ['floor', 'aether', 'ascensions', 'depth']);
  assert.equal(validateName('ab'), 'Name must be 3–20 characters.');
  assert.equal(validateName('Good Name_1'), null);
}

Date.now = realNow;
console.log('test_leaderboard.js: all passed');
