// R15: Daily Dallah, Weekly Ledger, Souq Rotation, Seals. Injected clock, clock rollback,
// multi-day absence, "missing days never removes progress", Seal shard bonus through Transcend,
// save/load. Run: node test_calendar.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { BuildingSystem } from './js/systems/BuildingSystem.js';
import { BountySystem } from './js/systems/BountySystem.js';
import { PrestigeSystem, TRANSCEND_BASE_GATE, TRANSCEND_SHARDS } from './js/systems/PrestigeSystem.js';
import {
  CalendarSystem, SEALS, SOUQ_ROTATION, LEDGER_GOALS, COFFEE_BUFF_ID, dayIndexOf, weekIndexOf, nextMondayMs,
  defaultCalendarState, sanitizeCalendarState, DALLAH_SAND, DALLAH_BANK_MAX, LEDGER_GOAL_SEALS
} from './js/systems/CalendarSystem.js';
import { particles } from './js/engine/ParticleEngine.js';
import { UNLOCKS } from './js/systems/UnlockSystem.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;
const clone = (o) => JSON.parse(JSON.stringify(o));
const DAY = 86400000;

// Local-time stamps (the system uses the local calendar). 2026-10-05 is a Monday.
const at = (m, d, h = 12) => new Date(2026, m - 1, d, h, 0, 0).getTime();
const MON = at(10, 5);

// Grows the lifetime counter a Ledger goal reads by `k`
function bump(gs, id, k) {
  const add = {
    bosses: () => { gs.stats.totalBossesSlain += k; }, fiends: () => { gs.stats.totalMonstersSlain += k; },
    depths: () => { gs.miningGrid.maxDepth += k; }, blocks: () => { gs.stats.totalBlocksMined += k; },
    harvest: () => { gs.stats.totalPlantsHarvested += k; }, brew: () => { gs.stats.totalPotionsBrewed += k; },
    spells: () => { gs.stats.totalSpellsCast += k; }, contracts: () => { gs.stats.totalBountiesCompleted += k; },
    ascend: () => { gs.ascensionCount += k; }, clicks: () => { gs.totalClicks += k; }
  };
  add[id]();
}

function setup(start = MON) {
  let now = start;
  const gs = new GameState();
  gs.unlocks = Object.fromEntries(UNLOCKS.map(u => [u.tab, 1])); // the Dallah opens after Ascending (R7)
  gs.bountySystem = new BountySystem(gs);
  const cal = new CalendarSystem(gs, () => now);
  const notes = [];
  cal.notify = (ev) => notes.push(ev);
  return { gs, cal, notes, set: (t) => { now = t; } };
}

console.log('--- Calendar helpers: local days, Monday weeks ---');
{
  assert.equal(dayIndexOf(at(10, 6, 0)) - dayIndexOf(at(10, 5, 23)), 1, 'midnight starts a new day');
  assert.equal(weekIndexOf(at(10, 11, 23)), weekIndexOf(MON), 'Sunday is still the same week');
  assert.equal(weekIndexOf(at(10, 12, 0)), weekIndexOf(MON) + 1, 'Monday 00:00 rotates');
  assert.equal(nextMondayMs(MON), at(10, 12, 0));
  assert.equal(nextMondayMs(at(10, 11, 23)), at(10, 12, 0));
  assert.equal(nextMondayMs(at(10, 7)), at(10, 12, 0));
}

console.log('--- Daily Dallah: first visit, banking, no streak ---');
{
  const { gs, cal, set } = setup();
  assert.equal(cal.getDaily().canClaim, false, 'nothing before the first tick');
  cal.tick();
  assert.deepEqual([cal.getDaily().bank, cal.getDaily().visits], [1, 1], 'the first visit pours a cup');
  cal.tick(); set(at(10, 5, 23)); cal.tick();
  assert.equal(cal.getDaily().bank, 1, 'same calendar day: still one');
  set(at(10, 6, 0)); cal.tick();
  assert.deepEqual([cal.getDaily().bank, cal.getDaily().visits], [2, 2]);
  set(at(10, 7)); cal.tick();
  set(at(10, 8)); cal.tick();
  assert.equal(cal.getDaily().bank, DALLAH_BANK_MAX, 'banks 3 days at most');
  assert.equal(cal.getDaily().visits, 4);
  assert.equal(cal.getDaily().claimedDays, 0);
  gs.chronoSand = 0;
  const r = cal.claimDaily();
  assert.equal(r.days, 3);
  const want = Math.floor(DALLAH_SAND * 3 * cal.getSandGainMult());   // Hourglass Week pays x1.5
  assert.equal(r.sand, want);
  assert.equal(gs.chronoSand, want);
  assert.equal(r.contracts, 3, 'one bonus contract per day claimed');
  assert.equal(gs.bounties.filter(b => b.bonus && b.completed && !b.claimed).length, 3);
  assert.equal(cal.claimDaily(), null, 'nothing left to claim the same day');
  assert.equal(gs.chronoSand, want, 'a refused claim pays nothing');
  assert.equal(cal.getDaily().claimedDays, 3);
}

