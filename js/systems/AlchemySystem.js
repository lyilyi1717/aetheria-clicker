import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { particles } from '../engine/ParticleEngine.js';
import { rewards } from '../ui/rewards.js';

export const RECIPES = [
  // Timed Elixirs
  {
    id: 'swiftness',
    name: 'Karak Tea',
    type: 'buff',
    buffType: 'click_mult',
    buffValue: 2.0,
    duration: 60,
    desc: '+100% Click Yield for 60s',
    cost: { sporePowder: 2, rubies: 1 }
  },
  {
    id: 'titans_draught',
    name: "Almarai Laban",
    type: 'buff',
    buffType: 'hero_atk',
    buffValue: 2.5,
    duration: 90,
    desc: '+150% Combat Attack Power for 90s',
    cost: { monsterBones: 2, sapphires: 1 }
  },
  {
    id: 'aether_surge',
    name: 'Cold Vimto',
    type: 'buff',
    buffType: 'aether_mult',
    buffValue: 3.0,
    duration: 60,
    desc: '+200% Global Oil Production for 60s',
    cost: { manaSap: 2, emeralds: 1 }
  },
  {
    id: 'midas_elixir',
    name: 'Golden Dallah Brew',
    type: 'buff',
    buffType: 'gold_mult',
    buffValue: 4.0,
    duration: 60,
    desc: '+300% Gold Generation for 60s',
    cost: { solarDew: 2, diamonds: 1 }
  },
  // Permanent Enhancements
  {
    id: 'perm_might',
    name: 'Mandi Feast Nectar',
    type: 'permanent',
    desc: '+15 Permanent Hero Attack',
    cost: { voidCores: 2, cryoEssence: 2 }
  },
  {
    id: 'perm_vitality',
    name: 'Shawarma of Life',
    type: 'permanent',
    desc: '+60 Permanent Hero Max HP',
    cost: { bossTokens: 1, voidPollen: 2 }
  },
  {
    id: 'philosophers_catalyst',
    name: "Royal Wasta Seal",
    type: 'permanent',
    desc: '+2% Oil per Catalyst brewed (additive). Cost rises 8% per brew.',
    cost: { voidAmethyst: 1, starNectar: 1 }
  }
];

// Hybrid recipes (R17). Each needs a hybrid essence from Garden cross-breeding plus a gem, and
// stays hidden until the player first holds both ingredients (recipe discovery). All are timed
// buffs sized below the 7 base elixirs so they widen choice rather than raise Aether income.
export const HYBRID_RECIPES = [
  {
    id: 'limonana_spritz', name: 'Limonana Spritz', type: 'buff', buffType: 'click_mult', buffValue: 2.5, duration: 90,
    desc: '+150% Click Yield for 90s', cost: { limonana: 2, rubies: 2 }, hybrid: true
  },
  {
    id: 'truffle_tonic', name: 'Lemon Truffle Tonic', type: 'buff', buffType: 'hero_atk', buffValue: 2.0, duration: 120,
    desc: '+100% Combat Attack Power for 120s', cost: { truffleZest: 2, sapphires: 2 }, hybrid: true
  },
  {
    id: 'rose_truffle_jam', name: 'Rose Truffle Jam', type: 'buff', buffType: 'gold_mult', buffValue: 2.5, duration: 90,
    desc: '+150% Gold Generation for 90s', cost: { roseTruffle: 2, diamonds: 1 }, hybrid: true
  },
  {
    id: 'rose_date_syrup', name: 'Rose Date Syrup', type: 'buff', buffType: 'aether_mult', buffValue: 1.5, duration: 180,
    desc: '+50% Global Oil Production for 180s', cost: { roseDate: 2, emeralds: 2 }, hybrid: true
  },
  {
    id: 'honeyed_dates', name: 'Honeyed Dates', type: 'buff', buffType: 'aether_mult', buffValue: 1.75, duration: 120,
    desc: '+75% Global Oil Production for 120s', cost: { honeyDate: 2, diamonds: 2 }, hybrid: true
  },
  {
    id: 'mint_honey_tea', name: 'Mint Honey Tea', type: 'buff', buffType: 'click_mult', buffValue: 2.0, duration: 300,
    desc: '+100% Click Yield for 5 min', cost: { mintHoney: 2, rubies: 3 }, hybrid: true
  }
];

const ALL_RECIPES = [...RECIPES, ...HYBRID_RECIPES];

// Gem Polishing (R18; progression doc §5.4): 5 of a gem -> 1 of the next tier. Surplus low
// gems feed the Catalyst's Void Amethyst bottleneck at an intentionally poor rate
// (625 rubies = 1 amethyst).
export const GEM_LADDER = ['rubies', 'sapphires', 'emeralds', 'diamonds', 'voidAmethyst'];
export const POLISH_RATIO = 5;

export class AlchemySystem {
  constructor(gameState) {
    this.gameState = gameState;
    this._discoverTimer = 0;
    this.ensureState();
    this.checkDiscoveries(true);
  }

