// Community requests without GitHub: the vote client (js/ui/communityVotes.js) with a mocked
// Supabase, the GitHub Action logic (scripts/community-promote.mjs) with a mocked GitHub, and the
// rules in supabase/community.sql. Run: node test_community_votes.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  APPROVE_LIKES, VOTES_CACHE_MS, VOTES_MIN_REFRESH_MS, VOTES_CACHE_KEY, VOTES_MAX_PER_DAY,
  checkRequest, rowsToRequests, openVotes, likesByIssue, likesToGo, votesErrorMessage, feedPath, CommunityVotes
} from './js/ui/communityVotes.js';
import { issueFromRequest, withLikes, likesLine, promote } from './scripts/community-promote.mjs';
import { communityLabelsFor } from './scripts/community-labels.mjs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const row = (id, likes, extra = {}) => ({ id, user_id: `u${id}`, kind: 'bug', title: `Request ${id}`, likes, status: 'open', github_issue: null, created_at: `2026-10-0${(id % 9) + 1}T00:00:00Z`, ...extra });

console.log('--- pure helpers ---');
{
  assert.equal(APPROVE_LIKES, 2, 'more than one like');
  assert.ok(!/body/.test(feedPath().split('select=')[1].split('&')[0]), 'the list never downloads text bodies');
  assert.equal(checkRequest('abc', '').ok, false);
  assert.equal(checkRequest('Boss timer\nbroken', 'x').title, 'Boss timer broken');
  assert.equal(checkRequest('You fucking game', '').ok, false, 'word filter');
  assert.ok(checkRequest('x'.repeat(500), 'y'.repeat(5000)).body.length <= 2000);
  const reqs = rowsToRequests([row(1, 0), row(2, 3), row(3, 1), row(3, 9), { id: 'x' }, row(4, 5, { status: 'posted', github_issue: 140 }), row(5, 1, { kind: 'evil' })]);
  assert.deepEqual(reqs.map(r => r.id), [1, 2, 3, 4], 'junk, duplicates and unknown kinds dropped');
  assert.deepEqual(openVotes(reqs).map(r => r.id), [2, 3, 1], 'most liked first; posted ones leave the list');
  assert.deepEqual(likesByIssue(reqs), { 140: 5 });
  assert.equal(likesToGo(0), 2); assert.equal(likesToGo(1), 1); assert.equal(likesToGo(7), 0);
  assert.match(votesErrorMessage(400, { hint: 'community_rate_limit' }), new RegExp(String(VOTES_MAX_PER_DAY)));
  assert.notEqual(votesErrorMessage(400, { hint: 'community_own' }), votesErrorMessage(401, {}));
}

// Mock Supabase: a tiny in-memory REST server
function mockServer({ missing = false } = {}) {
  const state = { rows: [row(1, 1), row(2, 0, { user_id: 'me' }), row(3, 4, { status: 'posted', github_issue: 140 })], likes: [], calls: [] };
  const fetchFn = async (url, opts = {}) => {
    const path = url.split('/rest/v1/')[1];
    const method = opts.method || 'GET';
    state.calls.push(`${method} ${path.split('?')[0]}`);
    const json = (status, body) => ({ ok: status < 400, status, json: async () => body, clone() { return this; } });
    if (missing) return json(404, { code: 'PGRST205' });
    const authed = !!opts.headers?.Authorization;
    if (path.startsWith('community_requests') && method === 'GET') return json(200, state.rows);
    if (path.startsWith('community_likes') && method === 'GET') return json(authed ? 200 : 401, state.likes.map(id => ({ request_id: id })));
    if (path.startsWith('community_likes') && method === 'POST') {
      const id = JSON.parse(opts.body).request_id;
      if (state.rows.find(r => r.id === id)?.user_id === 'me') return json(400, { hint: 'community_own' });
      state.likes.push(id); return json(201, null);
    }
    if (path.startsWith('community_likes') && method === 'DELETE') { state.likes = state.likes.filter(x => x !== Number(path.split('eq.')[1])); return json(204, null); }
    if (path.startsWith('community_requests') && method === 'POST') {
      const b = JSON.parse(opts.body);
      assert.deepEqual(Object.keys(b).sort(), ['body', 'browser', 'game_version', 'kind', 'title'], 'only writable columns are sent');
      const r = row(9, 0, { user_id: 'me', kind: b.kind, title: b.title });
      state.rows.push(r); return json(201, [r]);
    }
    if (path.startsWith('community_reports')) return json(201, null);
    return json(500, {});
  };
  return { state, fetchFn };
}
const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };
const cloud = (on) => ({ signedIn: on, session: on ? { user_id: 'me' } : null, activeSession: async () => (on ? { access_token: 'tok' } : null) });

