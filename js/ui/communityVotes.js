// Community requests without GitHub (R40 follow-up). A signed-in player (Settings → Account)
// posts a bug or idea straight from the Community tab; it is public at once in the "Vote" list,
// where other signed-in players like it. At 2 likes the GitHub Action community-promote.yml
// turns it into a GitHub issue labelled `community`, and its in-game likes keep counting there.
// The server (supabase/community.sql) enforces the limits; this file checks the same first.
//
// REST only, no SDK, like js/ui/sharedNews.js. Reading uses the public key alone; posting,
// liking, reporting and deleting use the account's session. Nothing goes to GitHub from here.
//
// Free tier: the list is read only while the Community tab is open, at most every 30 minutes
// (cached in localStorage), and without the text bodies. A like updates the cached list in place.
//
// Safety: titles are written by other players and are only ever set with textContent.
import { SUPABASE_URL, SUPABASE_KEY } from '../engine/CloudSave.js';
import { BLOCKED_WORDS } from '../leaderboard.js';
import { t } from '../i18n/index.js';

export const APPROVE_LIKES = 2;                       // community-promote.yml posts at this many likes
export const VOTES_MAX_PER_DAY = 3;                   // same number as community_requests_guard()
export const VOTES_TITLE_MIN = 4;
export const VOTES_TITLE_MAX = 120;
export const VOTES_BODY_MAX = 2000;
export const VOTES_LIMIT = 100;
export const VOTES_CACHE_KEY = 'AETHERIA_COMMUNITY_VOTES_V1';
export const VOTES_CACHE_MS = 30 * 60 * 1000;         // re-read at most every 30 min per player
export const VOTES_MIN_REFRESH_MS = 5 * 60 * 1000;    // the Refresh button can't go below this
const COLS = 'id,user_id,kind,title,likes,status,github_issue,created_at';

export function feedPath() {
  return `community_requests?select=${COLS}&order=likes.desc,created_at.asc&limit=${VOTES_LIMIT}`;
}

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/** True when a word of the text starts with a blocked stem (same rule as the server). */
export function hasBlockedWord(text) {
  const words = String(text ?? '').toLowerCase().split(/[^a-z]+/);
  return words.some(w => w && BLOCKED_WORDS.some(b => w.startsWith(b)));
}

/** Checks a new request. Returns { ok: true, title, body } or { ok: false, error }. */
export function checkRequest(title, body) {
  const ti = clean(title, VOTES_TITLE_MAX);
  const bo = String(body ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, VOTES_BODY_MAX);
  if (ti.length < VOTES_TITLE_MIN) return { ok: false, error: t('cm.short_title') };
  if (hasBlockedWord(ti) || hasBlockedWord(bo)) return { ok: false, error: t('cm.v.err_blocked') };
  return { ok: true, title: ti, body: bo };
}

/** Rows from the server, cleaned; anything malformed is dropped. */
export function rowsToRequests(rows) {
  if (!Array.isArray(rows)) return [];
  const out = [];
  const seen = new Set();
  for (const r of rows) {
    const id = Number(r?.id);
    if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) continue;
    const title = clean(r.title, VOTES_TITLE_MAX);
    if (!title || !['bug', 'feature'].includes(r.kind)) continue;
    seen.add(id);
    const likes = Number(r.likes);
    const issue = Number(r.github_issue);
    out.push({
      id, title, kind: r.kind,
      userId: String(r.user_id || ''),
      likes: Number.isFinite(likes) && likes > 0 ? Math.floor(likes) : 0,
      status: r.status === 'posted' ? 'posted' : 'open',
      issue: Number.isSafeInteger(issue) && issue > 0 ? issue : null,
      at: Date.parse(r.created_at) || 0
    });
  }
  return out;
}

/** Requests still waiting for likes: bugs and ideas together, most liked first, then oldest. */
export function openVotes(requests) {
  return (requests || []).filter(r => r.status === 'open')
    .sort((a, b) => (b.likes - a.likes) || (a.at - b.at) || (a.id - b.id));
}

