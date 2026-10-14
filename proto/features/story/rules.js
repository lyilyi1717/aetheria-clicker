// Dig feature: the hakawati, the storyteller of Alqahwa (idea N5). One legend, "Grandpa's lost caravan": each finished road level
// unlocks one short story beat (three lines), each land is a chapter, a lost try at a Gate gets one more line, and the last
// level ends the legend. LOOKS AND WORDS ONLY: nothing here changes how strong anything is or what anything pays.
//
// DATA-DRIVEN. STORY_BEATS has one entry per road level, built from ROAD. To lengthen the road, nothing is edited here: add the new
// level's strings `st_<level>_<n>` (n = 1 to `lines`) in strings.js, and for a new land one `st_ch_<zone>` string. The last
// entry (`end: true`) is the finale and gets the small ceremony.
//
// STATE (`story`, survives a new site and a new land): `read` is the list of beats heard or opened in the book; `lost` is the
// road level whose lost-try line was last told. A save without it starts empty, so every level already finished is "unread" in
// the book, but the telling shows only the latest one: nobody is buried in stories.
import { use } from '../../core/registry.js';
import { ROAD, CHAPTER_LEN, fixedNext, roadIndex } from '../sites/rules.js';
import strings from './strings.js';
import stringsAr from './strings.ar.js';

const LOST = 5;       // how many lost-try lines there are
// CHAPTERS: where each chapter starts, by road level; a chapter runs to the level before the next one starts. Title: `st_ch_<id>`.
// Chapter one is the road out (levels 1 to 20); chapter two is the road home at night (21 to 40, drafted in strings.js). A chapter
// ends with a ceremony at its last beat: 'bell' (level 20: Grandpa's bell and note) or 'caravan' (level 40: the caravan is found).
export const CHAPTERS = [
  { id: 'arabia', from: 1 }, { id: 'africa', from: 5 }, { id: 'eastasia', from: 9 }, { id: 'americas', from: 13 }, { id: 'europe', from: 17 },
  { id: 'n_europe', from: 21 }, { id: 'n_americas', from: 25 }, { id: 'n_eastasia', from: 29 }, { id: 'n_africa', from: 33 }, { id: 'emptyquarter', from: 37 },
];
export const STORY_ENDS = { 20: 'bell', 40: 'caravan' };
export const STORY_LEVELS = 40;
// one entry per story level. Only the levels the road really has (ROAD.length) can be unlocked; the rest wait for a longer road.
export const STORY_BEATS = Array.from({ length: STORY_LEVELS }, (_, i) => {
  const level = i + 1, c = CHAPTERS.findIndex((x, k) => level >= x.from && (k === CHAPTERS.length - 1 || level < CHAPTERS[k + 1].from));
  return { level, chapter: c + 1, zone: CHAPTERS[c].id, lines: 3, end: STORY_ENDS[level] || '' };
});

export const story = use({
  id: 'story', strings, stringsAr,
  state: { story: { init: () => ({ read: [], lost: 0 }), survives: ['site', 'land'] } },
});

const slice = s => {
  if (!s.story || typeof s.story !== 'object') s.story = { read: [], lost: 0 };
  if (!Array.isArray(s.story.read)) s.story.read = [];
  if (typeof s.story.lost !== 'number') s.story.lost = 0;
  return s.story;
};

// how many road levels are passed (finished; one of the first four also when tried twice): the beats up to this are told
export function storyUnlocked(s) { const f = fixedNext(s); return Math.min(STORY_BEATS.length, f ? f.level - 1 : ROAD.length); }
export const storyRead = (s, n) => slice(s).read.includes(n);
export function storyMark(s, n) { const r = slice(s).read; if (n >= 1 && n <= STORY_BEATS.length && !r.includes(n)) r.push(n); }

// the one beat to tell on entering Alqahwa: the latest unlocked beat not yet heard, else 0
export function storyNew(s) {
  for (let n = storyUnlocked(s); n >= 1; n--) if (!storyRead(s, n)) return n;
  return 0;
}
// every unlocked beat not yet heard (the book marks them New)
export function storyUnread(s) { const out = []; for (let n = 1; n <= storyUnlocked(s); n++) if (!storyRead(s, n)) out.push(n); return out; }
// the player has heard these lines (each carries its beat number n; a lost-try line carries lost): mark them and say how many beats are still unread
export function storyHeard(s, lines) {
  for (const L of lines) { if (L.n) storyMark(s, L.n); if (L.lost) storyLostMark(s); }
  return storyUnread(s).length;
}
// the brass bell hangs in the coffee house once the ending of chapter one (level 20) was told
export const storyBellHangs = s => storyRead(s, 20);
export const storyKeys = n => { const b = STORY_BEATS[n - 1]; return b ? Array.from({ length: b.lines }, (_, i) => `st_${n}_${i + 1}`) : []; };
export const storyZone = n => (STORY_BEATS[n - 1] || {}).zone || '';
export const storyIsEnd = n => (STORY_BEATS[n - 1] || {}).end || '';       // '', 'bell' or 'caravan'
// the book: chapters in order, each with its beats
export function storyBook(s) {
  const un = storyUnlocked(s), out = [];
  for (const b of STORY_BEATS) {
    if (b.level > ROAD.length || (b.level > CHAPTER_LEN && un < CHAPTER_LEN)) break;   // chapter two stays hidden until chapter one is told
    let ch = out.find(c => c.zone === b.zone);
    if (!ch) out.push(ch = { zone: b.zone, no: b.chapter, beats: [] });
    ch.beats.push({ n: b.level, open: b.level <= un, read: storyRead(s, b.level), end: b.end, keys: storyKeys(b.level) });
  }
  return out;
}
// the whole legend is told (the caravan beat is unlocked)
export const storyFound = s => storyUnlocked(s) >= STORY_LEVELS;

// the lost-try line key, or '': the level in front has been tried and not finished (twice, or once while the dig in play is
// another), and the line for that level has not been told. One line per level, said once.
export function storyLostLine(s) {
  const f = fixedNext(s);
  if (!f || f.tries < 1) return '';
  const digging = roadIndex(s) === f.level - 1 && s.run && !s.run.done;
  if (f.tries < 2 && digging) return '';
  if (slice(s).lost === f.level) return '';
  return `st_lost_${((f.level - 1) % LOST) + 1}`;
}
export function storyLostMark(s) { const f = fixedNext(s); if (f) slice(s).lost = f.level; }
// the finish-card teaser: a string key when the hakawati has something new, else ''
export const storyTeaser = s => (storyNew(s) ? 'st_tease' : '');
