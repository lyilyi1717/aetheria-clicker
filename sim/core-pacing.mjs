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
// Ascend policy: when pending dust >= max(10, current dust) and the run is at least 10 min old.
//
// When an economy PR changes the core (new prestige layer, shop, formulas), update this script
// so it still models what a real player would do, and paste the before/after report in the PR.
import { BigNum } from '../js/engine/BigNum.js';
import { GameState } from '../js/systems/GameState.js';
import { BuildingSystem, BUILDING_DEFINITIONS } from '../js/systems/BuildingSystem.js';
import { PrestigeSystem, ASCENSION_PERKS } from '../js/systems/PrestigeSystem.js';
import { AchievementSystem } from '../js/systems/AchievementSystem.js';
import { particles } from '../js/engine/ParticleEngine.js';

globalThis.window = globalThis.window || { innerWidth: 1000, innerHeight: 800 };
particles.suppressed = true;

const DAY = 86400;
const YEAR = 365 * DAY;

// Year-one targets from docs/redesign-proposal.md (§4.2, §6.4). Enforced only with --assert.
export const TARGETS = {
  firstAscensionMaxMin: 30,      // casual player's first Ascension within 30 min
  maxGapDaysAfterDay1: 14,       // never more than 14 days without a reset (days 1..270)
  gapWindowEndDay: 270
};

const CHECKPOINTS = [
  ['10 min', 600], ['1 h', 3600], ['1 d', DAY], ['1 w', 7 * DAY],
  ['1 mo', 30 * DAY], ['3 mo', 90 * DAY], ['6 mo', 180 * DAY], ['1 y', YEAR]
];

function run(profile) {
  const gs = new GameState();
  const bs = new BuildingSystem(gs);
  const ps = new PrestigeSystem(gs);
  const ach = new AchievementSystem(gs);
  gs.buildingSystem = bs; gs.achievementSystem = ach;
  bs.buyAmount = 1;

  const presence = profile === 'casual' ? 600 : 0;
  // Aether Burst +4x, Celestial +1x, Supernova anomaly +1.67x, clicks +0.3x while present.
  const activeMult = (t) => (t % 3600 < presence ? 7.97 : 1);

  const greedyBuy = () => {
    for (let k = 0; k < 50; k++) {
      let best = null, bestRatio = 0;
      for (const def of BUILDING_DEFINITIONS) {
        const cost = bs.getBuildingCost(def.id, 1);
        if (gs.aether.lt(cost)) continue;
        const cnt = gs.buildings[def.id].count;
        const before = bs.getBuildingProduction(def.id);
        gs.buildings[def.id].count = cnt + 1;
        const after = bs.getBuildingProduction(def.id);
        gs.buildings[def.id].count = cnt;
        const ratio = after.sub(before).div(cost).toNumber();
        if (ratio > bestRatio) { bestRatio = ratio; best = def.id; }
      }
      if (!best) return;
      bs.buyBuilding(best);
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
      const before = (1 + 0.02 * D) * (1 + 0.5 * st.rank);
      const after = (1 + 0.02 * (D - cost)) * (1 + 0.5 * (st.rank + 1));
      if (after <= before) break;
      ps.buyPerk('eternal_resonance');
    }
    if (gs.ascensionPerks.genesis?.rank === 0 && gs.cosmicDust.toNumber() >= 15) ps.buyPerk('genesis');
  };

  const dtFor = (t) => t < 3600 ? 1 : t < DAY ? 10 : t < 7 * DAY ? 60 : 300;

  let t = 0, runStart = 0, ci = 0;
  const resets = [];
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
      if (t - runStart >= 600 && pending.toNumber() >= Math.max(10, gs.cosmicDust.toNumber())) {
        resets.push(t);
        ps.ascend();
        runStart = t;
      }
      buyPerks();
    }

    while (ci < CHECKPOINTS.length && t >= CHECKPOINTS[ci][1]) {
      rows.push({
        label: CHECKPOINTS[ci][0],
        cps: gs.getNetAetherPerSecond().format('scientific', 2),
        asc: gs.ascensionCount,
        dust: gs.totalCosmicDust.format('scientific', 2)
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

  return {
    rows,
    firstResetMin: resets.length ? resets[0] / 60 : Infinity,
    resetsDay0: resets.filter(r => r < DAY).length,
    resetsYear: resets.length,
    maxGapDays: maxGap / DAY
  };
}

const assertMode = process.argv.includes('--assert');
const failures = [];
const out = [];
for (const profile of ['idle', 'casual']) {
  const r = run(profile);
  out.push(`\n### profile: ${profile}\n`);
  out.push('| time | CPS | Ascensions | lifetime dust |');
  out.push('|---|---|---|---|');
  for (const row of r.rows) out.push(`| ${row.label} | ${row.cps} | ${row.asc} | ${row.dust} |`);
  out.push('');
  out.push(`- first Ascension: ${r.firstResetMin.toFixed(1)} min`);
  out.push(`- Ascensions on day 0: ${r.resetsDay0}; in the year: ${r.resetsYear}`);
  out.push(`- longest stretch with no reset (day 1..${TARGETS.gapWindowEndDay}): ${r.maxGapDays.toFixed(1)} days`);
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
