// Dig feature (page side): the slim line above the stage. It says where you are (level, land, name; the distance to
// the Gate as plain words; the stopwatch and medals), carries the pinned-goal chips, and gives the rest of its width
// to the message line: first-sight lessons and small notes show there, so nothing covers the dig.
// It also wires the round Map button (key M). The Big Rock's health is drawn on the Rock (boss feature).
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { medalsHtml, nextMap, reopenFinish } from '../sites/ui.js';
import { tone, gap } from '../../ui/audio.js';
import strings from './strings.js';
import { levelText } from '../sites/level.js';

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
  head.innerHTML = '<b id="trk-level"></b><div id="trk-sub"><span id="trk-gate"></span><span id="trk-clock"></span><span id="trk-bank" hidden></span><span id="trk-medals"></span></div>';
  track.insertBefore(head, goal);
  // the message line: the lesson and the toast move here from the stage (a lesson wins when both show)
  const msg = document.createElement('div');
  msg.id = 'trk-msg';
  for (const id of ['lesson', 'toast']) { const x = $(id); if (x) msg.appendChild(x); }
  track.insertBefore(msg, goal);
  // the Tips button sits in this line, beside the message line (its list still opens over the stage)
  const tips = $('tips-btn');
  if (tips) track.insertBefore(tips, goal);
  // "Done here" has its own spot at the end of the line, where Tips is while the dig goes on (Tips and the message line hide when done)
  const done = document.createElement('button');
  done.id = 'trk-done'; done.hidden = true;
  track.insertBefore(done, goal);
  el = { track, level: $('trk-level'), clock: $('trk-clock'), bank: $('trk-bank'), medals: $('trk-medals'), gate: $('trk-gate'), done };
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
    if (r.legLast.left >= 0) { flashT = now + 700; bankT = now + 2000; el.bank.textContent = t('clock_bank', { t: clock(Math.floor(r.legLast.saved)) }); }
  }
  if (lastExt !== null && r.legExt !== lastExt && r.legExt !== undefined) bumpT = now + 700;
  lastExt = r.legExt;
  el.clock.classList.toggle('bump', now < bumpT);
  lastIdx = c.idx; lastDone = !!r.done;
  el.clock.classList.toggle('flash', now < flashT);
  // the banked seconds take the clock's place for 2 s (never beside it, so nothing overlaps the medals)
  const showBank = now < bankT;
  el.bank.hidden = !showBank; el.clock.hidden = showBank;
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
    const site = t('site_' + r.site), name = r.twist ? t('site_twist', { site, twist: t('twist_' + r.twist) }) : site;
    // the level and the land never get cut: only the place name (last) is allowed to shrink with dots
    const L = idx >= 0 ? G.levelOf(idx + 1) : null;
    const zone = t('look_zone_' + G.roadZone(s));
    const head = L ? t('trk_head', { level: L.ch === 2 ? t('trk_ch2', L) : levelText(idx + 1), zone }) : '';
    el.level.textContent = '';
    if (head) { const a = document.createElement('span'); a.className = 'lv'; a.textContent = head; el.level.appendChild(a); }
    const b = document.createElement('span'); b.className = 'nm'; b.textContent = head ? t('trk_then', { name }) : name; el.level.appendChild(b);
    el.level.title = L ? t('trk_full', { level: levelText(idx + 1), zone, name }) : name;
  }
  el.gate.classList.toggle('done', !!r.done);
  el.gate.textContent = r.done ? t('trk_below') : t('trk_togate', { n: G.fmt(Math.max(0, F - Math.max(0, s.best))) });
  el.done.hidden = !r.done;
  el.track.classList.toggle('done', !!r.done);
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
