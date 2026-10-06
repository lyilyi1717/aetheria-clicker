// R9: talent point economy. S1 Milestone Stars, S2 Record Ascension, S3 Guild Rank, the removed
// +3 per Ascension and 20% bounty roll, and old saves keeping their points.
// Run: node test_talents.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { BuildingSystem } from './js/systems/BuildingSystem.js';
import { PrestigeSystem } from './js/systems/PrestigeSystem.js';
import { BountySystem, GUILD_CLAIM_BANK, GUILD_CLAIM_INTERVAL_MS } from './js/systems/BountySystem.js';
import { GardenSystem } from './js/systems/GardenSystem.js';
import { migrateSave, SAVE_VERSION } from './js/engine/migrations.js';
import {
  checkMilestones, recordAscensionDust, recordContractClaim, magnitudeStarsFor, guildRankFor,
  contractsForRank, getNextStars, STAR_DEFS
} from './js/systems/TalentSources.js';
import { particles } from './js/engine/ParticleEngine.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;

const make = () => {
  const gs = new GameState();
  const bs = new BuildingSystem(gs);
  const ps = new PrestigeSystem(gs);
  gs.buildingSystem = bs;
  gs.hero = { maxFloor: 1, floor: 1 };
  gs.miningGrid = { maxDepth: 1 };
  return { gs, bs, ps };
};
const earn = (gs, aether) => { gs.totalAetherEarned = new BigNum(aether); };

console.log('--- S1: first Ascension +2, and Ascension no longer pays a flat +3 ---');
{
  const { gs, ps } = make();
  earn(gs, 1e9);                       // 150 dust: below the first record star (1e4)
  assert.equal(ps.ascend(true), true);
  assert.equal(gs.talentPoints, 2, 'first Ascension star only');
  earn(gs, 1e9);
  ps.ascend(true);
  assert.equal(gs.talentPoints, 2, 'second Ascension pays nothing');
  assert.equal(gs.records.earned.stars, 2);
}

console.log('--- S1: depth, Tower zones, catalysts, harvests: one-off, no repeats ---');
{
  const { gs } = make();
  checkMilestones(gs);
  assert.equal(gs.talentPoints, 0);
  gs.miningGrid.maxDepth = 26;
  gs.hero.maxFloor = 51;
  gs.alchemy.catalysts = 10;
  checkMilestones(gs);
  assert.equal(gs.talentPoints, 3);
  checkMilestones(gs);
  assert.equal(gs.talentPoints, 3, 'polling again pays nothing');
  gs.miningGrid.maxDepth = 160;       // 51, 76, 101, 126, 151 on top of 26
  gs.hero.maxFloor = 1500;            // all six zones
  gs.alchemy.catalysts = 60;
  checkMilestones(gs);
  // depth 6 + floor 6 + catalysts 3
  assert.equal(gs.talentPoints, 15);
  const g = make();
  GardenSystem.prototype.harvestPlot.call({
    gameState: Object.assign(g.gs, { garden: { plots: [{ seed: 'frost_petal', stage: 'mature', progress: 1, maxTime: 1 }], essences: {}, inventory: {}, herbarium: {} } }),
    rng: () => 0.99
  }, 0, undefined, undefined, true);
  checkMilestones(g.gs);
  assert.equal(g.gs.talentPoints, 1, 'first Rose of Taif harvest');
  assert.equal(g.gs.records.harvested.frost_petal, true);
}

console.log('--- S2: Record Ascension = floor(log10(best run dust)) - 3, pays the difference ---');
{
  assert.equal(magnitudeStarsFor(new BigNum(9999)), 0);
  assert.equal(magnitudeStarsFor(new BigNum(1e4)), 1);
  assert.equal(magnitudeStarsFor(new BigNum(6e5)), 2);
  assert.equal(magnitudeStarsFor(new BigNum(1.6e7)), 4);
  assert.equal(magnitudeStarsFor(new BigNum(1e50)), 47);
  const { gs } = make();
  assert.equal(recordAscensionDust(gs, new BigNum(1e4)), 1);
  assert.equal(recordAscensionDust(gs, new BigNum(5e3)), 0, 'a lesser run pays nothing');
  assert.equal(recordAscensionDust(gs, new BigNum(1e4)), 0, 'matching the record pays nothing');
  assert.equal(recordAscensionDust(gs, new BigNum(2e6)), 2, 'jumping two orders pays both');
  assert.equal(gs.talentPoints, 3);
  assert.equal(gs.records.earned.record, 3);
  // Lifetime: Ascend and Transcend resets leave it alone
  const { gs: g2, ps } = make();
  earn(g2, 1e15);
  ps.ascend(true);
  const best = g2.records.bestRunDust;
  assert.ok(best.gt(0));
  g2.totalCosmicDust = new BigNum(1e12);
  ps.transcend();
  assert.ok(g2.records.bestRunDust.gte(best), 'record survives Transcend');
}

console.log('--- S1: Transcend pays 3 the first time, then 1 each (and no extra +3 from ascend) ---');
{
  const { gs, ps } = make();
  gs.records.stars.first_ascension = true; // isolate Transcend
  gs.ascensionCount = 1;
  gs.totalCosmicDust = new BigNum(1e9);
  earn(gs, 0);
  assert.equal(ps.transcend(), true);
  assert.equal(gs.talentPoints, 3, 'first Transcend: +3 total');
  gs.totalCosmicDust = ps.getTranscendGate();
  assert.equal(ps.transcend(), true);
  assert.equal(gs.talentPoints, 4, 'second Transcend: +1');
}

