// Core-loop game feel (CL-17, docs/game-feel-guide.md): every event the systems emit through
// ctx.emit gets feedback at the right tier, in this one place. The moment comes first (sound,
// colour, motion), then a short line naming what happened.
//
//   hit level 1 (gusher, newWell)          T1  sound + a quiet line
//   hit level 2 (order, bubble, vial, ...) T2  sound + colour cue + a line
//   hit level 3 (generator, grade, ...)    T2  the same, with a named toast
//   hit level 4 (weekly, royal, trial ...) T3  the rewards ceremony (queue and cooldown apply)
//
// describe(event, state) is pure; start(api) wires it to the shell's api.on(). The tier helper is
// js/ui/feedback.js (budgets, sound cooldowns, reduced motion); toasts and ceremonies are
// js/ui/rewards.js. Without a DOM every call is a no-op.
import { t } from '../../i18n/index.js';
import { registerStrings } from '../../i18n/coreloop/index.js';
import FX_EN from '../../i18n/coreloop/feedback.en.js';
import FX_AR from '../../i18n/coreloop/feedback.ar.js';
import { P } from '../../systems/coreloop/params.js';
import { FRACTIONS, PRESENCE } from '../../systems/coreloop/shared.js';
import { rankInfo } from '../../systems/coreloop/Mastery.js';
import { STEPS } from '../../systems/coreloop/Guide.js';
import '../../i18n/coreloop/guide-strings.js';
import { feedback as defaultFeedback } from '../feedback.js';
import { rewards as defaultRewards } from '../rewards.js';
import { icon, iconToken, fromToken } from './icons.js';

registerStrings(FX_EN, FX_AR);

export const BURST = 5;          // more than this many of a kind in one tick: one "xN" line instead
export const AWAY_GAP_S = 6;     // the loop clock jumped further than a live tick can: time away
export const LINE_MS = 3000;     // how long the quiet line stays

// Hit level -> tier (level 3 is T2 with a named toast, level 4 is T3)
export function tierOfLevel(level) {
  return level >= 4 ? 3 : level >= 2 ? 2 : 1;
}

const fieldName = (i) => t(`cl.field.${P.fields[i] ?? P.fields[0]}`);
const rigName = (i) => t(`cl.rig.${P.fields[i] ?? P.fields[0]}`);
const fracName = (i) => t(`cl.frac.${FRACTIONS[i] ?? FRACTIONS[0]}`);
const rankName = (rank) => {
  const info = rankInfo(rank);
  return info.level >= 2 ? t('cl.rank.legend_n', { n: info.level }) : t(`cl.rank.${info.id}`);
};
const keyParts = (key) => String(key).split(':').map(Number);

