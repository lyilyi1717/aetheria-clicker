// Dig: a long lesson has room to be read (docs/art-and-sound.md decision 14). Run: node test_proto_lessonfit.js
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { LESSON, lineCount, fitsLesson, textWidth } from './proto/features/track/lessonfit.js';
import { createLessons, readTime } from './proto/ui/lessons.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const read = f => readFileSync(new URL(f, import.meta.url), 'utf8');

// ---------- the wrap estimate ----------
ok(lineCount('', 100) === 0, 'no words, no lines');
ok(lineCount('one', 100) === 1, 'a short word is one line');
ok(lineCount('aaaa bbbb cccc dddd', textWidth('aaaa bbbb') + 0.5) === 2, 'wraps word by word');
ok(textWidth('بَلّورة') < textWidth('بلورةxx'), 'Arabic vowel marks take no room');
ok(lineCount('x'.repeat(40), 100) >= 3, 'a word wider than the line still counts its lines');

// ---------- the budget: the room left after T1 at 1366 x 768 ----------
ok(LESSON.font >= 13, 'lessons keep the 13 px floor');
ok(LESSON.lines * LESSON.font * LESSON.lineHeight <= 40 + 6, 'three lines fit in the line and the 6 px under it');
ok(518 - 216 - 8 - 11 - 8 >= LESSON.room, `the room checked (${LESSON.room} px) is not more than the laptop gives, less the plate's end padding`);

// ---------- every lesson, English and Arabic, fits in full ----------
const dirs = readdirSync(new URL('./proto/features/', import.meta.url));
const LESSON_KEY = /^(t_|fz_lesson_|gate_remember$)/;
const want = ['gate_remember', 'fz_lesson_watch', 'fz_lesson_ready', 'fz_lesson_half', 't_crystal', 't_prism', 't_mushroom', 't_lantern',
  't_moonstone', 't_torch_crate', 't_moss', 't_grump', 't_thief', 't_lava', 't_water', 't_pearl', 't_pearl_seen', 't_wing_seen'];
const found = new Set();
for (const d of dirs) {
  for (const f of ['strings.js', 'strings.ar.js']) {
    const url = new URL(`./proto/features/${d}/${f}`, import.meta.url);
    if (!existsSync(url)) continue;
    const m = (await import(url.href)).default || {};
    for (const lang of ['en', 'ar']) {
      for (const [k, v] of Object.entries(m[lang] || {})) {
        if (!LESSON_KEY.test(k) || typeof v !== 'string') continue;
        found.add(k);
        const text = v.replace(/\{\w+\}/g, '100');
        const n = lineCount(text, LESSON.room);
        ok(fitsLesson(text), `${lang} ${k}: ${n} lines at ${LESSON.room} px, at most ${LESSON.lines}`);
      }
    }
  }
}
for (const k of want) ok(found.has(k), `the long lesson ${k} is checked`);

// ---------- a long lesson stays long enough to read ----------
ok(readTime('A').min === 3 && readTime('A').max === 6, 'a short lesson keeps 3 to 6 s');
ok(readTime('x'.repeat(30)).min === 3, 'up to 30 letters, no extra');
ok(readTime('x'.repeat(75)).min === 6 && readTime('x'.repeat(75)).max === 9, 'a 75-letter lesson stays 6 s, 9 at most');
ok(readTime('x'.repeat(500)).max === 9, 'never more than 9 s');
{
  const got = [];
  const L = createLessons({ onTaught: f => got.push(f) });
  L.request('long', 'x'.repeat(75)); L.request('next', 'B');
  for (let i = 0; i < 50; i++) L.tick(0.1);
  ok(L.current && L.current.flag === 'long' && !got.length, 'a long lesson is still up and untaught at 5 s, though another waits');
  for (let i = 0; i < 12; i++) L.tick(0.1);
  ok(got.join() === 'long', 'taught at 6 s');
}

// ---------- the layout: the lesson takes the line, covers nothing on the stage ----------
{
  const trk = read('./proto/features/track/track.css');
  ok(/#track:not\(\.done\):has\(#lesson\.show\.wide\) #trk-head \{ flex-grow: 0; \}/.test(trk), 'T1 stops growing while a long lesson shows');
  ok(/#track:not\(\.done\):has\(#lesson\.show\.wide\) :is\(#tips-btn, #goal\) \{ display: none; \}/.test(trk), 'Tips and the goal step aside for a long lesson only');
  ok(!/:has\(#lesson\.show\)/.test(trk), 'a short lesson leaves Tips and the goal in place (decision 16)');
  ok(/#trk-msg #lesson\.show \{[^}]*background: rgba/.test(trk), 'a lesson sits on a plate, unlike the drawer line (decision 15)');
  ok(/#trk-msg #lesson\.show\.gold \{[^}]*background: rgba\(255, 210, 63/.test(trk), 'a gold lesson has a gold plate');
  ok(/#trk-msg #lesson \{ -webkit-line-clamp: 3; line-height: 1\.15;/.test(trk), 'a lesson may take three lines');
  ok(/prefers-reduced-motion: reduce\) \{ #trk-msg #lesson\.show \{ animation: none; \}/.test(trk), 'no unroll with reduced motion (browser)');
  ok(/html\.calm #trk-msg #lesson\.show \{ animation: none !important; \}/.test(trk), 'no unroll with Reduce motion (Settings)');
  ok(!/#trk-head[^{]*\{[^}]*display: none/.test(trk.split('#track.done')[0]), 'T1 (Gate note, clock, medals) never hides for a lesson');
}

// ---------- short lessons keep Tips and the goal (decision 16): app.js measures once per lesson ----------
{
  const app = read('./proto/ui/app.js');
  ok(/function lessonWide\(el, text\)/.test(app) && /lineCount\(text, w\) <= 2/.test(app), 'a lesson that fits two lines in the message line is not wide');
  ok(/' wide' : ''/.test(app), 'the wide class is set from the measure');
  // at the 96 px floor a short lesson fits two lines, a long one does not
  ok(lineCount('Crack! It breaks.', 130) <= 2, 'a short line fits two lines in a message line of about 150 px');
  ok(lineCount('This relic has a partner. Find its match in a chest and the two can fuse.', 150) > 2, 'a long lesson does not, so it takes the line');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('lesson fit: ok');
