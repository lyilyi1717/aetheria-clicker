// Dig: the art-and-sound rules that keep things from drifting back (docs/art-and-sound.md). Run: node test_proto_art.js
// - the layout map: from 3 Rafeeqs the top centre of the dig is the manager's, the Museum chip moves to its side spot,
//   and his text box keeps to its width (issue: the chip was drawn over his box)
// - the save code always reads left to right, on an Arabic page too
// - the night bars sound sparser by loudness only (same notes, so the same hits); the Empty Quarter keeps the home accents
import { readFileSync } from 'node:fs';
import { PICKS_BARS, BAR_ZONES, picksBarOf, barFaults } from './proto/features/picks/beat.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const read = f => readFileSync(new URL(f, import.meta.url), 'utf8');

// ---------- the layout map ----------
const W = 640, BOX_X = 286, PAD = 20;                     // the canvas width; the box's left edge (x0 250 + 36); its padding
const man = read('./proto/features/chatter/manager.js');
const wrap = Number((man.match(/const BOX_WRAP = (\d+)/) || [])[1]);
ok(wrap > 0, 'manager.js has a BOX_WRAP');
ok(BOX_X + wrap + PAD <= 486, `the manager's box ends by x 486 (ends at ${BOX_X + wrap + PAD})`);
ok(/bx = x0 \+ 36/.test(man) && /const x0 = 250/.test(man), 'the manager stands at x 250 and his box opens 36 px to his right');
const css = read('./proto/features/museum/museum.css');
const side = (css.match(/#mus-strip\.side \{([^}]*)\}/) || [])[1] || '';
ok(/inset-inline: auto 10px/.test(side), 'the side spot is on the end side, 10 px in');
ok(/inset-block-start: 56px/.test(side), 'the side spot sits under the depth pill (56 px down)');
ok(/#mus-strip\.side \.wart \{ width: 44px; \}/.test(css), 'the chip is small in its side spot');
const sideW = 5 + 44 + 6 + 30 + 9 + 2;                    // padding, pieces, gap, "4/4" at 15 px, padding, border
ok(W - 10 - sideW > BOX_X + wrap + PAD, 'at full size the side chip starts right of the box');
const mus = read('./proto/features/museum/ui.js');
ok(/G\.chatterBossShown\(s\)/.test(mus) && /classList\.toggle\('side'/.test(mus), 'the chip moves when the manager is on screen');

// ---------- the save code ----------
const set = read('./proto/features/settings/settings.css');
const area = (set.match(/\.sc-area \{([^}]*)\}/) || [])[1] || '';
ok(/direction: ltr/.test(area) && /text-align: left/.test(area), 'the save code reads left to right');
ok(/area\.dir = 'ltr'/.test(read('./proto/features/settings/savecode-ui.js')), 'the save code box is dir=ltr');
// #454: the label was on the same line as a comment, so it never ran; it must be code, not comment
ok(read('./proto/features/settings/savecode-ui.js').split('\n').some(l => /^\s*area\.setAttribute\('aria-label'/.test(l)), 'the save code box has an aria-label (not inside a comment)');

// ---------- Rafeeq bubbles: never on top of each other, two at most ----------
{
  const { bubbleSpot, BUBBLES_AT_ONCE } = await import('./proto/features/moods/spot.js');
  const over = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < 24;
  // three Rafeeqs side by side on the top row, long lines: every drawn one is clear of the others
  for (const y of [84, 20, 300]) {
    const taken = [];
    for (const x of [300, 330, 360]) { const w = 190, p = bubbleSpot(taken, x, y, w); if (p) taken.push({ ...p, w }); }
    ok(taken.length === BUBBLES_AT_ONCE, `two bubbles show at y ${y} (showed ${taken.length})`);
    ok(taken.every((a, i) => taken.every((b, j) => i === j || !over(a, b))), `bubbles at y ${y} do not overlap`);
    ok(taken.every(b => b.y >= 14 && b.y <= 680 - 14 && b.x - b.w / 2 >= 0 && b.x + b.w / 2 <= 640), `bubbles at y ${y} stay on the stage`);
  }
  ok(bubbleSpot([], 600, 84, 120).x <= 640 - 62, 'a bubble at the edge is pulled in');
}

// ---------- the track stays inside the stage (decision 10) ----------
{
  const trk = read('./proto/features/track/track.css'), pcss = read('./proto/proto.css'), pick = read('./proto/features/picks/picks.css');
  const rule = (src, sel) => { const i = src.indexOf(sel + ' {'); return i < 0 ? '' : src.slice(i, src.indexOf('}', i)); };
  const goal = rule(trk, '#track #goal');
  ok(/flex: 0 1 auto/.test(goal) && /min-width: 0/.test(goal), 'the goal gives way when the line is short of room');
  const gmax = Number((goal.match(/max-width: (\d+)px/) || [])[1]);
  ok(gmax > 0 && gmax <= 180, `the goal is at most 180 px (${gmax})`);
  ok(/max-width: 100%/.test(rule(trk, '#track #goal-pin')), 'the chip row never gets wider than the goal');
  ok(/max-width: 100%/.test(rule(trk, '#track #goal-text')), 'the goal words never get wider than the goal');
  ok(/contain: inline-size/.test(rule(trk, '#trk-level')), 'the level line does not set the width of its spot (it takes what is left)');
  ok(/max-width: 100%/.test(rule(trk, '#trk-level .lv')) && /text-overflow: ellipsis/.test(rule(trk, '#trk-level .lv')), 'the level and land end in dots when room is short');
  ok(/min-width: 96px/.test(rule(trk, '#trk-msg')), 'the message line keeps 96 px');
  ok(/#track\.done[^{]*#goal-pin/.test(trk), 'the chip steps aside when the dig is done');
  const btn = rule(pick, '#goal-pin button');
  ok(/min-width: 0/.test(btn) && /text-overflow: ellipsis/.test(btn), 'the chip word ends in dots instead of spilling');
  ok(/position: absolute/.test(rule(pick, '#goal-pin button::after')), 'the step mark keeps its own room at the chip end');
  // at the 1366 x 768 laptop the stage is about 518 px: the sub line, message line, Tips and the chip with dots fit
  const gap = Number((rule(pcss, '#track').match(/gap: (\d+)px/) || [])[1]);
  ok(gap > 0 && 518 - 3 * gap - 216 - 96 - 42 >= 130, `at 518 px the chip (about 130 px) has room (gap ${gap})`);
  ok(/#banner\.show ~ #hint\.show \{ opacity: 0;/.test(pcss), 'the first hint waits while a banner shows');
  const html = read('./proto.html');
  ok(html.indexOf('id="banner"') > 0 && html.indexOf('id="banner"') < html.indexOf('id="hint"'), 'the banner comes before the hint, so the ~ rule reaches it');
}

// ---------- the night bars ----------
const hitsOf = b => b.n.reduce((a, x) => a + x, 0);
for (const z of BAR_ZONES.filter(z => z.startsWith('n_'))) {
  const day = z.slice(2);
  for (let k = 1; k <= 4; k++) {
    const n = picksBarOf(k, z), d = picksBarOf(k, day);
    ok(n.n.join() === d.n.join(), `${z} ${k}: the same notes as ${day}`);
    ok(hitsOf(n) === 8 * k, `${z} ${k}: 8 hits a pick`);
    ok(!n.v.includes('x'), `${z} ${k}: no plain notes at night, only accents and soft ones`);
    ok(n.v.every((v, i) => v === '.' || v === (d.v[i] === 'X' ? 'X' : 'o')), `${z} ${k}: the day's accents stay, the rest is soft`);
    ok(barFaults(k, { floor: 0.05, maxBpm: 160, zone: z }).length === 0, `${z} ${k}: no faults`);
  }
}
for (let k = 1; k <= 4; k++) {
  const e = picksBarOf(k, 'emptyquarter');
  ok(e.v.join('') === PICKS_BARS[k].vel && e.n.join() === picksBarOf(k).n.join(), `emptyquarter ${k}: the home bar, notes and accents`);
}
for (const z of ['africa', 'eastasia', 'americas', 'europe']) ok(picksBarOf(4, z).v.includes('x'), `${z}: the day bars keep their plain notes`);

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('art and sound: all checks pass');
