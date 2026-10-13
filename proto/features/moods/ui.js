// Dig feature (page side): Rafeeq moods. LOOKS ONLY: it reads the state and the events, draws a face and
// props over each Rafeeq, and never writes to the state. Mood state lives here, per Rafeeq (a WeakMap).
// The Rafeeq's own drawing (../diggers/art.js) reads `look` (set here every frame) and does the body, the pose (sitting,
// lying, flat, hurt), the goggle eyes, the mouth, the fez and the pick. This file adds arms, props, puffs and a speech bubble.
// Other features: `moodsPoke` in ./rules.js, or `app.fire('mood', { mood, r, c })`.
// Speech: every bubble goes through `moodsSay` and the rate rule of the chatter feature (one per 4 s on screen, one per
// Rafeeq per 14 s, one answer to a pair; nothing while a card is open or in the last third of a Rock fight; "Rafeeqs talk: off" stops all).
// A trait (Eager, Sleepy, Joker, Careful, Proud, Hungry) bends how much he talks and which mood he picks. Looks and words only.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { fx, AT, W, rr, centre } from '../../ui/render.js';
import { look } from '../diggers/art.js';

const { t } = G;

// pr: a stronger mood replaces a weaker one; secs: how long it lasts
const MOODS = {
  sooty: { pr: 6, secs: 5 }, dizzy: { pr: 5, secs: 3 }, scared: { pr: 5, secs: 1.6 }, kick: { pr: 4, secs: 0.9 },
  angry: { pr: 3, secs: 0.9 }, proud: { pr: 3, secs: 3 }, rich: { pr: 3, secs: 1.4 }, happy: { pr: 3, secs: 1.1 },
  laugh: { pr: 3, secs: 2.2 }, guilty: { pr: 3, secs: 1.6 }, cold: { pr: 2, secs: 4 }, wet: { pr: 2, secs: 4 },
  tea: { pr: 1, secs: 6 }, doze: { pr: 1, secs: 6 },
};
const P = { ...G.chatterParams, slackGap: 18, laughGap: 30, laughGapJoker: 15, laughChance: 0.15, laughChanceJoker: 0.3, near: 2.2, pickNear: 75, hitsToKick: 24, scaredChance: 0.02, scaredChanceSleepy: 0.008 };
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const MS = new WeakMap();           // digger -> { mood, left, age, bubble, bubbleLeft, blk, hits, with }
const puffs = [];                   // { x, y, vx, vy, life, col } steam and smoke, world px
const counters = { slack: 6, laugh: 4 };
export const moodsMem = G.chatterMem();   // the rate rule's memory (page only, never saved)
const ref = { s: null };
export const moodStats = {};        // how often each mood showed

const st = d => {
  let m = MS.get(d);
  if (!m) { m = { mood: null, left: 0, age: 0, bubble: null, bubbleLeft: 0, blk: '', hits: 0, with: null }; MS.set(d, m); }
  return m;
};

const idxOf = d => (ref.s ? ref.s.diggers.indexOf(d) : -1);
export const moodsTrait = d => { const i = idxOf(d); return i < 0 ? 'careful' : G.chatterTrait(ref.s, i); };

// Show one bubble over a Rafeeq if the rate rule allows it. o.player: he was patted (skips the gap, still counts);
// o.over: a rare one-off (a finish, the Rock at a third) that skips the mute. Returns true when shown.
export function moodsSay(d, text, o = {}) {
  const s = ref.s, i = idxOf(d);
  if (!text || !s || i < 0 || s.chatterQuiet) return false;
  if (!o.player && !o.over && !G.chatterAllow(moodsMem, i, P)) return false;
  if (o.over && s.chatterQuiet) return false;
  const m = st(d); m.bubble = text; m.bubbleLeft = 1.9;
  G.chatterSpoke(moodsMem, i, text, P, o);
  return true;
}
// Two Rafeeqs talk: a says line k, and b answers 0.8 s later; then both stay quiet for 20 s.
export function moodsTalk(a, b, k) {
  const s = ref.s, ia = idxOf(a), ib = idxOf(b);
  if (!s || ia < 0 || ib < 0 || moodsMem.reply) return false;
  const lines = G.chatterPairLines(k, G.chatterName(s, ib));
  if (!moodsSay(a, lines.a)) return false;
  G.chatterAsk(moodsMem, ia, ib, lines.b, P);
  return true;
}
// a mood's own line, by chance (a talker talks more, a sleeper less), never the line just said
function say(d, key, force) {
  const s = ref.s; if (!s) return;
  const i = idxOf(d); if (i < 0) return;
  if (!force && Math.random() > (G.CHATTER_TALK[G.chatterTrait(s, i)] ?? 0.55)) return;
  const n = Number(t('m_' + key + '_n'));
  if (!n) return;
  const lines = Array.from({ length: n }, (_, k) => t('m_' + key + '_' + k));
  moodsSay(d, G.chatterPick(moodsMem, i, lines, Math.random()));
}

