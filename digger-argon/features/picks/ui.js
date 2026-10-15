// Dig feature (page side): the picks' bar. It owns the swing rhythm (`cadence`), schedules every
// note's sounds on the audio clock, draws the extra picks. The beat is heard, not drawn: the tempo shows on the Faster Hands button.
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
//   (94 ms at the top tempo), at most 11 starts a second however much is going on.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { AT, fx, centre, text, spark, ring, shake, W, H } from '../../ui/render.js';
import { setMixer, audioTime, setKit, sfx } from '../../ui/audio.js';
import { triggerHaptic, isFeverActive } from './rules.js';
import './kits.js';
import { S, badge, pickShape } from '../../ui/icons.js';
import { shopPanel } from '../../ui/shop.js';

const { t, fmt } = G;
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

// For the sound test page (proto/soundboard.html): play one sound the way a note of the bar does, `at` seconds
// from now, accented by `gain`. It does not change the sound or the rule; it is the same shift the bar uses.
export function picksPlayAt(at, gain, fn) {
  note = { at, gain };
  try { fn(); } finally { note = null; }
}


// ---------- the kit: the sounds of the land, a little lower the deeper you are ----------
const DEEP = { black: 1, living: 2, angry: 3, hot: 4 };
let zoneNow = '';
function setSound(s) { setKit(G.roadZone(s), DEEP[G.frontLayer(s).id] || 0); }

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

function drawFeverOverlay(g, s, dt) {
  const active = isFeverActive(s);
  const streak = (s.picks && s.picks.feverStreak) || (s.fever && s.fever.streak) || (s.goodHitStreak || 0);
  const goal = s.feverGoal || (s.picks && s.picks.feverGoal) || 20;

  // Draw circular Fever Gauge in the top-right corner
  const gx = W - 28, gy = 32, gr = 16;
  g.save();
  g.beginPath();
  g.arc(gx, gy, gr, 0, Math.PI * 2);
  g.fillStyle = 'rgba(14, 10, 7, 0.75)';
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = '#2b231a';
  g.stroke();

  if (active) {
    const timer = (s.picks && s.picks.feverTimer) || (s.fever && s.fever.timer) || 0;
    const maxDur = s.feverDuration || 20;
    const fProg = Math.max(0, Math.min(1, timer / maxDur));
    g.beginPath();
    g.arc(gx, gy, gr, -Math.PI / 2, -Math.PI / 2 + fProg * Math.PI * 2);
    g.strokeStyle = '#ffd23f';
    g.lineWidth = 3.5;
    g.stroke();

    g.font = '800 13px system-ui, Cairo, sans-serif';
    g.fillStyle = '#ffd23f';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('YALLA!', gx, gy);
  } else if (streak > 0) {
    const sProg = Math.max(0, Math.min(1, streak / goal));
    g.beginPath();
    g.arc(gx, gy, gr, -Math.PI / 2, -Math.PI / 2 + sProg * Math.PI * 2);
    g.strokeStyle = '#ffd23f';
    g.lineWidth = 3;
    g.stroke();

    g.font = '800 13px system-ui, Cairo, sans-serif';
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(streak), gx, gy);
  }
  g.restore();

  if (!active) return;

  // Glowing golden Arabesque filigree border around viewport
  const pulse = 0.7 + 0.3 * Math.sin(fx.t * 8);
  const bw = 10;
  g.save();
  g.strokeStyle = `rgba(255, 210, 63, ${0.55 + pulse * 0.35})`;
  g.lineWidth = 3;
  g.shadowColor = '#ffd23f';
  g.shadowBlur = 12 * pulse;

  // Outer border
  g.strokeRect(4, 4, W - 8, H - 8);

  // Inner filigree geometric border
  g.lineWidth = 1.5;
  g.strokeStyle = `rgba(255, 225, 74, ${0.7 + pulse * 0.3})`;
  g.strokeRect(bw, bw, W - bw * 2, H - bw * 2);

  // Arabesque corner motifs (8-pointed stars and diagonal corner brackets)
  const corners = [
    [bw, bw, 1, 1],
    [W - bw, bw, -1, 1],
    [bw, H - bw, 1, -1],
    [W - bw, H - bw, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + sx * 18, cy);
    g.lineTo(cx + sx * 18, cy + sy * 6);
    g.lineTo(cx + sx * 6, cy + sy * 6);
    g.lineTo(cx + sx * 6, cy + sy * 18);
    g.lineTo(cx, cy + sy * 18);
    g.closePath();
    g.fillStyle = `rgba(255, 210, 63, ${0.3 + pulse * 0.3})`;
    g.fill();
    g.stroke();
  }
  g.restore();
}

