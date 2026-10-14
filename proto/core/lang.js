// Dig: which language this page runs in. Chosen once at load; changing it reloads the page.
// Order: ?lang=ar|en, then localStorage DIG_PROTO_LANG, else English. No imports. Not saved with the game.
const KEY = 'DIG_PROTO_LANG';
const OK = { en: 'ltr', ar: 'rtl' };

function pick() {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q && OK[q]) return q;
  } catch (e) { /* no location (tests) */ }
  try {
    const s = localStorage.getItem(KEY);
    if (s && OK[s]) return s;
  } catch (e) { /* storage blocked */ }
  return 'en';
}

export const LANG = pick();
export const DIR = OK[LANG];

// the direction to draw one line on a canvas with (`g.direction = textDir(str)`): a canvas does not follow the page's dir,
// so an Arabic line drawn left to right puts a number or a "!" at the wrong end; a line with no Arabic letter (a lone
// "-12.5K", a clock) stays left to right so its sign stays in front
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
export const dirOf = (s, dir) => dir === 'rtl' && ARABIC.test(String(s)) ? 'rtl' : 'ltr';
export const textDir = s => dirOf(s, DIR);

// store the choice and reload without ?lang= (it would win over the stored value)
export function setLangChoice(id) {
  if (!OK[id]) return;
  try { localStorage.setItem(KEY, id); } catch (e) { /* storage blocked */ }
  try {
    const u = new URL(location.href);
    u.searchParams.delete('lang');
    location.href = u.href;
  } catch (e) { /* no location */ }
}