export function moodsSet(d, mood, secs, opts = {}) {
  const def = MOODS[mood]; if (!def) return false;
  const m = st(d);
  if (m.mood && MOODS[m.mood].pr > def.pr) return false;
  if (m.mood === mood) { m.left = Math.max(m.left, secs || def.secs); return true; }
  m.mood = mood; m.left = secs || def.secs; m.age = 0; m.with = opts.with || null;
  moodStats[mood] = (moodStats[mood] || 0) + 1;
  if (!opts.quiet) say(d, mood === 'happy' && opts.rich ? 'rich' : mood, opts.say);
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
      const mates = s.diggers.filter(x => x !== sooty && st(x).mood !== 'sooty');
      mates.sort((a, b) => (moodsTrait(b) === 'joker') - (moodsTrait(a) === 'joker'));      // the Joker starts it
      for (const x of mates) if (n++ < 3) moodsSet(x, 'laugh', 2.6, { with: sooty });
    },
    gusher(d, app) { const x = nearest(app.state, d.r, d.c, 3); if (x) moodsSet(x, 'dizzy'); },
    bossDown(d, app) { for (const x of app.state.diggers) moodsSet(x, 'proud'); },
  },
  draw: [{ at: AT.actors + 1, fn: drawMoods }],
  tick(s, app) {
    ref.s = s;
    const b = s.boss, fight = b && b.hp > 0 && b.row - s.top < 10 && b.hp / b.max < 1 / 3;     // the last third of a Rock fight
    moodsMem.mute = !!(app && app.modal && app.modal.id) || !!fight;
    // every 0.1 s: the chance things (slacking, laughing together, scared of the Big Rock)
    const ds = s.diggers; if (!ds.length) return;
    const boss = s.boss && s.boss.hp > 0 ? s.boss.row : -1;
    for (const d of ds) {
      const m = st(d);
      if (boss >= 0 && !m.mood && Math.abs(d.r - boss) < 1.7 && Math.random() < (moodsTrait(d) === 'sleepy' ? P.scaredChanceSleepy : P.scaredChance)) moodsSet(d, 'scared');
      if (m.mood === 'tea' || m.mood === 'doze') {      // caught by the pick
        const [x, y] = centre(d.r, d.c);
        if (fx.mouse.inside && Math.hypot(fx.mouse.x - x, fx.mouse.y - y) < P.pickNear) { m.mood = null; moodsSet(d, 'guilty', null, { say: true }); }
      }
    }
    if (counters.slack <= 0) {
      const free = ds.filter(d => !st(d).mood && d.tr >= 0);
      if (free.length && Math.random() < 0.05) {
        counters.slack = P.slackGap;
        const d = free[Math.floor(Math.random() * free.length)], tr = moodsTrait(d);
        // Sleepy picks the nap, Hungry and Eager the tea (Eager never dozes), the others as before
        const mood = tr === 'sleepy' ? (Math.random() < 0.8 ? 'doze' : 'tea') : tr === 'hungry' || tr === 'eager' ? 'tea' : Math.random() < 0.6 ? 'tea' : 'doze';
        moodsSet(d, mood);
        if (mood === 'tea') {          // a friend sits down with him
          const i = s.diggers.indexOf(d), f = G.chatterPair(s, i).friend, mate = f === null ? null : s.diggers[f];
          if (mate && !st(mate).mood && mate.tr >= 0 && moodsSet(mate, 'tea', null, { with: d, quiet: true })) moodsTalk(d, mate, 0);
        }
      }
    }
    if (counters.laugh <= 0 && ds.length > 1) {
      for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) {
        const a = ds[i], b = ds[j];
        const joke = moodsTrait(a) === 'joker' || moodsTrait(b) === 'joker';      // a Joker laughs twice as often
        if (!st(a).mood && !st(b).mood && Math.hypot(a.r - b.r, a.c - b.c) < P.near && Math.random() < (joke ? P.laughChanceJoker : P.laughChance)) {
          counters.laugh = joke ? P.laughGapJoker : P.laughGap; moodsSet(a, 'laugh', null, { with: b }); moodsSet(b, 'laugh', null, { with: a }); return;
        }
      }
    }
  },
});

