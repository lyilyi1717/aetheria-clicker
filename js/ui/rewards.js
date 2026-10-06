// Reward feedback (redesign §5.1): toasts for small/medium rewards, a skippable full-screen
// ceremony for big/epic ones, one sound per tier. The queue and batching rules live in
// rewardQueue.js (pure, unit-tested); this file only draws them.
//
// Public API (safe to call from systems; a no-op where there is no DOM, e.g. node tests):
//   rewards.notify(ev)      route by ev.tier: small/medium -> toast, big/epic -> ceremony
//   rewards.toast(ev)       always a toast
//   rewards.ceremony(ev)    big/epic ceremony (big ones inside the 60 s cooldown become a toast)
//   rewards.beginBatch() / rewards.endBatch(detail)   collect events, then show one per kind
//   rewards.isCeremonyActive()                         e.g. to pause the boss timer
// ev = { tier, kind, title, batchTitle?, icon?, color?, detail?, amount?, fmt?, unit?, source? }
//   kind        same-kind events coalesce ("Contract complete ×4"); batchTitle may use {n}
//   amount      number or BigNum, summed when events coalesce; fmt(amount) formats it
//   source      element or element id that pulses gold once ("look here")
//   sound       true/false overrides the tier default (small toasts are silent by default:
//               the action that caused them already made its own sound)

import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { isReducedMotion } from './motion.js';
import {
  ToastQueue, CeremonyScheduler, RewardBatch, rewardTitle, rewardValue, normalizeTier
} from './rewardQueue.js';

const hasDom = () => typeof document !== 'undefined' && !!document.body;
const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const SOUND_GAP_MS = 250;   // never stack toast sounds closer than this
const TICK_MS = 200;

function defaultFmt(a) {
  return BigNum.formatNumber(a, 2);
}

function scaleAmount(a, frac) {
  if (a instanceof BigNum) return a.mul(frac);
  if (typeof a === 'number') return a * frac;
  return a;
}

class RewardFeedback {
  constructor() {
    this.toasts = new ToastQueue();
    this.ceremonies = new CeremonyScheduler();
    this.warpBatch = new RewardBatch();   // Fast Forward and other simulated bursts
    this.awayBatch = new RewardBatch();   // tab hidden
    this.ready = false;
    this.toastEls = new Map();
    this.lastSoundAt = -Infinity;
    this.ceremonyTimer = null;
    this.countUpRaf = null;
  }

  init() {
    if (this.ready || !hasDom()) return;
    this.ready = true;

    this.stack = document.createElement('div');
    this.stack.id = 'reward-toasts';
    this.stack.className = 'reward-toasts';
    this.stack.setAttribute('role', 'status');
    this.stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.stack);

    const ov = document.createElement('div');
    ov.id = 'reward-ceremony';
    ov.className = 'reward-ceremony';
    ov.setAttribute('role', 'alert');
    ov.setAttribute('aria-hidden', 'true');
    ov.innerHTML = `
      <div class="reward-ceremony-burst"></div>
      <div class="reward-ceremony-card">
        <div class="reward-ceremony-icon"></div>
        <div class="reward-ceremony-title"></div>
        <div class="reward-ceremony-value"></div>
        <div class="reward-ceremony-detail"></div>
        <div class="reward-ceremony-hint">Tap or press Esc to continue</div>
      </div>`;
    document.body.appendChild(ov);
    this.overlay = ov;
    this.ovIcon = ov.querySelector('.reward-ceremony-icon');
    this.ovTitle = ov.querySelector('.reward-ceremony-title');
    this.ovValue = ov.querySelector('.reward-ceremony-value');
    this.ovDetail = ov.querySelector('.reward-ceremony-detail');

