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
| Chapter one done (level 20) | - (was the road end; chapter two since #418) | day 12.6 / 11.4 (before this pass 14.0 / 11.4) | - | 14 Oct, balance pass |
| Road done (level 40) | day 18-25 | **day 21.0 / 19.0** (before: 24.2 / never) | - | 14 Oct, balance pass |
| Stars by day 30 | at most x10 the road without chapter two (0.8 B) | **2.1 T** (before: 68 T); cannot reach x10 by numbers, see Known walls | - | 14 Oct, balance pass |
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

### The 40-level road (chapter two balance pass, 14 October 2026)

Before = `main` at 5a00d46 (chapter two as merged: `ch2Hp` 3e12, `ch2Stars` 2e5, Empty Quarter Gates 0.003 / 1.05 / 4e-4 / 0.2).
After = this pass: `ch2Stars` 2e3, Empty Quarter Gates 7.5e-4 / 1.05 / 2e-4 / 0.2, levels 21 to 36 on the chapter-one slot table, and two
sim-player habits fixed (below). Mixed player, 2 seeds, seed 1 / seed 2. Swings = the Gate in swings at arrival (estimate, see Felt power);
fight = the winning Gate fight in attended seconds, from your first hit to the finish ("-": you never hit the Gate in that try).
Targets for levels 21 to 40: 1 to 3 tries, at most 6 other digs before each, the Gate like the same slot of chapter one, road end
day 18 to 25.

SUM before: `mixed: fin1 10.4m fin4 d0.3 5.6/day vers 66/168 med 66f6h share 88% (88%) Stars 885.9k/68.4T depth 250/302/438 R4 d0.6 R6 d2.7 R8 d4.9 news 90%`
SUM after: `mixed: fin1 10.4m fin4 d0.3 6.4/day vers 89/194 med 89f6h share 87% (87%) Stars 885.9k/2.1T depth 250/313/400 R4 d0.6 R6 d2.7 R8 d4.9 news 100%`

| Level | Place, kind | Before: day | tries | digs between | swings | **After: day** | tries | digs between | swings | fight s | Chapter-one slot: swings, fight |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Dunes 50 lesson | 0.0 / 0.0 | 1 / 1 | 0 / 0 | - / - | **0.0 / 0.0** | 1 / 1 | 0 / 0 | - / - | - / - | |
| 2 | Powder Valley 50 lesson | 0.2 / 0.2 | 1 / 1 | 1 / 1 | - / - | **0.2 / 0.2** | 1 / 1 | 1 / 1 | - / - | - / - | |
| 3 | Beasts 75 lesson | 0.2 / 0.2 | 1 / 1 | 1 / 1 | - / - | **0.2 / 0.2** | 1 / 1 | 1 / 1 | - / - | - / - | |
| 4 | Golden Wadi 75 lesson | 0.4 / 0.2 | 1 / 1 | 2 / 1 | - / - | **0.4 / 0.2** | 1 / 1 | 2 / 1 | - / - | - / - | |
| 5 | Dunes 100 learn | 0.6 / 0.6 | 1 / 2 | 3 / 2 | 2k / 17k | **0.6 / 0.6** | 1 / 2 | 3 / 2 | 2k / 17k | 107 / 338 | |
| 6 | Powder Valley 100 prove | 1.0 / 1.0 | 1 / 2 | 3 / 2 | 30k / 39k | **1.0 / 1.0** | 1 / 2 | 3 / 2 | 30k / 39k | 324 / 390 | |
| 7 | Beasts 125 learn | 1.2 / 1.6 | 2 / 2 | 2 / 4 | 10k / 15k | **1.2 / 1.6** | 2 / 2 | 2 / 4 | 10k / 15k | 218 / 312 | |
| 8 | Golden Wadi 125 prove | 1.4 / 2.0 | 1 / 1 | 1 / 1 | - / 273k | **1.4 / 2.0** | 1 / 1 | 1 / 1 | - / 273k | - / 129 | |
| 9 | Dunes 150 learn | 2.4 / 3.0 | 3 / 3 | 7 / 8 | 67k / 15k | **2.4 / 3.0** | 3 / 3 | 7 / 8 | 67k / 15k | 430 / 92 | |
| 10 | Powder Valley 150 prove | 2.6 / 3.2 | 2 / 1 | 2 / 2 | 43k / - | **2.6 / 3.2** | 2 / 1 | 2 / 2 | 43k / - | 413 / - | |
| 11 | Beasts 175 learn | 3.0 / 3.6 | 1 / 2 | 2 / 4 | 9k / 8k | **3.0 / 3.6** | 1 / 2 | 2 / 4 | 9k / 8k | 444 / 121 | |
| 12 | Golden Wadi 175 prove | 3.2 / 4.0 | 1 / 2 | 1 / 2 | - / 67k | **3.2 / 4.0** | 1 / 2 | 1 / 2 | - / 67k | - / 420 | |
| 13 | Dunes 200 learn | 4.6 / 5.2 | 2 / 1 | 17 / 6 | 11k / 9k | **4.6 / 5.2** | 2 / 1 | 17 / 6 | 11k / 9k | 27 / 235 | |
| 14 | Powder Valley 200 prove | 5.2 / 5.4 | 1 / 2 | 3 / 2 | - / 137k | **5.2 / 5.4** | 1 / 2 | 3 / 2 | - / 137k | - / 477 | |
| 15 | Beasts 225 learn | 6.2 / 6.2 | 3 / 3 | 6 / 6 | 140k / 175k | **6.2 / 6.2** | 3 / 3 | 6 / 6 | 140k / 175k | 222 / 385 | |
| 16 | Golden Wadi 225 prove | 6.4 / 6.6 | 1 / 1 | 1 / 2 | 549k / 351k | **6.4 / 6.6** | 1 / 1 | 1 / 2 | 549k / 351k | 242 / 279 | |
| 17 | Dunes 250 learn | 7.4 / 8.4 | 3 / 3 | 6 / 13 | 240k / 54k | **7.4 / 8.4** | 3 / 3 | 6 / 13 | 240k / 54k | 454 / 119 | |
| 18 | Powder Valley 250 prove | 8.0 / 8.6 | 2 / 1 | 2 / 1 | 1.5M / 498k | **8.0 / 8.6** | 2 / 1 | 2 / 1 | 1.5M / 498k | 123 / 207 | |
| 19 | Beasts 275 learn | 13.4 / 11.2 | 3 / 4 | 13 / 17 | 68k / 109k | **11.6 / 11.2** | 4 / 4 | 23 / 17 | 54k / 109k | 123 / 287 | |
| 20 | Golden Wadi 275 prove | 14.0 / 11.4 | 2 / 1 | 2 / 1 | 665k / 680k | **12.6 / 11.4** | 1 / 1 | 4 / 1 | 225k / 680k | 199 / 20 | |
| 21 | Dunes 100 learn | 20.0 / 11.4 | 1 / 1 | 5 / 1 | 3k / 3k | **12.6 / 11.4** | 1 / 1 | 1 / 1 | 2k / 3k | 125 / 138 | L5: 2k / 17k, 107 / 338 s |
| 22 | Powder Valley 100 prove | 20.0 / 11.6 | 1 / 2 | 2 / 2 | 2k / 37k | **13.0 / 11.6** | 1 / 2 | 3 / 2 | - / 70k | - / 380 | L6: 30k / 39k, 324 / 390 s |
| 23 | Beasts 125 learn | 20.2 / 11.6 | 1 / 1 | 2 / 2 | - / 3k | **13.0 / 12.0** | 1 / 1 | 1 / 3 | 4k / 3k | 73 / 207 | L7: 10k / 15k, 218 / 312 s |
| 24 | Golden Wadi 125 prove | 20.2 / 12.4 | 1 / 2 | 1 / 14 | 61 / - | **13.2 / 12.0** | 1 / 1 | 1 / 1 | 31k / 9k | 273 / 148 | L8: - / 273k, - / 129 s |
| 25 | Dunes 150 learn | 20.4 / 12.6 | 1 / 1 | 4 / 2 | - / - | **13.2 / 12.0** | 1 / 1 | 1 / 1 | 4k / 7k | 83 / 193 | L9: 67k / 15k, 430 / 92 s |
| 26 | Powder Valley 150 prove | 20.4 / 12.6 | 1 / 1 | 1 / 1 | 22 / - | **13.4 / 12.2** | 1 / 1 | 1 / 1 | 152k / - | 169 / - | L10: 43k / -, 413 / - s |
| 27 | Beasts 175 learn | 20.4 / 13.0 | 1 / 1 | 1 / 3 | 37 / - | **13.6 / 13.6** | 2 / 2 | 2 / 15 | 175k / 6k | 339 / 294 | L11: 9k / 8k, 444 / 121 s |
| 28 | Golden Wadi 175 prove | 20.6 / 13.2 | 1 / 1 | 1 / 1 | 503 / 7 | **14.4 / 14.0** | 2 / 1 | 4 / 1 | 631k / - | 360 / - | L12: - / 67k, - / 420 s |
| 29 | Dunes 200 learn | 21.2 / 13.2 | 1 / 1 | 5 / 1 | - / - | **15.2 / 14.2** | 2 / 2 | 4 / 2 | 241k / 154k | 295 / 292 | L13: 11k / 9k, 27 / 235 s |
| 30 | Powder Valley 200 prove | 21.2 / 13.2 | 1 / 1 | 1 / 1 | 1k / 305 | **15.4 / 14.4** | 1 / 2 | 1 / 2 | 2.3M / - | 45 / - | L14: - / 137k, - / 477 s |
| 31 | Beasts 225 learn | 21.2 / 13.6 | 1 / 1 | 1 / 3 | 2k / 758 | **16.0 / 14.6** | 2 / 2 | 3 / 2 | - / - | - / - | L15: 140k / 175k, 222 / 385 s |
| 32 | Golden Wadi 225 prove | 21.4 / 13.6 | 1 / 1 | 1 / 1 | - / 9k | **16.6 / 15.2** | 1 / 1 | 3 / 2 | - / - | - / - | L16: 549k / 351k, 242 / 279 s |
| 33 | Dunes 250 learn | 21.4 / 14.2 | 1 / 1 | 1 / 3 | 14k / 3k | **17.0 / 15.4** | 2 / 2 | 2 / 2 | - / - | - / - | L17: 240k / 54k, 454 / 119 s |
| 34 | Powder Valley 250 prove | 22.0 / 14.4 | 2 / 1 | 3 / 2 | 481k / - | **17.4 / 15.6** | 2 / 2 | 3 / 2 | - / - | - / - | L18: 1.5M / 498k, 123 / 207 s |
| 35 | Beasts 275 learn | 22.4 / 14.6 | 1 / 1 | 2 / 1 | 65k / 101k | **17.6 / 16.2** | 2 / 1 | 2 / 2 | - / - | - / - | L19: 54k / 109k, 123 / 287 s |
| 36 | Golden Wadi 275 prove | 22.6 / 15.0 | 2 / 2 | 2 / 2 | - / - | **18.6 / 16.4** | 2 / 2 | 5 / 2 | - / - | - / - | L20: 225k / 680k, 199 / 20 s |
| 37 | Dunes 300 learn | 23.0 / 15.2 | 1 / 1 | 1 / 1 | 116k / - | **19.6 / 17.2** | 3 / 1 | 6 / 3 | 1.6G / - | 1446 / - | |
| 38 | Powder Valley 300 prove | 23.4 / 15.4 | 2 / 1 | 3 / 1 | - / - | **20.0 / 17.6** | 1 / 2 | 1 / 3 | - / - | - / - | |
| 39 | Beasts 325 learn | 24.0 / never | 1 / - | 2 / - | 69k / 1.1M | **20.4 / 18.6** | 1 / 3 | 2 / 6 | - / 11.1G | - / 1267 | |
| 40 | Golden Wadi 325 prove | 24.2 / never | 1 / - | 1 / - | - / - | **21.0 / 19.0** | 2 / 2 | 3 / 2 | - / - | - / - | |

**Read.** Levels 1 to 18 do not move. Levels 19 and 20 of seed 1 come 1.4 to 1.8 days sooner: the sim's player no longer sits 3.8 hours in
one chili dig (it leaves after 20 minutes), so seed 1 no longer loses days 14 to 20. Chapter two now takes 8.4 / 7.6 days (before: 9.4 / 4.0, six of seed 1's days in one chili dig,
for levels 21 to 38, and level 39 never on seed 2), every level in 1 to 3 tries, digs between at most 6 except level 27 on seed 2 (15).
Levels 21 to 29 fight their Gate for 1 to 6 minutes like their chapter-one slot. From level 27 the Gate grows away from the player (see
Known walls).

**What moved the days.** Not the Gate: a chapter-two level is finished in 1.5 to 5 attended minutes, so the days are the count of digs.
Gate tables 2 to 4,500 times bigger at levels 21 to 36 moved the road end by 0.4 to 0.6 days and made fights no longer. The Stars do it:
at `ch2Stars` 2e5 a chapter-two level pays the player past the next few, at 2e3 the player earns each level again.

| `ch2Stars` | Gates (21 to 36) | Road end | Stars by day 30 |
|---|---|---|---|
| 2e5 (main) | slot table | 24.2 / never | 68 T |
| 2e5 | x2 to x4,500 (matched to the swings) | 18.4 / 18.6 | 490 P |
| 2e4 | same | 21.6 / 19.0 | 163 T |
| 2e3 | same | 20.0 / 18.4 | 7.4 T |
| 2e3 | x1.4 to x330 | 20.2 / 20.6 | 5.9 T |
| **2e3** | **slot table** | **21.0 / 19.0** | **2.1 T** |

(Rows 2 to 6 have both sim-player fixes; row 1 has neither.)

**Sim-player habits fixed** (`sim/proto/player.mjs`, `contracts.botChiliCap`; the game's rules do not change):
- A chili dig is left after max(10 min, min(1.6 x par, 20 min)) attended. Before: 1.6 x par, 3.8 hours at 275 m. A person who has not
  broken a chili Gate in two 12-minute visits goes back to the road.
- In chapter two, a level the player left is tried again after 3 other digs. Before: only once the Stars had grown by half since leaving.
  The side cards beside a chapter-two level are chapter-one twists that pay about 2,000 times less, so the Stars never grew by half and
  seed 2 dug 90 side cards and never went back to level 39. A person goes back to the Gate, which remembers 60% of every try.

**Predicted Gate table for the next pass** (not measured; one sim, `sites.gateMulCh2` as 20 entries): the slot value times the measured
gap, 1/10 to 1/20 at levels 27 to 30, then a growing gap to 1/10^5 at level 39 (from 1.6 G and 11 G swings against about 100 k).
21-26 as the slot; 27 0.01; 28 0.62; 29 0.013; 30 0.59; 31 0.0059; 32 0.075; 33 4e-4; 34 0.008; 35 3.2e-5; 36 6.9e-4; 37 4.7e-8;
38 2.6e-5; 39 2e-9; 40 8e-7. Expect levels 31 to 40 to get faster (the player can hit them), so the road end moves earlier: check
seed 2 against day 18, and lower `ch2Stars` with it if it falls short.

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
| Road too short: level 20 on day 8-11, target 18-25; from level 9 on every level is about 2x early (**closed**: chapter two, #418 and the 14 Oct balance pass, road end day 21.0 / 19.0) | Same constants as the first row, the other way: early depths (100-175 m) grow x43-x97 a leg against Stars x4.5 plus the chili hit, so levels 9-14 fall in 1-3 tries a day apart | Not a price fix: slowing levels by price brings back the grind. Owner decision: more road (levels, side levels) for days 11-25, or accept a 10 day road | needs owner |
| Hits per dirt block 80 to 14 000 by hand mid-leg (target 2-6) | Ground grows `hp` 1.175-1.21 a row = x48-x117 a leg (`proto/core/rules.js:25-31`) while your hit grows x3.7 a leg (`valGrow 1.10`, `powGrow 1.25` at x1.5 price, `buyPow 0.55`, `rules.js:17,20,33`); prove ground x6 on top. Blast chains do 70% of the damage, so the player does not feel the pick at all | Builder brief: fresh-eyes study package 3 (steady ground, sharp Rocks): in-leg `hp` near 1.05 a row (= the pick's x3.7 a leg) with the rest moved into each 25 m `step`, and the ground's level set from the pick the road expects, the Gates kept by raising `gateMul` by the same factor. Rule-shaped (ground formula and Gate sizes move together); not a params-only PR | brief |
| Chapter two, levels 27 to 40: the player cannot hurt the Gate | At `ch2Stars` 2e3 the hit falls behind from level 27: swings at arrival x10 to x20 the chapter-one slot at 27 to 30 (175 k to 2.3 M against 9 k to 137 k); at 31 to 36 the player never hits the Gate in the winning try; Empty Quarter learn Gates 1.6 G and 11 G swings. They fall in 1 to 3 tries to TNT (`boss.blastShare` 0.02 a barrel, `blastCap` 0.3 a try) and the Gate's memory (`gateShare` 0.6), so the fight at 37 and 39 lasts 21 to 24 minutes whatever the Gate's size | A Gate size per chapter-two level (`gateMulCh2` 20 entries; `gateMulOf` and `test_proto_rocks.js` change by two lines); predicted table above; one sim | brief (next pass) |
| Stars by day 30 at T (fault 12) | Chapter two needs the hit x10^12 over 20 levels like chapter one; the hit grows about as Stars^1.9 (levels 21 to 36: hit x3e11 for Stars x1.3e6), so Stars must grow about x10^6 from the 1.5e7 at level 20. After level 40 the free deal is chapter-one ground at 350 to 400 m (`starsAt(400)` = 4.1e9 a floor). x10 of 0.8 B is out of reach by params | Owner: accept T after chapter two, or a rule (for example chapter-two Stars as their own coin) | needs owner |
| Side cards beside a stuck chapter-two level pay almost nothing | `card(s, site, floor, twist)` makes every twist chapter one (`ch = !twist && ch === 2 ? 2 : 1`), so beside a chapter-two level the side cards pay chapter-one Stars, about 2,000 times less | Builder: deal chapter-two side cards (replay or medal of a chapter-two level) beside a chapter-two level | brief |
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
| 14 Oct 2026 | `sites.ch2Stars` | 2e5 -> 2e3 | Chapter two paid the player past the next levels: road end 24.2 / never, Stars 68 T | road end 21.0 / 19.0; Stars by day 30 2.1 T |
| 14 Oct 2026 | `sites.gateMulCh2` | 0.003, 1.05, 4e-4, 0.2 -> 7.5e-4, 1.05, 2e-4, 0.2 | Empty Quarter learn Gates (level 39 never finished on seed 2) | no effect on the fight (TNT and the Gate's memory break it, see Known walls); level 39 in 1 / 3 tries |
| 14 Oct 2026 | `contracts.botChiliCap` (sim player) | none -> 1200 s | Seed 1 sat 3.8 h in one chili-4 dig at 275 m | levels 19 and 20 of seed 1 1.4 to 1.8 days sooner, levels 1 to 18 unchanged |
| 14 Oct 2026 | `MOVE.retryDigs` (sim player) | none -> 3 | Seed 2 never went back to level 39 (90 side digs) | level 39 finished on day 18.6 |
| 14 Oct 2026 | none | - | First measurement on main 69bb0f5 | see the tables above |

## How to run (frugal)

One sim at a time, in the foreground, redirected to a file; read only the summary lines.
`node sim/proto/dig-month.mjs --only mixed --seeds 2 --jobs 2 --sum --dump out.json > out.txt` (about 1.5 min; active about
2.5 min), then `node scripts/dig-levels.cjs out.json [--gates]` (`--gates` adds the swings at arrival and the Gate fight seconds per level). Never above
`--jobs 3`. Several variants in one run: `--ab '[{...},{...}]'` (each variant also dumped to `out-ab<k>.json`), about 1.6 min per variant.
