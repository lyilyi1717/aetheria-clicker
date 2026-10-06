// Player-facing item names (R27). The one place every view reads an item's name, plural, icon
// and colour from. Keys are the save keys (inventory, garden essences, hybrid essences) and
// never change; only the text here does. A re-theme or translation edits this file only.

export const ITEM_NAMES = {
  // Excavation: stone and strata stone
  stone: { name: 'Stone', plural: 'Stone', icon: '⛏️', color: '#94a3b8' },
  limestone: { name: 'Limestone', plural: 'Limestone', icon: '🪨', color: '#94a3b8' },
  granite: { name: 'Granite', plural: 'Granite', icon: '🧱', color: '#64748b' },
  obsidian: { name: 'Obsidian', plural: 'Obsidian', icon: '⬛', color: '#334155' },
  voidstone: { name: 'Voidstone', plural: 'Voidstone', icon: '🔮', color: '#4c1d95' },
  // Excavation treasures (the gem ladder, lowest first)
  rubies: { name: 'Fanoos', plural: 'Fawanees', icon: '🔴', color: '#ef4444' },
  sapphires: { name: 'Dallah', plural: 'Dallahs', icon: '🔵', color: '#3b82f6' },
  emeralds: { name: 'Oud Wood', plural: 'Oud Wood', icon: '🟢', color: '#10b981' },
  diamonds: { name: 'Misbaha', plural: 'Misbaha', icon: '💎', color: '#38bdf8' },
  voidAmethyst: { name: 'Mabkhara', plural: 'Mabkhara', icon: '🟣', color: '#a855f7' },
  // Void Tower drops
  monsterBones: { name: 'Monster Bone', plural: 'Monster Bones', icon: '🦴', color: '#e5e7eb' },
  voidCores: { name: 'Void Core', plural: 'Void Cores', icon: '🌀', color: '#8b5cf6' },
  bossTokens: { name: 'Boss Token', plural: 'Boss Tokens', icon: '🎖️', color: '#fbbf24' },
  // Garden essences
  sporePowder: { name: 'Fresh Mint', plural: 'Fresh Mint', icon: '🌿', color: '#4ade80' },
  manaSap: { name: 'Lemon Drops', plural: 'Lemon Drops', icon: '🍋', color: '#facc15' },
  solarDew: { name: 'Truffle Oil', plural: 'Truffle Oil', icon: '🫒', color: '#f59e0b' },
  cryoEssence: { name: 'Taif Rosewater', plural: 'Taif Rosewater', icon: '🌹', color: '#f472b6' },
  voidPollen: { name: 'Golden Dates', plural: 'Golden Dates', icon: '🌴', color: '#d97706' },
  starNectar: { name: 'Sidr Honey', plural: 'Sidr Honey', icon: '🍯', color: '#fbbf24' },
  // Garden hybrid essences
  limonana: { name: 'Limonana', plural: 'Limonana', icon: '🍹', color: '#a3e635' },
  truffleZest: { name: 'Lemon Truffle Zest', plural: 'Lemon Truffle Zest', icon: '🍋', color: '#fde047' },
  roseTruffle: { name: 'Rose Truffle Jam', plural: 'Rose Truffle Jam', icon: '🥘', color: '#fb7185' },
  roseDate: { name: 'Rose Date Syrup', plural: 'Rose Date Syrup', icon: '🍯', color: '#f9a8d4' },
  honeyDate: { name: 'Honeyed Dates', plural: 'Honeyed Dates', icon: '🌴', color: '#fbbf24' },
  mintHoney: { name: 'Mint Honey Tea', plural: 'Mint Honey Tea', icon: '🍵', color: '#86efac' }
};

// Excavation grid tiles name their treasure in the singular; this maps a tile's content to its
// inventory key.
export const TILE_ITEM_KEY = { ruby: 'rubies', sapphire: 'sapphires', emerald: 'emeralds', diamond: 'diamonds', voidAmethyst: 'voidAmethyst' };

// Name of an item, plural when count is not 1. Unknown keys fall back to the key itself.
export function itemName(key, count = 1) {
  const e = ITEM_NAMES[key];
  if (!e) return key;
  return count === 1 ? e.name : e.plural;
}
