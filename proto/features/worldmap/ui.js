// Dig feature (page side): the road map between levels. A Candy Crush style road across five lands (and Beyond), with
// side roads like Super Mario World's. After a finish the stone you finished shows its medals, the path to the next
// stone draws itself, the little digger walks it and the next stone opens. Any click skips the walk.
// Read-only: the only thing it does to the game is G.pickCard(s, card) for a card of the deal, as the card modal did.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { sfx } from '../../ui/audio.js';
import { icon, helmet, pickShape, S } from '../../ui/icons.js';
import strings from './strings.js';
import { nextMap, newThingKey, medalsHtml } from '../sites/ui.js';
import { buildMap, PW, HH } from './layout.js';
import { paint, along } from './draw.js';

const { t } = G;
G.addStrings(strings, 'worldmap');

const clock = sec => { const n = Math.max(0, Math.floor(sec)); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); };
const ruleLine = id => (id && G.hasString('c_' + id + '_d') ? t('c_' + id + '_d') : '');
const ease = u => u * u * (3 - 2 * u);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const idle = n => ({ x: n.x - n.r - 9, y: n.y + 12 });

let active = null;

function stopActive() { if (active) { active.stop(); active = null; } }

export function openMap(app, opts = {}) {
  if (app.modal.id) return false;
  const s = app.state, map = buildMap(s);            // may throw: nothing is open yet, the caller falls back to the cards
  const m = app.modal.open('worldmap', `<div class="card wmcard"><div class="wm-head"><h2></h2><span class="wm-sub"></span><button class="ghost wm-back"></button></div>`
    + `<div class="wm-lands"></div><div class="wm-stage"><canvas></canvas><button class="wm-pan l"></button><button class="wm-pan r"></button><span class="wm-skip"></span></div>`
    + `<div class="wm-info"><span class="wm-ic"></span><div class="wm-txt"><b></b><span class="line"></span><span class="gt"></span><span class="nw"></span><span class="pay"></span></div>`
    + `<div class="mrow"></div><button class="primary gold wm-go"></button></div><p class="wm-leave"></p></div>`);
  if (!m) return false;
  try { active = start(app, m, map, opts); } catch (e) { stopActive(); app.modal.close(); throw e; }
  return true;
}

