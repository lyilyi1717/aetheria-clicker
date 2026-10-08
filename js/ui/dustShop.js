// Dust shop panel (R6, docs/redesign-proposal.md §6.2; mockup docs/ui/mockups/dust-shop.html), in
// the Ascension tab where the perk grid was. main.js calls init() once and update() every frame;
// the DOM is built once and updated in place, so buttons are never replaced under the pointer.
//
// Also owns the pieces of the shop that live on other screens:
//   - the Auto-Buy switch on the Falafel tab (next to the buy-amount selector) and its 10 s clock
//     (setInterval, so it keeps buying in background tabs where requestAnimationFrame stops);
//   - the Hourglass of Al-Ula Fast Forward buttons (5 min / 1 h) next to the header's 30 s one.
import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { rewards } from './rewards.js';
import {
  DUST_SHOP_ITEMS, DUST_SHOP_TIERS, AUTO_BUY_INTERVAL, getShopRank, getNextShopCost, isShopItemOpen,
  isShopItemMaxed, canBuyShopItem, buyShopItem, getNextShopTier, runAutoBuy, hasShopItem
} from '../systems/DustShopSystem.js';
import { FF_LONG_WARPS } from '../systems/FastForwardSystem.js';
import { t } from '../i18n/index.js';

const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
const setAttr = (el, k, v) => {
  if (!el) return;
  if (v === null) { if (el.hasAttribute(k)) el.removeAttribute(k); }
  else if (el.getAttribute(k) !== v) el.setAttribute(k, v);
};
const toggle = (el, cls, on) => { if (el && el.classList.contains(cls) !== on) el.classList.toggle(cls, on); };
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (d) => (d instanceof BigNum ? d : new BigNum(d)).format('standard', 0);
const tierLabel = (n) => (n === 0 ? t('ds.any') : t('ds.well', { n }));

// Items the player can see: every open tier, the next tier (locked, to aim at) and "any" items.
// Tiers after the next stay hidden until the next one opens (mockup note).
export function getVisibleShopItems(gs) {
  const next = getNextShopTier(gs);
  return DUST_SHOP_ITEMS.filter(d => d.tier === 0 || next === null || d.tier <= next);
}

// Card state for one item: 'own' (maxed), 'aff' (open and affordable), 'open' (open, short of
// dust), 'lock' (tier not reached)
export function getShopCardState(gs, id) {
  if (isShopItemMaxed(gs, id)) return 'own';
  if (!isShopItemOpen(gs, id)) return 'lock';
  return canBuyShopItem(gs, id) ? 'aff' : 'open';
}

export class DustShopUI {
  constructor(app) {
    this.app = app;
    this.filter = 'all';
    this.cards = new Map();
    this.timer = null;
    this.el = {};
  }

  get gs() { return this.app.gameState; }

  init() {
    this.build();
    this.buildAutoBuySwitch();
    this.buildHourglass();
    if (!this.timer) this.timer = setInterval(() => this.tickAutoBuy(), AUTO_BUY_INTERVAL * 1000);
    this.update();
  }

  cardHtml(d) {
    return `
      <article class="ds-item" data-item="${d.id}">
        <div class="icon-tile" aria-hidden="true">${d.icon}</div>
        <div class="ds-body">
          <div class="ds-t"><h3>${esc(d.name)}</h3><span class="tag tier">${tierLabel(d.tier)}</span></div>
          <p class="ds-d">${esc(d.desc)}</p>
          <div class="ds-f">
            <span class="ds-rank" data-rank></span>
            <span class="ds-see" data-see hidden>✓ ${esc(d.see)}</span>
            <button type="button" class="btn btn-sm" data-buy="${d.id}"></button>
          </div>
        </div>
      </article>`;
  }

