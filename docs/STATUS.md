# Status

Progress log for the year-one redesign (`docs/redesign-proposal.md`). Every session reads this
first and updates it before finishing (see `AGENTS.md`).

Roadmap items are called **R0–R40**. R0–R20 are the design doc's §9 roadmap; R21 onward came
later (UI review, player feedback) and live only as issues. GitHub numbers issues separately: the
Plan table below maps every R-number to its issue.
Owner decisions live in issue #23; if it has no answer, use the default listed there.

## In progress


## Next up

R0–R25 are all done. Next by the AGENTS.md rule: **R26 #62**.

- Ready now: R26, R27, R28, R29, R30, R31, R33, R34, R35, R38, R40.
- Safe to run side by side (no shared files): R26, R28, R30, R33, R38. Overlaps to avoid:
  R26 + R27 (`main.js`), R27 + R34 (`CombatSystem.js`), R29 + R35 (CSS and tokens).
- Blocked: R32 (R26), R36 (R27), R37 (R27, R36), R39's shared part (R37, R38; the local-only
  ticker can ship first). R31 asks to go after R28 and R32, which also move income.
- Need the owner first (`decision` label): R36 names, R38 Google provider and SQL, R40 submit path.
- Chapter 2 of the Chronicle is one more `CHAPTERS` entry (no issue yet).

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
| 4 | R7 Progressive unlocking | #9 | R6, R21, R23 |
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
| 4 | R22 Design tokens and base components (UI-2) | #45 | R21 |
| 4 | R23 Responsive app shell (UI-1) | #46 | R22 |
| 4 | R24 Reduced motion and touch tooltips (UI-3) | #47 | R22 (best after R23) |
| 5 | R25 Reward toasts clear the buff bar | #61 | – |
| 6 | R26 Dynamite blast lands outside the grid (bug) | #62 | – |
| 6 | R27 Naming cleanup, remove the "Mutawa" boss (bug) | #63 | – |
| 6 | R28 Frenzy every 20 combo clicks | #64 | – (coordinate with R3) |
| 6 | R29 Clicker layout scales, bigger fonts | #65 | – |
| 6 | R30 Friendly number notation (aa, ab, …) | #66 | – |
| 6 | R31 Slower number growth (~1e12 at day 60) | #67 | – (after R28, R32) |
| 6 | R32 Excavation pacing and Auto-Blast | #68 | R26 |
| 6 | R33 Weekly Ledger goals take the week | #69 | – |
| 6 | R34 Weapon and equipment levels | #70 | – |
| 6 | R35 Switchable themes | #71 | – |
| 7 | R36 Oil re-theme and new prestige names | #72 | R27 (owner names) |
| 7 | R37 Arabic version (RTL) | #73 | R27, R36 |
| 6 | R38 Player accounts and cloud save | #74 | – (owner enables Google) |
| 7 | R39 News ticker | #75 | R37, R38 (shared part only) |
| 6 | R40 Community Bugs & Features tab | #76 | – (owner picks submit path) |

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
- R4 #6 Transcend rework: gate `1e9 x 10^k` dust of the layer, 2 shards per Transcend, each x1.5
  Aether and x1.5 dust (`totalFractureShards`; `fractureShards` is the spendable balance for the
  shard tree), tiers 15-30 generated in `BuildingSystem.js` (one per Transcend), panel in
  `js/ui/prestige.js`. Save v4 refunds old Transcends. #23 default 2 (x30 gate growth) is built but
  off (`TRANSCEND_SLOW_FROM = Infinity`): every x30 variant stalled layer 2 sooner in the sim.
  CI runs `sim:check` (blocking); `gapWindowEndDay` is 180 until R20 restores 270.
