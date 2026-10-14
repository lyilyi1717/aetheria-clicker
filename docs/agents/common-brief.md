# Common brief for every agent

Read this before any task, with `AGENTS.md`. The permanent agents are in `.claude/agents/`; how they work together is in `docs/agents/team-study-2026-10-14.md` (workflows W1 to W5). Studies go in `docs/studies/`, never only in a temp folder.

## The machine (the owner's PC froze and restarted on 13 Oct 2026)
- One heavy process at a time. Never two sims at once, never a sim in the background, never `--jobs` above 3.
- Sims through a summary script; read one line per run, never a whole report.
- At most one headless Chrome in the whole session, only through the shot driver `node scripts/shot.mjs <url> <script.js> [out.png]` (it kills its own Chrome), and only screen-checker uses it.
- Dig month sim: `node sim/proto/dig-month.mjs --only mixed --seeds 2 --jobs 2 --sum --dump <file>`, then `node scripts/dig-levels.cjs <file>` for days and tries per road level. Real players: `node sim/proto/player-stats.mjs [--choices|--pace] [--vs <file>]`.
- Never kill a process by name (`taskkill /IM ...`). Stop only what you started, by PID or port.
- Never touch the server on port 8101 and never use `localhost` (the owner's save); use 127.0.0.1 and your own port.
- Before reporting, list what you started and confirm each has ended.
- Coordinator: at most 4 agents at once; 2-3 if any runs sims.

## Git
- Own worktree and branch per agent; draft PR at once; never merge your own.
- Never `git stash`, never force-push, never `--no-verify`, never push to `main`.
- Never commit the owner's untracked files (`proto/YOUTUBE_PLAYABLES.md`, `scratch/`).
- No AI model names and no generated-by lines in commits, code, docs or PR text.
- If a command is denied, do not route around it; note it and continue.

## The games
| Game | Entry | Design file | State |
|---|---|---|---|
| Aetheria (live) | `index.html` | `docs/redesign-proposal.md` | maintenance |
| Core loop | `index.html?loop=2` | `docs/core-loop-redesign.md` | paused |
| Dig | `proto.html` / `?loop=3` | `docs/dig-design.md` | active |

## Design rules (all games)
No clock gates; nothing expires; nothing punishes absence; no fake scarcity; no pay-to-skip. Every addition
changes what the player does or sees. Words a 7 year old knows; no emoji; Arabic-ready. Desktop only unless
the owner says otherwise. Old saves always load. Simplify by changing how a feature is used, not by removing it.
