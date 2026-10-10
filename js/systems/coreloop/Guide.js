// The guide (docs/core-loop-plan.md CL-28): what a player should do next, and which parts of the
// game are open to them yet. Pure and derived from the state; it writes state.guide only.
//
//   FEATURES   a tab or a section of a screen, and the rule that opens it. Open is sticky: a reset
//              never closes anything (state.guide.open).
//   STEPS      the first session, one goal at a time, each pointing at a screen and an anchor
//              (the element with data-guide="<anchor>"). Reaching a step opens what it needs.
//   suggestion the standing "what next" once the steps are done.
//
// The shell calls refresh() after every tick and action; screens ask isOpen() and never decide
// what is open on their own.
import { P } from './params.js';
import { NO_CONTEXT, HIT } from './shared.js';
import * as Well from './Well.js';
import * as Presence from './Presence.js';
import * as Refinery from './Refinery.js';
import * as Prestige from './Prestige.js';
import * as Tree from './Tree.js';

const log10Big = (b) => (b && b.m > 0 ? Math.log10(b.m) + b.e : -Infinity);

// --- what the rules read -------------------------------------------------------------------------
export const materials = (state) => state.fields.reduce((n, f) => n + f.inventory.reduce((a, b) => a + b, 0), 0);
export const ordersFilled = (state) => state.refinery.frac.reduce((n, f) => n + f.level, 0);
const everLog = (state) => Math.max(log10Big(state.well.bestEver), log10Big(state.well.crude));
const anyRank = (state) => state.mastery.some(m => m.ranks.some(r => r > 0));
const anyVial = (state) => Object.keys(state.collection.vials).length > 0;
const anyRecipe = (state) => state.collection.recipes.some(r => r && r.found);
const anyNode = (state) => Object.keys(state.tree.ranks).length > 0;
const anyTrial = (state) => Object.values(state.prestige.trials).some(tr => tr.unlockedAt !== null);
const wells = (state) => state.prestige.wells;
const fieldsEver = (state) => state.prestige.totalFields;
// A tab the player has opened at least once
const visited = (state, tab) => state.guide.open[`tab.${tab}`] === true && state.guide.fresh[`tab.${tab}`] !== true;

// --- features ------------------------------------------------------------------------------------
// id -> rule. A tab is 'tab.<screen>'; the rest are sections of a screen ('shell.*': of the frame).
// The first session meets one loop at a time (docs/core-loop-feel-study.md, R1): the Well alone
// until it has paid three times (a Bucket, the x2, a Hand Pump), Fields at the first long wait,
// the Refinery when an Order can be filled on arrival, and the Collection, Vials and Mastery
// after the first New Well, as the things the second run is for.
const anyFillable = (state) => state.refinery.orders.some((_, i) => Refinery.canFillOrder(state, i));
export const FEATURES = Object.freeze({
  'tab.well': () => true,
  'well.pumps': (s) => s.well.taps >= STEPS[0].need || s.well.bought[1] > 0 || wells(s) > 0,
  'well.pressure': (s) => s.well.bought[1] >= P.packSize || s.well.pressureBest > 0 || wells(s) > 0,
  'well.heat': (s) => s.well.pressureBest > 0 || s.well.bought[2] > 0 || wells(s) > 0,
  'well.run': (s) => s.well.bought[2] > 0 || wells(s) > 0,
  'well.maxall': (s) => s.well.bought[2] > 0 || wells(s) > 0,
  'well.flare': (s) => Well.canFlare(s) || s.well.flare > 1,
  'well.generators': (s) => wells(s) >= 3 || s.well.generators > P.slots,
  // The presence chip (Playing / Leaning back) means nothing until Gushers have been met
  'shell.presence': (s) => s.presence.caught > 0 || s.guide.step >= STEPS.findIndex(x => x.id === 'gusher'),

  'tab.fields': (s) => (s.well.bought[2] > 0 && s.well.pressureBest > 0) || ordersFilled(s) > 0 || wells(s) > 0,
  'fields.mine': (s) => ordersFilled(s) > 0 || wells(s) > 0,
  'fields.oasis': (s) => ordersFilled(s) > 0 || wells(s) > 0,
  'fields.mastery': (s) => wells(s) >= 2 || anyRank(s),
  'fields.rig': (s) => fieldsEver(s) > 0 || s.fields.some(f => f.rig > 0),

  'tab.refinery': (s) => (s.guide.sent && anyFillable(s)) || ordersFilled(s) > 0 || wells(s) > 0,
  // After the first New Well only the tree is new; the rest arrive one reset or a few Orders apart
  'refinery.vials': (s) => ordersFilled(s) >= 3 || anyVial(s),
  'refinery.weekly': (s) => ordersFilled(s) >= 6 || fieldsEver(s) > 0,
  'refinery.cauldrons': (s) => wells(s) >= 2,
  'refinery.mixer': (s) => anyRecipe(s) || wells(s) >= 4,

  'tab.prestige': (s) => Prestige.pendingReserves(s) >= 1 || wells(s) > 0,
  'prestige.tree': (s) => wells(s) >= 1,
  'prestige.field': (s) => wells(s) >= 3 || fieldsEver(s) > 0,
  'prestige.chronicle': (s) => fieldsEver(s) >= 1 || s.prestige.chronicles > 0,
  'prestige.trials': (s) => anyTrial(s),
  'prestige.seals': (s) => fieldsEver(s) >= 1 || s.prestige.crew > 0,

  'tab.codex': (s) => anyVial(s) || anyRecipe(s) || wells(s) >= 3
});
// Parts that simply appear where the player is looking: no "New:" line for them
export const QUIET = Object.freeze(['well.pumps', 'well.heat', 'well.run', 'shell.presence']);
export const FEATURE_IDS = Object.freeze(Object.keys(FEATURES));
export const TABS = Object.freeze(['well', 'fields', 'refinery', 'prestige', 'codex']);

