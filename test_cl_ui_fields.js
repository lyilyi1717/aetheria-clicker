// CL-14: the core-loop Fields screen (js/ui/coreloop/fields.js): strings have Arabic, and the pure
// helpers show the right numbers for a state. The DOM part is checked in a browser.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { P } from './js/systems/coreloop/params.js';
import { PRESENCE, FIELDS } from './js/systems/coreloop/shared.js';
import { createCoreLoopState } from './js/systems/coreloop/state.js';
import * as Fields from './js/systems/coreloop/Fields.js';
import * as Rigs from './js/systems/coreloop/Rigs.js';
import * as Mastery from './js/systems/coreloop/Mastery.js';
import * as Presence from './js/systems/coreloop/Presence.js';
import EN_F from './js/i18n/coreloop/fields.en.js';
import AR_F from './js/i18n/coreloop/fields.ar.js';
import EN from './js/i18n/en.js';
import AR from './js/i18n/ar.js';
import './js/ui/coreloop/shell.js';   // registers the shared vocabulary the screen uses
import { mount, describeField, rankLabel, fmtNum, whole, roman, materialName, gradeLabel, openFields, nextClosedField, sectionsView, crewStatus, readyCount, workButton, goldFor, wantedOrders, masteryReach, levelView, hauledPerSecond, rateParts, materialsOf } from './js/ui/coreloop/fields.js';

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };

// --- strings ---------------------------------------------------------------------------------
const ph = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
for (const k of Object.keys(EN_F)) {
  ok(EN[k] === EN_F[k], `${k} registered`);
  ok(typeof AR_F[k] === 'string' && AR_F[k].length > 0, `${k} has Arabic`);
  ok(AR[k] === AR_F[k], `${k} Arabic registered`);
  ok(ph(EN_F[k]) === ph(AR_F[k]), `${k} placeholders match`);
  ok(!/[A-Za-z]{2,}/.test(AR_F[k].replace(/\{\w+\}/g, '')), `${k} Arabic has no Latin words`);
}
for (const k of Object.keys(AR_F)) ok(k in EN_F, `${k} has English`);
// Shared names the screen uses exist
FIELDS.forEach(id => ['cl.field.', 'cl.rig.', 'cl.material.'].forEach(p => ok(`${p}${id}` in EN && `${p}${id}` in AR, `${p}${id}`)));

// --- helpers ---------------------------------------------------------------------------------
eq(fmtNum(0.5), '0.5'); eq(fmtNum(3), '3'); eq(fmtNum(0), '0'); eq(fmtNum(12.34), '12.3'); eq(fmtNum(250.6), '251');
eq(fmtNum(NaN), '0'); ok(/K|1,?234/.test(fmtNum(1234)), 'thousands abbreviated: ' + fmtNum(1234));
eq(gradeLabel(3), '4'); eq(gradeLabel(0), '1');

eq(rankLabel(0), 'Unranked'); eq(rankLabel(1), 'Novice'); eq(rankLabel(5), 'Ostoura');
eq(rankLabel(6), 'Ostoura 2'); eq(rankLabel(7), 'Ostoura 3');

const fresh = () => createCoreLoopState(7);
let s = fresh();
let d = describeField(s, 0, PRESENCE.WATCH);
eq(d.id, 'tower'); eq(d.rig, null, 'no Rig yet');
eq(d.level, 0); eq(d.grade, 0); eq(d.toNext, P.gradeSpan); eq(d.gradeFraction, 0);
eq(d.handsOn, false); eq(d.shelf, []);
ok(d.speedPerHour > 0 && d.speedPerHour <= P.vMax * 3600 + 1e-9, 'speed within vMax');
eq(d.actions.length, P.actionsPerField);
eq(d.actions[0].rank, 0); eq(d.actions[0].fraction, 0);

