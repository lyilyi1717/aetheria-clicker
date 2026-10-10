# Status

Progress log for the year-one redesign (`docs/redesign-proposal.md`). Every session reads this
first and updates it before finishing (see `AGENTS.md`).

Roadmap items are called **R0–R40**. R0–R20 are the design doc's §9 roadmap; R21 onward came
later (UI review, player feedback) and live only as issues. GitHub numbers issues separately: the
Plan table below maps every R-number to its issue.
Owner decisions live in issue #23; if it has no answer, use the default listed there.

## In progress

- **Clarity pass on the `?loop=2` preview** (owner, 2026-10-10: "not clear for humans, I didn't know
  how to play it ... no sense of progress ... simpler to understand without losing game mechanic
  complexity"). The shared part is merged (R95, below). In progress, one sub-agent each:
  R96 #255 (CL-29 Well), R97 #256 (CL-30 Fields), R98 #257 (CL-31 Refinery), R99 #258 (CL-32 Expand
  and Collection), and R91 #241 (CL-24 the tree's view, `js/ui/coreloop/tree.js`). After they merge:
  a combined browser pass of the whole first session, then show the owner.

## Next up

- **Core-loop redesign** (`docs/core-loop-plan.md`): Waves A and B done; Wave C: the `?loop=2` preview
  has its shell, all five screens (R82-R86) and the game-feel pass (R87). **Open:** the clarity pass
  (R95 done, R96-R99 in progress) and **Wave C2 (integration), R88-R94 (#238-#244)**, filed after the Wave D go / no-go came out
  **no-go** (#23, 2026-10-10): the loop has no home yet for the three subgames' own play, the
  trees and shops, spells and elixirs, or the non-loop tabs. Ready now: R93 (CL-26 sim covers the
  subgames and the tree, Opus), R91 (CL-24 the one tree, Opus), R92 (CL-25 Tafheet, spells, Brews,
  Opus), R94 (CL-27 Codex hosts the other tabs, Sonnet). R88-R90 (subgames as Fields, Opus) need R93.
  Owner answers are on #23 (no mockups; Saudi names; keep or archive old saves; no new leaderboard
  season; the coordinator decides go / no-go). Wave D waits for a **go**.

R0–R30, R32–R40 and R41–R43 are done.

- Owner actions pending: enable Google sign-in (steps in PR #94). Game title after the oil
  re-theme (question in #23). Done 2026-10-09: `leaderboard_season2.sql`, `cloud_saves.sql` and
  `leaderboard_registered.sql` applied to the live project (0 guest rows deleted); repo labels exist.

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
| 8 | R41 Feedback-tier helper and effect budget | #113 | – (game-feel docs merged) |
| 8 | R42 Boss and Warden kills feel like a win | #114 | R41 |
| 8 | R43 Welcome-back celebration | #115 | R41 |
| 8 | R44 Monolith combo climb and Frenzy moment | #116 | R41 |
| 8 | R45 New Well / New Field ceremonies | #117 | R41 |
| 8 | R46 Sound families by meaning | #118 | R41 |
| 8 | R47 First-time unlocks and rare events | #119 | R41 (best after R46) |
| 8 | R48 Honest Bazaar sale, no silent taps | #120 | R41 (best after R46) |
| 8 | R49 Reduced-motion colour cues | #121 | R41 |
| 8 | R50 Game-feel polish (skills, digs, Dallah, Seals, Frenzy end) | #122 | R41 (best after R46) |
| 8 | R51 Yield gain and best value on generator buttons | #124 | – |
| 9 | R52 Passive-first clicking (click = 0.5 s of production, Auto-tap) | #126 | R31 |
| 9 | R53 Reprice everything outside the core | #127 | R31 |
| 9 | R54 "Coming up" panel | #128 | R31 |
| 9 | R55 Ascension attunements | #129 | R31, R52 |
| 9 | R56 Challenge rewards and Chapter 2 | #130 | R31 |
| 9 | R57 Tame the late-year Chronicle/Page loop | #139 | R52, R56 |
| 10 | R58 Shatter damages tiles, not breaks them | #156 | – |
| 10 | R59 Garden taps share the click cap; Dewdrop crash | #157 | R52 |
| 10 | R60 Nectar Surge only on hand harvests | #158 | R59 |
| 10 | R61 Minimum Ascension run; honest sim cadence | #159 | R57 |
| 10 | R62 Super-Crits and mining shockwave never trigger | #160 | R58 |
| 10 | R63 Tower gear base 1.105 | #161 | R8, R34 |
| 10 | R64 Gear bag, rare finds, re-temper | #162 | R63 |
| 10 | R65 Mythics, Barakah meter, boss telegraphs | #163 | R64 |
| 10 | R66 Garden tap growth back to 5% (owner decision) | #172 | R59 |
| 10 | R67 Core sim skips Tower-only Al-Wakeel | #178 | R65 |
| 10 | R68 Auto-Drills use the manual dig abilities | #183 | – |
| 10 | R69 Drill Mastery shop item gates drill abilities | #191 | R68 |
| CL-A | R70 CL-0 Core-loop contracts (state, shared, params) | #204 | – |
| CL-A | R71 CL-1 Presence, Heat, Gushers | #205 | R70 |
| CL-A | R72 CL-2 Fields and Rigs | #206 | R70 |
| CL-A | R73 CL-3 Mastery | #207 | R70 |
| CL-A | R74 CL-4 Refinery: Fractions and Orders | #208 | R72 |
| CL-A | R75 CL-5 Collection: Vials and Mixer | #209 | R72 |
| CL-A | R76 CL-6 Cauldrons and Bubbles | #210 | R71, R72 |
| CL-A | R77 CL-7 Seals and Crew | #211 | R70 |
| CL-A | R78 CL-8 Well v2 (cascade, BigNum) | #212 | R70 |
| CL-A | R79 CL-9 Prestige v2 | #213 | R78, R72 |
| CL-B | R80 CL-10 Proof sim on the real systems | #226 | R71-R79 |
| CL-C | R81 CL-11 Core-loop mockups (closed: owner wants none) | #229 | – |
| CL-C | R82 CL-12 Shell behind `?loop=2` | #230 | R80 |
| CL-C | R83 CL-13 Well screen | #231 | R82 |
| CL-C | R84 CL-14 Fields screen | #232 | R82 |
| CL-C | R85 CL-15 Refinery screen | #233 | R82 |
| CL-C | R86 CL-16 Prestige screen and Codex | #234 | R82 |
| CL-C | R87 CL-17 Game-feel pass | #235 | R83-R86 |
| CL-C | R95 CL-28 Guided start: next-step bar, staged unlocks | #253 | R82-R87 |
| CL-C | R96 CL-29 Well screen a person can read | #255 | R95 |
| CL-C | R97 CL-30 Fields screen a person can read | #256 | R95 |
| CL-C | R98 CL-31 Refinery screen a person can read | #257 | R95 |
| CL-C | R99 CL-32 Expand and Collection screens a person can read | #258 | R95 |
| CL-C2 | R88 CL-21 Tower as a Field | #238 | R84, R93 |
| CL-C2 | R89 CL-22 Mine as a Field | #239 | R84, R93 |
| CL-C2 | R90 CL-23 Oasis as a Field | #240 | R84, R93 |
| CL-C2 | R91 CL-24 The one upgrade tree | #241 | R86 |
| CL-C2 | R92 CL-25 Tafheet, spells and elixirs | #242 | R83, R85 |
| CL-C2 | R93 CL-26 Proof sim covers the subgames and the tree | #243 | – |
| CL-C2 | R94 CL-27 Codex hosts achievements, leaderboard, community, settings, about | #244 | R86 |

## Done

- R95 #253 (CL-28, PR #254, no player change): the guide. `coreloop/Guide.js` (pure; the sims never
  call it): 22 features (tabs and sections of screens) each with the rule that opens it, sticky
  (`state.guide.open`); 13 first-session steps; then a standing suggestion. The shell shows it as one
  gold next-step bar with "Show me" (it rings the element with `data-guide="<anchor>"`), hides tabs
  until they open (a "new" mark), an intro on a fresh save, and draws each screen's head (name, one
  sentence, "How it works"). **Screens must ask `api.isOpen(feature)` and carry their anchors**
  (README "The guide"). Fixed: a screen's own `display` beat `[hidden]`, so Fields was stacked under
  every other tab. `Well.tap` (flat `P.tapCrude` = 1). New saved fields `state.guide`, `well.taps`,
  `presence.caught`. Names: the eight pumps (`cl.slot.*`: Bucket, Hand Pump, Wanet, Derrick,
  Pipeline, Sahreej, Sea Platform, Giant Field); tabs Prestige / Codex are shown as Expand /
  Collection (module ids unchanged). A guided player: Fields 0:39, first Order 2:09, first New Well
  13:21 (`test_cl_guide.js` holds the order and a 12-minute limit on quiet gaps).
- R87 #235 (CL-17, PR #250, no player change): `js/ui/coreloop/feedback.js` gives every event the loop
  emits its feedback tier in one place (sound, colour cue, a line, a toast, a ceremony). Checked in
  a browser for errors and the line; **sound was not checked by ear**.

- R91 #241, first part (CL-24, PR #251, no player change): `coreloop/Tree.js` + `treeMath.js` (shared with
  the model). 38 nodes in three rings (`P.tree`); all 59 nodes of the old Reserve shop, Shard tree,
  talents, Page upgrades and Quartermaster have a home (`from` lists, `P.treeElsewhere`). 9 nodes are
  flags waiting for CL-21 / CL-22 / CL-25 (`pending`). New saved field `state.tree`. Tuning (reference
  log 29): re-blaze 1.3 Shares a Page (was 1.35), a Bubble family every 3rd Bubble (was 4th).
  Both sims pass T1-T12 on seeds 1-6.
