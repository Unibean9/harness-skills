# `.hs.json` Artifacts Convention

Shared pattern for resolving default output directories, used by skills
that produce persisted output (plans, PRDs, test evidence).

## Pattern

1. Read the repository-root `.hs.json` (optional; skills only read it,
   never write it).
2. Look up `artifacts.<kind>.directory`, where `<kind>` is a skill-specific
   key (e.g. `plans`, `brainstorms`).
3. If the key or file is absent/unreadable, fall back to that skill's own
   hardcoded default directory name.
4. An explicit path argument from the user always overrides both.

## Known `<kind>` keys in use

| Skill | `<kind>` key | Fallback if absent |
|---|---|---|
| `hs-plan` | `artifacts.plans.directory` | `plans` |
| `hs-brainstorm` | `artifacts.brainstorms.directory` (for the optional PRD report) | `plans/reports` |
| `hs-test` | `artifacts.test_evidence.directory` (for captured black-box evidence) | `plans/reports/evidence` |

`artifacts.plans.archiveDirectory` (fallback `plans/archive`) is where
`hs-plan` and `hs-ship` move finished plans (see Artifact lifecycle below).
The scout guard in `hooks/scout-block.mjs` also reads it to block broad
reads of archived plans unless the folder is in
`guardrails.hooks.scout.allowlist`.

## Artifact lifecycle

Plans are temporary execution memory. Archive by default when they are
completed or superseded. Promote durable knowledge to the repository's
canonical documentation location before archiving. Delete only on explicit
user request.

```text
plans/
├── <active plans>
├── reports/            # working artifacts: drafts, research, evidence
└── archive/<plan>/     # completed or superseded plans
docs/                   # fallback home for durable knowledge
```

A plan's `plan.md` starts with two lines, `Mode: local | github` and
`Status: active | publishing | archived | superseded by <link>`; a plan
without a `Mode` line is local and active (`hs-plan/references/plan-organization.md`).

**Archive** means moving the plan directory to the archive directory and
then setting `Status: archived` (or `superseded by <link>` to the
replacement) at the top of its `plan.md`. Move first, stamp second: the
`session-init` hook treats the newest `plan.md` outside the archive as the
active plan, and editing the old plan before it moves makes it look
current. Before moving:

1. Confirm what the plan was for is done: its work is published as issues
   and verified, shipped, or replaced by a plan that is already
   materialized and verified. Never archive a plan whose work is neither
   done nor replaced, never one that is still `publishing`, and never the
   current plan while its replacement is only a draft.
2. Find references to the active path (docs, other plans, issue text you
   control) and update them, so nothing breaks. `plans/` is gitignored, so
   search with `rg --no-ignore` or name the path explicitly; a default
   search skips it.

**Promote** when an artifact stops serving only this implementation:
a settled PRD, an architecture decision, a system design. Move or rewrite it
where the repository already keeps such documents (an existing `docs/`, an
ADR folder, or a location its README or agent rules name); use `docs/` only
when there is no convention. An artifact that only served this execution
(research notes, evidence, implementation notes) stays in `plans/reports/`
and is archived with the plan. Issues then link to the canonical document
and carry only the context a reader needs, not a copy of the PRD.
