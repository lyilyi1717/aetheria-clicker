// The Monolith's combo climb and Frenzy moment (R44, docs/game-feel-opportunities.md §3 item 4;
// game-feel guide P1, P3, P4, P5, P9).
// - Combo 5/10/15/20: a ring pulses on the combo bar; the orb glow steps up (data-combo-step 0-4,
//   styled in css/style.css). Clicks 18-19: the orb winds up (is-windup).
// - Frenzy (T2): "FRENZY!" callout 700 ms, a 30-spark ring burst and its own sound; the orb is
//   tinted while it lasts (is-frenzy). Running Frenzy extended: a "+4 s" chip instead.
// - The "Tap to pump Oil!" tooltip is removed after the first tap of the session.
// Reduced motion: no ring, sparks or scale; the callout text, colours and sounds stay.
import { feedback } from './feedback.js';
import { rewards } from './rewards.js';
import { isReducedMotion } from './motion.js';
import { getActiveRules } from '../systems/ChronicleSystem.js';
import { comboStep, isWindup } from '../systems/combo.js';
import { t } from '../i18n/index.js';

export const CALLOUT_MS = 700;
export const CHIP_MS = 900;
export const RING_MS = 450;
export const FRENZY_BURST_SPARKS = 30;

function popup(host, cls, text, ms) {
  const el = document.createElement('div');
  el.className = cls;
  el.textContent = text;
  el.setAttribute('aria-hidden', 'true');
  host.appendChild(el);
  setTimeout(() => el.remove(), ms);
  return el;
}

// Hooks the clicker's onComboFx to the orb and the combo bar
export function initComboFx(clicker, orb) {
  if (!clicker || !orb) return;
  const host = orb.parentElement;
  const bar = document.querySelector('.combo-bar');

  // The first tap of the session retires the hint (removing data-i18n-title stops a language
  // change from putting it back)
  orb.addEventListener('pointerdown', () => {
    orb.removeAttribute('title');
    orb.removeAttribute('data-i18n-title');
  }, { once: true });

  clicker.onComboFx = (ev) => {
    const visible = !!orb.offsetParent;
    if (ev.type === 'step') {
      if (!visible || !bar || isReducedMotion()) return;
      bar.classList.remove('is-ring');
      void bar.offsetWidth;   // restart the pulse on a repeat
      bar.classList.add('is-ring');
      setTimeout(() => bar.classList.remove('is-ring'), RING_MS);
      return;
    }
    if (ev.type === 'frenzyEnd') {
      // P8: celebrate the end. A quiet summary toast; skipped when the taps paid nothing
      if (!ev.oil || ev.oil.lte?.(0)) return;
      rewards.toast({
        tier: 'small', kind: 'frenzy-end', icon: '🔥', color: '#f97316',
        title: t('combo.frenzy_end', { n: ev.oil.format('standard', 1) })
      });
      return;
    }
    if (ev.type !== 'frenzy') return;
    feedback.fire(2, { kind: 'frenzy', at: visible ? orb : null, sound: 'frenzy', sparks: 0 });
    if (!visible) return;
    if (ev.extended) {
      popup(host, 'frenzy-chip', t('combo.frenzy_extend', { s: Math.round(ev.seconds) }), CHIP_MS);
      return;
    }
    popup(host, 'frenzy-callout', t('combo.frenzy_callout'), CALLOUT_MS);
    const r = orb.getBoundingClientRect();
    feedback.particles.spawnRingBurst(r.left + r.width / 2, r.top + r.height / 2, FRENZY_BURST_SPARKS, '#f97316');
  };
}

// Orb glow step, wind-up and Frenzy tint, from the live state (so they step back down as the
// combo drains). Only touches the DOM when something changed.
export function renderComboFx(orb, gameState, clicker) {
  if (!orb) return;
  const noFrenzy = getActiveRules(gameState).noFrenzy;
  const step = String(comboStep(gameState.comboCount));
  if (orb.dataset.comboStep !== step) orb.dataset.comboStep = step;
  const windup = !noFrenzy && !gameState.frenzyActive && isWindup(gameState.comboCount);
  if (orb.classList.contains('is-windup') !== windup) orb.classList.toggle('is-windup', windup);
  const frenzy = !!gameState.frenzyActive;
  if (orb.classList.contains('is-frenzy') !== frenzy) orb.classList.toggle('is-frenzy', frenzy);
}
