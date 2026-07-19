# harness-skills

**A small, portable quality harness for coding agents.**

Skills encode useful engineering habits—clear intent, proportionate planning,
real evidence before "done," and human control where it matters—without
forcing every change through the same sequence or runtime.

```
 BRAINSTORM        PLAN          BUILD          VERIFY         REVIEW          SHIP
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  Clarify │   │  Approach│   │  Change  │   │ Evidence │   │  Fresh   │   │  Human   │
│  intent  │   │ + checks │   │ + checks │   │ + limits │   │  review  │   │ control  │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
 hs-brainstorm   hs-plan        hs-build       hs-verify      hs-review       hs-ship
                                                                (advisory)
```

---

## Skills

The six skills are a menu of complementary practices, not a mandatory state
machine. Select, combine, skip, or revisit them according to task size, risk,
and explicit user intent. Their exit conditions are handoff criteria, not
automatic phase transitions. Only external actions such as commit, push, or
release require explicit human authorization.

| Phase                                          | What it does                                                      | Use when                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [hs-brainstorm](skills/hs-brainstorm/SKILL.md) | Clarifies a vague ask into proportionate acceptance criteria      | Outcome or scope is not clear                                             |
| [hs-plan](skills/hs-plan/SKILL.md)             | Chooses a focused approach and useful checks                      | Work is nontrivial, risky, or needs a plan                                |
| [hs-build](skills/hs-build/SKILL.md)           | Implements a change with incremental feedback                     | Intent is clear enough to act                                             |
| [hs-verify](skills/hs-verify/SKILL.md)         | Reports relevant automated/manual evidence and limitations        | Before handoff, review, or external action                                |
| [hs-review](skills/hs-review/SKILL.md)         | Independent, structured review of a change and available evidence | When a fresh perspective adds value, especially before high-risk shipping |
| [hs-ship](skills/hs-ship/SKILL.md)             | Prepares a handoff or external action with human authorization    | User wants to commit, PR, push, or release                                |

Use project state as context, not as a routing lock. A durable spec can help
with larger work; a small edit may need only build and a focused verification.
This README stays a map; each phase's own detail and exit condition live in
its `SKILL.md`.

---

## Install