console.log('--- Daily Dallah: fresh coffee is +25% Aether for 1 h and survives the 10-min buff cap ---');
{
  const { gs, cal } = setup();
  cal.tick();
  cal.claimDaily();
  const b = gs.activeBuffs.find(x => x.id === COFFEE_BUFF_ID);
  assert.ok(b && b.type === 'aether_mult' && b.value === 1.25 && b.duration === 3600);
  assert.equal(gs.getAetherBuffMult(), 1.25);
  gs.clampLoadedTimers();
  assert.equal(gs.activeBuffs.find(x => x.id === COFFEE_BUFF_ID).duration, 3600, 'not cut to 10 min');
  const gs2 = new GameState();
  gs2.deserialize(clone(gs.serialize()));
  assert.equal(gs2.activeBuffs.find(x => x.id === COFFEE_BUFF_ID).duration, 3600, 'and not after a reload');
  cal.giveCoffee();
  assert.equal(gs.activeBuffs.filter(x => x.id === COFFEE_BUFF_ID).length, 1, 'refreshes, never stacks');
  assert.equal(gs.getAetherBuffMult(), 1.25);
}

console.log('--- Bonus contract is an extra: claiming it does not refill the board ---');
{
  const { gs, cal } = setup();
  cal.tick(); cal.claimDaily();
  const before = gs.bounties.length;
  const bonus = gs.bounties.find(b => b.bonus);
  const seals = gs.guildSeals;
  assert.equal(gs.bountySystem.claimBounty(bonus.id), true);
  assert.equal(gs.bounties.length, before - 1);
  assert.equal(gs.bounties.length, 4, 'the normal board of 4 is untouched');
  assert.ok(gs.guildSeals > seals);
}

console.log('--- Missing days never removes progress ---');
{
  const { gs, cal, set } = setup();
  cal.tick(); cal.claimDaily();
  gs.guildSeals = 40;
  gs.alchemy = { catalysts: 30 };
  cal.tick();
  assert.equal(cal.isSealLit('oasis'), true);
  cal.state.weekly.stamps.push(1, 2);
  const sand = gs.chronoSand, visits = cal.getDaily().visits, claimed = cal.getDaily().claimedDays;
  set(at(12, 25)); cal.tick();                         // away for about 11 weeks
  assert.equal(gs.chronoSand, sand);
  assert.equal(gs.guildSeals, 40);
  assert.equal(cal.isSealLit('oasis'), true, 'a lit Seal never goes dark');
  assert.deepEqual(cal.state.weekly.stamps, [1, 2], 'stamps are kept');
  assert.equal(cal.getDaily().claimedDays, claimed);
  assert.equal(cal.getDaily().visits, visits + 1, 'visits count days seen, not days elapsed (no streak to break)');
  assert.equal(cal.getDaily().bank, 3, 'coming back always has cups waiting (up to 3)');
}

console.log('--- Multi-day absence: bank caps at 3, weeks just rotate ---');
{
  const { cal, set } = setup();
  cal.tick();
  const w0 = cal.getWeekNumber();
  set(MON + 20 * DAY); cal.tick();
  assert.equal(cal.getDaily().bank, 3);
  assert.equal(cal.getDaily().visits, 2);
  assert.equal(cal.getWeekNumber(), w0 + 2, 'the Ledger shows the current week, numbered by calendar weeks');
  assert.equal(cal.getLedger().goals.length, 3, 'a fresh Ledger is waiting');
}

