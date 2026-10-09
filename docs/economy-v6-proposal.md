# Economy v6 proposal: a big hit every hour, a ceiling that keeps rising

Status: proposal (2026-10-09), not yet an issue. Owner feedback after two days on the post-R31
economy: too slow, the last generator is out of reach, new generators unlock that feel
unreachable, and the late game isn't exciting. Goal set by the owner: **the player always has a
next upgrade to look forward to, with a big hit at least every hour.**

The method: first classify the reward moments ("dopamine hits"), then map them to games that do
this well, then measure Aetheria's against the same scheme with the sim, then fill the gaps.

## 1. Taxonomy of dopamine hits

`docs/game-feel-guide.md` already covers **how loud** a moment is (feedback tiers T0-T3). Two
more axes are missing: **what kind** of reward it is, and **how often** it comes.

### 1.1 Kind: what the player is rewarded for

| Kind | The feeling | Driver (psychology) | Cost to make |
|---|---|---|---|
| **Growth** | "My numbers jumped" | Reward prediction error: a jump bigger than the usual trickle | Cheap: it's maths, endless |
| **Novelty** | "I've never seen that" | Novelty-seeking; the strongest and the fastest to fade | Expensive: art, text, code. Finite |
| **Completion** | "The bar is full" | Goal-gradient: effort and excitement rise as a bar nears full | Cheap once there's a bar |
| **Surprise** | "Lucky!" | Variable-ratio reward: unpredictable rewards keep checking alive | Cheap; must stay honest (rule 8) |
| **Mastery** | "I did that well" | Competence: the outcome follows from skill or timing | Medium: needs a real decision |
| **Release** | "Burn it down, come back stronger" | Loss then recovery; replaying old content at speed | Medium: a reset layer |
| **Recognition** | "Others see it" | Status, comparison | Medium: leaderboard, sharing |
| **Return** | "Welcome back, here's your haul" | Anticipation of the stockpile | Cheap |

### 1.2 Loop: how often it comes

Incremental games are nested loops. Each loop needs a **guaranteed maximum gap** and its **next
goal always visible** (goal-gradient needs a bar to look at).

| Loop | Target gap | Typical kinds | Loudness (game-feel tier) |
|---|---|---|---|
| L0 tick | seconds | Growth (number ticks), Surprise (crit), Mastery (combo) | T0 |
| L1 short | 1-5 min | Growth (a buy), Completion (contract step) | T0-T1 |
| **L2 session** | **≤ 1 hour** (owner target) | Growth spike, Completion, Surprise jackpot | T1-T2 |
| L3 day | 1-2 days | Novelty (new generator, new stratum), Release (prestige) | T2-T3 |
| L4 week | 1-2 weeks | Novelty (new mechanic or chapter), Release (bigger layer) | T3 |
| L5 season | month | Novelty (new layer or subgame), Recognition (season rank) | T3 |

Three rules follow:

1. **Growth fills the short loops, novelty pays the long ones.** Growth can be produced forever,
   but it fades if it's all there is. Every L3+ moment should show something *new*, not only a
   bigger number (rule P3 in the game-feel guide: rare = different).
2. **Budget the novelty across the year.** It's the finite resource. Spend it evenly: one new
   thing per L3/L4 interval, not everything in week 1.
3. **Each loop's reward has to beat the last one** (reward prediction error). A prestige that
   lands you where the last one did is a treadmill, however loud the ceremony.

## 2. How other games map onto it

