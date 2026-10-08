// Gear Bag panel (R64, docs/gear-and-boss-design.md §2.5) on the Tower tab, under the gear levels.
// Tiles are built once per item and patched in place (never per-frame innerHTML), so a tap is never
// swallowed by a rebuild. A tap opens the compare sheet: modal on desktop, bottom sheet on phone.
import {
  SLOTS, RARITY_NAMES, rarityIndex, AUTO_SALVAGE_CHOICES, BAG_CAP
} from '../systems/gearItems.js';
import { gearStat, getGearLevel, GEAR_MAIN_STAT } from '../systems/CombatSystem.js';
import { ITEM_NAMES } from '../data/names.js';
import { rarityTag, rarityClass, RARITY_GLYPHS, gearName, affixText, uniqueText } from './rarity.js';
import { t } from '../i18n/index.js';

const SLOT_ICONS = { weapon: '⚔️', armor: '🛡️', amulet: '📿', relic: '🔮' };
const SORTS = ['rating', 'rarity', 'slot', 'ilvl', 'newest'];
const THROTTLE_MS = 400;

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
const setHidden = (el, hidden) => { if (el && el.hidden !== hidden) el.hidden = hidden; };

export class BagUI {
  constructor(app, fmtNum) {
    this.app = app;
    this.fmtNum = fmtNum;
    this.sort = 'rating';
    this.filter = 'all';
    this.tiles = new Map();      // uid -> element
    this.equipped = {};          // slot -> element
    this.lastRun = 0;
    this.sheetUid = null;
    this.sheetSig = '';
    this.confirmUid = null;      // two-tap guard for Legendary+ salvage / sell
    this.confirmKind = '';
  }

  get combat() { return this.app.combatSystem; }
  get gear() { return this.app.combatSystem.gear; }
  get gs() { return this.app.gameState; }

  ensureStylesheet() {
    if (typeof document === 'undefined' || document.getElementById('bag-css')) return;
    const link = document.createElement('link');
    link.id = 'bag-css';
    link.rel = 'stylesheet';
    link.href = 'css/bag.css';
    document.head.appendChild(link);
  }

