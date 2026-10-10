// CL-5: Collection (js/systems/coreloop/Collection.js) against the sim's vials, mixer and buildRecipes
import assert from 'node:assert/strict';
import { P } from './js/systems/coreloop/params.js';
import { createCoreLoopState, serializeCoreLoop, deserializeCoreLoop } from './js/systems/coreloop/state.js';
import { HIT, FIELD, FIELD_FRAC, FRAC, rand, makeContext } from './js/systems/coreloop/shared.js';
import * as Fields from './js/systems/coreloop/Fields.js';
import * as Rigs from './js/systems/coreloop/Rigs.js';
import * as Collection from './js/systems/coreloop/Collection.js';
import * as sim from './sim/redesign/model.mjs';
import { PROFILES } from './sim/redesign/profiles.mjs';

const TOL = 1e-9;
const near = (a, b, what) => {
  const d = Math.abs(a - b);
  assert.ok(d <= TOL * Math.max(1, Math.abs(a), Math.abs(b)), `${what}: game ${a} vs sim ${b}`);
};
const NF = P.fields.length;
const DAY = 86400;
const kinds = (events) => events.reduce((m, e) => { const k = e.kind || e.k; m[k] = (m[k] || 0) + 1; return m; }, {});

// A tiny deterministic generator for the test's own inputs (not the game's rng)
function lcg(seed) {
  let x = seed >>> 0;
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
}

// The sim's state as a game state (README.md "Game vs sim"), with the same rng
function toGame(s) {
  const g = createCoreLoopState();
  g.t = s.t; g.rng = s.rng;
  s.fields.forEach((f, i) => {
    Object.assign(g.fields[i], { frontier: f.F, bestGrade: f.bestGrade, inventory: [...f.inv], rig: f.rig, rigBestGrade: f.rigBest });
    g.mastery[i].hours = [...f.hours]; g.mastery[i].ranks = [...f.ranks];
  });
  g.well.pressureBest = s.pressureBest;
  g.prestige.charter = s.charter;
  g.refinery.frac.forEach((f, i) => { f.level = s.frac[i].level; f.bubble = s.frac[i].bub; f.vial = s.frac[i].vial; f.compound = s.frac[i].extra; });
  return g;
}

function midSim(seed) {
  const s = sim.newState(PROFILES.casual, seed);
  s.charter = 'none'; s.pressureBest = 12;
  s.fields[0].rig = 3; s.fields[1].rig = 2; s.fields[2].rig = 6;
  s.fields.forEach((f, i) => { f.F = [60, 55, 70][i]; f.bestGrade = sim.gradeOf(f.F); });
  s.log = true;
  return s;
}

// Same random Material to both
function feed(s, g, rnd, n, maxGrade) {
  for (let k = 0; k < n; k++) {
    const fi = Math.floor(rnd() * NF), gr = Math.floor(rnd() * (maxGrade + 1));
    const units = Math.floor(rnd() * 4000) / 4 + (rnd() < 0.3 ? 1 : 0);
    sim.addInv(s.fields[fi], gr, units); Fields.addMaterial(g, fi, gr, units);
  }
}

