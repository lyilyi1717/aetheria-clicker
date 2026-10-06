// Dust shop (design doc §6.2, roadmap R6): replaces the 7 Ascension perks with features bought
// with Cosmic Dust. Items open in tiers by lifetime Ascension count (1 / 3 / 5 / 10 / 20), so each
// stretch of Ascensions has something new to buy. Most items are one-time features; Chrono
// Reservoir and Titan's Legacy have 10 ranks, Dust Amplifier is repeatable.
//
// Spending dust never lowers production: the dust multiplier reads lifetime dust (R1).
// Transcend resets the shop with the dust (§6.1); the Auto-Buy on/off switch is a preference and
// stays.
//
// Pure functions of gameState (no audio, no DOM), so GameState, the sim and tests can use them.
// State: gameState.dustShop = { ranks: { [id]: rank }, autoBuy: bool, runClickBase: number }.
import { BigNum } from '../engine/BigNum.js';
import { BUILDING_DEFINITIONS } from './BuildingSystem.js';
import { addAscendKeepRule } from './UpgradeSystem.js';

// Lifetime Ascensions needed for each tier; 0 = open from the start ("any")
export const DUST_SHOP_TIERS = [1, 3, 5, 10, 20];

export const AUTO_BUY_INTERVAL = 10;          // seconds between Auto-Buy passes
export const AUTO_BUY_MAX_PER_PASS = 25;      // generators bought per pass at most
export const FINGER_CLICKS_PER_STEP = 100;    // Finger of Wasta: +1% per 100 clicks this run
export const FINGER_STEP = 0.01;
export const FINGER_CAP = 0.5;                // ... up to +50%
export const DUST_AMPLIFIER_STEP = 0.1;       // +10% dust gain per rank, additive
export const BLUEPRINT_MEMORY_LEVELS = 2;     // Blueprint Memory I keeps upgrades 1-2 of each tier
export const BLUEPRINT_MEMORY_2_TIERS = 7;    // Blueprint Memory II keeps everything of tiers 1-7
export const GENESIS_STALLS = 15;
export const GENESIS_GOLD = 1000;
export const RESONANT_START_TIERS = 10;     // Resonant Start gives 1 of each of generators 1-10

// Kept perks reuse their old ids (genesis, chrono_vault, titan_legacy, astral_alchemist,
// auto_leylines) so the save migration maps them one to one.
// cost: price of the first rank; growth: price multiplier per rank owned.
// see: where the feature shows up once owned (the card's "see it" line).
export const DUST_SHOP_ITEMS = [
  { id: 'genesis', tier: 1, icon: '🏪', name: 'Cosmic Genesis', cost: 5, maxRank: 1,
    desc: `Start every run with ${GENESIS_STALLS} Shawarma Stalls and ${GENESIS_GOLD.toLocaleString('en-US')} Gold.`, see: 'Working from your next run' },
  { id: 'blueprint_memory', tier: 1, icon: '📐', name: 'Blueprint Memory', cost: 25, maxRank: 1,
    desc: `Keep the first ${BLUEPRINT_MEMORY_LEVELS} upgrades of each generator through Ascension.`, see: 'Kept on your next Ascension' },
  { id: 'chrono_vault', tier: 1, icon: '⏳', name: 'Chrono Reservoir', cost: 25, growth: 1.5, maxRank: 10,
    desc: '+4 h of offline Aether at 100% per rank, and +50% Chrono Sand bank.', see: 'Offline report and sand bank' },
  { id: 'auto_buy', tier: 3, icon: '🤖', name: 'Auto-Buy', cost: 100, maxRank: 1,
    desc: `Buys the best-value generator every ${AUTO_BUY_INTERVAL} s. Switch it on or off on the Falafel tab.`, see: 'See it: Falafel tab' },
  { id: 'titan_legacy', tier: 3, icon: '🛡️', name: "Titan's Legacy", cost: 30, growth: 1.5, maxRank: 10,
    desc: 'Hero gets +100 HP and +25 Attack per rank.', see: 'See it: Tower' },
  { id: 'finger_of_wasta', tier: 3, icon: '👆', name: 'Finger of Wasta', cost: 150, maxRank: 1,
    desc: '+1% production per 100 clicks this run, up to +50%.', see: 'See it: Falafel tab bonuses' },
  { id: 'astral_alchemist', tier: 5, icon: '⚗️', name: 'Astral Crucible', cost: 40, maxRank: 1,
    desc: 'Elixirs last twice as long (and can stack twice as long).', see: 'See it: Alchemy' },
  { id: 'golem_covenant', tier: 5, icon: '🗿', name: 'Golem Covenant', cost: 200, maxRank: 1,
    desc: 'Garden Golems can be bought (Stone + Lemon Drops). Golems you own always keep working.', see: 'See it: Garden' },
  { id: 'hourglass', tier: 5, icon: '⌛', name: 'Hourglass of Al-Ula', cost: 300, maxRank: 1,
    desc: 'Adds 5 min and 1 h Fast Forward buttons (300 and 3,600 Chrono Sand).', see: 'See it: Fast Forward' },
  { id: 'auto_leylines', tier: 10, icon: '🔮', name: 'Automated Leylines', cost: 500, maxRank: 1,
    desc: 'Casts your spells for you whenever Mana is full.', see: 'See it: Grimoire' },
  { id: 'blueprint_memory_2', tier: 10, icon: '🏛️', name: 'Blueprint Memory II', cost: 1000, maxRank: 1,
    desc: `Keep every upgrade of generators 1-${BLUEPRINT_MEMORY_2_TIERS} (and click upgrades 1-${BLUEPRINT_MEMORY_2_TIERS}) through Ascension.`, see: 'Kept on your next Ascension' },
  { id: 'resonant_start', tier: 20, icon: '🎼', name: 'Resonant Start', cost: 5000, maxRank: 1,
    desc: `Start every run with 1 of each of the first ${RESONANT_START_TIERS} generators (${BUILDING_DEFINITIONS[0].name} to ${BUILDING_DEFINITIONS[RESONANT_START_TIERS - 1].name}).`, see: 'Working from your next run' },
  { id: 'dust_amplifier', tier: 0, icon: '✨', name: 'Dust Amplifier', cost: 100, growth: 2, maxRank: Infinity,
    desc: '+10% Cosmic Dust from every Ascension per rank (additive). Price doubles each rank.', see: 'See it: Ascend button' }
];

