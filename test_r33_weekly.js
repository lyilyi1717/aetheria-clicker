// R33: Weekly Ledger goals are sized to the player's own pace (about 4.5 typical days), so a week
// takes several sessions. Shows a mid-game goal set cannot be finished in one 1 h session but can
// in 5 days at 30 min/day; old in-progress weeks keep their goals until rollover; absence never
// moves targets. Run: node test_r33_weekly.js
import assert from 'node:assert/strict';
import { GameState } from './js/systems/GameState.js';
import { BountySystem } from './js/systems/BountySystem.js';
import {
  CalendarSystem, LEDGER_GOALS, LEDGER_GOAL_SEALS, LEDGER_LEGACY_SEALS, LEDGER_WEEK_DAYS, RATE_HISTORY_DAYS,
  ledgerTargetFor, roundTarget, sanitizeCalendarState
} from './js/systems/CalendarSystem.js';
import { particles } from './js/engine/ParticleEngine.js';
import { UNLOCKS } from './js/systems/UnlockSystem.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;
const clone = (o) => JSON.parse(JSON.stringify(o));
const DAY = 86400000;
const at = (m, d, h = 12) => new Date(2026, m - 1, d, h, 0, 0).getTime();
const MON = at(10, 5);                     // 2026-10-05 is a Monday
const def = (id) => LEDGER_GOALS.find(g => g.id === id);

// A mid-game player with every system open
function setup(start = MON) {
  let now = start;
  const gs = new GameState();
  gs.unlocks = Object.fromEntries(UNLOCKS.map(u => [u.tab, 1]));
  gs.bountySystem = new BountySystem(gs);
  gs.hero = { maxFloor: 300, floor: 300 };
  gs.miningGrid = { maxDepth: 40 };
  gs.garden = {}; gs.alchemy = { catalysts: 0 };
  gs.stats.totalSpellsCast = 500; gs.ascensionCount = 60;
  const cal = new CalendarSystem(gs, () => now);
  const notes = [];
  cal.notify = (ev) => notes.push(ev);
  return { gs, cal, notes, set: (t) => { now = t; } };
}

// Mid-game progress per minute of play, per goal stat (a made-up but plausible player)
const PER_MIN = {
  bosses: 0.2, fiends: 20, depths: 0.1, blocks: 10, harvest: 1, brew: 0.5,
  spells: 2, contracts: 0.3, ascend: 0.4, clicks: 60
};
function player(gs) {
  const acc = Object.fromEntries(Object.keys(PER_MIN).map(k => [k, 0]));
  const add = {
    bosses: k => { gs.stats.totalBossesSlain += k; }, fiends: k => { gs.stats.totalMonstersSlain += k; },
    depths: k => { gs.miningGrid.maxDepth += k; }, blocks: k => { gs.stats.totalBlocksMined += k; },
    harvest: k => { gs.stats.totalPlantsHarvested += k; }, brew: k => { gs.stats.totalPotionsBrewed += k; },
    spells: k => { gs.stats.totalSpellsCast += k; }, contracts: k => { gs.stats.totalBountiesCompleted += k; },
    ascend: k => { gs.ascensionCount += k; }, clicks: k => { gs.totalClicks += k; }
  };
  return (minutes) => {
    for (const [id, r] of Object.entries(PER_MIN)) {
      const before = Math.floor(acc[id]);
      acc[id] += r * minutes;
      add[id](Math.floor(acc[id]) - before);
    }
  };
}

console.log('--- R33: target formula ---');
{
  assert.equal(roundTarget(33.75), 34);
  assert.equal(roundTarget(2701), 2700);
  assert.equal(roundTarget(0), 0);
  const fiends = def('fiends');
  assert.equal(ledgerTargetFor(fiends, []), fiends.start, 'no history: the starting target');
  assert.equal(ledgerTargetFor(fiends, [600, 600]), fiends.start, 'two days is not enough history');
  assert.equal(ledgerTargetFor(fiends, [600, 600, 600]), 2700, '4.5 x a typical day');
  assert.equal(ledgerTargetFor(fiends, [600, 50000, 600, 0, 600]), 2700, 'the median ignores one binge or one idle day');
  assert.equal(ledgerTargetFor(fiends, [0, 0, 0]), fiends.legacy, 'never easier than the old flat target');
  assert.equal(ledgerTargetFor(def('depths'), [40, 40, 40]), def('depths').max, 'depth goals are capped');
  for (const g of LEDGER_GOALS) {
    assert.ok(g.start > g.legacy, `${g.id}: a new player's first weeks ask for more than before`);
    assert.equal(typeof g.label(g.start), 'string');
  }
}

