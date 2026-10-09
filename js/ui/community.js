// Community tab (R40): players' bug reports and feature ideas, read from this repo's GitHub
// issues labelled `community`. Bugs come first, then features, each sorted by 👍; a Done list
// shows recently closed ones with the version they shipped in ("Shipped in vX.Y.Z" comment).
// Submitting opens a pre-filled GitHub "new issue" page; liking links to the issue to add 👍.
//
// Safety: reads the public REST API with no token. Player text is only ever set with
// textContent (escapeHtml is exported for anything that has to build markup). Responses are
// cached in localStorage for 10 minutes to stay far under GitHub's 60 requests/hour limit, and
// nothing touches the network until the tab is opened.
// The pure helpers at the top are exported for tests (test_r40_community.js).

import { VERSION } from '../version.js';
import { t } from '../i18n/index.js';
import { CommunityVotes, openVotes, likesByIssue, likesToGo, APPROVE_LIKES } from './communityVotes.js';

export const REPO = 'lyilyi1717/aetheria-clicker';
export const API = `https://api.github.com/repos/${REPO}`;
export const CACHE_KEY = 'AETHERIA_COMMUNITY_CACHE_V1';
export const SHIPPED_KEY = 'AETHERIA_COMMUNITY_SHIPPED_V1';
export const CACHE_MS = 10 * 60 * 1000;
export const MIN_REFRESH_MS = 60 * 1000;     // "Refresh" never hits GitHub more than once a minute
export const SHIPPED_RETRY_MS = 24 * 3600 * 1000;
export const HIDDEN_LABELS = ['wontfix', 'duplicate', 'invalid', 'spam'];
export const DONE_SHOWN = 10;
const SHIPPED_FETCHES = 3;                   // comment lookups per refresh, for the Done list
export const TITLE_MAX = 120;
export const BODY_MAX = 3000;                // keeps the new-issue URL well under browser limits

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const labelNames = (raw) => (Array.isArray(raw?.labels) ? raw.labels : [])
  .map(l => String(typeof l === 'string' ? l : l?.name ?? '').toLowerCase());

// Only github.com links are ever opened; anything else falls back to the issue number
export function issueUrl(number, htmlUrl) {
  const prefix = `https://github.com/${REPO}/issues/`;
  if (typeof htmlUrl === 'string' && htmlUrl.startsWith(prefix)) return htmlUrl;
  return prefix + (Number.parseInt(number, 10) || '');
}

// The few fields the tab uses, from a REST issue object (or null for PRs and junk)
export function normalizeIssue(raw) {
  if (!raw || typeof raw !== 'object' || raw.pull_request) return null;
  const number = Number.parseInt(raw.number, 10);
  if (!Number.isFinite(number)) return null;
  const likes = Number(raw.reactions?.['+1']);
  return {
    number,
    title: String(raw.title ?? '').slice(0, 300),
    labels: labelNames(raw),
    likes: Number.isFinite(likes) && likes > 0 ? likes : 0,
    url: issueUrl(number, raw.html_url),
    state: raw.state === 'closed' ? 'closed' : 'open',
    stateReason: raw.state_reason ?? null,
    createdAt: String(raw.created_at ?? ''),
    closedAt: String(raw.closed_at ?? '')
  };
}

// Shown in the tab: labelled community, not triaged away, and (when closed) actually done
export function isListed(issue) {
  if (!issue || !issue.labels.includes('community')) return false;
  if (issue.labels.some(l => HIDDEN_LABELS.includes(l))) return false;
  if (issue.state === 'closed' && issue.stateReason === 'not_planned') return false;
  return true;
}

export const isBug = (issue) => issue.labels.includes('bug');

// Most 👍 first; ties go to the older issue (it has been waiting longer)
export function byLikes(a, b) {
  return (b.likes - a.likes) || (a.number - b.number);
}

// Open issues → { bugs, features }, each sorted by 👍. Bugs are always worked on first.
export function groupOpen(issues) {
  const open = issues.filter(i => i && i.state === 'open' && isListed(i));
  return {
    bugs: open.filter(isBug).sort(byLikes),
    features: open.filter(i => !isBug(i)).sort(byLikes)
  };
}