function compare(s, g, what) {
  assert.equal(g.rng, s.rng, `${what}: rng`);
  assert.equal(g.collection.vialOffers, s.vialOffers, `${what}: offers`);
  assert.equal(g.collection.vialDay, s.vialDay, `${what}: day`);
  const keys = new Set([...Object.keys(s.vials), ...Object.keys(g.collection.vials)]);
  for (const k of keys) {
    const a = g.collection.vials[k] || { tier: 0, pity: 0 }, b = s.vials[k] || { tier: 0, pity: 0 };
    assert.deepEqual(a, { tier: b.tier, pity: b.pity }, `${what}: vial ${k}`);
  }
  assert.equal(Collection.recipeCount(g), s.recipes.length, `${what}: recipe count`);
  assert.equal(g.collection.recipes.length, s.recipes.length);
  s.recipes.forEach((r, i) => {
    const t = Collection.recipeAt(g, i), e = g.collection.recipes[i];
    assert.deepEqual({ ...t }, { fa: r.fa, ga: r.ga, fb: r.fb, gb: r.gb }, `${what}: recipe ${i}`);
    assert.deepEqual({ ...e }, { found: r.found, made: r.made, tier: r.tier }, `${what}: recipe state ${i}`);
  });
  for (let i = 0; i < NF; i++) {
    const n = Math.max(s.fields[i].inv.length, g.fields[i].inventory.length);
    for (let k = 0; k < n; k++) near(g.fields[i].inventory[k] || 0, s.fields[i].inv[k] || 0, `${what}: inventory ${i}:${k}`);
  }
  g.refinery.frac.forEach((f, i) => {
    near(f.vial, s.frac[i].vial, `${what}: vial bonus ${i}`);
    near(f.compound, s.frac[i].extra, `${what}: compound bonus ${i}`);
  });
}

// --- the sim's policy, played with the game's actions --------------------------------------------
const surplus = (g, field) => Fields.countAtLeast(g, field, 0);   // no open Orders in these states

function playVials(g, simVialKeys, ctx) {
  Collection.step(g, 0, 'watch', ctx);
  g.fields.forEach((f, i) => {
    for (let gr = 0; gr <= f.bestGrade; gr++) if (Collection.canOfferVial(g, i, gr)) Collection.offerVial(g, i, gr, ctx);
  });
  for (const key of simVialKeys) {
    const cost = Collection.vialUpgradeCost(g, key);
    if (cost === null || surplus(g, FIELD.OASIS) < cost) continue;
    assert.ok(Collection.upgradeVial(g, key, ctx));
  }
}

function playMixer(g, ctx) {
  let remade = false;
  for (let i = 0; i < Collection.recipeCount(g); i++) {
    const r = Collection.recipeAt(g, i), e = g.collection.recipes[i];
    if (Fields.countAtLeast(g, r.fa, r.ga) < 1 || Fields.countAtLeast(g, r.fb, r.gb) < 1) continue;
    if (!e.found) {
      if (rand(g) >= P.mixerChance) continue;     // the sim's stand-in for the player's curiosity
      assert.ok(Collection.discover(g, i, ctx));
      continue;
    }
    if (remade || e.tier >= P.compoundTiers.length) continue;
    const cost = Collection.remakeCost(g, i);
    if (surplus(g, r.fa) < cost.a || surplus(g, r.fb) < cost.b) continue;
    if (!Collection.canRemake(g, i)) continue;
    assert.ok(Collection.remake(g, i, ctx));
    remade = true;
  }
}

