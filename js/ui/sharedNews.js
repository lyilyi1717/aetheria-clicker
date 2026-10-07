// Shared news (R39, shared part): headlines that signed-in players share with every player.
// Everyone sees the latest shared headlines in the news strip, signed in or not; sharing needs
// an account (Settings → Account, R38). The server (supabase/news.sql) enforces the limits:
// 120 characters, 3 posts per account per 24 h, a word filter, reports (3 hide a post) and an
// owner-only hide flag. This file checks the same things first so players get a clear message.
//
// REST only, no SDK, like js/leaderboard.js and js/engine/CloudSave.js. Reading the feed uses
// the public key alone; posting, deleting and reporting use the account's session.
//
// Safety: shared text is written by other players and is only ever set with textContent.
// Until the owner runs supabase/news.sql the table is missing: the strip shows local news only
// and Settings says shared news is not switched on yet.

import { SUPABASE_URL, SUPABASE_KEY } from '../engine/CloudSave.js';
import { BLOCKED_WORDS, validateName } from '../leaderboard.js';
import { formatDuration } from './offlineModal.js';
import { cleanEntryText, entryDir, NEWS_MAX_CHARS } from './newsTicker.js';
import { t } from '../i18n/index.js';

export const SHARED_MAX_PER_DAY = 3;                 // same number as news_posts_guard() in news.sql
export const SHARED_FEED_LIMIT = 30;                 // newest posts the strip rotates through
export const SHARED_FEED_DAYS = 7;                   // older posts drop out of the strip
export const SHARED_REFRESH_MS = 5 * 60 * 1000;      // re-read the feed while the page is open
export const NEWS_REPORTED_MAX = 200;                // reported post ids remembered in the save

const COLS = 'id,user_id,display_name,body,created_at';

/** True when a word of the text starts with a blocked stem (same rule as the server). */
export function hasBlockedWord(text) {
  const words = String(text ?? '').toLowerCase().split(/[^a-z]+/);
  return words.some(w => w && BLOCKED_WORDS.some(b => w.startsWith(b)));
}

/** The text that would be shared, or an error. Returns { ok: true, text } or { ok: false, error }. */
export function checkSharedText(text) {
  const clean = cleanEntryText(text);
  if (!clean) return { ok: false, error: t('news.err_empty') };
  if (hasBlockedWord(clean)) return { ok: false, error: t('news.sh.err_blocked') };
  return { ok: true, text: clean };
}

/** The name shown with shared posts: the News name, else the leaderboard name. '' when neither is valid. */
export function sharedName(settings) {
  for (const n of [settings?.news?.name, settings?.lbName]) {
    const name = String(n ?? '').trim();
    if (name && !validateName(name) && !hasBlockedWord(name)) return name;
  }
  return '';
}

/** Checks a name typed in Settings → News. Returns null when fine, else the message. */
export function checkSharedName(name) {
  const err = validateName(name);
  if (err) return err;
  return hasBlockedWord(name) ? t('lb.err.blocked') : null;
}

/** REST path for the public feed: newest first, the last SHARED_FEED_DAYS days. */
export function feedPath(now = Date.now()) {
  const since = new Date(now - SHARED_FEED_DAYS * 86400000).toISOString();
  return `news_posts?select=${COLS}&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=${SHARED_FEED_LIMIT}`;
}

/** Rows from the server, cleaned: anything malformed is dropped, text is re-cleaned. */
export function rowsToPosts(rows) {
  if (!Array.isArray(rows)) return [];
  const out = [];
  const seen = new Set();
  for (const r of rows) {
    const id = Number(r?.id);
    if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) continue;
    const text = cleanEntryText(r.body);
    const name = cleanEntryText(r.display_name).slice(0, 20);
    if (!text || !name) continue;
    seen.add(id);
    out.push({ id, userId: String(r.user_id || ''), name, text, at: Date.parse(r.created_at) || 0 });
    if (out.length >= SHARED_FEED_LIMIT) break;
  }
  return out;
}

/**
 * Strip items for shared posts: not the ones this player reported, not their own posts that are
 * already in the strip as a local entry, and none at all when they turned shared news off.
 */
