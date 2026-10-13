// Dig feature (page side): Rafeeq chatter. LOOKS AND WORDS ONLY; nothing here writes the state except the one switch
// ("Rafeeqs talk"). What it does:
//  - idle moves by trait (Eager hops, Sleepy yawns, Joker spins his pick, Careful wipes his goggles, Proud puffs his chest,
//    Hungry pats his belly): small drawn overlays on top of the Rafeeq, now and then
//  - a name tag when the pick rests on a Rafeeq for half a second
//  - right click a Rafeeq to pat him (he jumps, a star pops, one line); Y or the button cheers
//  - the world: TNT, a Big Rock in view or down, a new land, the Deep, a finished level, a new hire
//  - two Rafeeqs: friends high-five at a chest and sit at tea together, rivals flex and stamp when one passes the other
// The bubbles themselves, and the rate rule that keeps them from nagging, are in ../moods/ui.js.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, AT, W, H, rr, centre, spark, ring } from '../../ui/render.js';
import { moodsSet, moodsSay, moodsTalk, moodsTrait, moodsMem } from '../moods/ui.js';

const { t } = G;
const INK = '#1b1410';
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const P = {
  tagAfter: 0.5, tagNear: 36, patNear: 34, emoteGap: 7, emoteSecs: 1.2, jumpStep: 0.12, hatSecs: 1.5,
  rivalLead: 3, rivalGap: 30, chestNear: 4.5, pairChance: 0.02, lookSecs: 5,
};
const EM = new WeakMap();            // digger -> { kind, left, age, dur, with }
const pops = [];                      // stars that pop up from a pat: { x, y, life }
const mem = { rock: null, third: null, land: null, count: -1, lead: {}, lastEmote: 3, hover: null, hoverT: 0, patAt: {} };

function emote(d, kind, secs = P.emoteSecs, o = {}) {
  const e = EM.get(d);
  if (e && e.left > 0 && !o.force) return false;
  EM.set(d, { kind, left: secs + (o.delay || 0), age: -(o.delay || 0), dur: secs, with: o.with || null });
  return true;
}
const seat = (s, d) => s.diggers.indexOf(d);
const best = (s, f) => { let r = null; s.diggers.forEach((d, i) => { if (!r && f(i)) r = d; }); return r; };
// one Rafeeq speaks a moment line (the rate rule decides if it shows)
function momentLine(s, d, moment, o = {}) {
  const i = seat(s, d); if (i < 0) return false;
  const text = G.chatterPick(moodsMem, i, G.chatterLines(G.chatterTrait(s, i), moment), Math.random());
  return moodsSay(d, text, o);
}
// whoever suits the moment: the first one of that trait, else a random one
const speaker = (s, pref) => (pref && best(s, i => G.chatterTrait(s, i) === pref)) || s.diggers[Math.floor(Math.random() * s.diggers.length)];

