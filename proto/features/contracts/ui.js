// Dig feature (page side): the Contract board, the goal and rule always on screen, the stamp,
// the looks (pick skins, Rafeeq hats) and the little moments (sand refills, glass cracks, ore thrown at the Rock).
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, AT, CELL, W, SKY, rr, centre, yOf, ring, spark, shake, screenFlash, debris } from '../../ui/render.js';
import { sfx, gap, tone, noise } from '../../ui/audio.js';
import { icon, badge, S, star } from '../../ui/icons.js';

const { t } = G;

// ---------- icons: a medal per contract, drawn ----------
const medal = (col, inner) => badge(col, inner);
const ICONS = {
  contracts: medal('#7a5a1a', `${star(16, 14, 9, 4, 5, '#ffd23f')}<path d="M10 22 L8 30 L16 26 L24 30 L22 22" fill="#d7332b" ${S}/>`),
  c_bare: medal('#2f8f5b', `<circle cx="16" cy="13" r="6" fill="#f8d9b0" ${S}/><path d="M7 28 Q16 14 25 28 Z" fill="#3b82f6" ${S}/><path d="M6 6 L26 26" stroke="#e5533d" stroke-width="3" stroke-linecap="round"/>`),
  c_dark: medal('#14101c', `<circle cx="16" cy="16" r="5" fill="#ffe9a8"/><circle cx="16" cy="16" r="10" fill="none" stroke="#ffe9a8" stroke-width="1.5" stroke-dasharray="2 3"/>`),
  c_rising: medal('#a8672c', `<path d="M3 24 Q9 14 16 21 Q23 12 29 24 V30 H3 Z" fill="#e0b467" ${S}/><path d="M16 4 V14 M12 8 L16 4 L20 8" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  c_tntOnly: medal('#7a2a1f', `<rect x="8" y="10" width="7" height="16" rx="2" fill="#d7332b" ${S}/><rect x="17" y="10" width="7" height="16" rx="2" fill="#d7332b" ${S}/><path d="M12 10 Q14 4 18 5" stroke="#ffe14a" stroke-width="2" fill="none"/>`),
  c_glass: medal('#2b6cb0', `<path d="M9 24 L21 10" stroke="#1b1410" stroke-width="5" stroke-linecap="round"/><path d="M12 7 Q22 6 26 16" fill="none" stroke="#bfefff" stroke-width="3.4" stroke-linecap="round"/><path d="M20 8 L18 13 L22 14" stroke="#fff" stroke-width="1.4" fill="none"/>`),
  c_oneRelic: medal('#5b3a8a', `<path d="M16 5 L19 13 H27 L21 18 L23 27 L16 22 L9 27 L11 18 L5 13 H13 Z" fill="#9be7ff" ${S}/>`),
  c_richLazy: medal('#2f8f5b', `<circle cx="16" cy="16" r="9" fill="#ffd23f" stroke="#7a5a00" stroke-width="2"/><path d="M11 17 Q16 21 21 17" stroke="#7a5a00" stroke-width="2" fill="none"/><path d="M11 13 H14 M18 13 H21" stroke="#7a5a00" stroke-width="2"/>`),
  c_feedRock: medal('#4b4460', `<path d="M4 28 L8 12 L16 6 L25 11 L28 28 Z" fill="#6a6384" ${S}/><circle cx="9" cy="8" r="3" fill="#e0894a" ${S}/><path d="M12 9 Q17 7 19 12" stroke="#fff" stroke-width="1.4" fill="none"/>`),
  c_dry: medal('#3d2a1a', `<rect x="6" y="14" width="20" height="12" rx="2" fill="#8a4b1c" ${S}/><path d="M5 5 L27 27 M27 5 L5 27" stroke="#e5533d" stroke-width="3" stroke-linecap="round"/>`),
  c_blindAlone: medal('#14101c', `<circle cx="16" cy="15" r="6" fill="#f8d9b0" ${S}/><rect x="9" y="12" width="14" height="5" rx="2" fill="#111"/><path d="M7 29 Q16 18 25 29" fill="#3b82f6" ${S}/>`),
};

// ---------- looks ----------
const PICK_HEAD = { gold: ['#ffd23f', '#fff3a8'], glass: ['#bfefff', '#ffffff'] };
function drawSkin(g, s) {
  const sk = PICK_HEAD[s.contractLook && s.contractLook.skin];
  if (!sk || !fx.mouse.inside) return;
  const k = fx.swingT;
  g.save(); g.translate(fx.mouse.x + 14, fx.mouse.y - 12);
  g.rotate(0.5 - k * 1.3);
  const sc = fx.swingCrit && k > 0 ? 1.25 : 1; g.scale(sc, sc);
  g.lineCap = 'round';
  g.strokeStyle = '#111'; g.lineWidth = 10; g.beginPath(); g.moveTo(4, -40); g.quadraticCurveTo(30, -40, 42, -16); g.stroke();
  g.strokeStyle = sk[0]; g.lineWidth = 6; g.beginPath(); g.moveTo(4, -40); g.quadraticCurveTo(30, -40, 42, -16); g.stroke();
  const tw = Math.sin(fx.t * 6) * 0.5 + 0.5;
  g.strokeStyle = sk[1]; g.globalAlpha = 0.5 + tw * 0.5; g.lineWidth = 2; g.beginPath(); g.moveTo(10, -40); g.quadraticCurveTo(28, -41, 38, -26); g.stroke();
  g.globalAlpha = 1; g.restore();
}
// (the Rafeeq hats are worn through the wardrobe feature now: drawRafeeq draws them)

// ore thrown at the Rock
const flying = [];
function drawFlying(g, s, dt) {
  for (let i = flying.length - 1; i >= 0; i--) {
    const f = flying[i];
    f.t += dt / f.life;
    if (f.t >= 1) { ring(f.x1, f.y1, CELL * 0.8, f.col); spark(f.x1, f.y1, f.col, 8); shake(0.12); flying.splice(i, 1); continue; }
    const x = f.x0 + (f.x1 - f.x0) * f.t, y = f.y0 + (f.y1 - f.y0) * f.t - Math.sin(f.t * Math.PI) * 70;
    g.fillStyle = '#111'; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill();
    g.fillStyle = f.col; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(x - 2, y - 2, 2.5, 0, 7); g.fill();
  }
}
const ORE_COL = { copper: '#e0894a', silver: '#dfe7ee', gold: '#ffd23f', gem: '#7ee8ff' };

// ---------- the board ----------
function openBoard(app) {
  const s = app.state;
  if (app.modal.id) return;
  const m = app.modal.open('contracts', `<div class="card board"><h2></h2><p class="more sub"></p><div class="list"></div><div class="looks"></div><p class="more"><button class="ghost close"></button></p></div>`);
  if (!m) return;
  m.querySelector('h2').textContent = t('board_title');
  m.querySelector('.sub').textContent = G.canNewSite(s) ? t('board_sub') : t('board_need_rock');
  const close = m.querySelector('.close'); close.textContent = t('board_close'); close.addEventListener('click', () => app.modal.close());
  const list = m.querySelector('.list');
  let lastTier = 0;
  for (const C of G.contractList()) {
    if (C.tier !== lastTier) {
      lastTier = C.tier;
      const h = document.createElement('div');
      const open = G.tierOpen(s, C.tier);
      h.className = 'tier' + (open ? '' : ' locked');
      h.textContent = t('tier_' + C.tier) + (open ? '' : ' - ' + t('tier_locked', { n: G.tierNeed(C.tier) }));
      list.appendChild(h);
    }
    const st = G.contractState(s, C.id);
    const row = document.createElement('div');
    row.className = 'cc ' + st;
    row.innerHTML = `<span class="ic">${icon('c_' + C.id, 40)}</span><span><b></b><span class="d"></span><span class="p"></span><span class="s"></span></span><span class="act"></span>`;
    row.querySelector('b').textContent = t('c_' + C.id);
    row.querySelector('.d').textContent = t('c_' + C.id + '_d');
    row.querySelector('.p').textContent = t('board_prize', { text: t('c_' + C.id + '_p') });
    row.querySelector('.s').textContent = t('board_site', { name: t('site_' + G.contractSite(s, C)) });
    const act = row.querySelector('.act');
    if (st === 'won') { act.className = 'act stamp'; act.textContent = t('board_won'); }
    else if (st === 'open') {
      const b = document.createElement('button'); b.className = 'primary'; b.textContent = t('board_take'); b.disabled = !G.canNewSite(s);
      b.addEventListener('click', () => { app.modal.close(); if (G.startContract(app.state, C.id, app.ev)) { app.save(); app.refresh(true); } });
      act.appendChild(b);
    }
    list.appendChild(row);
  }
  // looks: only what you won
  const looks = m.querySelector('.looks');
  const co = G.cosmetics(), mine = Object.values(co).filter(c => G.ownsCosmetic(s, c.id));
  for (const slot of ['skin']) {         // the hats are chosen in the Rafeeqs tab (wardrobe)
    const own = mine.filter(c => c.slot === slot);
    if (!own.length) continue;
    const lab = document.createElement('b'); lab.textContent = t('look_' + slot); looks.appendChild(lab);
    for (const id of ['', ...own.map(c => c.id)]) {
      const b = document.createElement('button'); b.className = 'ghost' + ((s.contractLook[slot] || '') === id ? ' on' : '');
      b.textContent = id ? t('look_' + id) : t('look_none');
      b.addEventListener('click', () => { G.equip(app.state, slot, id); app.save(); app.modal.close(); openBoard(app); });
      looks.appendChild(b);
    }
  }
}

function arrive(app) {
  if (app.modal.id) { setTimeout(() => arrive(app), 1500); return; }
  const m = app.modal.open('contractsArrive', `<div class="card arrive"><div class="big"></div><h2></h2><p class="more"></p><p class="more"><button class="primary go"></button> <button class="ghost later"></button></p></div>`);
  if (!m) return;
  m.querySelector('.big').innerHTML = icon('contracts', 96);
  m.querySelector('h2').textContent = t('arrive_title');
  m.querySelector('.more').textContent = t('arrive_d');
  const go = m.querySelector('.go'), later = m.querySelector('.later');
  go.textContent = t('arrive_btn'); later.textContent = t('arrive_later');
  later.addEventListener('click', () => app.modal.close());
  go.addEventListener('click', () => { app.modal.close(); openBoard(app); });
  sfx.stamp();
}

const aimOf = () => (fx.mouse.inside ? fx.target : null);
let hud = null;

ui({
  id: 'contracts',
  css: new URL('./contracts.css', import.meta.url).href,
  icons: ICONS,
  sfx: {
    stamp() { if (!gap('stamp', 0.3)) return; tone(110, { type: 'square', d: 0.12, vol: 0.25, slide: 60 }); noise({ d: 0.12, vol: 0.25, from: 1500, to: 200 }); [523, 659, 784, 1047].forEach((f, i) => tone(f, { type: 'triangle', d: 0.25, vol: 0.16, at: 0.15 + i * 0.08 })); },
    glass() { if (!gap('glass', 0.2)) return; noise({ d: 0.25, vol: 0.2, from: 9000, to: 2500, type: 'highpass' }); tone(2400, { d: 0.12, vol: 0.1, slide: 600 }); },
    sand() { if (!gap('sand', 0.5)) return; noise({ d: 0.6, vol: 0.3, from: 2500, to: 300 }); tone(90, { d: 0.5, vol: 0.2, slide: 40 }); },
    throwOre() { if (!gap('throwOre', 0.08)) return; tone(520, { type: 'square', d: 0.1, vol: 0.06, slide: 900 }); },
  },
  draw: [
    { at: AT.fx + 5, fn: drawFlying },
    { at: AT.pick + 1, fn: (g, s) => drawSkin(g, s) },
  ],
  goal: { at: 5, fn(s) {
    const g = G.contractGoal(s);
    if (!g) return null;
    const C = G.CONTRACTS[g.id], name = t('c_' + g.id);
    const text = C.goalText ? C.goalText(s, g) : t('goal_' + (g.kind === 'depth' || g.kind === 'rocks' ? g.kind : 'count'), { name, now: g.now, of: g.of });
    return { text, frac: g.of ? g.now / g.of : 0, cls: 'contract' };
  } },
  mount(app) {
    hud = document.createElement('div'); hud.id = 'cn-hud'; hud.hidden = true;
    hud.innerHTML = '<b></b><span class="rule"></span><span class="count"></span>';
    app.el.stage.appendChild(hud);
  },
  tick(s, app) {
    s.contractAim = aimOf();
    const g = G.contractGoal(s);
    hud.hidden = !g;
    if (!g) return;
    hud.querySelector('b').textContent = t('c_' + g.id);
    hud.querySelector('.rule').textContent = t('c_' + g.id + '_d');
    const P = G.PARAMS.contracts;
    let count = '';
    if (g.id === 'rising') count = t('hud_rise', { n: Math.max(0, P.riseBreaks - s.contractRun.n) });
    else if (g.id === 'glass') count = t('hud_glass', { n: P.glassEvery - (s.hits % P.glassEvery) });
    hud.querySelector('.count').textContent = count;
  },
  on: {
    contractsOpen(d, app) { setTimeout(() => arrive(app), 3900); },
    contractTier(d, app) { app.toast(t('tier_up', { n: d.tier }), 'gold'); sfx.stamp(); },
    contractStart(d, app) { screenFlash('#000', 0.5); app.banner(t('c_' + d.id), t('c_' + d.id + '_d')); },
    contractDone(d, app) {
      sfx.stamp(); shake(0.8); screenFlash('#fff', 0.5); app.hitStop(0.1);
      app.banner(t('won_title'), t('c_' + d.id) + (d.stars ? '  ' + t('won_stars', { n: d.stars }) : ''));
      const x = W / 2, y = SKY + 200; ring(x, y, W * 0.6, '#59d37a'); ring(x, y, W * 0.4, '#ffd23f'); spark(x, y, '#ffd23f', 40);
      app.dirty('contracts');
      if (d.board) setTimeout(() => { if (!app.modal.id) openBoard(app); }, 2200);   // the next contract (or Next site) can be taken at once
    },
    contractLeft(d, app) { app.toast(t('left_toast')); app.dirty('contracts'); },
    contractNote(d, app) { app.toast(t('note_' + d.key)); },
    sandFill(d, app) {
      sfx.sand(); shake(0.7); screenFlash('#e0b467', 0.55); app.toast(t('sand_fill'), 'gold'); fx.cam = 0;
      for (let c = 0; c < G.COLS; c++) debris(0, c, '#e0b467', 8, 1.4);
    },
    glassBreak(d, app) {
      sfx.glass(); shake(0.4); screenFlash('#bfefff', 0.35); app.toast(t('glass_break'));
      const [x, y] = [fx.mouse.x, fx.mouse.y]; spark(x, y, '#bfefff', 24); spark(x, y, '#ffffff', 10);
    },
    feed(d, app) {
      const [x0, y0] = centre(d.r, d.c), x1 = d.col * CELL + CELL / 2, y1 = yOf(d.to) + CELL / 2;
      const ore = G.cellAt(app.state, d.r, d.c);
      flying.push({ x0, y0, x1, y1, t: 0, life: 0.45, col: d.w >= 8 ? ORE_COL.gem : d.w >= 4 ? ORE_COL.gold : d.w >= 2 ? ORE_COL.silver : ORE_COL.copper });
      sfx.throwOre(); void ore;
    },
  },
  panels: [{
    id: 'contracts', elId: 'contracts', side: 'left', at: 35, title: 'contracts', live: true,
    when: s => G.contractsOpen(s),
    build(el, app) {
      el.insertAdjacentHTML('beforeend', `<p id="cp-now"></p><p class="muted" id="cp-wins"></p><button id="cp-board" class="primary"></button><button id="cp-leave" class="ghost"></button><p class="muted" id="cp-leave-d"></p><button id="cp-follow" class="ghost" hidden></button>`);
      el.querySelector('#cp-board').addEventListener('click', () => { app.unlockAudio(); openBoard(app); });
      el.querySelector('#cp-leave').addEventListener('click', () => { G.leaveContract(app.state, app.ev); app.save(); app.refresh(true); });
      el.querySelector('#cp-follow').addEventListener('click', () => { const s = app.state; s.crewJob = s.crewJob === 'aimed' ? 'nearest' : 'aimed'; app.save(); });
    },
    update(el, s) {
      const all = G.contractList();
      el.classList.toggle('ready', G.canNewSite(s) && !s.contract);
      el.querySelector('#cp-now').textContent = s.contract ? t('cp_now', { name: t('c_' + s.contract) }) : t('cp_none');
      el.querySelector('#cp-wins').textContent = t('cp_wins', { n: all.filter(c => s.contractsWon[c.id]).length, m: all.length });
      el.querySelector('#cp-board').textContent = t('cp_board');
      const lv = el.querySelector('#cp-leave'); lv.hidden = !s.contract; lv.textContent = t('cp_leave');
      el.querySelector('#cp-leave-d').textContent = s.contract ? t('cp_leave_d') : '';
      const f = el.querySelector('#cp-follow');
      f.hidden = !s.contractsWon.richLazy || s.contract === 'richLazy';
      f.textContent = t(s.crewJob === 'aimed' ? 'cp_follow_on' : 'cp_follow_off');
      f.classList.toggle('on', s.crewJob === 'aimed');
    },
  }],
});
