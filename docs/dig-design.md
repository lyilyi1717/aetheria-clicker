# Dig: the design

**This is the one design file for the Dig prototype** (`proto.html`, `/?loop=3`, code in `proto/`).
If another file disagrees with this one, this one wins. Change the design here first, then the code.

| File | What it is |
|---|---|
| `docs/dig-design.md` (this file) | What the game is, the levels, what is built, what is broken, what is next. |
| `proto/README.md` | How the code is laid out (for whoever writes code). Not design. |
| `docs/dig-player-progression-study.html` | Evidence: the progression study of 13 October 2026. Its findings are folded in here. |
| `docs/redesign-v3.md`, `dig-pacing.md`, `dig-design-review.md`, `dig-upgrades-study.md` | History. Each carries a note that points here. |

Every line below is marked **built**, **broken** or **not built**. Nothing is described as if it exists when it does not.

---

## 1. The game in ten lines

1. You hold the mouse on desert ground and your pick breaks blocks to a beat. Deeper ground is harder and pays more.
2. The ground is full of things that act on each other: ore, TNT that chains, water, crystal lines, chests, bones.
3. A chest shows three relics; you take one. Two relics that fit can be fused into a stronger one.
4. Rafeeqs dig beside you and go on digging while you are away.
5. Every 25 m a Big Rock blocks the whole dig. It has a glowing crack; hits on the crack count three times.
6. A **level** is one place with a bottom. The Big Rock at the bottom is its **Gate**. Breaking the Gate finishes the level.
7. A finished level pays **Stars**. Stars are spent on three tracks: The Pick, The Camp, The Bag. That strength stays for ever.
8. The next level starts on new ground. Coins, coin upgrades, hired Rafeeqs and relics start again; Stars, tracks, the Museum, the Forge and extra picks stay.
9. Below 100 m each layer has one law that changes how you dig (the dark, the moss, the rock that hits back, the heat).
10. Nothing in the game waits on the clock, and nothing is lost by staying away.

## 2. Levels: fitted to the player, not open ended

### 2.1 What the game does today, and why it feels wrong

| | Today (built) |
|---|---|
| The first four levels | Fixed, in order: The Dunes 50 m, Powder Valley 50 m, Valley of Beasts 75 m, Golden Wadi 75 m. |
| After the fourth | The game deals three cards at random (a deeper floor, a new place, a medal to win, a twist) and the player picks. This goes on for ever. |
| What makes a place different | Only how much of each thing is in the ground: Powder Valley has 3.2 times the TNT, Golden Wadi 2.2 times the ore, Valley of Beasts 4 times the bones. Same blocks, same colours of ground, same order of events. The five skies were never drawn. |
| How level 2 starts | With a bare pick, no Rafeeqs, no relics, on ground as hard as level 1 times 1.25. The first Star step (x1.5 on the hit) is the only thing that came along. Warm Pick, which starts you at half your best pick level, is step 5 of The Pick and costs 27 Stars in all: every Star of the first three or four levels, with nothing left for the other two tracks. |
| After the Gate | You may dig on below it with no end. |

Measured on `main` (13 October 2026, mixed player, 30 days, 2 seeds): the player digs **277 sites in a month and only 52 of them are new**. Four digs in five are a place and depth already finished. The average dig ends 15 m shallower than his best. The last new thing in the game arrives on day 15.

So the owner's words are right. Level 2 is level 1 again with more barrels, started from nothing, and from the fifth level on there is no road at all: a random deal and a pile of replays.

### 2.2 The rule (part 1 built, parts 2 to 4 not built)

**The game is a road of numbered levels. Each one is built for the player who arrives at it.** Four parts:

1. **One main level at a time, in a fixed order.** The screen says "Level 5 of 14". No random deal on the main road. **Built**: `ROAD` in `proto/features/sites/rules.js`. A level stays until it is finished; after two failed tries two side cards (a Fast medal, a twist) are dealt beside it.
2. **A level starts where the player is.** From level 2 on, nobody starts with a bare pick. Each level gives a start kit sized so the ground already learned (the first 25 m) passes in about a minute and the level's new thing is on screen inside three minutes. Warm Pick stops being a Star step and becomes how levels work.
3. **A Gate is sized by a test, not by a formula.** For every level the sim must show: a player who has spent the Stars the road has paid so far breaks this Gate within the number of tries in the table below. If he fails twice, the road offers one **side level** that pays what is missing and says so ("This pays 12 Stars: enough for the next Pick step"). The Gate itself is never made softer for a weak player; if it were, upgrades would mean nothing.
4. **A level ends.** Gate down, the finish card, spend the Stars, the next level. Digging on below the Gate stays possible but is a side choice, not the default. The road has a last level and an end card. The deal of three cards moves to after the end: that is where open-ended play belongs.

