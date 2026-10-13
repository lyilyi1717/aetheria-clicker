// Dig feature "picks": the bar. Pure maths, no DOM and no audio, so the rules, the page, the sim
// and the test all read the same rhythm.
//
// A bar is 16 steps (sixteenth notes). A tempo in beats a minute sets the step: 15 / bpm seconds.
// Each pick swings 8 times a bar (once per eighth note on average), so N picks land 8 x N hits a
// bar. The hits are not spread evenly: each pick count has its own groove, written as two strings
// of 16 characters:
//   hits  how many picks land on the step ('.' = a rest). Picks that land together are ONE note
//         (a chord): more picks make a bar richer and louder, never denser than the grid.
//   vel   how loud the note is: 'X' accent, 'x' plain, 'o' soft. Gain only; the sounds are untouched.
export const STEPS = 16;
export const PER_PICK = 8;         // swings of one pick in a bar

export const PICKS_BARS = {
  // a steady beat: strong on the beat, plain on the off-beat
  1: { name: 'bar_1', hits: '1.1.1.1.1.1.1.1.', vel: 'X.x.X.x.X.x.X.x.' },
  // boom-tak: both picks on the beat, a soft pick-up before it, a pair for the tak
  2: { name: 'bar_2', hits: '2.112.2.2.112.2.', vel: 'X.oxX.x.X.oxX.x.' },
  // a gallop (da . da-da); the last beat turns it round (da . da-da becomes da . DA-da)
  3: { name: 'bar_3', hits: '3.123.123.123.21', vel: 'X.oxX.oxX.oxX.xo' },
  // the Gulf 3 + 3 + 2: accents on steps 1, 4 and 7 of each half, claps on the off-beat between
  4: { name: 'bar_4', hits: '4.24.24.4.24.231', vel: 'X.xX.xX.X.xX.xXo' },
};
export const MAX_PICKS = 4;

// Each land beyond Arabia plays its own bar for every pick count (the same 8 hits a pick, so the damage is
// the same; only where the notes fall differs). Only the hits are written; the loudness comes from the hits:
// every pick on the beat is an accent 'X', every pick on another step is plain 'x', fewer picks is soft 'o'.
// The road zone (sites.roadZone) says which set is in play. 'arabia' is PICKS_BARS above, untouched.
export const ZONE_BARS = {
  // djembe and bell: the notes lean on the off-beat
  africa: {
    1: { name: 'bar_africa_1', hits: '1..1.1.11..1.11.' },
    2: { name: 'bar_africa_2', hits: '2.12.1.22.12.1.2' },
    3: { name: 'bar_africa_3', hits: '3.12.3.123.12.33' },
    4: { name: 'bar_africa_4', hits: '4.24.2.4.24.24.4' },
  },
  // taiko: big hits with room between them, then a roll
  eastasia: {
    1: { name: 'bar_eastasia_1', hits: '1...11.11...1.11' },
    2: { name: 'bar_eastasia_2', hits: '2...22.22...2.22' },
    3: { name: 'bar_eastasia_3', hits: '3...32.331..3.33' },
    4: { name: 'bar_eastasia_4', hits: '4...43.44.1.4.44' },
  },
  // clave and samba: the 3-2 clave leads
  americas: {
    1: { name: 'bar_americas_1', hits: '1.11..1.1.1.1.1.' },
    2: { name: 'bar_americas_2', hits: '2.12..2.2.2.2.21' },
    3: { name: 'bar_americas_3', hits: '3.13..3.2.3.3.33' },
    4: { name: 'bar_americas_4', hits: '4.24..4.3.4.4.43' },
  },
  // a march: a long note and a short one, over and over
  europe: {
    1: { name: 'bar_europe_1', hits: '1..11..11..11..1' },
    2: { name: 'bar_europe_2', hits: '2..21.22..221..2' },
    3: { name: 'bar_europe_3', hits: '3..33..33..33..3' },
    4: { name: 'bar_europe_4', hits: '4..44..44..44..4' },
  },
};
export const BAR_ZONES = ['arabia', ...Object.keys(ZONE_BARS)];
const velOf = (hits, count) => [...hits].map((ch, i) => (ch === '.' ? '.' : Number(ch) < count ? 'o' : i % 4 === 0 ? 'X' : 'x')).join('');

// the bar of a pick count as arrays: n[i] picks land on step i, v[i] is 'X' | 'x' | 'o' | '.'
const parsed = {};
export function picksBarOf(count, zone = 'arabia') {
  const k = Math.max(1, Math.min(MAX_PICKS, count | 0));
  const Z = ZONE_BARS[zone];
  const B = Z ? { ...Z[k], vel: velOf(Z[k].hits, k) } : PICKS_BARS[k];
  const key = k + B.hits + B.vel;
  if (!parsed[key]) parsed[key] = { count: k, zone: Z ? zone : 'arabia', name: B.name, n: [...B.hits].map(ch => (ch === '.' ? 0 : Number(ch))), v: [...B.vel] };
  return parsed[key];
}

