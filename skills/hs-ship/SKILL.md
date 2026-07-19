---
name: hs-ship
description: Prepare a verified change for commit, PR, push, or release while preserving explicit human control over external actions. Use when the user asks to ship or when a change is ready to hand off.
---

# hs-ship

Shipping is a human-authorized action, not an automatic final phase. Review
the diff and evidence with native Git/project tools. Optional provider hook
companions may add policy checks if deliberately installed; portable skills
remain usable without them.

## Process

1. Delegate ship-readiness legwork to the `hs-shipper` subagent (see
   `docs/agents.md`): uncommitted-changes summary (`git status`/`git diff`,
   flagging anything unrelated to the current change), relevant check results
   (PASS/FAIL/skipped), and a drafted commit message following the project's
   convention. If no subagent mechanism is available, do this inline instead.
2. Review hs-shipper's report yourself — it hands back evidence, not a
   decision. Confirm the change matches user scope and disclose skipped
   checks or known limitations; don't treat its report as authorization to
   proceed.
3. Choose the smallest appropriate handoff: summary, commit, PR, push, release
   preparation, or no external action yet.
4. Ask for explicit approval before committing, opening a PR, pushing, tagging,
   publishing, or triggering other side effects—unless the user already gave
   unambiguous authority for that exact action. hs-shipper never asks the user
   or executes these itself; that stays the main agent's job.
5. Execute only the approved action (using hs-shipper's drafted commit message
   as a starting point, not verbatim if it doesn't fit) and report its
   identifier or link. If an opt-in hook blocks it, show the policy result and
   gather missing evidence; do not bypass it.

## Exit condition

- The diff and available verification evidence were reviewed.
- Any external action has explicit user authorization.
- The handoff reports what happened, what remains, and any limitation.

## Common failure modes

- Committing unrelated generated files or another task's changes.
- Treating an old verification result as proof after meaningful edits.
- Assuming a request to “finish” authorizes a push or release.
- Treating hs-shipper's report as if it were the user's approval to commit,
  push, or open a PR — it is evidence for you to review, not a green light.
