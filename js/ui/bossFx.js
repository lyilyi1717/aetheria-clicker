// Boss telegraphs on screen (R65, docs/gear-and-boss-design.md §5.2) and the Mythic moments.
// The combat system owns the rules (CombatSystem.tickBoss); this file only draws them, through the
// hooks it sets on the combat object:
//   onTelegraph          a wind-up starts: icon, label, fill bar, edge pulse, the counter button
//   onTelegraphResult    answered ("BLOCKED!"), missed, or a no-penalty practice miss
//   onWeakPointTap       a tap on the glowing bubble (WARD needs 5)
//   onBossPhase          phase 2 / 3: red tint and a callout
//   onWastaStrike        the Mythic Scepter's x10 hit: gold edge flash and a "WASTA!" stamp
//   onIroned             the Mythic Thobe saved the hero
// Everything is a static child of the portrait frame, toggled by class (the frame is never rebuilt,
// so the card's pointerdown target stays put). The wind-up bar is a CSS animation, so nothing runs
// per frame. Reduced motion keeps the colour, text and sound and drops shakes and flashes.
import { feedback } from './feedback.js';
import { isReducedMotion } from './motion.js';
import { TELE_WINDUP, WARD_TAPS } from '../systems/bossFights.js';
import { t } from '../i18n/index.js';

export const TELE_ICONS = { smash: '🔨', feast: '🍛', ward: '🛡️' };
// The skill the on-screen counter button casts for each type (WARD is answered by tapping)
const COUNTER_SKILL = { smash: 'shield', feast: 'strike' };
const SPOTS = [[18, 30], [70, 24], [26, 66], [68, 62]];   // weak-point positions (% of the frame)
const CALLOUT_MS = 1100;

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

export function initBossFx(combat, card, portrait) {
  if (!combat || !card || !portrait || typeof document === 'undefined') return null;
  const ui = new BossFx(combat, card, portrait);
  ui.build();
  ui.attach();
  return ui;
}

export class BossFx {
  constructor(combat, card, portrait) {
    this.combat = combat; this.card = card; this.portrait = portrait;
    this.spot = 0;
    this.timers = new Set();
  }

  build() {
    const p = this.portrait;
    if (p.querySelector('.tele-layer')) return;
    this.layer = el('div', 'tele-layer');
    this.layer.hidden = true;
    this.layer.setAttribute('aria-hidden', 'true');   // the live region below speaks for it
    this.icon = el('div', 'tele-icon');
    this.label = el('div', 'tele-label');
    this.hint = el('div', 'tele-hint');
    this.bar = el('div', 'tele-bar');
    this.fill = el('div', 'tele-bar-fill');
    this.bar.appendChild(this.fill);
    this.layer.append(this.icon, this.label, this.hint, this.bar);
    this.edge = el('div', 'tele-edge');
    this.edge.setAttribute('aria-hidden', 'true');
    this.weak = el('button', 'weak-point');
    this.weak.type = 'button';
    this.weak.hidden = true;
    this.weak.setAttribute('aria-label', t('tele.weak_point'));
    this.weakText = el('span', 'weak-count', '');
    this.weak.appendChild(this.weakText);
    this.counter = el('button', 'tele-counter btn btn-primary');
    this.counter.type = 'button';
    this.counter.hidden = true;
    this.status = el('div', 'tele-status sr-only');
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');
    this.exposed = el('div', 'tele-exposed', t('tele.exposed'));
    this.exposed.hidden = true;
    p.append(this.edge, this.layer, this.weak, this.exposed, this.status);
    // The counter button sits under the portrait so a thumb reaches it without leaving the fight
    this.counterWrap = el('div', 'tele-counter-wrap');
    this.counterWrap.appendChild(this.counter);
    this.counterWrap.hidden = true;
    p.insertAdjacentElement('afterend', this.counterWrap);
  }

