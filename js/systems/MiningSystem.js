import { BigNum } from '../engine/BigNum.js';
import { getActiveRules } from './ChronicleSystem.js';
import { sound } from '../engine/AudioEngine.js';
import { particles } from '../engine/ParticleEngine.js';
import { rewards } from '../ui/rewards.js';

// A new stratum every 25 depth (§5.1). Cosmetic plus drop table: each stratum adds
// +1% Void Amethyst chance, taken from the plain-stone share.
export const STRATA_SPAN = 25;
export const STRATA = [
  { name: 'Limestone', icon: '🪨', color: '#94a3b8', minDepth: 1 },
  { name: 'Granite', icon: '🧱', color: '#64748b', minDepth: 26 },
  { name: 'Obsidian', icon: '⬛', color: '#334155', minDepth: 51 },
  { name: 'Voidstone', icon: '🔮', color: '#4c1d95', minDepth: 76 },
  { name: 'Aetherite', icon: '💠', color: '#0e7490', minDepth: 101 },
  { name: 'Starcore', icon: '🌟', color: '#b45309', minDepth: 126 },
  { name: 'Abyssal Heart', icon: '🖤', color: '#7f1d1d', minDepth: 151 }
];

// Strata Relics (R18; gamification-roadmap §5.3): one per stratum. Each broken tile has a
// RELIC_CHANCE roll for the current stratum's relic; RELIC_PITY tiles without a relic
// guarantee the next one. Once the current stratum's relic is found, rolls go to the
// shallowest relic still missing, so a save that is already deep can still finish the set.
// Each relic: +5% pickaxe power.
export const STRATA_RELICS = [
  { id: 'fossil_date_pit', name: 'Fossilised Date Pit', icon: '🌰' },
  { id: 'granite_falcon', name: 'Granite Falcon Perch', icon: '🦅' },
  { id: 'obsidian_mabkhara', name: 'Obsidian Incense Burner', icon: '🏺' },
  { id: 'voidstone_compass', name: 'Voidstone Qibla Compass', icon: '🧭' },
  { id: 'aetherite_oud', name: 'Aetherite Oud', icon: '🪕' },
  { id: 'starcore_astrolabe', name: 'Starcore Astrolabe', icon: '✴️' },
  { id: 'abyssal_pearl', name: 'Pearl of the Abyssal Heart', icon: '🦪' }
];
export const RELIC_CHANCE = 1 / 200;
export const RELIC_PITY = 400;
export const RELIC_PICK_BONUS = 0.05;
// Aether Ore (progression doc §5.4): 10% of plain stone tiles also drop 1 ore, sold in the
// Bazaar (market.items.ore) at its price x the Market Index.
export const AETHER_ORE_CHANCE = 0.10;

// Pickaxe is a level L (stored in miningGrid.pickaxeTier). Names cycle through these,
// then "+N" on the last one.
export const PICKAXE_NAMES = [
  'Rusty Pickaxe',
  'Bronze Pickaxe',
  'Steel Pickaxe',
  'Mithril Pickaxe',
  'Adamantite Pickaxe',
  'Celestial Void Pick'
];

// 2: v2 curves + depth compression. 3: rebase saves stranded at an undiggable depth.
export const MINING_SCHEMA = 3;
export const DRILL_HITS_PER_SEC = 0.5;
const MAX_DRILL_HITS_PER_TICK = 200;
// Pause between finding the stairs and the next grid, in sim seconds. It runs in update(),
// so it works under Time Warp and in background tabs, and it is never saved.
export const DESCEND_DELAY = 0.4;
// Dynamite and Void Cataclysm hit each tile for this many pickaxe hits. Instant reveals let
// explosives find the stairs at a fixed rate whatever the tile HP, far past the pickaxe.
export const EXPLOSIVE_HITS = 40;
export const DYNAMITE_COOLDOWN = 25; // seconds, saved in miningGrid.dynamiteCooldown

// Tile indices of the 3x3 blast centred on centerId, clipped to the gridSize x gridSize grid
// (a corner centre gives 4 tiles, an edge centre 6).
export function getBlastArea(centerId, gridSize) {
  const cx = centerId % gridSize;
  const cy = Math.floor(centerId / gridSize);
  const ids = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) continue;
      ids.push(y * gridSize + x);
    }
  }
  return ids;
}

function tileEl(id) {
  return typeof document !== 'undefined' ? document.getElementById(`mine-tile-${id}`) : null;
}

