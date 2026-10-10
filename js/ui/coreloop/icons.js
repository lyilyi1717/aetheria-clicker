// Core-loop icons (CL-33): every icon of the ?loop=2 preview, drawn here as inline SVG so it looks
// the same on every device (no emoji, no icon font, no network). One style: a 24x24 grid, a round
// 1.8 outline in currentColor, a soft currentColor fill for the body, and at most two accents taken
// from the CSS tokens (--gold for oil and highlights, one more where a thing needs it).
//
//   icon('well')                      1em square, follows its text
//   icon('well', { size: 'hero' })    the big, detailed barrel for the Well screen
//   icon('derrick', { size: 40 })     40 px
//   icon('lock', { label: 'Locked' }) announced to screen readers (otherwise aria-hidden)
//
// An unknown name draws a neutral dot, never an empty space (test_cl_ui_icons.js fails on it).
// The Rewards helper takes only text for its icon: feedback.js passes iconToken(name) and swaps
// the token for the drawing (see feedback.js, watchIcons).

const SOFT = 'fill="currentColor" fill-opacity=".26"';
const GOLD = 'fill="var(--gold)" stroke="none"';
const GOLD_LINE = 'stroke="var(--gold)"';
const drop = (x, y, s = 1) => `<path d="M${x} ${y}c${1.3 * s} ${1.7 * s} ${2 * s} ${2.6 * s} ${2 * s} ${3.4 * s}a${2 * s} ${2 * s} 0 0 1-${4 * s} 0c0-${0.8 * s} ${0.7 * s}-${1.7 * s} ${2 * s}-${3.4 * s}z" ${GOLD}/>`;
const wheel = (x, y, r = 2.1) => `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor"/><circle cx="${x}" cy="${y}" r="${r * 0.35}" fill="var(--bg-2)" stroke="none"/>`;