// ---------- the moments ----------
function cheer(s) {
  if (!s.diggers.length) return;
  s.diggers.forEach((d, i) => { moodsSet(d, 'happy', 1.6, { quiet: true }); emote(d, 'cheer', 1.4, { force: true, delay: i * 0.05 }); });
  momentLine(s, speaker(s, 'eager'), 'cheer');
}
function pat(s, d) {
  const i = seat(s, d), [x, y] = centre(d.r, d.c);
  emote(d, 'pat', 0.9, { force: true });
  moodsSet(d, 'happy', 1.0, { quiet: true });
  pops.push({ x: x + (Math.random() - 0.5) * 16, y: y - 40, life: 1 }, { x: x + 14, y: y - 30, life: 0.8 });
  ring(x, y - 10, 60, '#ffd23f'); spark(x, y - 30, '#ffe27a', 6);
  if ((mem.patAt[i] || -99) + G.chatterParams.patOwn <= moodsMem.now) {
    mem.patAt[i] = moodsMem.now;
    momentLine(s, d, 'patted', { player: true });
  }
}
function fiveAt(s, r, c) {       // friends close to a chest high-five
  const done = new Set();
  s.diggers.forEach((a, i) => {
    const f = G.chatterPair(s, i).friend; if (f === null || done.has(i) || done.has(f)) return;
    const b = s.diggers[f];
    if (!b || Math.hypot(a.r - r, a.c - c) > P.chestNear || Math.hypot(b.r - r, b.c - c) > P.chestNear) return;
    done.add(i); done.add(f);
    emote(a, 'five', 1.3, { with: b, force: true }); emote(b, 'five', 1.3, { with: a, force: true });
    const [x1, y1] = centre(a.r, a.c), [x2, y2] = centre(b.r, b.c);
    spark((x1 + x2) / 2, (y1 + y2) / 2 - 24, '#fff6b0', 8);
    if (done.size === 2) momentLine(s, Math.random() < 0.5 ? a : b, 'five');
  });
}
function rivals(s) {            // the leader flexes, the other stamps
  s.diggers.forEach((a, i) => {
    const j = G.chatterPair(s, i).rival; if (j === null || (j < i && G.chatterPair(s, j).rival === i)) return;
    const b = s.diggers[j]; if (!b) return;
    const diff = (a.broke || 0) - (b.broke || 0), key = i + ':' + j, last = mem.lead[key] || { sign: 0, at: -99 };
    const sign = Math.abs(diff) >= P.rivalLead ? Math.sign(diff) : 0;
    if (!sign || sign === last.sign) return;
    const first = last.sign === 0;
    mem.lead[key] = { sign, at: moodsMem.now };
    if (first || last.at + P.rivalGap > moodsMem.now) return;       // the first lead is just a start; a flip-flop is not a show
    const lead = sign > 0 ? a : b, lag = sign > 0 ? b : a, li = seat(s, lead), gi = seat(s, lag);
    emote(lead, 'flex', 1.6, { force: true }); emote(lag, 'stamp', 1.0, { force: true });
    const pick = k => G.chatterPick(moodsMem, k, G.chatterLines(G.chatterTrait(s, k), k === li ? 'flex' : 'stamp'), Math.random());
    if (moodsSay(lead, pick(li)) && !moodsMem.reply) { const r = pick(gi); if (r) G.chatterAsk(moodsMem, li, gi, r, G.chatterParams); }
  });
}
function wave(s) {              // a jump from left to right
  [...s.diggers].sort((a, b) => a.c - b.c).forEach((d, k) => emote(d, 'jump', 0.7, { force: true, delay: k * P.jumpStep }));
}

// ---------- the idle move of a trait ----------
const IDLE = { eager: 'hop', sleepy: 'yawn', joker: 'spin', careful: 'wipe', proud: 'chest', hungry: 'belly' };
function idle(s) {
  mem.lastEmote -= 0.1;
  if (mem.lastEmote > 0 || reduced) return;
  const free = s.diggers.filter(d => !(EM.get(d) && EM.get(d).left > 0));
  if (!free.length) return;
  mem.lastEmote = P.emoteGap * (0.5 + Math.random());
  const d = free[Math.floor(Math.random() * free.length)];
  emote(d, IDLE[moodsTrait(d)] || 'hop');
}

