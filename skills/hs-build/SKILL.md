---
name: hs-build
description: Implement a requested change with focused, incremental checks and visible decisions. Use when code, configuration, or project files need changing after the intent is clear enough to act.
---

# hs-build

Use the project’s native tools directly. A plan is a guide, not a scheduler:
combine or reorder small steps when that is clearer, but preserve agreed scope
and call out decisions that materially change it.

## Process

1. Read the relevant request, spec, or plan and inspect surrounding code before editing.
2. Make the smallest coherent change that meets acceptance criteria. Reuse
   existing patterns rather than adding a parallel abstraction.
3. Run the most useful task-level check after a meaningful unit of work. Use
   direct tests, lint, typecheck, build, or targeted manual validation commands.
4. Write a concise note in `progress.md`, the plan, or the final handoff when
   durable evidence or an implementation judgment will help a later session.
5. Stop for user direction before irreversible operations, unexpected scope
   growth, or genuinely ambiguous requirements.

## Exit condition

- The agreed implementation is complete or any remaining limitation is clear.
- Relevant incremental checks ran or their reason for omission is stated.
- Significant deviations and decisions are visible to the user or next agent.

## Common failure modes

- Following task order mechanically when a small reorder reduces risk.
- Adding unrelated cleanup because the file is already open.
- Marking success without running or honestly reporting an applicable check.
