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
| Level 7 Gate (first hard level) | day 2-3, 1-2 tries | day 2.0 / 1.6, **4 / 3 tries** (main 1.2 / 2.0, 1 / 3) | **4 tries** (3) | 14 Oct, Camp steps count (run 4) |
| Chapter one done (level 20) | day 10-15 (dig-design decision 6) | day 11.0 / 12.2 (main 15.0 / 14.6) | - | 14 Oct, Camp steps count (run 4) |
| Road done (level 40) | day 18-25 | day 18.6 / 20.2 (main 23.2 / 24.4; seed 1 0.6 days from the edge) | - | 14 Oct, Camp steps count (run 4) |
| Stars by day 30 | retired (dig-design decision 14: one coin at any size); balance-analyst to replace with the next step's cost in digs at levels 20, 30, 40 | 910 B (main 1.4 T) | - | 14 Oct, Camp steps count (run 4) |
| Share of core content seen at 1 day / 1 week / 30 days | at most 50% / 75% / 95% | **52 / 55%**, **86 / 82%**, 93 / 90% (1 h: not sampled, the series is daily) | - | 14 Oct |
| Hits per dirt block, mid-leg, at the pick you bring | 2-6 (never above 8) | **about 80 to 14 000** (levels 5-20, see below) | - | 14 Oct |
| Tries per Gate (`--assert`: median at most 3, x1.25) | about 1.1 early (1-6), 2-3 late, never above 3 | 1-2 early; **level 7: 4 / 3**; learn levels 13 / 15 / 17 / 19: 2 / 3, 3 / 3, 3 / 1, 3 / 3 (main 4 / 4, 2 / 2, 2 / 6, 6 / 3); prove 14 and 20 take 4 on one seed; chapter two 1-3 | L1-6: 1, L7: 4 | 14 Oct, Camp steps count (run 4) |

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

### Each chapter-two Gate sized for its level (14 October 2026, 3 sims)

Before = `main` at fafcf35 (v5.33.1: side cards in chapter two pay chapter-two Stars, which moved the road end from 21.0 / 19.0 to
29.0 / 23.4). Middle = `gateMulCh2` as 20 entries with the table predicted by the pass above, `ch2Stars` 2e3. After = the same table
and `ch2Stars` 5e3 (v5.33.2). Mixed, 2 seeds, seed 1 / seed 2; fight = the winning Gate fight in attended seconds ("-": no hit of yours
on the Gate in that try); swings at arrival as above. Levels 1 to 20 are the same in all three runs, day for day.

SUM before: `mixed: fin1 10.4m fin4 d0.3 4.9/day vers 74/149 med 74f6h share 73% (73%) Stars 885.9k/1.8T depth 250/313/400 R4 d0.6 R6 d2.7 R8 d4.9 news 100%`
SUM middle: `mixed: fin1 10.4m fin4 d0.3 5.0/day vers 68/152 med 68f6h share 76% (75%) Stars 885.9k/2.3T depth 250/313/400 R4 d0.6 R6 d2.7 R8 d4.9 news 100%`
SUM after: `mixed: fin1 10.4m fin4 d0.3 5.6/day vers 82/168 med 82f6h share 80% (79%) Stars 885.9k/8.4T depth 250/300/400 R4 d0.6 R6 d2.7 R8 d4.9 news 100%`

`gateMulCh2` (levels 21 to 40): 0.44, 8.87, 0.371, 7.49, 0.278, 7.99 (as levels 5 to 10), 0.01, 0.62, 0.013, 0.59, 0.0059, 0.075, 4e-4,
0.008, 3.2e-5, 6.9e-4, 4.7e-8, 2.6e-5, 2e-9, 8e-7.

| Level | Before: day | tries | digs between | fight s | Middle: day | tries | fight s | **After: day** | tries | digs between | swings | fight s | Chapter-one slot: fight |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 21 | 12.6 / 11.4 | 1 / 1 | 1 / 1 | 125 / 138 | 12.6 / 11.4 | 1 / 1 | 125 / 138 | **12.6 / 11.4** | 1 / 1 | 1 / 1 | 2.2k / 2.8k | 125 / 138 | L5: 107 / 338 |
| 22 | 13.0 / 11.6 | 1 / 2 | 3 / 2 | - / 380 | 13.0 / 11.6 | 1 / 2 | - / 380 | **13.0 / 11.6** | 1 / 2 | 3 / 2 | - / 70k | - / 380 | L6: 324 / 390 |
| 23 | 13.0 / 12.0 | 1 / 1 | 1 / 3 | 73 / 207 | 13.0 / 12.0 | 1 / 1 | 73 / 207 | **13.0 / 12.2** | 1 / 2 | 1 / **13** | 3.8k / 276 | 73 / 136 | L7: 218 / 312 |
| 24 | 13.2 / 12.0 | 1 / 1 | 1 / 1 | 273 / 148 | 13.2 / 12.0 | 1 / 1 | 273 / 148 | **13.0 / 12.4** | 1 / 1 | 1 / 2 | 4.3k / 5.6k | 80 / 165 | L8: - / 129 |
| 25 | 13.2 / 12.0 | 1 / 1 | 1 / 1 | 83 / 193 | 13.2 / 12.0 | 1 / 1 | 83 / 193 | **13.2 / 12.4** | 1 / 1 | 1 / 1 | - / 1.1k | - / 153 | L9: 430 / 92 |
| 26 | 13.4 / 12.2 | 1 / 1 | 1 / 1 | 169 / - | 13.4 / 12.2 | 1 / 1 | 169 / - | **13.4 / 12.6** | 2 / 1 | 2 / 2 | 284k / - | 440 / - | L10: 413 / - |
| 27 | 13.6 / 13.6 | 2 / 2 | 2 / 15 | 339 / 294 | 13.4 / 13.6 | 1 / 2 | 267 / 172 | **13.6 / 13.0** | 2 / 2 | 2 / 2 | 4.6k / 833 | 350 / 497 | L11: 444 / 121 |
| 28 | 14.4 / 14.0 | 2 / 1 | 4 / 1 | 360 / - | 13.6 / 14.0 | 1 / 1 | - / 157 | **14.0 / 13.0** | 1 / 1 | 1 / 1 | 40k / 34k | 273 / 313 | L12: - / 420 |
| 29 | 15.2 / 14.2 | 2 / 2 | 4 / 2 | 295 / 292 | 14.0 / 14.2 | 2 / 2 | - / 290 | **14.4 / 13.6** | 1 / 2 | 2 / 4 | 24k / - | 119 / - | L13: 27 / 235 |
| 30 | 15.4 / 14.4 | 1 / 2 | 1 / 2 | 45 / - | 14.4 / 14.4 | 2 / 2 | - / - | **14.6 / 15.0** | 2 / 2 | 2 / 6 | - / - | - / - | L14: - / 477 |
| 31 | 16.0 / 14.6 | 2 / 2 | 3 / 2 | - / - | 15.2 / 15.0 | 1 / 2 | - / - | **15.2 / 15.4** | 2 / 2 | 3 / 3 | - / - | - / - | L15: 222 / 385 |
| 32 | 16.6 / 15.2 | 1 / 1 | 3 / 2 | - / - | 16.2 / 15.6 | 2 / 1 | - / - | **15.4 / 15.6** | 2 / 1 | 2 / 1 | - / - | - / - | L16: 242 / 279 |
| 33 | 17.0 / 15.4 | 2 / 2 | 2 / 2 | - / - | 16.6 / 16.0 | 2 / 2 | - / - | **15.6 / 16.0** | 1 / 2 | 1 / 2 | - / - | - / - | L17: 454 / 119 |
| 34 | 17.4 / 15.6 | 2 / 2 | 3 / 2 | - / - | 17.0 / 16.2 | 1 / 2 | - / - | **16.0 / 16.6** | 2 / 2 | 2 / 4 | - / - | - / - | L18: 123 / 207 |
| 35 | 17.6 / 16.2 | 2 / 1 | 2 / 2 | - / - | 17.2 / 17.0 | 2 / 2 | - / - | **16.4 / 17.0** | 2 / 1 | 3 / 1 | - / - | - / - | L19: 123 / 287 |
| 36 | 18.6 / 16.4 | 2 / 2 | 5 / 2 | - / - | 17.4 / 17.2 | 1 / 1 | - / - | **16.6 / 17.2** | 2 / 2 | 2 / 2 | - / - | - / - | L20: 199 / 20 |
| 37 | 23.2 / 17.2 | **10** / 1 | **27** / 3 | 10 / - | 21.0 / 17.4 | **7** / 2 | 21 / - | **17.0 / 20.6** | 1 / **8** | 1 / **20** | 5.5k / 2.9k | 267 / 15 | |
| 38 | 23.4 / 17.6 | 2 / 2 | 2 / 3 | - / - | 21.2 / 18.0 | 2 / 1 | - / - | **17.2 / 21.0** | 1 / 1 | 1 / 1 | - / - | - / - | |
| 39 | 28.6 / 23.2 | **11 / 11** | **29 / 30** | 1 / 3 | 25.0 / 27.4 | **8 / 17** | 17 / 1616 | **22.2 / 22.6** | **10** / **4** | **26 / 10** | 20k / 862 | 0 / 6 | |
| 40 | 29.0 / 23.4 | 2 / 2 | 2 / 2 | - / - | 25.4 / 28.0 | 2 / 2 | - / - | **22.4 / 23.4** | 2 / 2 | 2 / 4 | - / - | - / - | |

