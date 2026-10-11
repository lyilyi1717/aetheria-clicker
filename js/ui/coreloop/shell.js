// Core-loop shell (docs/core-loop-plan.md CL-12): the five-tab frame of the new loop, behind the
// ?loop=2 flag. It owns the loop's state, the tick, presence (input and visibility), the save
// under its own key and time away; each screen is its own module that mounts into a panel.
//
// A screen module (js/ui/coreloop/<id>.js, CL-13…CL-16) exports
//   mount(panel, api) -> { update(api) }   (update runs about 4 times a second while visible)
// and registers its own strings with registerStrings() from js/i18n/coreloop/index.js. A screen
// whose module doesn't exist yet shows a placeholder, so screens land one PR at a time without
// editing this file. `api` is described at `makeApi` below.
//
// The guide (CL-28, js/systems/coreloop/Guide.js) decides which tabs and sections are open and
// what the player should do next. A screen shows a section only when api.isOpen('<feature>') and
// marks what the next-step bar can point at with data-guide="<anchor>".
import { t, isRtl } from '../../i18n/index.js';
import { registerStrings } from '../../i18n/coreloop/index.js';
import SHELL_EN from '../../i18n/coreloop/shell.en.js';
import SHELL_AR from '../../i18n/coreloop/shell.ar.js';
import { P } from '../../systems/coreloop/params.js';
import { PRESENCE, makeContext } from '../../systems/coreloop/shared.js';
import * as Presence from '../../systems/coreloop/Presence.js';
import * as Well from '../../systems/coreloop/Well.js';
import * as Loop from '../../systems/coreloop/Loop.js';
import * as Guide from '../../systems/coreloop/Guide.js';
import { GuideBar, showIntro, screenHead, lockText } from './guide.js';
import { icon } from './icons.js';
import { createCoreLoopState } from '../../systems/coreloop/state.js';
import { loadCoreLoop, saveCoreLoop, secondsAway, CORE_LOOP_SAVE_KEY } from './store.js';

registerStrings(SHELL_EN, SHELL_AR);

export const SCREENS = Object.freeze([
  { id: 'well', icon: 'well' },
  { id: 'fields', icon: 'mine' },
  { id: 'refinery', icon: 'refinery' },
  { id: 'prestige', icon: 'trophy' },
  { id: 'codex', icon: 'scroll' }
]);
const TICK_MS = 250;        // simulation tick while visible
const RENDER_MS = 250;      // screen updates
const SAVE_MS = 10000;      // autosave
const MAX_TICK_S = 5;       // a longer gap (a throttled tab) is settled as time away
const TAB_KEY = 'AETHERIA_CORELOOP_TAB';

// Plain helpers, also used by the screens
export const fmt = (x) => (x && typeof x.format === 'function' ? x.format() : String(Math.round(Number(x) || 0)));
export function fmtDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return t('cl.shell.time_hm', { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60) });
}

// The tabs in the order they arrived (the Well first): a new tab is appended, never slid in among
// the ones the player is using. Arrival order is the order the guide opened them in.
export function tabOrder(state) {
  const base = SCREENS.map(s => s.id);
  const arrived = Object.keys(state?.guide?.open || {}).filter(k => k.startsWith('tab.')).map(k => k.slice(4)).filter(id => base.includes(id) && id !== base[0]);
  return [base[0], ...arrived, ...base.filter(id => id !== base[0] && !arrived.includes(id))];
}

// How many things a screen has ready, from its optional `readyCount(state)` export. A module that
// did not load, has no export, or throws counts as nothing (no dot).
export function readyOf(mod, state) {
  if (typeof mod?.readyCount !== 'function') return 0;
  try { const n = Number(mod.readyCount(state)); return n > 0 ? n : 0; } catch { return 0; }
}

// The header's rate is the steady one (watching). Da'sa is a bonus the Well screen shows, so the
// number never falls because the player stopped tapping.
export function headerRate(state) { return Well.crudePerSecond(state, PRESENCE.WATCH); }

// The presence the loop runs in right now: Away while the page is hidden, else from input age
export function currentPresence(state, hidden) {
  return hidden ? PRESENCE.AWAY : Presence.presenceOf(state);
}

export class CoreLoopShell {
  constructor({ storage = globalThis.localStorage, doc = globalThis.document, now = () => Date.now(), clock = () => performance.now() } = {}) {
    this.storage = storage; this.doc = doc; this.now = now; this.clock = clock;
    this.listeners = new Set();
    this.ctx = makeContext((e) => { for (const fn of this.listeners) { try { fn(e); } catch (err) { console.error(err); } } });
    this.screens = new Map();   // id -> { panel, view }
    this.timers = [];
    this.resetArmed = false;
  }

