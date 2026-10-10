// CL-17: core-loop game feel. Every event kind in the README's Events table has an entry in
// js/ui/coreloop/feedback.js, mapped to the right tier, with text in both languages; bursts and
// time away are summarised; nothing fires while hidden; no DOM means no-op.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, start, tierOfLevel, CoreLoopFeedback, KINDS, BURST } from './js/ui/coreloop/feedback.js';
import { PRESENCE } from './js/systems/coreloop/shared.js';
import { P } from './js/systems/coreloop/params.js';
import EN from './js/i18n/en.js';
import AR from './js/i18n/ar.js';

// The kinds are read from the first column of the README's Events table
const readme = readFileSync(new URL('./js/systems/coreloop/README.md', import.meta.url), 'utf8');
const table = readme.split('\n## Events')[1].split('\n## ')[0];
const kinds = [];
for (const line of table.split('\n')) {
  if (!line.startsWith('|')) continue;
  const first = line.split('|')[1];
  for (const m of first.matchAll(/`(\w+)`/g)) if (m[1] !== 'Kind') kinds.push(m[1]);
}
assert.ok(kinds.length >= 20, 'parsed the Events table: ' + kinds.join(','));

// A sample event per kind with the level the README gives (rank and seal also at their big level)
const LEVEL = {
  gusher: 1, newWell: 1, flare: 2, order: 2, bubble: 2, vial: 2, rank: 2,
  generator: 3, bubbleFamily: 3, vialTier: 3, compound: 3, gilded: 3, grade: 3, rigGrade: 3, seal: 3, newField: 3,
  weekly: 4, royal: 4, trial: 4, chronicle: 4
};
const DATA = {
  flare: {}, order: { frac: 2 }, bubble: { cauldron: 1 }, vial: { key: '1:4' }, rank: { field: 0, action: 1, rank: 2 },
  generator: { n: 12 }, bubbleFamily: { n: 2 }, vialTier: { key: '2:3', tier: 2 }, compound: { recipe: 5 }, gilded: { recipe: 5 },
  grade: { field: 1, grade: 3 }, rigGrade: { field: 2, grade: 3 }, seal: { seal: 0, tier: 2 }, newField: { n: 4 },
  royal: { recipe: 6 }, trial: { id: 'autoBuy' }, chronicle: { pages: 3 }, newWell: { reserves: 1 }
};
const TIER = { 1: 1, 2: 2, 3: 2, 4: 3 };

console.log('--- every README kind is covered, at the right tier, with text in both languages ---');
for (const kind of kinds) {
  assert.ok(KINDS.includes(kind), `feedback.js has no entry for "${kind}"`);
  assert.ok(kind in LEVEL, `the test has no level for "${kind}"`);
  const d = describe({ kind, level: LEVEL[kind], ...(DATA[kind] || {}) }, {});
  assert.ok(d, kind);
  assert.equal(d.tier, TIER[LEVEL[kind]], `${kind} tier`);
  assert.equal(d.named, LEVEL[kind] === 3, `${kind} named toast only at level 3`);
  assert.ok(d.sound, `${kind} has a sound`);
  assert.ok(d.target, `${kind} has a target`);
  assert.ok(d.textKey in EN && d.textKey in AR, `${d.textKey} in en and ar`);
  assert.ok(!/[A-Za-z]{3,}/.test(AR[d.textKey].replace(/\{\w+\}/g, '')), `no Latin words in Arabic ${d.textKey}`);
  assert.ok(`cl.fx.kind.${kind}` in EN && `cl.fx.kind.${kind}` in AR, `plural noun for ${kind}`);
  assert.ok(!/\{\w+\}/.test(Object.values(d.params).join(' ')), `${kind} params resolved`);
  // every placeholder in the line has a param
  for (const m of EN[d.textKey].matchAll(/\{(\w+)\}/g)) assert.ok(m[1] in d.params, `${kind} param ${m[1]}`);
  assert.ok(kind in LEVEL && KINDS.length === Object.keys(LEVEL).length, 'no stale entries');
}
assert.equal(describe({ kind: 'nope' }), null);
// every key, in both languages
for (const k of Object.keys(EN).filter(k => k.startsWith('cl.fx.'))) assert.ok(k in AR && AR[k], 'Arabic for ' + k);

