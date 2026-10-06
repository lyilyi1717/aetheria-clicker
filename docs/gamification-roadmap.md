# Aetheria Clicker: Gamification & Long-Arc Roadmap

**Status:** design spec, written 2026-10-06 against **v2.6.0**. A Fast Forward rework was in
progress in the working tree while this was written (`js/version.js` says 2.7.0, "Fast
Forward Returns": the price triples per use, and resets after 30 min without a use).

**Author:** the game-theory / gamification designer agent. This is the same role that
owns:
- `docs/game-theory-progression.md`
- `docs/excavation-stuck-and-ascension-resets.md`
- `dev/nokia-snake/docs/game-theory-design.md`

The methodology carries over:
- Additive within a category, multiplicative across categories.
- Order-of-magnitude milestones with small rewards.
- Pacing comes from a bottom-up model plus a calibration knob.

**Scope rule:** read-only on game code. Everything below is a spec for later implementation
passes. `file:line` references are to v2.6.0.

**Method:**
- I ran a headless node simulation of the real `js/systems/*.js` classes, with audio and
  particles stubbed and `setTimeout` synchronous.
  - The bot replicates `main.js:1743 onSimTick` and runs check-ins on a fixed cadence.
  - It buys greedily: buildings, Forge, talents, perks, Quartermaster, pickaxe and drills,
    Golems, garden, brews, Enchanter.
  - Ascension rule: ascend when pending dust ≥ factor × total dust, after a minimum run
    length.
- The script is `msim.mjs` in the session scratchpad. It is not committed.
- Profiles:

| Profile | Clicks | Active window | Check-ins after | Ascend when |
|---|---|---|---|---|
| `grinder` (playtester-like) | 5/s | 3 h | 1 min | pending ≥ total dust, run ≥ 2 min |
| `human` (engaged) | 3/s | 1 h | 5 min | pending ≥ total dust, run ≥ 5 min |
| `casual` (headline) | 2/s | 10 min | 15 min | pending ≥ 4× total dust, run ≥ 1 h |

- All three use every spell on cooldown while active, plus Dynamite and 1 manual mining hit/s.
- **Fast Forward was never used.** Every number below is what the game does without it.

---

## 0. Key findings (why the game "lost its meaning")

### 0.1 Fast Forward is not the root cause. The finite content is shallow.

Without Fast Forward, measured on v2.6.0 code:

| Milestone | grinder | human | casual |
|---|---|---|---|
| First Ascension eligible | 1.5 min | 2.1 min | 4.3 min |
| **All 24 achievements** | **22.7 min** | **37 min** | 23/24 at 1 week (missing 10k clicks) |
| Transcend eligible (50k total dust) | **8 min** | **15 min** | 3.4 h |
| Floor 1,000 (last named zone ends) | 31.6 min | 27.2 min | 2.6 h |
| **All 95 talent ranks** | **1.7 h** | 81/95 at 24 h | 35/95 at 1 week |
| Talent points from bounties : from Ascensions | 69 : 45 at 3 h | 39 : 42 at 24 h | 8 : 27 at 1 week |

Everything a player can *finish* is finished in an afternoon:
- the achievements
- Transcend eligibility
- the named Tower zones
- the small perks
- the talent tree

Fast Forward only compressed an already short list. The three systems that *are* paced
log-in-time stay well-paced:
- **Excavation depth:** casual d25 at 42 min, d50 at 4.5 h, d75 at 1.1 days, d100 at 5.7 days.
- **The Garden ladder:** Star Lotus at 4–6 h.
- **Catalysts:** 22 at 1 day, 28 at 1 week.

**Design consequence:** meaning-bearing rewards (talent points, unlocks, Transcend) must
hang off those log-paced curves, never off the exponential Aether/dust core. The core
stays fast and juicy. "Numbers go up" is the 30 s dopamine layer, not the meaning layer.

### 0.2 The Void Tower is an endless auto-climber (new finding)

- Gear rolls at `combatFloorScale(floor) × rarity` (`CombatSystem.js:322`). Monsters use the
  same `1.12^(f-1)` (`:84-87`). A Common weapon from floor *f* already one-shots most
  floor-*f* monsters. Rarity (×18 max), Forge, level and talents only widen the gap.
- Past `COMBAT_SCALE_MAX_EXP = 6000` (`:23`), monster stats stop growing at all.
- Result: about **1 floor per second, forever**.

| Profile | 1 h | 24 h | 1 week |
|---|---|---|---|
| human | floor 4,437 | 155,868 | — |
| casual | — | 81,522 | 723,053 |

- Tower gold and the Market Index are uncapped BigNum `1.12^(f-1)`. Gold therefore grows
  exponentially *in time*, and the Golden Enchanter absorbs it into Aether: casual has
  89,373 levels at 1 week, which is **×4,470 Aether**.
- The "Max Floor" leaderboard is effectively a seconds-played counter.

**Fix (measured):** roll gear at `1.11^(f-1)`, keeping monsters, gold and the Market Index
at 1.12. Gear then lags monsters by `1.009^f`, so hero power from the Forge, levels,
talents and the Quartermaster has to close the gap. Casual profile:

| | 1 h | 6 h | 1 d | 3 d | 1 w |
|---|---|---|---|---|---|
| gear 1.12 (today) | 348 | 4,529 | 81,522 | 296,567 | 723,053 |
| **gear 1.11** | **149** | **310** | **414** | **455** | **498** |
| gear 1.115 | 112 | 595 | 851 | 958 | 980 |
| gear 1.10 | 76 | 170 | 240 | 250 | 268 (hard wall) |

- 1.11 gives the same decelerating log shape as Excavation, with Kingdom Centre (floor 501)
  landing at about 1 week.
- The Enchanter runaway disappears as a side effect: 57 levels at 1 week instead of 89k.
- Human profile at 1.11: floor 520 at 1 h, then 560 through 24 h. Active players front-load
  the climb and then hit the same wall.
- **Calibration knob:** the gear base, in the range 1.11–1.115.

### 0.3 Bounties are the biggest talent-point faucet, and they jam for idle players

- Contract targets are tiny (`reqBase` 1–50 × 1–3, `BountySystem.js:5-15`) and a claimed
  contract is replaced instantly (`:117-118`). An active player clears about 3 a minute,
  and 20% of them pay a talent point (`:58`). That is about 40 TP/hour.
- When the player stops clicking, a `click` or `crit_click` contract blocks its slot
  forever. In the casual run, contracts stalled at 26–41 total after minute 10.

### 0.4 Fast Forward is now bounded either way

- The brief's 30 × 10^k price allows 2 uses per 30-min window at the base 1,440-sand bank:
  60 s of warp.
- The in-progress 3^k price (30/90/270/810) allows 4 uses: 1,200 sand, 120 s of warp.
- Either way that is ≤ 7% extra sim time. Sand income (1/min offline, contracts, gold
  transmute at 1,000·M per 30 s) is the real limiter.
- **Fast Forward cannot skip the arc below**, provided the meaning-bearing timers use
  wall-clock time:
  - contract arrivals
  - the Daily Dallah
  - the Weekly Ledger

---

## 1. Target arc

Assumed cadence (same method as the Snake doc §10):
- **Casual:** 2 sessions a day of about 1 h, otherwise closed.
- **Engaged:** 3–4 sessions a day, tab often open.
- Offline Aether is uncapped (the owner's call). Golem rows run offline for up to 12 h.

Numbers come from the gear-1.11 sim, the shipped §5.1/§5.2 curves and §3 of this doc.
Month and 3-month figures extrapolate the measured log curves.

| When | Casual has… | …and feels | Lands at this point |
|---|---|---|---|
| **10 min** | Monolith, Codex, Tower floor ~40, Excavation depth ~8, Grimoire | "Each new tab is a surprise" | 4 unlocks (Codex, Tower, Excavation, Grimoire), first boss, first stairs |
| **1 h** | Bounties, Garden (Lily/Fern), Alchemy, floor ~150 (zone 2), depth ~25 (Granite), Ascension temple open | "I understand the loop; I'm about to be reborn" | First Ascension (+2 TP), Constellations and Leaderboard unlocked, Granite stratum star |
| **1 day** | 6–7 Ascensions, all 13 tabs open, floor ~410 (zone 4), depth ~75, Star Lotus rotating, ~20 Catalysts, 1–2 Golems, **~17 TP** | "I have a build and a plan; the next goals are visible" | Bazaar (Asc 2), Quick Cast (Asc 3), first keystone chosen (Fast Forward *or* Golems), perk tier 5 |
| **1 week** | depth ~100 (Aetherite), floor ~500 (Kingdom Centre), 25+ Catalysts, Guild Rank ~7, **~26 TP**, 4–5 of 7 Seals | "Transcend is in sight" | Second keystone, Seals lighting up |
| **1 month** | First Transcend done (~day 12–18), shard tree started, depth ~120, floor ~560, **~45 TP** (tree ~45%), Codex ~60% | "A new layer; my second climb is faster" | Transcend (+3 TP), shard tree, first collection sets complete |
| **3 months** | 2–3 Transcends, depth ~135 (Starcore), floor ~650, Catalysts ~50, **~74 TP** (tree ~75%), Codex ~85% | "Still chasing the last stars and sets" | Seal tier II, Abyssal Heart in sight (d151) |

The engaged player arrives at each row about 1.5–3× sooner:
- about 35 TP at 1 week and about 100 TP (the full tree) at about 3 months
- first Transcend at about 7–10 days

A grinder at the talent-point ceiling (48 contracts a day) finishes the talent tree in about
6–7 weeks. That is the fastest the meaning layer can go, versus 1.7 hours today.

---

## 2. Progressive unlocking

### 2.1 Principles

1. **Sessions 1–2:** unlocks are milestone-gated, about one every 3–15 minutes. After
   that they are gated by Ascension and talent points.
2. **Each trigger is a visible goal inside an already unlocked tab.** No unlock depends on
   a system the player can't see yet.
3. **Only the next 1–2 locked tabs are shown**, as silhouettes. The rest stay hidden.
   Twelve locks on screen read as a wall; one teaser reads as a goal.
4. **Unlocks never re-lock**, not through Ascension, Transcend or respec.
5. **The Monolith is never gated**, and neither are Settings and About. The save
   export/import buttons move from Codex to Settings so a gated Codex never traps a
   backup.

### 2.2 Unlock table

Times are casual / engaged, from the gear-1.11 model with the Tower starting at its
unlock.

| # | Tab / feature | Trigger (persisted check) | Casual / engaged | Starter gift on reveal |
|---|---|---|---|---|
| 0 | **Monolith** | always | 0 | — |
| 1 | **Codex** | 3 achievements unlocked | ~1 min / ~40 s | — (the reveal says each achievement is +1.5% Aether) |
| 2 | **Void Tower** | own 10 Shawarma Stalls (first ×2 building milestone) | ~1.5 min / ~1 min | hero starts with a Rare weapon |
| 3 | **Excavation** | defeat the floor-20 boss | ~5 min / ~3 min | 30 stone (first Auto-Drill) |
| 4 | **Grimoire** | defeat the floor-40 boss ("Mutawa drops a dusty grimoire") | ~9 min / ~6 min | mana refilled |
| 5 | **Bounties** | reach Excavation depth 10 | ~13 min / ~7 min | first contract pre-filled to 50% |
| 6 | **Garden** | reach depth 15 ("Hasawi seeds in the sand") | ~18 min / ~10 min | 2 extra Mint seeds |
| 7 | **Alchemy** | first moment the player *can* brew any recipe (≥1 gem and ≥2 of its essence) | ~30 min / ~15 min | one free brew of Cold Vimto |
| 8 | **Ascension** | **teaser** at maxFloor ≥ 50 with a 2-part progress bar. **Unlock** at maxFloor ≥ 100 **and** maxDepth ≥ 25 **and** pending dust > 0. Applies to the first Ascension only; later Ascensions are ungated. | ~45 min / ~15 min | — (the ceremony is the reward) |
| 9 | **Constellations** | first Ascension | with #8 | the +2 first-Ascension star |
| 10 | **Leaderboard** | first Ascension | with #8 | — |
| 11 | **Bazaar** (Golden Enchanter included) | Ascension 2 **and** maxFloor ≥ 150 (zone 3) | ~3 h / ~30 min | one free small caravan |
| 12 | **Quick Cast bar** | Ascension 3 | ~5 h / ~40 min | — |
| 13 | **Garden Golems** | **Keystone talent "Golem Covenant"** (2 TP), needs 50 harvests | player's choice, typically day 1 | first Golem's Mana Sap cost waived |
| 14 | **Fast Forward** | **Keystone talent "Hourglass of Al-Ula"** (2 TP), needs Ascension 2 | player's choice, typically day 1–2 | sand bank shown full: offline sand has been accruing all along |
| 15 | **Ascension perk tiers** | Genesis + Eternal Resonance at Asc 1 · Singularity Tap + Titan's Legacy at Asc 3 · Chrono Reservoir + Astral Crucible at Asc 5 · Automated Leylines at Asc 10 | day 1 (casual Asc 10 ≈ day 2–3) | — |
| 16 | **Transcend** | **all 7 Seals of Transcendence** lit (§5.1). The section shows from Ascension 1 as 7 dim lamps. | ~12–18 days / ~7–10 days | +3 TP on the first Transcend |
| 17 | **Shard tree** (layer 2, wave 3) | first Transcend | — | — |

**Why this order:**
- Monolith → Tower → Excavation → Garden → Alchemy follows the production graph. Each new
  tab consumes something the previous tab produces:
  - gold → stone
  - stone → seeds
  - essences + gems → brews
- The Grimoire comes early because spells speed up the first three tabs.
- Bounties come once three subgames exist, so contracts have variety.
- Ascension closes session 1. Talents and Leaderboard come with the first rebirth, so the
  first talent point is spent the moment it exists.
- The Bazaar waits for Tower gold to matter.
- The two automation features cost talent points. That makes the first talent decision a
  real trade-off: automation versus raw power.

**Contracts only roll types from unlocked tabs.** Today a `harvest_plant` contract can
appear before the Garden is visible.

### 2.3 Presentation (one consistent pattern)

| Phase | Spec |
|---|---|
| **Teaser (locked)** | The next locked tab shows in the nav as a dimmed silhouette: lock glyph, name "???", no click. The tooltip shows the trigger and live progress, e.g. "Defeat the floor-20 boss: floor 14/20". The tab after that stays hidden. The Ascension teaser is the exception: it shows its own progress bars. |
| **Reveal moment** | The nav button fades in with a gold shimmer, plays `sound.playAscension()`, and pops a toast: "🏜️ NEW: Excavation — Grandpa's old shovel fell from the boss!" (Saudi-meme flavour line per tab). It is a toast, not a modal: never interrupt a click streak. The button carries a pulsing "NEW" pip until visited. |
| **First visit** | The existing `.tab-guide-banner` opens expanded with a 3-line "First time here" block: what this tab is, what it produces, the one thing to do first. A starter gift (table above) is credited with a float-text, so the first action succeeds. The "first thing to do" is highlighted with a one-shot glow. Later visits show the banner collapsed, as today. |
| **Keystone features** | Shown inside the Constellations tab as larger star nodes with a "Unlocks: Fast Forward" label. The header Fast Forward button and the Golem panel show as greyed teasers with "Unlock in Constellations: Hourglass of Al-Ula (2 TP)". |

State: `gs.unlocks = { [id]: unlockedAtMs }`, `gs.unlockSeen = { [id]: true }`.

The checker:
- runs from `AchievementSystem.checkAchievements` cadence (once per sim tick, cheap
  comparisons);
- calls `app.onUnlock(id)` once per id;
- is applied by `switchTab` and nav rendering. A locked tab cannot be switched to.

---

## 3. Talent point economy

### 3.1 Target

Talent points should feel earned, "not very long and not very fast". The tree should keep
something to buy for months, with the first point inside the first hour.

| | 1 day | 1 week | 1 month | 3 months |
|---|---|---|---|---|
| Target TP, casual | ~15 | ~25 | ~45 | ~75 |
| Target TP, engaged | ~20 | ~35 | ~65 | ~100 |
| Today (casual / human) | 26 / 81 | 35 / 95 (max) | — | — |

Tree size: 95 ranks (unchanged, 1 TP per rank) + 3 keystones (2 TP each, wave 1 has 2) =
**~100 TP**.
- Casual finishes in about 5 months.
- Engaged finishes in about 3 months.
- A grinder finishes in about 6–7 weeks.

### 3.2 Sources

Three sources, each on a known curve. Nothing on the exponential core except one log term.

**(S1) Milestone Stars.** One-off and finite. Each one marks a log-paced achievement.

| Star | TP | Casual timing |
|---|---|---|
| First Ascension | +2 | ~1 h |
| Each new stratum entered: depth 26, 51, 76, 101, 126, 151 | +1 each (6) | 45 min, 4.6 h, 1.1 d, 5.7 d, ~1.5–2 mo, 3 mo+ |
| Each new Tower zone entered: floor 51, 151, 301, 501, 751, 1001 | +1 each (6) | 15 min, 1.2 h, 5–6 h, ~8 d, 3 mo+, — |
| First harvest of Rose of Taif / Date Palm / Sidr Tree | +1 each (3) | ~1 h / ~3 h / ~5 h |
| Catalysts 10 / 25 / 50 | +1 each (3) | ~6 h / ~3 d / ~1.5 mo |
| Transcend | first +3, then +1 each | ~2 weeks |
| Codex collection set completed (wave 2, §5.3) | +1 each (~6) | weeks–months |

**(S2) Record Ascension.** This replaces the flat +3.

```
magnitudeStars = max(0, floor(log10(bestRunDust)) − 3)
```

- `bestRunDust` is the largest pending dust of any single Ascension.
- It is stored in `gs.records`, which is lifetime: neither Ascension nor Transcend resets
  it.
- When an Ascension raises `magnitudeStars`, grant the difference.

Casual best-run dust: ~1e4 at 3 h, 6e5 at 6 h, 1.6e7 at 1 d, 8e7 at 1 w. That gives
**1, 2, 4 and 4–5 stars**, and then roughly one per Transcend-boosted order of magnitude.

Clock-skip exploits (offline Aether is uncapped) gain at most a star or two, because the
term is log10.

**(S3) Guild Rank** (contracts). This replaces the 20% random talent point.

```
guildRank(C) = floor((C / 8)^(1/1.4))        C = lifetime contracts claimed
contracts needed for rank r = ceil(8 · r^1.4): r1 8 · r2 22 · r3 38 · r5 77 · r10 201 · r20 531 · r40 1,400
```

- Each rank-up gives +1 TP and +5 Guild Seals, plus a title in the Bounties header.
- This only works with the contract-board pacing in §4.4: one new contract every 30 min of
  **wall-clock** time, up to 6 waiting.
  - Casual (2 sessions/day) claims about 16 a day → rank ~2 at 1 d, ~7 at 1 w, ~19 at 1 m,
    ~41 at 3 m.
  - The ceiling is 48 a day → rank ~41 at 1 m.

**Projected totals (casual):**
- **1 d:** 11 (S1) + 4 (S2) + 2 (S3) = 17
- **1 w:** 14 + 5 + 7 = 26
- **1 m:** 20 + 6 + 19 = 45
- **3 m:** 26 + 7 + 41 = 74

This matches §3.1 within about 10%.

**Calibration knobs:**
- the S3 exponent 1.4 (lower is faster)
- the S2 offset 3
- the contract interval of 30 min

**As implemented (R9, `js/systems/TalentSources.js`, state in `gs.records`):**
- S1 stars are polled once a second (`checkMilestones`) from existing state: `ascensionCount`,
  `miningGrid.maxDepth`, `hero.maxFloor`, `alchemy.catalysts`, `records.harvested` (set in
  `GardenSystem.harvestPlot`) and `transcendenceCount`. The Codex-set star is not built (wave 2).
- S2 runs inside `PrestigeSystem.ascend` (so Transcend's inner Ascend counts as a run).
- S3: `recordContractClaim(gs, n)` is called once per claimed contract by `BountySystem.claimBounty`
  (R10). The R9 stand-in (`consumeGuildClaim`, a 30-min token bucket) is gone: the board itself paces
  claims to the §4.4 ceiling of 48 a day. `records.contractBucket` is unused and always `null`.
- The rank table above uses `ceil(8 * r^1.4)`: r2 22, r3 38, r20 531, r40 1,400 (the first draft
  of the table was a few contracts low).
- Old saves keep `talentPoints` and `spentTalentPoints` and get `records` seeded from what they
  show (stars already met, best run dust = lifetime dust, contracts = bounties completed), so
  nothing is re-awarded. No `MIGRATIONS` step: no existing field changed meaning.

### 3.3 Decision: gate the +3 per Ascension

**Yes. The flat +3 is removed.** Ascension now pays talent points only through:
- the one-off first-Ascension star (+2)
- Record Ascension stars (S2)

Reasons:
- Ascension is available from minute 2 and repeats as fast as the player likes, so any
  flat per-Ascension grant is a farm. Today it is 45 TP in 3 h for a grinder.
- A log-of-record grant still rewards "push this run further than ever". That is exactly
  the behaviour Ascension should teach.

### 3.4 Spending rules

| Rule | Spec |
|---|---|
| Cost | 1 TP per rank, as today. Escalating rank costs were considered and rejected: the source side already paces the arc, and flat costs keep the tree readable. |
| Keystones (new) | **Hourglass of Al-Ula** (Chronomancer root, 2 TP, needs Ascension 2): unlocks Fast Forward. **Golem Covenant** (Artisan root, 2 TP, needs 50 harvests): unlocks Golems. Wave 2: **Blueprint Automaton** (Architect, 3 TP): auto-buys the best building every 10 s. Keystones are **excluded from respec**, so a feature never re-locks. |
| Respec | **Free once per Ascension.** The token refreshes on Ascend and the button shows "Free respec available". A second respec in the same run costs 10 Guild Seals. Experimenting stays cheap, and a build is still a commitment for the run. |
| Dead talent | **Temporal Siphon** (Chrono Sand gain) is useful again once Fast Forward is back, so it stays. Chrono Reservoir also matters again. |
| Visibility | The Constellations header shows "Next stars:" with the 3 nearest S1/S2/S3 sources and progress bars, e.g. "Depth 51 · 47/51", "Guild Rank 3 · 31/37", "Record Ascension 1e6 · 40%". A goal gradient makes each point anticipated and therefore earned. |
| TP grant moment | A star flies from the source to the Constellations nav button. The header TP counter pops, the sound plays, and the nav gets a "has-notif" pip (reuses `updateTabNotifications`). |

---

## 4. Reward cadence (dopamine map)

### 4.1 Cadence targets

| Tier | Interval | Size | Purpose |
|---|---|---|---|
| Small | ~every 30 s | float text, spark, sound note | "something is happening" |
| Medium | every 2–10 min | toast, fanfare, progress bar completes | "I made progress" |
| Big | once per session or day | ceremony, star, unlock, new stratum or zone | "today mattered" |
| Epic | about weekly | seal, Transcend, collection set, weekly ledger | "this week mattered" |

### 4.2 Per subgame

| Subgame | Small (~30 s) | Medium (2–10 min) | Big (session/day) | Epic (weekly) |
|---|---|---|---|---|
| **Monolith** | crits, combo meter, Frenzy at combo 100 (about every 35 s of clicking), building buys | building milestone ×2 at 10/25/50/100… (fanfare "×2 Shawarma!"); Golden Anomaly (60–120 s, `ClickerSystem.js:127`); **new Aether/s magnitude rank** toast (×1,000 steps with Saudi-meme names) | Ascension ceremony with dust count-up; Record Ascension star | — |
| **Void Tower** | kills, loot drops coloured by rarity (Cosmic = gold burst + sound), level-ups | boss every 10 floors with its 30 s timer. **Near-miss:** on timeout show "Boss escaped at 4% HP" and a one-tap "Retry with Almarai Laban" if owned. | new zone (palette change + Zone star) | Warden boss every 250 floors (unique meme trophy, §5.3); Bestiary row complete |
| **Excavation** | tile breaks, gem pops, gold caches | stairs found + descent animation. **Near-miss:** after 12 tiles without stairs, a "warm/hot" shimmer on the 3×3 around the stairs (true information, never fake). | new stratum every 25 depth (background, music scale, star) | stratum relic find (§5.3); depth 100/125/150 |
| **Garden** | water, plant | plot matures (5–30 min); **mutation roll** shown as a seed shimmer even on a miss ("so close: 25%") | first bloom of a new tier (star); Golem row automated | Herbarium set; 1% **golden mutation** collectible |
| **Alchemy** | brew float-text | buff chip appears in the BuffBar; "Alignment Combo!" toast when Celestial Alignment + Cold Vimto overlap | Catalyst 10/25/50 star | — |
| **Grimoire** | casts, cooldown sweep | Astral Renewal reset (big flash) | — | — |
| **Bounties** | progress ticks | contract complete + claim (a new one arrives every 30 min) | **Guild Rank up (+1 TP)** | **Weekly Ledger** (§5.4) |
| **Bazaar** | price ticks | caravan returns (10/60 min); price spike toast "Amber at 92% of its band" (timing skill) | Enchanter milestone every 25 levels | — |
| **Ascension** | — | pending-dust preview with the "next Record star at 1e6: 82%" meter | Ascension; perk-tier unlock | **Seal lit**; Transcend |
| **Codex** | achievement toast | collection "19/20" near-completion highlight | set complete (+% and star) | — |
| **Global** | — | "Next goals" tracker: the 3 nearest goals across all tabs, in the header | **Daily Dallah** (§5.4) | — |

### 4.3 Late-game medium cadence

From about day 2, stairs take hours and floors crawl. Medium events then come from
wall-clock systems:
- contracts (every 30 min)
- caravans (10/60 min)
- plot maturation (5 min – 2 h)
- boss retries
- Golden Anomaly (60–120 s)

This is deliberate. The log curves supply the big moments, and the timers supply the
medium ones.

### 4.4 Contract board pacing (needed by S3 and the cadence)

| Item | Today | Proposed |
|---|---|---|
| Refill | instant on claim | one new contract every **30 min wall-clock** (`contracts.nextAt`), up to **6 waiting**. Fast Forward does not speed it up. |
| Size | `reqBase × 1–3` | `reqBase × d × (1 + 0.15·guildRank)`, capped so each contract is about 3–10 min of normal play for that type |
| Types | any of 9 | only from unlocked tabs. `click` / `crit_click` only if the player clicked in the last 5 min. **One free reroll per contract** (closes old #15). |
| Talent point | 20% random | removed; Guild Rank (S3). An in-flight contract with `talentPoint: true` still pays on claim. |
| Gold | `250·d·floor/2` | `250·d·M` (Market Index), so it stays relevant at any floor |

**As implemented (R10, `js/systems/BountySystem.js`, UI `js/ui/contracts.js`, state `gs.bounties` + `gs.contracts`):**
- Board of 6 (`BOARD_SIZE`). `gs.contracts = { nextAt, lastClickAt }` (wall clock, `Date.now()`; Fast Forward
  never touches it). `update()` runs every sim tick: while there is a free slot and `now >= nextAt` a contract
  arrives and `nextAt += 30 min`, so the board fills while the player is away. **A full board holds the timer
  at one interval from now**, so claiming from a full board never refills at once (the next one comes 30 min
  later) and a long absence never banks more than the 6 slots. A clock set backwards clamps `nextAt` to
  at most one interval ahead, so the timer is never frozen.
- A save with no `contracts` (new game or pre-R10) keeps its bounties, is topped up to 4 starters and starts
  the timer one interval out. No `MIGRATIONS` step: `bounties` keeps its meaning and `contracts` is additive.
- Size is `reqBase x d x (1 + 0.15 x guildRank)`, capped per type (`cap` in `BOUNTY_TEMPLATES`, about 10 min
  of normal play: click 600, crit 90, monsters 120, bosses 4, tiles 150, harvests 40, brews 12, casts 30,
  buildings 80). Gold is `250 x d x Market Index`, Sand `15 x d`, Seals `d`.
- Types: `click` / `crit_click` only roll if the last manual click was under 5 min before the contract arrived
  (`lastClickAt`). Other types roll from tabs for which `gs.isTabUnlocked(tab)` is true; until R7 provides that
  hook every tab counts as open.
- One free reroll per contract (`rerolled` flag), only while it has no progress; it swaps the slot in place and
  never changes the timer. Rerolls never hand back the same task type.
- Not built: the "1 in 50 shard" chip from the mockup (belongs to the R13 Guild perk).

### 4.5 Ethics guardrails (no monetization; keep it that way)

- **No streak loss.**
  - The Daily Dallah banks up to 3 unclaimed days.
  - "Days visited" is a lifetime count, not a consecutive streak.
  - Nothing decays while away.
- **No FOMO exclusives.** Weekly content rotates back. Nothing is ever only available once.
- **Near-misses are true.** No fake "almost" rolls. Shimmer hints reveal real information.
- **Caps are visible:** offline 12 h for Golems, the contract bank of 6, the sand bank.
- **No notifications or push.** Toasts never block clicks; only Transcend has a confirm.
- **Replace the "kl zaq cheater" alert.** It insults legitimate players. The Fast Forward
  rework is already removing it.

---

## 5. Endgame extension

### 5.1 Seven Seals of Transcendence (replaces the 50k-dust gate)

Today Transcend needs 50,000 total dust: 8 min for a grinder, 3.4 h for a casual player.
The new gate needs **all 7 Seals lit**. Each Seal is a lifetime flag on a log-paced
curve, shown as 7 lamps in the Ascension tab from the first Ascension on.

| Seal | Condition (tier I) | Casual ETA |
|---|---|---|
| 🪨 Seal of the Deep | maxDepth ≥ 100 | ~5.7 d |
| 🏢 Seal of the Tower | maxFloor ≥ 501 (Kingdom Centre) | ~8 d |
| 🌳 Seal of the Oasis | Catalysts ≥ 25 | ~3 d |
| 🔮 Seal of Rebirth | 15 Ascensions | ~3–5 d |
| 📜 Seal of the Guild | Guild Rank 7 (~123 contracts) | ~7–8 d |
| ✨ Seal of the Stars | bestRunDust ≥ 1e8 | ~1–2 w |
| 📖 Seal of Memory | 40% of the expanded Codex (achievements + collections) | ~1–2 w |

- **First Transcend:** about 12–18 days casual, about 7–10 days engaged.
- **Tier II** (second Transcend): depth 125, floor 751, Catalysts 40, 30 Ascensions, Guild
  Rank 14, bestRunDust 1e10, Codex 60%.
- Tier III goes on the same way.
- Lit Seals never go dark. Each Transcend raises the next tier's bar.

**Shard payout** (wave 3, calibration):
- Today it is `totalDust / 1e4` at +10% each, linear in an exponential quantity.
- At the Seal gate's dust (~1e8) that is 10,000 shards, which is ×1,001.
- Proposed: `shards = floor(sqrt(totalDust / 1e4))`, giving 100 shards (×11) at 1e8. Still
  additive within its category.

### 5.2 Tower zones become a months-long ladder

With gear at `1.11^f` (§0.2), the zones are real tiers:

| Zone | Floor | Casual | What lands |
|---|---|---|---|
| Thumama Dunes | 1–50 | 0–15 min | — |
| Tahlia Street | 51–150 | 15 min–1.2 h | zone star |
| Al-Batha Market | 151–300 | 1.2–6 h | zone star; Bazaar trigger |
| Empty Quarter | 301–500 | 6 h–8 d | zone star |
| Kingdom Centre | 501–750 | 8 d–~3 mo | star; Seal of the Tower |
| Boulevard World | 751–1000 | post-Transcend | star; Seal tier II |
| Wasta Dimension | 1001+ | late Transcends | star |

- **Warden bosses** every 250 floors: 60 s timer, ×3 HP, and a unique meme trophy for the
  Codex.
- **Legacy saves** must be rebased (§8), the same way as Excavation schema 3.

### 5.3 Collections (Codex 2.0)

Each set is its own additive "Collection" category, small relative to its threshold.
Completing a set gives +1 TP (S1).

| Set | Entries | Entry condition | Set bonus |
|---|---|---|---|
| Bestiary | 12 monsters × 7 zones = 84 | 100 kills of that monster in that zone; row complete = zone done | +5% hero atk per complete zone row |
| Meme Trophies | Drifting Camry, Angry Shayeb, Giant Kabsa Monster, Dallah of Doom, Al-Modir… (named bosses and Wardens) | first kill of each named boss or Warden | +2% gold each |
| Gear Museum | 4 slots × 5 rarities = 20 | ever equipped | +10% drop chance on completion |
| Strata Relics | one per stratum (7) | 1/200 chance per tile in that stratum; pity at 400 | +5% pickaxe each |
| Herbarium | 6 seeds × (normal, fertilized, golden) = 18 | harvested in that state; golden = 1% mutation | +5% growth per seed row |
| Achievements ladder | expand 24 → ~90 | ×10 tiers on every lifetime stat (clicks, kills, bosses, tiles, harvests, brews, casts, contracts, Ascensions, depth, floor) | +1.5% Aether each (unchanged) |

Near-completion ("19/20") highlights are the collection's near-miss.

### 5.4 Session and week structure (ethical)

- **Daily Dallah:** the first visit of each calendar day.
  - Gift: 1 bonus contract + 60 Chrono Sand + a 1-hour "fresh coffee" buff (+25% Aether).
  - Unclaimed days bank up to 3. There is no streak.
- **Weekly Ledger:** 3 weekly goals drawn from unlocked tabs, e.g. "Descend 3 depths",
  "Defeat 2 Wardens/bosses at your best zone", "Brew 5 Catalysts or elixirs".
  - Reward: Guild Seals + a Codex stamp (cosmetic).
  - It rotates on Monday. Missing a week loses nothing permanent.
- **Souq Rotation** (wave 3): one gentle weekly world modifier, e.g. "Truffle Season: Fern
  ×1.5 growth" or "Falcon Week: boss gold ×1.5". It always returns.

### 5.5 Leaderboard Season 2

- Legacy saves are already at floors in the hundreds of thousands. After the Tower wall,
  the old "Max Floor" board is permanently dominated by pre-wall saves.
- Start a **Season 2** board with these columns:
  - Max Floor (walled)
  - Max Depth
  - Seals lit
  - Codex %
  - Transcends
- Freeze Season 1 as a read-only Hall of Fame.

---

## 6. Decisions on the two delegated questions

### (a) Dynamite and Void Cataclysm at 40× pickaxe damage per tile: **keep 40×**

1. **It cannot soft-lock or outrun the kit.**
   - Blast damage is proportional to pickaxe power, so an active player's lead over idle
     is a bounded *ratio*, not an unbounded depth.
   - Measured in the excavation doc: with Dynamite on cooldown, depth is 35 at 1 h and 57
     at 6 h. Without it, depth is 22–24 at 1 h and 50–53 at 6 h.
   - That is +10–50% depth for attention, shrinking over time as the log curve flattens.
2. **It is worth the press without being mandatory.**
   - At the §5.1 pace (30–1,300 hits per tile), one blast is about 3× the drills' output
     over its cooldown.
   - Dynamite is 3×3 × 40 hits every 25 s, about 14 hits/s while active. Twelve drills are
     6 hits/s.
3. **It is good juice.** Shallow tiles still shatter in one blast, and deep tiles visibly
   chunk.
4. **Automated Leylines** auto-casts Void Cataclysm: 4 × 40 hits per 40 s, about 4 hits/s
   idle. That is a fair reward for a 50-dust perk that now unlocks at Ascension 10.

**Optional wave-3 polish:** an aim mode. Tap Dynamite, then tap a tile, and the blast
centres there. Combined with the warm/hot stairs hint, it turns a timer press into a small
decision. It changes no numbers.

### (b) Aether Forge: **persist through Ascension (as today)**

1. **The Tower persists.** Floor, gear and level persist because the floor is the Market
   Index.
   - Resetting the Forge would leave the hero under-powered at a floor he already holds.
     He would die and retreat a floor per death after *every* Ascension.
   - With gear at 1.11 the hero sits near the wall, so the drop would be real. That is
     forced regression on the loop we want players to repeat about hourly.
2. **Persisting cannot run away.**
   - The cost is `1e5 · 5^n` run Aether (`CombatSystem.js:162-166`), so the level tracks
     about `log5(peak run Aether)`. It is a monotone ratchet of the player's best run, not
     a compounding loop.
   - Measured: Forge 25–31 at 1 week casual, both with and without the Tower wall.
3. **It is the Tower's link to the core.** Paying in run Aether ties Tower progress to how
   far each run pushes. That makes "push this run further" matter twice: Record stars and
   Forge levels.

---

## 7. Final Ascension reset/persist table

This supersedes the table in `excavation-stuck-and-ascension-resets.md` Part 2. It is
reconciled with progressive unlocking and the new talent-point rules.

| State | On Ascension | On Transcend | Notes |
|---|---|---|---|
| Aether, run Aether, buildings, click power, combo/frenzy timers | **Reset** | Reset | Genesis → 15 Stalls + 1,000 gold |
| Timed buffs `aether_mult`, `click_mult`, `click_gold` | **Reset (new)** | Reset | stops Celestial + Vimto pre-stacking into the next run |
| Timed buffs `gold_mult`, `hero_atk`, `time_speed` | Persist | Persist | |
| Celestial Nectar | **Consumed** (Nectar Offering) | Consumed | |
| Tower: floor, maxFloor, gear, level, skills, **Aether Forge** | Persist | Persist | decision (b) |
| Excavation: depth, maxDepth, pickaxe, drills, grid, stone, gems | Persist | Persist | |
| Garden: plots, seeds, essences (except Nectar), Golems, row seeds | Persist | Persist | |
| Alchemy Catalysts | Persist | Persist | |
| Spells: mana, cooldowns | Persist | Persist | |
| Talent ranks and unspent TP | Persist; **no flat +3** | Persist | S1 first-Ascension +2; S2 Record stars |
| Keystones | Persist | Persist | excluded from respec |
| Respec token | **Refreshed** | Refreshed | free once per Ascension |
| Contracts, Guild Seals, Quartermaster, Guild Rank, contract timer | Persist | Persist | the board keeps its wall-clock timer |
| Bazaar: gold, Enchanter, holdings, caravan in flight | Persist | Persist | |
| Chrono Sand **and the Fast Forward price counter** | Persist | Persist | **The FF counter must not reset on Ascend/Transcend**, or Ascension becomes an FF price-reset exploit. It resets only after 30 min without a use. |
| Cosmic Dust, perks | (dust gained) | **Reset** | perk *tiers* stay unlocked; they key on lifetime Ascension count |
| `ascensionCount` (lifetime) | +1 | Persist | perk tiers and the Rebirth Seal read it |
| Unlocks, unlockSeen | Persist | Persist | never re-lock |
| Seals lit, `records` (bestRunDust, stars claimed) | Persist | Persist (next tier's bar rises) | |
| Achievements, collections, stats | Persist | Persist | |
| Offline Aether | uncapped (owner's call) | — | it feeds only the log10 S2 term |

**The Ascend confirm lists what resets**, per principle 4 of the resets doc. That now
includes "Aether/click buffs end".

---

## 8. Save migration notes (GameState `version` 2 → 3)

### Legacy detection

`data.version ≤ 2` **and** `stats.totalPlayTimeSeconds ≥ 600` **or** `ascensionCount ≥ 1`.
- A pre-v3 save with less than 10 minutes of play is treated as new: its unlocks are
  computed from the triggers.

### Fields

| Field | Fresh v3 | Legacy migration |
|---|---|---|
| `unlocks`, `unlockSeen` | `{monolith}` | **all ids unlocked and seen** (no reveal spam). Players who already have everything never lose access. |
| Keystones | rank 0 | **granted free** as "Founder's Keystones": Fast Forward and Golems stay usable, no TP charged |
| `talentPoints`, `spentTalentPoints`, ranks | 0 | **kept as-is**. Points earned under the old faucet are not clawed back. |
| `records.bestRunDust` | 0 | estimated as `totalCosmicDust` (an upper bound; slight generosity is fine) |
| S1/S2/S3 claimed markers | none | **every already-passed milestone is marked claimed with no payout**: strata, zones, garden tiers, catalysts, magnitude stars, `guildRank(totalBountiesCompleted)`. Legacy players got their talent points from the old faucet. Paying again would double-dip. |
| `contracts.nextAt`, board | now + 30 min, 4 starters | keep existing bounties (rehydrate as today, `GameState.js:~401`). An existing `talentPoint: true` pays on claim. Then switch to the timer. |
| Seals | none lit | compute from state on load and light everything that is met. A legacy deep save is likely Transcend-ready at once, which is fine. |
| `respecToken` | true | true |
| Hero (Tower rebase, schema `hero.schema = 2`) | — | 1) Rescale equipped weapon/armor by `(1.11/1.12)^(f_item−1)`, where `f_item` is inferred from `attack / (10·rarityMult)` (rarity is stored on the item). 2) If the current kit loses at the current floor, step `floor` down to the highest floor the kit clears within the boss timer (closed-form estimate; same idea as `rebaseStrandedDepth`, `MiningSystem.js:121`). 3) **Keep `maxFloor` as the record** (leaderboard Season 1, achievements). 4) Add `hero.indexFloor = min(maxFloor, rebased floor)` and use it for the Market Index from now on. Otherwise a 700k-floor save prices the Bazaar at 1.12^700000. *Shipped in R8 as save version 3 (`migrations.js`) instead of a `hero.schema` field: the step rescales the gear and sets a provisional `indexFloor`, then flags `hero.pendingFloorRebase`; `CombatSystem.rebaseLegacyFloor` does 2) on load because it needs live combat stats (binary search on a conservative boss-clear estimate). Gear rolled past the old exponent cap (6000) infers `f_item = 6001`, so floor-81k to 700k saves all land at about floor 5,500 on the rebased kit; see `npm run sim:tower` for fresh-save pacing.* |
| Gold, Golden Synergy | — | **keep** (no confiscation; the earlier doc's §5.5 rationale holds). The Enchanter's future cost is index-free (`2.5^n`), so a legacy hoard stays a one-time windfall. |
| `activeBuffs` | — | unchanged (`clampLoadedTimers` already re-fits) |
| Codex expansion | — | new achievements evaluate on load; legacy players get a burst of toasts. **Batch them** into one "N achievements unlocked" toast. |

**Changelog copy:**
- Tabs now unlock as you play. Existing saves keep everything.
- Talent points now come from milestones, record Ascensions and Guild Rank.
- The Void Tower has a real difficulty curve, and very high floors were rebased (your
  record is kept).
- A new leaderboard season starts.

---

## 9. Ranked implementation list

Effort: S < 30 lines, M 30–120, L > 120 or new UI.

### Wave 1: minimal set that restores meaning

| # | Change | Impact | Effort | Depends |
|---|---|---|---|---|
| 1 | **Tower gear exponent 1.12 → 1.11** in `rollLoot` (`CombatSystem.js:322`), using a separate `gearFloorScale`. Monsters, gold and the Market Index stay at 1.12. Plus the legacy hero rebase and `indexFloor` (§8). | **Very high**: ends the endless auto-climb, the Enchanter runaway and the meaningless floor board | S + M (migration) | — |
| 2 | **Unlock framework**: `gs.unlocks`, trigger table §2.2 #1–#12, nav silhouettes + reveal toast + NEW pip + first-visit banner, legacy grandfather, save export moved to Settings | **Very high**: owner's direction #2 | M–L | — |
| 3 | **Talent economy**: remove the +3 (`PrestigeSystem.js:119`) and the 20% contract TP (`BountySystem.js:58`). Add S1 stars, S2 Record stars (`gs.records`), S3 Guild Rank, the "Next stars" panel and the grant animation. Legacy claimed markers. | **Very high**: direction #3 | M | #2 (zone/stratum hooks are simple checks) |
| 4 | **Contract board pacing**: 30-min wall-clock refill, bank 6, scaled size, unlocked-only types, no stale click types, one reroll, `250·d·M` gold | High: feeds S3, fixes the idle jam, provides the late-game medium cadence | S–M | #2 |
| 5 | **Seven Seals** replace the 50k-dust Transcend gate; 7 lamps on the Ascension tab | **Very high**: Transcend moves from 8 min to ~1–2 weeks | S–M | #3 (records), #4 (Guild Rank) |
| 6 | **First-Ascension gate** (floor 100 + depth 25) and the Ascension teaser; **clear `aether_mult`/`click_mult`/`click_gold` buffs on Ascend**, listed in the confirm | High | S | #2 |
| 7 | **Keystones** Hourglass of Al-Ula (Fast Forward) and Golem Covenant (Golems), excluded from respec; respec once per Ascension | High: talent points buy features; Fast Forward becomes an earned unlock | S | #2, #3, the Fast Forward rework |
| 8 | Fast Forward price counter **survives Ascend/Transcend** (check the in-progress rework) | Medium: closes an exploit | S | Fast Forward rework |

**The minimal wave 1 is #1–#6.** #7–#8 are small and ride on the same files, so ship them
together if possible. Together they move:
- the "everything done" point from **~0.5–3 h** to **~3–5 months** for the talent tree
- the first Transcend to **1–2 weeks**
- Tower zones to **weeks to months**

None of this touches the Aether core, so the minute-to-minute game feels the same.

### Wave 2: depth and juice

| # | Change | Impact | Effort |
|---|---|---|---|
| 9 | Achievement ladder 24 → ~90 (×10 tiers per stat) with batched toasts | High (long goals) | M |
| 10 | Collections: Bestiary, Meme Trophies, Gear Museum (+1 TP per set) | High (long goals, near-miss) | M–L |
| 11 | Juice pass: boss near-miss ("escaped at 4%") + retry, stairs warm/hot hint, stratum/zone fanfare (palette + rhythm scale), magnitude-rank toasts, unlock shimmer polish | High (dopamine) | M |
| 12 | Ascension perk tiers by lifetime Ascension count (1/3/5/10) | Medium | S |
| 13 | "Next goals" header tracker (3 nearest goals across tabs) | High (goal gradient) | M |
| 14 | Daily Dallah (banks 3, no streak) | Medium | S |
| 15 | Leaderboard Season 2 + Season 1 Hall of Fame | Medium (fairness after #1) | S–M |
| 16 | Blueprint Automaton keystone (auto-buy) | Medium (QoL for the long arc) | S–M |

### Wave 3: layer 2 and long tail

| # | Change | Impact | Effort |
|---|---|---|---|
| 17 | Seal tiers II/III + shard payout `sqrt(totalDust/1e4)` | High (post-first-Transcend arc) | S–M |
| 18 | Shard tree (Transcend layer 2: multiverse perks, e.g. keep 1 Golem row offline 24 h, +1 contract bank slot, Warden rewards) | High | L |
| 19 | Weekly Ledger + Souq Rotation | Medium–high (weekly epic) | M |
| 20 | Strata Relics + Herbarium golden mutations | Medium | M |
| 21 | Warden bosses every 250 floors | Medium | S–M |
| 22 | Dynamite aim mode | Low–medium | S |

---

## 10. Open questions for the owner

1. **Gear exponent 1.11 vs 1.115.**
   - 1.11 puts Kingdom Centre at about 1 week and Boulevard World after the first
     Transcend.
   - 1.115 is about twice as fast: floor 980 at 1 week.
   - I recommend 1.11.
2. **Grandfathering.** Should legacy saves get their Founder's Keystones free (recommended),
   or have them refunded as talent points to re-choose?
3. **Leaderboard Season 2.** Is a fresh board acceptable? The alternative is keeping one
   board where legacy floors are rebased and only the record is kept.
4. **Core pace stays out of scope.** The first Ascension is still eligible at 2–4 minutes
   of Aether. Wave 1 only gates the *first* Ascension behind subgame milestones. A future
   core study can still re-scale Aether/dust. Because nothing meaningful keys on Aether
   except the log10 S2 term, that study would no longer break the arc.
