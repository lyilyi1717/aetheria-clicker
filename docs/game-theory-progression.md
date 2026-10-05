# Aetheria Clicker — Progression & Economy Study (Excavation, Garden, and the core loop)

**Status:** design spec, written 2026-10-05 against v1.1.1 (`js/version.js`). Re-checked
against **v1.3.0**:
- v1.2.0 fixed bug B1 (`rubys`), with a migration at `GameState.js:286-289`, and added
  background autosave.
- v1.2.2 added bulk Gold → Chrono Sand transmute (x1 / x10 / x100 / x1K / Max).
- v1.3.0 added per-tab Active Bonuses strips (`js/tabBonuses.js`).

Line numbers below are from v1.1.1 unless they say otherwise. The simulation ran on v1.1.1
code. None of the v1.2–1.3 changes alter the pacing results.
**Author:** game-theory / economy designer agent. This is the same role that maintains
`dev/nokia-snake/docs/game-theory-design.md`; that doc's methodology carries over.

**Scope rule:** read-only on game code. Every change below is a spec for a later
implementation pass. All `file:line` references are to v1.1.1.

**Method:** I read every system and ran a headless node simulation of the real system
classes, with audio and particles stubbed and `setTimeout` made synchronous. Bot policies
drive purchases. All simulation numbers below come from real `js/systems/*.js` code, not
estimates. The sim scripts lived in the session scratchpad and are not committed.
Modelling assumptions are in §1.

Principles carried over from the Snake doc (not re-researched):
- **Additive within a category, multiplicative across categories.** One category must
  never compound with itself.
- **Order-of-magnitude milestones.** Each milestone needs a visible threshold. Rewards are
  small relative to the threshold.
- **Pacing comes from a bottom-up model.** Earn rate vs cost curve, plus a calibration knob.
  It is never reverse-engineered.

---

## TL;DR

1. **Excavation and Garden are too fast because their costs stop scaling while their
   rewards keep scaling.**
   - **Excavation.** Tile HP caps at 25 from depth 31 (`MiningSystem.js:9`). The final
     pickaxe (power 35, 5M gold) one-shots every tile. A gold cache still pays
     `100·1.2^depth` (`MiningSystem.js:146`). The result is infinite gold, about
     1 depth/s forever, and every gold sink saturated within ~1 h.
   - **Garden.** It is free: seeds return themselves plus a 25% mutation. Grow times are
     20–480 s. Mature plots are always waiting, so throughput is bounded only by how often
     the player clicks Harvest.
2. **They "don't add to progression" for three reasons.**
   - **Their links into the core are invisible.** No UI shows Universal Mastery, Leyline
     Overflow or the Catalyst multiplier.
   - **Linear % bonuses are dwarfed by Cosmic Dust.** Dust is ×1e6 by day 1 and ×2.5e7 by
     week 1 for a casual player.
   - **Their outputs land in dead-end stockpiles.** At 24 h a casual player holds about
     100k each of sapphires and emeralds and 107k mis-keyed "rubys", while essences sit
     near 0.

   In raw numbers they *do* matter: removing both drops casual 24 h Aether/s from 1.6e28 to
   1.7e24. The player just can't see it, and it arrives as temporary ×12 buff stacks rather
   than as progression.
3. **The core loop has no pacing either.**
   - First-ascension eligibility (1e9 run-Aether) arrives at **62 s** for a casual player
     who clicks 2/s, and at 196 s without the subgames.
   - An optimal bot reaches 1e57 total dust in 24 h.
   - Several hard float-overflow walls exist (Combat floor ≈6,220; gold caches pay 0 past
     depth ≈3,893).

   Retuning the core is a separate study. The redesign below therefore links the subgames
   into the *Dust gain* layer: a ×2 on dust gain stays felt however the core is
   re-scaled.
4. **Ship-first set (§8):**
   - Bug and overflow fixes.
   - Excavation curves: exponential HP; pickaxe and drills priced in **stone**; cache gold
     at 1.07^d; drill timer fix.
   - Garden times ×15 and slower watering.
   - Linearize the three self-compounding links (Catalyst, Excavation Mastery, Leyline
     Overflow).
   - Two visible Dust links: Geode Attunement and Nectar Offering.
   - Additive buff category.
   - A Mastery readout.

   The projected arc is depth **10 / 24 / 53 / 76 / 98 / 118** at 10 m / 1 h / 6 h / 1 d /
   1 w / 4 w, and a garden tier ladder that completes over day 1, against today's
   **~1 depth per second, unbounded**.
5. **Coordinator add-ons:**
   - Garden Golems (§5.6): stone + Mana Sap priced, one per row of 4 plots, auto-harvest and
     replant same seed, offline-capable.
   - Matching Auto-Drill rebalance.
   - A thin global bar for timed buffs and spell cooldowns (§6), *alongside* the v1.3.0
     per-tab strip. The strip keeps the persistent bonuses and gains the Mastery entries.
6. **Gold (§5.5).** Tower gold outgrows difficulty by 1.0268^floor, and every Bazaar
   route is absolute. Decision (d):
   - Tower gold exponent 1.15 → **1.12**.
   - Every Bazaar price and caravan tier is anchored to a **Market Index
     M = 1.12^(maxFloor−1)**.
   - %-of-gold caravans are rejected: at today's 2.05× per 5 min that compounds to
     ×5.5e3/hour.
   - Chrono Sand is re-priced to 1,000·M gold per 30 s, with a bank cap equal to the
     offline cap (closes B12: 1e46 gold → ~3e44 s of sand).
   - The Golden Enchanter stays the large geometric sink. Existing 1e46-gold saves keep
     their gold; the Enchanter absorbs it as a one-time ~100 levels.

---

## 1. Simulation setup & assumptions

- **Engine.** I imported the real system classes in node 22, stubbed `sound`/`particles`,
  and set `window = {innerWidth, innerHeight}`. `setTimeout(fn) → fn()` makes the stairs
  regenerate the grid immediately. Each tick replicates `main.js:1376 onSimTick` exactly.
  `dt = 0.05 s` matches the real 20 Hz foreground sim. `dt = 0.1` and `0.2` were used for
  24 h and 7 d runs, which halves the auto-drill hit cap; see §3.2.
- **Seeded RNG.**
- **Profiles:**

| Profile | Clicks | Active window (watering, skills, anomalies) | Check-in cadence after | Ascension rule |
|---|---|---|---|---|
| `opt` | 4/s | 1 h | 1 s | when pending ≥ total dust (doubling) |
| `human` | 3/s | 1 h | 5 min | pending ≥ 2× total dust, run ≥ 15 min |
| `casual` (headline) | 2/s | first 10 min only | 15 min | pending ≥ 4× total dust, run ≥ 1 h |

- **What a check-in does:**
  - Buy the best building by ΔCPS/cost, plus Aether Forge if it costs ≤ 2% of Aether.
  - Claim bounties; spend talent points and Guild Seals (Aetheric Treaty first).
  - Spend gold on the cheapest of next pickaxe / next drill / Enchanter.
  - Transmute stone; send the 5,000-gold caravan.
  - Harvest and replant the garden.
  - Brew every affordable recipe.
  - Cast Celestial Alignment, Aether Burst and Void Cataclysm.
  - Use Dynamite.
- **Counterfactuals:** `nomining=1` and `nogarden=1` disable the subgame, including its
  Leyline Overflow share.
- **"1 hour / 1 day / 1 week of play"** means game-time with the tab open and foreground.
  Two real-world facts make it *harder* than this:
  - **Closed tab.** Offline only credits Aether and Chrono Sand (`SaveManager.js:71-102`).
    Combat, Excavation and Garden do not progress offline at all.
  - **Hidden tab.** The game relies on a 200 ms `setInterval` fallback that clamps each
    catch-up to 5 s (`GameLoop.js:58-68`). Chrome throttles hidden tabs to 1 Hz, and after
    5 min to one wake-up per minute. The game would then simulate ~5 s per 60 s, roughly 8%
    speed. **Inferred from Chrome's documented throttling, not verified in a browser.**

---

## 2. Economy graph

### 2.1 Graph (resources → systems)