console.log('--- Clock rollback: no second payout, nothing lost, no stuck state ---');
{
  const { cal, set } = setup();
  cal.tick(); cal.claimDaily();
  set(at(10, 8)); cal.tick();
  const bank = cal.getDaily().bank;
  assert.equal(bank, 3);
  const week = cal.getWeekNumber();
  const goals = JSON.stringify(cal.state.weekly.goals);
  const souq = cal.getSouq().id;
  set(at(9, 20)); cal.tick();                           // clock set back
  assert.equal(cal.getDaily().bank, bank, 'going back banks nothing');
  assert.equal(cal.getDaily().visits, 2);
  assert.equal(cal.getWeekNumber(), week, 'and does not move the Ledger back');
  assert.equal(JSON.stringify(cal.state.weekly.goals), goals);
  assert.equal(cal.getSouq().id, souq, 'Souq follows the high-water week');
  assert.equal(cal.claimDaily().days, 3);
  set(at(9, 21)); cal.tick();
  assert.equal(cal.claimDaily(), null, 'claimed days cannot be claimed again by replaying old dates');
  set(at(10, 8, 20)); cal.tick();
  assert.equal(cal.getDaily().bank, 0, 'returning to the high-water day pays nothing twice');
  set(at(10, 9)); cal.tick();
  assert.equal(cal.getDaily().bank, 1, 'the next real day pays as usual');
}

console.log('--- Weekly Ledger: 3 distinct goals, same for a week, rotates Monday ---');
{
  const a = setup(), b = setup(MON + 3 * DAY);
  a.gs.hero = { maxFloor: 50, floor: 50 }; b.gs.hero = { maxFloor: 50, floor: 50 };
  a.cal.tick(); b.cal.tick();
  const ids = a.cal.state.weekly.goals.map(g => g.id);
  assert.equal(ids.length, 3);
  assert.equal(new Set(ids).size, 3);
  assert.deepEqual(b.cal.state.weekly.goals.map(g => g.id), ids, 'same week, same goals on any day or device');
  a.set(at(10, 11, 23)); a.cal.tick();
  assert.deepEqual(a.cal.state.weekly.goals.map(g => g.id), ids, 'Sunday night is still this week');
  a.set(at(10, 12, 0)); a.cal.tick();
  assert.equal(a.cal.getLedger().number, 2);
  assert.ok(a.cal.state.weekly.goals.every(g => !g.done));
  // Goals only appear once the system they ask about exists
  const fresh = setup();
  fresh.gs.hero = null; fresh.gs.miningGrid = null; fresh.gs.garden = null; fresh.gs.alchemy = null;
  fresh.cal.tick();
  const f = fresh.cal.state.weekly.goals.map(g => g.id);
  assert.equal(f.length, 3, 'even a brand new game gets 3 goals');
  assert.ok(f.every(id => ['contracts', 'clicks', 'fiends', 'ascend', 'spells'].includes(id)), `got ${f}`);
}

console.log('--- Weekly Ledger: progress is growth this week; goals pay Guild Seals once; stamp for all 3 ---');
{
  const { gs, cal, notes } = setup();
  gs.hero = { maxFloor: 50, floor: 50 };
  gs.miningGrid = { maxDepth: 5 };
  gs.garden = {}; gs.alchemy = { catalysts: 0 };
  gs.stats.totalBossesSlain = 100;                      // old progress must not count
  cal.tick();
  const goals = cal.getLedger().goals;
  assert.ok(goals.every(g => g.have === 0), 'lifetime totals from before the week do not count');
  const seals0 = gs.guildSeals;
  const grow = (g) => {
    assert.ok(LEDGER_GOALS.some(d => d.id === g.id));
    bump(gs, g.id, g.target);
  };
  grow(goals[0]); cal.tick();
  assert.equal(gs.guildSeals, seals0 + LEDGER_GOAL_SEALS);
  cal.tick(); cal.tick();
  assert.equal(gs.guildSeals, seals0 + LEDGER_GOAL_SEALS, 'a goal pays once');
  assert.equal(cal.getLedger().stamped, false);
  grow(goals[1]); grow(goals[2]); cal.tick();
  assert.equal(gs.guildSeals, seals0 + 3 * LEDGER_GOAL_SEALS);
  assert.equal(cal.getLedger().stamped, true);
  assert.deepEqual(cal.state.weekly.stamps, [1]);
  assert.ok(notes.some(n => n.kind === 'ledger-stamp'));
  cal.tick();
  assert.deepEqual(cal.state.weekly.stamps, [1], 'one stamp per week');
  // a half-done week that is never finished costs nothing
  const { gs: g2, cal: c2, set } = setup();
  g2.hero = { maxFloor: 50 }; c2.tick();
  g2.guildSeals = 7;
  set(at(10, 26)); c2.tick();
  assert.equal(g2.guildSeals, 7);
}

