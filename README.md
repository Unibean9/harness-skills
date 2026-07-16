# harness-skills

A small, portable software-development harness for coding agents (Claude Code,
Codex CLI, Gemini CLI, Cursor), expressed as [Agent Skills](https://agentskills.io)
and shipped as a per-agent plugin. Spec first, small verifiable steps, real
evidence before "done," a human in the loop where it matters — a workflow
that survives swapping which model or agent is doing the work.

## The phases

```
hs-brainstorm -> hs-plan -> hs-build -> hs-verify -> hs-review -> hs-ship
                                                       (advisory)
```

One skill per phase, each with an exit condition: `hs-brainstorm` and
`hs-plan` gate on explicit human approval; `hs-build` verifies task-by-task;
`hs-verify` is the whole-suite sensor; `hs-review` gets an independent
second opinion on the diff (correctness/security/performance/quality/tests)
and is advisory — `hs-ship` doesn't require it to have run; `hs-ship` never
auto-commits or auto-pushes. See `AGENTS.md` for the full flow and each
`skills/*/SKILL.md` for the phase's own detail — this README stays a map, not
a copy.

## Install

Install once per agent; it then applies to whatever project you're working
in — no copying files into each project.

- **Claude Code**: `/plugin marketplace add Unibean9/harness-skills` then
  `/plugin install harness-skills`. Details: `docs/claude-setup.md`.
- **Codex CLI**: point Codex at this repo. If your Codex version has no
  plugin-install mechanism, `AGENTS.md` + `skills/` still work when this repo
  is the working directory or a parent context it reads from. Details:
  `docs/codex-setup.md`.
- **Gemini CLI**: `gemini extensions install <this-repo-url>`. Details:
  `docs/gemini-setup.md`.
- **Cursor**: skill discovery only for now — `.cursor-plugin/plugin.json`
  points at `skills/`. Hook-based guardrails aren't wired for Cursor yet.
  Details: `docs/cursor-setup.md`.

Once installed, start the agent and ask for something. It should reach for
`hs-brainstorm` on its own; if it doesn't, invoke it explicitly the first few
times until the description's triggering is proven out.

To iterate on this repo itself, `/plugin marketplace add ./` (Claude Code)
loads `.claude-plugin/marketplace.json` directly — editing any
`skills/*/SKILL.md` or `hooks/*.mjs` takes effect on the plugin's next load,
no build or sync step.

## Customizing

Nothing here is fixed law — this is a starting point meant to be adjusted per
project:

- **`hs.settings.json`** turns the four hooks on/off and holds the couple of
  fields that genuinely vary per project (`privacyBlock`'s allow/deny lists,
  `shipGate.blockCommands`).
- **`AGENTS.md`** is the instruction file every skill and agent reads first —
  add your project's test/lint/build commands there if they're non-obvious,
  or note conventions specific to your codebase.
- **`skills/*/SKILL.md`** are plain markdown. Reword them, add
  project-specific failure modes, or collapse phases for a smaller project —
  just keep each skill's frontmatter `name` matching its directory and give
  its `description` both what it does and when to use it, since that's what
  triggers it.
- **Hook count**: four are wired (`privacyBlock`, `shipGate`, `sessionState`,
  `monitoring`, see `hooks/README.md`). Adding a guardrail is a new
  `hs.settings.json` key plus a new `hooks/<name>.mjs` — no change to the
  existing three.

## Compatibility

| Agent | Instruction / skills | Hooks | Known limits |
|---|---|---|---|
| Claude Code | `AGENTS.md`; plugin auto-discovers root `skills/` | `hooks/hooks.json` auto-wires on install | Privacy matched only for `Read`/`Write`/`Edit`/`Bash`; ship gate only covers `Bash`. |
| Codex CLI | `AGENTS.md` and `skills/` via `.codex-plugin/plugin.json` | Merge `hooks/codex/hooks.json.snippet` into `.codex/hooks.json` | Matchers cover `Bash` and `apply_patch`; privacy is a guardrail, not a complete privacy boundary. |
| Gemini CLI | `GEMINI.md` -> `AGENTS.md`, and `skills/` | Merge `hooks/gemini/settings.snippet.json` into `.gemini/settings.json` | Tool names/hook semantics can change with CLI releases. |
| Cursor | `.cursor-plugin/plugin.json` declares `skills: "./skills/"` | Not wired yet | Skill discovery only, no guardrail hooks. |

Run `npm test` for the Node 22+ compatibility suite; CI runs the same
command. State/verification is Node-native — `scripts/next-spec-id.mjs`,
`run-check.mjs`, `attestation.mjs`, `check-ship-ready.mjs` — zero dependency
beyond Node.js.

## What's deliberately not here yet

- **No MCP server.** Custom tools are bundled Node utilities, not a typed
  `harness-state` server — a reasonable next step, not a first one.
- **No `hs-debug` skill.** Error-driven retry-then-escalate lives inside
  `hs-build`/`hs-verify` directly.
- **The scouting and review subagents (`hs-scout`, `hs-reviewer`) are fully
  wired for Claude Code only** (`agents/hs-scout.md`, `agents/hs-reviewer.md`,
  both generated from `docs/agents.md`). Codex/Gemini/Cursor need manual setup
  per that file's notes.
- **Cursor hook wiring.** `session-state.mjs` hardcodes Claude Code's JSON
  output shape; pointing Cursor at it unmodified would silently inject
  nothing, so it isn't wired until adapted.
