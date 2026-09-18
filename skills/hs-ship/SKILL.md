---
name: hs-ship
description: Land verified work - push the branch, open a pull request that links its issues, work through PR review, wait for CI to go green, merge, and confirm linked issues closed - with each outward step confirmed by the user. Use when build, tests, and code review are done, or when asked to ship, open a PR, address PR review comments, or merge. Not for designing CI/CD pipelines (hs-devops).
license: MIT
category: workflow
keywords: [ship, push, pull-request, pr-review, ci, merge]
metadata:
  author: harness-skills
  version: "2.1.0"
  workflow:
    follows: [build, test, code-review]
---

# Ship Skill

Take committed, reviewed work from the branch to merged and done. Push, PR,
and merge are public and hard to take back, so each needs its own
confirmation from the user. Don't chain them into one automatic action.

## 0. Before you start

Confirm the work is actually ready: `hs-test` has run and passed,
`hs-code-review` findings worth blocking on are addressed, and every change
is committed by `hs-build` (`git status` is clean). Shipping known-red or
unreviewed work just moves the problem downstream.

## 1. Push

Confirm the target remote and branch, then push. Push only commits you're
sure belong to this change. If the commits sit on the default branch and
the user wants a PR, ask whether to move them to a new branch; don't create
one on your own (branch naming is in `hs-build`).

## 2. Pull request

Open a PR with `gh pr create` (or your platform's equivalent), using the
body shape in `references/pr-template.md` so the reviewer gets the
evidence without asking. Add `Closes #<n>` for each issue this PR
finishes, so the merge closes it.

## 3. PR review

Read what reviewers said (`gh pr view <n> --comments`, plus inline review
comments). For each finding, fix it through the `hs-build` review-fix loop,
push the new commits, and reply on the thread; or explain why no change is
needed. If no human reviewer is set up, `hs-code-review` on the PR
(`gh pr diff <n>`) is the review.

## 4. CI

If the repo has CI configured, wait for it to go green (`gh pr checks <n>
--watch`). A red check goes back to `hs-build` with its log; never merge
past it. This skill doesn't configure a pipeline or run deployments; see
`hs-devops` for that.

## 5. Merge

With review approved and CI green, ask the user to confirm, then merge
(`gh pr merge <n>` with the repo's usual strategy). If the repo deploys on
merge, report where to watch that deployment.

## 6. Done

The work is done only when all of these hold - verify each rather than
assuming the merge handled it:

- The PR is merged and CI on the target branch is green.
- Each linked issue is closed (`gh issue view <n> --json state`). A missing
  closing keyword or a squash merge that dropped the PR body leaves it
  open; close it with evidence:
  `gh issue close <n> --reason completed --comment "<PR link + evidence>"`.
- The phase `Status` in `plan.md` and its Project item are `Done`
  (`../_shared/github-issues-playbook.md` §5).

Report what shipped: PR link, merge commit, closed issues, and anything
left open. If `hs-build` created a worktree for this work, offer to remove
it now; remove it only if the user agrees.

## References

- `references/pr-template.md` - PR body shape that carries the evidence.
- `../_shared/github-issues-playbook.md` §5 - marking issues and the board
  `Done`.

## Make it yours

Switch to your own merge strategy, skip the PR and review steps if you're
working directly on the main branch for a solo assignment, or skip step 4
if the repo has no CI at all.
