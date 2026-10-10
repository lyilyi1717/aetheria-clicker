// Collection: Vials and Mixer Compounds (docs/core-loop-reference.md 3.5, core-loop-redesign.md 4.4 and
// 4.6). Pure functions over the core-loop state. Writes only `collection.*` and
// `refinery.frac[i].vial` / `.compound`; Materials are read and taken only through Fields.js, and
// prices in "hours of farming" use Rigs.fieldHour. Port of `vials`, `mixer` and `buildRecipes` in
// sim/redesign/model.mjs, split into the player's actions (the sim does everything it can in one
// call; that is its stand-in for the player's policy, and lives in the test and the sim driver).
//
// Vials. The player gets P.vialOffersPerDay offers a day (and one per filled Order, via addVialOffers).
// An offer spends 1 unit of a Field's Material at an exact grade to try to unlock that Vial: chance
// P.vialChance, guaranteed on the P.vialPity-th try. Each Vial tier adds P.vialPerTier to the Field's
// Fraction; tier-ups cost hours of Oasis farming.
//
// Mixer. Recipes are content (`recipeAt`), not state: a base batch plus one batch per Chronicle.
// A discovery is deterministic (no RNG; curiosity is the cost: 1 of each ingredient). Re-makes cost
// hours of farming and climb the Compound to Gilded and Royal.
import { P } from './params.js';
import { FIELD, FIELD_FRAC, FRACTIONS, HIT, rand, NO_CONTEXT } from './shared.js';
import * as Fields from './Fields.js';
import * as Rigs from './Rigs.js';

const DAY = 86400;
const NF = P.fields.length;

// ================================================================== Vials
export const VIAL_TIERS = Object.freeze(['clay', 'glass', 'crystal', 'gold', 'aether']);
export const vialKey = (field, grade) => field + ':' + grade;
const parseKey = (key) => {
  const m = /^(\d+):(\d+)$/.exec(key);
  return m ? { field: +m[1], grade: +m[2] } : null;
};
const vialOf = (state, key) => state.collection.vials[key] || null;
const vialFrac = (state, field) => state.refinery.frac[FIELD_FRAC[field]];

// Tier of a Vial (0 = not unlocked) and its id ('none' before it is unlocked)
export const vialTier = (state, key) => (vialOf(state, key) ? vialOf(state, key).tier : 0);
export const vialTierId = (state, key) => (vialTier(state, key) > 0 ? VIAL_TIERS[vialTier(state, key) - 1] : 'none');

// The odds the UI shows for an unlock try on this Vial
export function vialOdds(state, key) {
  const v = vialOf(state, key);
  const pity = v ? v.pity : 0;
  return {
    chance: P.vialChance,
    pity,                                  // misses so far
    guaranteed: pity >= P.vialPity - 1,    // the next try always unlocks
    triesToGuarantee: Math.max(1, P.vialPity - pity),
    offers: state.collection.vialOffers
  };
}
export const vialOffers = (state) => state.collection.vialOffers;

export function addVialOffers(state, n = 1) {
  if (Number.isFinite(n) && n > 0) state.collection.vialOffers += n;
}

// Is a try on (field, grade) possible: an offer, the Vial still locked, the grade reached, 1 unit of that exact grade
export function canOfferVial(state, field, grade) {
  const f = state.fields[field];
  if (!f || !Number.isInteger(grade) || grade < 0 || grade > f.bestGrade) return false;
  return state.collection.vialOffers > 0 && vialTier(state, vialKey(field, grade)) === 0 && (f.inventory[grade] || 0) >= 1;
}

// Spend an offer and 1 unit of Material at exactly `grade` to try to unlock the Vial. Returns null when
// the try is not possible, else { unlocked, pity }. The roll is always made (the sim's order).
export function offerVial(state, field, grade, ctx = NO_CONTEXT) {
  if (!canOfferVial(state, field, grade)) return null;
  const key = vialKey(field, grade);
  const c = state.collection;
  const v = c.vials[key] || (c.vials[key] = { tier: 0, pity: 0 });
  c.vialOffers--;
  Fields.takeMaterial(state, field, grade, 1);   // exact grade: it holds at least 1, so it takes from there first
  if (rand(state) < P.vialChance || v.pity >= P.vialPity - 1) {
    v.tier = 1;
    vialFrac(state, field).vial += P.vialPerTier;
    ctx.emit('vial', HIT.BIG, { key });
    return { unlocked: true, pity: v.pity };
  }
  v.pity++;
  return { unlocked: false, pity: v.pity };
}

