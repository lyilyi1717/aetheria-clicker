// Dig prototype: small drawn icons (SVG text). No emoji, no image files.
const S = 'stroke="#1b1410" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"';
const badge = (col, inner) => `<rect x="1" y="1" width="30" height="30" rx="8" fill="${col}" ${S}/>${inner}`;
const pick = (c = '#dfe7ee') => `<path d="M9 24 L21 10" stroke="#1b1410" stroke-width="5" stroke-linecap="round"/><path d="M9 24 L21 10" stroke="#a8672c" stroke-width="2.6" stroke-linecap="round"/><path d="M12 7 Q22 6 26 16" fill="none" stroke="#1b1410" stroke-width="5.4" stroke-linecap="round"/><path d="M12 7 Q22 6 26 16" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
const star = (cx, cy, r1, r2, n, fill) => {
  let d = '';
  for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n - Math.PI / 2, r = i % 2 ? r2 : r1; d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)} `; }
  return `<path d="${d}Z" fill="${fill}" ${S}/>`;
};
const gem = (x, y, s, fill) => `<path d="M${x} ${y - s} L${x + s * 0.8} ${y - s * 0.2} L${x} ${y + s} L${x - s * 0.8} ${y - s * 0.2} Z" fill="${fill}" ${S}/>`;
const chest = `<rect x="5" y="14" width="22" height="13" rx="2" fill="#8a4b1c" ${S}/><path d="M5 15 Q16 2 27 15 Z" fill="#a65c24" ${S}/><rect x="5" y="14" width="22" height="2.6" fill="#ffd23f"/><rect x="13.5" y="13" width="5" height="6" rx="1" fill="#fff1a0" ${S}/>`;
const helmet = `<circle cx="16" cy="18" r="8" fill="#f8d9b0" ${S}/><path d="M7 16 A9 9 0 0 1 25 16 Z" fill="#ffd23f" ${S}/><rect x="5.5" y="15" width="21" height="2.6" rx="1" fill="#ffd23f" ${S}/><circle cx="13" cy="20" r="1.2" fill="#1b1410"/><circle cx="19" cy="20" r="1.2" fill="#1b1410"/>`;

