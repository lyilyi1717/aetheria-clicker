// Dig in Arabic: the track's level line reads in order (#462). The line's boxes read right to left in Arabic, the count
// "17/20" is one left-to-right run, and the goal's words carry their own direction. No browser: strings and source.
// Run: node test_proto_levelline.js
import * as G from './proto/game.js';
import { readFileSync } from 'node:fs';
import { t, setLang, hasString } from './proto/core/strings.js';
import { ownDir, goalParts } from './proto/core/lang.js';
import track from './proto/features/track/strings.js';
import sites from './proto/features/sites/strings.js';
import { levelLine } from './proto/features/track/line.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
if (!hasString('trk_head')) G.addStrings(track, 'track');

const LRI = '⁦', FSI = '⁨', PDI = '⁩';
// is every character matching `re` inside a left-to-right isolate (LRI ... PDI, nested isolates allowed)?
function insideLtr(s, re) {
  const stack = [];
  let seen = 0;
  for (const c of s) {
    if (c === LRI || c === FSI || c === '⁧') stack.push(c);
    else if (c === PDI) stack.pop();
    else if (re.test(c)) { seen++; if (!stack.includes(LRI)) return false; }
  }
  return seen > 0;
}
const src = f => readFileSync(new URL('./' + f, import.meta.url), 'utf8');

