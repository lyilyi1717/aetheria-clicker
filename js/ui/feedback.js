// Feedback-tier helper (R41, docs/game-feel-opportunities.md §4, game-feel guide §4 P2 and §5).
// One place decides how strongly a moment reacts: T0 tap, T1 good, T2 great, T3 peak. Systems
// call it the way they call rewards.notify; the guardrails live here once:
// - particle and text caps, "+n" merging (ParticleEngine reads js/ui/feedbackBudget.js)
// - per-kind sound cooldowns (T1 250 ms, T2 1 s; T0 always answers) and chain escalation (P5)
// - reduced motion (no sparks, shake, hit-stop or count-up; sound and colour stay: cue() swaps a
//   flash animation for a static colour held as long, R49)
// - mute/volume and Fast Forward (AudioEngine and ParticleEngine check those themselves)
// T3 never opens a ceremony itself: it goes through rewards.ceremony, so the queue, cooldown and
// skip rules still apply. Without a DOM (node tests) every call is a no-op.
import { particles as defaultParticles } from '../engine/ParticleEngine.js';
import { sound as defaultSound } from '../engine/AudioEngine.js';
import { BigNum } from '../engine/BigNum.js';
import { rewards as defaultRewards } from './rewards.js';
import { isReducedMotion } from './motion.js';
import {
  budgetFor, clampTier, createFeedbackState, chainStep, soundReady, isPhoneWidth
} from './feedbackBudget.js';

export const COUNT_UP_MS = 800;
const SHAKE_CLASS = 'fx-shake';
const HITSTOP_CLASS = 'is-hitstop';

// Reduced motion removes every animation (tokens.css), so a one-shot flash would vanish. cue()
// shows these static classes instead, held for as long as the animation ran (R49, guide §5).
export const STATIC_CUES = {
  'reward-pulse': { cls: 'cue-gold-outline', ms: 900 },   // gold "look here" on a reward's source
  'blast-flash': { cls: 'cue-orange-inset', ms: 600 },    // blasted mining tiles
  'fx-flash': { cls: 'cue-red-border', ms: 150 }          // boss portrait on the killing blow
};

