// News ticker (R39, local part): a thin strip under the header that scrolls one news item at a
// time. Items are built-in (tips, flavour lines, "new in this version" from CHANGELOG) plus the
// player's own entries, added and deleted in Settings → News and saved as settings.news.
//
// Direction follows each item's own script: Latin text moves right-to-left (classic ticker),
// Arabic text moves left-to-right, so a mixed list reads correctly. Hover or tap pauses the
// strip; with Reduced Motion on it stands still and swaps to the next item every few seconds.
//
// Safety: entry text is player-written and is only ever set with textContent.
// Shared posting (other players' entries via Supabase) is not built yet; it waits for an owner
// decision. The pure helpers at the top are exported for tests (test_r39_news.js).

import { isReducedMotion } from './motion.js';

export const NEWS_MAX_CHARS = 120;
export const NEWS_MAX_ENTRIES = 20;
export const SPEED_PX_PER_S = 70;      // scrolling speed; a 120-char entry crosses a phone in ~15 s
export const STATIC_SWAP_MS = 6000;    // Reduced Motion: one item every 6 s, no movement

// Every player-visible string, in one place so it can move to t() keys later
export const NEWS_STRINGS = {
  stripLabel: 'News',
  pausedHint: 'Paused. Tap to resume.',
  newInVersion: (v, title) => `New in v${v}: ${title}`,
  yours: 'Your news',
  addLabel: 'Add a news entry',
  addPlaceholder: 'Write a headline (up to 120 characters)',
  addButton: 'Add',
  deleteButton: 'Delete',
  deleteAria: (text) => `Delete "${text}"`,
  showStrip: 'Show the news strip',
  empty: 'No entries yet. Yours show up in the strip between the built-in news.',
  counter: (n, max) => `${n} / ${max}`,
  errEmpty: 'Write something first.',
  errFull: (max) => `You can keep up to ${max} entries. Delete one to add another.`,
  errDuplicate: 'That entry is already in your list.',
  localOnly: 'Entries stay in this browser; other players don\'t see them.'
};

export const BUILT_IN_TIPS = [
  'Tip: every 20 clicks in a row starts a Frenzy. Keep tapping to stack it.',
  'Tip: Golden Anomalies drift across the screen now and then. Tap one for a jackpot.',
  'Tip: every Crude Reserve you have ever earned keeps boosting production, even after you spend it.',
  'Tip: Chrono Sand builds up while you are away. Spend it on Fast Forward.',
  'Tip: open Settings to change the theme, number notation or motion.'
];

export const BUILT_IN_FLAVOUR = [
  'Refinery workers report the pumps are humming louder than usual.',
  'Bazaar traders say Oil Shale prices are "probably fine".',
  'A camel caravan was seen heading for the Void Tower. Nobody knows why.',
  'The Dallah is hot and the qahwa is fresh.',
  'Scholars debate whether the Chronicle writes itself.'
];

// Arabic script blocks (Arabic, Supplement, Extended-A, Presentation Forms A and B)
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const STRONG = /[\p{L}]/u;

/** 'rtl' when the first letter of the text is Arabic, else 'ltr' (digits and symbols are neutral). */
export function entryDir(text) {
  for (const ch of String(text ?? '')) {
    if (ARABIC.test(ch)) return 'rtl';
    if (STRONG.test(ch)) return 'ltr';
  }
  return 'ltr';
}

