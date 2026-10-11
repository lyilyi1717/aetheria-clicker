// Core-loop Expand screen (CL-16, CL-32, CL-45, behind ?loop=2): New Well, the upgrade tree, New Field,
// Chronicle, Trials, Seals and Crew. It opens with one "ready now" strip; only the next reset is a
// full card (the others are one line and open on a tap); the tree, Trials and Seals are folded to a
// title and a one-line status. Nothing is removed: everything is one tap away. The module id stays `prestige`; the tab says "Expand".
// The shell mounts it: mount(panel, api) -> { update(api) }.
// Staged by the guide: a section shows only when api.isOpen('prestige.<id>') and at most one closed
// one shows, as a single locked line. Each reset says what you get, what starts over and what you keep.
// Logic lives in the pure helpers below (tested in test_cl_ui_prestige.js); the DOM is built once
// in mount and update() only changes text and attributes. Every action goes through api.act and
// is offered only when the system's can... function says so.
import { t } from '../../i18n/index.js';
import { registerStrings } from '../../i18n/coreloop/index.js';
import EN from '../../i18n/coreloop/prestige.en.js';
import AR from '../../i18n/coreloop/prestige.ar.js';
import { P } from '../../systems/coreloop/params.js';
import { FIELDS, FRACTIONS } from '../../systems/coreloop/shared.js';
import * as Prestige from '../../systems/coreloop/Prestige.js';
import * as Seals from '../../systems/coreloop/Seals.js';
import * as Tree from '../../systems/coreloop/Tree.js';
import * as Guide from '../../systems/coreloop/Guide.js';
import { bestNode, mountTree, buyableCount, bankList, anyBought } from './tree.js';
import { makeFold } from './folds.js';

registerStrings(EN, AR);

const DAY = 86400;
const STYLE_ATTR = 'data-coreloop-prestige-css';

// ================================================================== pure helpers
export const log10Big = (b) => (b && b.m > 0 ? Math.log10(b.m) + b.e : -Infinity);
const clamp01 = (x) => (x > 0 ? Math.min(1, x) : 0);
const floor1 = (x) => Math.floor(x * 10) / 10;
// A log10 for display: "47.3", never negative
export const showLog = (x) => (Number.isFinite(x) && x > 0 ? String(floor1(x)) : '0');
export const percent = (fraction) => Math.floor(clamp01(fraction) * 100);

// Time for display: days and hours from a day on, else hours and minutes
export function longTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  if (s >= DAY) return t('cl.prestige.time_dh', { d: Math.floor(s / DAY), h: Math.floor((s % DAY) / 3600) });
  return t('cl.prestige.time_hm', { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60) });
}
// A wait that is minutes long reads as a clock ("4:05"); longer ones as longTime
export function clock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  if (s >= 3600) return longTime(s);
  return t('cl.prestige.time_ms', { m: Math.floor(s / 60), s: String(s % 60).padStart(2, '0') });
}

// ---- staging: which sections of the screen show
// The sections after the New Well card, in the order they come to the player. Each is a guide feature
// `prestige.<id>`. `isOpen` is api.isOpen. Returns { open: [ids to show], locked: id | null } where
// `locked` is the one closed section that comes next (its lock line is the only one shown).
export const SECTIONS = Object.freeze(['tree', 'field', 'chronicle', 'seals', 'trials']);
export function stage(isOpen) {
  const open = SECTIONS.filter(id => isOpen(`prestige.${id}`));
  const locked = SECTIONS.find(id => !isOpen(`prestige.${id}`)) || null;
  return { open, locked };
}
// The stats row shows only what the player has
export function statsShown(state) {
  const p = state.prestige;
  return ['reserves', 'shares', 'pages', 'chronicles'].filter(k => p[k] > 0);
}
// The banks the tree spends (the fallback when the tree's own view is not there)
export function treeBanks(state) {
  return Tree.RINGS.map(ring => ({ ring, n: Tree.bank(state, ring) })).filter(b => b.ring === 'reserves' || b.n > 0);
}

// ---- New Well
export function wellView(state) {
  const pending = Prestige.pendingReserves(state);
  const need = Math.ceil(Prestige.newWellNeed(state));
  const R = state.prestige.reserves;
  return {
    pending, need, can: Prestige.canNewWell(state),
    missing: Math.max(0, need - pending),
    fraction: need > 0 ? clamp01(pending / need) : 1,
    reserves: R, mult: 1 + P.resPer * R, multAfter: 1 + P.resPer * (R + pending)
  };
}
// "Reserve" with one, "Reserves" with more: a key per number so Arabic can have its own forms
const one = (n, key) => (n === 1 ? `${key}1` : key);
export function wellButton(state) {
  const v = wellView(state);
  if (v.can) return { can: true, text: t(one(v.pending, 'cl.prestige.well.btn'), { n: v.pending }) };
  return { can: false, text: t(one(v.missing, 'cl.prestige.well.btn_need'), { n: v.missing }) };
}
// The run the player is in (the first run is 1) and what the Reserves earned so far multiply
export const runNumber = (state) => state.prestige.wells + 1;
export function runLine(state) {
  const R = state.prestige.reserves;
  if (!(state.prestige.wells > 0)) return '';
  return t('cl.prestige.well.run', { n: runNumber(state), mult: Math.round((1 + P.resPer * R) * 100) / 100 });
}
// The line under the bar: before the first New Well what it takes; after it, which run this is
export function wellBarText(state, fmt = String) {
  const v = wellView(state);
  if (v.missing <= 0) return t('cl.prestige.well.bar_enough');
  const key = state.prestige.wells > 0 ? 'cl.prestige.well.bar_run' : 'cl.prestige.well.bar';
  return t(key, { have: fmt(v.pending), need: fmt(v.need), n: runNumber(state) });
}

