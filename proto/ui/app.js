// Dig prototype: the page. Input, the frame loop, and turning the rules' events
// into things you see and hear. Its own save key; nothing here touches Aetheria.
import * as G from './game.js';
import { fx, CELL, SKY, W, H, draw, updateFx, centre, yOf, debris, spark, coinBurst, text, ring, flash, shake, screenFlash, gush, swingAnim, blockColour } from './render.js';
import { sfx, unlock, setMuted, isMuted } from './audio.js';
import { t, fmt } from './strings.js';
import { icon } from './icons.js';

const SAVE_KEY = 'DIG_PROTO_SAVE_V1';
const MUTE_KEY = 'DIG_PROTO_MUTE';
const AUTO_KEY = 'DIG_PROTO_AUTO';
const params = new URLSearchParams(location.search);
const SPEED = Math.max(1, Number(params.get('speed')) || 1);
const $ = id => document.getElementById(id);

let state = null;
let paused = false;          // a chest or a card is open
let hitStop = 0;
let holding = false, holdCd = 0, lastSwing = 0;
let autoDig = false;       // dig where the mouse is without holding the button (key A)
let shownCoins = 0;
let coinLands = 0;
let toastT = 0, bannerT = 0;
let draftOpen = false;
const flags = {};

// ---------- save ----------

function load() {
  let s = null;
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) s = G.deserialize(raw); } catch { /* a blocked store just means a fresh dig */ }
  return s || G.newState();
}
function save() { try { localStorage.setItem(SAVE_KEY, G.serialize(state)); } catch { /* ignore */ } }

// ---------- small UI helpers ----------

function toast(msg, kind = '') {
  const el = $('toast');
  el.textContent = msg; el.className = 'show ' + kind; toastT = 3.2;
}
function banner(title, sub) {
  const el = $('banner');
  el.innerHTML = `<b></b><span></span>`;
  el.firstChild.textContent = title; el.lastChild.textContent = sub || '';
  el.className = 'show'; bannerT = 3.6;
}
function bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

// ---------- events from the rules ----------

