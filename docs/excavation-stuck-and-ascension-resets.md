# Excavation "stuck / unplayable" and what Ascension should reset

Investigation of two v2.0.0/v2.1.0 playtest reports. Line numbers marked **(v2.1.0)** refer
to commit `c595d62`. The others refer to this branch.

---

## Part 1: Excavation gets stuck

### Summary

There are three independent causes. Each one alone produces "Excavation stops working":

| # | Cause | Who hits it | Severity |
|---|---|---|---|
| A | The next grid was scheduled with `setTimeout(400 ms)`. A save that landed inside that window, followed by a reload, left a grid with the stairs revealed that never regenerated. | Anyone, at random; more likely in background tabs | **Hard lock**: permanent, and nothing can fix it in-game |
| B | v1→v2 depth compression put old saves at depth 91–156 with a level-5 pickaxe and 12 drills. At that depth one tile takes **4 days** (depth 120) to **1.7 years** (depth 156). | Every playtester with a long v1 save | Effective soft-lock |
| C | Dynamite and Void Cataclysm **revealed** tiles outright, ignoring HP. They find the stairs at a fixed rate whatever the depth, so active play outruns the pickaxe without limit. Once the player stops blasting, clicks and drills can never break a tile again. Automated Leylines auto-casts Void Cataclysm, which does the same while idle. | Active players; anyone who owns Automated Leylines | Effective soft-lock |

The §5.1 curve itself is **not** a soft-lock. Pickaxe power, drills and stone income only
ever go up, and a greedy player always progresses (see the organic simulation below). The
UI was not rebuilding the grid every frame: the rebuild is keyed on `grid.blocks`
identity, and tiles use `pointerdown`. It did have a readability problem (D below).

### A. Grid regeneration on a wall-clock timer (hard lock)

- `MiningSystem.js:223` **(v2.1.0)**: on finding the stairs, `revealReward` incremented the
  depth, set `descending = true` and called `setTimeout(() => this.generateNewGrid(), 400)`.
- `descending` and the pending timer are not saved. The blocks are saved with the stairs
  already revealed and `depth` already incremented.
- After a reload, `initMiningGrid` → `migrateMiningGrid` returned early (`schema === 2`), so
  nothing regenerated the grid. The drills dug out the remaining tiles, then
  `pickDrillTarget()` returned `null`. With every tile revealed, clicks and Dynamite have
  no target either, so the grid is dead forever.
- How likely it is: autosave runs every 10 s and the window is 400 ms, so about 4% of
  stairs events sit inside a save window. In a hidden tab, Chrome throttles timers
  (to 1/min under intensive throttling), which makes the window far longer. Closing a
  background tab is the classic trigger.
- Time Warp (`main.js:224`, 300 synchronous `onSimTick(0.1)`) never let the timer fire
  inside the warp. After the first stairs, the rest of the warp's drill time was dropped
  (bounded backlog of 200 hits).

**Repro (headless):** new game → set stairs HP to 1 and `mineBlock(stairs)` →
`serialize()` → `deserialize()` into a fresh `GameState` + `MiningSystem` → give it 5 drills
→ `update(1)` × 3600. Before the fix: `depth=2 unrevealed=0 stairsRevealed=true
target=null`. After the fix: depth 22 after the same hour.
**Repro (browser, :8199):** edit the save so every block is revealed, then reload. Before
the fix the grid stays dug out forever. After the fix, a fresh 36-tile grid appears at the
same depth.

### B. Migrated v1 saves stranded at a 1e8–1e10 HP wall (soft-lock)

- `compressDepth` (`MiningSystem.js:38-41`) maps depth 3,752 → 120 and 47,000 → 156.
  The migration (`MiningSystem.js:77-91` **(v2.1.0)**) keeps pickaxe level 5 (power 32)
  and clamps drills to 12 (6 hits/s).
- §9 says compression places a v1 save "without a 1e8-HP wall". In fact `HP(120) = 6.7e7`
  and `HP(156) = 1.0e10`. For comparison, the organic §5.1 player meets that kit (L5,
  13 drills) at depth ~86, where a tile is HP 5.8e5.

Simulated one week idle, greedy shop every 15 min, v2.1.0 code:

