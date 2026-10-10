// Core-loop Well screen (docs/core-loop-plan.md CL-13, reworked by CL-29): the tappable well, the
// run's progress to a New Well, the pumps (only the ones owned and the next to buy), and the
// sections the guide opens one at a time: Buy everything, Pressure, the Flare, Generators.
// The shell mounts it: mount(panel, api) -> { update(api) }.
// Pure helpers (the *View / *Words functions) turn the state into plain values; the DOM code is
// thin and is built once, update() only changes text and attributes.
import { BigNum } from '../../engine/BigNum.js';
import { t } from '../../i18n/index.js';
import { registerStrings } from '../../i18n/coreloop/index.js';
import EN from '../../i18n/coreloop/well.en.js';
import AR from '../../i18n/coreloop/well.ar.js';
import { P } from '../../systems/coreloop/params.js';
import { PRESENCE } from '../../systems/coreloop/shared.js';
import * as Well from '../../systems/coreloop/Well.js';
import * as Presence from '../../systems/coreloop/Presence.js';
import * as Prestige from '../../systems/coreloop/Prestige.js';

registerStrings(EN, AR);

const log10Big = (b) => (b && b.m > 0 ? Math.log10(b.m) + b.e : 0);
const clamp01 = (x) => (x > 0 ? Math.min(1, x) : 0);

// --- pure views ----------------------------------------------------------------------------------
// Pumps shown: the ones owned and the next one to buy (always at least the first)
export const slotsShown = (state) => Math.min(P.slots, Math.max(1, Well.topSlot(state) + 1));

// What is missing to pay `cost` from the Crude at hand: a BigNum, or null when it is affordable
export function missing(state, cost) {
  return cost.gt(state.well.crude) ? cost.sub(state.well.crude) : null;
}

// Seconds until `miss` Crude is made at `rate` Crude per second, or null when nothing is made.
// It reads the rate as it is now, so it is an upper guess: pumps that make pumps only speed it up.
export function etaSeconds(miss, rate) {
  if (!miss || !rate || !(rate.m > 0)) return null;
  const d = log10Big(miss) - log10Big(rate);
  if (d > 9) return Infinity;
  return Math.max(1, Math.ceil(Math.pow(10, d) - 1e-6));
}

// The words for a wait: "12 s", "3 min", "2 h"; null when it is too long to be a promise
export function waitWords(seconds) {
  if (!(seconds < 100 * 3600)) return null;
  if (seconds < 100) return t('cl.well.t_s', { n: Math.ceil(seconds) });
  if (seconds < 100 * 60) return t('cl.well.t_m', { n: Math.ceil(seconds / 60) });
  return t('cl.well.t_h', { n: Math.ceil(seconds / 3600) });
}

