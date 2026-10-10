// CL-15: the core-loop Refinery screen. Node has no DOM, so this covers the pure view models the
// screen draws from and the screen's strings (every key has Arabic with the same placeholders).
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { P } from './js/systems/coreloop/params.js';
import { FIELD, FRACTIONS, PRESENCE, makeContext } from './js/systems/coreloop/shared.js';
import { createCoreLoopState } from './js/systems/coreloop/state.js';
import * as Fields from './js/systems/coreloop/Fields.js';
import * as Rigs from './js/systems/coreloop/Rigs.js';
import * as Refinery from './js/systems/coreloop/Refinery.js';
import * as Cauldrons from './js/systems/coreloop/Cauldrons.js';
import * as Collection from './js/systems/coreloop/Collection.js';
import './js/ui/coreloop/shell.js';
import * as UI from './js/ui/coreloop/refinery.js';
import EN_R from './js/i18n/coreloop/refinery.en.js';
import AR_R from './js/i18n/coreloop/refinery.ar.js';
import EN from './js/i18n/en.js';
import AR from './js/i18n/ar.js';

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };

// ---- strings
const ph = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
ok(Object.keys(EN_R).length > 60, 'the screen has strings');
for (const k of Object.keys(EN_R)) {
  ok(k.startsWith('cl.refinery.'), `${k} is under cl.refinery.`);
  ok(typeof AR_R[k] === 'string' && AR_R[k].length > 0, `${k} has Arabic`);
  eq(ph(AR_R[k]), ph(EN_R[k]), `${k} Arabic keeps the placeholders`);
  ok(!/[A-Za-z]{3,}/.test(AR_R[k].replace(/\{\w+\}/g, '')), `${k} Arabic has no Latin words`);
  ok(EN[k] === EN_R[k] && AR[k] === AR_R[k], `${k} is registered`);
}
for (const k of Object.keys(AR_R)) ok(k in EN_R, `${k} Arabic has an English key`);
// every dynamic key the screen builds exists
for (const f of FRACTIONS) { ok(`cl.frac.${f}` in EN, f); ok(`cl.refinery.powers.${f}` in EN, f); }
for (const c of P.cauldrons) { ok(`cl.dallah.${c}` in EN, c); ok(`cl.refinery.fills.${c}` in EN, c); }
for (const f of P.fields) ok(`cl.field.${f}` in EN, f);
for (const id of [...Collection.VIAL_TIERS, ...Collection.COMPOUND_TIERS, 'none', 'unknown']) ok(`cl.refinery.tier.${id}` in EN, id);
for (const p of Object.values(PRESENCE)) ok(`cl.shell.state.${p}` in EN, p);

// ---- formatting
const fmt = (x) => (x && typeof x.format === 'function' ? x.format() : String(Math.round(Number(x) || 0)));
eq(UI.fmtNum(fmt, 3.04), '3', 'under 10: one decimal, trimmed');
eq(UI.fmtNum(fmt, 3.26), '3.3');
eq(UI.fmtNum(fmt, 1234.4), '1234');
eq(UI.fmtNum(fmt, Infinity), '∞');
eq(UI.fmtMult(fmt, 1.5), '1.500');

// ---- a running state
function running() {
  const s = createCoreLoopState(7);
  s.fields.forEach((f, i) => { Rigs.build(s, i); f.frontier = 25 + 5 * i; f.bestGrade = Math.floor(f.frontier / 10); });
  return s;
}
const give = (s, field, grade, n) => Fields.addMaterial(s, field, grade, n);

{ // tower
  const s = createCoreLoopState(1);
  const rows = UI.towerRows(s);
  eq(rows.map(r => r.id), [...FRACTIONS], 'five Fractions, Gas on top');
  ok(rows.every(r => r.value === 1 && r.level === 0 && r.key === r.id), 'a new game starts at x1');
  s.refinery.frac[1].level = 3;
  ok(Math.abs(UI.towerRows(s)[1].value - Math.pow(P.orderMult, 3)) < 1e-12, 'value follows the Order level');
}

