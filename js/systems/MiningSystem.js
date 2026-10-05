import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { particles } from '../engine/ParticleEngine.js';

export const STRATA = [
  { name: 'Limestone', maxHp: 2, icon: '🪨', color: '#94a3b8', minDepth: 1 },
  { name: 'Granite', maxHp: 5, icon: '🧱', color: '#64748b', minDepth: 6 },
  { name: 'Obsidian', maxHp: 12, icon: '⬛', color: '#334155', minDepth: 16 },
  { name: 'Voidstone', maxHp: 25, icon: '🔮', color: '#4c1d95', minDepth: 31 }
];

export const PICKAXES = [
  { name: 'Rusty Pickaxe', power: 1, cost: 0 },
  { name: 'Bronze Pickaxe', power: 2, cost: 500 },
  { name: 'Steel Pickaxe', power: 4, cost: 5000 },
  { name: 'Mithril Pickaxe', power: 8, cost: 50000 },
  { name: 'Adamantite Pickaxe', power: 16, cost: 500000 },
  { name: 'Celestial Void Pick', power: 35, cost: 5000000 }
];

export class MiningSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.gridSize = 6;
    this.dynamiteCooldown = 0;
    this.autoDrillTimer = 0;
    this.initMiningGrid();
  }

  initMiningGrid() {
    if (!this.gameState.miningGrid) {
      this.gameState.miningGrid = {
        depth: 1,
        maxDepth: 1,
        pickaxeTier: 0,
        autoDrills: 0,
        blocks: []
      };
      this.generateNewGrid();
    }
  }

  getCurrentStrata() {
    const depth = this.gameState.miningGrid.depth;
    for (let i = STRATA.length - 1; i >= 0; i--) {
      if (depth >= STRATA[i].minDepth) return STRATA[i];
    }
    return STRATA[0];
  }

  generateNewGrid() {
    const strata = this.getCurrentStrata();
    const blocks = [];
    const totalTiles = this.gridSize * this.gridSize;

    // Place hidden stairs randomly
    const stairIndex = Math.floor(Math.random() * totalTiles);

    for (let i = 0; i < totalTiles; i++) {
      let content = 'stone';
      const rand = Math.random();

      if (i === stairIndex) {
        content = 'stairs';
      } else if (rand < 0.04) {
        content = 'voidAmethyst';
      } else if (rand < 0.10) {
        content = 'diamond';
      } else if (rand < 0.20) {
        content = 'emerald';
      } else if (rand < 0.32) {
        content = 'sapphire';
      } else if (rand < 0.45) {
        content = 'ruby';
      } else if (rand < 0.55) {
        content = 'gold_cache';
      }

      blocks.push({
        id: i,
        content: content,
        revealed: false,
        hp: strata.maxHp,
        maxHp: strata.maxHp
      });
    }

    this.gameState.miningGrid.blocks = blocks;
  }

  getPickaxePower() {
    const tier = this.gameState.miningGrid.pickaxeTier;
    let power = PICKAXES[tier]?.power || 1;
    // Talent multiplier
    if (this.gameState.talents && this.gameState.talents['mining_power']) {
      power *= (1 + this.gameState.talents['mining_power'].rank * 0.25);
    }
    // Universal Mastery: Dungeon Mastery (+2.0% Pickaxe Power per 10 bosses slain)
    if (this.gameState.stats && this.gameState.stats.totalBossesSlain > 0) {
      const dungeonMasteryRank = Math.floor(this.gameState.stats.totalBossesSlain / 10);
      power *= (1 + dungeonMasteryRank * 0.02);
    }
    return Math.floor(power);
  }

  mineBlock(index, clientX, clientY) {
    const grid = this.gameState.miningGrid;
    const block = grid.blocks[index];
    if (!block || block.revealed) return;

    const power = this.getPickaxePower();
    block.hp -= power;
    sound.playDig();

    if (clientX && clientY) {
      particles.spawnClickSparks(clientX, clientY, 6, '#e2e8f0');
      particles.spawnFloatingText(clientX, clientY, `-${power}`, '#cbd5e1');
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

    if (block.content === 'stairs') {
      sound.playAchievement();
      if (x && y) particles.spawnFloatingText(x, y, 'STAIRS FOUND! DEPTH +1', '#38bdf8', true);
      this.gameState.miningGrid.depth++;
      if (this.gameState.miningGrid.depth > this.gameState.miningGrid.maxDepth) {
        this.gameState.miningGrid.maxDepth = this.gameState.miningGrid.depth;
      }
      setTimeout(() => this.generateNewGrid(), 400);
      return;
    }

    if (block.content === 'gold_cache') {
      sound.playBuy();
      const gold = new BigNum(100 * Math.pow(1.2, this.gameState.miningGrid.depth) * this.gameState.getGoldMultiplier());
      this.gameState.gold = this.gameState.gold.add(gold);
      if (x && y) particles.spawnFloatingText(x, y, `+${gold.format('standard', 0)} GOLD`, '#eab308', true);
      return;
    }

    if (['ruby', 'sapphire', 'emerald', 'diamond', 'voidAmethyst'].includes(block.content)) {
      sound.playGem();
      const gemKey = block.content === 'voidAmethyst' ? 'voidAmethyst' : block.content + 's';
      this.gameState.inventory[gemKey] = (this.gameState.inventory[gemKey] || 0) + 1;
      const colors = { ruby: '#ef4444', sapphire: '#3b82f6', emerald: '#10b981', diamond: '#38bdf8', voidAmethyst: '#a855f7' };
      if (x && y) {
        particles.spawnFloatingText(x, y, `+1 ${block.content.toUpperCase()}!`, colors[block.content] || '#f59e0b', true);
      }
      return;
    }

    // Default stone
    this.gameState.inventory.stone = (this.gameState.inventory.stone || 0) + 1;
  }

  upgradePickaxe() {
    const grid = this.gameState.miningGrid;
    const nextTier = grid.pickaxeTier + 1;
    if (nextTier >= PICKAXES.length) return false;

    const cost = new BigNum(PICKAXES[nextTier].cost);
    if (this.gameState.gold.gte(cost)) {
      this.gameState.gold = this.gameState.gold.sub(cost);
      grid.pickaxeTier = nextTier;
      sound.playBuy();
      return true;
    }
    return false;
  }

  getAutoDrillCost() {
    return new BigNum(1000 * Math.pow(1.5, this.gameState.miningGrid.autoDrills));
  }

  buyAutoDrill() {
    const grid = this.gameState.miningGrid;
    const cost = this.getAutoDrillCost();
    if (this.gameState.gold.gte(cost)) {
      this.gameState.gold = this.gameState.gold.sub(cost);
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

  update(dt) {
    if (this.dynamiteCooldown > 0) {
      this.dynamiteCooldown = Math.max(0, this.dynamiteCooldown - dt);
    }
    
    let timeProgress = dt;
    if (this.gameState.miningGrid.leylineOverflow) {
      timeProgress += this.gameState.miningGrid.leylineOverflow;
      this.gameState.miningGrid.leylineOverflow = 0;
    }

    // Auto-drill mining
    const drills = this.gameState.miningGrid.autoDrills;
    if (drills > 0) {
      this.autoDrillTimer += timeProgress * drills;
      if (this.autoDrillTimer >= 2.0) {
        this.autoDrillTimer = 0;
        const unrevealed = this.gameState.miningGrid.blocks.filter(b => !b.revealed);
        if (unrevealed.length > 0) {
          const target = unrevealed[Math.floor(Math.random() * unrevealed.length)];
          this.mineBlock(target.id);
        }
      }
    }
  }
}