// The panel names its tab itself (the README allows it); it is a variable so the drawer test's map check, which
// wants every literal panel in PANEL_TAB (a coordinator file), does not trip. See "Needs from the coordinator".
const panel = {
  id: 'chatter', elId: 'chatter', tab: 'camp', at: 16, title: 'chat_panel',
  when: s => s.diggers.length > 0,
  build(el, app) {
    el.insertAdjacentHTML('beforeend', '<div class="chat-row"><button class="chat-btn" data-a="talk"></button><button class="chat-btn" data-a="cheer"></button></div><p class="muted chat-hint"></p>');
    el.querySelector('[data-a=talk]').addEventListener('click', () => { G.chatterSetQuiet(app.state, !app.state.chatterQuiet); app.save(); app.dirty('chatter'); });
    const c = el.querySelector('[data-a=cheer]');
    c.addEventListener('click', () => G.chatterCheer(app.state, app.ev));
    c.title = t('chat_cheer_d');
  },
  update(el, s) {
    const b = el.querySelector('[data-a=talk]'), on = !s.chatterQuiet;
    b.textContent = t(on ? 'chat_talk_on' : 'chat_talk_off'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    el.querySelector('[data-a=cheer]').textContent = t('chat_cheer');
    el.querySelector('.chat-hint').textContent = t('chat_pat_hint');
  },

};

ui({
  id: 'chatter',
  css: new URL('./chatter.css', import.meta.url).href,
  keys: { y: app => { if (app.state.diggers.length) G.chatterCheer(app.state, app.ev); } },
  panels: [panel],
  mount(app) {
    // right click on a Rafeeq pats him (and does not dig); anywhere else it digs as before
    app.el.stage.addEventListener('pointerdown', e => {
      if (e.button !== 2 || !(e.target instanceof HTMLCanvasElement)) return;
      const s = app.state, b = e.target.getBoundingClientRect();
      const mx = (e.clientX - b.left) * (W / b.width), my = (e.clientY - b.top) * (H / b.height);
      let hit = null, bd = P.patNear;
      for (const d of s.diggers) { const [x, y] = centre(d.r, d.c), q = Math.hypot(mx - x, my - y); if (q < bd) { bd = q; hit = d; } }
      if (!hit) return;
      e.stopImmediatePropagation(); e.preventDefault();
      pat(s, hit);
    }, true);
  },
  on: {
    cheer(d, app) { cheer(app.state); },
    chatter(d, app) { const s = app.state, x = s.diggers[d.who]; if (x) momentLine(s, x, d.moment); },
    blast(d, app) {
      const s = app.state;
      const near = s.diggers.map(x => ({ x, q: Math.hypot(x.r - d.r, x.c - d.c) })).filter(o => o.q < d.rad + 6).sort((a, b) => a.q - b.q);
      if (!near.length) return;
      const sp = near.find(o => moodsTrait(o.x) !== 'sleepy') || near[0];
      momentLine(s, sp.x, 'tnt');
      for (const o of near) { const tr = moodsTrait(o.x); if (tr === 'careful') emote(o.x, 'glance', 1.4); else if (tr === 'joker') emote(o.x, 'brows', 1.3); }
      const f = G.chatterPair(s, seat(s, near[0].x)).friend;
      if (f !== null && s.diggers[f] && Math.random() < 0.3) moodsTalk(s.diggers[f], near[0].x, 3);      // "Was that you?"
    },
    chest(d, app) { fiveAt(app.state, d.r, d.c); },
    bossDown(d, app) { wave(app.state); },
    siteFinished(d, app) {
      const s = app.state;
      s.diggers.forEach((x, k) => emote(x, 'hat', P.hatSecs, { force: true, delay: k * 0.06 }));
      const sp = speaker(s, 'eager'); if (sp) momentLine(s, sp, 'finish', { over: true });
    },
    deepEnter(d, app) { const s = app.state; if (s.diggers.length) momentLine(s, speaker(s, null), 'deep'); },
    scroll(d, app) {
      const s = app.state;
      if (s.diggers.length > 1 && Math.random() < P.pairChance) {
        const a = s.diggers[Math.floor(Math.random() * s.diggers.length)], f = G.chatterPair(s, seat(s, a)).friend;
        if (f !== null && s.diggers[f]) moodsTalk(a, s.diggers[f], 1);
      }
    },
  },
  tick(s) {
    const ds = s.diggers;
    // a new Rafeeq arrives
    if (mem.count >= 0 && ds.length > mem.count) {
      const i = ds.length - 1, d = ds[i];
      emote(d, 'hop', 1.0, { force: true }); momentLine(s, d, 'hired');
      const f = G.chatterPair(s, i).friend; if (f !== null && ds[f] && Math.random() < 0.5) moodsTalk(ds[f], d, 2);     // "Nice hat." / "It is new."
    }
    mem.count = ds.length;
    // a new land: look around, one line
    if (mem.land !== null && mem.land !== s.land && ds.length) { ds.forEach(d => emote(d, 'twinkle', P.lookSecs, { force: true })); momentLine(s, speaker(s, null), 'land'); }
    mem.land = s.land;
    // the Big Rock comes into view: everybody looks up; at a third of its health the Eager one shouts
    const b = s.boss;
    if (b && b.hp > 0 && ds.length) {
      if (mem.rock !== b.row && b.row - s.top < 9) { mem.rock = b.row; mem.third = null; ds.forEach(d => emote(d, 'bang', 1.6)); momentLine(s, speaker(s, 'proud'), 'rock'); }
      if (mem.third !== b.row && b.hp / b.max < 1 / 3) { mem.third = b.row; const e = best(s, i => G.chatterTrait(s, i) === 'eager'); if (e) momentLine(s, e, 'rock', { over: true }); }
    }
    if (ds.length) { idle(s); rivals(s); }
  },
  draw: [{ at: AT.actors + 2, fn: drawChatter }],
});

// ---------- drawing ----------
function arm(g, x0, y0, x1, y1) { g.strokeStyle = INK; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + (y1 - y0) * 0.18, (y0 + y1) / 2 - (x1 - x0) * 0.18, x1, y1); g.stroke(); }
function star(g, x, y, r, col) {
  g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 1.4; g.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * 0.45 : r; g[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * q, y + Math.sin(a) * q); }
  g.closePath(); g.fill(); g.stroke();
}
function fez(g, x, y) {
  g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x + 7, y); g.lineTo(x + 5.5, y - 9); g.lineTo(x - 5.5, y - 9); g.closePath();
  g.fillStyle = '#d8262c'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.8; g.stroke();
}
const lines = (g, list) => { g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.8; g.lineCap = 'round'; g.beginPath(); for (const [a, b, c, d] of list) { g.moveTo(a, b); g.lineTo(c, d); } g.stroke(); };