  // Load the save and settle the time since it was written. Returns the welcome summary or null.
  load() {
    const { state, savedAt } = loadCoreLoop(this.storage, this.now());
    this.state = state;
    const away = secondsAway(savedAt, this.now());
    return away >= 1 ? Loop.settleAway(this.state, away, this.ctx) : null;
  }

  save() { return saveCoreLoop(this.storage, this.state, this.now()); }

  // One tick of real time
  tick() {
    const at = this.clock();
    const dt = (at - this.lastTick) / 1000;
    this.lastTick = at;
    if (!(dt > 0)) return;
    if (dt > MAX_TICK_S) { this.welcome(Loop.settleAway(this.state, dt, this.ctx)); return; }
    Loop.advance(this.state, dt, currentPresence(this.state, this.doc?.hidden), this.ctx);
    this.refreshGuide();
  }

  // Brings the guide up to date; a tab or section that opens redraws the tabs
  refreshGuide() {
    if (Guide.refresh(this.state, this.ctx).length && this.root) this.drawTabs();
  }

  makeApi() {
    const shell = this;
    const api = {
      get state() { return shell.state; },
      t, fmt, fmtDuration, P,
      ctx: shell.ctx,
      // The presence state now (PRESENCE.*)
      presence: () => currentPresence(shell.state, shell.doc?.hidden),
      // Run a player action: act((state, ctx) => System.action(state, …, ctx)). The action counts
      // as input (Hands-on), then every screen redraws. Returns what the action returned.
      act(fn) {
        Presence.noteInput(shell.state);
        const out = fn(shell.state, shell.ctx);
        shell.refreshGuide();
        shell.render();
        return out;
      },
      // Is this tab or section open to the player yet? ('tab.fields', 'well.pressure', ...: the ids
      // are Guide.FEATURES). A closed section is left out, or shown as the one line lockText gives.
      isOpen: (feature) => Guide.isOpen(shell.state, feature),
      lockText,
      // A tap on the Well: P.tapCrude and the input that keeps Heat up. Returns the Crude given.
      tapWell: () => api.act((state, ctx) => Well.tap(state, ctx)),
      // Open another screen (a closed one is ignored)
      go: (id) => shell.show(id),
      // Send the crew to a Field (the player's choice of where to work; looking at a Field is not one)
      sendCrew: (field) => api.act((state) => { Presence.setHandField(state, field); Guide.noteSent(state); }),
      // The bar's goal: { screen, anchor, here }. `here` is true when its screen is the one showing.
      // A screen gives btn-primary (solid gold) only to the element with this anchor while `here`;
      // anything else that can be pressed is btn-ready (gold outline). One gold thing per screen.
      goal: () => { const n = Guide.next(shell.state); return { screen: n.screen, anchor: n.anchor, here: n.screen === shell.current }; },
      // Listen to the loop's events ({ kind, level, ...data }); returns an unsubscribe function
      on(fn) { shell.listeners.add(fn); return () => shell.listeners.delete(fn); },
      // Catch the Gusher that is up (a player action): { crude, units }, or null when none
      catchGusher: () => api.act((state, ctx) => Loop.catchGusher(state, ctx))
    };
    return api;
  }