const hasDom = () => typeof document !== 'undefined';
const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// {x, y} or an element (its centre); null when there is nowhere to draw
function resolvePoint(at) {
  if (!at) return null;
  if (typeof at.getBoundingClientRect === 'function') {
    if (!at.isConnected) return null;
    const r = at.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return at.x && at.y ? { x: at.x, y: at.y } : null;
}

function lerpAmount(from, to, p) {
  if (to instanceof BigNum) {
    const a = from instanceof BigNum ? from : new BigNum(from || 0);
    return a.add(to.sub(a).mul(p));
  }
  return Number(from) + (Number(to) - Number(from)) * p;
}

export class Feedback {
  constructor({
    particles = defaultParticles, sound = defaultSound, rewards = null,
    dom = hasDom, now = clock, reduced = isReducedMotion,
    width = () => (typeof window !== 'undefined' ? window.innerWidth : 0)
  } = {}) {
    Object.assign(this, { particles, sound, dom, now, reduced, width });
    this.ownRewards = rewards;         // read lazily: rewards.js imports this module for cue()
    this.state = createFeedbackState();
    this.shaking = null;               // at most one shake at a time (opportunities §4)
    this.countUps = new WeakMap();     // element -> running count-up frame
    this.cueTimers = new WeakMap();    // element -> Map(class -> removal timer)
  }

  get rewards() { return this.ownRewards ?? defaultRewards; }

  /**
   * React to a moment. Options (all optional):
   *   kind        'click', 'crit', 'hit', ... (cooldowns and chains are per kind)
   *   at          {x, y} or an element: where sparks and text go
   *   color       spark colour (token or hex)
   *   sparks      spark count (the tier's default otherwise); phone x0.6, reduced motion 0
   *   sound       a sound id (AudioEngine SOUND_IDS) or false; soundPitch passed to it
   *   fallbackSound  played instead when `sound` is on its cooldown (taps must never go silent)
   *   label, labelColor, labelOffset   short callout above the point ("CRIT!"), T1+
   *   text        the floating text, or amount + fmt (+ prefix, default '+') to build it
   *   textColor, isCrit   text colour and the bold crit style
   *   merge       true: this "+n" adds into the last one of the same kind (150 ms / 40 px)
   *   target      element to shake / hit-stop (T2, motion on)
   *   chain       true: escalate with repeated `kind` (result.chain, 0..cap)
   *   ceremony    T3 only: the rewards.ceremony event
   * Returns what was spent (for tests and callers that scale with the chain), or null.
   */
  fire(tier, opts = {}) {
    if (!this.dom()) return null;
    const t = clampTier(tier);
    const now = this.now();
    const kind = opts.kind || `t${t}`;

    if (t === 3) {
      if (opts.ceremony) this.rewards.ceremony(opts.ceremony);
      return { tier: t, ceremony: !!opts.ceremony };
    }

    const reduced = !!this.reduced();
    const budget = budgetFor(t, { reduced, phone: isPhoneWidth(this.width()), sparks: opts.sparks });
    const chain = opts.chain ? chainStep(this.state, kind, now) : 0;

    let played = null;
    if (opts.sound) {
      if (soundReady(this.state, kind, t, now)) played = opts.sound;
      else if (opts.fallbackSound) played = opts.fallbackSound;
      if (played) this.sound.play(played, opts.soundPitch);
    }

    const p = resolvePoint(opts.at);
    if (p) {
      if (budget.sparks > 0) this.particles.spawnClickSparks(p.x, p.y, budget.sparks, opts.color);
      if (opts.label && t >= 1) {
        this.particles.spawnFloatingText(p.x, p.y + (opts.labelOffset ?? -30), opts.label,
          opts.labelColor || opts.color, true);
      }
      const fmt = opts.fmt || ((n) => (n?.format ? n.format('standard', 1) : String(n)));
      const prefix = opts.prefix ?? '+';
      const text = opts.text ?? (opts.amount !== undefined ? prefix + fmt(opts.amount) : null);
      if (text) {
        const merge = opts.merge && opts.text === undefined
          ? { key: kind, amount: opts.amount, prefix, fmt } : null;
        this.particles.spawnFloatingText(p.x, p.y, text, opts.textColor || opts.color, !!opts.isCrit, merge);
      }
    }

    if (opts.target) {
      if (budget.hitStop && opts.hitStop) this.hitStop(opts.target, opts.hitStop);
      if (budget.shake) this.shake(opts.target, budget.motionMs);
    }
    return { tier: t, sparks: p ? budget.sparks : 0, sound: played, chain };
  }

  /** Short shake on one element (T2, motion on); one at a time. */
  shake(el, ms = 240) {
    if (!this.dom() || !el?.classList || this.reduced() || this.shaking) return false;
    this.shaking = el;
    el.classList.add(SHAKE_CLASS);
    setTimeout(() => { el.classList.remove(SHAKE_CLASS); this.shaking = null; }, ms);
    return true;
  }

  /**
   * One-shot flash on an element: adds `cls` (its CSS animation) for `ms`, restarting it if it is
   * already on. Under reduced motion the animation would be removed, so the element gets the
   * static colour from STATIC_CUES instead, held for that cue's time. Returns the class added.
   */
  cue(el, cls, ms) {
    if (!this.dom() || !el?.classList) return null;
    const fallback = this.reduced() ? STATIC_CUES[cls] : null;
    const name = fallback ? fallback.cls : cls;
    const hold = fallback ? fallback.ms : ms;
    let timers = this.cueTimers.get(el);
    if (!timers) this.cueTimers.set(el, timers = new Map());
    clearTimeout(timers.get(name));
    el.classList.remove(name);
    void el.offsetWidth;               // restart the animation on a repeat
    el.classList.add(name);
    timers.set(name, setTimeout(() => { el.classList.remove(name); timers.delete(name); }, hold));
    return name;
  }

  /** Visual freeze of an element's animations (the sim keeps running). Off under reduced motion. */
  hitStop(el, ms = 90) {
    if (!this.dom() || !el?.classList || this.reduced()) return false;
    el.classList.add(HITSTOP_CLASS);
    setTimeout(() => el.classList.remove(HITSTOP_CLASS), Math.max(0, Math.min(120, ms)));
    return true;
  }

  /**
   * Roll an element's text from `from` to `to` (numbers or BigNum) with an ease-out, over `ms`
   * (default 0.8 s). Reduced motion or no DOM: jump straight to the result. Returns a cancel
   * function; a new count-up on the same element replaces the old one.
   */
  countUp(el, from, to, { ms = COUNT_UP_MS, fmt = (n) => (n?.format ? n.format('standard', 1) : String(Math.round(n))) } = {}) {
    if (!el) return () => {};
    const prev = this.countUps.get(el);
    if (prev) cancelAnimationFrame(prev.raf);
    if (!this.dom() || this.reduced() || typeof requestAnimationFrame !== 'function' || ms <= 0) {
      el.textContent = fmt(to);
      return () => {};
    }
    const start = this.now();
    const job = { raf: 0 };
    const step = () => {
      const p = Math.min(1, (this.now() - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(p >= 1 ? to : lerpAmount(from, to, eased));
      if (p < 1) job.raf = requestAnimationFrame(step);
      else this.countUps.delete(el);
    };
    this.countUps.set(el, job);
    step();
    return () => { cancelAnimationFrame(job.raf); this.countUps.delete(el); };
  }
}

export const feedback = new Feedback();
