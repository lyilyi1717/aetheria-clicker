// Dig feature (page side): the drawing of the Rafeeq, all in canvas paths. DRAWING ONLY: no rules, no numbers that matter.
// A blue bean with a yellow head, big goggles, a red fez with a tassel, thin stick arms and a pick over the shoulder.
// What he wears (hat, clothes, colour, cloth pattern) comes from the wardrobe feature: G.wardrobeWear(s, i). The fez is the plain default.
// The origin is the same as before: the caller translates to (x, y - 14 + bob); the head is at (0,-11), the feet at y 21.
// Static parts (the blob, the fez, the pick) are drawn once to offscreen canvases; the rest is a few paths.
// The moods feature sets `look` for a Rafeeq (a mood, its age) and this file turns it into a pose and a face.
import { fx } from '../../ui/render.js';
import * as G from '../../game.js';
import { DRAW, COLOUR, contrast } from '../wardrobe/items.js';

const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const INK = '#1b1410';
const TAU = Math.PI * 2;

// per Rafeeq differences: a blue each, a glass tint, a height; the tassel side comes from the id
export const BLUES = ['#2f6fe4', '#2b66d6', '#3678ee', '#2a6fdc', '#3369e0', '#2d75ea', '#3a70e0', '#2762d4'];
const HILITE = ['#5b93ff', '#5a8cf4', '#6a9fff', '#5b9aff', '#6290ff', '#5aa0ff', '#6a98f6', '#5588f0'];
const GLASS = ['#9fd8ff', '#a8e0ff', '#9fe6f2', '#a8d4ff', '#b4e4ff', '#9fd8ff', '#a6e8e0', '#b0d0ff'];
const TALL = [0, 1, -1, 0, 1, 0, -1, 1];          // pixels of height

export const look = new WeakMap();                // digger -> { mood, age } (set by the moods feature)
const AN = new WeakMap();                         // digger -> the animation memory: where he was, where he looks, the blink
const anim = (d, i) => {
  let a = AN.get(d);
  if (!a) { a = { c: d.c, r: d.r, dir: 'd', side: i % 2 ? -1 : 1, mv: 0, wt: i * 1.7, blink: 1 + (i * 0.9) % 3, bl: 0, sw: 0 }; AN.set(d, a); }
  return a;
};

// ---------- the parts that never change, drawn once ----------
const SPR = new Map();
function sprite(key, w, h, ox, oy, fn) {
  let c = SPR.get(key);
  if (!c) {
    const k = 3, cv = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w * k, h * k) : Object.assign(document.createElement('canvas'), { width: w * k, height: h * k });
    const x = cv.getContext('2d'); x.scale(k, k); x.translate(ox, oy); x.lineJoin = 'round'; x.lineCap = 'round'; fn(x);
    c = { cv, w, h, ox, oy }; SPR.set(key, c);
  }
  return c;
}
const put = (g, c) => g.drawImage(c.cv, -c.ox, -c.oy, c.w, c.h);

