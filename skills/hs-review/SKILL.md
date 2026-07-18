---
name: hs-review
description: Perform an independent, structured review of a change for correctness, safety, maintainability, and test coverage. Use when the user asks for review, before a high-risk handoff, or when a fresh perspective would add value.
---

# hs-review

Review is advisory by default. Use a separate reviewer or a deliberate fresh
read when available, but do it inline when that is more efficient. It is not a
prerequisite for every small change.

## Process

1. Read the request, relevant diff, and available verification evidence.
2. Inspect changed behaviour and nearby integration points for correctness,
   security/privacy, performance, compatibility, maintainability, and missing
   tests—only categories relevant to the change need deep treatment.
3. State findings by severity with file/line evidence where possible. Separate
   blocking defects from suggestions and non-issues.
4. Rerun or request a focused check only when it resolves an actual review
   question. Record follow-up work in the plan or handoff if needed.

## Exit condition

- Findings are actionable, evidence-backed, and proportionate to the change.
- A no-findings review says what was inspected and what was not.
- Suggestions remain distinguishable from mandatory user or project policy.

## Common failure modes

- Treating style preferences as defects.
- Repeating verification output without reviewing the diff.
- Demanding a separate review phase for a trivial, low-risk edit.
