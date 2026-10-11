// Core-loop Refinery screen (docs/core-loop-plan.md CL-15, CL-31, CL-41), behind ?loop=2.
// It opens with one "ready now" strip (what can be collected or filled, one button), then the
// Orders as three-line cards, then the later parts as folded sections with a one-line status:
// Fractions, Vials, the Friday order, the Brewing Hall and the Mixer. The later parts appear one at
// a time as the guide opens them (api.isOpen). It reads the systems only through their functions and
// acts only through api.act with the systems' own actions, enabled only when the system's can…
// function says so. No countdown is shown anywhere: an empty Order slot shows what the crew has
// hauled toward the next one.
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
import * as Guide from '../../systems/coreloop/Guide.js';
import { materialName } from './fields.js';

registerStrings(EN, AR);

// ================================================================== pure view models
export const fieldId = (field) => P.fields[field];

// Short numbers: one decimal under 10, whole numbers up to 10 000, then through BigNum
export function fmtNum(fmt, x) {
  if (!Number.isFinite(x)) return '∞';
  if (x < 10) return String(Math.round(x * 10) / 10);
  return fmt(x < 1e4 ? Math.round(x) : BigNum.from(x));
}
// A count of Materials: whole numbers under 10 000. `up` rounds up (what is asked), else down (what
// is held), so "you have 45" never sits beside an Order for 45 that cannot be filled.
export function fmtWhole(fmt, x, up = false) {
  if (!Number.isFinite(x)) return '∞';
  const n = up ? Math.ceil(x - 1e-9) : Math.floor(x + 1e-9);
  return n < 1e4 ? String(Math.max(0, n)) : fmt(BigNum.from(n));
}
// A multiplier: two decimals while small
export const fmtMult = (fmt, x) => (x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : fmtNum(fmt, x));
// "+1.5%" for a Fraction under x2, "x2.40" past it
export const round1 = (x) => Math.round(x * 10) / 10;
export const pctOf = (mult) => round1((mult - 1) * 100);
export const fracText = (fmt, v) => (v < 2 ? '+' + pctOf(v) + '%' : '×' + fmtMult(fmt, v));

// The percent one filled Order adds to a Fraction (1.5 for orderMult 1.015)
export const orderPct = () => pctOf(P.orderMult);

// The Fractions row. `isOpen(feature)` is the guide's: a part is listed only when its feature is open.
// `raised` is false while nothing at all has raised the Fraction (it still reads x1).
export function fractionRows(state, isOpen = () => true) {
  return FRACTIONS.map((id, i) => {
    const f = state.refinery.frac[i];
    const value = fracValue(state, i);
    const mult = Math.pow(P.orderMult, f.level);
    const parts = [{ kind: 'orders', level: f.level, mult, pct: pctOf(mult) }];
    if (isOpen('refinery.cauldrons')) parts.push({ kind: 'bubbles', pct: Math.round(f.bubble * 100) });
    if (isOpen('refinery.vials')) parts.push({ kind: 'vials', pct: Math.round(f.vial * 100) });
    if (isOpen('refinery.mixer')) parts.push({ kind: 'compounds', pct: Math.round(f.compound * 100) });
    if (isOpen('prestige.seals')) parts.push({ kind: 'seals', pct: Math.round(f.seal * 100) });
    return { key: id, id, index: i, value, raised: value > 1 + 1e-9, level: f.level, parts };
  });
}

// Which later sections show, and the one closed section to hint at (the first closed, in order)
export const LATER = Object.freeze(['refinery.vials', 'refinery.weekly', 'refinery.cauldrons', 'refinery.mixer']);
export function sectionsView(isOpen) {
  const open = LATER.filter(f => isOpen(f));
  return { open, lock: LATER.find(f => !isOpen(f)) || null };
}

// How many Orders can be filled right now
export const fillableCount = (state) => state.refinery.orders.reduce((n, _, i) => n + (Refinery.canFillOrder(state, i) ? 1 : 0), 0);
// Where data-guide="refinery.order" goes: the first Order that can be filled, else the first
export function anchorSlot(state) {
  const n = state.refinery.orders.length;
  for (let i = 0; i < n; i++) if (Refinery.canFillOrder(state, i)) return i;
  return n > 0 ? 0 : -1;
}

