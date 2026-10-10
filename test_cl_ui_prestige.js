// CL-16: the core-loop Prestige and Codex screens (js/ui/coreloop/prestige.js, codex.js). No DOM:
// the strings (every key has Arabic) and the pure helpers each card is built from.
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { P } from './js/systems/coreloop/params.js';
import { createCoreLoopState } from './js/systems/coreloop/state.js';
import * as Prestige from './js/systems/coreloop/Prestige.js';
import * as Rigs from './js/systems/coreloop/Rigs.js';
import * as Seals from './js/systems/coreloop/Seals.js';
import * as Collection from './js/systems/coreloop/Collection.js';
import * as View from './js/ui/coreloop/prestige.js';
import * as Codex from './js/ui/coreloop/codex.js';
import PEN from './js/i18n/coreloop/prestige.en.js';
import PAR from './js/i18n/coreloop/prestige.ar.js';
import CEN from './js/i18n/coreloop/codex.en.js';
import CAR from './js/i18n/coreloop/codex.ar.js';
import EN from './js/i18n/en.js';
import AR from './js/i18n/ar.js';
import { t } from './js/i18n/index.js';
import { registerStrings } from './js/i18n/coreloop/index.js';
import SEN from './js/i18n/coreloop/shell.en.js';
import SAR from './js/i18n/coreloop/shell.ar.js';
try { registerStrings(SEN, SAR); } catch { /* the shell registered them */ }

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const DAY = 86400;
const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');

console.log('--- strings: every key registered, Arabic with the same placeholders ---');
for (const [en, ar, prefix] of [[PEN, PAR, 'cl.prestige.'], [CEN, CAR, 'cl.codex.']]) {
  eq(Object.keys(en).sort(), Object.keys(ar).sort(), `${prefix} keys match in both languages`);
  for (const k of Object.keys(en)) {
    ok(k.startsWith(prefix), `${k} is under ${prefix}`);
    ok(EN[k] === en[k] && AR[k] === ar[k], `${k} is registered`);
    eq(placeholders(ar[k]), placeholders(en[k]), `${k} keeps its placeholders`);
    ok(!/[A-Za-z]{2,}/.test(ar[k].replace(/\{\w+\}/g, '')), `${k} has no Latin words in Arabic`);
  }
}
// Names a card uses exist in the shared vocabulary
for (const k of ['crew', 'crew.gloss']) ok(EN[`cl.name.${k}`] && AR[`cl.name.${k}`], k);
for (const id of P.fields) for (const k of [`cl.field.${id}`, `cl.rig.${id}`, `cl.rig.${id}.gloss`]) ok(EN[k] && AR[k], k);
for (const c of Prestige.CHARTERS) for (const k of [`cl.charter.${c}`, `cl.charter.${c}.gloss`]) ok(EN[k] && AR[k], k);
for (const [id] of P.trials) for (const k of [`cl.prestige.trial.${id}`, `cl.prestige.trial.${id}.gloss`]) ok(EN[k] && AR[k], k);
for (const id of Seals.SEAL_TIERS) ok(EN[`cl.prestige.tier.${id}`], id);
for (const id of Collection.VIAL_TIERS) ok(EN[`cl.codex.vial.${id}`], id);
for (const id of ['unknown', ...Collection.COMPOUND_TIERS]) ok(EN[`cl.codex.compound.${id}`], id);

const rigged = () => {
  const s = createCoreLoopState(5);
  s.fields.forEach((_, i) => Rigs.build(s, i));
  return s;
};
const withRun = (s, log) => { s.well.runCrude = new BigNum(1, log); s.well.bestRunChron = new BigNum(1, log); s.t = P.wellMinRunSec + 10; return s; };

console.log('--- New Well card ---');
{
  const s = createCoreLoopState(1);
  let v = View.wellView(s);
  ok(!v.can && v.pending === 0 && v.need === P.wellMinReserves && v.missing === P.wellMinReserves, 'a fresh Well: nothing to claim');
  ok(v.fraction === 0, 'bar empty');
  ok(View.wellButton(s).text.includes(String(P.wellMinReserves)), 'the button names the Reserves missing');
  withRun(s, 30);
  v = View.wellView(s);
  ok(v.can && v.pending >= v.need && v.missing === 0 && v.fraction === 1, 'a long, big run can');
  eq(View.wellButton(s), { can: true, text: t('cl.prestige.well.btn', { n: v.pending }) }, 'button shows the payout');
  s.t = 10;                                       // big run, but too young
  v = View.wellView(s);
  ok(!v.can && v.wait > 0 && v.missing === 0, 'only the wait is left');
  ok(View.wellButton(s).text === t('cl.prestige.well.btn_wait', { time: View.longTime(v.wait) }), 'button shows the wait');
  s.prestige.reserves = 20;
  eq(View.wellView(s).mult, 1 + P.resPer * 20, 'Crude multiplier from Reserves');
}

