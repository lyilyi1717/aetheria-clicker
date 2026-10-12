// Dig feature "picks": more picks that play a rhythm, and a tempo you can raise.
//
// What it does to the rules:
//   - The player's swings no longer come at an even 6.7 a second. They come as NOTES of a looping bar
//     (beat.js): one pick plays a steady beat on the eighth note, and every extra pick is a real
//     extra hit of your own pick (same strength, big hits, Echo, Boom Pick's count, spill-over: all of
//     it, once per pick), so 2 picks are about x2 and 4 picks x4.
//   - Picks that land on the same step are one note. Its hits go to the block under the pointer; when
//     that block breaks the rest go on to the next block the pointer finds (picksStrike), so a strong
//     hand sweeps down a column and no hit is wasted.
//   - Faster Hands raises the tempo of the whole bar: 100, 112, 126, 140, 160, 180 beats a minute.
//   - `heft`: a strike on the eighth note is two swings of the rules landing together, so one pick at
//     100 beats a minute does exactly what the old held mouse did (3.33 x 2 = 6.67 swings a second),
//     and every rule that counts swings (Boom Pick, big hits, Echo, the glass pick) is untouched.
//
// How it is earned (all of it is meant to move onto the Pick track of docs/dig-upgrades-study.md):
//   Second Pick   coins, once, for ever (opens at the first Big Rock)
//   One More Pick Stars, twice, for ever (the third and the fourth pick), in a small shop of its own
//   Faster Hands  coins, five steps, per site like Stronger Pick
//
// Events of its own: `picksMore { n }` (a pick was added). The page side owns the timing
// (ui.js: the look-ahead scheduler on the audio clock); this file has no clock in it.
import { use, emit } from '../../core/registry.js';
import { swing, itemLevel, buy } from '../../core/rules.js';
import { starshopPunch } from '../starshop/rules.js';
import { PICKS_BARS, MAX_PICKS, picksBarOf, stepSec, hitsPerSec, barFaults } from './beat.js';
import strings from './strings.js';

export { PICKS_BARS, picksBarOf, picksSeq, barText as picksBarText, barFaults as picksBarFaults, stepSec as picksStepSec, hitsPerSec as picksHitsPerSec, notesPerSec as picksNotesPerSec } from './beat.js';

const p = {
  tempos: [100, 112, 126, 140, 160, 180],   // beats a minute, by Faster Hands level
  // The least time between two notes, in seconds. 75 ms = 13 notes a second: the hit sound's own
  // body is 74 ms long (4 ms in, 70 ms out), so two notes this far apart never overlap, and it is the
  // sixteenth note at 200 beats a minute, about the fastest a hand drummer plays as separate notes.
  // Closer than about 50 ms a row of hits turns into a buzz.
  floor: 0.075,
  heft: 2,                 // a strike of one pick = this many swings of the rules (a whole number)
  oldRate: 1 / 0.15,       // the old held mouse: hits a second (the sim's players are measured against it)
  gain: { X: 1, x: 0.7, o: 0.48 },   // how loud an accent, a plain note and a soft note are
  // the page's scheduler (seconds)
  look: 0.04,              // how far ahead of the clock a note is handed out: the damage and the picture lead the sound by at most this
  late: 0.06,              // a note more than this overdue is dropped
  restart: 4,              // steps of silence after which a new hold starts the bar from the top (one beat)
  // other sounds while the bar plays. 'offbeat': on the next off-beat eighth (the Gulf clap);
  // 'grid': on the next step; 'free': whenever they happen, as before
  crewMix: 'offbeat', crewGain: 0.7,
  backMix: 'grid', backGain: 0.8, back: ['hit', 'break', 'crit', 'coin'],   // your own delayed hits, chain breaks, coin ticks
  // prices
  secondRock: 1,           // Second Pick opens when this many Big Rocks are down (or you have ever moved)
  secondCost: 4000,        // coins, once
  starCosts: [40, 160],    // Stars for the third and the fourth pick
  tempoOpen: 150,          // Faster Hands opens when this many coins have been dug at the site
  tempoBase: 250, tempoGrow: 6,
};

