import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { rewards } from '../ui/rewards.js';
import { hasShopItem } from './DustShopSystem.js';

export const SPELLS = [
  {
    id: 'aether_burst',
    name: 'Aether Burst',
    icon: '⚡',
    manaCost: 25,
    cooldown: 30,
    desc: 'Instantly grants 2 minutes of ambient Aether production.'
  },
  {
    id: 'chrono_warp',
    name: 'Chrono Warp',
    icon: '⏳',
    manaCost: 40,
    cooldown: 60,
    desc: 'Distorts spacetime, accelerating game time by 5x for 15s.'
  },
  {
    id: 'midas_touch',
    name: "Midas' Blessing",
    icon: '🪙',
    manaCost: 30,
    cooldown: 45,
    desc: 'Each click also yields massive Gold reserves for 25s.'
  },
  {
    id: 'celestial_alignment',
    name: 'Celestial Alignment',
    icon: '🌟',
    manaCost: 50,
    cooldown: 90,
    desc: 'Aligns zodiac constellations: +300% Aether production for 30s.'
  },
  {
    id: 'void_strike',
    name: 'Void Cataclysm',
    icon: '☄️',
    manaCost: 35,
    cooldown: 40,
    desc: 'Deals 40% of dungeon monster HP & blasts 4 mining blocks (40 pickaxe hits each).'
  },
  {
    id: 'astral_refresh',
    name: 'Astral Renewal',
    icon: '🌀',
    manaCost: 75,
    cooldown: 180,
    desc: 'Resets cooldowns of all spells and hero abilities instantly.'
  }
];

export class SpellSystem {
  constructor(gameState, gameLoop) {
    this.gameState = gameState;
    this.gameLoop = gameLoop;
    this.initSpells();
  }

  initSpells() {
    if (!this.gameState.spells) {
      this.gameState.spells = {};
    }
    for (const s of SPELLS) {
      if (!this.gameState.spells[s.id]) {
        this.gameState.spells[s.id] = { cd: 0 };
      }
    }
  }

  canCast(spellId) {
    const s = SPELLS.find(sp => sp.id === spellId);
    if (!s) return false;
    const state = this.gameState.spells[spellId];
    if (state.cd > 0) return false;
    if (this.gameState.mana < s.manaCost) return false;
    return true;
  }

  // Spell feedback is a quiet toast (the cast sound already played); auto-casts of the same
  // spell fold into one ("Aether Burst ×3", amounts summed)
  notifySpell(icon, name, color, extra = {}) {
    rewards.notify({ tier: 'small', kind: `spell-${name}`, icon, color, title: name, ...extra });
  }

