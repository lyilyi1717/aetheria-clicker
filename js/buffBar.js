// Global timed-buff & cooldown bar (docs/game-theory-progression.md §6).
// One thin bar under the header (bottom-fixed on mobile) listing every timed buff
// (elixirs + spells in gameState.activeBuffs, plus Frenzy) and every spell on cooldown.
// Chips are keyed by id: created once on appear, updated in place per frame, removed on expire.
// Clicks are delegated on the bar, so per-frame updates never swallow taps.

import { SPELLS } from './systems/SpellSystem.js';

// Icon per buff id (recipe/spell), falling back to the buff type
const BUFF_ICONS = {
  aether_surge: '🧪',
  celestial_alignment: '🌟',
  midas_elixir: '💰',
  titans_draught: '⚔️',
  swiftness: '👆',
  midas_touch: '🪙',
  chrono_warp: '⏳',
  frenzy: '🔥'
};

// Buff type -> target tag + tab to jump to (null tab = global, no jump)
const BUFF_TARGETS = {
  aether_mult: { tag: 'Monolith', tab: 'monolith', affects: 'all Aether' },
  click_mult: { tag: 'Monolith', tab: 'monolith', affects: 'clicks only' },
  click_gold: { tag: 'Monolith', tab: 'monolith', affects: 'clicks mint gold' },
  hero_atk: { tag: 'Void Tower', tab: 'combat', affects: 'hero attack' },
  gold_mult: { tag: 'Gold', tab: 'combat', affects: 'Tower kills, Excavation caches, Midas clicks' },
  time_speed: { tag: 'All', tab: null, affects: 'game speed' },
  frenzy: { tag: 'Monolith', tab: 'monolith', affects: 'auto-clicks' }
};

const MOBILE_QUERY = '(max-width: 639px)';

