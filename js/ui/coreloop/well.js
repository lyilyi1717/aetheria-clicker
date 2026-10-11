// Core-loop Well screen (docs/core-loop-plan.md CL-13, reworked by CL-29 and CL-36): the tappable
// well and what it says about progress, the pumps (only the ones owned and the next to buy), and
// the sections the guide opens one at a time: Buy everything, Pressure, the Flare, Generators.
// The shell mounts it: mount(panel, api) -> { update(api) }.
//
// The Well tells the truth about progress (docs/core-loop-feel-study.md, R2, R3, R4, R11):
//   - no wait longer than ten minutes is ever printed; a button shows its price and how full it is;
//   - the x2 and the price step of a crate are announced together, before they happen;
//   - one run bar, which never moves back, whole numbers on prices;
//   - one solid gold button: the one the bar names, else the single best thing to press here;
//   - the big rate is the steady rate; Da'sa is a bonus shown on top and nothing falls when the
//     player sits still;
//   - "Buy everything" says what it will buy.
// Pure helpers (the *View / *Words functions) turn the state into plain values; the DOM code is
// thin and is built once, update() only changes text and attributes.
import { BigNum } from '../../engine/BigNum.js';
import { t } from '../../i18n/index.js';
import { registerStrings } from '../../i18n/coreloop/index.js';
import EN from '../../i18n/coreloop/well.en.js';
import AR from '../../i18n/coreloop/well.ar.js';
import { P } from '../../systems/coreloop/params.js';
import { PRESENCE } from '../../systems/coreloop/shared.js';
import { treeBonus } from '../../systems/coreloop/treeMath.js';
import * as Well from '../../systems/coreloop/Well.js';
import * as Presence from '../../systems/coreloop/Presence.js';
import * as Prestige from '../../systems/coreloop/Prestige.js';

import { icon, SLOT_ICONS } from './icons.js';

registerStrings(EN, AR);

const log10Big = (b) => (b && b.m > 0 ? Math.log10(b.m) + b.e : 0);
const clamp01 = (x) => (x > 0 ? Math.min(1, x) : 0);
// The longest wait the Well will put in words: past this a button shows how full it is instead
export const MAX_WAIT = 600;

// --- pure views ----------------------------------------------------------------------------------
// Pumps shown: the ones owned and the next one to buy (always at least the first). On the first
// run the Hand Pump waits for the first full crate of Buckets: the x2 comes first, then the door.
export function slotsShown(state) {
  const top = Well.topSlot(state);
  const n = Math.min(P.slots, Math.max(1, top + 1));
  if (n === 2 && state.prestige.wells === 0 && state.well.bought[1] < P.packSize) return 1;
  return n;
}

// What is missing to pay `cost` from the Crude at hand: a BigNum, or null when it is affordable
export function missing(state, cost) {
  return cost.gt(state.well.crude) ? cost.sub(state.well.crude) : null;
}

// How full a price is: the Crude at hand over the price, 0..1
export function fillFrac(state, cost) {
  if (!(state.well.crude.m > 0) || !(cost.m > 0)) return state.well.crude.m > 0 ? 1 : 0;
  return clamp01(Math.pow(10, log10Big(state.well.crude) - log10Big(cost)));
}

// Seconds until `miss` Crude is made at `rate` Crude per second, or null when nothing is made.
// It reads the rate as it is now, so it is an upper guess: pumps that make pumps only speed it up.
export function etaSeconds(miss, rate) {
  if (!miss || !rate || !(rate.m > 0)) return null;
  const d = log10Big(miss) - log10Big(rate);
  if (d > 9) return Infinity;
  return Math.max(1, Math.ceil(Math.pow(10, d) - 1e-6));
}

// The words for a wait: "12 s", "3 min"; null when it is longer than MAX_WAIT (never hours)
export function waitWords(seconds) {
  if (!(seconds <= MAX_WAIT)) return null;
  if (seconds < 100) return t('cl.well.t_s', { n: Math.ceil(seconds) });
  return t('cl.well.t_m', { n: Math.ceil(seconds / 60) });
}

// What a button that cannot be paid yet says: when it can ("in 12 s"), or nothing at all when that
// is far away (its fill bar says how close it is)
export function whenWords(api, miss, rate) {
  const eta = etaSeconds(miss, rate);
  const w = eta === null ? null : waitWords(eta);
  return w ? t('cl.well.eta', { time: w }) : '';
}