// Per kind: the level it is emitted at (an event's own level wins: rank, seal), the text key and
// params, the sound id, the colour token and where the cue lands ('crude' header or 'panel').
// icon is for toasts and ceremonies.
const MAP = {
  gusher: { level: 1, key: 'gusher', sound: 'pluck', color: '--gold', target: 'crude' },
  guide: { level: 1, key: 'guide', sound: 'pluck', color: '--gold', target: 'crude', params: (e) => ({ goal: t(`cl.guide.step.${e.step}`, { need: STEPS.find(s => s.id === e.step)?.need ?? '' }) }) },
  unlock: { level: 3, key: 'unlock', sound: 'achievement', color: '--gold', target: 'panel', icon: iconToken('unlock'), params: (e) => ({ name: t(`cl.feature.${e.feature}`) }) },
  newWell: { level: 1, key: 'newWell', sound: 'bell', color: '--gold', target: 'crude', icon: iconToken('well') },

  flare: { level: 2, key: 'flare', sound: 'spell', color: '--danger', target: 'crude', params: () => ({ flare: t('cl.name.flare') }) },
  order: { level: 2, key: 'order', sound: 'coins', color: '--gold', target: 'crude', params: (e) => ({ frac: fracName(e.frac) }) },
  bubble: { level: 2, key: 'bubble', sound: 'mirage', color: '--mana', target: 'crude', params: (e) => ({ n: (e.cauldron ?? 0) + 1 }) },
  vial: { level: 2, key: 'vial', sound: 'gem', color: '--mana', target: 'crude', params: (e) => { const [f, g] = keyParts(e.key); return { field: fieldName(f), grade: g }; } },
  rank: {
    level: 2, key: (e) => (e.level >= 4 ? 'rankTitle' : 'rank'), sound: 'achievement', color: '--life', target: 'crude',
    params: (e) => ({ field: fieldName(e.field), rank: rankName(e.rank) })
  },

  generator: { level: 3, key: 'generator', sound: 'buy', color: '--gold', target: 'panel', icon: iconToken('gear'), params: (e) => ({ n: e.n }) },
  grade: { level: 3, key: 'grade', sound: 'gem-rare', color: '--life', target: 'panel', icon: iconToken('mine'), params: (e) => ({ field: fieldName(e.field), grade: e.grade }) },
  rigGrade: { level: 3, key: 'rigGrade', sound: 'gem-rare', color: '--life', target: 'panel', icon: iconToken('wrench'), params: (e) => ({ rig: rigName(e.field), grade: e.grade }) },
  compound: { level: 3, key: 'compound', sound: 'gem-epic', color: '--mana', target: 'panel', icon: iconToken('refinery'), params: (e) => ({ n: e.recipe + 1 }) },
  vialTier: { level: 3, key: 'vialTier', sound: 'gem-rare', color: '--mana', target: 'panel', icon: iconToken('vial'), params: (e) => { const [f, g] = keyParts(e.key); return { field: fieldName(f), grade: g, tier: e.tier }; } },
  bubbleFamily: { level: 3, key: 'bubbleFamily', sound: 'mirage', color: '--mana', target: 'panel', icon: iconToken('bubbles'), params: (e) => ({ n: e.n }) },
  gilded: { level: 3, key: 'gilded', sound: 'gem-legendary', color: '--gold', target: 'panel', icon: iconToken('sparkle'), params: (e) => ({ n: e.recipe + 1 }) },
  seal: {
    level: 3, key: (e) => (e.level >= 4 ? 'sealBig' : 'seal'), sound: 'brass-short', color: '--gold', target: 'panel', icon: iconToken('trident'),
    params: (e) => ({ n: e.seal + 1, tier: e.tier })
  },
  newField: { level: 3, key: 'newField', sound: 'caravan', color: '--life', target: 'panel', icon: iconToken('oasis'), params: (e) => ({ n: e.n }) },

  weekly: { level: 4, key: 'weekly', sound: 'brass', color: '--gold', icon: iconToken('crate'), params: () => ({ weekly: t('cl.name.weekly') }) },
  royal: { level: 4, key: 'royal', sound: 'brass', color: '--gold', icon: iconToken('crown'), params: (e) => ({ n: e.recipe + 1 }) },
  trial: { level: 4, key: 'trial', sound: 'brass', color: '--life', icon: iconToken('flag'), params: (e) => ({ name: t(`cl.fx.trial.${e.id}`) }) },
  chronicle: { level: 4, key: 'chronicle', sound: 'choir', color: '--gold', icon: iconToken('scroll'), epic: true, params: (e) => ({ pages: e.pages?.format ? e.pages.format() : e.pages }) }
};
export const KINDS = Object.freeze(Object.keys(MAP));

/**
 * What an event should feel like: { tier, textKey, params, sound, target, color, icon, named, kind }.
 * `tier` is 1..3 (T0 is the player's own tap and is the screens' job). `named` is true for a
 * toast (hit level 3). Returns null for a kind it does not know. `state` is accepted for symmetry
 * with the loop's data; nothing here reads it yet.
 */
