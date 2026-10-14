# Pacing targets

Owner: balance-analyst. Per game. A real median needs 3 or more players.

## Dig
| Milestone | Target | Sim (mixed, 2 seeds) | Real median (players) | Last checked |
|---|---|---|---|---|
| First Big Rock broken | 3-5 min | | | |
| Level 1 Gate | | | | |
| Level 7 Gate | | | | |
| Share of content seen at 1 h / 1 day / 1 week | | | | |
| Hits per block, mid-leg, at expected pick | 2-6 (never above 8) | | | |
| Tries per Gate | about 1.1 early, under 3 late | | | |

### Known walls
| Where | Cause (the numbers) | Fix | State |
|---|---|---|---|

## Aetheria (live) / Core loop (?loop=2)
(same table; sims `sim/core-pacing.mjs`, `sim/redesign/run.mjs --assert`)

## Tuning log (newest first)
| Date | Param | From -> to | Why | Before / after |
|---|---|---|---|---|

## How to run (frugal)
One sim at a time, redirected to a file, read only the summary lines:
`node sim/proto/dig-month.mjs --only mixed --seeds 2 > out.txt` (3 workers; never raise `--jobs`).
