// Gear wave 1 (R64, docs/gear-and-boss-design.md §2-§3): the bag, drops with Legendary pity, boss
// signatures, salvage / sell, re-temper and the rating that the compare sheet and the ▲ arrows
// use. Owned by CombatSystem (`combat.gear`); the saved state is gameState.bag / gameState.loot
// and the items themselves (hero.gear holds the four equipped ones). Item model: gearItems.js.
import { BigNum } from '../engine/BigNum.js';
import { rewards } from '../ui/rewards.js';
import { t } from '../i18n/index.js';
import { gearStat, getIndexFloor, MONSTER_FLOOR_BASE, MONSTER_NAMES } from './CombatSystem.js';
import { getShopRank } from './DustShopSystem.js';
import {
  SLOTS, MAIN_KEYS, RARITIES, RARITY_NAMES, rarityIndex, rarityDef, MOB_DROP_CHANCE, MOB_RARITY_WEIGHTS,
  BOSS_RARITY_WEIGHTS, SHEIKH_RARITY_WEIGHTS, GUARDIAN_RARITY_WEIGHTS, BOSS_ILVL_BONUS, LEGENDARY_PITY, SIGNATURE_CHANCE,
  FORTUNE_CAP, UNIQUES, UNIQUE_FX, signatureForBoss, makeItem, withItemLevel, sanitizeItem, sanitizeBag, sanitizeLoot,
  affixTotals, SALVAGE_SCRAP, SALVAGE_CORES, SELL_GOLD, RETEMPER_MIN_RARITY, RETEMPER_GOLD_KILLS, RETEMPER_CORES, mainStat,
  MYTHIC_MIN_FLOOR, MYTHIC_CHANCE, COSMIC_PITY, BARAKAH_MAX, BARAKAH_FIND, BARAKAH_FIRST_KILL, BARAKAH_DAILY_FULL,
  BARAKAH_REST_RATE, defaultBarakah
} from './gearItems.js';
import { isBigTier } from './bossFights.js';

// A rating change smaller than this is not an upgrade (no ▲ for rounding noise)
const UPGRADE_EPS = 0.0005;
// Rating weights: the idle Tower wall is set by survival more than damage (economy-impact-check §3)
const W_DAMAGE = 0.4;
const W_SURVIVE = 0.6;

export class GearSystem {
  constructor(combat) {
    this.combat = combat;
    // Runtime effects of boss signatures (not saved)
    this.fx = { ladleStacks: 0, ladleT: 0, fanilaT: 0, fanilaCd: 0, wastaHits: 0 };
    // The calendar for the Barakah daily rest; the sim swaps it for simulated time
    this.clock = () => Date.now();
  }

  get gs() { return this.combat.gameState; }
  get hero() { return this.gs.hero; }
  get bag() { return this.gs.bag; }
  get loot() { return this.gs.loot; }

  // Every load / new game: bag and loot sane; every equipped item carries uid, slot, ilvl, affixes.
  // Idempotent. Items a save lacks fields on (starter kit, pre-R64) get them here.
  ensureState() {
    const gs = this.gs;
    if (!gs.bag || !Array.isArray(gs.bag.items)) gs.bag = sanitizeBag(gs.bag);
    if (!gs.loot) gs.loot = sanitizeLoot(gs.loot);
    if (!gs.loot.barakah) gs.loot.barakah = defaultBarakah();
    const h = this.hero;
    if (!h) return;
    // Saves from before first-kill rewards count every boss they have already passed as claimed
    if (gs.loot.bossHigh == null) gs.loot.bossHigh = Math.max(0, Math.floor((Math.max(1, Number(h.maxFloor) || 1) - 1) / 10) * 10);
    if (!h.gear || typeof h.gear !== 'object') h.gear = {};
    const floor = Math.max(1, getIndexFloor(h));
    const used = new Set(gs.bag.items.map(i => i.uid));
    for (const slot of SLOTS) {
      let item = sanitizeItem(h.gear[slot], slot, floor);
      if (!item) {
        item = sanitizeItem({ slot, rarity: 'Common', ilvl: floor, ...mainStat(slot, 'Common', floor) }, slot, floor);
        console.warn(`gear: replaced a missing or unreadable ${slot} with a Common`);
      }
      if (!item.uid || used.has(item.uid)) item.uid = gs.bag.nextUid++;
      used.add(item.uid);
      gs.bag.nextUid = Math.max(gs.bag.nextUid, item.uid + 1);
      h.gear[slot] = item;
    }
  }