**Read.** The road end is back in 18-25 on both seeds (29.0 / 23.4 -> 22.4 / 23.4), from `ch2Stars` 5e3, not from the Gates: the table
alone (middle) gave 25.4 / 28.0. Where the player reaches the Gate by hand the smaller Gates work: at levels 27 to 29 the arrival swings
fell from 175k to 631k (before) to 1k to 40k, and the fight is 2 to 8 minutes like the slot (27: 350 / 497 s against 444 / 121 s; 28:
273 / 313 against - / 420; 29: 119 against 27 / 235). The x1.5 target holds at 27 seed 1 and 28 seed 2 and misses at 27 seed 2 and
29 seed 1, where the chapter-one slot itself is a short fight (121 s, 27 s). From level 30 on the Gate size does not reach the fight:

- **Levels 30 to 36 (and some tries of 28 and 29) are finished while away, the Gate is never hit.** Logging every hit on the Gate row (a sim-only probe, not
  shipped) shows no hit at all on the Gates of levels 31 to 36 in any try, at either size (slot table, or x1/40 to x1/6,300 of it). The
  Star perk Wake (`sp_wake`, `awayWalk` in `proto/features/starshop/rules.js`) lets the Rafeeqs walk on past every Big Rock of a layer
  up to the deepest one ever broken (`s.starBoss`, 11 layers after chapter one) and sets `s.bossesDown` to match; the level's finish
  check (`s.bossesDown * LAYER >= r.floor`, `sites/rules.js` step hook) then fires on return. Every chapter-two depth up to 275 m was
  broken in chapter one; every chapter-one prove level is the depth its learn level just broke (why prove levels 8, 12 and 14 show "-"
  and take 1 try).
- **Levels 37 and 39 stall above the Gate.** In the failed tries the player's own hits on the Gate add up to under 1% of it: TNT from
  the rows above takes its 30% (`blastCap`) and the try ends 240 s later on the give-up (`MOVE.giveUp`, no new metre). The Gate then
  falls to TNT plus its memory (bank 0.5 to 0.8) after 0 to 15 s of hitting, at any size (2e-4 or 2e-9). The wall is the last rows
  above the Gate at 300 and 325 m, not the Gate.

**Probe: the Gate of the level in play not walkable** (`passable` false for `r.floor` while the run is not done; one sim, not shipped,
the new table, `ch2Stars` 2e3): Stars by day 7 57 k (was 886 k), level 20 on day 16.6 / 18.2 (was 12.6 / 11.4), prove levels 6 and 8
in 5 to 6 tries, levels 21 to 29 fought for 1 to 5 minutes, and the road stops at level 33 / 32 on day 30. The walk carries the whole
road's pacing; changing it is a rule change for the owner, then a retune of `gateMul`, `proveHp` and both chapters.

### The Gate is yours (14 October 2026, 6 sims, #430 + #429)

The rules (dig-design decision 13): the Gate of the level in play is never walked past while away (Rock Friend still passes the Rocks
above it), and time away prices every row with the hardness the `row` hook gives it (`groundHp`: prove, chili, the heavy twist,
chapter two), its sieve too. Run 1 = `main` at b865e8b. Run 2 = the rules, no retune. Run 3 = first retune. Run 4 = prove Gates and `ch2Hard` head. Run 5 = **this branch** (run 4 plus the `ch2Hard` tail, main merged). Run 6 = run 5 with level 28 at 2e-5 (not kept).
Mixed, 2 seeds, seed 1 / seed 2.