- R83-R86 #231-#234 (CL-13…CL-16, PRs #247, #245, #246, #248, behind `?loop=2`): the Well, Fields,
  Refinery, Prestige and Codex screens, one module each (`js/ui/coreloop/<id>.js`, own strings and
  css). Players count grades from 1. Top Vial tier is "Star" ("Aether" is a retired word). Trials
  are won with a "Take the Trial" button. Placeholders still to name: the 12 Mastery actions, the
  12 Seals, Compounds, the Well's slots. The lower Refinery sections, Seals / Trials and the Codex
  were measured at 375 px, not looked at; no combined browser pass after the last merges.
- R82 #230 (CL-12, PR #237, behind `?loop=2`): the preview shell. `Loop.js` (tick, Gusher tap, time
  away capped at `P.offlineMaxHours` 12), `js/ui/coreloop/shell.js` + `store.js` (own save key
  `AETHERIA_CORELOOP_SAVE_V1`), `registerStrings` for per-screen strings, the shared vocabulary with
  the names from #23 in `js/i18n/coreloop/shell.en.js`. A screen is `mount(panel, api)`; the README has
  the API. `index.html` and `GameState.js` were not needed.
- R76 #210 (CL-6, PRs #224 and #228, no player change): `coreloop/Cauldrons.js`, then owner decision 4:
  about 800 Bubbles a year instead of 8,000 (bar cost ^0.95, effect x6, a family every 4th Bubble).
  Bubble totals move by the difference on a brew or level-up (no rebuild). Reference tuning log 28.
