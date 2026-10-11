// Dig prototype: the picture. Canvas drawing and every short-lived effect
// (debris, coins, numbers, rings, shake). Reads the state, never changes it.
import { COLS, VIEW_ROWS, KEEP_ROWS, ORES, layerOf, reachable, isBossRow, visibleMask } from './game.js';

export const CELL = 64;
export const SKY = 104;
export const W = COLS * CELL;
export const H = SKY + VIEW_ROWS * CELL;

// ground colours per layer: [dirt, stone, hard, dug-out background]
const LAYERS = [
  { dirt: '#dba65a', stone: '#a79a86', hard: '#5d5348', back: '#5a3d22', name: 'sand' },
  { dirt: '#c0673f', stone: '#96807a', hard: '#4f3f3f', back: '#4a2418', name: 'clay' },
  { dirt: '#5f86a3', stone: '#7b8c98', hard: '#33414d', back: '#1f3242', name: 'slate' },
  { dirt: '#8a62b0', stone: '#857a9c', hard: '#3a2f4d', back: '#2a1b3f', name: 'deep' },
];
const pal = r => LAYERS[Math.min(layerOf(r), LAYERS.length - 1)];
const ORE_COL = { copper: ['#f08a3c', '#ffc38a'], silver: ['#dfe9f2', '#ffffff'], gold: ['#ffcf33', '#fff3a8'], gem: ['#3ee6e0', '#d6fffd'] };

const fx = {
  parts: [], coins: [], texts: [], rings: [], flashes: new Map(), bumps: new Map(),
  trauma: 0, cam: 0, t: 0, swingT: 0, swingCrit: false, gush: [], screenFlash: 0, flashCol: '#fff',
  mouse: { x: W / 2, y: SKY + 40, inside: false }, target: null, coinTarget: { x: 40, y: -30 },
  onCoinLand: null, bossShake: 0, bossFrac: 1,
};
export { fx };

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (k > 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  else { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
  return '#' + ((1 << 24) | ((r | 0) << 16) | ((g | 0) << 8) | (b | 0)).toString(16).slice(1);
}
function rr(g, x, y, w, h, rad) {
  g.beginPath();
  g.moveTo(x + rad, y);
  g.arcTo(x + w, y, x + w, y + h, rad); g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad); g.arcTo(x, y, x + w, y, rad);
  g.closePath();
}
function seeded(seed) { let a = seed * 9301 + 49297; return () => { a = (a * 9301 + 49297) % 233280; return a / 233280; }; }

// ---------- block sprites (drawn once, reused) ----------

const sprites = new Map();
function sprite(key, draw) {
  let c = sprites.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = CELL; c.height = CELL;
    draw(c.getContext('2d'));
    sprites.set(key, c);
  }
  return c;
}

function baseBlock(g, col, seed, rough) {
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

function nugget(g, x, y, s, cols, rot) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.beginPath(); g.moveTo(-s, -s * 0.2); g.lineTo(-s * 0.3, -s); g.lineTo(s * 0.8, -s * 0.6); g.lineTo(s, s * 0.4); g.lineTo(0, s); g.closePath();
  g.fillStyle = cols[0]; g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1.5; g.stroke();
  g.beginPath(); g.moveTo(-s * 0.3, -s); g.lineTo(s * 0.8, -s * 0.6); g.lineTo(0, -s * 0.05); g.closePath();
  g.fillStyle = cols[1]; g.fill();
  g.restore();
}
function gemShape(g, x, y, s, cols) {
  g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.8, y - s * 0.25); g.lineTo(x, y + s); g.lineTo(x - s * 0.8, y - s * 0.25); g.closePath();
  g.fillStyle = cols[0]; g.fill(); g.strokeStyle = 'rgba(0,40,50,0.6)'; g.lineWidth = 1.5; g.stroke();
  g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.8, y - s * 0.25); g.lineTo(x, y - s * 0.05); g.lineTo(x - s * 0.8, y - s * 0.25); g.closePath();
  g.fillStyle = cols[1]; g.fill();
}

