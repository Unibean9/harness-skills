---
name: hs-brainstorm
description: Turns unclear or undecided intent into an agreed direction with enough reasoning and acceptance criteria for planning. Use for fuzzy feature requests, material product, UX, API, architecture, or stack decisions, and bug fixes where more than one cause-aligned remedy remains viable. It does not implement, decompose settled work, maintain a PRD, or create separate domain workflows.
license: MIT
keywords: [brainstorm, requirements, decisions, tradeoffs, architecture]
metadata:
  category: workflow
  author: harness-skills
  version: "2.0.0"
  workflow:
    precedes: [plan, build]
---

# Brainstorm Skill

Turn unclear or undecided intent into an agreed direction that `hs-plan` can
decompose. The audience is a workflow skill working in a real repository, so
repository evidence and the user's outcome take precedence over generic
requirements ceremony.

## Intent contract

Capture these fields in conversation, inferring what is already evidenced:

- **Outcome** - what should be true when this is done.
- **Constraints** - safety, compatibility, time, or ownership boundaries.
- **Non-goals** - nearby work this round explicitly excludes.
- **Acceptance criteria** - observable evidence that the outcome was reached.

Reuse earlier decisions and repository context instead of asking the user to
repeat them. The contract is a summary, not a form the user must complete.

## Proportional behavior

For a clear, bounded request, summarize the contract, inspect only the
relevant context, and continue without manufacturing a workshop or artifact.
Ask only when a missing answer would materially change the direction and
cannot be discovered in the repository. Treat code, tests, docs, and existing
decisions as evidence before treating something as unknown.

## Bug routing

For a bug, route to diagnosis before choosing a remedy:

1. State the repaired behavior, constraints, and verification evidence.
2. Confirm the root cause before proposing a remedy.
3. Compare cause-aligned fixes only when more than one is genuinely viable.
4. If one remedy is clearly justified, record why and continue without a
   synthetic alternatives table.

## Option exploration

When a real design choice remains:

1. Inspect the smallest relevant amount of code, docs, tests, or existing
   decisions before proposing anything.
2. Compare the viable approaches, including the assumption each relies on
   and the condition under which it fails. Do not invent alternatives when
   the evidence leaves one reasonable direction.
3. Recommend the smallest approach that meets the outcome without adding
   unrequested scope, abstractions, or configuration.
4. Record the chosen direction, reasoning, acceptance criteria, and remaining
   risks so a later session does not re-derive them.

## Decision Brief

Most brainstorms need only a concise decision in the conversation. Persist a
Decision Brief when the reasoning must survive the session, feed `hs-plan`, or
will likely be revisited. A PRD remains a long-lived project or product
overview; this skill does not create or promote one.

1. Copy the shape from `references/decision-brief.md`.
2. Save it under this repo's reports location
   (`artifacts.brainstorms.directory` in `.hs.json` if set, per
   `../_shared/hs-json-artifacts-convention.md`; otherwise `plans/reports/`),
   named `brainstorm-{date}-{slug}.md`.

Skip persistence for small or obvious decisions. A Decision Brief is optional
and is not a requirement for every brainstorm.

## Domain routing

When the work belongs to a domain skill, follow `../_shared/domain-routing.md`:
detect the domain, state the routing in one line, and use its `discover`
capability. For a UI surface, use the design discovery in
`../hs-frontend-development/references/design-brief.md`; its confirmed brief
enriches the same Decision Brief:

- Feature Summary and Primary User Action map to the outcome.
- Scope, Constraints, and Anti-Goals map to constraints and non-goals.
- Key States, Interaction Model, Content Requirements, responsive behavior,
  and accessibility expectations map to domain context and acceptance criteria.

Before interviewing, follow the frontend setup guidance: read PRODUCT.md and
DESIGN.md, and create missing project context only through that domain's own
confirmation flow. Present the brief for confirmation before treating its
design choices as settled. A small tweak to an existing surface can use the
ordinary contract when the surrounding code already makes the direction clear.

For **backend** (`hs-backend-development`), `discover` feeds the option
exploration above instead of replacing the contract. Ask it to identify only
material backend decisions and invariants. It should inspect repository
conventions first, then read the corresponding references under
`../hs-backend-development/references/` when the decision concerns those
areas.

## Handoff

Pass the four contract fields (or the Decision Brief path), the chosen
direction, and unresolved risks to whatever comes next:

- implementation-ready work: `hs-plan`, which turns the settled direction
  into independently verifiable work and can publish it as GitHub issues with
  `--gh`;
- a diagnosed bug: the fix workflow, using the confirmed root cause;
- exploration only: state the recommendation and stop.

When a choice hinges on current external facts such as library maturity,
pricing, or API limits, use sourced current research rather than freezing the
answer into this skill.

## References

- `references/decision-brief.md` - optional persisted decision shape.
- `../_shared/domain-routing.md` - when and how a domain skill is used.
- `../hs-frontend-development/references/design-brief.md` - frontend discovery and design brief.

## Boundaries

- This skill shapes intent and choices; it does not implement the solution.
- Never claim current behavior from intent alone; check the code.
- List unresolved questions last when any remain.
