// Dig feature (page side): Alqahwa, the coffee house. A full scene where the hired Rafeeqs and the manager rest after the dig
// (they walk, sit, sip, chat), and the menu board where every Star upgrade is bought (the Star tracks, same rules and prices as
// before: this is only a new place for them). One canvas, drawn only while the screen is open.
import * as G from '../../game.js';
import { sfx } from '../../ui/audio.js';
import { icon } from '../../ui/icons.js';
import { drawer } from '../../ui/drawer.js';
import { drawRafeeq, look } from '../diggers/art.js';
import { bossFigure } from '../chatter/manager.js';
import { starPanel } from '../starshop/ui.js';
import { alqahwa, goNextHere } from '../sites/ui.js';
import { openDesk } from '../story/ui.js';
import { qahwaGuests, qahwaSpots, qahwaNextAct, QAHWA_SPOTS } from './flow.js';
import { textDir } from '../../core/lang.js';

const { t } = G;
const CW = 960, CH = 250, GROUND = 214, UNIT = 30;      // the scene's logical size; one walking unit in the Rafeeq's art
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd = Math.random;
const pickOf = a => a[Math.floor(rnd() * a.length)];

let live = null;
export function stopAlqahwa() { if (live) { live.stop(); live = null; } }

// ---------- the room ----------
function room(g, T) {
  const w = g.createLinearGradient(0, 0, 0, GROUND);
  w.addColorStop(0, '#e9c98a'); w.addColorStop(1, '#c99a5a');
  g.fillStyle = w; g.fillRect(0, 0, CW, GROUND);
  // a band of red and white sadu weaving along the wall
  for (let x = 0; x < CW; x += 24) { g.fillStyle = (x / 24) % 2 ? '#a8322a' : '#f3e6c4'; g.fillRect(x, 96, 12, 8); g.fillStyle = '#3a2412'; g.fillRect(x, 94, 24, 2); g.fillRect(x, 104, 24, 2); }
  // arched windows with sky
  for (const x of [90, 330, 570]) {
    g.fillStyle = '#7a4a22'; g.beginPath(); g.moveTo(x - 38, 92); g.lineTo(x - 38, 40); g.quadraticCurveTo(x, -6, x + 38, 40); g.lineTo(x + 38, 92); g.closePath(); g.fill();
    g.fillStyle = '#9fd9f0'; g.beginPath(); g.moveTo(x - 30, 90); g.lineTo(x - 30, 42); g.quadraticCurveTo(x, 2, x + 30, 42); g.lineTo(x + 30, 90); g.closePath(); g.fill();
    g.fillStyle = '#f6e7b0'; g.beginPath(); g.arc(x + 12, 52, 8, 0, 7); g.fill();
    g.strokeStyle = '#7a4a22'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 12); g.lineTo(x, 90); g.moveTo(x - 30, 62); g.lineTo(x + 30, 62); g.stroke();
  }
  // the shelf of pots and little cups
  g.fillStyle = '#5a3516'; g.fillRect(690, 66, 240, 8);
  for (let i = 0; i < 6; i++) {
    const x = 706 + i * 38;
    if (i % 2) { g.fillStyle = '#ffd23f'; g.strokeStyle = '#2b1a0c'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 9, 66); g.lineTo(x + 9, 66); g.lineTo(x + 6, 40); g.lineTo(x - 6, 40); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(x - 6, 40); g.lineTo(x + 12, 34); g.lineTo(x + 6, 46); g.stroke(); }
    else { g.fillStyle = '#f6efdc'; g.strokeStyle = '#2b1a0c'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 7, 52); g.lineTo(x + 7, 52); g.lineTo(x + 5, 66); g.lineTo(x - 5, 66); g.closePath(); g.fill(); g.stroke(); }
  }
  // lanterns swinging
  for (const x of [200, 450, 680]) {
    const sw = reduced ? 0 : Math.sin(T * 1.3 + x) * 3;
    g.strokeStyle = '#2b1a0c'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + sw, 30); g.stroke();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(x + sw - 8, 32); g.lineTo(x + sw + 8, 32); g.lineTo(x + sw + 6, 52); g.lineTo(x + sw - 6, 52); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,220,120,0.22)'; g.beginPath(); g.arc(x + sw, 42, 26 + (reduced ? 0 : Math.sin(T * 5 + x) * 2), 0, 7); g.fill();
  }
  // the floor and its rug
  g.fillStyle = '#8a5a30'; g.fillRect(0, GROUND, CW, CH - GROUND);
  g.fillStyle = '#6e4624'; g.fillRect(0, GROUND, CW, 4);
  g.fillStyle = '#a8322a'; g.beginPath(); g.roundRect(60, GROUND + 6, 640, 26, 6); g.fill();
  g.strokeStyle = '#f3e6c4'; g.lineWidth = 3; g.strokeRect(70, GROUND + 11, 620, 16);
  for (let x = 90; x < 680; x += 36) { g.fillStyle = '#f3e6c4'; g.beginPath(); g.moveTo(x, GROUND + 19); g.lineTo(x + 8, GROUND + 14); g.lineTo(x + 16, GROUND + 19); g.lineTo(x + 8, GROUND + 24); g.closePath(); g.fill(); }
}
function cushions(g, spots) {
  const cols = ['#2f7ab8', '#d7332b', '#2f8f5b', '#ffd23f'];
  QAHWA_SPOTS.forEach((f, i) => {
    const x = f * CW;
    g.fillStyle = cols[i % 4]; g.strokeStyle = '#2b1a0c'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(x - 22, GROUND - 7, 44, 12, 6); g.fill(); g.stroke();
  });
}
function counter(g, T) {
  g.fillStyle = '#5a3516'; g.strokeStyle = '#2b1a0c'; g.lineWidth = 3;
  g.beginPath(); g.roundRect(716, 134, 220, 80, 6); g.fill(); g.stroke();
  g.fillStyle = '#7a4a22'; g.fillRect(722, 148, 208, 6);
  // the big dallah and a tray of cups
  g.fillStyle = '#ffd23f'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(742, 134); g.quadraticCurveTo(732, 112, 750, 104); g.lineTo(780, 104); g.quadraticCurveTo(798, 112, 788, 134); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(748, 104); g.lineTo(782, 104); g.lineTo(765, 92); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(789, 112); g.quadraticCurveTo(812, 100, 818, 90); g.stroke();
  g.beginPath(); g.moveTo(742, 112); g.quadraticCurveTo(724, 114, 730, 128); g.stroke();
  if (!reduced) {
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2; g.lineCap = 'round';
    for (let i = 0; i < 2; i++) { const w = Math.sin(T * 2 + i * 2) * 3; g.beginPath(); g.moveTo(816 + i * 4, 86); g.quadraticCurveTo(812 + w + i * 4, 76, 817 + i * 4, 66); g.stroke(); }
  }
  g.fillStyle = '#f6efdc'; g.strokeStyle = '#2b1a0c'; g.lineWidth = 2;
  for (let i = 0; i < 4; i++) { const x = 830 + i * 24; g.beginPath(); g.moveTo(x - 7, 126); g.lineTo(x + 7, 126); g.lineTo(x + 5, 134); g.lineTo(x - 5, 134); g.closePath(); g.fill(); g.stroke(); }
  // the sign over the counter
  g.fillStyle = 'rgba(24,14,8,0.85)'; g.strokeStyle = '#ffd23f'; g.lineWidth = 2.5;
  g.beginPath(); g.roundRect(760, 160, 130, 34, 8); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; g.font = '800 20px system-ui, Cairo, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t('qh_title'), 825, 178);
}

