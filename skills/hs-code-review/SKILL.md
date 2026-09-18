---
name: hs-code-review
description: Skeptically review a local diff or a pull request for requirement gaps, bugs, security issues, and missing edge cases, using three core questions plus a starter checklist, and report evidence-backed findings without editing code. Use after implementing a phase, before opening or merging a PR, or when asked for a review or second pass. Not for running the test suite (hs-test) or applying fixes (hs-build).
license: MIT
category: workflow
keywords: [code-review, review, pull-request, bugs, security, checklist]
metadata:
  author: harness-skills
  version: "1.3.0"
  workflow:
    follows: [test, build]
    precedes: [ship]
---

# Code Review Skill

Look for what's actually wrong or missing, rather than skimming and
agreeing that it looks fine. This skill is read-only by default - it
reports findings, it doesn't fix them on its own.

## What to review

- **Local work** (during `hs-build`): the phase's diff, e.g.
  `git diff <base>...HEAD`.
- **A pull request** (during `hs-ship`): `gh pr diff <n>` plus the PR body
  and its linked issue.

Read the requirement too - the plan's acceptance criteria or the issue -
since question 1 below is judged against it. For an independent pass that
doesn't share this conversation's assumptions, hand the diff and the
requirement to the `code-reviewer` subagent.

## The 3 questions to work through

1. **Does the code actually meet the requirement?** Compare it against what
   was asked, not against what feels reasonable in isolation.
2. **Are there clear quality or security problems?** Obvious bugs, unsafe
   input handling, unclear or duplicated logic.
3. **Try to break it.** What's one input, edge case, or sequence of actions
   that could make this fail or produce a wrong result?

## Evidence before conclusions

Before saying something "works" or "is fixed", actually run the relevant
command and read its real output - don't guess based on how the code looks.
A claim without a command and its output behind it isn't a finding, it's a
guess.

## Starter checklist

For question 2 (quality/security), `references/checklist.md` has concrete
categories that are easy to miss reading top-to-bottom - injection, race
conditions, auth gaps, correctness gaps. Use it as a prompt, not a
mechanical pass; skip categories that don't apply to the change.

## Handoff

Report findings by severity with `file:line` and the reason each matters,
and say plainly when there are none. Fixes go through the `hs-build`
review-fix loop; a clean review hands off to `hs-ship`.

## References

- `references/checklist.md` - starter categories for question 2.

## Make it yours

Build your own checklist suited to whatever stack you're working in (a
specific framework's common pitfalls, a specific team's style rules) - the
3 questions and the starter checklist above are a minimum starting point,
not the whole review.