- R11 #13 Reward feedback: `rewards.notify({ tier, kind, title, amount, ... })` in
  `js/ui/rewards.js`; queue rules in `js/ui/rewardQueue.js` (same `kind` merges, one big ceremony
  per 60 s, hidden tab / warp batches into "N x ... while you were away"); tier sounds in
  `AudioEngine.playTier`. Ascension = big ceremony, Transcend = epic; `ascend(true)` (Transcend's
  internal call) shows none.
- R17 #19 Garden breeding (`GardenSystem.breedPlots`, `HYBRIDS`), golden mutation 1%, 6
  `HYBRID_RECIPES` with discovery in `AlchemySystem`; UI in `js/ui/garden.js`.
- R21 #42 UI review (`docs/ui-review.md`, 17 ranked findings + follow-ups UI-1..UI-3 ready to
  file), style guide (`docs/ui-style-guide.md`, paste-ready tokens), mockups in
  `docs/ui/mockups/` (shell, components, R6, R7, R10, R13, R15, R20) and screenshots of every tab
  in `docs/ui/screenshots/`. AGENTS.md rule 7 now points UI work at both.
- R22 #45 Design tokens and base components: `css/tokens.css` (style guide §2.1, linked first),
  `css/components.css` (`.btn*`, `.card`, `.card-row`, `.chip`, `.bar`, `.segs`, `.num`,
  `.rarity`, `.gear`). Old `--accent-*` / `--text-*` / `--bg-*` names alias the tokens in
  `style.css`. Inter is the UI font. Generators, talents and gear use the components; gear
  rarity markup comes from `js/ui/rarity.js`.
- R23 #46 Responsive app shell: one-row 56px header (hero currency per tab, then Aether/Gold/Dust;
  Mana/Sand/Seals only where used; "next goal" chip), grouped 220px sidebar, 64px icon rail at
  640–1023px, bottom bar + More sheet under 640px. `js/ui/shell.js` (helpers tested in
  `test_r23_shell.js`); guides open once per tab (`settings.guidesSeen`; old saves get
  `{ all: true }`). Art panels on Dig / Ascension / Bazaar removed; screenshots in
  `docs/ui/screenshots/r23/`.
- R6 #8 Dust shop (`js/systems/DustShopSystem.js`, panel `js/ui/dustShop.js` on the Ascension
  tab, `css/dust-shop.css`): the 13 items of §6.2, tiers by Ascension count, Transcend empties it.
  Save v5 keeps 5 old perks as owned items and refunds Eternal Resonance / Singularity Tap into
  spendable dust. Resonant Start gives generators 1-10 only (all unlocked tiers broke
  `sim:check`, all 14 made Transcend storms after a Chronicle; numbers in §6.2 notes). A Chronicle
  empties the shop like a Transcend. Tests in `test_dust_shop.js`.
- R24 #47 Reduced motion and touch tooltips: Settings → Reduce Motion (`settings.reduceMotion`
  auto/on/off, `js/ui/motion.js` sets `data-motion` on `<html>`); particles, shake, orb spin,
  background dust, count-ups and ceremonies follow it. "Ready" pulses run 3 times. Tooltips moved
  to `js/ui/tooltip.js`: bonus chips, gear and buff chips open a bottom sheet on tap. Tests in
  `test_r24_motion.js`; screenshots in `docs/ui/screenshots/r24/`.
- R20 #22 Chronicle (layer 3): `js/systems/ChronicleSystem.js` (gate, Pages x1.4 Aether each,
  Page upgrades, challenge runner, `CHAPTERS` data with Chapter 1 Sand), UI in
  `js/ui/chronicle.js` + `css/chronicle.css`, tests in `test_chronicle.js`. Rule overrides are
  never stored: hooks call `getActiveRules(gs)` (Building tiers, click combo/Frenzy, spells,
  pickaxe, Aether). A challenge stashes the run (incl. shop upgrades) in `chronicle.active`.
  Gate: 12 Transcends + Seal set I, or 24 Transcends for the first Chronicle without the Seals
  (`CalendarSystem.getSealSetProgress`). Sim (after R3): `gapWindowEndDay` 270, resets every <=14 days to
  day 365. Notes in doc §6.6. No save migration (additive `chronicle` field).
