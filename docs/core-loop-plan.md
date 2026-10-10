# Core-loop redesign: implementation plan

For the session that picks this up. Read in this order: `AGENTS.md`, this file,
`docs/core-loop-redesign.md` (the design; wins where docs differ), `docs/core-loop-reference.md`
(owner directions, decisions, the sim's exact formulas, targets, tuning log). The model the
numbers come from is `sim/redesign/` (`node sim/redesign/run.mjs --assert`, all targets pass on
seeds 1-6).

Nothing of the redesign is in the game on `main` yet.

## 1. Strategy: build dark, switch once

The redesign replaces the economy and most tabs. Shipping it piece by piece would leave players
in half-built states for weeks and break rule 2 (saves) repeatedly. So:

1. **Wave A, dark logic.** Each new system is a **new file** under `js/systems/coreloop/` with its
   own `test_cl_*.js`, pure logic ported from `sim/redesign/model.mjs`. Nothing imports it from the
   live game. PRs carry the `no-changelog` label (players can't notice). These items touch no
   shared file, so they fan out safely.
2. **Wave B, proof.** A sim that drives the **real** new classes (`sim/core-loop.mjs`) must
   reproduce the `sim/redesign` targets. This is the check that the port is faithful.
3. **Wave C, dark UI.** The five screens, built behind a flag (`?loop=2`, off by default), with
   mockups first (rule 7) and Arabic (rule 11).
4. **Wave D, the switch.** One save migration, the old systems retired, MAJOR version, changelog.

`js/main.js`, `index.html`, `js/systems/GameState.js`, `js/engine/migrations.js`, `js/version.js`,
`js/i18n/*.js` and `docs/STATUS.md` are **shared files**: only the items that list them may touch
them, one at a time.

## 2. Where things stand

- **Done (merged):** Wave A, CL-0 to CL-9 (R70-R79), and Wave B, CL-10 (R80). The systems are in
  `js/systems/coreloop/` (the README says what each promises and the order of a loop tick); the
  proof sim `npm run sim:coreloop -- --assert` passes T1-T12 on seeds 1-6 with the real code.
  Owner decision 4 (fewer, bigger Bubbles) is applied (reference tuning log 28).
- **Wave C:** the `?loop=2` preview has its shell and five screens (CL-12…CL-16, R82-R86). No
  mockups (owner, #23): CL-11 is closed. Open: CL-17 (game feel).
- **Wave D go / no-go (the coordinator's call, #23): NO-GO as of 2026-10-10.** The loop passes its
  targets, but a switch would remove the subgames' own play, the trees and shops, spells and
  elixirs, and the non-loop tabs, against the owner's rule (change how the player interacts, never
  remove). **Wave C2 (integration)** closes that gap, R88-R94 (#238-#244): CL-21 Tower, CL-22 Mine,
  CL-23 Oasis as Fields; CL-24 the one tree; CL-25 Tafheet, spells and Brews; CL-26 the sims
  cover the subgames and the tree; CL-27 the Codex hosts the other tabs. **Go** when every current
  tab has a home in the preview and both sims pass T1-T12 on seeds 1-6 with all of it modelled.
- **Owner answers (#23):** Saudi names (table on #23, strings in `js/i18n/coreloop/shell.en.js`);
  old saves convert what fits and archive the rest (a revert must be possible); `sim:check` moves
  to T1-T12 at the switch; no new leaderboard season until a save wipe.
- **Clarity pass** (owner feedback on the preview, 2026-10-10): CL-28 the guide (#253, done: next-step
  bar, staged unlocks, `js/systems/coreloop/Guide.js`), then one item per screen, CL-29 Well (#255),
  CL-30 Fields (#256), CL-31 Refinery (#257), CL-32 Expand and Collection (#258): the same
  mechanics, shown one at a time, in plain words, with a visible answer to every tap. All done
  (2026-10-10), with the tree's view (CL-24). CL-33 (#266, done): the preview's icons as inline SVG, since
  emoji are missing on some machines. CL-34 (#270, done): owner rule, no gate waits on the clock;
  the New Well's timer is removed and the least it pays is 12 Reserves.
- **Filed:** Wave A #204-#213 (R70-R79), Wave B #226 (R80), Wave C #229-#235 (R81-R87) and #253-#258, #266, #270 (R95-R101), Wave C2 #238-#244 (R88-R94), labels
  `roadmap` and `core-loop`. Owner decisions
  are posted on issue #23.
- **Sub-agents are pinned to Sonnet** (`.claude/settings.json`), so the coordinating session does
  the Opus items itself.
- **Merges are squash merges** with a message written by the coordinator: sub-agent commits carry
  a model-name trailer that rule 9 keeps out of `main`.
- **Authority (owner, 2026-10-10):** the coordinating session pushes item branches, opens PRs and
  **merges them itself** once the checks pass and it has reviewed the PR against the issue and the
  sim. It still stops for the owner's go-ahead before Wave D (the switch that changes the live game).
- An earlier attempt at a "Phase 1 Shell" that wired into the live game was cancelled by the owner.
  Don't revive it; if a local branch `core-loop-shell` or a stash of that name exists, leave it.

## 3. Owner decisions needed (ask in issue #23; defaults in brackets)

1. **In-game names and their Arabic** for: Fractions (Gas, Naphtha, Kerosene, Diesel, Bitumen),
   Rigs (Caravan Guards, Pump Jacks, Falaj), Cauldrons (Qidr of …), Compounds, Vials, Charters
   (Wildcatter, Operator, Baron), Seals, Crew, Flare, Pressure, Gusher, Heat. [use these]
2. **Old saves**: convert, never wipe. [gems, stone, gold, scrap, tokens, essences become
   Materials of grade by current depth / floor / species; Golems and Auto-Drills become Rigs;
   Reserves, Shares, Pages kept; talents, shard tree and shop refunded into the one tree]
3. **Year-one sim targets**: the R31 / R57 targets retire with the old economy. [replace
   `npm run sim:check` with the `sim/redesign` targets T1-T12 at the switch]
4. **Bubble volume**: the sim gives ~8,000 a year for a casual player. [retune to roughly a
   tenth as many with bigger effects, in CL-6, with `--assert` still green]
5. **What stays of the three subgames' own mechanics** (boss telegraphs, gear, dynamite, breeding)
   under the Fields frame. [all stay; the Field frame adds frontier, Rigs and Materials on top]
6. **Leaderboard**: a new season at the switch. [yes]

## 4. Items

Model: **S** = Sonnet sub-agent (`roadmap-coder`), spec is exact and the work is one new file.
**O** = Opus (`roadmap-architect`, or the coordinating session itself): cross-cutting design,
BigNum maths, saves, or review-heavy. Each item becomes one GitHub issue `R<n>: …` (label
`roadmap`) when filed; add its row to the Plan table in `docs/STATUS.md`.

### Wave A: dark logic (new files only; label `no-changelog`)

| ID | Item | Model | Depends | Files | Port from `sim/redesign/model.mjs` | Done when |
|---|---|---|---|---|---|---|
| CL-0 | **Contracts** (done on branch `cl-0-contracts`): `README.md` (rules, who writes what, events), `state.js` (saved state with defaults, save / load), `shared.js` (ids, hit levels, RNG, Fraction value, event context), `params.js` (the one copy of the numbers; `sim/redesign/params.mjs` re-exports it) | O | – | `js/systems/coreloop/`, `sim/redesign/params.mjs`, `test_cl_state.js` | `newState`, `rand`, `fracVal`, `params.mjs` | Every later item can be written against it; `test_cl_state.js` round-trips the state through a save and checks the RNG and Fraction value against the sim |
| CL-1 | Presence: hands-on / watching / away, Heat meter, Gusher timer | S | CL-0 | `coreloop/Presence.js`, test | `heatOf`, gusher block of `advance` | States change on input age (30 s); Heat ramps 1→2 over 60 s; Gusher schedule deterministic with injected clock and RNG |
| CL-2 | Fields: frontier, grades, Materials inventory, Rigs (rate, reach, efficiency, presence rates, Away cap) | S | CL-0 | `coreloop/Fields.js`, `coreloop/Rigs.js`, tests | `fieldPower`, `fieldsStep`, `rigRate`, `rigGrade`, `handRateBase`, `addInv`/`takeAtLeast` | Sim's Hands : Watching : Away ratios hold in a unit test; Away never above 45% of Watching |
| CL-3 | Mastery: actions, ranks, Legend ladder and titles, Rig efficiency hook | S | CL-0 | `coreloop/Mastery.js`, test | `addMastery`, `rankThreshold`, `rigEff` | Rank thresholds and title levels match the reference §3.4 |
| CL-4 | Fractions and Orders (3 slots, sizing, refill, weekly Order) | S | CL-2 | `coreloop/Refinery.js`, test | `fracVal`, `postOrders`, `fillOrders`, `weeklyOrder`, `reserved` | Orders cost Materials only; an Order is always fillable from its Field's current Rig grade |
| CL-5 | Vials and Mixer (offers, pity, tiers, recipes, re-makes) | S | CL-2 | `coreloop/Collection.js`, test | `vials`, `mixer`, `buildRecipes` | Odds and pity exposed for the UI; recipes deterministic from a seed table checked into the file |
| CL-6 | Cauldrons and Bubbles (fill per presence, cost curve, families, levels) | S | CL-1, CL-2 | `coreloop/Cauldrons.js`, test | `cauldronFill`, `brew`, `bubbleLevels`, `bubbleEffect` | Fill is in seconds, never Material units; includes owner decision 4 |
| CL-7 | Seals and Crew (monthly opening, time-paced tiers) | S | CL-0 | `coreloop/Seals.js`, test | `sealsStep` | A Seal's tier times match reference §3.5 for Crew 1 and 5 |
| CL-8 | **Well v2**: 8 cascade slots in `BigNum`, exact per-step integration, x2 per 10, generator upgrades by best run, Pressure, Flare | O | CL-0 | `coreloop/Well.js`, test | `wellStep`, `tierRate`, `buyAll`, `maybeFlare`, `unlockGenerators` | Matches `wellStep` to 1e-9 relative on recorded fixtures up to 1e200; no `Number` overflow past 1e308 |
| CL-9 | **Prestige v2**: New Well (log Reserves, 25% rule), New Field gates and choice, Chronicle (record gate, re-blaze), Trials, Charters | O | CL-8, CL-2 | `coreloop/Prestige.js`, test | `maybeNewWell`, `maybeNewField`, `maybeChronicle`, `trials` | Gate values and resets match the reference §3.3 |

CL-1, CL-2, CL-3, CL-7 can run together once CL-0 is merged; then CL-4, CL-5, CL-6; CL-8 and
CL-9 run alongside on Opus.

### Wave B: proof (Opus, the coordinating session)

| ID | Item | Depends | Files | Done when |
|---|---|---|---|---|
| CL-10 | `sim/core-loop.mjs`: drive the real `coreloop/` classes with the `sim/redesign` profiles and target checks | CL-1…CL-9 | `sim/core-loop.mjs`, `package.json` script `sim:coreloop` | All of T1-T12 pass on seeds 1-3; differences from `sim/redesign` explained in the PR |

### Wave C: dark UI (flag `?loop=2`; mockups first)

| ID | Item | Model | Depends | Files | Done when |
|---|---|---|---|---|---|
| CL-11 | Mockups for the 5 screens + style-guide additions (Fraction tower, Order card, Cauldron bar, Rig card, Seal) | O | – (can start now) | `docs/ui/mockups/coreloop-*.html`, `docs/ui-style-guide.md` | Owner approves; desktop and 375 px |
| CL-12 | Shell: flag, 5-tab nav, loop state wired into the game loop and save under a **separate save key** | O | CL-10, CL-11 | `js/main.js` (small), `index.html`, `js/ui/coreloop/shell.js`, `GameState.js` | Flag off = today's game byte-for-byte; flag on = empty new shell that saves and loads |
| CL-13 | Well screen | S | CL-12 | `js/ui/coreloop/well.js`, css | Matches mockup; i18n keys with Arabic |
| CL-14 | Fields screen (Tower / Mine / Oasis switch, frontier, Rig cards, Materials shelf) | S | CL-12 | `js/ui/coreloop/fields.js`, css | same |
| CL-15 | Refinery screen (Fraction tower, Orders, Brewing Hall, Mixer, Vials) | S | CL-12 | `js/ui/coreloop/refinery.js`, css | same |
| CL-16 | Prestige screen (ladder, one tree, Seals, Charters) and Codex | S | CL-12 | `js/ui/coreloop/prestige.js`, `codex.js`, css | same |
| CL-17 | Game feel pass: every L2-L4 moment gets its tier (game-feel guide §7) | S | CL-13…CL-16 | `js/ui/coreloop/feedback.js` | Checklist in the PR |

CL-13…CL-16 can run together (one file each); i18n keys go in per-item files
`js/i18n/coreloop/<item>.{en,ar}.js` that CL-12 sets up, so no two items edit `en.js` / `ar.js`.

### Wave D: the switch (Opus, sequential)

| ID | Item | Depends | Done when |
|---|---|---|---|
| CL-18 | Save migration: old save → core-loop state (owner decision 2), with old-shaped-save tests | CL-12…CL-16, decisions | Every fixture in `test_saves.js` loads; nothing is lost without a stated conversion |
| CL-19 | Switch: flag on by default, old tabs and systems retired, `sim:check` targets replaced (decision 3), MAJOR version, changelog, leaderboard season | CL-17, CL-18 | `npm test`, `npm run sim:coreloop -- --assert`; played on desktop and phone |
| CL-20 | Cleanup: delete retired systems, sims and tests; docs and `STATUS.md` | CL-19 | No dead imports; docs describe the game that exists |

## 5. Rules for this work (on top of AGENTS.md)

- **Port, don't redesign.** If an implementation needs a rule the sim lacks, change
  `sim/redesign/params.mjs` or `model.mjs` in the same PR, run `--assert`, and update
  `docs/core-loop-reference.md` (tuning log). The sim stays the source of the numbers.
- **`BigNum` in the game.** The sim uses doubles (fine to 1e300); the game must use `BigNum` for
  Crude and generator amounts.
- **Deterministic logic.** New systems take the clock and the RNG as arguments (no `Date.now()`
  or `Math.random()` inside), so tests and CL-10 can replay them.
- **No live wiring in Wave A.** A Wave A PR that edits a file outside `js/systems/coreloop/`,
  its test, or its issue's listed files is out of scope.

## 6. Prompts

### 6.1 Coordinator (run the session on Opus)

```
You are the coordinating session for the core-loop redesign of Aetheria.
Read AGENTS.md, docs/core-loop-plan.md (section 2 says where things stand), docs/core-loop-redesign.md,
docs/core-loop-reference.md, js/systems/coreloop/README.md, then docs/STATUS.md. Follow the plan.

1. Start from a clean checkout of main. Check which core-loop issues are open and which have an
   open PR (gh issue list --label core-loop; gh pr list): an item is ready when every item in its
   "Depends on" line is closed.
2. Fan out the ready items per AGENTS.md "Fanning out": one sub-agent per item, each in its own
   git worktree and branch, with a draft PR opened right away. Items marked Sonnet go to the
   roadmap-coder agent; items marked Opus go to the roadmap-architect agent, or you do them
   yourself if sub-agents are pinned to Sonnet. Never two agents on the same files. Use the
   prompt in section 6.2 of the plan for each.
3. For each PR: review it against its issue, the contract README and the sim functions it ports;
   run npm test and the sim --assert yourself; make sure it has the no-changelog label (Wave A).
   When the checks pass and you are satisfied, mark it ready and merge it yourself (I trust your
   review; you don't need to ask). If it is not good enough, send it back to the agent or fix it.
4. After each merge: update docs/STATUS.md (only you edit it), then fan out whatever became ready.
   Keep going through Wave A and Wave B without waiting for me.
5. When a new item needs an issue (Waves B and C), file it as "R<n>: CL-x <name>" with labels
   roadmap and core-loop, in the same format as #204-#213, and add its row to the Plan table.
6. Stop and ask me before Wave D (the switch that changes the live game), before anything that
   deletes player data or old systems, and whenever an owner decision in #23 has no default that
   fits. Otherwise decide, write the decision in the PR, and go on.
7. At the end of the session, leave docs/STATUS.md and section 2 of the plan saying exactly where
   things stand, and tell me what merged, what is open, and what needs me.
Never force-push and never push to main directly: everything goes through a PR.
```

### 6.2 One sub-agent (the coordinator fills the brackets)

```
Implement roadmap issue #[N] "R[n]: CL-[x] [name]" for Aetheria.
Worktree: [path]. Branch: [branch]. Work only there.
Read AGENTS.md, then docs/core-loop-plan.md sections 4 and 5, the issue, and
js/systems/coreloop/README.md (the contract). Your spec is the functions
[list from the "Port from" column] in sim/redesign/model.mjs with the numbers in
sim/redesign/params.mjs and docs/core-loop-reference.md section 3.
Write [files] and nothing else. Logic takes the clock and RNG as arguments. Use BigNum where
the plan says so. Tests in test_cl_[x].js must cover the "done when" line and at least one case
checked against the sim's function with the same inputs.
Open a draft PR at once ("R[n]: CL-[x] [name]", body "Closes #[N]", label no-changelog), then
finish with npm test green. Do not merge it: the coordinator reviews and merges. Do not edit docs/STATUS.md, js/main.js, GameState.js or any i18n
file. Final report: PR link, what you built, test output, anything you were unsure of.
```

### 6.3 Which model, in short

| Work | Model | Why |
|---|---|---|
| CL-0 contracts, CL-8 Well, CL-9 Prestige, CL-10 sim, CL-11 mockups, CL-12 shell, Wave D, every review | Opus | Decisions that every other item depends on; BigNum cascade maths; saves; shared files |
| CL-1 to CL-7, CL-13 to CL-17 | Sonnet | One new file each against a written contract and an executable spec |

`.claude/settings.json` sets `CLAUDE_CODE_SUBAGENT_MODEL` to `sonnet`. If that pins every sub-agent
to Sonnet whatever the agent file says, the coordinating session (started on Opus) does the O items
itself, one after another, and only the S items fan out. Check with one `roadmap-architect` run
before relying on it.