export function describe(event, state) { // eslint-disable-line no-unused-vars
  const m = event && MAP[event.kind];
  if (!m) return null;
  const level = Number.isFinite(event.level) ? event.level : m.level;
  const e = { ...event, level };
  const key = typeof m.key === 'function' ? m.key(e) : m.key;
  return {
    kind: event.kind,
    tier: tierOfLevel(level),
    named: level === 3,
    textKey: `cl.fx.${key}`,
    params: m.params ? m.params(e) : {},
    sound: m.sound,
    target: m.target || 'crude',
    color: m.color,
    icon: m.icon || '',
    epic: !!m.epic
  };
}

// --- the runtime ----------------------------------------------------------------------------
const hasDom = () => typeof document !== 'undefined' && !!document.body;
const MAX_SUMMARIES = 3;

export class CoreLoopFeedback {
  constructor(api, { fx = defaultFeedback, rewards = defaultRewards, doc = (typeof document !== 'undefined' ? document : null), schedule = (fn) => setTimeout(fn, 0) } = {}) {
    Object.assign(this, { api, fx, rewards, doc, schedule });
    this.pending = [];
    this.scheduled = false;
    this.lastT = api.state?.t ?? 0;
    this.lineEl = null;
    this.lineTimer = null;
  }

  // Keeps the loop clock fresh so flush() can tell a live tick from a jump (time away)
  sync() { if (!this.pending.length) this.lastT = this.api.state?.t ?? this.lastT; }

  // The shell calls this for every event; the work waits until the tick that made it is done, so
  // a burst (time away, many Orders) can be counted before anything is shown
  push(event) {
    if (!hasDom() && !this.doc) return;
    this.pending.push(event);
    if (!this.scheduled) { this.scheduled = true; this.schedule(() => this.flush()); }
  }

  flush() {
    this.scheduled = false;
    const events = this.pending;
    this.pending = [];
    const now = this.api.state?.t ?? 0;
    const jumped = now - this.lastT > AWAY_GAP_S;
    this.lastT = now;
    if (!events.length || this.doc?.hidden) return;           // nothing fires while the page is hidden
    if (this.api.presence?.() === PRESENCE.AWAY) return;      // or for what happens while away
    const byKind = new Map();
    for (const e of events) {
      if (!MAP[e.kind]) continue;
      if (!byKind.has(e.kind)) byKind.set(e.kind, []);
      byKind.get(e.kind).push(e);
    }
    const summarise = [];
    for (const [kind, list] of byKind) {
      if (jumped || list.length > BURST) summarise.push([kind, list]);
      else for (const e of list) this.show(describe(e, this.api.state), list.length === 1);
    }
    // One "xN" toast per kind, quiet and without a ceremony; the busiest few kinds only
    summarise.sort((a, b) => Math.max(...b[1].map(e => e.level || 0)) - Math.max(...a[1].map(e => e.level || 0)));
    for (const [kind, list] of summarise.slice(0, MAX_SUMMARIES)) this.summary(kind, list.length);
  }

  summary(kind, n) {
    const m = MAP[kind];
    this.rewards.toast({
      tier: 'small', kind: `clfx-many-${kind}`, icon: m.icon || '', color: m.color, sound: false,
      title: t('cl.fx.many', { n, what: t(`cl.fx.kind.${kind}`) })
    });
    this.watchIcons();
  }

  show(d, solo) {
    if (!d) return;
    const text = t(d.textKey, d.params);
    const el = this.cueTarget(d);
    // 1. The moment: sound first, then colour and motion on the element
    if (d.tier === 3) {
      this.rewards.ceremony({
        tier: d.epic ? 'epic' : 'big', kind: `clfx-${d.kind}`, title: text, icon: d.icon, color: d.color, source: el
      });
      this.watchIcons();
      return;
    }
    this.fx.fire(d.tier, { kind: `cl:${d.kind}`, sound: d.sound, color: this.colorOf(d.color), at: el, sparks: this.fx.particles?.canvas ? undefined : 0, target: d.named ? this.panel() : null });
    if (el) {
      el.style.setProperty('--clfx-color', `var(${d.color})`);
      this.fx.cue(el, `clfx-cue-t${d.tier}`, d.tier === 2 ? 700 : 450);
    }
    // 2. Then the words
    if (d.named) {
      this.rewards.toast({ tier: 'medium', kind: `clfx-${d.kind}`, title: text, icon: d.icon, color: d.color, sound: false, source: el });
      this.watchIcons();
    } else if (solo || d.tier === 2) this.line(text, d.tier);
  }

