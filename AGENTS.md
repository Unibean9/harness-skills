# Harness Skills

This repo wires a small, opinionated software-development harness into whatever
coding agent you're running (Claude Code, Codex CLI, Gemini CLI, ...). The harness
is expressed as five frames:

| Frame | Where it lives here |
|---|---|
| Instruction | this file + `.agents/skills/*/SKILL.md` + `.agents/agents/hs-scout.md` |
| Tools | your agent's built-in tools + each skill's bundled `scripts/` + `hooks/` |
| State | `.harness/specs/<id>-<slug>/{spec.md,plan.md,progress.md,implement-notes.md}`, `.harness/specs/INDEX.md`, `.harness/state/` |
| Feedback | the scripts' pass/fail verdicts, written to disk as facts, not self-reported |
| Env | the project you're actually working in |

## Required flow

Non-trivial changes go through five phases, in order, each one a skill:

```
hs-brainstorm -> hs-plan -> hs-build -> hs-verify -> hs-ship
```

Each phase has an exit condition described in its own SKILL.md. Don't skip ahead —
the whole point of the harness is that "looks done" and "is done" are different
claims, and each phase exists to close a specific gap between them. Trivial
one-line changes (typo fixes, a config value) are exempt, but still get a
`hs-verify` pass before anything ships.

## Why these phases, and not others

Every phase either produces a fact or checks one:

- `hs-brainstorm` turns a vague ask into a spec the agent can be held to.
- `hs-plan` turns the spec into small, individually-verifiable steps, and captures
  a baseline so you know what "was already broken" before you touch anything.
- `hs-build` executes the plan and only advances on evidence, not vibes.
- `hs-verify` is the whole-suite sensor — the one place that decides "done" for
  real, independent of what any single task claimed along the way.
- `hs-ship` is the last gate: nothing gets committed or pushed without a human
  looking at it, no matter how green the checks are.

## State conventions

`.harness/` is memory that survives context compaction and session restarts —
read it before doing anything, in a fresh session or otherwise. This process
runs repeatedly and overlappingly on a real project — a second feature starts
while the first is still shipping, a third revisits something already done —
so specs live one-per-feature under `.harness/specs/<id>-<slug>/`, never as a
single flat file a later feature would silently overwrite:

- `.harness/specs/INDEX.md` — one row per spec: ID, slug, phase
  (`brainstorming`/`planning`/`building`/`verifying`/`shipped`), last updated.
  Glance here to see everything this project has ever gone through the
  harness for.
- `.harness/state/current-spec` — one line, the `<id>-<slug>` of whichever
  spec is currently active. Every skill reads this first to know which spec
  directory to work in.
- Inside each spec's directory: `spec.md` and `plan.md` carry a
  `**Status:**` line (`draft` or `approved`) that only a human approval can
  flip to `approved` — an agent should never set that itself. `progress.md`
  is an append-only log: one line per completed task, with the verification
  evidence attached. `implement-notes.md` (written during `hs-build`) records
  judgment calls the agent made that the plan didn't spell out — so "followed
  the plan exactly" and "used judgment here" stay distinguishable in review.

Where the `sessionState` hook is wired (see below), a digest of the active
spec's files gets rebuilt into `.harness/state/session-summary.md` at the
start of every session — read that first if it exists; it's faster than
reading every file from scratch, though it's a convenience, not a
replacement for reading `.harness/specs/` itself when in doubt.

## Scouting before each phase

Reading broadly — surveying code, docs, or an external API — doesn't need the
same model doing the planning or building work. `.agents/agents/hs-scout.md`
describes a narrow, cheap subagent (small/fast model — e.g. Haiku) that
answers one specific question and hands back a condensed briefing, nothing
more. Each skill below names the question it delegates to hs-scout before
starting its own work; use it, or do the same lightweight look inline if no
subagent mechanism is available — don't skip the step either way.

## Human in the loop

Some decisions aren't the agent's to make. Spec approval, plan approval, and
anything that ships (commit/push/PR) always stop and wait for an explicit human
answer — never assume silence means yes. Mid-build, only escalate for things a
sensor genuinely can't decide: destructive actions, or a requirement that turns
out to be ambiguous once you're actually implementing it.

## Hooks, guardrails, and monitoring

Claude Code, Codex CLI, and Gemini CLI all support hooks — a script the harness
runs automatically before/after a tool call or at session start, not something
the model has to remember to invoke itself. That's the one truly enforced
layer. `hs.settings.json` at the repo root is the real config four hooks read:
`privacyBlock` (never expose `.env`-style secrets), `shipGate` (never ship
without a green verify), `sessionState` (rebuild the session digest above),
and `monitoring` (append every tool call to `.harness/state/audit.log` as an
independent record of what actually happened). `hooks/` has the per-agent
wiring — see `hooks/README.md`. Skills work fully without hooks; hooks just
remove the chance that a claimed result and an actual result drift apart.