- R80 #226 (CL-10, PR #227, no player change): `sim/core-loop.mjs` (`npm run sim:coreloop`) plays the
  `sim/redesign` year on the real systems; T1-T12 pass on seeds 1-6. Differences from the model are in
  the PR (Gushers 8-11% fewer catches, active ends ~5 decades lower). The README's "One tick of the
  loop" is the call order CL-12 must follow. Refinery now gives a Vial offer per filled Order.
- R79 #213 (CL-9, PR #222, no player change): `coreloop/Prestige.js`: gates, actions and the sim's
  picks as suggestions (`suggestedChoice`, `suggestChronicle`). Charters switch only with a New Field.
- R75 #209 (CL-5, PR #225, no player change): `coreloop/Collection.js`. Discovery is deterministic (the
  sim's `mixerChance` stays in the sim driver). New saved field `collection.batchFrom`.
- R74 #208 (CL-4, PR #223, no player change): `coreloop/Refinery.js`. Posting is `step`; filling is a
  player action. No reroll yet (no numbers for it).
- R72 #206 (CL-2, PR #221, no player change): `coreloop/Fields.js`, `coreloop/Rigs.js`. `takeMaterial`
  is all or nothing; `Rigs.step` is the whole farming step.
- R78 #212 (CL-8, PR #218, no player change): `coreloop/Well.js`, the cascade in `BigNum` (multipliers
  summed in log10). Matches the sim's `wellStep` to 1e-9 up to 1e200 and runs past 1e308. `addCrude` is
  the one way Crude is earned; `resetRun` / `closeChronicleRecord` are what Prestige calls. The README
  now has the Well's contract and the clock rule (`state.t` is the start of a step). `P.packSize`.
- R73 #207 (CL-3, PR #219, no player change): `coreloop/Mastery.js`. Rank ids novice, adept, master,
  grandmaster, legend. Spec change: titles land on Legend V, X (ranks 9, 14), as the design says; the
  sim had VI, XI (reference tuning log 27, `--assert` green on seeds 1-6). `P.rigEffBase`, `rigEffMastery`.
- R77 #211 (CL-7, PR #215, no player change): `coreloop/Seals.js`. A Seal that opens inside a step is
  credited for the part after it opened (the sim waits a step). `P.sealBonusPerTier`.
- R71 #205 (CL-1, PR #216, no player change): `coreloop/Presence.js`. A Gusher comes up on a seeded
  schedule while Watching and stays `P.gusherWindow` (20 s); `catchGusher` returns the payout and the
  loop driver pays it (`Well.addCrude`, `Rigs.haul`). CL-10: Watching steps are 30 s, so the driver
  must split a step at `presence.nextGusherAt` or it will miss the window. `P.handsWindow`.
- R70 #204 (CL-0, no player change): `js/systems/coreloop/` holds the contract for the core-loop
  redesign: `README.md` (rules, who writes which part of the state, events), `state.js` (saved state,
  save / load that accepts any input), `shared.js` (ids, hit levels, seeded RNG, Fraction value).
  `params.js` there is now the only copy of the numbers; `sim/redesign/params.mjs` re-exports it.
  Nothing in the live game imports the folder. Wave A PRs carry the `no-changelog` label.
