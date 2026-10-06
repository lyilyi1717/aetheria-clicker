// Tooltips (R24, docs/ui-style-guide.md §5.8). Hover is never the only way in:
// - mouse / pen: hovering any [data-tip] or [title] element shows #global-tooltip by the cursor;
// - touch: tapping a bonus chip, gear card or buff chip opens the same text as a bottom sheet.
// Tip text is trusted game markup (a <strong> name and plain text), read from data-tip first,
// then from title (moved to data-original-title on hover so the browser's own tip stays away).

/** Elements that open their tooltip as a bottom sheet on tap. */
export const TAP_TIP_SELECTOR = '.tab-bonus-chip, .gear, .bb-chip';

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/** HTML for a data-tip attribute value: a bold title, then one line per entry. */
export function tipHtml(title, ...lines) {
  return [`<strong>${escapeHtml(title)}</strong>`, ...lines.filter(Boolean).map(escapeHtml)].join('<br>');
}

/** `data-tip="..."`, attribute-escaped, for a tip built with tipHtml(). */
export function tipAttr(html) {
  return `data-tip="${escapeHtml(html)}"`;
}

/** Tip HTML for an element: data-tip wins; a plain title is escaped. */
export function tipFor(el) {
  if (!el) return '';
  if (el.dataset?.tip) return el.dataset.tip;
  const plain = el.getAttribute?.('data-original-title') || el.getAttribute?.('title') || '';
  return plain;
}

let tooltipEl = null;
let sheet = null;
let lastPointerType = 'mouse';
let goToTab = null;

/** Wire hover tooltips and tap sheets. `switchTab(tab)` backs the sheet's "Go to" button. */
export function initTooltips({ switchTab } = {}) {
  if (typeof document === 'undefined' || tooltipEl) return;
  goToTab = switchTab || null;
  tooltipEl = document.createElement('div');
  tooltipEl.id = 'global-tooltip';
  tooltipEl.setAttribute('role', 'tooltip');
  document.body.appendChild(tooltipEl);
  bindHover();
  bindTap();
}

function bindHover() {
  let current = null;
  const place = (x, y) => {
    let left = x + 15;
    let top = y + 15;
    if (left + tooltipEl.offsetWidth > window.innerWidth) left = window.innerWidth - tooltipEl.offsetWidth - 10;
    if (top + tooltipEl.offsetHeight > window.innerHeight) top = y - tooltipEl.offsetHeight - 15;
    tooltipEl.style.left = `${Math.max(4, left)}px`;
    tooltipEl.style.top = `${Math.max(4, top)}px`;
  };
  // Pointer events, not mouse events: a touch tap fires emulated mouseover, which would
  // flash the hover tip and strip the title the tap sheet reads.
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const target = e.target.closest?.('[data-tip], [title], [data-original-title]');
    if (!target) return;
    if (target.hasAttribute('title')) {
      target.setAttribute('data-original-title', target.getAttribute('title'));
      target.removeAttribute('title');
    }
    const html = tipFor(target);
    if (!html) return;
    current = target;
    tooltipEl.innerHTML = html;
    tooltipEl.classList.add('visible');
    place(e.clientX, e.clientY);
  });
  document.addEventListener('pointermove', (e) => {
    if (current && e.pointerType !== 'touch') place(e.clientX, e.clientY);
  });
  document.addEventListener('pointerout', (e) => {
    if (!current) return;
    if (e.relatedTarget && current.contains(e.relatedTarget)) return;
    current = null;
    tooltipEl.classList.remove('visible');
  });
}

function bindTap() {
  document.addEventListener('pointerdown', (e) => { lastPointerType = e.pointerType || 'mouse'; }, true);
  // Capture phase, so a tapped buff chip opens its sheet instead of jumping tabs
  document.addEventListener('click', (e) => {
    if (lastPointerType !== 'touch') return;
    const target = e.target.closest?.(TAP_TIP_SELECTOR);
    if (!target) return;
    const html = tipFor(target);
    if (!html) return;
    e.preventDefault();
    e.stopPropagation();
    openTipSheet(html, target.dataset.tab ? { tab: target.dataset.tab, label: target.dataset.goLabel } : null);
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeTipSheet(); });
}

function buildSheet() {
  const scrim = document.createElement('div');
  scrim.className = 'tip-scrim';
  scrim.hidden = true;
  const panel = document.createElement('div');
  panel.className = 'tip-sheet';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Details');
  panel.hidden = true;
  panel.innerHTML = '<div class="handle" aria-hidden="true"></div><div class="tip-sheet-body"></div>'
    + '<div class="tip-sheet-actions"><button type="button" class="btn btn-primary tip-sheet-go" hidden></button>'
    + '<button type="button" class="btn tip-sheet-close">Close</button></div>';
  document.body.append(scrim, panel);
  scrim.addEventListener('click', closeTipSheet);
  panel.querySelector('.tip-sheet-close').addEventListener('click', closeTipSheet);
  panel.querySelector('.tip-sheet-go').addEventListener('click', (e) => {
    const tab = e.currentTarget.dataset.tab;
    closeTipSheet();
    if (tab && goToTab) goToTab(tab);
  });
  return { scrim, panel, body: panel.querySelector('.tip-sheet-body'), go: panel.querySelector('.tip-sheet-go') };
}

/** Show tip HTML as a bottom sheet; `go` adds a "Go to <label>" button for that tab. */
export function openTipSheet(html, go = null) {
  if (typeof document === 'undefined') return;
  if (!sheet) sheet = buildSheet();
  sheet.body.innerHTML = html;
  const showGo = !!(go?.tab && goToTab);
  sheet.go.hidden = !showGo;
  if (showGo) {
    sheet.go.dataset.tab = go.tab;
    sheet.go.textContent = `Go to ${go.label || 'tab'}`;
  }
  sheet.scrim.hidden = false;
  sheet.panel.hidden = false;
  sheet.panel.querySelector('.tip-sheet-close').focus({ preventScroll: true });
}

export function closeTipSheet() {
  if (!sheet || sheet.panel.hidden) return;
  sheet.scrim.hidden = true;
  sheet.panel.hidden = true;
}
