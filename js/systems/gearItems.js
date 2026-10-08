// Gear item model (R64, docs/gear-and-boss-design.md §1): rarities, affixes, boss signatures and
// the pure functions that build and clean items. No imports from other systems, so GameState and
// the tests can use it without a cycle. GearSystem.js holds the bag and the actions.
//
// An item is { uid, slot, rarity, ilvl, name, <main stat>, level, affixes: [{ id, v }],
// uniqueId, locked, heirloom, freeTemper }. The main stat key matches CombatSystem's
// GEAR_MAIN_STAT (attack / hp / crit / lifesteal) so gearStat() and the R34 levels work as before.

// Gear rolls at this base per floor of item level; monsters grow 1.12^floor (CombatSystem).
export const GEAR_FLOOR_BASE = 1.1068;

export const SLOTS = ['weapon', 'armor', 'amulet', 'relic'];

// Power multiplier R by rarity (1/2/3/4/5). `tier` scales affixes and the Amulet/Relic stat.
export const RARITIES = [
  { name: 'Common', mult: 1, tier: 0, affixes: 0, color: '#9aa5b1' },
  { name: 'Rare', mult: 2, tier: 1, affixes: 1, color: '#56b4e9' },
  { name: 'Epic', mult: 3, tier: 2, affixes: 2, color: '#b388ff' },
  { name: 'Legendary', mult: 4, tier: 3, affixes: 2, color: '#ef8a3c' },
  { name: 'Cosmic', mult: 5, tier: 4, affixes: 3, color: '#ffd84d' }
];
export const RARITY_NAMES = RARITIES.map(r => r.name);
export const rarityIndex = (name) => RARITY_NAMES.indexOf(name);
export const rarityDef = (name) => RARITIES[rarityIndex(name)] || RARITIES[0];

// Drop tables (§3.1): chance of an item per kill, and the rarity mix of an item. Mythic waits
// for wave 2. Weights are percent; the first rarity takes the rest.
export const MOB_DROP_CHANCE = 0.08;
export const MOB_RARITY_WEIGHTS = { Rare: 24, Epic: 5.7, Legendary: 0.25, Cosmic: 0.05 };
export const BOSS_RARITY_WEIGHTS = { Rare: 50, Epic: 38, Legendary: 10, Cosmic: 2 };
export const BOSS_ILVL_BONUS = 5;
// Legendary pity (§3.3): this many drops without a Legendary or better and the next one is Legendary
export const LEGENDARY_PITY = 600;
// Half of the Legendaries a boss rolls are that boss's signature
export const SIGNATURE_CHANCE = 0.5;
// Fortune (Fortune Favor, Fortune affixes): total bonus to the drop chance, capped
export const FORTUNE_CAP = 1;

// Affixes (§1.4): value = uniform in [lo, hi] x the item's tier. At most one of each per item.
// Sums over the four equipped items are capped so a perfect kit stays bounded.
export const AFFIXES = {
  might: { lo: 0.04, hi: 0.08, cap: 1 },       // + Attack
  vigor: { lo: 0.05, hi: 0.10, cap: 1 },       // + Max HP
  slayer: { lo: 0.06, hi: 0.12, cap: 1 },      // + damage to bosses
  precision: { lo: 0.10, hi: 0.20, cap: 1.5 }, // + crit multiplier (base x2)
  greed: { lo: 0.05, hi: 0.10, cap: 1 },       // + Tower gold
  fortune: { lo: 0.02, hi: 0.04, cap: 1 }      // + drop chance
};
export const AFFIX_IDS = Object.keys(AFFIXES);

// Boss signatures (§1.5): bosses cycle through six names (MONSTER_NAMES[(floor-1) % 12] on
// every 10th floor). Effects live in CombatSystem / GearSystem; `ratingMult` is the part of the
// effect the stat totals don't show, so the compare sheet can rate it.
export const UNIQUES = {
  rukbah_can: { slot: 'relic', boss: 'Rukbah Soda', ratingMult: 1.03 },
  stick_of_discipline: { slot: 'weapon', boss: 'Saher Camera', ratingMult: 1.10 },
  kabsa_ladle: { slot: 'weapon', boss: 'Giant Kabsa Monster', ratingMult: 1.10 },
  camry_buckler: { slot: 'armor', boss: 'Drifting Camry', ratingMult: 1.08 },
  sacred_fanila: { slot: 'armor', boss: 'Abu Sarwal Wa Fanila', ratingMult: 1.02 },
  wasta_stamp: { slot: 'amulet', boss: 'Al-Modir', ratingMult: 1.04 }
};
export const UNIQUE_IDS = Object.keys(UNIQUES);
export const signatureForBoss = (bossName) => UNIQUE_IDS.find(id => UNIQUES[id].boss === bossName) || null;
// Numbers of the effects (tuned small: no unique is worth more than ~x1.25 in its category)
export const UNIQUE_FX = {
  canShieldCap: 0.25,         // overheal becomes Shield, up to this share of max HP
  stickBossDamage: 0.25,      // +damage to bosses (counts with Slayer)
  ladleStep: 0.02, ladleMax: 10, ladleSeconds: 20,
  fanilaHp: 0.20, fanilaBelow: 0.30, fanilaRegenMult: 10, fanilaSeconds: 5, fanilaCooldown: 60,
  stampSeconds: 5
};