- #196 (PR #197, v5.30.1): fixed Open New Field ReferenceError on New Well page. In R45, runPrestige was used in prestige.js to trigger the field ceremony without being imported. Imported runPrestige and added a regression test in test_r45_prestige_ceremony.js.
- R69 #191 (PR #192, v5.28.0): owner request, the R68 drill abilities need the Reserve shop's
  `drill_mastery` (tier 3, 35, one-time; gate `procs` in `mineBlock`). Core sim skips it (like
  `al_wakeel`); mining sim owns it from `DRILL_MASTERY_DAY` 1.5. Idle depth day 1/7/60 112/169/240 (R68)
  -> 95/168/241; band ok, core pacing unchanged.
- R68 #183 (PR #184, v5.23.0): owner request, drill hits (Auto-Drill, Steam Jackhammer) roll Shatter,
  Cleave, Chain and mining crits / Super-Crit shockwave like a tap (`mineBlock`); Frenzy stays manual
  (streak and x2). Drill procs are silent. Mining sim (skills at Lv 0): idle depth day 1/7/60
  95/158/229 -> 112/169/240, active day 7/30/60 116/154/170 -> 118/158/176; band still ok.
- R43 #115 (v5.22.0): Welcome Back modal celebrates (`startCelebration` in `js/ui/offlineModal.js`):
  bell, 1.2 s count-up via `feedback.countUp` (tap skips), rows stagger in, 24 gold sparks, Collect
  plucks and pulses `stat-aether`. The particle canvas rises above the modal only while it is open.
  The bell can be muted by the browser on a cold load (no user gesture yet); the Collect pluck always plays.
- R65 #163 (PR #177, v5.19.0): boss telegraphs SMASH/FEAST/WARD (`js/systems/bossFights.js`,
  `js/ui/bossFx.js`), phase 2 at 50%, misses free below floor 150; Sheikhs every 50 floors;
  Guardians at 50/150/300/500/750/1000 (merged with R18 Wardens); 4 Mythics (Wasta Strike every 30th
  hit, boss cap 4% max HP), Barakah meter (20,000, rests after 1,000/day), Cosmic pity every 10th
  Legendary; Al-Wakeel is a Dust-shop item (`al_wakeel`), R64 grant grandfathered. No migration.
  Tower sim takes `--seed`, `--no-mythic`, `--no-telegraphs`; idle cost of telegraphs ~-4% at 3 d.
  Art needed (for the art tool) is listed in PR #177.
- R61 #159 (PR #199, v5.31.0): min Ascension run 120 s (`MIN_RUN_SECONDS`) plus a dust ramp:
  dust x min(1, run s / 1800)^2 (`DUST_RAMP_SECONDS`/`_POWER`/`_GRACE` in `PrestigeSystem.js`); first New
  Well exempt; Auto-Ascend/Transcend pay the ramped value (`getAscendCosmicDust`). Sim clock drives
  `Date.now`; hourly manual-Ascend cap removed; new 24/7 spam profile: 0.0 vs 13.4 dust/h normal
  (`sim:check` asserts spam <= 1.0x). Chronicle trigger stays 11 d (7 d fails, doc section 6).
  Casual 1-month dust +14% (cap removal, not the ramp); day-1 dust and first Ascension unchanged.
- R67 #178 (PR #179): R65 broke `sim:check` (merged with pacing red by mistake): the core sim bought
  `al_wakeel` and one 40-dust purchase moved the days 50-70 median 6.9e11 -> 1.22e13. The core sim
  now skips that Tower-only item. Shows how chaotic that window is (R57's area).

- R62 #160 (PR #174, v5.17.3): 20% of crits become Super-Crits (`SUPER_CRIT_SHARE`): refinery x5
  click (inside R52), mining crit adds a 0.15x shockwave to 4 neighbours on manual digs only.
  Hyper-Crits still dormant (need >200% crit). Active income x2.89 -> x2.91; depth within +-3%.
- R64 #162 (PR #168, v5.18.0): gear bag (30 slots), `js/systems/gearItems.js` + `GearSystem.js`,
  `js/ui/bag.js`; rarity x1-5, 6 affixes, 6 boss signatures, mob drops 8%, Legendary pity 600,
  re-temper, Kashta camp, Void Cataclysm Tower cap 10x Attack. Monster Bones and R34 gear levels
  removed (owner); salvage pays Gear Scrap. Migration v11: equipped gear -> Heirlooms keeping exact
  stats (`keep` floor), bones -> Scrap / up to 8 Rare finds / up to 20 Void Cores, Welcome Bag.
  `GEAR_FLOOR_BASE` 1.109 (gear levels gone): tower 400/520/610 vs 414/498/560.

- R58 #156 (PR #171, v5.17.1): Shatter is x10 pickaxe damage, no instant break
  (`SHATTER_DAMAGE_MULT`). `sim/mining-pacing.mjs` taps through the manual path (active 5/s,
  casual 1.5/s) and asserts the depth band (day 7 80-190, day 30 110-260, day 60 130-280); active
  depth day 7/30/60 went 247/909/1777 -> 116/153/171. The sim takes ~9 min. Mining taps don't yet
  spend from the R52 paid-tap bucket (candidate follow-up).
- R60 #158 (PR #169, v5.15.0): Nectar Surge pays on hand harvests only (`harvestPlot(..., auto)`,
  Golems/offline pass `auto`). `sim:check` now also runs `sim/garden-tap.mjs --assert` (Golems
  x1.01 cap, offline 0 Oil).
