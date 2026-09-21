# Plan Organization

Keep a plan in one `plan.md` until separately verifiable phases add real
execution value. A phase groups work; it is not automatically an issue,
dependency, or domain bucket.

## Location

Use the plan location from `SKILL.md`, with one directory per plan named
`<timestamp>-<descriptive-slug>/`.

## Multi-file layout

```text
plans/<timestamp>-<slug>/
├── plan.md                     # overview, scope, and phase table
├── phase-01-<name>.md
├── phase-02-<name>.md
└── implementation-notes.md     # written by hs-build: evidence and decisions
```

`plan.md` stays the entry point. Keep it focused on the outcome, scope,
phase table, cross-plan dependencies, and the acceptance/verification map.

```markdown
## Phases

| Phase | Name | Status |
|---|---|---|
| 1 | [Set up schema](./phase-01-schema.md) | Pending |
| 2 | [Build the API](./phase-02-api.md) | Pending |
```

Use human-readable phase names in link text. Status moves from `Pending` to
`In Progress` to `Done` as `hs-build` and `hs-ship` gather evidence.

## Header and publication ledger

The first lines of a materialized plan identify its execution mode:

```markdown
Mode: local | github
Status: active | publishing | archived | superseded by <link>
```

A GitHub plan in `publishing` is not ready for `hs-build` until publication
is reconciled. In `--gh` mode, keep a ledger of issue creation and verification:

```markdown
## Publication

| Key | Issue title | Tasks covered | Issue | State |
|---|---|---|---|---|
| I1 | Add order creation | 1.1, 1.2 | #41 | verified |
| I2 | Expose orders API | 2.1 | - | planned |
```

The plan is temporary. Archive it when completed or superseded. Consider
durable documentation after implementation and review establish that project
truth changed; planning does not promote it.

## Phase file shape

Each phase covers one ordered chunk. Include only sections the phase needs:

- **Overview** - why this chunk is separately verifiable.
- **Files** - what changes, what is created, and what is removed.
- **Tasks** - coherent changes that can be implemented and verified
  independently. Commit boundaries belong to `hs-build`.
- **Acceptance criteria** - observable checks for the phase.
- **Risks** - material failure modes and how to detect them.

```markdown
## Tasks

- [ ] Add the schema change with compatibility evidence.
- [ ] Add the repository behavior and its focused verification.
```

Drop sections that do not apply. A small phase does not need a padded risk
section.

## Cross-plan dependencies

If this plan blocks or is blocked by another plan, record the relative plan
path and the reason in `plan.md`. Do not build a dependency-tracking system
for a single-repo workflow when a written sentence is sufficient.