SUM 1 (main): `mixed: fin1 10.4m fin4 d0.3 5.6/day vers 82/168 med 82f6h share 80% (79%) Stars 885.9k/8.4T depth 250/300/400 R4 d0.6 R6 d2.7 R8 d4.9 news 100%`
SUM 2 (rules only): `mixed: fin1 10.4m fin4 d0.4 1.9/day vers 35/62 med 35f2h share 36% (34%) Stars 89.9k/50.0M depth 203/278/282 R4 d0.8 R6 d4.1 R8 d7.0 news 63%`
SUM 3 (prove Gates cut, a ground factor per chapter-two level, Gates of 27-40 unchanged): `mixed: fin1 10.4m fin4 d0.3 2.3/day vers 40/75 med 40f5h share 42% (40%) Stars 397.2k/287.8M depth 238/276/288 R4 d0.6 R6 d2.3 R8 d5.3 news 68%`
SUM 4: `mixed: fin1 10.4m fin4 d0.3 3.3/day vers 46/104 med 46f8h share 57% (56%) Stars 397.2k/12.9B depth 238/275/288 R4 d0.6 R6 d2.3 R8 d5.3 news 87%`
SUM 5 (this branch): `mixed: fin1 10.4m fin4 d0.3 5.4/day vers 78/164 med 78f8h share 78% (78%) Stars 397.2k/1.4T depth 238/275/400 R4 d0.6 R6 d2.3 R8 d5.3 news 100%`
SUM 6 (level 28 at 2e-5): `mixed: fin1 10.4m fin4 d0.3 5.3/day vers 75/162 med 75f8h share 78% (78%) Stars 397.2k/1.5T depth 238/275/400 R4 d0.6 R6 d2.3 R8 d5.3 news 100%`

| Level | Run 1 (main): day | tries | **Run 5 (this branch): day** | tries | digs between | Run 6: day | tries |
|---|---|---|---|---|---|---|---|
| 1 | 0.0 / 0.0 | 1 / 1 | 0.0 / 0.0 | 1 / 1 | 0 / 0 | 0.0 / 0.0 | 1 / 1 |
| 2 | 0.2 / 0.2 | 1 / 1 | 0.2 / 0.2 | 1 / 1 | 1 / 1 | 0.2 / 0.2 | 1 / 1 |
| 3 | 0.2 / 0.2 | 1 / 1 | 0.2 / 0.2 | 1 / 1 | 1 / 1 | 0.2 / 0.2 | 1 / 1 |
| 4 | 0.4 / 0.2 | 1 / 1 | 0.4 / 0.2 | 1 / 1 | 2 / 1 | 0.4 / 0.2 | 1 / 1 |
| 5 | 0.6 / 0.6 | 1 / 2 | 0.6 / 0.6 | 1 / 2 | 3 / 2 | 0.6 / 0.6 | 1 / 2 |
| 6 | 1.0 / 1.0 | 1 / 2 | 1.0 / 1.2 | 1 / 5 | 3 / 5 | 1.0 / 1.2 | 1 / 5 |
| 7 | 1.2 / 1.6 | 2 / 2 | 1.2 / 2.0 | 1 / 3 | 1 / 5 | 1.2 / 2.0 | 1 / 3 |
| 8 | 1.4 / 2.0 | 1 / 1 | 1.6 / 2.0 | 2 / 1 | 3 / 1 | 1.6 / 2.0 | 2 / 1 |
| 9 | 2.4 / 3.0 | 3 / 3 | 2.2 / 2.4 | 2 / 1 | 2 / 2 | 2.2 / 2.4 | 2 / 1 |
| 10 | 2.6 / 3.2 | 2 / 1 | 2.6 / 3.2 | 2 / 4 | 3 / 4 | 2.6 / 3.2 | 2 / 4 |
| 11 | 3.0 / 3.6 | 1 / 2 | 3.0 / 4.0 | 2 / 3 | 2 / 6 | 3.0 / 4.0 | 2 / 3 |
| 12 | 3.2 / 4.0 | 1 / 2 | 3.4 / 4.2 | 4 / 1 | 4 / 1 | 3.4 / 4.2 | 4 / 1 |
| 13 | 4.6 / 5.2 | 2 / 1 | 5.0 / 5.6 | 4 / 4 | 14 / 13 | 5.0 / 5.6 | 4 / 4 |
| 14 | 5.2 / 5.4 | 1 / 2 | 5.4 / 6.2 | 2 / 2 | 3 / 2 | 5.4 / 6.2 | 2 / 2 |
| 15 | 6.2 / 6.2 | 3 / 3 | 6.0 / 7.2 | 2 / 2 | 2 / 4 | 6.0 / 7.2 | 2 / 2 |
| 16 | 6.4 / 6.6 | 1 / 1 | 7.0 / 8.2 | 3 / 3 | 4 / 5 | 7.0 / 8.2 | 3 / 3 |
| 17 | 7.4 / 8.4 | 3 / 3 | 7.4 / 12.6 | 2 / 6 | 2 / 38 | 7.4 / 12.6 | 2 / 6 |
| 18 | 8.0 / 8.6 | 2 / 1 | 8.0 / 13.0 | 3 / 1 | 3 / 1 | 8.0 / 13.0 | 3 / 1 |
| 19 | 11.6 / 11.2 | 4 / 4 | 14.4 / 14.0 | 6 / 3 | 45 / 6 | 14.4 / 14.0 | 6 / 3 |
| 20 | 12.6 / 11.4 | 1 / 1 | 15.0 / 14.6 | 2 / 4 | 2 / 4 | 15.0 / 14.6 | 2 / 4 |
| 21 | 12.6 / 11.4 | 1 / 1 | 15.0 / 15.6 | 1 / 1 | 1 / 7 | 15.0 / 15.6 | 1 / 1 |
| 22 | 13.0 / 11.6 | 1 / 2 | 15.0 / 16.2 | 1 / 2 | 1 / 11 | 15.0 / 16.2 | 1 / 2 |
| 23 | 13.0 / 12.2 | 1 / 2 | 15.2 / 16.2 | 1 / 1 | 2 / 1 | 15.2 / 16.2 | 1 / 1 |
| 24 | 13.0 / 12.4 | 1 / 1 | 16.0 / 16.6 | 1 / 2 | 4 / 2 | 16.0 / 16.6 | 1 / 2 |
| 25 | 13.2 / 12.4 | 1 / 1 | 16.2 / 16.6 | 1 / 1 | 1 / 1 | 16.2 / 16.6 | 1 / 1 |
| 26 | 13.4 / 12.6 | 2 / 1 | 16.4 / 18.0 | 1 / 2 | 1 / 5 | 16.4 / 18.0 | 1 / 2 |
| 27 | 13.6 / 13.0 | 2 / 2 | 17.0 / 18.6 | 3 / 3 | 3 / 4 | 17.0 / 18.6 | 3 / 3 |
| 28 | 14.0 / 13.0 | 1 / 1 | 18.2 / 19.4 | 5 / 3 | 7 / 4 | 17.6 / 19.6 | 1 / 3 |
| 29 | 14.4 / 13.6 | 1 / 2 | 19.0 / 20.0 | 2 / 3 | 6 / 3 | 18.0 / 20.0 | 1 / 1 |
| 30 | 14.6 / 15.0 | 2 / 2 | 19.4 / 20.6 | 2 / 1 | 2 / 3 | 18.6 / 20.4 | 4 / 3 |
| 31 | 15.2 / 15.4 | 2 / 2 | 20.0 / 21.0 | 3 / 1 | 3 / 1 | 19.0 / 21.6 | 1 / 1 |
| 32 | 15.4 / 15.6 | 2 / 1 | 20.2 / 21.2 | 1 / 1 | 1 / 1 | 20.0 / 22.0 | 3 / 1 |
| 33 | 15.6 / 16.0 | 1 / 2 | 21.2 / 21.6 | 3 / 3 | 12 / 3 | 20.4 / 22.6 | 2 / 3 |
| 34 | 16.0 / 16.6 | 2 / 2 | 21.4 / 22.0 | 1 / 1 | 2 / 1 | 21.2 / 22.6 | 3 / 1 |
| 35 | 16.4 / 17.0 | 2 / 1 | 22.0 / 22.6 | 2 / 3 | 2 / 3 | 21.6 / 23.6 | 2 / 2 |
| 36 | 16.6 / 17.2 | 2 / 2 | 22.2 / 22.6 | 1 / 1 | 1 / 1 | 22.0 / 23.6 | 1 / 1 |
| 37 | 17.0 / 20.6 | 1 / 8 | 22.4 / 23.2 | 1 / 2 | 2 / 2 | 22.2 / 24.4 | 1 / 2 |
| 38 | 17.2 / 21.0 | 1 / 1 | 22.6 / 23.4 | 1 / 1 | 1 / 2 | 22.6 / 24.6 | 2 / 1 |
| 39 | 22.2 / 22.6 | 10 / 4 | 23.2 / 24.0 | 2 / 2 | 2 / 2 | 23.0 / 25.0 | 1 / 1 |
| 40 | 22.4 / 23.4 | 2 / 2 | 23.2 / 24.4 | 1 / 1 | 1 / 3 | 23.2 / 25.2 | 1 / 1 |

