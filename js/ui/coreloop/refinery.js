// Core-loop Refinery screen (docs/core-loop-plan.md CL-15), behind ?loop=2. Five sections: the
// Fraction tower, Orders (and the weekly Order), the Brewing Hall (Dallahs and Bubbles), Vials, and
// the Mixer. It reads the systems only through their functions and acts only through api.act with
// the systems' own actions, enabled only when the system's can… function says so.
//
// The view-model helpers at the top are pure (state in, plain data out) and are what the tests
// cover; the DOM code below them builds once in mount() and then only changes text and attributes.
import { registerStrings } from '../../i18n/coreloop/index.js';
import EN from '../../i18n/coreloop/refinery.en.js';
import AR from '../../i18n/coreloop/refinery.ar.js';
import { BigNum } from '../../engine/BigNum.js';
import { P } from '../../systems/coreloop/params.js';
import { FRACTIONS, FIELD, fracValue } from '../../systems/coreloop/shared.js';
import * as Fields from '../../systems/coreloop/Fields.js';
import * as Refinery from '../../systems/coreloop/Refinery.js';
import * as Cauldrons from '../../systems/coreloop/Cauldrons.js';
import * as Collection from '../../systems/coreloop/Collection.js';

registerStrings(EN, AR);

// ================================================================== pure view models
export const fieldId = (field) => P.fields[field];

// Short numbers: one decimal under 10, whole numbers up to 10 000, then through BigNum
export function fmtNum(fmt, x) {
  if (!Number.isFinite(x)) return '∞';
  if (x < 10) return String(Math.round(x * 10) / 10);
  return fmt(x < 1e4 ? Math.round(x) : BigNum.from(x));
}
// A Fraction value or multiplier: two decimals while small
export const fmtMult = (fmt, x) => (x < 10 ? x.toFixed(3) : x < 100 ? x.toFixed(1) : fmtNum(fmt, x));

// A Fraction's row in the tower
export function towerRows(state) {
  return FRACTIONS.map((id, i) => {
    const f = state.refinery.frac[i];
    return { key: id, id, index: i, value: fracValue(state, i), level: f.level, bubble: f.bubble, vial: f.vial, compound: f.compound, seal: f.seal };
  });
}

// What an Order slot shows (see Refinery.orderInfo), with ids in place of names
export function orderView(state, slot) {
  const o = Refinery.orderInfo(state, slot);
  if (!o) return null;
  if (o.empty) return { empty: true, refillIn: o.refillIn };
  return {
    empty: false, fracId: FRACTIONS[o.frac], field: o.field, fieldId: fieldId(o.field), grade: o.grade, qty: o.qty,
    have: o.have, progress: o.progress, missing: Math.max(0, o.qty - o.have), before: o.before, after: o.after,
    can: Refinery.canFillOrder(state, slot)
  };
}

// The weekly Order: each Field's row counts only what open Orders don't already hold
export function weeklyView(state) {
  const w = Refinery.weeklyInfo(state);
  return {
    open: w.open, can: w.ready, secondsToNextWeek: w.secondsToNextWeek,
    rows: w.open ? w.need.map(n => {
      const free = Math.max(0, n.have - n.reserved);
      return { field: n.field, fieldId: fieldId(n.field), grade: n.grade, qty: n.qty, free, progress: Math.min(1, free / n.qty), missing: Math.max(0, n.qty - free) };
    }) : []
  };
}

// A Dallah: fill 0..1, seconds to the next bar in `presence` (Infinity when it doesn't fill there)
export function cauldronView(state, vat, presence) {
  const c = state.cauldrons.vats[vat];
  return {
    vat, id: P.cauldrons[vat], fill: Cauldrons.fillFraction(state, vat), eta: Cauldrons.secondsToBar(state, vat, presence),
    can: Cauldrons.canBrew(state, vat), upgrade: Cauldrons.nextIsUpgrade(state, vat), bars: c.bars, speed: c.speed
  };
}

export function bubbleRows(state) {
  return FRACTIONS.map((id, i) => ({ id, count: Cauldrons.bubbleCount(state, i), total: Cauldrons.fractionBubbles(state, i) }));
}