- R7 #9 Progressive unlocking: table + checks in `js/systems/UnlockSystem.js` (`gs.unlocks`,
  `gs.unlockSeen`, `gs.isTabUnlocked`), nav/teaser/reveal in `js/ui/unlocks.js` + `css/unlocks.css`;
  `switchTab` refuses locked tabs, the Tower only ticks once open, Ledger goals carry a `tab`.
  Save v6 seeds unlocks from use (any prestige opens all). Ascension opens on pending dust, not
  floor 100 + depth 25 (sim target); deviations and unbuilt gifts listed in roadmap §2.2 "As built".
  Tests in `test_unlocks.js`, `test_saves.js`; screenshots in `docs/ui/screenshots/r7/`.

- R3 #5 Active income: Burst 45 s / cd 45 s, Celestial x2.5, Supernova 180 s, Mirage (1/12) and
  Caravan Star (1/20) anomalies (constants at the top of `SpellSystem.js` / `ClickerSystem.js`).
  `sim/active-income.mjs` measures active:idle on the real classes (x20.7 before, x7.2 now) and
  feeds the sim. Upgrade shop retuned to x1.2 / +0.1% synergy: casual first Transcend day 4.2.

- R5 #7 Upgrade shop (PR #40): `js/systems/UpgradeSystem.js` (tier, click and synergy upgrades,
  reset on Ascend/Transcend), panel `js/ui/upgrades.js` + `css/upgrades.css`, tests in
  `test_upgrades.js`. The sim buys upgrades greedily; R3 later retuned the table to x1.2 / +0.1%.
- R9 #11 Talent economy (PR #39): talent points from S1 stars, S2 records and S3 Guild Rank in
  `js/systems/TalentSources.js`; sources header in `js/ui/talents.js`. Tests in `test_talents.js`.
- R10 #12 Contract board (PR #55): `BountySystem.js` board with timed refill, reroll and Guild Rank
  per claim; UI in `js/ui/contracts.js`. Tests in `test_contracts.js`.
- R13 #15 Shard tree (PR #43): `js/systems/ShardTreeSystem.js` (Foundry, Chronos, Tower branches:
  Auto-Ascend, Second Wind, Wardens node, offline +8 h, Long Sleep/Hourglass), panel
  `js/ui/shardTree.js` + `css/shard-tree.css`. The sim models Auto-Ascend. Tests in
  `test_shard_tree.js`.
- R14 #16 Codex 2.0 (PR #41): achievement ladder in `AchievementSystem.js`, collections and the
  Generator Codex in `js/systems/CollectionSystem.js`, UI `js/ui/codex.js` + `css/codex.css`.
  Tests in `test_codex.js`.
- R15 #17 Daily and weekly structure (PR #57): `js/systems/CalendarSystem.js` (Dallah dailies,
  Ledger weeklies, Souq, Seals; Seal shards are spendable only), UI `js/ui/calendar.js` +
  `css/calendar.css`. Tests in `test_calendar.js`.
- (R5, R9, R13, R14 sat under "In progress" until the R6 merge dropped them without a Done entry;
  R10 and R15 never got one. Restored from the merged PRs.)

- R25 #61 Reward toasts clear the buff bar: `js/buffBar.js` writes its measured height to
  `--buff-bar-h` (token default 36px); `css/rewards.css` offsets the stack by it at 640px+ and caps
  its height above the bottom bar under 640px. Tests in `test_r25_toasts.js`; screenshots in
  `docs/ui/screenshots/r25/`.

## Notes for the next session

- **Changelog:** every player-visible PR bumps `VERSION` and adds a `CHANGELOG` entry in
  `js/version.js` (AGENTS.md "Version and changelog"; CI `changelog` job enforces it). v3.0.0
  backfilled R0-R22, which had shipped without entries. The current version is `VERSION` in
  `js/version.js` (4.2.0 after R7).

