import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { particles } from '../engine/ParticleEngine.js';
import { rewards } from '../ui/rewards.js';
import { feedback } from '../ui/feedback.js';
import { hasWardensNode, hasSecondWind } from './ShardTreeSystem.js';
import { getShopRank } from './DustShopSystem.js';
import { resolveCritTier } from './ClickerSystem.js';
import { t, localizeList } from '../i18n/index.js';
import { GearSystem } from './GearSystem.js';
import { GEAR_FLOOR_BASE } from './gearItems.js';

export const ZONES = [
  { name: 'Thumama Dunes', minFloor: 1, maxFloor: 50, color: '#f59e0b', icon: '🏜️' },
  { name: 'Tahlia Street', minFloor: 51, maxFloor: 150, color: '#ec4899', icon: '🏎️' },
  { name: 'Al-Batha Market', minFloor: 151, maxFloor: 300, color: '#10b981', icon: '🏪' },
  { name: 'Empty Quarter (Rub al Khali)', minFloor: 301, maxFloor: 500, color: '#ef4444', icon: '🔥' },
  { name: 'Kingdom Centre', minFloor: 501, maxFloor: 750, color: '#38bdf8', icon: '🏢' },
  { name: 'Boulevard World', minFloor: 751, maxFloor: 1000, color: '#a855f7', icon: '🎡' },
  { name: 'The Wasta Dimension', minFloor: 1001, maxFloor: 999999, color: '#06b6d4', icon: '🌌' }
];
localizeList(ZONES.map(z => z.name), 'zone').forEach((name, i) => { ZONES[i].name = name; });

export const MONSTER_NAMES = [
  'Desert Dhabb', 'Abu Sarwal Wa Fanila', 'Karak Addict', 'Drifting Camry',
  'Iftar Samosa', 'Giant Kabsa Monster', 'Snapchat Celebrity', 'Saher Camera',
  'Angry Shayeb', 'Rukbah Soda', 'Dallah of Doom', 'Al-Modir'
];
// MONSTER_NAMES stays English: portraits are keyed by it (js/bossArt.js). Players see these.
const MONSTER_DISPLAY = localizeList([...MONSTER_NAMES], 'monster');

// Floor exponent cap for 1.12^(floor-1) on monster stats and gear. 1.12^6000 ~ 1e295, so
// 400 x that (boss HP) and 180 x that (Cosmic gear) stay finite; Math.pow hit Infinity at ~6,220.
export const COMBAT_SCALE_MAX_EXP = 6000;

export const COMBAT_STAT_MAX = 1e300;

// Monsters, gold and the Market Index grow 1.12^(floor-1); gear rolls at 1.109^(floor-1).
// Gear then lags monsters by ~1.009^floor, so the Forge, levels, talents and the Quartermaster
// have to close the gap and the climb decelerates (docs/gamification-roadmap.md §0.2). With
// both at 1.12 the hero out-scaled the floor for ever (~1 floor/s auto-climb).
export const MONSTER_FLOOR_BASE = 1.12;
// (the constant lives in gearItems.js so the item model needs no CombatSystem import)
export { GEAR_FLOOR_BASE };

// Bosses (every 10th floor) are the Tower's medium beat: x400 HP, 45 s to kill them
export const BOSS_HP_MULT = 400;
export const BOSS_TIMER_SECONDS = 45;

// Kashta camp (R64): losses at one gate before the hero camps, minimum floor, and camp length
export const KASHTA_FAILS = 2;
export const KASHTA_MIN_FLOOR = 10;
export const KASHTA_SECONDS = 300;

// Wardens (R18, docs/redesign-proposal.md §6.3/§6.5): every 250th floor, once unlocked, the
// boss is a named Warden with x3 boss HP and a 60 s timer. First kill of each = a trophy.
export const WARDEN_INTERVAL = 250;
export const WARDEN_HP_MULT = 3;
export const WARDEN_TIMER_SECONDS = 60;
// Each Warden trophy: +2% Tower gold (additive; gamification-roadmap §5.3 Meme Trophies). Gold
// only, so trophies never speed up the climb itself.
export const WARDEN_TROPHY_GOLD = 0.02;
// Warden kills pay x3 boss gold and XP and drop 3 Void Cores + 3 Boss Tokens (bosses: 1 + 1)
export const WARDEN_REWARD_MULT = 3;