/** In-game likes of requests already on GitHub, by issue number (added to the issue's 👍). */
export function likesByIssue(requests) {
  const map = {};
  for (const r of requests || []) if (r.status === 'posted' && r.issue) map[r.issue] = (map[r.issue] || 0) + r.likes;
  return map;
}

export const likesToGo = (likes) => Math.max(0, APPROVE_LIKES - likes);

/** Player-readable message for a failed REST call (PostgREST error body, HTTP status). */
export function votesErrorMessage(status, body) {
  const hint = body?.hint || '';
  const msg = body?.message || '';
  if (hint === 'community_rate_limit' || /daily limit/i.test(msg)) return t('cm.v.err_rate', { max: VOTES_MAX_PER_DAY });
  if (hint === 'community_blocked' || /blocked word/i.test(msg)) return t('cm.v.err_blocked');
  if (hint === 'community_own') return t('cm.v.err_own');
  if (hint === 'community_missing') return t('cm.v.err_missing');
  if (status === 401 || status === 403) return t('cm.v.err_signin');
  return t('cm.v.err_failed', { s: status || '?' });
}

function readJson(storage, key) {
  try { const s = storage?.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; }
}
function writeJson(storage, key, value) {
  try { storage?.setItem(key, JSON.stringify(value)); } catch { /* quota or blocked */ }
}
async function isMissing(res) {
  if (res.status === 404) return true;
  if (res.status < 400) return false;
  try { const b = await res.clone().json(); return ['PGRST205', '42P01'].includes(b?.code); } catch { return false; }
}
async function bodyOf(res) {
  try { return await res.json(); } catch { return null; }
}

export class CommunityVotes {
  /** getCloud returns the CloudSave instance (R38) or null; the rest is injectable for tests. */
  constructor({ getCloud = () => null, fetchFn, storage = globalThis.localStorage, now, url = SUPABASE_URL, key = SUPABASE_KEY } = {}) {
    this.getCloud = getCloud;
    this.fetch = fetchFn || ((...a) => globalThis.fetch(...a));
    this.storage = storage;
    this.now = now || (() => Date.now());
    this.url = url;
    this.key = key;
    this.requests = [];
    this.myLikes = new Set();
    this.at = 0;
    this.state = 'loading';     // loading | on | off (table not set up) | error (unreachable)
    const c = readJson(storage, VOTES_CACHE_KEY);
    if (c && Number.isFinite(c.at) && Array.isArray(c.rows)) {
      this.requests = rowsToRequests(c.rows);
      this.at = c.at;
      this.cachedFor = c.user || '';
      this.myLikes = new Set(Array.isArray(c.liked) ? c.liked.map(Number) : []);
      this.state = 'on';
    }
  }

  get signedIn() { return !!this.getCloud()?.signedIn; }
  get myId() { return this.getCloud()?.session?.user_id || ''; }

  save() {
    const rows = this.requests.map(r => ({ id: r.id, user_id: r.userId, kind: r.kind, title: r.title, likes: r.likes,
      status: r.status, github_issue: r.issue, created_at: new Date(r.at).toISOString() }));
    writeJson(this.storage, VOTES_CACHE_KEY, { at: this.at, rows, user: this.myId, liked: [...this.myLikes] });
  }

  /** Reads the list unless the cache is fresh (30 min; Refresh may skip it after 5 min). */
  async load({ force = false } = {}) {
    const age = this.now() - this.at;
    const sameUser = (this.cachedFor ?? '') === this.myId;
    if (this.state === 'on' && sameUser && age < VOTES_CACHE_MS && !(force && age >= VOTES_MIN_REFRESH_MS)) return;
    let res;
    try {
      res = await this.fetch(`${this.url}/rest/v1/${feedPath()}`, { headers: { apikey: this.key } });
    } catch {
      if (this.state !== 'on') this.state = 'error';
      return;
    }
    if (await isMissing(res)) { this.state = 'off'; return; }
    if (!res.ok) { if (this.state !== 'on') this.state = 'error'; return; }
    this.requests = rowsToRequests(await bodyOf(res));
    this.myLikes = new Set();
    if (this.signedIn) {
      const r = await this.authed('community_likes?select=request_id');
      if (r.ok) {
        const rows = await bodyOf(r.res);
        if (Array.isArray(rows)) for (const x of rows) this.myLikes.add(Number(x.request_id));
      }
    }
    this.at = this.now();
    this.cachedFor = this.myId;
    this.state = 'on';
    this.save();
  }

