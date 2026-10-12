// Dig feature (page side): the drawings of the ten sets. Each set is a list of parts, one per piece, drawn in a
// 120 x 70 box. A part you lack is a dark shape (the silhouette); a part you have is filled in.
// Plain SVG text, no emoji, no image files.

const bone = (x, y, len, ang = 0, w = 4.5) => `<g transform="translate(${x} ${y}) rotate(${ang})"><rect x="${-len / 2}" y="${-w / 2}" width="${len}" height="${w}" rx="${w / 2}"/>`
  + [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => `<circle cx="${a * len / 2}" cy="${b * w / 2}" r="${w * 0.62}"/>`).join('') + '</g>';
const disc = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}"/>`;
const hole = (x, y, r) => `<circle class="hole" cx="${x}" cy="${y}" r="${r}"/>`;
const path = d => `<path d="${d}"/>`;
const line = d => `<path class="ln" d="${d}"/>`;
const rect = (x, y, w, h, r = 2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
const skull = (x, y, k = 1) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M-9 4 Q-11 -10 0 -10 Q11 -10 9 4 L5 4 L5 9 L-5 9 L-5 4 Z"/>${hole(-4, -2, 2.4)}${hole(4, -2, 2.4)}</g>`;
const ribs = (x, y, n, gap, len, ang = 0) => Array.from({ length: n }, (_, i) => bone(x + i * gap, y, len, 90 + ang, 3.6)).join('');
const spine = (x1, x2, y, n) => Array.from({ length: n }, (_, i) => disc(x1 + (x2 - x1) * i / (n - 1), y, 3.2)).join('');

export const PARTS = {
  dhab: [skull(20, 30, 1.15), bone(52, 36, 34, 0, 3.6) + ribs(40, 43, 5, 7, 14), path('M72 33 Q96 28 112 46 Q96 38 72 40 Z'), disc(46, 58, 3) + disc(52, 60, 2.5) + disc(70, 58, 3) + disc(76, 60, 2.5)],
  coins: [disc(30, 44, 14) + hole(30, 44, 5), disc(62, 40, 13) + hole(62, 40, 4.5), disc(94, 44, 13) + hole(94, 44, 4.5), disc(48, 20, 11) + hole(48, 20, 4), disc(80, 18, 12) + hole(80, 18, 4)],
  teapot: [path('M42 30 Q40 52 60 52 Q80 52 78 30 Z') + path('M78 36 Q96 30 94 22 L90 22 Q90 30 78 31 Z') + line('M42 34 Q28 34 30 44 Q32 50 43 46'), rect(50, 24, 20, 5, 2) + disc(60, 22, 3), path('M6 40 L26 40 L24 56 L8 56 Z') + line('M26 43 Q32 45 25 50'), path('M94 40 L114 40 L112 56 L96 56 Z') + line('M114 43 Q120 45 113 50'), rect(98, 4, 16, 14, 2) + rect(96, 3, 20, 3, 1.5)],
  pilot: [disc(24, 20, 10) + disc(46, 20, 10) + hole(24, 20, 5) + hole(46, 20, 5) + line('M14 20 Q35 4 56 20'), path('M62 10 Q76 4 82 14 Q94 6 112 16 L108 26 Q94 18 84 28 Q76 20 66 26 Z'), disc(26, 52, 14) + hole(26, 52, 9) + path('M26 44 L29 52 L26 60 L23 52 Z'), path('M54 36 L74 40 L94 36 L94 64 L74 68 L54 64 Z') + line('M74 40 L74 68'), rect(98, 42, 18, 22, 3) + line('M110 42 L110 28') + hole(106, 53, 4)],
  scarab: [path('M40 40 Q40 12 62 12 Q84 12 84 40 Q84 62 62 62 Q40 62 40 40 Z'), Array.from({ length: 3 }, (_, i) => bone(26, 28 + i * 14, 26, i * 12 - 12, 3) + bone(98, 28 + i * 14, 26, 180 - (i * 12 - 12), 3)).join(''), path('M62 12 L56 0 L68 0 Z'), path('M44 36 Q30 40 42 56 Q52 50 50 38 Z') + path('M80 36 Q94 40 82 56 Q72 50 74 38 Z'), disc(62, 28, 5) + hole(62, 28, 2)],
  shark: [path('M40 30 L56 4 L66 30 Z'), path('M4 38 Q16 30 30 36 L30 44 Q16 52 4 46 Z') + hole(10, 40, 2) + hole(16, 40, 2), spine(34, 96, 40, 9), ribs(42, 50, 5, 8, 16, 0), path('M96 40 L116 22 L112 40 L116 58 Z'), path('M24 44 L28 52 L32 44 Z')],
  pearls: [disc(14, 26, 7), disc(30, 42, 7), path('M54 52 Q60 40 66 52 L60 62 Z'), line('M6 20 Q60 76 114 20'), rect(104, 14, 10, 12, 3), disc(80, 50, 8)],
  oilrig: [disc(20, 22, 13) + hole(20, 22, 4) + bone(20, 22, 26, 0, 2.6) + bone(20, 22, 26, 90, 2.6), rect(50, 50, 40, 8, 3) + rect(54, 40, 8, 12, 2), disc(98, 24, 7) + rect(95, 30, 6, 14, 2), path('M64 8 L76 8 L70 34 Z') + path('M66 34 L74 34 L70 46 Z'), path('M100 52 L112 52 L106 66 Z')],
  flycamel: [skull(18, 18, 1.1) + bone(26, 34, 14, 60, 3.4), ribs(38, 46, 5, 7, 14), path('M46 34 Q60 12 74 34 Z'), bone(42, 62, 12, 90, 3.4) + bone(74, 62, 12, 90, 3.4), path('M30 38 Q8 36 4 14 Q20 18 36 30 Z'), path('M86 38 Q108 36 114 14 Q98 18 82 30 Z'), rect(52, 32, 22, 6, 3) + disc(62, 35, 2.4)],
  beast: [path('M22 14 L18 0 L30 10 Z') + path('M40 14 L44 0 L34 10 Z'), skull(32, 28, 1.4), spine(50, 108, 34, 8) + ribs(56, 44, 6, 9, 18, 0), path('M88 52 L96 64 L100 52 Z') + path('M100 52 L108 64 L112 52 Z'), path('M56 14 L62 4 L68 14 L62 22 Z'), path('M18 36 L22 46 L26 36 Z'), path('M4 6 L10 18 L20 8 L26 18 L32 6 L30 0 L6 0 Z')],
};

// the whole set as an SVG; `got(i)` says which parts are filled in
export function setSvg(set, got, col, extra = '') {
  const parts = PARTS[set] || [];
  const body = parts.map((d, i) => `<g class="pt${got(i) ? ' on' : ''}" style="--i:${i}">${d}</g>`).join('');
  return `<svg class="wart ${extra}" viewBox="0 0 120 70" style="--c:${col}" aria-hidden="true">${body}</svg>`;
}