| v1 save | v2 depth | per tile | per depth | after 1 week |
|---|---|---|---|---|
| depth 500, L5 | 91 | 1.7 h | 1.3 days | depth 97 |
| depth 3,752, L5 | 120 | **96.7 h** | **75 days** | depth 120, **1 block mined** |
| depth 47,000, L5 | 156 | **14,800 h** | **31 years** | depth 156, **0 blocks** |

### C. Explosives outrun the pickaxe (soft-lock)

- `useDynamite` (`MiningSystem.js:291-315` **(v2.1.0)**) set `revealed = true` on the 3×3
  area. Void Cataclysm (`SpellSystem.js:145-153` **(v2.1.0)**) did the same on 4 random
  tiles.
- With 36 tiles and one staircase, about 2.5 blasts find the stairs, so roughly one depth
  per minute **whatever the HP**. The Automated Leylines perk auto-casts Void Cataclysm
  whenever mana is full (`SpellSystem.js:196-199`), so this also happens while idle.
- An active player who fires Dynamite on cooldown (plus clicking and greedy shopping):

| | 1 h | 6 h |
|---|---|---|
| v2.1.0 | depth 52 | **depth 245, HP 2.6e15 vs power 1.3e5 (L17, 35 drills)**: about 37 years per tile for the drills |
| this fix | depth 35 | depth 57 (L3, 9 drills, HP 1.0e4) |
| §5.0 target (casual, no dynamite) | ~25 | ~50 |

### D. UI: HP text unreadable deep

`main.js:856,873` **(v2.1.0)** printed `hp/maxHp` in a tile about 80 px wide (about 48 px on
phones). `577,267/577,267` is 15 characters at 0.8 rem, so `overflow:hidden` clipped it to
a meaningless middle slice. The tile now shows only current HP (the bar shows the ratio;
max HP is in the stats line), with `white-space: nowrap` and a `clamp()` font size.

### Things checked and found fine

- **The curve itself.** §5.1 greedy simulation (2 clicks/s for 10 min, then idle with a shop
  check every 15 min), current code: 10 min d10 · 1 h d18 · 6 h d41 · 1 d d61 · 3 d d76 ·
  1 w d86 · 2 w d95 · 4 w d105. That is within or slightly under the §5.1 projection
  (10–14 / 22–24 / 50–53 / 74–76 / 87–94 / 98–102 / 117–122). It slows down steadily and
  never stalls. Stone sinks (Golems, transmute) can delay purchases but never reduce power
  or drills.
- **The migration running from both init and update().** It is gated on `schema`, so it is
  idempotent. A runtime import is handled.
- **Grid DOM rebuild.** Only when `grid.blocks` changes identity (once per depth), so there
  is no 60 fps innerHTML click swallow. The shop buttons are built once.
- **Ascension.** Nothing touches `miningGrid` (see Part 2), so it cannot become
  inconsistent.

### The fix

`js/systems/MiningSystem.js`

1. **Descent on sim time** (`DESCEND_DELAY = 0.4`, `revealReward` :291-295, `update`
   :406-411). The stairs set `descending` and `descendTimer`. `update(dt)` counts it down and
   generates the next grid exactly once. There is no `setTimeout`, so this works under
   Time Warp and in background tabs. While descending, `mineBlock`, Dynamite and Void
   Cataclysm ignore the spent grid; before, they paid out its tiles at the new depth's
   yields.
2. **Self-heal** (`ensurePlayableGrid` :135). On init and on every non-descending tick, a
   grid with no blocks, the wrong size, revealed stairs, or no unrevealed tiles is
   regenerated at the current depth. Existing hard-locked saves recover on load.
3. **Explosives scale with the pickaxe** (`EXPLOSIVE_HITS = 40`, `damageBlock`, `blastBlocks`
   :261, `useDynamite` :362; `SpellSystem.js` void_strike). Each affected tile takes
   `40 × pickaxe power` damage instead of being revealed outright. Shallow tiles still
   shatter. At the §5.1 pace (30–1,300 hits per tile) a blast is worth about 3× the drills'
   output over its cooldown, so explosives stay valuable but can no longer descend past the
   kit. Dynamite no longer spends its cooldown on an empty or descending grid. Text updated
   in `SpellSystem.js:44` and `index.html:266`.