// ---------- drawing ----------

function arc(g, x, y, r, a0, a1) { g.beginPath(); g.arc(x, y, r, a0, a1); }
function cup(g, x, y) {
  g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(x - 5, y - 6); g.lineTo(x + 5, y - 6); g.lineTo(x + 3.5, y + 3); g.lineTo(x - 3.5, y + 3); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#a8672c'; g.fillRect(x - 4, y - 5, 8, 2.4);
  g.beginPath(); g.moveTo(x + 5, y - 4); g.quadraticCurveTo(x + 9, y - 2, x + 4, y + 1); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.6;
  const w = reduced ? 0 : Math.sin(fx.t * 4) * 1.5;
  g.beginPath(); g.moveTo(x - 2, y - 8); g.quadraticCurveTo(x - 4 + w, y - 12, x - 2, y - 15); g.moveTo(x + 2, y - 8); g.quadraticCurveTo(x + 4 - w, y - 12, x + 2, y - 15); g.stroke();
}
function arm(g, x0, y0, x1, y1) { g.strokeStyle = '#1b1410'; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + (y1 - y0) * 0.18, (y0 + y1) / 2 - (x1 - x0) * 0.18, x1, y1); g.stroke(); }
function puff(x, y, col, vx = 0, vy = -26) { if (reduced || puffs.length > 24) return; puffs.push({ x, y, vx: vx + (Math.random() - 0.5) * 14, vy, life: 0.9, col }); }

const drawn = [];                   // the bubbles drawn this frame
function bubble(g, x, y, str, alpha) {
  g.save(); g.globalAlpha = alpha; g.font = 'bold 14px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(str).width + 16, h = 24;
  const bx = Math.max(w / 2 + 2, Math.min(W - w / 2 - 2, x));
  let by = Math.max(h / 2 + 2, y);
  // two Rafeeqs side by side: a bubble that would sit on another one goes up a step (or below it at the top edge)
  for (let k = 0; k < 4; k++) {
    const hit = drawn.find(b => Math.abs(b.x - bx) < (b.w + w) / 2 + 2 && Math.abs(b.y - by) < h + 2);
    if (!hit) break;
    by = hit.y - h - 3 < h / 2 + 2 ? hit.y + h + 3 : hit.y - h - 3;
  }
  drawn.push({ x: bx, y: by, w });
  rr(g, bx - w / 2, by - h / 2, w, h, 9); g.fillStyle = '#fffdf2'; g.fill(); g.strokeStyle = '#111'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#fffdf2'; g.beginPath(); g.moveTo(x - 4, by + h / 2 - 1); g.lineTo(x, by + h / 2 + 7); g.lineTo(x + 5, by + h / 2 - 1); g.fill();
  g.beginPath(); g.moveTo(x - 4, by + h / 2); g.lineTo(x, by + h / 2 + 7); g.lineTo(x + 5, by + h / 2); g.stroke();
  g.fillStyle = '#111'; g.fillText(str, bx, by + 1);
  g.restore();
}

