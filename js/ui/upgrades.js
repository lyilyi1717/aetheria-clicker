// Upgrade shop card on the Falafel tab (R5). Layout from docs/ui/mockups/app-shell.html
// (compact 56px tile row) and components.html ("R5 upgrade cards": the full card for the
// selected tile). main.js builds this once and calls update() every frame while the tab is open.
// Tiles are rebuilt only when the set of visible upgrades changes, and updated in place
// otherwise, so a button is never replaced between mousedown and mouseup.
import { BigNum } from '../engine/BigNum.js';
import { rewards } from './rewards.js';
import {
  UPGRADE_DEFINITIONS, TIER_UPGRADE_THRESHOLDS, CLICK_UPGRADE_COUNT, SYNERGY_MIN_TARGET,
  SYNERGY_MIN_SOURCE, getUpgradeDefinition, getClickUpgradeMult
} from '../systems/UpgradeSystem.js';
import { BUILDING_DEFINITIONS } from '../systems/BuildingSystem.js';
import { t } from '../i18n/index.js';

const MAX_TILES = 8;      // style guide 5.2: never more than ~8 equal-weight items without "N more"
const UPCOMING_TILES = 3; // locked-by-requirement tiles shown after the available ones

const BUILDING_NAME = new Map(BUILDING_DEFINITIONS.map(d => [d.id, d.name]));
const SYNERGY_IDS = UPGRADE_DEFINITIONS.filter(u => u.kind === 'synergy').map(u => u.id);

const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (x) => BigNum.from(x).format('standard', 1);

export class UpgradeShopUI {
  constructor(app) {
    this.app = app;
    this.showAll = false;
    this.selected = null;
    this.sig = '';
    this.detailSig = '';
  }

  get us() { return this.app.upgradeSystem; }
  get gs() { return this.app.gameState; }

  build() {
    const root = document.getElementById('upgrade-shop');
    if (!root) return;
    this.root = root;
    root.innerHTML = `
      <div class="card-head upg-head">
        <h3>${t('upgui.title')} <span class="upg-sub num" id="upg-sub"></span></h3>
        <button type="button" class="btn btn-sm" id="upg-buy-all">${t('upgui.buy_all')}</button>
      </div>
      <div class="upg-row" id="upg-row" role="list" aria-label="${t('upgui.title')}"></div>
      <div class="upcard" id="upg-detail" aria-live="polite"></div>
      <div class="upg-empty" id="upg-empty" hidden>${t('upgui.empty')}</div>
    `;
    this.row = root.querySelector('#upg-row');
    this.detail = root.querySelector('#upg-detail');
    this.empty = root.querySelector('#upg-empty');
    this.buyAllBtn = root.querySelector('#upg-buy-all');
    this.sub = root.querySelector('#upg-sub');

    root.addEventListener('click', (e) => {
      const tile = e.target.closest('[data-upg]');
      if (tile) {
        this.selected = tile.dataset.upg;
        this.detailSig = '';
        this.update(true);
        return;
      }
      if (e.target.closest('[data-upg-more]')) {
        this.showAll = !this.showAll;
        this.update(true);
        return;
      }
      if (e.target.closest('[data-upg-buy]')) {
        this.buy(e.target.closest('[data-upg-buy]').dataset.upgBuy);
        return;
      }
      if (e.target.closest('#upg-buy-all')) this.buyAll();
    });
    this.update(true);
  }

  buy(id) {
    const u = getUpgradeDefinition(id);
    if (!u || !this.us.buy(id)) return;
    rewards.notify({
      tier: 'small', kind: 'upgrade', icon: u.icon,
      title: t('upgui.toast', { name: u.name }), batchTitle: t('upgui.toast_batch'),
      detail: u.desc, source: u.building ? `b-card-${u.building}` : 'monolith-click-power'
    });
    this.afterBuy();
  }