  build() {
    const cont = document.getElementById('dust-shop-section');
    if (!cont || cont.dataset.built) return;
    cont.dataset.built = '1';
    const chips = [['all', t('bb.all')], ...DUST_SHOP_TIERS.map(n => [String(n), t('ds.well', { n })])];
    cont.innerHTML = `
      <div class="card-head ds-head">
        <h2>${t('ds.title')} <span class="ds-sub">${t('ds.balance')} <b class="c-dust num" data-ds="balance"></b> · <span class="num" data-ds="affordable"></span></span></h2>
        <div class="ds-tiers" role="group" aria-label="${t('ds.tier_aria')}">
          ${chips.map(([v, l]) => `<button type="button" class="chip" data-filter="${v}" aria-pressed="${v === 'all'}">${l}<b data-you="${v}" hidden> · ${t('ds.you')}</b></button>`).join('')}
        </div>
      </div>
      <p class="ds-intro">${t('ds.intro')}</p>
      <div class="ds-legacy" data-ds="legacy" hidden></div>
      <div class="ds-shop">${DUST_SHOP_ITEMS.map(d => this.cardHtml(d)).join('')}</div>
      <p class="ds-more" data-ds="more" hidden></p>`;
    for (const node of cont.querySelectorAll('[data-ds]')) this.el[node.dataset.ds] = node;
    for (const card of cont.querySelectorAll('[data-item]')) {
      this.cards.set(card.dataset.item, {
        card, rank: card.querySelector('[data-rank]'), see: card.querySelector('[data-see]'),
        btn: card.querySelector('[data-buy]')
      });
    }
    this.chips = [...cont.querySelectorAll('[data-filter]')];
    this.youMarks = [...cont.querySelectorAll('[data-you]')];
    cont.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-filter]');
      if (chip) { this.filter = chip.dataset.filter; this.update(); return; }
      const btn = e.target.closest('[data-buy]');
      if (btn) this.buy(btn.dataset.buy, btn);
    });
    this.renderLegacy();
  }

  // One line for saves whose perks the v5 migration converted
  renderLegacy() {
    const r = this.gs.legacyPerkRefund;
    const el = this.el.legacy;
    if (!el || !r) return;
    const name = (id) => DUST_SHOP_ITEMS.find(d => d.id === id)?.name || id;
    const kept = Object.keys(r.kept || {}).map(name);
    const removed = { eternal_resonance: t('ds.removed.eternal'), hyper_click: t('ds.removed.hyper') };
    const refunded = Object.keys(r.refunded || {}).map(id => removed[id] || id);
    const dust = BigNum.fromJSON(r.dust);
    const parts = [];
    if (kept.length) parts.push(t('ds.legacy.kept', { list: kept.join(t('list.sep')) }));
    if (refunded.length) parts.push(t(refunded.length > 1 ? 'ds.legacy.removed_many' : 'ds.legacy.removed_one', { list: refunded.join(t('ds.and')), n: fmt(dust) }));
    if (!parts.length) return;
    el.textContent = `${t('ds.legacy.head')} ${parts.join(' ')}`;
    el.hidden = false;
  }

  buy(id, source) {
    const d = DUST_SHOP_ITEMS.find(x => x.id === id);
    if (!d || !canBuyShopItem(this.gs, id)) return;
    const rank = buyShopItem(this.gs, id);
    if (!rank) return;
    sound.playBuy();
    if (d.maxRank === 1) {
      rewards.notify({ tier: 'big', kind: `shop-${id}`, icon: d.icon, color: '#c084fc', title: t('ds.toast.new', { name: d.name }), detail: d.desc, source });
    } else {
      rewards.notify({ tier: 'medium', kind: `shop-${id}`, icon: d.icon, color: '#c084fc', title: t('ds.toast.rank', { name: d.name, r: rank }), batchTitle: `${d.name} ×{n}`, source });
    }
    // Things the purchase changes elsewhere: Chrono Reservoir's sand cap, Titan's HP, Auto-Buy
    this.app.updatePrestigeUI?.();
    this.update();
  }

  // --- Auto-Buy -------------------------------------------------------------------------------
  buildAutoBuySwitch() {
    const head = document.querySelector('#tab-monolith .buildings-header');
    if (!head || document.getElementById('btn-auto-buy')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btn-auto-buy';
    btn.className = 'chip ds-autobuy';
    btn.hidden = true;
    btn.title = t('ds.autobuy_tip', { s: AUTO_BUY_INTERVAL });
    btn.addEventListener('click', () => {
      this.gs.dustShop.autoBuy = !this.gs.dustShop.autoBuy;
      this.updateAutoBuySwitch();
      if (this.gs.dustShop.autoBuy) this.tickAutoBuy();
    });
    head.appendChild(btn);
    this.el.autoBuy = btn;
  }

  updateAutoBuySwitch() {
    const btn = this.el.autoBuy;
    if (!btn) return;
    const owned = hasShopItem(this.gs, 'auto_buy');
    if (btn.hidden === owned) btn.hidden = !owned;
    if (!owned) return;
    const on = this.gs.dustShop.autoBuy !== false;
    setText(btn, t('ds.autobuy', { s: on ? t('ab.on') : t('ab.off') }));
    setAttr(btn, 'aria-pressed', String(on));
    toggle(btn, 'aether', on);
  }

  tickAutoBuy() {
    const bs = this.app.buildingSystem;
    if (!bs) return;
    const res = runAutoBuy(this.gs, bs);
    if (res.bought > 0) this.app.updateBuildingsUI?.();
  }

  // --- Hourglass of Al-Ula --------------------------------------------------------------------
  buildHourglass() {
    const warp = document.getElementById('btn-time-warp');
    if (!warp || document.getElementById('ds-hourglass')) return;
    const wrap = document.createElement('span');
    wrap.id = 'ds-hourglass';
    wrap.className = 'ds-hourglass';
    wrap.hidden = true;
    wrap.innerHTML = FF_LONG_WARPS.map(w =>
      `<button type="button" class="btn btn-sm btn-aether ds-warp" data-warp="${w.id}">⌛ ${w.label}<span class="ff-sub num">${t('ff.cost', { n: fmt(w.cost) })}</span></button>`).join('');
    warp.after(wrap);
    wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-warp]');
      if (!btn) return;
      const w = FF_LONG_WARPS.find(x => x.id === btn.dataset.warp);
      const ff = this.app.fastForwardSystem;
      if (!w || !ff?.useLong(w.id)) return;
      sound.playSpell();
      rewards.notify({ tier: 'small', kind: 'time-warp', icon: '⌛', title: t('ds.warp_toast', { label: w.label }), color: '#38bdf8', source: btn });
      this.updateHourglass();
    });
    this.el.hourglass = wrap;
    this.el.warps = [...wrap.querySelectorAll('[data-warp]')];
  }

  updateHourglass() {
    const wrap = this.el.hourglass;
    const ff = this.app.fastForwardSystem;
    if (!wrap || !ff) return;
    const owned = ff.hasHourglass();
    if (wrap.hidden === owned) wrap.hidden = !owned;
    if (!owned) return;
    const sand = Math.floor(this.gs.chronoSand || 0);
    const cap = this.gs.getChronoSandCap();
    for (const btn of this.el.warps) {
      const w = FF_LONG_WARPS.find(x => x.id === btn.dataset.warp);
      const ok = ff.canUseLong(w.id);
      if (btn.disabled === ok) btn.disabled = !ok;
      toggle(btn, 'disabled', !ok);
      const why = ff.isWarping() ? t('ds.why.running')
        : w.cost > cap ? t('ds.why.bank', { n: fmt(w.cost), r: Math.ceil((w.cost / 1440 - 1) / 0.5) })
          : sand < w.cost ? t('ds.why.have', { n: fmt(sand) }) : t('ds.why.ready');
      const tip = t('ds.hourglass_tip', { label: w.label, n: fmt(w.cost), why });
      if (btn.title !== tip) btn.title = tip;
    }
  }

  // --- Panel ----------------------------------------------------------------------------------
  update() {
    this.updateAutoBuySwitch();
    this.updateHourglass();
    if (!this.cards.size) return;
    if (this.app.currentTab && this.app.currentTab !== 'prestige') return;
    const gs = this.gs;
    const visible = new Set(getVisibleShopItems(gs).map(d => d.id));
    let affordable = 0;
    for (const d of DUST_SHOP_ITEMS) {
      const c = this.cards.get(d.id);
      const state = getShopCardState(gs, d.id);
      if (state === 'aff') affordable++;
      const show = visible.has(d.id) && (this.filter === 'all' || String(d.tier) === this.filter);
      if (c.card.hidden === show) c.card.hidden = !show;
      if (!show) continue;
      toggle(c.card, 'aff', state === 'aff');
      toggle(c.card, 'own', state === 'own');
      toggle(c.card, 'lock', state === 'lock');
      const rank = getShopRank(gs, d.id);
      const cost = getNextShopCost(gs, d.id);
      let rankText;
      if (state === 'lock') rankText = t('ds.unlocks_at', { n: d.tier, you: gs.ascensionCount });
      else if (d.maxRank === 1) rankText = state === 'own' ? t('ds.bought') : '';
      else if (d.maxRank === Infinity) rankText = t('ds.rank', { n: rank });
      else rankText = t('qm.rank', { n: rank, max: d.maxRank });
      setText(c.rank, rankText);
      const owned = rank > 0;
      if (c.see.hidden === owned) c.see.hidden = !owned;
      const btn = c.btn;
      if (state === 'own') {
        if (!btn.hidden) btn.hidden = true;
        continue;
      }
      if (btn.hidden) btn.hidden = false;
      const locked = state !== 'aff';
      toggle(btn, 'btn-dust', !locked);
      toggle(btn, 'is-locked', locked);
      setAttr(btn, 'aria-disabled', locked ? 'true' : null);
      let label;
      if (state === 'lock') label = t('ds.btn.lock', { n: d.tier, c: fmt(cost) });
      else if (state === 'open') label = t('ds.btn.need', { n: fmt(cost.sub(gs.cosmicDust)) });
      else label = t('ds.btn.buy', { n: fmt(cost) });
      setText(btn, label);
    }
    setText(this.el.balance, fmt(gs.cosmicDust));
    setText(this.el.affordable, t('ds.affordable', { n: affordable }));
    const you = [...DUST_SHOP_TIERS].reverse().find(t => gs.ascensionCount >= t);
    for (const m of this.youMarks) {
      const on = m.dataset.you === String(you);
      if (m.hidden === on) m.hidden = !on;
    }
    const next = getNextShopTier(gs);
    for (const chip of this.chips) {
      setAttr(chip, 'aria-pressed', String(chip.dataset.filter === this.filter));
      const hide = chip.dataset.filter !== 'all' && next !== null && Number(chip.dataset.filter) > next;
      if (chip.hidden !== hide) chip.hidden = hide;
    }
    const later = next === null ? [] : DUST_SHOP_TIERS.filter(t => t > next);
    const more = later.length ? t('ds.more', { list: later.join(t('list.sep')) }) : '';
    setText(this.el.more, more);
    if (this.el.more.hidden !== !more) this.el.more.hidden = !more;
  }
}