```
                   ┌───────────── clicks (3% CPS ×combo ≤5 ×frenzy 5) ─────────────┐
                   ▼                                                               │
 BUILDINGS ──Aether/s──► AETHER ──► buildings, Aether Forge ──► (hero atk/HP ×(1+.25n))
   ▲   ▲  milestones                  │
   │   │  ×2..×10                     └─(total run Aether ≥1e9)─► ASCEND ─► COSMIC DUST ─(+2%/dust)─┐
   │   └──────────────────────────────────────────────────────────────────────────────────────────┘
   │ global mult = Π(achievements, Resonance, BldgMastery, DungeonMastery, ExcavMastery,
   │                 GoldenSynergy, Dust, Shards, aether_mult buffs (multiply each other!), Treaty, Catalyst)
   │
 COMBAT ──gold 10·1.15^f──► GOLD ──► pickaxes (≤5.56M total), drills 1000·1.5^n, Enchanter 1e6·2.5^n (+5% Aether),
   │  bosses → voidCores, bossTokens        caravans (fixed 500/5000), commodities, gold→Chrono Sand
   │  40% of loot → monsterBones
   │  bosses/10 → +1% Aether, +2% pickaxe power
   ▼
 EXCAVATION ──gold caches 100·1.2^d──► GOLD (dominant source, >99.9% by minute 10)
   │  stone ──► transmute 50 → 500·1.15^d gold
   │  gems (ruby*/sapphire/emerald/diamond/void amethyst) ──► ONE recipe each
   │  maxDepth/5 → +1% Aether, +2% max mana, +2% mana regen, +2% hero HP
   ▼
 MANA ──full──► LEYLINE OVERFLOW (50% regen) ──► garden growth seconds + auto-drill time
   ▲
 GARDEN ──essences──► ALCHEMY (one recipe each) ──► buffs (Aether ×3, gold ×4, atk ×2.5, click ×2)
   │                                            └─► permanents (+15 atk, +60 HP, Catalyst ×1.02 COMPOUNDING)
   │  Mana Lily → +15 mana
   │  lily/fern/orchid → 50% Bazaar commodity (silk/amber/shard) ──► sell for gold
   ▼
 BOUNTIES ──► gold (250·tier·floor/2), Guild Seals ──► Quartermaster (+25% Aether/rank, +15% atk, +25% combat gold, offline%)
           └─► Chrono Sand, 20% Talent Point
```
*`ruby` drops are stored under `inventory.rubys`; see bug B1.

### 2.2 Per-subgame table

Feed strength into the core loop (Aether → Dust → perks → Aether) is measured as the
Aether/s ratio between the casual run and the matching counterfactual run.

| Subgame | Consumes | Produces | Outputs consumed by | Core-loop feed (measured) |
|---|---|---|---|---|
| **Monolith / buildings** | Aether | Aether/s; building count | Bldg Mastery: +1.5% Aether, +1% atk, +1% gold per 100 buildings | **Is** the core. Milestones compound to ×28,800 per building at 1000 owned (`BuildingSystem.js:233-238`). |
| **Void Tower combat** | Aether (Forge 1e5·5^n), potions, time | gold 10·1.15^(f-1), XP, gear, bones, voidCores, bossTokens, bosses | Gold sinks; Alchemy (bones, cores, tokens); Dungeon Mastery: +1% Aether and +2% pickaxe power per 10 bosses | Weak direct link (+1%/10 bosses, ×1.62 at 621 bosses). Strong indirect link: gold → Enchanter. Floor hard-walls at **≈6,220**: `Math.pow(1.12, f)·250` overflows to `Infinity` (`CombatSystem.js:70-71`). Casual reaches it at about 6 h. |
| **Excavation** | gold (pickaxe/drills), time, Void Cataclysm, Dynamite, Leyline Overflow | gold caches, stone, 5 gems, depth | gold economy; Alchemy (one gem per recipe); Excavation Mastery (+1% Aether, +2% mana, +2% regen, +2% HP per 5 depth) | Casual 24 h Aether/s: 1.63e28 with vs 9.73e27 without (×1.7). Via gold → Enchanter, emeralds/diamonds → buffs, and amethyst → Catalyst. Early game is far larger (5 min: 1.3e11 vs 3.3e9, ×40) because gold buys Enchanter levels and gems feed ×3/×4 buffs. |
| **Garden** | seed (returned on harvest), time, watering, Leyline Overflow | essences (1–2 per harvest), seeds (+25% next-tier mutation), mana (lily), Bazaar commodity 50% | Alchemy only, one essence per recipe; Bazaar sales | Casual 24 h: 1.63e28 with vs 2.11e27 without (×8). Nearly all of it comes via Philter (×3 Aether) uptime stacking with Celestial Alignment (×4) **multiplicatively** (×12), plus Catalysts. |
| **Alchemy** | essences + gems/bones/cores/tokens; stone; gold | timed buffs; permanent atk/HP; Catalyst ×1.02 global; stone→gold; gold→Chrono Sand | Aether multiplier, combat, gold | Catalyst is **compounding and unbounded**: the `opt` bot hit 17,311 brews = ×7.5e148 in 24 h. Buff durations extend without cap, so uptime >100% (two Aether buffs at once). |
| **Grimoire spells** | mana (2/s base) | Burst (120 s of CPS), Celestial ×4/30 s, Midas click-gold, Void Cataclysm (40% HP + 4 tiles), Warp, Refresh | Aether, gold, combat, mining | Burst also bootstraps a zero-click player: 100× click yield buys the first Tapper. Mana demand of all spells (~4.0/s) exceeds regen (2/s) until Excavation Mastery inflates regen; then Leyline Overflow fires constantly. |
| **Constellations (talents)** | Talent Points (3/ascension, 20% of bounties) | 15 % bonuses | all subgames | Fine as designed, additive per talent. Two subgame talents: Seismic +25% pickaxe/rank and Verdant +20% growth/rank. |
| **Bounties** | actions (click, crit, slay, boss, mine, harvest, brew, cast, buy) | gold, Seals, Chrono Sand, 20% TP | Quartermaster | Treaty +25% Aether/rank. Idle players jam: `click` / `crit_click` bounties never progress without clicking, and there is no reroll. |
| **Bazaar** | gold; garden commodities | gold (trade, caravans); Golden Synergy (+5% Aether per level, cost 1e6·2.5^n gold) | Aether multiplier | Enchanter is the only gold → Aether conversion, and only one category (×38.95 at level 759). Caravans are fixed 500/5,000 gold, so they are irrelevant after minute 5. **Aether Ore has no producer**: no system adds `items.ore.owned`; mining feeds *nothing* into the Bazaar. |
| **Ascension / Transcend** | run Aether (≥1e9), dust | dust = 150·(A/1e9)^0.25; perks; shards = totDust/1e4 at ≥50k dust | Aether ×(1+0.02·dust) | Dominant multiplier (casual: ×1.5e6 at 24 h, ×2.5e7 at 1 w). Resets only Aether, click power and buildings. **Gold, depth, garden, hero, inventory and buffs persist**, so the subgames are permanent meta-layers. |
| **Achievements** | — | +1.5% Aether each (24 total, so ×1.36 max) | Aether | Trivial. Two are Excavation (depth 5, depth 20) and two are Garden (10 and 50 harvests). All reached in minutes. |

### 2.3 Universal Mastery cross-bonuses (all hidden from UI)

