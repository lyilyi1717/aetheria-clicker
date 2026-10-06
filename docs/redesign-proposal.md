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

**Every week.** Weekly Ledger: 3 goals drawn from unlocked tabs, Seals + a Codex stamp.
Souq Rotation: one gentle world modifier that returns later (Truffle Season, Falcon Week).
A Seal of Transcendence lights roughly weekly through month 2 (depth 100, floor 501, 25
Catalysts, Guild Rank 7, bestRunDust 1e8, 40% Codex, 15 Ascensions).

**Every month.** A new generator tier reaches the top of the ladder (Transcend count). A new
shard-tree branch becomes affordable. Month 1: Garden breeding opens. Month 2: Tower Wardens
(every 250 floors). Month 3: Stratum 7 (Abyssal Heart) in sight. Month 4: Chronicle unlocks.

**Every season (3 months).** A Chronicle **Chapter**: a 6–10-week rule set with its own small
upgrade tree and a Page reward, e.g. "Chapter of Sand" (Excavation is ×3 but Aether is ÷10;
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
  combo bar gets a visible "Frenzy in N" counter so the 100th click is anticipated.
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

| Item | Today | Proposed | Why |
|---|---|---|---|
| Generator tiers | 14, fixed (`BuildingSystem.js:4-120`) | 14 + **one new tier per Transcend**, up to 30; tier n: cost ×18, CPS ×7 over tier n−1 (the existing ladder's own ratios); Chronicle extends again | the finite ladder is the plateau |
| Cost growth | 1.15 | 1.15 | fine; do not touch |
| Milestones | ×2,2,2,2,3,3,4,5,10 at 10…1000 | same | good discrete pops; keep |
| **Upgrade shop (new)** | none | per tier, 5 upgrades at owned ≥ 1/10/50/100/200, cost `baseCost × 10^(k+1)`, each **×1.25** that tier (draft: ×2, see R5 notes); 15 click upgrades (×2 each); 8 synergy upgrades ("Dallah per Shawarma": tier A **+0.3%** per tier B owned; draft: +1%) | the "one more" itch; ~60–170 purchases per run |
| Click yield | `1 + 3% CPS`, `clickPower` constant | `clickPower × 2^(clickUpgrades) + 3% CPS`, combo 5× unchanged | clicks stay relevant in the first 5 min of every run |
| Active multiplier | ~×7 (spells + anomalies) | **~×2** (Burst 45 s/45 s, Celestial ×2.5, Supernova 180 s) | idle is the baseline (pillar 4) |
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
  from day 7.4 to day 0.2 (8 Transcends on day 1, tier 22 by the end of day 1). The core is
  very sensitive in week 1: lifetime dust sits just under the 1e9 gate for days, so any
  constant production factor tips it over early (a flat ×1.2 already moves the first Transcend
  to day ~4). Shipped: **×1.25 per tier upgrade (×3.05 for all 5), synergy +0.3% per source
  owned** (needs 25 of the target and 50 of the source to appear), **click upgrades ×2**
  (`clickPower × 2^n + 3% CPS`, cost 10 × base cost of tier i; they don't move pacing).
  Measured: casual first Transcend day 1.0 (idle 3.7), 32 Transcends in the year, a reset at
  least every 14 days until day 229, median 62 upgrades per run (max 173 with 30 tiers).
  The early-Transcend shift is expected to come back with R3 (active ×8 → ×2 roughly halves
  casual income, #23 default 5); retune `TIER_UPGRADE_MULT` / `SYNERGY_PER_UNIT` then.
- **Reset:** Ascend clears bought upgrades except those a keep rule accepts
  (`addAscendKeepRule((upgrade, gameState) => bool)`; upgrades carry `kind`, `tier`, `level`),
  which is the hook for Blueprint Memory I/II (R6). Transcend clears all.
- **UI:** a tile row on the Falafel tab above the generators (app-shell mockup), with the
  selected upgrade's full card under it and a "Buy all" button. Saved as an array of ids;
  saves without the field load with nothing bought.

### 6.2 Dust shop (replaces the perk list)

Costs in dust; each is a one-time feature unless marked. Tiers unlock by lifetime Ascension
count (1 / 3 / 5 / 10 / 20) so the shop grows with the player.

| Tier | Feature | Cost |
|---|---|---|
| Asc 1 | Cosmic Genesis (start with 15 Stalls, 1,000 gold) — keep | 5 |
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
| Asc 20 | **Resonant Start** (start each run with 1 of every unlocked tier) | 5,000 |
| any | **Dust Amplifier** (repeatable): +10% dust gain, additive, cost 100 × 2^n | — |

Everything here is a *thing the player can see working* on the next run. Dust itself is the
multiplier (`×(1 + 0.02 D_total)`), so nothing in the shop needs to be a percentage to feel
worth it.

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

The Seals of Transcendence (roadmap §5.1) are **kept as the meta-goal that pays +1 shard per
lit Seal at each Transcend** and as the second half of the Chronicle gate, not as the Transcend
gate itself. Transcend must be a strictly good economic move at its gate (it is, with ×1.5/×1.5
per shard: two shards return ×2.25 Aether on a fresh dust pile that refills at ×2.25 the rate;
in the sim the previous CPS is regained in 1–3 days), and it must be *frequent enough* to be
the day-to-week rhythm. The Seals are weekly content; they should not hold the economy hostage.

### 6.4 The simulated curve (proposed, casual: 2 × 45 min/day; `sim_core_proposed.mjs`, variant D2)

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
is therefore 180 until the Chronicle (R20) restores 270. *After R5* (upgrade shop, before R3):
first Transcend day 1.0, 32 Transcends, a reset at least every 14 days until day 229 (R5 notes
in §6.1).

**Current vs proposed, same profile:** today 16–17 Ascensions and ×200 CPS growth over the
year; proposed ~2,800 Ascensions, 32 Transcends, 16 new generator tiers, ×1e63 growth, and a
reset of some kind every 2–14 days for nine months.

### 6.5 Subgame economy (mostly endorsing the earlier studies)

| System | Change | Source |
|---|---|---|
| Tower | gear rolls at `1.11^(f-1)` (`CombatSystem.js:323`), monsters/gold/Market Index stay 1.12; legacy hero rebase + `indexFloor` | roadmap §0.2, §8 — agree |
| Tower | boss timer 30 s → **45 s**, boss HP 250× → 400× base; Wardens every 250 floors (60 s, ×3) | bosses should be the Tower's medium beat, not a speed bump |
| Tower | gold per kill `× M` already; add **Forge accepts gold** at `1e3 · 5^lvl · M` | progression doc §5.5 — agree |
| Excavation | keep all v2 curves; add Strata Relics (1/200 per tile, pity 400), Aether Ore (10% of stone tiles → Bazaar), Gem Polishing 5:1 | progression doc §5.4, roadmap §5.3 — agree |
| Garden | keep curves; breeding via shard tree (month 1); golden mutation 1% | new |
| Alchemy | 7 → 13 recipes (6 hybrid essences); recipe **discovery** (a recipe appears when you first hold both ingredients) | new |
| Bounties | 30-min wall-clock refill, bank 6, unlocked-only types, no stale click types, reroll, Guild Rank replaces the 20% TP roll | roadmap §4.4, §3.2 — agree |
| Bazaar | replace the memoryless walk with **mean-reverting trends** (price follows a hidden target that moves every 2–5 min; the trend arrow is honest); caravans can carry gems and essences | makes "buy low" a skill |
| Talents | remove +3/Ascension and the 20% roll; S1 stars + S2 Record stars + S3 Guild Rank; keystones move to the dust shop (§6.2) | roadmap §3 — agree, with the keystone move |
| Achievements | 24 → ~90 ladder, +1% each (was 1.5%; 90 × 1.5% = ×2.35 is fine, but 1% keeps the category flat) | roadmap §5.3 |
| Fast Forward | keep the 30 s escalator; dust-shop Hourglass adds 5 min / 1 h buttons at `dt = 1.0` | progression doc §5.5 |

*R18 implementation (Excavation and Alchemy rows):* every broken tile (stairs included) rolls
1/200 for a Strata Relic, with a pity of 400 tiles since the last relic (`miningGrid.relics`,
`miningGrid.relicPity`); each relic is +5% pickaxe power. **Deviation:** the roll targets the
current stratum's relic and, once that is found, the shallowest relic still missing above it, so
saves that were already deep when R18 shipped can still complete the set. Deeper relics need the
player there. Aether Ore: 10% of plain stone tiles add 1 to the Bazaar's existing `ore` stock
(sold at its price x the Market Index; no Bazaar code changed). Gem Polishing is in
`AlchemySystem.polishGem`: 5 of a tier make 1 of the next (ruby to void amethyst).

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
- **Weekly Ledger**: 3 goals from unlocked tabs; Seals + stamp; rotates Monday; missing one
  loses nothing.
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

**Minimum set that changes the verdict: #1–#6.** They touch only the core files, keep every
save, and move the game from "one day" to "two to four months". #7–#12 make it feel like a
different game. #13–#20 are the year.

---

## 10. Open questions and risks

1. **Number inflation.** The proposed curve reaches ~1e83 CPS at a year (1e117 with the ×2/×2
   shard variant). BigNum handles it, but the Saudi-meme naming of magnitudes runs out
   (standard notation past 1e63 is nonsense). Decide: scientific by default past 1e30, or
   invent 30 meme magnitude names.
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
   Those shift the curve earlier by a few hours to a day; they do not change its shape. The
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