// What a button that cannot be paid yet says: when it can ("in 12 s"), else how much is missing
export function whenWords(api, miss, rate) {
  const eta = etaSeconds(miss, rate);
  const w = eta === null ? null : waitWords(eta);
  return w ? t('cl.well.eta', { time: w }) : t('cl.well.need', { n: api.fmt(miss) });
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

// Da'sa: heat runs 1..2; `gain` is what it does to the Well while the player taps
export function heatView(state, presence) {
  const heat = Presence.heat(state);
  const hands = log10Big(Well.wellMultiplier(state, PRESENCE.HANDS)), watch = log10Big(Well.wellMultiplier(state, PRESENCE.WATCH));
  return { on: presence === PRESENCE.HANDS, heat, frac: clamp01(heat - 1), warm: heat > 1.005, gain: Math.pow(10, hands - watch) };
}

// What the hero shows: the well, or the Gusher when one is up
export function heroView(state, presence) {
  const g = gusherView(state), h = heatView(state, presence);
  return { mode: g.up ? 'gusher' : 'well', left: g.left, heat: h };
}

// The strip "This run": hidden until 10 Buckets are owned (or a New Well was done)
export function runView(state) {
  const show = state.well.bought[1] >= 10 || state.prestige.wells > 0;
  const pending = Prestige.pendingReserves(state), need = Prestige.newWellNeed(state), wait = Prestige.newWellWait(state);
  if (pending < 1) {
    return { show, stage: 'first', frac: clamp01(log10Big(state.well.runCrude) / Math.log10(P.wellMin)), pending, need, wait };
  }
  return { show, stage: 'pending', frac: clamp01(pending / need), pending, need, wait, ready: Prestige.canNewWell(state) };
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

// A small multiplier with decimals, a big one in the game's notation
export function fmtX(api, x) {
  if (!(x > 0)) return '0';
  return x >= 1000 ? api.fmt(BigNum.from(x)) : String(Math.round(x * 100) / 100);
}

// --- DOM -----------------------------------------------------------------------------------------
const ICONS = ['\u{1F96B}', '\u{1F527}', '\u{1F699}', '\u{1F5FC}', '\u{1F6E2}️', '\u{1F69B}', '\u{1F3DD}️', '\u{1F30D}'];
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
// A buy button: label, price, and (while it cannot be paid) when it can
function buyButton(onClick) {
  const b = button('btn-buy', onClick);
  b.append(el('span', 'lbl'), el('span', 'cost'), el('span', 'when'));
  return b;
}
function setBuy(b, can, label, price, when, api, primary = true) {
  b.classList.toggle('btn-primary', can && primary);
  b.classList.toggle('is-locked', !can);
  b.setAttribute('aria-disabled', String(!can));
  b.querySelector('.lbl').textContent = label;
  b.querySelector('.cost').textContent = t('cl.well.price', { n: api.fmt(price) });
  const w = b.querySelector('.when');
  w.textContent = can ? '' : when;
  w.hidden = can;
}
function bar(cls = '') {
  const b = el('div', 'bar ' + cls);
  b.append(el('i'));
  return b;
}
const setBar = (b, frac) => { b.firstChild.style.width = Math.round(clamp01(frac) * 100) + '%'; };

export function mount(panel, api) {
  if (!document.querySelector('link[data-coreloop-well-css]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = 'css/coreloop-well.css'; link.dataset.coreloopWellCss = '';
    document.head.appendChild(link);
  }
  panel.textContent = '';
  const root = el('div', 'clw');
  panel.appendChild(root);
  let paidTimer = 0;

  // 1. The well -----------------------------------------------------------------------------------
  const hero = el('section', 'card clw-hero');
  const stage = el('div', 'clw-stage');
  const well = button('clw-well', onWellTap);
  well.dataset.guide = 'well.tap';
  well.setAttribute('aria-label', t('cl.well.tap_label'));
  const wellIcon = el('span', 'clw-well-icon', '\u{1F6E2}️');
  wellIcon.setAttribute('aria-hidden', 'true');
  const wellText = el('span', 'clw-well-text');
  well.append(wellIcon, wellText);
  stage.appendChild(well);
  const side = el('div', 'clw-side');
  const rateBox = el('div', 'clw-ratebox');
  rateBox.dataset.guide = 'well.rate';
  const rateBig = el('div', 'clw-rate');
  rateBox.append(rateBig, el('div', 'clw-ratelabel', t('cl.well.rate_label')));
  const heatBox = el('div', 'clw-heat');
  const heatHead = el('div', 'bar-row');
  heatHead.append(el('span', null, t('cl.name.heat')), el('span', 'val'));
  const heatVal = heatHead.lastChild;
  heatVal.hidden = true;
  const heatBar = bar('gold');
  const heatNote = el('p', 'clw-note');
  heatBox.append(heatHead, heatBar, heatNote);
  side.append(rateBox, heatBox);
  const paid = el('p', 'clw-paid');
  paid.setAttribute('role', 'status');
  paid.hidden = true;
  hero.append(stage, side, paid);
  root.appendChild(hero);

  function onWellTap(e) {
    const gusher = Presence.canCatchGusher(api.state);
    let gain;
    if (gusher) {
      const res = api.catchGusher();
      if (res && res.crude) {
        gain = `+${api.fmt(res.crude)}`;
        paid.textContent = t('cl.well.gusher_paid', { n: api.fmt(res.crude) });
        paid.hidden = false;
        clearTimeout(paidTimer);
        paidTimer = setTimeout(() => { paid.hidden = true; }, 5000);
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

  // 2. This run -----------------------------------------------------------------------------------
  const runCard = el('section', 'card clw-card');
  runCard.append(el('h2', 'clw-h', t('cl.well.run_title')));
  const runText = el('p', 'clw-line');
  const runBar = bar('lg gold');
  const runSub = el('p', 'clw-note');
  const runGo = button('clw-run-go', () => api.go('prestige'));
  runGo.textContent = t('cl.well.run_go');
  runCard.append(runText, runBar, runSub, runGo);
  root.appendChild(runCard);

  // 3. Pumps --------------------------------------------------------------------------------------
  const pumpHead = el('div', 'clw-head');
  const pumpTitle = el('div', 'clw-titlebox');
  pumpTitle.append(el('h2', 'clw-h', t('cl.well.pumps_title')), el('p', 'clw-note', t('cl.well.pumps_help')));
  const maxAll = button('clw-max', () => api.act((s) => Well.buyMax(s)));
  maxAll.dataset.guide = 'well.maxall';
  maxAll.textContent = t('cl.well.max_all');
  maxAll.title = t('cl.well.max_all_hint');
  pumpHead.append(pumpTitle, maxAll);
  const maxNote = el('p', 'clw-note', t('cl.well.max_all_hint'));
  root.append(pumpHead, maxNote);

  const list = el('div', 'clw-slots');
  const rows = [];
  for (let k = 1; k <= P.slots; k++) {
    const row = el('article', 'card-row clw-slot');
    const icon = el('span', 'clw-icon', ICONS[k - 1] || '');
    icon.setAttribute('aria-hidden', 'true');
    const info = el('div', 'clw-info');
    const title = el('div', 'clw-title');
    title.append(el('strong', null, slotName(k, true)));
    const have = el('div', 'clw-have');
    const makes = el('div', 'clw-sub');
    const prog = el('div', 'bar-row clw-prog');
    const b = bar();
    prog.append(b, el('span', 'val'));
    info.append(title, have, makes, prog);
    const acts = el('div', 'clw-acts');
    const b1 = buyButton(() => api.act((s) => Well.canBuy(s, k, 1) && Well.buy(s, k, 1) && restart(row, 'cl-pulse')));
    b1.dataset.guide = `well.buy.${k}`;
    const bp = buyButton(() => api.act((s) => Well.canBuy(s, k, Well.packLeft(s, k)) && Well.buy(s, k, Well.packLeft(s, k)) && restart(row, 'cl-pulse')));
    bp.classList.add('clw-pack');
    acts.append(b1, bp);
    row.append(icon, info, acts);
    list.appendChild(row);
    rows.push({ row, have, makes, bar: b, progVal: prog.lastChild, b1, bp });
  }
  root.appendChild(list);

  // 4. Pressure, Flare, Generators, and the one section coming next ---------------------------------
  const pCard = el('section', 'card clw-card');
  const pHead = el('div', 'card-head');
  pHead.append(el('h2', 'clw-h', t('cl.name.pressure')), el('span', 'chip gold'));
  const pChip = pHead.lastChild;
  const pGain = el('p', 'clw-line');
  const pBuy = buyButton(() => api.act((s) => Well.canBuyPressure(s) && Well.buyPressure(s) && restart(pCard, 'cl-pulse')));
  pBuy.classList.add('btn-block');
  pBuy.dataset.guide = 'well.pressure';
  pCard.append(pHead, pGain, pBuy);
  root.appendChild(pCard);

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
    const hv = heroView(s, presence), h = hv.heat;
    const rate = Well.crudePerSecond(s, presence);
    setText(rateBig, a.fmt(rate), false);

    // The well, or the Gusher
    const gusher = hv.mode === 'gusher';
    well.classList.toggle('is-gusher', gusher);
    wellIcon.textContent = gusher ? '\u{26F2}' : '\u{1F6E2}️';
    wellText.textContent = gusher ? `${t('cl.well.gusher_tap')} ${t('cl.well.gusher_left', { n: Math.ceil(hv.left) })}` : t('cl.well.tap_hint');
    well.setAttribute('aria-label', gusher ? wellText.textContent : t('cl.well.tap_label'));
    setText(heatVal, `x${h.heat.toFixed(2)}`, false);
    setBar(heatBar, h.frac);
    heatNote.textContent = h.warm
      ? t('cl.well.heat_on', { name: t('cl.name.heat'), n: h.heat.toFixed(2), gain: fmtX(a, h.gain) })
      : t('cl.well.heat_off');

    // This run
    const r = runView(s);
    runCard.hidden = !r.show;
    if (r.show) {
      setBar(runBar, r.frac);
      runBar.classList.toggle('gold', !r.ready);
      if (r.stage === 'first') {
        runText.textContent = t('cl.well.run_first', { have: a.fmt(s.well.runCrude), goal: a.fmt(BigNum.from(P.wellMin)) });
        runSub.hidden = true;
      } else {
        runText.textContent = t('cl.well.run_pending', { n: r.pending });
        runSub.hidden = false;
        runSub.textContent = r.ready ? t('cl.well.run_ready')
          : r.wait > 0 ? t('cl.well.run_wait', { time: clock(r.wait) })
          : t('cl.well.run_need', { need: fmtX(a, r.need) });
      }
      runGo.hidden = !a.isOpen('tab.prestige');
      runGo.classList.toggle('btn-primary', !!r.ready);
    }

    // Pumps
    const sec = sectionsView((f) => a.isOpen(f));
    maxAll.hidden = maxNote.hidden = !sec.open['well.maxall'];
    const any = canBuyAny(s);
    maxAll.classList.toggle('btn-primary', false);
    maxAll.classList.toggle('is-locked', !any);
    maxAll.setAttribute('aria-disabled', String(!any));

    for (let k = 1; k <= P.slots; k++) {
      const v = slotView(s, k, presence), x = rows[k - 1];
      x.row.hidden = !v.shown;
      if (!v.shown) continue;
      x.row.classList.toggle('is-affordable', v.canBuyOne);
      setText(x.have, t('cl.well.you_have', { n: a.fmt(v.amount) }));
      const w = rowWords(k);
      x.makes.textContent = t(w.key, { n: a.fmt(v.rate), name: w.prev ? t(`cl.slot.${w.prev}`) : '' });
      setBar(x.bar, v.packFrac);
      x.progVal.textContent = t('cl.well.to_double', { n: v.packLeft });
      setBuy(x.b1, v.canBuyOne, t('cl.well.buy_one'), v.cost, v.missingOne ? whenWords(a, v.missingOne, rate) : '', a);
      x.bp.hidden = v.packLeft <= 1;
      setBuy(x.bp, v.canBuyPack, t('cl.well.buy_pack', { n: v.packLeft }), v.packCost, v.missingPack ? whenWords(a, v.missingPack, rate) : '', a, false);
    }

    // Pressure
    pCard.hidden = !sec.open['well.pressure'];
    if (!pCard.hidden) {
      const p = pressureView(s);
      pChip.textContent = t('cl.well.pressure_level', { n: p.level });
      pGain.textContent = t('cl.well.pressure_gain', { n: p.perLevel });
      setBuy(pBuy, p.can, t('cl.well.pressure_buy'), p.cost, p.missing ? whenWords(a, p.missing, rate) : '', a);
    }

    // Flare
    fCard.hidden = !sec.open['well.flare'];
    if (!fCard.hidden) {
      const f = flareView(s);
      fChip.textContent = t('cl.well.flare_now', { n: fmtX(a, f.now) });
      fWould.textContent = f.would > 0 ? t('cl.well.flare_would', { n: fmtX(a, f.would) }) : '';
      fWould.hidden = !(f.would > 0);
      fNote.textContent = f.reason === 'none' ? t('cl.well.flare_none')
        : f.reason === 'low' ? t('cl.well.flare_low', { n: fmtX(a, f.needs) })
        : t('cl.well.flare_burn', { top: t(`cl.slot.${f.top}`) });
      fBtn.classList.toggle('btn-primary', f.can);
      fBtn.classList.toggle('is-locked', !f.can);
      fBtn.setAttribute('aria-disabled', String(!f.can));
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

    // The one closed section coming next
    locked.hidden = sec.lock === null;
    if (sec.lock) locked.textContent = a.lockText(sec.lock);
  }
  const clock = (sec) => {
    const m = Math.floor(sec / 60), r = Math.floor(sec % 60);
    return `${m}:${String(r).padStart(2, '0')}`;
  };
  update(api);
  return { update };
}
