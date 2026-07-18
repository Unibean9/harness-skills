---
name: hs-brainstorm
description: Turn a vague feature or unresolved bug request into a small, testable spec before implementation. Use when the outcome, scope, or acceptance criteria are unclear; skip or keep it lightweight for an obvious trivial edit.
---

# hs-brainstorm

This is guidance, not an automatic gate. Match discovery and documentation to
the risk of the change. Use the project's native tools to inspect code and
conventions; do scouting inline when delegation would add more overhead than value.

## Process

1. Check `.harness/specs/INDEX.md` and `.harness/state/current-spec` if they
   exist. Resume an unfinished spec only after confirming that is the user's intent.
2. Learn the minimum needed from the codebase, then ask only questions that
   materially change users, scope, constraints, or acceptance criteria.
3. For a non-trivial change, create `.harness/specs/<ID>-<slug>/spec.md` from
   `references/spec-template.md`, choose a new unused ID, and add its row to
   `INDEX.md`. For a small change, a compact goal and acceptance checklist is enough.
4. Request explicit approval when scope, behaviour, cost, security, or data is
   affected. The user's direct request can be sufficient for a low-risk,
   already-specific edit.

## Exit condition

- The intended outcome and observable acceptance criteria are visible in the
  conversation or a durable spec.
- A durable spec is filed and explicitly approved when the change warrants it.
- Out-of-scope work and unresolved decisions are visible rather than assumed.

## Common failure modes

- Turning a clear one-line fix into a multi-document process.
- Treating an implementation preference as a user requirement.
- Continuing an old active spec without checking whether the user changed direction.
