// Ascension attunements panel (R55, js/systems/AttunementSystem.js), in the Ascension tab right
// under the New Well button. Three cards in a radio group: the run's pick, what it is worth right
// now, and whether it can still change this run. After the first generator of a run, a new pick
// waits for the next New Well (shown on the card). main.js calls init() once and update() with the
// prestige UI; the DOM is built once and updated in place, so buttons never move under the pointer.
// Feedback: picking is a T0 action (game-feel guide §4): a buy sound and a short pop on the card.
import { sound } from '../engine/AudioEngine.js';
import {
  ATTUNEMENT_IDS, IDLE_BONUS, IDLE_AFTER_SECONDS, STEADY_UPGRADE_BOOST, FOCUS_PER_MILESTONE, FOCUS_CAP,
  isAttunementOpen, getAttunement, getNextAttunement, canChangeAttunement, setAttunement,
  getAttunementBonus, getFocusMilestones, isIdleBonusOn
} from '../systems/AttunementSystem.js';
import { t } from '../i18n/index.js';

const ICONS = { idle: '🌙', steady: '⚙️', focus: '🧭' };
const POP_MS = 220;
const pct = (x) => `${Math.round(x * 100)}%`;
const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
const toggle = (el, cls, on) => { if (el && el.classList.contains(cls) !== on) el.classList.toggle(cls, on); };
const setAttr = (el, k, v) => { if (el && el.getAttribute(k) !== v) el.setAttribute(k, v); };

// What each card says it does (static) and what it is worth right now (live)
export function describeAttunement(id) {
  if (id === 'idle') return t('att.idle.desc', { x: pct(IDLE_BONUS), s: IDLE_AFTER_SECONDS });
  if (id === 'steady') return t('att.steady.desc', { x: pct(STEADY_UPGRADE_BOOST) });
  return t('att.focus.desc', { x: pct(FOCUS_PER_MILESTONE), cap: pct(FOCUS_CAP) });
}

export function attunementNow(gs, id) {
  if (id === 'idle') return isIdleBonusOn(gs) ? t('att.now.idle_on', { x: pct(IDLE_BONUS) }) : t('att.now.idle_off');
  if (id === 'steady') return t('att.now.steady');
  const f = getFocusMilestones(gs);
  const parts = f.list.map(m => t(`att.focus.${m.id}`, { n: m.since, next: m.next ?? '✓' }));
  return t('att.now.focus', { x: pct(getAttunementBonus(gs)), list: parts.join(' · ') });
}

export class AttunementUI {
  constructor(app) {
    this.app = app;
    this.cards = new Map();
    this.root = null;
    this.lastAscensions = null;
  }

  get gs() { return this.app.gameState; }

  init() {
    if (typeof document === 'undefined') return;
    this.ensureStylesheet();
    const anchor = document.getElementById('dust-shop-section');
    if (!anchor || document.getElementById('attunement-section')) return;
    const root = document.createElement('section');
    root.id = 'attunement-section';
    root.className = 'att';
    root.setAttribute('aria-labelledby', 'att-title');
    root.innerHTML = `
      <div class="att-head">
        <h2 id="att-title">${t('att.title')}</h2>
        <p class="att-intro" id="att-status"></p>
      </div>
      <div class="att-cards" role="radiogroup" aria-labelledby="att-title">
        ${ATTUNEMENT_IDS.map(id => `
        <button type="button" class="att-card" role="radio" aria-checked="false" data-att="${id}">
          <span class="att-icon" aria-hidden="true">${ICONS[id]}</span>
          <span class="att-body">
            <span class="att-name">${t(`att.${id}.name`)}<span class="att-tag" hidden></span></span>
            <span class="att-desc">${describeAttunement(id)}</span>
            <span class="att-now"></span>
          </span>
        </button>`).join('')}
      </div>`;
    anchor.insertAdjacentElement('beforebegin', root);
    this.root = root;
    this.status = root.querySelector('#att-status');
    for (const el of root.querySelectorAll('.att-card')) {
      this.cards.set(el.dataset.att, { el, tag: el.querySelector('.att-tag'), now: el.querySelector('.att-now') });
    }
    root.addEventListener('click', (e) => {
      const card = e.target.closest('.att-card');
      if (card) this.pick(card.dataset.att, card);
    });
    // Arrow keys move the pick inside the radio group
    root.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (!(e.key in keys) || !e.target.closest('.att-card')) return;
      e.preventDefault();
      const rtl = document.documentElement.dir === 'rtl' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft');
      const step = rtl ? -keys[e.key] : keys[e.key];
      const i = ATTUNEMENT_IDS.indexOf(e.target.closest('.att-card').dataset.att);
      const id = ATTUNEMENT_IDS[(i + step + ATTUNEMENT_IDS.length) % ATTUNEMENT_IDS.length];
      this.cards.get(id)?.el.focus();
      this.pick(id, this.cards.get(id)?.el);
    });
    this.update();
  }

  ensureStylesheet() {
    if (document.getElementById('attunements-css')) return;
    const link = document.createElement('link');
    link.id = 'attunements-css';
    link.rel = 'stylesheet';
    link.href = 'css/attunements.css';
    document.head.appendChild(link);
  }

  pick(id, el) {
    if (!setAttunement(this.gs, id)) return;
    sound.playBuy();
    if (el) {
      el.classList.remove('pop');
      void el.offsetWidth;   // restart the animation
      el.classList.add('pop');
      setTimeout(() => el.classList.remove('pop'), POP_MS);
    }
    this.update();
    this.app.updateBuildingsUI?.();   // production changed
  }

  update() {
    if (!this.root) return;
    const gs = this.gs;
    const open = isAttunementOpen(gs);
    if (this.root.hidden === open) this.root.hidden = !open;
    if (!open) return;
    const current = getAttunement(gs);
    const next = getNextAttunement(gs);
    const changeable = canChangeAttunement(gs);
    setText(this.status, changeable ? t('att.status.open') : (next !== current
      ? t('att.status.next', { name: t(`att.${next}.name`) })
      : t('att.status.locked')));
    // A fresh New Well: the panel glows once so the choice is noticed (no looping pulse)
    if (this.lastAscensions !== null && gs.ascensionCount > this.lastAscensions) {
      this.root.classList.remove('fresh');
      void this.root.offsetWidth;
      this.root.classList.add('fresh');
    }
    this.lastAscensions = gs.ascensionCount;
    for (const [id, c] of this.cards) {
      const on = id === current;
      setAttr(c.el, 'aria-checked', on ? 'true' : 'false');
      setAttr(c.el, 'tabindex', on ? '0' : '-1');
      toggle(c.el, 'on', on);
      toggle(c.el, 'queued', !changeable && id === next && id !== current);
      const tag = on ? t('att.tag.this_run') : (!changeable && id === next ? t('att.tag.next_run') : '');
      setText(c.tag, tag);
      if (c.tag.hidden !== !tag) c.tag.hidden = !tag;
      setText(c.now, on ? attunementNow(gs, id) : '');
    }
  }
}