### 2.3 The road: fourteen levels to 200 m (the order is built; kits, Gate sizes and looks are not)

Each depth is met twice: once at a kind place to learn its new thing, once at a harder place to prove it. The first four levels already work this way.

| Level | Place | Gate | The new thing | Starts with | Tries | Mixed player gets here |
|---|---|---|---|---|---|---|
| 1 | The Dunes | 50 m | The hit, ore, TNT, the first Rafeeq, the Big Rock and its crack | A bare pick | 1 | 10 min |
| 2 | Powder Valley | 50 m | TNT chains; spend the first Stars | Pick at the level you ended level 1 on at 25 m; 1 Rafeeq | 1 | 20 min |
| 3 | Valley of Beasts | 75 m | Water (50 to 75 m); bones and chests; the Museum opens | Kit for 50 m | 1 | 35 min |
| 4 | Golden Wadi | 75 m | Rich ore; the Forge and its first tool | Kit for 50 m; 1 relic kept | 1 to 2 | 1 h |
| 5 | The Dunes | 100 m | Crystal lines (75 to 100 m); the first fusion | Kit for 75 m | 1 to 2 | day 1 |
| 6 | Powder Valley | 100 m | Crystal and TNT together; contracts open | Kit for 75 m | 2 | day 2 |
| 7 | Valley of Beasts | 125 m | The Black: you dig by light | Kit for 100 m | 2 | days 3 to 4 |
| 8 | Golden Wadi | 125 m | The Black, harder ground; the Foreman's jobs matter | Kit for 100 m | 2 to 3 | days 5 to 6 |
| 9 | The Dunes | 150 m | The Living Rock: moss grows back | Kit for 125 m | 2 to 3 | days 7 to 9 |
| 10 | Powder Valley | 150 m | Moss against blasts | Kit for 125 m | 2 to 3 | days 10 to 12 |
| 11 | Valley of Beasts | 175 m | The Angry Layer: the Rock hits back | Kit for 150 m | 2 to 3 | days 13 to 16 |
| 12 | Golden Wadi | 175 m | The Angry Layer, harder ground | Kit for 150 m | 3 | days 17 to 20 |
| 13 | The Dunes | 200 m | The Hot Layer: water against heat | Kit for 175 m | 3 | days 21 to 25 |
| 14 | Golden Wadi | 200 m | The last Gate. The end card of chapter one. | Kit for 175 m | 3 | days 26 to 30 |

- "Kit for 75 m" means: pick level, Rafeeqs and coins that put a player at the 75 m Rock of this place in about the time level 1 takes to reach its first Rock. The exact kit per level is a number to tune with the sim, not to guess here.
- **Side levels** sit beside the main one, always optional, each labelled with what it pays toward: a Fast or Hard medal on a finished level, a twist, and the two Museum places (Shark Bay, The Mirage) once their sets are done.
- The time column is a target for the mixed player (four 12 minute visits a day). An active player may run ahead; nothing holds him back by the clock.
- Places for levels 5 to 14 reuse the four built ones. Each needs its own sky and ground colours before the road feels like travel (not built).

### 2.3a How the built road plays (sim, mixed player, 2 seeds, 13 October 2026)

