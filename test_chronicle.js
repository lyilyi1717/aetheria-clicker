// R20: Chronicle layer (design doc §4, §6.6). Gate (12 Transcends + the Seal set I stand-in),
// Page payout and multiplier, what a Chronicle resets and keeps, Page upgrades, Chapter data
// validation and turnover, the challenge runner (overrides apply, then fully revert, including
// across save/load and a reload mid-challenge), and BigNum finiteness at extreme values.
// Run: node test_chronicle.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { BuildingSystem, getUnlockedTierCount, MAX_TIER_COUNT } from './js/systems/BuildingSystem.js';
import { PrestigeSystem } from './js/systems/PrestigeSystem.js';
import { ClickerSystem } from './js/systems/ClickerSystem.js';
import { SpellSystem } from './js/systems/SpellSystem.js';
import { ShardTreeSystem } from './js/systems/ShardTreeSystem.js';
import { checkMilestones } from './js/systems/TalentSources.js';
import { UPGRADE_DEFINITIONS } from './js/systems/UpgradeSystem.js';
import { CalendarSystem, SEALS } from './js/systems/CalendarSystem.js';
import {
  ChronicleSystem, CHAPTERS, PAGE_UPGRADES, NO_RULES, RULE_KEYS, chronicleClock,
  CHRONICLE_TRANSCEND_GATE, SEAL_STANDIN_TRANSCENDS, CHRONICLE_BASE_PAGES, PAGE_AETHER_MULT, INK_SHARDS,
  GILDED_EXTRA_PAGES, MARGIN_NOTES_PER_CLEAR, CHRONICLE_RESETS, CHRONICLE_KEEPS,
  getActiveRules, getPendingPages, getSealGate, getChronicleBlockReason, getLifetimeTranscends,
  getPageAetherMult, getChapterStatus, validateChapters, sanitizeChronicleState, defaultChronicleState,
  getChallenge, describeRules, isChallengeActive, getChronicleTranscendsNeeded
} from './js/systems/ChronicleSystem.js';
import { particles } from './js/engine/ParticleEngine.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;
const clone = (o) => JSON.parse(JSON.stringify(o));
const DAY = 86400 * 1000;
const T0 = Date.UTC(2026, 5, 1);
let now = T0;
chronicleClock.now = () => now;

const make = () => {
  const gs = new GameState();
  const bs = new BuildingSystem(gs);
  const ps = new PrestigeSystem(gs);
  gs.buildingSystem = bs;
  gs.prestigeSystem = ps;
  const st = new ShardTreeSystem(gs, ps);
  const cs = new ChronicleSystem(gs, ps);
  return { gs, bs, ps, st, cs };
};
// A save that has climbed layer 2: n Transcends, shards, dust, some tree nodes, a run in progress
const climbed = (n) => {
  const m = make();
  const { gs } = m;
  gs.transcendenceCount = n;
  gs.fractureShards = new BigNum(5);
  gs.totalFractureShards = new BigNum(2 * n);
  gs.cosmicDust = new BigNum(3e20);
  gs.totalCosmicDust = new BigNum(9e20);
  gs.ascensionCount = 400;
  gs.ascensionPerks.genesis.rank = 1;
  gs.aether = new BigNum(1e40);
  gs.totalAetherEarned = new BigNum(5e40);
  gs.buildings.tapper.count = 300;
  gs.gold = new BigNum(1e15);
  gs.chronoSand = 500;
  gs.talentPoints = 7;
  gs.guildSeals = 12;
  gs.hero = { floor: 800, maxFloor: 812, indexFloor: 812, hp: 100, wardens: { defeated: { 250: true } } };
  gs.miningGrid = { depth: 120, maxDepth: 131 };
  gs.garden = { breedingUnlocked: false };
  gs.achievements = { first: { unlocked: true } };
  gs.shardTree.owned = { chronos_auto_ascend: true, chronos_offline: true, chronos_long_warp: true, tower_wardens: true, tower_second_wind: true };
  gs.shardTree.autoAscend = { enabled: true, rule: 'x1.5', timerMin: 30 };
  checkMilestones(gs);   // pay what this save has already earned, so the tests see only changes
  return m;
};