**Portable path — any agent, one command.** [vercel-labs/skills](https://github.com/vercel-labs/skills)
copies/symlinks each complete `skills/hs-*/` directory, including its
references and any deliberately small phase-local helper, into the selected agent:

```bash
npx skills add Unibean9/harness-skills --list   # preview the 6 skills first
npx skills add Unibean9/harness-skills          # install, prompts for which agents
npx skills add Unibean9/harness-skills --skill '*' -a codex -y  # install all for Codex
```

Each skill owns lightweight guidance, not a rigid runtime workflow. Agents use
the target project's native tools directly; `hs-verify` alone includes an
optional worktree-fingerprint helper when exact evidence linkage is useful.
The portable path needs no package-level `hs` runtime.

**Enhanced integration — optional.** Install the package only when you want
the optional `hs` companion CLI, generated subagents, or agent-native hook wiring. This
package isn't published to the npm registry yet — install straight from
GitHub:

```bash
npm i -g github:Unibean9/harness-skills
hs init                    # scaffolds .harness/, copies default hs.settings.json, updates .gitignore
hs setup --target claude --with-hooks  # opt in to Claude's hook companion
hs doctor                  # reports what's wired and what's still missing
```

This repo supports four agents, split into two tiers of coverage:

| Tier             | Agent           | What's wired                                                                           |
| ---------------- | --------------- | -------------------------------------------------------------------------------------- |
| 1 — Full         | Claude Code     | skills + subagents + all four hooks                                                    |
| 1 — Full         | Codex CLI       | skills + subagents + hooks snippet                                                     |
| 2 — Partial      | Cursor          | skills + subagents + ship-gate/privacy-block hooks; session-state/monitoring NOT wired |
| 2 — Experimental | Antigravity CLI | skills + subagents (confirmed paths); hooks NOT wired, config path unconfirmed         |

`hs setup` accepts `--target claude|codex|cursor|antigravity` and produces
portable skills plus generated `hs-scout`/`hs-reviewer`/`hs-shipper` subagents. Add
`--with-hooks` only when the user opts into the companion enforcement plugin
and the target has a confirmed adapter (Claude: `.claude/settings.json`; Codex:
`.codex/hooks.json`; Cursor: `.cursor/hooks.json`, wiring `ship-gate`/
`privacy-block` only — `session-state`/`monitoring` aren't yet; Antigravity:
skills + subagents only, with an honest note about why hooks aren't wired).

Runtime evidence lives in `.harness/state/` (gitignored by `hs init`);
durable spec history lives in `.harness/specs/` (commit it). For
hooks/subagents, install natively instead:

| Agent           | Skills-only command                                     | Native plugin (adds hooks/subagents where wired)                                                                                                                     |
| --------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code     | `npx skills add Unibean9/harness-skills -a claude-code` | `/plugin marketplace add Unibean9/harness-skills` then `/plugin install harness-skills`                                                                              |
| Codex CLI       | `npx skills add Unibean9/harness-skills -a codex`       | `codex plugin marketplace add Unibean9/harness-skills` (Codex CLI v0.122+); merge `hooks/codex/hooks.json.snippet` into `.codex/hooks.json` for guardrails           |
| Cursor          | `npx skills add Unibean9/harness-skills -a cursor`      | No marketplace command for this repo — sync `skills/hs-*` into `.cursor/skills/` and drop a short pointer rule in `.cursor/rules/*.mdc` (see `docs/cursor-setup.md`) |
| Antigravity CLI | `npx skills add Unibean9/harness-skills -a antigravity` | No plugin manifest for this repo yet — skills-only command above is the only path (see `docs/antigravity-setup.md`)                                                  |

"Native plugin" above is about installing _this repo's_ skills — it's
independent of whether the agent itself supports hooks/subagents (see
Compatibility and Subagents below; Cursor now has `ship-gate`/`privacy-block`
wired, Antigravity has neither hooks wired yet).

Per-agent details, guardrail coverage, and known gaps: `docs/claude-setup.md`,
`docs/codex-setup.md`, `docs/cursor-setup.md`, `docs/antigravity-setup.md`.

Once installed, start the agent and ask for something — it should reach for
`hs-brainstorm` on its own. Developing this repo itself: `/plugin marketplace
add ./` from the repo root, no build step.

---

## Subagents

Three narrow jobs are worth delegating to a separate subagent rather than
doing inline with the main model — see `docs/agents.md` for all three roles
and per-agent wiring:

| Subagent                             | Role                                                                                              | Use when                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [hs-scout](agents/hs-scout.md)       | Delegates broad reading — existing code, docs, an external API — to a cheap/fast subagent         | Before each phase, when the phase needs context the main model doesn't have loaded yet |
| [hs-reviewer](agents/hs-reviewer.md) | Reviews the verified diff from a context-independent subagent, not the same context that wrote it | `hs-review`, before shipping                                                           |
| [hs-shipper](agents/hs-shipper.md)   | Reports uncommitted changes, check results, and a drafted commit message — never commits, pushes, or talks to the user | `hs-ship`, before the main agent asks for commit/push/PR approval |

All four supported agents have a native (or expected-native, for
Antigravity — see `docs/antigravity-setup.md`) subagent mechanism. Generate
the definition file for whichever one you're using with a single command,
from the project root:

```bash
hs agents                   # all four targets in one pass
hs agents --target codex    # just one
```

| Agent           | Where it's written                                                                        | Format                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code     | `.claude/agents/hs-scout.md`, `hs-reviewer.md`, `hs-shipper.md`                             | Markdown + YAML frontmatter                                                                                                             |
| Codex CLI       | `.codex/agents/hs-scout.toml`, `hs-reviewer.toml`, `hs-shipper.toml`                        | TOML — `name`/`description`/`developer_instructions`                                                                                    |
| Cursor          | `.cursor/agents/hs-scout.md`, `hs-reviewer.md`, `hs-shipper.md`                             | Same shape as Claude Code — and Cursor reads `.claude/agents/` directly, so no separate file is needed if that's already in the project |
| Antigravity CLI | `.agents/agents/hs-scout.md`, `hs-reviewer.md`, `hs-shipper.md`                             | Same Markdown + YAML frontmatter shape as Cursor's — path unconfirmed, see `docs/antigravity-setup.md`                                  |

This repo's own bundled Claude Code copy lives at `agents/hs-scout.md` /
`agents/hs-reviewer.md` / `agents/hs-shipper.md` at the repo root (`hs agents
--target claude --out agents` regenerates it after editing `docs/agents.md`). See
`docs/agents.md` for the source content behind every generated file. No
subagent mechanism at all on your agent? Do the same work inline instead —
scouting is still worth doing cheaply; review is still worth doing with a
fresh, deliberate re-read rather than skipping it.

---

## How it's enforced

Skills guide the agent to use native project tools and report honest evidence;
they do not require a shared runtime. Four optional hooks turn the specific
policies below into checks the companion runtime runs automatically, outside
the model's discretion:

| Hook                | Event                      | Does                                                                                                                                                                             |
| ------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `privacy-block.mjs` | `PreToolUse`               | Blocks reading/referencing a path matching `denyList` unless it's also in `allowList` (e.g. blocks `.env`, allows `.env.example`).                                               |
| `ship-gate.mjs`     | `PreToolUse`               | Blocks `git commit`/`git push`/`gh pr create`-style commands unless a valid, spec-and-worktree-bound verify attestation exists — a hand-edited status string alone isn't enough. |
| `session-state.mjs` | `SessionStart`             | Digests the active spec's `spec.md`/`plan.md`/`progress.md`/`implement-notes.md` into a session summary, so a fresh session doesn't miss what a prior one already established.   |
| `monitoring.mjs`    | `PreToolUse`/`PostToolUse` | Appends one line per matched tool call to an audit log, independent of what any transcript claims happened.                                                                      |

`hs.settings.json` at the repo root turns each on/off and holds the couple
of fields that genuinely vary per project (`privacyBlock`'s allow/deny
lists, `shipGate.blockCommands`). Skills work fully without hooks; hooks add
scoped enforcement on top. See `hooks/README.md` for the full per-agent
coverage table and known limits.

**If you're rolling this out to a team, not just your own project**:
`monitoring` is enabled by default and writes every matched tool call
(redacted for secrets, but still command/path detail) to
`.harness/state/audit.log` — read it with `hs audit`. Tell
whoever's using the harness that this logging exists before they start,
the same way you'd disclose any local dev-tooling telemetry. Turn it off
in `hs.settings.json` (`"monitoring": {"enabled": false}`) if that's not
appropriate for the setting.

---

## Customizing

Nothing here is fixed law — this is a starting point meant to be adjusted per
project. But this package gets updated (`npm update`, a new plugin version),
and an update overwrites whatever it installed — so the question that
actually matters is _where_ you customize, not just _whether_ you can:

**Survives an update** — lives in your project, not in this package:

- **`hs.settings.json`** (copied into your project by `hs init`, then yours)
  turns the four hooks on/off and holds the couple of fields that genuinely
  vary per project (`privacyBlock`'s allow/deny lists, `shipGate.blockCommands`).
- **Your project's own instructions and docs** — add test/lint/build commands
  or conventions specific to the codebase. An `AGENTS.md` is one optional
  place to keep them; portable skills do not require it.
- Anything you add under `.harness/` itself (it's your project's state, this
  package never writes outside `.harness/state/` and `.harness/specs/`).

**Requires forking this package** — these files ship inside it and get
overwritten on update:

- **`skills/*/SKILL.md`** are plain markdown. Reword them, add
  project-specific failure modes, or collapse phases for a smaller setup —
  just keep each skill's frontmatter `name` matching its directory and give
  its `description` both what it does and when to use it, since that's what
  triggers it. If you maintain a fork, `npm run validate:skills` catches
  frontmatter drift and stale `node scripts/` references before you ship it.
- **`skills/*/references/*.md`** — the templates each skill points to.
- **Hook count**: four are wired (`privacyBlock`, `shipGate`, `sessionState`,
  `monitoring`, see `hooks/README.md`). Adding a guardrail is a new
  `hs.settings.json` key plus a new `hooks/<name>.mjs` — no change to the
  existing three.

---

## Compatibility

Two different questions, easy to conflate: does the _agent_ natively support
hooks/subagents at all, and has _this repo_ shipped config wiring its
guardrails/subagents to that agent. Four agents are supported, split into two
tiers: Claude Code and Codex CLI are **tier 1** (skills, subagents, and
guardrail hooks all wired); Cursor and Antigravity CLI are **tier 2** with
partial/experimental coverage — see each row's last column for exactly what
is wired and what is missing.

| Agent           | Tier | Instruction / skills                                         | Agent's native hooks                                                                                                  | Agent's native subagents                                           | This repo's wiring                                                                                                                                                                                                                                                                  |
| --------------- | ---- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code     | 1    | Root `skills/` auto-discovery                                | Yes — `.claude/settings.json` / plugin `hooks.json`                                                                   | Yes — `.claude/agents/*.md`                                        | Full: `hooks/hooks.json` auto-wires on install; `hs agents --target claude` generates `hs-scout`/`hs-reviewer`/`hs-shipper`.                                                                                                                                                                     |
| Codex CLI       | 1    | `skills/` via `.codex-plugin/plugin.json`                    | Yes, since ~v0.124.0 — `.codex/hooks.json` or `config.toml`                                                           | Yes, since ~v0.115.0 — `.codex/agents/*.toml`                      | Hooks: merge `hooks/codex/hooks.json.snippet`. Subagents: `hs agents --target codex` generates both TOML files.                                                                                                                                                                     |
| Cursor          | 2    | `.cursor-plugin/plugin.json` declares `skills: "./skills/"`  | Yes — `.cursor/hooks.json`, own event/payload shape                                                                   | Yes — `.cursor/agents/*.md`; also reads `.claude/agents/` directly | Partial: `ship-gate`/`privacy-block` wired to `beforeShellExecution`/`beforeReadFile` (see `hooks/cursor/hooks.json.snippet`); `session-state`/`monitoring` not yet. Subagents: `hs agents --target cursor` generates both files (or rely on `.claude/agents/` if already present). |
| Antigravity CLI | 2    | No native manifest for this repo yet — `npx skills add` only | Expected yes, inherited from Gemini CLI's engine per Google's transition announcement (unconfirmed exact config path) | Expected yes, same inheritance                                     | Hooks not wired — no confirmed config path yet. Subagents: `hs agents --target antigravity` generates both files (see `docs/antigravity-setup.md` for what's confirmed vs. guessed).                                                                                                |

Known per-agent coverage limits where this repo _has_ wired something:
Claude Code's privacy hook only matches `Read`/`Write`/`Edit`/`Bash`, ship
gate only `Bash`; Codex's matchers cover `Bash`/`apply_patch` only, so
privacy is a guardrail, not a complete privacy boundary.

Run `npm test` for the Node 22+ compatibility suite; CI runs the same
command. The optional CLI and hook companion use zero-dependency Node scripts;
portable skills themselves do not require that runtime.

---

## Why this harness?

Agents can take the shortest path to "looks done": skip discovery, overstate
test confidence, or take external actions without confirmation. This harness
keeps useful counterweights—clear intent, proportionate evidence, fresh
review, and human control—without requiring a fixed phase machine. The
portable core is six small markdown skills; optional CLI and hook companions
add enforcement only where a provider supports and a project opts into it.

---

## What's deliberately not here yet

- **No MCP server.** Custom tools are bundled Node utilities, not a typed
  `harness-state` server — a reasonable next step, not a first one.
- **No `hs-debug` skill.** Error-driven retry-then-escalate lives inside
  `hs-build`/`hs-verify` directly.
- **Full Cursor and Antigravity hook coverage.** Cursor has only
  `ship-gate`/`privacy-block` adapters today; Antigravity has no confirmed
  adapter. The remaining hooks need provider-specific payload/output support
  before they should be wired.