  // --- finding items ---------------------------------------------------------------------

  getFortune() {
    const talent = (this.gs.talents?.loot_fortune?.rank || 0) * 0.15;
    return Math.min(FORTUNE_CAP, talent + affixTotals(this.hero.gear).fortune);
  }

  rollRarity(weights, rng) {
    let roll = rng() * 100;
    for (const name of Object.keys(weights)) {
      if (roll < weights[name]) return name;
      roll -= weights[name];
    }
    return 'Common';
  }

  // One kill's drop (called from CombatSystem.onMonsterDefeated). Returns what happened or null.
  // opts: { tier: 'boss' | 'sheikh' | 'guardian' | 'warden' (boss by default), first: first kill }
  // The rng draws are: drop chance, rarity, slot, [signature], [natural Mythic], then the affixes.
  rollDrop(floor, isBoss, rng = Math.random, opts = {}) {
    const inv = this.gs.inventory;
    const tier = isBoss ? (opts.tier || 'boss') : 'mob';
    const big = isBigTier(tier);
    if (isBoss) {
      inv.voidCores = (inv.voidCores || 0) + 1 + (opts.first ? 1 : 0);
      inv.bossTokens = (inv.bossTokens || 0) + 1;
    }
    const chance = isBoss ? 1 : Math.min(1, MOB_DROP_CHANCE * (1 + this.getFortune()));
    if (rng() >= chance) return null;

    const loot = this.loot;
    loot.found++;
    // A Guardian or Warden's first kill is a guaranteed Legendary; Sheikhs always drop Epic or better
    const weights = big ? GUARDIAN_RARITY_WEIGHTS : tier === 'sheikh' ? SHEIKH_RARITY_WEIGHTS : isBoss ? BOSS_RARITY_WEIGHTS : MOB_RARITY_WEIGHTS;
    let rarity = big && opts.first ? 'Legendary' : this.rollRarity(weights, rng);
    if (loot.legDry >= LEGENDARY_PITY && rarityIndex(rarity) < 3) rarity = 'Legendary';
    if (rarity === 'Legendary') {
      // Cosmic pity: every 10th Legendary without a Cosmic is a Cosmic
      loot.cosDry = (loot.cosDry || 0) + 1;
      if (loot.cosDry >= COSMIC_PITY) rarity = 'Cosmic';
    }

    let slot = SLOTS[Math.floor(rng() * SLOTS.length)];
    let uniqueId = null;
    if (isBoss && rarity === 'Legendary' && ((opts.first && big) || rng() < SIGNATURE_CHANCE)) {
      uniqueId = signatureForBoss(MONSTER_NAMES[(floor - 1) % MONSTER_NAMES.length]);
      if (uniqueId) slot = UNIQUES[uniqueId].slot;
    }

    // Mythic: the full Barakah meter, else a natural 0.001% (more from tougher sources), from floor 151
    const b = loot.barakah;
    let mythic = false;
    if (floor >= MYTHIC_MIN_FLOOR) {
      if (b.points >= BARAKAH_MAX) mythic = true;
      else if (rng() * 100 < (MYTHIC_CHANCE[big ? 'guardian' : tier] ?? MYTHIC_CHANCE.mob)) mythic = true;
    }
    if (mythic) { rarity = 'Mythic'; uniqueId = null; }

    if (rarityIndex(rarity) >= 3) loot.legDry = 0; else loot.legDry++;
    if (rarityIndex(rarity) >= 4) loot.cosDry = 0;
    if (mythic) this.resetBarakah(); else this.addBarakah(BARAKAH_FIND[rarity] || 0);

    const ilvl = isBoss ? floor + BOSS_ILVL_BONUS : floor;
    const item = makeItem({ slot, rarity, ilvl, rng, uniqueId });
    return this.receive(item);
  }