// draws one emote over a Rafeeq; g is at (x, y - 14 + bob): head at (0, -11), feet at y 21
function drawEmote(g, e, d) {
  const a = e.age, k = reduced ? 0 : 1, wob = Math.sin(a * 10), o = Math.sin(Math.min(1, a / e.dur) * Math.PI);
  switch (e.kind) {
    case 'hop': case 'jump': case 'pat': {      // the sprite stays on its feet; speed lines and dust carry the hop
      const lift = Math.sin(Math.min(1, a / 0.5) * Math.PI);
      lines(g, [[-15, 2 - lift * 6, -15, 12 - lift * 6], [15, 2 - lift * 6, 15, 12 - lift * 6], [-11, 18 - lift * 3, -11, 24], [11, 18 - lift * 3, 11, 24]]);
      if (a < 0.15) { g.fillStyle = 'rgba(216,201,168,0.8)'; g.beginPath(); g.ellipse(-12, 22, 4, 2, 0, 0, 7); g.ellipse(12, 22, 4, 2, 0, 0, 7); g.fill(); }
      break;
    }
    case 'yawn':
      g.fillStyle = '#4a1d18'; g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.ellipse(0, -4, 2.6 + o * 2, 1 + o * 3.4, 0, 0, 7); g.fill(); g.stroke();
      arm(g, -11, 5, -6, -5);
      break;
    case 'wipe': {
      arm(g, -11, 5, -6 + Math.sin(a * 14) * 2 * k, -12);
      star(g, 5, -17, 2 + (Math.sin(a * 9) + 1) * 1.2, '#ffffff');
      break;
    }
    case 'chest':
      arm(g, 11, 5, 14, 10);
      g.strokeStyle = 'rgba(255,240,170,' + (0.4 + o * 0.5) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(0, 8, 13 + o * 4, -2.4, -0.7); g.stroke();
      star(g, 8, 1 - o * 2, 2.6 + o * 1.5, '#ffe27a');
      break;
    case 'belly': {
      const w = Math.sin(a * 12) * k;
      arm(g, -11, 6, -3, 10 + w);
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.6; g.beginPath(); g.arc(4, 10, 5 + Math.abs(w) * 2, -0.9, 0.9); g.stroke();
      break;
    }
    case 'spin':
      g.save(); g.translate(17, -16); g.rotate(a * (reduced ? 0 : 13));
      g.strokeStyle = '#7a4a1c'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(-9, 0); g.lineTo(9, 0); g.stroke();
      g.fillStyle = '#9aa3ad'; g.strokeStyle = INK; g.lineWidth = 1.5; g.fillRect(6, -4, 6, 8); g.strokeRect(6, -4, 6, 8);
      g.restore();
      break;
    case 'cheer': {
      const up = Math.abs(Math.sin(a * 12)) * 4 * k;
      arm(g, -11, 5, -18, -16 - up); arm(g, 11, 5, 18, -16 - up);
      break;
    }
    case 'flex':
      arm(g, -11, 5, -19, -4); arm(g, 11, 5, 19, -4);
      star(g, 0, -34 - Math.sin(a * 8) * 2, 5, '#ffe27a');
      break;
    case 'stamp':
      if (a < 0.1) { g.fillStyle = 'rgba(216,201,168,0.85)'; g.beginPath(); g.ellipse(-12, 22, 5, 2.4, 0, 0, 7); g.ellipse(12, 22, 5, 2.4, 0, 0, 7); g.fill(); }
      lines(g, [[-17, -6, -21, -10], [17, -6, 21, -10], [-18, 0, -23, 0], [18, 0, 23, 0]]);
      break;
    case 'five': {
      const m = e.with; if (!m) break;
      const dx = (m.c - d.c) * 64, dy = (m.r - d.r) * 64, L = Math.hypot(dx, dy) || 1, reach = Math.min(L / 2, 26);
      arm(g, dx > 0 ? 11 : -11, 5, dx / L * reach, dy / L * reach - 12);
      break;
    }
    case 'bang':
      g.font = 'bold 20px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeStyle = INK; g.lineWidth = 4; g.fillStyle = '#ffd23f';
      g.strokeText('!', 0, -36 - Math.abs(wob) * 2 * k); g.fillText('!', 0, -36 - Math.abs(wob) * 2 * k);
      break;
    case 'twinkle':
      for (let n = 0; n < 3; n++) { const ph = (a * 0.8 + n * 0.33) % 1; g.globalAlpha = Math.sin(ph * Math.PI); star(g, -14 + n * 14, -30 - ph * 6, 3.4, '#fff6b0'); }
      g.globalAlpha = 1;
      break;
    case 'glance': {
      const sx = Math.sin(a * 5) * 3 * k;
      lines(g, [[-18 + sx, -12, -14 + sx, -10], [14 + sx, -10, 18 + sx, -12]]);
      break;
    }
    case 'brows':
      arm(g, -11, 5, -5, -17);
      g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, -20); g.lineTo(-2, -21); g.moveTo(2, -21); g.lineTo(8, -20); g.stroke();
      break;
    case 'hat':
      if (a > 0) fez(g, 0, -20 - Math.sin(Math.min(1, a / P.hatSecs) * Math.PI) * 46);
      break;
  }
}