function greatSiphonStructure(g, T) {
  const sx = 24, sy = 100;
  // Copper boiler tank
  g.fillStyle = '#b45309'; g.strokeStyle = '#2b1a0c'; g.lineWidth = 2.5;
  g.beginPath(); g.roundRect(sx, sy + 30, 48, 64, 6); g.fill(); g.stroke();
  g.fillStyle = '#d97706'; g.fillRect(sx + 4, sy + 38, 40, 6);

  // Pressure valve & copper piping
  g.strokeStyle = '#f59e0b'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(sx + 24, sy + 30); g.lineTo(sx + 24, sy + 10);
  g.quadraticCurveTo(sx + 40, sy - 2, sx + 56, sy + 14); g.lineTo(sx + 56, sy + 44);
  g.stroke();

  // Glass star condensation tube
  g.fillStyle = 'rgba(254, 240, 138, 0.25)'; g.strokeStyle = '#fef08a'; g.lineWidth = 2;
  g.beginPath(); g.roundRect(sx + 48, sy + 44, 20, 48, 4); g.fill(); g.stroke();

  // Glowing star crystal inside siphon
  const glow = 0.5 + Math.sin(T * 3) * 0.3;
  g.fillStyle = `rgba(250, 204, 21, ${glow})`;
  g.beginPath(); g.arc(sx + 58, sy + 68, 6, 0, Math.PI * 2); g.fill();

  // Rising steam & star sparks
  if (!reduced) {
    g.fillStyle = '#ffd23f';
    const py = (T * 20) % 24;
    g.beginPath(); g.arc(sx + 58, sy + 60 - py, 2, 0, Math.PI * 2); g.fill();
  }

  // Small brass badge
  g.fillStyle = '#78350f'; g.strokeStyle = '#ffd23f'; g.lineWidth = 1.5;
  g.beginPath(); g.roundRect(sx + 2, sy + 74, 52, 18, 3); g.fill(); g.stroke();
  g.fillStyle = '#fef08a'; g.font = 'bold 13px system-ui, Cairo, sans-serif'; g.textAlign = 'center';
  g.fillText('SIPHON', sx + 28, sy + 88);
}

