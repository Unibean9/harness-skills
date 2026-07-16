---
name: hs-ship
description: Run final readiness checks (every task done, verify green, diff matches the spec's scope) and only then prepare a commit, PR, or push — always with explicit human confirmation, never automatically. Use this when a user says the work looks done, asks to commit/ship/open a PR, or when every task in the active spec's plan.md is checked off. This is a hard gate — it does not relax even when every automated check is green.
compatibility: bundled script needs a POSIX shell (bash) and git — available via Git Bash on Windows, native on macOS/Linux
---

# hs-ship

## Why this phase exists

Everything upstream of this phase — spec, plan, build, verify — can be
completely correct and it still isn't this agent's call whether to publish the
result. Committing, pushing, and opening PRs are visible to other people and
hard to fully undo. That's a different category of action from editing a local
file, and it gets a different rule: a human confirms it, every time, no
exceptions for "but the tests are green."

## Process

1. Read `.harness/state/current-spec` to get the selected `<active>`.

2. **Optionally, delegate a scouting pass** (see `.agents/agents/hs-scout.md`)
   if this project's commit/PR conventions aren't already known: "does this
   repo have a CONTRIBUTING guide, commit message convention, or PR template?"
   Match the draft in step 4 to whatever it finds.

3. Run the readiness check:

   ```bash
   node .agents/scripts/check-ship-ready.mjs
   ```

   This fails closed — it checks that `.harness/specs/<active>/progress.md`
   has no unchecked tasks left, that `.harness/state/verify-all.status` says
   `PASS`, and that it actually exists (i.e., `hs-verify` really ran,
   recently, not from a stale memory of an earlier pass).

4. If it reports NOT READY, stop here and fix whatever it flagged — go back to
   `hs-build` or `hs-verify` as appropriate. Don't route around this check by
   shipping anyway "because it's probably fine."

5. **Review the actual diff against the spec.** Run `git status` / `git diff
   --stat` and confirm nothing outside the plan's stated files got swept in.
   Unrelated changes in a shipped diff make review harder for whoever reads it
   next and can hide an unintended side effect.

6. **Draft** the commit message / PR description — summarize what changed and
   why, referencing the spec's goal, not a blow-by-blow of every edit.

7. **Present the draft and stop.** Show the user the diff summary and the
   drafted message, then explicitly ask before running any of: `git commit`,
   `git push`, opening a PR, merging. Wait for their answer. A prior approval
   of the plan is not approval to ship — those are different decisions made at
   different times with different information.

8. Only after explicit confirmation, run the agreed action. Report back what
   actually happened (commit hash, PR URL, etc.) so it's on the record.

9. Update this spec's row in `.harness/specs/INDEX.md`: `Phase` = `shipped`,
   `Updated` = today's date. This is what tells the next `hs-brainstorm` run
   that this spec is done and a new feature gets a new directory, not a reuse
   of this one.

## Exit condition

- `check-ship-ready.sh` reports READY.
- The human has explicitly confirmed the specific ship action taken.
- The spec's `INDEX.md` row says `shipped`.

## Common failure modes

- Treating a green `hs-verify` as implicit permission to push — it's evidence
  the code works, not consent to publish it.
- Bundling in an unrelated fix or cleanup "while I'm here" at the last minute,
  after the diff was already reviewed against the plan.
- Re-running only part of `hs-verify` after a last-minute tweak instead of the
  whole suite — a partial rerun can miss an interaction the tweak introduced.
- Forgetting to mark the spec `shipped` in `INDEX.md` — the next `hs-brainstorm`
  run has no way to tell this feature is actually done otherwise.