  buyAll() {
    const n = this.us.buyAllAffordable();
    if (n <= 0) return;
    rewards.notify({
      tier: 'small', kind: 'upgrade-all', icon: '⬆️',
      title: t(n === 1 ? 'upgui.bought1' : 'upgui.bought', { n })
    });
    this.afterBuy();
  }

  afterBuy() {
    this.selected = null;
    this.app.updateBuildingsUI?.();
    this.update(true);
  }

  // Tiles: available ones (affordable first, then by cost), then a few still locked by requirement
  getTiles() {
    const aether = this.gs.aether;
    const available = this.us.getAvailable();
    const affordable = available.filter(u => aether.gte(this.us.getCost(u.id)));
    const rest = available.filter(u => aether.lt(this.us.getCost(u.id)));
    const upcoming = this.us.getUpcoming(UPCOMING_TILES);
    return { list: [...affordable, ...rest, ...upcoming], affordable: affordable.length, available: available.length };
  }

  update(force = false) {
    if (!this.root) return;
    const { list, affordable } = this.getTiles();
    const shown = this.showAll ? list : list.slice(0, MAX_TILES);
    const more = list.length - shown.length;

    setText(this.sub, t('upgui.sub', { a: affordable, b: this.us.getBoughtCount() }));
    const buyAllLabel = affordable > 0 ? t('upgui.buy_all_n', { n: affordable }) : t('upgui.buy_all');
    setText(this.buyAllBtn, buyAllLabel);
    const disabled = affordable === 0;
    if (this.buyAllBtn.classList.contains('is-locked') !== disabled) {
      this.buyAllBtn.classList.toggle('is-locked', disabled);
      this.buyAllBtn.setAttribute('aria-disabled', String(disabled));
    }

    if (!this.selected || !shown.some(u => u.id === this.selected)) this.selected = shown[0]?.id ?? null;

    // Structure: ids shown and the "more" control; states are updated in place below
    const sig = shown.map(u => u.id).join(',') + `|${more}|${this.showAll}`;
    if (force || sig !== this.sig) {
      this.sig = sig;
      this.row.innerHTML = shown.map(u => `
        <button type="button" class="upg" role="listitem" data-upg="${u.id}" title="${esc(`${u.name}: ${u.desc}`)}">
          <span class="upg-ic" aria-hidden="true">${u.icon}</span><span class="p"></span><span class="upg-mark" aria-hidden="true"></span>
        </button>`).join('') +
        (more > 0 || this.showAll && list.length > MAX_TILES
          ? `<button type="button" class="upg upg-more" data-upg-more="1">${this.showAll ? t('upgui.less') : `+${more}`}</button>`
          : '');
    }

    for (const tile of this.row.querySelectorAll('[data-upg]')) {
      const u = getUpgradeDefinition(tile.dataset.upg);
      const state = this.stateOf(u);
      tile.classList.toggle('aff', state === 'aff');
      tile.classList.toggle('lock', state === 'lock');
      tile.classList.toggle('is-selected', u.id === this.selected);
      tile.setAttribute('aria-pressed', String(u.id === this.selected));
      const label = `${u.name}${t('list.sep')}${state === 'aff' ? t('upgui.aff') : state === 'lock' ? t('upgui.locked') : t('upgui.not_enough')}`;
      if (tile.getAttribute('aria-label') !== label) tile.setAttribute('aria-label', label);
      const p = tile.querySelector('.p');
      const w = state === 'cost' ? `${Math.floor(this.progress(u) * 100)}%` : state === 'aff' ? '100%' : '0%';
      if (p.style.width !== w) p.style.width = w;
      setText(tile.querySelector('.upg-mark'), state === 'aff' ? '●' : state === 'lock' ? '🔒' : '');
    }

    this.empty.hidden = list.length > 0;
    this.detail.hidden = !this.selected;
    if (this.selected) this.updateDetail(getUpgradeDefinition(this.selected), force);
  }