// A number for a price or a count: whole below 1,000, the game's notation above
export function whole(api, b, mode = 'round') {
  if (!(b && b.m > 0)) return '0';
  if (b.e >= 3) return api.fmt(b);
  const x = b.toNumber();
  if (mode === 'ceil') return String(Math.ceil(x - 1e-9));
  if (mode === 'floor') return String(Math.floor(x + 1e-9));
  return String(Math.max(1, Math.round(x)));
}

// What one unit of the next crate of pump k costs (the price steps when the crate completes)
export function nextCrateCost(state, k) {
  const log = Well.slotCostLog(state, k) + P.stepA + P.stepB * k;
  const e = Math.floor(log);
  return new BigNum(Math.pow(10, log - e), e);
}

export function slotView(state, k, presence = PRESENCE.WATCH) {
  const w = state.well, left = Well.packLeft(state, k), cost = Well.slotCost(state, k);
  let rate = Well.slotRate(state, k);
  if (k === 1) rate = rate.mul(Well.wellMultiplier(state, presence));
  const packCost = cost.mul(left);
  return {
    k, shown: k <= slotsShown(state),
    amount: w.amount[k], bought: w.bought[k], rate,
    crate: Math.floor(w.bought[k] / P.packSize) + 1,
    packLeft: left, packFrac: (P.packSize - left) / P.packSize,
    cost, packCost, nextCost: nextCrateCost(state, k),
    canBuyOne: Well.canBuy(state, k, 1), canBuyPack: Well.canBuy(state, k, left),
    missingOne: missing(state, cost), missingPack: missing(state, packCost)
  };
}

// The sentence of a pump row, as a key and its words: the Bucket makes Crude, every other pump makes
// the pump before it
export function rowWords(k) {
  return k === 1 ? { key: 'cl.well.makes_crude', prev: 0 } : { key: 'cl.well.makes_pump', prev: k - 1 };
}

// A pump's name with its gloss when it has one: "Wanet (the pickup that hauls the barrels)"
export function slotName(k, withGloss = false) {
  const name = t(`cl.slot.${k}`), gloss = `cl.slot.${k}.gloss`;
  const g = t(gloss);
  return withGloss && g !== gloss ? `${name} (${g})` : name;
}

export function pressureView(state) {
  const cost = Well.pressureCost(state);
  return { level: state.well.pressure, perLevel: P.pMult, cost, can: Well.canBuyPressure(state), missing: missing(state, cost) };
}

export function flareView(state) {
  const top = Well.topSlot(state), would = Well.flareMultiplier(state);
  return {
    now: state.well.flare, would, top, can: Well.canFlare(state),
    reason: top < 2 || !(would > 0) ? 'none' : (Well.canFlare(state) ? 'ok' : 'low'),
    needs: state.well.flare * P.flareMinGain
  };
}

// The next Generator and the best run it needs, both as log10 (the bar is have / goal)
export function generatorView(state) {
  const next = Well.nextGenerator(state);
  if (!next) return null;
  const have = log10Big(state.well.bestEver);
  return { n: next.n, slot: next.slot, goal: next.goalLog, have, frac: Math.max(0, Math.min(1, have / next.goalLog)) };
}

export function gusherView(state) {
  const up = Presence.canCatchGusher(state);
  return { up, left: up ? Presence.gusherLeft(state) : 0 };
}

// Da'sa is a bonus on top of the steady rate. `gain` is what hands-on play does to the Well right
// now (x1.38), `pct` the same as a percentage, `max` the most it can give, `bonus` the Crude a
// second it adds (a BigNum) and `frac` how full the meter is.
export function heatView(state, presence) {
  const heat = Presence.heat(state);
  const hands = log10Big(Well.wellMultiplier(state, PRESENCE.HANDS)), watch = log10Big(Well.wellMultiplier(state, PRESENCE.WATCH));
  const gain = Math.pow(10, hands - watch);
  const on = presence === PRESENCE.HANDS;
  const steady = Well.crudePerSecond(state, PRESENCE.WATCH);
  return {
    on, heat, frac: on ? clamp01(heat - 1) : 0, warm: on && heat > 1.005, gain,
    pct: on ? Math.max(0, Math.round((gain - 1) * 100)) : 0,
    max: Math.round((P.handsWell + treeBonus(state.tree, 'handsWell')) * 100),
    bonus: on && gain > 1 ? steady.mul(gain - 1) : BigNum.zero()
  };
}