console.log('--- New Field card and its choices ---');
{
  const s = createCoreLoopState(2);
  let v = View.fieldView(s);
  eq([v.need, v.have, v.can], [P.fieldLog0, 0, false], 'the first gate');
  s.well.bestRunChron = new BigNum(1, 25);
  v = View.fieldView(s);
  ok(Math.abs(v.fraction - 25 / 50) < 1e-9 && !v.can, 'progress is a log10 ratio');
  ok(View.fieldButton(s, false).text === t('cl.prestige.field.btn_need', { need: 50, have: '25' }), 'locked label says what is missing');
  s.well.bestRunChron = new BigNum(1, 50);
  ok(View.fieldView(s).can, 'gate reached');
  eq(View.fieldButton(s, false), { can: true, text: t('cl.prestige.field.btn', { n: P.sharesPerField }) }, 'ready label');
  eq(View.fieldButton(s, true), { can: true, text: t('cl.prestige.field.confirm') }, 'armed label asks again');

  // choices: first New Field builds a Rig only
  const first = Prestige.fieldChoices(s);
  ok(first.every(c => c.kind === 'rig'), 'only Rigs at the start');
  eq(View.effectiveChoice(s, null), View.choiceId(Prestige.suggestedChoice(s)), 'suggestion pre-selected');
  eq(View.effectiveChoice(s, 'rig:2'), 'rig:2', 'a valid pick stays');
  eq(View.effectiveChoice(s, 'crew'), View.choiceId(Prestige.suggestedChoice(s)), 'a pick no longer offered falls back');
  eq(View.parseChoice('rig:1'), { kind: 'rig', field: 1 }, 'parse rig');
  eq(View.parseChoice('level:2'), { kind: 'level', field: 2 }, 'parse level');
  eq(View.parseChoice('crew'), { kind: 'crew' }, 'parse crew');
  eq(View.parseChoice('nope'), null, 'parse garbage');
  for (const c of first) eq(View.parseChoice(View.choiceId(c)), c, 'ids round-trip');

  const r = rigged();
  r.well.bestRunChron = new BigNum(1, 50);
  const kinds = Prestige.fieldChoices(r).map(c => c.kind);
  ok(kinds.includes('crew') && kinds.includes('level') && !kinds.includes('rig'), 'then crew and levels');
  const cards = Prestige.fieldChoices(r).map(c => View.choiceCard(r, c));
  ok(cards.every(c => c.title && c.desc && c.id), 'every card has a title and a description');
  ok(cards.find(c => c.kind === 'crew').desc.includes(`${Prestige.crewSlots(r)}`), 'the crew card shows slots');
  // acting with the picked choice works through the system
  const pick = View.parseChoice(View.effectiveChoice(r, null));
  ok(Prestige.newField(r, pick, 'baron'), 'newField with the suggested pick');
  eq(r.prestige.charter, 'baron', 'Charter set');
}

console.log('--- Chronicle card ---');
{
  const s = rigged();
  let v = View.chronicleView(s);
  ok(!v.can && v.fieldsLeft === P.chronFirstFields && !v.hasRecord && v.recordOk, 'first Chronicle: fields only, no record gate');
  ok(View.chronicleButton(s, false).text === t('cl.prestige.chron.btn_fields', { n: P.chronFirstFields }), 'label names the fields missing');
  s.prestige.newFields = P.chronFirstFields;
  v = View.chronicleView(s);
  ok(v.can && v.pages === Prestige.pendingPages(s) && v.pages > 0, 'ready and paying');
  eq(v.shares, Prestige.reblazeShares(v.pages), 're-blaze Shares from the Pages after it');
  ok(!v.suggest, 'not yet suggested below full Pages');
  s.prestige.newFields = P.chronFullFields;
  ok(View.chronicleView(s).suggest, 'suggested at full Pages');
  eq(View.chronicleButton(s, true).text, t('cl.prestige.chron.confirm'), 'armed label');
  // second Chronicle: the record gate shows
  s.prestige.chronicles = 1; s.prestige.newFields = P.chronFields;
  s.well.recordAtChron = new BigNum(1, 60); s.well.bestRunChron = new BigNum(1, 10);
  v = View.chronicleView(s);
  ok(v.hasRecord && v.recordLog === 60 + Math.log10(P.chronRecord) && !v.recordOk && !v.can, 'record gate shown and unmet');
  ok(View.chronicleButton(s, false).text === t('cl.prestige.chron.btn_record', { need: v.recordLog, have: '10' }), 'label names the record');
}

console.log('--- Trials ---');
{
  const s = createCoreLoopState(3);
  for (const [id] of P.trials) eq(View.trialView(s, id).status, 'locked', `${id} locked at the start`);
  const [wid, , wn] = P.trials.find(([, k]) => k === 'well');
  ok(View.trialText(s, wid).includes(String(wn)), 'locked text names the count it opens at');
  s.prestige.trials[wid].unlockedAt = 0; s.t = 100;
  let v = View.trialView(s, wid);
  ok(v.status === 'waiting' && v.wait === P.trialDelay - 100 && !v.can, 'waiting until trialReadyAt');
  s.t = P.trialDelay;
  v = View.trialView(s, wid);
  ok(v.status === 'ready' && v.can, 'ready, and winnable');
  ok(Prestige.winTrial(s, wid), 'won');
  v = View.trialView(s, wid);
  ok(v.status === 'won' && !v.can, 'won shows won');
}

