// Core pacing simulator: drives the real GameState / BuildingSystem / PrestigeSystem classes
// for a simulated year with subgames off, to measure the Aether -> Cosmic Dust rhythm.
// See docs/redesign-proposal.md §2.1 and §6.4 for what these numbers mean.
//
//   node sim/core-pacing.mjs            # print the report
//   node sim/core-pacing.mjs --assert   # also fail (exit 1) if the year-one targets are missed
//   node sim/core-pacing.mjs --only=casual   # one profile only (faster while tuning)
//   With --assert it also runs --links and each other --attune= (R57) and checks their targets.
//
// Profiles:
//   idle   : taps 1/s for the first 3 min of every run until it owns Auto-tap (dust shop, R52),
//            which then taps 1/s all the time; never casts; greedy-buys every 5 s
//   casual : present 10 min of every hour (2 clicks/s, spells on cooldown, anomalies clicked),
//            an income multiplier measured on the real spell/anomaly code (R3 block,
//            sim/active-income.mjs); Auto-tap while away once owned
// Ascend policy: when pending dust >= max(5, current dust) and the run is at least 10 min old,
// by hand only while the player is there (casual: the 10 present minutes of each hour; idle: a
// glance once an hour) until the shard tree's Auto-Ascend is bought, then whenever the rule is met
// (R13; see the shard-tree block below).
// Transcend policy: as soon as lifetime dust reaches the gate (R4). Each Transcend unlocks the
// next generator tier and counts as a reset in the gap measurement.
// Upgrade shop (R5): upgrades compete with generators in the same greedy loop, by Aether/s gained
// per Aether spent (see makeUpgradeShopBuyer below).
// Dust shop (R6): after every reset the player buys every open shop item, then Dust Amplifier ranks
// with the dust left (see the dust shop block below).
// Chronicle policy (R20, layer 3; R57): see the Chronicle block below.
//
// When an economy PR changes the core (new prestige layer, shop, formulas), update this script
// so it still models what a real player would do, and paste the before/after report in the PR.
import { BigNum } from '../js/engine/BigNum.js';
import { GameState } from '../js/systems/GameState.js';
import { BuildingSystem, BUILDING_DEFINITIONS } from '../js/systems/BuildingSystem.js';
import { PrestigeSystem } from '../js/systems/PrestigeSystem.js';
import { DUST_SHOP_ITEMS, buyShopItem } from '../js/systems/DustShopSystem.js';
import { AchievementSystem } from '../js/systems/AchievementSystem.js';
import { UpgradeSystem, TIER_UPGRADE_MULT, SYNERGY_PER_UNIT, UPGRADE_DEFINITIONS, getUpgradeDefinition } from '../js/systems/UpgradeSystem.js';
import { particles } from '../js/engine/ParticleEngine.js';
import { ShardTreeSystem, autoAscendRuleMet, AUTO_ASCEND_RULES, AUTO_ASCEND_DEFAULT_RULE, getDeepBlueprintDivisor, canBuyNode, FOUNDRY_FIRST_TIER, FOUNDRY_LAST_TIER } from '../js/systems/ShardTreeSystem.js';
import { ChronicleSystem, chronicleClock, PAGE_UPGRADES, CHRONICLE_PAGES_MAX_TRANSCENDS } from '../js/systems/ChronicleSystem.js';
import { measureActiveIncome } from './active-income.mjs'; // R3 block below
import { CLICK_CPS_SECONDS } from '../js/systems/combo.js';
import { ATTUNEMENT_IDS, DEFAULT_ATTUNEMENT } from '../js/systems/AttunementSystem.js';

globalThis.window = globalThis.window || { innerWidth: 1000, innerHeight: 800 };
particles.suppressed = true;

const DAY = 86400;
const YEAR = 365 * DAY;

// Year-one targets from docs/redesign-proposal.md (§4.2, §6.4). Enforced only with --assert.
export const TARGETS = {
  firstAscensionMaxMin: 30,      // casual player's first Ascension within 30 min
  idleFirstAscensionMaxMin: 90,  // R52 (passive first): the idle player's within 90 min
  maxGapDaysAfterDay1: 14,       // never more than 14 days without a reset (days 1..gapWindowEndDay)
  // The doc's goal (day 270). Layer 2 alone stalls ~day 185 (doc §6.4); the Chronicle (R20)
  // restarts the Transcend ladder so resets keep coming.
  gapWindowEndDay: 270,
  // R31: numbers grow slowly. Casual run Aether around two months stays at or below this. R53:
  // measured as the median of one sample a day over days 50-70, not the single 2-month row: run
  // Aether swings ~2 decades inside one layer, so the row alone passed or failed on where day 60
  // fell (on main before R53: 1.6e13 at days 58 and 62, 7.5e11 at day 60 just after a New Well).
  casualTwoMonthAetherMax: 1e13,
  twoMonthWindowDays: [50, 70],
  // R52 (passive first must not cost the curve or the upgrade rhythm): the same median at least
  // this, and a median of at least this many upgrades per casual Ascension run
  casualTwoMonthAetherMin: 1e11,
  casualUpgradesPerRunMin: 30,
  // R57: the slow curve holds all year. Over months 6-12 (one sample a day over these days) the
  // median run Aether stays at or below lateMedianAetherMax (the issue's "1-year run Oil <= 1e17")
  // and the highest at or below latePeakAetherMax, for the casual and the idle player, with the
  // subgame links on and off. The 2-month band above holds for every attunement (casual).
  lateWindowDays: [180, 365],
  lateMedianAetherMax: 1e17,
  latePeakAetherMax: 1e18
};

