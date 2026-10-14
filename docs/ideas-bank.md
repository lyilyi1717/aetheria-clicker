# Ideas bank

Owner: idea-scout. One row per idea, all games. Full studies live in `docs/studies/`.
Status: proposed / accepted / built / rejected / parked.

First fill: 14 October 2026, against `main` at `a5c05b5`. Every idea from the Dig studies of 13 and 14 October
(fresh-eyes, design improvements, map, UI, Rafeeq, pick and Rafeeq) and every open ask in `docs/player-log.md`,
deduplicated, plus eight new proposals (N1 to N8, researched for this bank, section 3). "Built?" was checked
in the code, not in the docs: a function or param name is given so it can be checked again.

Study keys: **FE** `studies/dig-fresh_eyes_study-2026-10.md`, **DI** `studies/dig-design_improvements-2026-10.md`,
**MS** `studies/dig-map_study-2026-10.md`, **UI** `studies/dig-ui_study-2026-10.md`, **RS** `studies/dig-rafeeq_study-2026-10.md`,
**PR** `studies/dig-pick_rafeeq_study-2026-10.md`, **N** this file, section 3. Player-log lines (D5, D46 ...) are in `docs/player-log.md`.

Problems the ideas answer (from the player log):
- **W** the wall: "map 7 is a hard wall" (D5, D42). Live data 14 Oct: level 7 median 4 tries, level 8 loses 2 of 3 players.
- **B** boring after the first map, no sense of achievement, talents need a bigger story (D46, D49, D53).
- **S** short sessions: median session 0.5 min (but see N2: the number is not what it seems).
- **E** the first 20 minutes: "diggers seams usless", "fun for the first few minits" (D52, D53).
- **C** clutter (D18, D34). **R** runaway numbers (D44 bombs, fault 12 Stars in millions). **M** the Museum on the map (D7). **H** hard mode announced (D4).

## 1. Dig: ranked

Rank = how much it moves W and B, for its cost, with the evidence behind it. The top 8 are the next things to build or decide.