console.log('--- vote client: cache, likes, posting ---');
{
  const { state, fetchFn } = mockServer();
  const store = memStore();
  let now = 1_000_000_000;
  const v = new CommunityVotes({ getCloud: () => cloud(true), fetchFn, storage: store, now: () => now, url: 'https://x' });
  await v.load();
  assert.equal(v.state, 'on');
  assert.deepEqual(state.calls, ['GET community_requests', 'GET community_likes'], 'one list read + my likes');
  assert.ok(store.m.has(VOTES_CACHE_KEY));

  state.calls.length = 0;
  now += VOTES_MIN_REFRESH_MS - 1;
  await v.load();
  await v.load({ force: true });
  assert.equal(state.calls.length, 0, 'within 5 min: no reads, not even with Refresh');
  now += 1;
  await v.load({ force: true });
  assert.equal(state.calls.length, 2, 'Refresh reads after 5 min');
  state.calls.length = 0;
  now += VOTES_CACHE_MS - 1;
  await v.load();
  assert.equal(state.calls.length, 0, 'opening the tab within 30 min: no reads');
  now += 1;
  await v.load();
  assert.equal(state.calls.length, 2, 'after 30 min it reads again');
  state.calls.length = 0;

  // A fresh page with the cache: no network at all
  const v2 = new CommunityVotes({ getCloud: () => cloud(true), fetchFn, storage: store, now: () => now, url: 'https://x' });
  await v2.load();
  assert.equal(state.calls.length, 0, 'cache survives a reload');
  assert.equal(v2.requests.length, 3);

  // Like, un-like: counts change in place, no re-read
  assert.deepEqual(await v.like(1, true), { ok: true });
  assert.equal(v.requests.find(r => r.id === 1).likes, 2);
  assert.ok(v.myLikes.has(1));
  await v.like(1, false);
  assert.equal(v.requests.find(r => r.id === 1).likes, 1);
  const own = await v.like(2, true);
  assert.equal(own.ok, false, 'no liking your own');
  assert.equal(state.calls.filter(c => c.startsWith('GET')).length, 0);

  const p = await v.post({ kind: 'bug', title: '  Bounties give Sand  ', body: 'x', version: '4.15.0', browser: 'Chrome' });
  assert.equal(p.ok, true);
  assert.equal(v.requests[0].title, 'Bounties give Sand');
  await v.report(1);
  assert.ok(!v.requests.some(r => r.id === 1), 'a reported request disappears for the reporter');
}

console.log('--- vote client: signed out, table missing ---');
{
  const { fetchFn } = mockServer();
  const v = new CommunityVotes({ getCloud: () => cloud(false), fetchFn, storage: memStore(), url: 'https://x' });
  await v.load();
  assert.equal(v.state, 'on', 'anyone can read the list');
  assert.equal((await v.like(1, true)).ok, false, 'liking needs an account');
  assert.equal((await v.post({ kind: 'bug', title: 'Some bug' })).ok, false);
  const off = new CommunityVotes({ getCloud: () => cloud(true), fetchFn: mockServer({ missing: true }).fetchFn, storage: memStore(), url: 'https://x' });
  await off.load();
  assert.equal(off.state, 'off', 'before the SQL is run the tab falls back to GitHub only');
  const locked = new CommunityVotes({ getCloud: () => cloud(true), storage: memStore(), url: 'https://x',
    fetchFn: async () => ({ ok: false, status: 401, json: async () => ({ code: '42501' }), clone() { return this; } }) });
  await locked.load();
  assert.equal(locked.state, 'off', 'tables without grants yet count as not set up');
  const down = new CommunityVotes({ fetchFn: async () => { throw new Error('offline'); }, storage: { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } }, url: 'https://x' });
  await down.load();
  assert.equal(down.state, 'error');
}

console.log('--- Action: issue text, likes line ---');
{
  const iss = issueFromRequest({ id: 7, kind: 'bug', title: 'Ping @owner about #12', body: '@everyone see #3', game_version: '4.15.0', browser: 'Chrome 1 on Android', likes: 3 });
  assert.equal(iss.title, '[Bug] Ping @​owner about #​12', 'no mentions or issue links from player text');
  assert.ok(!/@everyone/.test(iss.body));
  assert.deepEqual(iss.labels, ['community', 'bug']);
  assert.match(iss.body, /In-game likes: \*\*3\*\*/);
  assert.deepEqual(communityLabelsFor({ ...iss, labels: iss.labels.map(name => ({ name })) }), [], 'labeller agrees');
  assert.equal(issueFromRequest({ id: 1, kind: 'feature', title: 'x' }).labels[1], 'feature');
  assert.equal(withLikes(iss.body, 9).match(/In-game likes: \*\*(\d+)\*\*/)[1], '9');
  assert.ok(withLikes('plain', 2).endsWith(likesLine(2)));
}