// Centre of a tile on screen, or null when the grid isn't rendered or is hidden.
function tileScreenPos(id) {
  const el = tileEl(id);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// Outline the blasted tiles with an orange flash so the 3x3 shape is visible. Restarts the
// animation when the same tile is blasted again before it ends.
function flashTiles(ids) {
  for (const id of ids) {
    const el = tileEl(id);
    if (!el) continue;
    el.classList.remove('blast-flash');
    void el.offsetWidth;
    el.classList.add('blast-flash');
    setTimeout(() => el.classList.remove('blast-flash'), 700);
  }
}
// Schema 3 rebase: a save whose kit needs more than STUCK seconds per tile moves up to the
// deepest depth it digs in TARGET seconds per tile. maxDepth is kept.
const REBASE_STUCK_SECONDS = 12 * 3600;
const REBASE_TARGET_SECONDS = 3600;
// Number-valued curves (tile HP, stone yield) stay finite up to here (B3 guard).
const MAX_CURVE_DEPTH = 2000;
const MAX_MIGRATED_DRILLS = 12;
const DUNGEON_PICK_BONUS_CAP = 1.0; // boss -> pickaxe mastery capped at +100% (§8 row 4)

// §9 depth compression for pre-v2 saves: rank is preserved without a 1e8-HP wall.
export function compressDepth(d) {
  d = Math.max(1, Math.floor(Number(d) || 1));
  return d <= 60 ? d : Math.round(60 + 10 * Math.log2(d / 60));
}

export function getPickaxeName(level) {
  const last = PICKAXE_NAMES.length - 1;
  return level <= last ? PICKAXE_NAMES[level] : `${PICKAXE_NAMES[last]} +${level - last}`;
}

export class MiningSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.gridSize = 6;
    this.autoDrillTimer = 0;
    this.drillTargetId = -1;
    this.descending = false; // stairs found, new grid pending
    this.descendTimer = 0;
    // Relic and ore rolls draw from this (tests inject a seeded source)
    this.random = () => Math.random();
    this.initMiningGrid();
  }

  // Saves from before R18 have no relic fields. Also called lazily: a save import replaces
  // miningGrid at runtime.
  ensureRelicState() {
    const grid = this.gameState.miningGrid;
    if (!grid) return null;
    if (!grid.relics || typeof grid.relics !== 'object' || Array.isArray(grid.relics)) grid.relics = {};
    const pity = Number(grid.relicPity);
    grid.relicPity = Number.isFinite(pity) && pity > 0 ? Math.floor(pity) : 0;
    const ore = Number(grid.oreFound);
    grid.oreFound = Number.isFinite(ore) && ore > 0 ? Math.floor(ore) : 0;
    return grid;
  }

  hasRelic(index) {
    return this.ensureRelicState()?.relics[STRATA_RELICS[index]?.id] === true;
  }

  getRelicCount() {
    return STRATA_RELICS.reduce((n, _, i) => n + (this.hasRelic(i) ? 1 : 0), 0);
  }

  getRelicPickMult() {
    return 1 + RELIC_PICK_BONUS * this.getRelicCount();
  }

  // Index of the relic the next tile rolls for, or -1 when none is available here: the
  // current stratum's, else the shallowest missing one above it. Deeper relics need you there.
  getRelicTarget(depth = this.gameState.miningGrid.depth) {
    const current = this.getStratumIndex(depth);
    if (!this.hasRelic(current)) return current;
    for (let i = 0; i < current; i++) if (!this.hasRelic(i)) return i;
    return -1;
  }

  // One roll per broken tile. Returns the relic found, or null.
  rollRelic(x, y) {
    const target = this.getRelicTarget();
    if (target < 0) return null;
    const grid = this.ensureRelicState();
    grid.relicPity++;
    if (!(this.random() < RELIC_CHANCE || grid.relicPity >= RELIC_PITY)) return null;
    const relic = STRATA_RELICS[target];
    grid.relics[relic.id] = true;
    grid.relicPity = 0;
    // Big tier (§5.1): ceremony + brass
    rewards.notify({
      tier: 'big', kind: 'strata-relic', icon: relic.icon, color: '#fbbf24',
      title: `Strata Relic: ${relic.name}`, batchTitle: '{n} Strata Relics found',
      detail: `+${Math.round(RELIC_PICK_BONUS * 100)}% pickaxe`
    });
    return relic;
  }

  // Adds Aether Ore to the Bazaar stock. If the Bazaar state doesn't exist yet (only in
  // headless use; the app builds every system at start), ore waits in inventory.aetherOre and
  // moves over with the next drop.
  addAetherOre(n = 1) {
    const grid = this.ensureRelicState();
    if (grid) grid.oreFound += n;
    const inv = this.gameState.inventory;
    const item = this.gameState.market?.items?.ore;
    if (!item) {
      inv.aetherOre = (inv.aetherOre || 0) + n;
      return;
    }
    item.owned = (item.owned || 0) + n + (inv.aetherOre || 0);
    inv.aetherOre = 0;
  }

  // Dynamite cooldown lives in the saved mining slice: as a plain field on the system it
  // reset on every reload, so a reload spam blasted a 3x3 area each time.
  get dynamiteCooldown() {
    return this.gameState.miningGrid?.dynamiteCooldown || 0;
  }

  set dynamiteCooldown(v) {
    if (this.gameState.miningGrid) this.gameState.miningGrid.dynamiteCooldown = v;
  }

  initMiningGrid() {
    if (!this.gameState.miningGrid) {
      this.gameState.miningGrid = {
        schema: MINING_SCHEMA,
        depth: 1,
        maxDepth: 1,
        pickaxeTier: 0,
        autoDrills: 0,
        dynamiteCooldown: 0,
        relics: {},
        relicPity: 0,
        oreFound: 0,
        blocks: []
      };
      this.generateNewGrid();
      return;
    }
    this.ensureRelicState();
    const grid = this.gameState.miningGrid;
    const cd = Number(grid.dynamiteCooldown);
    grid.dynamiteCooldown = Number.isFinite(cd) ? Math.max(0, Math.min(DYNAMITE_COOLDOWN, cd)) : 0;
    this.migrateMiningGrid();
    this.ensurePlayableGrid();
  }

  // Save migrations (§9), gated by miningGrid.schema, so safe to call repeatedly (also
  // runs from update() after a save import).
  //   < 2: pre-v2 save: compress depth, clamp drills, regenerate the grid.
  //   < 3: rebase a depth the pickaxe and drills can no longer dig (rebaseStrandedDepth).
  migrateMiningGrid() {
    const grid = this.gameState.miningGrid;
    if (!grid || grid.schema === MINING_SCHEMA) return false;

    let regenerate = false;
    if (!(grid.schema >= 2)) {
      grid.depth = compressDepth(grid.depth);
      grid.maxDepth = Math.max(grid.depth, compressDepth(grid.maxDepth));
      grid.pickaxeTier = Math.max(0, Math.floor(Number(grid.pickaxeTier) || 0));
      grid.autoDrills = Math.min(Math.max(0, Math.floor(Number(grid.autoDrills) || 0)), MAX_MIGRATED_DRILLS);
      regenerate = true; // old blocks carry old HP
    }
    if (this.rebaseStrandedDepth()) regenerate = true;
    grid.schema = MINING_SCHEMA;
    this.autoDrillTimer = 0;
    if (regenerate) this.generateNewGrid();
    return true;
  }

  // Seconds one tile at this depth takes with the current pickaxe and drills
  // (at least 1 hit/s, i.e. a player clicking when there are few drills).
  getTileSeconds(depth = this.gameState.miningGrid.depth) {
    const hitsPerSec = Math.max(1, this.getAutoDrillRate());
    return this.getTileHp(depth) / (Math.max(1, this.getPickaxePower()) * hitsPerSec);
  }

  // Depth compression put v1 saves at depth 91-156 with a level-5 pickaxe and 12 drills,
  // where one tile takes days to years. Move such a save up to the deepest depth its kit
  // digs in about an hour per tile. maxDepth (rank, Geode Attunement, leaderboard) is kept.
  rebaseStrandedDepth() {
    const grid = this.gameState.miningGrid;
    if (this.getTileSeconds(grid.depth) <= REBASE_STUCK_SECONDS) return false;
    let depth = grid.depth;
    while (depth > 1 && this.getTileSeconds(depth) > REBASE_TARGET_SECONDS) depth--;
    grid.maxDepth = Math.max(grid.maxDepth || 1, grid.depth);
    grid.depth = depth;
    return true;
  }

  // Regenerates a grid nothing can progress: blocks missing, or the stairs already found
  // with no new grid pending. That happened when the page saved inside the old 400 ms
  // setTimeout descend window and then reloaded: the drills dug out the remaining tiles
  // and the grid never regenerated.
  ensurePlayableGrid() {
    if (this.descending) return false;
    const blocks = this.gameState.miningGrid.blocks;
    const total = this.gridSize * this.gridSize;
    const stuck = !Array.isArray(blocks) || blocks.length !== total ||
      blocks.some(b => b.content === 'stairs' && b.revealed) || !blocks.some(b => !b.revealed);
    if (!stuck) return false;
    this.generateNewGrid();
    return true;
  }

  getStratumIndex(depth = this.gameState.miningGrid.depth) {
    return Math.min(STRATA.length - 1, Math.max(0, Math.floor((depth - 1) / STRATA_SPAN)));
  }

  getCurrentStrata() {
    const depth = this.gameState.miningGrid.depth;
    const index = this.getStratumIndex(depth);
    return { ...STRATA[index], index, maxHp: this.getTileHp(depth) };
  }

  // HP(d) = ceil(4 * 1.15^(d-1))
  getTileHp(depth = this.gameState.miningGrid.depth) {
    const d = Math.min(Math.max(1, depth), MAX_CURVE_DEPTH);
    return Math.ceil(4 * Math.pow(1.15, d - 1));
  }

  // Stone per plain stone tile: ceil(1.07^(d-1))
  getStoneYield(depth = this.gameState.miningGrid.depth) {
    const d = Math.min(Math.max(1, depth), MAX_CURVE_DEPTH);
    return Math.ceil(Math.pow(1.07, d - 1));
  }

  // Gold cache: 100 * 1.07^d, in BigNum so it never overflows (B3)
  getGoldCacheValue(depth = this.gameState.miningGrid.depth) {
    return new BigNum(1.07).pow(Math.max(1, depth)).mul(100).mul(this.gameState.getGoldMultiplier());
  }

  generateNewGrid() {
    const grid = this.gameState.miningGrid;
    const hp = this.getTileHp(grid.depth);
    const extra = 0.01 * this.getStratumIndex(grid.depth); // amethyst share, taken from stone
    const blocks = [];
    const totalTiles = this.gridSize * this.gridSize;

    // Place hidden stairs randomly
    const stairIndex = Math.floor(Math.random() * totalTiles);

    for (let i = 0; i < totalTiles; i++) {
      let content = 'stone';
      const rand = Math.random();

      if (i === stairIndex) {
        content = 'stairs';
      } else if (rand < 0.04 + extra) {
        content = 'voidAmethyst';
      } else if (rand < 0.10 + extra) {
        content = 'diamond';
      } else if (rand < 0.20 + extra) {
        content = 'emerald';
      } else if (rand < 0.32 + extra) {
        content = 'sapphire';
      } else if (rand < 0.45 + extra) {
        content = 'ruby';
      } else if (rand < 0.55 + extra) {
        content = 'gold_cache';
      }

      blocks.push({
        id: i,
        content: content,
        revealed: false,
        hp: hp,
        maxHp: hp
      });
    }

    grid.blocks = blocks;
    this.drillTargetId = -1;
    this.descending = false;
    this.descendTimer = 0;
  }

  getDungeonPickBonus() {
    const bosses = this.gameState.stats?.totalBossesSlain || 0;
    return Math.min(DUNGEON_PICK_BONUS_CAP, Math.floor(bosses / 10) * 0.02);
  }

  getPickaxePower() {
    let power = Math.pow(2, this.gameState.miningGrid.pickaxeTier || 0);
    // Talent multiplier
    if (this.gameState.talents && this.gameState.talents['mining_power']) {
      power *= (1 + this.gameState.talents['mining_power'].rank * 0.25);
    }
    // Universal Mastery: Dungeon Mastery (+2.0% Pickaxe Power per 10 bosses slain, max +100%)
    power *= (1 + this.getDungeonPickBonus());
    // Strata Relics: +5% each
    power *= this.getRelicPickMult();
    // Chronicle Chapter rules (R20): Chapter of Sand digs x3
    power *= getActiveRules(this.gameState).excavationMult;
    return Math.floor(power);
  }

  mineBlock(index, clientX, clientY, silent = false) {
    const block = this.gameState.miningGrid.blocks[index];
    // While descending the old grid is spent; its tiles would pay at the new depth.
    if (!block || block.revealed || this.descending) return;

    const power = this.getPickaxePower();
    if (!silent) sound.playDig();

    if (clientX && clientY) {
      particles.spawnClickSparks(clientX, clientY, 6, '#e2e8f0');
      particles.spawnFloatingText(clientX, clientY, `-${new BigNum(power).format('standard', 0)}`, '#cbd5e1');
    }
    this.damageBlock(block, power, clientX, clientY);
  }

  // Applies damage and reveals the tile (paying out) when it breaks. Returns true if it broke.
  damageBlock(block, amount, x, y) {
    if (!block || block.revealed) return false;
    block.hp = Math.max(0, block.hp - amount);
    if (block.hp > 0) return false;
    block.revealed = true;
    this.revealReward(block, x, y);
    return true;
  }

  // Dynamite / Void Cataclysm: EXPLOSIVE_HITS pickaxe hits on each target tile. Stops once
  // the stairs break, since the rest of the old grid is spent. Effects spawn on each tile's
  // own on-screen spot; (x, y) is only the fallback when the grid isn't on screen (e.g. a
  // spell cast from another tab). flashIds: tiles to flash (default: the targets).
  blastBlocks(targets, x, y, flashIds = targets.map(b => b.id)) {
    const dmg = this.getPickaxePower() * EXPLOSIVE_HITS;
    flashTiles(flashIds);
    for (const b of targets) {
      if (this.descending) break;
      const pos = tileScreenPos(b.id);
      const px = pos ? pos.x : x, py = pos ? pos.y : y;
      if (pos) particles.spawnClickSparks(px, py, 10, '#f97316');
      this.damageBlock(b, dmg, px, py);
    }
  }

  revealReward(block, x, y) {
    this.gameState.stats.totalBlocksMined++;

    if (this.gameState.bountySystem) {
      this.gameState.bountySystem.checkProgress('mine_block', 1);
    }

    const grid = this.gameState.miningGrid;

    // Every broken tile (stairs included) rolls for a Strata Relic, before the stairs move
    // the depth on
    this.rollRelic(x, y);

    if (block.content === 'stairs') {
      sound.playAchievement();
      if (x && y) particles.spawnFloatingText(x, y, 'STAIRS FOUND! DEPTH +1', '#38bdf8', true);
      const prevStratum = this.getStratumIndex(grid.depth);
      grid.depth++;
      if (grid.depth > grid.maxDepth) {
        grid.maxDepth = grid.depth;
      }
      const stratum = this.getStratumIndex(grid.depth);
      if (stratum > prevStratum) {
        rewards.notify({
          tier: 'big', kind: 'stratum', icon: STRATA[stratum].icon, color: '#38bdf8',
          title: `Entered the ${STRATA[stratum].name} strata`, detail: `Depth ${grid.depth}`
        });
      }
      // The next grid arrives after DESCEND_DELAY sim seconds (update()). This used to be a
      // setTimeout, which a save + reload inside the window lost for good (stuck grid).
      this.descending = true;
      this.descendTimer = DESCEND_DELAY;
      return;
    }

    if (block.content === 'gold_cache') {
      sound.playBuy();
      const gold = this.getGoldCacheValue(grid.depth);
      this.gameState.gold = this.gameState.gold.add(gold);
      if (x && y) particles.spawnFloatingText(x, y, `+${gold.format('standard', 0)} GOLD`, '#eab308', true);
      return;
    }

    if (['ruby', 'sapphire', 'emerald', 'diamond', 'voidAmethyst'].includes(block.content)) {
      sound.playGem();
      const GEM_KEYS = { ruby: 'rubies', sapphire: 'sapphires', emerald: 'emeralds', diamond: 'diamonds', voidAmethyst: 'voidAmethyst' };
      const gemKey = GEM_KEYS[block.content];
      this.gameState.inventory[gemKey] = (this.gameState.inventory[gemKey] || 0) + 1;
      const colors = { ruby: '#ef4444', sapphire: '#3b82f6', emerald: '#10b981', diamond: '#38bdf8', voidAmethyst: '#a855f7' };
      if (x && y) {
        const displayNames = { ruby: 'FANOOS', sapphire: 'DALLAH', emerald: 'OUD WOOD', diamond: 'MISBAHA', voidAmethyst: 'MABKHARA' };
        particles.spawnFloatingText(x, y, `+1 ${displayNames[block.content]}!`, colors[block.content] || '#f59e0b', true);
      }
      return;
    }

    // Default stone: yield scales with depth
    const stone = this.getStoneYield(grid.depth);
    this.gameState.inventory.stone = (this.gameState.inventory.stone || 0) + stone;
    if (x && y && stone > 1) particles.spawnFloatingText(x, y, `+${new BigNum(stone).format('standard', 0)} STONE`, '#94a3b8');
    if (this.random() < AETHER_ORE_CHANCE) {
      this.addAetherOre(1);
      if (x && y) particles.spawnFloatingText(x, y + 24, '+1 AETHER ORE', '#22d3ee');
    }
  }

  // Cost of reaching pickaxe level L: 50 * 2.5^L stone
  getPickaxeCost(level = (this.gameState.miningGrid.pickaxeTier || 0) + 1) {
    return Math.ceil(50 * Math.pow(2.5, level));
  }

  upgradePickaxe() {
    const grid = this.gameState.miningGrid;
    const cost = this.getPickaxeCost();
    if ((this.gameState.inventory.stone || 0) >= cost) {
      this.gameState.inventory.stone -= cost;
      grid.pickaxeTier = (grid.pickaxeTier || 0) + 1;
      sound.playBuy();
      return true;
    }
    return false;
  }

  // Cost of the next Auto-Drill: 30 * 1.6^n stone
  getAutoDrillCost() {
    return Math.ceil(30 * Math.pow(1.6, this.gameState.miningGrid.autoDrills));
  }

  getAutoDrillRate() {
    return this.gameState.miningGrid.autoDrills * DRILL_HITS_PER_SEC;
  }

  buyAutoDrill() {
    const grid = this.gameState.miningGrid;
    const cost = this.getAutoDrillCost();
    if ((this.gameState.inventory.stone || 0) >= cost) {
      this.gameState.inventory.stone -= cost;
      grid.autoDrills++;
      sound.playBuy();
      return true;
    }
    return false;
  }

  useDynamite() {
    if (this.dynamiteCooldown > 0 || this.descending) return false;
    const blocks = this.gameState.miningGrid.blocks;
    const unrevealed = blocks.filter(b => !b.revealed);
    if (unrevealed.length === 0) return false;
    this.dynamiteCooldown = DYNAMITE_COOLDOWN;
    sound.playHit();

    // Blast a 3x3 area centred on a random unrevealed block (clipped at the grid edges).
    // Effects used to spawn at the middle of the window, which looked like a miss.
    const center = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const area = getBlastArea(center.id, this.gridSize);
    const targets = area.map(i => blocks[i]).filter(b => b && !b.revealed);
    this.blastBlocks(targets, null, null, area);
    return true;
  }

  // Drills focus one random tile until it breaks, like a player would.
  pickDrillTarget() {
    const blocks = this.gameState.miningGrid.blocks;
    const current = blocks[this.drillTargetId];
    if (current && !current.revealed) return current;
    const unrevealed = blocks.filter(b => !b.revealed);
    if (unrevealed.length === 0) return null;
    const target = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    this.drillTargetId = target.id;
    return target;
  }

  update(dt) {
    // A save import replaces miningGrid at runtime; migrate it on the next tick.
    if (this.gameState.miningGrid && this.gameState.miningGrid.schema !== MINING_SCHEMA) {
      this.migrateMiningGrid();
    }

    if (this.descending) {
      this.descendTimer -= dt;
      if (this.descendTimer <= 0) this.generateNewGrid();
    } else {
      this.ensurePlayableGrid();
    }

    if (this.dynamiteCooldown > 0) {
      this.dynamiteCooldown = Math.max(0, this.dynamiteCooldown - dt);
    }

    // Leyline Overflow: drills run x1.25 while mana is full
    const timeProgress = dt * (this.gameState.getLeylineDrillMult?.() || 1);

    // Auto-drill mining (B2): accumulate fractional hits and carry the remainder.
    const drills = this.gameState.miningGrid.autoDrills;
    if (drills > 0) {
      this.autoDrillTimer += timeProgress * DRILL_HITS_PER_SEC * drills;
      let hits = 0;
      while (this.autoDrillTimer >= 1 && hits < MAX_DRILL_HITS_PER_TICK && !this.descending) {
        const target = this.pickDrillTarget();
        if (!target) break;
        this.autoDrillTimer -= 1;
        hits++;
        this.mineBlock(target.id, undefined, undefined, hits > 1);
      }
      // Keep a bounded backlog (e.g. while the next grid is generating).
      this.autoDrillTimer = Math.min(this.autoDrillTimer, MAX_DRILL_HITS_PER_TICK);
    }
  }
}