- Save format changes: add a step to `MIGRATIONS` in `js/engine/migrations.js` and an old-shape
  fixture to `test_saves.js`. `SAVE_VERSION` is derived from the last step (6 after R7).
- Pacing: CI runs `npm run sim:check` (blocking). Run `npm run sim` for today's numbers.
- Breeding still unlocks on the first-Transcend stand-in (`GardenSystem.isBreedingUnlocked()`);
  Wardens moved to a shard-tree node in R13.
- Leaderboard: `codex_pct` / `seals_lit` columns on `leaderboard_season` (with a ceiling in
  `leaderboard_season_guard`) were planned for after R14/R15 and are not built yet.
- New UI: use the classes in `css/components.css` (live in `docs/ui/mockups/components.html`)
  and the tokens in `css/tokens.css`; no new hex values. Buy buttons: `.btn-primary` when
  affordable, `.is-locked` + `aria-disabled` with the missing amount otherwise.
- Delegated click handlers in `main.js` (talents, spells, alchemy, quartermaster, perks) only fire
  on buttons with the `active` class. Restyling a button must keep toggling it, or clicks do
  nothing (talents broke this way after R22). `test_click_gates.js` guards it.

- Dust shop (R6): read items with `hasShopItem(gs, id)` / `getShopRank(gs, id)` from
  `DustShopSystem.js` (pure, no DOM). Keystones R7 moves into the shop go in `DUST_SHOP_ITEMS`.
  Auto-Buy's 10 s timer and the Hourglass buttons are owned by `js/ui/dustShop.js`.

- Shell (R23): new tabs need a `data-tab` button in all three navs in `index.html` (side nav
  group, and the bottom bar or the More sheet) plus a `data-hint` on their guide banner;
  `test_r23_shell.js` checks both. Per-tab header currencies live in `headerCurrencies()`.
  R7 should hide locked tabs in all three navs.

- Tooltips (R24): put `data-tip` (via `tipHtml`/`tipAttr` in `js/ui/tooltip.js`) on anything that
  explains itself on hover; add its class to `TAP_TIP_SELECTOR` if phones need it. New animations
  that loop forever must be ambient and listed in `test_r24_motion.js`.

## Noticed (not yet an issue)

- R7 starter gifts not built: Rare weapon (Tower), half-filled first contract (Bounties), free
  Cold Vimto brew (Alchemy), free caravan (Bazaar). Save export/import still sits in the Codex
  (roadmap §2.1 rule 5 wants it in Settings). The header shows Mana before the Grimoire opens.
- **Active income is x7.2, not the doc's ~x2** (R3, design doc §6.1 R3 notes). The specified
  spell/anomaly values were applied; the rest comes from Chrono Warp (~+1), Bursts cast inside
  Celestial, and Frenzy clicks. Owner decision: which of those to trim (each changes the
  pacing sim; re-run the R3 sweep after).

- Save import merges into the running state: `deserialize` spreads `inventory`, `stats` and
  `settings` over the current values, so keys the imported save lacks keep the old game's values.
- Mining still runs its own schema-gated migration (`MiningSystem.migrateMiningGrid`,
  `miningGrid.schema`) outside the `MIGRATIONS` chain. It works; folding it in is optional.
- Midas click gold (`ClickerSystem`) still scales 1.15^floor on the current floor, and bounty gold
  scales with the current floor; neither follows the R8 curves.
- A brand-new account carrying a rebased legacy save shows floor <= 1,000 + 1,000/h on Season 2
  for its first hours (R19 guard ceiling); old anonymous accounts can still post forged floors.
- Combat floating damage text and particles still render over other tabs (seen on Excavation
  and over the Tower quick-cast chips; `docs/ui-review.md` finding 6). `1ae4d47` fixed it for
  auto-attacks only.
