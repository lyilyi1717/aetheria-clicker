// Active language (R37). No imports, so every module (strings.js, names.js, the i18n tables) can
// read it while it loads. The language is fixed for the life of the page: switching it in
// Settings saves, writes the new choice here and reloads once, so module-level tables built
// with t() are always in the right language.

export const LANGS = [
  { id: 'en', name: 'English', dir: 'ltr' },
  { id: 'ar', name: 'العربية', dir: 'rtl' }
];
export const LANG_IDS = LANGS.map(l => l.id);
export const DEFAULT_LANG = 'en';
// Mirror of settings.language, read before the save loads (and by the inline script in
// index.html, so the page paints right-to-left from the first frame).
export const LANG_STORAGE_KEY = 'AETHERIA_LANG';

/** A known language id, or null. */
export function normalizeLang(id) {
  return LANG_IDS.includes(id) ? id : null;
}

/** The stored choice, if any. */
export function storedLang() {
  try { return normalizeLang(globalThis.localStorage?.getItem(LANG_STORAGE_KEY)); } catch { return null; }
}

/** First visit: Arabic when the browser asks for it, else English. */
export function browserLang() {
  const nav = globalThis.navigator;
  const list = [...(nav?.languages || []), nav?.language].filter(Boolean);
  return list.some(l => String(l).toLowerCase().startsWith('ar')) ? 'ar' : DEFAULT_LANG;
}

let current = storedLang() || browserLang();

export function getLang() { return current; }
export function isRtl() { return current === 'ar'; }

/** Tests only: switch the active language in place (the game reloads instead). */
export function setLangForTests(id) { current = normalizeLang(id) || DEFAULT_LANG; }