export function formatClock(sec) {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function stackText(b) {
  if (b.type === 'click_gold') return 'gold clicks';
  if (b.type === 'time_speed') return `${b.value}x speed`;
  if (b.type === 'frenzy') return '5 clicks/s';
  if (typeof b.value === 'number') return `+${Math.round((b.value - 1) * 100)}%`;
  return '';
}

export class BuffBar {
  constructor(app) {
    this.app = app;
    this.bar = document.getElementById('buff-bar');
    this.buffRow = document.getElementById('buff-bar-buffs');
    this.spellRow = document.getElementById('buff-bar-spells');
    this.tip = document.getElementById('buff-bar-tip');
    this.chips = new Map();     // key -> { el, timeEl, fillEl, last }
    this.seenMax = new Map();   // key -> largest duration seen (fallback when maxDuration missing)
    this.visible = false;
    this.tipKey = null;
  }

  build() {
    if (!this.bar) return;
    this.bar.addEventListener('click', (e) => {
      const chip = e.target.closest('.bb-chip');
      if (!chip) return;
      const isMobile = window.matchMedia && window.matchMedia(MOBILE_QUERY).matches;
      // Mobile: first tap shows name/tag tooltip, second tap jumps
      if (isMobile && this.tipKey !== chip.dataset.key) {
        this.showTip(chip);
        return;
      }
      this.hideTip();
      if (chip.dataset.tab) this.app.switchTab(chip.dataset.tab);
    });
    document.addEventListener('click', (e) => {
      if (this.tipKey && !e.target.closest('#buff-bar')) this.hideTip();
    });
  }

  showTip(chip) {
    if (!this.tip) return;
    this.tipKey = chip.dataset.key;
    this.tip.textContent = chip.title + (chip.dataset.tab ? ' — tap again to go' : '');
    const r = chip.getBoundingClientRect();
    const barRect = this.bar.getBoundingClientRect();
    const center = Math.max(8, Math.min(window.innerWidth - 8, r.left + r.width / 2));
    this.tip.style.left = `${center - barRect.left}px`;
    this.tip.hidden = false;
  }

  hideTip() {
    this.tipKey = null;
    if (this.tip) this.tip.hidden = true;
  }

  // Collect everything that should be on the bar this frame
  collect() {
    const gs = this.app.gameState;
    const buffs = [];
    for (const b of gs.activeBuffs || []) {
      if (!b || !(b.duration > 0)) continue;
      buffs.push({ key: `buff:${b.id}`, id: b.id, name: b.name, type: b.type, value: b.value,
        duration: b.duration, maxDuration: b.maxDuration });
    }
    if (gs.frenzyActive && gs.frenzyTimer > 0) {
      buffs.push({ key: 'buff:frenzy', id: 'frenzy', name: 'Frenzy', type: 'frenzy',
        duration: gs.frenzyTimer, maxDuration: 0 });
    }
    const spells = [];
    for (const s of SPELLS) {
      const cd = gs.spells?.[s.id]?.cd || 0;
      if (cd > 0) spells.push({ key: `cd:${s.id}`, spell: s, cd });
    }
    return { buffs, spells };
  }

  maxFor(key, duration, given) {
    const prev = this.seenMax.get(key) || 0;
    const max = Math.max(prev, given > 0 ? given : 0, duration);
    if (max !== prev) this.seenMax.set(key, max);
    return max;
  }

  createBuffChip(b) {
    const target = BUFF_TARGETS[b.type] || { tag: '', tab: null, affects: '' };
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'bb-chip bb-buff';
    el.dataset.key = b.key;
    if (target.tab) el.dataset.tab = target.tab;
    el.dataset.type = b.type;
    const stack = stackText(b);
    el.title = `${b.name}${stack ? ` (${stack})` : ''} → ${target.tag}${target.affects ? `: ${target.affects}` : ''}`;
    el.innerHTML = `<span class="bb-icon">${BUFF_ICONS[b.id] || '✨'}</span>`
      + `<span class="bb-name">${b.name}</span>`
      + (stack ? `<span class="bb-stack">${stack}</span>` : '')
      + `<span class="bb-time"></span>`
      + (target.tag ? `<span class="bb-tag">→ ${target.tag}</span>` : '')
      + `<span class="bb-progress"><span class="bb-fill"></span></span>`;
    return { el, timeEl: el.querySelector('.bb-time'), fillEl: el.querySelector('.bb-fill'), last: {} };
  }

  createSpellChip(s) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'bb-chip bb-spell' + (s.id === 'astral_refresh' ? ' bb-spell-long' : '');
    el.dataset.key = `cd:${s.id}`;
    el.dataset.tab = 'spells';
    el.title = `${s.name} cooling down → Grimoire`;
    el.innerHTML = `<span class="bb-icon">${s.icon}</span><span class="bb-time"></span>`;
    return { el, timeEl: el.querySelector('.bb-time'), fillEl: null, last: {} };
  }

  update() {
    if (!this.bar) return;
    const { buffs, spells } = this.collect();
    const live = new Set();

    for (const b of buffs) {
      live.add(b.key);
      let chip = this.chips.get(b.key);
      if (!chip) {
        chip = this.createBuffChip(b);
        this.chips.set(b.key, chip);
        this.buffRow.appendChild(chip.el);
      }
      const max = this.maxFor(b.key, b.duration, b.maxDuration);
      const text = formatClock(b.duration);
      if (chip.last.text !== text) { chip.timeEl.textContent = text; chip.last.text = text; }
      const pct = max > 0 ? Math.max(0, Math.min(100, (b.duration / max) * 100)) : 100;
      const width = `${pct.toFixed(1)}%`;
      if (chip.last.width !== width) { chip.fillEl.style.width = width; chip.last.width = width; }
      const ending = b.duration <= 5;
      if (chip.last.ending !== ending) { chip.el.classList.toggle('bb-ending', ending); chip.last.ending = ending; }
    }

    const mana = this.app.gameState.mana;
    for (const sp of spells) {
      live.add(sp.key);
      let chip = this.chips.get(sp.key);
      if (!chip) {
        chip = this.createSpellChip(sp.spell);
        this.chips.set(sp.key, chip);
        this.spellRow.appendChild(chip.el);
      }
      const text = formatClock(sp.cd);
      if (chip.last.text !== text) { chip.timeEl.textContent = text; chip.last.text = text; }
      const frac = (Math.min(1, sp.cd / sp.spell.cooldown)).toFixed(3);
      if (chip.last.frac !== frac) { chip.el.style.setProperty('--cd', frac); chip.last.frac = frac; }
      const poor = mana < sp.spell.manaCost;
      if (chip.last.poor !== poor) { chip.el.classList.toggle('bb-no-mana', poor); chip.last.poor = poor; }
    }

    // Remove chips whose buff/cooldown ended
    for (const [key, chip] of this.chips) {
      if (live.has(key)) continue;
      chip.el.remove();
      this.chips.delete(key);
      this.seenMax.delete(key);
      if (this.tipKey === key) this.hideTip();
    }

    const show = this.chips.size > 0;
    if (show !== this.visible) {
      this.visible = show;
      this.bar.hidden = !show;
      document.body.classList.toggle('has-buff-bar', show);
      if (!show) this.hideTip();
    }
    const hasSpells = spells.length > 0;
    if (this.spellRow.hidden === hasSpells) this.spellRow.hidden = !hasSpells;
  }
}
