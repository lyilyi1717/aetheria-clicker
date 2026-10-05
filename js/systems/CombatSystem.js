import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { particles } from '../engine/ParticleEngine.js';

export const ZONES = [
  { name: 'Thumama Dunes', minFloor: 1, maxFloor: 50, color: '#f59e0b', icon: '🏜️' },
  { name: 'Tahlia Street', minFloor: 51, maxFloor: 150, color: '#ec4899', icon: '🏎️' },
  { name: 'Al-Batha Market', minFloor: 151, maxFloor: 300, color: '#10b981', icon: '🏪' },
  { name: 'Empty Quarter (Rub al Khali)', minFloor: 301, maxFloor: 500, color: '#ef4444', icon: '🔥' },
  { name: 'Kingdom Centre', minFloor: 501, maxFloor: 750, color: '#38bdf8', icon: '🏢' },
  { name: 'Boulevard World', minFloor: 751, maxFloor: 1000, color: '#a855f7', icon: '🎡' },
  { name: 'The Wasta Dimension', minFloor: 1001, maxFloor: 999999, color: '#06b6d4', icon: '🌌' }
];

export const MONSTER_NAMES = [
  'Desert Dhabb', 'Abu Sarwal Wa Fanila', 'Karak Addict', 'Drifting Camry',
  'Iftar Samosa', 'Giant Kabsa Monster', 'Snapchat Celebrity', 'Mutawa',
  'Angry Shayeb', 'Rukbah Soda', 'Dallah of Doom', 'Al-Modir'
];

// Floor exponent cap for 1.12^(floor-1) on monster stats and gear. 1.12^6000 ~ 1e295, so
// 250 x that (boss HP) and 180 x that (Cosmic gear) stay finite; Math.pow hit Infinity at ~6,220.
export const COMBAT_SCALE_MAX_EXP = 6000;

export const COMBAT_STAT_MAX = 1e300;

export function combatFloorScale(floor) {
  return Math.pow(1.12, Math.min(COMBAT_SCALE_MAX_EXP, Math.max(0, floor - 1)));
}