console.log('--- the level decides the tier (rank titles and big Seal tiers are T3) ---');
assert.equal(tierOfLevel(1), 1); assert.equal(tierOfLevel(2), 2); assert.equal(tierOfLevel(3), 2); assert.equal(tierOfLevel(4), 3);
assert.equal(describe({ kind: 'rank', level: 4, field: 0, action: 0, rank: 5 }).tier, 3);
assert.equal(describe({ kind: 'rank', level: 4, field: 0, action: 0, rank: 5 }).textKey, 'cl.fx.rankTitle');
assert.equal(describe({ kind: 'seal', level: 4, seal: 1, tier: P.sealBigTier }).tier, 3);
assert.equal(describe({ kind: 'seal', level: 4, seal: 1, tier: P.sealBigTier }).textKey, 'cl.fx.sealBig');
assert.equal(describe({ kind: 'flare' }).tier, 2, 'no level given: the contract default');

console.log('--- the runtime: bursts, time away, hidden, reduced ---');
function rig({ hidden = false, presence = PRESENCE.HANDS, t = 0 } = {}) {
  const log = { fire: [], cue: [], toast: [], ceremony: [] };
  const api = { state: { t }, presence: () => presence, on: () => () => {} };
  const doc = { hidden, getElementById: () => null };
  const fb = new CoreLoopFeedback(api, {
    doc,
    fx: { particles: {}, fire: (...a) => log.fire.push(a), cue: (...a) => log.cue.push(a) },
    rewards: { toast: (e) => log.toast.push(e), ceremony: (e) => log.ceremony.push(e) },
    schedule: () => {}
  });
  return { fb, log, api, doc };
}
{
  const { fb, log } = rig();
  fb.push({ kind: 'order', level: 2, frac: 0 });
  fb.push({ kind: 'weekly', level: 4 });
  fb.push({ kind: 'grade', level: 3, field: 0, grade: 2 });
  fb.flush();
  assert.equal(log.fire.length, 2, 'order and grade fire (weekly goes to the ceremony)');
  assert.equal(log.fire[0][0], 2);
  assert.equal(log.ceremony.length, 1, 'T3 goes through the rewards ceremony path');
  assert.equal(log.ceremony[0].tier, 'big');
  assert.equal(log.toast.length, 1, 'the named toast for the grade');
  assert.equal(log.toast[0].sound, false, 'the fire() call already made the sound');
}
{
  const { fb, log } = rig();
  for (let i = 0; i < BURST + 3; i++) fb.push({ kind: 'bubble', level: 2, cauldron: 0 });
  fb.push({ kind: 'order', level: 2, frac: 1 });
  fb.flush();
  assert.equal(log.fire.length, 1, 'only the lone order fires; the burst is one summary');
  assert.equal(log.toast.length, 1);
  assert.equal(log.toast[0].title, `${BURST + 3} x Bubbles`);
}
{
  // time away: the loop clock jumped, so even a few events become one line per kind, no ceremony
  const { fb, log, api } = rig({ t: 100 });
  api.state.t = 100 + 3600;
  fb.push({ kind: 'weekly', level: 4 });
  fb.push({ kind: 'order', level: 2, frac: 0 });
  fb.push({ kind: 'order', level: 2, frac: 1 });
  fb.flush();
  assert.equal(log.fire.length, 0); assert.equal(log.ceremony.length, 0);
  assert.equal(log.toast.length, 2, 'one summary per kind');
  assert.ok(log.toast.every(e => e.sound === false));
  // the next live event is fine again
  fb.push({ kind: 'order', level: 2, frac: 1 }); api.state.t += 1; fb.flush();
  assert.equal(log.fire.length, 1);
}
{
  const { fb, log } = rig({ hidden: true });
  fb.push({ kind: 'order', level: 2, frac: 0 }); fb.flush();
  assert.equal(log.fire.length + log.toast.length + log.ceremony.length, 0, 'nothing while the page is hidden');
  const away = rig({ presence: PRESENCE.AWAY });
  away.fb.push({ kind: 'order', level: 2, frac: 0 }); away.fb.flush();
  assert.equal(away.log.fire.length, 0, 'nothing in Away presence');
}

console.log('--- no DOM: start() is a safe no-op and unsubscribes ---');
{
  let listener = null, off = 0;
  const api = { state: { t: 0 }, presence: () => PRESENCE.HANDS, on: (fn) => { listener = fn; return () => { off++; }; } };
  const stop = start(api);
  assert.equal(typeof stop, 'function');
  listener({ kind: 'order', level: 2, frac: 0 });   // no document: must not throw
  stop();
  assert.equal(off, 1);
  assert.equal(typeof start(null), 'function');
}

console.log('test_cl_ui_feedback: ok');