4. **Schema 3 rebase** (`MINING_SCHEMA = 3`, `getTileSeconds`, `rebaseStrandedDepth` :121).
   A save whose current kit needs more than **12 h per tile** (with at least 1 hit/s) moves
   up to the deepest depth it digs in **≤ 1 h per tile**, and gets a fresh grid. `maxDepth`
   is kept, so rank, Geode Attunement, Depth Resonance and the leaderboard are unchanged.
   The 1 h target matches an organic week-1 player (~46 min per tile at d86). Organic play
   reaches ~2 h per tile at 4 weeks, far below the 12 h trigger, so healthy saves are
   untouched (tested). Results: v1 3,752 and 47,000 → depth 87 (about 0.7 days per depth),
   and 1 week later depth 94. The dynamite runaway save (245, L17, 35 drills) → depth ~154.
   A v1 depth-500 save (91, 1.7 h per tile) is not rebased.
5. **UI** (`main.js:783-784`): the depth title shows `· Record N` when the current depth is
   below `maxDepth` (rebased saves). The HP text fix is described in D.

The §5.1 constants (HP 1.15, stone 1.07, pickaxe `50·2.5^L`, drills `30·1.6^n`) are
**unchanged**.

### Tests

- `test_mining.js`, section "Regression: stuck Excavation":
  - `setTimeout` is stubbed to throw while `MiningSystem` runs.
  - Reload inside the descend window gives a fresh grid at depth 2.
  - A dug-out grid heals on the next tick.
  - The 0.4 s pause yields exactly one regeneration.
  - Clicks are ignored while descending.
  - Dynamite at depth 60 damages by `40×power` and does not descend.
  - Schema 2 → 3: a stranded save is rebased and a healthy one is untouched.
  - Verified that this block **fails on the v2.1.0 MiningSystem**.
- v1 migration assertions updated (3,752 → 120 → rebased 87, record 156).
- `test_engine.js`: Transcend re-fit test (Part 2).
- `npm test` passes and `node --check` is clean on every changed file. A browser check on
  :8199 confirmed the descent flow and the stuck-save heal, with no console errors.

---

## Part 2: Ascension

### What `PrestigeSystem.ascend` does today (`PrestigeSystem.js:85-122`)

It resets Aether, run Aether (`totalAetherEarned`), `clickPower`, combo/frenzy, and all
building counts. It consumes all Celestial Nectar. Genesis gives 15 Tappers and 1,000 gold.
It grants +3 talent points. Everything else is kept.

### Audit per subgame

| Subgame | State | On Ascend today | Consistent? |
|---|---|---|---|
| Core | aether, totalAetherEarned, buildings, clickPower | reset | yes. `clickPower` is never raised anywhere, so its reset is a no-op. |
| Clicker | comboCount, frenzyActive | reset | **was half-reset**: `comboTimer` and `frenzyTimer` survived. Harmless today, but stale. **Fixed** (both zeroed). |
| Tower | hero level, floor, maxFloor, gear, skills, Aether Forge level | kept | yes. Note the Aether Forge is paid in Aether (`CombatSystem.js:158-170`) but its level persists: a cross-run sink. |
| Excavation | depth, maxDepth, pickaxe, drills, grid, stone, gems | kept | yes. Nothing touches `miningGrid`. |
| Garden | plots, timers, golems, row seeds, seeds, essences | kept except `starNectar` = 0 | yes |
| Alchemy | `alchemy.catalysts`, ingredients | kept | yes |
| Spells | mana, cooldowns | kept | yes |
| Talents | ranks, points | kept, +3 points | yes |
| Bounties | contracts + progress, guild seals, Quartermaster | kept | yes |
| Bazaar | gold, goldenSynergy, holdings, caravan in flight | kept (+1k gold with Genesis) | yes |
| Buffs | `activeBuffs` (potions, spells, Chrono Warp) | kept | yes. A design question (below). |
| Achievements, Chrono Sand, stats | | kept | yes |

