// Reward grammar (redesign §5.1): the pure queue/batching logic behind toasts and ceremonies.
// No DOM here, so node tests can import it (test_rewards.js). js/ui/rewards.js draws it.
//
// Tiers:  small  - quiet toast, the action's own sound already played
//         medium - toast + bell arpeggio
//         big    - ceremony (dim + burst + count-up) + brass; at most one per 60 s,
//                  extra ones become a coalesced toast
//         epic   - ceremony + choir; never dropped, same-kind ones merge while queued
//
// An event: { tier, kind, title, batchTitle?, icon?, color?, detail?, amount?, fmt?, unit?, count? }
// `kind` is what coalesces: same kind on screen or waiting = one entry with a count and a summed
// amount ("Contract complete ×4", "+1.2e6 gold"). `batchTitle` may use {n} for the count.

import { bidi } from '../i18n/index.js';
export const TIERS = ['small', 'medium', 'big', 'epic'];

export const REWARD_CONFIG = {
  maxToasts: 3,                // stacked on screen
  maxPending: 6,               // waiting behind them; more than this folds into one "+N more" toast
  toastMs: { small: 2200, medium: 4000, big: 5000, epic: 6000 },
  toastMaxLifeMs: 12000,       // a toast that keeps absorbing events still leaves after this
  ceremonyMs: { big: 2400, epic: 3600 },
  ceremonyReducedMs: { big: 1600, epic: 2400 },
  bigCeremonyCooldownMs: 60000,
  maxQueuedCeremonies: 3
};

export function normalizeTier(tier) {
  return TIERS.includes(tier) ? tier : 'medium';
}

// Sum two amounts: plain numbers or BigNum-like objects with .add()
export function mergeAmount(a, b) {
  if (a === undefined || a === null) return b;
  if (b === undefined || b === null) return a;
  if (typeof a === 'object' && typeof a.add === 'function') return a.add(b);
  if (typeof b === 'object' && typeof b.add === 'function') return b.add(a);
  return a + b;
}

const tierRank = (t) => TIERS.indexOf(t);

// Title shown for an entry, with its batch count
export function rewardTitle(entry) {
  const n = entry.count || 1;
  if (n <= 1) return entry.title || '';
  if (entry.batchTitle) return entry.batchTitle.replace('{n}', String(n));
  return `${entry.title} ${bidi(`×${n}`)}`;
}

// Value line ("+1.2M gold"), or '' when the event carries no amount
export function rewardValue(entry) {
  if (entry.amount === undefined || entry.amount === null) return '';
  const text = typeof entry.fmt === 'function' ? entry.fmt(entry.amount) : String(entry.amount);
  return `${bidi(`+${text}`)}${entry.unit ? ' ' + entry.unit : ''}`;
}

let nextId = 1;
function makeEntry(ev, now) {
  return {
    id: nextId++,
    tier: normalizeTier(ev.tier),
    kind: ev.kind || null,
    title: ev.title || '',
    batchTitle: ev.batchTitle || null,
    icon: ev.icon || '',
    color: ev.color || null,
    detail: ev.detail || '',
    amount: ev.amount ?? null,
    fmt: ev.fmt || null,
    unit: ev.unit || '',
    source: ev.source || null,
    signature: ev.signature || null,       // R45: 'well' / 'field' give the ceremony its own look
    force: !!ev.force,                     // R45: a moment the player chose skips the big cooldown
    durationMs: ev.durationMs || null,     // R45: shorter than the tier default (full motion only)
    count: Math.max(1, ev.count || 1),
    createdAt: now,
    updatedAt: now,
    expiresAt: null
  };
}

// Fold ev into an existing entry (same kind)
function absorb(entry, ev, now) {
  entry.count += Math.max(1, ev.count || 1);
  entry.amount = mergeAmount(entry.amount, ev.amount ?? null);
  const t = normalizeTier(ev.tier);
  if (tierRank(t) > tierRank(entry.tier)) entry.tier = t;
  if (ev.title) entry.title = ev.title;           // latest name, e.g. the newest achievement
  if (ev.batchTitle) entry.batchTitle = ev.batchTitle;
  if (ev.icon) entry.icon = ev.icon;
  if (ev.detail) entry.detail = ev.detail;
  if (ev.color) entry.color = ev.color;
  entry.updatedAt = now;
}

export class ToastQueue {
  constructor(config = REWARD_CONFIG) {
    this.config = config;
    this.visible = [];
    this.pending = [];
  }

  lifetime(entry) {
    return this.config.toastMs[entry.tier] || this.config.toastMs.medium;
  }

