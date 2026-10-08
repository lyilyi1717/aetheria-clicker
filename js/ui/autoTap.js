// Auto-tap on the Refinery (R52, dust shop). A line under the per-click value says what it pays,
// and each tap gives the orb a soft pulse and a small, dim "+n" (T0, quieter than a real tap:
// no sound, no sparks, so a long idle session doesn't grate; game-feel guide §5).
import { particles } from '../engine/ParticleEngine.js';
import { t } from '../i18n/index.js';

const PULSE_MS = 160;

// Hooks the clicker's onAutoTap to the orb
export function initAutoTap(clicker, orb) {
  if (!clicker || !orb) return;
  clicker.onAutoTap = (amount) => {
    if (!orb.offsetParent) return;   // Refinery tab hidden: nothing to show
    const r = orb.getBoundingClientRect();
    particles.spawnFloatingText(r.left + r.width / 2, r.top + r.height * 0.3, '+' + amount.format('standard', 1), '#94a3b8');
    orb.classList.add('auto-pulse');
    setTimeout(() => orb.classList.remove('auto-pulse'), PULSE_MS);
  };
}

// The status line (hidden until Auto-tap is owned)
export function renderAutoTap(el, gameState, clicker) {
  if (!el) return;
  const on = gameState.hasAutoTap();
  if (el.hidden === on) el.hidden = !on;
  if (!on) return;
  const text = clicker.isAutoTapping()
    ? t('autotap.on', { n: gameState.getAutoTapPerSecond().format('standard', 1) })
    : t('autotap.paused');
  if (el.textContent !== text) el.textContent = text;
}