console.log('--- recipes: a deterministic table equal to the sim\'s buildRecipes ---');
{
  const g = createCoreLoopState();
  const base = sim.buildRecipes(P.recipes, 0, P.recipeGradeMax);
  assert.equal(Collection.recipeCount(g), P.recipes);
  base.forEach((r, i) => assert.deepEqual({ ...Collection.recipeAt(g, i) }, { fa: r.fa, ga: r.ga, fb: r.fb, gb: r.gb }, `recipe ${i}`));
  for (let i = 0; i < P.recipes; i++) assert.equal(Collection.recipeAt(g, i), Collection.recipeAt(createCoreLoopState(), i), 'the same table every time');
  assert.equal(Collection.recipeAt(g, P.recipes), null);
  assert.equal(Collection.recipeAt(g, -1), null);
  assert.equal(Collection.recipeAt(g, 1.5), null);
  assert.deepEqual(Collection.buildRecipes(P.recipes, 0, P.recipeGradeMax).map(r => ({ ...r })), base.map(r => ({ fa: r.fa, ga: r.ga, fb: r.fb, gb: r.gb })));
  // fields cycle in pairs, grades climb to the top of the range
  assert.ok(base.every(r => r.fa !== r.fb && r.gb <= r.ga));
  assert.equal(base[P.recipes - 1].ga, Math.floor(((P.recipes - 1) * P.recipeGradeMax) / P.recipes));
  // a Chronicle adds a batch starting at the highest best grade, span P.recipeChronicleSpan
  g.fields[1].bestGrade = 17;
  g.prestige.chronicles = 1;
  Collection.step(g, 0, 'watch');
  assert.deepEqual(g.collection.batchFrom, [17]);
  assert.equal(Collection.recipeCount(g), P.recipes + P.recipesPerChronicle);
  assert.equal(g.collection.recipes.length, P.recipes + P.recipesPerChronicle);
  const batch = sim.buildRecipes(P.recipesPerChronicle, 17, P.recipeChronicleSpan);
  batch.forEach((r, i) => assert.deepEqual({ ...Collection.recipeAt(g, P.recipes + i) }, { fa: r.fa, ga: r.ga, fb: r.fb, gb: r.gb }, `batch recipe ${i}`));
  // stepping again adds nothing; a later Chronicle at a higher grade adds the next batch; old recipes stay put
  Collection.step(g, 0, 'watch');
  assert.equal(g.collection.batchFrom.length, 1);
  const first = { ...Collection.recipeAt(g, P.recipes + 2) };
  g.fields[0].bestGrade = 33; g.prestige.chronicles = 2;
  Collection.step(g, 0, 'watch');
  assert.deepEqual(g.collection.batchFrom, [17, 33]);
  assert.deepEqual({ ...Collection.recipeAt(g, P.recipes + 2) }, first);
  sim.buildRecipes(P.recipesPerChronicle, 33, P.recipeChronicleSpan).forEach((r, i) =>
    assert.deepEqual({ ...Collection.recipeAt(g, P.recipes + P.recipesPerChronicle + i) }, { fa: r.fa, ga: r.ga, fb: r.fb, gb: r.gb }));
  // two Chronicles in one step add two batches
  const h = createCoreLoopState();
  h.prestige.chronicles = 2; h.fields[2].bestGrade = 5;
  Collection.step(h, 0, 'watch');
  assert.deepEqual(h.collection.batchFrom, [5, 5]);
  // the batch table survives a save and load
  const back = deserializeCoreLoop(JSON.parse(JSON.stringify(serializeCoreLoop(g))));
  for (let i = 0; i < Collection.recipeCount(g); i++) assert.deepEqual({ ...Collection.recipeAt(back, i) }, { ...Collection.recipeAt(g, i) });
}

