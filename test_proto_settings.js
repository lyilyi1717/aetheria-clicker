// Dig: the volume maths and what is kept (no DOM, no audio).
import { DEFAULTS, KEY, masterGain, busGain, effective, clampLevel, normalise, load, save } from './proto/ui/volume.js';
let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };
const near = (a, b) => Math.abs(a - b) < 1e-9;
const mem = (init = {}) => { const d = { ...init }; return { getItem: k => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, d }; };

ok(near(masterGain(DEFAULTS.master), 0.5), 'default master is the old gain 0.5');
ok(near(busGain(DEFAULTS.music, DEFAULTS.music), 1) && near(busGain(DEFAULTS.fx, DEFAULTS.fx), 1), 'default buses are unchanged');
ok(masterGain(0) === 0 && busGain(0, 70) === 0, 'zero is silent');
ok(masterGain(100) > masterGain(80) && masterGain(50) < masterGain(80), 'master is monotonic');
ok(near(effective(DEFAULTS, 'music'), 0.5) && near(effective(DEFAULTS, 'fx'), 0.5), 'default effective level equals the old 0.5');
ok(effective(DEFAULTS, 'fx', true) === 0, 'mute is silence');
ok(effective({ ...DEFAULTS, music: 0 }, 'music') === 0 && effective({ ...DEFAULTS, music: 0 }, 'fx') > 0, 'music 0 leaves effects');
ok(clampLevel(150) === 100 && clampLevel(-4) === 0 && clampLevel('abc', 70) === 70 && clampLevel(33.6) === 34, 'clamping');
ok(JSON.stringify(normalise(null)) === JSON.stringify(DEFAULTS), 'missing = defaults');
ok(normalise({ master: 10 }).music === DEFAULTS.music, 'a missing key is the default');

const st = mem();
ok(JSON.stringify(load(st)) === JSON.stringify(DEFAULTS), 'empty store loads defaults');
ok(save(st, { master: 30, music: 0, fx: 100 }), 'save works');
const back = load(st);
ok(back.master === 30 && back.music === 0 && back.fx === 100, 'round trip');
ok(load(mem({ [KEY]: '{bad json' })).master === DEFAULTS.master, 'corrupt value = defaults');
ok(load({ getItem() { throw new Error('blocked'); } }).fx === DEFAULTS.fx, 'a blocked store = defaults');
ok(save({ setItem() { throw new Error('full'); } }, DEFAULTS) === false, 'a blocked write does not throw');

console.log(`${n - bad}/${n} passed`);
process.exit(bad ? 1 : 0);