const two = `<g transform="translate(-4 -1)">${pickShape()}</g><g transform="translate(5 3)">${pickShape('#ffd23f')}</g>`;

// ---------- the pinned goal: chips beside the goal bar, a pin on the Second Pick, a note on the cheap buttons ----------
let pinRow = null, pinDots = null;
const pinBtns = {};
function pinMount(app) {
  const goal = document.getElementById('goal');
  if (!goal) return;
  // one chip in the goal spot (art-and-sound decision 5): it shows the goal on the bar, a tap steps to the next one, and a dot
  // per choice (the filled one is this) says there are more. Three chips side by side pushed the top line over its neighbours.
  pinRow = document.createElement('div'); pinRow.id = 'goal-pin'; pinRow.hidden = true;
  for (const k of G.PICKS_PINS) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = t('pin_' + k); b.dataset.pin = k;
    b.addEventListener('click', () => {
      app.unlockAudio();
      const ok = G.PICKS_PINS.filter(x => G.picksPinOk(app.state, x));
      for (let i = 1; i <= ok.length; i++) if (G.picksSetPin(app.state, ok[(ok.indexOf(k) + i) % ok.length])) { app.refresh(true); break; }
    });
    pinBtns[k] = b; pinRow.appendChild(b);
  }
  pinDots = document.createElement('span'); pinDots.className = 'pin-dots'; pinDots.setAttribute('aria-hidden', 'true');
  pinRow.appendChild(pinDots);
  goal.appendChild(pinRow);
}
function pinTick(s, app) {
  if (pinRow) {
    const ok = G.PICKS_PINS.filter(k => G.picksPinOk(s, k)), cur = G.picksPin(s), shown = ok.includes(cur) ? cur : ok[0];
    pinRow.hidden = ok.length < 2;
    for (const k of G.PICKS_PINS) {
      const b = pinBtns[k], tip = G.picksPinTip(k);
      b.hidden = k !== shown; b.classList.toggle('on', k === cur);
      if (b.title !== tip) { b.title = tip; b.setAttribute('aria-label', tip); }
    }
    const dots = ok.map(k => (k === shown ? 1 : 0)).join('');
    if (pinDots.dataset.d !== dots) { pinDots.dataset.d = dots; pinDots.innerHTML = [...dots].map(d => `<i${d === '1' ? ' class="on"' : ''}></i>`).join(''); }
  }
  const saving = G.picksSaving(s);
  for (const b of document.querySelectorAll('.shop-item[data-id]')) {
    const id = b.dataset.id, tx = b.querySelector('.tx');
    if (!tx || b.hidden) continue;
    let note = tx.querySelector('.delay-note');
    const want = saving && id !== 'pick2' && b.closest('#shop, .shop-list') && G.ITEMS[id] && G.ITEMS[id].shop === 'coin';
    if (want && !note) { note = document.createElement('small'); note.className = 'delay-note'; note.textContent = t('delay_note'); tx.appendChild(note); }
    else if (!want && note) note.remove();
    if (id === 'pick2') {
      let pin = tx.querySelector('.pin-btn');
      if (!pin) {
        pin = document.createElement('span'); pin.className = 'pin-btn'; pin.setAttribute('role', 'button'); pin.tabIndex = 0;
        const go = e => { e.stopPropagation(); e.preventDefault(); app.unlockAudio(); G.picksSetPin(app.state, G.picksPin(app.state) === 'pick2' ? 'gate' : 'pick2'); app.refresh(true); };
        pin.addEventListener('click', go);
        pin.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') go(e); });
        tx.appendChild(pin);
      }
      const on = G.picksPin(s) === 'pick2';
      pin.textContent = on ? t('pin_saving') : t('pin_save');
      pin.classList.toggle('on', on);
    }
  }
}

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
      s.digging = dig;
      if ((a === null) !== perf) { perf = a === null; seq.reset(); }      // the clock changed: start the bar again
      const now = a === null ? performance.now() / 1000 : a;
      stepNow = G.picksStep(s);
      running = dig;
      for (const n of seq.advance(now, dig, G.picksBar(s), stepNow)) {
        app.beat = { step: n.slot, vel: n.v };
        if (n.v === 'X') fx.cursorPulse = 1.0;
        note = { at: Math.max(0, n.t - now), gain: G.picksGain(n.v) };
        try {
          G.picksStrike(s, n.n, () => app.target(), app.ev, i => { const h = n.hands[i]; app.flags.hand = h; if (h) swingT[h] = 1; }, n.v, now);
        } finally { note = null; app.flags.hand = 0; }
      }
    },
  },
  draw: [{ at: AT.pick + 1, fn: drawExtras }, { at: AT.screen + 5, fn: drawFeverOverlay }],
  // the goal bar follows the pin; the Gate's own goal (sites) shows when the pin is the Gate
  goal: { at: 8, fn(s) {
    const pin = G.picksPin(s);
    if (pin === 'pick2') return { text: t('goal_pick2', { a: fmt(Math.min(s.coins, G.PARAMS.picks.secondCost)), b: fmt(G.PARAMS.picks.secondCost) }), frac: Math.min(1, s.coins / G.PARAMS.picks.secondCost), cls: 'gold' };
    if (pin === 'set') { const n = G.picksSetNear(s); if (n) return { text: t('goal_set', { name: t('wset_' + n.set), a: n.a, b: n.b }), frac: n.a / n.b, cls: 'gold' }; }
    return null;
  } },
  panels: [shopPanel({ id: 'picks', shop: 'picks', title: 'picks_shop', side: 'right', at: 6, coin: 'star', when: s => G.itemOpen(s, 'pick3') })],
  mount(app) {
    pinMount(app);
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', e => {
        if (e.code === 'Space' || e.key === ' ') {
          if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
          e.preventDefault();
          const tg = app.target ? app.target() : null;
          if (tg) {
            app.unlockAudio();
            const a = audioTime();
            const now = a === null ? performance.now() / 1000 : a;
            G.rhythmicSwing(app.state, tg[0], tg[1], now, app.ev);
          }
        }
      });
    }
  },
  tick(s, app) { if (!zoneNow) zoneNow = G.roadZone(s); setSound(s); pinTick(s, app); },
  on: {
    // a level in a new land: its three-note call
    newSite(d, app) { const z = G.roadZone(app.state); if (zoneNow && z !== zoneNow) { setSound(app.state); sfx.picksSting(z); } zoneNow = z; },
    picksMore(d, app) {
      app.toast(t('t_picks_' + d.n), 'gold');
      if (d.n === 2) app.banner(t('pick2_banner'), t('pick2_sub')); for (let i = 1; i < 4; i++) swingT[i] = 1; app.dirty(); },
    buy(d, app) { if (d.id === 'tempo') app.toast(t('t_tempo', { n: G.picksBpm(app.state) }), 'gold'); },
    goodHit(d) {
      fx.hot = true;
      if (sfx.goodHit) sfx.goodHit();
      if (d.r !== undefined && d.c !== undefined) {
        const [x, y] = centre(d.r, d.c);
        text(x, y - 24, t('good_hit') + ' ' + (d.mult || 2.5) + 'x!', '#ffd23f', 16, 1.0);
        spark(x, y, '#ffd23f', 14);
      }
      triggerHaptic('T2');
    },
    sandBurst(d) {
      const [x, y] = centre(d.r, d.c);
      spark(x, y, '#ffd23f', 16);
      ring(x, y, 64, '#ffc02b');
      shake(0.12);
      if (sfx.shatter) sfx.shatter();
      triggerHaptic('T1');
    },
    feverStart(d, app) {
      if (sfx.yallaCheer) sfx.yallaCheer();
      if (sfx.darbukaRoll) sfx.darbukaRoll();
      else if (sfx.star) sfx.star();
      shake(0.2);
      app.toast(t('fever_banner'), 'gold');
      app.banner(t('fever_banner'), t('fever_sub'));
      triggerHaptic('T2');
    },
  },
});

