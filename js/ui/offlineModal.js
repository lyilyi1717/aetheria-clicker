// Welcome-back modal: renders the offline payout breakdown (time away, rate per band, total).
// Wording is neutral: it explains how the payout was computed and never scolds the player.
import { BigNum } from '../engine/BigNum.js';
import { t } from '../i18n/index.js';

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

export function renderOfflineModal(res) {
  const modal = el('offline-modal');
  if (!modal) return;
  const aether = res.gainedAether.format('standard', 2);
  el('offline-time-text').textContent = formatDuration(res.elapsedSeconds);
  el('offline-aether-text').textContent = aether;
  el('offline-chrono-text').textContent = t('dallah.poured_sand', { n: fmtNum(res.chronoEarned) })
    + (res.gardenHarvests ? ' · ' + t('offline.golems', { n: fmtNum(res.gardenHarvests) }) : '');

  const tbody = el('offline-breakdown')?.querySelector('tbody');
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
  const closeBtn = el('offline-modal-close');
  if (closeBtn) closeBtn.onclick = () => modal.classList.remove('visible');
}
