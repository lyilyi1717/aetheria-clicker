// Dig feature (page side): Crystal. Each crystal is drawn as a long bar with an arrow at both ends, so the
// way it will break reads at a glance; a faint dashed guide shows the whole line on blocks you can hit
// (brighter under the pick). A break sends a travelling crack with a chime that climbs along the line.
import { ui } from '../../ui/app.js';
import { CELL, W, H, AT, fx, yOf, centre, baseBlock, shade, spark, ring, shake } from '../../ui/render.js';
import { gap, tone, pent } from '../../ui/audio.js';
import { reachable, COLS } from '../../core/grid.js';

const ICE = '#8fe3ff', PRISM = '#ffd9ff';

// the bar: a long cut crystal pointing along angle `a`, arrowheads at both ends
function bar(g, a, col, len = 27, half = 9, arrows = true) {
  g.save(); g.translate(CELL / 2, CELL / 2); g.rotate(a);
  const body = g.createLinearGradient(0, -half, 0, half);
  body.addColorStop(0, shade(col, 0.55)); body.addColorStop(0.5, col); body.addColorStop(1, shade(col, -0.35));
  g.beginPath();
  g.moveTo(-len, 0); g.lineTo(-len + 9, -half); g.lineTo(len - 9, -half); g.lineTo(len, 0); g.lineTo(len - 9, half); g.lineTo(-len + 9, half); g.closePath();
  g.fillStyle = body; g.fill(); g.strokeStyle = shade(col, -0.55); g.lineWidth = 2; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 1.4;           // facet lines
  g.beginPath(); g.moveTo(-len + 9, -half); g.lineTo(-len + 14, 0); g.lineTo(-len + 9, half); g.moveTo(len - 9, -half); g.lineTo(len - 14, 0); g.lineTo(len - 9, half); g.stroke();
  g.beginPath(); g.moveTo(-len + 12, -half + 3); g.lineTo(len - 14, -half + 3); g.stroke();
  if (arrows) {                                                          // so it can be read: a bright chevron at each end
    g.strokeStyle = '#fff'; g.lineWidth = 3.4; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const m of [1, -1]) { g.beginPath(); g.moveTo(m * (len - 15), -6); g.lineTo(m * (len - 7), 0); g.lineTo(m * (len - 15), 6); g.stroke(); }
  }
  g.restore();
}
const slate = (g, look, v) => baseBlock(g, shade(look.stone, -0.32), v, 3);

const ANGLE = { crystal_row: 0, crystal_col: Math.PI / 2, crystal_slash: -Math.PI / 4, crystal_back: Math.PI / 4 };
// where each kind breaks, as screen steps (for the guide line)
const DIR = { crystal_row: [[1, 0]], crystal_col: [[0, 1]], crystal_slash: [[-1, 1]], crystal_back: [[1, 1]], crystal_prism: [[1, 0], [0, 1], [-1, 1], [1, 1]] };

const mk = kind => ({
  colour: ICE, rich: true, twinkle: true,
  firstSight: { flag: 'crystalToast', text: 't_crystal', kind: 'gold' },
  sprite(g, look, v) { slate(g, look, v); bar(g, ANGLE[kind], ICE); },
});
const prism = {
  colour: PRISM, rich: true, twinkle: true, glow: '255,217,255',
  firstSight: { flag: 'prismToast', text: 't_prism', kind: 'gold' },
  sprite(g, look, v) {
    slate(g, look, v);
    for (const a of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) bar(g, a, PRISM, 27, 4, false);
    g.save(); g.translate(CELL / 2, CELL / 2);
    g.beginPath(); g.moveTo(0, -13); g.lineTo(11, 0); g.lineTo(0, 13); g.lineTo(-11, 0); g.closePath();
    g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#9a6fb0'; g.lineWidth = 2; g.stroke(); g.restore();
  },
};

const streaks = [];        // the travelling crack: { r, x, ang, life, max, col }