console.log('--- vials: offers, odds, pity ---');
{
  const g = createCoreLoopState();
  g.fields[0].bestGrade = 3;
  Fields.addMaterial(g, 0, 2, 50);
  assert.equal(Collection.canOfferVial(g, 0, 2), false, 'no offers yet');
  assert.equal(Collection.offerVial(g, 0, 2), null);
  // a new day gives the daily offers, once
  Collection.step(g, 0, 'watch');
  assert.equal(Collection.vialOffers(g), P.vialOffersPerDay);
  Collection.step(g, 100, 'watch');
  assert.equal(Collection.vialOffers(g), P.vialOffersPerDay, 'same day: no more');
  g.t = DAY * 5.5;
  Collection.step(g, 0, 'watch');
  assert.equal(Collection.vialOffers(g), 2 * P.vialOffersPerDay);
  Collection.addVialOffers(g, 2); Collection.addVialOffers(g); Collection.addVialOffers(g, -5); Collection.addVialOffers(g, NaN);
  assert.equal(Collection.vialOffers(g), 2 * P.vialOffersPerDay + 3);
  // odds shown for the UI
  const o = Collection.vialOdds(g, '0:2');
  assert.deepEqual(o, { chance: P.vialChance, pity: 0, guaranteed: false, triesToGuarantee: P.vialPity, offers: 2 * P.vialOffersPerDay + 3 });
  // refusals change nothing
  const snap = JSON.stringify(serializeCoreLoop(g));
  assert.equal(Collection.offerVial(g, 0, 4), null, 'grade above the best reached');
  assert.equal(Collection.offerVial(g, 0, 1), null, 'no Material at that exact grade');
  assert.equal(Collection.offerVial(g, 1, 0), null, 'empty Field');
  assert.equal(Collection.offerVial(g, 0, 1.5), null);
  assert.equal(Collection.offerVial(g, 0, -1), null);
  assert.equal(Collection.offerVial(g, 7, 0), null);
  assert.equal(JSON.stringify(serializeCoreLoop(g)), snap);
  // Material of a higher grade does not stand in for the exact grade
  Fields.addMaterial(g, 0, 3, 9);
  assert.equal(Collection.canOfferVial(g, 0, 1), false);
  // the pity counter: misses raise it; at vialPity - 1 the try always unlocks
  let tried = 0;
  const ctx = makeContext();
  for (let seed = 1; seed <= 60; seed++) {
    const h = createCoreLoopState(seed);
    h.fields[1].bestGrade = 4; h.collection.vialOffers = 99;
    Fields.addMaterial(h, 1, 4, 99);
    let n = 0, r;
    do { r = Collection.offerVial(h, 1, 4, ctx); n++; if (!r.unlocked) assert.equal(r.pity, n); } while (!r.unlocked);
    assert.ok(n <= P.vialPity, `seed ${seed}: unlocked by try ${n}`);
    assert.equal(h.collection.vialOffers, 99 - n, 'each try spends an offer');
    assert.equal(Fields.countAtLeast(h, 1, 4), 99 - n, 'and one unit');
    near(h.refinery.frac[FIELD_FRAC[1]].vial, P.vialPerTier, 'unlock adds a tier of bonus');
    assert.equal(Collection.canOfferVial(h, 1, 4), false, 'an unlocked Vial takes no more tries');
    tried += n;
  }
  assert.ok(tried > 60 && tried < 60 * P.vialPity, 'some seeds miss, some hit first');
  // forced pity
  const h = createCoreLoopState(5);
  h.fields[2].bestGrade = 1; h.collection.vialOffers = 5; Fields.addMaterial(h, 2, 1, 5);
  h.collection.vials['2:1'] = { tier: 0, pity: P.vialPity - 1 };
  assert.equal(Collection.vialOdds(h, '2:1').guaranteed, true);
  assert.equal(Collection.vialOdds(h, '2:1').triesToGuarantee, 1);
  assert.equal(Collection.offerVial(h, 2, 1).unlocked, true);
  assert.equal(Collection.vialTier(h, '2:1'), 1);
  assert.equal(Collection.vialTierId(h, '2:1'), 'clay');
  assert.equal(Collection.vialTierId(h, '2:0'), 'none');
}

