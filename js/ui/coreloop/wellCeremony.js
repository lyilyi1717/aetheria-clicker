// The first New Well as a ceremony (docs/core-loop-feel-study.md R5): the screen dims, the well
// gushes, a card counts up what the run paid and says what it did to the whole game, and one
// button goes to the upgrade tree. Later New Wells get a short banner from feedback.js instead.
// summary() is pure (tested in test_cl_ui_feedback.js); open() builds the DOM and needs a document.
import { t } from '../../i18n/index.js';
import { P } from '../../systems/coreloop/params.js';
import { isReducedMotion } from '../motion.js';
import { icon } from './icons.js';

export const COUNT_MS = 900;     // the Reserves count up
export const REVEAL_MS = 1500;   // everything is on screen, the button is ready
const DROPS = 14;

const round2 = (x) => Math.round(x * 100) / 100;

// "17:10", or "1 h 05 min" from an hour on
export function runTime(seconds) {
  const s = Math.max(0, Math.round(seconds));
  if (s >= 3600) return t('cl.fx.wc.time_hm', { h: Math.floor(s / 3600), m: String(Math.floor((s % 3600) / 60)).padStart(2, '0') });
  return t('cl.fx.wc.time_ms', { m: Math.floor(s / 60), s: String(s % 60).padStart(2, '0') });
}

// What the card says, from the event ({ reserves, seconds, first }) and the state after the reset.
// mult is the Crude multiplier the Reserves give: 1 + P.resPer x every Reserve earned.
export function summary(event, state) {
  const earned = state?.prestige?.reserves ?? 0;
  const gained = event.reserves || 0;
  const after = round2(1 + P.resPer * earned);
  const before = round2(1 + P.resPer * Math.max(0, earned - gained));
  return {
    run: Math.max(1, state?.prestige?.wells ?? 1), gained, seconds: event.seconds || 0,
    before, after, time: runTime(event.seconds || 0), first: !!event.first
  };
}

// A later New Well: the numbers its banner names
export function bannerParams(event, state) {
  const s = summary(event, state);
  return { n: s.gained, run: s.run, time: s.time, after: s.after, before: s.before };
}

const el = (doc, tag, cls, text) => {
  const e = doc.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

/**
 * Opens the ceremony. opts: { doc, onSpend, sound }. Returns { close, el }. The "Spend them" button
 * calls onSpend() and closes; Escape closes and stays where you are. Nothing is lost either way:
 * the Reserves are already in the bank.
 */
export function open(sum, opts = {}) {
  const doc = opts.doc || (typeof document !== 'undefined' ? document : null);
  if (!doc?.body) return null;
  const reduced = isReducedMotion();
  const root = el(doc, 'div', 'clwc' + (reduced ? ' is-reduced' : ''));
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'clwc-title');

  const fountain = el(doc, 'div', 'clwc-fountain');
  fountain.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < DROPS; i++) {
    const d = el(doc, 'i', 'clwc-drop');
    d.style.setProperty('--i', String(i));
    fountain.appendChild(d);
  }
  const card = el(doc, 'div', 'clwc-card');
  const badge = el(doc, 'div', 'clwc-badge');
  badge.setAttribute('aria-hidden', 'true');
  badge.innerHTML = icon('well');
  const title = el(doc, 'h2', 'clwc-title', t('cl.fx.wc.title'));
  title.id = 'clwc-title';
  const gain = el(doc, 'p', 'clwc-gain');
  const num = el(doc, 'strong', 'clwc-num', reduced ? String(sum.gained) : '0');
  gain.append(el(doc, 'span', 'clwc-plus', '+'), num, el(doc, 'span', 'clwc-unit', ' ' + t('cl.fx.wc.unit')));
  const runLine = el(doc, 'p', 'clwc-run clwc-late', t('cl.fx.wc.run', { n: sum.run, time: sum.time }));
  const multLine = el(doc, 'p', 'clwc-mult clwc-late');
  multLine.append(
    el(doc, 'span', 'clwc-mult-lead', t('cl.fx.wc.mult_lead')), ' ',
    el(doc, 'strong', 'clwc-mult-num', t('cl.fx.wc.mult', { n: sum.after })), ' ',
    el(doc, 'span', 'clwc-mult-was', t('cl.fx.wc.mult_was', { n: sum.before }))
  );
  const keep = el(doc, 'p', 'clwc-keep clwc-late', t('cl.fx.wc.keep'));
  const go = el(doc, 'button', 'btn btn-primary btn-lg btn-block clwc-go clwc-late', t('cl.fx.wc.go'));
  go.type = 'button';
  card.append(badge, title, gain, runLine, multLine, keep, go);
  root.append(fountain, card);
  doc.body.appendChild(root);

  let closed = false;
  const timers = [];
  let raf = 0;
  const close = () => {
    if (closed) return;
    closed = true;
    timers.forEach(clearTimeout);
    if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
    doc.removeEventListener('keydown', onKey, true);
    root.classList.add('is-leaving');
    setTimeout(() => root.remove(), reduced ? 0 : 220);
  };
  const reveal = () => {
    root.classList.add('is-revealed');
    num.textContent = String(sum.gained);
  };
  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
  }
  doc.addEventListener('keydown', onKey, true);
  go.addEventListener('click', () => { close(); if (opts.onSpend) opts.onSpend(); });
  // a tap on the card before it has finished shows all of it at once (a ceremony is never a wait)
  card.addEventListener('click', (e) => { if (e.target !== go && !root.classList.contains('is-revealed')) reveal(); });

  if (opts.sound) { try { opts.sound(); } catch { /* sound is a bonus */ } }

  if (reduced || typeof requestAnimationFrame !== 'function') {
    reveal();
  } else {
    root.classList.add('is-open');
    // count up while the card lands; the lines and the button follow
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 350;
    const step = () => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const p = Math.min(1, Math.max(0, (now - t0) / COUNT_MS));
      num.textContent = String(Math.round(sum.gained * (1 - Math.pow(1 - p, 3))));
      if (p < 1 && !closed) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    timers.push(setTimeout(reveal, REVEAL_MS));
  }
  timers.push(setTimeout(() => { if (!closed) go.focus({ preventScroll: true }); }, reduced ? 0 : REVEAL_MS));
  return { close, el: root };
}
