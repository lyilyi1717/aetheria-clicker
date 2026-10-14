# Review checklist

Owner: code-reviewer. Add a line whenever a bug reaches the owner that this list would have caught (say which).

## Every PR
- [ ] The diff does what the issue and its design entry's "done when" say, and nothing else
- [ ] Files touched are inside the package the brief named
- [ ] New saved state has defaults; an old-shaped save loads (a test proves it); changed meaning has a migration step
- [ ] Strings through `t()`; Arabic present (Aetheria) or Arabic-ready, no glued words (Dig); logical CSS
- [ ] No emoji; icons drawn
- [ ] No gate on the clock; nothing expires; nothing punishes absence
- [ ] Every addition changes what the player sees or does (not only a number)
- [ ] Tests have real assertions; `npm test` passes
- [ ] Economy change: sim before / after in the PR
- [ ] `js/version.js` bumped with a player-facing entry, or `no-changelog` label
- [ ] No AI model names, no generated-by lines in commits, code, docs or PR text
- [ ] No process left running by tests or sims; workers have a time limit
- [ ] A popup / toast always has text; nothing overlaps the dig area (from owner reports, 11 and 13 Oct)

## Dig: rules and page
- [ ] A rule outcome (pay, par, medal, hp) is decided in a rules step with `rnd()`, never in a draw or page tick, never with `Math.random`
- [ ] A multiplier read from the run (`s.run`) says which Rock it is for: every Big Rock of the level, or only the Gate
- [ ] Nothing saved grows with every try or every hit: no ids built from changing numbers in `s.seen`, logs capped
- [ ] The same thing on screen in two places shows the same number in the same unit
- [ ] No fragment string with a leading space or a word glued into another sentence (`'{a}{hit}'`); one key per whole sentence
- [ ] A page tick (10 a second) does no whole-state copy or long loop; work keyed on a value that changes every tick is not cached
- [ ] Every `setTimeout`, `requestAnimationFrame`, listener and canvas loop a screen starts is stopped when it closes
- [ ] Telemetry: client batch sizes fit the server's per-minute limits; nothing personal; no send from test, sim, speed or local pages

## Lines added after a miss
| Date | Line | Bug it would have caught |
|---|---|---|
| 14 Oct 2026 | Rule outcome decided in a rules step | The manager's extra seconds (they count toward the Fast medal) are granted from the draw code with `Math.random` (#378) |
| 14 Oct 2026 | Multiplier says which Rock | `sites.gateMul` sizes every Big Rock of a road level, though the design says the Gate (#386) |
| 14 Oct 2026 | Nothing saved grows with every try | The Gate-memory lesson writes `seen['gate:<key>:<bank>']` into the save once per try (#375) |
| 14 Oct 2026 | Same number in the same unit | Goal bar says "Break the Gate: N hits" (pick only) beside the Rock bar's "about M swings" (#387) |
| 14 Oct 2026 | Telemetry batch fits the limits | 50-row batches against 12 / 60 per minute: rows past the limit are dropped by the server and deleted by the client (#379, #384) |