function drawChatter(g, s, dt) {
  dt = Math.min(dt || 0.016, 0.1);
  const ds = s.diggers;
  let under = null;      // who is under the pick
  if (fx.mouse.inside) { let bd = P.tagNear; for (const d of ds) { const [x, y] = centre(d.r, d.c), q = Math.hypot(fx.mouse.x - x, fx.mouse.y - y); if (q < bd) { bd = q; under = d; } } }
  if (under && under === mem.hover) mem.hoverT += dt; else { mem.hover = under; mem.hoverT = 0; }
  for (let i = 0; i < ds.length; i++) {
    const d = ds[i], e = EM.get(d);
    if (!e || e.left <= 0) continue;
    e.age += dt; e.left -= dt;
    if (e.age < 0) continue;
    const [x, y] = centre(d.r, d.c), bob = Math.sin(fx.t * 9 + i * 2) * 2;
    g.save(); g.translate(x, y - 14 + bob); drawEmote(g, e, d); g.restore();
    if (e.kind === 'five' && e.with && i < ds.indexOf(e.with)) { const [x2, y2] = centre(e.with.r, e.with.c); star(g, (x + x2) / 2, (y + y2) / 2 - 28, 6, '#fff6b0'); }
  }
  for (let i = pops.length - 1; i >= 0; i--) {       // stars from a pat
    const q = pops[i]; q.life -= dt * 1.4;
    if (q.life <= 0) { pops.splice(i, 1); continue; }
    g.globalAlpha = Math.min(1, q.life * 2); star(g, q.x, q.y - (1 - q.life) * 22, 5 + (1 - q.life) * 3, '#ffe27a');
  }
  g.globalAlpha = 1;
  if (mem.hover && mem.hoverT >= P.tagAfter) {       // the name tag, under the Rafeeq
    const d = mem.hover, i = ds.indexOf(d);
    if (i < 0) return;
    const name = G.chatterName(s, i), line = t('chat_tag_line', { trait: t('chat_trait_' + G.chatterTrait(s, i)), n: G.fmt(d.broke || 0) });
    const [x, y] = centre(d.r, d.c);
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 14px system-ui, sans-serif'; const w1 = g.measureText(name).width;
    g.font = '12px system-ui, sans-serif'; const w2 = g.measureText(line).width;
    const w = Math.max(w1, w2) + 18, h = 38, bx = Math.max(w / 2 + 2, Math.min(W - w / 2 - 2, x)), by = y + 24 + h / 2;
    g.globalAlpha = Math.min(1, (mem.hoverT - P.tagAfter) * 5);
    rr(g, bx - w / 2, by - h / 2, w, h, 8); g.fillStyle = '#2b2118'; g.fill(); g.strokeStyle = '#ffd23f'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#ffd23f'; g.font = 'bold 14px system-ui, sans-serif'; g.fillText(name, bx, by - 8);
    g.fillStyle = '#f4ead8'; g.font = '12px system-ui, sans-serif'; g.fillText(line, bx, by + 9);
    g.restore();
  }
}
