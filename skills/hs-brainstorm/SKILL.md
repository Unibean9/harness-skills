---
name: hs-brainstorm
description: Clarify requirements and compare approaches before committing to a direction, optionally writing a PRD that hs-plan turns into phases, tasks, and issues. Use for a new feature idea, fuzzy requirements, a request for a PRD or requirements doc, or a design or architecture choice worth weighing before code. Not for splitting agreed work into phases or GitHub issues (hs-plan) or writing code (hs-build).
license: MIT
category: workflow
keywords: [brainstorm, requirements, prd, tradeoffs, decisions, architecture]
metadata:
  author: harness-skills
  version: "1.5.0"
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

Skip this entirely for small or obvious decisions - it's optional
structure, not a required output of every brainstorm.

## Handoff

Pass the four contract fields (or the PRD path), the chosen direction, and
any unresolved risks to whatever comes next:

- implementation-ready work: `hs-plan`, which breaks it into phases and
  tasks and, if the team tracks work on GitHub, publishes them as issues;
- a diagnosed bug: straight to the fix, per Bug routing above;
- exploration only: state the recommendation and stop.

When a choice hinges on current external facts (library maturity, pricing,
API limits), the `researcher` subagent can gather sourced answers without
filling this conversation.

## References

- `references/prd-template.md` - PRD shape.

## Boundaries

- This skill shapes intent and choices; it does not implement the
  solution.
- Never claim current behavior from intent alone - check the code.
- List unresolved questions last when any remain.

