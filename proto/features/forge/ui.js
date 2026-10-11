// Dig feature (page side): The Forge. The arrival, the shop panel, the three tools' big moments
// (a drill bit that eats down the column, a stick of dynamite with a spark, ore flying to the magnet),
// and a charge badge with a fill bar on each tool button.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { shopPanel } from '../../ui/shop.js';
import { fx, AT, CELL, centre, yOf, ring, spark, shake, screenFlash } from '../../ui/render.js';
import { gap, tone, noise } from '../../ui/audio.js';
import { S, badge, star } from '../../ui/icons.js';

const { t, fmt } = G;

// ---------- icons ----------
const DRILL = `<path d="M10 8 H22 L16 28 Z" fill="#cfd8dc" ${S}/><path d="M12 13 L19 11 M13 18 L20 16 M14.5 23 L18.5 21.5" stroke="#5a6b75" stroke-width="1.8" stroke-linecap="round"/><rect x="11" y="3" width="10" height="6" rx="2" fill="#e8742c" ${S}/>`;
const DYNAMITE = `<rect x="7" y="12" width="7" height="15" rx="2" fill="#d7332b" ${S}/><rect x="15" y="12" width="7" height="15" rx="2" fill="#d7332b" ${S}/><rect x="7" y="17" width="15" height="4" fill="#f3e6c8" ${S}/><path d="M18 12 Q18 6 24 5" fill="none" ${S}/>${star(24, 5, 3.6, 1.5, 6, '#ffe14a')}`;
const MAGNET = `<path d="M8 25 V14 A8 8 0 0 1 24 14 V25" fill="none" stroke="#1b1410" stroke-width="8" stroke-linecap="round"/><path d="M8 25 V14 A8 8 0 0 1 24 14 V25" fill="none" stroke="#d7332b" stroke-width="5" stroke-linecap="round"/><path d="M5.5 25 H10.5 M21.5 25 H26.5" stroke="#f3f3f3" stroke-width="5" stroke-linecap="butt"/>`;