// A Field with a Rig, a frontier mid-grade, materials and some Mastery
s = fresh();
Rigs.build(s, 1); Rigs.levelUp(s, 1);
s.fields[1].frontier = 24.5;
Fields.addMaterial(s, 1, 2, 3); Fields.addMaterial(s, 1, 0, 1.5);
Mastery.addActionMastery(s, 1, 0, 2);   // 2 h: Adept (rank 2)
Presence.setHandField(s, 1);
Presence.noteInput(s);
d = describeField(s, 1, PRESENCE.HANDS);
eq(d.level, 24); eq(d.grade, 2);
ok(Math.abs(d.toNext - 5.5) < 1e-9, 'levels to next grade'); ok(Math.abs(d.gradeFraction - 0.45) < 1e-9, 'grade fraction');
eq(d.selected, true); eq(d.handsOn, true);
eq(d.shelf, [{ grade: 0, units: 1.5 }, { grade: 2, units: 3 }], 'shelf lists grades with units');
ok(d.rig && d.rig.level === 2, 'Rig level');
eq(d.rig.reachPct, Math.round(Rigs.rigReach(s, 1) * 100));
eq(d.rig.grade, Rigs.rigGrade(s, 1));
ok(d.rig.watchPerHour > d.rig.awayPerHour, 'Watching beats Away');
eq(d.rig.watchPerHour, Rigs.rigRate(s, 1, PRESENCE.WATCH) * 3600);
eq(d.rig.efficiencyPct, Math.round(Mastery.rigEfficiency(s, 1) * 100));
eq(d.actions[0].rank, 2); ok(d.actions[0].fraction > 0 && d.actions[0].fraction < 1);
eq(d.actions[0].to, Mastery.rankThreshold(2));
ok(d.school > 1, 'school power grows with ranks');
eq(d.power, Fields.fieldPower(s, 1, PRESENCE.HANDS));
// Other Field is not the hand Field
eq(describeField(s, 0, PRESENCE.HANDS).handsOn, false);
eq(describeField(s, 0, PRESENCE.HANDS).selected, false);
// Hands-on at full Heat pushes the frontier faster than Watching shows
s.presence.heatSeconds = P.heatRamp;
eq(describeField(s, 1, PRESENCE.HANDS).heatFraction, 1);
ok(describeField(s, 1, PRESENCE.HANDS).speedPerHour > 0);
// Past Legend the rank label counts up
Mastery.addActionMastery(s, 1, 1, 200);
ok(s.mastery[1].ranks[1] > 5, 'past Legend');
ok(/^Ostoura( \d+)?$/.test(rankLabel(s.mastery[1].ranks[1])), 'Ostoura N');

// --- CL-30: what shows, and the crew's status ------------------------------------------------
const none = () => false, all = () => true;
eq(openFields(none), [0], 'only the Tower on a fresh save');
eq(openFields(all), [0, 1, 2]);
eq(openFields(f => f === 'fields.mine'), [0, 1]);
eq(nextClosedField(none), { index: 1, feature: 'fields.mine' }, 'the Mine comes next');
eq(nextClosedField(f => f === 'fields.mine'), { index: 2, feature: 'fields.oasis' });
eq(nextClosedField(all), null);
eq(sectionsView(none), { mastery: false, rig: false, locked: 'fields.mastery' });
eq(sectionsView(f => f === 'fields.mastery'), { mastery: true, rig: false, locked: 'fields.rig' });
eq(sectionsView(all), { mastery: true, rig: true, locked: null });

eq(crewStatus(PRESENCE.HANDS), 'working'); eq(crewStatus(PRESENCE.WATCH), 'break'); eq(crewStatus(PRESENCE.AWAY), 'break');


// Level view: 1-based level, fraction through it, time to finish while working
s = fresh(); s.t = 5; Presence.noteInput(s);
s.fields[0].frontier = 3.25;
let lv = levelView(s, 0);
eq(lv.level, 4); ok(Math.abs(lv.fraction - 0.25) < 1e-9); eq(lv.moving, true);
ok(lv.secondsToNext > 0 && Math.abs(lv.secondsToNext - 0.75 / Fields.frontierSpeed(s, 0)) < 1e-6, 'seconds to next level');
eq(lv.grade, 0); ok(Math.abs(lv.toGrade - 6.75) < 1e-9);
s.t = 5 + P.handsWindow + 1;
lv = levelView(s, 0);
eq(lv.moving, false, 'resting: the level does not move'); eq(lv.secondsToNext, null);
eq(levelView(s, 1, PRESENCE.HANDS).moving, false, 'not the crew Field');

// Hauling: hands plus Rig while working, Rig alone while resting
s = fresh(); s.t = 5; Presence.noteInput(s);
let hz = hauledPerSecond(s, 0);
ok(hz.hands > 0 && hz.rig === 0 && hz.total === hz.hands, 'no Rig: hands only');
eq(hz.hands, Rigs.handRate(s) * Presence.heat(s));
eq(hauledPerSecond(s, 1).hands, 0, 'other Field gets no hand haul');
Rigs.build(s, 0);
hz = hauledPerSecond(s, 0, PRESENCE.WATCH);
eq(hz.hands, 0); ok(hz.rig > 0, 'a Rig hauls while resting'); eq(hz.total, hz.rig);