| Level | Finished | Tries | What it shows |
|---|---|---|---|
| 1 to 4 | 8, 15, 28, 33 min | 1 each | As designed. |
| 5 (Dunes 100 m) | day 1.0 | 3 | Fits. |
| 6 (Powder Valley 100 m) | day 1.2 | 1 | **Too easy.** A player who broke the 100 m Gate once breaks it again in five minutes. |
| 7 (Beasts 125 m) | day 2.0 to 2.4 | 3 to 4 | Fits. |
| 8 (Golden Wadi 125 m) | day 2.0 to 2.6 | 1 to 2 | Too easy. |
| 9 (Dunes 150 m) | day 3.4 to 3.6 | 3 to 4 | Fits, but days early against 2.3. |
| 10 (Powder Valley 150 m) | day 3.6 | 1 | Too easy. |
| 11 (Beasts 175 m) | day 5.2 to 5.4 | 4 | One try over. |
| 12 (Golden Wadi 175 m) | day 5.4 to 5.6 | 1 | Too easy. |
| 13 (Dunes 200 m) | day 17.4 to 18.4 | 8, with about 100 other digs between | **A cliff.** Twelve days at one Gate. Lowering the 200 m step from 8 to 2 still leaves 50 to 66 digs, so the wall is in the Hot Layer itself, not in the step. |
| 14 (Golden Wadi 200 m) | same day as 13 | 1 | Too easy. |

Three things to do, in this order: make the second level of each depth a real test (harder ground or a rule of its own, so "prove it" means something); bring level 13 down to three tries; then stretch levels 5 to 12 toward the days in 2.3, which the start kit and the Star prices decide.

### 2.3b Built on 13 October: the start kit, prove levels, zones

- **Start kit (built):** every site after the first starts with the pick at 40% of your best pick level (Warm Pick raises it to 50% / 70%) and one free Rafeeq waiting (not counted as hired). `sites.kitPick`, `sites.kitCrew`.
- **Prove levels (built):** a level marked `prove` in `ROAD` has ground and a Gate 4 times as hard (`sites.proveHp`).
- **Zones (built, data only):** the road is cut into continents: Arabia (levels 1 to 4), Africa (5 to 7), East Asia (8 to 10), the Americas (11 to 12), Europe (13 to 14). `ZONES`, `roadZone(s)`, `roadIndex(s)`. Inside a zone the levels go from learn to prove. A look and a beat of its own per zone come next.
- **The Hot Layer** grows 1.17 a row, was 1.20.

Sim after (mixed, 2 seeds): levels 1 to 4 in 29 min; level 5 day 0.6 to 1.0 (2 to 3 tries); level 7 day 3.2 to 3.4 (5 to 6 tries); level 9 day 5.4 to 6.4 (4 to 5); level 11 day 8.4 to 8.6 (4 to 5); level 13 day 15 to 18 (6 to 7 tries, 57 to 76 digs, was about 100); levels 8, 10, 14 still take one try. Open: the levels right after a big first-finish payout are still easy, because that payout buys several Star steps at once; level 13 is still the longest wait.

### 2.3c Built on 13 October: four levels in each land, a beat and a look per land

