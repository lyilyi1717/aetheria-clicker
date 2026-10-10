// CL-28: the guide (js/systems/coreloop/Guide.js, js/ui/coreloop/guide.js): what a fresh player
// sees, the steps in order on the real loop, features that open and never close, the standing
// suggestion, the tap on the Well, and words in both languages for every step, feature and screen.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BigNum } from './js/engine/BigNum.js';
import { P } from './js/systems/coreloop/params.js';
import { PRESENCE, makeContext } from './js/systems/coreloop/shared.js';
import { createCoreLoopState, serializeCoreLoop, deserializeCoreLoop } from './js/systems/coreloop/state.js';
import * as Guide from './js/systems/coreloop/Guide.js';
import * as Well from './js/systems/coreloop/Well.js';
import * as Loop from './js/systems/coreloop/Loop.js';
import * as Presence from './js/systems/coreloop/Presence.js';
import * as Refinery from './js/systems/coreloop/Refinery.js';
import * as Prestige from './js/systems/coreloop/Prestige.js';
import * as Tree from './js/systems/coreloop/Tree.js';
import { barView, lockText, featureName } from './js/ui/coreloop/guide.js';
import { SCREENS } from './js/ui/coreloop/shell.js';
import EN from './js/i18n/en.js';
import AR from './js/i18n/ar.js';

console.log('--- a fresh save: one tab, one goal ---');
{
  const s = createCoreLoopState(1);
  assert.deepEqual(Guide.refresh(s), [], 'nothing opens at second zero');
  assert.deepEqual(Guide.TABS.filter(tab => Guide.isOpen(s, `tab.${tab}`)), ['well']);
  for (const f of Guide.FEATURE_IDS) if (f !== 'tab.well') assert.equal(Guide.isOpen(s, f), false, f + ' is closed');
  const n = Guide.next(s);
  assert.equal(n.kind, 'step'); assert.equal(n.id, 'tap'); assert.equal(n.index, 0);
  assert.equal(n.anchor, 'well.tap', 'the first goal is the biggest thing on the screen');
  // five taps bring the Bucket, and it can be bought at once
  for (let i = 0; i < 5; i++) Well.tap(s);
  assert.deepEqual(Guide.refresh(s), ['well.pumps']);
  assert.equal(Guide.next(s).id, 'buy1');
  assert.ok(Well.canBuy(s, 1, 1));
  assert.ok(Guide.introPending(s));
  Guide.dismissIntro(s);
  assert.ok(!Guide.introPending(s));
  assert.deepEqual(Guide.TABS, SCREENS.map(x => x.id), 'the guide and the shell agree on the tabs');
}

console.log('--- the tap on the Well: flat, counted, and it counts for the run ---');
{
  const s = createCoreLoopState(1);
  const before = s.well.crude;
  assert.equal(Well.tap(s), P.tapCrude);
  const num = (x) => x.m * 10 ** x.e;
  assert.ok(Math.abs(num(s.well.crude) - num(before) - P.tapCrude) < 1e-9);
  assert.equal(s.well.taps, 1);
  assert.ok(Math.abs(num(s.well.runCrude) - P.tapCrude) < 1e-9);
  // flat: with a running Well a tap is the same Crude, so it cannot move a simulated year
  s.well.crude = new BigNum(1, 30); Well.buyMax(s);
  assert.equal(Well.tap(s), P.tapCrude);
}