// What an Order slot shows (see Refinery.orderInfo), with ids in place of names. An empty slot shows
// the haul toward the next Order (never a countdown).
export function orderView(state, slot) {
  const o = Refinery.orderInfo(state, slot);
  if (!o) return null;
  if (o.empty) return { empty: true, hauled: o.hauled, need: o.need, progress: Math.max(0, Math.min(1, o.progress)) };
  return {
    empty: false, fracId: FRACTIONS[o.frac], field: o.field, fieldId: fieldId(o.field), grade: o.grade, qty: o.qty,
    have: o.have, progress: o.progress, missing: Math.max(0, o.qty - o.have), before: o.before, after: o.after,
    pct: orderPct(), can: Refinery.canFillOrder(state, slot)
  };
}

// The closest Order the player is short of: { missing, field, grade }; { empty: true } when only
// empty slots remain; null when there are no slots
export function nextHint(state) {
  let best = null, anyEmpty = false;
  state.refinery.orders.forEach((o, i) => {
    if (o.empty) { anyEmpty = true; return; }
    const info = Refinery.orderInfo(state, i);
    const missing = Math.ceil(info.qty - info.have - 1e-9);
    if (missing > 0 && (!best || missing < best.missing)) best = { missing, field: info.field, grade: info.grade };
  });
  return best || (anyEmpty ? { empty: true } : null);
}

// What the "ready now" strip shows: Orders that can be filled, the Friday order, Dallahs that can
// brew (the last two only when their section is open, so a closed part is never named)
export function readyView(state, isOpen = (f) => Guide.isOpen(state, f)) {
  const orders = fillableCount(state);
  const weekly = isOpen('refinery.weekly') && Refinery.canFillWeekly(state) ? 1 : 0;
  const dallahs = isOpen('refinery.cauldrons') ? state.cauldrons.vats.reduce((n, _, v) => n + (Cauldrons.canBrew(state, v) ? 1 : 0), 0) : 0;
  return { orders, weekly, dallahs, count: orders + weekly + dallahs, next: nextHint(state) };
}
// The tab dot: things this screen has ready (the shell asks, without mounting the screen)
export const readyCount = (state) => readyView(state).count;

// Which button is the solid gold one (R3): the Order card the bar names, when the bar's goal is that
// Order and it can be filled; nothing else is solid then. Otherwise the strip's button when something
// is ready. `goal` is api.goal(); `cardCan` is whether the anchor card can be filled.
export function goldTarget(goal, ready, cardCan) {
  if (goal && goal.here && goal.anchor === 'refinery.order') return cardCan ? 'card' : null;
  return ready > 0 ? 'strip' : null;
}

// The weekly Order: each Field's row counts only what open Orders don't already hold
export function weeklyView(state) {
  const w = Refinery.weeklyInfo(state);
  return {
    open: w.open, can: w.ready,
    rows: w.open ? w.need.map(n => {
      const free = Math.max(0, n.have - n.reserved);
      return { field: n.field, fieldId: fieldId(n.field), grade: n.grade, qty: n.qty, free, progress: Math.min(1, free / n.qty), missing: Math.max(0, n.qty - free) };
    }) : []
  };
}

