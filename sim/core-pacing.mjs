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
// Chronicle policy (R20, layer 3): see the Chronicle block below.
//
// When an economy PR changes the core (new prestige layer, shop, formulas), update this script
// so it still models what a real player would do, and paste the before/after report in the PR.
import { BigNum } from '../js/engine/BigNum.js';
import { GameState } from '../js/systems/GameState.js';
import { BuildingSystem, BUILDING_DEFINITIONS } from '../js/systems/BuildingSystem.js';
import { PrestigeSystem, ASCENSION_PERKS } from '../js/systems/PrestigeSystem.js';
import { AchievementSystem } from '../js/systems/AchievementSystem.js';
import { particles } from '../js/engine/ParticleEngine.js';
import { ShardTreeSystem, autoAscendRuleMet } from '../js/systems/ShardTreeSystem.js';
import { ChronicleSystem, chronicleClock, PAGE_UPGRADES } from '../js/systems/ChronicleSystem.js';

globalThis.window = globalThis.window || { innerWidth: 1000, innerHeight: 800 };
particles.suppressed = true;

const DAY = 86400;
const YEAR = 365 * DAY;

// Year-one targets from docs/redesign-proposal.md (§4.2, §6.4). Enforced only with --assert.
export const TARGETS = {
  firstAscensionMaxMin: 30,      // casual player's first Ascension within 30 min
  maxGapDaysAfterDay1: 14,       // never more than 14 days without a reset (days 1..gapWindowEndDay)
  // The doc's goal (day 270). Layer 2 alone stalls ~day 185 (doc §6.4); the Chronicle (R20)
  // restarts the Transcend ladder so resets keep coming.
  gapWindowEndDay: 270
};

const CHECKPOINTS = [
  ['10 min', 600], ['1 h', 3600], ['1 d', DAY], ['1 w', 7 * DAY],
  ['1 mo', 30 * DAY], ['3 mo', 90 * DAY], ['6 mo', 180 * DAY], ['1 y', YEAR]
];