console.log('--- vial tiers cost hours of Oasis farming ---');
{
  const g = createCoreLoopState();
  g.fields[FIELD.OASIS].rig = 7; g.well.pressureBest = 9;
  g.collection.vials['0:1'] = { tier: 1, pity: 0 };
  g.collection.vials['1:2'] = { tier: 0, pity: 1 };
  const hour = Rigs.fieldHour(g, FIELD.OASIS);
  assert.ok(hour > 3600 * P.handFloor);
  const ctx = makeContext();
  assert.equal(Collection.vialUpgradeCost(g, '1:2'), null, 'locked');
  assert.equal(Collection.vialUpgradeCost(g, '9:9'), null);
  assert.equal(Collection.upgradeVial(g, '0:1', ctx), false, 'nothing to pay with');
  Fields.addMaterial(g, FIELD.OASIS, 0, hour * 2.5);
  Fields.addMaterial(g, FIELD.OASIS, 6, hour * 200);
  Fields.addMaterial(g, FIELD.TOWER, 0, 1e9);
  let have = Fields.countAtLeast(g, FIELD.OASIS, 0);
  for (let tier = 1; tier < P.vialTiers; tier++) {
    near(Collection.vialUpgradeCost(g, '0:1'), P.vialTierHours[tier - 1] * hour, `tier ${tier} price`);
    assert.equal(Collection.canUpgradeVial(g, '0:1'), true);
    assert.equal(Collection.upgradeVial(g, '0:1', ctx), true);
    have -= P.vialTierHours[tier - 1] * hour;
    near(Fields.countAtLeast(g, FIELD.OASIS, 0), have, `Oasis stock after tier ${tier + 1}`);
    assert.equal(Collection.vialTier(g, '0:1'), tier + 1);
  }
  assert.equal(Collection.vialTierId(g, '0:1'), 'aether');
  assert.equal(Collection.vialUpgradeCost(g, '0:1'), null, 'top tier');
  assert.equal(Collection.upgradeVial(g, '0:1', ctx), false);
  near(g.refinery.frac[FIELD_FRAC[0]].vial, P.vialPerTier * (P.vialTiers - 1), 'each tier adds to the Fraction');
  assert.equal(g.fields[FIELD.TOWER].inventory[0], 1e9, 'only Oasis Material is spent');
  assert.deepEqual(ctx.events.map(e => [e.kind, e.level, e.key, e.tier]),
    [2, 3, 4, 5].map(t => ['vialTier', HIT.NOVELTY, '0:1', t]));
  // a price the stock misses by a hair is refused whole
  const h = createCoreLoopState();
  h.fields[2].rig = 1; h.collection.vials['0:0'] = { tier: 1, pity: 0 };
  const need = Collection.vialUpgradeCost(h, '0:0');
  Fields.addMaterial(h, 2, 3, need * 0.999);
  assert.equal(Collection.upgradeVial(h, '0:0'), false);
  near(Fields.countAtLeast(h, 2, 0), need * 0.999, 'unchanged');
}

