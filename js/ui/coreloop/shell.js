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
import { createCoreLoopState } from '../../systems/coreloop/state.js';
import { loadCoreLoop, saveCoreLoop, secondsAway, CORE_LOOP_SAVE_KEY } from './store.js';

registerStrings(SHELL_EN, SHELL_AR);

export const SCREENS = Object.freeze([
  { id: 'well', icon: '🛢️' },
  { id: 'fields', icon: '⛏️' },
  { id: 'refinery', icon: '⚗️' },
  { id: 'prestige', icon: '🏆' },
  { id: 'codex', icon: '📜' }
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
        <div class="cl-presence"><span class="cl-chip" id="cl-presence"></span><span class="cl-chip cl-heat" id="cl-heat" hidden></span></div>
        <div class="cl-guide-slot" id="cl-guide-slot"></div>
      </header>
      <p class="cl-welcome" id="cl-welcome" hidden></p>
      <nav class="cl-tabs" role="tablist" aria-label="${t('cl.shell.title')}">
        ${SCREENS.map(s => `<button type="button" class="cl-tab" role="tab" data-cl-tab="${s.id}" aria-selected="false"><span aria-hidden="true">${s.icon}</span><span>${t(`cl.tab.${s.id}`)}</span><i class="cl-tab-new" hidden>${t('cl.shell.new')}</i></button>`).join('')}
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
    this.el = { crude: root.querySelector('#cl-crude'), rate: root.querySelector('#cl-rate'), presence: root.querySelector('#cl-presence'), heat: root.querySelector('#cl-heat'), welcome: root.querySelector('#cl-welcome'), reset: root.querySelector('#cl-reset') };
    root.querySelector('.cl-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cl-tab]');
      if (b) this.show(b.dataset.clTab);
    });
    this.el.reset.addEventListener('click', () => this.reset());
    this.guideBar = new GuideBar(this);
    root.querySelector('#cl-guide-slot').appendChild(this.guideBar.el);
    this.heads = new Map();
    this.drawTabs();
    if (Guide.introPending(this.state)) showIntro(d, root, () => { Guide.dismissIntro(this.state); this.save(); });
  }

  // Tabs appear as the guide opens them; with one tab there is nothing to switch, so no bar
  drawTabs() {
    let open = 0;
    for (const b of this.root.querySelectorAll('[data-cl-tab]')) {
      const feature = `tab.${b.dataset.clTab}`;
      b.hidden = !Guide.isOpen(this.state, feature);
      if (!b.hidden) open++;
      b.querySelector('.cl-tab-new').hidden = !Guide.isNew(this.state, feature);
    }
    const nav = this.root.querySelector('.cl-tabs');
    nav.hidden = open < 2;
    nav.style.setProperty('--cl-tabs', String(Math.max(1, open)));
    this.root.classList.toggle('cl-one-tab', open < 2);
  }

  async show(id) {
    if (!SCREENS.some(s => s.id === id) || !Guide.isOpen(this.state, `tab.${id}`)) id = SCREENS[0].id;
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
        if (!/Failed to fetch|Cannot find module|error loading/i.test(String(err?.message))) console.error(err);
        panel.innerHTML = `<p class="cl-soon">${t('cl.shell.soon')}</p>`;
      }
      this.screens.get(id).view = view;
    }
    this.render();
  }

  render() {
    if (!this.root) return;
    const s = this.state, presence = currentPresence(s, this.doc.hidden);
    this.el.crude.textContent = fmt(s.well.crude);
    this.el.rate.textContent = t('cl.shell.per_sec', { n: fmt(Well.crudePerSecond(s, presence)) });
    this.el.presence.textContent = t(`cl.shell.state.${presence}`);
    this.el.presence.dataset.state = presence;
    this.el.presence.title = t(`cl.shell.state.${presence}.tip`);
    this.guideBar.update();
    const hh = this.root.querySelector('.cl-header').offsetHeight;
    if (hh && hh !== this.headerH) { this.headerH = hh; this.root.style.setProperty('--cl-header-h', `${hh}px`); }
    const heat = Presence.heat(s);
    this.el.heat.hidden = !(presence === PRESENCE.HANDS && heat > 1);
    if (!this.el.heat.hidden) this.el.heat.textContent = t('cl.shell.heat', { n: heat.toFixed(2) });
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
