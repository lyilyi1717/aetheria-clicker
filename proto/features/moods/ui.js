// Dig feature (page side): Rafeeq moods. LOOKS ONLY: it reads the state and the events, draws a face and
// props over each Rafeeq, and never writes to the state. Mood state lives here, per Rafeeq (a WeakMap).
// The diggers feature draws the body and the pick; a mood paints over the face (same bob) and adds
// arms, props, puffs and a speech bubble. It cannot make the body itself sit or hop (see the PR).
// Other features: `moodsPoke` in ./rules.js, or `app.fire('mood', { mood, r, c })`.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, AT, W, rr, centre } from '../../ui/render.js';

const { t } = G;

// pr: a stronger mood replaces a weaker one; secs: how long it lasts
const MOODS = {
  sooty: { pr: 6, secs: 5 }, dizzy: { pr: 5, secs: 3 }, scared: { pr: 5, secs: 1.6 }, kick: { pr: 4, secs: 0.9 },
  angry: { pr: 3, secs: 0.9 }, proud: { pr: 3, secs: 3 }, rich: { pr: 3, secs: 1.4 }, happy: { pr: 3, secs: 1.1 },
  laugh: { pr: 3, secs: 2.2 }, guilty: { pr: 3, secs: 1.6 }, cold: { pr: 2, secs: 4 }, wet: { pr: 2, secs: 4 },
  tea: { pr: 1, secs: 6 }, doze: { pr: 1, secs: 6 },
};
const P = { bubbleGap: 4, bubbleOwn: 14, bubbleChance: 0.55, slackGap: 18, laughGap: 30, near: 2.2, pickNear: 75, hitsToKick: 24 };
const SKIN = '#f8d9b0';
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const MS = new WeakMap();           // digger -> { mood, left, age, bubble, bubbleLeft, ownCool, blk, hits, with }
const puffs = [];                   // { x, y, vx, vy, life, col } steam and smoke, world px
const counters = { globalBubble: 0, slack: 6, laugh: 4 };
export const moodStats = {};        // how often each mood showed

const st = d => {
  let m = MS.get(d);
  if (!m) { m = { mood: null, left: 0, age: 0, bubble: null, bubbleLeft: 0, ownCool: 3 + Math.random() * 8, blk: '', hits: 0, with: null }; MS.set(d, m); }
  return m;
};

function say(m, key, force) {
  if (!force && (counters.globalBubble > 0 || m.ownCool > 0 || Math.random() > P.bubbleChance)) return;
  const n = Number(t('m_' + key + '_n'));
  if (!n) return;
  m.bubble = t('m_' + key + '_' + Math.floor(Math.random() * n));
  m.bubbleLeft = 1.9; m.ownCool = P.bubbleOwn; counters.globalBubble = P.bubbleGap;
}

export function moodsSet(d, mood, secs, opts = {}) {
  const def = MOODS[mood]; if (!def) return false;
  const m = st(d);
  if (m.mood && MOODS[m.mood].pr > def.pr) return false;
  if (m.mood === mood) { m.left = Math.max(m.left, secs || def.secs); return true; }
  m.mood = mood; m.left = secs || def.secs; m.age = 0; m.with = opts.with || null;
  moodStats[mood] = (moodStats[mood] || 0) + 1;
  say(m, mood === 'happy' && opts.rich ? 'rich' : mood, opts.say);
  return true;
}

function nearest(s, r, c, within = 99) {
  let best = null, bd = within;
  for (const d of s.diggers) { const q = Math.hypot(d.r - r, d.c - c); if (q < bd) { bd = q; best = d; } }
  return best;
}
const ORE = new Set(['copper', 'silver', 'gold', 'gem']);

