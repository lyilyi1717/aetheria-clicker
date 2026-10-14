# Release checklist

Owner: release-keeper. One row per release. A box is ticked or written as a known gap.
Template: `docs/templates/release-checklist.md`.

## How Dig is versioned (decided in the first run, 14 Oct 2026; the owner may change it)
Dig is player-facing. Evidence: it is published on GitHub Pages (`?loop=3` redirects to `proto.html`), it sends
anonymous play times to Supabase (`proto/features/telemetry/`), it has a "Share my play times" switch, and on
14 Oct the table held 8 real players, 27 sessions, 128 road tries.
- Dig changes go in the same `CHANGELOG` in `js/version.js`, one entry per player-visible PR (changed 14 Oct, see
  decision D4 below), title starting "Dig:". MINOR for a new system or a rebalance of the road; PATCH for fixes.
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

## Decisions of 14 October 2026 (release-keeper)
Each is Decided, with the reason. Publishing anywhere stays the owner's to approve.

### D1. YouTube Playables vs desktop only: Decided
- Desktop only now (design 9.1 default (a) stands). Playables is the target after design work order 1 to 3 is done AND
  at least 3 real players (one a child, watched) have played the road, because Playables is mostly phones and a
  phone layout is a second product. A phone layout needs the owner to lift "desktop only" for Dig.
- Prepare now (no publishing, no behaviour change on desktop), as option (c): a thin `proto/platform.js` wrapper
  with `firstFrame()`, `ready()`, `onPause(fn)`, `onResume(fn)`, `onMute(fn)`, `saveData(str)`, `loadData()`; every
  call is a no-op when `ytgame` is absent. Save goes through one `store` function so cloud save is a swap, not a
  hunt. Keep the whole save well under the Playables size limit (the budget in D3 is 1 MiB; confirm the platform limit
  from `proto/YOUTUBE_PLAYABLES.md` when B1 is built).
- Reason: the hooks are cheap and testable now; the layout and the listing are not, and a phone-first release before
  the road is tuned would spend the first impression.
- Builder brief B1 below.

### D2. Dig save safety: Decided
- Do design 9.2 (b): export/import plus frozen old-save tests. Cloud save waits for Playables (D1).
- Export is a text code (the save JSON, compressed, base64, with a short check sum) shown in Settings with Copy and
  Paste-to-load. Import must refuse a code that fails the check sum or is newer than `SAVE_VERSION`, and must keep the
  current save until the new one has loaded (never delete player data on a bad import). Loading runs the normal
  migrations.
- Frozen fixtures are the only way to catch a changed default, so they are a release box from now on: each release
  that changes any saved field adds a literal JSON file under `test_fixtures/` and never edits an old one.
- Builder briefs B2 and B3 below.

### D3. Accessibility and performance: Decided
- Design 9.12 (a). A "Reduce motion" switch in Dig Settings. Default follows the browser's `prefers-reduced-motion`;
  the player's choice wins and is saved. When on: no screen shake, no flashes above 3 per second, no particle bursts
  bigger than 8, no big pulsing banners. Numbers, sound and rules are unchanged (no gameplay change).
- Budget: first frame under 2 s on the owner's machine with a cold cache; 60 fps (frame time p95 under 20 ms) over a
  30 s run with 8 Rafeeqs on the deepest land; save under 1 MiB.
- Checked: at every release by release-keeper (a number in the row), and once more before Playables. Measured by a
  headless script, one heavy process at a time; if it cannot be measured, the row says "not measured", never "pass".
- Builder briefs B4 and B5 below.

### D4. Changelog practice and telemetry default
- Changelog: Decided, confirmed per player-visible PR, not per wave. Reason: that is the repo rule (AGENTS.md rule 10),
  CI enforces it, and telemetry rows carry `VERSION`, so a bump per road or pace change keeps real-player data
  separable. The first-run line "per wave" is withdrawn. Entries start "Dig:", give numbers players notice, say nerfs
  plainly; `no-changelog` only if a player cannot notice. Docs-only PRs skip it.
