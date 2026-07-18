# Harness Skills

A small, opinionated development harness for coding agents: spec first, small
verifiable steps, real evidence before "done," a human in the loop where it
matters.

| Frame | Where it lives |
|---|---|
| Instruction | this file + `skills/*/SKILL.md` |
| Tools | your agent's built-in tools + `scripts/` + `hooks/` |
| State | `.harness/specs/<id>-<slug>/{spec,plan,progress,implement-notes}.md`, `.harness/specs/INDEX.md`, `.harness/state/` |
| Feedback | scripts write pass/fail verdicts to disk as facts, not self-reports |
| Env | the project you're actually working in |

## The phases

```
hs-brainstorm -> hs-plan -> hs-build -> hs-verify -> hs-review -> hs-ship
                                                       (advisory)
```

- `hs-brainstorm` turns a vague ask into an approved spec.
- `hs-plan` breaks the spec into small tasks, each with its own verify command, plus a baseline.
- `hs-build` implements one task at a time, verifying each before moving on.
- `hs-verify` is the whole-suite sensor — the one place "done" becomes a fact, not an opinion.
- `hs-review` gets an independent, structured second opinion on the verified diff — correctness, security, performance, quality, test coverage. Advisory: recommended before shipping, but `hs-ship` does not require it to have run.
- `hs-ship` is the last gate: nothing commits or pushes without an explicit human yes.

Each phase's exit condition is in its own `SKILL.md`. Don't skip ahead — a
trivial one-line change (typo, config value) is exempt from the full flow but
still gets an `hs-verify` pass before it ships.

Route from state, not memory:

```
Task arrives
    |
    +-- .harness/ missing or current-spec empty? ----------> hs-brainstorm
    +-- spec.md not "approved" yet? -----------------------> hs-brainstorm
    +-- spec approved, plan.md missing or not approved? ---> hs-plan
    +-- plan approved, unchecked tasks in progress.md? ----> hs-build
    +-- all tasks [x], no valid verify attestation? -------> hs-verify
    +-- attestation valid, no "## Review" in progress.md? -> hs-review (recommended, not required)
    +-- attestation valid, user wants to commit/PR? -------> hs-ship
```

## State conventions

Specs live one-per-feature under `.harness/specs/<id>-<slug>/`, never as a
single flat file — a second feature would silently overwrite the first's
history otherwise.

- `.harness/specs/INDEX.md` — one row per spec: ID, slug, phase, last updated.
- `.harness/state/current-spec` — one line, which spec directory is active.
- `.harness/state/specs/<id>-<slug>/checks/` — per-check evidence (`<label>.status`/`.json`/`.log`)
  and the spec's attestation, bound to the exact worktree state; runtime,
  not durable — safe to gitignore, `hs init` does this for you.
- `spec.md`/`plan.md` carry a `**Status:** draft|approved` line only a human
  can flip to `approved`. `progress.md` is an append-only log of completed
  tasks with their verify evidence. `implement-notes.md` records judgment
  calls the plan didn't spell out.

`.harness/specs/` is durable project history — commit it. `.harness/state/`
is per-worktree runtime evidence — gitignore it (`hs init` wires this).

Where the `sessionState` hook is wired, a digest rebuilds into
`.harness/state/session-summary.md` at session start — read it if present;
it's a shortcut, not a replacement for `.harness/specs/` itself.

## Subagents: scouting and review

Two narrow jobs are worth delegating to a separate subagent rather than doing
inline with the main model:

- **Scouting** (before each phase): delegate broad reading — existing code,
  docs, an external API — to a cheap/fast subagent.
- **Review** (`hs-review`, before shipping): delegate the diff review to a
  context-independent subagent so it isn't reviewed by the same context that
  wrote it.

See `docs/agents.md` for both roles, their per-agent wiring, and when to use
each. No subagent mechanism available for either? Do the same work inline
instead — scouting is still worth doing cheaply; review is still worth doing
with a fresh, deliberate re-read rather than skipping it. Don't skip either
step.

## Human in the loop

Spec approval, plan approval, and anything that ships (commit/push/PR) always
stop and wait for an explicit human answer — never assume silence means yes.
Mid-build, only escalate for destructive actions or a requirement that turns
out ambiguous once you're implementing it.

## Hooks

`hs.settings.json` at the repo root configures four optional hooks:
`privacyBlock` (block reading/exposing secrets), `shipGate` (block
commit/push without a valid verify attestation), `sessionState` (rebuild the
session digest), `monitoring` (audit log of matched tool calls). See
`hooks/README.md` for per-agent wiring and coverage limits. Skills work fully
without hooks; hooks add scoped enforcement on top.

## Customizing this for your project

This file and `skills/*/SKILL.md` are templates, not fixed law — adjust them
to fit the project you're installing the harness into:

- **Test/lint/build commands**: `hs-plan` and `hs-verify` ask for these at
  runtime rather than hardcoding them, so nothing here usually needs editing
  for a new stack. If your project's commands are non-obvious, note them
  directly in this file so every skill finds them without asking.
- **`hs.settings.json`**: turn hooks on/off, tune `privacyBlock`'s
  allow/deny lists, adjust `shipGate.blockCommands`.
- **Phase count**: five phases is the default, not a minimum. A project doing
  only quick fixes might collapse `hs-brainstorm`/`hs-plan` into one pass —
  edit the SKILL.md files to match, but keep an exit condition on whatever you
  keep, or "looks done" quietly becomes "is done" again.
- **Skill wording**: `skills/*/SKILL.md` are plain markdown — reword,
  retitle, or add project-specific rationalizations/failure modes as you find
  them. Keep each skill's frontmatter `name` matching its directory and its
  `description` stating both what it does and when to use it — that's what
  the agent uses to trigger it.