  attach() {
    const c = this.combat;
    c.onTelegraph = (ev) => this.show(ev);
    c.onTelegraphResult = (ev) => this.result(ev);
    c.onWeakPointTap = (ev) => { this.weakText.textContent = `${ev.taps}/${ev.need}`; };
    c.onBossPhase = (ev) => this.phase(ev);
    c.onWastaStrike = (ev) => this.wasta(ev);
    c.onIroned = () => this.callout(t('mythic.ironed'), 'gold');
    c.onMonsterInit = () => this.reset();
    // Taps on the bubble count toward the WARD (the click also lands as a hit: the event bubbles)
    this.weak.addEventListener('pointerdown', () => { c.tapWeakPoint(); });
    this.counter.addEventListener('pointerdown', (e) => {
      e.stopPropagation();   // a counter is not a click attack
      const type = c.monster?.boss?.tele?.type;
      const skill = this.counterSkill(type);
      if (skill) c.castHeroSkill(skill);
    });
    this.counter.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const skill = this.counterSkill(c.monster?.boss?.tele?.type);
        if (skill) c.castHeroSkill(skill);
      }
    });
  }

  // Heavy Strike answers FEAST, Supernova too when Strike is recharging
  counterSkill(type) {
    const skills = this.combat.gameState.hero.skills;
    const pick = COUNTER_SKILL[type];
    if (!pick || !skills[pick]) return null;
    if (type === 'feast' && skills[pick].cd > 0 && skills.supernova && skills.supernova.cd <= 0) return 'supernova';
    return skills[pick].cd > 0 ? null : pick;
  }

  visible() {
    return !!this.card?.isConnected && !!this.card.offsetParent;
  }

  later(fn, ms) {
    const id = setTimeout(() => { this.timers.delete(id); fn(); }, ms);
    this.timers.add(id);
  }

  show({ type, practice, phase }) {
    if (!this.visible()) return;
    const reduced = isReducedMotion();
    this.layer.hidden = false;
    this.layer.dataset.type = type;
    this.layer.classList.toggle('is-practice', !!practice);
    this.icon.textContent = TELE_ICONS[type];
    this.label.textContent = t(`tele.${type}`);
    const auto = this.combat.gear.telegraphsAutoSucceed();
    this.hint.textContent = auto ? t('tele.auto') : practice ? t(`tele.${type}.hint`) + ' · ' + t('tele.practice') : t(`tele.${type}.hint`);
    // Restart the bar's animation
    this.fill.style.animation = 'none';
    void this.fill.offsetWidth;
    this.fill.style.animation = '';
    this.fill.style.animationDuration = `${TELE_WINDUP}s`;
    this.edge.dataset.type = type;
    this.edge.classList.remove('is-on');
    void this.edge.offsetWidth;
    if (!reduced) this.edge.classList.add('is-on');
    this.portrait.classList.toggle('is-ward', type === 'ward');
    if (type === 'ward') {
      const [x, y] = SPOTS[this.spot++ % SPOTS.length];
      this.weak.style.insetInlineStart = `${x}%`;
      this.weak.style.top = `${y}%`;
      this.weakText.textContent = `0/${WARD_TAPS}`;
      this.weak.hidden = false;
    }
    const skill = COUNTER_SKILL[type];
    this.counterWrap.hidden = !skill || auto;
    if (skill) this.counter.textContent = t(`tele.counter.${skill}`);
    this.status.textContent = `${t(`tele.${type}`)} ${this.hint.textContent}`;
    feedback.fire(1, { kind: 'tele', sound: 'warn', target: this.card });
  }

  hide() {
    this.layer.hidden = true;
    this.weak.hidden = true;
    this.counterWrap.hidden = true;
    this.portrait.classList.remove('is-ward');
  }

  result({ type, result }) {
    if (!this.visible()) { this.hide(); return; }
    this.hide();
    if (result === 'success') {
      this.callout(t(`tele.${type}.ok`), 'gold');
      feedback.fire(1, { kind: 'tele-ok', sound: 'counter', target: this.card });
      this.exposed.hidden = false;
      clearTimeout(this.exposedTimer);
      this.exposedTimer = setTimeout(() => { this.exposed.hidden = true; }, 3000);
    } else if (result === 'practice') {
      this.callout(t('tele.practice_miss'), 'dim');
    } else {
      this.callout(t(`tele.${type}.miss`), 'danger');
    }
    this.status.textContent = this.label.textContent;
  }

  phase({ phase }) {
    this.portrait.classList.toggle('is-enraged', phase >= 2);
    if (!this.visible()) return;
    this.callout(t(phase >= 3 ? 'tele.phase3' : 'tele.phase2'), 'danger');
    feedback.fire(2, { kind: 'phase', sound: 'brass', target: this.card });
  }

  wasta() {
    if (!this.visible()) return;
    const reduced = isReducedMotion();
    const stamp = el('div', 'wasta-stamp', t('mythic.wasta'));
    stamp.setAttribute('aria-hidden', 'true');
    this.portrait.appendChild(stamp);
    this.later(() => stamp.remove(), 900);
    if (!reduced) {
      this.card.classList.remove('wasta-flash');
      void this.card.offsetWidth;
      this.card.classList.add('wasta-flash');
      this.later(() => this.card.classList.remove('wasta-flash'), 600);
    }
    feedback.fire(2, { kind: 'wasta', sound: 'brass', target: this.card, hitStop: 60 });
  }

  callout(text, tone) {
    this.portrait.querySelectorAll('.tele-callout').forEach(n => n.remove());
    const n = el('div', `tele-callout tone-${tone}`, text);
    n.setAttribute('aria-hidden', 'true');
    this.portrait.appendChild(n);
    this.later(() => n.remove(), CALLOUT_MS);
  }

  // Called when the fight changes (a new monster): clear the leftovers of the last one
  reset() {
    this.hide();
    this.exposed.hidden = true;
    this.portrait.classList.remove('is-enraged');
  }
}

