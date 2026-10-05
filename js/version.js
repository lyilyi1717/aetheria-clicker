// Single source of truth for the game version and the About tab changelog.
// Add a new entry at the TOP of CHANGELOG and bump VERSION for every release.

export const VERSION = '1.1.1';

export const CHANGELOG = [
  {
    version: '1.1.1',
    date: '2026-10-05',
    title: 'Garden Timer Fix',
    changes: [
      'Garden: plot timers can no longer count into negative seconds; any fully grown plot is always harvestable (also repairs plots stuck in older saves).'
    ]
  },
  {
    version: '1.1.0',
    date: '2026-10-05',
    title: 'The Great Audit',
    changes: [
      'Bazaar: caravan dispatch buttons now respond reliably (they were rebuilt every frame and swallowed clicks).',
      'Ascension: Transcend button now responds reliably; Fracture Shards now grant +10% All Aether Production each.',
      'Ascension: Automated Leylines, Chrono Reservoir, Titan\'s Legacy and Astral Crucible perks now actually work.',
      'Bounties: contract progress and Claim buttons update live; cards now show the Guild Seals reward.',
      'Constellations: all 15 talents now apply their effects (10 previously did nothing); Leyline Conduit mana bonus no longer resets.',
      'Constellations: Respec asks for confirmation and is disabled when no points are spent.',
      'Garden: fixed plants getting stuck in "blooming" forever after Water All; Water All shows its cooldown.',
      'Garden: Mana Lily now restores mana on harvest; harvest popups show the essence gained.',
      'Alchemy: Midas Elixir now boosts gold; elixirs survive a page reload; ingredient names and owned counts are shown.',
      'Grimoire: Chrono Warp lasts its full 15s and no longer burns other buffs 5x faster; Midas\' Blessing now mints gold per click.',
      'Grimoire: buff spells refresh instead of stacking; Void Cataclysm hits for 40% of max HP and reveals random tiles.',
      'Monolith: Frenzy no longer re-triggers forever; combo label shows the real bonus (max 5x); MAX buy shows the true next cost.',
      'Void Tower: Time Warp no longer auto-fails bosses; equipment panel updates on new loot; amulet crit now works; amulet/relic drops never downgrade.',
      'Added a version label and this About page.'
    ]
  },
  {
    version: '1.0.1',
    date: '2026-10-05',
    title: 'Excavation Shop Fix',
    changes: [
      'Excavation: pickaxe, Auto-Drill and Dynamite buttons now respond to clicks.',
      'Excavation: dug tiles no longer go blank after a purchase or show stale tiles after taking the stairs.',
      'Excavation: Dynamite now blasts a real 3x3 area.'
    ]
  },
  {
    version: '1.0.0',
    date: '2026-10-05',
    title: 'First Public Release',
    changes: [
      'Aetheria Clicker published on GitHub Pages.'
    ]
  }
];
