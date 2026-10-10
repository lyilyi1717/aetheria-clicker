// The Well (docs/core-loop-plan.md CL-8): 8 cascade slots, slot k makes slot k-1 and slot 1 makes
// Crude. A port of wellStep, tierRate, wellMult, buyAll, maybeFlare and unlockGenerators in
// sim/redesign/model.mjs, with Crude and slot amounts in BigNum so nothing stops at 1e308.
// Writes state.well only (README.md "Who writes what"). The sim decides when to buy, flare and
// reset; here those are player actions, and the loop driver calls them for won automations.
import { BigNum } from '../../engine/BigNum.js';
import { P } from './params.js';
import { PRESENCE, FRAC, HIT, NO_CONTEXT, fracValue } from './shared.js';

// The sim's buyAll stops after this many packs of a slot and Pressure levels in one call
const MAX_PACKS = 40;
const MAX_PRESSURE_BUYS = 200;
// A price within this much of the Crude at hand still counts as affordable (float noise)
const AFFORD_SLACK = 1e-9;

// Every multiplier here is built in log10 and turned into a BigNum once: x2 per pack and
// x2.5 per Share leave the double range long before Crude does.
const log10Big = (b) => (b.m > 0 ? Math.log10(b.m) + b.e : -Infinity);
function pow10(log) {
  if (!Number.isFinite(log)) return BigNum.zero();
  const e = Math.floor(log);
  return new BigNum(Math.pow(10, log - e), e);
}

// --- slots and generators ------------------------------------------------------------------------
// The highest slot with anything bought (0 = an empty Well). Flare boosts this slot.
export function topSlot(state) {
  const b = state.well.bought;
  for (let k = P.slots; k >= 1; k--) if (b[k] > 0) return k;
  return 0;
}

// Generators 9..P.generators are upgrades: generator n replaces the one in generatorSlot(n) with
// one P.genMult times stronger. slotLevel counts the upgrades a slot has had.
export const generatorSlot = (n) => ((n - P.slots - 1) % P.slots) + 1;
export function slotLevel(state, k) {
  const extra = state.well.generators - P.slots;
  return extra >= k ? Math.floor((extra - k) / P.slots) + 1 : 0;
}
// log10 of the best-ever run Crude that unlocks generator n (n > P.slots)
export const generatorGoalLog = (n) => P.genLog0 + P.genLogStep * (n - (P.slots + 1));
// The next generator to unlock, or null when all are out: { n, slot, goalLog }
export function nextGenerator(state) {
  const n = state.well.generators + 1;
  return n > P.generators ? null : { n, slot: generatorSlot(n), goalLog: generatorGoalLog(n) };
}

function unlockGenerators(state, ctx) {
  const w = state.well;
  const best = log10Big(w.bestEver);
  while (w.generators < P.generators && best >= generatorGoalLog(w.generators + 1)) {
    w.generators++;
    ctx.emit('generator', HIT.NOVELTY, { n: w.generators });
  }
}

// --- rates ---------------------------------------------------------------------------------------
// Heat of the hands-on stretch (Presence.js owns presence.heatSeconds; same formula as its heat)
const heatOf = (state) => 1 + Math.min(1, state.presence.heatSeconds / P.heatRamp);

// Everything global: Reserves, Shares, Pages, Pressure, Naphtha and the presence state. It acts on
// slot 1's Crude output only (on every stage it would be raised to the power of the slot count).
export function wellMultiplier(state, presence = PRESENCE.WATCH) {
  const p = state.prestige;
  let log = Math.log10(1 + P.resPer * p.reserves)
    + p.shares * Math.log10(P.shareMult)
    + p.pages * Math.log10(P.pageMult)
    + state.well.pressure * Math.log10(P.pMult)
    + Math.log10(fracValue(state, FRAC.NAPHTHA));
  if (presence === PRESENCE.AWAY) log += Math.log10(P.awayWell);
  else if (presence === PRESENCE.HANDS) log += Math.log10(1 + P.handsWell * (heatOf(state) - 1));
  return pow10(log);
}