// --- the drawings (inner SVG, 24x24) -----------------------------------------------------------
const DRAW = {
  // The barrel: the Well tab, the tappable well
  well: `<path d="M6.5 3.8h11c1.1 2.6 1.7 5.3 1.7 8.2s-.6 5.6-1.7 8.2h-11C5.4 17.6 4.8 14.9 4.8 12s.6-5.6 1.7-8.2z" ${SOFT}/>
    <path d="M5.2 8.4h13.6M5.2 15.6h13.6" stroke-width="2.2"/>
    <path d="M6.2 3.8h11.6"/><path d="M6.2 20.2h11.6"/>
    ${drop(12, 9.9, 1)}`,
  // A well in full spate
  gusher: `<path d="M7 12.5h10l.9 8.2H6.1z" ${SOFT}/>
    <path d="M6.6 16h10.8" stroke-width="2"/><path d="M6 20.7h12"/>
    <path d="M12 12V5.5M12 12C10 9.5 8.4 7.8 6.8 7.6M12 12c2-2.5 3.6-4.2 5.2-4.4" ${GOLD_LINE}/>
    ${drop(4.2, 4.2, 0.7)}${drop(15.5, 3.2, 0.7)}${drop(9.7, 1.4, 0.55)}${drop(18.5, 8.6, 0.55)}`,

  // The eight pumps, in order
  bucket: `<path d="M5 9h14l-1.6 10.2a1.6 1.6 0 0 1-1.6 1.3H8.2a1.6 1.6 0 0 1-1.6-1.3z" ${SOFT}/>
    <path d="M4 9h16"/><path d="M7.5 9c0-5 9-5 9 0"/><path d="M5.7 13.5h12.6" stroke-width="1.4" opacity=".6"/>
    ${drop(12, 13.6, 0.9)}`,
  handpump: `<path d="M5 21h10"/><path d="M7 21V9h5.5v12" ${SOFT}/><path d="M6 9V7h7.5v2z" ${SOFT}/>
    <path d="M10 7 19.5 3.5" stroke-width="2.4"/><circle cx="19.5" cy="3.8" r="1.2" fill="currentColor"/>
    <path d="M12.5 14.5H16l1 2.5"/>${drop(15.6, 17.8, 0.7)}`,
  wanet: `<path d="M2 11.5h8.2V17H2z" ${SOFT}/><path d="M10.2 9h5.4l3.6 4.2V17H10.2z" ${SOFT}/>
    <path d="M12 10.6h3l2 2.6h-5z" stroke-width="1.4"/><path d="M2 17h17.2"/>
    <rect x="3.6" y="8" width="3.8" height="3.5" rx=".8" ${GOLD}/>${wheel(6, 17.8)}${wheel(16, 17.8)}`,
  derrick: `<path d="M12 3 6 21M12 3l6 18" /><path d="M4 21h16" stroke-width="2.2"/>
    <path d="M8.4 15.2h7.2M10.1 9.6h3.8" /><path d="M8.4 15.2 15.6 15.2 12 9.6z" ${SOFT} stroke="none"/>
    <path d="M10 3h4" stroke-width="2.4"/><path d="M12 3V1.8"/>${drop(11, 17.2, 0.6)}`,
  pipeline: `<path d="M2 11.5h20v6H2z" ${SOFT}/><path d="M7 9.5v10M17 9.5v10" stroke-width="2.2"/>
    <path d="M12 11.5V6M9.6 5.6h4.8" stroke-width="2"/><path d="M3.5 17.5v3.5M20.5 17.5v3.5"/>
    <path d="M9 14.5h6" ${GOLD_LINE} stroke-width="2"/>`,
  tanker: `<rect x="1.8" y="7" width="13.5" height="8.5" rx="4.2" ${SOFT}/><path d="M15.3 10h3.4l3 3.3V16h-6.4z" ${SOFT}/>
    <path d="M1.8 16.2h20"/><path d="M5 11.2h7.5" ${GOLD_LINE} stroke-width="2.2"/>
    <path d="M7.8 5.2h2.4"/>${wheel(5.8, 18)}${wheel(11.4, 18)}${wheel(19, 18)}`,
  platform: `<path d="M3 11h18v3H3z" ${SOFT}/><path d="M6 14v6M12 14v6M18 14v6M6 17.5l6 2.5M18 17.5l-6 2.5" stroke-width="1.5"/>
    <path d="M12 2.5 9.4 11M12 2.5 14.6 11M10.4 7.2h3.2"/>
    <path d="M1.5 21c2-1.3 3.200-1.300 5 0s3.200 1.300 5 0 3.200-1.300 5 0 3.200 1.300 5 0" stroke="var(--aether)" stroke-width="2"/>`,
  giantfield: `<circle cx="11" cy="11" r="8.4" ${SOFT}/><path d="M2.6 11h16.8M4 6.6h14M4 15.4h14"/>
    <path d="M11 2.6c3.200 3 3.200 13.800 0 16.800-3.200-3-3.200-13.800 0-16.800z"/>
    <circle cx="18" cy="18" r="5" fill="var(--bg-2)" stroke="none"/>${drop(18, 14.6, 1.1)}`,

  // The Fields
  tower: `<path d="M7 21.2V8h10v13.200z" ${SOFT}/><path d="M5.8 8V4.600h2.600v2h2V4.600h3.200v2h2V4.600h2.600V8z" ${SOFT}/>
    <path d="M10.200 21.200v-4.200a1.800 1.800 0 0 1 3.600 0v4.200"/><path d="M12 10.800v2" />`,
  mine: `<path d="M12 7 5.200 20.200" stroke-width="2.800"/>
    <path d="M2.800 11.200C5.200 4.800 14.800 3.200 21.200 10.200 17.200 7.600 8.400 8.200 2.800 11.200z" fill="currentColor" stroke-width="1.400"/>`,
  oasis: `<path d="M13.600 9.600c-1.600 4-1.800 8-1.200 11.400" stroke-width="2.200"/>
    <path d="M13.600 9.600C10.400 5.800 6.200 6.200 3.800 9.400M13.600 9.600c.2-4.200 3.200-6.200 7.200-5.200M13.600 9.600C12.400 5.800 9.400 4 6.400 4.400M13.600 9.600c3.200-1.800 6-.8 7.400 2" stroke="var(--life)" stroke-width="2.200"/>
    <path d="M1.800 21.400c2-1.200 3.200-1.200 5 0s3.200 1.200 5 0 3.200-1.200 5 0 3.200 1.200 5 0" stroke="var(--aether)" stroke-width="2"/>`,

  // The tabs and ceremonies
  refinery: `<path d="M9.500 3h5M10 3v6.200L4.800 18.200a2.200 2.200 0 0 0 1.900 3.300h10.600a2.200 2.200 0 0 0 1.900-3.300L14 9.200V3" ${SOFT}/>
    <path d="M7.200 15.200h9.600l2.400 3.600a1.200 1.200 0 0 1-1 1.900H5.800a1.200 1.200 0 0 1-1-1.900z" ${GOLD}/>
    <circle cx="11" cy="13" r="1" fill="currentColor" stroke="none"/><circle cx="13.600" cy="11" r=".7" fill="currentColor" stroke="none"/>`,
  trophy: `<path d="M7 3.800h10v5.200a5 5 0 0 1-10 0z" ${SOFT}/><path d="M7 5.500H4.200c0 3 1.100 4.600 3.200 5.200M17 5.500h2.800c0 3-1.100 4.600-3.200 5.200"/>
    <path d="M12 14v4M8 21h8M9.200 18h5.600"/><path d="M10.200 6.500v2.600" ${GOLD_LINE} stroke-width="1.600"/>`,
  scroll: `<rect x="6" y="3.500" width="12.500" height="14.500" rx="2" ${SOFT}/>
    <path d="M5 18.500a2.500 2.500 0 0 0 2.500 2.500H17a2 2 0 0 0 2-2.500z" ${SOFT}/>
    <path d="M9 8h6.500M9 11.500h6.500M9 15h3.500" stroke-width="1.600"/>`,
  lock: `<rect x="5" y="11" width="14" height="10" rx="2.200" ${SOFT}/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>
    <circle cx="12" cy="15.500" r="1.500" fill="currentColor" stroke="none"/><path d="M12 16.500v2" />`,
  unlock: `<rect x="5" y="11" width="14" height="10" rx="2.200" ${SOFT}/><path d="M8 11V8a4 4 0 0 1 7.600-1.700"/>
    <circle cx="12" cy="15.500" r="1.500" fill="var(--gold)" stroke="none"/><path d="M12 16.500v2" ${GOLD_LINE}/>`,
  gear: `<path d="M12 2.500v3M12 18.500v3M2.500 12h3M18.500 12h3M5.300 5.300l2.100 2.100M16.600 16.600l2.100 2.100M18.700 5.300l-2.100 2.100M7.400 16.600l-2.100 2.100" stroke-width="2.800"/>
    <circle cx="12" cy="12" r="6" ${SOFT}/><circle cx="12" cy="12" r="2.200" fill="var(--gold)" stroke="none"/>`,
  wrench: `<path d="M14.800 3.200a5 5 0 0 0-4.700 6.700L3.700 16.300a2.200 2.200 0 0 0 3.100 3.100l6.400-6.400a5 5 0 0 0 6.700-4.800l-3.100 3.100-2.900-.7-.7-2.900z" ${SOFT}/>
    <circle cx="5.300" cy="17.900" r=".8" fill="currentColor" stroke="none"/>`,
  vial: `<path d="M9.500 3h5M10.200 3v14.200a1.800 1.800 0 0 0 3.600 0V3" ${SOFT}/>
    <path d="M10.200 11h3.600v6.200a1.800 1.800 0 0 1-3.600 0z" fill="var(--life)" stroke="none"/><path d="M8.500 6.500h1.700M8.500 9h1.700" stroke-width="1.400"/>`,
  bubbles: `<circle cx="9" cy="14.500" r="5" ${SOFT}/><circle cx="17" cy="8" r="3" ${SOFT}/><circle cx="17.200" cy="16.800" r="1.800" ${SOFT}/>
    <path d="M6.600 12.800a3 3 0 0 1 1.800-1.600" stroke-width="1.400"/>`,
  sparkle: `<path d="M11 3c.9 5.200 2.700 7 8 8-5.300 1-7.100 2.800-8 8-.9-5.200-2.700-7-8-8 5.300-1 7.100-2.800 8-8z" fill="var(--gold)" stroke="currentColor"/>
    <path d="M18.500 14.500c.3 1.800.9 2.400 2.700 2.700-1.800.3-2.400.9-2.700 2.700-.3-1.800-.9-2.400-2.700-2.700 1.800-.3 2.400-.9 2.700-2.700z" fill="currentColor" stroke="none"/>`,
  trident: `<path d="M12 21V4M6 4v4.500a6 6 0 0 0 12 0V4M8.500 21h7" stroke-width="2.200"/><path d="M12 2.500 10.200 5h3.600z" fill="currentColor"/>
    <circle cx="12" cy="13.500" r="1.600" fill="var(--gold)" stroke="none"/>`,
  crate: `<path d="M3.500 8 12 4l8.500 4v9L12 21l-8.500-4z" ${SOFT}/><path d="M3.500 8 12 12l8.500-4M12 12v9"/>
    <path d="M7.800 6 16.200 10" ${GOLD_LINE} stroke-width="1.600"/>`,
  crown: `<path d="M4 18 3 8l5 4 4-7 4 7 5-4-1 10z" ${SOFT}/><path d="M4.500 21h15"/>
    <circle cx="12" cy="14.500" r="1.700" fill="var(--gold)" stroke="none"/>`,
  flag: `<path d="M6 21V3"/><path d="M6 4.500h12.500L16 8.800l2.500 4.300H6z" ${SOFT}/>
    <path d="M9 7h2.500v2.500H9zM14 9.500h2v2h-2z" fill="currentColor" stroke="none"/>`,
  dot: `<circle cx="12" cy="12" r="3.200" fill="currentColor" stroke="none"/>`
};

