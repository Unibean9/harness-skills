# Plan Lifecycle

`hs-plan` has one planning loop and two publication targets. This file owns
the state model, the approval gate, and what materializing means in each
mode. The GitHub mechanics (writing issues, dedup, blockers, verification
checklist) are in `../../_shared/github-playbook.md`; archiving and
promotion rules are in `../../_shared/hs-json-artifacts-convention.md`.

**Planning is a feedback loop; publishing is a side effect.** Files, issues,
Project items, relationships, archiving, and deleting are all side effects.
Until the user approves, the plan is a conversation, so changing it costs
nothing and leaves nothing to clean up.

```
DRAFTING  (conversation only, no writes)
  Draft vN -> Feedback -> Revise -> Draft vN+1 ...
      | explicit approval of vN's manifest
      v
MATERIALIZING
  Local:  write plans/<plan>/                      -> ACTIVE-LOCAL
  --gh :  write plans/<plan>/ (Status: publishing)
          -> publish -> verify
             all verified -> promote, archive      -> ACTIVE-GITHUB
             anything else                         -> PUBLISHING

ACTIVE-LOCAL  --hs-ship, every phase Done-->  ARCHIVED (completed)
ACTIVE-*      --replacement verified------->  ARCHIVED (superseded)
```

## Mode

The mode is fixed at invocation and shown at the top of every draft.

- No `--gh`: **Local mode**. Never create a GitHub artifact.
- `--gh`: **GitHub mode**. The invocation is not an approval to publish.

Never switch silently. If the user asks to change mode mid-conversation,
restate the mode in the next draft. If GitHub mode can't run (see Preflight),
stop and say so; the user picks between fixing the environment and rerunning
without `--gh`. Never fall back to local on your own, and never publish part
of a plan and continue as if it were local.

## Drafting

Draft in the conversation. Analyze requirements, propose phases and tasks,
split, merge, and reorder them, challenge scope, and preview the issue
mapping and dependencies. None of that writes anything. A `planner`
subagent may help, but its brief says to return the draft as text.

Each draft states its version and what changed since the last one:

- Mode, scope in and out, phases with tasks and acceptance criteria, risks,
  open questions.
- **Manifest**: exactly what approval will cause.
  - Local: the plan directory and files, plus the old plan to archive if
    this replaces one.
  - `--gh`: everything above plus the **issue map** (issue, tasks it covers,
    why that is one PR, acceptance, real blockers with the reason, type and
    labels), whether a Project is used, and which documents get promoted.

Run `validate-checklist.md` before presenting a draft, and again after any
revision, so the user reviews something already consistent.

## Approval

End the draft with a prompt that names the mode and the manifest and asks the
user to approve it.

Counts as approval: a reply to that prompt that clearly approves this
draft ("approve", "chốt", "create it").

Does not count: silence, general praise ("looks good", "hay đó"), a bare
"ok", a thumbs-up, feedback that also asks for edits, the `--gh` flag, or
approval of an earlier version. When unsure, ask once more and name the
action.

Approval covers the manifest as shown. If the manifest changes afterwards,
ask again. Materializing renders the approved draft; it does not re-plan. If
writing the files shows a needed task the draft lacks, stop and reopen
feedback.

## Materialize: Local mode

1. Confirm the target directory name is free.
2. Write `plan.md` and phase files with `Mode: local` and `Status: active`
   at the top (`plan-organization.md`).
3. Verify: every link resolves, and each approved task appears exactly once
   with nothing added.
4. If this replaces a plan, archive the old one now (see Replacement).

`hs-build` works from the local plan and `hs-ship` archives it when every
phase is `Done`.

## Materialize: `--gh`

**Preflight** (read-only, at invocation and again at approval): `gh auth
status`, a GitHub remote, the `gh` flags needed for types and blockers, and
the `project` scope if a Project is planned. Any failure stops the run.

After approval:

1. Write the plan directory with `Mode: github`, `Status: publishing`, and a
   `## Publication` ledger listing every intended issue as `planned`.
2. Publish blockers first. For each issue: dedup (playbook §4), create,
   and record its number in the ledger immediately. Then add relationships
   and the Project items.
3. Verify with the checklist in playbook §6. Only when every item passes is
   the publish a success.
4. On success: promote documents named in the manifest, set
   `Status: archived` with the issue numbers, and move the directory to the
   archive. GitHub is now the execution tracker; the archived plan is a
   snapshot for history. Do not delete it.
5. On anything else the plan stays in `plans/` as `publishing`. Report what
   was created, what failed, and what is unverified. Say it is partial, not
   done.

**Reconcile** a `publishing` plan by reading its ledger, then searching for
each unverified row by exact title before creating anything. Adopt what is
found instead of creating a duplicate. Retrying the same manifest needs no
new approval; a changed manifest does. Closing already-created issues to
abandon a publish is a separate action the user must confirm.

## Source of truth by state

| State | Source of truth |
|---|---|
| Drafting, awaiting approval | The draft in the conversation. Nothing persistent is new. |
| ACTIVE-LOCAL | `plans/<plan>/` |
| PUBLISHING | The ledger for publication state, GitHub for what exists. Not an execution tracker: `hs-build` refuses it. |
| ACTIVE-GITHUB | GitHub Issues and Project. The archived local plan is a snapshot. |
| Archived | History only |
| Durable product or design knowledge | The repo's canonical docs, in every state |

## Replacement and archiving

- While a replacement is being drafted, leave the current plan exactly as it
  is. Archive it only after the new plan is materialized and verified.
- Archive by moving the directory to the archive directory first, then
  stamping `Status: superseded by <link>` (or `archived`) inside it. The
  `session-init` hook treats the newest `plan.md` outside the archive as
  the active plan, so stamping before the move can leave the old plan looking
  active.
- After moving, find references to the old path and fix them. Search with
  `rg --no-ignore`, since `plans/` is gitignored.
- Delete only when the user asks.

## Promoting durable knowledge

`plans/` and `plans/reports/` are working areas. A PRD, design, or research
note that becomes lasting project knowledge is promoted to the repo's
canonical documentation location before its plan is archived: follow the
repo's existing convention, and use `docs/` only when it has none. Promotion
is listed in the manifest. Issues link to the promoted document; they do not
copy it.
