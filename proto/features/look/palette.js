// Dig look: the colours. Pure data and small colour sums, no DOM, so a node script can print and check them.
// A layer paints the ground; a site paints the sky and tints the ground a little (design review 2.8).

// by layer id (ground: sand, clay, slate, deep; deep feature: black, living, angry, hot)
export const LAYER_LOOK = {
  sand:   { dirt: '#e0b062', stone: '#b3a58c', hard: '#6a5d4e', back: '#5a3d22', glow: '#ffe9b0' },
  clay:   { dirt: '#c0673f', stone: '#96807a', hard: '#4f3f3f', back: '#4a2418', glow: '#ff9a6a' },
  slate:  { dirt: '#3f8f8c', stone: '#6fa3a0', hard: '#1f4b4d', back: '#12302f', glow: '#58c7e8', shine: true },
  deep:   { dirt: '#7b5bb5', stone: '#9484c2', hard: '#36285a', back: '#1d1433', glow: '#9be7ff' },
  black:  { dirt: '#2b2b3d', stone: '#3b3b50', hard: '#16161f', back: '#07070c', glow: '#7cffb2' },
  living: { dirt: '#557f3f', stone: '#6f8f54', hard: '#2c4526', back: '#16260f', glow: '#b8f27a' },
  angry:  { dirt: '#a8324f', stone: '#8c4a5e', hard: '#4a1626', back: '#2a0c16', glow: '#ff6a8a' },
  hot:    { dirt: '#3a2a26', stone: '#5a3a30', hard: '#1e1412', back: '#160806', glow: '#ff7a1a', veins: true },
};

// the sky of each site: top to horizon, the far ground, a tint for the dirt and stone (colour, share)
export const SITE_LOOK = {
  dunes:  { sky: ['#7ec8f2', '#f6d9a0'], far: '#e0b467', tint: null },
  boom:   { sky: ['#f29b4b', '#6b2d2a'], far: '#9a4a34', tint: ['#d4452c', 0.10] },
  gold:   { sky: ['#9fd8f5', '#fff0b8'], far: '#e6c46e', tint: ['#ffd23f', 0.06] },
  bones:  { sky: ['#e9d7f0', '#f7e6c8'], far: '#e8dcc4', tint: ['#ffffff', 0.12] },
  shark:  { sky: ['#3fb6c9', '#dff6f0'], far: '#d9c9a0', tint: ['#2fb5b0', 0.08] },
  mirage: { sky: ['#f5b7d0', '#fde7b0'], far: '#e9c79a', tint: ['#a98bd6', 0.10] },
};
// other names a site may come with (a later package may name them differently)
const ALIAS = { sharks: 'shark', sharkbay: 'shark', shark_dunes: 'shark', mirage_dunes: 'mirage', valley: 'boom', wadi: 'gold', beasts: 'bones' };
export const siteKey = id => (SITE_LOOK[id] ? id : SITE_LOOK[ALIAS[id]] ? ALIAS[id] : 'dunes');

const hex = n => '#' + ((1 << 24) | n).toString(16).slice(1);
const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
export function mix(a, b, k) {
  const A = rgb(a), B = rgb(b);
  return hex(((A[0] + (B[0] - A[0]) * k) | 0) << 16 | ((A[1] + (B[1] - A[1]) * k) | 0) << 8 | ((A[2] + (B[2] - A[2]) * k) | 0));
}
export function shadeHex(h, k) { return k > 0 ? mix(h, '#ffffff', k) : mix(h, '#000000', -k); }
export function luminance(h) {
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const [r, g, b] = rgb(h);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// the colours a layer has on a site: the layer's palette, with the site's tint on dirt and stone only
const cache = new Map();
export function lookFor(layerId, layerLook, siteId) {
  const site = siteKey(siteId), key = layerId + '|' + site;
  let o = cache.get(key);
  if (!o) {
    const base = { ...layerLook, ...(LAYER_LOOK[layerId] || {}) };
    const tint = SITE_LOOK[site].tint;
    o = tint ? { ...base, dirt: mix(base.dirt, tint[0], tint[1]), stone: mix(base.stone, tint[0], tint[1]) } : base;
    cache.set(key, o);
  }
  return o;
}

// The block (or hollow) an ore sits in: the layer colour shaded by `k0` (dirt ores sit in dirt shaded -0.18, the deep
// stones in a hollow shaded -0.35), then nudged, darker first and lighter if that fails, until the ore keeps
// MIN_CONTRAST against it. The old fixed shades left copper on Sand at 1.1:1, the cyan gem on Wet Slate teal and
// the ruby on nearly every layer unreadable.
export const MIN_CONTRAST = 2.6;
export function oreBacking(base, ore, k0 = -0.18) {
  let best = shadeHex(base, k0), bc = contrast(ore, best);
  for (let d = 0; d <= 0.6 && bc < MIN_CONTRAST; d += 0.04) {
    for (const k of [k0 - d, k0 + d]) {
      if (k < -0.75 || k > 0.7) continue;
      const c = shadeHex(base, k), cc = contrast(ore, c);
      if (cc > bc) { best = c; bc = cc; }
      if (bc >= MIN_CONTRAST) break;
    }
  }
  return best;
}

export const ORES = { copper: '#f08a3c', silver: '#dfe9f2', gold: '#ffcf33', gem: '#3ee6e0', moonstone: '#cfe0ff', amber: '#ffb52e', ruby: '#e0234a', ember: '#ff8a1a' };