function drawType(g, t, L, v) {
  const p = LAYERS[L];
  const rnd = seeded(v + 7);
  if (t === 'dirt') return baseBlock(g, p.dirt, v, 7);
  if (t === 'stone') { baseBlock(g, p.stone, v, 3); g.strokeStyle = shade(p.stone, -0.3); g.lineWidth = 2; g.beginPath(); g.moveTo(10, 24 + v * 4); g.lineTo(30, 30 + v * 3); g.lineTo(52, 22 + v * 5); g.stroke(); return; }
  if (t === 'hard') {
    baseBlock(g, p.hard, v, 2);
    g.fillStyle = shade(p.hard, 0.22);
    for (let i = 0; i < 4; i++) { const x = 12 + rnd() * 36, y = 12 + rnd() * 36; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 7, y); g.lineTo(x, y + 6); g.lineTo(x - 7, y); g.closePath(); g.fill(); }
    return;
  }
  if (ORES.includes(t)) {
    baseBlock(g, shade(p.dirt, -0.18), v, 3);
    const cols = ORE_COL[t];
    if (t === 'gem') { gemShape(g, 22, 26, 12, cols); gemShape(g, 43, 40, 10, cols); gemShape(g, 40, 17, 6, cols); }
    else { nugget(g, 21, 24, 10, cols, 0.3 + v); nugget(g, 43, 38, 11, cols, 1.2 + v); nugget(g, 40, 17, 6, cols, 2 + v); nugget(g, 20, 45, 6, cols, 4 + v); }
    return;
  }
  if (t === 'chest') {
    baseBlock(g, shade(p.dirt, -0.25), v, 2);
    rr(g, 11, 22, 42, 30, 4); g.fillStyle = '#8a4b1c'; g.fill(); g.strokeStyle = '#3d1f08'; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.moveTo(11, 30); g.quadraticCurveTo(32, 6, 53, 30); g.closePath(); g.fillStyle = '#a65c24'; g.fill(); g.stroke();
    g.fillStyle = '#ffd23f'; g.fillRect(11, 29, 42, 4); g.fillRect(17, 16, 4, 36); g.fillRect(43, 16, 4, 36);
    rr(g, 27, 27, 10, 11, 2); g.fillStyle = '#fff1a0'; g.fill(); g.strokeStyle = '#7a5a00'; g.stroke();
    return;
  }
  if (t === 'tnt') {
    baseBlock(g, shade(p.dirt, -0.25), v, 2);
    rr(g, 15, 14, 34, 40, 7); g.fillStyle = '#d7332b'; g.fill(); g.strokeStyle = '#5e0f0b'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#5e0f0b'; g.fillRect(15, 22, 34, 4); g.fillRect(15, 42, 34, 4);
    g.fillStyle = '#ffe14a';
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, rad = i % 2 ? 4 : 8; g.lineTo(32 + Math.cos(a) * rad, 34 + Math.sin(a) * rad); }
    g.closePath(); g.fill();
    g.strokeStyle = '#3d2a1a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(32, 14); g.quadraticCurveTo(38, 6, 44, 9); g.stroke();
    return;
  }
  if (t === 'fossil') {
    baseBlock(g, shade(p.dirt, -0.22), v, 2);
    g.save(); g.translate(32, 33); g.rotate(-0.6);
    g.fillStyle = '#f6efdc'; g.strokeStyle = '#6b5a3a'; g.lineWidth = 1.5;
    rr(g, -17, -4, 34, 8, 4); g.fill(); g.stroke();
    for (const [x, y] of [[-17, -5], [-17, 5], [17, -5], [17, 5]]) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.stroke(); }
    g.fillRect(-15, -3, 30, 6);
    g.restore();
    return;
  }
  if (t === 'oil') {
    baseBlock(g, '#2a2622', v, 2);
    g.fillStyle = '#0c0b0a';
    for (const [x, y, s] of [[22, 26, 10], [42, 38, 12], [38, 18, 6]]) { g.beginPath(); g.moveTo(x, y - s); g.quadraticCurveTo(x + s, y + s * 0.2, x, y + s); g.quadraticCurveTo(x - s, y + s * 0.2, x, y - s); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (const [x, y] of [[19, 27], [39, 39]]) { g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); }
    return;
  }
  baseBlock(g, '#888', v, 2);
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
  for (let i = 0; i < n; i++) {
    if (fx.parts.length > 500) fx.parts.shift();
    const a = Math.random() * Math.PI * 2, sp = (60 + Math.random() * 240) * power;
    fx.parts.push({ x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, g: 900, life: 0.35 + Math.random() * 0.45, max: 0.8, s: 3 + Math.random() * 6, col: Math.random() < 0.25 ? shade(col, 0.35) : col });
  }
}
export function spark(x, y, col, n) {
  for (let i = 0; i < n; i++) {
    if (fx.parts.length > 500) fx.parts.shift();
    const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 260;
    fx.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 200, life: 0.25 + Math.random() * 0.3, max: 0.55, s: 2 + Math.random() * 3, col, glow: true });
  }
}
export function coinBurst(r, c, n, col = '#ffd23f') {
  const [x, y] = centre(r, c);
  for (let i = 0; i < n; i++) {
    if (fx.coins.length > 160) break;
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = 160 + Math.random() * 260;
    fx.coins.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, hold: 0.22 + Math.random() * 0.25, col, s: 5 + Math.random() * 2 });
  }
}
export function text(x, y, str, col = '#fff', size = 18, life = 0.8) {
  if (fx.texts.length > 40) fx.texts.shift();
  fx.texts.push({ x: x + (Math.random() - 0.5) * 16, y, str, col, size, life, max: life });
}
export function ring(x, y, rad, col = '#fff') { fx.rings.push({ x, y, rad, col, life: 0.4, max: 0.4 }); }
export function flash(r, c, strength = 1) { fx.flashes.set(r * 100 + c, strength); fx.bumps.set(r * 100 + c, 1); }
export function shake(amount) { fx.trauma = Math.min(1, fx.trauma + amount); }
export function screenFlash(col, a = 0.25) { fx.flashCol = col; fx.screenFlash = a; }
export function gush(c, r) { fx.gush.push({ c, r, life: 2.2 }); }
export function swingAnim(crit) { fx.swingT = 1; fx.swingCrit = crit; }
export const blockColour = (t, r) => ORES.includes(t) ? ORE_COL[t][0] : t === 'tnt' ? '#d7332b' : t === 'chest' ? '#a65c24' : t === 'oil' ? '#111' : t === 'boss' ? '#4b4460' : (pal(r)[t] || pal(r).dirt);

