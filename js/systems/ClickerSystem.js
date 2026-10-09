import { BigNum } from '../engine/BigNum.js';
import { getActiveRules } from './ChronicleSystem.js';
import { rewards } from '../ui/rewards.js';
import { feedback } from '../ui/feedback.js';
import {
  COMBO_FULL, FRENZY_AUTO_CLICKS, FRENZY_EVERY, FRENZY_DURATION, FRENZY_MAX_TIMER,
  CLICK_MAX_PER_SEC, AUTO_TAP_PER_SEC, AUTO_TAP_IDLE_AFTER,
  COMBO_STEP_AT, FRENZY_HOLD_SECONDS, comboPitch
} from './combo.js';
import { itemName } from '../data/names.js';
import { t } from '../i18n/index.js';

// --- R3 Golden Anomalies (docs/redesign-proposal.md §5.2) ---
// Spawn every 60-120 s after the last click (50-90 s after one escapes). Weights are out of 60:
// Mirage 1 in 12, Caravan Star 1 in 20, the four classics share the rest (13/60 each).
export const ANOMALY_WEIGHTS = {
  supernova: 13, time_flux: 13, mana_cache: 13, gem_cache: 13, mirage: 5, caravan_star: 3
};
export const SUPERNOVA_CPS_SECONDS = 30;    // R52 (R3: 180, before: 600)
export const SUPERNOVA_MIN_CLICKS = 500;
export const MIRAGE_MULT = 1.5;             // x1.5 Aether production and gold (R52; was x2)
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

export const SUPER_CRIT_SHARE = 0.2;   // share of Refinery crits that are Super-Crits