export function fieldView(state) {
  const have = Math.max(0, log10Big(state.well.bestRunChron));
  const need = Prestige.fieldGateLog(state);
  const fraction = clamp01(have / need);
  return { have, need, fraction, pct: percent(fraction), can: Prestige.canNewField(state), shares: P.sharesPerField };
}
export const choiceId = (c) => (c.kind === 'crew' ? 'crew' : `${c.kind}:${c.field}`);
export function parseChoice(id) {
  if (id === 'crew') return { kind: 'crew' };
  const m = /^(rig|level):(\d+)$/.exec(String(id));
  return m ? { kind: m[1], field: Number(m[2]) } : null;
}
// What a choice card says: { id, kind, title, desc }
export function choiceCard(state, c) {
  if (c.kind === 'crew') {
    return {
      id: 'crew', kind: 'crew',
      title: t('cl.prestige.field.crew', { crew: t('cl.name.crew') }),
      desc: t('cl.prestige.field.crew_desc', { gloss: t('cl.name.crew.gloss'), n: state.prestige.crew, slots: Prestige.crewSlots(state) })
    };
  }
  const fid = FIELDS[c.field];
  const rig = t(`cl.rig.${fid}`), field = t(`cl.field.${fid}`);
  if (c.kind === 'rig') {
    return { id: choiceId(c), kind: 'rig', title: t('cl.prestige.field.rig', { rig }), desc: t('cl.prestige.field.rig_desc', { gloss: t(`cl.rig.${fid}.gloss`), field }) };
  }
  return { id: choiceId(c), kind: 'level', title: t('cl.prestige.field.level', { rig }), desc: t('cl.prestige.field.level_desc', { n: state.fields[c.field].rig, field }) };
}
// The choice in force: the player's pick while it is still offered, else the sim's suggestion
export function effectiveChoice(state, pickId) {
  const offered = Prestige.fieldChoices(state).map(choiceId);
  return pickId && offered.includes(pickId) ? pickId : choiceId(Prestige.suggestedChoice(state));
}
export function fieldButton(state, armed) {
  const v = fieldView(state);
  if (!v.can) return { can: false, text: t('cl.prestige.field.btn_need', { pct: v.pct }) };
  return { can: true, text: armed ? t('cl.prestige.field.confirm') : t('cl.prestige.field.btn', { n: v.shares }) };
}

export function chronicleView(state) {
  const p = state.prestige;
  const needFields = Prestige.chronicleFieldsNeed(state);
  const recordLog = Prestige.chronicleRecordLog(state);
  const have = Math.max(0, log10Big(state.well.bestRunChron));
  return {
    fields: p.newFields, needFields, fieldsLeft: Math.max(0, needFields - p.newFields),
    fieldsFraction: clamp01(p.newFields / needFields),
    hasRecord: Number.isFinite(recordLog), recordLog: Number.isFinite(recordLog) ? Math.ceil(recordLog) : 0, have,
    recordOk: !Number.isFinite(recordLog) || have >= recordLog,
    pages: Prestige.pendingPages(state), shares: Prestige.reblazeShares(p.pages + Prestige.pendingPages(state)),
    can: Prestige.canChronicle(state), suggest: Prestige.suggestChronicle(state)
  };
}
export function chronicleButton(state, armed) {
  const v = chronicleView(state);
  if (v.can) return { can: true, text: armed ? t('cl.prestige.chron.confirm') : t('cl.prestige.chron.btn', { n: v.pages }) };
  if (v.fieldsLeft > 0) return { can: false, text: t('cl.prestige.chron.btn_fields', { n: v.fieldsLeft }) };
  return { can: false, text: t('cl.prestige.chron.btn_record', { need: v.recordLog }) };
}

// The three lines every reset says. layer: 'well' | 'field' | 'chronicle'. `fmt` formats a number
// (api.fmt). Each value is a sentence the player can read before pressing the button.
export function resetLines(state, layer, fmt = String) {
  const crew = t('cl.name.crew');
  if (layer === 'well') {
    const v = wellView(state);
    const mult = (x) => x.toFixed(2);
    return {
      get: v.pending > 0 ? t(one(v.pending, 'cl.prestige.well.get_now'), { n: fmt(v.pending), mult: mult(v.multAfter) }) : t('cl.prestige.well.get_soon', { mult: mult(v.mult) }),
      // a name the player has not met (the burn) is not listed among what they will lose
      starts: state.guide.open['well.flare'] === true || state.well.flare > 1
        ? t('cl.prestige.well.starts', { pressure: t('cl.name.pressure'), flare: t('cl.name.flare') })
        : t('cl.prestige.well.starts_plain', { pressure: t('cl.name.pressure') }),
      keep: t('cl.prestige.well.keep')
    };
  }
  if (layer === 'field') {
    return {
      get: t('cl.prestige.field.get', { n: P.sharesPerField }),
      starts: t('cl.prestige.field.starts'),
      keep: t('cl.prestige.field.keep', { crew })
    };
  }
  const c = chronicleView(state);
  return {
    get: t('cl.prestige.chron.get', { n: fmt(c.pages), shares: fmt(c.shares) }),
    starts: t('cl.prestige.chron.starts'),
    keep: t('cl.prestige.chron.keep', { crew })
  };
}

// A Trial: { status: 'locked' | 'waiting' | 'ready' | 'won', wait, kind, n, can }
export function trialView(state, id) {
  const spec = P.trials.find(([tid]) => tid === id);
  const kind = spec[1], n = spec[2];
  // `wait` is New Wells still to drill, never time
  if (Prestige.hasAutomation(state, id)) return { status: 'won', wait: 0, kind, n, can: false };
  if (!Prestige.trialUnlocked(state, id)) return { status: 'locked', wait: 0, kind, n, can: false };
  const left = Prestige.trialWellsLeft(state, id);
  return { status: left > 0 ? 'waiting' : 'ready', wait: left, kind, n, can: Prestige.canWinTrial(state, id) };
}
export function trialText(state, id) {
  const v = trialView(state, id);
  if (v.status === 'locked') return t(`cl.prestige.trial.locked_${v.kind}`, { n: v.n });
  if (v.status === 'waiting') return t('cl.prestige.trial.waiting', { n: v.wait });
  return t(`cl.prestige.trial.${v.status}`);
}