console.log('--- Chapter data is valid; a broken chapter is caught ---');
{
  assert.deepEqual(validateChapters(), [], 'shipped chapters validate');
  assert.equal(CHAPTERS[0].id, 'sand');
  assert.equal(CHAPTERS[0].number, 1);
  assert.equal(CHAPTERS[0].challenges.length, 4);
  const bad = clone(CHAPTERS);
  bad[0].rules.aetherMult = -1;
  bad[0].challenges[1].rules.bogus = true;
  bad[0].challenges[2].id = bad[0].challenges[0].id;
  bad[0].challenges[3].goal.runAether = Infinity;
  bad[0].challenges[0].requires = 9;
  const errs = validateChapters(bad);
  for (const want of ['aetherMult', 'unknown rule bogus', 'duplicate id', 'goal.runAether', 'requires out of range']) {
    assert.ok(errs.some(e => e.includes(want)), `caught: ${want} (${errs.join('; ')})`);
  }
  const second = clone(CHAPTERS[0]);
  second.id = 'caravan'; second.number = 3;   // wrong number, and ids reused
  assert.ok(validateChapters([CHAPTERS[0], second]).some(e => e.includes('number should be 2')));
  // Every rule key has a player-facing chip
  for (const k of Object.keys(RULE_KEYS)) {
    const v = RULE_KEYS[k] === 'flag' ? true : 2;
    assert.equal(describeRules({ [k]: v }).length, 1, `chip for ${k}`);
  }
}

console.log('--- Gate: 12 Transcends, and 24 for the first Chronicle until the Seals exist ---');
{
  const { gs, cs } = climbed(CHRONICLE_TRANSCEND_GATE);
  assert.equal(getSealGate(gs).source, 'standin');
  assert.equal(cs.canChronicle(), false, '12 Transcends are not enough while the stand-in applies');
  assert.match(getChronicleBlockReason(gs), /24 Transcends \(you: 12\)/);
  gs.transcendenceCount = SEAL_STANDIN_TRANSCENDS - 1;
  assert.equal(cs.canChronicle(), false);
  gs.transcendenceCount = SEAL_STANDIN_TRANSCENDS;
  assert.equal(cs.canChronicle(), true);

  // With the calendar system's Seals, the doc gate applies: 12 Transcends and Seal set I
  const s = climbed(CHRONICLE_TRANSCEND_GATE);
  let lit = 6;
  s.gs.calendarSystem = { getSealSetProgress: (set) => (set === 1 ? { lit, total: 7 } : null) };
  assert.equal(getSealGate(s.gs).source, 'seals');
  assert.match(getChronicleBlockReason(s.gs), /Seal set I \(6\/7 lit\) or 24 Transcends \(you: 12\)/);
  assert.equal(getChronicleTranscendsNeeded(s.gs), SEAL_STANDIN_TRANSCENDS);
  // ... the Transcend path still opens it without the Seals (no Seal can lock the layer away)
  s.gs.transcendenceCount = SEAL_STANDIN_TRANSCENDS;
  assert.equal(s.cs.canChronicle(), true);
  s.gs.transcendenceCount = CHRONICLE_TRANSCEND_GATE;
  lit = 7;
  assert.equal(getChronicleTranscendsNeeded(s.gs), CHRONICLE_TRANSCEND_GATE);
  assert.equal(s.cs.canChronicle(), true);
  s.gs.transcendenceCount = 11;
  assert.match(getChronicleBlockReason(s.gs), /needs 12 Transcends \(you: 11\)/);

  // The real calendar system reports Seal set I (all seven Seals)
  const r = climbed(CHRONICLE_TRANSCEND_GATE);
  r.gs.calendarSystem = new CalendarSystem(r.gs, () => now);
  assert.deepEqual(r.gs.calendarSystem.getSealSetProgress(1), { lit: r.gs.calendarSystem.getLitSealCount(), total: SEALS.length });
  for (const seal of SEALS) r.gs.calendar.seals[seal.id] = true;
  assert.equal(getSealGate(r.gs).sealsMet, true);
  assert.equal(r.cs.canChronicle(), true, '12 Transcends + Seal set I');

  // After the first Chronicle the Seal half is met for good: Chronicle II needs 12 Transcends
  const { gs: g2, cs: c2 } = climbed(SEAL_STANDIN_TRANSCENDS);
  c2.chronicle(now);
  assert.equal(getSealGate(g2).met, true);
  g2.transcendenceCount = 12;
  assert.equal(c2.canChronicle(), true);
}

