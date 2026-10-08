// "Coming up" panel (R54): the next unlocks across systems, how close each is and, where current
// income allows an estimate, roughly when it lands ("~2 h", "~3 days"). It opens from the header
// goal chip (desktop) or from a "Coming up" button in the Refinery card (below 1024px, where the
// header chip is hidden), as a dropdown on desktop and a bottom sheet on phones.
//
// Purely informational (rule 8): nothing here expires, counts down against the player or costs
// anything. ETAs assume the player keeps the current pace:
//   - Oil targets: what's missing / Oil per second (Auto-tap counted, manual clicks not: an upper bound).
//   - Reserve targets: this run's Reserves per second (pending / run time, at least the 10-min
//     minimum run), the pace of drilling runs like this one again and again.
//   - New Well counts (Reserve Shop tiers): the next New Well, then the player's own New Wells
//     per day from the Dallah ledger history, if there is any.
// The pure helpers at the top are exported for tests (test_r54_coming_up.js).

import { BigNum } from '../engine/BigNum.js';
import { BUILDING_DEFINITIONS, getUnlockedTierCount } from '../systems/BuildingSystem.js';
import { MIN_RUN_SECONDS, DUST_MIN_AETHER } from '../systems/PrestigeSystem.js';
import { getTeasers, getUnlockProgress, UNLOCK_BY_TAB, isTabUnlocked } from '../systems/UnlockSystem.js';
import { DUST_SHOP_ITEMS, getNextShopTier } from '../systems/DustShopSystem.js';
import { SHARD_TREE_NODES, hasNode, getShardBalance, getOpenTierCount, isFoundryOpen } from '../systems/ShardTreeSystem.js';
import { getChronicleTranscendsNeeded } from '../systems/ChronicleSystem.js';
import { RATE_MIN_SAMPLES } from '../systems/CalendarSystem.js';
import { t } from '../i18n/index.js';

export const MAX_ITEMS = 5;
const ETA_MAX_SECONDS = 365 * 86400; // beyond a year an estimate means nothing: show progress only
const DESKTOP_QUERY = '(min-width: 1024px)';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp01 = (x) => (Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0);
const big = (v) => (v instanceof BigNum ? v : new BigNum(num(v)));

function ratio(have, need) {
  have = big(have); need = big(need);
  if (need.lte(0)) return 1;
  const r = have.div(need).toNumber();
  return Number.isFinite(r) ? clamp01(r) : (have.gte(need) ? 1 : 0);
}

/**
 * Seconds until `have` reaches `need` at `rate` per second. 0 when already there, null when it
 * can't be estimated (no income) or would take more than a year.
 */
export function etaSeconds(have, need, rate) {
  have = big(have); need = big(need); rate = big(rate);
  if (have.gte(need)) return 0;
  if (rate.lte(0)) return null;
  const s = need.sub(have).div(rate).toNumber();
  return Number.isFinite(s) && s >= 0 && s <= ETA_MAX_SECONDS ? s : null;
}

/** Rough, friendly duration: "Ready", "< 1 min", "~12 min", "~3 h", "~4 days". null -> ''. */
export function formatEta(sec) {
  if (sec === null || sec === undefined || !Number.isFinite(sec) || sec < 0) return '';
  if (sec === 0) return t('comingup.eta.ready');
  if (sec < 60) return t('comingup.eta.soon');
  if (sec < 3600) return t('comingup.eta.min', { n: Math.max(1, Math.round(sec / 60)) });
  if (sec < 48 * 3600) return t('comingup.eta.hours', { n: Math.round(sec / 3600) });
  return t('comingup.eta.days', { n: Math.round(sec / 86400) });
}

/** Reserves per second at this run's pace (0 when this run pays nothing yet). */
export function dustRate(gs, prestige, now = Date.now()) {
  const pending = prestige.getPendingCosmicDust();
  if (!pending.gt(0)) return BigNum.zero();
  const runSec = Math.max(MIN_RUN_SECONDS, (now - num(gs.runStartedAt)) / 1000);
  return pending.div(runSec);
}

/** Seconds until the next New Well can be drilled (0 = now), or null. */
export function nextWellEta(gs, prestige, rate, now = Date.now()) {
  const wait = prestige.getMinRunRemaining(now);
  if (prestige.getPendingCosmicDust().gt(0)) return wait;
  const oil = etaSeconds(gs.totalAetherEarned, DUST_MIN_AETHER, rate);
  return oil === null ? null : Math.max(oil, wait);
}