console.log('--- Seals and Crew ---');
{
  const s = createCoreLoopState(4);
  let v = View.sealView(s, 0);
  ok(v.open && v.tierId === 'open' && v.nextIn === null, 'Seal 1 is open but has no crew');
  ok(View.sealNote(s, 0) === t('cl.prestige.seal.nocrew'), 'needs crew note');
  v = View.sealView(s, 3);
  ok(!v.open && v.tierId === 'closed' && v.opensIn === 3 * P.sealEveryDays * DAY, 'a later Seal is closed and says when');
  ok(View.sealNote(s, 3).includes('d'), 'opens-in note');
  s.prestige.crew = 2;
  eq(View.crewView(s), { crew: 2, slots: 1, rate: Seals.crewRate(s), free: false }, 'crew view');
  v = View.sealView(s, 0);
  ok(v.nextIn !== null && Math.abs(v.nextIn - Seals.hoursToNextTier(s, 0) * 3600) < 1e-6, 'time to the next tier from hoursToNextTier');
  s.t = 40 * DAY; s.seals.hours[0] = P.sealHours[0] / 2;
  Seals.step(s, 3600, 'watch');
  v = View.sealView(s, 0);
  ok(v.fraction > 0.4 && v.fraction < 1, 'bar between thresholds');
  s.seals.tier[0] = 5; s.seals.hours[0] = P.sealHours[4];
  v = View.sealView(s, 0);
  ok(v.maxed && v.tierId === 'eternal' && v.fraction === 1, 'a maxed Seal');
  ok(View.sealNote(s, 0) === t('cl.prestige.seal.maxed'), 'maxed note');
  eq(View.longTime(90000), t('cl.prestige.time_dh', { d: 1, h: 1 }), 'a day and an hour');
  eq(View.longTime(3660), t('cl.prestige.time_hm', { h: 1, m: 1 }), 'an hour and a minute');
  eq(View.showLog(-Infinity), '0', 'no run shows 0');
  eq(View.showLog(47.38), '47.3', 'one decimal, rounded down');
}

console.log('--- Codex ---');
{
  const s = createCoreLoopState(6);
  s.fields[0].bestGrade = 3;
  s.collection.vials['0:1'] = { tier: 2, pity: 0 };
  s.collection.vials['0:3'] = { tier: 5, pity: 0 };
  eq(Codex.vialCells(s, 0).map(c => c.tier), [0, 2, 0, 5], 'one cell per reached grade');
  eq(Codex.vialSummary(s)[0], { field: 0, found: 2, total: 4 }, 'summary');
  eq(Codex.vialSummary(s)[1], { field: 1, found: 0, total: 1 }, 'a Field at grade 0 has one cell');
  ok(Codex.vialTierName(0) === t('cl.codex.vial.none') && Codex.vialTierName(5) === t('cl.codex.vial.aether'), 'tier names');

  s.collection.recipes = [{ found: true, made: 1, tier: 0 }, { found: true, made: 5, tier: 2 }, { found: true, made: 25, tier: 3 }, { found: false, made: 0, tier: 0 }];
  const cs = Codex.compoundSummary(s);
  eq([cs.found, cs.total, cs.by], [3, P.recipes, { compound: 1, gilded: 1, royal: 1 }], 'compound counts by tier');
  eq(Codex.compoundCells(s).slice(0, 4).map(c => c.tier), [1, 2, 3, 0], 'compound cells');

  s.cauldrons.bubbles = Array.from({ length: 9 }, (_, i) => ({ frac: i % 5, level: 1 }));
  const b = Codex.bubbleSummary(s);
  eq([b.total, b.families, b.perFrac], [9, 2, [2, 2, 2, 2, 1]], 'bubbles and families');

  s.mastery[1].ranks = [0, 3, 5, 7];
  const m = Codex.masteryRows(s)[1];
  eq([m.sum, m.actions.map(a => a.label)], [15, [t('cl.rank.unranked'), t('cl.rank.master'), t('cl.rank.legend'), t('cl.rank.legend_n', { n: 3 })]], 'ranks, Legend numbered');
  ok(m.actions[2].title, 'Legend is a title rank');

  const g = Codex.generatorSummary(s);
  eq([g.n, g.max, g.nextLog], [P.slots, P.generators, P.genLog0], 'generators and the next goal');
  s.well.generators = P.generators;
  eq(Codex.generatorSummary(s).nextLog, null, 'all out');

  s.seals.tier[0] = 3; s.seals.tier[5] = 2;
  eq(Codex.sealTierSummary(s), { n: 5, max: P.seals * P.sealHours.length, fraction: 5 / (P.seals * P.sealHours.length) }, 'Seal tiers reached');
}

console.log('--- the modules mount nothing at import ---');
ok(typeof View.mount === 'function' && typeof Codex.mount === 'function', 'both export mount');

console.log(`cl16 ui: ${checks} checks passed`);
