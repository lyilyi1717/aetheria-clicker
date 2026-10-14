// Dig in Arabic: the track's level line reads in order (#462). The line's boxes read right to left in Arabic, the count
// "17/20" is one left-to-right run, and the goal's words carry their own direction. No browser: strings and source.
// Run: node test_proto_levelline.js
import * as G from './proto/game.js';
import { readFileSync } from 'node:fs';
import { t, setLang, hasString } from './proto/core/strings.js';
import { ownDir } from './proto/core/lang.js';
import track from './proto/features/track/strings.js';
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
}

// ---------- the page wiring (no browser: the source) ----------
{
  const ui = src('proto/features/track/ui.js');
  ok(/head\.dir\s*=\s*msg\.dir\s*=\s*DIR/.test(ui), 'the level block and the message line take the page direction');
  ok(/levelLine\(/.test(ui), 'the track builds its level line with levelLine()');
  ok(!/\.dir\s*=/.test(ui.replace(/head\.dir\s*=\s*msg\.dir\s*=\s*DIR/, '')), 'nothing else in the track row is turned (the row and the stage keep their places)');
  const app = src('proto/ui/app.js');
  ok(/gt\.textContent\s*=\s*gt\.title\s*=\s*ownDir\(goal\.text\)/.test(app), 'the goal line is isolated where it is written');
  const css = src('proto/proto.css');
  ok(/#stage, #cv \{ direction: ltr; \}/.test(css) && /:root\[dir=rtl\] \.layout > \.mid \{ direction: ltr; \}/.test(css), 'the stage and the row stay unmirrored');
}

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('level line: reads in order in Arabic, 17/20 in one run, the goal line isolated');
