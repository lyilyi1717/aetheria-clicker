// Single source of truth for the game version and the About tab changelog.
// Every PR that changes what players see or how the game plays adds an entry at the TOP of
// CHANGELOG and sets VERSION to it (rules in AGENTS.md, "Version and changelog").
// test_version.js checks the two agree; CI fails a game-code PR that doesn't touch this file.

export const VERSION = '4.7.0';

export const CHANGELOG = [
  {
    version: '4.7.0',
    date: '2026-10-06',
    title: 'Bigger text, a Falafel that fits your screen',
    changes: [
      'Text is bigger everywhere: about 6% on phones and up to 15% on laptop and desktop screens. Numbers, buttons and labels all grew together, and the tiniest badges (8 to 10 px before) are now about 12 px.',
      'The Cosmic Falafel now grows with your window, up to almost twice its old size on a big monitor, and stays in view while you scroll the generator list.',
      'Tabs use more of a wide screen (up to 1440 px, was 1100 px), so there are no big empty bands at the sides. On very wide screens the generators sit in two columns.',
      'Bazaar on phones: the Buy and Sell buttons now sit in one full-width row under each good instead of a squashed column, and are easier to tap.'
    ]
  },
  {
    version: '4.6.0',
    date: '2026-10-06',
    title: 'Accounts and cloud save',
    changes: [
      'New in Settings: Account & Cloud Save. Sign in with Google or with an email and password to keep your progress in the cloud and continue on another device or browser. Forgot your password? A reset link comes by email.',
      'Accounts are optional. Without one the game saves in this browser exactly as before.',
      'While signed in, your game saves to the cloud every 3 minutes, when you press Save Game and when you leave the page. Signing in on a new device loads your cloud save.',
      'Your progress is never overwritten without asking: if this device and the cloud have different progress, you choose "Keep this device" or "Keep cloud", with each save\'s time, Ascensions, Transcends, floor and depth side by side.',
      'Your leaderboard entry now belongs to your account, so it follows you to every device. Your old guest entry for this season is replaced by it, so you are only listed once.'
    ]
  },
  {
    version: '4.5.0',
    date: '2026-10-06',
    title: 'Weekly Ledger goals are a real week',
    changes: [
      'Weekly Ledger goals are harder now: they could often be finished in one sitting, which made them feel like dailies. Each goal now asks for about 4.5 of your usual days of progress, so a week takes a few visits but still leaves 2 to 3 days of slack.',
      'Goals are sized to your own pace: the game remembers how much you did of each thing (bosses, blocks, harvests, clicks...) on your last 7 days played and uses a typical day, so the Ledger keeps up as you grow. A single big or idle day barely moves it, and days you do not play are not counted.',
      'Until it has seen 3 of your days, a goal uses a starting target (for example Slay 200 Tower fiends, was 60). No goal is ever easier than before.',
      'Each Ledger goal now pays 10 Guild Seals (was 6), 30 for the full week.',
      'This week\'s goals keep their old targets and old 6-Seal reward until the Ledger rotates on Monday. Missing a week still loses nothing.'
    ]
  },
  {
    version: '4.4.0',
    date: '2026-10-06',
    title: 'Frenzy every 20 clicks',
    changes: [
      'Your click combo now reaches its full x5 boost after 20 clicks (was 50).',
      'Every 20 clicks in a row (20, 40, 60, ...) sets off a Frenzy. When a Frenzy ends your combo keeps going instead of dropping back to 0, so you never have to rebuild 100 clicks again. Only pausing for 2 seconds drains the combo.',
      'Frenzy is shorter and gentler so it can come much more often: x3 click yield for 4 s (was x5 and rapid auto-clicks for 15 s). Reaching the next 20 while a Frenzy is running adds 4 s, up to 30 s. Overall, attentive play earns about the same as before; pure clicking without spells earns a little less, and a Time Flux anomaly is now 25 s of the new x3 Frenzy.',
      'The combo bar fills over the first 20 clicks, then shows your progress to the next Frenzy, with a "Frenzy in N" counter.'
    ]
  },
  {
    version: '4.3.0',
    date: '2026-10-06',
    title: 'Friendlier big numbers',
    changes: [
      'New default number notation, Letters: 1.50K, 2.30M, 4.00B, 7.25T, then aa, ab, ac… after trillion (1.00aa is 1,000 T, 1.00ab is 1,000 aa, and so on). After zz comes aaa, so it never runs out.',
      'If you were on Scientific (the old default), your game now uses Letters. Prefer 1.5e16? Switch back in Settings with one tap. Players who picked Standard or Engineering keep their choice.',
      'The old Standard option (Qa, Qi, Sx…) is still in Settings, now called Named, along with Scientific and Engineering.'
    ]
  },
  {
    version: '4.2.2',
    date: '2026-10-06',
    title: 'Dallah, Codex, Leaderboard and Settings open again',
    changes: [
      'The Dallah, Codex, Leaderboard and Settings tabs showed an empty page unless the Chronicle tab was open. They now open normally.'
    ]
  },
  {
    version: '4.2.1',
    date: '2026-10-06',
    title: 'Dynamite blasts land on the grid',
    changes: [
      'The Excavation 3x3 blast now shows its sparks and rewards on the tiles it actually hit, instead of in the middle of the screen. Blasted tiles flash orange so you can see the 3x3 area.',
      'Blasts near an edge or corner only hit the tiles that are on the grid (4 at a corner, 6 along an edge), as before; only the effects were in the wrong place.',
      'Void Cataclysm also shows its mining effects on the tiles it hits while the Excavation grid is on screen.'
    ]
  },
  {
    version: '4.2.0',
    date: '2026-10-06',
    title: 'Tabs open as you play',
    changes: [
      'A new game starts with just the Falafel. Each other tab opens when you reach its goal, with a gold "NEW" toast and a NEW tag on the tab until you visit it: Codex at 3 achievements, Void Tower at 10 Shawarma Stalls, Excavation after the floor-20 boss, Grimoire after the floor-40 boss, Bounties at depth 10, Garden at depth 15, Alchemy once you can brew a recipe, Ascension once it pays Cosmic Dust (1e9 Aether in one run), Constellations, Leaderboard and the Dallah at your first Ascension, the Bazaar at Ascension 2 and floor 150, and the Chronicle at your first Transcend.',
      'The next tab to open shows in the menu as a locked "???" with its goal and a progress bar, so you always know what is coming. On phones the bottom bar keeps its places with dimmed "Soon" slots.',
      'Some tabs bring a starter gift when they open: 30 stone for Excavation, a full mana bar for the Grimoire and 2 Mint seeds for the Garden.',
      'The Void Tower hero starts climbing when the Tower opens (not before), and the Quick Cast bar appears with the Grimoire.',
      'Contracts and Weekly Ledger goals only ask for things in tabs you have open.',
      'Existing saves keep every tab they have used: if you have Ascended, Transcended or begun a Chronicle, everything stays open; otherwise every tab you played in (or already earned) stays open, with no NEW tags. Settings and About are always open.'
    ]
  },
  {
    version: '4.1.1',
    date: '2026-10-06',
    title: 'Notices no longer hide your buffs',
    changes: [
      'Reward notices now appear below the buff bar instead of on top of it, so you can always see your buff and spell timers. With no buffs running, notices sit where they did before.',
      'On phones the notices stop above the buff bar at the bottom of the screen. On very short screens, a notice that does not fit fades out at the edge instead of covering the bar.'
    ]
  },
  {
    version: '4.1.0',
    date: '2026-10-06',
    title: 'The Dust Shop',
    changes: [
      'Ascension perks are gone. In their place, the Ascension tab has a Dust Shop that sells new features instead of bigger numbers. New shelves open at Ascension 1, 3, 5, 10 and 20, so there is something new to buy as you keep Ascending.',
      'New features: Blueprint Memory (keep the first 2 upgrades of every generator when you Ascend), Auto-Buy (buys the best-value generator every 10 s; switch it on or off above the generator list), Finger of Wasta (+1% production per 100 clicks this run, up to +50%), Golem Covenant (Golems are now bought through this), Hourglass of Al-Ula (5 min and 1 h Fast Forward buttons for 300 and 3,600 Chrono Sand), Blueprint Memory II (keep every upgrade of generators 1-7), Resonant Start (start each run with 1 of each of the first 10 generators) and Dust Amplifier (+10% Cosmic Dust per rank, repeatable).',
      'Cosmic Genesis, Chrono Reservoir, Titan\'s Legacy, Astral Crucible and Automated Leylines are now Dust Shop items with the same effects.',
      'Your old perks carry over: the five kept perks stay bought at the rank you had, for free. Eternal Resonance and Singularity Tap were removed; every bit of dust you spent on them is refunded to your balance. If you already own Golems, you get Golem Covenant for free. The Dust Shop shows a one-time note with what was kept and refunded.',
      'Spending dust still never lowers your production: the dust bonus counts all dust you have earned. Transcending (and beginning a Chronicle) empties the Dust Shop along with your dust, and both confirm panels now say so.',
      'Buying Golems now needs Golem Covenant (Ascension 5). Golems you already own keep working.'
    ]
  },
  {
    version: '4.0.0',
    date: '2026-10-06',
    title: 'The Chronicle: a third prestige layer',
    changes: [
      'New Chronicle tab (Meta group). Once Transcends slow down, begin a Chronicle: at 12 Transcends with all seven Seals of Transcendence lit, or at 24 Transcends without them (after your first Chronicle, 12 is always enough). The panel lists exactly what starts again and what you keep before you confirm.',
      'A Chronicle starts your run, shop upgrades, Cosmic Dust, God Perks, Fracture Shards, the Shard Tree and your Transcend count again (back to 14 generator tiers). You keep everything else: talents, records, the Codex, the Tower, Excavation, Garden, Alchemy, Guild, Bazaar, gold and sand. Wardens and Garden breeding stay unlocked, and your Transcend achievements and talent stars count every Chronicle.',
      'Chronicle Pages: 3 for a Chronicle at 12 Transcends, +1 for every 2 Transcends past that. Every Page you have ever earned gives ×1.4 Aether for good; spending them never lowers it. Spend Pages on six permanent Page upgrades, such as Bookmark (keep Auto-Ascend through a Chronicle) and Ink of Memory (start each Chronicle with 2 Fracture Shards).',
      'Chapter 1, Sand: your first Chronicle opens a ten-week season where Excavation digs ×3 but Aether is halved. Finishing it pays a stamp and 3 Pages.',
      'Four challenges (Dry Well, Lights Out, Small Souq, Sandstorm): side runs with special rules and a goal that pay 3–5 Pages on the first clear. Starting one sets your current run aside; it comes back exactly as it was when you finish or abandon the challenge, even across a reload. Challenges stay open after the Chapter ends, so nothing can be missed.'
    ]
  },
  {
    version: '3.7.0',
    date: '2026-10-06',
    title: 'Idle is the baseline: active play rebalanced',
    changes: [
      'This is a nerf to active income. Being at the screen earned far more than being away, which made every hour offline feel like a loss. Active play still pays more than idle, just much less: an attentive player now earns about 7 times idle instead of about 20 times.',
      'Aether Burst now grants 45 seconds of Aether production (was 2 minutes) and its cooldown is 45 s (was 30 s).',
      'Celestial Alignment is +150% Aether for 30 s (was +300%).',
      'Supernova anomalies grant 3 minutes of Aether production (was 10 minutes).',
      'Two new Golden Anomalies. Mirage (1 in 12): double Aether and double gold for 60 s. Caravan Star (1 in 20): a free large caravan sets out from the Bazaar, or, if one is already on the road, its full return is paid to you at once.',
      'Golden Anomalies now announce themselves with a notice in the corner instead of floating text.',
      'Upgrade shop retuned to match: generator upgrades are x1.2 each (were x1.25, so all five give x2.5 instead of x3) and synergies are +0.1% per building (were +0.3%). Your first Transcend now comes after about four days of casual play rather than one and a half.'
    ]
  },
  {
    version: '3.6.0',
    date: '2026-10-06',
    title: 'The Dallah: something new every day and week',
    changes: [
      'New Dallah tab (Meta group). The Daily Dallah pours a gift on your first visit of each day: +60 Chrono Sand, a ready-to-claim bonus contract and an hour of +25% Aether. Days you miss wait for you, up to 3, and claiming them pays every banked day. There is no streak: the number on the card is just how many days you have visited, and nothing is ever lost by staying away.',
      'Weekly Ledger: every Monday it sets 3 goals from things you can already do (bosses, depths, harvests, brewing, contracts and more). Each goal pays 6 Guild Seals, and finishing all three adds a stamp for the week. Progress counts from the start of the week. A week you skip costs you nothing.',
      'Souq Rotation: one friendly modifier each week, always positive and always coming back: Truffle Season (Desert Truffle grows ×1.5), Falcon Week (Tower boss gold ×1.5), Hourglass Week (Chrono Sand gained ×1.5) and Rosewater Week (every plant grows ×1.25).',
      'Seals of Transcendence: seven lamps that light for good once you reach depth 100, Tower floor 501, 25 Catalysts, 15 Ascensions, Guild Rank 7, a 1e8 Cosmic Dust Ascension and 40% of the Codex. Each lit Seal adds +1 Fracture Shard to spend in the Shard Tree at every Transcend, up to +3 (so up to 3 extra shards to spend on top of the 2 you already get). These extra shards do not raise your ×1.5 shard bonus. Seals are a bonus, not a requirement to Transcend. If you already meet a Seal, it lights the next time you open the game.'
    ]
  },
  {
    version: '3.5.0',
    date: '2026-10-06',
    title: 'The Upgrade Shop',
    changes: [
      'New on the Falafel tab: an Upgrades row above your generators. Each generator has 5 upgrades that appear at 1, 10, 50, 100 and 200 owned; each one makes that generator produce x1.25 (x3 with all five).',
      '15 click upgrades, each doubling your base click (clicks are worth your base click plus 3% of your Aether per second, times combo), and 8 synergies such as "Dallah per Shawarma": +0.3% Giant Dallah output for every Shawarma Stall you own.',
      'Tap an upgrade to see what it does, what it costs and how much Aether you are still missing. "Buy all" buys everything you can afford, cheapest first.',
      'Upgrades last for one run: Ascending (and Transcending) clears them, so every run starts the climb again. Saves from before this update start with no upgrades bought.'
    ]
  },
  {
    version: '3.4.0',
    date: '2026-10-06',
    title: 'The Contract Board',
    changes: [
      'Bounties is now a board of up to 6 guild contracts that you pick from. A new contract is posted every 30 minutes, and the board keeps filling while you are away, so you always come back to a full board. Claiming a contract no longer replaces it at once: the empty slot refills on the timer. Fast Forward does not speed the timer up.',
      'Every contract you claim counts toward Guild Rank (the old limit of one counted claim per 30 minutes is gone). A rank-up pays a Talent Point and 5 Guild Seals, up to about 48 contracts a day.',
      'Each contract has one free reroll, and contracts only come from tabs you can play. Clicking contracts are only posted while you have clicked in the last 5 minutes, so an idle board no longer jams. Contracts grow 15% per Guild Rank (up to about ten minutes of play) and pay Gold equal to 250 x difficulty x your Market Index.',
      'Contracts you already had keep working: they stay on the board and can be claimed as before (an old one that carried a Talent Point still pays it).'
    ]
  },
  {
    version: '3.3.0',
    date: '2026-10-06',
    title: 'The Shard Tree',
    changes: [
      'Fracture Shards can now be spent in the Shard Tree (Ascension tab). Nodes are permanent: Transcend never resets them, and your shard bonus still counts every shard you have earned, so spending never lowers it.',
      'Chronos branch: Auto-Ascend (2 shards) Ascends for you when the Ascension would multiply your dust by ×1.2, ×1.5 or ×2, or on a timer (10 min to 4 h). It never Ascends before the 10-minute minimum run, can be switched off, and shows one quiet notice instead of a celebration each time. Then Long Sleep (2 shards: offline Aether at 100% for 8 more hours) and Hourglass (3 shards: a 6-hour Fast Forward once a day).',
      'Tower branch: Wardens (1 shard) and Second Wind (2 shards: once per boss fight, losing to a boss refills your HP and the timer instead of pushing you back; the boss keeps the damage you dealt).',
      'Change: Wardens are now a Shard Tree node instead of opening at your first Transcend. If you have already Transcended, you keep them for free.',
      'Foundry branch: 16 Deep Blueprints, one per Transcend building tier (15 to 30), each making that tier\'s upgrades 10× cheaper. They go on sale with the building upgrade shop.'
    ]
  },
  {
    version: '3.2.1',
    date: '2026-10-06',
    title: 'Hotfix: the game loads again',
    changes: [
      'Fixed a broken update that stopped the game from loading after the Codex 2.0 release. Your save was not affected.'
    ]
  },
  {
    version: '3.2.0',
    date: '2026-10-06',
    title: 'Codex 2.0',
    changes: [
      'The Codex tab now has three sections: Achievements, Collections and the Generator Codex, with an overall Codex percentage at the top.',
      'Achievements grow from 24 to 88: every lifetime stat (clicks, Aether, play time, generators, Ascensions, Transcends, Tower floors, kills, bosses, depth, blocks, plants, potions, spells, contracts) now has a ladder of goals. Your 24 original achievements keep their +1.5% Aether each; each new rung gives +0.5%. Old saves unlock the rungs they already qualify for the next time the game runs, so expect a one-off bump and a single batched notice.',
      'Collections fill from what you have already done: Warden Trophies, Strata Relics, the Golden Herbarium, Hybrid Herbarium and Hybrid Recipes. Each finished set gives +1% Aether (8% at most across all eight sets).',
      'Generator Codex: all 30 generator tiers, shown as a silhouette until you build one. Own 100, 500 and 1000 of a tier to earn its stars and read its entry. Your best count is kept through Ascensions and Transcends.',
      'Unlock notices are batched: a burst of unlocks becomes one toast such as "12 achievements unlocked".'
    ]
  },
  {
    version: '3.1.0',
    date: '2026-10-06',
    title: 'Talent Points You Earn',
    changes: [
      'Talent points now come from things you achieve: Milestone Stars (your first Ascension, new Excavation depths, new Tower zones, your first Rose of Taif, Date Palm and Sidr Tree, 10, 25 and 50 Catalysts, and each Transcend), Record Ascensions (a point each time your best single Ascension pays ten times more Cosmic Dust than before) and Guild Rank (contracts you claim raise your rank, and each rank pays a point and 5 Guild Seals).',
      'The flat +3 talent points per Ascension and the random 20% chance of a point from a bounty are gone. Every point you already have, spent or unspent, is kept, and nothing you already reached is paid a second time.',
      'The Constellations tab shows where your points have come from and the three stars you are closest to, each with a progress bar.',
      'Until the contract board is reworked, only one claimed contract per 30 minutes (with up to 6 saved up) counts toward Guild Rank. Claiming more still pays Gold, Guild Seals and Chrono Sand as before.'
    ]
  },
  {
    version: '3.0.0',
    date: '2026-10-06',
    title: 'The Long Road (Redesign, Part 1)',
    changes: [
      'Transcend reworked: it now needs 1e9 Cosmic Dust earned since your last Transcend (x10 each time), pays 2 Fracture Shards, and every shard you have ever earned gives x1.5 Aether and x1.5 dust. The Transcend panel shows exactly what you gain and what resets.',
      '16 new buildings (tiers 15 to 30): one more opens with each Transcend. Locked tiers stay hidden until you reach them. Old saves get a refund for the previous Transcend rules.',
      'Cosmic Dust: the dust multiplier now counts all dust earned (+2% each), so spending dust never lowers it. Dust gain grows faster (exponent 1/3, was 1/4), and an Ascension needs a run of at least 10 minutes (the button shows the time left).',
      'Offline progress: 100% Aether for the first 8 hours, 50% up to 24 hours, then nothing; each Chrono Reservoir rank adds 4 hours to both. A welcome-back window shows the breakdown.',
      'Void Tower rebalanced: gear scales x1.11 per floor, bosses have x400 HP and 45 seconds. Very high floors from old saves move to the floor your gear can clear; your record floor is kept.',
      'Wardens guard every 250th floor (x3 boss HP, 60 seconds; each trophy gives +2% Tower gold). Excavation adds Strata Relics (+5% pickaxe power each), Aether Ore and Gem Polishing (5 gems into 1 of the next kind).',
      'Garden breeding: cross two grown plants into hybrids, with a 1% golden mutation and 6 hybrid recipes to discover in Alchemy.',
      'Bazaar: prices drift back toward their normal value, buying and selling has a 5% spread, stock is capped, and caravans can carry cargo (optional).',
      'Leaderboard Season 2 ranks the Tower floor under the new rules; Season 1 stays viewable.',
      'Rewards now pop up as toasts, and big moments (Ascension, Transcend, perks) get a short skippable celebration with its own sound.',
      'New look: a shared colour palette, the Inter font, clearer buy buttons that say how much you are missing, and gear rarity shown as border, symbol and word.',
      'Faster rendering and smaller images; saves now carry a version number so future updates convert them safely.'
    ]
  },
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