export const isOpen = (state, feature) => feature === 'tab.well' || state.guide.open[feature] === true;
// A tab the player has not opened since it appeared (the shell marks it and clears it)
export const isNew = (state, feature) => state.guide.fresh[feature] === true;
export function markSeen(state, feature) { delete state.guide.fresh[feature]; }

// --- the first session ---------------------------------------------------------------------------
// have(state) / need: the progress the bar shows (`frac`, when a count says too little). `needs`:
// features opened when the step is reached, so "Show me" always has somewhere to go. Order is the
// order of play. No step passes by itself and none waits on the clock: each is something the
// player does.
const runLog = (state) => Math.max(0, log10Big(state.well.runCrude));
export const STEPS = Object.freeze([
  { id: 'tap', screen: 'well', anchor: 'well.tap', need: 5, have: (s) => (s.well.bought[1] > 0 ? 5 : s.well.taps) },
  { id: 'buy1', screen: 'well', anchor: 'well.buy.1', need: 1, needs: ['well.pumps'], have: (s) => s.well.bought[1] },
  { id: 'pack', screen: 'well', anchor: 'well.buy.1', need: P.packSize, have: (s) => s.well.bought[1] },
  { id: 'pressure', screen: 'well', anchor: 'well.pressure', need: 1, needs: ['well.pressure'], have: (s) => s.well.pressureBest },
  { id: 'slot2', screen: 'well', anchor: 'well.buy.2', need: 1, needs: ['well.heat'], have: (s) => s.well.bought[2] },
  { id: 'work', screen: 'fields', anchor: 'fields.work', need: 1, needs: ['tab.fields'], have: (s) => (s.guide.sent || ordersFilled(s) > 0 ? 1 : 0) },
  { id: 'order', screen: 'refinery', anchor: 'refinery.order', need: 1, needs: ['tab.refinery'], have: ordersFilled },
  {
    id: 'reserves', screen: 'well', anchor: 'well.rate', need: P.wellMinReserves,
    have: (s) => (wells(s) > 0 ? P.wellMinReserves : Prestige.pendingReserves(s)),
    frac: (s) => runLog(s) / Prestige.newWellRunLog(s)   // moves from the first second, never back
  },
  { id: 'newwell', screen: 'prestige', anchor: 'prestige.newwell', need: 1, needs: ['tab.prestige'], have: wells },
  { id: 'tree', screen: 'prestige', anchor: 'prestige.tree', need: 1, needs: ['prestige.tree'], have: (s) => (anyNode(s) ? 1 : 0) },
  { id: 'gusher', screen: 'well', anchor: 'well.tap', need: 1, have: (s) => s.presence.caught },
  { id: 'wells3', screen: 'prestige', anchor: 'prestige.newwell', need: 3, have: wells }
]);

