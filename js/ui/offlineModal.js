// Welcome-back modal: renders the offline payout breakdown (time away, rate per band, total).
// Wording is neutral: it explains how the payout was computed and never scolds the player.
// R43: opening it is a small celebration (game-feel guide P6, P8): a bell, the total counts up
// (skippable by tapping), the breakdown rows fade in, gold sparks once, and Collect closes it
// with a pluck and pulses the header Oil value. Reduced motion: the total shows at once.
import { BigNum } from '../engine/BigNum.js';
import { t } from '../i18n/index.js';
import { feedback as defaultFeedback } from './feedback.js';
import { rewards as defaultRewards } from './rewards.js';
import { isReducedMotion } from './motion.js';

export const OFFLINE_COUNT_MS = 1200;    // however long the absence
export const OFFLINE_ROW_STAGGER_MS = 120;
export const OFFLINE_SPARKS = 24;
const SPARK_COLOR = '#fbbf24';           // --gold (dark themes); the canvas needs a literal colour

const fmtNum = (n, precision = 2) => BigNum.formatNumber(n, precision);

export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return t('dur.s', { n: s });
  const m = Math.floor(s / 60);
  if (m < 60) return t('dur.min', { n: m });
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h < 48) return rem ? t('dur.h_min', { h, m: rem }) : t('dur.h', { n: h });
  const d = Math.floor(h / 24);
  return h % 24 ? t('dur.d_h', { d, h: h % 24 }) : t('dur.d', { n: d });
}

// Rows for the breakdown table: [label, time, rate]; pure so it can be tested without a DOM
export function buildBreakdownRows(res) {
  const b = res.bands;
  const eff = res.efficiency || 1;
  const rows = [];
  if (b) {
    rows.push([t('offline.first', { d: formatDuration(b.fullEnd) }), formatDuration(b.fullSecs), `${Math.round(100 * eff)}%`]);
    if (b.elapsedSeconds > b.fullEnd) {
      rows.push([t('offline.next', { d: formatDuration(b.capEnd - b.fullEnd) }), formatDuration(b.halfSecs), `${Math.round(100 * b.halfRate * eff)}%`]);
    }
    if (b.unpaidSecs > 0) rows.push([t('offline.after', { d: formatDuration(b.capEnd) }), formatDuration(b.unpaidSecs), '0%']);
  }
  return rows;
}

function el(id) { return document.getElementById(id); }

function row(cells, className) {
  const tr = document.createElement('tr');
  if (className) tr.className = className;
  for (const text of cells) {
    const td = document.createElement('td');
    td.textContent = text;
    tr.appendChild(td);
  }
  return tr;
}

/**
 * The welcome-back moment on already-rendered elements. `els`: { modal, total, table, button }.
 * Deps are injectable for tests. Returns { skip, collect, done() }.
 */
export function startCelebration(els, amount, {
  feedback = defaultFeedback, rewards = defaultRewards, reduced = isReducedMotion,
  fmt = (n) => (n?.format ? n.format('standard', 2) : String(n)),
  setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (id) => clearTimeout(id)
} = {}) {
  const { modal, total, table, button } = els;
  let finished = false;
  let cancelCount = () => {};
  let timer = null;

  const rows = table ? [...table.querySelectorAll('tr')] : [];
  rows.forEach((tr, i) => tr.style?.setProperty('--row', String(i)));

  const finish = () => {
    if (finished) return;
    finished = true;
    if (timer !== null) clearTimer(timer);
    cancelCount();
    if (total) total.textContent = fmt(amount);
    table?.classList.remove('is-pending');
    table?.classList.add('is-revealed');
    feedback.fire(2, { kind: 'offline-total', at: total, sparks: OFFLINE_SPARKS, color: SPARK_COLOR });
  };

  feedback.fire(2, { kind: 'offline-open', sound: 'bell' });
  if (reduced()) {
    finish();
  } else {
    table?.classList.remove('is-revealed');
    table?.classList.add('is-pending');
    cancelCount = feedback.countUp(total, 0, amount, { ms: OFFLINE_COUNT_MS, fmt });
    timer = setTimer(finish, OFFLINE_COUNT_MS);
  }

  const collect = () => {
    finish();
    feedback.fire(1, { kind: 'offline-collect', sound: 'pluck' });
    modal?.classList.remove('visible');
    rewards.pulse('stat-aether');
  };

  if (modal) modal.onclick = (e) => { if (e.target !== button) finish(); };
  if (button) button.onclick = (e) => { e?.stopPropagation?.(); collect(); };
  return { skip: finish, collect, done: () => finished };
}

export function renderOfflineModal(res) {
  const modal = el('offline-modal');
  if (!modal) return;
  const aether = res.gainedAether.format('standard', 2);
  el('offline-time-text').textContent = formatDuration(res.elapsedSeconds);
  el('offline-aether-text').textContent = aether;
  el('offline-chrono-text').textContent = t('dallah.poured_sand', { n: fmtNum(res.chronoEarned) })
    + (res.gardenHarvests ? ' · ' + t('offline.golems', { n: fmtNum(res.gardenHarvests) }) : '');

  const table = el('offline-breakdown');
  const tbody = table?.querySelector('tbody');
  if (tbody) {
    tbody.textContent = '';
    for (const cells of buildBreakdownRows(res)) tbody.appendChild(row(cells));
    tbody.appendChild(row([t('offline.total'), '', t('offline.total_oil', { n: aether })], 'offline-total'));
  }
  const note = el('offline-note');
  if (note) {
    const b = res.bands;
    note.textContent = b
      ? t('offline.note', { a: formatDuration(b.fullEnd), b: formatDuration(b.capEnd) })
      : '';
  }
  modal.classList.add('visible');
  startCelebration({
    modal, total: el('offline-aether-text'), table, button: el('offline-modal-close')
  }, res.gainedAether);
}