console.log('--- Souq Rotation: one positive modifier a week, cycling, always returns ---');
{
  const { cal, set } = setup();
  const seen = [];
  const n = SOUQ_ROTATION.length;
  for (let w = 0; w < n * 2; w++) {
    set(MON + w * 7 * DAY); cal.tick();
    seen.push(cal.getSouq().id);
  }
  assert.equal(new Set(seen.slice(0, n)).size, n, 'every modifier comes up once per cycle');
  assert.deepEqual(seen.slice(n), seen.slice(0, n), 'and each one returns');
  // Roll the clock forward to the week a given modifier is active (weeks only ever advance)
  let w = n * 2;
  const goTo = (id) => {
    for (let i = 0; i < n; i++, w++) {
      set(MON + w * 7 * DAY); cal.tick();
      if (cal.getSouq().id === id) return;
    }
    throw new Error(`no ${id}`);
  };
  goTo('truffle');
  assert.equal(cal.getGardenGrowthMult('solar_fern'), 1.5);
  assert.equal(cal.getGardenGrowthMult('spore'), 1);
  assert.equal(cal.getBossGoldMult(), 1);
  assert.equal(cal.getSandGainMult(), 1);
  goTo('falcon');
  assert.equal(cal.getBossGoldMult(), 1.5);
  assert.equal(cal.getGardenGrowthMult('solar_fern'), 1);
  goTo('hourglass');
  assert.equal(cal.gameState.getChronoSandGainMult(), 1.5);
  cal.gameState.chronoSand = 0;
  assert.equal(cal.gameState.addChronoSand(60), 90);
  goTo('rosewater');
  assert.equal(cal.getGardenGrowthMult('spore'), 1.25);
  assert.equal(cal.getGardenGrowthMult('solar_fern'), 1.25);
  for (const m of SOUQ_ROTATION) assert.ok(m.desc && m.name && m.icon);
}

console.log('--- Seals: lit by progress, never go dark ---');
{
  const { gs, cal, notes } = setup();
  cal.tick();
  assert.equal(cal.getLitSealCount(), 0);
  gs.miningGrid = { maxDepth: 99 };
  cal.updateSeals();
  assert.equal(cal.isSealLit('deep'), false);
  gs.miningGrid.maxDepth = 100;
  gs.alchemy = { catalysts: 25 };
  gs.ascensionCount = 15;
  gs.hero = { maxFloor: 501 };
  gs.records.guildRank = 7;
  gs.records.bestRunDust = new BigNum(500);
  gs.collectionSystem = { getCodexPercent: () => 40 };
  const lit = cal.updateSeals();
  assert.equal(lit.length, SEALS.length, 'all seven light at their tier I bar');
  assert.equal(notes.filter(n => n.kind === 'seal-lit').length, 7);
  gs.miningGrid.maxDepth = 0; gs.alchemy.catalysts = 0; gs.ascensionCount = 0; gs.collectionSystem = null;
  cal.updateSeals();
  assert.equal(cal.getLitSealCount(), 7, 'progress that later drops (resets) never darkens a Seal');
  assert.ok(cal.getSeals().every(s => s.lit && s.pct === 1));
  const gs2 = new GameState();
  gs2.deserialize(clone(gs.serialize()));
  assert.equal(Object.keys(gs2.calendar.seals).length, 7, 'lit Seals are saved');
}

