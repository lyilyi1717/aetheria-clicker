// R48: the visual half of a purchase, and an honest answer to a tap that did nothing.
// afterBuy(btn, n, countEl): n > 0 -> the count pops (120 ms) and a "+n" chip rises from the
// button (3 sizes, capped); n <= 0 -> a short neutral denied cue (soft click, dim outline).
// The chip is a fixed-position element on <body> so a button whose text is rewritten every frame
// cannot wipe it. Reduced motion: the count does not pop and the chip fades in place (CSS).
// No DOM (node tests): every call is a no-op.
import { sound } from '../engine/AudioEngine.js';
import { feedback } from './feedback.js';

export const CHIP_MS = 700;
export const POP_MS = 120;
export const DENIED_MS = 260;
const MAX_CHIPS = 6;

const hasDom = () => typeof document !== 'undefined' && !!document.body;

/** 1 for a single buy, 2 for ten or more, 3 for a hundred or more. */
export function chipSize(n) {
  return n >= 100 ? 3 : n >= 10 ? 2 : 1;
}

export function popCount(el) {
  if (el) feedback.cue(el, 'count-pop', POP_MS);
}

export function riseChip(btn, n) {
  if (!hasDom() || !btn?.isConnected) return null;
  const live = document.querySelectorAll('.buy-chip');
  if (live.length >= MAX_CHIPS) live[0].remove();
  const r = btn.getBoundingClientRect();
  const chip = document.createElement('span');
  chip.className = `buy-chip size-${chipSize(n)}`;
  chip.textContent = `+${n}`;
  chip.setAttribute('aria-hidden', 'true');
  chip.style.left = `${r.left + r.width / 2}px`;
  chip.style.top = `${r.top}px`;
  document.body.appendChild(chip);
  setTimeout(() => chip.remove(), CHIP_MS);
  return chip;
}

export function denied(btn) {
  if (!hasDom()) return;
  sound.playClick(0.6);
  if (btn) feedback.cue(btn, 'tap-denied', DENIED_MS);
}

export function afterBuy(btn, n, countEl = null) {
  if (!hasDom()) return;
  if (!(n > 0)) { denied(btn); return; }
  popCount(countEl);
  riseChip(btn, n);
}