// What the hero shows: the well, or the Gusher when one is up
export function heroView(state, presence) {
  const g = gusherView(state), h = heatView(state, presence);
  return { mode: g.up ? 'gusher' : 'well', left: g.left, heat: h };
}

// The run bar: one bar for the whole run, log10(Crude made this run) over log10 of the Crude a New
// Well needs (the same fraction the guide's bar uses). Shown with the guide's `well.run`.
export function runView(state, open = state.guide?.open?.['well.run'] === true) {
  const pending = Prestige.pendingReserves(state), need = Prestige.newWellNeed(state);
  const goal = Prestige.newWellRunLog(state);
  const ready = Prestige.canNewWell(state);
  const frac = ready ? 1 : clamp01(goal > 0 ? log10Big(state.well.runCrude) / goal : 0);
  return {
    show: open || state.prestige.wells > 0, first: state.prestige.wells === 0,
    frac, pct: ready ? 100 : Math.min(99, Math.floor(frac * 100)), pending, need, ready
  };
}

// A value that only goes up within one run: hold(run, x) gives the biggest x seen for that run
// (the bar must never move back, whatever else changes the goal under it)
export function makeHold() {
  let run = null, hi = 0;
  return (key, x) => {
    if (key !== run) { run = key; hi = 0; }
    if (x > hi) hi = x;
    return hi;
  };
}

// Which sections of the screen show: the open ones, and the one closed section that comes next
export const SECTIONS = Object.freeze(['well.maxall', 'well.pressure', 'well.flare', 'well.generators']);
export function sectionsView(isOpen) {
  const open = {};
  let lock = null;
  for (const f of SECTIONS) {
    open[f] = isOpen(f);
    if (!open[f] && lock === null) lock = f;
  }
  return { open, lock };
}

// "Buy everything" does something when any pump, or Pressure, can be bought
export const canBuyAny = (state) => {
  for (let k = 1; k <= P.slots; k++) if (Well.canBuy(state, k, 1)) return true;
  return Well.canBuyPressure(state);
};

// What "Buy everything" would buy now, found by running Well.buyMax on a copy: { items: [{ k, n }],
// pressure, risky }. `risky` is the first unit of a later crate that would take most of the Crude
// ({ k, cost }), which the button still buys: the screen says so.
export function buyPlan(state) {
  const w = state.well;
  const copy = { ...state, well: { ...w, bought: w.bought.slice(), amount: w.amount.slice() } };
  const before = w.bought.slice(), pressure0 = w.pressure;
  Well.buyMax(copy);
  const items = [];
  let risky = null;
  for (let k = P.slots; k >= 1; k--) {
    const n = copy.well.bought[k] - before[k];
    if (n <= 0) continue;
    items.push({ k, n });
    if (!risky && before[k] >= P.packSize && before[k] % P.packSize === 0) {
      const cost = Well.slotCost(state, k);
      if (cost.mul(2).gt(w.crude)) risky = { k, cost };
    }
  }
  return { items, pressure: copy.well.pressure - pressure0, risky };
}

// The words of the Buy everything button: "Buy everything", or "Buy: Hand Pump x2, Pressure x1"
export function buyWords(api, plan) {
  const parts = plan.items.map((i) => t('cl.well.max_item', { name: slotName(i.k), n: i.n }));
  if (plan.pressure > 0) parts.push(t('cl.well.max_item', { name: t('cl.name.pressure'), n: plan.pressure }));
  if (!parts.length) return t('cl.well.max_all');
  const shown = parts.slice(0, 3).join(t('cl.well.max_sep'));
  return t('cl.well.max_buy', { list: parts.length > 3 ? t('cl.well.max_more', { list: shown, n: parts.length - 3 }) : shown });
}

// One solid gold button per screen (the feel study, R3). `items` are the buttons that can be
// pressed, best first: { id, anchor, can, best }. When the bar's goal is on this screen only its
// own element is solid gold (and only once it can be pressed); when it is elsewhere, the first
// item that can be pressed and may be the best is. Everything else that can be pressed is outlined.
// Returns { id: 'primary' | 'ready' | '' }.
export function goldView(goal, items) {
  const out = {};
  for (const it of items) out[it.id] = it.can ? 'ready' : '';
  if (goal && goal.here) {
    const target = items.find((it) => it.anchor === goal.anchor);
    if (target && target.can) out[target.id] = 'primary';
    return out;
  }
  const best = items.find((it) => it.can && it.best !== false);
  if (best) out[best.id] = 'primary';
  return out;
}

