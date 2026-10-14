// Dig: Reduce motion. The default follows prefers-reduced-motion, the player's choice wins and is kept, bursts are capped.
import { KEY, MAX_BURST, browserWants, load, save, burst, motion, setReduced, isReduced, init } from './proto/ui/motion.js';
import { shake, screenFlash, spark, fx } from './proto/ui/render.js';
import { summary, BUDGET } from './scripts/dig-budget.mjs';
let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };
const mem = (init = {}) => { const d = { ...init }; return { getItem: k => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, d }; };
const mq = on => () => ({ matches: on });
const root = () => { const s = new Set(); return { classList: { toggle: (c, f) => (f ? s.add(c) : s.delete(c)), has: c => s.has(c) }, has: c => s.has(c) }; };

ok(browserWants(mq(true)) === true && browserWants(mq(false)) === false, 'reads the media query');
ok(browserWants(undefined) === false && browserWants(() => { throw new Error('x'); }) === false, 'no media query = full motion');
ok(load(mem(), mq(true)) === true && load(mem(), mq(false)) === false, 'no saved choice: follows the browser');
ok(load(mem({ [KEY]: '0' }), mq(true)) === false, 'saved Off beats the browser');
ok(load(mem({ [KEY]: '1' }), mq(false)) === true, 'saved On beats the browser');
ok(load(mem({ [KEY]: 'junk' }), mq(true)) === true, 'junk value = browser');
ok(load({ getItem() { throw new Error('blocked'); } }, mq(true)) === true, 'blocked store = browser');
const st = mem();
ok(save(st, true) && load(st, mq(false)) === true, 'choice persists');
ok(save(st, false) && load(st, mq(true)) === false, 'choosing Off persists against the browser');
ok(save({ setItem() { throw new Error('full'); } }, true) === false, 'a blocked write does not throw');
ok(burst(40, true) === MAX_BURST && burst(5, true) === 5 && burst(40, false) === 40, 'bursts capped at 8 only when reduced');

const r = root();
ok(init(mem(), mq(true), r) === true && isReduced() && !motion() && r.has('calm'), 'init follows the browser and sets the calm class');
ok(init(mem({ [KEY]: '0' }), mq(true), r) === false && motion() && !r.has('calm'), 'init honours a saved Off');

// the effect functions
fx.trauma = 0; fx.screenFlash = 0; fx.parts.length = 0;
setReduced(true);
shake(0.8); screenFlash('#fff', 0.5); spark(10, 10, '#fff', 40);
ok(fx.trauma === 0 && fx.screenFlash === 0, 'no shake and no screen flash when reduced');
ok(fx.parts.length === MAX_BURST, 'spark burst capped at 8 when reduced');
setReduced(false);
shake(0.8); screenFlash('#fff', 0.5);
ok(fx.trauma === 0.8 && fx.screenFlash === 0.5, 'full motion unchanged');

// the budget script's summary line (the browser part is not run in npm test)
const good = summary({ firstFrameMs: 900, p95Ms: 16.7, saveBytes: 5000 });
ok(!good.failed && good.line.includes('900 ms') && good.line.includes('16.7 ms') && good.line.includes('5000 bytes') && !good.line.includes('OVER'), 'budget line, all inside');
ok(summary({ firstFrameMs: 900, p95Ms: 25, saveBytes: 5000 }).failed && summary({ firstFrameMs: 900, p95Ms: 25, saveBytes: 5000 }).line.includes('25 ms OVER'), 'p95 over budget fails');
ok(summary({ firstFrameMs: 2500, p95Ms: 10, saveBytes: 1 }).failed && summary({ firstFrameMs: 900, p95Ms: 10, saveBytes: BUDGET.saveBytes }).failed, 'first frame and save over budget fail');
const nm = summary({ firstFrameMs: null, p95Ms: null, saveBytes: null });
ok(nm.line.split('not measured').length === 4 && !nm.line.includes('pass'), 'a number that cannot be measured says not measured, never pass');
ok(summary({ firstFrameMs: 900, p95Ms: 10, saveBytes: 5 }).line.includes('\n') === false, 'one line');

console.log(`${n - bad}/${n} passed`);
process.exit(bad ? 1 : 0);