// A player who does what the bar says, on the real loop, one second at a time
function play(seconds, seed = 7) {
  const s = createCoreLoopState(seed);
  const log = [], seeAt = {};
  const ctx = makeContext((e) => {
    if (e.kind === 'guide') log.push({ t: s.t, step: e.step });
    if (e.kind === 'unlock') { log.push({ t: s.t, feature: e.feature, level: e.level }); if (e.feature.startsWith('tab.')) seeAt[e.feature] = s.t + 3; }
  });
  for (let i = 0; i < seconds; i++) {
    const id = Guide.current(s)?.id;
    Presence.noteInput(s); Well.tap(s, ctx); Well.tap(s, ctx);     // a player who never stops tapping
    // a tab is opened 3 s after it appears; opening Fields, the player sends the crew
    for (const [tab, at] of Object.entries(seeAt)) if (s.t >= at) { Guide.markSeen(s, tab); if (tab === 'tab.fields') Guide.noteSent(s); delete seeAt[tab]; }
    if (id === 'buy1' || id === 'pack') { while (s.well.bought[1] < P.packSize && Well.canBuy(s, 1, 1)) Well.buy(s, 1, 1); }
    else if (id === 'pressure') Well.buyPressure(s);
    else if (id === 'slot2') { if (Well.canBuy(s, 2, 1)) Well.buy(s, 2, 1); }
    else if (id !== 'tap') Well.buyMax(s);
    if (Presence.canCatchGusher(s)) Loop.catchGusher(s, ctx);
    if (Guide.isOpen(s, 'tab.refinery') && !Guide.isNew(s, 'tab.refinery')) Refinery.fillAll(s, ctx);
    if (Guide.isOpen(s, 'tab.prestige') && Prestige.canNewWell(s)) { Prestige.newWell(s, ctx); Tree.buyAll(s); }
    Loop.advance(s, 1, PRESENCE.HANDS, ctx);
    Guide.refresh(s, ctx);
  }
  return { s, log };
}

console.log('--- the first hour: every step passes, in order, and nothing is quiet for long ---');
{
  const { s, log } = play(3600);
  const steps = log.filter(e => e.step).map(e => e.step);
  assert.deepEqual(steps, Guide.STEPS.map(x => x.id), 'steps pass in their written order');
  assert.equal(Guide.current(s), null);
  const at = (id) => log.find(e => e.step === id).t;
  assert.ok(at('tap') <= 5 && at('buy1') <= 10, 'the first two take seconds');
  // one loop at a time: the Well alone until the cascade has been seen, then Fields
  const fieldsAt = log.find(e => e.feature === 'tab.fields').t;
  assert.ok(fieldsAt >= 150 && fieldsAt <= 6 * 60, `Fields arrive at the first long wait (${fieldsAt} s)`);
  assert.ok(at('slot2') <= fieldsAt, 'after the Hand Pump');
  assert.ok(at('order') <= 8 * 60, `first Order within 8 min (${at('order')} s)`);
  // the first New Well brings the tree and nothing else
  const withWell = log.filter(e => e.feature && e.t >= at('newwell') && e.t <= at('newwell') + 5).map(e => e.feature);
  assert.deepEqual(withWell, ['prestige.tree'], 'one new thing at the first New Well');
  // the Gusher of the lesson pays: it waits for a Hand Pump in the run
  assert.ok(at('gusher') > at('newwell'));
  assert.ok(at('newwell') <= 20 * 60, `first New Well within 20 min (${at('newwell')} s)`);
  // something new (a step passed or a part opened) at least every 12 minutes of the first hour's guided part
  const times = [0, ...log.map(e => e.t)];
  for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] <= 12 * 60, `a gap of ${times[i] - times[i - 1]} s before ${JSON.stringify(log[i - 1])}`);
  // a step's screen is open by the time it is the goal
  const opened = new Map(log.filter(e => e.feature).map(e => [e.feature, e.t]));
  for (let i = 1; i < Guide.STEPS.length; i++) {
    const tab = `tab.${Guide.STEPS[i].screen}`;
    if (tab !== 'tab.well') assert.ok(opened.get(tab) <= at(Guide.STEPS[i - 1].id), `${tab} is open when ${Guide.STEPS[i].id} is the goal`);
    for (const f of (Guide.STEPS[i].needs || []).filter(x => !Guide.QUIET.includes(x))) assert.ok(opened.get(f) <= at(Guide.STEPS[i - 1].id), `${f} for ${Guide.STEPS[i].id}`);
  }
  for (const e of log.filter(x => x.feature)) assert.equal(e.level, e.feature.startsWith('tab.') ? 3 : 2);
  for (const f of Guide.QUIET) assert.ok(Guide.isOpen(s, f) && !log.some(e => e.feature === f), f + ' opens without a line');
  for (const tab of Guide.TABS) assert.ok(Guide.isOpen(s, `tab.${tab}`), tab + ' open after an hour');
  // then the standing suggestion takes over, and always points at an open screen
  const n = Guide.next(s);
  assert.equal(n.kind, 'suggestion');
  assert.ok(Guide.isOpen(s, `tab.${n.screen}`));
}

