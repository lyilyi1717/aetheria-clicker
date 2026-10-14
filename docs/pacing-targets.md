# Pacing targets

Owner: balance-analyst. Per game. A real median needs 3 or more players. Template: `docs/templates/pacing-targets.md`.

## Dig

Measured on `main` at 69bb0f5, 14 October 2026: `node sim/proto/dig-month.mjs --only mixed --seeds 2 --jobs 2 --sum --dump <file>`,
then `node scripts/dig-levels.cjs <file>`; the same with `--only active`. Values are seed 1 / seed 2. Real players:
`node sim/proto/player-stats.mjs` (8 players, median session 0.5 min: testers so far, shown but not trusted yet).

### Headline milestones

| Milestone | Target | Sim (mixed, 2 seeds) | Real median (players) | Last checked |
|---|---|---|---|---|
| First Big Rock broken | 3-5 min | 3.8 / 3.7 min | - | 14 Oct |
| Level 1 Gate | 8-12 min | 9.5 / 11.6 min | 1 try (3) | 14 Oct |
| Level 4 done (first session ends on the pan to Africa) | 30-60 min | 32 / 26 min | 1 try (3) | 14 Oct |
| Level 7 Gate (first hard level) | day 2-3, 1-2 tries | day 2.0 / 2.0, **3 / 4 tries** | **4 tries** (3) | 14 Oct |
| Road done (level 20) | day 18-25 | **day 8.2 / 11.0** (active 8.0 / 10.1) | - | 14 Oct |
| Share of core content seen at 1 day / 1 week / 30 days | at most 50% / 75% / 95% | **52 / 55%**, **86 / 82%**, 93 / 90% (1 h: not sampled, the series is daily) | - | 14 Oct |
| Hits per dirt block, mid-leg, at the pick you bring | 2-6 (never above 8) | **about 80 to 14 000** (levels 5-20, see below) | - | 14 Oct |
| Tries per Gate | about 1.1 early (1-6), 2-3 late, never above 3 | 1-2 early; late learn levels 15/17/19 **3-4** (active 3-5); prove levels often **1** | L1-6: 1, L7: 4 | 14 Oct |

### Per road level (mixed player: four 12 minute visits a day)

Targets: real day the level is first finished (attended minutes = about 48 x day), and median tries. Tries = digs started on
that level up to its first finish. "Digs between" = all digs since the previous level was finished (replays, chili, side
levels): the grind the player feels. The day targets are the 2.3 road of `docs/dig-design.md` stretched to the 20-level road
and the 18-25 days the owner asked for (2.3e).