ui({
  id: 'forge',
  css: new URL('./forge.css', import.meta.url).href,
  icons: {
    metal: `<path d="M5 21 L9 11 H23 L27 21 Z" fill="#c9d3da" ${S}/><path d="M9 11 L12 15 H20 L23 11" fill="#eef3f6" ${S}/><path d="M5 21 H27 V25 H5 Z" fill="#8a96a0" ${S}/>`,
    tool_drill: badge('#5b6f7c', DRILL), up_drill: badge('#5b6f7c', DRILL),
    tool_dynamite: badge('#8a2a22', DYNAMITE), up_dynamite: badge('#8a2a22', DYNAMITE),
    tool_magnet: badge('#3b6ea8', MAGNET), up_magnet: badge('#3b6ea8', MAGNET),
  },
  sfx: {
    forgeOpen() {   // an anvil and a chord
      noise({ d: 0.25, vol: 0.4, from: 6000, to: 900 });
      tone(880, { type: 'triangle', d: 0.9, vol: 0.2 });
      [523, 659, 784].forEach((f, i) => tone(f, { type: 'square', d: 0.4, vol: 0.08, at: 0.12 + i * 0.1 }));
    },
    forgeDrill() {  // a whirr that climbs, then a grind
      noise({ d: 0.55, vol: 0.4, from: 900, to: 6000 });
      tone(90, { type: 'sawtooth', d: 0.6, vol: 0.28, slide: 380 });
      tone(60, { type: 'square', d: 0.5, vol: 0.12, at: 0.1, slide: 30 });
    },
    forgeFuse() {
      noise({ d: 0.9, vol: 0.12, from: 7000, to: 3500 });
      tone(1500, { type: 'square', d: 0.05, vol: 0.05 }); tone(1200, { type: 'square', d: 0.05, vol: 0.04, at: 0.07 });
    },
    forgeBoom() {   // under the blast: a low thump
      tone(70, { type: 'sine', d: 0.7, vol: 0.55, slide: -40 });
      noise({ d: 0.9, vol: 0.5, from: 1400, to: 40 });
    },
    forgePull() {   // a swoosh up, a ping
      tone(180, { type: 'sine', d: 0.4, vol: 0.3, slide: 900 });
      noise({ d: 0.35, vol: 0.18, from: 500, to: 5000 });
      tone(1760, { type: 'triangle', d: 0.25, vol: 0.1, at: 0.28 });
    },
    forgeCharge() { if (gap('forgeCharge', 0.2)) { tone(1047, { type: 'triangle', d: 0.12, vol: 0.12 }); tone(1568, { type: 'triangle', d: 0.25, vol: 0.12, at: 0.08 }); } },
  },
  panels: [(() => {
    const base = shopPanel({ id: 'forge', shop: 'forge', title: 'forge', coin: 'metal', side: 'right', at: 85, when: s => s.forgeOn });
    let info;
    return {
      ...base,
      build(el, app) { base.build(el, app); info = document.createElement('p'); info.className = 'muted forge-ore'; el.appendChild(info); },
      update(el, s, app) {
        base.update(el, s, app);
        info.textContent = `${t('metal')}: ${fmt(s.metal)}.  ` + t('forge_ore', s.ore);
      },
    };
  })()],
  items: Object.fromEntries(['drill', 'dynamite', 'magnet'].map(id => [id, { desc: (s, lv) => t(`up_${id}_d${Math.min(lv, 3) + 1}`) }])),
  on: {
    forgeOpen(d, app) {
      const [x, y] = centre(d.r, d.c);
      ring(x, y, CELL * 2, '#ffb347'); spark(x, y, '#ffb347', 40);
      shake(0.35); screenFlash('#ffb347', 0.3);
      app.banner(t('forge_open'), t('forge_open_sub')); app.sfx.forgeOpen();
      setTimeout(() => app.toast(t('t_forge'), 'gold'), 1500);
      app.dirty('forge');
    },
    buy(d, app) {
      if (d.shop !== 'forge') return;
      if (d.level === 1) app.toast(t('t_tool_try', { key: G.TOOLS[d.id].key }), 'gold');
      app.sfx.forgeCharge(); pulse(d.id); app.dirty('forge');
    },
    forgeCharge(d, app) { app.sfx.forgeCharge(); pulse(d.id); },
    forgeDrill(d, app) {
      const k = Math.max(1, d.r1 - d.r + 1);
      drills.push({ c: d.c, r0: d.r, r1: d.r1, t: 0, dur: d.gap * k, side: d.side, lv: d.lv });
      const [x, y] = centre(d.r, d.c);
      ring(x, y, CELL * 1.2, '#cfd8dc'); spark(x, y, '#ffe14a', 16);
      shake(0.45); app.hitStop(0.04); app.sfx.forgeDrill();
    },
    forgeDynPlace(d, app) {
      throws.push({ r: d.r, c: d.c, from: d.from, t: 0 });
      app.sfx.forgeFuse(); shake(0.08);
    },
    forgeBoom(d, app) {
      const [x, y] = centre(d.r, d.c);
      ring(x, y, CELL * (d.rad + 2), '#ff7a2c'); ring(x, y, CELL * (d.rad + 0.6), '#fff'); spark(x, y, '#ffe14a', 40);
      shake(0.55); screenFlash('#ffe3a0', 0.35); app.hitStop(0.1); app.sfx.forgeBoom();
    },
    forgePull(d, app) {
      pulls.push({ r: d.r, c: d.c, cells: d.cells, lead: d.lead, gap: d.gap, t: 0 });
      const [x, y] = centre(d.r, d.c);
      ring(x, y, CELL * 3.5, '#8fb7ff'); ring(x, y, CELL * 2, '#fff');
      if (d.cells.length) shake(0.12 + Math.min(0.25, d.cells.length * 0.03));
      app.sfx.forgePull();
    },
  },
  draw: [
    // the tool effects, inside the shake
    { at: AT.fx + 10, fn(g, s, dt) {
      drawDrills(g, dt); drawPulls(g, s, dt);
    } },
    { at: AT.actors + 10, fn(g, s, dt) { drawDynamite(g, s, dt); } },
  ],
  tick(s, app) { badges(s); },
});

// ---------- the tool bar badges ----------

function pulse(id) {
  const b = document.querySelector(`#tools .tool[data-id="${id}"]`);
  if (!b) return;
  b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
}
function badges(s) {
  for (const b of document.querySelectorAll('#tools .tool')) {
    const id = b.dataset.id;
    if (!(id in s.toolCh)) continue;
    let fg = b.querySelector('.fg');
    if (!fg) {
      fg = document.createElement('span'); fg.className = 'fg'; fg.innerHTML = '<u></u>';
      const ch = document.createElement('em'); ch.className = 'ch';
      b.append(fg, ch);
    }
    const full = s.toolCh[id] >= G.PARAMS.forge.cap;
    fg.style.setProperty('--k', full ? 1 : s.toolFuel[id] / G.PARAMS.forge.need[id]);
    fg.classList.toggle('full', full);
    const ch = b.querySelector('.ch');
    ch.textContent = s.toolCh[id];
    b.classList.toggle('empty', s.toolCh[id] <= 0);
  }
}

// ---------- the drill: a bit that eats down the column ----------

const drills = [], throws = [], pulls = [];