// A Seal: { n, frac, open, tier, tierId, maxed, fraction, opensIn, nextIn, togo }
export function sealView(state, i) {
  const open = Seals.isSealOpen(state, i);
  const tier = Seals.sealTier(state, i);
  const maxed = Seals.sealMaxed(state, i);
  const hours = state.seals.hours[i];
  const from = tier === 0 ? 0 : P.sealHours[tier - 1];
  const to = maxed ? from : P.sealHours[tier];
  const nextHours = Seals.hoursToNextTier(state, i);
  return {
    n: i + 1, frac: FRACTIONS[Seals.sealFraction(i)], open, tier, maxed,
    tierId: !open ? 'closed' : tier === 0 ? 'open' : Seals.SEAL_TIERS[tier - 1],
    fraction: maxed ? 1 : to > from ? clamp01((hours - from) / (to - from)) : 0,
    opensIn: Seals.secondsToOpen(state, i),
    nextIn: nextHours === null ? null : nextHours * 3600,
    togo: Seals.sealHoursToNext(state, i)
  };
}
export function sealNote(state, i) {
  const v = sealView(state, i);
  if (!v.open) return t('cl.prestige.seal.opens', { time: longTime(v.opensIn) });
  if (v.maxed) return t('cl.prestige.seal.maxed');
  if (v.nextIn === null) return t('cl.prestige.seal.nocrew');
  return t('cl.prestige.seal.next', { time: longTime(v.nextIn) });
}

export function crewView(state) {
  const crew = state.prestige.crew;
  return { crew, slots: Prestige.crewSlots(state), rate: Seals.crewRate(state), free: crew < Prestige.crewSlots(state) };
}

// ---- "ready now": what the strip at the top names, and what the tab dot counts (feel study R10)
const TRIAL_IDS = P.trials.map(([id]) => id);
// The anchors the guide's goal can name on this screen, as the thing they point at
export const ANCHOR_KIND = Object.freeze({
  'prestige.newwell': 'well', 'prestige.newfield': 'field', 'prestige.chronicle': 'chronicle', 'prestige.tree': 'tree'
});
export const RESET_IDS = Object.freeze(['well', 'field', 'chronicle']);
const resetOpen = (id, isOpen) => id === 'well' || isOpen(`prestige.${id}`);
const defaultOpen = (state) => (f) => Guide.isOpen(state, f);

// { ready: { well, field, chronicle, tree, trial }, order: [kinds, the strip's button goes to the
// first], buyable, best (the tree node worth buying first), trials: [ids that can be taken], count }
// `goalAnchor` is the bar's goal when it is on this screen: what it names goes first.
export function readyView(state, isOpen = defaultOpen(state), goalAnchor = null) {
  const ready = {
    well: Prestige.canNewWell(state),
    field: isOpen('prestige.field') && Prestige.canNewField(state),
    chronicle: isOpen('prestige.chronicle') && Prestige.canChronicle(state),
    tree: false, trial: false
  };
  const treeOpen = isOpen('prestige.tree');
  const buyable = treeOpen ? buyableCount(state, isOpen) : 0;
  ready.tree = buyable > 0;
  const trials = isOpen('prestige.trials') ? TRIAL_IDS.filter(id => trialView(state, id).can) : [];
  ready.trial = trials.length > 0;
  let order = ['chronicle', 'field', 'well', 'tree', 'trial'].filter(k => ready[k]);
  const first = ANCHOR_KIND[goalAnchor];
  if (first && order.includes(first)) order = [first, ...order.filter(k => k !== first)];
  const count = (ready.well ? 1 : 0) + (ready.field ? 1 : 0) + (ready.chronicle ? 1 : 0) + (ready.tree ? 1 : 0) + trials.length;
  return { ready, order, buyable, best: treeOpen ? bestNode(state, isOpen) : null, trials, count };
}
// The tab dot: a reset that is ready, plus 1 if the tree has something affordable, plus the Trials
// that can be taken (the shell asks this without mounting the screen)
export const readyCount = (state) => readyView(state).count;

// How far along a reset is (0..1), for choosing which one is "next"
export function resetFraction(state, id) {
  if (id === 'well') return wellView(state).fraction;
  if (id === 'field') return fieldView(state).fraction;
  const c = chronicleView(state);
  const rec = c.hasRecord ? clamp01(Math.max(0, c.have) / Math.max(1, c.recordLog)) : 1;
  return Math.min(c.fieldsFraction, rec);
}
// The one reset that is a full card: the one the bar's goal names (when it is here), else the first
// that is ready (Chronicle, New Field, New Well), else the open one that is furthest along
export function mainReset(state, isOpen, goal = null) {
  if (goal && goal.here) {
    const k = ANCHOR_KIND[goal.anchor];
    if (k && k !== 'tree' && resetOpen(k, isOpen)) return k;
  }
  const rv = readyView(state, isOpen);
  for (const k of ['chronicle', 'field', 'well']) if (rv.ready[k]) return k;
  let best = 'well', bestF = -1;
  for (const k of ['well', 'field', 'chronicle']) {
    if (!resetOpen(k, isOpen)) continue;
    const f = resetFraction(state, k);
    if (f > bestF + 1e-9) { best = k; bestF = f; }
  }
  return best;
}
// Who gets the one solid gold button: 'well' | 'field' | 'chronicle' | 'tree' | 'strip' | 'trial' | null.
// While the bar's goal is on this screen it is that goal's element (when it can be pressed);
// otherwise the strip's button, or the first ready thing when the strip is not shown yet.
export function goldOwner(goal, rv, stripShown) {
  if (goal && goal.here) {
    const k = ANCHOR_KIND[goal.anchor];
    return k && rv.ready[k] ? k : null;
  }
  if (rv.order.length === 0) return null;
  return stripShown ? 'strip' : rv.order[0];
}
// The strip shows once the player has been round the loop once; before that the screen is the
// New Well card (and then the tree) alone
export const stripShown = (state) => state.prestige.wells >= 2 || state.prestige.totalFields > 0 || state.prestige.chronicles > 0;