| Bonus | Code | Formula | Casual value @1h / @24h / @1w | Problem |
|---|---|---|---|---|
| Building → Aether | `GameState.js:112-117` | ×(1+0.015·⌊B/100⌋) | ×1.14 / ×1.68 / ×1.83 | ok |
| Building → hero atk, combat gold | `CombatSystem.js:116-120, 241-246` | ×(1+0.01·⌊B/100⌋) | small | ok |
| Bosses → Aether | `GameState.js:119-123` | ×(1+0.01·⌊bosses/10⌋) | ×1.08 / ×1.62 / ×1.62 (floor wall) | ok, invisible |
| Bosses → pickaxe power | `MiningSystem.js:98-102` | ×(1+0.02·⌊bosses/10⌋) | ×1.17 / ×2.24 | irrelevant once power 35 one-shots HP 25 |
| **Depth → Aether** | `GameState.js:125-129` | ×(1+0.01·⌊D/5⌋) | ×4.75 / ×95 / ×335 | linear in an unbounded depth |
| **Depth → max mana, mana regen** | `SpellSystem.js:177-195` | ×(1+0.02·⌊D/5⌋) | ×8.5 / ×189 / ×668 | regen 2/s → 1,330/s ⇒ Leyline Overflow adds **~665 s of garden growth per second** |
| **Depth → hero HP** | `CombatSystem.js:136-140` | ×(1+0.02·⌊D/5⌋) | ×8.5 / ×189 | unbounded |
| Leyline Overflow | `SpellSystem.js:209-225` | when mana full, 0.5·regen·dt *seconds* added to every growing plot and to drill time | — | chains depth → regen → garden speed with no cap |
| Golden Synergy | `GameState.js:131-134` | ×(1+0.05·lvl) | ×8 / ×39 | the gold source is unbounded; only the 2.5^n cost limits it |

**Bazaar commodities fed by garden/mining:**
- Garden: Mana Lily → Silk, Solar Fern → Amber, Void Orchid → Crystal, each 50% per
  harvest (`GardenSystem.js:147-163`).
- Mining: **none**. The brief assumed a mining-drop commodity exists; it doesn't.
- Prices random-walk inside a fixed band (Silk 70–500, Amber 350–2,800, Crystal
  1,500–15,000 gold). Against gold income of 1e11 by minute 5, these sales are worthless
  after the first few minutes.

---

## 3. Measured pacing (current v1.1.1)

### 3.1 Core: Aether and first ascension

| Casual profile | 2 min | 5 min | 10 min | 30 min | 1 h | 6 h | 24 h | 1 w |
|---|---|---|---|---|---|---|---|---|
| Aether/s | 2.6e8 | 1.3e11 | 8.8e12 | 6.2e13 | 2.5e15 | 5.1e23 | 1.6e28 | 2.0e33 |
| Ascensions | 0 | 0 | 0 | 0 | 0 | 4 | 5 | 7 |
| Total dust | — | — | — | — | — | 1.5e7 | 8.0e7 | 1.3e9 |

- **First ascension eligible (run Aether ≥ 1e9), real dt 0.05:**

  | Setup | Time |
  |---|---|
  | Casual, both subgames on | **62 s** |
  | Casual, no mining/garden | 196 s |
  | Zero clicks (Aether Burst bootstraps) | 122 s |
  | 1 click/s, no spells, no subgames | 584 s |

  The casual profile's first *actual* ascension at 1.17 h is an artefact of its 1-hour
  minimum run length.
- **Transcendence** (≥50,000 total dust) is reached by the casual player within ~6 h.
- **Optimal bot:** 31 ascensions in 1 h, dust 1.2e12 at 1 h and 1.9e57 at 24 h.

**Verdict:** the core has no pacing. Everything below is measured against a baseline that
is itself far too fast. That is why §5 links subgames into the *Dust-gain* layer, which is
robust to a later core retune.

### 3.2 Excavation

**Current mechanics:**
- Grid: 36 tiles, one hidden stair. Random digging finds the stairs after 18.5 tiles on
  average.
- Tile HP by stratum: 2 / 5 / 12 / 25 (minDepth 1 / 6 / 16 / 31). From depth 31 on, HP
  never grows again.
- Hits per depth = 18.5·⌈HP/power⌉.

**Hits to clear one depth level (expected, random order):**

| Strata (HP) | Rusty 1 (0 g) | Bronze 2 (500) | Steel 4 (5k) | Mithril 8 (50k) | Adamantite 16 (500k) | Celestial 35 (5M) |
|---|---|---|---|---|---|---|
| Limestone 2 | 37 | 18.5 | 18.5 | 18.5 | 18.5 | 18.5 |
| Granite 5 | 92.5 | 55.5 | 37 | 18.5 | 18.5 | 18.5 |
| Obsidian 12 | 222 | 111 | 55.5 | 37 | 18.5 | 18.5 |
| Voidstone 25 (∞ depth) | 462.5 | 240.5 | 129.5 | 74 | 37 | **18.5** |

**Auto-Drill:**
- Cost 1000·1.5^n gold; 0.5 hits/s each.
- `autoDrillTimer` is **reset to 0** rather than decremented (`MiningSystem.js:238-246`).
  Throughput therefore caps at one hit per sim tick: 20 hits/s foreground, 1 hit per
  wake-up in a background tab. With ≥40 drills the foreground rate is fixed at 20 hits/s,
  i.e. about **1 depth per second, forever**.

**Measured, casual profile:**

| | 2 min | 5 min | 10 min | 1 h | 6 h | 24 h | 1 w |
|---|---|---|---|---|---|---|---|
| depth (dt 0.05, real) | 20 | 162 | 492 | **3,752** | — | — | — |
| depth (dt 0.1/0.2, conservative) | 19 | 102 | 275 | 1,879 | 11,804 | 47,139 | 166,813 |
| pickaxe tier | 4 | **5 (max)** | 5 | 5 | 5 | 5 | 5 |
| drills | 18 | 45 | 124 | 334 | 1,721 | 1,733 | 1,733 |
| gold | 4.0e5 | 7.8e10 | 1.2e24 | 2.4e152 | ≈1e309 | ≈1e309 | ≈1e309 |

- **Pickaxe ladder:** complete in 5 minutes. **Strata:** the last stratum (31) is reached
  at ~2 minutes.
- **After that, depth has no content.** It only inflates the hidden mastery multipliers.
- **Overflow wall:** past **depth ≈3,893**, `100·Math.pow(1.2, depth)` overflows to
  `Infinity`. `new BigNum(Infinity)` becomes **0** (`BigNum.js:20-24`), so gold caches
  silently pay nothing. A real-speed casual player crosses this at about 1.1 h. Stone
  transmute does the same past depth ≈5,000.

### 3.3 Garden vs Alchemy demand

**Supply, per plot-hour (current):** grow time g; 1.5 essence and 1.25 seeds per harvest.

| Seed | grow | essence/plot-h | Recipe (only sink) | Demand at 100% uptime |
|---|---|---|---|---|
| Spore | 20 s | 270 | Swiftness: 2 + 1 ruby per 60 s | 120/h; **rubies never arrive (bug B1)** |
| Mana Lily | 45 s | 120 | Philter: 2 + 1 emerald per 60 s (×3 Aether) | 120/h → ~1 plot |
| Solar Fern | 75 s | 72 | Midas: 2 + 1 diamond per 60 s | 120/h → ~2 plots |
| Frost Petal | 120 s | 45 | Might: 2 + 2 voidCores → +15 atk (flat) | unbounded, but flat +15 atk is meaningless past floor ~50 |
| Void Orchid | 240 s | 22.5 | Vitality: 2 + 1 bossToken → +60 HP (flat) | as above |
| Star Lotus | 480 s | 11.25 | Catalyst: 1 + 1 void amethyst → ×1.02 global, **compounding** | unbounded |

Leyline Overflow (×2 growth at base regen, ×hundreds once depth inflates regen) and
watering (+25 s per 15 s while active, +167%) multiply all of the above.

**Measured, casual:**
- 98 harvests at 2 min, 441 at 1 h, 1,913 at 24 h, 11,101 at 1 w. At 15-minute check-ins,
  harvests are bounded by **check-ins**, not by grow time: 16 plots × check-ins.
- **Every essence sits at 0–40 at every snapshot** while gems pile up: at 24 h, 98,657
  sapphires, 81,770 emeralds, 48,831 diamonds, 32,989 void amethyst and 107,193 "rubys".
  The garden is the binding constraint of Alchemy, but it feels instant (always ready) and
  saturates almost immediately: 4 spore plots start pre-grown, and mutation reaches Star
  Lotus within ~10 min.
- **The tier ladder is done in ~10 minutes.** No garden decision persists past that.

### 3.4 Gold

