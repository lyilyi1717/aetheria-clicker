// R56: challenge rewards (permanent, additive, paid once on the first clear) and Chapter 2.
// Run: node test_r56_challenge_rewards.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { BuildingSystem } from './js/systems/BuildingSystem.js';
import { PrestigeSystem } from './js/systems/PrestigeSystem.js';
import { MiningSystem } from './js/systems/MiningSystem.js';
import { SaveManager } from './js/engine/SaveManager.js';
import {
  ChronicleSystem, CHAPTERS, REWARD_KINDS, chronicleClock, validateChapters, getChallenge,
  getChallengeRewardTotal, getChallengeAetherBonus, getPageAetherMult, pageAetherMultFor, getPendingPages,
  describeReward, sanitizeChronicleState, takeRewardBackfill, MARGIN_NOTES_PER_CLEAR
} from './js/systems/ChronicleSystem.js';
import { particles } from './js/engine/ParticleEngine.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;
const clone = (o) => JSON.parse(JSON.stringify(o));
const T0 = Date.UTC(2026, 5, 1);
let now = T0;
chronicleClock.now = () => now;

const make = () => {
  const gs = new GameState();
  const bs = new BuildingSystem(gs);
  const ps = new PrestigeSystem(gs);
  gs.buildingSystem = bs;
  gs.prestigeSystem = ps;
  const cs = new ChronicleSystem(gs, ps);
  // In Chapter 2 (so every challenge is open), past the first Chronicle
  gs.chronicle.count = 1;
  gs.chronicle.chapter = { id: 'salt', startedAt: now };
  return { gs, bs, ps, cs };
};
// Starts a challenge and meets its goal
const clear = (cs, gs, id) => {
  assert.equal(cs.startChallenge(id, now), true, `start ${id}`);
  gs.totalAetherEarned = new BigNum(getChallenge(id).goal.runAether);
  return cs.checkChallenge(now + 60000);
};
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

console.log('--- Data: two Chapters of four challenges, every challenge has a modest reward ---');
{
  assert.deepEqual(validateChapters(), []);
  assert.deepEqual(CHAPTERS.map(c => c.id), ['sand', 'salt']);
  for (const ch of CHAPTERS) {
    assert.equal(ch.challenges.length, 4);
    for (const c of ch.challenges) {
      assert.ok(REWARD_KINDS[c.reward.kind], `${c.id} reward kind`);
      assert.ok(describeReward(c.reward).length > 0, `${c.id} reward text`);
    }
  }
  // Chapter 2's stamp pays no Pages: the core sim reaches it and must not move
  assert.equal(CHAPTERS[1].stampPages, 0);
  // Every Oil reward together stays modest
  const oil = CHAPTERS.flatMap(c => c.challenges).filter(c => c.reward.kind === 'oil').reduce((a, c) => a + c.reward.value, 0);
  assert.ok(oil <= 0.5, `all Oil rewards together: +${oil * 100}%`);
  const bad = clone(CHAPTERS);
  bad[1].challenges[0].reward = { kind: 'bogus', value: 1 };
  bad[1].challenges[1].reward = { kind: 'oil', value: 3 };
  bad[1].challenges[2].reward = { kind: 'pages', value: 0.5 };
  const errs = validateChapters(bad);
  assert.equal(errs.filter(e => e.includes('reward')).length, 3, errs.join('\n'));
  assert.equal(describeReward({ kind: 'oil', value: 0.1 }), '+10% Oil');
}

console.log('--- No clears: nothing changes (the core sim plays no challenges) ---');
{
  const { gs } = make();
  for (const k of Object.keys(REWARD_KINDS)) assert.equal(getChallengeRewardTotal(gs, k), 0);
  gs.chronicle.totalPages = 7;
  assert.equal(getPageAetherMult(gs).toNumber(), pageAetherMultFor(7).toNumber());
}

console.log('--- First clear pays and records the reward; a replay does not pay again ---');
{
  const { gs, cs } = make();
  const res = clear(cs, gs, 'sand_dry_well');
  assert.equal(res.first, true);
  assert.deepEqual(res.reward, { kind: 'oil', value: 0.1 });
  assert.equal(gs.chronicle.rewards.sand_dry_well, true);
  near(getChallengeRewardTotal(gs, 'oil'), 0.1, 'oil after one clear');
  const again = clear(cs, gs, 'sand_dry_well');
  assert.equal(again.first, false);
  assert.equal(again.reward, null, 'paid once');
  near(getChallengeRewardTotal(gs, 'oil'), 0.1, 'still +10%');
}

