// Combo bar under the Falafel (R28). The bar shows progress to the next Frenzy milestone (every
// 20 combo clicks). Since R52 the combo itself is feel only (x1): the text shows a boost only
// while a Chronicle rule or a future tuning makes it more than x1.
import { COMBO_FULL, FRENZY_EVERY, comboMultiplier, clicksToNextFrenzy } from '../systems/combo.js';
import { getActiveRules } from '../systems/ChronicleSystem.js';
import { t } from '../i18n/index.js';

const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
const setWidth = (el, width) => { if (el && el.style.width !== width) el.style.width = width; };

// Text and bar fill (0..100) for a combo count; lastFrenzyAt from ClickerSystem
export function comboView(combo, lastFrenzyAt = 0, { comboCap = Infinity, noFrenzy = false } = {}) {
  if (combo <= 0) return { text: noFrenzy ? t('combo.ready') : t('combo.ready_frenzy', { n: FRENZY_EVERY }), fill: 0 };
  const boost = Math.min(comboCap, comboMultiplier(combo));
  const left = clicksToNextFrenzy(combo, lastFrenzyAt);
  const fill = combo < COMBO_FULL
    ? combo / COMBO_FULL * 100
    : (FRENZY_EVERY - Math.min(FRENZY_EVERY, left)) / FRENZY_EVERY * 100;
  const frenzy = noFrenzy ? '' : ' · ' + t('combo.frenzy_in', { n: left });
  const text = boost > 1 ? t('combo.text_boost', { n: combo, x: boost.toFixed(1) }) : t('combo.text', { n: combo });
  return { text: text + frenzy, fill };
}

export function renderCombo(barEl, textEl, gameState, clicker) {
  if (!barEl || !textEl) return;
  const rules = getActiveRules(gameState);
  const v = comboView(gameState.comboCount, clicker?.lastFrenzyAt || 0, rules);
  setWidth(barEl, `${v.fill}%`);
  setText(textEl, v.text);
}
