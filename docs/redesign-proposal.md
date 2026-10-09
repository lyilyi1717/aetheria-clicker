# Aetheria: Chronicles of Eternity — Year-One Redesign Proposal

**Status:** design review and redesign spec, written 2026-10-06 against v2.7.1
(`js/version.js`), branch `claude/dazzling-maxwell-6y04c5`. Read-only on game code; every
`file:line` is to the current tree.

**Author:** Mira Valen, Lead Systems & Retention Designer.

**Method.** I read every file in `js/engine`, `js/systems`, `js/main.js`, `index.html` and the
three existing docs, ran the test suite (`npm test`, all green), and wrote two headless Node
simulations in the session scratchpad (not committed):

- `sim_core_current.mjs` drives the real `GameState`, `BuildingSystem`, `PrestigeSystem` and
  `AchievementSystem` classes for 365 simulated days, subgames off, to isolate the Aether →
  Dust core. Profiles: `idle` (taps 1/s for the first 3 min of a run, then nothing) and
  `active` (2 clicks/s at full combo, all spells on cooldown, every Golden Anomaly, for 10 or
  60 minutes of every hour). Ascend rule: pending dust ≥ current dust, run ≥ 10 min.
- `sim_core_proposed.mjs` is a float model of the proposed core (§6) for the same year, with a
  "casual" presence schedule (two 45-minute sessions a day), used to tune the constants.

For the Void Tower, Excavation, Garden and Bounty numbers I reuse the measurements in
`docs/gamification-roadmap.md` §0, which were simulated on v2.6.0. `git log` shows those
systems have had only formatting changes since (`150a9fe`, `1ae4d47`), so the figures stand.

This document builds on `docs/gamification-roadmap.md` (unlock table, talent economy,
collections, daily/weekly structure) and `docs/game-theory-progression.md` (subgame curves).
Where I agree I say so and do not re-specify. Where I disagree (§2.1, §6.3, §10) I say why.

**Terminology (R36, oil re-theme).** Since R36 players see oil-industry names. This document keeps
the internal names because they match the code, save fields and function names, which did not
change. When writing anything players read, use the right-hand column; the strings live in
`js/data/strings.js` (`TERMS`) and `js/data/names.js` (items).

| In this doc and the code | What players see |
| --- | --- |
| Aether (`aether`) | **Oil** |
| The Monolith / Cosmic Falafel (tab `monolith`) | **Oil Refinery** (tab "Refinery") |
| Ascend / Ascension (`ascend()`, `ascensionCount`) | **Drill a New Well** / **New Well** |
| Cosmic Dust (`cosmicDust`, `totalCosmicDust`) | **Crude Reserves** ("Reserves") |
| Dust shop (`DustShopSystem`) | **Reserve Shop** |
| Auto-Ascend (`autoAscend`) | **Auto-Well** |
| Transcend / Transcendence (`transcend()`, `transcendenceCount`) | **Open a New Oil Field** / **New Field** |
| Fracture Shards (`fractureShards`) | **Field Shares** ("Shares") |
| Shard tree (`ShardTreeSystem`) | **Share Tree** |
| Seals of Transcendence | **Field Seals** |

---

## 1. Verdict

The bones are good and the surface is unusually rich for a vanilla-JS clicker: a real BigNum,
a solid fixed-step loop with background catch-up, 11 subsystems that actually talk to each
other, a buff bar, tab bonus strips, a mastery readout, a leaderboard, a meme-flavoured theme
with heart. The Excavation and Garden curves shipped in v2.0 are genuinely well paced (depth
and the seed ladder grow with the log of time). **But the game is a one-day game wearing a
365-day costume.** The Aether → Cosmic Dust core, which everything else orbits, has no second
act: my simulation of the real classes puts 12–13 Ascensions on day 0 and then **1 Ascension
every few days to months for the rest of the year**, with production stuck between 1e19 and
1e21 from day 1 to day 365. There is nothing to buy on the Monolith except more copies of the
same 14 generators (no upgrade shop at all), the Ascension temple sells 7 perks (two of them
numerically counter-productive), and Transcendence, the game's only "layer 2", is a strict
×500–×2000 *loss* at every scale, so the one player who takes it will feel robbed. Everything
in the first hour is fun; nothing after the first day is anticipated. The fix is not more
subsystems. It is a core economy with a ladder that keeps extending, a prestige layer that
compounds instead of plateauing, a real upgrade shop for the "one more purchase" itch, and a
year-long content calendar hung on the log-paced systems that already work.

---

## 2. Current-state diagnosis

### 2.1 The core loop (Monolith → Ascension → Transcend)

**Generators.** 14 tiers, all `costMult: 1.15` (`js/systems/BuildingSystem.js:12` and every
definition after it), base cost ×~15 per tier from 15 to 6.2e15, base CPS ×~6 per tier from 1 to
2.1e10. Milestones at 10/25/50/100/150/200/250/500/1000 owned give ×2,2,2,2,3,3,4,5,10
(`BuildingSystem.js:194-205`). All 14 are listed from the first second (`index.html:88-144`
also lists all 14 tabs). There are **no upgrades**: no per-building multipliers, no click
upgrades, no synergies. `clickPower` is initialised to 1 (`GameState.js:37`) and never changes;
a click is `1 + 3% of CPS` (`GameState.js:176`) times combo. The "one more upgrade" loop that
carries Cookie Clicker for years does not exist here.

**Active vs idle income.** Aether Burst pays 120 s of CPS per cast on a 30 s cooldown for 25
mana (`SpellSystem.js:99`), Celestial Alignment is ×4 for 30 s per 90 s (`:132`), Chrono Warp
×5 speed for 15 s per 60 s (`:109`), and mana regen is 2/s (`GameState.js:23`), which exactly
sustains the whole rotation. Golden Anomalies spawn every 60–120 s (`ClickerSystem.js:127`);
one in four is a Supernova worth **600 s of CPS** (`:137`). Net: an attentive player earns about
×7 what an idle one earns. That gap is too wide for a game that wants to be idle, and it makes
offline time, which gets `prodPerSec × seconds × efficiency` with no cap (`SaveManager.js:84-86`),
feel like 1/7 of an hour of tapping.

**Dust.** `dust = 150 · (runAether / 1e9)^0.25` (`PrestigeSystem.js:71-77`) and production is
`×(1 + 0.02 · cosmicDust)` (`GameState.js:149`). Two problems:

1. The exponent 0.25 means ×16 more Aether per run to double dust. Because the ladder is
   finite, run Aether ≈ (bounded base CPS) × (dust multiplier) × (run length), so each
   doubling needs roughly 8× the run length. Measured run lengths: 0.17 h ×5, then 0.3 h,
   11 h, 43 h, 168 h, 791 h, 2,483 h. The loop dies on day 1.
2. The multiplier reads the **spendable** pile `cosmicDust`, not `totalCosmicDust`. Buying a
   perk therefore cuts your production. Eternal Resonance rank r costs `10 · 1.5^r`
   (`PrestigeSystem.js:133`) for +50% in its own category; the trade is only net-positive when
   your pile is more than about `(2 + r)` times the cost (rank 10: hold ≥ 4.6k dust to buy a
   384-dust rank). Players who discover this stop spending; players who do not get weaker.

**Simulated core, current code, subgames off** (`sim_core_current.mjs`):

| | 10 min | 1 h | 3 h | 1 d | 1 w | 1 mo | 3 mo | 1 y |
|---|---|---|---|---|---|---|---|---|
| idle: CPS | 2.9e4 | 2.0e7 | 2.3e17 | 7.5e18 | 3.8e19 | 1.2e20 | 5.9e20 | 1.5e21 |
| idle: Ascensions (cum.) | 0 | 1 | 10 | 13 | 14 | 15 | 16 | 17 |
| active 10 min/h: CPS | — (asc) | — | 1.5e18 | 2.0e19 | 7.2e19 | 3.9e20 | 9.4e20 | 2.7e21 |
| active: Ascensions | 1 | 6 | 10 | 12 | 13 | 14 | 15 | 16 |
| dust multiplier (active) | ×4.6 | ×169 | ×7.1e3 | ×2.6e4 | ×5.0e4 | ×9.5e4 | ×1.9e5 | ×3.5e5 |

- First Ascension eligible at **4.8 min** active, 53 min idle (the earlier study measured 1.5–4.3 min
  with subgames on).
- Ascensions per day: **12–13 on day 0, then d2:1, d8–9:1, and ~1 per month after week 2.**
- Production grows ×200 over the last 364 days of the year. That is a flat line on any
  log axis a player would feel.

**Transcend** (`PrestigeSystem.js:143-172`): gate `totalCosmicDust ≥ 50,000`; payout
`floor(totalDust / 10,000)` shards at +10% each (`GameState.js:155`); resets dust and all
perks. The dust you give up was worth `×(1 + 0.02 D)`; the shards are worth `×(1 + 1e-5 D)`.

| total dust | multiplier before | after Transcend | ratio |
|---|---|---|---|
| 5e4 | ×1,001 | ×1.5 | 0.0015 |
| 1e6 | ×20,001 | ×11 | 0.00055 |
| 1e8 | ×2.0e6 | ×1,001 | 0.0005 |

Transcend is a trap at every scale, by a constant factor of ~2,000. The confirm text
(`main.js:1703`) promises "+10% permanently" and does not mention the loss. The roadmap's
§5.1 proposal to pay `sqrt(totalDust / 1e4)` shards would make the trade *worse*; its Seven
Seals gate would make players wait two weeks to be robbed. Both docs missed that the trade is
net negative.

**Talents.** 15 talents, 95 ranks (`TalentTreeSystem.js:4-27`), free respec (`:79`). Points come
from +3 per Ascension (`PrestigeSystem.js:119`) and a 20% roll per bounty claim
(`BountySystem.js:58`). The roadmap measured 40 TP/hour for an active player and the whole
tree in 1.7 h. Agreed, and the fix there (§3 of the roadmap) is right.

### 2.2 Void Tower

Monsters scale `1.12^(f-1)` (`CombatSystem.js:27-29, 86`), gear rolls at the **same**
`1.12^(f-1) × rarity` (`:323`), and the hero keeps the best roll ever. With Cosmic ×18, Forge
+25%/level, Quartermaster +15%/rank and talents +20%/rank on top, hero power outruns the floor
for ever: the roadmap measured about **1 floor per second**, floor 81k at 1 day casual, 723k at a
week. Zones (7 named, `:5-13`) fly by in minutes; the Boss timer (30 s, `:96`) never matters; the
"Max Floor" leaderboard is a time-played counter. Death and timeout retreat one floor (`:389`,
`:418`), so there is no risk. Gold per kill `1.12^(f-1)` is exponential in play time and the
Golden Enchanter (`MarketSystem.js:66`) turns it into Aether: the roadmap measured 89k Enchanter
levels at a week (×4,470 Aether). Verdict: a juicy auto-battler with no difficulty curve.

### 2.3 Excavation

`HP(d) = ceil(4 · 1.15^(d-1))` (`MiningSystem.js:159`), stone yield `1.07^(d-1)` (`:165`),
pickaxe `50 · 2.5^L` stone (`:327`), drills `30 · 1.6^n` stone at 0.5 hits/s (`:31, :344`),
7 strata every 25 depth. Casual pacing: depth 25 at ~45 min, 50 at ~4.5 h, 75 at ~1.1 d, 100 at
~5.7 d, ~120 at a month. **This is the best-paced system in the game.** Its weaknesses are
feel, not math: a 6×6 grid of identical grey tiles, the stairs hunt is pure luck with no
information, and gems pile up with a single sink (7 recipes).

*R32 measurement (`npm run sim:mining`):* the pacing above is for a game left **open 24/7**
(drills dig only while it runs). A casual player who closes the game between two 45-min sessions
reached depth 70 at a week and 99 at day 60: 0.76 depth per hour of play in week 2, 0.22 in
month 2, and the 4th stratum alone took 13+ h of play. Cause: a pickaxe level (×2 power) buys
log₂ of 1.15 ≈ 5 depths of HP, so its `50 · 2.5^L` cost grew ×1.20 per depth against stone
×1.07 per depth, a wall. R32 retunes the pickaxe cost (§6.5).

### 2.4 Garden

Grow times 5 min to 2 h (`GardenSystem.js:6-11`), 25% mutation to the next tier on harvest
(`:312`), 16 plots, 4 Golems automating rows and running offline 12 h at 50%. Sidr Tree enters
rotation around 4–6 h; Catalysts ~15 at a day, ~38 at a week. Well paced. Weakness: it is a
timer farm with one output (essences) and one meaningful sink (Catalyst, `AlchemySystem.js:85`,
cost `1.08^n` Nectar + Amethyst). No breeding choices, no rare finds, no garden identity.

### 2.5 Alchemy and Grimoire

7 recipes (`AlchemySystem.js:5-68`), 4 timed buffs capped at 10 min (`GameState.js:5`), 3
permanents. 6 spells. Both are fine as *tools* but are not progression: nothing new is ever
learned, no recipe is discovered, no spell levels up. The mana budget is already exactly spent
by the three Aether spells (above), so Void Cataclysm and Midas are only cast if you give up
income.

### 2.6 Bounties and Quartermaster

9 templates with tiny targets (`BountySystem.js:5-15`, `reqBase 1–50 × 1–3`), refilled the
instant you claim (`:118`). Active players clear ~3 a minute; idle players get a `click`
contract that blocks a slot for ever. Gold reward `250 · d · floor/2` (`:55`) is irrelevant once
Tower gold is `1.12^f`. Guild Seals buy 4 Quartermaster upgrades. This is a chore list, not a
quest board.

