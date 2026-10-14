// Dig: the hakawati's story (N5): unlock order, new-beat detection, old saves, data and strings.
import * as G from './proto/game.js';
import strings from './proto/features/story/strings.js';

let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.error('FAIL: ' + m); } };
const fin = (s, n) => { for (let i = 0; i < n; i++) { const f = G.ROAD[i]; s.road.stamps[G.roadKey(f)] = { site: f.site, floor: f.floor, ch: f.ch, twist: '', fin: 1, fast: 0, hard: 0, chili: 0, best: 0, n: 1, bank: 0 }; } };

{ // the data: one entry per road level, three lines each, every string there
  ok(G.STORY_BEATS.length === 40 && G.ROAD.length >= 20 && G.ROAD.length <= 40, 'a beat for every level of the two chapters');
  for (const b of G.STORY_BEATS) for (const k of G.storyKeys(b.level)) ok(typeof strings.en[k] === 'string' && strings.en[k].length > 10, 'text for ' + k);
  ok(G.STORY_BEATS.filter(b => b.end).length === 2 && G.STORY_BEATS[19].end === 'bell' && G.STORY_BEATS[39].end === 'caravan', 'level 20 ends chapter one with the bell, level 40 finds the caravan');
  for (const c of G.CHAPTERS) ok(strings.en['st_ch_' + c.id], 'a chapter title for ' + c.id);
  ok(G.CHAPTERS.length === 10 && G.STORY_BEATS.every(b => b.chapter >= 1 && b.zone), 'every level is in a chapter');
  for (let i = 1; i <= 5; i++) ok(strings.en['st_lost_' + i], 'lost line ' + i);
  const all = Object.values(strings.en).join(' ');
  ok(!/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(all), 'no emoji');
}
{ // unlock order: nothing at the start, then one more beat for each finished level, in road order
  const s = G.newState();
  ok(G.storyUnlocked(s) === 0 && G.storyNew(s) === 0 && G.storyTeaser(s) === '', 'a new game has no story yet');
  let last = 0;
  for (let n = 1; n <= G.ROAD.length; n++) {
    const t = G.newState(); fin(t, n);
    const u = G.storyUnlocked(t);
    ok(u === n && u >= last, 'finishing ' + n + ' levels unlocks ' + n + ' beats (got ' + u + ')');
    last = u;
  }
  const t = G.newState(); fin(t, 20);
  ok(G.storyUnlocked(t) === 20 && G.storyIsEnd(20) === 'bell', 'level 20 gives the bell and the note');
  ok(!G.storyFound(t), 'the caravan is not found at level 20');
  const u = G.newState(); fin(u, 19);
  const book = G.storyBook(u);
  ok(book.length === 5 && book.map(c => c.zone).join() === 'arabia,africa,eastasia,americas,europe', 'five lands of chapter one, in road order; chapter two stays hidden until chapter one is told');
  ok(G.storyBook(t).length === 10 && G.storyBook(t).slice(5).map(c => c.zone).join() === G.ZONES.slice(5).join(), 'after level 20 the book shows chapter two, its lands in the order of the road');
  ok(book.every(c => c.beats.length === 4), 'four beats a land');
  ok(G.storyBook(u)[4].beats[3].open === false && G.storyBook(u)[4].beats[2].open === true, 'the book locks what is not yet told');
}
{ // new-beat detection: the latest unheard beat is told once; reading does not erase older unread ones
  const s = G.newState(); fin(s, 3);
  ok(G.storyNew(s) === 3 && G.storyTeaser(s) === 'st_tease', 'beat 3 is new');
  G.storyMark(s, 3);
  ok(G.storyNew(s) === 2 && G.storyUnread(s).join() === '1,2', 'older beats stay unread in the book');
  G.storyMark(s, 2); G.storyMark(s, 1); G.storyMark(s, 1);
  ok(G.storyNew(s) === 0 && G.storyUnread(s).length === 0 && s.story.read.length === 3, 'all heard, no duplicates');
  fin(s, 4);
  ok(G.storyNew(s) === 4, 'a new finish brings a new beat');
  G.storyMark(s, 99); ok(!s.story.read.includes(99), 'a beat that does not exist is not marked');
}
{ // an old save: no story slice, 9 levels finished -> only the latest is told, the rest wait in the book
  const s = G.newState(); fin(s, 9); s.stars = 5;
  const old = JSON.parse(G.serialize(s)); delete old.story;
  const back = G.deserialize(JSON.stringify(old));
  ok(back && back.story && Array.isArray(back.story.read) && back.story.read.length === 0, 'the slice gets its default');
  ok(G.storyNew(back) === 9 && G.storyUnread(back).length === 9, 'level 9 is the one told; all nine are unread');
  G.storyMark(back, G.storyNew(back));
  ok(G.storyNew(back) === 8, 'after the telling only that one is heard');
  const again = G.deserialize(G.serialize(back));
  ok(again.story.read.join() === '9', 'what was heard is saved');
  const broken = JSON.parse(G.serialize(s)); broken.story = 'x';
  const b2 = G.deserialize(JSON.stringify(broken));
  ok(b2 && G.storyNew(b2) === 9, 'a damaged slice does not break the story');
}
{ // a lost try gets a line, once per level
  const s = G.newState(); fin(s, 4);
  ok(G.storyLostLine(s) === '', 'no tries at the next level, no line');
  const f = G.fixedNext(s);
  s.road.stamps[G.roadKey(f)] = { site: f.site, floor: f.floor, ch: f.ch, twist: '', fin: 0, fast: 0, hard: 0, chili: 0, best: 0, n: 1, bank: 0 };
  ok(/^st_lost_[1-5]$/.test(G.storyLostLine(s)), 'one try and left: a line');
  G.storyLostMark(s);
  ok(G.storyLostLine(s) === '', 'told once');
  fin(s, 5);
  ok(G.storyLostLine(s) === '', 'a finished level asks for nothing');
}
{ // the level-20 ending: hearing it clears the count, and the bell hangs afterwards
  const s = G.newState(); fin(s, 20);
  for (let n = 1; n <= 19; n++) G.storyMark(s, n);
  ok(G.storyUnread(s).join() === '20' && !G.storyBellHangs(s), 'only the ending is unread, no bell yet');
  const lines = G.storyKeys(20).map(key => ({ key, n: 20 }));
  const left = G.storyHeard(s, lines);
  ok(left === 0 && G.storyUnread(s).length === 0 && G.storyNew(s) === 0 && G.storyTeaser(s) === '', 'hearing level 20 leaves nothing unread');
  ok(G.storyBellHangs(s), 'the bell hangs once the ending was heard');
  const t2 = G.newState(); fin(t2, 20);
  ok(G.storyHeard(t2, lines) === 19, 'older unread beats stay counted until read');
  const back = G.deserialize(G.serialize(s));
  ok(back.story.read.includes(20) && G.storyBellHangs(back), 'the bell survives a save');
}
if (bad) { console.error(bad + ' failed'); process.exit(1); }
console.log('story: ok');