console.log('--- Page payout: 3, +1 per 2 Transcends past 12, +1 with Gilded Edges ---');
{
  const gs = new GameState();
  assert.equal(getPendingPages(gs, 11), 0);
  assert.equal(getPendingPages(gs, 12), CHRONICLE_BASE_PAGES);
  assert.equal(getPendingPages(gs, 13), 3);
  assert.equal(getPendingPages(gs, 14), 4);
  assert.equal(getPendingPages(gs, 24), 9);
  gs.chronicle.upgrades.gilded_edges = true;
  assert.equal(getPendingPages(gs, 24), 9 + GILDED_EXTRA_PAGES);
  // Pages multiply Aether by 1.4 each, from every Page ever earned (spending never lowers it)
  gs.chronicle.totalPages = 10;
  gs.chronicle.pages = 0;
  const m = getPageAetherMult(gs).toNumber();
  assert.ok(Math.abs(m - Math.pow(PAGE_AETHER_MULT, 10)) / m < 1e-9, `x1.4^10 (${m})`);
}

console.log('--- Chronicle reset: exactly what the preview lists resets, the rest is kept ---');
{
  const { gs, cs, ps } = climbed(26);
  gs.runStartedAt = 0;
  gs.upgrades = { [UPGRADE_DEFINITIONS[0].id]: true, [UPGRADE_DEFINITIONS[1].id]: true };
  const before = clone(gs.serialize());
  const pv = cs.getPreview();
  assert.equal(pv.number, 1);
  assert.equal(pv.pages, 10);
  assert.equal(pv.transcends, 26);
  assert.equal(pv.startsChapter.id, 'sand');
  assert.equal(pv.resets, CHRONICLE_RESETS);
  assert.equal(pv.keeps, CHRONICLE_KEEPS);
  assert.equal(pv.blockReason, null);

  const res = cs.chronicle(now);
  assert.deepEqual({ pages: res.pages, number: res.number }, { pages: 10, number: 1 });
  // Resets
  assert.ok(gs.aether.eq(0) && gs.totalAetherEarned.eq(0), 'run Aether');
  assert.deepEqual(gs.upgrades, {}, 'upgrade shop');
  // generators (Cosmic Genesis, owned at the moment of the reset, starts the run with 15 Stalls, as on Transcend)
  for (const [id, b] of Object.entries(gs.buildings)) assert.equal(b.count, id === 'tapper' ? 15 : 0, `generator ${id}`);
  assert.ok(gs.cosmicDust.eq(0) && gs.totalCosmicDust.eq(0), 'dust and lifetime dust');
  assert.equal(gs.ascensionPerks.genesis.rank, 0, 'perks');
  assert.ok(gs.fractureShards.eq(0) && gs.totalFractureShards.eq(0), 'shards');
  assert.equal(gs.transcendenceCount, 0, 'Transcends this Chronicle');
  assert.equal(getUnlockedTierCount(gs), 14, 'ladder back to 14 tiers');
  assert.equal(gs.shardTree.owned.chronos_auto_ascend, undefined, 'tree reset (no Bookmark)');
  assert.equal(gs.shardTree.owned.tower_second_wind, undefined);
  assert.ok(ps.getTranscendGate().eq(1e9), 'Transcend gate back to the first step');
  // Keeps
  assert.equal(gs.ascensionCount, before.ascensionCount + 1, 'Ascension count (the reset counts as one, like Transcend)');
  assert.ok(Math.abs(gs.gold.toNumber() - (1e15 + 1000)) < 1, 'gold (+1,000 from Cosmic Genesis)');
  assert.equal(gs.chronoSand, 500, 'sand');
  assert.ok(gs.talentPoints >= before.talentPoints, 'talent points kept (the final run may add a Record star)');
  assert.equal(gs.guildSeals, 12);
  assert.deepEqual(gs.hero.wardens, before.hero.wardens, 'Warden trophies');
  assert.equal(gs.hero.maxFloor, 812, 'Tower record');
  assert.equal(gs.miningGrid.maxDepth, 131, 'Excavation record');
  assert.deepEqual(gs.achievements, before.achievements, 'achievements');
  assert.equal(gs.shardTree.owned.tower_wardens, true, 'Wardens stay unlocked');
  assert.equal(gs.shardTree.granted.tower_wardens, true, '...as a free node');
  assert.equal(gs.garden.breedingUnlocked, true, 'Garden breeding stays unlocked');
  assert.deepEqual(gs.shardTree.autoAscend, { enabled: true, rule: 'x1.5', timerMin: 30 }, 'Auto-Ascend settings remembered');
  // Layer 3
  assert.equal(gs.chronicle.count, 1);
  assert.equal(gs.chronicle.pages, 10);
  assert.equal(gs.chronicle.totalPages, 10);
  assert.equal(gs.chronicle.pastTranscends, 26);
  assert.equal(getLifetimeTranscends(gs), 26, 'lifetime Transcends kept for records');
  assert.deepEqual(gs.chronicle.chapter, { id: 'sand', startedAt: now }, 'Chapter 1 begins');
  assert.equal(cs.chronicle(now), null, 'no second Chronicle at 0 Transcends');
}