// The player sent the crew to a Field (the Fields screen, through the shell's api.sendCrew)
export function noteSent(state) { state.guide.sent = true; }

const stepDone = (state, step) => step.have(state) >= step.need;

// Brings state.guide up to date: finished steps are passed (never back), features whose rule
// holds are opened. Emits 'unlock' for each feature that opens and 'guide' for each step passed.
// Returns the features opened by this call.
export function refresh(state, ctx = NO_CONTEXT) {
  const g = state.guide, opened = [];
  const open = (id) => {
    if (id === 'tab.well' || g.open[id]) return;
    g.open[id] = true;
    if (id.startsWith('tab.')) g.fresh[id] = true;
    opened.push(id);
  };
  while (g.step < STEPS.length && stepDone(state, STEPS[g.step])) {
    ctx.emit('guide', HIT.MINOR, { step: STEPS[g.step].id });
    g.step++;
  }
  // The Gusher lesson brings its own Gusher, again and again until one is caught; not on an empty
  // Well, where it would pay nothing (it waits for the run's first Hand Pump)
  if (STEPS[g.step]?.id === 'gusher' && state.well.bought[2] > 0 && !state.presence.summoned && !Presence.gusherUp(state)) Presence.summonGusher(state);
  for (const id of FEATURE_IDS) if (!g.open[id] && FEATURES[id](state)) open(id);
  for (const id of STEPS[g.step]?.needs || []) open(id);
  for (const id of opened) if (!QUIET.includes(id)) ctx.emit('unlock', id.startsWith('tab.') ? HIT.NOVELTY : HIT.BIG, { feature: id });
  return opened;
}

// The step the player is on: { id, screen, anchor, have, need, frac, index, total }, or null when
// the first session is over.
export function current(state) {
  const step = STEPS[state.guide.step];
  if (!step) return null;
  const have = Math.min(step.need, Math.max(0, step.have(state)));
  const frac = have >= step.need ? 1 : Math.max(0, Math.min(1, step.frac ? step.frac(state) : have / step.need));
  return { id: step.id, screen: step.screen, anchor: step.anchor, have, need: step.need, frac, index: state.guide.step, total: STEPS.length };
}

// --- after the first session ---------------------------------------------------------------------
// The one thing most worth doing now: { id, screen, anchor, n?, frac? }. Biggest moment first;
// when nothing waits for a tap, the next reset the player is working toward and how far it is
// (buying in the Well is never suggested: it is always possible, so it would say nothing).
export function suggestion(state) {
  if (Prestige.suggestChronicle(state)) return { id: 'chronicle', screen: 'prestige', anchor: 'prestige.chronicle' };
  if (Prestige.canNewField(state)) return { id: 'newfield', screen: 'prestige', anchor: 'prestige.newfield' };
  if (Presence.canCatchGusher(state)) return { id: 'gusher', screen: 'well', anchor: 'well.tap' };
  if (Prestige.canNewWell(state)) return { id: 'newwell', screen: 'prestige', anchor: 'prestige.newwell', n: Prestige.pendingReserves(state) };
  for (let i = 0; i < state.refinery.orders.length; i++) if (Refinery.canFillOrder(state, i)) return { id: 'order', screen: 'refinery', anchor: 'refinery.order' };
  if (Tree.RINGS.some(ring => Tree.nodes(state, ring).some(n => n.canBuy))) return { id: 'tree', screen: 'prestige', anchor: 'prestige.tree' };
  if (isOpen(state, 'prestige.field')) {
    const frac = Math.max(0, log10Big(state.well.bestRunChron)) / Prestige.fieldGateLog(state);
    return { id: 'goal_field', screen: 'prestige', anchor: 'prestige.newfield', frac: Math.min(1, frac) };
  }
  return { id: 'goal_well', screen: 'prestige', anchor: 'prestige.newwell', n: Prestige.newWellNeed(state), frac: Math.min(1, runLog(state) / Prestige.newWellRunLog(state)) };
}

// What the bar shows: the current step, else the standing suggestion
export function next(state) {
  const step = current(state);
  return step ? { kind: 'step', ...step } : { kind: 'suggestion', ...suggestion(state) };
}

// The intro card of a fresh save
export const introPending = (state) => state.guide.intro !== true;
export function dismissIntro(state) { state.guide.intro = true; }