ui({
  id: 'crystal',
  sfx: {
    // a chime that climbs along the line, and higher for each crystal set off by another
    chime(idx) {
      if (!gap('chime', 0.025)) return;
      const f = pent(Math.min(idx, 14) + 5);
      tone(f, { type: 'sine', d: 0.35, vol: 0.12 }); tone(f * 2.01, { type: 'sine', d: 0.2, vol: 0.04, at: 0.01 });
    },
    shatter() { if (gap('shatter', 0.08)) { tone(2093, { type: 'triangle', d: 0.18, vol: 0.09, slide: -900 }); tone(1568, { type: 'sine', d: 0.3, vol: 0.08, at: 0.03 }); } },
  },
  art: {
    crystal_row: mk('crystal_row'), crystal_col: mk('crystal_col'), crystal_slash: mk('crystal_slash'), crystal_back: mk('crystal_back'),
    crystal_prism: prism,
  },
  draw: [
    // the guide: where each crystal you could break would crack (dashed, brighter under the pick)
    { at: AT.blocks + 8, fn(g, s) {
      const pulse = 0.5 + Math.sin(fx.t * 4) * 0.5;
      const tgt = fx.target;
      g.save(); g.lineWidth = 2.5; g.lineCap = 'round';
      for (let i = 0; i < s.rows.length; i++) for (let c = 0; c < COLS; c++) {
        const cell = s.rows[i][c];
        if (!cell || !DIR[cell.t]) continue;
        const r = s.top + i, y = yOf(r);
        if (y > H || y < -CELL) continue;
        const hot = !!tgt && tgt[0] === r && tgt[1] === c && fx.mouse.inside;
        if (!hot && !reachable(s, r, c)) continue;
        const x0 = c * CELL + CELL / 2, y0 = y + CELL / 2;
        g.strokeStyle = cell.t === 'crystal_prism' ? PRISM : ICE;
        g.globalAlpha = hot ? 0.75 : 0.13 + pulse * 0.07;
        g.setLineDash(hot ? [10, 8] : [4, 10]); g.lineDashOffset = -fx.t * (hot ? 40 : 14);
        const reach = W + H;
        for (const [dx, dy] of DIR[cell.t]) { g.beginPath(); g.moveTo(x0 - dx * reach, y0 - dy * reach); g.lineTo(x0 + dx * reach, y0 + dy * reach); g.stroke(); }
      }
      g.restore();
    } },
    // the crack itself: a bright streak that fades behind the front
    { at: AT.fx + 5, fn(g, s, dt) {
      for (let i = streaks.length - 1; i >= 0; i--) {
        const k = streaks[i]; k.life -= dt;
        if (k.life <= 0) { streaks.splice(i, 1); continue; }
        const a = k.life / k.max;
        g.save(); g.translate(k.x, yOf(k.r) + CELL / 2); g.rotate(k.ang);
        g.globalAlpha = a; g.strokeStyle = '#fff'; g.lineWidth = 5 * a + 1; g.lineCap = 'round';
        g.shadowColor = k.col; g.shadowBlur = 18;
        g.beginPath(); g.moveTo(-CELL * 0.62, 0); g.lineTo(CELL * 0.62, 0); g.stroke();
        g.strokeStyle = k.col; g.lineWidth = 2;
        g.beginPath(); g.moveTo(-CELL * 0.4, -5); g.lineTo(-CELL * 0.1, 3); g.lineTo(CELL * 0.15, -4); g.lineTo(CELL * 0.4, 4); g.stroke();
        g.restore();
      }
    } },
  ],
  on: {
    // a crystal breaks: a ring and a ping, then the line leaves it
    crystalLine(d, app) {
      const [x, y] = centre(d.r, d.c);
      const big = d.t === 'crystal_prism', col = big ? PRISM : ICE;
      ring(x, y, CELL * (big ? 2.2 : 1.3), col);
      spark(x, y, col, big ? 30 : 14); spark(x, y, '#fff', 6);
      shake(big ? 0.35 : 0.12); app.sfx.shatter();
    },
    // every cell the crack crosses: a streak, sparks if there was something there, a note
    crystalCrack(d, app) {
      const [x, y] = centre(d.r, d.c);
      streaks.push({ r: d.r, x, ang: Math.atan2(d.dr, d.dc), life: 0.28, max: 0.28, col: d.depth > 1 ? '#fff6a0' : ICE });
      if (d.t) spark(x, y, ICE, 8);
      app.sfx.chime(d.k - 1 + (d.depth - 1) * 3);
    },
  },
});