// Oil Forge (R53): level L costs FORGE_BASE_COST x FORGE_COST_GROWTH^L Oil (was 100,000 x 5^L)
export const FORGE_BASE_COST = 100;
export const FORGE_COST_GROWTH = 1.5;

// Named Wardens for floors 250, 500, 750, ... The list cycles with a numeral after floor 2,500.
export const WARDEN_NAMES = [
  'Saher, the All-Seeing Camera',
  'The Sand Sultan',
  'Al-Modir the Eternal',
  'The Wasta Broker',
  'Dallah Colossus',
  'The Endless Traffic Jam',
  'Grand Mufti of Memes',
  'Kabsa Leviathan',
  'The Falcon Tax Collector',
  'Ghost of the Old Souq'
];
localizeList(WARDEN_NAMES, 'warden');

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function isWardenFloorNumber(floor) {
  return Number.isInteger(floor) && floor >= WARDEN_INTERVAL && floor % WARDEN_INTERVAL === 0;
}

export function getWardenName(floor) {
  const i = Math.max(0, Math.floor(floor / WARDEN_INTERVAL) - 1);
  const cycle = Math.floor(i / WARDEN_NAMES.length);
  const base = WARDEN_NAMES[i % WARDEN_NAMES.length];
  return cycle === 0 ? base : `${base} ${ROMAN[cycle + 1] || cycle + 1}`;
}

// Gear slots and the main stat each carries, with its cap (Crit and Drain). Gear levels (R34, paid
// in Monster Bones) were retired in R64: migration v11 bakes each level into the item's stats.
export const GEAR_SLOTS = ['weapon', 'armor', 'amulet', 'relic'];
export const GEAR_MAIN_STAT = {
  weapon: { key: 'attack', cap: Infinity },
  armor: { key: 'hp', cap: Infinity },
  amulet: { key: 'crit', cap: 0.5 },
  relic: { key: 'lifesteal', cap: 0.3 }
};

// An item's main stat (with the slot's cap)
export function gearStat(slot, item) {
  const def = GEAR_MAIN_STAT[slot];
  if (!def || !item) return 0;
  return Math.min(def.cap, Number(item[def.key]) || 0);
}

export function combatFloorScale(floor) {
  return Math.pow(MONSTER_FLOOR_BASE, Math.min(COMBAT_SCALE_MAX_EXP, Math.max(0, floor - 1)));
}

export function gearFloorScale(floor) {
  return Math.pow(GEAR_FLOOR_BASE, Math.min(COMBAT_SCALE_MAX_EXP, Math.max(0, floor - 1)));
}

// Floor the Market Index and other "best floor" economy reads use. Equals maxFloor on saves
// that started on the 1.11 gear curve; legacy saves were rebased (migrations.js step 3) and
// keep their old maxFloor only as the record.
export function getIndexFloor(hero) {
  const f = Number(hero?.indexFloor ?? hero?.maxFloor);
  return Number.isFinite(f) && f >= 1 ? Math.floor(f) : 1;
}

export class CombatSystem {
  constructor(gameState) {
    this.gameState = gameState;
    // Active Warden challenge (not saved): { floor } of a passed Warden the hero is fighting
    // without leaving his climb floor. A reload simply ends it.
    this.wardenChallenge = null;
    this.initHero();
    this.ensureWardenState();
    this.gear = new GearSystem(this);
    this.gear.ensureState();
    this.kashta = { active: false, gate: 0, remaining: 0, manual: false, fails: 0, lastFail: 0, check: 0 };
    this.rebaseLegacyFloor();
    this.initMonster();
  }

  // Whole-number combat stats in the player's notation (1.5e12, not 2e12 or 1500000000000)
  fmt(val) {
    return BigNum.formatNumber(Math.floor(val), 2);
  }