  // --- Barakah (R65): a visible pity meter for the Mythic -----------------------------------
  // Points come from finds and first kills. After BARAKAH_DAILY_FULL points in a calendar day the
  // rest of that day counts a quarter (shown as "resting"); nothing decays, nothing expires.

  dayKey() {
    const d = new Date(this.clock());
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  // Points still earned at the full rate today
  barakahFullLeft() {
    const b = this.loot.barakah;
    return b.day === this.dayKey() ? Math.max(0, BARAKAH_DAILY_FULL - b.today) : BARAKAH_DAILY_FULL;
  }

  barakahResting() { return this.barakahFullLeft() <= 0; }

  addBarakah(n) {
    const b = this.loot.barakah;
    if (!(n > 0) || b.points >= BARAKAH_MAX) return 0;
    const key = this.dayKey();
    if (b.day !== key) { b.day = key; b.today = 0; }
    const full = Math.min(n, Math.max(0, BARAKAH_DAILY_FULL - b.today));
    const gain = full + (n - full) * BARAKAH_REST_RATE;
    b.today = Math.min(BARAKAH_DAILY_FULL, b.today + full);
    const before = b.points;
    b.points = Math.min(BARAKAH_MAX, Math.round((b.points + gain) * 100) / 100);
    if (before < BARAKAH_MAX && b.points >= BARAKAH_MAX && !b.full) {
      b.full = true;
      rewards.notify({
        tier: 'medium', kind: 'barakah-full', icon: '🏺', color: '#fbbf24',
        title: t('barakah.full'), detail: t('barakah.full_detail')
      });
    }
    return gain;
  }

  resetBarakah() {
    const b = this.loot.barakah;
    b.points = 0; b.full = false; b.mythics = (b.mythics || 0) + 1;
  }

  // First kill of a boss floor (any tier): Barakah points. True when it was the first.
  claimFirstKill(floor, tier) {
    const loot = this.loot;
    if (tier === 'mob' || floor <= (loot.bossHigh || 0)) return false;
    loot.bossHigh = floor;
    const pts = BARAKAH_FIRST_KILL[tier] || 0;
    const gain = pts > 0 ? this.addBarakah(pts) : 0;
    rewards.notify({
      tier: tier === 'boss' ? 'small' : tier === 'sheikh' ? 'medium' : 'big', kind: 'first-kill', icon: '🏅', color: '#fbbf24',
      title: t('combat.first_kill', { floor }), batchTitle: t('combat.first_kill_batch'),
      detail: t('combat.first_kill_detail', { n: Math.round(gain) })
    });
    return true;
  }

  // Al-Wakeel (auto-equip): free at migration for saves with a record floor of 301+ (they had
  // auto-replace before); everyone else buys it in the Dust shop (`al_wakeel`).
  hasWakeel() {
    return this.bag.wakeel === true || getShopRank(this.gs, 'al_wakeel') > 0;
  }

  // --- the bag -----------------------------------------------------------------------------

  findItem(uid) {
    for (const slot of SLOTS) if (this.hero.gear[slot]?.uid === uid) return { item: this.hero.gear[slot], equipped: true };
    const item = this.bag.items.find(i => i.uid === uid);
    return item ? { item, equipped: false } : null;
  }

  // Rating of the current kit, in logs (HP weighs more than Attack: the idle wall is survival)
  ratingLog() {
    const c = this.combat, g = this.hero.gear;
    const atk = Math.max(1, c.getTotalAttack());
    const hp = Math.max(1, c.getTotalMaxHp());
    const crit = Math.min(1, Math.max(0, gearStat('amulet', g.amulet)));
    const critMult = this.critMult(1);
    const drain = Math.max(0, gearStat('relic', g.relic));
    let r = W_DAMAGE * Math.log(atk * (1 + crit * (critMult - 1))) + W_SURVIVE * Math.log(hp * (1 + 2 * drain));
    for (const slot of SLOTS) {
      const u = UNIQUES[g[slot]?.uniqueId];
      if (u) r += Math.log(u.ratingMult);
    }
    return r;
  }

  // Change in Combat Rating (a fraction: 0.12 = +12%) if `item` replaced what is in its slot
  ratingDelta(item, base = this.ratingLog()) {
    const g = this.hero.gear;
    const saved = g[item.slot];
    if (!item || saved === item) return 0;
    g[item.slot] = item;
    let after;
    try { after = this.ratingLog(); } finally { g[item.slot] = saved; }
    return Math.exp(after - base) - 1;
  }

  isUpgrade(item, base) {
    return this.ratingDelta(item, base) > UPGRADE_EPS;
  }

  // Bag items with their delta, for the UI and the bots
  listBag() {
    const base = this.ratingLog();
    return this.bag.items.map(item => ({ item, delta: this.ratingDelta(item, base) }));
  }

  countUpgrades() {
    return this.listBag().filter(e => e.delta > UPGRADE_EPS).length;
  }

  // Put a new item in the bag (or auto-salvage it). Returns { item, kept, salvaged, upgrade }.
  receive(item, { quiet = false } = {}) {
    const bag = this.bag;
    item.uid = bag.nextUid++;
    const base = this.ratingLog();
    const delta = this.ratingDelta(item, base);
    const upgrade = delta > UPGRADE_EPS;
    const ri = rarityIndex(item.rarity);
    const filter = rarityIndex(bag.autoSalvage);   // 'Off' -> -1
    if (item.rarity === 'Mythic') {   // never lost: it takes a seat even in a full bag
      bag.items.push(item);
      if (!quiet) this.toastFind(item, delta, false);
      return { item, kept: true, salvaged: null, upgrade };
    }
    if (!upgrade && ri < 3 && filter >= 0 && ri <= filter) {
      const gain = this.salvageValue(item);
      this.grant(gain);
      return { item, kept: false, salvaged: gain, upgrade };
    }
    if (bag.items.length >= bag.cap && !this.makeRoom(item, upgrade, base)) {
      const gain = this.salvageValue(item);
      this.grant(gain);
      if (!quiet) this.toastBagFull(item, gain);
      return { item, kept: false, salvaged: gain, upgrade };
    }
    bag.items.push(item);
    if (upgrade && bag.autoEquip && this.hasWakeel()) {
      this.equip(item.uid);
      if (!quiet) this.toastFind(item, delta, true);
      return { item, kept: true, salvaged: null, upgrade, equipped: true };
    }
    if (!quiet) this.toastFind(item, delta, false);
    return { item, kept: true, salvaged: null, upgrade };
  }

  // Bag full (§2.2): the incoming item is salvaged if it is the worst; otherwise the oldest
  // unlocked, non-upgrade, non-Legendary item goes. Returns false when the incoming item must go.
  makeRoom(incoming, incomingUpgrade, base) {
    const bag = this.bag;
    const cands = bag.items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => !item.locked && rarityIndex(item.rarity) < 3 && !(this.ratingDelta(item, base) > UPGRADE_EPS));
    if (!cands.length) return false;
    const incomingRank = rarityIndex(incoming.rarity);
    const worst = Math.min(...cands.map(c => rarityIndex(c.item.rarity)));
    if (!incomingUpgrade && incomingRank < 3 && incomingRank <= worst) return false;
    const victim = cands.reduce((a, b) => (a.item.uid <= b.item.uid ? a : b));
    const gain = this.salvageValue(victim.item);
    bag.items.splice(victim.idx, 1);
    this.grant(gain);
    this.toastBagFull(victim.item, gain);
    return true;
  }

