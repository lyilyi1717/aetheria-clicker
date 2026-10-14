// Dig: the "Reduce motion" choice, with no DOM beyond what is passed in (so a test can run it).
// The default follows the browser's prefers-reduced-motion; once the player chooses, the choice wins and is kept in
// localStorage (not in the save). When on: no screen shake, no screen flashes, no burst of more than 8 bits, and the
// pulsing and bouncing in the page are calmed by the `calm` class on <html> (proto.css). Rules and sound are untouched.
export const KEY = 'DIGGER_ARGON_REDUCE_MOTION';
export const MAX_BURST = 8;

// what the browser asks for: mq is window.matchMedia (or nothing)
export function browserWants(mq) {
  try { return !!(mq && mq('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
}
// the saved choice if there is one ('1' or '0'), else the browser's wish
export function load(store, mq) {
  try { const v = store && store.getItem(KEY); if (v === '1') return true; if (v === '0') return false; } catch { /* blocked store */ }
  return browserWants(mq);
}
export function save(store, on) {
  try { store.setItem(KEY, on ? '1' : '0'); return true; } catch { return false; }
}
// the number of bits a burst may use
export const burst = (n, reduced) => (reduced ? Math.min(n, MAX_BURST) : n);

const s = { reduced: false };
// the one check the UI layer asks: true when full motion is wanted
export const motion = () => !s.reduced;
export function setReduced(on, root) {
  s.reduced = !!on;
  try { if (root) root.classList.toggle('calm', s.reduced); } catch { /* no DOM */ }
}
export const isReduced = () => s.reduced;
export function init(store, mq, root) { setReduced(load(store, mq), root); return s.reduced; }
