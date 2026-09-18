# Self-Review Checklist

Run this before treating a plan (or issue set) as ready to build. The point
is to check the plan against the codebase, not just against itself.

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

After any late change (a validation answer that alters scope, a step added
mid-review), re-read every file in the plan (or every issue in the batch)
once more and check for staleness: renamed things not updated everywhere,
a decision recorded in one place but contradicted in another. Resolve or
flag every contradiction before calling the plan ready - don't hand off
something that disagrees with itself.

## Before handoff

- Every claim in the plan/issues that could be checked has been checked.
- No unresolved contradiction remains between files/issues.
- The user has confirmed the plan/issues (implicitly, by not objecting, is
  enough for a small change; explicitly for anything with real risk).