    ov.addEventListener('click', () => this.skipCeremony());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.ceremonies.active) this.skipCeremony();
    });

    // Events while the tab is hidden come back as one summary per kind
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (!this.awayBatch.active) this.awayBatch.begin();
      } else if (this.awayBatch.active) {
        this.flush(this.awayBatch.end('While you were away'));
      }
    });
    if (document.hidden) this.awayBatch.begin();

    this.tickHandle = setInterval(() => this.tick(), TICK_MS);
  }

  // Device setting or the in-game "Reduce motion" (R24, js/ui/motion.js)
  reducedMotion() {
    return isReducedMotion();
  }

  // ---- public API --------------------------------------------------------------------------

  notify(ev) {
    if (!ev) return;
    if (!this.ready) this.init();
    if (!this.ready) return;
    if (this.awayBatch.active) { this.awayBatch.add(ev); return; }
    if (this.warpBatch.active) { this.warpBatch.add(ev); return; }
    const tier = normalizeTier(ev.tier);
    if (tier === 'big' || tier === 'epic') this.ceremony(ev);
    else this.toast(ev);
  }

  toast(ev) {
    if (!this.ready) this.init();
    if (!this.ready) return;
    const now = clock();
    const { entry, action } = this.toasts.push(ev, now);
    if (action === 'shown') this.toastSound(entry, ev);
    this.renderToasts(action === 'merged' ? entry.id : null);
  }

  ceremony(ev) {
    if (!this.ready) this.init();
    if (!this.ready) return;
    const now = clock();
    const { entry, action } = this.ceremonies.request(ev, now);
    if (action === 'show') this.openCeremony(entry);
    else if (action === 'merged' && entry === this.ceremonies.active) this.fillCeremony(entry, false);
    else if (action === 'toast') this.toast({ ...ev, tier: 'big' });
  }

  beginBatch() {
    this.warpBatch.begin();
  }

  endBatch(detail = '') {
    this.flush(this.warpBatch.end(detail));
  }

  isCeremonyActive() {
    return !!this.ceremonies.active;
  }

  // ---- toasts ------------------------------------------------------------------------------

  flush(events) {
    for (const ev of events) this.notify(ev);
  }

  toastSound(entry, ev) {
    const wants = ev.sound !== undefined ? ev.sound : entry.tier !== 'small';
    if (!wants) return;
    const now = clock();
    if (now - this.lastSoundAt < SOUND_GAP_MS) return;
    this.lastSoundAt = now;
    sound.playTier(entry.tier === 'small' ? 'small' : 'medium');
  }

  tick() {
    const { removed, promoted } = this.toasts.tick(clock());
    if (removed.length || promoted.length) {
      for (const e of promoted) this.pulse(e.source);
      this.renderToasts();
    }
  }

  renderToasts(bumpId = null) {
    const visible = this.toasts.visible;
    const ids = new Set(visible.map(e => e.id));
    for (const [id, el] of this.toastEls) {
      if (ids.has(id)) continue;
      this.toastEls.delete(id);
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 260);
    }
    for (const e of visible) {
      let el = this.toastEls.get(e.id);
      if (!el) {
        el = document.createElement('div');
        el.className = `reward-toast tier-${e.tier}`;
        el.innerHTML = '<span class="reward-toast-icon"></span><span class="reward-toast-body">'
          + '<span class="reward-toast-title"></span><span class="reward-toast-value"></span>'
          + '<span class="reward-toast-detail"></span></span>';
        this.stack.appendChild(el);
        this.toastEls.set(e.id, el);
        if (!e._pulsed) { e._pulsed = true; this.pulse(e.source); }
      }
      el.className = `reward-toast tier-${e.tier}`;
      if (e.color) el.style.setProperty('--toast-accent', e.color);
      el.querySelector('.reward-toast-icon').textContent = e.icon || '';
      el.querySelector('.reward-toast-title').textContent = rewardTitle(e);
      el.querySelector('.reward-toast-value').textContent = rewardValue({ ...e, fmt: e.fmt || defaultFmt });
      el.querySelector('.reward-toast-detail').textContent = e.detail || '';
      if (bumpId === e.id) {
        el.classList.remove('is-bumped');
        void el.offsetWidth; // restart the animation
        el.classList.add('is-bumped');
      }
    }
  }

  pulse(source) {
    if (!source || !hasDom()) return;
    const el = typeof source === 'string' ? document.getElementById(source) : source;
    if (!el || !el.classList) return;
    el.classList.remove('reward-pulse');
    void el.offsetWidth;
    el.classList.add('reward-pulse');
    setTimeout(() => el.classList.remove('reward-pulse'), 1000);
  }

  // ---- ceremonies --------------------------------------------------------------------------

  openCeremony(entry) {
    const ov = this.overlay;
    ov.className = `reward-ceremony tier-${entry.tier} is-open`;
    if (entry.color) ov.style.setProperty('--ceremony-accent', entry.color);
    else ov.style.removeProperty('--ceremony-accent');
    ov.setAttribute('aria-hidden', 'false');
    this.fillCeremony(entry, true);
    sound.playTier(entry.tier);
    clearTimeout(this.ceremonyTimer);
    this.ceremonyTimer = setTimeout(() => this.skipCeremony(), this.ceremonies.duration(entry, this.reducedMotion()));
  }

  fillCeremony(entry, countUp) {
    this.ovIcon.textContent = entry.icon || '✦';
    this.ovTitle.textContent = rewardTitle(entry);
    this.ovDetail.textContent = entry.detail || '';
    const fmt = entry.fmt || defaultFmt;
    const final = rewardValue({ ...entry, fmt });
    cancelAnimationFrame(this.countUpRaf);
    if (!final || !countUp || this.reducedMotion()) {
      this.ovValue.textContent = final;
      return;
    }
    // Count-up over 0.8 s (§5.2 "count-ups, not snaps")
    const start = clock();
    const step = () => {
      const p = Math.min(1, (clock() - start) / 800);
      const eased = 1 - Math.pow(1 - p, 3);
      this.ovValue.textContent = p >= 1 ? final : rewardValue({ ...entry, fmt, amount: scaleAmount(entry.amount, eased) });
      if (p < 1 && this.ceremonies.active === entry) this.countUpRaf = requestAnimationFrame(step);
    };
    step();
  }

  skipCeremony() {
    const done = this.ceremonies.active;
    if (!done) return;
    clearTimeout(this.ceremonyTimer);
    cancelAnimationFrame(this.countUpRaf);
    const next = this.ceremonies.finish(clock());
    if (next) {
      this.openCeremony(next);
    } else {
      this.overlay.classList.remove('is-open');
      this.overlay.setAttribute('aria-hidden', 'true');
    }
    // The screen settles on the thing that changed
    this.pulse(done.source);
  }
}

export const rewards = new RewardFeedback();