function ev(kind, d) {
  switch (kind) {
    case 'swing': swingAnim(d.crit); break;
    case 'hit': {
      const [x, y] = centre(d.r, d.c);
      const col = blockColour(d.t, d.r);
      if (d.t === 'boss') { fx.bossShake = 1; fx.bossFrac = d.frac; }
      flash(d.r, d.c, d.src === 'you' ? 1 : 0.5);
      if (d.src === 'you') {
        debris(d.r, d.c, col, d.crit ? 10 : 4, d.crit ? 1.2 : 0.7);
        if (d.crit) { text(x, y - 14, fmt(d.dmg) + '!', '#ffe14a', 30, 0.9); shake(0.3); hitStop = 0.05; sfx.crit(); spark(x, y, '#ffe14a', 12); }
        else if (d.weak) { text(x, y - 12, fmt(d.dmg), '#ffb347', 24, 0.7); spark(x, y, '#ffb347', 8); shake(0.14); sfx.bossHit(); sfx.comboUp(0); }
        else { text(x, y - 10, fmt(Math.max(1, d.dmg)), '#ffffff', 15, 0.5); if (d.t === 'boss') sfx.bossHit(); else sfx.hit(d.t === 'hard' || d.t === 'stone'); }
      } else { debris(d.r, d.c, col, 1, 0.5); sfx.crew(); }
      break;
    }
    case 'break': {
      const [x, y] = centre(d.r, d.c);
      const col = blockColour(d.t, d.r);
      const ore = G.ORES.includes(d.t);
      const you = d.src === 'you';
      debris(d.r, d.c, col, you ? 14 : 7, ore ? 1.2 : 1);
      if (ore) { ring(x, y, CELL * 0.9, col); spark(x, y, '#fff', 8); }
      if (d.coins > 0) {
        coinBurst(d.r, d.c, Math.min(ore ? 9 : 3, 1 + Math.floor(Math.log2(d.coins + 1) / 2) + (ore ? 3 : 0)), ore && d.t !== 'gold' && d.t !== 'copper' ? '#dfe9f2' : '#ffd23f');
        text(x, y - 6, '+' + fmt(d.coins), ore ? '#ffe14a' : '#ffe9a8', ore ? 24 : you ? 17 : 13, ore ? 1.0 : 0.7);
      }
      if (you) {
        sfx.break(d.combo + d.chain * 2, ore);
        shake(ore ? 0.16 : 0.07);
        if (ore) hitStop = Math.max(hitStop, 0.03);
        for (const m of [10, 25, 50]) if (d.combo >= m && !flags['c' + m]) { flags['c' + m] = true; text(W / 2, SKY + 60, t('t_combo', { n: G.comboMult(state).toFixed(1) }), '#ff8a3c', 34, 1.3); sfx.comboUp(m / 10); }
      } else sfx.crew();
      if (!flags.firstBreak) { flags.firstBreak = true; $('hint').className = ''; }
      break;
    }
    case 'chest':
      sfx.chestFound();
      { const [x, y] = centre(d.r, d.c); ring(x, y, CELL * 1.6, '#ffd23f'); spark(x, y, '#ffd23f', 24); }
      if (d.src === 'you') setTimeout(() => openDraft(), 550); else toast(t('t_chest_crew'), 'gold');
      break;
    case 'blast': {
      const [x, y] = centre(d.r, d.c);
      ring(x, y, CELL * (d.rad + 1.1), '#ffb347'); ring(x, y, CELL * (d.rad + 0.5), '#fff');
      spark(x, y, '#ffb347', 30); spark(x, y, '#fff', 12);
      shake(0.65); screenFlash('#ffcf80', 0.28); hitStop = 0.07; sfx.blast();
      break;
    }
    case 'fossil':
      sfx.fossil();
      { const [x, y] = centre(d.r, d.c); ring(x, y, CELL * 1.4, '#f6efdc'); spark(x, y, '#f6efdc', 20); }
      toast(d.isNew ? t('t_fossil_new', { set: t('set_' + d.set) }) : t('t_fossil_dup', { n: fmt(d.coins) }), 'fossil');
      flags.museumDirty = true;
      break;
    case 'set': banner(t('t_set', { set: t('set_' + d.set) }), ''); sfx.star(); screenFlash('#f6efdc', 0.3); flags.museumDirty = true; break;
    case 'gusher': {
      const [x, y] = centre(d.r, d.c);
      gush(d.c, d.r); sfx.gusher(); shake(0.5);
      coinBurst(d.r, d.c, 40); text(x, y - 30, '+' + fmt(d.coins), '#ffe14a', 34, 1.6);
      toast(t('t_gusher', { n: fmt(d.coins) }), 'gold');
      break;
    }
    case 'bossDown': {
      sfx.bossDown(); shake(1); screenFlash('#fff', 0.6); hitStop = 0.12;
      for (let c = 0; c < G.COLS; c++) { debris(d.r, c, '#6a6384', 16, 1.6); coinBurst(d.r, c, 8); }
      const y = yOf(d.r) + CELL / 2;
      ring(W / 2, y, W * 0.7, '#fff'); ring(W / 2, y, W * 0.45, '#ffd23f');
      banner(t('boss_down'), t('boss_down_sub', { n: fmt(d.coins) }));
      setTimeout(() => { toast(t('t_layer', { name: t('layer_' + Math.min(3, d.layer)) })); openDraft(); }, 2400);
      break;
    }
    case 'buy': sfx.buy(); if (d.id === 'crew') toast(t('t_digger')); break;
    case 'relic': sfx.relic(); flags.relicsDirty = true; break;
    case 'comboEnd': flags.c10 = flags.c25 = flags.c50 = false; break;
    case 'newSite': sfx.star(); screenFlash('#fff', 0.7); banner(t('site_done', { n: d.stars }), ''); flags.relicsDirty = flags.museumDirty = true; fx.cam = 0; break;
    default: break;
  }
}
const quiet = () => {};

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
  cv.addEventListener('pointerdown', e => { unlock(); pos(e); holding = true; fx.target = targetAt(fx.mouse.x, fx.mouse.y); doSwing(); e.preventDefault(); });
  window.addEventListener('pointerup', () => { holding = false; });
  cv.addEventListener('pointerleave', () => { fx.mouse.inside = false; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
}

// ---------- chests ----------

function openDraft() {
  if (draftOpen || state.chests <= 0) return;
  const ids = G.rollDraft(state);
  if (!ids.length) { G.takeRelic(state, null); return; }
  draftOpen = true; paused = true; holding = false;
  sfx.chestOpen();
  const m = $('modal');
  m.innerHTML = `<div class="card draft"><div class="chest-anim">${icon('chest', 72)}</div><h2></h2><div class="cards"></div><p class="more"></p></div>`;
  m.querySelector('h2').textContent = t('chest_title');
  m.querySelector('.more').textContent = state.chests > 1 ? t('chest_more', { n: state.chests - 1 }) : '';
  const wrap = m.querySelector('.cards');
  ids.forEach((id, i) => {
    const lv = G.rel(state, id);
    const b = document.createElement('button');
    b.className = 'relic-card'; b.style.animationDelay = `${0.45 + i * 0.12}s`;
    b.innerHTML = `<span class="tag ${lv ? 'up' : 'new'}"></span><span class="ic">${icon(id, 56)}</span><b></b><span class="d"></span>`;
    b.querySelector('.tag').textContent = lv ? t('chest_up', { n: lv + 1 }) : t('chest_new');
    b.querySelector('b').textContent = t('r_' + id);
    b.querySelector('.d').textContent = relicDesc(id, lv + 1);
    b.addEventListener('click', () => {
      G.takeRelic(state, id, ev);
      m.className = ''; m.innerHTML = '';
      draftOpen = false; paused = false;
      save();
      if (state.chests > 0) setTimeout(openDraft, 300);
    });
    wrap.appendChild(b);
  });
  m.className = 'show';
}
function relicDesc(id, lv) {
  if (id === 'boom') return t('r_boom_d', { n: [0, 12, 9, 6][lv] });
  return t('r_' + id + '_d');
}

// ---------- a new site ----------

function openSites() {
  if (!G.canNewSite(state) || draftOpen) return;
  paused = true; holding = false;
  const m = $('modal');
  m.innerHTML = `<div class="card draft"><h2></h2><p class="more"></p><div class="cards"></div><p class="more"><button class="ghost"></button></p></div>`;
  m.querySelector('h2').textContent = t('site_pick');
  m.querySelector('.more').textContent = t('site_get', { n: G.starsFor(state) });
  const close = () => { m.className = ''; m.innerHTML = ''; paused = false; };
  const back = m.querySelector('.ghost'); back.textContent = t('site_stay'); back.addEventListener('click', close);
  const wrap = m.querySelector('.cards');
  Object.keys(G.SITES).forEach((id, i) => {
    const b = document.createElement('button');
    b.className = 'relic-card'; b.style.animationDelay = `${i * 0.08}s`;
    b.innerHTML = `<span class="ic">${icon('site_' + id, 56)}</span><b></b><span class="d"></span>`;
    b.querySelector('b').textContent = t('site_' + id);
    b.querySelector('.d').textContent = t('site_' + id + '_d');
    b.addEventListener('click', () => { close(); if (G.newSite(state, id, ev)) { shownCoins = 0; save(); updatePanels(true); } });
    wrap.appendChild(b);
  });
  m.className = 'show';
}

// ---------- panels ----------

const SHOP = ['pick', 'crew', 'crewPow', 'luck'];
function shopOpen(id) {
  if (id === 'pick') return true;
  if (id === 'crew') return state.total >= 60 || state.up.crew > 0;
  if (id === 'crewPow') return state.up.crew > 0;
  if (id === 'luck') return state.bossesDown >= 1 || state.up.luck > 0;
  return false;
}
function buildShop() {
  const el = $('shop-list'); el.innerHTML = '';
  for (const id of SHOP) {
    const b = document.createElement('button');
    b.className = 'shop-item'; b.dataset.id = id;
    b.innerHTML = `<span class="ic">${icon('up_' + id, 40)}</span><span class="tx"><b></b><span class="d"></span></span><span class="cost">${icon('coin', 16)}<i></i></span><span class="fill"></span>`;
    b.addEventListener('click', () => { unlock(); if (G.buy(state, id, ev)) { bump(b); updatePanels(true); } else sfx.deny(); });
    el.appendChild(b);
  }
}
const n1 = x => x < 10 ? (Math.round(x * 10) / 10).toString() : fmt(x);
function updateShop() {
  let hidden = 0;
  for (const b of $('shop-list').children) {
    const id = b.dataset.id;
    const open = shopOpen(id);
    b.hidden = !open;
    if (!open) { hidden++; continue; }
    if (!b.dataset.seen) { b.dataset.seen = '1'; b.classList.add('arrive'); }
    const lv = state.up[id], max = G.UPGRADES[id].max;
    const full = max !== undefined && lv >= max;
    const cost = G.upgradeCost(state, id);
    b.querySelector('b').textContent = t('up_' + id) + (id === 'crew' ? '' : `  ·  ${t('lv', { n: lv })}`);
    let d = '';
    if (id === 'pick') { const a = G.pickPower(state); state.up.pick++; const nx = G.pickPower(state); state.up.pick--; d = t('up_pick_d', { a: n1(a), b: n1(nx) }); }
    if (id === 'crewPow') { const a = G.crewPower(state); state.up.crewPow++; const nx = G.crewPower(state); state.up.crewPow--; d = t('up_crewPow_d', { a: n1(a), b: n1(nx) }); }
    if (id === 'crew') d = t('up_crew_d', { a: lv });
    if (id === 'luck') d = t('up_luck_d', { a: lv * 10 });
    b.querySelector('.d').textContent = d;
    b.querySelector('.cost i').textContent = full ? t('maxed') : fmt(cost);
    const can = !full && state.coins >= cost;
    b.classList.toggle('can', can);
    b.classList.toggle('full', full);
    b.querySelector('.fill').style.width = full ? '0%' : Math.min(100, state.coins / cost * 100) + '%';
  }
  $('shop-locked').textContent = hidden ? (shopOpen('crew') ? t('locked_more') : t('locked_crew')) : '';
}

function updateRelics() {
  const el = $('relic-list');
  const ids = Object.keys(state.relics);
  $('relic-none').hidden = ids.length > 0;
  el.innerHTML = '';
  for (const id of ids) {
    const lv = state.relics[id];
    const row = document.createElement('div');
    row.className = 'relic';
    row.innerHTML = `<span class="ic">${icon(id, 30)}</span><span class="tx"><b></b><span class="d"></span></span><span class="pips">${'<i class="on"></i>'.repeat(lv)}${'<i></i>'.repeat(G.RELICS[id].max - lv)}</span>`;
    row.querySelector('b').textContent = t('r_' + id);
    row.querySelector('.d').textContent = relicDesc(id, lv);
    el.appendChild(row);
  }
}

function updateMuseum() {
  const any = Object.keys(state.fossils).length > 0;
  $('museum').hidden = !any;
  $('museum-none').hidden = any;
  const el = $('museum-list'); el.innerHTML = '';
  const L = G.layerOf(Math.max(0, state.best - 1));
  for (const set of Object.keys(G.SETS)) {
    const info = G.SETS[set];
    const row = document.createElement('div');
    const locked = info.fromLayer > L && !Object.keys(state.fossils).some(k => k.startsWith(set));
    row.className = 'set' + (state.sets[set] ? ' done' : '') + (locked ? ' locked' : '');
    let bones = '';
    for (let i = 0; i < info.pieces; i++) bones += `<span class="bone${state.fossils[`${set}.${i}`] ? ' on' : ''}">${icon('bone', 22)}</span>`;
    row.innerHTML = `<b></b><div class="bones">${bones}</div><span class="d"></span>`;
    row.querySelector('b').textContent = locked ? '???' : t('set_' + set);
    row.querySelector('.d').textContent = locked ? t('set_locked') : state.sets[set] ? t('set_done') : t('set_bonus');
    el.appendChild(row);
  }
}

function updateSite() {
  const el = $('site');
  el.hidden = !(state.bossesDown >= 1 || state.stars > 0);
  el.classList.toggle('ready', G.canNewSite(state));
  if (G.canNewSite(state) && !state.seen.siteToast) { state.seen.siteToast = true; setTimeout(() => toast(t('goal_site'), 'gold'), 4200); }
  if (el.hidden) return;
  const can = G.canNewSite(state);
  $('site-d').textContent = can ? t('site_d') : t('site_wait');
  $('site-get').textContent = can ? t('site_get', { n: G.starsFor(state) }) : '';
  $('site-keep').textContent = can ? t('site_keep') : '';
  const b = $('site-btn');
  b.hidden = !can; b.textContent = t('site_btn', { n: G.starsFor(state) });
  $('site-now').textContent = state.sites > 0 ? t('site_now', { name: t('site_' + state.site) }) : '';
}

let panelT = 0;
function updatePanels(force) {
  updateShop();
  if (force || flags.relicsDirty) { flags.relicsDirty = false; updateRelics(); }
  if (force || flags.museumDirty) { flags.museumDirty = false; updateMuseum(); }
  updateSite();
  // the goal: one honest bar
  const boss = G.bossInView(state);
  if (boss && boss.hp > 0 && !state.seen.bossToast && boss.row - state.top <= 6) { state.seen.bossToast = true; toast(t('t_boss'), 'gold'); }
  const fill = $('goal-fill'), gt = $('goal-text');
  if (boss && boss.hp > 0) {
    gt.textContent = t('goal_boss'); fill.style.width = (boss.hp / boss.max * 100) + '%'; fill.className = 'boss';
  } else {
    const next = (G.layerOf(state.best) + 1) * G.LAYER;
    gt.textContent = t('goal_rock', { n: next });
    fill.style.width = ((state.best % G.LAYER) / G.LAYER * 100) + '%'; fill.className = '';
  }
  $('depth').textContent = t('depth', { n: state.best });
  const st = $('stars'); st.hidden = state.stars <= 0; $('stars-n').textContent = state.stars;
  const cb = $('chest-btn');
  cb.hidden = state.chests <= 0 || draftOpen;
  $('chest-n').textContent = state.chests;
  // combo and rush read-outs
  const co = $('combo');
  if (state.rush > 0) { co.textContent = t('rush'); co.className = 'show rush'; }
  else if (state.combo >= 3) { co.textContent = t('combo', { n: G.comboMult(state).toFixed(2) }); co.className = 'show'; co.style.setProperty('--k', Math.max(0, state.comboT / G.P.comboWindow)); }
  else co.className = '';
  // first sight of a new kind of block
  const seen = G.visibleMask(state);
  for (let i = 0; i < G.VIEW_ROWS - 1; i++) for (let c = 0; c < G.COLS; c++) {
    const cell = state.rows[i][c];
    if (!cell || !seen[i][c]) continue;
    if (cell.t === 'chest' && !state.seen.chestToast) { state.seen.chestToast = true; toast(t('t_chest_seen'), 'gold'); }
    if (cell.t === 'tnt' && !state.seen.tntToast) { state.seen.tntToast = true; toast(t('t_tnt')); }
  }
}

// ---------- time away ----------

function awayCard(out) {
  if (out.seconds < 120 || (!out.coins && !out.chests)) return;
  paused = true;
  const m = $('modal');
  const mins = Math.floor(out.seconds / 60);
  const when = mins >= 60 ? t('hours', { h: Math.floor(mins / 60), m: mins % 60 }) : t('min', { n: mins });
  m.innerHTML = `<div class="card away"><h2></h2><p class="line"></p><div class="big">${icon('coin', 30)}<b id="away-n">0</b></div><ul></ul><button class="primary"></button></div>`;
  m.querySelector('h2').textContent = t('away_title');
  m.querySelector('.line').textContent = t('away_line', { t: when });
  const ul = m.querySelector('ul');
  const li = s => { const e = document.createElement('li'); e.textContent = s; ul.appendChild(e); };
  if (out.metres) li(t('away_metres', { n: out.metres }));
  if (out.chests) li(out.chests === 1 ? t('away_chest1') : t('away_chests', { n: out.chests }));
  if (out.atBoss) li(t('away_boss'));
  const btn = m.querySelector('button');
  btn.textContent = t('away_ok');
  btn.addEventListener('click', () => { unlock(); m.className = ''; m.innerHTML = ''; paused = false; if (state.chests > 0) setTimeout(openDraft, 300); });
  m.className = 'show';
  const t0 = performance.now(), el = m.querySelector('#away-n');
  const tick = () => { const k = Math.min(1, (performance.now() - t0) / 1800); el.textContent = '+' + fmt(out.coins * (1 - Math.pow(1 - k, 3))); if (k < 1 && el.isConnected) requestAnimationFrame(tick); };
  tick();
}

// ---------- the loop ----------

let lastT = performance.now();
let g2d = null;
function frame(now) {
  if (!state) return;
  let real = (now - lastT) / 1000;
  lastT = now;
  if (real < 0) real = 0;
  if (real > 60 && !paused) { awayCard(G.settleAway(state, real * SPEED)); shownCoins = state.coins; real = 0.016; }
  else if (real > 0.25) {
    // the tab was in the background for a moment: catch up without the fireworks
    if (!paused) { let left = real * SPEED; while (left > 0) { G.step(state, Math.min(0.1, left), quiet); left -= 0.1; } }
    real = 0.016;
  }
  const dt = Math.min(0.05, real);
  if (hitStop > 0) hitStop -= dt;
  else if (!paused) {
    fx.target = fx.mouse.inside ? targetAt(fx.mouse.x, fx.mouse.y) : null;
    if ((holding || autoDig) && fx.mouse.inside) { holdCd -= dt; if (holdCd <= 0) doSwing(); }
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
  panelT -= dt;
  if (panelT <= 0) { panelT = 0.1; updatePanels(false); }
}

function start() {
  document.title = t('title');
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  state = load();
  shownCoins = state.coins;
  fx.cam = state.top;
  fx.coinTarget = { x: 34, y: 30 };
  fx.onCoinLand = () => { coinLands++; };
  const cv = $('cv');
  cv.width = W; cv.height = H;
  g2d = cv.getContext('2d');
  bindInput(cv);
  buildShop();
  if (state.total === 0) $('hint').className = 'show'; else flags.firstBreak = true;

  $('chest-btn').addEventListener('click', () => { unlock(); openDraft(); });
  $('chest-btn').insertAdjacentHTML('afterbegin', icon('chest', 34));
  $('site-btn').addEventListener('click', () => { unlock(); openSites(); });
  const mute = $('mute');
  let m = false; try { m = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* ignore */ }
  setMuted(m); mute.textContent = t(m ? 'unmute' : 'mute');
  mute.addEventListener('click', () => { unlock(); setMuted(!isMuted()); mute.textContent = t(isMuted() ? 'unmute' : 'mute'); try { localStorage.setItem(MUTE_KEY, isMuted() ? '1' : '0'); } catch { /* ignore */ } });
  const auto = $('auto');
  try { autoDig = localStorage.getItem(AUTO_KEY) === '1'; } catch { /* ignore */ }
  const setAuto = (on) => { autoDig = on; auto.textContent = t(on ? 'auto_on' : 'auto_off'); auto.classList.toggle('on', on); try { localStorage.setItem(AUTO_KEY, on ? '1' : '0'); } catch { /* ignore */ } };
  setAuto(autoDig);
  auto.addEventListener('click', () => { unlock(); setAuto(!autoDig); });
  window.addEventListener('keydown', e => { if ((e.key === 'a' || e.key === 'A') && !e.ctrlKey && !e.metaKey && !e.altKey) { unlock(); setAuto(!autoDig); } });
  const reset = $('reset');
  let armed = 0;
  reset.addEventListener('click', () => {
    if (armed && performance.now() - armed < 4000) { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } state = null; location.reload(); return; }
    armed = performance.now(); reset.textContent = t('reset_sure');
    setTimeout(() => { armed = 0; reset.textContent = t('reset'); }, 4000);
  });

  // time away
  if (state.savedAt) {
    const away = (Date.now() - state.savedAt) / 1000;
    if (away > 60) awayCard(G.settleAway(state, away));
    shownCoins = state.coins;
  }
  updatePanels(true);

  setInterval(() => { if (state) save(); }, 5000);
  window.addEventListener('beforeunload', () => { if (state) save(); });
  let lastRaf = 0;
  const loop = now => { lastRaf = now; frame(now); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  // A background tab gets no animation frames and slow timers. A worker's timer is not slowed,
  // so the dig keeps its pace when you look at another tab.
  const beat = () => { const now = performance.now(); if (now - lastRaf > 120) frame(now); };
  try {
    const w = new Worker(URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 16);'], { type: 'text/javascript' })));
    w.onmessage = beat;
  } catch { setInterval(beat, 250); }
  window.dig = { get state() { return state; }, G, save };
}

start();