| Casual | 2 min | 5 min | 10 min | 1 h |
|---|---|---|---|---|
| combat gold (cumulative) | 6.4e5 | 9.2e6 | 1.4e11 | (tracking saturates) |
| mining gold (cumulative) | 1.5e5 | 3.4e11 | 1.8e25 | 2.4e152 |
| bounty gold | 1.2e5 | 4.0e5 | 6.6e5 | 6.6e5 |
| Bazaar + caravan | ~0 | 1.2e4 | 1.5e5 | 1.5e5 |
| **sinks:** pickaxe | 5.6e5 | **5.56e6 (all bought)** | 5.56e6 | 5.56e6 |
| drills | 3.0e6 | 1.7e11 | 1.4e25 | 1.3e62 |
| Enchanter | 0 | 9.9e10 | 3.4e24 | 8.6e61 |

- **Mining provides >99.9% of gold from minute 5 on.** Once §5.1 tames mining, the
  runaway moves to Tower gold (`1.15^f` vs difficulty `1.12^f`). Playtesters report
  ~1e46 gold. §5.5 handles both.
- Pickaxes: a fixed 5.56M-gold sink, exhausted by minute 5.
- Caravans and commodities: fixed-size, irrelevant after minute 5.
- Gold → Chrono Sand (1,000 gold → 30 s): fixed price, effectively free.
- Only the drill (1.5^n) and Enchanter (2.5^n) curves keep absorbing gold, and both lose
  to 1.2^depth.

### 3.5 Dead ends and saturation summary

| Item | Status |
|---|---|
| Stone | Only sink is transmute → gold, which is already infinite. Dead. |
| Rubies | Mined into the wrong key (`rubys`). Swiftness is starved. Dead. |
| Sapphires / emeralds / diamonds / amethyst | 1 per brew; supply exceeds demand 10³–10⁴×. Dead surplus. |
| Gold | Infinite by minute 10; overflow semantics past ~1e308 per cache. |
| Depth beyond 31 | No new content; only hidden linear multipliers. |
| Pickaxe ladder | Complete at ~5 min. |
| Garden tiers | Complete at ~10 min. Every essence has one sink. Fertilize (`plot.fertilized`, ×2 yield) has **no code path that sets it**. |
| Bazaar Aether Ore | No producer. |
| Caravans | Fixed 500/5,000 gold. Meaningless after minute 5. |
| Flat permanents (+15 atk, +60 HP) | Meaningless past floor ~50 (monster scaling 1.12^f). |
| Combat floors | Hard wall at ≈6,220 from float overflow. "1000+ floors / Primordial Eternity" ends there. |
| Bounties | Click-type bounties block idle players; no reroll. |

### 3.6 Bugs found (record only, not fixed)

| ID | Where | Bug |
|---|---|---|
| B1 | `MiningSystem.js:154` | `block.content + 's'` turns `ruby` into `rubys`. Mined rubies never reach `inventory.rubies`. Swiftness only gets rubies from Gem Cache anomalies. **Fixed in v1.2.0.** |
| B2 | `MiningSystem.js:238-240` | Drill timer reset to 0 discards overflow. Throughput is capped at 1 hit per tick and breaks in background tabs. |
| B3 | `MiningSystem.js:146`, `AlchemySystem.js:148` | `Math.pow(1.2/1.15, depth)` overflows to `Infinity`, which BigNum converts to 0. Rewards silently drop to 0 past depth ~3,893 / ~5,000. |
| B4 | `MarketSystem.js:48` | `1e6·Math.pow(2.5, lvl)` overflows at lvl ≥ 775, and the cost becomes **0**, so Enchanter levels are free and infinite. Reachable once gold exceeds ~1e314 (BigNum allows it). |
| B5 | `CombatSystem.js:70-71, 309` | Monster HP/attack and gear `Math.pow(1.12, f)` overflow at floor ≈6,220. Monster HP becomes `Infinity`, an unkillable wall. |
| B6 | `GameState.js:148-151` | All `aether_mult` buffs multiply each other: Celestial ×4 × Philter ×3 = ×12. Durations extend without cap. |
| B7 | `AlchemySystem.js:133` | Catalyst compounds `globalMultiplier *= 1.02` with no cap or cost escalation. |
| B8 | `GardenSystem.js:107` | `fertilized` is never set anywhere, so the README's "fertilize for double yields" is unreachable. |
| B9 | `SpellSystem.js:105-131` | Spell buffs are pushed without `maxDuration`, so no progress bar is possible; see §6. |
| B10 | `SaveManager.js:71-102` | Offline progress credits only Aether and Sand. Subgames don't progress offline. |
| B11 | `GameLoop.js` (v1.3.0, background `setInterval`) | Each catch-up is clamped to `min(5, elapsed)`. In throttled hidden tabs (1 wake-up per minute in Chrome after 5 min), ~55 s of every minute are lost: Aether, combat and subgames alike. Autosave now runs there; simulation catch-up does not. |
| B12 | `AlchemySystem.js:156-171` (v1.2.2) | Gold → Chrono Sand is linear and uncapped: 1,000 gold → 30 s, Max = all gold. At the playtesters' ~1e46 gold, Max yields ~3e44 s of sand (≈1e37 years). Today the only brake is Fast Forward's 30 s per click (300 ticks of `onSimTick(0.1)`). See §5.5. |

---

## 4. Diagnosis — why Excavation and Garden feel fast but pointless

1. **Excavation costs stop scaling while its rewards keep growing.**
   - HP caps at 25. The pickaxe ladder is a fixed 5.56M gold, and the drill rate is capped
     by the tick rate.
   - Gold per depth is still ×1.2 per level, so mining becomes an infinite gold printer
     after minute 5.
   - With nothing left to buy, depth becomes a number that just spins.
2. **The Garden has no input cost and no growing time cost.** Seeds replicate for free and
   the longest grow time is 8 minutes. The only limiter is how often the player clicks
   Harvest, so there is never a decision or a wait.
3. **Their links are linear, hidden, or both.**
   - Excavation Mastery is +1% per 5 depth and invisible.
   - Leyline Overflow is invisible.
   - Catalyst is compounding but labelled "+2%".
   - Meanwhile Dust is ×10⁶. A linear % next to a ×10⁶ category is invisible by
     construction (methodology §4: separate *multiplicative categories* only feel
     meaningful when they are commensurate).
4. **Their outputs have one sink each, so surplus is dead.** Gems are 10³–10⁴× over-supplied
   and stone and gold are worthless. Essences are the true bottleneck, yet the garden
   presents itself as instant.
5. **Self-compounding chains with no ceiling.** Two chains explain the "absurdly fast"
   feeling:
   - depth → mana regen → Leyline Overflow → garden speed and drill speed → more depth;
   - Catalyst → global ×1.02^n.

---

## 5. Redesign

### 5.0 Pacing targets (calibration anchors)

There is no stated arc for Aetheria yet. I propose these anchors. Each subgame gets
order-of-magnitude milestones spaced roughly ×4–×7 in time, so something new lands at
1 h, 6 h, 1 d, 1 w and 1 month:

| Milestone | Excavation | Garden |
|---|---|---|
| 10 min | depth ~10, first pickaxe upgrade | first harvests, Mana Lily in rotation |
| 1 h | depth ~25 (**Stratum 2**), 2–3 drills, Golem 1 affordable | Solar Fern / Frost Petal unlocked by mutation |
| 6 h | depth ~50 (**Stratum 3**) | Void Orchid → first Star Lotus |
| 1 day | depth ~75 (**Stratum 4**), Golem 3 | Star Lotus in rotation, ~15 Catalysts |
| 1 week | depth ~100 (**Stratum 5**), Golem 4 | ~38 Catalysts (+76% Aether), Nectar Offering capped |
| 1 month | depth ~120 (Stratum 5–6) | Catalyst ~56, cost now 70+ per brew |

The 1 month row is the long tail: each further level costs ×1.15 more HP.

### 5.1 Excavation — curves (ship-first)

All of these replace existing constants or one-liners.

