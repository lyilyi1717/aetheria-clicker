# Release checklist

Owner: release-keeper. One row per release. A box is ticked or written as a known gap.
Template: `docs/templates/release-checklist.md`.

## How Dig is versioned (decided in the first run, 14 Oct 2026; the owner may change it)
Dig is player-facing. Evidence: it is published on GitHub Pages (`?loop=3` redirects to `proto.html`), it sends
anonymous play times to Supabase (`proto/features/telemetry/`), it has a "Share my play times" switch, and on
14 Oct the table held 8 real players, 27 sessions, 128 road tries.
- Dig changes go in the same `CHANGELOG` in `js/version.js`, one entry per release wave (not per PR), title starting
  "Dig:". MINOR for a new system or a rebalance of the road; PATCH for fixes.
- Dig PRs stop using `no-changelog` unless the change is truly invisible to a player.
- Telemetry rows carry `VERSION` from `js/version.js`, so a Dig version bump is also what splits the real-player data
  into "before" and "after". Bump when the road or the pace changes.
- Dig strings are English only for now (design decision 5: one Arabic pass when the road is tuned). The Arabic box
  below is a known gap for Dig until then.

## Every release
- [ ] `VERSION` = top `CHANGELOG` entry; written for players (numbers, nerfs said plainly)
- [ ] Arabic: `npm test -- i18n` passes; new keys listed for owner review
- [ ] Old saves: load tests pass; Dig save carries a version
- [ ] `docs/seen-on-screen.md`: every feature of this release "looks right" or listed as a gap
- [ ] Sound: nothing louder than the hit; mute works
- [ ] Merged worktrees and local branches removed; no sim, server or Chrome of this session running
- [ ] App Hub: `hub rescan`, `hub ls clicker`, card titles right
- [ ] Coordinator: `Shipped in vX.Y.Z` on closed issues; STATUS updated

## Dig on YouTube Playables (when the owner decides to ship)
- [ ] SDK loaded first in `proto.html`
- [ ] `firstFrameReady()` and `gameReady()` called
- [ ] Pause / resume honoured; audio follows the system mute
- [ ] `saveData` / `loadData` with local fallback; save size checked
- [ ] Works at phone size (needs the owner to lift "desktop only" for Dig)
- [ ] First frame under 2 s; 60 fps with 8 Rafeeqs

## Releases
| Version | Date | Game | Gaps | Try this first |
|---|---|---|---|---|
| (none shipped under this checklist yet) | | | | |

## First run: against main a5c05b5, 2026-10-14 (no release made)
Version 5.31.1 is the live version. Nothing was bumped.

| Line | Result | Note |
|---|---|---|
| Version = top changelog | pass | 5.31.1 = top entry (9 Oct). |
| Changelog covers Dig | FAIL | No Dig entry. About 66 Dig PRs since 11 Oct (#297 to #388) shipped as `no-changelog`. A draft entry is in the PR description for the owner. |
| Arabic, Aetheria | pass | `test_r37_i18n.js`: 4055 checks, 2307 keys, 465 data keys, no gaps. |
| Arabic, Dig | gap (known) | 1961 English strings in `proto/features/*/strings.js` and `proto/ui/strings.js`, 0 Arabic. Decision 5 says one pass later. Nicknames carry Arabic as data. |
| Old saves, Aetheria | pass | `test_saves.js` is part of `npm test`. |
| Old saves, Dig | partial | The save carries `v` (SAVE_VERSION 2) and per-feature `fv`. Covered: stamp without `bank` (`test_proto_gatememory.js`), Hard medal without chili count (`test_proto_contracts.js`), no `bossFem` (`test_proto_countdown.js`), many slices. Gaps below. |
| Seen on screen | FAIL | #401 (coin counter hidden under the Museum chip), #402 (banked text and Done here overlap Tips), #403 (chili pips and banner), plus Museum edge arrow not reachable and the first-five-minutes confusion. |
| Sound | not checked | Needs a listener; no browser run allowed in this pass. |
| Cleanup | gap | See the cleanup list in the PR. Nothing killed or removed. |
| App Hub | gap | Dig game has no card of its own; sound test and progression study do. |
| Playables | FAIL (not shipping yet) | No `ytgame` anywhere in `proto.html` or `proto/`. Fails: SDK, first frame, game ready, pause/resume, audio sync, cloud save. Layout is 640x680 desktop; phone is off by decision 1. |

### Dig old-save gaps found
- No test loads a Dig save written before `legs`/leg state existed with a run in progress (only the leg maths is tested in `test_proto_countdown.js`).
- Chili: only a Hard medal without a pip count is covered; a save made before chili existed with a half-run in `contractRun` is not.
- No test pins a literal old-shaped JSON from each recent release; tests build the old shape from a fresh state by deleting fields. A frozen v2 fixture would catch a changed default.
- SAVE_VERSION is still 2; `fv` per feature is not checked by a test for "feature version missing".
