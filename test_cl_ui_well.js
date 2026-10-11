// CL-13: the core-loop Well screen. No DOM: the module imports without one; the pure views and the
// strings are checked here, the screen itself in a browser.
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { P } from './js/systems/coreloop/params.js';
import { PRESENCE, makeContext } from './js/systems/coreloop/shared.js';
import { createCoreLoopState } from './js/systems/coreloop/state.js';
import * as Well from './js/systems/coreloop/Well.js';
import * as Presence from './js/systems/coreloop/Presence.js';
import * as Prestige from './js/systems/coreloop/Prestige.js';
import * as W from './js/ui/coreloop/well.js';
import EN_W from './js/i18n/coreloop/well.en.js';
import AR_W from './js/i18n/coreloop/well.ar.js';
import EN from './js/i18n/en.js';
import AR from './js/i18n/ar.js';
import SHELL_EN from './js/i18n/coreloop/shell.en.js';
Object.assign(EN, SHELL_EN); // the shared names the screen reads (the shell registers them in the game)

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const ph = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

// --- strings -------------------------------------------------------------------------------------
ok(typeof W.mount === 'function', 'mount exported');
for (const k of Object.keys(EN_W)) {
  ok(k.startsWith('cl.well.'), k + ' is namespaced');
  ok(EN[k] === EN_W[k], k + ' registered');
  ok(typeof AR_W[k] === 'string' && AR_W[k].length > 0, k + ' has Arabic');
  ok(AR[k] === AR_W[k], k + ' registered in Arabic');
  eq(ph(AR_W[k]), ph(EN_W[k]), k + ' keeps its placeholders');
  ok(!/[A-Za-z]{3,}/.test(AR_W[k].replace(/\{\w+\}/g, '')), k + ' has no Latin words in Arabic');
}
eq(Object.keys(AR_W).sort(), Object.keys(EN_W).sort(), 'same keys in both languages');

const ctx = makeContext(() => {});
const fresh = () => createCoreLoopState(7);

// --- slots shown ---------------------------------------------------------------------------------
{
  const s = fresh();
  eq(W.slotsShown(s), 1, 'an empty Well shows the first slot');
  s.well.crude = new BigNum(1, 6);
  Well.buy(s, 1, 1);
  eq(W.slotsShown(s), 1, 'the first run: the Hand Pump waits for a full crate of Buckets');
  s.well.bought[1] = P.packSize;
  eq(W.slotsShown(s), 2, 'one above the highest bought');
  const again = fresh();
  again.prestige.wells = 1; again.well.crude = new BigNum(1, 6);
  Well.buy(again, 1, 1);
  eq(W.slotsShown(again), 2, 'after a New Well the next pump shows at once');
  s.well.bought[P.slots] = 1;
  eq(W.slotsShown(s), P.slots, 'never past the last slot');
}

// --- slot view -----------------------------------------------------------------------------------
{
  const s = fresh();
  s.well.crude = new BigNum(1);
  const v = W.slotView(s, 1);
  eq(v.packLeft, P.packSize, 'a full pack to go');
  eq(v.packFrac, 0, 'no progress to the x2');
  ok(v.shown, 'slot 1 shown');
  ok(!W.slotView(s, 3).shown, 'slot 3 is a locked teaser');
  const n = Math.min(3, Well.affordable(s, 1));
  if (n > 0) { Well.buy(s, 1, n); }
  const v2 = W.slotView(s, 1);
  eq(v2.bought, n);
  eq(v2.packLeft, P.packSize - n);
  ok(Math.abs(v2.packFrac - n / P.packSize) < 1e-9, 'progress is bought in this pack / pack size');
}
{
  const s = fresh();
  s.well.crude = BigNum.zero();
  const v = W.slotView(s, 1);
  ok(!v.canBuyOne && !v.canBuyPack, 'cannot buy with no Crude');
  ok(v.missingOne && v.missingOne.gt(BigNum.zero()), 'the missing amount is given');
  ok(v.missingPack.gt(v.missingOne), 'the pack is dearer than one unit');
  s.well.crude = new BigNum(1, 30);
  const rich = W.slotView(s, 1);
  ok(rich.canBuyOne && rich.canBuyPack, 'can buy with plenty');
  eq(rich.missingOne, null, 'nothing missing');
  ok(rich.packCost.eq(rich.cost.mul(P.packSize)), 'pack cost is cost x units');
}
{
  const s = fresh();
  s.well.crude = new BigNum(1, 30);
  Well.buy(s, 1, 1);
  ok(W.slotView(s, 2).rate.eq(Well.slotRate(s, 2)), 'upper slots show the plain slot rate');
}