| Item | Current | Proposed |
|---|---|---|
| Tile HP | strata table 2/5/12/25 | `HP(d) = ceil(4 · 1.15^(d-1))`. d10 = 15, d25 = 115, d50 = 3.8k, d75 = 125k, d100 = 4.1M. Compute via `BigNum` or clamp `d ≤ 2000` (B3). |
| Strata | 4, last at depth 31 | Every **25 depth** is a new stratum: 1 Limestone, 26 Granite, 51 Obsidian, 76 Voidstone, 101 Aetherite, 126 Starcore, 151 Abyssal Heart. Cosmetic plus drop table: void amethyst chance `0.04 + 0.01·stratumIndex`, taken from the stone share. Stratum entry is a milestone toast. |
| Pickaxe | 6 fixed tiers, gold | **Level L**, reusing `pickaxeTier`. `power = 2^L`. **Cost `50 · 2.5^L` stone.** Names cycle through the existing 6 then "+N". |
| Auto-Drill cost | 1000·1.5^n gold | **`30 · 1.6^n` stone** |
| Auto-Drill rate | 0.5/s each, capped 1 hit/tick | 0.5 hits/s each. Accumulate: `timer += dt·0.5·drills; while (timer ≥ 1) { hit; timer -= 1 }`, with a 200 hit/tick guard (B2). |
| Stone yield per stone tile | 1 | **`ceil(1.07^(d-1))`** (d25 = 5, d50 = 28, d100 = 805), so stone income scales with the depth it is spent to go beyond |
| Gold cache | 100·1.2^d | **`100 · 1.07^d`**: d25 = 543, d50 = 2.9k, d100 = 86.8k. Mining becomes a modest gold source, below combat. |
| Stone → gold transmute | 50 → 500·1.15^d | 50 → `200 · 1.07^d`. Still an outlet; stone now has a better use. |
| Dungeon → pickaxe | +2%/10 bosses, uncapped | same, **cap +100%** |
| Seismic Impact talent | +25%/rank | unchanged (additive in its category) |
| Void Cataclysm / Dynamite | 4 tiles / 3×3 | unchanged. These become *valuable* now that tiles cost many hits. |

**Projected (casual model, 15-minute check-ins, 2 manual hits/s for 10 min, stone spent
greedily on pickaxe vs drill):**

| | 10 min | 1 h | 6 h | 1 d | 3 d | 1 w | 4 w |
|---|---|---|---|---|---|---|---|
| depth | 10–14 | 22–24 | 50–53 | 74–76 | 87–94 | 98–102 | 117–122 |
| pickaxe level | 1 | 2 | 4–5 | 6 | 7–8 | 8–9 | 9–10 |
| drills | 2 | 3 | 6 | 9 | 10–12 | 12–14 | 14–16 |
| seconds per depth | ~150–240 | ~230–300 | ~700–2,200 | ~7–9k | ~20k | ~28–50k | ~200k+ |
| cumulative stone | 203 | 604 | 4.4k | 17k | 49k | 115k | 334k |

This is the textbook decelerating curve: depth grows roughly with the log of time.
**Calibration knob:** `HP growth 1.15`. Use 1.13 for ~+15% depth everywhere and 1.17 for
~−15%. Keep `stone growth ≈ HP growth − 0.08`.

### 5.2 Garden — curves (ship-first)

| Item | Current | Proposed |
|---|---|---|
| Grow times | 20 / 45 / 75 / 120 / 240 / 480 s | **×15:** 5 min / 11 min / 19 min / 30 min / 1 h / 2 h. For a firmer anchor, use Star Lotus = 6 h (×45 for that seed only). |
| Water All | +25 s, 15 s cooldown (+167% while active) | **+30 s, 60 s cooldown** (≈+50% while actively tending; small relative to long grows by design) |
| Leyline Overflow into garden | +0.5·regen growth-seconds per second, unbounded | **flat ×1.5 growth speed while mana is full** |
| Leyline Overflow into drills | adds raw seconds | **flat ×1.25 drill rate while mana is full** |
| Fertilize | dead code | wire it: "Fertilize" button costs 1 Spore Powder per plot; next harvest ×2 essence. This gives Spore Powder a second sink. |
| Starting state | 4 spore plots pre-grown | keep (first-minute feel) |
| Mutation | 25% next tier | keep. The ladder becomes ~day-1 length on its own because each tier's grow time ×15. |

**Projected (model, 4 Mana Lily plots reserved, remainder highest tier, overflow ×1.5):**
- 15-minute check-ins, no golems: harvests 38 at 1 h, 219 at 6 h, 653 at 1 d, 4,109 at 1 w.
- With golems: 41 / 203 / 646 / 4,810.
- Star Lotus first planted around 4–6 h.
- Catalysts 4 at 6 h, 15 at 1 d, 38 at 1 w, 56 at 4 w (amethyst-bound with the cost
  curve in §5.3).
- Against today: 1,913 harvests/day and the full ladder in 10 minutes.

### 5.3 Make the links visible, linear-within, multiplicative-across (ship-first)

| Link | Current | Proposed formula | Category | Projected @1d / @1w |
|---|---|---|---|---|
| **Geode Attunement** (Excavation → Dust) | — | pending Cosmic Dust ×`(1 + 0.10·⌊maxDepth/10⌋)`. Shown on the Ascend button: "×1.7 from Depth 76". | new multiplicative category on dust gain | ×1.7 / ×1.9 |
| **Depth Resonance** (Excavation → Aether), replaces Excavation Mastery Aether | ×(1+0.01·⌊D/5⌋) | ×`(1 + 0.02·maxDepth)` | its own category (as today) | ×2.5 / ×3.0 |
| Excavation → mana, regen, hero HP | ×(1+0.02·⌊D/5⌋) uncapped | ×`(1 + min(1.0, 0.01·maxDepth))` | own category | ×1.75 / ×2.0 (cap ~d100) |
| **Nectar Offering** (Garden → Dust) | — | On Ascend, **all** Celestial Nectar is consumed: pending dust ×`min(2, 1 + 0.02·√nectar)`. 100 → ×1.2, 625 → ×1.5, 2,500 → ×2. A recurring per-run sink, so the garden matters every run. | new multiplicative category on dust gain | ~×1.3 / ×2 (cap) |
| **Philosopher's Catalyst** (Garden + Excavation → Aether) | `globalMultiplier *= 1.02` | additive: Aether ×`(1 + 0.02·n)`, n = catalysts brewed (new field `alchemy.catalysts`). Cost: `ceil(1.08^n)` Nectar **and** `ceil(1.08^n)` Void Amethyst. | own category "Catalyst" | n≈15 → ×1.3; n≈38 → ×1.76 |
| **Elixir of Might / Immortal Life** (Garden + Combat → Combat) | +15 atk / +60 HP flat | +4% hero atk / +4% hero HP per brew, additive within an "Elixir" category. Cost 2·`ceil(1.1^n)` essence + same core/token. | own category | — |
| **Aether buffs** (all sources) | multiply each other (B6) | **additive within the Buff category:** `1 + Σ(value−1)`. Celestial +300% plus Philter +200% = ×6, not ×12. **Duration cap:** a buff can be extended to at most `10 min × perk/talent multipliers`. | Buff | removes the early ×10⁴ garden spike |
| **Mastery readout** | none | A "Masteries" panel on the Ascension tab and a tooltip on the Aether/s header. Lists every category with its current ×value. | UI | — |

Why dust-layer links: Cosmic Dust is today's dominant category (×10⁶+), and its retune is
out of scope. A multiplier on *dust gain* is felt at every scale, because it
proportionally increases the dominant category. An Aether-% link is only felt if the core
is later re-scaled.

Each new category is additive inside and bounded by a log-paced input (depth) or a capped
formula (nectar), so none can compound with itself.

### 5.4 Give surplus a route (wave 2)

- **Gem Polishing (Alchemy).** 5 of a tier → 1 of the next: ruby → sapphire → emerald →
  diamond → void amethyst. Surplus low gems now feed the Catalyst bottleneck: 625 rubies
  = 1 amethyst, intentionally a poor rate. Pure wiring, no new resource.
- **Aether Ore.** 10% of stone tiles also drop 1 Aether Ore (Bazaar `items.ore.owned++`).
  This gives the Bazaar a mining feed and its existing UI a purpose.
- **Caravans:** scale the investment to `max(5,000, 5% of gold)`. Out of scope beyond this
  note.

### 5.5 Gold economy: Tower exponent, Market Index, scaling sinks, Chrono Sand

**Problem.** Gold income is exponential in progress, but almost every sink is absolute.

