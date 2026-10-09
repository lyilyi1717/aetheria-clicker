// R45: New Well / New Field ceremonies: no confirm(), hold rules, cooldown bypass, save default.
// Run: node test_r45_prestige_ceremony.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CeremonyScheduler } from './js/ui/rewardQueue.js';
import { needsHold, playRelease, confirmPrestige, HOLD_MS, SINK_MS, CALLOUT_MS, BURST_SPARKS } from './js/ui/prestigeCeremony.js';
import { GameState } from './js/systems/GameState.js';
import { SOUND_IDS } from './js/engine/AudioEngine.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// the browser confirm() is gone from both prestige buttons
assert.ok(!/confirm\(/.test(read('./js/ui/prestige.js')), 'prestige.js has no confirm()');
const main = read('./js/main.js');
const ascend = main.slice(main.indexOf("getElementById('btn-do-ascend')"), main.indexOf('this.transcendUI = new TranscendPanel'));
assert.ok(!/confirm\(/.test(ascend), 'New Well button has no confirm()');
assert.ok(ascend.includes('runPrestige'));

// hold rules: hold by default, tap with the setting or under reduced motion
assert.equal(needsHold({}, false), true);
assert.equal(needsHold({ tapToConfirm: true }, false), false);
assert.equal(needsHold({}, true), false);
assert.equal(HOLD_MS, 800);
assert.equal(BURST_SPARKS, 60);
assert.ok(SINK_MS + CALLOUT_MS + 2400 <= 3500, 'release + card fits 3.5 s');

// no DOM (node): the sheet declines, the release commits at once
assert.equal(await confirmPrestige({ kind: 'well', question: 'q', settings: {} }), false);
let n = 0;
playRelease('well', () => n++);
assert.equal(n, 1);
playRelease('field', () => n++, null, { reduced: true });
assert.equal(n, 2);

// a chosen New Well gets its ceremony inside the 60 s cooldown; an unforced one becomes a toast
const sched = new CeremonyScheduler();
const first = sched.request({ tier: 'big', kind: 'ascension' }, 1000);
assert.equal(first.action, 'show');
sched.finish(1500);
assert.equal(sched.request({ tier: 'big', kind: 'ascension' }, 5000).action, 'toast');
const forced = sched.request({ tier: 'big', kind: 'ascension', signature: 'well', force: true, durationMs: 2400 }, 5000);
assert.equal(forced.action, 'show');
assert.equal(forced.entry.signature, 'well');
assert.equal(sched.duration(forced.entry, false), 2400);
assert.ok(sched.duration(forced.entry, true) < 2400, 'reduced motion: short card');

// the rising tone exists and Settings default / old saves
assert.ok(SOUND_IDS.ascension === 'playAscension');
const gs = new GameState();
assert.equal(gs.settings.tapToConfirm, false);
const data = JSON.parse(JSON.stringify(gs.serialize()));
delete data.settings.tapToConfirm;
const old = new GameState();
old.deserialize(data);
assert.equal(old.settings.tapToConfirm, false, 'old save loads with hold-to-confirm');
data.settings.tapToConfirm = true;
const on = new GameState();
on.deserialize(data);
assert.equal(on.settings.tapToConfirm, true);

console.log('R45 prestige ceremony tests passed');
