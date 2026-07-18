# Using harness-skills with Cursor

`.cursor-plugin/plugin.json` at the repo root declares `"skills":
"./skills/"` for skill discovery. Cursor has its own native hooks and
subagents system, and this repo now wires the two highest-value guardrails —
`ship-gate` and `privacy-block` — to Cursor's confirmed `beforeShellExecution`/
`beforeReadFile` hook schema. `session-state` and `monitoring` are not wired
yet (see "Hooks" below for exactly what's covered and what isn't).

## Install

**One command (skills + subagents + pointer rule + partial hooks):**

```bash
npm exec -- hs setup --target cursor --with-hooks
```

Writes `.cursor/skills/`, `.cursor/agents/hs-scout.md`/`hs-reviewer.md`,
`.cursor/rules/harness-skills.mdc`, and `.cursor/hooks.json` wiring
`ship-gate.mjs`/`privacy-block.mjs` to `beforeShellExecution`/
`beforeReadFile`. Requires the package installed locally
(`npm i -D github:Unibean9/harness-skills`).

**Manual path** — Cursor has no plugin-marketplace command for installing
this repo directly today, so alternatively sync the skill files by hand:

```bash
mkdir -p .cursor/skills
cp -r /path/to/harness-skills/skills/hs-* .cursor/skills/
```

Then add a short pointer rule so Cursor loads the harness's flow as context
— don't paste full skill contents into a rule, `.cursor/skills/` already has
them:

```bash
mkdir -p .cursor/rules
cat > .cursor/rules/harness-skills.mdc <<'EOF'
---
description: Harness Skills — spec-driven dev flow (hs-brainstorm -> hs-plan -> hs-build -> hs-verify -> hs-review -> hs-ship)
alwaysApply: true
---
Use the installed skills/hs-*/SKILL.md as proportionate guidance for any
nontrivial change: clarify intent, choose useful checks, report evidence and
limits honestly, and get human approval before external actions.
EOF
```

Re-run the `cp` step whenever `skills/hs-*` changes upstream — nothing here
auto-syncs.

## Usage

Describe the task; Cursor should match against `skills/*/SKILL.md`'s
`name`/`description` frontmatter the same way it would any project skill. If
it doesn't trigger on its own, invoke the relevant skill by name the first
few times.

## Hooks (partially wired)

Cursor's hooks system (shared with Cursor CLI) reads JSON from stdin and a
project's `.cursor/hooks.json` (or `~/.cursor/hooks.json` for user-level),
with a `{"version": 1, "hooks": {<event>: [{"command": ..., "failClosed":
...}]}}` shape. `hooks/cursor/hooks.json.snippet` wires:

- **`ship-gate.mjs`** to `beforeShellExecution` — blocks `git commit`/
  `git push`/`gh pr create` without a valid attestation, same rule as every
  other agent.
- **`privacy-block.mjs`** to both `beforeShellExecution` (command-embedded
  paths) and `beforeReadFile` (the `file_path` field) — blocks reads/writes
  matching `denyList`.

Both use `failClosed: true` so a hook error blocks the action instead of
silently allowing it. `block()`/`allow()` in `hooks/lib/common.mjs` print
Cursor's documented `{"permission": "allow"|"deny", "user_message": ...,
"agent_message": ...}` JSON to stdout in addition to the exit-code contract
(`2` = deny, `0` = allow) every other agent already relies on — one shape
serves all three agents. `extractCommand()`/`extractCursorPath()` in the same
file read Cursor's top-level `command`/`file_path` fields, since Cursor
doesn't nest them under `tool_input` the way Claude/Codex do.

**Not wired**: `session-state.mjs` (Cursor's `sessionStart` payload/output
shape isn't adapted yet) and `monitoring.mjs` (would need `afterFileEdit`/
`afterShellExecution` wiring). Skills work fully without either — this is a
missing *harness-side* enforcement layer for those two guardrails
specifically, not a missing Cursor capability.

Windows invocation of `$CURSOR_PROJECT_DIR`-style command strings through
Cursor's hook runner hasn't been independently confirmed the way the Unix
path has — if hooks silently don't fire on Windows, that's the first thing
to check.

## Subagents (native to Cursor)

Cursor has native subagents: Markdown files with YAML frontmatter (`name`,
`description`, `model`, `readonly`, `is_background`) at `.cursor/agents/`
(project) or `~/.cursor/agents/` (user), plus three built-in agents
(`explore`, `bash`, `browser`). Notably, Cursor also reads `.claude/agents/`
directly — if `.claude/agents/hs-scout.md`/`hs-reviewer.md` are already
present in the same project (see `docs/claude-setup.md`), Cursor picks them
up without a separate copy. Otherwise, generate the Cursor-specific files
with one command, from the project root:

```bash
npm exec -- hs agents --target cursor
```

This writes `.cursor/agents/hs-scout.md` and `.cursor/agents/hs-reviewer.md`
from `docs/agents.md`'s source content — see that file's "Per-agent wiring"
for each role's responsibilities.

## How it works

- `.cursor-plugin/plugin.json` — manifest with `skills: "./skills/"`, no
  `hooks` field (`hs setup` writes `.cursor/hooks.json` directly instead).
- `skills/<name>/SKILL.md` — same files every other agent reads.
- `.cursor/agents/*.md` — generated per project by `npm exec -- hs agents
  --target cursor`, if `.claude/agents/` isn't already present in the project.
- `.cursor/hooks.json` — generated from `hooks/cursor/hooks.json.snippet`,
  wiring `ship-gate.mjs`/`privacy-block.mjs` only.

## Troubleshooting

| Symptom | Check |
|---|---|
| Skills not found | Confirm Cursor is reading `.cursor-plugin/plugin.json`'s `skills` field, or fall back to pointing it at `skills/*/SKILL.md` directly. |
| Ship-gate/privacy-block don't fire | Confirm `.cursor/hooks.json` exists and Cursor picked it up (re-run `npm exec -- hs setup --target cursor --with-hooks` if it predates this wiring); on Windows, confirm the `$CURSOR_PROJECT_DIR`-based command string actually resolves in your shell — that path is unconfirmed. |
| session-state/monitoring don't fire | Expected — not wired for Cursor yet, see "Hooks" above. |
| Expecting `hs-scout`/`hs-reviewer` to just work | Check whether `.claude/agents/` is present in the project (Cursor reads it directly); otherwise run `npm exec -- hs agents --target cursor` per "Subagents" above. |
| A skill's behavior differs from Claude Code's | It shouldn't — `skills/*/SKILL.md` is the one canonical source every agent reads unmodified. If it does differ, that's a bug worth reporting, not an intentional per-agent variation. |