console.log('--- S3: Guild Rank curve, rewards, API for R10 ---');
{
  assert.equal(guildRankFor(7), 0);
  assert.equal(guildRankFor(8), 1);
  assert.equal(contractsForRank(1), 8);
  assert.equal(contractsForRank(5), 77);
  assert.equal(contractsForRank(10), 201);
  assert.equal(contractsForRank(40), 1400);
  for (let r = 1; r <= 45; r++) {
    assert.equal(guildRankFor(contractsForRank(r)), r, `rank ${r} reached at its threshold`);
    assert.equal(guildRankFor(contractsForRank(r) - 1), r - 1, `not before it (${r})`);
  }
  const { gs } = make();
  let r = recordContractClaim(gs, 7);
  assert.deepEqual([r.rank, r.ranksGained], [0, 0]);
  r = recordContractClaim(gs, 1);
  assert.deepEqual([r.rank, r.ranksGained], [1, 1]);
  assert.equal(gs.talentPoints, 1);
  assert.equal(gs.guildSeals, 5, '+5 Guild Seals per rank');
  r = recordContractClaim(gs, 1000);
  assert.equal(r.rank, guildRankFor(1008));
  assert.equal(gs.talentPoints, r.rank, '1 TP per rank, multi-rank jumps pay all');
  assert.equal(gs.records.earned.guild, r.rank);
}

console.log('--- Bounties: no random talent roll; stand-in claim pacing ---');
{
  const { gs } = make();
  const bs = new BountySystem(gs);
  for (let i = 0; i < 300; i++) assert.equal(bs.generateBounty().rewards.talentPoint, false);
  // 6 banked claims count at once, then one per 30 minutes
  let counted = 0;
  const t0 = 1e12;
  for (let i = 0; i < 10; i++) if (bs.consumeGuildClaim(t0)) counted++;
  assert.equal(counted, GUILD_CLAIM_BANK);
  assert.equal(bs.consumeGuildClaim(t0 + GUILD_CLAIM_INTERVAL_MS / 2), false);
  assert.equal(bs.consumeGuildClaim(t0 + GUILD_CLAIM_INTERVAL_MS), true);
  assert.equal(bs.consumeGuildClaim(t0 + GUILD_CLAIM_INTERVAL_MS), false);
  assert.equal(bs.consumeGuildClaim(t0 - 5e6), false, 'a clock set backwards does not refill the bucket');
  // A claim goes through claimBounty and counts
  const g2 = make().gs;
  const b2 = new BountySystem(g2);
  g2.bounties[0].completed = true;
  b2.claimBounty(g2.bounties[0].id);
  assert.equal(g2.records.contractsClaimed, 1);
  assert.equal(g2.talentPoints, 0, 'one claim is not a rank');
  // A contract generated before R9 with talentPoint: true still pays
  const g3 = make().gs;
  const b3 = new BountySystem(g3);
  g3.bounties[0].completed = true;
  g3.bounties[0].rewards.talentPoint = true;
  b3.claimBounty(g3.bounties[0].id);
  assert.equal(g3.talentPoints, 1);
}

console.log('--- Old saves: points kept, records seeded from the save, nothing re-awarded ---');
{
  const old = make();
  const gs = old.gs;
  gs.talentPoints = 7;
  gs.spentTalentPoints = 40;
  gs.ascensionCount = 12;
  gs.totalCosmicDust = new BigNum(3e6);
  gs.miningGrid.maxDepth = 60;
  gs.hero.maxFloor = 400;
  gs.alchemy.catalysts = 30;
  gs.stats.totalBountiesCompleted = 100;
  gs.transcendenceCount = 2;
  const data = JSON.parse(JSON.stringify(gs.serialize()));
  delete data.records;                  // a save written before R9
  data.version = SAVE_VERSION;
  const loaded = new GameState();
  loaded.deserialize(data);
  assert.equal(loaded.talentPoints, 7);
  assert.equal(loaded.spentTalentPoints, 40);
  const r = loaded.records;
  assert.ok(r.stars.first_ascension && r.stars.depth_51 && r.stars.floor_301 && r.stars.catalysts_25);
  assert.ok(!r.stars.depth_76 && !r.stars.floor_501 && !r.stars.catalysts_50);
  assert.equal(r.transcendPaid, 2);
  assert.equal(r.magnitudeStars, magnitudeStarsFor(new BigNum(3e6)));
  assert.equal(r.guildRank, guildRankFor(100));
  const before = loaded.talentPoints;
  checkMilestones(loaded);
  assert.equal(loaded.talentPoints, before, 'seeding grants nothing and polling grants nothing');
  // The next genuine milestone pays once
  loaded.miningGrid.maxDepth = 76;
  checkMilestones(loaded);
  assert.equal(loaded.talentPoints, before + 1);
  // Round trip keeps records and is stable
  const again = new GameState();
  again.deserialize(JSON.parse(JSON.stringify(loaded.serialize())));
  assert.deepEqual(JSON.parse(JSON.stringify(again.records)), JSON.parse(JSON.stringify(loaded.records)));
  assert.equal(again.talentPoints, before + 1);
  // R9 adds no migration step: version unchanged by this change
  assert.equal(migrateSave({ version: SAVE_VERSION }).version, SAVE_VERSION);
}

console.log('--- Header: next stars, nearest first, at most three ---');
{
  const { gs } = make();
  gs.miningGrid.maxDepth = 20;
  const next = getNextStars(gs, 3);
  assert.equal(next.length, 3);
  assert.equal(next[0].label, 'Depth 26');
  assert.ok(next[0].progress > next[2].progress || next[0].progress === next[2].progress);
  for (const n of next) assert.ok(n.progress >= 0 && n.progress <= 1);
  assert.ok(STAR_DEFS.length >= 19);
}

console.log('All talent economy tests passed.');
