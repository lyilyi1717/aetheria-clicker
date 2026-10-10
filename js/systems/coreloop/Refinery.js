// Refinery (docs/core-loop-plan.md CL-4): Orders and the weekly Order. Port of orderField,
// postOrders, fillOrders, reserved, surplus and weeklyOrder in sim/redesign/model.mjs.
// Writes only `refinery.frac[i].level`, `refinery.orders` and `refinery.weekly`. Materials are read
// and taken only through Fields.countAtLeast / Fields.takeMaterial; nothing here touches `well`.
//
// Orders cost Materials only. Posting is not a player action (`step` does it); filling is
// (`fillOrder`, `fillWeekly`). The sim's policy "fill everything fillable" is `fillAll`.
import { P } from './params.js';
import { PRESENCE, FRACTIONS, HIT, fracValue, NO_CONTEXT } from './shared.js';
import * as Fields from './Fields.js';
import * as Rigs from './Rigs.js';

const NF = P.fields.length;
const WEEK = 7 * 86400;     // a calendar week, not a tunable

// --- Order sizing --------------------------------------------------------------------------------
// The Field an Order asks for: its source Field, or for 'any' the one with the largest stock
// (the first on a tie)
export function orderField(state, source) {
  if (source !== 'any') return P.fields.indexOf(source);
  let best = 0, most = -1;
  for (let i = 0; i < NF; i++) {
    const n = Fields.countAtLeast(state, i, 0);
    if (n > most) { most = n; best = i; }
  }
  return best;
}

// Post an Order into every empty slot whose refill time has passed, in slot order. Each takes the
// lowest-level Fraction not already on an open Order. The grade is the Field's Rig grade (so the
// Rig's own haul fills it), or one under the frontier grade before a Rig. The quantity is
// P.orderSeconds of Watching Rig output plus a share of hand work. Returns the number posted.
export function postOrders(state) {
  const ref = state.refinery;
  let posted = 0;
  for (const o of ref.orders) {
    if (!o.empty || state.t < o.refillAt) continue;
    const taken = new Set(ref.orders.filter(x => !x.empty).map(x => x.frac));
    let frac = 0, lo = Infinity;
    ref.frac.forEach((fr, i) => { if (!taken.has(i) && fr.level < lo) { lo = fr.level; frac = i; } });
    const field = orderField(state, P.orderSource[FRACTIONS[frac]]);
    const f = state.fields[field];
    const grade = f.rig > 0 ? Rigs.rigGrade(state, field) : Math.max(0, Fields.gradeOf(f.frontier) - 1);
    const qty = P.orderSeconds * (Rigs.rigRate(state, field, PRESENCE.WATCH) + P.orderHandShare * Rigs.handRate(state));
    Object.assign(o, { empty: false, frac, field, grade, qty, posted: state.t });
    posted++;
  }
  return posted;
}

// Units of a Field that open Orders still need
export function reserved(state, field) {
  let n = 0;
  for (const o of state.refinery.orders) if (!o.empty && o.field === field) n += o.qty;
  return n;
}
// Units of a Field no open Order needs
export function surplus(state, field) {
  return Math.max(0, Fields.countAtLeast(state, field, 0) - reserved(state, field));
}

// --- filling -------------------------------------------------------------------------------------
export function canFillOrder(state, slot) {
  const o = state.refinery.orders[slot];
  return !!o && !o.empty && Fields.countAtLeast(state, o.field, o.grade) >= o.qty;
}

// The player fills a slot: Materials out, +1 level on the Order's Fraction, the slot refills later
export function fillOrder(state, slot, ctx = NO_CONTEXT) {
  if (!canFillOrder(state, slot)) return false;
  const o = state.refinery.orders[slot];
  if (!Fields.takeMaterial(state, o.field, o.grade, o.qty)) return false;
  const { frac, posted } = o;
  state.refinery.frac[frac].level++;
  // Collection.js: the wiring step adds a Vial offer here (the sim's vialOffers++)
  state.refinery.orders[slot] = { empty: true, refillAt: state.t + P.orderRefill };
  ctx.emit('order', HIT.BIG, { frac, slot, age: state.t - posted });
  return true;
}