// --- Max all -------------------------------------------------------------------------------------
{
  const s = fresh();
  s.well.crude = BigNum.zero();
  ok(!W.canBuyAny(s), 'no Crude: Max all is off');
  s.well.crude = new BigNum(1, 20);
  ok(W.canBuyAny(s), 'Crude: Max all is on');
}

// --- Pressure ------------------------------------------------------------------------------------
{
  const s = fresh();
  s.well.crude = BigNum.zero();
  let p = W.pressureView(s);
  ok(!p.can && p.missing, 'Pressure unaffordable shows what is missing');
  eq(p.perLevel, P.pMult);
  s.well.crude = new BigNum(1, 20);
  p = W.pressureView(s);
  ok(p.can && p.missing === null, 'Pressure affordable');
  Well.buyPressure(s);
  eq(W.pressureView(s).level, 1);
}

// --- Flare ---------------------------------------------------------------------------------------
{
  const s = fresh();
  let f = W.flareView(s);
  eq(f.reason, 'none', 'nothing to burn in an empty Well');
  ok(!f.can);
  s.well.crude = new BigNum(1, 40);
  Well.buyMax(s);
  s.well.amount[1] = new BigNum(1, 60);
  f = W.flareView(s);
  ok(f.would > 0, 'a Flare would set a multiplier');
  ok(f.can === Well.canFlare(s), 'enabled exactly when the system says so');
  if (f.can) eq(f.reason, 'ok');
  s.well.flare = f.would * 10;
  f = W.flareView(s);
  eq(f.reason, 'low', 'a Flare worth less than the gain floor');
  ok(!f.can);
  ok(f.needs > f.would);
}
{
  const api = { fmt: (x) => x.format() };
  eq(W.fmtX(api, 0), '0');
  eq(W.fmtX(api, 1), '1');
  eq(W.fmtX(api, 2.5), '2.5');
  eq(W.fmtX(api, 3.14159), '3.14');
  ok(W.fmtX(api, 123456).length > 0 && W.fmtX(api, 123456) !== '123456', 'big values use the game notation');
}

// --- next generator ------------------------------------------------------------------------------
{
  const s = fresh();
  let g = W.generatorView(s);
  eq(g.n, P.slots + 1);
  eq(g.slot, 1, 'generator 9 upgrades slot 1');
  eq(g.goal, P.genLog0);
  eq(g.frac, 0, 'no best run yet');
  s.well.bestEver = new BigNum(1, 30);
  g = W.generatorView(s);
  ok(Math.abs(g.have - 30) < 1e-9);
  ok(Math.abs(g.frac - 30 / P.genLog0) < 1e-9, 'bar is have / goal in log10');
  s.well.bestEver = new BigNum(1, 1000);
  s.well.generators = P.slots;
  eq(W.generatorView(s).frac, 1, 'capped at full');
  s.well.generators = P.generators;
  eq(W.generatorView(s), null, 'all unlocked');
}

// --- Gusher and Heat -----------------------------------------------------------------------------
{
  const s = fresh();
  eq(W.gusherView(s), { up: false, left: 0 }, 'no Gusher');
  s.presence.nextGusherAt = 100; s.t = 105;
  s.presence.state = PRESENCE.WATCH;
  const g = W.gusherView(s);
  ok(g.up && Math.abs(g.left - (P.gusherWindow - 5)) < 1e-9, 'seconds left of the window');
  s.presence.state = PRESENCE.AWAY;
  ok(!W.gusherView(s).up, 'not catchable while Away');
  s.presence.state = PRESENCE.WATCH;
  ok(Presence.catchGusher(s, ctx), 'the system agrees it can be caught');

  const h = fresh();
  ok(!W.heatView(h, PRESENCE.WATCH).on, 'no Heat meter while Watching');
  h.presence.heatSeconds = P.heatRamp / 2;
  const hv = W.heatView(h, PRESENCE.HANDS);
  ok(hv.on && Math.abs(hv.frac - 0.5) < 1e-9 && Math.abs(hv.heat - 1.5) < 1e-9, 'Heat 1..2 over the ramp');
}