| Source / sink | Formula | Scales with progress? |
|---|---|---|
| Tower gold per kill | `10·1.15^(f-1)`: 1e7 @f100, 1.4e19 @f300, 2.9e46 @f750, 4e61 @f1000 | yes, and **faster than difficulty** (monster HP/atk and gear are `1.12^(f-1)`). Gold outgrows difficulty by `(1.15/1.12)^f ≈ 1.0268^f`: ×14 @f100, ×3e8 @f750. |
| Excavation caches | `100·1.2^d` | yes, even faster (fixed in §5.1 → `1.07^d`) |
| Pickaxes | 500 … 5e6 total | no |
| Auto-Drill | `1000·1.5^n` | weakly (moved to stone in §5.1) |
| Commodities | price clamped to fixed bands (ore 15–120 … crystal 1,500–15,000) | no |
| Caravans | fixed 500 / 5,000 gold, 1.6× / 2.05× | no |
| Gold → Chrono Sand | 1,000 gold → 30 s, linear, uncapped (v1.2.2) | no, and it becomes an *infinite time* source at 1e46 gold (B12) |
| Golden Enchanter | `1e6·2.5^n` → +5% Aether per level | **yes, the only one** |

So the Bazaar is irrelevant past roughly floor 60, and playtesters sit on ~1e46 gold with
nothing to spend it on.

**Decision: (d), a combination of (a) and (b), with (c) explicitly rejected.**

1. **(a) Tower gold exponent 1.15 → 1.12.** `goldPerKill = 10 · 1.12^(f-1)` (×(1 + talents)
   as today). This matches difficulty, so gold per *second of combat* stays proportional to
   how hard the floor is, rather than accelerating ×1.0268 per floor.
   - New values: 7.5e5 @f100, 5.2e15 @f300, 7.6e37 @f750, 1.3e50 @f1000. That is 13× less
     at f100 and 4e8× less at f750.
   - Also switch to a BigNum pow or clamp `f`; B5's overflow wall then moves from ≈6,220
     to the same wall as monster HP, so the two stay consistent.
2. **(b) Market Index**, anchored to the same curve so every Bazaar price is "N kills' worth"
   at your best floor:
   `M = 1.12^(hero.maxFloor − 1)`. M is a BigNum; maxFloor never decreases, so the index
   can't be gamed by retreating.

   | Bazaar item | Current | Proposed |
   |---|---|---|
   | Commodity price band | fixed `[min, max]`, random walk | `[min·M, max·M]`, same random walk on the *base* price, display = base × M. Garden commodities now pay ~`10–50 kills' worth` per harvest drop, a real Garden → gold link. |
   | Buying commodities | fixed price | same × M (symmetric; no arbitrage across floors because the index only rises) |
   | Caravan tiers | 500 / 5,000 gold, 2 / 5 min, 1.6× / 2.05× | **Small:** invest `200·M`, 10 min, **1.25×** (+50·M). **Large:** invest `2,000·M`, 60 min, **1.5×** (+1,000·M per hour ≈ 100 kills/hour ≈ 3% of active combat income). One caravan at a time, as today. **Payout fixed at dispatch.** |
   | Aether Ore (§5.4) | no producer | 10% of stone tiles; price × M |

3. **(c) %-of-current-gold caravans: rejected.**
   - A caravan returning r on a fraction p of the current balance every T compounds:
     `gold(t) = gold₀ · (1 + p(r−1))^(t/T)`.
   - At today's 2.05× / 5 min with p = 100%, that is ×2.05 every 5 min = **×5.5e3 per
     hour, ×1e90 per day**, independent of any other progress. That is exactly the
     runaway this study is removing.
   - Even a modest 1.1× per hour on 100% of gold is ×1e1 per day and ×1e7 per week.
   - Index-anchored tiers cap the *investment* by progress, not by balance. Profit is
     therefore linear in time and cannot compound.
   - If a %-flavour is ever wanted, cap it: `invest = min(p·gold, K·M)`. It is then
     identical to (b) once the cap binds.

**Scaling late-game gold sinks.** The index-anchored Bazaar is a recurring sink, but it is
small by design. The large sinks are:

| Sink | Formula | Why it scales |
|---|---|---|
| **Golden Enchanter** (existing) | `1e6·2.5^n` gold → +5% Aether/level (additive in its own category) | Already geometric. Fix B4 with a BigNum pow. With Tower gold at 1.12^f, a level costs ×2.5 while best-floor income rises ×1.12/floor, so ~8 floors per Enchanter level: a steady, slow trickle. |
| **Chrono Sand** (re-priced, see below) | `1,000 · M` gold per 30 s | tracks progress via M |
| **Aether Forge in gold** (optional, wave 2) | let the Forge accept gold at `1e3·M_forge` per level, where `M_forge = 5^lvl` (mirrors its Aether curve `1e5·5^n`); either currency works | gives Tower gold a direct way back into combat power |

**Chrono Sand at large magnitudes (B12).** Two problems: the conversion rate is fixed
while gold is exponential, and the bank is uncapped while Fast Forward drains 30 s per
click.

1. **Price scales with the Market Index:** 30 s of sand costs `1,000 · M` gold, i.e. ~100
   kills at your best floor. Converting your combat income gives roughly a 30% time bonus:
   useful, not infinite.
2. **Sand bank cap = the offline cap:** `1,440 s·(1 + 0.5·chrono_vault rank)`. This is the
   same constant that already caps offline sand (`SaveManager.js:91`, here read in
   seconds). The Max button then converts only up to the cap; excess gold stays gold.
   With a capped bank there is no "1e37 years of sand" state.
3. **Bigger Fast Forward:** three buttons, 30 s / 5 min / 1 h (cost 30 / 300 / 3,600 sand).
   - For the longer warps, run the sim at **dt = 1.0** (3,600 ticks for 1 h, not 36,000).
   - This is safe only after B2's accumulating drill timer, because today's
     1-hit-per-tick cap would make large-dt warps under-mine.
   - Combat is coarse at dt 1.0, but the hero attack interval is 1 s anyway.
   - Fast Forward stays bounded by the bank cap, so a 1 h warp is at most a ~24 h total
     per refill.

**Projected: what a kill buys after the change** (one row per best floor):

| Best floor | gold/kill | Small caravan | 30 s sand | next Enchanter level (level ≈ f/8) |
|---|---|---|---|---|
| 100 | 7.5e5 | 1.5e7 | 7.5e7 | ~1e6·2.5^12 = 6e10 (~8e4 kills) |
| 300 | 5.2e15 | 1.0e17 | 5.2e17 | ~2.5^37·1e6 = 5e20 |
| 750 | 7.6e37 | 1.5e39 | 7.6e39 | ~2.5^94·1e6 = 2.5e43 |

The Enchanter stays the "big" sink at every scale; the other three stay proportionate.

**Save compatibility for the existing ~1e46-gold saves:**
- **Gold balance: leave it.** All new gold sinks are index-priced and capped (sand bank,
  one caravan), except the Enchanter. The Enchanter absorbs a 1e46 hoard
  logarithmically: `log₂.₅(1e46/1e6)` ≈ 100 levels, one-time ≈ ×6 Aether in its own
  category. That is a one-off windfall, not a runaway.
- **Optional "Treasury Reform"** if you want to remove even that:
  `gold = min(gold, 1e4 · M(maxFloor))` on migration, with a changelog line. I recommend
  *not* doing this; a visible confiscation feels worse than a one-time Enchanter spike.
- **Chrono Sand already banked from bulk transmutes:** clamp to the new cap on load. This
  is a one-time loss for anyone who converted 1e46 gold; say so in the changelog.
- **Caravan in flight:** let it finish on its stored `investment × expectedProfit` (already
  fixed at dispatch).
- **Golden Synergy levels earned under 1.2^d mining:** keep them (§9).

Golems and drills still deliberately **don't** cost gold (§5.1, §5.6), so the
Excavation/Garden pace is insulated from combat gold.

### 5.6 Garden Golems — auto-harvest (coordinator item 1)

