# Harness Skills

A plugin toolkit for learning the basic building blocks of "harness
engineering" in agentic coding. It provides 7 reusable skills, 5 specialist
subagents, and 2 guard-rail hooks, installable into 6 agent runtimes: Claude
Code, Cursor, OpenAI Codex CLI, GitHub Copilot, Kiro, and Google Antigravity.
Read `CONCEPTS.md` first to understand the underlying model.

```
 BRAINSTORM     PLAN         BUILD        REVIEW       SHIP
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  Clarify │ │ Approach │ │  Change  │ │  Fresh   │ │  Human   │
│  intent  │ │ + checks │ │ + checks │ │  review  │ │ control  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
hs:brainstorm   hs:plan     hs:build   hs:code-review  hs:ship
                                                       (advisory)
```

## Install

Install directly from GitHub - no manual clone required.

```powershell
# Windows - installs Claude Code by default
irm https://raw.githubusercontent.com/Unibean9/harness-skills/main/install.ps1 | iex
```

```bash
# macOS/Linux - installs Claude Code by default
curl -fsSL https://raw.githubusercontent.com/Unibean9/harness-skills/main/install.sh | bash
```

To install a specific runtime (or several), pass its flag through:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/Unibean9/harness-skills/main/install.ps1))) -Cursor -Kiro
```

```bash
curl -fsSL https://raw.githubusercontent.com/Unibean9/harness-skills/main/install.sh | bash -s -- --cursor --kiro
```

| Runtime        | `install.ps1`                  | `install.sh`         | Lands in                      |
| -------------- | ------------------------------ | -------------------- | ----------------------------- |
| Claude Code    | `-Claude` (default if no flag) | `--claude` (default) | `.claude/`                    |
| Cursor         | `-Cursor`                      | `--cursor`           | `.cursor/`                    |
| Codex CLI      | `-Codex`                       | `--codex`            | `.codex/` + `.agents/skills/` |
| GitHub Copilot | `-Copilot`                     | `--copilot`          | `.github/`                    |
| Kiro           | `-Kiro`                        | `--kiro`             | `.kiro/`                      |
| Antigravity    | `-Anti`                        | `--anti`             | `.agents/`                    |

Flags are additive - pass several to install into several runtimes in one
run. The `-Flag` (PowerShell) vs `--flag` (POSIX) dash-count difference is
intentional: PowerShell's parameter binder for advanced functions doesn't
accept literal `--name`.

Run the installer from the root of the target project. It downloads this
repository into a temporary directory (`git clone` if available, otherwise
a tarball/zip download), generates the selected runtime's on-disk content
from `agents/`, `commands/hs/`, `skills/`, and `hooks/`, copies it into the
current project, and removes the temporary files. A pre-existing file at
the destination is skipped and reported, never overwritten - except each
runtime's own `<dot-folder>/kit-hooks/*.mjs` copy, which is always
refreshed. No existing `.hs.json` is ever overwritten either.

> Security note: this executes code fetched from GitHub. Review
> [`install.ps1`](install.ps1)/[`install.sh`](install.sh) and
> [`install/lib/generate-runtime.mjs`](install/lib/generate-runtime.mjs)
> before running them, especially given the quick path now spans 6 runtime
> surfaces instead of 1.

**Prefer working from a local copy?** Clone or download the repo yourself,
then run `./install.ps1 -TargetPath /path/to/your-project` (or
`bash install.sh --target-path /path/to/your-project`) directly - the
bootstrap download is skipped automatically when the script finds its own
source folders already sitting next to it.

## Skills

| Skill                     | Purpose                                                      |
| ------------------------- | ------------------------------------------------------------ |
| `hs:brainstorm`           | Weigh approaches before committing to a direction            |
| `hs:plan`                 | Turn a chosen approach into concrete steps                   |
| `hs:build`                | Execute a plan into real code                                |
| `hs:code-review`          | Find bugs/gaps before calling something done                 |
| `hs:ship`                 | Commit -> push -> pull request, 3 separately confirmed steps |
| `hs:backend-development`  | RESTful APIs, 3-layer architecture, microservices            |
| `hs:frontend-development` | Component architecture, design tokens, responsive/a11y       |

The first 5 are the workflow skills that carry the harness itself; the last
2 are technical-content maps, not workflow gates. You don't need to
memorize their names - describe your goal and the agent reaches for the
relevant one on its own. Each runtime maps these skills (plus agents and
hooks) into its own on-disk format differently.

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

Two guard-rail hooks are wired by default (script logic authored once in
`hooks/*.mjs`, copied into each selected runtime's own
`<dot-folder>/kit-hooks/` at install time rather than shared from one
folder):

- **`guard-rails.mjs`** (`PreToolUse`) - three checks in one script:
  a **privacy guard** that blocks reading/writing likely secret files
  (`.env`, `.pem`, credentials, private keys); a **scout guard** that blocks
  broad scans of generated/dependency directories and overly broad
  recursive globs; and a **config guard** that blocks every agent write to
  `.hs.json` (and, on platforms without an interactive prompt, any command
  that even mentions it) so the guard rails can't be relaxed unattended.
  Follows an exit-code contract (`0` = allow, `2` = block, `1` = the hook
  itself errored and the tool proceeds): a transport failure fails open,
  but a crash while judging a specific tool call fails closed. Only Claude
  Code's own interactive `ask()` prompt is honored for a soft decision -
  every other platform's guard-rail decisions resolve to a hard deny, and
  an unrecognized `--platform` value fails closed rather than falling
  through.
- **`dev-rules-reminder.mjs`** (`UserPromptSubmit`) - periodically
  re-injects the kit's core working rules into the session rather than
  relying on them being read once at the start.

`.hs.settings.json` at the repo root turns each guard on/off per project
(`guardrails.hooks.privacy`, `guardrails.hooks.scout`,
`guardrails.hooks.devRulesReminder`); the installer copies it to
`.hs.json` in the target project (skipped if one already exists).

## Why

Agents can take the shortest path to "looks done": skip discovery,
overstate test confidence, or take external actions without confirmation.
This kit is a small, readable starting point for the counterweights that
help - clear intent, a real plan, evidence before "done," and a few
guard rails outside the model's own discretion - without hiding how any of
it works behind a large plugin surface.

## Out of scope

This kit does not replace project architecture, CI, access controls, or
human code review. It does not store credentials, grant access to external
services, or guarantee that every task can be completed autonomously.
Non-Claude runtimes are _generated_ from `agents/`, `commands/hs/`,
`skills/`, and `hooks/` at install time (`install/lib/generate-runtime.mjs`)
rather than hand-mirrored, so there's no separate per-runtime copy to drift
out of sync - but there's also no automated CI check yet confirming a
skill edit regenerates correctly across all 6 runtimes; that's a manual
check today. Command support for Codex CLI, Kiro, and Antigravity is not
ported rather than shipped as an approximated stand-in.

Review changes before merging, keep secrets out of prompts and
repositories, and adapt the guard rails to your own project's needs.
