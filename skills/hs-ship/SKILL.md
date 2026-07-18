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

1. Inspect `git status`, the diff, and the verification summary. Confirm the
   change matches user scope and disclose skipped checks or known limitations.
2. Choose the smallest appropriate handoff: summary, commit, PR, push, release
   preparation, or no external action yet.
3. Ask for explicit approval before committing, opening a PR, pushing, tagging,
   publishing, or triggering other side effects—unless the user already gave
   unambiguous authority for that exact action.
4. Execute only the approved action and report its identifier or link. If an
   opt-in hook blocks it, show the policy result and gather missing evidence;
   do not bypass it.

## Exit condition

- The diff and available verification evidence were reviewed.
- Any external action has explicit user authorization.
- The handoff reports what happened, what remains, and any limitation.

## Common failure modes

- Committing unrelated generated files or another task's changes.
- Treating an old verification result as proof after meaningful edits.
- Assuming a request to “finish” authorizes a push or release.
