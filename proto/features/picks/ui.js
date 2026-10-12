// Dig feature (page side): the picks' bar. It owns the swing rhythm (`cadence`), schedules every
// note's sounds on the audio clock, draws the extra picks, and shows the bar as a row of dots.
//
// Timing. Each frame the sequencer (beat.js) hands out the notes that fall inside the next `look`
// seconds of the AUDIO clock. A note's hits land in the rules at once (so the picture leads the
// sound by at most `look`, 40 ms), and every sound those hits make (hit, break, big hit: the game's
// own sounds, chosen by the game's own logic) is moved to the note's exact time by the mixer
// (ui/audio.js). So the groove does not depend on the frame rate. With no audio yet (no click so
// far, or a muted start) the same bar runs on the page clock.
//
// The mix while the bar plays (numbers in the feature's params):
//   - the player's bar is in front: accents by gain only ('X' 1, 'x' 0.7, 'o' 0.48);
//   - Rafeeq hits are quieter and wait for the next off-beat eighth (`crewMix: 'offbeat'`): the clap;
//   - your own delayed hits, chain breaks and coin ticks wait for the next step (`backMix: 'grid'`).
//   So every one of those sounds starts on a step of the bar: never two starts closer than a step
//   (83 ms at the top tempo), at most 12 starts a second however much is going on.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { AT, fx } from '../../ui/render.js';
import { setMixer, audioTime } from '../../ui/audio.js';
import { S, badge, pickShape } from '../../ui/icons.js';

const { t } = G;
const P = G.PARAMS.picks;
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const VOICED = new Set(['hit', 'crit', 'break']);     // the sounds an accent makes louder or softer

const seq = G.picksSeq(P);
let perf = true;            // the bar is running on the page clock (no audio clock yet)
let running = false;        // the bar is playing
let note = null;            // the note whose hits are landing right now: { at, gain }
let stepNow = 0.15;
const swingT = [0, 0, 0, 0];   // the swing of each extra pick (1 = just struck)

const clock = () => { const a = audioTime(); return a === null ? performance.now() / 1000 : a; };

setMixer(name => {
  if (note) return { at: note.at, gain: VOICED.has(name) ? note.gain : 1 };
  if (!running || perf) return null;
  const crew = name === 'crew';
  const mode = crew ? P.crewMix : P.back.includes(name) ? P.backMix : 'free';
  if (mode === 'free') return null;
  const now = clock();
  return { at: Math.max(0, seq.gridAfter(now, stepNow, mode === 'offbeat' ? 2 : -1) - now), gain: crew ? P.crewGain : P.backGain };
});

// ---------- the bar on screen ----------
let strip = null, dots = [], label = null, shown = '', lit = -1, litEnd = 0;
function showBar(s) {
  const bar = G.picksBar(s), bpm = G.picksBpm(s), sig = bar.count + ':' + bpm;
  if (sig === shown) return;
  shown = sig;
  for (let i = 0; i < dots.length; i++) dots[i].className = (bar.n[i] ? 'n v-' + bar.v[i] : 'r') + (i % 4 === 0 ? ' beat' : '');
  label.textContent = t('picks_beat', { n: bpm });
  strip.title = t(bar.name);
}
function light(slot, until = 0) {
  if (lit >= 0) dots[lit].classList.remove('on');
  lit = slot; litEnd = until;
  if (slot >= 0) dots[slot].classList.add('on');
}

