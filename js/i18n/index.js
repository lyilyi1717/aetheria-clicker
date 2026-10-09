// i18n layer (R37). `t(key, params)` looks the key up in the active language's table
// (js/i18n/ar.js for Arabic) and falls back to English (js/i18n/en.js), then to the key itself.
//
// Placeholders are `{name}`. A name missing from `params` is filled from the game terms in
// js/data/strings.js (`{currency}` → "Oil" / "النفط", `{reset1}`, `{reset2Currency}` …), so the
// tables never hard-code a re-themeable word. In Arabic, a parameter that holds a number is wrapped
// in Unicode first-strong isolates so "1.5M", "+12%" and "x3" keep their left-to-right order
// inside right-to-left text.
//
// Static markup in index.html carries `data-i18n="key"` (text), `data-i18n-html="key"` (markup
// from our own tables), and `data-i18n-title`, `data-i18n-aria-label`, `data-i18n-alt`,
// `data-i18n-hint` (the attribute of that name); `applyI18n()` fills them on load.

import EN from './en.js';
import AR, { AR_TERMS } from './ar.js';
import { getLang, isRtl, LANGS, LANG_STORAGE_KEY, normalizeLang, storedLang, DEFAULT_LANG } from './lang.js';
import { TERMS_EN } from '../data/strings.js';

export { getLang, isRtl, LANGS, LANG_STORAGE_KEY, normalizeLang, DEFAULT_LANG };

const TABLES = { en: EN, ar: AR };
const TERM_TABLES = { en: TERMS_EN, ar: { ...TERMS_EN, ...AR_TERMS } };
const FSI = '⁨';
const PDI = '⁩';
const HAS_DIGIT = /\d/;
const HAS_TAG = /[<>]/;

function fill(str, params) {
  if (str.indexOf('{') < 0) return str;
  const terms = TERM_TABLES[getLang()] || TERMS_EN;
  const value = (name) => {
    const v = params && Object.prototype.hasOwnProperty.call(params, name) ? params[name] : terms[name];
    return v === undefined || v === null ? null : String(v);
  };
  if (!isRtl()) return str.replace(/\{(\w+)\}/g, (m, name) => value(name) ?? m);
  // Right to left: a number keeps its sign and unit with it ("+12%", "×3", "-4%") inside one
  // left-to-right isolate, so it reads "+12%" and not "%12+".
  return str.replace(/([+\-−×]?)\{(\w+)\}(%?|\/\d+)/g, (m, sign, name, suffix) => {
    const v = value(name);
    if (v === null) return m;
    if (!HAS_DIGIT.test(v) || HAS_TAG.test(v)) return sign + v + suffix;
    return FSI + sign + v + suffix + PDI;
  });
}

