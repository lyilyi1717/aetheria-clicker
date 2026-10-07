// Reduced motion (R24, docs/ui-style-guide.md §6). The "Reduce motion" setting is 'auto' (follow
// the device's prefers-reduced-motion), 'on' or 'off'. The result is written to <html> as
// data-motion="reduced" or data-motion="full"; CSS (tokens.css, animations.css, style.css,
// rewards.css) and the particle engine read that attribute, so nothing else needs the setting.

import { t } from '../i18n/index.js';
export const MOTION_MODES = ['auto', 'on', 'off'];
export const DEFAULT_MOTION_MODE = 'auto';
const OS_QUERY = '(prefers-reduced-motion: reduce)';

/** A saved value, or 'auto' when it is missing or unknown (old saves, hand-edited saves). */
export function normalizeMotionMode(mode) {
  return MOTION_MODES.includes(mode) ? mode : DEFAULT_MOTION_MODE;
}

/** True when motion should be reduced for this mode and device preference. */
export function resolveReducedMotion(mode, osPrefersReduced) {
  const m = normalizeMotionMode(mode);
  if (m === 'on') return true;
  if (m === 'off') return false;
  return !!osPrefersReduced;
}

export function osPrefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia(OS_QUERY).matches;
}

/** What the page is doing right now (falls back to the device setting before JS applied one). */
export function isReducedMotion() {
  if (typeof document === 'undefined') return false;
  const attr = document.documentElement.dataset.motion;
  if (attr === 'reduced') return true;
  if (attr === 'full') return false;
  return osPrefersReducedMotion();
}

let currentMode = DEFAULT_MOTION_MODE;
let osListener = null;

/** Write data-motion on <html> for this settings object, and keep 'auto' following the device. */
export function applyMotionSetting(settings) {
  if (typeof document === 'undefined') return;
  currentMode = normalizeMotionMode(settings?.reduceMotion);
  const reduced = resolveReducedMotion(currentMode, osPrefersReducedMotion());
  document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';

  if (!osListener && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mq = window.matchMedia(OS_QUERY);
    osListener = () => {
      if (currentMode === 'auto') document.documentElement.dataset.motion = mq.matches ? 'reduced' : 'full';
    };
    mq.addEventListener?.('change', osListener);
  }
}

const MODE_LABELS = {
  auto: t('motion.auto'),
  on: t('motion.on'),
  off: t('motion.off')
};

/** Settings radio group (one .settings-option per mode). `onChange` runs after the attribute updates. */
export function renderMotionSettings(container, settings, onChange) {
  if (!container) return;
  const mode = normalizeMotionMode(settings.reduceMotion);
  const device = osPrefersReducedMotion() ? 'on' : 'off';
  container.innerHTML = MOTION_MODES.map(m => `
    <label class="settings-option">
      <input type="radio" name="reduceMotion" value="${m}" ${mode === m ? 'checked' : ''}>
      <span>${MODE_LABELS[m]}</span>
      ${m === 'auto' ? `<span class="settings-sample">${t('motion.device', { v: t(`motion.device.${device}`) })}</span>` : ''}
    </label>
  `).join('');
  container.addEventListener('change', (e) => {
    if (e.target.name !== 'reduceMotion') return;
    settings.reduceMotion = normalizeMotionMode(e.target.value);
    applyMotionSetting(settings);
    onChange?.();
  });
}
