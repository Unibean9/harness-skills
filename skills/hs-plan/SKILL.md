---
name: hs-plan
description: Break an agreed direction or PRD into phases and tasks with acceptance criteria in plan.md, and optionally publish each phase as a GitHub issue. Use before implementing anything beyond a trivial fix, or when asked to plan, split work into phases or tasks, or create GitHub issues from a PRD. Not for choosing between approaches (hs-brainstorm) or implementing (hs-build).
license: MIT
category: workflow
keywords: [plan, phases, tasks, roadmap, github-issues]
metadata:
  author: harness-skills
  version: "1.5.0"
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
No fixed frontmatter schema and no required phases; add structure only when
the task's size calls for it.

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

## Publishing as GitHub issues (optional)

The `plan.md` is always the source. When a team tracks the work on GitHub,
publish it: **one issue per phase**, with that phase's tasks as a checkbox
list and its acceptance criteria copied over, then write each issue URL
into the plan's phase table. `hs-build` ticks those checkboxes as tasks
land and `hs-ship` closes the issue at merge.

Follow `../_shared/github-issues-playbook.md` for the mechanics: the
phase-to-issue mapping, GitHub-native issue templates, labels,
local-vs-cloud mode (offline files vs. live `gh issue create`), and
optional Project tracking. Don't create a separate "Epic" issue unless the
user wants one; linked sibling issues already make the set discoverable.
Skip publishing for solo or untracked work.

## Planning pipeline

1. **Intake & scope** - take the brainstorm contract or PRD as input instead
   of re-deriving scope; state what's in and what's explicitly out.
2. **Draft** - write `plan.md` (and phase files if needed) with tasks and
   acceptance criteria. For a large plan, the `planner` subagent can draft
   it from a scoped brief.
3. **Self-review** - run `references/validate-checklist.md`: scope questions,
   grounded claims checked against the code, no placeholders, the
   whole-plan sweep after any late change, and questions to the user only
   where a real decision remains.
4. **Publish** (optional) - create the issues per the section above.

## Handoff

Report the plan path, the created issue URLs (or local issue files), and
the next step: `hs-build`, starting with the first phase.

## References

- `references/plan-organization.md` - multi-file phase layout, phase file
  shape, and the phase table with its Issue column.
- `references/validate-checklist.md` - scope questions and self-review
  checklist before handoff.
- `../_shared/github-issues-playbook.md` - publishing and tracking issues.
- `../_shared/hs-json-artifacts-convention.md` - where plan output is
  written.

## Make it yours

Decide how much detail a plan needs based on the size of the assignment.
For a quick fix, three task lines might be the whole plan; for a
multi-file feature, write more. Same goes for issues - a two-line issue
beats a padded template when the work is genuinely small.