export function updateFx(dt) {
  fx.t += dt;
  fx.trauma = Math.max(0, fx.trauma - dt * 1.8);
  fx.swingT = Math.max(0, fx.swingT - dt * 7);
  fx.screenFlash = Math.max(0, fx.screenFlash - dt * 1.2);
  fx.bossShake = Math.max(0, fx.bossShake - dt * 6);
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

// ---------- the frame ----------

function drawSky(g) {
  const y0 = -fx.cam * CELL;
  if (y0 + SKY < -4) return;
  const grad = g.createLinearGradient(0, y0, 0, y0 + SKY);
  grad.addColorStop(0, '#2b6cb0'); grad.addColorStop(0.75, '#f6c177'); grad.addColorStop(1, '#f2a65a');
  g.fillStyle = grad; g.fillRect(0, y0, W, SKY);
  g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(W - 90, y0 + 40, 22, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,243,196,0.25)'; g.beginPath(); g.arc(W - 90, y0 + 40, 34, 0, 7); g.fill();
  g.fillStyle = '#e0b467';
  g.beginPath(); g.moveTo(0, y0 + SKY);
  for (let x = 0; x <= W; x += 20) g.lineTo(x, y0 + SKY - 14 - Math.sin(x / 70) * 9 - Math.sin(x / 23) * 2);
  g.lineTo(W, y0 + SKY); g.closePath(); g.fill();
  // a palm and a tent, so it is a place
  g.strokeStyle = '#5b3a1a'; g.lineWidth = 5; g.beginPath(); g.moveTo(92, y0 + SKY - 12); g.quadraticCurveTo(84, y0 + 60, 96, y0 + 42); g.stroke();
  g.strokeStyle = '#2f7d3a'; g.lineWidth = 4;
  for (const a of [-2.7, -2.1, -1.2, -0.5, 0.1]) { g.beginPath(); g.moveTo(96, y0 + 42); g.quadraticCurveTo(96 + Math.cos(a) * 20, y0 + 30 + Math.sin(a) * 14, 96 + Math.cos(a) * 34, y0 + 46 + Math.sin(a) * 18); g.stroke(); }
  g.fillStyle = '#f4ead5'; g.beginPath(); g.moveTo(400, y0 + SKY - 14); g.lineTo(440, y0 + SKY - 52); g.lineTo(480, y0 + SKY - 14); g.closePath(); g.fill();
  g.fillStyle = '#b5633c'; g.beginPath(); g.moveTo(432, y0 + SKY - 14); g.lineTo(440, y0 + SKY - 36); g.lineTo(448, y0 + SKY - 14); g.closePath(); g.fill();
}

function drawBoss(g, s, r, y) {
  const b = s.boss && s.boss.row === r ? s.boss : null;
  const frac = b ? Math.max(0, b.hp / b.max) : 1;
  const sh = fx.bossShake * 5;
  const ox = (Math.random() - 0.5) * sh, oy = (Math.random() - 0.5) * sh;
  g.save(); g.translate(ox, y + oy);
  rr(g, 3, 2, W - 6, CELL - 4, 16);
  const grad = g.createLinearGradient(0, 0, 0, CELL);
  grad.addColorStop(0, '#6a6384'); grad.addColorStop(1, '#3a3450');
  g.fillStyle = grad; g.fill(); g.strokeStyle = '#1c1830'; g.lineWidth = 4; g.stroke();
  // cracks grow as it weakens
  g.strokeStyle = 'rgba(10,6,25,0.8)'; g.lineWidth = 3; g.lineCap = 'round';
  const rnd = seeded(r);
  const n = Math.floor((1 - frac) * 14);
  for (let i = 0; i < n; i++) { let x = rnd() * W, yy = rnd() * CELL; g.beginPath(); g.moveTo(x, yy); for (let j = 0; j < 3; j++) { x += (rnd() - 0.5) * 50; yy += (rnd() - 0.5) * 30; g.lineTo(x, Math.max(4, Math.min(CELL - 4, yy))); } g.stroke(); }
  // the crack to aim for
  if (b && b.hp > 0 && b.weak !== undefined) {
    const wx = b.weak * CELL + CELL / 2, pulse = 0.6 + Math.sin(fx.t * 10) * 0.4;
    g.fillStyle = `rgba(255,190,60,${0.25 + pulse * 0.25})`; g.beginPath(); g.arc(wx, CELL / 2, 26 + pulse * 4, 0, 7); g.fill();
    g.strokeStyle = '#fff3a8'; g.lineWidth = 5; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(wx - 8, 6); g.lineTo(wx + 6, 22); g.lineTo(wx - 6, 34); g.lineTo(wx + 9, CELL - 6); g.stroke();
    g.strokeStyle = '#ff9d2e'; g.lineWidth = 2; g.stroke();
  }
  // the face: it watches the pick
  const cx = W / 2, cy = CELL / 2;
  const hurt = fx.bossShake > 0.2;
  for (const dx of [-46, 46]) {
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx + dx, cy - 2, 17, hurt ? 6 : 15, 0, 0, 7); g.fill();
    g.strokeStyle = '#1c1830'; g.lineWidth = 2.5; g.stroke();
    if (!hurt) {
      const ax = fx.mouse.x - (cx + dx), ay = fx.mouse.y - (y + cy), d = Math.hypot(ax, ay) || 1;
      g.fillStyle = '#1c1830'; g.beginPath(); g.arc(cx + dx + ax / d * 7, cy - 2 + ay / d * 6, 7, 0, 7); g.fill();
    }
    g.strokeStyle = '#1c1830'; g.lineWidth = 6; g.beginPath();
    g.moveTo(cx + dx - Math.sign(dx) * 22, cy - 26 + (frac < 0.4 ? 8 : 0)); g.lineTo(cx + dx + Math.sign(dx) * 16, cy - 18 - (frac < 0.4 ? 6 : 0)); g.stroke();
  }
  g.strokeStyle = '#1c1830'; g.lineWidth = 5; g.beginPath();
  if (frac < 0.4) { g.moveTo(cx - 14, cy + 20); g.quadraticCurveTo(cx, cy + 8, cx + 14, cy + 20); }
  else { g.moveTo(cx - 16, cy + 18); g.lineTo(cx + 16, cy + 18); }
  g.stroke();
  g.restore();
}