console.log('--- Lifetime Transcends: talent ladder never pays twice; achievements and records count all ---');
{
  const { gs, cs } = climbed(24);
  gs.records.transcendPaid = 24;
  cs.chronicle(now);
  const tp = gs.talentPoints;
  gs.transcendenceCount = 3;
  checkMilestones(gs);
  assert.equal(gs.talentPoints, tp + 3, 'Transcends 25-27 pay +1 each, 1-24 are not paid again');
  assert.equal(gs.records.transcendPaid, 27);
}

console.log('--- Page upgrades: Bookmark, Dog-Ear, Ink of Memory, Gilded Edges, Margin Notes ---');
{
  const { gs, cs } = climbed(24);
  gs.chronicle.pages = 30;
  gs.chronicle.totalPages = 30;
  assert.equal(cs.getUpgradeBlockReason('dog_ear'), 'needs Bookmark');
  for (const u of ['bookmark', 'dog_ear', 'ink', 'gilded_edges', 'margin_notes']) assert.equal(cs.buyUpgrade(u), true, u);
  assert.equal(cs.buyUpgrade('bookmark'), false, 'owned');
  assert.equal(gs.chronicle.pages, 30 - 3 - 5 - 4 - 8 - 6);
  assert.equal(gs.chronicle.totalPages, 30, 'spending never lowers the Page multiplier');
  assert.equal(cs.buyUpgrade('second_reading'), false, 'not enough Pages left');
  assert.equal(cs.getUpgradeBlockReason('second_reading'), 'needs 5 Pages');

  const res = cs.chronicle(now);
  assert.equal(res.pages, 9 + GILDED_EXTRA_PAGES);
  assert.ok(gs.fractureShards.eq(INK_SHARDS) && gs.totalFractureShards.eq(INK_SHARDS), 'Ink: starts with 2 shards');
  for (const id of ['chronos_auto_ascend', 'chronos_offline', 'chronos_long_warp']) {
    assert.equal(gs.shardTree.owned[id], true, `${id} kept`);
    assert.equal(gs.shardTree.granted[id], true, `${id} free`);
  }
  assert.equal(gs.shardTree.owned.tower_second_wind, undefined, 'Second Wind is bought again');
  // Margin Notes: +25% Aether per challenge cleared
  const m0 = getPageAetherMult(gs);
  gs.chronicle.challenges.sand_dry_well = { done: true, best: 60, clears: 1 };
  gs.chronicle.challenges.sand_lights_out = { done: true, best: 60, clears: 1 };
  assert.ok(Math.abs(getPageAetherMult(gs).div(m0).toNumber() - (1 + 2 * MARGIN_NOTES_PER_CLEAR)) < 1e-9);
}

console.log('--- Chapter: world rules for its weeks, then a stamp; no new Chapter yet = rules lift ---');
{
  now = T0;
  const { gs, cs } = climbed(24);
  assert.equal(getActiveRules(gs), NO_RULES, 'no rules before the first Chronicle');
  cs.chronicle(now);
  const st = getChapterStatus(gs, now);
  assert.equal(st.running, true);
  assert.equal(st.week, 1);
  const rules = getActiveRules(gs, now);
  assert.equal(rules.excavationMult, 3);
  assert.equal(rules.aetherMult, 0.5);
  // Aether production follows the Chapter rule (x0.5) on top of the Page multiplier
  gs.buildings.tapper.count = 10;
  const withRule = gs.getNetAetherPerSecond();
  now = T0 + 10 * 7 * DAY + 1;
  const after = gs.getNetAetherPerSecond();
  assert.ok(Math.abs(after.div(withRule).toNumber() - 2) < 1e-9, 'rules lift when the Chapter ends');
  const pages = gs.chronicle.totalPages;
  const stamps = cs.advanceChapters(now);
  assert.deepEqual(stamps.map(c => c.id), ['sand']);
  assert.equal(gs.chronicle.stamps.sand, true);
  assert.equal(gs.chronicle.totalPages, pages + CHAPTERS[0].stampPages);
  assert.deepEqual(cs.advanceChapters(now), [], 'stamped once');
  assert.equal(getChapterStatus(gs, now).running, false);
  assert.equal(cs.getChallengeBlockReason('sand_dry_well'), null, 'challenges stay open after the Chapter');
  now = T0;
}

