# hs-brainstorm reference: spec and index templates

## Spec template (`.harness/specs/<ID>-<slug>/spec.md`)

```markdown
# Spec: <feature name>

**Status:** draft

## Goal
<1-2 sentences, in plain language>

## Requirements
- WHEN <condition> THEN <observable behavior>
- ...
<Write these so each one could become a test. Vague requirements ("handle errors
gracefully") produce vague verification later — push for specifics now, while
it's cheap.>

## Out of scope
<What you're deliberately not doing, and why. If you can't find anything to put
here, you probably haven't scoped tightly enough yet — go back and cut.>

## Acceptance criteria
- [ ] <a concrete, checkable criterion — this becomes input to hs-plan and hs-verify>
```

## Index template (`.harness/specs/INDEX.md`)

```markdown
# Spec Index

| ID | Slug | Phase | Updated |
|---|---|---|---|
| 001 | user-auth | brainstorming | 2026-07-16 |
```
