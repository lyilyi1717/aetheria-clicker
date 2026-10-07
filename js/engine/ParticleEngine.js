// High-performance Particle and Floating Text Engine
import { themeColor } from '../ui/theme.js';

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
  }

  spawnFloatingText(x, y, text, color = '#67e8f9', isCrit = false) {
    if (this.suppressed) return;
    const still = motionReduced();
    this.texts.push({
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
    });
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
