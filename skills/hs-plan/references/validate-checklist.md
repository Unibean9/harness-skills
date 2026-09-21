# Plan Readiness Checklist

Run this before materializing a local plan and again after a substantive
revision. The goal is to establish that `hs-build` can execute the plan
without inventing a material decision.

## Scope and direction

- The plan names the agreed direction or Decision Brief it derives from.
- Scope in and explicit non-goals match that direction.
- No task reopens a product, UX, API, architecture, data, security, or
  permission choice that belongs in `hs-brainstorm`.
- The solution is complete for the requested outcome without unrelated work.

## Grounding

Verify every plan-critical claim with repository evidence:

- target files, modules, and interfaces exist or are explicitly new;
- analogous implementation and project conventions were inspected;
- commands, test entry points, and build assumptions are valid;
- API, data, permission, dependency, and domain-context claims support the
  proposed decomposition;
- blockers and dependencies are real, not merely phase order.

Describe incidental context proportionally rather than checking every
descriptive sentence with the same effort.

## Acceptance and verification

- Every Decision Brief acceptance criterion maps to one or more tasks.
- Every task has a meaningful outcome and a verification check.
- Verification proves the relevant risk at the cheapest reliable level.
- Frontend states, interactions, responsive behavior, and accessibility
  constraints are carried into the relevant checks.
- Backend success, error, permission, migration, retry, and compatibility
  concerns are covered when applicable.
- Full-stack contracts are explicit enough for both sides to implement
  without incompatible assumptions.

## Organization

- One `plan.md` is used unless separately verifiable phases add real value.
- A phase is not treated as an issue or dependency without a reason.
- If multiple people or agents will work in parallel, file ownership is
  disjoint or the shared edits are explicitly coordinated.
- In `--gh` mode, each issue maps to independently reviewable work and the
  manifest lists the publication side effects.

## Safety and unresolved decisions

- No plan step silently performs a migration, destructive action, production
  write, deploy, or external write.
- Such actions identify the owning workflow confirmation required at execution
  time.
- If a missing fact is discoverable, inspect it rather than asking the user.
- Ask the user only when a genuine unresolved decision remains or a wrong
  assumption would materially change implementation.
- List unresolved questions last when any remain.