function clockworkOrreryStructure(g, T) {
  const ox = 640, oy = 110;
  // Brass pedestal
  g.fillStyle = '#78350f'; g.strokeStyle = '#2b1a0c'; g.lineWidth = 2.5;
  g.beginPath(); g.roundRect(ox - 24, oy + 40, 48, 54, 4); g.fill(); g.stroke();
  g.fillStyle = '#b45309'; g.fillRect(ox - 20, oy + 46, 40, 6);

  // Escapement gears
  const gearAng = T * 2;
  g.strokeStyle = '#d97706'; g.lineWidth = 2;
  g.beginPath(); g.arc(ox, oy + 10, 18, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 8; i++) {
    const a = gearAng + (i * Math.PI) / 4;
    g.beginPath(); g.moveTo(ox + Math.cos(a) * 16, oy + 10 + Math.sin(a) * 16);
    g.lineTo(ox + Math.cos(a) * 22, oy + 10 + Math.sin(a) * 22); g.stroke();
  }

  // Armillary rings
  const ringAng = T * 1.5;
  g.strokeStyle = '#f59e0b'; g.lineWidth = 2;
  g.beginPath(); g.ellipse(ox, oy + 10, 26, 12, ringAng, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.ellipse(ox, oy + 10, 26, 12, -ringAng, 0, Math.PI * 2); g.stroke();

  // Central glowing sun sphere
  g.fillStyle = '#ffd23f';
  g.beginPath(); g.arc(ox, oy + 10, 7, 0, Math.PI * 2); g.fill();

  // Orbiting planetary beads
  const px = ox + Math.cos(ringAng * 2) * 20;
  const py = oy + 10 + Math.sin(ringAng * 2) * 9;
  g.fillStyle = '#38bdf8';
  g.beginPath(); g.arc(px, py, 3.5, 0, Math.PI * 2); g.fill();

  // Brass nameplate
  g.fillStyle = '#78350f'; g.strokeStyle = '#ffd23f'; g.lineWidth = 1.5;
  g.beginPath(); g.roundRect(ox - 28, oy + 76, 56, 18, 3); g.fill(); g.stroke();
  g.fillStyle = '#fef08a'; g.font = 'bold 13px system-ui, Cairo, sans-serif'; g.textAlign = 'center';
  g.fillText('ORRERY', ox, oy + 90);
}

function crystalSpireStructure(g, T) {
  const sx = 480, sy = 90;
  // Prismatic spire crystal
  const pulse = Math.sin(T * 2) * 0.2 + 0.8;
  g.fillStyle = `rgba(56, 189, 248, ${0.4 * pulse})`;
  g.strokeStyle = '#38bdf8';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(sx, sy - 20);
  g.lineTo(sx + 16, sy + 40);
  g.lineTo(sx, sy + 50);
  g.lineTo(sx - 16, sy + 40);
  g.closePath();
  g.fill();
  g.stroke();

  // Rainbow refraction lines
  g.strokeStyle = 'rgba(236, 72, 153, 0.7)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(sx, sy);
  g.lineTo(sx + 24, sy + 30);
  g.stroke();

  // Spire Pedestal
  g.fillStyle = '#0f172a';
  g.fillRect(sx - 18, sy + 50, 36, 16);
  g.fillStyle = '#38bdf8';
  g.font = 'bold 13px system-ui, Cairo, sans-serif';
  g.textAlign = 'center';
  g.fillText('SPIRE', sx, sy + 62);
}

// ---------- the guests ----------
function makeGuest(s, i, x) {
  const d = { c: x / UNIT, r: 0, tr: -1, tc: -1, cd: 1, swing: 0 };
  return { kind: 'r', i, d, x, tx: x, act: 'walk', left: 0, line: '', lineT: 0, said: -9, face: 1, arrived: true };
}
function pickAct(gst, guests, r) {
  const a = qahwaNextAct(gst.act, r);
  gst.act = a; gst.left = 3 + rnd() * 4; gst.arrived = false;
  const free = x => guests.every(o => o === gst || Math.abs(o.tx - x) >= 74);    // nobody stands on top of another
  let tx = gst.x;
  for (let k = 0; k < 8; k++) {
    let x;
    if (a === 'sit' || a === 'sip') x = pickOf(QAHWA_SPOTS) * CW;
    else if (a === 'chat') { const mates = guests.filter(o => o !== gst), o = mates.length ? pickOf(mates) : null; x = o ? o.x + (o.x > CW / 2 ? -62 : 62) : gst.x; }
    else x = (0.06 + rnd() * 0.66) * CW;
    x = Math.max(50, Math.min(CW - 50, x));
    tx = x;
    if (a === 'chat' || free(x)) break;
  }
  gst.tx = tx;
}
function lineFor(s, gst) {
  const tr = G.rafeeqTrait ? G.rafeeqTrait(s, gst.i) : 'eager';
  const pool = [...G.chatterLines(tr, 'relax'), ...G.chatterLines(tr, 'finish'), ...G.chatterLines('all', 'relax')];
  return pool.length ? pickOf(pool) : '';
}

function bubble(g, text, x, y, a) {
  g.save(); g.globalAlpha = a; g.font = 'bold 13px system-ui, Cairo, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(text).width + 16;
  g.fillStyle = '#fffdf2'; g.strokeStyle = '#1b1410'; g.lineWidth = 2;
  g.beginPath(); g.roundRect(x - w / 2, y - 12, w, 22, 8); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x - 4, y + 10); g.lineTo(x, y + 16); g.lineTo(x + 4, y + 10); g.fillStyle = '#fffdf2'; g.fill();
  g.fillStyle = '#1b1410'; g.direction = textDir(text); g.fillText(text, x, y); g.restore();
}

