// R39 shared news: other players' headlines in the strip. Checks the word filter, cleaning of
// server rows, the rotation with shared items, the report/hide memory in the save, and a full
// round trip against a mocked Supabase REST (feed, share, rate limit, delete, report, missing
// table). Run: node test_r39_shared_news.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GameState } from './js/systems/GameState.js';
import { CHANGELOG } from './js/version.js';
import { buildQueue, builtInItems, defaultNewsState, sanitizeNews, addNewsEntry } from './js/ui/newsTicker.js';
import {
  SharedNews, hasBlockedWord, checkSharedText, sharedName, checkSharedName, feedPath, rowsToPosts,
  sharedQueueItems, sharedErrorMessage, markReported, SHARED_FEED_LIMIT, SHARED_MAX_PER_DAY, NEWS_REPORTED_MAX
} from './js/ui/sharedNews.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

console.log('--- word filter: whole-word stems, no false hits inside words ---');
{
  assert.equal(hasBlockedWord('what the fuck'), true);
  assert.equal(hasBlockedWord('FUCKING pumps'), true, 'case and word endings');
  assert.equal(hasBlockedWord('grapes and drapes'), false, 'stems only match at the start of a word');
  assert.equal(hasBlockedWord('Scunthorpe refinery'), false);
  assert.equal(hasBlockedWord('أسعار النفط'), false);
  assert.equal(checkSharedText('  oil   rises ').text, 'oil rises');
  assert.equal(checkSharedText('   ').ok, false);
  assert.equal(checkSharedText('shit happens').ok, false);
}

console.log('--- names: News name first, else the leaderboard name, both validated ---');
{
  assert.equal(sharedName({ news: { name: 'Sheikh_Oil' }, lbName: 'Other' }), 'Sheikh_Oil');
  assert.equal(sharedName({ news: { name: '' }, lbName: 'Board Name' }), 'Board Name');
  assert.equal(sharedName({ news: { name: 'x' }, lbName: '' }), '', 'too short');
  assert.equal(sharedName({ news: { name: 'نفط' } }), '', 'same characters as the leaderboard');
  assert.equal(checkSharedName('Driller 7'), null);
  assert.ok(checkSharedName('ab'));
  assert.ok(checkSharedName('slut king'));
}

console.log('--- server rows are cleaned; bad ones dropped ---');
{
  const posts = rowsToPosts([
    { id: 3, user_id: 'u1', display_name: 'Ana', body: 'line one\nline two', created_at: '2026-10-07T10:00:00Z' },
    { id: 3, user_id: 'u1', display_name: 'Ana', body: 'duplicate id', created_at: '2026-10-07T10:00:00Z' },
    { id: -1, display_name: 'X', body: 'bad id' },
    { id: 4, display_name: 'Bo', body: '   ' },
    { id: 5, display_name: 'Cy', body: 'b'.repeat(500), created_at: 'nope' },
    null
  ]);
  assert.deepEqual(posts.map(p => p.id), [3, 5]);
  assert.equal(posts[0].text, 'line one line two');
  assert.equal(posts[1].text.length, 120);
  assert.equal(posts[1].at, 0);
  assert.deepEqual(rowsToPosts('nope'), []);
  assert.equal(rowsToPosts(Array.from({ length: 50 }, (_, i) => ({ id: i + 1, display_name: 'Abc', body: `h${i}` }))).length, SHARED_FEED_LIMIT);
  const path = feedPath(Date.parse('2026-10-08T00:00:00Z'));
  assert.ok(path.startsWith('news_posts?select=id,user_id,display_name,body,created_at&'));
  assert.ok(path.includes(encodeURIComponent('2026-10-01T00:00:00.000Z')), 'last 7 days');
  assert.ok(path.includes('order=created_at.desc') && path.includes(`limit=${SHARED_FEED_LIMIT}`));
}

