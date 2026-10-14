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
//   - Faster Hands raises the tempo of the whole bar: 100, 110, 120, 132, 144, 160 beats a minute.
//   - `heft`: a strike on the eighth note is two swings of the rules landing together, so one pick at
//     100 beats a minute does exactly what the old held mouse did (3.33 x 2 = 6.67 swings a second),
//     and every rule that counts swings (Boom Pick, big hits, Echo, the glass pick) is untouched.
//
// How it is earned (all of it is meant to move onto the Pick track of docs/dig-upgrades-study.md):
//   Second Pick   coins, once, for ever (opens at the first Big Rock)
//   One More Pick Stars, twice, for ever (the third and the fourth pick), in a small shop of its own;
//                 the third is sold once you have broken Big Rock 4 (100 m), the fourth after Big Rock 6 (150 m)
//   Faster Hands  coins, five steps, per site like Stronger Pick
//
// Events of its own: `picksMore { n }` (a pick was added). The page side owns the timing
// (ui.js: the look-ahead scheduler on the audio clock); this file has no clock in it.
import { use, emit } from '../../core/registry.js';
import { swing, itemLevel, itemOpen, buy } from '../../core/rules.js';
import { starshopPunch } from '../starshop/rules.js';
import { roadZone, ROAD, roadKey } from '../sites/rules.js';
import { t } from '../../core/strings.js';
import { WING, wingCount, wingDone } from '../wing2/rules.js';
import { PICKS_BARS, ZONE_BARS, BAR_ZONES, MAX_PICKS, picksBarOf, stepSec, hitsPerSec, barFaults, isAccentWindow, inAccentWindow } from './beat.js';
import strings from './strings.js';

export { PICKS_BARS, ZONE_BARS, BAR_ZONES, picksBarOf, picksSeq, barText as picksBarText, barFaults as picksBarFaults, stepSec as picksStepSec, hitsPerSec as picksHitsPerSec, notesPerSec as picksNotesPerSec, isAccentWindow, inAccentWindow } from './beat.js';

const p = {
  tempos: [100, 110, 120, 132, 144, 160],   // beats a minute, by Faster Hands level
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
  secondCost: 12000,       // coins, once (the mid player of the sim buys it about minute 8 to 10)
  starCosts: [150, 50000], // Stars for the third and the fourth pick
  starRocks: [4, 6],       // and the Big Rock you must have broken once, ever, before each is sold (100 m, 150 m)
  tempoOpen: 150,          // Faster Hands opens when this many coins have been dug at the site
  tempoBase: 250, tempoGrow: 6,
  // Faster Hands bought with coins stops at tempoCap beats a minute. The faster tempos are found, not bought: each opens for good
  // (it survives every New Site) when its road level is finished, and then it is one more Faster Hands level, paid in coins.
  tempoCap: 132,
  tempoGate: [{ bpm: 144, level: 16, text: 'tempo_lock_144' }, { bpm: 160, level: 20, text: 'tempo_lock_160' }],   // road level (1 to 20) that opens it
};

// a tempo may never put two notes closer than the floor
const bpmOf = lv => Math.min(p.tempos[Math.max(0, Math.min(p.tempos.length - 1, lv))], 15 / p.floor);

// is the road level finished (ever)? Level 16 ends the Americas, level 20 ends the road.
const roadDone = n => s => { const f = ROAD[n - 1], st = f && s.road && s.road.stamps[roadKey(f)]; return !!(st && st.fin); };
// the gate that stands in front of the next Faster Hands level: { bpm, level, text } or null (the next step is free to buy, or there is none)
export function picksTempoGate(s) {
  const lv = (s.up && s.up.tempo) || 0, bpm = p.tempos[lv + 1];
  if (bpm === undefined || bpm <= p.tempoCap) return null;
  const g = p.tempoGate.find(x => x.bpm === bpm);
  return g && !roadDone(g.level)(s) ? g : null;
}
// "Opens when you finish the Americas" while the next tempo is shut, else ''
export const picksTempoLock = s => { const g = picksTempoGate(s); return g ? t(g.text) : ''; };

export const picksCount = s => Math.min(MAX_PICKS, 1 + (s.picks && s.picks.second ? 1 : 0) + ((s.picksUp && s.picksUp.pick3) || 0));
export const picksBpm = s => bpmOf((s.up && s.up.tempo) || 0);
export const picksStep = s => stepSec(picksBpm(s));                    // seconds per step
// the bar in play: the pick count's groove, in the beat of the land the dig is in (sites.roadZone)
export const picksBar = s => picksBarOf(picksCount(s), roadZone(s));
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

