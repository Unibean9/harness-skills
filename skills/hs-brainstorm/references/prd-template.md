# PRD Report Template

Use this when a brainstorm's outcome needs to survive the session or feed a
plan - not for every brainstorm. Copy the shape below, fill it in, save it to
the repo's reports location (see "PRD Output Mode" in `SKILL.md`).

```markdown
---
title: {short decision title}
date: {YYYY-MM-DD}
status: decided
---

# {Short decision title}

## Problem

What problem this solves and for whom. 2-3 sentences - enough that someone
with no context understands why this brainstorm happened.

## Outcome

What should be true when this is done.

## Constraints

Safety, compatibility, time, or ownership boundaries that shaped the options.

## Non-goals

Nearby work this round explicitly does not cover.

## Approaches considered

For each approach, name the assumption it leans on hardest and the
condition under which it fails - not just pros/cons.

| Approach | Pros | Cons | Leans on / fails if |
|---|---|---|---|
| Approach A | ... | ... | ... |
| Approach B | ... | ... | ... |

## Decision

Which approach was chosen, and why - the reasoning a later session would
otherwise have to re-derive.

## Acceptance criteria

How you'll know the outcome was reached - a check, a metric, an observable
result.

## Open questions

Anything still unresolved. Leave empty if none.
```

Trim sections that don't apply (e.g. drop "Constraints" for a low-stakes
choice) - this is a starting shape, not a required schema.