console.log('--- R33: daily rate history: one sample per day seen ---');
{
  const { gs, cal, set } = setup();
  cal.tick();
  assert.deepEqual(cal.state.rates.hist, {}, 'the first day only takes a baseline');
  gs.totalClicks += 500; cal.tick();
  assert.deepEqual(cal.state.rates.hist, {}, 'same day: no sample');
  set(MON + DAY); cal.tick();
  assert.deepEqual(cal.state.rates.hist.clicks, [500]);
  set(MON + 4 * DAY); gs.totalClicks += 300; cal.tick();
  assert.deepEqual(cal.state.rates.hist.clicks, [500, 300], 'a 3-day break is one sample, not three empty days');
  set(MON + 2 * DAY); gs.totalClicks += 999; cal.tick();
  assert.deepEqual(cal.state.rates.hist.clicks, [500, 300], 'setting the clock back adds nothing');
  set(MON + 5 * DAY); gs.totalClicks = 10; cal.tick();
  assert.deepEqual(cal.state.rates.hist.clicks, [500, 300], 'a counter that went down is skipped');
  for (let d = 6; d < 20; d++) { set(MON + d * DAY); gs.totalClicks += d; cal.tick(); }
  assert.equal(cal.state.rates.hist.clicks.length, RATE_HISTORY_DAYS, 'keeps the last week of days seen');
  assert.equal(cal.state.rates.hist.clicks.at(-1), 19);
}

// Two weeks of 30-minute days, then the next Monday's Ledger
function midGame(minutesPerDay = 30) {
  const s = setup(at(9, 21));                // two weeks before MON
  const play = player(s.gs);
  for (let d = 0; d < 14; d++) {
    s.set(at(9, 21) + d * DAY); s.cal.tick();
    play(minutesPerDay); s.cal.tick();
  }
  s.set(MON); s.cal.tick();                  // Monday: the new week is drawn
  return { ...s, play };
}

console.log('--- R33: mid-game, 30 min/day: not in one 1 h session, yes in 5 days ---');
{
  // Every goal in the pool, not just this week's three
  const { cal } = midGame();
  for (const g of LEDGER_GOALS) {
    const t = cal.getGoalTarget(g.id);
    const day = PER_MIN[g.id] * 30;
    assert.ok(t > day * 2 || (g.max && t === g.max), `${g.id}: target ${t} is more than one 1 h session (${day * 2})`);
    assert.ok(t <= day * 5, `${g.id}: target ${t} fits in 5 days at 30 min (${day * 5})`);
    assert.ok(t >= day * LEDGER_WEEK_DAYS * 0.95, `${g.id}: about ${LEDGER_WEEK_DAYS} typical days`);
  }

  // Played out on this week's actual goal set
  const { gs, cal: c, play } = midGame();
  const seals0 = gs.guildSeals;
  assert.equal(c.getLedger().goals.length, 3);
  assert.ok(c.getLedger().goals.every(g => g.seals === LEDGER_GOAL_SEALS));
  play(60); c.tick();
  assert.equal(c.getLedger().goals.filter(g => g.done).length, 0, 'one 1 h session finishes nothing');
  // A 2 h binge on day one still leaves the week open
  const binge = midGame();
  binge.play(120); binge.cal.tick();
  assert.equal(binge.cal.getLedger().goals.filter(g => g.done).length, 0, 'nor does a 2 h session');
  // Starting over: 30 min a day from Monday to Friday
  const week = midGame();
  for (let d = 0; d < 5; d++) {
    week.set(MON + d * DAY); week.cal.tick();
    week.play(30); week.cal.tick();
    if (d < 3) assert.ok(!week.cal.getLedger().stamped, `not stamped after ${d + 1} days`);
  }
  assert.ok(week.cal.getLedger().stamped, 'all three done after 5 days at 30 min/day');
  assert.equal(week.gs.guildSeals - seals0 >= 3 * LEDGER_GOAL_SEALS, true);
  // Someone who plays 1 h a day gets proportionally bigger goals, still about 4.5 of their days
  const long = midGame(60);
  for (const g of LEDGER_GOALS) {
    if (g.max) continue;
    assert.ok(long.cal.getGoalTarget(g.id) > 1.8 * midGame().cal.getGoalTarget(g.id), `${g.id} scales with the player's pace`);
  }
}

