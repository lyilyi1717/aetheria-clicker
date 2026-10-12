// Dig look: every layer has its own hue, ore stays readable on every layer and site, every site has a sky.
import { LAYER_LOOK, SITE_LOOK, ORES, oreBacking, contrast, lookFor, siteKey, MIN_CONTRAST, luminance } from './proto/features/look/palette.js';
let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
const hue = h => { const n = parseInt(h.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255, M = Math.max(r, g, b), m = Math.min(r, g, b); if (M === m) return 0; const d = M - m; const x = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4; return (x * 60 + 360) % 360; };
const ids = ['sand', 'clay', 'slate', 'deep', 'black', 'living', 'angry', 'hot'];
for (const id of ids) ok(LAYER_LOOK[id] && LAYER_LOOK[id].dirt && LAYER_LOOK[id].back && LAYER_LOOK[id].glow, `palette for ${id}`);
// neighbours differ: by hue (at least 25 degrees) or, for the dark ones, by brightness
for (let i = 1; i < ids.length; i++) {
  const a = LAYER_LOOK[ids[i - 1]].dirt, b = LAYER_LOOK[ids[i]].dirt;
  const dh = Math.min(Math.abs(hue(a) - hue(b)), 360 - Math.abs(hue(a) - hue(b)));
  ok(dh >= 25 || Math.abs(luminance(a) - luminance(b)) > 0.08, `${ids[i - 1]} and ${ids[i]} look alike`);
}
// the clay, the Angry Layer and the Hot Layer used to be three look-alikes
ok(contrast(LAYER_LOOK.angry.dirt, LAYER_LOOK.hot.dirt) > 1.8 && contrast(LAYER_LOOK.clay.dirt, LAYER_LOOK.hot.dirt) > 1.8, 'angry and hot are far from clay');
// brightness falls with depth from the sand to the black
ok(luminance(LAYER_LOOK.sand.dirt) > luminance(LAYER_LOOK.slate.dirt) && luminance(LAYER_LOOK.slate.dirt) > luminance(LAYER_LOOK.black.dirt), 'light falls with depth');
const base = { copper: 'dirt', silver: 'dirt', gold: 'dirt', gem: 'dirt', moonstone: 'stone', amber: 'stone', ruby: 'stone', ember: 'stone' };
for (const [o, col] of Object.entries(ORES)) for (const id of ids) for (const s of Object.keys(SITE_LOOK)) {
  const k0 = base[o] === 'dirt' ? -0.18 : -0.35;
  ok(contrast(col, oreBacking(lookFor(id, {}, s)[base[o]], col, k0)) >= MIN_CONTRAST - 0.05, `${o} reads on ${id} at ${s}`);
}
for (const s of ['dunes', 'boom', 'gold', 'bones', 'shark', 'mirage']) ok(SITE_LOOK[s] && SITE_LOOK[s].sky.length === 2, `sky for ${s}`);
ok(siteKey('nope') === 'dunes' && siteKey('sharks') === 'shark', 'unknown sites fall back to the dunes');
const t = lookFor('sand', {}, 'boom');
ok(t.dirt !== LAYER_LOOK.sand.dirt && t.hard === LAYER_LOOK.sand.hard, 'a site tints dirt, not the rock');
console.log(bad ? `${bad} failed` : 'look: all ok');
process.exit(bad ? 1 : 0);
