# Working on Aetheria (read this first)

This file is for every AI coding session (Claude, Codex, Gemini, Cursor, ...) and for humans.
Sessions do not share memory: everything you need is in this repo and its GitHub issues.

## What this is

**Aetheria: Chronicles of Eternity** is a browser idle/clicker game in vanilla JS (ES modules,
no build step). The goal is a fun, rewarding idle game that keeps a player looking forward to
something new for a full year.

- Entry: `index.html` → `js/main.js` (UI wiring, tabs, render loop)
- Engine: `js/engine/` (`BigNum`, `GameLoop`, `SaveManager`, audio, particles)
- Game systems: `js/systems/` (one class per system; `GameState.js` holds all saved state)
- Styles: `css/`

## The plan

- **Spec:** `docs/redesign-proposal.md`. The roadmap is §9 (items 1–20, called R1–R20, plus R0
  save versioning); the open questions are §10.
- **Tasks:** one GitHub issue per roadmap item, labelled `roadmap`, titled `R<n>: ...`. Each issue
  says the goal, spec section, files, dependencies, and "done when". The R-number is not the
  GitHub issue number; the table in `docs/STATUS.md` maps them.
- **Line numbers** in the doc and issues were correct when written and drift as code changes.
  Find the code by the function or constant name; don't trust the number.
- **Owner decisions:** issue #23. If a question there has no answer, use its listed default.
- **Progress log:** `docs/STATUS.md`. Read it at the start, append to it at the end.

## Starting a session

If you were told "do issue #N", do that. If you were told "pick the next task":

1. Read `docs/STATUS.md` (what's in progress, what's next).
2. Take the lowest-numbered open `roadmap` item whose dependencies are closed and that nobody
   is working on (no open PR linked to it, not listed under "In progress" in STATUS.md).
3. Add it under "In progress" in `docs/STATUS.md` in your first commit, push, and open a **draft
   PR** with `Closes #<issue>` right away. Other sessions work on other branches and can't see
   your STATUS.md edit; the open draft PR is how they know the item is taken.

## Rules

1. **One issue per PR.** Title: `R<n>: <short description>`. Body: `Closes #<GitHub issue number>`.
   Don't fix unrelated things; note them in STATUS.md under "Noticed" instead.
2. **Never break existing saves.** Players have saves in `localStorage` (`AETHERIA_CHRONICLES_SAVE_V1`).
   New state fields need defaults in `GameState`; `deserialize` must accept saves that lack them.
   Saves carry `version`. If you change the meaning of a saved field, append a step
   `{ to: n + 1, migrate(data) }` to `MIGRATIONS` in `js/engine/migrations.js` (the version bumps
   with it; never edit a shipped step) and add a test that loads an old-shaped save (see
   `test_saves.js`).
3. **Tests must pass:** `npm test`. Add tests for new logic next to the existing `test_*.js`
   files and add them to the `test` script in `package.json`.
4. **Economy changes need numbers.** If you touch production, costs, prestige, spells, or offline
   gains, run `npm run sim` before and after and paste both reports in the PR. If the sim no
   longer models the game (new layer, new shop), update `sim/core-pacing.mjs` in the same PR.
5. **The doc is the source of truth.** If you deviate from `docs/redesign-proposal.md` (numbers
   didn't work, better idea), update the doc in the same PR and say why.
6. **Keep `js/main.js` edits small.** It's shared by every task. Put new UI in a new file under
   `js/ui/` (or the system's own file) and import it, rather than growing `main.js`.
7. **Must work at phone width.** Any new UI: check at ~375px wide as well as desktop.
8. **No dark patterns.** No punishing absence, no fake scarcity, no pay-to-skip.
9. Don't put AI model names in commits, code, or docs.

## Before you finish

- [ ] `npm test` passes
- [ ] `npm run sim` before/after in the PR (economy changes only)
- [ ] Old save still loads (if state changed)
- [ ] UI checked in a browser, desktop + phone width (UI changes only): `npm start`, open http://localhost:8101
- [ ] `docs/STATUS.md`: move your item to "Done", add 1–3 lines of notes for the next session
- [ ] PR opened with `Closes #<issue>`

## Commands

```bash
npm test          # all unit tests
npm run sim       # core pacing report for a simulated year (~5 s)
npm run sim:check # same, but exits 1 if the year-one pacing targets are missed
npm start         # local server on http://localhost:8101
```
