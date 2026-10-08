// Per-tab "Active Bonuses" strip: shows which Constellation talents, Dust shop features,
// Universal Mastery cross-bonuses and timed buffs (elixirs/spells) affect the current tab.

import { getGeodeAttunementMult, getNectarOfferingMult, getNectarHeld } from './systems/PrestigeSystem.js';
import { getRunClicks, getFingerOfWastaMult } from './systems/DustShopSystem.js';
import { itemName } from './data/names.js';
import { getWorldLinkBonuses, getWorldLinkMult, WORLD_LINK_CAP } from './systems/WorldLinks.js';
import { QUARTERMASTER_UPGRADES } from './systems/BountySystem.js';
import { t, buffName, bidi } from './i18n/index.js';

const pct = (v) => `${Math.round(v)}%`;

// Talent id -> tabs it affects + effect text at a given rank (mirrors the formulas in js/systems)
export const TALENT_TAB_EFFECTS = {
  click_power:           { tabs: ['monolith'], text: r => t('tb.click_power', { p: pct(r * 25) }) },
  crit_mastery:          { tabs: ['monolith'], text: r => t('tb.crit_mastery', { p: pct(5 + r * 3), x: (3 + r * 0.5).toFixed(1) }) },
  click_synergy:         { tabs: ['monolith'], text: r => t('tb.click_synergy', { p: pct(r * 2) }) },
  building_efficiency:   { tabs: ['monolith'], text: r => t('tb.building_efficiency', { p: pct(r * 10) }) },
  cost_reduction:        { tabs: ['monolith'], text: r => t('tb.cost_reduction', { p: pct(r * 4) }) },
  synergy_resonance:     { tabs: ['monolith'], text: r => t('tb.synergy_resonance', { p: pct(r * 15) }) },
  warlord_might:         { tabs: ['combat'], text: r => t('tb.warlord_might', { p: pct(r * 20) }) },
  dungeon_wealth:        { tabs: ['combat'], text: r => t('tb.dungeon_wealth', { p: pct(r * 25) }) },
  loot_fortune:          { tabs: ['combat'], text: r => t('tb.loot_fortune', { p: pct(r * 15) }) },
  mining_power:          { tabs: ['mining'], text: r => t('tb.mining_power', { p: pct(r * 25) }) },
  botanical_haste:       { tabs: ['garden'], text: r => t('tb.botanical_haste', { p: pct(r * 20) }) },
  catalyst_potency:      { tabs: ['alchemy'], text: r => t('tb.catalyst_potency', { p: pct(r * 25) }) },
  mana_flow:             { tabs: ['spells'], text: r => t('tb.mana_flow', { a: r * 20, b: r }) },
  offline_transcendence: { tabs: ['codex'], text: r => t('tb.offline', { p: pct(r * 25) }) },
  chrono_mastery:        { tabs: ['alchemy', 'bounties'], text: r => t('tb.chrono', { p: pct(r * 50) }) }
};

// Dust shop item id -> tabs it affects + effect text (gs is passed for live values)
export const SHOP_TAB_EFFECTS = {
  finger_of_wasta:   { tabs: ['monolith'], text: (r, gs) => t('tb.finger', { p: pct((getFingerOfWastaMult(gs) - 1) * 100), n: getRunClicks(gs).toLocaleString('en-US') }) },
  auto_buy:          { tabs: ['monolith'], text: (r, gs) => (gs.dustShop?.autoBuy ? t('tb.autobuy_on') : t('tb.switched_off')) },
  titan_legacy:      { tabs: ['combat'], text: r => t('tb.titan', { hp: r * 100, atk: r * 25 }) },
  astral_alchemist:  { tabs: ['alchemy'], text: () => t('tb.astral') },
  golem_covenant:    { tabs: ['garden'], text: () => t('tb.golems') },
  auto_leylines:     { tabs: ['spells'], text: () => t('tb.leylines') },
  chrono_vault:      { tabs: ['codex'], text: r => t('tb.vault', { h: r * 4, p: r * 50 }) }
};

// What each Active Bonuses chip kind is, for its tooltip (R24)
export const BONUS_KIND_LABELS = {
  talent: t('tb.kind.talent'),
  perk: t('tb.kind.perk'),
  mastery: t('tb.kind.mastery'),
  buff: t('tb.kind.buff')
};

// Timed buff type -> tabs where it matters
export const BUFF_TYPE_TABS = {
  click_mult: ['monolith'],
  aether_mult: ['monolith'],
  click_gold: ['monolith'],
  hero_atk: ['combat'],
  gold_mult: ['combat', 'mining'],
  time_speed: ['monolith', 'combat', 'mining', 'garden', 'spells']
};