| Aspect | Spec |
|---|---|
| Unit | **Garden Golem**, max 4. Golem k (k = 0..3) owns **row k**: plots 4k..4k+3. Buying golems row by row keeps it legible ("Row 1 automated"). |
| Currency | **Stone (Excavation) + Mana Sap (Garden).** Cost of golem k: stone `150 · 8^k` (150 / 1,200 / 9,600 / 76,800) **and** Mana Sap `10 · 3^k` (10 / 30 / 90 / 270). This ties the garden's automation to Excavation progress, gives stone a second sink, and makes the player decide between pickaxe/drill and golem. Gold is deliberately avoided (§5.5). |
| Unlock timing (casual model) | Golem 1 ≈ 1 h, 2 ≈ 6 h, 3 ≈ 1 d, 4 ≈ 1–2 w, with stone also competing for pickaxe and drills |
| Rate | Harvests the instant a plot in its row is mature (per tick, no separate rate stat). Throughput is grow-time bound by construction. |
| Replant | Replants the **same seed** if any is in inventory. Otherwise it uses the row's **fallback seed** (a per-row dropdown, default: highest tier owned). If neither exists, the plot stays empty and the row badge shows "No seeds". |
| Yield | 100% essence and the normal 25% mutation. Golems never water or fertilize, so active play keeps a +50% (water) and ×2 (fertilize) edge. |
| Interaction with the slow-down | Today's manual garden yields ~1,900 harvests/day (check-in bound). A **fully automated** new garden yields ~700/day (grow bound), about **3× fewer**. Every output link is capped or escalating (Catalyst 1.08^n, Nectar Offering capped ×2, Elixirs 1.1^n). Automation removes chores, not pacing. |
| Offline | Golem rows run offline at `offlineEfficiency` for up to **12 h**: `cycles = floor(elapsed·eff / growTime)` per plot, resolved in closed form at load. Non-golem plots simply finish growing (one harvest waiting). Show a "Garden: +N harvests" line in the existing offline modal (`main.js:428`). |
| Save fields | `garden.golems` (int, default 0); `garden.rowSeed[4]` (default null) |

**Auto-Drill gets the same treatment** for consistency: stone price `30·1.6^n`, fixed
accumulating timer, ×1.25 when mana is full.

**Offline drills:**
- Hits = `0.5·drills·elapsed·0.5` (50% offline efficiency), capped at 12 h.
- Resolve with a loop over depth levels: `levels gained` while remaining hits ≥
  18.5·⌈HP(d)/power⌉.
- Rewards go to stone, gems and caches at expected values (no per-tile RNG offline).
- Add an offline-modal line.

---

## 6. Global buff & cooldown bar (coordinator item 2)

**State as of v1.3.0:**
- `js/tabBonuses.js` adds a per-tab **Active Bonuses** strip. On each tab it lists the
  talents, ascension perks and timed buffs (`BUFF_TYPE_TABS`) that affect that tab.
- This solves "what is boosting *this* tab".
- It does **not** cover:
  - Timed buffs whose payoff is on *another* tab. Philter is cast in Alchemy but only
    listed on Monolith, so you can't see it ticking while you are in Alchemy or Excavation.
  - Global effects: Chrono Warp, Frenzy, the Aether total.
  - Spell cooldowns and mana affordability.
  - Duration progress (it shows text `Ns left` only).
  - Universal Mastery and the §5.3 links. Its inputs are talents, perks and buffs only.

**Recommendation: keep both, split by job.**

1. **Per-tab strip (existing), for *persistent* modifiers.**
   - Keep talents and perks there.
   - **Add** the Universal Mastery / §5.3 categories: Depth Resonance on Monolith, Depth →
     HP on Tower, Geode/Nectar on Ascension, Catalyst on Monolith, Leyline Overflow on
     Garden and Excavation.
   - Optionally move the timed buffs out of the strip, or keep them as a one-line echo.
   - Fix one mapping gap: `gold_mult` should also list `monolith` (Midas clicks use
     `getGoldMultiplier`, `ClickerSystem.js:33`).
2. **One thin fixed global bar directly under the header** (`#top-dashboard`) for
   **everything timed or castable**: buff chips with progress bars, Frenzy, Chrono Warp,
   and the six spell buttons with cooldowns.
   - These are cross-tab by nature: cast in one tab, they pay off in another.
   - A per-tab strip can only show the subset relevant to the current tab, so the player
     loses sight of the rest exactly when they switch tabs to exploit it.

**Remove** the Monolith-only `#active-buffs-list` (`index.html:160`), which is rebuilt
with `innerHTML` every frame (`main.js:1528-1533`). The global bar supersedes it.

**Buff chip contents** (one per active buff, plus Frenzy as a chip):