console.log('--- Challenge runner: rules apply, the run is stashed, everything reverts on abandon ---');
{
  now = T0;
  const { gs, cs, ps } = climbed(24);
  cs.chronicle(now);
  // A main run in progress
  gs.aether = new BigNum(4.5e30);
  gs.totalAetherEarned = new BigNum(7.25e31);
  gs.buildings.tapper.count = 123;
  gs.buildings[Object.keys(gs.buildings)[3]].count = 45;
  gs.comboCount = 40;
  gs.upgrades = { [UPGRADE_DEFINITIONS[0].id]: true, [UPGRADE_DEFINITIONS[2].id]: true };
  gs.runStartedAt = T0 - 3600e3;
  gs.chronicle.challenges.sand_dry_well = { done: true, best: 999, clears: 1 };
  const mainRun = clone(gs.serialize());
  delete mainRun.savedAt;
  const cpsMain = gs.getNetAetherPerSecond();

  assert.equal(cs.getChallengeBlockReason('sand_sandstorm'), 'opens after 3 challenges of this Chapter');
  assert.equal(cs.getChallengeBlockReason('sand_small_souq'), null, 'opens after 1 clear');
  assert.equal(cs.startChallenge('sand_small_souq', now), true);
  assert.equal(cs.startChallenge('sand_lights_out', now), false, 'one challenge at a time');
  assert.equal(isChallengeActive(gs), true);
  // Fresh run under the challenge's rules (the Chapter's world rules are replaced)
  assert.ok(gs.aether.eq(0) && gs.totalAetherEarned.eq(0));
  assert.equal(gs.buildings.tapper.count, 0);
  assert.deepEqual(gs.upgrades, {}, 'the challenge run starts with no shop upgrades');
  gs.upgrades[UPGRADE_DEFINITIONS[4].id] = true;  // bought during the challenge: gone after it
  const r = getActiveRules(gs, now);
  assert.equal(r.maxTiers, 6);
  assert.equal(r.layerBonusesOff, true);
  assert.equal(r.aetherMult, 1, 'Chapter rules do not stack on a challenge');
  assert.equal(getUnlockedTierCount(gs), 6, 'Small Souq closes tiers 7+');
  gs.buildings.tapper.count = 10;
  const bare = gs.getNetAetherPerSecond();
  assert.ok(bare.lt(cpsMain));
  assert.equal(ps.canAscend(), false, 'no Ascending in a challenge');
  gs.totalCosmicDust = new BigNum(1e30);
  assert.equal(ps.canTranscend(), false, 'no Transcending in a challenge');
  gs.totalCosmicDust = BigNum.fromJSON(mainRun.totalCosmicDust);
  assert.match(getChronicleBlockReason(gs), /challenge/);

  // Save mid-challenge: only the id and the stash are saved; no rule value is written anywhere
  const save = clone(gs.serialize());
  assert.equal(save.chronicle.active.id, 'sand_small_souq');
  assert.ok(save.chronicle.active.stash, 'stash saved');
  for (const k of ['maxTiers', 'layerBonusesOff', 'comboCap', 'noSpells', 'noFrenzy', 'excavationMult']) {
    assert.ok(!JSON.stringify(save).includes(`"${k}"`), `override ${k} is not in the save`);
  }

  // Abandon: the main run comes back exactly, the rules are gone
  cs.abandonChallenge();
  assert.equal(isChallengeActive(gs), false);
  assert.equal(getActiveRules(gs, now).maxTiers, Infinity);
  assert.equal(getUnlockedTierCount(gs), 14);
  const back = clone(gs.serialize());
  delete back.savedAt;
  assert.deepEqual(back, mainRun, 'state after abandon equals the state before the challenge');
  assert.ok(gs.getNetAetherPerSecond().eq(cpsMain));
}

