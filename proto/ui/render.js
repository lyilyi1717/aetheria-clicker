// Dig: the picture. The canvas core and every short-lived effect (debris, coins, numbers, rings,
// shake). Reads the state, never changes it. What a block kind looks like and anything a feature
// draws on top are registered: addArt({ kind: {...} }) and addDraw([{ at, fn }]). See proto/README.md.
import { COLS, VIEW_ROWS, KEEP_ROWS, layerOf, layerAt, reachable, visibleMask } from '../core/grid.js';
import { layersOf } from '../core/registry.js';
import { lookFor, zoneNow } from '../features/look/palette.js';
import { makeWorld } from '../features/look/world.js';
import { motion, burst } from './motion.js';
import { textDir } from '../core/lang.js';

export const CELL = 64;
export const SKY = 104;
export const W = COLS * CELL;
export const H = SKY + VIEW_ROWS * CELL;

// where the core's own drawing sits among the draw layers; a feature picks a number between them.
// Layers below AT.screen are drawn inside the shake; the ones above are fixed to the screen.
export const AT = { back: 100, sky: 200, blocks: 300, fog: 400, actors: 500, fx: 600, pick: 700, screen: 790, flash: 800 };

export const ART = {};      // block kind -> how it looks and feels (see addArt)
const DRAW = [];
const TICKS = [];
let S = null;               // the state on screen (set by draw and bindState)

const fx = {
  parts: [], coins: [], texts: [], rings: [], flashes: new Map(), bumps: new Map(),
  trauma: 0, cam: 0, t: 0, swingT: 0, swingCrit: false, gush: [], screenFlash: 0, flashCol: '#fff',
  mouse: { x: W / 2, y: SKY + 40, inside: false }, target: null, coinTarget: { x: 40, y: -30 },
  onCoinLand: null,
  hot: false,               // the pick and the target outline glow gold (an oil rush sets it)
};
export { fx };

// addArt({ kind: { sprite(g, look, v), colour, rich, coin, hard, twinkle, glow, row(g, s, r, y), hit(d, x, y), hitSfx(), firstSight } })
export function addArt(map) { for (const [k, a] of Object.entries(map || {})) { if (ART[k]) throw new Error(`Dig: art for "${k}" twice`); ART[k] = a; } }
// addDraw([{ at, fn(g, s, dt) }]): a draw layer, run every frame in `at` order
export function addDraw(list) { for (const d of list || []) DRAW.push(d); DRAW.sort((a, b) => a.at - b.at); }
// onFx(fn(dt)): runs with the effects every frame (a feature's own decaying values)
export function onFx(fn) { TICKS.push(fn); }
export function bindState(s) { S = s; }

// the colours of a row: the layer's own palette (features/look/palette.js) with the site's small tint on the dirt
const look = r => { const L = layerAt(S, Math.max(0, r)); return lookFor(L.id, L.look, S.site); };
const layerIdx = r => Math.min(Math.max(0, layerOf(r)), layersOf(S.land).length - 1);

export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (k > 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  else { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
  return '#' + ((1 << 24) | ((r | 0) << 16) | ((g | 0) << 8) | (b | 0)).toString(16).slice(1);
}
export function rr(g, x, y, w, h, rad) {
  g.beginPath();
  g.moveTo(x + rad, y);
  g.arcTo(x + w, y, x + w, y + h, rad); g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad); g.arcTo(x, y, x + w, y, rad);
  g.closePath();
}
export function seeded(seed) { let a = seed * 9301 + 49297; return () => { a = (a * 9301 + 49297) % 233280; return a / 233280; }; }

// ---------- block sprites (drawn once, reused) ----------

const sprites = new Map();
function sprite(key, drawIt) {
  let c = sprites.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = CELL; c.height = CELL;
    drawIt(c.getContext('2d'));
    sprites.set(key, c);
  }
  return c;
}