// "Level the lowest Bubble": null when there are no Bubbles
export function levelView(state) {
  const index = Cauldrons.lowestBubble(state);
  if (index < 0) return null;
  const b = state.cauldrons.bubbles[index];
  const cost = Cauldrons.levelCost(state, index), have = Fields.countAtLeast(state, FIELD.OASIS, 0);
  return { index, fracId: FRACTIONS[b.frac], level: b.level, cost, have, missing: Math.max(0, cost - have), can: Cauldrons.canLevelBubble(state, index) };
}

// Every Material the player holds (grade with at least 1 unit), by Field then grade
export function heldMaterials(state) {
  const out = [];
  state.fields.forEach((f, field) => {
    f.inventory.forEach((units, grade) => { if (units >= 1) out.push({ key: Collection.vialKey(field, grade), field, grade, units }); });
  });
  return out;
}

// Materials held that have no Vial yet, with the odds shown
export function vialTryRows(state) {
  return heldMaterials(state).filter(m => Collection.vialTier(state, m.key) === 0).map(m => {
    const odds = Collection.vialOdds(state, m.key);
    return { ...m, fieldId: fieldId(m.field), chance: odds.chance, pity: odds.pity, guaranteed: odds.guaranteed, sure: Math.max(1, odds.triesToGuarantee), can: Collection.canOfferVial(state, m.field, m.grade) };
  });
}

// Unlocked Vials with their tier and the upgrade price (cost null at the top tier)
export function ownedVials(state) {
  const have = Fields.countAtLeast(state, FIELD.OASIS, 0);
  return Object.entries(state.collection.vials).filter(([, v]) => v.tier > 0).map(([key, v]) => {
    const [field, grade] = key.split(':').map(Number);
    const cost = Collection.vialUpgradeCost(state, key);
    return { key, field, grade, fieldId: fieldId(field), tier: v.tier, tierId: Collection.vialTierId(state, key), cost, missing: cost === null ? 0 : Math.max(0, cost - have), can: Collection.canUpgradeVial(state, key) };
  }).sort((a, b) => a.field - b.field || a.grade - b.grade);
}

// What the Mixer says about a picked pair: { kind: 'none' | 'known' | 'new', index }
export function mixResult(state, a, b) {
  const index = Collection.findRecipe(state, a.field, a.grade, b.field, b.grade);
  if (index < 0) return { kind: 'none', index };
  return { kind: Collection.recipeFound(state, index) ? 'known' : 'new', index };
}

// The Compounds found, with tier, re-make price and whether it can be re-made
export function compoundRows(state) {
  const out = [];
  for (let i = 0; i < Collection.recipeCount(state); i++) {
    if (!Collection.recipeFound(state, i)) continue;
    const r = Collection.recipeAt(state, i), e = Collection.recipeState(state, i);
    out.push({
      key: String(i), index: i, a: { field: r.fa, grade: r.ga, fieldId: fieldId(r.fa) }, b: { field: r.fb, grade: r.gb, fieldId: fieldId(r.fb) },
      tier: e.tier, tierId: Collection.compoundTierId(state, i), made: e.made, top: e.tier >= P.compoundTiers.length,
      cost: Collection.remakeCost(state, i), can: Collection.canRemake(state, i)
    });
  }
  return out;
}