console.log('--- mixer: discover, find, re-make, tiers ---');
{
  const g = createCoreLoopState();
  const r0 = Collection.recipeAt(g, 0), r5 = Collection.recipeAt(g, 20);
  assert.equal(Collection.canDiscover(g, 20), false, 'no Material');
  assert.equal(Collection.discover(g, 20), false);
  assert.equal(Collection.canDiscover(g, 999), false);
  assert.equal(Collection.canRemake(g, 20), false);
  // the ingredient may be of a higher grade; the lowest grade that qualifies is used first
  Fields.addMaterial(g, r5.fa, r5.ga + 3, 2);
  Fields.addMaterial(g, r5.fa, r5.ga, 1);
  Fields.addMaterial(g, r5.fb, r5.gb + 1, 1);
  assert.equal(Collection.canDiscover(g, 20), true);
  const ctx = makeContext();
  assert.equal(Collection.discover(g, 20, ctx), true);
  assert.deepEqual(g.collection.recipes[20], { found: true, made: 1, tier: 0 });
  assert.equal(g.fields[r5.fa].inventory[r5.ga], 0);
  assert.equal(g.fields[r5.fa].inventory[r5.ga + 3], 2);
  assert.equal(g.fields[r5.fb].inventory[r5.gb + 1], 0);
  near(g.refinery.frac[FIELD_FRAC[r5.fa]].compound, P.compoundBonus, 'bonus');
  assert.deepEqual(ctx.events, [{ kind: 'compound', level: HIT.NOVELTY, recipe: 20 }]);
  assert.equal(Collection.canDiscover(g, 20), false, 'found once');
  assert.equal(Collection.discover(g, 20), false);
  assert.equal(Collection.compoundTierId(g, 20), 'compound');
  assert.equal(Collection.compoundTierId(g, 21), 'unknown');
  assert.equal(Collection.recipesFound(g), 1);
  // finding the recipe from two dropped Materials, either order
  assert.equal(Collection.findRecipe(g, r0.fa, r0.ga, r0.fb, r0.gb), 0);
  assert.equal(Collection.findRecipe(g, r0.fb, r0.gb, r0.fa, r0.ga), 0);
  assert.equal(Collection.findRecipe(g, r0.fa, r0.ga + 40, r0.fb, r0.gb + 40), 0 , 'higher grades still make recipe 0 (the first undiscovered match)');
  assert.equal(Collection.findRecipe(g, r5.fa, r5.ga, r5.fb, r5.gb), 20, 'a found recipe is still found by its exact Materials');
  assert.equal(Collection.findRecipe(g, r0.fa, r0.ga, r0.fa, r0.ga), -1, 'two of the same Field');
  assert.equal(Collection.findRecipe(g, r0.fa, 0, r0.fb, 0), r0.ga === 0 ? 0 : -1);
  // hints
  const hint = Collection.recipesUsing(g, r0.fa, r0.ga);
  let want = 0;
  for (let i = 0; i < P.recipes; i++) {
    const r = Collection.recipeAt(g, i);
    if (i !== 20 && ((r.fa === r0.fa && r.ga === r0.ga) || (r.fb === r0.fa && r.gb === r0.ga))) want++;
  }
  assert.equal(hint, want);
  assert.ok(hint >= 1);
  assert.equal(Collection.recipesUsing(g, 0, 9999), 0);

  // re-makes: price in hours of each Field's farming, tiers at P.compoundTiers
  const h = createCoreLoopState();
  h.fields.forEach((f, i) => { f.rig = 2 + i; });
  const r = Collection.recipeAt(h, 3);
  Fields.addMaterial(h, r.fa, r.ga, 1); Fields.addMaterial(h, r.fb, r.gb, 1);
  const hctx = makeContext();
  assert.equal(Collection.canRemake(h, 3), false, 'not found yet');
  Collection.discover(h, 3, hctx);
  const cost = Collection.remakeCost(h, 3);
  near(cost.a, P.remakeHours * Rigs.fieldHour(h, r.fa), 'cost a');
  near(cost.b, P.remakeHours * Rigs.fieldHour(h, r.fb), 'cost b');
  assert.equal(Collection.remake(h, 3, hctx), false, 'no Material');
  Fields.addMaterial(h, r.fa, r.ga, cost.a * 130); Fields.addMaterial(h, r.fb, r.gb + 2, cost.b * 130);
  let a0 = Fields.countAtLeast(h, r.fa, r.ga);
  for (let n = 2; n <= P.compoundTiers[P.compoundTiers.length - 1]; n++) {
    assert.equal(Collection.remake(h, 3, hctx), true);
    a0 -= cost.a;
    near(Fields.countAtLeast(h, r.fa, r.ga), a0, `stock after make ${n}`);
    assert.equal(h.collection.recipes[3].made, n);
    assert.equal(Collection.compoundTierId(h, 3), ['compound', 'compound', 'gilded', 'royal'][h.collection.recipes[3].tier]);
  }
  assert.equal(h.collection.recipes[3].tier, P.compoundTiers.length);
  assert.equal(Collection.compoundTierId(h, 3), 'royal');
  assert.equal(Collection.canRemake(h, 3), false, 'Royal is the top');
  assert.equal(Collection.remake(h, 3, hctx), false);
  near(h.refinery.frac[FIELD_FRAC[r.fa]].compound, 3 * P.compoundBonus, 'found + Gilded + Royal');
  assert.deepEqual(hctx.events.map(e => [e.kind, e.level, e.recipe]),
    [['compound', HIT.NOVELTY, 3], ['gilded', HIT.NOVELTY, 3], ['royal', HIT.MAJOR, 3]]);
  // a re-make short of one Field's Material takes nothing from the other
  const k = createCoreLoopState();
  k.fields.forEach(f => { f.rig = 3; });
  Fields.addMaterial(k, r.fa, r.ga, 1); Fields.addMaterial(k, r.fb, r.gb, 1);
  Collection.discover(k, 3);
  const c2 = Collection.remakeCost(k, 3);
  Fields.addMaterial(k, r.fa, r.ga, c2.a * 5);
  Fields.addMaterial(k, r.fb, r.gb, c2.b * 0.5);
  const before = JSON.stringify(k.fields);
  assert.equal(Collection.remake(k, 3), false);
  assert.equal(JSON.stringify(k.fields), before);
}