const ITEM_BY_ID = new Map(DUST_SHOP_ITEMS.map(d => [d.id, d]));

export function getShopItem(id) {
  return ITEM_BY_ID.get(id);
}

export function defaultDustShopState() {
  return { ranks: {}, autoBuy: true, runClickBase: 0 };
}

// Cleans a loaded (possibly missing, old or edited) save slice. Unknown ids are dropped and ranks
// clamped to the item's max. totalClicks seeds the run click counter for saves without one.
export function sanitizeDustShopState(raw, totalClicks = 0) {
  const s = defaultDustShopState();
  s.runClickBase = Math.max(0, Number(totalClicks) || 0);
  if (!raw || typeof raw !== 'object') return s;
  const ranks = raw.ranks && typeof raw.ranks === 'object' ? raw.ranks : {};
  for (const [id, v] of Object.entries(ranks)) {
    const def = ITEM_BY_ID.get(id);
    const r = Math.floor(Number(v));
    if (!def || !Number.isFinite(r) || r <= 0) continue;
    s.ranks[id] = Math.min(def.maxRank, r);
  }
  if (typeof raw.autoBuy === 'boolean') s.autoBuy = raw.autoBuy;
  const base = Number(raw.runClickBase);
  if (Number.isFinite(base) && base >= 0 && base <= s.runClickBase) s.runClickBase = base;
  return s;
}

const shopState = (gs) => {
  if (!gs.dustShop || typeof gs.dustShop !== 'object') gs.dustShop = defaultDustShopState();
  if (!gs.dustShop.ranks) gs.dustShop.ranks = {};
  return gs.dustShop;
};

export function getShopRank(gs, id) {
  return gs?.dustShop?.ranks?.[id] || 0;
}

export function hasShopItem(gs, id) {
  return getShopRank(gs, id) > 0;
}

// Price of the next rank, in dust
export function getShopItemCost(id, rank = 0) {
  const def = ITEM_BY_ID.get(id);
  if (!def) return BigNum.zero();
  if (!def.growth || rank <= 0) return new BigNum(def.cost);
  return new BigNum(def.growth).pow(rank).mul(def.cost).floor();
}

export function getNextShopCost(gs, id) {
  return getShopItemCost(id, getShopRank(gs, id));
}

export function isShopTierOpen(gs, tier) {
  return (gs?.ascensionCount || 0) >= tier;
}

export function isShopItemOpen(gs, id) {
  const def = ITEM_BY_ID.get(id);
  return !!def && isShopTierOpen(gs, def.tier);
}

export function isShopItemMaxed(gs, id) {
  const def = ITEM_BY_ID.get(id);
  return !!def && getShopRank(gs, id) >= def.maxRank;
}

// The lowest tier the player hasn't opened yet (null once all are open)
export function getNextShopTier(gs) {
  return DUST_SHOP_TIERS.find(t => !isShopTierOpen(gs, t)) ?? null;
}

export function canBuyShopItem(gs, id) {
  if (!isShopItemOpen(gs, id) || isShopItemMaxed(gs, id)) return false;
  return gs.cosmicDust.gte(getNextShopCost(gs, id));
}

// Spends dust on one rank. Returns the new rank, or 0 if it couldn't be bought.
export function buyShopItem(gs, id) {
  if (!canBuyShopItem(gs, id)) return 0;
  gs.cosmicDust = gs.cosmicDust.sub(getNextShopCost(gs, id));
  const s = shopState(gs);
  s.ranks[id] = (s.ranks[id] || 0) + 1;
  return s.ranks[id];
}

