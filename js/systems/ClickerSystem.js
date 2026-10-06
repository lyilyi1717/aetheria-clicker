import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { particles } from '../engine/ParticleEngine.js';
import { rewards } from '../ui/rewards.js';

// --- R3 Golden Anomalies (docs/redesign-proposal.md §5.2) ---
// Spawn every 60-120 s after the last click (50-90 s after one escapes). Weights are out of 60:
// Mirage 1 in 12, Caravan Star 1 in 20, the four classics share the rest (13/60 each).
export const ANOMALY_WEIGHTS = {
  supernova: 13, time_flux: 13, mana_cache: 13, gem_cache: 13, mirage: 5, caravan_star: 3
};
export const SUPERNOVA_CPS_SECONDS = 180;   // was 600
export const SUPERNOVA_MIN_CLICKS = 500;
export const MIRAGE_MULT = 2;               // x2 Aether production and gold
export const MIRAGE_DURATION = 60;
// Caravan Star: a free large caravan (the Bazaar's 60-min tier, 1.5x its list price, no cargo).
// If a caravan is already on the road, its payout is paid at once instead.
export const CARAVAN_STAR_PROFIT = 1.5;
export const CARAVAN_STAR_MINUTES = 60;
export const CARAVAN_STAR_INVEST = 2000;    // x Market Index, same as the large caravan

// Pick an anomaly type for a roll r in [0, 1)
export function pickAnomalyType(r) {
  const entries = Object.entries(ANOMALY_WEIGHTS);
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let x = r * total;
  for (const [id, w] of entries) {
    if (x < w) return id;
    x -= w;
  }
  return entries[entries.length - 1][0];
}

const fmtStd = (a) => a.format('standard', 2);

export class ClickerSystem {
  // rng: injectable () => [0,1) so tests can seed anomaly rolls (defaults to Math.random)
  constructor(gameState, rng = Math.random) {
    this.gameState = gameState;
    this.rng = rng;
    this.anomalyTimer = 45; // seconds until next golden rift anomaly
    this.anomalyActive = false;
    this.anomalyX = 50;
    this.anomalyY = 50;
    this.anomalyType = 'jackpot';
  }