**Transcend** (`PrestigeSystem.js:146-164`) sets every perk rank to 0, but it left values
that those perks had raised above their new caps:
- Chrono Sand above the base bank (Chrono Reservoir).
- Buff durations above the base cap (Astral Crucible).
- Hero HP above max HP (Titan's Legacy). Regen only clamps upward.

The first two were silently cut on the next page load, so the result depended on whether
the player reloaded. **Fixed**: `transcend` now calls `clampLoadedTimers()` and clamps hero
HP. Covered in `test_engine.js`.

Not changed:
- Transcend calls `ascend(true)` *before* the perk reset, so Genesis still pays out on the
  Transcend itself. This looks intended: the perk says "on reset".

### Principles applied (from the design doc)

1. **Reset only the fast layer.** Ascension is a prestige on the *Aether* economy. Its dust
   is computed from run Aether alone (`getBaseCosmicDust`). The subgames feed dust through
   their own visible multipliers: Geode Attunement on `maxDepth`, and Nectar Offering
   (§5.3, §8 #6).
2. **Match the reset to the curve's time scale.** §5.0 calibrates Excavation and Garden in
   hours to weeks (depth 25 at 1 h, 100 at 1 w; garden ladder over day 1). First ascension
   is available after about **1 minute** (§3.1, §10 Q3). Anything reset on Ascension must be
   rebuildable within one run. Otherwise the subgame collapses to its first hour forever,
   and the dust links reward nothing.
3. **Consumables feed the prestige once.** Spend-on-Ascend works for a stockpile whose only
   purpose is the dust link (Nectar). It does not work for a resource that buys long-term
   power (stone, gold, essences).
4. **No hidden reset.** Whatever resets is listed in the Ascend confirm. Anything kept that
   is capped by a perk must be re-fitted when the perk goes away (Transcend).

### Recommendation (not implemented; design decision)

| Subgame / state | On Ascension | Rule | Why |
|---|---|---|---|
| Aether, run Aether, buildings, click/combo/frenzy | **Reset** (as today) | to 0; Genesis → 15 Tappers | This is the prestige layer that dust is computed from |
| Timed buffs (`aether_mult`, `click_mult`, `click_gold`) | **Reset** | remove buffs whose `type` multiplies Aether or clicks. Keep `gold_mult`, combat and `time_speed` buffs. | Stops stacking Celestial + potions right before Ascend to fast-start the next run. Buffs are capped at 10 min, so the loss is small. |
| Tower: floor, maxFloor, gear, level, Forge | **Persist** | none | Floors are the Market Index (§5.5) and boss counts feed Dungeon Mastery; a reset would re-price the Bazaar every minute |
| Excavation: depth, maxDepth, pickaxe, drills, stone, gems | **Persist** | none | A month-long curve (§5.1) cannot fit in a 1-minute run. `maxDepth` *is* the dust link (Geode). |
| Garden: plots, golems, seeds, essences | **Persist** | none | Ladder over day 1 (§5.2) |
| Celestial Nectar | **Consume** (as today) | set to 0 | It is the Nectar Offering stake (§5.3) |
| Alchemy: catalysts | **Persist** | none | Linearised permanent category, ×1.76 at 1 w (§7) |
| Spells: mana, cooldowns | **Persist** | none | Short timers; resetting them is a free Astral Renewal |
| Talents: ranks, unspent points | **Persist**, but **gate the +3** | grant +3 only when `pending dust ≥ 2 × last ascension's dust` (or once per real hour) | With ascension at ~1 min, +3 per Ascend is a talent-point farm |
| Bounties, Seals, Quartermaster | **Persist** | none | Long-term meta layer |
| Bazaar: gold, Enchanter, holdings, caravan | **Persist** | none | Index-priced and capped (§5.5). Gold is not the prestige currency. |
| Chrono Sand, achievements, stats | **Persist** | none | |
| **Transcend** | reset ascension layer + re-fit perk caps | as fixed here | Principle 4 |

Revisit this when the core study (§10 Q3) moves first ascension to 30–60 min. At that
point a *partial* Excavation reset (current depth back to `max(1, maxDepth − 25)`, keeping
the pickaxe, drills and `maxDepth`) becomes a viable "re-dig" loop. At a 1-minute ascension
it is not.

### Open questions

1. Is `EXPLOSIVE_HITS = 40` acceptable, rather than keeping instant reveals? The
   alternative is to keep reveals and re-run the rebase whenever HP outruns the kit, but
   that leaves the depth unbounded for active players.
2. Rebase thresholds (stuck > 12 h per tile, target 1 h per tile): do you want a gentler
   landing (10 min per tile ≈ depth 74 for an L5 v1 save), or a goodwill stone refund
   (§9 suggested `30·1.6^12`)?
3. Should timed Aether/click buffs be cleared on Ascend, and should the +3 talent points be
   gated?
4. The Aether Forge is paid in Aether but persists across runs. Is that intended?