ui({
  id: 'moods',
  on: {
    mood(d, app) {
      const s = app.state, o = { say: true };
      if (d.who !== undefined) { const x = s.diggers[d.who]; if (x) moodsSet(x, d.mood, d.secs, o); }
      else if (d.r !== undefined) { const x = nearest(s, d.r, d.c); if (x) moodsSet(x, d.mood, d.secs, o); }
      else for (const x of s.diggers) moodsSet(x, d.mood, d.secs);
    },
    hit(d, app) {
      if (d.src !== 'crew') return;
      const x = nearest(app.state, d.r, d.c, 1.6); if (!x) return;
      const m = st(x);
      if (d.t === 'hard' || d.t === 'boss') {
        const key = d.r + ':' + d.c;
        if (m.blk !== key) { m.blk = key; m.hits = 0; }
        if (++m.hits >= P.hitsToKick) { m.hits = 0; moodsSet(x, 'kick'); } else moodsSet(x, 'angry');
      } else m.blk = '';
    },
    break(d, app) {
      if (d.src !== 'crew') return;
      const x = nearest(app.state, d.r, d.c, 1.8); if (!x) return;
      if (d.t === 'gold' || d.t === 'gem') moodsSet(x, 'happy', 1.6, { rich: true });
      else if (ORE.has(d.t) || d.t === 'chest' || d.t === 'tnt') moodsSet(x, 'happy');
    },
    chest(d, app) { const x = nearest(app.state, d.r, d.c); if (x) moodsSet(x, 'happy', 1.6); },
    blast(d, app) {
      const s = app.state; let sooty = null;
      for (const x of s.diggers) if (Math.abs(x.r - d.r) <= d.rad + 0.6 && Math.abs(x.c - d.c) <= d.rad + 0.6) { if (moodsSet(x, 'sooty')) sooty = x; }
      if (!sooty) return;
      let n = 0;     // the others laugh at him
      for (const x of s.diggers) if (x !== sooty && st(x).mood !== 'sooty' && n++ < 3) moodsSet(x, 'laugh', 2.6, { with: sooty });
    },
    gusher(d, app) { const x = nearest(app.state, d.r, d.c, 3); if (x) moodsSet(x, 'dizzy'); },
    bossDown(d, app) { for (const x of app.state.diggers) moodsSet(x, 'proud'); },
  },
  draw: [{ at: AT.actors + 1, fn: drawMoods }],
  tick(s) {
    // every 0.1 s: the chance things (slacking, laughing together, scared of the Big Rock)
    const ds = s.diggers; if (!ds.length) return;
    const boss = s.boss && s.boss.hp > 0 ? s.boss.row : -1;
    for (const d of ds) {
      const m = st(d);
      if (boss >= 0 && !m.mood && Math.abs(d.r - boss) < 1.7 && Math.random() < 0.02) moodsSet(d, 'scared');
      if (m.mood === 'tea' || m.mood === 'doze') {      // caught by the pick
        const [x, y] = centre(d.r, d.c);
        if (fx.mouse.inside && Math.hypot(fx.mouse.x - x, fx.mouse.y - y) < P.pickNear) { m.mood = null; moodsSet(d, 'guilty', null, { say: true }); }
      }
    }
    if (counters.slack <= 0) {
      const free = ds.filter(d => !st(d).mood && d.tr >= 0);
      if (free.length && Math.random() < 0.05) { counters.slack = P.slackGap; moodsSet(free[Math.floor(Math.random() * free.length)], Math.random() < 0.6 ? 'tea' : 'doze'); }
    }
    if (counters.laugh <= 0 && ds.length > 1) {
      for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) {
        const a = ds[i], b = ds[j];
        if (!st(a).mood && !st(b).mood && Math.hypot(a.r - b.r, a.c - b.c) < P.near && Math.random() < 0.15) {
          counters.laugh = P.laughGap; moodsSet(a, 'laugh', null, { with: b }); moodsSet(b, 'laugh', null, { with: a }); return;
        }
      }
    }
  },
});

// ---------- drawing ----------