- R66 #172 (PR #173, v5.17.2): owner decision, tap growth back to 5%; tap uplift ~+x5 under the owner
  ceiling `TAP_UPLIFT_CEILING` x5.5 (designed envelope x2.89 kept for reference). Hand-harvest
  Garden x3.42 over generators is accepted by the owner.

- R59 #157 (PR #165, v5.13.0): Garden taps share the R52 paid-click bucket
  (`ClickerSystem.spendPaidTap()`), Dewdrop pays 0.25 s, tap growth 2% of grow time (was 5%; needed
  to fit the x2.89 envelope), BigNum import crash fixed. Active-tapping sim: `sim/garden-tap.mjs`.
- R63 #161 (PR #166, v5.14.0): `GEAR_FLOOR_BASE` 1.105; save step v10 sets `pendingFloorRebase`
  so over-floor saves step down via `rebaseLegacyFloor` (record kept). `npm run sim:tower` now fails
  outside +-10% of 414/498/560 at 1 d/1 w/1 m (open profile now 97/380/510/520).

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

- R26 #62 Blast on the grid (PR #89, 4.2.1): `getBlastArea(centerId, gridSize)` in
  `MiningSystem.js`; `blastBlocks` spawns effects on each tile's own rect (`#mine-tile-<id>`) and
  flashes them (`.blast-flash`). Tests in `test_r26_blast.js`.
- Fix (PR #90, 4.2.2): `tab-chronicle` was never closed in `index.html`, hiding Dallah, Codex,
  Leaderboard and Settings unless Chronicle was open. `test_r23_shell.js` now fails on nested
  tab sections.
- R30 #66 Letters notation (PR #88, 4.3.0): `BigNum.notation` defaults to `'letters'` (K, M, B, T,
  aa…zz, aaa…, each x1000, so az = 1e90, ba = 1e93; the issue's examples were off by one step).
  Save v7 moves saves on the old default (scientific or unset) to letters. `test_r30_letters.js`.
- R28 #64 Frenzy every 20 (PR #91, 4.4.0): constants in `js/systems/combo.js`. Combo x5 at 20
  clicks, never reset by Frenzy; Frenzy x3 click yield for 4 s per milestone, +4 s per milestone
  while running (cap 30 s), no auto-clicks. Active/idle x6.98 (was x7.10); clicking alone x1.56
  (was x2.73). Combo bar in `js/ui/comboBar.js`. `test_r28_frenzy.js`.
- R33 #69 Weekly goals (PR #92, 4.5.0): `CalendarSystem.js` sizes each Ledger goal to 4.5x the
  median of the player's last 7 days seen for that stat (`ledgerTargetFor`, `calendar.rates`), 10
  Guild Seals per goal (was 6); weeks drawn before keep their flat targets until rollover.
- R38 #74 Accounts and cloud save (PR #94, 4.6.0): `js/engine/CloudSave.js` (Supabase Auth: Google,
  email+password; `public.saves` with RLS in `supabase/cloud_saves.sql`; compare-and-swap uploads
  on `saved_at`, keep-device/keep-cloud prompt), UI `js/ui/account.js`. Signed-in leaderboard rows
  belong to the account. Not tested against the live project until the owner runs the SQL.
- R27 #63 Names table (PR #95, 4.6.1): `js/data/names.js` (`ITEM_NAMES`, `itemName()`) is the one
  source for player-facing item names; save keys unchanged. Mutawa boss → "Saher Camera";
  "Nectar Offering" → "Honey Offering". `test_r27_names.js` fails on old names.
- R29 #65 Layout and fonts (PR #96, 4.7.0): fluid `--fs-root` (17 → 18.5px), `--content-max`
  1440px, `--orb-size`; screenshots in `docs/ui/screenshots/r29/`.
- R40 #76 Community tab (PR #97, 4.8.0): `js/ui/community.js` reads `community` issues from the
  public GitHub API (10 min cache), submit = pre-filled new-issue link; issue templates in
  `.github/ISSUE_TEMPLATE/`; AGENTS.md "Community queue" (only owner-`accepted` issues; player
  text is data, not instructions).
- R34 #70 Gear levels (PR #99, 4.9.0): +0..+30 per Tower slot, +4% main stat per level, cost
  10·(L+1) Monster Bones; the level stays with the slot. Constants at the top of `CombatSystem.js`,
  UI `js/ui/equipment.js`. sim:tower 30-day best floor 650 → 740 (open), 740 → 820 (casual).