| Rank | # | Idea (what the player does or sees) | Source | From game | Built? (code) | Cost | Answers | Sim number to check | Status | Date |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | N1 | **Light the dark Gate.** In the Black the Rock takes 40% of every hit unless a light is on, and nothing on screen says so. The bar says "Too dark! Your hits count less. Break the lantern above." The lantern in the row above the Rock glows and is pointed at; lit, the bar says "Lit: full hits". The stuck hint checks the light before it says "buy The Pick". Same telling for each law's Rock twist (torch at the Living Rock, water at the Hot Rock) | N (this file) | Into the Breach, Candy Crush (level 65) | **built** (branch `dark-gate`, tell first): bar line, pulsing cure, `bossAdvice` checks the law first; sim bot breaks the lantern | S | W | Share of Gate damage dealt unlit on levels 7 and 8 (sim and a new telemetry field); real level 7 median tries 4 to 3 or fewer; level 8 finish share from 1 in 3 to 2 in 3 | proposed | 2026-10-14 |
| 2 | N2 | **Count a session honestly** (measure before designing). A session today ends on every tab switch, so "median 0.5 min" is the time between alt-tabs. Join hides shorter than 5 minutes into one session; send hide count separately | N | (GameAnalytics session definition) | **built** (branch `dark-gate`): `visitStep` in `telemetry/rules.js`, hides under 5 min join; hide count not sent (needs a server column) | S | S | Real median session after the change; sessions per player per day; compare with GameAnalytics medians (D1 about 23%, D7 about 4%) once there are 3+ players per level | proposed | 2026-10-14 |
| 3 | N3 | **Help that comes with tries.** At a road Gate you lost, each new try brings one visible helper, drawn and named: 2nd try a Rafeeq with a lantern stands at the Gate (in the Black) or the crack shows where it jumps next; 3rd try two barrels sit beside the Gate; 4th try "Saif's big swing" opens the fight with a free 10%. Counted in tries, never time. The Gate itself is not changed | N | Super Mario Bros. Wii (Super Guide), Crash Bandicoot, EA DDA research | not built (the Gate's memory `boss.gateShare` 0.6 is the only help, and it is invisible until the bar) | M | W | Median tries at levels 7, 8, 15, 17, 19 at 3 or fewer; share of finishes with a helper on; road end stays in day 18 to 25 | proposed (owner decision 1) | 2026-10-14 |
| 4 | FE5, FE6 | **The wall shows its size and your best.** Ready meter on the map stone ("Your hit 1,200. This Gate wants about 3,000", green / yellow / red), and a white tick on the Gate bar where your best try reached | FE 2.1, 2.3; design decision 11 | Royal Match, racing ghosts, Clicker Heroes | not built (stuck hint `bossAdvice` is built; meter, tick, three-doors card, hard badge are not) | S to M | W | Level 7 stone red or yellow before the first try; tick only moves forward | proposed (decision 11 default: meter only) | 2026-10-14 |
| 5 | N4 | **The Alqahwa fills up with what your Stars bought.** Each named Star step puts one drawn thing in the coffee house: The Pick hangs each new pick material on the wall (stone to star), The Camp adds a cushion and a cup per seat, The Bag fills a shelf. A finished land hangs its land's flag; a pip 5 chili puts a gold stone on the counter. Talents become a room you made | N; folds FE2's pip 5 "gold stone and toast" | Homescapes, Gardenscapes, Royal Match | not built: `worldmap/alqahwa.js` draws Rafeeqs, manager and the menu board only | M | B | No economy change. Telemetry: Alqahwa visits per finished level; share of players who buy a Star step at levels 5 to 8 | proposed | 2026-10-14 |
| 6 | N5 | **The storyteller tells the road's story.** A hakawati sits in the Alqahwa. Each finished level he tells three short lines and shows one drawn panel of one legend (default: Grandpa's lost caravan, last seen under Europe); a land's last level ends a chapter; level 20 finds the caravan. Lost tries get a line too ("Even Grandpa needed four goes at the dark rock"). Read again from a book on his table | N; answers D46 "is it part of a bigger story ?" | Hades, Homescapes | not built | M | B, W | Telemetry: share who start level N+1 after finishing N, at levels 4 to 8, before and after | proposed (owner decision 2) | 2026-10-14 |
| 7 | FE9 | **The goodbye line, and the crew works on your goal.** On leaving, three "Next time" lines with distances; time away pays a share toward the pinned goal and the away card names who ("Saif dug toward your Second Pick: 3,400 of 12,000") | FE 5.1, 5.2; design work order 5 | Zeigarnik effect, Egg Inc. | not built: `away/strings.js` has totals and jokes, no goal | S to M | S, E | Away share of coins (fault 10); share of sessions that end within 1 step of a named goal | proposed (work order 5) | 2026-10-14 |
| 8 | DI1 | **Good Hit.** One loud step on the beat; a closing ring; tap Space on it and the hit counts four times; holding the mouse digs as today | DI 3.A1 | Hi-Fi Rush, Crypt of the NecroDancer | not built (no hook in `picks/`) | M | B, E | A player who never taps is no slower; one who always taps about a fifth faster; no Gate more than one try sooner | proposed | 2026-10-14 |
| 9 | N6 | **A breather after the dark.** Level 8 (prove, in the same dark) right after the level 7 wall is a double wall. Size level 8's Gate so its swings at arrival are no more than level 7's, or deal level 8 with its side level shown as "a breather" | N | Candy Crush, Royal Match (hard level, then easier ones) | not built: `sites.gateMul` 0.371 (7), 7.49 (8); `proveHp` 6 | S | W | Gate in swings at arrival, level 8 vs level 7; tries at 8 at 2 or fewer | proposed | 2026-10-14 |
| 10 | N7 | **Each land brings new finds.** Two relics and one hat that only appear from that land on, shown on the map's land panel and the finish card ("New in chests from now on: Baobab Charm") | N; leans on DI 5, DI 14 | Dome Keeper, Vampire Survivors | not built: relic pool is the same from level 1 (`relics/rules.js`, `fusion/rules.js` `when`) | M | B | Choices telemetry: share of offers of a land's new relic that are taken in that land | proposed | 2026-10-14 |
| 11 | DI3 | **The chain sings.** Each pop in a chain one note higher; "Chain 9!" counter; best chain kept | DI 3.A3 | Balatro, Peglin | not built (no chain pitch in `tnt/`, `ui/audio.js`) | S | B, E | None (no rule change); check sound cap at 2 octaves | proposed | 2026-10-14 |
| 12 | DI14 | **Africa's roots** (then one ground thing per land: bell pots, carved stones, the old mine) | DI 3.G14 to G17, DI decision 4 | SteamWorld Dig 2, Dome Keeper | not built (lands differ in look and beat only) | M per land | B | First new thing on screen within 3 minutes of level 5 | proposed | 2026-10-14 |
| 13 | FE7 | **Museum: a sure piece by the fourth bone, and "Museum 41%"** with prizes at 25/50/75/100% | FE 4.3, 4.5; design decision 10 | Melvor Idle, Vampire Survivors | partly: glint, set behind the ground, chip and stone silhouettes built (#385); pity and percent not built | S | B, M | Bones per missing piece never above 4 at a level | proposed (decision 10 default: the sure piece only) | 2026-10-14 |
| 14 | N8 | **Every lost try leaves a trophy.** A cracked chunk of a Gate you have not yet broken goes on a shelf in the Alqahwa with "38%" written on it; when the Gate falls, the chunk turns gold | N | Hades (keys and Darkness from a lost run), Rogue Legacy | not built (the bank is saved in `road.stamps`, not shown) | S | W, B | None (no rule change) | proposed | 2026-10-14 |
| 15 | D44 | **Check the bomb runaway.** "4.3e37 gold with 6 Stars" from chain bombs and chest upgrades; nothing has looked since | player log D44 | | not checked since 12 Oct | S | R | Coins per TNT chain at level 2 with boom relics at max; Stars by day 30 (fault 12) | proposed | 2026-10-14 |
| 16 | DI11 | **The story of the night.** Three named lines from what really happened, then one wrapped find in the ground you break yourself (one per return, not bigger with hours) | DI 3.E11, RS 2.10 | Mr. Mine (without its timers), Hades | partly: away card uses names and jokes (`away/`); no wrapped find, no panels | S to M | S | The find never grows with hours away | proposed | 2026-10-14 |
| 17 | DI9 | **The Book of the Dig.** Drawn stamps for feats you would tell a friend; "41 of 150" on the cover | DI 3.D9 | Cookie Clicker, Melvor Idle | not built | S to start | B | None | proposed | 2026-10-14 |
| 18 | FE3 | **Steady ground, sharp Rocks.** Blocks stay at 2 to 6 hits inside a leg; the growth moves into the Rocks | FE 1.1; design decision 9 | Motherload, SteamWorld Dig | not built | M to L | W, B | Hits per dirt block at the expected pick never above 8 on levels 1 to 15 | parked (decision 9 default b: not now) | 2026-10-14 |
| 19 | FE4 | **Shatter as the base rule.** A block under your hit bursts in one swing, the rest carries on | FE 1.2 | Clicker Heroes, Idle Slayer | partly: Punch-through is a Star step (`starshopPunch`, steps 1, 9, 21, 29); not the base rule, no burst | M | B | Hits per block at mid-leg; pace change | proposed (with FE3) | 2026-10-14 |
| 20 | DI2 | **Fever ("Yalla!").** Eight Good Hits fill a bar; the Rafeeqs hit on your beat for 32 hits | DI 3.A2 | Crypt of the NecroDancer | not built | M | B, E | Rafeeq ground share while playing 4% toward 15%; no Gate more than one try sooner | proposed (after DI1) | 2026-10-14 |
| 21 | DI6 | **A Gate with a trick per land** (Africa: the crack jumps on the drum; East Asia: plates in bell order) | DI 3.B6, DI decision 3 | Slay the Spire bosses | not built | M each | B, W | Prove levels 2 to 3 tries, not 1 | proposed | 2026-10-14 |
| 22 | DI5 | **One buried surprise per level**, same place for everyone (the long fuse, the dhab, the bus of chests) | DI 3.B5 | SteamWorld Dig 2 | not built | M per land | B | None | proposed | 2026-10-14 |
| 23 | FE2+ | **Chili leftovers:** the pip-cleared banner is covered by the finish card (#403); hat at pip 2, sticker at pip 4, free rule choice at 4 and 5 | FE 3; D4 "should announced" | Balatro stakes, Hades Pact | partly: five pips built (#388); banner hidden, hat, sticker, choice not built | S | H | Banner seen before the card opens (screen check) | proposed | 2026-10-14 |
| 24 | D7 | **Museum glow on the world map** for collected parts | player log D7 | Super Mario World | partly: grey silhouettes and "0/4" under every stone (seen on screen); no glow when found | S | M | None | proposed | 2026-10-14 |
| 25 | FE8 | **Crack marks on the block** under the pointer, one per hit left | FE 1.3 | Motherload | partly: the shop button says the hits now and after (built); no marks on the block | S | B | None | proposed | 2026-10-14 |
| 26 | DI8 | **The card tells you** ("1 more for Barrel Boom") | DI 3.C8 | Vampire Survivors | partly: Shake the Chest (Bag step 6, `starshopReroll`), a forced partner after 2 chests (`fusion.pity`); no hint on the card | S | B | Fusions made per level | proposed | 2026-10-14 |
| 27 | FE1+ | **Three goals per contract** (half way, three quarters, the Gate) with prizes shown | FE 7.1 | Egg Inc. | partly: goals scale with the deepest Gate (#388); one goal only | S | H | A player at level 9 wins at most 1 contract the day the board opens | proposed | 2026-10-14 |
| 28 | PR4 | **Rafeeq moves you press:** Pass the Pick, The Whistle (all hit your block, refills after 40 blocks) | PR 5 | Idle Miner Tycoon | partly: Crack Finder (Pick step 17) is the Crack Spotter's half; the others not built | M | E | Rafeeq ground share while playing | proposed | 2026-10-14 |
| 29 | FE10 | **First-session beat sheet** checked by the sim (a new thing every 1 to 2 minutes, the Africa pan at level 4) | FE 6 | Royal Match, Vampire Survivors | not built (no "minute of each first" in `sim/proto/`) | S to M | E | Minute of each first inside its window | proposed | 2026-10-14 |
| 30 | DI13 | **Wall of records** in the Museum (deepest, best chain, fastest level, Rafeeq of each level) | DI 3.F13 | Animal Crossing | not built (Rafeeq life records exist in `rafeeqs/`) | S, then L | B | None | proposed | 2026-10-14 |
| 31 | DI7 | **Named relic sets** (Powder Man, Water Carrier, Camp Boss) | DI 3.C7 | Brotato, Balatro | not built | M | B | Win rate per set within one try of each other | parked (adds a system; see cut list) | 2026-10-14 |
| 32 | DI4 | **Keystones:** a cracked block that drops the blocks above it | DI 3.A4 | | not built | M | B | Share of ground broken by keystones under 25% | parked (see cut list) | 2026-10-14 |
| 33 | DI12 | **A wish before you go** ("look for bones / coins / go deep") | DI 3.E12 | | not built | S | S | Every wish pays within 10% of the others | parked (see cut list) | 2026-10-14 |
| 34 | PR2 | **The Camp sells the Rafeeq share** (each plain step lifts the share) | PR 2 B1; design decision 7, #394 | | not built: `starshop.campShare` 0 | S | E | Pace moves less than 10% | proposed (work order 2) | 2026-10-14 |

### Built (kept so nobody proposes them again)

| # | Idea | Source | Where in the code | Date |
|---|---|---|---|---|
| B1 | Chili levels, five pips, +3%/+5% hit for ever, capped +160% | FE 3, DI 10, D4 | `sites` `chiliGround`, `chiliRock`, `chiliHitCap` (#388) | 2026-10-14 |
| B2 | Contracts sized to the deepest Gate | FE 7.1, D3 | `contracts.goalShare` (#388) | 2026-10-14 |
| B3 | One Stronger Pick, a Rafeeq hits for 60%; the sieve capped | PR 6, D31 | `diggers.rafeeqShare`, `sieveCap` 0.5 (#371) | 2026-10-14 |
| B4 | Rafeeq seats, names, traits, friend and rival, records, Rafeeq of the level | RS 3A, D28, D29 | `proto/features/rafeeqs/` (#359, #363) | 2026-10-14 |
| B5 | Wardrobe (hat, clothes, colour, pattern) | RS 3B, D32 | `proto/features/wardrobe/` (#360) | 2026-10-14 |
| B6 | Chatter, pat, cheer, the manager with the countdown | RS 3C, D10 to D15 | `proto/features/chatter/` (#361, #363, #378) | 2026-10-14 |
| B7 | World map, the walk, side branches, Museum islands, replays from the map | MS, D19, D35 | `proto/features/worldmap/` (#352, #370) | 2026-10-14 |
| B8 | Drawer, level track, purse pill, round buttons, dots only when ready | UI 3 | `proto/ui/drawer.js` (#354) | 2026-10-14 |
| B9 | The Gate remembers 60% of a lost try | FE 2 | `boss.gateShare` (#375) | 2026-10-14 |
| B10 | Stuck hint with numbers | FE 2 | `bossAdvice` (#372, #386) | 2026-10-14 |
| B11 | TNT and Forge tools hurt Rocks | D2, D17 | `boss.blastShare`, `forge.bossShare` (#386, #377) | 2026-10-14 |
| B12 | Museum glint, set behind the ground, set on each stone | FE 4.1, 4.2, D7 | `wing2/` (#385) | 2026-10-14 |
| B13 | Pick materials every 4 Pick steps, stone to star | FE 1.4 | `STARSHOP_MATERIALS` | 2026-10-14 |
| B14 | Countdown per leg, nothing fails at 0 | D8 | `siteLegs`, `legLeft` (#378, #382) | 2026-10-14 |

## 2. Rejected and why (so nobody proposes them again)

| Idea | Why not | Date |
|---|---|---|
| Panels that fold (UI 3.2 first version) | Built (#354, #357), then taken out (#368): folding hid the shop; the drawer with one tab open does the job | 2026-10-14 |
| A free share of the pick in the start kit (`sites.kitPick` 40%) | Made every level about five times faster (#366); owner's fallback | 2026-10-14 |
| Drop the Forge, the road hands out tools (DI cut list) | The owner asked for the Forge to matter (D17); it was made strong instead (#377) | 2026-10-14 |
| Digging below the Gate only after level 20 (DI cut list) | The owner asked for Keep digging with a Done here button (D6, #384) | 2026-10-14 |
| Make the Gate softer for a weak player | Design 2.2.3: the Gate is never softer; help comes as doors and visible helpers (N3), not a smaller number | 2026-10-14 |
| A daily task, a streak, or a gift that grows with hours away | Clock gates and punishing absence (rule 8) | 2026-10-14 |

## 3. New proposals (researched 14 October 2026)

Aimed at the two hardest open problems. Numbers read from the code on `main` at `a5c05b5`.

### What the code says about the wall at levels 7 and 8

- Levels 7 and 8 are the only two road levels whose Gate (125 m) is fought under the law of the Black: "A Big Rock is fought under the law of the layer ABOVE it" (`deep/rules.js`, header). Under that law the Rock takes **40% of every hit unless a light is on** (`law.black.mods.damage`, `rockDark: 0.4`). A light is on when a glow mushroom (lasts 25 broken blocks) or a lantern (60 blocks) was broken recently; the game puts **one lantern in one of ten columns of the row above the Rock** (`gen.row`, `d === LAYER - 1`).
- Nothing tells the player. The string `d_dark: 'Too dark!'` is defined in `deep/strings.js` and used nowhere. The stuck hint (`bossAdvice`) only knows "buy The Pick", "a side level" or "leave".
- The Gate's size (`sites.gateMul`) was tuned by a scripted player in the sim; the sim code has no mention of lanterns or lights (`sim/proto/`), so it lights the Rock only by chance (its pick or a Rafeeq happens to break the lantern, or a mushroom close by). A human who digs a narrow shaft can miss a lantern that sits in one column of ten. Then the fight is at 40% and the Gate is 2.5 times its size. Not yet measured, but it fits: 4 tries at level 7, and level 8 (ground x6, the same dark) losing two of three. The sim number in N1 settles it.
- Levels 9 and 10 repeat the pattern with the Living Rock (grows back 6% of its health per 15% taken unless a torch is within 3 rows; one torch crate above the Rock). Only one real player has reached them.
- Session length: `telemetry/ui.js` sends a session row on every `visibilitychange` to hidden. A switch to another tab ends a "session". Median 0.5 min and median time away 0.0 h say people alt-tab, not that they leave.

### The games (one paragraph each)

**Candy Crush Saga (King).** Level 65 was the level after which almost all quitting players quit; it was also the best-paying level. King's A/B tests found that making it easier lowered payments and kept players longer, and they eased it. Their designers measure each level by "time to abandon" and "time to pass", and say "crazy hard levels never pay off, at least in the long term" and "retention always wins". For Dig: a wall is fine only when the player can see why and what to do; an invisible x2.5 is the worst kind (N1, N6). [mobilegamer.biz, TechTarget]

**EA, dynamic difficulty for engagement (Xue et al., WWW 2017).** EA modelled level progress as a graph and tuned how likely a player is to pass next, based on recent results, to keep him playing. Across several EA games: up to 9% more engagement with no loss of revenue. For Dig: help after lost tries works on real players; Dig's version keeps the Gate the same and makes the help a visible thing (N3). [WWW 2017 proceedings]

**New Super Mario Bros. Wii and Crash Bandicoot.** After eight lost lives on one stage, a green block appears and Luigi can show the way (Super Guide); only for that stage. Miyamoto first had it after three and felt that was too soon. Crash Bandicoot (by its director's account) gave an Aku Aku mask after several lost lives and slowed boulders a little with each loss. Both make the help a thing you see, on that level only, earned by trying. For Dig: helpers per lost try at one Gate (N3), never on chili levels or replays. [Giant Bomb, Iwata Asks, vgfacts]

**Into the Breach.** Every enemy move is shown before it happens; the game is hard and fair because nothing is hidden. For Dig: each law's Rock rule ("Too dark: hits count less") is shown on the bar while it is in force (N1). (Game knowledge; no retention numbers.)

**Homescapes, Gardenscapes and Wildscapes (Playrix).** The match-3 levels pay stars that rebuild a house with recurring characters and a story. When Playrix shipped Wildscapes without the story and characters (a plain building loop), its day-1 retention was reported at 38%, against 68% for Homescapes. A comparison of two games, not a test, but the size of the gap is the point. For Dig: Stars should build something you can see (N4) and move a story with people in it (N5). [wnhub.io, Game World Observer, gamerefinery]

**Hades (Supergiant).** Every death sends you home, where the people have something new to say; the story moves only when you die or win. The writer's aim was to "take the sting out of failure". For Dig: the storyteller has a line for a lost try too (N5), and a lost try leaves a trophy (N8). [Inlander, ScreenHub interviews with Greg Kasavin]

**Dome Keeper.** Each win opens a new world with its own look and rules. Steam's global achievement list shows the share of all owners who got there: first relic 82%, the second world 81%, the third world 61%, the fourth world 46%. Each new world is a reason for the next run. For Dig: each land should bring something new to find, not only a new sky (N7). [Steam global achievements]

**GameAnalytics benchmarks (for scale).** Across more than 10,000 mobile games, median day-1 retention about 23%, day 7 about 4%, day 28 under 1%; the top quarter about 27% and 7 to 8%. Dig cannot be compared until a session is counted properly and there are more than 8 players (N2). [GameAnalytics via gamedevreports]

### The eight, in short (full rows in section 1)

| N | Rank | One line | Cost |
|---|---|---|---|
| N1 | 1 | Tell the player the Rock is in the dark and where the light is; the stuck hint checks light first | S |
| N2 | 2 | Count a session as one visit, not one tab focus, before designing for short sessions | S |
| N3 | 3 | Each lost try at a road Gate brings one visible helper for the next try (lantern boy, crack shown, two barrels, a big first swing) | M |
| N4 | 5 | The Alqahwa fills up with things your Star steps bought | M |
| N5 | 6 | A storyteller in the Alqahwa tells one legend, three lines per finished level, a chapter per land | M |
| N6 | 9 | Level 8 is no bigger in swings than level 7, or is dealt with its breather side level | S |
| N7 | 10 | Each land adds two relics and a hat to the chests from then on | M |
| N8 | 14 | A lost try leaves a cracked chunk with its percent on an Alqahwa shelf; it turns gold when the Gate falls | S |

### Decisions only the owner can make

| # | Question | Default |
|---|---|---|
| 1 | **Help with tries (N3).** It does not shrink the Gate but it makes the next try easier. Allow it on road levels? | Yes, from the 2nd lost try at the same Gate, road levels 5 to 20 only, not on chili levels, replays or side levels; a Fast medal still counts |
| 2 | **The story (N5).** What is the road looking for? | Grandpa's lost caravan, last seen under Europe; found at level 20. Words a 7 year old knows, Gulf humour from the storyteller |
| 3 | **Light the Rock (N1): tell only, or also make the lantern sure?** | Tell first (S, no economy change); if real tries at 7 stay above 3, put the lantern in the column the player is digging |
| 4 | **Session measure (N2).** How long a hide still counts as the same visit? | 5 minutes |
| 5 | **The Alqahwa room (N4): one thing per named step, or per step?** | Per named step and per pick material (about 30 things in all), drawn shapes, no new art style |

### What to cut or fold

- Fold N1 into the stuck hint: one hint, which checks light (or torch, or water) before money.
- Fold FE5's "three doors" card into the stuck hint as well; build only the ready meter and the best-try tick (rank 4).
- Fold the chili pip 5 "gold stone and toast" (FE 3) and N8's trophies into the Alqahwa room (N4): one place where achievement is shown.
- Fold DI11's night story into the storyteller (N5) later: the storyteller can tell what the crew did while you were away.
- Hold DI7 (named sets), DI4 (keystones) and DI12 (wish before you go) until the road is tuned: each adds a system to a game the design study already called "not simple".
- Hold DI2 (Fever) until DI1 (Good Hit) has been played and felt.

### Sources

- [How King defines a good Candy Crush level (mobilegamer.biz)](https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/)
- [Customer analysis at King, level 65 (TechTarget)](https://www.techtarget.com/searchbusinessanalytics/feature/Customer-analysis-a-winning-play-for-Candy-Crush-Saga-maker)
- [Xue et al., Dynamic Difficulty Adjustment for Maximized Engagement in Digital Games, WWW 2017](https://archives.iw3c2.org/www2017/proceedings/companion/p465.pdf)
- [Super Guide (Giant Bomb)](https://giantbomb.com/wiki/Concepts/Super_Guide), [Iwata Asks: New Super Mario Bros. Wii](https://iwataasks.nintendo.com/interviews/wii/nsmb/0/5), [Miyamoto reflects on the Super Guide (Vooks)](https://vooks.net/miyamoto-reflects-on-the-super-guide)
- [Crash Bandicoot facts, dynamic difficulty (vgfacts)](https://www.vgfacts.com/game/crashbandicoot/)
- [Wildscapes vs Homescapes retention (wnhub.io)](https://wnhub.io/news/analytics/item-2330), [Casual match-3 meta layer (GameRefinery)](https://gamerefinery.com/casual-match3-meta-layer-new-winning-formula), [How Gardenscapes changed match three (PocketGamer.biz)](https://www.pocketgamer.biz/how-gardenscapes-changed-match-three/)
- [Greg Kasavin on deaths that drive the story (Inlander)](https://inlander.com/culture/hades-writer-greg-kasavin-on-how-he-made-video-game-deaths-drive-a-feel-good-story-22725237), [Supergiant's approach to narrative (ScreenHub)](https://www.screenhub.com.au/news-article/features/digital/jini-maxwell/hades-greg-kasavin-breaks-down-supergiants-unique-approach-to-narrative-262459)
- [Dome Keeper global achievements (Steam)](https://steamcommunity.com/stats/1637320/achievements)
- [GameAnalytics benchmarks Q1 2024](https://gamedevreports.substack.com/p/gameanalytics-benchmarks-in-mobile), [GameAnalytics benchmarks 2025](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks)