  async authed(path, { method = 'GET', body, prefer } = {}) {
    const cloud = this.getCloud();
    const s = cloud ? await cloud.activeSession() : null;
    if (!s) return { ok: false, error: t('cm.v.err_signin') };
    const headers = { apikey: this.key, Authorization: `Bearer ${s.access_token}` };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (prefer) headers.Prefer = prefer;
    let res;
    try {
      res = await this.fetch(`${this.url}/rest/v1/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      return { ok: false, error: t('cm.v.err_network') };
    }
    if (await isMissing(res)) { this.state = 'off'; return { ok: false, error: t('cm.v.off') }; }
    return { ok: res.ok, res, status: res.status };
  }

  /** Posts a request. Returns { ok: true, request } or { ok: false, error }. */
  async post({ kind, title, body, version = '', browser = '' }) {
    const check = checkRequest(title, body);
    if (!check.ok) return check;
    const r = await this.authed(`community_requests?select=${COLS}`, {
      method: 'POST', prefer: 'return=representation',
      body: { kind: kind === 'bug' ? 'bug' : 'feature', title: check.title, body: check.body,
        game_version: String(version).slice(0, 20), browser: String(browser).slice(0, 80) }
    });
    if (r.error) return r;
    const data = await bodyOf(r.res);
    if (!r.ok) return { ok: false, error: votesErrorMessage(r.status, data) };
    const [request] = rowsToRequests(Array.isArray(data) ? data : [data]);
    if (request) { this.requests = [request, ...this.requests.filter(x => x.id !== request.id)]; this.save(); }
    return { ok: true, request };
  }

  /** Likes (on = true) or un-likes a request; the cached list is updated in place. */
  async like(id, on) {
    const r = on
      ? await this.authed('community_likes', { method: 'POST', body: { request_id: Number(id) }, prefer: 'return=minimal' })
      : await this.authed(`community_likes?request_id=eq.${Number(id)}`, { method: 'DELETE' });
    if (r.error) return r;
    if (!r.ok && !(on && r.status === 409)) return { ok: false, error: votesErrorMessage(r.status, await bodyOf(r.res)) };
    const req = this.requests.find(x => x.id === Number(id));
    const had = this.myLikes.has(Number(id));
    if (on && !had) { this.myLikes.add(Number(id)); if (req) req.likes += 1; }
    if (!on && had) { this.myLikes.delete(Number(id)); if (req) req.likes = Math.max(0, req.likes - 1); }
    this.save();
    return { ok: true };
  }

  /** Reports someone else's request; it disappears for this player right away. */
  async report(id) {
    const r = await this.authed('community_reports', { method: 'POST', body: { request_id: Number(id) }, prefer: 'return=minimal' });
    if (r.error) return r;
    if (!r.ok && r.status !== 409) return { ok: false, error: votesErrorMessage(r.status, await bodyOf(r.res)) };
    this.requests = this.requests.filter(x => x.id !== Number(id));
    this.save();
    return { ok: true };
  }

  /** Deletes one of the player's own requests (only while it is not on GitHub yet). */
  async remove(id) {
    const r = await this.authed(`community_requests?id=eq.${Number(id)}`, { method: 'DELETE' });
    if (r.error) return r;
    if (!r.ok) return { ok: false, error: votesErrorMessage(r.status, await bodyOf(r.res)) };
    this.requests = this.requests.filter(x => x.id !== Number(id));
    this.save();
    return { ok: true };
  }
}