/** One line of plain text: no control characters, single spaces, at most NEWS_MAX_CHARS characters. */
export function cleanEntryText(text) {
  const flat = String(text ?? '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return Array.from(flat).slice(0, NEWS_MAX_CHARS).join('').trim();
}

export function defaultNewsState() {
  return { hidden: false, entries: [] };
}

/** Accepts anything a save might hold (missing, old, hand-edited) and returns a valid news state. */
export function sanitizeNews(raw) {
  const out = defaultNewsState();
  if (!raw || typeof raw !== 'object') return out;
  out.hidden = raw.hidden === true;
  const seen = new Set();
  const list = Array.isArray(raw.entries) ? raw.entries : [];
  for (const e of list) {
    const text = cleanEntryText(typeof e === 'string' ? e : e?.text);
    if (!text) continue;
    let id = typeof e?.id === 'string' && e.id ? e.id.slice(0, 32) : '';
    if (!id || seen.has(id)) id = `n${out.entries.length}-${seen.size}`;
    seen.add(id);
    const at = Number.isFinite(e?.at) ? e.at : 0;
    out.entries.push({ id, text, at });
    if (out.entries.length >= NEWS_MAX_ENTRIES) break;
  }
  return out;
}

/** Adds an entry in place. Returns { ok: true, entry } or { ok: false, error }. */
export function addNewsEntry(news, text, now = Date.now()) {
  const clean = cleanEntryText(text);
  if (!clean) return { ok: false, error: NEWS_STRINGS.errEmpty };
  if (news.entries.length >= NEWS_MAX_ENTRIES) return { ok: false, error: NEWS_STRINGS.errFull(NEWS_MAX_ENTRIES) };
  if (news.entries.some(e => e.text === clean)) return { ok: false, error: NEWS_STRINGS.errDuplicate };
  const entry = { id: `n${now.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`, text: clean, at: now };
  news.entries.push(entry);
  return { ok: true, entry };
}

export function removeNewsEntry(news, id) {
  const before = news.entries.length;
  news.entries = news.entries.filter(e => e.id !== id);
  return news.entries.length !== before;
}

/** Built-in items: "new in this version" for the newest CHANGELOG entry, then tips and flavour, alternating. */
export function builtInItems(changelog = []) {
  const items = [];
  const top = changelog[0];
  if (top?.version && top?.title) items.push({ text: NEWS_STRINGS.newInVersion(top.version, top.title), kind: 'new' });
  const n = Math.max(BUILT_IN_TIPS.length, BUILT_IN_FLAVOUR.length);
  for (let i = 0; i < n; i++) {
    if (BUILT_IN_TIPS[i]) items.push({ text: BUILT_IN_TIPS[i], kind: 'tip' });
    if (BUILT_IN_FLAVOUR[i]) items.push({ text: BUILT_IN_FLAVOUR[i], kind: 'flavour' });
  }
  return items;
}

/** The rotation: built-in items with one player entry after every built-in one, until both run out. */
export function buildQueue(news, changelog = []) {
  const built = builtInItems(changelog);
  const own = (news?.entries || []).map(e => ({ text: e.text, kind: 'player' }));
  const out = [];
  const n = Math.max(built.length, own.length);
  for (let i = 0; i < n; i++) {
    if (built[i]) out.push(built[i]);
    if (own[i]) out.push(own[i]);
  }
  return out.map(item => ({ ...item, dir: entryDir(item.text) }));
}

// ---------------------------------------------------------------------------------------------
// DOM

const KIND_ICON = { new: '✨', tip: '💡', flavour: '📰', player: '🗞️' };

export class NewsTicker {
  /** `getNews` returns the live settings.news object; `changelog` is CHANGELOG from version.js. */
  constructor(getNews, changelog) {
    this.getNews = getNews;
    this.changelog = changelog;
    this.index = -1;
    this.anim = null;
    this.timer = null;
    this.hovered = false;
    this.tapPaused = false;
    this.el = null;
  }

  mount(afterEl) {
    if (!afterEl || this.el) return;
    const el = document.createElement('div');
    el.id = 'news-ticker';
    el.className = 'news-ticker';
    el.setAttribute('role', 'marquee');
    el.setAttribute('aria-label', NEWS_STRINGS.stripLabel);
    el.tabIndex = 0;
    const tag = document.createElement('span');
    tag.className = 'news-tag';
    tag.textContent = NEWS_STRINGS.stripLabel;
    const track = document.createElement('div');
    track.className = 'news-track';
    const item = document.createElement('span');
    item.className = 'news-item';
    track.appendChild(item);
    el.append(tag, track);
    afterEl.insertAdjacentElement('afterend', el);
    this.el = el;
    this.track = track;
    this.item = item;

    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { this.hovered = true; this.syncPause(); } });
    el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { this.hovered = false; this.syncPause(); } });
    el.addEventListener('click', (e) => {
      if (e.pointerType === 'mouse') return;   // mouse pauses by hovering
      this.tapPaused = !this.tapPaused;
      this.syncPause();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      this.tapPaused = !this.tapPaused;
      this.syncPause();
    });
    this.refresh();
  }

  get paused() { return this.hovered || this.tapPaused; }

  syncPause() {
    if (!this.el) return;
    this.el.classList.toggle('is-paused', this.paused);
    this.el.title = this.tapPaused ? NEWS_STRINGS.pausedHint : '';
    if (this.anim) { if (this.paused) this.anim.pause(); else this.anim.play(); }
  }

  /** Re-read settings (after Settings → News changes): show/hide and rebuild the rotation. */
  refresh() {
    if (!this.el) return;
    const news = this.getNews();
    const hidden = !!news?.hidden;
    this.el.hidden = hidden;
    this.stop();
    this.queue = buildQueue(news, this.changelog);
    if (hidden || !this.queue.length) return;
    if (this.index >= this.queue.length) this.index = -1;
    this.next();
  }

  stop() {
    if (this.anim) { this.anim.onfinish = null; this.anim.cancel(); this.anim = null; }
    clearTimeout(this.timer);
    this.timer = null;
  }

  next() {
    if (!this.el || this.el.hidden || !this.queue.length) return;
    this.index = (this.index + 1) % this.queue.length;
    const entry = this.queue[this.index];
    this.item.textContent = `${KIND_ICON[entry.kind] || ''} ${entry.text}`.trim();
    this.item.dir = entry.dir;
    this.item.dataset.kind = entry.kind;
    this.el.dataset.dir = entry.dir;

    if (isReducedMotion() || typeof this.item.animate !== 'function') {
      this.el.classList.add('is-static');
      const tick = () => {
        if (this.paused) { this.timer = setTimeout(tick, 500); return; }
        this.next();
      };
      this.timer = setTimeout(tick, STATIC_SWAP_MS);
      return;
    }
    this.el.classList.remove('is-static');
    const trackW = this.track.clientWidth;
    const itemW = this.item.scrollWidth;
    // ltr text enters from the right edge and leaves on the left; rtl text does the opposite
    const from = entry.dir === 'rtl' ? -itemW : trackW;
    const to = entry.dir === 'rtl' ? trackW : -itemW;
    const ms = Math.max(4000, (Math.abs(to - from) / SPEED_PX_PER_S) * 1000);
    this.anim = this.item.animate(
      [{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }],
      { duration: ms, easing: 'linear' }
    );
    if (this.paused) this.anim.pause();
    this.anim.onfinish = () => { this.anim = null; this.next(); };
  }
}

