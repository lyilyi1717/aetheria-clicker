// Dig: the "New:" line names what the level is dug through (#395), and the goal chip says what a tap does (#458).
// Run: node test_proto_newline.js
import * as G from './proto/game.js';
import { t, setLang } from './proto/core/strings.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const line = i => t(G.newThingKey(G.ROAD[i], i));

// the "new thing" column of the design (2.3), level by level (learn levels; prove levels say "Harder")
const want = { 5: 'New: crystal lines', 7: 'New: the Black, always dark', 9: 'New: blocks grow back', 11: 'New: the rock hits back', 13: 'New: lava',
  15: 'New: deeper ground', 17: 'New: deeper ground', 19: 'New: deeper ground' };
for (const [lv, text] of Object.entries(want)) ok(line(lv - 1) === text, `level ${lv} says "${text}", got "${line(lv - 1)}"`);
for (let lv = 1; lv <= 40; lv++) { // every road level has a real line (no raw key), and prove levels say so
  const f = G.ROAD[lv - 1], k = G.newThingKey(f, lv - 1), s = t(k);
  ok(s && s !== k, `level ${lv} has text for ${k}`);
  if (f.prove) ok(k === 'new_prove', `level ${lv} is a prove level`);
}
ok(line(0).includes('Big Rock') && line(2).includes('Museum'), 'the first lessons keep their lines');
ok(line(20) === t('new_ch2'), 'level 21 is the road home');

// the goal chip: label names the goal shown and says a tap moves on
{
  const tip = k => G.picksPinTip(k);
  ok(tip('gate') === 'Goal: The Gate. Tap for the next goal.', 'the Gate chip reads: ' + tip('gate'));
  ok(tip('pick2') === 'Goal: Second Pick. Tap for the next goal.', 'the Second Pick chip reads: ' + tip('pick2'));
  ok(tip('set').startsWith('Goal: Museum set.') && tip('set').endsWith('Tap for the next goal.'), 'the Museum set chip reads: ' + tip('set'));
  const s = G.newState(); s.bossesDown = 1;
  const open = () => G.PICKS_PINS.filter(k => G.picksPinOk(s, k));
  const shown = () => { const o = open(); const c = G.picksPin(s); return o.includes(c) ? c : o[0]; };
  // with two open goals a click (the chip's own step) moves the label to the next goal
  ok(G.picksPinOk(s, 'pick2'), 'the Second Pick is open with a boss down');
  ok(open().length >= 2, 'two goals open');
  const before = tip(shown());
  const ok2 = open(); const cur = shown(); G.picksSetPin(s, ok2[(ok2.indexOf(cur) + 1) % ok2.length]);
  ok(tip(shown()) !== before && tip(shown()).startsWith('Goal: '), 'after a click the label names the next goal: ' + tip(shown()));
}
{ const s = G.newState(); ok(G.PICKS_PINS.filter(k => G.picksPinOk(s, k)).length === 1, 'a fresh dig has one goal open: no chip'); }
// the old words are gone from both languages
ok(!/goal bar/.test(t('pin_tip', { goal: 'x' })), 'the old pills tip is gone');

setLang('ar');
ok(G.picksPinTip('gate') === 'الهدف: البوابة. اضغط لتنتقل إلى الهدف التالي.', 'Arabic chip: ' + G.picksPinTip('gate'));
ok(t(G.newThingKey(G.ROAD[4], 4)) === 'جديد: خطوط البلّور', 'Arabic level 5 line');
setLang('en');

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('newline: ok');