// New Wells per day from the Dallah ledger's daily history (null with too few days seen)
function wellsPerDay(gs) {
  const h = gs.calendar?.rates?.hist?.ascend;
  if (!Array.isArray(h) || h.length < RATE_MIN_SAMPLES) return null;
  const avg = h.reduce((a, b) => a + num(b), 0) / h.length;
  return avg > 0 ? avg : null;
}

/** Seconds until `wells` more New Wells have been drilled, or null. */
export function wellsEta(gs, prestige, rate, wells, now = Date.now()) {
  if (wells <= 0) return 0;
  const first = nextWellEta(gs, prestige, rate, now);
  if (wells === 1) return first;
  const perDay = wellsPerDay(gs);
  if (first === null || perDay === null) return null;
  const s = first + ((wells - 1) / perDay) * 86400;
  return s <= ETA_MAX_SECONDS ? s : null;
}

// ---- Candidates, one per system ----------------------------------------------------------------
// Each returns null or { id, icon, text, pct, eta, tab }. `tab` is where the row leads.

function nextGenerator(gs, buildings, rate) {
  const def = BUILDING_DEFINITIONS.find(d => buildings.isTierUnlocked(d.id) && !(gs.buildings[d.id]?.count > 0));
  if (!def) return null;
  const cost = buildings.getBuildingCost(def.id, 1);
  return {
    id: 'generator', icon: def.icon, tab: 'monolith',
    text: t('goal.building', { name: def.name, n: cost.format('standard', 2) }),
    pct: ratio(gs.aether, cost), eta: etaSeconds(gs.aether, cost, rate)
  };
}

function tabTeasers(gs, prestige, rate, now) {
  const out = [];
  for (const tab of getTeasers(gs)) {
    const def = UNLOCK_BY_TAB.get(tab);
    const p = getUnlockProgress(gs, tab);
    if (!def || !p) continue;
    let eta = null;
    if (tab === 'prestige') eta = nextWellEta(gs, prestige, rate, now);
    else if (['talents', 'leaderboard', 'calendar'].includes(tab)) eta = wellsEta(gs, prestige, rate, 1, now);
    else if (tab === 'combat') eta = stallsEta(gs, rate);
    // Same surprise as the side nav teaser: only the New Well tab is named before it opens
    const name = tab === 'prestige' ? def.name : '???';
    out.push({ id: `tab-${tab}`, icon: tab === 'prestige' ? def.icon : '🔒', tab: null, text: t('comingup.tab', { name, what: p.text }), pct: clamp01(p.pct), eta });
  }
  return out;
}

// Oil for the Shawarma Stalls still missing for the Tower (10 owned)
function stallsEta(gs, rate) {
  const have = num(gs.buildings?.tapper?.count);
  const left = 10 - have;
  if (left <= 0) return 0;
  const def = BUILDING_DEFINITIONS[0];
  const cost = def.baseCost.mul(new BigNum(def.costMult).pow(have)).mul(new BigNum(def.costMult).pow(left).sub(1).div(def.costMult - 1));
  return etaSeconds(gs.aether, cost, rate);
}

function nextShopTier(gs, prestige, rate, now) {
  if (!isTabUnlocked(gs, 'prestige')) return null;
  const tier = getNextShopTier(gs);
  if (tier === null) return null;
  const have = num(gs.ascensionCount);
  const n = DUST_SHOP_ITEMS.filter(d => d.tier === tier).length;
  return {
    id: 'shop', icon: '🛒', tab: 'prestige',
    text: t(n === 1 ? 'comingup.shop1' : 'comingup.shop', { n, k: tier, frac: `${have}/${tier}` }),
    pct: clamp01(have / tier), eta: wellsEta(gs, prestige, rate, tier - have, now)
  };
}

function nextField(gs, prestige, rate, now) {
  if (num(gs.ascensionCount) < 1 || !prestige.getTranscendGate) return null;
  const gate = prestige.getTranscendGate();
  const total = gs.totalCosmicDust || BigNum.zero();
  const pending = prestige.getPendingCosmicDust();
  const after = total.add(pending.gt(0) ? pending : BigNum.zero());
  let eta;
  if (total.gte(gate)) eta = 0;
  else if (after.gte(gate)) eta = nextWellEta(gs, prestige, rate, now);
  else {
    const left = etaSeconds(after, gate, dustRate(gs, prestige, now));
    const wait = prestige.getMinRunRemaining(now);
    eta = left === null ? null : Math.max(left, wait);
  }
  const tiers = getUnlockedTierCount(gs);
  const nextTiers = getUnlockedTierCount({ transcendenceCount: num(gs.transcendenceCount) + 1, chronicle: gs.chronicle });
  const gen = nextTiers > tiers ? BUILDING_DEFINITIONS[nextTiers - 1] : null;
  // One parameter for the fraction, so Arabic keeps "100/400" left to right (t() isolates it)
  const frac = `${total.format('standard', 0)}/${gate.format('standard', 0)}`;
  const text = gen
    ? t('comingup.field_gen', { name: gen.name, frac })
    : t('comingup.field', { frac });
  return { id: 'field', icon: gen ? gen.icon : '🌍', tab: 'prestige', text, pct: ratio(total, gate), eta };
}