// Spells offered as Quick Cast buttons on each tab
export const SPELL_TABS = {
  monolith: ['aether_burst', 'midas_touch', 'celestial_alignment', 'chrono_warp'],
  combat: ['void_strike', 'chrono_warp', 'astral_refresh'],
  mining: ['void_strike', 'chrono_warp'],
  garden: ['chrono_warp']
};

// --- Universal Mastery readout -------------------------------------------------------
// Pure functions of gameState that mirror the mastery formulas in GameState
// (getNetAetherPerSecond), CombatSystem, MiningSystem and SpellSystem, using the
// design-doc §5.3 linearized versions. Keep in sync if those formulas change.

export const fmtMult = (v) => bidi(`×${v >= 10 ? v.toFixed(1) : v.toFixed(2)}`);

function totalBuildings(gs) {
  let n = 0;
  for (const id in gs.buildings || {}) n += gs.buildings[id].count || 0;
  return n;
}
const bossesSlain = (gs) => gs.stats?.totalBossesSlain || 0;
const maxDepth = (gs) => gs.miningGrid?.maxDepth || 0;

// The Oil links (Building and Dungeon Mastery, Depth Resonance, High Enchanter, Aetheric Treaty,
// Philosopher's Catalyst) add into one category capped at +150% (R53, systems/WorldLinks.js).
// Each value below is 1 + that link's own bonus.
export const buildingAetherMult = (gs) => 1 + getWorldLinkBonuses(gs).building;
// Building Mastery -> hero attack and combat gold: x(1 + 0.01 * floor(buildings / 100))
export const buildingCombatMult = (gs) => 1 + 0.01 * Math.floor(totalBuildings(gs) / 100);
export const dungeonAetherMult = (gs) => 1 + getWorldLinkBonuses(gs).dungeon;
// Dungeon Mastery -> pickaxe power: x(1 + 0.02 * floor(bosses / 10)), capped at +100%
export const dungeonPickaxeMult = (gs) => 1 + Math.min(1, 0.02 * Math.floor(bossesSlain(gs) / 10));
export const depthAetherMult = (gs) => 1 + getWorldLinkBonuses(gs).depth;
// Excavation Mastery -> max mana, mana regen, hero HP: x(1 + min(1, 0.01 * maxDepth))
export const depthVitalityMult = (gs) => (maxDepth(gs) > 1 ? 1 + Math.min(1, 0.01 * maxDepth(gs)) : 1);
export const goldenSynergyMult = (gs) => 1 + getWorldLinkBonuses(gs).enchanter;
export const treatyMult = (gs) => 1 + getWorldLinkBonuses(gs).treaty;
// (only listed once alchemy.catalysts exists)
export const catalystMult = (gs) => 1 + getWorldLinkBonuses(gs).catalyst;

