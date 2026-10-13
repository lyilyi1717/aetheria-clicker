// Dig worldmap: painting. One 2D canvas, no image files: the lands are drawn once each into a cache (sky, horizon from
// look/zones.js, ground), then the paths, stones, medals and the little digger are drawn over them each frame.
import { makeZoneProps } from '../look/zones.js';
import { icon } from '../../ui/icons.js';
import * as G from '../../game.js';
import { PW, HH, SKYY, pathPoints } from './layout.js';

const { t } = G;

// ---------- the lands ----------
const LOOK = {
  arabia:  { sky: ['#2b6cb0', '#8fc1e3', '#f6d9a0'], ground: ['#e3be78', '#c99a52'], dot: '#a87a38' },
  africa:  { sky: ['#e6894a', '#f4b868', '#f9dca0'], ground: ['#c07f40', '#9a5f2c'], dot: '#7a4a20' },
  eastasia: { sky: ['#8db4bd', '#c3d8d8', '#eef2ea'], ground: ['#7fa872', '#5f8a58'], dot: '#456b40' },
  americas: { sky: ['#6aa9d4', '#a9d0e2', '#f4e6bd'], ground: ['#b4623a', '#8c4526'], dot: '#6a3018' },
  europe:  { sky: ['#8aa8c4', '#bcd0e0', '#e4ecf2'], ground: ['#6aa35a', '#4d8545'], dot: '#356a30' },
  beyond:  { sky: ['#140f2c', '#3a2a63', '#7a4f8e'], ground: ['#352a52', '#241c3a'], dot: '#4d3e75' },
};
const sun = (g, x, y, r, col, halo) => {
  g.fillStyle = halo; g.beginPath(); g.arc(x, y, r * 1.55, 0, 7); g.fill();
  g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
};
// a small deterministic shuffle so a land looks the same each time
const lcg = seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

function arabiaHorizon(g) {
  sun(g, PW - 150, 52, 30, '#fff3c4', 'rgba(255,240,180,0.35)');
  const dune = (col, base, amp, ph) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, SKYY);
    for (let x = 0; x <= PW; x += 14) g.lineTo(x, SKYY - base - Math.abs(Math.sin(x / 90 + ph)) * amp);
    g.lineTo(PW, SKYY); g.closePath(); g.fill();
  };
  dune('#d9a95a', 26, 24, 0.6); dune('#e3be78', 12, 14, 2.4);
  g.strokeStyle = '#5b3a1a'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(560, SKYY - 6); g.quadraticCurveTo(552, SKYY - 36, 564, SKYY - 66); g.stroke();
  g.strokeStyle = '#2f7d3a'; g.lineWidth = 4;
  for (const a of [-2.7, -2.1, -1.2, -0.5, 0.1]) { g.beginPath(); g.moveTo(564, SKYY - 66); g.quadraticCurveTo(564 + Math.cos(a) * 18, SKYY - 78 + Math.sin(a) * 12, 564 + Math.cos(a) * 30, SKYY - 62 + Math.sin(a) * 16); g.stroke(); }
}
function beyondHorizon(g) {
  const r = lcg(7);
  g.fillStyle = '#fff';
  for (let i = 0; i < 70; i++) { g.globalAlpha = 0.3 + r() * 0.7; g.fillRect(r() * PW, r() * (SKYY - 20), 1.6, 1.6); }
  g.globalAlpha = 1;
  sun(g, 520, 70, 26, '#e8dcff', 'rgba(200,170,255,0.25)');
  g.fillStyle = '#271d44'; g.beginPath(); g.moveTo(0, SKYY);
  for (let x = 0; x <= PW; x += 20) g.lineTo(x, SKYY - 20 - Math.abs(Math.sin(x / 53)) * 38);
  g.lineTo(PW, SKYY); g.closePath(); g.fill();
}