// Price of the Vial's next tier in Oasis Materials of any grade (null when locked or at the top)
export function vialUpgradeCost(state, key) {
  const v = vialOf(state, key);
  if (!v || v.tier === 0 || v.tier >= P.vialTiers) return null;
  return P.vialTierHours[v.tier - 1] * Rigs.fieldHour(state, FIELD.OASIS);
}
export function canUpgradeVial(state, key) {
  const cost = vialUpgradeCost(state, key);
  return cost !== null && Fields.countAtLeast(state, FIELD.OASIS, 0) >= cost;
}
export function upgradeVial(state, key, ctx = NO_CONTEXT) {
  const cost = vialUpgradeCost(state, key);
  const k = parseKey(key);
  if (cost === null || !k || !Fields.takeMaterial(state, FIELD.OASIS, 0, cost)) return false;
  const v = state.collection.vials[key];
  v.tier++;
  vialFrac(state, k.field).vial += P.vialPerTier;
  ctx.emit('vialTier', HIT.NOVELTY, { key, tier: v.tier });
  return true;
}

// ================================================================== Recipes (content)
// Pairs of Fields cycle (tower+mine, mine+oasis, oasis+tower); grades spread from `from` up to
// `from + span` over a batch of `count`. Same formula and output as the sim's buildRecipes.
const PAIRS = [[0, 1], [1, 2], [2, 0]];
export function recipeOfBatch(i, count, from, span) {
  const [fa, fb] = PAIRS[i % 3];
  const ga = from + Math.floor((i * span) / count);
  return { fa, ga, fb, gb: Math.max(0, ga - 1 - (i % 2)) };
}
export function buildRecipes(count, from, span) {
  return Array.from({ length: count }, (_, i) => recipeOfBatch(i, count, from, span));
}
const BASE = Object.freeze(buildRecipes(P.recipes, 0, P.recipeGradeMax).map(r => Object.freeze(r)));

export const recipeCount = (state) => P.recipes + state.collection.batchFrom.length * P.recipesPerChronicle;

// Recipe `index`: { fa, ga, fb, gb } (null out of range). A recipe never changes once its batch exists.
export function recipeAt(state, index) {
  if (!Number.isInteger(index) || index < 0 || index >= recipeCount(state)) return null;
  if (index < P.recipes) return BASE[index];
  const j = index - P.recipes;
  const from = state.collection.batchFrom[Math.floor(j / P.recipesPerChronicle)];
  return recipeOfBatch(j % P.recipesPerChronicle, P.recipesPerChronicle, from, P.recipeChronicleSpan);
}

// { found, made, tier } of a recipe, created in step when missing
function entry(state, index) {
  const list = state.collection.recipes;
  while (list.length <= index) list.push({ found: false, made: 0, tier: 0 });
  return list[index];
}

// Keep collection.recipes in step with the table, and add a batch for every Chronicle that has none
// (starting at the highest best grade of any Field now)
function syncRecipes(state) {
  const c = state.collection;
  const top = Math.max(...state.fields.map(f => f.bestGrade));
  while (c.batchFrom.length < state.prestige.chronicles) c.batchFrom.push(top);
  const n = recipeCount(state);
  if (c.recipes.length > n) c.recipes.length = n;
  while (c.recipes.length < n) c.recipes.push({ found: false, made: 0, tier: 0 });
}

export const recipeState = (state, index) => (recipeAt(state, index) ? { ...entry(state, index) } : null);
export const recipeFound = (state, index) => !!state.collection.recipes[index]?.found;
export const recipesFound = (state) => state.collection.recipes.reduce((n, r) => n + (r.found ? 1 : 0), 0);

// A Compound's tier id: 'unknown' before it is found, then 'compound' (tiers 0 and 1: the first
// P.compoundTiers step has no name), 'gilded' at tier 2 and 'royal' at tier 3
export const COMPOUND_TIERS = Object.freeze(['compound', 'gilded', 'royal']);
export function compoundTierId(state, index) {
  const r = state.collection.recipes[index];
  return r && r.found ? COMPOUND_TIERS[Math.max(0, Math.min(r.tier, COMPOUND_TIERS.length) - 1)] : 'unknown';
}

const hasIngredients = (state, r) => Fields.countAtLeast(state, r.fa, r.ga) >= 1 && Fields.countAtLeast(state, r.fb, r.gb) >= 1;

export function canDiscover(state, index) {
  const r = recipeAt(state, index);
  return !!r && !recipeFound(state, index) && hasIngredients(state, r);
}