console.log('--- the strip: shared items mix in, reported and duplicate ones stay out ---');
{
  const posts = [
    { id: 1, userId: 'me', name: 'Me', text: 'my own headline', at: 0 },
    { id: 2, userId: 'u2', name: 'Bo', text: 'news from Bo', at: 0 },
    { id: 3, userId: 'u3', name: 'Cy', text: 'خبر من سي', at: 0 },
    { id: 4, userId: 'u4', name: 'Di', text: 'reported one', at: 0 }
  ];
  const news = defaultNewsState();
  addNewsEntry(news, 'my own headline');
  markReported(news, 4);
  const items = sharedQueueItems(posts, news, 'me');
  assert.deepEqual(items.map(i => i.text), ['news from Bo — Bo', 'خبر من سي — Cy']);
  assert.deepEqual(items.map(i => i.dir), ['ltr', 'rtl'], 'direction follows the post, not the name');
  assert.equal(sharedQueueItems(posts, { ...news, showShared: false }, 'me').length, 0, 'switch off hides them');
  assert.equal(sharedQueueItems(posts, defaultNewsState(), 'other').length, 4, 'someone else sees all of them');

  const built = builtInItems(CHANGELOG);
  const q = buildQueue(news, CHANGELOG, items);
  assert.equal(q.length, built.length + 1 + 2);
  assert.equal(q[0].kind, 'new');
  assert.equal(q[1].kind, 'player');
  assert.equal(q[2].kind, 'shared');
  assert.equal(q[q.findIndex(i => i.text.startsWith('خبر'))].dir, 'rtl');
  assert.equal(buildQueue(news, CHANGELOG).length, built.length + 1, 'no shared items, same as before');
}

console.log('--- save: shared-news settings survive; old saves get defaults ---');
{
  const s = sanitizeNews({ hidden: false, entries: [], showShared: false, reported: [5, 5, 'x', -2, 9.5, 7], name: '  Oil  Baron ' });
  assert.equal(s.showShared, false);
  assert.deepEqual(s.reported, [5, 7]);
  assert.equal(s.name, 'Oil Baron');
  assert.equal(sanitizeNews({ entries: [] }).showShared, true, 'on unless turned off');
  const many = defaultNewsState();
  for (let i = 1; i <= NEWS_REPORTED_MAX + 50; i++) markReported(many, i);
  assert.equal(many.reported.length, NEWS_REPORTED_MAX);
  assert.equal(many.reported.at(-1), NEWS_REPORTED_MAX + 50, 'keeps the newest');

  const gs = new GameState();
  gs.settings.news.showShared = false;
  gs.settings.news.name = 'Driller';
  markReported(gs.settings.news, 42);
  const back = new GameState();
  back.deserialize(JSON.parse(JSON.stringify(gs.serialize())));
  assert.equal(back.settings.news.showShared, false);
  assert.equal(back.settings.news.name, 'Driller');
  assert.deepEqual(back.settings.news.reported, [42]);

  // A save from the local-only ticker (4.13/4.14) has no shared fields
  const old = JSON.parse(JSON.stringify(new GameState().serialize()));
  old.settings.news = { hidden: true, entries: [{ id: 'a', text: 'kept', at: 1 }] };
  const loaded = new GameState();
  loaded.deserialize(old);
  assert.equal(loaded.settings.news.hidden, true);
  assert.equal(loaded.settings.news.entries[0].text, 'kept');
  assert.equal(loaded.settings.news.showShared, true);
  assert.deepEqual(loaded.settings.news.reported, []);
}

console.log('--- error messages ---');
{
  assert.ok(sharedErrorMessage(400, { hint: 'news_rate_limit' }).includes(String(SHARED_MAX_PER_DAY)));
  assert.equal(sharedErrorMessage(400, { hint: 'news_blocked' }), checkSharedText('fuck').error);
  assert.ok(sharedErrorMessage(401, null));
  assert.ok(sharedErrorMessage(500, null).includes('500'));
}