function drawDigger(g, d, i) {
  const [x, y] = centre(d.r, d.c);
  const bob = Math.sin(fx.t * 9 + i * 2) * 2;
  d.swing = Math.max(0, (d.swing || 0) - 0.12);
  g.save(); g.translate(x, y - 14 + bob);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(0, 20 - bob, 15, 5, 0, 0, 7); g.fill();
  const body = ['#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#f97316', '#14b8a6', '#eab308', '#ec4899'][i % 8];
  rr(g, -12, -6, 24, 24, 9); g.fillStyle = body; g.fill(); g.strokeStyle = '#111'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#f8d9b0'; g.beginPath(); g.arc(0, -10, 10, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, -13, 11, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
  g.fillRect(-13, -14, 26, 3);
  g.fillStyle = '#111'; g.beginPath(); g.arc(-4, -9, 1.6, 0, 7); g.arc(4, -9, 1.6, 0, 7); g.fill();
  g.translate(12, 2); g.rotate(-0.9 + d.swing * 1.6);
  g.strokeStyle = '#7a4a1c'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -20); g.stroke();
  g.strokeStyle = '#cfd8dc'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(-9, -17); g.quadraticCurveTo(0, -25, 9, -17); g.stroke();
  g.restore();
}

function drawPick(g, rush) {
  if (!fx.mouse.inside) return;
  const k = fx.swingT;
  g.save(); g.translate(fx.mouse.x + 14, fx.mouse.y - 12);
  g.rotate(0.5 - k * 1.3);
  const s = fx.swingCrit && k > 0 ? 1.25 : 1; g.scale(s, s);
  g.lineCap = 'round';
  g.strokeStyle = '#111'; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.lineTo(26, -30); g.stroke();
  g.strokeStyle = '#a8672c'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(26, -30); g.stroke();
  g.strokeStyle = '#111'; g.lineWidth = 10; g.beginPath(); g.moveTo(4, -40); g.quadraticCurveTo(30, -40, 42, -16); g.stroke();
  g.strokeStyle = rush ? '#ffd23f' : '#dfe7ee'; g.lineWidth = 6; g.beginPath(); g.moveTo(4, -40); g.quadraticCurveTo(30, -40, 42, -16); g.stroke();
  g.restore();
}