function arc(g, x, y, r, a0, a1) { g.beginPath(); g.arc(x, y, r, a0, a1); }
function eyes(g, kind, tt) {
  g.fillStyle = '#111'; g.strokeStyle = '#111'; g.lineWidth = 1.8; g.lineCap = 'round';
  for (const ex of [-4, 4]) {
    if (kind === 'closed') { arc(g, ex, -9, 2.4, 0.15, Math.PI - 0.15); g.stroke(); }
    else if (kind === 'happy') { arc(g, ex, -8, 2.6, Math.PI + 0.3, -0.3); g.stroke(); }
    else if (kind === 'wide') { g.fillStyle = '#fff'; arc(g, ex, -9, 3.4, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#111'; arc(g, ex, -9, 1.3, 0, 7); g.fill(); }
    else if (kind === 'coin') { g.fillStyle = '#ffd23f'; arc(g, ex, -9, 3.6, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#b8860b'; g.fillRect(ex - 0.6, -11, 1.2, 4); }
    else if (kind === 'spiral') { g.beginPath(); for (let a = 0; a < 12; a += 0.4) { const rad = 0.4 + a * 0.28, px = ex + Math.cos(a + tt * 6) * rad, py = -9 + Math.sin(a + tt * 6) * rad; if (a) g.lineTo(px, py); else g.moveTo(px, py); } g.lineWidth = 1.2; g.stroke(); g.lineWidth = 1.8; }
    else if (kind === 'white') { g.fillStyle = '#fff'; arc(g, ex, -9, 3.3, 0, 7); g.fill(); }
    else if (kind === 'angry') { arc(g, ex, -8, 1.8, 0, 7); g.fill(); g.beginPath(); g.moveTo(ex - Math.sign(ex) * 4, -13.5); g.lineTo(ex + Math.sign(ex) * 1, -10.5); g.lineWidth = 2.4; g.stroke(); g.lineWidth = 1.8; }
    else { arc(g, ex, -9, 1.6, 0, 7); g.fill(); }
  }
}
function mouth(g, kind) {
  g.strokeStyle = '#111'; g.fillStyle = '#7a1c1c'; g.lineWidth = 1.8;
  if (kind === 'smile') { arc(g, 0, -5, 4, 0.15, Math.PI - 0.15); g.stroke(); }
  else if (kind === 'open') { arc(g, 0, -5.5, 4, 0, Math.PI); g.closePath(); g.fill(); g.stroke(); }
  else if (kind === 'grit') { g.fillStyle = '#fff'; g.fillRect(-4.5, -6.5, 9, 3.6); g.strokeRect(-4.5, -6.5, 9, 3.6); g.beginPath(); g.moveTo(-1.5, -6.5); g.lineTo(-1.5, -2.9); g.moveTo(1.5, -6.5); g.lineTo(1.5, -2.9); g.stroke(); }
  else if (kind === 'flat') { g.beginPath(); g.moveTo(-3, -4); g.lineTo(3, -4); g.stroke(); }
  else if (kind === 'wavy') { g.beginPath(); g.moveTo(-4, -4); g.quadraticCurveTo(-2, -6.5, 0, -4); g.quadraticCurveTo(2, -1.5, 4, -4); g.stroke(); }
  else if (kind === 'o') { arc(g, 0, -4, 2, 0, 7); g.fill(); g.stroke(); }
}
function cup(g, x, y) {
  g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(x - 5, y - 6); g.lineTo(x + 5, y - 6); g.lineTo(x + 3.5, y + 3); g.lineTo(x - 3.5, y + 3); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#a8672c'; g.fillRect(x - 4, y - 5, 8, 2.4);
  g.beginPath(); g.moveTo(x + 5, y - 4); g.quadraticCurveTo(x + 9, y - 2, x + 4, y + 1); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.6;
  const w = reduced ? 0 : Math.sin(fx.t * 4) * 1.5;
  g.beginPath(); g.moveTo(x - 2, y - 8); g.quadraticCurveTo(x - 4 + w, y - 12, x - 2, y - 15); g.moveTo(x + 2, y - 8); g.quadraticCurveTo(x + 4 - w, y - 12, x + 2, y - 15); g.stroke();
}
function arm(g, x0, y0, x1, y1) { g.strokeStyle = '#111'; g.lineWidth = 5.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = SKIN; g.lineWidth = 3; g.stroke(); }
function puff(x, y, col, vx = 0, vy = -26) { if (reduced || puffs.length > 24) return; puffs.push({ x, y, vx: vx + (Math.random() - 0.5) * 14, vy, life: 0.9, col }); }

function bubble(g, x, y, str, alpha) {
  g.save(); g.globalAlpha = alpha; g.font = 'bold 14px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(str).width + 16, h = 24;
  const bx = Math.max(w / 2 + 2, Math.min(W - w / 2 - 2, x)), by = Math.max(h / 2 + 2, y);
  rr(g, bx - w / 2, by - h / 2, w, h, 9); g.fillStyle = '#fffdf2'; g.fill(); g.strokeStyle = '#111'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#fffdf2'; g.beginPath(); g.moveTo(x - 4, by + h / 2 - 1); g.lineTo(x, by + h / 2 + 7); g.lineTo(x + 5, by + h / 2 - 1); g.fill();
  g.beginPath(); g.moveTo(x - 4, by + h / 2); g.lineTo(x, by + h / 2 + 7); g.lineTo(x + 5, by + h / 2); g.stroke();
  g.fillStyle = '#111'; g.fillText(str, bx, by + 1);
  g.restore();
}

const FACE = {
  angry: ['angry', 'grit'], kick: ['angry', 'grit'], happy: ['happy', 'open'], rich: ['coin', 'open'], laugh: ['happy', 'open'],
  sooty: ['white', 'flat'], tea: ['happy', 'smile'], doze: ['closed', 'o'], guilty: ['wide', 'wavy'], scared: ['wide', 'o'],
  dizzy: ['spiral', 'wavy'], proud: ['happy', 'smile'], cold: ['closed', 'wavy'], wet: ['wide', 'flat'],
};
const TINT = { angry: '#ef5a45', kick: '#ef5a45', sooty: '#3b3330', scared: '#f4efe6', cold: '#a9c9ee' };

function drawMoods(g, s, dt) {
  dt = Math.min(dt || 0.016, 0.1);
  counters.globalBubble -= dt; counters.slack -= dt; counters.laugh -= dt;
  for (let i = puffs.length - 1; i >= 0; i--) {
    const q = puffs[i]; q.life -= dt; if (q.life <= 0) { puffs.splice(i, 1); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt;
    g.globalAlpha = Math.min(1, q.life * 1.4) * 0.8; g.fillStyle = q.col; arc(g, q.x, q.y, 3 + (0.9 - q.life) * 7, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  const ds = s.diggers;
  for (let i = 0; i < ds.length; i++) {
    const d = ds[i], m = st(d);
    m.ownCool -= dt;
    if (m.bubbleLeft > 0) m.bubbleLeft -= dt;
    if (m.mood) { m.age += dt; m.left -= dt; if (m.left <= 0) { m.mood = null; m.with = null; } }
    const [x, y] = centre(d.r, d.c);
    const bob = Math.sin(fx.t * 9 + i * 2) * 2;
    const mo = m.mood;
    if (mo) {
      const tt = m.age;
      g.save(); g.translate(x, y - 14 + bob);
      g.save(); arc(g, 0, -10, 9.2, 0, 7); g.clip();      // repaint the face, below the helmet band
      g.fillStyle = TINT[mo] || SKIN; g.fillRect(-11, -11, 22, 22);
      if (mo === 'sooty') { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-11, -11, 22, 5); }
      if (mo === 'laugh' && !reduced) g.translate(0, Math.sin(tt * 30) * 0.8);
      eyes(g, FACE[mo][0], tt); mouth(g, FACE[mo][1]);
      g.restore();
      g.strokeStyle = '#111'; g.lineWidth = 2; arc(g, 0, -10, 10, 0.05, Math.PI - 0.05); g.stroke();
      if (mo === 'sooty') {       // wild hair out from under the helmet, and now and then smoke
        g.strokeStyle = '#1b1614'; g.lineWidth = 2.4;
        for (let k = -3; k <= 3; k++) { const a = -Math.PI / 2 + k * 0.42, w = reduced ? 0 : Math.sin(fx.t * 14 + k) * 0.12; g.beginPath(); g.moveTo(Math.cos(a) * 11, -13 + Math.sin(a) * 11); g.lineTo(Math.cos(a + w) * 19, -13 + Math.sin(a + w) * 19); g.stroke(); }
        if (Math.random() < 0.08) puff(x, y - 40 + bob, '#555');
      }
      if (mo === 'angry' || mo === 'kick') {
        if (Math.random() < 0.18) puff(x + (Math.random() < 0.5 ? -9 : 9), y - 34 + bob, '#f4f4f4');
        if (tt < 0.1) { puff(x - 10, y + 4, '#d8c9a8', -20, -8); puff(x + 10, y + 4, '#d8c9a8', 20, -8); }     // the stamp
        if (mo === 'kick') { const k = Math.sin(Math.min(1, tt / 0.5) * Math.PI); g.save(); g.translate(8, 14); g.rotate(-0.4 - k * 1.1); g.strokeStyle = '#111'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 11); g.stroke(); g.fillStyle = '#7a4a1c'; g.fillRect(-4, 9, 9, 5); g.restore(); }
      }
      if (mo === 'happy' || mo === 'rich' || mo === 'proud') {     // arms up; the right arm holds the pick
        const up = reduced ? 0 : Math.abs(Math.sin(tt * 14)) * 4;
        arm(g, -11, 4, -17, -14 - up);
        if (mo !== 'happy') arm(g, 11, 4, 15, -16 - up);
        if (mo === 'rich' && !reduced && Math.random() < 0.3) { g.fillStyle = '#fff6b0'; arc(g, (Math.random() - 0.5) * 30, -26 + Math.random() * 10, 1.6, 0, 7); g.fill(); }
      }
      if (mo === 'tea') { cup(g, -17, 4); arm(g, -11, 5, -14, 3); }
      if (mo === 'doze') {
        for (let k = 0; k < 3; k++) {
          const ph = (tt * 0.8 + k * 0.33) % 1, zx = 8 + ph * 12, zy = -26 - ph * 16 - k * 3;
          g.globalAlpha = 1 - ph; g.font = `bold ${9 + k * 3}px system-ui, sans-serif`; g.textAlign = 'start'; g.strokeStyle = '#111'; g.lineWidth = 2.4; g.fillStyle = '#e8f1ff';
          g.strokeText('z', zx, zy); g.fillText('z', zx, zy);
        }
        g.globalAlpha = 1;
      }
      if (mo === 'guilty') {
        g.fillStyle = '#7fd3ff'; g.strokeStyle = '#111'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(11, -17); g.quadraticCurveTo(15, -11, 11, -9); g.quadraticCurveTo(7, -11, 11, -17); g.fill(); g.stroke();
        arm(g, -11, 5, -6, 8);
      }
      if (mo === 'scared' && !reduced) { g.strokeStyle = '#111'; g.lineWidth = 1.6; for (const sx of [-17, 17]) { g.beginPath(); g.moveTo(sx, -14); g.lineTo(sx + Math.sign(sx) * 3, -10); g.moveTo(sx, -8); g.lineTo(sx + Math.sign(sx) * 3, -4); g.stroke(); } }
      if (mo === 'dizzy') for (let k = 0; k < 3; k++) { const a = fx.t * 5 + k * 2.09; g.fillStyle = '#ffd23f'; arc(g, Math.cos(a) * 14, -27 + Math.sin(a) * 4, 2.4, 0, 7); g.fill(); }
      if (mo === 'cold') { g.fillStyle = '#fff'; for (const k of [-1, 1]) { arc(g, k * 17, -2 + (reduced ? 0 : Math.sin(fx.t * 18 + k) * 1.5), 2, 0, 7); g.fill(); } }
      if (mo === 'wet') { g.fillStyle = '#6cc4ff'; for (let k = 0; k < 3; k++) { const ph = (fx.t * 1.4 + k * 0.33) % 1; arc(g, -8 + k * 8, -24 + ph * 30, 1.8, 0, 7); g.fill(); } }
      g.restore();
      if (mo === 'laugh' && m.with) {     // he points at the one he laughs at
        const [ox, oy] = centre(m.with.r, m.with.c), dx = ox - x, dy = oy - y, L = Math.hypot(dx, dy) || 1;
        g.save(); g.translate(x, y - 12 + bob); arm(g, 0, 4, dx / L * 17, dy / L * 12 + 4); g.restore();
      }
    }
    if (m.bubbleLeft > 0 && m.bubble) bubble(g, x, y - 52 + bob, m.bubble, Math.min(1, m.bubbleLeft * 2.5));
  }
}