// Every mastery category with its current multiplier, the tabs it affects and its source.
// `add`: an additive link (Oil links, Geode/Nectar), shown as "+N%" rather than "xN" (R53)
export function getMasteries(gs) {
  const b = totalBuildings(gs), k = bossesSlain(gs), d = maxDepth(gs);
  const nectar = getNectarHeld(gs);
  const list = [
    { id: 'building_aether', icon: '🏗️', name: t('m.building'), effect: t('m.oil'), oil: true, tabs: ['monolith'],
      value: buildingAetherMult(gs), source: t('m.src.buildings', { n: b }), rule: t('m.rule.building_aether') },
    { id: 'building_combat', icon: '🏗️', name: t('m.building'), effect: t('m.atk_gold'), tabs: ['combat'],
      value: buildingCombatMult(gs), source: t('m.src.buildings', { n: b }), rule: t('m.rule.building_combat') },
    { id: 'dungeon_aether', icon: '💀', name: t('m.dungeon'), effect: t('m.oil'), oil: true, tabs: ['monolith'],
      value: dungeonAetherMult(gs), source: t('m.src.bosses', { n: k }), rule: t('m.rule.dungeon_aether') },
    { id: 'dungeon_pickaxe', icon: '💀', name: t('m.dungeon'), effect: t('m.pickaxe'), tabs: ['mining'],
      value: dungeonPickaxeMult(gs), source: t('m.src.bosses', { n: k }), rule: t('m.rule.dungeon_pickaxe') },
    { id: 'depth_aether', icon: '⛏️', name: t('m.depth'), effect: t('m.oil'), oil: true, tabs: ['monolith'],
      value: depthAetherMult(gs), source: t('mine.depth', { n: d }), rule: t('m.rule.depth_aether') },
    { id: 'depth_vitality', icon: '⛏️', name: t('m.excavation'), effect: t('m.vitality'), tabs: ['spells', 'combat'],
      value: depthVitalityMult(gs), source: t('mine.depth', { n: d }), rule: t('m.rule.depth_vitality') },
    { id: 'golden_synergy', icon: '💰', name: t('market.synergy_toast'), effect: t('m.oil'), oil: true, tabs: ['monolith'],
      value: goldenSynergyMult(gs), source: t('m.src.level', { n: gs.market?.goldenSynergy || 0 }), rule: t('m.rule.golden') }
  ];
  const treaty = QUARTERMASTER_UPGRADES.find(u => u.id === 'aether_treaty');
  const treatyRank = gs.quartermaster?.aether_treaty?.rank || 0;
  list.push({ id: 'treaty', icon: treaty.icon, name: treaty.name, effect: t('m.oil'), oil: true, tabs: ['monolith'],
    value: treatyMult(gs), source: t('tb.rank', { n: treatyRank }), rule: treaty.desc });
  if (gs.alchemy && gs.alchemy.catalysts !== undefined) {
    list.push({ id: 'catalyst', icon: '⚗️', name: t('m.catalyst'), effect: t('m.oil'), oil: true, tabs: ['monolith'],
      value: catalystMult(gs), source: t('m.src.brewed', { n: gs.alchemy.catalysts }), rule: t('m.rule.catalyst') });
  }
  list.push(
    { id: 'geode', icon: '💎', name: t('m.geode'), effect: t('m.reserves_gain'), tabs: ['prestige'],
      value: getGeodeAttunementMult(gs), source: t('mine.depth', { n: d }), rule: t('m.rule.geode') },
    { id: 'nectar', icon: '🌸', name: t('m.nectar'), effect: t('m.nectar_effect', { item: itemName('starNectar') }), tabs: ['prestige'],
      value: getNectarOfferingMult(gs), source: `${nectar} ${itemName('starNectar')}`, rule: t('m.rule.nectar') }
  );
  for (const m of list) if (m.oil || m.id === 'geode' || m.id === 'nectar') m.add = true;
  return list;
}

// A mastery's value as shown: "+12%" for an additive link, "x1.12" otherwise
export const fmtMastery = (m) => (m.add ? fmtBonus(m.value) : fmtMult(m.value));

// "+12%": an additive link bonus (value 1.12)
export const fmtBonus = (v) => bidi(`+${Math.round((v - 1) * 1000) / 10}%`);

// Tooltip text for the Aether/s header stat: every Oil link, added together up to the cap (R53)
export function getAetherMasteryTooltip(gs) {
  const rows = getMasteries(gs).filter(m => m.oil);
  return t('m.tooltip', { x: fmtMult(getWorldLinkMult(gs)), cap: fmtMult(1 + WORLD_LINK_CAP) }) + '\n' +
    rows.map(m => `${fmtBonus(m.value)} ${m.name} (${m.source})`).join('\n');
}

export function getTabBonuses(gameState, tab, talentDefs, shopDefs) {
  const items = [];
  for (const def of talentDefs) {
    const fx = TALENT_TAB_EFFECTS[def.id];
    const rank = gameState.talents?.[def.id]?.rank || 0;
    if (fx && rank > 0 && fx.tabs.includes(tab)) {
      items.push({ kind: 'talent', icon: '🌌', name: def.name, detail: `${t('tb.rank', { n: rank })} · ${fx.text(rank)}` });
    }
  }
  for (const def of shopDefs) {
    const fx = SHOP_TAB_EFFECTS[def.id];
    const rank = gameState.dustShop?.ranks?.[def.id] || 0;
    if (fx && rank > 0 && fx.tabs.includes(tab)) {
      items.push({ kind: 'perk', icon: def.icon, name: def.name, detail: fx.text(rank, gameState) });
    }
  }
  for (const m of getMasteries(gameState)) {
    if (m.value > 1 && m.tabs.includes(tab)) {
      items.push({ kind: 'mastery', icon: m.icon, name: m.name, detail: `${fmtMastery(m)} ${m.effect} · ${m.source}` });
    }
  }
  for (const b of gameState.activeBuffs || []) {
    if ((BUFF_TYPE_TABS[b.type] || []).includes(tab)) {
      items.push({ kind: 'buff', icon: '✨', name: buffName(b), detail: t('tb.left', { s: Math.ceil(b.duration) }) });
    }
  }
  return items;
}