console.log('--- Reload mid-challenge: rules come back from the id, then revert cleanly ---');
{
  now = T0;
  const { gs, cs } = climbed(24);
  cs.chronicle(now);
  gs.aether = new BigNum(8e22);
  gs.totalAetherEarned = new BigNum(9e22);
  gs.buildings.tapper.count = 77;
  const mainRun = clone(gs.serialize());
  delete mainRun.savedAt;
  cs.startChallenge('sand_dry_well', now);
  gs.aether = new BigNum(5e6);
  gs.totalAetherEarned = new BigNum(6e6);
  gs.buildings.tapper.count = 12;
  const save = JSON.stringify(gs.serialize());

  // "Reload": a brand-new game object loads the save
  const m2 = make();
  m2.gs.deserialize(JSON.parse(save));
  const g2 = m2.gs;
  assert.equal(isChallengeActive(g2), true);
  const r = getActiveRules(g2, now);
  assert.equal(r.comboCap, 2);
  assert.equal(r.noFrenzy, true);
  assert.equal(g2.buildings.tapper.count, 12, 'challenge run continues');
  // Combo cap and no Frenzy, through the real click yield
  g2.comboCount = 50;
  g2.frenzyActive = true;
  const capped = g2.getClickYield();
  g2.comboCount = 0;
  g2.frenzyActive = false;
  const base = g2.getClickYield();
  assert.ok(Math.abs(capped.div(base).toNumber() - 2) < 1e-9, 'combo x5 capped at x2, Frenzy x5 ignored');
  const probe = make();
  probe.gs.deserialize(JSON.parse(save));
  const cl = new ClickerSystem(probe.gs);
  probe.gs.comboCount = 99;
  cl.handleClick(0, 0);
  assert.equal(probe.gs.frenzyActive, false, 'Frenzy never starts');

  // Abandon after the reload: identical to the pre-challenge save loaded the same way
  m2.cs.abandonChallenge();
  const ref = make();
  ref.gs.deserialize(clone(mainRun));
  const norm = (g) => { const o = clone(g.serialize()); delete o.savedAt; delete o.fastForward; return o; };
  assert.deepEqual(norm(g2), norm(ref.gs));
  assert.equal(getActiveRules(g2, now).comboCap, Infinity);

  // Reload after the challenge ended: nothing of it survives
  const m3 = make();
  m3.gs.deserialize(clone(g2.serialize()));
  assert.equal(isChallengeActive(m3.gs), false);
  assert.equal(getActiveRules(m3.gs, now).comboCap, Infinity);
}

console.log('--- Completing a challenge: Pages once (twice with Second Reading), best time, run restored ---');
{
  now = T0;
  const { gs, cs } = climbed(24);
  cs.chronicle(now);
  gs.aether = new BigNum(1e25);
  gs.totalAetherEarned = new BigNum(2e25);
  const keep = gs.totalAetherEarned.toJSON();
  const pages0 = gs.chronicle.pages;
  cs.startChallenge('sand_lights_out', now);
  // Spells are off
  const ss = new SpellSystem(gs, null);
  gs.mana = 1e9;
  assert.equal(ss.canCast(Object.keys(gs.spells)[0]), false, 'no spells in Lights Out');
  assert.equal(cs.checkChallenge(now + 1000), null, 'goal not met');
  gs.totalAetherEarned = new BigNum(getChallenge('sand_lights_out').goal.runAether);
  const res = cs.checkChallenge(now + 3600e3);
  assert.equal(res.first, true);
  assert.equal(res.pages, 3);
  assert.equal(res.seconds, 3600);
  assert.equal(gs.chronicle.pages, pages0 + 3);
  assert.deepEqual(gs.chronicle.challenges.sand_lights_out, { done: true, best: 3600, clears: 1 });
  assert.deepEqual(gs.totalAetherEarned.toJSON(), keep, 'main run restored');
  assert.equal(isChallengeActive(gs), false);
  assert.ok(ss.canCast(Object.keys(gs.spells)[0]), 'spells back');
  // A replay pays no Pages but can set a better time
  cs.startChallenge('sand_lights_out', now);
  gs.totalAetherEarned = new BigNum(1e12);
  const again = cs.checkChallenge(now + 1800e3);
  assert.equal(again.pages, 0);
  assert.equal(again.best, true);
  assert.equal(gs.chronicle.challenges.sand_lights_out.best, 1800);
  // Second Reading doubles a first clear
  gs.chronicle.upgrades.second_reading = true;
  cs.startChallenge('sand_dry_well', now);
  gs.totalAetherEarned = new BigNum(1e12);
  assert.equal(cs.checkChallenge(now + 60e3).pages, 6);
}