// Units of slot k-1 (Crude for slot 1) one unit of slot k makes per second, before wellMultiplier
export function slotRate(state, k, top = topSlot(state)) {
  const w = state.well;
  return pow10(Math.log10(P.tierRate)
    + slotLevel(state, k) * Math.log10(P.genMult)
    + Math.floor(w.bought[k] / P.packSize) * Math.log10(P.buyTenMult)
    + (k === top ? Math.log10(w.flare) : 0));
}

export function crudePerSecond(state, presence = PRESENCE.WATCH) {
  const top = topSlot(state);
  if (top === 0) return BigNum.zero();
  return state.well.amount[1].mul(slotRate(state, 1, top)).mul(wellMultiplier(state, presence));
}

// --- production ----------------------------------------------------------------------------------
// Exact cascade over dt with the rates held constant:
// new a_j = Σ_m a_{j+m} · Π_{i=j+1..j+m} r_i · dt^m / m!, and a_0 is the Crude made
function produce(state, dt, presence) {
  const N = topSlot(state);
  if (N === 0 || !(dt > 0)) return BigNum.zero();
  const r = new Array(N + 1);
  for (let k = 1; k <= N; k++) r[k] = slotRate(state, k, N);
  r[1] = r[1].mul(wellMultiplier(state, presence));
  const a = state.well.amount, next = new Array(N + 1);
  for (let j = 0; j <= N; j++) {
    let sum = j === 0 ? BigNum.zero() : a[j], coef = BigNum.one();
    for (let m = 1; j + m <= N; m++) {
      coef = coef.mul(r[j + m]).mul(dt / m);
      sum = sum.add(a[j + m].mul(coef));
    }
    next[j] = sum;
  }
  for (let j = 1; j <= N; j++) a[j] = next[j];
  return next[0];
}

// Crude from anywhere (the cascade, a Gusher's payout): counts for the run, the Chronicle's best
// run and the all-time best, which unlocks generators
export function addCrude(state, amount, ctx = NO_CONTEXT) {
  const w = state.well, x = BigNum.from(amount);
  if (!(x.m > 0)) return;
  w.crude = w.crude.add(x);
  w.runCrude = w.runCrude.add(x);
  if (w.runCrude.gt(w.bestRunChron)) w.bestRunChron = w.runCrude;
  if (w.runCrude.gt(w.bestEver)) {
    w.bestEver = w.runCrude;
    unlockGenerators(state, ctx);
  }
}

// Advances the cascade by dt seconds and banks the Crude. Returns the Crude made (BigNum).
// Presence.step runs first in a loop tick: the hands-on rate reads presence.heatSeconds.
export function step(state, dt, presence, ctx = NO_CONTEXT) {
  const made = produce(state, dt, presence);
  addCrude(state, made, ctx);
  return made;
}

// --- buying --------------------------------------------------------------------------------------
// A unit of slot k costs 10^(costA·k + costB·k²), x10^(stepA + stepB·k) per pack already bought
export const slotCostLog = (state, k) =>
  P.costA * k + P.costB * k * k + (P.stepA + P.stepB * k) * Math.floor(state.well.bought[k] / P.packSize);
export const slotCost = (state, k) => pow10(slotCostLog(state, k));
// Units left in slot k's current pack (the price and the x2 change when it completes)
export const packLeft = (state, k) => P.packSize - (state.well.bought[k] % P.packSize);

// Units of slot k the Crude at hand pays for, up to the end of the current pack
export function affordable(state, k) {
  if (!(k >= 1 && k <= P.slots)) return 0;
  const room = log10Big(state.well.crude) - slotCostLog(state, k);
  if (!(room >= 0)) return 0;
  return Math.min(packLeft(state, k), Math.floor(Math.pow(10, room) + AFFORD_SLACK));
}
export const canBuy = (state, k, count = 1) => affordable(state, k) >= count;

