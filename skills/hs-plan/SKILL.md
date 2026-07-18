---
name: hs-plan
description: Convert an approved or sufficiently clear change into a focused implementation plan with proportionate checks. Use when work is nontrivial or risky, the user asks for a plan, or a compact plan would reduce ambiguity.
---

# hs-plan

Planning is a reasoning aid, not a hard phase barrier. Use native project
tools to inspect conventions and run a baseline command when it helps isolate
pre-existing failures. Record only information that will help the next agent
or reviewer make a decision.

## Process

1. Read the active spec if one exists; otherwise use the user's current,
   sufficiently clear request as the source of truth.
2. Inspect relevant files, tests, and conventions. Run an existing test, lint,
   or build command when a baseline is valuable; note failures without treating
   them as an automatic stop.
3. For work with multiple moving parts, write `.harness/specs/<active>/plan.md`
   from `references/plan-template.md`. Give each meaningful task a purpose,
   likely files, and a sensible check. A small task can be one short checklist.
4. Confirm only decisions that materially alter scope, risk, or user-visible
   behaviour. Update the spec index when durable plan files are used.

## Exit condition

- The implementation approach is understandable and scoped to the request.
- Relevant checks are identified, with any baseline limitation recorded.
- The plan has approval appropriate to the risk and user intent.

## Common failure modes

- Requiring a separate `plan.md` just to restate a tiny, clear request.
- Writing tasks too vague to review or verify.
- Hiding a failing baseline instead of distinguishing it from new breakage.
