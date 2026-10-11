// Core-loop Expand screen (CL-16, CL-32, behind ?loop=2): New Well, the upgrade tree, New Field,
// Chronicle, Trials, Seals and Crew. The module id stays `prestige`; the tab says "Expand".
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
  if (Prestige.hasAutomation(state, id)) return { status: 'won', wait: 0, kind, n, can: false };
  if (!Prestige.trialUnlocked(state, id)) return { status: 'locked', wait: 0, kind, n, can: false };
  const wait = Math.max(0, Prestige.trialReadyAt(state, id) - state.t);
  return { status: wait > 0 ? 'waiting' : 'ready', wait, kind, n, can: Prestige.canWinTrial(state, id) };
}
export function trialText(state, id) {
  const v = trialView(state, id);
  if (v.status === 'locked') return t(`cl.prestige.trial.locked_${v.kind}`, { n: v.n });
  if (v.status === 'waiting') return t('cl.prestige.trial.waiting', { time: longTime(v.wait) });
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

function setButton(btn, can, text) {
  setText(btn, text);
  btn.classList.toggle('btn-primary', can);
  btn.classList.toggle('is-locked', !can);
  btn.setAttribute('aria-disabled', String(!can));
}
function setBar(bar, fraction) {
  const pct = Math.round(clamp01(fraction) * 100);
  bar.firstElementChild.style.width = `${pct}%`;
  bar.setAttribute('aria-valuenow', String(pct));
}

export function mount(panel, api) {
  const doc = panel.ownerDocument;
  ensureStyles(doc);
  const trialIds = P.trials.map(([id]) => id);
  const bar = (ref, tone) => `<div class="bar lg ${tone}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-ref="${ref}"><i></i></div>`;
  const row = (label, ref) => `<div class="cp-row"><span>${esc(label)}</span><strong class="num" data-ref="${ref}"></strong></div>`;
  // The three lines of a reset
  const lines = (k) => `<ul class="cp-lines">
      ${['get', 'starts', 'keep'].map(l => `<li class="cp-ln cp-ln-${l}"><span class="cp-ln-k">${esc(t(`cl.prestige.line.${l}`))}</span><span class="cp-ln-v" data-ref="${k}-${l}"></span></li>`).join('')}
    </ul>`;

  panel.innerHTML = `<div class="cp-screen">
    <div class="cp-stats" data-ref="stats">
      ${['reserves', 'shares', 'pages', 'chronicles'].map(k => `<span class="chip gold" data-ref="chip-${k}">${esc(t(`cl.prestige.stat.${k}`))} <strong class="num" data-ref="stat-${k}"></strong></span>`).join('')}
    </div>
    <div class="cp-stack">
      <section class="card cp-card cp-main" data-ref="card-well">
        <h2 class="cp-h">${esc(t('cl.prestige.well.title'))}</h2>
        <p class="cp-run" data-ref="run-line" hidden></p>
        <p class="cp-lead">${esc(t('cl.prestige.well.intro'))}</p>
        ${lines('well')}
        ${bar('well-bar', 'gold')}
        <p class="cp-note" data-ref="well-bar-text"></p>
        <button type="button" class="btn btn-block btn-lg cp-act" data-guide="prestige.newwell" data-ref="well-btn"></button>
        <p class="cp-status" role="status" aria-live="polite" data-ref="well-status"></p>
      </section>

      <section class="card cp-card" data-sec="tree" data-guide="prestige.tree" data-ref="card-tree" hidden>
        <h2 class="cp-h">${esc(t('cl.prestige.tree.title'))}</h2>
        <p class="cp-lead">${esc(t('cl.prestige.tree.intro'))}</p>
        <div class="cp-banks" data-ref="tree-banks"></div>
        <div data-ref="tree-host"></div>
      </section>

      <section class="card cp-card cp-main" data-sec="field" data-ref="card-field" hidden>
        <h2 class="cp-h">${esc(t('cl.prestige.field.title'))}</h2>
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
        <p class="cp-status" role="status" aria-live="polite" data-ref="field-status"></p>
      </section>

      <section class="card cp-card cp-main" data-sec="chronicle" data-ref="card-chron" hidden>
        <h2 class="cp-h">${esc(t('cl.prestige.chron.title'))}</h2>
        <p class="cp-lead">${esc(t('cl.prestige.chron.intro'))}</p>
        ${lines('chron')}
        ${bar('chron-bar', 'sand')}
        <p class="cp-note" data-ref="chron-fields"></p>
        <p class="cp-note" data-ref="chron-record"></p>
        <p class="cp-hint" data-ref="chron-suggest" hidden>${esc(t('cl.prestige.chron.suggest'))}</p>
        <button type="button" class="btn btn-block btn-lg cp-act" data-guide="prestige.chronicle" data-ref="chron-btn"></button>
        <p class="cp-status" role="status" aria-live="polite" data-ref="chron-status"></p>
      </section>

      <section class="card cp-card" data-sec="trials" data-guide="prestige.trials" data-ref="card-trials" hidden>
        <h2 class="cp-h">${esc(t('cl.prestige.trials.title'))}</h2>
        <p class="cp-lead">${esc(t('cl.prestige.trials.note'))}</p>
        <div class="cp-trials">
          ${trialIds.map(id => `<div class="card-row cp-trial" data-trial="${id}">
            <div class="cp-trial-body"><strong>${esc(t(`cl.prestige.trial.${id}`))}</strong>
              <span class="cp-gloss">${esc(t(`cl.prestige.trial.${id}.gloss`))}</span>
              <span class="cp-gloss" data-ref="trial-text-${id}"></span></div>
            <span class="chip" data-ref="trial-chip-${id}"></span>
            <button type="button" class="btn btn-sm btn-primary" data-ref="trial-btn-${id}" hidden>${esc(t('cl.prestige.trial.btn'))}</button>
          </div>`).join('')}
        </div>
        <p class="cp-status" role="status" aria-live="polite" data-ref="trial-status"></p>
      </section>

      <section class="card cp-card" data-sec="seals" data-guide="prestige.seals" data-ref="card-seals" hidden>
        <h2 class="cp-h">${esc(t('cl.prestige.seals.title'))}</h2>
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
        </div>
      </section>

      <p class="cl-locked" data-ref="locked" hidden></p>
    </div>
    </div>`;

  const refs = {};
  for (const n of panel.querySelectorAll('[data-ref]')) refs[n.dataset.ref] = n;

  // --- view state kept between ticks
  let lastApi = api;
  let pickId = null;            // the player's choice, null = follow the suggestion
  let charterPick;              // undefined until first set
  let choiceSig = '';
  const armed = { field: false, chron: false };
  const timers = {};
  const refresh = () => update(lastApi);

  const flash = (card) => {
    card.classList.remove('cp-flash'); void card.offsetWidth; card.classList.add('cp-flash');
  };
  const say = (key, text, card) => {
    setText(refs[key], text);
    if (card) flash(refs[card]);
    clearTimeout(timers[key]);
    timers[key] = setTimeout(() => setText(refs[key], ''), 7000);
  };
  const arm = (which) => {
    armed[which] = true;
    clearTimeout(timers[`arm-${which}`]);
    timers[`arm-${which}`] = setTimeout(() => { armed[which] = false; refresh(); }, 4000);
  };
  const disarm = (which) => { armed[which] = false; clearTimeout(timers[`arm-${which}`]); };

  // --- the tree's own view, when it exists (another item builds js/ui/coreloop/tree.js)
  let treeView = null, treeTried = false;
  function mountTree() {
    if (treeTried) return;
    treeTried = true;
    const file = './tree.js';           // a variable, so a missing file is a failed import, not a build error
    import(file).then((m) => {
      if (typeof m.mountTree !== 'function') return;
      treeView = m.mountTree(refs['tree-host'], lastApi);
      refs['tree-banks'].hidden = true;
      if (treeView && treeView.update) treeView.update(lastApi);
    }).catch(() => { /* no tree view yet: the banks stay */ });
  }

  // --- actions
  refs['well-btn'].addEventListener('click', () => {
    const s = lastApi.state;
    if (!Prestige.canNewWell(s)) return;
    const n = Prestige.pendingReserves(s);
    if (lastApi.act((st, ctx) => Prestige.newWell(st, ctx))) {
      say('well-status', t(one(n, 'cl.prestige.well.done'), { n: lastApi.fmt(n), run: runNumber(lastApi.state) }), 'card-well');
    }
  });
  refs['field-btn'].addEventListener('click', () => {
    const s = lastApi.state;
    if (!Prestige.canNewField(s)) return;
    if (!armed.field) { arm('field'); refresh(); return; }
    disarm('field');
    const choice = parseChoice(effectiveChoice(s, pickId));
    const charter = charterPick || undefined;
    if (lastApi.act((st, ctx) => Prestige.newField(st, choice, charter, ctx))) {
      pickId = null;
      say('field-status', t('cl.prestige.field.done', { n: P.sharesPerField }), 'card-field');
    }
  });
  refs['chron-btn'].addEventListener('click', () => {
    const s = lastApi.state;
    if (!Prestige.canChronicle(s)) return;
    if (!armed.chron) { arm('chron'); refresh(); return; }
    disarm('chron');
    const pages = Prestige.pendingPages(s);
    if (lastApi.act((st, ctx) => Prestige.chronicle(st, ctx))) say('chron-status', t('cl.prestige.chron.done', { n: pages }), 'card-chron');
  });
  for (const id of trialIds) {
    refs[`trial-btn-${id}`].addEventListener('click', () => {
      if (!Prestige.canWinTrial(lastApi.state, id)) return;
      if (lastApi.act((st, ctx) => Prestige.winTrial(st, id, ctx))) say('trial-status', t('cl.prestige.trial.done', { name: t(`cl.prestige.trial.${id}`) }));
    });
  }
  refs.choices.addEventListener('change', (e) => { if (e.target.name === 'cp-choice') { pickId = e.target.value; refresh(); } });
  refs.charters.addEventListener('change', (e) => { if (e.target.name === 'cp-charter') { charterPick = e.target.value; refresh(); } });

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

    // the stats the player has
    const shown = statsShown(s);
    for (const k of ['reserves', 'shares', 'pages', 'chronicles']) {
      refs[`chip-${k}`].hidden = !shown.includes(k);
      setNum(refs[`stat-${k}`], a.fmt(p[k]));
    }
    refs.stats.hidden = shown.length === 0;

    // sections: open ones show, the next closed one is one locked line
    for (const id of SECTIONS) {
      const card = refs[id === 'chronicle' ? 'card-chron' : `card-${id}`];
      card.hidden = !st.open.includes(id);
    }
    setText(refs.locked, st.locked ? a.lockText(`prestige.${st.locked}`) : '');
    refs.locked.hidden = !st.locked;

    // New Well
    const w = wellView(s);
    setLines('well', resetLines(s, 'well', a.fmt));
    setBar(refs['well-bar'], w.fraction);
    setText(refs['well-bar-text'], wellBarText(s, a.fmt));
    setText(refs['run-line'], runLine(s));
    refs['run-line'].hidden = !(p.wells > 0);
    const wb = wellButton(s);
    setButton(refs['well-btn'], wb.can, wb.text);

    // the tree
    if (st.open.includes('tree')) {
      mountTree();
      if (treeView && treeView.update) treeView.update(a);
      const banks = treeBanks(s);
      const host = refs['tree-banks'];
      if (host.children.length !== banks.length) {
        host.innerHTML = banks.map(b => `<div class="cp-row"><span>${esc(t(`cl.prestige.bank.${b.ring}`))}</span><strong class="num" data-bank="${b.ring}"></strong></div>`).join('');
      }
      for (const b of banks) setNum(host.querySelector(`[data-bank="${b.ring}"]`), a.fmt(b.n));
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
        const card = refs.choices.querySelector(`[data-choice="${choiceId(c)}"]`);
        const view = choiceCard(s, c);
        setText(card.querySelector('[data-c="title"]'), view.title);
        setText(card.querySelector('[data-c="desc"]'), view.desc);
        card.querySelector('[data-c="sugg"]').hidden = view.id !== sugg;
        const input = card.querySelector('input');
        if (input.checked !== (view.id === eff)) input.checked = view.id === eff;
        card.classList.toggle('is-picked', view.id === eff);
      }
      if (charterPick === undefined) charterPick = p.charter === 'none' ? '' : p.charter;
      for (const c of Prestige.CHARTERS) {
        const card = refs.charters.querySelector(`[data-charter="${c}"]`);
        const input = card.querySelector('input');
        if (input.checked !== (charterPick === c)) input.checked = charterPick === c;
        card.classList.toggle('is-picked', charterPick === c);
        refs[`charter-now-${c}`].hidden = p.charter !== c;
      }
      setText(refs['charter-sum'], t('cl.prestige.field.charter_sum', { name: charterPick ? t(`cl.charter.${charterPick}`) : t('cl.prestige.field.charter_none') }));
      if (!f.can && armed.field) disarm('field');
      const fb = fieldButton(s, armed.field);
      setButton(refs['field-btn'], fb.can, fb.text);
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
      setButton(refs['chron-btn'], cb.can, cb.text);
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
    }
  }

  update(api);
  return { update };
}