  salvageValue(item) {
    return { scrap: SALVAGE_SCRAP[item.rarity] || 0, cores: SALVAGE_CORES[item.rarity] || 0 };
  }

  grant({ scrap, cores }) {
    const inv = this.gs.inventory;
    if (scrap) inv.gearScrap = (inv.gearScrap || 0) + scrap;
    if (cores) inv.voidCores = (inv.voidCores || 0) + cores;
    this.loot.salvaged += scrap;
  }

  equip(uid) {
    const bag = this.bag, g = this.hero.gear;
    const idx = bag.items.findIndex(i => i.uid === uid);
    if (idx < 0) return false;
    const item = bag.items[idx];
    const old = g[item.slot];
    if (old) {
      if (!old.uid) old.uid = bag.nextUid++;
      bag.items[idx] = old;
    } else {
      bag.items.splice(idx, 1);
    }
    g[item.slot] = item;
    const max = this.combat.getTotalMaxHp();
    if (this.hero.hp > max) this.hero.hp = max;
    return true;
  }

  // Equip every bag item that rates higher than what is worn, best first, until none does.
  equipBest() {
    let n = 0;
    for (let guard = 0; guard < 12; guard++) {
      const best = this.listBag().filter(e => e.delta > UPGRADE_EPS).sort((a, b) => b.delta - a.delta)[0];
      if (!best || !this.equip(best.item.uid)) break;
      n++;
    }
    return n;
  }

