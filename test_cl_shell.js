// CL-12: the core-loop shell behind ?loop=2: the flag, the separate save, the loop tick
// (js/systems/coreloop/Loop.js), time away, and the shell's load / tick / save without a browser.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BigNum } from './js/engine/BigNum.js';
import { P } from './js/systems/coreloop/params.js';
import { PRESENCE, FIELD, makeContext } from './js/systems/coreloop/shared.js';
import { createCoreLoopState, serializeCoreLoop } from './js/systems/coreloop/state.js';
import * as Loop from './js/systems/coreloop/Loop.js';
import * as Well from './js/systems/coreloop/Well.js';
import * as Rigs from './js/systems/coreloop/Rigs.js';
import * as Presence from './js/systems/coreloop/Presence.js';
import * as Prestige from './js/systems/coreloop/Prestige.js';
import { loadCoreLoop, saveCoreLoop, secondsAway, coreLoopFlag, CORE_LOOP_SAVE_KEY } from './js/ui/coreloop/store.js';
import { CoreLoopShell, SCREENS, currentPresence, fmtDuration } from './js/ui/coreloop/shell.js';
import EN from './js/i18n/en.js';
import AR from './js/i18n/ar.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
};
// A small running state: a Rig in every Field, a few slots, Crew
function running(seed = 3) {
  const s = createCoreLoopState(seed);
  s.fields.forEach((f, i) => { Rigs.build(s, i); f.frontier = 25 + 5 * i; f.bestGrade = Math.floor(f.frontier / 10); });
  s.well.crude = new BigNum(1, 12);
  Well.buyMax(s);
  s.prestige.crew = 1;
  return s;
}
// An open Order's refillAt means nothing and isn't kept by a load
const sig = (s) => {
  const j = serializeCoreLoop(s);
  for (const o of j.refinery.orders) if (!o.empty) delete o.refillAt;
  return JSON.stringify(j);
};

console.log('--- the flag and the separate save key ---');
{
  assert.equal(coreLoopFlag('?loop=2'), true);
  assert.equal(coreLoopFlag('?x=1&loop=2'), true);
  for (const q of ['', '?', '?loop=1', '?loop=22', '?loopx=2']) assert.equal(coreLoopFlag(q), false, q);
  assert.equal(CORE_LOOP_SAVE_KEY, 'AETHERIA_CORELOOP_SAVE_V1');
  assert.notEqual(CORE_LOOP_SAVE_KEY, 'AETHERIA_CHRONICLES_SAVE_V1', 'never the current game\'s save');
  // main.js only starts the shell behind the flag, and before the current game is created
  const main = readFileSync('js/main.js', 'utf8');
  const at = main.indexOf('coreLoopFlag(location.search)');
  assert.ok(at > 0 && at < main.indexOf('window.gameApp = new AetheriaApp()'));
}

console.log('--- save and load ---');
{
  const st = memory();
  const fresh = loadCoreLoop(st, 1000);
  assert.equal(fresh.fresh, true);
  assert.equal(fresh.savedAt, null);
  const s = running();
  Loop.advance(s, 30, PRESENCE.WATCH);
  assert.equal(saveCoreLoop(st, s, 5000), true);
  const back = loadCoreLoop(st, 9000);
  assert.equal(back.fresh, false);
  assert.equal(back.savedAt, 5000);
  assert.equal(sig(back.state), sig(s), 'the state survives the save');
  assert.equal(secondsAway(5000, 9000), 4);
  assert.equal(secondsAway(9000, 5000), 0, 'a clock that went backwards pays nothing');
  assert.equal(secondsAway(null, 5000), 0);
  // an unreadable save starts fresh and keeps the bad copy
  st.setItem(CORE_LOOP_SAVE_KEY, '{nope');
  const bad = loadCoreLoop(st, 1);
  assert.equal(bad.fresh, true);
  assert.equal(st.getItem(CORE_LOOP_SAVE_KEY + '_BAD'), '{nope');
  // a storage that throws
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); } };
  assert.equal(loadCoreLoop(broken, 1).fresh, true);
  assert.equal(saveCoreLoop(broken, s, 1), false);
}

console.log('--- one tick: the README order, automation only when won ---');
{
  const a = running(), b = running();
  const ctx = makeContext();
  const made = Loop.advance(a, 30, PRESENCE.WATCH, ctx);
  assert.ok(made.gt(0));
  assert.equal(a.t, 30, 'the clock moves last');
  // the same tick by hand, in the README's order
  Presence.step(b, 30, PRESENCE.WATCH); Well.step(b, 30, PRESENCE.WATCH); Rigs.step(b, 30, PRESENCE.WATCH);
  const { step: cauldrons } = await import('./js/systems/coreloop/Cauldrons.js');
  const { step: seals } = await import('./js/systems/coreloop/Seals.js');
  const { step: collection } = await import('./js/systems/coreloop/Collection.js');
  const { step: refinery } = await import('./js/systems/coreloop/Refinery.js');
  cauldrons(b, 30, PRESENCE.WATCH); seals(b, 30, PRESENCE.WATCH); collection(b, 30, PRESENCE.WATCH); refinery(b, 30, PRESENCE.WATCH);
  b.t += 30;
  assert.equal(sig(a), sig(b));
  assert.equal(Loop.advance(a, 0, PRESENCE.WATCH).m, 0, 'no time, no tick');
  assert.equal(a.t, 30);
  // without Auto-Buy the Crude piles up; with it the loop spends it
  const c = running(); c.well.crude = new BigNum(1, 30);
  Loop.advance(c, 1, PRESENCE.WATCH);
  assert.ok(c.well.crude.e >= 30, 'nothing bought without Auto-Buy');
  c.prestige.trials.autoBuy = { unlockedAt: 0, won: true };
  Loop.advance(c, 1, PRESENCE.WATCH);
  assert.ok(c.well.crude.e < 30, 'Auto-Buy spends');
  assert.equal(Prestige.hasAutomation(c, 'autoBuy'), true);
}