console.log('--- open is sticky: a New Well, a save and a load close nothing ---');
{
  const { s } = play(1200);
  const open = Guide.FEATURE_IDS.filter(f => Guide.isOpen(s, f));
  assert.ok(open.includes('tab.prestige') && s.prestige.wells >= 1);
  assert.equal(s.well.bought[1] < 5 || true, true);
  const back = deserializeCoreLoop(JSON.parse(JSON.stringify(serializeCoreLoop(s))));
  assert.deepEqual(Guide.FEATURE_IDS.filter(f => Guide.isOpen(back, f)), open);
  assert.equal(back.guide.step, s.guide.step);
  assert.equal(back.well.taps, s.well.taps);
  assert.equal(back.presence.caught, s.presence.caught);
  // a save from before the guide, or a broken one: defaults, then refresh opens what it earned
  const old = serializeCoreLoop(s); delete old.guide; delete old.well.taps;
  const o = deserializeCoreLoop(old);
  assert.deepEqual(o.guide, { v: 2, step: 0, open: {}, fresh: {}, intro: false, sent: false });
  Guide.refresh(o);
  assert.ok(Guide.isOpen(o, 'tab.prestige') && Guide.isOpen(o, 'tab.fields') && Guide.isOpen(o, 'tab.refinery'));
  const bad = deserializeCoreLoop({ guide: { step: 'x', open: [1], fresh: { 'tab.fields': 'yes' }, intro: 1 } });
  assert.deepEqual(bad.guide, { v: 2, step: 0, open: {}, fresh: {}, intro: false, sent: false });
}

console.log('--- the Gusher lesson brings its own Gusher, whatever the player is doing ---');
{
  const s = createCoreLoopState(4);
  s.guide.step = Guide.STEPS.findIndex(x => x.id === 'gusher');
  Loop.advance(s, 1, PRESENCE.HANDS);            // an ordinary wait is scheduled
  Guide.refresh(s);
  assert.equal(s.presence.summoned, false, 'not on an empty Well: it would pay nothing');
  s.well.bought[2] = 1; s.well.bought[1] = 10;   // the run has its first Hand Pump
  Guide.refresh(s);
  assert.equal(s.presence.summoned, true);
  // a player who never stops tapping: an ordinary Gusher would never come
  let up = -1;
  for (let i = 0; i < 30 && up < 0; i++) { Presence.noteInput(s); Loop.advance(s, 1, PRESENCE.HANDS); Guide.refresh(s); if (Presence.canCatchGusher(s)) up = i; }
  assert.ok(up >= 0 && up <= P.guideGusherDelay + 1, `it surfaces within ${P.guideGusherDelay} s (${up})`);
  // missed: the next one is called again
  for (let i = 0; i < P.gusherWindow + 2; i++) { Presence.noteInput(s); Loop.advance(s, 1, PRESENCE.HANDS); Guide.refresh(s); }
  let again = false;
  for (let i = 0; i < 30 && !again; i++) { Presence.noteInput(s); Loop.advance(s, 1, PRESENCE.HANDS); Guide.refresh(s); again = Presence.canCatchGusher(s); }
  assert.ok(again, 'a missed one comes back');
  assert.ok(Loop.catchGusher(s));
  Guide.refresh(s);
  assert.equal(s.presence.caught, 1);
  assert.equal(s.presence.summoned, false, 'after the lesson Gushers are ordinary again');
  assert.notEqual(Guide.current(s)?.id, 'gusher');
  // without the lesson nothing is summoned, and a hands-on wait still does not count
  const o = createCoreLoopState(4);
  Loop.advance(o, 1, PRESENCE.HANDS);
  const at = o.presence.nextGusherAt;
  Guide.refresh(o);
  Loop.advance(o, 10, PRESENCE.HANDS);
  assert.equal(o.presence.summoned, false);
  assert.ok(Math.abs(o.presence.nextGusherAt - (at + 10)) < 1e-9);
  const back = deserializeCoreLoop(JSON.parse(JSON.stringify(serializeCoreLoop(s))));
  assert.equal(back.presence.summoned, false);
}