const ICONS = {
  coin: `<circle cx="16" cy="16" r="13" fill="#ffd23f" stroke="#7a5a00" stroke-width="2.4"/><circle cx="16" cy="16" r="8" fill="none" stroke="#b98a00" stroke-width="2"/><circle cx="11.5" cy="11" r="2.6" fill="#fff6c8"/>`,
  chest,
  bone: `<g transform="rotate(-35 16 16)"><rect x="6" y="13.5" width="20" height="5" rx="2.5" fill="currentColor"/><circle cx="6" cy="12.5" r="4" fill="currentColor"/><circle cx="6" cy="19.5" r="4" fill="currentColor"/><circle cx="26" cy="12.5" r="4" fill="currentColor"/><circle cx="26" cy="19.5" r="4" fill="currentColor"/></g>`,
  star: star(16, 16, 13, 6, 5, '#ffd23f'),
  up_pick: badge('#3b6ea8', pick()),
  up_crew: badge('#2f8f5b', helmet),
  up_crewPow: badge('#2f8f5b', `<path d="M16 6 L25 16 H20 V26 H12 V16 H7 Z" fill="#ffd23f" ${S}/>`),
  up_luck: badge('#8a5bc4', `<circle cx="11.5" cy="11.5" r="5" fill="#59d37a" ${S}/><circle cx="20.5" cy="11.5" r="5" fill="#59d37a" ${S}/><circle cx="11.5" cy="20.5" r="5" fill="#59d37a" ${S}/><circle cx="20.5" cy="20.5" r="5" fill="#59d37a" ${S}/>`),
  boom: badge('#c0392b', star(16, 16, 12, 5.5, 8, '#ffe14a')),
  vein: badge('#1f7a8c', gem(9, 17, 6, '#3ee6e0') + gem(16, 13, 7, '#9af7f3') + gem(23, 17, 6, '#3ee6e0')),
  lucky: badge('#2f8f5b', star(16, 16, 12, 5, 4, '#fff')),
  heavy: badge('#5b4a8a', `<rect x="8" y="7" width="16" height="10" rx="2" fill="#cfd8dc" ${S}/><rect x="14" y="17" width="4" height="10" rx="1" fill="#a8672c" ${S}/>`),
  deep: badge('#3b6ea8', `<path d="M16 27 L7 16 H12 V5 H20 V16 H25 Z" fill="#fff" ${S}/>`),
  wide: badge('#3b6ea8', `<path d="M3 16 L11 8 V13 H21 V8 L29 16 L21 24 V19 H11 V24 Z" fill="#fff" ${S}/>`),
  bang: badge('#7a2a1f', `<rect x="9" y="9" width="14" height="18" rx="3" fill="#d7332b" ${S}/><path d="M16 9 Q19 3 24 5" fill="none" ${S}/>${star(24, 5, 3.4, 1.4, 6, '#ffe14a')}`),
  karak: badge('#a8672c', `<path d="M8 12 H22 L20 26 H10 Z" fill="#fff" ${S}/><path d="M22 14 Q28 15 22 21" fill="none" ${S}/><path d="M12 9 Q11 6 13 4 M17 9 Q16 6 18 4" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`),
  shiny: badge('#b98a00', gem(16, 17, 11, '#fff3a8') + `<path d="M16 6 L24.8 14.8 L16 17 L7.2 14.8 Z" fill="#fff" opacity="0.7"/>`),
  streak: badge('#c2571a', `<path d="M16 4 Q24 12 22 20 Q21 27 16 27 Q10 27 10 20 Q10 16 13 14 Q13 18 16 18 Q17 11 16 4 Z" fill="#ffe14a" ${S}/>`),
  nose: badge('#3d2a1a', chest),
  lamp: badge('#b98a00', `<path d="M11 12 H21 L23 24 H9 Z" fill="#fff3a8" ${S}/><rect x="12" y="8" width="8" height="4" rx="1" fill="#3d2a1a" ${S}/><path d="M12 8 Q16 2 20 8" fill="none" ${S}/><rect x="9" y="24" width="14" height="3" rx="1" fill="#3d2a1a" ${S}/>`),
  site_dunes: badge('#2b6cb0', `<path d="M1 24 Q9 14 16 21 Q23 12 31 22 V31 H1 Z" fill="#e0b467" ${S}/><circle cx="23" cy="9" r="4" fill="#fff3c4"/>`),
  site_boom: badge('#7a2a1f', `<rect x="6" y="12" width="9" height="14" rx="2" fill="#d7332b" ${S}/><rect x="17" y="12" width="9" height="14" rx="2" fill="#d7332b" ${S}/>${star(16, 8, 5, 2.2, 7, '#ffe14a')}`),
  site_gold: badge('#3d2a1a', `<path d="M5 24 L10 14 L16 20 L22 10 L27 24 Z" fill="#ffd23f" ${S}/><path d="M10 14 L16 20 L13 24 L7 24 Z" fill="#fff3a8"/>`),
  site_bones: badge('#4b4460', `<g transform="rotate(-35 16 16)" fill="#f6efdc" ${S}><rect x="7" y="13.5" width="18" height="5" rx="2.5"/><circle cx="7" cy="12.5" r="3.6"/><circle cx="7" cy="19.5" r="3.6"/><circle cx="25" cy="12.5" r="3.6"/><circle cx="25" cy="19.5" r="3.6"/></g>`),
  echo: badge('#5b4a8a', `<path d="M10 9 Q17 16 10 23 M16 6 Q26 16 16 26" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="7" cy="16" r="2.4" fill="#fff"/>`),
};

export function icon(id, size = 24) {
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">${ICONS[id] || ICONS.coin}</svg>`;
}