// Bag
export const BAG_CAP = 30;
export const AUTO_SALVAGE_CHOICES = ['Off', 'Common', 'Rare', 'Epic'];

// Salvage and sell (§2.3), by rarity. Gold sell value is this x the item level's gold per kill.
export const SALVAGE_BONES = { Common: 1, Rare: 2, Epic: 4, Legendary: 8, Cosmic: 16 };
export const SALVAGE_CORES = { Common: 0, Rare: 0, Epic: 1, Legendary: 3, Cosmic: 8 };
export const SELL_GOLD = { Common: 2, Rare: 5, Epic: 15, Legendary: 60, Cosmic: 200 };
// Re-temper (§2.4): Legendary and better only
export const RETEMPER_MIN_RARITY = 3;
export const RETEMPER_GOLD_KILLS = 50;
export const RETEMPER_CORES = { Legendary: 2, Cosmic: 4 };

const pow = (ilvl) => Math.pow(GEAR_FLOOR_BASE, Math.min(6000, Math.max(0, ilvl - 1)));

// The item's main stat for a slot, rarity and item level (weapon / armor ride the floor curve;
// Amulet and Relic are bounded percentages that barely move with the floor)
export function mainStat(slot, rarity, ilvl) {
  const r = rarityDef(rarity);
  if (slot === 'weapon') return { attack: Math.max(1, Math.floor(10 * pow(ilvl) * r.mult)) };
  if (slot === 'armor') return { hp: Math.max(1, Math.floor(40 * pow(ilvl) * r.mult)) };
  if (slot === 'amulet') return { crit: Math.min(0.5, 0.05 + 0.05 * r.tier + 0.0002 * ilvl) };
  return { lifesteal: Math.min(0.3, 0.02 + 0.02 * r.tier + 0.0001 * ilvl) };
}
export const MAIN_KEYS = { weapon: 'attack', armor: 'hp', amulet: 'crit', relic: 'lifesteal' };

export function rollAffixes(rarity, rng = Math.random, exclude = []) {
  const r = rarityDef(rarity);
  const pool = AFFIX_IDS.filter(id => !exclude.includes(id));
  const out = [];
  for (let i = 0; i < r.affixes && pool.length; i++) {
    const id = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const a = AFFIXES[id];
    out.push({ id, v: round3((a.lo + rng() * (a.hi - a.lo)) * r.tier) });
  }
  return out;
}
const round3 = (n) => Math.round(n * 1000) / 1000;

// Build a fresh item. `uid` is assigned by the bag.
export function makeItem({ slot, rarity, ilvl, rng = Math.random, uniqueId = null, uid = 0 }) {
  const lvl = Math.max(1, Math.floor(ilvl) || 1);
  const item = {
    uid, slot, rarity, ilvl: lvl,
    name: `${rarity} ${slot.toUpperCase()}`,
    ...mainStat(slot, rarity, lvl),
    level: 0,
    affixes: rollAffixes(rarity, rng),
    uniqueId: null,
    locked: false
  };
  if (uniqueId && UNIQUES[uniqueId]) {
    item.uniqueId = uniqueId;
    item.name = uniqueId;
  }
  return item;
}

// Re-roll the main stat for a new item level (re-temper keeps rarity, affixes, unique)
export function withItemLevel(item, ilvl) {
  return { ...item, ilvl: Math.max(1, Math.floor(ilvl) || 1), ...mainStat(item.slot, item.rarity, ilvl) };
}

const STARTER_NAMES = ['Rusty Shortsword', 'Tattered Tunic', 'Pebble Amulet', 'Ancient Shard'];
export const isStarterItem = (item) => STARTER_NAMES.includes(item?.name);