console.log('--- Action: promote with mocked Supabase + GitHub ---');
{
  const db = [
    { id: 1, kind: 'bug', title: 'Two likes', body: 'b', likes: 2, status: 'open', github_issue: null, synced_likes: 0, hidden: false },
    { id: 2, kind: 'feature', title: 'Posted', body: 'b', likes: 6, status: 'posted', github_issue: 50, synced_likes: 4, hidden: false }
  ];
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const path = url.split('/rest/v1/')[1];
    calls.push(`${opts.method || 'GET'} ${path}`);
    assert.equal(opts.headers.apikey, 'service');
    const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => '' });
    if ((opts.method || 'GET') === 'GET' && path.includes('likes=gte.2')) return ok(db.filter(r => !r.hidden && r.github_issue == null && r.likes >= 2));
    if ((opts.method || 'GET') === 'GET') return ok(db.filter(r => r.status === 'posted' && r.github_issue != null));
    const id = Number(path.match(/id=eq\.(\d+)/)[1]);
    Object.assign(db.find(r => r.id === id), JSON.parse(opts.body));
    return ok(null);
  };
  const issues = { 50: { body: `idea\n\n${likesLine(4)}` } };
  const github = { rest: { issues: {
    create: async (a) => { issues[51] = a; return { data: { number: 51 } }; },
    get: async (a) => ({ data: issues[a.issue_number] }),
    update: async (a) => { issues[a.issue_number].body = a.body; }
  } } };
  const core = { info() {}, warning() {} };
  try {
    await promote({ github, context: { repo: { owner: 'o', repo: 'r' } }, core, url: 'https://x', key: 'service' });
  } finally { globalThis.fetch = realFetch; }
  assert.equal(issues[51].title, '[Bug] Two likes');
  assert.deepEqual(issues[51].labels, ['community', 'bug']);
  assert.equal(db[0].status, 'posted'); assert.equal(db[0].github_issue, 51);
  assert.ok(calls.findIndex(c => c.startsWith('PATCH') && c.includes('github_issue=is.null')) >= 0, 'claimed before the issue is opened');
  assert.match(issues[50].body, /In-game likes: \*\*6\*\*/, 'likes synced to the existing issue');
  assert.equal(db[1].synced_likes, 6);
  // Nothing set up: does nothing
  let warned = false;
  await promote({ github, context: {}, core: { warning: () => { warned = true; } }, url: 'https://x', key: '' });
  assert.ok(warned);
}

console.log('--- SQL: what players can and cannot do ---');
{
  const sql = read('./supabase/community.sql');
  for (const tbl of ['community_requests', 'community_request_log', 'community_likes', 'community_reports']) {
    assert.match(sql, new RegExp(`alter table public\\.${tbl}\\s+enable row level security`), `${tbl} has RLS`);
    assert.match(sql, new RegExp(`revoke all on public\\.${tbl}\\s+from anon, authenticated`));
  }
  const readCols = sql.match(/grant select \(([^)]*)\)\s+on public\.community_requests/)[1];
  assert.ok(!/body|browser|report_count|hidden/.test(readCols), 'players never download bodies or moderation columns');
  assert.match(sql, /grant insert \(kind, title, body, game_version, browser\) on public\.community_requests to authenticated/);
  assert.ok(!/grant update/.test(sql), 'no player can update a request (likes, status, issue)');
  assert.match(sql, /recent >= 3/); assert.equal(VOTES_MAX_PER_DAY, 3);
  assert.match(sql, /is_anonymous/, 'guest sessions refused');
  const wf = read('./.github/workflows/community-promote.yml');
  assert.match(wf, /secrets\.SUPABASE_SERVICE_KEY/);
  assert.ok(!/pull_request/.test(wf), 'the service key never runs on pull requests');
  assert.match(wf, /cron: '17 \*\/6 \* \* \*'/);
  const client = read('./js/ui/communityVotes.js') + read('./js/ui/community.js');
  assert.ok(!/innerHTML|insertAdjacentHTML/.test(client), 'player text never as HTML');
  assert.ok(!/service_role|SERVICE_KEY/.test(client), 'no service key in the game');
}

console.log('Community votes tests passed.');
