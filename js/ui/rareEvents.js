// Rare events look and sound different (R47, docs/game-feel-opportunities.md §3 item 8; guide P2,
// P3). One place for the small visual halves so the systems only make one call:
//   anomalyAppear()      soft pluck + a 600 ms shimmer on the anomaly, once
//   mirageHaze(seconds)  purple vignette over the page for the Mirage buff (off under reduced motion)
//   caravanCrossing()    a camel silhouette crosses the header (1.2 s; off under reduced motion)
//   supernovaCount(from, to)   the Oil counter rolls up over 800 ms
// Sound and colour stay under reduced motion; moving visuals do not. Without a DOM (node tests)
// every call is a no-op, so the systems can call these freely.
import { sound as defaultSound } from '../engine/AudioEngine.js';
import { feedback as defaultFeedback, COUNT_UP_MS } from './feedback.js';
import { isReducedMotion } from './motion.js';

export const SHIMMER_MS = 600;
export const CARAVAN_CROSS_MS = 1200;
export const HAZE_FADE_MS = 1000;
export const COUNTING_ATTR = 'counting';

const hasDom = () => typeof document !== 'undefined' && !!document.body;

let hazeEl = null;
let hazeTimer = null;
let camelEl = null;

export function anomalyAppear({ sound = defaultSound, feedback = defaultFeedback } = {}) {
  if (!hasDom()) return false;
  sound.play('pluck');
  feedback.cue(document.getElementById('golden-anomaly'), 'anomaly-shimmer', SHIMMER_MS);
  return true;
}

/** The haze for `seconds`; calling again (a refreshed Mirage) restarts it. Returns false when off. */
export function mirageHaze(seconds, { sound = defaultSound, reduced = isReducedMotion } = {}) {
  if (!hasDom()) return false;
  sound.play('mirage');
  if (reduced()) return false;
  if (!hazeEl) {
    hazeEl = document.createElement('div');
    hazeEl.className = 'mirage-haze';
    hazeEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(hazeEl);
  }
  hazeEl.classList.add('is-on');
  clearTimeout(hazeTimer);
  hazeTimer = setTimeout(clearMirageHaze, Math.max(0, seconds * 1000 - HAZE_FADE_MS));
  return true;
}

export function clearMirageHaze() {
  clearTimeout(hazeTimer);
  hazeTimer = null;
  if (!hazeEl) return;
  hazeEl.classList.remove('is-on');
  const el = hazeEl;
  hazeEl = null;
  setTimeout(() => el.remove(), HAZE_FADE_MS);
}

export function caravanCrossing({ sound = defaultSound, reduced = isReducedMotion } = {}) {
  if (!hasDom()) return false;
  sound.play('caravan');
  if (reduced()) return false;
  camelEl?.remove();
  const header = document.getElementById('top-dashboard');
  const r = header?.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'caravan-camel';
  el.setAttribute('aria-hidden', 'true');
  el.textContent = '🐪';
  el.style.top = `${Math.round(r ? r.top + r.height / 2 - 16 : 8)}px`;
  document.body.appendChild(el);
  camelEl = el;
  setTimeout(() => { el.remove(); if (camelEl === el) camelEl = null; }, CARAVAN_CROSS_MS + 100);
  return true;
}

/** True while the Oil counter is rolling up, so the header does not overwrite it each frame. */
export function isCountingUp(el) {
  return !!el && el.dataset?.[COUNTING_ATTR] === '1';
}

export function supernovaCount(from, to, { feedback = defaultFeedback, reduced = isReducedMotion } = {}) {
  if (!hasDom()) return false;
  const el = document.getElementById('stat-aether');
  if (!el || reduced()) return false;
  const fmt = (n) => n.format('standard', 2);
  el.dataset[COUNTING_ATTR] = '1';
  feedback.countUp(el, from, to, { ms: COUNT_UP_MS, fmt });
  setTimeout(() => { delete el.dataset[COUNTING_ATTR]; }, COUNT_UP_MS + 50);
  return true;
}