{ // orders
  const s = running();
  Refinery.step(s, 1, PRESENCE.WATCH);
  const v = UI.orderView(s, 0);
  ok(v && !v.empty, 'slot 0 is posted');
  eq(v.can, false, 'cannot fill with nothing');
  ok(v.missing === v.qty && v.progress === 0, 'all of it missing');
  ok(v.after > v.before, 'value rises');
  eq(v.fieldId, P.fields[v.field]);
  give(s, v.field, v.grade, v.qty + 1);
  const w = UI.orderView(s, 0);
  eq(w.can, true, 'fillable once held'); eq(w.missing, 0); eq(w.progress, 1);
  ok(Refinery.fillOrder(s, 0), 'and the system fills it');
  const e = UI.orderView(s, 0);
  eq(e.empty, true, 'an empty slot shows a refill time'); ok(e.refillIn > 0 && e.refillIn <= P.orderRefill);
  eq(UI.orderView(s, 9), null, 'no such slot');
}

{ // weekly
  const s = running();
  const w0 = UI.weeklyView(s);
  eq([w0.open, w0.can, w0.rows.length], [false, false, 0], 'closed before it posts');
  ok(w0.secondsToNextWeek > 0);
  s.t = 8 * 86400;
  Refinery.step(s, 1, PRESENCE.WATCH);
  const w1 = UI.weeklyView(s);
  eq(w1.open, true); eq(w1.rows.length, P.fields.length);
  ok(w1.rows.every(r => r.missing > 0 && r.free === 0), 'every row short');
  for (const r of w1.rows) give(s, r.field, r.grade, r.qty + 1 + Refinery.weeklyInfo(s).need[r.field].reserved);
  ok(UI.weeklyView(s).can, 'fillable when every Field has its share');
  // what an open Order reserves is not free for the weekly Order
  const o = UI.orderView(s, 0);
  if (!o.empty) { const free = UI.weeklyView(s).rows[o.field].free; ok(free <= Fields.countAtLeast(s, o.field, UI.weeklyView(s).rows[o.field].grade), 'free never exceeds held'); }
}

{ // Dallahs and Bubbles
  const s = running();
  const idle = UI.cauldronView(s, 0, PRESENCE.WATCH);
  eq(idle.id, 'hand'); eq(idle.eta, Infinity, 'the Hand Dallah does not fill while Watching');
  eq(idle.can, false); eq(idle.fill, 0);
  const oil = UI.cauldronView(s, 1, PRESENCE.WATCH);
  ok(oil.eta > 0 && oil.eta < Infinity, 'Oil fills while Watching');
  s.cauldrons.vats[0].fill = 1e9;
  const full = UI.cauldronView(s, 0, PRESENCE.HANDS);
  eq([full.can, full.eta, full.fill], [true, 0, 1]);
  eq(full.upgrade, false);
  s.cauldrons.vats[0].bars = P.upgradeEvery - 1;
  eq(UI.cauldronView(s, 0, PRESENCE.HANDS).upgrade, true, 'says when the next bar is a speed upgrade');
  s.cauldrons.vats[0].bars = 0;
  eq(Cauldrons.brew(s, 0), 'bubble');
  const rows = UI.bubbleRows(s);
  eq(rows.reduce((n, r) => n + r.count, 0), 1); ok(rows[0].total > 0);
  const lv = UI.levelView(s);
  eq(lv.level, 1); eq(lv.can, false); ok(lv.missing > 0, 'short of Oasis Materials');
  give(s, FIELD.OASIS, 0, lv.cost + 1);
  eq(UI.levelView(s).can, true);
  eq(UI.levelView(createCoreLoopState(2)), null, 'no Bubbles, nothing to level');
}