**Read.** The walk and the cheap away digging carried the road. With the rules alone (run 2) chapter one ends on day 18.0 / 15.2 and
prove levels take 4 to 8 tries: their Gates (6 to 9.5 x the formula) had never been fought, the walk finished them. Chapter two stops
at level 24 / 24: the crew can no longer dig ground 3e12 harder at plain cost, and the player's hit over its chapter-one slot is about
1e12 at level 21 and about 1e10 from level 25 on (hit at arrival, run 3: `c2:dunes:150` 3e17 against `dunes:150` 4e7), while every
block, Rock and Gate of chapter two was 3e12 harder. In run 3 tries at levels 25 to 27 end on the Big Rock above the Gate or at the Gate
(swings at arrival 6.6 M to 34 M against 22 k to 156 k at the slot).

- **Decided (14 Oct 2026, balance-analyst's field, done in this branch): prove Gates are cut to about 1.5 times the learn level's Gate in
  swings at arrival** (`gateMul` prove entries 8.87, 7.49, 7.99, 6.23, 9.43, 9.45, 6.37, 4.34 -> 3.0, 1.4, 1.9, 2.7, 3.5, 2.4, 1.9, 1.4;
  level 17 0.126 -> 0.09), because a prove Gate is now always fought and was sized when it never was (run 2: prove swings 3 to 13 x the
  learn level's). `proveHp` stays 6: no try failed for want of reaching the Gate. Run 4: prove swings 0.2 to 8 x the learn level's, median about 1 (seeds differ most at levels 8 and 10).
- **Decided: chapter two is its chapter-one slot made `ch2Hp` x `ch2Hard[level]` harder in everything** (ground, Big Rocks, Gate;
  `gateMulCh2` 21-36 copy `gateMul`, the Empty Quarter 0.06 / 2.0), because the player's lead over the slot falls by about x5 per 25 m
  (hit x10 per 25 m in chapter two, x50 in chapter one), so one `ch2Hp` is a wall from level 25 on. `ch2Hp` 3e12 and `ch2Stars` 5e3
  stay. `ch2Hard` = 0.5, 0.3, 0.03, 0.015, 1e-3, 5e-4, 1e-4, 3.3e-5, 7e-6, 2e-6, 8e-7, 2.5e-7, 2.5e-7, 6e-8, 5e-8, 1.5e-8, 6e-9,
  2e-9, 8e-10, 3e-10. Levels 21 to 27 set from run 3's hit at arrival; levels 28 to 40 scaled from run 4's swings at arrival to about
  30 k (the Gate's hp is linear in the entry), which run 5 confirms: swings at arrival 12 k to 97 k at levels 28 to 40, fights 1 to 6 min.
- **Decided: the site's own hardness (1.2 to 1.35, `genRow`) stays out of `groundHp`**, because it is not a `row` hook, is the same for
  every level of a site, and `away.rowCost` 1.9 was set without it; with it in (run 2) levels 3 and 4 took 2 tries.

**Run 5 against the targets.** Level 20 on day 15.0 / 14.6 (10 to 15: met, at the edge). **Level 40 on day 23.2 / 24.4 (18 to 25:
met).** Levels 21 to 40: 1 to 3 tries, except level 28 (5 / 3, median 4). Above 3 median tries in chapter one: levels 13 (4), 17 (4),
19 (4.5); level 17 and 19 each stall once (38 and 45 digs between on one seed), the late-learn-level wall (Known walls, #397).
Prove levels at least as many tries as their learn level: no (levels 8, 12 on one seed each). Run 6 (level 28 at 2e-5) moved level 28 to
3 / 1 but put level 30 at 3 / 4 and level 40 on day 23.2 / 25.2 (out by 0.2 days on seed 2), so run 5's table is kept: the two runs
differ by about the noise of one seed. Open: level 28 at median 4; chapter one's late learn levels (#397).

### Camp steps count, and the late learn levels open in three tries (14 October 2026, 4 sims, #394 #397 #398)

Before = `main` at 0e12d07 (run 5 above). After = this branch: `starshop.campShare` 0 -> 0.02 (plain Camp steps only), The Pick past
step 20 x1.35 a step (was x1.5), prove Gates of levels 18 and 20 (and 34, 36) 1.9 / 1.4 -> 1.2 / 0.8, `ch2Stars` 5e3 -> 2e3, and the
sim player saves its Stars for The Pick at a level it has tried twice. Mixed, 2 seeds, seed 1 / seed 2. "Other digs" = digs on other
cards since the level before was finished (the level's own tries left out; `roadLevels` in `dig-month.mjs`).

SUM before: `mixed: fin1 10.4m fin4 d0.3 5.4/day vers 78/164 med 78f8h share 78% (78%) Stars 397.2k/1.4T depth 238/275/400 R4 d0.6 R6 d2.3 R8 d5.3 news 100%`
SUM after: `mixed: fin1 10.4m fin4 d0.3 5.3/day vers 85/162 med 85f7h share 80% (80%) Stars 236.1k/909.9B depth 217/283/413 R4 d0.6 R6 d3.0 R8 d5.6 news 100%`

| Level | Before: day | tries | other digs | **After: day** | tries | other digs |
|---|---|---|---|---|---|---|
| 1 | 0.0 / 0.0 | 1 / 1 | 0 / 0 | **0.0 / 0.0** | 1 / 1 | 0 / 0 |
| 2 | 0.2 / 0.2 | 1 / 1 | 0 / 0 | **0.2 / 0.2** | 1 / 1 | 0 / 0 |
| 3 | 0.2 / 0.2 | 1 / 1 | 0 / 0 | **0.2 / 0.2** | 1 / 1 | 0 / 0 |
| 4 | 0.4 / 0.2 | 1 / 1 | 1 / 0 | **0.4 / 0.2** | 1 / 1 | 1 / 0 |
| 5 | 0.6 / 0.6 | 1 / 2 | 2 / 0 | **0.6 / 0.6** | 1 / 2 | 2 / 0 |
| 6 | 1.0 / 1.2 | 1 / 5 | 2 / 0 | **1.0 / 1.2** | 2 / 1 | 0 / 2 |
| 7 | 1.2 / 2.0 | 1 / 3 | 0 / 2 | **2.0 / 1.6** | 4 / 3 | 9 / 2 |
| 8 | 1.6 / 2.0 | 2 / 1 | 1 / 0 | **2.4 / 2.2** | 2 / 2 | 0 / 0 |
| 9 | 2.2 / 2.4 | 2 / 1 | 0 / 1 | **2.4 / 3.6** | 1 / 2 | 0 / 6 |
| 10 | 2.6 / 3.2 | 2 / 4 | 1 / 0 | **3.0 / 4.4** | 2 / 4 | 1 / 0 |
| 11 | 3.0 / 4.0 | 2 / 3 | 0 / 3 | **3.6 / 5.0** | 3 / 3 | 3 / 2 |
| 12 | 3.4 / 4.2 | 4 / 1 | 0 / 0 | **4.2 / 5.6** | 3 / 3 | 0 / 1 |
| 13 | 5.0 / 5.6 | 4 / 4 | 10 / 9 | **4.6 / 6.6** | 2 / 3 | 0 / 4 |
| 14 | 5.4 / 6.2 | 2 / 2 | 1 / 0 | **5.6 / 7.2** | 4 / 2 | 0 / 0 |
| 15 | 6.0 / 7.2 | 2 / 2 | 0 / 2 | **6.6 / 8.0** | 3 / 3 | 3 / 3 |
| 16 | 7.0 / 8.2 | 3 / 3 | 1 / 2 | **7.2 / 8.6** | 2 / 1 | 1 / 2 |
| 17 | 7.4 / 12.6 | 2 / 6 | 0 / 32 | **9.0 / 9.2** | 3 / 1 | 5 / 1 |
| 18 | 8.0 / 13.0 | 3 / 1 | 0 / 0 | **9.6 / 10.0** | 3 / 3 | 1 / 1 |
| 19 | 14.4 / 14.0 | 6 / 3 | 39 / 3 | **10.6 / 11.2** | 3 / 3 | 4 / 2 |
| 20 | 15.0 / 14.6 | 2 / 4 | 0 / 0 | **11.0 / 12.2** | 1 / 4 | 0 / 0 |
| 21 | 15.0 / 15.6 | 1 / 1 | 0 / 6 | **11.4 / 12.4** | 1 / 1 | 2 / 1 |
| 22 | 15.0 / 16.2 | 1 / 2 | 0 / 9 | **11.6 / 12.6** | 1 / 1 | 0 / 0 |
| 23 | 15.2 / 16.2 | 1 / 1 | 1 / 0 | **12.0 / 13.2** | 1 / 2 | 2 / 9 |
| 24 | 16.0 / 16.6 | 1 / 2 | 3 / 0 | **12.0 / 13.4** | 1 / 1 | 1 / 2 |
| 25 | 16.2 / 16.6 | 1 / 1 | 0 / 0 | **12.2 / 13.6** | 1 / 1 | 0 / 0 |
| 26 | 16.4 / 18.0 | 1 / 2 | 0 / 3 | **12.2 / 14.2** | 1 / 1 | 0 / 2 |
| 27 | 17.0 / 18.6 | 3 / 3 | 0 / 1 | **12.6 / 14.6** | 1 / 2 | 0 / 1 |
| 28 | 18.2 / 19.4 | 5 / 3 | 2 / 1 | **14.0 / 15.2** | 2 / 3 | 11 / 1 |
| 29 | 19.0 / 20.0 | 2 / 3 | 4 / 0 | **14.2 / 15.6** | 3 / 2 | 0 / 0 |
| 30 | 19.4 / 20.6 | 2 / 1 | 0 / 2 | **14.4 / 15.6** | 2 / 1 | 0 / 0 |
| 31 | 20.0 / 21.0 | 3 / 1 | 0 / 0 | **15.4 / 16.4** | 1 / 2 | 2 / 1 |
| 32 | 20.2 / 21.2 | 1 / 1 | 0 / 0 | **15.6 / 16.6** | 1 / 2 | 0 / 0 |
| 33 | 21.2 / 21.6 | 3 / 3 | 9 / 0 | **16.0 / 18.0** | 2 / 1 | 0 / 3 |
| 34 | 21.4 / 22.0 | 1 / 1 | 1 / 0 | **16.2 / 18.2** | 1 / 2 | 0 / 0 |
| 35 | 22.0 / 22.6 | 2 / 3 | 0 / 0 | **17.0 / 18.6** | 2 / 2 | 1 / 0 |
| 36 | 22.2 / 22.6 | 1 / 1 | 0 / 0 | **17.6 / 18.6** | 1 / 1 | 3 / 0 |
| 37 | 22.4 / 23.2 | 1 / 2 | 1 / 0 | **18.0 / 19.0** | 1 / 1 | 0 / 0 |
| 38 | 22.6 / 23.4 | 1 / 1 | 0 / 1 | **18.2 / 19.2** | 1 / 1 | 0 / 1 |
| 39 | 23.2 / 24.0 | 2 / 2 | 0 / 0 | **18.4 / 20.0** | 2 / 1 | 0 / 2 |
| 40 | 23.2 / 24.4 | 1 / 1 | 0 / 2 | **18.6 / 20.2** | 1 / 1 | 0 / 1 |

The four sims (one `--ab` run each, summary lines only):

| Run | Variant | L13 / L17 / L19 tries | L20 day | L40 day | Note |
|---|---|---|---|---|---|
| 1 | main | 4/4, 2/6, 6/3 | 15.0 / 14.6 | 23.2 / 24.4 | before |
| 1 | `campShare` 0.02 | 3/4, 1/3, 5/5 | 15.0 / 15.4 | 22.0 / 24.6 | road end -5% / +1%: the Camp alone moves the road under 10% |
| 1 | `campShare` 0.05 | 3/3, 4/3, 4/5 | 15.4 / 15.6 | 22.0 / 22.4 | Stars by day 7 397 k -> 117 k |
| 1 | 0.02 + Pick x1.35 past 20 | 3/4, 4/3, 4/4 | 13.2 / 14.0 | 18.6 / 18.0 | |
| 2 | 0.02 + stuck player saves for The Pick | 2/3, 3/3, 3/4 | 13.0 / 14.2 | 21.6 / 22.2 | |
| 2 | + learn Gates 13, 17, 19 x0.3 | 1/2, 3/3, 4/4 | 14.6 / 14.2 | 22.2 / 21.6 | the Gate is not the lever |
| 2 | + Pick x1.35 | 2/3, 3/1, 3/3 | 11.4 / 12.0 | 17.6 / 17.6 | road end out by 0.4 days |
| 3 | + Pick x1.35, `ch2Stars` 2e3 | 2/3, 3/1, 3/3 | 11.4 / 12.0 | 22.0 / 19.0 | level 20: 4 / 4 tries |
| 3 | `provePay` 2.5 instead of the Pick | 3/3, 3/3, 4/4 | 15.0 / 13.0 | 22.6 / 22.2 | |
| 4 | **+ prove Gates 18, 20 at 1.2 / 0.8 (shipped)** | **2/3, 3/1, 3/3** | **11.0 / 12.2** | **18.6 / 20.2** | level 20: 1 / 4 |
| 4 | same, `ch2Stars` 2.5e3 | same | same | 16.4 / 18.6 | |
| 4 | same, prove Gates 0.85 / 0.63 | 2/3, 3/1, 3/3 | 11.2 / 12.2 | 19.4 / 18.4 | level 20: 3 / 3 |

**What held the late learn levels.** Per try at levels 13, 17 and 19 (main, `dump.gates`): the Gate at arrival was 60 k to 140 k swings
and fell when 0.6 k to 2.6 k were left; between tries the bank grew 0.2 to 0.3 a try (TNT's 30% plus the Gate's 60% memory) and the
hit x3 to x10 from Stars earned on side cards. A third of the tries at 17 and 19 ended on the ground above the Gate (226 to 259 m),
not at it. So a smaller Gate does little (run 2, x0.3: same tries) and the Stars between tries decide it: the sim player spent them
evenly on three tracks, one Pick step in three.

- **Decided (14 Oct 2026, by balance-analyst): `campShare` = 0.02, on the plain Camp steps only** (4, 6, 8, 10, 11, then every step from
  13; the named steps keep their perk and add nothing more), because design-keeper decision 7 asks for "a small share" on the plain
  steps and the road to move under 10%: at 0.02 the road end moved -5% / +1% (run 1); 0.05 cut Stars by day 7 from 397 k to 117 k. A
  Rafeeq goes from 60% of your hit to 62%, 64% ...: about 106% at Camp step 30 (chapter one's end) and 160% at step 60. A Pick step
  is still the bigger buy (x1.5 for you and every Rafeeq).
- **Decided: The Pick costs x1.35 a step past step 20** (`starshop.pickLateFrom` 20, `pickLateGrow` 1.35; Camp and Bag keep x1.5;
  steps 1 to 20 and every Star already spent unchanged), because the late levels are held by Stars and this is the lever that reaches
  the hit (Stars^1.35 instead of Stars^1 for The Pick). It took level 19 from 6 / 3 to 3 / 3 together with the policy below.
- **Decided: the sim player saves its Stars for The Pick at a road level it has tried twice** (`starshop.botStuckPick`, sim only,
  `sim/proto/player.mjs`), because that is what the game tells a person there: the Rock bar's hint says "spend Stars on The Pick" with
  a button for it, and the side cards say how many Stars the next Pick step needs. Before, it spread every Star over three tracks even
  when stuck. Elsewhere it still buys the cheapest step, Pick first (an even spend).
- **Decided: `ch2Stars` 5e3 -> 2e3**, because the cheaper Pick also makes chapter two's Stars buy more hit, which took the road end to
  17.6 / 17.6 (out of 18 to 25); at 2e3 it is 18.6 / 20.2 (2.5e3 gave 16.4 / 18.6: the noise of one seed is about 2 days here).
- **Decided: the prove Gates of levels 18 and 20 are 1.2 and 0.8** (were 1.9 and 1.4; `gateMulCh2` 34 and 36 copy them, decision of
  run 5), because with the learn levels faster the player meets them with fewer Stars: level 20 took 4 / 4 tries at 1.4. 0.85 / 0.63
  gave the same within noise (3 / 3), so the smaller cut ships.
- **Decided: `--assert` checks the road** (#398): the day each land is first finished (levels 4, 8, 20 and 40 asserted; 12 to 36 shown)
  and, per road level, median tries at most 3 and other digs at most 6 (each x1.25, `TOL`), for mixed and active. The old Big Rock rows
  4 to 8 (mixed day 3 to 30 for 100 to 200 m) are gone; rock 3 (75 m) moved from mixed day 0.4-2.5 to 0.1-1 (it is level 3 now).
  `node scripts/dig-targets.mjs <dump>` reads the same targets from a dump without a new sim.

**Against the targets.** Levels 13, 17 and 19 at 3 tries or fewer on both seeds: met (2 / 3, 3 / 1, 3 / 3). Level 20 on day 11.0 /
12.2 and level 40 on day 18.6 / 20.2: met. `--assert` road rows on `main` (run 1 dump): land days all ok; levels 13, 17, 19 (4, 4, 4.5
tries; 9.5, 16, 21 other digs) and 28 (4 tries) over. After: every level at most 3.5 median tries (7: 4 / 3, the only one above 3)
and at most 6 median other digs: the `--assert` road check passes. **Not met:** level 7 is 4 / 3 (main 1 / 3; two of seed 1's tries
end at 101 and 102 m, the player leaving just under the 100 m Rock); levels 9 to 12 come 0.4 to 1.4 days later (cause not measured, see
Known walls); prove levels take at least as many tries as their learn level at 10, 12, 18 only (6, 8, 14, 16, 20 miss on one seed
each; main missed at 8, 12, 14, 18, 20). Stars by day 7 397 k -> 236 k.

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
| Late learn levels 15, 17, 19 (and 7): 3-4 tries, 7-11 other digs before level 19 (active 19-36) | Per 25 m below 225 m the ground formula (dirt and Gate) grows `1.175^25 x step` = x110 to x170 (`proto/core/rules.js:30-31`); Stars grow x4.5 (`starGrow`, `proto/core/rules.js:35`) and a Pick step is x1.5 hit for x1.5 price (`proto/features/starshop/rules.js:28,30`), so all the Stars of a depth buy x4.5. `gateMul` (`proto/features/sites/rules.js:51`, 0.126 and 0.0645 at levels 17 and 19) closes most of the gap; the rest is closed by replays at 0.25 of a floor's worth (`replayShare`, `sites/rules.js:60`). Level 19: 4.3M pick hits at arrival, 172k / 503k at the winning try: x9-25 bought with Stars from other digs | The Pick x1.35 a step past 20 and the stuck player saving for it (Camp steps count, above) | **closed** for 13, 17, 19 (3 tries or fewer on both seeds); level 7 open (4 / 3) |
| Levels 9 to 12 come 0.4 to 1.4 days later with stronger Rafeeqs (`campShare` 0.02 alone: level 8 day 1.6 / 2.0 -> 2.0 / 2.6, Stars by day 7 397 k -> 189 k; at 0.05: 117 k) | Not measured. Likely: time away is dug at the crew's hit (`awayDps`, `proto/features/diggers/rules.js`), so a stronger crew brings the dig to the Gate while away; the player then meets the Gate with the rows above it (their TNT, 30% of the Gate a try, `blastCap`) already gone, and leaves after 240 s with no new metre (`MOVE.giveUp`) | Next pass: log per try whether the Gate was reached while away, and its blast share, `campShare` 0 against 0.02 | open |
| Prove levels 10, 14, 18 (and 8, 16, 20 often): 1 try right after a hard learn level | `learnPay 0.35` / `provePay 1.65` (`sites/rules.js:63`): the learn level is where the Stars-gap is paid off by grinding, and the player arrives at the prove level already over-strong; `proveHp 6` (`sites/rules.js:48`) and prove `gateMul` 6-9 do not catch up | Retune prove `gateMul` after the learn-level change below lands (one sim) | open |
| Road too short: level 20 on day 8-11, target 18-25; from level 9 on every level is about 2x early (**closed**: chapter two, #418 and the 14 Oct balance pass, road end day 21.0 / 19.0) | Same constants as the first row, the other way: early depths (100-175 m) grow x43-x97 a leg against Stars x4.5 plus the chili hit, so levels 9-14 fall in 1-3 tries a day apart | Not a price fix: slowing levels by price brings back the grind. Done: chapter two | decided (dig-design decision 6: level 20 day 10-15, level 40 day 18-25) |
| Hits per dirt block 80 to 14 000 by hand mid-leg (target 2-6) | Ground grows `hp` 1.175-1.21 a row = x48-x117 a leg (`proto/core/rules.js:25-31`) while your hit grows x3.7 a leg (`valGrow 1.10`, `powGrow 1.25` at x1.5 price, `buyPow 0.55`, `rules.js:17,20,33`); prove ground x6 on top. Blast chains do 70% of the damage, so the player does not feel the pick at all | Builder brief: fresh-eyes study package 3 (steady ground, sharp Rocks): in-leg `hp` near 1.05 a row (= the pick's x3.7 a leg) with the rest moved into each 25 m `step`, and the ground's level set from the pick the road expects, the Gates kept by raising `gateMul` by the same factor. Rule-shaped (ground formula and Gate sizes move together); not a params-only PR | brief |
| Chapter two, levels 27 to 40: the player cannot hurt the Gate (**partly closed**: per-level Gates, v5.33.2, levels 27 to 29 fought 2 to 8 min; 30 to 40 in the next two rows) | Before v5.33.2, at `ch2Stars` 2e3 the hit falls behind from level 27: swings at arrival x10 to x20 the chapter-one slot at 27 to 30 (175 k to 2.3 M against 9 k to 137 k); at 31 to 36 the player never hits the Gate in the winning try; Empty Quarter learn Gates 1.6 G and 11 G swings. They fall in 1 to 3 tries to TNT (`boss.blastShare` 0.02 a barrel, `blastCap` 0.3 a try) and the Gate's memory (`gateShare` 0.6), so the fight at 37 and 39 lasts 21 to 24 minutes whatever the Gate's size | A Gate size per chapter-two level (`gateMulCh2` 20 entries; `gateMulOf` and `test_proto_rocks.js` change by two lines); done (Gate per level pass) | closed for 27-29 |
| Gates walked past while away: chapter-two levels 30 to 36 (some tries of 28, 29) and chapter-one prove levels finish with no hit on the Gate | `awayWalk` (`sp_wake`, `proto/features/starshop/rules.js`) passes every Rock of a layer up to `s.starBoss` and sets `s.bossesDown`, which is the level's finish check (`bossesDown * LAYER >= floor`). Chapter two repeats depths broken in chapter one; a prove level repeats its learn level's depth. Probe with the Gate not walkable: level 20 day 16.6 / 18.2 (was 12.6 / 11.4), road stops at level 33 / 32 | Rule: the Gate row of the level in play (`r.floor`, run not done) is never `passable`; then retune `gateMul`, `proveHp`, `ch2Stars` (the walk carries the pacing today). Away digging also prices hard ground as plain (#429), fixed in the same branch | built (the Gate is yours, #430 + #429); retuned: road end day 23.2 / 24.4 |
| Levels 37 and 39: 4 to 10 tries, 10 to 26 other digs | The player stalls on the last rows above the Gate at 300 / 325 m (own hits on the Gate under 1% in failed tries, give-up after 240 s); the Gate falls to TNT (30%) plus its memory at any size (2e-4 or 2e-9). `ch2Hp` 3e12 on ground that grows x110 to x170 per 25 m | Next pass: log what the sim player hits in those 240 s (a sim-player stall in the Hot layer, or real ground); if ground, a per-depth `ch2Hp` (allowed: dig-design decision 15) | open, #431 |
| Stars by day 30 at T (fault 12; 8.4 T at `ch2Stars` 5e3) | Chapter two needs the hit x10^12 over 20 levels like chapter one; the hit grows about as Stars^1.9 (levels 21 to 36: hit x3e11 for Stars x1.3e6), so Stars must grow about x10^6 from the 1.5e7 at level 20. After level 40 the free deal is chapter-one ground at 350 to 400 m (`starsAt(400)` = 4.1e9 a floor). x10 of 0.8 B is out of reach by params | One coin at any size; target retired | decided (dig-design decision 14) |
| Side cards beside a stuck chapter-two level pay almost nothing | `card(s, site, floor, twist)` makes every twist chapter one (`ch = !twist && ch === 2 ? 2 : 1`), so beside a chapter-two level the side cards pay chapter-one Stars, about 2,000 times less | Builder: deal chapter-two side cards (replay or medal of a chapter-two level) beside a chapter-two level | brief |
| Old windows in `dig-month.mjs` | `TARGETS` rock5-rock8 (`sim/proto/dig-month.mjs:61-64`) ask mixed day 7-12 / 14-26 / 16-23 / 21-30 for the 125-200 m Rocks; measured day 2.0 / 2.6 / 3.2 / 4.0-5.0, so --assert fails them all | Replace with rows read from `fin` per road level (like `scripts/dig-levels.cjs`): mixed level 7 day 2-3, level 9 day 3.5-5, level 11 day 5.5-7.5, level 13 day 8-10, level 20 day 18-25; plus a tries row (median tries per level at most 3, prove levels at least 2 from level 9) and a "digs between" row (at most 6 before any level) | **closed** (#398): land days and per-level tries / other digs, see Camp steps count |

### The smallest next change (built 14 Oct 2026 as x1.35 past step 20, with the stuck player saving for it; kept for the reasoning)

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
| 14 Oct 2026 | `starshop.campShare` (plain Camp steps only) | 0 (every step) -> 0.02 (plain steps) | #394, decision 7: a Camp step did nothing | road end 23.2 / 24.4 -> 22.0 / 24.6 alone |
| 14 Oct 2026 | `starshop.pickLateFrom`, `pickLateGrow` (new) | x1.5 every step -> x1.35 past step 20 (Pick only) | #397: late learn levels held by Stars | levels 13 / 17 / 19 median 4 / 4 / 4.5 -> 2.5 / 2 / 3 (with the next row) |
| 14 Oct 2026 | `starshop.botStuckPick` (sim player, new) | even spend -> The Pick only at a level tried twice | A person follows the Rock bar's "spend on The Pick" | see the row above |
| 14 Oct 2026 | `sites.ch2Stars` | 5e3 -> 2e3 | The cheaper Pick took the road end to 17.6 / 17.6 | road end 18.6 / 20.2; Stars by day 30 1.4 T -> 910 B |
| 14 Oct 2026 | `sites.gateMul` 18, 20 (and `gateMulCh2` 34, 36) | 1.9, 1.4 -> 1.2, 0.8 | Level 20 at 4 / 4 tries once the learn levels sped up | level 20 1 / 4 tries, day 11.0 / 12.2 |
| 14 Oct 2026 | `dig-month.mjs` `TARGETS` | Big Rock days rock4-rock8 -> land days and per-level tries / other digs | #398 | main: 7 road misses; after: 0 (level 7 at 3.5, within x1.25) |
| 14 Oct 2026 | `sites.gateMul` (prove entries, level 17) | 8.87, 7.49, 7.99, 6.23, 9.43, 9.45, 6.37, 4.34 -> 3.0, 1.4, 1.9, 2.7, 3.5, 2.4, 1.9, 1.4; 0.126 -> 0.09 | The Gate is yours: prove Gates are fought now (run 2: 4 to 8 tries) | level 20 day 18.0 / 15.2 (rules only) -> 15.0 / 14.6 |
| 14 Oct 2026 | `sites.ch2Hard` (new), `gateMulCh2` | one `ch2Hp` for all of chapter two -> x `ch2Hard[level]` (0.5 to 3e-10) on ground, Rocks and Gate; `gateMulCh2` 21-36 = `gateMul` | Run 2 stopped at level 24 / 24: chapter-two ground priced honestly is a wall | head only (run 4): road stops at level 34 / 33; with the tail (run 5): road end 23.2 / 24.4, Stars by day 30 1.4 T |
| 14 Oct 2026 | `sites.gateMulCh2` | 4 entries (levels 37 to 40; 21 to 36 read `gateMul`) -> 20 entries, one per chapter-two level (`gateMulOf`) | Levels 27 to 30: Gate x10 to x20 the chapter-one slot in swings at arrival | levels 27 to 29 fought 2 to 8 min (slot 0.5 to 7 min); 30 to 40 unchanged (walk, ground) |
| 14 Oct 2026 | `sites.ch2Stars` | 2e3 -> 5e3 | Road end 29.0 / 23.4 on main after v5.33.1 (25.4 / 28.0 with the new Gates) | road end 22.4 / 23.4; Stars by day 30 1.8 T -> 8.4 T |
| 14 Oct 2026 | `sites.ch2Stars` | 2e5 -> 2e3 | Chapter two paid the player past the next levels: road end 24.2 / never, Stars 68 T | road end 21.0 / 19.0; Stars by day 30 2.1 T |
| 14 Oct 2026 | `sites.gateMulCh2` | 0.003, 1.05, 4e-4, 0.2 -> 7.5e-4, 1.05, 2e-4, 0.2 | Empty Quarter learn Gates (level 39 never finished on seed 2) | no effect on the fight (TNT and the Gate's memory break it, see Known walls); level 39 in 1 / 3 tries |
| 14 Oct 2026 | `contracts.botChiliCap` (sim player) | none -> 1200 s | Seed 1 sat 3.8 h in one chili-4 dig at 275 m | levels 19 and 20 of seed 1 1.4 to 1.8 days sooner, levels 1 to 18 unchanged |
| 14 Oct 2026 | `MOVE.retryDigs` (sim player) | none -> 3 | Seed 2 never went back to level 39 (90 side digs) | level 39 finished on day 18.6 |
| 14 Oct 2026 | none | - | First measurement on main 69bb0f5 | see the tables above |

## How to run (frugal)

One sim at a time, in the foreground, redirected to a file; read only the summary lines.
`node sim/proto/dig-month.mjs --only mixed --seeds 2 --jobs 2 --sum --dump out.json > out.txt` (about 1.5 min; active about
2.5 min), then `node scripts/dig-levels.cjs out.json [--gates]` and `node scripts/dig-targets.mjs out.json` (the `--assert` targets, from the dump) (`--gates` adds the swings at arrival and the Gate fight seconds per level). Never above
`--jobs 3`. Several variants in one run: `--ab '[{...},{...}]'` (each variant also dumped to `out-ab<k>.json`), about 1.6 min per variant.
