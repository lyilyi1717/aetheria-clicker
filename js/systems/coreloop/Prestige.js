// Prestige (docs/core-loop-plan.md CL-9): New Well → New Field → Chronicle, Trials, Charters, Crew.
// A port of pendingReserves, maybeNewWell, fieldGateLog, maybeNewField, maybeChronicle and trials
// in sim/redesign/model.mjs. Writes state.prestige only; the Well and the Rigs are reset through
// their own files. The sim resets as soon as it may and picks for the player; here each layer is
// a gate (`can…`), an action, and the sim's pick offered as a suggestion.
import { P } from './params.js';
import { FIELDS, HIT, NO_CONTEXT } from './shared.js';
import * as Well from './Well.js';
import * as Rigs from './Rigs.js';
import * as Tree from './Tree.js';

const DAY = 86400;
const log10Big = (b) => (b.m > 0 ? Math.log10(b.m) + b.e : -Infinity);

// --- Trials (automation) -------------------------------------------------------------------------
// A Trial unlocks at the n-th New Well or New Field ever (P.trials) and is won once.
function unlockTrials(state, kind, count) {
  for (const [id, k, n] of P.trials) {
    const tr = state.prestige.trials[id];
    if (k === kind && count === n && tr.unlockedAt === null) tr.unlockedAt = state.t;
  }
}
export const trialUnlocked = (state, id) => state.prestige.trials[id].unlockedAt !== null;
// The automations: 'autoBuy', 'autoWell', 'autoFlare'. Auto-Well only acts with Auto-Buy.
export const hasAutomation = (state, id) => state.prestige.trials[id].won === true;
// Loop time from which Trial `id` can be won (null while locked)
export function trialReadyAt(state, id) {
  const at = state.prestige.trials[id].unlockedAt;
  return at === null ? null : at + P.trialDelay;
}
export const canWinTrial = (state, id) => {
  const tr = state.prestige.trials[id];
  return !tr.won && tr.unlockedAt !== null && state.t - tr.unlockedAt >= P.trialDelay;
};
export function winTrial(state, id, ctx = NO_CONTEXT) {
  if (!canWinTrial(state, id)) return false;
  state.prestige.trials[id].won = true;
  ctx.emit('trial', HIT.MAJOR, { id });
  return true;
}
// The sim's rule until Trials are real challenge runs: every ready Trial is won by a Hands-on
// stretch of at least P.trialMinSec. The loop driver calls this with the stretch's length.
export function trials(state, stretchSeconds, ctx = NO_CONTEXT) {
  if (!(stretchSeconds >= P.trialMinSec)) return false;
  let any = false;
  for (const [id] of P.trials) if (winTrial(state, id, ctx)) any = true;
  return any;
}

// --- New Well ------------------------------------------------------------------------------------
// Reserves a New Well would pay now: floor(resBase · log10(run Crude / wellMin)^resPow)
export function pendingReserves(state) {
  const x = log10Big(state.well.runCrude) - Math.log10(P.wellMin);
  return x > 0 ? Math.floor(P.resBase * Math.pow(x, P.resPow) * Tree.bonus(state, 'reserves')) : 0;
}
// Reserves a New Well must pay: P.wellGain of what this layer has, at least P.wellMinReserves
export const newWellNeed = (state) => Math.max(P.wellMinReserves, P.wellGain * state.prestige.reserves);
// Seconds of the run still to go before a New Well is allowed (0 when long enough)
export const canNewWell = (state) => pendingReserves(state) >= newWellNeed(state);

export function newWell(state, ctx = NO_CONTEXT) {
  if (!canNewWell(state)) return false;
  const p = state.prestige, gained = pendingReserves(state);
  p.reserves += gained;
  p.wells++;
  unlockTrials(state, 'well', p.wells);
  Tree.earn(state, 'reserves', gained);
  // the tree: part of the Pressure survives, and a starter kit waits in the new Well
  Well.resetRun(state, {
    pressure: state.well.pressure * Math.min(1, Tree.bonus(state, 'keepPressure')),
    kit: Tree.bonus(state, 'startKit')
  });
  ctx.emit('newWell', HIT.MINOR, { reserves: gained });
  return true;
}

// --- New Field -----------------------------------------------------------------------------------
// log10 of the best run this Chronicle that the next New Field needs
export const fieldGateLog = (state) =>
  P.fieldLog0 + P.fieldLogStep * state.prestige.newFields + P.fieldLogPerChronicle * state.prestige.chronicles;
export const canNewField = (state) => log10Big(state.well.bestRunChron) >= fieldGateLog(state);

export const crewSlots = (state) => P.crewBase + state.prestige.chronicles;
export const CHARTERS = Object.freeze(Object.keys(P.charter));

