import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { particles } from '../engine/ParticleEngine.js';

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

export const MINING_SCHEMA = 2;
export const DRILL_HITS_PER_SEC = 0.5;
const MAX_DRILL_HITS_PER_TICK = 200;
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
    this.dynamiteCooldown = 0;
    this.autoDrillTimer = 0;
    this.drillTargetId = -1;
    this.descending = false; // stairs found, new grid pending
    this.initMiningGrid();
  }

  initMiningGrid() {
    if (!this.gameState.miningGrid) {
      this.gameState.miningGrid = {
        schema: MINING_SCHEMA,
        depth: 1,
        maxDepth: 1,
        pickaxeTier: 0,
        autoDrills: 0,
        blocks: []
      };
      this.generateNewGrid();
      return;
    }
    this.migrateMiningGrid();
  }

  // One-shot migration of pre-v2 mining saves (§9). Gated by miningGrid.schema, so it
  // is safe to call repeatedly (also runs from update() after a save import).
  migrateMiningGrid() {
    const grid = this.gameState.miningGrid;
    if (!grid || grid.schema === MINING_SCHEMA) return false;

    grid.depth = compressDepth(grid.depth);
    grid.maxDepth = Math.max(grid.depth, compressDepth(grid.maxDepth));
    grid.pickaxeTier = Math.max(0, Math.floor(Number(grid.pickaxeTier) || 0));
    grid.autoDrills = Math.min(Math.max(0, Math.floor(Number(grid.autoDrills) || 0)), MAX_MIGRATED_DRILLS);
    grid.schema = MINING_SCHEMA;
    this.autoDrillTimer = 0;
    this.drillTargetId = -1;
    this.descending = false;
    this.generateNewGrid(); // old blocks carry old HP
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
    return Math.floor(power);
  }

  mineBlock(index, clientX, clientY, silent = false) {
    const grid = this.gameState.miningGrid;
    const block = grid.blocks[index];
    if (!block || block.revealed) return;

    const power = this.getPickaxePower();
    block.hp = Math.max(0, block.hp - power);
    if (!silent) sound.playDig();

    if (clientX && clientY) {
      particles.spawnClickSparks(clientX, clientY, 6, '#e2e8f0');
      particles.spawnFloatingText(clientX, clientY, `-${new BigNum(power).format('standard', 0)}`, '#cbd5e1');
    }

    if (block.hp <= 0) {
      block.revealed = true;
      this.revealReward(block, clientX, clientY);
    }
  }

  revealReward(block, x, y) {
    this.gameState.stats.totalBlocksMined++;

    if (this.gameState.bountySystem) {
      this.gameState.bountySystem.checkProgress('mine_block', 1);
    }

    const grid = this.gameState.miningGrid;

    if (block.content === 'stairs') {
      sound.playAchievement();
      if (x && y) particles.spawnFloatingText(x, y, 'STAIRS FOUND! DEPTH +1', '#38bdf8', true);
      const prevStratum = this.getStratumIndex(grid.depth);
      grid.depth++;
      if (grid.depth > grid.maxDepth) {
        grid.maxDepth = grid.depth;
      }
      const stratum = this.getStratumIndex(grid.depth);
      if (stratum > prevStratum && typeof window !== 'undefined') {
        particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 3,
          `${STRATA[stratum].icon} ENTERED ${STRATA[stratum].name.toUpperCase()} STRATA!`, STRATA[stratum].color, true);
      }
      this.descending = true;
      setTimeout(() => this.generateNewGrid(), 400);
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
        particles.spawnFloatingText(x, y, `+1 ${block.content.toUpperCase()}!`, colors[block.content] || '#f59e0b', true);
      }
      return;
    }

    // Default stone: yield scales with depth
    const stone = this.getStoneYield(grid.depth);
    this.gameState.inventory.stone = (this.gameState.inventory.stone || 0) + stone;
    if (x && y && stone > 1) particles.spawnFloatingText(x, y, `+${new BigNum(stone).format('standard', 0)} STONE`, '#94a3b8');
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
    if (this.dynamiteCooldown > 0) return false;
    this.dynamiteCooldown = 25; // 25s cooldown
    sound.playHit();

    // Detonate a 3x3 area centred on a random unrevealed block
    const blocks = this.gameState.miningGrid.blocks;
    const unrevealed = blocks.filter(b => !b.revealed);
    if (unrevealed.length === 0) return true;
    const center = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const cx = center.id % this.gridSize;
    const cy = Math.floor(center.id / this.gridSize);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= this.gridSize || y >= this.gridSize) continue;
        const b = blocks[y * this.gridSize + x];
        if (!b || b.revealed) continue;
        b.revealed = true;
        b.hp = 0;
        this.revealReward(b, window.innerWidth / 2, window.innerHeight / 2);
      }
    }
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