export function sharedQueueItems(posts, news, myId = '') {
  if (!Array.isArray(posts) || news?.showShared === false) return [];
  const reported = new Set(news?.reported || []);
  const own = new Set((news?.entries || []).map(e => e.text));
  return posts
    .filter(p => !reported.has(p.id) && !(myId && p.userId === myId && own.has(p.text)))
    .map(p => ({ text: t('news.sh.item', { text: p.text, name: p.name }), kind: 'shared', dir: entryDir(p.text) }));
}

/** Player-readable message for a failed REST call (PostgREST error body, HTTP status). */
export function sharedErrorMessage(status, body) {
  const hint = body?.hint || '';
  if (hint === 'news_rate_limit' || /daily limit/i.test(body?.message || '')) return t('news.sh.err_rate', { max: SHARED_MAX_PER_DAY });
  if (hint === 'news_blocked' || /blocked word/i.test(body?.message || '')) return t('news.sh.err_blocked');
  if (hint === 'news_own_post') return t('news.sh.err_own');
  if (status === 401 || status === 403) return t('news.sh.err_signin');
  return t('news.sh.err_failed', { s: status || '?' });
}

export function agoShort(ms, now = Date.now()) {
  const s = Math.max(0, (now - ms) / 1000);
  if (s < 45) return t('cm.just_now');
  return t('acct.ago', { d: formatDuration(s) });
}

async function isMissing(res) {
  if (res.status === 404) return true;
  if (res.status < 400) return false;
  try { const b = await res.clone().json(); return ['PGRST205', '42P01'].includes(b?.code); } catch { return false; }
}

async function bodyOf(res) {
  try { return await res.json(); } catch { return null; }
}

// ---------------------------------------------------------------------------------------------
// Client