// a tempo may never put two notes closer than the floor
const bpmOf = lv => Math.min(p.tempos[Math.max(0, Math.min(p.tempos.length - 1, lv))], 15 / p.floor);

export const picksCount = s => Math.min(MAX_PICKS, 1 + (s.picks && s.picks.second ? 1 : 0) + ((s.picksUp && s.picksUp.pick3) || 0));
export const picksBpm = s => bpmOf((s.up && s.up.tempo) || 0);
export const picksStep = s => stepSec(picksBpm(s));                    // seconds per step
export const picksBar = s => picksBarOf(picksCount(s));
export const picksHps = s => hitsPerSec(picksCount(s), picksBpm(s));   // hits a second while the mouse is held
// how the hand's swings a second compare with the old held mouse (1 at the start: half as many strikes, two swings each)
export const picksPace = s => picksHps(s) * p.heft / p.oldRate;
export const picksGain = v => p.gain[v] || 1;

// One note: `n` picks strike, each for `heft` swings. aim() says where the pointer's pick would land
// now ([r, c] or null); it is asked again after every swing, so when a block breaks the rest of the
// note goes to the next one. before(i) is called ahead of pick i's swings (the page uses it to say
// which pick is swinging). Returns the swings that landed.
export function picksStrike(s, n, aim, ev, before) {
  let done = 0;
  for (let i = 0; i < n; i++) {
    if (before) before(i);
    for (let k = 0; k < p.heft; k++) {
      const tg = aim();
      if (!tg) return done;
      if (swing(s, tg[0], tg[1], ev)) done++;
    }
  }
  return done;
}

for (const k of Object.keys(PICKS_BARS)) {
  const bad = barFaults(Number(k), { floor: p.floor, maxBpm: Math.max(...p.tempos) });
  if (bad.length) throw new Error(`Dig: the bar for ${k} picks is wrong: ${bad.join('; ')}`);
}

const moved = s => (s.stars || 0) > 0 || (s.starSpent || 0) > 0;
const more = (s, ev) => emit(s, ev, 'picksMore', { n: picksCount(s) });

export const picks = use({
  id: 'picks',
  params: p,
  strings,
  tables: { PICKS_BARS },
  state: {
    picks: { init: () => ({ second: false }), survives: ['site', 'land'] },   // the Second Pick is for ever
  },
  // the Star picks have a small shop of their own (the Star tracks' panel shows only its tracks)
  shops: { picks: { at: 30, wallet: 'stars', levels: 'picksUp', survives: ['site', 'land'] } },
  // Punch-through (core/rules.js `swing`) reads its reach from the `punch` mod: the Pick track says how far
  mods: { punch: (v, s) => Math.max(v, starshopPunch(s)) },
  items: {
    // per site, like Stronger Pick
    tempo: { at: 12, shop: 'coin', max: p.tempos.length - 1, levels: 'grind',
      cost: (s, lv) => Math.ceil(p.tempoBase * Math.pow(p.tempoGrow, lv)),
      open: s => s.up.tempo > 0 || s.total >= p.tempoOpen },
    // once, for ever: it leaves the shop when it is bought
    pick2: { at: 14, shop: 'coin', max: 1, levels: 'core',
      cost: s => (s.picks.second ? Infinity : p.secondCost),
      open: s => !s.picks.second && ((s.bossesDown || 0) >= p.secondRock || moved(s)),
      bought(s, lv, ev) { s.picks.second = true; more(s, ev); } },
    // the third and the fourth pick, for Stars (the Star bonus counts Stars ever earned, so spending costs nothing)
    pick3: { at: 10, shop: 'picks', max: p.starCosts.length, levels: 'core',
      cost: (s, lv) => p.starCosts[Math.min(lv, p.starCosts.length - 1)],
      open: s => s.picks.second && moved(s),
      bought(s, lv, ev) { s.starSpent = (s.starSpent || 0) + p.starCosts[lv - 1]; more(s, ev); } },
  },
  // the scripted player: coin items are bought by the sim itself; the Star one is bought here
  bot: { shop(s, api) { return itemLevel(s, 'pick3') < p.starCosts.length && s.picks.second && buy(s, 'pick3', api && api.ev) ? 1 : 0; } },
});
