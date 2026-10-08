// High-performance Particle and Floating Text Engine
import { themeColor } from '../ui/theme.js';
import {
  MAX_TEXTS, FAST_DECAY, MERGE_SIZE_STEP, MERGE_SIZE_MAX,
  particleCap, isPhoneWidth, overCap, shouldMerge, addAmounts
} from '../ui/feedbackBudget.js';

// "Reduce motion" (R24, js/ui/motion.js writes data-motion on <html>): no sparks, and floating
// numbers fade where they appear instead of drifting
export function motionReduced() {
  return typeof document !== 'undefined' && document.documentElement?.dataset?.motion === 'reduced';
}

export class ParticleEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.texts = [];
    this.suppressed = false; // Fast Forward: skip effects for simulated (warped) events
    this.mergeTargets = new Map(); // "+n" merge key -> its live text (R41)
    this.lastTime = performance.now();
  }

  init(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resize() {
    if (!this.canvas) return;
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
    this.dirty = true; // resizing resets the bitmap; clear on the next frame regardless
  }

  isPhone() {
    return isPhoneWidth(this.width ?? (typeof window !== 'undefined' ? window.innerWidth : 0));
  }

  // R41 caps (docs/game-feel-opportunities.md §4): over the cap the oldest fade faster instead
  // of new ones being dropped, so the newest action still answers; past twice the cap the
  // oldest go at once
  enforceCap(list, cap) {
    const { fade, drop } = overCap(list.length, cap);
    if (drop > 0) list.splice(0, drop);
    for (let i = 0; i < fade - drop && i < list.length; i++) {
      if (list[i].decay < FAST_DECAY) list[i].decay = FAST_DECAY;
    }
  }

  spawnClickSparks(x, y, count = 12, color = '#38bdf8') {
    if (this.suppressed || motionReduced()) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        color: themeColor(color),
        alpha: 1,
        decay: 0.02 + Math.random() * 0.03
      });
    }
    this.enforceCap(this.particles, particleCap(this.isPhone()));
  }

  // `merge` ({ key, amount, prefix, fmt }) makes a "+n" text add into the last one with the same
  // key spawned within 150 ms and 40 px, growing a little (16 -> 22 px) instead of piling up.
  // Crits never merge.
  spawnFloatingText(x, y, text, color = '#67e8f9', isCrit = false, merge = null) {
    if (this.suppressed) return;
    const now = performance.now();
    if (merge?.key && !isCrit) {
      const prev = this.mergeTargets.get(merge.key);
      if (shouldMerge(prev, merge.key, x, y, now) && this.texts.includes(prev)) {
        prev.amount = addAmounts(prev.amount, merge.amount);
        prev.text = (merge.prefix ?? '+') + merge.fmt(prev.amount);
        prev.size = Math.min(MERGE_SIZE_MAX, prev.size + MERGE_SIZE_STEP);
        prev.alpha = 1;
        prev.updatedAt = now;
        return prev;
      }
    }
    const still = motionReduced();
    const entry = {
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 20,
      text,
      color: themeColor(color),
      isCrit,
      size: isCrit ? 22 : 16,
      vy: still ? 0 : (isCrit ? -2.2 : -1.4),
      vx: still ? 0 : (Math.random() - 0.5) * 0.8,
      alpha: 1,
      decay: isCrit ? 0.012 : 0.018
    };
    if (merge?.key && !isCrit) {
      Object.assign(entry, {
        mergeKey: merge.key, amount: merge.amount, originX: x, originY: y, bornAt: now, updatedAt: now
      });
      this.mergeTargets.set(merge.key, entry);
    }
    this.texts.push(entry);
    this.enforceCap(this.texts, MAX_TEXTS);
    return entry;
  }

  loop(currentTime) {
    const dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (this.ctx && this.canvas) {
      // Idle most of the time: skip the full-screen clear once the canvas is already blank
      const hasWork = this.particles.length > 0 || this.texts.length > 0;
      if (hasWork || this.dirty) {
        this.ctx.clearRect(0, 0, this.width, this.height);
      }
      this.dirty = hasWork;

      // Render & update particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // gravity
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.globalAlpha = Math.max(0, p.alpha);
        this.ctx.fillStyle = p.color;
        this.ctx.shadowColor = p.color;
        this.ctx.shadowBlur = 8;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }

      // Render & update floating texts
      for (let i = this.texts.length - 1; i >= 0; i--) {
        const t = this.texts[i];
        t.y += t.vy;
        t.x += t.vx;
        t.alpha -= t.decay;

        if (t.alpha <= 0) {
          this.texts.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.globalAlpha = Math.max(0, t.alpha);
        this.ctx.fillStyle = t.color;
        this.ctx.font = t.isCrit ? `bold ${t.size}px 'Cinzel', 'Noto Kufi Arabic', 'Segoe UI', sans-serif` : `${t.size}px 'Segoe UI', 'Cairo', sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = themeColor(t.isCrit ? '#f59e0b' : '#38bdf8');
        this.ctx.shadowBlur = t.isCrit ? 12 : 6;
        this.ctx.fillText(t.text, t.x, t.y);
        this.ctx.restore();
      }
    }

    requestAnimationFrame(this.loop);
  }
}

export const particles = new ParticleEngine();
