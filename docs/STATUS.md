# Status

Progress log for the year-one redesign (`docs/redesign-proposal.md`). Every session reads this
first and updates it before finishing (see `AGENTS.md`).

Roadmap items are called **R0–R20**. GitHub numbers issues separately, so R*n* is issue #*n*+2.
Owner decisions live in issue #23; if it has no answer, use the default listed there.

## In progress

_(none)_

## Next up

**Wave 1** (independent, can run in parallel): R1 #3, R2 #4, R3 #5, R12 #14.

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
| 3 | R6 Dust shop of features | #8 | R0, R4 |
| 4 | R7 Progressive unlocking | #9 | R6 |
| 4 | R8 Void Tower rebalance | #10 | – |
| 4 | R9 Talent economy | #11 | R0 |
| 4 | R10 Contract board | #12 | R9 |
| 4 | R11 Reward feedback system | #13 | – |
| 5 | R13 Shard tree | #15 | R4 |
| 5 | R14 Codex 2.0 | #16 | R11 |
| 5 | R15 Daily and weekly structure | #17 | R13 |
| 5 | R16 Bazaar prices and caravans | #18 | – |
| 5 | R17 Garden breeding and recipes | #19 | – |
| 5 | R18 Wardens, relics, ore, polishing | #20 | R8 |
| 5 | R19 Leaderboard Season 2 | #21 | R8 |
| 5 | R20 Chronicle layer | #22 | R4, R13 |

## Done

- Redesign proposal written (`docs/redesign-proposal.md`).
- Project setup: `AGENTS.md`, `CLAUDE.md`, this file, `sim/core-pacing.mjs` (`npm run sim`),
  CI checks (`.github/workflows/checks.yml`), issues #2–#23.
- R0 #2 Save versioning: `js/engine/migrations.js` holds the ordered `MIGRATIONS` chain;
  `GameState.deserialize` (and so save import) runs `migrateSave`. Tests in `test_saves.js`.

## Notes for the next session

- Save format changes: add a step to `MIGRATIONS` in `js/engine/migrations.js` and an old-shape
  fixture to `test_saves.js`. Current `SAVE_VERSION` is 2.
- Pacing baseline (today's game, casual profile): first Ascension 10 min, 12 Ascensions on day 0,
  16 in the whole year, longest stretch with no reset 139 days. `npm run sim:check` fails on
  purpose until R4; CI only reports it for now.

## Noticed (not yet an issue)

- Save import merges into the running state: `deserialize` spreads `inventory`, `stats` and
  `settings` over the current values, so keys the imported save lacks keep the old game's values.
- Mining still runs its own schema-gated migration (`MiningSystem.migrateMiningGrid`,
  `miningGrid.schema`) outside the `MIGRATIONS` chain. It works; folding it in is optional.