// Which recipe two dropped Materials make: an exact grade match first, else the first undiscovered
// recipe they satisfy (a higher grade works), else the first found one; -1 when none. Either order.
export function findRecipe(state, fieldA, gradeA, fieldB, gradeB) {
  const n = recipeCount(state);
  let loose = -1, looseFound = -1;
  for (let i = 0; i < n; i++) {
    const r = recipeAt(state, i);
    for (const [fx, gx, fy, gy] of [[fieldA, gradeA, fieldB, gradeB], [fieldB, gradeB, fieldA, gradeA]]) {
      if (fx !== r.fa || fy !== r.fb || gx < r.ga || gy < r.gb) continue;
      if (gx === r.ga && gy === r.gb) return i;
      if (recipeFound(state, i)) { if (looseFound < 0) looseFound = i; } else if (loose < 0) loose = i;
    }
  }
  return loose >= 0 ? loose : looseFound;
}

// How many undiscovered recipes use this Material (this exact grade of this Field) as an ingredient
export function recipesUsing(state, field, grade) {
  let n = 0;
  for (let i = 0; i < recipeCount(state); i++) {
    const r = recipeAt(state, i);
    if (recipeFound(state, i)) continue;
    if ((r.fa === field && r.ga === grade) || (r.fb === field && r.gb === grade)) n++;
  }
  return n;
}

// Take 1 of each ingredient and learn the Compound
export function discover(state, index, ctx = NO_CONTEXT) {
  if (!canDiscover(state, index)) return false;
  const r = recipeAt(state, index);
  Fields.takeMaterial(state, r.fa, r.ga, 1);
  Fields.takeMaterial(state, r.fb, r.gb, 1);
  const e = entry(state, index);
  e.found = true; e.made = 1;
  state.refinery.frac[FIELD_FRAC[r.fa]].compound += P.compoundBonus;
  ctx.emit('compound', HIT.NOVELTY, { recipe: index });
  return true;
}

// Price of a re-make: { a, b } units of each ingredient (hours of each Field's farming)
export function remakeCost(state, index) {
  const r = recipeAt(state, index);
  return r ? { a: P.remakeHours * Rigs.fieldHour(state, r.fa), b: P.remakeHours * Rigs.fieldHour(state, r.fb) } : null;
}
export function canRemake(state, index) {
  const r = recipeAt(state, index);
  const e = state.collection.recipes[index];
  if (!r || !e || !e.found || e.tier >= P.compoundTiers.length) return false;
  const cost = remakeCost(state, index);
  return Fields.countAtLeast(state, r.fa, r.ga) >= cost.a && Fields.countAtLeast(state, r.fb, r.gb) >= cost.b;
}
export function remake(state, index, ctx = NO_CONTEXT) {
  if (!canRemake(state, index)) return false;
  const r = recipeAt(state, index);
  const cost = remakeCost(state, index);
  Fields.takeMaterial(state, r.fa, r.ga, cost.a);
  Fields.takeMaterial(state, r.fb, r.gb, cost.b);
  const e = entry(state, index);
  e.made++;
  if (e.made >= P.compoundTiers[e.tier]) {
    e.tier++;
    if (e.tier >= 2) {
      state.refinery.frac[FIELD_FRAC[r.fa]].compound += P.compoundBonus;
      ctx.emit(e.tier === 2 ? 'gilded' : 'royal', e.tier === 2 ? HIT.NOVELTY : HIT.MAJOR, { recipe: index });
    }
  }
  return true;
}

// ================================================================== step, recompute
// Rebuilds the Vial and Compound parts of the Fractions from the collection (to check a loaded save)
export function recompute(state) {
  const vial = FRACTIONS.map(() => 0), compound = FRACTIONS.map(() => 0);
  for (const [key, v] of Object.entries(state.collection.vials)) {
    const k = parseKey(key);
    if (k && k.field < NF) for (let t = 0; t < v.tier; t++) vial[FIELD_FRAC[k.field]] += P.vialPerTier;
  }
  state.collection.recipes.forEach((e, i) => {
    const r = recipeAt(state, i);
    if (!r || !e.found) return;
    for (let t = 0; t < 1 + Math.max(0, e.tier - 1); t++) compound[FIELD_FRAC[r.fa]] += P.compoundBonus;
  });
  state.refinery.frac.forEach((f, i) => { f.vial = vial[i]; f.compound = compound[i]; });
}

// New day: P.vialOffersPerDay offers (the day is that of the start of the step). New Chronicle: a
// batch of recipes. Presence does not matter.
export function step(state, dt, presence, ctx = NO_CONTEXT) {
  const c = state.collection;
  const day = Math.floor(state.t / DAY);
  if (day !== c.vialDay) { c.vialDay = day; c.vialOffers += P.vialOffersPerDay; }
  syncRecipes(state);
}