  // 'aff' (requirement met, affordable), 'cost' (requirement met, short of Aether), 'lock' (requirement)
  stateOf(u) {
    if (!this.us.isAvailable(u.id)) return 'lock';
    return this.gs.aether.gte(this.us.getCost(u.id)) ? 'aff' : 'cost';
  }

  progress(u) {
    const r = this.gs.aether.div(this.us.getCost(u.id)).toNumber();
    return Number.isFinite(r) ? Math.max(0, Math.min(1, r)) : 0;
  }

  requirementLine(u) {
    const owned = (id) => this.gs.buildings?.[id]?.count || 0;
    if (u.kind === 'tier') {
      const name = BUILDING_NAME.get(u.building);
      return t('upgui.req.tier', { a: u.level, b: TIER_UPGRADE_THRESHOLDS.length, n: u.requires, name, have: owned(u.building), x: this.fmtMult(this.gs.getTierUpgradeMult(u.building)) });
    }
    if (u.kind === 'click') {
      return t('upgui.req.click', { a: u.level, b: CLICK_UPGRADE_COUNT, x: getClickUpgradeMult(this.gs) });
    }
    const n = SYNERGY_IDS.indexOf(u.id) + 1;
    return t('upgui.req.syn', { a: n, b: SYNERGY_IDS.length, n1: SYNERGY_MIN_TARGET, name1: BUILDING_NAME.get(u.building), h1: owned(u.building), n2: SYNERGY_MIN_SOURCE, name2: BUILDING_NAME.get(u.source), h2: owned(u.source) });
  }

  fmtMult(m) {
    return m >= 1000 ? fmt(m) : String(Math.round(m * 100) / 100);
  }

  // What is still missing before a locked upgrade appears, e.g. "12 to go"
  toGo(u) {
    const owned = (id) => this.gs.buildings?.[id]?.count || 0;
    if (u.kind === 'tier') return t('upgui.to_go', { n: Math.max(0, u.requires - owned(u.building)) });
    if (u.kind === 'synergy') {
      const n = Math.max(0, SYNERGY_MIN_TARGET - owned(u.building)) + Math.max(0, SYNERGY_MIN_SOURCE - owned(u.source));
      return t('upgui.to_go', { n });
    }
    return t('upgui.prev');
  }

  updateDetail(u, force) {
    if (!u) return;
    const state = this.stateOf(u);
    const cost = this.us.getCost(u.id);
    const discounted = cost.lt(u.cost);
    let action;
    if (state === 'aff') {
      action = `<button type="button" class="btn btn-sm btn-primary num" data-upg-buy="${u.id}">${t('upgui.buy', { n: fmt(cost) })}</button>`;
    } else if (state === 'cost') {
      const missing = cost.sub(this.gs.aether);
      action = `<button type="button" class="btn btn-sm is-locked num" aria-disabled="true" title="${t('upgui.costs', { n: fmt(cost) })}">${t('upgui.need', { n: fmt(missing) })}</button>`;
    } else {
      action = `<span class="upg-togo num">${this.toGo(u)}</span>`;
    }
    const html = `
      <div class="icon-tile" aria-hidden="true">${u.icon}</div>
      <div class="upcard-text">
        <div class="n">${esc(u.name)}</div>
        <div class="e">${esc(u.desc)} · ${t('upgui.cost_line', { n: `<span class="num">${fmt(cost)}</span>` })}${discounted ? ' ' + t('upgui.discount') : ''}</div>
        <div class="req">${esc(this.requirementLine(u))}</div>
      </div>
      ${action}`;
    if (force || html !== this.detailSig) {
      // The buy button is rebuilt only when its text changes (state, cost or missing amount)
      this.detailSig = html;
      this.detail.innerHTML = html;
      this.detail.classList.toggle('aff', state === 'aff');
      this.detail.classList.toggle('is-locked', state === 'lock');
    }
  }
}