export class CombatSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.initHero();
    this.initMonster();
  }

  initHero() {
    if (!this.gameState.hero) {
      this.gameState.hero = {
        level: 1,
        xp: 0,
        xpNeeded: 100,
        floor: 1,
        maxFloor: 1,
        hp: 100,
        maxHp: 100,
        hpRegen: 3, // per second
        baseAttack: 15,
        attackCooldown: 0,
        attackSpeed: 1.0, // attack every 1 second
        shield: 0,
        aetherForgeLevel: 0,
        gear: {
          weapon: { name: 'Rusty Shortsword', attack: 5, rarity: 'Common' },
          armor: { name: 'Tattered Tunic', hp: 20, rarity: 'Common' },
          amulet: { name: 'Pebble Amulet', crit: 0.02, rarity: 'Common' },
          relic: { name: 'Ancient Shard', lifesteal: 0.02, rarity: 'Common' }
        },
        skills: {
          strike: { name: 'Heavy Strike', cd: 0, maxCd: 4, dmgMult: 2.5 },
          shield: { name: 'Iron Wall', cd: 0, maxCd: 8, shieldAmount: 50 },
          leech: { name: 'Soul Siphon', cd: 0, maxCd: 10, healPercent: 0.25 },
          supernova: { name: 'Supernova', cd: 0, maxCd: 15, dmgMult: 5.0 }
        }
      };
    }
  }

  initMonster() {
    const floor = this.gameState.hero.floor;
    const isBoss = floor % 10 === 0;
    const zone = this.getZone(floor);

    const nameIdx = (floor - 1) % MONSTER_NAMES.length;
    const prefix = isBoss ? '⚡ BOSS: ' : '';
    const name = prefix + MONSTER_NAMES[nameIdx];

    // Scaling HP & Attack based on floor
    const scale = combatFloorScale(floor);
    const hp = Math.floor((isBoss ? 250 : 60) * scale);
    const attack = Math.floor((isBoss ? 15 : 6) * scale);

    this.monster = {
      name,
      isBoss,
      maxHp: hp,
      hp: hp,
      attack: attack,
      attackCooldown: 1.2,
      timer: isBoss ? 30.0 : 0, // 30s boss timer
      maxTimer: isBoss ? 30.0 : 0
    };
  }

  getZone(floor) {
    for (const z of ZONES) {
      if (floor >= z.minFloor && floor <= z.maxFloor) return z;
    }
    return ZONES[ZONES.length - 1];
  }

  getTotalAttack() {
    const h = this.gameState.hero;
    let atk = h.baseAttack + (h.gear.weapon ? h.gear.weapon.attack : 0);
    // Titan's Legacy perk: +25 Attack per rank
    atk += (this.gameState.ascensionPerks?.titan_legacy?.rank || 0) * 25;
    // Add level bonus
    atk += (h.level - 1) * 4;

    // Active buffs
    for (const buff of this.gameState.activeBuffs) {
      if (buff.type === 'hero_atk') atk *= buff.value;
    }
    // Gladiator Vigour talent: +20% damage per rank
    if (this.gameState.talents?.warlord_might?.rank > 0) {
      atk *= 1 + this.gameState.talents.warlord_might.rank * 0.2;
    }

    // Quartermaster
    if (this.gameState.quartermaster && this.gameState.quartermaster['hunters_edge']) {
      atk *= (1 + this.gameState.quartermaster['hunters_edge'].rank * 0.15);
    }
    
    // Universal Mastery: Building Mastery (+1.0% Global Attack per 100 total buildings)
    if (this.gameState.buildingSystem) {
      const totalBldgs = this.gameState.buildingSystem.getTotalBuildingsCount();
      const bldgMasteryRank = Math.floor(totalBldgs / 100);
      atk *= (1 + bldgMasteryRank * 0.01);
    }
    
    // Aether Forge
    if (this.gameState.hero.aetherForgeLevel) {
      atk *= (1 + this.gameState.hero.aetherForgeLevel * 0.25);
    }
    
    // Keep hero stats finite (crit x2 included); capped monster stats stay far below this
    return Math.floor(Math.min(atk, COMBAT_STAT_MAX));
  }

  getTotalMaxHp() {
    const h = this.gameState.hero;
    let hp = h.maxHp + (h.gear.armor ? h.gear.armor.hp : 0) + (h.level - 1) * 20;
    // Titan's Legacy perk: +100 HP per rank
    hp += (this.gameState.ascensionPerks?.titan_legacy?.rank || 0) * 100;
    
    // Excavation -> hero Max HP: +1% per max depth, capped at +100%
    hp *= this.gameState.getDepthVitalityMult();
    
    // Aether Forge
    if (h.aetherForgeLevel) {
      hp *= (1 + h.aetherForgeLevel * 0.25);
    }
    
    return Math.floor(Math.min(hp, COMBAT_STAT_MAX));
  }

  getAetherForgeCost() {
    const level = this.gameState.hero.aetherForgeLevel || 0;
    // Base cost 100k, scales x5 per level
    return new BigNum(100000).mul(Math.pow(5, level));
  }

  upgradeAetherForge() {
    const cost = this.getAetherForgeCost();
    if (this.gameState.aether.gte(cost)) {
      this.gameState.aether = this.gameState.aether.sub(cost);
      this.gameState.hero.aetherForgeLevel = (this.gameState.hero.aetherForgeLevel || 0) + 1;
      this.gameState.hero.hp = this.getTotalMaxHp(); // Heal to new max
      sound.playAscension();
      particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `AETHER FORGE AWAKENED!`, '#38bdf8', true);
      return true;
    }
    return false;
  }

  // Active click on monster (player can attack actively as fast as they click!)
  rollGearCrit() {
    return Math.random() < (this.gameState.hero.gear.amulet?.crit || 0);
  }

  activeClickAttack(clientX, clientY) {
    if (!this.monster || this.monster.hp <= 0) return;
    const crit = this.rollGearCrit();
    const dmg = Math.max(1, Math.floor(this.getTotalAttack() * 0.75 * (crit ? 2 : 1)));
    this.dealDamageToMonster(dmg, clientX, clientY, crit);
    sound.playHit();
  }

  castHeroSkill(skillKey) {
    const h = this.gameState.hero;
    const skill = h.skills[skillKey];
    if (!skill || skill.cd > 0) return;

    skill.cd = skill.maxCd;
    sound.playSpell();

    if (skillKey === 'strike') {
      const dmg = Math.floor(this.getTotalAttack() * skill.dmgMult);
      this.dealDamageToMonster(dmg, window.innerWidth / 2, window.innerHeight / 2, true);
    } else if (skillKey === 'shield') {
      h.shield += Math.floor(this.getTotalMaxHp() * 0.35);
      particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `+SHIELD ${h.shield}`, '#38bdf8', true);
    } else if (skillKey === 'leech') {
      const dmg = Math.floor(this.getTotalAttack() * 1.5);
      this.dealDamageToMonster(dmg, window.innerWidth / 2, window.innerHeight / 2, false);
      const heal = Math.floor(this.getTotalMaxHp() * skill.healPercent);
      h.hp = Math.min(this.getTotalMaxHp(), h.hp + heal);
      particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `+${heal} HP`, '#4ade80', true);
    } else if (skillKey === 'supernova') {
      const dmg = Math.floor(this.getTotalAttack() * skill.dmgMult);
      this.dealDamageToMonster(dmg, window.innerWidth / 2, window.innerHeight / 2, true);
    }
  }

  dealDamageToMonster(amount, x, y, isCrit = false) {
    this.monster.hp -= amount;
    if (x && y) {
      particles.spawnFloatingText(x, y, `-${amount}`, isCrit ? '#ef4444' : '#f97316', isCrit);
      particles.spawnClickSparks(x, y, 8, isCrit ? '#ef4444' : '#f97316');
    }

    // Lifesteal
    const relic = this.gameState.hero.gear.relic;
    if (relic && relic.lifesteal) {
      const heal = Math.floor(amount * relic.lifesteal);
      this.gameState.hero.hp = Math.min(this.getTotalMaxHp(), this.gameState.hero.hp + heal);
    }

    if (this.monster.hp <= 0) {
      this.onMonsterDefeated();
    }
  }

  onMonsterDefeated() {
    sound.playDefeat();
    const h = this.gameState.hero;
    const floor = h.floor;
    const isBoss = this.monster.isBoss;

    this.gameState.stats.totalMonstersSlain++;
    if (isBoss) this.gameState.stats.totalBossesSlain++;

    // Gold reward scales with floor at 1.12^floor, the same curve as monster HP and gear,
    // so gold stays proportional to difficulty (was 1.15^floor, which outgrew everything)
    let goldMult = 1;
    if (this.gameState.quartermaster && this.gameState.quartermaster['golden_req']) {
      goldMult *= 1 + this.gameState.quartermaster['golden_req'].rank * 0.25;
    }
    // Universal Mastery: Building Mastery (+1.0% Global Gold per 100 total buildings)
    if (this.gameState.buildingSystem) {
      const totalBldgs = this.gameState.buildingSystem.getTotalBuildingsCount();
      const bldgMasteryRank = Math.floor(totalBldgs / 100);
      goldMult *= 1 + bldgMasteryRank * 0.01;
    }
    // Plunderer Greed talent (+25%/rank) and Midas Elixir
    goldMult *= (1 + (this.gameState.talents?.dungeon_wealth?.rank || 0) * 0.25) * this.gameState.getGoldMultiplier();
    const goldEarned = new BigNum(1.12).pow(floor - 1).mul(new BigNum((isBoss ? 50 : 10) * goldMult)).floor();
    this.gameState.gold = this.gameState.gold.add(goldEarned);

    // XP Reward
    const xpGained = (isBoss ? 40 : 10) * floor;
    h.xp += xpGained;
    if (h.xp >= h.xpNeeded) {
      h.level++;
      h.xp -= h.xpNeeded;
      h.xpNeeded = Math.floor(h.xpNeeded * 1.35);
      h.hp = this.getTotalMaxHp();
      particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `HERO LEVEL UP! LV ${h.level}`, '#fbbf24', true);
      sound.playAchievement();
    }

    // Loot drops
    this.rollLoot(floor, isBoss);

    // Advance floor
    h.floor++;
    if (h.floor > h.maxFloor) {
      h.maxFloor = h.floor;
    }

    // Check bounties
    if (this.gameState.bountySystem) {
      this.gameState.bountySystem.checkProgress('slay_monster', 1);
      if (isBoss) this.gameState.bountySystem.checkProgress('slay_boss', 1);
    }

    this.initMonster();
  }

  rollLoot(floor, isBoss) {
    // Fortune Favor talent: +15% drop chance per rank
    const fortune = 1 + (this.gameState.talents?.loot_fortune?.rank || 0) * 0.15;
    const chance = Math.min(1, (isBoss ? 0.95 : 0.25) * fortune);
    if (Math.random() > chance) return;

    const slots = ['weapon', 'armor', 'amulet', 'relic'];
    const slot = slots[Math.floor(Math.random() * slots.length)];

    const rarities = [
      { name: 'Common', color: '#94a3b8', mult: 1, weight: 60 },
      { name: 'Rare', color: '#38bdf8', mult: 2, weight: 25 },
      { name: 'Epic', color: '#a855f7', mult: 4, weight: 10 },
      { name: 'Legendary', color: '#f59e0b', mult: 8, weight: 4 },
      { name: 'Cosmic', color: '#06b6d4', mult: 18, weight: 1 }
    ];

    let rand = Math.random() * 100;
    let chosenRarity = rarities[0];
    for (const r of rarities) {
      if (rand < r.weight) {
        chosenRarity = r;
        break;
      }
      rand -= r.weight;
    }

    const scale = combatFloorScale(floor) * chosenRarity.mult;
    let newItem = { name: `${chosenRarity.name} ${slot.toUpperCase()}`, rarity: chosenRarity.name, color: chosenRarity.color };

    if (slot === 'weapon') {
      newItem.attack = Math.max(1, Math.floor(10 * scale));
      if (newItem.attack > (this.gameState.hero.gear.weapon?.attack || 0)) {
        this.gameState.hero.gear.weapon = newItem;
        particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2 - 50, `NEW WEAPON: ${newItem.name}`, chosenRarity.color, true);
      }
    } else if (slot === 'armor') {
      newItem.hp = Math.max(1, Math.floor(40 * scale));
      if (newItem.hp > (this.gameState.hero.gear.armor?.hp || 0)) {
        this.gameState.hero.gear.armor = newItem;
        particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2 - 50, `NEW ARMOR: ${newItem.name}`, chosenRarity.color, true);
      }
    } else if (slot === 'amulet') {
      newItem.crit = Math.min(0.5, 0.02 + floor * 0.001 * chosenRarity.mult);
      if (newItem.crit > (this.gameState.hero.gear.amulet?.crit || 0)) this.gameState.hero.gear.amulet = newItem;
    } else if (slot === 'relic') {
      newItem.lifesteal = Math.min(0.3, 0.02 + floor * 0.001 * chosenRarity.mult);
      if (newItem.lifesteal > (this.gameState.hero.gear.relic?.lifesteal || 0)) this.gameState.hero.gear.relic = newItem;
    }

    // Material drops
    if (Math.random() < 0.4) {
      this.gameState.inventory.monsterBones = (this.gameState.inventory.monsterBones || 0) + 1;
    }
    if (isBoss) {
      this.gameState.inventory.voidCores = (this.gameState.inventory.voidCores || 0) + 1;
      this.gameState.inventory.bossTokens = (this.gameState.inventory.bossTokens || 0) + 1;
    }
  }

  update(dt) {
    const h = this.gameState.hero;
    const maxHp = this.getTotalMaxHp();

    // HP Regen
    if (h.hp < maxHp) {
      h.hp = Math.min(maxHp, h.hp + h.hpRegen * dt);
    }

    // Skill Cooldowns
    for (const key in h.skills) {
      const s = h.skills[key];
      if (s.cd > 0) {
        s.cd = Math.max(0, s.cd - dt);
      }
    }

    // Hero Auto-Attack
    h.attackCooldown -= dt;
    if (h.attackCooldown <= 0) {
      h.attackCooldown = h.attackSpeed;
      const crit = this.rollGearCrit();
      const dmg = this.getTotalAttack() * (crit ? 2 : 1);
      this.dealDamageToMonster(dmg, window.innerWidth / 2 + 100, window.innerHeight / 2, crit);
    }

    // Boss Timer
    if (this.monster.isBoss) {
      this.monster.timer -= dt;
      if (this.monster.timer <= 0) {
        // Failed boss timer -> retreat 1 floor
        particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, 'BOSS TIMEOUT! RETREATING', '#ef4444', true);
        h.floor = Math.max(1, h.floor - 1);
        this.initMonster();
        return;
      }
    }

    // Monster Auto-Attack
    this.monster.attackCooldown -= dt;
    if (this.monster.attackCooldown <= 0) {
      this.monster.attackCooldown = 1.2;
      let dmg = this.monster.attack;

      if (h.shield > 0) {
        const absorb = Math.min(h.shield, dmg);
        h.shield -= absorb;
        dmg -= absorb;
      }

      if (dmg > 0) {
        h.hp -= dmg;
        sound.playHit();
        particles.spawnFloatingText(window.innerWidth / 2 - 100, window.innerHeight / 2, `-${dmg}`, '#ef4444', false);

        if (h.hp <= 0) {
          // Hero died -> retreat 1 floor and restore HP
          particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, 'DEFEATED! RETREATING 1 FLOOR', '#ef4444', true);
          h.floor = Math.max(1, h.floor - 1);
          h.hp = this.getTotalMaxHp();
          this.initMonster();
        }
      }
    }
  }
}
