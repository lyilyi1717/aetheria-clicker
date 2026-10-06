// Core pacing simulator: drives the real GameState / BuildingSystem / PrestigeSystem classes
// for a simulated year with subgames off, to measure the Aether -> Cosmic Dust rhythm.
// See docs/redesign-proposal.md §2.1 and §6.4 for what these numbers mean.
//
//   node sim/core-pacing.mjs            # print the report
//   node sim/core-pacing.mjs --assert   # also fail (exit 1) if the year-one targets are missed
//
// Profiles:
//   idle   : taps 1/s for the first 3 min of every run, never casts; greedy-buys every 5 s
//   casual : present 10 min of every hour (2 clicks/s at full combo, spells on cooldown,
//            anomalies clicked), approximated as an income multiplier from the spell/anomaly code
// Ascend policy: when pending dust >= max(10, current dust) and the run is at least 10 min old,
// by hand only while the player is there (casual: the 10 present minutes of each hour; idle: a
// glance once an hour) until the shard tree's Auto-Ascend is bought, then whenever the rule is met
// (R13; see the shard-tree block below).
// Transcend policy: as soon as lifetime dust reaches the gate (R4). Each Transcend unlocks the
// next generator tier and counts as a reset in the gap measurement.
// Upgrade shop (R5): upgrades compete with generators in the same greedy loop, by Aether/s gained
// per Aether spent (see makeUpgradeShopBuyer below).
//
// When an economy PR changes the core (new prestige layer, shop, formulas), update this script
// so it still models what a real player would do, and paste the before/after report in the PR.
import { BigNum } from '../js/engine/BigNum.js';
import { GameState } from '../js/systems/GameState.js';
import { BuildingSystem, BUILDING_DEFINITIONS, MAX_TIER_COUNT } from '../js/systems/BuildingSystem.js';
import { PrestigeSystem, ASCENSION_PERKS } from '../js/systems/PrestigeSystem.js';
import { AchievementSystem } from '../js/systems/AchievementSystem.js';
import { UpgradeSystem, TIER_UPGRADE_MULT, SYNERGY_PER_UNIT, UPGRADE_DEFINITIONS, getUpgradeDefinition } from '../js/systems/UpgradeSystem.js';
import { particles } from '../js/engine/ParticleEngine.js';
import { ShardTreeSystem, autoAscendRuleMet, getDeepBlueprintDivisor, canBuyNode } from '../js/systems/ShardTreeSystem.js';

globalThis.window = globalThis.window || { innerWidth: 1000, innerHeight: 800 };
particles.suppressed = true;

const DAY = 86400;
const YEAR = 365 * DAY;

// Year-one targets from docs/redesign-proposal.md (§4.2, §6.4). Enforced only with --assert.
export const TARGETS = {
  firstAscensionMaxMin: 30,      // casual player's first Ascension within 30 min
  maxGapDaysAfterDay1: 14,       // never more than 14 days without a reset (days 1..gapWindowEndDay)
  // The doc's goal is day 270. With Transcend (R4) the casual core keeps a reset at least every
  // 14 days until ~day 190, then layer 2 stalls (doc §6.4: Chronicle needed). R20 restores 270.
  gapWindowEndDay: 180
};

const CHECKPOINTS = [
  ['10 min', 600], ['1 h', 3600], ['1 d', DAY], ['1 w', 7 * DAY],
  ['1 mo', 30 * DAY], ['3 mo', 90 * DAY], ['6 mo', 180 * DAY], ['1 y', YEAR]
];