// Right to left: a literal signed number in the text ("+25%", "×1.5", "-4%") is isolated too, so
// its sign stays on its left. Only after a space, a bracket, '>', the start or the joined
// conjunction و ("و+50%"), never inside ids.
const SIGNED = /(^|[\s(>،]|(?<=\sو)|(?<=^و))([+\-−×]\d[\d.,]*(?:%|[KMBT]\b|e\d+)?)/g;
export function isolateSigns(str) {
  return str.replace(SIGNED, (m, pre, num) => pre + FSI + num + PDI);
}

/** The text for `key` in the active language. */
export function t(key, params) {
  const table = TABLES[getLang()] || EN;
  const str = table[key] ?? EN[key];
  if (str === undefined) return key;
  const out = fill(str, params);
  return isRtl() ? isolateSigns(out) : out;
}

/** True when the active language (or English) has the key (optional lookups such as data ids). */
export function hasKey(key) {
  return (TABLES[getLang()] || EN)[key] !== undefined || EN[key] !== undefined;
}

/** `t(key)` when the key exists, else `fallback` (data tables whose ids grow over time). */
export function tOr(key, fallback, params) {
  return hasKey(key) ? t(key, params) : fallback;
}

/**
 * Display name of a timed buff. Saves keep the English name a buff was created with, so the
 * name is looked up by id (spell, recipe or one of the `buff.*` keys) before falling back to it.
 */
export function buffName(b) {
  if (!b) return '';
  return tOr(`buff.${b.id}`, tOr(`recipe.${b.id}.name`, tOr(`spells.${b.id}.name`, b.name || b.id)));
}

/** Wrap a number (or notation like "1.5e12") so it stays left to right in Arabic text. */
export function bidi(text) {
  const s = String(text);
  return isRtl() ? FSI + s + PDI : s;
}

// Data tables (generators, spells, talents, achievements …) keep their English text where it is
// defined; `localize(rows, prefix, fields)` swaps in the active language's text for each row from
// keys `<prefix>.<id>.<field>` (e.g. `building.shawarma.name` in ar.js). Every table is
// registered, so test_r37_i18n.js can check that ar.js has a key for each row and field.
const REGISTRY = [];

export function localize(rows, prefix, fields, params = {}) {
  const entries = Array.isArray(rows) ? rows.map(r => [r.id ?? r.type, r]) : Object.entries(rows).map(([k, r]) => [r?.id ?? k, r]);
  REGISTRY.push({ prefix, fields, entries, params });
  const table = TABLES[getLang()];
  if (!table || table === EN) return rows;
  for (const [id, row] of entries) {
    for (const f of fields) {
      if (typeof row?.[f] !== 'string') continue;
      const v = table[`${prefix}.${id}.${f}`];
      if (v !== undefined) row[f] = isRtl() ? isolateSigns(fill(v, params[id])) : fill(v, params[id]);
    }
  }
  return rows;
}

/** localize() for a plain list of strings: keys `<prefix>.<index>.name`. */
export function localizeList(list, prefix) {
  const rows = list.map((name, i) => ({ id: i, name }));
  localize(rows, prefix, ['name']);
  rows.forEach((r, i) => { list[i] = r.name; });
  return list;
}

/** Every data-table key registered so far: { key: { text, params } } (tests). */
export function localizedKeys() {
  const out = {};
  for (const { prefix, fields, entries, params } of REGISTRY) {
    for (const [id, row] of entries) {
      for (const f of fields) {
        if (typeof row?.[f] === 'string') out[`${prefix}.${id}.${f}`] = { text: row[f], params: params[id] || {} };
      }
    }
  }
  return out;
}

const ATTRS = ['title', 'aria-label', 'alt', 'placeholder'];

/** Fill every data-i18n* element under `root` (index.html markup, or a fragment). */
export function applyI18n(root = globalThis.document) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-hint]').forEach(el => { el.dataset.hint = t(el.dataset.i18nHint); });
  for (const a of ATTRS) {
    const sel = `[data-i18n-${a}]`;
    root.querySelectorAll(sel).forEach(el => { el.setAttribute(a, t(el.getAttribute(`data-i18n-${a}`))); });
  }
}

/** Put lang/dir on <html> and fill the static markup. Runs before anything else draws. */
export function applyLanguageToDocument(doc = globalThis.document) {
  if (!doc?.documentElement) return;
  const lang = getLang();
  doc.documentElement.lang = lang;
  doc.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  if (doc.title !== undefined) doc.title = t('app.title');
  applyI18n(doc);
}

/**
 * Keep settings.language and the localStorage mirror in step. The mirror (what this page loaded
 * with) wins; a save without a language, or a fresh browser, takes the active one.
 * Returns true when the save asked for another language and the browser had no stored choice
 * (a cloud save opened on a new device): the caller saves and reloads once.
 */
export function syncLanguageSetting(settings) {
  if (!settings) return false;
  const saved = normalizeLang(settings.language);
  const stored = storedLang();
  if (saved && !stored && saved !== getLang()) {
    writeLang(saved);
    return true;
  }
  settings.language = getLang();
  writeLang(settings.language);
  return false;
}

function writeLang(id) {
  try { globalThis.localStorage?.setItem(LANG_STORAGE_KEY, id); } catch { /* private mode */ }
}

/** Settings radio group: English / العربية. Picking one saves, stores the choice and reloads once. */
export function renderLanguageSettings(container, settings, onBeforeReload) {
  if (!container) return;
  const current = getLang();
  container.innerHTML = LANGS.map(l => `
    <label class="settings-option lang-option">
      <input type="radio" name="language" value="${l.id}" ${current === l.id ? 'checked' : ''}>
      <span lang="${l.id}" dir="${l.dir}">${l.name}</span>
      <span class="settings-sample">${t(`settings.language.${l.id}.desc`)}</span>
    </label>
  `).join('');
  container.addEventListener('change', (e) => {
    if (e.target.name !== 'language') return;
    const id = normalizeLang(e.target.value) || DEFAULT_LANG;
    if (id === getLang()) return;
    settings.language = id;
    writeLang(id);
    onBeforeReload?.();
    globalThis.location?.reload();
  });
}
