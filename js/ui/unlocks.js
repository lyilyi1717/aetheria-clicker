// Progressive tab unlocking UI (R7, docs/gamification-roadmap.md §2.3; mockup
// docs/ui/mockups/tab-unlock.html). Logic lives in js/systems/UnlockSystem.js; this file:
//   - hides locked tabs in the side nav and the More sheet, and shows the next one as a teaser
//     ("???", lock, live trigger progress, not clickable);
//   - keeps the phone bottom bar's slots in place: a locked slot is a dimmed "Soon";
//   - reveals a new tab with a big gold toast, a starter gift and a NEW tag until first visit;
//   - hides the Quick Cast bars until the Grimoire is open.

import { rewards } from './rewards.js';
import {
  UNLOCK_BY_TAB, checkUnlocks, grantStarterGift, getTeasers, getUnlockProgress, isTabUnlocked,
  isUnlockNew, markUnlockSeen
} from '../systems/UnlockSystem.js';

const CHECK_SECONDS = 0.25;

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Short progress for a bottom-bar slot ("7/10", "62%")
export function shortProgress(p) {
  if (!p) return 'Soon';
  if (p.need === 1 && p.pct !== undefined && p.pct > 0 && p.pct < 1) return `${Math.floor(p.pct * 100)}%`;
  if (p.need > 1 && Number.isInteger(p.have) && Number.isInteger(p.need)) return `${p.have}/${p.need}`;
  return 'Soon';
}

export class UnlocksUI {
  constructor(app) {
    this.app = app;
    this.timer = CHECK_SECONDS;
    this.buttons = [];   // { btn, tab, where: 'side'|'bottom'|'sheet', html, title, state }
    this.revealed = new Set();
  }

  get gs() { return this.app.gameState; }

  build() {
    const add = (sel, where) => {
      for (const btn of document.querySelectorAll(sel)) {
        this.buttons.push({ btn, tab: btn.dataset.tab, where, html: btn.innerHTML, title: btn.getAttribute('title') || '', state: null, text: null });
      }
    };
    add('#side-nav .nav-tab', 'side');
    add('#bottom-nav .nav-tab', 'bottom');
    add('#more-sheet .nav-tab', 'sheet');
    this.groups = Array.from(document.querySelectorAll('#side-nav .nav-group'));
    this.quickCast = Array.from(document.querySelectorAll('.quick-cast-bar'));
    this.render();
  }

  // Called from the render tick
  update(dt) {
    this.timer += dt;
    if (this.timer < CHECK_SECONDS) return;
    this.timer = 0;
    const fresh = checkUnlocks(this.gs);
    for (const def of fresh) this.reveal(def);
    this.render();
  }

  reveal(def) {
    const gift = grantStarterGift(this.gs, def);
    this.revealed.add(def.tab);
    rewards.toast({
      tier: 'big', kind: `unlock-${def.tab}`, icon: def.icon, color: '#fbbf24',
      title: `NEW: ${def.name}`, detail: gift ? `${def.flavour} 🎁 ${gift}` : def.flavour,
      sound: true
    });
    this.app.onUnlock?.(def.tab);
  }

  // Marks the tab visited (clears its NEW tag)
  onTabChange(tab) {
    if (isUnlockNew(this.gs, tab)) {
      markUnlockSeen(this.gs, tab);
      this.render();
    }
  }

  stateOf(tab, teasers) {
    if (isTabUnlocked(this.gs, tab)) return isUnlockNew(this.gs, tab) ? 'new' : 'open';
    return teasers.includes(tab) ? 'teaser' : 'hidden';
  }

  render() {
    const teasers = getTeasers(this.gs);
    const progress = new Map(teasers.map(t => [t, getUnlockProgress(this.gs, t)]));
    for (const b of this.buttons) {
      const state = this.stateOf(b.tab, teasers);
      const p = state === 'teaser' ? progress.get(b.tab) : (state === 'hidden' && b.where === 'bottom' ? null : undefined);
      this.paint(b, state, p);
    }
    // Side-nav group labels only show when something under them does
    for (const g of this.groups) {
      let el = g.nextElementSibling, any = false;
      while (el && !el.classList.contains('nav-group')) {
        if (el.classList.contains('nav-tab') && !el.hidden) { any = true; break; }
        el = el.nextElementSibling;
      }
      if (g.hidden === any) g.hidden = !any;
    }
    const spellsOpen = isTabUnlocked(this.gs, 'spells');
    for (const bar of this.quickCast) if (bar.hidden === spellsOpen) bar.hidden = !spellsOpen;
  }

  paint(b, state, p) {
    const { btn } = b;
    if (b.where === 'bottom' && state === 'hidden') state = 'soon';
    const text = p ? p.text : null;
    const pct = p ? Math.round(p.pct * 100) : 0;
    const key = `${state}|${text}|${pct}`;
    if (b.key === key) return;
    const was = b.state;
    b.key = key;
    b.state = state;

    const locked = state === 'teaser' || state === 'soon';
    btn.hidden = state === 'hidden';
    btn.classList.toggle('is-teaser', state === 'teaser');
    btn.classList.toggle('is-soon', state === 'soon');
    btn.classList.toggle('is-new', state === 'new');
    if (locked) {
      btn.setAttribute('aria-disabled', 'true');
      btn.tabIndex = -1;
    } else {
      btn.removeAttribute('aria-disabled');
      btn.removeAttribute('tabindex');
    }

    if (state === 'open' || state === 'new') {
      if (was !== 'open' && was !== 'new') btn.innerHTML = b.html;
      btn.querySelector('.nav-new')?.remove();
      if (state === 'new') btn.insertAdjacentHTML('beforeend', '<span class="nav-new" aria-label="new">NEW</span>');
      btn.setAttribute('title', b.title);
      if (was && was !== 'open' && was !== 'new' && this.revealed.has(b.tab)) {
        btn.classList.remove('is-revealed');
        void btn.offsetWidth; // restart the one-shot reveal animation
        btn.classList.add('is-revealed');
      }
      return;
    }

    if (state === 'teaser') {
      const isAsc = b.tab === 'prestige';
      const name = isAsc ? UNLOCK_BY_TAB.get('prestige').name : '???';
      const icon = isAsc ? '🚀' : '🔒';
      if (b.where === 'bottom') {
        btn.innerHTML = `<span class="nav-icon">${icon}</span><span class="nav-lbl">${esc(shortProgress(p))}</span>`;
      } else if (b.where === 'sheet') {
        btn.innerHTML = `<span class="nav-icon">${icon}</span><span class="nav-lbl">${esc(name)}</span>` +
          `<span class="nav-lock-bar"><i style="width:${pct}%"></i></span>`;
      } else {
        btn.innerHTML = `<span class="nav-icon">${icon}</span>` +
          `<span class="nav-lbl">${esc(name)}<span class="nav-sub">${esc(text)}</span></span>` +
          `<span class="nav-lock-bar"><i style="width:${pct}%"></i></span>`;
      }
      btn.setAttribute('title', `Locked: ${text}`);
      return;
    }

    if (state === 'soon') {
      btn.innerHTML = '<span class="nav-icon">🔒</span><span class="nav-lbl">Soon</span>';
      btn.setAttribute('title', 'Locked: keep playing to open this');
    }
  }
}