// ================================================================== DOM helpers
function el(tag, cls, text, attrs) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  if (attrs) for (const k of Object.keys(attrs)) n.setAttribute(k, attrs[k]);
  return n;
}
function setText(n, s) { if (n.textContent !== s) n.textContent = s; }
function setHidden(n, hidden) { if (n.hidden !== hidden) n.hidden = hidden; }
function setBar(bar, frac) {
  const w = Math.round(Math.max(0, Math.min(1, frac)) * 1000) / 10 + '%';
  if (bar.firstChild.style.width !== w) bar.firstChild.style.width = w;
}
// Gold when the action is possible, otherwise a locked look with aria-disabled (the tap does nothing)
function setBtn(btn, can, label) {
  setText(btn, label);
  btn.classList.toggle('btn-primary', can);
  btn.classList.toggle('is-locked', !can);
  btn.setAttribute('aria-disabled', String(!can));
}
function makeBtn(onClick) {
  const b = el('button', 'btn cl-r-btn', '', { type: 'button', 'aria-disabled': 'true' });
  b.addEventListener('click', () => { if (b.getAttribute('aria-disabled') !== 'true') onClick(b); });
  return b;
}
function makeBar(cls) { const b = el('div', 'bar ' + (cls || '')); b.appendChild(el('i')); return b; }
// A short confirmation on the element that was acted on
function flash(node) {
  node.classList.remove('cl-r-flash');
  void node.offsetWidth;
  node.classList.add('cl-r-flash');
}
// A list that is rebuilt only when its keys change; otherwise rows just update
function keyedList(parent, make) {
  let sig = null, rows = [];
  return {
    set(items) {
      const s = items.map(i => i.key).join('|');
      if (s !== sig) {
        parent.replaceChildren();
        rows = items.map(i => { const r = make(i); parent.appendChild(r.el); return r; });
        sig = s;
      }
      rows.forEach((r, i) => { r.item = items[i]; r.update(items[i]); });
    }
  };
}
function section(id, title, open) {
  const root = el('details', 'cl-r-sec card', null, { 'data-r-sec': id });
  root.open = open;
  const sum = el('summary', 'cl-r-sum');
  sum.appendChild(el('h2', 'cl-r-h', title));
  root.appendChild(sum);
  const body = el('div', 'cl-r-body');
  root.appendChild(body);
  return { root, body };
}