  // Returns { entry, action }: action is 'shown' (new on screen), 'merged' (an existing entry
  // grew) or 'queued' (waiting for a free slot). Only 'shown' deserves a sound.
  push(ev, now) {
    const kind = ev.kind || null;
    if (kind) {
      const hit = this.visible.find(e => e.kind === kind && e.expiresAt > now)
        || this.pending.find(e => e.kind === kind);
      if (hit) {
        absorb(hit, ev, now);
        if (hit.expiresAt !== null) {
          hit.expiresAt = Math.max(hit.expiresAt, Math.min(now + this.lifetime(hit), hit.createdAt + this.config.toastMaxLifeMs));
        }
        return { entry: hit, action: 'merged' };
      }
    }
    const entry = makeEntry(ev, now);
    this.expire(now);
    if (this.visible.length < this.config.maxToasts) {
      this.show(entry, now);
      return { entry, action: 'shown' };
    }
    if (this.pending.length >= this.config.maxPending) {
      // Overflow: one catch-all entry at the back of the line
      let more = this.pending.find(e => e.kind === '__more');
      if (!more) {
        more = this.pending.pop();
        const folded = more.count;
        more = makeEntry({ tier: 'small', kind: '__more', title: 'more rewards', count: folded }, now);
        more.batchTitle = '+{n} more rewards';
        this.pending.push(more);
      }
      more.count += entry.count;
      more.updatedAt = now;
      return { entry: more, action: 'merged' };
    }
    this.pending.push(entry);
    return { entry, action: 'queued' };
  }

  show(entry, now) {
    entry.createdAt = now;
    entry.expiresAt = now + this.lifetime(entry);
    this.visible.push(entry);
  }

  expire(now) {
    const removed = this.visible.filter(e => e.expiresAt <= now);
    if (removed.length) this.visible = this.visible.filter(e => e.expiresAt > now);
    return removed;
  }

  // Drop expired toasts and move waiting ones up. Returns what changed so the UI can redraw.
  tick(now) {
    const removed = this.expire(now);
    const promoted = [];
    while (this.visible.length < this.config.maxToasts && this.pending.length) {
      const e = this.pending.shift();
      this.show(e, now);
      promoted.push(e);
    }
    return { removed, promoted };
  }

  dismiss(id) {
    this.visible = this.visible.filter(e => e.id !== id);
  }
}

export class CeremonyScheduler {
  constructor(config = REWARD_CONFIG) {
    this.config = config;
    this.active = null;
    this.queue = [];
    this.lastBigAt = -Infinity;
  }

  // Returns { entry, action }: 'show' (caller starts the overlay), 'merged' (an active or queued
  // ceremony of the same kind grew), 'queued', or 'toast' (a big moment inside the 60 s
  // cooldown: the caller shows it as a toast instead; entry is null).
  request(ev, now) {
    const tier = normalizeTier(ev.tier) === 'epic' ? 'epic' : 'big';
    const kind = ev.kind || null;
    if (kind) {
      const hit = (this.active && this.active.kind === kind && this.active) || this.queue.find(e => e.kind === kind);
      if (hit) {
        absorb(hit, ev, now);
        return { entry: hit, action: 'merged' };
      }
    }
    if (tier === 'big' && !ev.force && now - this.lastBigAt < this.config.bigCeremonyCooldownMs) {
      return { entry: null, action: 'toast' };
    }
    const entry = makeEntry({ ...ev, tier }, now);
    if (!this.active) {
      this.start(entry, now);
      return { entry, action: 'show' };
    }
    if (tier === 'big' && !ev.force && this.queue.filter(e => e.tier === 'big').length >= 1) {
      return { entry: null, action: 'toast' };   // one big waiting is plenty
    }
    if (this.queue.length >= this.config.maxQueuedCeremonies && tier === 'big' && !ev.force) {
      return { entry: null, action: 'toast' };
    }
    this.queue.push(entry);
    return { entry, action: 'queued' };
  }

  start(entry, now) {
    this.active = entry;
    entry.createdAt = now;
    if (entry.tier === 'big') this.lastBigAt = now;
  }

  // The overlay closed (timer or skip). Returns the next ceremony to show, or null.
  finish(now) {
    this.active = null;
    const next = this.queue.shift();
    if (!next) return null;
    this.start(next, now);
    return next;
  }

  duration(entry, reducedMotion = false) {
    if (!reducedMotion && entry.durationMs) return entry.durationMs;
    const table = reducedMotion ? this.config.ceremonyReducedMs : this.config.ceremonyMs;
    return table[entry.tier] || table.big;
  }
}

// Collects events while the player can't see them (hidden tab, Fast Forward warp) and hands back
// one summary event per kind: "12 Ascensions while you were away: +3.1e7 dust".
export class RewardBatch {
  constructor() {
    this.depth = 0;
    this.byKind = new Map();
    this.order = [];
  }

  get active() {
    return this.depth > 0;
  }

  begin() {
    this.depth++;
  }

  add(ev) {
    const key = ev.kind || `__solo${this.order.length}`;
    const hit = this.byKind.get(key);
    if (hit) {
      absorb(hit, ev, 0);
      return;
    }
    const entry = { ...ev, tier: normalizeTier(ev.tier), count: Math.max(1, ev.count || 1), amount: ev.amount ?? null };
    this.byKind.set(key, entry);
    this.order.push(key);
  }

  // Close one level; at the outermost level return the summaries (highest tier first)
  // and reset. `detail` labels them, e.g. 'While you were away'.
  end(detail = '') {
    if (this.depth > 0) this.depth--;
    if (this.depth > 0) return [];
    const out = this.order.map(k => this.byKind.get(k));
    this.byKind.clear();
    this.order = [];
    if (detail) for (const e of out) if (e.count > 1 || !e.detail) e.detail = detail;
    return out.sort((a, b) => tierRank(b.tier) - tierRank(a.tier));
  }
}