console.log('--- a Gusher is a tap: Crude and Materials ---');
{
  const s = running();
  assert.equal(Loop.catchGusher(s), null, 'none up');
  Loop.advance(s, 1, PRESENCE.WATCH);                // schedules the first
  s.t = s.presence.nextGusherAt; s.presence.state = PRESENCE.WATCH;
  const crude0 = s.well.crude, rate = Well.crudePerSecond(s, PRESENCE.WATCH);
  const ctx = makeContext();
  const pay = Loop.catchGusher(s, ctx);
  assert.ok(pay && pay.units > 0);
  assert.ok(Math.abs(pay.crude.toNumber() / rate.toNumber() - P.gusherSeconds) < 1e-6);
  assert.ok(s.well.crude.gt(crude0));
  assert.deepEqual(ctx.events.map(e => e.kind), ['gusher']);
  assert.equal(Loop.catchGusher(s), null, 'caught once');
}

console.log('--- time away: Away steps, capped at P.offlineMaxHours ---');
{
  const a = running(), b = running();
  const r = Loop.settleAway(a, 3600);
  for (let i = 0; i < 3600 / P.offlineStep; i++) Loop.advance(b, P.offlineStep, PRESENCE.AWAY);
  assert.equal(sig(a), sig(b), 'an hour away is twelve Away steps');
  assert.equal(r.seconds, 3600);
  assert.equal(r.capped, false);
  assert.ok(r.crude.gt(0) && r.units > 0, 'Away always gains (rule 8)');
  const c = running();
  const long = Loop.settleAway(c, 100 * 3600);
  assert.equal(long.seconds, P.offlineMaxHours * 3600);
  assert.equal(long.capped, true);
  assert.equal(c.t, P.offlineMaxHours * 3600);
  for (const bad of [-5, NaN, undefined, 0]) assert.equal(Loop.settleAway(running(), bad).seconds, 0);
}

console.log('--- the shell without a browser: load, tick, presence, save ---');
{
  const st = memory();
  const s = running(); saveCoreLoop(st, s, 1_000_000);
  let wall = 1_000_000 + 2 * 3600 * 1000, mono = 0;
  const doc = { hidden: false };
  const shell = new CoreLoopShell({ storage: st, doc, now: () => wall, clock: () => mono });
  const summary = shell.load();
  assert.equal(summary.seconds, 2 * 3600, 'two hours closed are settled on load');
  assert.equal(shell.state.t, 2 * 3600);
  shell.lastTick = mono;
  mono += 250; shell.tick();
  assert.ok(Math.abs(shell.state.t - (2 * 3600 + 0.25)) < 1e-9, 'a tick moves the loop by real time');
  assert.equal(currentPresence(shell.state, false), PRESENCE.WATCH);
  assert.equal(currentPresence(shell.state, true), PRESENCE.AWAY, 'a hidden page is Away');
  const api = shell.makeApi();
  api.act(() => true);
  assert.equal(api.presence(), PRESENCE.HANDS, 'an action is input');
  mono += 60_000; shell.tick();                     // a throttled tab: settled as time away
  assert.ok(Math.abs(shell.state.t - (2 * 3600 + 60.25)) < 1e-6);
  wall += 5000;
  assert.equal(shell.save(), true);
  assert.equal(JSON.parse(st.getItem(CORE_LOOP_SAVE_KEY)).savedAt, wall);
  assert.equal(st.getItem('AETHERIA_CHRONICLES_SAVE_V1'), null, 'the current game\'s save is never written');
  assert.deepEqual(SCREENS.map(x => x.id), ['well', 'fields', 'refinery', 'prestige', 'codex']);
}

console.log('--- strings: registered, with Arabic, no clashes ---');
{
  for (const sc of SCREENS) assert.ok(EN['cl.tab.' + sc.id] && AR['cl.tab.' + sc.id], sc.id);
  const keys = Object.keys(EN).filter(k => k.startsWith('cl.'));
  assert.ok(keys.length > 60);
  for (const k of keys) assert.ok(typeof AR[k] === 'string' && AR[k].trim(), `Arabic for ${k}`);
  assert.equal(EN['cl.rig.mine'], 'Hmar al-Naft');
  assert.equal(AR['cl.name.flare'], 'شبّ الضو');
  assert.equal(fmtDuration(3 * 3600 + 25 * 60), '3 h 25 min');
  const { registerStrings } = await import('./js/i18n/coreloop/index.js');
  assert.throws(() => registerStrings({ 'cl.tab.well': 'Pump' }, {}), /already defined/);
  registerStrings({ 'cl.tab.well': EN['cl.tab.well'] }, { 'cl.tab.well': AR['cl.tab.well'] });   // same text: fine
  assert.equal(FIELD.OASIS, 2);
}

console.log('test_cl_shell.js OK');