// --- CL-29: words, waits, hero, run strip, sections ----------------------------------------------
{
  const api = { fmt: (x) => x.format() };
  eq(W.etaSeconds(new BigNum(36), new BigNum(3)), 12, '36 more at 3 a second is 12 s');
  eq(W.etaSeconds(new BigNum(1), new BigNum(1, 5)), 1, 'never under a second');
  eq(W.etaSeconds(new BigNum(5), BigNum.zero()), null, 'no rate, no promise');
  eq(W.etaSeconds(new BigNum(1, 40), new BigNum(1)), Infinity, 'far away');
  eq(W.waitWords(12), '12 s');
  eq(W.waitWords(130), '3 min');
  eq(W.waitWords(600), '10 min');
  eq(W.waitWords(601), null, 'past ten minutes no wait is printed');
  eq(W.waitWords(7300), null, 'never hours');
  eq(W.waitWords(1e9), null, 'too long to say');
  eq(W.whenWords(api, new BigNum(36), new BigNum(3)), 'in 12 s');
  eq(W.whenWords(api, new BigNum(1, 6), new BigNum(3)), '', 'a far-off price says nothing; its bar shows how close');
  eq(W.whenWords(api, new BigNum(36), BigNum.zero()), '', 'a zero rate promises nothing');
  eq(W.rowWords(1), { key: 'cl.well.makes_crude', prev: 0 }, 'the Bucket makes Crude');
  eq(W.rowWords(4), { key: 'cl.well.makes_pump', prev: 3 }, 'other pumps make the pump before');
  ok(W.slotName(3, true).includes('(') && !W.slotName(2, true).includes('('), 'gloss only where there is one');
  ok(!/Tier|slot|generator \d/i.test(W.slotName(1) + W.slotName(8)), 'game names, never Tier');
}
{
  const s = fresh();
  let h = W.heroView(s, PRESENCE.WATCH);
  eq(h.mode, 'well', 'the well without a Gusher');
  ok(!h.heat.warm, 'cold at the start');
  s.presence.heatSeconds = P.heatRamp;
  h = W.heroView(s, PRESENCE.HANDS);
  ok(h.heat.warm && h.heat.frac === 1 && h.heat.gain > 1, 'full Heat gives a real gain');
  s.presence.nextGusherAt = 100; s.t = 105; s.presence.state = PRESENCE.WATCH;
  h = W.heroView(s, PRESENCE.WATCH);
  ok(h.mode === 'gusher' && h.left > 0, 'the well is the Gusher while one is up');
}
{
  const s = fresh();
  ok(!W.runView(s).show, 'no run bar until the guide opens it');
  ok(W.runView(s, true).show, 'shown when the guide opens it');
  let r = W.runView(s, true);
  ok(r.first && r.frac === 0 && r.pct === 0, 'first run, empty bar');
  s.well.runCrude = new BigNum(1, 3);
  r = W.runView(s, true);
  ok(Math.abs(r.frac - 3 / Prestige.newWellRunLog(s)) < 1e-9, 'bar is log10 run Crude over log10 the run needs');
  ok(r.pct === Math.floor(r.frac * 100) && r.pct < 100, 'whole percent');
  s.well.runCrude = new BigNum(1, 20);
  r = W.runView(s, true);
  ok(r.ready && r.frac === 1 && r.pct === 100 && r.pending >= 1, 'ready is a full bar');
  s.prestige.wells = 1;
  ok(!W.runView(s, true).first && W.runView(fresh(), true).first, 'later runs say Next');
  // never back: the biggest value seen in a run stays; a new run starts again
  const hold = W.makeHold();
  eq(hold(0, 0.4), 0.4);
  eq(hold(0, 0.3), 0.4, 'a smaller value does not move the bar back');
  eq(hold(0, 0.5), 0.5);
  eq(hold(1, 0.1), 0.1, 'a new run starts the bar again');
}
{
  const open = (set) => (f) => set.includes(f);
  let v = W.sectionsView(open([]));
  eq(v.lock, 'well.maxall', 'the first closed section is the one coming');
  ok(Object.values(v.open).every(x => !x), 'nothing open');
  v = W.sectionsView(open(['well.maxall', 'well.pressure']));
  eq(v.lock, 'well.flare');
  v = W.sectionsView(open(W.SECTIONS));
  eq(v.lock, null, 'all open, none locked');
}
{
  // a fresh save shows the well and one pump row, nothing else
  const s = fresh();
  eq(W.slotsShown(s), 1);
  const open = (f) => s.guide.open[f] === true;
  ok(!open('well.maxall') && !open('well.pressure') && !open('well.flare') && !open('well.generators'), 'sections start closed');
}
// --- CL-36: the Well tells the truth -------------------------------------------------------------
{
  const api = { fmt: (x) => x.format() };
  eq(W.whole(api, new BigNum(44.67), 'ceil'), '45', 'prices round up to a whole number');
  eq(W.whole(api, new BigNum(446.68), 'ceil'), '447');
  eq(W.whole(api, new BigNum(17.26), 'floor'), '17', 'counts climb 11, 12, 13');
  eq(W.whole(api, new BigNum(1.125)), '1', 'rates are whole under 1,000');
  ok(W.whole(api, new BigNum(1.5, 4)) === api.fmt(new BigNum(1.5, 4)), 'big numbers use the game notation');
  const v = W.slotView(fresh(), 1);
  ok(v.nextCost.gt(v.cost.mul(1000)), 'the price step is announced with the x2');
  const s = fresh();
  s.well.crude = new BigNum(1, 6); Well.buy(s, 1, 10);
  eq(W.nextCrateCost(fresh(), 1).format(), Well.slotCost(s, 1).format(), 'the announced price is the price after the crate');
  // a button's fill is Crude held over price
  const f = fresh(); f.well.crude = new BigNum(25);
  ok(Math.abs(W.fillFrac(f, new BigNum(100)) - 0.25) < 1e-9, 'a quarter full');
  f.well.crude = new BigNum(500);
  eq(W.fillFrac(f, new BigNum(100)), 1, 'never more than full');
  f.well.crude = BigNum.zero();
  eq(W.fillFrac(f, new BigNum(100)), 0, 'empty with nothing');
  eq(W.whenWords(api, new BigNum(3.98, 3), new BigNum(0.02)), '', 'an hour away says nothing');
}
{
  // one gold thing
  const items = [
    { id: 'run', anchor: 'prestige.newwell', can: false },
    { id: 'b2', anchor: 'well.buy.2', can: true },
    { id: 'b1', anchor: 'well.buy.1', can: true },
    { id: 'pressure', anchor: 'well.pressure', can: true },
    { id: 'max', anchor: 'well.maxall', can: true, best: false }
  ];
  const count = (g, k) => Object.values(g).filter((x) => x === k).length;
  let g = W.goldView({ screen: 'well', anchor: 'well.buy.1', here: true }, items);
  eq(g.b1, 'primary', 'the bar names it, so it is the gold one');
  eq(count(g, 'primary'), 1); eq(g.b2, 'ready'); eq(g.max, 'ready'); eq(g.run, '');
  g = W.goldView({ screen: 'well', anchor: 'well.buy.1', here: true }, items.map((i) => (i.id === 'b1' ? { ...i, can: false } : i)));
  eq(count(g, 'primary'), 0, 'its target cannot be pressed yet: nothing else is solid gold');
  g = W.goldView({ screen: 'well', anchor: 'well.tap', here: true }, items);
  eq(count(g, 'primary'), 0, 'the barrel is the goal: no button is solid gold');
  g = W.goldView({ screen: 'fields', anchor: 'fields.work', here: false }, items);
  eq(g.b2, 'primary', 'elsewhere: the best thing here (first that can be pressed)');
  eq(count(g, 'primary'), 1);
  g = W.goldView({ screen: 'fields', anchor: 'fields.work', here: false }, [{ id: 'max', anchor: 'x', can: true, best: false }]);
  eq(count(g, 'primary'), 0, 'Buy everything is never promoted');
  g = W.goldView(null, items);
  eq(count(g, 'primary'), 1, 'no goal known: still at most one');
}
{
  // Buy everything says what it will buy, and does not change the state it looked at
  const api = { fmt: (x) => x.format() };
  const s = fresh();
  s.well.crude = new BigNum(1, 5);
  Well.buy(s, 1, 10);
  const snap = () => JSON.stringify([s.well.crude, s.well.bought, s.well.pressure]);
  const before = snap();
  const plan = W.buyPlan(s);
  eq(snap(), before, 'a dry run leaves the Well alone');
  const real = fresh();
  real.well.crude = s.well.crude; real.well.bought = s.well.bought.slice(); real.well.amount = s.well.amount.slice();
  const b0 = real.well.bought.slice(), p0 = real.well.pressure;
  Well.buyMax(real);
  const got = [];
  for (let k = P.slots; k >= 1; k--) if (real.well.bought[k] > b0[k]) got.push({ k, n: real.well.bought[k] - b0[k] });
  eq(plan.items, got, 'the plan is what buyMax buys');
  eq(plan.pressure, real.well.pressure - p0, 'and the Pressure levels');
  eq(W.buyWords(api, { items: [], pressure: 0 }), 'Buy everything');
  eq(W.buyWords(api, { items: [{ k: 2, n: 2 }], pressure: 1 }), 'Buy: Hand Pump x2, Pressure x1');
  ok(/and 1 more/.test(W.buyWords(api, { items: [{ k: 4, n: 1 }, { k: 3, n: 1 }, { k: 2, n: 1 }], pressure: 1 })), 'a long list is cut');
  // a first unit of a later crate that takes most of the Crude is called out
  const r = fresh();
  r.well.bought[1] = 10; r.well.amount[1] = new BigNum(10); r.well.crude = new BigNum(5, 5);
  const rp = W.buyPlan(r);
  ok(rp.risky && rp.risky.k === 1, 'the 447K Bucket is called out');
}
{
  // Da'sa is a bonus on top; resting shows no bonus and the steady rate does not move
  const s = fresh();
  s.well.crude = new BigNum(1, 5); Well.buy(s, 1, 10);
  s.presence.heatSeconds = P.heatRamp;
  const hot = W.heatView(s, PRESENCE.HANDS);
  ok(hot.pct === Math.round(P.handsWell * 100) && hot.bonus.m > 0, 'full Da\'sa: the percentage and the extra a second');
  eq(hot.max, Math.round(P.handsWell * 100));
  const rate = Well.crudePerSecond(s, PRESENCE.WATCH);
  const ratio = hot.bonus.div(rate).toNumber();
  ok(ratio > 0.49 && ratio < 0.51, 'the bonus is on top of the steady rate');
  s.presence.heatSeconds = 0;
  const cold = W.heatView(s, PRESENCE.WATCH);
  ok(!cold.on && cold.pct === 0 && cold.bonus.m === 0 && cold.frac === 0 && cold.max === hot.max, 'resting: no bonus, the most it can give stays');
  eq(Well.crudePerSecond(s, PRESENCE.WATCH).format(), rate.format(), 'the steady rate does not move');
  eq(W.reservesWords(1), 'A New Well would pay 1 Reserve');
  eq(W.reservesWords(12), 'A New Well would pay 12 Reserves');
}
{
  for (const k of Object.keys(EN_W)) ok(!/\bh\b|hour/i.test(EN_W[k]), k + ' has no hours');
}

{
  // every literal key the screen uses exists
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('./js/ui/coreloop/well.js', import.meta.url), 'utf8');
  for (const m of src.matchAll(/'(cl\.well\.[a-z_]+)'/g)) ok(m[1] in EN_W, m[1] + ' is defined');
}

console.log(`test_cl_ui_well: ${checks} checks passed`);