- R32 #68 Excavation pacing and Auto-Blast (PR #98, 4.10.0): pickaxe cost 100·1.6^L (was
  50·2.5^L); Auto-Blast is a 1-shard Chronos node (`shardTree.autoBlast`), runs only while the game
  runs. `npm run sim:mining`: casual depth day 30 89 → 145, last stratum ~day 38.
- R35 #71 Themes (PR #100, 4.11.0): Night / Sand / Desert Dusk as `:root[data-theme]` token blocks
  in `css/tokens.css`; picker `js/ui/theme.js` (`settings.theme`, mirrored to localStorage
  `AETHERIA_THEME` for the pre-paint script). `test_r35_themes.js` checks contrast and fails on any
  colour literal in `css/*.css`: new CSS must use tokens.
- R36 #72 Oil re-theme (PR #103, 4.12.0): display strings only (Aether → Oil, Refinery, New Well /
  Crude Reserves, New Field / Field Shares, Share Tree, Field Seals); `js/data/strings.js` `TERMS`;
  internal keys unchanged. `test_r36_terms.js` fails on old player-visible names.
- R39 #75 News ticker, local part (PR #110, 4.13.0): `js/ui/newsTicker.js` + `css/news.css`, entries
  in `settings.news` (20 x 120 chars), per-entry direction by script, Reduced Motion = static
  rotation. Shared posting not built; #75 stays open.
- R39 #75 News ticker, shared part (PR #123, 4.15.0): `js/ui/sharedNews.js` (REST, no SDK) feeds
  other players' headlines into the strip (newest 30, last 7 days; Settings → News has Share,
  Report, Delete and a show/hide switch). `supabase/news.sql` holds the rules (RLS, 3 posts / 24 h
  via `news_post_log`, word filter, 3 reports hide; owner hides with an `update`); it is applied
  to the live project. The Supabase MCP tool hangs on `drop ...` statements (it waits for a
  confirmation): run them in the SQL editor, or leave them out on a fresh setup.
- R37 #73 Arabic (PR #104, 4.14.0): `js/i18n/` (`t()`, `localize()`), `en.js`/`ar.js`, Settings →
  Language, full RTL with logical CSS, numbers isolated LTR. `test_r37_i18n.js` fails on missing
  Arabic. AGENTS.md rule 11: new text goes through `t()` with Arabic. Merged on the owner's word;
  the list of uncertain Arabic terms is in the PR body.
- R31 #67 Economy redesign core (PR #102, 5.0.0): about 1e12 at day 60; dust, shard and Page
  bonuses are additive; save step v8. Knobs: `BuildingSystem` (`TIER1_CPS`, `TIER_CPS_RATIO`),
  `PrestigeSystem` (`DUST_*`, `TRANSCEND_*`), `UpgradeSystem` (`TIER_UPGRADE_THRESHOLDS`,
  `TIER_UPGRADE_COST_STEP`), `ShardTreeSystem` (`AUTO_ASCEND_*`). The 2-month sim row depends on
  where day 60 falls in a layer (run Oil swings ~2 decades); re-run `sim:check` after any pacing
  change.
- R52 #126 Passive clicking (PR #136, 5.3.0): a click is 0.5 s of production (min 1, max 5 paid
  clicks/s). The 15 click upgrades are gone (save step v9 refunds them as Oil). Auto-tap is a dust
  shop item (1 tap/s when idle, also offline). Spells and Frenzy retuned so active is x1.93 over
  idle with Auto-tap; the combo is feel-only. 6 tier upgrades per tier (at 1/3/8/15/30/60 owned,
  x3 cost steps). A New Well pays from 500 run Oil. `sim:check` asserts idle first Ascension
  <= 90 min (60), casual median upgrades per run >= 30 (32), casual median run Oil over days
  50–70 >= 1e11 (4.1e12; idle 4.4e10).
- R57 #139 Tame the late-year Chronicle/Page loop (PR #146, 5.30.0; closes wave 9): Pages count
  Transcends only up to the 9th (`CHRONICLE_PAGES_MAX_TRANSCENDS = 9`); in the sim later
  Chronicles begin at the 9th Transcend. `sim:check` also runs `--links` and all three
  attunements and asserts months 6–12 median <= 1e17, highest <= 1e18, and the 2-month band per
  attunement. Late-year peak 9.2e20 → 7.8e16 (links on: 2.6e24 → 2.5e15); 2-month medians
  unchanged; upgrades per run 32. Owner call: Chronicles are now 28 a year casual (~90 with
  links) and the late median sits below the 2-month band.