console.log('--- R33: a week drawn before R33 keeps its goals and rewards until rollover ---');
{
  const src = new GameState();
  const data = clone(src.serialize());
  const week = Math.floor((Math.floor(Date.UTC(2026, 9, 5) / DAY) + 3) / 7);
  // The old shape: no target or seals on goals, no rates
  data.calendar = {
    daily: { lastDay: Math.floor(Date.UTC(2026, 9, 5) / DAY), bank: 0, visits: 3, claimedDays: 2 },
    weekly: { week, firstWeek: week - 1, goals: [{ id: 'clicks', base: 0, done: false }, { id: 'contracts', base: 0, done: false }, { id: 'fiends', base: 0, done: true }], stamps: [] },
    seals: {}
  };
  const gs = new GameState();
  gs.deserialize(data);
  let now = at(10, 7);
  const cal = new CalendarSystem(gs, () => now);
  cal.notify = () => {};
  gs.unlocks = Object.fromEntries(UNLOCKS.map(u => [u.tab, 1]));
  cal.tick();
  assert.deepEqual(cal.getLedger().goals.map(g => [g.id, g.target, g.seals]), [['clicks', 300, LEDGER_LEGACY_SEALS], ['contracts', 5, LEDGER_LEGACY_SEALS], ['fiends', 60, LEDGER_LEGACY_SEALS]]);
  assert.equal(cal.getLedger().goals[0].label, 'Click the Monolith 300 times');
  const seals0 = gs.guildSeals || 0;
  gs.totalClicks += 300; cal.tick();
  assert.equal(gs.guildSeals, seals0 + LEDGER_LEGACY_SEALS, 'the old goal finishes at its old target, for its old reward');
  const g2 = new GameState();
  g2.deserialize(clone(gs.serialize()));
  assert.deepEqual(g2.calendar.weekly.goals, gs.calendar.weekly.goals, 'save round-trip keeps targets');
  assert.deepEqual(g2.calendar.rates, gs.calendar.rates, 'and the rate history');
  now = at(10, 12, 0); cal.tick();
  assert.ok(cal.getLedger().goals.every(g => g.seals === LEDGER_GOAL_SEALS && g.target >= def(g.id).start), 'the next week uses the new targets');
}

console.log('--- R33: absence never punishes ---');
{
  const { gs, cal, set, play } = midGame();
  play(30); cal.tick();                    // a normal Monday, then a long break
  const before = LEDGER_GOALS.map(g => cal.getGoalTarget(g.id));
  set(MON + 21 * DAY); cal.tick();         // three weeks away
  assert.deepEqual(LEDGER_GOALS.map(g => cal.getGoalTarget(g.id)), before, 'days not seen leave the targets alone');
  assert.ok(cal.getLedger().goals.every(g => !g.done && g.have === 0));
  const seals = gs.guildSeals;
  set(MON + 28 * DAY); cal.tick();
  assert.equal(gs.guildSeals, seals, 'an unfinished week just expires');
}

console.log('--- R33: junk rates are cleaned ---');
{
  const s = sanitizeCalendarState({ rates: { day: 'x', snap: { clicks: '12', nope: 3, fiends: null }, hist: { clicks: [1, -2, 'a', 3], ascend: 'no', fake: [1] } } });
  assert.equal(s.rates.day, null);
  assert.deepEqual(s.rates.snap, { clicks: 12 });
  assert.deepEqual(s.rates.hist, { clicks: [1, 3] });
  assert.deepEqual(sanitizeCalendarState({ rates: [] }).rates, { day: null, snap: {}, hist: {} });
}

console.log('R33 weekly Ledger tests passed');