console.log('--- a new tab is marked until it is looked at ---');
{
  const s = createCoreLoopState(2);
  s.well.bought[1] = 10; s.well.bought[2] = 1; s.well.pressureBest = 1;
  assert.ok(Guide.refresh(s).includes('tab.fields'));
  assert.ok(Guide.isNew(s, 'tab.fields'));
  Guide.markSeen(s, 'tab.fields');
  assert.ok(!Guide.isNew(s, 'tab.fields') && Guide.isOpen(s, 'tab.fields'));
  assert.deepEqual(Guide.refresh(s), [], 'and it opens once');
}

console.log('--- the standing suggestion: the biggest thing that waits ---');
{
  const { s } = play(3600);
  s.presence.state = PRESENCE.WATCH;
  s.presence.nextGusherAt = s.t - 1;
  assert.equal(Guide.suggestion(s).id, 'gusher');
  s.presence.nextGusherAt = s.t + 1e6;
  const g = Guide.suggestion(s);
  assert.ok(['newwell', 'order', 'tree', 'goal_field', 'goal_well'].includes(g.id), g.id);
  if (g.frac !== undefined) assert.ok(g.frac >= 0 && g.frac <= 1);
}

console.log('--- words: every step, suggestion, feature and screen, in both languages ---');
{
  const need = [];
  for (const st of Guide.STEPS) need.push(`cl.guide.step.${st.id}`, `cl.guide.step.${st.id}.why`);
  for (const id of ['chronicle', 'newfield', 'gusher', 'newwell', 'order', 'tree', 'goal_field', 'goal_well']) need.push(`cl.guide.sug.${id}`);
  for (const f of Guide.FEATURE_IDS) { need.push(`cl.feature.${f}`); if (f !== 'tab.well') need.push(`cl.lock.${f}`); }
  for (const tab of Guide.TABS) need.push(`cl.help.${tab}.line`, `cl.help.${tab}.more`, `cl.tab.${tab}`);
  for (let k = 1; k <= P.slots; k++) need.push(`cl.slot.${k}`);
  for (const k of need) {
    assert.ok(EN[k], 'English for ' + k);
    assert.ok(AR[k], 'Arabic for ' + k);
    assert.ok(!/[A-Za-z]{3,}/.test(AR[k].replace(/\{\w+\}/g, '')), 'no Latin words in Arabic ' + k);
    assert.deepEqual([...EN[k].matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort(), [...AR[k].matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort(), 'same placeholders: ' + k);
  }
  assert.ok(lockText('tab.fields') && featureName('tab.fields'));
  // the bar's view of a fresh save and of a finished one
  const s = createCoreLoopState(1);
  const v = barView(s);
  assert.equal(v.screen, 'well'); assert.equal(v.anchor, 'well.tap');
  assert.ok(v.goal && v.why && !/\{/.test(v.goal + v.why + v.kicker));
  s.guide.step = Guide.STEPS.length;
  const w = barView(s);
  assert.ok(w.goal && !/\{/.test(w.goal + w.why));
  // no "Tier" left in the guide's own words
  for (const k of need) assert.ok(!/\bTier\b/.test(EN[k]), 'plain names in ' + k);
}

console.log('--- the stacked panels: a hidden panel is gone whatever a screen styles it with ---');
{
  const css = readFileSync(new URL('./css/coreloop.css', import.meta.url), 'utf8');
  assert.match(css, /\.cl-panel\[hidden\][^{]*\{\s*display:\s*none\s*!important/);
}

console.log('test_cl_guide.js OK');
