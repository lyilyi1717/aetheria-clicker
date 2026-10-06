// R10: the bounty contract board. Wall-clock refill (no instant refill, banked while away, clock
// moved backwards), choosing and completing contracts, rewards, the Guild Rank (S3) call, reroll,
// save/load and legacy in-flight bounties. Time and randomness are injected.
// Run: node test_contracts.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import {
  BountySystem, BOUNTY_TEMPLATES, BOARD_SIZE, STARTER_CONTRACTS, CONTRACT_INTERVAL_MS, CLICK_RECENT_MS
} from './js/systems/BountySystem.js';
import { contractsForRank, guildRankFor } from './js/systems/TalentSources.js';
import { particles } from './js/engine/ParticleEngine.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;

const T0 = Date.now();   // BountySystem constructors read the real clock; keep the test clock next to it
const MIN = 60 * 1000;
const rng = (seed = 1) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const make = (now = T0, seed = 7) => {
  const gs = new GameState();
  gs.hero = { maxFloor: 1, floor: 1 };
  const bs = new BountySystem(gs);   // starts the board at the real clock; reset it to `now`
  bs.rng = rng(seed);
  gs.bounties = [];
  gs.contracts = null;
  bs.initBounties(now);
  return { gs, bs };
};
const finish = (bs, b) => { bs.checkProgress(b.type, b.required, T0); };

console.log('--- New board: 4 starters, next arrival one interval away, board cap 6 ---');
{
  const { gs, bs } = make();
  assert.equal(gs.bounties.length, STARTER_CONTRACTS);
  assert.equal(gs.contracts.nextAt, T0 + CONTRACT_INTERVAL_MS);
  assert.equal(CONTRACT_INTERVAL_MS, 30 * MIN);
  assert.equal(BOARD_SIZE, 6);
  assert.equal(bs.secondsToNext(T0), 1800);
  assert.equal(bs.update(T0 + 29 * MIN), 0, 'nothing before the interval');
  assert.equal(gs.bounties.length, 4);
}

console.log('--- Refill: one per 30 min, never instant, banked while away, capped at 6 ---');
{
  const { gs, bs } = make();
  assert.equal(bs.update(T0 + 30 * MIN), 1);
  assert.equal(gs.bounties.length, 5);
  assert.equal(bs.update(T0 + 30 * MIN + 1000), 0);
  assert.equal(bs.update(T0 + 60 * MIN), 1);
  assert.equal(gs.bounties.length, 6);
  assert.equal(bs.secondsToNext(T0 + 60 * MIN), null, 'full board: no timer');
  assert.equal(bs.update(T0 + 600 * MIN), 0, 'a full board never goes past the cap');

  // Claim from a full board: the slot stays empty until one interval after the claim
  const t = T0 + 600 * MIN;
  const b = gs.bounties[0];
  finish(bs, b);
  assert.equal(bs.claimBounty(b.id), true);
  assert.equal(gs.bounties.length, 5, 'no instant refill on claim');
  assert.equal(bs.update(t + 1000), 0);
  assert.equal(bs.update(t + 29 * MIN), 0);
  assert.equal(bs.update(t + 31 * MIN), 1);
  assert.equal(gs.bounties.length, 6);

  // Away for a day with 2 free slots: the board is full when the player returns
  const g2 = make();
  g2.gs.bounties.splice(0, 3);
  assert.equal(g2.gs.bounties.length, 1);
  assert.equal(g2.bs.update(T0 + 24 * 60 * MIN), 5);
  assert.equal(g2.gs.bounties.length, BOARD_SIZE);
  // Arrivals while away are not lost to a late first tick: 2 intervals pass, 2 arrive
  const g3 = make();
  g3.gs.bounties.splice(0, 3);
  assert.equal(g3.bs.update(T0 + 65 * MIN), 2);
}

console.log('--- Clock moved backwards: the timer is clamped, never frozen for hours ---');
{
  const { gs, bs } = make();
  gs.bounties.splice(0, 2);
  // the player set the clock back 5 hours (or it was set forward once and corrected)
  const back = T0 - 5 * 60 * MIN;
  assert.equal(bs.update(back), 0);
  assert.ok(gs.contracts.nextAt <= back + CONTRACT_INTERVAL_MS, 'nextAt never more than one interval ahead');
  assert.equal(bs.update(back + CONTRACT_INTERVAL_MS), 1, 'the next contract is at most 30 min away');
  // A forward jump does not exceed the cap
  gs.bounties.splice(0, gs.bounties.length);
  assert.equal(bs.update(back + 1e3 * 60 * MIN), BOARD_SIZE);
  // A corrupted timer is repaired
  gs.contracts.nextAt = NaN;
  bs.update(back);
  assert.ok(Number.isFinite(gs.contracts.nextAt));
}