| Level | Place, depth | Target day (att. min) | Target tries | Mixed: day | att. min | tries | digs between | Active: day / tries | Real tries (3 players) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Dunes 50 | 8-12 min | 1 | 0.0 / 0.0 | 9 / 12 | 1 / 1 | 0 / 0 | 0.0 / 1, 1 | 1 |
| 2 | Powder Valley 50 | 15-20 min | 1 | 0.0 / 0.0 | 14 / 15 | 1 / 1 | 1 / 1 | 0.0 / 1, 1 | - |
| 3 | Beasts 75 | 25-35 min | 1 | 0.4 / 0.2 | 27 / 22 | 2 / 1 | 2 / 1 | 0.0 / 1, 1 | 1 |
| 4 | Golden Wadi 75 | 30-60 min | 1 | 1.0 / 0.2 | 58 / 26 | 1 / 1 | 5 / 1 | 0.0 / 1, 1 | 1 |
| 5 | Dunes 100 learn | 0.8-1.5 | 1-2 | 1.2 / 0.6 | 65 / 41 | 1 / 2 | 2 / 3 | 0.0 / 2, 2 | 1 |
| 6 | Powder Valley 100 prove | 1.2-2 | 1-2 | 1.4 / 1.0 | 75 / 51 | 2 / 2 | 2 / 2 | 0.1, 1.0 / **5, 4** | 1 |
| 7 | Beasts 125 learn | 2-3 | 1-2 | 2.0 / 2.0 | 108 / 100 | **3 / 4** | 6 / 12 | 1.0 / 1, 2 | **4** |
| 8 | Golden Wadi 125 prove | 2.5-3.5 | 1-2 | 2.2 / 2.2 | 111 / 111 | 1 / 2 | 1 / 2 | 1.1 / **8, 5** | - |
| 9 | Dunes 150 learn | 3.5-5 | 2-3 | **2.6 / 2.6** | 140 / 139 | 3 / 2 | 5 / 3 | 2.0 / 3, 3 | - |
| 10 | Powder Valley 150 prove | 4-5.5 | 2-3 | **3.0 / 3.0** | 147 / 147 | **1 / 1** | 1 / 2 | 2.0 / 3, 1 | - |
| 11 | Beasts 175 learn | 5.5-7.5 | 2-3 | **3.2 / 3.6** | 166 / 195 | 2 / 3 | 2 / 8 | 2.1, 2.0 / 3, 1 | - |
| 12 | Golden Wadi 175 prove | 6-8 | 2-3 | **3.6 / 4.4** | 183 / 219 | 2 / 4 | 3 / 4 | 3.0 / 3, 1 | - |
| 13 | Dunes 200 learn | 8-10 | 2-3 | **4.0 / 5.0** | 200 / 246 | 2 / 2 | 2 / 3 | 3.0 / 2, 2 | - |
| 14 | Powder Valley 200 prove | 9-11 | 2-3 | **4.4 / 5.2** | 221 / 255 | **1 / 1** | 3 / 1 | 4.0, 3.0 / 2, 5 | - |
| 15 | Beasts 225 learn | 11-14 | 2-3 | **5.0 / 6.4** | 254 / 321 | 3 / 3 | 5 / 8 | 4.0, 5.0 / 3, 4 (digs 8, 21) | - |
| 16 | Golden Wadi 225 prove | 12-15 | 2-3 | **5.4 / 6.6** | 267 / 327 | 2 / 1 | 2 / 1 | 5.0, 6.1 / 2, 1 | - |
| 17 | Dunes 250 learn | 14-17 | 2-3 | **6.0 / 8.4** | 292 / 413 | 2 / 3 | 2 / 9 | 5.0, 7.0 / 3, 3 (digs 7, 11) | - |
| 18 | Powder Valley 250 prove | 15-18 | 2-3 | **6.2 / 8.6** | 303 / 423 | **1 / 1** | 1 / 1 | 5.1, 8.0 / 4, 3 | - |
| 19 | Beasts 275 learn | 17-21 | 2-3 | **7.6 / 10.0** | 377 / 487 | **4 / 3** | **11 / 7** | 7.1, 10.0 / **4, 5 (digs 19, 36)** | - |
| 20 | Golden Wadi 275 prove | 18-25 | 2-3 | **8.2 / 11.0** | 399 / 531 | 1 / 4 | 2 / 4 | 8.0, 10.1 / 1, 4 | - |

After the road: 215 / 182 more digs in the month (active 348 / 343). Sum line (mixed): first finish 10.5 min, level 4 day 0.3,
7.9 digs a day, 95 of 236 digs new, Stars 2.8 M by day 7 and 1.2 B by day 30, deepest 256 / 300 / 325 m at day 7 / 14 / 30.

### First session (mixed, attended minutes)

| Beat (fresh-eyes study 6) | Target | Sim |
|---|---|---|
| First block | 2 hits | 2-4 hits by the rule (`dirtHp`: rows 0-2 are 2, 3, 4 hp; pick 1); not tracked by the sim |
| First Rafeeq bought | 2:30 | 0:30 / 0:24 |
| First chest, pick 1 of 3 | 6:00 | 0:36 / 0:24 (the first relic the same second) |
| First bone | - | 1:48 / 1:48 |
| First Big Rock | 4:00 | 3:48 / 3:42 |
| First Museum set | - | 4:00 / 5:36 |
| Gate, finish card, first Star step | 8-10 | 9:30 / 11:36 (Star step 9:42 / 11:48) |
| Level 4 done | 30 | 32 / 26 min |
| 100 m Rock down | - | 65 / 41 min |
| First TNT chain | 1:30 | not tracked by the sim |

The first session holds. Chest and Rafeeq come far earlier than the beat sheet; not a fault, but the sheet should be updated
or the sim taught to log the TNT chain and the first block's hits.

### Felt power (mixed, levels 5 to 20)

