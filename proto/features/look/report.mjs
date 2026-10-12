// node proto/features/look/report.mjs : prints the layer palette, and each ore's contrast on each layer's block
import { LAYER_LOOK, SITE_LOOK, ORES, oreBacking, shadeHex, contrast, lookFor, MIN_CONTRAST } from './palette.js';
const ids = Object.keys(LAYER_LOOK), sites = Object.keys(SITE_LOOK);
const f = n => n.toFixed(1).padStart(5);
console.log('layer palette'); for (const id of ids) console.log(id.padEnd(8), Object.entries(LAYER_LOOK[id]).map(([k, v]) => k + ' ' + v).join('  '));
console.log('\nsky (top, horizon, far ground, tint)'); for (const s of sites) console.log(s.padEnd(8), SITE_LOOK[s].sky.join(' '), SITE_LOOK[s].far, SITE_LOOK[s].tint ? SITE_LOOK[s].tint.join(' ') : '-');
const base = { copper: 'dirt', silver: 'dirt', gold: 'dirt', gem: 'dirt', moonstone: 'stone', amber: 'stone', ruby: 'stone', ember: 'stone' };
let worst = 99, fixed = [];
console.log('\nore contrast on its block, old (fixed shade) -> new (backing), worst over the six sites');
console.log('ore'.padEnd(10) + ids.map(i => i.padStart(12)).join(''));
for (const [o, col] of Object.entries(ORES)) {
  let line = o.padEnd(10);
  for (const id of ids) {
    let oldW = 99, newW = 99;
    for (const s of sites) {
      const p = lookFor(id, {}, s), b = p[base[o]];
      const k0 = base[o] === 'dirt' ? -0.18 : -0.35, oldC = contrast(col, shadeHex(b, k0)), newC = contrast(col, oreBacking(b, col, k0));
      oldW = Math.min(oldW, oldC); newW = Math.min(newW, newC);
    }
    worst = Math.min(worst, newW); if (oldW < MIN_CONTRAST) fixed.push(`${o}@${id}`);
    line += (f(oldW) + '>' + f(newW)).padStart(12);
  }
  console.log(line);
}
console.log('\nworst new contrast', worst.toFixed(2), '; pairs that were under', MIN_CONTRAST + ':', fixed.join(' ') || 'none');
