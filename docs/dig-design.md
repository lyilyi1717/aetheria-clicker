# Dig: the design

**State: active** (the owner confirmed the three games on 14 October 2026: Aetheria in maintenance, the `?loop=2` core loop paused, Dig active).
**This is the one design file for the Dig prototype** (`proto.html`, `/?loop=3`, code in `proto/`).
If another file disagrees with this one, this one wins. Change the design here first, then the code.
Checked line by line against the code on `main` at `69bb0f5` (14 October 2026). **Open owner decisions: section 9.**

| File | What it is |
|---|---|
| `docs/dig-design.md` (this file) | What the game is, the levels, what is built, what is broken, what is next, what the owner must decide. |
| `proto/README.md` | How the code is laid out (for whoever writes code). Not design. |
| `docs/studies/dig-*.md` | Evidence: the studies of 13 and 14 October. What was taken from them is folded in here; a study never overrides this file. |
| `docs/dig-player-progression-study.html` | Evidence: the progression study of 13 October 2026. |
| `docs/redesign-v3.md`, `dig-pacing.md`, `dig-design-review.md`, `dig-upgrades-study.md` | History. Each carries a note that points here. |

Every line below is marked **built**, **broken** or **not built**. Nothing is described as if it exists when it does not.
Numbers are the ones in the code (`PARAMS` of each feature's `rules.js`); a param name is given so it can be checked.

---

## 1. The game in ten lines

1. You point at desert ground and your pick breaks blocks there, to a beat; no button to hold (**built**, #369). Deeper ground is harder and pays more.
2. The ground is full of things that act on each other: ore, TNT that chains, water, crystal lines, chests, bones (**built**).
3. A chest shows three relics; you take one. Two relics that fit can be fused into a stronger one, from the first minutes (**built**, #385).
4. Rafeeqs dig beside you, each hitting for 60% of your hit, and go on digging while you are away (**built**, #371).
5. Every 25 m a Big Rock blocks the whole dig. It has a glowing crack; hits on the crack count three times. TNT takes a visible bite (**built**, #386).
6. A **level** is one place with a bottom. The Big Rock at the bottom is its **Gate**. Breaking the Gate finishes the level. A Gate you fail keeps part of the damage for the next try (**built**, #375).
7. A finished level pays **Stars**. Stars are spent at the **Alqahwa**, the coffee house on the map, on three tracks: The Pick, The Camp, The Bag. That strength stays for ever (**built**, #383).
8. The next level starts on new ground. Coins, coin upgrades and their prices, hired Rafeeqs and relics start again; Stars, tracks, medals, chili pips, the Museum, the Forge, extra picks and the Rafeeqs' names stay (**built**, #366).
9. Below 100 m each layer has one law that changes how you dig (the dark, the moss, the rock that hits back, the heat). Below 200 m the ground is only deeper (**built**; no new law below 200 m is **not built**).
10. Nothing in the game waits on the clock, and nothing is lost by staying away. The level clock counts down but nothing fails at 0 (**built**, #378).

## 2. Levels: a road of twenty, fitted to the player

### 2.1 Why the road (history, 13 October 2026)

Before the road the game dealt three random cards after the fourth level, for ever. Measured then (mixed player, 30 days): 277 sites dug, only 52 new; four digs in five were a place and depth already finished; the last new thing came on day 15. Level 2 was level 1 again with more barrels, from a bare pick. The road below replaced that.

### 2.2 The rule

**The game is a road of numbered levels. Each one is built for the player who arrives at it.** Four parts:

1. **One main level at a time, in a fixed order** (**built**). The screen says "Level 5 of 20". The road deals one card, the next level, until it is finished. After two failed tries (`sites.sideAfter`) side cards (a Fast medal, a twist on a finished floor) are dealt beside it. The first four levels also pass after two tries: they are lessons. `ROAD`, `fixedNext`, `dealCards` in `proto/features/sites/rules.js`.
2. **A level starts where the player is** (**partly built**). Every level after the first starts with one free Rafeeq waiting (`sites.kitCrew`), and the coin prices start fresh: free levels are a discount, so the next purchase costs the first price (`grantFree`, #366). The pick starts bare unless Warm Pick is bought (The Pick steps 5 and 13: 50% / 70% of your best pick level, `starshop.warmFrac`). A free share of the pick for everyone (`sites.kitPick`, was 40%) was tried and taken out: it made every level about five times faster (#366, owner's fallback). **Not built:** "the first 25 m passes in about a minute".
3. **A Gate is sized by a test, not by a formula** (**built as a table**). Each road level from 5 on has its own Gate size (`sites.gateMul`, 2.3c), set so the Gate in your swings at arrival rises gently from level to level. The Gate is never made softer for a weak player; instead it remembers (2.3c), the stuck hint names the next step with numbers, and side levels and chili levels are doors. **Broken:** late learn levels still take 3 to 5 tries (fault 19, #397).
4. **A level ends** (**built**). Gate down, the finish card, the Alqahwa or the next town. Digging on below the Gate is a choice ("Keep digging"), with "Done here" to come back to the card. After level 20 the chapter card (Grandpa's bell) and chapter two (2.4); after level 40 the end card, then the deal of three cards: that is where open-ended play lives.

### 2.3 The road (built: order, lands, looks, beats, Gate table; balance in progress)

Twenty levels, `ROAD` in `proto/features/sites/rules.js`. Home (Arabia) holds the four lessons; then four levels in each land: each depth is met twice, first at a kind place to learn it, then at a harder place to prove it (`prove`: ground x`sites.proveHp` = 6, and its own Gate size).

| Level | Land | Place | Gate | Kind | The new thing (the layer the level is dug through) | Gate size (`gateMul`) | Last measured, mixed, 2 seeds (#386): tries / day |
|---|---|---|---|---|---|---|---|
| 1 | Arabia | The Dunes | 50 m | lesson | The hit, ore, TNT, the first Rafeeq, the Big Rock and its crack | formula | 1 / 10 min |
| 2 | Arabia | Powder Valley | 50 m | lesson | TNT chains; the first Stars spent | formula | 1 |
| 3 | Arabia | Valley of Beasts | 75 m | lesson | Water (50 to 75 m); bones, chests; the Museum opens | formula | 1 |
| 4 | Arabia | Golden Wadi | 75 m | lesson | Rich ore; the Forge | formula | 1 / about 30 min |
| 5 | Africa | The Dunes | 100 m | learn | Crystal lines (75 to 100 m) | 0.44 | 1 and 3 / day 1.0 |
| 6 | Africa | Powder Valley | 100 m | prove | Harder ground, harder Gate | 8.87 | 2 and 2 / day 1.2 |
| 7 | Africa | Valley of Beasts | 125 m | learn | The Black: you dig by light | 0.371 | 1 and 2 / day 1.4 |
| 8 | Africa | Golden Wadi | 125 m | prove | | 7.49 | 1 and 1 / day 1.6 |
| 9 | East Asia | The Dunes | 150 m | learn | The Living Rock: moss grows back | 0.278 | 3 and 4 / day 2.6 |
| 10 | East Asia | Powder Valley | 150 m | prove | | 7.99 | |
| 11 | East Asia | Valley of Beasts | 175 m | learn | The Angry Layer: the Rock hits back | 0.201 | 3 and 3 / day 3.6 |
| 12 | East Asia | Golden Wadi | 175 m | prove | | 6.23 | |
| 13 | the Americas | The Dunes | 200 m | learn | The Hot Layer: water against heat | 0.257 | 3 and 3 / day 4.6 |
| 14 | the Americas | Powder Valley | 200 m | prove | | 9.43 | |
| 15 | the Americas | Valley of Beasts | 225 m | learn | Deeper ground (no law of its own: **not built**) | 0.234 | 4 and 3 / day 6.0 |
| 16 | the Americas | Golden Wadi | 225 m | prove | Finishing it opens 144 beats a minute | 9.45 | |
| 17 | Europe | The Dunes | 250 m | learn | Deeper ground (**not built**) | 0.126 | 5 and 5 / day 9.2 |
| 18 | Europe | Powder Valley | 250 m | prove | | 6.37 | |
| 19 | Europe | Valley of Beasts | 275 m | learn | Deeper ground (**not built**) | 0.0645 | 5 and 4 / day 13.6 |
| 20 | Europe | Golden Wadi | 275 m | prove | The last Gate; the end card; 160 beats a minute | 4.34 | |

- **Broken:** the "New:" line on the finish card and the map names the layer *below* the Gate (level 5 says "the Black", which starts at 100 m, under its Gate). The column above is the design. Fault 21, #395.
- **Targets** (#374; balance-analyst owns them in `docs/pacing-targets.md`): every road level in 1 to 3 tries for the mixed player, with few other digs between; prove levels a little harder than the learn level before them; levels 1 to 4 inside 35 minutes; the road ends inside the window the owner picks (section 9, default day 18 to 25).
- **Measured, and where it misses:** the per-level column is from #386 (the last per-level run). The two later runs disagree on the road's end: #386 says day 12 to 14, #388 says day 20.6 and 21.0 on its own baseline. balance-analyst re-measures on today's `main` (work order 1).
- **Lands (built):** a look per land (sky, horizon, ground tint; `proto/features/look/`, #345), a beat per land (Africa djembe and shaker, East Asia taiko, wood block and bell, the Americas conga, clave and cowbell, Europe march drum, snare and bells; Arabia keeps the home kit; deeper layers lower the pitch; a sting on arriving; #344). **Nobody has listened to the land beats** (fault 15).
- **Side levels** (built): beside a level tried twice; labelled with what they pay. The two Museum places (Shark Bay, The Mirage) open when their sets are done.
- **Replays** (built, #370): any finished level can be dug again from the map, plain (for the Fast medal) or as its next chili (2.3d).

### 2.3a From one level to the next (built)

| | Built |
|---|---|
| Starts again | Coins, coin upgrades and their prices, depth, hired Rafeeqs, relics |
| Comes along | One free Rafeeq waiting (more with The Camp); Warm Pick if bought; chests in the pocket from The Bag |
| Stays | Stars and the three tracks, medals, chili pips and their hit bonus, the Gate's memory of an unfinished level, the Museum, Forge tools and metal, extra picks, the Rafeeqs' seats, names and records, wardrobe looks |
| Shown at the finish | The time against the par, Stars counted up, "You keep", "Level N starts with", the next level and its new thing, the next chili with its rules and prize, and two big buttons: **Go to Alqahwa** and **Next town** (2.5a). The one-click Spend button is gone. |

**Stars on the road (built):** a floor is worth `starsAt` (3 Stars at 50 m, x4.5 for every 25 m deeper). Past Arabia a learn level pays 0.35 of it on its first finish and the prove level 1.65 (`sites.learnPay`, `provePay`); a replay 0.25; a Fast medal 0.5 once; leaving before the Gate pays at most half of what finishing it again would pay (`sites.leaveCap`, fault 9); digging past the Gate pays a share of the extra depth when you move.

### 2.3b The countdown (built 14 October 2026, #378, #382)

A leg runs from the start (or the last Big Rock) to the next Big Rock, the last to the Gate. The level's par (`sites.parBase` 300 s at 50 m, x1.45 for each 25 m deeper) is split across the legs by their rows and adds up to the par exactly, so the Fast medal rule (`time <= par`) is unchanged. The clock shows the time left in the leg; seconds saved are banked into the next leg ("+0:12 banked"). At 0 nothing fails or expires: the clock turns soft red and counts "0:14 over", and a leg that ran over starts the next one fresh. The last 10 s tick softly; a leg ended under time flashes green. Only attended seconds count. After the Gate the clock says how long the dig took.

The countdown also sits above the manager's head (from 3 hired Rafeeqs), who shouts at the start, half, 30 s, 10 s, 0, and when a Rock breaks early or late; at 0 he sometimes (1 in 3, once per leg, `chatterBossParams.extendChance`) grants extra time (15 s or a quarter of the leg), which counts toward Fast. The roll is made in the rules (`chatterLegRoll`, a `step` hook, the core `rnd()`), the first step a leg is at 0 with 3+ Rafeeqs hired; the result is stored in the run (`run.legRoll`), so a reload cannot roll again. The manager only says his line and bumps the clock when the `legExtended` event comes. The manager is almodeer or almodeera (50/50 per site, kept in the save). Code: `siteLegs`, `legLeft`, `legExtend` in `proto/features/sites/rules.js`; `chatterTimeStep`, `chatterLegRoll`, `chatterBossExtended` in `proto/features/chatter/rules.js`.

This is the owner's countdown ("what happend to the count down i asked", 13 Oct) in the version that keeps the rule: the clock counts, nothing fails.

### 2.3c The Big Rock and the Gate (built 13 and 14 October 2026)

- **Size.** A Big Rock has 20 dirt blocks of its row in hp, +50% a layer (`boss.hp`, `layerHp`). On road levels 5 to 20 the Gate (the Rock at the level's last row) is multiplied by the level's entry in `sites.gateMul` (table in 2.3); the Big Rocks before the Gate use the formula (times `proveHp` on a prove level), and a chili level makes every Rock harder: learn levels 0.06 to 0.44, prove levels 4.3 to 9.5. Rule used to set it: Gate hp = (hits at the pick you bring) x (pick at that level), so the Gate in your swings at arrival stays in one band and prove levels sit a little above their learn level. Retune with `dig-month.mjs --dump` (`dump.gates`: the Gate, the bank and the pick at the first hit of each fight). Why: the pick grows about 10 times per road level and so does the ground; the old Gate (x1 learn, x6 prove) made the number jump between 52 000 and 8 000 000 from level to level.
- **Broken (undecided):** the multiple is applied to *every* Big Rock of a road level, not only the Gate (`bossHp` mod). Fault 18, #396; decision 9.
- **The crack** (built): hits on it count 3 times (`boss.weakMult`); it moves every 1.7 s.
- **TNT on a Rock** (built, #386): a blast whose radius plus one row reaches the Rock takes 2% of the bar (`boss.blastShare`), times the blast's size against a plain barrel; chained barrels each count. A Rock loses at most 30% to blasts (`boss.blastCap`), so TNT alone never breaks it. "BOOM -N%" and a shake.
- **Forge tools on a Rock** (built, #377): a Drill does 8 of your hits, Dynamite 16 (three times that on the crack), and one tool never takes more than 10% of a Rock (`forge.bossShare`).
- **The bar counts swings** (built, #387): "about 40 swings left, 25 s": hp left / what the whole team does per swing of yours, measured over your last 12 swings on this Rock; an estimate (pick x (1 + 0.6 x Rafeeqs that hit)) until 5 swings are seen. Exact under 20, steps of 5 to 100, two figures above. Three-layer bar with your share (gold) and the Rafeeqs' (blue). `proto/features/boss/swings.js`.
- **The Gate remembers** (built, #375): a try at the Gate of an unfinished road level (5 to 20) that does not finish banks 60% of the damage it did (`boss.gateShare`), banked as the hits land, by try and never by time; the bank never takes the Gate below 10% (`gateCap` 0.9). The next try starts cracked and a line says so. Not for lessons, replays, side levels or the deal. **Not built:** a best-try tick on the bar.
- **The stuck hint** (built, #372, #386): after a minute of play with the pick on the Gate that took under a tenth of it, or on the second try, one line says the best next step with numbers: buy The Pick ("for 12 Stars: the Rock needs 45 of your swings, not 68"), a side level that pays enough, or leave. Counted in play time. **The law comes first** (built, `dark-gate` PR): below 100 m a Rock fought in the dark (the Black, hits count 40%), a growing Rock (Living Rock, no torch near) or a hot one (Hot Layer, no water near, 60%) says so on its bar ("Too dark: break the lantern above", "Lit: full hits"), the lantern / torch crate / water above it pulses, and the stuck hint points at it before it says "buy The Pick". The laws answer through the `rockTell` mod; `bossTell(s)` reads it. The sim bot breaks a lantern above a dark Gate first.
- **Rubble** (built): each tenth of the bar pays coins and sometimes a chest or a bone.

### 2.3d Chili levels and contracts (built 14 October 2026, #388)

A finished level can be dug again up to five times, each time with one more rule on:

| Pip | Name | Rules on (they add up) | Stars (x the floor's worth) | Stays for ever |
|---|---|---|---|---|
| 1 | Mild | Rafeeqs on a tea break (half speed) | 0.5 | The old Hard medal |
| 2 | Hot | + the dark (you see one block around the hole) | 0.75 | |
| 3 | Shatta | + one kind of relic only | 1.0 | Your hit +3% |
| 4 | Fire | + the glass pick (every 60th hit the pick loses half its levels) | 1.5 | |
| 5 | Ya Mama! | no Rafeeqs at all (instead of the tea break), the dark, one relic, the glass pick | 2.0 | Your hit +5% |

- **Tougher by the pip:** ground x1.3 per pip, every Big Rock (the Gate too) x1.7 per pip (`sites.chiliGround`, `chiliRock`). The goal is always the Gate. Leaving a chili lifts the rules and the extra hardness; the Gate then pays no pip.
- **The hit that stays:** +3% at pip 3, +5% at pip 5, summed over all levels, capped at +160% (`sites.chiliHitCap`), through the pick power, so "Your hit" shows it. Old levels are a door when a wall stands.
- **Announced:** the map stone and the finish card show the next pip's rules, Stars, hit and toughness before you start; starting says what is on; a cleared pip gets a banner, a sound one note higher per pip, a flash and "Your hit +5% for ever"; the pip lights on the stone. **Not seen on a screen:** the mid-dig moment (fault 15).
- **Old saves:** a Hard medal counts as pip 1 (`pipsOf`). A chili level in play loads as it was.
- **The order is fixed** (built). **Not built** from the study: free choice of rules at pips 4 and 5, a hat at pip 2, a sticker on the pick at pip 4, a gold stone and a toast at the Alqahwa at pip 5.
- **Contracts board** (built, kept): opens after 8 finished levels (`contracts.openFinished`). Each contract's goal is a share of the deepest Gate finished (`contracts.goalShare`, never less than the old fixed number) and the dig gets a Gate at that depth, so nothing is done the moment it is taken. **Not built:** three goals per contract.
- **Sim:** the scripted player takes the next chili after a quick finish (`contracts.botChili` 0.4, 0.12 if slow) and gives up after 600 s or 1.6 times the par, but never later than 20 minutes (`botChiliCap` 1200 s, 14 Oct: at 275 m 1.6 x par was 3.8 hours of one dig, which no person sits through). By day 30 the chilies add +70% to +75% hit.

### 2.3e How the road was tuned (history, newest first)

- 14 Oct (#388, chili): road end day 20.6 / 21.0 (baseline 17.6 / 22.4).
- 14 Oct (#386, Gate table): level 7 from 4 tries and 52 min to 1 to 2 tries and 18 min; learn levels' median tries 4 to 3; road end day 17 to 22 down to 12 to 14. Late learn levels (17, 19) still 4 to 5 tries: limited by Stars (many digs between), not by the Gate; lowering the Gate further did not move them. A ground-growth pass (#389) made them harder and was closed. Next lever: the price of The Pick past step 20 (#397).
- 14 Oct (#374): deep growth per row spread out (125 m 1.19, 150 m 1.21, 175 m 1.16, 200 m 1.175 with a step of 1.8, 225 m step 2, 250 m+ step 3), `proveHp` 4 to 6. The road finished for the first time inside a month (day 19.6).
- 14 Oct (#371): one Stronger Pick; Rafeeq Training gone, a Rafeeq hits for 60% of your hit. Level 15 came 34% sooner.
- 14 Oct (#366): coin prices start fresh each level; the kit's free pick levels removed.
- 13 Oct: the start kit and prove levels (#343), twenty levels in five lands (#346), Stars paid at the prove level and leaving capped (#348). The first fourteen-level table and its measurements are in `git log -- docs/dig-design.md`.

### 2.4 Chapter Two: the road home (built 14 October 2026, ideas bank L1)

Owner: "don't change the game progress feel but increase the length". Study: `docs/studies/dig-road-length-2026-10-14.md`, option A.

**What the player sees.** Level 20 now ends chapter one, not the game: the end card says "You found Grandpa's bell" and his note ("the caravan went home the long way"), and "Walk home" deals level 21. The screen says "Level N of 20" in chapter one and "Chapter 2, level N of 20" in chapter two (`levelOf`, `sites/level.js`). Levels 21 to 36 walk home at night through the four lands in reverse (Europe, the Americas, East Asia, Africa: `n_europe` ... `n_africa`), then levels 37 to 40 are a new land, **the Empty Quarter** (red sand, high dunes, a far line of camels), where the caravan is found at level 40 (the hakawati's beats 21 to 40 open with the road; `story/rules.js` `CHAPTERS` uses the same zone ids; the book shows chapter two once level 20 is told). After level 40 the card "You found Grandpa's caravan", then the three-card deal as before.

**The rule (the contract other code relies on).**

| Thing | Value |
|---|---|
| Road | `ROAD = [...ROAD1, ...ROAD2]`, 40 entries `{ site, floor, zone, prove, ch }`; `CHAPTER_LEN` 20. `ROAD2` = `LAND(n_europe, 100)`, `LAND(n_americas, 150)`, `LAND(n_eastasia, 200)`, `LAND(n_africa, 250)`, `LAND(emptyquarter, 300)`, all `ch: 2`. Levels 21 to 36 are the same site, depth and learn/prove kind as levels 5 to 20, slot by slot. |
| Keys | A chapter-two level, its run and its stamp carry `ch: 2` and the key `c2:<site>:<floor>` (`siteKey(site, floor, twist, ch)`, `roadKey(f)`). Chapter-one keys never change. Twists are always chapter one. `chOf(x)` is 1 for anything without `ch`. |
| Zones | `ZONES` has 10 entries in road order: the five of chapter one, then `n_europe, n_americas, n_eastasia, n_africa, emptyquarter`. A side level's zone (`roadZone`) is read from chapter one's lands only. |
| Ground | A chapter-two run makes every block, Big Rock and Gate `sites.ch2Hp` times harder (3e12; the `row` hook and the `bossHp` mod). Coins per block are not changed: the coin pick starts from Warm Pick and is bought as in chapter one. |
| Stars | Everything a chapter-two run pays (finish, medal, replay, chili pip, leaving, digging past the Gate) is `sites.ch2Stars` times bigger (2e3, was 2e5; `worthAt(floor, ch)`). |
| Gates | Levels 21 to 36 use `gateMul` slot by slot (`gateMulOf(i)`); the Empty Quarter's four Gates are `gateMulCh2` (300 learn 7.5e-4, 300 prove 1.05, 325 learn 2e-4, 325 prove 0.2). Laws, legs and par are those of the depth: nothing new below 275 m. |
| Par and floor | Below 275 m the par grows x1.1 per 25 m (`parTop`, `parTopGrow`), not x1.45: 300 m is 9,350 s, 325 m 10,285 s. `maxFloor` 325. |
| Next town | `fixedNext` walks all 40 levels; it returns `level` (1 to 40), `of` (40), `ch`, `n` and `chOf` (the level in its chapter). The fixed card carries `ch`. |
| Old saves | Sites slice version 3: every stamp and the run in play get `ch: 1` and the dealt cards are dropped. A save that had finished level 20 is dealt level 21 at its next "Next town"; the dig in play goes on as it was. |
| Side branch | While chapter two runs, the Beyond crossroads on the map (between level 20 and 21) offers the free deal (`freeDeal`, cached in `road.free`; "Next town" still deals the road level only). After level 40 `dealCards` deals it as before. Chili pips and Museum pieces are won on chapter-two levels like any other, and never block one. |
| Looks and beats | Data only: a night look per land (`look/palette.js` `ZONE_LOOK`; a dark veil with stars and a moon over the land's props in `look/zones.js`), the Empty Quarter look; on the map one row of panels (chapter one, Beyond, chapter two). Each land at night plays its own bar (same notes, so the same hits) on its own kit 0.84 lower; the Empty Quarter plays the home bar on a tabl and clap kit; a sting per land. |

**How the two factors were set** (4 month sims, mixed player, 2 seeds; `node scripts/dig-levels.cjs <dump> --gates` now reads 40 levels and prints the Gate in swings at arrival; `dig-month.mjs --sum --ab ... --dump f.json` also dumps each variant to `f-ab<k>.json`). The player who finishes level 20 hits about 10^12 times harder than at level 5 (pick level about +70 from Warm Pick, Stars x10^5), so `ch2Hp` is of that order; `ch2Stars` near (Stars at level 20) / (Stars at level 4) keeps the player's growth through the chapter like chapter one's. Tried (ch2Hp, ch2Stars): (1e3, 3e4) and (1e3, 3e5): every Gate under one swing; (2e12, 1e5), (2e12, 2e5), (6e11, 1e5), (3e12, 2e5), (6e12, 2e5), (3e12, 1.5e5): levels 21 to 36 in 1 to 2 tries, days hardly moved by either factor. The Empty Quarter learn Gates at 0.045 / 0.032 were walls (5 to 94 M swings); at 0.003 / 0.0021 level 37 passes in 1 try and level 39 is still a wall (0.4 to 5.6 M swings), so levels 39 and 40 were lowered to 4e-4 and 0.2 **without a sim** (the session's four sims were used).

**Measured before the balance pass** (`3e12, 2e5`, Empty Quarter at 0.003 / 1.05 / 0.0021 / 1.0; seed 1 / seed 2): levels 1 to 20 unchanged, day for day. Levels 21 to 38 in 1 to 2 tries with 1 to 5 other digs (one 14: level 24, seed 2); level 38 on day 23.4 / 15.4; levels 39 and 40 not finished in 30 days. The Gate in swings at arrival is near chapter one's at levels 21, 22, 34 and 35 and far lower at levels 24 to 31 (5 to 1,700 against 8,000 to 270,000): **the middle of chapter two is too easy**. Stars by day 30: 48 T (was 0.8 B; fault 12 grows). On `main` as merged (Empty Quarter learn Gates 4e-4 and 0.2 unmeasured): road end day 24.2 / never (seed 2 never finishes level 39), Stars by day 30 68 T.

**Balance pass (14 October 2026, 4 sims, mixed, 2 seeds; `docs/pacing-targets.md` has the 40-level table).**
- **What sets the days in chapter two is the Stars, not the Gate.** A chapter-two level is finished in 1.5 to 5 attended minutes (level 37: 90 s against a 9,350 s par), so the days are the count of digs. Raising the Gate x2 to x4,500 at levels 21 to 36 (to match chapter one's swings at arrival) moved the road end by 0.4 to 0.6 days and left almost every level at 1 to 2 tries. Lowering `ch2Stars` from 2e5 to 2e3 makes the player earn the next level again: chapter two takes 7.6 to 8.4 days, like levels 5 to 20.
- **Tried** (road end seed 1 / seed 2; Stars by day 30): `2e5` with the bot fixes and Gates matched to the swings 18.4 / 18.6, 490 P; `2e4` 21.6 / 19.0, 163 T; **`2e3` 21.0 / 19.0, 2.1 T** (with the slot table), 20.0 / 18.4 and 20.2 / 20.6 with the bigger Gate tables. Kept: `2e3` with the slot table (the bigger tables did not make fights longer).
- **The sim's player, two habits fixed** (`sim/proto/player.mjs`, `contracts.botChiliCap`): it leaves a chili after at most 20 minutes (before: 1.6 x par, 3.8 hours at 275 m; seed 1 lost days 14 to 20 in one chili-4 dig); and in chapter two it goes back to a level it left after 3 other digs (before: only once its Stars had grown by half, which the chapter-one side cards beside a chapter-two level never pay, so seed 2 dug 90 side cards and never came back to level 39). Levels 1 to 18 are unchanged day for day; levels 19 and 20 of seed 1 come 1.4 to 1.8 days sooner.
- **Measured** (`2e3`, slot table, Empty Quarter 7.5e-4 / 1.05 / 2e-4 / 0.2): levels 21 to 40 in 1 to 3 tries, other digs 1 to 6 (one 15: level 27, seed 2); **road end day 21.0 / 19.0**; Stars by day 30 1.9 T / 2.3 T (median 2.1 T: x30 less than `main`, still x2,600 the 0.8 B of the road without chapter two).

**Open** (balance-analyst next pass; builder for the rules):
- **Deep Gates the player cannot hurt (levels 27 to 40).** With `2e3` the player falls behind chapter one's Gate from level 27 on: the Gate in swings at arrival is x10 to x20 chapter one's at levels 27 to 30 (175 k to 2.3 M against 9 k to 137 k), at levels 31 to 36 the player never hits the Gate in the winning try, and the Empty Quarter learn Gates read 1.6 G and 11 G swings. They still fall in 1 to 3 tries, to TNT (30% a try) and the Gate's memory; the fight at levels 37 and 39 lasts 21 to 24 minutes whatever the Gate's size (7.5e-4 and 3e-3 gave the same fight to the second). The fix is a Gate size per chapter-two level (`gateMulCh2` with 20 entries, a two-line change in `gateMulOf` and `test_proto_rocks.js`), predicted values in `docs/pacing-targets.md`; one sim, and the road end will move earlier, so `ch2Stars` may need to go down with it.
- **Stars by day 30 (fault 12) cannot reach x10 by numbers alone.** Chapter two needs the player's hit to grow about x10^12 over 20 levels, as in chapter one; the hit grows about as Stars^1.9 (measured: levels 21 to 36, hit x3e11 for Stars x1.3e6), so the Stars must grow about x10^6 from the 1.5e7 a player has at level 20. With the free deal after level 40 on chapter-one ground at 350 to 400 m (`starsAt(400)` = 4.1e9 a floor) the month ends at T. Owner decision: accept T-sized Stars after chapter two, or a rule (for example Stars won in chapter two shown and spent as their own coin).
- **Side cards beside a stuck chapter-two level** are chapter-one twists (`card(..., twist)` is always chapter one) and pay about 2,000 times less than the level: no help to a stuck player. Builder: deal chapter-two side cards beside a chapter-two level.
- Not built from the study: the caravan Museum set of 20 pieces on the map; a sparser night bar; tempo slower in the Empty Quarter (it would change the hits).

## 2.5 The screen (built 13 and 14 October 2026)

- **Always on screen:** the dig; one small pill (Stars, your hit); three round buttons: **Map**, **Sound** (mute) and **Settings** (gear: Volume, Music and Effects sliders, sound on/off, the share-play-times switch; levels kept on the device; #381). There is no Auto dig button: the pick always digs where you point (#369). The **level track** above the dig: level name, the countdown, medals, a node per 25 m Big Rock and the Gate; in a Rock fight its segment shows its health. The pinned goal (this level's Gate, the Second Pick, a Museum set) sits on the track's goal line (#350). The Rock's bar sits on the Rock and nothing is drawn on top of it (#367, #373).
- **One drawer** right of the dig with icon tabs: Shop, Camp (Rafeeqs), Relics, Museum, Forge, Level. Star upgrades are bought at the Alqahwa, not in the drawer. Each tab starts with one "Next:" line and one main button. A dot shows only when something is really ready. A locked tab says what opens it, never a time. Panels do not fold (#368). `proto/ui/drawer.js`, `drawerlogic.js`.
- **The world map** (`proto/features/worldmap/`): numbered stones per land with medal and chili pips, the digger walks the path, "Dig here" starts the next level; finished stones offer a replay and the next chili; side levels branch off a stuck level; Museum places are islands; each stone shows its Museum set with found and missing pieces; after level 20 three paths fan out; the Alqahwa is a town on no road.
- **Sound test page:** `proto/soundboard.html`.
- **Not built:** the depth ruler labels and the beat strip folded into the dig.

## 2.5a Alqahwa, and what happens after a dig (built 14 October 2026, #383, #384)

- **Alqahwa is the Star shop.** A Gulf coffee house, a town on the map (always there). Inside (`proto/features/worldmap/alqahwa.js`) the hired Rafeeqs in their own hats and colours, and the manager (almodeer drinks tea, almodeera drinks matcha behind her burqe3), walk, sit, sip and chat. The menu board holds the three Star tracks. A Wardrobe door opens the Camp tab. It animates only while open.
- **After a dig** the finish card has two big choices: "Go to Alqahwa" and "Next town". Alqahwa's Back returns to the same card; it also has its own Next town button.
- **Next town** opens the map; the digger walks to the next stone and the level opens by itself when the road shows exactly one card (a click skips the walk). With side cards or the deal of three the player chooses. `worldmap/flow.js`.
- **Done here:** after "Keep digging" below the Gate, a gold "Done here" button in the track's top line and in the site panel reopens the same finish card (rebuilt from the run after a reload).
- **Buy all (N):** in the coin shop and on the Alqahwa's board, a gold button when more than 5 purchases are affordable at once (`BUY_ALL_MIN` 6). It buys cheapest first through the normal buy rules, so it equals clicking one by one; one toast lists what was bought. `proto/features/shop/buyall.js`.
- **Mid-dig:** the Map button and an Alqahwa button on the site panel let you shop at any time.

- **The hakawati (N5, built 14 October 2026, `proto/features/story/`).** An old storyteller sits on a cushion in Alqahwa (drawn in the Rafeeq style). The legend is "Grandpa's lost caravan": every road level passed unlocks one beat of three short lines with a clue tied to its land (Arabia, Africa, East Asia, Americas, Europe; one chapter title per land), level 20 ends chapter one: Grandpa's brass bell and a note, "Not here! Go home by the night road" (the bell swings and rings). Chapter two (levels 21 to 40, the road home at night, then the Empty Quarter) is drafted in `story/strings.js` and appears in the book when the road reaches it; the caravan is found at level 40 (the camels walk across the room). On entering Alqahwa he tells the newest beat he has not told (bubble, Next or Skip); a level lost once or twice gets one more line ("Grandpa failed that Gate twice too..."). A **Story** button (and clicking him) opens the book: all chapters, unlocked beats can be read again, unread ones carry a New mark. An old save with levels already finished is told only the latest beat; the rest wait as New in the book. The finish card shows "The hakawati has a new story at Alqahwa." when there is one. State `story: { read, lost }`. Chapters are data per road level (`STORY_BEATS`, strings `st_<level>_<n>`), so a longer road needs only new strings. Words only, no number changes.

## 2.6 The Rafeeqs as characters (built 13 and 14 October 2026)

All of it is flavour: nothing here changes how strong a Rafeeq is.
- **Seats** (`proto/features/rafeeqs/`): eight lasting seats with a trait (Eager, Sleepy, Joker, Careful, Proud, Hungry), a friend, sometimes a rival, and a life record. Each level deals every seat a fresh nickname from 61 (each with its own trait line, Arabic script kept in the data), unless the player renamed the seat by hand (#363). The finish card names the Rafeeq of the level; the away summary uses names.
- **The manager** (#363, #378): from 3 hired Rafeeqs, almodeer or almodeera orders the crew by name, holds the countdown, naps when the pick has not landed for a while and wakes with a start. Not a Rafeeq; changes nothing in play.
- **Wardrobe** (`proto/features/wardrobe/`): Hat (14), Clothes (6), Colour (10), Cloth pattern (6), for all Rafeeqs or one, Surprise me, Undo. Starters are free; the rest are earned by play and say how; none is bought or timed.
- **Chatter** (`proto/features/chatter/`, `moods/`): idle moves by trait, a name tag, right click pats, Y cheers, bubbles for a hire, TNT, the Big Rock, a new land, the Deep, a finish; limits of one bubble per 4 s, one per Rafeeq per 14 s, 12 a minute, none in the last third of a Rock fight. "Rafeeqs talk: on/off".
- **Open:** hats thrown at a finish are a plain fez, not the worn hat; the pick digs on any mouse button (the pat swallows right click on a Rafeeq).

## 3. The systems

| System | What it does for the player | State |
|---|---|---|
| The pick and the beat | Up to four picks hit on a 16-step bar. Faster Hands (coins) goes 100 to 132 beats a minute; 144 opens for good when level 16 is finished, 160 at level 20 (`picks.tempoCap`, `tempoGate`) | built; nobody has listened to it with care |
| Coin shop | Stronger Pick (15 coins, x1.5 a level; your hit x1.25 a level; the button says the hits a block takes now and after), Hire a Rafeeq (30, x4.2, up to 8), Faster Hands, Second Pick (12,000 coins, once, for ever, after the first Rock; can be pinned as a savings goal), Lucky Sieve (after the first Rock), Buy all | built |
| Rafeeqs, Foreman, moods | A Rafeeq hits for 60% of your hit (`diggers.rafeeqShare`); every second one sieves rubble at a Big Rock; five jobs once the Foreman arrives | built; they still feel weak while you watch (fault 10) |
| TNT, water, crystal, oil, ores | Things in the ground that act on each other | built |
| Chests, relics, fusion | Pick 1 of 3; 17 recipes. The first fuse needs only level 1 + 1, and until then chests offer Hop and Twin; later an offered partner is forced onto the card after 2 chests; a new recipe then needs 2 + 2, a known one 1 + 1. Fusing lifts both halves to their top level | built |
| The Big Rock and the Gate | Section 2.3c | built; fault 18 |
| The Deep | Four layers with a law each, 100 to 200 m | built; below 200 m no law (not built) |
| The road, medals, the countdown | Sections 2.2 to 2.3b | built; late learn levels too many tries (fault 19) |
| Star tracks (at the Alqahwa) | The Pick: hit x1.5 a step, a new pick material every 4 steps (stone to star), rules on steps 1, 5, 9, 13, 17, 21, 25, 29, 33, 37. The Bag: coins x1.5 a step, 12 named perks. The Camp: 7 named perks (Rafeeqs waiting, Good Shoes, Second Kettle, the whole camp at 12). A step costs 2 Stars x1.5 per step already on that track. Third and fourth pick for 150 and 50,000 Stars after the 100 m and 150 m Rocks | built; **broken:** Camp steps between and after its perks cost Stars and do nothing (fault 17, #394) |
| Chili levels | Section 2.3d | built |
| Contracts | The board, goals that fit your road level | built |
| The Museum | 13 sets; each finished set opens a thing. Bones and bundles that still hold a piece you lack glint (an arrow points at one just below the view); the set you are collecting is drawn faintly behind the ground and fills in piece by piece; a chip counts it; every map stone shows its set (#385). A find goes to the earliest unfinished set 80% of the time and is a missing piece 75% of the time | built. **Not built:** a sure piece by the fourth bone (pity), "Museum 41%" with prizes, sets tied to two or three levels (decision 9) |
| The Forge | Drill, Dynamite, Magnet, 5 levels each, paid in metal from ore. A charge fills from blocks you break (ore counts more), never from the clock (#377) | built |
| Time away | The crew digs up to 12 hours, then sieves at a Rock; a card after 15 minutes away | built; fault 10 |
| Lessons | One message slot that queues, and a Tips list to read them again | built |
| Settings | Volume, Music, Effects, sound, play-time sharing | built |
| Player data | Section 7.5 | built; 2 players so far |
| Saves | `SAVE_VERSION` 2 in `proto/core/state.js` plus per-feature `version` + `migrate` (sites 2, diggers 3, museum 2, starshop 2); old saves load | built. **Not built:** export / import of a save, a frozen old-save test per release (decision 2) |
| Several sites at once, earned automation, a second land | `proto/features/land2/` and `autos/` are empty placeholders | not built, not planned for chapter one |
| Arabic | `t()` and `addStrings({ en, ar })` are ready; no Arabic strings yet (the nicknames carry Arabic script as data) | not built (decision 5) |
| YouTube Playables | | not built (decision 1) |

## 4. The numbers

The numbers live in the code: `PARAMS` in each feature's `rules.js`, the growth table in `proto/core/rules.js` (`core.grow`). The check is `node sim/proto/dig-month.mjs --only mixed --seeds 2 --jobs 2 --sum --dump <file>`, then `node scripts/dig-levels.cjs <file>` (one sim at a time; see `docs/agents/common-brief.md`). Targets: `docs/pacing-targets.md` (balance-analyst).

Last measured (mixed player, 2 seeds; #386 and #388, 14 October 2026):

| | Mixed (4 x 12 min a day) |
|---|---|
| First level finished | 9.7 to 10.7 min |
| Fourth level finished | day 0.3 (about 30 min of play) |
| Levels per land | 2.3 (per-level column) |
| Road finished (level 20) | day 12 to 14 (#386) or day 20.6 / 21.0 (#388): the two runs disagree; re-measure |
| Stars by day 30 | 147,000 on one seed, 241.6 million on the other |
| Hit from chilies by day 30 | +70% to +75% |
| Active and idle players | not measured since 13 October (before the road was built) |

- **Broken:** the old targets in `dig-month.mjs` (`TARGETS`: Big Rock days from before the road) fail on targets nobody wants and do not check tries per level (fault 20, #398).
- Per-metre growth: one Stronger Pick level is used up by about a metre of deep ground (x1.25 hit for x1.5 price against x1.2 a metre). The study's "steady ground, sharp Rocks" would change this (decision 9).

## 5. Bugs and open faults

| # | Fault | Seen by | State |
|---|---|---|---|
| 1 | Four Star steps had a name and no rule | study | fixed (#338) |
| 2 | Three fusions could never be made the first time | study | fixed (#338) |
| 3 | The Dhab Lizard's bone and the Bag's bone gave coins, never a Museum piece | study | fixed (#338) |
| 4 | A locked item could be bought through the rules | study | fixed (#338) |
| 5 | The Star count on the finish card took three minutes for a big prize | study | fixed (#338) |
| 6 | The track note said a step works from the next site; it works at once | study | fixed (#338) |
| 7 | The 100 m Rock took a perfect player three hours and 42 tries | sim | fixed (#337) |
| 8 | Time away counted a tea-break rush without using it up; Rock Friend paid twice | study | fixed (#341) |
| 9 | Leaving a dig unfinished paid more than finishing it again | study | fixed (#348): leaving pays at most half a replay |
| 10 | Time away was 78% of the mixed player's coins (13 Oct), so the Rafeeqs seem to do nothing while you watch | sim | open; share not re-measured since the Rafeeq hit became 60% of yours (#371) |
| 11 | The deal of three can offer the same place more than once | study | open; only after level 20 now |
| 12 | Stars reach millions by day 30 | sim | open; did **not** go away with the road (241.6 million on one seed, #388) |
| 13 | Lessons shared one message slot | owner | fixed (#356) |
| 14 | Contract hats were drawn 2 px high | study | fixed (#342) |
| 15 | Never looked at on a real screen or heard: water, crystal lines, lava, Forge tools in use, fusion twists, pick materials, the wish card, the land beats, the chili clear moment, "BOOM -N%" | team | open (screen-checker; sound needs the owner's ears) |
| 16 | The Rock bar did not show how much was left | owner | fixed (#342, #387) |
| 17 | Camp track steps between and after its named perks cost Stars and do nothing (`starshop.campShare` 0) | design-keeper | open, #394 |
| 18 | `sites.gateMul` is applied to every Big Rock of a road level, documented as the Gate only | design-keeper | done, #396 (Gate only, 14 Oct) |
| 19 | Late learn levels (15, 17, 19) still take 3 to 5 tries; Stars hold them, not the Gate | sim | open, #397 |
| 20 | The month sim's targets predate the road | sim | open, #398 |
| 21 | The "New:" line of a level names the layer below its Gate (level 5 says the Black) | design-keeper | open, #395 |
| 22 | "TNT does not work on the boss" (owner, 13 Oct) | owner | fixed (#386) |
| 23 | Text of the stuck hint, "BOOM", chili lines and every Dig string is English only | team | open; decision 5 |

## 6. Work order (next items only)

1. **Re-measure the road on today's `main`** (balance-analyst): one mixed run, 2 seeds, the per-level table of 2.3 refilled, the disagreement on the road's end settled. Done when 2.3 and section 4 carry numbers from one run on one commit.
2. **Reward and text correctness:** the Camp steps that do nothing (#394), the "New:" line one layer off (#395), the Gate multiple on every Rock (#396, settled: Gate only). Done when each issue's "done when" holds.
3. **Late learn levels** (#397) and **the sim's targets** (#398): one lever, one sim before and after. Done when levels 15, 17 and 19 take 3 tries or fewer on both seeds and `--assert` checks tries per level.
4. **Seen and heard** (fault 15): screen-checker plays the merged build through levels 1 to 5 and a chili; the owner listens once to `proto/soundboard.html`. Done when `docs/seen-on-screen.md` lists each item of fault 15 as seen or broken.
5. **Rafeeqs that matter while you watch** (fault 10): an early choice of job, and time away paying toward the pinned goal ("Saif dug toward your Second Pick: 3,400 of 12,000"). balance-analyst to set the share. Done when the away card names the goal and the sim records the away share of coins.
6. **After chapter one:** not designed. No second land, no several sites at once, until a real player has played levels 1 to 20 and wanted more.

## 7. Rules that never bend

- No gate waits on the clock. A gate is a resource, a depth, a Rock or a count. The level clock counts down but nothing fails or expires at 0.
- Nothing punishes being away. No fake scarcity. Nothing can be skipped by paying.
- Every addition changes what the player does or sees, not only a number.
- Everything that breaks ground is counted in the player's hits, so the pick is the base of all strength.
- Words a 7 year old understands. No emoji; faces and icons are drawn.
- Desktop only for now (decision 1). Old saves always load.
- A change to the economy comes with sim numbers before and after.
- Simplify by changing how a feature is used, not by removing it.

## 7.5 Player data (anonymous play times, built 14 October 2026, #379, #380)

The published page sends numbers about play, without a name, so the sims can be checked against real players. Code: `proto/features/telemetry/`; tables and functions: `supabase/dig_telemetry.sql` (applied by the owner on 14 October); reader: `sim/proto/player-stats.mjs`.

**Sent** (a random id made on the device, the game version, days since the device started):
- one row per road try that ends (finished, left, new site): site, floor, twist, road level, try number, attended and total seconds, par, depth, Gate health left, Big Rocks, Stars, coins earned, pick power, Rafeeqs, forge levels;
- one row per purchase or pick: what, the level reached, the price, coins and Stars before, the cards offered;
- about one pace sample per attended minute: depth gained, coins/s, blocks/s, hits/s, idle share;
- one row when the page hides: session length, attended time, time since the last session, offline time and coins settled.

**Not sent**: name, email, address (no IP is read or stored), the save, anything typed. Nothing is sent from `?speed=`, test, sim, `localhost` or `127.0.0.1` pages, or an automated browser, unless the address has `?telemetry=1`. The switch is in Settings and under the Tips list: Off sends nothing and drops what was waiting. Rows queue in the browser and go in small batches; offline just waits.

**Reading it**: `node sim/proto/player-stats.mjs` prints the overview and a table per road level; `--choices` what was bought and picked; `--pace` how fast people dig; `--vs dump.json` puts the sim beside the real players. A median needs 3 players; there are 2 (decision 4).

## 8. What changed, newest first

| Date | Change |
|---|---|
| 14 Oct 2026 | Chapter Two, the road home (L1, 2.4): levels 21 to 40, the four lands at night in reverse then the Empty Quarter at 300 and 325 m; `ch` and `c2:` keys, sites slice version 3, `ch2Hp` and `ch2Stars`, par held below 275 m, `maxFloor` 325; the free deal as a side branch at the crossroads; night looks and kits, the Empty Quarter look, kit and sting; a map row of 11 panels. |
| 14 Oct 2026 | The dark Gate tells you to light it (N1): bar line, pulsing lantern, hint checks the cure first. A session is now a visit: hides under 5 minutes join (N2; `visitStep`, `VISIT.gapS` 300). |
| 14 Oct 2026 | This file checked against the code at `69bb0f5`: twenty-level road table, start kit as built (no free pick levels), `proveHp` 6, the Gate's memory, the stuck hint, the Forge, settings, auto dig always on, the coin shop after the pick merge, section numbers made unique, faults 17 to 23, decisions in section 9. |
| 14 Oct 2026 | Chili levels and contracts that fit the level (#388). Early fusion and Museum pieces you can see (#385). The Rock bar counts swings (#387). TNT hurts Rocks; the Gate table `sites.gateMul` (#386). Done here and Buy all (#384). Alqahwa (#383). The clock after the Gate (#382). Settings and volume (#381). Player data (#379, #380). The countdown per leg, almodeer and almodeera (#378). Forge tools refill and hit hard (#377). The Gate remembers (#375). Road pacing (#374). Room for the Rock fight (#373). The stuck hint (#372). One Stronger Pick, Rafeeqs at 60% (#371). Replays from the map (#370). Always auto dig (#369). Panels no longer fold (#368). The Rock's bar on the Rock (#367). Prices fresh each level, the beat capped at 132 (#366). Nicknames and the manager (#363). |
| 13 Oct 2026 | Rafeeqs as characters: names, traits and records (#359), the wardrobe (#360), chatter (#361). Lessons queue (#356), last clutter folded (#357, #358). |
| 13 Oct 2026 | The drawer and the level track (#354), the world map (#352), the sound test page (#349), save for the Second Pick and pin one goal (#350), a won contract frees the site (#351). |
| 13 Oct 2026 | Stars paid at the prove level; leaving pays less; the finish card (#347, #348). |
| 13 Oct 2026 | Twenty levels, four per land; a beat and a look per land (#344, #345, #346). |
| 13 Oct 2026 | Start kit, prove levels, zones (#343). Time away counts each second once (#341). A look per place, the layered Rock bar (#342). |
| 13 Oct 2026 | The road's order built: one card at a time, side cards when stuck. |
| 13 Oct 2026 | This file made the one design file. Faults 1 to 6 fixed (#338). The 100 m wall lowered (#337). The Deep refitted (#336). Every site has a Gate (#335). Month sim limited to three workers (#334). |
| Earlier | See `git log -- proto` and the history files named at the top. |

## 9. Decisions for the owner

Asked once. If there is no answer a day after the coordinator asks, the default stands and is built.

| # | Question | Options | Default |
|---|---|---|---|
| 1 | **YouTube Playables or desktop only?** Playables runs mostly on phones; the rules say desktop only. | (a) desktop only until real players have played the road; (b) Playables now: the SDK hooks (first frame, pause, mute, cloud save) and a phone layout; (c) the SDK hooks only, behind a switch, desktop layout, phone later | **(a)**, then (c) once work order 1 to 3 is done. No phone layout until the owner says so. |
| 2 | **Dig saves.** Versions and migrations exist (`SAVE_VERSION` 2, per-feature versions). Missing: a way to copy a save out and back, and a test with a frozen save from each release. | (a) leave as is; (b) add export / import (a code to copy) and frozen old-save tests; (c) (b) plus a cloud save (needed for Playables) | **(b)** |
| 3 | **Late learn levels at 3 to 5 tries** (#397). | (a) cheaper Pick steps past step 20; (b) more Stars on learn levels (`learnPay` up, `provePay` down, same total); (c) accept it: Gate memory and chili levels are the doors | **(a)**, balance-analyst picks the number with one sim before and after |
| 4 | **Getting real players.** Telemetry needs 3 for a median; there are 2. | (a) the owner shares the page with 3 to 5 people he knows, one of them a child watched for 10 minutes; (b) an itch.io page and a short clip; (c) wait for Playables | **(a)** |
| 5 | **Arabic for Dig.** | (a) English until the road is tuned, then one pass for every string and the owner reviews it; (b) every new string gets Arabic from now on, as in Aetheria; (c) Arabic for the first five minutes only | **(a)**; strings keep going through `t()` so the pass is mechanical |
| 6 | **How long should the road take a mixed player?** | (a) about two weeks; (b) 18 to 25 days; (c) 20 to 30 days | **(b)** |
| 7 | **The Camp track** (#394). Its plain steps do nothing. | (a) each plain step raises a Rafeeq's hit by a small share of yours (balance-analyst sets it, pace moves less than 10%); (b) the Camp has only its 7 named steps, priced on those alone; (c) the Camp ends at step 12 | **(a)**: it is the track's promise, and it helps fault 10 |
| 8 | **The Gate multiple on every Big Rock** (#396). | (a) keep it on every Rock of the level, write it down, measure the middle Rocks; (b) Gate only, middle Rocks back to the formula | **Settled: (b) Gate only, 14 Oct.** The Rock at the run's floor row takes `gateMul`; the Rocks before it use the formula; the chili factor still applies to every Rock. Built in the review-fix PR. |
| 9 | **Steady ground, sharp Rocks** (fresh-eyes study 1): move difficulty from per-metre ground growth into the Rocks, so blocks stay at 2 to 6 hits. | (a) yes, as its own sim-checked package; (b) not now: fix the late levels by Stars first and decide after real-player data | **(b)** |
| 10 | **Museum sets tied to places** (fresh-eyes study 4): each set lives at two or three levels, and a missing piece is sure by the fourth bone there. | (a) both; (b) the sure piece only; (c) neither | **(b)**: a count, not a timer; no new map work |
| 11 | **Ready meter and hard-level badge on the map** (fresh-eyes study 2). | (a) both; (b) the meter only; (c) neither, the stuck hint is enough | **(b)** |
| 12 | **Accessibility and performance** (team study). | (a) a reduced-motion switch in Settings and a budget (first frame under 2 s, 60 fps with 8 Rafeeqs) checked at each release; (b) later | **(a)**, checked by release-keeper |

**Decided by building** (shown so they are not asked again; the owner can still reverse them): chili rules in a fixed order (#388); the permanent chili hit, capped at +160% (#388); the contracts board kept beside chili (#388); the names Mild, Hot, Shatta, Fire, Ya Mama! (#388); no free pick levels in the start kit, the owner's fallback (#366); always auto dig, "The owner: always auto" (#369); one design file per game, "one game desgine file" (13 Oct); the three games and their states (14 Oct).