// ---- Shard tree (R13) ---------------------------------------------------------------------
// The player buys Auto-Ascend (2 shards) as soon as the first Transcend pays for it and keeps the
// default rule (x2 lifetime dust, the same threshold the manual policy uses). Nothing else on the
// tree changes this model: Foundry needs the upgrade shop, the sim has no offline gap for Long
// Sleep or Hourglass to fill, and Tower nodes don't touch the core economy.
function makeShardTreeModel(gs, ps) {
  const tree = new ShardTreeSystem(gs, ps);
  return {
    buyNodes() {
      if (!tree.has('chronos_auto_ascend')) tree.buy('chronos_auto_ascend');
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

// ---- Chronicle (R20) ------------------------------------------------------------------------
// The Chapter's 10-week window runs on the sim clock (chronicleClock). Policy: begin a Chronicle
// once it is allowed and layer 2 has slowed down (the last Transcend is at least
// CHRONICLE_AFTER_SLOW_DAYS old), which is when a player would trade the Transcend ladder for
// Pages. Pages go to Page upgrades in PAGE_BUY_ORDER as soon as they are affordable. The sim does
// not play challenges (their Pages would only make it faster), so this is the slow case.
const SIM_EPOCH = Date.UTC(2026, 0, 1);
const CHRONICLE_AFTER_SLOW_DAYS = 7;
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
      if (!sys.canChronicle() || t - lastTranscendAt < CHRONICLE_AFTER_SLOW_DAYS * DAY) return false;
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
// ---------------------------------------------------------------------------------------------

function run(profile) {
  const gs = new GameState();
  const bs = new BuildingSystem(gs);
  const ps = new PrestigeSystem(gs);
  const ach = new AchievementSystem(gs);
  gs.buildingSystem = bs; gs.achievementSystem = ach;
  const shardTree = makeShardTreeModel(gs, ps);
  let t = 0;
  const chronicle = makeChronicleModel(gs, ps, () => t);
  let lastTranscendAt = 0;
  let autoAscendDay = null;
  bs.buyAmount = 1;

  const presence = profile === 'casual' ? 600 : 0;
  // Aether Burst +4x, Celestial +1x, Supernova anomaly +1.67x, clicks +0.3x while present.
  const activeMult = (t) => (t % 3600 < presence ? 7.97 : 1);

  // Greedy: buy the generator with the best Aether/s gained per Aether spent, one at a time.
  // Compared in log10 space (same ordering as the BigNum maths, ~20x faster with 30 tiers).
  const lg = (x) => Math.log10(Math.abs(x.m)) + x.e;
  const LOG_R = Math.log10(1.15);
  const greedyBuy = () => {
    const unlocked = BUILDING_DEFINITIONS.slice(0, bs.getUnlockedTierCount());
    const costMult = Math.log10(bs.getCostMultiplier());
    for (let k = 0; k < 50; k++) {
      if (gs.aether.m <= 0) return;
      const budget = lg(gs.aether);
      let best = null, bestRatio = -Infinity;
      for (const def of unlocked) {
        const cnt = gs.buildings[def.id].count;
        const cost = lg(def.baseCost) + cnt * LOG_R + costMult;
        if (cost > budget + 1e-9) continue;
        const gain = (cnt + 1) * bs.getMilestoneMultiplier(cnt + 1) - cnt * bs.getMilestoneMultiplier(cnt);
        const ratio = lg(def.baseCps) + Math.log10(gain) - cost;
        if (ratio > bestRatio) { bestRatio = ratio; best = def.id; }
      }
      if (!best || !bs.buyBuilding(best)) return;
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

  let runStart = 0, ci = 0;
  const resets = [];
  const transcends = [];
  const regainDays = [];   // days after each Transcend until CPS is back to its pre-Transcend level
  let regainFrom = null;
  const rows = [];
  while (t < YEAR) {
    const dt = dtFor(t);
    const cps = gs.getNetAetherPerSecond();
    const present = t % 3600 < presence;
    const clicksPerSec = present ? 2 : (t - runStart < 180 ? 1 : 0);
    const clickYield = gs.clickPower.add(cps.mul(0.03)).mul((present ? 5 : 1) * clicksPerSec * dt);
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
      lastTranscendAt = t;
    }
    if (chronicle.maybeChronicle(t, lastTranscendAt)) {
      resets.push(t);
      runStart = t;
      regainFrom = null;
    }

    while (ci < CHECKPOINTS.length && t >= CHECKPOINTS[ci][1]) {
      rows.push({
        label: CHECKPOINTS[ci][0],
        cps: gs.getNetAetherPerSecond().format('scientific', 2),
        asc: gs.ascensionCount,
        dust: gs.totalCosmicDust.format('scientific', 2),
        trans: gs.transcendenceCount,
        tiers: bs.getUnlockedTierCount(),
        chron: gs.chronicle.count,
        pages: gs.chronicle.totalPages
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
    autoAscendDay,
    chronicles: chronicle.log,
    gapKeptUntilDay: keptUntil / DAY
  };
}

const assertMode = process.argv.includes('--assert');
const failures = [];
const out = [];
for (const profile of ['idle', 'casual']) {
  const r = run(profile);
  out.push(`\n### profile: ${profile}\n`);
  out.push('| time | CPS | Ascensions | lifetime dust (this layer) | Transcends (this Chronicle) | tiers | Chronicles | Pages earned |');
  out.push('|---|---|---|---|---|---|---|---|');
  for (const row of r.rows) out.push(`| ${row.label} | ${row.cps} | ${row.asc} | ${row.dust} | ${row.trans} | ${row.tiers} | ${row.chron} | ${row.pages} |`);
  out.push('');
  out.push(`- first Ascension: ${r.firstResetMin.toFixed(1)} min`);
  out.push(`- resets (Ascensions + Transcends) on day 0: ${r.resetsDay0}; in the year: ${r.resetsYear}`);
  if (r.regainDays.length) {
    const sorted = [...r.regainDays].sort((a, b) => a - b);
    out.push(`- CPS back to its pre-Transcend level after: median ${sorted[sorted.length >> 1].toFixed(1)} d, max ${sorted.at(-1).toFixed(1)} d (${sorted.length} of ${r.transcendDays.length} Transcends)`);
  }
  out.push(`- Auto-Ascend bought: ${r.autoAscendDay === null ? 'never' : `day ${r.autoAscendDay.toFixed(1)}`}`);
  out.push(`- Transcends at day: ${r.transcendDays.length ? r.transcendDays.map(d => d.toFixed(1)).join(', ') : 'none'}`);
  out.push(`- Chronicles at day: ${r.chronicles.length ? r.chronicles.map(c => {
    const next = r.transcendDays.find(d => d > c.day);
    return `${c.day.toFixed(1)} (CPS before it ${c.cps}, +${c.pages} Pages, first Transcend after it ${next === undefined ? 'never' : `+${(next - c.day).toFixed(1)} d`})`;
  }).join(', ') : 'none'}`);
  // Transcend storms (R20): each Transcend is an epic ceremony, so they should not bunch up
  const close = r.transcendDays.filter((d, i) => i > 0 && d - r.transcendDays[i - 1] < 0.25).length;
  out.push(`- Transcends less than 6 h after the previous one: ${close} of ${r.transcendDays.length}`);
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
