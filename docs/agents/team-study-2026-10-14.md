# Permanent agents for the three games (study, 14 October 2026)

Games: (1) Aetheria, the live game (`index.html`); (2) the Aetheria core loop preview (`?loop=2`, paused, Wave C2 R88-R94 open); (3) Dig (`proto.html` / `?loop=3`, aimed at YouTube Playables). Evidence: `user_messages.txt` (221 owner messages, 16 sessions), `pain_points.txt`, `spawn_list.txt`.

## 1. Recurring problems

| # | Problem | Evidence |
|---|---|---|
| 1 | Walls found by the owner, not the sim | "cant reach the last generator" (9 Oct); "couldnt go further than level 100", "map 7 is a hard wall" (13 Oct) |
| 2 | Boring, no sense of progress | "so boring and dull ... considering to stop" (11 Oct); "no clear path ... dosent feel natural" (13 Oct) |
| 3 | Features built but not felt | talents, museum, diggers, forge, hard mode, contracts called useless (12-13 Oct), all merged with passing tests |
| 4 | Not clear to a human, cluttered | "?loop=2 its not clear for humans" (10 Oct); "everthing seams to be on top of each other" (13 Oct) |
| 5 | Bugs nobody looked at | "black popup with not text" (11 Oct); "tnt dosent work on boss" (13 Oct) |
| 6 | His PC and usage limits | PC froze, 200+ Chrome, taskkill /IM stopped 8101; 98 spawns, 4 rate-limit prompts, 9 logins in one session |
| 7 | Design spread, asks lost | "one game desgine file", "what happend to the count down i asked" (13 Oct); 24 design files in docs/; briefs only in temp |
| 8 | Wants autonomy, decisions pile up | "dont ask me just build and merge"; every study ends with decisions |
| 9 | Low trust in other tools | agy broke the currency (5 Oct); "i dont turst anyone" (10 Oct) |
| 10 | Corners nobody checks | sound, Arabic, which model sub-agents use |

Pattern: he plays, complains, a study, about 10 builders, the sim says fine, he finds the next wall. He is the only judge of fun, a bot the only judge of pace, nobody looks at the screen as a new player first.

## 2. Angles nobody looked at

Real players (2 so far, telemetry needs 3 for a median); a watched first-time player (a child for the 7-year-old rule); one game at a time (mark active/paused/archived); content is not a cure for a bad curve; briefs in temp (move to `docs/agents/`, `docs/studies/`); YouTube Playables is mostly phones vs "desktop only"; Dig save version/migrations and export; sound mix; one art sheet; Arabic; accessibility (colour-only Rock bar, reduced motion); performance budget (first frame < 2 s, 60 fps with 8 Rafeeqs); return reasons after chapter one; getting players (Playables/itch page and a clip).

## 3. Roster (main session stays coordinator)

| Agent | Owns | Tier | Browser | Code |
|---|---|---|---|---|
| design-keeper | `docs/<game>-design.md` | heavy | no | no |
| idea-scout | `docs/ideas-bank.md`, `docs/studies/` | heavy | web only | no |
| balance-analyst | `docs/pacing-targets.md` | heavy | no | params, sims |
| builder | its PR body | builder | no | yes |
| screen-checker | `docs/seen-on-screen.md` | builder | one at a time | no |
| code-reviewer | `docs/review-checklist.md` | heavy | no | read + gh |
| player-voice | `docs/player-log.md` | builder | no | no |
| release-keeper | `docs/release-checklist.md` | builder | no | small edits |

Drafts in `agents/`, templates in `docs_templates/`. Machine and git rules are in every draft.

## 4. Workflows

- W1 owner playtest round: player-voice logs verbatim; design-keeper turns lines into entries and one decision list with defaults; coordinator asks once (defaults stand after a day); balance-analyst checks numbers; builders (max 4); reviewer; merge; screen-checker plays the merged build; release-keeper checklist; coordinator says what to try first.
- W2 new feature: idea-scout study, owner picks, design-keeper spec, balance-analyst prediction, builder, reviewer, merge, screen-checker, release-keeper.
- W3 balance pass: read code, one sim before and after, update targets.
- W4 weekly pulse (15 min of his time): telemetry + community, real vs sim, top 3 problems, 3 questions.
- W5 release: checklist (+ Playables certification), merge, "Shipped in vX.Y.Z".

## 5. Stop doing

Features to cure "boring" before checking the curve; 10 agents at once; being the only playtester; briefs in temp; `?loop=2` half-switched; one coordinator session for 4 days; decisions one at a time; agy/OpenHands editing the repo without review.

Note: `.claude/settings.json` sets `CLAUDE_CODE_SUBAGENT_MODEL`; check whether it overrides `model:` lines in agent frontmatter before relying on tiers.
