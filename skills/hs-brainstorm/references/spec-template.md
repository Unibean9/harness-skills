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

## Light spec+plan template (small tasks — one file, one approval)

Use this instead of the full spec template plus a separate `hs-plan` pass
when **all** of the following hold:

- the whole change fits in a single sitting (rough rule of thumb: under
  ~30 minutes of implementation)
- the files it touches are already obvious — no "which files would this
  touch" question left to answer
- the requirement is already unambiguous from what the user asked — no
  clarifying question would send the implementation in a different direction

If any of those isn't true, use the full `spec.md` + `hs-plan` flow instead.
Light mode is for matching ceremony to task size, not for skipping rigor on
something that actually needs a real plan — a `## Tasks` list with no
`Verify:` line per task isn't a shortcut, it's a wish, same as in the full
`hs-plan` flow.

```markdown
# Spec+Plan: <name> (light)

**Status:** draft

## Goal
<1-2 sentences>

## Tasks
- [ ] Task 1: <name> — Verify: `<command>`
- [ ] Task 2: <name> — Verify: `<command>`
<Usually just one task. Each still needs its own Verify: line and file scope
-- light mode collapses the two-file, two-approval ceremony, not the verify
discipline hs-build depends on.>

## Out of scope
<same as the full template — if you can't find anything to put here, the
task probably isn't as small as you think.>
```

Once a human approves this single file (`**Status:** approved`), `hs-plan` is
skipped entirely — go straight to `hs-build`, which reads its task list from
this file's `## Tasks` section instead of a separate `plan.md`. Everything
downstream (per-task verify, `progress.md`, `hs-verify`, `hs-ship`) works
exactly the same as the full flow; only the spec/plan split and its second
approval round-trip are gone.

## Index template (`.harness/specs/INDEX.md`)

```markdown
# Spec Index

| ID | Slug | Phase | Updated |
|---|---|---|---|
| 001 | user-auth | brainstorming | 2026-07-16 |
```
