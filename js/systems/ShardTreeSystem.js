// Shard tree (prestige layer 2 spend, docs/redesign-proposal.md §6.3, roadmap R13).
//
// Fracture Shards are spent here from gameState.fractureShards (the spendable balance). The
// +25% production per shard reads totalFractureShards (lifetime), which spending never
// touches, so buying a node can never lower production. The tree is permanent: Transcend does
// not reset or refund it.
//
// First three branches:
//   Foundry  12 "Deep Blueprint" nodes (1 shard each), one per Transcend tier (9-20): that tier's 5 shop
//            upgrades cost /10. Read by the upgrade shop through getDeepBlueprintDivisor().
//   Chronos  Auto-Ascend (2; rule: x1.2 / x1.25 / x1.5 / x2 lifetime dust, or a timer) -> Long Sleep
//            (2; offline cap +8 h) -> Hourglass (3; a 6 h Fast Forward once per day). Auto-Blast (1)
//            stands alone: Excavation dynamite fires itself whenever it is off cooldown (R32).
//   Tower    Wardens (1; every 250th floor) -> Second Wind (2; one free retry per boss fight).
//
// This module has no audio/DOM imports so GameState (and node tests) can load it on its own.
// Sounds and notices live in js/ui/shardTree.js.
import { BigNum } from '../engine/BigNum.js';
import { isChallengeActive } from './ChronicleSystem.js';
import { t, localize } from '../i18n/index.js';

// Same ladder as BuildingSystem.getUnlockedTierCount (8 base tiers + 1 per Transcend, max 20).
// Repeated here so this module stays free of BuildingSystem's audio import; test_shard_tree.js
// checks the two agree.
const BASE_TIERS = 8;
const MAX_TIERS = 20;
export function getOpenTierCount(gameState) {
  const t = Math.max(0, Math.floor(Number(gameState?.transcendenceCount) || 0));
  return Math.min(MAX_TIERS, BASE_TIERS + t);
}

export const FOUNDRY_FIRST_TIER = BASE_TIERS + 1;
export const FOUNDRY_LAST_TIER = MAX_TIERS;
export const DEEP_BLUEPRINT_DIVISOR = 10;      // a tier's 6 upgrades cost /10
export const OFFLINE_SHARD_BONUS = 8 * 3600;   // seconds added to both offline bands
export const LONG_WARP_SECONDS = 6 * 3600;     // Hourglass of Eternity: 6 h of production
export const LONG_WARP_COOLDOWN_MS = 24 * 3600 * 1000;
// Auto-Ascend is checked this often (wall clock)
export const AUTO_ASCEND_CHECK_MS = 1000;

export const SHARD_TREE_BRANCHES = [
  { id: 'foundry', name: 'Foundry', icon: '🏭', desc: 'Deep Blueprints: one per New Field tier. That tier\'s 6 upgrades cost ÷10.' },
  { id: 'chronos', name: 'Chronos', icon: '⏳', desc: 'Time works for you: Auto-Well, a longer offline cap, a daily 6 h Fast Forward, Auto-Blast.' },
  { id: 'tower', name: 'Tower', icon: '🗼', desc: 'The Void Tower: Wardens every 250 floors, and a Second Wind against bosses.' }
];
localize(SHARD_TREE_BRANCHES, 'branch', ['name', 'desc']);

// Auto-Ascend rules. "×m" Ascends once the Ascension would multiply this layer's lifetime dust by
// at least m (pending >= (m - 1) x lifetime). "timer" Ascends every N minutes of run time.
export const AUTO_ASCEND_RULES = [
  { id: 'x1.2', label: '×1.2 Reserves', mult: 1.2 },
  { id: 'x1.25', label: '×1.25 Reserves', mult: 1.25 },
  { id: 'x1.5', label: '×1.5 Reserves', mult: 1.5 },
  { id: 'x2', label: '×2 Reserves', mult: 2 },
  { id: 'timer', label: 'Timer' }
];
localize(AUTO_ASCEND_RULES, 'autorule', ['label']);
export const AUTO_ASCEND_TIMER_OPTIONS = [10, 30, 60, 240]; // minutes
export const AUTO_ASCEND_DEFAULT_RULE = 'x1.25';
export const AUTO_ASCEND_DEFAULT_TIMER = 30;
// The ×m rules also wait for a run this long (R31): with small dust numbers a fresh layer meets
// ×1.25 within minutes, and runs that short never reach the upgrade shop.
export const AUTO_ASCEND_MIN_RUN_SECONDS = 30 * 60;

const romanTier = (n) => t('tree.tier', { n });

