// Dig: the page. Input, the frame loop, the save, and the host for everything a feature shows:
// panels (each in a tab of the drawer), cards, toasts, the goal bar (the level track), the status chip, the tool bar, and the map from the rules'
// events to what you see and hear. A feature registers its part with ui({...}); see proto/README.md.
// Its own save key; nothing here touches Aetheria.
import * as G from '../game.js';
import { fx, CELL, SKY, W, H, draw, updateFx, centre, debris, spark, coinBurst, text, ring, flash, shake, swingAnim, blockColour, ART, addArt, addDraw, bindState } from './render.js';
import { sfx, unlock, setMuted, isMuted, addSfx } from './audio.js';
import { icon, addIcons } from './icons.js';
import strings from './strings.js';
import { drawer, tabOf } from './drawer.js';
import { createLessons } from './lessons.js';
import { lineCount } from '../features/track/lessonfit.js';
import { ownDir, goalParts, DIR } from '../core/lang.js';

const { t, fmt } = G;
G.addStrings(strings, 'page');

const SAVE_KEY = 'DIG_PROTO_SAVE_V1';
const MUTE_KEY = 'DIG_PROTO_MUTE';
const params = new URLSearchParams(location.search);
const SPEED = Math.max(1, Number(params.get('speed')) || 1);
const $ = id => document.getElementById(id);

let state = null;
let paused = false;          // a card is open
let hitStop = 0;
let holding = false, holdCd = 0, lastSwing = 0;
const autoDig = true;        // the pick always digs where the mouse points; holding is not needed (the owner: always auto)
let shownCoins = 0;
let coinLands = 0;
let toastT = 0, bannerT = 0;
let modalId = null;
let armed = null;            // the tool the next click uses
let cadence = null;          // a feature that owns the swing rhythm: ui({ cadence: { frame(dig, app) } })

// ---------- what features register ----------

const DEFS = [];             // every ui() def
const ON = {};               // event kind -> handlers
const PANELS = [], GOALS = [], STATUS = [], KEYS = {};
export const ITEM_TEXT = {}; // shop item id -> { desc(s, lv), noLevel }

// ui({ id, css, icons, sfx, art, draw, on, panels, items, goal, status, keys, mount, start, tick, away, cadence })
// a panel names its drawer tab with `tab` (else drawer.js's map); `side` is still accepted and ignored
export function ui(def) {
  DEFS.push(def);
  if (def.cadence) { if (cadence) throw new Error('Dig: two features want the swing rhythm'); cadence = def.cadence; }
  if (def.css) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = def.css; document.head.appendChild(l); }
  addIcons(def.icons); addSfx(def.sfx); addArt(def.art); addDraw(def.draw);
  for (const [kind, fn] of Object.entries(def.on || {})) (ON[kind] || (ON[kind] = [])).push(fn);
  for (const p of def.panels || []) PANELS.push({ at: 1000, ...p, tab: tabOf(p) });
  PANELS.sort((a, b) => a.at - b.at);
  for (const [id, x] of Object.entries(def.items || {})) ITEM_TEXT[id] = x;
  if (def.goal) { GOALS.push(def.goal); GOALS.sort((a, b) => a.at - b.at); }
  if (def.status) { STATUS.push(def.status); STATUS.sort((a, b) => a.at - b.at); }
  for (const [k, fn] of Object.entries(def.keys || {})) KEYS[k.toLowerCase()] = fn;
  return def;
}

// ---------- what features may use ----------

