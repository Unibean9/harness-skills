# Harness Skills

It provides 9 reusable skills, 5 specialist
subagents, and 4 hooks, installable into 5 agent runtimes: Claude
Code, Cursor, OpenAI Codex CLI, GitHub Copilot, and Google Antigravity.
No runtime gets a slash-command layer - every runtime invokes a skill by
matching the task to its description, the same way Claude Code does
natively. Read `CONCEPTS.md` first to understand the underlying model.

![Agent workflow](workflow.png)

## Install

To install a specific runtime, pass its flag through:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/Unibean9/harness-skills/main/install.ps1))) -Cursor -Copilot
```

```bash
curl -fsSL https://raw.githubusercontent.com/Unibean9/harness-skills/main/install.sh | bash -s -- --cursor --copilot
```

| Runtime        | `install.ps1`                  | `install.sh`         | Lands in                      |
| -------------- | ------------------------------ | -------------------- | ----------------------------- |
| Claude Code    | `-Claude` | `--claude`  | `.claude/`                    |
| Cursor         | `-Cursor`                      | `--cursor`           | `.cursor/` + `.agents/skills/` |
| Codex CLI      | `-Codex`                       | `--codex`            | `.codex/` + `.agents/skills/` |
| GitHub Copilot | `-Copilot`                     | `--copilot`          | `.github/` + `.agents/skills/` |
| Antigravity    | `-Anti`                        | `--anti`             | `.agents/`                    |

Flags are additive - pass several to install into several runtimes in one
run. The `-Flag` (PowerShell) vs `--flag` (POSIX) dash-count difference is
intentional: PowerShell's parameter binder for advanced functions doesn't
accept literal `--name`.

Run the installer from the root of the target project. It downloads this
repository into a temporary directory (`git clone` if available, otherwise
a tarball/zip download), generates the selected runtime's on-disk content
from `agents/`, `skills/`, and `hooks/`, copies it into the
current project, and removes the temporary files. A pre-existing file at
the destination is skipped and reported, never overwritten - except each
runtime's managed hook scripts (`.claude/hooks/*.mjs` for Claude and
`<dot-folder>/kit-hooks/*.mjs` for the other runtimes), which are always
refreshed. The shared `.hs.json` configuration is copied for every runtime
installation when the target does not already have one. Existing runtime hook
configuration is merged: harness-owned entries are refreshed and unrelated
entries are preserved. Existing `.hs.json` files are never overwritten.

> Security note: this executes code fetched from GitHub. Review
> [`install.ps1`](install.ps1)/[`install.sh`](install.sh) and
> [`install/lib/generate-runtime.mjs`](install/lib/generate-runtime.mjs)
> before running them, especially given the quick path now spans 5 runtime
> surfaces instead of 1.

**Prefer working from a local copy?** Clone or download the repo yourself,
then run `./install.ps1 -TargetPath /path/to/your-project` (or
`bash install.sh --target-path /path/to/your-project`) directly - the
bootstrap download is skipped automatically when the script finds its own
source folders already sitting next to it.

## Skills

| Skill                     | Purpose                                                       |
| ------------------------- | -------------------------------------------------------------- |
| `hs-brainstorm`           | Clarify requirements, weigh approaches, optionally write a PRD  |
| `hs-plan`                 | Draft and revise a plan with you, then write it only after you approve it (`--gh` publishes it as GitHub issues instead, one per verifiable unit of work) |
| `hs-build`                | Implement task by task: test, commit, and mark plan/issue progress |
| `hs-test`                 | Run the smallest relevant suite, with real pass/fail evidence   |
| `hs-code-review`          | Find bugs/gaps before calling something done                    |
| `hs-ship`                 | Push -> PR -> review -> CI green -> merge -> confirm issues closed -> clean up |
| `hs-backend-development`  | RESTful APIs, 3-layer architecture, microservices; the workflow skills route to it automatically for backend work |
| `hs-frontend-development` | PRODUCT.md / DESIGN.md context, design tokens, UX/UI rules; the workflow skills route to it automatically for UI work |
| `hs-devops`               | Design/provision a CI/CD pipeline or cloud infra (not a per-PR gate) |

The first 6 are the workflow skills that carry the harness itself, in
pipeline order; the last 3 are technical-content maps, not workflow gates -
each still carries its own HARD-GATE, but none sit on the linear
brainstorm-to-ship path. You don't need to memorize their names - describe
your goal and the agent reaches for the relevant one on its own. The
workflow skills also pick the domain skill (frontend, backend) for you; see
`skills/_shared/domain-routing.md`, and use `--domain <name>` only to
override. Each runtime maps these skills (plus agents and hooks) into its own
on-disk format: Codex, Cursor, GitHub Copilot, and Antigravity share the
native `.agents/skills/<name>/SKILL.md` deployment format, while Claude Code
receives the canonical skills under `.claude/skills/<name>/SKILL.md` and keeps
agents and hooks as runtime-specific adapters.

## Subagents

| Subagent              | Role                                                         |
| --------------------- | ------------------------------------------------------------ |
| `planner`             | Produces a decision-complete, ordered plan before coding     |
| `code-reviewer`       | Independent code-quality and security review, read-only      |
| `tester`              | Selects, runs, and assesses the smallest relevant test suite |
| `researcher`          | Turns a focused question into a source-backed recommendation |
| `fullstack-developer` | Delivers one independent, well-scoped implementation phase   |

None pin a specific `model:` tier - they run on whatever model the session
defaults to. Add a `model:` line yourself once you're comfortable reasoning
about cost/capability trade-offs per task.

## Hooks

Four hooks are authored once in `hooks/*.mjs` and adapted to each runtime at
install time rather than shared from one folder. Claude keeps hook scripts in
`.claude/hooks/` and wires them only through `.claude/settings.json`; the
other runtimes receive their own `<dot-folder>/kit-hooks/` copy. They are
standalone ports of the AgentKit hooks of the same name, with no library
dependencies:

- **`privacy-block.mjs`** (`PreToolUse`) - stops the agent reading or
  writing likely secret files (`.env*`, `.pem`/`.key`, `credentials*`,
  `id_rsa`, `.npmrc`) without approval; `.example`/`.sample`/`.template`
  files are exempt. It also guards `.hs.json` itself: every agent write,
  and any shell command that mentions it, needs approval, so the guard
  rails can't be relaxed unattended.
- **`scout-block.mjs`** (`PreToolUse`) - keeps generated and dependency
  directories (`node_modules`, `dist`, `build`, `.git`, `.venv`, ...),
  archived plans, and repository-wide globs (`**/*.ts` from the root) out
  of context. Build, test, and tool commands (`npm run build`, `cargo test`,
  `docker build`) pass even when they touch those directories.
- **`descriptive-name.mjs`** (`PreToolUse` on `Write`) - adds file-naming
  guidance (kebab-case for JS/TS/Python/shell, language conventions
  elsewhere) as context. It never blocks.
- **`language-prompt.mjs`** (`UserPromptSubmit`) - injects the configured
  conversation and thinking languages on every message. It caches the assembled
  guidance for five minutes while still injecting it on each message.
- **`session-init.mjs`** (`SessionStart`) - injects a short orientation:
  project root, branch and uncommitted count, detected stack, and the most
  recent plan. After a context compaction it also tells the agent to
  re-confirm any pending approval and re-read the active plan.

Both gates follow an exit-code contract (`0` = allow, `2` = block, `1` =
the hook itself errored and the tool proceeds): unreadable input fails open,
but a crash while judging a specific tool call fails closed. On Claude Code a
gate decision is an interactive permission prompt; every other platform gets
a hard block, and an unrecognized `--platform` value fails closed.

Claude Code and Codex add language guidance through their per-message hooks.
Antigravity uses `PreInvocation` to inject an ephemeral system message before
each model invocation. Copilot rewrites the model-facing user content through
`userPromptTransformed`; Copilot persists that replacement in session history,
so it is not a separate system message. Cursor uses an always-applied project
rule that directs the agent to read `.hs.json` at the start of each interaction.

`.hs.json` at the repo root turns each hook on/off per project
(`guardrails.hooks.privacy`, `guardrails.hooks.scout`,
`guardrails.hooks.descriptiveName`, `guardrails.hooks.sessionInit`,
`guardrails.hooks.languagePrompt`, each
`{ "enabled": bool }` and defaulting to on when absent; the `.hs.json`
guard is always on). `guardrails.hooks.scout.allowlist` clears specific
directories for the scout guard, and `artifacts.plans.archiveDirectory`
tells it which folder holds archived plans. The installer copies it to
`.hs.json` in the target project for every selected runtime (skipped if one
already exists).

Set `language.conversation` and `language.thinking` in `.hs.json` to language
names or codes; hook-backed runtimes cache the assembled guidance for five
minutes and inject it on each invocation. Cursor's static rule reads the config
directly and is a best-effort fallback. Both settings default to Vietnamese
(`vi`). `hs-brainstorm` and `hs-plan`
also enforce a requirement hard gate: they inspect available evidence, surface
uncertainties, and keep asking focused questions until material requirements
and decisions are clear.

## Why

Agents can take the shortest path to "looks done": skip discovery,
overstate test confidence, or take external actions without confirmation.
This kit is a small, readable starting point for the counterweights that
help - clear intent, a real plan, evidence before "done," and a few
guard rails outside the model's own discretion - without hiding how any of
it works behind a large plugin surface.
