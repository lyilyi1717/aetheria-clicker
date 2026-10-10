// CL-6: Cauldrons and Bubbles (docs/core-loop-redesign.md §4.5; the sim's cauldronFill, brew,
// bubbleCost, bubbleEffect, recomputeBubbles and bubbleLevels). A Cauldron fills in seconds of the
// presence it likes, never in Material units (units grow with Pressure and would run away).
// Brewing and levelling are player actions. Writes only `cauldrons.*` and `refinery.frac[i].bubble`.
import { P } from './params.js';
import { PRESENCE, FIELD, FRACTIONS, HIT, NO_CONTEXT } from './shared.js';
import * as Fields from './Fields.js';
import * as Rigs from './Rigs.js';

// Loop guard for brewAll: bars brewed per vat per call (the sim's guard)
const MAX_BARS_PER_CALL = 50;

// Vat index by name, in P.cauldrons order
export const VAT = Object.freeze(Object.fromEntries(P.cauldrons.map((name, i) => [name, i])));

// --- Bubbles ---------------------------------------------------------------------------------
// What a Bubble of level L adds inside its Fraction: saturates at bubbleA
export const bubbleEffect = (level) => (P.bubbleA * level) / (P.bubbleB + level);

// Rebuild every Fraction's Bubble total from the Bubble list
export function recompute(state) {
  const frac = state.refinery.frac;
  for (const f of frac) f.bubble = 0;
  for (const b of state.cauldrons.bubbles) frac[b.frac].bubble += bubbleEffect(b.level);
}

// A Fraction's Bubble total, and how many Bubbles it has
export const fractionBubbles = (state, frac) => state.refinery.frac[frac].bubble;
export const bubbleCount = (state, frac) => state.cauldrons.bubbles.filter(b => b.frac === frac).length;

// --- fill ------------------------------------------------------------------------------------
// Working Rigs: Fields whose Rig makes Material in this presence (what Rigs.step returns as `rigs`)
export function workingRigs(state, presence) {
  let n = 0;
  for (let i = 0; i < state.fields.length; i++) if (Rigs.rigRate(state, i, presence) > 0) n++;
  return n;
}

// Fill seconds per second, before the vat's speed: Hand fills Hands-on, Oil Watching, Time Away,
// Sands Hands-on plus P.sandsPerRig per working Rig
export function baseFillRate(vat, presence, rigs = 0) {
  switch (vat) {
    case VAT.hand: return presence === PRESENCE.HANDS ? 1 : 0;
    case VAT.oil: return presence === PRESENCE.WATCH ? 1 : 0;
    case VAT.sands: return (presence === PRESENCE.HANDS ? 1 : 0) + rigs * P.sandsPerRig;
    case VAT.time: return presence === PRESENCE.AWAY ? 1 : 0;
    default: return 0;
  }
}

// Advance every vat by dt seconds in `presence` (the sim's cauldronFill)
export function step(state, dt, presence, ctx = NO_CONTEXT) { // eslint-disable-line no-unused-vars
  const rigs = workingRigs(state, presence);
  state.cauldrons.vats.forEach((c, i) => { c.fill += baseFillRate(i, presence, rigs) * dt * c.speed; });
}

// --- bars ------------------------------------------------------------------------------------
// Seconds of fill one bar of this vat costs (the sim's bubbleCost)
export function barCost(state, vat) {
  return P.cauldronC0[P.cauldrons[vat]] * Math.pow(state.cauldrons.vats[vat].brewed + 1, P.bubbleExp);
}
export const canBrew = (state, vat) => state.cauldrons.vats[vat].fill >= barCost(state, vat);

// 0..1 of the way to the next bar
export const fillFraction = (state, vat) => Math.min(1, state.cauldrons.vats[vat].fill / barCost(state, vat));

// Whether the next bar of this vat is a speed upgrade instead of a Bubble
export const nextIsUpgrade = (state, vat) => (state.cauldrons.vats[vat].bars + 1) % P.upgradeEvery === 0;

// Seconds until the next bar if the player stays in `presence`; Infinity if the vat doesn't fill there
export function secondsToBar(state, vat, presence) {
  const c = state.cauldrons.vats[vat];
  const left = barCost(state, vat) - c.fill;
  if (left <= 0) return 0;
  const rate = baseFillRate(vat, presence, workingRigs(state, presence)) * c.speed;
  return rate > 0 ? left / rate : Infinity;
}

// Spend one full bar. Returns 'bubble', 'upgrade' or false (not full)
export function brew(state, vat, ctx = NO_CONTEXT) {
  if (!canBrew(state, vat)) return false;
  const c = state.cauldrons.vats[vat];
  c.fill -= barCost(state, vat);
  c.bars++;
  if (c.bars % P.upgradeEvery === 0) { c.speed += P.cauldronSpeed; return 'upgrade'; }
  c.brewed++;
  const bubbles = state.cauldrons.bubbles;
  bubbles.push({ frac: bubbles.length % FRACTIONS.length, level: 1 });
  recompute(state);
  ctx.emit('bubble', HIT.BIG, { cauldron: vat });
  if (bubbles.length % P.bubbleFamily === 0) ctx.emit('bubbleFamily', HIT.NOVELTY, { n: bubbles.length / P.bubbleFamily });
  return 'bubble';
}

// Every vat in order, while it has a full bar (the sim's brew). Returns the number of bars brewed.
export function brewAll(state, ctx = NO_CONTEXT) {
  let n = 0;
  state.cauldrons.vats.forEach((c, i) => {
    for (let guard = 0; guard < MAX_BARS_PER_CALL && brew(state, i, ctx); guard++) n++;
  });
  recompute(state);
  return n;
}

// --- Bubble levels ---------------------------------------------------------------------------
// Price in Oasis Material units: hours of Oasis farming, growing 15% a level
export function levelCost(state, index) {
  const b = state.cauldrons.bubbles[index];
  return P.bubbleLevelHours * Math.pow(P.bubbleCostGrowth, b.level - 1) * Rigs.fieldHour(state, FIELD.OASIS);
}
export const canLevelBubble = (state, index) =>
  index >= 0 && index < state.cauldrons.bubbles.length && Fields.countAtLeast(state, FIELD.OASIS, 0) >= levelCost(state, index);

// An L1 moment: no event
export function levelBubble(state, index, ctx = NO_CONTEXT) { // eslint-disable-line no-unused-vars
  if (!canLevelBubble(state, index)) return false;
  if (!Fields.takeMaterial(state, FIELD.OASIS, 0, levelCost(state, index))) return false;
  state.cauldrons.bubbles[index].level++;
  recompute(state);
  return true;
}

// Index of the first Bubble with the lowest level, or -1 (the sim's pick)
export function lowestBubble(state) {
  let best = -1;
  state.cauldrons.bubbles.forEach((b, i) => { if (best < 0 || b.level < state.cauldrons.bubbles[best].level) best = i; });
  return best;
}
