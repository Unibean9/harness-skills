---
name: hs-plan
description: Turns an agreed Decision Brief or clear direction into a grounded implementation-ready plan with independently verifiable tasks and acceptance criteria. Use after hs-brainstorm or when the implementation direction is already settled. It does not choose approaches or write implementation code. With --gh, it publishes the resulting work as GitHub issues after explicit confirmation.
license: MIT
keywords: [plan, phases, tasks, roadmap, github-issues]
metadata:
  category: workflow
  author: harness-skills
  version: "3.0.0"
  workflow:
    follows: [brainstorm]
    precedes: [build]
---

# Plan Skill

Turn a settled direction into a grounded implementation plan that `hs-build`
can execute and verify without inventing a material decision. The Decision
Brief explains why and what; current code and tests establish what exists; the
plan describes the intended execution.

This skill produces local plan documents and, with `--gh`, a publication
manifest for GitHub issues. It does not implement code, choose a product or
architecture direction, or update the PRD.

## Source-of-truth order

Use these sources in order:

1. Decision Brief or explicit agreed direction.
2. Current code and tests.
3. Applicable domain context and repository conventions.
4. PRD or project overview.
5. Other repository documentation.

The brief supplies the selected direction. Code supplies implementation
reality. If the brief and code disagree about existing implementation detail,
code wins and the inconsistency is surfaced.

## Implementation-readiness invariant

A plan is ready when `hs-build` can execute it without inventing a material
product, UX, API, architecture, data, security, or permission decision.

- If a missing fact is discoverable, inspect the code, tests, or docs.
- If a real unresolved decision remains, return to `hs-brainstorm`.
- Do not settle a material alternative inside task decomposition.

## Requirement hard gate

Before drafting or materializing a plan, audit the agreed direction and
repository evidence for missing requirements, constraints, scope boundaries,
acceptance evidence, dependencies, and material risks. Resolve facts that are
discoverable by inspecting the repository. If a material user decision remains,
stop decomposition, state what is still unclear and why it matters, and return
to `hs-brainstorm` for a focused partner-style question and recommendation.
Wait for the answer, update the direction, then repeat the readiness check.
Never mark a plan ready or fill a gap with an invented assumption while this
gate is open.

## Plan shape

- **Location:** `artifacts.plans.directory` from `.hs.json`, or `plans/`.
- **Overview:** the outcome, scope in and out, and source direction.
- **Tasks:** the smallest coherent changes that can be implemented and
  verified independently. Include affected files or areas when knowable,
  constraints, and verification evidence.
- **Acceptance criteria:** map every brief criterion to one or more tasks and
  a check that can settle it.
- **Risks:** pair each material risk with a check or an explicit handoff.

Use one `plan.md` for small work. Add phase files only when the work forms
separately verifiable chunks with real execution value. A phase is an
execution grouping, not automatically an issue, dependency, or domain bucket.
Commit boundaries belong to `hs-build`.

## Lifecycle

Local planning follows:

```text
intake -> inspect -> domain prepare -> draft -> readiness review -> materialize
```

Writing a temporary local plan does not require a separate approval phrase.
The readiness review is the quality gate. If the user wants collaborative
drafting, revise in conversation before materializing.

`--gh` is a publication adapter:

```text
plan -> issue map and manifest -> explicit confirmation -> preflight -> publish -> verify
```

Keep GitHub publication confirmation, authenticated preflight, deduplication,
read-back verification, and partial-publication reconciliation. Never fall
back to local publication when `--gh` cannot run.

Read `references/plan-lifecycle.md` before replacing an existing plan or
publishing with `--gh`.

## Planning pipeline

1. **Intake and scope:** accept the Decision Brief or settled direction;
   state what is in and explicitly out. Under `--gh`, run the read-only
   preflight before drafting.
2. **Inspect:** read analogous code, tests, configuration, and documentation.
   Record real paths, commands, interfaces, and conventions rather than
   guessing from names.
3. **Prepare domain context:** use the applicable domain `prepare` capability
   for context only, before decomposition.
4. **Draft:** decompose into coherent tasks with acceptance criteria and
   verification.
5. **Readiness review:** run `references/validate-checklist.md`; verify all
   plan-critical claims and check acceptance-criteria coverage.
6. **Materialize:** write the local plan, or publish only after explicit
   confirmation in `--gh` mode.

## Domain routing

Follow `../_shared/domain-routing.md`. State the route in one line and use
`prepare` before drafting; do not implement during preparation.

For frontend work, use a confirmed design brief when the plan materially
touches a new user-facing surface. Carry its states, interaction model,
responsive behavior, and accessibility constraints into task acceptance
criteria. Do not invent a missing material UX decision; return to
`hs-brainstorm`. For a small existing-surface change, follow the code's
conventions without forcing a setup interview.

For backend work, inspect analogous modules, API and error conventions,
authorization, persistence and transaction patterns, migration practices,
external integrations, tests, and observability relevant to the change. Do not
choose a new architecture inside the plan. If a material backend decision is
still open, return to `hs-brainstorm`.

A full-stack feature remains one plan. Make the FE/BE contract explicit and
decompose by independently verifiable outcomes or real dependencies, not by
manufacturing separate domain plans.

## Verification and safety

Every acceptance criterion needs a task and a verification check. Verify all
claims that affect decomposition: target paths, current interfaces, commands,
data or API assumptions, dependencies, and required domain context. Describe
incidental context proportionally.

Mark migrations, production writes, destructive actions, and external writes
for the owning build workflow's confirmation at execution time. A plan may
describe such work; planning does not grant permission to perform it.

## Handoff

Report the materialized plan path or, with `--gh`, the created issue URLs,
covered tasks, blockers, Project use, and publication status. Do not promote or
update project documentation during planning. Hand off to `hs-build`, starting
with the first executable task.

## References

- `references/plan-lifecycle.md` - local and GitHub state model.
- `references/plan-organization.md` - phase layout and publication ledger.
- `references/validate-checklist.md` - readiness and claim verification.
- `../_shared/github-playbook.md` - GitHub publication mechanics.
- `../_shared/domain-routing.md` - domain routing contract.
- `../hs-frontend-development/references/design-brief.md` - confirmed UI input.
- `../_shared/hs-json-artifacts-convention.md` - artifact locations and archiving.

## Boundaries

- Plan owns decomposition; domains supply context; code supplies reality.
- External publication requires confirmation; local planning requires
  readiness, not ceremony.
- List unresolved questions last when any remain.