// --- Mock Supabase: the rules of supabase/news.sql, in memory --------------------------------
function mockServer({ missing = false } = {}) {
  const db = { posts: [], log: [], reports: new Set(), nextId: 1, now: Date.parse('2026-10-07T12:00:00Z') };
  const users = { 'tok-a': 'user-a', 'tok-b': 'user-b', 'tok-c': 'user-c', 'tok-d': 'user-d' };
  const json = (status, body) => ({
    status, ok: status >= 200 && status < 300,
    json: async () => body, clone() { return this; }
  });
  const fetchFn = async (url, opts = {}) => {
    if (missing) return json(404, { code: 'PGRST205' });
    const u = new URL(url);
    const table = u.pathname.split('/').pop();
    const uid = users[(opts.headers?.Authorization || '').replace('Bearer ', '')] || null;
    assert.ok(opts.headers?.apikey, 'every call sends the public key');
    const method = opts.method || 'GET';
    if (table === 'news_posts' && method === 'GET') {
      const since = Date.parse(u.searchParams.get('created_at').replace('gte.', ''));
      return json(200, db.posts.filter(p => !p.hidden && Date.parse(p.created_at) >= since)
        .sort((a, b) => b.id - a.id).map(({ hidden, report_count, ...r }) => r));
    }
    if (!uid) return json(401, { message: 'JWT required' });
    if (table === 'news_posts' && method === 'POST') {
      const b = JSON.parse(opts.body);
      assert.deepEqual(Object.keys(b).sort(), ['body', 'display_name'], 'client only sends the name and text');
      if (hasBlockedWord(b.body)) return json(400, { code: '22023', message: 'news: blocked word', hint: 'news_blocked' });
      const recent = db.log.filter(l => l.uid === uid && l.at > db.now - 86400000).length;
      if (recent >= 3) return json(400, { code: '22023', message: 'news: daily limit reached', hint: 'news_rate_limit' });
      db.log.push({ uid, at: db.now });
      const row = { id: db.nextId++, user_id: uid, display_name: b.display_name, body: b.body, created_at: new Date(db.now).toISOString(), hidden: false, report_count: 0 };
      db.posts.push(row);
      const { hidden, report_count, ...out } = row;
      return json(201, [out]);
    }
    if (table === 'news_posts' && method === 'DELETE') {
      const id = Number(u.searchParams.get('id').replace('eq.', ''));
      db.posts = db.posts.filter(p => !(p.id === id && p.user_id === uid));   // RLS: own rows only
      return json(204, null);
    }
    if (table === 'news_reports' && method === 'POST') {
      const { post_id } = JSON.parse(opts.body);
      const post = db.posts.find(p => p.id === post_id);
      if (post?.user_id === uid) return json(400, { hint: 'news_own_post' });
      const k = `${post_id}:${uid}`;
      if (db.reports.has(k)) return json(409, { code: '23505' });
      db.reports.add(k);
      if (post) { post.report_count++; post.hidden ||= post.report_count >= 3; }
      return json(201, null);
    }
    return json(400, {});
  };
  return { db, fetchFn };
}
const cloudFor = (token, uid) => ({
  signedIn: !!token,
  session: token ? { access_token: token, user_id: uid } : null,
  activeSession: async () => (token ? { access_token: token, user_id: uid } : null)
});