const BEAN = 'M0,-4 C8,-4 12.5,3 12.5,10 C12.5,16.5 7,20.5 0,20.5 C-7,20.5 -12.5,16.5 -12.5,10 C-12.5,3 -8,-4 0,-4 Z';
// the body in his clothes, cached per (clothes, colour, pattern); blue keeps the eight near blues so the old crew still differ a little
const bodySpr = (W, k) => {
  const key = 'body' + W.body + W.colour + W.pattern + (W.colour === 'blue' ? k : '');
  if (SPR.size > 160) SPR.clear();
  return sprite(key, 30, 30, 15, 7, x => {
    const c = W.colour === 'blue' ? BLUES[k] : COLOUR[W.colour] || COLOUR.blue;
    (DRAW.body[W.body] || DRAW.body.shirt)(x, { c, pc: contrast(c), pat: W.pattern });
  });
};
const headSpr = () => sprite('head', 26, 26, 13, 13, x => {      // origin: the head centre
  x.fillStyle = '#ffc83d'; x.beginPath(); x.arc(0, 0, 9.5, 0, TAU); x.fill();
  x.fillStyle = '#ffe27a'; x.beginPath(); x.ellipse(-4.6, -4.4, 2.4, 1.5, -0.6, 0, TAU); x.fill();
  x.lineWidth = 2; x.strokeStyle = INK; x.beginPath(); x.arc(0, 0, 9.5, 0, TAU); x.stroke();
});
const headItem = (id, burnt) => sprite('hat' + id + burnt, 44, 36, 22, 26, x => {      // origin: the middle of the hat's bottom edge
  (DRAW.head[id] || DRAW.head.fez)(x, !!burnt);
  if (burnt && id !== 'fez' && id !== 'goldfez') { x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(35,24,20,0.55)'; x.fillRect(-22, -26, 44, 36); }
});
const pickSpr = () => sprite('pick', 30, 40, 15, 36, x => {
  x.scale(0.82, 0.82);         // origin: the hand; the handle goes up (-y)
  x.lineWidth = 5; x.strokeStyle = INK; x.beginPath(); x.moveTo(0, 3); x.lineTo(0, -23); x.stroke();
  x.lineWidth = 2.6; x.strokeStyle = '#8a5a2b'; x.stroke();
  x.beginPath(); x.moveTo(-12, -19.5); x.quadraticCurveTo(0, -31, 12, -19.5); x.quadraticCurveTo(0, -25.2, -12, -19.5); x.closePath();
  x.fillStyle = '#e7e7ea'; x.fill();
  x.strokeStyle = '#9ba1ab'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(-10, -19.8); x.quadraticCurveTo(0, -25.4, 10, -19.8); x.stroke();
  x.lineWidth = 1.9; x.strokeStyle = INK; x.beginPath(); x.moveTo(-12, -19.5); x.quadraticCurveTo(0, -31, 12, -19.5); x.quadraticCurveTo(0, -25.2, -12, -19.5); x.closePath(); x.stroke();
});

// ---------- small drawing helpers ----------
const arcp = (g, x, y, r, a0, a1) => { g.beginPath(); g.arc(x, y, r, a0, a1); };
function stick(g, x0, y0, cx, cy, x1, y1) {                       // a thin dark curved arm
  g.strokeStyle = INK; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke();
}
function star(g, x, y, r, rot) {
  g.beginPath();
  for (let k = 0; k < 10; k++) { const a = rot + k * Math.PI / 5 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 1.1; g.strokeStyle = INK; g.stroke();
}

// the eyes, inside the two lenses. kind: the old names of the moods
function eyeIn(g, kind, ex, ey, rad, sg, tt, glass) {
  g.save(); arcp(g, ex, ey, rad, 0, TAU); g.clip();
  g.lineCap = 'round';
  if (kind === 'angry') {
    g.fillStyle = 'rgba(235,60,40,0.55)'; g.fillRect(ex - rad, ey - rad, rad * 2, rad * 2);
    g.fillStyle = INK; arcp(g, ex - sg * 0.2, ey + 1.1, 1.3, 0, TAU); g.fill();
    g.strokeStyle = INK; g.lineWidth = 2.2; g.beginPath(); g.moveTo(ex + sg * rad * 1.1, ey - rad * 0.95); g.lineTo(ex - sg * rad * 0.9, ey - rad * 0.05); g.stroke();
  } else if (kind === 'happy') {
    g.strokeStyle = INK; g.lineWidth = 1.9; arcp(g, ex, ey + 1.6, 2.3, Math.PI + 0.35, -0.35); g.stroke();
  } else if (kind === 'closed') {
    g.strokeStyle = INK; g.lineWidth = 1.7; arcp(g, ex, ey - 0.8, 2.3, 0.3, Math.PI - 0.3); g.stroke();
  } else if (kind === 'coin') {
    g.fillStyle = '#ffd23f'; arcp(g, ex, ey, rad, 0, TAU); g.fill();
    g.fillStyle = '#b8860b'; g.fillRect(ex - 0.6, ey - 2.2, 1.2, 4.4); g.strokeStyle = '#b8860b'; g.lineWidth = 0.9; arcp(g, ex, ey, rad - 1, 0, TAU); g.stroke();
  } else if (kind === 'wide') {
    g.fillStyle = '#fff'; g.fillRect(ex - rad, ey - rad, rad * 2, rad * 2); g.fillStyle = INK; arcp(g, ex, ey, 1, 0, TAU); g.fill();
  } else if (kind === 'spiral') {
    g.strokeStyle = INK; g.lineWidth = 1.1; g.beginPath();
    for (let a = 0; a < 13; a += 0.4) { const q = 0.3 + a * 0.22, px = ex + Math.cos(a + tt * 6) * q, py = ey + Math.sin(a + tt * 6) * q; if (a) g.lineTo(px, py); else g.moveTo(px, py); }
    g.stroke();
  } else if (kind === 'cross') {
    g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.moveTo(ex - 2, ey - 2); g.lineTo(ex + 2, ey + 2); g.moveTo(ex + 2, ey - 2); g.lineTo(ex - 2, ey + 2); g.stroke();
  } else if (kind === 'white') {
    g.fillStyle = '#e8e8e8'; g.fillRect(ex - rad, ey - rad, rad * 2, rad * 2); g.fillStyle = INK; arcp(g, ex, ey + 0.4, 0.9, 0, TAU); g.fill();
  } else {
    g.fillStyle = INK; arcp(g, ex + sg * 0.3, ey + 0.4, 1.5, 0, TAU); g.fill();
  }
  g.restore();
}
function mouthAt(g, kind, mx, my) {
  g.save(); g.translate(mx, my); g.strokeStyle = INK; g.fillStyle = '#7a1c1c'; g.lineWidth = 1.6; g.lineCap = 'round';
  if (kind === 'smile') { arcp(g, 0, -2, 3, 0.25, Math.PI - 0.25); g.stroke(); }
  else if (kind === 'open') { arcp(g, 0, -2.2, 3, 0, Math.PI); g.closePath(); g.fill(); g.stroke(); }
  else if (kind === 'grit') { g.fillStyle = '#fff'; g.fillRect(-3.8, -2.4, 7.6, 3.2); g.lineWidth = 1.2; g.strokeRect(-3.8, -2.4, 7.6, 3.2); g.beginPath(); g.moveTo(-1.2, -2.4); g.lineTo(-1.2, 0.8); g.moveTo(1.2, -2.4); g.lineTo(1.2, 0.8); g.stroke(); }
  else if (kind === 'flat') { g.beginPath(); g.moveTo(-2.6, -0.4); g.lineTo(2.6, -0.4); g.stroke(); }
  else if (kind === 'wavy') { g.beginPath(); g.moveTo(-3.4, 0); g.quadraticCurveTo(-1.7, -2.4, 0, 0); g.quadraticCurveTo(1.7, 2.4, 3.4, 0); g.stroke(); }
  else if (kind === 'o') { arcp(g, 0, 0, 1.7, 0, TAU); g.fill(); g.stroke(); }
  else { arcp(g, 0, -1.6, 2.2, 0.3, Math.PI - 0.3); g.stroke(); }          // the rest face: a small smile
  g.restore();
}

// what a mood does to the face and the colours (the moods feature only names the mood)
const FACE = {
  angry: ['angry', 'grit'], kick: ['angry', 'grit'], happy: ['happy', 'open'], rich: ['coin', 'open'], laugh: ['happy', 'open'],
  sooty: ['white', 'flat'], tea: ['happy', 'smile'], doze: ['closed', 'o'], guilty: ['wide', 'wavy'], scared: ['wide', 'o'],
  dizzy: ['spiral', 'wavy'], proud: ['happy', 'smile'], cold: ['closed', 'wavy'], wet: ['wide', 'flat'],
};
const HEAD_TINT = { sooty: '#8a8580', scared: '#f6f1d8', cold: '#bfe0ff', angry: '#ff9a3c' };

// ---------- the pose ----------
// Reads the Rafeeq and what the moods feature said. Returns a plain object; nothing is written to the state.
function pose(d, a, i, s, dt) {
  const L = look.get(d), mo = L && L.mood, age = L ? L.age : 0;
  const moved = Math.hypot(d.c - a.c, d.r - a.r);
  const dx = d.c - a.c, dy = d.r - a.r;
  a.c = d.c; a.r = d.r;
  const moving = moved > 0.004 || (d.tr >= 0 && (Math.abs(d.tc - d.c) > 0.05 || Math.abs(d.tr - d.r) > 0.05));
  a.mv = moving ? 0.15 : Math.max(0, a.mv - dt);
  const walking = a.mv > 0;
  if (moved > 0.004) a.dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u');
  else if (!walking) { a.dir = 'd'; if (d.tr >= 0 && Math.abs(d.tc - d.c) > 0.3) a.side = d.tc > d.c ? 1 : -1; }
  if (walking) a.wt += dt * (reduced ? 8 : 13);
  // the swing: it was set to 1 when the hit landed, and runs out at the same speed as it always did
  const sw = d.swing || 0;
  a.sw = Math.max(0, sw - 0.12);
  d.swing = a.sw;     // (the old draw ran this countdown too)
  // the wind-up: in the last moments before the next hit the pick goes back
  let wind = 0;
  if (!walking && d.tr >= 0 && !(sw > 0)) {
    const win = 0.14;
    wind = Math.max(0, Math.min(1, 1 - (d.cd || 0) / win));
  }
  a.blink -= dt; if (a.blink <= 0) { a.bl = 0.13; a.blink = 2.4 + ((i * 7 + Math.floor(fx.t)) % 5) * 0.7; }
  if (a.bl > 0) a.bl -= dt;
  const P = { mo, age, walking, dir: a.dir, side: a.side, sw, wind, pose: 'stand', blink: a.bl > 0 && !reduced, face: mo ? FACE[mo] : null, sieve: !!d.sv };
  if (mo === 'tea') P.pose = 'sit';
  else if (mo === 'doze') P.pose = 'lie';
  else if (mo === 'sooty') P.pose = age < 0.3 ? 'hurt' : age < 1.2 ? 'flat' : 'stand';
  else if (mo === 'dizzy') P.pose = age < 0.25 ? 'hurt' : 'stand';
  else if (mo === 'kick' || mo === 'scared') P.pose = 'stand';
  return P;
}

// ---------- the Rafeeq ----------
// g is already at (x, y - 14 + bob). `bob` is passed so the shadow stays on the ground.
export function drawRafeeq(g, s, d, i, bob, dt, opts = {}) {
  const k = i % 8, a = anim(d, i), t = fx.t;
  dt = Math.min(dt || 0.016, 0.1);
  const W = opts.wear || (G.wardrobeWear ? G.wardrobeWear(s, i) : { head: 'fez', body: 'shirt', colour: 'blue', pattern: 'plain' });
  const P = pose(d, a, i, s, dt);
  const front = P.dir === 'd' || !P.walking, back = P.walking && P.dir === 'u', sideV = P.walking && (P.dir === 'l' || P.dir === 'r');
  const mirror = sideV ? (P.dir === 'l' ? -1 : 1) : (P.walking || P.mo ? 1 : P.side);
  const flat = P.pose === 'flat', lie = P.pose === 'lie', sit = P.pose === 'sit', hurt = P.pose === 'hurt';

  // the shadow
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(0, 20 - bob + 2, lie || flat ? 21 : 15, 5, 0, 0, TAU); g.fill();

  g.save();
  const tall = TALL[k] * 0.5;
  // the pose: where the whole body stands, leans or lies. The pivot is the feet.
  g.translate(lie ? 11 : flat ? -11 * a.side : 0, 21);
  if (flat) { const f = Math.min(1, (P.age - 0.3) / 0.12); g.rotate(1.5 * f * (a.side || 1)); g.translate(0, f * 3); if (!reduced) g.scale(1 + 0.1 * f, 1 - 0.1 * f); }
  else if (lie) { g.rotate(-1.45); g.translate(0, 3); }
  else if (hurt) { g.rotate(-0.34 * a.side); g.translate(-3 * a.side, -2); }
  else if (sit) { g.translate(0, 3); g.scale(1.05, 0.88); }
  else if (P.pose === 'stand' && P.mo === 'dizzy' && !reduced) g.rotate(Math.sin(t * 4) * 0.1);
  else if (P.mo === 'scared' && !reduced) g.translate(Math.sin(t * 40) * 0.8, 0);
  const hit = P.sw;              // squash on impact
  if (!reduced && hit > 0.4 && !sideV) g.scale(1 + 0.08 * hit, 1 - 0.1 * hit);
  g.scale(1, 1 + tall / 30);
  const stepP = Math.sin(a.wt), step2 = Math.sin(a.wt * 2);
  if (P.walking && !lie && !flat) g.rotate(stepP * 0.05);
  g.translate(0, -21);
  g.scale(mirror, 1);

  // feet
  g.fillStyle = INK;
  if (!lie && !flat) {
    if (sit) { g.beginPath(); g.ellipse(-8, 21, 4.2, 2.3, 0, 0, TAU); g.ellipse(8, 21, 4.2, 2.3, 0, 0, TAU); g.fill(); }
    else {
      const lf = P.walking ? Math.max(0, stepP) * 3 : 0, rf = P.walking ? Math.max(0, -stepP) * 3 : 0, sh = sideV ? stepP * 4 : 0;
      g.beginPath(); g.ellipse(-5.5 + sh, 21 - lf, 3.9, 2.4, 0, 0, TAU); g.ellipse(5.5 - sh, 21 - rf, 3.9, 2.4, 0, 0, TAU); g.fill();
    }
  } else { g.beginPath(); g.ellipse(-5.5, 21, 3.9, 2.4, 0, 0, TAU); g.ellipse(5.5, 21, 3.9, 2.4, 0, 0, TAU); g.fill(); }

  // the left arm (the empty hand): swings when he walks
  const ls = P.walking ? stepP * 4 : 0;
  const armUp = P.mo === 'happy' || P.mo === 'rich' || P.mo === 'proud';
  if (!armUp && P.mo !== 'tea' && P.mo !== 'guilty' && P.mo !== 'laugh') {
    if (hurt) stick(g, -11, 6, -18, 3, -19, -3);
    else if (flat || lie) stick(g, -11, 6, -16, 10, -15, 16);
    else stick(g, -11, 7, -16 - (sideV ? 0 : 0), 11 + ls * 0.4, -14 + ls, 16 - Math.abs(ls) * 0.4);
  }

  // the body
  put(g, bodySpr(W, k));
  if (P.mo === 'sooty') { g.fillStyle = 'rgba(30,24,22,0.35)'; g.save(); g.clip(new Path2D(BEAN)); g.fillRect(-13, -4, 26, 26); g.restore(); }
  if (P.mo === 'cold' && !reduced) { g.fillStyle = 'rgba(190,225,255,0.3)'; g.save(); g.clip(new Path2D(BEAN)); g.fillRect(-13, -4, 26, 26); g.restore(); }

  // the pick and the right arm (over the shoulder, behind the head)
  drawPick(g, P, d, flat);

  // the head
  g.save();
  const hx = sideV ? 2.4 : 0, hy = P.walking && !lie ? -Math.abs(step2) * 1.2 : 0;
  g.translate(hx, hy + (sit ? 1 : 0));
  g.translate(0, -11);
  if (P.mo === 'dizzy' && !reduced) g.rotate(Math.sin(t * 5) * 0.12);
  if (P.mo === 'laugh' && !reduced) g.translate(0, Math.sin(t * 30) * 0.8);
  put(g, headSpr());
  const tint = P.mo && HEAD_TINT[P.mo];
  if (tint) { g.save(); arcp(g, 0, 0, 8.6, 0, TAU); g.clip(); g.globalAlpha = P.mo === 'sooty' ? 0.85 : 0.5; g.fillStyle = tint; g.fillRect(-10, -10, 20, 20); g.restore(); }
  if (P.mo === 'sooty') {       // black smudges
    g.fillStyle = 'rgba(25,20,18,0.55)'; g.beginPath(); g.ellipse(-4, 4, 2.6, 1.6, 0.4, 0, TAU); g.ellipse(5, -3, 2, 1.4, 0, 0, TAU); g.fill();
    // wild hair out of the sides, up from under the fez
    g.strokeStyle = '#2a2220'; g.lineWidth = 2; g.lineCap = 'round';
    for (let q = -3; q <= 3; q++) { if (q === 0) continue; const an = -Math.PI / 2 + q * 0.5, w = reduced ? 0 : Math.sin(t * 14 + q) * 0.14; g.beginPath(); g.moveTo(Math.cos(an) * 9, Math.sin(an) * 9); g.lineTo(Math.cos(an + w) * 15, Math.sin(an + w) * 15); g.stroke(); }
  }
  g.restore();

  g.save(); g.translate(hx, hy + (sit ? 1 : 0));
  if (P.mo === 'dizzy' && !reduced) { g.translate(0, -11); g.rotate(Math.sin(t * 5) * 0.12); g.translate(0, 11); }
  if (P.mo === 'laugh' && !reduced) g.translate(0, Math.sin(t * 30) * 0.8);
  if (back) {
    // the back of the head: the strap round it, nothing else
    g.strokeStyle = INK; g.lineWidth = 2.6; g.beginPath(); g.moveTo(-9.3, -10); g.lineTo(9.3, -10); g.stroke();
    g.strokeStyle = '#6b4a1c'; g.lineWidth = 1.2; g.stroke();
  } else {
    drawFace(g, P, k, sideV, a);
  }
  // the hat
  if (!flat) drawHead(g, W.head, P, a, i, d, back, sideV, lie);
  g.restore();

  // the hurt stars and the dizzy ones
  if (hurt || (P.mo === 'dizzy' && !reduced) || (P.mo === 'sooty' && P.pose === 'flat')) {
    for (let q = 0; q < 3; q++) { const an = t * 5 + q * 2.09; star(g, Math.cos(an) * 12, -24 + Math.sin(an) * 3.5, 3.4, an); }
  }
  // the fez and the pick on the ground, after a blast
  if (flat) {
    g.save(); g.translate(-14, 22); g.rotate(-0.6); put(g, headItem(W.head, P.mo === 'sooty' ? 1 : 0)); g.restore();
  }
  g.restore();
}

function drawFace(g, P, k, sideV, a) {
  const sg = sideV ? 1 : 0, off = sideV ? 3.2 : 0;
  const face = P.face;
  const eyeKind = P.blink && !face ? 'closed' : face ? face[0] : P.pose === 'hurt' ? 'cross' : P.pose === 'flat' ? 'cross' : 'normal';
  const mouthKind = face ? face[1] : P.pose === 'hurt' ? 'o' : P.pose === 'flat' ? 'wavy' : P.sw > 0.5 ? 'grit' : 'smile';
  const glass = P.mo === 'angry' || P.mo === 'kick' ? '#ffb4a6' : GLASS[k];
  const tt = P.age || 0;
  // the strap, to the sides of the head
  g.strokeStyle = INK; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(-9.3, -10.5); g.lineTo(9.3, -10.5); g.stroke();
  g.strokeStyle = '#6b4a1c'; g.lineWidth = 1.3; g.stroke();
  // the lenses (in a side view the far one is narrower)
  const lens = [[-5.2 + off, -10.2, 1], [5.2 + off, -10.2, 1]];
  if (sideV) { lens[0] = [-1 + off, -10.2, 1]; lens[1] = [6.8 + off, -10.2, 1]; }
  const reduceFar = sideV;
  lens.forEach(([lx, ly], n) => {
    const far = reduceFar && n === 0, rx = far ? 3.2 : 4.7;
    g.save(); g.translate(lx, ly); if (far) g.scale(0.72, 1);
    g.fillStyle = INK; arcp(g, 0, 0, rx + 1.1, 0, TAU); g.fill();
    g.fillStyle = glass; arcp(g, 0, 0, 3.7, 0, TAU); g.fill();
    eyeIn(g, eyeKind, 0, 0, 3.7, n ? 1 : -1, tt, glass);
    if (eyeKind !== 'coin') { g.fillStyle = 'rgba(255,255,255,0.95)'; arcp(g, -1.4, -1.5, 1.05, 0, TAU); g.fill(); }
    g.restore();
  });
  mouthAt(g, mouthKind, sideV ? 2.4 + off * 0.5 : 0, -3.6);
  if (P.mo === 'guilty') { g.fillStyle = '#7fd3ff'; g.strokeStyle = INK; g.lineWidth = 1.1; g.beginPath(); g.moveTo(9, -9); g.quadraticCurveTo(13, -3, 9, -1); g.quadraticCurveTo(5, -3, 9, -9); g.fill(); g.stroke(); }
}

function drawHead(g, head, P, a, i, d, back, sideV, lie) {
  const id = d.id || i + 1;
  const side = (id % 2 ? 1 : -1);
  g.save();
  g.translate(sideV ? 0.5 : 1, -11 - 8.6);       // on the top of the head, a little to one side
  let rot = 0.13 * side;
  const surprised = (P.mo === 'scared' || P.mo === 'guilty') && P.age < 0.35;
  if (surprised && !reduced) g.translate(0, -4 + P.age * 8);
  if (P.pose === 'hurt') rot -= 0.25 * a.side;
  g.rotate(rot);
  const burnt = P.mo === 'sooty' ? 1 : 0;
  // the tassel is behind the fez on the way down: draw it first from the button
  const t = fx.t;
  let sway = reduced ? 0 : Math.sin(t * 3 + id) * 0.14;
  if (P.walking && !reduced) sway += Math.sin(a.wt * 1.0 + 1) * 0.55 * -(sideV ? 1 : 0.5);
  if (P.sw > 0 && !reduced) sway -= P.sw * 0.6 * a.side;
  if (P.pose === 'hurt' && !reduced) sway += Math.sin(t * 25) * 0.4;
  const frizz = P.mo === 'sooty' || P.mo === 'scared';
  const sd = back ? -side : side;
  const tx = (9.5 + sway * 10) * sd, ty = 4 - Math.abs(sway) * 2.0;
  put(g, headItem(head, burnt));
  if (head !== 'fez' && head !== 'goldfez') { g.restore(); return; }       // only the fez has the tassel
  g.strokeStyle = INK; g.lineWidth = 3; g.lineCap = 'round';
  const path = () => {
    g.beginPath(); g.moveTo(0, -9);
    if (frizz) { g.lineTo(tx * 0.3 + 1.5, -12); g.lineTo(tx * 0.6 - 1, -9.5); g.lineTo(tx * 0.9 + 1, -12); g.lineTo(tx + 2, -9); }
    else g.quadraticCurveTo(tx * 0.9, -13, tx, ty - 3.5);
  };
  path(); g.stroke(); g.strokeStyle = '#ffd23f'; g.lineWidth = 1.5; path(); g.stroke();
  const ex = frizz ? tx + 2 : tx, ey = frizz ? -9 : ty - 3.5;
  g.fillStyle = '#ffd23f'; g.strokeStyle = INK; g.lineWidth = 1.1;
  const kx = sway * 2.5;
  g.beginPath(); g.ellipse(ex + kx * 0.3, ey + 1, 1.1, 1, 0, 0, TAU); g.fill(); g.stroke();
  g.strokeStyle = INK; g.lineWidth = 2.1; g.beginPath(); g.moveTo(ex + kx * 0.3, ey + 1.8); g.lineTo(ex + kx * 0.7, ey + 4.2); g.moveTo(ex - 0.7 + kx * 0.3, ey + 1.8); g.lineTo(ex - 0.9 + kx * 0.7, ey + 3.8); g.stroke();
  g.strokeStyle = '#ffd23f'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(ex + kx * 0.3, ey + 1.8); g.lineTo(ex + kx * 0.7, ey + 3.9); g.moveTo(ex - 0.7 + kx * 0.3, ey + 1.8); g.lineTo(ex - 0.9 + kx * 0.7, ey + 3.5); g.stroke();
  g.restore();
}

function drawPick(g, P, d, flat) {
  // the pivot is the right hand, at the shoulder
  const sv = P.walking && (P.dir === 'l' || P.dir === 'r');
  const px = sv ? 1 : 11, py = 5;
  let th, hold = true;
  if (flat) { g.save(); g.translate(20, 20); g.rotate(1.2); put(g, pickSpr()); g.restore(); return; }
  const down = P.dir === 'd' || !P.walking;
  const rest = 0.28 + (P.walking && !reduced ? Math.sin(fx.t * 13) * 0.05 : 0);
  if (P.sw > 0) th = rest + (down ? 2.15 : 1.9) * (P.sw > 0.5 ? 1 : (P.sw / 0.5)) - (P.sw > 0.5 ? 0 : 0);
  else if (P.wind > 0) th = rest - 1.1 * P.wind;
  else th = sv ? -0.55 + Math.sin(fx.t * 13) * 0.05 : rest;
  if (P.mo === 'tea' || P.mo === 'doze') th = 0.9;
  if (P.mo === 'happy' || P.mo === 'rich' || P.mo === 'proud') th = P.mo === 'happy' ? rest : -0.15;
  if (P.mo === 'kick') th = 0.55;
  if (P.mo === 'doze') th = 1.45;
  g.save(); g.translate(px, py); g.rotate(th);
  put(g, pickSpr());
  g.restore();
  // the arm from the shoulder to the hand
  if (sv) stick(g, 0, 8, 3, 9, px, py); else stick(g, 10.5, 7, 15, 9, px + 0.5, py - 0.5);
  if (P.sw > 0.55 && !reduced) {      // the white streak on the down stroke
    g.save(); g.translate(px, py);
    const a0 = rest - 1.0, a1 = th;
    g.strokeStyle = 'rgba(255,255,255,' + Math.min(0.95, (P.sw - 0.5) * 2.2) + ')'; g.lineWidth = 3.2; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 0, 25, a0 - Math.PI / 2, a1 - Math.PI / 2 - 0.1); g.stroke();
    g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, 20, a0 - Math.PI / 2 + 0.5, a1 - Math.PI / 2 - 0.25); g.stroke();
    g.restore();
  }
}