  initHero() {
    if (!this.gameState.hero) {
      this.gameState.hero = {
        level: 1,
        xp: 0,
        xpNeeded: 100,
        floor: 1,
        maxFloor: 1,
        indexFloor: 1,
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

  // --- Wardens (R18) ---

  // Saves from before R18 have no hero.wardens; trophies are keyed by floor.
  ensureWardenState() {
    const h = this.gameState.hero;
    if (!h) return null;
    const w = h.wardens;
    if (!w || typeof w !== 'object' || Array.isArray(w)) h.wardens = { defeated: {} };
    const d = h.wardens.defeated;
    if (!d || typeof d !== 'object' || Array.isArray(d)) h.wardens.defeated = {};
    return h.wardens;
  }

  // Shard-tree node (§6.3 Tower branch, R13). Saves that Transcended before the tree existed get
  // the node free on load (sanitizeShardTreeState). hero.wardensUnlocked still unlocks too.
  isWardensUnlocked() {
    return this.gameState.hero?.wardensUnlocked === true || hasWardensNode(this.gameState);
  }

  // Second Wind (shard tree, R13): once per boss fight, a lost boss (timeout or defeat) refills
  // the hero's HP and the timer instead of pushing him back. The boss keeps the damage taken.
  trySecondWind() {
    const m = this.monster;
    if (!m?.isBoss || m.secondWindUsed || !hasSecondWind(this.gameState)) return false;
    m.secondWindUsed = true;
    m.timer = m.maxTimer;
    m.attackCooldown = 1.2;
    this.gameState.hero.hp = this.getTotalMaxHp();
    rewards.notify({ tier: 'small', kind: 'second-wind', icon: '💨', color: '#38bdf8', title: t('combat.second_wind') });
    return true;
  }

  isWardenFloor(floor) {
    return this.isWardensUnlocked() && isWardenFloorNumber(floor);
  }

  isWardenDefeated(floor) {
    return this.ensureWardenState()?.defeated[floor] === true;
  }

  getWardenTrophyCount() {
    const d = this.ensureWardenState()?.defeated || {};
    return Object.keys(d).filter(k => d[k] === true).length;
  }

  getWardenGoldMult() {
    return 1 + WARDEN_TROPHY_GOLD * this.getWardenTrophyCount();
  }

  // Warden floors the hero has reached (up to indexFloor) plus the next one ahead
  getWardenFloors() {
    const reached = Math.floor(getIndexFloor(this.gameState.hero) / WARDEN_INTERVAL) * WARDEN_INTERVAL;
    const floors = [];
    for (let f = WARDEN_INTERVAL; f <= reached + WARDEN_INTERVAL; f += WARDEN_INTERVAL) floors.push(f);
    return floors;
  }

  // A passed Warden whose trophy is missing (e.g. Wardens unlocked after the hero climbed past
  // floor 250) can be fought from the Warden list. The hero keeps his climb floor; winning
  // or losing just ends the challenge.
  canChallengeWarden(floor) {
    return this.isWardenFloor(floor) && !this.wardenChallenge && !this.isWardenDefeated(floor) &&
      floor < this.gameState.hero.floor && floor <= getIndexFloor(this.gameState.hero);
  }

  challengeWarden(floor) {
    if (!this.canChallengeWarden(floor)) return false;
    this.wardenChallenge = { floor };
    this.initMonster();
    return true;
  }

  endWardenChallenge() {
    if (!this.wardenChallenge) return false;
    this.wardenChallenge = null;
    this.initMonster();
    return true;
  }

  // The floor the current fight is on (a challenged Warden's, else the climb floor)
  getFightFloor() {
    return this.wardenChallenge ? this.wardenChallenge.floor : this.gameState.hero.floor;
  }

  initMonster() {
    const floor = this.getFightFloor();
    const isWarden = this.isWardenFloor(floor);
    const isBoss = floor % 10 === 0;

    const nameIdx = (floor - 1) % MONSTER_NAMES.length;
    const name = isWarden ? t('combat.warden_name', { name: getWardenName(floor) })
      : isBoss ? t('combat.boss_name', { name: MONSTER_DISPLAY[nameIdx] }) : MONSTER_DISPLAY[nameIdx];
    // Portrait lookup key (English, with the boss prefix bossArt.js strips)
    const artName = isWarden ? '' : (isBoss ? '⚡ BOSS: ' : '') + MONSTER_NAMES[nameIdx];

    // Scaling HP & Attack based on floor
    const scale = combatFloorScale(floor);
    const hp = Math.floor((isBoss ? BOSS_HP_MULT * (isWarden ? WARDEN_HP_MULT : 1) : 60) * scale);
    const attack = Math.floor((isBoss ? 15 : 6) * scale);
    const timer = (isWarden ? WARDEN_TIMER_SECONDS : (isBoss ? BOSS_TIMER_SECONDS : 0)) + (isBoss ? this.gear.bossTimerBonus() : 0);

    this.monster = {
      name,
      artName,
      isBoss,
      isWarden,
      floor,
      maxHp: hp,
      hp: hp,
      attack: attack,
      attackCooldown: 1.2,
      timer,
      maxTimer: timer,
      blocksFirstHit: this.gear.hasUnique('camry_buckler')
    };
  }

  // True if the current kit beats a boss on `floor` within the boss timer and survives the
  // fight. Closed-form and conservative: average crit (and any active attack buff) counts,
  // regen/lifesteal/shield/skills/clicks don't, so it may undershoot by a few floors (the hero
  // then climbs back on his own).
  canClearBossFloor(floor) {
    const h = this.gameState.hero;
    const scale = combatFloorScale(floor);
    const crit = Math.min(1, Math.max(0, gearStat('amulet', h.gear.amulet)));
    const dmg = this.getTotalAttack() * (1 + crit * (this.gear.critMult(1) - 1)) * this.gear.bossDamageMult();
    if (!(dmg > 0)) return false;
    const speed = h.attackSpeed > 0 ? h.attackSpeed : 1;
    const hits = Math.ceil((BOSS_HP_MULT * scale) / dmg);
    if (hits * speed > BOSS_TIMER_SECONDS) return false;
    const bossHits = Math.floor((hits * speed) / 1.2);
    return bossHits * 15 * scale < this.getTotalMaxHp();
  }

  // Highest floor in [1, upTo] whose boss the kit clears (difficulty only grows with the floor,
  // so a binary search is exact for the estimate). ~20 checks even at floor 700k.
  getKitClearFloor(upTo) {
    let lo = 1, hi = Math.max(1, Math.floor(upTo));
    if (this.canClearBossFloor(hi)) return hi;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (this.canClearBossFloor(mid)) lo = mid; else hi = mid;
    }
    return lo;
  }

  // Legacy Tower rebase, second half (the first half, rescaling gear to the 1.11 curve, is
  // migrations.js step 3, which flags the hero). Needs live combat stats, so it runs here:
  // step the floor down to what the rebased kit clears, keep maxFloor as the record, and set
  // indexFloor = min(maxFloor, rebased floor) for the Market Index.
  rebaseLegacyFloor() {
    const h = this.gameState.hero;
    if (!h?.pendingFloorRebase) return false;
    delete h.pendingFloorRebase;
    const floor = Number.isFinite(h.floor) && h.floor >= 1 ? Math.floor(h.floor) : 1;
    h.floor = this.getKitClearFloor(floor);
    if (!(Number.isFinite(h.maxFloor) && h.maxFloor >= h.floor)) h.maxFloor = h.floor;
    h.indexFloor = Math.min(h.maxFloor, h.floor);
    h.hp = this.getTotalMaxHp();
    h.shield = 0;
    return true;
  }

  getZone(floor) {
    for (const z of ZONES) {
      if (floor >= z.minFloor && floor <= z.maxFloor) return z;
    }
    return ZONES[ZONES.length - 1];
  }

  getTotalAttack() {
    const h = this.gameState.hero;
    let atk = h.baseAttack + gearStat('weapon', h.gear.weapon);
    // Titan's Legacy (dust shop): +25 Attack per rank
    atk += getShopRank(this.gameState, 'titan_legacy') * 25;
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
    
    // Gear affixes (Might) and the Ladle of Infinite Kabsa
    atk *= this.gear.attackMult();

    // Aether Forge
    if (this.gameState.hero.aetherForgeLevel) {
      atk *= (1 + this.gameState.hero.aetherForgeLevel * 0.25);
    }
    
    // Keep hero stats finite (crit x2 included); capped monster stats stay far below this
    return Math.floor(Math.min(atk, COMBAT_STAT_MAX));
  }

  getTotalMaxHp() {
    const h = this.gameState.hero;
    let hp = h.maxHp + gearStat('armor', h.gear.armor) + (h.level - 1) * 20;
    // Titan's Legacy (dust shop): +100 HP per rank
    hp += getShopRank(this.gameState, 'titan_legacy') * 100;
    
    // Excavation -> hero Max HP: +1% per max depth, capped at +100%
    hp *= this.gameState.getDepthVitalityMult();
    
    // Gear affixes (Vigor) and the Sacred Fanila
    hp *= this.gear.hpMult();

    // Aether Forge
    if (h.aetherForgeLevel) {
      hp *= (1 + h.aetherForgeLevel * 0.25);
    }
    
    return Math.floor(Math.min(hp, COMBAT_STAT_MAX));
  }

  getAetherForgeCost() {
    const level = this.gameState.hero.aetherForgeLevel || 0;
    // FORGE_BASE_COST x FORGE_COST_GROWTH^level (R53, priced for the R31 Oil curve: one hour of
    // casual income buys about level 5 at hour one, 16 at day one, 34 at week one, 41 at a month,
    // which keeps `npm run sim:tower` floors within ~10% of the pre-R31 report).
    // BigNum pow: a plain Math.pow overflows to Infinity, which new BigNum() turns into 0.
    return new BigNum(FORGE_COST_GROWTH).pow(level).mul(FORGE_BASE_COST);
  }

  upgradeAetherForge() {
    const cost = this.getAetherForgeCost();
    if (this.gameState.aether.gte(cost)) {
      this.gameState.aether = this.gameState.aether.sub(cost);
      this.gameState.hero.aetherForgeLevel = (this.gameState.hero.aetherForgeLevel || 0) + 1;
      this.gameState.hero.hp = this.getTotalMaxHp(); // Heal to new max
      rewards.notify({
        tier: 'medium', kind: 'aether-forge', icon: '🔥', color: '#38bdf8',
        title: t('combat.forge_toast', { n: this.gameState.hero.aetherForgeLevel }), detail: t('combat.forge_detail')
      });
      return true;
    }
    return false;
  }

  // Active click on monster (player can attack actively as fast as they click!)
  rollGearCritTier() {
    const stat = gearStat('amulet', this.gameState.hero?.gear?.amulet);
    return resolveCritTier(stat);
  }

  rollGearCrit() {
    return this.rollGearCritTier() > 0;
  }

  activeClickAttack(clientX, clientY) {
    if (!this.monster || this.monster.hp <= 0) return;
    const tier = this.rollGearCritTier();
    const mult = this.gear.critMult(tier);
    const dmg = Math.max(1, Math.floor(this.getTotalAttack() * 0.75 * mult));
    this.dealDamageToMonster(dmg, clientX, clientY, tier);
    sound.playHit();
  }

  isCombatVisible() {
    return typeof window !== 'undefined' && (!window.gameApp || window.gameApp.currentTab === 'combat');
  }

  castHeroSkill(skillKey) {
    const h = this.gameState.hero;
    const skill = h.skills[skillKey];
    if (!skill || skill.cd > 0) return;

    skill.cd = skill.maxCd;
    sound.playSpell();

    const isVis = this.isCombatVisible();
    const spawnX = isVis && typeof window !== 'undefined' ? window.innerWidth / 2 : null;
    const spawnY = isVis && typeof window !== 'undefined' ? window.innerHeight / 2 : null;

    if (skillKey === 'strike') {
      const dmg = Math.floor(this.getTotalAttack() * skill.dmgMult);
      this.dealDamageToMonster(dmg, spawnX, spawnY, true);
    } else if (skillKey === 'shield') {
      h.shield += Math.floor(this.getTotalMaxHp() * 0.35);
      if (spawnX && spawnY) particles.spawnFloatingText(spawnX, spawnY, `+SHIELD ${this.fmt(h.shield)}`, '#38bdf8', true);
    } else if (skillKey === 'leech') {
      const dmg = Math.floor(this.getTotalAttack() * 1.5);
      this.dealDamageToMonster(dmg, spawnX, spawnY, false);
      const heal = Math.floor(this.getTotalMaxHp() * skill.healPercent);
      h.hp = Math.min(this.getTotalMaxHp(), h.hp + heal);
      if (spawnX && spawnY) particles.spawnFloatingText(spawnX, spawnY, `+${this.fmt(heal)} HP`, '#4ade80', true);
    } else if (skillKey === 'supernova') {
      const dmg = Math.floor(this.getTotalAttack() * skill.dmgMult);
      this.dealDamageToMonster(dmg, spawnX, spawnY, true);
    }
  }

  dealDamageToMonster(amount, x, y, critTier = 0) {
    // Slayer affixes and the Stick of Discipline: more damage to bosses
    if (this.monster.isBoss) amount = Math.floor(amount * this.gear.bossDamageMult());
    this.monster.hp -= amount;
    const isCrit = typeof critTier === 'number' ? critTier > 0 : Boolean(critTier);
    const tier = typeof critTier === 'number' ? critTier : (isCrit ? 1 : 0);
    if (x && y && this.isCombatVisible()) {
      let color = '#f97316';
      let label = '';
      if (tier >= 2) {
        color = '#f59e0b';
        label = '⚡ SUPER CRIT! ';
      } else if (tier === 1) {
        color = '#ef4444';
        label = 'CRIT! ';
      }
      feedback.fire(isCrit ? 1 : 0, {
        kind: 'hit', at: { x, y }, sparks: tier >= 2 ? 14 : isCrit ? 10 : 8, color,
        text: `${label}-${this.fmt(amount)}`, isCrit
      });
    }

    // Lifesteal
    const lifesteal = gearStat('relic', this.gameState.hero.gear.relic);
    if (lifesteal > 0) {
      const heal = Math.floor(amount * lifesteal);
      const room = this.getTotalMaxHp() - this.gameState.hero.hp;
      this.gameState.hero.hp = Math.min(this.getTotalMaxHp(), this.gameState.hero.hp + heal);
      if (heal > room) this.gear.absorbOverheal(heal - Math.max(0, room));
    }

    if (this.monster.hp <= 0) {
      this.onMonsterDefeated();
    }
  }

  onMonsterDefeated() {
    sound.playDefeat();
    const h = this.gameState.hero;
    const floor = this.getFightFloor();
    const isBoss = this.monster.isBoss;
    const isWarden = !!this.monster.isWarden;
    const rewardMult = isWarden ? WARDEN_REWARD_MULT : 1;

    this.gameState.stats.totalMonstersSlain++;
    if (isBoss) this.gameState.stats.totalBossesSlain++;

    // Gold reward scales with floor at 1.12^floor, the same curve as monster HP,
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
    // Warden trophies: +2% Tower gold each
    goldMult *= this.getWardenGoldMult();
    // Greed affixes on equipped gear
    goldMult *= this.gear.goldMult();
    // Falcon Week (Souq Rotation, R15): boss gold x1.5
    if (isBoss) goldMult *= this.gameState.calendarSystem?.getBossGoldMult?.() || 1;
    const goldEarned = new BigNum(MONSTER_FLOOR_BASE).pow(floor - 1).mul(new BigNum((isBoss ? 50 : 10) * rewardMult * goldMult)).floor();
    this.gameState.gold = this.gameState.gold.add(goldEarned);

    // XP Reward
    const xpGained = (isBoss ? 40 : 10) * rewardMult * floor;
    h.xp += xpGained;
    if (h.xp >= h.xpNeeded) {
      h.level++;
      h.xp -= h.xpNeeded;
      h.xpNeeded = Math.floor(h.xpNeeded * 1.35);
      h.hp = this.getTotalMaxHp();
      rewards.notify({
        tier: 'medium', kind: 'hero-level', icon: '⬆️', color: '#fbbf24',
        title: t('combat.hero_level', { lv: h.level }), batchTitle: t('combat.hero_level_batch', { lv: h.level })
      });
    }

    // Loot drops
    this.rollLoot(floor, isBoss);
    this.gear.onKill();

    if (isWarden) this.onWardenDefeated(floor);

    // Check bounties
    if (this.gameState.bountySystem) {
      this.gameState.bountySystem.checkProgress('slay_monster', 1);
      if (isBoss) this.gameState.bountySystem.checkProgress('slay_boss', 1);
    }

    // A challenged Warden doesn't move the climb: back to the hero's own floor
    if (this.wardenChallenge) {
      this.endWardenChallenge();
      return;
    }

    // Kashta camp: keep farming this floor instead of climbing
    if (this.kashta.active) {
      this.initMonster();
      return;
    }

    // Advance floor
    h.floor++;
    if (h.floor > h.maxFloor) {
      h.maxFloor = h.floor;
    }
    if (h.floor > getIndexFloor(h)) {
      h.indexFloor = h.floor;
    }

    this.initMonster();
  }

  // Extra Warden spoils, and the trophy on the first kill of each Warden
  onWardenDefeated(floor) {
    const inv = this.gameState.inventory;
    inv.voidCores = (inv.voidCores || 0) + 2; // with rollLoot's boss drop: 3 per Warden
    inv.bossTokens = (inv.bossTokens || 0) + 2;
    const w = this.ensureWardenState();
    if (w.defeated[floor]) return false;
    w.defeated[floor] = true;
    // Epic tier (§5.1): ceremony + choir
    rewards.notify({
      tier: 'epic', kind: 'warden-trophy', icon: '🏆', color: '#fbbf24',
      title: t('combat.trophy', { name: getWardenName(floor) }), batchTitle: t('combat.trophy_batch'),
      detail: t('combat.trophy_detail', { n: Math.round(WARDEN_TROPHY_GOLD * 100) })
    });
    return true;
  }

  // Tower setbacks: a quiet red toast; an auto-climb bouncing off a boss folds into one (×N)
  notifySetback(title) {
    rewards.notify({ tier: 'small', kind: 'tower-setback', icon: '⚠️', color: '#ef4444', title });
  }

  // One kill's loot (R64): the drop table, pity and bag live in GearSystem
  rollLoot(floor, isBoss) {
    return this.gear.rollDrop(floor, isBoss);
  }

  // --- Kashta (R64, docs/gear-and-boss-design.md §2.6) ---
  // After two losses at the same gate the hero camps on the highest non-boss floor below it for
  // five minutes: he keeps killing and looting there, then retries the gate. Never on a boss
  // floor. Not saved: a reload simply ends a camp.

  isKashtaAuto() {
    return this.gameState.settings?.kashtaAuto !== false;
  }

  // Highest floor below `gate` that is not a boss floor
  kashtaFloor(gate) {
    let f = Math.max(1, gate - 1);
    while (f > 1 && f % 10 === 0) f--;
    return f;
  }

  startKashta(gate, manual = false) {
    const k = this.kashta, h = this.gameState.hero;
    k.active = true; k.manual = manual; k.gate = gate; k.fails = 0; k.check = 0;
    k.remaining = manual ? Infinity : KASHTA_SECONDS;
    h.floor = manual && gate % 10 !== 0 ? gate : this.kashtaFloor(gate);
    this.initMonster();
  }

  endKashta() {
    const k = this.kashta, h = this.gameState.hero;
    if (!k.active) return false;
    k.active = false; k.manual = false; k.fails = 0; k.lastFail = 0;
    h.floor = Math.max(1, k.gate);
    this.initMonster();
    return true;
  }

  // Player toggle: camp here (a boss floor camps one below) or go back to climbing
  toggleKashta() {
    if (this.kashta.active) return this.endKashta();
    if (this.wardenChallenge) return false;
    this.startKashta(this.gameState.hero.floor, true);
    return true;
  }

  // The hero lost the fight on `floor` (boss timer, or he died): step back, or start a camp
  retreatFrom(floor) {
    const h = this.gameState.hero, k = this.kashta;
    if (k.active) {
      h.floor = this.kashtaFloor(floor);
    } else {
      k.fails = k.lastFail === floor ? k.fails + 1 : 1;
      k.lastFail = floor;
      if (k.fails >= KASHTA_FAILS && floor >= KASHTA_MIN_FLOOR && this.isKashtaAuto()) {
        this.startKashta(floor);
        return;
      }
      h.floor = Math.max(1, floor - 1);
    }
    this.initMonster();
  }

  tickKashta(dt) {
    const k = this.kashta;
    if (!k.active) return;
    if (k.manual) return;
    k.remaining -= dt;
    k.check += dt;
    // Retry early once the kit clearly beats a boss gate (the estimate is conservative)
    if (k.check >= 5) {
      k.check = 0;
      if (k.gate % 10 === 0 && this.canClearBossFloor(k.gate)) k.remaining = 0;
    }
    if (k.remaining <= 0) this.endKashta();
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

    this.gear.tick(dt);
    this.tickKashta(dt);

    // Hero Auto-Attack
    h.attackCooldown -= dt;
    if (h.attackCooldown <= 0) {
      h.attackCooldown = h.attackSpeed;
      const tier = this.rollGearCritTier();
      const mult = this.gear.critMult(tier);
      const dmg = this.getTotalAttack() * mult;
      const isVisible = this.isCombatVisible();
      this.dealDamageToMonster(dmg, isVisible && typeof window !== 'undefined' ? (window.innerWidth / 2 + 100) : null, isVisible && typeof window !== 'undefined' ? (window.innerHeight / 2) : null, tier);
    }

    // Boss Timer
    if (this.monster.isBoss) {
      // A ceremony on screen pauses the boss timer it would otherwise waste (§5.1 big tier)
      if (!rewards.isCeremonyActive()) this.monster.timer -= dt;
      if (this.monster.timer <= 0) {
        if (this.trySecondWind()) return;
        if (this.wardenChallenge) {
          // A lost challenge costs nothing: the hero returns to his climb floor
          this.notifySetback(t('combat.warden_holds'));
          this.endWardenChallenge();
          return;
        }
        // Failed boss timer -> retreat 1 floor
        this.notifySetback(t('combat.boss_timeout'));
        this.retreatFrom(h.floor);
        return;
      }
    }

    // Monster Auto-Attack
    this.monster.attackCooldown -= dt;
    if (this.monster.attackCooldown <= 0) {
      this.monster.attackCooldown = 1.2;
      let dmg = this.monster.attack;

      if (this.monster.blocksFirstHit) {
        // Camry Door Buckler: the first monster hit of each fight is fully blocked
        this.monster.blocksFirstHit = false;
        dmg = 0;
      }

      if (h.shield > 0) {
        const absorb = Math.min(h.shield, dmg);
        h.shield -= absorb;
        dmg -= absorb;
      }

      if (dmg > 0) {
        h.hp -= dmg;
        const isVisible = this.isCombatVisible();
        if (isVisible && typeof window !== 'undefined') {
          sound.playHit();
          particles.spawnFloatingText(window.innerWidth / 2 - 100, window.innerHeight / 2, `-${this.fmt(dmg)}`, '#ef4444', false);
        }

        if (h.hp <= 0) {
          h.hp = this.getTotalMaxHp();
          if (this.trySecondWind()) return;
          if (this.wardenChallenge) {
            this.notifySetback(t('combat.warden_holds'));
            this.endWardenChallenge();
            return;
          }
          // Hero died -> retreat 1 floor and restore HP
          this.notifySetback(t('combat.defeated'));
          this.retreatFrom(h.floor);
        }
      }
    }
  }
}
