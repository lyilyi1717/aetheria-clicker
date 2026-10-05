// Per-tab "Active Bonuses" strip: shows which Constellation talents, Ascension perks
// and timed buffs (elixirs/spells) affect the subgame on the current tab.

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

export const PERK_TAB_EFFECTS = {
  eternal_resonance: { tabs: ['monolith'], text: r => `+${pct(r * 50)} Aether Production` },
  hyper_click:       { tabs: ['monolith'], text: r => `+${pct(r * 100)} Click Yield` },
  titan_legacy:      { tabs: ['combat'], text: r => `+${r * 100} HP, +${r * 25} Attack` },
  astral_alchemist:  { tabs: ['alchemy'], text: () => '2x Potion Duration' },
  auto_leylines:     { tabs: ['spells'], text: () => 'Auto-casts spells at full mana' },
  chrono_vault:      { tabs: ['codex'], text: r => `+${r * 720}m Offline Sand cap` }
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

export function getTabBonuses(gameState, tab, talentDefs, perkDefs) {
  const items = [];
  for (const def of talentDefs) {
    const fx = TALENT_TAB_EFFECTS[def.id];
    const rank = gameState.talents?.[def.id]?.rank || 0;
    if (fx && rank > 0 && fx.tabs.includes(tab)) {
      items.push({ kind: 'talent', icon: '🌌', name: def.name, detail: `R${rank} · ${fx.text(rank)}` });
    }
  }
  for (const def of perkDefs) {
    const fx = PERK_TAB_EFFECTS[def.id];
    const rank = gameState.ascensionPerks?.[def.id]?.rank || 0;
    if (fx && rank > 0 && fx.tabs.includes(tab)) {
      items.push({ kind: 'perk', icon: '🏛️', name: def.name, detail: fx.text(rank) });
    }
  }
  for (const b of gameState.activeBuffs || []) {
    if ((BUFF_TYPE_TABS[b.type] || []).includes(tab)) {
      items.push({ kind: 'buff', icon: '✨', name: b.name, detail: `${Math.ceil(b.duration)}s left` });
    }
  }
  return items;
}
