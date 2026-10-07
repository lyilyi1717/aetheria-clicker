// R40: Community tab. Pure helpers in js/ui/community.js: label filtering, bugs before
// features by 👍, Done list + shipped version, the pre-filled new-issue URL, escaping, and the
// 10-minute localStorage cache with a mocked fetch. Run: node test_r40_community.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  REPO, API, CACHE_KEY, SHIPPED_KEY, CACHE_MS, MIN_REFRESH_MS, TITLE_MAX, BODY_MAX,
  escapeHtml, issueUrl, normalizeIssue, isListed, groupOpen, doneList, parseShippedVersion,
  describeBrowser, buildNewIssueUrl, loadCommunity, readCache
} from './js/ui/community.js';
import { ALWAYS_UNLOCKED } from './js/systems/UnlockSystem.js';
import { VERSION } from './js/version.js';

const raw = (number, labels, likes = 0, extra = {}) => ({
  number, title: `Issue ${number}`, labels: labels.map(name => ({ name })), state: 'open',
  reactions: { '+1': likes }, html_url: `https://github.com/${REPO}/issues/${number}`,
  created_at: '2026-10-01T00:00:00Z', ...extra
});
const norm = (...a) => normalizeIssue(raw(...a));

console.log('--- escaping and links ---');
{
  assert.equal(escapeHtml('<img src=x onerror="a()">&\''), '&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;&#39;');
  assert.equal(escapeHtml(null), '');
  assert.equal(issueUrl(5, `https://github.com/${REPO}/issues/5`), `https://github.com/${REPO}/issues/5`);
  assert.equal(issueUrl(5, 'javascript:alert(1)'), `https://github.com/${REPO}/issues/5`, 'only github.com links');
  assert.equal(issueUrl(5, 'https://evil.example/issues/5'), `https://github.com/${REPO}/issues/5`);
}

console.log('--- normalize: PRs dropped, labels lower-cased, likes from 👍 ---');
{
  assert.equal(normalizeIssue({ ...raw(1, ['community']), pull_request: {} }), null);
  assert.equal(normalizeIssue(null), null);
  assert.equal(normalizeIssue({ title: 'no number' }), null);
  const i = normalizeIssue(raw(2, ['Community', 'BUG'], 7));
  assert.deepEqual(i.labels, ['community', 'bug']);
  assert.equal(i.likes, 7);
  assert.equal(normalizeIssue({ ...raw(3, ['community']), reactions: undefined }).likes, 0);
  assert.deepEqual(normalizeIssue({ ...raw(4, []), labels: ['community'] }).labels, ['community'], 'string labels');
}

console.log('--- filtering: community only; wontfix/duplicate and not-planned hidden ---');
{
  assert.equal(isListed(norm(1, ['community'])), true);
  assert.equal(isListed(norm(1, ['bug'])), false, 'needs the community label');
  assert.equal(isListed(norm(1, ['community', 'wontfix'])), false);
  assert.equal(isListed(norm(1, ['community', 'duplicate'])), false);
  assert.equal(isListed(norm(1, ['community'], 0, { state: 'closed', state_reason: 'not_planned' })), false);
  assert.equal(isListed(norm(1, ['community'], 0, { state: 'closed', state_reason: 'completed' })), true);
}

console.log('--- sorting: bugs before features, each by 👍, ties to the older issue ---');
{
  const issues = [
    norm(10, ['community', 'feature'], 50),
    norm(11, ['community', 'bug'], 1),
    norm(12, ['community', 'bug'], 9),
    norm(13, ['community', 'feature'], 3),
    norm(14, ['community', 'feature'], 50),
    norm(15, ['community', 'bug', 'wontfix'], 99),
    norm(16, ['bug'], 99),
    norm(17, ['community', 'bug'], 5, { state: 'closed' })
  ];
  const { bugs, features } = groupOpen(issues);
  assert.deepEqual(bugs.map(i => i.number), [12, 11]);
  assert.deepEqual(features.map(i => i.number), [10, 14, 13], 'most liked first; tie → lower number');
}