  build() {
    this.ensureStylesheet();
    if (document.getElementById('bag-panel')) return;
    const anchor = document.getElementById('gear-levels-panel') || document.getElementById('hero-gear-container');
    if (!anchor) return;
    const bones = ITEM_NAMES.monsterBones;
    const panel = document.createElement('div');
    panel.id = 'bag-panel';
    panel.className = 'card bag-panel';
    panel.innerHTML = `
      <div class="card-head">
        <strong class="bag-title">${t('bag.title')}</strong>
        <span class="bag-heads">
          <span class="chip gold" id="bag-up-chip" hidden></span>
          <span class="chip" id="bag-count">0 / ${BAG_CAP}</span>
        </span>
      </div>
      <p class="bag-note">${t('bag.note')}</p>

      <div class="bag-kashta" id="bag-kashta">
        <div class="bag-kashta-text"><span class="bag-kashta-icon" aria-hidden="true">🏕️</span>
          <span id="bag-kashta-status" class="num"></span></div>
        <div class="bag-kashta-actions">
          <button class="btn btn-sm" id="bag-kashta-toggle" type="button"></button>
          <button class="btn btn-sm" id="bag-kashta-auto" type="button" aria-pressed="true"></button>
        </div>
      </div>

      <div class="bag-equipped" id="bag-equipped" role="group" aria-label="${esc(t('bag.equipped'))}"></div>

      <div class="bag-controls">
        <div class="bag-ctl">
          <span class="bag-ctl-label">${t('bag.auto_salvage')}</span>
          <div class="seg" id="bag-autosalvage" role="group" aria-label="${esc(t('bag.auto_salvage'))}">
            ${AUTO_SALVAGE_CHOICES.map(c => `<button type="button" data-as="${c}" aria-pressed="false">${esc(c === 'Off' ? t('bag.off') : t(`rarity.${c.toLowerCase()}`))}</button>`).join('')}
          </div>
        </div>
        <div class="bag-ctl" id="bag-wakeel-row" hidden>
          <button class="btn btn-sm" id="bag-autoequip" type="button" aria-pressed="false"></button>
        </div>
        <div class="bag-ctl">
          <span class="bag-ctl-label">${t('bag.sort')}</span>
          <div class="seg" id="bag-sort" role="group" aria-label="${esc(t('bag.sort'))}">
            ${SORTS.map(s => `<button type="button" data-sort="${s}" aria-pressed="false">${esc(t(`bag.sort.${s}`))}</button>`).join('')}
          </div>
        </div>
        <div class="bag-ctl">
          <span class="bag-ctl-label">${t('bag.filter')}</span>
          <div class="seg" id="bag-filter" role="group" aria-label="${esc(t('bag.filter'))}">
            <button type="button" data-filter="all" aria-pressed="true">${esc(t('bag.all'))}</button>
            ${SLOTS.map(s => `<button type="button" data-filter="${s}" aria-pressed="false" aria-label="${esc(t(`gear.slot.${s}`))}">${SLOT_ICONS[s]}</button>`).join('')}
          </div>
        </div>
      </div>

      <div class="bag-actions">
        <button class="btn btn-sm" id="bag-equip-best" type="button"></button>
        <button class="btn btn-sm" id="bag-bulk" type="button"></button>
        <span class="bag-stock chip" id="bag-stock">${bones.icon} 0</span>
      </div>
      <div class="bag-bulk-confirm" id="bag-bulk-confirm" hidden>
        <span id="bag-bulk-text"></span>
        <button class="btn btn-sm btn-primary" id="bag-bulk-yes" type="button">${t('bag.bulk_yes')}</button>
        <button class="btn btn-sm btn-ghost" id="bag-bulk-no" type="button">${t('bag.cancel')}</button>
      </div>

      <div class="bag-grid" id="bag-grid" role="list"></div>
      <p class="bag-empty" id="bag-empty" hidden>${t('bag.empty')}</p>
      <p class="bag-ticker num" id="bag-ticker"></p>`;
    anchor.insertAdjacentElement('afterend', panel);

    // Equipped row: four tiles, tap = open the same sheet (lock, re-temper)
    const eq = panel.querySelector('#bag-equipped');
    for (const slot of SLOTS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bag-tile is-equipped';
      b.dataset.slot = slot;
      b.innerHTML = this.tileHtml();
      eq.appendChild(b);
      this.equipped[slot] = b;
    }

    // One delegated handler for the whole panel
    panel.addEventListener('click', (e) => this.onClick(e));
    this.sheet = this.buildSheet();
    this.panel = panel;
  }

  tileHtml() {
    return `<span class="bt-icon" aria-hidden="true"></span><span class="bt-glyph" aria-hidden="true"></span>` +
      `<span class="bt-lv num"></span><span class="bt-up" aria-hidden="true" hidden>▲</span><span class="bt-lock" aria-hidden="true" hidden>🔒</span>`;
  }

