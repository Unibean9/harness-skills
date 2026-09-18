# Self-Review Checklist

Run this on the draft before showing it to the user, and again after each
revision, so what they review is already consistent. Nothing is written yet,
so the checks apply to the draft in the conversation. The point is to check
the plan against the codebase, not just against itself.

## Scope questions

- How many files does this actually touch?
- Does this change affect any other feature or user besides the one asked about?
- Is there a smaller version of this that still solves the real problem?
- What's the one thing that, if wrong, would be expensive to redo later?

If answering these reopens the choice of approach, stop and take it back to
`hs-brainstorm` rather than comparing approaches inside the plan.

## Core invariants

Check each of the Core planning rules in `SKILL.md`, plus:

- **Disjoint ownership** (only if multiple people/agents will work the plan
  in parallel) - each phase/issue names files no other phase touches.
- **Issue mapping** (`--gh`) - every task is covered by exactly one issue,
  each issue is one logical PR, and no issue exists just because a phase does.
- **Blockers** (`--gh`) - each `blocked-by` has a written reason the
  downstream work can't start or finish without the prerequisite. Remove any
  that only reflect phase order.

## Verification pass

For each claim the plan makes about the current codebase (a file exists, a
function is called from X, an endpoint accepts Y), spot-check a handful with
a real grep/glob/read rather than trusting it was right when written. Scale
the effort to the plan's size - a 3-step plan needs a couple of checks, a
7-phase plan needs more. Flag anything that doesn't hold up; don't silently
"fix" the plan - surface it back to the user (or correct it with the user's
explicit go-ahead).

## Interview only what matters

Don't interview for interview's sake. Ask the user 2-4 concrete questions
only where:

- a genuine decision point remains unresolved, or
- an assumption, if wrong, would change the implementation significantly.

Skip the interview entirely for a simple, low-risk plan - forcing questions
onto an obvious change just adds ceremony.

## Whole-plan sweep

After any late change (a validation answer that alters scope, a task moved
during feedback), re-read the whole draft (every phase, and every proposed
issue in the batch) once more and check for staleness: renamed things not
updated everywhere, a decision recorded in one place but contradicted in
another. Resolve or flag every contradiction before asking for approval -
don't present something that disagrees with itself.

## Before asking for approval

- Every claim in the draft that could be checked has been checked.
- No unresolved contradiction remains inside the draft.
- The manifest lists everything approval will cause.

Approval itself is never implied: the user has to approve explicitly, even
for a small plan (`plan-lifecycle.md`, Approval).