// --- R3 / R52 active income block ----------------------------------------------------------------
// While the casual player is present, income is CPS x ACTIVE_MULT: the real SpellSystem and
// ClickerSystem played attentively at a fixed CPS (sim/active-income.mjs: 2 clicks/s with Frenzy,
// Celestial/Chrono Warp/Burst on cooldown, every Golden Anomaly clicked), divided by generator
// income alone (Auto-tap pauses while the player taps). A click is 0.5 s of production but at
// least 1 Oil (R52), so on a fresh run the floor's extra is added on top (clickFloorExtra).
// SIM_ACTIVE_MULT=<x> overrides it (to compare tunings).
const MEASURED = measureActiveIncome();
const ACTIVE_MULT = process.env.SIM_ACTIVE_MULT ? Number(process.env.SIM_ACTIVE_MULT) : MEASURED.vsGenerators;
const ACTIVE_IDLE_RATIO = MEASURED.ratio;   // vs an idle player with Auto-tap (report)
// Oil per second that `rate` plain clicks add above their 0.5 s-of-production share (the 1 Oil floor)
const clickFloorExtra = (gs, cps, rate) => gs.clickPower.sub(cps.mul(CLICK_CPS_SECONDS)).max(0).mul(rate);
// ---------------------------------------------------------------------------------------------

const CHECKPOINTS = [
  ['10 min', 600], ['1 h', 3600], ['1 d', DAY], ['1 w', 7 * DAY],
  ['1 mo', 30 * DAY], ['2 mo', 60 * DAY], ['3 mo', 90 * DAY], ['6 mo', 180 * DAY], ['1 y', YEAR]
];

// --- R5 upgrade shop block -------------------------------------------------------------------
// The sim buys upgrades in the same greedy loop as generators, by log10(Aether/s gained per
// Aether spent) in the generator greedy's units (generator output before global multipliers).
//   shop.refresh()           at the start of each greedy pass: collect available upgrades
//   shop.onBuilding(id)      after a generator purchase: its upgrades/synergies may have opened
//   shop.best(budget)        -> { id, ratio } | null, the best affordable available upgrade
//   shop.buy(id)             buys it and updates the candidate list
//   shop.buyCheap()          buys every available upgrade costing <= 1% of run Aether (R31)
// Only the available ones are scored, so a pass costs a handful of checks, not 173.
function makeUpgradeShopBuyer(gs, bs, us) {
  const lg = (x) => Math.log10(Math.abs(x.m)) + x.e;
  const costLog = new Map(us.definitions.map(u => [u.id, lg(u.cost)]));
  const baseCpsLog = new Map(BUILDING_DEFINITIONS.map(d => [d.id, lg(d.baseCps)]));
  const byBuilding = new Map();   // building id -> upgrades whose availability depends on its count
  for (const u of us.definitions) {
    for (const id of [u.building, u.source]) {
      if (!id) continue;
      if (!byBuilding.has(id)) byBuilding.set(id, []);
      byBuilding.get(id).push(u.id);
    }
  }
  // log10 of one tier's output, same terms as BuildingSystem.getBuildingProduction (the sim
  // has no talents), without allocating BigNums
  const prodLog = (id) => {
    const cnt = gs.buildings[id].count;
    if (cnt <= 0) return -Infinity;
    return baseCpsLog.get(id) + Math.log10(cnt * bs.getMilestoneMultiplier(cnt) * gs.getTierUpgradeMult(id));
  };
  const tierGainLog = Math.log10(TIER_UPGRADE_MULT - 1);
  const candidates = new Set();
  return {
    refresh() {
      candidates.clear();
      for (const u of us.definitions) if (us.isAvailable(u.id)) candidates.add(u.id);
    },
    onBuilding(id) {
      for (const uid of byBuilding.get(id) || []) if (!candidates.has(uid) && us.isAvailable(uid)) candidates.add(uid);
    },
    // R31: an upgrade that costs at most CHEAP_UPGRADE_SHARE of this run's Aether is bought on sight,
    // whatever it adds (a player doesn't weigh a 1% purchase). Returns true if anything was bought.
    buyCheap() {
      let any = false;
      for (const id of [...candidates]) {
        if (us.getCost(id).lte(gs.totalAetherEarned.mul(CHEAP_UPGRADE_SHARE)) && this.buy(id)) any = true;
      }
      return any;
    },
    buy(id) {
      if (!us.buy(id)) return false;
      candidates.delete(id);
      return true;
    },
    best(budgetLog) {
      let best = null, bestRatio = -Infinity;
      for (const id of candidates) {
        const u = getUpgradeDefinition(id);
        // Deep Blueprints (shard tree Foundry, R13) divide a tier's own upgrade prices
        const c = costLog.get(id) - (u.kind === 'tier' ? Math.log10(getDeepBlueprintDivisor(gs, u.tier)) : 0);
        if (c > budgetLog + 1e-9) continue;
        let gainLog;
        if (u.kind === 'tier') {
          gainLog = prodLog(u.building) + tierGainLog;
        } else {
          gainLog = prodLog(u.building) + Math.log10(SYNERGY_PER_UNIT * gs.buildings[u.source].count);
        }
        const ratio = gainLog - c;
        if (ratio > bestRatio) { bestRatio = ratio; best = id; }
      }
      return best ? { id: best, ratio: bestRatio } : null;
    }
  };
}
const CHEAP_UPGRADE_SHARE = 0.01;
// --- end R5 block ------------------------------------------------------------------------------

