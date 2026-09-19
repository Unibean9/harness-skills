---
name: hs-plan
description: Break an agreed direction or PRD into phases and tasks with acceptance criteria. Drafts and revises the plan with you in conversation, and writes nothing until you explicitly approve it; then saves it as a local plan, or with --gh publishes it as GitHub issues (one per task or tightly coupled task group that fits one PR, never one per phase) and archives the local plan. Use before implementing anything beyond a trivial fix, or when asked to plan, split work into phases or tasks, or track the work as GitHub issues. With --fe, plans a confirmed frontend design brief. Not for choosing between approaches (hs-brainstorm) or implementing (hs-build).
license: MIT
category: workflow
keywords: [plan, phases, tasks, roadmap, github-issues]
metadata:
  author: harness-skills
  version: "2.1.0"
  workflow:
    follows: [brainstorm]
    precedes: [build]
---

# Plan Skill

Turn a decision that's already been made (the `hs-brainstorm` contract and,
for bigger decisions, its PRD) into phases and tasks concrete enough to
execute and track. If no approach has been chosen yet, go back to
`hs-brainstorm` instead of comparing approaches here.

This skill only produces plan documents and issues, never implementation
code, so it carries no HARD-GATE; the gate lives in `hs-build`.

## Plan shape

- **Location**: `artifacts.plans.directory` from `.hs.json` if set (see
  `../_shared/hs-json-artifacts-convention.md`), else `plans/`.
- **Phase** - an ordered chunk of work you can verify on its own.
- **Task** - one checkbox-sized change inside a phase; the unit `hs-build`
  implements, verifies, and commits.
- **Acceptance criteria** - how you'll know a phase (or the whole plan) is
  done: a command, a test, an observable result.

A small plan is one `plan.md` with:

- **Overview** - what this plan accomplishes and why.
- **Tasks** - an ordered checkbox list of concrete changes.
- **Acceptance criteria** - per task or for the plan as a whole.

Split into `phase-NN-<name>.md` files only once tasks genuinely group into
ordered, separately verifiable chunks - see `references/plan-organization.md`.
No required phases; add structure only when the task's size calls for it.

## Core planning rules

- **Grounded, not assumed** - base decisions on reading actual code, not
  file/function names.
- **Smallest complete solution** - cover the full requested scope, nothing
  beyond it.
- **No placeholders** - real file paths, real commands, real verification
  steps; nothing deferred that's knowable now.
- **Name risks up front** - and how you'll check for them (a test, a manual
  check).
- **Security & data safety** - no task commits secrets, tokens, or
  credentials.

## Lifecycle: draft, approve, then materialize

`Draft -> Feedback -> Revise -> Explicit approval -> Materialize`

**Planning is a feedback loop; publishing is a side effect.** While the user
is still shaping the plan, everything stays in the conversation: phases and
tasks, splitting and reordering, the issue mapping, dependencies. Don't
write plan files, create issues, Project items, milestones, or
relationships, and don't archive or delete the current plan. Revising a chat
draft leaves nothing behind to clean up, which is why the loop happens
before any write.

Materialize only after the user explicitly approves the draft you showed.
Silence, "looks good", or a bare "ok" is not approval; the approval prompt
names the mode and exactly what will be created, and the user replies to it.

Two modes, chosen at invocation and shown in every draft:

- **Local (default, no flag).** After approval, write `plans/<plan>/`. That
  plan is the active execution record: `hs-build` works from it and
  `hs-ship` archives it once the work has shipped. Nothing is published to
  GitHub.
- **GitHub (`--gh` only).** Planning is identical until approval. Then the
  work is published as issues and verified, and GitHub becomes the
  execution tracker; the local plan is archived as a snapshot, not deleted.
  Don't enter this mode without the flag, and don't fall back to local if it
  can't run; stop and tell the user.