### 2.7 Bazaar

Four commodities on a clamped random walk (`MarketSystem.js:192`, ±17% per tick, bands
`[min, max] × M`), caravans at 1.25×/10 min and 1.5×/60 min (`:61-62`), one at a time. The
random walk is memoryless, so "buy low, sell high" is a coin flip with a 2% house edge. The
Enchanter is the only sink that matters and it is a plain geometric ladder.

*Shipped in R16 (the doc gave no numbers, so these are chosen; all in `MarketSystem.js`).* Each
tick moves `ln(price)` 20% of the way back to `ln(basePrice)` plus a uniform shock of ±12%
(stationary spread about ±15%, still clamped to the old bands), so dips are real buy signals. To
stop trading volume scaling with the gold hoard (which would out-earn core income), buying costs
1.05x and selling pays 0.95x the quote, and you may hold at most `floor(300 / basePrice)` units
bought from the market (Aether Ore 6, Mana Silk 1; Solar Amber and Void Crystal are
Garden-supplied only). Perfect-hindsight trading at the cap earns about 250 M/hour, under the
small caravan's 300 M/hour. Caravan cargo: units held (auto-loaded, most valuable first, or
passed explicitly to `dispatchCaravan`) ride along up to 2.5x the caravan's investment in
mean-price value, and return `units x basePrice x M x 1.15` (small) or `x 1.3` (large), fixed at
dispatch and added to the stored payout. Cargo is valued at the mean, not the live price, so the
skill is holding goods bought low and shipping them.

### 2.8 Achievements, Codex, Leaderboard, Fast Forward

24 achievements (`AchievementSystem.js`), each +1.5% (`GameState.js:116`); the roadmap measured
all 24 in 23–37 min active. Fast Forward is 30 s per use at 30 · 3^k sand (`FastForwardSystem.js`),
at most 2 min of warp per 30 min; harmless and also nearly pointless. The leaderboard's floor
column is dominated by the auto-climb.

### 2.9 Pacing timeline as it is today (casual, 2 sessions/day)

| When | What the player experiences | Risk |
|---|---|---|
| **Minute 1** | 14 tabs, 14 generators, 5 buy buttons, a guide banner per tab, a resource bar with 6 currencies. Clicks feel fine (sparks, floating text, pitch-rising click sound). | Overwhelm. Nothing is gated, so nothing is discovered. |
| **Minute 10** | Several generators, first Golden Anomaly, first boss, depth ~8. First Ascension already *eligible* (4.8 min active). | Ascending at minute 10 for +4.5× teaches "reset constantly". |
| **Hour 1** | 6 Ascensions, dust ×169, Tower floor in the hundreds, depth ~22, Mint/Lemon rotating, 5 achievements, 10+ talent points. | Fun. This is the hour that works. |
| **Day 1** | 12–13 Ascensions, Tower floor ~80k, Transcend eligible (and a trap), 23/24 achievements, most of the talent tree, every tab seen. Run length just jumped to 11 h. | **First quit point.** "I've seen it all; the next Ascension is tomorrow." |
| **Week 1** | 1 more Ascension (maybe 2), floor 700k, depth ~100 (the one real milestone), 25+ Catalysts, talent tree complete. | **Second quit point.** Monolith has not changed in six days. |
| **Month 1** | 1 Ascension. Depth 120. Nothing new. | Gone. Only leaderboard-watchers remain. |

Where the current game *does* deliver anticipation (stratum at depth 26/51/76/101, Sidr Tree,
Catalyst milestones), it is in systems whose rewards are small percentages dwarfed by a ×1e4
dust multiplier, so the player cannot feel them.

---

## 3. Design pillars

1. **The core must never plateau.** Every horizon (session, day, week, month, season) has a
   core-loop event that was not possible at the previous horizon: a new generator tier, a new
   upgrade row, a new prestige layer, a new rule set. Growth is exponential in time for the
   whole year because each layer multiplies the layer below it and extends its ladder.
2. **Something to buy every 30 seconds, something to decide every session.** An upgrade shop
   with ~120 discrete purchases per run plus a dust shop of features gives the "one more"
   itch; keystones, challenge choices and build commitments give the session its decision.
3. **Meaning hangs on log-paced systems; dopamine hangs on the exponential one.** Talent
   points, unlocks, seals, collections and layer gates key off depth, zones, Catalysts, Guild
   Rank and lifetime counts. Numbers-go-up is the 30-second layer; it never gates content.
4. **Idle is the baseline, active is a bonus, absence is never punished.** Active play earns
   at most ×2 over idle (today ×7). Offline earns the same per-second as idle up to a visible
   cap, Golems and caravans finish while away, dailies bank, nothing decays, no streaks.
5. **Juice is a system, not a sprinkle.** Every reward tier (small / medium / big / epic) has a
   fixed sound, motion and screen grammar, so the player's body learns what a big moment feels
   like before the number is read.

---

## 4. The 365-day anticipation arc

Four layers, each a reset of the one below with a currency that multiplies the layer below
and unlocks mechanics there. Timings are casual (2 × 45 min/day); engaged players run
1.5–3× faster and hit the same content.

| Layer | Currency | Resets | Gate (first) | Casual timing | What it unlocks |
|---|---|---|---|---|---|
| **0 Run** | Aether | — | — | every 15–90 min | generators, upgrade shop |
| **1 Ascension** | Cosmic Dust | run | 1e9 run Aether (as today) | first ~15 min, 6 on day 0, ~1/day by day 5 | Dust shop: features (auto-buy, keep-upgrades, Golem rows, Fast Forward hours, perk tiers) |
| **2 Transcend** | Fracture Shards | dust + dust shop | 1e9 lifetime dust, ×10 per Transcend | first ~day 6, then every 2–4 d, stretching to ~2 weeks by month 4 | Shard tree: +1 generator tier per Transcend (15 → 30), ×1.5 Aether and ×1.5 dust gain per shard, auto-Ascend, Tower Wardens, Garden breeding |
| **3 Chronicle** | Chronicle Pages | shards + shard tree + all run state (subgame records kept) | 12 Transcends **and** Seal set I | ~month 4 | **Challenges** (alt-rule runs) and **Chapters** (themed month-long rule sets); permanent Page upgrades; new Tower zone and stratum |

The simulated shape of layers 0–2 is in §6.4. Layer 3 is content, not a curve; it exists to
restart anticipation when layer 2 stretches past two weeks between resets.

### 4.1 Horizon by horizon: what is new to look forward to

**Every session (15–90 min).** A full run: generators, the upgrade row for the newest tier
(5 upgrades per tier), two or three milestone ×2 fanfares, 1–3 Golden Anomalies, a boss or
two, a Garden harvest, a contract or two, an Ascension with the dust count-up, one dust-shop
purchase. The "Next goals" header shows the 3 nearest goals across tabs so the session ends
on a target, not on fatigue.

**Every day.** The Daily Dallah (first visit: a contract, a buff, 60 sand; banks 3 days). A new
stratum or zone every 1–3 days in week 1. One dust-shop feature. From day 6, a Transcend every
2–4 days that hands you a new generator tier and shards to spend. Golem rows and caravans
finished overnight. A Codex row filled.

**Every week.** Weekly Ledger: 3 goals drawn from unlocked tabs, sized to about 4.5 days of
the player's own typical play (R33), Seals + a Codex stamp.
Souq Rotation: one gentle world modifier that returns later (Truffle Season, Falcon Week).
A Seal of Transcendence lights roughly weekly through month 2 (depth 100, floor 501, 25
Catalysts, Guild Rank 7, bestRunDust 500 (R31; was 1e8), 40% Codex, 15 Ascensions).

**Every month.** A new generator tier reaches the top of the ladder (Transcend count). A new
shard-tree branch becomes affordable. Month 1: Garden breeding opens. Month 2: Tower Wardens
(every 250 floors). Month 3: Stratum 7 (Abyssal Heart) in sight. Month 4: Chronicle unlocks.

**Every season (3 months).** A Chronicle **Chapter**: a 6–10-week rule set with its own small
upgrade tree and a Page reward, e.g. "Chapter of Sand" (Excavation is ×3 but Aether is ÷10,
shipped as ÷2, see §6.6;
new relics in every stratum), "Chapter of the Caravan" (Bazaar prices follow a real trend;
caravans carry gems), "Chapter of the Dallah" (Garden ×2, essences also feed the Monolith).
Chapters rotate; a missed Chapter comes back next year. Leaderboard seasons align with
Chapters.

### 4.2 Milestone calendar (casual)

| Day | Core | Subgames | Meta |
|---|---|---|---|
| 0 | first Ascension (~15 min), 6 Ascensions, first 2 dust-shop features | Tower unlock (min 2), Excavation (min 5), Grimoire (min 9), Bounties, Garden, Alchemy by min 30 | 3 achievements, Codex unlock |
| 1 | run length 1–2 h, Auto-Buy bought | zone 2 (Tahlia), Granite stratum, Sidr Tree, Constellations open | first Record star |
| 3 | run length ~12 h; Transcend meter visible and filling | zone 3, Obsidian, 10 Catalysts, Golem 2, Bazaar | Guild Rank 2 |
| 6–7 | **Transcend I**: tier 15 generator, 2 shards, auto-Ascend | Voidstone (d76) | Seal of Rebirth, first Weekly Ledger |
| 14 | Transcends IV–V (every 2–3 days), tiers 15–19, ascensions on autopilot ~100/week | depth 100 (Aetherite), zone 4, Golem 4 | Seals of the Deep/Oasis/Guild |
| 30 | Transcend X, tier 24, CPS ~1e31 | Garden breeding, Warden 250 | Seal of the Tower, Leaderboard season 1 ends |
| 60 | Transcend XVIII, tier 30 (ladder cap), CPS ~1e49 | Starcore (d126), Kingdom Centre | Codex 60% |
| 90 | Transcend XXIII, cadence ~1/week | Abyssal Heart approaching | Seal set I complete |
| 120 | **Chronicle I**: first Challenge, Chapter of Sand begins | new zone 8 + stratum 8 | Pages tree |
| 180 | Transcend XXX; Chapter 2 | | |
| 270 | Chapter 3; Challenges 6–8 | | |
| 365 | Transcend XXXII, CPS ~1e83; Chapter 4 ends with the Anniversary Codex page | | |

---

## 5. Dopamine and feel

The current juice is decent at the small tier (sparks, floating text, pitch-rising clicks,
rhythmic sound box) and absent at every tier above it: every big moment is the same
`spawnFloatingText` at screen centre (`main.js`, `PrestigeSystem.js:122`, `:170`, etc.).

### 5.1 A four-tier reward grammar

| Tier | Trigger | Visual | Audio | Rule |
|---|---|---|---|---|
| Small (~every 30 s) | click, kill, tile, buy, tick | existing sparks + float text | existing | never more than 1 float text per 100 ms; batch |
| Medium (2–10 min) | milestone ×2, boss kill, stairs, harvest, contract, upgrade bought | **toast** slides in top-right with icon and value; the source button pulses gold once | 3-note arpeggio in the selected scale | toast never blocks input; max 3 stacked |
| Big (per session) | Ascension, new tier bought, zone/stratum entered, Guild Rank, unlock | **ceremony**: 1.2 s dim + radial burst from the source, number count-up (dust), screen settles on the thing that changed | fanfare (new sample) | one per 60 s; the game pauses timers it would otherwise waste (boss timer) |
| Epic (weekly) | Transcend, Chronicle, Seal, set complete, Warden | full-screen shader moment (the falafel cracks, the sky changes colour for the rest of the session), new background palette, 3 s | unique motif per epic | confirm dialog states exactly what is kept and lost |

As built (R11, `js/ui/rewards.js` + pure rules in `js/ui/rewardQueue.js`, sounds in
`AudioEngine.playTier`):

