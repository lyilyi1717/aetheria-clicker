// Steady ground (docs/dig-design.md work order 13, docs/pacing-targets.md "Steady ground inside a layer"): per road level 1 to 20,
// the hits of your pick a plain dirt block takes in the middle of the last leg and in the last row above the Gate (dump.hpb, the
// first time your own dig reaches them), their ratio, and the failed tries with the Gate in view and no Gate cell to hit (open0,
// from dump.tries) over the whole road. Also the pick's share of the ground's damage (dump.dmg: hand / (hand + fx)).
// Usage: node scripts/dig-ground.cjs <dump.json>
const all = require(require('path').resolve(process.argv[2]));
const f = x => (x === undefined ? '-' : x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2));
for (const d of all) {
  const by = {};
  for (const v of Object.values(d.hpb || {})) if (v.lvl <= 20 && !by[v.lvl]) by[v.lvl] = v;
  const cells = [];
  let worstMid15 = 0, worstMid20 = 0, worstRatio = 0;
  for (let l = 1; l <= 20; l++) {
    const v = by[l] || {};
    const ratio = v.mid && v.last ? v.last / v.mid : undefined;
    if (v.mid !== undefined) { if (l <= 15) worstMid15 = Math.max(worstMid15, v.mid); else worstMid20 = Math.max(worstMid20, v.mid); }
    if (ratio !== undefined && l >= 7) worstRatio = Math.max(worstRatio, ratio, 1 / ratio);
    cells.push(`L${l} ${f(v.mid)}/${f(v.last)}`);
  }
  const fails = (d.tries || []).filter(t => !t.fin && t.lvl > 0);
  const open0 = fails.filter(t => t.rock && t.rock.gate && t.rock.open === 0);
  const pick = d.dmg && d.dmg.hand + d.dmg.fx ? (100 * d.dmg.hand / (d.dmg.hand + d.dmg.fx)).toFixed(0) + '%' : '-';
  console.log(`${d.player} seed ${d.seed} | hits mid/last: ${cells.join(' ')}`);
  console.log(`${d.player} seed ${d.seed} | worst mid L1-15 ${f(worstMid15)} (<=8), L16-20 ${f(worstMid20)} (<=30), worst last/mid L7-20 x${worstRatio.toFixed(2)} (<=2) | failed tries ${fails.length}, open0 ${open0.length}${open0.length ? ' (levels ' + open0.map(t => t.lvl).join(',') + ')' : ''} | pick share of ground damage ${pick}`);
}