  // Saves from before R17 have no `discovered` map.
  ensureState() {
    const gs = this.gameState;
    if (!gs.alchemy || typeof gs.alchemy !== 'object') gs.alchemy = { catalysts: 0 };
    const d = gs.alchemy.discovered;
    if (!d || typeof d !== 'object' || Array.isArray(d)) gs.alchemy.discovered = {};
    return gs.alchemy;
  }

  isDiscovered(recipeId) {
    const r = HYBRID_RECIPES.find(x => x.id === recipeId);
    if (!r) return true; // base recipes are always visible
    return this.ensureState().discovered[recipeId] === true;
  }

  getVisibleHybridRecipes() {
    return HYBRID_RECIPES.filter(r => this.isDiscovered(r.id));
  }

  // A hybrid recipe appears the first time the player holds at least one of each ingredient.
  // Returns the newly discovered recipes. Discovery is permanent.
  checkDiscoveries(silent = false) {
    const state = this.ensureState();
    const inv = this.gameState.inventory || {};
    const ess = this.gameState.garden?.essences || {};
    const found = [];
    for (const r of HYBRID_RECIPES) {
      if (state.discovered[r.id]) continue;
      if (Object.keys(r.cost).every(m => (inv[m] ?? ess[m] ?? 0) >= 1)) {
        state.discovered[r.id] = true;
        found.push(r);
        if (!silent) {
          // Big tier (§5.1 'unlock'): ceremony + brass
          rewards.notify({
            tier: 'big', kind: 'recipe-discovered', icon: '📖', color: '#f472b6',
            title: `Recipe discovered: ${r.name}`, batchTitle: '{n} recipes discovered', detail: 'New brew in the Grimoire'
          });
        }
      }
    }
    return found;
  }

  // --- Gem Polishing ---

  // The gem one polish of `fromKey` makes, or null for the top tier / unknown keys
  getPolishTarget(fromKey) {
    const i = GEM_LADDER.indexOf(fromKey);
    return i >= 0 && i < GEM_LADDER.length - 1 ? GEM_LADDER[i + 1] : null;
  }

  getMaxPolish(fromKey) {
    if (!this.getPolishTarget(fromKey)) return 0;
    const have = Math.floor(Number(this.gameState.inventory?.[fromKey]) || 0);
    return Math.max(0, Math.floor(have / POLISH_RATIO));
  }

  // Polishes `times` batches (or 'max') of 5 `fromKey` into 1 of the next gem each.
  // Returns how many gems were made (0 if it couldn't).
  polishGem(fromKey, times = 1) {
    const to = this.getPolishTarget(fromKey);
    if (!to) return 0;
    const max = this.getMaxPolish(fromKey);
    const n = times === 'max' ? max : Math.floor(Number(times) || 0);
    if (n < 1 || n > max) return 0;
    const inv = this.gameState.inventory;
    inv[fromKey] -= n * POLISH_RATIO;
    inv[to] = (inv[to] || 0) + n;
    const state = this.ensureState();
    state.gemsPolished = (Number(state.gemsPolished) || 0) + n;
    sound.playGem();
    rewards.notify({
      tier: 'small', kind: 'gem-polish', icon: '💎', color: '#38bdf8',
      title: 'Gems polished', amount: n, fmt: (v) => String(v), unit: n === 1 ? 'gem' : 'gems'
    });
    return n;
  }

  getCatalystCount() {
    return this.gameState.alchemy?.catalysts || 0;
  }

  // Current cost of a recipe. The Catalyst costs ceil(1.08^n) Nectar and Void Amethyst.
  getRecipeCost(recipeOrId) {
    const r = typeof recipeOrId === 'string' ? ALL_RECIPES.find(item => item.id === recipeOrId) : recipeOrId;
    if (!r) return {};
    if (r.id === 'philosophers_catalyst') {
      const c = Math.ceil(Math.pow(1.08, this.getCatalystCount()));
      return { voidAmethyst: c, starNectar: c };
    }
    return r.cost;
  }

  canBrew(recipeId) {
    const r = ALL_RECIPES.find(item => item.id === recipeId);
    if (!r || !this.isDiscovered(r.id)) return false;

    const inv = this.gameState.inventory;
    const ess = this.gameState.garden?.essences || {};

    for (const [mat, amount] of Object.entries(this.getRecipeCost(r))) {
      const available = inv[mat] ?? ess[mat] ?? 0;
      if (available < amount) return false;
    }
    return true;
  }

