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
import { mount, describeField, rankLabel, fmtNum, gradeLabel, openFields, nextClosedField, sectionsView, crewStatus, secondsLeft, levelView, hauledPerSecond, rateParts, materialsOf } from './js/ui/coreloop/fields.js';

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
// Every Field has all its action names
FIELDS.forEach(id => { for (let a = 0; a < P.actionsPerField; a++) ok(`cl.fields.action.${id}.${a}` in EN_F, `action name ${id}.${a}`); ok(`cl.fields.school.${id}` in EN_F, `school ${id}`); });
// Shared names the screen uses exist
FIELDS.forEach(id => ['cl.field.', 'cl.rig.'].forEach(p => ok(`${p}${id}` in EN && `${p}${id}` in AR, `${p}${id}`)));

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

eq(crewStatus(PRESENCE.HANDS), 'working'); eq(crewStatus(PRESENCE.WATCH), 'resting'); eq(crewStatus(PRESENCE.AWAY), 'resting');

s = fresh(); s.t = 100;
eq(secondsLeft(s), 0, 'never tapped: resting');
Presence.noteInput(s);
eq(secondsLeft(s), P.handsWindow, 'a tap tops the window up');
s.t = 100 + 10;
eq(secondsLeft(s), P.handsWindow - 10);
s.t = 100 + P.handsWindow + 1;
eq(secondsLeft(s), 0, 'window over: resting');
eq(secondsLeft(s, PRESENCE.AWAY), 0, 'hidden page: resting');

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

eq(rateParts(0.5), { unit: 's', n: 0.5 });
eq(rateParts(0.05).unit, 'm'); ok(Math.abs(rateParts(0.05).n - 3) < 1e-9);
eq(rateParts(0.0005).unit, 'h'); eq(rateParts(0).unit, 'h'); eq(rateParts(NaN).n, 0);
s = fresh(); Fields.addMaterial(s, 0, 0, 2); Fields.addMaterial(s, 0, 3, 1.5);
eq(materialsOf(s, 0), 3.5); eq(materialsOf(s, 1), 0);

// Module shape (the DOM is built only in mount)
eq(typeof mount, 'function');
ok(!/document\./.test(readFileSync('js/ui/coreloop/fields.js', 'utf8').split('export function mount')[0].replace(/\/\/.*$/gm, '')), 'no DOM at import');
console.log(`test_cl_ui_fields: ${checks} checks passed`);