// Recently closed (done) issues, newest first
export function doneList(issues, limit = DONE_SHOWN) {
  return issues.filter(i => i && i.state === 'closed' && isListed(i))
    .sort((a, b) => (b.closedAt > a.closedAt ? 1 : b.closedAt < a.closedAt ? -1 : b.number - a.number))
    .slice(0, limit);
}

// "Shipped in v4.7.0" in any comment (the latest one wins)
export function parseShippedVersion(comments) {
  let found = null;
  for (const c of Array.isArray(comments) ? comments : []) {
    const m = String(c?.body ?? '').match(/shipped in v?(\d+\.\d+\.\d+)/i);
    if (m) found = m[1];
  }
  return found;
}

// "Chrome 129 on Android" from a user agent string; never more than 80 characters
export function describeBrowser(ua) {
  const s = String(ua ?? '');
  const pick = (re) => s.match(re);
  let browser = 'Unknown browser';
  let m;
  if ((m = pick(/Edg(?:e|A|iOS)?\/(\d+)/))) browser = `Edge ${m[1]}`;
  else if ((m = pick(/(?:OPR|Opera)\/(\d+)/))) browser = `Opera ${m[1]}`;
  else if ((m = pick(/SamsungBrowser\/(\d+)/))) browser = `Samsung Internet ${m[1]}`;
  else if ((m = pick(/(?:Firefox|FxiOS)\/(\d+)/))) browser = `Firefox ${m[1]}`;
  else if ((m = pick(/(?:Chrome|CriOS)\/(\d+)/))) browser = `Chrome ${m[1]}`;
  else if ((m = pick(/Version\/(\d+)[\d.]* .*Safari\//))) browser = `Safari ${m[1]}`;
  let os = '';
  if (/Android/.test(s)) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(s)) os = 'iOS';
  else if (/Windows/.test(s)) os = 'Windows';
  else if (/Mac OS X|Macintosh/.test(s)) os = 'macOS';
  else if (/CrOS/.test(s)) os = 'ChromeOS';
  else if (/Linux/.test(s)) os = 'Linux';
  return (os ? `${browser} on ${os}` : browser).slice(0, 80);
}

// The pre-filled github.com "new issue" page for a submission
export function buildNewIssueUrl({ type, title, description, version = VERSION, browser = '' }) {
  const bug = type === 'bug';
  const cleanTitle = String(title ?? '').replace(/\s+/g, ' ').trim().slice(0, TITLE_MAX);
  const desc = String(description ?? '').trim().slice(0, BODY_MAX);
  const body = [
    bug ? '### What happened?' : '### Your idea',
    desc || '_No description given._',
    '',
    '### Game version',
    `v${String(version).replace(/^v/, '')}`,
    ...(bug ? ['', '### Browser and device', String(browser).slice(0, 80) || 'Unknown'] : []),
    '',
    '_Sent from the in-game Community tab._'
  ].join('\n');
  const q = [
    `labels=${encodeURIComponent(bug ? 'community,bug' : 'community,feature')}`,
    `title=${encodeURIComponent(`${bug ? '[Bug]' : '[Feature]'} ${cleanTitle}`)}`,
    `body=${encodeURIComponent(body)}`
  ].join('&');
  return `https://github.com/${REPO}/issues/new?${q}`;
}

// localStorage that may be missing or throw (private mode, file://)
function readJson(storage, key) {
  try {
    const s = storage?.getItem(key);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}
function writeJson(storage, key, value) {
  try { storage?.setItem(key, JSON.stringify(value)); } catch { /* quota or blocked */ }
}

export function readCache(storage) {
  const c = readJson(storage, CACHE_KEY);
  if (!c || !Number.isFinite(c.at) || !Array.isArray(c.issues)) return null;
  return { at: c.at, issues: c.issues.map(normalizeIssue).filter(Boolean), shipped: readJson(storage, SHIPPED_KEY) || {} };
}

async function getJson(fetchFn, url) {
  const res = await fetchFn(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res || !res.ok) throw new Error(`GitHub answered ${res?.status ?? 'nothing'}`);
  return res.json();
}

// Fresh cache → no network. Otherwise one request for open and one for closed community issues,
// plus a few comment lookups for Done items whose version isn't known yet. On failure the stale
// cache is kept. Returns { at, issues, shipped, error, fromCache }.
export async function loadCommunity({ fetchFn = globalThis.fetch, storage = globalThis.localStorage, now = Date.now(), force = false } = {}) {
  const cached = readCache(storage);
  const age = cached ? now - cached.at : Infinity;
  if (cached && (age < CACHE_MS && !(force && age >= MIN_REFRESH_MS))) return { ...cached, error: null, fromCache: true };
  try {
    const [open, closed] = await Promise.all([
      getJson(fetchFn, `${API}/issues?labels=community&state=open&per_page=100`),
      getJson(fetchFn, `${API}/issues?labels=community&state=closed&sort=updated&direction=desc&per_page=50`)
    ]);
    const issues = [...(Array.isArray(open) ? open : []), ...(Array.isArray(closed) ? closed : [])]
      .map(normalizeIssue).filter(Boolean);

    const shipped = { ...(cached?.shipped || readJson(storage, SHIPPED_KEY) || {}) };
    const missing = doneList(issues).filter(i => {
      const s = shipped[i.number];
      return !s || (!s.v && now - (s.at || 0) > SHIPPED_RETRY_MS);
    }).slice(0, SHIPPED_FETCHES);
    await Promise.all(missing.map(async (i) => {
      try {
        const v = parseShippedVersion(await getJson(fetchFn, `${API}/issues/${i.number}/comments?per_page=100`));
        shipped[i.number] = { v: v || '', at: now };
      } catch { /* try again next refresh */ }
    }));

    writeJson(storage, CACHE_KEY, { at: now, issues });
    writeJson(storage, SHIPPED_KEY, shipped);
    return { at: now, issues, shipped, error: null, fromCache: false };
  } catch (e) {
    if (cached) return { ...cached, error: e.message || 'offline', fromCache: true };
    return { at: 0, issues: [], shipped: {}, error: e.message || 'offline', fromCache: false };
  }
}

function agoText(ms, now = Date.now()) {
  const m = Math.floor((now - ms) / 60000);
  if (m < 1) return t('cm.just_now');
  if (m < 60) return t('cm.min_ago', { n: m });
  return t('cm.h_ago', { n: Math.floor(m / 60) });
}

// --- DOM -------------------------------------------------------------------------------------

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function extLink(href, cls, text) {
  const a = el('a', cls, text);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

export class CommunityUI {
  constructor(app) {
    this.app = app;
    this.data = null;
    this.loading = false;
    this.type = 'bug';
    this.wasOpen = false;
    // Requests from players without GitHub (Supabase, js/ui/communityVotes.js)
    this.votes = new CommunityVotes({ getCloud: () => this.app?.cloudSave || null });
  }

  init() {
    this.root = document.getElementById('community-root');
    if (!this.root) return;
    this.buildForm();
    this.status = el('p', 'cm-status');
    this.status.setAttribute('aria-live', 'polite');
    this.lists = el('div', 'cm-lists');
    this.root.append(this.status, this.lists);
    this.render();
  }

  // Called every frame from main.js; loads once each time the tab is opened (cache permitting)
  update(tab) {
    const open = tab === 'community';
    if (open && !this.wasOpen) { this.updateFormMode(); this.refresh(false); }
    this.wasOpen = open;
  }

  async refresh(force) {
    if (this.loading || !this.root) return;
    this.loading = true;
    this.render();
    try {
      const [data] = await Promise.all([loadCommunity({ force }), this.votes.load({ force })]);
      this.data = data;
    } finally {
      this.loading = false;
      this.render();
    }
  }

  buildForm() {
    const card = el('form', 'card cm-form');
    card.noValidate = true;
    card.append(el('h3', 'cm-h', t('cm.form_title')));
    card.append(el('p', 'cm-lead', t('cm.lead')));

    const seg = el('div', 'seg cm-type');
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', t('cm.type'));
    for (const [type, label] of [['bug', t('cm.bug')], ['feature', t('cm.idea')]]) {
      const b = el('button', '', label);
      b.type = 'button';
      b.dataset.type = type;
      b.setAttribute('aria-pressed', String(type === this.type));
      b.addEventListener('click', () => this.setType(type));
      seg.append(b);
    }
    this.segBtns = [...seg.querySelectorAll('button')];

    const titleField = el('label', 'cm-field');
    titleField.append(el('span', '', t('cm.title')));
    this.titleInput = el('input');
    this.titleInput.dir = 'auto';
    this.titleInput.maxLength = TITLE_MAX;
    this.titleInput.required = true;
    titleField.append(this.titleInput);

    const descField = el('label', 'cm-field');
    this.descLabel = el('span');
    descField.append(this.descLabel);
    this.descInput = el('textarea');
    this.descInput.dir = 'auto';
    this.descInput.rows = 4;
    this.descInput.maxLength = BODY_MAX;
    descField.append(this.descInput);

    this.attached = el('p', 'cm-attached');
    this.formNote = el('p', 'cm-note');
    this.formNote.setAttribute('aria-live', 'polite');
    this.submitBtn = el('button', 'btn btn-primary cm-submit', t('cm.open'));
    this.submitBtn.type = 'submit';
    // Signed in: the main button posts here (no GitHub needed) and this one opens GitHub instead
    this.githubBtn = el('button', 'btn btn-ghost btn-sm cm-github', t('cm.v.github_instead'));
    this.githubBtn.type = 'button';
    this.githubBtn.addEventListener('click', () => this.submit('github'));
    this.accountNote = el('p', 'cm-attached');
    const actions = el('div', 'cm-actions');
    actions.append(this.submitBtn, this.githubBtn);

    card.append(seg, titleField, descField, this.attached, this.formNote, actions, this.accountNote);
    card.addEventListener('submit', (e) => { e.preventDefault(); this.submit(); });
    this.root.append(card);
    this.setType(this.type);
    this.updateFormMode();
  }

  // Without GitHub: a game account posts here; the GitHub link stays as the other way in
  get canPostHere() { return this.votes.signedIn && this.votes.state !== 'off'; }

  updateFormMode() {
    if (!this.submitBtn) return;
    const here = this.canPostHere;
    this.submitBtn.textContent = here ? t('cm.v.post') : t('cm.open');
    this.githubBtn.hidden = !here;
    this.accountNote.replaceChildren();
    if (here) this.accountNote.textContent = t('cm.v.post_note', { n: APPROVE_LIKES });
    else if (this.votes.state !== 'off') {
      this.accountNote.append(t('cm.v.signin_note'), ' ');
      const go = el('button', 'btn btn-ghost btn-sm', t('cm.v.signin_go'));
      go.type = 'button';
      go.addEventListener('click', () => this.app?.switchTab?.('settings'));
      this.accountNote.append(go);
    }
  }

  setType(type) {
    this.type = type;
    for (const b of this.segBtns) b.setAttribute('aria-pressed', String(b.dataset.type === type));
    const bug = type === 'bug';
    this.titleInput.placeholder = bug ? t('cm.ph_bug') : t('cm.ph_idea');
    this.descLabel.textContent = bug ? t('cm.desc_bug') : t('cm.desc_idea');
    const browser = describeBrowser(globalThis.navigator?.userAgent);
    this.attached.textContent = t('cm.attached', { what: bug ? `v${VERSION} · ${browser}` : `v${VERSION}` });
  }

  async submit(via) {
    const title = this.titleInput.value.trim();
    if (title.length < 4) {
      this.formNote.textContent = t('cm.short_title');
      this.titleInput.focus();
      return;
    }
    if (via !== 'github' && this.canPostHere) {
      if (this.posting) return;
      this.posting = true;
      this.submitBtn.setAttribute('aria-disabled', 'true');
      this.formNote.textContent = t('cm.v.posting');
      const r = await this.votes.post({
        kind: this.type, title, body: this.descInput.value, version: VERSION,
        browser: this.type === 'bug' ? describeBrowser(globalThis.navigator?.userAgent) : ''
      });
      this.posting = false;
      this.submitBtn.removeAttribute('aria-disabled');
      if (!r.ok) { this.formNote.textContent = r.error; this.updateFormMode(); return; }
      this.titleInput.value = '';
      this.descInput.value = '';
      this.formNote.textContent = t('cm.v.posted', { n: APPROVE_LIKES });
      this.render();
      return;
    }
    this.formNote.textContent = t('cm.opens');
    const url = buildNewIssueUrl({
      type: this.type, title, description: this.descInput.value,
      browser: describeBrowser(globalThis.navigator?.userAgent)
    });
    globalThis.open?.(url, '_blank', 'noopener');
  }

  render() {
    if (!this.root) return;
    const d = this.data;
    this.status.replaceChildren();
    if (this.loading && !d) this.status.textContent = t('cm.loading');
    else if (d?.error && !d.issues.length) this.status.textContent = t('cm.unreachable');
    else if (d) {
      const parts = d.error ? t('cm.saved_list') : t('cm.updated', { ago: agoText(d.at) });
      this.status.append(el('span', '', `${parts} · `));
    }
    if (d || !this.loading) {
      const btn = el('button', 'btn btn-ghost btn-sm cm-refresh', this.loading ? t('cm.refreshing') : t('cm.refresh'));
      btn.type = 'button';
      btn.disabled = this.loading;
      btn.addEventListener('click', () => this.refresh(true));
      this.status.append(btn, ' ', extLink(`https://github.com/${REPO}/issues?q=is%3Aissue+label%3Acommunity`, 'cm-all', t('cm.all')));
    }

    this.updateFormMode();
    this.lists.replaceChildren();
    if (this.votes.state === 'on') this.lists.append(this.voteSection());
    if (!d) return;
    // A request that went to GitHub keeps its in-game likes: they count with the issue's 👍
    const extra = likesByIssue(this.votes.requests);
    const issues = d.issues.map(i => (extra[i.number] ? { ...i, likes: i.likes + extra[i.number] } : i));
    const { bugs, features } = groupOpen(issues);
    this.lists.append(
      this.section(t('cm.bugs'), t('cm.bugs_sub'), bugs, t('cm.bugs_empty')),
      this.section(t('cm.ideas'), t('cm.ideas_sub'), features, t('cm.ideas_empty')),
      this.doneSection(doneList(d.issues), d.shipped || {})
    );
  }

  // "Vote": requests posted in the game, waiting for likes before they go to GitHub
  voteSection() {
    const items = openVotes(this.votes.requests);
    const card = el('section', 'card cm-section cm-votes');
    const head = el('div', 'card-head');
    const h = el('h3', 'cm-h', t('cm.v.title'));
    h.append(' ', el('span', 'cm-count num', String(items.length)));
    head.append(h, el('span', 'cm-sub', t('cm.v.sub', { n: APPROVE_LIKES })));
    card.append(head);
    if (!items.length) { card.append(el('p', 'cm-empty', t('cm.v.empty'))); return card; }
    const signedIn = this.votes.signedIn;
    const me = this.votes.myId;
    const list = el('ol', 'cm-list');
    items.forEach((req, idx) => {
      const row = el('li', 'card-row cm-row');
      row.append(el('span', 'cm-rank num', `${idx + 1}`));
      const text = el('div', 'cm-text');
      const title = el('span', 'cm-title', req.title);
      title.dir = 'auto';
      const togo = likesToGo(req.likes);
      text.append(title, el('span', 'cm-meta num',
        `${req.kind === 'bug' ? t('cm.bug_word') : t('cm.idea_word')} · ${togo ? t('cm.v.to_go', { n: togo }) : t('cm.v.next_run')}`));
      row.append(text);

      const mine = !!me && req.userId === me;
      const liked = this.votes.myLikes.has(req.id);
      const like = el('button', `btn btn-sm cm-like${liked ? ' is-on' : ''}`);
      like.type = 'button';
      like.append(el('span', 'num', `👍 ${req.likes}`));
      like.setAttribute('aria-pressed', String(liked));
      like.setAttribute('aria-label', t('cm.likes_aria_here', { n: req.likes }));
      if (!signedIn || mine) {
        like.setAttribute('aria-disabled', 'true');
        like.title = mine ? t('cm.v.err_own') : t('cm.v.err_signin');
      }
      like.addEventListener('click', () => {
        if (!signedIn) { this.formNote.textContent = t('cm.v.err_signin'); return; }
        if (mine) return;
        this.act(() => this.votes.like(req.id, !liked));
      });
      const actions = el('div', 'cm-row-actions');
      actions.append(like);
      if (signedIn) {
        const extra = el('button', 'btn btn-ghost btn-sm', mine ? t('cm.v.delete') : t('cm.v.report'));
        extra.type = 'button';
        extra.addEventListener('click', () => {
          if (!globalThis.confirm?.(mine ? t('cm.v.delete_confirm') : t('cm.v.report_confirm'))) return;
          this.act(() => (mine ? this.votes.remove(req.id) : this.votes.report(req.id)));
        });
        actions.append(extra);
      }
      row.append(actions);
      list.append(row);
    });
    card.append(list);
    return card;
  }

  async act(fn) {
    if (this.busy) return;
    this.busy = true;
    try {
      const r = await fn();
      if (!r.ok) this.formNote.textContent = r.error;
    } finally {
      this.busy = false;
      this.render();
    }
  }

  section(title, sub, items, empty) {
    const card = el('section', 'card cm-section');
    const head = el('div', 'card-head');
    const h = el('h3', 'cm-h', title);
    h.append(' ', el('span', 'cm-count num', String(items.length)));
    head.append(h, el('span', 'cm-sub', sub));
    card.append(head);
    if (!items.length) { card.append(el('p', 'cm-empty', empty)); return card; }
    const list = el('ol', 'cm-list');
    items.forEach((issue, idx) => {
      const row = el('li', 'card-row cm-row');
      row.append(el('span', 'cm-rank num', `${idx + 1}`));
      const text = el('div', 'cm-text');
      const titleLink = extLink(issue.url, 'cm-title', issue.title);
      titleLink.dir = 'auto';
      text.append(titleLink, el('span', 'cm-meta num', `#${issue.number}`));
      const like = extLink(issue.url, 'btn btn-sm cm-like', '');
      like.append(el('span', 'num', `👍 ${issue.likes}`));
      like.setAttribute('aria-label', t('cm.likes_aria', { n: issue.likes }));
      like.title = t('cm.like_tip');
      row.append(text, like);
      list.append(row);
    });
    card.append(list);
    return card;
  }

  doneSection(items, shipped) {
    const card = el('section', 'card cm-section');
    const head = el('div', 'card-head');
    head.append(el('h3', 'cm-h', t('cm.done')), el('span', 'cm-sub', t('cm.done_sub')));
    card.append(head);
    if (!items.length) { card.append(el('p', 'cm-empty', t('cm.done_empty'))); return card; }
    const list = el('ul', 'cm-list');
    for (const issue of items) {
      const row = el('li', 'card-row cm-row is-owned');
      const text = el('div', 'cm-text');
      const titleLink = extLink(issue.url, 'cm-title', issue.title);
      titleLink.dir = 'auto';
      text.append(titleLink, el('span', 'cm-meta', `#${issue.number} · ${isBug(issue) ? t('cm.bug_word') : t('cm.idea_word')}`));
      const v = shipped[issue.number]?.v;
      row.append(text, el('span', 'chip life num', v ? `v${v}` : t('cm.shipped')));
      list.append(row);
    }
    card.append(list);
    return card;
  }
}