// The big barrel for the Well screen: a lid with oil in it, planks, three hoops, a sheen, a drip
// and a little puddle. .cl-drip moves only when the player has not asked for reduced motion.
const HERO = {
  well: `<ellipse cx="12" cy="21.600" rx="8.200" ry="1.500" fill="var(--gold)" fill-opacity=".35" stroke="none" class="cl-puddle"/>
    <path d="M5.800 4.600c-1.400 2.400-2 4.800-2 7.400s.6 5 2 7.400c1.400 1.200 3.600 1.800 6.200 1.800s4.800-.6 6.200-1.800c1.400-2.400 2-4.800 2-7.400s-.6-5-2-7.400z" fill="currentColor" fill-opacity=".5"/>
    <path d="M9 4.600c-1 4-1 10.800 0 14.800M15 4.600c1 4 1 10.800 0 14.800" stroke-width="1" opacity=".45"/>
    <path d="M4.300 8.800c2.200 1.100 4.600 1.600 7.700 1.600s5.500-.5 7.700-1.600M4.300 15.200c2.200 1.100 4.600 1.600 7.700 1.600s5.500-.5 7.700-1.600" stroke="var(--gold)" stroke-width="2.200"/>
    <ellipse cx="12" cy="4.600" rx="6.200" ry="2.300" fill="currentColor" fill-opacity=".2"/>
    <ellipse cx="12" cy="4.600" rx="4.300" ry="1.400" fill="var(--gold)" stroke="none"/>
    <path d="M7.200 6.800c-.8 3-.8 6.400-.2 9.200" stroke="currentColor" stroke-width="1.500" opacity=".55"/>
    <path d="M18.800 12.200c.3 1.800 1.100 3.200 1.100 4.400a1.350 1.350 0 0 1-2.700 0c0-1.200.8-2.600 1.600-4.400z" class="cl-drip" fill="var(--gold)" stroke="none"/>`,
  gusher: `<ellipse cx="12" cy="22" rx="8" ry="1.400" fill="var(--gold)" fill-opacity=".4" stroke="none"/>
    <path d="M7.500 17h9l1 4.400c-1.400.6-3.200.9-5.500.9s-4.100-.3-5.500-.9z" fill="currentColor" fill-opacity=".4"/>
    <path d="M6.800 17h10.400" stroke-width="2.200"/>
    <path d="M12 17V6" stroke="var(--gold)" stroke-width="3.200"/>
    <path d="M12 5.500C8.800 5.500 6.200 8.500 5.200 14M12 5.500c3.200 0 5.800 3 6.800 8.500" stroke="var(--gold)" stroke-width="2.400"/>
    <path d="M12 8.500C10.400 8.500 9.200 10 8.600 12.500M12 8.500c1.600 0 2.800 1.500 3.400 4" stroke="var(--gold)" stroke-width="1.400" opacity=".7"/>
    <circle cx="12" cy="3.200" r="1.700" fill="var(--gold)" stroke="none"/>
    <path d="M5.200 14.600c.9 1.300 1.400 2 1.400 2.600a1.400 1.400 0 0 1-2.800 0c0-.6.500-1.300 1.400-2.600zM18.800 14.600c.9 1.300 1.400 2 1.400 2.600a1.400 1.400 0 0 1-2.800 0c0-.6.500-1.300 1.400-2.600z" fill="var(--gold)" stroke="none"/>
    <circle cx="8.200" cy="4.200" r=".9" fill="var(--gold)" stroke="none"/><circle cx="15.800" cy="4.200" r=".9" fill="var(--gold)" stroke="none"/>
    <circle cx="3" cy="10.500" r=".9" fill="var(--gold)" stroke="none"/><circle cx="21" cy="10.500" r=".9" fill="var(--gold)" stroke="none"/>`
};