  toggleLock(uid) {
    const f = this.findItem(uid);
    if (!f) return false;
    f.item.locked = !f.item.locked;
    return true;
  }

  canRemove(item) {
    return !item.locked && this.bag.items.includes(item);
  }

  salvage(uid) {
    const f = this.findItem(uid);
    if (!f || f.equipped || f.item.locked) return null;
    const gain = this.salvageValue(f.item);
    this.bag.items.splice(this.bag.items.indexOf(f.item), 1);
    this.grant(gain);
    return gain;
  }

  // Gold for one kill at floor `f` (no multipliers): what sell and re-temper prices count in
  goldPerKill(f) {
    return new BigNum(MONSTER_FLOOR_BASE).pow(Math.max(0, f - 1)).mul(10);
  }

  sellValue(item) {
    return this.goldPerKill(item.ilvl).mul(SELL_GOLD[item.rarity] || 0).floor();
  }

  sell(uid) {
    const f = this.findItem(uid);
    if (!f || f.equipped || f.item.locked) return null;
    const gold = this.sellValue(f.item);
    this.bag.items.splice(this.bag.items.indexOf(f.item), 1);
    this.gs.gold = this.gs.gold.add(gold);
    return gold;
  }

  // Bulk salvage of unlocked, non-upgrade items up to a rarity. `commit` false = preview only.
  salvageBulk(maxRarity, commit = true) {
    const limit = Math.min(2, rarityIndex(maxRarity));   // never Legendary+ in bulk
    const base = this.ratingLog();
    const out = { count: 0, scrap: 0, cores: 0 };
    const doomed = this.bag.items.filter(i => !i.locked && rarityIndex(i.rarity) <= limit && !(this.ratingDelta(i, base) > UPGRADE_EPS));
    for (const item of doomed) {
      const v = this.salvageValue(item);
      out.count++; out.scrap += v.scrap; out.cores += v.cores;
    }
    if (commit && doomed.length) {
      this.bag.items = this.bag.items.filter(i => !doomed.includes(i));
      this.grant(out);
    }
    return out;
  }

  // --- re-temper (§2.4): a Legendary+ item catches up with the floor ----------------------

  retemperInfo(item) {
    const ri = rarityIndex(item.rarity);
    const target = Math.max(1, getIndexFloor(this.hero) - 1);
    const info = { eligible: false, target, gold: new BigNum(0), cores: 0, free: false, canAfford: false, reason: null };
    if (ri < RETEMPER_MIN_RARITY) { info.reason = 'rarity'; return info; }
    if (target <= item.ilvl) { info.reason = 'current'; return info; }
    info.eligible = true;
    info.free = item.freeTemper === true;
    if (!info.free) {
      info.cores = RETEMPER_CORES[item.rarity] || 0;
      info.gold = this.goldPerKill(target).mul(RETEMPER_GOLD_KILLS * Math.sqrt(target - item.ilvl)).floor();
    }
    const inv = this.gs.inventory;
    info.canAfford = info.free || (this.gs.gold.gte(info.gold) && (inv.voidCores || 0) >= info.cores);
    return info;
  }

