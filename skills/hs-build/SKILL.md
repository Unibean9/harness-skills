---
name: hs-build
description: Implement an approved plan phase or GitHub issue task by task - write the code, run the checks that prove it, commit each finished task, and mark progress on the plan and linked issues - then hand off to hs-code-review. Use when a plan or issue is ready and the user asks to implement, build, code it, or pick up issue #N. Not for opening PRs or merging (hs-ship).
license: MIT
category: workflow
keywords: [build, implement, code, commit, branch, worktree, github-issue]
metadata:
  author: harness-skills
  version: "1.6.0"
  workflow:
    follows: [plan, brainstorm]
    precedes: [test, code-review]
---

# Build Skill

Turn a plan into working, committed code, one task at a time, following the
order `hs-plan` laid out rather than improvising a different approach
mid-implementation.

<HARD-GATE>
See `../_shared/hard-gate.md` for the shared gate shape (`{scope}` = "a plan exists and has been reviewed"). A user may explicitly say "just code it" to skip planning for a trivial task.
</HARD-GATE>

## Core principles

- Follow the plan; if reality forces a deviation, say so and why (and
  record it in the implementation notes), don't silently diverge.
- Write a test for logic whose correct behavior isn't obvious from reading
  it.
- Never claim "done" without evidence from a check you actually ran; the
  rule is in `../_shared/evidence-policy.md`.

You can split a task into smaller sub-steps yourself if that helps, as long
as the end result still matches the plan.

## Input source

| Source | Use when | Mechanics |
|---|---|---|
| **Local plan** (default) | `hs-plan` produced a `plan.md` (or phase files) with `Status: active` (a plan with no `Mode` line counts as local) | Work through its tasks with the loop below. A plan with `Status: publishing` is a half-finished `--gh` publish: don't build from it, tell the user to reconcile it with `hs-plan --gh` first. |
| **GitHub issue** | The work was published as an issue, or picked from the backlog | `references/github-issue-workflow.md` - pull the issue, check its blockers, claim it, then the same loop plus issue marking |

## Branch and worktree (only on request)

Work on the current branch by default. Create a branch or a worktree only
when the user asks for one, either in this conversation or as a stated
preference in project rules. Creating one on your own changes where their
commits land and leaves directories behind that they didn't expect.

- **Branch**: confirm the base (usually the default branch, pulled up to
  date), then `git switch -c <type>/<issue>-<slug> <base>`, e.g.
  `feat/42-order-api`. Leave out the issue number when there is none.
- **Worktree**: `git worktree add ../<repo>-<slug> -b <branch> <base>`, then
  run every edit, check, and commit from inside that directory. Say where
  it is. Remove it (`git worktree remove <path>`) only after `hs-ship`
  merges, and only once the user agrees.

If you're on the default branch and the user hasn't said anything, mention
it once, since `hs-ship` needs a branch to open a PR. Then keep going where
you are unless they ask for a branch.

## Task loop

At the start of the build, tell the user you'll commit each task locally
once its checks pass, and get their OK for that policy once. Local commits
are easy to undo; pushing is not, and stays with `hs-ship`.

For each task:

1. **Implement** the task. When a phase is large and its files don't
   overlap with other work, you can hand it to the `fullstack-developer`
   subagent with the phase file as its brief.
2. **Test** - run the smallest check that proves the task works, per
   `hs-test` (or the `tester` subagent for a larger surface). A red or
   skipped check means the task isn't done.
3. **Commit** only the paths this task changed, with a conventional message
   (`type(scope): summary`) and `Refs #<n>` when there's an issue. Never
   commit a secret, credential, or generated file.