- **Small action confirmations** that used centre-screen float text (bought goods, watered,
  spell cast, Tower setbacks, gear drops) became a *quiet small toast* (no extra sound: the action
  already made one), not float text, so the centre of the screen is left to clicks and crits.
  Float numbers at the point of action (click yield, damage, harvest, tile loot, the Tower
  skill's shield/heal numbers next to its damage) stay as they were.
- **Coalescing:** a toast of the same `kind` still on screen or waiting absorbs new events
  (count ×N, amounts summed), for at most 12 s; max 3 stacked, 6 waiting, the rest fold into
  "+N more rewards". Toasts never take input (`pointer-events: none`).
- **Big over the 60 s budget** becomes a big-styled toast instead of a ceremony; epic ceremonies
  are never dropped and queue (same kind merges). Ceremonies last 2.4 s (big) / 3.6 s (epic),
  shorter with `prefers-reduced-motion` (no burst/scale animation), and a click or Esc skips.
  The boss timer pauses while one is open.
- **Batching:** while the tab is hidden, and inside a Fast Forward warp, events are held and
  come back as one entry per kind ("12 Ascensions · While you were away: +3.1e7 dust"), which
  then goes through the same rules (so at most one ceremony). This answers §10 risk 2.
- The epic "shader moment" (falafel cracks, sky colour) is not built yet: epic is the ceremony
  with its own background and the choir; the full-screen palette shift is left to R4/R20.

### 5.2 Moment-to-moment changes

- **Clicks matter again.** Click yield = `clickPower × (1 + 3% CPS)` where `clickPower` grows
  through 15 click upgrades (×2 each, Aether cost on the generator cost curve) and a dust-shop
  "Finger of Wasta" (+1% CPS per 100 clicks this run, cap +50%). Combo stays 5× but **crits
  during Frenzy spawn a mini-anomaly 10% of the time** (a 3 s "ember" worth 30 s of CPS). The
  combo bar gets a visible "Frenzy in N" counter so the next Frenzy is anticipated (every 20
  combo clicks since R28; see the R28 notes in §6.1).
- **Crits.** Base 5% ×3 stays; show a crit streak counter; 3 crits in a row = "Resonance!"
  (×2 for the next click). Variable ratio on top of fixed ratio.
- **Golden Anomalies.** Keep the 60–120 s spawn but **retune Supernova from 600 s to 180 s of
  CPS** and add two rarer types: *Mirage* (×2 everything for 60 s, 1 in 12) and *Caravan Star*
  (a free large caravan, 1 in 20). Anomalies are the right place for variance; spells are not.
- **Spells become a rotation with a rhythm, not an income tax.** Aether Burst 120 s → **45 s of
  CPS** on a 45 s cooldown; Celestial ×4 → **×2.5 for 30 s**; add **mana overflow**: casting at
  full mana gives the spell +25%. Active income lands at ~×2 idle.
- **Near-misses that are true.** Boss timeout shows "escaped at 4% HP" and offers "Retry with
  Almarai Laban" if owned. Stairs hunt: after 12 tiles without stairs, the 3×3 around the stairs
  shimmers "warm". Mutation roll shows the seed shimmer even on a miss with the real odds.
  Collection cards show "19/20".
- **Count-ups, not snaps.** Dust, floor, depth and Codex % animate over 0.8 s on big moments.
- **The falafel reacts.** Per-run milestones add a sesame seed; at 100 buildings it glows; in
  Frenzy it spins; on Ascension it cracks and reforms. The central object should tell the
  run's story at a glance.
- **Sound.** The 5 scales are a great foundation. Give each tier its own instrument (small =
  pluck, medium = bell, big = brass, epic = choir) and let the Tower zone / stratum change the
  scale automatically ("Boss" scale on bosses, "Hijaz" in Al-Batha). Hearing the place is
  cheaper than drawing it.
- **Toasts replace centre-screen float text** for medium and big events. Centre float text is
  reserved for clicks and crits, so the eye learns where to look.

### 5.3 Collection and milestone layer

Endorse roadmap §5.3 (Bestiary, Meme Trophies, Gear Museum, Strata Relics, Herbarium,
achievement ladder 24 → ~90). Add: **Generator Codex** (own 100 / 500 / 1000 of each tier,
lifetime; each row unlocks a flavour text and a cosmetic skin for that card), **Anomaly Log**
(each anomaly type clicked 10/100/1000), **Chapter stamps**.

*Shipped in R14 (as built):* the ladder is 88 achievements (the 24 originals at +1.5% each, 64 new
rungs at **+0.5%** each rather than the +1% above: 88 x 1% would be x1.88 on its own, and the
smaller bonus keeps year-one pacing intact in the sim). Collections are built from state the game
already saves: Warden Trophies, Strata Relics, Golden Herbarium, Hybrid Herbarium, Hybrid
Recipes, plus the Generator Codex (30 tiers x 100 / 500 / 1000, as three sets). Each finished
set is +1% Aether (8 sets, 8% at most). Not built, because the data does not exist yet: Bestiary,
Gear Museum, Anomaly Log, Chapter stamps and the Generator Codex cosmetic skins (a row unlocks
its flavour text only). `CollectionSystem.getCodexPercent()` is the figure for the R19
leaderboard column. No save migration: `codex` is a new additive field.

---

## 6. Economy redesign

### 6.1 Core formulas, before and after

> **R31 economy redesign (v5.0.0, issue #67) replaces the numbers below where they differ.** The
> owner chose small numbers (about 1e12 Oil at day 60, low quadrillions at a year) with every
> prestige bonus additive. The table rows marked *R31* show the shipped values; the R4/R5/R13
> notes further down are the history of how the old curve was tuned.
>
> | Item | R31 (shipped) | Before R31 |
> |---|---|---|
> | Ladder | 8 tiers at the start, +1 per Transcend, cap 20. Tier k: cost `10 × 10^(k−1)`, output `0.005 × 4^(k−1)`/s (payback ×2.5 per tier). Ids unchanged; old tiers 21–30 retired (`RETIRED_BUILDING_IDS`) | 14 + 1 per Transcend to 30; ×18 cost, ×7 CPS |
> | Cost growth | ×1.15 | same |
> | Milestones | ×2 at 10/25/50/100/150/200/250/300 (×256 in all) | ×2,2,2,2,3,3,4,5,10 to 1,000 |
> | Tier upgrades | at owned ≥ 1/5/15/30/60, cost `baseCost × 4^k` (k = 1…5), ×1.2 each; synergies additive within their tier (+0.1% per source owned) | at 1/10/50/100/200, `baseCost × 10^k`; synergies multiplied |
> | Dust gain | `10 × (runAether / 1e4)^(1/5)`, pays from 1e4 run Oil (10 dust; R52: from 500, 5 dust) × Geode × Nectar × Amplifier | `150 × (A/1e9)^(1/3)` × … × shards |
> | Dust multiplier | `1 + 0.01 × lifetime dust` (this layer) | `1 + 0.02 ×` |
> | Transcend gate | `400 × 1.6^k`, ×3 per step from the 9th Transcend (`TRANSCEND_SLOW_FROM = 9`) | `1e9 × 10^k` |
> | Shards | 2 per Transcend; each lifetime shard **+25% production, additive**; no dust-gain bonus | ×1.5 Aether and ×1.5 dust each |
> | Chronicle Pages | **+20% production each, additive** | ×1.4 each |
> | Chronicle gate | 6 Transcends + Seal set I, or 8 without the Seals; challenge goals 1e6 / 1e5 run Oil | 12 (+Seals) or 24; 1e11 / 1e10 |
> | Auto-Ascend | default rule ×1.25 lifetime dust; the ×m rules also wait for a 30-min run | default ×2, 10-min minimum only |
> | Dust shop | prices ÷2–÷20 (§6.2 table): Genesis 5, Blueprint Memory 10, Chrono 10 (×1.5), Auto-Buy 30, Titan 10 (×1.5), Finger 50, Crucible 15, Golems 30, Hourglass 40, Leylines 60, Blueprint Memory II 50, Resonant Start 250, Amplifier 50 (×2) | 5 … 5,000 |
> | Talent S2 (Record New Well) | one star per doubling of the best single New Well, from 16 dust | per decade from 1e4 |
> | Seal "Stars" | 500 dust in one New Well | 1e8 |
>
> *Why these values (sim study, `npm run sim`).* Run Oil ≈ decades of the ladder plus decades of
> every multiplier, and with ×1.15 cost growth a run's Oil is roughly time × top-tier output, so
> the numbers are set by how long runs are and how many tiers are open. Keeping 2-month Oil near
> 1e12 means about 6–7 tiers above the start by then. With ×5 output per tier (the issue's first
> draft) each Transcend added about 1.3 decades and Transcends kept speeding up until the tier cap,
> then stalled; ×4 output per tier, a slow base output (0.005/s for tier 1) and gate growth ×1.6
> give Transcends whose spacing grows steadily (casual: days 3.5, 8, 13, 20, 27, 38, 49, 64) at
> about 1 decade each. The ×3 late gate makes Transcends past the Chronicle gate slow down, so the
> player begins a Chronicle (layers restart at 8 tiers) instead of climbing to 1e20+. The upgrade
> shop thresholds and prices came down because runs now hold tens, not hundreds, of each
> generator: with the old 10^k prices the casual median fell to ~20 upgrades per run.
> Shorter alternatives tried and rejected are in the issue #67 comments (uniform rescale runs
> away, moving bonuses into dust stalls, a price discount shows fractional prices).
>
> *Save step v8* moves old saves to the matching point: the run is refunded (generators and
> upgrades to 0, run Oil mapped on a log scale with old 1e9 → new 1e4 and 0.2 new decades per old
> decade), lifetime dust keeps its log position between the first New Well (old 150 → new 10)
> and the next gate, dust-shop features are kept and paid at the new prices from the converted
> dust (Amplifier ranks refunded), Deep Blueprints for retired tiers are refunded as shards, and
> the old default Auto-Ascend rule ×2 moves to ×1.25. Counts (New Wells, Transcends, shards,
> Pages, Chronicles) are kept.
>
> **R53 (v5.2.0, issue #127): everything outside the core, repriced.**
>
> | Item | R53 (shipped) | Before |
> |---|---|---|
> | Oil achievement ladder (run Oil) | 1e5, 1e7, 1e8, 1e10, 1e11, 1e13, 1e14, 1e16 (with the originals 1e6/1e9/1e12/1e15: one goal per decade 1e5–1e16) | 1e18 … 1e72 |
> | Oil Forge | `100 × 1.5^L` Oil | `1e5 × 5^L` |
> | Subgame → Oil links | **one additive category, capped at +150%** (`WorldLinks.js`): Depth Resonance +0.2%/depth, Aetheric Treaty +2%/rank, High Enchanter +0.4%/level, Philosopher's Catalyst +0.2%/brew, Building Mastery +1.5%/100, Dungeon Mastery +1%/10 bosses | each its own multiplier: +2%, +25%, +5%, +2%, +1.5%, +1% |
> | Dust links | Geode Attunement + Nectar Offering add together: +2% per 10 depth, +0.4%·√Nectar up to +20% | ×(1 + 10% per 10 depth) × min(2, 1 + 2%·√Nectar) |
> | Chronicle goals, `ASCEND_AETHER_GATE`, contracts | unchanged: R31 already set the goals (1e6/1e5) and the gate (1e4); contracts and the Quartermaster never read Oil | — |
>
> *Why.* `npm run sim -- --links` sets the subgame stats from a schedule (depth from `sim:mining`,
> bosses and gold from `sim:tower`, ~24 seals a day on the Treaty). With the old link values the
> casual 2-month run Oil was ~4e16 (core alone ~1e12) and layer peaks reached 1e22 within the
> year, with half of all Transcends less than 6 h apart: the links compounded to ×100+ and, through
> the fifth-root dust formula, Geode ×2.6 was worth ×120 run Oil. Additive alone was not enough
> (still ~1e21 at two months): the core's late Transcends run away under any steady multiplier
> above ~×2–3 (sweep in the PR). The new values keep the links near ×2 at two months, and the
> per-Transcend peaks with links on stay within the core's own (2e8 … 2e14 for the first eight).
> The Forge price keeps `sim:tower` floors within ~10% of the pre-R31 report. `sim:check` now
> takes the median of daily run-Oil samples over days 50–70 (the single day-60 row passed or
> failed on where day 60 fell inside a layer).

> **R52 passive-first clicking (v5.3.0, issue #126).** The owner wants progress passive-driven:
> clicking is a small optional boost. Shipped values (replace the rows above where they differ):
>
> | Item | R52 (shipped) | Before R52 |
> |---|---|---|
> | Click yield | **0.5 s of current production**, at least `clickPower` (1); Resonant Flow +0.02 s per rank (`GameState.getClickBase`) | `clickPower × 2^n + 3% CPS` |
> | Click upgrades | **removed**; save step v9 refunds the ones bought (10 × base cost of tier i each) | 15, ×2 each |
> | Click rate | at most **5 paid clicks/s** (token bucket on real time); faster taps animate and pay nothing | unlimited |
> | Auto-tap | dust shop, Asc 1, **5 dust**: 1 plain click/s (no combo, Frenzy or crit) whenever the player hasn't tapped for 2 s, and in offline gains (+50% of production); the Dry Well challenge turns it off | — |
> | Combo / Frenzy | combo **×1** (feel: bar, pitch, Frenzy every 20); Frenzy **×1.25** for 4 s | ×5 / ×3 |
> | Spells / anomalies | Burst **10 s of CPS every 60 s**; Celestial **×1.25** 30 s; Chrono Warp ×5 15 s every **10 min**; Supernova **30 s**; Mirage **×1.5** | 45 s / 45 s; ×2.5; every 60 s; 180 s; ×2 |
> | Dust gain | R31's `10 × (runAether / 1e4)^(1/5)`, now paid from **500** run Oil (5 dust, the price of Auto-tap) | paid from 1e4 (10 dust) |
> | Tier upgrades | **6** per tier at owned ≥ 1/3/8/15/30/60, cost `baseCost × 3^k` (k = 1…6), ×1.2 each | 5 at 1/5/15/30/60, `baseCost × 4^k` |
>
> *Why.* At 0.5 s a click, the attentive model's 2 clicks/s alone add as much as the generators,
> so "~×2" can't hold against generators alone. **It is measured against an idle player with
> Auto-tap** (×1.5 generators), which every player owns from the first New Well on; the owner
> accepted this (PM review of the R52 PR). `sim/active-income.mjs` gives **×1.93** (clicks only
> ×1.46, spells only ×1.28, anomalies only ×1.07; ×2.89 of generator output; R3 values measured
> ×6.86). Little is left for the combo, so it became feel only, and Frenzy, Burst, Celestial, Warp
> and the anomalies shrank to fit.
>
> The early-game lever is where dust starts paying: the R31 curve is unchanged, but a New Well
> pays from 500 run Oil (5 dust). A first draft moved the whole curve instead (`(A / 500)^(1/6)`);
> that paid more dust mid-game, so Auto-Ascend fired sooner, runs got shorter and both upgrades
> per run and 2-month Oil fell. Removing the 15 click upgrades also took about 5 purchases out of
> every casual run (R31's 31 per run median included a median of 6 click upgrades; 26 without).
> Neither the thresholds nor the price alone changed the median much (a casual run owns about 8
> tiers, so 8 × 5 upgrades is the ceiling); a 6th level per tier plus the ×3 price step brings it
> back. `sim:check` now also asserts idle first Ascension ≤ 90 min, a casual median run Oil over
> days 50–70 (R53's measure) of at least 1e11, and a casual median of ≥ 30 upgrades per run.
> Result: first Ascension idle **60 min** (was 300), casual 10 min; upgrades per run median casual
> **32**, idle **28** (R31: 31 / 22 with click upgrades); median run Oil over days 50–70 casual
> **4.1e12**, idle **4.4e10** (main before R52: idle 7.2e9); 2-month row casual 2.5e12, idle
> 5.7e11.

> **R55 Ascension attunements (v5.5.0, issue #129).** After the first New Well the player picks 1
> of 3 attunements for the run (`js/systems/AttunementSystem.js`, panel `js/ui/attunements.js`
> under the New Well button). The pick can change until the first generator is bought; after that
> a new pick waits for the next run, so Auto-Buy (which buys seconds after a New Well) never takes
> the choice away. It carries over to every later run, Auto-Ascend included. Each is one additive
> category in `getNetAetherPerSecond` (Steady acts on tier upgrades instead), best **≤ +40%**:
>
> | Attunement | Effect | Worth |
> |---|---|---|
> | **Idle** (default; old saves get it) | +30% production while the last *hand* tap is ≥ 60 s old | +30% idle; ~+25% for the casual model (present 10 min/h) |
> | **Steady** | tier upgrades ×1.26 each instead of ×1.2 | +34% on a tier with all 6; ~+22% at a run's typical 4 per tier |
> | **Focus** | +15% per subgame milestone this run, at most +40%: Excavation 25 / 100 blocks, Tower 1 / 5 bosses, Garden 3 / 10 harvests (counted from the run's start) | 0 … +40%; rewards playing the side tabs |
>
> *Auto-tap is not a tap for Idle.* Auto-tap only runs while the player isn't tapping (R52), so if
> it counted, Idle would be off for everyone who owns it (all players from the first New Well);
> its taps are paid from production, so they include the Idle bonus. *Steady's value*: the issue's
> +25% (×1.25 each) was worth ~+18% at a typical run's 4 upgrades a tier, below Idle in every case,
> so it is +30%. Focus milestones are per run so they come back after every New Well; the steps
> were set from the Weekly Ledger paces (~400 blocks, ~5 bosses, ~24 harvests a week of
> lifetime play) so a long run reaches most of them with light play.
>
> *Sim (`npm run sim`, default pick Idle in both profiles):* a steady +25–30% brings Transcends
> forward (casual first eight: days 4.0 … 56.6, were 4.3 … 69.9), so day 50–70 sits earlier in a
> later layer. First Ascension unchanged (idle 60 min, casual 10); upgrades per run median casual
> **34**, idle **31** (were 32 / 28); median run Oil over days 50–70 casual **2.4e11** (was 4.1e12;
> the ≥ 1e11 floor holds), idle 3.5e11 (was 4.4e10). `--attune=steady` compares Steady: its casual
> run starts its first Chronicle at day ~58, inside the window, and the median falls to 3e9; the
> window measure is sensitive to where a layer boundary lands, which `sim:check` asserts only for
> the default pick.

> **R57 late-year Chronicle/Page loop (v5.30.0, issue #139).** *Where the late-year growth came
> from (measured on v5.19.0).* Months 1–3 sat near the target, but the highest run Oil over days
> 180–365 reached 9e20 casual and 2.6e24 with `--links` (months 6–12 median 1.7e14 / 6.5e17). In
> every Chronicle cycle the per-Transcend peaks for Transcends 1–8 are about the same (~4e9 …
> 6e14). The run-away is the 9th to 12th Transcend of the later cycles, about ×100 run Oil each.
> The default Auto-Ascend rule ends a run once it pays 25% of lifetime dust, and dust is the fifth
> root of run Oil, so a run's Oil grows with about (lifetime dust)^5, and lifetime dust tracks the
> Transcend gate (`1e4 × (L / 40·amp)^5`). The highest gate a cycle reaches sets its peak; Pages,
> links and Page upgrades only decide how fast it gets there. Before R57, Pages kept growing by 1
> for every 2 Transcends, so the sim player (and a Page-hungry real one) sat in the ×3 gates for
> Pages: later cycles reached 11–12 Transcends, and 11 days of waiting after the last one.
>
> | Item | R57 (shipped) | Before |
> |---|---|---|
> | Chronicle Pages | 3 + 1 per 2 Transcends past 6, counting Transcends **up to the 9th** (`CHRONICLE_PAGES_MAX_TRANSCENDS = TRANSCEND_SLOW_FROM`): at most 4, plus Gilded Edges and challenge rewards | no limit (6 at 12 Transcends) |
> | Sim Chronicle rule | the first Chronicle as before (allowed and 11 days after the last Transcend); **every later one once the 9th Transcend is done** (Pages full; each further gate is ×3 again) | always the 11-day rule |
> | `sim:check` | also runs `--links` and every attunement; asserts months 6–12 (days 180–365, a sample a day) median run Oil ≤ **1e17** and highest ≤ 1e18, casual and idle, links on and off, and the 1e11–1e13 2-month band for Idle, Steady and Focus | default pick only |
>
> *Tried and rejected* (sweeps in the PR): a steeper late gate (×6) or a Transcend cap per
> Chronicle with the wait kept made it hotter, because waiting at a high gate is where run Oil
> grows; capping or flattening the Page bonus (+5% each, √Pages, +20% to 16 then √) helped without
> links but left the links median at 1e17–3e17, and every version cost 2–4 upgrades per run (the
> ≥ 30 floor failed for Focus); Chronicling at 8 Transcends from the first Chronicle on moved the
> first one into the 2-month window (median 2e8). The Page bonus (+20% each) is unchanged.
>
> *Result:* casual months 6–12 median **8.4e9** (was 1.7e14), highest 7.8e16 (was 9.2e20); with
> links 3.9e9 / 2.5e15 (were 6.5e17 / 2.6e24); idle 2e11 / 1e17 (8.6e12 / 1.2e19). The 2-month
> median is unchanged (casual 6.9e11; Steady 3.9e12, Focus 3.8e12, in band for all three).
> Upgrades per run casual 32 (34), idle 30 (30). Chronicles per year casual **28** (was 9), idle 14
> (8); with links **94** (12): with links a cycle's nine Transcends take 3–4 days late in the year.
> The late median now sits below the 2-month band (frequent resets), and the per-cycle peaks are
> 1e16–1e17, the R31 target.


| Item | Today | Proposed | Why |
|---|---|---|---|
| Generator tiers | 14, fixed (`BuildingSystem.js:4-120`) | 14 + **one new tier per Transcend**, up to 30; tier n: cost ×18, CPS ×7 over tier n−1 (the existing ladder's own ratios); Chronicle extends again | the finite ladder is the plateau |
| Cost growth | 1.15 | 1.15 | fine; do not touch |
| Milestones | ×2,2,2,2,3,3,4,5,10 at 10…1000 | same | good discrete pops; keep |
| **Upgrade shop (new)** | none | per tier, 5 upgrades at owned ≥ 1/10/50/100/200, cost `baseCost × 10^(k+1)`, each **×1.25** that tier (draft: ×2, see R5 notes); 15 click upgrades (×2 each); 8 synergy upgrades ("Dallah per Shawarma": tier A **+0.3%** per tier B owned; draft: +1%) | the "one more" itch; ~60–170 purchases per run |
| Click yield | `1 + 3% CPS`, `clickPower` constant | `clickPower × 2^(clickUpgrades) + 3% CPS`, combo 5× unchanged | clicks stay relevant in the first 5 min of every run |
| Active multiplier | ~×7 (spells + anomalies; ×20.7 measured on the real classes, see R3 notes) | **~×2** (Burst 45 s/45 s, Celestial ×2.5, Supernova 180 s); shipped values measure ×7.2 (R3 notes) | idle is the baseline (pillar 4) |
| Dust gain | `150 · (A/1e9)^0.25` | **`150 · (A/1e9)^(1/3)`** × Geode × Nectar × shard dust mult | cube root halves the run-length growth per Ascension |
| Dust multiplier | `1 + 0.02 · cosmicDust` (spendable, `GameState.js:149`) | **`1 + 0.02 · totalCosmicDust`** (lifetime) | spending must never hurt |
| Ascension count bonus (new) | — | `×(1 + 0.05 · ascensions)`, cap ×10 | small, visible, rewards repetition early |
| Ascension perks | 7 perks, +50%/+100% ranks (`PrestigeSystem.js:5-13`) | **Dust shop of features** (§6.2); Eternal Resonance and Singularity Tap removed (the dust multiplier is the number) | numbers are already there; sell *features* |
| Transcend gate | 50,000 total dust (`:145`) | **1e9 lifetime dust × 10^k**, k = Transcends so far | first at ~day 6 casual (§6.4) |
| Shard payout | `totalDust / 1e4` (`:151`) | **2 shards per Transcend** (+1 per lit Seal, max +3) | shards are a count, not a pile |
| Shard effect | +10% Aether each (`GameState.js:155`) | **×1.5 Aether and ×1.5 dust gain per shard**, plus the shard tree (§6.3) | compounds across layers instead of plateauing |
| Transcend reset | dust, perks, run | dust, dust shop, run; **keeps** unlocks, generator tiers, subgames, Codex; shard tree is permanent | the confirm lists it |
| Offline | uncapped, `offlineEfficiency` 1.0 + talents | **100% for 8 h, then 50% to 24 h, then 0**, shown in the modal; Chrono Reservoir raises the 8 h | visible cap; no clock-skip jackpots |

*R4 implementation notes.*
- **Lifetime dust is per layer.** Transcend sets `totalCosmicDust` (and so the dust multiplier)
  back to 0; the gate reads it, so "1e9 × 10^k" is dust earned since the last Transcend. Shards
  are what carries over: they multiply Aether and dust gain and never reset, which is the
  "compounds across layers" in the table. The panel and the confirm show the trade line by line
  (`PrestigeSystem.getTranscendPreview`). In the sim, CPS is back to its pre-Transcend level a
  median 0.3 days (max 0.5) after each Transcend.
- **Shards:** `fractureShards` is the spendable balance (for the shard tree, R13) and
  `totalFractureShards` is every shard ever earned; the ×1.5 multipliers read the lifetime count
  so spending shards never lowers production (same rule as dust).
- **Tiers 15–30** are generated in `BuildingSystem.js` from fixed data (ids, names, icons) with
  cost ×18 and CPS ×7 per step; tier 30 is base cost ~7.3e35, base CPS ~7.0e23. Locked tiers
  are hidden and cannot be bought; tiers open = `min(30, 14 + transcendenceCount)`.
- **Gate growth stays ×10.** The two-regime gate (×30 per step from Transcend X, §10 risk 3,
  #23 default 2) is implemented as a knob (`TRANSCEND_SLOW_FROM`) but off. Re-simulated on the
  real classes, every ×30 regime made layer 2 stall earlier, not later: casual "a reset at
  least every 14 days" holds until day 190 with ×10, day 130 with ×30 from Transcend X, day 117
  from Transcend XX, day 157 from Transcend XXV. Past tier 30 each ×10 gate step costs ~×100
  in run length (dust grows as Aether^⅓ and the multiplier is linear in dust) against ~×11 from
  two more shards (2.25³); a steeper gate only stalls sooner.
- **Refund for old Transcends (save v4).** Each old Transcend is re-scored as a new one
  (`transcendenceCount` kept, so tiers and the next gate match a new player at that count).
  Shards become `max(2 × Transcends, ⌈log(1 + 0.1·S) / log 1.5⌉)` for S old shards, so no
  save's shard multiplier drops. The dust the old Transcends took is returned: the old payout
  was `floor(dust / 1e4)`, so S × 1e4 dust goes back into lifetime and spendable dust. The
  Transcend panel tells the player once what was refunded.

*R5 implementation notes (upgrade shop, `js/systems/UpgradeSystem.js`).*
- **Effects retuned on the real classes (§10 risk 5).** With the draft table (×2 per tier
  upgrade, so ×32 per tier, and +1% per synergy unit) the casual player's first Transcend moved
  from day 7.4 to day 0.2 (8 Transcends on day 1, tier 22 by the end of day 1; measured before
  R13). The core is
  very sensitive in week 1: lifetime dust sits just under the 1e9 gate for days, so any
  constant production factor tips it over early (a flat ×1.2 already moves the first Transcend
  to day ~4). Shipped: **×1.25 per tier upgrade (×3.05 for all 5), synergy +0.3% per source
  owned** (needs 25 of the target and 50 of the source to appear), **click upgrades ×2**
  (`clickPower × 2^n + 3% CPS`, cost 10 × base cost of tier i; they don't move pacing).
  Measured with R13 on main (sim buys Auto-Ascend, then each new tier's Deep Blueprint):
  casual first Transcend day 1.5 (was 4.8; idle 3.4, was 10.2), 32 Transcends in the year
  (was 31), a reset at least every 14 days until day 184 (unchanged), median 63 upgrades per
  run (max 173 with 30 tiers).
  The early-Transcend shift is expected to come back with R3 (active ×8 → ×2 roughly halves
  casual income, #23 default 5); retune `TIER_UPGRADE_MULT` / `SYNERGY_PER_UNIT` then.
  **Retuned with R3 to ×1.2 per tier upgrade (×2.49 for all 5) and +0.1% per synergy unit**
  (see R3 notes).
- **Reset:** Ascend clears bought upgrades except those a keep rule accepts
  (`addAscendKeepRule((upgrade, gameState) => bool)`; upgrades carry `kind`, `tier`, `level`),
  which is the hook for Blueprint Memory I/II (R6). Transcend clears all.
- **Deep Blueprints** (shard tree Foundry, R13) divide a tier's own 5 upgrade prices by 10
  (`UpgradeSystem.getCost`); the list price stays in the table.
- **UI:** a tile row on the Falafel tab above the generators (app-shell mockup), with the
  selected upgrade's full card under it and a "Buy all" button. Saved as an array of ids;
  saves without the field load with nothing bought.

*R3 implementation notes (active income, `SpellSystem.js`, `ClickerSystem.js`,
`sim/active-income.mjs`).*
- **Values as specified:** Aether Burst 45 s of CPS on a 45 s cooldown, Celestial ×2.5 for 30 s,
  Supernova 180 s of CPS (floor 500 clicks' worth on a fresh run). Anomaly weights out of 60:
  Mirage 5 (1 in 12: ×2 Aether as an Aether buff plus ×2 gold, 60 s, a second one refreshes),
  Caravan Star 3 (1 in 20: a free large caravan, `MarketSystem.getCaravanTier('large')`, no
  cargo; if a caravan is already out its 1.5× return is paid at once), the four classics 13
  each. Anomaly results are `rewards.notify` toasts. Mana overflow (+25% at full mana) is not
  built.
- **Measured, not estimated.** `sim/active-income.mjs` plays the real classes at a fixed CPS
  (2 clicks/s with combo and Frenzy, Celestial → Chrono Warp → Burst whenever ready, every
  anomaly clicked; seeded random) and divides by idle income. Before R3 this measures
  **×20.7**, not ×7: the §2.1 estimate left out Chrono Warp (×5 speed for 15 s per 60 s, about
  +1), Bursts cast inside Celestial (×4 on the payout) and Frenzy (combo 100 every ~50 s, then
  ×25 clicks plus 6 auto-clicks/s). With the specified values it measures **×7.2** (spells and
  anomalies without clicks ×6.5; Burst + Celestial + anomalies alone ×3.9–4.2; anomalies alone
  ×1.5, was ×2.8). **Deviation (rule 5):** the specified values do not reach ×2 on their own.
  Closing the rest needs changes outside this item's list (Chrono Warp's speed-up, Burst
  paying base rather than buffed CPS, Frenzy's ×5 on top of combo); left for an owner
  decision (STATUS "Noticed"). The pacing sim uses the measured ×7.2 while the casual player
  is present (it was a hand-set ×7.97 that matched neither the old nor the new code).
- **Pacing retune.** With R5's ×1.25 / +0.3% the casual first Transcend was day 1.5. Swept on
  the real classes (casual first Transcend; idle in brackets): ×1.25/+0.3% 1.5 (3.4),
  ×1.2/+0.3% 1.6 (2.9), ×1.15/+0.3% 3.7 (6.5), ×1.2/+0.1% **4.2 (7.2)**, ×1.15/+0.1% 3.8
  (6.8), ×1.1/+0.1% 4.0 (7.0), ×1.05/+0.1% 4.1 (7.2). The synergy rate is the big lever; the
  tier multiplier barely moves the first Transcend below ×1.2. Shipped ×1.2 / +0.1%: first
  Transcend day 4.2, 32 Transcends in the year, a reset at least every 14 days until day 206
  (was 184), median 58 upgrades per run.

*R28 implementation notes (Frenzy every 20 combo clicks; `js/systems/combo.js`,
`ClickerSystem.js`, `js/ui/comboBar.js`; player feedback, not in the original spec).*
- **Combo:** ×1 + 0.2 per click, full ×5 at click 20 (was +0.08 per click, ×5 at 50; the count
  was capped at 100). The count is no longer capped. Frenzy ending leaves it alone; only a 2 s
  pause drains it (above 20 it falls straight back to 20, then −5 every 0.2 s as before).
- **Frenzy at 20, 40, 60, …** of an unbroken combo. A milestone during a running Frenzy
  **extends** it by its duration, capped at 30 s (a longer timer, e.g. Time Flux's 25 s, is
  never shortened); nothing is queued. `ClickerSystem.lastFrenzyAt` (not saved, reset when the
  combo reaches 0) stops a short pause from re-firing the same milestone.
- **Retune (rule 5 deviation from "Frenzy ×5"):** five times as many Frenzies at the old
  values measured ×9.5 active/idle (was ×7.2). Swept on `sim/active-income.mjs` (6 seeds × 6 h,
  full rotation; main ×7.10): 3 s ×5 with 6 auto-clicks/s ×9.4; 2 s ×2 auto ×7.3; 3 s ×2 no
  auto ×6.9; **4 s ×3 no auto ×7.0**; 5 s ×3 no auto ×7.2. Shipped: Frenzy is ×3 click yield
  for 4 s per milestone with no auto-clicks (at 2 clicks/s that is ~40% uptime). Measured
  ×6.86 on the default seed (was ×7.23). Clicks-only play drops from ×2.73 to ×1.56: a steady
  clicker no longer gets the old 15 s auto-click burst, so clicking alone is a nerf; the
  ×2 target (R3) is still not met and stays an owner decision.
- The §5.2 "Frenzy in N" counter is built (combo bar text); the bar fills over the first 20
  clicks, then shows progress to the next milestone.

*R15 implementation notes (Seals, Dallah, Ledger, Souq; `js/systems/CalendarSystem.js`).*
- **Seals are a shard bonus** (#23 default 4), not a Transcend gate. Tier I bars as in roadmap
  §5.1 (depth 100, floor 501, 25 Catalysts, 15 Ascensions, Guild Rank 7, `bestRunDust` 1e8, 40%
  Codex). A Seal is a lifetime flag and never goes dark. **Deviation from the §6.1 table (rule
  5):** each Transcend pays 2 shards to both counters as before, plus `min(3, lit Seals)`
  **spendable shards only** (added to `fractureShards`, the shard-tree balance, never to
  `totalFractureShards`, which the x1.5 multipliers read). `PrestigeSystem.getTranscendShards`
  returns `{ base, seals }`; the cap is `SEAL_SHARD_BONUS_MAX`. Tier II bars (roadmap §5.1) are
  not built yet. `deserialize` no longer clamps lifetime shards up to the balance, since the
  balance can now pass it.
- **Why.** Counting Seal shards toward the multiplier was measured on the real classes with a
  stub bonus on every Transcend (casual): +1 Seal (3 shards) reached ~1e61 CPS by day 30 and a
  Transcend every few hours by month 3; +3 (5 shards) did 183 Transcends in week 1. Every
  multiplier shard is x1.5 Aether and x1.5 dust gain and the x10 gate cannot keep up (§10 risk 3:
  the layer-2 runway is shard-limited). As spendable-only shards they cannot move the
  multiplier; with the same stub (+3 spendable at every Transcend) casual still has 32
  Transcends in the year, 8.05e82 CPS and a reset at least every 14 days until day 184, the same
  as without. `npm run sim` does not model Seals (it pays a flat 2); the stub shows they do not
  change the headline, so it was left alone.
- **Daily Dallah:** local calendar day. The first visit pours a cup; each later day adds one,
  banking at most 3; claiming pays every banked day (60 Chrono Sand and one ready-to-claim bonus
  contract each) and refreshes one 1 h "fresh coffee" buff (+25% Aether, additive with other
  Aether buffs, exempt from the 10-minute buff cap). `visits` counts days seen, never a streak.
- **Weekly Ledger:** weeks run Monday to Sunday. 3 distinct goals from a pool of ten, drawn from
  those whose system the player has already met, seeded by the week number (same on every
  device). Progress is how far a lifetime counter has grown since the week began. Each goal pays
  10 Guild Seals once (6 before R33); all 3 add a stamp (cosmetic, kept forever).
- **Weekly targets (R33).** Flat targets (2 bosses, 300 clicks...) were finishable in one sitting,
  so weeklies felt like dailies. Each goal now asks for `LEDGER_WEEK_DAYS` = 4.5 x the player's
  typical day for that stat: on each new day seen, the growth of every goal stat since the last
  day seen is recorded (`calendar.rates`, last 7 samples), and the target is 4.5 x the median,
  rounded to 2 significant figures, never below the old flat target (and depth capped at 25).
  With fewer than 3 samples a goal asks for a fixed `start` (about 2.5x the old target). Days
  not opened add no sample, so a break never moves targets; the median shrugs off one binge or
  one idle day. Result (`test_r33_weekly.js`, a mid-game player at 30 min/day): no goal is done
  after a 1 h or even a 2 h session, all three are done after 5 days, leaving 2-3 days of slack
  in the week. Someone who plays 1 h a day gets twice the targets, still ~4.5 of their days.
  A week drawn before R33 keeps its flat targets and 6-Seal reward until it rotates (goals
  without a stored `target` are read as legacy). Multi-system goals were considered and left
  out: pace-relative targets already stop an AFK stat from finishing a week in one sitting.
  `npm run sim` does not model the Ledger (subgames off), so its report is unchanged.
- **Souq Rotation:** a four-week cycle, so each returns: Truffle Season (Desert Truffle grows
  x1.5), Falcon Week (Tower boss gold x1.5), Hourglass Week (Chrono Sand gained x1.5), Rosewater
  Week (every plant grows x1.25).
- **Clock rules.** The calendar only moves forward: "today" and "this week" are clamped to the
  highest day and week already seen. Setting the clock back pays nothing twice and does not
  rotate the Ledger back; returning to the old date pays nothing either. Missed days bank (cap
  3), missed weeks rotate, and nothing already earned is removed. The cost of a clock set far into
  the future is that the days in between do not pay again until the real date catches up.

### 6.2 Dust shop (replaces the perk list)

Costs in dust; each is a one-time feature unless marked. Tiers unlock by lifetime Ascension
count (1 / 3 / 5 / 10 / 20) so the shop grows with the player.

| Tier | Feature | Cost |
|---|---|---|
| Asc 1 | Cosmic Genesis (start with 15 Stalls, 1,000 gold) — keep | 5 |
| Asc 1 | **Auto-tap** (1 click/s while you're not tapping, and offline; R52) | 5 |
| Asc 1 | **Blueprint Memory**: keep the first 2 upgrades of each tier through Ascension | 25 |
| Asc 1 | Chrono Reservoir I–X (+4 h offline at 100% per rank) | 25 × 1.5^r |
| Asc 3 | **Auto-Buy** (best generator every 10 s) | 100 |
| Asc 3 | Titan's Legacy I–X (hero +100 HP, +25 atk) — keep | 30 × 1.5^r |
| Asc 3 | **Finger of Wasta** (+1% CPS per 100 clicks this run, cap +50%) | 150 |
| Asc 5 | Astral Crucible (×2 elixir duration) — keep | 40 |
| Asc 5 | **Golem Covenant** (Golem rows purchasable; roadmap keystone moved here) | 200 |
| Asc 5 | **Hourglass of Al-Ula** (Fast Forward 5 min and 1 h buttons) | 300 |
| Asc 10 | Automated Leylines (auto-cast at full mana) — keep | 500 |
| Asc 10 | **Blueprint Memory II** (keep all upgrades of tiers 1–7) | 1,000 |
| Asc 20 | **Resonant Start** (start each run with 1 of each of generators 1–10; see R6 notes) | 5,000 |
| any | **Dust Amplifier** (repeatable): +10% dust gain, additive, cost 100 × 2^n | — |

Everything here is a *thing the player can see working* on the next run. Dust itself is the
multiplier (`×(1 + 0.02 D_total)`), so nothing in the shop needs to be a percentage to feel
worth it.

*R6 implementation notes (`js/systems/DustShopSystem.js`, panel `js/ui/dustShop.js`).*
- **Resonant Start covers generators 1–10, not every unlocked tier.** With every unlocked tier,
  each run after a Transcend started with tiers 15–30 already producing, so recovering from a
  Transcend took minutes: the casual sim reached tier 30 in week 1 and then went 34 days without a
  reset (`sim:check` failed). With the 14 base tiers that passed (before R3/R20), but after the
  Chronicle (ladder back to 14 tiers) it handed over the whole ladder and Transcends bunched up:
  13 of 150 less than 6 h apart after the third and fourth Chronicles (R20's rule is none). With
  generators 1–10: 0 of 125, casual longest gap 1.8 days to day 270, a reset at least every 14
  days all year. Capping or steepening Dust Amplifier instead did not pass.
- **Dust Amplifier** is as listed (+10% dust gain per rank, additive, price 100 × 2^n, no cap).
  It replaces most of what Eternal Resonance (+50% Aether per rank, removed) gave the old sim:
  without it the casual sim misses `sim:check` (a 37-day stretch with no reset).
- **Old perks (save v5):** Cosmic Genesis, Chrono Reservoir, Titan's Legacy, Astral Crucible and
  Automated Leylines become owned shop items at their rank, free, even where the shop now asks
  more Ascensions. Eternal Resonance and Singularity Tap are refunded at their old prices
  (cost × 1.5^r per rank) into spendable dust; lifetime dust is untouched. Saves that already own
  Golems get Golem Covenant. The panel tells the player once what happened.
- **Where the features live:** Auto-Buy is an on/off chip on the generator header (buys up to 25
  single generators every 10 s, best Aether/s per Aether first, also in a background tab);
  Hourglass adds 5 min (300 sand) and 1 h (3,600 sand) warps next to the 30 s Fast Forward, at a
  flat price (1 h needs a sand bank of 3,600, Chrono Reservoir rank 3); Golem Covenant gates
  buying Golems (owned ones keep working); Finger of Wasta counts clicks since the last Ascension.
- **Transcend** empties the shop with the dust (the Auto-Buy switch is a preference and stays);
  the Transcend panel's "You reset" list says so.

### 6.3 Shard tree (layer 2 spend)

Shards are spent and **never refunded by Transcend** (the tree is permanent). 2 shards per
Transcend (+Seal bonus), ~64 shards in a year at the simulated pace. Branches:

- **Foundry** (ladder): each Transcend already unlocks a tier; here 1 shard buys "Deep
  Blueprint" for a tier (its 5 upgrades cost ÷10). 16 nodes.
- **Chronos**: auto-Ascend (2 shards, rule editable: ×1.2 / ×1.5 / ×2 / timer); offline cap
  +8 h; Fast Forward 6 h.
- **Tower**: Wardens every 250 floors (unique trophies); hero gear stays one tier of
  rarity higher on roll; "Second Wind" (one free boss retry per boss).
  *R18 implementation:* the tree does not exist yet, so Wardens unlock at the first Transcend
  (`hero.wardensUnlocked` is the hook for the tree node). Before that, every 250th floor is an
  ordinary boss. A Warden has x3 boss HP (attack as a boss), a 60 s timer and pays x3 boss gold
  and XP plus 3 Void Cores and 3 Boss Tokens; a timeout or death retreats one floor like a boss.
  The first kill of each Warden is a trophy (`hero.wardens.defeated`, keyed by floor) worth +2%
  Tower kill gold (roadmap §5.3 Meme Trophies). Trophies add gold only, so they never restart
  the climb. Wardens the hero passed before the unlock can be **challenged** from the Warden list
  without leaving his floor; winning or losing returns him to it at no cost.
- **Oasis**: Garden breeding (two adjacent mature plants may cross into a hybrid with a
  chance table; hybrids are new essences for 6 new recipes); golden mutation 1%; 5th Golem.
  *R17 implementation:* the shard tree does not exist yet, so breeding unlocks at the first
  Transcend (`garden.breedingUnlocked` is the hook for the tree node). Crossing two adjacent
  (same row or column) mature plants harvests both as normal and rolls 30% (neighbouring
  tiers) or 15% (Mint x Sidr) for 1-2 hybrid essence; a miss costs nothing. Golden mutation is
  1% per harvest: x3 essence, logged in the Herbarium. The 6 hybrid recipes are timed buffs
  sized below the base elixirs and stay hidden until the player first holds one of each
  ingredient (`alchemy.discovered`).
- **Guild**: contract bank 6 → 8; 2 rerolls; contracts pay shards 1 in 50.
- **Codex**: collection set bonuses ×1.5; "Hall of Fame" leaderboard column.

*R13 implementation (first three branches, `js/systems/ShardTreeSystem.js`, panel
`js/ui/shardTree.js`).* Shards are spent from `fractureShards`; `totalFractureShards` (the
×1.5/×1.5) is never touched, so buying a node never lowers production. The tree is saved as
`shardTree` and survives Transcend. Nodes and costs (the doc only fixed auto-Ascend at 2 and
Foundry at 1; the rest follow the mockup `docs/ui/mockups/shard-tree.html`, each branch a chain):
- **Foundry**: 16 Deep Blueprints for tiers 15–30 (the Transcend tiers), 1 shard each, open once
  that tier is open. They multiply nothing by themselves: the upgrade shop (R5) divides a tier's
  upgrade prices by `getDeepBlueprintDivisor(gs, tier)`. Until the shop is linked
  (`gameState.upgradeSystem`) they are shown but not sold.
- **Chronos**: Auto-Ascend (2) → Long Sleep (2, offline bands +8 h, stacking with Chrono
  Reservoir) → Hourglass (3, a 6 h Fast Forward once per 24 h: 6 h of current Aether production
  at 100% plus 6 h of Garden growth, paid instantly like offline time). Auto-Ascend rule "×m"
  means the Ascension would multiply this layer's lifetime dust by at least m
  (pending ≥ (m − 1) × lifetime); "timer" Ascends every 10 min / 30 min / 1 h / 4 h. Default ×2
  (the sim's manual policy). It never Ascends before the 10-min minimum run, can be switched off,
  and skips the big Ascension ceremony: each Auto-Ascension is one medium `auto-ascend` toast
  through the reward system, which merges same-kind toasts (×N, dust summed) and holds them in
  one batch while the tab is hidden (§10 risk 2). It runs while the game is open (also in a
  background tab); a closed game Ascends at most once on return, not once per missed window.
- **Tower**: Wardens (1) → Second Wind (2). Wardens moved from the first-Transcend stand-in to
  this node; a save that Transcended before the tree keeps them free (`shardTree.granted`).
  Second Wind: once per boss fight (Wardens included), a lost boss (timeout or death) refills the
  hero's HP and the timer instead of retreating a floor; the boss keeps the damage taken. The
  gear-rarity node is left for a later PR.
- **Auto-Blast** (R32, Chronos, 1, no prerequisite): Excavation dynamite throws itself; see §6.5.
- Oasis (Garden breeding) is not in these three branches, so breeding still opens at the first
  Transcend (`GardenSystem.isBreedingUnlocked`).

The Seals of Transcendence (roadmap §5.1) are **kept as the meta-goal that pays +1 shard per
lit Seal at each Transcend** and as the second half of the Chronicle gate, not as the Transcend
gate itself. Transcend must be a strictly good economic move at its gate (it is, with ×1.5/×1.5
per shard: two shards return ×2.25 Aether on a fresh dust pile that refills at ×2.25 the rate;
in the sim the previous CPS is regained in 1–3 days), and it must be *frequent enough* to be
the day-to-week rhythm. The Seals are weekly content; they should not hold the economy hostage.

### 6.4 The simulated curve (proposed, casual: 2 × 45 min/day; `sim_core_proposed.mjs`, variant D2)

**R31 curve (shipped, `npm run sim`, real classes).** Run Oil, casual / idle:

| | 1 h | 1 d | 1 w | 1 mo | 2 mo | 3 mo | 6 mo |
|---|---|---|---|---|---|---|---|
| casual run Oil | 635 | 8.5e4 | 1.1e9 | 1.4e10 | **7.5e11** | 9.9e10 | 5.6e14 |
| idle run Oil | 671 | 3.6e4 | 8.1e7 | 5.2e8 | **4.9e11** | 3.6e9 | 1.4e12 |
| casual Transcends (tiers) | 0 (8) | 0 (8) | 1 (9) | 5 (13) | 7 (15) | Chronicle I day 70 | 8 (16) |

Highest run Oil per layer before each Transcend (casual): 3.7e8, 1.1e10, 4.2e10, 5.8e11,
2e12, 1.9e13, 7e13, 7.5e14; later Chronicle cycles peak around 1e15–1e17. First Ascension
10 min; longest stretch without a reset (day 1–270) 2.0 days casual, 7.3 days idle; upgrades
per run median 31 casual (22 idle); about 106 Transcends and 11 Chronicles in the casual year.
`sim:check` asserts the casual 2-month run Oil stays ≤ 1e13. The table below is the pre-R31
proposal, kept for history.

**R52 (v5.3.0):** with passive-first clicking (§6.1 R52 block) run Oil casual / idle reads 1 w
2.1e7 / 8.4e8, 1 mo 6.3e11 / 7e8, **2 mo 2.5e12 / 5.7e11**, 3 mo 1.5e9 / 8.5e13 (the rows swing
with where a reset lands; the median over days 50–70 is 4.1e12 / 4.4e10). Casual Transcends at
days 4.3, 9.4, 15.0, 22.1, 30.9, 41.3, 54.1, 69.9, first Chronicle day 77 (idle 125); 106
Transcends and 11 Chronicles in the casual year. First Ascension idle 60 min, casual 10 min;
longest stretch without a reset (day 1–270) casual 2.3 days, idle 4.1 days.

**R57 (v5.30.0):** later Chronicles begin at the 9th Transcend (§6.1 R57 block). Months 6–12
run Oil casual / idle: median 8.4e9 / 2e11, highest 7.8e16 / 1e17 (v5.19.0: 1.7e14 / 8.6e12 and
9.2e20 / 1.2e19); with `--links` 3.9e9 / 1.7e10 and 2.5e15 / 1.2e16 (were 6.5e17 / 9.5e17 and
2.6e24 / 3.5e23). 28 Chronicles in the casual year (136 Pages), 14 idle; 94 with links.


Model: proposed §6.1 constants; upgrade shop; one new tier per Transcend to 30; dust-shop
spend modelled as 60% of the pile per Ascension; Auto-Buy from Ascension 3; auto-Ascend from
Transcend 1 at rule "pending ≥ 0.3 × lifetime dust, run ≥ 15 min"; active ×3 while present
(the sim is slightly generous vs the ×2 target); offline 50% between sessions (within cap).

| | 10 min | 1 h | 6 h | 1 d | 3 d | 1 w | 2 w | 1 mo | 2 mo | 3 mo | 6 mo | 1 y |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CPS | 5.3e6 | 1.7e13 | 3.4e15 | 1.5e20 | 1.1e22 | 2.8e25 | ~1e18–1e28 (fresh Transcend) | 2.6e31 | 1.6e49 | 3.1e54 | 2.0e80 | 1.7e83 |
| Ascensions (cum.) | 0 | 3 | 3 | 6 | 13 | 44 | 238 | 607 | 1,238 | 1,720 | 2,561 | 2,814 |
| lifetime dust (this layer) | 0 | 2.3e4 | 2.3e4 | 7.9e6 | 2.6e8 | 7.9e9 | 1.8e10 | 1.4e19 | 1.7e23 | 5.6e26 | 5.9e38 | 7.3e40 |
| Transcends | 0 | 0 | 0 | 0 | 0 | 1 | 5 | 10 | 18 | 23 | 30 | 32 |
| generator tiers | 14 | 14 | 14 | 14 | 14 | 15 | 19 | 24 | 30 | 30 | 30 | 30 |
| last run length | — | 15 min | 15 min | 15 min | 12 h | 5 h | 42 min | 2.6 h | 1.6 h | 1.6 h | 44 h | 29 d |

- First Ascension at **15 min** (the min-run rule; eligible earlier). Day 0: 6 Ascensions.
- Days 2–5 are the slow stretch (1–2 Ascensions/day, run length climbing to 12 h). That is
  **where the subgame unlock cadence and the dust shop carry the day** (roadmap §2.2: Bazaar,
  Golems, Constellations, zone/stratum stars all land here).
- Transcends at days 6, 7, 9, 11, 13.5, 16, 18.5, 21, 24, 27, 30, 33.5, 37, 40.5, 44.5, 48.5,
  53, 58, 63, 68.5, 74.5, 81, 88, 95.5, 103.5, 112.5, 122.5, 133.5, 146.5, 163, 193, 245.
  Spacing grows ~×1.1 per Transcend: every 2–3 days in month 1, weekly by month 3, 2–4 weeks
  by month 5, then it stalls. **Chronicle (layer 3) is therefore required by ~month 4**, not
  optional.
- Ascensions per week with auto-Ascend: ~190 in week 2 decaying to ~100 at month 3 and ~0
  by month 8 within this layer. The Chronicle's Challenges reset this clock.
- Calibration knobs, in order of leverage: Transcend gate growth (×10; ×30 halves the
  Transcend count and widens spacing to ~×1.15), shard multipliers (×1.5/×1.5; ×2/×2 keeps
  Transcends weekly through month 9 but CPS reaches 1e117), dust exponent (1/3), ascend
  rule, ladder cap (30; raise to 40 to delay the 2-month cap).

*Measured after R4* (`npm run sim`, real classes, casual, no upgrade shop, no auto-Ascend,
Ascend at pending ≥ lifetime dust, Transcend at the gate): first Transcend day 7.4, 31
Transcends in the year (8 by month 1, 22 by month 3, 29 by month 6), tier 30 at day 55,
1,274 Ascensions, CPS 1.8e81 at a year. A reset at least every 14 days until day 190; the last
Transcends land at days 170, 209 and 312. `TARGETS.gapWindowEndDay` in `sim/core-pacing.mjs`
was therefore 180 until the Chronicle (R20) restored 270 (§6.6). *After R5* (upgrade shop, before R3):
first Transcend day 1.5, 32 Transcends, a reset at least every 14 days until day 184 (R5 notes
in §6.1).

*Measured after R13* (same sim, which now Ascends by hand only while the player is there, and
around the clock once Auto-Ascend is bought with the first Transcend's shards): casual first
Ascension 10 min, 9 Ascensions on day 0 (was 12), first Transcend day 4.8 (was 7.4: fewer,
longer early runs pay more dust under the cube root), 31 Transcends, 1,267 Ascensions, a reset
at least every 14 days until day 184 (was 189), CPS 2.2e81 at a year.

*Measured after R3* (active multiplier measured on the real spells and anomalies, ×7.2 while
present; upgrade shop retuned to ×1.2 / +0.1%): casual first Ascension 10 min, first Transcend
**day 4.2** (was 1.5 after R5; idle 7.2, was 3.4), 3 Transcends by week 1, 11 by month 1, 23 by
month 3, 32 in the year, 1,318 Ascensions, a reset at least every 14 days until day 206 (was
184), CPS 2.4e82 at a year. Within the §6.4 target of ~day 6 (4–7).

**Current vs proposed, same profile:** today 16–17 Ascensions and ×200 CPS growth over the
year; proposed ~2,800 Ascensions, 32 Transcends, 16 new generator tiers, ×1e63 growth, and a
reset of some kind every 2–14 days for nine months.

### 6.5 Subgame economy (mostly endorsing the earlier studies)

| System | Change | Source |
|---|---|---|
| Tower | gear rolls at `1.11^(f-1)` (`CombatSystem.js:323`), monsters/gold/Market Index stay 1.12; legacy hero rebase + `indexFloor` | roadmap §0.2, §8 — agree |
| Tower | boss timer 30 s → **45 s**, boss HP 250× → 400× base; Wardens every 250 floors (60 s, ×3) | bosses should be the Tower's medium beat, not a speed bump |
| Tower | gold per kill `× M` already; add **Forge accepts gold** at `1e3 · 5^lvl · M` | progression doc §5.5 — agree |
| Tower | **gear levels** (R34): each equipped item +1 … +30, +4% main stat per level, paid in Monster Bones (`10·(L+1)`, 4,650 per slot to +30); the level stays with the slot when a better drop replaces the item | player feedback (#70) |
| Excavation | keep the v2 curves except the pickaxe cost (`100 · 1.6^L`, R32, below); add Strata Relics (1/200 per tile, pity 400), Aether Ore (10% of stone tiles → Bazaar), Gem Polishing 5:1 | progression doc §5.4, roadmap §5.3 — agree |
| Garden | keep curves; breeding via shard tree (month 1); golden mutation 1% | new |
| Alchemy | 7 → 13 recipes (6 hybrid essences); recipe **discovery** (a recipe appears when you first hold both ingredients) | new |
| Bounties | 30-min wall-clock refill, bank 6, unlocked-only types, no stale click types, reroll, Guild Rank replaces the 20% TP roll | roadmap §4.4, §3.2 — agree |
| Bazaar | replace the memoryless walk with **mean-reverting trends** (price follows a hidden target that moves every 2–5 min; the trend arrow is honest); caravans can carry gems and essences | makes "buy low" a skill |
| Talents | remove +3/Ascension and the 20% roll; S1 stars + S2 Record stars + S3 Guild Rank; keystones move to the dust shop (§6.2) | roadmap §3 — agree, with the keystone move |
| Achievements | 24 → ~90 ladder, +1% each (was 1.5%; 90 × 1.5% = ×2.35 is fine, but 1% keeps the category flat) | roadmap §5.3 |
| Fast Forward | keep the 30 s escalator; dust-shop Hourglass adds 5 min / 1 h buttons at `dt = 1.0` | progression doc §5.5 |

*R34 implementation (gear levels):* `CombatSystem.js` (`GEAR_LEVEL_*`, `gearStat`, `levelUpGear`),
panel in `js/ui/equipment.js`. The level multiplies the item's base stat; Crit and Drain keep
their drop caps (50% / 30%) and the panel won't sell a level that adds nothing. **Resource:**
Monster Bones, not Aether Ore or polished gems. Bones are the Tower's own drop (40% of loot rolls)
and their only sink was one 2-bone Alchemy recipe; Aether Ore already has a sink (Bazaar sales)
and lives in Excavation, so a Tower-only player couldn't level at all. **Carry-over:** the full
level moves to the new item (the level belongs to the slot), so a better drop is never a loss.
Sim (`npm run sim:tower`, the hero spends bones once a minute on the cheapest level): open
profile's 30-day wall 650 → 740 floors, casual 30-day best floor 740 → 820; casual reaches about
+12 on weapon/armor in week 1 and +29 by day 30. `--no-gear-levels` reproduces the old report.

*R32 Excavation pacing.* Pickaxe level L costs **`100 · 1.6^L`** stone (was `50 · 2.5^L`); HP,
stone yield, drills and dynamite are unchanged (stone also buys Golems, so its yield stays). The
cost now grows ×1.099 per depth against stone ×1.07: digging still slows with depth, but
gradually. Targets (casual, two 45-min sessions a day, measured in hours of play):
- first stratum in under 30 min; strata 2–4 each in one to a few sessions (≤ 6 h of play);
- depth ~100 (Aetherite) within the first week; the last stratum (Abyssal Heart, 151) in about
  five to six weeks, so all 7 strata and relics land in the first two months;
- after that the depth is an endless leaderboard climb at well under 1 depth per hour of play.

| casual, active play only | depth d1 / d7 / d14 / d30 / d60 | depth per h of play: first 2 h / week 2 / month 2 | h of play per stratum |
|---|---|---|---|
| before (`50 · 2.5^L`) | 48 / 70 / 78 / 89 / 99 | 24.5 / 0.76 / 0.22 | 0.2, 1.8, 13.0, >45 |
| after (`100 · 1.6^L`) | 54 / 104 / 123 / 145 / 166 | 29.5 / 1.81 / 0.47 | 0.3, 1.0, 2.3, 5.9, 13.6, 31.5 |

Left open 24/7 (one session, then drills only) the game now reaches depth 167 at a week and
229 at day 60 (was 94 and 120). Tiles per minute stay low deep down (0.6 in week 2, 0.1 in
month 2 while clicking): each tile is one big HP bar, which is the trade for a bounded number of
tiles per depth.

**Auto-Blast** (shard tree, Chronos, 1 shard, no prerequisite; `chronos_auto_blast`): throws the
dynamite whenever it is off cooldown, using the R26 blast area. It runs in
`MiningSystem.update`, so exactly when the drills run: while the game is open, in a background
tab and during Time Warp / Hourglass warps. **Offline: no** — a closed game digs nothing, so
there is nothing to blast; this keeps Excavation an "open game" subgame and adds no offline
income. On/off switch under the Excavation shop, saved as `shardTree.autoBlast.enabled`
(default on; older saves load with the default, no migration). A Chronicle resets the node like
the rest of the tree but keeps the switch. Measured idle (open 24/7): +2 depth at a week,
+8 at day 60, about +30% depth per hour deep down; it saves an active player the clicks.

*R18 implementation (Excavation and Alchemy rows):* every broken tile (stairs included) rolls
1/200 for a Strata Relic, with a pity of 400 tiles since the last relic (`miningGrid.relics`,
`miningGrid.relicPity`); each relic is +5% pickaxe power. **Deviation:** the roll targets the
current stratum's relic and, once that is found, the shallowest relic still missing above it, so
saves that were already deep when R18 shipped can still complete the set. Deeper relics need the
player there. Aether Ore: 10% of plain stone tiles add 1 to the Bazaar's existing `ore` stock
(sold at its price x the Market Index; no Bazaar code changed). Gem Polishing is in
`AlchemySystem.polishGem`: 5 of a tier make 1 of the next (ruby to void amethyst).

### 6.6 Chronicle (layer 3, R20; `js/systems/ChronicleSystem.js`)

*As shipped.* Gate: 12 Transcends this Chronicle **and** Seal set I (all seven Seals, R15). A
first Chronicle also opens at **24 Transcends** without the Seals (deviation, rule 5: the Seals
include a Tower floor and 40% of the Codex, and no single subgame should lock a prestige layer
away; 24 Transcends is ~day 90 casual, about when the calendar in §4.2 completes Seal set I).
After the first Chronicle the Seal half counts as met.

- **Resets:** run, shop upgrades, dust, lifetime dust, the Dust Shop (R6), Fracture Shards (both counters),
  shard tree, Transcend count (ladder back to 14 tiers). **Keeps:** Pages, Page upgrades,
  stamps, challenge records, Ascension count, talents, records, Codex, subgames, gold, sand,
  Wardens and Garden breeding (as free unlocks). Lifetime Transcends
  (`pastTranscends + transcendenceCount`) feed the talent ladder, achievements and leaderboard,
  so nothing pays twice and no record goes backwards.
- **Pages:** 3 + 1 per 2 Transcends past 12 per Chronicle (R31: past 6; R57: counting Transcends
  only up to the 9th, so at most 4 from Transcends). Every Page ever earned is **×1.4
  Aether** (BigNum). Measured: ×1.5, or a dust-gain bonus per Page, bunched Transcends into
  storms (several within hours) after the second Chronicle; ×1.4 keeps every Transcend at least
  6 h apart in the sim.
- **Page upgrades** (spendable Pages): Bookmark 3 (keep Auto-Ascend), Ink of Memory 4 (start with
  2 shards), Second Reading 5 (first clears pay double), Margin Notes 6 (+25% Aether per cleared
  challenge), Dog-Ear 5 (keep Long Sleep and Hourglass), Gilded Edges 8 (+1 Page per Chronicle).
- **Challenge runner:** a challenge stashes the run (Aether, run Aether, generators, shop
  upgrades, combo) in `chronicle.active` and starts a fresh one. Overrides are never written to
  `GameState`: every hook reads `getActiveRules(gs)`, derived from the running challenge id or the
  current Chapter. A save holds only ids and the stash; reload re-derives the rules; finishing or
  abandoning restores the stash exactly. No Ascend, Transcend, Chronicle or Hourglass during one.
- **Chapter 1, Sand** (10 weeks of real time from the first Chronicle): Excavation ×3, Aether
  **÷2** (the §4.1 draft said ÷10). Both pass the sim (measured before R3); with ÷10 the first Transcend after
  Chronicle I comes at +2.3 days instead of +1.6 and each later Chronicle lands ~7 days later.
  A ten-week tax on the main currency right after the biggest reset of the game should read as
  a twist, not a penalty, so the gentler ÷2 ships. Stamp pays 3 Pages. Challenges (layer
  bonuses off; goal is run Aether): Dry Well (combo cap ×2, no Frenzy, 1e11, 3 Pages), Lights
  Out (no spells, 1e11, 3), Small Souq (6 tiers, 1e10, 4, after 1 clear), Sandstorm (Aether ÷10,
  1e10, 5, after 3). Past Chapters' challenges stay playable. A new Chapter is a new `CHAPTERS`
  entry; `validateChapters` checks it.
- **Measured** (`npm run sim` after R3, which begins a Chronicle once allowed and a week after
  the last Transcend, buys Page upgrades, plays no challenges): casual Chronicles at days 105,
  193, 276, 362; a reset at least every 14 days through day 365 (was day 206 without the
  Chronicle); longest gap to day 270 2.4 days; 116 Transcends in the year, none within 6 h of
  another. Idle: Chronicles at 122, 216, 306. CPS at a year is lower than without the layer
  (~4e29 casual, just after Chronicle IV, vs 2e82): the layer restarts the climb rather than
  inflating numbers.
- **Challenge rewards (R56, v5.3.0).** Every challenge pays one permanent reward on its first
  clear, recorded in `chronicle.rewards` (default `{}`; a save from before R56 gets the rewards
  of its old clears on load, recorded so they pay once). Kinds, each one additive category,
  none compounding: `oil` (+x Oil, summed into the same factor as Margin Notes:
  `1 + 0.25·clears + Σoil`), `offline` (+x offline efficiency, added to talents and Chronos
  Contract), `startGen` (every run after an Ascension starts with n tier-1 generators, the max of
  this and Cosmic Genesis), `pages` (+n Pages per Chronicle), `dig` (+x pickaxe power). Values:
  Dry Well +10% Oil, Lights Out +10% offline, Small Souq 10 starting generators, Sandstorm +1
  Page per Chronicle; Still Water +25% dig, Dark Flats +10% Oil, Narrow Caravan +10% offline,
  Dead Sea +15% Oil. All Oil rewards together are +35%. Challenge runs keep layer bonuses off, so
  the Oil rewards don't shorten later goals.
- **Chapter 2, Salt (R56).** Starts where Sand ends (10 weeks). World rule: Excavation ×2, no
  Oil change. Stamp pays **0 Pages** (deviation from Chapter 1's 3): the core sim reaches the
  Salt stamp (casual Chronicle I at day ~70, Salt ends ~day 210) and plays no challenges, so
  a Page stamp would move the year-one report (late-year pacing was hot then; R57 has since tamed it). The
  stamp stays a collection keepsake. Challenges (layer bonuses off): Still Water (no Auto-tap, no
  spells, 3e6, 4 Pages), Dark Flats (no spells, 8 tiers, 2e6, 4), Narrow Caravan (5 tiers, Oil
  ÷2, 1e5, 5, after 1 clear), Dead Sea (Oil ÷10, no Frenzy, no Auto-tap, 1e5, 6, after 3). Goals
  are sized so a fresh idle run with no talents takes 12–31 h (Sand's take 7–31 h; R52 click model, 0.5 taps/s, no Auto-tap),
  measured with a greedy buyer on the real classes. `npm run sim` is unchanged.

---

## 7. System-by-system: keep / cut / merge / rework

| System | Call | Rationale |
|---|---|---|
| Monolith generators | **Rework** | add the upgrade shop, click upgrades, synergies, tier extension by Transcend; cards show "next milestone in N" |
| Ascension | **Rework** | cube-root dust, lifetime-dust multiplier, dust shop of features, ceremony |
| Transcend | **Rework (urgent)** | today a ×2000 loss; becomes the day-to-week rhythm with shards ×1.5/×1.5 and a tier per Transcend |
| Chronicle (new layer 3) | **Add (month 4 content)** | Challenges and Chapters; the only way to keep months 5–12 fresh without inflating numbers further |
| Void Tower | **Keep + rebalance** | gear 1.11, longer bosses, Wardens, Second Wind; it is the game's best "watch something happen" screen |
| Excavation | **Keep** | best-paced system; add relics, warm/hot hint, ore |
| Garden | **Keep + extend** | add breeding and golden mutations; it is the ideal offline system |
| Alchemy | **Keep, grow recipes** | discovery mechanic; hybrid essences |
| Grimoire | **Rebalance** | income spells retuned to ×2 active; overflow mechanic; spell levels from the shard tree (optional) |
| Talents | **Keep, re-source points** | per roadmap §3; keystones to the dust shop |
| Bounties / Quartermaster | **Rework** | wall-clock board, Guild Rank; Quartermaster stays as the Seal sink |
| Bazaar | **Rework** | mean-reverting prices, caravan cargo; otherwise it is dead weight |
| Achievements / Codex | **Extend** | ladder + collections; it is the retention spine |
| Leaderboard | **Keep, re-season** | Season 2 columns per roadmap §5.5. *Shipped in R19 with the stats that exist today (Max Floor on `hero.indexFloor`, Best Run Aether, Ascensions, Transcends, Max Depth); Seals lit and Codex % join as columns when R15/R14 ship. Season 1 stays readable as a frozen Hall of Fame.* |
| Fast Forward | **Keep** | bounded; a dust-shop feature |
| Chrono Sand | **Keep** | with Hourglass it has a sink again |
| **Cut**: Eternal Resonance, Singularity Tap perks | **Cut** | the dust multiplier already is the number; both are counter-productive to buy today |
| **Cut**: commodity random walk | **Cut** (replaced) | coin flip with a house edge |
| **Merge**: Quick Cast bar + buff bar | **Merge** into one "Rotation" strip | two UI elements for the same concept |

---

## 8. Retention without dark patterns

- **Offline.** 100% for 8 h, 50% to 24 h, 0 after; the modal shows the cap and what finished
  (Golem harvests, caravan, contracts arrived). Chrono Reservoir buys more cap: each rank
  adds 4 h to the 100% band and moves the end of the cap out by 4 h (the 50% band stays 16 h);
  built in R12 (`computeOfflineBands`). Efficiency multipliers apply to the banded total. No clock
  tricks pay more than the cap.
- **Daily Dallah** (roadmap §5.4): first visit of a calendar day; banks 3 days; no streak,
  "days visited" is a lifetime count.
- **Weekly Ledger**: 3 goals from unlocked tabs, each sized to ~4.5 days of the player's own
  typical day (R33), so a week takes several sessions but leaves 2–3 days of slack; Seals +
  stamp; rotates Monday; missing one loses nothing.
- **Souq Rotation**: one modifier per week, always positive, always returns.
- **Seasons = Chapters** (3 months): new rules, new collection, new leaderboard; a Chapter
  missed is a Chapter next year. No exclusive items ever.
- **Meta-collection** that persists through everything: Codex, Generator Codex, Bestiary,
  Herbarium, Anomaly Log, Chapter stamps. Completion % is the one number that only goes up.
- **Honest near-misses only.** Shimmer hints and "escaped at 4%" show real state.
- **No notifications, no timers that punish, no monetization.** Toasts never block input;
  only Transcend and Chronicle have confirms, and both list what is kept.
- **Grandfathering** of existing saves per roadmap §8: unlocks granted, keystones free,
  talent points kept, floors rebased with the record preserved. Add: **Transcend refund** —
  anyone with `transcendenceCount ≥ 1` on migration gets `max(2 × transcendenceCount, 4)`
  shards and an apology toast; their lost dust is not recoverable but the new shards are
  worth far more than the old ones.

---

## 9. Prioritized roadmap (one PR each)

Effort: S < 30 lines, M 30–120, L > 120 or new UI. Order is by impact per effort with
dependencies respected.

| # | Change | Files | Impact | Effort |
|---|---|---|---|---|
| 1 | **Dust multiplier reads `totalCosmicDust`**; Transcend confirm states the real trade until #4 lands | `js/systems/GameState.js:149`, `js/main.js:1703` | removes the spend-regret trap today | S |
| 2 | **Dust exponent 0.25 → 1/3**; min 10-min run shown on the Ascend button | `js/systems/PrestigeSystem.js:77`, `main.js` Ascend button | halves run-length growth per Ascension | S |
| 3 | **Active income retune**: Burst 120 s → 45 s / cd 45 s, Celestial ×4 → ×2.5, Supernova 600 s → 180 s; add Mirage and Caravan Star anomalies | `SpellSystem.js:5-54, 99, 132`, `ClickerSystem.js:119-150` | idle becomes the baseline | S |
| 4 | **Transcend rework**: gate `1e9 × 10^k`, 2 shards per Transcend, shards ×1.5 Aether and ×1.5 dust, +1 generator tier per Transcend (procedural `BUILDING_DEFINITIONS` extension to 30), migration refund | `PrestigeSystem.js:143-172`, `GameState.js:155`, `BuildingSystem.js` (tier generator), `main.js` prestige UI | the layer-2 rhythm; ends the plateau | M |
| 5 | **Upgrade shop**: data table + `UpgradeSystem.js` (5 per tier, 15 click, 8 synergy), card UI under the generator list, reset on Ascend, Blueprint Memory hooks | new `js/systems/UpgradeSystem.js`, `GameState.js` (production and click), `main.js`, `index.html` Monolith tab, `css/style.css` | the "one more" loop | L |
| 6 | **Dust shop** replaces `ASCENSION_PERKS`: feature list §6.2, tiers by Ascension count, Auto-Buy, Finger of Wasta, Hourglass, Golem Covenant | `PrestigeSystem.js:5-13, 126-141`, `BuildingSystem.js` (auto-buy), `FastForwardSystem.js` (5 min / 1 h), `GardenSystem.js` (Golem gate), `main.js` | features to buy every Ascension | M |
| 7 | **Progressive unlocking** (roadmap §2, with the keystones moved to the dust shop) | `GameState.js` (`unlocks`), `main.js` (`switchTab`, nav), `index.html` | onboarding; removes the 14-tab wall | M–L |
| 8 | **Tower gear 1.11** + hero rebase + `indexFloor`; boss timer 45 s / HP 400× | `CombatSystem.js:27-29, 86, 96, 323`, `MarketSystem.js:48` | ends the auto-climb; bosses matter | S + M |
| 9 | **Talent economy** (roadmap §3): remove +3 and the 20% roll; S1/S2/S3 | `PrestigeSystem.js:119`, `BountySystem.js:58`, new `records` slice in `GameState.js`, `main.js` Constellations header | points feel earned | M |
| 10 | **Contract board** (roadmap §4.4) | `BountySystem.js` | fixes the idle jam; feeds S3 | S–M |
| 11 | **Reward grammar**: toast component, ceremony overlay, tier instruments; route every `spawnFloatingText` at screen centre through it | new `js/ui/rewards.js` (+ `js/ui/rewardQueue.js`, `css/rewards.css`), `AudioEngine.js`, call sites in `js/systems/*` | dopamine | M–L |
| 12 | **Offline cap + modal** (8 h / 50% to 24 h); Chrono Reservoir raises it | `SaveManager.js:69-107`, `main.js:519`, `index.html:559` | pillar 4; closes clock skips | S |
| 13 | **Shard tree UI + first 3 branches** (Foundry, Chronos with auto-Ascend, Tower Second Wind) | new `js/systems/ShardTreeSystem.js`, `main.js`, `index.html` | layer-2 spend | L |
| 14 | **Codex 2.0**: achievement ladder, collections, Generator Codex, batched toasts | `AchievementSystem.js`, new `CollectionSystem.js`, `main.js` | long goals | M–L |
| 15 | **Seals + Daily Dallah + Weekly Ledger + Souq Rotation** | new `js/systems/CalendarSystem.js`, `main.js` | week structure | M |
| 16 | **Bazaar mean-reverting prices + caravan cargo** | `MarketSystem.js:189-206, 147-166` | makes trading a skill | S–M |
| 17 | **Garden breeding + golden mutation + 6 hybrid recipes + recipe discovery** | `GardenSystem.js`, `AlchemySystem.js` | month-1 content | M–L |
| 18 | **Wardens + Strata Relics + Aether Ore + Gem Polishing** | `CombatSystem.js`, `MiningSystem.js`, `AlchemySystem.js` | month-2 content | M |
| 19 | **Leaderboard Season 2** | `js/leaderboard.js`, `supabase/leaderboard_season2.sql` (new table `leaderboard_season`, keyed by season; Season 1 table frozen, never rewritten) | fairness after #8 | S–M |
| 20 | **Chronicle layer**: Pages, Challenge runner (rule overrides on `GameState`), Chapter 1 "Sand" | new `js/systems/ChronicleSystem.js`, `main.js`, `index.html` | months 4–12 | L |
| R31 | **Economy redesign core** (issue #67): 20-tier ladder ×10 cost / ×4 output, dust `10·(A/1e4)^(1/5)`, additive dust/shard/Page bonuses, gate `400·1.6^k`, repriced upgrade and dust shops, save step v8. Targets: ~1e12 Oil at day 60, ≤ 1e13 casual (asserted) | `BuildingSystem.js`, `PrestigeSystem.js`, `GameState.js`, `UpgradeSystem.js`, `DustShopSystem.js`, `ShardTreeSystem.js`, `ChronicleSystem.js`, `migrations.js`, `sim/core-pacing.mjs` | numbers players can read | L |
| R53 | **Reprice outside the core** (issue #127): Oil achievement ladder 1e5–1e16, Forge `100·1.5^L`, subgame → Oil links one additive category (cap +150%), Geode/Nectar additive and smaller; `sim --links` | `AchievementSystem.js`, `CombatSystem.js`, `WorldLinks.js`, `GameState.js` (one line), `PrestigeSystem.js` (dust links), `tabBonuses.js`, sims | links can't add decades | M |

**Minimum set that changes the verdict: #1–#6.** They touch only the core files, keep every
save, and move the game from "one day" to "two to four months". #7–#12 make it feel like a
different game. #13–#20 are the year.

---

## 10. Open questions and risks

1. **Number inflation.** The proposed curve reaches ~1e83 CPS at a year (1e117 with the ×2/×2
   shard variant). BigNum handles it, but the Saudi-meme naming of magnitudes runs out
   (standard notation past 1e63 is nonsense). Decide: scientific by default past 1e30, or
   invent 30 meme magnitude names.
   *Resolved by R31 (v5.0.0):* run Oil now sits near 1e12 at two months and peaks around
   1e15–1e17 late in year one (§6.1 R31 block, §6.4).
2. **Auto-Ascend cadence.** With auto-Ascend from Transcend I, the sim shows ~100–200
   Ascensions/week. Each is a ceremony; the ceremony must be skippable/aggregated
   ("12 Ascensions while you were away: +3.1e7 dust") or it becomes noise.
3. **Ladder cap at tier 30 (month 2).** Either raise to 40 and slow Transcend gate growth to
   ×30, or let the Chronicle add tiers. I lean to ×30 gate growth from Transcend X onward
   (two-regime gate), to be re-simulated.
   *Re-simulated in R4:* the ×30 regime makes it worse (gap target held to day 130 instead of
   190), so the gate stays ×10 and the knob is off (§6.1 notes). Tier 30 lands at day 55; past
   it, shards alone keep Transcends coming every 5–21 days to ~day 170, then at days 209 and 312. The Chronicle (or more
   tiers) is what extends that.
4. **Layer 3 is a content commitment**, roughly a Chapter a quarter. If the owner cannot ship
   that, stretch layer 2 instead (gate ×30, shards ×2/×2) and accept ~1e117.
5. **Model fidelity.** `sim_core_proposed.mjs` is a float model, not the real classes, and it
   ignores subgame multipliers (Depth Resonance ×3 at a week, Enchanter, Catalysts ~×1.8).
   Those shift the curve earlier by a few hours to a day; they do not change its shape.
   *R53:* on the R31 curve they did change it (2-month Oil ~4e16); they are now one additive
   category capped at +150% and `npm run sim -- --links` measures them (§6.1, R53 block). The
   upgrade-shop data table should be simulated on the real classes before #5 ships.
6. **The roadmap's Seven Seals as the Transcend gate** is in conflict with this proposal; I
   keep the Seals as a shard bonus and half of the Chronicle gate. The owner should pick one.
7. **Active ×2 vs the playtesters' habits.** Players used to ×7 spell income will feel the
   nerf. Ship #3 together with #5 (the upgrade shop) so the Monolith has more to do, not less.
8. **Grandfathered saves at floor 700k and 1e46 gold** are a leaderboard and Enchanter
   problem already analysed in both earlier docs; nothing here changes those conclusions.
9. **Mobile.** Every new surface (upgrade cards, toasts, shard tree) must work at phone
   width; the buff bar already moves to the bottom on mobile, so there is a pattern.

---

## Appendix A: how to reproduce the measurements

- Current core: `node sim_core_current.mjs` (scratchpad). Imports the real classes with
  `globalThis.window` stubbed and `particles.suppressed = true`. ~2 s runtime for three
  profiles over a year with adaptive dt (1 s → 300 s).
- Proposed core: `VARIANTS='[{"name":"D2","shardAetherMult":1.5,"shardDustMult":1.5,"shardsPerTrN":2,"trBase":1e9,"trGrowth":10,"ascRule":0.3,"minRun":900}]' node sim_core_proposed.mjs`.
- Transcend ratio: `(1 + 0.1 · floor(D/1e4)) / (1 + 0.02 · D)` → 5e-4 for all D ≥ 1e5.

## Appendix B: relationship to the existing docs

- `docs/game-theory-progression.md` §5.1–5.6: shipped; this proposal keeps every curve.
- `docs/gamification-roadmap.md`: §2 (unlocking), §3 (talent economy), §4.4 (contracts),
  §5.3 (collections), §5.4 (daily/weekly), §8 (migration) are adopted, with keystones moved to
  the dust shop. §0.2 (gear 1.11) adopted. §5.1 (Seals as Transcend gate, sqrt shards) is
  **replaced** by §6.1–6.3 here because Transcend is currently net-negative and must become a
  frequent, strictly positive reset. §10 Q4 ("core pace stays out of scope") is reversed: the
  core is the first thing to fix.