export const ICON_NAMES = Object.keys(DRAW);
/** The eight pumps, in order (cl.slot.1..8). */
export const SLOT_ICONS = ['bucket', 'handpump', 'wanet', 'derrick', 'pipeline', 'tanker', 'platform', 'giantfield'];
/** The five screens (shell SCREENS). */
export const TAB_ICONS = { well: 'well', fields: 'mine', refinery: 'refinery', prestige: 'trophy', codex: 'scroll' };
/** The three Fields (P.fields). */
export const FIELD_ICONS = { tower: 'tower', mine: 'mine', oasis: 'oasis' };

export const hasIcon = (name) => Object.prototype.hasOwnProperty.call(DRAW, name);

/** An SVG string for `name`. size: a number (px), 'hero', or omitted (1em). */
export function icon(name, { size, label } = {}) {
  const known = hasIcon(name);
  const hero = size === 'hero';
  const body = hero && HERO[name] ? HERO[name] : DRAW[known ? name : 'dot'];
  const cls = `cl-icon cl-icon-${known ? name : 'dot'}${hero ? ' cl-icon-hero' : ''}`;
  const px = typeof size === 'number' && size > 0 ? ` style="inline-size:${size}px;block-size:${size}px"` : '';
  const a11y = label ? ` role="img" aria-label="${String(label).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}"` : ' aria-hidden="true" focusable="false"';
  const stroke = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  return `<svg class="${cls}" viewBox="0 0 24 24" ${stroke}${px}${a11y}>${body}</svg>`;
}

// --- toasts and ceremonies take text only: a token the feedback module swaps for the drawing ----
export const ICON_TOKEN = 'cl-icon:';
export const iconToken = (name) => ICON_TOKEN + name;
export const fromToken = (text) => (typeof text === 'string' && text.startsWith(ICON_TOKEN) ? text.slice(ICON_TOKEN.length) : null);

// --- the stylesheet, loaded the way well.js loads its own ----------------------------------------
export function loadIconsCss(doc = (typeof document !== 'undefined' ? document : null)) {
  if (!doc?.head || doc.querySelector('link[data-coreloop-icons-css]')) return;
  const link = doc.createElement('link');
  link.rel = 'stylesheet'; link.href = 'css/coreloop-icons.css'; link.dataset.coreloopIconsCss = '';
  doc.head.appendChild(link);
}
loadIconsCss();