// ---------- drawing a Rafeeq away from the dig (the wardrobe page, a card, the finish card) ----------
// The origin is the same as drawRafeeq's (his feet are at y 21); `size` is a scale (1 = as on the dig). `opts.key` keeps his blink apart
// from another picture; `opts.mood` ('happy' waves an arm) and `opts.age` are for the moods; nothing is written to the game.
const STAND = new Map();
export function drawRafeeqAt(g, wear, size = 1, opts = {}) {
  const key = opts.key || 'at';
  let d = STAND.get(key);
  if (!d) { d = { c: 0, r: 0, tr: -1, tc: -1, cd: 1, swing: 0 }; STAND.set(key, d); }
  if (opts.mood) look.set(d, { mood: opts.mood, age: opts.age || 0 }); else look.delete(d);
  g.save(); g.scale(size, size);
  const seat = wear.seat || 0;
  drawRafeeq(g, {}, d, seat, 0, 0.016, { wear });
  g.restore();
}
// one part as a small icon: the hat on its own, the body on its own, a swatch of the colour or of the cloth
export function drawWardrobePart(g, slot, wear, size = 1) {
  g.save(); g.scale(size, size);
  if (slot === 'head') { g.translate(0, 6); put(g, headItem(wear.head, 0)); }
  else if (slot === 'body') { g.translate(0, -7); put(g, bodySpr(wear, wear.seat || 0)); }
  else {
    const c = wear.colour === 'blue' ? BLUES[wear.seat || 0] : COLOUR[wear.colour] || COLOUR.blue;
    g.save(); g.beginPath(); g.roundRect(-14, -14, 28, 28, 6); g.clip();
    g.fillStyle = c; g.fillRect(-16, -16, 32, 32);
    if (slot === 'pattern') { g.translate(0, -3); g.scale(1.2, 1.2); (DRAW.pattern[wear.pattern] || DRAW.pattern.plain)(g, contrast(c)); }
    g.restore(); g.lineWidth = 2; g.strokeStyle = INK; g.beginPath(); g.roundRect(-14, -14, 28, 28, 6); g.stroke();
  }
  g.restore();
}
