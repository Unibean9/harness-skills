# Plan Organization

Use the single-file `plan.md` shape from `SKILL.md` until a plan outgrows
one file - most plans should stay there. Split into phase files only once
tasks genuinely group into ordered, separately verifiable chunks of work
(e.g. "set up schema" then "build the API" then "wire the UI").

## Location

Under the plan location from `SKILL.md`, one directory per plan named
`<timestamp>-<descriptive-slug>/`.

## Multi-file layout

```
plans/<timestamp>-<slug>/
├── plan.md                     # overview + phase table
├── phase-01-<name>.md
├── phase-02-<name>.md
├── ...
└── implementation-notes.md     # written by hs-build: decisions made during implementation
```

`plan.md` stays the entry point - a reader opens it first, then follows
links into phases. Keep it short: overview, the phase table, cross-plan
dependencies if any.

```markdown
## Phases

| Phase | Name | Status | Issue |
|-------|------|--------|-------|
| 1 | [Set up schema](./phase-01-schema.md) | Pending | #42 |
| 2 | [Build the API](./phase-02-api.md) | Pending | - |
```

- **Link text is the human-readable phase name, never the filename** -
  `[Set up schema](./phase-01-schema.md)`, not
  `[phase-01-schema.md](./phase-01-schema.md)`. A reader scanning the table
  should understand the plan without opening every file.
- **Status** moves `Pending` -> `In Progress` -> `Done`; `hs-build` updates
  it as tasks land and `hs-ship` sets `Done` at merge.
- **Issue** holds the issue link once the phase is published (see
  `../../_shared/github-issues-playbook.md`), or `-` when it isn't. In
  offline mode, put the local issue file path here and replace it with the
  real link once the issue is created; keep the local file as a record.

## Phase file shape

Each `phase-NN-<name>.md` covers one ordered chunk. Include only the
sections the phase actually needs - this is a menu, not a required
checklist:

- **Overview** - what this phase does and why it's its own phase.
- **Files** - what changes, what's created, what's removed.
- **Tasks** - an ordered checkbox list; each task is small enough to
  implement, verify, and commit on its own.
- **Acceptance criteria** - how you'll verify this phase is done.
- **Risks** - anything that could go wrong, and how you'd notice.

```markdown
## Tasks

- [ ] Add `orders` table migration
- [ ] Add `OrderRepository.create` with a unit test
```

Drop sections that don't apply. A three-task phase doesn't need a Risks
section if there's nothing risky about it.

## Cross-plan dependencies

If this plan blocks or is blocked by another plan, note it in `plan.md`'s
overview with a relative reference to the other plan's directory. Don't
build a dependency-tracking system for a single-repo, mostly-solo workflow -
a written sentence is enough.