{ // Vials
  const s = running();
  eq(UI.heldMaterials(s), [], 'nothing held');
  give(s, FIELD.TOWER, 0, 3); give(s, FIELD.MINE, 1, 2);
  s.collection.vialOffers = 0;
  let rows = UI.vialTryRows(s);
  eq(rows.map(r => r.key), ['0:0', '1:1'], 'held Materials with no Vial');
  ok(rows.every(r => !r.can && r.chance === P.vialChance), 'no offer, no try');
  s.collection.vialOffers = 2;
  rows = UI.vialTryRows(s);
  ok(rows.every(r => r.can), 'offers make it possible');
  eq(rows[0].sure, P.vialPity, 'tries to the sure one');
  s.collection.vials['0:0'] = { tier: 0, pity: P.vialPity - 1 };
  const r0 = UI.vialTryRows(s)[0];
  eq([r0.guaranteed, r0.sure, r0.pity], [true, 1, P.vialPity - 1], 'pity is shown');
  eq(UI.ownedVials(s), [], 'none unlocked');
  while (Collection.vialTier(s, '0:0') === 0) { s.collection.vialOffers = 1; Collection.offerVial(s, FIELD.TOWER, 0); give(s, FIELD.TOWER, 0, 1); }
  const own = UI.ownedVials(s);
  eq(own.length, 1); eq(own[0].tierId, 'clay'); eq(own[0].tier, 1);
  ok(own[0].cost > 0 && !own[0].can && own[0].missing > 0);
  eq(UI.vialTryRows(s).some(r => r.key === '0:0'), false, 'a Vial that is unlocked leaves the try list');
  s.collection.vials['0:0'].tier = P.vialTiers;
  eq(UI.ownedVials(s)[0].cost, null, 'top tier has no price');
}

{ // Mixer
  const s = running();
  const r0 = Collection.recipeAt(s, 0);
  give(s, r0.fa, r0.ga, 2); give(s, r0.fb, r0.gb, 2);
  eq(UI.mixResult(s, { field: r0.fa, grade: r0.ga }, { field: r0.fb, grade: r0.gb }), { kind: 'new', index: 0 });
  eq(UI.mixResult(s, { field: r0.fb, grade: r0.gb }, { field: r0.fa, grade: r0.ga }).index, 0, 'either order');
  eq(UI.mixResult(s, { field: 0, grade: 0 }, { field: 0, grade: 0 }).kind, 'none', 'a pair that makes nothing');
  const before = JSON.stringify(s.fields);
  UI.mixResult(s, { field: 0, grade: 0 }, { field: 0, grade: 0 });
  eq(JSON.stringify(s.fields), before, 'looking costs nothing');
  eq(UI.compoundRows(s), [], 'none found');
  ok(Collection.discover(s, 0));
  eq(UI.mixResult(s, { field: r0.fa, grade: r0.ga }, { field: r0.fb, grade: r0.gb }).kind, 'known');
  const c = UI.compoundRows(s);
  eq(c.length, 1); eq(c[0].tierId, 'compound'); eq(c[0].made, 1); eq(c[0].top, false);
  ok(c[0].cost.a > 0 && c[0].cost.b > 0);
  s.collection.recipes[0].tier = P.compoundTiers.length;
  eq(UI.compoundRows(s)[0].top, true); eq(UI.compoundRows(s)[0].tierId, 'royal');
}

{ // every action goes through the systems: an act() that returns false changes nothing
  const s = running(); const ctx = makeContext();
  const snap = JSON.stringify(s);
  ok(!Refinery.fillOrder(s, 0, ctx) && !Cauldrons.brew(s, 0, ctx) && !Collection.remake(s, 0, ctx) && !Collection.upgradeVial(s, '0:0', ctx));
  eq(JSON.stringify(s), snap, 'a refused action leaves the state as it was');
}

console.log(`test_cl_ui_refinery: ${checks} checks passed`);