- R55 #129 Ascension attunements (PR #143, 5.5.0): pick 1 of 3 per run, one additive category.
  Idle (default) +30% while the last hand tap is >= 60 s old (Auto-tap doesn't count); Steady
  makes tier upgrades x1.26 each instead of x1.2; Focus +15% per subgame milestone, capped at
  +40%. The pick locks at the first generator bought; a later pick is queued for the next New
  Well. Old saves get Idle. Pacing is phase-sensitive: default casual days 50–70 median is 2.4e11;
  Steady starts a Chronicle around day 58 and would fail `sim:check` (in R57's scope).
- R56 #130 Challenge rewards and Chapter 2 (PR #141, 5.4.0): each Chronicle challenge pays one
  permanent reward on first clear (`chronicle.rewards`; old clears are paid on load). Oil rewards
  total +35%, additive with Margin Notes; also offline +10% x2, Small Souq start, Sandstorm +1
  Page, Still Water +25% dig. Chapter 2 is the Chapter of Salt (4 challenges, Excavation x2); the
  comboCap rules became noAutoTap. Save v10 is still free.
- R53 #127 Reprice outside-core (PR #134, 5.2.0): Oil achievement rungs at 1e5–1e16 (ids kept);
  Forge costs 100·1.5^L; subgame→Oil links are one additive category capped at +150%
  (`js/systems/WorldLinks.js`); Geode and Nectar dust links are additive with each other.
  `npm run sim -- --links` adds the links; `sim:check`'s 2-month assert is now the median run Oil
  over days 50–70 (the day-60 row was phase luck). With links on, months 4–12 run hot (1-year
  ~1.5e23): that's R57. Link nerfs are steep (Treaty 25%→2%/rank); owner may want to weigh in.
- R54 #128 Coming up panel (PR #135, 5.1.0): logic in `js/ui/comingUp.js`, styles in
  `css/coming-up.css`. Desktop opens it from a header-chip dropdown; under 1024px it is a bottom
  sheet opened from the Refinery card. Reserve-based ETAs use this run's pace, so they're rough.
- R41 #113 Feedback-tier helper (PR #155, 5.12.1): `js/ui/feedback.js` (`fire(tier, opts)`, `countUp`,
  `hitStop`, `shake`; no-op without a DOM) on top of pure `js/ui/feedbackBudget.js` (budgets,
  chains, sound cooldowns, caps, merge rule); `ParticleEngine` caps 250/150 sparks and 40 texts and
  merges "+n" texts by key. Click/crit/anomaly, combat hits, dig hits and Auto-tap go through it.
  `.fx-shake`/`.is-hitstop` are in `css/animations.css`, unused until R42. R42–R50 build on this.
- R42 #114 Boss kills (PR #170, 5.17.0): `js/ui/combatFx.js` hooks `CombatSystem.onBossDefeated` (T2 via
  `feedback.fire`, hit-stop + flash on `.monster-avatar`, shake on the arena card, callout + gold
  count-up) and `renderBossTimer` (red/ticks at <= 10 s, scale at <= 3 s, "Last boss: +n gold"
  between bosses in the same reserved line). New voices `playBossDown`, `playTick`.


- R25 #61 Reward toasts clear the buff bar: `js/buffBar.js` writes its measured height to
  `--buff-bar-h` (token default 36px); `css/rewards.css` offsets the stack by it at 640px+ and caps
  its height above the bottom bar under 640px. Tests in `test_r25_toasts.js`; screenshots in
  `docs/ui/screenshots/r25/`.

- #147 Bug: drill-found Geode Pockets (v5.10.0) fired the full-screen `big` reward ceremony and
  achievement sound on whatever tab was open. `MiningSystem.revealReward` now uses tier `small`
  and no sound when there is no tap position (drills); taps keep `big`. Test: `test_offtab_fx.js`.

- #149 Bug: account confirmation emails linked to http://localhost:3000. Supabase's Site URL
  was the default and the game's URL wasn't in Redirect URLs, so `redirect_to` was ignored. Fixed
  in the Supabase dashboard (2026-10-08); the required settings are now in `supabase/cloud_saves.sql`'s header.

- #151 Bug: email confirmation/reset links gave no visible result. `AccountUI.init` now opens
  Settings, scrolls to Account and shows the outcome; `otp_expired` maps to `cloud.link_expired`.

- #152 Leaderboard: registered players only. No guest sign-in; `Leaderboard.ensureSession` uses
  the account session. Name = account `user_metadata.nickname` (`CloudSave.setNickname`, asked at
  sign-up) > old `settings.lbName` > `funnyName(user_id)` (`js/data/funnyNames.js`). Server rules
  and guest-row cleanup: `supabase/leaderboard_registered.sql` (handles Season 1 live or frozen;
  re-run it after `leaderboard_season2.sql`).

## Notes for the next session

- **Game feel:** `docs/game-feel-guide.md` sets feedback tiers (T0 tap to T3 peak) and a
  checklist for any action, reward or ceremony (linked from AGENTS.md rule 7). An audit of
  where the game falls short goes in `docs/game-feel-opportunities.md`.
