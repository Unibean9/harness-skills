# Picking Up Work From a GitHub Issue

Use this when the work to implement is tracked as a GitHub issue - typically
a phase `hs-plan` published as an issue, or one picked from the backlog.
Plain local-plan work doesn't need it.

## 1. Pull the issue

```bash
gh issue view <n> --json title,body,labels,state,assignees,comments
```

The issue body is the plan for this phase: implement its Tasks checklist
against its Acceptance criteria, the same way you'd implement a phase file.
If the issue links back to a `plan.md`, read that too. Don't re-derive
scope from the title alone.

## 2. Confirm it's actually free to pick up

Before starting, check nobody's already mid-work on it:

```bash
gh pr list --search "<n> in:body" --state open --json number,title,url
```

An open PR referencing the issue, or a recent assignee that isn't you,
means coordinate first rather than duplicating the work. Once it's yours,
mark it started: phase `Status` -> `In Progress` and the Project item ->
`In Progress` (`../../_shared/github-issues-playbook.md` §5).

## 3. Implement, commit, and mark each task

Follow the task loop in `SKILL.md`. Each task commit references the issue
without closing it - closing happens at merge, through the PR:

```
feat(orders): add OrderRepository.create

Refs #<n>
```

After the commit, tick that task's checkbox in the issue body (playbook §5).
Each tick needs the evidence behind it (the check that passed, the commit) -
not a box ticked from memory.

## 4. Progress comment

For work that spans more than one sitting, post what's done and what's
left before stopping, so the issue stays trustworthy to whoever reads it
next:

```bash
gh issue comment <n> --body-file <progress-summary>
```

When there's no local plan directory, this comment also carries the
implementation notes (see `SKILL.md`): the decisions made during the build
that the issue body didn't settle.

## 5. Hand off

Once every task is ticked and `hs-code-review` findings are resolved, hand
off to `hs-ship`. It opens the PR with `Closes #<n>`, merges, and confirms
the issue actually closed.