console.log('--- Oil rewards add into the challenge category with Margin Notes (no compounding) ---');
{
  const { gs, cs } = make();
  gs.chronicle.totalPages = 10;
  clear(cs, gs, 'sand_dry_well');      // +10%
  clear(cs, gs, 'salt_dark_flats');    // +10%
  near(getChallengeAetherBonus(gs), 0.2, 'two Oil rewards');
  near(getPageAetherMult(gs).toNumber(), pageAetherMultFor(gs.chronicle.totalPages).toNumber() * 1.2, 'x(1 + 0.2)');
  gs.chronicle.upgrades.margin_notes = true;
  near(getChallengeAetherBonus(gs), 0.2 + 2 * MARGIN_NOTES_PER_CLEAR, 'Margin Notes adds to the same sum');
  near(getPageAetherMult(gs).toNumber(), pageAetherMultFor(gs.chronicle.totalPages).toNumber() * (1.2 + 2 * MARGIN_NOTES_PER_CLEAR), 'one factor');
  // Production follows the one factor
  gs.buildings.tapper.count = 10;
  const withBonus = gs.getNetAetherPerSecond().toNumber();
  gs.chronicle.rewards = {};
  gs.chronicle.upgrades = {};
  near(withBonus / gs.getNetAetherPerSecond().toNumber(), 1 + 0.2 + 2 * MARGIN_NOTES_PER_CLEAR, 'Oil/s x(1 + rewards + Margin Notes)');
}

console.log('--- Offline, start generators, Pages, dig ---');
{
  const { gs, cs, ps } = make();
  clear(cs, gs, 'sand_lights_out');    // +10% offline
  clear(cs, gs, 'salt_dark_flats');    // opens Narrow Caravan
  clear(cs, gs, 'salt_caravan');       // +10% offline
  near(getChallengeRewardTotal(gs, 'offline'), 0.2, 'offline adds');
  // Offline payout: efficiency 1 + 0.2
  gs.buildings.tapper.count = 5;
  const rate = gs.getNetAetherPerSecond();
  gs.aether = BigNum.zero();
  const res = new SaveManager(gs).processOfflineTime(Date.now() - 3600 * 1000);
  near(res.efficiency, 1.2, 'offline efficiency');
  assert.ok(Math.abs(res.gainedAether.div(rate).toNumber() - 3600 * 1.2) < 2, 'one hour pays 1.2 h');

  // Start generators: the restored run is topped up, and every Ascension starts with them
  gs.buildings.tapper.count = 3;
  const r = clear(cs, gs, 'sand_small_souq');
  assert.equal(r.reward.kind, 'startGen');
  assert.equal(gs.buildings.tapper.count, 10, 'restored run topped up to 10');
  gs.totalAetherEarned = new BigNum(1e9);
  gs.runStartedAt = 0;
  assert.equal(ps.ascend(true, { quiet: true }), true);
  assert.equal(gs.buildings.tapper.count, 10, 'a fresh run starts with 10');
  assert.equal(gs.buildings.resonator.count, 0);

  // +1 Page per Chronicle
  gs.transcendenceCount = 6;
  const before = getPendingPages(gs);
  clear(cs, gs, 'sand_dry_well');      // third Sand clear opens Sandstorm
  const before2 = getPendingPages(gs);
  assert.equal(before2, before, 'an Oil reward pays no Pages');
  clear(cs, gs, 'sand_sandstorm');
  assert.equal(getPendingPages(gs), before + 1);

  // Dig: +25% pickaxe power
  const ms = new MiningSystem(gs);
  gs.miningGrid.pickaxeTier = 4;
  const base = ms.getPickaxePower();
  clear(cs, gs, 'salt_still_water');
  assert.equal(ms.getPickaxePower(), Math.floor(base * 1.25));
}

console.log('--- Old save: clears from before rewards get them once on load ---');
{
  const { gs } = make();
  const data = clone(gs.serialize());
  data.chronicle.challenges = {
    sand_dry_well: { done: true, best: 300, clears: 2 },
    sand_small_souq: { done: true, best: 200, clears: 1 },
    sand_lights_out: { done: false, best: null, clears: 0 }
  };
  delete data.chronicle.rewards;       // shape before R56
  takeRewardBackfill();
  const gs2 = new GameState();
  gs2.deserialize(clone(data));
  assert.deepEqual(gs2.chronicle.rewards, { sand_dry_well: true, sand_small_souq: true });
  assert.deepEqual(takeRewardBackfill().sort(), ['sand_dry_well', 'sand_small_souq'], 'queued for one toast');
  assert.deepEqual(takeRewardBackfill(), [], 'taken once');
  near(getChallengeRewardTotal(gs2, 'oil'), 0.1, 'old clear pays');
  // Saved and loaded again: nothing new to backfill, nothing paid twice
  const gs3 = new GameState();
  gs3.deserialize(clone(gs2.serialize()));
  assert.deepEqual(takeRewardBackfill(), []);
  assert.deepEqual(gs3.chronicle.rewards, gs2.chronicle.rewards);
  // Edited or stale entries are dropped
  const s = sanitizeChronicleState({ rewards: { nope: true, sand_dry_well: 'yes', salt_dead_sea: true } });
  assert.deepEqual(s.rewards, { salt_dead_sea: true });
  takeRewardBackfill();
}

console.log('All R56 challenge reward tests passed.');