export function openAlqahwa(app, opts = {}) {
  if (app.modal.id) return false;
  stopAlqahwa();
  const s = app.state;
  const m = app.modal.open('alqahwa', `<div class="card qhcard"><div class="qh-head"><span class="qh-ic"></span><h2></h2><span class="qh-sub"></span><span class="qh-stars"></span></div>`
    + `<div class="qh-stage"><canvas width="${CW}" height="${CH}"></canvas><p class="qh-empty"></p></div>`
    + `<div class="qh-board panel" id="panel-starshop"><h3 class="qh-menu"></h3></div>`
    + `<div class="qh-btns"><button class="ghost qh-wardrobe"></button><span class="qh-gap"></span><button class="ghost qh-back"></button><button class="primary gold qh-next"></button></div></div>`);
  if (!m) return false;
  const $ = q => m.querySelector(q);
  $('.qh-ic').innerHTML = icon('qahwa', 34); $('h2').textContent = t('qh_title'); $('.qh-sub').textContent = t('qh_sub');
  if (G.hasGreatSiphon && G.hasGreatSiphon(s)) $('.qh-sub').textContent += ' • ' + (G.hasString('great_siphon') ? t('great_siphon') : 'The Great Siphon');
  if (G.hasClockworkOrrery && G.hasClockworkOrrery(s)) $('.qh-sub').textContent += ' • ' + (G.hasString('clockwork_orrery') ? t('clockwork_orrery') : 'Clockwork Orrery');
  if (G.hasCrystalSpire && G.hasCrystalSpire(s)) $('.qh-sub').textContent += ' • ' + (G.hasString('crystal_spire') ? t('crystal_spire') : 'Crystal Resonance Spire');
  $('.qh-menu').textContent = t('qh_menu');
  $('.qh-wardrobe').textContent = t('qh_wardrobe'); $('.qh-next').textContent = t('qh_next');
  const run = G.siteRun(s), back = $('.qh-back');
  back.textContent = opts.back ? t('qh_back') : t('qh_close');
  back.addEventListener('click', () => { app.modal.close(); if (opts.back) opts.back(); });
  const next = $('.qh-next');
  next.hidden = !G.canNewSite(s);
  next.addEventListener('click', () => { app.unlockAudio(); app.modal.close(); goNextHere(app); });
  $('.qh-wardrobe').addEventListener('click', () => { app.modal.close(); drawer.open('camp'); });

  // the menu board: the Star tracks
  const board = $('.qh-board'), panel = starPanel();
  panel.build(board, app);
  const stars = $('.qh-stars');
  let boardT = 0;
  const refreshBoard = () => { panel.update(board, s, app); stars.innerHTML = icon('star', 22) + '<b></b>'; stars.querySelector('b').textContent = G.fmt(s.stars); };
  refreshBoard();

  // the room
  const cv = $('canvas'), g = cv.getContext('2d');
  const who = qahwaGuests(s), spots = qahwaSpots(who.rafeeqs.length);
  const guests = who.rafeeqs.map((i, k) => makeGuest(s, i, spots[k] * CW));
  $('.qh-empty').textContent = t('qh_empty'); $('.qh-empty').hidden = guests.length > 0 || !!who.manager;
  const boss = who.manager ? { kind: 'm', fem: who.manager === 'f', x: 0.73 * CW, tx: 0.73 * CW, act: 'sit', left: 2, face: -1, sip: 0, wave: 0, sipT: 2, line: '', lineT: 0, said: -9, bob: 0 } : null;
  const desk = openDesk(app, m, { stage: $('.qh-stage'), btns: $('.qh-btns'), CW });      // the hakawati (story/ui.js)
  guests.forEach(o => { o.act = 'sit'; o.left = 1 + rnd() * 3; o.arrived = true; });
  let T = 0, last = performance.now(), timer = 0, stopped = false;

  function stepGuest(o, dt) {
    o.left -= dt;
    const dx = o.tx - o.x, near = Math.abs(dx) < 3;
    if (!near) { const v = (o.act === 'walk' ? 46 : 62) * dt; o.x += Math.sign(dx) * Math.min(Math.abs(dx), v); o.face = dx > 0 ? 1 : -1; }
    else if (!o.arrived) { o.arrived = true; if (o.act === 'chat') { o.said = T; o.line = lineFor(s, o); o.lineT = 3; } }
    if (o.arrived && o.act === 'sip' && o.lineT <= 0 && rnd() < dt * 0.15) { o.line = ''; }
    if (o.arrived && o.act === 'chat' && T - o.said > 4.2) { o.line = lineFor(s, o); o.lineT = 3; o.said = T; }
    o.lineT = Math.max(0, o.lineT - dt);
    if (o.left <= 0 && (o.arrived || o.act === 'walk')) pickAct(o, guests, rnd());
    o.d.c = o.x / UNIT;
  }
  function frame() {
    if (stopped) return;
    if (!m.isConnected) { stopAlqahwa(); return; }
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (document.hidden) { timer = setTimeout(frame, 250); return; }       // a hidden tab draws nothing and does not move the room on
    T += dt;
    guests.forEach(o => stepGuest(o, dt));
    if (boss) {
      boss.sipT -= dt; boss.left -= dt; boss.lineT = Math.max(0, boss.lineT - dt);
      if (boss.sipT <= 0) { boss.sip = 1.5; boss.sipT = 4 + rnd() * 4; }
      boss.sip = Math.max(0, boss.sip - dt); boss.wave = Math.max(0, boss.wave - dt);
      const dx = boss.tx - boss.x;
      if (Math.abs(dx) > 2) { boss.x += Math.sign(dx) * Math.min(Math.abs(dx), 26 * dt); boss.face = dx > 0 ? 1 : -1; boss.bob = Math.abs(Math.sin(T * 8)) * 2; } else boss.bob = 0;
      if (boss.left <= 0) { boss.tx = (0.55 + rnd() * 0.3) * CW; boss.left = 5 + rnd() * 5; if (rnd() < 0.4) boss.wave = 1.2; }
    }
    boardT -= dt; if (boardT <= 0) { boardT = 0.25; refreshBoard(); }
    // draw
    g.clearRect(0, 0, CW, CH);
    room(g, T); cushions(g); counter(g, T);
    if (G.hasGreatSiphon && G.hasGreatSiphon(s)) greatSiphonStructure(g, T);
    if (G.hasClockworkOrrery && G.hasClockworkOrrery(s)) clockworkOrreryStructure(g, T);
    if (G.hasCrystalSpire && G.hasCrystalSpire(s)) crystalSpireStructure(g, T);
    desk.draw(g, T, CW, GROUND);
    const order = [...guests.map(o => ({ y: 0, o })), ...(boss ? [{ y: 0, o: boss }] : [])].sort((a, b) => a.o.x - b.o.x);
    for (const { o } of order) {
      if (o.kind === 'm') {
        g.save(); g.translate(o.x, GROUND - 2 - o.bob); g.scale(o.face * -1.15, 1.15);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(0, 4 + o.bob / 1.15, 16, 4, 0, 0, 7); g.fill();
        bossFigure(g, boss.fem, { jump: 0, sipLeft: boss.sip, wave: boss.wave, asleep: false, spill: 0 }, T);
        g.restore();
        g.fillStyle = '#ffd23f'; g.font = 'bold 13px system-ui, Cairo, sans-serif'; g.textAlign = 'center'; g.fillText(t(boss.fem ? 'qh_name_f' : 'qh_name_m'), o.x, GROUND + 20);
        continue;
      }
      const mood = !o.arrived ? null : o.act === 'sit' || o.act === 'sip' ? 'tea' : o.act === 'chat' ? (o.lineT > 0 ? 'laugh' : 'happy') : null;
      if (mood) look.set(o.d, { mood, age: T }); else look.delete(o.d);
      const wear = G.wardrobeWear ? G.wardrobeWear(s, o.i) : undefined;
      g.save(); g.translate(o.x, GROUND - 21 * 1.6 + 12); g.scale(1.6, 1.6);
      try { drawRafeeq(g, s, o.d, o.i, 0, dt, wear ? { wear } : {}); } catch (e) { /* a missing pose must not break the room */ }
      g.restore();
      g.fillStyle = '#fff6e0'; g.strokeStyle = 'rgba(20,12,6,0.85)'; g.lineWidth = 3; g.lineJoin = 'round'; g.font = 'bold 13px system-ui, Cairo, sans-serif'; g.textAlign = 'center';
      const nm = G.rafeeqName ? G.rafeeqName(s, o.i) : t('crew_name', { n: o.i + 1 });
      g.direction = textDir(nm); g.strokeText(nm, o.x, GROUND + 20); g.fillText(nm, o.x, GROUND + 22); g.direction = 'inherit';
      if (o.line && o.lineT > 0) bubble(g, o.line, o.x, GROUND - 92, Math.min(1, o.lineT * 2));
    }
    timer = requestAnimationFrame(frame);
  }
  function stop() { stopped = true; desk.stop(); cancelAnimationFrame(timer); clearTimeout(timer); if (window.dig && window.dig.alqahwa === api) delete window.dig.alqahwa; }
  const api = { guests, boss, stop };
  if (window.dig) window.dig.alqahwa = api;
  live = { stop };
  frame();
  sfx.coin && sfx.coin(3);
  return true;
}

alqahwa.open = openAlqahwa;