console.log('--- Broken or stale saves: unknown challenge restores the run; junk is cleaned ---');
{
  now = T0;
  const { gs, cs } = climbed(24);
  cs.chronicle(now);
  gs.totalAetherEarned = new BigNum(3e33);
  gs.buildings.tapper.count = 55;
  cs.startChallenge('sand_dry_well', now);
  const save = clone(gs.serialize());
  save.chronicle.active.id = 'removed_challenge';   // a challenge that no longer ships
  const m2 = make();
  m2.gs.deserialize(save);
  assert.equal(isChallengeActive(m2.gs), false, 'orphan challenge dropped');
  assert.ok(m2.gs.totalAetherEarned.eq(3e33), 'its stashed run is restored');
  assert.equal(m2.gs.buildings.tapper.count, 55);

  const junk = sanitizeChronicleState({ count: -3, pages: 'x', totalPages: 2, pages2: 1, upgrades: { bookmark: true, nope: true },
    chapter: { id: 'nope' }, challenges: { sand_dry_well: { done: true, best: -5 }, fake: { done: true } },
    active: { id: 'sand_dry_well', stash: { aether: 'bad' } } });
  assert.equal(junk.count, 0);
  assert.equal(junk.pages, 0);
  assert.deepEqual(junk.upgrades, { bookmark: true });
  assert.equal(junk.chapter, null);
  assert.deepEqual(Object.keys(junk.challenges), ['sand_dry_well']);
  assert.equal(junk.challenges.sand_dry_well.best, null);
  assert.equal(junk.active, null, 'a challenge without a valid stash is not resumed');
  assert.deepEqual(sanitizeChronicleState(undefined), defaultChronicleState());
}

console.log('--- A save from before R20 loads with an empty Chronicle ---');
{
  const old = new GameState().serialize();
  delete old.chronicle;
  old.transcendenceCount = 9;
  const gs = new GameState();
  gs.deserialize(clone(old));
  assert.deepEqual(gs.chronicle, defaultChronicleState());
  assert.equal(getLifetimeTranscends(gs), 9);
  assert.equal(getActiveRules(gs), NO_RULES);
}

console.log('--- BigNum stays finite: 1e6 Pages, huge runs, max tiers ---');
{
  now = T0;
  const { gs, cs } = climbed(30);
  gs.chronicle.totalPages = 1e6;
  gs.chronicle.challenges = Object.fromEntries(CHAPTERS[0].challenges.map(c => [c.id, { done: true, best: 1, clears: 1 }]));
  gs.chronicle.upgrades.margin_notes = true;
  const m = getPageAetherMult(gs);
  assert.ok(Number.isFinite(m.e) && m.gt(1e100000), 'x1.4^1e6 as a BigNum');
  gs.buildings.tapper.count = 1000;
  for (let i = 0; i < MAX_TIER_COUNT; i++) gs.buildings[Object.keys(gs.buildings)[i]].count = 500;
  const cps = gs.getNetAetherPerSecond();
  assert.ok(Number.isFinite(cps.m) && Number.isFinite(cps.e) && cps.gt(0));
  gs.totalAetherEarned = new BigNum(1).mul(new BigNum(10).pow(400));
  const pv = cs.getPreview();
  for (const k of ['aetherMultBefore', 'aetherMultAfter']) assert.ok(Number.isFinite(pv[k].e), k);
  // A challenge stash of a 1e400 run survives JSON and comes back intact
  gs.chronicle.chapter = { id: 'sand', startedAt: now };
  cs.startChallenge('sand_dry_well', now);
  const g2 = new GameState();
  g2.deserialize(JSON.parse(JSON.stringify(gs.serialize())));
  new BuildingSystem(g2);
  const c2 = new ChronicleSystem(g2, new PrestigeSystem(g2));
  c2.abandonChallenge();
  assert.ok(g2.totalAetherEarned.eq(new BigNum(10).pow(400)), '1e400 run restored');
}

console.log('All Chronicle tests passed.');