  brew(recipeId) {
    if (!this.canBrew(recipeId)) return false;

    const r = ALL_RECIPES.find(item => item.id === recipeId);
    const inv = this.gameState.inventory;
    const ess = this.gameState.garden?.essences || {};

    // Deduct costs
    for (const [mat, amount] of Object.entries(this.getRecipeCost(r))) {
      if (inv[mat] !== undefined) inv[mat] -= amount;
      else if (ess[mat] !== undefined) ess[mat] -= amount;
    }

    sound.playSpell();
    this.gameState.stats.totalPotionsBrewed++;

    if (r.type === 'buff') {
      // Add or extend active buff
      const existing = this.gameState.activeBuffs.find(b => b.id === r.id);
      // Astral Crucible (dust shop) doubles durations; Brewmaster Secret adds +25% per rank
      const dur = r.duration * this.gameState.getBuffDurationMult();
      // Extending stops at 10 min x the same duration multipliers
      const cap = this.gameState.getBuffDurationCap();
      if (existing) {
        existing.duration = Math.min(cap, existing.duration + dur);
        existing.maxDuration = Math.min(cap, Math.max(existing.duration, (existing.maxDuration || 0) + dur));
      } else {
        this.gameState.activeBuffs.push({
          id: r.id,
          name: r.name,
          type: r.buffType,
          value: r.buffValue,
          duration: dur,
          maxDuration: dur
        });
      }
      rewards.notify({ tier: 'small', kind: `brew-${r.id}`, icon: '⚗️', color: '#a855f7', title: `Brewed: ${r.name}` });
    } else if (r.type === 'permanent') {
      if (r.id === 'perm_might') {
        this.gameState.hero.baseAttack += 15;
      } else if (r.id === 'perm_vitality') {
        this.gameState.hero.maxHp += 60;
        this.gameState.hero.hp += 60;
      } else if (r.id === 'philosophers_catalyst') {
        if (!this.gameState.alchemy) this.gameState.alchemy = { catalysts: 0 };
        this.gameState.alchemy.catalysts = this.getCatalystCount() + 1;
      }
      rewards.notify({ tier: 'medium', kind: `perm-${r.id}`, icon: '⚗️', color: '#fbbf24', title: `Permanent boost: ${r.name}` });
    }

    if (this.gameState.bountySystem) {
      this.gameState.bountySystem.checkProgress('brew_potion', 1);
    }
    return true;
  }

  transmuteStoneToGold() {
    if ((this.gameState.inventory.stone || 0) < 50) return false;
    this.gameState.inventory.stone -= 50;
    // 200 * 1.07^depth as a BigNum pow (Math.pow overflowed to Infinity -> 0 gold at deep depths)
    const goldGained = new BigNum(1.07).pow(this.gameState.miningGrid?.depth || 1).mul(new BigNum(200)).floor();
    this.gameState.gold = this.gameState.gold.add(goldGained);
    sound.playBuy();
    rewards.notify({
      tier: 'small', kind: 'transmute-gold', icon: '🪙', color: '#eab308',
      title: 'Stone transmuted', amount: goldGained, fmt: (g) => g.format('standard', 0), unit: 'gold'
    });
    return true;
  }

  // Gold per 30 s batch of Chrono Sand: 1,000 x Market Index (~100 kills at your best floor)
  getChronoBatchCost() {
    return this.gameState.getMarketIndex().mul(new BigNum(1000));
  }

  // Batches that still fit in the sand bank; the last one may be partly clipped by the cap
  getChronoBatchRoom() {
    const room = this.gameState.getChronoSandCap() - (this.gameState.chronoSand || 0);
    if (room <= 0) return 0;
    return Math.ceil(room / (30 * this.gameState.getChronoSandGainMult()));
  }

  // How many batches the player can afford right now, limited by the bank cap
  getMaxChronoBatches() {
    const n = this.gameState.gold.div(this.getChronoBatchCost()).floor().toNumber();
    const affordable = Number.isFinite(n) ? Math.max(0, n) : 1e300;
    return Math.min(affordable, this.getChronoBatchRoom());
  }

  // Convert gold to Chrono Sand at 1,000 x M gold -> 30 sand per batch, up to the bank cap.
  // batches: a count, or 'max' to fill the bank.
  transmuteGoldToChrono(batches = 1) {
    const maxBatches = this.getMaxChronoBatches();
    const n = batches === 'max' ? maxBatches : batches;
    if (n < 1 || n > maxBatches) return false;
    this.gameState.gold = this.gameState.gold.sub(this.getChronoBatchCost().mul(new BigNum(n)));
    const gained = this.gameState.addChronoSand(30 * n);
    sound.playSpell();
    rewards.notify({
      tier: 'small', kind: 'chrono-sand', icon: '⏳', color: '#38bdf8',
      title: 'Chrono Sand bought', amount: gained, fmt: (v) => new BigNum(v).format('standard', 2), unit: 'Chrono Sand'
    });
    return true;
  }

  update(dt, realDt = dt) {
    this._discoverTimer += realDt;
    if (this._discoverTimer >= 1) {
      this._discoverTimer = 0;
      this.checkDiscoveries();
    }
    // Buff durations run on real time so Chrono Warp doesn't burn them (or itself) 5x faster
    for (let i = this.gameState.activeBuffs.length - 1; i >= 0; i--) {
      const buff = this.gameState.activeBuffs[i];
      buff.duration -= realDt;
      if (buff.duration <= 0) {
        this.gameState.activeBuffs.splice(i, 1);
      }
    }
  }
}
