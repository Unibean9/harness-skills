# Using harness-skills with Codex CLI

`.codex-plugin/plugin.json` at the repo root declares `"skills": "./skills/"`
and an empty `hooks` object — Codex surfaces skills natively and runs no
session-start hook, so the empty object exists specifically to suppress
Codex from trying to auto-load Claude Code's `hooks/hooks.json`.

## Install

Point Codex at this repo using whichever plugin/extension mechanism your
Codex CLI version supports. If your version has no plugin-install command,
`AGENTS.md` + `skills/` still work as long as this repo is the working
directory or a parent context Codex reads instructions from — no plugin
mechanism is required for the skills themselves to be readable and usable.

## Usage

Describe the task; Codex should surface a matching skill from `skills/`
based on its `name`/`description` frontmatter. If it doesn't, point at the
skill directly the first few times.

## Hooks (optional, manual)

The four guardrail hooks (`privacyBlock`, `shipGate`, `sessionState`,
`monitoring`) aren't auto-wired for Codex the way they are for Claude Code's
plugin install. Merge `hooks/codex/hooks.json.snippet` into
`.codex/hooks.json` (project) or `~/.codex/hooks.json` (user) to get
`SessionStart`, `PreToolUse`, and `PostToolUse` coverage for `Bash` and
`apply_patch`. This requires trusting the project's `.codex/` layer and any
changed hooks — Codex's own trust model, not something this repo can bypass.

## How it works

- `.codex-plugin/plugin.json` — manifest with `skills: "./skills/"`,
  `hooks: {}`.
- `skills/<name>/SKILL.md` — same files Claude Code and Gemini read; nothing
  Codex-specific in them.
- `hooks/codex/hooks.json.snippet` — the manual-merge hook config, separate
  from Claude Code's auto-wired `hooks/hooks.json` because Codex's hook
  schema and trust model differ.

## Troubleshooting

| Symptom | Check |
|---|---|
| Skills not found | Confirm Codex is actually reading `.codex-plugin/plugin.json`'s `skills` path, or that this repo is the working directory / a read context. |
| Hooks don't fire after merging the snippet | Codex requires the project's `.codex/` layer to be trusted and the specific hooks to be reviewed/trusted — check Codex's own trust prompts, not this repo's config. |
| Privacy/ship-gate coverage feels incomplete | By design — matchers cover `Bash` and `apply_patch` only; this is a guardrail, not a complete privacy or ship boundary (see `hooks/README.md`). |
