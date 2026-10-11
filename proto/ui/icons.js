// Dig: small drawn icons (SVG text). No emoji, no image files. A feature adds its own with
// addIcons({ id: svgInner }) and builds them from the shapes exported here (32 x 32 box).
export const S = 'stroke="#1b1410" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"';
export const badge = (col, inner) => `<rect x="1" y="1" width="30" height="30" rx="8" fill="${col}" ${S}/>${inner}`;
export const pickShape = (c = '#dfe7ee') => `<path d="M9 24 L21 10" stroke="#1b1410" stroke-width="5" stroke-linecap="round"/><path d="M9 24 L21 10" stroke="#a8672c" stroke-width="2.6" stroke-linecap="round"/><path d="M12 7 Q22 6 26 16" fill="none" stroke="#1b1410" stroke-width="5.4" stroke-linecap="round"/><path d="M12 7 Q22 6 26 16" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
export const star = (cx, cy, r1, r2, n, fill) => {
  let d = '';
  for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n - Math.PI / 2, r = i % 2 ? r2 : r1; d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)} `; }
  return `<path d="${d}Z" fill="${fill}" ${S}/>`;
};
export const gem = (x, y, s, fill) => `<path d="M${x} ${y - s} L${x + s * 0.8} ${y - s * 0.2} L${x} ${y + s} L${x - s * 0.8} ${y - s * 0.2} Z" fill="${fill}" ${S}/>`;
export const chest = `<rect x="5" y="14" width="22" height="13" rx="2" fill="#8a4b1c" ${S}/><path d="M5 15 Q16 2 27 15 Z" fill="#a65c24" ${S}/><rect x="5" y="14" width="22" height="2.6" fill="#ffd23f"/><rect x="13.5" y="13" width="5" height="6" rx="1" fill="#fff1a0" ${S}/>`;
export const helmet = `<circle cx="16" cy="18" r="8" fill="#f8d9b0" ${S}/><path d="M7 16 A9 9 0 0 1 25 16 Z" fill="#ffd23f" ${S}/><rect x="5.5" y="15" width="21" height="2.6" rx="1" fill="#ffd23f" ${S}/><circle cx="13" cy="20" r="1.2" fill="#1b1410"/><circle cx="19" cy="20" r="1.2" fill="#1b1410"/>`;

const ICONS = {
  coin: `<circle cx="16" cy="16" r="13" fill="#ffd23f" stroke="#7a5a00" stroke-width="2.4"/><circle cx="16" cy="16" r="8" fill="none" stroke="#b98a00" stroke-width="2"/><circle cx="11.5" cy="11" r="2.6" fill="#fff6c8"/>`,
  chest,
  bone: `<g transform="rotate(-35 16 16)"><rect x="6" y="13.5" width="20" height="5" rx="2.5" fill="currentColor"/><circle cx="6" cy="12.5" r="4" fill="currentColor"/><circle cx="6" cy="19.5" r="4" fill="currentColor"/><circle cx="26" cy="12.5" r="4" fill="currentColor"/><circle cx="26" cy="19.5" r="4" fill="currentColor"/></g>`,
  star: star(16, 16, 13, 6, 5, '#ffd23f'),
};

export function icon(id, size = 24) {
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">${ICONS[id] || ICONS.coin}</svg>`;
}

export function addIcons(map) {
  for (const [k, v] of Object.entries(map || {})) { if (ICONS[k]) throw new Error(`Dig: icon "${k}" twice`); ICONS[k] = v; }
}
