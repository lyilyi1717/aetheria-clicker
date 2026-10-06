// App shell (R23, docs/ui-style-guide.md §5.9, §5.10, §7; mockup docs/ui/mockups/app-shell.html).
// Layout is CSS (sidebar >=1024px, icon rail 640-1023px, bottom bar <640px); this file does the
// parts CSS can't: the More sheet, moving Fast Forward + sound into it on phones, the per-tab
// currency strip, the "next goal" chip, first-visit guide banners and the bonus-strip toggle.
// The pure helpers at the top are exported for tests (test_shell.js).

import { BigNum } from '../engine/BigNum.js';
import { BUILDING_DEFINITIONS } from '../systems/BuildingSystem.js';
import { MIN_RUN_SECONDS } from '../systems/PrestigeSystem.js';
import { SPELL_TABS } from '../tabBonuses.js';

export const PHONE_QUERY = '(max-width: 639px)';
const ASCEND_GATE = 1e9; // lifetime run Aether before Ascension pays dust (PrestigeSystem)

// Header currencies per tab, hero first. Aether, Gold and Dust always show; Mana only where
// spells are cast, Sand and Seals only where they are spent.
const HERO = { combat: 'gold', mining: 'gold', market: 'gold', prestige: 'dust', chronicle: 'pages' };
const EXTRA = { alchemy: ['sand'], bounties: ['seals', 'sand'], spells: ['mana'], calendar: ['sand', 'seals'] };

export function headerCurrencies(tab) {
  const hero = HERO[tab] || 'aether';
  const list = [hero, ...['aether', 'gold', 'dust'].filter(c => c !== hero)];
  if (SPELL_TABS[tab]) list.push('mana');
  for (const c of EXTRA[tab] || []) if (!list.includes(c)) list.push(c);
  return list;
}

// "How It Works" opens expanded on a tab's first visit only. Saves from before R23 carry
// guidesSeen.all (GameState.deserialize), so returning players start collapsed everywhere.
export function isGuideFirstVisit(settings, tab) {
  const seen = settings?.guidesSeen;
  if (!seen || typeof seen !== 'object' || seen.all) return false;
  return !seen[tab];
}

export function markGuideSeen(settings, tab) {
  if (!settings.guidesSeen || typeof settings.guidesSeen !== 'object') settings.guidesSeen = {};
  settings.guidesSeen[tab] = true;
}

function log10(b) {
  return b.m > 0 ? Math.log10(b.m) + b.e : 0;
}

function ratio(have, need) {
  if (need.lte(0)) return 1;
  const r = have.div(need).toNumber();
  return Number.isFinite(r) ? Math.max(0, Math.min(1, r)) : (have.gte(need) ? 1 : 0);
}

