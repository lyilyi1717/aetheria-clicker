// Per-tab "Active Bonuses" strip: shows which Constellation talents, Dust shop features,
// Universal Mastery cross-bonuses and timed buffs (elixirs/spells) affect the current tab.

import { getGeodeAttunementMult, getNectarOfferingMult, getNectarHeld } from './systems/PrestigeSystem.js';
import { getRunClicks, getFingerOfWastaMult } from './systems/DustShopSystem.js';
import { itemName } from './data/names.js';

const pct = (v) => `${Math.round(v)}%`;

// Talent id -> tabs it affects + effect text at a given rank (mirrors the formulas in js/systems)
export const TALENT_TAB_EFFECTS = {
  click_power:           { tabs: ['monolith'], text: r => `+${pct(r * 25)} Click Yield` },
  crit_mastery:          { tabs: ['monolith'], text: r => `${pct(5 + r * 3)} Crit, ${(3 + r * 0.5).toFixed(1)}x Crit Mult` },
  click_synergy:         { tabs: ['monolith'], text: r => `+${pct(r * 2)} of CPS added to clicks` },
  building_efficiency:   { tabs: ['monolith'], text: r => `+${pct(r * 10)} Generator Output` },
  cost_reduction:        { tabs: ['monolith'], text: r => `-${pct(r * 4)} Building Costs` },
  synergy_resonance:     { tabs: ['monolith'], text: r => `+${pct(r * 15)} Milestone Multipliers` },
  warlord_might:         { tabs: ['combat'], text: r => `+${pct(r * 20)} Combat Damage` },
  dungeon_wealth:        { tabs: ['combat'], text: r => `+${pct(r * 25)} Monster Gold` },
  loot_fortune:          { tabs: ['combat'], text: r => `+${pct(r * 15)} Gear Drop Chance` },
  mining_power:          { tabs: ['mining'], text: r => `+${pct(r * 25)} Pickaxe Power` },
  botanical_haste:       { tabs: ['garden'], text: r => `+${pct(r * 20)} Growth Speed` },
  catalyst_potency:      { tabs: ['alchemy'], text: r => `+${pct(r * 25)} Potion Duration` },
  mana_flow:             { tabs: ['spells'], text: r => `+${r * 20} Max Mana, +${r} Mana/s` },
  offline_transcendence: { tabs: ['codex'], text: r => `+${pct(r * 25)} Offline Efficiency` },
  chrono_mastery:        { tabs: ['alchemy', 'bounties'], text: r => `+${pct(r * 50)} Chrono Sand gains` }
};

// Dust shop item id -> tabs it affects + effect text (gs is passed for live values)
export const SHOP_TAB_EFFECTS = {
  finger_of_wasta:   { tabs: ['monolith'], text: (r, gs) => `+${pct((getFingerOfWastaMult(gs) - 1) * 100)} Aether (${getRunClicks(gs).toLocaleString('en-US')} clicks this run)` },
  auto_buy:          { tabs: ['monolith'], text: (r, gs) => (gs.dustShop?.autoBuy ? 'Buys the best generator every 10 s' : 'Switched off') },
  titan_legacy:      { tabs: ['combat'], text: r => `+${r * 100} HP, +${r * 25} Attack` },
  astral_alchemist:  { tabs: ['alchemy'], text: () => '2x Elixir Duration' },
  golem_covenant:    { tabs: ['garden'], text: () => 'Golems can be bought' },
  auto_leylines:     { tabs: ['spells'], text: () => 'Auto-casts spells at full mana' },
  chrono_vault:      { tabs: ['codex'], text: r => `+${r * 4} h offline Aether at 100%, +${r * 50}% Sand bank` }
};