function toast(msg, kind = '') {
  const el = $('toast');
  el.textContent = msg; el.className = 'show ' + kind; toastT = 3.2;
}
// first-sight lessons: queued, shown >= 3 s or until clicked, marked taught only then (lessons.js)
const TIPS_KEY = 'DIG_TIPS';
let tipHist = [];
try { tipHist = JSON.parse(localStorage.getItem(TIPS_KEY) || '[]').filter(x => x && typeof x.text === 'string'); } catch { /* ignore */ }
const lessons = createLessons({
  history: tipHist,
  onTaught(flag) {
    if (state) state.seen[flag] = true;
    try { localStorage.setItem(TIPS_KEY, JSON.stringify(lessons.history)); } catch { /* ignore */ }
    paintTips();
  },
});
function lesson(flag, msg, kind = '') { return lessons.request(flag, msg, kind); }
function paintLesson() {
  const el = $('lesson'); if (!el) return;
  const c = lessons.current, on = !!c && !(bannerT > 0) && !modalId;
  if (on && el.dataset.f !== c.flag) { el.textContent = c.text; el.dataset.f = c.flag; el.dataset.w = lessonWide(el, c.text) ? '1' : ''; }
  el.className = on ? 'show ' + (c.kind || '') + (el.dataset.w ? ' wide' : '') : '';
  if (!c) delete el.dataset.f;
}
// a long lesson takes the whole top line; a short one that fits two lines beside Tips and the goal leaves them in place
// (art-and-sound decision 16). Measured once per lesson, with the message line at its usual width.
function lessonWide(el, text) {
  const box = el.parentElement;
  if (!box || box.id !== 'trk-msg') return true;
  el.classList.remove('wide');
  const w = box.clientWidth - 19;   // the bar (3), the plate's padding (8 + 8)
  return !(w > 0 && lineCount(text, w) <= 2);
}
function paintTips() {
  const box = $('tips-list'); if (!box) return;
  box.textContent = '';
  const h = lessons.history.reverse();
  if (!h.length) { const p = document.createElement('p'); p.textContent = t('tips_none'); box.appendChild(p); return; }
  for (const x of h) { const p = document.createElement('p'); p.textContent = x.text; box.appendChild(p); }
}
function buildLessonUi() {
  const stage = $('stage');
  const les = document.createElement('div'); les.id = 'lesson'; les.setAttribute('role', 'status');
  les.addEventListener('click', () => { lessons.click(); paintLesson(); });
  const btn = document.createElement('button'); btn.id = 'tips-btn'; btn.type = 'button'; btn.className = 'ghost'; btn.textContent = t('tips');
  const box = document.createElement('div'); box.id = 'tips-list'; box.hidden = true;
  btn.addEventListener('click', () => { box.hidden = !box.hidden; paintTips(); });
  stage.append(les, btn, box);
  paintTips();
}
function banner(title, sub) {
  const el = $('banner');
  el.innerHTML = `<b></b><span></span>`;
  el.firstChild.textContent = title; el.lastChild.textContent = sub || '';
  el.className = 'show'; bannerT = 3.6;
}
function bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
function save() { try { localStorage.setItem(SAVE_KEY, G.serialize(state)); } catch { /* ignore */ } }

// One card at a time; the dig is paused while it is open.
// open(id, html) returns the #modal element to fill in, or null if another card is open.
const modal = {
  open(id, html) {
    if (modalId) return null;
    modalId = id; paused = true; holding = false;
    const m = $('modal'); m.innerHTML = html; m.className = 'show';
    return m;
  },
  close() {
    const m = $('modal'); m.className = ''; m.innerHTML = '';
    const was = modalId; modalId = null; paused = false;
    if (was) fire('modalClosed', { id: was });
  },
  get id() { return modalId; },
};

// the rules' events come in here; so do the page's own (fire)
function ev(kind, d) {
  const L = ON[kind];
  if (!L) return;
  // feedback must never stop the rules half way through a break: a handler that throws is logged and skipped
  for (let i = 0; i < L.length; i++) { try { L[i](d, app); } catch (e) { console.error(`Dig: the "${kind}" handler failed`, e); } }
}
const fire = ev;
const quiet = () => {};

export const app = {
  get state() { return state; },
  ev, fire, toast, lesson, banner, bump, save, modal, t, fmt, icon, sfx,
  el: {},                                   // top, left, right, stage (filled at start)
  flags: {},                                // a feature's own page-only flags
  unlockAudio: unlock,
  hitStop(x) { hitStop = Math.max(hitStop, x); },
  dirty(id) { for (const p of PANELS) if (!id || p.id === id) p.dirty = true; },
  // the block the pick would hit now, worked out afresh (a cadence asks again after every hit)
  target() { return (fx.target = !paused && fx.mouse.inside ? targetAt(fx.mouse.x, fx.mouse.y) : null); },
  refresh(force) { updatePanels(force); },
};

