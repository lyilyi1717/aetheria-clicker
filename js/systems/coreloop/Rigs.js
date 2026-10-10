// Rigs (docs/core-loop-plan.md CL-2): a Rig hauls Material from its Field at a grade a share of the
// way up the frontier. Port of rigGrade / rigRate / fieldHour / handRateBase / the Rig part of
// fieldsStep and the Material part of the Gusher block of `advance` in sim/redesign/model.mjs.
// Writes only `fields[i].rig` and `rigBestGrade` (and, through Fields.js, frontier and inventories).
import { P } from './params.js';
import { PRESENCE, HIT, FRAC, fracValue, NO_CONTEXT } from './shared.js';
import * as Fields from './Fields.js';
import * as Mastery from './Mastery.js';
import * as Presence from './Presence.js';

const NF = P.fields.length;
const charterOf = (state) => P.charter[state.prestige.charter] || {};

// Share of the frontier a Rig reaches: 0.6 + 0.04 per level above 1, at most 0.9
export const rigReach = (state, field) => Math.min(P.rigReachMax, P.rigReach0 + P.rigReachStep * (state.fields[field].rig - 1));

export const rigGrade = (state, field) => Fields.gradeOf(rigReach(state, field) * state.fields[field].frontier);

// Rig and hand speed from the best Pressure ever (the sim's fieldSpeed)
export const fieldSpeed = (state) => Math.pow(P.pFieldMult, state.well.pressureBest);

// Material units per second the Field's Rig hauls in `presence` (0 without a Rig)
export function rigRate(state, field, presence) {
  const rig = state.fields[field].rig;
  if (rig === 0) return 0;
  const c = charterOf(state);
  let pr = P[presence];
  if (presence === PRESENCE.WATCH) pr *= c.watch || 1;
  if (presence === PRESENCE.AWAY) pr = Math.min(P.awayCap * P.watch, pr * (c.away || 1) * Math.pow(fracValue(state, FRAC.BITUMEN), P.awayBitumenExp));
  return P.rigBase * rig * Mastery.rigEfficiency(state, field) * fieldSpeed(state) * pr;
}

// One hour of a Field's farming at the Watching rate (the unit Essence prices are quoted in)
export const fieldHour = (state, field) => 3600 * Math.max(rigRate(state, field, PRESENCE.WATCH), P.handFloor);

// Hand farming rate (any Field), before Heat: handMult x the average Rig rate (Watching), at least handFloor
export function handRate(state) {
  let m = 0;
  for (let i = 0; i < NF; i++) m += rigRate(state, i, PRESENCE.WATCH) / NF;
  return P.handMult * Math.max(m, P.handFloor) * (charterOf(state).hand || 1);
}

// Advance every Field by dt seconds in `presence`. Returns { units, rigs }: Material made and the
// number of Rigs that worked (Cauldrons fills Sands from it).
export function step(state, dt, presence, ctx = NO_CONTEXT) {
  const out = { units: 0, rigs: 0 };
  for (let i = 0; i < NF; i++) {
    const f = state.fields[i];
    if (presence === PRESENCE.HANDS && state.presence.handField === i) {
      const g = Fields.pushFrontier(state, i, dt, ctx);
      const u = handRate(state) * Presence.heat(state) * dt;
      Fields.addMaterial(state, i, g, u); out.units += u;
      Mastery.addMastery(state, i, dt / 3600, ctx);
    }
    const rr = rigRate(state, i, presence) * dt;
    if (rr > 0) {
      const rg = rigGrade(state, i);
      // A Rig reaching a new grade brings a Material it has never hauled before
      if (rg > f.rigBestGrade) { f.rigBestGrade = rg; ctx.emit('rigGrade', HIT.NOVELTY, { field: i, grade: rg }); }
      Fields.addMaterial(state, i, rg, rr); out.units += rr; out.rigs++;
      Mastery.addMastery(state, i, (P.rigMasteryShare * dt) / 3600, ctx);
    }
  }
  return out;
}

// A Gusher's Material: every Rig's Watching-rate output for `seconds` at its Rig grade.
// Returns the units paid.
export function haul(state, seconds, ctx = NO_CONTEXT) {
  let units = 0;
  for (let i = 0; i < NF; i++) {
    const u = rigRate(state, i, PRESENCE.WATCH) * seconds;
    if (u > 0) { Fields.addMaterial(state, i, rigGrade(state, i), u); units += u; }
  }
  return units;
}

// --- Rig levels (Prestige calls these; no gating here) -----------------------------------------
export function build(state, field) {
  const f = state.fields[field];
  if (f.rig !== 0) return false;
  f.rig = 1;
  return true;
}
export function levelUp(state, field) {
  const f = state.fields[field];
  if (f.rig < 1) return false;
  f.rig++;
  return true;
}
// A Chronicle: every Rig above level 1 back to 1
export function resetLevels(state) {
  for (const f of state.fields) if (f.rig > 1) f.rig = 1;
}
