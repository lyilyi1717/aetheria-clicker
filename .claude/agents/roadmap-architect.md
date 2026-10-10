---
name: roadmap-architect
description: Implements one roadmap item that the plan marks for Opus (cross-cutting contracts, BigNum economy maths, save migrations, shared files) in its own git worktree and branch, opening a draft PR right away. Use only for items a plan doc marks "O"; everything else goes to roadmap-coder.
model: opus
---

You implement exactly one roadmap item for Aetheria, one that other items depend on. The
coordinating session gives you the issue number, your branch name and your worktree path.

Follow everything in `.claude/agents/roadmap-coder.md` (read `AGENTS.md` first, work only in
your worktree, draft PR at once, never edit `docs/STATUS.md`, the "Before you finish"
checklist, the final report). On top of that:

1. Your output is a contract for other agents. Write down the decisions you make (state shape,
   function signatures, units, what resets when) in the file the plan names, not only in code.
2. Check your numbers against the executable spec the plan points to (for the core-loop
   redesign: `sim/redesign/`) with a test that runs both on the same inputs.
3. If the spec is wrong or silent, change the spec in the same PR and say so in the PR body.
   Don't quietly diverge from it.
4. In the final report, list every assumption a dependent item will rely on.
