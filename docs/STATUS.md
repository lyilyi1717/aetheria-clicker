# Status

Progress log for the year-one redesign (`docs/redesign-proposal.md`). Every session reads this
first and updates it before finishing (see `AGENTS.md`).

Roadmap items are called **R0–R21**. GitHub numbers issues separately, so R*n* is issue #*n*+2
(R0–R20); R21 is #42.
Owner decisions live in issue #23; if it has no answer, use the default listed there.

## In progress

- R4 #6 Transcend rework (PR #35).
- R21 #42 UI/UX review, style guide and mockups.

## Next up

Ready now: R9 #11 (after R4 merges: both edit `PrestigeSystem.js` / `GameState.js`), R11 #13.
After R4: R5 #7 (+ R3 #5, held per #23 default 5 to ship with R5), R6 #8, R13 #15.
Then R10 #12 (needs R9), R14 #16 (needs R11), R7 #9 (needs R6), R15 #17 (needs R13),
R20 #22 (needs R4, R13).

## Plan

| Wave | Item | Issue | Depends on |
|---|---|---|---|
| 0 | R0 Save versioning and migrations | #2 | – |
| 1 | R1 Dust multiplier reads lifetime dust | #3 | – |
| 1 | R2 Dust exponent 0.25 → 1/3 | #4 | – |
| 1 | R3 Active income ~2× idle | #5 | (merge close to R5) |
| 1 | R12 Offline cap and modal | #14 | – |
| 2 | R4 Transcend rework | #6 | R0, R1, R2 |
| 3 | R5 Upgrade shop | #7 | R4 |
| 3 | R6 Dust shop of features | #8 | R0, R4, R21 |
| 4 | R7 Progressive unlocking | #9 | R6, R21 |
| 4 | R8 Void Tower rebalance | #10 | – |
| 4 | R9 Talent economy | #11 | R0 |
| 4 | R10 Contract board | #12 | R9, R21 |
| 4 | R11 Reward feedback system | #13 | – |
| 5 | R13 Shard tree | #15 | R4, R21 |
| 5 | R14 Codex 2.0 | #16 | R11 |
| 5 | R15 Daily and weekly structure | #17 | R13, R21 |
| 5 | R16 Bazaar prices and caravans | #18 | – |
| 5 | R17 Garden breeding and recipes | #19 | – |
| 5 | R18 Wardens, relics, ore, polishing | #20 | R8 |
| 5 | R19 Leaderboard Season 2 | #21 | R8 |
| 5 | R20 Chronicle layer | #22 | R4, R13, R21 |
| 4 | R21 UI/UX review, style guide, mockups | #42 | – (blocks UI of R6, R7, R10, R13, R15, R20) |

## Done

- Redesign proposal written (`docs/redesign-proposal.md`).
- Project setup: `AGENTS.md`, `CLAUDE.md`, this file, `sim/core-pacing.mjs` (`npm run sim`),
  CI checks (`.github/workflows/checks.yml`), issues #2–#23.
- R0 #2 Save versioning: `js/engine/migrations.js` holds the ordered `MIGRATIONS` chain;
  `GameState.deserialize` (and so save import) runs `migrateSave`. Tests in `test_saves.js`.
- R1 #3 Dust multiplier is `1 + 0.02 * totalCosmicDust` (`GameState.getDustMultiplier()`); the
  Transcend confirm uses `PrestigeSystem.getTranscendPreview()` (R4 should replace it). The sim
  now Ascends when pending dust >= lifetime dust.
- R8 #10 Tower: gear 1.11 (`gearFloorScale`), bosses x400 / 45 s, `hero.indexFloor` prices the
  Bazaar while `hero.maxFloor` stays the record. Save v3: `migrations.js` step 3 shrinks gear,
  `CombatSystem.rebaseLegacyFloor` moves the hero to what the kit clears (saves from ~6k+ land
  near floor 5.5k). `npm run sim:tower` reports Tower pacing.
- R2 #4 Dust exponent 1/3 (`DUST_EXPONENT`); Ascend needs a 10-min run (`GameState.runStartedAt`,
  `PrestigeSystem.getMinRunRemaining`), shown on the button. The sim calls `ascend(true)`.
