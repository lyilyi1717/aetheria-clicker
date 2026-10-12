// Dig look: the world behind and around the blocks. The sky of each site, the dug-out wall of each layer, the
// strata at every Big Rock, the light that falls off with depth, and the depth ruler. Drawing only: it reads the
// state and never changes it. render.js hands in what it owns (makeWorld) so this file does not import it back.
import { LAYER, layerAt } from '../../core/grid.js';
import { layersOf } from '../../core/registry.js';
import { LAYER_LOOK, SITE_LOOK, siteKey } from './palette.js';

const reduced = (() => {
  try { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
})();
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const TILE = 256, RULER_MAX = 200;   // a wall tile is 256 px tall; the ruler shows the first 200 m of a site
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

export function makeWorld(R) {
  const { fx, yOf, W, H, SKY, CELL, seeded } = R;
  const lid = (s, r) => layerAt(s, Math.max(0, r)).id;
  const pal = id => LAYER_LOOK[id] || LAYER_LOOK.sand;
  const T = () => (reduced ? 0 : fx.t);

  // ---------- the sky: drawn once per site into a canvas, then copied ----------
  const skies = new Map();
  const hump = (g, col, base, amp, ph) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, SKY);
    for (let x = 0; x <= W; x += 20) g.lineTo(x, SKY - base - Math.sin(x / 70 + ph) * amp - Math.sin(x / 23) * 2);
    g.lineTo(W, SKY); g.closePath(); g.fill();
  };
  const sun = (g, x, y, r, col, halo) => {
    g.fillStyle = halo; g.beginPath(); g.arc(x, y, r * 1.55, 0, 7); g.fill();
    g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  };
  const palm = (g, x, base, h) => {
    g.strokeStyle = '#5b3a1a'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x - 8, base - h * 0.5, x + 4, base - h); g.stroke();
    g.strokeStyle = '#2f7d3a'; g.lineWidth = 4;
    for (const a of [-2.7, -2.1, -1.2, -0.5, 0.1]) {
      const tx = x + 4, ty = base - h;
      g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(a) * 20, ty - 12 + Math.sin(a) * 14, tx + Math.cos(a) * 34, ty + 4 + Math.sin(a) * 18); g.stroke();
    }
  };
  const tent = (g, x, base) => {
    g.fillStyle = '#f4ead5'; g.beginPath(); g.moveTo(x, base); g.lineTo(x + 40, base - 38); g.lineTo(x + 80, base); g.closePath(); g.fill();
    g.fillStyle = '#b5633c'; g.beginPath(); g.moveTo(x + 32, base); g.lineTo(x + 40, base - 22); g.lineTo(x + 48, base); g.closePath(); g.fill();
  };
  const keg = (g, x, base) => {
    g.fillStyle = '#8a4a22'; g.strokeStyle = '#2b1608'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(x, base - 22, 18, 22, 4); g.fill(); g.stroke();
    g.fillStyle = '#d7332b'; g.fillRect(x, base - 15, 18, 4);
    g.fillStyle = '#ffe14a'; g.fillRect(x + 7, base - 28, 2, 6);
  };
  const nugget = (g, x, base, s) => {
    g.fillStyle = '#e8b21c'; g.strokeStyle = '#6b4a00'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x - s, base); g.lineTo(x - s * 0.8, base - s * 0.9); g.lineTo(x - s * 0.1, base - s * 1.3); g.lineTo(x + s * 0.8, base - s * 0.8); g.lineTo(x + s, base); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#fff3a8'; g.beginPath(); g.moveTo(x - s * 0.8, base - s * 0.9); g.lineTo(x - s * 0.1, base - s * 1.3); g.lineTo(x + s * 0.1, base - s * 0.5); g.closePath(); g.fill();
  };
  const SKY_PROPS = {
    dunes(g) {
      sun(g, W - 90, 40, 22, '#fff3c4', 'rgba(255,243,196,0.25)');
      hump(g, SITE_LOOK.dunes.far, 14, 9, 0);
      palm(g, 92, SKY - 12, 54); tent(g, 400, SKY - 14);
    },
    boom(g) {   // a dusk with a canyon, powder kegs and a warning flag
      sun(g, W - 170, SKY - 16, 30, '#ffb347', 'rgba(255,140,60,0.25)');
      g.fillStyle = '#7a3524';
      g.beginPath(); g.moveTo(0, SKY); g.lineTo(0, 30); g.lineTo(60, 30); g.lineTo(60, 48); g.lineTo(130, 48); g.lineTo(130, 62); g.lineTo(210, 62); g.lineTo(230, SKY); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(W, SKY); g.lineTo(W, 22); g.lineTo(W - 70, 22); g.lineTo(W - 70, 44); g.lineTo(W - 140, 44); g.lineTo(W - 150, SKY); g.closePath(); g.fill();
      g.fillStyle = '#5a2418'; g.fillRect(0, 30, 60, 5); g.fillRect(W - 70, 22, 70, 5);
      hump(g, SITE_LOOK.boom.far, 10, 5, 1);
      keg(g, 290, SKY - 6); keg(g, 312, SKY - 6); keg(g, 301, SKY - 28);
      g.strokeStyle = '#2b1608'; g.lineWidth = 3; g.beginPath(); g.moveTo(380, SKY - 6); g.lineTo(380, SKY - 56); g.stroke();
      g.fillStyle = '#ffd23f'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(381, SKY - 56); g.lineTo(412, SKY - 48); g.lineTo(381, SKY - 38); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#d7332b'; g.fillRect(390, SKY - 52, 4, 8);
    },
    gold(g) {   // noon, a dry river bed, bushes, an acacia and gold rocks
      sun(g, 330, 26, 20, '#fffbe0', 'rgba(255,255,220,0.35)');
      g.strokeStyle = 'rgba(255,240,170,0.35)'; g.lineWidth = 2;
      for (let i = 0; i < 10; i++) { const a = i * 0.628; g.beginPath(); g.moveTo(330 + Math.cos(a) * 30, 26 + Math.sin(a) * 30); g.lineTo(330 + Math.cos(a) * 42, 26 + Math.sin(a) * 42); g.stroke(); }
      hump(g, SITE_LOOK.gold.far, 14, 7, 2);
      g.strokeStyle = '#b8924a'; g.lineWidth = 6; g.beginPath(); g.moveTo(180, SKY); g.quadraticCurveTo(260, SKY - 9, 340, SKY - 5); g.quadraticCurveTo(420, SKY - 1, 470, SKY - 8); g.stroke();
      g.fillStyle = '#4a7a3a'; for (const [x, r] of [[40, 11], [66, 8], [560, 12], [592, 8]]) { g.beginPath(); g.arc(x, SKY - 10, r, Math.PI, 0); g.fill(); }
      g.strokeStyle = '#4a3418'; g.lineWidth = 4; g.beginPath(); g.moveTo(130, SKY - 10); g.lineTo(130, SKY - 40); g.stroke();
      g.fillStyle = '#5d8a3a'; g.beginPath(); g.ellipse(130, SKY - 42, 30, 9, 0, 0, 7); g.fill();
      nugget(g, 450, SKY - 8, 13); nugget(g, 486, SKY - 8, 9); nugget(g, 520, SKY - 8, 11);
    },
    bones(g) {   // dawn, and a giant rib cage as an arch
      sun(g, 110, SKY - 30, 15, '#fff0e6', 'rgba(255,220,230,0.35)');
      hump(g, SITE_LOOK.bones.far, 12, 6, 3);
      const cx = 380;
      g.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        for (const sd of [-1, 1]) {
          for (const [col, w] of [['#6d5a48', 8], ['#f4ecd6', 5]]) {
            g.strokeStyle = col; g.lineWidth = w;
            g.beginPath(); g.moveTo(cx + sd * (60 - i * 4), SKY - 8); g.quadraticCurveTo(cx + sd * (74 - i * 4), SKY - 66 + i * 5, cx + sd * (6 - i), SKY - 74 + i * 4); g.stroke();
          }
        }
      }
      for (const [col, w] of [['#6d5a48', 8], ['#f4ecd6', 5]]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(cx - 70, SKY - 80); g.quadraticCurveTo(cx, SKY - 86, cx + 70, SKY - 80); g.stroke(); }
    },
    shark(g) {   // sea, a dhow, wet sand and a fin in the sand
      sun(g, W - 100, 34, 20, '#ffffff', 'rgba(255,255,255,0.35)');
      const sea = g.createLinearGradient(0, SKY - 34, 0, SKY - 10); sea.addColorStop(0, '#2aa3b8'); sea.addColorStop(1, '#1f8fa6');
      g.fillStyle = sea; g.fillRect(0, SKY - 34, W, 24);
      g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 2;
      for (let i = 0; i < 16; i++) { const x = (i * 83) % W, y = SKY - 30 + (i * 7) % 18; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 12, y); g.stroke(); }
      g.fillStyle = '#6b4a2a'; g.beginPath(); g.moveTo(150, SKY - 30); g.lineTo(212, SKY - 30); g.lineTo(200, SKY - 20); g.lineTo(162, SKY - 20); g.closePath(); g.fill();
      g.fillStyle = '#f4ead5'; g.beginPath(); g.moveTo(184, SKY - 34); g.lineTo(184, SKY - 70); g.lineTo(212, SKY - 36); g.closePath(); g.fill();
      hump(g, SITE_LOOK.shark.far, 8, 4, 4);
      g.fillStyle = 'rgba(80,60,30,0.25)'; g.fillRect(0, SKY - 4, W, 4);
      g.fillStyle = '#6f8591'; g.strokeStyle = '#2b3a44'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(468, SKY - 4); g.quadraticCurveTo(476, SKY - 34, 490, SKY - 52); g.quadraticCurveTo(498, SKY - 30, 516, SKY - 4); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = SITE_LOOK.shark.far; g.beginPath(); g.ellipse(492, SKY - 2, 34, 6, 0, 0, 7); g.fill();
    },
    mirage(g) {   // a second horizon: a palm and its upside-down twin on a lake of air
      sun(g, W - 120, 38, 30, '#fff6d8', 'rgba(255,246,216,0.3)');
      hump(g, '#f0d6a8', 34, 4, 5);
      const lake = g.createLinearGradient(0, SKY - 32, 0, SKY - 10); lake.addColorStop(0, 'rgba(190,225,245,0.75)'); lake.addColorStop(1, 'rgba(255,240,200,0.4)');
      g.fillStyle = lake; g.fillRect(0, SKY - 32, W, 22);
      palm(g, 150, SKY - 33, 36);
      g.save(); g.globalAlpha = 0.38; g.translate(0, SKY - 33); g.scale(1, -0.55); palm(g, 150, 0, 36); g.restore();
      hump(g, SITE_LOOK.mirage.far, 8, 4, 6);
    },
  };
  function skyOf(key) {
    let c = skies.get(key);
    if (!c) {
      c = canvas(W, SKY);
      const g = c.getContext('2d'), L = SITE_LOOK[key];
      const gr = g.createLinearGradient(0, 0, 0, SKY); gr.addColorStop(0, L.sky[0]); gr.addColorStop(0.85, L.sky[1]); gr.addColorStop(1, L.sky[1]);
      g.fillStyle = gr; g.fillRect(0, 0, W, SKY);
      SKY_PROPS[key](g);
      skies.set(key, c);
    }
    return c;
  }
  const bird = (g, x, y, w, col) => {
    g.strokeStyle = col; g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - 7, y - 3 * w); g.quadraticCurveTo(x - 3, y, x, y); g.quadraticCurveTo(x + 3, y, x + 7, y - 3 * w); g.stroke();
  };
  function drift(g, key, y0) {   // one small drifting thing per site
    const t = T();
    if (key === 'dunes') {
      g.fillStyle = 'rgba(224,180,103,0.7)';
      for (let i = 0; i < 9; i++) g.fillRect((i * 79 + t * 46) % W, y0 + SKY - 10 - (i * 5) % 22, 3, 1.5);
    } else if (key === 'boom') {
      g.fillStyle = 'rgba(40,24,20,0.55)';
      for (let i = 0; i < 8; i++) g.fillRect((i * 97 + 20) % W + Math.sin(t + i) * 3, y0 + SKY - ((t * 9 + i * 31) % 60) - 8, 2.5, 2.5);
      const ph = fx.t % 7;   // a far-off bang now and then
      if (!reduced && ph < 0.35) { const k = 1 - ph / 0.35; g.fillStyle = `rgba(255,190,90,${0.7 * k})`; g.beginPath(); g.arc(250, y0 + SKY - 24, 4 + (1 - k) * 12, 0, 7); g.fill(); }
    } else if (key === 'gold') {
      for (let i = 0; i < 8; i++) {
        const a = Math.sin(t * 2.2 + i * 1.9) * 0.5 + 0.5; if (a < 0.45) continue;
        const x = (i * 83 + 30) % W, y = y0 + SKY - 8 - (i * 11) % 30, k = 2 + a * 3;
        g.fillStyle = `rgba(255,248,200,${a})`; g.fillRect(x - k, y - 0.7, k * 2, 1.4); g.fillRect(x - 0.7, y - k, 1.4, k * 2);
      }
    } else if (key === 'bones' || key === 'shark') {
      for (let i = 0; i < 2; i++) bird(g, ((t * (key === 'bones' ? 16 : 26) + 90 + i * 330) % (W + 60)) - 30, y0 + 24 + i * 16 + Math.sin(t * 0.8 + i) * 4, key === 'shark' ? 0.4 + 0.6 * Math.abs(Math.sin(t * 5 + i)) : 0.8, key === 'bones' ? '#6d5a6e' : '#ffffff');
    }
  }
  function shimmer(g, c, y0) {   // the air above the far sand is copied in thin slices that slide a little
    if (reduced) return;
    for (let y = SKY - 40; y < SKY - 8; y += 2) g.drawImage(c, 0, y, W, 2, Math.sin(fx.t * 2.4 + y * 0.5) * 2.2, y0 + y, W, 2);
  }
  function drawSky(g, s) {
    const y0 = -fx.cam * CELL;
    if (y0 + SKY < -4) return;
    const key = siteKey(s.site), c = skyOf(key);
    g.drawImage(c, 0, y0);
    if (key === 'mirage') shimmer(g, c, y0);
    drift(g, key, y0);
  }

  // ---------- the wall behind the blocks: one colour per layer and a tile of what is only there ----------
  const decor = new Map();
  const DECOR = {
    sand(g, rnd) {   // roots and small shells
      g.strokeStyle = 'rgba(40,22,8,0.55)'; g.lineWidth = 2;
      for (let i = 0; i < 6; i++) { const x = rnd() * W, y = rnd() * TILE; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 14, y + 20, x + 4 + rnd() * 16, y + 40); g.stroke(); }
      g.fillStyle = 'rgba(255,236,196,0.35)'; for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(rnd() * W, rnd() * TILE, 5, 3, rnd(), 0, 7); g.fill(); }
    },
    clay(g, rnd) {   // broken pots and cracks
      g.strokeStyle = 'rgba(20,6,0,0.5)'; g.lineWidth = 2;
      for (let i = 0; i < 9; i++) { let x = rnd() * W, y = rnd() * TILE; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (rnd() - 0.5) * 30; y += 8 + rnd() * 14; g.lineTo(x, y); } g.stroke(); }
      g.fillStyle = 'rgba(214,120,70,0.5)'; g.strokeStyle = 'rgba(30,10,4,0.6)';
      for (let i = 0; i < 4; i++) { const x = rnd() * W, y = rnd() * TILE; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 14, y - 10, x + 30, y + 4); g.lineTo(x + 22, y + 16); g.lineTo(x + 6, y + 14); g.closePath(); g.fill(); g.stroke(); }
    },
    slate(g, rnd) {   // wet shine and drips
      g.lineCap = 'round';
      for (let i = 0; i < 12; i++) { const x = rnd() * W, y = rnd() * TILE, l = 10 + rnd() * 34; g.strokeStyle = 'rgba(150,230,240,0.3)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + l); g.stroke(); g.fillStyle = 'rgba(150,230,240,0.45)'; g.beginPath(); g.arc(x, y + l + 2, 2.4, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(88,199,232,0.1)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(rnd() * W, rnd() * TILE, 40, 8, 0, 0, 7); g.fill(); }
    },
    deep(g, rnd) {   // small crystals in the wall
      for (let i = 0; i < 22; i++) {
        const x = rnd() * W, y = rnd() * TILE, h = 8 + rnd() * 16;
        g.fillStyle = rnd() < 0.5 ? 'rgba(155,231,255,0.5)' : 'rgba(200,170,255,0.5)';
        g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + h * 0.3, y); g.lineTo(x, y + h * 0.3); g.lineTo(x - h * 0.3, y); g.closePath(); g.fill();
      }
    },
    black(g, rnd) { g.fillStyle = 'rgba(120,120,160,0.12)'; for (let i = 0; i < 18; i++) g.fillRect(rnd() * W, rnd() * TILE, 3, 3); },
    living(g, rnd) {   // vines
      g.strokeStyle = 'rgba(110,190,80,0.45)'; g.lineWidth = 3; g.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        let x = rnd() * W, y = rnd() * TILE * 0.4; g.beginPath(); g.moveTo(x, y);
        for (let j = 0; j < 5; j++) { x += (rnd() - 0.5) * 16; y += 22 + rnd() * 10; g.lineTo(x, y); }
        g.stroke();
        g.fillStyle = 'rgba(140,220,90,0.5)'; g.fillRect(x - 4, y - 1, 8, 3);
      }
    },
    angry(g, rnd) {   // dark crimson veins
      g.strokeStyle = 'rgba(255,90,120,0.22)'; g.lineWidth = 3;
      for (let i = 0; i < 8; i++) { let x = rnd() * W, y = rnd() * TILE; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (rnd() - 0.3) * 40; y += (rnd() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
    },
    hot(g, rnd) {   // thin lava veins: the wall is dark and its cracks are bright
      for (const [w, a] of [[7, 0.12], [3, 0.9]]) {
        g.strokeStyle = `rgba(255,122,26,${a})`; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
        const r2 = seeded(31);
        for (let i = 0; i < 7; i++) { let x = r2() * W, y = r2() * TILE; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += (r2() - 0.4) * 50; y += (r2() - 0.5) * 36; g.lineTo(x, y); } g.stroke(); }
      }
    },
  };
  const decorOf = id => {
    let c = decor.get(id);
    if (!c) { c = canvas(W, TILE); (DECOR[id] || DECOR.black)(c.getContext('2d'), seeded(id.length * 17 + id.charCodeAt(0))); decor.set(id, c); }
    return c;
  };
  function drawBack(g, s) {
    const first = Math.floor(fx.cam) - 2, last = first + 14;
    const par = (fx.cam * CELL * 0.55) % TILE;   // the wall moves slower than the blocks
    let r = first;
    while (r < last) {
      const id = lid(s, r);
      let e = r + 1; while (e < last && lid(s, e) === id) e++;
      const y = yOf(r), h = (e - r) * CELL + 1;
      g.fillStyle = pal(id).back; g.fillRect(-20, y, W + 40, h);
      g.save(); g.beginPath(); g.rect(0, y, W, h); g.clip();
      g.globalAlpha = id === 'hot' ? 0.8 + 0.2 * Math.sin(T() * 2) : 1;
      const t = decorOf(id);
      for (let yy = -par - TILE; yy < H; yy += TILE) if (yy + TILE > y && yy < y + h) g.drawImage(t, 0, yy);
      if (id === 'angry') { g.globalAlpha = 0.05 + 0.05 * Math.sin(T() * 1.6); g.fillStyle = '#ff3a5a'; g.fillRect(0, y, W, h); }
      g.restore();
      r = e;
    }
  }

  // ---------- strata at the Big Rocks, light that falls off, drifting things, the ruler ----------
  const jag = (g, y, rnd, amp) => { g.beginPath(); g.moveTo(-10, y); for (let x = 0; x <= W + 20; x += 18) g.lineTo(x, y + (rnd() - 0.5) * amp); };
  function drawStrata(g, s) {   // a seam above and below each Big Rock; the old ground's dark fades out under it
    const lo = Math.ceil((fx.cam - 2) / LAYER), hi = Math.floor((fx.cam + 10) / LAYER);
    for (let k = Math.max(1, lo); k <= hi; k++) {
      const b = k * LAYER, up = pal(lid(s, b - 1)), dn = pal(lid(s, b));
      const yT = yOf(b), yB = yOf(b + 1), rnd = seeded(k * 13 + 1);
      const fade = g.createLinearGradient(0, yB, 0, yB + 44);
      fade.addColorStop(0, rgba(up.hard, 0.55)); fade.addColorStop(1, rgba(up.hard, 0));
      g.fillStyle = fade; g.fillRect(0, yB, W, 44);
      g.lineJoin = 'round';
      jag(g, yT, rnd, 5); g.strokeStyle = up.glow; g.globalAlpha = 0.45; g.lineWidth = 3; g.stroke();
      jag(g, yB, rnd, 5); g.strokeStyle = dn.glow; g.globalAlpha = 0.75; g.lineWidth = 4; g.stroke();
      g.globalAlpha = 1;
    }
  }

  let vignette = null, shaft = null;
  function drawLight(g) {
    if (!vignette) {
      vignette = canvas(W, H);
      const v = vignette.getContext('2d'), gr = v.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, W * 0.72);
      gr.addColorStop(0, 'rgba(4,2,8,0)'); gr.addColorStop(1, 'rgba(4,2,8,1)');
      v.fillStyle = gr; v.fillRect(0, 0, W, H);
    }
    const a = Math.min(0.5, 0.05 * Math.max(0, (fx.cam + 4) / LAYER - 1));   // from 50 m, 5% more dark at the edges per layer
    if (a > 0.004) { g.globalAlpha = a; g.drawImage(vignette, 0, 0); g.globalAlpha = 1; }
    if (fx.cam < 10) {   // a shaft of daylight for the first 10 m
      if (!shaft) { shaft = g.createLinearGradient(0, 0, 0, CELL * 7); shaft.addColorStop(0, 'rgba(255,244,200,0.22)'); shaft.addColorStop(1, 'rgba(255,244,200,0)'); }
      g.save(); g.translate(0, -fx.cam * CELL + SKY); g.globalAlpha = 1 - fx.cam / 10; g.fillStyle = shaft;
      g.beginPath(); g.moveTo(W - 150, 0); g.lineTo(W - 60, 0); g.lineTo(W - 280, CELL * 7); g.lineTo(W - 470, CELL * 7); g.closePath(); g.fill(); g.restore();
    }
    const fog = g.createLinearGradient(0, H - CELL * 2.2, 0, H);   // the bottom of the view is a promise
    fog.addColorStop(0, 'rgba(8,5,12,0)'); fog.addColorStop(1, 'rgba(8,5,12,0.6)');
    g.fillStyle = fog; g.fillRect(-20, H - CELL * 2.2, W + 40, CELL * 2.2 + 20);
  }
  function drawDrift(g, s) {   // few things drift in the layer you are in: drips, sparkles, spores, embers. None if motion is reduced.
    if (reduced) return;
    const id = lid(s, Math.floor(fx.cam + 4)), t = fx.t;
    if (id === 'sand' || id === 'clay' || id === 'black' || id === 'angry') return;
    for (let i = 0; i < 7; i++) {
      const x = (i * 97 + 40) % W, ph = (t * (id === 'slate' ? 0.5 : 0.18) + i * 0.37) % 1;
      if (id === 'slate') { g.fillStyle = 'rgba(150,230,240,0.7)'; g.beginPath(); g.arc(x, SKY + ph * (H - SKY), 2.2, 0, 7); g.fill(); }
      else if (id === 'deep') { const a = Math.sin(t * 3 + i * 2) * 0.5 + 0.5, yy = SKY + ((i * 131) % (H - SKY)); g.fillStyle = `rgba(210,240,255,${a * 0.8})`; g.fillRect(x - 2, yy - 0.7, 4, 1.4); g.fillRect(x - 0.7, yy - 2, 1.4, 4); }
      else if (id === 'living') { g.fillStyle = 'rgba(184,242,122,0.55)'; g.beginPath(); g.arc(x + Math.sin(t + i) * 10, H - ph * (H - SKY), 2, 0, 7); g.fill(); }
      else if (id === 'hot') { g.fillStyle = `rgba(255,${120 + i * 15},40,${0.75 * (1 - ph)})`; g.fillRect(x + Math.sin(t * 2 + i) * 8, H - ph * (H - SKY), 3, 3); }
    }
  }

  function drawRuler(g, s) {   // fixed to the screen: layer bands, a tick every 5 m, a number every 25 m, a rock at each Big Rock, you
    const x = 6, w = 14, y0 = SKY + 10, len = H - SKY - 20, ppm = len / RULER_MAX;
    g.save();
    g.fillStyle = 'rgba(8,6,10,0.62)'; g.beginPath(); g.roundRect(x - 3, y0 - 6, w + 28, len + 12, 6); g.fill();
    const Ls = layersOf(s.land);
    for (let i = 0; i * LAYER < RULER_MAX; i++) {
      const L = pal(Ls[Math.min(i, Ls.length - 1)].id);
      g.fillStyle = L.dirt; g.fillRect(x, y0 + i * LAYER * ppm, w, LAYER * ppm + 0.5);
      g.fillStyle = L.back; g.fillRect(x, y0 + i * LAYER * ppm, 3, LAYER * ppm + 0.5);
    }
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1;
    g.font = '700 9px system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
    for (let m = 0; m <= RULER_MAX; m += 5) {
      const y = y0 + m * ppm, major = m % LAYER === 0;
      g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w - (major ? 8 : 4), y); g.stroke();
      if (major && m > 0 && m < RULER_MAX) g.fillText(String(m), x + w + 3, y);
    }
    for (let k = 1; k * LAYER < RULER_MAX; k++) {
      const y = y0 + k * LAYER * ppm, done = (s.bossesDown || 0) >= k;
      g.fillStyle = done ? '#6b6560' : '#d9d2c4'; g.strokeStyle = '#1b1410'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x - 1, y + 4); g.lineTo(x + 1, y - 3); g.lineTo(x + 6, y - 5); g.lineTo(x + 10, y - 1); g.lineTo(x + 8, y + 4); g.closePath(); g.fill(); g.stroke();
    }
    const yy = y0 + Math.min(RULER_MAX, Math.max(0, s.best)) * ppm;
    g.fillStyle = '#ffd23f'; g.strokeStyle = '#1b1410'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x - 4, yy - 5); g.lineTo(x + 5, yy); g.lineTo(x - 4, yy + 5); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,210,63,0.9)'; g.fillRect(x + 3, yy - 1, w - 3, 2);
    g.restore();
  }

  return { drawSky, drawBack, drawStrata, drawLight, drawDrift, drawRuler };
}