  // --- DOM -----------------------------------------------------------------------------------
  build() {
    const d = this.doc;
    if (!d.querySelector('link[data-coreloop-css]')) {
      const css = d.createElement('link');
      css.rel = 'stylesheet'; css.href = 'css/coreloop.css'; css.dataset.coreloopCss = '';
      d.head.appendChild(css);
    }
    d.body.classList.add('coreloop');
    const root = d.createElement('div');
    root.id = 'coreloop-root';
    root.innerHTML = `
      <header class="cl-header">
        <h1 class="cl-title">${t('cl.shell.title')}</h1>
        <div class="cl-crude" aria-live="off"><span class="cl-crude-label">${t('cl.shell.crude')}</span>
          <strong class="cl-crude-amount" id="cl-crude">0</strong><span class="cl-crude-rate" id="cl-rate"></span></div>
        <div class="cl-presence"><span class="cl-chip" id="cl-presence" aria-hidden="true"></span></div>
        <div class="cl-guide-slot" id="cl-guide-slot"></div>
      </header>
      <p class="cl-welcome" id="cl-welcome" hidden></p>
      <nav class="cl-tabs" role="tablist" aria-label="${t('cl.shell.title')}">
        ${SCREENS.map(s => `<button type="button" class="cl-tab" role="tab" data-cl-tab="${s.id}" aria-selected="false"><span aria-hidden="true">${icon(s.icon)}</span><span>${t(`cl.tab.${s.id}`)}</span><i class="cl-tab-new" hidden>${t('cl.shell.new')}</i><i class="cl-tab-dot" hidden role="img" title="${t('cl.shell.ready')}" aria-label="${t('cl.shell.ready')}"></i></button>`).join('')}
      </nav>
      <main class="cl-panels">
        <div class="cl-head-slot" id="cl-head-slot"></div>
        ${SCREENS.map(s => `<section class="cl-panel" role="tabpanel" data-cl-panel="${s.id}" hidden></section>`).join('')}
      </main>
      <footer class="cl-footer">
        <span>${t('cl.shell.beta')}</span>
        <a class="cl-back" href="?">${t('cl.shell.back')}</a>
        <button type="button" class="btn-ghost cl-reset" id="cl-reset">${t('cl.shell.reset')}</button>
      </footer>`;
    d.body.appendChild(root);
    this.root = root;
    this.el = { crude: root.querySelector('#cl-crude'), rate: root.querySelector('#cl-rate'), presence: root.querySelector('#cl-presence'),welcome: root.querySelector('#cl-welcome'), reset: root.querySelector('#cl-reset') };
    root.querySelector('.cl-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cl-tab]');
      if (b) this.show(b.dataset.clTab);
    });
    this.el.reset.addEventListener('click', () => this.reset());
    this.mods = new Map();     // id -> Promise of the screen's module (imported to ask readyCount, not mounted)
    this.ready = new Map();    // id -> count
    this.scrolls = new Map();  // id -> { y, key }: where each tab was left, for this session only
    this.guideBar = new GuideBar(this);
    root.querySelector('#cl-guide-slot').append(this.guideBar.el, this.guideBar.pop);
    this.heads = new Map();
    // The header is a fixed height; if a font loads late, --cl-header-h stays true
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => this.measure()).observe(root.querySelector('.cl-header'));
    this.drawTabs();
    if (Guide.introPending(this.state)) showIntro(d, root, () => { Guide.dismissIntro(this.state); this.save(); });
  }

  // Tabs appear as the guide opens them, appended in the order they arrived. With one tab there is
  // nothing to switch, so the bar is empty (CSS keeps its room, so nothing moves when it fills).
  drawTabs() {
    const nav = this.root.querySelector('.cl-tabs');
    const buttons = tabOrder(this.state).map(id => nav.querySelector(`[data-cl-tab="${id}"]`));
    if (buttons.some((b, i) => nav.children[i] !== b)) for (const b of buttons) nav.appendChild(b);   // only when the order changed
    let open = 0;
    for (const b of buttons) {
      const feature = `tab.${b.dataset.clTab}`;
      b.hidden = !Guide.isOpen(this.state, feature);
      if (!b.hidden) open++;
      b.querySelector('.cl-tab-new').hidden = !Guide.isNew(this.state, feature);
    }
    nav.hidden = open < 2;
    this.root.classList.toggle('cl-one-tab', open < 2);
    this.drawDots();
  }

  // A dot on a tab whose screen has something ready (its optional `readyCount(state)` export is
  // above 0). A screen's module is imported once, without mounting it, when its tab first opens.
  drawDots() {
    for (const b of this.root.querySelectorAll('[data-cl-tab]')) {
      const id = b.dataset.clTab;
      if (!b.hidden && !this.mods.has(id)) this.mods.set(id, import(`./${id}.js`).catch(() => null));
      b.querySelector('.cl-tab-dot').hidden = b.hidden || !(this.ready.get(id) > 0);
    }
  }

  async pollReady() {
    for (const [id, p] of this.mods) {
      const n = readyOf(await p, this.state);
      if (n !== (this.ready.get(id) || 0)) { this.ready.set(id, n); this.drawDots(); }
    }
  }

  measure() {
    const hh = this.root.querySelector('.cl-header').offsetHeight;
    if (hh && hh !== this.headerH) { this.headerH = hh; this.root.style.setProperty('--cl-header-h', `${hh}px`); }
  }

  async show(id) {
    if (!SCREENS.some(s => s.id === id) || !Guide.isOpen(this.state, `tab.${id}`)) id = SCREENS[0].id;
    if (this.current && this.current !== id) this.scrolls.set(this.current, { y: this.doc.defaultView?.scrollY || 0, key: this.guideBar?.key });
    this.current = id;
    Guide.markSeen(this.state, `tab.${id}`);
    this.refreshGuide();
    this.drawTabs();
    if (!this.heads.has(id)) this.heads.set(id, screenHead(this.doc, id));
    this.root.querySelector('#cl-head-slot').replaceChildren(this.heads.get(id));
    try { this.storage?.setItem(TAB_KEY, id); } catch { /* per-viewer convenience only */ }
    for (const b of this.root.querySelectorAll('[data-cl-tab]')) b.setAttribute('aria-selected', String(b.dataset.clTab === id));
    for (const p of this.root.querySelectorAll('[data-cl-panel]')) p.hidden = p.dataset.clPanel !== id;
    if (!this.screens.has(id)) {
      const panel = this.root.querySelector(`[data-cl-panel="${id}"]`);
      this.screens.set(id, { panel, view: null });
      let view = null;
      try {
        const mod = await import(`./${id}.js`);
        view = mod.mount(panel, this.api);
      } catch (err) {
        console.error(err);
        panel.innerHTML = `<p class="cl-soon">${t('cl.shell.load_failed')}</p><p class="cl-soon"><button type="button" class="btn" data-cl-retry>${t('cl.shell.retry')}</button></p>`;
        panel.querySelector('[data-cl-retry]').addEventListener('click', () => this.show(id));
        this.screens.delete(id);   // the next show() loads it again
        this.render();
        return;
      }
      this.screens.get(id).view = view;
    }
    this.render();
    // Back on a tab: where it was left, unless the guide has moved on since (then the top)
    const was = this.scrolls.get(id);
    this.doc.defaultView?.scrollTo?.(0, was && was.key === this.guideBar?.key ? was.y : 0);
  }

  render() {
    if (!this.root) return;
    const s = this.state, presence = currentPresence(s, this.doc.hidden);
    this.el.crude.textContent = fmt(s.well.crude);
    this.el.rate.textContent = t('cl.shell.per_sec', { n: fmt(headerRate(s)) });
    // The presence chip is in the header from the start (CSS hides it without taking its room away)
    const chip = this.el.presence, shown = Guide.isOpen(s, 'shell.presence');
    chip.dataset.shown = String(shown);
    chip.setAttribute('aria-hidden', String(!shown));
    chip.textContent = t(`cl.shell.state.${presence}`);
    chip.dataset.state = presence;
    chip.title = t(`cl.shell.state.${presence}.tip`);
    this.guideBar.update();
    this.measure();
    this.pollReady();
    const view = this.screens.get(this.current)?.view;
    if (view && typeof view.update === 'function') {
      try { view.update(this.api); } catch (err) { console.error(err); }
    }
  }

  welcome(summary) {
    if (!summary || !this.el || summary.seconds < 60) return;
    let text = t('cl.shell.welcome', { time: fmtDuration(summary.seconds), crude: fmt(summary.crude), units: fmt(summary.units) });
    if (summary.capped) text += ' ' + t('cl.shell.welcome_capped', { h: P.offlineMaxHours });
    this.el.welcome.textContent = text;
    this.el.welcome.hidden = false;
  }

  // Wipes only the preview's own save (two taps)
  reset() {
    if (!this.resetArmed) {
      this.resetArmed = true;
      this.el.reset.textContent = t('cl.shell.reset_confirm');
      setTimeout(() => { this.resetArmed = false; if (this.el) this.el.reset.textContent = t('cl.shell.reset'); }, 4000);
      return;
    }
    this.state = createCoreLoopState(this.now() % 2147483647 || 1);
    this.save();
    this.doc.defaultView?.location.reload();
  }

  start() {
    const summary = this.load();
    Guide.refresh(this.state);   // a save from before the guide: open what it has already earned, quietly
    this.api = this.makeApi();
    this.build();
    import('./feedback.js').then(m => { this.stopFeedback = m.start(this.api); }).catch(err => console.error(err));
    this.welcome(summary);
    const d = this.doc, w = d.defaultView;
    const input = () => Presence.noteInput(this.state);
    d.addEventListener('pointerdown', input, { passive: true });
    d.addEventListener('keydown', input);
    d.addEventListener('visibilitychange', () => {
      if (d.hidden) { this.hiddenAt = this.now(); this.save(); return; }
      // back: the hidden time is time away (the browser may not have ticked at all)
      if (this.hiddenAt) this.welcome(Loop.settleAway(this.state, secondsAway(this.hiddenAt, this.now()), this.ctx));
      this.hiddenAt = null;
      this.lastTick = this.clock();
      this.render();
    });
    w?.addEventListener('pagehide', () => this.save());
    this.lastTick = this.clock();
    this.timers.push(setInterval(() => { if (!d.hidden) this.tick(); }, TICK_MS));
    this.timers.push(setInterval(() => { if (!d.hidden) this.render(); }, RENDER_MS));
    this.timers.push(setInterval(() => this.save(), SAVE_MS));
    let first = SCREENS[0].id;
    try { first = this.storage?.getItem(TAB_KEY) || first; } catch { /* default tab */ }
    this.show(first);
    return this;
  }
}

// Entry point from js/main.js when ?loop=2 is set
export function startCoreLoopShell(opts) {
  if (opts?.doc?.documentElement && isRtl()) opts.doc.documentElement.dir = 'rtl';
  const shell = new CoreLoopShell(opts);
  globalThis.coreLoop = shell;   // for the browser console while the loop is in preview
  return shell.start();
}

export { CORE_LOOP_SAVE_KEY };