/** Settings → News: add box with a character counter, own-entry list with delete, show-strip toggle. */
export function renderNewsSettings(container, settings, onChange) {
  if (!container) return;
  settings.news = sanitizeNews(settings.news);
  container.replaceChildren();

  const toggle = document.createElement('label');
  toggle.className = 'settings-option';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = !settings.news.hidden;
  const cbText = document.createElement('span');
  cbText.textContent = NEWS_STRINGS.showStrip;
  toggle.append(cb, cbText);
  cb.addEventListener('change', () => { settings.news.hidden = !cb.checked; onChange?.(); });

  const form = document.createElement('form');
  form.className = 'news-form';
  const label = document.createElement('label');
  label.className = 'news-label';
  label.htmlFor = 'news-input';
  label.textContent = NEWS_STRINGS.addLabel;
  const row = document.createElement('div');
  row.className = 'news-row';
  const input = document.createElement('input');
  input.id = 'news-input';
  input.type = 'text';
  input.className = 'news-input';
  input.maxLength = NEWS_MAX_CHARS;
  input.placeholder = NEWS_STRINGS.addPlaceholder;
  input.dir = 'auto';
  input.autocomplete = 'off';
  const add = document.createElement('button');
  add.type = 'submit';
  add.className = 'btn btn-aether';
  add.textContent = NEWS_STRINGS.addButton;
  row.append(input, add);
  const meta = document.createElement('div');
  meta.className = 'news-meta';
  const msg = document.createElement('span');
  msg.className = 'news-msg';
  msg.setAttribute('aria-live', 'polite');
  const count = document.createElement('span');
  count.className = 'news-count num';
  meta.append(msg, count);
  form.append(label, row, meta);

  const head = document.createElement('div');
  head.className = 'news-list-head';
  const list = document.createElement('ul');
  list.className = 'news-list';
  const note = document.createElement('p');
  note.className = 'news-note';
  note.textContent = NEWS_STRINGS.localOnly;

  const updateCount = () => { count.textContent = NEWS_STRINGS.counter(Array.from(input.value).length, NEWS_MAX_CHARS); };
  const renderList = () => {
    list.replaceChildren();
    const entries = settings.news.entries;
    head.textContent = `${NEWS_STRINGS.yours} (${entries.length} / ${NEWS_MAX_ENTRIES})`;
    if (!entries.length) {
      const li = document.createElement('li');
      li.className = 'news-empty';
      li.textContent = NEWS_STRINGS.empty;
      list.appendChild(li);
      return;
    }
    for (const e of entries) {
      const li = document.createElement('li');
      li.className = 'news-entry';
      const text = document.createElement('span');
      text.className = 'news-entry-text';
      text.dir = entryDir(e.text);
      text.textContent = e.text;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn btn-sm btn-danger';
      del.textContent = NEWS_STRINGS.deleteButton;
      del.setAttribute('aria-label', NEWS_STRINGS.deleteAria(e.text));
      del.addEventListener('click', () => {
        removeNewsEntry(settings.news, e.id);
        renderList();
        onChange?.();
      });
      li.append(text, del);
      list.appendChild(li);
    }
  };

  input.addEventListener('input', () => { msg.textContent = ''; updateCount(); });
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const res = addNewsEntry(settings.news, input.value);
    if (!res.ok) { msg.textContent = res.error; return; }
    input.value = '';
    msg.textContent = '';
    updateCount();
    renderList();
    onChange?.();
  });

  container.append(toggle, form, head, list, note);
  updateCount();
  renderList();
}
