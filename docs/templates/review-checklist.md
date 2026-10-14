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

## Lines added after a miss
| Date | Line | Bug it would have caught |
|---|---|---|