// The cheapest Share Tree node the player could buy next (requirements met, tier open)
function nextNode(gs, prestige, fieldEta) {
  if (num(gs.transcendenceCount) < 1 && !gs.totalFractureShards?.gt?.(0)) return null;
  const open = SHARD_TREE_NODES.filter(nd => !hasNode(gs, nd.id)
    && nd.requires.every(r => hasNode(gs, r))
    && (nd.branch !== 'foundry' || (getOpenTierCount(gs) >= nd.tier && isFoundryOpen(gs))));
  if (!open.length) return null;
  const node = open.reduce((a, b) => (b.cost < a.cost ? b : a));
  const have = getShardBalance(gs);
  let eta = null;
  if (have >= node.cost) eta = 0;
  else if (fieldEta !== null && have + num(prestige.getTranscendShards?.().base) >= node.cost) eta = fieldEta;
  return {
    id: 'node', icon: node.icon, tab: 'prestige',
    text: t('comingup.node', { name: node.name, frac: `${Math.min(have, node.cost)}/${node.cost}` }),
    pct: clamp01(have / node.cost), eta
  };
}

// The unlit Seal closest to lighting (Dallah tab)
function nextSeal(gs) {
  const cal = gs.calendarSystem;
  if (!cal?.getSeals || !isTabUnlocked(gs, 'calendar')) return null;
  let best = null;
  for (const s of cal.getSeals()) if (!s.lit && (!best || s.pct > best.pct)) best = s;
  if (!best) return null;
  return { id: 'seal', icon: best.icon, tab: 'calendar', text: t('comingup.seal', { name: best.name, what: best.desc }), pct: clamp01(best.pct), eta: null };
}

// The Chronicle gate (New Fields this layer; the first one also wants Seal set I)
function nextChronicle(gs) {
  const fields = num(gs.transcendenceCount);
  if (fields < 1) return null;
  const need = getChronicleTranscendsNeeded(gs);
  return {
    id: 'chronicle', icon: '📖', tab: 'chronicle',
    text: t('comingup.chronicle', { frac: `${Math.min(fields, need)}/${need}` }),
    pct: clamp01(fields / need), eta: fields >= need ? 0 : null
  };
}

/**
 * The next unlocks, soonest first: ready ones, then by ETA, then the rest by progress.
 * ctx = { buildings, prestige, now? }. Returns at most `max` items.
 */
export function getComingUp(gs, { buildings, prestige, now = Date.now() }, max = MAX_ITEMS) {
  // Production plus Auto-tap (R52), which taps on its own while the player is away
  const prod = gs.getNetAetherPerSecond ? gs.getNetAetherPerSecond() : BigNum.zero();
  const rate = gs.getAutoTapPerSecond ? prod.add(gs.getAutoTapPerSecond()) : prod;
  const field = nextField(gs, prestige, rate, now);
  const items = [
    nextGenerator(gs, buildings, rate),
    ...tabTeasers(gs, prestige, rate, now),
    nextShopTier(gs, prestige, rate, now),
    field,
    nextNode(gs, prestige, field ? field.eta : null),
    nextSeal(gs),
    nextChronicle(gs)
  ].filter(Boolean);
  return sortItems(items).slice(0, max);
}

/** Ready first, then known ETAs (soonest first), then unknown ETAs by progress (closest first). */
export function sortItems(items) {
  const key = (it) => (it.eta === null || it.eta === undefined ? Infinity : it.eta);
  return [...items].sort((a, b) => key(a) - key(b) || b.pct - a.pct);
}

