// Themes (R35, docs/ui-style-guide.md §2.5). Every colour comes from the tokens in
// css/tokens.css; a theme is a `:root[data-theme="…"]` block there that overrides them. This
// module writes the chosen theme to <html> as data-theme and draws the Settings picker. The
// choice is a setting (settings.theme), not game progress; old saves without it get Night.
// It is also mirrored to its own localStorage key so the inline script in index.html can set
// data-theme before the CSS paints (no flash of the dark theme on a Sand reload).

import { t } from '../i18n/index.js';
export const THEMES = [
  { id: 'night', name: t('theme.night'), desc: t('theme.night.desc'), swatch: ['#050a07', '#0f1d16', '#34d399', '#fbbf24'] },
  { id: 'sand', name: t('theme.sand'), desc: t('theme.sand.desc'), swatch: ['#efe4cf', '#f8f0e0', '#2d1f12', '#8a5a00'] },
  { id: 'dusk', name: t('theme.dusk'), desc: t('theme.dusk.desc'), swatch: ['#150d1f', '#22162f', '#fb923c', '#fbbf24'] }
];
export const THEME_IDS = THEMES.map(t => t.id);
export const DEFAULT_THEME = 'night';
export const THEME_STORAGE_KEY = 'AETHERIA_THEME';

/** A saved value, or 'night' when it is missing or unknown (old saves, hand-edited saves). */
export function normalizeTheme(id) {
  return THEME_IDS.includes(id) ? id : DEFAULT_THEME;
}

/** Write data-theme on <html> (and the early-paint mirror) for this settings object. */
export function applyThemeSetting(settings) {
  const theme = normalizeTheme(settings?.theme);
  if (settings) settings.theme = theme;
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = theme;
  try { globalThis.localStorage?.setItem(THEME_STORAGE_KEY, theme); } catch { /* private mode */ }
  return theme;
}

/** Settings radio group (one .settings-option per theme). `onChange` runs after the theme applies. */
export function renderThemeSettings(container, settings, onChange) {
  if (!container) return;
  const current = normalizeTheme(settings.theme);
  container.innerHTML = THEMES.map(t => `
    <label class="settings-option theme-option">
      <input type="radio" name="theme" value="${t.id}" ${current === t.id ? 'checked' : ''}>
      <span class="theme-swatch" aria-hidden="true">${t.swatch.map(c => `<i style="background:${c}"></i>`).join('')}</span>
      <span>${t.name}</span>
      <span class="settings-sample">${t.desc}</span>
    </label>
  `).join('');
  container.addEventListener('change', (e) => {
    if (e.target.name !== 'theme') return;
    settings.theme = normalizeTheme(e.target.value);
    applyThemeSetting(settings);
    onChange?.();
  });
}

// JS-side colours. Toasts, floating text and canvas sparks are called with Night hex values
// (some from files this module doesn't own). Under Night they pass through unchanged; under
// another theme a known accent becomes that theme's token, so it stays readable on its background.
export const HEX_TOKEN = {
  '#38bdf8': 'aether', '#67e8f9': 'aether', '#06b6d4': 'aether',
  '#fbbf24': 'gold', '#f59e0b': 'gold', '#eab308': 'gold', '#fde047': 'gold', '#facc15': 'gold',
  '#c084fc': 'dust', '#a855f7': 'dust',
  '#f472b6': 'shard', '#ec4899': 'shard',
  '#34d399': 'life', '#4ade80': 'life', '#10b981': 'life', '#a3e635': 'life',
  '#60a5fa': 'mana', '#818cf8': 'mana', '#3b82f6': 'mana',
  '#e7c38a': 'sand',
  '#f87171': 'danger', '#ef4444': 'danger',
  '#94a3b8': 'text-3', '#64748b': 'text-3',
  '#9aa5b1': 'rarity-common', '#56b4e9': 'rarity-rare', '#b388ff': 'rarity-epic',
  '#ef8a3c': 'rarity-legendary', '#ffd84d': 'rarity-cosmic', '#ff5d8f': 'rarity-mythic'
};

function activeTheme() {
  return (typeof document === 'undefined' || !document.documentElement) ? DEFAULT_THEME : normalizeTheme(document.documentElement.dataset?.theme);
}

/** For CSS (inline styles, custom properties): a known Night hex becomes var(--token). */
export function themeVar(color) {
  if (typeof color !== 'string' || activeTheme() === DEFAULT_THEME) return color;
  const tok = HEX_TOKEN[color.toLowerCase()];
  return tok ? `var(--${tok})` : color;
}

const computedCache = new Map();
/** For canvas drawing, which can't read var(): the token's current computed value. */
export function themeColor(color) {
  if (typeof color !== 'string') return color;
  const theme = activeTheme();
  if (theme === DEFAULT_THEME) return color;
  const tok = HEX_TOKEN[color.toLowerCase()];
  if (!tok || typeof getComputedStyle !== 'function') return color;
  const key = `${theme}:${tok}`;
  if (!computedCache.has(key)) {
    computedCache.set(key, getComputedStyle(document.documentElement).getPropertyValue(`--${tok}`).trim() || color);
  }
  return computedCache.get(key);
}
