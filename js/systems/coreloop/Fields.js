// Fields (docs/core-loop-plan.md CL-2): each Field has a frontier (levels), grades of Material and
// an inventory of Material units by grade. Port of fieldPower / the hand part of fieldsStep /
// gradeOf / addInv / takeAtLeast / invAtLeast in sim/redesign/model.mjs. Writes only
// `fields[i].frontier`, `bestGrade` and `inventory`; Rigs.js writes the Rig side.
// `addMaterial / takeMaterial` are the only way anyone changes an inventory.
import { P } from './params.js';
import { PRESENCE, HIT, FIELD_FRAC, FRAC, fracValue, NO_CONTEXT } from './shared.js';
import * as Mastery from './Mastery.js';
import * as Presence from './Presence.js';

const LOG10 = Math.log10;

export const gradeOf = (frontier) => Math.floor(frontier / P.gradeSpan);

// A Field's power. Hands-on adds Heat and the Gas Fraction (the sim's fieldPower).
export function fieldPower(state, field, presence) {
  let p = P.fieldBase[field] * fracValue(state, FIELD_FRAC[field]) * Mastery.schoolPower(state, field);
  if (presence === PRESENCE.HANDS) p *= Presence.heat(state) * fracValue(state, FRAC.GAS);
  return p;
}

// --- inventory -------------------------------------------------------------------------------
const usable = (units) => Number.isFinite(units) && units > 0;

export function addMaterial(state, field, grade, units) {
  if (!usable(units)) return;
  const inv = state.fields[field].inventory;
  while (inv.length <= grade) inv.push(0);
  inv[grade] += units;
}

// Units of grade `grade` and up
export function countAtLeast(state, field, grade) {
  const inv = state.fields[field].inventory;
  let n = 0;
  for (let k = Math.max(0, grade); k < inv.length; k++) n += inv[k];
  return n;
}

// Take `units` from grade `grade` and up, lowest grade first. All or nothing: returns false and
// takes nothing when there are not enough.
export function takeMaterial(state, field, grade, units) {
  if (!usable(units)) return false;
  if (countAtLeast(state, field, grade) < units) return false;
  const inv = state.fields[field].inventory;
  let left = units;
  for (let k = Math.max(0, grade); k < inv.length && left > 0; k++) {
    const x = Math.min(inv[k], left);
    inv[k] -= x; left -= x;
  }
  return true;
}

// --- frontier --------------------------------------------------------------------------------
// Frontier levels per second right now, working by hand (sigmoid in decades of power over difficulty)
export function frontierSpeed(state, field) {
  const x = (LOG10(fieldPower(state, field, PRESENCE.HANDS)) - state.fields[field].frontier / P.levelsPerDecade[field]) * P.sigK;
  return P.vMax / (1 + Math.exp(-x));
}

// Frontier levels left until the next grade
export function levelsToNextGrade(state, field) {
  const f = state.fields[field].frontier;
  return (gradeOf(f) + 1) * P.gradeSpan - f;
}

// Advance the frontier of one Field by dt seconds of hand work. Emits `grade` at a new best grade.
// Returns the grade now at the frontier.
export function pushFrontier(state, field, dt, ctx = NO_CONTEXT) {
  const f = state.fields[field];
  f.frontier += frontierSpeed(state, field) * dt;
  const g = gradeOf(f.frontier);
  if (g > f.bestGrade) { f.bestGrade = g; ctx.emit('grade', HIT.NOVELTY, { field, grade: g }); }
  return g;
}