console.log('--- Pacing ceiling: a player who claims everything at once gets about 48 a day ---');
{
  const { gs, bs } = make();
  let claimed = 0;
  for (let m = 0; m <= 24 * 60; m++) {
    const now = T0 + m * MIN;
    bs.update(now);
    for (const b of [...gs.bounties]) { finish(bs, b); if (bs.claimBounty(b.id)) claimed++; }
  }
  assert.ok(claimed >= 46 && claimed <= 4 + 48, `claims in 24 h: ${claimed}`);
  assert.equal(gs.stats.totalBountiesCompleted, claimed);
  assert.equal(gs.records.contractsClaimed, claimed, 'every claim counts toward Guild Rank');
}

console.log('--- Generation: size scales with rank and is capped, gold is 250*d*M, types follow unlocks ---');
{
  const { gs, bs } = make();
  gs.hero.indexFloor = 11;                 // Market Index 1.12^10
  const M = gs.getMarketIndex();
  for (let i = 0; i < 200; i++) {
    const b = bs.generateBounty(T0);
    const tmpl = BOUNTY_TEMPLATES.find(t => t.type === b.type);
    assert.ok(b.d >= 1 && b.d <= 3);
    assert.equal(b.required, Math.min(tmpl.cap, Math.round(tmpl.reqBase * b.d)));
    assert.ok(Math.abs(b.rewards.gold.toNumber() / (250 * b.d * M.toNumber()) - 1) < 1e-9);
    assert.equal(b.rewards.seals, b.d);
    assert.equal(b.rewards.chrono, 15 * b.d);
    assert.equal(b.rewards.talentPoint, false);
    assert.equal(b.rerolled, false);
  }
  gs.records.guildRank = 10;                 // x(1 + 0.15 * 10) = 2.5
  for (let i = 0; i < 200; i++) {
    const b = bs.generateBounty(T0);
    const tmpl = BOUNTY_TEMPLATES.find(t => t.type === b.type);
    assert.equal(b.required, Math.min(tmpl.cap, Math.round(tmpl.reqBase * b.d * 2.5)));
    assert.ok(b.required <= tmpl.cap);
  }
  gs.records.guildRank = 1000;
  for (let i = 0; i < 100; i++) {
    const b = bs.generateBounty(T0);
    assert.ok(b.required <= BOUNTY_TEMPLATES.find(t => t.type === b.type).cap, 'huge ranks stay capped');
  }
  // Locked tabs never roll
  gs.isTabUnlocked = (tab) => tab === 'monolith' || tab === 'combat';
  const seen = new Set();
  for (let i = 0; i < 300; i++) seen.add(bs.generateBounty(T0).tab);
  assert.deepEqual([...seen].sort(), ['combat', 'monolith']);
  delete gs.isTabUnlocked;
}

console.log('--- Click contracts only roll for a player who clicked in the last 5 minutes ---');
{
  const { gs, bs } = make();
  const seen = (now) => { const s = new Set(); for (let i = 0; i < 300; i++) s.add(bs.generateBounty(now).type); return s; };
  assert.ok([...seen(T0)].some(t => t === 'click'), 'fresh board: recent click');
  bs.checkProgress('click', 1, T0 + 10 * MIN);
  assert.ok([...seen(T0 + 12 * MIN)].some(t => t === 'click'), 'clicked 2 min ago');
  const stale = seen(T0 + 10 * MIN + CLICK_RECENT_MS + 1000);
  assert.ok(![...stale].some(t => t === 'click' || t === 'crit_click'), 'idle for 5 min: no click chores');
  assert.ok(stale.size >= 5);
  // Boards that refill while the player is away carry no click contracts
  const g2 = make();
  g2.gs.bounties.splice(0, g2.gs.bounties.length);
  g2.bs.update(T0 + 12 * 60 * MIN);
  assert.equal(g2.gs.bounties.length, BOARD_SIZE);
  assert.ok(g2.gs.bounties.every(b => b.type !== 'click' && b.type !== 'crit_click'));
}