4. **Mark** progress: tick the task's checkbox (in the plan's phase file,
   or in the issue body when the work is tracked as an issue), and on the
   first task of a phase or issue set its `Status` (the plan's phase table,
   or the issue's Project item if it lives on a board) to `In Progress`.
   `Done` waits for the merge in `hs-ship`. The mechanics are in
   `../_shared/github-playbook.md` §7.

When the phase's tasks are done, ask for `hs-code-review` on the phase's
diff before handing off.

## Domain routing

When a task touches a domain skill, follow `../_shared/domain-routing.md`: detect the domain from the
plan's files and the task, say so in one line, then use its capabilities
around the task loop - `prepare` before implementing, `validate` after, and the
domain's finish guidance once the phase is otherwise done. Domain skills own
the expertise; this skill still owns the order, the commits, and the evidence.

- **Frontend** (`hs-frontend-development`): `prepare` reads PRODUCT.md and
  DESIGN.md and loads `../hs-frontend-development/references/build.md` (foundation check, production
  bar, visual iteration). The confirmed design brief is the design input, so
  build.md's brief step is already satisfied; if a new UI surface has no brief,
  go back to `hs-brainstorm`. `validate` is `../hs-frontend-development/references/check.md` on the
  changed files. Testing a UI task includes looking at it: run the app and
  inspect mobile, tablet, and desktop widths in a browser (`hs-test` black-box
  mode, Playwright MCP) and read the screenshots back; if no browser is
  available, say so instead of claiming it looks right. The finish step is
  `../hs-frontend-development/references/finish.md`, a polish pass on work that is already
  functionally complete. It changes finish quality only; new features go
  through the plan.
- **Backend** (`hs-backend-development`): `prepare` reads the project's existing
  layers, stack, and API conventions and loads the matching reference before
  the code is written. `validate` is a read-only check of the changed files
  (input validation, access control, N+1 queries, negative-path tests, logging);
  the suite itself still runs through `hs-test`. No migration or external write
  runs without the user's confirmation, routing or not.
- **Devops** (`hs-devops`): consult it directly for pipelines and
  infrastructure. It stays out of routing because its own gates confirm
  actions that are hard to undo.

Findings from `hs-code-review` come back through the review-fix loop below,
with a frontend P0 treated as critical.

## Implementation notes

Record the decisions made during the build that the plan didn't settle: a
deviation and why, a library or pattern chosen, a trade-off accepted, a
constraint discovered in the code. A later session or a reviewer needs
these to understand the change without re-deriving them from the diff.

- Write them to `implementation-notes.md` next to the plan's `plan.md`. For
  work from a GitHub issue with no active plan directory (the plan was
  archived, or never existed), put them in the issue's progress comment
  instead (see `references/github-issue-workflow.md`).
- Each entry names the decision, the reason, and the files it affects.
- Record decisions only. The diff and `git log` already show what changed,
  so a list of edits adds nothing.
- Skip the file entirely when the build followed the plan with nothing left
  to decide.

## Review-fix loop

After `hs-code-review` reports findings (on the local diff, or on the PR
during `hs-ship`), fix and re-verify rather than looping indefinitely on
disagreement:

1. Fix anything that's clearly critical (security, data loss, a broken
   acceptance criterion) - always, no negotiation.
2. Re-run the check that proves the fix (the failing test, the reproduction
   steps) before calling it fixed, then commit the fix like any other task.
3. Cap it at 3 fix-review cycles. If real disagreement remains after that -
   a finding you believe is a false positive, or a fix that would need
   scope the plan didn't cover - stop and hand the specific disagreement to
   the user instead of cycling a fourth time.

Non-critical findings (style, minor suggestions) don't need the same rigor
- use judgment on whether they're worth a cycle at all.

## Handoff

When every task in the phase is committed and marked and the review is
clean, hand off to `hs-ship` with the branch, the commits, the test
evidence, and the linked issue numbers.

## References

- `references/github-issue-workflow.md` - picking up and marking a GitHub
  issue.
- `../_shared/github-playbook.md` §7 - progress marking mechanics.
- `../_shared/evidence-policy.md` - what counts as evidence for a claim.
- `../_shared/domain-routing.md` - when and how a domain skill is used.
- `../hs-frontend-development/references/build.md` and `../hs-frontend-development/references/finish.md` - frontend `prepare` (production bar) and the finish pass.

## Make it yours

Add your own habits on top of this - always run a linter before each
commit, always re-read the diff before moving on. This skill only covers
the minimum: follow the plan, prove each task, commit it, mark it, get
reviewed.