console.log('--- Seals feed shards: +1 per lit Seal, max +3, spendable only (never the multiplier) ---');
{
  const make = (lit) => {
    const { gs, cal } = setup();
    const ps = new PrestigeSystem(gs);
    gs.buildingSystem = new BuildingSystem(gs);
    SEALS.slice(0, lit).forEach(s => { cal.state.seals[s.id] = true; });
    gs.totalCosmicDust = new BigNum(TRANSCEND_BASE_GATE);
    return { gs, ps };
  };
  for (const [lit, bonus] of [[0, 0], [1, 1], [3, 3], [5, 3], [7, 3]]) {
    const { gs, ps } = make(lit);
    const tp = ps.getTranscendPreview();
    assert.equal(tp.shardsGained, TRANSCEND_SHARDS, 'the preview base stays 2');
    assert.equal(tp.sealShards, bonus);
    assert.equal(tp.shardsAfter, TRANSCEND_SHARDS, 'the multiplier count excludes Seal shards');
    assert.equal(ps.transcend(), true);
    assert.equal(gs.fractureShards.toNumber(), TRANSCEND_SHARDS + bonus, `${lit} lit: spendable`);
    assert.equal(gs.totalFractureShards.toNumber(), TRANSCEND_SHARDS, `${lit} lit: lifetime (the multiplier) stays +2`);
    assert.equal(gs.getShardCount(), TRANSCEND_SHARDS);
    assert.ok(gs.getShardAetherMult().eq(new BigNum(1 + 0.25 * 2)), '+25% per base shard only');
    // the balance may exceed the lifetime count; a save round trip must not "fix" that
    const gs2 = new GameState();
    gs2.deserialize(clone(gs.serialize()));
    assert.equal(gs2.fractureShards.toNumber(), TRANSCEND_SHARDS + bonus);
    assert.equal(gs2.totalFractureShards.toNumber(), TRANSCEND_SHARDS);
  }
  // no calendar attached: plain 2 on both
  const gs = new GameState(); gs.buildingSystem = new BuildingSystem(gs);
  const ps = new PrestigeSystem(gs);
  gs.totalCosmicDust = new BigNum(TRANSCEND_BASE_GATE);
  assert.equal(ps.getTranscendPreview().sealShards, 0);
  // A Seal met right now counts at the moment of Transcend, without waiting for a tick
  const m = make(0);
  m.gs.alchemy = { catalysts: 25 };
  assert.equal(m.ps.getTranscendPreview().sealShards, 1);
}

console.log('--- Saves: old saves load with an empty calendar; junk is cleaned ---');
{
  const save = clone(new GameState().serialize());
  delete save.calendar;
  const gs2 = new GameState();
  gs2.deserialize(save);
  assert.deepEqual(gs2.calendar, defaultCalendarState());
  const cal = new CalendarSystem(gs2, () => MON);
  cal.tick();
  assert.equal(cal.getDaily().bank, 1);

  const bad = sanitizeCalendarState({
    daily: { lastDay: 'x', bank: 99, visits: -4 },
    weekly: { week: 'q', goals: [{ id: 'nope' }, { id: 'clicks', base: 'z', done: 1 }], stamps: [3, 3, 'a', 0] },
    seals: { deep: true, fake: true, tower: 1 }
  });
  assert.equal(bad.daily.lastDay, null);
  assert.equal(bad.daily.bank, DALLAH_BANK_MAX);
  assert.equal(bad.daily.visits, 0);
  assert.equal(bad.weekly.week, null);
  assert.deepEqual(bad.weekly.goals, [{ id: 'clicks', base: 0, done: false, target: 300, seals: 6 }], 'a goal with no target is a pre-R33 goal');
  assert.deepEqual(bad.weekly.stamps, [3]);
  assert.deepEqual(bad.seals, { deep: true });
  assert.deepEqual(sanitizeCalendarState(null), defaultCalendarState());
  assert.deepEqual(sanitizeCalendarState(clone(defaultCalendarState())), defaultCalendarState(), 'a fresh calendar survives a save (null stays null)');

  const g = new GameState();
  const c = new CalendarSystem(g, () => MON);
  g.hero = { maxFloor: 50 };
  c.tick(); c.claimDaily();
  const g3 = new GameState();
  g3.deserialize(clone(g.serialize()));
  assert.deepEqual(g3.calendar, g.calendar);
}

console.log('R15 calendar tests passed');

console.log('--- R15: a save missing totalFractureShards falls back to the balance ---');
{
  const { GameState } = await import('./js/systems/GameState.js');
  const src = new GameState();
  const data = JSON.parse(JSON.stringify(src.serialize()));
  data.fractureShards = { m: 6, e: 0 };
  delete data.totalFractureShards;
  const gs = new GameState();
  gs.deserialize(data);
  if (gs.totalFractureShards.toNumber() !== 6) throw new Error(`expected 6 lifetime shards, got ${gs.totalFractureShards.toNumber()}`);
  console.log('ok');
}