// the plain block every kind starts from: a rounded square with light, shade and a little grit
export function baseBlock(g, col, seed, rough) {
  const rnd = seeded(seed);
  rr(g, 1, 1, CELL - 2, CELL - 2, 9);
  g.fillStyle = col; g.fill();
  g.save(); g.clip();
  g.fillStyle = shade(col, 0.16); g.fillRect(0, 0, CELL, 7);
  g.fillStyle = shade(col, 0.08); g.fillRect(0, 0, 6, CELL);
  g.fillStyle = shade(col, -0.2); g.fillRect(0, CELL - 8, CELL, 8);
  g.fillStyle = shade(col, -0.12); g.fillRect(CELL - 6, 0, 6, CELL);
  for (let i = 0; i < rough; i++) {
    const x = 6 + rnd() * (CELL - 14), y = 8 + rnd() * (CELL - 18), s = 2 + rnd() * 5;
    g.fillStyle = shade(col, rnd() < 0.5 ? -0.14 : 0.14);
    rr(g, x, y, s * 1.5, s, s / 2.2); g.fill();
  }
  g.restore();
  rr(g, 1, 1, CELL - 2, CELL - 2, 9);
  g.strokeStyle = shade(col, -0.38); g.lineWidth = 2; g.stroke();
}

const crackSprites = [];
function crack(stage, v) {
  const k = stage * 3 + (v % 3);
  if (!crackSprites[k]) {
    const c = document.createElement('canvas'); c.width = CELL; c.height = CELL;
    const g = c.getContext('2d'); const rnd = seeded(k * 31 + 5);
    g.strokeStyle = 'rgba(20,10,0,0.75)'; g.lineWidth = 2.2; g.lineCap = 'round';
    for (let i = 0; i < 1 + stage * 2; i++) {
      let x = 32 + (rnd() - 0.5) * 14, y = 32 + (rnd() - 0.5) * 14;
      const a0 = rnd() * 7;
      g.beginPath(); g.moveTo(x, y);
      for (let j = 0; j < 3; j++) { const a = a0 + (rnd() - 0.5) * 1.3; x += Math.cos(a) * (8 + rnd() * 6); y += Math.sin(a) * (8 + rnd() * 6); g.lineTo(x, y); }
      g.stroke();
    }
    crackSprites[k] = c;
  }
  return crackSprites[k];
}

// ---------- effects ----------

export const yOf = r => SKY + (r - fx.cam) * CELL;
export const centre = (r, c) => [c * CELL + CELL / 2, yOf(r) + CELL / 2];

export function debris(r, c, col, n, power = 1) {
  const [x, y] = centre(r, c);
  n = burst(n, !motion());
  for (let i = 0; i < n; i++) {
    if (fx.parts.length > 500) fx.parts.shift();
    const a = Math.random() * Math.PI * 2, sp = (60 + Math.random() * 240) * power;
    fx.parts.push({ x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, g: 900, life: 0.35 + Math.random() * 0.45, max: 0.8, s: 3 + Math.random() * 6, col: Math.random() < 0.25 ? shade(col, 0.35) : col });
  }
}
export function spark(x, y, col, n) {
  n = burst(n, !motion());
  for (let i = 0; i < n; i++) {
    if (fx.parts.length > 500) fx.parts.shift();
    const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 260;
    fx.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 200, life: 0.25 + Math.random() * 0.3, max: 0.55, s: 2 + Math.random() * 3, col, glow: true });
  }
}
export function coinBurst(r, c, n, col = '#ffd23f') {
  const [x, y] = centre(r, c);
  n = burst(n, !motion());
  for (let i = 0; i < n; i++) {
    if (fx.coins.length > 160) break;
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = 160 + Math.random() * 260;
    fx.coins.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, hold: 0.22 + Math.random() * 0.25, col, s: 5 + Math.random() * 2 });
  }
}
// A feature can name a row to keep clear (fx.keepClear = the row of a standing Big Rock): numbers that would start on it
// start just above it instead, smaller and shorter, so they never sit on its bar.
export function text(x, y, str, col = '#fff', size = 18, life = 0.8) {
  if (fx.texts.length > 40) fx.texts.shift();
  if (fx.keepClear != null) {
    const top = yOf(fx.keepClear);
    if (y > top - 6 && y < top + CELL) { y = top - 10; size = Math.min(size, 15); life = Math.min(life, 0.5); }
  }
  fx.texts.push({ x: x + (Math.random() - 0.5) * 16, y, str, col, size, life, max: life });
}
export function ring(x, y, rad, col = '#fff') { fx.rings.push({ x, y, rad, col, life: 0.4, max: 0.4 }); }
export function flash(r, c, strength = 1) { fx.flashes.set(r * 100 + c, strength); fx.bumps.set(r * 100 + c, 1); }
export function shake(amount) { if (!motion()) return; fx.trauma = Math.min(1, fx.trauma + amount); }
export function screenFlash(col, a = 0.25) { if (!motion()) return; fx.flashCol = col; fx.screenFlash = a; }
// a fountain of dark drops from a block, for a couple of seconds
export function gush(c, r) { fx.gush.push({ c, r, life: 2.2 }); }
export function swingAnim(crit) { fx.swingT = 1; fx.swingCrit = crit; }
// the colour of a block's debris
export function blockColour(t, r) {
  const a = ART[t], p = look(r);
  if (a && a.colour) return typeof a.colour === 'function' ? a.colour(p) : a.colour;
  return p[t] || p.dirt;
}