// Fill every fillable slot in slot order (the sim's policy). Returns the number filled.
export function fillAll(state, ctx = NO_CONTEXT) {
  let n = 0;
  for (let i = 0; i < state.refinery.orders.length; i++) if (fillOrder(state, i, ctx)) n++;
  return n;
}

// --- weekly Order --------------------------------------------------------------------------------
export const weekOf = (state) => Math.floor(state.t / WEEK);
export const secondsToNextWeek = (state) => (weekOf(state) + 1) * WEEK - state.t;

// Post the weekly Order when a new week has started and every Field has a Rig: each Field's
// Materials at its Rig grade, sized to P.weeklyHours of Watching Rig output. Returns true if posted.
export function postWeekly(state) {
  const w = state.refinery.weekly;
  const week = weekOf(state);
  if (week === w.week || !state.fields.every(f => f.rig > 0)) return false;
  w.week = week;
  w.need = state.fields.map((f, i) => ({ grade: Rigs.rigGrade(state, i), qty: P.weeklyHours * 3600 * Rigs.rigRate(state, i, PRESENCE.WATCH) }));
  return true;
}

// Fillable when every Field has its need on top of what open Orders reserve
export function canFillWeekly(state) {
  const need = state.refinery.weekly.need;
  return !!need && need.every((n, i) => Fields.countAtLeast(state, i, n.grade) >= n.qty + reserved(state, i));
}

export function fillWeekly(state, ctx = NO_CONTEXT) {
  if (!canFillWeekly(state)) return false;
  const w = state.refinery.weekly;
  w.need.forEach((n, i) => Fields.takeMaterial(state, i, n.grade, n.qty));
  for (const fr of state.refinery.frac) fr.level++;
  w.need = null;
  ctx.emit('weekly', HIT.MAJOR);
  return true;
}

// --- time ----------------------------------------------------------------------------------------
// Posts what is due at `state.t` (the start of the step): Orders into empty slots past their
// refill time, and the weekly Order in a new week. dt and presence are unused: Orders follow the
// clock, not the player's presence. Filling stays a player action.
export function step(state, dt, presence, ctx = NO_CONTEXT) {
  postOrders(state);
  postWeekly(state);
}

// --- for the UI ----------------------------------------------------------------------------------
// What slot `slot` shows. Empty: { empty: true, refillIn } (seconds; 0 means it posts next step).
// Open: the ask (field, grade, qty), what the player has toward it, whether it can be filled, its
// age, and the Fraction's value before and after.
export function orderInfo(state, slot) {
  const o = state.refinery.orders[slot];
  if (!o) return null;
  if (o.empty) return { empty: true, refillIn: Math.max(0, o.refillAt - state.t) };
  const have = Fields.countAtLeast(state, o.field, o.grade);
  const before = fracValue(state, o.frac);
  return {
    empty: false, frac: o.frac, field: o.field, grade: o.grade, qty: o.qty,
    have, progress: Math.min(1, have / o.qty), ready: have >= o.qty,
    age: state.t - o.posted, before, after: before * P.orderMult
  };
}

// The weekly Order: `open` is false until posted and after it is filled
export function weeklyInfo(state) {
  const need = state.refinery.weekly.need;
  return {
    secondsToNextWeek: secondsToNextWeek(state),
    open: !!need,
    ready: canFillWeekly(state),
    need: need ? need.map((n, i) => ({ field: i, grade: n.grade, qty: n.qty, have: Fields.countAtLeast(state, i, n.grade), reserved: reserved(state, i) })) : null,
    before: FRACTIONS.map((_, i) => fracValue(state, i)),
    after: FRACTIONS.map((_, i) => fracValue(state, i) * P.orderMult)
  };
}