const SCENE = new Map();
export function scenery(zone) {
  if (SCENE.has(zone)) return SCENE.get(zone);
  const cv = document.createElement('canvas'); cv.width = PW; cv.height = HH;
  const g = cv.getContext('2d'), L = LOOK[zone] || LOOK.arabia;
  const sky = g.createLinearGradient(0, 0, 0, SKYY);
  sky.addColorStop(0, L.sky[0]); sky.addColorStop(0.65, L.sky[1]); sky.addColorStop(1, L.sky[2]);
  g.fillStyle = sky; g.fillRect(0, 0, PW, SKYY + 2);
  if (zone === 'arabia') arabiaHorizon(g);
  else if (zone === 'beyond') beyondHorizon(g);
  else makeZoneProps({ W: PW, SKY: SKYY, sun })[zone](g);
  const gr = g.createLinearGradient(0, SKYY, 0, HH);
  gr.addColorStop(0, L.ground[0]); gr.addColorStop(1, L.ground[1]);
  g.fillStyle = gr; g.fillRect(0, SKYY, PW, HH - SKYY);
  g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(0, SKYY, PW, 5);
  const r = lcg(zone.length * 31 + zone.charCodeAt(0));
  g.fillStyle = L.dot;
  for (let i = 0; i < 90; i++) { g.globalAlpha = 0.12 + r() * 0.18; g.beginPath(); g.ellipse(r() * PW, SKYY + 14 + r() * (HH - SKYY - 20), 2 + r() * 5, 1 + r() * 2, 0, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  SCENE.set(zone, cv);
  return cv;
}

// ---------- small drawn icons as images ----------
const IMGS = new Map();
export function imgFor(id, redraw) {
  let im = IMGS.get(id);
  if (!im) {
    im = new Image(); im.ready = false;
    im.onload = () => { im.ready = true; if (redraw) redraw(); };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(icon(id, 64).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
    IMGS.set(id, im);
  }
  return im;
}
const MEDALS = ['fin', 'fast', 'hard'];
function pic(g, id, x, y, size, redraw, alpha = 1, grey = false) {
  const im = imgFor(id, redraw);
  if (!im.ready) return;
  g.save(); g.globalAlpha *= alpha; if (grey) g.filter = 'grayscale(1)';
  g.drawImage(im, x - size / 2, y - size / 2, size, size); g.restore();
}

// ---------- paths ----------
const PTS = new Map();
const ptsOf = e => { let p = PTS.get(e); if (!p) { p = pathPoints(e); PTS.set(e, p); } return p; };
// the point a share (0 to 1) of the way along a path
export function along(e, u) {
  const p = ptsOf(e), f = Math.max(0, Math.min(1, u)) * (p.length - 1), i = Math.min(p.length - 2, Math.floor(f)), k = f - i;
  return { x: p[i].x + (p[i + 1].x - p[i].x) * k, y: p[i].y + (p[i + 1].y - p[i].y) * k };
}
function drawPath(g, e, progress, faint) {
  const p = ptsOf(e), n = p.length;
  for (let i = 1; i < n - 1; i++) {
    if (i / (n - 1) > progress + 1e-6) break;
    const q = p[i];
    g.beginPath();
    if (faint) { g.fillStyle = 'rgba(255,255,255,0.22)'; g.arc(q.x, q.y, 2.2, 0, 7); g.fill(); continue; }
    const sea = e.kind === 'sea';
    g.fillStyle = sea ? '#bff1ff' : '#ffd23f'; g.strokeStyle = sea ? '#1d5e7a' : '#5a3a10'; g.lineWidth = 1.5;
    g.arc(q.x, q.y, sea ? 3 : 3.6, 0, 7); g.fill(); g.stroke();
  }
}

// ---------- nodes ----------
const fit = (g, text, w) => { let s = text; while (s.length > 3 && g.measureText(s).width > w) s = s.slice(0, -2) + '.'; return s; };
function drawNode(g, n, v, nm) {
  const time = v.time, redraw = v.redraw;
  const go = n === v.go;
  const r = n.r, pulse = 0.5 + 0.5 * Math.sin(time * 4);
  g.save();
  g.translate(n.x, n.y);
  g.globalAlpha = n.alpha == null ? 1 : n.alpha;
  if (n.type === 'town') {            // Alqahwa: a little Gulf coffee house with a dome, an arch door, a striped awning and a coffee pot sign
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(0, 20, 38, 9, 0, 0, 7); g.fill();
    if (v.sel === n) { g.fillStyle = `rgba(255,214,70,${0.2 + 0.2 * pulse})`; g.beginPath(); g.arc(0, 0, 44 + 4 * pulse, 0, 7); g.fill(); }
    g.lineJoin = 'round'; g.strokeStyle = '#2b1a0c'; g.lineWidth = 3;
    g.fillStyle = '#e9cf96'; g.beginPath(); g.rect(-30, -8, 60, 28); g.fill(); g.stroke();                      // the walls
    g.fillStyle = '#d9b877'; g.beginPath(); g.rect(-32, -13, 64, 7); g.fill(); g.stroke();                      // the flat roof edge
    g.fillStyle = '#c9743a'; g.beginPath(); g.moveTo(-14, -13); g.quadraticCurveTo(-14, -34, 0, -34); g.quadraticCurveTo(14, -34, 14, -13); g.closePath(); g.fill(); g.stroke();   // the dome
    g.strokeStyle = '#2b1a0c'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -34); g.lineTo(0, -41); g.stroke();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, -42, 2.6, 0, 7); g.fill();
    g.fillStyle = '#3a2412'; g.beginPath(); g.moveTo(-7, 20); g.lineTo(-7, 6); g.quadraticCurveTo(0, -4, 7, 6); g.lineTo(7, 20); g.closePath(); g.fill();   // the arch door
    g.fillStyle = `rgba(255,200,90,${0.55 + 0.2 * pulse})`; g.beginPath(); g.arc(0, 13, 3, 0, 7); g.fill();     // a warm light inside
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#fff6e0' : '#d7332b'; g.beginPath(); g.moveTo(-30 + i * 10, -8); g.lineTo(-20 + i * 10, -8); g.lineTo(-22 + i * 10, -1); g.lineTo(-28 + i * 10, -1); g.closePath(); g.fill(); }
    g.strokeStyle = '#2b1a0c'; g.lineWidth = 2; g.strokeRect(-30, -8, 60, 7);
    g.fillStyle = '#ffd23f'; g.lineWidth = 2; g.beginPath(); g.moveTo(17, 4); g.lineTo(27, 4); g.lineTo(25, 15); g.lineTo(19, 15); g.closePath(); g.fill(); g.stroke();   // a coffee pot on the wall
    g.beginPath(); g.moveTo(17, 7); g.quadraticCurveTo(12, 7, 14, 12); g.stroke();
    if (!v.still) {            // steam
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2; g.lineCap = 'round';
      for (let i = 0; i < 2; i++) { const w = Math.sin(time * 2 + i * 2) * 2; g.beginPath(); g.moveTo(21 + i * 3, 0); g.quadraticCurveTo(19 + w + i * 3, -5, 22 + i * 3, -9); g.stroke(); }
    }
    if (n.stars > 0) {         // Stars to spend: a gold star over the roof
      g.fillStyle = '#ffd23f'; g.strokeStyle = '#7a5a00'; g.lineWidth = 2; g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 4.5 : 10; g.lineTo(-30 + Math.cos(a) * rr, -30 + Math.sin(a) * rr); }
      g.closePath(); g.fill(); g.stroke();
    }
  } else if (n.type === 'island') {          // sand in a ring of water
    g.fillStyle = 'rgba(40,130,170,0.55)'; g.beginPath(); g.ellipse(0, 6, r + 26, r + 12, 0, 0, 7); g.fill();
    if (go) { g.fillStyle = `rgba(255,214,70,${0.25 + 0.25 * pulse})`; g.beginPath(); g.ellipse(0, 4, r + 20, r + 10, 0, 0, 7); g.fill(); }
    g.fillStyle = '#e8d49a'; g.strokeStyle = '#6a4a1a'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 2, r + 8, r, 0, 0, 7); g.fill(); g.stroke();
    pic(g, 'site_' + n.site, 0, -2, 28, redraw);
  } else {
    if (go) { g.fillStyle = `rgba(255,214,70,${0.22 + 0.22 * pulse})`; g.beginPath(); g.arc(0, 0, r + 12 + 5 * pulse, 0, 7); g.fill(); }
    else if (n.type === 'side' || n.type === 'beyond') { g.fillStyle = `rgba(120,230,214,${0.14 + 0.12 * pulse})`; g.beginPath(); g.arc(0, 0, r + 8, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(0, r * 0.7, r, r * 0.42, 0, 0, 7); g.fill();
    const base = nm.locked ? '#7b746c' : go ? '#ffd23f' : n.type === 'hub' ? '#a77fe0' : (n.type === 'side' || n.type === 'beyond') ? '#5fd0c4' : '#7fcf7d';
    g.fillStyle = base; g.strokeStyle = '#2b1a0c'; g.lineWidth = 3.5;
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.stroke();
    const gr = g.createRadialGradient(-r * 0.35, -r * 0.4, 1, 0, 0, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.45)'); gr.addColorStop(0.6, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.18)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r - 1.5, 0, 7); g.fill();
    if (n.prove) {          // the hammered rim of a hard-ground level
      g.strokeStyle = nm.locked ? '#4a4540' : '#8c2a1a'; g.lineWidth = 3; g.setLineDash([5, 4]);
      g.beginPath(); g.arc(0, 0, r + 5, 0, 7); g.stroke(); g.setLineDash([]);
    }
    if (n.type === 'road') {
      g.fillStyle = nm.locked ? '#2f2a26' : '#1d1208'; g.font = '800 19px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(n.level), 0, 1);
    } else if (n.type === 'hub') {
      pic(g, 'gate', 0, 0, 30, redraw, nm.locked ? 0.45 : 1, nm.locked);
    } else pic(g, 'site_' + n.site, 0, 0, 28, redraw);
  }
  if (v.sel === n) { g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.setLineDash([3, 3]); g.beginPath(); g.arc(0, n.type === 'island' ? 2 : 0, r + 17, 0, 7); g.stroke(); g.setLineDash([]); }
  // medals under a stone that has been played
  let y = r + 14;
  if (nm.pips) {
    y = r + 17;
    MEDALS.forEach((k, i) => {
      const age = nm.pop ? nm.pop[i] : 99;
      if (age < 0) { pic(g, 'medal_' + k, (i - 1) * 17, y - 4, 15, redraw, 0.28, true); return; }
      const on = n.stamp && n.stamp[k];
      const sc = on && age < 0.3 ? 1 + 0.9 * Math.sin(Math.PI * age / 0.3) : 1;
      pic(g, 'medal_' + k, (i - 1) * 17, y - 4, 15 * sc, redraw, on ? 1 : 0.28, !on);
    });
    y += 17;
  }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 12.5px system-ui, sans-serif';
  const w = 132;
  g.lineWidth = 3.5; g.lineJoin = 'round'; g.strokeStyle = 'rgba(20,12,6,0.85)'; g.fillStyle = nm.locked ? '#d8cdbd' : '#fff6e0';
  if (nm.name) { const s = fit(g, nm.name, w); g.strokeText(s, 0, y); g.fillText(s, 0, y); y += 14; }
  g.font = '600 11.5px system-ui, sans-serif'; g.fillStyle = nm.locked ? '#c9bfae' : '#ffe9a8';
  if (nm.sub) { const s = fit(g, nm.sub, w); g.strokeText(s, 0, y); g.fillText(s, 0, y); }
  g.restore();
}

// ---------- the digger ----------
function drawDigger(g, x, y, bob, redraw) {
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x, y + 2, 11, 4, 0, 0, 7); g.fill();
  pic(g, 'wm_digger', x, y - 14 - bob, 38, redraw);
}