function drawMoods(g, s, dt) {
  dt = Math.min(dt || 0.016, 0.1);
  drawn.length = 0;
  ref.s = s; moodsMem.now += dt;
  counters.slack -= dt; counters.laugh -= dt;
  const due = G.chatterReplyDue(moodsMem);         // the answer of a pair
  if (due) {
    const who = s.diggers[due.to];
    if (who && !s.chatterQuiet && !moodsMem.mute) { const m = st(who); m.bubble = due.text; m.bubbleLeft = 1.9; G.chatterReplied(moodsMem, P); } else moodsMem.reply = null;
  }
  for (let i = puffs.length - 1; i >= 0; i--) {
    const q = puffs[i]; q.life -= dt; if (q.life <= 0) { puffs.splice(i, 1); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt;
    g.globalAlpha = Math.min(1, q.life * 1.4) * 0.8; g.fillStyle = q.col; arc(g, q.x, q.y, 3 + (0.9 - q.life) * 7, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  const ds = s.diggers;
  for (let i = 0; i < ds.length; i++) {
    const d = ds[i], m = st(d);
    if (m.bubbleLeft > 0) m.bubbleLeft -= dt;
    if (m.mood) { m.age += dt; m.left -= dt; if (m.left <= 0) { m.mood = null; m.with = null; } }
    const [x, y] = centre(d.r, d.c);
    const bob = Math.sin(fx.t * 9 + i * 2) * 2;
    const mo = m.mood;
    look.set(d, mo ? { mood: mo, age: m.age } : null);
    if (mo) {
      const tt = m.age;
      g.save(); g.translate(x, y - 14 + bob);
      if (mo === 'sooty' && Math.random() < 0.08) puff(x, y - 38 + bob, '#555');
      if (mo === 'angry' || mo === 'kick') {
        if (Math.random() < 0.18) puff(x + (Math.random() < 0.5 ? -9 : 9), y - 36 + bob, '#f4f4f4');
        if (tt < 0.1) { puff(x - 10, y + 12, '#d8c9a8', -20, -8); puff(x + 10, y + 12, '#d8c9a8', 20, -8); }     // the stamp
        if (mo === 'kick') { const k = Math.sin(Math.min(1, tt / 0.5) * Math.PI); g.save(); g.translate(6, 17); g.rotate(-0.4 - k * 1.1); g.strokeStyle = '#111'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 11); g.stroke(); g.fillStyle = '#7a4a1c'; g.fillRect(-4, 9, 9, 5); g.restore(); }
      }
      if (mo === 'happy' || mo === 'rich' || mo === 'proud') {     // arms up; the right arm holds the pick
        const up = reduced ? 0 : Math.abs(Math.sin(tt * 14)) * 4;
        arm(g, -11, 5, -17, -14 - up);
        if (mo === 'rich' && !reduced && Math.random() < 0.3) { g.fillStyle = '#fff6b0'; arc(g, (Math.random() - 0.5) * 30, -26 + Math.random() * 10, 1.6, 0, 7); g.fill(); }
      }
      if (mo === 'tea') { cup(g, -17, 10); arm(g, -11, 8, -14, 9); }
      if (mo === 'doze') {
        for (let k = 0; k < 3; k++) {
          const ph = (tt * 0.8 + k * 0.33) % 1, zx = -26 + ph * 12, zy = 6 - ph * 16 - k * 3;
          g.globalAlpha = 1 - ph; g.font = `bold ${9 + k * 3}px system-ui, sans-serif`; g.textAlign = 'start'; g.strokeStyle = '#111'; g.lineWidth = 2.4; g.fillStyle = '#e8f1ff';
          g.strokeText('z', zx, zy); g.fillText('z', zx, zy);
        }
        g.globalAlpha = 1;
      }
      if (mo === 'guilty') {
                arm(g, -11, 5, -6, 8);
      }
      if (mo === 'scared' && !reduced) { g.strokeStyle = '#111'; g.lineWidth = 1.6; for (const sx of [-17, 17]) { g.beginPath(); g.moveTo(sx, -14); g.lineTo(sx + Math.sign(sx) * 3, -10); g.moveTo(sx, -8); g.lineTo(sx + Math.sign(sx) * 3, -4); g.stroke(); } }
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