// Clean one item read from a save or edited by hand: unknown slot -> null; junk fields dropped.
// `slot` is the slot the item is stored under when the item itself doesn't say.
export function sanitizeItem(raw, slot = null, fallbackIlvl = 1) {
  if (!raw || typeof raw !== 'object') return null;
  const s = SLOTS.includes(raw.slot) ? raw.slot : slot;
  if (!SLOTS.includes(s)) return null;
  const rarity = RARITY_NAMES.includes(raw.rarity) ? raw.rarity : 'Common';
  const key = MAIN_KEYS[s];
  const ilvlRaw = Math.floor(Number(raw.ilvl));
  const ilvl = Number.isFinite(ilvlRaw) && ilvlRaw >= 1 ? ilvlRaw : Math.max(1, Math.floor(fallbackIlvl) || 1);
  const stat = Number(raw[key]);
  const out = {
    ...raw,
    uid: Math.max(0, Math.floor(Number(raw.uid)) || 0),
    slot: s, rarity, ilvl,
    name: typeof raw.name === 'string' && raw.name ? raw.name : `${rarity} ${s.toUpperCase()}`,
    [key]: Number.isFinite(stat) && stat > 0 ? stat : mainStat(s, rarity, ilvl)[key],
    level: Math.max(0, Math.floor(Number(raw.level)) || 0),
    affixes: sanitizeAffixes(raw.affixes),
    uniqueId: UNIQUES[raw.uniqueId]?.slot === s ? raw.uniqueId : null,
    locked: raw.locked === true
  };
  delete out.color;
  if (raw.heirloom === true) out.heirloom = true; else delete out.heirloom;
  if (raw.freeTemper === true) out.freeTemper = true; else delete out.freeTemper;
  return out;
}

export function sanitizeAffixes(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const a of list) {
    if (!a || !AFFIXES[a.id] || seen.has(a.id)) continue;
    const v = Number(a.v);
    if (!Number.isFinite(v) || v <= 0) continue;
    seen.add(a.id);
    out.push({ id: a.id, v: Math.min(v, 1) });
  }
  return out;
}

export function defaultBag() {
  return { items: [], cap: BAG_CAP, nextUid: 1, autoSalvage: 'Common', wakeel: false, autoEquip: false };
}

export function sanitizeBag(raw) {
  const bag = defaultBag();
  if (!raw || typeof raw !== 'object') return bag;
  const cap = Math.floor(Number(raw.cap));
  bag.cap = Number.isFinite(cap) ? Math.max(BAG_CAP, Math.min(60, cap)) : BAG_CAP;
  bag.autoSalvage = AUTO_SALVAGE_CHOICES.includes(raw.autoSalvage) ? raw.autoSalvage : 'Common';
  // Al-Wakeel (auto-equip upgrades): granted to saves that had auto-replace; a dust-shop item later
  bag.wakeel = raw.wakeel === true;
  bag.autoEquip = bag.wakeel && raw.autoEquip === true;
  const uids = new Set();
  let next = Math.max(1, Math.floor(Number(raw.nextUid)) || 1);
  for (const r of Array.isArray(raw.items) ? raw.items : []) {
    const item = sanitizeItem(r);
    if (!item || bag.items.length >= bag.cap) continue;
    if (!item.uid || uids.has(item.uid)) item.uid = next++;
    uids.add(item.uid);
    next = Math.max(next, item.uid + 1);
    bag.items.push(item);
  }
  bag.nextUid = next;
  return bag;
}

export function defaultLoot() {
  return { legDry: 0, salvaged: 0, found: 0 };
}

export function sanitizeLoot(raw) {
  const out = defaultLoot();
  if (!raw || typeof raw !== 'object') return out;
  for (const k of Object.keys(out)) {
    const n = Math.floor(Number(raw[k]));
    out[k] = Number.isFinite(n) && n > 0 ? n : 0;
  }
  return out;
}

// Sum of the equipped items' affixes, each capped (see AFFIXES). `gear` is hero.gear.
export function affixTotals(gear) {
  const sums = {};
  for (const id of AFFIX_IDS) sums[id] = 0;
  for (const slot of SLOTS) {
    const list = gear?.[slot]?.affixes;
    if (!Array.isArray(list)) continue;
    for (const a of list) if (sums[a.id] !== undefined && a.v > 0) sums[a.id] += a.v;
  }
  for (const id of AFFIX_IDS) sums[id] = Math.min(AFFIXES[id].cap, sums[id]);
  return sums;
}

export const hasUnique = (gear, id) => gear?.[UNIQUES[id]?.slot]?.uniqueId === id;
