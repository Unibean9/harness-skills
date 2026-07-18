# Using harness-skills with Cursor

`.cursor-plugin/plugin.json` at the repo root declares `"skills":
"./skills/"` for skill discovery. Cursor has since added its own native
hooks and subagents system (separate from this repo's `.cursor-plugin/`
manifest) — this repo's guardrail hooks and `hs-scout`/`hs-reviewer`
subagents aren't wired for Cursor's version of either yet, but the
mechanism to do so now exists on Cursor's side. This file reflects that:
skills ship today, hooks/subagents are documented as a manual next step
rather than "not available."

## Install

**One command (skills + subagents + pointer rule):**

```bash
npm exec -- hs setup --target cursor
```

Writes `.cursor/skills/`, `.cursor/agents/hs-scout.md`/`hs-reviewer.md`, and
`.cursor/rules/harness-skills.mdc`. Hooks are intentionally NOT wired — see
"Hooks" below for why. Requires the package installed locally
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
Follow AGENTS.md and skills/hs-*/SKILL.md in this repo for any nontrivial
change: spec first, small verifiable tasks, real verify evidence before
"done", human approval before shipping.
EOF
```

Re-run the `cp` step whenever `skills/hs-*` changes upstream — nothing here
auto-syncs.

## Usage

Describe the task; Cursor should match against `skills/*/SKILL.md`'s
`name`/`description` frontmatter the same way it would any project skill. If
it doesn't trigger on its own, invoke the relevant skill by name the first
few times.

## Hooks (native to Cursor, not wired by this repo yet)

Cursor has its own first-class hooks system, shared with Cursor CLI:
`.cursor/hooks.json` (project) or `~/.cursor/hooks.json` (user), with events
including `sessionStart`/`sessionEnd`, `preToolUse`/`postToolUse`/
`postToolUseFailure`, `beforeShellExecution`/`afterShellExecution`,
`beforeReadFile`/`afterFileEdit`, `subagentStart`/`subagentStop`, and `stop`.
This is a different schema from Claude Code's `hookSpecificOutput` shape, so
this repo's `hooks/*.mjs` scripts can't be pointed at Cursor's `hooks.json`
unmodified — `session-state.mjs` in particular hardcodes Claude Code's
`hookSpecificOutput.additionalContext` output field, which Cursor doesn't
read. Adapting each script to detect Cursor and emit its expected shape is
the remaining work, not a missing feature on Cursor's end.

Skills work fully without hooks — this is a missing *harness-side*
enforcement layer, not a missing Cursor capability.

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
  `hooks` field (this repo doesn't ship a Cursor hooks snippet yet).
- `skills/<name>/SKILL.md` — same files every other agent reads.
- `.cursor/agents/*.md` — generated per project by `npm exec -- hs agents
  --target cursor`, if `.claude/agents/` isn't already present in the project.

## Troubleshooting

| Symptom | Check |
|---|---|
| Skills not found | Confirm Cursor is reading `.cursor-plugin/plugin.json`'s `skills` field, or fall back to pointing it at `skills/*/SKILL.md` directly. |
| Expecting hook-based guardrails (privacy block, ship gate) | This repo doesn't ship a Cursor `hooks.json` snippet yet — Cursor's hook mechanism itself works, see "Hooks" above. |
| Expecting `hs-scout`/`hs-reviewer` to just work | Check whether `.claude/agents/` is present in the project (Cursor reads it directly); otherwise run `npm exec -- hs agents --target cursor` per "Subagents" above. |
| A skill's behavior differs from Claude Code's | It shouldn't — `skills/*/SKILL.md` is the one canonical source every agent reads unmodified. If it does differ, that's a bug worth reporting, not an intentional per-agent variation. |