// synergy source building -> target buildings (a source purchase changes the target's multiplier)
const SYNERGY_TARGETS_OF = new Map();
for (const u of UPGRADE_DEFINITIONS) {
  if (u.kind !== 'synergy') continue;
  if (!SYNERGY_TARGETS_OF.has(u.source)) SYNERGY_TARGETS_OF.set(u.source, []);
  SYNERGY_TARGETS_OF.get(u.source).push(u.building);
}

// ---- Shard tree (R13) ---------------------------------------------------------------------
// The player buys Auto-Ascend (2 shards) as soon as the first Transcend pays for it and keeps the
// default rule (x2 lifetime dust, the same threshold the manual policy uses). With the shards left
// it buys the Deep Blueprint (Foundry, 1 shard: that tier's upgrades /10) of each newly opened
// tier (R5). Nothing else on the tree changes this model: the sim has no offline gap for Long
// Sleep or Hourglass to fill, and Tower nodes don't touch the core economy.
function makeShardTreeModel(gs, ps) {
  const tree = new ShardTreeSystem(gs, ps);
  return {
    buyNodes() {
      if (!tree.has('chronos_auto_ascend')) tree.buy('chronos_auto_ascend');
      if (!tree.has('chronos_auto_ascend')) return;   // saving for Auto-Ascend first
      for (let tier = FOUNDRY_FIRST_TIER; tier <= FOUNDRY_LAST_TIER; tier++) {
        const id = `foundry_t${tier}`;
        if (!tree.has(id) && canBuyNode(gs, id)) tree.buy(id);
      }
    },
    // Auto-Ascend decision in sim time (the real system reads Date.now; same rule)
    autoAscendDue(pending, runSeconds) {
      return tree.has('chronos_auto_ascend') && gs.shardTree.autoAscend.enabled &&
        autoAscendRuleMet(gs.shardTree.autoAscend, pending, gs.totalCosmicDust, runSeconds);
    },
    owns: (id) => tree.has(id)
  };
}
// ---------------------------------------------------------------------------------------------

// ---- Dust shop (R6) ---------------------------------------------------------------------------
// Called after each Ascension and Transcend (the only times dust changes). Spending never lowers
// the dust multiplier (it reads lifetime dust), so the player buys every open one-time item,
// cheapest first, then ranked items up to their max, then pours what is left into Dust Amplifier (+10% dust gain per
// rank, price x2 each). What the sim models of the items:
//   - Cosmic Genesis, Resonant Start: PrestigeSystem.ascend applies them to the new run;
//   - Blueprint Memory I/II: the upgrade shop's keep rules (real UpgradeSystem reset);
//   - Finger of Wasta: the loop below counts clicks into gs.totalClicks (up to +50%);
//   - Dust Amplifier: PrestigeSystem.getPendingCosmicDust.
// Auto-Buy changes nothing here (the sim already greedy-buys every 5 s in both profiles); Chrono
// Reservoir, Hourglass, Golems, Titan, Crucible and Leylines touch nothing the core sim models.
function makeDustShopModel(gs) {
  // One-time features first, cheapest first, then ranked items (R31: dust is scarce enough that the
  // order matters)
  // Al-Wakeel (R65) only auto-equips Tower gear, which this sim doesn't model; buying it here only
  // shifts the dust spend order (R67). Drill Mastery (R69) is Excavation-only, skipped the same way.
  const SKIP = new Set(['dust_amplifier', 'al_wakeel', 'drill_mastery']);
  const items = DUST_SHOP_ITEMS.filter(d => !SKIP.has(d.id))
    .sort((a, b) => (a.maxRank > 1) - (b.maxRank > 1) || (a.maxRank > 1 ? 0 : a.cost - b.cost));
  const firstBuy = new Map();   // item id -> day first bought (report)
  return {
    buyAll(t) {
      for (const d of items) {
        for (let k = 0; k < 10 && buyShopItem(gs, d.id); k++) {
          if (!firstBuy.has(d.id)) firstBuy.set(d.id, t / DAY);
        }
      }
      for (let k = 0; k < 400 && buyShopItem(gs, 'dust_amplifier'); k++);
    },
    firstBuy
  };
}
// ---------------------------------------------------------------------------------------------