// What each Active Bonuses chip kind is, for its tooltip (R24)
export const BONUS_KIND_LABELS = {
  talent: 'Constellation talent',
  perk: 'Dust shop feature',
  mastery: 'Universal Mastery',
  buff: 'Timed buff'
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

export const fmtMult = (v) => `×${v >= 10 ? v.toFixed(1) : v.toFixed(2)}`;

function totalBuildings(gs) {
  let n = 0;
  for (const id in gs.buildings || {}) n += gs.buildings[id].count || 0;
  return n;
}
const bossesSlain = (gs) => gs.stats?.totalBossesSlain || 0;
const maxDepth = (gs) => gs.miningGrid?.maxDepth || 0;

// Building Mastery -> Aether: x(1 + 0.015 * floor(buildings / 100))
export const buildingAetherMult = (gs) => 1 + 0.015 * Math.floor(totalBuildings(gs) / 100);
// Building Mastery -> hero attack and combat gold: x(1 + 0.01 * floor(buildings / 100))
export const buildingCombatMult = (gs) => 1 + 0.01 * Math.floor(totalBuildings(gs) / 100);
// Dungeon Mastery -> Aether: x(1 + 0.01 * floor(bosses / 10))
export const dungeonAetherMult = (gs) => 1 + 0.01 * Math.floor(bossesSlain(gs) / 10);
// Dungeon Mastery -> pickaxe power: x(1 + 0.02 * floor(bosses / 10)), capped at +100%
export const dungeonPickaxeMult = (gs) => 1 + Math.min(1, 0.02 * Math.floor(bossesSlain(gs) / 10));
// Depth Resonance -> Aether: x(1 + 0.02 * maxDepth) (inactive at depth 1, like the old gate)
export const depthAetherMult = (gs) => (maxDepth(gs) > 1 ? 1 + 0.02 * maxDepth(gs) : 1);
// Excavation Mastery -> max mana, mana regen, hero HP: x(1 + min(1, 0.01 * maxDepth))
export const depthVitalityMult = (gs) => (maxDepth(gs) > 1 ? 1 + Math.min(1, 0.01 * maxDepth(gs)) : 1);
// Golden Synergy (High Enchanter) -> Aether: x(1 + 0.05 * level)
export const goldenSynergyMult = (gs) => 1 + 0.05 * (gs.market?.goldenSynergy || 0);
// Philosopher's Catalyst -> Aether: x(1 + 0.02 * catalysts brewed) (only once alchemy.catalysts exists)
export const catalystMult = (gs) => 1 + 0.02 * (gs.alchemy?.catalysts || 0);

// Every mastery category with its current multiplier, the tabs it affects and its source
export function getMasteries(gs) {
  const b = totalBuildings(gs), k = bossesSlain(gs), d = maxDepth(gs);
  const nectar = getNectarHeld(gs);
  const list = [
    { id: 'building_aether', icon: '🏗️', name: 'Building Mastery', effect: 'Aether', tabs: ['monolith'],
      value: buildingAetherMult(gs), source: `${b} buildings`, rule: '+1.5% per 100 buildings' },
    { id: 'building_combat', icon: '🏗️', name: 'Building Mastery', effect: 'Hero Attack & Combat Gold', tabs: ['combat'],
      value: buildingCombatMult(gs), source: `${b} buildings`, rule: '+1% per 100 buildings' },
    { id: 'dungeon_aether', icon: '💀', name: 'Dungeon Mastery', effect: 'Aether', tabs: ['monolith'],
      value: dungeonAetherMult(gs), source: `${k} bosses`, rule: '+1% per 10 bosses' },
    { id: 'dungeon_pickaxe', icon: '💀', name: 'Dungeon Mastery', effect: 'Pickaxe Power', tabs: ['mining'],
      value: dungeonPickaxeMult(gs), source: `${k} bosses`, rule: '+2% per 10 bosses, max +100%' },
    { id: 'depth_aether', icon: '⛏️', name: 'Depth Resonance', effect: 'Aether', tabs: ['monolith'],
      value: depthAetherMult(gs), source: `Depth ${d}`, rule: '+2% per max depth' },
    { id: 'depth_vitality', icon: '⛏️', name: 'Excavation Mastery', effect: 'Max Mana, Mana Regen & Hero HP', tabs: ['spells', 'combat'],
      value: depthVitalityMult(gs), source: `Depth ${d}`, rule: '+1% per max depth, max +100%' },
    { id: 'golden_synergy', icon: '💰', name: 'Golden Synergy', effect: 'Aether', tabs: ['monolith'],
      value: goldenSynergyMult(gs), source: `Level ${gs.market?.goldenSynergy || 0}`, rule: '+5% per level' }
  ];
  if (gs.alchemy && gs.alchemy.catalysts !== undefined) {
    list.push({ id: 'catalyst', icon: '⚗️', name: "Philosopher's Catalyst", effect: 'Aether', tabs: ['monolith'],
      value: catalystMult(gs), source: `${gs.alchemy.catalysts} brewed`, rule: '+2% per catalyst' });
  }
  list.push(
    { id: 'geode', icon: '💎', name: 'Geode Attunement', effect: 'Cosmic Dust gain', tabs: ['prestige'],
      value: getGeodeAttunementMult(gs), source: `Depth ${d}`, rule: '+10% per 10 max depth' },
    { id: 'nectar', icon: '🌸', name: 'Honey Offering', effect: `Cosmic Dust gain (${itemName('starNectar')} consumed)`, tabs: ['prestige'],
      value: getNectarOfferingMult(gs), source: `${nectar} ${itemName('starNectar')}`, rule: '+2% × √Honey, max ×2' }
  );
  return list;
}

// Tooltip text for the Aether/s header stat: every Aether-affecting mastery
export function getAetherMasteryTooltip(gs) {
  const rows = getMasteries(gs).filter(m => m.effect === 'Aether');
  const total = rows.reduce((t, m) => t * m.value, 1);
  return `Mastery multipliers on Aether/s (${fmtMult(total)} total):\n` +
    rows.map(m => `${fmtMult(m.value)} ${m.name} (${m.source})`).join('\n');
}

export function getTabBonuses(gameState, tab, talentDefs, shopDefs) {
  const items = [];
  for (const def of talentDefs) {
    const fx = TALENT_TAB_EFFECTS[def.id];
    const rank = gameState.talents?.[def.id]?.rank || 0;
    if (fx && rank > 0 && fx.tabs.includes(tab)) {
      items.push({ kind: 'talent', icon: '🌌', name: def.name, detail: `R${rank} · ${fx.text(rank)}` });
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
      items.push({ kind: 'mastery', icon: m.icon, name: m.name, detail: `${fmtMult(m.value)} ${m.effect} · ${m.source}` });
    }
  }
  for (const b of gameState.activeBuffs || []) {
    if ((BUFF_TYPE_TABS[b.type] || []).includes(tab)) {
      items.push({ kind: 'buff', icon: '✨', name: b.name, detail: `${Math.ceil(b.duration)}s left` });
    }
  }
  return items;
}
