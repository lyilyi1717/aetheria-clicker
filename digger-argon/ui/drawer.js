// Dig: the drawer. One column right of the stage: an icon tab strip and the open tab's content.
// A tab shows one plain "Next:" line, one main button when there is something to buy, then its panels.
// A locked tab is greyed with a lock and says how it opens. A dot means something is really ready; it
// clears when you open the tab. The rules for all this are in drawerlogic.js; this file only draws them.
import * as G from '../game.js';
import { icon, addIcons, badge, S, helmet, chest } from './icons.js';
import { TABS, PANEL_TAB, tabOf, tabInfo, dotStep } from './drawerlogic.js';

const { t } = G;
export { PANEL_TAB, tabOf };

addIcons({
  tab_shop: `<circle cx="16" cy="16" r="13" fill="#ffd23f" stroke="#7a5a00" stroke-width="2.4"/><circle cx="16" cy="16" r="8" fill="none" stroke="#b98a00" stroke-width="2"/><circle cx="11.5" cy="11" r="2.6" fill="#fff6c8"/>`,
  tab_camp: helmet,
  tab_relics: chest,
  tab_museum: `<g transform="rotate(-35 16 16)" fill="#f6efdc" ${S}><rect x="6" y="13.5" width="20" height="5" rx="2.5"/><circle cx="6" cy="12.5" r="4"/><circle cx="6" cy="19.5" r="4"/><circle cx="26" cy="12.5" r="4"/><circle cx="26" cy="19.5" r="4"/></g>`,
  tab_forge: `<path d="M4 12 H24 Q28 12 28 15 H20 Q19 20 22 21 V24 H9 V21 Q13 20 12 16 H5 Z" fill="#9aa3ad" ${S}/><path d="M9 24 H22 V27 H9 Z" fill="#6b7480" ${S}/>`,
  tab_level: `<path d="M8 28 V4" stroke="#1b1410" stroke-width="3.4" stroke-linecap="round"/><path d="M8 5 H25 L21 10.5 L25 16 H8 Z" fill="#e5533d" ${S}/>`,
  tab_debug: `<circle cx="16" cy="16" r="12" fill="#2d3748" ${S}/><path d="M12 20 L20 12 M13 9 L17 5 L21 9 L17 13 M8 24 L12 20" fill="none" stroke="#ffd700" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="20" r="1.5" fill="#ffd700"/>`,
  btn_sound: `<path d="M5 12 H10 L17 6 V26 L10 20 H5 Z" fill="currentColor" ${S.replace('#1b1410','currentColor')}/><path d="M21 11 Q24.5 16 21 21 M24.5 7.5 Q30 16 24.5 24.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>`,

  btn_mute: `<path d="M4 12 H9 L16 6 V26 L9 20 H4 Z" fill="currentColor" ${S.replace('#1b1410','currentColor')}/><path d="M21 12 L28 20 M28 12 L21 20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>`,
  btn_auto: `<path d="M11 21 L19 12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M13 9 Q20 8 23 15" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M5 17 A11 11 0 0 1 24 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M27 15 A11 11 0 0 1 8 25" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M24 2.5 V8.5 H18 M8 29.5 V23.5 H14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  btn_map: `<path d="M4 8 L11 6 L21 8 L28 6 V24 L21 26 L11 24 L4 26 Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M11 6 V24 M21 8 V26" stroke="currentColor" stroke-width="2" opacity=".7"/>`,
  tab_lock: `<rect x="7" y="14" width="18" height="14" rx="3" fill="#b9a58c" ${S}/><path d="M11 14 V10 A5 5 0 0 1 21 10 V14" fill="none" stroke="#1b1410" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="21" r="2" fill="#1b1410"/>`,
});

const KEY = 'DIG_TAB';
const get = id => TABS.find(x => x.id === id);

let nav = null, host = null, app = null, cur = 'shop';
const els = {};            // tab id -> { btn, pane, next, main, list, dot }
const mem = {};            // tab id -> Set of what was ready when last seen
let first = true;
// Forge metal lives in the purse pill, and only once the Forge is open (a chip that floated in the top bar is gone)
let metal = null, metalN = null, metalV = -1;
function purseMetal(s) {
  if (!metal) {
    const host = app && app.el && app.el.top;
    if (!host) return;
    metal = document.createElement('span'); metal.id = 'purse-metal'; metal.className = 'pchip'; metal.hidden = true;
    metal.title = t('metal');
    metal.innerHTML = `${icon('metal', 22)}<b></b>`;
    metalN = metal.querySelector('b');
    host.appendChild(metal);
  }
  metal.hidden = !s.forgeOn;
  const v = Math.floor(s.metal || 0);
  if (s.forgeOn && v !== metalV) { metalV = v; metalN.textContent = G.fmt(v); }
}

function show(id) {
  cur = id;
  for (const tb of TABS) {
    const e = els[tb.id], on = tb.id === id;
    e.btn.classList.toggle('on', on); e.btn.setAttribute('aria-selected', on ? 'true' : 'false');
    e.pane.hidden = !on;
  }
  try { localStorage.setItem(KEY, id); } catch { /* a per-viewer convenience */ }
}

export const drawer = {
  get current() { return cur; },
  body(id) { return els[id] ? els[id].list : els.level.list; },
  // app: the page host. build before the panels are built.
  build(navEl, hostEl, appRef) {
    nav = navEl; host = hostEl; app = appRef;
    let saved = 'shop';
    try { saved = localStorage.getItem(KEY) || 'shop'; } catch { /* ignore */ }
    nav.setAttribute('role', 'tablist');
    for (const tb of TABS) {
      const btn = document.createElement('button');
      btn.className = 'tab'; btn.type = 'button'; btn.setAttribute('role', 'tab'); btn.dataset.tab = tb.id;
      btn.innerHTML = `${icon(tb.icon, 30)}<span class="lk">${icon('tab_lock', 16)}</span><i class="dot" hidden></i>`;
      btn.setAttribute('aria-label', t('dr_tab_' + tb.id));
      btn.title = t('dr_tab_' + tb.id);
      btn.addEventListener('click', () => { app.unlockAudio(); drawer.open(tb.id); });
      nav.appendChild(btn);
      const pane = document.createElement('div');
      pane.className = 'pane'; pane.dataset.tab = tb.id; pane.hidden = true;
      pane.innerHTML = `<p class="dr-next"></p><button type="button" class="primary dr-main" hidden></button><div class="dr-list"></div>`;
      host.appendChild(pane);
      const main = pane.querySelector('.dr-main');
      main.addEventListener('click', () => {
        const info = tabInfo(tb, app.state);
        if (info.main && G.buy(app.state, info.main.id, app.ev)) { app.bump(main); app.refresh(true); } else app.sfx.deny();
      });
      els[tb.id] = { btn, pane, next: pane.querySelector('.dr-next'), main, list: pane.querySelector('.dr-list'), dot: btn.querySelector('.dot') };
    }
    show(get(saved) ? saved : 'shop');
  },
  open(id) {
    if (!get(id) || id === cur) return;
    show(id);
    // what was ready is now seen
    if (app && app.state) mem[id] = new Set(tabInfo(get(id), app.state).ready);
    if (app) app.refresh(true);
  },
  // every tick: lock, dot, next line, main button
  tick(s) {
    purseMetal(s);
    for (const tb of TABS) {
      const e = els[tb.id], open = tb.id === cur;
      // only the open tab needs its Next line and main button (each is a walk over the shop): the others just a lock and a dot
      const info = open ? tabInfo(tb, s) : null, lock = info ? info.lock : tb.lock(s);
      const locked = !!lock;
      const ready = locked ? [] : info ? info.ready : tb.ready(s);
      const st = dotStep(first || !mem[tb.id] ? new Set(ready) : mem[tb.id], ready, open);
      mem[tb.id] = st.seen;
      e.btn.classList.toggle('locked', locked);
      e.btn.title = locked ? `${t('dr_tab_' + tb.id)}: ${lock}` : t('dr_tab_' + tb.id);
      e.dot.hidden = !st.dot;
      if (!open) continue;
      const next = locked ? lock : info.next;
      if (e.next.textContent !== next) e.next.textContent = next;
      e.pane.classList.toggle('locked', locked);
      const m = locked ? null : info.main;
      e.main.hidden = !m;
      if (m && e.main.textContent !== m.label) e.main.textContent = m.label;
    }
    first = false;
  },
};
