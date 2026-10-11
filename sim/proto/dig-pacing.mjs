// Dig: a rough pacing check (not seeded; the timeline sim is the careful one). A scripted player digs for 25 minutes; prints when each depth
// and Big Rock was reached (seconds). Usage: node sim/proto/dig-pacing.mjs [active|idle] ['{"hpGrow":1.13}']
import * as G from '../../proto/game.js';
function run(seedless, hps = 4.5, active = true) {
  const s = G.newState(); const log = []; let t = 0, acc = 0; const marks = {};
  const ev = (k, d) => { if (k === 'bossDown') marks['boss' + d.layer] = t; };
  let col = 4;
  while (t < 1500) {
    const dt = 0.05; t += dt; acc += dt;
    if (active && acc >= 1 / hps) { acc = 0;
      // policy: reachable ore/chest anywhere in view else deepest reachable in/near column
      let best = null, bs = -1e9;
      for (let i = 0; i < G.VIEW_ROWS; i++) for (let c = 0; c < G.COLS; c++) { const r = s.top + i; const cell = s.rows[i][c]; if (!cell || !G.reachable(s, r, c)) continue;
        let sc = i * 3 - Math.abs(c - col) * 2; if (G.BLOCKS[cell.t].notice) sc += 30; if (cell.t === 'hard') sc -= 8; if (sc > bs) { bs = sc; best = [r, c]; } }
      if (best) { col = best[1]; G.swing(s, best[0], best[1], ev); }
    }
    G.step(s, dt, ev);
    while (s.chests > 0) { const d = G.rollDraft(s); G.takeRelic(s, d[0], ev); }
    // buy: cheapest affordable
    if (Math.abs(t % 3) < 0.05) for (;;) { const ids = ['pick','crew','crewPow','luck'].filter(id => G.canBuy(s, id) && (id !== 'crewPow' || s.up.crew > 0) && (id!=='luck' || s.best>=12)); if (!ids.length) break; ids.sort((a, b) => G.upgradeCost(s, a) - G.upgradeCost(s, b)); G.buy(s, ids[0], ev); }
    for (const m of [5, 10, 15, 20, 25, 35, 50, 60, 75]) if (s.best >= m && !marks[m]) marks[m] = t;
    if (Math.abs(t % 120) < 0.05) log.push(`${(t/60).toFixed(0)}m depth ${s.best} coins ${Math.round(s.total)} up ${JSON.stringify(s.up)}`);
  }
  return { marks: Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, Math.round(v)])), log, relics: s.relics };
}
const mode = process.argv[2] || 'active';
const ov = JSON.parse(process.argv[3] || '{}'); for (const k in ov) G.setParam(k, ov[k]);   // any path: "hpGrow", "tnt.power", "crew.base"
const r = run(0, 5, mode === 'active'); console.log(mode, JSON.stringify(r.marks)); console.log(r.log.join('\n')); console.log(JSON.stringify(r.relics));
