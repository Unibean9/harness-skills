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
still gets a real, worktree-bound check before it ships: run
`npm exec -- hs check --trivial verify-<name> -- <command>` then
`npm exec -- hs attest --trivial` (no spec, no plan, nothing else required —
this is a separate attestation path from the per-spec one `hs-verify` writes,
built specifically so this exemption isn't just a promise the `shipGate` hook
can't actually honor).

This path has no automatic size or scope check — nothing measures whether a
change is actually trivial before accepting a `--trivial` attestation for it.
"Is this genuinely trivial" is a judgment call the model (or the human) makes
honestly, not something `hs` enforces structurally; using it for a change
that isn't trivial defeats the whole harness, the same way lying on any other
step would.

Route from state, not memory:

```
Task arrives
    |
    +-- .harness/ missing or current-spec empty? ----------> hs-brainstorm
    +-- spec.md not "approved" yet? -----------------------> hs-brainstorm
    +-- spec.md has its own "## Tasks" (light mode)? ------> skip hs-plan, go straight to hs-build
    +-- spec approved, plan.md missing or not approved? ---> hs-plan
    +-- plan (or light spec's task list) approved,
    |   unchecked tasks in progress.md? -------------------> hs-build
    +-- all tasks [x], no valid verify attestation? -------> hs-verify
    +-- attestation valid, no "## Review" in progress.md? -> hs-review (recommended, not required)
    +-- attestation valid, user wants to commit/PR? -------> hs-ship
```

This tree is also computed for you, not just described: `npm exec -- hs status`
(or the `sessionState` hook's digest at session start, where wired) prints
the same answer read off disk — phase, next skill, and why. Treat a mismatch
between what it says and what a skill's own exit condition says as a bug to
fix, not something to route around.

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
session digest, plus compute the next-skill phase — see `hs status`),
`monitoring` (audit log of matched tool calls, readable with `hs audit`). See
`hooks/README.md` for per-agent wiring and coverage limits. Skills work fully
without hooks; hooks add scoped enforcement on top. `monitoring` is on by
default — disclose that to anyone else using the harness before they start,
same as any other local dev-tooling telemetry.

## Customizing this for your project

This file and `skills/*/SKILL.md` are templates, not fixed law — adjust them
to fit the project you're installing the harness into:

- **Test/lint/build commands**: `hs-plan` and `hs-verify` ask for these at
  runtime rather than hardcoding them, so nothing here usually needs editing
  for a new stack. If your project's commands are non-obvious, note them
  directly in this file so every skill finds them without asking.
- **`hs.settings.json`**: turn hooks on/off, tune `privacyBlock`'s
  allow/deny lists, adjust `shipGate.blockCommands`.
- **Phase count**: six phases is the default, not a minimum. `hs-brainstorm`
  already collapses `hs-brainstorm`/`hs-plan` into one approval for small
  tasks — a "light" spec+plan file with its own embedded `## Tasks` list (see
  `skills/hs-brainstorm/references/spec-template.md`); no editing required,
  it's a built-in mode, not a customization. `hs-build`/`hs-verify`/`hs-ship`
  run exactly the same either way — only the spec/plan split and its second
  approval round-trip disappear. Collapsing further than that is still a
  valid customization, but keep an exit condition on whatever you keep, or
  "looks done" quietly becomes "is done" again.
- **Skill wording**: `skills/*/SKILL.md` are plain markdown — reword,
  retitle, or add project-specific rationalizations/failure modes as you find
  them. Keep each skill's frontmatter `name` matching its directory and its
  `description` stating both what it does and when to use it — that's what
  the agent uses to trigger it.
