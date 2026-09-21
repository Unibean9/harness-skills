# Plan Lifecycle

`hs-plan` has one planning loop and two publication targets. This file owns
the state model and materialization rules. GitHub mechanics live in
`../../_shared/github-playbook.md`; artifact locations and archiving live in
`../../_shared/hs-json-artifacts-convention.md`.

## Local planning

Local plans are temporary execution memory. They are safe to materialize once
the readiness review is complete; they do not need an approval ceremony.

```text
INTAKE -> INSPECT -> PREPARE -> DRAFT -> READINESS REVIEW -> ACTIVE-LOCAL
                                                        -> hs-build
                                                        -> hs-ship -> ARCHIVED
```

The readiness review confirms that the plan is grounded, scoped, internally
consistent, and executable without inventing a material decision. If the user
wants to collaborate on the draft, revise it in conversation before writing.

## Modes and status

The mode is fixed at invocation and recorded at the top of the materialized
plan:

- No `--gh`: `Mode: local`, `Status: active`.
- `--gh`: `Mode: github`, initially `Status: publishing`.

Never switch modes silently. A local invocation never creates GitHub artifacts.
A GitHub invocation never falls back to local publication when its preflight
or publication cannot run.

## GitHub publication

GitHub publication is an external side effect and still requires explicit
confirmation after the plan and issue manifest are ready.

```text
ACTIVE DRAFT
  -> issue map and publication manifest
  -> explicit confirmation
  -> preflight / dedup / create / link / verify
       all verified -> ACTIVE-GITHUB
       partial or failed -> PUBLISHING
```

Keep the repository's issue templates and conventions, map issues to
independently reviewable work, record only real blockers, and read back created
issues before reporting success. A partial publication remains `publishing`;
reconcile it by adopting existing created issues instead of duplicating them.

## Replacement and archiving

A plan is never deleted unless the user asks. A replacement leaves the current
plan untouched until the replacement is materialized and verified. Archive a
completed or superseded plan through the artifact lifecycle rules; do not
archive work that is still active or publishing.

Project or product documentation is not promoted during planning. After
implementation and review establish that durable project truth changed, the
owning workflow may ask the user whether to update the canonical document.

## Source of truth

- The Decision Brief or agreed direction owns why and what was chosen.
- Current code and tests own what exists.
- The active plan owns intended execution until implementation changes it.
- GitHub issues own shared execution tracking in GitHub mode.
- Implementation and verification evidence supersede plan assumptions.