function foundryNodes() {
  const nodes = [];
  for (let tier = FOUNDRY_FIRST_TIER; tier <= FOUNDRY_LAST_TIER; tier++) {
    nodes.push({
      id: `foundry_t${tier}`, branch: 'foundry', tier, cost: 1, icon: '📐',
      name: t('tree.deep_name', { tier: romanTier(tier) }),
      desc: t('tree.deep_desc', { tier: romanTier(tier), n: DEEP_BLUEPRINT_DIVISOR }),
      requires: []
    });
  }
  return nodes;
}

export const SHARD_TREE_NODES = [
  ...foundryNodes(),
  {
    id: 'chronos_auto_ascend', branch: 'chronos', cost: 2, icon: '♾️', name: 'Auto-Well',
    desc: 'Drills a New Well for you by your rule (Reserves ×1.2 / ×1.25 / ×1.5 / ×2, or a timer). The Reserves rules wait for a run of at least 30 min. Uses held Sidr Honey like a New Well drilled by hand.',
    requires: []
  },
  {
    id: 'chronos_offline', branch: 'chronos', cost: 2, icon: '🛌', name: 'Long Sleep',
    desc: 'Offline Oil: +8 h at 100% (the 24 h cap moves out by 8 h too).',
    requires: ['chronos_auto_ascend']
  },
  {
    id: 'chronos_long_warp', branch: 'chronos', cost: 3, icon: '⏩', name: 'Hourglass',
    desc: 'Once a day: Fast Forward 6 h (6 h of Oil production and Garden growth, instantly).',
    requires: ['chronos_offline']
  },
  {
    id: 'chronos_auto_blast', branch: 'chronos', cost: 1, icon: '🧨', name: 'Auto-Blast',
    desc: 'Excavation throws its dynamite for you whenever it is ready, while the game is open. Switch it on or off in Excavation.',
    requires: []
  },
  {
    id: 'tower_wardens', branch: 'tower', cost: 1, icon: '🛡️', name: 'Wardens',
    desc: 'A named Warden every 250 floors (×3 boss HP, 60 s, ×3 spoils); each first kill is a trophy, +2% Tower gold.',
    requires: []
  },
  {
    id: 'tower_second_wind', branch: 'tower', cost: 2, icon: '💨', name: 'Second Wind',
    desc: 'Once per boss fight, losing (timeout or defeat) refills your HP and the timer instead of pushing you back. The boss keeps its damage.',
    requires: ['tower_wardens']
  }
];localize(SHARD_TREE_NODES.filter(n => n.branch !== 'foundry'), 'node', ['name', 'desc']);


const NODE_BY_ID = new Map(SHARD_TREE_NODES.map(n => [n.id, n]));
export function getNode(id) { return NODE_BY_ID.get(id) || null; }

export function defaultShardTreeState() {
  return {
    owned: {},          // node id -> true
    granted: {},        // node id -> true: given free to a save from before the tree (not spent)
    autoAscend: { enabled: true, rule: AUTO_ASCEND_DEFAULT_RULE, timerMin: AUTO_ASCEND_DEFAULT_TIMER },
    autoBlast: { enabled: true },   // on/off for the Auto-Blast node (R32)
    longWarpAt: 0       // wall-clock ms of the last 6 h Fast Forward
  };
}

// Cleans a loaded (possibly missing, old or edited) save slice. A save from before the tree that
// already Transcended had Wardens through the first-Transcend stand-in (R18); it keeps them as a
// free node so nobody loses a feature they had.
export function sanitizeShardTreeState(raw, { transcendenceCount = 0 } = {}) {
  const s = defaultShardTreeState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    if (transcendenceCount >= 1) {
      s.owned.tower_wardens = true;
      s.granted.tower_wardens = true;
    }
    return s;
  }
  for (const key of ['owned', 'granted']) {
    const src = raw[key];
    if (src && typeof src === 'object') {
      for (const id of Object.keys(src)) if (src[id] === true && NODE_BY_ID.has(id)) s[key][id] = true;
    }
  }
  for (const id of Object.keys(s.granted)) if (!s.owned[id]) delete s.granted[id];
  const a = raw.autoAscend;
  if (a && typeof a === 'object') {
    s.autoAscend.enabled = a.enabled !== false;
    if (AUTO_ASCEND_RULES.some(r => r.id === a.rule)) s.autoAscend.rule = a.rule;
    if (AUTO_ASCEND_TIMER_OPTIONS.includes(a.timerMin)) s.autoAscend.timerMin = a.timerMin;
  }
  const b = raw.autoBlast;
  if (b && typeof b === 'object') s.autoBlast.enabled = b.enabled !== false;
  const w = Number(raw.longWarpAt);
  s.longWarpAt = Number.isFinite(w) && w > 0 ? w : 0;
  return s;
}

