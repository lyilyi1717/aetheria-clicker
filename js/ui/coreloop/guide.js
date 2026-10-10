// The guide's face (docs/core-loop-plan.md CL-28): the next-step bar under the header, the intro
// card of a fresh save and the line of help at the top of each screen. What to show comes from
// js/systems/coreloop/Guide.js; this file only turns it into words and DOM.
//
// Screens mark what the bar can point at with data-guide="<anchor>" (the anchors are listed in
// js/systems/coreloop/README.md). The bar's target carries data-guide-on while it is the goal.
import { t } from '../../i18n/index.js';
import '../../i18n/coreloop/guide-strings.js';
import * as Guide from '../../systems/coreloop/Guide.js';
import { icon } from './icons.js';

const PULSE_MS = 2400;
const WHY_MS = 9000;   // how long the reason stays open on a phone after the goal changes

// --- pure ----------------------------------------------------------------------------------------
// What the bar says now: { kicker, goal, why, count, frac, screen, anchor, key }. `key` changes
// when the goal does (the bar animates on a change).
export function barView(state) {
  const n = Guide.next(state);
  if (n.kind === 'step') {
    return {
      key: `step:${n.id}`, screen: n.screen, anchor: n.anchor, frac: n.frac,
      kicker: t('cl.guide.kicker_step', { n: n.index + 1, total: n.total }),
      goal: t(`cl.guide.step.${n.id}`, { need: n.need }),
      why: t(`cl.guide.step.${n.id}.why`),
      count: n.need > 1 ? t('cl.guide.count', { have: Math.floor(n.have), need: n.need }) : ''
    };
  }
  return {
    key: `sug:${n.id}`, screen: n.screen, anchor: n.anchor, frac: n.frac ?? null,
    kicker: t('cl.guide.kicker_now'),
    goal: t(`cl.guide.sug.${n.id}`, { n: n.n ?? 0 }),
    why: n.frac === undefined ? '' : t('cl.guide.percent', { n: Math.floor(n.frac * 100) }),
    count: ''
  };
}

// The words for a locked section: what opens it
export const lockText = (feature) => t(`cl.lock.${feature}`);
export const featureName = (feature) => t(`cl.feature.${feature}`);

// --- DOM -----------------------------------------------------------------------------------------
export class GuideBar {
  // `shell` gives { root, state, show(id), api }
  constructor(shell) {
    this.shell = shell;
    const d = shell.doc;
    const el = d.createElement('section');
    el.className = 'cl-guide';
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `
      <div class="cl-guide-text">
        <span class="cl-guide-kicker" data-g="kicker"></span>
        <strong class="cl-guide-goal" data-g="goal"></strong>
        <span class="cl-guide-why" data-g="why"></span>
      </div>
      <div class="cl-guide-side">
        <span class="cl-guide-count" data-g="count"></span>
        <button type="button" class="btn btn-primary cl-guide-go" data-g="go">${t('cl.guide.show')}</button>
      </div>
      <div class="cl-guide-bar" data-g="bar" hidden><i></i></div>`;
    this.el = el;
    this.parts = Object.fromEntries([...el.querySelectorAll('[data-g]')].map(n => [n.dataset.g, n]));
    this.parts.go.addEventListener('click', () => this.go());
    el.querySelector('.cl-guide-text').addEventListener('click', () => { clearTimeout(this.whyTimer); el.classList.toggle('cl-guide-open'); });
    this.key = null;
    this.target = null;
  }

  update() {
    const v = barView(this.shell.state), p = this.parts;
    this.view = v;
    p.kicker.textContent = v.kicker;
    p.goal.textContent = v.goal;
    p.why.textContent = v.why;
    p.count.textContent = v.count;
    p.bar.hidden = v.frac === null;
    if (v.frac !== null) p.bar.firstElementChild.style.inlineSize = `${Math.round(v.frac * 100)}%`;
    if (v.key !== this.key) {
      this.key = v.key;
      this.el.classList.remove('cl-guide-changed');
      void this.el.offsetWidth;
      this.el.classList.add('cl-guide-changed', 'cl-guide-open');
      clearTimeout(this.whyTimer);
      this.whyTimer = setTimeout(() => this.el.classList.remove('cl-guide-open'), WHY_MS);
    }
    this.mark(v);
  }

  // Keeps data-guide-on on the goal's element (only when its screen is the one showing)
  mark(v) {
    const now = this.shell.current === v.screen ? this.find(v.anchor) : null;
    if (now === this.target) return;
    this.target?.removeAttribute('data-guide-on');
    now?.setAttribute('data-guide-on', '');
    this.target = now;
  }

  find(anchor) {
    return this.shell.root.querySelector(`.cl-panel:not([hidden]) [data-guide="${anchor}"]`);
  }

  // "Show me": open the goal's screen, bring its element into view and pulse it
  async go() {
    const v = this.view;
    if (!v) return;
    if (this.shell.current !== v.screen) await this.shell.show(v.screen);
    const el = this.find(v.anchor) || this.shell.root.querySelector('.cl-panel:not([hidden])');
    if (!el) return;
    this.mark(v);
    const calm = this.shell.doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView?.({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
    el.classList.remove('cl-guide-pulse');
    void el.offsetWidth;
    el.classList.add('cl-guide-pulse');
    setTimeout(() => el.classList.remove('cl-guide-pulse'), PULSE_MS);
  }
}

// The intro card of a fresh save. Calls done() when the player starts.
export function showIntro(doc, root, done) {
  const el = doc.createElement('div');
  el.className = 'cl-intro';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'cl-intro-title');
  el.innerHTML = `
    <div class="cl-intro-card">
      <div class="cl-intro-art" aria-hidden="true">${icon('well', { size: 'hero' })}</div>
      <h2 id="cl-intro-title">${t('cl.intro.title')}</h2>
      <ol>
        <li>${t('cl.intro.l1')}</li>
        <li>${t('cl.intro.l2')}</li>
        <li>${t('cl.intro.l3')}</li>
      </ol>
      <button type="button" class="btn btn-primary cl-intro-go">${t('cl.intro.go')}</button>
    </div>`;
  root.appendChild(el);
  const go = el.querySelector('.cl-intro-go');
  go.addEventListener('click', () => { el.remove(); done(); });
  go.focus?.();
  return el;
}

// The head of a screen: its name, one sentence, and more behind "How it works"
export function screenHead(doc, id) {
  const el = doc.createElement('header');
  el.className = 'cl-head';
  el.innerHTML = `
    <div class="cl-head-row">
      <h2 class="cl-head-title">${t(`cl.tab.${id}`)}</h2>
      <button type="button" class="btn btn-ghost btn-sm cl-head-more" aria-expanded="false">${t('cl.help.how')}</button>
    </div>
    <p class="cl-head-line">${t(`cl.help.${id}.line`)}</p>
    <p class="cl-head-long" hidden>${t(`cl.help.${id}.more`)}</p>`;
  const btn = el.querySelector('.cl-head-more'), long = el.querySelector('.cl-head-long');
  btn.addEventListener('click', () => {
    long.hidden = !long.hidden;
    btn.setAttribute('aria-expanded', String(!long.hidden));
  });
  return el;
}
