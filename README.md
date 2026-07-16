# harness-skills

A small, portable software-development harness for coding agents (Claude Code,
Codex CLI, Gemini CLI), expressed as [Agent Skills](https://agentskills.io).
Goal: teach a workflow — spec first, small verifiable steps, real evidence
before "done," a human in the loop where it matters — that survives swapping
which model or which agent is doing the work.

## The five frames

| Frame | This repo |
|---|---|
| Instruction | `AGENTS.md` + `.agents/skills/*/SKILL.md` + `.agents/agents/hs-scout.md` |
| Tools | the agent's built-in tools + each skill's `scripts/` + `hooks/` (application-owned tool calls, configured in `hs.settings.json`) |
| State | `.harness/specs/<id>-<slug>/{spec,plan,progress,implement-notes}.md`, `.harness/specs/INDEX.md`, `.harness/state/` (in the *target* project, not here) |
| Feedback | scripts write pass/fail verdicts to disk as facts, not self-reports |
| Env | whatever project the harness is installed into |

## Specs, plural — not one flat file

`hs-brainstorm` -> `hs-plan` -> ... -> `hs-ship` doesn't run once per project;
it runs once per feature, repeatedly and often overlappingly. A single
`.harness/spec.md` would mean the second feature silently overwrites the
first's history. Instead every feature gets its own directory —
`.harness/specs/<id>-<slug>/` — and `.harness/specs/INDEX.md` is a one-glance
table of every spec this project has had, with its current phase. A single
`.harness/state/current-spec` file (just the id-slug, one line) tells every
skill which directory is active right now, so nothing has to be repeated to
the agent by hand each session.

## Scouting before each phase

Before each phase does its own work, it delegates a narrow question to
`hs-scout` — a subagent meant to run on a cheap/fast model (Haiku or
equivalent), whose only job is reading code/docs (and web search, only if
genuinely needed) and handing back a condensed briefing. See
`.agents/agents/hs-scout.md`. This keeps the expensive reasoning model out of
broad-survey work it doesn't need to do itself.

## The five phases

```
hs-brainstorm -> hs-plan -> hs-build -> hs-verify -> hs-ship
```

One skill per phase, each with an exit condition. `hs-brainstorm` and `hs-plan`
gate on explicit human approval; `hs-build` loops task-by-task with real
verification per task; `hs-verify` is the whole-suite sensor; `hs-ship` never
auto-commits or auto-pushes. See each `SKILL.md` for the full detail — this
README stays a map, not a copy.

## Quickstart

1. Copy (or `git clone`) this repo's contents into the project you want the
   harness in — or point your agent at it directly if it already reads
   `AGENTS.md` from a parent/shared location.
2. Run the installer once per project (it preserves existing non-harness
   Claude skills; use `-Force` or `--force` only when intentionally replacing
   one):
   - `bash install.sh` (macOS/Linux/Git Bash)
   - `./install.ps1` (Windows PowerShell)

   This links `.agents/skills/*` into `.claude/skills/` for Claude Code. Codex
   CLI and Gemini CLI consume `.agents/skills/` directly in the supported
   configurations below. Hook wiring remains an optional, manual setup.
3. Optionally wire the four hooks configured in `hs.settings.json`
   (`privacyBlock`, `shipGate`, `sessionState`, `monitoring`): merge the
   matching snippet into your agent's settings —
   `hooks/claude-code/settings.snippet.json` -> `.claude/settings.json`,
   `hooks/codex/hooks.json.snippet` -> `.codex/hooks.json`, or
   `hooks/gemini/settings.snippet.json` -> `.gemini/settings.json`.
4. Start the agent and ask for something. It should reach for `hs-brainstorm`
   on its own; if it doesn't, invoke it explicitly the first few times until
   the description's triggering is proven out.

## Supported compatibility contract

| Agent | Instruction / skills | Hook configuration and events | Prerequisites | Known limits |
|---|---|---|---|---|
| Claude Code | `AGENTS.md`; installer links `.agents/skills/*` to `.claude/skills/*` | Merge `hooks/claude-code/settings.snippet.json` into `.claude/settings.json`: `SessionStart`, `PreToolUse`, `PostToolUse` | Node.js on `PATH`; Git Bash or WSL for Claude Code on Windows | Privacy is matched only for `Read`, `Write`, `Edit`, and `Bash`; ship gate only covers `Bash`. |
| Codex CLI | `AGENTS.md` and `.agents/skills/` | Merge `hooks/codex/hooks.json.snippet` into `.codex/hooks.json` (project) or `~/.codex/hooks.json` (user): `SessionStart`, `PreToolUse`, `PostToolUse` | Node.js and Git on `PATH`; trust the project `.codex/` layer and trust changed hooks | Matchers cover `Bash` and `apply_patch`; privacy is a guardrail, not a complete privacy boundary. |
| Gemini CLI | `GEMINI.md` -> `AGENTS.md`, and `.agents/skills/` | Merge `hooks/gemini/settings.snippet.json` into `.gemini/settings.json` (project) or `~/.gemini/settings.json` (user): `SessionStart`, `BeforeTool`, `AfterTool` | Node.js and Git on `PATH` | Privacy covers the listed built-in read/write/replace/shell tools; tool names and hook semantics can change with CLI releases. |

The portable state and verification commands are Node-native:
`node .agents/scripts/next-spec-id.mjs`, `run-check.mjs`, and
`check-ship-ready.mjs`. The legacy `.sh` files are optional wrappers, not a
Windows requirement. Claude's `hs-scout` adapter is generated from the
canonical `.agents/agents/hs-scout.md`; Codex and Gemini require their own
manual lightweight-scout setup as described there.

## Hotswap, two senses

- **Swap agent**: nothing to redo. `.agents/skills/` is the one canonical
  source; Codex and Gemini read it as-is, and the Claude Code link already
  points at it.
- **Swap harness version**: edit `.agents/skills/*/SKILL.md` (or hand it to
  `skill-creator` to iterate properly, with real eval runs). Because
  `.claude/skills/*` are links, not copies, every agent sees the change on its
  next turn — no reinstall.

## What's deliberately not here yet

- **No MCP server.** Custom tools are bundled Node utilities inside
  `.agents/scripts/` — zero dependency installation beyond Node.js. An MCP-based
  `harness-state` server (typed `get_progress`/`mark_task_done` calls instead
  of parsing markdown) is a reasonable next step, not a first one.
- **Four hooks wired so far** (`privacyBlock`, `shipGate`, `sessionState`,
  `monitoring` — see `hs.settings.json` and `hooks/README.md`), each a
  separate `.mjs` script reading its own config key. They enforce only the
  configured events and matched tools; see the matrix for coverage and trust
  limitations.
- **No `hs-debug` skill.** Error-driven retry-then-escalate lives inside
  `hs-build` and `hs-verify` directly, rather than as a separate phase.
- **`hs-scout` is fully wired for Claude Code only** — `.claude/agents/hs-scout.md`
  is a ready-to-use subagent definition (`model: haiku`), separate from the
  vendor-neutral role description in `.agents/agents/hs-scout.md` since Claude
  Code's subagent frontmatter isn't shared with other agents the way SKILL.md
  is. Codex/Gemini equivalents need manual setup per that file's notes —
  neither has as portable a subagent-definition mechanism yet.