console.log('--- Done list and shipped version ---');
{
  const issues = [
    norm(20, ['community'], 0, { state: 'closed', state_reason: 'completed', closed_at: '2026-10-02T00:00:00Z' }),
    norm(21, ['community', 'bug'], 0, { state: 'closed', state_reason: 'completed', closed_at: '2026-10-05T00:00:00Z' }),
    norm(22, ['community'], 0, { state: 'closed', state_reason: 'not_planned', closed_at: '2026-10-06T00:00:00Z' }),
    norm(23, ['community'], 0)
  ];
  assert.deepEqual(doneList(issues).map(i => i.number), [21, 20], 'newest first, not-planned and open left out');
  assert.equal(doneList(issues, 1).length, 1);
  assert.equal(parseShippedVersion([{ body: 'Thanks!' }, { body: 'Shipped in v4.7.0 🎉' }]), '4.7.0');
  assert.equal(parseShippedVersion([{ body: 'shipped in 4.7.0' }, { body: 'Shipped in v4.7.1' }]), '4.7.1', 'latest wins');
  assert.equal(parseShippedVersion([{ body: 'soon' }]), null);
  assert.equal(parseShippedVersion(null), null);
}

console.log('--- new-issue URL: labels, title prefix, body with version and browser ---');
{
  const url = new URL(buildNewIssueUrl({ type: 'bug', title: '  Boss  <b>timer</b> ', description: 'It & runs', version: '4.7.0', browser: 'Chrome 129 on Android' }));
  assert.equal(url.origin + url.pathname, `https://github.com/${REPO}/issues/new`);
  assert.equal(url.searchParams.get('labels'), 'community,bug');
  assert.equal(url.searchParams.get('title'), '[Bug] Boss <b>timer</b>', 'whitespace collapsed, text kept as typed');
  const body = url.searchParams.get('body');
  assert.match(body, /### What happened\?\nIt & runs/);
  assert.match(body, /### Game version\nv4\.7\.0/);
  assert.match(body, /### Browser and device\nChrome 129 on Android/);

  const f = new URL(buildNewIssueUrl({ type: 'feature', title: 'More seeds', description: '' }));
  assert.equal(f.searchParams.get('labels'), 'community,feature');
  assert.equal(f.searchParams.get('title'), '[Feature] More seeds');
  assert.match(f.searchParams.get('body'), new RegExp(`### Game version\\nv${VERSION.replace(/\./g, '\\.')}`), 'defaults to the game version');
  assert.ok(!/Browser and device/.test(f.searchParams.get('body')), 'ideas skip the browser');

  const long = new URL(buildNewIssueUrl({ type: 'bug', title: 'x'.repeat(500), description: 'y'.repeat(20000) }));
  assert.equal(long.searchParams.get('title').length, '[Bug] '.length + TITLE_MAX);
  assert.ok(long.searchParams.get('body').length < BODY_MAX + 300);
  assert.ok(long.href.length < 12000, 'URL stays a sane length');
}

console.log('--- browser summary ---');
{
  assert.equal(describeBrowser('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'), 'Chrome 129 on Android');
  assert.equal(describeBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'), 'Safari 17 on iOS');
  assert.equal(describeBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0'), 'Edge 129 on Windows');
  assert.equal(describeBrowser('Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0'), 'Firefox 131 on Linux');
  assert.equal(describeBrowser(undefined), 'Unknown browser');
}

console.log('--- loading: mocked fetch, 10-minute cache, stale cache on failure ---');
{
  const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };
  const open = [raw(1, ['community', 'bug'], 2), { ...raw(2, ['community']), pull_request: {} }, raw(3, ['community'], 4)];
  const closed = [raw(4, ['community'], 0, { state: 'closed', state_reason: 'completed', closed_at: '2026-10-05T00:00:00Z' })];
  const calls = [];
  const okFetch = async (url, opts) => {
    calls.push(url);
    assert.ok(!opts?.headers?.Authorization, 'no token sent');
    let json;
    if (url.includes('state=open')) json = open;
    else if (url.includes('state=closed')) json = closed;
    else if (url.endsWith('/issues/4/comments?per_page=100')) json = [{ body: 'Shipped in v4.7.0' }];
    else throw new Error(`unexpected ${url}`);
    return { ok: true, status: 200, json: async () => json };
  };
  const store = memStore();
  const t0 = 1_000_000_000;
  let r = await loadCommunity({ fetchFn: okFetch, storage: store, now: t0 });
  assert.equal(r.error, null);
  assert.equal(r.fromCache, false);
  assert.ok(calls.every(u => u.startsWith(API)), 'only the public API of this repo');
  assert.equal(calls.length, 3, 'open + closed + one comment lookup');
  assert.deepEqual(r.issues.map(i => i.number).sort(), [1, 3, 4], 'PR dropped');
  assert.equal(r.shipped[4].v, '4.7.0');
  assert.ok(store.m.has(CACHE_KEY) && store.m.has(SHIPPED_KEY));

  // Within 10 minutes: no network
  calls.length = 0;
  r = await loadCommunity({ fetchFn: okFetch, storage: store, now: t0 + CACHE_MS - 1 });
  assert.equal(calls.length, 0);
  assert.equal(r.fromCache, true);
  assert.equal(r.shipped[4].v, '4.7.0');
  // Refresh within the first minute is ignored; after it, it fetches (shipped version stays known)
  r = await loadCommunity({ fetchFn: okFetch, storage: store, now: t0 + MIN_REFRESH_MS - 1, force: true });
  assert.equal(calls.length, 0);
  r = await loadCommunity({ fetchFn: okFetch, storage: store, now: t0 + MIN_REFRESH_MS, force: true });
  assert.equal(calls.length, 2, 'no comment lookup for a version already known');

  // After 10 minutes GitHub is down: the stale list is kept with an error
  const failFetch = async () => ({ ok: false, status: 403, json: async () => ({}) });
  r = await loadCommunity({ fetchFn: failFetch, storage: store, now: t0 + CACHE_MS * 3 });
  assert.match(r.error, /403/);
  assert.equal(r.issues.length, 3);

  // No cache and offline; storage that throws everywhere
  r = await loadCommunity({ fetchFn: async () => { throw new Error('offline'); }, storage: memStore(), now: t0 });
  assert.equal(r.issues.length, 0);
  assert.equal(r.error, 'offline');
  const bad = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  r = await loadCommunity({ fetchFn: okFetch, storage: bad, now: t0 });
  assert.equal(r.error, null);
  assert.equal(readCache(bad), null);
  const junk = memStore(); junk.setItem(CACHE_KEY, '{not json');
  assert.equal(readCache(junk), null);
}

console.log('--- wiring: tab in every nav, never locked, no player text as HTML ---');
{
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  assert.match(html, /<section id="tab-community" class="tab-view">/);
  assert.match(html, /<nav id="side-nav"[\s\S]*data-tab="community"[\s\S]*<\/nav>/);
  assert.match(html, /<div class="more-grid">[\s\S]*data-tab="community"/);
  assert.match(html, /css\/community\.css/);
  assert.ok(ALWAYS_UNLOCKED.includes('community'));
  const src = readFileSync(new URL('./js/ui/community.js', import.meta.url), 'utf8');
  assert.ok(!/innerHTML|insertAdjacentHTML|outerHTML/.test(src), 'community.js never writes HTML strings');
  assert.ok(!/Authorization|token/i.test(src.replace(/no token/gi, '')), 'no token in the client');
}

console.log('All R40 community tests passed.');