// A Dallah: fill 0..1 (never a time: how full it is says enough)
export function cauldronView(state, vat) {
  const c = state.cauldrons.vats[vat];
  return {
    vat, id: P.cauldrons[vat], fill: Cauldrons.fillFraction(state, vat),
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

// Materials held that have no Vial yet, with the odds shown. `total` is the try that is sure.
export function vialTryRows(state) {
  return heldMaterials(state).filter(m => Collection.vialTier(state, m.key) === 0).map(m => {
    const odds = Collection.vialOdds(state, m.key);
    const sure = Math.max(1, odds.triesToGuarantee);
    return { ...m, fieldId: fieldId(m.field), chance: odds.chance, pity: odds.pity, guaranteed: odds.guaranteed, sure, total: odds.pity + sure, can: Collection.canOfferVial(state, m.field, m.grade) };
  });
}
// The chance in words: "3 in 10" when it is a whole number of tenths, else a percent
export function chanceWords(chance) {
  const tenth = Math.round(chance * 10);
  return Math.abs(chance * 10 - tenth) < 1e-6 ? { kind: 'in10', n: tenth } : { kind: 'pct', n: Math.round(chance * 100) };
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
// A button that can be pressed is a gold outline (btn-ready); the one solid gold button of the
// screen is chosen once per update (see goldTarget). Otherwise a locked look with aria-disabled.
function setBtn(btn, can, label) {
  setText(btn, label);
  btn.classList.remove('btn-primary');
  btn.classList.toggle('btn-ready', can);
  btn.classList.toggle('is-locked', !can);
  btn.setAttribute('aria-disabled', String(!can));
}
function makeGold(btn, on) {
  btn.classList.toggle('btn-primary', on);
  if (on) btn.classList.remove('btn-ready');
}
function makeBtn(onClick, cls) {
  const b = el('button', 'btn cl-r-btn' + (cls ? ' ' + cls : ''), '', { type: 'button', 'aria-disabled': 'true' });
  b.addEventListener('click', () => { if (b.getAttribute('aria-disabled') !== 'true') onClick(b); });
  return b;
}
function makeBar(cls) { const b = el('div', 'bar ' + (cls || '')); b.appendChild(el('i')); return b; }
// A short confirmation on the element that was acted on
function flash(node, cls = 'cl-r-flash') {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}
// A list that is rebuilt only when its keys change; otherwise rows just update
function keyedList(parent, make) {
  let sig = null, rows = [];
  return {
    get rows() { return rows; },
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
// A short highlight on a number that changed (not on its first draw)
function pop(node) {
  node.classList.remove('cl-r-pop');
  void node.offsetWidth;
  node.classList.add('cl-r-pop');
}
function setNum(node, text) {
  if (node.textContent === text) return;
  const had = node.textContent !== '';
  node.textContent = text;
  if (had) pop(node);
}
// A plain card that is always open: a title and a body
function plain() {
  const root = el('section', 'cl-r-sec card cl-r-plain');
  const title = el('h2', 'cl-r-h cl-r-h-plain');
  const body = el('div', 'cl-r-body cl-r-body-plain');
  root.append(title, body);
  return { root, title, body };
}
// A folded section: a title and a one-line status; the body opens on a tap
function section(id) {
  const root = el('details', 'cl-r-sec card', null, { 'data-r-sec': id });
  const sum = el('summary', 'cl-r-sum');
  const left = el('span', 'cl-r-sumtext');
  const title = el('h2', 'cl-r-h'), status = el('span', 'cl-r-status');
  left.append(title, status);
  sum.appendChild(left);
  root.appendChild(sum);
  const body = el('div', 'cl-r-body');
  root.appendChild(body);
  return { root, body, title, status };
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
  const mat = (field, grade) => materialName(field, grade);
  const plural = (key, n) => t(`${key}_${n === 1 ? 'one' : 'other'}`, { n });
  const oasisUnits = (n) => t('cl.refinery.units', { n: fmtNum(fmt, n), material: t('cl.material.oasis') });

  panel.replaceChildren();
  panel.classList.add('cl-refinery');
  const wrap = el('div', 'cl-r-wrap');
  panel.appendChild(wrap);
  const titles = [];   // [node, () => text], refreshed in update so a language switch shows

  // A short line after an action, in the strip, that goes away by itself
  let msgText = '', msgUntil = 0, msgWell = false, msgTimer = null;
  const say = (text, well = false) => {
    msgText = text; msgWell = well; msgUntil = Date.now() + 6000;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => update(api), 6100);
    update(api);
  };
  const fractionsBefore = () => FRACTIONS.map((_, i) => fracValue(api.state, i));
  const fracRefs = {};   // id -> value node, for the brief highlight after a fill
  function flashFracs(before, index) {
    if (index != null && index >= 0 && fracRefs[FRACTIONS[index]]) pop(fracRefs[FRACTIONS[index]]);
    if (before) FRACTIONS.forEach((id, i) => { if (fracValue(api.state, i) !== before[i] && fracRefs[id]) pop(fracRefs[id]); });
  }

  // ---------------------------------------------------------------- 0. Ready now (always)
  const strip = el('section', 'cl-r-ready card cl-reserve', null, { 'aria-live': 'polite' });
  const stripTitle = el('p', 'cl-r-ready-title'), stripSub = el('p', 'cl-r-sub');
  const stripActs = el('div', 'cl-r-actions cl-pair');
  const stripBtn = makeBtn(() => {
    const before = fractionsBefore();
    let n = 0;
    act((s, c) => {
      if (Refinery.fillWeekly(s, c)) n++;
      n += Refinery.fillAll(s, c);
      s.cauldrons.vats.forEach((_, v) => { if (Cauldrons.brew(s, v, c)) n++; });
      return n > 0;
    });
    if (n > 0) { flashFracs(before); say(t('cl.refinery.ready.done')); }
  });
  const wellBtn = makeBtn(() => api.go('well'), 'cl-r-quiet');
  stripActs.append(stripBtn, wellBtn);
  strip.append(stripTitle, stripSub, stripActs);

  // ---------------------------------------------------------------- 1. Orders (always)
  const orders = plain();
  titles.push([orders.title, () => t('cl.name.orders')]);
  const orderGrid = el('div', 'cl-r-grid');
  orders.body.append(orderGrid);
  const orderBtns = {};   // slot -> its Fill button
  const orderListUI = keyedList(orderGrid, (o) => {
    const card = el('div', 'cl-r-card cl-r-order');
    const title = el('strong', 'cl-r-card-title');
    const emptyBox = el('div', 'cl-r-empty'), emptyMsg = el('p', 'cl-r-ask'), emptyBar = makeBar('sand');
    emptyBox.append(emptyMsg, emptyBar);
    const fullBox = el('div', 'cl-r-full');
    const ask = el('p', 'cl-r-ask'), what = el('strong', 'cl-r-qty num'), have = el('span', 'cl-r-have num');
    ask.append(what, ' ', have);
    const bar = makeBar('gold'), gives = el('p', 'cl-r-sub cl-r-gives');
    const goBtn = makeBtn(() => api.go('fields'), 'cl-r-quiet');
    const actRow = el('div', 'cl-r-actions cl-pair'), need = el('span', 'cl-r-need num');
    const btn = makeBtn(() => {
      const v = ref.item.view;
      const before = fractionsBefore();
      if (act((s, c) => Refinery.fillOrder(s, ref.item.slot, c))) {
        flash(card);
        flashFracs(before, FRACTIONS.indexOf(v.fracId));
        say(t('cl.refinery.order.done', { frac: t(`cl.frac.${v.fracId}`), what: t(`cl.refinery.speeds.${v.fracId}`), pct: v.pct }), v.fracId === 'naphtha');
      }
    });
    orderBtns[o.slot] = btn;
    actRow.append(btn, goBtn);
    fullBox.append(ask, bar, gives, actRow, need);
    card.append(title, emptyBox, fullBox);
    const ref = { el: card, update(x) {
      const v = x.view;
      setHidden(emptyBox, !v.empty); setHidden(fullBox, v.empty);
      if (x.anchor) card.setAttribute('data-guide', 'refinery.order'); else card.removeAttribute('data-guide');
      if (v.empty) {
        setHidden(title, true);
        setText(emptyMsg, v.progress >= 1 ? t('cl.refinery.order.posts_now') : t('cl.refinery.order.next_haul', { hauled: fmtWhole(fmt, v.hauled), need: fmtWhole(fmt, v.need, true) }));
        setBar(emptyBar, v.progress);
        card.classList.remove('is-ready');
        return;
      }
      const frac = t(`cl.frac.${v.fracId}`);
      setHidden(title, false);
      setText(title, t('cl.refinery.order.title', { frac }));
      setText(what, t('cl.refinery.order.ask', { qty: fmtWhole(fmt, v.qty, true), material: mat(v.field, v.grade) }));
      setNum(have, t('cl.refinery.order.have', { have: fmtWhole(fmt, v.have) }));
      setBar(bar, v.progress);
      setText(gives, t('cl.refinery.order.gives', { what: t(`cl.refinery.speeds.${v.fracId}`), pct: v.pct }));
      setHidden(goBtn, v.can || !api.isOpen('tab.fields'));
      setText(goBtn, t('cl.refinery.order.go'));
      setBtn(btn, v.can, t('cl.refinery.order.fill'));
      setHidden(btn, !v.can);
      setText(need, v.can ? '' : t('cl.refinery.need_more', { n: fmtWhole(fmt, v.missing, true) }));
      card.classList.toggle('is-ready', v.can);
    } };
    return ref;
  });

  // ---------------------------------------------------------------- 2. Your Fractions (folded)
  const fracs = section('fractions');
  titles.push([fracs.title, () => t('cl.refinery.sec.fractions')]);
  fracs.body.appendChild(el('p', 'cl-r-note', null, { 'data-t': 'cl.refinery.fractions.blurb' }));
  const fracList = el('ol', 'cl-r-tower');
  fracs.body.appendChild(fracList);
  const fracUI = keyedList(fracList, (r) => {
    const li = el('li', 'cl-r-frac');
    const head = el('button', 'cl-r-fhead', '', { type: 'button', 'aria-expanded': 'false' });
    const left = el('span', 'cl-r-fleft'), name = el('strong', 'cl-r-frac-name'), powers = el('span', 'cl-r-sub');
    left.append(name, powers);
    const value = el('span', 'cl-r-frac-value num');
    head.append(left, value);
    const body = el('div', 'cl-r-fbody'), partsUl = el('ul', 'cl-r-parts');
    body.hidden = true;
    const partLis = {};
    for (const k of ['orders', 'bubbles', 'vials', 'compounds', 'seals']) { partLis[k] = el('li'); partsUl.appendChild(partLis[k]); }
    body.appendChild(partsUl);
    head.addEventListener('click', () => { body.hidden = !body.hidden; head.setAttribute('aria-expanded', String(!body.hidden)); });
    li.append(head, body);
    fracRefs[r.id] = value;
    return { el: li, update(x) {
      setText(name, t(`cl.frac.${x.id}`));
      setText(powers, t(`cl.refinery.powers.${x.id}`));
      setNum(value, x.raised ? fracText(fmt, x.value) : t('cl.refinery.frac.unraised'));
      value.classList.toggle('is-dim', !x.raised);
      const shown = new Set(x.parts.map(p => p.kind));
      for (const k of Object.keys(partLis)) setHidden(partLis[k], !shown.has(k));
      for (const p of x.parts) {
        setText(partLis[p.kind], p.kind === 'orders'
          ? t('cl.refinery.part.orders', { n: p.level, pct: p.pct })
          : t(`cl.refinery.part.${p.kind}`, { pct: p.pct }));
      }
    } };
  });

  // ---------------------------------------------------------------- 3. Vials (when open)
  const vials = section('vials');
  titles.push([vials.title, () => t('cl.name.vials')]);
  vials.body.appendChild(el('p', 'cl-r-note', null, { 'data-t': 'cl.refinery.vials.blurb' }));
  const offersChip = el('p', 'cl-r-offers'), offersNum = el('span', 'chip num'), offersHint = el('span', 'cl-r-sub');
  offersChip.append(offersNum, offersHint);
  vials.body.appendChild(offersChip);
  vials.body.appendChild(el('h3', 'cl-r-h3', null, { 'data-t': 'cl.refinery.vials.try_title' }));
  const tryList = el('ul', 'cl-r-rows'), tryNone = el('p', 'cl-r-sub', null, { 'data-t': 'cl.refinery.vials.try_none' });
  vials.body.append(tryList, tryNone);
  const missed = {};   // key -> pity at the miss, so the line stays until the odds change
  const tryUI = keyedList(tryList, () => {
    const li = el('li', 'cl-r-row'), info = el('div', 'cl-r-info'), name = el('strong'), odds = el('span', 'cl-r-sub num');
    info.append(name, odds);
    const btn = makeBtn(() => {
      const r = ref.item;
      let res = null;
      act((s, c) => { res = Collection.offerVial(s, r.field, r.grade, c); return !!res; });
      if (!res) return;
      if (res.unlocked) flash(li);
      else {
        missed[r.key] = res.pity;
        flash(li, 'cl-r-shake');
        update(api);
      }
    });
    li.append(info, btn);
    const ref = { el: li, update(x) {
      setText(name, mat(x.field, x.grade));
      const miss = missed[x.key] !== undefined && missed[x.key] === x.pity && x.pity > 0;
      if (miss) setText(odds, t('cl.refinery.vials.miss', { k: x.pity + 1, total: x.total }));
      else {
        const c = chanceWords(x.chance);
        const chance = t(c.kind === 'in10' ? 'cl.refinery.vials.chance_in10' : 'cl.refinery.vials.chance_pct', { n: c.n });
        const tail = x.guaranteed ? t('cl.refinery.vials.sure_now') : x.pity > 0 ? t('cl.refinery.vials.try_of', { k: x.pity + 1, total: x.total }) : t('cl.refinery.vials.sure_by', { total: x.total });
        setText(odds, chance + ' ' + tail);
      }
      odds.classList.toggle('is-miss', miss);
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
      setText(cost, top ? '' : t('cl.refinery.vials.upgrade_cost', { cost: oasisUnits(x.cost), have: fmtWhole(fmt, Fields.countAtLeast(api.state, FIELD.OASIS, 0)) }));
      setBtn(btn, x.can, top ? t('cl.refinery.vials.top') : x.can ? t('cl.refinery.vials.upgrade') : t('cl.refinery.vials.upgrade') + ' · ' + t('cl.refinery.need_more', { n: fmtWhole(fmt, x.missing, true) }));
    } };
    return ref;
  });

  // ---------------------------------------------------------------- 4. The Friday order (when open)
  const weeklySec = section('weekly');
  titles.push([weeklySec.title, () => t('cl.refinery.sec.named', { name: t('cl.name.weekly'), gloss: t('cl.name.weekly.gloss') })]);
  weeklySec.body.appendChild(el('p', 'cl-r-note', null, { 'data-t': 'cl.refinery.weekly.blurb' }));
  const weekly = el('div', 'cl-r-card cl-r-weekly');
  const wOpen = el('p', 'cl-r-sub');
  const wRowsEl = el('div', 'cl-r-wrows'), wClosed = el('p', 'cl-r-sub');
  const wActs = el('div', 'cl-r-actions'), wValue = el('span', 'cl-r-need num');
  const wBtn = makeBtn(() => {
    const before = fractionsBefore();
    if (act((s, c) => Refinery.fillWeekly(s, c))) { flash(weekly); flashFracs(before); say(t('cl.refinery.weekly.done')); }
  });
  wActs.append(wBtn, wValue);
  weekly.append(wOpen, wRowsEl, wClosed, wActs);
  weeklySec.body.appendChild(weekly);
  const weeklyRows = keyedList(wRowsEl, () => {
    const row = el('div', 'cl-r-wrow'), txt = el('span', 'num'), bar = makeBar('gold'), miss = el('span', 'cl-r-need num');
    row.append(txt, bar, miss);
    return { el: row, update(x) {
      setText(txt, t('cl.refinery.weekly.row', { mat: mat(x.field, x.grade), have: fmtWhole(fmt, x.free), qty: fmtWhole(fmt, x.qty, true) }));
      setBar(bar, x.progress);
      setText(miss, x.missing > 0 ? t('cl.refinery.need_more', { n: fmtWhole(fmt, x.missing, true) }) : t('cl.refinery.ready'));
    } };
  });

  // ---------------------------------------------------------------- 5. Brewing Hall
  const hall = section('hall');
  titles.push([hall.title, () => t('cl.refinery.sec.hall')]);
  hall.body.appendChild(el('p', 'cl-r-note', null, { 'data-t': 'cl.refinery.hall.blurb' }));
  const dallahGrid = el('div', 'cl-r-grid');
  hall.body.appendChild(dallahGrid);
  const dallahs = keyedList(dallahGrid, () => {
    const card = el('div', 'cl-r-card');
    const head = el('div', 'cl-r-card-head'), name = el('strong'), spd = el('span', 'chip num');
    head.append(name, spd);
    const fills = el('p', 'cl-r-sub'), bar = makeBar('sand'), bars = el('p', 'cl-r-sub num'), up = el('p', 'cl-r-sub cl-r-upgrade');
    const actRow = el('div', 'cl-r-actions'), pct = el('span', 'cl-r-need num');
    const btn = makeBtn(() => { if (act((s, c) => Cauldrons.brew(s, ref.item.vat, c))) flash(card); });
    actRow.append(btn, pct);
    card.append(head, fills, bar, bars, up, actRow);
    const ref = { el: card, btn, update(x) {
      const v = x.view;
      setText(name, t(`cl.dallah.${v.id}`));
      setText(spd, t('cl.refinery.hall.speed', { n: v.speed.toFixed(1) }));
      setText(fills, t(`cl.refinery.fills.${v.id}`));
      setBar(bar, v.fill);
      setText(bars, t('cl.refinery.hall.bars', { n: v.bars }));
      setText(up, v.upgrade ? t('cl.refinery.hall.next_upgrade') : '');
      setBtn(btn, v.can, t(v.upgrade ? 'cl.refinery.hall.brew_upgrade' : 'cl.refinery.hall.brew_bubble'));
      setHidden(btn, !v.can);
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
      setText(v, t('cl.refinery.bubbles.row', { count: x.count, total: Math.round(x.total * 100) }));
    } };
  });
  const lvlMsg = el('p', 'cl-r-sub'), lvlCost = el('p', 'cl-r-sub num');
  const lvlActs = el('div', 'cl-r-actions'), lvlNeed = el('span', 'cl-r-need num');
  const lvlBtn = makeBtn(() => { const i = Cauldrons.lowestBubble(api.state); if (act((s, c) => Cauldrons.levelBubble(s, i, c))) flash(bubbleBox); });
  lvlActs.append(lvlBtn, lvlNeed);
  bubbleBox.append(lvlMsg, lvlCost, lvlActs);
  hall.body.appendChild(bubbleBox);

  // ---------------------------------------------------------------- 6. Mixer
  const mixer = section('mixer');
  titles.push([mixer.title, () => t('cl.refinery.sec.named', { name: t('cl.name.mixer'), gloss: t('cl.name.mixer.gloss') })]);
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
  const mixSay = (text) => { setText(mixMsg, text); setHidden(mixMsg, false); flash(mixMsg); };
  const mixBtn = makeBtn(() => {
    const a = parsePick(pickA.sel.value), b = parsePick(pickB.sel.value);
    if (!a || !b) return;
    const res = mixResult(api.state, a, b);
    if (res.kind === 'none') { mixSay(t('cl.refinery.mixer.result_none')); return; }
    if (res.kind === 'known') { mixSay(t('cl.refinery.mixer.result_known')); return; }
    if (act((s, c) => Collection.discover(s, res.index, c))) {
      mixSay(t('cl.refinery.mixer.result_new', { name: t('cl.refinery.compound.name', { n: res.index + 1 }) }));
      flash(mixer.root);
    } else mixSay(t('cl.refinery.mixer.result_none'));
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
      if (m) setText(o, t('cl.refinery.mixer.option', { mat: mat(m.field, m.grade), n: fmtWhole(fmt, m.units) }));
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
      setText(cost, x.top ? t('cl.refinery.compound.top') : t('cl.refinery.compound.remake_cost', { a: fmtWhole(fmt, x.cost.a, true), b: fmtWhole(fmt, x.cost.b, true) }));
      setBtn(btn, x.can, t('cl.refinery.compound.remake'));
    } };
    return ref;
  });

  const lockLine = el('p', 'cl-locked cl-r-lock');
  lockLine.hidden = true;
  const later = { 'refinery.vials': vials.root, 'refinery.weekly': weeklySec.root, 'refinery.cauldrons': hall.root, 'refinery.mixer': mixer.root };
  wrap.append(strip, orders.root, fracs.root, vials.root, weeklySec.root, hall.root, mixer.root, lockLine);

  // ---------------------------------------------------------------- update
  function update(nextApi) {
    api = nextApi;
    const s = api.state;
    for (const [n, k] of titles) setText(n, k());
    for (const n of panel.querySelectorAll('[data-t]')) setText(n, t(n.dataset.t));

    // Orders
    const anchor = anchorSlot(s);
    // Posted Orders keep their places (a card never moves because it became fillable); empty slots go last
    const rank = (v) => (v.empty ? 1 : 0);
    orderListUI.set(s.refinery.orders.map((_, slot) => ({ key: 's' + slot, slot, anchor: slot === anchor, view: orderView(s, slot) }))
      .sort((x, y) => rank(x.view) - rank(y.view) || x.slot - y.slot));

    // The ready strip
    const view = sectionsView(api.isOpen);
    const rv = readyView(s, api.isOpen);
    if (rv.count > 0) {
      const parts = [];
      if (rv.orders) parts.push(plural('cl.refinery.ready.orders', rv.orders));
      if (rv.weekly) parts.push(t('cl.refinery.ready.weekly'));
      if (rv.dallahs) parts.push(plural('cl.refinery.ready.dallahs', rv.dallahs));
      setText(stripTitle, t('cl.refinery.ready.title', { list: parts.join(t('cl.refinery.ready.join')) }));
    } else setText(stripTitle, t('cl.refinery.ready.none'));
    const showMsg = msgText && Date.now() < msgUntil;
    let hint = '';
    if (!showMsg && rv.count === 0 && rv.next) {
      hint = rv.next.empty ? t('cl.refinery.ready.next_new')
        : t('cl.refinery.ready.next_order', { n: fmtWhole(fmt, rv.next.missing, true), material: mat(rv.next.field, rv.next.grade) });
    }
    setText(stripSub, showMsg ? msgText : hint);
    setHidden(stripSub, !stripSub.textContent);
    const only = rv.count === 1;
    const label = !only ? t('cl.refinery.ready.collect')
      : rv.orders ? t('cl.refinery.order.fill') : rv.weekly ? t('cl.refinery.weekly.fill') : t(Cauldrons.nextIsUpgrade(s, s.cauldrons.vats.findIndex((_, v) => Cauldrons.canBrew(s, v))) ? 'cl.refinery.hall.brew_upgrade' : 'cl.refinery.hall.brew_bubble');
    setBtn(stripBtn, rv.count > 0, label);
    setHidden(stripBtn, rv.count === 0);
    setText(wellBtn, t('cl.refinery.order.see_well'));
    setHidden(wellBtn, !(showMsg && msgWell));

    // Fractions, folded with a one-line status
    const rows = fractionRows(s, api.isOpen);
    fracUI.set(rows);
    setText(fracs.status, t('cl.refinery.fractions.status', { n: rows.filter(r => r.raised).length, total: rows.length }));

    // Later sections
    for (const f of LATER) setHidden(later[f], !view.open.includes(f));
    setHidden(lockLine, !view.lock);
    if (view.lock) setText(lockLine, api.lockText(view.lock));

    const w = weeklyView(s);
    setText(wOpen, t('cl.refinery.weekly.open')); setHidden(wOpen, !w.open);
    setHidden(wRowsEl, !w.open); setHidden(wClosed, w.open); setHidden(wActs, !w.open);
    setText(wClosed, t('cl.refinery.weekly.closed'));
    weeklyRows.set(w.rows.map(r => ({ key: 'f' + r.field, ...r })));
    setBtn(wBtn, w.can, t('cl.refinery.weekly.fill'));
    setText(wValue, w.open ? t('cl.refinery.weekly.value', { pct: orderPct() }) : '');
    weekly.classList.toggle('is-ready', w.can);
    setText(weeklySec.status, t(w.can ? 'cl.refinery.weekly.status_ready' : w.open ? 'cl.refinery.weekly.status_open' : 'cl.refinery.weekly.status_closed'));

    dallahs.set(s.cauldrons.vats.map((_, vat) => ({ key: 'v' + vat, vat, view: cauldronView(s, vat) })));
    setText(hall.status, rv.dallahs ? t('cl.refinery.hall.status_ready', { n: rv.dallahs }) : t('cl.refinery.hall.status_idle'));
    bubbleRowsUI.set(bubbleRows(s).map(r => ({ key: r.id, ...r })));
    const lv = levelView(s);
    setHidden(lvlActs, !lv); setHidden(lvlCost, !lv);
    if (!lv) { setText(lvlMsg, t('cl.refinery.bubbles.none')); }
    else {
      setText(lvlMsg, t('cl.refinery.bubbles.level_detail', { frac: t(`cl.frac.${lv.fracId}`), from: lv.level, to: lv.level + 1 }));
      setText(lvlCost, t('cl.refinery.bubbles.cost', { cost: oasisUnits(lv.cost), have: fmtWhole(fmt, lv.have) }));
      setBtn(lvlBtn, lv.can, t('cl.refinery.bubbles.level'));
      setText(lvlNeed, lv.can ? '' : t('cl.refinery.need_more', { n: fmtWhole(fmt, lv.missing, true) }));
    }

    setText(offersNum, t('cl.refinery.vials.offers', { n: Collection.vialOffers(s) }));
    setText(offersHint, t('cl.refinery.vials.offers_hint'));
    const tries = vialTryRows(s);
    tryUI.set(tries);
    setHidden(tryNone, tries.length > 0);
    const owned = ownedVials(s);
    ownUI.set(owned);
    setHidden(ownNone, owned.length > 0);
    setText(vials.status, t('cl.refinery.vials.status', { offers: Collection.vialOffers(s), n: tries.length }));

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
    setText(mixer.status, t('cl.refinery.mixer.status', { n: comps.length, total: Collection.recipeCount(s) }));

    // One solid gold button on the screen (R3)
    const goal = api.goal ? api.goal() : { here: false };
    const cardCan = anchor >= 0 && Refinery.canFillOrder(s, anchor);
    const gold = goldTarget(goal, rv.count, cardCan);
    makeGold(stripBtn, gold === 'strip');
    for (const slot of Object.keys(orderBtns)) makeGold(orderBtns[slot], gold === 'card' && +slot === anchor);
  }

  update(api);
  return { update };
}
