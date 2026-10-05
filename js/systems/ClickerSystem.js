import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { particles } from '../engine/ParticleEngine.js';

export class ClickerSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.anomalyTimer = 45; // seconds until next golden rift anomaly
    this.anomalyActive = false;
    this.anomalyX = 50;
    this.anomalyY = 50;
    this.anomalyType = 'jackpot';
  }

  handleClick(clientX, clientY) {
    // Determine if critical strike
    const isCrit = Math.random() < this.gameState.critChance;
    let yieldAmount = this.gameState.getClickYield();

    if (isCrit) {
      yieldAmount = yieldAmount.mul(this.gameState.critMultiplier);
      sound.playCrit();
    } else {
      sound.playClick(1 + (this.gameState.comboCount % 20) * 0.03);
    }

    // Award aether
    this.gameState.aether = this.gameState.aether.add(yieldAmount);
    this.gameState.totalAetherEarned = this.gameState.totalAetherEarned.add(yieldAmount);
    this.gameState.totalClicks++;

    // Increment combo
    this.gameState.comboCount = Math.min(100, this.gameState.comboCount + 1);
    this.gameState.comboTimer = 2.0; // 2 seconds to keep combo active

    // Trigger frenzy if combo hits 100
    if (this.gameState.comboCount >= 100 && !this.gameState.frenzyActive) {
      this.triggerFrenzy(15);
    }

    // Spawn visual feedback
    if (clientX && clientY) {
      particles.spawnClickSparks(clientX, clientY, isCrit ? 20 : 10, isCrit ? '#f59e0b' : '#38bdf8');
      const text = (isCrit ? 'CRIT! +' : '+') + yieldAmount.format('standard', 1);
      particles.spawnFloatingText(clientX, clientY, text, isCrit ? '#fbbf24' : '#67e8f9', isCrit);
    }

    // Notify bounty / achievements
    if (this.gameState.bountySystem) {
      this.gameState.bountySystem.checkProgress('click', 1);
      if (isCrit) this.gameState.bountySystem.checkProgress('crit_click', 1);
    }
  }

  triggerFrenzy(duration = 15) {
    this.gameState.frenzyActive = true;
    this.gameState.frenzyTimer = duration;
    sound.playSpell();
  }

  update(dt) {
    // Combo timer decay
    if (this.gameState.comboTimer > 0) {
      this.gameState.comboTimer -= dt;
      if (this.gameState.comboTimer <= 0) {
        this.gameState.comboCount = Math.max(0, this.gameState.comboCount - 5);
        if (this.gameState.comboCount > 0) {
          this.gameState.comboTimer = 0.2; // drain smoothly
        }
      }
    }

    // Frenzy timer decay
    if (this.gameState.frenzyActive) {
      this.gameState.frenzyTimer -= dt;
      // Auto-click pulse during frenzy (5 clicks/sec)
      if (Math.random() < dt * 6) {
        const fakeX = window.innerWidth / 2 + (Math.random() - 0.5) * 120;
        const fakeY = window.innerHeight / 2 + (Math.random() - 0.5) * 120;
        this.handleClick(fakeX, fakeY);
      }
      if (this.gameState.frenzyTimer <= 0) {
        this.gameState.frenzyActive = false;
      }
    }

    // Golden Rift Anomaly Spawning
    if (!this.anomalyActive) {
      this.anomalyTimer -= dt;
      if (this.anomalyTimer <= 0) {
        this.spawnAnomaly();
      }
    } else {
      // Anomaly floats and fades
      this.anomalyLife -= dt;
      if (this.anomalyLife <= 0) {
        this.anomalyActive = false;
        this.anomalyTimer = 50 + Math.random() * 40;
      }
    }
  }

  spawnAnomaly() {
    this.anomalyActive = true;
    this.anomalyLife = 12; // 12 seconds to click it
    this.anomalyX = 15 + Math.random() * 70; // % across screen
    this.anomalyY = 20 + Math.random() * 60; // % down screen

    const types = ['supernova', 'time_flux', 'mana_cache', 'gem_cache'];
    this.anomalyType = types[Math.floor(Math.random() * types.length)];
  }

  clickAnomaly(x, y) {
    if (!this.anomalyActive) return;
    this.anomalyActive = false;
    this.anomalyTimer = 60 + Math.random() * 60;

    sound.playGem();
    particles.spawnClickSparks(x, y, 35, '#eab308');

    let rewardText = '';
    const cps = this.gameState.getNetAetherPerSecond();

    if (this.anomalyType === 'supernova') {
      // 10 minutes worth of Aether or minimum 5000 * click
      const payout = cps.mul(600).max(this.gameState.getClickYield().mul(500));
      this.gameState.aether = this.gameState.aether.add(payout);
      this.gameState.totalAetherEarned = this.gameState.totalAetherEarned.add(payout);
      rewardText = 'SUPERNOVA! +' + payout.format('standard', 2) + ' Aether';
    } else if (this.anomalyType === 'time_flux') {
      this.triggerFrenzy(25);
      rewardText = 'TIME FLUX! 25s Frenzy Active!';
    } else if (this.anomalyType === 'mana_cache') {
      this.gameState.mana = this.gameState.maxMana;
      this.gameState.chronoSand = (this.gameState.chronoSand || 0) + 120;
      rewardText = 'COSMIC CACHE! Full Mana + 120 Chrono Sand';
    } else {
      const gems = ['rubies', 'sapphires', 'emeralds', 'diamonds'];
      const gem = gems[Math.floor(Math.random() * gems.length)];
      const amount = 3 + Math.floor(Math.random() * 5);
      this.gameState.inventory[gem] = (this.gameState.inventory[gem] || 0) + amount;
      rewardText = `ANCIENT VEIN! +${amount} ${gem.toUpperCase()}`;
    }

    particles.spawnFloatingText(x, y, rewardText, '#fde047', true);
  }
}
