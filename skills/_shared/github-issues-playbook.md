# Publishing a plan as GitHub issues

Shared playbook for publishing a phased `plan.md` as GitHub Issues
(`hs-plan`) and for keeping those issues current while the work happens
(`hs-build`, `hs-ship`). The plan stays the source; issues are its tracked
projection. Pure `gh` CLI + GitHub's own conventions; no external tooling
required.

## When to publish issues

- The work is tracked by a team on GitHub, not just in this session.
- The plan has at least one phase that is worth tracking on its own, not
  just a single-file fix.
- Skip it for solo or untracked work - the `plan.md` is enough.

## Local vs. cloud mode

Detect which mode applies before doing anything else:

```bash
gh auth status >/dev/null 2>&1 && git remote get-url origin >/dev/null 2>&1 \
  && echo cloud || echo local
```

- **Cloud** (`gh` authenticated + a GitHub remote exists): create issues live
  with `gh issue create`, add them to a Project board, and report the URLs.
- **Local** (no `gh` auth, no remote, or the user asked to stay offline):
  write the same issue bodies as files under
  `plans/reports/issues/<plan-slug>-<phase-slug>.md` (front matter + body,
  same shape as below) so a human can paste or push them later. The
  directory listing is the index. Never fabricate an issue URL in local
  mode.

## 1. GitHub-native issue templates

Prefer the repo's own `.github/ISSUE_TEMPLATE/*.md` when present. If the repo
has none, create them using GitHub's own front-matter spec (not a
project-specific format) so they render correctly in GitHub's "New issue"
picker:

```markdown
---
name: Feature request
about: Propose a new capability
title: "feat: "
labels: feature
---

## Summary
## Problem / motivation
## Proposed flow
## Tasks
## Scope
## Acceptance criteria
## Open questions
```

Create one template per type actually needed (`feature.md`, `bug.md`,
`enhancement.md`, `docs.md`) - don't scaffold types the repo won't use.

## 2. Map plan phases to issues

One issue per phase. Each issue should be shippable and closeable on its
own; link sibling issues to each other in a Notes line, and write each
issue URL back into the plan's phase table.

| Source | Issue section |
|---|---|
| Phase overview (+ PRD Problem, for context) | Summary + Problem / motivation |
| PRD Decision / chosen approach | Proposed flow |
| Phase Tasks | Tasks (checkbox list, one line per task) |
| PRD Non-goals | Scope -> Out of scope |
| Phase Acceptance criteria | Acceptance criteria (keep as checkboxes) |
| Open questions | Open questions |
| PRD rejected approaches | Notes -> alternatives considered |

A single-phase plan becomes one issue with the plan's tasks as its checkbox
list.

## 3. Labels (standard taxonomy)

Check before creating - never invent a near-duplicate of an existing label:

```bash
gh label list --limit 100 --json name -q '.[].name' > /tmp/labels.txt
grep -qxF "feature" /tmp/labels.txt || gh label create "feature" --color a2eeef --description "New capability"
```

| Label | Use for |
|---|---|
| `bug` | Incorrect behavior with reproduction evidence |
| `feature` | New capability |
| `enhancement` | Improvement to existing behavior |
| `docs` | Documentation only |
| `security` | Vulnerability or hardening |
| `ci` | Pipeline/workflow issues |
| `refactor` | Internal restructuring, no behavior change |
| `question` | Needs clarification/decision |
| `priority:high` / `priority:medium` / `priority:low` | Triage priority |

Apply exactly one type label plus an optional priority label per issue.

## 4. Create (cloud mode)

Dedup first - never file a duplicate:

```bash
gh issue list --state all --search "<keywords>" --limit 20 --json number,title,state,url
```

Then create, writing the body to a temp file to avoid shell-quoting damage:

```bash
gh issue create --title "feat: <concise title>" \
  --body-file <tmpfile> --label feature --label "priority:medium"
```

## 5. Track progress on the issue and a GitHub Project (optional board)

This section is the one place that says how progress is marked. `hs-build`
uses it while implementing, `hs-ship` uses it at Done.

- **Tasks**: tick the task's checkbox in the issue body when its checks
  pass (`gh issue edit <n> --body-file <updated-body>`).
- **Progress comment**: before stopping a multi-sitting phase, post what's
  done (with evidence) and what's left (`gh issue comment <n> --body-file <file>`).
- **Plan**: keep the phase's `Status` column in `plan.md` in step with the
  issue (`Pending` -> `In Progress` -> `Done`).
- **Board**: if the issues live on a Project, move the item as below.

Projects v2 (GraphQL-backed `gh project`, not the deprecated REST
`/projects` endpoints). Requires the `project` scope - if a command fails
with an authorization error, report that `gh auth refresh -s project` is
needed rather than silently retrying.

For a repo with no existing project, ask the user whether to create one
(`gh project create --owner <owner> --title "<name>"`) or just leave the
issues in the repo's own Issues tab - a Project isn't mandatory.

A project created this way (or through the GitHub UI's default template)
already has GitHub's standard `Status` single-select field with `Todo`,
`In Progress`, and `Done` options - don't invent a separate status scheme
on top of it:

```bash
gh project list --owner <org-or-user>                       # find the board
gh project item-add <number> --owner <owner> --url <issue-url>

# Move an item along the standard Status field
gh project field-list <number> --owner <owner>               # confirm the Status field id + option ids
gh project item-edit --project-id <project-id> --id <item-id> \
  --field-id <status-field-id> --single-select-option-id <option-id>
```

New issues land in `Todo` by default; move each to `In Progress` when work
starts on it and `Done` when its acceptance criteria are met and the PR is
merged - the same lifecycle as the plan's `Status` column.

## 6. Report

State plainly which mode ran (local or cloud), list every issue created
(title + URL, or file path in local mode), the labels applied, and whether
each was added to a Project. Unresolved questions last.
