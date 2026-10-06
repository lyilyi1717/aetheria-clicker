// Upgrade shop on the Monolith (design doc 6.1 "Upgrade shop" / "Click yield", roadmap R5).
// One-time Aether purchases that reset on Ascend (and Transcend):
//   - tier upgrades: 5 per generator tier, available at owned >= 1/10/50/100/200,
//     cost baseCost x 10^(k+1) (k = 0..4), each x2 that tier's output. Generated for all 30 tiers;
//     a locked tier's upgrades stay hidden.
//   - click upgrades: 15 in a chain, x2 the base click each (click yield =
//     clickPower x 2^bought + 3% CPS, GameState.getClickYield). Cost: 10 x base cost of tier i.
//   - synergy upgrades: 8, "tier A +1% per tier B owned".
// The table and the multiplier helpers are pure functions of gameState, so GameState and
// BuildingSystem can read them without the UpgradeSystem instance being linked (tests, sim).
// State: gameState.upgrades = { [id]: true } for bought upgrades; saved as an array of ids.
import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { BUILDING_DEFINITIONS, getUnlockedTierCount } from './BuildingSystem.js';

export const TIER_UPGRADE_THRESHOLDS = [1, 10, 50, 100, 200];
export const TIER_UPGRADE_MULT = Number(globalThis.process?.env?.TM || 2);
export const CLICK_UPGRADE_COUNT = 15;
export const CLICK_UPGRADE_MULT = 2;
export const CLICK_UPGRADE_COST_FACTOR = 10;   // click upgrade i costs 10 x baseCost(tier i)
export const SYNERGY_PER_UNIT = Number(globalThis.process?.env?.SY || 0.01);         // +1% to tier A per tier B owned
export const SYNERGY_MIN_TARGET = 25;          // own 25 of tier A ...
export const SYNERGY_MIN_SOURCE = 50;          // ... and 50 of tier B to see the synergy
export const SYNERGY_COST_EXP = 4;             // cost: baseCost(A) x 10^4

const TIER_LEVEL_NAMES = ['Polished', 'Gilded', 'Blessed', 'Legendary', 'Eternal'];

const CLICK_UPGRADE_NAMES = [
  ['Sesame Fingertips', '👆'], ['Tahini Grip', '✊'], ['Falafel Flick', '🧆'],
  ['Cardamom Knuckles', '🌿'], ['Saffron Tap', '🌼'], ['Dallah Pour', '🫖'],
  ['Oud Strum', '🎸'], ['Majlis Clap', '👏'], ['Desert Drumbeat', '🥁'],
  ['Camel Kick', '🐪'], ['Falcon Strike', '🦅'], ['Sandstorm Slap', '🌪️'],
  ['Mirage Palm', '🏜️'], ['Star of Najd Touch', '⭐'], ['Hand of Eternity', '✋']
];

// [target A, source B, name]: A gets +1% output per B owned
const SYNERGIES = [
  ['obelisk', 'tapper', 'Dallah per Shawarma'],
  ['workshop', 'resonator', 'Smoked Mandi'],
  ['harvester', 'siphon', 'Boulevard Breakfast'],
  ['observatory', 'crucible', 'Season Drift Show'],
  ['foundry', 'gateway', 'Causeway Tankers'],
  ['dynamo', 'anchor', 'Downstream Integration'],
  ['matrix', 'loom', 'Giga-Project Pipeline'],
  ['loom', 'obelisk', 'Dallahs on The Line']
];

const DEF_BY_ID = new Map(BUILDING_DEFINITIONS.map(d => [d.id, d]));

function buildUpgradeDefinitions() {
  const list = [];
  for (const b of BUILDING_DEFINITIONS) {
    TIER_UPGRADE_THRESHOLDS.forEach((need, k) => {
      list.push({
        id: `${b.id}_u${k + 1}`,
        kind: 'tier',
        building: b.id,
        tier: b.tier,
        level: k + 1,
        requires: need,
        name: `${TIER_LEVEL_NAMES[k]} ${b.name}`,
        icon: b.icon,
        desc: `${b.name} output x${TIER_UPGRADE_MULT}`,
        cost: b.baseCost.mul(new BigNum(10).pow(k + 1))
      });
    });
  }
  CLICK_UPGRADE_NAMES.forEach(([name, icon], i) => {
    list.push({
      id: `click_${i + 1}`,
      kind: 'click',
      level: i + 1,
      tier: 0,
      name, icon,
      desc: `Base click x${CLICK_UPGRADE_MULT}`,
      cost: BUILDING_DEFINITIONS[i].baseCost.mul(CLICK_UPGRADE_COST_FACTOR)
    });
  });
  for (const [target, source, name] of SYNERGIES) {
    const a = DEF_BY_ID.get(target);
    const b = DEF_BY_ID.get(source);
    list.push({
      id: `syn_${target}_${source}`,
      kind: 'synergy',
      building: target,
      source,
      tier: Math.max(a.tier, b.tier),
      name, icon: a.icon,
      desc: `${a.name} +${Math.round(SYNERGY_PER_UNIT * 100)}% per ${b.name} owned`,
      cost: a.baseCost.mul(new BigNum(10).pow(SYNERGY_COST_EXP))
    });
  }
  return list;
}