// ---- UI ------------------------------------------------------------------------------------------

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export class ComingUpUI {
  constructor(app) {
    this.app = app;
    this.timer = 1;
    this.key = '';
  }

  build() {
    if (typeof document === 'undefined') return;
    this.scrim = document.createElement('div');
    this.scrim.className = 'cu-scrim';
    this.scrim.hidden = true;
    this.panel = document.createElement('div');
    this.panel.id = 'coming-up';
    this.panel.className = 'coming-up';
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', t('comingup.title'));
    this.panel.hidden = true;
    this.panel.innerHTML = '<div class="handle" aria-hidden="true"></div>'
      + `<div class="cu-head"><h3 class="cu-title">${esc(t('comingup.title'))}</h3>`
      + `<button type="button" class="btn btn-sm btn-ghost cu-close" aria-label="${esc(t('tip.close'))}">✕</button></div>`
      + `<p class="cu-hint">${esc(t('comingup.hint'))}</p><ul class="cu-list"></ul>`;
    this.list = this.panel.querySelector('.cu-list');
    document.body.append(this.scrim, this.panel);

    this.scrim.addEventListener('click', () => this.close());
    this.panel.querySelector('.cu-close').addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); });
    this.list.addEventListener('click', (e) => {
      const row = e.target.closest('button.cu-row[data-tab]');
      if (!row) return;
      this.close();
      this.app.switchTab(row.dataset.tab);
    });

    // Below 1024px the header chip is hidden: the same entry lives in the Refinery card
    this.inline = document.createElement('button');
    this.inline.type = 'button';
    this.inline.className = 'goal goal-inline';
    this.inline.setAttribute('aria-haspopup', 'dialog');
    this.inline.innerHTML = '<span class="goal-ic" aria-hidden="true">🎯</span>'
      + `<span class="goal-text"><b>${esc(t('comingup.title'))}</b> · <span class="cu-next"></span></span>`
      + '<span class="bar gold"><i></i></span>';
    this.inlineNext = this.inline.querySelector('.cu-next');
    this.inlineFill = this.inline.querySelector('.bar > i');
    document.querySelector('#tab-monolith .monolith-section')?.append(this.inline);
    this.inline.addEventListener('click', () => this.toggle());
  }

  get isOpen() { return !!this.panel && !this.panel.hidden; }

  toggle() { if (this.isOpen) this.close(); else this.open(); }

  open() {
    if (!this.panel) return;
    this.render(true);
    this.panel.hidden = false;
    // Phone and tablet: a bottom sheet over a scrim. Desktop: a dropdown under the header.
    const desktop = !!window.matchMedia?.(DESKTOP_QUERY).matches;
    this.panel.classList.toggle('is-sheet', !desktop);
    this.scrim.hidden = false;
    this.panel.querySelector('.cu-close').focus({ preventScroll: true });
  }

  close() {
    if (!this.isOpen) return;
    this.panel.hidden = true;
    this.scrim.hidden = true;
  }

  items() {
    const { gameState, buildingSystem, prestigeSystem } = this.app;
    return getComingUp(gameState, { buildings: buildingSystem, prestige: prestigeSystem });
  }

  update(dt) {
    this.timer += dt;
    if (this.timer < 1) return;
    this.timer = 0;
    this.render(false);
  }

  render(force) {
    if (!this.panel) return;
    const items = this.items();
    const first = items[0];
    if (this.inline) {
      const txt = first ? first.text : t('comingup.none');
      if (this.inlineNext.textContent !== txt) this.inlineNext.textContent = txt;
      this.inlineFill.style.width = `${Math.round((first?.pct || 0) * 100)}%`;
    }
    if (!force && !this.isOpen) return;
    const html = items.length ? items.map(it => rowHtml(it, this.app.gameState)).join('') : `<li class="cu-empty">${esc(t('comingup.none'))}</li>`;
    if (html !== this.key) {
      this.key = html;
      this.list.innerHTML = html;
    }
  }
}

// A row that leads somewhere is a button (keyboard and screen readers); a locked one is not
function rowHtml(it, gs) {
  const pct = Math.round(it.pct * 100);
  const eta = formatEta(it.eta);
  const link = !!it.tab && isTabUnlocked(gs, it.tab);
  const tag = link ? 'button' : 'div';
  const attrs = link ? ` type="button" data-tab="${esc(it.tab)}"` : '';
  return `<li><${tag} class="cu-row${it.eta === 0 ? ' is-ready' : ''}"${attrs}>`
    + `<span class="cu-ic" aria-hidden="true">${it.icon}</span>`
    + `<span class="cu-body"><span class="cu-text">${esc(it.text)}</span>`
    + `<span class="bar-row"><span class="bar gold"><i style="width:${pct}%"></i></span><span class="val num">${pct}%</span></span></span>`
    + (eta ? `<span class="cu-eta num">${esc(eta)}</span>` : '')
    + `</${tag}></li>`;
}