  colorOf(token) {
    if (!this.doc?.documentElement || typeof getComputedStyle !== 'function') return undefined;
    return getComputedStyle(this.doc.documentElement).getPropertyValue(token).trim() || undefined;
  }

  cueTarget(d) {
    const root = this.doc?.getElementById?.('coreloop-root');
    if (!root) return null;
    return d.target === 'panel' ? root.querySelector('.cl-panel:not([hidden])') : root.querySelector('.cl-crude');
  }

  panel() { return this.cueTarget({ target: 'panel' }); }

  // The quiet status line under the header: one at a time, the newest replaces the last
  line(text, tier) {
    const root = this.doc?.getElementById?.('coreloop-root');
    if (!root) return;
    if (!this.lineEl) {
      const el = this.doc.createElement('p');
      el.className = 'clfx-line';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.hidden = true;
      root.appendChild(el);
      this.lineEl = el;
    }
    this.lineEl.textContent = text;
    this.lineEl.dataset.tier = String(tier);
    this.lineEl.hidden = false;
    clearTimeout(this.lineTimer);
    this.lineTimer = setTimeout(() => { if (this.lineEl) this.lineEl.hidden = true; }, LINE_MS);
  }

  // rewards.js sets a toast's or ceremony's icon as text. Ours is a token (iconToken); this swaps
  // it for the drawing as soon as rewards.js writes it (a microtask, before the next paint).
  watchIcons() {
    const r = this.rewards;
    if (typeof MutationObserver === 'undefined' || !r?.stack) return;
    const sweep = () => {
      for (const node of [r.stack, r.ovIcon]) {
        if (!node?.querySelectorAll) continue;
        const spots = node.matches?.('.reward-ceremony-icon') ? [node] : node.querySelectorAll('.reward-toast-icon');
        for (const spot of spots) {
          const name = fromToken(spot.textContent);
          if (name != null) spot.innerHTML = icon(name);
        }
      }
    };
    if (!this.iconObserver) {
      this.iconObserver = new MutationObserver(sweep);
      for (const node of [r.stack, r.ovIcon]) if (node) this.iconObserver.observe(node, { childList: true, subtree: true, characterData: true });
    }
    sweep();
  }

  stop() {
    this.iconObserver?.disconnect();
    this.iconObserver = null;
    clearTimeout(this.lineTimer);
    this.lineEl?.remove();
    this.lineEl = null;
    this.pending = [];
  }
}

function loadCss(doc) {
  if (!doc?.head || doc.querySelector('link[data-coreloop-fx-css]')) return;
  const css = doc.createElement('link');
  css.rel = 'stylesheet'; css.href = 'css/coreloop-feedback.css'; css.dataset.coreloopFxCss = '';
  doc.head.appendChild(css);
}

/** Subscribe to the shell's events (`api.on`); returns the unsubscribe function. */
export function start(api, opts) {
  if (!api || typeof api.on !== 'function') return () => {};
  const doc = opts?.doc ?? (typeof document !== 'undefined' ? document : null);
  if (doc) loadCss(doc);
  const fb = new CoreLoopFeedback(api, { ...opts, doc });
  const off = api.on((e) => fb.push(e));
  const clock = doc ? setInterval(() => fb.sync(), 500) : null;
  return () => { off(); clearInterval(clock); fb.stop(); };
}