export const stepSec = bpm => 15 / bpm;                               // one sixteenth
export const barSec = bpm => STEPS * stepSec(bpm);
export const hitsPerSec = (count, bpm) => picksBarOf(count).n.reduce((a, b) => a + b, 0) / barSec(bpm);
export const notesPerSec = (count, bpm) => picksBarOf(count).n.filter(Boolean).length / barSec(bpm);
// the bar as text for a person: "X . x . X x . x"
export const barText = (count, zone) => picksBarOf(count, zone).v.join(' ');

// What is wrong with a bar, as a list of words (empty = fine). `floor` is the least time between two
// notes, `maxBpm` the fastest tempo it will be played at, `run` the longest row of steps with no rest.
export function barFaults(count, { floor, maxBpm, run = 4, zone = 'arabia' }) {
  const B = picksBarOf(count, zone), out = [];
  if (B.n.length !== STEPS || B.v.length !== STEPS) out.push('not 16 steps');
  if (B.n.reduce((a, b) => a + b, 0) !== PER_PICK * count) out.push('not 8 hits a pick');
  if (B.n[0] !== count || B.v[0] !== 'X') out.push('step 1 is not every pick, accented');
  let row = 0, longest = 0;
  for (let i = 0; i < STEPS * 2; i++) { row = B.n[i % STEPS] ? row + 1 : 0; longest = Math.max(longest, row); }
  for (let i = 0; i < STEPS; i++) {
    if (B.n[i] > count || B.n[i] < 0 || Number.isNaN(B.n[i])) out.push('step ' + (i + 1) + ' has too many picks');
    if ((B.n[i] === 0) !== (B.v[i] === '.')) out.push('step ' + (i + 1) + ': hits and loudness disagree');
    if (B.n[i] && !'Xxo'.includes(B.v[i])) out.push('step ' + (i + 1) + ': unknown loudness');
  }
  if (longest > run) out.push('a run of ' + longest + ' steps with no rest');
  if (new Set(B.v.filter(ch => ch !== '.')).size < 2) out.push('no accents');
  if (stepSec(maxBpm) < floor - 1e-9) out.push('notes closer than the floor at ' + maxBpm);
  return out;
}

// ---------- the sequencer ----------
// It turns a clock into notes. The page asks every frame: advance(now, digging, bar, step) returns
// the notes whose time falls inside the look-ahead window, each { t, slot, n, v, hands }:
//   t      when it sounds, on the clock that `now` is read from (never before `now`)
//   n      picks that land (hits of damage);  hands: which picks they are, in turn
// The damage lands when the note is handed out (at most `look` early); the sound is scheduled at t.
//
// The rules of time:
//   - while the dig goes on the bar keeps its phase: step k of the bar is at origin + k * step;
//   - a new hold after a pause of `restart` steps or more starts the bar again from step 1, at once;
//     a shorter pause keeps the phase (so tapping fast is never quicker than holding);
//   - no two notes are ever closer than `floor` seconds;
//   - a note that is more than `late` seconds overdue is dropped, not played in a burst.
export function picksSeq(cfg) {
  const q = {
    pos: 0,            // steps played since the bar started (step in the bar: pos % 16)
    nextT: 0,          // the time of step `pos`
    lastNote: -1e9,    // when the last note sounded
    on: false,         // the dig was going at the last look
    fresh: true,       // nothing played yet
    hand: 0,           // whose turn it is
    slot: -1,          // the step that sounded last (the page lights it)
    reset() { q.pos = 0; q.nextT = 0; q.lastNote = -1e9; q.on = false; q.fresh = true; q.hand = 0; q.slot = -1; },
    advance(now, dig, bar, step) {
      if (!dig) { q.on = false; return []; }
      if (!q.on) {
        q.on = true;
        if (q.fresh || now - q.nextT >= cfg.restart * step) { q.pos = 0; q.hand = 0; q.nextT = Math.max(now, q.lastNote + cfg.floor); q.fresh = false; }
      }
      const out = [];
      while (q.nextT <= now + cfg.look) {
        const slot = q.pos % STEPS, n = bar.n[slot];
        if (n) {
          const t = Math.max(q.nextT, now, q.lastNote + cfg.floor);
          if (t - q.nextT <= cfg.late) {
            const hands = [];
            for (let i = 0; i < n; i++) hands.push((q.hand + i) % bar.count);
            q.hand = (q.hand + n) % bar.count;
            q.lastNote = t; q.slot = slot;
            out.push({ t, slot, n, v: bar.v[slot], hands });
          }
        }
        q.pos++; q.nextT += step;
      }
      return out;
    },
    // the time of the next step at or after `now` whose place in the beat is `phase` (0..3), or any step
    gridAfter(now, step, phase = -1) {
      let k = Math.ceil((now - q.nextT) / step - 1e-9);
      if (phase >= 0) while ((((q.pos + k) % 4) + 4) % 4 !== phase) k++;
      return q.nextT + k * step;
    },
  };
  return q;
}