console.log('--- Choice, completion and rewards ---');
{
  const { gs, bs } = make();
  gs.gold = BigNum.zero();
  gs.guildSeals = 0;
  const sand0 = gs.chronoSand;
  const [a, b] = gs.bounties;
  // progress goes to every matching contract; unrelated types do not move
  bs.checkProgress('nothing', 5);
  assert.equal(a.current, 0);
  bs.checkProgress(a.type, 1);
  assert.equal(a.current, 1);
  assert.equal(bs.claimBounty(a.id), false, 'unfinished contracts cannot be claimed');
  bs.checkProgress(a.type, a.required * 5);
  assert.equal(a.current, a.required, 'progress is clamped');
  assert.equal(a.completed, true);
  const sealsBefore = gs.guildSeals;
  assert.equal(bs.claimBounty(a.id), true);
  assert.equal(bs.claimBounty(a.id), false, 'a claim pays once');
  assert.ok(gs.gold.eq(a.rewards.gold));
  assert.equal(gs.guildSeals - sealsBefore, a.rewards.seals);
  assert.ok(gs.chronoSand > sand0 || gs.chronoSand === gs.getChronoSandCap());
  assert.equal(gs.stats.totalBountiesCompleted, 1);
  assert.equal(gs.bounties.length, 3);
  assert.ok(gs.bounties.includes(b) && !gs.bounties.includes(a), 'the others are untouched');
}

console.log('--- Guild Rank (S3): each claim calls recordContractClaim; rank-ups pay TP and Seals ---');
{
  const { gs, bs } = make();
  gs.talentPoints = 0;
  gs.guildSeals = 0;
  const need = contractsForRank(1);   // 8
  for (let i = 0; i < need; i++) {
    if (gs.bounties.length === 0) bs.update(gs.contracts.nextAt + 1);
    const b = gs.bounties[0];
    finish(bs, b);
    const before = gs.talentPoints;
    bs.claimBounty(b.id);
    if (i < need - 1) assert.equal(gs.talentPoints, before, 'no point before the rank');
    gs.contracts.nextAt = T0;   // let the next arrival come at once for this test
    bs.update(T0 + i * MIN + 1);
  }
  assert.equal(gs.records.contractsClaimed, need);
  assert.equal(gs.records.guildRank, 1);
  assert.equal(gs.talentPoints, 1);
  assert.ok(gs.guildSeals >= 5, '+5 Guild Seals for the rank');
  assert.equal(guildRankFor(gs.records.contractsClaimed), 1);
  assert.equal(gs.records.earned.guild, 1);
  // The R9 token bucket is gone
  assert.equal(bs.consumeGuildClaim, undefined);
  assert.equal(gs.records.contractBucket, null);
}

console.log('--- Reroll: one free per contract, in place, no refill, no timer change ---');
{
  const { gs, bs } = make();
  const [a] = gs.bounties;
  const next = gs.contracts.nextAt;
  assert.equal(bs.canReroll(a), true);
  assert.equal(bs.rerollBounty(a.id, T0), true);
  const fresh = gs.bounties[0];
  assert.notEqual(fresh.id, a.id);
  assert.notEqual(fresh.type, a.type, 'a reroll never hands the same task back');
  assert.equal(fresh.rerolled, true);
  assert.equal(gs.bounties.length, 4);
  assert.equal(gs.contracts.nextAt, next);
  assert.equal(bs.rerollBounty(fresh.id), false, 'only one free reroll per contract');
  assert.equal(bs.rerollBounty('nope'), false);
  // not once the player has started or finished it
  const b = gs.bounties[1];
  bs.checkProgress(b.type, 1);
  assert.equal(bs.rerollBounty(b.id), false, 'started contracts cannot be rerolled');
  const c = gs.bounties[2];
  finish(bs, c);
  assert.equal(bs.rerollBounty(c.id), false, 'finished contracts cannot be rerolled');
}

