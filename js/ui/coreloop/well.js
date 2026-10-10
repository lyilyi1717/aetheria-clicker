// Core-loop Well screen (docs/core-loop-plan.md CL-13): the cascade, Pressure, the Flare, the next
// generator, Gushers and Heat. The shell mounts it: mount(panel, api) -> { update(api) }.
// Pure helpers (the *View functions) turn the state into plain numbers; the DOM code is thin and is
// built once, update() only changes text and attributes.
import { BigNum } from '../../engine/BigNum.js';
import { registerStrings } from '../../i18n/coreloop/index.js';
import EN from '../../i18n/coreloop/well.en.js';
import AR from '../../i18n/coreloop/well.ar.js';
import { P } from '../../systems/coreloop/params.js';
import { PRESENCE } from '../../systems/coreloop/shared.js';
import * as Well from '../../systems/coreloop/Well.js';
import * as Presence from '../../systems/coreloop/Presence.js';

registerStrings(EN, AR);

const log10Big = (b) => (b && b.m > 0 ? Math.log10(b.m) + b.e : 0);

// --- pure views ----------------------------------------------------------------------------------
// Slots shown as playable: up to one above the highest bought (always at least the first)
export const slotsShown = (state) => Math.min(P.slots, Math.max(1, Well.topSlot(state) + 1));

// What is missing to pay `cost` from the Crude at hand: a BigNum, or null when it is affordable
export function missing(state, cost) {
  return cost.gt(state.well.crude) ? cost.sub(state.well.crude) : null;
}

