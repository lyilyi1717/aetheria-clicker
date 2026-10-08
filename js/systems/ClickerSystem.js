import { BigNum } from '../engine/BigNum.js';
import { getActiveRules } from './ChronicleSystem.js';
import { sound } from '../engine/AudioEngine.js';
import { particles } from '../engine/ParticleEngine.js';
import { rewards } from '../ui/rewards.js';
import {
  COMBO_FULL, FRENZY_AUTO_CLICKS, FRENZY_EVERY, FRENZY_DURATION, FRENZY_MAX_TIMER,
  CLICK_MAX_PER_SEC, AUTO_TAP_PER_SEC, AUTO_TAP_IDLE_AFTER
} from './combo.js';
import { hasShopItem } from './DustShopSystem.js';
import { itemName } from '../data/names.js';
import { t } from '../i18n/index.js';

// --- R3 Golden Anomalies (docs/redesign-proposal.md §5.2) ---
// Spawn every 60-120 s after the last click (50-90 s after one escapes). Weights are out of 60:
// Mirage 1 in 12, Caravan Star 1 in 20, the four classics share the rest (13/60 each).
export const ANOMALY_WEIGHTS = {
  supernova: 13, time_flux: 13, mana_cache: 13, gem_cache: 13, mirage: 5, caravan_star: 3
};
export const SUPERNOVA_CPS_SECONDS = 30;   // was 600
export const SUPERNOVA_MIN_CLICKS = 500;
export const MIRAGE_MULT = 1.5;               // x2 Aether production and gold
export const MIRAGE_DURATION = 60;
// Caravan Star: a free large caravan (MarketSystem.getCaravanTier('large'): 60 min, pays 1.5x
// its 2,000 x Market Index list price, no cargo). If a caravan is already on the road, the
// free one's payout is paid at once instead.
const LARGE_CARAVAN = { invest: 2000, minutes: 60, profit: 1.5 }; // fallback without a Bazaar

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
    // Combo count at the last Frenzy milestone (not saved; reset when the combo drains to 0),
    // so a short pause can't re-fire the same milestone
    this.lastFrenzyAt = 0;
    // R52 anti-autoclicker: a token bucket refilled at CLICK_MAX_PER_SEC on real time (update's
    // realDt); a manual click without a token still animates but yields nothing
    this.clickTokens = CLICK_MAX_PER_SEC;
    // Auto-tap: seconds since the last manual click, and the fraction of the next auto-tap
    this.sinceManualClick = Infinity;
    this.autoTapAcc = 0;
    this.onAutoTap = null;   // UI hook (js/ui/autoTap.js): (amount) => void
  }

  // True when Auto-tap is owned and the player hasn't tapped for AUTO_TAP_IDLE_AFTER seconds
  isAutoTapping() {
    return hasShopItem(this.gameState, 'auto_tap') && this.sinceManualClick >= AUTO_TAP_IDLE_AFTER;
  }

  // One Auto-tap: a plain click (no combo, Frenzy, crit or click count), paid like a real one
  autoTap() {
    const gs = this.gameState;
    const amount = gs.getClickBase();
    gs.aether = gs.aether.add(amount);
    gs.totalAetherEarned = gs.totalAetherEarned.add(amount);
    this.onAutoTap?.(amount);
    return amount;
  }

  handleClick(clientX, clientY, isAutoClick = false) {
    if (!isAutoClick) {
      this.sinceManualClick = 0;
      // Over CLICK_MAX_PER_SEC: the tap animates and sounds, but pays nothing
      if (this.clickTokens < 1) {
        sound.playClick(1 + (this.gameState.comboCount % FRENZY_EVERY) * 0.03);
        if (clientX && clientY) particles.spawnClickSparks(clientX, clientY, 6, '#38bdf8');
        return BigNum.zero();
      }
      this.clickTokens -= 1;
    }
    // Determine if critical strike
    const isCrit = Math.random() < this.gameState.critChance;
    let yieldAmount = this.gameState.getClickYield();

    if (isCrit) {
      yieldAmount = yieldAmount.mul(this.gameState.critMultiplier);
      sound.playCrit();
    } else {
      sound.playClick(1 + (this.gameState.comboCount % FRENZY_EVERY) * 0.03);
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
      if (this.gameState.comboCount <= 0) this.lastFrenzyAt = 0;
      this.gameState.comboCount = this.gameState.comboCount + 1;
      this.gameState.comboTimer = 2.0; // 2 seconds to keep combo active

      // Every 20th combo click starts (or extends) Frenzy
      // (a Chronicle challenge may forbid Frenzy, R20)
      const combo = this.gameState.comboCount;
      if (combo % FRENZY_EVERY === 0 && combo > this.lastFrenzyAt && !getActiveRules(this.gameState).noFrenzy) {
        this.lastFrenzyAt = combo;
        this.triggerFrenzy(FRENZY_DURATION);
      }
    }

    // Spawn visual feedback
    if (clientX && clientY) {
      particles.spawnClickSparks(clientX, clientY, isCrit ? 20 : 10, isCrit ? '#f59e0b' : '#38bdf8');
      const text = (isCrit ? t('fx.crit') + ' +' : '+') + yieldAmount.format('standard', 1);
      particles.spawnFloatingText(clientX, clientY, text, isCrit ? '#fbbf24' : '#67e8f9', isCrit);
    }

    // Notify bounty / achievements
    if (this.gameState.bountySystem) {
      this.gameState.bountySystem.checkProgress('click', 1);
      if (isCrit) this.gameState.bountySystem.checkProgress('crit_click', 1);
    }
    return yieldAmount;
  }

  // Starts Frenzy, or adds `duration` to a running one (up to FRENZY_MAX_TIMER, or the
  // current timer if it is already longer, e.g. after a Time Flux)
  triggerFrenzy(duration = FRENZY_DURATION) {
    const gs = this.gameState;
    if (gs.frenzyActive && gs.frenzyTimer > 0) {
      gs.frenzyTimer = Math.max(gs.frenzyTimer, Math.min(FRENZY_MAX_TIMER, gs.frenzyTimer + duration));
    } else {
      gs.frenzyActive = true;
      gs.frenzyTimer = duration;
    }
    sound.playSpell();
  }

  // dt: game time (Chrono Warp speeds it up); realDt: wall-clock time for the click limit and
  // Auto-tap, so neither runs faster during Chrono Warp
  update(dt, realDt = dt) {
    this.clickTokens = Math.min(CLICK_MAX_PER_SEC, this.clickTokens + CLICK_MAX_PER_SEC * realDt);
    this.sinceManualClick += realDt;
    if (this.isAutoTapping()) {
      this.autoTapAcc += AUTO_TAP_PER_SEC * realDt;
      while (this.autoTapAcc >= 1) { this.autoTapAcc -= 1; this.autoTap(); }
    } else {
      this.autoTapAcc = 0;
    }

    // Combo timer decay
    if (this.gameState.comboTimer > 0) {
      this.gameState.comboTimer -= dt;
      if (this.gameState.comboTimer <= 0) {
        // Above a full bar, the clicks toward the next Frenzy are lost at once; then it drains
        const c = Math.min(COMBO_FULL, this.gameState.comboCount);
        this.gameState.comboCount = Math.max(0, c - 5);
        if (this.gameState.comboCount > 0) {
          this.gameState.comboTimer = 0.2; // drain smoothly
        }
      }
    }

    // Frenzy timer decay
    if (this.gameState.frenzyActive) {
      this.gameState.frenzyTimer -= dt;
      // Auto-click pulse during frenzy (~FRENZY_AUTO_CLICKS per second)
      if (Math.random() < dt * FRENZY_AUTO_CLICKS) {
        const fakeX = window.innerWidth / 2 + (Math.random() - 0.5) * 120;
        const fakeY = window.innerHeight / 2 + (Math.random() - 0.5) * 120;
        this.handleClick(fakeX, fakeY, true);
      }
      if (this.gameState.frenzyTimer <= 0) {
        // The combo carries on (R28): only a pause in clicking drains it
        this.gameState.frenzyActive = false;
        this.gameState.frenzyTimer = 0;
      }
    }

    if (this.gameState.comboCount <= 0) this.lastFrenzyAt = 0;

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
      // SUPERNOVA_CPS_SECONDS of Oil, or 500 base clicks (500 Oil) on a fresh run
      const payout = cps.mul(SUPERNOVA_CPS_SECONDS).max(this.gameState.clickPower.mul(SUPERNOVA_MIN_CLICKS));
      this.gameState.aether = this.gameState.aether.add(payout);
      this.gameState.totalAetherEarned = this.gameState.totalAetherEarned.add(payout);
      rewards.notify({ ...note, kind: 'anomaly-supernova', icon: '💥', title: t('anomaly.supernova'), amount: payout, fmt: fmtStd, unit: t('unit.oil') });
    } else if (this.anomalyType === 'time_flux') {
      this.triggerFrenzy(25);
      rewards.notify({ ...note, kind: 'anomaly-flux', icon: '⏱️', title: t('anomaly.flux'), detail: t('anomaly.flux_detail') });
    } else if (this.anomalyType === 'mana_cache') {
      this.gameState.mana = this.gameState.maxMana;
      this.gameState.addChronoSand(120);
      rewards.notify({ ...note, kind: 'anomaly-cache', icon: '💠', title: t('anomaly.cache'), detail: t('anomaly.cache_detail') });
    } else if (this.anomalyType === 'mirage') {
      this.applyMirage();
      rewards.notify({ ...note, kind: 'anomaly-mirage', icon: '🌫️', color: '#c084fc', title: t('anomaly.mirage'), detail: t('anomaly.mirage_detail', { x: MIRAGE_MULT, s: MIRAGE_DURATION }) });
    } else if (this.anomalyType === 'caravan_star') {
      const res = this.applyCaravanStar();
      rewards.notify({
        ...note, kind: 'anomaly-caravan', icon: '🐪', color: '#fbbf24', title: t('anomaly.caravan'),
        detail: res.dispatched ? t('anomaly.caravan_out', { n: res.minutes }) : t('anomaly.caravan_now'),
        ...(res.dispatched ? {} : { amount: res.payout, fmt: (a) => a.format('standard', 0), unit: t('unit.gold') })
      });
    } else {
      const gems = ['rubies', 'sapphires', 'emeralds', 'diamonds'];
      const gem = gems[Math.floor(this.rng() * gems.length)];
      const amount = 3 + Math.floor(this.rng() * 5);
      this.gameState.inventory[gem] = (this.gameState.inventory[gem] || 0) + amount;
      rewards.notify({ ...note, kind: 'anomaly-vein', icon: '💎', title: t('anomaly.vein'), detail: `+${amount} ${itemName(gem, amount)}` });
    }
  }

  // Mirage: x2 Aether production (an Aether buff, adds to Celestial like other Aether buffs) and
  // x2 gold for 60 s. A second Mirage refreshes the timer instead of stacking.
  applyMirage() {
    const gs = this.gameState;
    gs.activeBuffs = gs.activeBuffs.filter(b => b.id !== 'mirage' && b.id !== 'mirage_gold');
    gs.activeBuffs.push(
      { id: 'mirage', name: t('buff.mirage'), type: 'aether_mult', value: MIRAGE_MULT, duration: MIRAGE_DURATION, maxDuration: MIRAGE_DURATION },
      { id: 'mirage_gold', name: t('buff.mirage_gold'), type: 'gold_mult', value: MIRAGE_MULT, duration: MIRAGE_DURATION, maxDuration: MIRAGE_DURATION }
    );
  }

  // Caravan Star: dispatch a free large caravan, or pay its return now if the road is busy.
  // Returns { dispatched, payout }.
  applyCaravanStar() {
    const gs = this.gameState;
    const { invest, minutes, profit } = gs.marketSystem?.getCaravanTier('large')
      ?? { ...LARGE_CARAVAN, invest: gs.getMarketIndex().mul(LARGE_CARAVAN.invest) };
    const payout = invest.mul(profit);
    const caravan = gs.market?.caravan;
    if (caravan && !caravan.active) {
      Object.assign(caravan, {
        active: true, duration: minutes * 60, maxDuration: minutes * 60,
        investment: invest, expectedProfit: profit, payout, cargo: null
      });
      return { dispatched: true, payout, minutes };
    }
    gs.gold = gs.gold.add(payout);
    return { dispatched: false, payout, minutes };
  }
}