| Game | L1-L2 (minutes to an hour) | L3-L4 (days to weeks) | L5 (season) | Lesson for us |
|---|---|---|---|---|
| **Revolution Idle** ([wiki](https://revolutionidle.wiki.gg/wiki/Prestige)) | Next circle opens after 5 levels of the previous one; **per-circle Ascension** at max level (back to level 5, Mult gain x10, cap +10) | Prestige, needing 1-2 orders more each time; Promotions | Infinity, Eternity, Singularity | A micro-prestige *on one generator* gives a Growth hit inside every run. Rewards scale with log(score), and each loop has to beat the last |
| **Antimatter Dimensions** | Buy-10 doubles a Dimension; Dimension Boosts and Galaxies every few minutes | Infinity, Challenges | Eternity, Reality: each layer adds *new mechanics* | Each bigger loop pays in Novelty, not only multipliers |
| **Cookie Clicker** | Golden Cookie (Surprise), building upgrades at 1/5/25/50/100… (Growth) | New building (Novelty), Ascension | Seasons, sugar lumps (Return) | Fixed count milestones give a steady Growth rhythm |
| **Egg, Inc.** | Research buys, drones and gifts (Surprise) | **New egg** (Novelty: new art, new world), prestige | Contracts with others (Recognition) | Each new tier is a different-looking world, not a recolour |
| **NGU Idle** | Many systems in parallel, one is always near a goal | New feature per difficulty | Hard and Evil modes | Parallel bars keep Completion hits dense |

## 3. Aetheria today, measured

`sim/core-pacing.mjs` with hit logging, casual player (10 min an hour), subgames off.
Median gap / longest gap, in wall time.

| Hit (kind, loop) | day 0-1 | day 1-7 | day 7-30 | day 30-180 | day 180-365 |
|---|---|---|---|---|---|
| New generator, first ever (Novelty, L3) | 4.8h / 11h | 3.8d / 3.8d | 8.2d / 12d | 11d / 103d | none |
| New milestone record (Growth, L2) | 1.4h / 7.3h | 12h / 2.4d | 24h / 5.7d | 11h / 93d | 2.3h / 97d |
| Upgrade bought (Growth, L1) | 22m / 1.9h | 23m / 14.5h | 10m / 19h | 5m / 22h | 5m / 5h |
| Transcend (Release, L3) | none | 6d / 3.5d | 5.8d / 6.8d | 3d / 15d | 16h / 4.3d |
| CPS reaches a new order of magnitude (Growth, L3) | 7.4h / 9.9h | 32h / 3.6d | 8.2d | 20d / 94d | 185d |
| **Any big hit (not counting buys)** | 9m / 5.4h | 1.5h / **2.4d** | 2.5h / **5.5d** | 24h / **11d** | 14h / 4.3d |
| **Hours with at least one big hit** | 29% | 8% | 3% | 2% | 5% |

Gaps, by loop:

- **L2 (the hour) is nearly empty** after day 1: 2-8% of hours have a big hit (idle player 1-7%). Upgrades fill
  L1, but they're +20% nudges and can stall for 14-19 h.
- **L3 Novelty is slow, and stops.** Tier 8 on day 7, tier 12 on day 43, tiers 16-20 never
  (idle player: tier 8 on day 14).
- **Novelty is front-loaded.** Every tab (Tower, Excavation, Grimoire, Bounties, Garden,
  Alchemy, New Well, Constellations, Dallah, Bazaar) unlocks from early play: Tower floor 40,
  depth 15, first Ascension. Only the Chronicle waits. After week 1 the only new things are
  generator tiers, and they stop too.
- **L4-L5 Release is a treadmill.** A Chronicle pays Pages at +20% each, added, so every loop
  peaks at ~1e17 from month 6 on (rule 3 broken). Month peaks (log10): 12.3, 14.7, 14.7, 13.9,
  14.7, 17.0, 17.1, 17.0, 17.0, 17.1, 17.1, 17.2.

## 4. Experiments

Throwaway knobs on the real game classes (`scratch/economy-v6-experiments.patch`).

### 4.1 Pure buffs only move the wall

Tier 1 x10, tier output ratio 4 to 6 or 7, x1.5 global per tier owned at 25, dust exponent 0.3,
multiplicative shards: each one races through all 20 tiers in 2-4 weeks, then sits at the same
1e17 and fires 100-250 Chronicles a year. Without a new loop, speed alone doesn't help.

### 4.2 Fixing the ceiling: multiplicative Pages, record-gated Chronicles

Pages x1.06 each, multiplied, makes peaks climb but causes reset spam (1,000+ Chronicles a year).
Adding Revolution Idle's rule (**a Chronicle needs a run 10x bigger than your best before the
last Chronicle**) settles it at ~10 a year, and every month beats the last.

### 4.3 Filling the hour: generator Overclock

Revolution Idle's per-circle Ascension, adapted. **Overclock** a generator tier once you own
enough of it. Its count goes back to 0 and its output is x10 for the rest of the run. Half of the
price progress is kept, so rebuying is a quick burst of cheap purchases that soon overtakes the
old output. The next Overclock of that tier needs 15 more owned. Overclocks reset on Ascension,
so every run has them.

Getting the strength right matters:

| Overclock setting | Hours with a big hit (d1-7, d7-30) | Highest tier ever bought | Verdict |
|---|---|---|---|
| none (candidate P from 4.2) | 14%, 7% | T20 day 142 | hour empty |
| at 50, x10 | 98%, 95% | T20 day 152 | good, early gaps |
| at 25, x5, price fully reset | 100%, 100% | **T6** | too strong: low tiers beat buying new ones, ladder dies |
| **at 25 (+15 per level), x10, half price kept** | **100%, 97%** | **T29 day 320** | **chosen** |

### 4.4 Candidate Q

- Tier 1 output 0.005 → **0.05** Oil/s.
- Generator milestones (x2 each): every 25 up to 300, then 350, 400, 450, 500.
- **Overclock**: at 25 owned, then +15 per level; x10 tier output; count back to 0 with half the
  price progress kept; resets on Ascension.
- **Tiers 21-30**: each Chronicle opens two more (on top of today's +1 per Transcend up to 20).
- Pages **x1.06 each, multiplied**; a Chronicle needs a run **x10 your best** before the last one.

| | today, casual | **Q, casual** | today, idle | **Q, idle** |
|---|---|---|---|---|
| Highest tier ever owned by day 1 / 2 | 4 / 5 | 10 / 11 | 4 / 5 | 9 / 11 |
| Tier 8 / 12 / 20 / 25 first owned | d7 / d43 / never / never | d0.2 / d2.2 / d20 / d132 | d14 / d81 / never / never | d0.6 / d2.3 / d26 / d169 |
| Hours with a big hit (d1-7, d7-30, d30-180, d180-365) | 8, 3, 2, 5% | **100, 97, 99, 100%** | 7, 3, 1, 3% | **100, 92, 98, 100%** |
| Longest gap between big hits (d1-7 / d7-30 / d30-180) | 2.4d / 5.5d / 11d | 1.1h / 3.2h / 3.9h | 37h / 6d / 15.5d | 38m / 3.2h / 3.6h |
| Month peaks, log10 (months 1, 3, 6, 9, 12) | 12.3, 14.7, 17.0, 17.0, 17.2 | 24.7, 25.7, 28.8, 30.8, 30.3 | 11.4, 14.9, 13.3, 17.0, 17.1 | 23.7, 24.9, 27.9, 29.9, 31.1 |
| Transcends / Chronicles a year | 257 / 28 | 123 / 8 | 129 / 14 | 129 / 9 |

What's still thin in Q, and is the content work in §5:

- **Novelty after month 1**: a new tier every ~30-60 days (T21 day 48, then roughly monthly).
  Growth hits now fill every hour; *new things* don't.
- **A few months dip** below the month before (a Chronicle landing early in the month). Rule 3
  wants every month higher; the record gate keeps this mild.
- The hour target is wall time with the casual player's schedule. It doesn't model sleep, and
  the subgames (which add more hits) are off.

## 5. Content plan: a novelty calendar

Growth is handled by Q. Novelty is the budget to spend, one new thing per L3/L4 interval, all
year. Each idea is tagged by kind and loop.

| When | New thing | Kind / loop | Notes |
|---|---|---|---|
| Every run | **Overclock** a tier; its card gets a level badge, and the art evolves at levels 3 and 6 (stall → shop → franchise) | Growth L2, Novelty L3 | The evolved art is what turns a x10 into "new" |
| Days 1-14 | Tiers 9-20 open (now ~1 a day; were 1 a week) | Novelty L3 | Already exists, just reachable now |
| Week 2-4 | **Subgame Dimensions** (agy's D x D x D): Excavation, Garden and Tower each get *their own* multiplier on Oil, multiplied together. Replaces the single capped pool in `WorldLinks.js` | Growth L3, Completion L2 | See §6; tested under Q with `--links` |
| Month 2+ | **Tiers 21-30**, two per Chronicle, each one a new themed world (Egg, Inc. lesson) | Novelty L4 | Placeholders in the sim; needs names, art and Arabic |
| Each Chronicle | A **Chapter rule** (exists: Chronicle chapters) plus one new mechanic per chapter, e.g. a new spell, Bazaar good or crop family | Novelty L4 | Antimatter Dimensions lesson: each layer adds a mechanic, not only a multiplier |
| Month 6+ | **Late exponent** Page upgrade: Oil^(1 + 0.002 per level), capped | Growth L5 | Tested: kicks in after month 10, so it belongs late |
| Always | A **visible "next"** for every loop: next Overclock bar, next tier cost, next Dimension milestone, next Chronicle record (x10 line) | Completion L1-L2 | The unlock teaser exists for tabs; extend it |

## 6. Subgames: Tower, Excavation, Garden

Same scheme per subgame. Sources: `npm run sim:tower` (casual: two 45-min sessions a day),
the mining sim results logged in `docs/STATUS.md` (R58/R68/R69), and the Garden code (no cadence
sim exists).

### 6.1 The shared problem: subgame wins don't reach the main game

Every subgame feeds Oil through **one additive pool capped at +150%** (`WorldLinks.js`):
+1% Oil per 10 bosses, +0.2% per depth, +0.2% per catalyst. A Warden kill is +0.1% Oil. In the
taxonomy, a subgame milestone is a Growth hit only *inside* its own tab. On the main screen it's
invisible. The cap was set because the links compounded to x200 by month one under R31 and broke
the slow-numbers target. Q's record gate now holds the ceiling, so the cap can go.

**Tested** (`sim/core-pacing.mjs --links` under Q, casual). One multiplier per subgame,
multiplied together: Excavation x1.35 per stratum reached, Tower x1.25 per 10 bosses, Garden x1.1
per 5 catalysts. The rest (Building Mastery, Enchanter, Treaty) stays in the capped pool.

| | Q, capped pool | Q, subgame Dimensions |
|---|---|---|
| Subgame multiplier on Oil, day 30 / day 365 | x2.5 / x2.5 | ~x90 / ~x20,000 |
| Hours with a big hit (d1-7, d7-30, d30-180, d180-365) | 100, 98, 100, 100% | 100, 100, 100, 100% |
| Longest gap between big hits (d7-30 / d30-180) | 2.6h / 3.0h | 1.0h / 35m |
| Month peaks, log10 (months 1, 6, 12) | 26.3, 29.7, 33.3 | 29.8, 33.2, 37.3 |
| Chronicles a year | 8 | 8 |
| Tier 20 first owned | day 13 | day 5 |

It's safe: the Chronicle count doesn't move, and the ceiling rises 3-4 orders. The cost is that
early tiers come faster and leave a gap (no new tier in days 7-30), so the Dimensions should start
small and grow with depth (strata past 151), Wardens and species, which are the late content
below. On screen, show the three as a line under the Oil counter ("Tower x3.4 · Mine x2.1 ·
Garden x5.0") and give each step up a T2 moment there, so a win in a subgame lands as a hit in
the main game.

### 6.2 Void Tower

| Hit | Kind / loop | Today |
|---|---|---|
| Floor cleared, crits, boss telegraph counters | Growth, Mastery L0 | fine |
| Boss every 10 floors, Sheikh every 50 | Growth L1-L2 | fast to floor 500, then rare |
| Gear drop by rarity, Mythics | Surprise L1-L3 | fine |
| Zone Guardian at 50/150/300/500/750/1000 (new zone) | Novelty L3 | 6 zones, then "The Wasta Dimension" forever |
| Warden every 250 floors, first-kill trophy | Novelty, Completion L3 | |

Measured (casual): floor 120 at 1 h, 300 at day 1, **500 at day 3, then 580 at week 1, 600 at
week 2, 720 at day 30**. After day 3, floors per play hour drop from 240 to 2-13, which is a boss
every ~5 hours of play, plus 1,494 deaths by day 30. That's the classic idle-RPG wall, and the
Tower has no prestige to break it. Zone novelty ends at floor 1000.

Proposals:

1. **Tower prestige ("Rebirth")**, as in Tap Titans and Clicker Heroes. At the wall, rebirth to
   floor 1 for permanent Tower power that scales with the best floor (log-scaled, like Revolution
   Idle's P.Mult). The re-climb of 500 floors in minutes is the Release hit. It turns the wall into
   a choice and gives an L2 reset loop in the Tower itself.
2. **Endless zones past 1000**: a new zone every 250 floors with a generated name, colour and
   **one monster rule each** (shielded, splitting, enrage timer). Cheap content (rules, not art),
   one Novelty hit per zone.
3. **Tower Dimension** (§6.1): every Guardian and Warden is a visible x-step on Oil.
4. **Deaths become progress**: when the hero dies to the same boss 3 times, they gain a "Grudge"
   stack (+X% damage on that boss) shown as a bar. The wall fills a Completion bar instead of
   only failing.

### 6.3 Excavation

| Hit | Kind / loop | Today |
|---|---|---|
| Tile break, crit, Super-Crit shockwave, ore (10%) | Growth, Surprise L0 | fine |
| Dynamite (25 s cooldown), Frenzy, drill abilities | Mastery L0-L1 | fine |
| Relic (1/200 tiles, pity 400), geode | Surprise L2 | 7 relics, then done |
| New stratum every 25 depth (7 strata, last at 151) | Novelty L3 | ends at Abyssal Heart |
| Pickaxe tiers | Growth L2 | |

Measured: the active player is at depth 118 on day 7, 158 on day 30 and 176 on day 60. Idle with
drills: 112 / 169 / 240 on days 1 / 7 / 60. **All 7 strata are cleared in the first weeks; after
that depth crawls about 1 a day and nothing new appears.** No digging happens while the game is
closed.

Proposals:

1. **Endless strata past 151**: a new stratum every 25 depth, each with a generated name, a
   recoloured palette and **one rule** (Molten: tiles regrow; Crystal: crits chain twice; Hollow:
   geodes x3 but half ore). One Novelty hit per stratum, from content that costs rules, not art.
2. **Core Breach** (Excavation prestige): at a depth record, breach and restart at depth 1 for
   Core Fragments (permanent pickaxe power, log-scaled by depth). The strata come back with a
   "+1 Breach" modifier, so the old ones feel new.
3. **Show the pity**: the relic and geode pity counters exist (`RELIC_PITY` 400); show them as a
   bar (goal-gradient, honest per rule 8).
4. **Mine Dimension** (§6.1): every stratum reached is a visible x-step on Oil.

### 6.4 Garden

| Hit | Kind / loop | Today |
|---|---|---|
| Plant, tap for growth, dewdrops | Growth, Mastery L0 | fine |
| Harvest (5 min - 2 h timers), Nectar Surge | Growth L1-L2 | the natural hour clock |
| Seed mutation to the next seed (25% a harvest) | Novelty L2 | 6 seeds found within hours |
| Hybrids (6, 30% a cross, from first Transcend) | Novelty L3 | found within days of day ~3.5 |
| Golden harvest (1%), Herbarium | Surprise L2 | |

From the code: the seed ladder mutates 25% per harvest, so all 6 seeds come within the first
sessions, and the 6 hybrids follow within days of the first Transcend. **The Garden's whole
discovery list (12 species) is used up in about the first week.** After that it's a timer chore
whose payoff (catalysts at +0.2% Oil each) is invisible.

Proposals:

1. **A deeper breeding tree**: hybrids of hybrids (6 tier-2 crosses, 3 tier-3, 1 legendary
   "Tree of Eternity"), with lower chances and some crosses opened by Chronicle chapters. That's
   16 more discoveries spread over months: icons and names, little code.
2. **Golden forms in the Herbarium**: each species' golden variant is its own entry (1% a
   harvest), a long-tail Surprise collection with a visible count.
3. **Garden Dimension** (§6.1): x per species discovered (agy's suggestion: 16 species
   ≈ x35), so each discovery is a visible Oil step.
4. **Weekly seasonal seed** via the Dallah calendar (the Calendar system exists): one seasonal
   crop a week, a Novelty hit with no grind.
5. **Overgrowth combo** (agy §4.2): harvest 4 ready plots within 5 s for a 30 s growth surge. A
   Mastery hit in every session.

### 6.5 Why this covers the hour

Each subgame has its own clock: Tower bosses (minutes, while open), Garden harvests (5 min-2 h,
offline too), Excavation strata and relics (an hour or so while open). With the Dimensions, any
one of them can deliver the hour's hit when the core loop is between Overclocks, which is the NGU
Idle lesson (parallel bars, one always near). That needs each subgame to keep producing *new*
milestones all year: endless zones, endless strata, the breeding tree.

## 7. What this changes, and the decisions needed

- **R31 and R57 targets go** ("~1e12 at two months", "late median ≤ 1e17"). They existed to
  stop runaway numbers; the record gate does that now. Proposed `sim:check` targets instead:
  ≥ 90% of hours with a big hit (casual and idle, days 1-365); every month's peak above the
  previous month's; tier 8 by day 1; a new tier at least every 45 days.
- **Saves**: Overclock adds two fields per generator (level, kept price index), default 0; the
  Chronicle gate adds the best run Oil at the last Chronicle, default 0. Old saves load as-is.
  Pages change meaning (additive to multiplicative), so that needs a migration step and a
  changelog line saying old Pages are now worth more.
- **Version**: MAJOR (it reshapes the economy and how saves progress).
- **Naming**: "Overclock" avoids a clash with Ascension (the prestige). Owner to pick the in-game
  name (and its Arabic).

### Suggested issues, in order

1. Q core: tier 1, milestones, Overclock (+UI card badge and bar), Pages multiplicative, record
   gate, sim model and new targets. One PR; Overclock UI follows the style guide and game-feel T2.
2. Tiers 21-30 opened by Chronicles: names, art, Arabic.
3. Subgame Dimensions, replacing the capped pool (§6.1), with the Oil-screen readout.
4. Tower: Rebirth and endless zones (§6.2). Mining sim / Tower sim targets updated.
5. Excavation: endless strata with rules, Core Breach, pity bars (§6.3).
6. Garden: breeding tree, golden forms, seasonal seed, Overgrowth combo (§6.4).
7. One new mechanic per Chronicle chapter.
8. Late exponent Page upgrade.

Subgame Dimensions test: add `EXP_DIMS=1` and `--links` to the Q command below.

How to reproduce: apply `scratch/economy-v6-experiments.patch` on a clean worktree, then for Q:
`EXP_T1CPS=0.05 EXP_MILESTONES=[10,25,50,75,100,125,150,175,200,225,250,275,300,350,400,450,500]
EXP_OC_AT=25 EXP_OC_STEP=15 EXP_OC_MULT=10 EXP_OC_KEEPCOST=0.5 EXP_MAXTIER=30 EXP_CHRON_TIERS=2
EXP_PAGEMULT=1.06 EXP_CHRON_RECORD=1 node sim/core-pacing.mjs --feel`.