// What a reset that is not the full card says in its one line
export function resetLine(state, id, fmt = String) {
  if (id === 'well') {
    const v = wellView(state);
    return v.can ? t(one(v.pending, 'cl.prestige.sum.well_ready'), { n: fmt(v.pending) }) : t('cl.prestige.sum.pct', { pct: percent(v.fraction) });
  }
  if (id === 'field') {
    const v = fieldView(state);
    return v.can ? t('cl.prestige.sum.field_ready', { n: v.shares }) : t('cl.prestige.sum.pct', { pct: v.pct });
  }
  const c = chronicleView(state);
  if (c.can) return t('cl.prestige.sum.chron_ready', { n: fmt(c.pages) });
  if (c.fieldsLeft > 0) return t('cl.prestige.sum.chron_fields', { need: c.needFields, have: c.fields });
  return t('cl.prestige.sum.chron_record', { need: c.recordLog, have: showLog(c.have) });
}
// "Nothing waiting here" and what is next
export function nextLine(state, id, fmt = String) {
  if (id === 'well') {
    const v = wellView(state);
    return t(one(v.need, 'cl.prestige.ready.next_well'), { need: fmt(v.need), have: fmt(v.pending) });
  }
  if (id === 'field') return t('cl.prestige.ready.next_field', { pct: fieldView(state).pct });
  const c = chronicleView(state);
  return c.fieldsLeft > 0
    ? t('cl.prestige.ready.next_chron', { need: c.needFields, have: c.fields })
    : t('cl.prestige.ready.next_chron_record', { need: c.recordLog });
}
// The strip's title: "Ready now: a New Well (+29 Reserves), 3 upgrades you can buy"
export function readyTitle(state, rv, fmt = String) {
  if (rv.count === 0) return t('cl.prestige.ready.none');
  const parts = [];
  for (const k of rv.order) {
    if (k === 'well') { const n = Prestige.pendingReserves(state); parts.push(t(one(n, 'cl.prestige.ready.well'), { n: fmt(n) })); }
    else if (k === 'field') parts.push(t('cl.prestige.ready.field', { n: P.sharesPerField }));
    else if (k === 'chronicle') parts.push(t('cl.prestige.ready.chron', { n: fmt(Prestige.pendingPages(state)) }));
    else if (k === 'tree') parts.push(rv.buyable === 1 && rv.best ? t('cl.prestige.ready.buy', { name: t(`cl.tree.node.${rv.best}`) }) : t('cl.prestige.ready.buys', { n: rv.buyable }));
    else if (k === 'trial') parts.push(rv.trials.length === 1 ? t('cl.prestige.ready.trial', { name: t(`cl.prestige.trial.${rv.trials[0]}`) }) : t('cl.prestige.ready.trials', { n: rv.trials.length }));
  }
  return t('cl.prestige.ready.title', { list: parts.join(t('cl.prestige.ready.join')) });
}
// The strip's button label, for the first thing it names
export function readyButton(state, rv) {
  const k = rv.order[0];
  if (k === 'well') return t('cl.prestige.ready.btn_well');
  if (k === 'field') return t('cl.prestige.ready.btn_field');
  if (k === 'chronicle') return t('cl.prestige.ready.btn_chron');
  if (k === 'tree') return t('cl.prestige.ready.btn_buy', { name: t(`cl.tree.node.${rv.best}`) });
  if (k === 'trial') return t('cl.prestige.ready.btn_trial');
  return '';
}

// ---- one-line statuses of the folded sections
export function treeStatus(state, isOpen, fmt = String) {
  const banks = bankList(state);
  if (banks.length === 0) return t('cl.prestige.tree.status_empty');
  const bank = banks.map(b => t('cl.tree.price', { n: fmt(b.n), cur: t(b.n === 1 ? `cl.tree.cur1.${b.ring}` : `cl.tree.cur.${b.ring}`) })).join(t('cl.prestige.ready.join'));
  const n = buyableCount(state, isOpen);
  if (n === 0) return t('cl.prestige.tree.status_none', { bank });
  return t(one(n, 'cl.prestige.tree.status'), { bank, n });
}
export function trialsStatus(state) {
  const views = TRIAL_IDS.map(id => ({ id, v: trialView(state, id) }));
  const name = (id) => t(`cl.prestige.trial.${id}`);
  const ready = views.find(x => x.v.can);
  if (ready) return t('cl.prestige.trial.status_ready', { name: name(ready.id) });
  const waiting = views.filter(x => x.v.status === 'waiting').sort((a, b) => a.v.wait - b.v.wait)[0];
  if (waiting) return t(one(waiting.v.wait, 'cl.prestige.trial.status_wait'), { name: name(waiting.id), n: waiting.v.wait });
  const locked = views.find(x => x.v.status === 'locked');
  if (locked) return t(`cl.prestige.trial.status_locked_${locked.v.kind}`, { name: name(locked.id), n: locked.v.n });
  return t('cl.prestige.trial.status_won', { n: views.length });
}
export function sealsStatus(state) {
  let open = 0;
  for (let i = 0; i < P.seals; i++) if (Seals.isSealOpen(state, i)) open++;
  const cr = crewView(state);
  return t('cl.prestige.seals.status', { open, total: P.seals, free: Math.max(0, cr.slots - cr.crew) });
}