console.log('--- Save / load: board, progress and timer survive; nothing refills on load ---');
{
  const { gs, bs } = make();
  gs.bounties[0].current = 1;
  gs.bounties.push(bs.generateBounty(T0));        // 5 on the board, 1 free slot, timer at T0 + 30 min
  bs.rerollBounty(gs.bounties[1].id, T0);
  const json = JSON.parse(JSON.stringify(gs.serialize()));
  const g2 = new GameState();
  g2.deserialize(json);
  const b2 = new BountySystem(g2);
  b2.rng = rng(99);
  assert.equal(g2.bounties.length, 5, 'same board, no starters added');
  assert.deepEqual(g2.bounties.map(b => b.id), gs.bounties.map(b => b.id));
  assert.equal(g2.bounties[0].current, 1);
  assert.equal(g2.bounties[1].rerolled, true);
  assert.ok(g2.bounties[0].rewards.gold instanceof BigNum, 'gold is rehydrated');
  assert.ok(g2.bounties[0].rewards.gold.eq(gs.bounties[0].rewards.gold));
  assert.equal(g2.contracts.nextAt, gs.contracts.nextAt);
  assert.equal(b2.update(T0 + 20 * MIN), 0);
  assert.equal(b2.update(T0 + 31 * MIN), 1, 'the saved timer keeps running');
  // A save loaded after a long absence finds a full board (nothing was lost while away)
  const g3 = new GameState();
  g3.deserialize(JSON.parse(JSON.stringify(gs.serialize())));
  const b3 = new BountySystem(g3);
  b3.update(T0 + 3 * 24 * 60 * MIN);
  assert.equal(g3.bounties.length, BOARD_SIZE);
  // Claiming after a load works and pays the rehydrated gold
  g3.gold = BigNum.zero();
  const c = g3.bounties[0];
  b3.checkProgress(c.type, c.required);
  assert.equal(b3.claimBounty(c.id), true);
  assert.ok(g3.gold.eq(c.rewards.gold));
  // A save import replaces the state without a new BountySystem: update() repairs it
  g3.bounties = undefined;
  g3.contracts = { nextAt: 'x' };
  assert.doesNotThrow(() => b3.update(T0 + 3 * 24 * 60 * MIN));
  assert.ok(Array.isArray(g3.bounties));
}

console.log('--- Legacy in-flight bounties (saved before the board) load and stay claimable ---');
{
  const { gs } = make();
  const data = JSON.parse(JSON.stringify(gs.serialize()));
  delete data.contracts;                           // a save from before R10
  data.bounties = [
    { id: 'old_1', type: 'slay_monster', title: 'Purge the Catacombs', icon: '⚔️', desc: 'Slay dungeon monsters (12)',
      current: 12, required: 12, completed: true, claimed: false,
      rewards: { gold: { m: 5, e: 3 }, seals: 2, chrono: 30, talentPoint: true } },
    { id: 'old_2', type: 'click', title: 'Energize the Monolith', icon: '👆', desc: 'Perform manual clicks (100)',
      current: 40, required: 100, completed: false, claimed: false,
      rewards: { gold: { m: 1, e: 3 }, seals: 1, chrono: 15, talentPoint: false } }
  ];
  const loaded = new GameState();
  loaded.deserialize(data);
  loaded.talentPoints = 0;
  const bs = new BountySystem(loaded);
  bs.rng = rng(3);
  assert.equal(loaded.bounties.length, STARTER_CONTRACTS, 'kept both, topped up to the starter set');
  assert.equal(loaded.bounties[0].id, 'old_1');
  assert.equal(loaded.bounties[1].id, 'old_2');
  assert.ok(loaded.contracts.nextAt > Date.now(), 'timer starts one interval out');
  assert.equal(loaded.bounties[0].desc, 'Slay 12 dungeon monsters', 'old description shown as the one-line task');
  assert.equal(loaded.bounties[0].tab, 'combat');
  assert.equal(bs.canReroll(loaded.bounties[1]), false, 'a started legacy contract is not rerollable');
  // The finished legacy contract claims, pays its talent point and counts for Guild Rank
  loaded.gold = BigNum.zero();
  const before = loaded.records.contractsClaimed;
  assert.equal(bs.claimBounty('old_1'), true);
  assert.equal(loaded.talentPoints, 1, 'legacy talentPoint: true still pays');
  assert.equal(loaded.records.contractsClaimed, before + 1);
  assert.ok(loaded.gold.eq(new BigNum(5000)));
  // And the other one can still be finished
  bs.checkProgress('click', 60);
  assert.equal(loaded.bounties.find(b => b.id === 'old_2').completed, true);
  // Corrupted entries are dropped, not fatal
  const bad = JSON.parse(JSON.stringify(data));
  bad.bounties = [null, { id: 'x' }, { id: 'y', rewards: { gold: 1 }, required: 'abc' }];
  const g2 = new GameState();
  g2.deserialize(bad);
  const b2 = new BountySystem(g2);
  assert.equal(g2.bounties.length, STARTER_CONTRACTS);
  assert.ok(b2.update(Date.now()) >= 0);
}

console.log('All contract board tests passed.');
