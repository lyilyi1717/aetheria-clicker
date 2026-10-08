// Boss and Warden kills feel like a win (R42, docs/game-feel-opportunities.md §3 item 2).
// A boss/Warden killing blow is a T2 moment: a 90 ms visual hit-stop on the portrait (the sim
// keeps running, owner decision 3 in #23), a white flash (150 ms), a 3 px shake of the card only
// (decision 1), the boss-down thud + brass, a "BOSS DOWN!" callout for 900 ms and a gold "+n"
// chip that counts up. The enrage timer turns red at <= 10 s and ticks once a second, and grows
// at <= 3 s. Reduced motion keeps the colour, callout and sound only.
import { feedback } from './feedback.js';
import { isReducedMotion } from './motion.js';
import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { t } from '../i18n/index.js';

export const HITSTOP_MS = 90;
export const FLASH_MS = 150;
export const CALLOUT_MS = 900;
export const GOLD_COUNT_MS = 600;
export const ENRAGE_URGENT_S = 10;
export const ENRAGE_CRITICAL_S = 3;

/** The timer's state: `urgent` at <= 10 s (red + ticks), `critical` at <= 3 s (bigger text). */
export function enrageState(timer) {
  const s = Number(timer);
  if (!Number.isFinite(s)) return { urgent: false, critical: false, second: null };
  return {
    urgent: s <= ENRAGE_URGENT_S,
    critical: s <= ENRAGE_CRITICAL_S,
    // The whole second shown when it ticks (10, 9, ... 1); null outside the window
    second: s <= ENRAGE_URGENT_S && s > 0 ? Math.ceil(s) : null
  };
}

/** True when the countdown has entered a new whole second inside the last 10 (max 10 ticks). */
export function shouldTick(lastSecond, timer) {
  const { second } = enrageState(timer);
  return second !== null && second !== lastSecond;
}

/** The callout text for a kill: Warden or boss. */
export function bossDownLabel(isWarden) {
  return t(isWarden ? 'combat.fx.warden_down' : 'combat.fx.boss_down');
}

const fmtGold = (n) => t('combat.fx.gold', {
  n: (n instanceof BigNum ? n : new BigNum(n || 0)).floor().format('standard', 1)
});

// Hooks the combat system's boss kill to the portrait. `card` is the arena box (it shakes),
// `portrait` the .monster-avatar frame (hit-stop, flash, callout), `timerEl` the enrage line
// (between bosses it shows the last boss's gold, so the number can be read afterwards, P7).
export function initCombatFx(combat, card, portrait, timerEl) {
  if (!combat || !card || !portrait) return;
  combat.onBossDefeated = (ev) => {
    if (timerEl && ev?.gold !== undefined) {
      timerEl.dataset.lastReward = t(ev.isWarden ? 'combat.fx.last_warden' : 'combat.fx.last_boss',
        { gold: fmtGold(ev.gold) });
    }
    playBossDown(card, portrait, ev);
  };
}

/** The T2 moment. Returns false (and plays nothing) when the Tower isn't on screen. */
export function playBossDown(card, portrait, { isWarden = false, gold } = {}) {
  if (typeof document === 'undefined' || !card?.isConnected || !card.offsetParent) return false;
  const reduced = isReducedMotion();
  feedback.fire(2, { kind: 'boss-down', sound: 'boss-down', target: card });
  feedback.hitStop(portrait, HITSTOP_MS);
  if (!reduced) {
    portrait.classList.remove('fx-flash');
    void portrait.offsetWidth;   // restart the flash on back-to-back kills
    portrait.classList.add('fx-flash');
    setTimeout(() => portrait.classList.remove('fx-flash'), FLASH_MS);
  }

  // Callout + gold chip over the portrait (P7: the moment first, the number under it)
  portrait.querySelector('.boss-down-callout')?.remove();
  const box = document.createElement('div');
  box.className = 'boss-down-callout';
  box.setAttribute('aria-hidden', 'true');   // the gold stays readable in the timer line
  const title = document.createElement('div');
  title.className = 'boss-down-title';
  title.textContent = bossDownLabel(isWarden);
  box.appendChild(title);
  if (gold !== undefined) {
    const chip = document.createElement('div');
    chip.className = 'boss-down-gold';
    box.appendChild(chip);
    feedback.countUp(chip, new BigNum(0), gold instanceof BigNum ? gold : new BigNum(gold),
      { ms: GOLD_COUNT_MS, fmt: fmtGold });
  }
  portrait.appendChild(box);
  setTimeout(() => box.remove(), CALLOUT_MS);
  return true;
}

/**
 * The line above the portrait. A boss: "Enrage: n s", red at <= 10 s with a quiet tick each
 * second, bigger at <= 3 s. Between bosses: the last boss's gold (dim), or hidden. It always
 * keeps its space (visibility, not display) so the portrait never jumps.
 */
export function renderBossTimer(el, monster) {
  if (!el) return;
  const boss = !!monster?.isBoss;
  const last = el.dataset.lastReward || '';
  const text = boss ? t('combat.enrage', { s: Number(monster.timer).toFixed(1) }) : last;
  const vis = text ? 'visible' : 'hidden';
  if (el.style.visibility !== vis) el.style.visibility = vis;
  if (el.textContent !== text) el.textContent = text;
  el.classList.toggle('boss-timer-last', !boss && !!last);

  const { urgent, critical, second } = boss ? enrageState(monster.timer) : enrageState(NaN);
  el.classList.toggle('enrage-urgent', urgent);
  el.classList.toggle('enrage-critical', critical);
  // Ticks: once per whole second from 10 down to 1, only after the countdown came down into
  // the window while shown (a re-render after the tab was hidden doesn't replay them)
  if (!boss) { el.enrageSecond = undefined; return; }
  if (second === null) { el.enrageSecond = ENRAGE_URGENT_S + 1; return; }
  if (shouldTick(el.enrageSecond, monster.timer)) {
    if (typeof el.enrageSecond === 'number' && el.offsetParent) sound.play('tick');
    el.enrageSecond = second;
  }
}