export function slotView(state, k, presence = PRESENCE.WATCH) {
  const w = state.well, left = Well.packLeft(state, k), cost = Well.slotCost(state, k);
  let rate = Well.slotRate(state, k);
  if (k === 1) rate = rate.mul(Well.wellMultiplier(state, presence));
  const packCost = cost.mul(left);
  return {
    k, shown: k <= slotsShown(state),
    amount: w.amount[k], bought: w.bought[k], rate,
    packLeft: left, packFrac: (P.packSize - left) / P.packSize,
    cost, packCost,
    canBuyOne: Well.canBuy(state, k, 1), canBuyPack: Well.canBuy(state, k, left),
    missingOne: missing(state, cost), missingPack: missing(state, packCost)
  };
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

// The next generator and the best run it needs, both as log10 (the bar is have / goal)
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

export function heatView(state, presence) {
  const heat = Presence.heat(state);
  return { on: presence === PRESENCE.HANDS, heat, frac: heat - 1 };
}

// "Max all" does something when any tier up to its pack end, or Pressure, can be bought
export const canBuyAny = (state) => {
  for (let k = 1; k <= P.slots; k++) if (Well.canBuy(state, k, 1)) return true;
  return Well.canBuyPressure(state);
};

// A small multiplier with decimals, a big one in the game's notation
export function fmtX(api, x) {
  if (!(x > 0)) return '0';
  return x >= 1000 ? api.fmt(BigNum.from(x)) : String(Math.round(x * 100) / 100);
}

// --- DOM -----------------------------------------------------------------------------------------
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
function button(cls, onClick) {
  const b = el('button', 'btn ' + cls);
  b.type = 'button';
  b.addEventListener('click', () => { if (b.getAttribute('aria-disabled') !== 'true') onClick(); });
  return b;
}
// A buy button: a primary one when affordable, else locked with the missing amount
function setBuy(b, can, label, price, miss, api) {
  b.classList.toggle('btn-primary', can);
  b.classList.toggle('is-locked', !can);
  b.setAttribute('aria-disabled', String(!can));
  b.querySelector('.lbl').textContent = label;
  b.querySelector('.cost').textContent = can || !miss ? api.t('cl.well.price', { n: api.fmt(price) }) : api.t('cl.well.need', { n: api.fmt(miss) });
}
const buyButton = (onClick) => {
  const b = button('btn-buy', onClick);
  b.append(el('span', 'lbl'), el('span', 'cost'));
  return b;
};
function pulse(node) {
  node.classList.remove('cl-pulse');
  void node.offsetWidth;
  node.classList.add('cl-pulse');
}

export function mount(panel, api) {
  if (!document.querySelector('link[data-coreloop-well-css]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = 'css/coreloop-well.css'; link.dataset.coreloopWellCss = '';
    document.head.appendChild(link);
  }
  const t = api.t;
  panel.textContent = '';
  const root = el('div', 'clw');
  panel.appendChild(root);

  // Gusher (top, only while one is up)
  const gusher = button('btn-primary btn-lg clw-gusher', () => api.catchGusher());
  gusher.hidden = true;
  gusher.append(el('strong', null, t('cl.well.gusher_tap')), el('span', 'clw-gusher-left'));
  const gusherLeft = gusher.lastChild;
  root.appendChild(gusher);

  // Summary: Crude/s, Heat
  const summary = el('section', 'card clw-summary');
  const rateLine = el('div', 'clw-rate');
  const heatBox = el('div', 'clw-heat');
  const heatHead = el('div', 'bar-row');
  heatHead.append(el('span', null, t('cl.name.heat')), el('span', 'val'));
  const heatVal = heatHead.lastChild;
  const heatBar = el('div', 'bar gold'); heatBar.append(el('i'));
  const heatNote = el('p', 'clw-note', t('cl.name.heat.gloss'));
  heatBox.append(heatHead, heatBar, heatNote);
  summary.append(rateLine, heatBox);
  root.appendChild(summary);

  // Cascade
  const cascadeHead = el('div', 'clw-head');
  cascadeHead.appendChild(el('h2', 'clw-h', t('cl.shell.crude')));
  const maxAll = button('btn-lg clw-max', () => api.act((s) => Well.buyMax(s)));
  maxAll.textContent = t('cl.well.max_all');
  maxAll.title = t('cl.well.max_all_hint');
  cascadeHead.appendChild(maxAll);
  root.appendChild(cascadeHead);

  const list = el('div', 'clw-slots');
  const rows = [];
  for (let k = 1; k <= P.slots; k++) {
    const row = el('article', 'card-row clw-slot');
    const info = el('div', 'clw-info');
    const title = el('div', 'clw-title');
    title.append(el('strong', null, t('cl.well.slot', { n: k })), el('span', 'clw-amount'));
    const makes = el('div', 'clw-sub', k === 1 ? t('cl.well.makes_crude') : t('cl.well.makes_slot', { n: k - 1 }));
    const stats = el('div', 'clw-sub clw-stats');
    const prog = el('div', 'bar-row clw-prog');
    const bar = el('div', 'bar'); bar.append(el('i'));
    prog.append(bar, el('span', 'val'));
    info.append(title, makes, stats, prog);
    const lockedNote = el('p', 'clw-note clw-lock', t('cl.well.locked'));
    const acts = el('div', 'clw-acts');
    const b1 = buyButton(() => api.act((s) => Well.canBuy(s, k, 1) && Well.buy(s, k, 1) && pulse(row)));
    const bp = buyButton(() => api.act((s) => Well.canBuy(s, k, Well.packLeft(s, k)) && Well.buy(s, k, Well.packLeft(s, k)) && pulse(row)));
    acts.append(b1, bp);
    row.append(info, acts, lockedNote);
    list.appendChild(row);
    rows.push({ row, amount: title.lastChild, stats, bar: bar.firstChild, progVal: prog.lastChild, b1, bp, acts, lockedNote, prog });
  }
  root.appendChild(list);

  // Pressure
  const pCard = el('section', 'card clw-card');
  const pHead = el('div', 'card-head');
  pHead.append(el('h2', 'clw-h', t('cl.name.pressure')), el('span', 'chip gold'));
  const pChip = pHead.lastChild;
  const pGain = el('p', 'clw-note');
  const pBuy = buyButton(() => api.act((s) => Well.canBuyPressure(s) && Well.buyPressure(s) && pulse(pCard)));
  pBuy.classList.add('btn-block');
  pCard.append(pHead, pGain, pBuy);
  root.appendChild(pCard);

  // Flare
  const fCard = el('section', 'card clw-card');
  const fHead = el('div', 'card-head');
  fHead.append(el('h2', 'clw-h', t('cl.name.flare')), el('span', 'chip'));
  const fChip = fHead.lastChild;
  const fGloss = el('p', 'clw-note', t('cl.name.flare.gloss'));
  const fWould = el('p', 'clw-would');
  const fNote = el('p', 'clw-note');
  const fBtn = button('btn-lg btn-block', () => api.act((s, ctx) => Well.canFlare(s) && Well.flare(s, true, ctx) && pulse(fCard)));
  fBtn.append(el('span', 'lbl', t('cl.well.flare_go')));
  fCard.append(fHead, fGloss, fWould, fNote, fBtn);
  root.appendChild(fCard);

  // Next generator
  const gCard = el('section', 'card clw-card');
  const gText = el('p', 'clw-would');
  const gBar = el('div', 'bar-row');
  const gBarEl = el('div', 'bar lg'); gBarEl.append(el('i'));
  gBar.append(gBarEl);
  const gGoal = el('p', 'clw-note');
  gCard.append(el('h2', 'clw-h', t('cl.well.gen_title')), gText, gBar, gGoal);
  root.appendChild(gCard);

  function update(a = api) {
    const s = a.state, presence = a.presence();
    rateLine.textContent = t('cl.well.rate', { n: a.fmt(Well.crudePerSecond(s, presence)) });

    const h = heatView(s, presence);
    heatBox.hidden = !h.on;
    if (h.on) {
      heatVal.textContent = t('cl.well.heat_now', { n: h.heat.toFixed(2) });
      heatBar.firstChild.style.width = Math.round(h.frac * 100) + '%';
    }

    const g = gusherView(s);
    gusher.hidden = !g.up;
    if (g.up) gusherLeft.textContent = t('cl.well.gusher_left', { n: Math.ceil(g.left) });

    const any = canBuyAny(s);
    maxAll.classList.toggle('btn-primary', any);
    maxAll.classList.toggle('is-locked', !any);
    maxAll.setAttribute('aria-disabled', String(!any));

    for (let k = 1; k <= P.slots; k++) {
      const v = slotView(s, k, presence), r = rows[k - 1];
      r.row.classList.toggle('is-locked', !v.shown);
      r.row.classList.toggle('is-affordable', v.shown && v.canBuyOne);
      r.acts.hidden = !v.shown;
      r.lockedNote.hidden = v.shown;
      r.stats.hidden = r.prog.hidden = r.amount.hidden = !v.shown;
      if (!v.shown) continue;
      r.amount.textContent = a.fmt(v.amount);
      r.stats.textContent = t('cl.well.owned', { n: v.bought }) + ' · ' + t('cl.well.each', { n: a.fmt(v.rate) });
      r.bar.style.width = Math.round(v.packFrac * 100) + '%';
      r.progVal.textContent = t('cl.well.to_double', { n: v.packLeft });
      setBuy(r.b1, v.canBuyOne, t('cl.well.buy_one'), v.cost, v.missingOne, a);
      setBuy(r.bp, v.canBuyPack, t('cl.well.buy_pack', { n: v.packLeft }), v.packCost, v.missingPack, a);
    }

    const p = pressureView(s);
    pChip.textContent = t('cl.well.pressure_level', { n: p.level });
    pGain.textContent = t('cl.well.pressure_gain', { n: p.perLevel });
    setBuy(pBuy, p.can, t('cl.well.pressure_buy'), p.cost, p.missing, a);

    const f = flareView(s);
    fChip.textContent = t('cl.well.flare_now', { n: fmtX(a, f.now) });
    fWould.textContent = f.would > 0 ? t('cl.well.flare_would', { n: fmtX(a, f.would) }) : '';
    fWould.hidden = !(f.would > 0);
    fNote.textContent = f.reason === 'none' ? t('cl.well.flare_none')
      : f.reason === 'low' ? t('cl.well.flare_low', { n: fmtX(a, f.needs) })
      : t('cl.well.flare_burn', { n: Math.max(1, f.top - 1) });
    fBtn.classList.toggle('btn-primary', f.can);
    fBtn.classList.toggle('is-locked', !f.can);
    fBtn.setAttribute('aria-disabled', String(!f.can));

    const gen = generatorView(s);
    if (!gen) {
      gText.textContent = t('cl.well.gen_done');
      gBar.hidden = true; gGoal.hidden = true;
    } else {
      gBar.hidden = gGoal.hidden = false;
      gText.textContent = t('cl.well.gen_text', { n: gen.n, slot: gen.slot, mult: P.genMult });
      gBarEl.firstChild.style.width = Math.round(gen.frac * 100) + '%';
      gGoal.textContent = t('cl.well.gen_goal', { have: gen.have.toFixed(1), goal: gen.goal });
    }
  }
  update(api);
  return { update };
}