// ---- Chronicle (R20) ------------------------------------------------------------------------
// The Chapter's 10-week window runs on the sim clock (chronicleClock). Policy: the first Chronicle
// begins once it is allowed and layer 2 has slowed down (the last Transcend is at least
// CHRONICLE_AFTER_SLOW_DAYS old), which is when a player would trade the Transcend ladder for
// Pages. R57: after that the player knows the loop, and a Chronicle's Pages are full at
// CHRONICLE_PAGES_MAX_TRANSCENDS (the 9th Transcend, where the x3 gates begin), so each later
// Chronicle begins there. Waiting longer only grows run Oil (the ~1e20 late-year peaks before
// R57) and pays no more Pages. Pages go to Page upgrades in PAGE_BUY_ORDER as soon as they are
// affordable. The sim does not play challenges (their Pages would only make it faster), so this
// is the slow case.
// By hand the player Ascends on the same threshold as the default Auto-Ascend rule (R31)
const MANUAL_ASCEND_MULT = AUTO_ASCEND_RULES.find(r => r.id === AUTO_ASCEND_DEFAULT_RULE).mult;
const MANUAL_ASCEND_MIN = 5;   // R52: the first New Well pays 5 (Auto-tap's price)
const SIM_EPOCH = Date.UTC(2026, 0, 1);
const CHRONICLE_AFTER_SLOW_DAYS = 11;
const PAGE_BUY_ORDER = ['bookmark', 'ink', 'dog_ear', 'gilded_edges', 'margin_notes', 'second_reading'];
function makeChronicleModel(gs, ps, clock) {
  chronicleClock.now = () => SIM_EPOCH + clock() * 1000;
  const sys = new ChronicleSystem(gs, ps);
  const log = [];
  return {
    sys, log,
    // Returns true if a Chronicle began (the run, dust, shards, tree and Transcends reset)
    maybeChronicle(t, lastTranscendAt) {
      sys.advanceChapters();
      const slowed = t - lastTranscendAt >= CHRONICLE_AFTER_SLOW_DAYS * DAY;
      const pagesFull = log.length > 0 && gs.transcendenceCount >= CHRONICLE_PAGES_MAX_TRANSCENDS;
      if (!sys.canChronicle() || !(slowed || pagesFull)) return false;
      const cps = gs.getNetAetherPerSecond();
      const res = sys.chronicle();
      if (!res) return false;
      for (const id of PAGE_BUY_ORDER) sys.buyUpgrade(id);
      log.push({ day: t / DAY, pages: res.pages, cps: cps.format('scientific', 1) });
      return true;
    }
  };
}
if (PAGE_BUY_ORDER.length !== PAGE_UPGRADES.length) throw new Error('sim: PAGE_BUY_ORDER is missing a Page upgrade');
// --- R53 subgame links block (--links) -----------------------------------------------------------
// By default the sim runs with the subgames off. `--links` sets the subgame stats that feed Oil or
// dust (Depth Resonance and Geode Attunement from max depth, Dungeon Mastery from bosses, Aetheric
// Treaty ranks, High Enchanter level, catalysts) from a fixed schedule, so the report shows how much
// the links add on top of the core. Depth: `npm run sim:mining` (active); bosses and gold (Enchanter
// level = what the held gold buys at 1e6 x 2.5^L): `npm run sim:tower` (casual); Treaty: ~12
// contracts a day (24 seals) spent on Treaty ranks; catalysts: about one every two days.
// [day, maxDepth, bosses, treaty rank, enchanter level, catalysts], linear in between, flat after.
const LINKS = process.argv.includes('--links');
const LINK_SCHEDULE = [
  [0, 0, 0, 0, 0, 0], [1, 54, 39, 2, 41, 0], [7, 104, 69, 9, 82, 3], [14, 123, 75, 14, 90, 7],
  [30, 145, 81, 20, 98, 15], [60, 166, 90, 29, 105, 30], [180, 200, 110, 50, 120, 90], [365, 220, 130, 50, 130, 180]
];
function applyLinks(gs, t) {
  const d = t / DAY;
  let i = 1;
  while (i < LINK_SCHEDULE.length - 1 && LINK_SCHEDULE[i][0] < d) i++;
  const [a, b] = [LINK_SCHEDULE[i - 1], LINK_SCHEDULE[i]];
  const u = Math.max(0, Math.min(1, (d - a[0]) / (b[0] - a[0])));
  const at = (col) => Math.floor(a[col] + u * (b[col] - a[col]));
  gs.miningGrid = { ...(gs.miningGrid || {}), maxDepth: at(1) };
  gs.stats.totalBossesSlain = at(2);
  gs.quartermaster = { ...(gs.quartermaster || {}), aether_treaty: { rank: at(3) } };
  gs.market = { ...(gs.market || {}), goldenSynergy: at(4) };
  gs.alchemy = { ...(gs.alchemy || {}), catalysts: at(5) };
}
// ---------------------------------------------------------------------------------------------

// --- R55 attunement block ------------------------------------------------------------------------
// Every run keeps one attunement (Auto-Ascend keeps the last pick). Default: Idle, the default for
// new and old saves (+30% production while the last hand tap is 60 s old; Auto-tap isn't a tap).
// `--attune=steady` compares Steady (tier upgrades x1.26 each). Focus needs the subgames, which
// the core sim leaves off, so it would read +0% here.
const ATTUNEMENT = process.argv.find(a => a.startsWith('--attune='))?.slice(9) || DEFAULT_ATTUNEMENT;
if (!ATTUNEMENT_IDS.includes(ATTUNEMENT)) throw new Error(`sim: unknown attunement ${ATTUNEMENT}`);
// ---------------------------------------------------------------------------------------------