console.log('--- round trip: share, read, limit, delete, report ---');
{
  const server = mockServer();
  const now = () => server.db.now;
  const a = new SharedNews({ getCloud: () => cloudFor('tok-a', 'user-a'), fetchFn: server.fetchFn, now });
  const b = new SharedNews({ getCloud: () => cloudFor('tok-b', 'user-b'), fetchFn: server.fetchFn, now });
  const guest = new SharedNews({ getCloud: () => null, fetchFn: server.fetchFn, now });

  assert.equal(await guest.load(), true);
  assert.equal(guest.state, 'on');
  assert.equal(guest.posts.length, 0);
  assert.equal((await guest.post('hello', 'Guesty')).ok, false, 'signed out cannot share');
  assert.equal(server.db.posts.length, 0);

  let emitted = 0;
  a.onChange(() => emitted++);
  const r1 = await a.post('Pumps at full power', 'Ana');
  assert.equal(r1.ok, true);
  assert.equal(r1.post.name, 'Ana');
  assert.equal(a.posts[0].text, 'Pumps at full power', 'own post shows at once');
  assert.ok(emitted > 0);
  assert.equal((await a.post('no name', '')).ok, false);
  assert.equal((await a.post('fuck this', 'Ana')).ok, false, 'filtered before the network');
  assert.equal(server.db.posts.length, 1);

  await guest.load();
  assert.deepEqual(guest.posts.map(p => p.text), ['Pumps at full power'], 'everyone sees it, no account needed');

  assert.equal((await a.post('Second', 'Ana')).ok, true);
  assert.equal((await a.post('Third', 'Ana')).ok, true);
  const r4 = await a.post('Fourth', 'Ana');
  assert.equal(r4.ok, false, 'fourth post in 24 h is refused by the server');
  assert.ok(r4.error.includes(String(SHARED_MAX_PER_DAY)));

  // Deleting does not give the slot back
  const third = server.db.posts.find(p => p.body === 'Third');
  assert.equal((await a.remove(third.id)).ok, true);
  assert.equal(a.posts.some(p => p.id === third.id), false);
  assert.equal((await a.post('After delete', 'Ana')).ok, false);
  server.db.now += 86400000 + 1000;
  assert.equal((await a.post('Next day', 'Ana')).ok, true, 'a day later the limit resets');

  // B cannot delete A's post (RLS), can report it, twice counts once
  const first = server.db.posts.find(p => p.body === 'Pumps at full power');
  await b.remove(first.id);
  assert.ok(server.db.posts.some(p => p.id === first.id), 'only the poster deletes');
  assert.equal((await b.report(first.id)).ok, true);
  assert.equal((await b.report(first.id)).ok, true, 'second report is a no-op, not an error');
  assert.equal(first.report_count, 1);
  assert.equal((await a.report(first.id)).ok, false, 'cannot report your own post');

  // Three different accounts hide it
  const as = (tok) => new SharedNews({ getCloud: () => cloudFor(tok, tok), fetchFn: server.fetchFn, now });
  await as('tok-c').report(first.id);
  await guest.load();
  assert.ok(guest.posts.some(p => p.id === first.id), 'two reports: still shown');
  await as('tok-d').report(first.id);
  await guest.load();
  assert.equal(guest.posts.some(p => p.id === first.id), false, 'three reports hide it for everyone');
}

console.log('--- table missing (SQL not run yet): strip runs on local news only ---');
{
  const server = mockServer({ missing: true });
  const s = new SharedNews({ getCloud: () => cloudFor('tok-a', 'user-a'), fetchFn: server.fetchFn });
  assert.equal(await s.load(), false);
  assert.equal(s.state, 'off');
  assert.equal((await s.post('hello', 'Ana')).ok, false);
  const down = new SharedNews({ fetchFn: async () => { throw new Error('offline'); } });
  assert.equal(await down.load(), false);
  assert.equal(down.state, 'error');
  assert.deepEqual(sharedQueueItems(down.posts, defaultNewsState()), []);
}

console.log('--- safety: shared text never goes through HTML ---');
{
  const src = read('./js/ui/sharedNews.js');
  assert.ok(!/innerHTML|insertAdjacentHTML|outerHTML|document\.write/.test(src), 'no HTML sinks in sharedNews.js');
  const sql = read('./supabase/news.sql');
  for (const must of ['enable row level security', 'news_rate_limit', "interval '24 hours'", 'hidden', 'is_anonymous',
    'grant insert (display_name, body)', '>= 3']) {
    assert.ok(sql.includes(must), `news.sql has ${must}`);
  }
  // The server's word list is the client's
  const { BLOCKED_WORDS } = await import('./js/leaderboard.js');
  for (const w of BLOCKED_WORDS) assert.ok(sql.includes(`'${w}'`), `news.sql filters ${w}`);
}

console.log('R39 shared news tests passed');