export function updateFx(dt) {
  fx.t += dt;
  fx.trauma = Math.max(0, fx.trauma - dt * 1.8);
  fx.swingT = Math.max(0, fx.swingT - dt * 7);
  fx.screenFlash = Math.max(0, fx.screenFlash - dt * 1.2);
  for (const f of TICKS) f(dt);
  for (const [k, v] of fx.flashes) { const n = v - dt * 9; if (n <= 0) fx.flashes.delete(k); else fx.flashes.set(k, n); }
  for (const [k, v] of fx.bumps) { const n = v - dt * 8; if (n <= 0) fx.bumps.delete(k); else fx.bumps.set(k, n); }
  for (const p of fx.parts) { p.life -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  fx.parts = fx.parts.filter(p => p.life > 0);
  for (const c of fx.coins) {
    c.t += dt;
    if (c.t < c.hold) { c.vy += 700 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= 0.96; }
    else {
      const dx = fx.coinTarget.x - c.x, dy = fx.coinTarget.y - c.y, d = Math.hypot(dx, dy) || 1;
      const sp = 500 + (c.t - c.hold) * 2600;
      c.x += dx / d * Math.min(d, sp * dt); c.y += dy / d * Math.min(d, sp * dt);
      if (d < 14) { c.dead = true; if (fx.onCoinLand) fx.onCoinLand(); }
    }
  }
  fx.coins = fx.coins.filter(c => !c.dead);
  for (const t of fx.texts) { t.life -= dt; t.y -= 55 * dt * (0.4 + t.life / t.max); }
  fx.texts = fx.texts.filter(t => t.life > 0);
  for (const r of fx.rings) r.life -= dt;
  fx.rings = fx.rings.filter(r => r.life > 0);
  for (const g of fx.gush) {
    g.life -= dt;
    if (g.life > 0.5) for (let i = 0; i < 3; i++) {
      const [x, y] = centre(g.r, g.c);
      fx.parts.push({ x: x + (Math.random() - 0.5) * 16, y, vx: (Math.random() - 0.5) * 160, vy: -500 - Math.random() * 380, g: 1100, life: 0.9, max: 0.9, s: 5 + Math.random() * 5, col: '#0d0c0b' });
    }
  }
  fx.gush = fx.gush.filter(g => g.life > 0);
}

// ---------- the core draw layers ----------

function drawBlocks(g, s) {
  const mouseOn = fx.target;
  const seen = visibleMask(s);
  for (let i = 0; i < KEEP_ROWS; i++) {
    const r = s.top + i;
    const y = yOf(r);
    if (y > H + 4 || y < -CELL) continue;
    // a kind that draws its whole row (the Big Rock)
    const any = s.rows[i].find(x => x);
    if (any && ART[any.t] && ART[any.t].row) { ART[any.t].row(g, s, r, y); continue; }
    const L = layerIdx(r), p = look(r), key0 = s.land + '|' + s.site + '|' + zoneNow() + '|' + L + '|';   // per zone: a sprite made in one land is never reused in another
    for (let c = 0; c < COLS; c++) {
      const cell = s.rows[i][c];
      if (!cell) continue;
      const key = r * 100 + c;
      const bump = motion() ? (fx.bumps.get(key) || 0) : 0;
      const x = c * CELL + (bump ? (Math.random() - 0.5) * 6 * bump : 0);
      const yy = y + (bump ? (Math.random() - 0.5) * 6 * bump : 0);
      const v = cell.s % 3;
      if (!seen[i][c]) { g.drawImage(sprite(`dark|${key0}${v}`, gg => baseBlock(gg, p.dark, v, 4)), x, yy); continue; }
      const a = ART[cell.t];
      g.drawImage(sprite(`${cell.t}|${key0}${v}`, gg => (a && a.sprite ? a.sprite(gg, p, v) : baseBlock(gg, '#888', v, 2))), x, yy);
      const dmg = 1 - cell.hp / cell.max;
      if (dmg > 0.05) g.drawImage(crack(Math.min(2, Math.floor(dmg * 3)), cell.s), x, yy);
      const can = reachable(s, r, c);
      if (!can) { g.fillStyle = 'rgba(10,6,2,0.34)'; rr(g, x + 1, yy + 1, CELL - 2, CELL - 2, 9); g.fill(); }
      // shiny things twinkle; some glow
      if (a && (a.twinkle || a.glow)) {
        const tw = Math.sin(fx.t * 3 + cell.s) * 0.5 + 0.5;
        if (a.glow) { g.strokeStyle = `rgba(${a.glow},${0.35 + tw * 0.5})`; g.lineWidth = 3; rr(g, x + 3, yy + 3, CELL - 6, CELL - 6, 8); g.stroke(); }
        if (tw > 0.8) {
          const px = x + 16 + (cell.s % 30), py = yy + 16 + ((cell.s * 7) % 28), k = (tw - 0.8) * 5 * 7;
          g.fillStyle = '#fff'; g.beginPath(); g.moveTo(px, py - k); g.lineTo(px + k * 0.25, py - k * 0.25); g.lineTo(px + k, py); g.lineTo(px + k * 0.25, py + k * 0.25); g.lineTo(px, py + k); g.lineTo(px - k * 0.25, py + k * 0.25); g.lineTo(px - k, py); g.lineTo(px - k * 0.25, py - k * 0.25); g.closePath(); g.fill();
        }
      }
      if (a && a.over) a.over(g, s, cell, x, yy, r, c);
      const fl = fx.flashes.get(key);
      if (fl) { g.fillStyle = `rgba(255,255,255,${Math.min(0.85, fl * 0.8)})`; rr(g, x + 1, yy + 1, CELL - 2, CELL - 2, 9); g.fill(); }
      if (mouseOn && mouseOn[0] === r && mouseOn[1] === c && fx.mouse.inside) {
        g.strokeStyle = fx.hot ? '#ffd23f' : '#fff'; g.lineWidth = 3; rr(g, x + 2, yy + 2, CELL - 4, CELL - 4, 8); g.stroke();
      }
    }
  }
}

function drawFx(g) {
  for (const r of fx.rings) {
    const k = 1 - r.life / r.max;
    g.strokeStyle = r.col; g.globalAlpha = 1 - k; g.lineWidth = 8 * (1 - k) + 1;
    g.beginPath(); g.arc(r.x, r.y, r.rad * (0.2 + k * 0.9), 0, 7); g.stroke();
  }
  g.globalAlpha = 1;
  for (const p of fx.parts) {
    const k = Math.max(0, p.life / p.max);
    g.fillStyle = p.col;
    if (p.glow) g.globalAlpha = k;
    const sz = p.s * (0.4 + k * 0.6);
    g.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
  }
  g.globalAlpha = 1;
  for (const c of fx.coins) {
    g.fillStyle = '#7a5a00'; g.beginPath(); g.arc(c.x, c.y, c.s + 1.5, 0, 7); g.fill();
    g.fillStyle = c.col; g.beginPath(); g.arc(c.x, c.y, c.s, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(c.x - c.s * 0.3, c.y - c.s * 0.3, c.s * 0.35, 0, 7); g.fill();
  }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const t of fx.texts) {
    const k = t.life / t.max;
    const pop = k > 0.85 ? 0.6 + (1 - k) / 0.15 * 0.7 : Math.min(1.3, 1 + (k - 0.6) * 0.75);
    g.font = `800 ${Math.round(t.size * Math.max(1, pop))}px system-ui, Cairo, sans-serif`;
    g.globalAlpha = Math.min(1, k * 3.3);
    g.direction = textDir(t.str);
    g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.strokeText(t.str, t.x, t.y);
    g.fillStyle = t.col; g.fillText(t.str, t.x, t.y);
  }
  g.direction = 'inherit';
  g.globalAlpha = 1;
}

function drawPick(g) {
  if (!fx.mouse.inside) return;
  const k = fx.swingT;
  g.save(); g.translate(fx.mouse.x + 14, fx.mouse.y - 12);
  g.rotate(0.5 - k * 1.3);
  const s = fx.swingCrit && k > 0 ? 1.25 : 1; g.scale(s, s);
  g.lineCap = 'round';
  g.strokeStyle = '#111'; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.lineTo(26, -30); g.stroke();
  g.strokeStyle = '#a8672c'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(26, -30); g.stroke();
  g.strokeStyle = '#111'; g.lineWidth = 10; g.beginPath(); g.moveTo(4, -40); g.quadraticCurveTo(30, -40, 42, -16); g.stroke();
  g.strokeStyle = fx.hot ? '#ffd23f' : '#dfe7ee'; g.lineWidth = 6; g.beginPath(); g.moveTo(4, -40); g.quadraticCurveTo(30, -40, 42, -16); g.stroke();
  g.restore();
}

// the sky, the wall, the strata, the light and the ruler live in features/look/world.js
const world = makeWorld({ fx, yOf, W, H, SKY, CELL, seeded });

addDraw([
  { at: AT.back, fn: world.drawBack },
  { at: AT.sky, fn: world.drawSky },
  { at: AT.blocks, fn: drawBlocks },
  { at: AT.blocks + 4, fn: world.drawStrata },
  { at: AT.fog, fn: world.drawLight },
  { at: AT.fog + 10, fn: world.drawDrift },
  { at: AT.fx, fn: drawFx },
  { at: AT.pick, fn: drawPick },
  { at: AT.screen, fn: g => g.restore() },   // the shake ends here
  { at: AT.screen + 5, fn: world.drawRuler },   // fixed to the screen
  { at: AT.flash, fn(g) { if (fx.screenFlash > 0) { g.globalAlpha = fx.screenFlash; g.fillStyle = fx.flashCol; g.fillRect(0, 0, W, H); g.globalAlpha = 1; } } },
]);

// ---------- the frame ----------

export function draw(g, s, dt) {
  S = s;
  // the camera follows the dig
  const want = s.top;
  fx.cam += (want - fx.cam) * Math.min(1, dt * 7);
  if (Math.abs(want - fx.cam) < 0.002) fx.cam = want;

  const sh = fx.trauma * fx.trauma * 14;
  g.save();
  g.clearRect(0, 0, W, H);
  g.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
  for (let i = 0; i < DRAW.length; i++) DRAW[i].fn(g, s, dt);
}