// --- R5 upgrade shop block -------------------------------------------------------------------
// The sim buys upgrades in the same greedy loop as generators, by log10(Aether/s gained per
// Aether spent) in the generator greedy's units (generator output before global multipliers).
// Click upgrades are valued at the current click rate (clicks/s x combo), converted into those
// units by dividing by the global multiplier.
//   shop.refresh()           at the start of each greedy pass: collect available upgrades
//   shop.onBuilding(id)      after a generator purchase: its upgrades/synergies may have opened
//   shop.best(budget, rate)  -> { id, ratio } | null, the best affordable available upgrade
//   shop.buy(id)             buys it and updates the candidate list
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
    buy(id) {
      if (!us.buy(id)) return false;
      candidates.delete(id);
      const u = us.definitions.find(d => d.id === id);
      if (u.kind === 'click' && us.isAvailable(`click_${u.level + 1}`)) candidates.add(`click_${u.level + 1}`);
      return true;
    },
    best(budgetLog, clickRate) {
      let best = null, bestRatio = -Infinity, globalLog = null;
      for (const id of candidates) {
        const u = getUpgradeDefinition(id);
        // Deep Blueprints (shard tree Foundry, R13) divide a tier's own upgrade prices
        const c = costLog.get(id) - (u.kind === 'tier' ? Math.log10(getDeepBlueprintDivisor(gs, u.tier)) : 0);
        if (c > budgetLog + 1e-9) continue;
        let gainLog;
        if (u.kind === 'click') {
          if (clickRate <= 0) continue;
          if (globalLog === null) {
            const base = bs.getTotalProduction();
            globalLog = base.gt(0) ? lg(gs.getNetAetherPerSecond()) - lg(base) : 0;
          }
          gainLog = lg(gs.getClickBase()) + Math.log10(clickRate) - globalLog;
        } else if (u.kind === 'tier') {
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
      for (let tier = 15; tier <= MAX_TIER_COUNT; tier++) {
        const id = `foundry_t${tier}`;
        if (!tree.has(id) && canBuyNode(gs, id)) tree.buy(id);
      }
    },
    // Auto-Ascend decision in sim time (the real system reads Date.now; same rule and minimum)
    autoAscendDue(pending, runSeconds) {
      return tree.has('chronos_auto_ascend') && gs.shardTree.autoAscend.enabled && runSeconds >= 600 &&
        autoAscendRuleMet(gs.shardTree.autoAscend, pending, gs.totalCosmicDust, runSeconds);
    },
    owns: (id) => tree.has(id)
  };
}
// ---------------------------------------------------------------------------------------------