// ---------- Arabic ----------
setLang('ar');
{
  const L = G.levelOf(37);
  ok(L.ch === 2 && L.n === 17 && L.of === 20, 'level 37 is chapter 2, level 17 of 20');
  const level = t('trk_ch2', L);
  ok(insideLtr(level, /\//), 'the slash of 17/20 sits in one left-to-right run: ' + JSON.stringify(level));
  const flat = level.replace(/[⁦-⁩]/g, '');
  ok(flat === 'الفصل 2، المرحلة 17/20', 'the words, in logical order: ' + flat);
  ok(flat.includes('،') && !flat.includes(','), 'the comma after 2 is the Arabic comma');
  // the outer run opens before 17 and closes after 20: the two numbers are never their own neighbours
  ok(/⁦[⁦⁩]*17[⁦⁩]*\/[⁦⁩]*20[⁦⁩]*⁩/.test(level), 'one run holds 17, the slash and 20');

  const line = levelLine({ level, zone: 'الربع الخالي', name: 'الكثبان', full: 'الفصل الثاني، المرحلة 17 من 20' }, 'rtl');
  ok(line.dir === 'rtl', 'the level line is right to left in Arabic');
  const strip = s => s.replace(/[⁦-⁩]/g, '');
  ok(strip(line.lv) === 'الفصل 2، المرحلة 17/20 · الربع الخالي', 'level, then land: ' + strip(line.lv));
  ok(strip(line.nm) === ' · الكثبان', 'the place comes last, in its own part: ' + strip(line.nm));
  ok(strip(line.lv + line.nm) === 'الفصل 2، المرحلة 17/20 · الربع الخالي · الكثبان', 'the whole line in reading order');
  ok(line.title.includes('الربع الخالي') && line.title.includes('الكثبان'), 'the hover title names land and place');

  const off = levelLine({ level: null, zone: 'x', name: 'القهوة' }, 'rtl');
  ok(off.lv === '' && off.nm === 'القهوة' && off.title === 'القهوة', 'off the road the line is only the place');

  // chapter one: "Level 7 of 20" has no slash and is plain Arabic around its numbers
  ok(!levelLine({ level: t('fin_next_level', { n: 7, of: 20 }), zone: 'ز', name: 'م' }, 'rtl').lv.includes('/'), 'chapter one reads «من», no slash');

  // the Second Pick goal: "12K / 100K" in one left-to-right run
  const g = t('goal_pick2', { a: '12K', b: '100K' });
  ok(insideLtr(g, /\//) && g.replace(/[⁦-⁩]/g, '') === 'المعول الثاني: 12K / 100K', 'the Second Pick count reads 12K / 100K: ' + JSON.stringify(g));

  // #469: the count is cut out whole, with its isolate, and the label keeps its colon
  const gp = goalParts(t('goal_pick2', { a: '3.00K', b: '100K' }), '3.00K');
  const opens = s => (s.match(/[⁦-⁨]/g) || []).length, closes = s => (s.match(/⁩/g) || []).length;
  ok(gp && gp.lead === 'المعول الثاني:' && gp.count.replace(/[⁦-⁩]/g, '') === '3.00K / 100K' && gp.count[0] === LRI &&
    opens(gp.count) === closes(gp.count) && insideLtr(gp.count, /\//),'Arabic Second Pick: label, then the whole count: ' + JSON.stringify(gp));

  // the goal line sits in a left-to-right row: its words get a first-strong isolate, so a line ending in a number keeps
  // the number at its left end
  ok(ownDir('الهدف 5 من 10', 'rtl') === FSI + 'الهدف 5 من 10' + PDI, 'the goal line is a first-strong isolate in Arabic');
  ok(ownDir('Goal 5 of 10', 'ltr') === 'Goal 5 of 10', 'English is untouched');
}
setLang('en');
{
  const level = t('trk_ch2', G.levelOf(37));
  ok(level === 'Chapter 2, level 17/20', 'English is untouched: ' + level);
  const line = levelLine({ level, zone: 'The Empty Quarter', name: 'The Dunes' }, 'ltr');
  ok(line.dir === 'ltr' && line.lv === 'Chapter 2, level 17/20 · The Empty Quarter' && line.nm === ' · The Dunes', 'English line');
  const gp = goalParts(t('goal_pick2', { a: '3.00K', b: '100K' }), '3.00K');
  ok(gp && gp.lead === 'Second Pick:' && gp.count === '3.00K / 100K', 'English Second Pick: label, then the count: ' + JSON.stringify(gp));
  ok(goalParts('100K to go', '100K') === null, 'a count at the start stays one piece');
  ok(goalParts('Reach the Gate', undefined) === null && goalParts('Reach the Gate', '5') === null, 'words without the number stay one piece');
}

// ---------- the page wiring (no browser: the source) ----------
{
  const ui = src('proto/features/track/ui.js');
  ok(/head\.dir\s*=\s*msg\.dir\s*=\s*DIR/.test(ui), 'the level block and the message line take the page direction');
  ok(/levelLine\(/.test(ui), 'the track builds its level line with levelLine()');
  ok(!/\.dir\s*=/.test(ui.replace(/head\.dir\s*=\s*msg\.dir\s*=\s*DIR/, '')), 'nothing else in the track row is turned (the row and the stage keep their places)');
  const app = src('proto/ui/app.js');
  ok(/gt\.title\s*=\s*ownDir\(goal\.text\)/.test(app) && /gt\.textContent\s*=\s*ownDir\(goal\.text\)/.test(app), 'the goal line is isolated where it is written');
  // #469: a label then a count is two boxes on one line; the count never shrinks, only the label ends in dots
  ok(/goalParts\(goal\.text,\s*goal\.num\)/.test(app), 'the goal words are split into label and count');
  const trk = src('proto/features/track/track.css');
  ok(/#track #goal-text\.split \{[^}]*display: flex[^}]*white-space: nowrap/.test(trk), 'the split goal is one line');
  ok(/#track #goal-text\.split \.gn \{[^}]*flex: none/.test(trk), 'the count never shrinks');
  ok(/#track #goal-text\.split \.gl \{[^}]*min-width: 0[^}]*text-overflow: ellipsis/.test(trk), 'the label ends in dots');
  ok(/num: a/.test(src('proto/features/picks/ui.js')), 'the Second Pick goal says where its count starts');
  // #470: the Star pointer is said once, in the message line; the goal spot shows the goal its chip names
  const star = src('proto/features/starshop/ui.js').replace(/\/\/.*$/gm, '');
  ok(!/\bgoal\s*:/.test(star), 'the Stars feature has no goal of its own');
  ok(/toast\(t\('star_pointer'\)/.test(star), 'the Star pointer still shows in the message line');
  const css = src('proto/proto.css');
  ok(/#stage, #cv \{ direction: ltr; \}/.test(css) && /:root\[dir=rtl\] \.layout > \.mid \{ direction: ltr; \}/.test(css), 'the stage and the row stay unmirrored');
}

// ---------- decisions 17 to 19 (eighth pass): the Gate goal keeps its number, the Arabic chip points left, no lone last word ----------
if (!hasString('goal_gate_far')) G.addStrings(sites, 'sites');
for (const lang of ['en', 'ar']) {
  setLang(lang);
  const far = goalParts(t('goal_gate_far', { name: 'X', n: 150 }), '150');
  ok(far && far.count.replace(/[⁦-⁩]/g, '').startsWith('150') && !/150/.test(far.lead), `${lang}: the far Gate goal keeps its metres whole: ` + JSON.stringify(far));
  const sw = goalParts(t('goal_gate', { n: '12' }), '12');
  ok(sw && /12/.test(sw.count) && !/12/.test(sw.lead), `${lang}: the swings goal keeps its number whole: ` + JSON.stringify(sw));
}
setLang('en');
{
  const sui = src('proto/features/sites/ui.js');
  ok(/num: String\(r\.floor\)/.test(sui) && /num: sw === 1 \? null : n/.test(sui), 'the Gate goals say where their number starts');
  const pick = src('proto/features/picks/picks.css');
  ok(/:root\[dir=rtl\] #goal-pin button \{ direction: rtl;/.test(pick), 'the Arabic chip reads right to left, its step mark at the left end');
  ok(/:root\[dir=rtl\] #goal-pin button::after \{ transform: rotate\(-45deg\); \}/.test(pick), 'the Arabic step mark points left');
  const star = src('proto/features/starshop/ui.js');
  ok(/keepEnd\(info\.desc\)/.test(star) && /\\u00a0\$1/.test(star), 'the Camp card binds its last word to the one before');
  ok(/\.shop-item \.d \{[^}]*text-wrap: pretty/.test(src('proto/proto.css')), 'card lines avoid a lone last word');
}

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('level line: reads in order in Arabic, 17/20 in one run, the goal line isolated');