for (const zone of BAR_ZONES) for (const k of Object.keys(PICKS_BARS)) {
  const bad = barFaults(Number(k), { floor: p.floor, maxBpm: Math.max(...p.tempos), zone });
  if (bad.length) throw new Error(`Dig: the ${zone} bar for ${k} picks is wrong: ${bad.join('; ')}`);
}

// ---------- the pinned goal ----------
// The player pins ONE thing and the goal bar follows it: this level's Gate (the default), the Second
// Pick (a price to save for) or the Museum set that is closest to done. Pinning never blocks a purchase.
export const PICKS_PINS = ['gate', 'pick2', 'set'];
// the Museum set nearest to done that you have started: { set, a, b } or null
export function picksSetNear(s) {
  let best = null, bf = -1;
  for (const k of Object.keys(WING)) {
    if (wingDone(s, k)) continue;
    const a = wingCount(s, k), b = WING[k].pieces.length;
    if (a > 0 && a / b > bf) { bf = a / b; best = { set: k, a, b }; }
  }
  return best;
}
// which pins can be chosen now
// the chip's hover tip and spoken label for the goal it shows: names the goal and says a tap moves on
export const picksPinTip = what => t('pin_tip', { goal: t('pin_' + what) });
export const picksPinOk = (s, what) => what === 'gate' || (what === 'pick2' && itemOpen(s, 'pick2')) || (what === 'set' && !!picksSetNear(s));
// the pin in force: a pin whose thing is gone (bought, finished) falls back to the Gate
export const picksPin = s => { const w = (s.picks && s.picks.pin) || 'gate'; return picksPinOk(s, w) ? w : 'gate'; };
export function picksSetPin(s, what) { if (!PICKS_PINS.includes(what) || !picksPinOk(s, what)) return false; s.picks.pin = what; return true; }
// saving for the Second Pick: the cheap buttons say they would delay it (they still work)
export const picksSaving = s => picksPin(s) === 'pick2' && s.coins < p.secondCost;

export const picksInAccentWindow = (s, clock, toleranceMs = 100) =>
  isAccentWindow(clock, picksBpm(s), picksCount(s), roadZone(s), toleranceMs);

export function recordGoodHit(s, ev) {
  s.goodHitStreak = (s.goodHitStreak || 0) + 1;
  if (!s.fever) s.fever = { streak: 0, active: false, timer: 0 };
  if (!s.fever.active) {
    s.fever.streak = (s.fever.streak || 0) + 1;
    if (s.fever.streak >= 8) {
      triggerFever(s, ev);
    }
  }
}

export function triggerFever(s, ev, duration = 20) {
  if (!s.fever) s.fever = { streak: 0, active: false, timer: 0 };
  s.fever.active = true;
  s.fever.timer = duration;
  s.fever.streak = 0;
  const eventSink = typeof ev === 'function' ? ev : (() => {});
  emit(s, eventSink, 'feverStart', { duration });
}

export function goodHit(s, r, c, ev) {
  const eventSink = typeof ev === 'function' ? ev : (() => {});
  recordGoodHit(s, eventSink);
  s._goodHit = true;
  try {
    const ok = swing(s, r, c, eventSink);
    emit(s, eventSink, 'goodHit', { r, c, mult: 2.5, streak: s.goodHitStreak });
    return ok;
  } finally {
    s._goodHit = false;
  }
}

export function rhythmicSwing(s, r, c, clock, ev) {
  const tClock = clock !== undefined ? clock : (s.t || 0);
  const inWindow = picksInAccentWindow(s, tClock, 100);
  if (inWindow) {
    return goodHit(s, r, c, ev);
  } else {
    // off-beat active hit: reset streak without penalizing HP
    s.goodHitStreak = 0;
    if (s.fever && !s.fever.active) s.fever.streak = 0;
    return swing(s, r, c, ev);
  }
}

const moved = s => (s.stars || 0) > 0 || (s.starSpent || 0) > 0;
const more = (s, ev) => emit(s, ev, 'picksMore', { n: picksCount(s) });