const medianBig = (xs) => [...xs].sort((a, b) => (a.gt(b) ? 1 : a.lt(b) ? -1 : 0))[xs.length >> 1] || BigNum.zero();
// One sample a day while t is inside [d0, d1] days
const dailyIn = (t, dt, [d0, d1]) => t >= d0 * DAY && t <= d1 * DAY + dt && Math.floor(t / DAY) !== Math.floor((t - dt) / DAY);

function run(profile, cfg = { links: LINKS, attune: ATTUNEMENT }) {
  const gs = new GameState();
  gs.attunement.id = cfg.attune;   // R55 attunement block
  const bs = new BuildingSystem(gs);
  const ps = new PrestigeSystem(gs);
  const ach = new AchievementSystem(gs);
  const us = new UpgradeSystem(gs);
  gs.buildingSystem = bs; gs.achievementSystem = ach; gs.upgradeSystem = us;
  const shop = makeUpgradeShopBuyer(gs, bs, us);

  gs.buildingSystem = bs; gs.achievementSystem = ach;
  const shardTree = makeShardTreeModel(gs, ps);
  const dustShop = makeDustShopModel(gs);
  let t = 0;
  const chronicle = makeChronicleModel(gs, ps, () => t);
  let lastTranscendAt = 0;
  let autoAscendDay = null;
  bs.buyAmount = 1;

  const presence = profile === 'casual' ? 600 : 0;
  const activeMult = (t) => (t % 3600 < presence ? ACTIVE_MULT : 1); // R3 block above

  // Greedy: buy the generator with the best Aether/s gained per Aether spent, one at a time.
  // Compared in log10 space (same ordering as the BigNum maths, ~20x faster with 30 tiers).
  const lg = (x) => Math.log10(Math.abs(x.m)) + x.e;
  const LOG_R = Math.log10(1.15);
  const DEF_LOGS = BUILDING_DEFINITIONS.map(d => ({ def: d, costLog: lg(d.baseCost), cpsLog: lg(d.baseCps) }));
  const greedyBuy = () => {
    const unlocked = DEF_LOGS.slice(0, bs.getUnlockedTierCount());
    const costMult = Math.log10(bs.getCostMultiplier());
    // Upgrade multiplier per tier (log10), recomputed only after an upgrade or a synergy source changes
    const multLog = new Map();
    const tierMultLog = (id) => {
      let v = multLog.get(id);
      if (v === undefined) { v = Math.log10(gs.getTierUpgradeMult(id)); multLog.set(id, v); }
      return v;
    };
    shop.refresh();
    if (shop.buyCheap()) multLog.clear();
    for (let k = 0; k < 50; k++) {
      if (gs.aether.m <= 0) return;
      const budget = lg(gs.aether);
      let best = null, bestRatio = -Infinity;
      for (const { def, costLog, cpsLog } of unlocked) {
        const cnt = gs.buildings[def.id].count;
        const cost = costLog + cnt * LOG_R + costMult;
        if (cost > budget + 1e-9) continue;
        const gain = (cnt + 1) * bs.getMilestoneMultiplier(cnt + 1) - cnt * bs.getMilestoneMultiplier(cnt);
        const ratio = cpsLog + Math.log10(gain) + tierMultLog(def.id) - cost;
        if (ratio > bestRatio) { bestRatio = ratio; best = def.id; }
      }
      const up = shop.best(budget);
      if (up && up.ratio >= bestRatio) {
        if (!shop.buy(up.id)) return;
        multLog.clear();
        continue;
      }
      if (!best || !bs.buyBuilding(best)) return;
      shop.onBuilding(best);
      for (const target of SYNERGY_TARGETS_OF.get(best) || []) multLog.delete(target);
    }
  };

  const dtFor = (t) => t < 3600 ? 1 : t < DAY ? 10 : t < 7 * DAY ? 60 : 300;

  let lifetimeAether = BigNum.zero();   // every Aether earned across all runs (R31 target)
  let runStart = 0, ci = 0;
  const resets = [];
  const transcends = [];
  const transcendAether = [];   // highest run Aether of each Transcend's layer (R31)
  let layerPeak = BigNum.zero();
  const upgradesPerRun = []; // R5: upgrades bought by the end of each Ascension run
  const twoMonthSamples = []; // run Aether once a day over TARGETS.twoMonthWindowDays (R53)
  const lateSamples = [];     // R57: the same over TARGETS.lateWindowDays
  const monthPeak = [];       // R57: highest run Aether in each 30-day month
  const regainDays = [];   // days after each Transcend until CPS is back to its pre-Transcend level
  let regainFrom = null;
  const rows = [];
  let lastManualAscendHour = -1;
  while (t < YEAR) {
    const dt = dtFor(t);
    if (cfg.links && (t % 3600 < dt || dt >= 3600)) applyLinks(gs, t);
    const present = t % 3600 < presence;
    // R52: Auto-tap (dust shop) taps 1/s whenever the player isn't tapping. Before it, the idle
    // player taps by hand for the first 3 min of a run.
    const autoTap = !present && gs.hasAutoTap();
    const clicksPerSec = present ? 2 : (!autoTap && t - runStart < 180 ? 1 : 0);
    // R55 attunement block: hand taps reset the Idle attunement's clock, Auto-tap doesn't
    gs.secondsSinceTap = clicksPerSec > 0 ? 0 : gs.secondsSinceTap + dt;
    const cps = gs.getNetAetherPerSecond();
    gs.totalClicks += clicksPerSec * dt;   // Finger of Wasta counts this run's (manual) clicks
    // Present: ACTIVE_MULT holds the clicks' 0.5 s share (R3 block). Away: plain taps, 0.5 s each.
    const clickIncome = present ? clickFloorExtra(gs, cps, clicksPerSec)
      : autoTap ? gs.getAutoTapPerSecond() : gs.getClickBase().mul(clicksPerSec);
    const income = cps.mul(dt * activeMult(t)).add(clickIncome.mul(dt));
    gs.aether = gs.aether.add(income);
    gs.totalAetherEarned = gs.totalAetherEarned.add(income);
    lifetimeAether = lifetimeAether.add(income);
    if (gs.totalAetherEarned.gt(layerPeak)) layerPeak = gs.totalAetherEarned;
    const month = Math.floor(t / (30 * DAY));
    if (!monthPeak[month] || gs.totalAetherEarned.gt(monthPeak[month])) monthPeak[month] = gs.totalAetherEarned;
    t += dt;
    if (Math.floor(t / 5) !== Math.floor((t - dt) / 5) || dt >= 5) greedyBuy();
    ach.checkAchievements();

    const pending = ps.getPendingCosmicDust();
    if (pending.gt(0)) {
      // By hand while present (casual: up to the moment they leave; idle: one glance an hour), or by
      // Auto-Ascend once it is owned
      const currentHour = Math.floor(t / 3600);
      const here = profile === 'casual' ? t % 3600 <= presence : t % 3600 < dt;
      const canManual = here && lastManualAscendHour !== currentHour;
      const manual = canManual && pending.gte(gs.totalCosmicDust.mul(MANUAL_ASCEND_MULT - 1).max(MANUAL_ASCEND_MIN));
      if (manual || shardTree.autoAscendDue(pending, t - runStart)) {
        if (manual) lastManualAscendHour = currentHour;
        resets.push(t);
        upgradesPerRun.push(us.getBoughtCount());
        ps.ascend(true);
        runStart = t;
        dustShop.buyAll(t);
      }
    }

    if (regainFrom && gs.getNetAetherPerSecond().gte(regainFrom.cps)) {
      regainDays.push((t - regainFrom.t) / DAY);
      regainFrom = null;
    }
    if (ps.canTranscend()) {
      if (!regainFrom) regainFrom = { t, cps: gs.getNetAetherPerSecond() };
      else regainFrom.cps = regainFrom.cps.max(gs.getNetAetherPerSecond());
      transcends.push(t);
      transcendAether.push(layerPeak);
      layerPeak = BigNum.zero();
      resets.push(t);
      ps.transcend();
      runStart = t;
      shardTree.buyNodes();
      dustShop.buyAll(t);
      if (autoAscendDay === null && shardTree.owns('chronos_auto_ascend')) autoAscendDay = t / DAY;
      lastTranscendAt = t;
    }
    if (chronicle.maybeChronicle(t, lastTranscendAt)) {
      resets.push(t);
      runStart = t;
      regainFrom = null;
    }

    if (dailyIn(t, dt, TARGETS.twoMonthWindowDays)) twoMonthSamples.push(gs.totalAetherEarned);
    if (dailyIn(t, dt, TARGETS.lateWindowDays)) lateSamples.push(gs.totalAetherEarned);
    while (ci < CHECKPOINTS.length && t >= CHECKPOINTS[ci][1]) {
      rows.push({
        label: CHECKPOINTS[ci][0],
        cps: gs.getNetAetherPerSecond().format('scientific', 2),
        run: gs.totalAetherEarned.format('scientific', 2),
        runBig: gs.totalAetherEarned,
        life: lifetimeAether.format('scientific', 2),
        asc: gs.ascensionCount,
        dust: gs.totalCosmicDust.format('scientific', 2),
        trans: gs.transcendenceCount,
        tiers: bs.getUnlockedTierCount(),
        chron: gs.chronicle.count,
        pages: gs.chronicle.totalPages,
        upgrades: us.getBoughtCount()
      });
      ci++;
    }
  }

  // Longest stretch with no reset between day 1 and the gap window end.
  let maxGap = 0, prev = DAY;
  for (const r of resets.filter(r => r > DAY && r <= TARGETS.gapWindowEndDay * DAY)) {
    maxGap = Math.max(maxGap, r - prev); prev = r;
  }
  maxGap = Math.max(maxGap, TARGETS.gapWindowEndDay * DAY - prev);

  // Last day up to which every stretch since day 1 stayed within the gap target
  let keptUntil = YEAR;
  prev = DAY;
  for (const r of [...resets.filter(r => r > DAY), YEAR]) {
    if (r - prev > TARGETS.maxGapDaysAfterDay1 * DAY) { keptUntil = prev; break; }
    prev = r;
  }

  return {
    rows,
    firstResetMin: resets.length ? resets[0] / 60 : Infinity,
    resetsDay0: resets.filter(r => r < DAY).length,
    resetsYear: resets.length,
    transcendDays: transcends.map(x => x / DAY),
    transcendAether,
    regainDays,
    maxGapDays: maxGap / DAY,
    upgradesPerRun,
    autoAscendDay,
    shopFirstBuy: dustShop.firstBuy,
    amplifierRank: gs.dustShop.ranks.dust_amplifier || 0,
    chronicles: chronicle.log,
    twoMonthMedian: medianBig(twoMonthSamples),
    lateMedian: medianBig(lateSamples),
    latePeak: lateSamples.reduce((m, x) => (x.gt(m) ? x : m), BigNum.zero()),
    monthPeak,
    gapKeptUntilDay: keptUntil / DAY
  };
}

