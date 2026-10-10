// Mastery (docs/core-loop-plan.md CL-3): each Field has P.actionsPerField actions that gain hours
// of use and rank up. Pure functions over `state.mastery[i] = { hours[], ranks[] }`, the only part
// of the state written here. Port of addMastery / rankThreshold / rigEff / rankSum in
// sim/redesign/model.mjs. Returns ids, never player-facing text (the UI maps them through t()).
import { P } from './params.js';
import { HIT, NO_CONTEXT } from './shared.js';

const NAMED = P.rankHours.length;                    // ranks 1..NAMED are the named ranks; NAMED is Legend
// Rank ids by rank number: 0 has no rank yet; the last named rank is Legend
export const RANK_IDS = Object.freeze(['unranked', 'novice', 'apprentice', 'adept', 'expert', 'legend'].slice(0, NAMED + 1));

// Hours on an action needed for rank + 1: the named ranks, then Legend II, III, ... every legendHours
export function rankThreshold(rank) {
  return rank < NAMED ? P.rankHours[rank] : P.rankHours[NAMED - 1] + P.legendHours * (rank - NAMED + 1);
}

// Ranks past Legend (0 at Legend, negative below it)
const pastLegend = (rank) => rank - NAMED;

// True for Legend and every legendTitleEvery ranks past it (Legend V, X, ...): the L4 ranks
export function isTitleRank(rank) {
  const past = pastLegend(rank);
  return past === 0 || (past > 0 && past % P.legendTitleEvery === 0);
}

// What the UI shows for a rank: { id, level, title }. id is from RANK_IDS (capped at legend); level
// is the Legend number (1 = Legend, 2 = Legend II ...) or 0 below Legend; title is true at L4 ranks.
export function rankInfo(rank) {
  const past = pastLegend(rank);
  return {
    id: RANK_IDS[Math.min(rank, NAMED)],
    level: past >= 0 ? past + 1 : 0,
    title: isTitleRank(rank)
  };
}

// Progress of one action toward its next rank: { rank, hours, from, to, fraction }
export function actionProgress(state, field, action) {
  const m = state.mastery[field];
  const rank = m.ranks[action];
  const from = rank === 0 ? 0 : rankThreshold(rank - 1);
  const to = rankThreshold(rank);
  const fraction = Math.max(0, Math.min(1, (m.hours[action] - from) / (to - from)));
  return { rank, hours: m.hours[action], from, to, fraction };
}

// Add hours to one action and rank it up as far as the hours allow. Emits `rank` for each rank gained
export function addActionMastery(state, field, action, hours, ctx = NO_CONTEXT) {
  const m = state.mastery[field];
  m.hours[action] += hours;
  while (m.hours[action] >= rankThreshold(m.ranks[action])) {
    m.ranks[action]++;
    ctx.emit('rank', isTitleRank(m.ranks[action]) ? HIT.MAJOR : HIT.BIG, { field, action, rank: m.ranks[action] });
  }
}

// Add `hours` of play to a Field, split over its actions by P.actionShare
export function addMastery(state, field, hours, ctx = NO_CONTEXT) {
  for (let a = 0; a < P.actionsPerField; a++) addActionMastery(state, field, a, hours * P.actionShare[a], ctx);
}

// Sum of the Field's ranks, each capped at Legend
export function rankSum(state, field) {
  return state.mastery[field].ranks.reduce((x, y) => x + Math.min(y, NAMED), 0);
}

// Rig efficiency of the Field's Rig (the sim's rigEff)
export function rigEfficiency(state, field) {
  return P.rigEffBase + P.rigEffMastery * (rankSum(state, field) / P.actionsPerField) / NAMED;
}

// School power: the factor mastery gives the Field's power (inside the sim's fieldPower)
export function schoolPower(state, field) {
  return 1 + P.schoolPower * rankSum(state, field) / P.actionsPerField;
}
