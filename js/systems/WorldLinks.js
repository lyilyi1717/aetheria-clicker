// Subgame -> Oil links (R53, design doc §5.3 / §6.1). Every link from another tab into Oil
// production adds into ONE category, 1 + the sum of the bonuses, capped at +WORLD_LINK_CAP, instead
// of multiplying with the others. With the R31 numbers the old links (+2% per depth, +25% per
// Treaty rank, +5% per Enchanter level, ...) compounded to ~x200 by month one and pushed the
// 2-month run Oil from ~1e12 to ~1e16 (`npm run sim -- --links`). The core's late Transcends are
// sensitive to any steady multiplier, so the links stay near x2 by month two and x2.5 at most.
// Pure functions of saved state, shared by GameState (production) and the Universal Mastery
// readout (js/tabBonuses.js).

export const BUILDING_LINK_PER_100 = 0.015;   // Building Mastery: +1.5% per 100 generators owned
export const DUNGEON_LINK_PER_10 = 0.01;      // Dungeon Mastery: +1% per 10 bosses slain
export const DEPTH_LINK_PER_DEPTH = 0.002;    // Depth Resonance: +0.2% per max depth (was +2%)
export const ENCHANTER_LINK_PER_LEVEL = 0.004; // High Enchanter (Golden Synergy): +0.4% per level (was +5%)
export const TREATY_LINK_PER_RANK = 0.02;     // Quartermaster Aetheric Treaty: +2% per rank (was +25%)
export const CATALYST_LINK_PER_BREW = 0.002;  // Philosopher's Catalyst: +0.2% per catalyst (was +2%)
export const WORLD_LINK_CAP = 1.5;            // all links together: at most +150%

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function totalBuildings(gs) {
  let n = 0;
  for (const id in gs.buildings || {}) n += num(gs.buildings[id]?.count);
  return n;
}

// Each link's bonus (0.5 = +50%), in display order
export function getWorldLinkBonuses(gs) {
  return {
    building: BUILDING_LINK_PER_100 * Math.floor(totalBuildings(gs) / 100),
    dungeon: DUNGEON_LINK_PER_10 * Math.floor(num(gs.stats?.totalBossesSlain) / 10),
    depth: DEPTH_LINK_PER_DEPTH * num(gs.miningGrid?.maxDepth),
    enchanter: ENCHANTER_LINK_PER_LEVEL * num(gs.market?.goldenSynergy),
    treaty: TREATY_LINK_PER_RANK * num(gs.quartermaster?.aether_treaty?.rank),
    catalyst: CATALYST_LINK_PER_BREW * num(gs.alchemy?.catalysts)
  };
}

// Sum of the link bonuses before the cap
export function getWorldLinkSum(gs) {
  let sum = 0;
  for (const v of Object.values(getWorldLinkBonuses(gs))) sum += Math.max(0, v);
  return sum;
}

// The one multiplier all the links make together: 1 + sum of the bonuses, at most 1 + cap
export function getWorldLinkMult(gs) {
  return 1 + Math.min(WORLD_LINK_CAP, getWorldLinkSum(gs));
}
