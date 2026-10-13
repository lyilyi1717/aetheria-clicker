// Dig feature (page side): the level track above the stage. One node per 25 m Big Rock and a stone arch for
// the Gate at the end. The fill is the depth from the top to the Gate; while a Big Rock fight is on, that
// Rock's segment turns red and counts its health down (the boss feature's layers live in that segment).
// It also holds the goal line (the first goal with something to say, and the pinned-goal chips),
// the level name, the clock and the medals, and wires the round Map button (key M).
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { medalsHtml, nextMap } from '../sites/ui.js';
import strings from './strings.js';

const { t } = G;
G.addStrings(strings, 'track');

const clock = sec => { const n = Math.max(0, Math.floor(sec)); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); };
const $ = id => document.getElementById(id);
const GATE = `<svg class="gate-svg" width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><path class="arch" d="M5 29 V13 Q5 4 16 4 Q27 4 27 13 V29 Z" stroke="#1b1410" stroke-width="1.6" stroke-linejoin="round"/><path d="M11 29 V15 Q11 10 16 10 Q21 10 21 15 V29 Z" fill="#17110d"/></svg>`;

let el = {}, sig = '', msig = '', segSig = '';

function openMap(app) {
  if (app.modal.id || !nextMap.open) return;
  try { nextMap.open(app, {}); } catch (e) { console.error('Dig: the road map failed', e); if (app.modal.id === 'worldmap') app.modal.close(); }
}

function mount(app) {
  const track = $('track'), bar = document.querySelector('#goal .bar'), goal = $('goal');
  if (!track || !bar) return;
  const head = document.createElement('div');
  head.id = 'trk-head';
  head.innerHTML = '<b id="trk-level"></b><span id="trk-clock"></span><span id="trk-medals"></span>';
  track.insertBefore(head, goal);
  const fill = document.createElement('i'); fill.id = 'trk-fill';
  const nodes = document.createElement('div'); nodes.id = 'trk-nodes';
  // the boss feature's Rock bar (layers, split, ticks) moves into one segment of the track
  const seg = document.createElement('div'); seg.id = 'trk-seg'; seg.hidden = true;
  for (const id of ['goal-layers', 'goal-split', 'goal-ticks']) { const x = $(id); if (x) seg.appendChild(x); }
  bar.append(fill, seg, nodes);
  const gate = document.createElement('span');
  gate.id = 'trk-gate'; gate.innerHTML = GATE + '<small></small>';
  goal.appendChild(gate);
  el = { level: $('trk-level'), clock: $('trk-clock'), medals: $('trk-medals'), fill, nodes, seg, gate, gsmall: gate.querySelector('small') };
  const mb = $('mapbtn');
  if (mb) { mb.innerHTML = app.icon('btn_map', 22); mb.title = mb.ariaLabel = t('trk_map'); mb.addEventListener('click', () => { app.unlockAudio(); openMap(app); }); }
}

function tick(s) {
  if (!el.fill) return;
  const r = G.siteRun(s), F = Math.max(1, r.floor), L = G.LAYER;
  // the level name and the nodes change only when the dig does
  const key = r.key + ':' + F;
  if (sig !== key) {
    sig = key;
    const idx = G.roadIndex(s);
    const name = t('site_' + r.site) + (r.twist ? ', ' + t('twist_' + r.twist) : '');
    el.level.textContent = (idx >= 0 ? t('trk_level', { n: idx + 1, of: G.ROAD.length }) + '  ' : '') + name;
    el.nodes.textContent = '';
    for (let k = 1; k * L < F; k++) {
      const n = document.createElement('i');
      n.className = 'nd'; n.dataset.k = k; n.style.insetInlineStart = (k * L / F * 100) + '%'; n.title = t('trk_rock', { n: k * L });
      el.nodes.appendChild(n);
    }
    el.gate.title = t('trk_gate', { n: F });
  }
  const down = s.bossesDown || 0;
  for (const n of el.nodes.children) {
    const k = +n.dataset.k;
    n.classList.toggle('broken', down >= k);
    n.classList.toggle('next', !r.done && down + 1 === k);
  }
  el.fill.style.width = (r.done ? 100 : Math.min(100, 100 * Math.max(0, s.best) / F)) + '%';
  el.gate.classList.toggle('done', !!r.done);
  el.gsmall.textContent = r.done ? t('trk_below') : G.fmt(F) + ' m';
  el.clock.textContent = clock(r.done ? r.time : r.clock);
  const st = G.siteStamp(s), ms = `${st.fin}${st.fast}${st.hard}`;
  if (msig !== ms) { msig = ms; el.medals.innerHTML = medalsHtml({ fin: st.fin, fast: st.fast, hard: st.hard }); }
  // the Rock fight: its segment, from the Rock above to this one
  const b = G.bossInView(s), on = !!(b && b.hp > 0 && b.row <= F);
  el.seg.hidden = !on;
  if (on) {
    const a = Math.max(0, b.row - L), ss = a + '|' + b.row;
    if (segSig !== ss) { segSig = ss; el.seg.style.insetInlineStart = (a / F * 100) + '%'; el.seg.style.width = ((b.row - a) / F * 100) + '%'; }
  }
  el.fill.classList.toggle('fight', on);
}

ui({
  id: 'track',
  css: new URL('./track.css', import.meta.url).href,
  mount,
  tick,
  keys: { m: app => openMap(app) },
});