- **Game-feel audit:** `docs/game-feel-opportunities.md` scores every action/reward moment, ranks
  13 improvements and sketches a shared `js/ui/feedback.js` tier helper; its items are filed as
  R41–R50 (#113–#122, start with R41). Its §6 owner questions are on #23.

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

- Dopamine, Subgames & Game Feel (v5.7.0 - v5.10.0):
  - Removed 10-minute minimum Ascension run restriction (`MIN_RUN_SECONDS = 0`).
  - Added Stat Overflow: cascading Super-Crits (Orange) and Hyper-Crits (Violet) across Refinery and Tower attacks.
  - Mining Super-Crits and Shockwaves: 4-tile adjacent AoE detonation on manual mining crits.
  - Excavation Geode Pockets (jackpot tiles): 3% chance to unearth 3x gold cache, 2 random gems, and 30s Oil surge.
  - Active Garden Dewdrop Tapping: clicking growing plots advances crop timer by 5% and splashes oil.
  - Cross-Subgame Synergies: Hydraulic Bore (Oil -> Mining Power), Subterranean Irrigation (Oil -> Garden Growth), Geothermal Warmth (Excavation Depth -> Garden Speed), Botanical Rigging (Harvests -> Pickaxe Power), and Nectar Surge (Harvest -> Oil Windfall).
  - Polish & Bug Fixes: Suppressed Tower combat particles/floats when combat tab is hidden; hid Mana from header until Grimoire is unlocked; isolated Arabic unlock teaser fractions so they read left-to-right (`0/10`); stabilized `test_r52_clicks.js` timing race.

## Noticed (not yet an issue)

- `test_mining.js` failed twice in CI on 2026-10-10 (PR #215: "Frenzy should be active after 7 rapid
  manual hits", then "expected ~5 hits in one tick, got 17") and passed on rerun; still unseeded.
- `test_mining.js` "Frenzy should be active after 7 rapid manual hits" is flaky (about 1 run in 8
  locally, also seen in CI on PR #186); the manual Dig Streak loop depends on something random or
  timing-based.

- `test_mining.js` is flaky (random hits per tick; once 28 vs ~5); fix the seed.
- R64 follow-ups: Al-Wakeel as a Dust-shop item (now only free at record floor 301+), stale i18n
  keys `gear.batch`, `gear.new_weapon`, `gear.new_armor`, rare-find toast spam with auto-salvage Off.
- Mining taps don't spend from the R52 paid-tap bucket yet.

- Never use `git stash` in this repo: the stack is shared by every worktree and other tools; an
  agent popped another tool's art work into the wrong worktree on 2026-10-08.
- Owner: Arabic text doesn't need owner review; don't ask for it in PRs.

- Untapped Garden is ~x3.42 of generator output from Nectar Surge on hand harvests (R60's area).
- Tower 1 h floor is ~65% of target (97 vs 149); starting-kit tuning could fix it.
- `test_mining.js` has a flaky random-hits assertion; `sim/core-pacing.mjs` has no Garden profile.
- Floating texts and sparks spawned outside `feedback.fire` (Garden, Mining finds, combat
  shield/heal, golem row) still bypass the helper; the caps cover them, routing them is R46/R47 work.
- Each particle draws with `save/restore` + `shadowBlur`; that is likely the bigger cost for the
  phone-heat report #106 than the particle count.

- After R31: Talent S2 gives ~10 stars/yr.
- After R52: the Aetherial Strike talent can push active play past x2 over idle.
- After R56: the Salt stamp pays 0 Pages (a paying stamp would move the sim around day 210);
  since R52, Sandstorm takes ~31 h on a fresh idle run.
- [FIXED v5.8] `test_r52_clicks.js` timing flake resolved with 1e-4 tolerance.
- [FIXED v5.10] Arabic unlock teaser labels fraction reversal resolved with isolate wrapper.
- [FIXED v5.10] Header Mana currency hidden until Grimoire is unlocked.
- [FIXED v5.10] Combat floating damage text and particles confined to active Tower tab.
- v5.10.0 strings bypass `t()`: crit labels ('CRIT!', 'SUPER CRIT!', 'HYPER CRIT!') in
  ClickerSystem/CombatSystem/MiningSystem, the Nectar Surge '+n OIL!' text, and the geode toast detail.
- `FRENZY_AUTO_CLICKS` is 0, so the Frenzy auto-click pulse in `ClickerSystem.update` is dead code.

- Hex colours still in `CombatSystem.js`, `MiningSystem.js`, `ShardTreeSystem.js`,
  `js/ui/shardTree.js`, `js/data/names.js` (R35 maps the known ones to theme tokens at runtime).
- Gear levels: amulet (crit cap 50%) and relic (drain cap 30%) hit their caps early on long runs,
  so levels there stop helping (R34).
- Excavation deep down still clears ~0.1 tiles/min in month 2 (R32).
- Tablet (640–1023px) header is crowded (seen in R29).

- Combo and Frenzy timers run on game time, so during Chrono Warp (x5) the 2 s combo window is
  0.4 s (seen in `sim/active-income.mjs`; check whether the real loop does the same).

- R7 starter gifts not built: Rare weapon (Tower), half-filled first contract (Bounties), free
  Cold Vimto brew (Alchemy), free caravan (Bazaar). Save export/import still sits in the Codex
  (roadmap §2.1 rule 5 wants it in Settings).
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