- Telemetry default: RECOMMENDATION, shared with design-keeper, not final (a design and privacy call, the owner can
  overrule). Recommend OFF by default on the public page and on any child-facing build (Playables, itch), ON only for
  builds the owner hands to people he knows (a link flag such as `?share=1`), with the same Off switch. Reason: the
  game is pitched at children; the data is anonymous (random id, play times, no text), which is good, but a switch that
  is on by default asks children to opt out of something they cannot judge, and a children's audience raises consent
  rules in some countries. Cost: fewer sessions; the owner's share link (design 9.4) is the way to the 3 players needed
  for a median. The switch wording must stay plain. Marked for design-keeper to confirm or overrule.
- Brief B6 (only if the owner accepts).

### D5. Flaky `test_proto_registry.js` on Windows: Decided (cause not proven)
- Read the file and ran it 3 times alone here: all pass. The checks use a fixed seed, no timers or clocks (`savedAt`
  is removed before comparing), and write nothing, and `run_tests.mjs` runs one file at a time. So the flake is
  probably not in the maths. What it does depend on is the checkout on disk: the last block reads `proto/features/`
  with `readdirSync` and checks every folder is listed in `features/index.js` and every file for DOM words and emoji.
  Another session switching branch or adding a feature folder in the same checkout while `npm test` runs, or a Windows
  file lock (antivirus) on a read, would fail it, and it would pass alone and in CI. Both fit "twice today, many
  agents at work". Not proven because the failing line was not kept.
- Decision: do not retry or loosen the test. First make the next failure name its line: brief B7.

## Builder briefs
Each is one PR, own worktree, tests included, `npm test` green, Dig changelog entry if a player can see it.

**B1. Platform wrapper (no behaviour change).** Done when: `proto/platform.js` exports the seven functions in D1, all
no-ops without `ytgame`; `proto.html` calls `firstFrame()` at the first draw and `ready()` once the save is loaded;
pause/resume stop and start the step loop and sound; save and load go through one function; a test fakes `ytgame` and
checks each call happens once and that without it nothing throws; no change on desktop; a test logs the save size and
fails over 1 MiB. Does not publish or add a phone layout.

**B2. Export / import.** Done when: Settings has Export (shows and copies the code) and Import (paste, preview line
"Level N, X Stars, saved date", confirm); bad, truncated or newer-version codes are refused with a plain message and
the current save is untouched; a good code loads through migrations; a round-trip test (state to code to state is
equal after `deserialize`); all text through the Dig strings file. No gameplay change.

**B3. Frozen old-save fixtures.** Done when: `test_fixtures/` holds literal JSON saves at SAVE_VERSION 2 as of today
(fresh, mid-road, with a Hard medal) plus hand-made old shapes: no per-feature `fv`, no `legs`, a pre-chili save with
a half-run in `contractRun`; `test_proto_savefixtures.js` loads each, runs 200 steps, re-saves, and checks no throw,
no NaN, Stars not lost, and that a missing `fv` runs the feature's migration from 0 once. A comment says "add one
fixture per release that changes a saved field; never edit an old one". Fixtures hold no player data.

**B4. Reduce motion.** Done when: the switch in D3 exists in Settings, defaults from `prefers-reduced-motion`, is
saved, and each effect named in D3 is gated by one `motion()` check in the UI layer (rules untouched); a test checks
the default follows the media query and the choice persists; a row is added to `docs/seen-on-screen.md`.

**B5. Budget check script.** Done when: a script prints first-frame ms, p95 frame ms over 30 s with 8 Rafeeqs, and
save bytes, and exits 1 over the D3 budget; it starts one browser and ends it by PID. Not part of `npm test`.

**B6. Telemetry default (only on the owner's yes).** Done when: telemetry sends nothing until the switch is on or
`?share=1` is in the link; the switch wording is plain; the telemetry test is updated; the changelog says it.

**B7. Make the flake show itself.** Done when: `test_proto_registry.js` prints, for any thrown error, the file path
and error code, and its last block prints the folders it found; `run_tests.mjs` on a failure prints the failing file's
last 20 output lines again at the end. No check is loosened. If the next flake is the directory listing, the fix is
to read the list from `git ls-files proto/features`, and sessions run `npm test` only in their own worktree.

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