  castSpell(spellId) {
    if (!this.canCast(spellId)) return false;

    const s = SPELLS.find(sp => sp.id === spellId);
    const state = this.gameState.spells[spellId];

    this.gameState.mana -= s.manaCost;
    state.cd = s.cooldown;
    this.gameState.stats.totalSpellsCast++;
    sound.playSpell();

    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;

    if (spellId === 'aether_burst') {
      const cps = this.gameState.getNetAetherPerSecond();
      const payout = cps.mul(120).max(this.gameState.getClickYield().mul(100));
      this.gameState.aether = this.gameState.aether.add(payout);
      this.gameState.totalAetherEarned = this.gameState.totalAetherEarned.add(payout);
      this.notifySpell('🔮', 'Aether Burst', '#38bdf8', { amount: payout, fmt: (a) => a.format('standard', 2), unit: 'Aether' });
    } else if (spellId === 'chrono_warp') {
      this.removeBuff('chrono_warp');
      this.gameState.activeBuffs.push({
        id: 'chrono_warp',
        name: 'Chrono Warp (5x Speed)',
        type: 'time_speed',
        value: 5,
        duration: 15,
        maxDuration: 15
      });
      if (this.gameLoop) this.gameLoop.timeScale = 5.0;
      this.notifySpell('⏳', 'Chrono Warp', '#f59e0b', { detail: 'Time ×5 for 15s' });
    } else if (spellId === 'midas_touch') {
      this.removeBuff('midas_touch');
      this.gameState.activeBuffs.push({
        id: 'midas_touch',
        name: "Midas' Blessing",
        type: 'click_gold',
        value: 1,
        duration: 25,
        maxDuration: 25
      });
      this.notifySpell('🪙', "Midas' Blessing", '#eab308', { detail: 'Clicks give gold for 25s' });
    } else if (spellId === 'celestial_alignment') {
      this.removeBuff('celestial_alignment');
      this.gameState.activeBuffs.push({
        id: 'celestial_alignment',
        name: 'Celestial Alignment',
        type: 'aether_mult',
        value: 4.0,
        duration: 30,
        maxDuration: 30
      });
      this.notifySpell('🌟', 'Celestial Alignment', '#ec4899', { detail: '+300% Aether for 30s' });
    } else if (spellId === 'void_strike') {
      if (this.gameState.combatSystem && this.gameState.combatSystem.monster) {
        const m = this.gameState.combatSystem.monster;
        if (m.hp > 0) {
          const dmg = Math.max(10, Math.floor(m.maxHp * 0.4));
          this.gameState.combatSystem.dealDamageToMonster(dmg, x, y, true);
        }
      }
      // 4 random tiles take EXPLOSIVE_HITS pickaxe hits each (blastBlocks stops at the stairs)
      const ms = this.gameState.miningSystem;
      if (ms && !ms.descending) {
        const unrev = this.gameState.miningGrid.blocks.filter(b => !b.revealed);
        const picks = [];
        for (let i = 0; i < 4 && unrev.length > 0; i++) {
          picks.push(unrev.splice(Math.floor(Math.random() * unrev.length), 1)[0]);
        }
        ms.blastBlocks(picks, x, y);
      }
      this.notifySpell('☄️', 'Void Cataclysm', '#a855f7');
    } else if (spellId === 'astral_refresh') {
      for (const key in this.gameState.spells) {
        if (key !== 'astral_refresh') {
          this.gameState.spells[key].cd = 0;
        }
      }
      if (this.gameState.hero?.skills) {
        for (const k in this.gameState.hero.skills) {
          this.gameState.hero.skills[k].cd = 0;
        }
      }
      this.notifySpell('🌀', 'Astral Refresh', '#06b6d4', { detail: 'All cooldowns reset' });
    }

    if (this.gameState.bountySystem) {
      this.gameState.bountySystem.checkProgress('cast_spell', 1);
    }
    return true;
  }

  removeBuff(id) {
    this.gameState.activeBuffs = this.gameState.activeBuffs.filter(b => b.id !== id);
  }

  getMaxMana() {
    let max = 100 + (this.gameState.talents?.mana_flow?.rank || 0) * 20;
    // Excavation -> Max Mana: +1% per max depth, capped at +100%
    max *= this.gameState.getDepthVitalityMult();
    return Math.floor(max);
  }

  getManaRegen() {
    let regen = 2.0 + (this.gameState.talents?.mana_flow?.rank || 0) * 1.0;
    // Excavation -> Mana Regen: +1% per max depth, capped at +100%
    regen *= this.gameState.getDepthVitalityMult();
    return regen;
  }

  update(dt, realDt = dt) {
    // Automated Leylines (dust shop): when mana is full, auto-cast the next ready spell
    if (hasShopItem(this.gameState, 'auto_leylines') && this.gameState.mana >= this.gameState.maxMana) {
      const next = SPELLS.find(d => d.id !== 'astral_refresh' && this.canCast(d.id));
      if (next) this.castSpell(next.id);
    }

    // Regenerate Mana
    this.gameState.maxMana = this.getMaxMana();
    if (this.gameState.mana < this.gameState.maxMana) {
      this.gameState.mana = Math.min(this.gameState.maxMana, this.gameState.mana + this.getManaRegen() * dt);
    }
    // Leyline Overflow: while mana is full, Garden grows x1.5 and Auto-Drills run x1.25.
    // Garden/Mining read gameState.getLeylineGardenMult() / getLeylineDrillMult(); nothing is pushed here.

    // Decrement spell cooldowns
    for (const key in this.gameState.spells) {
      const s = this.gameState.spells[key];
      if (s.cd > 0) {
        s.cd = Math.max(0, s.cd - realDt);
      }
    }

    // Check if Chrono Warp buff expired
    const warpBuff = this.gameState.activeBuffs.find(b => b.id === 'chrono_warp');
    if (!warpBuff && this.gameLoop && this.gameLoop.timeScale > 1.0) {
      this.gameLoop.timeScale = 1.0;
    }
  }
}