An **issue** is one task, or a few tightly coupled tasks with one logical
outcome that fit in one PR: `Phase -> task or task group -> issue -> PR`.
Split when work can ship or be reviewed independently, has its own
acceptance criteria, or would make one PR hard to follow. A small phase
that is already independently verifiable can be one issue. Never assume one
issue per phase or per checkbox.

**Dependencies** are `blocked-by` links, recorded only when downstream work
truly can't start or finish correctly without the prerequisite. Phase order
is ordering, not dependency.

A partial publish is not a success: report what was created and what
failed, keep the plan `publishing`, and reconcile instead of duplicating.
A plan is never deleted unless the user asks. A replacement plan leaves the
current one untouched until the replacement is materialized and verified.

The full state model, approval rules, draft format, materialize and
reconcile steps, and what is the source of truth in each state are in
`references/plan-lifecycle.md`. Read it before drafting a `--gh` plan or
replacing an existing plan. GitHub mechanics (issue writing, dedup,
blockers, verification checklist, Projects) are in
`../_shared/github-playbook.md`.

## Planning pipeline

1. **Intake & scope** - take the brainstorm contract or PRD as input instead
   of re-deriving scope; state what's in and what's explicitly out. Under
   `--gh`, run the read-only preflight now so a missing `gh` login fails
   before anyone spends time on the draft.
2. **Draft** - in the conversation, with tasks and acceptance criteria. For a
   large plan, the `planner` subagent can draft it from a scoped brief; ask
   it to return text, not files.
3. **Self-review** - run `references/validate-checklist.md` before showing the
   draft: scope questions, grounded claims checked against the code, no
   placeholders, the whole-plan sweep, and questions to the user only where
   a real decision remains.
4. **Feedback and revise** - repeat 2-3 as many times as the user wants.
5. **Approve** - end with the approval prompt (mode plus manifest).
6. **Materialize** - per mode, following `references/plan-lifecycle.md`.

## Frontend work (`--fe`)

With `--fe`, the input is the confirmed design brief from
`hs-brainstorm --fe` (see `../hs-frontend-development/references/design-brief.md`), not a generic
contract. If there is no confirmed brief, or PRODUCT.md is missing, stop and
run `hs-brainstorm --fe` (or `hs-frontend-development setup`) first; don't
invent design decisions in the plan.

Plan the brief, don't re-decide it:

- Group tasks by surface or component, and name the files each one changes.
- Carry the brief's Key States (default, empty, loading, error, success, edge
  cases), Interaction Model, and responsive and accessibility constraints into
  each task's acceptance criteria.
- Add a task to align with DESIGN.md, or to extract shared tokens with
  `hs-frontend-development tokens`, when the brief calls for it.
- Give UI tasks an observable check: a screenshot at mobile, tablet, and
  desktop widths, per `hs-test` black-box mode.

Everything else, including the draft, approval, and `--gh` behavior, is
unchanged; `--fe` and `--gh` combine.

## Handoff

Report the plan path, or with `--gh` the created issue URLs (with the tasks
each covers and any blockers), the Project if one was used, what was
promoted to docs, and where the plan was archived. If a publish was partial,
say so and list what is missing. Then give the next step: `hs-build`,
starting with the first task or issue.

## References

- `references/plan-lifecycle.md` - state model, approval gate, draft format,
  materialize and reconcile, replacing and archiving plans.
- `references/plan-organization.md` - multi-file phase layout, the
  `Mode/Status` header, the phase table, and the publication ledger.
- `references/validate-checklist.md` - scope questions and self-review
  checklist before showing the draft.
- `../_shared/github-playbook.md` - publishing and tracking issues.
- `../hs-frontend-development/references/design-brief.md` - the design brief that `--fe` plans from.
- `../_shared/hs-json-artifacts-convention.md` - where plan output is
  written, and how plans are promoted and archived.

## Make it yours

Decide how much detail a plan needs based on the size of the assignment.
For a quick fix, three task lines might be the whole plan; for a
multi-file feature, write more. Same goes for issues - a two-line issue
beats a padded template when the work is genuinely small.