export const picks = use({
  id: 'picks',
  params: p,
  strings,
  tables: { PICKS_BARS },
  state: {
    picks: { init: () => ({ second: false, pin: 'gate' }), survives: ['site', 'land'] },   // the Second Pick is for ever; pin = the goal shown
    picksBank: { init: () => 0 },   // the sim's scripted player puts coins aside here while it saves (the page never uses it)
    goodHitStreak: { init: () => 0, perSite: true },
    fever: { init: () => ({ streak: 0, active: false, timer: 0 }), perSite: true },
  },
  // the Star picks have a small shop of their own (the Star tracks' panel shows only its tracks)
  shops: { picks: { at: 30, wallet: 'stars', levels: 'picksUp', survives: ['site', 'land'] } },
  // Punch-through (core/rules.js `swing`) reads its reach from the `punch` mod: the Pick track says how far
  mods: {
    punch: (v, s) => Math.max(v, starshopPunch(s)),
    swingDmg: (v, s) => {
      let mult = 1;
      if (s._goodHit) mult *= 2.5;
      if (s.fever && s.fever.active) mult *= 1.5;
      return v * mult;
    },
    coinMult: (v, s) => (s.fever && s.fever.active ? v * 2.0 : v),
  },
  hooks: {
    step: {
      at: 250,
      fn(s, dt, ev) {
        if (s.fever && s.fever.active) {
          const isDigging = s.digging !== undefined ? !!s.digging : (s.t - (s._lastSwingT || 0) <= 1.0);
          if (isDigging) {
            s.fever.timer -= dt;
            if (s.fever.timer <= 0) {
              s.fever.active = false;
              s.fever.timer = 0;
              s.fever.streak = 0;
              emit(s, ev, 'feverEnd', {});
            }
          }
        }
      },
    },
    swung(s, sw) {
      s._lastSwingT = s.t;
    },
  },
  items: {
    // per site, like Stronger Pick
    tempo: { at: 12, shop: 'coin', max: p.tempos.length - 1, levels: 'grind',
      cost: (s, lv) => Math.ceil(p.tempoBase * Math.pow(p.tempoGrow, lv)),
      open: s => (s.up.tempo > 0 || s.total >= p.tempoOpen) && !picksTempoGate(s) },     // shut past the cap until its road level is finished (picksTempoLock says why)
    // once, for ever: it leaves the shop when it is bought
    pick2: { at: 14, shop: 'coin', max: 1, levels: 'core',
      cost: s => (s.picks.second ? Infinity : p.secondCost),
      open: s => !s.picks.second && ((s.bossesDown || 0) >= p.secondRock || moved(s)),
      bought(s, lv, ev) { s.picks.second = true; s.picks.pin = 'gate'; more(s, ev); } },
    // the third and the fourth pick, for Stars (counted in starSpent, like the Star tracks, so the pacing still sees the Stars earned)
    pick3: { at: 10, shop: 'picks', max: p.starCosts.length, levels: 'core',
      cost: (s, lv) => p.starCosts[Math.min(lv, p.starCosts.length - 1)],
      open: s => s.picks.second && moved(s) && (s.starBoss || 0) >= (p.starRocks[itemLevel(s, 'pick3')] || 0),
      bought(s, lv, ev) { s.starSpent = (s.starSpent || 0) + p.starCosts[lv - 1]; more(s, ev); } },
  },
  // the scripted player: coin items are bought by the sim itself; the Star one is bought here
  // The sim's shop buys the cheapest thing it can afford, so coins never reach 12,000 and nobody saves.
  // The scripted player now saves: once the Second Pick is open it pins it and puts its coins aside
  // (`picksBank`), so the cheap buttons see only the last few seconds of income, until it can pay.
  bot: { shop(s, api) {
    const ev = api && api.ev;
    let n = 0;
    if (itemLevel(s, 'pick3') < p.starCosts.length && itemOpen(s, 'pick3') && buy(s, 'pick3', ev)) n++;
    if (!s.picks.second && itemOpen(s, 'pick2')) {
      s.picks.pin = 'pick2';
      if (s.coins + s.picksBank >= p.secondCost) {
        s.coins += s.picksBank; s.picksBank = 0;
        if (buy(s, 'pick2', ev)) { n++; if (api && api.trk) api.trk.mark('second pick'); }
      } else { s.picksBank += s.coins; s.coins = 0; }
    }
    return n;
  } },
});