// What a New Field may be spent on now: { kind: 'rig', field } builds a Field's Rig,
// { kind: 'level', field } levels one, { kind: 'crew' } hires Crew into a free slot.
// The first New Field ever builds a Rig (there is nothing else to pick yet).
export function fieldChoices(state) {
  const out = [];
  const rigs = state.fields.map(f => f.rig);
  FIELDS.forEach((_, field) => { if (rigs[field] === 0) out.push({ kind: 'rig', field }); });
  if (rigs.every(r => r === 0)) return out;
  if (state.prestige.crew < crewSlots(state)) out.push({ kind: 'crew' });
  FIELDS.forEach((_, field) => { if (rigs[field] > 0) out.push({ kind: 'level', field }); });
  return out;
}
const sameChoice = (a, b) => a.kind === b.kind && (a.kind === 'crew' || a.field === b.field);
// The sim's pick: a Rig in every Field first, then Crew while a slot is free, then a level on
// the lowest Rig
export function suggestedChoice(state) {
  const noRig = state.fields.findIndex(f => f.rig === 0);
  if (noRig >= 0) return { kind: 'rig', field: noRig };
  if (state.prestige.crew < crewSlots(state)) return { kind: 'crew' };
  let lo = 0;
  state.fields.forEach((f, i) => { if (f.rig < state.fields[lo].rig) lo = i; });
  return { kind: 'level', field: lo };
}

// Opens a New Field: +P.sharesPerField Shares, Reserves and the run reset, the choice applied.
// `charter` (one of CHARTERS) switches the Charter; left out, the current one stays.
export function newField(state, choice, charter, ctx = NO_CONTEXT) {
  if (!canNewField(state)) return false;
  const pick = choice && fieldChoices(state).find(c => sameChoice(c, choice));
  if (!pick) return false;
  if (charter !== undefined && !CHARTERS.includes(charter)) return false;
  const p = state.prestige;
  p.newFields++; p.totalFields++;
  p.shares += P.sharesPerField;
  p.reserves = 0;
  p.lastResetAt = state.t;
  if (charter !== undefined) p.charter = charter;
  Tree.earn(state, 'shares', P.sharesPerField);
  Tree.resetRing(state, 'reserves');
  Well.resetRun(state);
  if (pick.kind === 'rig') Rigs.build(state, pick.field);
  else if (pick.kind === 'level') Rigs.levelUp(state, pick.field);
  else p.crew++;
  unlockTrials(state, 'field', p.totalFields);
  ctx.emit('newField', HIT.NOVELTY, { n: p.totalFields });
  return true;
}

// --- Chronicle -----------------------------------------------------------------------------------
// New Fields this Chronicle needs: more for the first one
export const chronicleFieldsNeed = (state) => (state.prestige.chronicles === 0 ? P.chronFirstFields : P.chronFields);
// The record gate: from the second Chronicle on, the best run this Chronicle must be
// P.chronRecord times the best before the last one. Returns log10 of that run (-Infinity: no gate).
export function chronicleRecordLog(state) {
  if (state.prestige.chronicles === 0) return -Infinity;
  return Math.log10(P.chronRecord) + log10Big(state.well.recordAtChron);
}
export const canChronicle = (state) =>
  state.prestige.newFields >= chronicleFieldsNeed(state) && log10Big(state.well.bestRunChron) >= chronicleRecordLog(state);
// Pages a Chronicle would pay now: more New Fields, more Pages, up to P.chronFullFields
export const pendingPages = (state) =>
  P.pageBase + Math.floor((Math.min(state.prestige.newFields, P.chronFullFields) - P.chronFields) / P.pageStep);
// The sim's timing: take the Chronicle at the full Page count, or once the last reset is
// P.chronSlowDays old (the loop has slowed)
export const suggestChronicle = (state) => canChronicle(state)
  && (state.prestige.newFields >= P.chronFullFields || state.t - state.prestige.lastResetAt >= P.chronSlowDays * DAY);
// Shares the next Chronicle starts with (re-blaze): floor(lifetime Pages after it x startSharesPerPage)
export const reblazeShares = (pages) => Math.floor(pages * P.startSharesPerPage);

export function chronicle(state, ctx = NO_CONTEXT) {
  if (!canChronicle(state)) return false;
  const p = state.prestige, pages = pendingPages(state);
  p.pages += pages;
  p.chronicles++;
  p.newFields = 0;
  p.shares = reblazeShares(p.pages) + Tree.bonus(state, 'startShares');
  Tree.earn(state, 'pages', pages + Tree.bonus(state, 'pageBank'));
  Tree.resetRing(state, 'shares');
  Tree.resetRing(state, 'reserves');
  p.reserves = 0;
  p.lastResetAt = state.t;
  Well.closeChronicleRecord(state);
  Rigs.resetLevels(state);
  Well.resetRun(state);
  ctx.emit('chronicle', HIT.MAJOR, { pages });
  return true;
}
