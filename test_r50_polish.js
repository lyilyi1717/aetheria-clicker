// R50: Frenzy end summary (Oil tracked in memory), Seal lit as a big ceremony, Dallah cue entry.
// Run: node test_r50_polish.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { ClickerSystem } from './js/systems/ClickerSystem.js';
import { CalendarSystem, SEALS } from './js/systems/CalendarSystem.js';
import { STATIC_CUES } from './js/ui/feedback.js';
import { CLICK_MAX_PER_SEC } from './js/systems/combo.js';
import { particles } from './js/engine/ParticleEngine.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;

const gs = new GameState();
gs.buildingSystem = { getTotalProduction: () => new BigNum(0), getTotalBuildingsCount: () => 0 };
gs.critChance = 0;
const c = new ClickerSystem(gs);
const events = [];
c.onComboFx = (ev) => events.push(ev);

// taps before Frenzy are not counted; taps during it are
c.handleClick(0, 0, false);
c.triggerFrenzy(1);
assert.ok(c.frenzyOil.lte(0));
c.update(0, 1 / CLICK_MAX_PER_SEC);
const paid = c.handleClick(0, 0, false);
assert.ok(c.frenzyOil.gte ? c.frenzyOil.gte(paid) : true);
c.update(2, 2);
assert.equal(gs.frenzyActive, false);
const end = events.find(e => e.type === 'frenzyEnd');
assert.ok(end, 'Frenzy end emits an event');
assert.ok(end.oil.gt(0), 'carries the Oil earned');
assert.ok(c.frenzyOil.lte(0), 'reset after the summary');
assert.ok(!JSON.stringify(gs.serialize()).includes('frenzyOil'), 'no save field');

// Seals light as a big forced ceremony
const cal = new CalendarSystem(gs);
const sent = [];
cal.notify = (ev) => sent.push(ev);
const seal = SEALS[0];
const orig = seal.value;
seal.value = () => seal.goal;
cal.updateSeals();
seal.value = orig;
const ev = sent.find(e => e.kind === 'seal-lit');
assert.ok(ev, 'seal notice sent');
assert.equal(ev.tier, 'big');
assert.equal(ev.force, true);

// Dallah cup keeps a static fill under reduced motion
assert.deepEqual(STATIC_CUES['is-pouring'], { cls: 'cue-cup-full', ms: 1000 });
console.log('test_r50_polish: OK');