export const UPGRADE_DEFINITIONS = buildUpgradeDefinitions();
const UPGRADE_BY_ID = new Map(UPGRADE_DEFINITIONS.map(u => [u.id, u]));
const TIER_UPGRADES_BY_BUILDING = new Map();
const SYNERGIES_BY_TARGET = new Map();
for (const u of UPGRADE_DEFINITIONS) {
  const map = u.kind === 'tier' ? TIER_UPGRADES_BY_BUILDING : u.kind === 'synergy' ? SYNERGIES_BY_TARGET : null;
  if (!map) continue;
  if (!map.has(u.building)) map.set(u.building, []);
  map.get(u.building).push(u);
}
const CLICK_UPGRADES = UPGRADE_DEFINITIONS.filter(u => u.kind === 'click');

export function getUpgradeDefinition(id) {
  return UPGRADE_BY_ID.get(id);
}

const owned = (gs, id) => gs?.buildings?.[id]?.count || 0;
const isBoughtIn = (gs, id) => gs?.upgrades?.[id] === true;

// Output multiplier for one generator tier: x2 per tier upgrade bought, x(1 + 1% per source
// owned) per synergy bought. A plain number: at most 32 x a few hundred.
export function getTierUpgradeMult(gs, buildingId) {
  if (!gs?.upgrades) return 1;
  let mult = 1;
  for (const u of TIER_UPGRADES_BY_BUILDING.get(buildingId) || []) {
    if (isBoughtIn(gs, u.id)) mult *= TIER_UPGRADE_MULT;
  }
  for (const u of SYNERGIES_BY_TARGET.get(buildingId) || []) {
    if (isBoughtIn(gs, u.id)) mult *= 1 + SYNERGY_PER_UNIT * owned(gs, u.source);
  }
  return mult;
}

export function getClickUpgradeCount(gs) {
  if (!gs?.upgrades) return 0;
  let n = 0;
  for (const u of CLICK_UPGRADES) if (isBoughtIn(gs, u.id)) n++;
  return n;
}

// 2^(click upgrades bought), multiplies clickPower
export function getClickUpgradeMult(gs) {
  return Math.pow(CLICK_UPGRADE_MULT, getClickUpgradeCount(gs));
}

// Saved shape: array of ids (older dev builds / hand edits may hold an { id: true } map).
// Unknown ids are dropped. Missing (every save before R5) -> nothing bought.
export function sanitizeUpgrades(data) {
  const out = {};
  const ids = Array.isArray(data) ? data
    : (data && typeof data === 'object') ? Object.keys(data).filter(k => data[k] === true) : [];
  for (const id of ids) if (typeof id === 'string' && UPGRADE_BY_ID.has(id)) out[id] = true;
  return out;
}

export function serializeUpgrades(upgrades) {
  return Object.keys(upgrades || {}).filter(id => upgrades[id] === true);
}

// --- Blueprint Memory hooks (dust shop, R6) ---
// Ascension clears every bought upgrade except those some keep rule accepts. A rule is
// (upgradeDef, gameState) => boolean and should read its own state from gameState (e.g. a dust
// shop rank), so one registration serves every game. Examples for R6:
//   addAscendKeepRule((u, gs) => gs.dustShop?.blueprint_memory && u.kind === 'tier' && u.level <= 2);
//   addAscendKeepRule((u, gs) => gs.dustShop?.blueprint_memory_2 && u.kind === 'tier' && u.tier <= 7);
// Transcend clears everything regardless (the dust shop resets with it).
export const ASCEND_KEEP_RULES = [];

export function addAscendKeepRule(rule) {
  ASCEND_KEEP_RULES.push(rule);
  return () => {
    const i = ASCEND_KEEP_RULES.indexOf(rule);
    if (i >= 0) ASCEND_KEEP_RULES.splice(i, 1);
  };
}

// Ids an Ascension would keep right now
export function getKeptOnAscend(gs, rules = ASCEND_KEEP_RULES) {
  return serializeUpgrades(gs?.upgrades).filter(id => {
    const u = UPGRADE_BY_ID.get(id);
    return u && rules.some(rule => rule(u, gs));
  });
}

