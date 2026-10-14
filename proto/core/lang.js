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
// one line of words in a box that stays left to right on an Arabic page (the track row's goal): a first-strong isolate gives
// the words their own direction, so an Arabic line ending in a number does not throw the number to the right end
export const ownDir = (s, dir = DIR) => dir === 'rtl' ? '\u2068' + s + '\u2069' : s;
// goal words with a count ("Second Pick: 3.00K / 100K"): the count must never leave the visible line (#469). `num` is the
// first number of the count as the goal wrote it; the count runs from there to the end, so the localizer's wording and order
// stay as written. Returns { lead, count } when the words are a label then the count, else null (show them as one piece).
// An isolate mark just before the number goes with the count.
export function goalParts(text, num) {
  if (!text || num === undefined || num === null || num === '') return null;
  let i = String(text).indexOf(String(num));
  if (i <= 0) return null;
  while (i > 0 && /[\u2066-\u2068]/.test(text[i - 1])) i--;
  const lead = text.slice(0, i).replace(/[\s\u2066-\u2069]+$/, ''), count = text.slice(i);
  return lead ? { lead, count } : null;
}

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