// ---------- events from the rules: the core's own feedback ----------

ui({
  id: 'page',
  on: {
    swing(d) { if (!app.flags.hand) swingAnim(d.crit); },   // flags.hand: an extra pick is swinging (its feature draws it)
    hit(d) {
      const [x, y] = centre(d.r, d.c);
      const col = blockColour(d.t, d.r);
      const a = ART[d.t] || {};
      flash(d.r, d.c, d.src === 'you' ? 1 : 0.5);
      if (a.hit && a.hit(d, x, y, col)) return;          // the kind did its own feedback
      if (d.src === 'you') {
        debris(d.r, d.c, col, d.crit ? 10 : 4, d.crit ? 1.2 : 0.7);
        if (d.crit) { text(x, y - 14, fmt(d.dmg) + '!', '#ffe14a', 30, 0.9); shake(0.3); hitStop = 0.05; sfx.crit(); spark(x, y, '#ffe14a', 12); }
        else { text(x, y - 10, fmt(Math.max(1, d.dmg)), '#ffffff', 15, 0.5); if (a.hitSfx) a.hitSfx(); else sfx.hit(!!a.hard); }
      } else { debris(d.r, d.c, col, 1, 0.5); sfx.crew(); }
    },
    break(d) {
      const [x, y] = centre(d.r, d.c);
      const col = blockColour(d.t, d.r);
      const a = ART[d.t] || {};
      const rich = !!a.rich;
      const you = d.src === 'you';
      debris(d.r, d.c, col, you ? 14 : 7, rich ? 1.2 : 1);
      if (rich) { ring(x, y, CELL * 0.9, col); spark(x, y, '#fff', 8); }
      if (d.coins > 0) {
        coinBurst(d.r, d.c, Math.min(rich ? 9 : 3, 1 + Math.floor(Math.log2(d.coins + 1) / 2) + (rich ? 3 : 0)), a.coin || '#ffd23f');
        text(x, y - 6, '+' + fmt(d.coins), rich ? '#ffe14a' : '#ffe9a8', rich ? 24 : you ? 17 : 13, rich ? 1.0 : 0.7);
      }
      if (you) {
        sfx.break((d.combo || 0) + d.chain * 2, rich);
        shake(rich ? 0.16 : 0.07);
        if (rich) hitStop = Math.max(hitStop, 0.03);
      } else sfx.crew();
      if (!app.flags.firstBreak) { app.flags.firstBreak = true; $('hint').className = ''; }
    },
    buy() { sfx.buy(); },
    newSite() { fx.cam = 0; shownCoins = 0; app.dirty(); },
  },
});

// ---------- the pick ----------

// The block the pick would hit: the one under the mouse if it can be reached,
// else the first one below an empty spot, else the nearest reachable one above.
function targetAt(mx, my) {
  const c = Math.floor(mx / CELL);
  const r = Math.floor((my - SKY) / CELL + fx.cam + 0.0001);
  if (c < 0 || c >= G.COLS) return null;
  const rr = Math.max(r, state.top);
  const here = G.cellAt(state, rr, c);
  if (here && G.reachable(state, rr, c)) return [rr, c];
  if (here === null || r < state.top) {
    for (let k = rr; k < state.top + G.VIEW_ROWS; k++) if (G.cellAt(state, k, c)) return G.reachable(state, k, c) ? [k, c] : null;
    return null;
  }
  for (let k = rr - 1; k >= state.top; k--) if (G.cellAt(state, k, c) && G.reachable(state, k, c)) return [k, c];
  return null;
}

function doSwing() {
  if (paused) return;
  const tg = fx.target;
  if (!tg) return;
  const now = performance.now();
  if (now - lastSwing < 45) return;
  lastSwing = now;
  holdCd = 0.15;
  G.swing(state, tg[0], tg[1], ev);
}