- R12 #14 Offline Aether in bands (`computeOfflineBands` in `SaveManager.js`): 100% for 8 h, 50% to
  24 h, then 0; each Chrono Reservoir rank adds 4 h to both. Modal in `js/ui/offlineModal.js`.
- R16 #18 Bazaar: log-space mean reversion, 5% buy/sell spread, stock cap `floor(300/basePrice)`
  (Amber/Crystal Garden-only), caravan cargo (opt-in checkbox). Constants at the top of
  `MarketSystem.js`.
- R18 #20 Wardens every 250 floors (x3 boss HP, 60 s, trophy +2% Tower gold, challenge passed
  Wardens without moving the climb), Strata Relics (1/200, pity 400, +5% pickaxe), Aether Ore (10%
  of stone tiles into `market.items.ore`), Gem Polishing 5:1. UI in `js/ui/wardens-relics.js`.
- R19 #21 Leaderboard Season 2: `supabase/leaderboard_season2.sql` adds `leaderboard_season` and
  freezes Season 1; the client ranks `getIndexFloor(hero)` and stays on Season 1 until the SQL is
  run. **Owner action pending:** run that file in the Supabase SQL editor (steps in PR #34).
- Tooling: `npm test` runs every `test_*.js` via `run_tests.mjs` (no `package.json` edit needed;
  `npm test -- tower` runs a subset).
- R17 #19 Garden breeding (`GardenSystem.breedPlots`, `HYBRIDS`), golden mutation 1%, 6
  `HYBRID_RECIPES` with discovery in `AlchemySystem`; UI in `js/ui/garden.js`.

## Notes for the next session

- Save format changes: add a step to `MIGRATIONS` in `js/engine/migrations.js` and an old-shape
  fixture to `test_saves.js`. Current `SAVE_VERSION` is 3 (R8).
- Pacing baseline (today's game, casual profile): first Ascension 10 min, 12 Ascensions on day 0,
  16 in the whole year, longest stretch with no reset 139 days. `npm run sim:check` fails on
  purpose until R4; CI only reports it for now. After R1 the casual longest gap is 189 days
  (the sim's Ascend rule changed, not the game).
- First-Transcend stand-ins for shard-tree unlocks (R13 should switch them to tree nodes):
  `GardenSystem.isBreedingUnlocked()` (`garden.breedingUnlocked`) and
  `CombatSystem.isWardensUnlocked()` (`hero.wardensUnlocked`).
- R14 Codex: Warden trophies (`hero.wardens.defeated`) and relics (`miningGrid.relics`) are ready
  to show as collections. Add `codex_pct` / `seals_lit` columns to `leaderboard_season` when R14 /
  R15 ship (with a ceiling in `leaderboard_season_guard`).
- After R2 the casual longest gap is 156 days; R4 is expected to switch CI to `sim:check`.

## Noticed (not yet an issue)

- Save import merges into the running state: `deserialize` spreads `inventory`, `stats` and
  `settings` over the current values, so keys the imported save lacks keep the old game's values.
- Mining still runs its own schema-gated migration (`MiningSystem.migrateMiningGrid`,
  `miningGrid.schema`) outside the `MIGRATIONS` chain. It works; folding it in is optional.
- Midas click gold (`ClickerSystem`) still scales 1.15^floor on the current floor, and bounty gold
  scales with the current floor; neither follows the R8 curves.
- The app shell's fixed 220px sidebar doesn't collapse at phone width (~65px content column at
  375px), so every tab is cramped on phones. Pre-existing; worth its own issue.
- The Transcend shard payout still reads `totalCosmicDust / 1e4` (R4 replaces it).
- The Chrono Reservoir perk text (`PrestigeSystem.js` perk list, `tabBonuses.js`) only mentions the
  Sand bank; since R12 it also extends offline Aether bands by 4 h per rank. Reword with R4/R6.
- A brand-new account carrying a rebased legacy save shows floor <= 1,000 + 1,000/h on Season 2
  for its first hours (R19 guard ceiling); old anonymous accounts can still post forged floors.