// Transcend: everything bought goes with the dust (the Auto-Buy switch is a preference and stays)
export function resetDustShop(gs) {
  shopState(gs).ranks = {};
}

// --- Effects -----------------------------------------------------------------------------------

// Dust Amplifier: x(1 + 0.1 n) on pending dust, its own multiplicative category
export function getDustAmplifierMult(gs) {
  return 1 + DUST_AMPLIFIER_STEP * getShopRank(gs, 'dust_amplifier');
}

export function getRunClicks(gs) {
  return Math.max(0, (gs?.totalClicks || 0) - (gs?.dustShop?.runClickBase || 0));
}

// Finger of Wasta: x(1 + min(0.5, 0.01 x floor(run clicks / 100)))
export function getFingerOfWastaMult(gs) {
  if (!hasShopItem(gs, 'finger_of_wasta')) return 1;
  return 1 + Math.min(FINGER_CAP, FINGER_STEP * Math.floor(getRunClicks(gs) / FINGER_CLICKS_PER_STEP));
}

// Start of a run (PrestigeSystem.ascend): Genesis, Resonant Start, and the run click counter
export function applyRunStart(gs) {
  shopState(gs).runClickBase = gs.totalClicks || 0;
  if (hasShopItem(gs, 'genesis') && gs.buildings?.tapper) {
    gs.buildings.tapper.count = Math.max(gs.buildings.tapper.count || 0, GENESIS_STALLS);
    gs.gold = gs.gold.add(new BigNum(GENESIS_GOLD));
  }
  // Resonant Start covers generators 1-10 only. With every unlocked tier (doc draft) a fresh run
  // after Transcend began with tiers 15-30 already producing and layer 2 ran out of tiers by week 1;
  // with all 14 base tiers, the ladder right after a Chronicle (back to 14 tiers) was handed over
  // whole and Transcends bunched up (see docs/redesign-proposal.md 6.2 notes).
  if (hasShopItem(gs, 'resonant_start')) {
    for (const def of BUILDING_DEFINITIONS.slice(0, RESONANT_START_TIERS)) {
      const b = gs.buildings?.[def.id];
      if (b && (b.count || 0) < 1) b.count = 1;
    }
  }
}

// Blueprint Memory keep rules for the upgrade shop's Ascend reset (R5 hook)
export function blueprintMemoryKeeps(u, gs) {
  if (hasShopItem(gs, 'blueprint_memory') && u.kind === 'tier' && u.level <= BLUEPRINT_MEMORY_LEVELS) return true;
  if (hasShopItem(gs, 'blueprint_memory_2')) {
    if (u.kind === 'click') return u.level <= BLUEPRINT_MEMORY_2_TIERS;
    return u.tier >= 1 && u.tier <= BLUEPRINT_MEMORY_2_TIERS;
  }
  return false;
}
addAscendKeepRule(blueprintMemoryKeeps);

// --- Auto-Buy ----------------------------------------------------------------------------------

const lg = (x) => (x.m > 0 ? Math.log10(x.m) + x.e : -Infinity);

// The unlocked generator with the most Aether/s gained per Aether spent that one more of costs,
// or null if none is affordable. Gain counts milestones and the tier's upgrades, like
// BuildingSystem.getBuildingProduction (talent bonuses scale every tier alike or only costs).
export function pickAutoBuyTarget(gs, bs) {
  const budget = lg(gs.aether);
  let best = null, bestRatio = -Infinity;
  for (const def of BUILDING_DEFINITIONS.slice(0, bs.getUnlockedTierCount())) {
    const cost = bs.getBuildingCost(def.id, 1);
    const costLog = lg(cost);
    if (costLog > budget + 1e-12 || gs.aether.lt(cost)) continue;
    const cnt = gs.buildings[def.id].count;
    const gain = (cnt + 1) * bs.getMilestoneMultiplier(cnt + 1) - cnt * bs.getMilestoneMultiplier(cnt);
    const ratio = lg(def.baseCps) + Math.log10(gain * (gs.getTierUpgradeMult?.(def.id) ?? 1)) - costLog;
    if (ratio > bestRatio) { bestRatio = ratio; best = def.id; }
  }
  return best;
}

// One Auto-Buy pass: buys single generators, best value first. Returns { bought, ids }.
export function runAutoBuy(gs, bs, max = AUTO_BUY_MAX_PER_PASS) {
  const out = { bought: 0, ids: {} };
  if (!hasShopItem(gs, 'auto_buy') || !shopState(gs).autoBuy) return out;
  const prevAmount = bs.buyAmount;
  bs.buyAmount = 1;
  try {
    for (let k = 0; k < max; k++) {
      const id = pickAutoBuyTarget(gs, bs);
      if (!id || !bs.buyBuilding(id, { quiet: true })) break;
      out.bought++;
      out.ids[id] = (out.ids[id] || 0) + 1;
    }
  } finally {
    bs.buyAmount = prevAmount;
  }
  return out;
}