// "Reserves" in the right number
export const reservesWords = (n) => t(n === 1 ? 'cl.well.run_pays_one' : 'cl.well.run_pays', { n });

// --- DOM -----------------------------------------------------------------------------------------
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const restart = (node, cls) => {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
};
const calm = () => {
  const d = document.documentElement.dataset.motion;
  return d === 'reduced' || (d !== 'full' && !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
};
// Set text; a changed value flashes (only once the screen has been drawn: not on the first fill)
function setText(node, text, flash = true) {
  if (node.textContent === text) return;
  const had = node.textContent !== '';
  node.textContent = text;
  if (flash && had) restart(node, 'cl-flash');
}
function button(cls, onClick) {
  const b = el('button', 'btn ' + cls);
  b.type = 'button';
  b.addEventListener('click', (e) => {
    if (b.getAttribute('aria-disabled') === 'true') { restart(b, 'cl-nope'); return; }
    onClick(e);
  });
  return b;
}
// A buy button: label, price, when it can be paid (only when that is soon), and how full it is
function buyButton(onClick) {
  const b = button('btn-buy', onClick);
  const fill = el('span', 'clw-fill');
  fill.append(el('i'));
  b.append(el('span', 'lbl'), el('span', 'cost'), el('span', 'when'), fill);
  return b;
}
// kind: 'primary' (solid gold, the one), 'ready' (gold outline) or '' ; `frac` fills the thin bar
function paint(b, can, kind) {
  b.classList.toggle('btn-primary', can && kind === 'primary');
  b.classList.toggle('btn-ready', can && kind === 'ready');
  b.classList.toggle('is-locked', !can);
  b.setAttribute('aria-disabled', String(!can));
}
function setBuy(b, can, kind, label, price, when, frac, api) {
  paint(b, can, kind);
  b.querySelector('.lbl').textContent = label;
  b.querySelector('.cost').textContent = t('cl.well.price', { n: whole(api, price, 'ceil') });
  const w = b.querySelector('.when');
  w.textContent = can ? '' : when;
  w.hidden = can || !when;
  const f = b.querySelector('.clw-fill');
  f.hidden = can;
  f.firstChild.style.width = Math.round(clamp01(frac) * 100) + '%';
}
function bar(cls = '') {
  const b = el('div', 'bar ' + cls);
  b.append(el('i'));
  return b;
}
const setBar = (b, frac) => { b.firstChild.style.width = Math.round(clamp01(frac) * 100) + '%'; };

// How many times Da'sa has been shown to this player (its "(heat)" gloss stays for the first three)
const GLOSS_KEY = 'cl.well.dasaSeen';
function glossSeen(bump) {
  try {
    let n = Number(globalThis.localStorage?.getItem(GLOSS_KEY)) || 0;
    if (bump) { n++; globalThis.localStorage?.setItem(GLOSS_KEY, String(n)); }
    return n;
  } catch { return 0; }
}

export function mount(panel, api) {
  if (!document.querySelector('link[data-coreloop-well-css]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = 'css/coreloop-well.css'; link.dataset.coreloopWellCss = '';
    document.head.appendChild(link);
  }
  panel.textContent = '';
  const root = el('div', 'clw');
  panel.appendChild(root);
  let paidTimer = 0, paidText = '';
  const hold = makeHold();
  let glossShown = false;

  // 1. The well: the barrel, the steady rate, Da'sa and the run bar, in a box that keeps its size ----
  const hero = el('section', 'card clw-hero');
  const stage = el('div', 'clw-stage');
  const well = button('clw-well', onWellTap);
  well.dataset.guide = 'well.tap';
  well.setAttribute('aria-label', t('cl.well.tap_label'));
  const wellIcon = el('span', 'clw-well-icon');
  wellIcon.innerHTML = icon('well', { size: 'hero' });
  let wellMode = 'well';
  wellIcon.setAttribute('aria-hidden', 'true');
  const wellText = el('span', 'clw-well-text');
  well.append(wellIcon, wellText);
  stage.appendChild(well);

  const side = el('div', 'clw-side');
  // the rate (or, before the first Bucket, what the player is looking at)
  const rateBox = el('div', 'clw-ratebox');
  const intro = el('p', 'clw-intro');
  const rateWrap = el('div', 'clw-ratewrap');
  const rateBig = el('div', 'clw-rate');
  const rateLabel = el('div', 'clw-ratelabel', t('cl.well.rate_label'));
  rateWrap.append(rateBig, rateLabel);
  rateBox.append(intro, rateWrap);
  // Da'sa: a bonus on top, never the rate itself
  const heatBox = el('div', 'clw-heat');
  const heatHead = el('div', 'bar-row clw-heathead');
  const heatName = el('span', 'clw-heatname');
  const heatGloss = el('span', 'clw-gloss');
  heatName.append(el('span', null, t('cl.name.heat')), heatGloss);
  const heatVal = el('span', 'val');
  heatHead.append(heatName, heatVal);
  const heatBar = bar('gold');
  const heatNote = el('p', 'clw-note');
  heatBox.append(heatHead, heatBar, heatNote);
  // the run: one bar from the first Bucket to the first New Well
  const runBox = el('div', 'clw-run');
  const runText = el('p', 'clw-runtext');
  const runBar = bar('lg gold');
  const runSub = el('p', 'clw-note');
  const runGo = button('clw-run-go', () => api.go('prestige'));
  runBox.append(runText, runBar, runSub, runGo);
  side.append(rateBox, heatBox, runBox);
  hero.append(stage, side);
  root.appendChild(hero);

  function onWellTap(e) {
    const gusher = Presence.canCatchGusher(api.state);
    let gain;
    if (gusher) {
      const res = api.catchGusher();
      if (res && res.crude) {
        gain = `+${api.fmt(res.crude)}`;
        paidText = t('cl.well.gusher_paid', { n: api.fmt(res.crude) });
        clearTimeout(paidTimer);
        paidTimer = setTimeout(() => { paidText = ''; update(api); }, 5000);
      }
    } else {
      gain = `+${api.fmt(BigNum.from(api.tapWell() || P.tapCrude))}`;
    }
    restart(well, 'is-tapped');
    restart(rateBig, 'cl-flash');
    if (gain && !calm()) floatUp(e, gain);
  }
  function floatUp(e, text) {
    const r = stage.getBoundingClientRect(), w = well.getBoundingClientRect();
    const x = e && e.clientX ? e.clientX - r.left : w.left - r.left + w.width / 2;
    const y = e && e.clientY ? e.clientY - r.top : w.top - r.top + w.height / 2;
    const f = el('span', 'clw-float', text);
    f.style.insetInlineStart = x + 'px';
    f.style.insetBlockStart = y + 'px';
    stage.appendChild(f);
    setTimeout(() => f.remove(), 900);
  }

  // 2. Pumps --------------------------------------------------------------------------------------
  const pumpHead = el('div', 'clw-head');
  const pumpTitle = el('div', 'clw-titlebox');
  pumpTitle.append(el('h2', 'clw-h', t('cl.well.pumps_title')), el('p', 'clw-note', t('cl.well.pumps_help')));
  pumpHead.appendChild(pumpTitle);
  const maxAll = button('clw-max btn-block', () => api.act((s) => Well.buyMax(s)));
  maxAll.dataset.guide = 'well.maxall';
  maxAll.textContent = t('cl.well.max_all');
  maxAll.title = t('cl.well.max_all_hint');
  const maxNote = el('p', 'clw-note', t('cl.well.max_all_hint'));
  root.append(pumpHead, maxAll, maxNote);

  const list = el('div', 'clw-slots');
  const rows = [];
  for (let k = 1; k <= P.slots; k++) {
    const row = el('article', 'card-row clw-slot');
    const pumpIcon = el('span', 'clw-icon');
    pumpIcon.innerHTML = icon(SLOT_ICONS[k - 1] || 'dot');
    pumpIcon.setAttribute('aria-hidden', 'true');
    const info = el('div', 'clw-info');
    const title = el('div', 'clw-title');
    title.append(el('strong', null, slotName(k, true)));
    const have = el('div', 'clw-have');
    const makes = el('div', 'clw-sub');
    const pips = el('div', 'clw-pips');
    pips.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < P.packSize; i++) pips.appendChild(el('i'));
    const crateNote = el('div', 'clw-crate');
    info.append(title, have, makes, pips, crateNote);
    const acts = el('div', 'clw-acts');
    const b1 = buyButton(() => api.act((s) => Well.canBuy(s, k, 1) && Well.buy(s, k, 1) && restart(row, 'cl-pulse')));
    b1.dataset.guide = `well.buy.${k}`;
    const bp = buyButton(() => api.act((s) => Well.canBuy(s, k, Well.packLeft(s, k)) && Well.buy(s, k, Well.packLeft(s, k)) && restart(row, 'cl-pulse')));
    bp.classList.add('clw-pack');
    acts.append(b1, bp);
    row.append(pumpIcon, info, acts);
    list.appendChild(row);
    rows.push({ row, have, makes, pips: [...pips.children], crateNote, b1, bp, lastCrate: undefined, noteUntil: 0 });
  }
  root.appendChild(list);

  // 3. Pressure, Flare, Generators, and the one section coming next ---------------------------------
  const pCard = el('section', 'card clw-card');
  const pHead = el('div', 'card-head');
  pHead.append(el('h2', 'clw-h', t('cl.name.pressure')), el('span', 'chip gold'));
  const pChip = pHead.lastChild;
  const pGain = el('p', 'clw-line');
  const pBuy = buyButton(() => api.act((s) => Well.canBuyPressure(s) && Well.buyPressure(s) && restart(pCard, 'cl-pulse')));
  pBuy.classList.add('btn-block');
  pBuy.dataset.guide = 'well.pressure';
  pCard.append(pHead, pGain, pBuy);
  root.insertBefore(pCard, pumpHead);   // Pressure sits right under the well: it is the next thing after the first crate

  const fCard = el('section', 'card clw-card');
  const fHead = el('div', 'card-head');
  fHead.append(el('h2', 'clw-h', t('cl.name.flare')), el('span', 'chip'));
  const fChip = fHead.lastChild;
  const fGloss = el('p', 'clw-line', t('cl.name.flare.gloss'));
  const fWould = el('p', 'clw-would');
  const fNote = el('p', 'clw-note');
  const fBtn = button('btn-block', () => api.act((s, ctx) => Well.canFlare(s) && Well.flare(s, true, ctx) && restart(fCard, 'cl-pulse')));
  fBtn.dataset.guide = 'well.flare';
  fBtn.textContent = t('cl.well.flare_go');
  fCard.append(fHead, fGloss, fWould, fNote, fBtn);
  root.appendChild(fCard);

  const gCard = el('section', 'card clw-card');
  const gText = el('p', 'clw-line');
  const gBarEl = bar('lg');
  const gGoal = el('p', 'clw-note');
  gCard.append(el('h2', 'clw-h', t('cl.well.gen_title')), gText, gBarEl, gGoal);
  root.appendChild(gCard);

  const locked = el('p', 'cl-locked');
  root.appendChild(locked);

  function update(a = api) {
    const s = a.state, presence = a.presence();
    const goal = a.goal ? a.goal() : null;
    const hv = heroView(s, presence), h = hv.heat;
    // The steady rate: what the Well makes without Da'sa. It never falls because the player rests.
    const rate = Well.crudePerSecond(s, PRESENCE.WATCH);
    const owns = Well.topSlot(s) > 0, pumpsOpen = a.isOpen('well.pumps');
    const sec = sectionsView((f) => a.isOpen(f));

    // The one solid gold button: first work out what can be pressed
    const r = runView(s, a.isOpen('well.run'));
    const shown = [];
    for (let k = 1; k <= P.slots; k++) if (k <= slotsShown(s)) shown.push(k);
    const fl = flareView(s), pv = pressureView(s);
    const any = canBuyAny(s);
    const items = [];
    items.push({ id: 'run', anchor: 'prestige.newwell', can: r.show && r.ready && a.isOpen('tab.prestige') });
    for (const k of [...shown].reverse()) {
      items.push({ id: `b1.${k}`, anchor: `well.buy.${k}`, can: pumpsOpen && Well.canBuy(s, k, 1) });
    }
    items.push({ id: 'pressure', anchor: 'well.pressure', can: sec.open['well.pressure'] && pv.can });
    for (const k of shown) {
      const left = Well.packLeft(s, k);
      items.push({ id: `bp.${k}`, anchor: `well.pack.${k}`, can: pumpsOpen && left > 1 && Well.canBuy(s, k, left), best: false });
    }
    items.push({ id: 'max', anchor: 'well.maxall', can: sec.open['well.maxall'] && any, best: false });
    items.push({ id: 'flare', anchor: 'well.flare', can: sec.open['well.flare'] && fl.can, best: false });
    const gold = goldView(goal, items);

    // The well, or the Gusher
    const gusher = hv.mode === 'gusher';
    const lit = gusher || !!(goal && goal.here && goal.anchor === 'well.tap');
    well.classList.toggle('is-gusher', gusher);
    well.classList.toggle('is-lit', lit);
    if (wellMode !== (gusher ? 'gusher' : 'well')) {
      wellMode = gusher ? 'gusher' : 'well';
      wellIcon.innerHTML = icon(wellMode, { size: 'hero' });
    }
    wellText.textContent = gusher ? `${t('cl.well.gusher_tap')} ${t('cl.well.gusher_left', { n: Math.ceil(hv.left) })}`
      : (s.well.bought[1] > 0 ? t('cl.well.tap_hint_small', { n: P.tapCrude }) : t('cl.well.tap_hint'));
    well.setAttribute('aria-label', gusher ? wellText.textContent : t('cl.well.tap_label'));

    // The rate (steady) or, before there is one, the first sentence
    const showRate = rate.m > 0 || s.prestige.wells > 0;
    intro.hidden = showRate;
    rateWrap.hidden = !showRate;
    if (!showRate) intro.textContent = s.well.bought[1] > 0 || !pumpsOpen ? t('cl.well.intro') : t('cl.well.intro_buy');
    setText(rateBig, whole(a, rate), false);
    setText(rateLabel, paidText || t('cl.well.rate_label'), false);
    rateLabel.classList.toggle('is-paid', !!paidText);

    // Da'sa, once the guide has opened it; before that one quiet line
    const heatOpen = a.isOpen('well.heat');
    heatBox.classList.toggle('is-off', !(heatOpen || owns));
    heatHead.hidden = heatBar.hidden = !heatOpen;
    if (heatOpen) {
      if (!glossShown) { glossShown = true; heatGloss.textContent = glossSeen(true) <= 3 ? ` ${t('cl.well.heat_gloss')}` : ''; }
      setText(heatVal, h.warm && h.pct > 0 ? `+${h.pct}%` : '', false);
      setBar(heatBar, h.frac);
      heatNote.textContent = h.warm && h.bonus.m > 0 && h.bonus.gt(BigNum.one())
        ? t('cl.well.heat_on', { n: whole(a, h.bonus) })
        : h.on ? t('cl.well.heat_warm', { max: h.max }) : t('cl.well.heat_rest', { max: h.max });
    } else {
      heatNote.textContent = owns ? t('cl.well.heat_quiet') : '';
    }

    // The run: one bar that does not go back
    runBox.classList.toggle('is-off', !r.show);
    runBox.dataset.guide = r.show ? 'well.rate' : '';
    rateBox.dataset.guide = r.show ? '' : 'well.rate';
    if (!runBox.dataset.guide) delete runBox.dataset.guide;
    if (!rateBox.dataset.guide) delete rateBox.dataset.guide;
    if (r.show) {
      const f = hold(s.prestige.wells, r.frac);
      setBar(runBar, f);
      runBar.classList.toggle('gold', !r.ready);
      runText.textContent = t(r.first ? 'cl.well.run_first' : 'cl.well.run_next', { pct: r.ready ? 100 : Math.min(99, Math.floor(f * 100)) });
      const canGo = a.isOpen('tab.prestige');
      runGo.hidden = !(r.ready && canGo);
      runSub.hidden = r.ready && canGo;
      if (r.ready) runGo.textContent = t('cl.well.run_go', { n: r.pending });
      runSub.textContent = r.pending >= 1 ? reservesWords(r.pending) : '';
      paint(runGo, true, gold.run);
    }

    // Pumps
    pumpHead.hidden = !pumpsOpen || slotsShown(s) < 2;
    list.hidden = !pumpsOpen;
    const maxOpen = pumpsOpen && sec.open['well.maxall'];
    maxAll.hidden = maxNote.hidden = !maxOpen;
    if (maxOpen) {
      const plan = buyPlan(s);
      const words = buyWords(a, plan);
      if (maxAll.textContent !== words) maxAll.textContent = words;
      maxNote.textContent = plan.risky ? t('cl.well.max_risky', { name: slotName(plan.risky.k), price: whole(a, plan.risky.cost, 'ceil') }) : t('cl.well.max_all_hint');
      maxNote.classList.toggle('is-warn', !!plan.risky);
      paint(maxAll, any, gold.max);
    }

    for (let k = 1; k <= P.slots; k++) {
      const v = slotView(s, k, PRESENCE.WATCH), x = rows[k - 1];
      x.row.hidden = !pumpsOpen || !v.shown;
      if (x.row.hidden) continue;
      x.row.classList.toggle('is-affordable', v.canBuyOne);
      setText(x.have, t('cl.well.you_have', { n: whole(a, v.amount, 'floor') }));
      const w = rowWords(k);
      x.makes.textContent = t(w.key, { n: whole(a, v.rate), name: w.prev ? t(`cl.slot.${w.prev}`) : '' });
      // the crate: ten pips, and what the tenth does, announced together with what comes after
      const filled = v.bought % P.packSize;
      x.pips.forEach((p, i) => p.classList.toggle('on', i < filled));
      if (x.lastCrate !== undefined && v.crate > x.lastCrate) x.noteUntil = Date.now() + 5000;
      x.lastCrate = v.crate;
      const next = whole(a, v.nextCost, 'ceil');
      x.crateNote.classList.toggle('is-done', Date.now() < x.noteUntil);
      x.crateNote.textContent = Date.now() < x.noteUntil
        ? t('cl.well.crate_done', { name: slotName(k), next: whole(a, v.cost, 'ceil') }) + (k === 1 && Well.topSlot(s) === 1 ? ' ' + t('cl.well.crate_door', { pump: slotName(2) }) : '')
        : t('cl.well.crate', { c: v.crate, left: v.packLeft, name: slotName(k), next });
      const lastOne = v.packLeft === 1;
      setBuy(x.b1, v.canBuyOne, gold[`b1.${k}`], lastOne ? t('cl.well.buy_last', { name: slotName(k) }) : t('cl.well.buy_one'), v.cost,
        v.missingOne ? whenWords(a, v.missingOne, rate) : '', fillFrac(s, v.cost), a);
      x.bp.hidden = lastOne;
      setBuy(x.bp, v.canBuyPack, gold[`bp.${k}`], t('cl.well.buy_pack', { n: v.packLeft, name: slotName(k) }), v.packCost,
        v.missingPack ? whenWords(a, v.missingPack, rate) : '', fillFrac(s, v.packCost), a);
    }

    // Pressure
    pCard.hidden = !sec.open['well.pressure'];
    if (!pCard.hidden) {
      pChip.textContent = t('cl.well.pressure_level', { n: pv.level });
      pGain.textContent = t('cl.well.pressure_gain', { n: pv.perLevel });
      setBuy(pBuy, pv.can, gold.pressure, t('cl.well.pressure_buy'), pv.cost, pv.missing ? whenWords(a, pv.missing, rate) : '', fillFrac(s, pv.cost), a);
    }

    // Flare
    fCard.hidden = !sec.open['well.flare'];
    if (!fCard.hidden) {
      fChip.textContent = t('cl.well.flare_now', { n: fmtX(a, fl.now) });
      fWould.textContent = fl.would > 0 ? t('cl.well.flare_would', { n: fmtX(a, fl.would) }) : '';
      fWould.hidden = !(fl.would > 0);
      fNote.textContent = fl.reason === 'none' ? t('cl.well.flare_none')
        : fl.reason === 'low' ? t('cl.well.flare_low', { n: fmtX(a, fl.needs) })
        : t('cl.well.flare_burn', { top: t(`cl.slot.${fl.top}`) });
      paint(fBtn, fl.can, gold.flare);
    }

    // Generators
    gCard.hidden = !sec.open['well.generators'];
    if (!gCard.hidden) {
      const gen = generatorView(s);
      if (!gen) {
        gText.textContent = t('cl.well.gen_done');
        gBarEl.hidden = gGoal.hidden = true;
      } else {
        gBarEl.hidden = gGoal.hidden = false;
        gText.textContent = t('cl.well.gen_text', { name: t(`cl.slot.${gen.slot}`), mult: P.genMult });
        setBar(gBarEl, gen.frac);
        gGoal.textContent = t('cl.well.gen_goal', { goal: a.fmt(new BigNum(1, gen.goal)), have: a.fmt(s.well.bestEver) });
      }
    }

    // The one closed section coming next (not before the pumps are in view)
    locked.hidden = sec.lock === null || !pumpsOpen;
    if (!locked.hidden) locked.textContent = a.lockText(sec.lock);
  }
  update(api);
  return { update };
}

// A small multiplier with decimals, a big one in the game's notation
export function fmtX(api, x) {
  if (!(x > 0)) return '0';
  return x >= 1000 ? api.fmt(BigNum.from(x)) : String(Math.round(x * 100) / 100);
}