How it is measured: from `dump.gates` (the Gate, its bank, your pick and a Rafeeq's dps at the first hit of every Gate fight).
"Pick hits" = (Gate hp - bank) / your hit. "Swings" = the bar's first estimate before it measures: hp / (your hit + 4 working
Rafeeqs' damage per swing at 3 swings a second); Forge, blasts and the crack are left out, so the real bar reads lower.
Hits per dirt block = `dirtHp(row) x place hp x proveHp` / the pick you had at the Gate; "mid-leg" takes the pick 12 rows up
as that pick / 1.9 (coins x10.8 a leg = pick x3.7, `valGrow` and `buyPow`).

| Level | Gate pick hits at arrival | Gate swings at arrival (est.) | Hits per dirt block mid-leg (est.) | last row above the Gate |
|---|---|---|---|---|
| 5 learn | 21k / 81k | 3.6k / 14k | 78 / 101 | 268 / 345 |
| 6 prove | 348k / 229k | 83k / 39k | 489 / 630 | 1.7k / 2.2k |
| 7 learn | 103k / 106k | 25k / 25k | 534 / 120 | 2.5k / 557 |
| 9 learn | 193k / 310k | 33k / 53k | 171 / 838 | 715 / 3.5k |
| 11 learn | 125k / 68k | 21k / 12k | 1.3k / 188 | 6.4k / 961 |
| 13 learn | 149k / 154k | 26k / 26k | 801 / 528 | 2.5k / 1.6k |
| 15 learn | 677k / 1.0M | 75k / 180k | 478 / 738 | 1.7k / 2.7k |
| 16 prove | 3.2M / 2.6M | 758k / 452k | 2.1k / 2.7k | 7.4k / 9.6k |
| 17 learn | 1.1M / 736k | 198k / 127k | 4.2k / 1.8k | 15k / 6.4k |
| 18 prove | 12.7M / 6.8M | 2.2M / 1.2M | 11k / 5.7k | 39k / 21k |
| 19 learn | 4.3M / 4.3M | 480k / 480k | 2.1k / 6.1k | 7.6k / 22k |
| 20 prove | 7.4M / 18.0M | 1.3M / 3.1M | 9.1k / 14k | 33k / 51k |

Where the ground's damage comes from (whole month, `dump.dmg.by`): blast chains 68-71%, chains with falling blocks or Forge
tools about 10%, your own swing (with crits) about 5%, the Rafeeqs' own swings about 5%. The pick is not what moves the player
past 100 m: the barrels are.

### Known walls

| Where | Cause (the numbers) | Fix | State |
|---|---|---|---|
| Late learn levels 15, 17, 19 (and 7): 3-4 tries, 7-11 other digs before level 19 (active 19-36) | Per 25 m below 225 m the ground formula (dirt and Gate) grows `1.175^25 x step` = x110 to x170 (`proto/core/rules.js:30-31`); Stars grow x4.5 (`starGrow`, `proto/core/rules.js:35`) and a Pick step is x1.5 hit for x1.5 price (`proto/features/starshop/rules.js:28,30`), so all the Stars of a depth buy x4.5. `gateMul` (`proto/features/sites/rules.js:51`, 0.126 and 0.0645 at levels 17 and 19) closes most of the gap; the rest is closed by replays at 0.25 of a floor's worth (`replayShare`, `sites/rules.js:60`). Level 19: 4.3M pick hits at arrival, 172k / 503k at the winning try: x9-25 bought with Stars from other digs | Proposed below (price of Pick steps past step 20) | proposal, not built |
| Prove levels 10, 14, 18 (and 8, 16, 20 often): 1 try right after a hard learn level | `learnPay 0.35` / `provePay 1.65` (`sites/rules.js:63`): the learn level is where the Stars-gap is paid off by grinding, and the player arrives at the prove level already over-strong; `proveHp 6` (`sites/rules.js:48`) and prove `gateMul` 6-9 do not catch up | Retune prove `gateMul` after the learn-level change below lands (one sim) | open |
| Road too short: level 20 on day 8-11, target 18-25; from level 9 on every level is about 2x early | Same constants as the first row, the other way: early depths (100-175 m) grow x43-x97 a leg against Stars x4.5 plus the chili hit, so levels 9-14 fall in 1-3 tries a day apart | Not a price fix: slowing levels by price brings back the grind. Owner decision: more road (levels, side levels) for days 11-25, or accept a 10 day road | needs owner |
| Hits per dirt block 80 to 14 000 by hand mid-leg (target 2-6) | Ground grows `hp` 1.175-1.21 a row = x48-x117 a leg (`proto/core/rules.js:25-31`) while your hit grows x3.7 a leg (`valGrow 1.10`, `powGrow 1.25` at x1.5 price, `buyPow 0.55`, `rules.js:17,20,33`); prove ground x6 on top. Blast chains do 70% of the damage, so the player does not feel the pick at all | Builder brief: fresh-eyes study package 3 (steady ground, sharp Rocks): in-leg `hp` near 1.05 a row (= the pick's x3.7 a leg) with the rest moved into each 25 m `step`, and the ground's level set from the pick the road expects, the Gates kept by raising `gateMul` by the same factor. Rule-shaped (ground formula and Gate sizes move together); not a params-only PR | brief |
| Old windows in `dig-month.mjs` | `TARGETS` rock5-rock8 (`sim/proto/dig-month.mjs:61-64`) ask mixed day 7-12 / 14-26 / 16-23 / 21-30 for the 125-200 m Rocks; measured day 2.0 / 2.6 / 3.2 / 4.0-5.0, so --assert fails them all | Replace with rows read from `fin` per road level (like `scripts/dig-levels.cjs`): mixed level 7 day 2-3, level 9 day 3.5-5, level 11 day 5.5-7.5, level 13 day 8-10, level 20 day 18-25; plus a tries row (median tries per level at most 3, prove levels at least 2 from level 9) and a "digs between" row (at most 6 before any level) | sim change, next run |

### The smallest next change (proposal, not built)

**Pick track: steps past 20 cost x1.35 each instead of x1.5** (`starshopStepCost`, `proto/features/starshop/rules.js:84`;
a second growth constant from step 20, so steps 1-20 and every save's spent Stars are untouched). The Camp and the Bag keep x1.5.

Predicted effect, from the numbers above: the Pick reaches step 20 at 13 300 Stars spent, which the mixed player has around
level 11-13 (`starsAt(200)` = 24 911), so levels 1-12 do not move. With about 0.9 M Stars in the Pick by level 19, x1.5 buys
10.4 steps past 20 and x1.35 buys 12.8: +2.4 steps, your hit x2.6 at arrival. At level 19 each try plus its digs between bought
about x2.5-3, so: **level 19 from 3-4 tries to 2-3, digs between 7-11 to about 4-7; levels 15 and 17 one try fewer at most;
road end about one day earlier (day 8-11 to 7-10).** The cost is that last point: it moves away from the 18-25 day target, so it
should go with the owner's answer on road length (third wall). Check: the same mixed run, levels 13-20 tries and digs between.

## Aetheria (live)

The year-one targets live in `sim/core-pacing.mjs` `TARGETS` (from `docs/redesign-proposal.md` 4.2 and 6.4):
first Ascension within 30 min (casual) and 90 min (idle), never more than 14 days without a reset up to day 270, casual run
Aether at days 50-70 between 1e11 and 1e13, at least 30 upgrades per casual run, the spam Ascend player earning at most x1 the
dust per hour. Check: `npm run sim:check`. Measured 14 October (`node sim/core-pacing.mjs`): "Year-one targets (casual; idle
first Ascension): met"; spam Ascend earns x0.00 of normal play. `--assert` runs the --links and --attune variants too and takes
over two minutes; it was stopped at 120 s this run, not finished.

Core loop (`?loop=2`, paused): `node sim/redesign/run.mjs --assert`; not measured.

## Tuning log (newest first)

| Date | Param | From -> to | Why | Before / after |
|---|---|---|---|---|
| 14 Oct 2026 | none | - | First measurement on main 69bb0f5 | see the tables above |

## How to run (frugal)

One sim at a time, in the foreground, redirected to a file; read only the summary lines.
`node sim/proto/dig-month.mjs --only mixed --seeds 2 --jobs 2 --sum --dump out.json > out.txt` (about 1.5 min; active about
2.5 min), then `node scripts/dig-levels.cjs out.json`. Never above `--jobs 3`.