| Field | Source |
|---|---|
| Icon + short name | recipe/spell icon (Philter 🧪, Celestial 🌟, Midas Elixir 💰, Titan ⚔️, Swiftness 👆, Midas' Blessing 🪙, Chrono Warp ⏳, Frenzy 🔥) |
| Remaining time | `mm:ss`, from `b.duration` |
| Progress bar | `b.duration / b.maxDuration`. **Spell buffs need `maxDuration` set at push** (B9, `SpellSystem.js:105-131`). Frenzy uses `frenzyTimer/25`. |
| Target tag | coloured tag naming the subgame it affects; clicking the chip jumps to that tab |
| Stack value | e.g. "+200%". With §5.3's additive category, show the category total on hover ("Aether buffs: +500%"). |

**Buff → target tab mapping:**

| Buff type | Tag | Affects |
|---|---|---|
| `aether_mult` | Monolith | all Aether |
| `click_mult` | Monolith | clicks only |
| `click_gold` | Monolith | clicks mint gold |
| `hero_atk` | Void Tower | — |
| `gold_mult` | Gold | Tower kills, Excavation caches, Midas clicks (not Bazaar sales) |
| `time_speed` | All | — |

**Game-feel implication:** the tag-and-jump is the point. A visible "⚔️ Titan's Draught
1:12 → Void Tower" chip invites the player to go push floors *now*. That turns buffs into
short active-play windows across tabs instead of invisible background modifiers. It is the
same accumulation → reinvestment → acceleration hook the Snake doc's buff category uses.

**Spell cooldowns:**
- The right side of the same bar holds 6 compact spell buttons.
- Each shows its icon, a conic/linear cooldown overlay, and is dimmed when mana < cost.
- **Click to cast from any tab.** This shortcut makes the Grimoire tab mostly a reference
  page; that is acceptable.
- Keep Astral Renewal visually distinct (long cooldown) and put a hover confirm on it.

**Mobile (< 640 px):**
- The bar stays a single row, **fixed to the bottom** of the viewport (thumb reach, with
  `env(safe-area-inset-bottom)`). Max height 44 px.
- Chips become icon + `mm:ss` only. The progress bar becomes the chip's bottom border, and
  the name/tag goes into a tap tooltip.
- The row scrolls horizontally (`overflow-x: auto`, scroll-snap) with spells pinned at the
  right end.
- No horizontal page scroll.

**Implementation note:**
- Do **not** rebuild via `innerHTML` per frame. v1.1.0's changelog records that
  rebuilt-every-frame buttons swallowed clicks.
- Key chips by `buff.id`, create and remove nodes only on add/expire, and update only
  text and width per frame.

---

## 7. Projected arc after the ship-first set (summary)

| | Today (casual) | After ship-first (model) |
|---|---|---|
| Depth @1h / 1d / 1w | 3,752 (real) / 47k / 167k | 24 / 76 / 98 |
| Pickaxe complete | 5 min | never (exponential levels; L ≈ 9 at 4 w) |
| Gold from mining @1h | 2.4e152 | ~1.2e4 |
| Garden ladder complete | ~10 min | ~6 h (first lotus), rotation by day 1 |
| Harvests/day | 1,913 (check-in bound) | ~650–700 (grow bound, golems) |
| Catalyst effect @1w | ×1.02^n, unbounded (`opt`: ×1e148) | ×1.76 (n≈38), visible |
| Subgame → Dust | none | ×1.9 (Geode) × up to ×2 (Nectar) ≈ **×3.8 dust gain at 1 w**, shown on the Ascend button |
| Leyline Overflow | regen ×668 → garden ×600+ at 1 w | flat ×1.5 garden, ×1.25 drills |
| Tower gold per kill @f300 / f750 | 1.4e19 / 2.9e46 | 5.2e15 / 7.6e37 (matches difficulty) |
| Bazaar relevance | none past ~floor 60 | priced in kills at best floor (Market Index) |
| 1e46 gold → Chrono Sand | ~3e44 s | capped at the bank cap (1,440 s base) |

---

## 8. Ranked change list (impact vs effort)

Effort estimates assume the current code structure: S = <30 lines, M = 30–120,
L = >120 or new UI.

| # | Change | Impact | Effort | Wave |
|---|---|---|---|---|
| 1 | Bug fixes B2 (drill timer), B3/B4/B5 (overflow guards: BigNum pow or clamp). B1 already fixed in v1.2.0. | High: removes silent 0-gold, free Enchanter, combat wall | S | **Ship-first** |
| 2 | Excavation curves §5.1: HP `4·1.15^(d-1)`, stone yield `1.07^(d-1)`, cache `100·1.07^d`, pickaxe `2^L` for `50·2.5^L` stone, drills `30·1.6^n` stone | Very high: the actual slow-down | S–M | **Ship-first** |
| 3 | Garden times ×15, Water +30 s / 60 s cooldown | Very high | S | **Ship-first** |
| 4 | Linearize runaway links: Catalyst additive + `1.08^n` cost; Depth Resonance `1+0.02·D`; mana/HP `min(1, 0.01·D)`; Leyline Overflow flat ×1.5 / ×1.25; boss → pickaxe cap +100% | Very high: prevents re-runaway | S | **Ship-first** |
| 5 | Additive Aether-buff category + 10 min duration cap (B6) | High: removes early ×12 stacking | S | **Ship-first** |
| 6 | Geode Attunement + Nectar Offering (dust-gain links) shown on the Ascend button | Very high: answers "doesn't matter" | S–M | **Ship-first** |
| 7 | Mastery readout: add Universal Mastery and §5.3 categories to the existing v1.3.0 per-tab strip, plus an Aether/s tooltip | High (visibility) | S–M | **Ship-first** |
| 7a | **Gold:** Tower gold `10·1.12^(f-1)` (from 1.15); Market Index `M = 1.12^(maxFloor−1)` on commodity bands and caravan tiers (200·M / 10 min / 1.25×, 2,000·M / 60 min / 1.5×) | Very high: makes Bazaar and gold matter at every floor | S–M | **Ship-first** |
| 7b | **Chrono Sand (B12):** price `1,000·M` gold per 30 s; bank cap = offline cap (1,440 s·(1+0.5·vault)); Max converts up to the cap | High: closes the 1e46-gold → infinite-time hole | S | **Ship-first** |
| 8 | Global timed-buff/cooldown bar §6 (incl. B9 `maxDuration`), alongside the v1.3.0 per-tab strip | High (feel, cross-tab) | M | Ship-first if capacity, else wave 2 (independent of balance) |
| 8a | Fast Forward 5 min / 1 h buttons (dt 1.0 sim; needs #1's drill timer) | Medium | S | Wave 2 |
| 8b | Aether Forge also purchasable with gold | Medium (Tower gold → Tower power) | S | Wave 2 |
| 9 | Garden Golems + per-row seed + offline garden | High (QoL; requested) | M–L | Wave 2 (needs #3 first, or it accelerates the old runaway) |
| 10 | Offline Excavation (drills) | Medium–high | M | Wave 2 |
| 11 | Elixir of Might/Vitality → +4% categories | Medium | S | Wave 2 |
| 12 | Gem Polishing ladder | Medium (surplus → Catalyst) | S–M | Wave 2 |
| 13 | Strata every 25 depth + amethyst chance by stratum + stratum toasts | Medium (milestone feel) | S–M | Wave 2 |
| 14 | Fertilize wiring (B8), Aether Ore drop | Low–medium | S each | Wave 3 |
| 15 | Bounty reroll / no click bounties for idle | Medium (idle feel) | S | Wave 3 |
| — | Core study: dust curve, ascension threshold, building milestones, combat floor pace (Forge/gear) | Very high, out of scope | — | separate doc |

**Minimal ship-first set: #1–#7b.** These are mostly constant and formula edits in
`MiningSystem.js`, `GardenSystem.js`, `AlchemySystem.js`, `SpellSystem.js`,
`GameState.js`, `CombatSystem.js` (gold exponent, HP mastery), `PrestigeSystem.js:33-43`
(dust multipliers) and `MarketSystem.js` (index, caravans, B4), plus extending the
existing tab strip. Add #8 if the UI pass has room.

Why Golems (#9) are wave 2: shipped against today's 8-minute grows and ×600 overflow,
auto-harvest would make the garden *faster*.

---

## 9. Save compatibility

`GameState.serialize()` writes `version: 1` (`GameState.js:226`). Bump it to **2** and add
a one-shot `migrateV1toV2(data)` in `deserialize`. The game went public today (v1.0.0,
2026-10-05), so few saves exist, but long-running ones are already absurd (depth 10k+,
gold ~1e309, 1,700 drills).

| Field | Migration |
|---|---|
| `inventory.rubys` | already migrated in v1.2.0 (`GameState.js:286-289`) |
| `mining.depth` / `maxDepth` | Compress: `d' = d ≤ 60 ? d : round(60 + 10·log2(d/60))`. 47k → 156, 3,752 → 120, 500 → 91. Rank is preserved without leaving the player at a 1e8-HP wall. |
| `mining.pickaxeTier` | Keep it as level L. Tier 5 = power 32 vs the old 35, an acceptable nerf. |
| `mining.autoDrills` | `min(autoDrills, 12)`. No refund: gold is worthless in those saves. Optionally refund ~stone `30·1.6^12` as a goodwill bank. |
| `mining.blocks` | Regenerate the grid on load. Old blocks carry old HP. |
| `garden.plots[*].maxTime` | Leave as stored: plants in the ground finish on old timers, and new plantings use new times. No migration. |
| `garden.golems`, `garden.rowSeed` | Default 0 / [null×4] |
| `stats.globalMultiplier` (Catalyst compounding) | `n = round(ln(gm)/ln(1.02))`; `alchemy.catalysts = min(n, 50)`; `globalMultiplier = 1`. **This is a visible nerf for saves with n > 50.** Mention it in the changelog. |
| `hero.baseAttack` / `maxHp` from old flat Elixirs | Leave as is (flat leftovers are harmless) and start the new % counters at 0 |
| `market.goldenSynergy` | Leave (bounded by B4 fix). Optionally clamp to 200 for saves above that. |
| `activeBuffs` | On load, clamp each `duration`/`maxDuration` to the new 10 min cap. Set `maxDuration = duration` where it is missing (B9). |
| `gold` (playtesters ~1e46) | Leave. All new sinks are index-priced and capped except the Enchanter, which absorbs a 1e46 hoard as a one-time ~100 levels (≈×6 Aether, own category). An optional "Treasury Reform" `min(gold, 1e4·M)` is *not* recommended (§5.5). |
| `chronoSand` | Clamp to the new bank cap on load (one-time loss for bulk-transmuted sand; say so in the changelog) |
| `market.items[*].price`, `history` | Keep stored base prices; display and trade at base × M from now on |
| `market.caravan` in flight | Let it finish on stored investment × profit |

Changelog copy should say plainly that Excavation and Garden were rebalanced and that very
deep saves were compressed.

---

## 10. Open questions for the user

1. **Arc length.** Snake targets ~3 years. These targets put Excavation's 5th stratum at
   ~1 week and its long tail at ~1 month. Should Aetheria aim longer? The knobs are HP
   growth 1.15 and grow-time ×15.
2. **Stone as Excavation's currency** (vs gold). I chose it to insulate mining from the
   combat gold runaway. If you'd rather keep gold, the combat-gold fix (§5.5) must ship at
   the same time.
3. **Core study.** Do you want a follow-up on the dust curve and first-ascension timing?
   Today eligibility comes at ~1 minute; a typical genre target is 30–60 min.
4. **Mobile bar position.** I recommend bottom-fixed on mobile and under the header on
   desktop. Confirm, or keep it top everywhere for consistency.