function spend(state, cost) {
  const left = state.well.crude.sub(cost);
  state.well.crude = left.m > 0 ? left : BigNum.zero();
}

// Buys up to `count` units of slot k within its current pack. True if any were bought.
export function buy(state, k, count = 1) {
  const n = Math.min(Math.floor(count), affordable(state, k));
  if (!(n > 0)) return false;
  const w = state.well;
  spend(state, slotCost(state, k).mul(n));
  w.bought[k] += n;
  w.amount[k] = w.amount[k].add(n);
  return true;
}

export const pressureCostLog = (state) => P.pA + P.pB * state.well.pressure;
export const pressureCost = (state) => pow10(pressureCostLog(state));
export const canBuyPressure = (state) => log10Big(state.well.crude) >= pressureCostLog(state);
export function buyPressure(state) {
  if (!canBuyPressure(state)) return false;
  const w = state.well;
  spend(state, pressureCost(state));
  w.pressure++;
  if (w.pressure > w.pressureBest) w.pressureBest = w.pressure;
  return true;
}

// "Max all" (the sim's buyAll): slots from the top down in packs, then Pressure. True if it
// bought anything. Auto-Buy is the loop driver calling this each tick.
export function buyMax(state) {
  let any = false;
  for (let k = P.slots; k >= 1; k--) {
    for (let guard = 0; guard < MAX_PACKS; guard++) {
      const left = packLeft(state, k);
      const n = affordable(state, k);
      if (n <= 0) break;
      buy(state, k, n);
      any = true;
      if (n < left) break;
    }
  }
  for (let guard = 0; guard < MAX_PRESSURE_BUYS && buyPressure(state); guard++) any = true;
  return any;
}

// --- Flare ---------------------------------------------------------------------------------------
// The top slot's multiplier a Flare would set now: (log10(slot 1 amount) / flareDiv)². 0 when
// there is nothing to burn (fewer than two slots in use).
export function flareMultiplier(state) {
  const a1 = state.well.amount[1];
  if (topSlot(state) < 2 || !(log10Big(a1) > 0)) return 0;
  return Math.pow(log10Big(a1) / P.flareDiv, 2);
}
// A Flare must at least multiply the current one by P.flareMinGain
export const canFlare = (state) => {
  const m = flareMultiplier(state);
  return m > 0 && m >= state.well.flare * P.flareMinGain;
};
// Burns what the slots below the top one produced (they keep what was bought) for a multiplier on
// the top slot until the next New Well. `byHand` false is Auto-Flare, which is not a moment.
export function flare(state, byHand = true, ctx = NO_CONTEXT) {
  if (!canFlare(state)) return false;
  const w = state.well, top = topSlot(state);
  w.flare = flareMultiplier(state);
  for (let k = 1; k < top; k++) w.amount[k] = new BigNum(w.bought[k]);
  if (byHand) ctx.emit('flare', HIT.BIG);
  return true;
}

// --- New Well ------------------------------------------------------------------------------------
// What a New Well resets (Prestige.js calls this). Generators, pressureBest and the best-run
// records stay.
export function resetRun(state) {
  const w = state.well;
  w.crude = new BigNum(P.startCrude);
  w.runCrude = BigNum.zero();
  w.runStart = state.t;
  w.bought = new Array(P.slots + 1).fill(0);
  w.amount = Array.from({ length: P.slots + 1 }, () => BigNum.zero());
  w.pressure = 0;
  w.flare = 1;
}

// A Chronicle closes the record its gate compares against (Prestige.js calls this, then
// resetRun): the next Chronicle needs a run P.chronRecord times `recordAtChron`.
export function closeChronicleRecord(state) {
  const w = state.well;
  if (w.bestRunChron.gt(w.recordAtChron)) w.recordAtChron = w.bestRunChron;
  w.bestRunChron = BigNum.zero();
}