console.log('--- vials against the sim (same inputs, same rolls) ---');
for (const seed of [1, 7, 12345]) {
  const s = midSim(seed), g = toGame(s), ctx = makeContext(), rnd = lcg(seed * 977);
  sim.addInv(s.fields[0], 0, 0); // touch
  let unlocked = 0, upgrades = 0;
  for (let round = 0; round < 80; round++) {
    s.t = g.t = round * DAY * 0.45;
    if (round % 9 === 0) for (let i = 0; i < NF; i++) { s.fields[i].bestGrade += 1; g.fields[i].bestGrade += 1; }
    feed(s, g, rnd, 6, Math.max(...s.fields.map(f => f.bestGrade)));
    // plenty of Oasis Material so tiers go up too, now and then
    if (round % 11 === 5) { const u = sim.fieldHour(s, FIELD.OASIS) * 40; sim.addInv(s.fields[2], 1, u); Fields.addMaterial(g, 2, 1, u); }
    s.events.length = 0; ctx.events.length = 0;
    sim.vials(s);
    playVials(g, Object.keys(s.vials), ctx);
    compare(s, g, `vials seed ${seed} round ${round}`);
    const sk = kinds(s.events), gk = kinds(ctx.events);
    assert.equal(gk.vial || 0, sk.vial || 0, 'vial events');
    assert.equal(gk.vialTier || 0, sk.vialTier || 0, 'vialTier events');
    unlocked += gk.vial || 0; upgrades += gk.vialTier || 0;
  }
  assert.ok(unlocked > 10 && upgrades > 3, `seed ${seed} exercised: ${unlocked} unlocks, ${upgrades} tier-ups`);
  // recompute rebuilds the bonuses from the collection
  const keep = g.refinery.frac.map(f => ({ vial: f.vial, compound: f.compound }));
  g.refinery.frac.forEach(f => { f.vial = 99; f.compound = 99; });
  Collection.recompute(g);
  g.refinery.frac.forEach((f, i) => { near(f.vial, keep[i].vial, 'recomputed vial'); near(f.compound, keep[i].compound, 'recomputed compound'); });
}

console.log('--- mixer against the sim (same inputs, same rolls), with Chronicle batches ---');
for (const seed of [2, 9, 4242]) {
  const s = midSim(seed), g = toGame(s), ctx = makeContext(), rnd = lcg(seed * 31);
  const seen = {};
  for (let round = 0; round < 360; round++) {
    s.t = g.t = round * 3600;
    if (round === 120 || round === 240) {
      // a Chronicle: the sim pushes a batch starting at the highest best grade; the game finds it in step
      s.fields[round === 120 ? 0 : 1].bestGrade += 6; g.fields[round === 120 ? 0 : 1].bestGrade += 6;
      const top = Math.max(...s.fields.map(f => f.bestGrade));
      s.recipes.push(...sim.buildRecipes(P.recipesPerChronicle, top, P.recipeChronicleSpan));
      s.chronicles++; g.prestige.chronicles++;
    }
    // the game's step adds the daily offers and any Chronicle batch; the sim's mixer has no offers, so keep that part equal
    Collection.step(g, 0, 'watch');
    s.vialDay = g.collection.vialDay; s.vialOffers = g.collection.vialOffers;
    const maxGrade = 8 + Math.floor(round / 6);
    feed(s, g, rnd, 14, Math.min(maxGrade, 70));
    s.events.length = 0; ctx.events.length = 0;
    sim.mixer(s);
    playMixer(g, ctx);
    compare(s, g, `mixer seed ${seed} round ${round}`);
    const sk = kinds(s.events), gk = kinds(ctx.events);
    for (const k of ['compound', 'gilded', 'royal']) { assert.equal(gk[k] || 0, sk[k] || 0, `${k} events`); seen[k] = (seen[k] || 0) + (gk[k] || 0); }
  }
  assert.ok(seen.compound > 20, `seed ${seed}: ${seen.compound} discoveries`);
  assert.ok(seen.gilded >= 1, `seed ${seed}: a Compound reached Gilded`);
  assert.equal(Collection.recipeCount(g), P.recipes + 2 * P.recipesPerChronicle);
  const keep = g.refinery.frac.map(f => f.compound);
  g.refinery.frac.forEach(f => { f.compound = 0; });
  Collection.recompute(g);
  g.refinery.frac.forEach((f, i) => near(f.compound, keep[i], `recomputed compound ${i}`));
  // sim extra == game compound, and the save keeps everything
  const back = deserializeCoreLoop(JSON.parse(JSON.stringify(serializeCoreLoop(g))));
  assert.deepEqual(back.collection, g.collection);
  back.refinery.frac.forEach((f, i) => near(f.compound, s.frac[i].extra, 'sim extra after a round trip'));
}