// ================================================================== mount
export function mount(panel, firstApi) {
  if (!document.querySelector('link[data-coreloop-refinery-css]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = 'css/coreloop-refinery.css'; css.dataset.coreloopRefineryCss = '';
    document.head.appendChild(css);
  }
  let api = firstApi;
  const t = (k, p) => api.t(k, p);
  const fmt = (x) => api.fmt(x);
  const act = (fn) => api.act(fn);
  const mat = (field, grade) => t('cl.refinery.material', { field: t(`cl.field.${fieldId(field)}`), grade: grade + 1 });
  const secs = (s) => {
    s = Math.max(0, Math.ceil(s));
    if (s < 60) return t('cl.refinery.time_s', { s });
    if (s < 3600) return t('cl.refinery.time_ms', { m: Math.floor(s / 60), s: s % 60 });
    return api.fmtDuration(s);
  };
  const wide = typeof matchMedia === 'function' && matchMedia('(min-width: 768px)').matches;

  panel.replaceChildren();
  panel.classList.add('cl-refinery');
  const wrap = el('div', 'cl-r-wrap');
  panel.appendChild(wrap);
  const titles = [];   // [node, key] for static text, refreshed in update so a language switch shows

  // ---------------------------------------------------------------- 1. Fraction tower
  const tower = section('tower', '', true);
  titles.push([tower.root.querySelector('.cl-r-h'), 'cl.refinery.sec.tower']);
  tower.body.appendChild(el('p', 'cl-r-note', null, { 'data-t': 'cl.refinery.tower.blurb' }));
  const towerList = el('ol', 'cl-r-tower');
  tower.body.appendChild(towerList);
  const towerRowsUI = keyedList(towerList, (r) => {
    const li = el('li', 'cl-r-frac'), head = el('div', 'cl-r-frac-head');
    const name = el('strong', 'cl-r-frac-name'), value = el('span', 'cl-r-frac-value num'), lvl = el('span', 'chip gold');
    head.append(name, lvl, value);
    const powers = el('div', 'cl-r-sub'), parts = el('div', 'cl-r-sub cl-r-parts num');
    li.append(head, powers, parts);
    return { el: li, update(x) {
      setText(name, t(`cl.frac.${x.id}`));
      setText(value, '×' + fmtMult(fmt, x.value));
      setText(lvl, t('cl.refinery.tower.level', { n: x.level }));
      setText(powers, t(`cl.refinery.powers.${x.id}`));
      setText(parts, t('cl.refinery.tower.parts', { b: x.bubble.toFixed(2), v: x.vial.toFixed(2), c: x.compound.toFixed(2), s: x.seal.toFixed(2) }));
    } };
  });

  // ---------------------------------------------------------------- 2. Orders
  const orders = section('orders', '', true);
  titles.push([orders.root.querySelector('.cl-r-h'), 'cl.name.orders']);
  orders.body.appendChild(el('p', 'cl-r-note', null, { 'data-t': 'cl.refinery.order.reward' }));
  const orderGrid = el('div', 'cl-r-grid');
  orders.body.appendChild(orderGrid);
  const orderListUI = keyedList(orderGrid, (o) => {
    const card = el('div', 'cl-r-card');
    const head = el('div', 'cl-r-card-head'), title = el('strong'), slotChip = el('span', 'chip');
    head.append(title, slotChip);
    const emptyBox = el('div', 'cl-r-empty'), emptyMsg = el('p', 'cl-r-sub');
    emptyBox.appendChild(emptyMsg);
    const fullBox = el('div', 'cl-r-full');
    const ask = el('p', 'cl-r-ask'), bar = makeBar('gold'), have = el('p', 'cl-r-sub num'), value = el('p', 'cl-r-sub num');
    const actRow = el('div', 'cl-r-actions'), need = el('span', 'cl-r-need num');
    const btn = makeBtn(() => { if (act((s, c) => Refinery.fillOrder(s, ref.item.slot, c))) flash(card); });
    actRow.append(btn, need);
    fullBox.append(ask, bar, have, value, actRow);
    card.append(head, emptyBox, fullBox);
    const ref = { el: card, update(x) {
      const v = x.view;
      setText(slotChip, t('cl.refinery.order.slot', { n: x.slot + 1 }));
      setHidden(emptyBox, !v.empty); setHidden(fullBox, v.empty);
      if (v.empty) {
        setText(title, t('cl.name.orders'));
        setText(emptyMsg, v.refillIn > 0 ? t('cl.refinery.order.refill', { time: secs(v.refillIn) }) : t('cl.refinery.order.posts_now'));
        card.classList.remove('is-ready');
        return;
      }
      const m = mat(v.field, v.grade);
      setText(title, t(`cl.frac.${v.fracId}`));
      setText(ask, t('cl.refinery.order.ask', { qty: fmtNum(fmt, v.qty), mat: m }));
      setBar(bar, v.progress);
      setText(have, t('cl.refinery.order.have', { have: fmtNum(fmt, v.have), qty: fmtNum(fmt, v.qty) }));
      setText(value, t('cl.refinery.order.value', { frac: t(`cl.frac.${v.fracId}`), before: fmtMult(fmt, v.before), after: fmtMult(fmt, v.after) }));
      setBtn(btn, v.can, t('cl.refinery.order.fill'));
      setText(need, v.can ? '' : t('cl.refinery.need_more', { n: fmtNum(fmt, v.missing) }));
      card.classList.toggle('is-ready', v.can);
    } };
    return ref;
  });

  // The weekly Order
  const weekly = el('div', 'cl-r-card cl-r-weekly');
  const wHead = el('div', 'cl-r-card-head'), wTitle = el('strong'), wTime = el('span', 'chip');
  wHead.append(wTitle, wTime);
  const wNote = el('p', 'cl-r-sub'), wRowsEl = el('div', 'cl-r-wrows'), wClosed = el('p', 'cl-r-sub');
  const wActs = el('div', 'cl-r-actions'), wValue = el('span', 'cl-r-need num');
  const wBtn = makeBtn(() => { if (act((s, c) => Refinery.fillWeekly(s, c))) flash(weekly); });
  wActs.append(wBtn, wValue);
  weekly.append(wHead, wNote, wRowsEl, wClosed, wActs);
  orders.body.appendChild(weekly);
  const weeklyRows = keyedList(wRowsEl, () => {
    const row = el('div', 'cl-r-wrow'), txt = el('span', 'num'), bar = makeBar('gold'), miss = el('span', 'cl-r-need num');
    row.append(txt, bar, miss);
    return { el: row, update(x) {
      setText(txt, t('cl.refinery.weekly.row', { mat: mat(x.field, x.grade), have: fmtNum(fmt, x.free), qty: fmtNum(fmt, x.qty) }));
      setBar(bar, x.progress);
      setText(miss, x.missing > 0 ? t('cl.refinery.need_more', { n: fmtNum(fmt, x.missing) }) : t('cl.refinery.ready'));
    } };
  });

  // ---------------------------------------------------------------- 3. Brewing Hall
  const hall = section('hall', '', wide);
  titles.push([hall.root.querySelector('.cl-r-h'), 'cl.refinery.sec.hall']);
  hall.body.appendChild(el('p', 'cl-r-note', null, { 'data-t': 'cl.refinery.hall.blurb' }));
  const dallahGrid = el('div', 'cl-r-grid');
  hall.body.appendChild(dallahGrid);
  const dallahs = keyedList(dallahGrid, (d) => {
    const card = el('div', 'cl-r-card');
    const head = el('div', 'cl-r-card-head'), name = el('strong'), spd = el('span', 'chip num');
    head.append(name, spd);
    const fills = el('p', 'cl-r-sub'), bar = makeBar('sand'), eta = el('p', 'cl-r-sub num'), bars = el('p', 'cl-r-sub num'), up = el('p', 'cl-r-sub cl-r-upgrade');
    const actRow = el('div', 'cl-r-actions'), pct = el('span', 'cl-r-need num');
    const btn = makeBtn(() => { if (act((s, c) => Cauldrons.brew(s, ref.item.vat, c))) flash(card); });
    actRow.append(btn, pct);
    card.append(head, fills, bar, eta, bars, up, actRow);
    const ref = { el: card, update(x) {
      const v = x.view;
      setText(name, t(`cl.dallah.${v.id}`));
      setText(spd, t('cl.refinery.hall.speed', { n: v.speed.toFixed(1) }));
      setText(fills, t(`cl.refinery.fills.${v.id}`));
      setBar(bar, v.fill);
      setText(eta, v.eta === 0 ? t('cl.refinery.ready') : v.eta === Infinity
        ? t('cl.refinery.hall.eta_idle', { state: t(`cl.shell.state.${x.presence}`) })
        : t('cl.refinery.hall.eta', { time: secs(v.eta) }));
      setText(bars, t('cl.refinery.hall.bars', { n: v.bars }));
      setText(up, v.upgrade ? t('cl.refinery.hall.next_upgrade') : '');
      setBtn(btn, v.can, t(v.upgrade ? 'cl.refinery.hall.brew_upgrade' : 'cl.refinery.hall.brew_bubble'));
      setText(pct, v.can ? '' : t('cl.refinery.hall.pct', { n: Math.floor(v.fill * 100) }));
      card.classList.toggle('is-ready', v.can);
    } };
    return ref;
  });

  const bubbleBox = el('div', 'cl-r-card');
  bubbleBox.appendChild(el('strong', null, null, { 'data-t': 'cl.refinery.bubbles.title' }));
  const bubbleList = el('ul', 'cl-r-bubbles');
  bubbleBox.appendChild(bubbleList);
  const bubbleRowsUI = keyedList(bubbleList, () => {
    const li = el('li', 'cl-r-bubble'), n = el('span'), v = el('span', 'num');
    li.append(n, v);
    return { el: li, update(x) {
      setText(n, t(`cl.frac.${x.id}`));
      setText(v, t('cl.refinery.bubbles.row', { count: x.count, total: x.total.toFixed(2) }));
    } };
  });
  const lvlMsg = el('p', 'cl-r-sub'), lvlCost = el('p', 'cl-r-sub num');
  const lvlActs = el('div', 'cl-r-actions'), lvlNeed = el('span', 'cl-r-need num');
  const lvlBtn = makeBtn(() => { const i = Cauldrons.lowestBubble(api.state); if (act((s, c) => Cauldrons.levelBubble(s, i, c))) flash(bubbleBox); });
  lvlActs.append(lvlBtn, lvlNeed);
  bubbleBox.append(lvlMsg, lvlCost, lvlActs);
  hall.body.appendChild(bubbleBox);

  // ---------------------------------------------------------------- 4. Vials
  const vials = section('vials', '', wide);
  titles.push([vials.root.querySelector('.cl-r-h'), 'cl.name.vials']);
  vials.body.appendChild(el('p', 'cl-r-note', null, { 'data-t': 'cl.refinery.vials.blurb' }));
  const offersChip = el('p', 'cl-r-offers'), offersNum = el('span', 'chip gold num'), offersHint = el('span', 'cl-r-sub');
  offersChip.append(offersNum, offersHint);
  vials.body.appendChild(offersChip);
  vials.body.appendChild(el('h3', 'cl-r-h3', null, { 'data-t': 'cl.refinery.vials.try_title' }));
  const tryList = el('ul', 'cl-r-rows'), tryNone = el('p', 'cl-r-sub', null, { 'data-t': 'cl.refinery.vials.try_none' });
  vials.body.append(tryList, tryNone);
  const tryUI = keyedList(tryList, () => {
    const li = el('li', 'cl-r-row'), info = el('div', 'cl-r-info'), name = el('strong'), odds = el('span', 'cl-r-sub num');
    info.append(name, odds);
    const btn = makeBtn(() => {
      const r = ref.item;
      if (act((s, c) => Collection.offerVial(s, r.field, r.grade, c))) flash(li);
    });
    li.append(info, btn);
    const ref = { el: li, update(x) {
      setText(name, mat(x.field, x.grade));
      setText(odds, t(x.guaranteed ? 'cl.refinery.vials.sure_now' : 'cl.refinery.vials.odds', { chance: Math.round(x.chance * 100), sure: x.sure, pity: x.pity }));
      setBtn(btn, x.can, x.can || api.state.collection.vialOffers > 0 ? t('cl.refinery.vials.try') : t('cl.refinery.vials.no_offers'));
    } };
    return ref;
  });
  vials.body.appendChild(el('h3', 'cl-r-h3', null, { 'data-t': 'cl.refinery.vials.owned_title' }));
  const ownList = el('ul', 'cl-r-rows'), ownNone = el('p', 'cl-r-sub', null, { 'data-t': 'cl.refinery.vials.owned_none' });
  vials.body.append(ownList, ownNone);
  const ownUI = keyedList(ownList, () => {
    const li = el('li', 'cl-r-row'), info = el('div', 'cl-r-info'), name = el('strong'), tier = el('span', 'tag tier'), cost = el('span', 'cl-r-sub num');
    const head = el('div', 'cl-r-inline'); head.append(name, tier);
    info.append(head, cost);
    const btn = makeBtn(() => { const k = ref.item.key; if (act((s, c) => Collection.upgradeVial(s, k, c))) flash(li); });
    li.append(info, btn);
    const ref = { el: li, update(x) {
      setText(name, mat(x.field, x.grade));
      setText(tier, t('cl.refinery.vials.tier', { n: x.tier, name: t(`cl.refinery.tier.${x.tierId}`) }));
      const top = x.cost === null;
      setText(cost, top ? '' : t('cl.refinery.vials.upgrade_cost', { cost: t('cl.refinery.oasis_units', { n: fmtNum(fmt, x.cost) }), have: fmtNum(fmt, Fields.countAtLeast(api.state, FIELD.OASIS, 0)) }));
      setBtn(btn, x.can, top ? t('cl.refinery.vials.top') : x.can ? t('cl.refinery.vials.upgrade') : t('cl.refinery.vials.upgrade') + ' · ' + t('cl.refinery.need_more', { n: fmtNum(fmt, x.missing) }));
    } };
    return ref;
  });

  // ---------------------------------------------------------------- 5. Mixer
  const mixer = section('mixer', '', wide);
  titles.push([mixer.root.querySelector('.cl-r-h'), 'cl.name.mixer']);
  mixer.body.appendChild(el('p', 'cl-r-note', null, { 'data-t': 'cl.refinery.mixer.blurb' }));
  const noneHeld = el('p', 'cl-r-sub', null, { 'data-t': 'cl.refinery.mixer.none_held' });
  const pickers = el('div', 'cl-r-pickers');
  const mkPicker = (labelKey) => {
    const box = el('label', 'cl-r-pick'), lab = el('span', 'cl-r-sub', null, { 'data-t': labelKey });
    const sel = el('select', 'cl-r-select'), hint = el('span', 'cl-r-sub num');
    box.append(lab, sel, hint);
    return { box, sel, hint };
  };
  const pickA = mkPicker('cl.refinery.mixer.pick_a'), pickB = mkPicker('cl.refinery.mixer.pick_b');
  pickers.append(pickA.box, pickB.box);
  const mixActs = el('div', 'cl-r-actions'), mixMsg = el('p', 'cl-r-mixmsg', null, { role: 'status' });
  mixMsg.hidden = true;
  const say = (text) => { setText(mixMsg, text); setHidden(mixMsg, false); flash(mixMsg); };
  const mixBtn = makeBtn(() => {
    const a = parsePick(pickA.sel.value), b = parsePick(pickB.sel.value);
    if (!a || !b) return;
    const res = mixResult(api.state, a, b);
    if (res.kind === 'none') { say(t('cl.refinery.mixer.result_none')); return; }
    if (res.kind === 'known') { say(t('cl.refinery.mixer.result_known')); return; }
    if (act((s, c) => Collection.discover(s, res.index, c))) {
      say(t('cl.refinery.mixer.result_new', { name: t('cl.refinery.compound.name', { n: res.index + 1 }) }));
      flash(mixer.root);
    } else say(t('cl.refinery.mixer.result_none'));
  });
  mixActs.appendChild(mixBtn);
  mixer.body.append(noneHeld, pickers, mixActs, mixMsg);
  const parsePick = (v) => { const m = /^(\d+):(\d+)$/.exec(v || ''); return m ? { field: +m[1], grade: +m[2] } : null; };
  let heldSig = null;
  function syncPicker(p, held, keep) {
    p.sel.replaceChildren();
    for (const m of held) {
      const o = el('option', null, '', { value: m.key });
      o.dataset.field = m.field; o.dataset.grade = m.grade;
      p.sel.appendChild(o);
    }
    if (keep && held.some(m => m.key === keep)) p.sel.value = keep;
  }
  function updatePicker(p, held) {
    for (const o of p.sel.options) {
      const m = held.find(h => h.key === o.value);
      if (m) setText(o, t('cl.refinery.mixer.option', { mat: mat(m.field, m.grade), n: fmtNum(fmt, m.units) }));
    }
    const pick = parsePick(p.sel.value);
    setText(p.hint, pick ? t('cl.refinery.mixer.hint', { n: Collection.recipesUsing(api.state, pick.field, pick.grade) }) : '');
  }
  pickA.sel.addEventListener('change', () => update(api));
  pickB.sel.addEventListener('change', () => update(api));

  const foundTitle = el('h3', 'cl-r-h3'), compList = el('ul', 'cl-r-rows'), compNone = el('p', 'cl-r-sub', null, { 'data-t': 'cl.refinery.compound.none' });
  mixer.body.append(foundTitle, compList, compNone);
  const compUI = keyedList(compList, () => {
    const li = el('li', 'cl-r-row'), info = el('div', 'cl-r-info'), name = el('strong'), tier = el('span', 'tag tier'), recipe = el('span', 'cl-r-sub num'), cost = el('span', 'cl-r-sub num');
    const head = el('div', 'cl-r-inline'); head.append(name, tier);
    info.append(head, recipe, cost);
    const btn = makeBtn(() => { const i = ref.item.index; if (act((s, c) => Collection.remake(s, i, c))) flash(li); });
    li.append(info, btn);
    const ref = { el: li, update(x) {
      setText(name, t('cl.refinery.compound.name', { n: x.index + 1 }));
      setText(tier, t(`cl.refinery.tier.${x.tierId}`));
      setText(recipe, t('cl.refinery.compound.recipe', { a: mat(x.a.field, x.a.grade), b: mat(x.b.field, x.b.grade) }) + ' · ' + t('cl.refinery.compound.made', { n: x.made }));
      setText(cost, x.top ? t('cl.refinery.compound.top') : t('cl.refinery.compound.remake_cost', { a: fmtNum(fmt, x.cost.a), b: fmtNum(fmt, x.cost.b) }));
      setBtn(btn, x.can, t('cl.refinery.compound.remake'));
    } };
    return ref;
  });

  wrap.append(tower.root, orders.root, hall.root, vials.root, mixer.root);

  // ---------------------------------------------------------------- update
  function update(nextApi) {
    api = nextApi;
    const s = api.state;
    for (const [n, k] of titles) setText(n, t(k));
    for (const n of panel.querySelectorAll('[data-t]')) setText(n, t(n.dataset.t));

    towerRowsUI.set(towerRows(s));

    orderListUI.set(s.refinery.orders.map((_, slot) => ({ key: 's' + slot, slot, view: orderView(s, slot) })));
    const w = weeklyView(s);
    setText(wTitle, t('cl.name.weekly'));
    setText(wTime, secs(w.secondsToNextWeek));
    setText(wNote, t('cl.refinery.weekly.blurb'));
    setHidden(wRowsEl, !w.open); setHidden(wClosed, w.open); setHidden(wActs, !w.open);
    setText(wClosed, t('cl.refinery.weekly.closed', { time: secs(w.secondsToNextWeek) }));
    weeklyRows.set(w.rows.map(r => ({ key: 'f' + r.field, ...r })));
    setBtn(wBtn, w.can, t('cl.refinery.weekly.fill'));
    setText(wValue, w.open ? t('cl.refinery.weekly.value', { n: P.orderMult.toFixed(3) }) : '');
    weekly.classList.toggle('is-ready', w.can);

    const presence = api.presence();
    dallahs.set(s.cauldrons.vats.map((_, vat) => ({ key: 'v' + vat, vat, presence, view: cauldronView(s, vat, presence) })));
    bubbleRowsUI.set(bubbleRows(s).map(r => ({ key: r.id, ...r })));
    const lv = levelView(s);
    setHidden(lvlActs, !lv); setHidden(lvlCost, !lv);
    if (!lv) { setText(lvlMsg, t('cl.refinery.bubbles.none')); }
    else {
      setText(lvlMsg, t('cl.refinery.bubbles.level_detail', { frac: t(`cl.frac.${lv.fracId}`), from: lv.level, to: lv.level + 1 }));
      setText(lvlCost, t('cl.refinery.bubbles.cost', { cost: t('cl.refinery.oasis_units', { n: fmtNum(fmt, lv.cost) }), have: fmtNum(fmt, lv.have) }));
      setBtn(lvlBtn, lv.can, t('cl.refinery.bubbles.level'));
      setText(lvlNeed, lv.can ? '' : t('cl.refinery.need_more', { n: fmtNum(fmt, lv.missing) }));
    }

    setText(offersNum, t('cl.refinery.vials.offers', { n: Collection.vialOffers(s) }));
    setText(offersHint, t('cl.refinery.vials.offers_hint'));
    const tries = vialTryRows(s);
    tryUI.set(tries);
    setHidden(tryNone, tries.length > 0);
    const owned = ownedVials(s);
    ownUI.set(owned);
    setHidden(ownNone, owned.length > 0);

    const held = heldMaterials(s);
    const sig = held.map(m => m.key).join('|');
    if (sig !== heldSig) {
      const ka = pickA.sel.value, kb = pickB.sel.value;
      syncPicker(pickA, held, ka); syncPicker(pickB, held, kb);
      if (!kb || !held.some(m => m.key === kb)) { if (held.length > 1) pickB.sel.selectedIndex = 1; }
      heldSig = sig;
    }
    updatePicker(pickA, held); updatePicker(pickB, held);
    setHidden(noneHeld, held.length > 0); setHidden(pickers, held.length === 0); setHidden(mixActs, held.length === 0);
    setBtn(mixBtn, held.length > 0 && !!parsePick(pickA.sel.value) && !!parsePick(pickB.sel.value), t('cl.refinery.mixer.mix'));
    const comps = compoundRows(s);
    setText(foundTitle, t('cl.refinery.compound.found_title', { n: comps.length, total: Collection.recipeCount(s) }));
    compUI.set(comps);
    setHidden(compNone, comps.length > 0);
  }

  update(api);
  return { update };
}