eq(rateParts(1.5), { unit: 's', n: 1.5 });
eq(rateParts(0.5).unit, 'm');
ok(Math.abs(rateParts(0.5).n - 30) < 1e-9); eq(rateParts(0.05).unit, 'm'); ok(Math.abs(rateParts(0.05).n - 3) < 1e-9);
eq(rateParts(0.005).unit, 'h'); eq(rateParts(0).unit, 'h'); eq(rateParts(NaN).n, 0);
s = fresh(); Fields.addMaterial(s, 0, 0, 2); Fields.addMaterial(s, 0, 3, 1.5);
eq(materialsOf(s, 0), 3.5); eq(materialsOf(s, 1), 0);

// --- CL-39: the verb, the Order that wants the place, one ladder -------------------------------
eq(whole(35.9), '35'); eq(whole(0), '0'); eq(whole(2.9999999999), '3');
eq(roman(2), 'II'); eq(roman(4), 'IV'); eq(roman(9), 'IX'); eq(roman(14), 'XIV'); eq(roman(40), '40');
eq(materialName(0, 0), 'Steel'); eq(materialName(1, 0), 'Ore'); eq(materialName(2, 2), 'Water III');
eq(materialName(0, 1), 'Steel II');

// The button: the crew starts at the Tower, so the Tower must still offer "send" until the player did
eq(workButton({ viewing: 0, crewField: 0, sent: false, working: true }), 'send', 'the first send is offered where the crew starts');
eq(workButton({ viewing: 1, crewField: 0, sent: true, working: true }), 'send', 'another place: send');
eq(workButton({ viewing: 0, crewField: 0, sent: true, working: true }), null, 'working here: no button');
eq(workButton({ viewing: 0, crewField: 0, sent: true, working: false }), 'back', 'on a break here: back to work');

// One solid gold thing
eq(goldFor({ goal: { here: true, anchor: 'fields.work', screen: 'fields' }, work: true, refinery: true }), { work: true, refinery: false });
eq(goldFor({ goal: { here: true, anchor: 'fields.mastery', screen: 'fields' }, work: true, refinery: true }), { work: false, refinery: false }, 'the goal is elsewhere on the screen: all outlined');
eq(goldFor({ goal: { here: false, anchor: 'refinery.order', screen: 'refinery' }, work: true, refinery: true }), { work: false, refinery: true }, 'the bar points at the Refinery');
eq(goldFor({ goal: { here: false, anchor: 'well.rate', screen: 'well' }, work: true, refinery: false }), { work: true, refinery: false }, 'best action of this screen');
eq(goldFor({ goal: { here: false, anchor: 'well.rate', screen: 'well' }, work: false, refinery: false }), { work: false, refinery: false });

// The tab dot: only for a crew on a break, on a tab that is open
s = fresh(); s.t = 500;
eq(readyCount(s), 0, 'tab closed: no dot');
s.guide.open['tab.fields'] = true;
eq(readyCount(s), 1, 'never touched for a while: on a break');
Presence.noteInput(s);
eq(readyCount(s), 0, 'a tap: working');
s.t += P.handsWindow + 1;
eq(readyCount(s), 1);

// Orders that want a Field
s = fresh(); s.t = 10;
Object.assign(s.refinery.orders[0], { empty: false, frac: 1, field: 1, grade: 0, qty: 45, posted: 0 });
Object.assign(s.refinery.orders[1], { empty: false, frac: 0, field: 0, grade: 1, qty: 20, posted: 0 });
eq(wantedOrders(s, 2), [], 'no Order wants the Oasis');
eq(wantedOrders(s, 1).length, 1); eq(wantedOrders(s, 1)[0].qty, 45); eq(wantedOrders(s, 1)[0].ready, false);
Fields.addMaterial(s, 1, 0, 50);
eq(wantedOrders(s, 1)[0].ready, true, 'enough of the Material');
eq(wantedOrders(s, 0)[0].grade, 1);

// Mastery stays one line until a rank is near
eq(masteryReach({ actions: [{ rank: 0, fraction: 0.1 }, { rank: 0, fraction: 0.4 }] }), false);
eq(masteryReach({ actions: [{ rank: 0, fraction: 0.1 }, { rank: 0, fraction: 0.5 }] }), true);
eq(masteryReach({ actions: [{ rank: 1, fraction: 0 }] }), true);

// The English text never says a countdown or a rest
for (const [k, v] of Object.entries(EN_F)) ok(!/rest|d+ s left|Keep them going|Aether|Bosses/i.test(v), `${k} has no old wording`);

// Module shape (the DOM is built only in mount)
eq(typeof mount, 'function');
ok(!/document\./.test(readFileSync('js/ui/coreloop/fields.js', 'utf8').split('export function mount')[0].replace(/\/\/.*$/gm, '')), 'no DOM at import');
console.log(`test_cl_ui_fields: ${checks} checks passed`);