// ---------- land signs ----------
function drawSign(g, p, text, sub) {
  g.save(); g.translate(p.x + 18, 16);
  g.font = '800 17px system-ui, sans-serif'; const w1 = g.measureText(text).width;
  g.font = '600 12px system-ui, sans-serif'; const w = Math.max(w1, g.measureText(sub).width) + 24;
  g.fillStyle = 'rgba(24,14,8,0.82)'; g.strokeStyle = '#ffd23f'; g.lineWidth = 2;
  g.beginPath(); g.roundRect(0, 0, w, 44, 10); g.fill(); g.stroke();
  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.font = '800 17px system-ui, sans-serif'; g.fillStyle = '#ffd23f'; g.fillText(text, 12, 14);
  g.font = '600 12px system-ui, sans-serif'; g.fillStyle = '#e8dcc6'; g.fillText(sub, 12, 31);
  g.restore();
}

// ---------- the whole picture ----------
// v: { camX, vw (world units wide), k (scale), dpr, time, sel, go, redraw, hold (walk in progress: { edge, target, progress }),
//      marker: {x,y,bob} | null, bursts, pop: { nodeId, ages }, fade (alpha of what hangs on the target) }
export function paint(g, map, v) {
  const k = v.k * v.dpr;
  g.setTransform(k, 0, 0, k, -v.camX * k, 0);
  g.clearRect(v.camX, 0, v.vw, HH);
  for (const p of map.panels) if (p.x + PW >= v.camX - 2 && p.x <= v.camX + v.vw + 2) g.drawImage(scenery(p.zone), p.x, 0);
  for (const p of map.panels) {
    if (p.x + PW < v.camX || p.x > v.camX + v.vw) continue;
    if (p.zone === 'beyond') drawSign(g, p, t('wm_beyond'), t('wm_beyond_sub'));
    else {
      const done = Math.max(0, Math.min(p.last, map.nextIdx) - p.first + 1);
      drawSign(g, p, t('look_zone_' + p.zone), t('wm_land_sub', { a: p.first, b: p.last, n: done, of: p.last - p.first + 1 }));
    }
  }
  const hold = v.hold;
  for (const e of map.edges) {
    if (hold && hold.edge === e) { drawPath(g, e, 1, true); drawPath(g, e, hold.progress, false); continue; }
    if (hold && e.kind === 'side' && e.from === hold.target) { if (v.fade > 0) { g.save(); g.globalAlpha = v.fade; drawPath(g, e, 1, false); g.restore(); } continue; }
    drawPath(g, e, 1, !e.open);
  }
  const order = map.nodes.slice().sort((a, b) => a.y - b.y);
  for (const n of order) {
    const heldTarget = !!hold && hold.target === n;
    const hangs = !!hold && map.edges.some(e => e.kind === 'side' && e.to === n && e.from === hold.target);
    if (hangs && v.fade <= 0) continue;
    n.alpha = hangs ? v.fade : 1;
    const locked = n.state === 'locked' || heldTarget;
    const st = n.stamp;
    const nm = { locked, name: '', sub: '', pop: v.pop && v.pop.nodeId === n.id ? v.pop.ages : null,
      pips: !locked && n.type !== 'island' && n.type !== 'hub' && (n.state === 'done' || !!(st && (st.fin || st.fast || st.hard || st.n))) };
    if (n.type === 'town') { nm.name = t('wm_town'); nm.sub = t('wm_town_sub'); }
    else if (n.type === 'road') { nm.name = t('site_' + n.site); nm.sub = n.prove ? t('wm_hard_ground', { n: n.floor }) : t('wm_depth', { n: n.floor }); }
    else if (n.type === 'hub') nm.name = t('wm_beyond');
    else { nm.name = t('site_' + n.site) + (n.twist ? ', ' + t('twist_' + n.twist) : ''); nm.sub = n.floor ? t('wm_depth', { n: n.floor }) : t('wm_island'); }
    drawNode(g, n, { ...v, go: heldTarget ? null : v.go }, nm);
  }
  g.globalAlpha = 1;
  for (const b of v.bursts || []) {
    g.globalAlpha = Math.max(0, b.life / b.max); g.fillStyle = b.col;
    g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  if (v.marker) drawDigger(g, v.marker.x, v.marker.y, v.marker.bob || 0, v.redraw);
}