function run(profile) {
  const gs = new GameState();
  const bs = new BuildingSystem(gs);
  const ps = new PrestigeSystem(gs);
  const ach = new AchievementSystem(gs);
  const us = new UpgradeSystem(gs);
  gs.buildingSystem = bs; gs.achievementSystem = ach; gs.upgradeSystem = us;
  const shop = makeUpgradeShopBuyer(gs, bs, us);
  let clickRate = 0; // clicks/s x combo right now, for valuing click upgrades

  gs.buildingSystem = bs; gs.achievementSystem = ach;
  const shardTree = makeShardTreeModel(gs, ps);
  let autoAscendDay = null;
  bs.buyAmount = 1;

  const presence = profile === 'casual' ? 600 : 0;
  // Aether Burst +4x, Celestial +1x, Supernova anomaly +1.67x, clicks +0.3x while present.
  const activeMult = (t) => (t % 3600 < presence ? 7.97 : 1);

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
      const up = shop.best(budget, clickRate);
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

  const buyPerks = () => {
    const def = ASCENSION_PERKS.find(p => p.id === 'eternal_resonance');
    for (let k = 0; def && k < 20; k++) {
      const st = gs.ascensionPerks.eternal_resonance;
      if (st.rank >= def.maxRank) break;
      const cost = def.cost * Math.pow(1.5, st.rank);
      const D = gs.cosmicDust.toNumber();
      if (D < cost) break;
      // The dust multiplier reads lifetime dust, so spending never lowers it: a rank is a pure gain.
      ps.buyPerk('eternal_resonance');
    }
    if (gs.ascensionPerks.genesis?.rank === 0 && gs.cosmicDust.toNumber() >= 15) ps.buyPerk('genesis');
  };

  const dtFor = (t) => t < 3600 ? 1 : t < DAY ? 10 : t < 7 * DAY ? 60 : 300;

  let t = 0, runStart = 0, ci = 0;
  const resets = [];
  const transcends = [];
  const upgradesPerRun = []; // R5: upgrades bought by the end of each Ascension run
  const regainDays = [];   // days after each Transcend until CPS is back to its pre-Transcend level
  let regainFrom = null;
  const rows = [];
  while (t < YEAR) {
    const dt = dtFor(t);
    const cps = gs.getNetAetherPerSecond();
    const present = t % 3600 < presence;
    const clicksPerSec = present ? 2 : (t - runStart < 180 ? 1 : 0);
    clickRate = (present ? 5 : 1) * clicksPerSec;
    const clickYield = gs.getClickBase().add(cps.mul(0.03)).mul(clickRate * dt);
    const income = cps.mul(dt * activeMult(t)).add(clickYield);
    gs.aether = gs.aether.add(income);
    gs.totalAetherEarned = gs.totalAetherEarned.add(income);
    t += dt;
    if (Math.floor(t / 5) !== Math.floor((t - dt) / 5) || dt >= 5) greedyBuy();
    ach.checkAchievements();

    const pending = ps.getPendingCosmicDust();
    if (pending.gt(0)) {
      // By hand while present (casual: up to the moment they leave; idle: one glance an hour), or by
      // Auto-Ascend once it is owned
      const here = profile === 'casual' ? t % 3600 <= presence : t % 3600 < dt;
      const manual = here && t - runStart >= 600 && pending.gte(gs.totalCosmicDust.max(10));
      if (manual || shardTree.autoAscendDue(pending, t - runStart)) {
        resets.push(t);
        upgradesPerRun.push(us.getBoughtCount());
        ps.ascend(true); // the sim enforces the 10-min minimum itself (virtual time, not Date.now)
        runStart = t;
      }
      buyPerks();
    }

    if (regainFrom && gs.getNetAetherPerSecond().gte(regainFrom.cps)) {
      regainDays.push((t - regainFrom.t) / DAY);
      regainFrom = null;
    }
    if (ps.canTranscend()) {
      if (!regainFrom) regainFrom = { t, cps: gs.getNetAetherPerSecond() };
      else regainFrom.cps = regainFrom.cps.max(gs.getNetAetherPerSecond());
      transcends.push(t);
      resets.push(t);
      ps.transcend();
      runStart = t;
      shardTree.buyNodes();
      if (autoAscendDay === null && shardTree.owns('chronos_auto_ascend')) autoAscendDay = t / DAY;
    }

    while (ci < CHECKPOINTS.length && t >= CHECKPOINTS[ci][1]) {
      rows.push({
        label: CHECKPOINTS[ci][0],
        cps: gs.getNetAetherPerSecond().format('scientific', 2),
        asc: gs.ascensionCount,
        dust: gs.totalCosmicDust.format('scientific', 2),
        trans: gs.transcendenceCount,
        tiers: bs.getUnlockedTierCount(),
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
    regainDays,
    maxGapDays: maxGap / DAY,
    upgradesPerRun,
    autoAscendDay,
    gapKeptUntilDay: keptUntil / DAY
  };
}

const assertMode = process.argv.includes('--assert');
const failures = [];
const out = [];
for (const profile of ['idle', 'casual']) {
  const r = run(profile);
  out.push(`\n### profile: ${profile}\n`);
  out.push('| time | CPS | Ascensions | lifetime dust (this layer) | Transcends | tiers | upgrades (this run) |');
  out.push('|---|---|---|---|---|---|---|');
  for (const row of r.rows) out.push(`| ${row.label} | ${row.cps} | ${row.asc} | ${row.dust} | ${row.trans} | ${row.tiers} | ${row.upgrades} |`);
  out.push('');
  out.push(`- first Ascension: ${r.firstResetMin.toFixed(1)} min`);
  if (r.upgradesPerRun.length) {
    const u = [...r.upgradesPerRun].sort((a, b) => a - b);
    out.push(`- upgrades bought per Ascension run: median ${u[u.length >> 1]}, max ${u.at(-1)} (first run ${r.upgradesPerRun[0]})`);
  }
  out.push(`- resets (Ascensions + Transcends) on day 0: ${r.resetsDay0}; in the year: ${r.resetsYear}`);
  if (r.regainDays.length) {
    const sorted = [...r.regainDays].sort((a, b) => a - b);
    out.push(`- CPS back to its pre-Transcend level after: median ${sorted[sorted.length >> 1].toFixed(1)} d, max ${sorted.at(-1).toFixed(1)} d (${sorted.length} of ${r.transcendDays.length} Transcends)`);
  }
  out.push(`- Auto-Ascend bought: ${r.autoAscendDay === null ? 'never' : `day ${r.autoAscendDay.toFixed(1)}`}`);
  out.push(`- Transcends at day: ${r.transcendDays.length ? r.transcendDays.map(d => d.toFixed(1)).join(', ') : 'none'}`);
  out.push(`- longest stretch with no reset (day 1..${TARGETS.gapWindowEndDay}): ${r.maxGapDays.toFixed(1)} days`);
  out.push(`- a reset at least every ${TARGETS.maxGapDaysAfterDay1} days until day ${r.gapKeptUntilDay.toFixed(0)}`);
  if (profile === 'casual') {
    if (r.firstResetMin > TARGETS.firstAscensionMaxMin) {
      failures.push(`first Ascension at ${r.firstResetMin.toFixed(1)} min > ${TARGETS.firstAscensionMaxMin} min`);
    }
    if (r.maxGapDays > TARGETS.maxGapDaysAfterDay1) {
      failures.push(`${r.maxGapDays.toFixed(1)}-day stretch with no reset > ${TARGETS.maxGapDaysAfterDay1} days`);
    }
  }
}

console.log('## Core pacing report (sim/core-pacing.mjs)');
console.log(out.join('\n'));
console.log(`\nYear-one targets (casual): ${failures.length ? 'MISSED' : 'met'}`);
for (const f of failures) console.log(`- ${f}`);
if (assertMode && failures.length) process.exit(1);
