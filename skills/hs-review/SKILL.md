---
name: hs-review
description: Get an independent, structured review of the verified diff — correctness, security, performance, quality, and test coverage — before it ships. Use this once hs-verify has produced a valid attestation and right before hs-ship, or any time a user asks for a second opinion on a diff. Advisory, not a gate — hs-ship does not require this phase to have run.
---

# hs-review

Use the project-local runtime as `npm exec -- hs`; review the real diff, not a summary of it.

## Why this phase exists

`hs-verify` proves the change works; it says nothing about whether the change
is *good* — clean, secure, free of duplication, actually testing what matters.
The agent that just implemented the change is structurally the worst reviewer
of it: it already believes its own decisions, and it's blind to exactly the
assumptions it made along the way. This phase exists to put a second,
independent pass between "it works" and "it ships" — one that reads the diff
cold, without the accumulated justification for why each line looks the way
it does.

Unlike every other phase, this one is **advisory**: it doesn't write an
attestation, and `hs-ship`'s readiness check doesn't require it to have run.
A team in a hurry can ship straight from a valid `hs-verify` attestation. The
value here is a habit worth having, not a gate worth enforcing — a
blocking review gate just becomes a rubber stamp the moment it's inconvenient.

## Process

1. Read `.harness/state/current-spec` to get the selected `<active>`. Confirm
   `npm exec -- hs attest validate` prints `VALID` — this phase reviews a
   change that's already known to work, not one still being debugged. If
   it's not valid yet, that's a signal to finish `hs-verify` first, not a hard
   stop — proceed anyway if the user specifically wants a look at
   work-in-progress.

2. **Dispatch the review to hs-reviewer** (see `docs/agents.md#hs-reviewer--independent-code-review-subagent`), not the
   same context that implemented the change — a fresh subagent invocation,
   even on the same model. Hand it:
   - the diff: `git diff --stat` plus the full working-tree diff (or
     `git diff <commit-before-hs-build>...HEAD` if the plan recorded a
     starting commit) — the actual change, not your account of it
   - the spec's requirements and acceptance criteria, and the plan's task list
   - nothing else — let it form its own read of the diff, not a summary of
     what you believe it does

3. **Triage the findings it returns**, one axis at a time (correctness,
   security, performance, quality, test coverage):
   - `blocker`: fix it now, in this same phase, then re-run the relevant
     `hs-verify` checks that the fix could affect — don't re-attest without
     re-verifying, a fix can break what previously passed.
   - `should-fix`: fix it if it's small; otherwise record it under
     `## Deferred` in `implement-notes.md` with a one-line reason and get the
     user's sign-off that deferring is acceptable.
   - `nit`: fix inline if trivial, otherwise ignore — don't let a nit list
     balloon into unplanned scope.

4. **Record the outcome** in `.harness/specs/<active>/progress.md`:

   ```markdown
   ## Review (<date>)
   - blockers: 0 found, 0 open
   - should-fix: 2 found, 1 fixed, 1 deferred (see implement-notes.md)
   - nits: 3 found, 3 fixed
   ```

   This is what lets `hs-ship` (and the session digest) tell "reviewed, clean"
   apart from "never reviewed" without re-running anything.

5. Update this spec's row in `.harness/specs/INDEX.md`: `Phase` = `reviewing`.

6. If a `blocker` fix changed behavior, don't just move on — rerun the
   affected `hs-verify` checks and re-attest before considering this phase
   done. A fix that broke something else is exactly the failure mode
   `hs-verify` exists to catch.

## Exit condition

- hs-reviewer's findings are triaged: every `blocker` is fixed and
  re-verified, every deferred `should-fix` has a reason on record and
  explicit user sign-off.
- The outcome is appended to `.harness/specs/<active>/progress.md` and the
  spec's `INDEX.md` row says `reviewing`.
- No hard file-based gate is required to leave this phase — it's complete
  when the findings have been dealt with, not when a script says so.

## Common failure modes

- Reviewing your own diff instead of dispatching to hs-reviewer — the entire
  value of this phase is independence; self-review reproduces the same blind
  spots that shipped the issue in the first place.
- Summarizing the diff for the reviewer instead of handing over the real
  `git diff` — a summary encodes the implementer's framing, defeating the
  point of a fresh read.
- Fixing a `blocker` and moving straight to `hs-ship` without re-verifying —
  the fix is unproven code until it's been checked the same way everything
  else was.
- Letting `should-fix` findings accumulate silently across specs instead of
  either fixing or explicitly deferring them with a reason — an unrecorded
  "I'll get to it" is functionally the same as ignoring it.

## Common rationalizations

Excuses to skip this phase, and why they don't hold:

| Rationalization | Reality |
|---|---|
| "hs-verify already passed, that's good enough" | Verify proves it works, not that it's good. Different question, same diff. |
| "I already reviewed my own code while writing it" | That's not review, that's the same context that made the decisions checking its own decisions. Dispatch to hs-reviewer for an actually independent pass. |
| "This is advisory, so skipping it costs nothing" | Skipping it costs nothing *this time* — the cost shows up later, in the bug a second pair of eyes would have caught. Advisory means it doesn't block you, not that it's worthless. |
| "The findings are minor, ship first and fix later" | `should-fix` findings can be deferred — with a reason on record and the user's sign-off, not silently. `blocker` findings can't; fix and re-verify before moving on. |
