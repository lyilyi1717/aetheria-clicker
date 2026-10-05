// Single source of truth for the game version and the About tab changelog.
// Add a new entry at the TOP of CHANGELOG and bump VERSION for every release.

export const VERSION = '2.7.1';

export const CHANGELOG = [
  {
    version: '2.7.1',
    date: '2026-10-06',
    title: 'Boss Portrait & Number Fixes',
    changes: [
      'Void Tower: the boss portrait now sits in a fixed square frame, so the card no longer jumps, overflows or moves the click target, and it works on phones.',
      'Gear, hero and monster stats, XP and combat damage now follow your number notation (e.g. 1.5e12) and update as soon as you change it in Settings.',
      'Counts across Excavation, Garden, Alchemy, Bounties, Bazaar, Codex and the offline popup no longer show long raw numbers.'
    ]
  },
  {
    version: '2.7.0',
    date: '2026-10-06',
    title: 'Fast Forward Returns',
    changes: [
      'Fast Forward is back. Each use costs 3x the last (30, 90, 270, 810 Chrono Sand…), and the price resets after 30 minutes without one.',
      'The Fast Forward button shows its current price, uses this cycle and a reset countdown, and spamming it no longer lags the game.',
      'Fixed lost clicks on the Golden Enchanter button and a shared 1x/10x/MAX setting between the Buildings and the Bazaar.'
    ]
  },
  {
    version: '2.6.0',
    date: '2026-10-06',
    title: 'The Cosmic Falafel Update',
    changes: [
      'Theme: Transformed the central clicker Monolith into a glorious Cosmic Falafel ring topped with sesame seeds (procedural SVG art).'
    ]
  },
  {
    version: '2.5.0',
    date: '2026-10-06',
    title: 'Visual Polish & Audio Rhythms',
    changes: [
      'Audio: Added a rhythmic sound box with 5 selectable scales in Settings (Pentatonic, Hijaz, Mystic, Lofi, Boss).',
      'Visuals: Improved global contrast and adjusted image object-fit to prevent cut-off pictures in Safari/Chrome.'
    ]
  },
  {
    version: '2.4.0',
    date: '2026-10-06',
    title: 'Visual Polish & Number Formatting',
    changes: [
      'UI: Massive numbers in combat (Boss HP, Hero HP, Attack, Damage, XP) now respect your chosen Number Notation from the Settings tab.',
      'Equipment: Overhauled the Hero Gear panel with dynamic CSS rarity backgrounds, glows, and animations (Cosmic tier is now glowing Gold, Legendary is pulsing Red).',
      'Polish: Applied a global custom tooltip system with glassmorphism styling and golden accents.',
      'Visuals: Added a subtle cosmic desert dust animation to the game background.'
    ]
  },
  {
    version: '2.3.0',
    date: '2026-10-06',
    title: 'Saudi Meme Edition',
    changes: [
      'Visuals: Swapped colors to Desert Gold & Emerald Green.',
      'Theme: Transformed to Saudi memes (Kabsa, Drifting Camry, Angry Shayeb, Wasta bosses).',
      'UI: Complete overhaul of icons and images to fit the desert and cosmic meme style.',
      'Mechanics: Added MAX buy for Golden Synergy.',
      'Anti-Cheat: Fast forward disabled with a message.'
    ]
  },
  {
    version: '2.2.1',
    date: '2026-10-05',
    title: 'Anti-Cheat System',
    changes: [
      'Disabled the Fast Forward button.',
      'Added a special surprise pop-up message for anyone trying to cheat time.'
    ]
  },
  {
    version: '2.2.0',
    date: '2026-10-05',
    title: 'Saudi Edition Update',
    changes: [
      'Updated theme colors to a vibrant Saudi aesthetic (Emerald and Desert Gold).',
      'Replaced Void Tower combat zones with iconic local spots (Thumama Dunes, Boulevard World, etc.).',
      'Introduced 12 new Saudi meme bosses including Drifting Camry, Giant Kabsa, and Angry Shayeb.',
      'Added custom generated meme image sprites for the bosses.'
    ]
  },
  {
    version: '2.1.1',
    date: '2026-10-05',
    title: 'Excavation Unstuck',
    changes: [
      'Fixed Excavation sometimes freezing for good after finding the stairs; stuck saves repair themselves on load.',
      'Very deep saves from before v2.0 resume at a depth your pickaxe can dig; your record depth and its bonuses are kept.',
      'Dynamite and Void Cataclysm now hit each tile for 40x your pickaxe power instead of breaking it outright.'
    ]
  },
  {
    version: '2.1.0',
    date: '2026-10-05',
    title: 'Online Leaderboard',
    changes: [
      'New Leaderboard tab: pick a display name and compare Max Floor, Best Run Aether, Ascensions and Max Depth with other players (top 50 each).',
      'See how many players are online right now; a green dot marks anyone who played in the last 2 minutes.',
      'Best Run Aether is tracked from this version on.'
    ]
  },
  {
    version: '2.0.0',
    date: '2026-10-05',
    title: 'The Great Rebalance',
    changes: [
      'Excavation slows down for real: every depth is tougher and gives more Stone. Pickaxe levels and Auto-Drills now cost Stone, the pickaxe has no level cap, and there are 7 strata with richer Void Amethyst deeper down.',
      'Garden plants now take 5 minutes to 2 hours. Water All gives +30s on a 60s cooldown. Fertilize is live (1 Spore Powder doubles a plot’s next yield).',
      'New Garden Golems (up to 4, bought with Stone + Mana Sap): each harvests and replants its row automatically, and keeps working offline at 50% speed for up to 12 hours.',
      'Excavation and Garden now raise Cosmic Dust: +10% per 10 max depth (Geode Attunement), and Ascending offers up your Celestial Nectar for up to x2 dust (Nectar Offering).',
      'Depth now gives +2% Aether per depth and up to +100% mana, mana regen and hero HP. Full mana speeds the Garden x1.5 and Auto-Drills x1.25 (Leyline Overflow).',
      'New buff bar under the header shows every active elixir, spell buff and Frenzy with a countdown; tap one to jump to the tab it powers. On phones it sits at the bottom.',
      'New Masteries panel on the Ascension tab, mastery bonuses in each tab’s Active Bonuses strip, and an Aether/s tooltip showing what multiplies it.',
      'Nerf: Aether buffs now add together (+300% and +200% = x6, was x12) and can be extended to at most 10 minutes.',
      'Nerf: Philosopher’s Catalyst gives +2% Aether per brew (additive) and costs 8% more each time; saves above 50 brews keep 50.',
      'Nerf: Chrono Sand costs 1,000 x Market Index gold per 30s and the bank holds 1,440s; sand above the cap was removed.',
      'Very deep Excavation saves were compressed (e.g. depth 3,752 becomes 120) and capped at 12 Auto-Drills. Plants already growing finish on their old timers.',
      'Fixed: gold caches and stone transmutes paying 0 at extreme depth, Auto-Drills losing hits, and the Void Tower becoming unbeatable around floor 6,200.'
    ]
  },
  {
    version: '1.5.0',
    date: '2026-10-05',
    title: 'Gold Economy Rebalance',
    changes: [
      'Void Tower: gold per kill now grows at the same rate as monster difficulty (1.12x per floor, was 1.15x), so gold no longer outpaces the rest of the game. Gold you already have is kept.',
      'Bazaar: commodity prices and caravans now scale with your deepest Void Tower floor (Market Index), so trading stays worthwhile at every stage. The index is shown on the Bazaar tab.',
      'Bazaar: caravans are now Small (10 min, 1.25x) and Large (60 min, 1.5x); the payout is locked in when you send them.',
      'Bazaar: the Golden Enchanter no longer becomes free at extremely high levels.'
    ]
  },
  {
    version: '1.4.0',
    date: '2026-10-05',
    title: 'Quick Cast & Guild Seals',
    changes: [
      'Quick Cast bar on the Monolith, Void Tower, Excavation and Garden tabs: cast the Grimoire spells that matter there without switching tabs. Each button shows its mana cost, cooldown, or the time left on its buff.',
      'Guild Seals now appear in the top resource bar.'
    ]
  },
  {
    version: '1.3.1',
    date: '2026-10-05',
    title: 'Resource Flow Guides',
    changes: [
      'Every How It Works banner now lists what the tab produces and where those resources are used elsewhere in the game.'
    ]
  },
  {
    version: '1.3.0',
    date: '2026-10-05',
    title: 'Active Bonuses on Every Tab',
    changes: [
      'Each subgame tab now shows an Active Bonuses strip: the Constellation talents, Ascension perks and running elixir/spell buffs that affect that tab, with their current total effect.'
    ]
  },
  {
    version: '1.2.2',
    date: '2026-10-05',
    title: 'Bulk Chrono Transmutation',
    changes: [
      'Alchemy: Gold to Chrono Sand conversion now has x1, x10, x100, x1K and Max buttons (Max shows how much sand you will get).',
      'The Chrono Sand counter now uses your chosen number notation.'
    ]
  },
  {
    version: '1.2.1',
    date: '2026-10-05',
    title: 'Bounty Alerts',
    changes: [
      'A red dot now appears on the Bounties tab whenever a contract is ready to claim.'
    ]
  },
  {
    version: '1.2.0',
    date: '2026-10-05',
    title: 'Scientific Notation & Settings',
    changes: [
      'Large numbers now display in scientific notation by default (1e9, 1.5e10).',
      'New Settings tab: switch number notation between Scientific, Standard (K, M, B…) and Engineering. Your choice is saved with your game.',
      'Excavation: rubies were stored under the wrong name and never reached Alchemy; existing ones are recovered automatically.',
      'The game now autosaves while its tab is in the background.'
    ]
  },
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

