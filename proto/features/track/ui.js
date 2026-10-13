// Dig feature (page side): the slim line above the stage. It says where you are (level, land, name; the distance to
// the Gate as plain words; the stopwatch and medals), carries the pinned-goal chips, and gives the rest of its width
// to the message line: first-sight lessons and small notes show there, so nothing covers the dig.
// It also wires the round Map button (key M). The Big Rock's health is drawn on the Rock (boss feature).
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { medalsHtml, nextMap, reopenFinish } from '../sites/ui.js';
import { tone, gap } from '../../ui/audio.js';
import strings from './strings.js';

const { t } = G;
G.addStrings(strings, 'track');

const clock = sec => { const n = Math.max(0, Math.floor(sec)); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); };
const $ = id => document.getElementById(id);

let el = {}, sig = '', msig = '', lastIdx = null, lastSec = null, flashT = 0, bankT = 0, lastDone = false, lastExt = null, bumpT = 0;

function openMap(app) {
  if (app.modal.id || !nextMap.open) return;
  try { nextMap.open(app, {}); } catch (e) { console.error('Dig: the road map failed', e); if (app.modal.id === 'worldmap') app.modal.close(); }
}

function mount(app) {
  const track = $('track'), goal = $('goal');
  if (!track || !goal) return;
  const head = document.createElement('div');
  head.id = 'trk-head';
  head.innerHTML = '<b id="trk-level"></b><div id="trk-sub"><span id="trk-gate"></span><span id="trk-clock"></span><span id="trk-bank" hidden></span><span id="trk-medals"></span><button id="trk-done" class="gold" hidden></button></div>';
  track.insertBefore(head, goal);
  // the message line: the lesson and the toast move here from the stage (a lesson wins when both show)
  const msg = document.createElement('div');
  msg.id = 'trk-msg';
  for (const id of ['lesson', 'toast']) { const x = $(id); if (x) msg.appendChild(x); }
  track.insertBefore(msg, goal);
  // the Tips button sits in this line, beside the message line (its list still opens over the stage)
  const tips = $('tips-btn');
  if (tips) track.insertBefore(tips, goal);
  el = { level: $('trk-level'), clock: $('trk-clock'), bank: $('trk-bank'), medals: $('trk-medals'), gate: $('trk-gate'), done: $('trk-done') };
  el.done.textContent = t('trk_done'); el.done.title = t('trk_done_t');
  el.done.addEventListener('click', () => { app.unlockAudio(); reopenFinish(app); });
  const mb = $('mapbtn');
  if (mb) { mb.innerHTML = app.icon('btn_map', 22); mb.title = mb.ariaLabel = t('trk_map'); mb.addEventListener('click', () => { app.unlockAudio(); openMap(app); }); }
}

// the countdown of the leg: time left to the next Big Rock (the Gate on the last leg). At 0 nothing happens but red and "over".
function tickClock(s, r) {
  const c = G.legLeft(r, s.bossesDown), now = performance.now();
  const sec = Math.floor(Math.abs(c.left));
  // below the Gate the countdown is over: show the time this dig took instead of a clock that stands still
  el.clock.textContent = r.done ? t('clock_done', { t: clock(r.time) }) : c.over ? t('clock_over', { t: clock(sec) }) : clock(sec);
  el.clock.classList.toggle('over', c.over && !r.done);
  el.clock.classList.toggle('soon', !c.over && !r.done && c.left <= 10);
  // a leg closed: green flash, and the seconds saved are shown as banked for a moment
  if (lastIdx !== null && (c.idx !== lastIdx || (r.done && !lastDone)) && r.legLast) {
    if (r.legLast.left >= 0) { flashT = now + 700; bankT = now + 2600; el.bank.textContent = t('clock_bank', { t: clock(Math.floor(r.legLast.saved)) }); }
  }
  if (lastExt !== null && r.legExt !== lastExt && r.legExt !== undefined) bumpT = now + 700;
  lastExt = r.legExt;
  el.clock.classList.toggle('bump', now < bumpT);
  lastIdx = c.idx; lastDone = !!r.done;
  el.clock.classList.toggle('flash', now < flashT);
  el.bank.hidden = now >= bankT;
  // a soft tick, once a second, in the last 10 seconds
  if (!r.done && !c.over && c.left <= 10 && sec !== lastSec && c.left > 0) { if (lastSec !== null && gap('legTick', 0.5)) tone(c.left <= 3 ? 990 : 740, { type: 'sine', d: 0.06, vol: 0.05 }); }
  lastSec = sec;
}

function tick(s) {
  if (!el.level) return;
  const r = G.siteRun(s), F = Math.max(1, r.floor);
  // the level line changes only when the dig does
  const key = r.key + ':' + F;
  if (sig !== key) {
    sig = key;
    const idx = G.roadIndex(s);
    const name = t('site_' + r.site) + (r.twist ? ', ' + t('twist_' + r.twist) : '');
    const parts = idx >= 0 ? [t('trk_level', { n: idx + 1, of: G.ROAD.length }), t('look_zone_' + G.roadZone(s)), name] : [name];
    el.level.textContent = parts.join(' · ');
    el.level.title = el.level.textContent;
  }
  el.gate.classList.toggle('done', !!r.done);
  el.gate.textContent = r.done ? t('trk_below') : t('trk_togate', { n: G.fmt(Math.max(0, F - Math.max(0, s.best))) });
  el.done.hidden = !r.done;
  tickClock(s, r);
  const st = G.siteStamp(s), ms = `${st.fin}${st.fast}${st.hard}`;
  if (msig !== ms) { msig = ms; el.medals.innerHTML = medalsHtml({ fin: st.fin, fast: st.fast, hard: st.hard }); }
}

ui({
  id: 'track',
  css: new URL('./track.css', import.meta.url).href,
  mount,
  tick,
  keys: { m: app => openMap(app) },
});