- **The road is twenty levels:** Arabia (home, the four lessons, 50 and 75 m), then four in each land: Africa (100, 125 m), East Asia (150, 175 m), the Americas (200, 225 m), Europe (250, 275 m). In each land the first level of a depth teaches it and the second proves it (harder ground and Gate). This replaces the fourteen-level table in 2.3 for the order; the table's columns still describe the depths.
- **A beat per land (PR #344):** each land has its own sound kit (Africa djembe and shaker, East Asia taiko, wood block and bell, the Americas conga, clave and cowbell, Europe march drum, snare and bells) and its own bar for 1 to 4 picks; Arabia keeps today's sounds. The deep layers lower the kit's pitch. A short sting plays on arriving in a new land. Nobody has listened to it yet.
- **A look per land (PR #345):** sky, horizon and ground tint per land; the arrival banner names the land and the level in it; the road strip is grouped by land.
- **Walls below 175 m softened:** Hot Layer 1.15 a row (was 1.17), below 200 m 1.18 a row and a step of 3 (was 1.22 and 8).

Sim (mixed, 2 seeds, 30 days): levels 1 to 12 (Arabia, Africa, East Asia) by day 7; level 13 (Americas 200 m) day 11 to 12, 5 tries; level 15 (225 m) day 20 to 21, 6 tries and about 75 other digs; Europe not reached in a month. Open: level 15 is the new long wait; the prove levels right after a learn level still often take one try.

### 2.3d Built on 13 October: Stars at the prove level, leaving pays less, the finish card

- **A depth pays most when it is proved:** past Arabia, the learn level of a depth pays 0.35 of its Stars and the prove level 1.65 (`sites.learnPay`, `provePay`); the total is the same as before.
- **Leaving early** pays at most half of what finishing that level again would pay (`sites.leaveCap`). Fault 9.
- **The finish card (PR #347)** shows what you keep, what the next level starts with, the next level and its new thing, one Spend button for the cheapest Star step, and an end card after level 20.

Sim (mixed, 2 seeds, 30 days): levels 1 to 12 by day 7 to 8; level 13 (Americas 200 m) day 11 to 13; level 14 now takes 1 to 4 tries; level 15 (225 m) day 19 to 22. Prove levels 6, 8, 10, 12 still mostly fall in one try: the learn level before them is where the player grows. Raising `proveHp` further is the next lever if that feels too easy in play.

### 2.4 From one level to the next

| | Built today | The design |
|---|---|---|
| Starts again | Coins, coin upgrades, depth, hired Rafeeqs, relics | The same, but replaced by the level's start kit |
| Stays | Stars and tracks, medals, the Museum, Forge tools and metal, extra picks, the Foreman | The same |
| Shown at the finish | Stars counted up, two buttons | "You keep" and "Level N starts with", then one obvious Star purchase, then the next level's card with its new thing named |

## 2.5 The screen (built 13 October 2026)

- **Always on screen:** the dig; one small pill (Stars, your hit); three round buttons (Map, Auto dig, Sound); the **level track** above the dig: level name, the countdown, medals, a node for each 25 m Big Rock and the Gate at the end; during a Rock fight that Rock's segment shows its health in three layers. The pinned goal chips (the Gate, Second Pick, a Museum set) sit on the track's goal line.
- **One drawer** right of the dig with icon tabs: Shop, Rafeeqs, Relics, Museum, Forge, Level (the Stars tab is gone: Star upgrades are bought at the Alqahwa, 2.5a). Each tab starts with one "Next:" line and one main button. A dot shows only when something is really ready and clears when the tab is opened. A locked tab says what opens it, never a time. `proto/ui/drawer.js`; a panel may set `tab:`.
- **The world map** (`proto/features/worldmap/`): after a finish, Next opens a road map of the five lands and Beyond: numbered stones with medal pips, the path draws, the digger walks, "Dig here" starts the next level; side levels branch off a level you are stuck on; Museum places are islands; after level 20 three paths fan out. Only levels the rules deal can be started. The old card list is the fallback.
- **Sound test page:** `proto/soundboard.html` (every sound and beat by axes, speed, land, depth).
- Not folded yet: the depth ruler labels and the beat strip on the dig.

**The clock counts down, one leg at a time (14 October 2026).** A leg runs from the start (or the last Big Rock) to the next Big Rock, the last to the Gate. The level's par is split across the legs in proportion to their rows and adds up to the par exactly, so the Fast medal rule (`time <= par`) is unchanged. The clock shows the time left in the leg; seconds saved are banked into the next leg ("+0:12 banked"). At 0 nothing fails or expires: the clock turns soft red and counts "0:14 over", and a leg that ran over starts the next one fresh. The last 10 s tick softly. A leg ended under time flashes the clock green. The countdown also sits above the manager's head (from 3 Rafeeqs), who shouts about it at the start, half, 30 s, 10 s, 0, and when a Rock breaks early or late; at 0 he sometimes (1 in 3, once per leg) grants extra time (15 s or a quarter of the leg), which counts toward Fast. The manager is almodeer or almodeera (50/50 per site, kept in the save), each with her or his own lines. Code: `siteLegs`, `legLeft`, `legExtend` in `proto/features/sites/rules.js`; `chatterTimeStep` in the chatter feature.

## 2.5a Alqahwa, and what happens after a dig (built 14 October 2026)

- **Alqahwa is the Star shop.** A little Gulf coffee house, a town on the world map (always there, on no road; `proto/features/worldmap/`). Inside (`alqahwa.js`) the hired Rafeeqs, in their own hats, clothes and colours, with their names, and the manager (almodeer drinks tea, almodeera drinks matcha behind her burqe3) walk, sit on cushions, sip and chat, with relaxed lines. The menu board under the room holds the three Star tracks (The Pick, The Camp, The Bag) with the same rules and prices as before. A Wardrobe door opens the Rafeeqs tab. It animates only while open.
- **After a dig the finish card has two big choices:** "Go to Alqahwa" (buy upgrades) and "Next town". Alqahwa's Back returns to the same card; it also has its own Next town button. The one-click Spend button on the card is gone.
- **Next town** opens the map, the digger walks from the finished stone to the next, and the next level opens by itself when the road shows exactly one card (a click skips the walk). With side cards or the deal of three the player chooses on the map. Rules in `worldmap/flow.js`.
- **Mid-dig:** the town on the map (the Map button) and an Alqahwa button on the site panel let you shop at any time; buying rules are unchanged.

## 2.6 The Rafeeqs as characters (built 13 October 2026)

All of it is flavour: nothing here changes how strong a Rafeeq is.
- **Seats (`proto/features/rafeeqs/`):** eight lasting seats. A seat has a name (rename on the card), one of six traits (Eager, Sleepy, Joker, Careful, Proud, Hungry), a friend, sometimes a rival, and a life record (blocks, coins, best find, levels). The crew is cleared at every new site, so identity goes with the seat number. A row in the Rafeeqs tab opens the card; the finish card names the Rafeeq of the level; the away summary uses names.
- **Wardrobe (`proto/features/wardrobe/`):** in the Rafeeqs tab: the Rafeeq drawn large, arrows for Hat (14), Clothes (6), Colour (10) and Cloth pattern (6), a switch "All Rafeeqs / This Rafeeq", Surprise me, Undo. Starters are free; the rest are earned by play (contracts, Museum sets, levels finished, medals, reaching the Deep) and say how; none is bought or timed. Contract and Museum hats are items here.
- **Chatter (`proto/features/chatter/`, `moods/`):** idle moves by trait, a name tag when the pick rests on a Rafeeq, right click pats, Y cheers, short bubbles for a hire, TNT, the Big Rock, a new land, the Deep and a finish, friends high-five and take tea, rivals flex. Limits: one bubble per 4 s, one per Rafeeq per 14 s, 12 a minute, none in the last third of a Rock fight. "Rafeeqs talk: on/off" in the Rafeeqs tab.
- Open: hats thrown at a finish are a plain fez, not the worn hat; the app digs on any mouse button (the pat swallows right click on a Rafeeq); looks are not counted by the timeline sim.

## 3. The systems

| System | What it does for the player | State |
|---|---|---|
| The pick and the beat | Up to four picks hit on a 16-step bar; tempo upgrades | built; nobody has yet listened to it with care |
| Coin shop | Stronger Pick, Rafeeqs, Faster Hands, Second Pick | built; Second Pick (12,000 coins) is rarely bought early because cheap upgrades eat the coins |
| Rafeeqs, Foreman, moods | Helpers; five jobs once the Foreman arrives | built; feel weak while you play (section 5) |
| TNT, water, crystal, oil, ores | Things in the ground that act on each other | built |
| Chests and relics, fusion | Pick 1 of 3; 17 recipes. The first fuse is taught and needs only level 1 + 1; the first chest offers Hop and Twin, and a later chest puts a partner on the card (a new recipe then needs 2 + 2, a known one 1 + 1). Fusing lifts both halves to level 3 | built |
| The Big Rock | The wall every 25 m; the crack | built |
| The Deep | Four layers with a law each, 100 to 200 m | built |
| Levels, medals, the stopwatch | Section 2 | the fourteen levels in order are built; start kits, Gate sizes, the end card are not |
| Star tracks | The Pick, The Camp, The Bag: x1.5 a step, named rules on 29 steps | built |
| The Museum | 13 sets; each finished set opens a thing. Pieces can be seen and chased: bones and bundles that still give a piece glint (an arrow points at one just below the view), the set you are collecting is drawn faintly behind the ground and fills in piece by piece (a finished set glows), a chip in the sky counts it, and every level on the world map shows its set with found and missing pieces and names what finishing it opens | built |
| The Forge | Drill, Dynamite, Magnet | built |
| Contracts | Hard rules for the Hard medal | built |
| Time away | The crew digs up to 12 hours, then sieves at a Rock | built; the sums are wrong in two places (section 5) |
| Several sites at once, earned automation, a second land | | not built, and not planned for chapter one |
| Arabic | | not built |

## 4. The numbers

The numbers live in the code: `PARAMS` in each feature's `rules.js`, the growth table in `proto/core/rules.js`.
The check is `node sim/proto/dig-month.mjs` (one at a time, three workers at most).

Measured on `main` on 13 October 2026 (30 days, 2 seeds; median):

| | Active (90 min a day) | Mixed (4 x 12 min) | Idle (2 x 4 min) |
|---|---|---|---|
| First level finished | 10.0 min | 8.6 min | 10.3 min |
| Fourth level finished | 0.6 h | 10 h | day 2.3 |
| 100 m Rock down | 1.2 h | 19 h | day 3.8 |
| 125 m Rock down | day 2.0 | day 2.5 | day 10 |
| 150 m Rock down | day 3.0 | day 4.1 | day 23 |
| 175 m Rock down | day 5.0 | day 7.4 | never |
| 200 m Rock down | day 13 | day 19 | never |
| Sites dug / new ones | 518 / 52 | 277 / 52 | 40 / 21 |
| Stars earned by day 30 | 7.3 million | 3.2 million | 24,500 |
| Coins that came from time away | 51% | 78% | 58% |

Against the road in 2.3 the middle is now **too fast**: the mixed player breaks the 150 m Rock on day 4 (the road says days 10 to 12) and has seen everything by day 19. The old sim targets in `dig-month.mjs` are from before the road and nine of them fail; they are to be replaced by the "Tries" and time columns of 2.3 when the road is built.

## 5. Bugs and open faults

| # | Fault | State |
|---|---|---|
| 1 | Four Star steps had a name and no rule (Crack Finder, Falling Star, Good Shoes, Second Kettle) | fixed (PR #338) |
| 2 | Three fusions could never be made the first time (Barrel Boom, Golden Dinar, Deep Boom asked for level 3 of a relic that stops at 2) | fixed (PR #338) |
| 3 | The Dhab Lizard's bone and the Bag's bone gave coins, never a Museum piece | fixed (PR #338) |
| 4 | A locked item could be bought through the rules; only the page hid it | fixed (PR #338) |
| 5 | The Star count on the finish card took three minutes for a big prize | fixed (PR #338) |
| 6 | The track note said a step works from the next site; it works at once | fixed (PR #338) |
| 7 | The 100 m Rock took a perfect player three hours and 42 tries | fixed (PR #337) |
| 8 | Time away counts a tea-break rush without using it up, and Rock Friend is paid for time already paid | fixed (PR #341) |
| 9 | Leaving a 150 m dig unfinished pays 418 Stars; finishing it again pays 308 | fixed: leaving pays at most half a replay |
| 10 | Time away is 78% of the mixed player's coins, so the Rafeeqs seem to do nothing while you watch | open |
| 11 | A deal can offer the same place three times | open; goes away with the road |
| 12 | Stars reach millions by day 30 | open; goes away with the road (14 paid levels, not 277) |
| 13 | Lessons share one message slot; a new one wipes the last | fixed (PR #356); other features' own tips still use the plain toast |
| 14 | Contract hats are drawn 2 px high | fixed (PR #342) |
| 15 | Never looked at on a real screen: water, crystal lines, lava, Forge tools in use, fusion twists, pick materials, the wish card | open |
| 16 | The Rock bar did not show how much was left | fixed (PR #342): three layers, blue over yellow over red over an empty dark bar, with a thin gold (you) / blue (Rafeeqs) strip |

## 6. Work order

1. **Reward correctness.** Faults 1 to 6: done. Faults 8 and 9 next, each with a sim before and after.
2. **The road.** Fixed cards with a number: done. Next, from 2.3a: the second level of each depth as a real test, level 13 down to three tries. Then the start kit, the finish card that shows what you keep and what is next, the end card. Then size each Gate by the "Tries" column, and replace the sim's targets with that table.
3. **A first goal that lasts.** Second Pick shown as a savings goal after the first Rock; one pinned goal on screen (this level's Gate, a Museum set, or a fusion).
4. **Rafeeqs that matter while you watch** (fault 10): an early choice of job, and time away paying toward the pinned goal, not only coins.
5. **Looks.** A sky and ground colours per place; faults 14 to 16.
6. **After chapter one.** Not designed. No second land, no several sites at once, until a person has played levels 1 to 14 and wanted more.

## 7. Rules that never bend

- No gate waits on the clock. A gate is a resource, a depth, a Rock or a count. Timers count up and nothing expires.
- Nothing punishes being away. No fake scarcity. Nothing can be skipped by paying.
- Every addition changes what the player does or sees, not only a number.
- Everything that breaks ground is counted in the player's hits, so the pick is the base of all strength.
- Words a 7 year old understands. No emoji; faces and icons are drawn.
- Desktop only for now. Old saves always load.
- A change to the economy comes with sim numbers before and after.

## 7.5 Player data (anonymous play times)

The published page sends numbers about play, without a name, so the sims can be checked against real players. Code:
`proto/features/telemetry/`; tables and functions: `supabase/dig_telemetry.sql`; reader: `sim/proto/player-stats.mjs`.

**Sent** (a random id made on the device, the game version, days since the device started):
- one row per road try that ends (finished, left, new site): site, floor, twist, road level, try number, attended and total seconds,
  par, depth, Gate health left, Big Rocks, Stars, coins earned, pick power, Rafeeqs, forge levels;
- one row per purchase or pick: what, the level reached, the price, coins and Stars before, the cards offered (relic, site card);
- about one pace sample per attended minute: depth gained, coins/s, blocks/s, hits/s, idle share;
- one row when the page hides: session length, attended time, time since the last session, offline time and coins settled.

**Not sent**: name, email, address (no IP is read or stored), the save, anything typed. Nothing is sent from `?speed=`, test, sim,
`localhost` or `127.0.0.1` pages, or an automated browser, unless the address has `?telemetry=1`. A line under the Tips list says what
is sent and has a Turn off switch: Off sends nothing and drops what was waiting. Rows queue in the browser and go in small batches
(about once a minute and when the page hides); offline just waits.

**Reading it**: nobody reads raw rows. `node sim/proto/player-stats.mjs` prints the overview and a table per road level (players,
tries and attended minutes to finish, day, share who stopped there); `--choices` shows what was bought and picked; `--pace` shows how
fast people dig; `--vs dump.json` (from `dig-month.mjs --dump`) puts the sim beside the real players. A median needs 3 players.

## 8. What changed, newest first

| Date | Change |
|---|---|
| 14 Oct 2026 | The clock counts down to the next Rock and the Gate; nothing expires; the manager shows it, shouts about it and sometimes gives extra time; almodeera joins. |
| 13 Oct 2026 | Rafeeqs as characters: names, traits and records (#359), the wardrobe (#360), chatter (#361). Lessons queue (#356), last clutter folded (#357, #358). |
| 13 Oct 2026 | The drawer and the level track (#354), the world map (#352), the sound test page (#349), save for the Second Pick and pin one goal (#350), a won contract frees the site (#351). |
| 14 Oct 2026 | Alqahwa, the coffee house town: the Star shop moves there from the drawer; the finish card offers Alqahwa or the next town; the next level opens by itself after the walk (2.5a). |
| 13 Oct 2026 | Stars paid at the prove level; leaving pays less; the finish card (2.3d). |
| 13 Oct 2026 | Twenty levels, four per land; a beat and a look per land (PRs #344, #345); walls below 175 m softened (2.3c). |
| 13 Oct 2026 | Start kit, prove levels, zones (continents) on the road (2.3b). Time away counts each second once (PR #341). A look per place, the arrival banner, the layered Rock bar (PR #342). |
| 13 Oct 2026 | The road's order built: fourteen levels, one card at a time, side cards when stuck. Measured level by level (2.3a). |
| 13 Oct 2026 | This file made the one design file. The road of fourteen levels written (section 2). Faults 1 to 6 fixed (PR #338). |
| 13 Oct 2026 | The 100 m wall lowered: it was three hours high (PR #337). |
| 13 Oct 2026 | The Deep refitted for sites with a bottom (PR #336). |
| 13 Oct 2026 | Every site has a Gate, three medals, four fixed sites and a deal of three (PR #335). |
| 13 Oct 2026 | Month sim limited to three workers after it froze the owner's PC (PR #334). |
| Earlier | See `git log -- proto` and the history files named at the top. |
