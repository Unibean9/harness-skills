# Using harness-skills with Gemini CLI

`gemini-extension.json` at the repo root declares `contextFileName:
"GEMINI.md"` — Gemini CLI loads that file as always-on project context, and
`GEMINI.md` in turn points at `AGENTS.md`.

## Install

```
gemini extensions install <this-repo-url>
```

This installs the extension and its declared context file. `skills/` ships
alongside it for Gemini builds that read a project `skills/` directory
directly; the guaranteed path either way is the `GEMINI.md` -> `AGENTS.md`
context chain, since that's loaded every session regardless of skill
auto-discovery specifics.

## Usage

Describe the task in a session where the extension is installed. Since
`AGENTS.md` is always-loaded context (not on-demand), the five/six-phase flow
and the routing decision tree are already in front of the model from the
start of the session — Gemini doesn't need to "discover" `hs-brainstorm" the
way an on-demand skill system would.

## Hooks (optional, manual)

Merge `hooks/gemini/settings.snippet.json` into `.gemini/settings.json`
(project) or `~/.gemini/settings.json` (user) for `SessionStart`,
`BeforeTool` (on `read_file`/`write_file`/`replace`/`run_shell_command`), and
`AfterTool` coverage. Gemini's tool names and hook semantics can change
between CLI releases — recheck the snippet against your installed version if
hooks stop matching.

## How it works

- `gemini-extension.json` — the extension manifest: `name`, `description`,
  `version`, `contextFileName`.
- `GEMINI.md` — the context file the manifest declares; reads `AGENTS.md`.
- `AGENTS.md` — the actual instruction set: the phase flow, routing tree,
  state conventions, hooks, and customization notes.
- `hooks/gemini/settings.snippet.json` — manual-merge hook config, separate
  from Claude Code's plugin-auto-wired `hooks/hooks.json` since Gemini's hook
  schema differs.

## Troubleshooting

| Symptom | Check |
|---|---|
| Harness behavior isn't showing up | Confirm the extension actually installed and `GEMINI.md` is being loaded — since it's always-on context, not a skill, there's no "did it trigger" question, only "did it load." |
| Hooks don't fire after merging the snippet | Gemini CLI tool names change across releases — diff the snippet's matchers against your installed version's actual tool names. |
| Behavior feels stale after editing AGENTS.md | Restart the session — `GEMINI.md`'s context load happens at session start, not live. |