function treeState(gameState) {
  if (!gameState.shardTree || typeof gameState.shardTree !== 'object') {
    gameState.shardTree = defaultShardTreeState();
  }
  return gameState.shardTree;
}

export function hasNode(gameState, id) {
  return gameState?.shardTree?.owned?.[id] === true;
}

// Spendable shards as a plain count
export function getShardBalance(gameState) {
  const n = gameState?.fractureShards?.toNumber?.() ?? 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

// Shards spent on the tree (free legacy grants are not counted)
export function getSpentShards(gameState) {
  const t = gameState?.shardTree;
  if (!t) return 0;
  let n = 0;
  for (const id of Object.keys(t.owned || {})) {
    if (t.owned[id] === true && !t.granted?.[id]) n += getNode(id)?.cost || 0;
  }
  return n;
}

// Foundry nodes need the upgrade shop (R5) to have anything to discount. Until it is linked
// (gameState.upgradeSystem), they are shown but not sold: no buying a node that does nothing.
export function isFoundryOpen(gameState) {
  return !!gameState?.upgradeSystem;
}

// Why a node can't be bought right now (null = it can). Owned nodes return 'owned'.
export function getBlockReason(gameState, id) {
  const node = getNode(id);
  if (!node) return t('chron.block.unknown');
  if (hasNode(gameState, id)) return 'owned';
  for (const req of node.requires) {
    if (!hasNode(gameState, req)) return t('chron.block.needs', { what: getNode(req).name });
  }
  if (node.branch === 'foundry') {
    if (getOpenTierCount(gameState) < node.tier) return t('tree.block.tier', { n: node.tier, f: node.tier - BASE_TIERS });
    if (!isFoundryOpen(gameState)) return t('tree.block.shop');
  }
  if (getShardBalance(gameState) < node.cost) return t(node.cost === 1 ? 'tree.block.share1' : 'tree.block.shares', { n: node.cost });
  return null;
}

export function canBuyNode(gameState, id) {
  return getBlockReason(gameState, id) === null;
}

// Spends shards from the balance only. totalFractureShards (the multipliers) is never touched.
export function buyNode(gameState, id) {
  if (!canBuyNode(gameState, id)) return false;
  const node = getNode(id);
  const t = treeState(gameState);
  gameState.fractureShards = gameState.fractureShards.sub(new BigNum(node.cost));
  t.owned[id] = true;
  return true;
}

// --- Effects read by other systems ---

// Upgrade-shop cost divisor for a tier (1-based tier number, as BUILDING_DEFINITIONS[i].tier).
// R5's UpgradeSystem divides a tier's upgrade prices by this.
export function getDeepBlueprintDivisor(gameState, tier) {
  return hasNode(gameState, `foundry_t${tier}`) ? DEEP_BLUEPRINT_DIVISOR : 1;
}

// Seconds added to both offline Aether bands (SaveManager.computeOfflineBands)
export function getOfflineBonusSeconds(gameState) {
  return hasNode(gameState, 'chronos_offline') ? OFFLINE_SHARD_BONUS : 0;
}

export function hasWardensNode(gameState) {
  return hasNode(gameState, 'tower_wardens');
}

export function hasSecondWind(gameState) {
  return hasNode(gameState, 'tower_second_wind');
}

// Auto-Blast (R32): owned and switched on. A tree without the autoBlast slice (a Chronicle's
// fresh tree, an older save before sanitizing) counts as on, the default.
export function hasAutoBlast(gameState) {
  return hasNode(gameState, 'chronos_auto_blast');
}

export function isAutoBlastOn(gameState) {
  return hasAutoBlast(gameState) && gameState.shardTree.autoBlast?.enabled !== false;
}

export function setAutoBlastEnabled(gameState, on) {
  const t = treeState(gameState);
  t.autoBlast = { ...(t.autoBlast || {}), enabled: !!on };
}

// --- Auto-Ascend rule (pure) ---

// Whether the rule says "Ascend now", given pending and lifetime dust (BigNum) and run seconds.
export function autoAscendRuleMet(settings, pending, lifetimeDust, runSeconds) {
  if (!pending || pending.lte(0)) return false;
  const rule = AUTO_ASCEND_RULES.find(r => r.id === settings?.rule) || AUTO_ASCEND_RULES.find(r => r.id === AUTO_ASCEND_DEFAULT_RULE);
  if (rule.id === 'timer') {
    const min = AUTO_ASCEND_TIMER_OPTIONS.includes(settings?.timerMin) ? settings.timerMin : AUTO_ASCEND_DEFAULT_TIMER;
    return runSeconds >= min * 60;
  }
  return runSeconds >= AUTO_ASCEND_MIN_RUN_SECONDS && pending.gte(lifetimeDust.mul(rule.mult - 1));
}

export class ShardTreeSystem {
  constructor(gameState, prestigeSystem, now = () => Date.now()) {
    this.gameState = gameState;
    this.prestigeSystem = prestigeSystem;
    this.now = now;
    this.lastCheckAt = 0;
    // Auto-Ascensions not yet announced: { count, dust (BigNum), since (ms) }. The UI takes it
    // with takeAutoAscendBatch() and shows one notice for the lot (§10 risk 2).
    this.batch = null;
    treeState(gameState);
  }

  get state() { return treeState(this.gameState); }

  getBlockReason(id) { return getBlockReason(this.gameState, id); }
  canBuy(id) { return canBuyNode(this.gameState, id); }
  buy(id) { return buyNode(this.gameState, id); }
  has(id) { return hasNode(this.gameState, id); }

  // --- Auto-Ascend ---

  setAutoAscendEnabled(on) { this.state.autoAscend.enabled = !!on; }

  setAutoAscendRule(rule) {
    if (!AUTO_ASCEND_RULES.some(r => r.id === rule)) return false;
    this.state.autoAscend.rule = rule;
    return true;
  }

  setAutoAscendTimer(min) {
    if (!AUTO_ASCEND_TIMER_OPTIONS.includes(min)) return false;
    this.state.autoAscend.timerMin = min;
    return true;
  }

  shouldAutoAscend(now = this.now()) {
    if (!this.has('chronos_auto_ascend') || !this.state.autoAscend.enabled) return false;
    const ps = this.prestigeSystem;
    if (!ps || ps.getMinRunRemaining(now) > 0) return false;
    const runSeconds = (now - (this.gameState.runStartedAt || 0)) / 1000;
    return autoAscendRuleMet(this.state.autoAscend, ps.getPendingCosmicDust(), this.gameState.totalCosmicDust, runSeconds);
  }

  // Called on a timer (also in background tabs). Ascends at most once per call, quietly, and adds
  // the Ascension to the pending batch. Returns true if it Ascended.
  tick(now = this.now()) {
    if (now - this.lastCheckAt < AUTO_ASCEND_CHECK_MS && now >= this.lastCheckAt) return false;
    this.lastCheckAt = now;
    if (!this.shouldAutoAscend(now)) return false;
    const pending = this.prestigeSystem.getPendingCosmicDust();
    if (!this.prestigeSystem.ascend(false, { quiet: true })) return false;
    if (!this.batch) this.batch = { count: 0, dust: BigNum.zero(), since: now };
    this.batch.count++;
    this.batch.dust = this.batch.dust.add(pending);
    return true;
  }

  // Hands over (and clears) the Auto-Ascensions since the last call, or null
  takeAutoAscendBatch() {
    const b = this.batch;
    this.batch = null;
    return b;
  }

  // --- Hourglass of Eternity (6 h Fast Forward, once a day) ---

  // Seconds until the next 6 h warp (0 = ready). Clamped so a clock set backwards can't lock it
  // for longer than one cooldown.
  getLongWarpReadyIn(now = this.now()) {
    const left = (this.state.longWarpAt + LONG_WARP_COOLDOWN_MS - now) / 1000;
    return Math.min(LONG_WARP_COOLDOWN_MS / 1000, Math.max(0, left));
  }

  canLongWarp(now = this.now()) {
    // Not during a Chronicle challenge (R20): 6 h of production would skip the challenge
    return this.has('chronos_long_warp') && this.getLongWarpReadyIn(now) <= 0 && !isChallengeActive(this.gameState);
  }

  // Pays 6 h of current Aether production without timed buffs (100%, like the first offline band) and grows the
  // Garden for 6 h. Returns { aether, gardenHarvests } or null.
  useLongWarp(now = this.now()) {
    if (!this.canLongWarp(now)) return null;
    const gs = this.gameState;
    // Base rate without timed Aether buffs, so a spell cast right before can't be stretched to 6 h
    const buffMult = typeof gs.getAetherBuffMult === 'function' ? gs.getAetherBuffMult() : 1;
    const aether = gs.getNetAetherPerSecond().div(buffMult > 0 ? buffMult : 1).mul(LONG_WARP_SECONDS);
    gs.aether = gs.aether.add(aether);
    gs.totalAetherEarned = gs.totalAetherEarned.add(aether);
    const garden = gs.gardenSystem?.applyOfflineTime?.(LONG_WARP_SECONDS) || { harvests: 0 };
    this.state.longWarpAt = now;
    return { aether, gardenHarvests: garden.harvests || 0 };
  }
}