function drawDrills(g, dt) {
  for (let i = drills.length - 1; i >= 0; i--) {
    const d = drills[i];
    d.t += dt;
    const k = Math.min(1, d.t / Math.max(0.01, d.dur));
    if (d.t > d.dur + 0.5) { drills.splice(i, 1); continue; }
    const fade = d.t > d.dur ? 1 - (d.t - d.dur) / 0.5 : 1;
    const x = d.c * CELL + CELL / 2;
    const y0 = yOf(d.r0), y1 = yOf(d.r1) + CELL;
    g.save();
    g.globalAlpha = 0.28 * fade;
    g.fillStyle = '#ffe14a'; g.fillRect(x - CELL / 2, y0, CELL, (y1 - y0) * k);   // the lit path
    g.globalAlpha = fade;
    // the bit
    const by = y0 + (y1 - y0) * k;
    g.translate(x + Math.sin(d.t * 90) * 2, by);
    g.fillStyle = '#cfd8dc'; g.strokeStyle = '#1b1410'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-18, -34); g.lineTo(18, -34); g.lineTo(0, 6); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = '#5a6b75'; g.lineWidth = 3;
    for (let j = 0; j < 4; j++) { const yy = -30 + j * 9 + (d.t * 120) % 9; g.beginPath(); g.moveTo(-14 + j * 3, yy); g.lineTo(14 - j * 3, yy - 5); g.stroke(); }
    g.restore();
    if (k < 1 && Math.random() < 0.8) spark(x, by, '#ffe14a', 2);
    if (k >= 1 && d.side && !d.sideDone) {   // at the bottom it turns and bores sideways
      d.sideDone = true;
      const yy = yOf(d.r1) + CELL / 2;
      for (const sgn of [-1, 1]) for (let j = 1; j <= d.side; j++) spark(x + sgn * j * CELL, yy, '#ffe14a', 6);
    }
  }
}

// ---------- dynamite: drawn from the delayed effects, so a reload cannot lose it ----------

function drawDynamite(g, s, dt) {
  for (let i = throws.length - 1; i >= 0; i--) { throws[i].t += dt; if (throws[i].t > 0.4) throws.splice(i, 1); }
  for (const q of s.queue) {
    if (q.kind !== 'forgeDyn') continue;
    const left = Math.max(0, q.at - s.t), total = G.PARAMS.forge.dynFuse;
    let [x, y] = centre(q.r, q.c);
    const th = throws.find(a => a.r === q.r && a.c === q.c);
    if (th && th.from !== th.r) {
      const k = Math.min(1, th.t / 0.25), [fx0, fy0] = centre(th.from, th.c);
      x += 0; y = fy0 + (y - fy0) * k - Math.sin(k * Math.PI) * 50;
    }
    const k = 1 - left / total;
    const blink = Math.sin(k * k * 60) > 0;
    g.save(); g.translate(x, y);
    if (k > 0.5) g.translate((Math.random() - 0.5) * 2 * k, 0);
    // a glow on the block, faster and redder as it runs out
    g.fillStyle = `rgba(255,${blink ? 80 : 160},40,${0.2 + 0.35 * k})`;
    g.beginPath(); g.arc(0, 0, CELL * (0.5 + 0.35 * k), 0, 7); g.fill();
    g.rotate(-0.25);
    for (const dx of [-8, 8]) {
      g.fillStyle = blink ? '#ff5a4a' : '#d7332b'; g.strokeStyle = '#1b1410'; g.lineWidth = 2.5;
      g.beginPath(); g.roundRect(dx - 7, -20, 14, 40, 4); g.fill(); g.stroke();
    }
    g.fillStyle = '#f3e6c8'; g.fillRect(-15, -4, 30, 8); g.strokeRect(-15, -4, 30, 8);
    g.strokeStyle = '#3d2a1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -20); g.quadraticCurveTo(6, -30, 14, -30 + 12 * k); g.stroke();
    g.fillStyle = '#ffe14a'; g.beginPath(); g.arc(14, -30 + 12 * k, 5 + Math.random() * 3, 0, 7); g.fill();
    g.restore();
    if (Math.random() < 0.7) spark(x + 12, y - 30 + 12 * k, '#ffb347', 1);
  }
}

// ---------- the magnet: every ore block streaks to the pointer, then pops ----------

function drawPulls(g, s, dt) {
  for (let i = pulls.length - 1; i >= 0; i--) {
    const p = pulls[i];
    p.t += dt;
    const end = p.lead + p.gap * p.cells.length + 0.4;
    if (p.t > end) { pulls.splice(i, 1); continue; }
    const [px, py] = centre(p.r, p.c);
    g.save();
    // the field: a ring that tightens
    const kr = Math.max(0, 1 - p.t / (p.lead + 0.2));
    g.strokeStyle = `rgba(143,183,255,${0.7 * kr})`; g.lineWidth = 4;
    g.beginPath(); g.arc(px, py, CELL * 4.5 * kr + 10, 0, 7); g.stroke();
    p.cells.forEach((x, j) => {
      const popAt = p.lead + p.gap * j;
      const [cx, cy] = centre(x.r, x.c);
      const k = Math.min(1, p.t / Math.max(0.01, popAt));
      if (p.t > popAt + 0.12) return;
      // the block slides toward the pointer, a streak behind it
      const ex = cx + (px - cx) * k * 0.55, ey = cy + (py - cy) * k * 0.55;
      g.strokeStyle = `rgba(190,215,255,${0.75 * (1 - k * 0.6)})`; g.lineWidth = 3 + 4 * k;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex, ey); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, 6 + 4 * k, 0, 7); g.fill();
    });
    g.restore();
  }
}