const assertMode = process.argv.includes('--assert');
const failures = [];
const out = [];
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7);   // --only=casual: one profile (tuning)
if (LINKS) out.push('(--links: subgame links on, schedule in the R53 block)');
out.push(`Attunement every run (R55): ${ATTUNEMENT}`);
const describeCfg = (cfg) => `${cfg.links ? 'links on' : 'links off'}, ${cfg.attune}`;
const upgradesMedian = (r) => { const u = [...r.upgradesPerRun].sort((a, b) => a - b); return u.length ? u[u.length >> 1] : 0; };
// R57 targets, checked for every configuration the run covers
function checkR57(r, profile, cfg) {
  const tag = `${profile}, ${describeCfg(cfg)}`;
  const [l0, l1] = TARGETS.lateWindowDays;
  if (r.lateMedian.gt(TARGETS.lateMedianAetherMax)) {
    failures.push(`${tag}: median run Aether over days ${l0}-${l1} ${r.lateMedian.format('scientific', 2)} > ${TARGETS.lateMedianAetherMax.toExponential()}`);
  }
  if (r.latePeak.gt(TARGETS.latePeakAetherMax)) {
    failures.push(`${tag}: highest run Aether over days ${l0}-${l1} ${r.latePeak.format('scientific', 2)} > ${TARGETS.latePeakAetherMax.toExponential()}`);
  }
  if (profile === 'casual' && !cfg.links) {
    const [w0, w1] = TARGETS.twoMonthWindowDays;
    if (r.twoMonthMedian.gt(TARGETS.casualTwoMonthAetherMax)) {
      failures.push(`${tag}: median run Aether over days ${w0}-${w1} ${r.twoMonthMedian.format('scientific', 2)} > ${TARGETS.casualTwoMonthAetherMax.toExponential()}`);
    }
    if (r.twoMonthMedian.lt(TARGETS.casualTwoMonthAetherMin)) {
      failures.push(`${tag}: median run Aether over days ${w0}-${w1} ${r.twoMonthMedian.format('scientific', 2)} < ${TARGETS.casualTwoMonthAetherMin.toExponential()}`);
    }
  }
}
for (const profile of ['idle', 'casual'].filter(p => !only || p === only)) {
  const r = run(profile);
  out.push(`\n### profile: ${profile}\n`);
  out.push('| time | CPS | run Aether | lifetime Aether | Ascensions | lifetime dust (this layer) | Transcends (this Chronicle) | tiers | upgrades (this run) | Chronicles | Pages earned |');
  out.push('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const row of r.rows) out.push(`| ${row.label} | ${row.cps} | ${row.run} | ${row.life} | ${row.asc} | ${row.dust} | ${row.trans} | ${row.tiers} | ${row.upgrades} | ${row.chron} | ${row.pages} |`);
  out.push('');
  out.push(`- first Ascension: ${r.firstResetMin.toFixed(1)} min`);
  if (r.upgradesPerRun.length) {
    out.push(`- upgrades bought per Ascension run: median ${upgradesMedian(r)}, max ${Math.max(...r.upgradesPerRun)} (first run ${r.upgradesPerRun[0]})`);
  }
  out.push(`- resets (Ascensions + Transcends) on day 0: ${r.resetsDay0}; in the year: ${r.resetsYear}`);
  if (r.regainDays.length) {
    const sorted = [...r.regainDays].sort((a, b) => a - b);
    out.push(`- CPS back to its pre-Transcend level after: median ${sorted[sorted.length >> 1].toFixed(1)} d, max ${sorted.at(-1).toFixed(1)} d (${sorted.length} of ${r.transcendDays.length} Transcends)`);
  }
  out.push(`- Auto-Ascend bought: ${r.autoAscendDay === null ? 'never' : `day ${r.autoAscendDay.toFixed(1)}`}`);
  out.push(`- dust shop, first bought (day): ${[...r.shopFirstBuy].map(([id, d]) => `${id} ${d.toFixed(2)}`).join(', ') || 'nothing'}; Dust Amplifier rank at year end ${r.amplifierRank}`);
  out.push(`- Transcends at day: ${r.transcendDays.length ? r.transcendDays.map(d => d.toFixed(1)).join(', ') : 'none'}`);
  out.push(`- highest run Aether before each Transcend (first 12): ${r.transcendAether.length ? r.transcendAether.slice(0, 12).map(a => a.format('scientific', 1)).join(', ') : 'none'}`);
  out.push(`- Chronicles at day: ${r.chronicles.length ? r.chronicles.map(c => {
    const next = r.transcendDays.find(d => d > c.day);
    return `${c.day.toFixed(1)} (CPS before it ${c.cps}, +${c.pages} Pages, first Transcend after it ${next === undefined ? 'never' : `+${(next - c.day).toFixed(1)} d`})`;
  }).join(', ') : 'none'}`);
  // Transcend storms (R20): each Transcend is an epic ceremony, so they should not bunch up
  const close = r.transcendDays.filter((d, i) => i > 0 && d - r.transcendDays[i - 1] < 0.25).length;
  out.push(`- Transcends less than 6 h after the previous one: ${close} of ${r.transcendDays.length}`);
  out.push(`- median run Aether over days ${TARGETS.twoMonthWindowDays.join('-')}: ${r.twoMonthMedian.format('scientific', 2)}`);
  out.push(`- run Aether over days ${TARGETS.lateWindowDays.join('-')} (R57): median ${r.lateMedian.format('scientific', 2)}, highest ${r.latePeak.format('scientific', 2)}`);
  out.push(`- highest run Aether per month: ${r.monthPeak.slice(0, 12).map((x, i) => `${i + 1}: ${x.format('scientific', 1)}`).join(', ')}`);
  out.push(`- Chronicles in the year: ${r.chronicles.length}; Pages earned: ${r.rows.at(-1).pages}`);
  out.push(`- longest stretch with no reset (day 1..${TARGETS.gapWindowEndDay}): ${r.maxGapDays.toFixed(1)} days`);
  out.push(`- a reset at least every ${TARGETS.maxGapDaysAfterDay1} days until day ${r.gapKeptUntilDay.toFixed(0)}`);
  if (profile === 'idle' && r.firstResetMin > TARGETS.idleFirstAscensionMaxMin) {
    failures.push(`idle first Ascension at ${r.firstResetMin.toFixed(1)} min > ${TARGETS.idleFirstAscensionMaxMin} min`);
  }
  checkR57(r, profile, { links: LINKS, attune: ATTUNEMENT });
  if (profile === 'casual') {
    if (r.firstResetMin > TARGETS.firstAscensionMaxMin) {
      failures.push(`first Ascension at ${r.firstResetMin.toFixed(1)} min > ${TARGETS.firstAscensionMaxMin} min`);
    }
    const upMedian = upgradesMedian(r);
    if (upMedian < TARGETS.casualUpgradesPerRunMin) {
      failures.push(`median ${upMedian} upgrades per Ascension run < ${TARGETS.casualUpgradesPerRunMin}`);
    }
    if (r.maxGapDays > TARGETS.maxGapDaysAfterDay1) {
      failures.push(`${r.maxGapDays.toFixed(1)}-day stretch with no reset > ${TARGETS.maxGapDaysAfterDay1} days`);
    }
  }
}

// R57: with --assert, also run the other configurations (links on, each other attunement) and
// check their targets; one summary line each
if (assertMode) {
  const extra = [{ links: true, attune: DEFAULT_ATTUNEMENT }, ...ATTUNEMENT_IDS.map(attune => ({ links: false, attune }))]
    .filter(c => c.links !== LINKS || c.attune !== ATTUNEMENT);
  out.push('\n### other configurations (--assert, R57)\n');
  out.push(`| configuration | profile | median run Aether days ${TARGETS.twoMonthWindowDays.join('-')} | median / highest days ${TARGETS.lateWindowDays.join('-')} | Chronicles / Pages | upgrades per run (median) |`);
  out.push('|---|---|---|---|---|---|');
  for (const cfg of extra) {
    for (const profile of ['idle', 'casual'].filter(p => !only || p === only)) {
      const r = run(profile, cfg);
      out.push(`| ${describeCfg(cfg)} | ${profile} | ${r.twoMonthMedian.format('scientific', 2)} | ${r.lateMedian.format('scientific', 2)} / ${r.latePeak.format('scientific', 2)} | ${r.chronicles.length} / ${r.rows.at(-1).pages} | ${upgradesMedian(r)} |`);
      checkR57(r, profile, cfg);
    }
  }
}

console.log('## Core pacing report (sim/core-pacing.mjs)');
console.log(`\nCasual active multiplier while present: x${ACTIVE_MULT.toFixed(2)} of generator output; active / idle with Auto-tap x${ACTIVE_IDLE_RATIO.toFixed(2)} (R3/R52, sim/active-income.mjs)`);
console.log(out.join('\n'));
console.log(`\nYear-one targets (casual; idle first Ascension): ${failures.length ? 'MISSED' : 'met'}`);
for (const f of failures) console.log(`- ${f}`);
if (assertMode && failures.length) process.exit(1);
