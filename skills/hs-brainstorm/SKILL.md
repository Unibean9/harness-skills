---
name: hs-brainstorm
description: Clarify requirements and compare approaches before committing to a direction, optionally writing a PRD that hs-plan turns into phases and tasks (and issues, with --gh). Use for a new feature idea, fuzzy requirements, a request for a PRD or requirements doc, or a design or architecture choice worth weighing before code. Not for splitting agreed work into phases or GitHub issues (hs-plan) or writing code (hs-build).
license: MIT
category: workflow
keywords: [brainstorm, requirements, prd, tradeoffs, decisions, architecture]
metadata:
  author: harness-skills
  version: "1.6.0"
  workflow:
    precedes: [plan, build]
---

# Brainstorm Skill

Evaluate more than one approach before picking one, so you don't write code
around an assumption you never actually examined.

## Brainstorm contract

Before proposing a solution to anything bigger than a one-line fix, get
these four things clear - in conversation, not as a form to fill out:

- **Outcome** - what should be true when this is done.
- **Constraints** - safety, compatibility, time, or ownership boundaries
  that shape the options.
- **Non-goals** - nearby work this round explicitly won't cover.
- **Acceptance criteria** - how you (or the user) will know the outcome was
  reached.

If these were already settled earlier in the conversation or in an existing
plan, reuse them - don't make the user repeat a decision they already made.

<HARD-GATE>
See `../_shared/hard-gate.md` for the shared gate shape (`{scope}` = "a direction has been chosen and written down").
</HARD-GATE>

## Proportional behavior

- For a concrete request, summarize the four fields briefly and continue.
- Ask a concise question only when a missing answer would materially change
  the outcome and can't be discovered by reading the code.
- Most unknowns are resolvable by reading source, docs, tests, or current
  state - resolve those instead of hedging against them. Save the "we can't
  know this yet" reasoning for things that genuinely stay unknowable at
  decision time (future requirements, third-party behavior).

## Bug routing

For a bug, don't brainstorm fixes from the symptom.

1. State the expected (repaired) behavior, constraints, and how you'll know
   it's fixed.
2. Find and confirm the root cause before proposing anything.
3. Compare cause-aligned fixes only if more than one is genuinely viable.
4. If there's really just one reasonable fix, say why and skip the
   trade-off exercise - that's not avoiding brainstorming, it's recognizing
   there was nothing to weigh.

## Option exploration

When the work has a real design choice:

1. Look at the smallest relevant amount of code, docs, or existing plans
   before proposing anything.
2. Propose at least 2 viable approaches with honest pros/cons - not one
   "correct" answer dressed up as a choice.
3. For each approach, name the assumption it leans on hardest and what
   would have to be true for it to fail. Compare worst case, not just best
   case.
4. Recommend the smallest approach that meets the outcome. Don't add scope,
   abstractions, or config the request didn't ask for.
5. Pick one (with the user, if there's a person to ask) and write down the
   decision and the reasoning, so a later session doesn't have to re-derive
   it.

## PRD

Most brainstorms just need the decision and reasoning written down in a
couple of sentences (see Option exploration, step 5). Write a full PRD
instead when the decision needs to survive the session or feed a plan -
e.g. the user asks for a PRD or requirements write-up, or the choice is big
enough that `hs-plan` will need the reasoning later:

1. Copy the shape from `references/prd-template.md`.
2. Save it under this repo's reports location
   (`artifacts.brainstorms.directory` in `.hs.json` if set, per
   `../_shared/hs-json-artifacts-convention.md`; otherwise
   `plans/reports/`), named `brainstorm-{date}-{slug}.md`.

A PRD saved there is a working draft. Once the decision is settled and
should outlive the implementation, promote it to the repository's docs (see
the lifecycle rule in `../_shared/hs-json-artifacts-convention.md`).

Skip this entirely for small or obvious decisions - it's optional
structure, not a required output of every brainstorm.

## Domain routing

When the work belongs to a domain skill, follow `../_shared/domain-routing.md`: detect the domain,
say so in one line, and use its `discover` capability. For a UI surface that is
the design discovery in `../hs-frontend-development/references/design-brief.md`: a short interview,
then a design brief the user confirms. That brief takes the place of the
generic contract and PRD:

- Feature Summary and Primary User Action are the **outcome**.
- Scope, Constraints, and Anti-Goals cover **constraints and non-goals**.
- Key States, Interaction Model, and Content Requirements carry the
  **acceptance criteria** that `hs-plan` will use.

Before interviewing, follow the Setup in `../hs-frontend-development/SKILL.md`: read PRODUCT.md and
DESIGN.md, and if PRODUCT.md is missing run `hs-frontend-development setup`
first. The brief flow keeps its own stop: present the brief and wait for
explicit confirmation. Once confirmed, save it as a working draft the way a PRD
is saved (see PRD above) so `hs-plan` can read it. A confirmed brief satisfies
this skill's HARD-GATE. A small tweak to an existing surface doesn't need a
brief; use the ordinary contract.

For **backend** (`hs-backend-development`), `discover` feeds the option
exploration above instead of replacing the contract. Frame the request as a
system and weigh the trade-offs with `../hs-backend-development/references/mindset.md`, and read
`../hs-backend-development/references/architecture.md`, `../hs-backend-development/references/technologies.md`, or
`../hs-backend-development/references/api-design.md` when the choice is layering or splitting, a
stack, or an API contract.

## Handoff

Pass the four contract fields (or the PRD path), the chosen direction, and
any unresolved risks to whatever comes next:

- implementation-ready work: `hs-plan`, which breaks it into phases and
  tasks and, when invoked with `--gh` for a team that tracks work on GitHub,
  publishes them as issues;
- a diagnosed bug: straight to the fix, per Bug routing above;
- exploration only: state the recommendation and stop.

When a choice hinges on current external facts (library maturity, pricing,
API limits), the `researcher` subagent can gather sourced answers without
filling this conversation.

## References

- `references/prd-template.md` - PRD shape.
- `../_shared/domain-routing.md` - when and how a domain skill is used.
- `../hs-frontend-development/references/design-brief.md` - frontend `discover`: discovery interview and design brief.

## Boundaries

- This skill shapes intent and choices; it does not implement the
  solution.
- Never claim current behavior from intent alone - check the code.
- List unresolved questions last when any remain.