// Called by PrestigeSystem.ascend. Returns the ids kept.
export function resetUpgradesOnAscend(gs, rules = ASCEND_KEEP_RULES) {
  const kept = getKeptOnAscend(gs, rules);
  gs.upgrades = {};
  for (const id of kept) gs.upgrades[id] = true;
  return kept;
}

// Called by PrestigeSystem.transcend: nothing survives a Transcend
export function resetAllUpgrades(gs) {
  gs.upgrades = {};
}

export class UpgradeSystem {
  constructor(gameState) {
    this.gameState = gameState;
    if (!this.gameState.upgrades || typeof this.gameState.upgrades !== 'object') this.gameState.upgrades = {};
  }

  get definitions() { return UPGRADE_DEFINITIONS; }

  isBought(id) { return isBoughtIn(this.gameState, id); }

  getBoughtCount() { return serializeUpgrades(this.gameState.upgrades).length; }

  getCost(id) { return UPGRADE_BY_ID.get(id)?.cost ?? BigNum.zero(); }

  // Visible tier: an upgrade tied to a locked generator tier is hidden
  isTierOpen(u) {
    return u.tier <= getUnlockedTierCount(this.gameState);
  }

  // Requirement met (shown as a card), not yet bought
  isAvailable(id) {
    const u = UPGRADE_BY_ID.get(id);
    if (!u || this.isBought(id) || !this.isTierOpen(u)) return false;
    const gs = this.gameState;
    if (u.kind === 'tier') return owned(gs, u.building) >= u.requires;
    if (u.kind === 'click') return u.level === 1 || this.isBought(`click_${u.level - 1}`);
    if (u.kind === 'synergy') return owned(gs, u.building) >= SYNERGY_MIN_TARGET && owned(gs, u.source) >= SYNERGY_MIN_SOURCE;
    return false;
  }

  // What still has to happen before an upgrade appears (for "next up" hints)
  getRequirementText(id) {
    const u = UPGRADE_BY_ID.get(id);
    if (!u) return '';
    if (u.kind === 'tier') return `Own ${u.requires} ${DEF_BY_ID.get(u.building).name}`;
    if (u.kind === 'click') return `Buy ${CLICK_UPGRADE_NAMES[u.level - 2]?.[0] ?? ''}`;
    return `Own ${SYNERGY_MIN_TARGET} ${DEF_BY_ID.get(u.building).name} and ${SYNERGY_MIN_SOURCE} ${DEF_BY_ID.get(u.source).name}`;
  }

  // Available upgrades, cheapest first
  getAvailable() {
    return UPGRADE_DEFINITIONS.filter(u => this.isAvailable(u.id))
      .sort((a, b) => (a.cost.lt(b.cost) ? -1 : a.cost.gt(b.cost) ? 1 : 0));
  }

  // Not yet available, in an open tier, cheapest first (the UI shows a couple as "next up")
  getUpcoming(limit = 3) {
    return UPGRADE_DEFINITIONS
      .filter(u => !this.isBought(u.id) && this.isTierOpen(u) && !this.isAvailable(u.id))
      .sort((a, b) => (a.cost.lt(b.cost) ? -1 : a.cost.gt(b.cost) ? 1 : 0))
      .slice(0, limit);
  }

  canBuy(id) {
    return this.isAvailable(id) && this.gameState.aether.gte(this.getCost(id));
  }

  buy(id) {
    if (!this.canBuy(id)) return false;
    this.gameState.aether = this.gameState.aether.sub(this.getCost(id));
    this.gameState.upgrades[id] = true;
    sound.playBuy?.();
    return true;
  }

  // Buys every affordable available upgrade, cheapest first; returns how many
  buyAllAffordable() {
    let n = 0;
    for (const u of this.getAvailable()) {
      if (this.gameState.aether.lt(u.cost)) break;
      if (this.buy(u.id)) n++;
    }
    return n;
  }

  // Generator output (before global multipliers) an upgrade would add right now. 0 for clicks:
  // their value depends on how fast the player clicks.
  getProductionGain(id) {
    const u = UPGRADE_BY_ID.get(id);
    const bs = this.gameState.buildingSystem;
    if (!u || !bs || u.kind === 'click') return BigNum.zero();
    const prod = bs.getBuildingProduction(u.building);
    if (u.kind === 'tier') return prod.mul(TIER_UPGRADE_MULT - 1);
    return prod.mul(SYNERGY_PER_UNIT * owned(this.gameState, u.source));
  }
}