// ================================================================== DOM
function ensureStyles(doc) {
  if (doc.head.querySelector(`link[${STYLE_ATTR}]`)) return;
  const link = doc.createElement('link');
  link.rel = 'stylesheet'; link.href = 'css/coreloop-prestige.css'; link.setAttribute(STYLE_ATTR, '');
  doc.head.appendChild(link);
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const setText = (node, s) => { if (node && node.textContent !== s) node.textContent = s; };
// A number that moves: set it, and give it a brief highlight when it changed (not on the first paint)
function setNum(node, s) {
  if (!node || node.textContent === s) return;
  const first = node.dataset.painted !== '1';
  node.textContent = s;
  node.dataset.painted = '1';
  if (first) return;
  node.classList.remove('cp-bump'); void node.offsetWidth; node.classList.add('cp-bump');
}

// A button that can be pressed is a gold outline (btn-ready); only `gold` is solid (one per screen)
function setButton(btn, can, text, gold = false) {
  setText(btn, text);
  btn.classList.toggle('btn-primary', can && gold);
  btn.classList.toggle('btn-ready', can && !gold);
  btn.classList.toggle('is-locked', !can);
  btn.setAttribute('aria-disabled', String(!can));
}
function setBar(bar, fraction) {
  const pct = Math.round(clamp01(fraction) * 100);
  bar.firstElementChild.style.width = `${pct}%`;
  bar.setAttribute('aria-valuenow', String(pct));
}

// A fold: a <details> whose summary is a title and a one-line status
const foldOpen = (id, cls, attrs, title, bodyHtml) => `<details class="card cp-fold ${cls}" data-sec="${id}" ${attrs}>
      <summary class="cp-sum"><span class="cp-sumtext"><h2 class="cp-h" data-ref="${id}-title">${title}</h2><span class="cp-sumstatus" data-ref="${id}-sum"></span></span></summary>
      <div class="cp-body">${bodyHtml}</div>
    </details>`;

export function mount(panel, api) {
  const doc = panel.ownerDocument;
  ensureStyles(doc);
  const trialIds = TRIAL_IDS;
  const bar = (ref, tone) => `<div class="bar lg ${tone}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-ref="${ref}"><i></i></div>`;
  // The three lines of a reset
  const lines = (k) => `<ul class="cp-lines">
      ${['get', 'starts', 'keep'].map(l => `<li class="cp-ln cp-ln-${l}"><span class="cp-ln-k">${esc(t(`cl.prestige.line.${l}`))}</span><span class="cp-ln-v" data-ref="${k}-${l}"></span></li>`).join('')}
    </ul>`;

  const wellBody = `
        <p class="cp-run" data-ref="run-line" hidden></p>
        <p class="cp-lead">${esc(t('cl.prestige.well.intro'))}</p>
        ${lines('well')}
        ${bar('well-bar', 'gold')}
        <p class="cp-note" data-ref="well-bar-text"></p>
        <button type="button" class="btn btn-block btn-lg cp-act" data-guide="prestige.newwell" data-ref="well-btn"></button>
        <p class="cp-status" role="status" aria-live="polite" data-ref="well-status"></p>`;
  const fieldBody = `
        <p class="cp-lead">${esc(t('cl.prestige.field.intro'))}</p>
        ${lines('field')}
        ${bar('field-bar', 'aether')}
        <p class="cp-note" data-ref="field-bar-text"></p>
        <fieldset class="cp-fieldset"><legend class="eyebrow">${esc(t('cl.prestige.field.pick'))}</legend>
          <div class="cp-choices" data-ref="choices"></div></fieldset>
        <details class="cp-more">
          <summary data-ref="charter-sum"></summary>
          <div class="cp-choices" data-ref="charters">
            ${Prestige.CHARTERS.map(c => `<label class="cp-choice" data-charter="${c}"><input type="radio" name="cp-charter" value="${c}">
              <span class="cp-choice-body"><strong>${esc(t(`cl.charter.${c}`))}</strong><span>${esc(t(`cl.charter.${c}.gloss`))}</span>
              <span class="tag tier" data-ref="charter-now-${c}" hidden>${esc(t('cl.prestige.field.charter_now', { name: t(`cl.charter.${c}`) }))}</span></span></label>`).join('')}
          </div>
          <p class="cp-note">${esc(t('cl.prestige.field.charter_note'))}</p>
        </details>
        <button type="button" class="btn btn-block btn-lg cp-act" data-guide="prestige.newfield" data-ref="field-btn"></button>
        <p class="cp-status" role="status" aria-live="polite" data-ref="field-status"></p>`;
  const chronBody = `
        <p class="cp-lead">${esc(t('cl.prestige.chron.intro'))}</p>
        ${lines('chron')}
        ${bar('chron-bar', 'sand')}
        <p class="cp-note" data-ref="chron-fields"></p>
        <p class="cp-note" data-ref="chron-record"></p>
        <p class="cp-hint" data-ref="chron-suggest" hidden>${esc(t('cl.prestige.chron.suggest'))}</p>
        <button type="button" class="btn btn-block btn-lg cp-act" data-guide="prestige.chronicle" data-ref="chron-btn"></button>
        <p class="cp-status" role="status" aria-live="polite" data-ref="chron-status"></p>`;
  const trialsBody = `
        <p class="cp-lead">${esc(t('cl.prestige.trials.note'))}</p>
        <div class="cp-trials">
          ${trialIds.map(id => `<div class="card-row cp-trial" data-trial="${id}">
            <div class="cp-trial-body"><strong>${esc(t(`cl.prestige.trial.${id}`))}</strong>
              <span class="cp-gloss">${esc(t(`cl.prestige.trial.${id}.gloss`))}</span>
              <span class="cp-gloss" data-ref="trial-text-${id}"></span></div>
            <span class="chip" data-ref="trial-chip-${id}"></span>
            <button type="button" class="btn btn-sm btn-ready" data-ref="trial-btn-${id}" hidden>${esc(t('cl.prestige.trial.btn'))}</button>
          </div>`).join('')}
        </div>
        <p class="cp-status" role="status" aria-live="polite" data-ref="trial-status"></p>`;
  const sealsBody = `
        <p class="cp-lead">${esc(t('cl.prestige.seals.what', { crew: t('cl.name.crew') }))}</p>
        <p class="cp-line" data-ref="crew-line"></p>
        <p class="cp-note" data-ref="crew-rate"></p>
        <p class="cp-note">${esc(t('cl.prestige.seals.slots'))}</p>
        <div class="cp-seals">
          ${Array.from({ length: P.seals }, (_, i) => `<div class="card-row cp-seal" data-seal="${i}">
            <div class="cp-seal-head"><strong>${esc(t('cl.prestige.seal.name', { n: i + 1 }))}</strong><span class="tag tier" data-ref="seal-tier-${i}"></span></div>
            <span class="cp-gloss">${esc(t('cl.prestige.seal.powers', { frac: t(`cl.frac.${FRACTIONS[Seals.sealFraction(i)]}`) }))}</span>
            <div class="bar dust" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-ref="seal-bar-${i}"><i></i></div>
            <span class="cp-gloss" data-ref="seal-note-${i}"></span>
          </div>`).join('')}
        </div>`;
  const treeBody = `
        <p class="cp-lead">${esc(t('cl.prestige.tree.intro'))}</p>
        <div data-ref="tree-host"></div>`;

  panel.innerHTML = `<div class="cp-screen">
    <div class="cp-stats" data-ref="stats">
      ${['reserves', 'shares', 'pages', 'chronicles'].map(k => `<span class="chip gold" data-ref="chip-${k}">${esc(t(`cl.prestige.stat.${k}`))} <strong class="num" data-ref="stat-${k}"></strong></span>`).join('')}
    </div>
    <div class="cp-stack">
      <section class="card cp-ready cl-reserve" data-ref="strip" aria-live="polite" hidden>
        <p class="cp-ready-title" data-ref="strip-title"></p>
        <p class="cp-ready-sub" data-ref="strip-sub"></p>
        <button type="button" class="btn btn-lg cp-ready-btn" data-ref="strip-btn" hidden></button>
      </section>
      ${foldOpen('well', 'cp-reset', 'open', esc(t('cl.prestige.well.title')), wellBody)}
      ${foldOpen('tree', '', 'data-guide="prestige.tree" hidden', esc(t('cl.prestige.tree.title')), treeBody)}
      ${foldOpen('field', 'cp-reset', 'hidden', esc(t('cl.prestige.field.title')), fieldBody)}
      ${foldOpen('chronicle', 'cp-reset', 'hidden', esc(t('cl.prestige.chron.title')), chronBody)}
      ${foldOpen('trials', '', 'data-guide="prestige.trials" hidden', esc(t('cl.prestige.trials.title')), trialsBody)}
      ${foldOpen('seals', '', 'data-guide="prestige.seals" hidden', esc(t('cl.prestige.seals.title', { crew: t('cl.name.crew') })), sealsBody)}
      <p class="cl-locked" data-ref="locked" hidden></p>
    </div>
    </div>`;

  const refs = {};
  for (const n of panel.querySelectorAll('[data-ref]')) refs[n.dataset.ref] = n;
  const card = (id) => panel.querySelector(`details[data-sec="${id}"]`);
  const SEC = ['well', 'tree', 'field', 'chronicle', 'trials', 'seals'];
  const folds = {};
  for (const id of SEC) folds[id] = makeFold(card(id));
  // the full card of a reset is not a thing to collapse: its summary is only a title
  for (const id of RESET_IDS) {
    card(id).querySelector('summary').addEventListener('click', (e) => { if (card(id).classList.contains('is-main')) e.preventDefault(); });
  }

  // --- view state kept between ticks
  let lastApi = api;
  let pickId = null;            // the player's choice, null = follow the suggestion
  let charterPick;              // undefined until first set
  let choiceSig = '';
  const armed = { field: false, chron: false };
  const timers = {};
  const refresh = () => update(lastApi);
  let stripKind = null, stripBest = null, stripTrial = null;
  let stripMsg = '', stripMsgUntil = 0;
  const popped = new Set();     // a section opens itself once per session when it becomes ready
  const prevReady = {};
  let primed = false;
  let prevGuideOn = false;

  const flash = (c) => { c.classList.remove('cp-flash'); void c.offsetWidth; c.classList.add('cp-flash'); };
  const say = (key, text, cardId) => {
    setText(refs[key], text);
    if (cardId) flash(card(cardId));
    clearTimeout(timers[key]);
    timers[key] = setTimeout(() => setText(refs[key], ''), 7000);
  };
  const stripSay = (text) => {
    stripMsg = text; stripMsgUntil = Date.now() + 6000;
    clearTimeout(timers.strip);
    timers.strip = setTimeout(refresh, 6100);
  };
  const arm = (which) => {
    armed[which] = true;
    clearTimeout(timers[`arm-${which}`]);
    timers[`arm-${which}`] = setTimeout(() => { armed[which] = false; refresh(); }, 4000);
  };
  const disarm = (which) => { armed[which] = false; clearTimeout(timers[`arm-${which}`]); };

  // --- the tree's own view
  const treeView = mountTree(refs['tree-host'], api);

  // --- actions
  function doWell() {
    const s = lastApi.state;
    if (!Prestige.canNewWell(s)) return false;
    const n = Prestige.pendingReserves(s);
    if (lastApi.act((st, ctx) => Prestige.newWell(st, ctx))) {
      const msg = t(one(n, 'cl.prestige.well.done'), { n: lastApi.fmt(n), run: runNumber(lastApi.state) });
      say('well-status', msg, 'well');
      stripSay(msg);
      return true;
    }
    return false;
  }
  refs['well-btn'].addEventListener('click', doWell);
  refs['field-btn'].addEventListener('click', () => {
    const s = lastApi.state;
    if (!Prestige.canNewField(s)) return;
    if (!armed.field) { arm('field'); refresh(); return; }
    disarm('field');
    const choice = parseChoice(effectiveChoice(s, pickId));
    const charter = charterPick || undefined;
    if (lastApi.act((st, ctx) => Prestige.newField(st, choice, charter, ctx))) {
      pickId = null;
      say('field-status', t('cl.prestige.field.done', { n: P.sharesPerField }), 'field');
    }
  });
  refs['chron-btn'].addEventListener('click', () => {
    const s = lastApi.state;
    if (!Prestige.canChronicle(s)) return;
    if (!armed.chron) { arm('chron'); refresh(); return; }
    disarm('chron');
    const pages = Prestige.pendingPages(s);
    if (lastApi.act((st, ctx) => Prestige.chronicle(st, ctx))) say('chron-status', t('cl.prestige.chron.done', { n: pages }), 'chronicle');
  });
  const takeTrial = (id) => {
    if (!Prestige.canWinTrial(lastApi.state, id)) return false;
    if (lastApi.act((st, ctx) => Prestige.winTrial(st, id, ctx))) {
      const msg = t('cl.prestige.trial.done', { name: t(`cl.prestige.trial.${id}`) });
      say('trial-status', msg); stripSay(msg);
      return true;
    }
    return false;
  };
  for (const id of trialIds) refs[`trial-btn-${id}`].addEventListener('click', () => takeTrial(id));
  refs.choices.addEventListener('change', (e) => { if (e.target.name === 'cp-choice') { pickId = e.target.value; refresh(); } });
  refs.charters.addEventListener('change', (e) => { if (e.target.name === 'cp-charter') { charterPick = e.target.value; refresh(); } });

  // the strip's one button does the first thing it names
  refs['strip-btn'].addEventListener('click', () => {
    if (refs['strip-btn'].getAttribute('aria-disabled') === 'true') return;
    if (stripKind === 'well') doWell();
    else if (stripKind === 'field' || stripKind === 'chronicle') {
      // these two ask for a choice and a second tap: take the player to the card
      const c = card(stripKind);
      folds[stripKind].resolve(true, true);
      c.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      flash(c);
    } else if (stripKind === 'tree' && stripBest) {
      let ok = false;
      lastApi.act((st) => { ok = Tree.buy(st, stripBest); });
      if (ok) stripSay(t('cl.tree.bought', { name: t(`cl.tree.node.${stripBest}`) }));
    } else if (stripKind === 'trial' && stripTrial) takeTrial(stripTrial);
  });

  // --- update (about 4 times a second)
  function buildChoices(offered) {
    refs.choices.innerHTML = offered.map(c => `<label class="cp-choice" data-choice="${choiceId(c)}">
      <input type="radio" name="cp-choice" value="${choiceId(c)}"><span class="cp-choice-body">
      <strong data-c="title"></strong><span data-c="desc"></span><span class="tag new" data-c="sugg" hidden>${esc(t('cl.prestige.field.suggested'))}</span></span></label>`).join('');
  }
  const setLines = (k, ls) => { for (const l of ['get', 'starts', 'keep']) setText(refs[`${k}-${l}`], ls[l]); };

  function update(a) {
    lastApi = a;
    const s = a.state, p = s.prestige;
    const st = stage(a.isOpen);
    const goal = typeof a.goal === 'function' ? a.goal() : null;
    const rv = readyView(s, a.isOpen, goal && goal.here ? goal.anchor : null);

    // the stats the player has
    const shown = statsShown(s);
    for (const k of ['reserves', 'shares', 'pages', 'chronicles']) {
      refs[`chip-${k}`].hidden = !shown.includes(k);
      setNum(refs[`stat-${k}`], a.fmt(p[k]));
    }
    refs.stats.hidden = shown.length === 0;

    // sections: open ones show, the next closed one is one locked line
    for (const id of SECTIONS) card(id).hidden = !st.open.includes(id);
    setText(refs.locked, st.locked ? a.lockText(`prestige.${st.locked}`) : '');
    refs.locked.hidden = !st.locked;

    // a section that has just become ready opens itself, once
    const nowReady = { tree: rv.ready.tree && st.open.includes('tree'), trials: rv.ready.trial };
    if (!primed) {
      // landing on the tree for the first time (the ceremony's "Spend them"): it must be open
      if (nowReady.tree && !anyBought(s)) { folds.tree.popOpen(); popped.add('tree'); }
    } else {
      for (const id of Object.keys(nowReady)) {
        if (nowReady[id] && !prevReady[id] && !popped.has(id)) { folds[id].popOpen(); popped.add(id); }
      }
    }
    Object.assign(prevReady, nowReady);
    primed = true;
    // the guide named the tree (a "Show me"): open it for the player
    const guideOn = card('tree').hasAttribute('data-guide-on');
    if (guideOn && !prevGuideOn && st.open.includes('tree')) folds.tree.popOpen();
    prevGuideOn = guideOn;

    // which reset is the full card
    const main = mainReset(s, a.isOpen, goal);
    const owner = goldOwner(goal, rv, stripShown(s));

    // New Well
    const w = wellView(s);
    setLines('well', resetLines(s, 'well', a.fmt));
    setBar(refs['well-bar'], w.fraction);
    setText(refs['well-bar-text'], wellBarText(s, a.fmt));
    setText(refs['run-line'], runLine(s));
    refs['run-line'].hidden = !(p.wells > 0);
    const wb = wellButton(s);
    setButton(refs['well-btn'], wb.can, wb.text, owner === 'well');

    // the tree
    if (st.open.includes('tree')) {
      treeView.update(a, { gold: owner === 'tree' });
      setText(refs['tree-sum'], treeStatus(s, a.isOpen, a.fmt));
      folds.tree.resolve(false);
    }

    // New Field
    if (st.open.includes('field')) {
      const f = fieldView(s);
      setLines('field', resetLines(s, 'field', a.fmt));
      setBar(refs['field-bar'], f.fraction);
      setText(refs['field-bar-text'], f.can ? '' : t('cl.prestige.field.bar', { pct: f.pct, need: f.need, have: showLog(f.have) }));
      refs['field-bar-text'].hidden = f.can;
      const offered = Prestige.fieldChoices(s);
      const sig = offered.map(choiceId).join('|');
      if (sig !== choiceSig) { choiceSig = sig; buildChoices(offered); }
      const eff = effectiveChoice(s, pickId);
      const sugg = choiceId(Prestige.suggestedChoice(s));
      for (const c of offered) {
        const cardEl = refs.choices.querySelector(`[data-choice="${choiceId(c)}"]`);
        const view = choiceCard(s, c);
        setText(cardEl.querySelector('[data-c="title"]'), view.title);
        setText(cardEl.querySelector('[data-c="desc"]'), view.desc);
        cardEl.querySelector('[data-c="sugg"]').hidden = view.id !== sugg;
        const input = cardEl.querySelector('input');
        if (input.checked !== (view.id === eff)) input.checked = view.id === eff;
        cardEl.classList.toggle('is-picked', view.id === eff);
      }
      if (charterPick === undefined) charterPick = p.charter === 'none' ? '' : p.charter;
      for (const c of Prestige.CHARTERS) {
        const cardEl = refs.charters.querySelector(`[data-charter="${c}"]`);
        const input = cardEl.querySelector('input');
        if (input.checked !== (charterPick === c)) input.checked = charterPick === c;
        cardEl.classList.toggle('is-picked', charterPick === c);
        refs[`charter-now-${c}`].hidden = p.charter !== c;
      }
      setText(refs['charter-sum'], t('cl.prestige.field.charter_sum', { name: charterPick ? t(`cl.charter.${charterPick}`) : t('cl.prestige.field.charter_none') }));
      if (!f.can && armed.field) disarm('field');
      const fb = fieldButton(s, armed.field);
      setButton(refs['field-btn'], fb.can, fb.text, owner === 'field');
    }

    // Chronicle
    if (st.open.includes('chronicle')) {
      const c = chronicleView(s);
      setLines('chron', resetLines(s, 'chronicle', a.fmt));
      setBar(refs['chron-bar'], c.fieldsFraction);
      setText(refs['chron-fields'], t('cl.prestige.chron.fields', { have: c.fields, need: c.needFields }));
      setText(refs['chron-record'], c.hasRecord ? t('cl.prestige.chron.record', { need: c.recordLog, have: showLog(c.have) }) : t('cl.prestige.chron.record_none'));
      refs['chron-suggest'].hidden = !c.suggest;
      if (!c.can && armed.chron) disarm('chron');
      const cb = chronicleButton(s, armed.chron);
      setButton(refs['chron-btn'], cb.can, cb.text, owner === 'chronicle');
    }

    // the resets: one full card, the others one line each (and open on a tap)
    for (const id of RESET_IDS) {
      const c = card(id);
      const isMain = id === main;
      c.classList.toggle('is-main', isMain);
      if (!c.hidden) {
        folds[id].resolve(false, isMain);
        setText(refs[`${id}-sum`], resetLine(s, id, a.fmt));
      }
    }

    // Trials
    if (st.open.includes('trials')) {
      for (const id of trialIds) {
        const v = trialView(s, id);
        setText(refs[`trial-text-${id}`], trialText(s, id));
        const chip = refs[`trial-chip-${id}`];
        setText(chip, t(`cl.prestige.trial.chip.${v.status}`));
        chip.className = `chip ${v.status === 'won' ? 'life' : v.status === 'ready' ? 'gold' : ''}`;
        refs[`trial-btn-${id}`].hidden = !v.can;
      }
      setText(refs['trials-sum'], trialsStatus(s));
      folds.trials.resolve(false);
    }

    // Seals and Crew
    if (st.open.includes('seals')) {
      const cr = crewView(s);
      setText(refs['crew-line'], t('cl.prestige.seals.crew', { crew: t('cl.name.crew'), n: cr.crew, slots: cr.slots }));
      setText(refs['crew-rate'], cr.rate > 0 ? t('cl.prestige.seals.rate', { n: cr.rate.toFixed(2) }) : t('cl.prestige.seals.norate'));
      for (let i = 0; i < P.seals; i++) {
        const v = sealView(s, i);
        const tag = refs[`seal-tier-${i}`];
        setText(tag, t(`cl.prestige.tier.${v.tierId}`));
        setBar(refs[`seal-bar-${i}`], v.fraction);
        setText(refs[`seal-note-${i}`], sealNote(s, i));
        tag.closest('.cp-seal').classList.toggle('is-locked', !v.open);
      }
      setText(refs['seals-sum'], sealsStatus(s));
      folds.seals.resolve(false);
    }

    // The ready strip (after the first round of the loop; before it the screen is just the cards)
    const showStrip = stripShown(s);
    refs.strip.hidden = !showStrip;
    if (showStrip) {
      stripKind = rv.order[0] || null;
      stripBest = rv.best;
      stripTrial = rv.trials[0] || null;
      setText(refs['strip-title'], readyTitle(s, rv, a.fmt));
      const showMsg = stripMsg && Date.now() < stripMsgUntil;
      setText(refs['strip-sub'], showMsg ? stripMsg : rv.count === 0 ? nextLine(s, main, a.fmt) : '');
      refs['strip-sub'].hidden = !refs['strip-sub'].textContent;
      refs['strip-btn'].hidden = rv.count === 0;
      if (rv.count > 0) setButton(refs['strip-btn'], true, readyButton(s, rv), owner === 'strip');
    }
  }

  update(api);
  return { update };
}