function start(app, m, map, opts) {
  const s = app.state;
  const viewOnly = !G.canNewSite(s);
  const $ = q => m.querySelector(q);
  const cv = $('canvas'), g = cv.getContext('2d'), stage = $('.wm-stage');
  $('h2').textContent = t('wm_title');
  $('.wm-sub').textContent = map.nextIdx < G.ROAD.length ? t('fin_next_level', { n: map.nextIdx + 1, of: G.ROAD.length }) : t('wm_hub_open');
  $('.wm-back').textContent = t('wm_back'); $('.wm-back').addEventListener('click', () => app.modal.close());
  $('.wm-pan.l').textContent = '<'; $('.wm-pan.r').textContent = '>';
  $('.wm-pan.l').title = t('wm_pan_left'); $('.wm-pan.r').title = t('wm_pan_right');
  $('.wm-skip').textContent = t('wm_skip');
  const goBtn = $('.wm-go');
  goBtn.textContent = t('wm_dig');
  const leave = $('.wm-leave');
  if (viewOnly) leave.textContent = t('wm_wait');
  else {
    const run = G.siteRun(s), gain = G.starsFor(s);
    leave.textContent = run.done ? (gain > 0 ? t('next_reward', { n: G.fmt(gain) }) : t('next_leave_done')) : t('next_leave', { n: G.fmt(gain) });
  }

  // ---------- the walk ----------
  const fromKey = opts.from && opts.from.key;
  const fromNode = fromKey ? map.nodes.find(n => n.type === 'road' && G.siteKey(n.site, n.floor) === fromKey) : null;
  const target = fromNode && fromNode.i === map.nextIdx - 1 ? (map.nextIdx < G.ROAD.length ? map.nodes.find(n => n.type === 'road' && n.i === map.nextIdx) : map.hub) : null;
  const edge = target ? map.edges.find(e => e.from === fromNode && e.to === target) : null;
  const won = fromNode && fromNode.stamp ? ['fin', 'fast', 'hard'].map((k, i) => (fromNode.stamp[k] ? i : -1)).filter(i => i >= 0) : [];
  const crosses = !!target && target.zone !== fromNode.zone;
  const T = { pips: 0.45, step: 0.3 };
  T.pathAt = T.pips + T.step * won.length + 0.1; T.pathDur = 0.8;
  T.walkAt = T.pathAt + T.pathDur + 0.1; T.walkDur = crosses ? 1.6 : 1.0; T.end = T.walkAt + T.walkDur;
  let walking = !!edge, clockT = 0, burstDone = false, pipsPlayed = 0;
  const bursts = [];
  const ages = [99, 99, 99];

  let sel = null;
  const goNode = map.go;
  const stand = target || goNode || map.nodes.filter(n => n.state === 'done').pop() || map.nodes[0];

  // ---------- size and camera ----------
  let cssW = 800, cssH = 400, k = 1, vw = 800, dpr = 1, camX = 0, camTo = 0;
  const maxCam = () => Math.max(0, map.width - vw);
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cssW = stage.clientWidth || 800;
    cssH = clamp(window.innerHeight - 330, 300, HH);
    k = cssH / HH; vw = cssW / k;
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr); cv.style.height = cssH + 'px';
  }
  resize();
  const centreOn = x => clamp(x - vw / 2, 0, maxCam());
  camX = camTo = centreOn((walking ? fromNode : stand).x);
  const onResize = () => { resize(); camTo = clamp(camTo, 0, maxCam()); camX = clamp(camX, 0, maxCam()); };
  window.addEventListener('resize', onResize);

  // land chips
  const chips = $('.wm-lands');
  map.panels.forEach(p => {
    const b = document.createElement('button');
    b.textContent = p.zone === 'beyond' ? t('wm_beyond') : t('look_zone_' + p.zone);
    b.addEventListener('click', () => { if (walking) finishWalk(); camTo = centreOn(p.x + PW / 2); });
    chips.appendChild(b); p.chip = b;
  });

  // ---------- the info panel ----------
  const setInfo = n => {
    sel = n;
    const ic = $('.wm-ic'), name = $('b'), line = $('.line'), gt = $('.gt'), nw = $('.nw'), pay = $('.pay'), mrow = $('.mrow');
    nw.classList.remove('hard');
    if (!n) { ic.innerHTML = ''; name.textContent = ''; line.textContent = t('wm_go_hint'); gt.textContent = nw.textContent = pay.textContent = ''; mrow.innerHTML = ''; goBtn.hidden = true; return; }
    const c = n.card;
    ic.innerHTML = icon(n.type === 'hub' ? 'gate' : 'site_' + n.site, 48);
    gt.textContent = nw.textContent = pay.textContent = ''; mrow.innerHTML = '';
    if (n.type === 'road') {
      const f = G.ROAD[n.i];
      name.textContent = t('site_' + n.site);
      line.textContent = t('look_zone_' + n.zone) + ', ' + t('fin_next_level', { n: n.level, of: G.ROAD.length });
      gt.textContent = t('next_gate', { n: n.floor }) + '   ' + t('next_par', { t: clock(G.sitePar(n.floor)) });
      nw.textContent = t(newThingKey(f, n.i)); nw.classList.toggle('hard', !!n.prove);
      if (n.state === 'locked') pay.textContent = t('wm_locked', { n: n.level - 1 });
      else if (c) pay.textContent = t(c.medals.fin ? 'next_reward_again' : 'next_reward', { n: c.stars }) + '   ' + t('next_medal_each', { n: c.medalStars });
      else pay.textContent = n.stamp && n.stamp.best ? t('wm_best', { t: clock(n.stamp.best) }) : t('wm_not_yet');
      mrow.innerHTML = medalsHtml(n.stamp);
    } else if (n.type === 'hub') {
      name.textContent = t('wm_beyond');
      line.textContent = n.state === 'done' ? t('wm_hub_open') : t('wm_hub_locked', { n: G.ROAD.length });
    } else {
      name.textContent = t('site_' + n.site) + (n.twist ? ', ' + t('twist_' + n.twist) : '');
      line.textContent = c ? t('tag_' + c.kind) + (c.hard ? ', ' + t('next_hard', { rule: ruleLine(c.hard) }) : '') : t('wm_island');
      if (c) {
        gt.textContent = t('next_gate', { n: c.floor }) + '   ' + t('next_par', { t: clock(c.par) });
        nw.textContent = n.twist ? t('twist_' + n.twist + '_d') : t('site_' + n.site + '_d');
        pay.textContent = t(c.medals.fin ? 'next_reward_again' : 'next_reward', { n: c.stars }) + '   ' + t('next_medal_each', { n: c.medalStars });
        mrow.innerHTML = medalsHtml(c.medals);
      } else { nw.textContent = t('site_' + n.site + '_d'); pay.textContent = t('wm_island_wait'); }
    }
    goBtn.hidden = !c || viewOnly;
  };
  const dig = () => {
    const n = sel, c = n && n.card;
    if (!c || viewOnly) return;
    app.unlockAudio();
    app.modal.close();
    if (G.pickCard(s, c, app.ev)) { app.save(); app.refresh(true); }
  };
  goBtn.addEventListener('click', dig);

  // ---------- the walk, and what ends it ----------
  const pop = () => ({ nodeId: fromNode && fromNode.id, ages });
  function burst(n) {
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * 6.283, sp = 50 + Math.random() * 110;
      bursts.push({ x: n.x, y: n.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, r: 2 + Math.random() * 3, life: 0.7, max: 0.7, col: i % 3 ? '#ffd23f' : '#fff3a8' });
    }
  }
  function finishWalk() {
    if (!walking) return;
    walking = false; clockT = T.end;
    won.forEach(i => { ages[i] = 5; });
    if (!burstDone) { burstDone = true; burst(target); if (crosses) sfx.star(); else sfx.buy(); }
    camTo = centreOn(target.x);
    setInfo(goNode || target);
  }

  // ---------- input ----------
  const world = e => { const r = cv.getBoundingClientRect(); return { x: camX + (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; };
  const hit = p => {
    let best = null, bd = 1e9;
    for (const n of map.nodes) {
      if (n.state === 'locked' && walking && n === target) { /* still a stone you can look at */ }
      const d = Math.hypot(p.x - n.x, p.y - (n.type === 'island' ? n.y + 2 : n.y)), reach = n.r + (n.type === 'island' ? 22 : 10);
      if (d <= reach && d < bd) { best = n; bd = d; }
    }
    return best;
  };
  let drag = null;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); drag = { x: e.clientX, cam: camTo, moved: false, id: e.pointerId }; });
  cv.addEventListener('pointermove', e => {
    if (drag) {
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 5) { drag.moved = true; cv.classList.add('drag'); }
      if (drag.moved) { camTo = camX = clamp(drag.cam - dx / k, 0, maxCam()); }
    } else cv.classList.toggle('hot', !!hit(world(e)));
  });
  const up = e => {
    if (!drag) return;
    const d = drag; drag = null; cv.classList.remove('drag');
    if (d.moved) return;
    if (walking) { finishWalk(); return; }
    const n = hit(world(e));
    if (n) { setInfo(n); sfx.coin(2); }
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', () => { drag = null; cv.classList.remove('drag'); });
  const pan = dir => { if (walking) finishWalk(); camTo = clamp(camTo + dir * PW * 0.6, 0, maxCam()); };
  $('.wm-pan.l').addEventListener('click', () => pan(-1)); $('.wm-pan.r').addEventListener('click', () => pan(1));
  const onKey = e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { pan(e.key === 'ArrowLeft' ? -1 : 1); }
    else if (e.key === 'Enter' || e.key === ' ') { if (walking) finishWalk(); else if (!goBtn.hidden) dig(); }
    else if (e.key === 'Escape') { app.modal.close(); }
    else return;
    e.preventDefault(); e.stopPropagation();
  };
  document.addEventListener('keydown', onKey, true);

  // ---------- the frame ----------
  let timer = 0, last = performance.now(), stopped = false, here = '';
  const redraw = () => { /* images load once; the next frame shows them */ };
  function frame() {
    if (stopped) return;
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    let hold = null, marker = null;
    if (walking) {
      clockT += dt;
      // medals pop one at a time
      won.forEach((i, j) => {
        const at = T.pips + T.step * j;
        ages[i] = clockT >= at ? clockT - at : -1;
        if (clockT >= at && pipsPlayed <= j) { pipsPlayed = j + 1; sfx.coin(j * 2 + 4); }
      });
      const pu = clamp((clockT - T.pathAt) / T.pathDur, 0, 1);
      hold = { edge, target, progress: pu };
      const wu = clamp((clockT - T.walkAt) / T.walkDur, 0, 1), a = idle(fromNode), b = idle(target);
      let p;
      if (wu <= 0) p = a;
      else {
        const q = along(edge, ease(wu)), lead = ease(clamp(wu / 0.15, 0, 1)), tail = ease(clamp((wu - 0.85) / 0.15, 0, 1));
        p = { x: q.x, y: q.y };
        p.x = a.x + (p.x - a.x) * lead; p.y = a.y + (p.y - a.y) * lead;
        p.x = p.x + (b.x - p.x) * tail; p.y = p.y + (b.y - p.y) * tail;
      }
      marker = { x: p.x, y: p.y, bob: wu > 0 && wu < 1 ? Math.abs(Math.sin(clockT * 14)) * 5 : 0 };
      if (wu > 0) camTo = centreOn(p.x);
      if (clockT >= T.end) finishWalk();
    } else {
      const p = stand ? idle(stand) : null;
      if (p) marker = { x: p.x, y: p.y, bob: Math.abs(Math.sin(now / 260)) * 2.5 };
    }
    camX += (camTo - camX) * (1 - Math.exp(-dt * 7));
    if (Math.abs(camTo - camX) < 0.3) camX = camTo;
    for (const b of bursts) { b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 260 * dt; }
    for (let i = bursts.length - 1; i >= 0; i--) if (bursts[i].life <= 0) bursts.splice(i, 1);
    paint(g, map, { camX, vw, k, dpr, time: now / 1000, sel, go: goNode, redraw, hold, marker, bursts, pop: walking ? pop() : null, fade: 1 });
    const mid = camX + vw / 2, cur = map.panels.find(p => mid >= p.x && mid < p.x + PW) || map.panels[map.panels.length - 1];
    if (cur.zone !== here) { here = cur.zone; map.panels.forEach(p => p.chip.classList.toggle('here', p === cur)); }
    $('.wm-skip').style.display = walking ? '' : 'none';
    timer = document.hidden ? setTimeout(frame, 33) : requestAnimationFrame(frame);
  }
  function stop() {
    stopped = true;
    cancelAnimationFrame(timer); clearTimeout(timer);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', onResize);
    if (window.dig && window.dig.worldmap === api) delete window.dig.worldmap;
  }
  const api = { map, skip: finishWalk, select: id => setInfo(map.nodes.find(n => n.id === id)), get walking() { return walking; }, pan: x => { camTo = camX = clamp(x, 0, maxCam()); }, dig };
  if (window.dig) window.dig.worldmap = api;

  setInfo(walking ? null : (goNode || stand));
  if (walking) { $('.line').textContent = ''; }
  frame();
  return { stop, api };
}

nextMap.open = openMap;

ui({
  id: 'worldmap',
  icons: {
    wm_digger: `<rect x="8" y="23" width="15" height="8" rx="3.5" fill="#2f7ab8" ${S}/><g transform="translate(9 -3) scale(0.7)">${pickShape()}</g>${helmet}`,
  },
  css: new URL('./worldmap.css', import.meta.url).href,
  on: {
    modalClosed(d) { if (d.id === 'worldmap') stopActive(); },
  },
});