  retemper(uid) {
    const f = this.findItem(uid);
    if (!f) return false;
    const info = this.retemperInfo(f.item);
    if (!info.eligible || !info.canAfford) return false;
    if (info.free) delete f.item.freeTemper;
    else {
      this.gs.gold = this.gs.gold.sub(info.gold);
      this.gs.inventory.voidCores = (this.gs.inventory.voidCores || 0) - info.cores;
    }
    const next = withItemLevel(f.item, info.target);
    Object.assign(f.item, next);   // same object: equipped or bag, the reference stays valid
    if (f.equipped) {
      const max = this.combat.getTotalMaxHp();
      if (this.hero.hp > max) this.hero.hp = max;
    }
    return true;
  }

  // --- effects of equipped gear (affixes and boss signatures) -------------------------------

  totals() { return affixTotals(this.hero.gear); }
  hasUnique(id) { return this.hero.gear?.[UNIQUES[id]?.slot]?.uniqueId === id; }

  attackMult() {
    let m = 1 + this.totals().might;
    if (this.fx.ladleStacks > 0) m *= 1 + UNIQUE_FX.ladleStep * this.fx.ladleStacks;
    return m;
  }

  hpMult() {
    let m = 1 + this.totals().vigor;
    if (this.hasUnique('sacred_fanila')) m *= 1 + UNIQUE_FX.fanilaHp;
    return m;
  }

  bossDamageMult() {
    return 1 + this.totals().slayer + (this.hasUnique('stick_of_discipline') ? UNIQUE_FX.stickBossDamage : 0);
  }

  goldMult() { return 1 + this.totals().greed; }

  // Damage multiplier of a crit tier (0 = no crit). Precision adds to the base x2.
  critMult(tier) {
    if (tier <= 0) return 1;
    // Nazar of the Haters: a normal crit is x3
    const base = tier >= 2 ? 4 : (this.hasUnique('nazar_haters') ? UNIQUE_FX.nazarCritBase : 2);
    return base + this.totals().precision;
  }

  // --- Mythic powers (R65) ---------------------------------------------------------------

  // Every hit the hero lands (auto, click or skill) passes here: the 20th is a WASTA STRIKE, x10.
  // Returns the damage multiplier (1 or 10). Counts only while the Scepter is worn.
  onHeroHit() {
    if (!this.hasUnique('wasta_scepter')) { this.fx.wastaHits = 0; return 1; }
    if (++this.fx.wastaHits < UNIQUE_FX.wastaEvery) return 1;
    this.fx.wastaHits = 0;
    return UNIQUE_FX.wastaMult;
  }

  // Nazar of the Haters: telegraphs answer themselves
  telegraphsAutoSucceed() { return this.hasUnique('nazar_haters'); }

  // Royal Decree Seal: +20% damage per telegraph answered this fight, up to 3 stacks
  decreeMult(stacks) {
    return this.hasUnique('decree_seal') ? 1 + UNIQUE_FX.decreeStep * Math.min(UNIQUE_FX.decreeMax, stacks || 0) : 1;
  }

  bossTimerBonus() {
    return this.hasUnique('wasta_stamp') ? UNIQUE_FX.stampSeconds : 0;
  }

  onKill() {
    if (this.hasUnique('kabsa_ladle')) {
      this.fx.ladleStacks = Math.min(UNIQUE_FX.ladleMax, this.fx.ladleStacks + 1);
      this.fx.ladleT = UNIQUE_FX.ladleSeconds;
    }
  }