// Resolve critical strike tier (Stat Overflow):
// 0 = Normal, 1 = Crit, 2 = Super-Crit (>100%), 3 = Hyper-Crit (>200%)
export function resolveCritTier(chance, rng = Math.random) {
  if (chance <= 0) return 0;
  const guaranteed = Math.floor(chance);
  let tier = guaranteed;
  if (rng() < (chance - guaranteed)) tier += 1;
  return tier;
}

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
    // R44 UI hook (js/ui/comboFx.js): ({ type: 'step', step } | { type: 'frenzy', extended, seconds })
    this.onComboFx = null;
    this.frenzyHold = 0;     // seconds the combo bar still holds full after a Frenzy starts
  }

  // True when Auto-tap is owned and the player hasn't tapped for AUTO_TAP_IDLE_AFTER seconds
  isAutoTapping() {
    return this.gameState.hasAutoTap() && this.sinceManualClick >= AUTO_TAP_IDLE_AFTER;
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

  // R59: other subgames (Garden taps, ...) draw from the same paid-click budget as the Oil
  // monolith. Returns true when a token was spent; false means the tap pays nothing.
  spendPaidTap() {
    if (this.clickTokens < 1) return false;
    this.clickTokens -= 1;
    return true;
  }

  // Click pitch climbs one scale step per 4 combo clicks (cap 5); it falls as the combo drains
  clickPitch() {
    return comboPitch(this.gameState.comboCount);
  }

  handleClick(clientX, clientY, isAutoClick = false) {
    if (!isAutoClick) {
      this.sinceManualClick = 0;
      this.gameState.secondsSinceTap = 0;   // Idle attunement (R55); Auto-tap never resets it
      // Over CLICK_MAX_PER_SEC: the tap animates and sounds, but pays nothing
      if (this.clickTokens < 1) {
        feedback.fire(0, {
          kind: 'click', at: { x: clientX, y: clientY }, sound: 'click', soundPitch: this.clickPitch(),
          sparks: 6, color: '#38bdf8'
        });
        return BigNum.zero();
      }
      this.clickTokens -= 1;
    }

    // Determine critical strike tier
    const effectiveCritChance = this.gameState.critChance || 0;
    let critTier = resolveCritTier(effectiveCritChance, this.rng);
    // Crit chance never passes 100%, so tiers above 1 never rolled. A crit upgrades to a
    // Super-Crit (5x with the base 3x) with SUPER_CRIT_SHARE odds.
    if (critTier === 1 && this.rng() < SUPER_CRIT_SHARE) critTier = 2;
    const isCrit = critTier > 0;
    let yieldAmount = this.gameState.getClickYield();

    if (critTier > 0) {
      const multBase = this.gameState.critMultiplier || 3;
      // Tier 1: multBase, Tier 2: 1 + 2*(multBase-1), Tier 3+: 1 + 4*(multBase-1)
      const tierMult = critTier === 1
        ? multBase
        : 1 + Math.pow(2, critTier - 1) * (multBase - 1);
      yieldAmount = yieldAmount.mul(tierMult);
    }
    // Pitch from the combo before this click counts (as before R41)
    const pitch = this.clickPitch();

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
      const stepIdx = COMBO_STEP_AT.indexOf(combo);
      if (stepIdx >= 0) this.onComboFx?.({ type: 'step', step: stepIdx + 1 });
      if (combo % FRENZY_EVERY === 0 && combo > this.lastFrenzyAt && !getActiveRules(this.gameState).noFrenzy) {
        this.lastFrenzyAt = combo;
        this.triggerFrenzy(FRENZY_DURATION);
      }
    }

    // Feedback (R41): a tap is T0 and its "+n" merges with the last one; a crit is T1 with its
    // own sound (250 ms cooldown, the click sound answers in between)
    const at = { x: clientX, y: clientY };
    if (isCrit) {
      if (critTier >= 2) {
        const hyper = critTier >= 3;
        feedback.fire(1, {
          kind: 'crit-label', at, sparks: hyper ? 14 : 10, color: hyper ? '#a855f7' : '#f97316',
          label: hyper ? '🔮 HYPER CRIT!' : '⚡ SUPER CRIT!', labelOffset: hyper ? -35 : -30
        });
      }
      feedback.fire(1, {
        kind: 'crit', at, sound: 'crit', fallbackSound: 'click', soundPitch: pitch,
        sparks: 20, color: '#f59e0b',
        // "CRIT!" pops at the click and the number floats from under it (R44); tiers 2+ already
        // carry their own label above
        label: critTier === 1 ? t('fx.crit') : undefined, labelColor: '#fbbf24', labelOffset: -26,
        text: '+' + yieldAmount.format('standard', 1), textColor: '#fbbf24', isCrit: true, group: 'orb'
      });
    } else {
      feedback.fire(0, {
        kind: 'click', at, sound: 'click', soundPitch: pitch, sparks: 10, color: '#38bdf8',
        amount: yieldAmount, textColor: '#67e8f9', merge: true, group: 'orb'
      });
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
    const extended = gs.frenzyActive && gs.frenzyTimer > 0;
    if (extended) {
      gs.frenzyTimer = Math.max(gs.frenzyTimer, Math.min(FRENZY_MAX_TIMER, gs.frenzyTimer + duration));
    } else {
      gs.frenzyActive = true;
      gs.frenzyTimer = duration;
    }
    this.frenzyHold = FRENZY_HOLD_SECONDS;
    this.onComboFx?.({ type: 'frenzy', extended, seconds: duration });
  }

  // dt: game time (Chrono Warp speeds it up); realDt: wall-clock time for the click limit and
  // Auto-tap, so neither runs faster during Chrono Warp
  update(dt, realDt = dt) {
    this.clickTokens = Math.min(CLICK_MAX_PER_SEC, this.clickTokens + CLICK_MAX_PER_SEC * realDt);
    this.sinceManualClick += realDt;
    if (this.frenzyHold > 0) this.frenzyHold = Math.max(0, this.frenzyHold - realDt);
    this.gameState.secondsSinceTap = (this.gameState.secondsSinceTap ?? Infinity) + realDt;
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

    feedback.fire(2, { kind: 'anomaly', at: { x, y }, sound: 'gem-rare', sparks: 35, color: '#eab308' });

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

  // Mirage: x1.5 Aether production (an Aether buff, adds to Celestial like other Aether buffs) and
  // x1.5 gold for 60 s. A second Mirage refreshes the timer instead of stacking.
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