export function draw(g, s, dt) {
  // the camera follows the dig
  const want = s.top;
  fx.cam += (want - fx.cam) * Math.min(1, dt * 7);
  if (Math.abs(want - fx.cam) < 0.002) fx.cam = want;

  const sh = fx.trauma * fx.trauma * 14;
  g.save();
  g.clearRect(0, 0, W, H);
  g.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);

  // the dug-out earth behind everything
  const first = Math.floor(fx.cam) - 2;
  for (let r = first; r < first + VIEW_ROWS + 5; r++) {
    const y = yOf(r);
    g.fillStyle = pal(Math.max(0, r)).back; g.fillRect(-20, y, W + 40, CELL + 1);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    const rnd = seeded(r + 3);
    for (let i = 0; i < 5; i++) g.fillRect(rnd() * W, y + rnd() * CELL, 14 + rnd() * 30, 4);
  }
  drawSky(g);

  // blocks
  const mouseOn = fx.target;
  const seen = visibleMask(s);
  for (let i = 0; i < KEEP_ROWS; i++) {
    const r = s.top + i;
    const y = yOf(r);
    if (y > H + 4 || y < -CELL) continue;
    if (isBossRow(r) && s.rows[i].some(x => x)) { drawBoss(g, s, r, y); continue; }
    const L = Math.min(layerOf(r), LAYERS.length - 1);
    for (let c = 0; c < COLS; c++) {
      const cell = s.rows[i][c];
      if (!cell) continue;
      const key = r * 100 + c;
      const bump = fx.bumps.get(key) || 0;
      const x = c * CELL + (bump ? (Math.random() - 0.5) * 6 * bump : 0);
      const yy = y + (bump ? (Math.random() - 0.5) * 6 * bump : 0);
      const v = cell.s % 3;
      if (!seen[i][c]) { g.drawImage(sprite(`dark|${L}|${v}`, gg => baseBlock(gg, shade(LAYERS[L].back, -0.25), v, 4)), x, yy); continue; }
      g.drawImage(sprite(`${cell.t}|${L}|${v}`, gg => drawType(gg, cell.t, L, v)), x, yy);
      const dmg = 1 - cell.hp / cell.max;
      if (dmg > 0.05) g.drawImage(crack(Math.min(2, Math.floor(dmg * 3)), cell.s), x, yy);
      const can = reachable(s, r, c);
      if (!can) { g.fillStyle = 'rgba(10,6,2,0.34)'; rr(g, x + 1, yy + 1, CELL - 2, CELL - 2, 9); g.fill(); }
      // shiny things twinkle; chests glow
      if (ORES.includes(cell.t) || cell.t === 'chest') {
        const tw = Math.sin(fx.t * 3 + cell.s) * 0.5 + 0.5;
        if (cell.t === 'chest') { g.strokeStyle = `rgba(255,210,63,${0.35 + tw * 0.5})`; g.lineWidth = 3; rr(g, x + 3, yy + 3, CELL - 6, CELL - 6, 8); g.stroke(); }
        if (tw > 0.8) {
          const px = x + 16 + (cell.s % 30), py = yy + 16 + ((cell.s * 7) % 28), k = (tw - 0.8) * 5 * 7;
          g.fillStyle = '#fff'; g.beginPath(); g.moveTo(px, py - k); g.lineTo(px + k * 0.25, py - k * 0.25); g.lineTo(px + k, py); g.lineTo(px + k * 0.25, py + k * 0.25); g.lineTo(px, py + k); g.lineTo(px - k * 0.25, py + k * 0.25); g.lineTo(px - k, py); g.lineTo(px - k * 0.25, py - k * 0.25); g.closePath(); g.fill();
        }
      }
      const fl = fx.flashes.get(key);
      if (fl) { g.fillStyle = `rgba(255,255,255,${Math.min(0.85, fl * 0.8)})`; rr(g, x + 1, yy + 1, CELL - 2, CELL - 2, 9); g.fill(); }
      if (mouseOn && mouseOn[0] === r && mouseOn[1] === c && fx.mouse.inside) {
        g.strokeStyle = s.rush > 0 ? '#ffd23f' : '#fff'; g.lineWidth = 3; rr(g, x + 2, yy + 2, CELL - 4, CELL - 4, 8); g.stroke();
      }
    }
  }
  // darker with depth, so the bottom of the view is a promise
  const fog = g.createLinearGradient(0, H - CELL * 2.2, 0, H);
  fog.addColorStop(0, 'rgba(8,5,12,0)'); fog.addColorStop(1, 'rgba(8,5,12,0.6)');
  g.fillStyle = fog; g.fillRect(-20, H - CELL * 2.2, W + 40, CELL * 2.2 + 20);

  s.diggers.forEach((d, i) => drawDigger(g, d, i));

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
    g.font = `800 ${Math.round(t.size * Math.max(1, pop))}px system-ui, sans-serif`;
    g.globalAlpha = Math.min(1, k * 3.3);
    g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.strokeText(t.str, t.x, t.y);
    g.fillStyle = t.col; g.fillText(t.str, t.x, t.y);
  }
  g.globalAlpha = 1;
  drawPick(g, s.rush > 0);
  g.restore();
  if (fx.screenFlash > 0) { g.globalAlpha = fx.screenFlash; g.fillStyle = fx.flashCol; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  if (s.rush > 0) { g.strokeStyle = `rgba(255,210,63,${0.5 + Math.sin(fx.t * 12) * 0.3})`; g.lineWidth = 8; g.strokeRect(0, 0, W, H); }
}