function bindInput(cv) {
  const pos = e => {
    const b = cv.getBoundingClientRect();
    fx.mouse.x = (e.clientX - b.left) * (W / b.width);
    fx.mouse.y = (e.clientY - b.top) * (H / b.height);
    fx.mouse.inside = true;
  };
  cv.addEventListener('pointermove', pos);
  cv.addEventListener('pointerdown', e => {
    unlock(); pos(e);
    fx.target = targetAt(fx.mouse.x, fx.mouse.y);
    if (armed) { useArmed(); e.preventDefault(); return; }
    holding = true; if (!cadence) doSwing(); e.preventDefault();
  });
  window.addEventListener('pointerup', () => { holding = false; });
  cv.addEventListener('pointerleave', () => { fx.mouse.inside = false; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
}

// ---------- tools: a bar of use buttons (empty until a feature registers a tool) ----------

function useArmed() {
  const id = armed, tg = fx.target;
  if (paused || !tg) return;
  if (G.useTool(state, id, tg[0], tg[1], ev)) { if (!G.TOOLS[id].keep) armed = null; } else sfx.deny();
}
function pickTool(id) {
  if (paused || !G.toolOpen(state, id)) return;
  unlock();
  // a tool that needs no aim fires at once where the pick points; the others wait for a click on the ground
  if (G.TOOLS[id].aim === false) { armed = id; fx.target = fx.mouse.inside ? targetAt(fx.mouse.x, fx.mouse.y) : null; useArmed(); armed = null; }
  else armed = armed === id ? null : id;
}
function updateTools() {
  const bar = $('tools');
  const open = Object.keys(G.TOOLS).filter(id => G.toolOpen(state, id));
  const sig = open.join(',');
  if (bar.dataset.sig !== sig) {
    bar.dataset.sig = sig; bar.innerHTML = '';
    for (const id of open) {
      const b = document.createElement('button');
      b.className = 'tool'; b.dataset.id = id;
      b.innerHTML = `${icon('tool_' + id, 34)}<i></i>`;
      b.title = t('tool_' + id);
      b.querySelector('i').textContent = G.TOOLS[id].key || '';
      b.addEventListener('click', () => pickTool(id));
      bar.appendChild(b);
    }
  }
  bar.hidden = !open.length;
  for (const b of bar.children) {
    const id = b.dataset.id;
    b.classList.toggle('on', armed === id);
    b.classList.toggle('can', !G.TOOLS[id].can || !!G.TOOLS[id].can(state));
  }
}

// ---------- panels and read-outs ----------

function buildPanels() {
  for (const p of PANELS) {
    const sec = document.createElement('section');
    sec.className = 'panel'; sec.id = p.elId || 'panel-' + p.id;
    const h = document.createElement('h2'); h.textContent = t(p.title); sec.appendChild(h);
    // panels no longer fold: each tab of the drawer holds only its own panels, so all of them stay open
    drawer.body(p.tab).appendChild(sec);
    p.el = sec; p.dirty = true;
    if (p.build) p.build(sec, app);
  }
}

// the goal words: a label then a count ("Second Pick: 3.00K / 100K") are two boxes on one line, the label ends in dots and the
// count always shows (#469); anything else is one piece of words (two lines without the chip, one with it)
function paintGoalText(gt, goal) {
  const pin = $('goal-pin'), chip = pin && !pin.hidden ? 'c' : '';
  const p = goalParts(goal.text, goal.num), key = (p ? '1' : '0') + chip + goal.text;
  if (gt.dataset.k === key) return;
  if (!gt._ro && typeof ResizeObserver === 'function' && $('track')) {     // a new width: cut the words again
    gt._ro = new ResizeObserver(() => { delete gt.dataset.k; });
    gt._ro.observe($('track'));
  }
  gt.dataset.k = key;
  gt.classList.toggle('split', !!p);
  if (!p) { gt.removeAttribute('dir'); if (!fitGoalText(gt, goal.text, !chip)) delete gt.dataset.k; return; }
  gt.dir = DIR;   // Arabic: the label on the right, the count on its left
  gt.textContent = '';
  const a = document.createElement('span'), b = document.createElement('span');
  a.className = 'gl'; a.textContent = p.lead; b.className = 'gn'; b.textContent = p.count;
  gt.append(a, b);
}
// The goal words without the chip have two lines; a longer goal is cut at a whole word and ends in dots (art-and-sound
// decision 26: the -webkit-line-clamp did not paint its dots there). The number of a number-first goal leads, so it stays.
// With the chip the words are one line and CSS ends them in dots. False when the goal is not on screen yet (try again).
function fitGoalText(gt, text, cut) {
  gt.textContent = ownDir(text);
  if (!cut) return true;
  if (!gt.clientWidth) return false;
  const over = () => gt.scrollHeight > gt.clientHeight + 1;
  if (!over()) return true;
  const words = text.split(' ');
  let lo = 1, hi = words.length - 1, best = 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    gt.textContent = ownDir(words.slice(0, m).join(' ') + '…');
    if (over()) hi = m - 1; else { best = m; lo = m + 1; }
  }
  gt.textContent = ownDir(words.slice(0, best).join(' ') + '…');
  return true;
}

let panelT = 0;
function updatePanels(force) {
  for (const p of PANELS) {
    const show = !p.when || !!p.when(state);
    p.el.hidden = !show;
    if (!show || p.tab !== drawer.current) continue;   // only the open tab is redrawn; opening a tab redraws it
    // `live` panels are redrawn every tick; the others when one of their events came in
    if (p.live || force || p.dirty) { p.dirty = false; p.update(p.el, state, app); }
  }
  drawer.tick(state);
  // the goal: one honest bar (it sits in the level track). The first feature with something to say wins.
  let goal = null;
  for (let i = 0; i < GOALS.length && !goal; i++) goal = GOALS[i].fn(state, app);
  const fill = $('goal-fill');
  $('goal').style.visibility = goal ? '' : 'hidden';
  if (goal) { const gt = $('goal-text'); gt.title = ownDir(goal.text);   // the title keeps the whole line when the chip leaves it one
    paintGoalText(gt, goal);
    fill.style.width = (goal.frac * 100) + '%'; fill.className = goal.cls || ''; }
  $('depth').textContent = t('depth', { n: state.best });
  // the status chip under the purse (combo, oil rush)
  let st = null;
  for (let i = 0; i < STATUS.length && !st; i++) st = STATUS[i].fn(state, app);
  const co = $('combo');
  if (st) { co.textContent = st.text; co.className = 'show ' + (st.cls || ''); if (st.k !== undefined) co.style.setProperty('--k', st.k); }
  else co.className = '';
  updateTools();
  for (const d of DEFS) if (d.tick) d.tick(state, app);
  // first sight of a new kind of block
  // (the mask is a whole-view sweep: it is built only once a block with a lesson still to teach is in the view)
  let seen = null;
  for (let i = 0; i < G.VIEW_ROWS - 1; i++) for (let c = 0; c < G.COLS; c++) {
    const cell = state.rows[i][c];
    if (!cell) continue;
    const f = ART[cell.t] && ART[cell.t].firstSight;
    if (!f || state.seen[f.flag]) continue;
    if (!seen) seen = G.visibleMask(state);
    if (seen[i][c]) lesson(f.flag, t(f.text), f.kind || '');
  }
}

// ---------- the loop ----------

let lastT = performance.now();
let g2d = null;
function away(seconds) {
  for (const d of DEFS) if (d.away) d.away(seconds, app);
  shownCoins = state.coins;
}
function frame(now) {
  if (!state) return;
  let real = (now - lastT) / 1000;
  lastT = now;
  if (real < 0) real = 0;
  if (real > 60 && !paused) { away(real * SPEED); real = 0.016; }
  else if (real > 0.25) {
    // the tab was in the background for a moment: catch up without the fireworks
    if (!paused) { let left = real * SPEED; while (left > 0) { G.step(state, Math.min(0.1, left), quiet); left -= 0.1; } }
    real = 0.016;
  }
  const dt = Math.min(0.05, real);
  // A feature that owns the swing rhythm is asked every frame, also through a hit-stop: its bar must
  // not stumble. dig = the player is digging now (held or auto, on the ground, something to hit).
  if (cadence) cadence.frame((holding || autoDig) && !armed && !!app.target(), app);
  if (hitStop > 0) hitStop -= dt;
  else if (!paused) {
    fx.target = fx.mouse.inside ? targetAt(fx.mouse.x, fx.mouse.y) : null;
    if (!cadence && (holding || autoDig) && fx.mouse.inside && !armed) { holdCd -= dt; if (holdCd <= 0) doSwing(); }
    G.step(state, dt * SPEED, ev);
  }
  updateFx(dt);
  draw(g2d, state, dt);

  // the coin counter rolls up as coins land
  const diff = state.coins - shownCoins;
  if (Math.abs(diff) > 0.5) shownCoins += diff * Math.min(1, dt * 9); else shownCoins = state.coins;
  $('coins').textContent = fmt(shownCoins);
  if (coinLands > 0) { coinLands = 0; bump($('hud-coins')); sfx.coin(Math.floor(fx.t * 12)); }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').className = ''; }
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').className = ''; }
  lessons.tick(dt, bannerT > 0 || !!modalId); paintLesson();
  panelT -= dt;
  if (panelT <= 0) { panelT = 0.1; updatePanels(false); }
}

function load() {
  let s = null;
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) s = G.deserialize(raw); } catch { /* a blocked store just means a fresh dig */ }
  return s || G.newState();
}

