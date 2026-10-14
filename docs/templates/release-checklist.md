# Release checklist

Owner: release-keeper. One row per release. A box is ticked or written as a known gap.

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