console.log('--- the collection round-trips through the save ---');
{
  const g = createCoreLoopState(3);
  g.fields.forEach((f, i) => { f.bestGrade = 6; f.rig = 2; Fields.addMaterial(f, 1, 0.5, 0); });
  for (let i = 0; i < NF; i++) Fields.addMaterial(g, i, 5, 500);
  for (let i = 0; i < NF; i++) Fields.addMaterial(g, i, 30, 500);
  g.collection.vialOffers = 30;
  g.prestige.chronicles = 1;
  Collection.step(g, 0, 'watch');
  for (let gr = 0; gr <= 6; gr++) Collection.offerVial(g, 0, gr);
  for (let i = 0; i < Collection.recipeCount(g); i++) Collection.discover(g, i);
  const back = deserializeCoreLoop(JSON.parse(JSON.stringify(serializeCoreLoop(g))));
  assert.deepEqual(back.collection, g.collection);
  const before = back.refinery.frac.map(f => [f.vial, f.compound]);
  Collection.recompute(back);
  back.refinery.frac.forEach((f, i) => { near(f.vial, before[i][0], 'vial'); near(f.compound, before[i][1], 'compound'); });
  assert.ok(g.collection.recipes.some(r => r.found));
  // an old save without batchFrom loads with none and gets one in step if it has Chronicles
  const old = JSON.parse(JSON.stringify(serializeCoreLoop(g)));
  delete old.collection.batchFrom;
  const loaded = deserializeCoreLoop(old);
  assert.deepEqual(loaded.collection.batchFrom, []);
  Collection.step(loaded, 0, 'watch');
  assert.equal(loaded.collection.batchFrom.length, 1);
}

console.log('--- Collection writes nothing it does not own ---');
{
  const g = createCoreLoopState(4);
  g.fields.forEach(f => { f.rig = 2; f.bestGrade = 3; });
  for (let i = 0; i < NF; i++) for (let gr = 0; gr < 40; gr++) Fields.addMaterial(g, i, gr, 5000);
  g.collection.vialOffers = 9;
  const frozen = serializeCoreLoop(g);
  const pick = (s) => JSON.stringify({ ...s, collection: null, fields: s.fields.map(f => ({ ...f, inventory: null })), refinery: { ...s.refinery, frac: s.refinery.frac.map(f => ({ ...f, vial: 0, compound: 0 })) }, rng: 0 });
  const ctx = makeContext();
  Collection.step(g, 10, 'watch', ctx);
  for (let i = 0; i < 20; i++) { Collection.offerVial(g, i % NF, i % 4, ctx); Collection.discover(g, i, ctx); Collection.remake(g, i, ctx); }
  assert.equal(pick(serializeCoreLoop(g)), pick(frozen));
  assert.ok(FRAC.GAS === 0);
}

console.log('test_cl_collection: OK');