export function start() {
  document.title = t('title');
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  state = load();
  bindState(state);
  shownCoins = state.coins;
  fx.cam = state.top;
  fx.coinTarget = { x: 34, y: 30 };
  fx.onCoinLand = () => { coinLands++; };
  const cv = $('cv');
  cv.width = W; cv.height = H;
  g2d = cv.getContext('2d');
  bindInput(cv);
  app.el = { top: $('chips'), left: $('tabbody'), right: $('tabbody'), stage: $('stage') };   // the purse; the drawer body (old left/right)
  drawer.build($('tabs'), $('tabbody'), app);
  buildLessonUi();
  for (const d of DEFS) if (d.mount) d.mount(app);
  buildPanels();
  if (state.total === 0) $('hint').className = 'show'; else app.flags.firstBreak = true;

  const mute = $('mute');
  let m = false; try { m = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* ignore */ }
  const paintMute = () => { const off = isMuted(); mute.innerHTML = icon(off ? 'btn_mute' : 'btn_sound', 22); mute.title = mute.ariaLabel = t(off ? 'unmute' : 'mute'); mute.classList.toggle('off', off); };
  setMuted(m); paintMute();
  mute.addEventListener('click', () => { unlock(); setMuted(!isMuted()); paintMute(); try { localStorage.setItem(MUTE_KEY, isMuted() ? '1' : '0'); } catch { /* ignore */ } });
  const auto = $('auto');
  if (auto) auto.remove();                                  // no switch: digging is always automatic
  for (const [id, T] of Object.entries(G.TOOLS)) if (T.key && !KEYS[String(T.key).toLowerCase()]) KEYS[String(T.key).toLowerCase()] = () => pickTool(id);
  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape' && armed) { armed = null; return; }
    const f = KEYS[e.key.toLowerCase()];
    if (f) { unlock(); f(app); }
  });
  const reset = $('reset');
  let sure = 0;
  reset.addEventListener('click', () => {
    if (sure && performance.now() - sure < 4000) { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } state = null; location.reload(); return; }
    sure = performance.now(); reset.textContent = t('reset_sure');
    setTimeout(() => { sure = 0; reset.textContent = t('reset'); }, 4000);
  });

  // time away
  if (state.savedAt) {
    const secs = (Date.now() - state.savedAt) / 1000;
    if (secs > 60) away(secs);
    shownCoins = state.coins;
  }
  for (const d of DEFS) if (d.start) d.start(app);
  updatePanels(true);

  setInterval(() => { if (state) save(); }, 5000);
  window.addEventListener('beforeunload', () => { if (state) save(); });
  let lastRaf = 0;
  const loop = now => {
    lastRaf = now;
    try {
      frame(now);
    } catch (err) {
      console.error('Frame error in loop:', err);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  // A background tab gets no animation frames and slow timers. A worker's timer is not slowed,
  // so the dig keeps its pace when you look at another tab.
  const beat = () => { const now = performance.now(); if (now - lastRaf > 120) frame(now); };
  try {
    const w = new Worker(URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 16);'], { type: 'text/javascript' })));
    w.onmessage = beat;
  } catch { setInterval(beat, 250); }
  window.dig = { get state() { return state; }, G, save, app };
}
