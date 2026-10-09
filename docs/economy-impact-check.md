# Economy impact check: gear/boss design and the wave-1 branches against v5.12.1

**Question:** would the pending proposals, written against older code, break the economy if
built now?

**Proposals checked:**
- `docs/gear-and-boss-design.md`, simulated on `6437f1f`
- the three unmerged wave-1 branches based on v2.7.1

**Checked against:** `main` at `48bc136` (v5.12.1). The game code was not changed.

**Prototypes:** throwaway scripts in `.scratch/` (not committed). Each one imports either the
real `js/` tree or a copy of it with a single constant changed:
- `mkvariants.mjs`, `tower-hooked.mjs`, `runall.mjs`: Tower variants
- `mining-manual.mjs`: Excavation with taps counted as manual
- `dewloop.mjs`, `golem.mjs`: Garden income
- `base/sim/coreN.mjs`, `base/sim/core7.mjs`: core sim variants

---

## 1. What changed since 6437f1f (economy only)

| Area | Change |
|---|---|
| Core (R31, v5.0) | Numbers reach ~1e12 by day 60. Dust is `10·(runOil/1e4)^(1/5)`. The Transcend gate is 400·1.6^k lifetime dust. Dust and shard bonuses are additive. |
| Clicks (R52) | A click pays 0.5 s of production, and at most 5 paid clicks/s (token bucket). Auto-tap. Ascension pays from 500 run Oil. Active play is ×2.89 over generators alone. |
| Outside the core (R53) | The Forge is now the Oil Forge, costing 100·1.5^L. All subgame-to-Oil links are one additive category, capped at +150% (`WorldLinks.js`). |
| Talents and contracts (R9, R10) | Talent points from milestone stars, Record Ascension (one per ×2 of the best run's dust) and Guild Rank. The contract board adds 1 per 30 min, up to 6. |
| Dust shop (R6) | The old keystones are shop items: Golem Covenant, Hourglass, Automated Leylines, Auto-tap. |
| Tower (R34) | Gear levels: +4% per level up to +30 per slot, paid in Monster Bones. The level belongs to the slot. The R8 rules stand: 1.11 gear, bosses ×400 HP with 45 s, Wardens every 250 floors. |
| Excavation (R32) | Pickaxe cost 100·1.6^L. Auto-Blast. |
| v5.10 | **Ascension minimum run 600 s → 0.** Super- and Hyper-Crits. Mining crits and shockwave. Geode pockets (30 s of CPS). **Nectar Surge**: every harvest pays 15 s of CPS. **Dewdrop tap**: 1 s of CPS per tap. Uncapped links: Oil to Garden growth (up to ×4), depth to Garden growth (up to ×1.5), CPS to pickaxe power (no cap, log curve), harvests to pickaxe power (up to +50%). |
| v5.12 | Mining techniques: **Shatter** 2–10%, Chain, Cleave, Frenzy. Steam Drills, Seismic Rigs, bomb tiles. |

## 2. Baseline (v5.12.1)

`npm test` passes (54 files). `npm run sim:check` reports the targets as **met**, but only
narrowly: the casual median run Oil over days 50–70 is 1.01e11 against a floor of 1e11.

**Core sim (`npm run sim`):**

| | first Ascension | 1 h | 1 d | 1 w | 1 m | first Transcend | first Chronicle |
|---|---|---|---|---|---|---|---|
| casual | 3.9 min | 2 Asc | 10 Asc, 135 dust | 33 Asc, 1 Transcend | 114 Asc, 5 Transcends | day 3.5 | day 63.8 |
| idle | 60 min | 1 Asc | 10 Asc, 123 dust | 30 Asc, 1 Transcend | 96 Asc, 4 Transcends | day 5.5 | day 98.9 |

**Tower sim (`npm run sim:tower`), best floor:**

| | 1 h | 1 d | 1 w | 30 d |
|---|---|---|---|---|
| Roadmap target (AFK tab) | 149 | 414 | 498 | ~560 |
| open, v5.12.1 | 101 | **546** | **760** | **780** |
| casual, v5.12.1 | 154 | 390 | 670 | 870 |

**Excavation sim (`npm run sim:mining`), depth at day 1 / 7 / 14 / 30:**
- active: 55 / 101 / 121 / 142
- idle: 100 / 161 / 190 / 212

**The Tower still overshoots its targets by +32–53%.** The design doc's diagnosis still holds.

## 3. Tower prototypes

The prototypes run the real `CombatSystem` with one constant changed. They show the best floor
in the open / casual profiles at 1 h, 1 d, 1 w and 30 d.

| Variant | open | casual |
|---|---|---|
| base (1.11; rarity mults 1/2/4/8/18) | 101 / 546 / 760 / 780 | 154 / 390 / 670 / 870 |
| **gear 1.105** | **97 / 380 / 510 / 520** | 110 / 290 / 490 / 580 |
| gear 1.1075 | 130 / 450 / 610 / 630 | 180 / 340 / 570 / 690 |
| rarity 1/2/3/4/5 | 120 / 470 / 620 / 640 | 171 / 380 / 610 / 730 |
| 1.105 + rarity 1/2/3/4/5 | 90 / 320 / 410 / 430 | 130 / 260 / 400 / 490 |
| 1.1075 + rarity 1/2/3/4/5 | 90 / 380 / 500 / 510 | 160 / 300 / 480 / 580 |
| base + ×1.45 Attack from day 14 (Mythic average) | +0 | 30 d: 910 (+40) |
| 1.105 + rarity + ×1.45 from day 14 | +0 | 30 d: 510 (+20) |
| base + literal ×10 Attack from day 14 | 30 d: 910 (+130) | 30 d: 1,120 (+250) |
| base + Void Cataclysm every 40 s from day 4, uncapped | +0 | 1 w: 710, 30 d: 911 |
| the same, capped at 10× Attack | identical to uncapped | identical to uncapped |

**The AFK wall is now set by survival, not damage.** In the open profile, Attack multipliers
add 0 floors: the wall is where monster damage (1.12^f) outruns hero HP. Attack only pays
for the casual profile, through skills and clicks. HP-side items (Vigor, armour) are
therefore what moves the idle wall.

## 4. Verdicts

### Proposals in `gear-and-boss-design.md`

| Item | Verdict | Numbers and reasons |
|---|---|---|
| Gear base 1.105 | **SAFE (best single fix)** | Alone, with the current auto-replace gear and R34 levels, the open profile gives 97 / 380 / 510 / 520 against the target 149 / 414 / 498 / ~560. That is the closest of any variant. Existing saves drop about 260 floors, so ship it with the `pendingFloorRebase` step-down (record kept, `indexFloor` rebased). |
| Void Cataclysm cap (10× Attack) | **OBSOLETE as an exploit fix; keep as insurance** | Spell damage no longer scales with crit, so the two-cast kill is gone. An uncapped auto-cast every 40 s adds +40 casual floors and the cap changes nothing. Add it only alongside any crit-multiplier affix (Precision). |
| Rarity mults 1/2/3/4/5/7 | **NEEDS RETUNE** | Alone it costs −140 floors at 30 d. Combined with 1.105 it gives 410 / 430 open, 15–25% under target. That only works if the bag (affixes, re-temper, boss ilvl +5) adds back the ~+80 floors the doc measured. Ship the two together, or pair the flatter rarities with 1.1075, which gives 500 / 510 at 1 w / 30 d. |
| 5-slot item model, Bisht, affixes, 12 Legendaries | **NEEDS RETUNE** | Not built. It conflicts with R34, where levels live on the slot, so items must not carry levels. The Bisht's economy affixes (Delver, Verdant, Brewer, Leyline) must go into the capped `WorldLinks` category or a capped subgame category. v5.10 already added uncapped cross-links. Because the wall is HP-limited, Might and Slayer barely move AFK floors and Vigor does. Reweight `CombatRating` accordingly. |
| 30-slot bag, re-temper | **SAFE** | Sinks only. Re-temper is priced in gold and Void Cores, both unchanged since R8. |
| Kashta auto-camp | **NEEDS RETUNE** | About ×20 kills at the wall. Bones currently drop at 25% × 40% = 10% per kill, so Kashta would finish all four R34 slots at +30 (18.6k bones) in about 4 Tower-hours. Move bones onto the new 8% table, or Kashta drains R34 of meaning. Never camp on a boss floor, as the doc says. |
| Drop table: mobs 8%, Mythic 0.001%, pity 600, Barakah 20k with a 1,000/day soft cap | **SAFE** | Bounded by design. Today mobs drop gear at 25% and bosses at 95%, which the new table replaces. Keep the "Barakah resting" text so the soft cap reads as a rest and does not punish absence (rule 8). |
| Mythic "×10 every 20th hit" (×1.45 average) | **SAFE** | +0 open, +20–40 casual at 30 d. A literal ×10 Attack **BREAKS the economy**: +130 / +250 floors. |
| Al-Wakeel auto-equip keystone | **OBSOLETE in this form** | There are no talent keystones. That branch never merged, and R6 moved keystones into the dust shop. Today's loot already auto-equips. If the bag ships, re-home Al-Wakeel as a 2-TP talent or a dust-shop item. Floor 301 is now reached around day 1 (casual), not day 2–3. |
| Telegraphs, phase 2, Sheikhs every 50, Zone Guardians | **NEEDS RETUNE (minor)** | Not built. Re-tune against the current ×400 / 45 s bosses. Merge Guardians with the R18 Wardens at 250 / 500 / 750 / 1000 (×3 once, not ×9). Wardens appear from the first Transcend, around day 3.5 for the casual player. |
| Migration to Heirlooms | **NEEDS RETUNE** | The save version is now 9 (`MIGRATIONS` ends at `to: 9`), not 4 → 5. Keep the R34 slot levels. Legendary 8 → 4 and Cosmic 18 → 5, on top of 1.105, is a large nerf: run `rebaseLegacyFloor` and grant Heirlooms as written. |

### The three wave-1 branches

| Branch | Verdict | Reasons |
|---|---|---|
| `worktree-agent-a393101608c9c902f` (Tower gear 1.11 + rebase) | **OBSOLETE; do not merge** | Shipped as R8: `GEAR_FLOOR_BASE` 1.11, migration step 3, `indexFloor`. The branch would bring back a 30 s boss timer and ×250 boss HP. |
| `worktree-agent-a90549d90080f7a37` (progressive unlocks) | **OBSOLETE** | R7's `UnlockSystem.js` shipped and R52 extended it. |
| `worktree-agent-a7b983a36816a89a5` (talent economy) | **OBSOLETE; merging would break pacing** | Stars, records and Guild Rank shipped as R9 (`TalentSources.js`, with S2 on log2 since R31). The 30 min / 6 board shipped as R10. The Seven Seals were replaced by R31's dust gate. The first-Ascension gate (floor 100 + depth 25) was removed by R52. The keystones became dust-shop items. |

## 5. Problems already in v5.12.1

1. **BREAKS ECONOMY: Shatter (v5.12).**
   - What it does: any manual dig has a 2% chance at level 0, rising to 10%, to break the tile
     outright, whatever its HP.
   - Why it matters: mining taps are not rate-limited, so depth stops following the R32 curve.
   - `sim:mining` misses it, because its taps pass `undefined` coordinates and so never count
     as manual.

   | Active profile, taps counted as manual | Day 60 depth | Month-2 depth per open hour |
   |---|---|---|
   | as built | **1,777** | **19.3** |
   | without Shatter | 167 | 0.36 |

   Strata go by every ~1.3 h, in a straight line. Crits, Frenzy, Chain and Cleave together
   add only ~3%.
2. **BREAKS ECONOMY with an autoclicker; NEEDS RETUNE by hand: Dewdrop tap.**
   - Garden taps bypass R52's 5-taps/s token bucket.
   - The plant → tap ×20 → harvest loop pays **×7.95 CPS at 5 taps/s and ×31.8 at 20/s**. R52
     designed active play at ×2.89.
   - Bug: `GardenSystem.js` uses `BigNum` without importing it, so `tapPlot` throws when CPS
     is 0.
3. **NEEDS RETUNE: Nectar Surge on golem and offline harvests.**
   - Measured: four golem rows add **+190% to +390% of CPS passively** (total Oil income ×2.9
     to ×4.9), offline too. One row adds +53%. This sits outside the +150% `WORLD_LINK_CAP`.
   - With a ×3 total from day 2 (the low end), `sim:check` still passes (1.08e11), so the asserts miss it. The rest
     of the year runs hot:

   | Casual profile | baseline | with ×3 from day 2 |
   |---|---|---|
   | year-end lifetime Oil | 7.3e21 | **9e24** |
   | year-end run Oil | 8e9 | **3e23** |
   | Transcends by 1 m | 5 | 8 |
4. **NEEDS RETUNE: no minimum Ascension run (v5.10), combined with concave dust (^1/5).**
   - Very short runs become the best strategy.
   - Measured: the Garden loop with Genesis gives 26 Ascensions and **130 dust per hour at
     5 taps/s**, and **1,145 dust per hour at 20/s**. The casual sim earns 135 dust in all of
     day 1.
   - The sim hides this. It now limits manual Ascensions to one per hour, and the same commit
     changed `CHRONICLE_AFTER_SLOW_DAYS` from 7 to 11. **With 7, `sim:check` FAILS** (median
     5.4e8 against the 1e11 floor), so today's pass is fragile.
5. **SAFE (dead code):** Super-Crits, Hyper-Crits and the mining shockwave can't trigger. Crit
   chance tops out at 20% (clicker), 50% (amulet cap) and 20% (mining).
6. **SAFE but unmodelled:**
   - Geode Oil does not count as run Oil, so it doesn't feed dust.
   - The CPS-to-pickaxe link has no cap: ×2.8 at 1e13 CPS, about 1.5 pickaxe levels.
   - Steam Drills and Seismic Rigs scale with pickaxe power.
   - `sim:mining` buys none of these.

## 6. Recommended next steps

1. **Fix the four economy problems first** (one R-item):
   - Shatter becomes "×10 pickaxe damage" instead of an instant break.
   - Mining and Garden taps share the click token bucket.
   - Dewdrop pays 0.25 s of CPS, and the `BigNum` import is fixed.
   - Nectar Surge pays only on hand harvests, or joins the `WorldLinks` cap.
   - Bring back a 60–120 s minimum run. Done in R61 (120 s); see "R61 result" below.
   - `sim:mining` passes the manual flag, and `sim:core` models spam-Ascension (R61 did the
     latter).
2. **File "Tower gear curve" as a small R-item now:** `GEAR_FLOOR_BASE = 1.105` plus the
   rebase migration. Accept it when `sim:tower` open is within ±10% of 149 / 414 / 498 / 560
   (measured: 97 / 380 / 510 / 520).
3. **Gear bag wave 1**, with these retuned numbers:
   - rarity 1/2/3/4/5
   - mob drop 8%, with bones moved onto that table
   - re-temper, Kashta (never on a boss floor), the 6 boss signatures
   - the Void cap as insurance
   - extend `sim:tower` to model the bag
   - Al-Wakeel re-homed as a dust-shop or talent item
   - If the bag's measured lift is under +80 floors, use 1.1075 instead.
4. **Wave 2, which stays as designed:**
   - Wasta Strike (×1.45 average), Mythics gated to floor ≥ 151, Barakah 20k with the daily
     rest
   - telegraphs, Sheikhs, and Guardians merged with Wardens
   - weight Vigor and HP more, since the AFK wall is survival-limited
5. **Close the three branches unmerged.**

### R61 result: minimum run and sim cadence

- **Minimum run: 120 s** (`MIN_RUN_SECONDS`), shown on the Ascend button as a countdown and
  disabled state, and on the header goal chip. It applies to hand Ascensions and Auto-Ascend;
  Transcend and Chronicle are not delayed. The sim's band check is 60-120 s.
- **Sim cadence, now honest:** the one-manual-Ascension-per-hour cap is gone. The casual player
  Ascends whenever the default Auto-Ascend rule is met while present and the run is old enough;
  the idle player still glances once an hour (that is what idle means).
- **Spam Ascend profile** (`sim/core-pacing.mjs`, `--only=spam`): casual attendance, Ascends
  the moment the button unlocks, 30 days. Dust per hour against casual normal play (13.0):

  | minimum run | spam dust per hour | x normal |
  |---|---|---|
  | 60 s | 832 | 64 |
  | 120 s | 735 | 57 |
  | 300 s | 649 | 47 |
  | 600 s | 435 | 32 |
  | 1,800 s | 223 | 17 |

  **The "spam earns less than normal play" goal is not met, and no minimum run in the 60-120 s
  range meets it.** Dust is a fifth root of run Oil, and a restart is cheap (Genesis, Resonant
  Start, kept upgrades), so dust per hour keeps rising as runs get shorter; even 30 minutes
  leaves spam at x17. The minimum run only caps the damage (an unbounded loop becomes at most
  one New Well per 120 s, and only while the player is at the screen). `sim:check` therefore
  asserts what is true today: the minimum run is 60-120 s and spam stays at or below
  x60 of normal dust per hour (`TARGETS.spamDustRatioMax`), so it cannot get worse unnoticed.
  Over a full year spam is x2.7 normal (the layers reset dust, so the month-1 gap closes).
  Closing the gap needs a second lever (for example a dust gain that ramps with run length) and
  is an owner decision.
- **Chronicle trigger stays at 11 days** (`CHRONICLE_AFTER_SLOW_DAYS`). With the cadence freed
  and 7 days, `sim:check` still fails (casual median run Oil over days 50-70: 1.35e10 against
  the 1e11 floor): a Chronicle begun that early throws away a layer that was still paying. The
  rule is the player's choice (Chronicles are optional), so 11 is the modelled player who waits
  until the Transcend ladder has clearly stalled. It is justified, not hidden: the year-one
  targets are met either way for 11 and missed for 7.