export class SharedNews {
  /** getCloud returns the CloudSave instance (R38) or null; everything else is injectable for tests. */
  constructor({ getCloud = () => null, fetchFn, now, url = SUPABASE_URL, key = SUPABASE_KEY } = {}) {
    this.getCloud = getCloud;
    this.fetch = fetchFn || ((...a) => globalThis.fetch(...a));
    this.now = now || (() => Date.now());
    this.url = url;
    this.key = key;
    this.posts = [];
    this.state = 'loading';     // loading | on | off (table missing) | error (unreachable)
    this.loadedAt = 0;
    this.listeners = new Set();
    this.timer = null;
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { for (const fn of this.listeners) { try { fn(this); } catch (e) { console.error(e); } } }

  get signedIn() { return !!this.getCloud()?.signedIn; }
  get myId() { return this.getCloud()?.session?.user_id || ''; }

  /** Redraws (Share buttons, Report) when the player signs in or out, not on every sync status. */
  watchAccount(cloud) {
    if (!cloud?.onChange) return;
    let who = this.signedIn ? this.myId : null;
    cloud.onChange(() => {
      const now = this.signedIn ? this.myId : null;
      if (now !== who) { who = now; this.emit(); }
    });
  }

  /** Reads the feed now, then every SHARED_REFRESH_MS while the page is visible. */
  start() {
    this.load();
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (globalThis.document?.visibilityState === 'hidden') return;
      this.load();
    }, SHARED_REFRESH_MS);
  }

  async load() {
    let res;
    try {
      res = await this.fetch(`${this.url}/rest/v1/${feedPath(this.now())}`, { headers: { apikey: this.key } });
    } catch {
      if (this.state !== 'on') this.state = 'error';
      this.emit();
      return false;
    }
    if (await isMissing(res)) { this.state = 'off'; this.posts = []; this.emit(); return false; }
    if (!res.ok) { if (this.state !== 'on') this.state = 'error'; this.emit(); return false; }
    this.posts = rowsToPosts(await bodyOf(res));
    this.state = 'on';
    this.loadedAt = this.now();
    this.emit();
    return true;
  }

  async authed(path, { method = 'GET', body, prefer } = {}) {
    const cloud = this.getCloud();
    const s = cloud ? await cloud.activeSession() : null;
    if (!s) return { ok: false, error: t('news.sh.err_signin') };
    const headers = { apikey: this.key, Authorization: `Bearer ${s.access_token}` };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (prefer) headers.Prefer = prefer;
    let res;
    try {
      res = await this.fetch(`${this.url}/rest/v1/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      return { ok: false, error: t('news.sh.err_network') };
    }
    if (await isMissing(res)) { this.state = 'off'; this.emit(); return { ok: false, error: t('news.sh.off') }; }
    return { ok: res.ok, res, status: res.status };
  }

  /** Shares a headline. Returns { ok: true, post } or { ok: false, error }. */
  async post(text, name) {
    const check = checkSharedText(text);
    if (!check.ok) return check;
    if (!name) return { ok: false, error: t('news.sh.err_name') };
    const r = await this.authed(`news_posts?select=${COLS}`, {
      method: 'POST', body: { display_name: name, body: check.text }, prefer: 'return=representation'
    });
    if (r.error) return r;
    const data = await bodyOf(r.res);
    if (!r.ok) return { ok: false, error: sharedErrorMessage(r.status, data) };
    const [post] = rowsToPosts(Array.isArray(data) ? data : [data]);
    if (post) this.posts = [post, ...this.posts.filter(p => p.id !== post.id)].slice(0, SHARED_FEED_LIMIT);
    this.emit();
    return { ok: true, post };
  }

  /** Deletes one of the player's own shared posts. */
  async remove(id) {
    const r = await this.authed(`news_posts?id=eq.${Number(id)}`, { method: 'DELETE' });
    if (r.error) return r;
    if (!r.ok) return { ok: false, error: sharedErrorMessage(r.status, await bodyOf(r.res)) };
    this.posts = this.posts.filter(p => p.id !== id);
    this.emit();
    return { ok: true };
  }

  /** Reports someone else's post. Reporting twice counts once (the server answers 409). */
  async report(id) {
    const r = await this.authed('news_reports', { method: 'POST', body: { post_id: Number(id) }, prefer: 'return=minimal' });
    if (r.error) return r;
    if (!r.ok && r.status !== 409) return { ok: false, error: sharedErrorMessage(r.status, await bodyOf(r.res)) };
    return { ok: true };
  }
}

/** Remembers a reported post so it never shows again for this player. */
export function markReported(news, id) {
  const list = (news.reported || []).filter(x => x !== id);
  list.push(id);
  news.reported = list.slice(-NEWS_REPORTED_MAX);
}

// ---------------------------------------------------------------------------------------------
// Settings → News: share buttons on the player's own entries and the "Shared with every
// player" section. renderNewsSettings (js/ui/newsTicker.js) calls these through sharedNewsHooks().

/** What renderNewsSettings needs from shared news. */
export function sharedNewsHooks(shared, settings) {
  return {
    entryButton: (entry, say, onChange) => shareButton(shared, settings, entry, say, onChange),
    renderSection: (box, say, onChange) => renderSharedSection(box, shared, settings, say, onChange),
    subscribe: (fn) => shared.onChange(fn)
  };
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/** The Share button for one of the player's own entries (null when sharing is not possible). */
export function shareButton(shared, settings, entry, say, onChange) {
  if (!shared || shared.state === 'off' || !shared.signedIn) return null;
  const done = shared.posts.some(p => p.userId === shared.myId && p.text === entry.text);
  const btn = el('button', `btn btn-sm ${done ? 'btn-ghost' : 'btn-aether'}`, done ? t('news.sh.shared') : t('news.sh.share'));
  btn.type = 'button';
  if (done) { btn.setAttribute('aria-disabled', 'true'); return btn; }
  btn.setAttribute('aria-label', t('news.sh.share_aria', { text: entry.text }));
  btn.addEventListener('click', async () => {
    if (btn.getAttribute('aria-disabled') === 'true') return;
    const name = sharedName(settings);
    if (!name) { say(t('news.sh.err_name'), 'bad'); return; }
    btn.setAttribute('aria-disabled', 'true');
    btn.textContent = t('news.sh.sharing');
    const r = await shared.post(entry.text, name);
    if (!r.ok) {
      btn.removeAttribute('aria-disabled');
      btn.textContent = t('news.sh.share');
      say(r.error, 'bad');
      return;
    }
    say(t('news.sh.done'), 'ok');
    onChange?.();
  });
  return btn;
}

/** The "Shared with every player" section: show toggle, name, rules, latest posts with Report / Delete. */
export function renderSharedSection(box, shared, settings, say, onChange) {
  box.replaceChildren();
  const news = settings.news;
  box.append(el('h4', 'news-list-head', t('news.sh.title')));

  const toggle = el('label', 'settings-option');
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = news.showShared !== false;
  toggle.append(cb, el('span', null, t('news.sh.show')));
  cb.addEventListener('change', () => { news.showShared = cb.checked; onChange?.(); });
  box.append(toggle);

  if (shared.state === 'off') { box.append(el('p', 'news-note', t('news.sh.off'))); return; }

  if (!shared.signedIn) {
    box.append(el('p', 'news-note', t('news.sh.signin')));
  } else {
    // Name shown with shared posts (kept apart from the leaderboard name so sharing never
    // puts anyone on the leaderboard)
    const form = el('form', 'news-form');
    const label = el('label', 'news-label', t('news.sh.name_label'));
    label.htmlFor = 'news-name-input';
    const row = el('div', 'news-row');
    const input = document.createElement('input');
    input.id = 'news-name-input';
    input.className = 'news-input';
    input.maxLength = 20;
    input.dir = 'ltr';
    input.autocomplete = 'off';
    input.placeholder = t('news.sh.name_ph');
    input.value = sharedName(settings);
    const save = el('button', 'btn btn-sm btn-aether', t('news.sh.name_save'));
    save.type = 'submit';
    row.append(input, save);
    form.append(label, row);
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const err = checkSharedName(input.value);
      if (err) { say(err, 'bad'); return; }
      news.name = input.value.trim();
      say(t('news.sh.name_saved'), 'ok');
      onChange?.();
    });
    box.append(form, el('p', 'news-note', t('news.sh.rules', { max: SHARED_MAX_PER_DAY })));
  }

  box.append(el('div', 'news-list-head', t('news.sh.latest')));
  const list = el('ul', 'news-list');
  box.append(list);
  if (shared.state === 'loading') { list.append(el('li', 'news-empty', t('news.sh.loading'))); return; }
  if (shared.state === 'error') { list.append(el('li', 'news-empty', t('news.sh.unreachable'))); return; }
  const reported = new Set(news.reported || []);
  const posts = shared.posts.filter(p => !reported.has(p.id));
  if (!posts.length) { list.append(el('li', 'news-empty', t('news.sh.none'))); return; }
  const me = shared.myId;
  const now = shared.now();
  for (const p of posts) {
    const li = el('li', 'news-entry news-shared');
    const body = el('div', 'news-entry-body');
    const text = el('span', 'news-entry-text', p.text);
    text.dir = entryDir(p.text);
    const mine = !!me && p.userId === me;
    const meta = el('span', 'news-entry-meta', t('news.sh.meta', { name: mine ? t('news.sh.by_you') : p.name, ago: agoShort(p.at, now) }));
    body.append(text, meta);
    li.append(body);
    if (shared.signedIn) {
      const btn = el('button', 'btn btn-sm btn-danger', mine ? t('news.delete') : t('news.sh.report'));
      btn.type = 'button';
      btn.setAttribute('aria-label', mine ? t('news.sh.delete_aria', { text: p.text }) : t('news.sh.report_aria', { text: p.text }));
      btn.addEventListener('click', async () => {
        if (btn.getAttribute('aria-disabled') === 'true') return;
        btn.setAttribute('aria-disabled', 'true');
        const r = mine ? await shared.remove(p.id) : await shared.report(p.id);
        if (!r.ok) { btn.removeAttribute('aria-disabled'); say(r.error, 'bad'); return; }
        if (!mine) { markReported(news, p.id); say(t('news.sh.reported'), 'ok'); }
        onChange?.();
      });
      li.append(btn);
    }
    list.append(li);
  }
}