  handleClick(clientX, clientY, isAutoClick = false) {
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

    // Midas' Blessing spell: each click also mints gold scaled to the current dungeon floor
    if (this.gameState.activeBuffs.some(b => b.type === 'click_gold')) {
      const floor = this.gameState.hero?.floor || 1;
      // BigNum pow: Math.pow(1.15, 4400+) is Infinity, which new BigNum() turned into 0 gold
      const clickGold = new BigNum(1.15).pow(Math.max(0, floor - 1))
        .mul(5 * this.gameState.getGoldMultiplier()).floor().max(1);
      this.gameState.gold = this.gameState.gold.add(clickGold);
    }
    this.gameState.totalAetherEarned = this.gameState.totalAetherEarned.add(yieldAmount);
    this.gameState.totalClicks++;

    // Increment combo (frenzy auto-clicks don't count)
    if (!isAutoClick) {
      this.gameState.comboCount = Math.min(100, this.gameState.comboCount + 1);
      this.gameState.comboTimer = 2.0; // 2 seconds to keep combo active
    }

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
        this.handleClick(fakeX, fakeY, true);
      }
      if (this.gameState.frenzyTimer <= 0) {
        this.gameState.frenzyActive = false;
        this.gameState.comboCount = 0;
        this.gameState.comboTimer = 0;
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
        this.anomalyTimer = 50 + this.rng() * 40;
      }
    }
  }

  spawnAnomaly() {
    this.anomalyActive = true;
    this.anomalyLife = 12; // 12 seconds to click it
    this.anomalyX = 15 + this.rng() * 70; // % across screen
    this.anomalyY = 20 + this.rng() * 60; // % down screen
    this.anomalyType = pickAnomalyType(this.rng());
  }

  clickAnomaly(x, y) {
    if (!this.anomalyActive) return;
    this.anomalyActive = false;
    this.anomalyTimer = 60 + this.rng() * 60;

    sound.playGem();
    if (x && y) particles.spawnClickSparks(x, y, 35, '#eab308');

    const cps = this.gameState.getNetAetherPerSecond();
    const note = { tier: 'medium', icon: '✨', color: '#fde047' };

    if (this.anomalyType === 'supernova') {
      // 3 minutes of Aether, or 500 clicks' worth on a fresh run
      const payout = cps.mul(SUPERNOVA_CPS_SECONDS).max(this.gameState.getClickYield().mul(SUPERNOVA_MIN_CLICKS));
      this.gameState.aether = this.gameState.aether.add(payout);
      this.gameState.totalAetherEarned = this.gameState.totalAetherEarned.add(payout);
      rewards.notify({ ...note, kind: 'anomaly-supernova', icon: '💥', title: 'Supernova!', amount: payout, fmt: fmtStd, unit: 'Aether' });
    } else if (this.anomalyType === 'time_flux') {
      this.triggerFrenzy(25);
      rewards.notify({ ...note, kind: 'anomaly-flux', icon: '⏱️', title: 'Time Flux!', detail: '25 s of Frenzy' });
    } else if (this.anomalyType === 'mana_cache') {
      this.gameState.mana = this.gameState.maxMana;
      this.gameState.addChronoSand(120);
      rewards.notify({ ...note, kind: 'anomaly-cache', icon: '💠', title: 'Cosmic Cache!', detail: 'Full Mana and 120 s of Chrono Sand' });
    } else if (this.anomalyType === 'mirage') {
      this.applyMirage();
      rewards.notify({ ...note, kind: 'anomaly-mirage', icon: '🌫️', color: '#c084fc', title: 'Mirage!', detail: `x${MIRAGE_MULT} Aether and gold for ${MIRAGE_DURATION} s` });
    } else if (this.anomalyType === 'caravan_star') {
      const res = this.applyCaravanStar();
      rewards.notify({
        ...note, kind: 'anomaly-caravan', icon: '🐪', color: '#fbbf24', title: 'Caravan Star!',
        detail: res.dispatched ? `A free large caravan sets out (back in ${CARAVAN_STAR_MINUTES} min)` : 'A free caravan arrives at once',
        ...(res.dispatched ? {} : { amount: res.payout, fmt: (a) => a.format('standard', 0), unit: 'gold' })
      });
    } else {
      const gems = ['rubies', 'sapphires', 'emeralds', 'diamonds'];
      const gem = gems[Math.floor(this.rng() * gems.length)];
      const amount = 3 + Math.floor(this.rng() * 5);
      this.gameState.inventory[gem] = (this.gameState.inventory[gem] || 0) + amount;
      rewards.notify({ ...note, kind: 'anomaly-vein', icon: '💎', title: 'Ancient Vein!', detail: `+${amount} ${gem}` });
    }
  }

  // Mirage: x2 Aether production (an Aether buff, adds to Celestial like other Aether buffs) and
  // x2 gold for 60 s. A second Mirage refreshes the timer instead of stacking.
  applyMirage() {
    const gs = this.gameState;
    gs.activeBuffs = gs.activeBuffs.filter(b => b.id !== 'mirage' && b.id !== 'mirage_gold');
    gs.activeBuffs.push(
      { id: 'mirage', name: 'Mirage (Aether)', type: 'aether_mult', value: MIRAGE_MULT, duration: MIRAGE_DURATION, maxDuration: MIRAGE_DURATION },
      { id: 'mirage_gold', name: 'Mirage (Gold)', type: 'gold_mult', value: MIRAGE_MULT, duration: MIRAGE_DURATION, maxDuration: MIRAGE_DURATION }
    );
  }

  // Caravan Star: dispatch a free large caravan, or pay its return now if the road is busy.
  // Returns { dispatched, payout }.
  applyCaravanStar() {
    const gs = this.gameState;
    const index = gs.getMarketIndex();
    const invest = index.mul(CARAVAN_STAR_INVEST);
    const payout = invest.mul(CARAVAN_STAR_PROFIT);
    const caravan = gs.market?.caravan;
    if (caravan && !caravan.active) {
      caravan.active = true;
      caravan.duration = CARAVAN_STAR_MINUTES * 60;
      caravan.maxDuration = CARAVAN_STAR_MINUTES * 60;
      caravan.investment = invest;
      caravan.expectedProfit = CARAVAN_STAR_PROFIT;
      caravan.payout = payout;
      caravan.cargo = null;
      return { dispatched: true, payout };
    }
    gs.gold = gs.gold.add(payout);
    return { dispatched: false, payout };
  }
}