function fmtClock(s) {
  const t = Math.ceil(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

// The nearest target, for the header chip: Ascend when it's ready, else the next generator
// never bought, else Ascension's gate (or the minimum run time). { icon, text, pct, tab }
export function getNextGoal(gs, buildings, prestige, now = Date.now()) {
  if (prestige.canAscend(now)) {
    const dust = prestige.getPendingCosmicDust();
    return { icon: '🚀', text: `Ascend for +${dust.format('standard', 0)} Dust`, pct: 1, tab: 'prestige' };
  }
  const def = BUILDING_DEFINITIONS.find(d => buildings.isTierUnlocked(d.id) && !(gs.buildings[d.id]?.count > 0));
  if (def) {
    const cost = buildings.getBuildingCost(def.id, 1);
    return { icon: def.icon, text: `${def.name}: ${cost.format('standard', 2)} Aether`, pct: ratio(gs.aether, cost), tab: 'monolith' };
  }
  if (prestige.getPendingCosmicDust().lte(0)) {
    const gate = new BigNum(ASCEND_GATE);
    const pct = Math.max(0, Math.min(1, log10(gs.totalAetherEarned) / log10(gate)));
    return { icon: '🚀', text: `Ascension at ${gate.format('standard', 0)} Aether`, pct, tab: 'prestige' };
  }
  const left = prestige.getMinRunRemaining(now);
  return { icon: '⏳', text: `Ascension in ${fmtClock(left)}`, pct: 1 - left / MIN_RUN_SECONDS, tab: 'prestige' };
}

export class Shell {
  constructor(app) {
    this.app = app;
    this.goalTimer = 1;
    this.goalTab = null;
  }

  build() {
    this.body = document.body;
    this.strip = document.getElementById('res-strip');
    this.resEls = {};
    for (const el of this.strip?.querySelectorAll('[data-res]') || []) this.resEls[el.dataset.res] = el;
    this.goalEl = document.getElementById('next-goal');
    this.goalText = this.goalEl?.querySelector('.goal-text');
    this.goalFill = this.goalEl?.querySelector('.bar > i');
    this.moreBtn = document.getElementById('btn-more');
    this.morePip = this.moreBtn?.querySelector('.pip');
    this.sheet = document.getElementById('more-sheet');
    this.scrim = document.getElementById('more-scrim');
    this.sideTabs = Array.from(document.querySelectorAll('#side-nav .nav-tab'));
    this.sheetTabs = new Set(Array.from(this.sheet?.querySelectorAll('.nav-tab') || []).map(b => b.dataset.tab));

    this.buildGuides();
    this.bindSheet();
    this.bindActionsPlacement();
    this.goalEl?.addEventListener('click', () => { if (this.goalTab) this.app.switchTab(this.goalTab); });

    // "N active bonuses" summary line opens the chip list (strip markup comes from main.js)
    document.getElementById('content-area')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-bonus-summary');
      if (!btn) return;
      const strip = btn.closest('.tab-bonus-strip');
      const open = strip.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });

    this.onTabChange(this.app.currentTab);
  }

  // Each banner gets a one-line hint (data-hint) and a More/Less toggle; the full text stays
  buildGuides() {
    for (const banner of document.querySelectorAll('.tab-guide-banner[data-hint]')) {
      const hint = document.createElement('span');
      hint.className = 'guide-hint';
      hint.textContent = banner.dataset.hint;
      const toggle = document.createElement('button');
      toggle.className = 'guide-more';
      toggle.type = 'button';
      toggle.addEventListener('click', () => this.setGuideOpen(banner, !banner.classList.contains('is-open')));
      banner.querySelector('.guide-icon')?.after(hint);
      banner.append(toggle);
      this.setGuideOpen(banner, false);
    }
  }

  setGuideOpen(banner, open) {
    banner.classList.toggle('is-open', open);
    if (!open) banner.classList.remove('first');
    const toggle = banner.querySelector('.guide-more');
    if (toggle) {
      toggle.textContent = open ? 'Less ▴' : 'More ▾';
      toggle.setAttribute('aria-expanded', String(open));
    }
  }

  bindSheet() {
    this.moreBtn?.addEventListener('click', () => this.setSheetOpen(!this.body.classList.contains('sheet-open')));
    this.scrim?.addEventListener('click', () => this.setSheetOpen(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.setSheetOpen(false); });
  }

  setSheetOpen(open) {
    if (!this.sheet) return;
    this.body.classList.toggle('sheet-open', open);
    this.moreBtn?.setAttribute('aria-expanded', String(open));
    this.sheet.setAttribute('aria-hidden', String(!open));
    if (this.scrim) this.scrim.hidden = !open;
  }

  // Fast Forward + sound live in the header's right edge, or in the More sheet on phones
  bindActionsPlacement() {
    const actions = document.getElementById('hdr-actions');
    const util = document.getElementById('more-util');
    const header = document.getElementById('top-dashboard');
    if (!actions || !util || !header || !window.matchMedia) return;
    const mq = window.matchMedia(PHONE_QUERY);
    const place = () => {
      if (mq.matches) { if (actions.parentElement !== util) util.append(actions); }
      else if (actions.parentElement !== header) header.append(actions);
    };
    place();
    mq.addEventListener?.('change', place);
  }

  onTabChange(tab) {
    this.setSheetOpen(false);
    this.moreBtn?.classList.toggle('active', this.sheetTabs.has(tab));

    const list = headerCurrencies(tab);
    for (const [key, el] of Object.entries(this.resEls)) {
      const i = list.indexOf(key);
      el.hidden = i < 0;
      el.style.order = i < 0 ? '' : String(i);
      el.classList.toggle('hero', i === 0);
    }

    const banner = document.querySelector(`#tab-${tab} .tab-guide-banner[data-hint]`);
    if (banner) {
      const settings = this.app.gameState.settings;
      if (isGuideFirstVisit(settings, tab)) {
        this.setGuideOpen(banner, true);
        banner.classList.add('first');
        markGuideSeen(settings, tab);
      } else {
        this.setGuideOpen(banner, false);
      }
    }
    this.goalTimer = 1;
  }

  update(dt) {
    this.goalTimer += dt;
    if (this.goalTimer < 0.5) return;
    this.goalTimer = 0;

    // Red dots: copy the side nav's has-notif onto the bar/sheet copies, and onto More
    let sheetNotif = false;
    for (const side of this.sideTabs) {
      const on = side.classList.contains('has-notif');
      for (const copy of document.querySelectorAll(`#bottom-nav .nav-tab[data-tab="${side.dataset.tab}"], #more-sheet .nav-tab[data-tab="${side.dataset.tab}"]`)) {
        if (copy.classList.contains('has-notif') !== on) copy.classList.toggle('has-notif', on);
      }
      if (on && this.sheetTabs.has(side.dataset.tab)) sheetNotif = true;
    }
    if (this.morePip && this.morePip.hidden === sheetNotif) this.morePip.hidden = !sheetNotif;

    if (!this.goalEl) return;
    const { gameState, buildingSystem, prestigeSystem } = this.app;
    const goal = getNextGoal(gameState, buildingSystem, prestigeSystem);
    this.goalTab = goal.tab;
    if (this.goalText.textContent !== goal.text) this.goalText.textContent = goal.text;
    const ic = this.goalEl.querySelector('.goal-ic');
    if (ic && ic.textContent !== goal.icon) ic.textContent = goal.icon;
    this.goalFill.style.width = `${Math.round(goal.pct * 100)}%`;
    if (this.goalEl.hidden) this.goalEl.hidden = false;
  }
}