  buildSheet() {
    const scrim = document.createElement('div');
    scrim.className = 'bag-scrim';
    scrim.id = 'bag-scrim';
    scrim.hidden = true;
    scrim.innerHTML = `<div class="bag-modal" role="dialog" aria-modal="true" aria-labelledby="bag-sheet-title" id="bag-modal">
      <div class="bag-handle" aria-hidden="true"></div>
      <div id="bag-sheet-body"></div>
    </div>`;
    document.body.appendChild(scrim);
    scrim.addEventListener('click', (e) => {
      if (e.target === scrim) this.closeSheet();
      else this.onSheetClick(e);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !scrim.hidden) this.closeSheet(); });
    return scrim;
  }

  // --- events ---

  onClick(e) {
    const g = this.gear;
    const tile = e.target.closest('.bag-tile');
    if (tile) {
      const uid = Number(tile.dataset.uid) || (tile.dataset.slot ? this.gs.hero.gear[tile.dataset.slot]?.uid : 0);
      if (uid) this.openSheet(uid);
      return;
    }
    if (e.target.closest('button')?.getAttribute('aria-disabled') === 'true') return;
    const as = e.target.closest('[data-as]');
    if (as) { this.gs.bag.autoSalvage = as.dataset.as; this.refresh(true); return; }
    const sortBtn = e.target.closest('[data-sort]');
    if (sortBtn) { this.sort = sortBtn.dataset.sort; this.refresh(true); return; }
    const fb = e.target.closest('[data-filter]');
    if (fb) { this.filter = fb.dataset.filter; this.refresh(true); return; }
    const id = e.target.closest('button')?.id;
    if (id === 'bag-equip-best') { if (g.equipBest() > 0) this.afterChange(); return; }
    if (id === 'bag-autoequip') { this.gs.bag.autoEquip = !this.gs.bag.autoEquip; this.refresh(true); return; }
    if (id === 'bag-kashta-toggle') { this.combat.toggleKashta(); this.refresh(true); return; }
    if (id === 'bag-kashta-auto') {
      this.gs.settings.kashtaAuto = this.gs.settings.kashtaAuto === false;
      this.refresh(true);
      return;
    }
    if (id === 'bag-bulk') {
      const limit = this.bulkLimit();
      const p = g.salvageBulk(limit, false);
      if (!p.count) return;
      this.bulkPending = limit;
      this.refresh(true);
      return;
    }
    if (id === 'bag-bulk-yes') { g.salvageBulk(this.bulkPending || 'Common', true); this.bulkPending = null; this.afterChange(); return; }
    if (id === 'bag-bulk-no') { this.bulkPending = null; this.refresh(true); }
  }

  // Bulk salvage goes up to the auto-salvage setting, at least Rare, at most Epic
  bulkLimit() {
    const i = Math.max(1, Math.min(2, rarityIndex(this.gs.bag.autoSalvage)));
    return RARITY_NAMES[i];
  }

  onSheetClick(e) {
    const btn = e.target.closest('[data-act]');
    if (!btn || btn.getAttribute('aria-disabled') === 'true') return;
    const act = btn.dataset.act;
    const g = this.gear;
    const f = g.findItem(this.sheetUid);
    if (act === 'close') { this.closeSheet(); return; }
    if (!f) { this.closeSheet(); return; }
    const big = rarityIndex(f.item.rarity) >= 3;
    if ((act === 'salvage' || act === 'sell') && big && !(this.confirmUid === f.item.uid && this.confirmKind === act)) {
      this.confirmUid = f.item.uid; this.confirmKind = act;   // first tap arms it
      this.sheetSig = ''; this.renderSheet();
      return;
    }
    if (act === 'equip') { g.equip(f.item.uid); this.closeSheet(); this.afterChange(); return; }
    if (act === 'lock') { g.toggleLock(f.item.uid); this.afterChange(); return; }
    if (act === 'salvage') { g.salvage(f.item.uid); this.closeSheet(); this.afterChange(); return; }
    if (act === 'sell') { g.sell(f.item.uid); this.closeSheet(); this.afterChange(); return; }
    if (act === 'retemper') { g.retemper(f.item.uid); this.afterChange(); }
  }

  afterChange() {
    this.confirmUid = null; this.confirmKind = '';
    this.app.lastGearSig = null;   // main.js redraws the equipped cards
    this.refresh(true);
  }

  // --- sheet ---

  openSheet(uid) {
    this.sheetUid = uid;
    this.confirmUid = null; this.confirmKind = '';
    this.sheetSig = '';
    this.renderSheet();
    this.sheet.hidden = false;
    this.opener = document.activeElement;
    const first = this.sheet.querySelector('[data-act]:not([aria-disabled="true"])');
    if (first) first.focus();
  }

  closeSheet() {
    if (this.sheet.hidden) return;
    this.sheet.hidden = true;
    this.sheetUid = null;
    this.confirmUid = null; this.confirmKind = '';
    if (this.opener && this.opener.isConnected) this.opener.focus();
  }

  mainStatText(slot, v) {
    const key = GEAR_MAIN_STAT[slot].key;
    if (key === 'attack') return t('gear.stat.atk', { n: this.combat.fmt(v) });
    if (key === 'hp') return t('gear.stat.hp', { n: this.combat.fmt(v) });
    const pct = (v * 100).toFixed(1);
    return t(key === 'crit' ? 'gear.stat.crit' : 'gear.stat.drain', { n: pct });
  }

  deltaChip(delta) {
    const pct = Math.round(delta * 100);
    if (pct === 0 && Math.abs(delta) < 0.0005) return `<span class="chip">${t('bag.same')}</span>`;
    const cls = delta > 0 ? 'life' : 'danger';
    return `<span class="chip ${cls}">${delta > 0 ? '▲' : '▼'} ${t('bag.rating_delta', { pct: (delta > 0 ? '+' : '') + pct })}</span>`;
  }

  itemBlock(item, titleKey, slotLevel) {
    if (!item) return `<div class="bag-col"><div class="bag-col-title">${t(titleKey)}</div><p class="bag-none">${t('gear.empty')}</p></div>`;
    const stat = gearStat(item.slot, { ...item, level: slotLevel });
    const rows = [
      `<li class="num">${esc(this.mainStatText(item.slot, stat))}${slotLevel > 0 ? ' · ' + esc(t('gear.lv', { n: slotLevel })) : ''}</li>`,
      ...(item.affixes || []).map(a => `<li>${esc(affixText(a))}</li>`)
    ];
    if (item.uniqueId) rows.push(`<li class="bag-fx"><em>${esc(uniqueText(item.uniqueId))}</em></li>`);
    return `<div class="bag-col ${rarityClass(item.rarity)}">
      <div class="bag-col-title">${t(titleKey)}</div>
      <div class="bag-col-name">${esc(gearName(item))}${item.heirloom ? ` <span class="tag tier">${esc(t('bag.heirloom'))}</span>` : ''}</div>
      <div>${rarityTag(item.rarity)} <span class="bag-ilvl num">${esc(t('bag.ilvl', { n: item.ilvl }))}</span></div>
      <ul class="bag-stats">${rows.join('')}</ul></div>`;
  }

  renderSheet() {
    const g = this.gear;
    const f = g.findItem(this.sheetUid);
    const body = this.sheet.querySelector('#bag-sheet-body');
    if (!f) { this.closeSheet(); return; }
    const item = f.item;
    const worn = this.gs.hero.gear[item.slot];
    const delta = f.equipped ? 0 : g.ratingDelta(item);
    const slotLv = getGearLevel(worn);
    const info = g.retemperInfo(item);
    const val = g.salvageValue(item);
    const sell = g.sellValue(item);
    const bones = ITEM_NAMES.monsterBones, cores = ITEM_NAMES.voidCores;
    const confirm = (kind) => this.confirmUid === item.uid && this.confirmKind === kind;
    const salvageLbl = confirm('salvage') ? t('bag.tap_again') : t('bag.salvage');
    const sellLbl = confirm('sell') ? t('bag.tap_again') : t('bag.sell');
    const coreTxt = val.cores ? ` ${cores.icon}${val.cores}` : '';
    const locked = item.locked;
    const dis = (cond) => (cond ? ' aria-disabled="true" class="btn is-locked"' : ' class="btn"');
    let retemper = '';
    if (info.eligible) {
      const cost = info.free ? t('bag.free') : `${esc(this.fmtNum(info.gold))} 🪙 ${info.cores ? cores.icon + info.cores : ''}`;
      retemper = `<button data-act="retemper"${dis(!info.canAfford)} type="button"><span>${t('bag.retemper', { n: info.target })}</span> <span class="num bag-cost">${cost}</span></button>`;
    }
    const sig = [item.uid, item.ilvl, locked, f.equipped, Math.round(delta * 1000), info.eligible, info.canAfford, info.target, this.confirmKind, this.confirmUid, item.freeTemper].join('|');
    if (sig === this.sheetSig) return;
    this.sheetSig = sig;
    body.innerHTML = `
      <div class="bag-sheet-head">
        <h3 id="bag-sheet-title">${esc(gearName(item))}</h3>
        ${f.equipped ? `<span class="chip life">${esc(t('bag.worn'))}</span>` : this.deltaChip(delta)}
      </div>
      <div class="bag-compare">
        ${f.equipped ? '' : this.itemBlock(worn, 'bag.equipped_now', slotLv)}
        ${this.itemBlock(item, f.equipped ? 'bag.equipped_now' : 'bag.this_item', f.equipped ? slotLv : slotLv)}
      </div>
      <div class="bag-sheet-actions">
        ${f.equipped ? '' : `<button data-act="equip" class="btn ${delta > 0 ? 'btn-primary' : ''}" type="button">${t('bag.equip')}</button>`}
        <button data-act="lock" class="btn" aria-pressed="${locked}" type="button">${locked ? '🔓 ' + t('bag.unlock') : '🔒 ' + t('bag.lock')}</button>
        ${f.equipped ? '' : `<button data-act="salvage"${dis(locked)} type="button">${salvageLbl} <span class="num bag-cost">${bones.icon}${val.bones}${coreTxt}</span></button>
        <button data-act="sell"${dis(locked)} type="button">${sellLbl} <span class="num bag-cost">${esc(this.fmtNum(sell))} 🪙</span></button>`}
        ${retemper}
        <button data-act="close" class="btn btn-ghost" type="button">${t('bag.close')}</button>
      </div>
      ${info.eligible || rarityIndex(item.rarity) >= 3 ? '' : `<p class="bag-hint">${t('bag.retemper_hint')}</p>`}`;
  }

  // --- patch loop ---

  rarityOrder(item) { return rarityIndex(item.rarity); }

  sortedList(list) {
    const cmp = {
      rating: (a, b) => b.delta - a.delta || b.item.uid - a.item.uid,
      rarity: (a, b) => this.rarityOrder(b.item) - this.rarityOrder(a.item) || b.delta - a.delta,
      slot: (a, b) => SLOTS.indexOf(a.item.slot) - SLOTS.indexOf(b.item.slot) || b.delta - a.delta,
      ilvl: (a, b) => b.item.ilvl - a.item.ilvl || b.delta - a.delta,
      newest: (a, b) => b.item.uid - a.item.uid
    }[this.sort] || (() => 0);
    return list.slice().sort(cmp);
  }

  patchTile(el, item, delta) {
    const cls = rarityClass(item.rarity);
    const up = delta > 0.0005;
    const sig = `${cls}|${item.slot}|${item.ilvl}|${item.locked}|${up}|${item.uniqueId || ''}|${Math.round(delta * 100)}`;
    if (el.dataset.sig === sig) return;
    el.dataset.sig = sig;
    el.className = `bag-tile ${cls}${up ? ' is-upgrade' : ''}${item.uniqueId ? ' is-unique' : ''}${el.classList.contains('is-equipped') ? ' is-equipped' : ''}`;
    el.querySelector('.bt-icon').textContent = SLOT_ICONS[item.slot];
    el.querySelector('.bt-glyph').textContent = RARITY_GLYPHS[cls] || '';
    el.querySelector('.bt-lv').textContent = String(item.ilvl);
    setHidden(el.querySelector('.bt-up'), !up);
    setHidden(el.querySelector('.bt-lock'), !item.locked);
    const word = t(`rarity.${cls || 'common'}`);
    el.setAttribute('aria-label', `${gearName(item)}, ${word}, ${t('bag.ilvl', { n: item.ilvl })}${up ? ', ' + t('bag.rating_delta', { pct: '+' + Math.round(delta * 100) }) : ''}${item.locked ? ', ' + t('bag.lock') : ''}`);
  }

  update(tab) {
    if (tab !== 'combat' || !this.panel) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastRun < THROTTLE_MS) return;
    this.lastRun = now;
    this.refresh(false);
  }

  refresh() {
    if (!this.panel || !this.combat?.gear) return;
    const g = this.gear, bag = this.gs.bag, hero = this.gs.hero;
    if (!bag || !hero) return;
    const list = g.listBag();
    const ups = list.filter(e => e.delta > 0.0005).length;

    setText(document.getElementById('bag-count'), `${bag.items.length} / ${bag.cap}`);
    const upChip = document.getElementById('bag-up-chip');
    setHidden(upChip, ups === 0);
    setText(upChip, t('bag.upgrades', { n: ups }));

    // Equipped row
    for (const slot of SLOTS) {
      const item = hero.gear[slot];
      const el = this.equipped[slot];
      if (!item || !el) continue;
      el.dataset.uid = '';
      this.patchTile(el, item, 0);
    }

    // Bag grid: sort, filter, keyed reconcile
    const grid = document.getElementById('bag-grid');
    const shown = this.sortedList(list.filter(e => this.filter === 'all' || e.item.slot === this.filter));
    const want = new Set(shown.map(e => e.item.uid));
    for (const [uid, el] of this.tiles) {
      if (!want.has(uid)) { el.remove(); this.tiles.delete(uid); }
    }
    let prev = null;
    for (const { item, delta } of shown) {
      let el = this.tiles.get(item.uid);
      if (!el) {
        el = document.createElement('button');
        el.type = 'button';
        el.setAttribute('role', 'listitem');
        el.dataset.uid = String(item.uid);
        el.innerHTML = this.tileHtml();
        this.tiles.set(item.uid, el);
      }
      this.patchTile(el, item, delta);
      const at = prev ? prev.nextElementSibling : grid.firstElementChild;
      if (at !== el) grid.insertBefore(el, at);
      prev = el;
    }
    setHidden(document.getElementById('bag-empty'), shown.length > 0);

    // Controls
    for (const b of document.querySelectorAll('#bag-autosalvage button')) {
      const on = b.dataset.as === bag.autoSalvage;
      if (b.getAttribute('aria-pressed') !== String(on)) b.setAttribute('aria-pressed', String(on));
    }
    for (const b of document.querySelectorAll('#bag-sort button')) {
      const on = b.dataset.sort === this.sort;
      if (b.getAttribute('aria-pressed') !== String(on)) b.setAttribute('aria-pressed', String(on));
    }
    for (const b of document.querySelectorAll('#bag-filter button')) {
      const on = b.dataset.filter === this.filter;
      if (b.getAttribute('aria-pressed') !== String(on)) b.setAttribute('aria-pressed', String(on));
    }
    const eb = document.getElementById('bag-equip-best');
    setText(eb, ups > 0 ? t('bag.equip_best', { n: ups }) : t('bag.equip_best_none'));
    this.setEnabled(eb, ups > 0, true);

    const limit = this.bulkLimit();
    const preview = g.salvageBulk(limit, false);
    const bulk = document.getElementById('bag-bulk');
    setText(bulk, t('bag.bulk', { rarity: t(`rarity.${limit.toLowerCase()}`) }));
    this.setEnabled(bulk, preview.count > 0, false);
    const confirmBox = document.getElementById('bag-bulk-confirm');
    if (this.bulkPending && preview.count === 0) this.bulkPending = null;
    setHidden(confirmBox, !this.bulkPending);
    if (this.bulkPending) {
      setText(document.getElementById('bag-bulk-text'), t('bag.bulk_confirm', {
        n: preview.count, bones: preview.bones, cores: preview.cores
      }));
    }

    const wk = document.getElementById('bag-wakeel-row');
    setHidden(wk, !bag.wakeel);
    const ae = document.getElementById('bag-autoequip');
    setText(ae, bag.autoEquip ? t('bag.autoequip_on') : t('bag.autoequip_off'));
    if (ae.getAttribute('aria-pressed') !== String(!!bag.autoEquip)) ae.setAttribute('aria-pressed', String(!!bag.autoEquip));

    // Kashta
    const k = this.combat.kashta;
    const auto = this.combat.isKashtaAuto();
    let status;
    if (k.active && k.manual) status = t('bag.kashta_manual', { floor: hero.floor });
    else if (k.active) {
      const s = Math.max(0, Math.ceil(k.remaining));
      status = t('bag.kashta_retry', { time: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, floor: hero.floor });
    } else status = auto ? t('bag.kashta_idle') : t('bag.kashta_off');
    setText(document.getElementById('bag-kashta-status'), status);
    setText(document.getElementById('bag-kashta-toggle'), k.active ? t('bag.kashta_resume') : t('bag.kashta_camp'));
    const autoBtn = document.getElementById('bag-kashta-auto');
    setText(autoBtn, auto ? t('bag.kashta_auto_on') : t('bag.kashta_auto_off'));
    if (autoBtn.getAttribute('aria-pressed') !== String(auto)) autoBtn.setAttribute('aria-pressed', String(auto));

    const inv = this.gs.inventory;
    const bones = ITEM_NAMES.monsterBones, cores = ITEM_NAMES.voidCores;
    setText(document.getElementById('bag-stock'), `${bones.icon} ${this.fmtNum(Math.floor(inv.monsterBones || 0), 0)}  ${cores.icon} ${this.fmtNum(Math.floor(inv.voidCores || 0), 0)}`);
    setText(document.getElementById('bag-ticker'), this.gs.loot?.salvaged ? t('bag.ticker', { n: this.gs.loot.salvaged }) : '');

    if (this.sheet && !this.sheet.hidden) this.renderSheet();
  }

  setEnabled(btn, enabled, primary) {
    if (!btn) return;
    const locked = !enabled;
    if (btn.classList.contains('is-locked') !== locked) {
      btn.classList.toggle('is-locked', locked);
      btn.setAttribute('aria-disabled', String(locked));
    }
    if (primary && btn.classList.contains('btn-primary') !== enabled) btn.classList.toggle('btn-primary', enabled);
  }
}