  tick(dt) {
    const fx = this.fx, h = this.hero;
    if (fx.ladleT > 0) {
      fx.ladleT -= dt;
      if (fx.ladleT <= 0) { fx.ladleT = 0; fx.ladleStacks = 0; }
    }
    if (fx.fanilaCd > 0) fx.fanilaCd = Math.max(0, fx.fanilaCd - dt);
    if (this.hasUnique('sacred_fanila')) {
      const max = this.combat.getTotalMaxHp();
      if (fx.fanilaT > 0) {
        fx.fanilaT -= dt;
        h.hp = Math.min(max, h.hp + h.hpRegen * (UNIQUE_FX.fanilaRegenMult - 1) * dt);
      } else if (fx.fanilaCd <= 0 && h.hp < max * UNIQUE_FX.fanilaBelow) {
        fx.fanilaT = UNIQUE_FX.fanilaSeconds;
        fx.fanilaCd = UNIQUE_FX.fanilaCooldown;
      }
    }
  }

  // Lifesteal overheal becomes Shield (Fizzing Rukbah Can)
  absorbOverheal(overflow) {
    if (!(overflow > 0) || !this.hasUnique('rukbah_can')) return;
    const cap = this.combat.getTotalMaxHp() * UNIQUE_FX.canShieldCap;
    this.hero.shield = Math.min(cap, (this.hero.shield || 0) + overflow);
  }

  // One-time notice after migration v11 retired Monster Bones and gear levels: say what they became
  flushNotice() {
    const n = this.loot?.notice;
    if (!n) return;
    this.loot.notice = null;
    rewards.notify({
      tier: 'medium', kind: 'bones-converted', icon: '⚙️', color: '#cbd5e1',
      title: t('bag.converted', { scrap: n.scrap }),
      detail: t('bag.converted_detail', { items: n.items, cores: n.cores })
    });
  }

  // --- toasts ------------------------------------------------------------------------------

  toastFind(item, delta, equipped) {
    const ri = rarityIndex(item.rarity);
    const def = rarityDef(item.rarity);
    const name = this.displayName(item);
    if (item.rarity === 'Mythic') {
      rewards.notify({
        tier: 'epic', kind: 'bag-mythic', icon: '👑', color: def.color,
        title: t('bag.toast.mythic', { name }), detail: t(`gear.unique.${item.uniqueId}.fx`)
      });
    } else if (item.uniqueId) {
      rewards.notify({
        tier: 'big', kind: 'bag-signature', icon: '⭐', color: def.color,
        title: t('bag.toast.signature', { name }), detail: t('bag.toast.signature_detail')
      });
    } else if (ri >= 4) {
      rewards.notify({ tier: 'big', kind: 'bag-cosmic', icon: '★', color: def.color, title: t('bag.toast.cosmic', { name }), detail: this.deltaText(delta) });
    } else if (ri === 3) {
      rewards.notify({ tier: 'medium', kind: 'bag-legendary', icon: '◆', color: def.color, title: t('bag.toast.legendary', { name }), detail: this.deltaText(delta) });
    } else if (delta > UPGRADE_EPS) {
      rewards.notify({
        tier: 'small', kind: 'bag-upgrade', icon: '▲', color: def.color,
        title: equipped ? t('bag.toast.equipped', { name }) : t('bag.toast.upgrade', { name, pct: Math.round(delta * 100) }),
        batchTitle: t('bag.toast.upgrade_batch')
      });
    }
  }

  deltaText(delta) {
    return delta > UPGRADE_EPS ? t('bag.toast.upgrade_detail', { pct: Math.round(delta * 100) }) : t('bag.toast.not_upgrade');
  }

  toastBagFull(item, gain) {
    rewards.notify({
      tier: 'small', kind: 'bag-full', icon: '🎒', color: rarityDef(item.rarity).color,
      title: t('bag.toast.full', { name: this.displayName(item), n: gain.scrap }),
      batchTitle: t('bag.toast.full_batch')
    });
  }

  // Name for toasts (the full card in the UI uses ui/rarity.js gearName)
  displayName(item) {
    if (item.uniqueId) return t(`gear.unique.${item.uniqueId}`);
    return t('gear.generated', { rarity: t(`rarity.${String(item.rarity).toLowerCase()}`), slot: t(`gear.slot.${item.slot}`) });
  }
}

export { RARITIES, RARITY_NAMES, MAIN_KEYS };