// ---------- the extra picks ----------
// where each one is held, next to the pointer's own pick: [dx, dy, mirrored, size]
const HOLD = [null, [-16, -8, true, 0.86], [34, 8, false, 0.78], [-34, 14, true, 0.72]];
function drawExtras(g, s, dt) {
  const n = G.picksCount(s);
  for (let i = 1; i < 4; i++) swingT[i] = Math.max(0, swingT[i] - dt * 7);
  if (n < 2 || !fx.mouse.inside) return;
  for (let i = n - 1; i >= 1; i--) {
    const [dx, dy, flip, size] = HOLD[i], k = swingT[i];
    g.save(); g.translate(fx.mouse.x + dx, fx.mouse.y + dy);
    g.scale(flip ? -size : size, size);
    g.rotate(reduced ? 0.5 : 0.5 - k * 1.3);
    g.lineCap = 'round';
    g.strokeStyle = '#111'; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.lineTo(26, -30); g.stroke();
    g.strokeStyle = '#a8672c'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(26, -30); g.stroke();
    g.strokeStyle = '#111'; g.lineWidth = 10; g.beginPath(); g.moveTo(4, -40); g.quadraticCurveTo(30, -40, 42, -16); g.stroke();
    g.strokeStyle = fx.hot ? '#ffd23f' : reduced && k > 0 ? '#ffffff' : '#c9d3dc'; g.lineWidth = 6; g.beginPath(); g.moveTo(4, -40); g.quadraticCurveTo(30, -40, 42, -16); g.stroke();
    g.restore();
  }
}

const two = `<g transform="translate(-4 -1)">${pickShape()}</g><g transform="translate(5 3)">${pickShape('#ffd23f')}</g>`;

ui({
  id: 'picks',
  css: new URL('./picks.css', import.meta.url).href,
  icons: {
    up_pick2: badge('#3b6ea8', two),
    up_pick3: badge('#7a4bb0', `<g transform="translate(-6 -2)">${pickShape()}</g><g transform="translate(1 1)">${pickShape('#ffd23f')}</g><g transform="translate(7 4)">${pickShape()}</g>`),
    up_tempo: badge('#c2571a', `<path d="M6 9 L13 16 L6 23" fill="none" ${S} stroke-width="5"/><path d="M6 9 L13 16 L6 23" fill="none" stroke="#ffe14a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 9 L22 16 L15 23" fill="none" ${S} stroke-width="5"/><path d="M15 9 L22 16 L15 23" fill="none" stroke="#ffe14a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="26.5" cy="16" r="2.2" fill="#ffe14a" ${S}/>`),
  },
  items: {
    tempo: { desc(s, lv) { const T = P.tempos; return lv >= T.length - 1 ? t('up_tempo_full', { a: G.picksBpm(s) }) : t('up_tempo_d', { a: T[lv], b: T[lv + 1] }); } },
    pick2: { noLevel: true, desc: () => t('up_pick2_d') },
    pick3: { desc: (s, lv) => t('up_pick3_d' + Math.min(lv + 1, P.starCosts.length)) },
  },
  // The swing rhythm. dig: the player is digging now (held or auto dig, something under the pick).
  cadence: {
    frame(dig, app) {
      const s = app.state, a = audioTime();
      if ((a === null) !== perf) { perf = a === null; seq.reset(); }      // the clock changed: start the bar again
      const now = a === null ? performance.now() / 1000 : a;
      stepNow = G.picksStep(s);
      running = dig;
      if (lit >= 0 && now >= litEnd) light(-1);
      for (const n of seq.advance(now, dig, G.picksBar(s), stepNow)) {
        note = { at: Math.max(0, n.t - now), gain: G.picksGain(n.v) };
        try {
          G.picksStrike(s, n.n, () => app.target(), app.ev, i => { const h = n.hands[i]; app.flags.hand = h; if (h) swingT[h] = 1; });
        } finally { note = null; app.flags.hand = 0; }
        light(n.slot, n.t + Math.min(0.12, stepNow));
      }
    },
  },
  draw: [{ at: AT.pick + 1, fn: drawExtras }],
  mount(app) {
    strip = document.createElement('div'); strip.id = 'picks-beat';
    if (reduced) strip.classList.add('still');
    for (let i = 0; i < 16; i++) { const d = document.createElement('i'); strip.appendChild(d); dots.push(d); }
    label = document.createElement('b'); strip.appendChild(label);
    app.el.stage.appendChild(strip);
  },
  tick(s) { if (strip) showBar(s); },
  on: {
    picksMore(d, app) { app.toast(t('t_picks_' + d.n), 'gold'); for (let i = 1; i < 4; i++) swingT[i] = 1; app.dirty(); },
    buy(d, app) { if (d.id === 'tempo') app.toast(t('t_tempo', { n: G.picksBpm(app.state) }), 'gold'); },
  },
});
