// Themes (R35, docs/ui-style-guide.md §2.5). Every colour comes from the tokens in
// css/tokens.css; a theme is a `:root[data-theme="…"]` block there that overrides them. This
// module writes the chosen theme to <html> as data-theme and draws the Settings picker. The
// choice is a setting (settings.theme), not game progress; old saves without it get Night.
// It is also mirrored to its own localStorage key so the inline script in index.html can set
// data-theme before the CSS paints (no flash of the dark theme on a Sand reload).

export const THEMES = [
  { id: 'night', name: 'Night', desc: 'The emerald night: dark, neon currencies.', swatch: ['#050a07', '#0f1d16', '#34d399', '#fbbf24'] },
  { id: 'sand', name: 'Sand', desc: 'Light and warm: parchment, deep brown text, gold.', swatch: ['#efe4cf', '#f8f0e0', '#2d1f12', '#8a5a00'] },
  { id: 'dusk', name: 'Desert Dusk', desc: 'Plum sky after sunset, orange glow.', swatch: ['#150d1f', '#22162f', '#fb923c', '#fbbf24'] }
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
